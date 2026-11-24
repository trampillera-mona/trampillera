# ITY CITY Integrated Environment — Architecture & Recovery Notes v0.2

## Module map
- `/city/`: thin module launcher and navigation shell.
- `/city/workspace/`: preserved first-release employee dashboard and workspace designer.
- `/city/campus/`: Corporate Campus spatial/organizational application.
- `/city/multiverse/`: Corporate Multiverse, missions, progression and learning environment.
- `/city/team/`: authenticated employee portal for team missions and collaboration.
- `/control/`: existing authenticated TRAMPILLERA Control Plane.
- `/control/team/`: administrator console for employees, missions and submission review.

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

This is browser-local isolation for the two original 3D modules. The separate Team Missions service uses PostgreSQL-backed employee identity, assignments, discussion and verified XP.

## Runtime composition
The launcher loads one module at a time in an iframe. This prevents the two full-page applications from sharing CSS selectors and JavaScript globals. They remain independently accessible by direct route. The existing workspace is copied to its own route rather than discarded.

## Current implementation boundary

Implemented:
- One entry point with navigation between Workspace, Campus, Multiverse and Team Game.
- Both supplied source applications and the previous workspace are preserved.
- Campus and Multiverse browser persistence identifiers are isolated.
- Employee accounts with salted scrypt password hashes, forced password change on first login, account disable and administrator-issued password reset.
- Separate employee and administrator session roles; Control Plane API routes are administrator-only.
- PostgreSQL mission registry, per-employee assignments and shared discussion threads.
- Mission workflow: ASSIGNED → IN_PROGRESS → SUBMITTED → VERIFIED, with REJECTED requiring a review reason.
- Server-side XP award only after administrator verification; leaderboard uses verified XP from PostgreSQL.
- Audit events for account and mission actions.
- Same-origin iframe framing allowed for the module launcher; cross-origin framing remains blocked.

Not implemented:
- Email invitations or automatic password delivery.
- File attachments and evidence upload.
- Real-time WebSocket presence or push notifications.
- Team-wide shared completion state; each assigned employee has an individual submission.
- Multi-level approvals, department managers or fine-grained configurable permission matrices.
- External engine evidence integrations.
- Server-synchronized personal workspace layouts.
- XP as an employee performance, productivity or compensation metric.

Mission submission notes are self-reported. Administrator review is the verification step in this release. This is a first server-backed collaboration loop, not a full HR or project-management suite.

## Deployment
Render service `trampillera` uses the repository's `main` branch and has Auto Deploy disabled. After this change is merged to `main`, deploy it manually in Render using **Manual Deploy → Deploy latest commit**. The new PostgreSQL tables are created non-destructively at application startup using `CREATE TABLE IF NOT EXISTS`; no environment-variable changes or database reset are required.

## Verification checklist
- Open `/city/` and confirm the module launcher appears.
- Open Workspace, Corporate Campus and Corporate Multiverse in turn.
- Confirm the original 3D experiences load and their controls respond.
- Create local scene/UI state in Campus, then in Multiverse; confirm one does not reset the other.
- Confirm the previous employee workspace still opens.
- Confirm `/control/` and `/control/team/` require administrator authentication.
- Create two test employee accounts and assign a shared mission.
- Confirm both employees can discuss the mission and submit their own results.
- Confirm XP remains unchanged until administrator verification, then appears in the leaderboard.
- Disable a test employee and confirm their existing session loses access.
