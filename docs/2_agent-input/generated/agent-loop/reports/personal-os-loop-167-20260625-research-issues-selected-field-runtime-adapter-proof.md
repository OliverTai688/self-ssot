# Agent Loop Evidence Report

## Task

- Task ID: `RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF`
- Title: Research owner read issues selected-field runtime adapter proof
- Date: 2026-06-25
- Agent: Codex

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- Last three reports: loop 166 BFF-012 service-authz runtime proof, loop 165 launch review, loop 164 BFF-011 runtime-readiness gate

## Scope

- In scope: Add a disabled selected-field runtime adapter proof gate after BFF-012, surface it in protected `/research/readiness`, add a checker, and update acceptance/backlog/sprint/task memory/completed log/loop state.
- Out of scope: Live Research Prisma reads, Research DB writes, schema or migration changes, seed changes, route handlers, server actions, public output, external collaboration, Research agent final writes, external agent database access, external registration, and launch-level upgrade.

## Strategic Review

- Current launch level / target: Formal launch remains `L0_LOCAL_PROTOTYPE`; target next is `L1_PRIVATE_ONLINE_WORK_OS`. Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- Last-three-loop delta: Loop 164 added the BFF-011 selected-field read-shape gate, loop 165 confirmed no launch upgrade and routed BFF-012, and loop 166 added protected `requireUser()` service-authz preflight.
- Repetition check: This loop is runtime-adjacent implementation plus UI/checker, not documentation-only work.
- Current strongest blocker: `AUTH-005`, `WORK-009`, and `DEPLOY-002` remain owner/operator evidence blockers.
- Acceptance / roadmap / research / blocker mapping: Maps to `ACC-002` BFF-013, `RES-001` Research maturity, `RES-002` BFF/API and real-data operating-surface maturity, `DBS-003`, `AUT-002`, `AUT-005`, and `ARC-028`.
- Expected capability, proof, or blocker delta: Research issues now has a machine-checkable selected-field adapter proof gate, so the future live read has explicit owner-run pass criteria instead of an ambiguous jump from service-authz proof to Prisma read.

## Research / Reference Basis

- Local docs/code reviewed: `DBS-003`, `AUT-002`, `AUT-005`, `ACC-002`, `ARC-028`, BFF-009/BFF-010/BFF-011/BFF-012 contracts/services/checkers, `auth.service.ts`, and protected `/research/readiness`.
- External/current references reviewed: local official Next.js 16 docs under `node_modules/next/dist/docs/`, especially Data Security and Server/Client Components; public equivalents are https://nextjs.org/docs/app/guides/data-security and https://nextjs.org/docs/app/getting-started/server-and-client-components. Prisma selected-field reference: https://www.prisma.io/docs/orm/prisma-client/queries/select-fields.
- Page requirement understanding score: 93/100 from the same Research issues BFF chain.
- Understanding level: High.
- Required research optimization rounds: 3, completed in loop 163 and revalidated through loops 164-167.
- Same-issue synthesis: The safe path is `Server Component -> server-only service -> BFF-012 requireUser preflight -> BFF-013 selected-field proof gate -> future live read only with owner-run proof target -> mapper -> UI-safe DTO`.
- Selected implementation pattern: Add a server-only proof DTO that records the planned `prisma.researchThread.findMany` shape as data while keeping `livePrismaReadAllowed=false`, `proofTargetReady=false`, and `adapterExecutionAllowed=false`.
- Rejected alternatives: Live Prisma read in this loop, caller-supplied `ownerId`, threadId-only reads, raw Prisma row passthrough, route/action proof endpoint, public output, and external agent registration.
- Task shape created or updated: Marked BFF-013 done and added `LOOP-168-RESEARCH-POST-SELECTED-FIELD-ADAPTER-GAP-REVIEW`.

## NANDA / Agent Protocol Alignment

- Applies?: Yes, because the Research agent proposal/readiness surface and future Research owner-read adapter are adjacent to agent-visible Research capability.
- Affected agents or capabilities: Research agent proposals and the owner-visible Research issues read surface.
- AgentFacts-lite fields changed: None in generated registry.
- Internal discovery / registry state: Protected-owner visible only.
- External registration state: `externalRegisterable: false`.
- Trust, auth, approval, and data-visibility boundaries: No external agent DB access, no public output, no final Research agent writes, no raw owner/Profile identifiers, and no live adapter execution without owner-run proof.
- Concrete protocol artifact created: BFF-013 server-only proof service plus checker validating disabled public/external/write/registration flags.
- NANDA / AgentFacts / MCP / A2A sources reviewed: `ARC-028`; no external registration behavior was added.

## Changes

- Files changed:
  - `src/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service.ts`
  - `src/lib/services/research-owner-read-dto.service.ts`
  - `src/app/(dashboard)/research/readiness/page.tsx`
  - `scripts/check-research-owner-read-issues-selected-field-runtime-adapter.mjs`
  - `package.json`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `tasks.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Behavior changed: Protected `/research/readiness` now shows an issues selected-field runtime adapter proof section with planned operation, owner predicate, selected fields, relation counts, mapper handoff, owner-run criteria, and disabled live-read flags.
- Docs changed: BFF-013 acceptance, task state, sprint/current status, completed log, task memory, loop state, and generated evidence.

## Verification

| Command | Result | Notes |
|---|---|---|
| `node --check scripts/check-research-owner-read-issues-selected-field-runtime-adapter.mjs` | Passed | Script syntax valid |
| `pnpm research:read-issues-selected-field-runtime-adapter:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-research-issues-selected-field-runtime-adapter-check.json` | Passed | `ready_for_issues_selected_field_runtime_adapter_proof_gate` |
| `pnpm research:read-issues-service-authz-runtime:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-research-issues-service-authz-runtime-check.json` | Passed | BFF-012 still passes |
| `pnpm research:read-issues-runtime-readiness:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-research-issues-runtime-readiness-check.json` | Passed | BFF-011 still passes |
| `pnpm research:read-issues-adapter:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-research-issues-adapter-check.json` | Passed | BFF-010 still passes |
| `pnpm research:read-adapter-runtime:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-research-adapter-runtime-check.json` | Passed | BFF-009 still passes |
| `pnpm research:read-dto:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-research-read-dto-check.json` | Passed | Owner-read DTO surface still passes |
| `pnpm research:readiness:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-research-readiness-check.json` | Passed | Research formal readiness still passes |
| `pnpm db:validate` | Passed | Prisma schema valid |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript clean |
| `pnpm launch:preempt:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-167-20260625-launch-preemption-router.json` | Passed | AUTH/WORK/DEPLOY still blocked; next fallback is RES-001 research review |
| JSON parse for loop state, BFF-013 checker JSON, and launch preemption JSON | Passed | All parsed |
| `git diff --check` | Passed | No whitespace errors before report write |

## Evidence

- Relevant output or observation: BFF-013 checker reports `ready_for_issues_selected_field_runtime_adapter_proof_gate`, `plannedPrismaOperation=prisma.researchThread.findMany`, `plannedWhere=where: { ownerId: ownerProfileId }`, `proofTargetReady=false`, `livePrismaReadAllowed=false`, `runtimeDbReadEnabled=false`, `runtimePrismaReadEnabled=false`, and `adapterExecutionAllowed=false`.
- Screenshots or browser checks: Not run. Remaining UI visual evidence can be owner-run by opening protected `/research/readiness`.
- DB checks: `pnpm db:validate` passed. No Research runtime DB read/write was added.
- Product capability delta: The Research issues owner-read chain now has visible selected-field adapter proof criteria between service-authz runtime proof and any future live Prisma read.
- Proof delta: Static checker proves selected fields, relation counts, mapper handoff, owner-run criteria, and disabled live-read flags.
- Blocker delta: Launch blockers unchanged; `AUTH-005`, `WORK-009`, and `DEPLOY-002` remain owner/operator proof gates.
- Agent protocol-readiness delta: Research agent proposal/readiness surface remains protected-owner visible, proposal-only, non-registerable, no public output, and no external DB access.

## Remaining Risks

- BFF-013 does not prove a live Research selected-field Prisma read.
- Live read proof still needs owner-run `AUTH-005` or explicit dev mock identity proof plus a safe owner-approved proof target.
- `launch:preempt:check` still routes away from AUTH/WORK/DEPLOY and toward the due RES-001/RES-002 research review.
- `OWNER-UI-REVIEW`, `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` remain unproven.

## Final Status

- Status: Completed. No launch level upgraded.
- Recommended next task: `LOOP-168-RESEARCH-POST-SELECTED-FIELD-ADAPTER-GAP-REVIEW`, unless `AUTH-005` or `WORK-009` prerequisites appear first.
