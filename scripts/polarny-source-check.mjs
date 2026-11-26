import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(path.join(root, "app/public/polarny/index.html"), "utf8");
const required = [
  "POLARIS GUARD", "win-polaris-guard", "setPolarisScenario",
  "acknowledgePolarisEvent", "resolvePolarisEvent", "runPolarisRoutineCheck",
  "SIMULATION ONLY", "OFFICIAL NAME: POLARNY", "UMKA-TOWN",
  "function initThreeScene", "function buildHexagonalPlanet",
  "function createHexSaucerMesh", "function renderAllSpatialWindows",
  "function handleJarviserCommand", "function renderClassicArticles",
  "function bootstrapTrampillera"
];
for (const marker of required) assert.ok(html.includes(marker), `Missing source marker: ${marker}`);
assert.ok(!html.includes('<div id="splash">'), "Splash gate must remain removed.");
assert.ok(html.includes("No real sensors, cameras, access control or emergency services are connected."), "Guard must clearly disclose simulation-only status.");
const scripts = [...html.matchAll(/<script\\b(?![^>]*\\bsrc=)[^>]*>([\\s\\S]*?)<\\/script\\s*>/gi)].map(m => m[1]).filter(s => s.trim());
assert.ok(scripts.length >= 2, "Expected inline runtime scripts.");
for (let i = 0; i < scripts.length; i++) new vm.Script(scripts[i], { filename: `polarny-inline-${i}.js` });
console.log(`Polarny source checks passed: ${scripts.length} inline scripts parsed; original 3D/FUI subsystems retained; POLARIS Guard is simulation-only.`);
