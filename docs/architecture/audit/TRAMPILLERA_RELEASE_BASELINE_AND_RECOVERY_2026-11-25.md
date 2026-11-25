# TRAMPILLERA — Release Baseline, Recovery Point & Deployment Readiness

**Snapshot date:** 2026-11-25  
**Repository:** `trampillera-mona/trampillera`  
**Production branch:** `main`  
**Deployment policy:** operator-controlled; no automatic production deployment from this change record.

## 1. Recovery point

A Git recovery branch was created before the documentation update:

- **Branch:** `recovery/pre-inventory-2026-11-25`
- **Base branch:** `main`
- **Base commit:** `3104e88219f004cb195dbbe449253d9f193206b2`
- **Base commit URL:** https://github.com/trampillera-mona/trampillera/commit/3104e88219f004cb195dbbe449253d9f193206b2
- **Recovery branch URL:** https://github.com/trampillera-mona/trampillera/tree/recovery/pre-inventory-2026-11-25

The branch is a source-control recovery point. It is not a PostgreSQL backup, Render snapshot, or proof of database recoverability. Database backup and restore status remains UNKNOWN until an actual backup is identified and a restore exercise is completed.

## 2. Baseline commit and recent implementation history

Baseline `main` HEAD at the start of this work: `3104e88219f004cb195dbbe449253d9f193206b2`.

Recent commits in the baseline history include:

| Commit | Recorded implementation |
|---|---|
| `3104e882` | Register audience.growth module and improve campaign UTM attribution |
| `1d0bd4b` | Add opt-in pseudonymous visitor intelligence and promotion campaign desk |
| `5dde7ea` | Restore federated architecture and shared language/voice foundation |
| `14b2e73` | Enforce audited module lifecycle transitions |
| `64a3dbb` | Add Qwen-first AI adapter and evidence-scoped platform status |
| `d0c1553` | Revoke administrator sessions on credential rotation |
| `f3c272a` | Require verified origin for state-changing API requests |
| `8f40f85` | Harden sessions and team collaboration |

The detailed code diffs and tests remain in Git history. This document is a navigation and release record, not a replacement for those commits.

## 3. Verified repository-level implementation baseline

The source and documentation establish the following implemented or partially implemented areas:

- Node.js 22 / Express application, Dockerized, with PostgreSQL persistence.
- Public portal, authenticated Control Plane, shared HTTP API, module/provider/connector registries, and audit events.
- Database-aware `/api/health` and `/ready` endpoints.
- Administrator session versioning tied to an HMAC fingerprint of the configured password; credential rotation invalidates prior administrator sessions.
- Employee account/session controls, password-change enforcement, idle/absolute session expiry, and transactional audit records for consequential team actions.
- Same-origin / Origin-or-Referer checks for state-changing API requests.
- Team Game with server-backed missions, assignments, discussion polling, submissions, administrator verification, and XP awarded only after verification.
- Qwen Model Studio adapter as default and OpenAI adapter as explicit alternative; credentials remain server-side.
- Twelve declared locale options and shared language/voice controls with automated source tests.
- Consent-based first-party audience measurement using a pseudonymous HMAC-derived identifier, aggregate visitor/page-view reporting, and tracked campaign redirects with UTM source/medium/campaign attribution.
- Module lifecycle changes require explicit permitted target states and operator notes, with mutation and audit insert in a transaction.

These are repository implementation statements. They do not independently prove production runtime health, external service reachability, successful live AI inference, every language translation, or browser/device voice compatibility.

## 4. Important capability boundaries

| Area | Current evidence-scoped status | Do not claim |
|---|---|---|
| JARVISER | PARTIAL: single-turn server-side AI request adapters | A complete multi-agent orchestration runtime, durable queue, or 53 live models |
| Provider registry | PARTIAL: catalogue plus Qwen/OpenAI adapters | Every catalogue entry is configured, executable, or reachable |
| Language | PARTIAL: 12 locale options and shared vocabulary/tests | Complete translation of every page and dynamic content |
| Voice | PARTIAL: browser speech APIs and permission boundary | Universal ASR/TTS or offline voice support on every device |
| Team Game | PARTIAL / implemented bounded collaboration loop | Full HR, project management, or real-time presence suite |
| Workspace/Campus/Multiverse | DEMO / PARTIAL, mainly browser-local | Shared server persistence or synchronized employee identity |
| Comms / Scene Studio | Prototype | Persistent E2EE messaging or server-backed collaborative scene editing |
| C2PA / watermark / Honeytoken / Security Shield | DEMO / UNKNOWN pending independent verification | Cryptographic provenance or active security protection |
| Radio / TV / RSS / Globe / 3D FUI | PARTIAL; external and browser runtime dependencies | Every stream, feed, and spatial interaction is live and healthy |
| Backup / restore | UNKNOWN | Recoverable database backup until a restore test is evidenced |

The governing status vocabulary is REAL / PARTIAL / DEMO / NOT IMPLEMENTED / UNKNOWN, with operational execution states kept separate: PENDING / EXECUTED / VERIFIED / FAILED / UNKNOWN.

## 5. Language and voice note

The current locale selector declares EN, RU, SR, DE, FR, ES, IT, PT, ZH, JA, KO, and AR. Shared language controls and a common voice-command vocabulary are tested in CI. Translation coverage remains incomplete across the public portal, Control Plane, ITY CITY, Workspace, Team Missions, Campus, and Multiverse. Voice recognition and synthesis depend on browser, OS, installed voices, secure context, and user permission. No microphone activates automatically. Real-device/browser test coverage remains outstanding.

## 6. Audience measurement and promotion privacy note

The audience module is opt-in. A random first-party browser token is stored locally after consent; the server stores an HMAC-derived identifier. The analytics database does not store raw IP addresses or full referrer URLs. It stores aggregate/attribution fields such as page path, referrer hostname, UTM fields, and timestamps. Visitors can choose Essential only and continue using the portal.

Known follow-up: implement and document retention, consent withdrawal/deletion workflow, and a reviewed public privacy notice before scaling public marketing.

## 7. CI and verification evidence at snapshot time

The repository contains `scripts/check.sh` and `.github/workflows/verify.yml`. The workflow covers syntax checks, provider tests, source-preservation checks, locale/voice tests, analytics/growth tests, Docker Compose validation, PostgreSQL-backed startup, health checks, admin/team flows, campaign attribution, and selected security invariants.

At the baseline commit, the GitHub combined commit status returned a successful Vercel status. That status is not equivalent to a successful GitHub Actions verification run. A fresh CI run for the final documentation commit must be inspected before production deployment. Source-level CI coverage is not a substitute for real browser/device tests.

## 8. Render deployment boundary

Last known operator configuration from the project deployment workflow (must be rechecked in Render before issuing a deployment command):

- Service: `trampillera`
- Runtime: Docker
- Region: Frankfurt
- Root Directory: `app`
- Dockerfile Path relative to Root Directory: `Dockerfile`
- PostgreSQL: required; use the service's internal database URL in the same region.
- Auto Deploy: OFF / manual operator-controlled deployment.
- Required application settings include `ADMIN_PASSWORD`, `SESSION_SECRET`, and `DATABASE_URL`; HTTPS production requires `COOKIE_SECURE=true` and trusted proxy configuration as appropriate.
- Qwen inference requires `AI_PROVIDER=qwen`, `QWEN_API_KEY`, and the workspace-specific `QWEN_API_URL`. Do not put credentials in Git.

Do not deploy until the final Git commit, GitHub Actions result, Render service settings, PostgreSQL connectivity, and required environment variables have been checked. Do not change production secrets or database configuration as part of a documentation-only release.

## 9. Release acceptance checklist

- [ ] Recovery branch exists and points to the pre-change baseline.
- [ ] Documentation and module inventory reflect the current source baseline.
- [ ] No secrets, personal credentials, or partner-confidential data are committed.
- [ ] GitHub Actions verification for the final commit succeeds.
- [ ] Docker build and PostgreSQL smoke tests succeed.
- [ ] Render service configuration and current deployed commit are rechecked.
- [ ] Database backup existence and restore procedure are verified separately.
- [ ] Operator approves production deployment.
- [ ] After deployment: verify deployed commit, `/ready`, `/api/health`, public portal, Control Plane login, Team Game, analytics consent/counter, and campaign redirect without changing real employee records.

## 10. Deployment status

**No Render deployment was performed by this documentation update.** The recovery branch preserves the pre-change Git state. Production remains under explicit operator control. A deployment command must be issued only after the final commit and its verification results are known.


## 11. Render state observed during this work

Read-only inspection of the connected Render workspace on 2026-11-25 confirmed:

- Workspace: `My Workspace` (`tea-dc1fbb59fdbs73ampppg`).
- Service: `trampillera` (`srv-dc1g90cs728c73cc019g`).
- Service URL: https://trampillera.onrender.com
- Branch: `main`; Auto Deploy: OFF; manual deploy trigger.
- Runtime: Docker; root directory: `app/`; Dockerfile path relative to that root: `Dockerfile`.
- Region: Frankfurt; one Free instance.
- Latest observed deploy: `dep-dc30q7gu01pc73d9d1e0`, status `live`, commit `3104e88219f004cb195dbbe449253d9f193206b2`.

The six commits created in this documentation pass advance `main` from `3104e882` to `929b7f7`. A GitHub compare confirms that the only changed paths are `README.md` and documentation under `docs/architecture/`; there are no changes under `app/`, Docker build files, or runtime configuration.

**Deployment decision:** do not trigger a Render deploy for this documentation-only change. Render's configured root directory is `app/`, so the new documentation files are outside the service's Docker build context and do not change the running application. The existing live application commit remains `3104e882`. A Render deploy becomes appropriate only after an intentional runtime/code change under `app/` (or a deliberate build/deployment configuration change), followed by the required verification and operator approval.

The combined GitHub status for intermediate commit `7fb308e` reported a successful Vercel check. The final documentation commit `929b7f7` currently has no combined status entries. The available GitHub integration did not expose a GitHub Actions run result for this push; therefore GitHub Actions verification for the final HEAD is recorded as **UNKNOWN**, not PASS.
