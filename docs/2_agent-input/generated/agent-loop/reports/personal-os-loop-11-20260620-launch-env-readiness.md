# Personal OS Loop 11 Evidence - ENV-001 Launch Environment Readiness

Date: 2026-06-20
Automation: `personal-os-20m-aggressive-launch-loop`
Loop: 11 of 30
Task: `ENV-001 - Add launch environment readiness gate and runbook`
Result: `DONE`

## Decision

Loop 10 showed that `AUTH-005` and `WORK-007` were blocked by environment and proof gaps rather than UI gaps. This loop added a repeatable no-secret readiness gate so future loops can determine whether to run real auth/Work proof or continue blocked-path implementation.

Default next task is `AUTH-002` because the current readiness gate remains blocked. `AUTH-005` should preempt immediately if `pnpm launch:check` becomes ready and a real browser session exists.

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/02_architecture-and-rules/DBS-001_database-contract.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- Loop 10 launch-level review report
- Existing env/auth/admin code: `src/lib/supabase/env.ts`, `src/lib/auth/runtime.ts`, `src/lib/services/admin-readiness.service.ts`

## Research / Reference Basis

Local findings:

- `src/lib/supabase/env.ts` already treats Supabase public config as URL + publishable/anon key.
- `src/lib/auth/runtime.ts` already defines requested vs effective auth mode and disables mock auth in production.
- `src/lib/db.ts` uses `DATABASE_URL` for runtime Prisma.
- `prisma.config.ts` uses `DIRECT_DATABASE_URL || DATABASE_URL` for Prisma CLI/migration operations.
- Admin readiness already reports env presence, but live DB DNS checks should stay out of server render to avoid dashboard latency and network coupling.

External primary references:

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Environments](https://vercel.com/docs/deployments/environments)
- [Supabase SSR Auth](https://supabase.com/docs/guides/auth/server-side)
- [Supabase SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Prisma migrate deploy](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)

Selected implementation pattern:

- Add a standalone Node script instead of dashboard render-time DNS checks.
- Load `.env.local` then `.env`, matching existing Prisma config convention.
- Report only presence, parseability, DNS status/error code, auth mode, and next actions.
- Provide human-readable output for operators and JSON output for evidence/automation.
- Provide a strict mode that exits nonzero only when used as a release/CI gate.

Rejected alternatives:

- Printing resolved URLs/hosts: rejected because evidence reports and admin logs should not spread secrets or infrastructure identifiers.
- Running Prisma migration status automatically: rejected because `ENV-001` is a readiness gate, not a DB mutation or migration task.
- Performing DB connection/login smoke inside this script: rejected because `AUTH-005` and `WORK-007` own those proofs after prerequisites are ready.
- Adding DNS checks to `/admin`: rejected because admin console rendering should remain quick and should not block on network DNS.

## Changes

Files changed:

- `scripts/check-launch-readiness.mjs`
- `package.json`
- `docs/02_architecture-and-rules/ENV-001_launch-environment-readiness.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

Behavior changed:

- `pnpm launch:check` now emits no-secret launch readiness status.
- `pnpm launch:check --json` now emits machine-readable readiness status.
- `pnpm launch:check:strict` now exits nonzero when blockers exist.

No Prisma schema, migrations, seed data, production DB commands, deployment provider writes, auth provider writes, or public route behavior changed.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:check` | Passed as evidence collection | Reported overall `blocked`; did not print URL/key/DB URL/host/token values. |
| `pnpm launch:check --json` | Passed | Returned machine-readable blocked state and next actions. |
| `pnpm launch:check:strict` | Expected blocked exit | Exited `1` because current env is not launch-ready. |
| `pnpm exec tsc --noEmit --pretty false` | Passed | Source state remains type-clean. |
| `pnpm db:validate` | Passed | Prisma schema is valid; no DB connection or mutation required. |
| `node` JSON parse for `package.json` and `loop-state.json` | Passed | Both JSON files parse after updates. |
| no-secret marker scan against `pnpm launch:check --json` output | Passed | No `postgres://`, `postgresql://`, `supabase.co`, publishable key, JWT-like, or raw env assignment marker was printed. |
| `git diff --check` | Passed | No patch whitespace errors. |

Current `pnpm launch:check` result:

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

## Acceptance Evidence

- The script identifies Supabase public env presence, DB URL presence/parseability, DNS reachability, auth mode, deployment marker, and next operator actions.
- Human and JSON outputs avoid secret values and infrastructure host strings.
- Strict mode fails while blockers remain.
- `ENV-001_launch-environment-readiness.md` documents the L1 gate and runbook.
- No mutation commands are run by the readiness gate.

## Remaining Risks

- The current local environment remains blocked by missing Supabase public env and DB DNS `ENOTFOUND`.
- `AUTH-005` still needs a real browser session and Profile mapping proof.
- `WORK-007` still needs reachable DB proof and Work refresh smoke.
- `AUTH-002` remains needed because owner settings module controls are still localStorage-only rehearsal.

## Final Status

- Status: `DONE`
- Recommended next task: `AUTH-002 - Move module permissions toward DB-backed source`
- Preemption rule: run `AUTH-005` instead if `pnpm launch:check` becomes ready and a real Supabase browser session is available.
