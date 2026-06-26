# Personal OS Loop 182 Evidence - Admin Readiness Cold-Start Dedup

## Summary

- Automation id: `personal-os-20m-aggressive-launch-loop`
- Loop: 182
- Task: `ADMIN-005-ADMIN-READINESS-COLD-START-DEDUP`
- Status: Completed
- Date: 2026-06-25

Loop 182 reduced duplicate protected admin loader reads by using request-scoped server memoization for auth/Profile resolution, module-permission row loading, and owner project-count loading. The `/admin` overview and `/admin/detail` full-console split from loop 181 remains intact.

## Strategic Review Gate

- Current product target: keep moving toward the private owner operating experience while formal L1 remains blocked by owner-run `AUTH-005`, Work proof target, and deployment evidence.
- Last three loops: loop 181 split `/admin/detail`, loop 180 refreshed launch levels, loop 179 added route identity proof.
- Current blocker: owner signed-in `/auth/status?proof=1` evidence is still absent, so formal launch cannot upgrade.
- Selected task value: runtime/proof fallback, not another checklist. It removes repeated admin auth/Profile/permission/count reads observed during route proof.
- More true after this loop: a single admin server-render request no longer repeats the same protected profile, module-permission, or project-count database reads through layout plus admin console loaders.

## Research Notes

- Local Next.js 16 docs reviewed before implementation:
  - `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` documents using React `cache` to deduplicate ORM/database access during a render pass.
  - `node_modules/next/dist/docs/01-app/02-guides/authentication.md` documents memoizing auth/session DAL functions with React `cache`.
  - `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` states React `cache` is scoped to the current request and is not shared between requests.
- Selected pattern: request-scoped React `cache` for server-only read paths.
- Rejected pattern: global process cache or persisted readiness cache, because auth/Profile and permission state must not be shared across requests/users.

## Implementation

- `src/lib/services/auth.service.ts`
  - Added `server-only` and wrapped `resolveCurrentUser()` with React `cache`.
- `src/lib/services/module-permission.service.ts`
  - Added a cached `getPermissionRowsForProfile(profileId)` helper so different object literals from layout/admin still deduplicate the same DB row read by stable profile id.
- `src/lib/services/project.service.ts`
  - Wrapped `getProjectCountForProfile(profileId)` with React `cache`.

## Verification

- `pnpm exec tsc --noEmit --pretty false`
  - Pass.
- Initial route identity attempt against a dev server started in Supabase/no-cookie mode:
  - `pnpm route:identity:check --profile admin-overview`
  - `pnpm route:identity:check --profile admin-detail`
  - Both returned 307 redirects to login, which is expected for CLI fetch without browser session cookies.
- Restarted dev server with explicit mock owner:
  - `PERSONAL_OS_AUTH_MODE=mock PERSONAL_OS_DEV_USER_EMAIL=taioliver688@gmail.com pnpm dev --port 3100`
- First cold mock `/admin` route identity check timed out while Turbopack was compiling `/admin`; the server later emitted the expected first request query set.
- Warm route identity:
  - `pnpm route:identity:check --profile admin-overview` passed with HTTP 200.
  - `pnpm route:identity:check --profile admin-detail` passed with HTTP 200.
- Payload smoke:
  - `/admin`: HTTP 200, 144422 bytes, overview marker present, detail marker absent.
  - `/admin/detail`: HTTP 200, 820632 bytes, detail marker present.
- Server log query comparison:
  - Warm `/admin` single request: 1 profile query, 1 module-permission query, 1 project-count query, HTTP 200 in 2.9-4.0s after compile.
  - Warm `/admin/detail` single request: 1 profile query, 1 module-permission query, 1 project-count query, HTTP 200 in 29.4s for the full detail render.
  - Concurrent overview/detail payload smoke showed two query sets because it made two separate HTTP requests.

## Product Delta

- Protected admin route identity remains stable.
- Admin overview remains bounded.
- Admin detail remains available for full launch console evidence.
- Repeated protected-profile/module-permission/project-count reads inside one admin request are reduced.

## Boundaries

- No admin write was added.
- No permission write was added.
- No auth provider mutation, session mutation, Profile provisioning, DB schema/migration, seed, deployment mutation, public output expansion, or external agent registration was added.
- No `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 claim was made.

## Remaining Risks

- `/admin/detail` still has a heavy full-console application render path even after duplicate query reduction.
- The first cold `/admin` compile can still exceed the route identity script timeout; warm route proof is stable after compile.
- Formal launch remains `L0_LOCAL_PROTOTYPE` until owner-run auth proof, Work proof, and deployment evidence exist.

## Next Decision

Run `AUTH-005` immediately if owner signed-in `/auth/status?proof=1` JSON evidence appears. Otherwise run `LOOP-183-ADMIN-DETAIL-PERFORMANCE-GAP-REVIEW` as the due RES-001/RES-002 research cadence and convert the remaining `/admin/detail` heavy render path into the next implementation-ready slice.
