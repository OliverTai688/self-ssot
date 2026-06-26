# Loop 138 Work Client Share Review Gap

**Document ID:** `RPT-038`  
**Date:** 2026-06-23  
**Loop:** 138  
**Task:** `LOOP-138-RESEARCH-GAP-REVIEW`  
**Status:** Complete  

## Decision

Loop 138 ran the required `RES-001` / `RES-002` research-to-task gap review because `pnpm launch:preempt:check` selected the research fallback. `AUTH-005`, `WORK-009`, and `DEPLOY-002` still require owner/operator proof inputs, so formal launch remains `L0_LOCAL_PROTOTYPE`. Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

The highest-leverage gap after loops 136 and 137 is the Work detail Client tab's pre-share owner decision path. The UI now separates formal Work data, adjunct AI prototype data, Client Portal publishing, and AI client-update drafts. The remaining gap is that the owner still lacks one review checklist that answers: what is safe to share, what is only draft/proposal, what is blocked, and what exact next action is allowed before copying or publishing a client link.

## Strategic Review Gate

- Current primary product target: shortest-path movement toward a complete owner-operable experience while formal L1/L3/L4 proof remains blocked by owner/operator setup.
- Last three completed loops: loop 135 refreshed launch proof and selected Work detail boundaries; loop 136 separated adjunct AI mock data from formal Work CRUD; loop 137 separated Client Portal publish state from AI client draft output.
- Current blocker: no Supabase public env and signed-in `/auth/status` evidence for `AUTH-005`; no safe Work proof target/write confirmations for `WORK-009`; no deployment marker proof for `DEPLOY-002`.
- Candidate task quality: not another proof refresh. The selected gap improves the Work / Client Portal actor journey by turning existing boundaries into an owner review decision surface.
- Capability moved: protected Work detail Client tab can mature from "boundary labels" to "review checklist / next action" without public-output expansion.
- What becomes more true next loop: the owner can inspect a single protected pre-share checklist before considering Client Portal sharing.

## Proof Preemption

`pnpm launch:preempt:check` produced:

- `AUTH-005`: blocked by missing Supabase public URL, publishable key, and signed-in auth status evidence.
- `WORK-009`: blocked by missing `WORK_PROOF_DATABASE_URL`, write allow flag, and confirmation phrase.
- `DEPLOY-002`: blocked downstream of auth and Work proof plus deployment marker.
- `RES-001-RESEARCH-REVIEW`: ready fallback.

No launch-level upgrade is claimed from this review.

## Research-To-Task Gap Review

### Local Evidence

- `PRD-004` and `PRD-005` keep Work as the first operational DB-backed module and require client-facing output to remain explicitly bounded.
- `ARC-025`, `DBS-004`, and `AUT-004` require token-only public output to stay fail-closed until token lifecycle, storage/file URL, and audit boundaries are approved.
- Loop 136 introduced `WORK-015-ADJUNCT-MOCK-GATE` and `WORK-015-FORMAL-CRUD-ONLY`.
- Loop 137 introduced `WORK-016-CLIENT-PORTAL-PUBLISH-GATE`, `WORK-016-SHARE-LINK-INTERNAL-GATE`, and `WORK-016-CLIENT-DRAFT-PROPOSAL-ONLY`.
- `src/app/(dashboard)/work/[projectId]/project-detail-client.tsx` already has the protected Client tab surface where a checklist can be added without new routes or persistence.

### External Reference Lens

The selected pattern is not copied from a single product. It combines mature operating-product conventions:

- Shopify Polaris resource lists emphasize resource operations and bulk/action patterns for objects: [Shopify Polaris Resource list](https://polaris-react.shopify.com/components/lists/resource-list).
- Shopify empty-state guidance treats missing data as a prompt for progress and next action rather than decorative blank space: [Shopify Polaris Empty state](https://polaris-react.shopify.com/components/layout-and-structure/empty-state).
- Atlassian Dynamic Table guidance points toward sortable, paginated, stateful operational lists when rows need repeated review: [Atlassian Dynamic table](https://atlassian.design/components/dynamic-table).
- GitHub audit log docs reinforce owner-visible auditability and exportable event review for sensitive organizational activity: [GitHub Docs audit log export](https://docs.github.com/en/enterprise-cloud%40latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/exporting-audit-log-activity-for-your-enterprise).

For this repo, the integrated approach is a protected owner checklist inside Work detail, not a public portal change, a generic table-only UI, or a token lifecycle implementation.

## Page Requirement Understanding Score

Target page issue: `WORK-017-WORK-DETAIL-CLIENT-PUBLISH-REVIEW-CHECKLIST`

| Dimension | Score |
|---|---:|
| Actor/job clarity | 19 / 20 |
| PRD/local evidence fit | 19 / 20 |
| Data/BFF/API clarity | 17 / 20 |
| UI interaction/reference-pattern confidence | 14 / 15 |
| Risk/auth/public-output boundary clarity | 14 / 15 |
| Acceptance and verification clarity | 9 / 10 |
| **Total** | **92 / 100 High** |

Because the score is High, three same-issue research rounds are sufficient before implementation.

### Round 1: Local PRD And Code Fit

Selected: add the checklist to the existing protected Work detail Client tab and derive rows from already-loaded `project`, `clientTasks`, `clientDeliverables`, `publicOutput`, and existing launch/publish boundary state.  
Rejected: new public Client Portal route behavior, DB-backed audit write, token rotate/revoke action, or schema change.

### Round 2: Comparable Product Pattern

Selected: use a compact operational checklist with row status, reason, next action, and no-secret boundary. This matches resource/action and audit-review patterns without overbuilding a new workflow engine.  
Rejected: card-heavy explanation panels, decorative onboarding empty states, or a large paginated audit table before persisted audit events exist.

### Round 3: Risk And Verification Boundary

Selected: implement as UI/source-check slice only, with `pnpm work:source:check` verifying a new `WORK-017` marker and no public-output expansion.  
Rejected: enabling share publish writes, token lifecycle writes, public storage URLs, DB proof claims, or launch-level upgrade.

## Executable Next Task

| Field | Value |
|---|---|
| Task id | `WORK-017-WORK-DETAIL-CLIENT-PUBLISH-REVIEW-CHECKLIST` |
| Scope | Add a protected owner review checklist to the Work detail Client tab that summarizes share readiness, project visibility, token state, client-visible counts, AI draft state, public-output boundary, and next safe owner action. |
| Acceptance | Checklist is visible before share actions; each row has pass/warn/blocked state; AI draft remains proposal-only; share link remains gated to `client_shared` plus token; no public route or token lifecycle behavior changes. |
| Files likely affected | `src/app/(dashboard)/work/[projectId]/project-detail-client.tsx`, `scripts/check-work-db-source-smoke.mjs`, `ACC-002`, task docs, generated evidence. |
| Verification | `node --check scripts/check-work-db-source-smoke.mjs`, `pnpm work:source:check`, `pnpm interface:smoke:check`, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse, `git diff --check`. |
| Risks | UI copy could imply publishing authority; avoid by labeling checklist as protected owner review and no-public-write. |
| Stop conditions | Stop before route handler/server action, token rotate/revoke, schema/migration, DB write, public file URL, external agent access, or launch-level claim. |

## Rejected Alternatives

- `AUTH-005`: still blocked by missing Supabase public env and signed-in `/auth/status` proof.
- `WORK-009`: still blocked by missing safe proof target and write confirmations.
- `CLIENT-005`: too high-risk for this loop because token lifecycle writes and audit persistence need explicit approval and proof target.
- Another proof refresh: owner-run evidence has not changed; repeating it would not move the product surface.
- Full Client Portal publish workflow: too broad and public-output-adjacent for a research fallback loop.

## Routing

Loop 139 should run:

1. `AUTH-005` if Supabase public env and signed-in `/auth/status` evidence appear.
2. `WORK-009` if a safe local/disposable Work proof target plus write confirmations appear.
3. Otherwise, implement `WORK-017-WORK-DETAIL-CLIENT-PUBLISH-REVIEW-CHECKLIST`.

## Verification Closeout

- `pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-138-20260623-launch-preemption-router.json`: passed; still routes to research fallback because proof prerequisites are absent.
- `node --check scripts/check-work-db-source-smoke.mjs`: passed.
- `pnpm work:source:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-138-20260623-work-source-check.json`: passed.
- `pnpm interface:smoke:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-138-20260623-interface-smoke-check.json`: passed.
- `pnpm db:validate`: passed.
- `pnpm exec tsc --noEmit --pretty false`: passed.
- JSON parse for loop state and generated loop 138 proof packets: passed.
- `git diff --check`: passed.
