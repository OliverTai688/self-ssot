# RPT-037 Loop 135 Launch-Level Review

Date: 2026-06-23

## Decision

Loop 135 completed the required fifth-loop launch-level review and the due RES-001/RES-002 research-to-task review.

Formal launch remains `L0_LOCAL_PROTOTYPE`.

Conditional Manual Ops remains `M1_MANUAL_OPS_READY`.

Conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

Do not upgrade formal L1/L3/L4 until the proof chain has fresh successful evidence for `AUTH-005`, `WORK-009` or approved `WORK-007`, and `DEPLOY-002`.

## Strategic Review Gate

- Current target: shortest-path convergence to `L1_PRIVATE_ONLINE_WORK_OS`, while keeping conditional L3 product maturity moving through interface, scenario, and architecture viewframes.
- Last three loops: loop 132 added proof preemption routing, loop 133 added an owner-run proof plan, and loop 134 added current-loop proof freshness gating.
- Current blocker: owner/operator prerequisites, not missing adjacent proof scripts. Supabase public env plus signed-in `/auth/status`, Work proof target/write confirmations, and deployment marker proof are still absent.
- Candidate task value: this review refreshed the proof chain, corrected the launch history proof-family resolver, and converted the next non-proof runtime gap into `WORK-015-WORK-DETAIL-ADJUNCT-MOCK-GATE`.
- More true after this loop: current-loop launch/auth/Work/preemption/owner-plan packets are fresh, launch history now resolves exact proof families, and the next loop has a user-visible Work detail boundary task instead of another proof-only waitpoint.

## Proof Chain

- `pnpm launch:freshness:check` first reported `proof_refresh_required`, then passed as `ready_for_fresh_proof_routing` after the ordered refresh.
- `pnpm launch:proof` stayed `blocked` because Supabase public URL and publishable key are missing.
- `pnpm auth:proof` stayed `blocked` because Supabase public env and signed-in `/auth/status` evidence are missing.
- `pnpm work:proof-target:check` stayed `needs_operator_input` because `WORK_PROOF_DATABASE_URL`, write allow, and the exact confirmation phrase are absent.
- `pnpm launch:preempt:check` returned `RES-001-RESEARCH-REVIEW`, with no proof task ready.
- `pnpm launch:owner-plan:check` returned `ready_for_owner_proof_plan` with `readyProofTasks: []`.

## Launch Level

Top no-upgrade reasons:

| Gap | Severity | Leverage | Current routing |
|---|---:|---:|---|
| Supabase public env and signed-in `/auth/status` evidence | Critical | P0 | Owner/operator Manual Ops; then `AUTH-005` |
| Work proof target and write confirmations | Critical | P0 | Owner/operator Manual Ops; then `WORK-009` |
| Deployment marker/private online proof | High | P0 | Downstream of auth and Work proof; then `DEPLOY-002` |
| Work detail formal-vs-adjunct mock boundary | Medium | P0 | `WORK-015` next no-proof implementation fallback |
| AI Input formal persistence cutover approvals | High | P1 | Manual approval and proof-target path before full `DATTR-024` |

Manual Ops can continue: `pnpm launch:manual-ops` reports `manual_ops_ready`, so the remaining owner/operator setup is tracked instead of hidden. This does not upgrade formal launch.

## Combined Research-To-Task Review

Selected next issue: Work detail currently has formal DB-backed CRUD paths, but `pnpm work:source:check` still warns that AI pulse/timeline mock adapter data is read on the Work detail page. That is acceptable as adjunct AI prototype data, but it must not look like formal persisted Work proof.

Understanding score for `WORK-015`: 84/100 High.

- Actor/job clarity: 18/20. Owner needs to operate Work detail and trust what is real.
- PRD/local evidence fit: 17/20. PRD and ACC require real/demo/mock state clarity; `work:source:check` found the specific warning.
- Data/BFF/API clarity: 17/20. Formal Work CRUD is DB-backed; AI pulse/timeline remains adjunct/mock.
- UI interaction/reference confidence: 12/15. Existing Work detail pattern can be refined without redesign.
- Risk/auth/public-output clarity: 12/15. Protected route only; no new writes or public output.
- Acceptance/verification clarity: 8/10. `work:source:check`, `interface:smoke:check`, typecheck, and DB validate are enough for the slice.

Three same-issue research rounds:

1. Local proof/code lens: keep DB-backed Work CRUD primary and demote adjunct AI pulse/timeline to explicitly mock/unavailable/prototype state.
2. RES-002 operating-surface lens: detail surfaces must make real/demo/mock/unavailable state obvious and should not mix records, agent proposals, and proof state without boundaries.
3. Risk/verification lens: no DB writes, no schema changes, no provider calls, and no launch proof claim; success is a clearer protected UI boundary plus checker evidence.

Rejected alternatives:

- Replace the AI pulse/timeline mock data with real AI persistence now. Rejected because it expands into provider/runtime/persistence work.
- Remove the panels entirely. Rejected because the Work detail actor journey still benefits from seeing the future agent/timeline lane.
- Spend another loop only on proof gathering. Rejected because the remaining proof can be owner-run and the next highest leverage is visible Work experience quality.

## Implementation Delta

During the review, `pnpm launch:history:check` exposed a resolver bug: filename matching treated `launch-proof-freshness-gate.json` as if it were the formal `launch-proof.json` family.

The resolver now uses exact proof-family filename matching for:

- `*-launch-proof.json`
- `*-auth-proof.json`
- `*-work-proof-target-readiness.json`

This was applied in both the script checker and the admin readiness service, so meta-check packets no longer contaminate launch readiness history.

## Verification

Passed:

- `pnpm launch:freshness:check`
- `pnpm launch:proof`
- `pnpm auth:proof`
- `pnpm work:proof-target:check`
- `pnpm launch:preempt:check`
- `pnpm launch:owner-plan:check`
- `pnpm launch:manual-ops`
- `pnpm l3:interface:check`
- `pnpm l3:scenario:check`
- `pnpm l3:architecture:check`
- `pnpm interface:smoke:check`
- `pnpm launch:actions:check`
- `pnpm launch:history:check`
- `pnpm owner:evidence:check`
- `pnpm backend:ops:check`
- `pnpm module:index:check`
- `pnpm module:realdata:check`
- `pnpm agent:registry:check`
- `pnpm agent:api:check`
- `pnpm agent:commands:check`
- `pnpm agent:bus:check`
- `pnpm agent:command-center:check`
- `pnpm ai-input:ops-surface:check`
- `pnpm ai-input:proof-evidence:check`
- `pnpm ai-input:cutover-readiness:check`
- `pnpm work:proof-evidence:check`
- `pnpm work:source:check`
- `node --check scripts/check-launch-readiness-history.mjs`

Final type/DB/diff verification is recorded in the generated loop report.

## Sources

- Supabase SSR auth source: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Vercel environment CLI source: https://vercel.com/docs/cli/env

## Next Routing

Loop 136 should run `AUTH-005` immediately if Supabase public env plus signed-in `/auth/status` evidence appears.

If a safe Work proof target and write confirmations appear, run `WORK-009`.

Otherwise implement `WORK-015-WORK-DETAIL-ADJUNCT-MOCK-GATE`, because this is the highest-leverage no-proof user-visible gap after several proof/evidence-heavy loops.
