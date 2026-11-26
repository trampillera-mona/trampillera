# Polar Settlement × SDT5D Integration Audit

**Date:** 2026-11-26  
**Scope:** Restore the original SDT 5D Engine v20 inside the existing Polar Settlement GAME / 3D FUI. Preserve the public portal, JARVISER, account system, database, and existing backend behavior.

## Architecture and preserved source

- Public portal: `app/public/index.html`
- Polar Settlement game: `app/public/games/polar-settlement.html`
- Original SDT 5D Engine v20 copy: `app/public/sdt-5d-engine-v20.html`
- Engine source of record: `trampillera-mona/SDT5D/index.html`
- Integration path: Portal → Polar Settlement iframe → SDT5D v20 iframe.
- The SDT5D engine remains an isolated workspace. The portal and game shells are not replaced.

## Restored / connected in this pass

- The real SDT 5D Engine v20 is loaded from the existing public asset path; it is not a placeholder.
- Added an explicit return control from SDT5D to Polar Settlement.
- Added a same-origin, source-validated message bridge between the game and SDT5D.
- JARVISER commands from the portal are queued until the game iframe is ready.
- Game JARVISER commands can be routed to SDT5D using `sdt <command>` or `studio <command>`; SDT5D commands are also routed when the Studio is active.
- Locale changes are synchronized portal → game → SDT5D; local game language selection is synchronized back to the portal.
- Added camera, microphone, fullscreen, and XR iframe permission delegation through the nested frames.
- Updated the response security policy to permit the SDT5D module CDN, Blob workers, and secure WebSocket signaling required by the engine.
- SDT5D Studio delivery is now gated by the existing authenticated session. No new account system or credential store was introduced. The public portal remains accessible; individual Studio access is issued by request.

## SDT5D v20 capabilities present in source

- Three.js 3D scene and WebGPU-compatible module imports.
- Terrain, buildings, roads, pedestrians, geozones, metro and other scene layers.
- H3 spatial indexing, Turf geospatial operations, and coordinate conversion via proj4.
- Yuka agent simulation and Rapier physics.
- Timeline manager, snapshots, branches, merge, causality links, probability weighting, superposition, and 3D multiverse visualization.
- Layer manager, workspace presets, quick search, event timeline, telemetry, and radial menu.
- Camera Hub, operator camera, broadcast recorder, overlay window, Studio Console, and Director panel.
- Voice input, dialog controls, handwriting/stylus input, gesture controls, and macro recording.
- Artist tools, materials, palettes, gradients, annotations, BIM import, and GLTF import/export.
- Yjs document state, IndexedDB persistence, and WebRTC collaboration components.
- WebXR / AR / VR entry points.

**Important:** This is a source-level inventory. Presence in the code does not by itself prove that every feature works in the deployed browser.

## Confirmed limitations / open work

1. **Full localization is incomplete.** The portal has a 12-language dictionary for selected portal content; Polar Settlement has a 12-language selector; SDT5D v20's main control surface is still predominantly English. This pass synchronizes locale context and translates the return control, not every SDT5D label or message.
2. **Polar geospatial anchor is not configured.** The unmodified v20 engine defaults to a Belgrade origin (44.8125, 20.4622). That is not a verified location for the fictional Polar Settlement. Do not treat its geographic outputs as Polar Settlement data until a canonical reference or explicitly local coordinate system is agreed.
3. **Scenario telemetry is demo/synthetic.** No real Polar Settlement GIS, BIM, IoT, sensor, or operational data source is connected yet.
4. **Collaboration is not verified as a shared team session.** The current v20 source initializes a randomized demo room name; that isolates sessions rather than establishing a controlled shared project room. Do not advertise live multi-user collaboration until an authenticated signaling/room strategy is configured.
5. **Commentator camera is local preview only.** It is not a remote broadcast or recording service.
6. **Browser/device runtime checks remain outstanding.** Syntax checks and deployment checks are not substitutes for real camera, XR, touch, WebRTC, and responsive UI tests on target devices.
7. **The existing SDT5D scene and the Polar planet/story world are not yet one shared scene graph.** The engine is integrated as a workspace; a Polar-specific world adapter and project data model remain to be completed.

## Verification status

- JavaScript syntax checks: passed for the current inline game, portal, and SDT5D scripts.
- Duplicate DOM ID scan: none found in those three HTML files.
- Source and static route presence: confirmed in the repository.
- Browser interaction / visual regression: not yet verified.
- Production deployment: pending after this audit pass.
