# MIG-003 AI Input Source Workflow Create-Only Migration Draft

**Task:** `DATTR-024H-MIGRATION-DRAFT`  
**Date:** 2026-06-23  
**Status:** Review draft created; migration apply was intended to remain blocked, but see 2026-07-22 addendum below — the tables now exist in the live database as an unintended side effect of an unrelated migration.

## 2026-07-22 Addendum — Tables Were Applied Ahead Of Schedule (Side Effect, Not A Deliberate Cutover)

While implementing an unrelated feature (`R2STORE-001`, Cloudflare R2 storage — see `SCH-005`/`RES-022`), `prisma migrate dev` was run intending to add only `FileAsset`/`MediaAsset`. Because `prisma migrate dev` diffs the *entire* `schema.prisma` against the live database rather than a targeted subset, it also applied every other pending schema change already sitting in `schema.prisma` — including all seven tables this document describes (`SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`) and the nullable `AcademicPerson.ownerId` column from `TENANT-001`. This was not requested or reviewed against this document's blocking rationale before running.

**What this changes:** the tables now exist for real in the live Supabase database (migration `20260722084811_add_file_media_assets`).

**What this does NOT change:** no application code reads or writes any of these seven tables — `src/lib/services/ai-input-source-workflow.service.ts` (`DATTR-024J`) still has `runtimeDbReadEnabled=false`/`runtimeDbWriteEnabled=false` hardcoded, no route handler or server action touches them, RLS policy is not applied (`DATTR-024K` still pending), connector runtime is not activated (`DATTR-024L` still pending), and `DATTR-024M`'s cutover-readiness gate fields (`migrationApplyAllowed`, `databaseConnectionAllowed`, `serviceDatabaseReadAllowed`, etc.) still correctly read `false` since those are computed from explicit code/env gates, not from whether the tables happen to exist. The owner reviewed this finding and chose to keep the tables (pure-additive, zero current runtime impact) rather than roll back with a further live-DB `DROP TABLE` migration.

**Correction to this document's own claim:** "migration apply remains blocked" is no longer accurate for schema *existence*. It remains accurate for schema *usage* — every subsequent DATTR-024 gate (K/L/M) still applies unchanged before any service is allowed to actually read or write these tables.

## Context

`DATTR-024H` is the first schema implementation slice after the Source Workflow persistence sequence gate. It materializes the Prisma model shape for AI Input Source Workflow persistence while keeping database apply, proof writes, connector runtime, public output, high-risk module writes, and external agent database access blocked.

The draft covers:

- `SourceConnection`
- `SourceAsset`
- `AIWorkflowRun`
- `AIWorkItem`
- `SourceNamingProfile`
- `DataUnitProposal`
- `ModuleWriteIntent`
- audit/proof/rollback reference fields only

It does not add a persisted `OperatingAuditEvent` table because persisted audit storage remains gated by `AUDIT-OPS-004` and the future `DATTR-024K-RLS-AUDIT-STORAGE` slice.

## Artifacts

| Artifact | Role |
|---|---|
| `prisma/schema.prisma` | Prisma model and enum draft, validated locally |
| `prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql` | Review-only SQL draft; intentionally outside `prisma/migrations` |
| `prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/README.md` | No-apply warning and review boundary |
| `scripts/check-ai-input-source-workflow-migration-draft.mjs` | Static checker for schema/migration draft readiness |
| `scripts/ai-input-source-workflow-proof-runner.mjs` | Follow-up `DATTR-024I-PROOF-RUNNER` dry-run proof gate exposed as `pnpm ai-input:proof`; it does not apply this draft or write DB rows |

## Decision

Use a non-applying migration draft directory instead of generating a pending Prisma migration under `prisma/migrations`.

Rationale:

- Prisma documents `migrate dev --create-only` as a way to create a migration without applying it, but the command is still a development workflow that involves migration history and shadow/development database behavior.
- This repo currently lacks an approved safe Source Workflow proof database target.
- A SQL file under `prisma/migrations` would be treated as pending by `prisma migrate deploy`.
- A review-only draft outside `prisma/migrations` lets agents and the owner review SQL shape without silently creating deployable migration state.

## Schema Rules

- Every persisted Source Workflow object has `ownerId`.
- Future runtime must derive owner scope through `requireUser()` and service-layer authorization before returning or mutating data.
- Secret material is represented only by references such as `secretRef` and `providerAccountRef`; provider tokens or raw credentials must not be stored in these tables.
- UI-safe redaction is represented by `redactionVersion`, `retentionClass`, summary fields, and JSON metadata/provenance fields that must be mapped before display.
- Proposal and write-intent records remain proposal-only and human-reviewable; final module writes remain blocked.
- Audit integration uses `auditRef`, `proofRef`, and `rollbackRef` until persisted operating audit storage is approved.
- Agent protocol posture remains protected/internal only: `externalRegisterable=false`.

## SQL Draft Rules

The SQL draft is create-only:

- creates enum types;
- creates Source Workflow tables;
- creates owner/status/reference indexes;
- creates foreign keys;
- enables RLS on every new table as a fail-closed Supabase-facing stance;
- does not create RLS policies yet;
- does not drop, alter, insert, update, delete, seed, or call provider/runtime functions.

RLS policy design is deferred to `DATTR-024K-RLS-AUDIT-STORAGE`. Enabling RLS without policies is intentional for review because Supabase public-schema tables should fail closed until policies are reviewed.

## Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Put the draft directly in `prisma/migrations` | It would become a pending deployable migration before proof-target and human apply approval. |
| Run `migrate dev --create-only` against current env | The env/proof target is not approved for Source Workflow schema work, and `migrate dev` is a development command with database/shadow database behavior. |
| Add persisted `OperatingAuditEvent` now | Persisted audit storage is a separate gate with retention, redaction, export, purge, and integrity questions. |
| Add connector runtime fields or provider payload storage | Connector runtime, raw provider data, OAuth/webhook/polling, OCR/transcription, and secret storage remain blocked by `DATTR-024E`. |
| Add RLS policies in the first draft | Policy tests depend on auth/Profile proof and disposable proof target setup. |

## Apply Gate

Before copying the draft into `prisma/migrations` or applying to any database:

1. Human review approves `MIG-003` and the draft SQL.
2. `DATTR-024I-PROOF-RUNNER` exists, defaults to dry-run, and passes `pnpm ai-input:proof-runner:check`.
3. A safe local/disposable target passes `ACC-006`.
4. `pnpm db:validate`, `pnpm db:generate`, and `pnpm ai-input:migration-draft:check` pass.
5. RLS/audit storage follow-up scope is accepted or explicitly deferred for a disposable proof-only target.

## Sources

- Prisma Migrate development/production and create-only workflow: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- Prisma customizing migrations workflow: https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- PostgreSQL GIN indexes and JSONB operator classes: https://www.postgresql.org/docs/current/gin.html
