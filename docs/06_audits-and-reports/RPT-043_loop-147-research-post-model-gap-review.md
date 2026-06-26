# RPT-043 Loop 147 Research Post-Model Gap Review

## Summary

Loop 147 completed the due `RES-001` / `RES-002` research-to-task review after `RESEARCH-MODEL-001`. Proof preemption still routes away from `AUTH-005`, `WORK-009`, and `DEPLOY-002`, so the highest-leverage no-proof task is the next Research BFF boundary: `RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT`.

No runtime code, route handler, server action, Prisma schema change, migration, seed, DB read/write, public output, external collaboration, external registration, or launch-level claim was added.

## Strategic Review Gate

- Current product target: continue post-30 convergence toward a complete private online operating experience while formal launch remains `L0_LOCAL_PROTOTYPE`.
- Current level state: formal `L0_LOCAL_PROTOTYPE`, Manual Ops `M1_MANUAL_OPS_READY`, conditional product maturity `C3_ARCHITECTURE_GATE_READY`.
- Last three completed loops: loop 144 converted the Research model gap into `RESEARCH-MODEL-001`; loop 145 refreshed launch proof and routed to model reconciliation; loop 146 implemented the model reconciliation contract/checker.
- Current blocker: owner/operator evidence still blocks formal launch proof; within Research, the remaining blocker before any formal read surface is the owner-scoped read DTO and service authorization boundary.
- Selected task: `LOOP-147-RESEARCH-GAP-REVIEW`.
- Product delta: the next Research BFF task is now implementation-ready rather than an open architecture note.
- More true after this loop: `RESEARCH-BFF-001` has a scored requirement, three research rounds, acceptance criteria, likely files, verification, risks, and stop conditions.

## Proof Preemption

`pnpm launch:preempt:check` generated `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-147-20260624-launch-preemption-router.json` and recommends `RES-001-RESEARCH-REVIEW`.

Blocked proof candidates:

- `AUTH-005`: missing Supabase public URL, Supabase publishable key, and signed-in `/auth/status` evidence.
- `WORK-009`: missing safe proof target and explicit write confirmations.
- `DEPLOY-002`: downstream of auth and Work proof, with deployment marker missing.

Manual Ops remains `manual_ops_ready`, but formal launch is unchanged.

## Page Requirement Understanding Score

Target page/task issue: Research owner-scoped read DTO contract before formal Research runtime reads.

Score: 89/100 - High.

| Dimension | Score | Notes |
|---|---:|---|
| Actor/job clarity | 18/20 | Owner needs protected Research records to become formal without leaking private research context. |
| PRD/local evidence fit | 18/20 | `PRD-001`, `PRD-004`, `PRD-005`, `RES-001`, `RES-002`, `ACC-001`, and `RESEARCH-MODEL-001` align on Research network maturity. |
| Data/BFF/API clarity | 18/20 | The model reconciliation contract names the future BFF path; the missing artifact is the concrete read DTO boundary. |
| UI/reference-pattern confidence | 13/15 | Existing `/research/readiness` and Research hub patterns already show formal readiness and resource family surfaces. |
| Risk/auth/public-output clarity | 14/15 | `requireUser()` and service authorization are clear; public output and external collaboration remain blocked. |
| Acceptance and verification clarity | 8/10 | Contract/checker scope is clear; runtime DB proof remains deliberately out of scope. |

High score requires three same-issue research optimization rounds. All three were completed before task conversion.

## Research Rounds

### Round 1 - Local Product, Schema, and Code Fit

Sources inspected:

- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `src/types/research.ts`
- `prisma/schema.prisma`
- `src/lib/contracts/research-formal-readiness.contract.ts`
- `src/lib/contracts/research-model-reconciliation.contract.ts`
- `src/lib/services/research-formal-readiness.service.ts`
- `src/lib/actions/research-threads.ts`
- `src/lib/actions/research-sources.ts`
- `src/lib/actions/research-writing.ts`

Finding: Research UI/types already describe an object network, while current Prisma models remain partial thread-first state. Loop 146 made this explicit, but the next implementation still needs a DTO contract that prevents caller-supplied `ownerId` / `threadId` paths from becoming formal BFF reads.

Selected pattern: contract-only owner-scoped read DTO before runtime read implementation.

Rejected alternatives: using current Research server actions as formal BFF, treating `ResearchThread` as the final parent model, or moving straight to runtime DB reads.

### Round 2 - Next.js 16 BFF, Data Access, and Security Lens

Official local docs inspected under `node_modules/next/dist/docs/`:

- `01-app/02-guides/backend-for-frontend.md`
- `01-app/02-guides/data-security.md`
- `01-app/01-getting-started/06-fetching-data.md`
- `01-app/02-guides/authentication.md`

Finding: Next.js 16 supports public Route Handlers, but the data security guide recommends a server-only Data Access Layer for new projects: perform authorization checks and return minimal DTOs. This matches the repo BFF-first rule better than exposing a route handler or passing raw Prisma rows into Client Components.

Selected pattern: future Server Component loader calls `requireUser()`, then a server-only Research service authorizes ownership and maps approved adapter results to UI-safe DTOs.

Rejected alternatives: new public route handler, component-level raw ORM reads, direct Prisma imports in client code, or broad HTTP API before owner-only read semantics are stable.

### Round 3 - Auth, NANDA, Public Output, and Acceptance Lens

Sources inspected:

- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `src/lib/services/auth.service.ts`
- `src/lib/services/project.service.ts`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- Last three loop reports: loops 144, 145, and 146.

Finding: `requireUser()` is the identity boundary, and project services show the desired pattern of owner authorization before detail access. Research must mirror that pattern, but with Research-specific DTO families and proposal-only agent boundaries. Research agents may suggest or review, but final writes and external registration remain blocked.

Selected pattern: `RESEARCH-BFF-001` creates a machine-checkable contract and checker with no runtime DB access, no provider calls, and `externalRegisterable: false`.

Rejected alternatives: Research agent final writes, direct external agent DB access, public Research output, schema migration in the same slice, or launch-level upgrade from contract evidence.

## Implementation-Ready Task Shape

Task: `RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT`

Scope:

- Add `src/lib/contracts/research-owner-read-dto.contract.ts` or equivalent.
- Add `scripts/check-research-owner-read-dto.mjs`.
- Add `pnpm research:read-dto:check`.
- Update `ACC-002`, backlog, sprint, tasks, completed log, and generated evidence.

Contract must define:

- Protected owner-only read posture.
- Future path: `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> mapper -> UI-safe DTO -> Client Component interaction`.
- Resource read DTO families for issues, sources, concepts, writing projects, writing sections, events, people, links, graph projections, readiness evidence, and Research agent proposals.
- Authorization invariants: owner identity derived from `requireUser()`, no caller-supplied `ownerId`, no direct `threadId` access without owner authorization, no raw Prisma models, and no external agent DB access.
- Empty/readiness states: no Research rows, model-ready-but-read-unavailable, partial transitional data, and formal-read-disabled states.
- NANDA boundary: Research agent proposals remain protected-owner visible, proposal-only, and `externalRegisterable: false`.

Acceptance:

- The checker validates required contract markers, docs/task-memory markers, no forbidden runtime imports, no true safety flags, and no launch-level claims.
- Existing `pnpm research:model:check` and `pnpm research:readiness:check` continue to pass.
- `pnpm db:validate` and `pnpm exec tsc --noEmit --pretty false` continue to pass if the contract is TypeScript.

Stop conditions:

- Stop before Prisma schema change, migration/apply, seed change, route handler, server action, runtime DB read/write, public output, external collaboration, Research agent final write, direct external agent DB access, external registration, or launch-level claims.
- Stop for direction if the contract reveals ambiguous owner scoping, sharing semantics, public output, or schema changes.

## NANDA Alignment

- Affected agent surface: Research agent proposals.
- AgentFacts-lite posture: protected owner-visible proposal-only.
- Runtime agent changed: false.
- External registration: `externalRegisterable: false`.
- Human approval remains required for external agent collaboration, public output, final writes, endpoint exposure, registry submission, or scoped context sharing.

## Launch-Level Decision

- Formal launch remains `L0_LOCAL_PROTOTYPE`.
- Manual Ops remains `M1_MANUAL_OPS_READY`.
- Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- No `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 claim was made.

## Verification

Verification to run for this loop:

- `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-147-20260624-launch-preemption-router.json`
- `pnpm research:model:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-147-20260624-research-model-check.json`
- `pnpm research:readiness:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-147-20260624-research-readiness-check.json`
- JSON parse for loop state and generated packets.
- `pnpm db:validate`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Next Task

Run `AUTH-005` if Supabase/session evidence appears, `WORK-009` if a safe proof target plus confirmations appear, otherwise implement `RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT`.
