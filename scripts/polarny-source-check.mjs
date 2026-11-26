import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "app/public/index.html"), "utf8");
const required = [
  "win-polarny", "polarnySettlement", "POLARIS GUARD",
  "setPolarnyScenario", "acknowledgePolarnyEvent", "resolvePolarnyEvent",
  "runPolarnyRoutineCheck", "SIMULATION ONLY", "посёлок Полярный",
  "Умка-Товн", "🐻‍❄️", "function renderAllFUIWindows",
  "function renderWindowContent", "function getDefaultFUIWindows"
];
for (const marker of required) assert.ok(html.includes(marker), "Missing in-game settlement marker: " + marker);
const intro = html.match(/<div class="intro-gateway-buttons">([\s\S]*?)<\/div>/);
assert.ok(intro, "Welcome panel buttons are missing.");
assert.equal((intro[1].match(/<button\b/g) || []).length, 3, "Welcome panel must contain exactly three buttons.");
assert.ok(!intro[1].includes("/polarny/"), "The welcome panel must not link to a separate settlement page.");
assert.ok(!html.includes('href="/polarny/"'), "No navigation may send the user to a standalone Polarny page.");
await assert.rejects(access(path.join(root, "app/public/polarny/index.html")), "Standalone Polarny game must be removed.");
assert.ok(html.includes('id="polarny-game-entry"'), "The in-game Polarny entry button must be present.");
assert.ok(html.includes("onclick=\"toggleWindowById('win-polarny')\""), "Settlement must open from inside the 3D FUI game.");
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(m => !/\bsrc\s*=/.test(m[1]) && !/application\/(?:ld\+)?json/i.test(m[1]))
  .map(m => m[2]).filter(s => s.trim());
assert.ok(scripts.length >= 2, "Expected inline application scripts.");
for (let i = 0; i < scripts.length; i++) new vm.Script(scripts[i], { filename: "trampillera-inline-" + i + ".js" });
console.log("Polarny integration checks passed: exactly 3 welcome buttons; no standalone route; in-game settlement and POLARIS GUARD actions present; " + scripts.length + " inline scripts parsed.");
