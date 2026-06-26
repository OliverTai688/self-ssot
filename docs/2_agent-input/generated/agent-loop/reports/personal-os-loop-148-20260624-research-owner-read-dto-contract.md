# Personal OS Loop 148 Evidence - Research Owner Read DTO Contract

## Task

- Task ID: `RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT`
- Title: Define owner-scoped Research read DTO contract
- Date: 2026-06-24
- Agent: Codex

## Strategic Review Gate

- Current target: post-30 convergence toward a complete private online operating experience while owner/operator proof remains Manual Ops.
- Current launch state: formal `L0_LOCAL_PROTOTYPE`, Manual Ops `M1_MANUAL_OPS_READY`, conditional product maturity `C3_ARCHITECTURE_GATE_READY`.
- Last three completed loops: loop 145 confirmed proof blockers in the fifth-loop launch review; loop 146 implemented `RESEARCH-MODEL-001`; loop 147 ran the Research post-model gap review and expanded `RESEARCH-BFF-001`.
- Current blocker: formal launch proof still requires owner/operator Supabase/session, safe Work proof target/write confirmation, and deployment evidence. Research maturity needs a safe owner-read DTO boundary before runtime reads.
- Repetition check: loop 147 was research/gap review; loop 148 creates a concrete contract and checker artifact instead of another review-only report.
- Selected task: `RESEARCH-BFF-001`.
- Product delta: Research now has a machine-checkable owner-scoped read DTO contract before any Research DB read expansion.

## Source Docs And Code Read

- Required loop docs: `AGENTS.md`, `MAN-000`, `MAN-001`, `PLN-060`, `PLN-061`, strategy, loop state, and the last three loop reports.
- Product/acceptance docs: `ACC-002`, `DBS-003`, `DBS-005`, and loop 147 report.
- Agent protocol doc: `ARC-028_nanda-agent-protocol-alignment.md`.
- Code inspected: Research formal readiness contract/checker, Research model reconciliation contract/checker, `auth.service.ts`, `project.service.ts`, `src/types/research.ts`, and Research action/model context.

## Research / Reference Basis

- Page/task issue: Research owner-scoped read DTO contract.
- Understanding score: 89/100 from loop 147.
- Understanding level: High.
- Required rounds: 3.
- Completed rounds: loop 147 completed local product/schema/code fit, official local Next.js BFF/data-security/auth lens, and auth/NANDA/acceptance boundary.
- Same-issue synthesis: implement a contract-only, checker-backed DTO boundary before runtime Research DB reads.
- Selected implementation pattern: `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> owner-scoped read query -> mapper -> UI-safe DTO -> Client Component interaction`.
- Rejected alternatives: runtime DB read in this loop, current unsafe Research actions as formal BFF, public route expansion, schema/migration changes, Research agent final writes, or launch-level claims.

## NANDA / Agent Protocol Alignment

- Applies: yes, because Research agent proposal DTOs are included in the owner-read surface.
- Affected capability: Research agent proposals.
- AgentFacts-lite fields affected: capability boundary, trust boundary, data visibility, observability/evidence, registry status.
- Runtime agent changed: false.
- External registration state: `externalRegisterable=false`.
- Trust/auth/approval boundary: protected-owner visible, proposal-only, no public output, no direct external agent DB access, no final writes without human approval.
- Concrete artifact: `RESEARCH_OWNER_READ_DTO_CONTRACT` and `pnpm research:read-dto:check`.

## Changes

- Added `src/lib/contracts/research-owner-read-dto.contract.ts`.
- Added `scripts/check-research-owner-read-dto.mjs`.
- Added `pnpm research:read-dto:check`.
- Updated `DBS-003` with the owner-scoped read DTO contract decision.
- Updated `ACC-002`, `PLN-060`, `PLN-061`, `RPT-007`, `tasks.md`, and `loop-state.json`.
- Added generated proof packet `personal-os-loop-148-20260624-research-read-dto-check.json`.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-148-20260624-launch-preemption-router.json` | Passed | Proof preemption still routes away from `AUTH-005`, `WORK-009`, and `DEPLOY-002`; no launch upgrade. |
| `node --check scripts/check-research-owner-read-dto.mjs` | Passed | New checker syntax is valid. |
| `pnpm research:read-dto:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-148-20260624-research-read-dto-check.json` | Passed | Reports `ready_for_owner_scoped_research_read_dto_contract_use`. |
| `pnpm research:model:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-148-20260624-research-model-check.json` | Passed | Existing model reconciliation gate still passes. |
| `pnpm research:readiness:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-148-20260624-research-readiness-check.json` | Passed | Existing Research readiness surface gate still passes. |
| `pnpm db:validate` | Passed | Prisma schema remains valid. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript completed with no output. |
| JSON parse for loop state and generated loop 148 packets | Passed | Parsed loop state, launch preemption, Research read DTO, Research model, and Research readiness packets. |
| `git diff --check` | Passed | No whitespace errors. |

## Evidence

- Product capability delta: Research has 11 explicit owner-read DTO families and empty/readiness states before runtime read expansion.
- Proof delta: `pnpm research:read-dto:check` now validates contract markers, docs/task memory, package script, no forbidden runtime imports, false safety markers, no hidden mock-to-formal claim, no public output, and no launch-level claim.
- Blocker delta: Research owner-read scope is no longer ambiguous at the contract level; runtime implementation remains blocked until a server-only service/surface slice is selected.
- Agent protocol-readiness delta: Research agent proposals are explicitly protected-owner visible, proposal-only, and not externally registerable.

## Remaining Risks

- Runtime Research reads are still disabled.
- Current Research server actions remain unsafe for formal use where they accept caller-supplied `ownerId` or `threadId`.
- No launch level can upgrade without `AUTH-005`, `WORK-009` or approved Work proof fallback, and `DEPLOY-002`.
- `RESEARCH-BFF-002` must avoid querying Research tables until service authorization, mapper behavior, and empty/readiness DTOs are implemented safely.

## Final Status

- Status: `RESEARCH-BFF-001` complete.
- Recommended next task: run `AUTH-005` if Supabase/session evidence appears, `WORK-009` if a safe Work proof target plus confirmations appear, otherwise implement `RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE`.
