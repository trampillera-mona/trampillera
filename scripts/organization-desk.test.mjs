import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const server = await readFile(new URL("../app/server.js", import.meta.url), "utf8");
const control = await readFile(new URL("../app/public/control/index.html", import.meta.url), "utf8");
const migration = await readFile(new URL("../app/migrations/0002_normalized_organization.sql", import.meta.url), "utf8");

test("Control Plane inline JavaScript parses", () => {
  const scripts = [...control.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((m) => !/\bsrc\s*=/.test(m[1]));
  assert.ok(scripts.length > 0, "expected at least one inline script");
  for (const [index, script] of scripts.entries()) {
    assert.doesNotThrow(() => new vm.Script(script[2], { filename: `control-inline-${index}.js` }));
  }
});

test("organization API routes are behind administrator authentication", () => {
  const guard = server.indexOf('app.use("/api/control", requireAuth, requireAdmin);');
  const route = server.indexOf('app.get("/api/control/organization"');
  assert.ok(guard >= 0 && route > guard, "admin middleware must precede Organization Desk routes");
  for (const path of [
    'app.post("/api/control/organization/units"',
    'app.post("/api/control/organization/positions"',
    'app.post("/api/control/organization/assignments"'
  ]) assert.ok(server.indexOf(path) > guard, `${path} must be admin protected`);
});

test("directory reads only persisted units, positions, employee accounts and effective placements", () => {
  assert.match(server, /FROM org_units u/);
  assert.match(server, /FROM positions ORDER BY title/);
  assert.match(server, /FROM employees e/);
  assert.match(server, /FROM employee_org_assignments x/);
  assert.match(server, /valid_from<=CURRENT_DATE/);
});

test("unit, position and assignment writes include transactional audit events", () => {
  for (const action of ["ORG_UNIT_CREATED", "ORG_POSITION_CREATED", "EMPLOYEE_ORG_ASSIGNMENT_CREATED"]) {
    assert.ok(server.includes(action), `missing audit action ${action}`);
  }
  assert.match(server, /await auditWithClient\(client,/);
  assert.match(server, /await client\.query\("COMMIT"\)/);
  assert.match(server, /await client\.query\("ROLLBACK"\)/);
});

test("employee assignment requires explicit active employee and active organization references", () => {
  assert.match(server, /SELECT id,active FROM employees WHERE id=\$1 FOR UPDATE/);
  assert.match(server, /SELECT id,status FROM org_units WHERE id=\$1/);
  assert.match(server, /SELECT id,status FROM positions WHERE id=\$1/);
  assert.match(server, /employee_org_assignments\(employee_id,org_unit_id,position_id,assignment_type,valid_from,valid_until,created_by\)/);
});

test("legacy employee labels are displayed but not automatically rewritten", () => {
  assert.match(server, /e\.department AS legacy_department/);
  assert.match(server, /e\.job_title AS legacy_job_title/);
  assert.match(control, /LEGACY DEPARTMENT/);
  assert.match(control, /LEGACY JOB TITLE/);
  assert.match(control, /No automatic mapping or assignment is performed/);
  assert.doesNotMatch(server, /UPDATE employees SET department/);
  assert.doesNotMatch(server, /UPDATE employees SET job_title/);
});

test("position catalogue is not an authorization role system", () => {
  assert.match(migration, /organizational positions; a position is not an authorization role/i);
  assert.match(control, /Positions describe organizational functions, not access permissions/);
});
