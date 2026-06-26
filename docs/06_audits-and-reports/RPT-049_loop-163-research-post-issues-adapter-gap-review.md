# RPT-049 Loop 163 Research Post Issues Adapter Gap Review

Date: 2026-06-25

## Summary

Loop 163 ran the due `RES-001` / `RES-002` research-to-task review after `RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF`.

Formal launch remains `L0_LOCAL_PROTOTYPE`. `pnpm launch:preempt:check` still routes away from `AUTH-005`, `WORK-009`, and `DEPLOY-002` because the owner/operator evidence is absent. Manual Ops remains `M1_MANUAL_OPS_READY`, and conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

The highest-leverage next task is `RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE`: add a machine-checkable runtime read preflight contract for the selected `issues` adapter. It should prove the future read path, selected Prisma `select` shape, owner predicate, mapper boundary, and stop conditions without enabling a Prisma runtime read yet.

## Strategic Review

| Question | Answer |
|---|---|
| Current target | Keep converging toward `L1_PRIVATE_ONLINE_WORK_OS` and the broader `L3_FULL_FRONT_MEMBER_ADMIN_EXPERIENCE` target while formal launch proof is Manual Ops blocked. |
| Last three completed loops | Loop 160 ran launch/research review and routed BFF-009. Loop 161 selected the `issues` family and added the first proof-gated runtime adapter skeleton. Loop 162 added the server-only issues adapter interface and pure mapper proof. |
| Current blocker | Real launch upgrade still requires owner/operator evidence for Supabase public env and signed-in `/auth/status`, a safe Work proof target/write confirmations, and deployment marker proof. |
| Repeat risk | This review is cadence-required. The next loop should implement `RESEARCH-BFF-011` unless proof prerequisites appear. |
| Capability moved | Research owner-read is now ready to move from mapper proof to a runtime-readiness preflight gate. |
| More true after this loop | The repo has a concrete next runtime-adjacent Research BFF task with acceptance, verification, risks, and stop conditions. |

## Source Basis

### Local Sources

- `AGENTS.md`
- `docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md`
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-162-20260625-research-issues-adapter-interface-and-mapper-proof.md`
- `src/lib/services/research-owner-read-issues-adapter.service.ts`
- `src/lib/services/research-owner-read-dto.service.ts`
- `src/lib/contracts/research-owner-read-adapter-runtime.contract.ts`
- `src/lib/contracts/research-owner-read-adapter-authz.contract.ts`
- `prisma/schema.prisma`
- `src/lib/services/auth.service.ts`

### External / Primary Sources

- [Next.js Data Security guide](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Server and Client Components guide](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Prisma Client select fields docs](https://www.prisma.io/docs/orm/prisma-client/queries/select-fields)
- [Prisma relation queries docs](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries)
- [Supabase Next.js server-side auth guide](https://supabase.com/docs/guides/auth/server-side/nextjs)

## Requirement Understanding Score

Page / workflow issue: Research owner-read issues runtime readiness gate.

Score: 93 / 100, High.

| Dimension | Score | Rationale |
|---|---:|---|
| Actor/job clarity | 19 / 20 | Protected owner needs the first Research formal read path to become inspectable before actual DB reads. |
| PRD/local evidence fit | 20 / 20 | `RES-001`, `RES-002`, `DBS-003`, `ACC-002`, and BFF-009/BFF-010 all point to the same next gap. |
| Data/BFF/API clarity | 18 / 20 | `ResearchThread.ownerId` and mapper proof are clear; the exact runtime preflight contract still needs to be made executable. |
| UI/reference confidence | 14 / 15 | `/research/readiness` already hosts the proof chain and can surface the preflight gate. |
| Risk/auth/public-output clarity | 14 / 15 | Owner identity, selected fields, no public output, no external collaboration, and no final writes are clear. The only ambiguity is when owner evidence becomes available. |
| Acceptance/verification clarity | 8 / 10 | Checker chain is strong; `RESEARCH-BFF-011` must define a dedicated preflight checker before any runtime DB read proof. |

Required research rounds for High level: 3.

## Same-Issue Research Rounds

### Round 1: Local Product / Code / Schema Fit

Findings:

- `RESEARCH-BFF-009` selected `issues` because `ResearchThread.ownerId equals requireUser().profileId` is the direct owner-scope path.
- `RESEARCH-BFF-010` defines the authorized selected-field row and `ui_safe_research_issue_read_dto` mapper.
- `ResearchThread` has the required owner relation, selected scalar fields, and child relation counts for sources, concepts, and writing projects.
- `requireUser()` exists, but the current Research owner-read service still documents the auth boundary rather than calling it for runtime Research reads.

Selected pattern:

- Next slice should define a server-only runtime-readiness preflight gate, not the read itself.
- The gate should name the future adapter signature, future Prisma selected fields, owner predicate, stable sort, default limit, mapper handoff, and unavailable state.

Rejected alternatives:

- Direct Prisma `findMany` now. Rejected because `AUTH-005` and safe proof target evidence are still absent.
- Use existing unsafe Research server actions. Rejected because current Research actions still include caller-supplied or thread-id-shaped paths that the BFF chain has not approved.

### Round 2: Framework / Provider / Data-Access Pattern

Findings:

- Next.js Server Components support fetching data on the server, but Next.js data-security guidance favors a server-only Data Access Layer that performs authorization and returns minimal DTOs.
- Prisma Client supports selecting only required fields and relation counts, which fits the existing `ResearchThread` selected-field contract and BFF-010 mapper proof.
- Supabase Next.js server-side auth guidance reinforces resolving auth on the server side before protected data access.

Selected pattern:

- `RESEARCH-BFF-011` should encode the future DAL path as `Server Component loader -> requireUser() -> service authorization -> Prisma selected-field adapter -> mapper -> UI-safe DTO`.
- It should keep `runtimeDbReadEnabled=false` until owner identity proof and proof-target criteria are present.

Rejected alternatives:

- Client Component Prisma import or client-side auth-only gating. Rejected by Next.js DAL/security guidance and repo rules.
- API route first. Rejected because the immediate need is protected owner page read readiness, not public or external HTTP.

### Round 3: Auth / Acceptance / NANDA Boundary

Findings:

- `ARC-028` keeps Research agent surfaces protected-owner visible and proposal-only.
- External registration and external agent database access remain disallowed.
- `ACC-002` requires any Research owner-read runtime progression to remain selected-field-only, owner-scoped, mapper-mediated, protected-owner visible, and no public output.

Selected pattern:

- Add `RESEARCH-BFF-011` as a no-runtime-read readiness gate with a checker. It should validate: no Prisma runtime import in the new contract/checker slice, no DB connection, no route handler, no server action write, no public output, no external collaboration, no launch claim, `externalRegisterable=false`, and next task routing.

Rejected alternatives:

- Broad 11-family runtime enablement. Rejected because the direct `issues` path must be proven first.
- Agent proposal final-write path. Rejected because Research agent outputs remain proposal-only and human-approval gated.
- External NANDA/A2A/MCP collaboration. Rejected until endpoint, auth scopes, trust, rollback, public-safety review, deployment proof, and human approval exist.

## Decision

Create and route to `RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE`.

This is the shortest safe path because it:

- advances toward a real Research owner-read BFF;
- avoids waiting on owner/operator launch proof;
- avoids opening a runtime DB read prematurely;
- preserves the BFF-first and DAL-first architecture;
- gives the next implementation loop a concrete contract/checker target.

## Executable Next Task

| Field | Value |
|---|---|
| Task id | `RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE` |
| Scope | Add a server-only runtime-readiness contract and checker for the selected `issues` adapter path. |
| Likely files | `src/lib/contracts/research-owner-read-issues-runtime-readiness.contract.ts`, `src/lib/services/research-owner-read-dto.service.ts`, protected `/research/readiness`, `scripts/check-research-owner-read-issues-runtime-readiness.mjs`, `package.json`, `ACC-002`, `PLN-060`, `PLN-061`, `tasks.md`, generated evidence. |
| Acceptance | Contract records the future read path, `requireUser().profileId`, `ResearchThread.ownerId` predicate, selected fields, `_count` relation counts, stable sort, limit, mapper handoff, unavailable fallback, disabled runtime flags, NANDA boundary, and next stop conditions. |
| Verification | `node --check scripts/check-research-owner-read-issues-runtime-readiness.mjs`, `pnpm research:read-issues-runtime-readiness:check`, BFF-010/BFF-009 chain checks, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse, `git diff --check`. |
| Stop conditions | Stop before Prisma runtime read, DB connection, schema/migration change, seed change, route handler, server action, public output, external collaboration, external agent DB access, external registration, or launch-level claim. |

## Launch Decision

| Level | Decision | Reason |
|---|---|---|
| `L0_LOCAL_PROTOTYPE` | Keep | Real auth/Profile, Work proof, and deployment proof remain absent. |
| `M1_MANUAL_OPS_READY` | Keep | Manual Ops can track owner/operator proof steps without claiming formal L1. |
| `C3_ARCHITECTURE_GATE_READY` | Keep | Interface/scenario/architecture and backend/agent proof surfaces remain mature, but owner UI review and launch proof remain outside this loop. |
| `L1_PRIVATE_ONLINE_WORK_OS` | Do not upgrade | `AUTH-005`, Work proof, and deployment marker remain incomplete. |
| `L3_FULL_FRONT_MEMBER_ADMIN_EXPERIENCE` | Do not upgrade formally | Conditional product maturity exists, but formal evidence gates remain blocked. |
| `L4_HARDENED_PRIVATE_LAUNCH` | Do not upgrade | Hardened launch requires owner-run auth, Work, deployment, and route proof. |

## NANDA / Agent Protocol

Applies because Research agent proposal boundaries and future agent-operated Research read surfaces are part of this module.

- Affected surface: Research agent proposals and future Research owner-read BFF.
- Runtime agent changed: no.
- Internal discovery: protected-owner readiness only.
- External registration: `externalRegisterable=false`.
- Trust boundary: no public endpoint, no external collaboration, no external agent database access, no final write, no provider call, no external registration.
- Concrete artifact: this report plus `RESEARCH-BFF-011` backlog and acceptance shape.

## Final Decision

`LOOP-163-RESEARCH-POST-ISSUES-ADAPTER-GAP-REVIEW` is complete.

Next loop should run:

1. `AUTH-005` if Supabase public env plus signed-in `/auth/status` evidence appears.
2. `WORK-009` if a safe Work proof target and exact write confirmations appear.
3. Otherwise `RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE`.
