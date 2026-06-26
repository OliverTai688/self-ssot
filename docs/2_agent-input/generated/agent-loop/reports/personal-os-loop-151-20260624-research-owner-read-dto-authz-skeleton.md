# Personal OS Loop 151 Evidence - Research Owner Read DTO Authz Skeleton

## Task

- Task ID: `RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON`
- Title: Add Research owner-read DTO service authorization skeleton
- Date: 2026-06-24
- Agent: Codex

## Strategic Review Gate

- Current launch state: formal `L0_LOCAL_PROTOTYPE`, Manual Ops `M1_MANUAL_OPS_READY`, conditional product maturity `C3_ARCHITECTURE_GATE_READY`.
- Last three completed loops: loop 148 added the Research owner-read DTO contract; loop 149 added the server-only service/protected UI surface; loop 150 completed the fifth-loop launch review and routed loop 151 to `RESEARCH-BFF-003`.
- Current blocker: `AUTH-005`, `WORK-009`, and `DEPLOY-002` still need owner/operator evidence, while Research needs service authorization shape before runtime reads.
- Repetition check: loop 150 was proof/review-heavy, so this loop implemented a runtime-facing service/page/checker slice.
- Selected task: `RESEARCH-BFF-003`.
- Product delta: Research owner-read DTOs now have a visible `requireUser()`-shaped authorization skeleton before adapter reads.

## Source Docs And Code Read

- Required loop docs: `AGENTS.md`, `MAN-000`, `MAN-001`, `PRD-004`, `PRD-005`, `ACC-001`, `PRD-001`, `MAN-002`, `ARC-028`, `RES-001`, `RES-002`, `RES-005`, `PLN-063`, strategy, loop state, sprint, backlog, and last-three reports.
- Product/acceptance docs: `ACC-002`, `DBS-003`, loop 148/149/150 generated reports.
- Current framework references: local Next.js 16 Server/Client Components, data fetching, and mutating-data auth guidance under `node_modules/next/dist/docs/`.
- Code inspected: Research owner-read DTO contract/service/checker, protected `/research/readiness`, `auth.service.ts`, and related Research readiness proof files.

## Research / Reference Basis

- Page/task issue: Research owner-read DTO service authorization before runtime reads.
- Understanding score: 89/100 from loop 147 same-issue review.
- Required research rounds: 3, completed in loop 147.
- Selected implementation pattern: keep BFF-001 as contract-only, BFF-002 as server-only service/protected page surface, and BFF-003 as service authorization skeleton with checker-proof markers.
- Rejected alternatives: adding BFF-003 markers to the BFF-001 contract, runtime Prisma reads, route handlers, server action writes, caller-supplied owner ids, direct threadId-only reads, hidden mock fallback, public output, and external agent sharing.
- Adjustment made during verification: the first `research:read-dto:check` run correctly exposed a checker false-positive requiring the BFF-003 marker in the contract; the checker was fixed so BFF-003 is verified in service/page/docs instead.

## NANDA / Agent Protocol Alignment

- Applies?: Yes, because Research agent proposal reads are included in the owner-read DTO surface.
- Affected capability: Research agent proposals only.
- Runtime agent changed: false.
- External registration state: `externalRegisterable=false`.
- Trust/auth/approval boundary: proposal-only, protected-owner visible, no public output, no external collaboration, no external agent DB access, and no final writes without human approval.
- Concrete artifact: `buildResearchOwnerReadDtoSurface()` now exposes the authz skeleton plus permission decisions and protected proposal-only boundary.

## Changes

- `src/lib/services/research-owner-read-dto.service.ts`: added BFF-003 authorization skeleton, authorization stage rows, and permission decision rows.
- `src/app/(dashboard)/research/readiness/page.tsx`: rendered the owner-read authorization skeleton, denied patterns, unavailable states, and permission decisions.
- `scripts/check-research-owner-read-dto.mjs`: upgraded proof to `ready_for_owner_scoped_research_read_dto_authz_skeleton` and validates BFF-003 service/page/docs markers.
- `ACC-002`, `PLN-060`, `PLN-061`, `RPT-007`, `tasks.md`, and `loop-state.json`: recorded loop 151 completion and routed loop 152 to `RESEARCH-BFF-004`.

## Verification

| Command | Result | Notes |
|---|---|---|
| `node --check scripts/check-research-owner-read-dto.mjs` | PASS | Checker syntax valid. |
| `pnpm research:read-dto:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-151-20260624-research-read-dto-check.json` | PASS | Reports `ready_for_owner_scoped_research_read_dto_authz_skeleton`. |
| `pnpm research:model:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-151-20260624-research-model-check.json` | PASS | Research model reconciliation remains valid. |
| `pnpm research:readiness:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-151-20260624-research-readiness-check.json` | PASS | Research formal readiness surface remains valid. |
| `pnpm interface:smoke:check` | PASS | Interface smoke remains ready. |
| `pnpm db:validate` | PASS | Prisma schema valid; no schema change made. |
| `pnpm exec tsc --noEmit --pretty false` | PASS | TypeScript completed with no output. |
| JSON parse for loop state and generated loop 151 packets | PASS | Loop state and Research proof packets parse. |
| `git diff --check` | PASS | No whitespace errors. |

## Evidence

- Product capability delta: `/research/readiness` now shows the owner-read authorization skeleton, service authorization gate, direct threadId refusal, caller ownerId refusal, and permission decisions.
- Proof delta: `pnpm research:read-dto:check` now validates BFF-001 contract, BFF-002 service/page/hub, and BFF-003 authz skeleton without runtime DB or public/external expansion.
- Blocker delta: Research BFF authz shape is no longer ambiguous before the mapper/empty-state response slice.
- Agent protocol-readiness delta: Research agent proposal reads stay protected-owner visible, proposal-only, and non-registerable.

## Remaining Risks

- Runtime owner-scoped Research reads are still disabled.
- Mapper and unavailable/empty-state DTO response shapes need the next safe slice before any adapter read.
- Formal launch cannot upgrade without `AUTH-005`, `WORK-009` or approved Work proof fallback, and `DEPLOY-002` evidence.

## Final Status

- Status: `DONE`
- Recommended next task: run `AUTH-005` if Supabase/session evidence appears, `WORK-009` if a safe Work proof target plus confirmations appear, otherwise implement `RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE`.
