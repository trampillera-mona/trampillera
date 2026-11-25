import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");
const MIGRATION_FILE = /^(\d{4})_[a-z0-9_]+\.sql$/;
const LOCK_NAMESPACE = 742019;
const LOCK_ID = 1;

export async function loadMigrations(migrationsDir = DEFAULT_MIGRATIONS_DIR) {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  const migrations = [];
  const seenSequences = new Set();

  for (const filename of files) {
    const match = filename.match(MIGRATION_FILE);
    if (!match) throw new Error(`Invalid migration filename: ${filename}`);
    const sequence = Number(match[1]);
    if (seenSequences.has(sequence)) throw new Error(`Duplicate migration sequence: ${match[1]}`);
    seenSequences.add(sequence);

    const sql = (await readFile(path.join(migrationsDir, filename), "utf8")).trim();
    if (!sql) throw new Error(`Migration is empty: ${filename}`);
    migrations.push({
      version: filename.slice(0, -4),
      sequence,
      sql,
      checksum: createHash("sha256").update(sql).digest("hex")
    });
  }

  if (migrations.length === 0) throw new Error("No SQL migrations were found.");
  if (migrations[0].version !== "0001_legacy_schema_baseline") {
    throw new Error("The first migration must be 0001_legacy_schema_baseline.sql.");
  }
  return migrations;
}

export async function runMigrations(pool, options = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("A PostgreSQL pool with connect() is required.");
  }

  const migrations = await loadMigrations(options.migrationsDir);
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query("SELECT pg_advisory_lock($1, $2)", [LOCK_NAMESPACE, LOCK_ID]);
    lockAcquired = true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        checksum TEXT NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query(
      "SELECT version, checksum FROM schema_migrations ORDER BY version"
    );
    const applied = new Map(appliedResult.rows.map((row) => [row.version, row.checksum]));
    const knownVersions = new Set(migrations.map((migration) => migration.version));

    for (const version of applied.keys()) {
      if (!knownVersions.has(version)) {
        throw new Error(`Applied migration file is missing from the release: ${version}`);
      }
    }

    const newlyApplied = [];
    for (const migration of migrations) {
      const existingChecksum = applied.get(migration.version);
      if (existingChecksum) {
        if (existingChecksum !== migration.checksum) {
          throw new Error(`Migration checksum mismatch: ${migration.version}. Applied migrations are immutable.`);
        }
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations(version, checksum) VALUES($1, $2)",
          [migration.version, migration.checksum]
        );
        await client.query("COMMIT");
        newlyApplied.push(migration.version);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration failed: ${migration.version}: ${error.message}`, { cause: error });
      }
    }

    return {
      applied: newlyApplied,
      currentVersion: migrations[migrations.length - 1].version,
      migrationCount: migrations.length
    };
  } finally {
    try {
      if (lockAcquired) {
        await client.query("SELECT pg_advisory_unlock($1, $2)", [LOCK_NAMESPACE, LOCK_ID]);
      }
    } finally {
      client.release();
    }
  }
}
