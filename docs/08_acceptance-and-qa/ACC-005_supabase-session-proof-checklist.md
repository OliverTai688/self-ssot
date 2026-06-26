# Supabase Session Proof Checklist

**Document ID:** `ACC-005`
**Last updated:** 2026-06-21
**Status:** Active for `AUTH-006`

## Purpose

Define the no-secret Supabase session proof package that prepares `AUTH-005`.

`AUTH-006` does not prove a real browser session by itself. It creates the repeatable proof collector and checklist so that, once Supabase public env and a signed-in browser session are available, `AUTH-005` can immediately record session-to-`Profile` mapping and Work owner access without exposing auth internals.

## Command

Collect local auth proof with launch readiness only:

```bash
pnpm auth:proof
```

Write proof into a loop evidence path:

```bash
pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<proof-file>.json
```

Probe an `/auth/status` endpoint without sending cookies:

```bash
pnpm auth:proof -- --status-url https://<deployment-host>/auth/status
```

Validate a saved `/auth/status` JSON response from a signed-in browser session:

```bash
pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/<auth-status>.json
```

The `--status-url` mode is useful for unauthenticated/config checks. A real browser session proof usually requires `--status-json`, because Supabase SSR sessions live in browser/server cookies and the CLI must not accept or print raw cookie values.

## Proof Packet Contract

`pnpm auth:proof` writes JSON with:

| Field | Meaning |
|---|---|
| `schemaVersion` | Proof packet format version. |
| `generatedAt` | Proof collection timestamp. |
| `sourceCommands.readiness` | Underlying launch readiness command. |
| `sourceCommands.authStatus` | Whether auth status evidence came from no input, status URL, or status JSON. |
| `secretPolicy` | Values the proof packet must not print. |
| `readiness` | No-secret output from `pnpm launch:check --json`. |
| `authStatusEvidence` | Sanitized `/auth/status` summary. |
| `proofSummary.launchAuthPrereqsReady` | Whether Supabase public env and Supabase auth mode are ready. |
| `proofSummary.authStatusReady` | Whether `/auth/status` proves authenticated Supabase/Profile/Work owner mapping. |
| `proofSummary.canRunAuth005` | Whether `AUTH-005` can be executed from the evidence. |
| `proofSummary.canProceedToWork007` | Whether auth proof plus DB readiness make Work proof eligible. |
| `proofSummary.blockedLabels` | Remaining auth/session blockers. |
| `nextActions` | De-duplicated next operator actions. |

## Secret And Privacy Policy

The proof packet must not print:

- Supabase URLs
- Supabase publishable keys or anon keys
- Database URLs
- Database hosts
- Cookies
- Tokens
- Raw auth claims
- Raw provider payloads
- Profile IDs
- Actual profile email values

It may print safe booleans, status labels, HTTP status codes, auth mode labels, profile-email presence, profile role, owner-scoped Work project count, and next-action text.

## Passing Criteria

`AUTH-006` is complete when:

- `scripts/collect-auth-session-proof.mjs` exists and is exposed as `pnpm auth:proof`.
- The command always runs `pnpm launch:check --json` as its no-secret launch prerequisite source.
- The command can optionally accept either `--status-url` or `--status-json`, but not both.
- `--status-url` only accepts `http(s)` URLs whose path is exactly `/auth/status`.
- Auth status evidence is sanitized before being written to proof JSON.
- A passing auth proof requires:
  - Supabase public URL present.
  - Supabase publishable or legacy anon key present.
  - effective auth mode is `supabase`.
  - `/auth/status` reports `authenticated: true`.
  - `/auth/status` reports `authMode: "supabase"`.
  - `/auth/status` reports `supabasePublicConfig: "configured"`.
  - `/auth/status` reports `authStatus: "authenticated"`.
  - profile email is present, without writing the actual email value into the proof.
  - profile role is present.
  - owner-scoped Work project count is present.
- The command does not mutate auth provider state, environment variables, database rows, sessions, cookies, profile rows, or Work records.

## Relationship To AUTH-005

`AUTH-006` prepares proof collection. It does not replace `AUTH-005`.

Resume `AUTH-005` when:

1. `pnpm launch:proof` reports Supabase public env is ready.
2. A real browser session is signed in through `/login`.
3. `/auth/status` returns authenticated Supabase/Profile/Work owner evidence.
4. `pnpm auth:proof -- --status-json <file>` reports `proofSummary.canRunAuth005 = true`.

## Research Basis

- Local auth runtime strategy: `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`.
- Local launch environment gate: `docs/02_architecture-and-rules/ENV-001_launch-environment-readiness.md`.
- Local launch proof checklist: `docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md`.
- Supabase SSR client setup: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase `getClaims` reference: https://supabase.com/docs/reference/javascript/auth-getclaims
- Supabase SSR advanced guide: https://supabase.com/docs/guides/auth/server-side/advanced-guide
