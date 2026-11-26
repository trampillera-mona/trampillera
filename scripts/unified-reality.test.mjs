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
  assert.match(css, /max-width:none/);
  assert.match(css, /height:auto/);
  assert.match(css, /min-height:260px/);
  assert.match(css, /#unified-reality-banner \.ur-main\{[^}]*flex-wrap:wrap/);
  assert.match(css, /#unified-reality-banner \.ur-nav\{[^}]*flex:1 1 500px/);
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
  assert.match(js, /prefers-reduced-motion/);
});

test('FUI viewport grows on short screens and keeps controls inside the game realm', () => {
  assert.match(html, /height: max\(560px, min\(920px, calc\(100svh - 300px\)\)\)/);
  assert.match(html, /#fui-control-rail \{ position:absolute/);
  assert.match(html, /env\(safe-area-inset-bottom\)/);
  assert.match(html, /#spatial-windows-layer \{ padding-bottom:92px/);
  assert.match(html, /\.spatial-window \[id\$="-body"\] \{ min-height:0/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
});

test('FUI window geometry is measured, clamped, and observed at the container boundary', () => {
  assert.match(html, /function getFUIBounds\(\)/);
  assert.match(html, /function clampFUIWindow\(win, bounds = getFUIBounds\(\)\)/);
  assert.match(html, /function observeFUIContainer\(\)/);
  assert.match(html, /if \(!realm \|\| !realm\.classList\.contains\('active'\) \|\| !wrap \|\| !camera \|\| !renderer\) return/);
  assert.match(html, /new ResizeObserver\(\(\) => onFUIResize\(\)\)/);
  assert.match(html, /const bounds = getFUIBounds\(\);[\s\S]*?clampFUIWindow\(win, bounds\)/);
  assert.match(html, /pointercancel/);
  assert.match(html, /workspaceBounds = fuiRealm && fuiRealm\.classList\.contains\('active'\)/);
});

test('3D FUI keeps one Polarny entry, clickable polar sector, responsive controls and day/night', () => {
  assert.equal((html.match(/id="fui-open-polarny"/g) || []).length, 1);
  assert.match(html, /filter\(w => !w\.visible && w\.id !== 'win-polarny'\)/);
  assert.match(html, /if \(data\.isPolarnySector\)\s*\{[\s\S]*?openPolarnySettlement\('sector'\)/);
  assert.match(html, /id="fui-open-dock"/);
  assert.match(html, /id="fui-daynight-toggle"/);
  assert.match(html, /function toggleFUIDayNight\(\)/);
  assert.equal((html.match(/id="theme-toggle-btn"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="btnTheme"/);
  assert.match(html, /@media\(max-width:767px\)/);
  assert.match(html, /win\.width = Math\.min\(380, Math\.max\(280, width - 24\)\)/);
});
