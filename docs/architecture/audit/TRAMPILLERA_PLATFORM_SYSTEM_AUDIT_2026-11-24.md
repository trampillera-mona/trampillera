# TRAMPILLERA Platform System Audit — 2026-11-24

**Audit scope:** repository-level architecture, server/API, identity and authorization, PostgreSQL data model, ITY CITY employee collaboration, static module integration, CI and deployment configuration.

**Evidence boundary:** this is a source-code and CI audit of the GitHub branch. It is not a live Render production test, penetration test, backup/restore exercise, or review of production database contents. The branch is not live until separately merged and manually deployed.

## 1. System map observed in source

| Surface / subsystem | Current implementation | Actual integration level |
|---|---|---|
| Public TRAMPILLERA interface `/` | Static HTML/JS served by Express | Public web surface; legacy client-side runtime |
| Control Plane `/control/` | Static UI, authenticated `/api/control/*` calls | Connected to shared API and PostgreSQL registries |
| ITY CITY launcher `/city/` | Same-origin iframe launcher | Navigation/integration shell |
| Workspace `/city/workspace/` | Preserved browser application | Local prototype state; no shared server workspace state |
| Corporate Campus `/city/campus/` | Preserved browser application | Local prototype state; isolated browser storage |
| Corporate Multiverse `/city/multiverse/` | Preserved browser application | Local prototype state; isolated browser storage |
| Team Game `/city/team/` | Employee portal + authenticated API | Server-backed accounts, assignments, submissions, XP and shared discussion |
| Team Admin `/control/team/` | Administrator UI + protected API | Server-backed employee and mission management |
| JARVISER Core | Registry entry in `platform_modules` | Discovered/catalogued; not an executing orchestrator in this build |
| Connectors | Registry in `platform_connectors` | Configuration catalogue; validation checks HTTPS syntax only, not live connectivity |
| Model providers | Registry in `model_providers` | Catalogue; not a provider-neutral inference router |
| AI chat | Optional server-side OpenAI-compatible request | One configured endpoint path; not yet a modular multi-provider adapter |
| PostgreSQL | Shared persistent database | Stores platform registries, audit events and Team Game state |
| Render | Docker web service + attached PostgreSQL | Deployment target; this audit does not deploy or alter it |

### Runtime/data flow

```text
Browser
  ├─ Public TRAMPILLERA UI ──────────────── static assets
  ├─ Control Plane ── admin session ────── /api/control/*
  └─ ITY CITY launcher
       ├─ Workspace ────────────────────── browser-local prototype state
       ├─ Corporate Campus ─────────────── browser-local prototype state
       ├─ Corporate Multiverse ─────────── browser-local prototype state
       └─ Team Game ── employee session ─ /api/team/*

Express application
  ├─ Helmet / JSON parser / signed cookie session / rate limits
  ├─ Public status and authentication routes
  ├─ Admin authorization boundary
  ├─ Employee authorization boundary
  ├─ PostgreSQL connection pool
  └─ Static file server

PostgreSQL
  ├─ platform_modules / platform_connectors / model_providers
  ├─ audit_events
  └─ employees / team_missions / mission_assignments / mission_messages
```

## 2. Verified strengths

- SQL statements use parameterized values in the inspected application routes.
- The Control Plane API is mounted behind authentication and administrator-role middleware before its route handlers.
- Employee APIs identify the employee from the signed session and re-check account state against PostgreSQL.
- Employee password hashes use salted scrypt and temporary passwords are generated server-side.
- XP is calculated from server-side mission reward data and is awarded only during administrator verification.
- Mission assignment uniqueness is enforced by a database constraint; assignment and mission creation use a database transaction.
- Mission review uses a conditional state transition from `SUBMITTED`, preventing a second review from awarding XP again.
- Team messages are scoped to an employee's mission assignment.
- The employee and administrator team UIs escape dynamic text before inserting it into HTML.
- PostgreSQL foreign keys and checks constrain mission status, assignment status and XP range.
- Docker Compose waits for PostgreSQL health before starting the application.
- The application has a database-aware `/ready` health endpoint and graceful SIGTERM/SIGINT shutdown.
- Existing source snapshots and original public/control surfaces are protected by hash-based preservation checks.

## 3. Findings and changes in this audit branch

| Finding | Risk / effect | Change |
|---|---|---|
| A newly created employee could call Team APIs directly before changing the temporary password | First-login policy enforced only by UI | Server-side employee middleware now returns `PASSWORD_CHANGE_REQUIRED` until the password is changed |
| Password reset or password change did not revoke other signed employee cookies | Old sessions could remain usable | Added `auth_version`; login stores its version, protected requests compare it to PostgreSQL, and password change/reset/disable increments it |
| Employee sessions had no server-enforced idle timeout | A replayed signed cookie could outlive intended inactivity | Added 30-minute idle and 8-hour absolute expiry checks |
| State-changing APIs relied mainly on SameSite cookies | Same-site sibling origins and weak browser contexts needed another boundary | Added Fetch Metadata rejection for cross-site requests and mandatory Origin/Referer verification for every state-changing API request |
| Authenticated API responses could be cached by intermediaries or browsers | Sensitive response data could persist in caches | Added `Cache-Control: no-store` to API responses |
| Idle PostgreSQL pool errors had no listener | Background connection failures could become unhandled process errors | Added a pool error listener with structured logging |
| Critical team changes and their audit records were separate writes | A mutation could commit while its audit insert failed | Employee create/status/reset/password change and mission start/submit/message/publish/review now write audit records inside the same transaction |
| Message history selected the oldest 200 rows | Active conversations could stop showing newer messages after 200 posts | Query now selects the newest 200 and displays them chronologically |
| Open mission discussions did not refresh automatically | Teammates could miss new posts until reopening the discussion | Active discussion polls every 8 seconds while the browser tab is visible; polling stops on logout |
| CI referenced mutable action tags | Workflow dependencies could change without a reviewed source change | Checkout and setup-node are pinned to full commit SHAs |

The employee schema update uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; it is additive and does not reset or recreate existing PostgreSQL data.

## 4. Verification added

The CI workflow continues to run:

1. Node syntax checks.
2. Source-preservation and route/invariant checks.
3. Docker Compose configuration validation.
4. Application + PostgreSQL startup and health checks.
5. Admin login and protected Control Plane access.
6. Two-employee account creation and first-login password change.
7. Shared mission assignment and discussion.
8. Submission, administrator verification, and XP accounting.
9. Rejection and resubmission path.
10. Account disable and session invalidation.

This audit branch extends the tests to prove:

- Cross-origin and source-less state-changing API requests are rejected.
- An employee with a temporary password cannot use Team APIs before changing it.
- Password reset invalidates the employee's existing session.
- The new schema, session expiry, authorization, audit transaction and pool-error invariants remain present.

A passing CI run is required before merge. A passing CI run does not replace a post-deployment smoke test against the actual Render service.

## 5. Remaining gaps — do not mark as implemented

### Priority 1 — security and operational controls

1. **Administrator session revocation:** admin sessions still use signed client-side cookies without a server-side session registry or admin auth-version. Changing `ADMIN_PASSWORD` does not immediately revoke every previously issued admin cookie.
2. **MFA / SSO:** the administrator identity boundary is a single environment-provided password. No MFA or organization identity provider is implemented.
3. **Rate-limit durability:** the current rate limiter uses its default in-process store. Limits are not shared across multiple instances and reset on process restart. A shared store and account+IP strategy are future work.
4. **Content Security Policy:** legacy interfaces still require inline scripts and `unsafe-eval`; this broadens the impact of a future XSS flaw. A safe reduction requires extracting/building legacy scripts and styles, then browser regression testing.
5. **Backups and restore:** the application diagnostics correctly report backup status as UNKNOWN. No backup schedule, retention evidence or restore drill is wired into this repository.
6. **Secrets and deployment controls:** production secret rotation, access review and Render environment configuration require a separate authorized operational audit.

### Priority 2 — integration and product completeness

1. **Provider abstraction:** the model registry is catalogue data, not a pluggable inference router. The current AI endpoint is OpenAI-compatible and does not yet implement a provider adapter layer.
2. **Connectors:** connector validation confirms URL syntax and HTTPS only; it does not prove authentication, network reachability, schema compatibility or successful data exchange.
3. **Workspace/Campus/Multiverse synchronization:** these remain isolated browser-side applications. They do not yet share employee identity, server persistence, permissions, activity events or a common object/state model with Team Game.
4. **JARVISER orchestration:** the registry entry does not mean a working orchestrator, task queue, agent runtime or tool-permission system is connected.
5. **Real-time collaboration:** mission discussions use HTTP polling, not WebSockets or server-sent events. Presence, typing state, delivery guarantees and offline conflict resolution are not implemented.
6. **Mission lifecycle:** due dates are displayed but are not enforced by server-side transitions. Mission archive/edit and multi-stage approval flows are not implemented.
7. **Message scale:** history is capped at the newest 200 messages; cursor pagination and retention policy are not implemented.
8. **Dependency reproducibility:** there is no application package lockfile in the inspected paths; Docker currently installs exact direct dependency versions but resolves transitive dependencies during build.
9. **Browser-level quality:** CI is API/integration focused. Playwright coverage, accessibility checks, mobile viewport tests and cross-browser iframe regression tests are not yet present.
10. **Audit operations:** authentication failures, admin session lifecycle, export/retention controls and alerting are not yet a complete security audit trail.

## 6. Recommended next sequence

1. Complete this branch's CI and review its results.
2. Merge only after all checks pass.
3. Give the operator the manual Render deployment instruction; do not deploy automatically.
4. After the operator deploys, verify the deployed commit, `/ready`, public routes, Control Plane login and Team Game flow without creating or changing real employee records.
5. Next hardening pass: admin session store/revocation, persistent rate limiting, backup/restore evidence, and browser-level tests.
6. Integration pass: provider adapter interface, connector health contracts, and an explicit shared identity/state/event contract for Workspace, Campus, Multiverse and Team Game.

## 7. External practices consulted

- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Express Production Best Practices — Security: https://expressjs.com/en/advanced/best-practice-security/
- GitHub Actions Secure Use: https://docs.github.com/en/actions/reference/security/secure-use
- node-postgres Transactions: https://node-postgres.com/features/transactions
- node-postgres Pool error events: https://node-postgres.com/apis/pool
- PostgreSQL Transaction Isolation: https://www.postgresql.org/docs/current/transaction-iso.html
