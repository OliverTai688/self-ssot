# Loop 142 Evidence Report — Research Formal Readiness BFF

## Task

- Task ID: `RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF`
- Title: Add Research formal readiness/read BFF contract and checker
- Date: 2026-06-24
- Agent: Codex
- Status: DONE

## Strategic Review

- Current launch level / target: formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`; target remains `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three reports reviewed: loop 141 Research real-data gap review, loop 140 launch-level review, and loop 139 Work Client pre-share checklist evidence.
- Last-three-loop delta: loop 139 improved a protected Work/Client Portal decision surface; loop 140 refreshed launch blockers; loop 141 researched Research formal readiness and created this executable task.
- Repetition check: this is an implementation/proof slice after one research loop, not another research-only or launch-status loop.
- Current strongest blocker: `AUTH-005`, `WORK-009`/`WORK-007`, and `DEPLOY-002` still need owner/operator evidence. `pnpm launch:preempt:check` still routes to the research fallback.
- Acceptance / roadmap / research / blocker mapping: maps to `RES-001`, `RES-002`, `DBS-003`, `DBS-005`, `SURFACE-MATURITY-003`, `REALDATA-001`, and `ACC-002`.
- Expected capability delta: Research now has a machine-checkable formal readiness/read BFF contract before any DB migration or runtime write expansion.

## Research / Reference Basis

- Local docs/code reviewed: `AGENTS.md`, `MAN-000`, `MAN-001`, `PRD-004`, `PRD-005`, `PRD-001`, `ACC-001`, `ACC-002`, `MAN-002`, `ARC-028`, `RES-001`, `RES-002`, `RES-005`, `PLN-063`, current sprint, backlog, `tasks.md`, loop state, and `RPT-040`.
- External/reference basis: loop 141 already completed the required three same-issue research rounds and cited resource-index/filter references. This loop implemented that task shape without expanding scope.
- Page requirement understanding score: 86/100 High, inherited from loop 141.
- Required research optimization rounds: 3.
- Completed rounds and lenses: local PRD/code/data fit, external resource-index/filter pattern, and BFF/auth/risk/verification boundary.
- Selected implementation pattern: contract-only Research formal readiness/read BFF artifact plus static checker and package script.
- Rejected alternatives: runtime DB reads/writes, migration/schema change, replacing `useResearch()` with current server actions, graph/link promotion, public output, and external Research agent collaboration.
- Task shape created or updated: `RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE` is now the next protected UI slice.

## NANDA / Agent Protocol Alignment

- Applies?: Lightly, because Research agent proposals are named as a future resource family.
- Affected agents or capabilities: Research agent proposals only; no runtime agent, endpoint, registry, adapter, external collaboration, or AI-to-AI execution was added.
- AgentFacts-lite fields changed: none at runtime.
- Internal discovery / registry state: unchanged; proposal-only readiness is documented in the contract.
- External registration state: `externalRegisterable: false`.
- Trust, auth, approval, and data-visibility boundaries: Research agent outputs remain protected owner-visible proposals only; final writes, public output, and external collaboration require human approval and future audit/authorization gates.
- Concrete protocol artifact created: `src/lib/contracts/research-formal-readiness.contract.ts` records a protected owner-visible proposal boundary and no-external-registration state.
- NANDA / AgentFacts / MCP / A2A sources reviewed: `ARC-028` local NANDA alignment doc; no new external protocol behavior was implemented.

## Changes

- Added `src/lib/contracts/research-formal-readiness.contract.ts`.
- Added `scripts/check-research-formal-readiness.mjs`.
- Added `pnpm research:readiness:check`.
- Updated `ACC-002` with `RESEARCH-OPS-002` protected surface acceptance.
- Updated `PLN-060`, `PLN-061`, `tasks.md`, `RPT-007`, and loop state.
- Wrote generated proof packets for loop 142.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-142-20260624-launch-preemption-router.json` | Passed | Still recommends research fallback because proof prerequisites are absent. |
| `node --check scripts/check-research-formal-readiness.mjs` | Passed | Checker syntax is valid. |
| `pnpm research:readiness:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-142-20260624-research-readiness-check.json` | Passed | Reports `ready_for_research_formal_readiness_bff_contract`. |
| `pnpm module:realdata:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-142-20260624-realdata-check.json` | Passed | Existing real-data matrix remains valid. |
| `pnpm module:index:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-142-20260624-module-index-check.json` | Passed | Existing resource-index contract remains valid. |
| `pnpm db:validate` | Passed | Prisma schema remains valid. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript contract compiles. |
| JSON parse for loop state and generated loop 142 proof packets | Passed | Parsed loop state, launch preemption, Research readiness, real-data, and resource-index packets. |
| `git diff --check` | Passed | No whitespace errors. |

## Evidence

- Product capability delta: Research now has a formal readiness/read contract that names 11 resource families, current state split, future BFF path, blocked writes, proposal-only agent boundary, and UI display expectations.
- Proof delta: `pnpm research:readiness:check` now validates the contract, docs/task memory, required resource families, false safety markers, and no forbidden runtime/env/provider/database/network markers.
- Blocker delta: no formal launch blocker is removed; `AUTH-005`, `WORK-009`/`WORK-007`, and `DEPLOY-002` remain owner/operator proof blockers.
- Agent protocol-readiness delta: Research agent proposals are explicitly protected-owner, proposal-only, and `externalRegisterable: false`.

## Remaining Risks

- `ResearchIssue` versus `ResearchThread` remains unresolved and must be reconciled before migration or runtime writes.
- Existing Research server actions are not formal until they derive owner identity from `requireUser()` and pass service-layer authorization.
- The contract is not yet visible in the product UI; `RESEARCH-OPS-002` should make it owner-operable.
- Formal launch level cannot upgrade without owner-provided auth/session, Work proof, and deployment evidence.

## Final Status

- Status: DONE
- Recommended next task: run `AUTH-005` if Supabase/session proof appears, `WORK-009` if a safe proof target plus write confirmations appear, otherwise implement `RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE`.
