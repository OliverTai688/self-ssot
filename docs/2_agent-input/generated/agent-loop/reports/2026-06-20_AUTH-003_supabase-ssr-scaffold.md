# Agent Loop Evidence Report

## Task

- Task ID: `AUTH-003`
- Title: Add Supabase SSR auth client and Proxy scaffold
- Date: 2026-06-20
- Agent: AuthPermissionAgent
- Loop: 2 of 30

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`

## Scope

- In scope:
  - Install Supabase SSR dependencies.
  - Add browser/server Supabase client utilities.
  - Add a Next.js 16 `src/proxy.ts` entrypoint and Supabase cookie refresh helper.
  - Use `supabase.auth.getClaims()` for server auth identity lookup.
  - Keep auth fail-closed when Supabase env or session is missing.
- Out of scope:
  - Login/logout UI.
  - Dashboard route redirects.
  - Supabase callback route.
  - Creating or provisioning `Profile` rows from Supabase users.
  - Real auth browser smoke test with a live Supabase session.

## Research / Reference Basis

- Local docs/code reviewed:
  - `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
  - `node_modules/@supabase/ssr/dist/module/createServerClient.d.ts`
  - `node_modules/@supabase/ssr/dist/module/types.d.ts`
  - `node_modules/.pnpm/@supabase+auth-js@2.108.2/node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts`
  - `src/lib/services/auth.service.ts`
  - `src/app/actions/work.ts`
- External or reference websites reviewed:
  - [Supabase SSR client guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
  - [Next.js Proxy guide](https://nextjs.org/docs/app/getting-started/proxy)
- Selected implementation pattern:
  - Install `@supabase/supabase-js` and `@supabase/ssr`.
  - Use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, with legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback.
  - Implement browser and server client helpers under `src/lib/supabase`.
  - Implement one `src/proxy.ts` entrypoint, with proxy logic factored into `src/lib/supabase/proxy.ts`.
  - Use `getAll` / `setAll` cookie methods required by `@supabase/ssr` 0.12 instead of deprecated cookie methods.
  - Use `supabase.auth.getClaims()` rather than `getSession()` for server-side identity.
- Rejected alternatives:
  - Use deprecated `get`, `set`, `remove` cookie methods: rejected because local package types mark them deprecated and warn about future removal.
  - Throw when Supabase env is missing: rejected because local builds should continue while auth remains fail-closed.
  - Use `getSession()` for authorization: rejected because Supabase and local types warn server-side session user data can be spoofed or unverified.
  - Add dashboard redirects in the same loop: rejected because `AUTH-004` should own login/redirect UX and browser verification.
- Task shape created or updated:
  - `AUTH-003` marked `DONE`.
  - `AUTH-004` remains next task for protected dashboard routing and login entry.
  - `AUTH-005` now focuses on verifying the real Supabase user-to-Profile mapping and Work owner smoke.

## Changes

- Files changed:
  - `package.json`
  - `pnpm-lock.yaml`
  - `src/lib/supabase/env.ts`
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/proxy.ts`
  - `src/proxy.ts`
  - `src/lib/services/auth.service.ts`
  - `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Behavior changed:
  - Supabase SSR helpers now exist for future Client Components, Server Components, Server Actions, and Route Handlers.
  - Next.js Proxy now refreshes/verifies Supabase auth cookies with `getClaims()` when Supabase env is configured.
  - Supabase auth mode in `auth.service.ts` now reads verified claims and maps claims email to an existing `Profile`.
  - Missing Supabase env returns no current user and Proxy pass-through, preserving fail-closed auth.
- Docs changed:
  - `AUT-002` now documents the Supabase SSR runtime files, env variables, and remaining auth tasks.
  - Backlog, sprint, completed log, and loop state updated.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm add @supabase/supabase-js @supabase/ssr` | Passed | Installed `@supabase/ssr 0.12.0` and `@supabase/supabase-js 2.108.2`. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript accepted Supabase helpers, Proxy, and auth service changes. |
| `pnpm db:validate` | Passed | Prisma schema is valid. |
| `pnpm build` | Passed | Next.js production build succeeded and reported `Proxy (Middleware)`. |
| `node -e "const p=require('./package.json'); console.log(p.dependencies['@supabase/ssr'], p.dependencies['@supabase/supabase-js'])"` | Passed | Confirmed dependency entries. |

## Evidence

- Relevant output or observation:
  - Build route table still shows `/work` and `/work/[projectId]` as dynamic.
  - Build output includes `Proxy (Middleware)`, confirming `src/proxy.ts` is detected by Next.js 16.
  - Supabase env is not configured with a URL/key in this environment, so no live auth session smoke was attempted.
- Screenshots or browser checks:
  - Not run; this loop added backend/Proxy scaffolding, not visible UI.
- DB checks:
  - `pnpm db:validate` passed.
  - No migration, seed, or DB write was run.

## Remaining Risks

- `AUTH-004` must add dashboard protection and a login entry before the system is usable online.
- `AUTH-005` must verify a real Supabase user maps to an existing `Profile` and can access Work through `requireUser()`.
- No Supabase callback route, profile provisioning, logout, or error UX exists yet.
- Missing Supabase env still means auth fails closed.

## Final Status

- Status: `DONE`
- Recommended next task: `AUTH-004` - Add protected dashboard route guard and login entry.
