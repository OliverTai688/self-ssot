# WORK-007 Supabase Verification Attempt

Date: 2026-06-07

Status: `BLOCKED_BY_SUPABASE_DNS`

## Purpose

`WORK-007` is the product-mainline verification task for Work persistence and refresh behavior. After the user explicitly approved updating Supabase, this pass attempted the first safe Supabase connectivity checks before running any migration, seed, or browser write flow.

## Approved Scope

User-approved:

- Supabase may be updated.
- Work v0.1 persistence verification may use the configured Supabase database.

Still prohibited:

- No `prisma migrate reset`.
- No destructive SQL.
- No deletion of existing Supabase data.
- No blind migration deploy without first confirming connectivity and migration status.

## Environment Observed

The project currently has database URLs in both env files:

| Env file | Host | Port | Database |
|---|---|---:|---|
| `.env.local` | `db.dxzjaenslifcjkwzucjj.supabase.co` | `5432` | `postgres` |
| `.env` | `db.dxzjaenslifcjkwzucjj.supabase.co` | `6543` | `postgres` |

`prisma.config.ts` loads `.env.local` first, then `.env`, and uses `DIRECT_DATABASE_URL` when present or `DATABASE_URL` otherwise.

## Checks Run

```bash
pnpm db:validate
pnpm db:generate
pnpm prisma migrate status
```

Additional Node/pg read-only connection probe:

```txt
.env.local: failed host=db.dxzjaenslifcjkwzucjj.supabase.co port=5432 message=getaddrinfo ENOTFOUND db.dxzjaenslifcjkwzucjj.supabase.co
.env: failed host=db.dxzjaenslifcjkwzucjj.supabase.co port=6543 message=getaddrinfo ENOTFOUND db.dxzjaenslifcjkwzucjj.supabase.co
```

## Results

| Check | Result |
|---|---|
| Prisma schema validation | Passed |
| Prisma client generation | Passed |
| Prisma migrate status | Failed before migration status because the Supabase host could not be reached |
| Direct Node/pg read-only probe | Failed with DNS `ENOTFOUND` for both configured ports |

## Decision

Do not run `pnpm db:deploy` yet.

Reason:

The environment cannot resolve the configured Supabase host, so migration state is unknown. Running deploy without a successful status check would not be reviewable and could make the failure mode harder to diagnose.

## WORK-007 Status

`WORK-007` remains incomplete and is marked `BLOCKED` for the current environment.

The task can resume when one of these is true:

- The Supabase host resolves from this environment.
- A valid updated Supabase database URL is provided.
- A disposable local PostgreSQL URL is provided for Work refresh proof.

## Recommended Next Step

Resolve Supabase DNS/connectivity first, then run:

```bash
pnpm prisma migrate status
pnpm db:deploy
pnpm db:seed
pnpm build
```

Only after Supabase schema and seed are confirmed should the browser Work CRUD refresh flow be verified.
