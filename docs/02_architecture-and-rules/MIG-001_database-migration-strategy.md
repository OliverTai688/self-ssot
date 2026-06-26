# Database Migration Strategy

Date: 2026-06-02

Status: `FRESH_BOOTSTRAP_VERIFIED`

This document records the DB-001 migration strategy decision for the Personal OS v0.1 path. It is intentionally conservative: stabilize the contract before Work CRUD, Auth, Client Portal, Research DB alignment, or runtime Agent Team OS models.

## Canonical Schema Source

Use `prisma/schema.prisma` as the canonical application schema source for v0.1.

Reasons:

- The application runtime already uses Prisma Client.
- `prisma.config.ts` is configured for Prisma migrations at `prisma/migrations`.
- The Prisma schema contains newer Work, Research, Workflow, and agent-adjacent models that are absent from the Supabase SQL migration.
- Server actions and mappers assume Prisma enum values and Prisma model shapes.

## Supabase Migration Status

`supabase/migrations/20260520000000_init.sql` should be treated as legacy/reference until explicitly reconciled.

Do not delete it. Do not deploy it as the current v0.1 schema without review.

Known drift:

- Lowercase SQL enum values vs uppercase Prisma enum values.
- Missing Work fields and newer Work enums.
- Older task/note/deliverable column contracts.
- Missing `WorkflowRule` and `AgentMessage`.
- Enables `uuid-ossp` while schema uses `gen_random_uuid()`, which requires `pgcrypto`.
- Partial RLS policies exist in SQL, but the current app uses Prisma direct connection and app-layer authorization.

## Future Migration Location

Future canonical migrations should live in:

```txt
prisma/migrations/
```

Recommended next step:

- DB-002 generated a reviewed Prisma baseline migration from `prisma/schema.prisma`.
- The baseline includes `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`.
- The baseline should not be applied to any valuable existing database until DB-005 confirms Supabase legacy strategy.

## Developer Commands

Use these commands for DB contract work:

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
```

Command meaning:

| Command | Purpose | Safety note |
|---|---|---|
| `pnpm db:validate` | Validate Prisma schema syntax/config compatibility | Safe; no DB write expected. |
| `pnpm db:generate` | Generate Prisma Client | Safe for codegen; no DB migration. |
| `pnpm db:migrate` | Create/apply local development migrations | Use on disposable or known local DB only. |
| `pnpm db:deploy` | Apply committed migrations in CI/production-like environments | Use after migrations are reviewed. |
| `pnpm db:push` | Push schema without migration history | Prototype only; not canonical for v0.1. |
| `pnpm db:seed` | Run seed data | Use only against disposable/local DB; DB-006 verified double-run behavior on 2026-06-03. |

Do not run:

```bash
pnpm prisma migrate reset
```

unless the user explicitly approves it for a disposable local database.

## Enum Naming Strategy

Canonical enum strategy for v0.1:

- Prisma enum names are PascalCase.
- Prisma enum values remain UPPERCASE.
- Database enum type names use snake_case through Prisma `@@map`.
- Do not mix lowercase SQL enum values with uppercase Prisma writes.

Example:

```prisma
enum ProjectStatus {
  EXPLORING
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED

  @@map("project_status")
}
```

If a future decision requires lowercase DB enum values, add explicit Prisma enum value `@map` entries in a reviewed schema change and document the migration impact. Do not change enum casing ad hoc.

## UUID Strategy

Canonical UUID strategy for v0.1:

- Use PostgreSQL UUID columns.
- Generate IDs in the database with `gen_random_uuid()`.
- Require the PostgreSQL `pgcrypto` extension.

The first Prisma baseline migration should include:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

Do not use `uuid_generate_v4()` unless the project intentionally switches to the `uuid-ossp` extension. The current schema does not do that.

## Required PostgreSQL Extensions

Required:

- `pgcrypto` for `gen_random_uuid()`.

Optional/legacy:

- `uuid-ossp` appears in the Supabase SQL migration but is not required by the current Prisma schema.

## Fresh Local Development Database

Recommended path after DB-006:

1. Create a fresh local PostgreSQL database.
2. Set `DIRECT_DATABASE_URL` or `DATABASE_URL` in `.env.local`.
3. Run `pnpm db:validate`.
4. Run `pnpm db:generate`.
5. Run `pnpm db:migrate` to apply reviewed Prisma migrations.
6. Run `pnpm db:seed`.
7. Run `pnpm db:seed` a second time when verifying idempotency or debugging bootstrap changes.
8. Run `pnpm build` when runtime code depends on generated Prisma types.

DB-006 verified this flow against a disposable local PostgreSQL database. Repeated seed runs did not duplicate Work demo rows.

## Existing Supabase / Remote Database

Recommended safe path:

1. Do not run `prisma migrate reset`.
2. Do not apply a newly generated baseline migration blindly.
3. Inspect the deployed schema separately from local assumptions.
4. Compare deployed tables/enums/extensions with `prisma/schema.prisma`.
5. Decide whether the deployed DB should be treated as disposable, manually reconciled, or migrated through an expand/contract plan.
6. If data exists, create a backup before any migration.
7. Use reviewed incremental migrations rather than replacing history.

If the deployed DB was created from `supabase/migrations/20260520000000_init.sql`, enum casing and missing columns must be reconciled before Prisma runtime writes are trusted.

## Future Production Database

Recommended path:

1. Commit Prisma migrations in `prisma/migrations`.
2. Validate schema in CI with `pnpm db:validate`.
3. Generate client with `pnpm db:generate`.
4. Deploy migrations with `pnpm db:deploy`.
5. Seed only approved non-sensitive bootstrap data.
6. Keep app-layer authorization active until RLS/Auth strategy is explicitly designed and tested.

Production should not use `pnpm db:push` as the primary schema evolution mechanism.

## Baseline Migration Recommendation

DB-001 did not create the baseline migration automatically because the repository has an existing Supabase migration that conflicts with the current Prisma schema.

DB-002 created a reviewable Prisma baseline migration by generating SQL from the current Prisma schema without applying it to a valuable database. The generated file was reviewed for:

- `pgcrypto` extension creation.
- Uppercase enum values.
- Work table columns expected by mappers and server actions.
- Cascade behavior on project child tables.
- `WorkflowRule` and `AgentMessage` table presence.
- Indexes and unique constraints.

## DB-002 Baseline Migration Generation

Date: 2026-06-02

Status: `DONE`

### Current State Confirmed

| Question | Result |
|---|---|
| Does `prisma/migrations/` exist? | Yes, created in DB-002. |
| Was it empty before DB-002? | Yes. Prior inspection found no Prisma migration files. |
| Does local DB migration history exist? | Not inspected through Prisma because the configured `DATABASE_URL` is nonlocal. DB-002 avoided DB connection and mutation. |
| Do package scripts support safe generation? | Yes. `db:validate`, `db:generate`, `db:migrate`, and `db:deploy` exist. |
| Is `.env` local/disposable? | No local disposable DB was confirmed. `DATABASE_URL` is nonlocal, so DB-002 used static diff. |

### Generation Method Used

Prisma 7.8 static diff:

```bash
pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

The older candidate command failed because Prisma 7.8 removed `--to-schema-datamodel`:

```bash
pnpm prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

No migration was applied to any database.

### Generated Files

```txt
prisma/migrations/migration_lock.toml
prisma/migrations/20260602155517_baseline_initial_schema/migration.sql
```

### Manual SQL Edit

Prisma diff did not emit the required PostgreSQL extension for `gen_random_uuid()`, so DB-002 added this safe line near the top of the migration:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

The migration does not include `uuid-ossp` or `uuid_generate_v4()`.

### Review Summary

- Creates 20 enum types with uppercase values matching Prisma.
- Creates 17 tables matching current Prisma models.
- Uses `DEFAULT gen_random_uuid()` for UUID primary keys.
- Includes Work module fields required for v0.1: client token, visibility, phase, health, task status/source, note visibility/source/origin, deliverable node type, and delivered timestamp.
- Includes Research, Workflow, `AgentMessage`, and `AcademicPerson` tables from the current schema.
- Includes unique indexes for `profiles.email` and `user_module_permissions(profile_id, module_key)`.
- Includes Prisma-modeled foreign keys and delete behavior.
- Does not include Supabase RLS policies; v0.1 still relies on app-layer authorization until AUTH-001.

### Supabase Legacy Comparison

`supabase/migrations/20260520000000_init.sql` remains legacy/reference only.

Key differences:

- Supabase SQL uses lowercase enum values; Prisma baseline uses uppercase.
- Supabase SQL enables `uuid-ossp`; Prisma baseline requires `pgcrypto`.
- Supabase SQL is missing newer Work fields and the Workflow/AgentMessage tables.
- Supabase SQL includes partial RLS policies; Prisma baseline does not claim RLS as the active v0.1 auth boundary.
- Existing Supabase/remote databases must be reconciled manually through DB-005 before applying Prisma migrations.

### Fresh Local DB Use

The baseline migration is appropriate for a fresh disposable local development database. It should be applied through Prisma migrations only after the developer has confirmed the target database is disposable/local.

Do not apply this baseline to:

- a production database
- a valuable remote Supabase database
- any database already initialized with the legacy Supabase SQL migration

without DB-005/manual reconciliation.

## Seed Strategy

Status: `RUNTIME_VERIFIED_IDEMPOTENT`

DB-003 made `prisma/seed.ts` idempotent by implementation and static verification. DB-006 verified runtime double-run behavior on a disposable local PostgreSQL database.

### Identity Strategy

Seeded identity is determined as follows:

| Record type | Identity |
|---|---|
| Demo profile | `admin@example.com` email upsert |
| Work projects | deterministic UUID from `personal-os:v0.1:work-demo:project:<mock id>` |
| Work tasks | deterministic UUID from `personal-os:v0.1:work-demo:task:<mock id>` |
| Work notes | deterministic UUID from `personal-os:v0.1:work-demo:note:<mock id>` |
| Work deliverables | deterministic UUID from `personal-os:v0.1:work-demo:deliverable:<mock id>` |

The seed uses `upsert` for every covered model and does not delete existing data.

### Covered Models

DB-003 idempotent seed covers:

- `Profile`
- `Project`
- `ProjectTask`
- `ProjectNote`
- `ProjectDeliverable`

The seed does not currently cover Research, Ingestion, Workflow, Life, Finance, Chamber, Company, Client Portal sharing records beyond Work visibility fields, or runtime Agent Team OS records.

### Repeated Seed Runs

Repeated seed runs are safe by implementation because they target the same deterministic IDs.

Expected behavior:

- Demo rows are created on the first run.
- Later runs update the same deterministic demo rows.
- User-created rows with other IDs are not touched.
- Pre-DB-003 duplicate demo rows are not cleaned automatically because they do not have a safe explicit marker.

### Local Only

Run seed only against local/disposable databases:

```bash
pnpm db:seed
```

Do not run seed against:

- production databases
- valuable remote Supabase databases
- any database where existing demo-like rows might need manual review

Do not use:

```bash
pnpm prisma migrate reset
```

unless the user explicitly approves it for a disposable local database.

### Seed Runner

`db:seed` uses:

```bash
tsx prisma/seed.ts
```

DB-003 added `tsx` as a direct devDependency so a clean install can run the existing seed script.

### Remaining Seed Limitations

- Pre-DB-003 random-ID demo duplicates may require manual cleanup in disposable databases.
- Changing a Work mock ID intentionally creates a new deterministic demo row.
- The seed does not yet initialize module permissions, Research, Workflow, or Agent Team OS runtime tables.

## DB-006 Fresh Bootstrap Verification

Date: 2026-06-03

Status: `DONE`

DB-006 verified the current local bootstrap path against a disposable local PostgreSQL cluster.

### Execution Target

Temporary database:

```txt
postgresql://pzps0964713@localhost:55432/self_structure_db006
```

Temporary cluster path:

```txt
/tmp/self-structure-v1-db-006-2430
```

The cluster was stopped and the temporary directory was removed after verification.

### Commands Run

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:seed
pnpm build
pnpm db:validate
```

All commands were run with `DATABASE_URL` and `DIRECT_DATABASE_URL` set to the disposable local database.

### Results

| Check | Result |
|---|---|
| Baseline migration | Passed; applied `20260602155517_baseline_initial_schema`. |
| First seed | Passed. |
| Second seed | Passed. |
| Row count stability | Passed; Work demo rows did not duplicate. |
| Build | Passed. |
| Prisma validation | Passed. |

Stable row counts after both seed runs:

| Table | Count |
|---|---:|
| `profiles` | 1 |
| `projects` | 5 |
| `project_tasks` | 17 |
| `project_notes` | 12 |
| `project_deliverables` | 15 |
| `research_threads` | 0 |
| `workflow_rules` | 0 |
| `agent_messages` | 0 |

### Decision

The fresh local DB bootstrap path is verified for v0.1 development. Future Work CRUD development can start from this database contract.

This verification does not make the legacy Supabase SQL migration canonical and does not authorize applying the baseline to an existing remote database.

## Review Gate

Human review is required before:

- Applying a baseline migration to a remote/Supabase database.
- Rewriting enum casing in an existing database.
- Changing primary key generation strategy.
- Treating Supabase RLS as the active auth boundary.
- Running seed against a non-disposable database.
