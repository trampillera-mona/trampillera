# TRAMPILLERA Communications & Collaboration — Architecture Specification v0.1

**Status:** Proposed architecture / implementation contract; NOT IMPLEMENTED  
**Date:** 2026-11-25  
**Repository:** `trampillera-mona/trampillera`  
**Domain key:** `communications.core`  
**Product name:** TRAMPILLERA Communications  
**Scope:** Private corporate messaging, voice/video meetings, secure file exchange, and collaboration integrated with platform identity and governance.

> Communication should belong to the organization, not to employees' personal accounts on external messaging platforms.

## 1. Purpose and product boundary

TRAMPILLERA Communications is the organization's internal communication environment. It provides:
- one-to-one and group conversations;
- persistent team channels and threaded discussions;
- audio and video calls;
- scheduled and ad-hoc conferences;
- screen sharing and meeting-room controls;
- controlled file exchange;
- meeting invitations, agendas, notes, and follow-up actions;
- device/session management and security administration.

It is a first-class domain module, not a chat widget and not a replacement for the existing public portal. It uses the shared TRAMPILLERA identity and authorization boundary. It must remain usable from desktop browsers first, with API and client contracts that permit later mobile and desktop applications.

**Current state:** No production messaging, WebSocket, media signaling, SFU, E2EE key service, or communication persistence is asserted by this document. This specification does not claim that any of these capabilities currently exist.

## 2. Governing principles

1. **Organization-owned identity:** employee access is tied to organization-managed accounts, not personal Telegram, WhatsApp, or social accounts.
2. **End-to-end security by design:** transport encryption is mandatory; E2EE is the target for message content and supported media modes.
3. **No home-grown cryptography:** use reviewed protocols and maintained implementations. TRAMPILLERA owns policy and integration, not cryptographic primitives.
4. **Metadata is not content:** operational audit records must not silently become a surveillance archive of message bodies, call audio, video, or screen content.
5. **Least privilege:** membership, room access, file access, moderation, retention, recording, and administration are separate capabilities.
6. **Explicit consent and visibility:** recording, transcription, external guests, and screen capture must be disclosed and authorized before activation.
7. **No silent downgrade:** if E2EE is unavailable or a participant/device cannot support the required security mode, show the limitation and require an explicit policy decision; never label a transport-encrypted session as E2EE.
8. **Evidence before status:** distinguish configured, reachable, encrypted, E2EE-verified, and operational.
9. **Provider independence:** messaging protocol and media infrastructure sit behind documented adapters/contracts where practical.
10. **Incremental and reversible:** do not destabilize the current Node.js application or make a large infrastructure change before a working pilot.

## 3. Logical architecture

### 3.1 Experience layer

Control Plane navigation should expose a Communications workspace with:
- Inbox;
- Direct Messages;
- Teams & Channels;
- Meetings;
- Contacts / Directory;
- Files;
- Security & Devices;
- Administration (authorized roles only).

The everyday view should prioritize unread conversations, mentions, active meetings, upcoming meetings, and assigned follow-ups. Professional and engineering controls are progressively disclosed. The interface follows THIS: predictable navigation, clear primary action, contextual help, visible states, accessible responsive layout, and safe confirmation for consequential actions.

### 3.2 Domain services

| Domain component | Responsibility |
|---|---|
| Communications Gateway | Authenticated API boundary, request validation, rate limits, correlation IDs |
| Identity Bridge | Maps TRAMPILLERA user IDs to communication identities and device credentials |
| Conversation Service | Direct/group rooms, membership, roles, topics, retention policy |
| Message Transport Adapter | Realtime event delivery, message sync, receipts, edits and reactions |
| Key Management Boundary | Device keys, room key lifecycle, recovery policy and key rotation metadata |
| Presence & Notification Service | Online/away state, mentions, notifications and delivery preferences |
| Meeting Control Service | Meeting lifecycle, invitations, admission, roles, lobby and moderation |
| Media Session Adapter | Signaling and connection to a WebRTC media infrastructure / SFU |
| File Exchange Service | Upload/download authorization, encrypted object storage references, expiry |
| Governance & Audit | Policy decisions, administrative actions, security events and evidence |
| Search Index (optional later) | Search only over content that the chosen E2EE model can legitimately expose; no server-side plaintext indexing of E2EE content |

### 3.3 Infrastructure boundary

The initial deployment should not overload the existing Render Node.js web service with media forwarding. The main application remains the identity/control integration point. Realtime messaging and media may be separate services after an architecture and cost review.

Candidate technology directions to evaluate in a proof of concept:
- **Messaging:** Matrix protocol and a maintained homeserver/client SDK, with federation disabled for the initial private corporate deployment unless explicitly approved.
- **Group key management:** Matrix's established room encryption model for compatible clients; evaluate MLS only if the selected server/client ecosystem supports it end-to-end and the operational maturity is demonstrated.
- **Voice/video:** WebRTC with a separately operated SFU/media service. LiveKit is one candidate for evaluation, not a selected or deployed dependency.
- **TURN:** a controlled TURN service for restrictive networks; credentials must be short-lived and issued by an authenticated backend.
- **File storage:** private object storage behind a storage adapter; no public bucket or permanent unauthenticated links.
- **Persistence:** PostgreSQL for TRAMPILLERA-owned identities, mappings, policies, meeting metadata, audit and integration records. Protocol server databases remain owned by their service.

No vendor or topology is final until a prototype demonstrates security, browser compatibility, operational cost, and recovery behavior.

## 4. Identity, membership and authorization

The existing TRAMPILLERA employee/admin identity is the source of truth. Communications must not create an independent password silo.

Required concepts:
- `communication_identity`: mapping from platform user to protocol identity;
- `communication_device`: device ID, public-key fingerprints, trust/revocation state, last-seen timestamp;
- `communication_room`: stable room identity, type, owner, classification and policy;
- `communication_membership`: user, room, role, state, joined/left timestamps;
- `communication_invitation`: inviter, invitee, expiry, scope and acceptance;
- `communication_policy`: room defaults, retention, guest rules, recording and encryption requirements.

Authorization must distinguish:
- read/join;
- send messages;
- invite members;
- manage membership;
- moderate;
- start/host a meeting;
- share screen;
- upload/download files;
- export or retain records;
- record/transcribe;
- administer the communications service.

A room owner is not automatically a platform administrator. HR/managerial authority must not implicitly grant access to private message content. Administrative access to metadata and content are separate permissions and must be logged.

MFA should be required for privileged actions and configurable/required for all staff according to organizational policy. Session revocation and employee offboarding must revoke communication access and invalidate relevant device credentials. Historical E2EE content may remain unreadable to newly enrolled devices unless an explicitly designed, user-visible recovery mechanism exists.

## 5. Encryption and security model

### 5.1 Transport security

- HTTPS/TLS for all browser/API endpoints.
- WebSocket Secure (WSS) for realtime connections.
- DTLS-SRTP for WebRTC media transport.
- Short-lived, scoped access tokens for media and TURN; never expose service secrets in browser code.
- Strict origin/CSRF controls for cookie-authenticated state changes.
- Secure, HttpOnly, SameSite cookies where browser session cookies are used.

Transport encryption protects connections to endpoints. It does not by itself prevent a server or SFU from accessing plaintext.

### 5.2 End-to-end encryption

Target security properties:
- Direct and group message bodies are E2EE.
- Attachments are encrypted client-side before upload; object storage receives ciphertext.
- Device identity and key changes are visible to users.
- New devices require an explicit verification or recovery flow.
- Group membership changes trigger protocol-defined key rotation/rekey behavior.
- Key backup/recovery is opt-in, separately encrypted, and clearly explains its trust implications.
- No plaintext message body, attachment key, private key, recovery phrase, or call media is written to ordinary application logs.

For calls, E2EE must be evaluated separately from DTLS-SRTP. If an SFU can access media plaintext, the call is not E2EE. A media E2EE mode may use supported WebRTC encoded-frame encryption / insertable streams and a reviewed key-distribution design. Browser/device support, multi-party behavior, screen-share tracks, recording interaction, and failure handling must be tested. Do not advertise media E2EE until those tests pass.

### 5.3 Security modes exposed to users

Use explicit labels:
- `TRANSPORT_ENCRYPTED` — encrypted in transit, service endpoints may process plaintext.
- `E2EE_MESSAGES` — message content and supported attachments are end-to-end encrypted.
- `E2EE_MEDIA` — media tracks are end-to-end encrypted across the selected conference topology.
- `DEGRADED` — a required security property is unavailable.
- `UNKNOWN` — the system lacks evidence to establish the security state.

A room's required security mode must be enforced server-side. The UI cannot upgrade the claim based on a lock icon alone.

### 5.4 Threat model and controls

| Threat | Required controls |
|---|---|
| Stolen employee session | MFA, short-lived sessions/tokens, device/session revocation, anomaly alerts |
| Unauthorized room access | Server-side membership checks, expiring invitations, admission controls |
| Compromised device | Device inventory, verification state, revocation, key rotation |
| Malicious file | Type/size limits, safe download handling, malware scanning where compatible with client-side encryption; explain scanning limitations for ciphertext |
| Malicious link/content | Safe rendering, URL warnings, no execution of uploaded content |
| SFU/media compromise | Minimize trust, isolate service, short-lived credentials, media E2EE where supported |
| Admin misuse | Split duties, least privilege, immutable security audit, no implicit content access |
| Metadata leakage | Minimize collection, restrict access, retention limits, avoid sensitive data in logs |
| Denial of service | Rate limits, quotas, room limits, bounded uploads, monitoring and abuse controls |
| Supply-chain compromise | Pinned dependencies, update policy, vulnerability scanning, reproducible deployment evidence |

This is an architecture threat model, not a security certification or penetration-test result.

## 6. Meetings and video conferences

Meeting lifecycle:
`DRAFT → SCHEDULED → OPEN → LOBBY → ACTIVE → CLOSING → ENDED`
with `CANCELLED`, `FAILED`, and `UNKNOWN` represented distinctly.

Required capabilities:
- instant meeting and scheduled meeting;
- private invitation and organization directory selection;
- lobby/waiting room and host admission;
- host, co-host, presenter and participant roles;
- mute/unmute, camera, speaker and device selection;
- screen/window/tab sharing with explicit browser permission;
- participant list, hand-raise, reactions and meeting chat;
- participant removal and room lock;
- network quality indicators and reconnect state;
- optional captions/transcription only after privacy and processing policy is approved;
- recording disabled by default; if enabled, require policy authorization, visible persistent indicator, participant notice/consent as required, storage policy and access controls.

A meeting can be operational without recording. Recording is not a default requirement and must not be silently enabled by administrators.

### 6.1 Media security acceptance

Before a media service can be marked production-ready:
- verify TLS and authenticated signaling;
- verify that unauthorized users cannot join or subscribe to tracks;
- test TURN relay behavior and credential expiry;
- test browser permission denial, device loss, reconnect and network changes;
- verify whether the SFU can decrypt media in each supported mode;
- test E2EE with multiple participants and screen sharing;
- test unsupported-client behavior without silent downgrade;
- verify that recording/transcription cannot bypass room policy;
- load-test expected participant counts and measure CPU, bandwidth, latency and packet loss;
- document supported browsers/devices and known limitations.

## 7. Files, retention and data governance

- Files are private by default and inherit room/user access policy.
- For E2EE rooms, encrypt files client-side and store ciphertext; server-side malware inspection may be limited or impossible without a separately consented scanning design.
- Download links are short-lived, scoped, and revocable where the storage provider permits.
- Retention is configured by data classification and organizational/legal requirements; no universal retention duration is hard-coded in this architecture.
- Deletion semantics must distinguish removal from UI, server deletion, object-store deletion, backups, and recipient copies.
- Legal hold/export must be a separately authorized process with an explicit notice/policy basis; it must not be described as transparent E2EE content access.
- Search, previews, notifications and email digests must not leak message content beyond the selected encryption model.

## 8. Audit, observability and evidence

Audit permitted operational metadata, for example:
- account/device enrolled, verified, revoked;
- room created, membership changed, invitation accepted/expired;
- meeting scheduled, opened, joined, ended;
- security mode selected and verified;
- recording policy changed or recording started/stopped;
- file access grant/revocation;
- administrative policy changes and failed authorization attempts.

Do not log message bodies, private keys, attachment plaintext, call audio/video, screen contents, passwords, access tokens, or recovery secrets.

Every consequential event should include actor, action, subject, timestamp, correlation ID, policy decision, outcome and evidence reference. Presence and delivery receipts are sensitive metadata; make their collection and visibility configurable.

Operational metrics may include active sessions, room counts, connection failures, media quality aggregates, service latency, queue lag and resource utilization. Avoid content-derived analytics unless separately approved.

## 9. Proposed data ownership and API contracts

TRAMPILLERA-owned domain tables (introduced only through reviewed migrations):
- `communication_identities`
- `communication_devices`
- `communication_rooms`
- `communication_memberships`
- `communication_invitations`
- `communication_policies`
- `communication_meetings`
- `communication_meeting_participants`
- `communication_file_refs`
- `communication_security_events`
- `communication_service_instances`

Message bodies and E2EE room state should remain with the selected messaging protocol service rather than being duplicated as plaintext in TRAMPILLERA's general application tables.

Proposed API namespace (contracts only; not implemented):
- `/api/v1/communications/me`
- `/api/v1/communications/devices`
- `/api/v1/communications/rooms`
- `/api/v1/communications/rooms/:id/members`
- `/api/v1/communications/invitations`
- `/api/v1/communications/meetings`
- `/api/v1/communications/meetings/:id/join-token`
- `/api/v1/communications/files`
- `/api/v1/communications/policies`
- `/api/v1/communications/security-events`
- `/api/v1/communications/health`

The application API issues short-lived, narrowly scoped tokens after authorization. It must not proxy arbitrary media traffic or become an open relay.

## 10. Integration with existing TRAMPILLERA domains

- **Identity & Access:** single employee identity, MFA, session revocation and authorization.
- **Control Plane:** module lifecycle, service configuration, security posture and evidence.
- **Operations Desk:** messaging/media health probes, capacity and deploy identity.
- **Audit:** metadata-only security and governance events.
- **Notifications:** mentions, invitations, missed calls and reminders, with content minimization.
- **Process Studio / Duties:** assign follow-ups from meetings only through explicit user action or approved workflow.
- **Files & Media Registry:** asset references and access grants; ciphertext for E2EE attachments.
- **Calendar:** meeting scheduling and invitations; external calendar integration is optional and permissioned.

Communications must not be used as an undocumented channel for privileged AI agents to issue commands. Any future AI meeting assistant, summarizer or bot must be an explicit room participant with visible identity, scoped permissions, consent, and a recorded policy basis.

## 11. Deployment and recovery strategy

Recommended staged topology:
1. Keep the existing TRAMPILLERA Node.js service as Control Plane and identity integration gateway.
2. Run messaging protocol service separately, with private networking, persistent storage and its own backup/upgrade policy.
3. Run media SFU/TURN separately; validate UDP/TCP reachability, TLS certificates, firewall rules, bandwidth and provider support before choosing a host.
4. Keep media traffic out of the existing Render web process.
5. Use PostgreSQL and private object storage where required; define backup, restore and key-backup recovery independently.
6. Do not deploy a production system until restore, key recovery, incident response and offboarding have been tested.

A free-tier web service is not assumed sufficient for reliable video conferencing. Media bandwidth, TURN relay, persistent storage, concurrent rooms, CPU and regional latency must be costed before selecting hosting.

## 12. Delivery roadmap

### Stage 0 — Architecture and proof of concept
- Confirm staff count, concurrent meeting target, expected regions and device/browser baseline.
- Evaluate Matrix-based messaging and at least one maintained WebRTC SFU candidate.
- Verify E2EE message and attachment behavior in supported clients.
- Prototype 3–5 participant conference, screen sharing, TURN relay and media E2EE feasibility.
- Produce a threat model, data-flow diagram, cost estimate and deployment decision record.

### Stage 1 — Identity and private messaging
- Add communication identity/device mapping to the existing employee identity model.
- Deploy private messaging service with federation disabled by default.
- Implement direct/group rooms, membership, unread state, notifications and E2EE.
- Add device verification, revocation, offboarding and recovery UX.
- Complete security and privacy review before inviting all employees.

### Stage 2 — Meetings and media
- Add authenticated meeting creation, invitations, lobby and participant roles.
- Integrate SFU and TURN with short-lived scoped tokens.
- Implement audio/video and screen share.
- Verify media encryption mode and present it honestly per meeting.
- Add quality telemetry without collecting media content.

### Stage 3 — Files and collaboration
- Add client-encrypted attachments, access expiry and revocation.
- Add agendas, notes, follow-up tasks and optional calendar integration.
- Add accessibility, captions and localization after privacy review.

### Stage 4 — Operations and scale
- Capacity/load tests, incident runbooks, backup/restore and disaster recovery.
- Security review and independent penetration test.
- Mobile/desktop clients and approved external guest workflows.
- Optional recording/transcription only after explicit governance approval.

## 13. Acceptance gates

A capability is not accepted because a screen or lock icon exists.

| Gate | Evidence required |
|---|---|
| Identity | Employee mapping, MFA policy, authorization tests, offboarding/revocation test |
| Messaging | Multi-device delivery, membership enforcement, E2EE verification, key-change behavior |
| Attachments | Client-side encryption test, access-control test, expiry/revocation test |
| Meetings | Multi-participant audio/video, screen share, lobby/role tests, reconnect behavior |
| Media E2EE | Independent test proving SFU cannot access plaintext in the claimed mode |
| Audit | Evidence that metadata events are recorded and message/media content is excluded |
| Privacy | Retention, export, deletion, consent and admin-access policy approved |
| Operations | Monitoring, capacity test, backup and successful restore, incident/rollback runbook |
| Release | Source commit, automated checks, deployment identity and post-deploy smoke tests |

Use statuses `NOT IMPLEMENTED`, `DEMO`, `PARTIAL`, `REAL`, and `UNKNOWN` precisely. `EXECUTED` is not `VERIFIED`.

## 14. Open decisions

These decisions must be resolved during Stage 0, not guessed:
- number of employees and expected concurrent users/meetings;
- required supported browsers, operating systems and mobile devices;
- whether federation or external guests are ever allowed;
- mandatory E2EE policy and acceptable device compatibility constraints;
- legal basis, retention periods, employee notices and jurisdictional requirements;
- hosting budget and acceptable operational responsibility;
- whether recording/transcription is prohibited, opt-in, or permitted for selected meeting classes;
- whether users need cross-device encrypted history recovery and which trust model is acceptable.

## 15. Explicit non-goals for v0.1

- No implementation of a messaging server, conference server, SFU, TURN, WebSocket, E2EE, key backup, or file vault.
- No custom cryptographic protocol or proprietary encryption algorithm.
- No default call recording, employee surveillance, or hidden content inspection.
- No claim of security certification, E2EE, high availability, or production readiness.
- No deployment to Render until the infrastructure and cost review confirms that the chosen media topology is suitable.

**Governing rule:** TRAMPILLERA may claim only the security properties demonstrated by tests and independently reviewable evidence.


## 16. Capacity and communication modes — user requirement (2026-11-25)

**Initial product planning range:** 2–100 simultaneous participants in a communication session. This is a design target to validate, not a demonstrated capacity or a hosting guarantee. Stage 0 must test representative network conditions and define supported concurrency per topology.

### 16.1 Mode A — Everyday Communication

Designed for two colleagues or working groups:
- one-to-one direct messages and calls;
- small group conversations and ad-hoc audio/video calls;
- department, project and topic channels;
- threaded replies, reactions, mentions, presence and file exchange;
- quick screen sharing and collaborative discussion.

The product should make a two-person call frictionless while retaining the same identity, security and audit rules as larger rooms.

### 16.2 Mode B — Corporate Events & Broadcasts

Designed for presentations, product/development demonstrations, news briefings, department updates, leadership announcements, organization-wide meetings and celebrations.

Required event formats:
- **Interactive meeting:** participants may speak, share camera/screen and ask questions subject to host controls.
- **Presentation / town hall:** one or several presenters publish audio/video/screen; audience microphones are muted by default and enabled by host or moderated Q&A.
- **Announcement:** an authorized person publishes a prominent organization/department notice with priority, audience, effective time and acknowledgement policy. This is a notification/workflow, not merely a chat message.
- **Celebration / social event:** optional informal event with reactions and moderated participation, without weakening account security.

Event controls:
- organizer, host, co-host, presenter, moderator and attendee roles;
- invitation by organization, department, team or selected employees;
- registration/RSVP where useful;
- scheduled start, agenda, presenter materials and event description;
- lobby, admission, room lock, mute controls and moderated Q&A;
- audience reactions and hand-raising;
- persistent event notice and calendar/reminder integration;
- post-event links/materials and explicitly assigned follow-up tasks;
- optional recording only when separately authorized, visibly indicated and covered by participant notice/consent and retention policy.

### 16.3 Capacity and media topology

A 100-person event must not be implemented as 100 browser-to-browser mesh connections. Evaluate an SFU-based topology for multiparty media. Distinguish:
- **interactive participants** who publish audio/video;
- **presenters** who publish high-resolution media or screen share;
- **view-only attendees** who primarily receive streams;
- **moderators/hosts** who control the event.

The capacity target must be specified separately for each class. For example, a room with a few active presenters and many view-only attendees has a different resource profile from a room where every participant publishes camera and microphone.

The initial proof of concept must test:
- 2-person direct call;
- small group meeting;
- a 20-person interactive meeting;
- a 100-person presentation/town hall with a limited number of publishers;
- screen sharing, participant admission, reconnect, TURN relay and network degradation;
- bandwidth, CPU, latency, packet loss, concurrency and cost.

Do not promise 100-person full-camera interactive capacity until load testing on the selected infrastructure proves it. The system must show its tested room limits and refuse or degrade gracefully beyond them.

### 16.4 Security and access by event type

Every event has an audience scope and classification. Private department briefings, organization-wide announcements and informal celebrations may have different visibility, retention and guest policies. E2EE requirements must be declared per event class and supported by the chosen conference topology. A live broadcast must not be labelled E2EE merely because its transport uses TLS/DTLS-SRTP.

### 16.5 Announcement delivery and acknowledgement

Important announcements should support:
- priority: NORMAL / IMPORTANT / CRITICAL;
- audience: organization / department / team / named recipients;
- delivery channels: in-app inbox, prominent Control Plane notice, push/browser notification where enabled;
- optional acknowledgement: NOT_REQUIRED / REQUIRED;
- states: DRAFT / SCHEDULED / PUBLISHED / DELIVERED / ACKNOWLEDGED / EXPIRED / FAILED / UNKNOWN.

A published announcement is not automatically acknowledged. Delivery and acknowledgement evidence must be tracked separately. Critical notices should support an escalation policy without treating a missing acknowledgement as proof that the employee read or understood the message.



## 17. Employee participation: Announcement Board and Innovation & Development Board

TRAMPILLERA Communications includes two first-class participation workspaces. They are not informal chat threads: each has a clear purpose, ownership, lifecycle, visibility rules and auditable outcomes. Their purpose is to make organizational information accessible and to give every employee a practical route to contribute to improvement.

### 17.1 Announcement Board

**Purpose:** a reliable, searchable organizational noticeboard for information that employees need to know. It complements direct messages and channels; important organizational notices must not disappear in a fast-moving chat stream.

Supported announcement classes:
- company-wide news and leadership messages;
- department, team and project updates;
- operational notices, policy/process changes and deadlines;
- product, service, research and development announcements;
- events, presentations, training and internal opportunities;
- achievements, employee/team recognition, celebrations and congratulations;
- urgent operational or safety notices, where applicable.

Each announcement carries: title, body, category, priority (NORMAL, IMPORTANT, CRITICAL), audience scope (organization, department, team, project or explicitly selected employees), author/issuing authority, publication and expiry timestamps, attachments/links, language, optional translation provenance, and acknowledgement policy. Users can follow categories and scopes; critical notices may override ordinary notification preferences according to policy.

Publication lifecycle: DRAFT → REVIEW (if required) → SCHEDULED/PUBLISHED → EXPIRED/ARCHIVED, with FAILED and UNKNOWN represented explicitly. Delivery state is tracked separately per recipient where technically supported: PENDING, DELIVERED, ACKNOWLEDGED, FAILED, UNKNOWN. Publication is not delivery; delivery is not acknowledgement; acknowledgement is not proof that a person read, understood or agreed with the message.

Authorized publishers may target only audiences within their scope. Critical announcements require a defined authorized role and may require a second approver. Corrections and withdrawals preserve an audit trail; edits to published notices show a visible updated timestamp and change history. Acknowledgement is required only when justified by policy, not as a routine surveillance mechanism.

### 17.2 Innovation & Development Board

**Purpose:** an inclusive, employee-accessible pipeline for ideas, problems, proposals and practical improvements. Any employee may submit a proposal regardless of department or seniority, subject to clear confidentiality and safety boundaries.

Proposal categories include:
- product/service innovation and new business opportunities;
- process simplification, quality and operational efficiency;
- technology, automation, AI and digital transformation;
- customer/partner experience;
- workplace safety, accessibility and working conditions;
- sustainability, resource use and cost reduction;
- training, knowledge sharing and organizational development.

A guided submission should ask for only useful information: short title, problem/opportunity, proposed change, expected benefit, affected area, optional evidence/attachments, estimated effort or dependencies if known, and whether the proposal may be shared broadly. Employees are not expected to produce a business case before submitting an idea; reviewers can help develop it.

Every proposal receives a stable ID, submission timestamp, acknowledgement and visible lifecycle. Proposed lifecycle: DRAFT → SUBMITTED → TRIAGE → UNDER_REVIEW → NEEDS_INFORMATION / PILOT_PROPOSED → ACCEPTED → PILOT_IN_PROGRESS → ADOPTED, with alternative terminal/holding states DECLINED, DUPLICATE, ON_HOLD, WITHDRAWN, ARCHIVED, plus UNKNOWN where evidence is absent. A decline or hold must include a respectful explanation and, where possible, a suggested alternative or revisit condition.

Participation features:
- comments and constructive discussion, with moderation and anti-harassment controls;
- support signals and optional peer collaboration requests; popularity is not the sole selection criterion;
- tags, related proposals and duplicate linking without erasing the original contributor's record;
- an assigned reviewer/owner, next action and target review date;
- requests for clarification and the ability for the author to revise or add evidence;
- pilot proposals with scope, sponsor, success criteria, risks, budget/effort estimate and review date;
- links to approved tasks, projects, Process Studio workflows and meeting decisions;
- contributor recognition and outcome reporting, with public attribution only according to the contributor's preference and organizational policy.

A proposal must never silently disappear. The submitter can see its current status, responsible review function, last update, next expected step and decision rationale, subject to confidentiality rules. Configurable service targets should govern acknowledgement and first review; missed targets surface to the responsible owner rather than being hidden. No automatic acceptance, funding or implementation is implied by submission or peer support.

### 17.3 Fairness, confidentiality and governance

- Submission is open to all employees; evaluation authority is assigned by domain expertise and policy, not by the submitter's rank.
- Separate idea visibility (PRIVATE_TO_AUTHOR_AND_REVIEWERS, TEAM, ORGANIZATION) from proposal lifecycle and access permissions.
- Provide a confidential route for sensitive operational, personnel or security-related concerns; route these to a restricted authorized function rather than a public idea feed. Do not describe a submission as anonymous unless identity handling and metadata leakage have been independently verified.
- Protect employees from retaliation for good-faith proposals and respectful criticism; provide moderation, reporting and escalation routes.
- Record decision metadata and status history, not unnecessary private discussion content. Restrict access to confidential proposals and attachments.
- Declare intellectual-property, confidentiality and external-publication rules before submission. Do not silently transfer employee ownership or grant publication rights through a generic submit button; obtain legal review for the applicable jurisdiction and employment arrangements.
- Publish aggregate outcomes such as proposals received, reviewed, piloted and adopted only when cohort sizes and privacy controls prevent re-identification. Do not create coercive employee leaderboards or rank individuals by idea count.
- Distinguish SUBMITTED, REVIEWED, PILOTED and ADOPTED in analytics. A submission count is not an innovation outcome.

### 17.4 Proposed data and API contracts

Proposed TRAMPILLERA-owned records (contracts only; not implemented):
- communication_announcements, communication_announcement_audiences, communication_announcement_deliveries, communication_announcement_acknowledgements;
- innovation_proposals, innovation_proposal_tags, innovation_proposal_comments, innovation_proposal_support, innovation_proposal_reviews, innovation_proposal_status_events, innovation_pilots.

Proposed API namespace (not implemented):
- /api/v1/communications/announcements and /api/v1/communications/announcements/:id/acknowledgements;
- /api/v1/communications/innovation/proposals, /proposals/:id, /proposals/:id/comments, /proposals/:id/reviews, /proposals/:id/status, /proposals/:id/pilots;
- /api/v1/communications/participation/metrics for privacy-preserving aggregate metrics.

All writes require server-side identity, scope authorization, validation, rate limits, CSRF protection where applicable, correlation IDs and audit events. Status transitions are validated server-side. These records must integrate with the existing audit and notification boundaries and must not be represented as live capabilities until implemented and tested.

### 17.5 Acceptance gates

Before release, test audience isolation, unauthorized publication and review attempts, scheduled delivery, expiry, correction history, failed/unknown delivery, acknowledgement semantics, notification preferences, confidential proposal visibility, reviewer assignment, state-transition enforcement, comment moderation, attachment access, offboarding, retention/deletion, accessibility and mobile-responsive behavior. Verify that an employee can submit an idea, receive acknowledgement, track its owner and status, and see a reasoned outcome end-to-end. Until these tests pass, the boards remain architecture-only / NOT IMPLEMENTED.
