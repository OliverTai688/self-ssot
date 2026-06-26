# RPT-032 - Loop 129 Work Proof Evidence Gap Review

## Summary

Loop 129 was the required `RES-001` / `RES-002` research-to-task review after loop 128. The shortest useful task was not another proof refresh: `AUTH-005` and `WORK-009` still lacked owner/operator prerequisites. The selected gap was that Work proof evidence already existed across several generated packet families, but no server-only no-secret resolver turned them into one latest evidence contract for future admin/settings or launch-level review surfaces.

Result: `WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER` is implementation-ready and completed in the same loop.

## Strategic Review Gate

- Current formal launch level: `L0_LOCAL_PROTOTYPE`.
- Current Manual Ops level: `M1_MANUAL_OPS_READY`.
- Current conditional product maturity: `C3_ARCHITECTURE_GATE_READY`.
- Last three completed loops:
  - Loop 126 researched the Source Workflow Manual Ops convergence gap and routed `DATTR-024Q`.
  - Loop 127 implemented the owner-operable Source Workflow proof target handoff.
  - Loop 128 refreshed `WORK-009` fallback proof evidence and confirmed the real Work proof run remains owner-input blocked.
- Current blocker preventing formal upgrade: missing Supabase public env plus signed-in `/auth/status` proof for `AUTH-005`; missing explicit local/disposable Work proof target plus write confirmations for `WORK-009`; missing private deployment marker for `DEPLOY-002`.
- What changed in this loop: latest Work proof evidence is now resolvable through a server-only no-secret contract and checker, so future reviews can read the evidence state without reimplementing packet scanning.

## Research Lenses

### Lens 1 - Local Product And Acceptance Fit

Local files reviewed:

- `AGENTS.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`

Finding: Work is the only operational DB-backed module, but formal proof remains blocked by owner/operator setup. The useful non-owner-input improvement is to improve evidence readability, not to claim persistence success.

### Lens 2 - Existing Code Pattern

Local files reviewed:

- `src/lib/services/ai-input-source-workflow-proof-evidence.service.ts`
- `scripts/check-ai-input-source-workflow-proof-evidence.mjs`
- `scripts/check-work-proof-target-readiness.mjs`
- `scripts/work-proof-local-disposable.mjs`
- `scripts/work-proof-docker-disposable.mjs`
- `scripts/work-refresh-proof.mjs`
- `scripts/check-work-db-source-smoke.mjs`

Finding: AI Input already had a latest-proof-evidence resolver pattern. Work had proof generators and readiness checkers, but no equivalent latest evidence resolver. Reusing the same class of server-only no-secret resolver is lower risk than adding new runtime proof behavior.

### Lens 3 - BFF/API/Safety Boundary

Selected boundary:

- Read generated evidence only from `docs/2_agent-input/generated/agent-loop/reports` and `docs/2_agent-input/generated/agent-loop/work-refresh-proof`.
- Match only explicit Work proof filename patterns.
- Return normalized status, relative paths, freshness, readiness flags, and next owner action.
- Do not return raw packet bodies.
- Do not execute commands, connect to databases, write rows, run migrations, expose URLs/hosts/secrets/IDs, expand public output, or claim a launch level.

Rejected alternatives:

- Repeat loop 128 proof refresh: rejected because the blocker state has not changed.
- Run `WORK-009`: rejected because no approved local/disposable proof target or write confirmations exist.
- Treat source/static proof as persistence proof: rejected because `WORK-013` is not DB runtime proof.
- Extend public output or a public API for evidence: rejected because proof packets are owner/admin evidence only.
- Upgrade formal launch level conditionally: rejected because `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence still do not exist.

## Executable Task Shape

Task id: `WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER`

Scope:

- Add a Work proof evidence contract.
- Add a server-only resolver for latest Work proof packets.
- Add a static/no-secret checker and package script.
- Update acceptance, backlog, sprint, completed log, tasks, loop state, and evidence report.

Files likely affected:

- `src/lib/contracts/work-proof-evidence.contract.ts`
- `src/lib/services/work-proof-evidence.service.ts`
- `scripts/check-work-proof-evidence.mjs`
- `package.json`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `tasks.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

Acceptance:

- `pnpm work:proof-evidence:check` reports `ready_for_work_proof_evidence_resolver`.
- The resolver covers target-readiness, Docker disposable, local disposable, Work proof run, and source/static smoke packet families.
- Safety flags preserve server-only no-secret behavior.
- `WORK-009`, `WORK-007`, `AUTH-005`, `DEPLOY-002`, L1, L3, and L4 remain unclaimed.

Verification:

- `node --check scripts/check-work-proof-evidence.mjs`
- `pnpm work:proof-evidence:check -- --json`
- `pnpm launch:proof`
- `pnpm auth:proof`
- `pnpm work:proof-target:check`
- `pnpm launch:manual-ops`
- `pnpm db:validate`
- `pnpm exec tsc --noEmit --pretty false`
- JSON parse
- `git diff --check`

## Next Decision

Loop 130 should run the required fifth-loop launch-level review. If Supabase public env and signed-in `/auth/status` evidence appears, `AUTH-005` preempts. If an approved local/disposable Work proof DB target plus write confirmations appears, `WORK-009` preempts. Otherwise, loop 130 should use the new latest Work proof evidence resolver as part of the no-upgrade review.
