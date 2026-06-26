# Launch Environment Unblock Handoff

**Document ID:** `PBK-001`
**Status:** Active
**Last updated:** 2026-06-21
**Task:** `ENV-002`

## Purpose

This playbook converts the repeated launch blockers into one no-secret operator handoff.

Use it when `pnpm launch:proof`, `pnpm auth:proof`, or `pnpm work:proof` reports that Personal OS cannot yet move from `L0_LOCAL_PROTOTYPE` to `L1_PRIVATE_ONLINE_WORK_OS`.

The goal is not to store secrets in the repo. The goal is to produce enough safe evidence to resume:

- `AUTH-005` - Supabase user to `Profile` mapping and Work owner smoke.
- `WORK-009` - disposable Work refresh proof run.
- `WORK-007` - full Work browser/manual refresh verification.

## Current Blocker Shape

Loop 25 proved the current environment is blocked by:

| Area | Current blocker | Next evidence needed |
|---|---|---|
| Supabase public env | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are missing locally. | `pnpm launch:proof` from the intended environment reports no Supabase public env blockers. |
| Auth session | No signed-in `/auth/status` evidence exists. | A saved safe `/auth/status` JSON plus `pnpm auth:proof -- --status-json <file>` reports `canRunAuth005=true`. |
| Work proof target | No explicit local/disposable `WORK_PROOF_DATABASE_URL` exists. | `pnpm work:proof -- --run` passes against a disposable target and cleans up proof records. |
| Deployment marker | Local proof cannot prove deployment context. | `pnpm launch:proof` is run in the deployed environment or an approved equivalent launch runner. |

## Secret Policy

Never paste these values into formal docs, generated reports, chat, issue bodies, screenshots, or command output:

- Supabase URLs
- Supabase publishable keys, anon keys, secret keys, or service-role keys
- Database URLs or database hosts
- Cookies
- Tokens
- Raw auth claims
- Raw provider payloads
- Profile IDs
- Actual profile email values
- Valuable production database identifiers

Safe evidence may include only:

- present/missing status
- status labels
- HTTP status codes
- auth mode labels
- profile email presence, not the email value
- profile role
- owner-scoped Work project count
- proof command output paths
- blocked labels and next-action text

## Operator Sequence

### Step 0 - Pick A Target

Name the target before collecting proof:

| Target | Use when | Can claim L1? |
|---|---|---|
| `local` | Rehearsal and script sanity checks. | No. Local checks normally lack a deployment marker. |
| `preview` | First online proof run. | Maybe, if auth, DB, and Work proof also pass. |
| `production` | Final private owner launch proof. | Yes, after all proof gates pass. |
| `disposable-db` | Work persistence proof without risking a valuable DB. | Supports Work proof only; does not prove deployed auth by itself. |

Do not run Work proof or migrations against a valuable database unless the task explicitly allows it and human approval is present.

### Step 1 - Configure Supabase Public Env

For the intended launch target, configure:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Legacy projects may use `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but new setup should prefer the publishable key.

Verify without printing values:

```bash
pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-proof.json
```

Passing condition for this step:

```txt
proofSummary.blockedLabels does not include:
- Supabase public URL
- Supabase publishable key
```

### Step 2 - Verify Runtime Database Readiness

For the app runtime, configure a Prisma-compatible PostgreSQL URL as:

```txt
DATABASE_URL
```

For reviewed migration paths, configure:

```txt
DIRECT_DATABASE_URL
```

`DIRECT_DATABASE_URL` may equal `DATABASE_URL` for disposable/local proof, but do not use that shortcut for a valuable production database without DB migration review.

Verify without printing values:

```bash
pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-proof.json
```

Passing condition for this step:

```txt
proofSummary.canRunWork007 = true
```

This means the DB side is eligible for proof. It does not authorize writes against a valuable database.

### Step 3 - Prove Deployment Context

Local proof can prepare the launch but cannot claim final online readiness. For Vercel, final proof should run in an environment where `VERCEL_ENV` is present.

Useful Vercel commands:

```bash
vercel env pull --environment=preview
vercel env pull --environment=production
vercel env run -e preview -- pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/preview-launch-proof.json
vercel env run -e production -- pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/production-launch-proof.json
```

`vercel env run` is useful because it runs a command with project environment variables without writing them to a repo file. Treat it as environment-variable proof. For final deployment-marker proof, prefer an actual deployed/CI runtime where Vercel system variables are present.

Passing condition for this step:

```txt
proofSummary.canClaimL1 = true
```

If `canClaimL1=false` only because of `Deployment marker`, keep the level below L1 until proof is run from the intended deployed environment.

### Step 4 - Collect Signed-In Auth Status Evidence

After Supabase public env is present:

1. Open the intended app target in a browser.
2. Sign in through `/login`.
3. Open `/auth/status` in the same signed-in browser session.
4. Save the JSON response to an evidence path, for example:

```txt
docs/2_agent-input/generated/agent-loop/reports/manual-auth-status-YYYYMMDD.json
```

Before saving, inspect the JSON. It must not include cookies, tokens, raw claims, provider payloads, profile IDs, actual email values, or secrets.

Validate the saved evidence:

```bash
pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/manual-auth-status-YYYYMMDD.json --out docs/2_agent-input/generated/agent-loop/reports/<target>-auth-proof.json
```

Passing condition for this step:

```txt
proofSummary.canRunAuth005 = true
proofSummary.canProceedToWork007 = true
```

If `/auth/status` returns `supabase_profile_missing`, do not auto-create a profile from the proof command. Resume an approved auth/profile task instead.

### Step 5 - Run Disposable Work Proof

Use `WORK-009` only with an explicit local/disposable DB target.

Dry-run first:

```bash
pnpm work:proof -- --json
```

Run proof against a local/disposable database:

```bash
WORK_PROOF_DATABASE_URL="postgresql://..." \
PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1 \
PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA \
pnpm work:proof -- --run --out docs/2_agent-input/generated/agent-loop/reports/<target>-work-proof.json
```

For a remote disposable database, also require:

```txt
PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE=1
```

Passing condition for this step:

```txt
status = "passed"
mode = "run"
cleanup.cleanup = "passed"
```

Dry-run output is useful preflight evidence, but it is not Work persistence proof.

### Step 6 - Resume Launch Tasks

Use this routing table after proof:

| Evidence state | Next task |
|---|---|
| `auth:proof` has `canRunAuth005=true` | Resume `AUTH-005`. |
| `work:proof -- --run` passed against disposable/local DB | Mark `WORK-009` done and consider `WORK-007` browser proof. |
| Real signed-in session plus safe DB/browser target exist | Resume `WORK-007`. |
| Proof still blocked by env/session/target | Do not repeat env docs; run `AGENT-005` or the next shortest safe blocker task. |
| Loop 30 reached without target level | Run `LOOP-030` and switch to convergence if needed. |

## Pass/Fail Interpretation

| Command | Passing launch signal | Blocking signal |
|---|---|---|
| `pnpm launch:proof` | `overallStatus=ready`, `canRunAuth005=true`, `canRunWork007=true`, `canClaimL1=true` in intended target. | Any `blockedLabels`, or `canClaimL1=false` in final target. |
| `pnpm auth:proof` | `canRunAuth005=true` and `canProceedToWork007=true`. | Missing Supabase public env, missing auth status evidence, unauthenticated status, or incomplete Profile/Work mapping. |
| `pnpm work:proof -- --json` | Dry-run `ready_for_review` means the harness is safe and wired. | Dry-run only; no persistence proof yet. |
| `pnpm work:proof -- --run` | `status=passed` with cleanup passed. | Any write safety refusal, failed refresh marker, or failed cleanup. |
| `pnpm db:validate` | Prisma schema is valid. | Schema validation errors. |

## Stop Rules

Stop and ask before:

- applying migrations to a valuable DB
- running `pnpm db:seed` against non-disposable data
- using a Supabase `service_role` key in browser or generated evidence
- creating profiles automatically from auth proof
- enabling public Client Portal DB output for real clients
- running Work proof against production or client data
- pasting raw `/auth/status` output that contains disallowed fields

## Research Basis

- Local launch gate: `docs/02_architecture-and-rules/ENV-001_launch-environment-readiness.md`
- Local launch proof checklist: `docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md`
- Local auth proof checklist: `docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md`
- Local Work proof harness: `docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md`
- Supabase SSR setup: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel CLI env command: https://vercel.com/docs/cli/env
- Vercel environments: https://vercel.com/docs/deployments/environments
- Vercel system environment variables: https://vercel.com/docs/environment-variables/system-environment-variables
- Prisma Migrate deployment guidance: https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
- Prisma development and production workflow: https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production

## Operator Handoff Checklist

- [ ] Target is named: `local`, `preview`, `production`, or `disposable-db`.
- [ ] Supabase public env is configured in the intended target.
- [ ] Runtime DB URL is configured and proof shows DB readiness.
- [ ] Deployment marker is proven in the intended online environment.
- [ ] Browser sign-in through `/login` succeeds.
- [ ] `/auth/status` evidence is saved after checking the secret policy.
- [ ] `pnpm auth:proof -- --status-json <file>` reports `canRunAuth005=true`.
- [ ] A safe local/disposable `WORK_PROOF_DATABASE_URL` exists, or Work proof stays blocked.
- [ ] `pnpm work:proof -- --run` passes only against a safe target.
- [ ] Next task is routed to `AUTH-005`, `WORK-009`, `WORK-007`, or `AGENT-005`.
