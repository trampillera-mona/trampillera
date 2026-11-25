import assert from "node:assert/strict";
import { totpCode } from "../app/security/totp.js";

const base = "http://127.0.0.1:3000";
const origin = base;
function client() {
  let cookies = new Map();
  return async function request(path, body) {
    const headers = { "Origin": origin, "Content-Type": "application/json" };
    if (cookies.size) headers.Cookie = [...cookies].map(([k,v]) => k + "=" + v).join("; ");
    const response = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual"
    });
    for (const item of response.headers.getSetCookie()) {
      const pair = item.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const data = await response.json().catch(() => ({}));
    assert.ok(response.ok, path + " returned " + response.status + ": " + (data.error || ""));
    return data;
  };
}
async function exercise(label, loginPath, loginBody, disablePassword, role) {
  const api = client();
  await api(loginPath, loginBody);
  const enrollment = await api("/api/auth/totp/enroll", {});
  assert.ok(enrollment.secret);
  const code = () => totpCode(enrollment.secret);
  assert.equal((await api("/api/auth/totp/confirm", { code: code() })).enabled, true);
  await api("/api/auth/logout", {});
  const challenge = await api(loginPath, loginBody);
  assert.equal(challenge.requiresTotp, true);
  assert.equal(challenge.authenticated, false);
  const verified = await api("/api/auth/totp/verify-login", { code: code() });
  assert.equal(verified.authenticated, true);
  assert.equal(verified.role, role);
  assert.equal((await api("/api/auth/totp/disable", { password: disablePassword, code: code() })).enabled, false);
  console.log(label + " TOTP lifecycle passed.");
}

await exercise(
  "Administrator",
  "/api/auth/login",
  { password: "ci-temporary-admin-password-123" },
  "ci-temporary-admin-password-123",
  "admin"
);
await exercise(
  "Employee",
  "/api/auth/employee-login",
  { email: "ci-teammate-two@example.test", password: "ci-test-reset-password-789" },
  "ci-test-reset-password-789",
  "employee"
);
