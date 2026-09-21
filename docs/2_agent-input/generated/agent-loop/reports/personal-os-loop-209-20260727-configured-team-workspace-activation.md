# Personal OS Loop 209 — Configured Team Workspace Activation

## Task

- Task ID: `TEAMCOLLAB-005B2`
- Title: Formally activate owner team-workspace creation after configured `db push` and Prisma generation
- Date: 2026-07-27
- Agent: Codex root

## Source Docs Read

- `AGENTS.md`
- Required manual, product, acceptance, strategy, loop-state, sprint, backlog, and recent loop evidence files
- `RES-026`, `SCH-006`, `AUT-008`, `PLN-066`, `MIG-005`, `MIG-006`, and `DBS-006`
- Existing migration, repair, create-team service/action/UI, proof runners, and configured-target preflight artifacts

## Scope

- In scope: read-only configured-target diagnosis; recoverability packet; rollback rehearsal; approved PERSONAL/member/Project repair; db-push-omitted constraints/index/trigger restoration; exact Prisma migration-history reconciliation; postchecks and task memory.
- Out of scope: automatic TEAM creation, invitation/email provider, project transfer, grants, feedback, AI memory/training, RLS, public output, external agent access, and formal launch upgrade.

## Strategic Review

- Current launch level / target: formal `L0_LOCAL_PROTOTYPE`; Manual Ops `M1_MANUAL_OPS_READY`; conditional product maturity `C3_ARCHITECTURE_GATE_READY`; next formal target remains L1.
- Last three completed reports reviewed: loop 207 audit-backed create-team runtime, loop 208 AI Input connection wizard, and loop 206 launch review.
- Last-three-loop delta: create-team code and disposable proof existed, but the configured target still lacked data repair, custom PostgreSQL invariants, and honest Prisma history.
- Repetition check: this is the approved valuable-target activation and static/runtime proof slice, not another proposal-only loop.
- Current strongest blocker: owner-run `db push` materialized Prisma objects without backfill, partial index, custom CHECKs, append-only trigger, or migration ledger.
- Acceptance / roadmap / research / blocker mapping: Phase 19, `PLN-066`, `ACC-002` 005B2, and the owner's explicit request to make the configured system formally usable.
- Expected delta: make the configured database safely ready for real owner create-team use while preserving a fail-closed interaction proof boundary.

## Research / Reference Basis

- Local basis: approved workspace role matrix, additive schema, migration reconciliation contract, audit envelope contract, create-team readiness predicates, and exact disposable proofs.
- External/reference basis: no new external behavior was needed; the target-specific work followed the already researched local PostgreSQL/Prisma contract.
- Page requirement score: not applicable; no page behavior was changed in this activation.
- Cadence gap review: the third post-review loop rechecked configured data, BFF readiness, permission/audit boundaries, and acceptance proof. It found one infrastructure-to-runtime gap—`db push` omitted non-Prisma SQL and data repair—and converted it into `MIG-007`, executable hardening/postcheck SQL, and a 12-case static checker.
- Selected pattern: read-only preflight → focused recovery packet → exact transaction ending `ROLLBACK` → same advisory-locked transaction ending `COMMIT` → physical postcheck → individual `migrate resolve --applied` → status/diff proof.
- Rejected alternatives: blind `db push`, reset, unreviewed deploy, marking history before physical proof, creating a TEAM before PERSONAL repair, broad data rewriting, and automatic owner-facing test data.

## NANDA / Agent Protocol Alignment

- Applies?: boundary reviewed because future feedback may feed WorkAgent; no agent capability changed.
- Affected agents/capabilities: WorkAgent context boundary only.
- AgentFacts-lite fields changed: none.
- Internal discovery / registry: unchanged; protected/internal only.
- External registration: `externalRegisterable: false`.
- Trust/auth/approval/data visibility: external agents receive no database access; invitation/provider, feedback, memory, public output, and external registration remain disabled.
- Concrete artifact: `MIG-007` activation/recovery contract and exact audit-integrity proof; no manifest change required.

## Changes

- Added configured db-push hardening and read-only postcheck SQL.
- Added `pnpm teamcollab:configured-activation:check` with 12 exact static gates.
- Created 3 deterministic active PERSONAL workspaces, 3 matching ACTIVE OWNER memberships, and filled 10 previously null Project workspace IDs.
- Restored four collaboration CHECKs, three audit CHECKs, the active-PERSONAL partial unique index, and the append-only audit trigger/function.
- Reconciled migrations `20260727150000_team_workspace_collaboration` and `20260727170000_team_workspace_creation_audit` only after physical proof passed.
- Added `MIG-007` and updated product, acceptance, plan, sprint, backlog, completed log, task, index, and loop memory.

## Verification

| Command or proof | Result | Notes |
|---|---|---|
| Configured read-only preflight | PASS | Proved exact db-push drift shape before writes. |
| Combined repair/hardening transaction with final `ROLLBACK` | PASS | Same target, no persisted rehearsal changes. |
| Combined advisory-locked activation transaction | PASS | Hard postconditions passed and commit succeeded. |
| Configured read-only postcheck | PASS | 3 PERSONAL, 3 OWNER memberships, 0 null Projects, 0 adjacent collaboration/audit rows. |
| `pnpm exec prisma migrate status` | PASS | All four migrations current after individual resolves. |
| `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | PASS | No difference detected. |
| `pnpm teamcollab:configured-activation:check` | PASS | 12/12 activation/hardening checks. |
| Eligibility aggregate | PASS | 2 platform OWNER Profiles satisfy create-team prerequisites. |
| Local `/work` browser boundary | PASS | Protected 307 to `/login?next=%2Fwork`; OTP/Magic Link page loaded with zero console warnings/errors. Codex browser had no owner session and performed no write. |
| `node --check scripts/check-team-workspace-configured-activation.mjs` | PASS | Checker syntax valid. |
| Targeted `git diff --check` | PASS | TEAMCOLLAB activation files are whitespace-clean. Whole-worktree check later found trailing whitespace only in a concurrently edited AI Input document outside this task. |
| `pnpm build` | DEFERRED | The 005B1 runtime already passed a full production build. This activation changed SQL/checker/docs only; a new build attempt was correctly refused because another Next build was already running, and that parallel process was not interrupted. |

## Evidence

- The PostgreSQL 17 target could not be fully dumped by the local PostgreSQL 16 `pg_dump`; Docker was unavailable. A permission-restricted focused recovery packet captured every field changed because workspace, membership, and audit pre-counts were zero.
- Data after activation: 3 Profiles, 3 active PERSONAL workspaces, 3 ACTIVE OWNER memberships, 10 scoped Projects, 0 TEAM/invitation/grant/feedback/version/memory/audit rows.
- Integrity after activation: seven validated custom CHECKs, exact partial/audit unique indexes, exact enabled append-only trigger/function, and both collaboration migration ledger rows.
- Product delta: the configured `/work` loader can now return create-team readiness for either OWNER.
- Proof delta: configured schema/data/history is proven; only the owner-session interaction remains.
- Blocker delta: database activation is closed; signed-in create/select/audit browser evidence is review-required, not an activation blocker.
- Launch delta: none; L0/M1/C3 remains unchanged.

## Remaining Risks

- The focused recovery packet is not a full provider-level backup; later migrations with non-empty collaboration data should require a PostgreSQL 17-compatible or provider backup.
- The first signed-in owner must refresh `/work`, create/select a deliberately named team, and confirm one redacted `workspace.created` row.
- Re-running `db push` can omit or drift custom PostgreSQL invariants; use reviewed migrations and the configured activation checker.
- Invitation/provider delivery, transfer, grants, feedback, AI memory, RLS, public output, and external agents remain separate approval-gated tasks.

## Final Status

- Status: configured activation `PASS`; `TEAMCOLLAB-005B2` is `REVIEW_REQUIRED` only for signed-in create/select/audit interaction proof.
- Recommended next task: collect that owner-session proof if available; otherwise begin the no-provider invitation persistence/BFF contract slice for `TEAMCOLLAB-006` with deny-by-default tests.
