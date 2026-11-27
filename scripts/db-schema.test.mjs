import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveDatabaseSchema,
  buildDatabaseSearchPath,
  ensureDatabaseSchema
} from "../app/db-schema.js";

test("defaults to the production public schema", () => {
  assert.equal(resolveDatabaseSchema(undefined), "public");
  assert.equal(buildDatabaseSearchPath("public"), undefined);
});

test("accepts a dedicated preview schema without adding public to search_path", () => {
  assert.equal(resolveDatabaseSchema("trampillera_preview"), "trampillera_preview");
  assert.equal(buildDatabaseSearchPath("trampillera_preview"), "trampillera_preview");
});

test("rejects unsafe schema identifiers", () => {
  for (const value of ["public; DROP SCHEMA public", "MixedCase", "schema-name", "1preview", "x".repeat(64)]) {
    assert.throws(() => resolveDatabaseSchema(value), /DB_SCHEMA/);
  }
});

test("creates only the requested non-public schema", async () => {
  const calls = [];
  const pool = { query: async (sql) => calls.push(sql) };
  assert.equal(await ensureDatabaseSchema(pool, "trampillera_preview"), true);
  assert.deepEqual(calls, ['CREATE SCHEMA IF NOT EXISTS "trampillera_preview"']);
});

test("does not issue DDL for the public schema", async () => {
  const calls = [];
  const pool = { query: async (sql) => calls.push(sql) };
  assert.equal(await ensureDatabaseSchema(pool, "public"), false);
  assert.deepEqual(calls, []);
});
