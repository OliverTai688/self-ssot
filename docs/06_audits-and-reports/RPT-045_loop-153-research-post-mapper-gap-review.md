# Loop 153 Research Post-Mapper Gap Review

## Summary

Loop 153 completed the required `RES-001` / `RES-002` research-to-task review after `RESEARCH-BFF-004`.

Formal launch remains `L0_LOCAL_PROTOTYPE`. Manual Ops remains `M1_MANUAL_OPS_READY`. Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

`pnpm launch:preempt:check` still routes away from `AUTH-005`, `WORK-009`, and `DEPLOY-002` because owner/operator proof prerequisites are absent. The highest-leverage no-proof Research gap is now the owner-read query-plan and adapter contract before any runtime Prisma read.

## Strategic Review

| Question | Answer |
|---|---|
| Current launch target | Formal `L0_LOCAL_PROTOTYPE`; target remains L1/L3/L4 after owner proof blockers. |
| Last three loops | Loop 150 launch review kept L0; loop 151 added Research owner-read authz skeleton; loop 152 added mapper/empty-state response DTO skeleton. |
| Blocking next milestone | `AUTH-005`, `WORK-009`, and `DEPLOY-002` remain owner/operator proof blocked. Research runtime reads are additionally blocked by missing owner-scoped query-plan and adapter boundary. |
| Candidate value | Required research cadence, but it produces an executable BFF contract/checker task rather than another status-only report. |
| Acceptance movement | Moves `RES-001`, `RES-002`, `ACC-002`, and the Research BFF path from mapper skeleton toward runtime-read readiness without enabling DB reads. |
| More true after this loop | The next Research slice is narrowed to a machine-checkable query plan contract that rejects caller `ownerId`, direct `threadId`, raw Prisma payloads, and agent final writes. |

## Page / API Requirement Understanding Score

Issue: Research owner-read query plan and adapter contract before runtime DB reads.

| Dimension | Score |
|---|---:|
| Actor/job clarity | 18 / 20 |
| PRD/local evidence fit | 19 / 20 |
| Data/BFF/API clarity | 18 / 20 |
| UI/reference-pattern confidence | 13 / 15 |
| Risk, auth, public-output, high-risk boundary clarity | 14 / 15 |
| Acceptance and verification clarity | 9 / 10 |
| Total | 91 / 100 |

Understanding level: High. Required same-issue research rounds: 3.

## Research Rounds

### Round 1 - Local Product, Schema, And Code Fit

Local state already has a clear sequence: `RESEARCH-OPS-001`, `RESEARCH-OPS-002`, `RESEARCH-MODEL-001`, `RESEARCH-BFF-001`, `RESEARCH-BFF-002`, `RESEARCH-BFF-003`, and `RESEARCH-BFF-004`. The remaining gap is not another UI status row; it is the query plan that will eventually sit between service authorization and mapper output.

Current Prisma models are partial and thread-first: `ResearchThread` owns sources, concepts, writing projects, feedback runs, and digests. `ResearchEvent` and `AcademicPerson` do not yet carry owner-scoped relations. Current Research server actions include unsafe formal patterns such as caller-supplied `ownerId`, `getResearchThreadById(id)` without owner predicate, source/concept reads by `threadId`, and global event/person reads. These are useful prototype actions, but they cannot become the formal owner-read path.

Selected local pattern: create a no-runtime query-plan contract that maps each DTO family to model candidates, owner predicates, relation/select boundaries, explicit unavailable states, and stop conditions before any Prisma client import or runtime loader is added.

Rejected local alternatives: promote existing server actions as formal reads, add direct runtime Prisma queries now, migrate schema in the same loop, or let Client Components receive raw model rows.

### Round 2 - Official Framework / ORM / Data-Security Reference

Official Next.js guidance supports keeping private data access and authorization on the server side, minimizing what crosses into Client Components, and using explicit auth/authz boundaries before data access. Official Prisma query guidance supports shaping reads through filters, relation traversal, and selected fields instead of passing broad records onward.

Selected implementation pattern: a contract/checker-only query plan should describe future `where` owner predicates, relation traversal, minimal selected fields, and DTO mapper inputs. It must not import Prisma, execute queries, expose env/provider data, or enable route handlers/server actions.

Rejected alternatives: direct page-level database reads without a service boundary, broad `include` payloads, thread-id-only lookups, or hidden mock fallback when formal rows are unavailable.

Primary references:

- Next.js Data Security: `https://nextjs.org/docs/app/guides/data-security`
- Next.js Authentication: `https://nextjs.org/docs/app/guides/authentication`
- Prisma Client query docs: `https://www.prisma.io/docs/orm/prisma-client/queries/crud`
- Prisma relation queries: `https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries`

### Round 3 - Auth, NANDA, Acceptance, And Stop Boundaries

Research agent proposal rows are still proposal-only and protected-owner visible. NANDA-style discovery/coordination can inform identity, capability, trust, and observability boundaries, but this repo must keep `externalRegisterable=false` because protected endpoint, auth scope, trust package, public-safety review, rollback, and human approval are not complete.

Selected protocol boundary: `RESEARCH-BFF-005` should include `agent-proposals` in the query plan only as a protected proposal DTO family. It should explicitly block final writes, external collaboration, external agent DB access, public output, and external registration.

Rejected protocol alternatives: external agent registration, public agent directory claims, cross-organization agent access to private Research rows, or autonomous Research final writes.

Primary references:

- Project NANDA: `https://github.com/projnanda`
- NANDA and A2A FAQ: `https://github.com/aidecentralized/nanda-servers/blob/main/NANDA%20%26%20A2A%20-%20Frequently%20Asked%20Questions%20(FAQ).md`

## Executable Artifact

New task: `RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT`.

Scope:

- Add a no-runtime `src/lib/contracts/research-owner-read-query-plan.contract.ts`.
- Map all 11 Research owner-read DTO families to transitional Prisma model candidates or explicit unavailable states.
- Define owner-scope predicate requirements for each family.
- Define minimal select/relation fields and mapper input labels.
- Name blocked patterns: caller-supplied `ownerId`, direct `threadId` reads, global event/person reads as formal owner data, raw Prisma payloads, route handlers, server action writes, schema changes, public output, external collaboration, and external registration.
- Add a checker, `pnpm research:read-query-plan:check`, that proves the contract exists and remains no-runtime/no-write/no-launch-claim.

Acceptance criteria:

- Contract exposes a stable task id and status for `RESEARCH-BFF-005`.
- It preserves the existing BFF path: `Server Component loader -> requireUser() -> Research service authorization -> approved adapter -> owner-scoped query -> mapper -> UI-safe DTO`.
- Every read family has a query-plan row, owner-scope rule, selected field boundary, mapper input state, unavailable/empty state, and audit ref label.
- Current unsafe action patterns are named as rejected, not reused as formal owner-read proof.
- Research agent proposal query plan remains protected-owner visible, proposal-only, non-registerable, and final-write blocked.
- No Prisma client import, DB call, route handler, server action write, migration, seed, provider runtime, public output, external collaboration, external agent DB access, external registration, or launch-level claim is added.

Likely files:

- `src/lib/contracts/research-owner-read-query-plan.contract.ts`
- `scripts/check-research-owner-read-query-plan.mjs`
- `package.json`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `tasks.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

Verification:

- `node --check scripts/check-research-owner-read-query-plan.mjs`
- `pnpm research:read-query-plan:check`
- `pnpm research:read-dto:check`
- `pnpm research:model:check`
- `pnpm research:readiness:check`
- `pnpm db:validate`
- `pnpm exec tsc --noEmit --pretty false`
- JSON parse
- `git diff --check`

## NANDA Alignment

Applies: Yes, lightly, because Research agent proposal DTOs are part of the owner-read surface.

Affected AgentFacts-lite fields: identity, lifecycle, capabilities, skills, auth, trust, observability, registry status.

State after this loop:

- Governance/documentation plus implementation-ready contract task only.
- Runtime agent unchanged.
- Protected owner-visible only.
- `externalRegisterable=false`.
- External collaboration, external agent DB access, public output, and final writes remain `HUMAN_APPROVAL_REQUIRED`.

## Final Decision

Loop 153 is complete. `LOOP-153-RESEARCH-GAP-REVIEW` should be marked done.

Loop 154 should run:

1. `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears.
2. `WORK-009` if a safe Work proof target plus exact write confirmations appear.
3. Otherwise `RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT`.

