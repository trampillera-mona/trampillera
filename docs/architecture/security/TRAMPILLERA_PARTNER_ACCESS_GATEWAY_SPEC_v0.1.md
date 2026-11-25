# TRAMPILLERA Partner & Team Workspace — Architecture Specification v0.3

**Status:** IMPLEMENTED IN PR #28 / NOT DEPLOYED / NOT AUTHORIZED FOR PRODUCTION USE  
**Initial collaborator:** One partner currently based in Kalmar, Sweden. Location is contextual only; it is not an authorization attribute.

## 1. Purpose

Build a practical workspace where partners and employees contribute to the same project through assigned work, shared discussions, proposals, reviews, and visible progress.

This is not a guest pass or a read-only portal. The collaborator is both a business partner and an active team contributor. The system must let that person take responsibility for real work and submit verifiable results, while keeping administrative and sensitive production capabilities protected.

## 2. Identity model: one person, multiple affiliations

Do not force a person into a false choice between “partner” and “employee”.

- Maintain one authenticated human identity per person.
- Represent organizational relationships separately from authentication: for example, PARTNER and TEAM_MEMBER affiliations may coexist.
- Resolve effective permissions from explicit role grants, project membership, task assignment, and data classification—not from the person's title or location.
- Avoid duplicate accounts and shared credentials.
- Keep administrator, security operator, reviewer, and ordinary contributor powers separate. Partner status alone grants no administrative authority.
- A person may receive additional responsibilities later through an audited approval process.

## 3. Working principles

- Real work, clear ownership, visible progress, and reviewable deliverables.
- Least privilege; deny by default; grant access by project and task.
- A partner invitation is a one-time onboarding credential, not a reusable shared password.
- Workspaces should make it easy to contribute without exposing unrelated private or operational data.
- Every consequential action is authenticated, authorized, scoped, and audited.
- Access can be suspended or revoked immediately; session and token invalidation must be verified.
- No simulated success: invitation, assignment, submission, review, and revocation have explicit persisted states and test evidence.

## 4. Invitation and onboarding

Use dedicated invitation records, linked to the single human identity created at redemption. Do not create a second account merely to represent a second affiliation.

Invitation properties:
- Cryptographically random, high-entropy, single-use bearer token.
- Store only a cryptographic digest; never store or log the raw token.
- Bind invitation to the intended email address after it is provided and verified.
- Short, explicit expiry (default 72 hours); one redemption only.
- States: PENDING, REDEEMED, EXPIRED, REVOKED.
- Authorized administrator may revoke a pending invitation or suspend access after onboarding.
- Rate-limit redemption attempts and use generic failure messages.
- Show the raw invitation secret once to the authorized issuer; no email delivery is assumed until a provider is configured and tested.
- Do not create or expose an access key in source code, logs, GitHub, or this document.

Onboarding should ask the collaborator to provide:
- Preferred display name and verified sign-in email.
- Languages and comfortable working languages.
- Skills and current learning areas (for example: programming, UI/design, illustration, content/localization, AI-assisted research/workflows).
- Areas of interest and realistic weekly availability (optional).
- Preferred first task or a suggested contribution.

The profile is for collaboration and task matching, not automated ranking or employment decisions.

## 5. Contributor workspace and initial responsibilities

Initial affiliation: PARTNER + TEAM_MEMBER. Initial operational role: TEAM_CONTRIBUTOR, with project-scoped grants.

The workspace should provide:
- **My Tasks:** assigned tasks, priority, due date if applicable, acceptance criteria, status, and reviewer.
- **Project Board:** only projects the person has been explicitly added to.
- **Work Journal:** progress updates, questions, blockers, links, and time-stamped notes.
- **Deliverables:** upload or link work for review; revisions remain traceable.
- **Discussion:** comments and collaboration threads within authorized projects.
- **Innovation Board:** submit ideas, prototypes, improvements, and proposals; allow team discussion and voting if enabled.
- **Announcements:** read updates explicitly marked for the relevant team/project.
- **Learning & Knowledge:** approved documentation, starter guides, and task-specific references.

The first onboarding sprint should not be vague. After access is activated, a coordinator assigns a small, bounded starter task with:
1. a clear objective;
2. a defined scope and allowed repository/project area;
3. acceptance criteria;
4. a safe test or preview environment;
5. a named reviewer;
6. a due date or agreed check-in.

Possible starter tracks, selected after the collaborator's self-assessment:
- Programming: a small isolated bug fix, test, or documented component.
- UI/design and illustration: a clearly scoped screen, icon set, or visual asset.
- Languages: review and improve interface copy or onboarding text.
- AI collaboration: document and test a repeatable AI-assisted workflow, including limitations and verification steps.

These are candidate tracks, not assumptions about competence. No production credentials or direct database access are required for starter work.

## 6. Permissions

Allowed, only within explicitly assigned project/workspace scopes:
- View assigned tasks, project briefs, and acceptance criteria.
- Update own task status and submit progress notes.
- Create and revise deliverables for review.
- Comment in authorized project discussions.
- Submit innovation proposals and prototypes.
- Read project/team announcements marked visible to the collaborator.
- Access explicitly approved source-code repositories and development environments through separately granted accounts and repository permissions.

Not allowed by default:
- Administrator Control Plane or security administration.
- Employee HR/personnel records or private employee information.
- Internal-only discussions outside assigned scopes or other collaborators' private work.
- Platform settings, integrations, API keys, secrets, billing, production database, or global audit records.
- Invite, manage, or reset other accounts.
- Deploy to production, change production configuration, or approve their own deliverables unless separately authorized.
- Mark their own work as independently verified or accepted.

Every project, task, document, and deliverable must carry explicit ownership and visibility classification. A guessed numeric ID or modified URL must never grant access.

## 7. Review and accountability

- Every task has an owner, scope, acceptance criteria, and review state.
- Suggested states: BACKLOG, READY, IN_PROGRESS, BLOCKED, SUBMITTED, CHANGES_REQUESTED, ACCEPTED, CLOSED.
- The contributor may submit work and respond to review; an authorized reviewer decides acceptance.
- Preserve revisions and review comments.
- Record evidence for acceptance (tests, preview, screenshots, source commit, or other task-appropriate proof).
- Distinguish “submitted”, “reviewed”, “accepted”, and “deployed”. They are not interchangeable.

## 8. Authentication and session controls

- Use the platform's established password hashing policy.
- Keep the collaborator's authenticated identity separate from administrator and employee authorization guards; affiliations are evaluated by a dedicated policy layer.
- Secure, HttpOnly, SameSite cookies; HTTPS only.
- Session version on identity/membership; increment on password reset, suspension, or revocation.
- TOTP may be offered as an additional factor after the existing Personal Security Layer release gates are met. Do not claim MFA until enabled and tested.
- Re-authentication for sensitive account changes.
- Generic login and invitation-redemption errors to limit account enumeration.

## 9. Audit events

At minimum: invitation created/redeemed/expired/revoked, affiliation granted/revoked, project membership granted/revoked, task assigned/reassigned, task status changed, submission created/updated, review decision, proposal created, login success/failure, account suspended, session revoked, and denied access.

Audit records must not contain invitation tokens, passwords, recovery codes, TOTP secrets, or full session identifiers.

## 10. Data and API boundaries

Proposed routes (subject to implementation review):
- Administrator/coordinator only: invitation lifecycle, affiliation management, project membership, task assignment, and suspension.
- Public onboarding: single-use invitation redemption.
- Authenticated contributor: own workspace, assigned projects/tasks, work journal, submissions, comments, proposals, and visible announcements.
- Reviewer: review and acceptance actions only for explicitly assigned review scopes.

Every route must enforce identity, affiliation, role, project membership, record-level scope, and visibility classification. Never trust a client-supplied identity or membership ID.



## 10.1 Existing TRAMPILLERA integration baseline — inspected 2026-11-25

The following existing components were inspected in the repository. This section records current implementation boundaries; it does not claim that the proposed gateway is implemented.

| Existing surface | Current behavior | Integration decision |
|---|---|---|
| `/city/` | ITY CITY shell with iframe navigation to Workspace, Campus, Multiverse, and Team | Keep this as the single user-facing entry point; preserve module routes |
| `/city/workspace/` | Browser-local personalization and demo profile; page labels the profile as a demo and layout as browser-local | Replace demo identity with `/api/auth/me`-backed identity; keep local layout preferences non-authoritative |
| `/city/campus/` and `/city/multiverse/` | Separate module surfaces | Keep independently addressable; gate protected data/actions by server-side grants |
| `/city/team/` | Employee-only sign-in and mission workflow backed by `employees`, `team_missions`, and `mission_assignments` | Extend the identity model without creating a second account for a second affiliation |
| `/control/` | Separate administrator session, guarded by `requireAdmin` and `admin_auth_state` | Keep privileged administration separate; invitation issuance must remain administrator-only |
| `/api/auth/me` | Returns either employee or administrator identity; no unified affiliation list | Extend response with stable identity and explicit affiliations while preserving existing clients during migration |
| `/api/auth/employee-login` | Authenticates against the `employees` table | Keep existing employee login compatibility; do not use a shared or administrator credential |
| `/api/control/team/employees` | Creates an employee with a temporary password returned once to the administrator | Do not use this as partner onboarding; introduce email-bound single-use invitation redemption |

### Identity migration constraint

The current schema has a distinct `employees` identity table and a separate administrator authentication state. No shared human-identity table or partner affiliation model was found in the inspected server implementation. The initial implementation must therefore introduce an additive, backward-compatible identity/affiliation layer and an explicit mapping for existing employee accounts. It must not silently merge the administrator identity with an employee row or assume the demo profile is an authenticated account.

### Required integration sequence

1. Additive migration: identity records, affiliation grants, invitation records, project memberships, and audit-safe indexes/constraints. Preserve existing employee IDs and rows.
2. Backfill/link existing employee accounts to a human identity deterministically by normalized email; detect collisions and stop rather than guess.
3. Add an invitation lifecycle: create, revoke, expire, redeem exactly once. Store only a keyed/hash digest of the bearer token; never log or return it after issuance.
4. Email ownership proof: invitation sent to the bound address is the proof mechanism; redemption consumes the one-time token and creates/links the identity in one transaction. No password or token may be sent to a different address.
5. Authentication compatibility: session identifies the human identity and session version; effective affiliations and project scopes are loaded server-side. Legacy employee routes remain protected until migrated and regression-tested.
6. Workspace integration: replace the demo profile with authenticated data and expose only permitted projects/tasks; preserve the Campus and Multiverse module navigation.
7. Admin UI: add invitation lifecycle and affiliation review to the existing Control Plane, not to the contributor workspace.
8. Verification: migration tests, legacy employee regression, invitation replay/expiry/revocation tests, email mismatch, IDOR and cross-scope denial, session invalidation, and browser tests.

### Initial collaborator record supplied by the project owner

- Display name: Egor Zhuravlev (Егор Журавлёв).
- Intended sign-in email: `egorzuravlev913@gmail.com`.
- GitHub handle supplied by the owner: `egorzuravlev913-a11y`.
- GitHub repository permissions, competencies, and preferred contribution track are not verified by these supplied identifiers. Do not infer accessibility expertise from the handle.
- Intended affiliations: `PARTNER` + `TEAM_MEMBER`; operational role: `TEAM_CONTRIBUTOR`.
- First proposed onboarding task: inspect TRAMPILLERA and submit five concrete improvement proposals with rationale and expected impact. This remains proposed, not assigned.
- No invitation, account, repository grant, or production permission has been created by recording these details.

## 11. Release gates

Before production:
1. Separate migration and schema review.
2. Unit tests for token entropy/digest/expiry/replay and state transitions.
3. Integration tests for cross-role denial, IDOR resistance, scope isolation, suspension, session invalidation, and rate limiting.
4. Tests for dual affiliations without duplicate identities and for permission precedence.
5. Browser tests for invitation redemption, onboarding, task workflow, and deliverable review.
6. Accessibility and privacy review.
7. Independent security review.
8. Production secret, database backup, and rollback readiness.
9. No production deployment or invitation issuance until required gates pass.

## 12. Explicit unknowns

- The project owner supplied the collaborator's display name and intended sign-in email; the collaborator must still verify ownership of that email during invitation redemption.
- Exact first project, repository areas, and initial task are not yet assigned.
- Skill areas above are based on an initial informal description and must be confirmed by the collaborator.
- Email delivery and email-address verification are not yet configured/verified by this specification.
- No invitation has been generated; no account or access credential exists as a result of this document. Email delivery provider connection and end-to-end delivery verification remain pending.

## 13. Acceptance rule

The collaborator can independently contribute meaningful work within approved scopes. They can see only projects and records they are authorized to access. Submitted work remains reviewable and traceable; only an authorized reviewer can accept it. All other access is denied by default. A successful HTTP response alone is not proof of a successful business operation; persisted state and audit evidence must confirm each transition.


## 10.2 Implementation status in PR #28 — 2026-11-25

The first additive implementation is now present in the feature branch. This is repository code and CI evidence, not a production deployment.

- Migration `0003_partner_access_gateway.sql` adds partner accounts, affiliations, invitations, project memberships, tasks, task submissions, and proposals. A partner account can optionally link to an existing active employee row by exact email match; existing employee rows and employee-login behavior are not rewritten.
- Invitation tokens are generated from 32 random bytes, stored as SHA-256 digests, expire after 72 hours, and are consumed under a database row lock. Pending invitations can be revoked. Redemption creates the partner principal and both requested affiliations (`PARTNER`, `TEAM_MEMBER`) with operational role `TEAM_CONTRIBUTOR`.
- If an active employee with the invited email already exists, the new partner record links to that employee ID. Employee sessions can then use the partner workspace only through that explicit link and a fresh active/session-version check. If no employee row exists, the contributor identity remains a partner account with the two affiliations; it does not silently create an employee HR record.
- The existing Control Plane now includes Partner Access administration: issue/revoke invitations, create projects, grant project membership, publish tasks, inspect the partner roster and review deliverables/proposals.
- The existing ITY CITY Workspace now includes a Partner Workspace section: sign in or redeem an invitation, see only granted projects, volunteer for open tasks, submit deliverables by description/HTTP(S) artifact link, and submit proposals.
- Partner API routes enforce partner session version and project membership. Partner sessions cannot call administrator invitation endpoints. Deliverable review is administrator-only and separate from submission.
- CI includes token-helper tests, migration checks, invitation redemption/replay/revocation checks, partner/admin role separation, project-scoped task claiming, deliverable submission/review, and an out-of-scope project access denial.

### Explicit limitations and release gates

- Invitation issuance currently returns a one-time link to the authenticated administrator; **email delivery is not configured and is not performed**. The link must be sent manually to the exact invited email. Do not report an invitation as sent.
- The contributor UI currently supports proposal text and artifact links, not file uploads or real-time project messaging.
- MFA, automated expiry sweeps, account suspension UI, repository permissions, production deploy permissions, and broad unified identity migration remain out of scope.
- The legacy employee account is linked only when an active employee row already exists for the exact invited email. The system does not create or infer an HR employee record.
- No invitation or partner account for Egor has been created; no email has been sent; no GitHub repository permission has been granted; no production migration or deployment has been run.
- Keep PR #28 draft until the latest CI run passes and a human review confirms the implementation. Production rollout requires separate approval.
