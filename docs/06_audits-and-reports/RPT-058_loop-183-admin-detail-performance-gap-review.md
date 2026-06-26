# RPT-058 Loop 183 Admin Detail Performance Gap Review

## Summary

Loop 183 completed the due RES-001/RES-002 research-to-task cadence after loop 182 reduced repeated admin auth/Profile, module-permission, and project-count reads. Owner-run `AUTH-005` evidence is still absent, so the loop did not claim a launch upgrade. The highest-leverage local gap is now that `/admin` still calls `getAdminLaunchConsole()` before deciding whether to render overview or full-detail sections, so the overview route avoids most detail UI but still builds the full admin readiness contract.

## Strategic Review Gate

- Current target: formal launch remains `L0_LOCAL_PROTOTYPE`; Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`; target next formal level is still `L1_PRIVATE_ONLINE_WORK_OS`.
- Last three completed loops: loop 180 refreshed launch-level proof and routed admin performance fallback; loop 181 split full detail into `/admin/detail`; loop 182 deduplicated repeated protected Profile/permission/project-count reads inside a single server render request.
- Current blocker: `AUTH-005` still requires owner signed-in `/auth/status?proof=1` evidence. In the no-owner-proof path, the admin operator surface still spends full-console application work on overview requests.
- Candidate task quality: this is not another checklist-only loop. It converts a measured runtime gap into a scoped implementation task with acceptance, files, verification, and stop conditions.
- Product delta after this loop: `ADMIN-006-ADMIN-OVERVIEW-LIGHTWEIGHT-LOADER-SPLIT` is ready to implement as the shortest path from bounded admin UI to bounded admin server work.

## Preemption Check

Command:

```bash
pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-183-20260625-auth-proof-precheck.json
```

Outcome: `blocked`; `canRunAuth005=false`; blocker is missing owner signed-in auth-status evidence. This keeps `AUTH-005` as the top owner-run preemption task, but it does not displace the loop 183 research fallback.

## Page Requirement Understanding Score

Total: 94/100, High. Required research rounds: 3.

- Actor/job clarity: 19/20. Admin/operator needs a fast launch overview plus a slower protected evidence route.
- PRD/local evidence fit: 19/20. RES-002 prefers admin/operator surfaces with resource index, command/action registry, detail surfaces, evidence, settings/boundaries, and explicit real/demo/unavailable states.
- Data/BFF/API clarity: 18/20. Existing contracts are clear, but `/admin` and `/admin/detail` share one full loader instead of an overview-specific BFF contract.
- UI interaction/reference-pattern confidence: 14/15. The existing route split and button affordance are good; the server data boundary is the missing layer.
- Risk/auth/public-output clarity: 15/15. Work is read-only, protected, owner/operator-only, and must not add admin writes, provider mutation, schema/migration, public output, or launch claims.
- Acceptance/verification clarity: 9/10. Verification can use route identity, payload checks, TypeScript, server log comparison, and static contract checks.

## Research Rounds

### Round 1 - Local PRD, Code, And Evidence Fit

Finding: `/admin` already has a bounded first viewport, but the page still runs `const consoleState = await getAdminLaunchConsole()` before rendering overview or detail mode. `/admin/detail/page.tsx` delegates back to `AdminPage({ searchParams: Promise.resolve({ detail: "all" }) })`, so both routes share the full service call. `getAdminLaunchConsole()` builds auth, loop state, evidence, owner auth boundary, permission snapshot, Agent Protocol readiness, Client Portal readiness, operating surface maturity, backend operation catalog, scenario journey, Work proof evidence, owner evidence console, launch readiness history, operator action registry, AI Input source workflow operations, and audit contracts before returning.

Selected pattern: create an overview-specific admin BFF loader that returns only the fields needed by `/admin`, while keeping the full loader for `/admin/detail`.

Rejected patterns:

- Keep hiding detail sections with `showFullDetails`; it reduces markup but not full server contract work.
- Move more sections behind the existing boolean without changing the service boundary; this repeats the same root cause.

### Round 2 - Next.js 16 Rendering Pattern

Local official docs under `node_modules/next/dist/docs/` confirm that uncached async work can be streamed behind Suspense, and `loading.tsx` can show immediate segment fallback UI. Those patterns improve perceived navigation, but they do not remove work already awaited by the parent page. The same docs also reinforce route-segment boundaries and request-time APIs, which fits a dedicated `/admin` overview route loader and a separate `/admin/detail` full route loader.

Selected pattern: route-level loader split first; optional `loading.tsx` or nested Suspense can be a later polish task for `/admin/detail` once expensive work is isolated.

Rejected patterns:

- Add only `loading.tsx`; it improves feedback but still leaves `/admin` awaiting full-console data.
- Add `"use cache"` broadly to protected admin data; auth/session/Profile/loop evidence are request-sensitive and should stay fresh.
- Parallel routes as the first slice; they are useful for complex dashboards, but the current need is simpler: avoid building detail data for overview.

### Round 3 - Risk, Boundary, And Verification Split

The implementation must preserve the protected dashboard shell, server-only service boundaries, and read-only launch evidence. It must not add public route handlers, admin mutations, permission writes, auth/session/provider mutations, deployment writes, Prisma schema/migration changes, seed changes, or launch-level claims.

Selected verification:

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm route:identity:check --profile admin-overview`
- `pnpm route:identity:check --profile admin-detail`
- `/admin` and `/admin/detail` payload smoke with detail markers
- server log comparison proving `/admin` no longer builds detail-only contracts
- `git diff --check`

Rejected verification:

- Claiming `AUTH-005`, `WORK-009`, L1, L3, or L4 from admin performance evidence.
- Requiring owner Supabase browser evidence for this local protected-surface split.

## Executable Task Created

Task: `ADMIN-006-ADMIN-OVERVIEW-LIGHTWEIGHT-LOADER-SPLIT`

Scope:

- Add an `AdminLaunchOverview` or equivalent overview BFF contract in `src/lib/services/admin-readiness.service.ts`.
- Keep full `AdminLaunchConsole` for `/admin/detail`.
- Update `/admin` to call only the overview loader and `/admin/detail` to call the full detail loader.
- Preserve existing overview/detail UI, protected route identity, no-secret evidence behavior, and launch-level boundaries.
- Update acceptance and loop docs with proof outcomes.

Acceptance:

- `/admin` renders summary items, launch blockers, loop state, owner settings/auth links, and the full-detail navigation without building detail-only contracts.
- `/admin/detail` still renders all full launch console evidence sections.
- Route identity checks pass for both admin profiles.
- Payload and server log evidence show the overview route is bounded at both markup and server-contract work.
- No admin writes, permission writes, auth provider mutation, schema/migration, seed, deployment mutation, public output, external registration, or launch-level claim is added.

Likely files:

- `src/lib/services/admin-readiness.service.ts`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/detail/page.tsx`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- generated evidence report

Stop conditions:

- Stop before any admin write/user management/permission mutation.
- Stop before Prisma schema or migration changes.
- Stop before public route/API expansion.
- Stop before claiming formal launch-level improvement from performance-only evidence.

## Launch Decision

No launch-level upgrade. Formal launch remains `L0_LOCAL_PROTOTYPE` until `AUTH-005`, Work proof, and deployment evidence are present. Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

## Verification

- `pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-183-20260625-auth-proof-precheck.json` -> blocked as expected because owner signed-in evidence is absent.
- `pnpm exec tsc --noEmit --pretty false` -> pass.
- JSON parse check for loop-state and auth proof precheck evidence -> pass.
- `git diff --check` -> pass.
