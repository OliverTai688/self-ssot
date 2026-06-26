# Loop 157 Research Post-Loader Gap Review

**Document ID:** `RPT-047`
**Date:** 2026-06-24
**Automation:** `personal-os-20m-aggressive-launch-loop`
**Selected task:** `LOOP-157-RESEARCH-POST-LOADER-GAP-REVIEW`
**Status:** Complete

---

## 1. Strategic Review

Formal launch remains `L0_LOCAL_PROTOTYPE`. Manual Ops remains `M1_MANUAL_OPS_READY`. Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

The loop 157 proof preemption router still cannot run `AUTH-005`, `WORK-009`, or `DEPLOY-002`: Supabase public env, signed-in `/auth/status` evidence, a safe Work proof target, Work write confirmations, and deployment marker evidence are still absent. The strongest safe move is therefore the due `RES-001` / `RES-002` research-to-task review after `RESEARCH-BFF-006`.

Last-three-loop delta:

| Loop | Delta |
|---|---|
| 154 | `RESEARCH-BFF-005` added a machine-checkable owner-read query-plan contract for all 11 Research DTO families. |
| 155 | Launch-level review kept formal launch at `L0`, Manual Ops at `M1`, and routed the no-proof fallback to `RESEARCH-BFF-006`. |
| 156 | `RESEARCH-BFF-006` surfaced query-plan loader rows through the protected Research readiness service/page while keeping adapter execution disabled. |

Repetition decision: this loop is a required third-loop research cadence. It is allowed because it creates one executable BFF/authz contract task and does not merely re-summarize launch blockers.

## 2. Understanding Score

The post-loader Research owner-read adapter/authz issue scores `92/100` High.

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 19/20 | Owner needs protected Research formal-read progress without exposing private research rows or enabling unsafe writes. |
| PRD/local evidence fit | 19/20 | `PRD-001`, `PRD-004`, `PRD-005`, `DBS-003`, `ACC-002`, and Research BFF reports align on owner-scoped Research reads. |
| Data/BFF/API clarity | 18/20 | Query plans, DTO states, mapper states, and service loader rows exist; the missing piece is adapter execution authorization. |
| UI/reference confidence | 14/15 | Protected `/research/readiness` already exposes the relevant status; the next slice is contract/checker, not page redesign. |
| Risk/auth/public-output clarity | 14/15 | `requireUser()`, no caller `ownerId`, no direct `threadId`, and no public output are explicit. |
| Acceptance/verification clarity | 8/10 | BFF-007 can be verified statically; runtime DB proof remains blocked by design. |

High understanding requires three same-issue research rounds. All three are complete below.

## 3. Research Rounds

### Round 1 - Local Code, Schema, And Action Fit

Current Prisma models support owner-scoped reads for `ResearchThread` directly through `ownerId`, and for child rows through parent relations such as `ResearchSource.thread.ownerId`, `ResearchConcept.thread.ownerId`, `ResearchWritingProject.thread.ownerId`, and writing/feedback/digest parent paths.

The existing Research server actions remain unsafe for formal runtime use because they accept caller-supplied `ownerId` or raw `threadId`, read global events/people, return raw Prisma-shaped payloads, and include write paths. They must not be promoted directly into the formal read path.

Selected pattern: create an adapter authz contract that decides per family whether adapter execution may ever be enabled, which owner predicate must pass first, and which families must remain unavailable or proposal-only.

Rejected patterns: direct reuse of current server actions; direct `threadId` reads; global event/person reads treated as owner data; raw Prisma payload passthrough.

### Round 2 - Framework And Data-Access Pattern

Official Next.js guidance favors server-side data access with a controlled data access layer, and official Prisma guidance supports selecting only needed fields and using relations deliberately. For this repo, that means adapter execution should sit behind service authorization and mapper boundaries, not inside Client Components or page-level ad hoc reads.

Selected pattern: `requireUser() -> service authz -> adapter decision -> owner-scoped query -> selected fields -> mapper -> UI-safe DTO`.

Rejected patterns: Client Component data fetching for formal Research rows; over-fetching private source text; hiding adapter errors behind mock fallback; enabling a route handler before the service contract is verified.

Source links:

- [Next.js Data Security](https://nextjs.org/docs/app/guides/data-security)
- [Next.js Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Prisma relation queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries)
- [Prisma select fields](https://www.prisma.io/docs/orm/prisma-client/queries/select-fields)

### Round 3 - Auth, NANDA, And Acceptance Boundary

`ARC-028` applies lightly because Research agent proposal rows are included. The Research agent surface remains protected-owner visible, proposal-only, non-registerable, and unable to final-write or collaborate externally.

Selected pattern: keep runtime DB reads disabled in BFF-007 while making adapter authz machine-checkable. The next runtime implementation can only use the contract if the checker proves every family has an authz decision, denied unsafe patterns, selected-field boundaries, and disabled public/external flags.

Rejected patterns: external-registerable Research agent capability; public Research API; agent final writes; external agent DB access; launch-level claim from a contract-only Research slice.

## 4. Gap Findings

| Gap | Decision | Next executable task |
|---|---|---|
| Service loader rows show plans, but no separate adapter execution authz contract exists. | Add a no-runtime adapter/authz contract and checker before any Prisma adapter implementation. | `RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT` |
| Events and people are global/transitional and lack direct owner scope. | Keep them blocked until owner-scope relation or privacy policy is approved. | BFF-007 denied family rows |
| Typed links and graph projections are not persisted. | Keep them derived/unavailable until link provenance and audit rules exist. | BFF-007 unavailable/projection rows |
| Research agent proposals are proposal-only. | Preserve protected-owner proposal-only state; no final write or external registration. | BFF-007 agent proposal row |
| Current server actions are unsafe for formal read. | Continue rejecting direct action reuse and raw payload passthrough. | BFF-007 rejected pattern list |

## 5. New Task Shape

`RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT` should add:

- `src/lib/contracts/research-owner-read-adapter-authz.contract.ts`
- `scripts/check-research-owner-read-adapter-authz.mjs`
- `pnpm research:read-adapter-authz:check`
- `ACC-002` acceptance criteria
- generated evidence
- backlog/current sprint/task memory updates

Acceptance:

- consumes BFF-005 query plans and BFF-006 loader boundary;
- derives owner identity from `requireUser()` only;
- refuses caller-supplied `ownerId`;
- refuses direct `threadId` without owner-scope authorization;
- records per-family adapter eligibility, denied state, and selected-field boundary;
- keeps runtime DB reads/writes, route handlers, server actions, schema/migration, public output, external collaboration, direct external agent DB access, Research agent final writes, external registration, and launch-level claims disabled;
- blocks events/people, typed links, graph projections, and agent proposals unless their explicit unavailable/proposal-only conditions hold.

Verification:

```bash
node --check scripts/check-research-owner-read-adapter-authz.mjs
pnpm research:read-adapter-authz:check
pnpm research:read-query-plan:check
pnpm research:read-dto:check
pnpm research:model:check
pnpm research:readiness:check
pnpm db:validate
pnpm exec tsc --noEmit --pretty false
git diff --check
```

## 6. NANDA Alignment

Affected surface: Research agent proposals.

Decision:

- governance/runtime status: protected-owner visible proposal-only;
- external registration: `externalRegisterable=false`;
- external collaboration: disabled;
- final writes: human approval required and still blocked;
- external agent DB access: disabled;
- concrete artifact: BFF-007 adapter/authz contract task and acceptance criteria.

## 7. Launch Decision

No launch level changes.

| Level family | Decision |
|---|---|
| Formal launch | stays `L0_LOCAL_PROTOTYPE` |
| Manual Ops | stays `M1_MANUAL_OPS_READY` |
| Conditional product maturity | stays `C3_ARCHITECTURE_GATE_READY` |

## 8. Final Decision

`LOOP-157-RESEARCH-POST-LOADER-GAP-REVIEW` is complete. The next loop should run `AUTH-005` if owner auth evidence appears, `WORK-009` if a safe Work proof target and confirmations appear, otherwise implement `RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT`.
