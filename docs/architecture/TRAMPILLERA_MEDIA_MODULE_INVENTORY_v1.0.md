# TRAMPILLERA MEDIA — Module Inventory and Capability Map v1.0

**Status:** Source-based baseline  
**Date:** 2026-11-23  
**Repository:** `trampillera-mona/trampillera`  
**Reviewed paths:** `README.md`, `app/server.js`, `app/public/index.html`, `app/public/control/index.html`

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
| Multiverse / world registry | NOT IMPLEMENTED | No persistent worlds/scenes/objects schema or corresponding API was found. | Add World Registry after platform identity and module contracts. |

## 4. AI and automation

| Module / experience | Current status | Source evidence / current boundary | Recommended next action |
|---|---|---|---|
| JARVISER assistant UI | PARTIAL | Assistant UI, model cards, roles, logs, and triage/analysis/synthesis concepts exist. | Separate interface from execution engine; show actual run IDs and stages. |
| AI server endpoint | PARTIAL | `POST /api/control/ai/chat` uses `OPENAI_API_KEY`, optional `OPENAI_API_URL`, and `OPENAI_MODEL`; one request/response path. | Introduce provider adapter interface; Qwen-compatible adapter first, then other providers. |
| Multi-provider registry | PARTIAL | PostgreSQL `model_providers` table and Control Plane CRUD exist; registry records do not by themselves execute providers. | Connect provider records to adapters and live health checks. |
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
| Platform status API | REAL (limited scope) | `GET /api/platform/status` returns registry counts and Control Plane availability. | Avoid returning generic `operational` if module/provider checks are not performed. |
| Public module inventory API | REAL | `GET /api/modules` reads PostgreSQL module rows. | Add manifest version, dependencies, health, and evidence fields. |
| Control Plane authentication | REAL | Session-cookie login, `/api/auth/me`, logout, and protected `/api/control/*` routes exist. | Preserve; add roles, CSRF review, session tests, and security regression tests. |
| Authentication diagnostics | REAL (limited scope) | `GET /api/auth/diagnostics` reports request/session/cookie configuration without exposing cookie contents. | Keep restricted details minimal; add regression test for secure cookie behavior. |
| Control Plane modules | REAL (registry CRUD) | Authenticated module listing, registration, and lifecycle route exist. | Enforce lifecycle transition rules and health/evidence separation. |
| Control Plane connectors | PARTIAL | Connector records and HTTPS syntax validation exist; validation explicitly makes no outbound request. | Add separate live connectivity probe with timeout and safe egress policy. |
| Control Plane model providers | PARTIAL | Provider records can be registered; registration does not establish executable adapter support. | Bind provider records to adapter capabilities and probe results. |
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
