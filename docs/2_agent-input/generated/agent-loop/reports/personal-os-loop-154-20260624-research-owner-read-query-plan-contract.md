# Loop 154 Evidence - RESEARCH-BFF-005 Research Owner Read Query Plan Contract

Date: 2026-06-24
Automation: `personal-os-20m-aggressive-launch-loop`
Selected task: `RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT`
Loop mode: post-30 convergence, normal implementation loop before required loop 155 launch review

## Strategic Review Gate

- Current product target: formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- Last three loops: loop 151 added the Research owner-read authz skeleton, loop 152 added mapper/empty-state response skeletons, and loop 153 completed the Research post-mapper gap review that created `RESEARCH-BFF-005`.
- Proof preemption: `pnpm launch:preempt:check` still reports `proofPreemptionReady=false` and routes to research fallback because `AUTH-005`, `WORK-009`, and `DEPLOY-002` still need owner/operator evidence.
- Highest blocker moved this loop: Research had DTO/authz/mapper boundaries but no machine-checkable query plan tying each owner-read family to model candidates, owner-scope predicates, selected fields, unavailable states, and rejected unsafe read patterns.
- What is more true now: the next Research owner-read implementation can consume a stable query-plan contract instead of inventing adapter rules inside runtime code.

## Implementation Delta

- Added `src/lib/contracts/research-owner-read-query-plan.contract.ts`.
- Added `scripts/check-research-owner-read-query-plan.mjs`.
- Added `pnpm research:read-query-plan:check`.
- Marked `RESEARCH-BFF-005` complete in backlog, sprint, tasks, completed log, and loop state.
- Added `RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON` as the next no-proof implementation fallback after loop 155 review.

The new contract maps all 11 Research owner-read DTO families:

- `issues`
- `sources`
- `concepts`
- `writing-projects`
- `writing-sections`
- `events`
- `people`
- `typed-links`
- `graph-projections`
- `readiness-evidence`
- `agent-proposals`

Each row records adapter kind, runtime state, model candidates, owner-scope predicate, relation path, selected-field boundary, stable sort, mapper input, unavailable state, audit ref, rejected unsafe patterns, and disabled runtime flags.

## NANDA Gate

Affected agent surface: `Research agent proposals`.

Decision:

- Surface remains protected-owner visible and proposal-only.
- `runtimeAgentChanged=false`.
- `externalRegisterable=false`.
- Research agents still cannot final-write, publish, collaborate externally, or access the database directly.
- Any external agent collaboration remains `HUMAN_APPROVAL_REQUIRED`.

## Verification

| Command | Result |
|---|---|
| `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-154-20260624-launch-preemption-router.json` | Pass; proof preemption not ready, routes to fallback |
| `node --check scripts/check-research-owner-read-query-plan.mjs` | Pass |
| `pnpm research:read-query-plan:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-154-20260624-research-read-query-plan-check.json` | Pass; `ready_for_owner_read_query_plan_contract_use` |
| `pnpm research:read-dto:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-154-20260624-research-read-dto-check.json` | Pass |
| `pnpm research:model:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-154-20260624-research-model-check.json` | Pass |
| `pnpm research:readiness:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-154-20260624-research-readiness-check.json` | Pass |
| `pnpm db:validate` | Pass |
| `pnpm exec tsc --noEmit --pretty false` | Pass |
| JSON parse for package, loop state, and generated loop 154 packets | Pass |
| `git diff --check` | Pass |

## Guardrails

No Prisma client import, runtime DB read/write, route handler, server action, schema/migration change, seed change, provider call, public output expansion, external collaboration, Research agent final write, external agent DB access, external registration, hidden mock-to-formal claim, or launch-level claim was added.

## Remaining Risk

- Formal launch still cannot upgrade without owner-run `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence.
- Research formal reads are still not runtime DB-backed. The query plan is contract/proof only until a future loader/adapter slice is selected.
- `events` and `people` remain blocked for formal owner reads until the owner-scope relation or privacy split is approved.

## Next Decision

Loop 155 is the required fifth-loop launch-level review. If Supabase/session evidence appears, run `AUTH-005`; if a safe Work proof target plus confirmations appears, run `WORK-009`; otherwise run the short launch-level review and route the next no-proof implementation fallback to `RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON`.
