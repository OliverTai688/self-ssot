# Agent Loop Evidence Report

## Task

- Task ID: `AUTH-001`
- Title: Replace mock auth plan with explicit v0.1 auth strategy
- Date: 2026-06-20
- Agent: AuthPermissionAgent
- Loop: 1 of 30

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/06_audits-and-reports/RPT-004_personal-use-readiness.md`
- `docs/02_architecture-and-rules/DBS-001_database-contract.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`

## Scope

- In scope:
  - Remove the silent seeded-admin / first-profile auth fallback.
  - Make development mock auth explicit, non-production-only, and exact-email based.
  - Keep production/future Supabase mode fail-closed until Supabase SSR is wired.
  - Mark DB-backed Work list/detail pages as request-time dynamic.
  - Document the v0.1 auth runtime strategy.
  - Split the remaining auth work into executable follow-up tasks.
- Out of scope:
  - Installing Supabase SSR dependencies.
  - Adding login/logout UI.
  - Adding dashboard route redirects.
  - Mapping a Supabase user to `Profile`.
  - Changing Prisma schema, migrations, RLS, or module permissions.

## Research / Reference Basis

- Local docs/code reviewed:
  - `src/lib/services/auth.service.ts`
  - `src/app/actions/work.ts`
  - `src/app/(dashboard)/work/page.tsx`
  - `src/app/(dashboard)/work/[projectId]/page.tsx`
  - `prisma/schema.prisma`
  - `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- External or reference websites reviewed:
  - [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)
  - [Supabase server-side auth guide](https://supabase.com/docs/guides/auth/server-side)
  - [Supabase SSR client creation guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- Selected implementation pattern:
  - Use a fail-closed auth service default.
  - Allow mock auth only when `PERSONAL_OS_AUTH_MODE=mock` and `NODE_ENV !== "production"`.
  - Resolve the development user by exact email from `PERSONAL_OS_DEV_USER_EMAIL` or `admin@example.com`.
  - Keep service-layer authorization as the data boundary.
  - Defer Supabase SSR wiring to the next loop so dependencies, proxy behavior, and profile mapping can be verified in a focused pass.
- Rejected alternatives:
  - Keeping the first-profile fallback: unsafe because identity would depend on database contents.
  - Treating `PERSONAL_OS_AUTH_MODE=mock` as valid in production: unsafe for online launch.
  - Adding full Supabase login in this same loop: too broad for a safe 20-minute implementation slice.
- Task shape created or updated:
  - `AUTH-001` marked `DONE`.
  - `AUTH-003` added for Supabase SSR client/proxy scaffold.
  - `AUTH-004` added for dashboard route guard and login entry.
  - `AUTH-005` added for Supabase user-to-Profile mapping and Work owner smoke verification.

## Changes

- Files changed:
  - `src/lib/services/auth.service.ts`
  - `src/app/(dashboard)/work/page.tsx`
  - `src/app/(dashboard)/work/[projectId]/page.tsx`
  - `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
  - `docs/02_architecture-and-rules/DBS-001_database-contract.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Behavior changed:
  - `requireUser()` no longer silently resolves `admin@example.com` unless mock mode is explicitly enabled.
  - `requireUser()` no longer falls back to the first profile.
  - Production cannot use mock auth.
  - The future Supabase path currently returns no user, so production/future-auth mode fails closed.
  - `/work` and `/work/[projectId]` are dynamic routes and do not rely on build-time mock identity.
- Docs changed:
  - Added `AUT-002_auth-runtime-strategy.md`.
  - Updated DB contract runtime auth assumptions.
  - Updated current sprint, backlog, completed log, and loop state.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript accepted the auth service changes. |
| `pnpm db:validate` | Passed | Prisma schema is valid. |
| `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('docs/2_agent-input/generated/agent-loop/loop-state.json','utf8')); console.log('loop-state ok')"` | Passed | Loop state JSON parsed successfully. |
| `pnpm build` | Passed | Next.js production build succeeded. Route table shows `/work` and `/work/[projectId]` as dynamic. |
| `git diff --check` | Passed | No whitespace conflict markers or patch whitespace errors. |
| `rg -n "[ \t]+$" ...` | Passed | No trailing whitespace in touched files. |

## Evidence

- Relevant output or observation:
  - Build completed successfully.
  - Next route table reported `/work` and `/work/[projectId]` as dynamic server-rendered routes.
  - `AUTH-001` is now complete only as the auth safety gate and strategy split; it is not a claim that full Supabase auth is finished.
- Screenshots or browser checks:
  - Not run in this loop because the selected slice changes server auth behavior and build-time route classification, not visible UI.
- DB checks:
  - `pnpm db:validate` passed.
  - No migration, seed, or DB write was run.

## Remaining Risks

- Supabase SSR auth client, Proxy token refresh, login entry, route guard, and Profile mapping are not implemented yet.
- Production dashboard access will fail closed until `AUTH-003` through `AUTH-005` are complete.
- `AUTH-002` DB-backed module permissions remain pending.
- `WORK-007` full browser refresh verification remains dependent on a reachable DB/auth environment.

## Final Status

- Status: `DONE`
- Recommended next task: `AUTH-003` - Add Supabase SSR auth client and Proxy scaffold.
