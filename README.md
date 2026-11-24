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
- `/api/platform/status` — public platform status summary.
- `/api/modules` — public module inventory.
- `/api/control/*` — authenticated management API.

## ITY CITY integrated environment

The ITY CITY entry route is a lightweight module launcher. It keeps three independently runnable interfaces available inside one employee-facing shell:

- `/city/workspace/` — the previous employee workspace prototype, preserved from the first release.
- `/city/campus/` — the Corporate Campus spatial/organizational environment.
- `/city/multiverse/` — the Corporate Multiverse environment with missions, progression and learning surfaces.

The two supplied Corporate Campus and Corporate Multiverse source snapshots are retained under `app/public/city/source/`. The deployed module copies use isolated IndexedDB database names and namespaced localStorage keys so the two applications do not overwrite each other's browser data. The launcher uses an iframe boundary to keep their CSS and JavaScript globals separate.

This is an integrated frontend prototype, not yet a production employee platform. Employee identity, HR records, server-side mission registry, shared progression, verified XP awards, multi-user synchronization, live messaging, and live engine integrations are not implemented. Each source module continues to own its local demo state. Demo activity is not employee performance data.

## Architecture

The application is a single Node.js service. It serves both preserved interfaces and exposes the API consumed by the Control Plane. PostgreSQL stores modules, connectors, model providers, and audit events. Docker Compose starts the application and database together.

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

## Security and deployment notes

- Change all example secrets before exposing the service to the internet. Set `COOKIE_SECURE=true` when serving over HTTPS; keep it `false` only for local HTTP development.
- Use HTTPS through a trusted reverse proxy or managed ingress. Do not expose PostgreSQL publicly.
- The application port is bound to localhost; public traffic should enter through the optional Caddy HTTPS ingress. Set `TRUST_PROXY=true` only when Caddy or another trusted reverse proxy overwrites forwarding headers.
- `OPENAI_API_KEY` is optional and remains server-side. The AI endpoint returns an explicit configuration error when no key is set.
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

Run `sh scripts/check.sh` for JavaScript syntax validation. After deployment, verify `/api/health`, `/`, `/control/`, `/city/`, `/city/campus/`, and `/city/multiverse/`. A healthy container alone does not prove every external integration is configured.
