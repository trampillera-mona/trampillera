# Control Plane Workspace v2

## Purpose

The authenticated Control Plane is an API-backed administration workspace for the TRAMPILLERA platform. It is intentionally separate from the public-facing platform UI.

## Navigation

- **Overview** — PostgreSQL registry counts, configured connector count, recent audit events, and execution-integrity boundaries.
- **Modules** — register module metadata and advance the existing registry lifecycle.
- **Connectors** — register connector metadata and validate endpoint syntax.
- **Model Registry** — register provider/runtime metadata. This does not execute inference.
- **Activity Log** — inspect and filter the latest audit events returned by the API.
- **Diagnostics** — read-only checks against `/api/health`, `/ready`, and the authenticated settings endpoint.
- **Settings** — read-only runtime/configuration inventory; secret values are never exposed.
- **Runbook** — release, recovery, and operational guidance.

## Evidence semantics

- A registry record proves that metadata is stored, not that the underlying module/provider is operational.
- Module lifecycle transitions update registry state; they do not deploy or activate module code.
- Connector validation checks HTTPS URL syntax only. It does not send a network request.
- A provider registry record does not prove provider credentials, routing, dispatch, or inference.
- The Activity Log displays persisted audit rows but does not prove append-only enforcement, tamper resistance, or transaction atomicity.
- Diagnostics report only the specific endpoints they call. They do not replace end-to-end tests.

## Security and operational boundaries

- The browser never receives database URLs, administrator passwords, session secrets, or provider API keys.
- This release does not edit environment variables, database schema/data, network allowlists, or Render deployment settings.
- Render Auto Deploy remains a manual operator-controlled setting.
- PostgreSQL backup/restore must be handled separately. A Git branch is a source-code recovery point, not a database backup.

## Verification checklist after manual deployment

1. Sign in at `/control/`.
2. Confirm Overview counts load from the server.
3. Open Diagnostics and inspect each endpoint result.
4. Register a test record only if the operator intends to persist it; verify it appears after refresh.
5. Validate a connector only with the understanding that no outbound connectivity test is performed.
6. Verify that management actions appear in Activity Log.
7. Confirm the public platform route `/` remains available.
8. Review Render deploy logs and the exact deployed commit SHA.


## Control Plane v2.1 — Operational Intelligence & Recovery

The authenticated diagnostics endpoint `GET /api/control/diagnostics` reports only process-local and database-query evidence:
- Node.js runtime version, environment, process uptime and process start timestamp.
- A live `SELECT 1` database probe, measured query latency and database server timestamp.
- PostgreSQL client pool counters (total, idle and waiting).
- Render commit metadata when `RENDER_GIT_COMMIT` is present; otherwise the commit is `UNKNOWN`.
- Database backup state remains `UNKNOWN`; the application does not inspect Render backup artifacts or perform restore tests.

The Overview and Diagnostics pages display this evidence. Runbook distinguishes source-code recovery, database backup and manual deployment rollback. Sidebar expanded/collapsed state is stored as a browser preference only. No database schema or records are changed by these additions.
