# RPT-024 Loop 109 DATTR-024 Persistence Sequence Gap Review

## Summary

Loop 109 is the required `RES-001` / `RES-002` research-to-task gap review after `DATTR-024F-CONTRACT`. The primary question was whether full AI Input Source Workflow persistence should next move through migration/proof-runner implementation, service authorization runtime, or RLS/audit storage proof.

Decision: sequence the remaining full `DATTR-024` blockers before writing runtime code. The selected next executable task is `DATTR-024H-MIGRATION-DRAFT`: a create-only Prisma schema and migration draft for Source Workflow persistence, with migration apply, DB writes, connector runtime, public output, and external registration still blocked.

## Strategic Review Gate

- Current primary target: shortest path from protected prototype plus conditional C3 maturity toward real DB-backed owner operation, without claiming formal L1/L3/L4 before owner/operator evidence.
- Last three loops: loop 106 completed conditional scenario routes, loop 107 completed conditional architecture claim gates, and loop 108 completed Source Workflow service authorization boundaries.
- Blocking milestone: full `DATTR-024` remains blocked by no create-only migration draft, no proof-runner, no RLS/audit storage proof, no safe proof target evidence, and no connector runtime approval.
- Repeat risk: another display/readiness surface would be low leverage. A sequence gate is justified only because it selects a concrete next implementation task and blocks unsafe runtime shortcuts.
- Product delta: AI Input persistence now has an ordered, machine-checkable path from schema draft to proof runner to service runtime to RLS/audit to formal cutover.

## Research Lenses

### Lens 1: Local Contract Fit

Local state already covers `DATTR-024A` read DTO, `DATTR-024B` schema review, `DATTR-024C` proof-target boundary, `DATTR-024D` proposal actions, `DATTR-024E` connector boundary, and `DATTR-024F` service authorization. The remaining gap is not another isolated boundary; it is ordering. Service runtime before schema names would create fake certainty, and proof-runner work before migration artifacts would only verify refusal states.

Selected pattern: add `DATTR-024G-CONTRACT` as a sequencing contract and checker.

Rejected alternatives: start full `DATTR-024`, implement service loaders first, or build connector runtime before storage proof.

### Lens 2: Official Persistence Practice

Prisma separates development migration creation from production deployment workflows, so the next safe slice is a create-only migration draft rather than a migration apply. Supabase local development and RLS guidance support proving policies and writes against local/disposable environments before treating production data as safe. Supabase Vault and PostgreSQL row security references keep provider secrets and owner-scoped row access outside raw Source Workflow rows.

Selected pattern: `DATTR-024H-MIGRATION-DRAFT` can inspect `schema.prisma`, add reviewable model/migration artifacts, and stop before apply.

Rejected alternatives: use production Supabase as the first proof target, skip RLS because app-level service auth exists, or store connector secrets in source tables.

### Lens 3: Acceptance And Verification Split

The fastest credible path is not the largest runtime jump. It is:

1. `DATTR-024H-MIGRATION-DRAFT`: create-only schema/migration draft.
2. `DATTR-024I-PROOF-RUNNER`: dry-run-first disposable/local proof runner.
3. `DATTR-024J-SERVICE-AUTHZ-RUNTIME`: protected service loader/action runtime using `DATTR-024F` operation ids.
4. `DATTR-024K-RLS-AUDIT-STORAGE`: RLS and persisted audit storage proof.
5. `DATTR-024L-CONNECTOR-RUNTIME`: connector runtime approval package.
6. Full `DATTR-024`: formal-mode DB cutover.

Selected pattern: add a checker so future loops can fail fast if docs, acceptance, source refs, or no-runtime guards drift.

Rejected alternatives: mark delegated owner evidence as launch proof, claim conditional C3 as formal L3, or skip the owner/human approval boundary for high-risk and public-output paths.

## NANDA Gate

- Affected capability: protected/internal AI Input Source Workflow agent-adjacent persistence and proposal flow.
- AgentFacts-lite posture: protected-owner visible and internal runtime only.
- Endpoint status: no new endpoint in this loop.
- Protocol status: no external protocol registration.
- Auth and trust: future runtime must call `requireUser()`, scope by `ownerProfileId`, return UI-safe DTOs, and keep external agents away from direct database access.
- Registry status: `externalRegisterable=false`.

## Executable Task Output

### Completed This Loop

- `DATTR-024G-CONTRACT`: AI Input Source Workflow persistence sequence gate.
- Files:
  - `src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts`
  - `scripts/check-ai-input-source-workflow-persistence-sequence.mjs`
  - `package.json` script `pnpm ai-input:persistence-sequence:check`

### Next Task

`DATTR-024H-MIGRATION-DRAFT`

Scope: inspect existing Prisma schema and Source Workflow schema review packet; draft create-only Source Workflow models and migration artifacts for `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`, and audit refs. Do not apply migrations or connect to a valuable DB.

Acceptance:

- Model ownership, status, retention, redaction, audit, proposal lifecycle, and module write intent fields are reviewable.
- Migration artifacts are create-only or otherwise explicitly marked not applied.
- No connector runtime, provider data, public output, module final write, or external registration is added.
- Verification includes `pnpm db:validate`, `pnpm db:generate`, `pnpm exec tsc --noEmit --pretty false`, `pnpm ai-input:persistence-sequence:check`, and `git diff --check`.

Stop conditions:

- Existing schema makes ownership/authz ambiguous.
- Migration generation requires applying to a valuable DB.
- Model naming conflicts with existing production tables.
- Human approval is needed for migration apply, provider runtime, public output, or high-risk final writes.

## Sources

- Local: `ARC-031`, `SCH-003`, `ACC-006`, `DBS-006`, `ARC-028`, `RES-001`, `RES-002`.
- Prisma Migrate development and production workflows: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- Prisma transactions: https://www.prisma.io/docs/orm/prisma-client/queries/transactions
- Supabase local development: https://supabase.com/docs/guides/local-development
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Vault: https://supabase.com/docs/guides/database/vault
- PostgreSQL row security: https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## Launch Decision

Formal launch remains `L0_LOCAL_PROTOTYPE`. Manual Ops remains `M1_MANUAL_OPS_READY`. Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`. This loop does not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, L4, or `C-L3_CONDITIONAL_FULL_EXPERIENCE`.

## Verification

Loop verification passed:

- `node --check scripts/check-ai-input-source-workflow-persistence-sequence.mjs`
- `pnpm ai-input:persistence-sequence:check`
- `pnpm ai-input:service-authz:check`
- `pnpm ai-input:proof-target:check`
- `pnpm ai-input:schema-review:check`
- `pnpm audit:storage-review:check`
- JSON parse for generated loop 109 proof packets
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm db:validate`
- `git diff --check`
