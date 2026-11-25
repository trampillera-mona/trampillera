# TRAMPILLERA Partner Access Gateway — Architecture Specification v0.1

**Status:** DESIGN / NOT IMPLEMENTED / NOT AUTHORIZED FOR PRODUCTION USE  
**Scope:** One named external collaborator, initially located in Kalmar, Sweden. Location is contextual only; it is not an authorization attribute.

## 1. Purpose

Provide an external partner with a separate, revocable identity and a deliberately limited collaboration workspace. The partner must be able to contribute useful work without becoming an employee, administrator, or platform operator.

## 2. Governing principles

- Least privilege; deny by default.
- A partner identity is distinct from administrator and employee identities.
- An invitation is not a reusable shared password.
- No partner access to Control Plane, employee records, other partners' private work, platform settings, secrets, connector credentials, billing, or global audit records.
- Every privileged action is authenticated, authorized, scoped, and audited.
- Access can be suspended or revoked immediately; session and token invalidation must be verified.
- No simulated success: invitation issuance, redemption, and revocation have explicit persisted states and test evidence.

## 3. Identity and invitation model

Use dedicated `partners` and `partner_invitations` records. Do not represent an external partner as an employee.

Invitation properties:
- Cryptographically random, high-entropy, single-use bearer token.
- Store only a cryptographic digest; never store or log the raw token.
- Bind the invitation to the intended email address once supplied by the administrator.
- Short, explicit expiry (default 72 hours); one redemption only.
- States: `PENDING`, `REDEEMED`, `EXPIRED`, `REVOKED`.
- Administrator may revoke an invitation before redemption and suspend a partner after redemption.
- Rate-limit redemption attempts and use generic failure messages.
- Show the raw invitation secret once, only to the administrator; no email delivery is assumed or claimed until an email provider is configured.
- Do not create or expose a partner access key in source code, logs, GitHub, or this document.

## 4. Partner permission profile v0.1

Initial role: `PARTNER_COLLABORATOR`.

Allowed, only within explicitly assigned project/workspace scopes:
- View assigned work items and their acceptance criteria.
- Submit progress notes and deliverables for review.
- Comment in the assigned collaboration thread.
- Submit proposals to the innovation board.
- Read partner-visible announcements and project updates.

Not allowed:
- Administrator Control Plane or employee ITY CITY workspace.
- Create, invite, manage, or reset accounts.
- View employee personal data, HR records, internal-only discussions, or other partners' private work.
- View or change platform settings, integrations, API keys, secrets, billing, or database.
- Publish a deliverable as verified; only an authorized reviewer can verify acceptance.
- Export global data or access global audit events.

Every work item must carry an explicit project scope and visibility classification. A partner must not gain visibility merely because a numeric ID is guessed.

## 5. Authentication and session controls

- Dedicated partner password hash using the platform's established password hashing policy.
- Separate `partner` session role and authorization middleware; never route partner sessions through administrator or employee guards.
- Secure, HttpOnly, SameSite cookies; HTTPS only.
- Session version on partner record; increment on password reset, suspension, or revocation.
- Optional TOTP enrollment as the next security milestone; do not claim MFA until enabled and tested.
- Re-authentication for sensitive account changes.
- Generic login and invitation-redemption errors to limit account enumeration.

## 6. Audit events

At minimum: invitation created, invitation redeemed, invitation expired, invitation revoked, partner activated/suspended, login success/failure, password changed/reset, work item viewed, submission created/updated, proposal created, access denied, partner session revoked.

Audit records must not contain invitation tokens, passwords, recovery codes, TOTP secrets, or full session identifiers.

## 7. Data and API boundaries

Proposed routes (subject to implementation review):
- Administrator-only: `POST /api/control/partners/invitations`, `GET /api/control/partners`, `POST /api/control/partners/:id/status`, `POST /api/control/partners/invitations/:id/revoke`.
- Public redemption: `POST /api/partners/invitations/redeem`.
- Partner-only: `POST /api/auth/partner-login`, `GET /api/partner/workspace`, `GET /api/partner/work-items`, `POST /api/partner/work-items/:id/submissions`, `POST /api/partner/proposals`, `GET /api/partner/announcements`.

Each route must enforce both role and record-level project scope. Never trust a client-supplied partner ID.

## 8. Release gates

Before production:
1. Separate migration and schema review.
2. Unit tests for token entropy/digest/expiry/replay and state transitions.
3. Integration tests for cross-role denial, IDOR resistance, scope isolation, suspension, session invalidation, and rate limiting.
4. Browser tests for invitation redemption and partner workspace.
5. Accessibility and privacy review.
6. Independent security review.
7. Production secret, database backup, and rollback readiness.
8. No production deployment or partner invite issuance until all required gates pass.

## 9. Explicit unknowns

- Partner's full name and intended email address are not yet supplied.
- Exact project(s), work items, and data visibility have not yet been assigned.
- Email delivery and email-address verification are not configured/verified by this specification.
- No partner invitation has been generated; no account exists as a result of this document.

## 10. Acceptance rule

A partner can see and change only records explicitly assigned to that partner's approved project scope. All other access is denied by default. A successful HTTP response alone is not proof of a successful business operation; persisted state and audit evidence must confirm each transition.
