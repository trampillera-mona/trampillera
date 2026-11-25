# TRAMPILLERA Identity & Organization Baseline Audit — 2026-11-25

**Type:** Repository source audit; read-only inspection  
**Repository:** `trampillera-mona/trampillera`  
**Audited branch / commit:** `main` / `203e74729a255270e73cb8cf4b5b30604fd83c12`  
**Recovery branch created:** `recovery/identity-foundation-2026-11-25` (anchored to the audited commit)  
**Scope:** PostgreSQL schema initialization, authentication/session middleware, employee APIs, Team Game APIs, Team administration UI, current architecture and module inventory.  
**Production database contents and live Render behavior:** NOT INSPECTED by this repository audit.

## 1. Executive finding

TRAMPILLERA already has a real, bounded employee identity implementation. It is not correct to state that no employee identity schema or employee API exists.

The current system supports individual employee accounts, email/password login, salted scrypt hashes, first-login password change, employee session validation, auth-version revocation, account disable/reset, Team Game assignments and discussions, submissions, administrator review and transactional audit for critical changes.

It is not yet a full Identity & Access Management or Organization system. It lacks normalized organizational units and positions, scoped RBAC, permission catalogues, delegated administration, duties/responsibility workflows, invitation lifecycle, MFA/SSO, and a versioned schema migration framework.

## 2. Source evidence

### 2.1 Database tables created/used by `app/server.js`

| Table | Current role | Finding |
|---|---|---|
| `employees` | Employee principal and credentials | REAL bounded identity record |
| `admin_auth_state` | Admin credential fingerprint and auth-version | REAL single configured-admin revocation state |
| `team_missions` | Mission definitions | REAL bounded Team Game |
| `mission_assignments` | Employee mission assignment and review lifecycle | REAL bounded Team Game |
| `mission_messages` | Mission-scoped employee discussion | REAL bounded collaboration |
| `audit_events` | Selected security, employee and mission events | REAL basic audit |
| `platform_modules`, `platform_connectors`, `model_providers` | Platform registries | Separate from identity |

The employee table currently stores `department` and `job_title` as free text. It does not have foreign keys to normalized organization or position tables.

### 2.2 Authentication and session boundary

- Admin login: `POST /api/auth/login`; admin account is configured through environment settings, not a multi-user admin directory.
- Employee login: `POST /api/auth/employee-login`; selects employee by normalized email and checks active state and scrypt password hash.
- Employee session: signed cookie contains employee ID, role, auth version, issued/last-seen timestamps.
- Employee middleware checks account active state, auth-version equality and first-login password-change requirement against PostgreSQL.
- Session middleware enforces 30-minute idle and 8-hour absolute expiry.
- Employee password change and admin reset increment auth version.
- Employee disable increments auth version.
- Admin management APIs are behind `app.use("/api/control", requireAuth, requireAdmin)`.
- Team employee APIs use employee session middleware.

These are source-level controls. This audit does not claim a fresh production login or penetration test.

### 2.3 Existing employee and Team Game API

Employee auth:
- `POST /api/auth/employee-login`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Employee workspace:
- `GET /api/team/dashboard`
- `GET /api/team/missions`
- `POST /api/team/missions/:id/start`
- `POST /api/team/missions/:id/submit`
- `GET /api/team/missions/:id/messages`
- `POST /api/team/missions/:id/messages`

Admin employee and mission management:
- `GET/POST /api/control/team/employees`
- `POST /api/control/team/employees/:id/status`
- `POST /api/control/team/employees/:id/reset-password`
- `GET/POST /api/control/team/missions`
- `GET /api/control/team/submissions`
- `POST /api/control/team/submissions/:id/review`

### 2.4 UI evidence

- `app/public/city/team/index.html`: employee sign-in, first-password setup, personal mission board, team discussion and XP summary.
- `app/public/control/team/index.html`: employee creation/directory, temporary password issuance, disable/restore, password reset, mission builder and submission review.

The current UI collects department and job title as free text. It has no organizational tree, role editor, scoped access editor or My Duties workspace.

## 3. Strengths worth preserving

1. Stable employee primary key and foreign-key references from Team Game tables.
2. Unique employee email.
3. Salted scrypt password hashing and constant-time hash comparison.
4. First-login password change enforced server-side.
5. Auth-version checks revoke stale employee sessions.
6. Idle and absolute session expiry.
7. Employee actor is derived from session, not request body.
8. Employee mission reads and discussion are scoped to assigned missions.
9. Mission assignment uniqueness is enforced by database constraint.
10. Critical employee and mission state changes are transactional with audit writes.
11. Conditional review transition prevents a second verification from awarding XP again.
12. Employee UI escapes dynamic text before inserting it into HTML.

## 4. Gaps and risks

| Priority | Finding | Consequence | Recommended treatment |
|---|---|---|---|
| P0 | Identity inventory text is stale in places | Future work may duplicate existing employee schema or misstate capability | Correct inventory and architecture documentation |
| P1 | Department/title are free text | No reliable org tree, scope inheritance or normalized reports | Add org units/positions and explicit reviewed mapping |
| P1 | Admin/employee is coarse authorization | No least-privilege role delegation or unit-scoped management | Add permission catalogue, roles, scoped role assignments |
| P1 | Duties domain absent | Responsibilities, acknowledgement, deadlines and evidence cannot be managed | Add separate duty definitions/assignments/evidence |
| P1 | Startup-time schema DDL, no versioned migration ledger | Harder to sequence, test and roll back schema evolution | Introduce versioned additive migrations before new domain schema |
| P1 | Audit actor is free text and details are unstructured text | Limited queryability and durable actor attribution | Add structured nullable fields without deleting history |
| P2 | Temporary password displayed to admin for one-time handoff | Operational exposure if shared insecurely | Preserve short-term; design hashed, expiring invitation token flow |
| P2 | No MFA/SSO or recovery-factor lifecycle | Limited protection and enterprise identity interoperability | Separate design and staged provider integration |
| P2 | No normalized reporting relationship | Managerial scope cannot be enforced safely | Add effective-dated reporting links only after organization model |
| P2 | No device identity registry | Communications device trust and key lifecycle not yet integrated | Add only with reviewed MFA/Communications design |

No production data was read, modified, migrated or deleted. No credentials or secrets were accessed.

## 5. Architectural decisions

- Preserve `employees` as the stable identity principal and retain all current IDs.
- Keep the current login/session implementation operational during staged migration.
- Do not turn `department` or `job_title` strings into guessed organizational hierarchy.
- Rights and duties must have separate tables, APIs, UI and lifecycle.
- Role grants must have explicit scope and effective dates.
- Managers do not automatically gain access to private employee communications.
- Every new API route enforces permissions server-side.
- All consequential writes and audit records share a database transaction.
- Introduce versioned migrations before the normalized organization/access/duties schema.

## 6. Recovery and change boundary

A Git recovery branch was created before specification work:
- Branch: `recovery/identity-foundation-2026-11-25`
- Base commit: `203e74729a255270e73cb8cf4b5b30604fd83c12`

The architecture/specification work is isolated on:
- Branch: `feat/identity-duties-foundation-spec`

This audit pass is documentation-only. No application code, PostgreSQL schema, employee records, credentials, Render settings or deployment state were changed.

## 7. Verification boundary

Source inspection establishes the code paths and schema definitions listed above. It does not establish:
- the current contents or integrity of production PostgreSQL;
- the live Render deployed commit;
- successful login on the live domain at the time of this audit;
- backup availability or restore success;
- MFA/SSO or fine-grained authorization;
- full HR, organization chart or duties functionality.

Use UNKNOWN wherever runtime or production evidence is absent.

## 8. Next implementation gates

1. Review and merge the Identity & Duties architecture specification.
2. Add a versioned migration runner and clean-database/legacy-database integration fixtures.
3. Implement additive organization/access/duties schema without changing existing employee IDs or login behavior.
4. Introduce scoped permission middleware with tests before exposing role-management UI.
5. Add organization directory and reviewed mapping of legacy department/title values.
6. Implement duties as a distinct workflow, including acknowledgement vs evidence vs verification.
7. Only then connect Communications, Announcement Board and Innovation Board to shared identity and scoped access.
8. Require passing GitHub verification and explicit operator approval before any Render deployment.
