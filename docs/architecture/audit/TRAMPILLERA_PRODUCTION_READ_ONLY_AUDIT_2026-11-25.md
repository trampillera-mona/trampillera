# TRAMPILLERA — Production Read-Only Functional Audit

**Date:** 2026-11-25  
**Audit type:** Read-only production / source / CI inspection  
**Audited release:** `cabff4881b062292aa1809cad1c87c9eef3a5676`  
**Render service:** `srv-dc1g90cs728c73cc019g` (`trampillera`)  
**Render database:** `dpg-dc1fodd9fdbs73anpmj0-a` (`trampillera-db`)  
**Scope boundary:** No application source, production database data, secrets, environment variables, or Render configuration were changed. No deployment was triggered by this audit.

## 1. Executive result

The release is present as the current live Render deployment and its matching GitHub Actions verification run completed successfully. PostgreSQL is available and contains the expected application tables. The audit did **not** establish end-to-end browser operation against the public domain: direct HTTP access to the public host was unavailable to the audit environment, and Render request logs / HTTP metric series returned no request samples in the inspected interval.

This is therefore a **verified build and deployment, with partial runtime evidence**, not a claim that every public page and browser interaction has been manually validated.

## 2. Release and CI evidence

- GitHub `main` HEAD at inspection: `cabff4881b062292aa1809cad1c87c9eef3a5676`.
- Render latest deployment: `dep-dc39olnavr4c73epd8k0`, status `live`, commit matches the audited SHA.
- Render event history reports successful build and deployment.
- Render application logs show Node starting and listening on port `10000`; Render reports the service live.
- Deployment trigger recorded by Render as a manual action from the workspace owner's Render account. This audit did not trigger it.
- GitHub Actions run `45575623559`, workflow `TRAMPILLERA verification`, completed with conclusion `success` on the exact audited SHA. Job `verify-and-smoke-test` passed all steps, including static checks, source-preservation checks, Compose validation, and the PostgreSQL-backed application smoke test.
- GitHub combined commit status also reports the Vercel check as successful.

## 3. Render service configuration

Observed service configuration:

| Property | Observed value |
|---|---|
| Service | `trampillera` |
| Runtime | Docker / Node.js 22 image |
| Region | Frankfurt |
| Plan | Free |
| Instances | 1 |
| Branch | `main` |
| Root directory | `app/` |
| Auto deploy | Off |
| Health check path | Empty / not configured |
| Public URL | `https://trampillera.onrender.com` |
| Primary custom domain shown in deploy log | `https://trampillera.com` |

**Operational recommendation:** configure Render's service health-check path to `/ready`. The application implements this route and checks PostgreSQL with `SELECT 1`. This is a proposed configuration change only; it was not applied.

## 4. PostgreSQL state

Observed database configuration:

- PostgreSQL 18, Frankfurt, plan `free`, status `available`.
- No Render connection pool, no read replicas, high availability disabled.
- The database metadata reports expiry at **2026-12-22 14:29:09 UTC**.
- IP allow list currently contains `0.0.0.0/0` (all IPv4 sources).
- Backup / point-in-time recovery capability was not verified in this read-only pass.

Read-only SQL inspection found 13 application tables:
`admin_auth_state`, `audit_events`, `employees`, `growth_campaign_events`, `growth_campaigns`, `mission_assignments`, `mission_messages`, `model_providers`, `platform_connectors`, `platform_modules`, `site_pageviews`, `site_visitors`, `team_missions`.

Observed row counts at inspection time:

| Data set | Count |
|---|---:|
| Platform modules | 4 |
| Connectors | 2 |
| Model providers | 3 |
| Audit events | 38 |
| Visitor-day records | 3 |
| Pageviews | 7 |
| Growth campaigns | 0 |
| Campaign click events | 0 |
| Employees | 0 |
| Team missions | 0 |

The zero counts for campaigns, employees, and missions mean no such records had been created in this database at inspection time; they do not by themselves indicate a schema or service failure.

**Priority operational actions (not applied):**
1. Plan migration from the expiring Free database to a non-expiring paid database before 2026-12-22. Preserve and verify a backup/export before any cutover.
2. Review database network exposure. Prefer private/internal service connectivity where supported and restrict public IP allow-list entries to known required sources. Do not change the allow list until the application's actual connection path is confirmed.
3. Verify backup and restore procedures with a tested restore, not merely the existence of a backup setting.

## 5. Application source and security controls

Source inspection confirms implementation of:

- PostgreSQL-backed module, connector, model-provider, audit, employee, team-mission, and audience-growth tables.
- Administrator authentication state with password fingerprint versioning and session invalidation after credential rotation.
- Employee session checks against active state and auth version.
- Eight-hour absolute / thirty-minute idle session bounds.
- HTTP-only, SameSite Strict session cookie; the Secure flag is controlled by `COOKIE_SECURE=true`. The live environment value was not independently read in this audit.
- Same-origin checks for state-changing `/api` requests and API rate limits, including a stricter login limit.
- `/api/health` and `/ready` database connectivity probes.
- Public aggregate analytics counter and consent-gated client-side visit tracking. The tracker uses a pseudonymous browser token, HMAC-derived server-side identifier, and does not write raw IP addresses to the analytics tables.

The public HTTP endpoints could not be reached from the audit environment, so their live response codes and live cookie headers were not independently sampled.

## 6. Language and voice

Source and CI evidence confirms:

- 12 declared locales: EN, RU, SR, DE, FR, ES, IT, PT, ZH, JA, KO, AR.
- Unique BCP-47 tags, with Arabic RTL direction.
- Shared language / voice controls included by the seven primary interfaces.
- Automated tests cover locale catalog uniqueness, shared-control vocabulary, representative voice-navigation phrase matching in all 12 locales, unknown-command fallback, and same-origin microphone permission delegation.
- Browser Web Speech recognition and speech synthesis are used; voice availability depends on browser, OS, device, permissions, and installed voices.

**Important boundary:** 12 selectable locales and shared voice-navigation phrases do not mean the whole product is fully translated. The language audit explicitly records incomplete translation coverage across editorial content, Control Plane forms, Workspace, Team Missions, Campus, and Multiverse. Real-device microphone and speech tests remain open. No server-side ASR/TTS adapter or offline recognition is claimed.

## 7. AI provider boundary

The provider adapter source supports modular Qwen and OpenAI configuration, validates HTTPS endpoints and provider-specific paths, and normalizes response text and usage fields.

A live provider request was not made. API credentials were not read or exposed. Provider connectivity and successful model inference therefore remain **UNKNOWN**. The platform registry's presence of a model provider is not proof of a working external integration.

## 8. Runtime telemetry limits

- Render application logs in the inspected post-deploy window show successful process startup and no error-level entries.
- The request-log query returned no request records in the inspected interval.
- Render HTTP request-count and latency metric series returned no samples in the inspected interval.
- Several process shutdown/startup log pairs are present in the broader log history. No corresponding failed deploy event was found in the inspected event page; the cause of those restarts was not established.

No public-page browser session, real login, voice capture, AI inference, campaign redirect, or end-user workflow was performed against production during this pass.

## 9. Findings and priority

| Priority | Finding | Evidence / next action |
|---|---|---|
| P0 | Free PostgreSQL database expires 2026-12-22 | Migrate before expiry; backup and restore-test first |
| P1 | Database IP allow list is `0.0.0.0/0` | Review and narrow after confirming connectivity path |
| P1 | Render health check path is empty | Consider setting `/ready` |
| P1 | Backup / restore status unknown | Verify backup availability and perform a restore drill |
| P1 | Public HTTP / browser smoke test not established | Run external checks for portal, health, readiness, auth, and static modules |
| P2 | Full translation coverage incomplete | Implement complete locale catalogs and UI-key coverage checks |
| P2 | Real-device speech testing incomplete | Test supported browser/device combinations and document limitations |
| P2 | Live AI provider connectivity unknown | Validate provider credentials and perform a controlled test request without exposing secrets |
| P2 | Growth campaigns and team data are empty | Create deliberate production records only when operationally ready |

## 10. Verification rule

Statuses in this report distinguish:
- **PASS** — directly confirmed by CI, Render deployment metadata/logs, or read-only database query.
- **PARTIAL** — implementation exists and automated checks pass, but production/browser behavior was not directly observed.
- **UNKNOWN** — no sufficient evidence was available.

No simulated success is reported. No production write or deployment was performed as part of this audit.
