# TRAMPILLERA Comms — Architecture & Security Specification v0.1

**Status:** Product and security design baseline; implementation not yet connected  
**Date:** 2026-11-23  
**Module key:** `communications.workspace`  
**Experience:** TRAMPILLERA Control Plane → Communications → TRAMPILLERA Comms

## 1. Purpose

Provide an internal communications workspace for verified organization members:
- one-to-one and group messaging;
- project and department channels;
- audio/video meetings and screen sharing;
- device and session management;
- identity verification, key lifecycle and security administration;
- audit and retention controls that do not undermine end-to-end confidentiality.

The communications module is a platform capability, not a public social network. It must use shared Identity & Access and organizational membership contracts. The existing application has a single administrator session and does not yet provide multi-user identity, roles, memberships or duties. These dependencies are blockers for production use.

## 2. Non-negotiable security principles

1. **No home-grown cryptography.** Select maintained, independently reviewed protocol implementations and obtain a specialist security review before production.
2. **End-to-end means end-to-end.** Server operators, database administrators, application administrators and media relays must not be able to read message or media plaintext by default.
3. **Identity is bound to keys.** Users must be able to inspect and verify devices and detect key changes.
4. **Least privilege.** Channel membership, conference roles, guest access and administrative capabilities are separately scoped.
5. **No silent downgrade.** If encryption or identity verification is unavailable, the client must clearly show that secure mode is unavailable and prevent misleading security claims.
6. **No simulated success.** UI presence, successful HTTP requests or a connected WebRTC call do not prove E2EE.
7. **Recovery is explicit.** Device loss, key recovery, member removal and account recovery must have documented consequences.
8. **Metadata is data.** Document and minimize what servers, relays and logs can observe.
9. **Recording is exceptional.** Off by default; visible to all participants; explicit consent and retention policy required.
10. **Unknown is a valid state.** Security assurance remains `UNKNOWN` until independent tests and review support a stronger status.

## 3. Logical architecture

### 3.1 Client layer
- Web client embedded in Control Plane, plus later desktop/mobile clients.
- Local key store backed by platform secure storage where available.
- Device enrollment and identity verification UX.
- Message composer, conversation history, attachments, presence and search.
- Conference UI: participant grid, device selection, mute/camera, screen share, waiting room and host controls.

### 3.2 Messaging services
- Authenticated API gateway and session service.
- Conversation and membership service.
- Opaque ciphertext message relay and durable delivery queue.
- Attachment service storing encrypted blobs only.
- Push/notification service with minimal content-bearing payloads.
- Device registry and key directory.
- Audit service storing security events and administrative actions, not message plaintext.

### 3.3 Conference services
- WebRTC signaling service.
- SFU media forwarding layer for group calls.
- TURN relay for difficult network paths.
- Encoded-frame media encryption (for example, WebRTC Insertable Streams / encoded transforms) so the SFU forwards encrypted media without holding content keys.
- Conference policy service for membership, lobby, moderator controls and recording consent.

The SFU/TURN topology, hosting provider, bandwidth and operational cost must be selected after a capacity and threat-model exercise. A web service on the current Render Free plan is not assumed to be a suitable production video infrastructure.

## 4. Cryptographic protocol selection

### Messaging
Evaluate established, maintained implementations of the Signal Protocol family for one-to-one and group messaging, and/or the Messaging Layer Security (MLS, RFC 9420) standard for group key establishment. Select a concrete library and client strategy only after checking current maintenance, platform support, licensing, interoperability, security audits and operational maturity.

Required properties:
- authenticated key agreement;
- forward secrecy;
- post-compromise security / key evolution where supported;
- per-device identity and key rotation;
- authenticated group membership changes;
- replay and message-order protections;
- safe handling of multi-device sessions;
- encrypted attachments and encrypted local caches.

Do not implement protocol primitives, key derivation, ratchets, or group key management from scratch.

### Audio/video
Use WebRTC for real-time transport. For multi-party calls, an SFU may route packets but must not terminate application-level media encryption. Evaluate a maintained SFrame / encoded-transform approach and key distribution tied to verified conference membership. Test browser compatibility and key rotation when participants join or leave.

TLS protects transport to each service but is not a substitute for end-to-end encryption.

## 5. Identity, access and organization model

Required entities (target schema, not yet implemented):
- `orgs`, `org_memberships`
- `users`, `user_devices`, `device_keys`
- `conversations`, `conversation_members`
- `messages` (ciphertext envelope only)
- `attachments` (encrypted object references and integrity metadata)
- `channels`, `channel_members`
- `conferences`, `conference_members`, `conference_events`
- `key_transparency_events`
- `security_events`, `retention_policies`, `consent_records`

Roles and duties remain distinct. Permissions answer what an actor may do; duties define what they are responsible for, by when, and what evidence is required.

## 6. API contract outline

Versioned namespace proposal:
- `/api/v1/comms/devices`
- `/api/v1/comms/keys`
- `/api/v1/comms/conversations`
- `/api/v1/comms/channels`
- `/api/v1/comms/messages`
- `/api/v1/comms/attachments`
- `/api/v1/comms/conferences`
- `/api/v1/comms/conferences/:id/signaling`
- `/api/v1/comms/security-events`
- `/api/v1/comms/policies`

All state-changing endpoints require authenticated membership, authorization, CSRF protection appropriate to the session model, input validation, rate limits, abuse controls and audit correlation IDs. Message APIs accept and return opaque ciphertext envelopes; plaintext processing is client-side.

## 7. Privacy, moderation and administration boundaries

- Administrators can manage membership and revoke access, but cannot silently decrypt E2EE content.
- A user report may explicitly submit selected message plaintext and surrounding context; this is a user-initiated disclosure, not background server access.
- Search across E2EE history is client-side or uses carefully designed privacy-preserving indexing; server-side plaintext indexing is prohibited by default.
- Retention and deletion policies must explain what can be deleted from clients, servers, backups and recipient devices.
- Legal hold, export and compliance requirements may conflict with E2EE. Resolve jurisdiction and business requirements before choosing a design; do not promise both unrestricted administrator access and true E2EE.
- Presence, IP addresses, call participants, timestamps and traffic patterns can reveal sensitive metadata. Minimize collection and retention.

## 8. Delivery plan

### Stage 0 — UI concept (current branch)
- Integrated Communications workspace navigation.
- Messages, Conferences, Security & keys, Workspace admin views.
- Sample content is clearly marked as local preview only.
- No backend calls, real message transmission, device access, signaling or encryption.

### Stage 1 — Architecture and threat model
- Complete data classification, abuse cases, threat model and trust-boundary diagrams.
- Select messaging protocol/library and media E2EE strategy.
- Decide hosting, object storage, SFU/TURN and operational budget.
- Define key recovery, device loss, member removal and legal/retention policy.

### Stage 2 — Identity and device foundation
- Multi-user identity, organization membership, RBAC/ABAC and device enrollment.
- Key directory, verification UX, key-change alerts and auditable revocation.
- Security tests and specialist review.

### Stage 3 — Encrypted messaging
- One-to-one and group E2EE, encrypted attachments, offline delivery and multi-device behavior.
- Independent interoperability, replay, membership-change and recovery tests.

### Stage 4 — Encrypted conferences
- WebRTC signaling, SFU/TURN, encoded-frame E2EE and participant key lifecycle.
- Screen sharing, lobby, moderator tools and explicit recording consent.
- Network impairment, browser compatibility, load and penetration testing.

### Stage 5 — Production readiness
- Independent cryptographic/security review and remediation.
- Backup/restore and key recovery exercises.
- Incident response, monitoring, abuse controls, retention and data-protection review.
- Deploy only after acceptance gates are met.

## 9. Verification matrix

| Capability | Current status | Evidence required for PASS |
|---|---|---|
| Control Plane Comms screen | UI concept | Browser rendering and interaction test |
| Message delivery | NOT IMPLEMENTED | Authenticated end-to-end delivery test |
| Message E2EE | NOT IMPLEMENTED | Protocol test vectors, multi-device tests, independent review |
| Encrypted attachments | NOT IMPLEMENTED | Ciphertext-at-rest and retrieval verification |
| Video conferencing | NOT IMPLEMENTED | Real multi-client WebRTC session |
| Media E2EE | NOT IMPLEMENTED | SFU cannot decrypt; encoded-frame tests and review |
| Device identity | NOT IMPLEMENTED | Enrollment, verification, revocation tests |
| Membership and roles | NOT IMPLEMENTED | Authorization and negative tests |
| Recording consent | NOT IMPLEMENTED | Explicit participant consent and audit tests |
| Security audit | UNKNOWN | Independent review report and remediation evidence |

## 10. Explicit non-goals of the current UI release

- It does not send messages or persist conversations.
- It does not access microphone, camera, screen or contacts.
- It does not establish WebRTC calls or conference rooms.
- It does not generate, store or rotate cryptographic keys.
- It does not provide E2EE, TLS configuration, secure backups or compliance certification.
- It does not create multi-user accounts or organization memberships.

**Governing rule:** The interface must never claim a secure communication capability before the implementation and its security properties have been independently verified.
