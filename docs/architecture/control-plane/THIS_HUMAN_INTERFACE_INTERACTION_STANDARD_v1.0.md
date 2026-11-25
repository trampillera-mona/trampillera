# TRAMPILLERA Human Interface & Interaction Standard (THIS)

**Document ID:** TRAMPILLERA-STD-UX-001  
**Version:** 1.0  
**Status:** Proposed baseline  
**Scope:** All TRAMPILLERA user-facing workspaces and modules  
**Normative language:** MUST, MUST NOT, SHOULD, MAY are used as requirements keywords.

## 1. Purpose

THIS defines the human-facing interaction contract for TRAMPILLERA. It is a cross-platform standard, not a separate application or module. It applies to the Control Plane, operations, registry, analytics, process tooling, identity and duties, data workspaces, integrations, recovery, and spatial/scene experiences.

**Core principle:** Complexity belongs in the architecture, not in the user's way. The system must be powerful enough for professionals, understandable enough for beginners, and pleasant enough for everyday work.

The interface is successful when a user can understand where they are, what matters, what they can do, and what will happen next—without needing to understand the platform's internal architecture.

## 2. Foundational principles

1. **Progressive disclosure.** Show the simplest useful view first. Reveal advanced controls when the task, permission, or user preference calls for them.
2. **Consistency.** Shared actions, statuses, navigation, forms, tables, dialogs, and feedback MUST behave consistently across modules.
3. **Task orientation.** Organize work around user goals and next actions, not internal database tables or service boundaries.
4. **Contextual guidance.** Help MUST appear close to the decision or field it explains. Avoid interruptive tours and repeated generic instructions.
5. **Visible state.** Loading, empty, stale, blocked, denied, failed, submitted, completed, and verified states MUST be distinguishable.
6. **Safe operation.** Risky or irreversible actions MUST explain their impact and require an appropriate confirmation. Drafts and reversible changes SHOULD be supported.
7. **Recoverability.** Where technically possible, provide undo, drafts, history, retry, rollback, or a clear recovery route.
8. **Evidence before assertion.** The UI MUST distinguish observed facts, user input, estimates, and unverified information.
9. **No simulated success.** A click, request dispatch, or optimistic animation MUST NOT be presented as a completed operation. Completion requires a server-confirmed result; verification-sensitive actions require separate evidence of the resulting state.
10. **Accessible by default.** Interfaces SHOULD support keyboard operation, readable contrast, scalable text, meaningful labels, and responsive layouts.
11. **Performance with restraint.** Do not render dashboards full of decorative cards or charts that do not help a decision or task.
12. **User agency.** The interface MUST explain why an action is unavailable and, where safe, how to obtain access or resolve the blocking condition.

## 3. Interaction depth

THIS defines three levels of interaction depth. They are not job titles, account types, or fixed role mappings.

| Level | Default experience | Typical capabilities |
|---|---|---|
| Everyday | Clear tasks, notifications, guided forms, plain-language outcomes | View assigned work, submit information, follow progress |
| Professional | Dense work surfaces with filters, analytics, editors, and process controls | Manage records, investigate trends, configure permitted workflows |
| Engineering | Explicit technical detail and diagnostics | Inspect schemas, API contracts, policies, integrations, execution evidence |

The active level MAY be influenced by task context, permissions, and user preference. It MUST NOT grant permissions. Authorization is enforced independently by the server.

Users SHOULD be able to access relevant advanced detail without losing their place or duplicating work.

## 4. Navigation and page anatomy

### 4.1 Navigation

- Navigation MUST use stable, meaningful labels.
- The current location MUST be visible.
- Related functions SHOULD be grouped by user intent.
- Deep pages SHOULD provide breadcrumbs or an equivalent way back.
- A user's permissions MAY affect visible navigation, but hiding a link is not an authorization control.

### 4.2 Standard page anatomy

A typical workspace SHOULD contain only the elements useful to its task:

1. Location indicator and page title.
2. One-sentence purpose or contextual explanation.
3. One clearly identified primary action, where an action is appropriate.
4. Main work surface: table, form, chart, process view, editor, map, or scene.
5. Secondary filters and tools, progressively disclosed.
6. Contextual help or inspector.
7. Activity, history, ownership, and evidence when relevant.

Not every page needs every region. Empty space is preferable to irrelevant panels.

### 4.3 Four orientation questions

Every screen MUST make it reasonably easy to answer:

- Where am I?
- What matters here?
- What can I do?
- What happens next?

## 5. Standard interaction patterns

### 5.1 Forms

Forms SHOULD:
- group fields by task rather than database structure;
- explain required fields and accepted formats;
- validate close to the field and summarize blocking errors;
- preserve user input after recoverable failures;
- distinguish save draft from submit or publish;
- show who will receive or review a submission.

### 5.2 Tables and lists

Tables SHOULD provide appropriate search, sorting, filtering, pagination or virtualized loading, clear empty states, and row-level actions. Bulk actions MUST disclose how many records will be affected and what will change.

### 5.3 Charts and analytics

Charts MUST have a stated purpose, readable labels, units, time ranges, and provenance where available. Users SHOULD be able to inspect the underlying records or source for material metrics. Missing data MUST NOT be silently rendered as zero.

### 5.4 Processes and workflows

Process views MUST represent actual configured states and transitions, not decorative diagrams. They SHOULD show current state, responsible actor, next permitted action, blockers, and execution history.

### 5.5 2D and 3D scenes

Scene tools SHOULD use a consistent editing model:
- scene/canvas;
- object and layer tree;
- properties inspector;
- asset library;
- timeline or temporal controls when relevant;
- validation and issue panel;
- save/publish state and change history.

Selection, visibility, locking, editing, and deletion MUST have clear and consistent semantics. A rendered object MUST NOT imply that its underlying data is authoritative or verified. The interface SHOULD expose source, provenance, coordinate/reference system, and confidence where applicable.

### 5.6 Notifications

Notifications SHOULD be actionable and explain the event, affected object, responsible party, and next step. Avoid notifications that merely repeat information already visible in the current workspace.

## 6. Identity, access, positions, and duties

THIS separates four concepts:

- **Identity:** who the person or service is.
- **Position:** the organizational or operational context in which they act.
- **Permission:** what actions the subject is authorized to perform.
- **Duty:** what the subject is responsible for delivering or reviewing.

A permission MUST NOT be interpreted as an obligation. A duty MUST NOT itself grant permission.

When a duty is assigned, its user-facing representation SHOULD state:
- required outcome and purpose;
- responsible person or team;
- due date or service window;
- required inputs and evidence;
- reviewer or acceptance authority;
- escalation or blocked-work route.

The interface MUST explain denied actions in plain language without exposing sensitive policy internals.

## 7. Controlled action lifecycle

For actions that require review or evidence, use an appropriate subset of this lifecycle:

`DRAFT → VALIDATED → SUBMITTED → IN_PROGRESS → VERIFIED → CLOSED`

Additional states MAY include `BLOCKED`, `REJECTED`, `OVERDUE`, and `CANCELLED`.

The UI MUST NOT imply that every action requires every stage. Simple, low-risk actions SHOULD remain simple.

State transitions MUST be authorized and validated by the server. The interface MUST display the server-confirmed state and distinguish it from a pending request. Verification MUST reference the evidence or check that supports it.

## 8. Feedback and error handling

Every interactive operation MUST provide an appropriate outcome:
- pending/in progress;
- succeeded (server-confirmed);
- failed;
- partially completed;
- blocked or unauthorized;
- outcome unknown due to timeout or lost connection.

An unknown outcome MUST NOT be relabeled as failure or success. The UI SHOULD offer a safe status refresh or reconciliation path before the user repeats a potentially non-idempotent action.

Error messages SHOULD state what happened, what was affected, and the next safe step. Technical details MAY be available in an expandable diagnostic view.

## 9. Contextual help and onboarding

Help SHOULD be:
- task-specific;
- short at the point of use;
- expandable for deeper explanation;
- sensitive to the user's current interaction depth and permissions;
- maintained alongside the feature it documents.

New users SHOULD be guided through meaningful first tasks rather than forced through a long product tour. Expert users SHOULD be able to dismiss or reduce repeated guidance.

## 10. Visual and component system

A shared component library SHOULD define typography, spacing, color tokens, focus states, buttons, forms, tables, tabs, dialogs, status indicators, charts, and navigation.

Color MUST NOT be the sole carrier of meaning. Status labels SHOULD combine text with color or iconography. Decorative effects MUST NOT reduce readability, responsiveness, or task completion.

The existing TRAMPILLERA visual language may remain dark and engineering-oriented, but functional clarity takes precedence over visual density.

## 11. Privacy and security in the interface

- Secrets, session tokens, passwords, and private credentials MUST NOT be exposed in UI diagnostics.
- Sensitive values SHOULD be masked by default.
- Destructive and privileged actions MUST use server-side authorization and audit logging.
- The UI MUST NOT rely on client-side role checks as the security boundary.
- Confirmation dialogs MUST identify the target and consequence, not merely ask "Are you sure?"

## 12. Screen acceptance checklist

A screen is not ready for release until its applicable checks pass:

| Check | Acceptance condition |
|---|---|
| Purpose | A first-time user can identify the screen's purpose |
| Orientation | Current location and next useful action are apparent |
| Simplicity | Primary task is not buried under advanced controls |
| Consistency | Shared components follow platform patterns |
| Permissions | Server enforces access; UI explains denials |
| State | Loading, empty, stale, error, pending, and success states are handled as applicable |
| Evidence | Claims and completion states are supported by returned data or evidence |
| Recovery | Failure and retry behavior are safe and understandable |
| Accessibility | Keyboard, labels, focus, contrast, and text scaling are checked |
| Responsive behavior | Core task remains usable at supported viewport sizes |
| Audit | Material actions are traceable where required |

A failed check MUST be recorded as a known gap, not silently treated as passed.

## 13. Implementation strategy

THIS is implemented incrementally. It does not authorize a wholesale rewrite of the existing application.

1. **Foundation:** document current behavior, establish shared tokens and reusable components, preserve existing authentication and diagnostics.
2. **Reference workspace:** implement Operations Desk as the first exemplar using real server data and explicit unknown states.
3. **Core workspaces:** apply the patterns to Registry, Analytics, Process Studio, Identity & Duties, and Recovery & Audit.
4. **Spatial workspace:** apply the scene editing model to 2D/3D experiences after data and API contracts are defined.
5. **Continuous verification:** test usability, permissions, accessibility, state handling, and recovery with each release.

Existing features MUST be preserved unless a reviewed change explicitly replaces them. New UI MUST NOT fabricate data to fill empty panels. Mock data is permitted only when clearly labeled as demonstration data and isolated from production state.

## 14. Relationship to other architecture specifications

THIS defines the human interaction contract. It does not replace:
- the platform architecture specification;
- domain and database schemas;
- API contracts;
- identity and access-control policy;
- duty and workflow protocols;
- audit and evidence requirements;
- AWAS or other execution/state-transition contracts.

Those specifications define system behavior; THIS defines how that behavior is made understandable and usable. The implementation MUST keep them consistent.

## 15. Governing rule

**Make the next correct action obvious. Keep complexity available, not in the way. Never make the interface claim more than the system can prove.**
