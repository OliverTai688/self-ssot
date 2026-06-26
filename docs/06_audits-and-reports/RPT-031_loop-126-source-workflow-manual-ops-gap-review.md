# RPT-031 Loop 126 Source Workflow Manual Ops Gap Review

Date: 2026-06-23

## Summary

Loop 126 completes the required `RES-001` / `RES-002` research-to-task checkpoint after loop 125. Formal launch remains `L0_LOCAL_PROTOTYPE`, Manual Ops remains `M1_MANUAL_OPS_READY`, and conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

The review does not claim launch progress from missing owner/operator evidence. It converts the current Source Workflow Manual Ops gap into one implementation-ready task: `DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE`.

## Strategic Review Gate

- Current target: shortest-path convergence toward `L1_PRIVATE_ONLINE_WORK_OS`, while continuing conditional L3 maturity only where it does not pretend owner-run evidence exists.
- Last three loop delta: loop 123 found the fixed proof-packet path gap; loop 124 implemented latest no-secret Source Workflow proof evidence resolution; loop 125 confirmed the resolver improves protected handoff but cannot upgrade launch level.
- Current blocker: `AUTH-005`, `WORK-009` or an approved Work proof fallback, and `DEPLOY-002` evidence remain absent. Source Workflow full runtime is also blocked by proof target/write confirmations, migration apply approval, identity/RLS/audit decisions, service DB runtime approval, connector activation approval, and owner cutover approval.
- Candidate task value: `LOOP-126` is the required research cadence, but it must create an executable product slice rather than repeat a status-only review.
- What becomes more true: loop 127 can implement the Source Workflow proof target handoff without re-researching the page requirement, risk boundary, or acceptance shape.

## Page Requirement Understanding Score

Task scored: `DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE`

| Dimension | Score |
|---|---:|
| Actor/job clarity | 18 / 20 |
| PRD/local evidence fit | 18 / 20 |
| Data/BFF/API clarity | 18 / 20 |
| UI interaction/reference-pattern confidence | 13 / 15 |
| Risk/auth/public-output/high-risk boundary clarity | 14 / 15 |
| Acceptance and verification clarity | 7 / 10 |
| Total | 88 / 100 |

Level: High. Required same-issue research rounds: 3. Completed in this review.

## Research Rounds

### Round 1 - Local PRD, acceptance, and code fit

Selected pattern: extend the existing server-only Source Workflow proof-bootstrap/readiness DTO and protected `/ai-input`, `/admin`, and `/settings` surfaces. The handoff should be derived from `latestEvidence`, `proofBootstrap`, existing cutover readiness, and existing Manual Ops proof commands.

Rejected alternatives:

- Start full `DATTR-024` runtime now. Rejected because proof target, migration apply approval, identity/RLS/audit, service DB runtime, connector runtime, and owner cutover are still blocked.
- Create a new public proof route. Rejected because proof target state may contain operational context and must remain protected owner/admin only.
- Add another passive evidence panel. Rejected because the current gap is owner-operable next actions, not another status display.

### Round 2 - Official source and risk lens

External source findings:

- Supabase RLS should protect exposed schemas, and service keys bypass RLS but must not be exposed to browsers or customers: https://supabase.com/docs/guides/database/postgres/row-level-security
- Prisma `migrate deploy` is the production deployment command, but production database URLs should be managed as CI/CD secrets and not used carelessly from local shells: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
- Next.js authentication guidance separates authentication, session management, and authorization, and recommends server-side data access boundaries for sensitive logic: https://nextjs.org/docs/app/guides/authentication

Selected pattern: a no-secret protected handoff, not a DB/action/runtime executor. It can name env var names, exact commands, evidence output paths, pass/fail signals, and stop conditions. It must not reveal target URLs, hosts, credentials, tokens, raw packet bodies, private source payloads, or row/profile IDs.

Rejected alternatives:

- Let the UI execute proof commands. Rejected because shell execution, DB writes, and proof-run state must remain owner/operator controlled.
- Render raw proof packet JSON. Rejected because no-secret summaries already exist and raw payloads are unnecessary.
- Promote migration/apply state from UI readiness. Rejected because Prisma/Supabase production state is still a Manual Ops approval boundary.

### Round 3 - Acceptance and verification lens

Selected pattern: add formal acceptance for loop 126 and DATTR-024Q, then implement DATTR-024Q in loop 127 as the next runtime/interface slice. Verification should reuse existing checkers first: `pnpm ai-input:proof-evidence:check`, `pnpm ai-input:proof-local:check`, `pnpm ai-input:ops-surface:check`, `pnpm ai-input:cutover-readiness:check`, `pnpm interface:smoke:check`, `pnpm db:validate`, and `pnpm exec tsc --noEmit --pretty false`.

Rejected alternatives:

- Spend another loop collecting adjacent blocked proof. Rejected because owner-run evidence can be collected by the owner with existing commands.
- Claim L1/L3/L4 from Manual Ops readiness. Rejected because formal launch proof remains absent.

## Implementation-Ready Task Shape

Task: `DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE`

Scope:

- Add a protected no-secret owner-operable proof target handoff for Source Workflow.
- Use the latest Source Workflow proof evidence resolver and local proof bootstrap state as the source of truth.
- Expose current missing prerequisites, exact owner actions, env var names, proof commands, evidence target paths, pass/fail signals, and stop conditions.
- Render the handoff in formal `/ai-input` and summarize the same contract in protected `/admin` and `/settings`.

Likely files:

- `src/types/ai-input-readiness.ts`
- `src/lib/services/ai-input-source-workflow-proof-bootstrap-readiness.service.ts`
- `src/lib/services/ai-input-readiness.service.ts`
- `src/lib/services/admin-readiness.service.ts`
- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `scripts/check-ai-input-source-workflow-ops-surface.mjs`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`

Acceptance:

- Protected `/ai-input`, `/admin`, and `/settings` expose the same no-secret Source Workflow proof target handoff contract.
- Handoff lists owner actions, env var names only, proof commands, generated evidence output paths, pass/fail signals, missing prerequisites, and stop conditions.
- Handoff uses `latestEvidence` and local proof bootstrap state instead of fixed historical packet paths.
- Handoff distinguishes owner-run/manual proof from runtime execution and does not claim launch-level progress.
- It must not execute proof commands, connect to DB, apply/promote migrations, write proof rows, activate connectors, call providers, reveal target URLs/hosts/secrets/raw packet bodies/private payloads/IDs, expand public output, allow external agent DB access, or register agents externally.

Verification:

- `pnpm launch:proof` -> expected blocked: missing Supabase public URL and publishable key.
- `pnpm auth:proof` -> expected blocked: missing Supabase public env and signed-in `/auth/status` evidence.
- `pnpm work:proof-target:check` -> expected `needs_operator_input`; `canRunWork009=false`.
- `pnpm ai-input:proof-evidence:check` -> passed.
- `pnpm ai-input:proof-local:check` -> passed.
- `pnpm ai-input:ops-surface:check` -> passed.
- `pnpm ai-input:cutover-readiness:check` -> passed.
- `pnpm interface:smoke:check` -> passed.
- `pnpm db:validate` -> passed.
- `pnpm exec tsc --noEmit --pretty false` -> passed.
- JSON parse for generated evidence and loop state -> passed.
- `git diff --check` -> passed.

## NANDA Agent Protocol Gate

Affected capability: AI Input Source Workflow proof/readiness surface.

AgentFacts-lite fields changed: none.

Classification: protected-owner/internal readiness and Manual Ops handoff only.

External registration: still `externalRegisterable=false`.

Concrete artifact from this review: this report, updated `ACC-002` acceptance rows, updated backlog/current sprint/task routing, generated loop evidence, and loop-state routing to `DATTR-024Q`.

Human approval remains required before external registration, public agent directories, external agent collaboration, connector runtime activation, production DB writes, migration apply, public output expansion, or high-risk final writes.

## Launch Decision

No launch-level upgrade.

- Formal launch: `L0_LOCAL_PROTOTYPE`
- Manual Ops: `M1_MANUAL_OPS_READY`
- Conditional product maturity: `C3_ARCHITECTURE_GATE_READY`
- Next formal level target: `L1_PRIVATE_ONLINE_WORK_OS`

## Next Decision

Loop 127 should run `DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE` unless `AUTH-005` or `WORK-009` proof prerequisites appear first.
