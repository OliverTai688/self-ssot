# Personal OS Loop 147 Evidence - Research Post-Model Gap Review

## Task

- Task ID: `LOOP-147-RESEARCH-GAP-REVIEW`
- Title: RES-001/RES-002 Research post-model gap review
- Date: 2026-06-24
- Agent: Codex

## Strategic Review Gate

- Current target: shortest-path post-30 convergence toward a complete private online operating experience.
- Current launch state: formal `L0_LOCAL_PROTOTYPE`, Manual Ops `M1_MANUAL_OPS_READY`, conditional product maturity `C3_ARCHITECTURE_GATE_READY`.
- Last three completed loops: loop 144 created `RESEARCH-MODEL-001`; loop 145 confirmed proof blockers and routed to Research model reconciliation; loop 146 implemented the model reconciliation contract/checker.
- Current blocker: formal launch proof still requires owner/operator Supabase/session, Work proof target/write confirmation, and deployment evidence. Research maturity now needs the owner-scoped read DTO/BFF boundary before runtime reads.
- Selected task: `LOOP-147-RESEARCH-GAP-REVIEW`.
- Product delta: the Research BFF read boundary is now converted into `RESEARCH-BFF-001` with implementation-ready acceptance, verification, and stop conditions.

## Source Docs And Code Read

- Required loop docs: `AGENTS.md`, `MAN-000`, `MAN-001`, `MAN-002`, `PRD-001`, `PRD-004`, `PRD-005`, `ACC-001`, `ACC-002`, `RES-001`, `RES-002`, `RES-005`, `PLN-060`, `PLN-061`, `PLN-063`, strategy, loop state, and the last three loop reports.
- Agent protocol doc: `ARC-028_nanda-agent-protocol-alignment.md`.
- Official local Next.js docs: `backend-for-frontend.md`, `data-security.md`, `fetching-data.md`, and `authentication.md` under `node_modules/next/dist/docs/01-app/`.
- Research code inspected: Research formal readiness contract/service/page, Research model reconciliation contract/checker, Research types, Prisma Research models, and current Research actions.
- Auth/code patterns inspected: `src/lib/services/auth.service.ts` and `src/lib/services/project.service.ts`.

## Research Score Gate

- Page/task issue: Research owner-scoped read DTO contract.
- Score: 89/100.
- Level: High.
- Required research rounds: 3.
- Completed rounds: local product/schema/code fit; official Next.js BFF/data-security/auth lens; auth/NANDA/acceptance boundary.

## Selected Pattern

Create `RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT` as a contract-only, checker-backed BFF boundary before runtime reads. The future path must be:

`Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> mapper -> UI-safe DTO -> Client Component interaction`

The contract must define owner-derived identity, no caller-supplied `ownerId`, no direct `threadId` access without authorization, no raw Prisma rows to Client Components, no public output, no external agent DB access, and proposal-only Research agent output.

## Rejected Alternatives

- Implementing runtime Research DB reads in loop 147.
- Reusing current Research server actions as formal BFF because they accept caller-supplied ownership or thread identifiers.
- Adding a public route handler before owner-only read semantics are stable.
- Changing Prisma schema or migration state in the same slice.
- Allowing Research agent final writes or external registration.
- Claiming launch-level progress from contract evidence.

## Changes

- Added `docs/06_audits-and-reports/RPT-043_loop-147-research-post-model-gap-review.md`.
- Updated `MAN-001` with the new formal report.
- Updated `ACC-002` with `RESEARCH-BFF-001` acceptance criteria.
- Marked `LOOP-147-RESEARCH-GAP-REVIEW` done and expanded `RESEARCH-BFF-001` in `PLN-060`.
- Updated `PLN-061`, `RPT-007`, `tasks.md`, and loop state.

## NANDA Alignment

- Applies: yes, because Research agent proposal/readiness boundaries are part of the future read DTO surface.
- Affected surface: Research agent proposals.
- Runtime agent changed: false.
- External registration: `externalRegisterable=false`.
- Boundary: protected-owner visible, proposal-only, no public output, no direct external DB access, no final writes without human approval.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-147-20260624-launch-preemption-router.json` | Passed before edits | Recommended `RES-001-RESEARCH-REVIEW`; proof prerequisites remain absent. |
| `pnpm research:model:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-147-20260624-research-model-check.json` | Passed | Reports `ready_for_research_model_reconciliation_use`. |
| `pnpm research:readiness:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-147-20260624-research-readiness-check.json` | Passed | Reports `ready_for_research_formal_readiness_surface`. |
| `pnpm db:validate` | Passed | Prisma schema remains valid. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript completed with no output. |
| JSON parse for loop state and generated loop 147 packets | Passed | Parsed loop state, launch preemption, Research model, and Research readiness packets. |
| `git diff --check` | Passed | No whitespace errors. |

## Launch Level

- Formal launch remains `L0_LOCAL_PROTOTYPE`.
- Manual Ops remains `M1_MANUAL_OPS_READY`.
- Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- No L1, L3, L4, `AUTH-005`, `WORK-009`, `WORK-007`, or `DEPLOY-002` claim was made.

## Next Decision

Loop 148 should run `AUTH-005` if Supabase/session evidence appears, `WORK-009` if a safe Work proof target plus confirmations appear, otherwise implement `RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT`.
