import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadMigrations, runMigrations } from "../app/migrations.js";

class FakeClient {
  constructor() {
    this.applied = new Map();
    this.queries = [];
    this.executedSql = [];
    this.released = false;
    this.failOnSql = null;
  }

  async query(sql, params = []) {
    const normalized = String(sql).trim();
    this.queries.push(normalized);

    if (normalized.startsWith("SELECT pg_advisory_lock") || normalized.startsWith("SELECT pg_advisory_unlock")) {
      return { rows: [{ pg_advisory_lock: null }] };
    }
    if (normalized.startsWith("CREATE TABLE IF NOT EXISTS schema_migrations")) return { rows: [] };
    if (normalized === "SELECT version, checksum FROM schema_migrations ORDER BY version") {
      return { rows: [...this.applied].map(([version, checksum]) => ({ version, checksum })) };
    }
    if (normalized.startsWith("INSERT INTO schema_migrations")) {
      this.applied.set(params[0], params[1]);
      return { rows: [] };
    }
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(normalized)) return { rows: [] };
    if (normalized === this.failOnSql) throw new Error("intentional test failure");
    this.executedSql.push(normalized);
    return { rows: [] };
  }

  release() {
    this.released = true;
  }
}

class FakePool {
  constructor() {
    this.client = new FakeClient();
  }

  async connect() {
    return this.client;
  }
}

async function createMigrations(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "trampillera-migrations-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, "0001_legacy_schema_baseline.sql"), "-- baseline marker\n");
  return dir;
}

test("migration loader requires a baseline and sorts numbered files", async (t) => {
  const dir = await createMigrations(t);
  await writeFile(path.join(dir, "0003_example.sql"), "SELECT 3;");
  await writeFile(path.join(dir, "0002_example.sql"), "SELECT 2;");
  const migrations = await loadMigrations(dir);
  assert.deepEqual(migrations.map((item) => item.version), [
    "0001_legacy_schema_baseline",
    "0002_example",
    "0003_example"
  ]);
});

test("runner applies each migration once and records its checksum", async (t) => {
  const dir = await createMigrations(t);
  await writeFile(path.join(dir, "0002_additive_test.sql"), "SELECT 2;");
  const pool = new FakePool();

  const first = await runMigrations(pool, { migrationsDir: dir });
  const second = await runMigrations(pool, { migrationsDir: dir });

  assert.deepEqual(first.applied, ["0001_legacy_schema_baseline", "0002_additive_test"]);
  assert.deepEqual(second.applied, []);
  assert.equal(pool.client.applied.size, 2);
  assert.equal(pool.client.executedSql.filter((sql) => sql === "SELECT 2;").length, 1);
  assert.equal(pool.client.queries.filter((sql) => sql === "BEGIN").length, 2);
  assert.equal(pool.client.queries.filter((sql) => sql === "COMMIT").length, 2);
  assert.equal(pool.client.queries.filter((sql) => sql.startsWith("SELECT pg_advisory_unlock")).length, 2);
  assert.equal(pool.client.released, true);
});

test("runner refuses to modify an already-applied migration", async (t) => {
  const dir = await createMigrations(t);
  const file = path.join(dir, "0002_immutable.sql");
  await writeFile(file, "SELECT 2;");
  const pool = new FakePool();
  await runMigrations(pool, { migrationsDir: dir });
  await writeFile(file, "SELECT 22;");

  await assert.rejects(
    runMigrations(pool, { migrationsDir: dir }),
    /Migration checksum mismatch: 0002_immutable/
  );
  assert.equal(pool.client.executedSql.includes("SELECT 22;"), false);
  assert.equal(pool.client.released, true);
});

test("runner rolls back a failed migration and releases its lock", async (t) => {
  const dir = await createMigrations(t);
  await writeFile(path.join(dir, "0002_failing.sql"), "SELECT deliberate_failure;");
  const pool = new FakePool();
  pool.client.failOnSql = "SELECT deliberate_failure;";

  await assert.rejects(runMigrations(pool, { migrationsDir: dir }), /Migration failed: 0002_failing/);
  assert.equal(pool.client.applied.has("0002_failing"), false);
  assert.equal(pool.client.queries.includes("ROLLBACK"), true);
  assert.equal(pool.client.queries.some((sql) => sql.startsWith("SELECT pg_advisory_unlock")), true);
  assert.equal(pool.client.released, true);
});

test("runner fails if an applied migration file disappears", async (t) => {
  const dir = await createMigrations(t);
  const pool = new FakePool();
  pool.client.applied.set("0002_removed", "a".repeat(64));

  await assert.rejects(
    runMigrations(pool, { migrationsDir: dir }),
    /Applied migration file is missing from the release: 0002_removed/
  );
  assert.equal(pool.client.released, true);
});

test("loader rejects invalid migration names and empty SQL files", async (t) => {
  const dir = await createMigrations(t);
  await writeFile(path.join(dir, "latest.sql"), "SELECT 1;");
  await assert.rejects(loadMigrations(dir), /Invalid migration filename: latest.sql/);
  await rm(path.join(dir, "latest.sql"));
  await writeFile(path.join(dir, "0002_empty.sql"), "  \n ");
  await assert.rejects(loadMigrations(dir), /Migration is empty: 0002_empty.sql/);
});
