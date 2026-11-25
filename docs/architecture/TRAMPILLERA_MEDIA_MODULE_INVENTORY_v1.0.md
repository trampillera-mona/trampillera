# TRAMPILLERA MEDIA — Module Inventory and Capability Map v1.0

**Status:** Source-based baseline  
**Date:** 2026-11-23  
**Repository:** `trampillera-mona/trampillera`  
**Reviewed paths:** `README.md`, `app/server.js`, `app/public/index.html`, `app/public/control/index.html`, `app/public/community/index.html`, `app/public/registry/index.html`, and all live `app/public/city/*` module pages

## 1. Status legend

| Status | Meaning |
|---|---|
| **REAL** | A working implementation exists in the repository and performs the stated scope. External availability may still be unverified. |
| **PARTIAL** | A working subset exists, but the full product capability is not implemented. |
| **DEMO** | UI or client-side simulation exists; it must not be represented as a production operation. |
| **NOT IMPLEMENTED** | No implementation was found in the reviewed source. |
| **UNKNOWN** | Source inspection does not establish the runtime or external state. |

A module may contain more than one status. Status describes capability, not visual polish or lifecycle labels in the database.

## 2. Executive summary

The repository is a single deployable Node.js application with a public portal, authenticated Control Plane, shared HTTP API, and PostgreSQL registries. The current database tables are `platform_modules`, `platform_connectors`, `model_providers`, and `audit_events`.

The current architecture is a **modular monolith in deployment**, but the public portal's large HTML/JavaScript file still contains many tightly coupled client-side features. The Control Plane is more server-backed than several public-facing modules.

## 3. Experience and product modules

| Module / experience | Current status | Source evidence / current boundary | Recommended next action |
|---|---|---|---|
| Intro / cinematic gateway | PARTIAL | Intro and realm navigation code exist; runtime media/render behavior requires browser smoke testing. | Preserve; add measured load/error state and accessible fallback. |
| Realm router / mode switcher | REAL | `RealmRouter` and realm-switch logic exist in the public app. | Add route/deep-link tests and state restoration. |
| Classic editorial portal | PARTIAL | Editorial sections, category UI, ticker, and article rendering exist. | Separate feed ingestion, editorial records, and presentation. |
| RSS / Atom ingestion | PARTIAL | Browser calls `api.rss2json.com`; preview snapshot is used when live feeds fail. | Build controlled server-side ingestion, caching, source health, and attribution. |
| Radio player | PARTIAL | Audio player and sample stream controls exist. | Verify real stream reachability, codec support, CORS, and failure states. |
| TV / video player | PARTIAL | HTML5/HLS/YouTube-related UI and media functions exist; sample HLS source is external. | Add explicit source type, stream health, captions, and playback telemetry. |
| 3D Globe / regional hubs | PARTIAL | Globe/spatial visualization concepts are present in the public app. | Add persistent node identity, geographic data provenance, and server-backed hub records. |
| 3D FUI spatial constructor | PARTIAL | Three.js scene, hex/saucer geometry, spatial windows, drag/resize, and linking functions exist. | Preserve UI; define World/Scene/Object contracts and persistence API. |
| Neocube / magnetize mechanic | PARTIAL | Interaction functions such as `toggleNeocubeMode` and saucer-click handling exist. | Add interaction tests and document the actual state model. |
| Spatial workspace persistence | PARTIAL | Workspace state uses browser storage; this is not shared server-side state. | Keep local drafts; add server-backed named workspaces and revisions. |
| Multiverse / world registry | NOT IMPLEMENTED | Corporate Multiverse is a rich browser application, but its scene/UI and XP/visit state use IndexedDB/localStorage; no server API or shared identity integration was found. | Add World Registry after platform identity and module contracts. |
| ITY CITY launcher | PARTIAL | Same-origin iframe shell; now labels Workspace/Campus/Multiverse as local prototypes and Team Game as server-backed. | Add a shared module manifest, identity handoff and versioned navigation contract. |
| Corporate Workspace | DEMO / PARTIAL | XP and widget layout use browser `localStorage`; no employee API or server persistence. | Add authenticated per-employee workspace records and revisioned save/load API. |
| Corporate Campus | DEMO / PARTIAL | Scene and UI layout use browser `localStorage`; event log uses browser IndexedDB. No server API or shared identity. | Define common world/scene/object schema and explicit server persistence boundary. |
| Community Distribution `/community/` | REAL (static information page) | Static policy, license and GitHub contribution links; no member identity or community backend. | Keep page as documentation surface; build membership and moderation as separate backend domains. |
| Community Registry `/registry/` | REAL (static directory) | Static sample directory; submission opens a GitHub issue template. No PostgreSQL listing or moderation workflow. | Add a reviewed listing workflow only after identity, moderation and provenance contracts exist. |

## 4. AI and automation

| Module / experience | Current status | Source evidence / current boundary | Recommended next action |
|---|---|---|---|
| JARVISER assistant UI | PARTIAL | Assistant UI, model cards, roles, logs, and triage/analysis/synthesis concepts exist. | Separate interface from execution engine; show actual run IDs and stages. |
| AI server endpoint | PARTIAL | `app/ai-provider.js` isolates Qwen Model Studio Chat Completions and OpenAI Responses / Chat Completions adapters; `POST /api/control/ai/chat` uses the module. Keys remain server-side; requests are time-bounded/rate-limited and pure adapter contracts have unit tests. | Add live provider health checks, durable execution traces, usage/cost accounting and conversation state. |
| Multi-provider registry | PARTIAL | PostgreSQL `model_providers` table and Control Plane CRUD exist; Qwen is seeded in the catalogue, but registry records do not dynamically load or execute adapters. | Connect provider records to adapter capabilities and separately evidenced live health checks. |
| Multi-agent orchestration | DEMO / NOT IMPLEMENTED | Three-stage pipeline is represented in UI; no durable workflow/job execution engine was found. | Implement task records, stages, queue, retries, approvals, and execution trace. |
| Local Ollama / FastAPI proxy | PARTIAL | Browser-side configurable proxy health probe exists. | Treat probe as reachability only; add authenticated server-side adapter if required. |
| JARVISER encrypted vault | PARTIAL | Browser CryptoVault encrypts locally and stores data in localStorage. | Keep explicitly local; do not treat as server secret management. Design a separate server-side secrets boundary if needed. |
| Usage / token / cost ledger | NOT IMPLEMENTED | No durable AI usage/cost table or provider accounting was found. | Add request-level usage records where providers expose usage data. |

## 5. Intelligence, security, and provenance

| Module / experience | Current status | Source evidence / current boundary | Recommended next action |
|---|---|---|---|
| Security Shield UI | DEMO | `SecurityShield.runAudit()` returns a timed success message without a backend audit. | Replace with real checks or label as demo; never show a false pass. |
| Honeytoken behavior | DEMO | `triggerTrap()` shows a toast; no server-side canary event was found in the reviewed implementation. | Implement unique canary tokens, server-side event capture, and alert evidence. |
| Watermarking | DEMO / UNKNOWN | UI references watermark protection; no verified production watermarking pipeline was established. | Define watermark method, test vectors, and detection evidence. |
| C2PA provenance | DEMO / UNKNOWN | Media analysis labels itself as a client-side C2PA mock. | Integrate a real manifest/signature verifier and show per-asset results. |
| MediaIntel file analysis | DEMO | Browser file handler uses object URLs, metadata, and a delayed mock result; it sets a mock provenance label. | Separate metadata extraction from authenticity verification. |
| LAMINARIA Intelligence Desk | NOT IMPLEMENTED | No dedicated backend domain model or workflow for fact verification, corporate intelligence, or editorial evidence graph was found. | Design as a domain module over sources, claims, evidence, and review decisions. |

## 6. Community and economy

| Module / experience | Current status | Source evidence / current boundary | Recommended next action |
|---|---|---|---|
| Community Hub registry entry | REAL (registry only) | A `community.hub` module row is seeded in PostgreSQL. | Do not interpret registry presence as a working community product. |
| Community accounts / membership | NOT IMPLEMENTED | No user/member identity schema or membership API was found in the current database setup. | Add identity, roles, memberships, moderation, and consent model. |
| Citizen field notes / contributions | DEMO / PARTIAL | Concepts and UI references exist; no verified server-backed contribution workflow was found. | Create submission, review, attribution, and audit workflow. |
| TRP balance / XP | DEMO | Client-side state is used for points/XP interactions; no authoritative ledger table or API exists. | Build immutable PostgreSQL ledger with idempotent transactions. |
| Gifts / rewards | DEMO / NOT IMPLEMENTED | UI concepts exist; no durable reward transaction system was found. | Implement after identity and ledger foundations. |
| DAO / voting references | DEMO / NOT IMPLEMENTED | Sample editorial content references a proposal and DAO synchronization; no governance execution backend was found. | Treat as narrative/demo until a real proposal and voting contract exists. |

## 7. Platform core and operations

| Module / capability | Current status | Source evidence / current boundary | Recommended next action |
|---|---|---|---|
| Public platform health | REAL (limited scope) | `GET /api/health` checks PostgreSQL with `SELECT 1`. | Keep scope explicit: app route + database query only. |
| Readiness endpoint | REAL (limited scope) | `GET /ready` checks database query. | Add deployment orchestration semantics only if needed. |
| Platform status API | REAL (limited scope) | `GET /api/platform/status` reports application/PostgreSQL registry availability and returns `UNKNOWN` for unprobed external integrations, connector reachability and provider reachability. | Add explicit health probes with timestamps, timeouts and attributable evidence; do not promote catalogue state to runtime health. |
| Public module inventory API | REAL | `GET /api/modules` reads PostgreSQL module rows. | Add manifest version, dependencies, health, and evidence fields. |
| Control Plane authentication | REAL | Admin and employee roles use signed session cookies; administrator and employee auth versions revoke stale sessions; protected `/api/control/*` and `/api/team/*` routes enforce their respective boundaries. | Add MFA/SSO and a fine-grained organization permission matrix. |
| Authentication diagnostics | REAL (limited scope) | `GET /api/auth/diagnostics` reports request/session/cookie configuration without exposing cookie contents. | Keep restricted details minimal; add regression test for secure cookie behavior. |
| Control Plane modules | REAL (registry CRUD) | Authenticated module listing/registration plus explicit DISCOVERED → INSTALLED → CONFIGURED → DISABLED → INSTALLED transitions. Each transition requires a note and writes its audit record in the same transaction; this remains registry state, not runtime health. | Add separate module runtime probes with timestamps and evidence references. |
| Control Plane connectors | PARTIAL | Connector records and HTTPS syntax validation exist; validation explicitly makes no outbound request. | Add separate live connectivity probe with timeout and safe egress policy. |
| Control Plane model providers | PARTIAL | Qwen and OpenAI server adapters exist, but registry records do not dynamically load adapters or prove provider configuration/reachability. | Bind provider records to adapter capabilities and timestamped probe results. |
| Audit events | REAL (basic) | PostgreSQL `audit_events` table records selected actions. | Add actor identity, correlation IDs, structured JSON details, retention, and append-only controls. |
| System diagnostics | PARTIAL | Runtime, DB latency, pool counters, commit identity, and backup UNKNOWN are reported. | Add module/connector/provider checks and evidence references. |
| Backup / restore verification | UNKNOWN | Diagnostics explicitly state no backup or restore verification is available to the application. | Verify Render backup/export process and perform a documented restore test. |
| Deployment identity | PARTIAL | Diagnostics reads `RENDER_GIT_COMMIT` if available. | Record commit, deploy event, smoke test, and rollback target together. |
| WebSocket / realtime | NOT IMPLEMENTED | Settings endpoint explicitly reports HTTP API; WebSocket integration is not enabled. | Use polling initially; introduce realtime only for a defined workflow. |
| Background job queue | NOT IMPLEMENTED | No durable queue/worker implementation was found. | Add PostgreSQL-backed jobs/outbox first if async tasks become necessary. |

## 8. Current server API map

| Route | Access | Current scope |
|---|---|---|
| `GET /api/health` | Public | PostgreSQL query health |
| `GET /api/platform/status` | Public | Registry counts and Control Plane availability |
| `GET /api/modules` | Public | Module registry |
| `GET /api/auth/diagnostics` | Public in current code | Request/session cookie diagnostics |
| `POST /api/auth/login` | Public | Administrator login |
| `GET /api/auth/me` | Public | Current session state |
| `POST /api/auth/logout` | Public | Session logout |
| `GET /api/control/overview` | Admin session | Registry/audit counts |
| `GET/POST /api/control/modules` | Admin session | Module registry |
| `POST /api/control/modules/:key/lifecycle` | Admin session | Module lifecycle update |
| `GET/POST /api/control/connectors` | Admin session | Connector registry |
| `POST /api/control/connectors/:key/validate` | Admin session | HTTPS syntax validation only |
| `GET/POST /api/control/models` | Admin session | Model-provider registry |
| `GET /api/control/audit` | Admin session | Audit events |
| `GET /api/control/settings` | Admin session | Runtime configuration summary |
| `GET /api/control/diagnostics` | Admin session | Runtime/database/deployment/backup diagnostics |
| `POST /api/control/ai/chat` | Admin session | Single configured OpenAI-compatible chat request |
| `GET /ready` | Public | Database readiness |

## 9. Immediate implementation priorities

1. **P0 — Truthful status and evidence:** remove false-success behavior from Security Shield and MediaIntel; introduce explicit DEMO/EXECUTED/VERIFIED/FAILED/UNKNOWN labels.
2. **P0 — Recovery evidence:** establish backup inventory, backup procedure, and a successful restore test; keep application status UNKNOWN until evidence exists.
3. **P1 — Module manifests:** formalize module identity, lifecycle, dependencies, permissions, health probes, and verification.
4. **P1 — JARVISER provider adapters:** implement provider-neutral execution, beginning with Qwen-compatible integration; keep provider secrets server-side.
5. **P1 — Server-side RSS ingestion:** replace public browser proxy dependency with server-side ingestion and caching.
6. **P2 — Identity and community:** introduce users, roles, memberships, and moderation before community features become authoritative.
7. **P2 — World Registry:** persistent worlds, scenes, objects, revisions, and access grants.
8. **P3 — TRP ledger:** immutable transactional ledger and reward rules after identity and audit foundations.

## 10. Verification checklist for each module

- [ ] UI entry point exists and is reachable.
- [ ] Server/API contract exists where required.
- [ ] Data ownership and persistence are documented.
- [ ] Permissions are enforced server-side.
- [ ] External dependencies are identified.
- [ ] Demo behavior is visibly labelled.
- [ ] Errors and unknown states are represented honestly.
- [ ] Audit/evidence record exists for consequential actions.
- [ ] Automated tests cover success and failure.
- [ ] Deployed smoke test confirms the intended capability.

## 11. Review boundary

This inventory reflects source inspection of the listed repository paths on 2026-11-23. It does not prove that Render is currently healthy, that the custom domain resolves, that external media streams are reachable, that third-party credentials are configured, or that backups are restorable. Those require separate runtime checks and evidence.


## 12. Implementation delta — System Health & Recovery Desk v0.1

The feature branch `feature/system-health-module-registry-v0.1` adds a read-only Control Plane Diagnostics experience with:
- Application/database health endpoint check.
- Database readiness endpoint check.
- Current administrator session check through `/api/auth/me`.
- Safe cookie/session configuration check through `/api/auth/diagnostics`; cookie contents and secrets are never displayed.
- Existing Control Plane settings and runtime diagnostics checks.
- Timestamp for each diagnostic run.
- Live display of persisted module registry records with an explicit warning that registry lifecycle is not runtime health.
- Recovery checklist entries for backup inventory, restore test, and rollback target, all remaining `UNKNOWN` until evidence is recorded.

This is a **PARTIAL** operational desk, not a full observability or recovery system. It does not inspect Render backup inventory, execute restore operations, probe external connectors, run AI inference, test radio/video streams, or perform deployment rollback. No database schema or server API changes are introduced by this feature branch.


## 13. Implementation delta — 2026-11-25 source baseline

This dated addendum preserves the original 2026-11-23 source-based classifications above. It records later changes visible in the current `main` history; it does not silently convert a PARTIAL capability into a fully operational product.

### 13.1 Verified source changes

| Area | Current source-level status | Evidence / boundary |
|---|---|---|
| Administrator session revocation | REAL (implemented control) | PostgreSQL-backed auth version and HMAC fingerprint of configured admin password; old admin sessions are rejected after credential rotation. |
| Employee session lifecycle | REAL (bounded implementation) | Server-side password-change enforcement, idle/absolute expiry and auth-version checks; not a full identity provider or SSO. |
| State-changing request origin | REAL (implemented control) | Fetch Metadata and Origin/Referer checks reject cross-site and source-less state-changing requests. |
| Team Game | PARTIAL / implemented bounded workflow | Server-backed employee accounts, missions, assignments, discussion polling, submissions and administrator-verified XP; not a complete HR or realtime collaboration suite. |
| Module lifecycle | REAL (audited transitions) | Explicit allowed transitions, required operator note, row lock and transactional audit event. Lifecycle status is not runtime health. |
| AI provider adapter | PARTIAL | Qwen Model Studio default adapter and explicitly selected OpenAI adapter; single-turn chat only. No durable multi-agent runtime, dynamic plugin loader, or universal model connectivity. |
| Language controls | PARTIAL | Twelve declared locales and shared language controls/vocabulary are covered by automated tests. Full UI translation remains incomplete. |
| Voice controls | PARTIAL | Browser-native speech APIs, locale selection, shared controls and microphone permission boundary. Recognition/TTS availability remains browser/OS/device-dependent; no server-side ASR/TTS. |
| Audience measurement | REAL (opt-in bounded analytics) | Consent-gated pseudonymous first-party token, HMAC-derived server identifier, aggregate visitor/page-view reporting. No raw IP or full referrer URL in analytics tables. |
| Audience Growth Desk | REAL (bounded campaign workflow) | Authenticated reporting and campaign create/pause/activate; tracked redirect records clicks and applies UTM campaign/source/medium attribution. No ad buying, newsletter sending, content publishing, or conversion guarantee. |
| Operations / diagnostics | PARTIAL | Health/readiness, database diagnostics, deployment identity and recovery checklist surfaces exist; no automated Render backup discovery or restore execution. |

### 13.2 Updated route additions

The current README documents these additions to the application surface:

- `GET /api/analytics/counter` — aggregate public visitor and page-view counters.
- `GET /control/growth/` — authenticated Audience Intelligence & Growth Desk.
- `/go/:slug` — tracked campaign redirect with UTM attribution.
- `/api/control/*` — authenticated management API.

### 13.3 Verification boundary

The repository workflow contains automated checks for source syntax, provider adapter contracts, source preservation, locale/voice vocabulary, Docker Compose configuration, PostgreSQL-backed application startup, analytics/campaign behavior, and selected session/origin/lifecycle invariants.

These tests establish the tested source and CI behaviors only. They do not prove:
- all twelve locales translate every screen;
- voice recognition works on every browser/device;
- every AI model is configured or reachable;
- JARVISER has a durable multi-agent runtime;
- external RSS, radio, TV, connector or spatial data sources are healthy;
- C2PA, watermarking, Honeytokens or Security Shield provide verified production protection;
- Render is running this exact source commit;
- database backups can be restored.

For the current dated operational snapshot, see [Release Baseline, Recovery Point & Deployment Readiness — 2026-11-25](audit/TRAMPILLERA_RELEASE_BASELINE_AND_RECOVERY_2026-11-25.md).


## 14. Proposed module — TRAMPILLERA Communications (2026-11-25)

| Module / experience | Current status | Architecture boundary | Recommended next action |
|---|---|---|---|
| TRAMPILLERA Communications | NOT IMPLEMENTED | Architecture proposal is documented in [Communications & Collaboration Architecture Specification v0.1](../communications/TRAMPILLERA_COMMUNICATIONS_AND_COLLABORATION_ARCHITECTURE_v0.1.md). No production messaging server, E2EE key service, realtime transport, WebRTC SFU, TURN service, meeting API, or secure file exchange is claimed. | Stage 0 proof of concept: evaluate a private Matrix-based messaging deployment and a separately hosted WebRTC SFU/TURN candidate; validate message and media E2EE, identity integration, browser support, hosting cost, and recovery before implementation. |

The proposed module is intended to integrate with the existing employee identity/session model, Control Plane, Operations Desk, notifications, audit and future calendar/workflow domains. Its security contract explicitly separates transport encryption from end-to-end encryption and forbids logging message content or media as ordinary audit metadata. The proposal does not authorize recording or hidden employee-content monitoring.

