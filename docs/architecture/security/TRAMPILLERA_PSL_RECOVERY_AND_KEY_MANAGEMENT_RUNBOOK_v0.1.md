# TRAMPILLERA PSL — Recovery & Key Management Runbook v0.1

Status: DESIGN / NOT AUTHORIZED FOR PRODUCTION EXECUTION  
Applies to: Personal Security Layer (PSL), administrator and employee accounts  
Related PR: #27 — Personal Security Layer

## 1. Purpose and safety boundary

This runbook defines the controlled recovery and encryption-key lifecycle for PSL. It is an operational design, not evidence that production recovery or key rotation has been executed.

Required invariants:

- EXECUTED is not VERIFIED.
- UNKNOWN is neither PASS nor FAIL.
- No plaintext recovery code, TOTP secret, encryption key, password, or one-time challenge may enter logs, analytics, audit details, issue comments, or support tickets.
- Production key changes require an approved change window, a verified backup/restore path, and an independently reviewed rollback plan.
- Never replace or delete the current encryption key in place.

## 2. Recovery-code lifecycle

### Issuance

1. Require an authenticated session, current account password, and successful verification of every currently active factor.
2. Generate a bounded set of high-entropy one-time codes using a cryptographically secure random generator.
3. Store only a non-secret selector and a per-code salted password-hash verifier. Never store the complete code.
4. Display the plaintext set exactly once. The UI must explicitly state that the user must save it before leaving the page.
5. Regeneration revokes all prior unused codes and creates a new set atomically.
6. Audit only the account reference, operation, timestamp, and outcome. Never include a selector, code, verifier, or request body.

### Redemption and factor reset

1. Require account identifier, current password, and one recovery code.
2. Apply rate limits and generic failure messages; do not reveal whether the account, selector, or secret portion matched.
3. In one database transaction, lock the account and selected unused code row.
4. Verify the code in constant time; mark it consumed; revoke all other unused recovery codes.
5. Revoke all active and pending security factors.
6. Increment the account authentication version so all prior sessions and pending authentication challenges become invalid.
7. Commit the transaction before reporting success.
8. Require a fresh password sign-in and new factor enrollment. The recovery operation must not create an authenticated session.

### Concurrency and abuse controls

- Row locking must ensure that concurrent submissions of the same code result in at most one successful redemption.
- Rate limiting must be applied before expensive password-hash verification and must be scoped to account and source/network risk without trusting spoofable forwarding headers.
- Monitor aggregate failure patterns without recording submitted codes or secrets.
- Do not allow a recovery code to be used as an ordinary login factor or to bypass the account password.

## 3. Recovery user experience requirements

- Show codes once, with clear copy/download/print controls and a warning that these controls place credentials on the user's device.
- Never send recovery codes through email, chat, analytics, or third-party integrations.
- Provide a confirmation step that the user has saved the codes before closing the display; do not treat that confirmation as proof of secure storage.
- Provide a clear state showing how many unused codes remain, but never redisplay the codes.
- Regeneration must require current password and every active factor, and must warn that the previous set becomes invalid immediately.
- Recovery completion must clearly explain that all existing factors were revoked and that new factors must be enrolled after signing in again.
- UI must be keyboard accessible, screen-reader labelled, high-contrast, and not rely on color alone.

## 4. TOTP encryption key model

### Current compatibility boundary

The application currently has a legacy TOTP encryption path driven by `PSL_ENCRYPTION_KEY`. The versioned keyring module provides v2 envelope primitives and a v1 compatibility reader. These primitives are not, by themselves, a production key-management system or a completed database migration.

### Target keyring configuration

- Use a dedicated secret-manager entry for each key version; never place key material in source control, database rows, logs, build artifacts, or client-side code.
- Configure an explicit active key ID and a map of retained key IDs to 32-byte random keys.
- Each v2 envelope must authenticate the version and key ID as AEAD associated data.
- The key ID is an identifier, not a secret.
- Keep old keys available for decryption until every dependent record has been re-encrypted, verified, and the rollback window has closed.
- Separate runtime permissions for reading active keys from operator permissions for creating, retiring, and rotating keys.

## 5. Controlled rotation procedure

Rotation is blocked until all preconditions are met.

### Preconditions

- Confirm the exact production deployment commit and current environment configuration.
- Establish a verified database backup and a tested restore into an isolated environment.
- Confirm a secure, access-controlled secret-manager location for old and new key versions.
- Inventory all encrypted TOTP rows and supported envelope versions without exporting plaintext.
- Test the migration against a production-like copy and record counts/checksums that do not disclose secrets.
- Approve a maintenance window and name an operator and independent reviewer.

### Execution design

1. Add the new key as a retained key; do not remove or overwrite the old key.
2. Deploy a version that can decrypt both old and new envelopes and encrypt newly created TOTP secrets with the new active key.
3. Run a resumable, idempotent batch migration using bounded transactions. For each row: decrypt with its recorded key/version, encrypt under the new active key, update only if the row still has the expected old ciphertext/version, and record non-secret progress.
4. Re-read every migrated row and verify successful decryption with the new key. Compare the total eligible, migrated, skipped, and failed counts.
5. Keep old key material available throughout the rollback window. If any verification fails, stop the job and retain the old key; do not mark rotation complete.
6. After independent verification and an approved retention period, retire the old key in a separate change. Destruction requires explicit approval and documented evidence that no active record references it.
7. Preserve a tested recovery procedure for restoring the previous application version and keyring configuration.

### Rollback

- Stop the batch job.
- Keep both keys available.
- Restore the previous active-key setting only if the previous application version can safely read all envelope versions already written.
- If mixed envelope versions exist, use a compatible dual-read application; never blindly roll back to a v1-only binary.
- Reconcile database state from the verified backup only under an approved incident procedure.
- Record what was restored and what remains unknown.

## 6. Disaster recovery and key loss

- Database backups without the corresponding encryption keys are insufficient to restore TOTP capability.
- Key backups must be encrypted, access-controlled, separately recoverable, and periodically restore-tested.
- Loss of all keys capable of decrypting active TOTP envelopes requires a controlled factor reset/re-enrollment process; it must not silently report successful decryption or authentication.
- Recovery codes are not a substitute for encryption-key backups.
- Never claim a successful restore based solely on the existence of a backup artifact.

## 7. Required release gates

The PSL recovery/key-management work must remain non-production until all gates are evidenced:

- [ ] Browser UI for one-time recovery-code display, download/copy, and recovery flow.
- [ ] Browser automation for issuance, regeneration, recovery, replay rejection, and concurrent redemption.
- [ ] Independent review of authentication, lockout, rate limiting, transaction boundaries, and session invalidation.
- [ ] Operational keyring configuration backed by an approved secret manager.
- [ ] Resumable database re-encryption job with dry-run, bounded batches, idempotency, and non-secret progress records.
- [ ] Rotation verification and rollback rehearsal on a production-like copy.
- [ ] Backup and restore rehearsal including key recovery.
- [ ] Accessibility review with keyboard and assistive technology.
- [ ] Explicit production change approval.

## 8. Current evidence statement

As of this document's creation:

- CI run #211 passed static checks, Compose validation, Docker/PostgreSQL startup, migrations, and API integration flows for administrator and employee VSC/TOTP and recovery-code issuance/regeneration/redemption/session invalidation.
- Unit tests cover recovery-code hashing/verification and versioned TOTP envelope primitives, including v1 compatibility.
- Browser recovery UI, operational secret-manager wiring, database-wide key rotation, production backup/restore rehearsal, independent security review, and production deployment are NOT verified.
- No production database migration or Render deployment is authorized by this runbook.
