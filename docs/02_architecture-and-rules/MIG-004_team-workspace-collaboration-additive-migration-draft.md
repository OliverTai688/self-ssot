# MIG-004 Team Workspace Collaboration Additive Migration Draft

**Task:** `TEAMCOLLAB-004`  
**Date:** 2026-07-27  
**Status:** Schema and disposable proof complete; live apply not authorized  
**Related:** `RES-026`, `SCH-006`, `AUT-008`, `PLN-066`

## Decision

Keep the reviewed TEAMCOLLAB SQL under:

`prisma/migration-drafts/20260727_teamcollab_004_workspace_collaboration_additive/migration.sql`

It intentionally remains outside `prisma/migrations`. `prisma migrate deploy` therefore cannot discover it. No Supabase, staging, production, pre-existing local database, provider, or public route is part of this task.

## Schema Delta

- Adds workspace, membership, collaboration invitation, project grant, attributed feedback/version, and AI memory-candidate models.
- Adds nullable `Profile.authUserId` and nullable `Project.workspaceId` for staged identity/authorization cutover.
- Keeps `Project.ownerId`, Client Portal `visibility`, and `clientToken` unchanged.
- Persists direct-grant `ACTIVE`/`INACTIVE` status so the `TEAMCOLLAB-003` resolver does not infer grant state from client input.
- Makes every memory candidate reference a real `(feedbackId, version)` pair.
- Keeps `Project.workspaceId` nullable in the Prisma schema until an approved valuable-database migration and backfill have separately passed.

## Backfill

The review draft:

1. creates one active `PERSONAL` workspace for each legacy Profile;
2. creates or repairs that Profile's active `OWNER` membership;
3. assigns every null-workspace Project to its legacy owner's personal workspace;
4. adds a partial unique index preventing more than one active personal workspace created by the same Profile;
5. leaves project IDs, owners, Client Portal visibility, and client tokens unchanged.

The seed upserts the demo personal workspace by its unique slug rather than only by a preferred deterministic ID. This lets the same seed work after either a migration-created backfill workspace or a fresh deterministic seed.

## Constraint Boundary

Database constraints cover foreign keys, unique membership, unique project grant, invitation project/role pairing, positive feedback versions, exact feedback-version lineage, and one active personal workspace per creator.

PostgreSQL documents that `CHECK` constraints cannot safely guarantee conditions that depend on other table rows. Therefore these invariants remain mandatory service/transaction checks plus disposable tests rather than misleading cross-row `CHECK` claims:

- a team retains at least one active owner;
- a project grant's membership belongs to the same workspace as the project;
- an invitation's optional project belongs to the invitation workspace;
- feedback and memory records use the same workspace/project boundary;
- the feedback author had `COMMENTER` or stronger capability at write time.

RLS is not enabled or claimed here. JWT-aware RLS and privileged/direct Prisma behavior remain `TEAMCOLLAB-010` work.

## Disposable Proof

`scripts/team-workspace-disposable-proof.ts` is dry-run-first and accepts no database URL. The run path requires three explicit environment gates, creates a new loopback-only PostgreSQL 16 cluster under an owned `mkdtemp` directory, overrides both Prisma database environment variables only for child commands, fingerprints the database name/port/data directory, and cleans up in `finally`.

Passing proof on 2026-07-27:

- existing deployable migrations applied to the new disposable database;
- review draft applied once in a single transaction;
- legacy two-profile/two-project backfill produced zero orphan projects;
- each Profile had exactly one active personal-owner membership;
- each active personal workspace had exactly one active owner;
- legacy project/owner/visibility/client-token snapshot stayed unchanged;
- seed pass one and pass two had stable counts;
- persisted two-workspace context plus the pure service contract denied cross-workspace reads and writes;
- a viewer-denied write performed no mutation;
- cluster stopped and the owned temporary directory was removed.

This is a persisted-context plus app-layer contract proof. It is not an RLS or privileged Prisma isolation proof.

## Selected And Rejected Patterns

| Pattern | Decision |
|---|---|
| Nondeployable task-only SQL draft | Selected; avoids accidental `migrate deploy` pickup. |
| Self-created native PostgreSQL cluster | Selected; Docker daemon is unavailable and no existing DB is trusted. |
| Targeted manual SQL review | Selected; current schema contains unrelated pending timeline models that a whole-schema diff would mix into this task. |
| Put SQL directly in `prisma/migrations` | Rejected until a separate live/valuable apply approval. |
| `prisma migrate dev` against configured env | Rejected; the repo has already experienced unrelated pending-schema changes being included in a live migration. |
| Cross-row `CHECK` constraints | Rejected as false safety; use service transactions and tests. |
| Enable RLS without JWT-aware proof | Rejected; no RLS claim in this slice. |

## Verification

```bash
pnpm teamcollab:migration-draft:check
pnpm teamcollab:proof:local -- --dry-run
TEAMCOLLAB_PROOF_ALLOW_LOCAL_WRITES=1 \
TEAMCOLLAB_PROOF_ALLOW_MIGRATION_APPLY=1 \
TEAMCOLLAB_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_ONLY_TO_A_NEW_LOCAL_DISPOSABLE_DATABASE \
pnpm teamcollab:proof:local -- --run
pnpm db:validate
pnpm db:generate
pnpm teamcollab:capability:check
pnpm exec tsc --noEmit --pretty false
pnpm build
```

## Apply Gate

Before copying this SQL into `prisma/migrations` or applying it to a valuable database:

1. obtain new explicit owner approval naming the target;
2. inventory current target migration/schema drift and unrelated pending schema work;
3. review the exact generated SQL against the target state;
4. capture pre-apply row counts and Client Portal token/visibility snapshot;
5. prepare forward-fix and rollback commands;
6. apply through an approved migration workflow;
7. rerun backfill, two-workspace, app authorization, and Client Portal non-regression proof;
8. do not enable team runtime until `TEAMCOLLAB-005+` service/UI gates pass.

## Sources

- PostgreSQL constraint rules: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html
- Prisma development and production migration workflow: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- Prisma customizing migrations: https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations
