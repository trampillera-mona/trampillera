# TRAMPILLERA Audience Intelligence & Growth Module v1.0

**Status:** Implemented on the feature branch; awaiting CI and operator review  
**Scope:** Public portal audience measurement, aggregate reporting, and campaign-link attribution

## Purpose

Provide TRAMPILLERA with a first-party, privacy-conscious view of portal traffic and a small operational promotion desk. The module is an independent capability exposed through APIs and a Control Plane surface and registered as audience.growth; it does not become the owner of other modules or their content.

## Components

- **Module Registry:** registers the capability as audience.growth in the shared module inventory.
- **Audience Counter:** public aggregate counts for lifetime distinct browser visitors, today's distinct visitors, and recorded page views.
- **Analytics Collector:** records page path, UTM source/medium/campaign, referrer hostname, and timestamp after visitor opt-in.
- **Audience Intelligence Desk:** authenticated reporting for selected 7/30/90-day windows, daily traffic, popular paths, and acquisition sources.
- **Promotion Campaign Studio:** create, pause, and activate tracked campaign links.
- **Attribution Redirect:** /go/:slug records a click and redirects to the campaign destination with utm_campaign, utm_source, and utm_medium attribution.

## Data and privacy boundaries

1. Tracking is optional and starts only after the visitor explicitly chooses **Allow analytics**.
2. **Essential only** leaves the public portal usable and does not send a visit event.
3. A random first-party browser token is stored in local storage only after opt-in. The raw token is never sent to the database; the server stores an HMAC-SHA-256 digest keyed with the server session secret.
4. Raw IP addresses, user-agent strings, and full referrer URLs are not stored in the analytics tables. The referrer hostname is retained for source reporting.
5. Page paths are stripped of query strings before storage. UTM values are length-limited and normalized.
6. Bot-like user agents are excluded using a basic heuristic; this is not a full bot/fraud detection service.
7. The browser can clear consent and the visitor token by clearing site data. A dedicated consent-withdrawal/delete-data workflow and configurable retention schedule are not yet implemented.
8. The current schema does not automatically purge old records. Set and implement a retention schedule before broad public marketing use, and align the public privacy notice/legal basis with the applicable jurisdictions.

A stable pseudonymous token can still be personal data under some legal regimes. Do not describe this system as anonymous or as a substitute for a legal/privacy review.

## Database objects

- site_visitors: one HMAC visitor key per calendar day; supports lifetime distinct browser count and daily unique count.
- site_pageviews: page views and normalized acquisition metadata.
- growth_campaigns: campaign identity, channel, objective, destination, status, and optional planned budget.
- growth_campaign_events: redirect click events.

All schema changes use additive CREATE TABLE IF NOT EXISTS and index creation. No existing table is dropped or rewritten.

## API surface

### Public

- POST /api/analytics/visit — consented page view; validates a random browser token and stores only its HMAC digest.
- GET /api/analytics/counter — aggregate counter values.
- GET /go/:slug — records a click for an active campaign and redirects to its configured HTTP(S) destination with UTM campaign attribution.

### Administrator

- GET /api/control/analytics/summary?days=7|30|90 — totals, daily series, popular pages, acquisition sources, and campaign performance.
- GET /api/control/growth/campaigns — campaign inventory and aggregate results.
- POST /api/control/growth/campaigns — create a campaign with a validated HTTP(S) destination.
- PATCH /api/control/growth/campaigns/:id — set ACTIVE, PAUSED, or ARCHIVED.

All administrator routes are behind the existing authenticated Control Plane middleware and same-origin state-change protection.

## Campaign lifecycle and measurement

ACTIVE → PAUSED → ACTIVE is supported, and campaigns can be archived. A campaign click is recorded at /go/:slug. A campaign visit is counted when a consented portal page view arrives with the matching utm_campaign. These are different events and are reported separately.

The module does not currently:
- buy or serve advertisements;
- publish posts to social networks;
- send email/newsletters;
- provide affiliate settlement or commission calculation;
- identify people across devices;
- measure business conversions, revenue attribution, or return on ad spend;
- claim campaign effectiveness based on clicks alone.

These require separate integrations, data contracts, and verification.

## Verification gates

- JavaScript syntax check for the public analytics client.
- Contract tests for the public counter, consent gate, storage model, campaign routes, and authenticated Growth Desk.
- Docker/PostgreSQL CI smoke test for schema initialization, public visit ingestion, counter response, administrator analytics, campaign creation, redirect click, UTM-attributed visit, and campaign pause behavior.
- Browser/device review of consent UI and counter presentation before public launch.

**No Simulated Success:** a campaign record is not a published campaign; a redirect click is not a conversion; a visit count is not a verified unique human.
