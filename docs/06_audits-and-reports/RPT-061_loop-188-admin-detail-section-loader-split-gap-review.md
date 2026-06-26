# Loop 188 Admin Detail Section Loader Split Gap Review

**Document ID:** `RPT-061`
**Last updated:** 2026-06-25
**Status:** Done

## 1. Decision

Loop 188 completed `ADMIN-008-ADMIN-DETAIL-SECTION-LOADER-SPLIT-GAP-REVIEW`.

Formal launch remains `L0_LOCAL_PROTOTYPE`. `pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-188-20260625-auth-proof-precheck.json` still reports `canRunAuth005=false` because owner signed-in `/auth/status?proof=1` evidence is absent. Manual Ops remains `M1_MANUAL_OPS_READY`; conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.

The selected next implementation pattern is a protected admin detail shell plus whitelisted section route split:

```txt
/admin
  -> lightweight overview loader
/admin/detail
  -> section index / shell, no full AdminLaunchConsole by default
/admin/detail/[section]
  -> one whitelisted evidence family loaded through a section-specific server loader
/admin?detail=all or /admin/detail/all
  -> optional full evidence fallback only when explicitly requested
```

## 2. Page Requirement Understanding Score

Score: 94/100, High.

| Dimension | Score | Reason |
|---|---:|---|
| Actor/job clarity | 19/20 | Owner/admin needs a protected operator console that can inspect launch proof, blockers, and evidence without waiting on every evidence family. |
| PRD/local evidence fit | 19/20 | `RES-002`, `ACC-002`, loop 184, loop 186, and loop 187 all point to admin surface maturity and a still-heavy detail route. |
| Data/BFF/API clarity | 18/20 | `admin-readiness.service.ts` already exposes independent contract builders, but `getAdminLaunchConsole()` still composes them into one full payload. |
| UI interaction/reference-pattern confidence | 14/15 | Next.js 16 route/page/loading/streaming docs support shell plus child route or granular Suspense; this product needs route-level reduction first. |
| Risk/auth/public-output boundary clarity | 15/15 | Admin route stays protected, server-first, read-only, and no-secret; no public route/API or mutation expansion is needed. |
| Acceptance and verification clarity | 9/10 | Route identity, source markers, payload/table counts, TypeScript, and JSON proof parse can verify the next slice. |

High understanding requires three same-issue research rounds. All three were completed in this review.

## 3. Research Rounds

### Round 1 - Local Code And Evidence

- `/admin` now uses `getAdminLaunchOverview()` and verifies at about 135KB with one table.
- `/admin/detail` still imports `AdminPage` and calls `AdminPage({ searchParams: Promise.resolve({ detail: "all" }) })`, which preserves the full `getAdminLaunchConsole()` path.
- Loop 187 route proof verifies `/admin/detail` at 875174 bytes with warm `application-code` around 4.1s.
- `AdminLaunchConsole` includes independent evidence families: owner evidence, launch history, launch actions, backend catalog, Work proof evidence, AI Input readiness, scenario journey, operating surface maturity, agent protocol, Client Portal, audit contract, module rows, env rows, and recent evidence.
- `admin-readiness.service.ts` already has separate builders for many heavy evidence families, so a section-specific loader can be implemented without a schema change.

### Round 2 - Next.js 16 Route And Streaming Behavior

Local docs reviewed under `node_modules/next/dist/docs/`:

- `loading.md`: `loading.tsx` gives fallback UI and wraps page children in Suspense, but it does not wrap same-segment layout runtime work.
- `streaming.md`: Suspense boundaries stream UI progressively, but the server still has to build any data and component payload inside the selected route tree.
- `page.md`: `page` is a route leaf; dynamic params and search params are appropriate route selectors.
- `parallel-routes.md`: parallel routes are useful when multiple dynamic slots render in one view, but they are overkill here and can still make a segment dynamic if slots are dynamic.

Conclusion: `ADMIN-007` improved feedback and navigation, but it cannot make `/admin/detail` lightweight by itself. The next useful split must avoid building the full `AdminLaunchConsole()` on the default detail route.

### Round 3 - Risk, Boundary, And Verification

The split can stay safe if it follows these rules:

- Do not add admin writes, permission writes, deployment writes, connector runtime, auth/session mutation, public output, route handlers, schema/migration, seed, external registration, or launch-level claims.
- Keep section slugs whitelisted. Unknown slugs should render a protected unavailable state or `notFound()`, not a dynamic contract lookup.
- Keep Client Components away from Prisma, provider secrets, raw env, raw proof bodies, and raw adapter payloads.
- Preserve access to full evidence through an explicit fallback if operators still need the whole console during the transition.
- Add route identity or source checks for the shell and first section route so local proof cannot confuse another localhost app with Personal OS.

## 4. Selected Pattern

Implement `ADMIN-009-ADMIN-DETAIL-SECTION-ROUTE-SPLIT-FIRST-PASS`.

Scope:

- Convert `/admin/detail` from full evidence render into a protected detail shell that shows launch context, section index, read-only write boundary, and section links without calling `getAdminLaunchConsole()` by default.
- Add a whitelisted first section route such as `/admin/detail/owner-evidence`.
- Load only the selected evidence family through a section-specific server loader or extracted BFF contract builder.
- Preserve `/admin` overview behavior and preserve a deliberate full-detail fallback for audit continuity.
- Add route identity/source proof for the shell and first section route.

Initial section choice: `owner-evidence`. It directly supports the current highest formal blocker (`AUTH-005` owner signed-in proof) and reuses `OwnerAuthBoundaryContract`, loop state, and `OwnerEvidenceConsoleContract`.

## 5. Rejected Alternatives

- Keep full `/admin/detail` and rely on `loading.tsx`: rejected because route proof still shows about 875KB and 4.1s warm application code.
- Add more anchors only: rejected because navigation does not reduce server work or payload.
- Use Parallel Routes immediately: rejected as too much route/layout machinery for a first section split, and dynamic slots would not automatically reduce evidence work.
- Move all evidence into client-side hidden panels: rejected because it shifts large payloads into the client and risks exposing data boundaries.
- Add public API endpoints for each section: rejected because the admin evidence surface is protected owner/admin UI and does not need public or external API expansion.
- Persist admin evidence/audit records now: rejected because this requires schema and audit storage approval beyond the selected route split.

## 6. Acceptance Shape For ADMIN-009

- `/admin/detail` default shell must not call or render the full `AdminLaunchConsole()` path.
- `/admin/detail` must keep an operator-visible section index and read-only admin write boundary.
- `/admin/detail/owner-evidence` must load only the owner-evidence family and show `AUTH-005`, `WORK-009`, deployment, owner-run commands, blockers, and no-secret evidence handoff.
- `/admin` must keep the lightweight overview marker and remain materially smaller than the full detail route.
- Full evidence access must remain available through an explicit fallback path while the split is staged.
- Verification must include `pnpm exec tsc --noEmit --pretty false`, source marker checks, route identity checks for the shell and first section, payload/table comparison, JSON parse, and `git diff --check`.
- No launch level, `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 claim may be made from this route work.

## 7. Next Routing

Run `AUTH-005` immediately if the owner provides signed-in `/auth/status?proof=1` JSON evidence.

If no owner proof appears, run `ADMIN-009-ADMIN-DETAIL-SECTION-ROUTE-SPLIT-FIRST-PASS` next.
