# Auth Runtime Strategy

**Document ID:** `AUT-002`
**Status:** Active for v0.1 launch hardening
**Last updated:** 2026-07-27

## 2026-09-15 Owner direction — Email OTP only (planned cutover)

The owner now requires emailed six-digit verification codes for the three Yuanzhan accounts; Magic Link and Google are not the selected sign-in experience. [AUT-009](AUT-009_yuanzhan-email-otp-account-boundary.md) and [PLN-071](../05_execution-plans/PLN-071_yuanzhan-account-and-private-launch-plan.md) define the proposed cutover, account/membership separation and rollout proof. Existing runtime below still includes the older entry points; no auth/provider change has been applied by this planning task. Fixed demo/dev credentials must not authorize the future formal company runtime.

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
- `src/lib/auth/dev-otp.ts` defines the localhost-only fixed-code development OTP bridge, including the default `123456` code, httpOnly cookie name, production guard, and local-origin guard.
- `src/lib/auth/redirect.ts` normalizes auth redirect targets, blocks external/open redirects, and can carry a safe login status code for auth-resolution handoff.
- `src/app/(auth)/login/page.tsx` renders the public login entry, the two-step six-digit email OTP form, the existing magic-link alternative, and safe status messages for request failure, invalid/expired OTP, missing Supabase session, and missing Profile mapping.
- `src/components/auth/auth-submit-button.tsx` uses React 19 `useFormStatus()` so send, verify, resend, and magic-link submissions show a pending state and cannot be submitted repeatedly while the current Server Action is pending.
- `src/app/actions/auth.ts` sends passwordless emails with `shouldCreateUser: false`, verifies six-digit email OTPs through `verifyOtp({ email, token, type: "email" })`, supports the localhost-only `123456` development bridge before provider verification, writes the resulting Supabase SSR session only through the cookie-backed server client, and normalizes the protected `next` path before redirecting.
- `src/app/auth/callback/route.ts` exchanges Supabase auth codes for cookie-backed sessions.
- `src/app/auth/status/route.ts` exposes a no-store readiness endpoint for auth/Profile/Work owner smoke checks without returning tokens, cookies, raw claims, or profile IDs.
- `src/lib/supabase/env.ts` resolves the public Supabase runtime config and returns `null` when env is incomplete.
- `src/lib/supabase/client.ts` creates the browser client for future Client Components.
- `src/lib/supabase/server.ts` creates a per-request server client using Next cookies.
- `src/lib/supabase/proxy.ts` refreshes/validates the auth cookie through `supabase.auth.getClaims()`.
- `src/proxy.ts` is the single Next.js 16 Proxy entrypoint and redirects protected dashboard paths to `/login?next=...` when unauthenticated; it allows the localhost-only dev OTP cookie to reach the dashboard layout so `requireUser()` can still perform Profile mapping, and it does not redirect `/login` based solely on a Supabase cookie before Profile mapping is proven.
- `src/app/(dashboard)/layout.tsx` performs a server-side user check before rendering the dashboard shell and forwards missing-session/Profile status to `/login`.
- `src/lib/services/auth.service.ts` uses `getClaims()` in Supabase mode and maps the verified claims email to an existing `Profile`.

If Supabase env is incomplete, the Supabase path returns no user and Proxy passes the request through without refresh. This preserves fail-closed auth behavior while allowing local builds before auth credentials are configured.

Remaining implementation tasks:

1. `AUTH-005` verifies the Supabase user-to-Profile mapping against a real auth session, confirms owner Work access, and records the launch smoke test. `AUTH-005A` added `/auth/status` so the real-session smoke has a single repeatable BFF endpoint; `AUTH-006` added `pnpm auth:proof` so launch readiness and sanitized `/auth/status` evidence can be collected without storing cookies, tokens, raw claims, provider payloads, profile IDs, or actual profile email values. `AUTH-008` configured the owner Profile allowlist, sent the Supabase Auth invitation, and tightened login/Profile-missing error handling. The full smoke now remains blocked only by owner Manual Ops signed-in `/auth/status` evidence. Automatic profile provisioning remains out of scope until the real mapping is verified.
2. Permission writes remain a follow-up. `AUTH-002` is complete as a hybrid read-model slice; `AUT-003_module-permission-source.md` defines the current DB-row overlay, role default fallback, browser rehearsal override, and no-write boundary.

## AUTH-010 Email OTP Runtime

The owner login entry supports two passwordless paths for an existing Supabase Auth user:

```txt
Email + send code
  -> signInWithOtp({ shouldCreateUser: false })
  -> hosted Magic Link / OTP email template renders {{ .Token }}
  -> user enters six digits on /login
  -> verifyOtp({ email, token, type: "email" })
  -> Supabase SSR client writes the session cookie
  -> normalizeNextPath(next)
  -> protected dashboard layout + requireUser() + Profile mapping
```

The existing magic-link path remains available and uses the same Supabase passwordless email request. Supabase uses one hosted `Magic Link or OTP` template for both paths. To keep both sign-in methods in the same email, the hosted template must include both variables:

```html
<h2>Personal OS 登入</h2>
<p>你的六碼驗證碼：</p>
<p style="font-size: 28px; letter-spacing: 0.3em; font-weight: 700;">{{ .Token }}</p>
<p>或使用一次性登入連結：</p>
<p><a href="{{ .ConfirmationURL }}">登入 Personal OS</a></p>
<p>如果不是你要求登入，請忽略這封信。</p>
```

Hosted Supabase projects configure this under `Authentication -> Email Templates -> Magic Link`. Application code cannot detect the active hosted template, so actual receipt of a six-digit code remains an owner/browser/provider verification item until the template is inspected and one real email is received.

Security rules:

- Email and token are validated server-side; the token must be exactly six digits.
- Request and verification errors are user-safe and do not log email addresses or OTP values.
- `shouldCreateUser: false` remains mandatory; the login surface never provisions an Auth user or a Personal OS `Profile`.
- The verification action uses the public Supabase SSR client only. It does not use a service-role key, Prisma, or an application DB write.
- The redirect target always passes through `normalizeNextPath()` so an OTP cannot be used to create an open redirect.
- Supabase rate limits and expiry remain provider-controlled. The UI tells the owner to wait before resend and supports an explicit resend action.
- A valid Supabase session without a matching `Profile` still fails closed at the existing dashboard/Profile boundary.

Selected pattern: a server-action two-step OTP flow using the existing cookie-backed Supabase SSR client, with the existing magic link retained as an alternate entry.

Rejected alternatives:

- Custom service-role token generation plus application-owned email delivery. Rejected because it expands secret handling, provider mutation, and account-enumeration risk.
- Client-only OTP verification. Rejected because the existing server client already owns session-cookie writes and protected redirect normalization.
- Automatically creating unknown users. Rejected because Personal OS requires an explicit Auth user plus matching allowlisted `Profile`.
- Replacing magic link entirely. Rejected because the owner asked for an additional login method and the existing path is still a useful recovery option.

Provider references:

- Supabase passwordless email login: <https://supabase.com/docs/guides/auth/auth-email-passwordless>
- Supabase `signInWithOtp`: <https://supabase.com/docs/reference/javascript/auth-signinwithotp>
- Supabase `verifyOtp`: <https://supabase.com/docs/reference/javascript/auth-verifyotp>
- Supabase email templates: <https://supabase.com/docs/guides/auth/auth-email-templates>

## AUTH-011 Local Development Fixed OTP Bridge

To unblock owner UI work when provider email delivery is unavailable, localhost development may use the fixed six-digit code `123456`.

```txt
/login on localhost
  -> email + token 123456
  -> verifyEmailOtp()
  -> non-production + localhost guard
  -> if browser form state dropped email, use PERSONAL_OS_DEV_USER_EMAIL or the first PERSONAL_OS_TEAM_PROFILES email
  -> httpOnly personal_os_dev_otp_email cookie
  -> src/proxy.ts lets the protected request reach the dashboard layout
  -> resolveCurrentUser() maps the cookie email to an existing Profile
  -> requireUser() succeeds only if that Profile exists
```

Security rules:

- The bridge is disabled when `NODE_ENV=production`.
- By default it is allowed only on localhost / `127.0.0.1` / `::1`. Non-local development usage requires the explicit `PERSONAL_OS_DEV_OTP_ENABLED=1` override.
- `PERSONAL_OS_DEV_OTP_CODE` may override the default local code, but production still cannot enable fixed-code login.
- If browser form state drops the query-string email, the fixed-code path may use `PERSONAL_OS_DEV_USER_EMAIL` or the first email in `PERSONAL_OS_TEAM_PROFILES` as a local-only fallback.
- The cookie is httpOnly, same-site `lax`, path `/`, and short-lived.
- The bridge never creates Supabase Auth users, Supabase sessions, Personal OS `Profile` rows, Prisma writes, service-role calls, public output, or launch-level proof.
- Formal private online proof still requires the real Supabase session/Profile mapping path in `AUTH-005`.

## AUTH-012 Google OAuth Allowlisted Sign-In

Personal OS is multi-tenant at the `Profile` level: every service filters by `requireUser().profileId`, so a distinct `Profile` per person already gives that person an independent Personal OS (own Work projects, Research threads, AI Input sources, etc.), separate from `WorkspaceMemberRole`, which only governs shared TEAM workspace collaboration. `AUTH-012` adds Google as a third sign-in method on top of that, restricted to a fixed allowlist instead of open sign-up.

```txt
/login "使用 Google 登入" button
  -> Link to /auth/google?next=... (Route Handler)
  -> supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })
  -> Google consent screen
  -> /auth/callback?code=...
  -> exchangeCodeForSession(code)
  -> if this session's provider is "google":
       -> email in PERSONAL_OS_TEAM_PROFILES?
            yes -> ensureGoogleAllowlistedProfile() creates the Profile on first login (role from the env entry), request continues to `next`
            no  -> supabase.auth.signOut({ scope: "local" }), redirect to /login?status=google_not_allowed
  -> requireUser() + Profile mapping (unchanged)
```

Why an app-level allowlist is required: unlike the existing `signInWithOtp({ shouldCreateUser: false })` path, Supabase OAuth has no "don't create a new user" option — any Google account that completes consent gets a Supabase Auth user. `/auth/callback` is therefore the fail-closed boundary for Google specifically, gated on `user.app_metadata.provider === "google"` (or `"google"` present in `app_metadata.providers`) so magic-link/OTP sessions are never re-checked against this list.

Key files:

- `src/lib/auth/team-profiles.ts` parses `PERSONAL_OS_TEAM_PROFILES` (`email:ROLE:Full Name`, comma-separated) into the shared allowlist/role source of truth, used by both `scripts/provision-team-profiles.ts` and the runtime gate.
- `src/lib/services/auth.service.ts` exports `ensureGoogleAllowlistedProfile(email)`: returns `false` for any email not in `PERSONAL_OS_TEAM_PROFILES`; for an allowlisted email it creates the `Profile` (using that entry's role) only if one does not already exist — it never updates an existing Profile's role/name, so a manually curated Profile is never silently overwritten by a stale env value.
- `src/app/auth/callback/route.ts` runs the provider check, the allowlist gate, and the sign-out-on-reject path.
- `src/app/auth/google/route.ts` (Route Handler, not a Server Action) requests the Google OAuth URL from the cookie-backed Supabase SSR client and redirects to it. A Route Handler is used instead of a Server Action so the PKCE code-verifier cookie write and the 302 to Google happen on one plain HTTP response — the same primitive `/auth/callback` already relies on, and the pattern Supabase's own Next.js SSR OAuth guide uses. An initial Server Action implementation (`signInWithGoogle`) round-tripped to `/login?status=invalid-callback` on localhost and was replaced by this Route Handler during same-day verification.
- `src/app/(auth)/login/page.tsx` renders the "使用 Google 登入" button (disabled when Supabase env is missing) plus `google-request-failed` / `google_not_allowed` status messages.
- `scripts/provision-team-profiles.ts` still upserts `Profile` rows (including role updates) for anyone who needs a Profile before their first Google login, or for the magic-link/OTP path, which still requires a manual Supabase Auth Users invite.

Manual provider setup remains outside application code:

1. **Google Cloud Console**: create an OAuth 2.0 Client ID (Web application). Authorized redirect URI is Supabase's fixed callback, `https://<project-ref>.supabase.co/auth/v1/callback` — not this app's `/auth/callback`. While the OAuth consent screen stays in "Testing" publishing status, add exactly the allowlisted emails as test users; this blocks every other Google account at Google's own consent screen, in addition to the app-level gate below.
2. **Supabase Dashboard**: Authentication -> Providers -> Google -> paste the Client ID/Secret and enable the provider. No new Supabase "Redirect URLs" entry is needed beyond what the existing magic-link flow already requires, since Google OAuth reuses the same `/auth/callback` origin.
3. **Env**: set `PERSONAL_OS_TEAM_PROFILES` in every environment that should accept Google sign-in (it is `.env.local`-only by default; a deployed environment such as Vercel needs the same variable set separately).

Rejected alternatives:

- A separate `PERSONAL_OS_GOOGLE_ALLOWED_EMAILS` env var. Rejected because it would duplicate `PERSONAL_OS_TEAM_PROFILES` and risk the two lists drifting apart; reusing one list keeps "who has a Personal OS Profile" and "who can use Google login" the same question.
- Deleting the unauthorized Supabase Auth user via a service-role admin call when the allowlist check fails. Rejected: it would introduce a new secret (`SUPABASE_SERVICE_ROLE_KEY`) this codebase does not otherwise hold, for a low-severity residual (an orphaned Auth user with no Profile can never pass `requireUser()`). Signing the session out is sufficient.
- Gating on a `method=google` query flag set by the OAuth kickoff instead of `user.app_metadata.provider`. Rejected because the verified session's own `app_metadata` cannot be forged by the client, while a query parameter could be stripped or added on the request.
- Auto-creating a personal `Workspace` + `WorkspaceMembership` alongside the `Profile`. Rejected for this slice: Work/Project isolation already holds through `Project.ownerId` scoping without a `Workspace` row (see `getWorkspaceProjectIndexForProfile`'s legacy-personal-compatibility path), and creating `Workspace` rows automatically was out of scope for the requested change; TEAM workspace creation remains a separate, explicit, OWNER-only action.

## AUTH-013 Demo Account Login

A fourth sign-in path, added on explicit owner request for the public launch: one fixed email + six-digit code pair that signs in without a real Supabase session, in every environment including production. It is deliberately separate from `src/lib/auth/dev-otp.ts`'s bridge above: that bridge is a developer convenience which stays hard-disabled in production and defaults to localhost only, and that invariant is not touched by this feature. The demo account is instead a conscious product decision (a public "try it" account with fixed, isolated demo data), so it gets its own env vars, its own cookie, and its own guard:

```txt
PERSONAL_OS_DEMO_LOGIN_EMAIL=test@yzedtech.com
PERSONAL_OS_DEMO_LOGIN_CODE=123456
```

```txt
/login "示範帳號" form (email + 6-digit token, both typed, not pre-filled)
  -> verifyEmailOtp() Server Action
  -> isDemoLoginCredential(email, token)?
       yes -> httpOnly personal_os_demo_email cookie (secure in production)
       no  -> falls through to the existing dev-otp check, then real supabase.auth.verifyOtp
  -> src/proxy.ts lets the cookie reach protected routes in every environment (not localhost-gated)
  -> resolveDemoLoginCurrentUser() re-validates the cookie against the CURRENT env config, then maps the email to an existing Profile
  -> requireUser() succeeds only if that Profile exists
```

Both env vars must be set (email format + exactly six digits) or the feature is off: the login page hides the demo form (`isDemoLoginConfigured()`), the Server Action falls through past the demo check, and `src/proxy.ts`/`resolveDemoLoginCurrentUser()` never trust a leftover cookie. Unsetting either var later immediately revokes every existing demo cookie, since the cookie is re-checked against live config on every request instead of being trusted on its own.

Data isolation: `prisma/seed.ts`'s `DEMO_PROFILE_EMAIL` now points at `test@yzedtech.com`, so the existing deterministic seeded Work dataset (projects/tasks/notes/deliverables) belongs to this account's own `Profile`/`Workspace`, not a real person's. Because every other module also scopes by `requireUser().profileId`, no other signed-in account (Google-allowlisted or otherwise) can see this demo content, and the demo account cannot see anyone else's data.

### Prototype Module Isolation (same-day follow-up)

The gap above ("every other account is blank" held only for Work) was closed the same day, on explicit owner direction, for every prototype module's illustrative seed content:

```txt
src/app/(dashboard)/layout.tsx (Server Component, already calls resolveCurrentUser())
  -> isDemoAccount = currentUser.email === getDemoLoginConfig()?.email
  -> <DemoAccountProvider isDemoAccount>            (new: exposes the flag to deep client pages)
  -> <MockDataModeProvider defaultEnabled={isDemoAccount}>   (AI Input / ingestion / library-classification)
  -> <ResearchProvider allowMockSeed scopeId={email}>        (Research)
  -> <WorkflowProvider allowMockSeed>                        (Workflow)
  -> <LifeProvider allowMockSeed>                            (Life)
```

Scope evaluated and applied:

- **AI Input** already fully gated every mock/formal branch behind `useMockDataMode()`; only `MockDataModeProvider`'s default needed to change from unconditional `true` to `isDemoAccount` (respecting any explicit prior localStorage toggle either way).
- **Research** (`src/lib/context/research-context.tsx`) persists 17 separate localStorage-backed lists, each previously seeding from a `mock*` array on first visit for every account. Now: (a) a stored value always wins over the seed regardless of account (it is that account's own prior edit), (b) an empty/first-visit store only seeds from the mock array when `allowMockSeed` is true, and (c) every key is namespaced by `scopeId` (the signed-in email), so two different real accounts sharing one browser no longer read or overwrite each other's prototype state.
- **Workflow** and **Life** hold their illustrative rows in plain in-memory `useState` (no localStorage) — gated the initial seed value only. `Life`'s `MonthlyPlan` is a single required object (weight/calorie/water targets), not a list; there is no safe "blank" shape without making the type nullable and updating every consumer, so it is left as the generic template for every account for now and called out as a residual gap.
- **Chamber, Finance, Company** are static illustrative arrays defined directly in their `page.tsx` (no context, no persistence at all — literally the same hardcoded rows for every viewer previously). Gated `records`/`agentProposals`/`auditRows` behind `useIsDemoAccount()`; left `settings` rows (real configurable module boundaries, e.g. "自動確認入帳" locked off) and Company's `readinessRows`/`boundaryRows` (accurate statements about the module's actual implementation/safety state, not fictional content) unconditional. `ModuleOperatingShell` already renders a graceful empty state ("尚無記錄。") for an empty `records` list, so no new empty-state UI was needed.
- Not touched, flagged as a smaller residual gap: `src/components/research/pub-timeline.tsx`, `src/components/research/idea-inbox.tsx`, and `src/lib/services/mock-ai.service.ts` still import `mockProjectsFull`/`mockPulseSourceMeta`/`mockProjectTimelines` from `src/lib/mock/work` directly (a project-name picker and AI prompt context, not a top-level data display); these were judged lower-risk/lower-visibility than the module pages above and left for a follow-up pass rather than expanding this change further.

This pass added no Prisma schema/migration change, no new persisted server-side storage, and no new secret; it only changed which already-existing client-side illustrative content renders for which account.

Key files:

- `src/lib/auth/demo-login.ts` — config getter (`getDemoLoginConfig`/`isDemoLoginConfigured`), credential check (`isDemoLoginCredential`), and cookie encode/decode that re-validates against live env on every read.
- `src/app/actions/auth.ts` — `verifyEmailOtp` checks `isDemoLoginCredential` (after the dev-otp check, before falling through to real Supabase `verifyOtp`) and sets the dedicated cookie; `signOut` clears it.
- `src/lib/services/auth.service.ts` — `resolveDemoLoginCurrentUser()` runs in the resolution chain between the dev-otp check and the Supabase path, in every environment, gated only on `isDemoLoginConfigured()`.
- `src/proxy.ts` — lets the demo cookie reach protected routes, independent of the localhost-only dev-otp guard.
- `src/app/(auth)/login/page.tsx` — renders a "示範帳號" card only when `isDemoLoginConfigured()` is true; the code is never pre-filled or sent to the client, unlike the dev-otp box.
- `prisma/seed.ts` — `DEMO_PROFILE_EMAIL = "test@yzedtech.com"`; ids are deterministic and independent of the owning email, so a future email change re-parents the same rows on the next `pnpm db:seed` instead of duplicating them (though pre-existing rows created before the deterministic-id scheme, with random ids, are not touched by that re-parenting — see the loop-176+ evidence report for this task).

Rejected alternatives:

- Loosening `src/lib/auth/dev-otp.ts`'s `NODE_ENV !== "production"` guard for this one email instead of building a separate mechanism. Rejected because that guard is a documented, load-bearing invariant (AUTH-011) that other code and docs assume holds unconditionally; a parallel mechanism keeps that invariant provably untouched.
- Reusing the dev-otp cookie/env pair for the demo account. Rejected for the same reason, plus it would make "disable local dev bypass" and "disable public demo login" the same on/off switch when they are different product decisions.
- Pre-filling the demo code into the rendered page, the way the dev-otp box pre-fills `123456` for a developer who already knows it. Rejected by default: a public demo account's credentials should be handed out deliberately (e.g. in a sales conversation) rather than self-service-discoverable by anyone who opens `/login`.
- Adding a second, duplicate seed profile instead of repointing `DEMO_PROFILE_EMAIL`. Rejected because the mock project/task/note/deliverable ids are already deterministic and email-independent, so repointing is a clean one-line change instead of new seed logic.

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
