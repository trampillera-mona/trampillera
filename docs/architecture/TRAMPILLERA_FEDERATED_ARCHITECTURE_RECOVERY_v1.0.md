# TRAMPILLERA — Federated Modular Architecture Recovery & Conformance Specification v1.0

**Document ID:** TRP-ARCH-FED-001  
**Status:** Proposed target architecture; implementation conformance baseline  
**Date:** 2026-11-24  
**Repository:** `trampillera-mona/trampillera`  
**Branch:** `architecture/federated-modules-recovery`  
**Production impact:** None. Documentation-only change; no Render, database, secret, or deployment operation.

## 1. Purpose and governing decision

This document restores and makes enforceable the intended TRAMPILLERA architecture: a **federated ecosystem of independently bounded modules, connected through explicit bridges and coordinated by JARVISER**.

TRAMPILLERA is not intended to become one application whose internal screens happen to have different names. Nor does federation require an immediate fleet of microservices. Logical architecture, integration contracts, runtime topology, and deployment packaging are separate decisions and MUST be recorded separately.

The governing principle is:

> Modules remain independent. Bridges make them interoperable. JARVISER coordinates work without owning every module.

The platform MUST preserve module autonomy, explicit ownership, replaceable integrations, evidence-based execution, and reversible evolution. Shared infrastructure is permitted only where it does not erase module boundaries or transfer domain ownership implicitly.

### 1.1 Decision hierarchy

If documents conflict, apply this hierarchy until a formally reviewed architecture decision record (ADR) supersedes it:

1. This specification defines the target logical architecture and conformance requirements.
2. Module contracts define each module's ownership, interface, permissions, and lifecycle.
3. Bridge contracts define cross-module communication and trust boundaries.
4. JARVISER contracts define orchestration and execution behavior.
5. Deployment topology documents where processes run; it MUST NOT redefine logical ownership.
6. UI documents define presentation and interaction, not backend authority.

The 2026-11-23 v1.0 architecture document's phrase **"Modular monolith first"** is treated here as a historical deployment recommendation, not as authorization to collapse the logical architecture into one tightly coupled application. Its valid intent—incremental delivery, preserving existing behavior, avoiding premature infrastructure—remains in force. The logical target in this document is more specific and governs future implementation.

## 2. Architecture principles

1. **Federated autonomy:** every domain module has a bounded responsibility, stable identity, declared owner, and versioned contract.
2. **Interoperability by bridges:** modules communicate through explicit API, event, identity, data-exchange, provider, or engine bridges.
3. **Orchestration without ownership:** JARVISER coordinates tasks and selects capabilities; it does not become the data owner or mandatory runtime for every module.
4. **No hidden coupling:** direct cross-module database writes, shared mutable browser globals, implicit route dependencies, and undocumented provider calls are prohibited.
5. **Contracts before execution:** an integration is not active until its contract, permissions, timeout, error model, and verification method are defined.
6. **Evidence before status:** DISCOVERED, CONFIGURED, ENABLED, HEALTHY, EXECUTED, and VERIFIED are distinct facts.
7. **No simulated success:** UI feedback, registry entries, mock adapters, and accepted requests are not proof of completed execution.
8. **Independent evolution:** modules can be upgraded, disabled, replaced, or extracted without rewriting unrelated modules, subject to declared compatibility.
9. **Replaceable infrastructure:** a bridge can change transport (in-process, HTTP, queue, or another supported mechanism) without changing the domain meaning of the contract.
10. **Human authority:** consequential actions may require human approval; orchestration MUST preserve approval, policy, and audit boundaries.
11. **Failure containment:** a module or provider failure MUST NOT silently corrupt another module's state.
12. **Incremental migration:** existing routes and experiences are preserved while boundaries are introduced and verified.

## 3. Logical architecture

```text
                    PEOPLE / OPERATORS / EXTERNAL SYSTEMS
                                  |
                     Experience & Access Interfaces
       +----------------+----------------+----------------------+
       | Control Plane  | ITY CITY       | TRAMPILLERA MEDIA    |
       | Team Workspace | World/Scene UI | Community / Desks    |
       +----------------+----------------+----------------------+
                                  |
                   Identity & Policy Boundary
                                  |
             +------------------------------------------+
             |       FEDERATED INTEGRATION FABRIC       |
             |                                          |
             | API Bridge | Event Bridge | Data Bridge  |
             | Identity Bridge | Provider Bridge        |
             | Engine Bridge | Evidence Bridge          |
             +------------------------------------------+
                 |             |              |
        +--------+----+  +-----+------+  +----+-----------+
        | Domain      |  | JARVISER   |  | Engine &       |
        | Modules     |  | Orchestr.  |  | Provider       |
        |             |  |            |  | Ecosystem      |
        | Workspace   |  | Planner    |  | Qwen adapter   |
        | Campus      |  | Router     |  | OpenAI adapter |
        | Multiverse  |  | Scheduler  |  | GIS/3D engines |
        | Team Game   |  | Policy gate|  | external tools |
        | Media       |  | Run ledger |  | connectors     |
        | LAMINARIA   |  |            |  |                |
        +-------------+  +------------+  +----------------+
                 |             |              |
        +-------------------------------------------------+
        | Module-owned stores / shared platform services |
        | Audit & Evidence | Observability | Asset refs   |
        | Durable jobs/outbox where justified             |
        +-------------------------------------------------+
```

The diagram describes logical responsibilities, not a mandated process count. Components MAY initially share a host or database infrastructure, but MUST retain explicit API boundaries, domain ownership, and authorization checks.

### 3.1 Architectural planes

| Plane | Responsibility | Must not become |
|---|---|---|
| Experience | User-facing workspaces and navigation | Source of authority for shared state |
| Identity & Policy | Authentication, subject identity, permissions, approvals | A module-specific UI flag |
| Federation / Bridges | Protocol translation, routing, validation, correlation | A shared untyped data bucket |
| Domain Modules | Own domain rules, records, and lifecycle | A collection of screens with no backend contract |
| JARVISER | Task planning, capability selection, orchestration, execution trace | Owner of all domain data or a mandatory dependency for simple module operations |
| Provider & Engine Ecosystem | AI models, tools, GIS/3D engines, external connectors | Hard-coded vendor dependencies |
| Evidence & Operations | Audit, provenance, health, observability, recovery | A green badge without attributable evidence |

## 4. Module autonomy contract

A module is an independently bounded capability, not merely a navigation item. Every production-capable module MUST publish a versioned manifest and meet the following requirements.

### 4.1 Required manifest

```yaml
apiVersion: trampillera.io/module/v1
kind: ModuleManifest
metadata:
  key: example.domain
  name: Example Domain
  version: 0.1.0
  owner: domain-team
spec:
  purpose: Owns one bounded business or technical capability.
  lifecycle: DISCOVERED
  interfaces:
    ui:
      routes: []
    api:
      contract: contracts/example-domain.openapi.yaml
      version: v1
    events:
      publishes: []
      subscribes: []
  permissions:
    required: []
    exposed: []
  data:
    ownership: module
    stores: []
    publicReferences: []
  dependencies:
    modules: []
    providers: []
    engines: []
  health:
    liveness: null
    readiness: null
    timeoutMs: 3000
  execution:
    idempotency: required-for-mutations
    correlation: required
  evidence:
    acceptanceChecks: []
    verificationPolicy: explicit
```

This is an illustrative contract shape, not a claim that a manifest loader already exists. A future JSON Schema MUST validate the manifest in CI.

### 4.2 Autonomy requirements

A module MUST:
- own its domain invariants and authorize its own mutations;
- expose only documented interfaces to other modules;
- declare data ownership and avoid foreign writes into another module's tables;
- declare permissions and validate them server-side;
- expose lifecycle and health separately;
- publish compatibility/version information;
- identify its dependencies and behavior when each is unavailable;
- emit correlation IDs and attributable execution/evidence references;
- support disablement or degraded mode without silently deleting its data;
- provide migration and rollback notes for schema changes.

A module MAY use shared identity, common UI components, a common event transport, shared PostgreSQL infrastructure, or a common gateway. Such sharing MUST be implemented as a platform service or bridge, not as undocumented domain coupling.

## 5. Bridge architecture

A bridge is a governed integration boundary between independently owned capabilities. Every bridge MUST define source, destination, protocol, contract version, trust model, permissions, data classification, timeout, retry policy, idempotency behavior, error mapping, correlation, and verification.

### 5.1 Bridge catalogue

| Bridge | Purpose | Required contract | Current repository evidence |
|---|---|---|---|
| API Bridge | Synchronous request/response between modules | OpenAPI or equivalent, auth scopes, versioning, error schema | Shared Express routes exist; cross-module API contracts are not yet demonstrated |
| Event Bridge | Publish/subscribe domain events | Versioned event envelope, delivery semantics, deduplication | No durable event bus/outbox verified in current audit |
| Identity Bridge | Carry authenticated subject and scoped claims | Subject, issuer, audience, expiry, scopes, delegation rules | Admin/employee sessions exist; common identity handoff across all modules is not verified |
| Data Exchange Bridge | Exchange references or validated DTOs | Schema, provenance, ownership, classification, consent | No general module-to-module exchange contract verified |
| AI Provider Bridge | Invoke replaceable model/provider adapters | Provider capability, request/response, timeout, usage, policy | Qwen/OpenAI adapters exist; dynamic registry-driven dispatch is not verified |
| Engine Bridge | Invoke GIS/3D/simulation/rendering engines | Engine manifest, inputs/outputs, resource limits, artifact references | Engine registry/runtime integration not verified |
| Evidence Bridge | Attach audit/evidence to actions and outcomes | Evidence envelope, source, timestamp, verifier, retention | Basic audit events exist; platform-wide correlation/evidence bridge not verified |
| UI/Embedding Bridge | Embed modules and pass navigation/context | Allowed origins, postMessage schema, nonce, origin validation, CSP | Same-origin ITY CITY iframe launcher exists; full cross-module identity/context bridge not verified |

### 5.2 Bridge rules

- A bridge MUST NOT grant broader privileges than the caller possesses.
- A bridge MUST validate payloads at the boundary; TypeScript types or browser validation alone are insufficient.
- Cross-module calls MUST carry a correlation ID.
- Retries MUST be bounded and safe; non-idempotent mutations require idempotency keys or a reconciliation strategy.
- Event consumers MUST tolerate duplicate delivery and unknown future fields.
- Events MUST NOT contain credentials, session cookies, or unnecessary personal data.
- Data exchange SHOULD prefer stable references and purpose-specific DTOs over unrestricted database access.
- A bridge outage MUST be represented as DEGRADED/UNKNOWN as appropriate, not as a successful empty response.
- Browser postMessage handlers MUST validate both origin and message schema; wildcard trust is prohibited for privileged context.

## 6. JARVISER orchestration contract

JARVISER is the **central orchestration capability**, not the owner of all modules. It coordinates a task by discovering available capabilities, composing a task-specific execution plan, checking policy, dispatching work through bridges, observing results, and preserving evidence.

### 6.1 Responsibilities

JARVISER MUST:
1. accept a task request with actor, intent, constraints, and correlation ID;
2. classify the task and identify required capabilities;
3. query module/provider/engine manifests and current health/evidence;
4. assemble a temporary execution graph for this task rather than forcing all work through one rigid pipeline;
5. check authorization, policy, budget, data classification, and human-approval requirements;
6. dispatch each step through the appropriate bridge;
7. track pending, running, retrying, blocked, failed, and completed states;
8. collect outputs as references with provenance, not blindly copy domain data;
9. distinguish execution from independent verification;
10. produce a trace that identifies actor, selected capabilities, versions, inputs/outputs, timestamps, decisions, retries, costs where available, approvals, and final evidence;
11. support cancellation and safe recovery where the underlying operation permits it.

JARVISER MUST NOT:
- write directly into module-owned tables to bypass their domain APIs;
- silently elevate permissions;
- claim a provider or engine was used without an execution record;
- convert an unverified output into a VERIFIED result;
- make every module unavailable merely because the orchestrator is unavailable;
- conceal a failed, skipped, or UNKNOWN stage.

### 6.2 Execution lifecycle

`REQUESTED → TRIAGED → PLANNED → AUTHORIZED → DISPATCHED → RUNNING → RESULT_RECEIVED → VERIFIED → COMPLETED`

Alternative terminal or interrupt states: `REJECTED`, `BLOCKED`, `FAILED`, `CANCELLED`, `UNKNOWN`, `PARTIAL`.

Not every task requires every state. A transition MUST have:
- current state and target state;
- actor or system identity;
- transition policy;
- timestamp;
- reason;
- correlation ID;
- evidence reference where the transition asserts an outcome.

A timeout after dispatch is `UNKNOWN` until reconciliation determines whether the operation ran. It MUST NOT be blindly retried when the operation is not idempotent.

### 6.3 Reactor / Cauldron

The Reactor/Cauldron is an orchestration workspace and execution pattern:
- **Triage:** understand request, classify risk, identify unknowns and constraints.
- **Analysis:** gather evidence, select capabilities, compare approaches, identify blockers.
- **Synthesis:** assemble result, actions, artifacts, verification, and next steps.

These stages are conceptual/workflow stages. They MUST NOT be presented as three independently executing agents unless separate agent runs and evidence actually exist. Model assignment may be manual, policy-driven, or user-directed; the chosen provider/model and actual execution must be recorded.

### 6.4 JARVISER availability and graceful degradation

JARVISER is not a single point of failure for all platform operations. Modules MUST retain their own direct authorized workflows where orchestration is unnecessary. If JARVISER is unavailable, modules may continue local operations and queue eligible orchestration requests as PENDING, subject to their own policies.

## 7. Provider and engine federation

AI providers and technical engines are capability endpoints, not hard-coded platform identities.

Each provider/engine manifest MUST declare:
- stable key, vendor/name, version and adapter version;
- supported capabilities/modalities and input/output schemas;
- data handling and retention constraints;
- credential reference (never the secret itself);
- timeout, retry, concurrency and resource limits;
- health probe and last verified result;
- supported operations and known limitations;
- usage/cost reporting capability;
- execution evidence format.

Initial AI strategy remains Qwen-first, with OpenAI as a replaceable alternative. New providers MUST be added through an adapter contract and contract tests. Registry presence is not proof of adapter availability or live provider health.

GIS, BIM, 3D, simulation, spatial, media, and rendering engines follow the same model. An engine registry record is descriptive until an engine bridge can dispatch a real operation and capture its result.

## 8. Identity, authorization, and trust

The platform distinguishes:
- **Identity:** the authenticated human or service subject.
- **Position/context:** organizational or operational context.
- **Permission:** an explicit capability granted to the subject.
- **Duty:** a responsibility assigned to the subject.
- **Approval:** a decision authorizing a specific consequential transition.

A module MUST authorize its own domain action. The gateway or JARVISER may perform an initial policy check, but downstream modules MUST NOT trust a UI claim or unverified caller-supplied role.

Service-to-service calls MUST use a verifiable service identity and narrowly scoped audience/permissions. Delegated user actions MUST preserve the originating actor and delegation chain in audit evidence.

## 9. Data ownership and persistence

A shared PostgreSQL server is allowed; shared unbounded table ownership is not.

- Each domain has one authoritative writer for its domain records.
- Other modules read through documented APIs, views, or published events.
- Cross-domain transactions SHOULD be avoided. Where atomicity is essential, use an explicit orchestrated process with idempotency and compensating actions, or a narrowly defined shared transaction contract.
- Platform-wide audit/evidence records are append-oriented and carry actor, subject, action, correlation, source, timestamp, and result.
- Browser storage is suitable for local preferences and drafts, not authoritative shared state.
- Event publication that must follow a committed write SHOULD use a transactional outbox.
- Schema changes MUST be additive where possible, migration-tested, and accompanied by rollback/recovery notes.

## 10. Deployment topology is not logical architecture

The current repository uses one Node.js/Express service and PostgreSQL. This is a verified deployment shape, not proof that the intended architecture must remain one process forever.

Permitted implementation stages include:
1. **Shared host, strict module boundaries:** one process may host separately structured modules behind explicit interfaces.
2. **Independent workers:** asynchronous capabilities may run in separate processes while sharing versioned contracts.
3. **Selective service extraction:** modules may become independently deployed services when ownership, scaling, security, availability, or team boundaries justify it.
4. **Federated external engines:** independently operated systems may connect through governed bridges.

No stage is mandatory merely for architectural appearance. Extraction requires an ADR, measurable reason, operational ownership, security model, deployment/rollback plan, and contract tests. Conversely, keeping one host MUST NOT be used to excuse direct cross-module coupling or an absent orchestrator.

## 11. Current conformance snapshot (source audit 2026-11-24)

This table separates observed implementation from target. "NOT VERIFIED" means no source evidence was found in the reviewed audit; it is not proof that no experiment exists elsewhere.

| Capability | Observed implementation | Target conformance | Next concrete work |
|---|---|---|---|
| Control Plane | Static UI + authenticated server API + PostgreSQL registries | PARTIAL | Separate platform control functions from module domain ownership |
| ITY CITY | Same-origin iframe launcher | PARTIAL | Versioned module manifest, safe context/navigation contract |
| Workspace | Browser-local prototype | NOT CONFORMANT for shared operation | Module API, identity bridge, server persistence, local draft sync |
| Corporate Campus | Browser-local IndexedDB/localStorage | NOT CONFORMANT for shared operation | Scene/object contracts, module-owned persistence and event publication |
| Corporate Multiverse | Browser-local IndexedDB/localStorage | NOT CONFORMANT for shared operation | World/scene/object identity, persistence, permissions, revisions |
| Team Game | Server-backed employee accounts, missions, submissions, XP, discussion | PARTIAL | Publish Team module contract and identity/event bridge; retain server authority |
| JARVISER Core | Registry entry; no executing orchestrator verified | NOT IMPLEMENTED as orchestration runtime | Capability discovery, planner/router, task/run ledger, policy gate, dispatcher |
| Reactor/Cauldron | UI/concept stages; no multi-agent execution verified | DEMO / NOT IMPLEMENTED as runtime | Real stage/run records and evidence; preserve stage labels as conceptual until then |
| AI Provider Bridge | Qwen/OpenAI adapters and chat endpoint | PARTIAL | Registry-to-adapter binding, capabilities, health evidence, run trace |
| Engine Bridge | Registry concepts; no engine dispatch verified | NOT IMPLEMENTED | Engine manifest and first real adapter integration |
| Connector Bridge | HTTPS syntax validation in registry | PARTIAL | Safe live probe, auth/schema test, outbound egress policy |
| Identity Bridge | Admin and employee session boundaries exist | PARTIAL | Shared subject/scopes/delegation across modules |
| Event Bridge | No durable event bus/outbox verified | NOT IMPLEMENTED | Versioned envelope, outbox, idempotent consumer contract |
| Evidence Bridge | Basic audit events and selected transactional writes | PARTIAL | Correlation IDs, evidence references, verifier identity and retention |
| Shared domain state | Several browser-local modules; Team Game server-backed | PARTIAL | Explicit ownership map and incremental APIs |
| Observability | Health/readiness, diagnostics, limited audit | PARTIAL | Module/bridge health, correlation, alerting and execution traces |

This snapshot is based on source audit evidence, not a live Render test, penetration test, provider connectivity test, or backup restore exercise.

## 12. Migration roadmap

### Stage 0 — Architecture recovery and baseline (this change)
- Record the target architecture and resolve the "modular monolith" wording ambiguity.
- Preserve the existing v1.0 specification and inventory as historical baselines.
- Establish an As-Is / Target / Gap / Evidence / Risk / Next action matrix.
- Trace the commits and PRs that introduced the current topology; record only evidence-backed conclusions.
- Do not change production code or Render.

### Stage 1 — Contract foundation
- Define JSON Schema for module manifests.
- Define API, event, identity, data-exchange, engine, provider, embedding, and evidence bridge contracts.
- Define standard error envelope, correlation ID, idempotency key, health and evidence states.
- Add CI validation for manifests and contract compatibility.
- Publish a module ownership and dependency graph.

### Stage 2 — JARVISER minimum real runtime
- Implement durable task/run/stage records.
- Implement capability discovery against manifests and health evidence.
- Implement policy/permission gate and human approval checkpoint.
- Dispatch one bounded real operation through an adapter.
- Persist result references and independent verification.
- Demonstrate timeout reconciliation, cancellation, failure and retry behavior.
- Keep direct module operation available when JARVISER is down.

### Stage 3 — First federated modules
- Choose one bounded module (recommended: Team Game or a narrowly scoped Workspace service) as the first reference implementation.
- Publish its manifest and API contract.
- Route a cross-module operation through a bridge, not direct database access.
- Add identity context, permissions, event publication, correlation and tests.
- Demonstrate independent module release/disablement without breaking unrelated modules.

### Stage 4 — Shared identity and state
- Introduce common subject/claims contract.
- Migrate Workspace/Campus/Multiverse from local-only authoritative state to module-owned APIs while preserving local drafts.
- Define World/Scene/Object identifiers, revisions, permissions and event semantics.
- Keep old UI routes working during migration.

### Stage 5 — Engine/provider federation
- Bind provider registry entries to actual adapter implementations.
- Add provider health/capability evidence and usage/cost records.
- Add one real engine adapter and one external connector probe under explicit egress policy.
- Add adapter conformance tests and replaceability tests.

### Stage 6 — Selective runtime separation
- Evaluate independent workers/services only after module boundaries and contracts are proven.
- Record ADRs, service ownership, secrets, networking, observability, scaling and rollback.
- Extract only modules with a demonstrated reason; do not split for aesthetics.

## 13. Acceptance gates

A stage is complete only when:
- source changes exist on a reviewable branch/PR;
- contracts validate in CI;
- positive, negative, permission-denied, timeout, duplicate, and unknown-outcome cases are tested as applicable;
- no existing route or preserved experience regresses;
- each capability is labelled REAL/PARTIAL/DEMO/NOT IMPLEMENTED/UNKNOWN based on evidence;
- module and bridge ownership are explicit;
- audit and correlation evidence are present for consequential operations;
- rollback/recovery is documented;
- production deployment remains a separate, explicit operator decision.

A UI, registry row, architecture diagram, passing syntax check, or accepted HTTP request alone cannot satisfy an implementation gate.

## 14. Immediate next actions

1. Review this target architecture against the source history and open PRs.
2. Update the source-based module inventory with a federated ownership/bridge map, preserving its historical status classifications.
3. Add a machine-readable manifest schema and an initial manifest for each verified module only after actual ownership and contracts are inspected.
4. Add a contract test baseline before runtime implementation.
5. Keep all changes on a feature branch and PR. Do not merge or deploy to Render without explicit operator approval.

## 15. Change control

Changes to module ownership, bridge trust, JARVISER authority, event semantics, identity delegation, or execution verification require:
- an Architecture Decision Record;
- updated module/bridge contracts;
- migration and rollback notes;
- tests for compatibility and failure modes;
- explicit approval before production deployment.

**Final rule:** TRAMPILLERA is a federation of capabilities, not a monolith of screens. Integration connects independent systems; it does not erase their independence.
