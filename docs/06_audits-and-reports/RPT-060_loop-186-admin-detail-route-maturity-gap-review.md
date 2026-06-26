# Loop 186 Admin Detail Route Maturity Gap Review

**Document ID:** `RPT-060`
**Date:** 2026-06-25
**Status:** Complete
**Task:** `LOOP-186-ADMIN-DETAIL-ROUTE-MATURITY-GAP-REVIEW`

## Summary

Loop 186 completed the due `RES-001` / `RES-002` research-to-task cadence for the protected `/admin/detail` route after the `/admin` overview loader split.

`AUTH-005` did not run because `pnpm auth:proof` still reports missing signed-in owner `/auth/status?proof=1` evidence. Formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

The review scored the `/admin/detail` route maturity issue at **92/100 High**, completed three same-issue research rounds, and created `ADMIN-007-ADMIN-DETAIL-LOADING-AND-SECTION-INDEX` as the next implementation-ready slice.

## Strategic Review

- Current target: continue maturing the protected online operating experience while owner-run auth, Work proof, and deployment proof remain Manual Ops.
- Last three loops: loop 183 converted the admin performance gap into `ADMIN-006`; loop 184 split `/admin` onto a lightweight overview loader; loop 185 refreshed launch proof and routed loop 186 to this research cadence.
- Strongest blocker: owner signed-in `/auth/status?proof=1` evidence is still absent, so `AUTH-005` cannot be claimed.
- Product delta: this loop does not change runtime code, but it converts the next admin operator UX/route-state gap into a concrete task.
- Acceptance mapping: `ADMIN-006`, new `ADMIN-007`, `RES-001`, `RES-002`, `ACC-002`, `AUTH-005`, `WORK-009`, and `DEPLOY-002`.

## Auth Precheck

Command:

```bash
pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-186-20260625-auth-proof-precheck.json
```

Result:

- Overall: `blocked`
- `canRunAuth005`: `false`
- Missing evidence: `Auth status evidence`

## Requirement Understanding Score

Score: **92/100**, High. Required research optimization rounds: 3.

| Dimension | Score |
|---|---:|
| Actor/job clarity | 19/20 |
| PRD/local evidence fit | 18/20 |
| Data/BFF/API clarity | 18/20 |
| UI interaction/reference confidence | 14/15 |
| Risk/auth/public-output clarity | 15/15 |
| Acceptance/verification clarity | 8/10 |

## Research Rounds

1. Local code and evidence lens: `/admin` now uses `getAdminLaunchOverview()`, while `/admin/detail` delegates back into the admin page with `detail: "all"` and still renders the full `AdminLaunchConsole`. Loop 184 proof shows `/admin` at about 135KB / 1 table, and `/admin/detail` at about 821KB / 39 tables. The remaining user-visible gap is not the overview loader anymore; it is the operator experience of entering and navigating the heavy evidence route.
2. Framework lens: local Next.js 16 `loading.tsx` docs show route-segment loading UI can provide an immediate fallback while `page.tsx` streams. The page docs confirm `searchParams` is a request-time dynamic API, and the instant-navigation route segment config is still draft and depends on `cacheComponents`. The safe next slice is a detail-segment `loading.tsx` plus a stable section index, not an `unstable_instant` adoption.
3. Risk and acceptance lens: the next implementation can remain protected, read-only, no-secret, and UI-only. It should not add admin writes, permission writes, auth/session/provider mutation, route handlers, public output, Prisma schema changes, migrations, seed changes, deployment mutation, external registration, or launch-level claims.

## Selected Pattern

Create `ADMIN-007-ADMIN-DETAIL-LOADING-AND-SECTION-INDEX`.

The implementation should:

- add a lightweight protected `/admin/detail/loading.tsx` fallback using the existing admin shell visual language;
- add a first-viewport section index on `/admin/detail` with anchors for the major evidence families;
- preserve the full `AdminLaunchConsole` and all existing evidence tables;
- keep `/admin` on the lightweight overview loader;
- add stable source/UI markers so route identity and payload smoke can prove the section index and loading state exist.

## Rejected Alternatives

- Loading-only fallback: rejected as insufficient because it improves perceived response but does not help the operator navigate 39 tables once the route loads.
- Full section-loader split: deferred because it is a larger BFF contract change and should follow after the route-state/section-index baseline.
- `unstable_instant`: deferred because local docs mark it draft and dependent on `cacheComponents`; adopting it now would expand the route/cache validation surface.
- Persisted admin audit/readiness history: rejected for this slice because schema, authorization, retention, and append-only semantics still need separate review.

## New Executable Task

`ADMIN-007-ADMIN-DETAIL-LOADING-AND-SECTION-INDEX`

- Scope: protected read-only UI/route-state maturity for `/admin/detail`.
- Likely files: `src/app/(dashboard)/admin/detail/loading.tsx`, `src/app/(dashboard)/admin/page.tsx`, `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`, backlog/sprint/task memory, generated evidence.
- Verification: read local Next.js 16 loading/page/instant docs, `pnpm exec tsc --noEmit --pretty false`, `pnpm route:identity:check --profile admin-detail`, marker smoke for loading/section index source, optional payload/table smoke, JSON parse, and `git diff --check`.
- Stop conditions: stop before admin writes, permission writes, auth/session/provider mutation, public output, schema/migration, deployment mutation, external registration, route/API expansion, `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 claims.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-186-20260625-auth-proof-precheck.json` | PASS as blocked checker | `canRunAuth005=false`; missing signed-in auth status evidence. |
| Local admin route/code review | PASS | Reviewed `/admin/detail`, `/admin`, and admin readiness service route split. |
| Local Next.js 16 docs review | PASS | Reviewed `loading.md`, `page.md`, and `instant.md`. |
| `pnpm exec tsc --noEmit --pretty false` | PASS | No TypeScript regression. |
| JSON parse for loop state and auth proof precheck | PASS | `loop-state.json` and auth precheck packet parse successfully. |
| `git diff --check` | PASS | No whitespace errors. |

## Launch Decision

- Formal launch: unchanged at `L0_LOCAL_PROTOTYPE`.
- Manual Ops: unchanged at `M1_MANUAL_OPS_READY`.
- Conditional product maturity: unchanged at `C3_ARCHITECTURE_GATE_READY`.
- No `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 claim was made.

## Next Decision

Run `AUTH-005` immediately if owner signed-in `/auth/status?proof=1` JSON appears. Otherwise implement `ADMIN-007-ADMIN-DETAIL-LOADING-AND-SECTION-INDEX`.
