# ITY CITY Integrated Environment — Architecture & Recovery Notes v0.2

## Module map
- `/city/`: thin module launcher and navigation shell.
- `/city/workspace/`: preserved first-release employee dashboard and workspace designer.
- `/city/campus/`: Corporate Campus spatial/organizational application.
- `/city/multiverse/`: Corporate Multiverse, missions, progression and learning environment.
- `/control/`: existing authenticated TRAMPILLERA Control Plane, opened separately from the launcher.

## Source preservation
The supplied source snapshots are stored under `app/public/city/source/`:
- `ITY_CITY_Corporate_Campus_v0.1.html`
- `ITY_CITY_Corporate_Multiverse_v0.1.html`

Launchable copies are placed in their own module directories. Only persistence identifiers are namespaced in the launchable copies; the source snapshots remain unchanged by the integration transformation.

## Persistence isolation
Both original applications used the same IndexedDB database name (`sdt-twin`) and the same localStorage keys (`sdt_scene_v1`, `sdt_ui_layout_v1`). The Multiverse also used `itycity_xp` and `itycity_visited`. Those collisions would cause one module to overwrite or reset the other module's browser-local demo state.

The launchable copies therefore use:
- Campus IndexedDB: `ity-city-campus-sdt-twin`
- Multiverse IndexedDB: `ity-city-multiverse-sdt-twin`
- Separate module-prefixed localStorage keys for scene and UI layout.
- Multiverse-specific XP and visited-building keys.

This is browser-local isolation only. It is not a shared server-side employee identity or progression service.

## Runtime composition
The launcher loads one module at a time in an iframe. This prevents the two full-page applications from sharing CSS selectors and JavaScript globals. They remain independently accessible by direct route. The existing workspace is copied to its own route rather than discarded.

## Current implementation boundary
Implemented:
- One entry point with navigation between the three ITY CITY experiences.
- The existing employee workspace remains available.
- Both source applications are preserved and separately launchable.
- Browser persistence namespaces are isolated.
- The existing Control Plane is linked as the administrative entry point.

Not implemented:
- Shared employee accounts, invitations, roles and granular permissions.
- A server-side mission authoring/assignment/completion API.
- Verified XP and achievement events.
- Cross-module team presence or real-time collaboration.
- Server-synchronized personal workspace layouts.
- Live integrations to SDT5D, ArtMer Engine or other product engines.

## Deployment
Render service `trampillera` uses the repository's `main` branch and has Auto Deploy disabled. After this change is merged to `main`, deploy it manually in Render using **Manual Deploy → Deploy latest commit**. No environment-variable or database changes are required for this frontend integration.

## Verification checklist
- Open `/city/` and confirm the module launcher appears.
- Open Workspace, Corporate Campus and Corporate Multiverse in turn.
- Confirm the original 3D experiences load and their controls respond.
- Create local scene/UI state in Campus, then in Multiverse; confirm one does not reset the other.
- Confirm the previous employee workspace still opens.
- Confirm `/control/` still opens separately.
- Confirm demo/local-only labels remain visible and no server-side mission verification is claimed.
