# TRAMPILLERA Personal Security Layer (PSL) — Architecture Specification v0.1

**Status:** Architecture baseline; implementation in progress (2026-11-25)  
**Scope:** Optional user-controlled account security enhancements and risk-based step-up authentication  
**Repository:** `trampillera-mona/trampillera`  
**Runtime impact:** See implementation status below. Production deployment is not authorized by this document.

## 1. Purpose

Provide users with understandable, optional security controls without making routine sign-in unnecessarily difficult. The platform must apply stronger verification when the action or session risk warrants it.

Core principles:

- User choice for optional security controls.
- Risk-based step-up rather than repeated challenges on every routine action.
- Independent authentication factors for high-impact actions.
- Server-side authority for enrollment state, verification results, revocation, and audit events.
- Secrets are never recoverable by staff or displayed from server storage.
- Exported secret images are treated as credentials, not harmless screenshots.
- Accessible alternatives must exist for users who cannot reliably distinguish colors.
- No simulated success: configuration, enrollment, verification, and recovery have distinct states and evidence.

## 2. Terminology and security boundary

### 2.1 Personal Security Layer (PSL)

PSL is the umbrella for optional controls such as Passkeys, authenticator-app TOTP, recovery codes, and a visual memorized secret.

### 2.2 Visual Security Code (VSC)

VSC is a secondary memorized secret represented as a sequence of visual tiles. It may use colors, shapes, symbols, or a combined encoding. VSC is **not** a cryptographically independent authentication factor: it is another knowledge secret. It must not be represented as equivalent to WebAuthn/Passkeys or TOTP.

VSC is an optional step-up challenge and may supplement, but never replace, a stronger independent factor where policy requires one.

### 2.3 Separate concerns

PSL does not perform age assurance, identity proofing, employee vetting, or account registration. Those workflows require separate policies, data models, and legal review. An authenticated account is not proof of a person's age or legal identity.

## 3. User experience and selectable modes

Offer three understandable profiles:

| Profile | Default behavior |
|---|---|
| Standard | Routine sign-in uses the existing primary authentication. Step-up is required for high-risk events and policy-defined sensitive actions. |
| Enhanced | VSC is requested for a new/unrecognized device and selected sensitive account changes. Independent MFA remains required where applicable. |
| Strict | Re-authentication and configured additional checks are required for each new session and sensitive actions. |

The user may select a profile for their own account. The platform may enforce a minimum security policy for privileged employee, operator, and administrator roles. A user preference must never weaken an organization-mandated control.

Do not challenge on every page view or ordinary navigation. Remembered-device behavior must be bounded by expiry, revocation, risk signals, and session policy. Do not treat IP address alone as reliable device identity.

## 4. Recommended enrollment flow

1. User opens Security Settings and explicitly enables VSC.
2. Explain that VSC is a memorized secret and that an exported image contains the complete secret.
3. Offer an accessible visual format: color + symbol/shape labels, or symbol-only.
4. Generate a cryptographically random sequence in the browser using a secure random source. Do not allow weak user-selected patterns as the default.
5. Recommended baseline: six positions selected independently from ten distinguishable tokens (one million possible sequences when repetition is allowed). This is only a baseline; online rate limits remain mandatory. Avoid claiming this is equivalent to MFA.
6. Show the sequence once and offer the user an explicit choice to save/export it.
7. Require a confirmation challenge before enabling VSC.
8. Server stores only a salted, slow password-KDF verifier and non-secret metadata. Never store the plaintext sequence or exported image.
9. Record enrollment completion and policy version in the audit log, not the secret itself.

The user must be able to cancel enrollment without changing existing authentication settings.

## 5. Export, copy, and local retention

The product should support user-requested export of the visual card:

- Download as PNG.
- Copy as an image to the clipboard where the browser and device support it.
- Print a card.
- Regenerate the card only as part of an explicit VSC rotation flow.

Security requirements:

- Render the export locally in the browser. Do not upload the image to TRAMPILLERA servers, analytics, telemetry, or support systems.
- Require an explicit confirmation immediately before exporting the complete secret.
- Warn that anyone who obtains the image may be able to use the VSC. Advise secure offline storage and caution against gallery/cloud photo sync, messaging apps, shared devices, and screenshots.
- Do not automatically save the image, attach it to email, or place it in application logs.
- Clipboard access is best-effort and must report unsupported browser/device behavior honestly.
- The user may choose a **reminder card** that contains no secret, as a safer alternative.
- A full-secret export is a convenience/recovery copy, not a secure recovery protocol and not an independent factor.

The platform cannot guarantee that a browser, operating system, screenshot utility, clipboard manager, cloud backup, or another application will not retain a copy. The UI must state this limitation clearly.

## 6. Verification and risk-based step-up

Suggested triggers:

- New or unrecognized device/session.
- Password, primary email, passkey, or MFA changes.
- Enabling/disabling security controls.
- Account recovery or credential reset.
- Changes to employee role, permissions, organization assignment, or privileged access.
- Administrative actions involving sensitive data or security configuration.
- Risk signals such as unusual authentication patterns or repeated failures.

For routine sign-in from a recognized, valid session, avoid unnecessary VSC prompts unless the user selected Strict mode or a role policy requires them.

For high-impact operations, require a fresh primary re-authentication and an independent factor (Passkey/WebAuthn or TOTP). VSC alone is insufficient.

Do not reveal whether a submitted sequence was close to correct. Use uniform error messages and constant-time comparison where applicable.

## 7. Storage and cryptographic requirements

- Use a dedicated VSC credential record linked to the account; do not mix the VSC verifier into the primary password hash field.
- Use a unique cryptographically random salt per credential and a password-appropriate slow KDF. Prefer Argon2id after dependency/security review; scrypt is an acceptable interim option if properly parameterized and benchmarked. Never use plain SHA-256 or reversible encryption for the verifier.
- Consider a server-side pepper stored only in the deployment secret manager, with a documented rotation plan. Never commit secrets to this public repository.
- Never log submitted sequences, verifier values, salts, recovery codes, exported image bytes, or clipboard contents.
- Use TLS, same-origin protections, CSRF defenses, strict request validation, and bounded payload sizes.
- Apply per-account and per-source rate limits, progressive delays, alerting, and temporary challenge lockout. Avoid permanent lockout based solely on failed guesses.
- Ensure credential revocation and auth-version/session invalidation are atomic for security-sensitive changes.
- Do not create a new dependency until its maintenance, compatibility, and security posture have been reviewed.

## 8. Accessibility and usability

- Never rely on color alone. Every tile must also have a shape, glyph, label, or position cue.
- Provide a high-contrast mode and screen-reader labels.
- Avoid color combinations that are difficult to distinguish; allow symbol-only format.
- Do not use culturally loaded or personally identifying questions such as favorite colors as security answers.
- Do not make the VSC secret a sequence of predictable favorite colors or a user profile attribute.
- Explain the difference between a visual secret, a passkey, and an authenticator code in plain language.

## 9. Recovery, rotation, and revocation

- Provide one-time recovery codes generated with secure randomness, shown once, and stored server-side only as salted verifiers.
- Prefer recovery through a previously enrolled independent factor.
- Require stronger proof and notifications for recovery when all independent factors are lost. Define a reviewed account-recovery procedure before implementation.
- Support VSC rotation. A new VSC invalidates the previous verifier after successful enrollment and confirmation.
- Support revocation of lost devices/passkeys and invalidation of active sessions.
- Notify the account owner of enrollment, export guidance, rotation, factor removal, recovery, and security-profile changes where appropriate.
- Staff must never be able to view, retrieve, or disclose the previous VSC.

Exporting a PNG must not be treated as proof of identity or as the only recovery route.

## 10. Role policy

| Account class | User controls | Organization policy |
|---|---|---|
| Public user | May enable/disable optional PSL features and choose a profile | Platform baseline and risk-based step-up |
| Employee | May manage permitted personal factors | Employer may require independent MFA for work systems and sensitive actions |
| Manager / privileged employee | May manage permitted personal factors | Stronger mandatory independent factor for privileged actions |
| Administrator / security operator | May manage permitted personal factors | Mandatory independent factor; VSC is supplemental only |

Authorization (what a person may do), authentication (proving control of credentials), duties (what they are responsible for), and evidence (what actually happened) remain separate concepts.

## 11. Audit events

Record event metadata only, for example:

- `PSL_ENROLLMENT_STARTED`
- `PSL_VSC_ENROLLED`
- `PSL_VSC_ROTATED`
- `PSL_VSC_REVOKED`
- `PSL_PROFILE_CHANGED`
- `PSL_STEP_UP_REQUIRED`
- `PSL_STEP_UP_SUCCEEDED`
- `PSL_STEP_UP_FAILED`
- `PSL_RECOVERY_STARTED`
- `PSL_RECOVERY_COMPLETED`
- `PSL_FACTOR_ADDED`
- `PSL_FACTOR_REMOVED`

Events may include account ID, timestamp, outcome, reason category, policy version, and a privacy-reviewed device/session reference. Never include secret material or raw personal device fingerprints.

## 12. Proposed data model (not a migration)

Conceptual entities only; exact schema must be designed after review of the live database and current session model:

- `account_security_settings`: account reference, selected profile, policy version, timestamps.
- `account_security_factors`: factor type, status, verifier/public credential metadata, created/last-used/revoked timestamps.
- `account_recovery_codes`: salted verifiers, status, created/used timestamps.
- `account_trusted_devices`: revocable bounded device/session trust records, expiry, last-used timestamp.
- Existing `audit_events`: security lifecycle events with no secret values.

Do not create these tables until migration design, account-type mapping, retention policy, and rollback plan are approved.

## 13. API contract outline (not implemented)

Candidate routes, subject to the existing API conventions and authorization middleware:

- `GET /api/account/security` — return current profile and factor status, never secrets.
- `PUT /api/account/security/profile` — update permitted profile.
- `POST /api/account/security/vsc/enroll` — begin enrollment; accept only the minimum required verifier material over TLS.
- `POST /api/account/security/vsc/confirm` — verify enrollment challenge and activate.
- `POST /api/account/security/vsc/rotate` — begin rotation.
- `POST /api/account/security/vsc/revoke` — revoke VSC after fresh authentication.
- `POST /api/account/security/step-up` — create a short-lived, single-purpose challenge.
- `POST /api/account/security/recovery/redeem` — redeem a one-time recovery code.

All state-changing routes require authenticated ownership, CSRF/same-origin protection, strict validation, rate limits, audit events, and short-lived single-use challenge tokens. Do not trust client-provided role, risk score, factor status, or verification outcome.

## 14. Threat model and required mitigations

| Threat | Required mitigation |
|---|---|
| Shoulder surfing / screen recording | Warn before reveal/export; allow rotation; do not display the secret during later challenges |
| Stolen PNG or clipboard history | Explicit export warning; local-only generation; rotation and revocation |
| Online guessing | High-entropy generated sequence, rate limits, progressive delays, alerts |
| Phishing / replay | Bind step-up challenges to a purpose, account, session, and short expiry; use WebAuthn for phishing resistance |
| Database leak | Slow salted KDF verifier; no plaintext secret; separate credentials |
| Insider access | No secret retrieval endpoint; least privilege; audit access to security administration |
| Account recovery abuse | Independent proof, notifications, delays/review for exceptional recovery |
| Accessibility failure | Symbol/shape alternatives; never color-only |
| Session theft | Short-lived sessions, revocation, auth-version checks, re-authentication for sensitive actions |

## 15. Implementation sequence and release gates

1. **Architecture review:** confirm account identity model, roles, session lifecycle, existing rate limits, audit conventions, and legal/privacy retention requirements.
2. **Security foundation:** factor lifecycle, challenge state machine, KDF decision, rate limits, notifications, recovery policy, and tests.
3. **Passkeys/TOTP:** implement and verify independent factors before treating VSC as meaningful supplemental protection.
4. **VSC enrollment and verification:** accessible generation, confirmation, protected verifier, step-up challenge, rotation, revocation.
5. **Local export UX:** PNG download, clipboard image copy, print, warnings, and reminder-card option; test supported browser/device behavior.
6. **Account settings UX:** Standard / Enhanced / Strict profile with clear status and policy explanations.
7. **Staged rollout:** test environment first, security review, migration backup/restore evidence, controlled production rollout, post-deploy verification.

Release gates:

- Unit, integration, migration, authorization, abuse/rate-limit, recovery, accessibility, and browser compatibility tests pass.
- No secret appears in logs, telemetry, database plaintext, API responses, or repository artifacts.
- Step-up challenge is single-use, purpose-bound, time-limited, and server-verified.
- Existing admin and employee sign-in flows remain functional.
- Production migration and rollback/restore readiness are independently verified before deployment.
- No production deployment occurs merely because a PR is merged.

## 16. Explicit non-goals and unresolved decisions

Not included in v0.1:

- Age verification or age estimation.
- Public registration or identity proofing.
- Employee onboarding/invitations and organization RBAC.
- Passwordless-only authentication.
- Device fingerprinting as an identity factor.
- Storing exported images on TRAMPILLERA infrastructure.
- Claiming that VSC is MFA.

Before implementation, decide:
- Exact public-account and employee-account identity mapping.
- Whether VSC is enabled for all account classes or only selected classes.
- KDF parameters and whether Argon2id can be adopted safely.
- Recovery review policy and notification channels.
- Retention periods and privacy basis for security event metadata.
- Browser/device support matrix for image clipboard export.


## 18. Implementation status — 2026-11-25

The following first implementation slice is present on the draft PSL branch and is not deployed to production:

- TOTP enrollment and login challenge for administrator and employee accounts.
- VSC enrollment and confirmation using six positions selected from ten named visual tokens.
- Tokens combine color, glyph, and text label; color alone is never the identifier.
- VSC is generated in the browser using the Web Crypto random source.
- VSC verifier is stored as a salted scrypt-derived verifier. The submitted sequence is not stored in plaintext.
- Local PNG card generation and clipboard image copy are available behind explicit warnings. The image contains the full visual secret and must be treated as a credential.
- VSC is checked before TOTP when both factors are enabled. Successful VSC verification alone does not represent independent MFA.
- VSC login verification and enrollment/removal attempts have rate limits and per-factor temporary lockout.
- Enrollment and revocation are audit-recorded without including sequence material.

The following remain incomplete and block production release:

- Recovery codes and lost-device/account recovery.
- Reviewed key rotation and disaster recovery procedures for encrypted TOTP secrets.
- Browser-level tests and dedicated end-to-end tests for VSC and combined VSC+TOTP login.
- A reviewed security policy for trusted devices and risk-based step-up beyond the current opt-in login challenge.
- Accessibility review on real assistive technologies and multiple browsers.
- Public registration and age assurance; these remain separate systems.
- Security review and production rollout plan.

A VSC sequence has 10^6 possible combinations (approximately 19.9 bits) and is a memorized knowledge secret. It is supplemental protection only, not a replacement for TOTP, passkeys, or other independent factors. A downloaded/copied PNG is a full credential copy; the platform cannot control OS screenshots, clipboard history, gallery synchronization, or cloud backups.

## 17. Recovery & Key Management Desk — implementation status (2026-11-25)

### Implemented foundation (PR #27; not production-enabled)

- Added `account_recovery_codes` as an additive migration. It stores a per-code verifier and lifecycle timestamps only; it has no plaintext-code column.
- Added secure random recovery-code generation (10 codes by default, 192 random bits before display normalization), unique per-code salts, scrypt verifiers, and timing-safe verifier comparison.
- Added versioned TOTP envelope primitives. New `v2` envelopes bind the key ID as authenticated additional data and identify the encryption key required for decryption.
- Added a keyring API that can retain old key IDs while a new active key is used for re-encryption.
- Added a compatibility reader for the existing `v1` envelope, provided the legacy key is explicitly supplied.
- Added tests for recovery-code generation/verification, malformed input, key-ID lookup, v1 compatibility, and v2 re-encryption.

### Explicitly not implemented

- No recovery-code generation, display, redemption, or regeneration API is wired into the application.
- No recovery-code one-time-consumption transaction or login fallback is wired yet. The database lifecycle fields are groundwork, not proof of replay prevention.
- No factor reset, account recovery review, owner notification, or session invalidation workflow is implemented.
- No production keyring format, secret-manager integration, key custody procedure, key backup, or operator runbook is configured.
- No database-wide TOTP re-encryption job or rollback procedure is implemented or executed.
- The existing `PSL_ENCRYPTION_KEY` and production Render configuration remain unchanged. Do not rotate or replace the legacy key until a reviewed migration job has re-encrypted and verified every active TOTP envelope and a tested rollback path exists.

### Required next gates

1. Define the deployment secret-manager representation for key IDs and key material; keep key material out of PostgreSQL, source control, logs, and application responses.
2. Implement a bounded, resumable, auditable TOTP re-encryption job with dual-read compatibility, per-row verification, and a rollback plan. Retain the old key until every active envelope is verified under the new key.
3. Implement code generation and one-time redemption in database transactions. Redemption must lock the selected unused row, compare its verifier, mark it consumed atomically, and reject concurrent/replayed use.
4. Require current primary-password proof before issuing recovery codes. Show plaintext only once; regeneration must revoke all previous unused codes atomically.
5. Design recovery factor-reset policy separately. Recovery must revoke affected factors, increment the account auth version, invalidate active sessions, and require fresh factor enrollment where policy requires it.
6. Add browser/UI, concurrency, replay, failure, migration, and restore tests; complete independent security review before production rollout.

**Release status:** Foundation code and CI tests are being added to the draft PR. Recovery is not yet available to users; key rotation has not been performed; production remains unchanged.


## 18. Recovery API — transactional implementation status (2026-11-25)

### Implemented in the draft branch

- Recovery codes use a public, non-secret 64-bit selector and a separate 192-bit random secret. The selector locates one row; only the secret's per-code salted scrypt verifier is stored.
- `POST /api/auth/recovery-codes` requires an authenticated account, current password, and every currently active factor (VSC sequence and/or TOTP code). It replaces the entire unused code set in a transaction and returns the new codes once.
- Regeneration revokes all prior unused codes before inserting the new set. The response explicitly warns that plaintext is not retrievable later.
- `POST /api/auth/recovery/reset` supports administrator and employee account recovery using password plus selector/secret code.
- Redemption locks the account row and selected recovery-code row, verifies the code, consumes it atomically, revokes all remaining recovery codes, revokes active and pending VSC/TOTP factors, increments the account authentication version, and writes an audit event without secret material.
- Authentication-version increment invalidates existing administrator or employee sessions. Recovery response requires a fresh password sign-in; factors must then be re-enrolled as appropriate.
- API rate limiting applies to both recovery endpoints. Recovery responses inherit `Cache-Control: no-store`.

### Release limitations

- Recovery API is implemented and covered by CI integration tests, but there is not yet a browser UI for displaying, printing, or downloading recovery codes. A user-facing screen must make the one-time display and safe-storage warning explicit.
- No independent security review has been completed. Recovery must not be enabled in production until the UI, concurrency/replay review, rate-limit policy, and operational incident runbook are reviewed.
- Strict-profile enforcement and mandatory post-recovery factor enrollment are not yet enforced by the authentication policy. Current recovery revokes factors and forces a new sign-in, but the platform does not yet prevent use of password-only authentication afterward.
- Keyring primitives remain library-only. The live TOTP path still uses the legacy `PSL_ENCRYPTION_KEY` v1 envelope; no keyring environment format, batch re-encryption job, key custody, backup, or rotation has been deployed or executed.
