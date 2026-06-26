# Personal OS Loop 07 Evidence - ADMIN-001 Admin Launch Console

## Task

- Task ID: `ADMIN-001`
- Title: Add protected admin/operator launch console
- Date: 2026-06-20
- Agent: Codex
- Status: Completed

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

## Scope

In scope:

- Add protected `/admin` route.
- Add dashboard sidebar entry.
- Add server-side read-only launch readiness service.
- Show auth readiness, loop state, module readiness, environment presence, blockers, and recent evidence paths.
- Verify protected route behavior and build.

Out of scope:

- Admin mutations.
- User management.
- Production environment editing.
- Deployment provider API writes.
- Connector sync.
- DB migrations or seeds.
- Persisted audit/readiness records.

## Research / Reference Basis

Local docs/code reviewed:

- Existing dashboard shell and settings page patterns.
- `resolveCurrentUser()` and `/auth/status` auth readiness contract.
- Work owner project count service.
- Current loop-state and evidence report directory.
- Frontend Operating Surface rules for attention-first operational pages.

External or reference websites reviewed:

- Vercel Runtime Logs: <https://vercel.com/docs/observability/runtime-logs>
- Vercel Environment Variables: <https://vercel.com/docs/environment-variables>
- Supabase SSR client / Next.js auth docs: <https://supabase.com/docs/guides/auth/server-side/nextjs>

Selected implementation pattern:

- A protected read-only operator console that mirrors internal readiness signals already present in the repo.
- Server Component page plus service-layer DTO builder; no Client Component imports of DB/provider/runtime internals.
- Environment checks report only present/missing and purpose, not secret values.
- Recent evidence paths remain informational text, not a public docs-serving route.

Rejected alternatives:

- Direct Vercel/Supabase admin API integration, because that would require new secrets and provider write/read scopes.
- Persisted audit tables, because the BFF contract and schema impact are not approved.
- Admin user-management controls, because auth/Profile mapping is not production-proven yet.
- Client-side readiness collection, because it could expose runtime details and add unnecessary browser bundle work.

## Changes

Files changed:

- `src/app/(dashboard)/admin/page.tsx`
- `src/lib/services/admin-readiness.service.ts`
- `src/components/layout/app-sidebar.tsx`
- `src/lib/auth/redirect.ts`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

Behavior changed:

- `/admin` is now protected by the same dashboard route guard and preserves `/login?next=%2Fadmin`.
- Sidebar includes `管理`.
- Admin console can render read-only launch readiness for authenticated users.
- Unauthenticated users are redirected before private admin readiness content is exposed.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript clean. |
| `pnpm db:validate` | Passed | Prisma schema valid. |
| `pnpm build` | Passed | `/admin` shown as dynamic; Proxy enabled. |
| `curl -I http://127.0.0.1:3000/admin` | Passed | Returned `307` to `/login?next=%2Fadmin`. |
| `curl http://127.0.0.1:3000/auth/status` | Passed | Returned missing Supabase config readiness JSON. |
| In-app Browser smoke | Passed | `/admin` landed on `/login?next=%2Fadmin`, showed login email input and missing env guidance, did not expose admin console, and had no console errors. |

## Evidence

- Build route list includes `ƒ /admin`.
- Browser smoke result: URL was `http://127.0.0.1:3000/login?next=%2Fadmin`.
- Browser smoke result: `hasAdminPrivateText` was `false` while unauthenticated.
- Browser console errors: `[]`.

## Remaining Risks

- Authenticated admin UI could not be browser-rendered in this environment because Supabase public env/session and Profile mapping proof are unavailable.
- Full `AUTH-005` remains blocked by environment/session.
- `WORK-007` remains blocked by DB/session connectivity.
- Admin console is intentionally read-only; no persisted audit/readiness records exist yet.
- Current launch level remains `L0_LOCAL_PROTOTYPE`.

## Final Status

- Status: `DONE`
- Recommended next task: `FRONTSTAGE-001` public-safe owner entry.
