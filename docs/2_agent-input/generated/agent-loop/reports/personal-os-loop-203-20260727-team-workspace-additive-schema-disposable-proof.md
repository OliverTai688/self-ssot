# Agent Loop Evidence Report

## Task

- Task ID: `TEAMCOLLAB-004`
- Title: Additive collaboration schema, nondeployable migration draft, and disposable proof
- Date: 2026-07-27
- Agent: Codex with continuing scoped subagents
- Status: Completed for schema/review-draft/disposable proof; no live migration or team runtime

## Source Docs Read

- `AGENTS.md`
- Required product, maturity, acceptance, strategy, sprint, backlog, and loop-state context retained from loops 200-202 and refreshed after concurrent loop 202 completion
- `docs/02_architecture-and-rules/DBS-001_database-contract.md`
- `docs/02_architecture-and-rules/MIG-001_database-migration-strategy.md`
- `docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md`
- `docs/02_architecture-and-rules/SCH-006_team-workspace-project-collaboration-schema-proposal.md`
- `docs/02_architecture-and-rules/AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/05_execution-plans/PLN-066_team-workspace-collaboration-implementation-plan.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-026_team-workspace-project-collaboration-and-ai-feedback-memory-research.md`
- Loop reports 200, 201, and concurrently completed 202
- Existing migration history, Prisma schema/config, seed, Work capability contract/checker, local proof-runner precedents, PostgreSQL 16 toolchain, and dirty-worktree inventory

## Scope

In scope:

- Directly edit the additive Prisma schema after explicit owner authorization.
- Create a reviewed, nondeployable team-only SQL/backfill draft.
- Update the seed for personal workspace/membership/project scope.
- Build a dry-run-first native disposable PostgreSQL proof runner that accepts no target URL.
- Prove backfill, seed idempotency, Client Portal field preservation, two-workspace app-layer denial, feedback-version lineage, and cleanup.
- Use subagents for schema implementation, environment/proof design, and schema/SQL consistency review.

Out of scope:

- Copying SQL into `prisma/migrations` or applying it to Supabase/valuable databases.
- Auth or permission runtime cutover.
- Workspace/team BFF reads, UI, invitations, project transfer, feedback writes, or AI retrieval/runtime.
- RLS, public output, provider delivery, external agent access, external registration, or launch upgrade.

## Strategic Review And Research Cadence

- Current formal launch level remains `L0_LOCAL_PROTOTYPE`; `AUTH-005`, Work proof, and deployment evidence remain formal launch blockers.
- Loop 200 settled the team product/auth/schema direction; loop 201 made capability rules executable; concurrent loop 202 fixed Formal File/Media Library real-data hydration. This task is the next persistence-proof dependency rather than repeat documentation.
- Acceptance mapping: `TEAMCOLLAB-004`, `SCH-006`, `AUT-008`, `PLN-066` Stage 2, and `ACC-002` TEAMCOLLAB-004.
- Product delta: a valid additive schema, task-only SQL, backfill, seed, and repeatable isolated database proof now exist.
- Due three-loop `RES-001`/`RES-002` gap review: frontstage/public and non-Work modules remain unchanged; member settings/admin/invitation/transfer surfaces remain downstream; backend/data/authz moved from proposal to disposable proof; the highest scenario/interface gap is now the read-only Work-scoped workspace selector and real project index in `TEAMCOLLAB-005`.
- Research artifact/task conversion: `MIG-004` records target isolation, constraint limits, selected/rejected patterns, proof, live-apply gate, and stop conditions; existing `TEAMCOLLAB-005` is now unblocked as a read-only BFF/UI implementation task.

## Subagent Contributions

| Subagent | Responsibility | Integrated result |
|---|---|---|
| `teamcollab_schema` | Additive Prisma implementation and final drift review | Seven models, 11 enums, named relations, direct-grant status, exact feedback-version relation; found and resolved FK-name and deletion-policy drift |
| `teamcollab_contract` | Native disposable target/environment design | Self-created PostgreSQL 16 cluster, no inherited target URL, fingerprint/write gates, seed×2/backfill/authz/client snapshot/cleanup proof shape |
| `teamcollab_migration_review` | Read-only migration/backfill risk review | Confirmed whole-schema diff would include unrelated dirty models; identified cross-workspace and personal-owner invariants requiring explicit service/transaction or SQL-only boundaries |
| Mainline | Integration and verification | Seed, targeted SQL, static checker, proof runner, lineage delete test, formal migration decision, docs/task/state updates |

## Research / Reference Basis

- Local risk: current migration history does not include all unrelated models already present in the dirty Prisma schema. A whole-schema `migrate diff` or `migrate dev` could therefore mix unrelated DDL into TEAMCOLLAB work.
- Selected: manually reviewed team-only SQL outside deployable history, then apply it only to a self-created disposable DB after existing migrations.
- PostgreSQL constraint lens: `CHECK` cannot safely enforce conditions depending on other rows; cross-workspace membership/project/feedback consistency remains a service-transaction and negative-test obligation. A partial unique index safely limits active personal workspace creation per Profile.
- Rejected: deployable pending migration, configured-env migration, Docker (daemon unavailable), inherited `DATABASE_URL`, RLS claims, cross-row `CHECK` theater, and automatic AI memory promotion.
- Primary sources: PostgreSQL constraint and partial-index documentation; Prisma development/production and migration customization workflow, linked from `MIG-004`.

## NANDA / Agent Protocol Alignment

- Applies because persisted collaborator feedback may later inform WorkAgent summaries/actions/memory candidates.
- Agent identity/provider/lifecycle/endpoints/protocols: unchanged.
- Capability posture: feedback memory remains internal, protected, project scoped, source-version-linked, proposal only, and human reviewed.
- Auth/trust/observability: future service authorization must preserve workspace/project/author/version/decision evidence; no external database access exists.
- Registry: `externalRegisterable: false`; registry check reports 15 internal manifests, zero runtime endpoints, and zero externally registerable manifests.
- Concrete artifact: exact feedback-version FK plus restricted lineage deletion and executable disposable proof.

## Schema And Migration Decisions

- `Profile.authUserId` and `Project.workspaceId` remain nullable during cutover; `Project.ownerId` remains the compatibility owner.
- Direct grant state is stored as `ACTIVE`/`INACTIVE`, matching the resolver contract.
- Memory candidate references `(feedbackId, feedbackVersion)` through a compound foreign key.
- Project deletion is restricted while an invitation or memory candidate preserves collaboration/AI lineage.
- SQL-only partial/check constraints are documented rather than falsely represented as Prisma-native features.
- Cross-row same-workspace rules remain mandatory service transaction checks for `TEAMCOLLAB-005+`.

## Disposable Proof

- Default dry-run performed version-only tool checks and allowed no DB connection/write.
- The run path required all three local-write confirmation gates, created an owned `mkdtemp` directory, initialized loopback-only PostgreSQL 16, and fingerprinted database name/port/real data directory.
- Existing deployable history applied first. The review draft then applied in one `psql --single-transaction` step.
- Legacy two-profile/two-project fixtures backfilled with zero orphans and exact personal-owner invariants.
- Seed pass one and two produced stable counts: 3 Profiles, 7 Projects, 17 Tasks, 12 Notes, 15 Deliverables, 3 Workspaces, and 3 Memberships before the final team fixture.
- Persisted workspace/member/project/grant rows fed the pure capability resolver: correct viewer read allowed; guessed project workspace and membership workspace denied; viewer write denied; denied write left row hash unchanged.
- Legacy Project ID/owner/visibility/client-token snapshot stayed unchanged.
- Feedback version plus memory candidate inserted successfully; attempted project delete failed with FK code `23503`; project remained.
- Cluster stopped and owned temporary directory was removed.

Corrective proof iterations were fail-closed and fully cleaned up: macOS `/var` realpath plus PostgreSQL CIDR-form loopback identity were normalized without weakening the target gate; multi-statement parameterized fixture setup was split into single prepared statements. The final run passed.

## Changes

- Updated `prisma/schema.prisma` and `prisma/seed.ts`.
- Added `prisma/migration-drafts/20260727_teamcollab_004_workspace_collaboration_additive/`.
- Added `scripts/check-team-workspace-migration-draft.mjs`.
- Added `scripts/team-workspace-disposable-proof.ts`.
- Added `pnpm teamcollab:migration-draft:check` and `pnpm teamcollab:proof:local`.
- Added `MIG-004` and updated `SCH-006`, `MAN-001`, `PLN-066`, backlog, sprint, acceptance, completed log, tasks, loop state, and this report.

## Verification

| Command / check | Result | Notes |
|---|---|---|
| `pnpm teamcollab:migration-draft:check` | PASS | 7 models, 11 enums, required SQL/backfill/lineage markers; no deployable draft/destructive/RLS/Client Portal/unrelated timeline SQL |
| `pnpm teamcollab:proof:local -- --dry-run` | PASS | PostgreSQL 16.12 tools ready; DB/write/apply disabled |
| gated `pnpm teamcollab:proof:local -- --run` | PASS | Fresh loopback DB, migration/backfill/seed×2/two-workspace/lineage/cleanup |
| `pnpm teamcollab:capability:check` | PASS | 20 built-in + 25 extended fixtures and all 13 AUT-008 rows |
| `pnpm db:validate` | PASS | Updated Prisma schema valid |
| `pnpm db:generate` | PASS | Prisma Client 7.8 generated |
| targeted ESLint | PASS | Seed, proof runner, and static checker |
| `pnpm exec tsc --noEmit --pretty false` | PASS | Whole repository |
| `pnpm build` | PASS | Next.js 16.2.4 production Webpack build and route generation |
| `pnpm agent:registry:check` | PASS | 15 manifests, 0 errors/warnings, 0 endpoints, 0 external-registerable |
| `git diff --check` | PASS | No tracked-diff whitespace errors |

## Evidence

- Product capability delta: durable team-collaboration storage shape and seed compatibility now exist in source.
- Proof delta: isolated real PostgreSQL migration/backfill/seed/authz/lineage evidence replaces proposal-only schema confidence.
- Blocker delta: `TEAMCOLLAB-005` can now implement real read-only Workspace/Project BFF and UI without inventing persistence or role semantics.
- Research delta: data/auth/constraint gap is converted into `MIG-004`, executable proof, and explicit service invariants.
- Agent protocol-readiness delta: AI memory source lineage is DB-enforced; external registration remains false.
- Launch delta: none; formal level remains L0.

## Remaining Risks

- The review draft is not deployable and valuable-target drift has not been inventoried; live migration requires a new explicit target-specific approval.
- Same-workspace grant, optional invitation target, feedback author capability, and feedback/memory workspace consistency are not all DB-enforced; service transactions and integration tests remain mandatory.
- App-layer persisted-context proof is not RLS or privileged Prisma isolation proof.
- Current Work runtime still uses legacy owner authorization; importing team rows before `TEAMCOLLAB-005+` service work would be unsafe.
- Email delivery, invitation acceptance, transfer writes, feedback UI, AI retrieval/memory review, deletion/offboarding, audit persistence, and RLS remain later tasks.

## Final Status

- `TEAMCOLLAB-004`: complete for additive schema, nondeployable migration draft, seed, and disposable proof.
- Live apply: not performed and not authorized.
- Next task: `TEAMCOLLAB-005` read-only Work-scoped workspace switcher plus real server-loaded `WorkspaceProjectIndexDto`/capability snapshots; keep invitation/transfer/write runtime disabled.
