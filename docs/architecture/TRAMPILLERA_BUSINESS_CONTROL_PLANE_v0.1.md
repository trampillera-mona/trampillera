# TRAMPILLERA Business Control Plane v0.1

**Status:** Foundation implementation in progress  
**Delivery boundary:** additive to the existing TRAMPILLERA application; no production release or external side effect is implied by this specification.

## Commercial model

TRAMPILLERA uses a hybrid model with three revenue engines:

1. **Automated agency:** identifies opportunities, prepares research and proposal drafts, and coordinates delivery by internal capability or approved partners.
2. **Partner marketplace:** independent specialists and organizations can apply to participate; offers are published only after review and explicit approval.
3. **Own products:** TRAMPILLERA-owned software, AI tools, media products and interactive experiences.

## First implementation slice: Business Intake & Opportunity Inbox

The first release is intentionally narrower than the full commercial model. It establishes durable intake and a human-reviewable pipeline before adding AI prospecting, outbound communication, marketplace settlement or payments.

### Public intake
- Customer inquiry submission for services, products, partnerships or other requests.
- Partner application submission with organization, contact and capability information.
- Explicit consent, input validation, rate limiting and a honeypot field.
- Acknowledgement/reference number only; no promise of response time.
- No outbound email, external API call, payment, or automatic publication.

### Business Control Plane
- Authenticated inquiry inbox with stages: NEW → REVIEWING → QUALIFIED → PROPOSAL → NEGOTIATION → WON / LOST.
- Internal notes, estimated deal value/currency, and next-action date.
- Partner application review: PENDING → REVIEWING → APPROVED / REJECTED.
- Audit events for received and changed records.
- PII is visible only to authenticated administrators through the protected API.

### Explicit non-goals for v0.1
- No automatic prospect scraping or unsolicited outreach.
- No autonomous sending of email or messages.
- No claims that AI agents, external providers, payments or CRM integrations are live.
- No partner access to internal records.
- No marketplace listings or commission settlements before partner governance and commercial terms exist.
- No payment collection, invoicing, tax calculation or payout automation.

## Next slices

1. **Offer catalogue:** reviewed internal and partner offers with ownership, status, pricing basis and delivery boundary.
2. **Opportunity intelligence:** evidence-linked prospect research and fit scoring; recommendations remain drafts.
3. **Proposal studio:** reusable proposal templates, cost estimates, scope and approval state.
4. **Execution orchestration:** tasks, milestones, deliverables, partner assignments and AWAS verification.
5. **Commercial ledger:** contracts, invoices, payment provider, refunds, commissions and reconciliation after legal/accounting review.

## AWAS / No Simulated Success controls

Every business record has a durable identifier and state. State-changing operations are authenticated and audited. An inquiry is not a qualified lead; a partner application is not an approved partner; an approved partner is not a contracted supplier; a proposal is not a sale; a click or page view is not revenue. External execution must be evidenced by provider receipts or verifiable system records.

## Data protection

Collect only information necessary to evaluate the request. Do not store raw IP addresses or browser fingerprints. Restrict access to administrator sessions, avoid logging submitted message content, and publish a privacy notice that covers the intake purpose, retention period, contact channel and applicable legal basis before broad promotion.
