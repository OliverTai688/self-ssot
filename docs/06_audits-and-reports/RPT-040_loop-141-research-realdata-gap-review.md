# RPT-040 Loop 141 Research Real-Data Gap Review

**Date:** 2026-06-24  
**Loop:** 141  
**Task:** `LOOP-141-RESEARCH-REALDATA-GAP-REVIEW`  
**Status:** DONE  
**Formal launch level:** `L0_LOCAL_PROTOTYPE` unchanged  
**Manual Ops:** `M1_MANUAL_OPS_READY` unchanged  
**Conditional product maturity:** `C3_ARCHITECTURE_GATE_READY` unchanged

## Strategic Review Gate

- Current primary product target: keep post-30 convergence active toward `L1_PRIVATE_ONLINE_WORK_OS`, while using `RES-001`, `RES-002`, and `RES-005` to keep product maturity moving when owner/operator proof is absent.
- Last three completed loops: loop 138 converted a Work Client share-review gap into `WORK-017`; loop 139 implemented the protected Work Client pre-share checklist; loop 140 refreshed launch proof and kept formal launch at L0.
- Current blocker: `AUTH-005`, `WORK-009`/`WORK-007`, and `DEPLOY-002` remain owner/operator proof blockers. Loop 141 cannot honestly upgrade launch level.
- Anti-repeat decision: because loop 140 was a launch review and proof refresh, loop 141 uses the due three-loop `RES-001`/`RES-002` research-to-task cadence to create one implementation-ready runtime-facing artifact rather than another launch evidence packet.
- Product delta after this loop: Research moves from a vague "UI complete / mock-state" gap toward an executable formal readiness/read BFF task with auth, data, UI, and stop-condition boundaries.

## Proof Preemption

`pnpm launch:preempt:check` still recommends `RES-001-RESEARCH-REVIEW`.

- `AUTH-005` remains blocked by missing Supabase public URL, publishable key, and signed-in `/auth/status` evidence.
- `WORK-009` remains blocked by missing `WORK_PROOF_DATABASE_URL`, safe local/disposable target rule, and exact write confirmations.
- `DEPLOY-002` remains downstream of auth/session and Work proof.

Generated packet: `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-141-20260624-launch-preemption-router.json`.

## Page Requirement Understanding Score

Issue scored: Research module formal real-data/readiness progression.

Total: **86/100 — High**. High understanding requires three same-issue research optimization rounds before implementation task creation.

| Dimension | Score | Notes |
|---|---:|---|
| Actor/job clarity | 18/20 | Owner needs a usable research operating surface for issues, sources, writing, graph, and future agent proposals. |
| PRD/local evidence fit | 18/20 | `PRD-005`, `RES-001`, `RES-002`, `DBS-003`, `DBS-005`, `ACC-002`, and current UI/code all identify Research as a mature UI with real-data/auth gaps. |
| Data/BFF/API clarity | 15/20 | Prisma has thread-based Research models and server actions, while `DBS-003` prefers issue/source/link typed tables. This is clear enough for a readiness/read contract, not for migration or writes. |
| UI interaction/reference confidence | 13/15 | Existing Research pages already provide issue/source/writing/graph interactions; external references confirm resource index/filter/readiness shape. |
| Risk/auth/public-output boundary clarity | 14/15 | Research is protected owner-only; no public output should be introduced. Existing Research actions lack `requireUser()` and owner-scoped service checks, so writes must stay blocked. |
| Acceptance and verification clarity | 8/10 | A static contract/checker plus docs/task memory can verify the next slice before runtime DB reads/writes. |

## Research Round 1 — Local PRD, Code, And Data Fit

Local evidence reviewed:

- `src/app/(dashboard)/research/page.tsx`, `issues/page.tsx`, `issues/[issueId]/page.tsx`, `sources/page.tsx`, `writing/page.tsx`, and `graph/page.tsx` show an operable UI for issues, sources, writing projects, and network graph, backed by `useResearch()`.
- `src/lib/context/research-context.tsx` loads and writes `pos_res_*` localStorage keys with mock fallbacks, so the current UI is not formal persisted data.
- `src/lib/actions/research-threads.ts`, `research-sources.ts`, and `research-writing.ts` already use Prisma models but accept caller-supplied `ownerId`/`threadId` and do not call `requireUser()` or service-layer authorization.
- `prisma/schema.prisma` includes `ResearchThread`, `ResearchSource`, `ResearchConcept`, `ResearchWritingProject`, sections, feedback runs, digests, and events.
- `DBS-003` decided a separate typed table plus explicit `research_links` model, while current Prisma schema is thread-first and does not yet expose the issue/source/link model used by the UI.
- `DBS-005` marks Research as UI/mock plus partial Prisma, with a stop condition before migration or writes if the `ResearchIssue` versus current thread model boundary remains ambiguous.

Selected pattern: implement `RESEARCH-OPS-001` as a protected formal readiness/read BFF contract first. It should report current mode, model mismatch, available resource families, future read DTO shape, auth boundary, write boundary, and next safe action without changing schema or writing data.

Rejected alternatives:

- Directly replace `useResearch()` localStorage with Prisma server actions. Rejected because current actions are not owner-authz safe and the UI issue model does not match the current thread-first Prisma model.
- Run a Research migration now. Rejected because model reconciliation and owner approval are not complete.
- Keep adding UI-only cards. Rejected because the Research interface is already operational enough; the maturity gap is formal data/readiness and auth boundary.

## Research Round 2 — External Resource Index And Filter Pattern

External references reviewed:

- Shopify Polaris index table recommends scannable resource lists with search, filtering, sorting, bulk actions, row actions, and pagination: https://shopify.dev/docs/api/app-home/patterns/compositions/index-table
- Shopify Polaris index filters define saved views, query/filter/sort controls, and view-management behavior: https://polaris-react.shopify.com/components/selection-and-input/index-filters
- Atlassian Dynamic Table documents a table pattern with built-in pagination, sorting, and reorder state: https://atlassian.design/components/dynamic-table
- GitHub Projects filtering documents field-based filters, command palette filtering, saved views, and AND/OR semantics: https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/filtering-projects

Selected pattern: Research formal mode should converge on a resource index/read DTO that supports issue/source/writing/concept families, search/filter/view metadata, readiness state, and blocked write actions. This fits `RES-002` without forcing a schema migration prematurely.

Rejected alternatives:

- Card-only Research lists. Rejected because mature operating surfaces need searchable, filterable, auditable resource indexes.
- Saved-view implementation in the next task. Rejected as too much scope until the protected read/readiness contract exists.
- Bulk Research writes. Rejected because current authz, audit, and model reconciliation are not ready.

## Research Round 3 — BFF, Auth, Risk, And Verification Boundary

Selected BFF shape:

- Server-only contract file: `src/lib/contracts/research-formal-readiness.contract.ts`.
- Optional server-only service in a follow-up: `src/lib/services/research-formal-readiness.service.ts`.
- Static checker: `scripts/check-research-formal-readiness.mjs`.
- Package script: `pnpm research:readiness:check`.
- No route handler, server action, schema change, migration, seed, DB connection, DB read, DB write, public output, provider call, or external agent registration in the first implementation slice.

Required boundary decisions:

- Future runtime read path must be `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> UI-safe DTO`.
- Existing server actions are not safe for formal use until they derive owner identity from `requireUser()` and check ownership before any read/write.
- Research graph/link writes must stay blocked until the canonical `ResearchIssue`/`ResearchThread` boundary is reconciled.
- Research AI-agent proposals remain protected owner-only and proposal-only; no external Research agent collaboration is allowed from this task.

## Executable Next Task

| Field | Value |
|---|---|
| Task ID | `RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF` |
| Mode | Contract/checker first, no runtime DB read/write |
| Scope | Add a server-only Research formal readiness/read contract that names Research resource families, current localStorage/mock state, partial Prisma state, model reconciliation gap, future BFF path, authz boundary, write boundary, UI display contract, and verification checks. |
| Acceptance | `pnpm research:readiness:check` verifies the contract, docs/task memory markers, no forbidden imports/secrets/runtime markers, no launch claim, and no write/migration enablement. `ACC-002` records the Research readiness acceptance. |
| Likely files | `src/lib/contracts/research-formal-readiness.contract.ts`, `scripts/check-research-formal-readiness.mjs`, `package.json`, `ACC-002`, task memory/docs, generated loop report. |
| Verification | `node --check scripts/check-research-formal-readiness.mjs`, `pnpm research:readiness:check`, `pnpm module:realdata:check`, `pnpm module:index:check`, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse, `git diff --check`. |
| Risks | Model mismatch between issue/source/link UI and current thread-first Prisma models; accidental formalization of localStorage state; write action exposure without `requireUser()`; public-output confusion. |
| Stop conditions | Stop before schema/migration, server action write, Prisma runtime read/write, source import runtime, public route/output, external collaboration, or broad UI redesign. |

## Acceptance Mapping

- `RES-001`: advances module operating surface and real-data/BFF maturity while proof blockers remain external.
- `RES-002`: applies the SaaS/OS operating surface standard to Research resource index, readiness state, BFF/API contract, and real/demo/mock labeling.
- `DBS-005`: follows the Research row's stop condition by choosing a protected read/readiness contract before migration or writes.
- `ACC-002`: adds `RESEARCH-OPS-001` acceptance criteria for the next implementation slice.

## Verification

Passed:

- `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-141-20260624-launch-preemption-router.json`
- `pnpm module:realdata:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-141-20260624-realdata-check.json`
- `pnpm module:index:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-141-20260624-module-index-check.json`
- `pnpm interface:smoke:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-141-20260624-interface-smoke-check.json`
- `pnpm db:validate`
- `pnpm exec tsc --noEmit --pretty false`
- JSON parse for updated loop state and generated loop 141 proof packets
- `git diff --check`

## Launch Decision

No launch level changed. This loop creates a Research maturity task, not formal auth/session, Work proof, or deployment evidence.

Next loop should run `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears, `WORK-009` if a safe proof target plus write confirmations appear, otherwise implement `RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF`.
