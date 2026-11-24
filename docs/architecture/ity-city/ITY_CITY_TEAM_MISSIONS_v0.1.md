# ITY CITY Team Missions & Collaboration v0.1

## User-facing entry points

- Employee portal: `/city/team/`
- ITY CITY module launcher: `/city/`
- Administrator mission and employee console: `/control/team/`
- Existing Control Plane: `/control/`

## Employee lifecycle

1. An administrator creates an employee record with name, work email, department and job title.
2. The server generates a random temporary password. The administrator sees it once and passes it to the employee privately.
3. The employee signs in at `/city/team/` and must set a personal password of at least 12 characters.
4. Employee passwords are stored as salted scrypt hashes. The employee session is separate from the administrator role.
5. Administrators can disable an employee account or issue a new one-time temporary password.

## Mission lifecycle

`ASSIGNED → IN_PROGRESS → SUBMITTED → VERIFIED`

A submission may be returned as `REJECTED`, with a required explanation, and then restarted and resubmitted.

- A mission may be assigned to one or more active employees.
- Each employee has an individual assignment and submission record.
- All employees assigned to the same mission can use its shared discussion thread.
- The employee records a result note when submitting.
- The administrator reviews the submission.
- XP is awarded once, only when the assignment transitions from `SUBMITTED` to `VERIFIED`.
- A rejected or pending submission receives no XP.
- The leaderboard is calculated from verified XP stored in PostgreSQL, not from browser localStorage.

## Data model

- `employees`: identity, account state, department and scrypt password hash.
- `team_missions`: mission brief, category, reward, deadline and publication state.
- `mission_assignments`: per-employee lifecycle, submission and review evidence, awarded XP.
- `mission_messages`: shared discussion for people assigned to the same mission.
- Existing `audit_events`: login, account, mission and review activity.

The database tables are created by the existing application startup migration using `CREATE TABLE IF NOT EXISTS`. No destructive migration or database reset is used.

## Security boundaries

- Employee and administrator sessions have distinct roles.
- All `/api/control/*` routes require an administrator session.
- Employee APIs require an active employee session and check mission assignment membership.
- Employee login has a dedicated rate limit.
- Passwords are hashed with Node.js scrypt and per-password random salts.
- Temporary passwords are returned only at creation/reset time and are not stored in plaintext.
- Employee portal content is escaped before rendering.
- Mission submission is a self-reported result note, not independent proof that work occurred. Administrator review is the verification step in this release.

## Explicit limitations

This release is a functional first server-backed collaboration/game loop, not a full HR or project-management suite.

Not included:
- Email invitations or automated password delivery.
- Self-service password reset.
- File attachments and evidence upload.
- Real-time WebSocket presence or push notifications.
- Team-wide shared completion state; each assigned employee has an individual submission.
- Multi-level approval, department managers, configurable roles or fine-grained permission matrices.
- Independent evidence capture from external engines.
- XP as an employment, compensation or productivity metric.

The employee portal refreshes data through HTTP requests. Messages are persisted and visible to all assigned participants when they refresh/open the discussion; there is no live push transport.

## Operational verification

After manual Render deployment:
1. Open `/control/` and sign in with the existing administrator password.
2. Open **TEAM ADMIN** or visit `/control/team/`.
3. Create two test employee accounts and privately copy their one-time temporary passwords.
4. Open `/city/team/` in two separate browser profiles and sign in as each employee.
5. Confirm both are required to change the temporary password.
6. Publish one mission assigned to both test employees.
7. Confirm both employees see the same mission and can exchange discussion messages.
8. Submit a result from one employee. Confirm the status becomes `SUBMITTED` and XP remains unchanged.
9. Verify the submission in Team Administration. Confirm XP is awarded once and the leaderboard updates.
10. Return a second test submission with a reason. Confirm it receives no XP and can be restarted.
11. Disable a test account and confirm it can no longer establish a new session.

Do not use real employee data until the administrator has tested the flow and the organization has agreed on mission governance and privacy rules.
