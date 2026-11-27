import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/public/worlds-play/index.html', import.meta.url), 'utf8');

test('Origami Pulse Gate is present on the planner splash and targets the map workspace', () => {
  assert.equal((html.match(/class="origami-pulse-gate"/g) || []).length, 1);
  assert.match(html, /<a class="origami-pulse-gate" href="#mars-map-workspace"/);
  assert.match(html, /id="mars-map-workspace"/);
  assert.match(html, /aria-label="Enter the Mars map workspace"/);
});

test('Origami Pulse Gate has accessible focus and reduced-motion behavior', () => {
  assert.match(html, /\.origami-pulse-gate:focus-visible/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.origami-pulse-gate\{animation:none;transition:none\}/);
  assert.match(html, /@keyframes origamiGatePulse/);
});

test('Origami Pulse Gate label is localized in authored English and Russian dictionaries', () => {
  assert.match(html, /EN:\{[^}]*enterPlanner:'ENTER MAP PLANNER'/);
  assert.match(html, /RU:\{[^}]*enterPlanner:'ОТКРЫТЬ ПЛАНИРОВЩИК КАРТ'/);
});

const worldRoot = '../app/public/worlds-play/';
const readWorld = (file) => readFileSync(new URL(worldRoot + file, import.meta.url), 'utf8');
const baseMap = readWorld('packs/mars/mars-base-map.svg');
const layerFiles = [
  'terrain',
  'infrastructure',
  'resources',
  'operations',
  'environment',
  'scenario',
].map((name) => [name, readWorld(`packs/mars/layer-${name}.svg`)]);

test('Mars print masters share the same A4 landscape canvas and complete 9×7 grid', () => {
  for (const [name, source] of [['base-map', baseMap], ...layerFiles]) {
    assert.match(source, /width="259mm" height="200mm"/, `${name}: physical print area`);
    assert.match(source, /viewBox="0 0 1100 850"/, `${name}: shared SVG canvas`);
    assert.match(source, /width="900" height="700"/, `${name}: shared map frame`);
    assert.match(source, /x="62" y="760">G/, `${name}: seventh row label`);
  }
  for (const [name, source] of layerFiles) {
    assert.match(source, /M100 810H1000/, `${name}: bottom grid boundary`);
    assert.match(source, /M200 110V810/, `${name}: vertical grid lines reach row G`);
    assert.match(source, /M100 210H1000/, `${name}: top row boundary`);
  }
  assert.match(baseMap, /<pattern id="grid" width="100" height="100"/);
  assert.doesNotMatch(baseMap, /<text x="7" y="18"[^>]*>A<\/text>/);
});

test('Mars points of interest and rover start match the dossier coordinates', () => {
  const resources = layerFiles.find(([name]) => name === 'resources')[1];
  const operations = layerFiles.find(([name]) => name === 'operations')[1];
  const dossier = readWorld('packs/mars/mars-world-dossier-v0.2.md');
  for (const coordinate of ['C03', 'B07', 'F08']) assert.match(dossier, new RegExp(coordinate));
  assert.match(resources, /POI-01 · C03/);
  assert.match(resources, /POI-02 · B07/);
  assert.match(resources, /POI-03 · F08/);
  assert.match(resources, /M332 360l18-30/);
  assert.match(resources, /M732 260l18-30/);
  assert.match(resources, /M832 660l18-30/);
  assert.match(operations, /cx='550' cy='460'/);
  assert.match(operations, /ROVER-01/);
  assert.match(dossier, /900 × 700 units/);
});

test('Interactive preview is not misrepresented as the print-ready aligned map', () => {
  assert.match(html, /ILLUSTRATIVE PREVIEW · NOT TO SCALE/);
  assert.match(html, /PRINT MAP PREVIEW/);
  assert.match(html, /six aligned 9×7 overlays in the Mars World Pack/);
  assert.match(html, /@page\{size:A4 landscape;margin:8mm\}/);
});

test('Unfinished locales are disabled and unsupported saved locales fall back to English', () => {
  assert.match(html, /<option value="SR" disabled>/);
  assert.match(html, /<option value="DE" disabled>/);
  assert.match(html, /if\(!translations\[code\]\)code='EN'/);
  assert.match(html, /\.sr-only\{/);
  assert.match(html, /class="skip-link" href="#mars-map-workspace"/);
});
