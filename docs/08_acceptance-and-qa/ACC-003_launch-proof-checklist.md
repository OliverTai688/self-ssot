# Launch Proof Checklist

**Document ID:** `ACC-003`
**Last updated:** 2026-06-21
**Status:** Active for launch-level reviews

## Purpose

Define the no-secret proof package needed before Personal OS can move from `L0_LOCAL_PROTOTYPE` toward `L1_PRIVATE_ONLINE_WORK_OS`.

This checklist does not deploy, mutate environment variables, run migrations, seed data, or write to production. It turns environment readiness into a repeatable evidence packet for `AUTH-005`, `WORK-007`, and fifth-loop launch reviews.

## Commands

Collect a local proof packet:

```bash
pnpm launch:proof
```

Write proof into a specific evidence path:

```bash
pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<proof-file>.json
```

Check the strict release gate:

```bash
pnpm launch:check:strict
```

When local or deployment prerequisites are still blocked, `pnpm launch:check:strict` should exit nonzero. That is expected evidence, not a reason to run migrations or seed commands.

Collect Supabase session/Profile proof readiness:

```bash
pnpm auth:proof
pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/<auth-status>.json
```

## Proof Packet Contract

`pnpm launch:proof` writes JSON with:

| Field | Meaning |
|---|---|
| `schemaVersion` | Proof packet format version. |
| `generatedAt` | Proof collection timestamp. |
| `sourceCommand` | Underlying readiness command. |
| `secretPolicy` | Values that the proof packet must not print. |
| `readiness` | Full no-secret output from `pnpm launch:check --json`. |
| `proofSummary.overallStatus` | `ready`, `warn`, or `blocked`. |
| `proofSummary.blockedLabels` | Human-readable blocked gate names. |
| `proofSummary.canRunAuth005` | Whether Supabase public env and Supabase auth mode are sufficient to attempt auth/Profile proof. |
| `proofSummary.canRunWork007` | Whether the runtime DB URL is parseable and DNS resolves for Work refresh proof. |
| `proofSummary.canClaimL1` | Whether launch readiness, deployment marker, auth proof prerequisites, and DB proof prerequisites are all clear. |
| `proofSummary.expectedStrictExitCode` | Expected `launch:check:strict` exit code for this environment. |
| `proofSummary.loop20ReviewInput` | One-line instruction for the next launch-level review. |
| `nextActions` | De-duplicated operator actions from the readiness check. |

## Secret Policy

The proof packet must not print:

- Supabase URLs
- Supabase publishable keys or anon keys
- Database URLs
- Database hosts
- Cookies
- Tokens
- Raw auth claims
- Profile IDs
- Provider payloads

It may print safe booleans, status labels, DNS error codes, auth mode labels, and next-action text.

## L1 Gate

`L1_PRIVATE_ONLINE_WORK_OS` can only be considered when:

1. `pnpm launch:proof` reports `proofSummary.overallStatus = "ready"`.
2. `proofSummary.canRunAuth005 = true`.
3. `proofSummary.canRunWork007 = true`.
4. `proofSummary.canClaimL1 = true` in the intended deployment environment.
5. `pnpm launch:check:strict` exits `0` in the intended deployment environment.
6. `/auth/status` is verified from a real signed-in Supabase browser session.
7. `pnpm auth:proof -- --status-json <file>` reports `proofSummary.canRunAuth005 = true`.
8. `AUTH-005` records Supabase user-to-`Profile` mapping proof.
9. `WORK-007` records Work project/task/note/deliverable refresh proof.

If any item is false, loop reviews must keep the launch level below `L1`.

## Conditional Manual Ops Gate

When the formal `L1` gate is blocked only because owner/operator evidence has not been collected, the workflow may use `ACC-007` and `pnpm launch:manual-ops` to classify the system as `M1_MANUAL_OPS_READY`.

`M1_MANUAL_OPS_READY` means the no-upgrade reasons have been converted into explicit Manual Ops rows with commands, evidence targets, pass/fail signals, risk, database-write flags, approval flags, and no-secret boundaries. It does not change `launchLevels.current`, does not claim `L1_PRIVATE_ONLINE_WORK_OS`, and does not replace `AUTH-005`, `WORK-007`, `WORK-009`, or `DEPLOY-002` evidence.

## Deployment Environment Checklist

Run these checks in preview and production-like environments before claiming launch readiness:

| Gate | Required evidence |
|---|---|
| Environment target | Deployment context is known: local, preview, production, or named custom environment. |
| Supabase public env | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or legacy anon key are present. |
| Runtime DB | `DATABASE_URL` is present and parseable. |
| Migration DB | `DIRECT_DATABASE_URL` or `DATABASE_URL` is present and parseable for reviewed migration paths. |
| DB DNS | Selected DB host resolves from the running environment. |
| Auth mode | Effective auth mode is `supabase`, not development mock mode. |
| Deployment marker | `VERCEL_ENV` or an equivalent deployment marker is present in the deployed proof run. |
| Public Client Portal | `/client/[token]` remains fail-closed unless DB/token/visibility gates are intentionally enabled. |
| Protected routes | `/admin`, `/settings`, `/ai-input`, and `/work` preserve `/login?next=...` when unauthenticated. |
| Build proof | `pnpm build` succeeds with the intended env or a documented disposable/local alternative. |

## Operator Runbook

When proof is blocked:

1. Read `proofSummary.blockedLabels` first.
2. If the blocker is repeated or spans auth, Work proof, and deployment, use `docs/04_playbook/PBK-001_launch-env-unblock-handoff.md` as the operator handoff.
3. Fix only the missing prerequisite; do not run migrations or seed data because env values became present.
4. If Supabase public env is blocked, configure the launch environment with Supabase Project URL and publishable key.
5. If DB DNS is blocked, verify the database URL host, pooler/direct connection hostname, network/DNS access, or provide a disposable PostgreSQL URL.
6. If deployment marker is missing locally, rerun the proof in the intended deployment environment.
7. After proof is ready, run `/auth/status` with a signed-in Supabase session, then run `pnpm auth:proof` with sanitized status evidence.
8. After auth proof reports `canRunAuth005 = true`, resume `AUTH-005`.
9. After auth/Profile proof passes, resume `WORK-007`.
10. Record the proof JSON path in the loop evidence report.

## Research Basis

- Vercel environment variables are configured outside source and apply by environment; changes apply to new deployments, not prior deployments.
- Vercel separates Local, Preview, and Production environments, so proof must name which environment produced the evidence.
- Vercel CLI can run commands with environment variables from a selected environment without writing them into repo source.
- Next.js can deploy as a Node.js server, Docker container, static export, or adapter target; this app currently relies on server features, so Node/Vercel-style runtime proof is required.
- Supabase SSR setup requires project URL and publishable key and uses cookie-aware clients for browser/server auth.
- `AUTH-006` adds `pnpm auth:proof` so real `/auth/status` evidence can be summarized without storing cookies, tokens, raw claims, provider payloads, profile IDs, or actual profile email values.
