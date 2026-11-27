# TRAMPILLERA Preview Database Schema Isolation v0.1

Status: implementation prepared on `feat/origami-maps-planner-foundation`.

## Purpose

Run the Preview application against the existing Render PostgreSQL instance while keeping its application tables in a dedicated schema. Production continues to use the default `public` schema.

## Contract

- Production service: `DB_SCHEMA=public` (default); no production configuration change is required.
- Preview service: `DB_SCHEMA=trampillera_preview`.
- The Node PostgreSQL pool sets its connection `search_path` to the selected schema only. It does not append `public`.
- At Preview startup, the application creates `trampillera_preview` if it does not exist, then runs its existing bootstrap and versioned migrations inside that schema.
- Existing `public` tables and rows are not migrated, renamed, copied, or deleted by this Preview bootstrap.
- The schema name is validated as a lowercase PostgreSQL identifier before it is used in connection configuration or DDL.

## Render Preview configuration

Set these variables on the Preview Web Service only:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Internal connection string for the existing `trampillera-db` instance |
| `DB_SCHEMA` | `trampillera_preview` |

Use the internal connection string because the Preview service and database are both in Frankfurt in the same Render workspace. Do not set these variables on the Production service.

## Isolation boundary

This is logical namespace isolation, not a separate PostgreSQL security principal or independent database. The application uses the same database role as the existing instance; that role can still access other schemas if it deliberately issues schema-qualified SQL. The application’s ordinary unqualified queries resolve only inside `trampillera_preview` because its connection search path excludes `public`.

A stronger security boundary requires a dedicated database role with privileges limited to the Preview schema, or a separate database instance.

## Verification

After the Preview service is manually deployed, verify:

1. `/ready` returns success.
2. `current_schema()` for the Preview application connection is `trampillera_preview`.
3. `schema_migrations` and application tables exist under `trampillera_preview`.
4. The existing `public` schema retains its prior table count and contents.
5. The Preview logs contain no migration or permission errors.

Do not claim the Preview database is provisioned until these checks pass.
