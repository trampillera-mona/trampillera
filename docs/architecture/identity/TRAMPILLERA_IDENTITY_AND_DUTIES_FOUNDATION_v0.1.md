# TRAMPILLERA Identity & Duties Foundation — Architecture Specification v0.1

**Status:** PARTIAL — bounded employee accounts and Team Game are implemented; normalized organization schema migration 0002 is under review, not yet merged or deployed  
**Date:** 2026-11-25  
**Repository:** `trampillera-mona/trampillera`  
**Domain key:** `identity.core`  
**Related domains:** Access Control, Organization, Duties, Audit, Team Missions, Communications, Announcements, Innovation Board

## 1. Purpose

Establish one organization-managed identity and governance foundation for TRAMPILLERA. It must support employees, organizational structure, scoped roles and permissions, assigned responsibilities, onboarding/offboarding, and auditable decisions.

This is an evolution of the existing employee-account implementation, not a replacement. Existing employee IDs, password hashes, signed sessions, auth-version revocation, Team Game assignments and mission history must remain valid.

The product rule is:

> Identity answers who a person is in the platform. Organization answers where they belong. Access answers what they may do. Duties answer what they are responsible for doing. Evidence answers what actually happened.

**Rights and duties are separate.** A person may have permission to perform an action without being assigned a duty to perform it; an assigned duty does not automatically grant permission to access unrelated records.

## 2. Current implementation baseline (source inspected 2026-11-25)

### 2.1 Existing real implementation

The current `app/server.js` creates and uses:
- `employees`: employee ID, unique email, display name, free-text department and job title, password hash, auth version, active flag, first-login password-change flag, timestamps.
- `team_missions`, `mission_assignments`, `mission_messages`: server-backed bounded Team Game workflow.
- `audit_events`: basic action/entity/details/actor/timestamp records.
- `admin_auth_state`: singleton admin credential fingerprint and auth version.

Current authentication behavior:
- Admin identity uses a configured `ADMIN_PASSWORD` and a signed session cookie.
- Employee login uses email and salted scrypt password hashes.
- Employee sessions carry employee ID and auth version; protected employee requests re-check active state, password setup state and auth version in PostgreSQL.
- Employee sessions have 30-minute idle and 8-hour absolute expiry.
- New accounts receive a generated temporary password; first login requires a personal password change.
- Password reset, password change and employee disable increment auth version to invalidate old employee sessions.
- Admin routes under `/api/control/*` are protected by authentication and administrator-role middleware.
- Team employee self-service routes are protected by employee session middleware.
- Team administration routes create/disable/reset employee accounts, publish missions and review submissions.
- Critical employee and mission changes write audit records in the same database transaction.

### 2.2 Known limitations

The current model is **bounded employee authentication**, not a full identity provider or organization directory:
- `department` and `job_title` are free-text columns, not normalized organization entities.
- Migration 0002 in the current review branch adds normalized organizational units, positions and effective-dated employee assignments; no organization CRUD API, directory UI or production migration is yet verified. Reporting relationships remain unimplemented.
- Authorization is coarse: administrator vs employee. There is no permission catalogue, scoped role assignment, role-permission matrix, ABAC policy engine or delegated administration.
- There is no duty/responsibility assignment, acknowledgement, due-date, escalation or evidence workflow.
- There is no first-class invitation token lifecycle, MFA, SSO, recovery factor or device registry.
- Audit actor is a text field, not a durable foreign-key identity with structured before/after data and correlation IDs.
- Schema setup is performed through startup-time `CREATE TABLE IF NOT EXISTS` and additive `ALTER TABLE` statements; a versioned migration ledger and tested rollback strategy are not yet established.
- Employee admin endpoints do not yet implement fine-grained scope restrictions because the current admin role is global.
- Current UI exposes department and job title as free-text fields.
- No production organization chart or authoritative HR integration is assumed.

The source inventory must not describe employee identity as absent. Conversely, this bounded implementation must not be represented as complete RBAC/ABAC, HR, MFA/SSO or duties management.

## 3. Governing principles

1. **Preserve identity continuity:** never recreate employee IDs or discard Team Game references.
2. **Additive migration first:** expand schema and APIs without breaking current login or Team Game routes.
3. **Least privilege:** deny by default; server-side authorization on every protected operation.
4. **Scoped authority:** organization-wide, unit, team, project and self scopes are explicit; a manager title alone is not a permission.
5. **Rights ≠ duties:** access grants and responsibility assignments have separate data models and lifecycles.
6. **No implicit surveillance:** duties are work expectations, not a blanket right to inspect private communications or personal activity.
7. **Effective dating:** organization assignments, role grants and duties have start/end dates and history; changes do not rewrite the past.
8. **Evidence before status:** a submitted or acknowledged item is not proof of completion or understanding.
9. **Human review for consequential changes:** role escalation, termination, privileged access and sensitive duty assignment require explicit authorized action and audit.
10. **Unknown is valid:** missing organization mapping or evidence is UNKNOWN / UNASSIGNED, never silently inferred as PASS.
11. **One source of truth:** shared employee identity is used by Control Plane, Team Game, Communications, Announcement Board, Innovation Board and future workspaces.
12. **Reversible delivery:** migrations, feature flags and rollback plans precede production activation.

## 4. Domain boundaries

| Domain | Owns | Does not own |
|---|---|---|
| Identity | Person/account identity, credentials, account lifecycle, authentication sessions | Job hierarchy, task assignments, content permissions outside identity |
| Organization | Organizational units, positions, reporting relationships, employee placements | Authentication credentials |
| Access Control | Permission catalogue, roles, scoped grants, authorization decisions | Employee duties or performance evaluation |
| Duties | Responsibility definitions, assignments, deadlines, evidence and escalation | Permission grants or automatic access to private data |
| Audit | Actor, action, target, decision, correlation and evidence references | Message bodies, passwords, private keys or unnecessary personal content |
| Team Missions | Cooperative learning/work challenges and verified submissions | Authoritative HR performance or compensation records |

## 5. Target logical data model

All identifiers are stable database-generated IDs. Use UTC timestamps. Use explicit status enums/check constraints and foreign keys. Avoid storing duplicate names where a relation can be used.

### 5.1 Organization

**`org_units`**
- `id`, `unit_key` (unique stable key), `name`, `unit_type` (COMPANY / DIVISION / DEPARTMENT / TEAM / PROJECT_GROUP / OTHER), `parent_unit_id` nullable, `status` (ACTIVE / INACTIVE), `created_at`, `updated_at`.
- Parent relation must prevent cycles. Unit deactivation must not delete history.

**`positions`**
- `id`, `position_key`, `title`, `description`, `status`, timestamps.
- A position is an organizational designation, not a permission role.

**`employee_org_assignments`**
- `id`, `employee_id`, `org_unit_id`, optional `position_id`, `assignment_type` (PRIMARY / SECONDARY / TEMPORARY), `valid_from`, nullable `valid_until`, `status`, `created_by`, timestamps.
- Preserve history; enforce sensible non-overlap rules for primary assignments.
- A person may have multiple valid assignments if explicitly authorized.

**`employee_reporting_links`** (optional Stage 2)
- `id`, `employee_id`, `reports_to_employee_id`, `relationship_type`, `valid_from`, `valid_until`.
- Reporting links are organizational facts, not automatic grants to read private data.

### 5.2 Access control

**`permissions`**
- `id`, unique `permission_key`, `description`, `domain`, `risk_level`, `status`.
- Permission keys are stable API-level capabilities, e.g. `identity.employee.read`, `identity.employee.create`, `identity.employee.disable`, `organization.unit.manage`, `access.role.assign`, `duties.assignment.create`, `announcements.publish`, `innovation.review`, `communications.room.moderate`.

**`roles`**
- `id`, unique `role_key`, `name`, `description`, `is_system`, `status`.
- Initial system roles should be minimal: PLATFORM_ADMIN, IDENTITY_ADMIN, ORG_MANAGER, DUTY_COORDINATOR, EMPLOYEE. Do not equate job titles with system roles.

**`role_permissions`**
- Composite key `role_id + permission_id`; optional explicit deny is not included in v0.1. If deny rules become necessary, define precedence formally before implementation.

**`employee_role_assignments`**
- `id`, `employee_id`, `role_id`, `scope_type` (GLOBAL / ORG_UNIT / SELF / PROJECT), nullable `scope_id`, `valid_from`, `valid_until`, `granted_by`, `reason`, `status`.
- Global scope is restricted to approved platform-level roles.
- Unit-scoped role grants cannot silently apply outside the assigned unit.
- Role assignment/revocation is audited and requires a reason for privileged roles.

### 5.3 Duties and responsibilities

**`duty_definitions`**
- `id`, unique `duty_key`, `title`, `description`, `category`, `evidence_type`, `default_period`, `status`, timestamps.
- Examples: review assigned innovation proposals, publish approved team notice, maintain a department knowledge page, complete a scheduled safety inspection.
- A duty definition describes an expected responsibility, not a permission.

**`duty_assignments`**
- `id`, `duty_definition_id`, `assignee_employee_id`, optional `org_unit_id`, `assigned_by`, `valid_from`, `due_at`, `status`, `priority`, `acknowledged_at`, `completed_at`, timestamps.
- States: DRAFT / ASSIGNED / ACKNOWLEDGED / IN_PROGRESS / SUBMITTED / VERIFIED / RETURNED / CANCELLED / OVERDUE / UNKNOWN.
- ACKNOWLEDGED means the person acknowledged receipt, not that the duty is complete or understood.
- OVERDUE is a derived operational condition based on due date and a non-terminal state; it must not erase the underlying state.

**`duty_evidence`**
- `id`, `duty_assignment_id`, `submitted_by`, `evidence_type`, `reference_uri` or bounded text summary, `submitted_at`, `review_status`, `reviewed_by`, `reviewed_at`, `review_note`.
- Store references and minimal metadata; do not use this table as a file store.
- Evidence submission is not verification. Verification is a separate authorized decision.

**`duty_events`** (or structured audit events)
- State transitions, assignment changes, deadline changes, acknowledgement, submission, review, cancellation and escalation are append-only events.

### 5.4 Identity and onboarding

Keep existing `employees` as the stable employee principal during v0.1. Do not rename or recreate it in the first migration.

Add, in a later implementation stage:
- `employee_invitations`: email, intended org assignment, token hash, expiry, created_by, consumed_at, revoked_at; never store a raw reusable invitation token.
- `employee_recovery_events` only if a reviewed recovery flow is designed.
- `employee_devices` only when MFA/device trust or Communications key identity is implemented.

Existing temporary-password onboarding remains supported until a token-based invitation flow is implemented and tested. Do not expose passwords in audit events or logs.

## 6. Authorization contract

Every protected route must declare required permission and scope. UI visibility is not an authorization control.

Authorization decision inputs:
- authenticated employee/admin principal;
- requested permission;
- target resource;
- organizational scope;
- effective role grants at request time;
- account and grant status;
- applicable policy constraints.

Initial algorithm:
1. Authenticate the session.
2. Re-check account active state and auth version in PostgreSQL.
3. Resolve active permission grants for the principal and target scope.
4. Deny if no matching grant or if any required scope cannot be proven.
5. Record privileged decisions and mutations with actor, target, reason and correlation ID.
6. Return a stable 401 (not authenticated) or 403 (authenticated but not authorized); avoid leaking whether a restricted target exists.

No client-supplied employee ID may define the actor. Actor identity is always taken from the validated session. Target IDs are validated and scoped server-side.

### 6.1 Permission examples

| Permission | Minimum intended scope |
|---|---|
| `identity.employee.read` | SELF, ORG_UNIT or GLOBAL according to grant |
| `identity.employee.create` | Assigned org unit or GLOBAL |
| `identity.employee.disable` | Assigned org unit or GLOBAL; privileged reason required |
| `organization.unit.read` | Assigned unit subtree or GLOBAL |
| `organization.unit.manage` | Explicit unit scope or GLOBAL |
| `access.role.assign` | Only roles/scopes the grantor is authorized to delegate |
| `duties.assignment.read` | Assignee SELF, coordinator scope or GLOBAL |
| `duties.assignment.create` | Explicit coordinator scope |
| `duties.assignment.verify` | Explicit reviewer/coordinator scope; not self-approval |
| `announcements.publish` | Audience scope authorized for publisher |
| `innovation.review` | Assigned review queue or explicit scope |
| `communications.room.moderate` | Room membership/role; not global admin by default |

### 6.2 Separation of duties

- A person must not grant themselves a more privileged role.
- A role grantor must hold a delegation permission covering the target role and scope.
- High-risk grants require a second approver in a later policy stage.
- A duty assignee cannot verify their own submitted evidence unless a narrowly defined low-risk workflow explicitly permits it.
- Organization managers do not automatically receive access to private direct messages or E2EE content.
- Platform administrators may administer account metadata without automatic access to private employee communications.

## 7. API contract proposal

Use versioned routes under `/api/v1`. Existing `/api/auth/*` and `/api/team/*` routes remain compatibility routes until clients migrate.

### 7.1 Identity
- `GET /api/v1/identity/me`
- `GET /api/v1/identity/employees` — permission and scope required.
- `POST /api/v1/identity/employees` — create/invite; permission and scope required.
- `GET /api/v1/identity/employees/:id`
- `PATCH /api/v1/identity/employees/:id` — profile metadata only; credential changes use dedicated flows.
- `POST /api/v1/identity/employees/:id/activate`
- `POST /api/v1/identity/employees/:id/suspend`
- `POST /api/v1/identity/employees/:id/terminate`
- `POST /api/v1/identity/invitations/:id/revoke`

### 7.2 Organization
- `GET/POST /api/v1/organization/units`
- `GET/PATCH /api/v1/organization/units/:id`
- `GET/POST /api/v1/organization/positions`
- `GET/POST /api/v1/organization/assignments`
- `POST /api/v1/organization/assignments/:id/end`

### 7.3 Access
- `GET /api/v1/access/permissions`
- `GET/POST /api/v1/access/roles`
- `PUT /api/v1/access/roles/:id/permissions`
- `GET/POST /api/v1/access/role-assignments`
- `POST /api/v1/access/role-assignments/:id/revoke`
- `POST /api/v1/access/check` — diagnostic decision, never a substitute for middleware enforcement.

### 7.4 Duties
- `GET/POST /api/v1/duties/definitions`
- `GET/POST /api/v1/duties/assignments`
- `GET /api/v1/duties/my`
- `POST /api/v1/duties/assignments/:id/acknowledge`
- `POST /api/v1/duties/assignments/:id/start`
- `POST /api/v1/duties/assignments/:id/evidence`
- `POST /api/v1/duties/assignments/:id/verify`
- `POST /api/v1/duties/assignments/:id/return`
- `POST /api/v1/duties/assignments/:id/cancel`

Every write endpoint must use a documented state transition, validate input, enforce scope, use a database transaction for state plus audit, and return the resulting state and event/evidence reference.

## 8. Account lifecycle and organizational lifecycle

Account lifecycle target:
`INVITED → ACTIVE → SUSPENDED → ACTIVE`; terminal `TERMINATED`; invitation may be `EXPIRED` or `REVOKED`.

- Suspension immediately invalidates sessions by incrementing auth version.
- Termination revokes access and active role grants; it must not cascade-delete historical missions, audit events, duties or authored proposals.
- Reactivation is an explicit authorized event and does not silently restore expired role grants.
- Email changes require verification and audit.
- Existing boolean `employees.active` remains the compatibility projection until all clients use the lifecycle field.
- Organizational placement changes are effective-dated; they do not rewrite historic duty or review ownership.
- Role grants have their own expiry/revocation independent of employment state.

## 9. Audit and evidence

Extend audit records incrementally. Target fields:
- actor principal type and ID;
- action key;
- resource type and ID;
- scope;
- decision/outcome;
- reason;
- correlation/request ID;
- timestamp;
- structured minimal before/after metadata where justified.

Never record password values, temporary passwords, session cookies, invitation tokens, private keys, recovery secrets, message bodies or media payloads. Audit must not become a covert communications archive.

Keep the current `audit_events` table compatible during transition. A migration may add nullable structured columns and indexes; do not rewrite or delete historic events. Append-only enforcement, retention and export policy require separate operational/legal review.

## 10. Migration and compatibility strategy

**No schema or runtime changes are authorized by this architecture document alone.**

Implementation must:
1. Create a recovery branch and identify the exact source commit.
2. Add a versioned migration ledger and deterministic migration runner before adding a large set of domain tables.
3. Write additive migrations; do not drop or rename existing columns/tables in the first release.
4. Add organization/access/duty tables with foreign keys, unique constraints and indexes.
5. Preserve existing employee IDs, email uniqueness, password hashes, auth versions and all Team Game foreign keys.
6. Introduce a compatibility adapter that maps existing `department` and `job_title` text to normalized records only after explicit review.
7. Do not infer organization structure from spelling variants or employee names. Unmapped records remain `UNASSIGNED` pending administrator review.
8. Seed a minimal permission catalogue and roles idempotently; record seed version and never overwrite operator-managed role assignments on restart.
9. Add route-level permission middleware and migrate one low-risk read endpoint first.
10. Keep legacy admin behavior behind an explicit migration/compatibility policy until the new role system is tested.
11. Run PostgreSQL integration tests against both a clean database and a copy of the existing schema/data.
12. Verify rollback procedure on a disposable database. Production rollback must not delete data written after migration.
13. Deploy only after GitHub checks pass and operator explicitly approves Render deployment.
14. After deployment, verify login, employee session continuity, Team Game, admin access, employee isolation and audit transactions.

## 11. User experience contract (THIS)

The system must remain understandable to beginners and efficient for professionals:
- **Everyday:** My Profile, My Team, My Duties, announcements, proposals and simple onboarding.
- **Professional:** employee directory, team structure, assignments, role requests, duty queues and review.
- **Engineering:** permission catalogue, scope rules, audit diagnostics, migrations and policy traces.

A screen should answer: Where am I? What matters? What can I do? What happens next?

Default employee experience should not expose policy jargon. A person sees their current team, role/position, duties, deadlines, and clear next actions. Managers see only authorized organizational scope. Engineering detail is progressively disclosed.

No public leaderboard or XP score may be treated as an HR performance rating, salary input, disciplinary metric or proxy for employee worth. Participation must not require public disclosure of sensitive ideas or personal circumstances.

## 12. Integration contracts

- **Team Game:** preserve existing employee ID and assignment references; later add scoped mission creation/review permissions.
- **Communications:** use identity and room-scoped capabilities; role in the company does not automatically grant access to private message content.
- **Announcement Board:** publishers receive audience-scoped publish permission; recipients' delivery/acknowledgement states are not read receipts.
- **Innovation Board:** every employee may submit; reviewer access is queue/scope-based; confidential submissions have explicit restricted visibility.
- **Control Plane:** employee directory and access/duties administration are first-class workspaces with permission-gated actions.
- **Workspace/Campus/Multiverse:** identity handoff may be introduced only after server-backed persistence and object-level access contracts exist.

## 13. Verification matrix

| Test | Expected result |
|---|---|
| Existing employee logs in after migration | Same account and password remain valid |
| Existing Team Game assignment loads | Same employee and mission references remain intact |
| Employee A requests Employee B private profile | 403/404 according to disclosure policy |
| Employee submits a role assignment to self | Denied and audited |
| Unit-scoped manager reads another unit | Denied |
| Expired role grant is used | Denied |
| Disabled/suspended employee reuses old cookie | 401; session invalidated |
| Employee acknowledges a duty | ACKNOWLEDGED, not VERIFIED |
| Employee submits evidence | SUBMITTED, not VERIFIED |
| Unauthorized person verifies evidence | Denied |
| Assignee attempts self-approval | Denied unless explicitly allowed by a documented low-risk policy |
| Org assignment ends | History remains; active scope recalculated |
| Role revoked | Access removed without deleting historic audit |
| Migration runs twice | Idempotent; no duplicate seeds or data loss |
| Migration rollback tested on disposable DB | Documented result; production data preserved |
| Audit failure during critical mutation | Whole transaction rolls back |
| UI hides a button but API is called directly | Server denies unauthorized action |

## 14. Delivery roadmap

**Stage 0 — Baseline and contracts**
- Preserve source baseline and recovery branch.
- Correct inventory and audit documentation.
- Finalize domain schemas, API contracts, migration strategy and permission vocabulary.

**Stage 1 — Migration foundation**
- Versioned migration ledger/runner.
- Additive organization/access/duty schema.
- Seed minimal roles/permissions idempotently.
- No new employee-facing feature until compatibility tests pass.

**Stage 2 — Organization directory**
- Normalize org units and positions.
- Review/migrate existing free-text department/title values.
- Employee directory, profile and scoped organizational assignments.

**Stage 3 — RBAC and delegated administration**
- Permission middleware and scoped role assignments.
- Role management UI with preview of impact and audit.
- Replace global admin-only management gradually; preserve emergency platform admin.

**Stage 4 — Duties**
- Duty definitions, assignments, acknowledgement, evidence, review and escalation.
- Employee My Duties and authorized coordinator queues.
- Separate rights and duties at both schema and UI levels.

**Stage 5 — Integrate participation products**
- Announcement and Innovation boards use shared identity, scope, notifications and audit.
- Communications uses the same identity without implicit content access.
- Team Game remains a distinct learning/collaboration feature.

## 15. Explicit non-goals for v0.1

- Full HR/payroll/recruitment system.
- Employee surveillance, keystroke tracking, hidden productivity scoring or covert monitoring.
- Automatic inference of reporting lines from job titles.
- Automatic permission escalation based on managerial title.
- SSO/MFA implementation before a separate provider and recovery design.
- Communications content inspection or decryption by platform administrators.
- Replacing Team Game or converting XP into compensation/performance ratings.
- Live HRIS synchronization without a selected provider, legal basis and verified integration contract.

## 16. Acceptance gate

Identity & Duties Foundation may be marked REAL only when:
- versioned migrations preserve existing production records;
- employee login and Team Game compatibility tests pass;
- org assignments and role grants are effective-dated and scoped;
- server-side permission checks protect every new route;
- rights and duties remain separate;
- duty transitions and evidence are auditable;
- suspension/offboarding revokes sessions and access;
- privacy and retention rules are reviewed;
- GitHub verification passes and post-deploy runtime checks confirm the intended behavior.

Until then, the full Identity & Duties Foundation status is **PARTIAL / architecture in progress**. The existing employee account and Team Game subset remains REAL within its documented boundaries.


## 17. Implementation delta — organization schema migration 0002 (2026-11-25)

The review branch `feat/organization-normalization-migration` adds `0002_normalized_organization.sql` after the merged migration baseline. It creates `org_units`, `positions` and `employee_org_assignments` with foreign keys, stable keys, type/status/date constraints, a serialized hierarchy cycle guard and a serialized overlap guard for active primary placements.

No legacy `department` or `job_title` text is transformed. No organization rows, position rows or employee placements are seeded. Existing `employees` columns, IDs, credentials, auth versions, Team Game tables and foreign keys are not altered. The migration adds schema capability only; organization APIs, UI, authorization and reviewed mapping are future work.

The PR's CI must prove clean PostgreSQL startup, migration ledger idempotency, schema presence, zero inferred assignments and continued employee/Team Game compatibility. Until those checks pass and the PR is merged/deployed, this remains source under review, not production capability.


## Organization Desk implementation delta — 2026-11-25

The proposed Control Plane Organization Desk adds admin-only read/write API routes and a dedicated directory workspace for the migration-0002 schema:

- list organizational units, positions and existing employee accounts with current effective assignment (if any);
- create organizational units and positions;
- create explicit effective-dated employee placements after validating active employee, active unit and optional active position;
- write audit events for created units, positions and assignments;
- display legacy free-text department/job-title values for human review without automatic mapping or mutation.

The interface intentionally distinguishes organizational position from system role/permission. It does not implement scoped RBAC, reporting-line authority, duties, payroll, performance management or employee self-service. Assignment creation does not rewrite legacy employee fields or grant access.

Source implementation is proposed in PR #25 and is not deployed. Runtime and production-database verification remain outstanding. Before deployment, verify that the admin authorization middleware covers all new routes, that audit writes are atomic with each transaction, and that the SQL constraints and API payloads match the exact merged migration 0002.
