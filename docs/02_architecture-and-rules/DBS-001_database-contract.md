# Database Contract

## Current Contract Status

Prisma is the active application ORM. PostgreSQL is the target database. Supabase SQL migrations exist, but currently drift from `prisma/schema.prisma`.

## Immediate Risks

1. `supabase/migrations/20260520000000_init.sql` uses lowercase enum values while Prisma enums are uppercase.
2. SQL migration enables `uuid-ossp`, but Prisma models use `gen_random_uuid()`, which normally requires `pgcrypto`.
3. Prisma direct connection does not automatically apply Supabase `auth.uid()` RLS semantics.
4. Existing remote/Supabase databases still need DB-005/manual reconciliation before Prisma migrations are applied.
5. Work UI reads DB but several writes are still local state.

## v0.1 Decision

Use Prisma schema as the canonical application schema for v0.1. Treat Supabase SQL migration as legacy/reference until reconciled.

Use app-layer authorization for v0.1:

- `requireUser()`
- service-level ownership checks
- explicit visibility filters for public/client routes

Do not claim RLS protection until the runtime auth strategy is designed and tested.

## Schema Ownership

- DBAgent owns migration consistency review.
- AuthPermissionAgent reviews auth-sensitive schema.
- ProductManagerAgent resolves PRD-level data conflicts.

## Required Before DB Changes

- Migration impact note.
- Enum casing decision.
- Seed impact note.
- Rollback or recovery note if data might be affected.

## Verification Commands

```bash
pnpm db:validate
pnpm db:generate
pnpm build
```

Run `pnpm db:seed` only against a disposable local database. DB-003 made seed idempotent by implementation, and DB-006 verified runtime double-run behavior against a disposable local PostgreSQL database.

## DB-001 Database Contract Audit

Date: 2026-06-02

Status: `DONE`

Scope: static schema/migration/seed audit plus safe Prisma validation. No product runtime code was changed and no destructive database command was run.

### 1. Current Prisma Schema Summary

`prisma/schema.prisma` is the most complete current application schema. It defines:

- Identity and permissions: `Profile`, `UserModulePermission`.
- Work module: `Project`, `ProjectTask`, `ProjectNote`, `ProjectDeliverable`.
- Research module: `ResearchThread`, `ResearchSource`, `ResearchConcept`, `ResearchWritingProject`, `ResearchWritingSection`, `AIFeedbackRun`, `ResearchDigest`, `ResearchEvent`, `AcademicPerson`.
- Workflow / agent-adjacent persistence: `WorkflowRule`, `AgentMessage`.
- 20 Prisma enums, including Work enum additions that are absent from the Supabase SQL migration: `ProjectPhase`, `ProjectHealth`, `TaskStatus`, `TaskSource`, `NoteSource`, `NoteOrigin`, `DeliverableNodeType`, and `AgentMessageStatus`.

All primary keys currently use PostgreSQL UUIDs with `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`.

### 2. Current Migration State

`prisma.config.ts` declares `prisma/migrations` as the Prisma migrations path, but `prisma/migrations/` does not currently exist.

The repository has one Supabase migration:

- `supabase/migrations/20260520000000_init.sql`

That migration is not equivalent to the current Prisma schema and should not be treated as the current application contract without a reconciliation pass.

### 3. Does `prisma/migrations/` Exist?

No. `find prisma -maxdepth 3 -type f` currently lists only:

- `prisma/schema.prisma`
- `prisma/seed.ts`

### 4. Does `supabase/migrations/` Exist?

Yes. It contains:

- `supabase/migrations/20260520000000_init.sql`

### 5. Prisma vs Supabase SQL Drift

| Area | Prisma schema | Supabase SQL migration | Risk |
|---|---|---|---|
| Migration ownership | Prisma config points to `prisma/migrations` | Only `supabase/migrations` exists | Developers may apply different schemas depending on command. |
| Enum casing | Prisma enum values are uppercase | SQL enum values are lowercase | Prisma writes can fail against SQL-created enum types. |
| User role enum | `OWNER`, `PARTNER`, `CLIENT` | `owner`, `partner`, `client` | Seed uses `OWNER`; incompatible with lowercase SQL enum. |
| Work project fields | Includes `clientName`, `phase`, `health`, `visibility`, `clientToken`, `startedAt`, `nextAction`, counters | SQL project table only has basic fields | Work UI/service assumes fields that SQL migration does not create. |
| Task model | `body`, `status`, numeric `priority`, `source`, `completedAt` | `description`, `is_completed`, text `priority` | CRUD and mappers depend on Prisma shape. |
| Note model | optional `title`, `source`, `visibility`, `origin` enum | required `title`, text `origin`, text `category`, no visibility | Client/public boundary and note UI can drift. |
| Deliverable model | `nodeType`, `deliveredAt`, parent cascade relation | no `node_type`, no `delivered_at`, parent `ON DELETE SET NULL` | Deliverable tree behavior differs. |
| Workflow/agent tables | `WorkflowRule`, `AgentMessage` exist | absent | Workflow persistence cannot be initialized from SQL migration. |
| RLS | Not represented in Prisma schema | Supabase SQL enables partial RLS policies | Prisma direct connection currently relies on app-layer checks, not Supabase RLS semantics. |
| Extensions | Uses `gen_random_uuid()` defaults | Enables `uuid-ossp` only | `gen_random_uuid()` normally requires `pgcrypto`. |

### 6. Enum Mismatch Risks

Canonical decision for v0.1: Prisma enum values are the application-level source of truth and should remain uppercase unless a separate reviewed migration maps values explicitly with Prisma `@map`.

Known mismatches:

| Enum | Prisma values | Supabase SQL values | Runtime risk | Recommended fix |
|---|---|---|---|---|
| `user_role` | `OWNER`, `PARTNER`, `CLIENT` | `owner`, `partner`, `client` | Seed and app writes can fail. | Use Prisma-generated uppercase enum migration or add explicit value mappings after review. |
| `project_status` | `EXPLORING`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED` | lowercase equivalents | Project create/update can fail. | Same as above. |
| `visibility_type` | `INTERNAL_ONLY`, `CLIENT_VISIBLE` | lowercase equivalents | Client visibility filters can fail or silently mismatch. | Same as above. |
| `deliverable_status` | `DRAFT`, `DELIVERED`, `APPROVED` | lowercase equivalents | Deliverable writes can fail. | Same as above. |
| Research enums | uppercase values | lowercase equivalents | Research actions can fail if DB is created from SQL migration. | Same as above. |
| New Work/agent enums | present in Prisma | absent from SQL migration | Fresh DB from SQL migration lacks required enum types. | Generate a reviewed Prisma baseline migration. |

Do not patch enum values in a deployed database casually. Enum value rewrites can require data migration and downtime planning.

### 7. UUID / Extension Mismatch Risks

Current Prisma strategy: database-generated UUIDs via `gen_random_uuid()`.

Required PostgreSQL extension: `pgcrypto`.

Current Supabase SQL migration enables only `uuid-ossp`, which is associated with `uuid_generate_v4()` rather than `gen_random_uuid()`. This is a real drift risk for a fresh database created only from `supabase/migrations/20260520000000_init.sql`.

Recommended v0.1 decision:

- Keep Prisma model IDs as `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`.
- Require `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` in the first reviewed Prisma baseline migration.
- Do not introduce `uuid-ossp` unless the schema changes to `uuid_generate_v4()`, which is not recommended for this project right now.

### 8. Seed Script Assumptions

`prisma/seed.ts` currently:

- Loads environment with `dotenv/config`.
- Uses the shared Prisma client from `src/lib/db`.
- Upserts `Profile` by `email: "admin@example.com"`.
- Imports Work mock projects, tasks, notes, and deliverables.
- Generates UUIDs from mock IDs through an in-memory `Map`.
- Upserts Work entities by generated UUID.

Seed stability assessment:

- Fresh empty DB: likely works if schema exists, environment points to a reachable database, `pgcrypto` is enabled, and the seed runner can execute TypeScript.
- Repeated seed runs: not idempotent for Work data because the mock ID to UUID map is regenerated on every run. Each run can create duplicate projects/tasks/notes/deliverables.
- Profile seed is idempotent because it upserts by email.
- Relation order appears acceptable for current deliverable mock data, but parent-child assumptions should be documented or stabilized.
- DB-003 added `tsx` as a direct devDependency for `db:seed`.

DB-006 follow-up result: runtime double-run seed verification passed against a disposable local database; Work demo row counts did not duplicate.

### 9. Runtime Query Assumptions

Current runtime assumptions observed during DB-001:

- `src/lib/db.ts` uses Prisma with `@prisma/adapter-pg` and reads `process.env.DATABASE_URL`.
- `prisma.config.ts` prefers `DIRECT_DATABASE_URL` for CLI/migrations, falling back to `DATABASE_URL`.
- `src/lib/services/auth.service.ts` is fail-closed by default. Development mock auth only works when `PERSONAL_OS_AUTH_MODE=mock` is set outside production, and it resolves an exact profile email without falling back to the first profile. See `AUT-002_auth-runtime-strategy.md`.
- `src/lib/services/project.service.ts` enforces project ownership with `assertCanAccessProject(profileId, projectId)`.
- `src/app/actions/work.ts` reads Work data through service-layer ownership checks and mappers.
- Some write actions already exist in `src/lib/actions/work.ts`, but this DB-001 task did not wire or modify Work CRUD UI behavior.
- `src/app/client/[token]/page.tsx` still reads mock Work data and filters by client-visible flags in memory.
- Research has some Prisma action files, while Research context/UI still uses localStorage/mock state in multiple routes.
- Workflow UI currently uses mock workflow data even though `WorkflowRule` and `AgentMessage` exist in Prisma.

This means v0.1 should continue to require service-layer authorization and explicit client visibility filters. Do not rely on Supabase RLS until AUTH-001 defines the auth strategy and migration ownership.

### 10. Recommended Canonical Source Of Truth

For v0.1, use `prisma/schema.prisma` as the canonical application data contract.

Treat `supabase/migrations/20260520000000_init.sql` as legacy/reference until DB-005 confirms whether it should be archived, rewritten, or reconciled into a Prisma baseline.

Future migrations should live in `prisma/migrations` after DB-002 creates a reviewed baseline migration. Supabase-hosted databases can still be used, but schema evolution should be managed through committed Prisma migrations and deployed with `prisma migrate deploy`.

### DB-001 Verification Result

Safe validation/codegen commands run:

```bash
pnpm prisma validate
pnpm db:validate
pnpm db:generate
```

Result:

- `pnpm prisma validate` passed.
- `pnpm db:validate` passed.
- `pnpm db:generate` generated Prisma Client v7.8.0 successfully.

No seed, migrate, reset, deploy, or destructive database command was run.

### DB-001 Approval

The DB-001 strategy was approved by the user before DB-002:

- Canonical DB source of truth: `prisma/schema.prisma`.
- Future migrations: `prisma/migrations/`.
- Supabase SQL migration: legacy/reference only for now.
- Enum strategy: Prisma uppercase enum values remain canonical for v0.1.
- UUID strategy: keep `gen_random_uuid()` and require PostgreSQL `pgcrypto`.
- No destructive database commands.
- No production or remote database changes.

## DB-002 Baseline Migration Audit

Date: 2026-06-02

Status: `DONE`

Migration file:

- `prisma/migrations/20260602155517_baseline_initial_schema/migration.sql`
- `prisma/migrations/migration_lock.toml`

Generation method:

```bash
pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
```

Notes:

- Prisma 7.8 no longer supports the older `--to-schema-datamodel` flag, so the migration was generated with `--to-schema`.
- `migrate dev --create-only` was intentionally not used because the configured `DATABASE_URL` is nonlocal and DB-002 must not connect to or mutate a valuable database.
- The migration was generated from static schema diff and has not been applied anywhere.

Manual SQL review:

| Check | Result |
|---|---|
| Expected tables | Pass. Migration creates 17 tables matching current Prisma models. |
| Expected enums | Pass. Migration creates 20 enum types matching current Prisma enums. |
| Enum casing | Pass. Enum values are uppercase and align with Prisma canonical values. |
| UUID defaults | Pass. All 17 primary keys use `DEFAULT gen_random_uuid()`. |
| Required extension | Pass. `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` was added manually because Prisma diff did not emit it. |
| `uuid-ossp` | Pass. Migration does not use `uuid-ossp` or `uuid_generate_v4()`. |
| Unique constraints | Pass. `profiles.email` and `user_module_permissions(profile_id, module_key)` unique indexes are present. |
| Foreign keys | Pass. Project, Research, and AgentMessage/WorkflowRule relations are represented. |
| Cascade behavior | Pass against current Prisma schema. Project children cascade; nullable AI feedback/message references use `ON DELETE SET NULL`. |
| Public/client fields | Pass. `projects.client_token`, `visibility`, and child visibility fields are present. |
| Workflow/agent persistence | Pass. `workflow_rules`, `agent_messages`, and `agent_message_status` are present. |

Supabase legacy comparison:

- The Prisma baseline uses `pgcrypto`; the legacy Supabase migration enables `uuid-ossp`.
- The Prisma baseline uses uppercase enum values; the legacy Supabase migration uses lowercase enum values.
- The Prisma baseline includes newer Work fields such as `client_token`, `phase`, `health`, `visibility`, `next_action`, task `status`, task `source`, note `visibility`, deliverable `node_type`, and `delivered_at`.
- The Prisma baseline includes `workflow_rules`, `agent_messages`, and `agent_message_status`; the legacy Supabase migration does not.
- The Prisma baseline does not define Supabase RLS policies. v0.1 continues to rely on app-layer authorization until AUTH-001 designs and tests the auth/RLS boundary.
- The legacy Supabase migration remains reference-only and should not be deleted or rewritten in DB-002.

Fresh local DB stance:

- This baseline is intended for a fresh local development database. DB-006 verified the bootstrap path against a disposable local PostgreSQL database.
- It should not be applied blindly to an existing Supabase or remote database.
- Existing deployed databases require DB-005/manual reconciliation before any migration is applied.

Verification:

```bash
pnpm db:validate
pnpm prisma validate
pnpm db:generate
```

Result:

- `pnpm db:validate` passed.
- `pnpm prisma validate` passed.
- `pnpm db:generate` generated Prisma Client v7.8.0 successfully.

Commands intentionally not run:

- No `prisma migrate reset`.
- No `prisma migrate dev`.
- No `prisma migrate deploy`.
- No seed command.
- No destructive SQL.

## DB-003 Seed Idempotency Audit

Date: 2026-06-02

Status: `DONE`

Scope: stabilize `prisma/seed.ts` for repeatable Work demo bootstrap. No Prisma schema, migration SQL, Work CRUD, Auth, Client Portal, Research DB, or runtime Agent Team OS feature was changed.

### 1. Records Seeded

The seed currently creates or updates:

- One demo profile: `admin@example.com`.
- Five Work demo projects from `mockProjectsFull`.
- Seventeen Work demo tasks from `mockTasks`.
- Twelve Work demo notes from `mockNotes`.
- Fifteen Work demo deliverables from `mockDeliverables`.

### 2. Models Seeded

DB-003 covers these Prisma models:

- `Profile`
- `Project`
- `ProjectTask`
- `ProjectNote`
- `ProjectDeliverable`

No Research, Workflow, Agent Team OS runtime, Finance, Chamber, Company, Client Portal, or Auth runtime records are seeded in DB-003.

### 3. Profile Idempotency

The profile seed is idempotent by unique email:

- Stable identity: `Profile.email = "admin@example.com"`.
- Upsert key: `email`.
- Seed now sets `fullName = "Admin User"` and `role = OWNER` on both create and update.

### 4. Work Demo Idempotency

Before DB-003, Work records used an in-memory map from mock IDs to `crypto.randomUUID()`. Because the map was rebuilt on every process run, repeated seeds produced new UUIDs and could duplicate Work projects/tasks/notes/deliverables.

DB-003 replaces that strategy with deterministic UUIDs:

- Namespace: `personal-os:v0.1:work-demo`.
- Stable input: entity kind plus mock ID, such as `project:p1`, `task:t1-p1`, `note:n1-p1`, or `deliverable:df1-p1`.
- Upsert key: deterministic primary key `id`.

Repeated runs now target the same deterministic demo IDs and update the same demo rows instead of creating another copy.

### 5. Records That Could Duplicate Before DB-003

The following could duplicate on repeated runs before DB-003:

- `Project`
- `ProjectTask`
- `ProjectNote`
- `ProjectDeliverable`

DB-003 prevents new duplicates for future seed runs. It does not attempt to clean up any already-created pre-DB-003 duplicate rows because those older rows have no explicit demo marker and deleting by name/client alone could touch user-created data.

### 6. Stable Identity Fields

| Model | Stable seed identity |
|---|---|
| `Profile` | unique `email` |
| `Project` | deterministic UUID from `project:<mockProject.id>` |
| `ProjectTask` | deterministic UUID from `task:<mockTask.id>` |
| `ProjectNote` | deterministic UUID from `note:<mockNote.id>` |
| `ProjectDeliverable` | deterministic UUID from `deliverable:<mockDeliverable.id>` |

The current schema does not have natural unique constraints for Work child records, so deterministic IDs are the minimal no-schema-change strategy.

### 7. Relation Creation Order

Seed order is:

1. `Profile`
2. `Project`
3. `ProjectTask`
4. `ProjectNote`
5. `ProjectDeliverable`

Deliverables are sorted before insertion so parent folders are upserted before child folders/files. The seed validates that:

- mock IDs are unique per entity kind
- task/note/deliverable project references exist
- deliverable parent IDs exist
- deliverable hierarchy does not have an unresolved parent/cycle

### 8. Enum Values Used

Mock lowercase UI/view-model values are converted to Prisma canonical uppercase values:

- project `status`, `phase`, `health`
- project/task/note/deliverable `visibility`
- task `status`, `source`
- note `source`, `origin`
- deliverable `nodeType`, `status`

This aligns with DB-001 and DB-002: Prisma uppercase enum values remain canonical for v0.1.

### 9. Mock ID Strategy

The seed still relies on Work mock IDs as stable source identifiers, but those IDs no longer become random UUIDs. They are converted through a deterministic namespace hash.

This means:

- Future repeated seed runs are stable.
- Seeded relations are stable.
- Seed IDs are not human-readable in the database, but they are reproducible from the seed namespace and mock IDs.
- Changing a mock ID intentionally creates a new demo record.

### 10. Recommended Seed Identity Strategy

Approved DB-003 strategy:

- Use `Profile.email` for the stable demo profile.
- Use deterministic UUID primary keys for Work demo records.
- Use `upsert` for every seeded model.
- Do not delete existing data.
- Do not attempt unsafe cleanup of legacy duplicate demo rows without an explicit disposable/local DB cleanup task.
- Run `pnpm db:seed` only against local/disposable databases.

### DB-003 Verification Result

Safe commands run:

```bash
pnpm add -D tsx
pnpm exec tsx --version
pnpm db:validate
pnpm db:generate
pnpm exec tsc --noEmit --pretty false
pnpm exec eslint prisma/seed.ts
pnpm lint
```

Result:

- `tsx` was added as a direct devDependency because `db:seed` already depends on `tsx prisma/seed.ts`.
- `pnpm exec tsx --version` passed with `tsx v4.22.4`.
- `pnpm db:validate` passed.
- `pnpm db:generate` generated Prisma Client v7.8.0 successfully.
- `pnpm exec tsc --noEmit --pretty false` passed.
- `pnpm exec eslint prisma/seed.ts` passed.
- `pnpm lint` failed on existing unrelated UI/React Compiler and unused-variable issues outside `prisma/seed.ts`.

Seed command intentionally not run:

```bash
pnpm db:seed
```

Reason: current `DATABASE_URL` was nonlocal during DB-003, and DB-003 could not run seed against a remote or valuable database. Runtime double-run verification was completed in DB-006 on a disposable local database.

## DB-006 Fresh Bootstrap Verification

Date: 2026-06-03

Status: `DONE`

Scope: apply the reviewed Prisma baseline migration to a disposable local PostgreSQL database, run the idempotent seed twice, confirm Work demo row counts do not duplicate, and run build. No product runtime code, Prisma schema, migration SQL, remote database, or Supabase database was changed.

### Disposable Database Target

DB-006 used a temporary local PostgreSQL cluster initialized under `/tmp/self-structure-v1-db-006-2430` on port `55432`.

The temporary database URL used for commands was:

```txt
postgresql://pzps0964713@localhost:55432/self_structure_db006
```

The cluster was stopped after verification and the temporary directory was removed.

### Migration Result

Command:

```bash
DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
DIRECT_DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
pnpm db:migrate
```

Result:

- Passed.
- Applied `20260602155517_baseline_initial_schema`.
- Confirmed database was in sync with `prisma/schema.prisma`.
- Applied only to the disposable local database.

### Seed Double-run Result

Commands:

```bash
DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
DIRECT_DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
pnpm db:seed

DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
DIRECT_DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
pnpm db:seed
```

Both seed runs completed successfully.

Row counts after the first seed:

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

Row counts after the second seed:

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

Conclusion: deterministic seed upserts are runtime-verified. Repeated seed runs did not create duplicate Work demo rows.

### Build And Validation Result

Commands:

```bash
DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
DIRECT_DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
pnpm build

DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
DIRECT_DATABASE_URL='postgresql://pzps0964713@localhost:55432/self_structure_db006' \
pnpm db:validate
```

Result:

- `pnpm build` passed.
- `pnpm db:validate` passed.

### DB-006 Decision

The baseline Prisma migration plus idempotent Work seed is now verified for a fresh disposable local PostgreSQL database.

This does not approve applying the baseline to existing Supabase/remote databases. DB-005 is still required before remote migration reconciliation.

## DATTR-017 Source Workflow Schema Proposal

Date: 2026-06-07

Status: `DONE_AS_PROPOSAL`

Scope: translate Source Asset, Single Source Recognition, Composite DataUnit, AI Source Workflow, and ModuleWriteIntent concepts into a reviewed persistence proposal before any Prisma migration.

Primary artifact:

- `docs/dev/source_workflow_schema_proposal.md`

Decision:

- No Prisma schema change was made in DATTR-017.
- No migration was generated.
- No Supabase or local database was changed.
- The proposal is intended to guide future migrations for formal AI Input persistence.

Proposed model groups:

1. Source intake and asset identity:
   - `SourceConnection`
   - `RawSourceItem`
   - `SourceAsset`
   - `SourceAssetSnapshot`
   - `SourceAssetLink`
   - `AssetAttributeSet`
   - `AssetExtraction`
   - `NormalizedContent`
2. Single Source Recognition:
   - `SourceFormatDetection`
   - `SourceDescriptiveMetadata`
   - `SourceProvenanceEvent`
   - `SourceEvidenceSelector`
   - `SourceQualityProfile`
   - `UrlSafetyCheck`
   - `MediaMetadataProfile`
   - `SourceFairProfile`
3. Naming and Composite DataUnit:
   - `SourceNamingProfile`
   - `NamingInferenceSignal`
   - `SourceRenameSuggestion`
   - `DataUnit`
   - `DataUnitTemplate`
   - `DataUnitTemplateSlot`
   - `DataUnitSlotState`
   - `DataUnitProposal`
   - `DataUnitProposalAsset`
   - `DataUnitAssetLink`
   - `DataUnitAnnotation`
   - `DataUnitModuleLink`
4. AI Source Workflow:
   - `SourceWorkflowConfig`
   - `AIWorkflowRun`
   - `AIWorkflowStep`
   - `AIWorkItem`
5. Module write boundary:
   - `ModuleWriteIntent`

Migration recommendation:

- Split future implementation into Migration A-D instead of one large remote migration.
- Migration A should create the core source registry.
- Migration B should add recognition and naming.
- Migration C should add Composite DataUnit models.
- Migration D should add workflow observability and module write intent.

Important constraints:

- Formal AI Input persistence should not silently re-enable mock fallback.
- `ModuleWriteIntent` remains the only path from source workflow output to final module SSOT records.
- High-risk modules and public/client-visible output still require human approval.
- `DATTR-010` SourceConnection/InputAdapter contract is complete as documentation/type proposal in `docs/architecture/source_connection_input_adapter_contract.md`.
- `DATTR-011` intake security/privacy/retention policy should be completed before real connector runtime, URL fetch, webhook routes, media capture, or remote Supabase deployment.
