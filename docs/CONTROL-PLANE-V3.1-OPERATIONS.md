# TRAMPILLERA Control Plane v3.1 — Operational Workspaces

## Purpose

The Control Plane is an authenticated operational workspace backed by the existing Express API and PostgreSQL database. It replaces the v3.0 browser-seeded dashboard with persisted records and explicit evidence boundaries.

The former v2.1 Control Plane UI is retained at `/control/index-v2.1.html` as a rollback/reference copy. The new UI is served at `/control/`.

## Implemented

- 19 operational record domains: analytics, connectors, AI/JARVISER, property, auctions, commerce, AdTech, communications, support, media, worlds, engineering, infrastructure, people, tasks, treasury, payroll, IP and governance.
- PostgreSQL table `control_records` with UUID record key, JSONB payload, lifecycle status, integer version, actor fields and timestamps.
- Authenticated domain catalogue, summary, list, create, update and per-record audit-history endpoints.
- Domain-specific lifecycle transition maps. New records start in the first state; updates must follow an allowed transition.
- Optimistic concurrency: clients must submit `expectedVersion`; stale updates return HTTP 409.
- Create/update and corresponding `audit_events` insert occur in one PostgreSQL transaction.
- Same-origin Origin check on operational write/read router requests.
- Search/filter in workspaces, domain counts, recent audit view, diagnostics and recovery runbook.
- UI dashboard values are derived from PostgreSQL/API responses. No v3.0 seeded metrics are carried into the new dashboard.

## API

All routes below require the existing administrator session cookie.

| Method | Route | Behavior |
|---|---|---|
| GET | `/api/control/operations/domains` | Domain definitions, allowed statuses and next transitions |
| GET | `/api/control/operations/summary` | Persisted counts and internal ledger summary |
| GET | `/api/control/operations/records?domain=tasks` | List records for one domain |
| GET | `/api/control/operations/records/:id/history` | Audit history by record UUID |
| POST | `/api/control/operations/records` | Create a record and audit event atomically |
| PATCH | `/api/control/operations/records/:id` | Update title/status/payload with version check and atomic audit |

### Create request

```json
{
  "domain": "tasks",
  "title": "Prepare launch checklist",
  "status": "OPEN",
  "payload": {
    "owner": "Operations",
    "reference": "REL-001",
    "description": "Prepare release acceptance checklist"
  }
}
```

The server generates the UUID record key. New records must use the domain's initial lifecycle state.

### Update request

```json
{
  "expectedVersion": 1,
  "status": "IN_PROGRESS"
}
```

A stale version or invalid lifecycle transition returns HTTP 409. The UI must refresh before retrying.

## Lifecycle and financial boundaries

- A record is not proof that an external service has executed an operation.
- `APPROVED` in Treasury or Payroll means an internal approval state only. It does not send money.
- No payment provider, bank API, crypto wallet or escrow provider is connected.
- No external connector probe is performed by registry syntax validation.
- JARVISER provider metadata does not prove credentials, routing, inference or agent execution.
- `VERIFIED` is available only as a domain state; it must not be selected without supporting evidence and a future verification workflow.
- The audit table is transactionally written with new operational records, but cryptographic append-only enforcement and tamper-evident chaining are not implemented.

## Identity and permissions

This release uses the existing single administrator session. The People workspace is an operational personnel directory, not a user-account or authentication system. Multi-user accounts, invitations, granular RBAC, approval separation and per-user actor attribution remain future work. Do not treat the UI's personnel records as login identities.

## Recovery and deployment

- Source recovery branch: `recovery/pre-db-migration-2026-11-23`.
- That branch is a source-code checkpoint only, not a PostgreSQL backup.
- Database table creation is additive and occurs on application startup.
- No Render environment variables, service settings, deployment or production PostgreSQL data were changed by this branch.
- Render Auto Deploy remains operator-controlled; the PR must be reviewed and merged before the operator manually deploys.
- Database backup and restore state remains `UNKNOWN` until an independent backup and restore test are evidenced.

## Verification

The GitHub Actions workflow performs:
1. Node syntax checks for `server.js` and `operations.js`.
2. Original-source preservation checks.
3. Inline Control Plane browser JavaScript syntax check.
4. Docker Compose configuration validation.
5. Docker build and application startup against a disposable PostgreSQL service.
6. Authenticated operational API smoke test: domain list, summary, record create, allowed lifecycle transition, rejected invalid transition and audit event persistence.

Passing CI verifies the tested container workflow only. It does not verify a Render deployment or the production database.
