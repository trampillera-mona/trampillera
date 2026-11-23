# TRAMPILLERA Social & Donor Connectivity Architecture

**Document ID:** TRAMPILLERA-ARCH-CONNECTIVITY-001  
**Version:** 0.1  
**Status:** Proposed architecture baseline  
**Scope:** Social platforms, external data donors, ingestion, normalization, regional policy, and user-aware routing.

> Terminology assumption: in this document, a **donor connector** means a connector to an external organization, platform, repository, or publisher that provides data/content/signals to TRAMPILLERA. It does not mean a financial donor or fundraising relationship. If the product uses “donor” differently, the domain term must be corrected before schema finalization.

## 1. Purpose

Expand the current connector inventory into a governed Social & Data Connectivity Hub. It must support a growing catalogue of social platforms and external data sources while keeping the actual execution status, authorization, data rights, and regional availability explicit.

The hub is not a scraper catalogue and not a list of logos. It is a managed integration layer with a clear distinction between:
- connector templates available in the catalogue;
- connector instances registered by an administrator;
- configured credentials and granted scopes;
- verified connectivity and permission checks;
- active ingestion subscriptions/jobs;
- data actually received, normalized, and accepted.

A catalogue entry MUST NOT be represented as an active integration.

## 2. Current implementation boundary

The current PostgreSQL `platform_connectors` table stores a minimal registry record: key, name, provider, status, and endpoint. The authenticated API supports listing, registering, and validating endpoint syntax. Validation enforces HTTPS URL syntax and does not make an outbound request, authenticate to a provider, or verify data exchange.

The known registry currently contains `storage.s3` and `analytics.api`; both have been observed as not configured. This architecture adds catalogue and target design only. It does not claim that any social network, donor, webhook, OAuth flow, ingestion worker, or regional router is implemented.

## 3. Connector families

### 3.1 Social Connectors

Purpose: authorized publishing, account/channel management, listening where provider APIs permit it, community signals, and analytics.

Initial catalogue candidates (availability and API capabilities depend on provider, account type, region, app review, scopes, and current platform policy):

| Key | Platform | Candidate capabilities |
|---|---|---|
| `social.meta.facebook_pages` | Facebook Pages | Page metadata, authorized publishing, comments and insights where permitted |
| `social.meta.instagram_business` | Instagram Business | Professional account media publishing, comments and insights where permitted |
| `social.meta.threads` | Threads | Authorized publishing and account insights where supported |
| `social.youtube` | YouTube | Channel/video metadata, authorized uploads, comments and analytics |
| `social.tiktok` | TikTok | Authorized content publishing and account/video data subject to product/API approval |
| `social.linkedin` | LinkedIn | Organization/page publishing and analytics subject to approved products and scopes |
| `social.x` | X | Authorized account operations and API-access-dependent search/metrics |
| `social.telegram.bot` | Telegram Bot API | Bot messaging, channel/group updates where bot is present and permitted |
| `social.telegram.client` | Telegram client integration | Separate, restricted design; never silently emulate a bot or bypass platform limits |
| `social.discord` | Discord | Bot-based server events, messages and community workflows within granted permissions |
| `social.reddit` | Reddit | Authorized subreddit/account access, posts, comments and moderation within API policy |
| `social.vk` | VK | Authorized community/account methods subject to region and API policy |
| `social.whatsapp.business` | WhatsApp Business Platform | Business messaging templates and inbound webhooks with consent |
| `social.mastodon` | Mastodon | Instance-specific OAuth, publishing, timelines and streaming where available |
| `social.bluesky` | Bluesky / AT Protocol | Account, feed and publishing interfaces subject to protocol and service limits |

Do not assume feature parity between platforms. Each capability is separately declared and verified. The system MUST use official APIs or explicitly licensed interfaces; it MUST NOT bypass authentication, access controls, paywalls, rate limits, or platform restrictions.

### 3.2 Donor / Data Source Connectors

Purpose: receive data and content from partner organizations, publishers, open-data portals, research indexes, public agencies, repositories, and infrastructure systems.

| Key | Source family | Candidate use |
|---|---|---|
| `donor.rss_atom` | RSS / Atom feeds | Publisher updates and source monitoring |
| `donor.webhook` | Partner webhooks | Event and record delivery |
| `donor.rest_api` | REST APIs | Structured partner and public data |
| `donor.graphql` | GraphQL APIs | Structured query-based data exchange |
| `donor.ckan` | CKAN open-data portals | Dataset catalogue and downloads |
| `donor.socrata` | Socrata open-data portals | Public-sector datasets |
| `donor.gov_open_data` | Government open-data APIs | Official datasets, notices, statistics |
| `donor.news_licensed` | Licensed news agencies / wires | Licensed articles, feeds and metadata |
| `donor.publisher` | Publisher / media partner | Licensed editorial and media assets |
| `donor.research.crossref` | Crossref | Scholarly metadata |
| `donor.research.openalex` | OpenAlex | Scholarly works and institution metadata |
| `donor.github` | GitHub | Repository releases, issues and events when authorized |
| `donor.gitlab` | GitLab | Repository and CI events when authorized |
| `donor.ogc_api_features` | OGC API Features | Geospatial feature data |
| `donor.wms_wmts` | OGC WMS / WMTS | Map imagery and tiles |
| `donor.wfs` | OGC WFS | Geospatial feature services |
| `donor.geojson` | GeoJSON / file feed | Geospatial exchange |
| `donor.mqtt_iot` | MQTT / IoT broker | Authorized sensor telemetry |
| `donor.calendar_ics` | iCalendar / ICS | Events and schedules |
| `donor.object_storage` | S3-compatible object storage | Files and media objects; relates to existing `storage.s3` |

A donor record must carry source ownership, permitted purpose, license/terms, attribution requirements, collection method, retention limits, and data-quality expectations. Publicly reachable does not automatically mean unrestricted reuse.

### 3.3 Existing generic connector types

Keep existing connector records compatible. Do not force every provider into a social-only model. Existing generic types such as REST API, object storage, database, local runtime, AI provider, and custom integration remain supported as connector adapters or transport types.

## 4. Connector lifecycle and capability model

Each catalogue template and configured instance must expose separate dimensions.

**Catalogue state:** `CATALOG_ONLY`, `AVAILABLE_FOR_CONFIGURATION`, `DEPRECATED`.

**Instance lifecycle:** `DRAFT`, `NOT_CONFIGURED`, `CONFIGURED`, `AUTH_PENDING`, `AUTHORIZED`, `ACTIVE`, `PAUSED`, `DEGRADED`, `REVOKED`, `DISABLED`, `ERROR`.

**Verification state:** `NOT_TESTED`, `ENDPOINT_VALID`, `AUTH_VERIFIED`, `CONNECTIVITY_VERIFIED`, `CAPABILITY_VERIFIED`, `DATA_EXCHANGE_VERIFIED`, `FAILED`, `UNKNOWN`.

These are independent dimensions. For example, `ACTIVE` must not be inferred from a valid URL, and `DATA_EXCHANGE_VERIFIED` must be tied to timestamped evidence.

Each connector template SHOULD declare:
- supported capabilities and API operations;
- authentication methods and required scopes;
- supported regions and known restrictions;
- data direction (inbound, outbound, bidirectional);
- webhook and polling support;
- rate limits and backoff requirements;
- supported data formats and schemas;
- data sensitivity and retention classification;
- source license, attribution, consent, and permitted purposes;
- health and verification probes;
- provider-specific version and deprecation notes.

## 5. Regional and user-aware routing

The long-term goal is for JARVISER and other model services to adapt processing flows to a user's region, language, preferences, role, and task requirements. This must be a constrained routing process, not unconstrained model choice.

### 5.1 Routing inputs

A routing profile may include:
- explicit workspace/user region preference;
- language and locale;
- timezone;
- task type and intended outcome;
- preferred or excluded source families;
- data residency and transfer constraints;
- organization policy and jurisdiction;
- user permissions and consent;
- source license and permitted purpose;
- freshness, quality, cost, and latency requirements.

Do not silently infer a legal jurisdiction from IP geolocation alone. Region can be suggested from context, but a consequential jurisdiction or residency setting requires an explicit trusted profile or organization policy.

### 5.2 Deterministic policy gate before model ranking

The routing sequence is:

1. Resolve the task and required data.
2. Load user/workspace and organization policy.
3. Filter out connectors that are unauthorized, unavailable in the region, outside license/consent, or incompatible with data residency.
4. Evaluate source capability and verification state.
5. Only then allow a model to rank the remaining eligible sources/routes by relevance, freshness, quality, cost, and latency.
6. Record the route decision, policy version, selected sources, rejected candidates and reasons.
7. Re-check policy at execution time; do not rely only on a prior model recommendation.

A model MAY recommend a route or explain trade-offs. A model MUST NOT grant consent, expand OAuth scopes, bypass a denied connector, override retention rules, or select a source excluded by deterministic policy.

### 5.3 Personalization

Users SHOULD be able to maintain simple preferences such as preferred language, regions of interest, source categories, notification cadence, and preferred output format. Advanced controls may expose source priority, freshness, cost, and data-residency settings.

Personalization MUST NOT weaken organization policy, legal restrictions, access control, source terms, or data protection requirements.

## 6. Target ingestion and processing flow

`DISCOVER → AUTHORIZE → CONFIGURE → VERIFY → SUBSCRIBE / SCHEDULE → RECEIVE → NORMALIZE → CLASSIFY → POLICY CHECK → ROUTE → REVIEW → USE / PUBLISH`

Not every connector uses every stage. Each stage emits an auditable event. Failed or unknown stages must remain visible; a failed ingestion must not be reported as a successful update.

Recommended pipeline components:
- connector adapter;
- credential and OAuth grant vault (secrets never stored in browser or ordinary connector metadata);
- webhook receiver and polling scheduler;
- queue / background workers;
- schema registry and normalization layer;
- deduplication and provenance service;
- policy and regional routing engine;
- human review / moderation queue;
- audit and evidence store.

Do not implement long-running polling or ingestion inside the web request handler. Use background workers and bounded retries with idempotency keys.

## 7. Target domain model

The following entities are proposed; they are not present in the current database unless separately implemented.

- `connector_catalog`: provider template, family, docs, supported capabilities.
- `connector_instances`: workspace-specific configured instance and lifecycle.
- `connector_capabilities`: operations and verification requirements.
- `connector_grants`: OAuth grants, scopes, expiry and revocation metadata (never raw secrets).
- `connector_subscriptions`: webhook/polling subscriptions and schedule.
- `connector_region_availability`: region, restrictions, residency and provider caveats.
- `source_licenses`: terms, attribution, permitted purposes and retention.
- `donor_sources`: donor identity, ownership, trust profile and contact metadata.
- `ingestion_jobs`: run state, attempt, idempotency key and timestamps.
- `ingestion_records`: normalized record references and provenance.
- `routing_profiles`: user/workspace preferences and policy references.
- `routing_decisions`: eligible candidates, selected route, rejected candidates and reasons.
- `source_evidence`: retrieval time, source URI/reference, checksum, transformation lineage and verification.
- `connector_health_events`: timestamped test results and failure categories.

Credentials should live in a dedicated secret manager or encrypted server-side vault, not in these ordinary metadata tables.

## 8. Target API contract namespace

Proposed versioned routes (not implemented by this document):

- `GET /api/v1/connectivity/catalog`
- `GET /api/v1/connectivity/catalog/:key`
- `GET|POST /api/v1/connectivity/instances`
- `GET|PATCH|DELETE /api/v1/connectivity/instances/:id`
- `POST /api/v1/connectivity/instances/:id/authorize`
- `POST /api/v1/connectivity/instances/:id/revoke`
- `POST /api/v1/connectivity/instances/:id/verify`
- `GET|POST /api/v1/connectivity/instances/:id/subscriptions`
- `GET /api/v1/connectivity/instances/:id/health`
- `GET|POST /api/v1/connectivity/donors`
- `GET|PATCH /api/v1/connectivity/donors/:id`
- `GET|POST /api/v1/connectivity/routing-profiles`
- `POST /api/v1/connectivity/route-preview`
- `POST /api/v1/connectivity/route-executions`
- `GET /api/v1/connectivity/ingestion-jobs/:id`

All write operations require server-side authorization, validation, idempotency where applicable, and audit events. Route preview must be non-executing and clearly labeled. Route execution revalidates policy and connector state.

## 9. Security, privacy, and governance

- OAuth with least-privilege scopes; separate authorization per workspace/account.
- Encrypt credentials at rest; never return secrets to the client.
- Support token expiry, refresh, revocation, and account disconnection.
- Verify webhook signatures and protect against replay.
- Apply per-provider rate limits, exponential backoff, circuit breakers, and quotas.
- Respect provider terms, API policies, user consent, data-subject rights, and regional law.
- Minimize collected data and enforce retention/deletion policies.
- Keep source provenance and transformation lineage.
- Separate public data, licensed data, private account data, and sensitive personal data.
- Do not use personal social data for model training or cross-user profiling without a valid explicit basis and applicable consent.
- Record who connected an account, which scopes were granted, what data was collected, for what purpose, and when access was revoked.

## 10. Control Plane UX

The Social & Data Connectivity Hub SHOULD expose:
1. **Overview:** connected instances, pending authorization, failed verification, active subscriptions, latest ingestion evidence.
2. **Catalogue:** searchable templates grouped into Social Platforms, Donor/Data Sources, Geospatial/Infrastructure, Storage/Transport, and AI Providers.
3. **Connection setup:** provider explanation, required account, scopes, region availability, data direction, and terms before authorization.
4. **Capabilities:** per-operation status rather than a single vague “connected” badge.
5. **Sources & donors:** ownership, license, permitted purpose, attribution, trust, freshness, and data quality.
6. **Routing Studio:** region/language/task preferences, eligible source preview, policy exclusions, model ranking explanation.
7. **Ingestion monitor:** schedules, webhooks, jobs, retries, errors, deduplication, and record lineage.
8. **Audit & access:** grants, scopes, actor, changes, revocation, and evidence.

Beginner view should offer a guided connection path. Professional view exposes filters, source comparisons and flow controls. Engineering view exposes contracts, scopes, events, retries, schema mappings and diagnostics. Interaction depth never changes authorization.

## 11. Delivery sequence

1. **Catalogue foundation:** publish templates and metadata; no external calls.
2. **Connector instance model:** migrate the minimal registry compatibly; preserve existing keys and records.
3. **First official API adapters:** choose one social platform and one donor source after account/API access and regional requirements are known.
4. **OAuth, secrets and verification:** implement secure grants and verified connection tests.
5. **Ingestion infrastructure:** webhook/polling, queue workers, normalization, provenance and deduplication.
6. **Regional policy and routing preview:** deterministic policy first, model ranking second.
7. **Personalization and orchestration:** user/workspace preferences and explainable adaptive flows.

Do not start with dozens of live integrations. Establish a repeatable adapter contract and prove one social and one donor flow end to end before scaling the catalogue.

## 12. Acceptance rules

- Catalogue templates are visibly distinct from configured connector instances.
- No connector is called “connected” until the required authentication and connectivity checks pass.
- Capabilities are verified individually.
- Source ownership, license, purpose, attribution and retention are visible.
- Region and user preferences are explicit and inspectable.
- Deterministic policy filters routes before model ranking.
- Model recommendations include reasons and cannot override policy.
- Ingestion jobs expose truthful state and evidence.
- Secrets never enter browser storage, audit details, or ordinary API responses.
- Existing `storage.s3` and `analytics.api` records remain intact during migration.
- Every implementation stage has API, permission, audit, failure, and recovery tests.

**Governing rule:** Connect broadly, collect deliberately, route transparently, and execute only what policy and evidence permit.
