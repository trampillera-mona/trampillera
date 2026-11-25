import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app/public/index.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../app/public/shared/trampillera-unified-reality.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/public/shared/trampillera-unified-reality.css', import.meta.url), 'utf8');

test('Unified Reality banner is mounted once and loads its shared assets', () => {
  assert.equal((html.match(/id="unified-reality-banner"/g) || []).length, 1);
  assert.match(html, /href="\/shared\/trampillera-unified-reality\.css"/);
  assert.match(html, /src="\/shared\/trampillera-unified-reality\.js"/);
  assert.match(css, /#unified-reality-banner/);
  assert.match(css, /width:100%;max-width:none/);
  assert.match(css, /height:388px/);
  assert.match(css, /min-height:388px/);
  assert.doesNotMatch(css, /max-width:840px/);
  assert.match(css, /#unified-reality-banner \.ur-main[^}]*min-height:140px/);
});

test('banner preserves unique application IDs and required navigation controls', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], [], 'HTML IDs must remain unique');
  for (const id of [
    'u-date','u-time','u-utc','system-status','global-lang','theme-toggle-btn',
    'sfx-toggle-btn','radio-quick-btn','tab-intro','tab-fui','tab-classic',
    'pill-xp','pill-trp','ur-region','ur-time-travel','ur-fui-save',
    'ur-assistant','ur-globe-open','ur-passport','ur-control-plane','ur-earth-canvas',
    'ur-orbital-pulse','ur-auto-rotate','ur-atmosphere-toggle','solar-phase-label'
  ]) assert.ok(ids.includes(id), `missing banner integration element: ${id}`);
  assert.match(html, /href="\/control\//);
});

test('banner delegates actions to existing application modules instead of fake local controls', () => {
  for (const symbol of ['RealmRouter','JarvisOrchestrator','SnapshotStore','FUIWorkspace','MischiefNavigator','MV','Router']) {
    assert.ok(js.includes(symbol), `missing integration with ${symbol}`);
  }
  assert.match(js, /fetch\('\/api\/platform\/status'/);
  assert.match(js, /controls\.dispose\(\)/);
  assert.match(js, /window\.GlobeAPI\s*=/);
  assert.match(js, /function focusRegion\(key\)/);
  assert.match(js, /function updateSolarLighting\(\)/);
  assert.match(js, /prefers-reduced-motion/);\n  assert.match(js, /new THREE\.OrbitControls\(camera, root\)/);
  assert.match(js, /controls\.target\.copy\(viewTarget\)/);
  assert.match(js, /root\.style\.touchAction = 'none'/);
  assert.match(js, /orbitTargetX = Math\.min\(2\.6, Math\.max\(\.72, w \* \.0022\)\)/);
  assert.match(js, /controls\.enablePan = false/);
});
