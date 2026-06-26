# Auth Runtime Strategy

**Document ID:** `AUT-002`
**Status:** Active for v0.1 launch hardening
**Last updated:** 2026-06-25

## Purpose

Define the v0.1 auth runtime path so Personal OS can move from local prototype to private online owner use without silently relying on a seeded mock admin.

## Current Decision

Personal OS uses a fail-closed auth boundary by default.

Runtime auth mode is selected with:

```txt
PERSONAL_OS_AUTH_MODE=mock
PERSONAL_OS_DEV_USER_EMAIL=admin@example.com
```

Rules:

- If `PERSONAL_OS_AUTH_MODE=mock` and `NODE_ENV` is not `production`, `requireUser()` resolves the seeded development profile by exact email.
- If the configured development profile does not exist, `requireUser()` fails.
- In production, mock auth is disabled even if `PERSONAL_OS_AUTH_MODE=mock` is set.
- If mock auth is not explicitly enabled, the runtime path is `supabase`.
- If Supabase env or a valid Supabase session is missing, the `supabase` path returns no current user and therefore fails closed.
- There is no fallback to the first profile in the database.

This keeps local development usable when deliberately configured, while preventing accidental online launch with a silent owner identity.

## BFF Boundary

All operational runtime features continue to use this sequence:

```txt
Server Component or server action
  -> requireUser()
  -> service-layer authorization
  -> Prisma service
  -> mapper / view model
  -> Client Component interaction
```

Client Components must not import Prisma clients, provider secrets, raw Supabase sessions, or adapter payloads.

## Request-Time Work Pages

The DB-backed Work list and Work detail pages are request-time dynamic routes. They must not be prerendered with an implicit mock identity.

Affected pages:

- `src/app/(dashboard)/work/page.tsx`
- `src/app/(dashboard)/work/[projectId]/page.tsx`

## Supabase SSR Runtime

Supabase Auth SSR is scaffolded with cookie-backed sessions, a server/browser client split, and a Next.js Proxy for token refresh. Service-layer authorization remains the real data boundary.

Environment variables:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` remains supported as a legacy fallback for older Supabase projects, but new environments should use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Runtime files:

- `src/lib/auth/runtime.ts` resolves `mock` vs `supabase` runtime mode without importing database code.
- `src/lib/auth/redirect.ts` normalizes auth redirect targets, blocks external/open redirects, and can carry a safe login status code for auth-resolution handoff.
- `src/app/(auth)/login/page.tsx` renders the public login entry and safe status messages for request failure, missing Supabase session, and missing Profile mapping.
- `src/app/actions/auth.ts` sends magic links with `shouldCreateUser: false` and redirects with `status=request-failed` when Supabase rejects the OTP request instead of reporting a false sent state.
- `src/app/auth/callback/route.ts` exchanges Supabase auth codes for cookie-backed sessions.
- `src/app/auth/status/route.ts` exposes a no-store readiness endpoint for auth/Profile/Work owner smoke checks without returning tokens, cookies, raw claims, or profile IDs.
- `src/lib/supabase/env.ts` resolves the public Supabase runtime config and returns `null` when env is incomplete.
- `src/lib/supabase/client.ts` creates the browser client for future Client Components.
- `src/lib/supabase/server.ts` creates a per-request server client using Next cookies.
- `src/lib/supabase/proxy.ts` refreshes/validates the auth cookie through `supabase.auth.getClaims()`.
- `src/proxy.ts` is the single Next.js 16 Proxy entrypoint and redirects protected dashboard paths to `/login?next=...` when unauthenticated; it does not redirect `/login` based solely on a Supabase cookie before Profile mapping is proven.
- `src/app/(dashboard)/layout.tsx` performs a server-side user check before rendering the dashboard shell and forwards missing-session/Profile status to `/login`.
- `src/lib/services/auth.service.ts` uses `getClaims()` in Supabase mode and maps the verified claims email to an existing `Profile`.

If Supabase env is incomplete, the Supabase path returns no user and Proxy passes the request through without refresh. This preserves fail-closed auth behavior while allowing local builds before auth credentials are configured.

Remaining implementation tasks:

1. `AUTH-005` verifies the Supabase user-to-Profile mapping against a real auth session, confirms owner Work access, and records the launch smoke test. `AUTH-005A` added `/auth/status` so the real-session smoke has a single repeatable BFF endpoint; `AUTH-006` added `pnpm auth:proof` so launch readiness and sanitized `/auth/status` evidence can be collected without storing cookies, tokens, raw claims, provider payloads, profile IDs, or actual profile email values. `AUTH-008` configured the owner Profile allowlist, sent the Supabase Auth invitation, and tightened login/Profile-missing error handling. The full smoke now remains blocked only by owner Manual Ops signed-in `/auth/status` evidence. Automatic profile provisioning remains out of scope until the real mapping is verified.
2. Permission writes remain a follow-up. `AUTH-002` is complete as a hybrid read-model slice; `AUT-003_module-permission-source.md` defines the current DB-row overlay, role default fallback, browser rehearsal override, and no-write boundary.

## Research Basis

- Next.js authentication guide: auth should be treated as authentication, session management, and authorization; Proxy can help with optimistic checks, while authorization should live near the data access layer.
- Local Next.js `use server` docs: Server Functions must validate input and check authentication/authorization before side effects.
- Local Next.js Proxy docs: Proxy is useful for route checks but should not replace server-side authorization.
- Supabase SSR guide: server-side auth stores sessions in cookies and uses `@supabase/ssr`.
- Supabase SSR client guide: server code should verify user claims/session server-side and avoid trusting unverified client data.
- `docs/06_audits-and-reports/RPT-004_personal-use-readiness.md`: L1 private online Work OS requires real auth, route protection, and visibly gated dev bypass.
- `docs/02_architecture-and-rules/DBS-001_database-contract.md`: v0.1 uses app-layer authorization and service ownership checks.
- `AUTH-003` implementation: Supabase SSR dependencies are installed, server/browser client helpers exist, Proxy is wired, and server auth now reads verified claims.
- `AUTH-004` implementation: protected dashboard routes redirect unauthenticated users to `/login`, the login form sends magic links only to existing Supabase users, and `/auth/callback` exchanges auth codes for sessions.
- `AUTH-005A` implementation: `/auth/status` resolves the same auth boundary used by dashboard routes, returns 401 for missing config/session, 403 for a verified Supabase email that has no `Profile`, and returns only a safe DTO plus owner-scoped Work project count when authenticated.
- `AUTH-006` implementation: `pnpm auth:proof` runs the no-secret launch readiness check, optionally validates sanitized `/auth/status` evidence from `--status-url` or `--status-json`, and reports whether `AUTH-005` can run without accepting or printing cookie/session secrets.
- `AUTH-002` implementation: dashboard layout, settings, and admin readiness now consume a server-only `ModulePermissionSnapshot` from `UserModulePermission` rows overlaid on role defaults; browser module toggles remain labeled rehearsal controls only.
- `AUTH-008` implementation: the owner-provided email has an OWNER `Profile`, a Supabase Auth invitation has been sent, magic-link request failures are surfaced as `request-failed`, Profile-missing sessions return to `/login?status=supabase_profile_missing`, and `/login` is no longer auto-skipped solely because a Supabase cookie exists.

## Rejected Alternatives

- Keep the existing seeded-admin fallback: rejected because production could silently read/write as the wrong profile.
- Fall back to the first database profile: rejected because identity would depend on row order and database contents.
- Add a full auth provider in the same loop as the safety gate: rejected because provider wiring, route protection, and profile mapping need focused verification.

## Acceptance

- Mock auth is explicit, development-only, and exact-email based.
- Production auth uses Supabase SSR when env and a valid session exist; otherwise it fails closed.
- Work DB routes are request-time dynamic.
- Protected dashboard routes redirect unauthenticated requests to `/login?next=...`.
- Login uses `shouldCreateUser: false` and does not create Supabase users.
- Login reports a generic request failure when Supabase rejects a magic-link request; it does not claim the link was sent unless the provider call succeeds.
- Supabase sessions without a matching `Profile` return to `/login` with a safe Profile-missing status instead of looping between protected dashboard routes and the login page.
- Follow-up Supabase tasks are tracked in the backlog.
- `/auth/status` can be used for private launch smoke without exposing Supabase tokens, cookies, raw JWT claims, internal profile IDs, or cross-user Work data.
- `pnpm auth:proof` can summarize `/auth/status` evidence for loop reports without exposing Supabase URLs/keys, database URLs/hosts, cookies, tokens, raw claims, provider payloads, profile IDs, or actual profile email values.
- Module permission visibility starts from a server-only snapshot and does not rely on silent owner/localStorage defaults for initial dashboard render.
