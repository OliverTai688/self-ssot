# Agent Loop Evidence Report

## Task

- Task ID: `RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT`
- Title: Research owner read adapter authz contract
- Date: 2026-06-24
- Agent: Codex

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- Last three completed reports: loop 157 post-loader gap review, loop 156 service-loader skeleton, loop 155 launch-level review.
- Related code/contracts/checkers: Research owner-read DTO contract, query-plan contract, DTO service surface, Research model reconciliation, and existing Research check scripts.

## Scope

- In scope: add a no-runtime Research owner-read adapter authorization contract, checker, package script, generated evidence, and task memory updates.
- Out of scope: Prisma client imports, runtime Research DB reads, DB writes, route handlers, server actions, schema/migration changes, seed changes, public output, external collaboration, Research agent final writes, external agent DB access, external registration, and launch-level claims.

## Strategic Review

- Current launch level / target: formal `L0_LOCAL_PROTOTYPE`; Manual Ops `M1_MANUAL_OPS_READY`; conditional product maturity `C3_ARCHITECTURE_GATE_READY`; next formal target remains `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three reports reviewed: loop 157 Research post-loader gap review, loop 156 Research owner-read service loader skeleton, loop 155 launch-level review.
- Last-three-loop delta: Research now has DTO/authz/mapper/query-plan/service-loader layers plus a research-confirmed adapter/authz follow-up.
- Repetition check: this loop implements the named `RESEARCH-BFF-007` contract/checker and closes an acceptance item; it is not another review-only loop.
- Current strongest blocker: `AUTH-005`, `WORK-009`, and `DEPLOY-002` still require owner/operator evidence.
- Acceptance / roadmap / research / blocker mapping: maps to `ACC-002` Research BFF readiness and `RES-001` / `RES-002` real-data operating-surface maturity.
- Expected capability, proof, or blocker delta: future Research adapter work now has a machine-checkable per-family authz gate before any Prisma adapter read.

## Research / Reference Basis

- Page/API requirement understanding score: inherited from loop 157 same-issue research, 92/100 High.
- Required same-issue research rounds: 3.
- Completed rounds: loop 157 completed the local code/schema/action fit, official Next.js/Prisma data-access guidance, and auth/NANDA/acceptance boundary rounds.
- Selected implementation pattern: consume BFF-005 query-plan rows and BFF-006 loader boundaries from a no-runtime contract, then derive one adapter authz decision per owner-read DTO family.
- Rejected alternatives: direct Prisma reads, route handlers, server actions, caller-supplied owner scope, direct `threadId` reads, treating global events/people as owner data, raw Prisma payload passthrough, public output, external collaboration, and external-registerable Research agent behavior.
- Source links inherited from loop 157: Next.js data security/fetching-data docs and Prisma relation/select-field docs.

## NANDA / Agent Protocol Alignment

- Applies?: yes, lightly, because the Research owner-read families include `agent-proposals`.
- Affected agents or capabilities: Research agent proposals only.
- AgentFacts-lite fields changed: none at runtime.
- Internal discovery / registry state: unchanged.
- External registration state: `externalRegisterable=false`.
- Trust, auth, approval, and data-visibility boundaries: protected owner only, proposal-only, no final writes, no public output, no external collaboration, no external agent DB access.
- Concrete protocol artifact created: adapter authz contract and checker that keep Research agent proposals proposal-only and non-registerable.

## Changes

- Files changed:
  - `src/lib/contracts/research-owner-read-adapter-authz.contract.ts`
  - `scripts/check-research-owner-read-adapter-authz.mjs`
  - `package.json`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `tasks.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - generated loop 158 JSON reports
- Behavior changed: no runtime product behavior changed.
- Contract delta: all 11 Research owner-read DTO families now have adapter authz eligibility, owner identity source, owner-scope proof path, denied unsafe patterns, selected-field boundary, mapper boundary, unavailable/proposal state, audit ref, and next implementation condition.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-158-20260624-launch-preemption-router.json` | Pass | `AUTH-005`, `WORK-009`, and `DEPLOY-002` remain owner/operator blocked. |
| `node --check scripts/check-research-owner-read-adapter-authz.mjs` | Pass | Syntax check. |
| `pnpm research:read-adapter-authz:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-158-20260624-research-read-adapter-authz-check.json` | Pass | Status `ready_for_research_owner_read_adapter_authz_contract_use`; 11 families; 0 errors. |
| `pnpm research:read-query-plan:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-158-20260624-research-read-query-plan-check.json` | Pass | Query-plan/service-loader contract remains valid. |
| `pnpm research:read-dto:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-158-20260624-research-read-dto-check.json` | Pass | DTO/authz/mapper/service-loader surface remains valid. |
| `pnpm research:model:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-158-20260624-research-model-check.json` | Pass | Model reconciliation remains valid. |
| `pnpm research:readiness:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-158-20260624-research-readiness-check.json` | Pass | Formal readiness surface remains valid. |
| `pnpm db:validate` | Pass | Prisma schema valid; no DB connection or migration run. |
| `pnpm exec tsc --noEmit --pretty false` | Pass | TypeScript clean. |
| JSON parse for package, loop state, and loop 158 generated JSON evidence | Pass | 8 JSON files parsed. |
| `git diff --check` | Pass | No whitespace errors. |

Note: the first run of the new checker caught missing static markers in the contract; the contract was adjusted to make the BFF path and family basis machine-checkable, then the checker passed.

## Evidence

- Relevant output or observation: adapter authz JSON reports `ready_for_research_owner_read_adapter_authz_contract_use`.
- Screenshots or browser checks: not run; this loop changed static BFF contracts, checkers, and task memory only.
- DB checks: `pnpm db:validate` only; no DB connection, read, write, seed, migration, or runtime adapter execution.
- Product capability delta: Research owner-read has an explicit adapter execution authz gate before any runtime DB read.
- Proof delta: no formal launch proof delta; launch proof remains owner/operator blocked.
- Blocker delta: the adapter/authz step is no longer ambiguous; the next no-proof slice is `RESEARCH-BFF-008`.
- Agent protocol-readiness delta: Research agent proposal rows remain protected-owner proposal-only and non-registerable.

## Remaining Risks

- Formal Research runtime reads remain disabled until a future adapter harness and runtime adapter implementation pass.
- Events and people remain blocked until owner scope or privacy split is approved.
- Typed links and graph projections remain derived-only until link provenance, persistence, and audit rules exist.
- Formal launch cannot upgrade until owner/operator evidence exists for Supabase auth/Profile mapping, Work proof target/write confirmation, and deployment marker.

## Final Status

- Status: Complete.
- Recommended next task: run `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears; run `WORK-009` if a safe Work proof target plus exact confirmations appear; otherwise implement `RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS`.
