# Loop 168 Research Post Selected Field Adapter Gap Review

**Document ID:** `RPT-051`
**Date:** 2026-06-25
**Status:** Completed
**Task:** `LOOP-168-RESEARCH-POST-SELECTED-FIELD-ADAPTER-GAP-REVIEW`

---

## 1. Decision

Loop 168 is the required third-loop RES-001/RES-002 research-to-task cadence after `RESEARCH-BFF-013`.

`pnpm launch:preempt:check` still reports:

- `AUTH-005` blocked by missing Supabase public URL, publishable key, and signed-in `/auth/status` evidence.
- `WORK-009` blocked by missing `WORK_PROOF_DATABASE_URL` and write confirmations.
- `DEPLOY-002` blocked downstream by missing auth, Work proof, and deployment marker evidence.

Therefore this loop does not enable a live Research Prisma read, does not upgrade formal launch level, and does not claim L1/L3/L4.

The next highest-leverage task is `RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT`: a dry-run-first, owner-run, no-secret proof runner contract for the first live owner-scoped Research issues read. It should refuse execution unless owner identity, selected-field boundary, proof target classification, explicit live-read allow flag, and owner confirmation are all present.

## 2. Strategic Review

| Question | Answer |
|---|---|
| Current product target | Formal `L0_LOCAL_PROTOTYPE`, target next `L1_PRIVATE_ONLINE_WORK_OS`; Manual Ops `M1_MANUAL_OPS_READY`; conditional product maturity `C3_ARCHITECTURE_GATE_READY`. |
| Last three loop changes | Loop 165 refreshed launch level and routed BFF-012; loop 166 added protected `requireUser()` service-authz runtime proof; loop 167 added selected-field runtime adapter proof gate. |
| Current blocker | Owner/operator proof for Supabase auth, Work proof target, and deployment. Research live-read proof also needs an explicit safe owner-approved target. |
| Candidate task repetition check | This is a required research cadence, but it creates the next executable proof-runner contract instead of only summarizing readiness. |
| Acceptance / roadmap mapping | `RES-001`, `RES-002`, `RES-005`, `DBS-003`, `AUT-002`, `AUT-005`, `ARC-028`, `ACC-002`, and the Research BFF owner-read chain. |
| What becomes more true | The first live Research issues read has a narrow owner-run proof contract and stop conditions before implementation. |

## 3. Understanding Score

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 19/20 | The actor is the owner/operator proving one protected Research issues read, not a public user or external agent. |
| PRD/local evidence fit | 19/20 | PRD and acceptance docs prioritize real-data progression through BFF/auth/service boundaries. BFF-009 through BFF-013 define the exact chain. |
| Data/BFF/API clarity | 19/20 | The selected model, owner predicate, selected fields, relation counts, mapper, unavailable fallback, and disabled runtime flags are already machine-checkable. |
| UI interaction/reference confidence | 14/15 | The proof is surfaced through protected `/research/readiness`; next work is command/checker contract, not a new UI pattern. |
| Risk/auth/public-output clarity | 15/15 | Auth, proof target, no-public-output, no-external-agent-DB, no-registration, and no-launch-claim boundaries are explicit. |
| Acceptance/verification clarity | 10/10 | Verification can be a no-secret checker plus existing Research BFF chain, `db:validate`, `tsc`, JSON parse, and diff check. |
| **Total** | **96/100** | High understanding. Three same-issue research rounds are sufficient. |

## 4. Research Optimization Rounds

### Round 1 - Local PRD, Code, And Schema Fit

Selected pattern: keep the first live-read proof to the `issues` family through `ResearchThread.ownerId equals requireUser().profileId`, then select only scalar DTO fields plus `_count` for `sources`, `concepts`, and `writingProjects`.

Rejected alternatives:

- Expand to all Research families.
- Promote `ResearchThread` as the canonical long-term model.
- Add a schema migration before the thread/issue reconciliation decision is approved.
- Read by caller-supplied `ownerId` or direct `threadId`.

Requirement update: BFF-014 should create the proof-runner contract for one selected family only and must preserve the transitional Research model boundary in `DBS-003`.

### Round 2 - Official Framework And Provider Guidance

Selected pattern: follow a server-only Data Access Layer shape: `Server Component/readiness or command -> requireUser() -> service authorization -> selected-field Prisma read -> mapper/DTO -> no-secret proof packet`.

Sources:

- Next.js Data Security: https://nextjs.org/docs/app/guides/data-security
- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Prisma select fields: https://www.prisma.io/docs/orm/prisma-client/queries/select-fields
- Supabase Auth server-side Next.js guide: https://supabase.com/docs/guides/auth/server-side/nextjs

Interpretation: these sources support a server-only data access layer, authorization near data access, selected-field reads, and server-side auth/session handling before protected owner data reaches UI-safe DTOs.

Rejected alternatives:

- Client-side proof runner.
- Route handler or public endpoint for the first Research read proof.
- Passing raw Prisma rows or Profile identifiers to UI.
- Hidden use of environment variables or a valuable production dataset.

Requirement update: BFF-014 must be dry-run-first and no-secret by default, and any eventual live-read mode must require explicit allow/confirm flags.

### Round 3 - Auth, NANDA, Manual Ops, And Acceptance Boundary

Selected pattern: treat live Research read proof as owner-run evidence, not automation-held launch proof. The runner contract may be implemented without executing a live read, and the owner can later run it when the environment and target are ready.

Rejected alternatives:

- Claiming L1/L3/L4 from selected-field proof.
- Letting an internal Research agent or external agent execute the live read.
- Using Manual Ops as permission to skip AUTH-005, Work proof, deployment, or owner approval.
- Adding final Research agent writes or external registration.

Requirement update: BFF-014 must keep `externalRegisterable=false`, no public output, no final agent writes, no external agent database access, and no launch-level upgrade. Remaining live evidence should be owner-run with exact command, prerequisites, and pass/fail signals.

## 5. Executable Task Created

| Field | Task shape |
|---|---|
| Task ID | `RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT` |
| Scope | Add a no-secret, dry-run-first proof-runner contract/checker for the first owner-scoped live Research issues read. |
| Files likely affected | `src/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service.ts` or a sibling proof-runner service, `scripts/check-research-owner-read-issues-live-read-proof-runner.mjs`, `package.json`, protected `/research/readiness`, `ACC-002`, backlog/sprint/task memory, generated evidence. |
| Acceptance | The runner records owner identity source, proof target classification, explicit live-read allow flag, explicit owner confirmation, selected fields, `_count` relation keys, mapper output, disabled public/external/write/registration flags, and exact owner-run pass/fail criteria. |
| Verification | `node --check` for the new script, `pnpm research:read-issues-live-read-proof-runner:check`, BFF-013 through BFF-009 chain checks, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse, `git diff --check`. |
| Stop conditions | Stop before live Research Prisma read if AUTH-005 or explicit dev mock owner identity, safe proof target, allow flag, confirmation phrase, selected-field shape, mapper output, or no-secret evidence is missing. Stop before public output, route/action expansion, Research writes, external collaboration, external agent DB access, external registration, or launch-level claim. |

## 6. Launch And NANDA Decision

- Formal launch remains `L0_LOCAL_PROTOTYPE`.
- Manual Ops remains `M1_MANUAL_OPS_READY`.
- Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- Research agent scope remains protected-owner visible and proposal-only.
- External registration remains blocked: `externalRegisterable=false`.
- External agent database access remains blocked.

## 7. Owner-Run Handoff Boundary

When BFF-014 is implemented, the owner-run check should be explicit and inspectable. It must not become an automation loop prerequisite if the remaining evidence can be collected by the owner in one command.

Expected future command shape:

```bash
PERSONAL_OS_AUTH_MODE=mock \
PERSONAL_OS_DEV_USER_EMAIL=<owner-demo-email> \
PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ=1 \
PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM=I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA \
pnpm research:read-issues-live-read-proof-runner:check
```

The future command may also support Supabase mode after `AUTH-005` evidence exists. The generated proof must avoid printing secrets, cookies, tokens, raw claims, Profile ids, raw Prisma rows, private source bodies, or database URLs.

## 8. Final Status

Loop 168 completed the research-to-task review and routed loop 169 to `RESEARCH-BFF-014` unless `AUTH-005` or `WORK-009` prerequisites appear first.
