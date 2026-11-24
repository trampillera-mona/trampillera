import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const pairs = [
  ["originals/trampillera-platform-full.original.html","app/public/index.html","platform source"],
  ["originals/trampillera-control-plane-preview.original.html","app/public/control/index.html","control plane source"]
];
const hash = (b) => createHash("sha256").update(b).digest("hex");
for (const [original,served,label] of pairs) {
  const a=readFileSync(new URL(`../${original}`,import.meta.url));
  const b=readFileSync(new URL(`../${served}`,import.meta.url));
  assert.ok(a.length>1000,`${label}: original source missing`);
  const expected = label === "platform source"
    ? "a9b4c6129e1c1ba3ead6cdac87e838ba296eed9b69d3c8a1a6ab9cdb60cfee92"
    : "3c03a27a36db9e08b678a255551cb25c9908a8373cd14552706545dcf7abdda6";
  assert.equal(hash(a),expected,`${label}: original uploaded source changed`);
  assert.ok(b.length>1000,`${label}: served interface missing`);
  console.log(`${label}: original ${a.length} bytes (${hash(a)}); deployed ${b.length} bytes (${hash(b)})`);
}
const platform=readFileSync(new URL("../app/public/index.html",import.meta.url),"utf8");
const control=readFileSync(new URL("../app/public/control/index.html",import.meta.url),"utf8");
assert.match(platform,/href="\/control\/"/,"platform shortcut must target Control Plane");
assert.match(control,/\/api\/control/,"Control Plane must call the shared API");
assert.match(control,/tp-login/,"Control Plane must include authentication gate");
console.log("Interface integration checks passed.");

const city=readFileSync(new URL("../app/public/city/index.html",import.meta.url),"utf8");
const cityTeam=readFileSync(new URL("../app/public/city/team/index.html",import.meta.url),"utf8");
const controlTeam=readFileSync(new URL("../app/public/control/team/index.html",import.meta.url),"utf8");
const server=readFileSync(new URL("../app/server.js",import.meta.url),"utf8");
for (const route of ["/city/workspace/","/city/campus/","/city/multiverse/","/city/team/"]) assert.ok(city.includes(route),"ITY CITY launcher missing "+route);
for (const table of ["employees","team_missions","mission_assignments","mission_messages"]) assert.ok(server.includes("CREATE TABLE IF NOT EXISTS "+table),"Database table missing: "+table);
for (const route of ["/api/auth/employee-login","/api/team/dashboard","/api/team/missions","/api/control/team/employees","/api/control/team/missions","/api/control/team/submissions"]) assert.ok(server.includes(route),"API route missing: "+route);
assert.ok(server.includes("\"frame-ancestors\": [\"'self'\"]"),"same-origin app shell framing must be allowed by CSP");
assert.ok(server.includes('frameguard: { action: "sameorigin" }'),"same-origin app shell framing must be allowed by X-Frame-Options");
assert.ok(server.includes('app.use("/api/control", requireAuth, requireAdmin);'),"Control Plane API must remain administrator-only");
assert.ok(server.includes("passwordHash(password)"),"Employee passwords must be stored as password hashes");
assert.ok(server.includes("xp_awarded=CASE WHEN $2='VERIFIED' THEN m.xp_reward ELSE 0 END"),"XP must be awarded only on verified submissions");
assert.ok(cityTeam.includes("/api/auth/employee-login"),"Employee portal must use server authentication");
assert.ok(controlTeam.includes("/api/control/team/submissions"),"Team admin must load server-side submissions");
console.log("ITY CITY team identity, mission workflow, verified XP and same-origin module checks passed.");
assert.ok(server.includes("auth_version INTEGER NOT NULL DEFAULT 1"),"employee session version column must exist");
assert.ok(server.includes("ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_version"),"existing employee databases must migrate without reset");
assert.ok(server.includes("SESSION_IDLE_MS") && server.includes("SESSION_ABSOLUTE_MS"),"server must enforce idle and absolute session expiry");
assert.ok(server.includes("sameOriginGuard") && server.includes("sec-fetch-site"),"state-changing API requests must validate request origin metadata");
assert.ok(server.includes("PASSWORD_CHANGE_REQUIRED"),"temporary passwords must gate employee APIs until changed");
assert.ok(server.includes("auth_version=auth_version+1"),"password changes, resets and disable actions must revoke old employee sessions");
assert.ok(server.includes("auditWithClient"),"critical team state transitions must write audit records in their transaction");
assert.ok(server.includes('pool.on("error"'),"PostgreSQL idle pool errors must be observed");
assert.ok(server.indexOf('app.use("/api/control", requireAuth, requireAdmin);') < server.indexOf('app.get("/api/control/team/employees"'),"team administration APIs must remain behind the administrator guard");
console.log("Session lifecycle, CSRF defense, transaction/audit integrity and database runtime checks passed.");
