# Agent Loop Evidence Report

## Task

- Task ID: `RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF`
- Title: Research owner read issues service-authz runtime proof
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
- Last three loop reports: loop 165 launch review, loop 164 BFF-011 runtime-readiness gate, loop 163 Research post-issues-adapter gap review

## Scope

- In scope: Add a protected server runtime proof that calls `requireUser()` for the Research issues owner-read chain, returns a no-secret owner preflight packet, surfaces it in `/research/readiness`, and verifies disabled Research read/write boundaries.
- Out of scope: Live Research Prisma reads, DB writes, schema or migration changes, seed changes, route handlers, server actions, public output, external collaboration, Research agent final writes, external registration, deployment proof, or launch-level upgrade.

## Strategic Review

- Current launch level / target: Formal launch remains `L0_LOCAL_PROTOTYPE`; target next is `L1_PRIVATE_ONLINE_WORK_OS`. Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- Last three reports reviewed: loop 165 launch review, loop 164 BFF-011 runtime-readiness gate, loop 163 Research post-issues-adapter gap review.
- Last-three-loop delta: Loop 163 produced the research-to-task path, loop 164 created the BFF-011 preflight contract, and loop 165 confirmed no formal launch upgrade while routing BFF-012.
- Repetition check: Not repeated documentation-only work. This loop adds runtime server proof plus UI and checker.
- Current strongest blocker: `AUTH-005`, `WORK-009`, and `DEPLOY-002` remain owner/operator evidence blockers.
- Acceptance / roadmap / research / blocker mapping: Maps to `ACC-002` BFF-012, `RES-001` Research maturity, `RES-002` BFF/API operating-surface maturity, `AUT-002`, `DBS-003`, and `ARC-028`.
- Expected capability, proof, or blocker delta: Research owner-read can now exercise the service authz runtime identity boundary before any Research adapter read.

## Research / Reference Basis

- Local docs/code reviewed: `DBS-003`, `AUT-002`, `AUT-005`, `ACC-002`, `ARC-028`, BFF-009/BFF-010/BFF-011 contracts/checkers/services, `auth.service.ts`, and the protected Research readiness page.
- External or reference websites reviewed: Local official Next.js 16 docs under `node_modules/next/dist/docs/`, especially Data Security, Authentication, and Server/Client Components. Public equivalents: https://nextjs.org/docs/app/guides/data-security, https://nextjs.org/docs/app/guides/authentication, https://nextjs.org/docs/app/getting-started/server-and-client-components.
- Page requirement understanding score: 93/100.
- Understanding level: High.
- Required research optimization rounds: 3.
- Completed rounds and lenses: Loop 163 completed local code/schema fit, official framework/provider data-access guidance, and auth/NANDA/acceptance boundaries; this loop revalidated those lenses against BFF-012 before implementation.
- Same-issue synthesis: The safe path is `Server Component page -> server-only service -> requireUser() -> no-secret owner preflight DTO -> disabled Research adapter read flags -> future selected-field proof gate`.
- Selected implementation pattern: Async Server Component imports a server-only proof service that catches auth failure, returns a blocked UI-safe packet, and never imports Prisma/db/provider clients in the BFF-012 service.
- Rejected alternatives: Live `prisma.researchThread.findMany`, caller-supplied `ownerId`, raw Profile/auth payload exposure, route/action/public/external proof endpoint, and launch upgrade claim.
- Task shape created or updated: Marked BFF-012 done and added `RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF`.

## NANDA / Agent Protocol Alignment

- Applies?: Yes, because Research agent proposal/readiness boundaries are adjacent to agent-visible Research surfaces.
- Affected agents or capabilities: Research agent proposals and owner-read Research issues surface.
- AgentFacts-lite fields changed: None in generated registry.
- Internal discovery / registry state: Protected-owner visible only.
- External registration state: `externalRegisterable: false`.
- Trust, auth, approval, and data-visibility boundaries: No external agent DB access, no public output, no final Research agent writes, Profile id/email/role redacted, owner identity sourced only from `requireUser()`.
- Concrete protocol artifact created: Runtime proof service plus checker validating NANDA-relevant disabled flags.
- NANDA / AgentFacts / MCP / A2A sources reviewed: `ARC-028`; no external registration behavior was added.

## Changes

- Files changed:
  - `src/lib/services/research-owner-read-issues-runtime-readiness.service.ts`
  - `src/app/(dashboard)/research/readiness/page.tsx`
  - `src/lib/services/research-owner-read-dto.service.ts`
  - `scripts/check-research-owner-read-issues-service-authz-runtime.mjs`
  - `package.json`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `tasks.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Behavior changed: Protected `/research/readiness` now shows an issues service-authz runtime proof section driven by a server-only `requireUser()` preflight service.
- Docs changed: BFF-012 acceptance, task state, completed log, sprint, backlog, task memory, and loop state updated.

## Verification

| Command | Result | Notes |
|---|---|---|
| `node --check scripts/check-research-owner-read-issues-service-authz-runtime.mjs` | Passed | Script syntax valid |
| `pnpm research:read-issues-service-authz-runtime:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-research-issues-service-authz-runtime-check.json` | Passed | `ready_for_issues_service_authz_runtime_proof` |
| `pnpm research:read-issues-runtime-readiness:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-research-issues-runtime-readiness-check.json` | Passed | BFF-011 still passes |
| `pnpm research:read-issues-adapter:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-research-issues-adapter-check.json` | Passed | BFF-010 still passes |
| `pnpm research:read-adapter-runtime:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-research-adapter-runtime-check.json` | Passed | BFF-009 still passes |
| `pnpm research:read-dto:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-research-read-dto-check.json` | Passed | Owner-read DTO surface still passes |
| `pnpm research:readiness:check -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-research-readiness-check.json` | Passed | Research formal readiness still passes |
| `pnpm db:validate` | Passed | Prisma schema valid |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript clean |
| `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-launch-preemption-router.json` | Passed | AUTH/WORK/DEPLOY still blocked; no proof preemption |
| `pnpm launch:freshness:check -- --loop 166 --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-166-20260625-launch-freshness.json` | Passed with `proof_refresh_required` | Expected because this loop did not refresh full launch/auth/Work proof packets |
| `node -e "JSON.parse(require('fs').readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state json ok')"` | Passed | Loop state JSON valid |
| `git diff --check` | Passed | No whitespace errors |

## Evidence

- Relevant output or observation: BFF-012 checker reports `ready_for_issues_service_authz_runtime_proof`, `runtimeRequireUserCallInThisSlice=true`, `runtimeDbReadEnabled=false`, `runtimeDbReadScope=research_owner_read_adapter_only`, `runtimePrismaReadEnabled=false`, and `adapterExecutionAllowed=false`.
- Screenshots or browser checks: Not run in this loop. The remaining UI visual evidence can be owner-run through `/research/readiness`.
- DB checks: `pnpm db:validate` passed. No Research runtime DB read/write was added.
- Product capability delta: Research readiness now has a runtime-adjacent service authz proof section instead of only static preflight contracts.
- Proof delta: The owner identity preflight is now executable through `requireUser()` in a server-only service with redacted UI-safe output.
- Blocker delta: Launch blockers unchanged; `AUTH-005`, `WORK-009`, and `DEPLOY-002` remain external/manual proof gates.
- Agent protocol-readiness delta: Research agent proposal/readiness surface keeps protected-owner visible, proposal-only, non-registerable, no public output, and no external DB access.

## Remaining Risks

- BFF-012 does not prove a live Research selected-field Prisma read.
- `requireUser()` may require owner/operator Supabase or mock Profile setup in the local environment.
- `launch:freshness` still requires full launch/auth/Work proof refresh before any launch-level claim.
- `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, and owner UI review remain unproven.

## Final Status

- Status: Completed. No launch level upgraded.
- Recommended next task: `RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF`, unless `AUTH-005` or `WORK-009` prerequisites appear first.
