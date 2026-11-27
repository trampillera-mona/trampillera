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
