# Agent Loop Evidence Report

## Task

- Task ID: `AUTH-004`
- Title: Add protected dashboard route guard and login entry
- Date: 2026-06-20
- Agent: AuthPermissionAgent / UIUXAgent
- Loop: 3 of 30

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
  - Add public `/login` route outside the dashboard shell.
  - Add Supabase magic-link server action.
  - Add `/auth/callback` code exchange route.
  - Add normalized auth redirect helpers.
  - Redirect unauthenticated protected dashboard paths to `/login?next=...`.
  - Add a server-side dashboard layout guard.
  - Verify the protected route and login entry in production server mode.
- Out of scope:
  - Real Supabase auth session smoke.
  - Automatic `Profile` provisioning.
  - Member settings page.
  - Admin/operator page.
  - DB-backed module permissions.

## Research / Reference Basis

- Local docs/code reviewed:
  - `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
  - `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
  - `node_modules/next/dist/docs/01-app/02-guides/redirecting.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`
  - `node_modules/.pnpm/@supabase+auth-js@2.108.2/node_modules/@supabase/auth-js/dist/module/GoTrueClient.d.ts`
  - `src/app/(dashboard)/layout.tsx`
  - `src/lib/supabase/proxy.ts`
  - `src/lib/services/auth.service.ts`
- External or reference websites reviewed:
  - [Supabase server-side auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
  - [Supabase passwordless login](https://supabase.com/docs/guides/auth/auth-email-passwordless)
  - [Next.js Proxy guide](https://nextjs.org/docs/app/getting-started/proxy)
- Selected implementation pattern:
  - Use Proxy for optimistic route redirects before dashboard rendering.
  - Keep dashboard layout as a server-side guard before the app shell renders.
  - Use Supabase magic links with `shouldCreateUser: false` to preserve single-owner/private launch posture.
  - Use `/auth/callback` with `exchangeCodeForSession(code)` for SSR cookie-backed sessions.
  - Normalize `next` targets so auth routes cannot be used as open redirects.
- Rejected alternatives:
  - Rely on Proxy only: rejected because app shell should also fail closed server-side.
  - Let Supabase auto-create users from magic links: rejected because this is a private owner launch path.
  - Add profile provisioning now: rejected because `AUTH-005` should verify real auth-to-Profile behavior first.
  - Put login inside the dashboard shell: rejected because unauthenticated users must reach login without dashboard providers or protected data.
- Task shape created or updated:
  - `AUTH-004` marked `DONE`.
  - `AUTH-005` remains next: verify real Supabase user Profile mapping and Work owner smoke.

## Changes

- Files changed:
  - `src/lib/auth/runtime.ts`
  - `src/lib/auth/redirect.ts`
  - `src/app/(auth)/login/page.tsx`
  - `src/app/actions/auth.ts`
  - `src/app/auth/callback/route.ts`
  - `src/app/(dashboard)/layout.tsx`
  - `src/lib/services/auth.service.ts`
  - `src/lib/supabase/proxy.ts`
  - `src/proxy.ts`
  - `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
  - `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Behavior changed:
  - Protected dashboard paths redirect unauthenticated requests to `/login?next=...`.
  - `/login` renders a public magic-link login form.
  - Login form is disabled when Supabase public env is missing.
  - Magic-link action uses `shouldCreateUser: false`.
  - `/auth/callback` exchanges a Supabase auth code for a cookie-backed session.
  - Dashboard layout checks `getCurrentUser()` before rendering providers/sidebar.
  - `next` redirect values are normalized to app-local paths only.
- Docs changed:
  - Auth runtime strategy, v0.1 acceptance, module acceptance, sprint, backlog, completed log, and loop state updated.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript accepted Server Actions, login route, callback route, Proxy changes, and layout guard. |
| `pnpm db:validate` | Passed | Prisma schema is valid; no DB schema change. |
| `pnpm build` | Passed | Build reported `/login`, `/auth/callback`, dashboard routes, and `Proxy (Middleware)` as dynamic. |
| `curl -I --max-time 8 http://127.0.0.1:3000/login` under `next start` | Passed | Returned `200 OK`. |
| `curl -I --max-time 8 http://127.0.0.1:3000/ai-input` under `next start` | Passed | Returned `307 Temporary Redirect` to `/login?next=%2Fai-input`. |
| In-app Browser `/login` smoke | Passed | Page rendered Personal OS and Magic link, with one Email field and one disabled submit button because Supabase env is missing. |
| `node -e "...JSON.parse(loop-state.json)..."` | Passed | Loop state JSON parsed successfully. |
| `git diff --check` | Passed | No whitespace conflict markers or patch whitespace errors. |
| `rg -n "[ \t]+$" ...` | Passed | No trailing whitespace in touched files. |

## Evidence

- Relevant output or observation:
  - Production build route table shows protected app routes as dynamic and includes `Proxy (Middleware)`.
  - `curl` confirmed `/ai-input` redirects to `/login?next=%2Fai-input`.
  - Browser confirmed `/login` visible state and disabled form when Supabase env is missing.
- Screenshots or browser checks:
  - In-app Browser DOM smoke was used; no screenshot artifact was saved.
- DB checks:
  - `pnpm db:validate` passed.
  - No migration, seed, or DB write was run.

## Remaining Risks

- A real Supabase auth session has not been tested because Supabase public URL/key are not configured in this environment.
- `AUTH-005` must verify that Supabase claims email maps to an existing `Profile` and can operate Work.
- `next dev` Turbopack first compile for `/login` hung once during smoke; `pnpm build` and `next start` worked.
- Logout UI is only represented by a server action; it is not yet exposed in the dashboard shell.

## Final Status

- Status: `DONE`
- Recommended next task: `AUTH-005` - Verify Supabase user Profile mapping and Work owner smoke.
