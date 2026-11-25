# TRAMPILLERA UNIFIED COMPLETE

A single deployable application that serves the full TRAMPILLERA platform interface, the Control Plane, a shared HTTP API, and persistent PostgreSQL-backed registries.

## Routes

- `/` — full TRAMPILLERA Media / Unified Reality OS interface.
- `/control/` — authenticated Control Plane.
- `/city/` — ITY CITY module launcher and employee digital environment.
- `/city/workspace/` — preserved employee workspace prototype.
- `/city/campus/` — Corporate Campus source application.
- `/city/multiverse/` — Corporate Multiverse source application.
- `/api/health` — database-aware health check.
- `/api/platform/status` — API/PostgreSQL registry availability summary; external integration health remains `UNKNOWN` until probed.
- `/api/analytics/counter` — aggregate public visitor and page-view counters.
- `/control/growth/` — authenticated Audience Intelligence and Growth Desk.
- `/go/:slug` — tracked campaign redirect with UTM attribution.
- `/api/modules` — public module inventory.
- `/api/control/*` — authenticated management API.

## ITY CITY integrated environment

The ITY CITY entry route is a module launcher for four employee-facing experiences:

- `/city/workspace/` — personal workspace prototype and visual layout builder.
- `/city/campus/` — Corporate Campus spatial/organizational environment.
- `/city/multiverse/` — Corporate Multiverse, learning and world exploration.
- `/city/team/` — server-backed employee accounts, team missions, shared mission discussions (8-second visible-tab refresh), submissions and verified XP.

The two supplied Corporate Campus and Corporate Multiverse source snapshots are retained under `app/public/city/source/`. Their launchable copies use isolated IndexedDB database names and namespaced localStorage keys. The launcher uses same-origin iframe isolation for the full-page source applications.

Team identity and mission state are stored in PostgreSQL. Administrators manage employee accounts, publish missions, review submissions and verify XP at `/control/team/`, linked from the existing Control Plane. Employee passwords use salted scrypt hashes and employees must replace one-time temporary passwords on first sign-in. XP is awarded only when an administrator verifies a submitted result.

This is a functional first collaboration loop, not a complete HR or project-management platform. Email invitations, attachments, WebSocket presence, multi-level approvals, configurable fine-grained permissions, external evidence integrations and server-synchronized personal workspace layouts are not included. Mission notes are self-reported and administrator-reviewed. XP is a learning and collaboration mechanic, not an employee performance or compensation metric.

## Architecture

The application is a single Node.js service. It serves both preserved interfaces and exposes the API consumed by the Control Plane. PostgreSQL stores modules (including the registered audience.growth capability), connectors, model providers, audit events, consent-based pseudonymous visitor aggregates, page views, and promotion campaign events. Docker Compose starts the application and database together.

The uploaded source HTML files are preserved byte-for-byte in `originals/`. The deployed platform page has one intentional navigation adjustment so its administrator shortcut opens `/control/`. The Control Plane preview is connected to authenticated API calls and persistent server-side data. Its status badge changes to `AUTHENTICATED · LIVE DATA` only after the server confirms the session.

## Quick start (Docker)

1. Install Docker Engine and the Docker Compose plugin.
2. Copy `.env.example` to `.env`.
3. Generate secrets with `sh scripts/generate-secrets.sh`, then place the generated values in `.env`. Use a unique administrator password.
4. Start the application:

   ```sh
   docker compose up -d --build
   docker compose ps
   docker compose logs -f app
   ```

5. Open `http://localhost:3000/`, `http://localhost:3000/control/`, and `http://localhost:3000/city/`.
6. Sign in to Control Plane using `ADMIN_PASSWORD` from `.env`.

For production HTTPS, point your domain to the host, set `TRAMPILLERA_DOMAIN`, `COOKIE_SECURE=true`, and `TRUST_PROXY=true` in `.env`, then start the optional Caddy ingress with `docker compose --profile edge up -d caddy`. Caddy obtains and renews certificates automatically.

## Local development

Requirements: Node.js 20+, PostgreSQL 15+.

```sh
cd app
npm install
# Set DATABASE_URL, ADMIN_PASSWORD and SESSION_SECRET in your shell.
npm run dev
```

## Audience intelligence and promotion

The public portal offers optional, consent-based first-party audience measurement. After explicit opt-in, a random browser token is stored locally and only an HMAC-derived identifier is stored server-side. Raw IP addresses and full referrer URLs are not stored; only the referrer hostname, page path, UTM source/medium/campaign and timestamps are recorded. Visitors can choose Essential only and continue using the site. The Control Plane links to `/control/growth/`, where administrators can review traffic, sources and tracked promotion campaigns. Campaign links count redirects and attributable page views; this module does not purchase ads, publish content, send newsletters, or claim conversions.

## Security and deployment notes

- Change all example secrets before exposing the service to the internet. Set `COOKIE_SECURE=true` when serving over HTTPS; keep it `false` only for local HTTP development.
- Use HTTPS through a trusted reverse proxy or managed ingress. Do not expose PostgreSQL publicly.
- The application port is bound to localhost; public traffic should enter through the optional Caddy HTTPS ingress. Set `TRUST_PROXY=true` only when Caddy or another trusted reverse proxy overwrites forwarding headers.
- The AI adapter is provider-neutral at the application boundary and defaults to Qwen Model Studio. Configure `AI_PROVIDER=qwen`, `QWEN_API_KEY`, `QWEN_API_URL`, and optionally `QWEN_MODEL`; the API key remains server-side.
- OpenAI is an optional alternative with `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and optional `OPENAI_API_URL` / `OPENAI_MODEL`. The adapter supports OpenAI Responses and Chat Completions endpoints.
- AI requests are rate-limited, time-bounded, and logged without storing prompts or completions. A missing provider key or endpoint returns an explicit configuration state.
- The preserved platform uses Tailwind's browser CDN runtime, so the Content Security Policy allows inline scripts and `unsafe-eval` for compatibility; a production-hardening pass should replace that runtime with a locally compiled stylesheet.
- Connector validation checks HTTPS URL syntax only; it does not claim external connectivity or perform outbound requests.
- The Control Plane requires administrator authentication. The public platform interface remains accessible.
- Back up the `trampillera_pgdata` Docker volume regularly.

## Licensing and community distribution

The software code in this repository is released under the MIT License; see [LICENSE](./LICENSE). This is intentional: developers may inspect, copy, modify, self-host, and redistribute the code, including in commercial projects, provided they comply with the license notice requirements.

The MIT License does **not** grant permission to use the TRAMPILLERA name, logos, product marks, domain identity, or other brand identifiers as if a fork or derivative project were an official TRAMPILLERA release. See [TRADEMARKS.md](./TRADEMARKS.md) for the brand-use rules.

When publishing a modified or independently hosted version:
- retain the applicable copyright and MIT license notices;
- clearly identify your version as modified or independently maintained;
- do not imply that TRAMPILLERA endorses, operates, certifies, or supports it;
- do not use TRAMPILLERA branding as the name or identity of your own product without written permission.

This repository currently contains one deployable application; it does not yet define a separately licensed proprietary Core or paid Community/Enterprise edition. Any future closed-source modules, hosted services, or commercial add-ons must be clearly separated by file/module scope and accompanied by their own license terms before distribution.

Third-party dependencies and assets may have their own license terms. Those terms remain applicable and are not replaced by this repository's MIT License.

## Community and responsible disclosure

- [CONTRIBUTING.md](./CONTRIBUTING.md) — contribution workflow, attribution, forks, and commercial redistribution.
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) — expectations for respectful project participation.
- [SECURITY.md](./SECURITY.md) — private vulnerability reporting and responsible disclosure.

## Community distribution

The public community guide is available at [trampillera.com/community](https://trampillera.com/community/). It explains the open distribution model, independent forks, attribution, brand boundaries, and contribution routes.

## Verification

Run `sh scripts/check.sh` for JavaScript syntax checks, AI provider adapter unit tests and source-preservation checks. After deployment, verify `/api/health`, `/`, `/control/`, `/city/`, `/city/campus/`, and `/city/multiverse/`. A healthy container alone does not prove every external integration is configured.


## Architecture, research portfolio and release records

The canonical technical documentation index is [docs/architecture/README.md](docs/architecture/README.md). It links the platform architecture, federated-module specification, source-based module inventory, JARVISER provider contract, language/voice audit, and Audience Intelligence & Growth design.

The wider project portfolio and implementation boundaries are recorded in [TRAMPILLERA Ecosystem Portfolio — 2026-11-25](docs/architecture/TRAMPILLERA_ECOSYSTEM_PORTFOLIO_2026-11-25.md). Separate prototypes and research initiatives are not automatically modules of this deployed application.

The current recovery point, source baseline, known capability limits, and operator-controlled Render release procedure are recorded in [Release Baseline & Recovery — 2026-11-25](docs/architecture/audit/TRAMPILLERA_RELEASE_BASELINE_AND_RECOVERY_2026-11-25.md).

**Release rule:** a Git recovery branch is not a database backup; a passing source test is not a production smoke test; a visible module is not proof of execution. Render deployment remains manual and requires an explicit operator decision.
