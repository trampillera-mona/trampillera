import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../app/migrations/0002_normalized_organization.sql", import.meta.url),
  "utf8"
);

test("organization migration creates the three normalized organization tables", () => {
  for (const table of ["org_units", "positions", "employee_org_assignments"]) {
    assert.match(migration, new RegExp("CREATE TABLE " + table + "\\s*\\("));
  }
});

test("organization migration preserves employee identity and legacy free-text fields", () => {
  assert.match(migration, /employee_id BIGINT NOT NULL REFERENCES employees\(id\) ON DELETE RESTRICT/);
  assert.doesNotMatch(migration, /ALTER TABLE employees/i);
  assert.doesNotMatch(migration, /UPDATE employees/i);
  assert.doesNotMatch(migration, /DELETE FROM employees/i);
  assert.doesNotMatch(migration, /INSERT INTO employee_org_assignments/i);
});

test("organization migration enforces stable keys, effective dates and explicit assignment states", () => {
  assert.match(migration, /unit_key TEXT NOT NULL UNIQUE/);
  assert.match(migration, /position_key TEXT NOT NULL UNIQUE/);
  assert.match(migration, /valid_from DATE NOT NULL/);
  assert.match(migration, /valid_until IS NULL OR valid_until >= valid_from/);
  assert.match(migration, /assignment_type IN \('PRIMARY','SECONDARY','TEMPORARY'\)/);
  assert.match(migration, /status IN \('ACTIVE','ENDED','CANCELLED'\)/);
});

test("organization migration guards hierarchy cycles and overlapping primary placements", () => {
  assert.match(migration, /trampillera_guard_org_unit_cycle/);
  assert.match(migration, /pg_advisory_xact_lock\(742019, 2\)/);
  assert.match(migration, /trampillera_guard_primary_org_assignment/);
  assert.match(migration, /pg_advisory_xact_lock\(742019, 3\)/);
  assert.match(migration, /daterange\(existing\.valid_from, existing\.valid_until, '\[\]'\)/);
});
