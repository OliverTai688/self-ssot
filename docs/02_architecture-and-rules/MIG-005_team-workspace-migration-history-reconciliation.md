# MIG-005 Team Workspace Migration History Reconciliation

**Task:** `TEAMCOLLAB-005A`  
**Date:** 2026-07-27  
**Status:** Canonical/repair implementation and dual disposable proof complete; configured repair and ledger reconciliation applied on 2026-07-27 through `MIG-007`  
**Related:** `RES-026`, `SCH-006`, `AUT-008`, `PLN-066`, `MIG-004`

## 1. Why This Reconciliation Is Required

A read-only inspection of the configured database found a split state:

- `workspaces` and `workspace_memberships` exist;
- Prisma migration history contains only the baseline and file/media migrations;
- the configured Profile has zero active workspace memberships and zero active PERSONAL/OWNER memberships;
- the database contains zero workspaces and zero memberships;
- all 10 existing projects still have `workspace_id IS NULL`;
- the partial unique index `workspaces_active_personal_creator_unique` is absent.

This is consistent with out-of-band schema creation such as `prisma db push` or a partial/manual apply. The exact historical command is not claimed. `prisma migrate deploy` cannot discover `MIG-004` because that reviewed SQL intentionally remained under `prisma/migration-drafts/`.

The protected Work loader enters `legacy_personal_compatibility` when membership count is zero. Creating only a TEAM membership would make membership count nonzero, disable that fallback, and hide all unscoped legacy projects from the Work index. Therefore TEAM workspace creation must not ship before personal-workspace backfill and migration-history reconciliation are proven.

## 2. Selected Pattern

`TEAMCOLLAB-005A` separates three concerns:

1. a canonical deployable migration for clean migration-history targets;
2. a review-only preflight and repair packet for the known drift shape;
3. a self-created loopback-only disposable proof that exercises both paths without accepting a database URL.

The drift repair is intentionally not a normal Prisma migration. A target that already contains the collaboration objects would fail if the canonical `CREATE TYPE` / `CREATE TABLE` statements were replayed. The repair must first prove the expected shape, then only restore the missing personal workspace/membership/project scope and partial unique index. Migration-ledger resolution is a distinct, human-reviewed operator step after schema and data invariants pass.

## 3. Canonical Clean-History Path

Canonical migration:

`prisma/migrations/20260727150000_team_workspace_collaboration/migration.sql`

It preserves the reviewed `TEAMCOLLAB-004` additive contract:

- workspace, membership, invitation, grant, feedback, version, and memory-candidate schema;
- nullable staged Profile/Project identity fields;
- one PERSONAL workspace and ACTIVE OWNER membership per existing Profile;
- null-workspace Project backfill to the legacy owner's PERSONAL workspace;
- partial uniqueness for one active PERSONAL workspace per creator;
- unchanged project ID, owner, Client Portal visibility, and client token.

It must be used only on a target whose Prisma history and physical schema have not already received the collaboration DDL out of band.

## 4. Known-Drift Repair Path

Review packet:

- `prisma/migration-drafts/20260727_teamcollab_005a_configured_drift_repair/preflight.sql`
- `prisma/migration-drafts/20260727_teamcollab_005a_configured_drift_repair/repair.sql`

The preflight is read-only. It must confirm the exact expected table/column/type/constraint/index shape and produce sanitized counts before any repair is considered.

The repair is transactional and narrowly limited to:

- create a missing active PERSONAL workspace for each Profile;
- create or repair that Profile's ACTIVE OWNER membership;
- assign only `workspace_id IS NULL` projects to their existing `owner_id` Profile's PERSONAL workspace;
- add the missing active-personal partial unique index after duplicate-safe backfill;
- fail the transaction if postconditions are not met.

It must not create TEAM workspaces, invitations, project grants, feedback, feedback versions, memory candidates, provider users, public output, RLS policies, or migration-ledger rows. It must not change project IDs, owner IDs, Client Portal visibility, or client tokens.

## 5. Disposable Proof Requirements

The proof must cover both paths:

### A. Clean History

- create a new loopback-only PostgreSQL cluster under an owned temporary directory;
- apply deployable migrations and confirm the canonical migration is discoverable;
- prove the reviewed legacy-profile/project backfill;
- assert Prisma migration status is current on the disposable target.

### B. Known Drift Shape

- create a separate disposable database matching the observed collaboration drift;
- assert zero workspaces/memberships, null project workspace scope, and missing partial index before repair;
- apply only the review repair;
- assert exactly one active PERSONAL/OWNER membership per Profile, zero orphan projects, and the partial index;
- prove project ID/owner/visibility/client-token snapshots are unchanged;
- prove zero TEAM/invitation/grant/feedback/memory rows;
- stop the cluster and remove only the owned temporary directory.

The proof runner must accept no database URL and require explicit local-write, migration-apply, and confirmation gates.

## 6. Configured-Target Apply Gate

No configured, Supabase, staging, production, or otherwise valuable target is changed by this task. Before a later owner-run repair:

1. capture a restorable backup and maintenance window;
2. rerun the read-only preflight and compare its shape/counts with this packet;
3. stop on any extra/missing collaboration object, duplicate personal workspace, row-count mismatch, unrelated drift, or changed migration checksum;
4. review the exact repair SQL and forward-fix plan;
5. obtain explicit approval naming the target;
6. apply the repair in one transaction;
7. rerun postconditions and Work/Client Portal non-regression checks;
8. only after exact reconciliation, review `prisma migrate resolve --applied 20260727150000_team_workspace_collaboration` as a separate ledger action;
9. rerun `prisma migrate status` and the protected `/work` browser proof.

Do not use `prisma migrate reset`, `prisma db push`, or a blind `prisma migrate deploy` to repair the known configured target.

## 7. Rollback And Forward Fix

Before ledger resolution, a failed repair transaction rolls back automatically. After a successful backfill, do not delete collaboration rows or set projects back to null as a routine rollback. Disable TEAM writes and forward-fix inconsistent personal membership/project scope while preserving ownership, project IDs, Client Portal fields, and attribution.

## 8. Rejected Alternatives

- Ship create-team first: rejected because it would disable legacy fallback and hide 10 unscoped projects.
- Run `db push` again: rejected because it does not reconcile migration history or create the custom partial-index/backfill guarantees.
- Blindly copy the canonical migration into history and run deploy: rejected because the configured target already has collaboration objects.
- Mark the migration applied without physical/data reconciliation: rejected because the target is missing personal workspace/membership/backfill invariants.
- Destructive reset/reseed: rejected because this is a valuable database and would lose user data.

## 9. Sources

- Prisma development and production migrations: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- Prisma migration histories: https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories
- Prisma `db push`: https://docs.prisma.io/docs/cli/db/push
- Prisma `migrate status`: https://www.prisma.io/docs/cli/migrate/status
- Prisma customizing migrations: https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations

## 10. NANDA Boundary

This migration reconciliation changes no AI agent capability, endpoint, provider, trust scope, registry state, or external collaboration path. WorkAgent remains internal/protected and `externalRegisterable: false`.

## 11. Completed Verification

- `pnpm teamcollab:migration-reconcile:check`: 21/21 PASS.
- `pnpm teamcollab:migration-reconcile:proof --dry-run`: ready; PostgreSQL and pnpm tools present; no URL accepted.
- Explicit three-gate disposable run: PASS for clean canonical deploy and known-drift repair paths.
- Clean path migration ledger contains baseline, file/media, and `20260727150000_team_workspace_collaboration`, all finished and not rolled back.
- Drift path ledger remains baseline plus file/media; `migrate resolve` was not executed.
- Both paths: 2 Profiles, 2 active PERSONAL workspaces, 2 active creator OWNER memberships, 0 orphan Projects, exact unique partial index, unchanged Project ID/owner/visibility/clientToken snapshot, and 0 TEAM/invitation/grant/feedback/version/memory rows.
- Cleanup: PostgreSQL stopped and owned temporary root removed.
- Prisma validate/generate, TypeScript, production build, SQL/static checks, and diff checks pass.
