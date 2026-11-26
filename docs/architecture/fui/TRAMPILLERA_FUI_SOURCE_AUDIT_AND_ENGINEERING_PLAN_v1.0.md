# TRAMPILLERA FUI — Source Audit and Engineering Plan

**Date:** 2026-11-26  
**Target:** Existing TRAMPILLERA Unified Reality OS / 3D FUI  
**Reference source:** `trampillera_polar_settlement_v1(1).html` (user-provided, 112,501 bytes, 1,717 lines)  
**Branch:** `audit/fui-responsive-i18n-2026-11-26`  
**Status:** Source audit and implementation plan; not production-ready and not deployed.

## 1. Governing decisions

1. Preserve the existing three-realm application: Intro Gate, Game / 3D FUI, and Classic Portal. Do not create a second game or a second settlement application.
2. Treat the uploaded HTML as a feature and content reference, not as a replacement for the production application. Reuse its useful concepts only through the existing FUI module and shared application contracts.
3. English is the engineering language: identifiers, file names, API contracts, schemas, comments, tests, diagnostics, commit messages, and technical documentation must be English.
4. User-facing content must use the platform's declared locale catalog. A language selector is not translation coverage. No locale may be advertised as complete until all required UI keys are present and tested.
5. Never claim a control, route, simulation, integration, or language works without an automated check and an appropriate browser/device verification.
6. No production deployment until source review, automated tests, accessibility checks, and browser regression checks pass.

## 2. Reference-file inventory

The uploaded file is a single-page HTML application with:
- Three.js r128 and OrbitControls loaded from external CDNs;
- Tailwind loaded from the CDN;
- one large inline application script and inline event handlers;
- a 3D hexagonal planet, orbital service nodes, spatial windows, editor tools, node links, radio synthesis, a classic feed, language orbit, settlement story overlay, and an SDT iframe/placeholder;
- twelve language names in a constant, but no translation catalog, translation-key mechanism, or locale-aware rendering;
- no CSS media queries in the file;
- global `html, body { overflow: hidden }`, with scroll limited to selected inner containers;
- fixed and viewport-derived window coordinates;
- a settlement story modal, not a complete playable settlement environment;
- a placeholder explaining that the full SDT 5D module is not included.

The file contains no duplicate static HTML IDs in its parsed markup. This does not establish uniqueness for IDs generated later by JavaScript templates.

## 3. Findings and severity

### P0 — Screen containment and navigation

- The reference file globally disables document scrolling. Long screens and low-height viewports can become inaccessible.
- Spatial windows are positioned from viewport dimensions, while their containing game layer can have different dimensions and offsets.
- Drag and resize constraints are not consistently based on the actual FUI container.
- The window manager does not define a single invariant guaranteeing that every visible window header and its close/minimize controls remain reachable.
- A fixed multi-button rail can compete with window content and browser safe areas.
- Mobile defaults hide several panels without providing a single, discoverable, scrollable window launcher in the reference file.

**Required direction:** use a measured FUI viewport, container-relative coordinates, a central geometry/clamping service, safe-area-aware fixed controls, and a responsive window workspace. Preserve a usable minimum game viewport, but allow the document/realm to grow vertically when the available viewport is short. Use internal vertical scrolling for long window content and a visible window/task drawer for hidden panels.

### P0 — Localization correctness

- The reference file declares EN, RU, SR, JA, DE, AR, FR, ES, ZH, PT, IT, and TR, but does not implement translations.
- The current production application has an existing shared twelve-locale catalog and voice layer in `app/public/shared/trampillera-global-controls.js`; its supported locale set is EN, RU, SR, DE, FR, ES, IT, PT, ZH, JA, KO, AR. This differs from the reference file: TR is present in the reference but KO is present in the production catalog.
- The production root page has a separate, partial `I18N_DICT` for portal content. FUI window templates and dynamic status messages still contain hardcoded Russian/English strings.
- Locale selection updates some portal labels and the language orbit, but does not translate the full FUI, modals, tooltips, generated window controls, notifications, and all realm screens.
- Arabic requires full RTL-aware layout behavior, not only setting `document.dir`.
- There is a declared-locale conflict: the uploaded reference file lists Turkish (TR) but not Korean (KO), while the production shared locale core lists Korean (KO) but not Turkish (TR).

**Required direction:** preserve the production twelve-locale catalog and add Turkish as a thirteenth locale, because both KO and TR have been explicitly declared across the two sources. The target locale set is therefore EN, RU, SR, DE, FR, ES, IT, PT, ZH, JA, KO, AR, and TR. Use canonical BCP-47 tags and direction metadata. Introduce stable translation keys and a single translation API for static markup, dynamic templates, ARIA labels, tooltips, notifications, empty/error states, and generated controls. Add locale completeness tests that fail on missing keys. Preserve original-language user content unless an explicit, provenance-tracked translation is requested.

### P1 — Window lifecycle and state

- Window position, size, visibility, minimization, and connection mode are stored in one mutable object without a validated schema/version.
- Restored local storage values are merged without strict numeric bounds or schema migration.
- Resizing a window can produce geometry inconsistent with the available content area.
- Window rendering rebuilds the entire window layer and disposes all mini-viewers, even when only one window changes.
- There is no single documented policy for pinned/essential windows, closed-window recovery, focus order, and z-index.
- Some window actions rely on inline event attributes and global functions.

**Required direction:** version the persisted workspace schema; validate and clamp restored values; centralize window actions; keep essential controls recoverable; render only affected modules where practical; use delegated event listeners and semantic buttons.

### P1 — Performance and WebGL lifecycle

- The planet is constructed as many individual cell meshes and geometries. Detail level 8 on an icosphere corresponds to 655,362 unique vertices before filtering; per-cell geometry/material creation at that scale is not a safe interactive default.
- The reference file exposes high subdivision values without a measured device capability budget.
- `createHexSaucerMesh` uses repeated `uniqueVerts.indexOf(...)` lookups inside a vertex loop, adding avoidable quadratic work.
- Mini-viewer renderers are disposed during full window rerenders; lifecycle and GPU resource ownership need explicit handling.
- No reduced-motion, low-power, or WebGL-failure mode is defined in the reference source.

**Required direction:** establish measured quality tiers; use indexed lookup maps and shared geometries/materials; evaluate InstancedMesh or merged geometry for cells; cap device pixel ratio and subdivision based on device capability; dispose resources deterministically; respect reduced-motion preferences; show a clear fallback when WebGL is unavailable.

### P1 — Security and robustness

- Dynamic UI is frequently assembled with `innerHTML` and interpolated data.
- Inline event handlers couple markup to global scope and complicate CSP hardening.
- JSON export/import and persisted local state need schema validation and safe parsing.
- The reference file loads major libraries from third-party CDNs without local integrity or availability fallback guarantees.

**Required direction:** escape or use DOM text APIs for dynamic/user-controlled values; use allow-listed actions and delegated listeners; validate imported/persisted data; pin external dependencies and use SRI or self-hosting where appropriate; do not introduce arbitrary code execution through workspace import.

### P2 — Product and integration boundaries

- The reference settlement is primarily narrative content. It does not provide a fully interactive settlement simulation.
- The SDT screen is explicitly a placeholder and must remain identified as such until the real module is present and verified.
- POLARIS GUARD must remain an in-game simulation unless real integrations are separately designed, authorized, and verified.
- Game day/night lighting and the portal's solar-status display are distinct systems and must not be presented as synchronized until they share a defined state contract.

## 4. Target module boundaries

| Module | Responsibility | Contract |
|---|---|---|
| `fui-shell` | Realm viewport, canvas, global controls, safe areas | Owns viewport measurements and active realm |
| `fui-window-manager` | Window registry, drag, resize, minimize, restore, z-order | Versioned window schema and geometry service |
| `fui-planet` | Three.js scene, globe, hex cells, raycasting | Emits typed sector-selection events |
| `fui-services` | Orbital service nodes and editors | Uses window manager and typed module events |
| `polarny` | Settlement experience and POLARIS GUARD simulation | One in-game module; no duplicate game or portal route |
| `fui-localization` | Locale catalog, translation, RTL, formatting | Uses platform locale core and canonical 12 locales |
| `fui-accessibility` | Keyboard, focus, labels, reduced motion, contrast | WCAG-oriented interaction contract |
| `fui-persistence` | Workspace save/restore and migrations | Versioned, validated local state |
| `fui-diagnostics` | Runtime status and error reporting | Reports observed state only; no simulated success |

## 5. Responsive layout contract

All dimensions are based on the measured `#realm-fui` content box, not the browser's outer viewport.

Required invariants:
- No horizontal page overflow at supported viewport sizes.
- No visible window may have its header, title, or essential controls outside the FUI bounds.
- Every visible window has a bounded body with vertical scrolling when content exceeds available height.
- Long forms, editors, settings, language lists, and settlement panels use internal scroll regions.
- The game canvas retains a usable minimum height; when the browser is short, the realm grows and the page scrolls rather than clipping controls.
- The bottom control rail accounts for `env(safe-area-inset-bottom)` and does not cover essential window actions.
- Controls wrap into rows or a compact drawer; no control is hidden without an equivalent discoverable route.
- Window geometry is reclamped on viewport resize, orientation change, browser zoom, and container resize.
- Dragging must keep a usable header strip reachable; resizing must respect minimum and maximum dimensions.
- Use `ResizeObserver` on the FUI container, with a window resize fallback.
- Test at minimum: 320×568, 360×800, 390×844, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080, and 2560×1440.

## 6. Localization contract

- Canonical target locale set: EN, RU, SR, DE, FR, ES, IT, PT, ZH, JA, KO, AR, TR.
- Canonical BCP-47 tags and RTL direction come from `TrampilleraLocaleCore`; extend that shared core for TR rather than maintaining a second competing language list in FUI.
- Do not silently drop KO or TR.
- Translation keys must cover: realm navigation, window titles, window controls, buttons, labels, inputs, placeholders, tooltips, ARIA labels, validation, errors, notifications, empty states, help text, and all dynamic FUI-generated markup.
- Every locale must have the same required key set; CI must fail on missing or empty translations.
- Avoid injecting translated strings as HTML. Rich text must use explicit trusted templates or DOM nodes.
- Use locale-aware date, time, and number formatting through `Intl`.
- Arabic must apply RTL layout to controls and content while preserving deliberate LTR islands for code, IDs, coordinates, and technical values.
- Voice recognition/TTS support is capability-dependent; the UI must report unsupported or unavailable devices honestly.

## 7. Implementation sequence

### Phase A — Audit baseline (this branch)
- Record source and production architecture findings.
- Confirm the authoritative locale set and module boundaries.
- Add baseline source tests for responsive invariants, window geometry, and translation coverage.
- No production deployment.

### Phase B — Viewport and window manager
- Implement container-relative geometry and one clamp/normalize function.
- Add ResizeObserver and viewport/orientation handling.
- Make the realm grow on short screens; add internal scroll regions and a discoverable window drawer.
- Add keyboard-accessible controls and focus management.
- Verify all required viewport sizes before changing other major behavior.

### Phase C — Localization
- Integrate FUI with the shared locale core; remove duplicate locale catalogs.
- Extract every FUI UI string to stable keys.
- Complete and review all twelve locale dictionaries.
- Add missing-key CI gates and RTL layout tests.

### Phase D — Settlement integration
- Reuse the uploaded file's settlement lore and POLARIS GUARD concepts inside the existing game realm.
- Keep one settlement window and one sector-selection path.
- Clearly label simulation-only features.
- Do not imply that the SDT placeholder is a working engine.

### Phase E — Performance, accessibility, and security
- Optimize geometry creation and GPU resource lifecycle.
- Add low-power/reduced-motion/WebGL fallback behavior.
- Validate imports and persisted layouts.
- Remove inline event handlers incrementally and harden dynamic rendering.

### Phase F — Verification and release
- Unit/source tests, locale coverage, static analysis, and build.
- Browser automation across viewport matrix and all three realms.
- Verify all visible buttons, window actions, locale changes, RTL, day/night, sector click, settlement open/close, and recovery paths.
- Deploy only after CI passes and a reviewed release candidate is approved.

## 8. Acceptance gates

A release is not complete until all gates pass:
1. Three-realm navigation remains intact; no duplicate game or duplicate settlement.
2. Every game control is visible, reachable, and operable at every required viewport.
3. No window title or essential control is clipped; long content has a visible scrollbar.
4. All twelve locales have complete FUI translation coverage; switching locale updates existing and dynamically rendered content.
5. Arabic RTL is verified, including menus, windows, controls, and scroll direction.
6. Sector selection and direct settlement button both open the same Polarny module.
7. Day/night changes the game scene consistently and updates accessible button state.
8. No uncaught JavaScript errors; WebGL fallback and reduced-motion behavior are tested.
9. Performance remains within documented geometry and frame-time budgets on representative desktop and mobile devices.
10. CI and browser tests pass; deployment status and tested commit SHA are recorded.

## 9. Audit evidence and limitations

- Reference-file static inspection: 1,717 lines; 112,501 bytes; no duplicate IDs in parsed static markup; no CSS media queries; no translation dictionary or translation-key attributes; two inline script blocks plus external library scripts.
- Production root-page static scan: 12 locale dictionaries are present, but each currently contains 17 keys; only 18 distinct `data-i18n` keys are present in the HTML. A simple source scan found 308 Cyrillic word-like tokens, 113 inline event-handler attributes, and 50 `.innerHTML =` assignments. These are source-scan indicators, not counts of unique user-facing strings or proof that every occurrence is user-visible.
- Production repository inspection: the existing app has an authoritative shared twelve-locale core and a partial root-page dictionary. The uploaded reference adds TR, so the combined declared requirement is thirteen locales. Existing language/voice audit already states full translation coverage and live browser verification are open.
- Production FUI currently contains a Polarny window, a rail entry, a sector focus function, and day/night controls. Their presence in source is not proof of browser operability or responsive fit.
- No real-device browser matrix was executed during this source audit.
- No production files or Render services were changed by this audit document.
