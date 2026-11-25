# TRAMPILLERA MEDIA — Unified Reality Banner Integration v0.1

**Status:** Implementation proposal in pull request; not deployed  
**Date:** 2026-11-25  
**Source input:** User-provided `TRAMPILLERA MEDIA · UNIFIED REALITY` HTML reference  
**Implementation:** `app/public/index.html`, `app/public/shared/trampillera-unified-reality.css`, `app/public/shared/trampillera-unified-reality.js`

## 1. Scope

Replace the existing homepage unified top bar with one responsive Unified Reality banner inspired by the supplied reference. Keep the existing application realms and module implementations. Do not copy this banner into unrelated employee, Control Plane, registry, or workspace interfaces.

Repository inspection covered all 13 HTML files under `app/public/`. The supplied HTML block was not present verbatim; the matching integration point was the existing unified top bar in `app/public/index.html`.

## 2. Integration contract

| Banner control | Existing application target | Expected behavior |
|---|---|---|
| Intro Gate | `RealmRouter.switchRealm('intro')` | Show cinematic intro |
| Game · 3D FUI | `RealmRouter.switchRealm('fui')` | Show spatial FUI constructor |
| Classic Portal | `RealmRouter.switchRealm('classic')` | Show editorial portal |
| JARVISER | `JarvisOrchestrator.open()` | Open existing orchestrator overlay |
| Language | `selectGlobalLanguage(code)` via existing `#global-lang` handler | Update shared locale and translations |
| Theme | Existing `#theme-toggle-btn` handler | Toggle application theme |
| SFX | Existing `#sfx-toggle-btn` handler | Toggle application UI sound |
| Synth | Existing `#radio-quick-btn` handler | Toggle existing synth radio |
| Time-Travel | `SnapshotStore.updateSliderUI()` and existing dock | Open/close snapshot dock |
| Save FUI | `FUIWorkspace.save()` | Persist current FUI layout |
| Assistant | `MischiefNavigator.toggle()` | Open/close existing assistant |
| Globe Desk | `RealmRouter` + `Router.go('globe')` | Open the existing Classic Portal globe view |
| Profile | `MV.openPassport()` | Open existing passport/profile experience |
| Control Plane | `/control/` | Navigate to the authenticated Control Plane entry point |

The region selector and globe camera controls operate only on the decorative 3D Earth in the banner. They do not query GIS data, determine the user's actual location, or imply territorial intelligence data is loaded.

The Control Plane link performs a read-only request to `GET /api/platform/status` for a truthful API status hint. That endpoint reports application and PostgreSQL registry availability only; external integrations and provider connectivity remain unknown unless separately probed.

## 3. Runtime and safety boundaries

- Reuses the application's existing Three.js r128 dependency; no new package dependency.
- Uses a local procedural texture fallback if the external Earth texture cannot load.
- If WebGL is unavailable, the banner reports that the 3D enhancement is unavailable; the portal navigation remains usable.
- Honors `prefers-reduced-motion`; limits renderer pixel ratio and disposes animation/renderer resources on page exit.
- Keeps the existing global clock, locale, audio, snapshot, FUI, assistant, JARVISER, router, and Control Plane implementations authoritative.
- No authentication, employee permissions, API authorization, database schema, or production secret changes.
- No production deployment is part of this pull request.

## 4. Verification

The pull request adds:
- Static integration assertions for unique HTML IDs, asset mounting, required controls, and module delegation.
- JavaScript syntax check.
- CI HTTP smoke checks for the banner, stylesheet, and controller assets.

Browser-level visual, keyboard, screen-reader, cross-browser, and real WebGL testing remain required before declaring the banner fully verified.

## 5. Rollback

Revert the banner integration commit(s) in this feature branch or close the draft pull request. The previous homepage top bar is replaced only in the feature branch; production remains unchanged until a separately approved merge and deployment.
