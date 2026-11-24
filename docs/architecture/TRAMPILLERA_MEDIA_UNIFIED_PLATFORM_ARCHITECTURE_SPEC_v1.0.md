# TRAMPILLERA MEDIA — Unified Platform Architecture Specification v1.0

**Status:** Architecture baseline / implementation contract  
**Date:** 2026-11-23  
**Repository:** `trampillera-mona/trampillera`  
**Deployment baseline:** Single Node.js service on Render + PostgreSQL  
**Scope:** Evolution of the existing TRAMPILLERA MEDIA application without a big-bang rewrite.

## 1. Product definition

TRAMPILLERA MEDIA is an interactive, multimodal portal and connected-world platform:

> Different worlds. Connected perspectives. One network. One world.

It combines editorial media, spatial interfaces, AI-assisted workflows, community participation, and provenance-aware information handling. The product is not to be treated as a static news site or as a collection of unrelated visual demos.

The platform must let independently developed modules interoperate through shared identity, contracts, events, registries, and evidence while retaining their own user experiences and domain logic.

## 2. Architecture principles

1. **Preserve before replacing.** Keep the Intro, 3D FUI, and Classic Portal experiences working while introducing boundaries around them.
2. **Modular monolith first.** Keep one deployable Node.js application and PostgreSQL as the initial production topology. Extract services only when a demonstrated operational or scaling need justifies it.
3. **One identity, multiple experiences.** Shared authentication and authorization must work consistently across Control Plane, community, editorial, and spatial workspaces.
4. **Contracts before integrations.** Every module, provider, connector, workflow, and event must have a documented contract and stable identifier.
5. **Evidence before status.** A visual label is not proof. Every operational result must identify its source, timestamp, and verification method.
6. **No simulated success.** A demo or mock must never report itself as a live security, financial, provenance, or infrastructure result.
7. **Unknown is a valid state.** `UNKNOWN` is neither `PASS` nor `FAIL`; missing evidence must remain visible.
8. **Server authority for shared state.** Balances, permissions, publication state, workflow execution, audit records, and shared world state must not be authoritative in browser storage.
9. **Provider independence.** AI and external integrations must be accessed through replaceable adapters, not provider-specific logic spread through UI components.
10. **Incremental, reversible delivery.** Every implementation step must be small, testable, deployable, and recoverable.

## 3. Current verified baseline

The current repository contains a single Node.js / Express application serving the public portal and authenticated Control Plane. PostgreSQL currently persists:
- `platform_modules`
- `platform_connectors`
- `model_providers`
- `audit_events`

Current API includes public health/status/module endpoints, administrator login/session endpoints, Control Plane CRUD and diagnostics endpoints, and one AI chat endpoint. The server-side AI boundary now defaults to a Qwen Model Studio Chat Completions adapter and supports OpenAI Responses or Chat Completions as an explicitly selected alternative. Provider selection and credentials are server-side environment configuration; this is a two-adapter implementation, not a dynamically extensible provider registry or agent orchestrator.

Current operational facts:
- `/api/health` checks PostgreSQL with `SELECT 1`.
- `/ready` checks database readiness.
- `/api/control/diagnostics` reports runtime, database latency, connection-pool counters, deployment commit when available, and backup status as `UNKNOWN`.
- Connector validation currently validates HTTPS URL syntax and explicitly does not perform an outbound connectivity test.
- The public portal uses browser storage for some preferences and workspace/snapshot state.
- RSS ingestion currently uses an external RSS-to-JSON service and has a preview snapshot fallback.
- Media provenance and security-shield interactions include client-side mock/demo behavior.
- JARVISER contains a local encrypted browser vault and a health probe for a separately configured proxy; neither proves that a server-side multi-agent orchestration runtime exists.
- The current database does not yet contain a TRP ledger, user/member identity tables, media asset registry, workflow execution tables, or a persistent world-state model.

This baseline is derived from repository source. It is not a claim that every external stream, custom domain, or third-party provider is currently reachable.

## 4. Target logical architecture

### 4.1 Experience layer
- Intro Gateway / cinematic entry
- Classic Editorial Portal
- 3D FUI Spatial Workspace
- JARVISER Assistant UI
- Control Plane
- Community / Citizen Desk
- Media Studio
- World Atlas

These are separate experiences over shared platform services, not separate identity silos.

### 4.2 Domain modules
- Editorial & Media
- Intelligence & Verification (LAMINARIA)
- Spatial Worlds & World Atlas
- AI Orchestration (JARVISER)
- Community & Participation
- Economy & Rewards (TRP)
- Security & Provenance
- Operations & Recovery

Each module must declare: stable key, owner, version, lifecycle state, routes, API contracts, permissions, data ownership, emitted/consumed events, dependencies, health probes, and verification criteria.

### 4.3 Shared platform core
- Identity & Access
- Module Registry
- Connector Registry
- AI Provider Registry
- Event / Job Registry
- Audit & Evidence Ledger
- Configuration and Secrets Boundary
- File / Media Asset Registry
- Notification service
- Observability and Recovery

### 4.4 Infrastructure layer
Initial topology:
- Render Node.js web service
- Render PostgreSQL
- GitHub repository and deployment history
- Optional object storage adapter when media persistence is introduced
- Optional background worker when durable queues are introduced

Do not introduce Redis, microservices, Kubernetes, or a separate event broker until a concrete requirement and operational budget exist. PostgreSQL-backed jobs/outbox may be sufficient for the first implementation.

## 5. Module contract

Every module must provide a manifest with at least:

| Field | Requirement |
|---|---|
| `key` | Stable unique identifier, never reused |
| `name` | Human-readable name |
| `version` | Semantic version |
| `lifecycle` | DISCOVERED / INSTALLED / CONFIGURED / ENABLED / DISABLED / DEGRADED / FAILED |
| `description` | Purpose and scope |
| `routes` | UI and API entry points |
| `permissions` | Required capabilities |
| `dependencies` | Other modules/connectors/providers |
| `health` | Probe definition and timeout |
| `evidence` | What proves each claimed capability |
| `data_owner` | Domain that owns writes to its records |

Lifecycle states must not imply runtime health. For example, ENABLED does not mean HEALTHY.

## 6. Status and evidence protocol

Use these distinct execution states:

- `DEMO` — illustrative or client-side simulation; no production effect is claimed.
- `PENDING` — accepted but not yet completed.
- `EXECUTED` — an operation ran and returned a result.
- `VERIFIED` — a separate verification step confirmed the expected outcome.
- `FAILED` — an operation or verification failed with an attributable error.
- `UNKNOWN` — evidence is absent, stale, inaccessible, or inconclusive.

Rules:
- Never promote `EXECUTED` to `VERIFIED` without independent evidence.
- Never label a client-side mock as C2PA-verified, signed, watermarked, secure, or protected.
- A health probe proves only the component and dependency it actually tested.
- Every verification record should include `subject_id`, `check_type`, `status`, `checked_at`, `source`, `evidence_ref`, and optional `expires_at`.
- Preserve failures and unknowns in the audit trail; do not overwrite them with a later green badge.

## 7. Shared data and event model

Introduce domain tables incrementally, with migrations and rollback notes. Proposed domains:

- Identity: users, roles, permissions, sessions or identity-provider mappings.
- Modules: module manifests, versions, lifecycle transitions, dependencies.
- Integrations: connector configurations, credential references, health checks.
- AI: provider adapters, model capabilities, requests, executions, usage and cost records.
- Editorial: sources, feed items, articles, revisions, publication approvals.
- Provenance: media assets, manifests, signatures, verification results, chain of custody.
- Spatial: worlds, scenes, objects, links, revisions, access grants.
- Community: profiles, memberships, contributions, moderation actions.
- Economy: accounts, immutable ledger entries, idempotency keys, reward rules.
- Operations: jobs, job attempts, outbox events, health checks, backup/restore evidence.

Use stable IDs and UTC timestamps. Store secrets outside ordinary domain rows. For ledger-like records, prefer append-only entries and compensating transactions over destructive edits.

Events should use a versioned envelope:
- `event_id`
- `event_type`
- `event_version`
- `occurred_at`
- `actor_id`
- `subject_type`
- `subject_id`
- `correlation_id`
- `payload`

Use a transactional outbox when a database write must reliably trigger asynchronous work.

## 8. API and integration rules

- Keep existing routes stable during the first migration phase.
- New APIs should be versioned under `/api/v1` when the first breaking contract is introduced.
- Validate all inputs server-side; apply rate limits to authentication and costly operations.
- Use explicit timeouts, bounded retries, and idempotency keys for external calls.
- Connector configuration validation and live connectivity testing must be separate operations and separately labelled.
- External content is untrusted input; sanitize HTML and validate media URLs.
- Browser storage may cache preferences and drafts, but must not be the source of truth for shared or financial state.
- WebSocket/realtime support is not assumed; the current release reports HTTP API only.

## 9. Identity, authorization, and security

- Keep administrator access protected and never expose secrets to the browser.
- Introduce role-based permissions before opening community or editorial workflows to additional users.
- Use secure cookies in HTTPS production and trust only the known ingress proxy.
- Add CSRF protection appropriate to the chosen cookie/session model before introducing state-changing browser APIs for multiple user roles.
- Apply least privilege to database and external provider credentials.
- Record security-sensitive actions in the audit ledger without logging passwords, session cookies, API keys, or raw secrets.
- Treat C2PA, watermarking, honeytokens, and vault features as unavailable until server-side or cryptographic verification is implemented and tested.

## 10. AI provider and agent architecture

JARVISER must use a provider adapter interface. The UI must not call vendor APIs directly or store provider secrets in browser storage as the production credential source.

Initial provider strategy: Qwen-compatible Chat Completions is the default adapter. OpenAI Responses and Chat Completions are supported as an explicitly selected alternative. Provider selection must remain configuration-driven and replaceable; additional providers require a new adapter and contract tests.

Minimum provider contract:
- `provider_key`
- `base_url`
- secret reference
- supported models and modalities
- request/response adapter
- timeout and retry policy
- capability declaration
- health-check method
- usage/cost extraction where available

Agent execution must record workflow ID, stage, model/provider, input/output references, status, timestamps, retries, cost/usage, and human approvals. Triage → Analysis → Synthesis is a workflow template, not proof that three independent agents executed.

## 11. Recovery and operations

The System Health & Recovery Desk must distinguish:
- application liveness;
- database readiness;
- module health;
- connector configuration;
- live connector reachability;
- provider reachability;
- queue/job health;
- deployment identity;
- backup existence;
- restore-test evidence.

Backup status remains `UNKNOWN` until a backup is identified and a restore test is completed and recorded. A successful deploy is not a backup and is not a recovery point.

Every release must include:
1. Git commit identity.
2. Static checks and tests.
3. Deployment result.
4. Post-deploy smoke tests.
5. Database migration result, if any.
6. Rollback/recovery instructions.
7. Explicit list of checks not performed.

## 12. Delivery roadmap

### Phase 0 — Baseline and evidence
- Maintain the module inventory and classify each capability.
- Preserve existing UI and routes.
- Establish reproducible smoke tests and release evidence.
- Confirm backup and restore procedure outside the application.

### Phase 1 — Platform foundation
- Improve System Health & Recovery Desk.
- Formalize module manifests and lifecycle states.
- Add role/permission groundwork.
- Add structured verification records and audit correlation IDs.
- Add migrations and deployment checks.

### Phase 2 — JARVISER provider adapters
- Extend the provider interface with additional adapters, health probes and capability declarations.
- Add durable execution traces, usage/cost records and explicit human approval points.
- Add real provider health checks, execution traces, usage records, and job handling.
- Keep browser vault explicitly local/personal until a reviewed server-side secrets design exists.

### Phase 3 — Editorial intelligence
- Replace browser-side RSS proxy dependency with controlled server-side ingestion.
- Add editorial sources, articles, review workflow, source records, and LAMINARIA evidence graph.
- Implement real provenance verification before showing verified claims.

### Phase 4 — Spatial and community state
- Introduce persistent World Registry and spatial object identity.
- Synchronize shared scenes through authenticated APIs.
- Add community identity, membership, moderation, and contributions.

### Phase 5 — TRP ledger
- Implement immutable, transactional ledger with idempotency.
- Add server-side reward rules and auditability.
- Keep TRP as non-cash platform points unless a separate legal and financial review authorizes anything else.

## 13. Acceptance criteria

A feature is not complete merely because its screen exists. It is accepted only when:
- its module contract is documented;
- server-side behavior exists where shared state or authority is required;
- permissions and validation are tested;
- errors and unknown states are visible;
- audit evidence is recorded where appropriate;
- automated checks pass;
- a deployed smoke test confirms the intended behavior;
- documentation states what remains unverified.

## 14. Explicit non-goals for v1.0

- No big-bang rewrite of the public portal.
- No immediate microservice split.
- No claim that every visual module is already operational.
- No real-money TRP or financial instrument.
- No production C2PA/security certification based on current client-side mock behavior.
- No promise of backup recoverability without a successful restore test.

## 15. Change control

This document is the architecture baseline. Any implementation that changes identity, data ownership, API contracts, security boundaries, ledger semantics, or module lifecycle must update this specification and the module inventory in the same change set.

**Governing rule:** Interface claims must never exceed verified system capabilities.
