# Launch Environment Readiness

**Document ID:** `ENV-001`
**Status:** Active for L1 launch proof
**Last updated:** 2026-06-21

## Purpose

Define a no-secret readiness gate for moving Personal OS from `L0_LOCAL_PROTOTYPE` toward `L1_PRIVATE_ONLINE_WORK_OS`.

This gate answers one narrow question:

```txt
Can this environment run real Supabase auth and Prisma-backed Work proof without guessing which launch prerequisite is missing?
```

It does not print Supabase URLs, publishable keys, anon keys, database URLs, database hosts, cookies, tokens, raw claims, or profile IDs.

## Command

Run:

```bash
pnpm launch:check
```

For machine-readable output:

```bash
pnpm launch:check --json
```

For CI or release gates where blockers should fail the command:

```bash
pnpm launch:check:strict
```

For a no-secret proof packet that can be attached to agent-loop evidence:

```bash
pnpm launch:proof
```

For a no-secret Supabase session/Profile proof packet:

```bash
pnpm auth:proof
pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/<auth-status>.json
```

`launch:check:strict` exits with code `1` when any blocker is present. The normal `launch:check` command exits with code `0` so agents can collect evidence even while the environment is blocked.

## Checks

| Check | Why it matters | Secret policy |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` present | Browser/server Supabase clients need the project URL for real auth. | Only prints present/missing. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` present | Supabase SSR auth needs a public client key. | Only prints present/missing. |
| `DATABASE_URL` present and parseable | Runtime Prisma app code uses `DATABASE_URL`. | Does not print URL or host. |
| `DIRECT_DATABASE_URL` or `DATABASE_URL` present and parseable | Prisma CLI/migration checks need a database URL. | Does not print URL or host. |
| Selected database host resolves through DNS | `AUTH-005` and `WORK-007` cannot proceed if the database host is unreachable. | Prints only DNS status/error code. |
| Effective auth mode | Online launch must use Supabase, not development mock auth. | Prints `mock` or `supabase` only. |
| `VERCEL_ENV` present | Confirms the check is running in a deployed environment. | Prints present/missing only. |

## Current Local Result

Loop 11 verified this environment with `pnpm launch:check`:

```txt
Overall: blocked
Supabase public URL: missing
Supabase publishable key: missing
Runtime database URL: present and parseable
Migration database URL: present and parseable
Database host DNS: ENOTFOUND
Auth runtime mode: supabase
Deployment marker: missing in local check
```

This means `AUTH-005` and `WORK-007` should stay blocked until at least the Supabase public env and reachable database host are fixed.

## L1 Gate

`L1_PRIVATE_ONLINE_WORK_OS` requires:

1. `pnpm launch:proof` reports `proofSummary.overallStatus = "ready"` in the intended launch environment.
2. `pnpm launch:check` reports no blocked rows in the intended launch environment.
3. `pnpm launch:check:strict` exits `0` in CI/deployment or an equivalent release check.
4. `/auth/status` is run from a signed-in browser session and reports `authenticated: true` without exposing raw auth internals.
5. `pnpm auth:proof -- --status-json <file>` reports `proofSummary.canRunAuth005 = true` after sanitizing `/auth/status` evidence.
6. `AUTH-005` records a real Supabase user-to-`Profile` mapping.
7. `WORK-007` records Work project/task/note/deliverable refresh proof against the intended DB or an approved disposable DB.

See `docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md` for the full proof packet contract and loop-review checklist.

## Operator Runbook

When `pnpm launch:check` is blocked:

1. If Supabase public env is missing, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the launch environment.
2. If `DATABASE_URL` is missing or invalid, add a runtime PostgreSQL connection string for Prisma.
3. If migration checks need a different direct connection, add `DIRECT_DATABASE_URL` for Prisma CLI usage.
4. If database DNS fails, verify the database host, network allowlist, pooler/direct connection hostname, and local DNS/network access.
5. If auth mode is `mock`, unset `PERSONAL_OS_AUTH_MODE` for launch or ensure the deployed runtime uses Supabase mode.
6. If running locally, expect `VERCEL_ENV` to be missing. Run the same check in the deployed environment before final L1 proof.
7. After blockers clear, sign in through `/login`, open `/auth/status`, and collect `pnpm auth:proof` evidence.
8. After `pnpm auth:proof` reports `canRunAuth005 = true`, run `AUTH-005`.
9. After auth/Profile proof passes, run `WORK-007`.

Do not run `pnpm db:deploy`, `pnpm db:seed`, or any production migration/seed command only because this readiness check says env variables are present. Migration and seed commands still require the separate DB contract rules in `DBS-001` and migration strategy in `MIG-001`.

For the complete no-secret operator handoff across Supabase public env, signed-in `/auth/status` evidence, safe Work proof targets, deployment marker proof, and next-task routing, use `docs/04_playbook/PBK-001_launch-env-unblock-handoff.md`.

## Research Basis

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables): environment variables are configured outside source code and vary by environment.
- [Vercel Environments](https://vercel.com/docs/deployments/environments): local, preview, and production deployment contexts should be treated distinctly.
- [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side): SSR auth stores sessions in cookies and requires SSR-compatible client setup.
- [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client): `@supabase/ssr` is the intended helper path for JavaScript/TypeScript SSR clients.
- [Supabase SSR advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide): SSR sessions rely on cookies and authenticated routes should avoid cache leaks.
- [Supabase `getClaims`](https://supabase.com/docs/reference/javascript/auth-getclaims): server-side auth can verify JWT claims before trusting identity.
- [Prisma migrate deploy](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate): production/staging migrations should use `migrate deploy` through a reviewed deployment path.

## Relationship To Other Tasks

- `ENV-001` unblocks repeatable diagnosis for `AUTH-005` and `WORK-007`.
- `AUTH-006` adds `pnpm auth:proof`, the no-secret bridge between launch env readiness and real `/auth/status` session/Profile evidence.
- `AUTH-005` remains responsible for proving Supabase session to `Profile` mapping.
- `WORK-007` remains responsible for Work refresh proof.
- `AUTH-002` remains responsible for DB-backed or hybrid module permissions.
- `CLIENT-001` is responsible for the gated DB-backed Client Portal token validation and visibility filtering; real token smoke still waits for launch env readiness.
