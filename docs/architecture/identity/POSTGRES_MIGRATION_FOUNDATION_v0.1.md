# PostgreSQL Migration Foundation v0.1

**Status:** Implemented in source branch; NOT deployed  
**Date:** 2026-11-25  
**Scope:** Versioned additive schema changes for the existing TRAMPILLERA PostgreSQL database.

## 1. Purpose

Introduce a controlled path for future database schema evolution without rewriting the existing startup bootstrap or changing existing employee/business records in this release.

The first release deliberately establishes a migration ledger and stamps the schema that the legacy bootstrap already creates. It does not yet move all historical DDL into migration files and does not add organization, role, permission or duty tables.

## 2. Current behavior

At application startup:
1. Existing `initializeDatabase()` continues to create/verify the current tables and indexes using its existing idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements.
2. After the legacy schema bootstrap succeeds, `runMigrations(pool)` acquires a PostgreSQL advisory lock.
3. The runner creates `schema_migrations` if it does not exist.
4. It applies `0001_legacy_schema_baseline.sql` as an intentionally no-op marker and records its SHA-256 checksum.
5. Future numbered SQL files are applied in lexical/numeric order, each inside its own transaction.
6. The lock is released and the client returned to the pool.

This sequence is important: the baseline marker is recorded only after the existing bootstrap succeeds. It does not claim to reconstruct the original database history.

## 3. Migration ledger

`schema_migrations` contains:
- `version` — primary key, based on the numbered filename without `.sql`;
- `checksum` — SHA-256 of the trimmed SQL source;
- `applied_at` — database timestamp.

Migration filenames must match `NNNN_lowercase_name.sql`. The first file is fixed as `0001_legacy_schema_baseline.sql`. Sequence numbers must be unique.

## 4. Safety behavior

- **Serialization:** PostgreSQL advisory lock `(742019, 1)` prevents concurrent app instances from applying migrations simultaneously.
- **Atomicity:** each new migration and its ledger insert share one transaction.
- **Failure behavior:** a failed migration rolls back and prevents application startup from proceeding.
- **Immutability:** if an applied migration's checksum changes, startup fails; edit history by adding a new migration, never by rewriting an applied file.
- **Completeness:** if the ledger references a migration file missing from the release, startup fails rather than silently proceeding.
- **No destructive automatic rollback:** schema rollback is not inferred or executed. Recovery must use a separately reviewed forward-fix or tested restore plan.
- **No seed coupling:** migration files contain schema/data transformations only; operator-managed seed data must not be overwritten on restart.

## 5. Migration authoring rules

Every future migration must:
1. Use the next unused four-digit sequence.
2. Be additive by default; destructive changes require an explicit compatibility/deprecation plan.
3. Preserve employee IDs, auth hashes, auth versions, Team Game assignments and historic audit references.
4. Include constraints and indexes only after assessing existing production data.
5. Be safe to run once under the migration runner; do not put non-transactional PostgreSQL operations in the normal migration stream.
6. Include a corresponding integration test against a clean database and a legacy-shaped database.
7. Document expected lock duration, table rewrite risk and operational impact.
8. Never include secrets or production data in migration source.
9. Never edit an applied migration. Add a new numbered file.
10. Be verified before any Render deployment.

## 6. Verification included

Unit tests cover:
- baseline requirement and migration ordering;
- apply-once behavior and ledger checksum recording;
- repeat startup without reapplying migrations;
- checksum mismatch rejection;
- rollback and lock release on failure;
- rejection when an applied migration file disappears;
- invalid filenames and empty SQL files.

The existing GitHub Actions Docker/PostgreSQL smoke test continues to exercise real application startup and existing employee/Team Game behavior. This PR extends CI with the migration unit tests. A subsequent integration assertion will verify the baseline ledger row and restart idempotency in the live PostgreSQL test container.

## 7. Current limitations

- Legacy schema DDL still lives in `initializeDatabase()`; the migration runner does not retroactively version or replay it.
- The first baseline is a stamp, not an independently reproducible schema snapshot.
- No normalized organization, scoped RBAC, duties or employee invitation schema is included.
- No production database was inspected or modified during development.
- Source implementation and CI success do not establish Render deployment or production database backup/restore status.

## 8. Next stage

After this foundation is merged and verified:
1. Add a tested additive migration for organization units and positions.
2. Add effective-dated employee organization assignments with explicit, reviewed mapping from legacy free-text department/title fields.
3. Add permission/role catalogues and scoped grants only after route-by-route authorization design.
4. Add duties and evidence as a separate domain.
5. Preserve legacy auth and Team Game compatibility at every stage.
