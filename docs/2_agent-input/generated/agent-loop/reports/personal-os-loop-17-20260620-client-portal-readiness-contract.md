# Agent Loop Evidence Report

## Task

- Task ID: CLIENT-003
- Title: Split Client Portal token lifecycle and public-readiness hardening
- Date: 2026-06-20
- Agent: Codex heartbeat loop `personal-os-20m-aggressive-launch-loop`

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/prompts/continue-loop.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-13-20260620-client-portal-bff.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-16-20260620-ai-input-formal-readiness-bff.md`

## Scope

- In scope: add a protected server-only Client Portal readiness contract, render it in protected admin/settings surfaces, update Client Portal public BFF architecture, split follow-up tasks, and verify the public route still fails closed.
- Out of scope: token rotation action, token revoke action, public write action, public storage or file URL rendering, Prisma schema change, migration, seed change, production DB mutation, mock fallback in public route, or enabling `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB`.

## Research / Reference Basis

- Local docs/code reviewed: existing Client Portal BFF loader, public unavailable boundary, admin/settings read-only BFF pattern, Prisma `Project.clientToken` field, Work share-link UI, launch check output, and loop 13 Client Portal evidence.
- Next.js docs reviewed locally: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`, and `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
- External primary/security references reviewed:
  - [OWASP Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
  - [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
  - [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- Selected implementation pattern: protected readiness BFF contract only. The contract reports launch gates to owner/admin surfaces while leaving public `/client/[token]` unchanged and fail-closed.
- Rejected alternatives: enabling public DB output by default; adding token rotate/revoke writes before schema/audit approval; rendering file URLs; adding a migration in an environment with DB DNS blocked; exposing readiness details on public `/client/[token]`; logging or displaying raw token values.
- Task shape created or updated: `CLIENT-003` completed. Follow-ups split as `CLIENT-004` token schema/hashing proposal, `CLIENT-005` owner token rotate/revoke BFF actions with audit, `CLIENT-006` public storage/file URL review, and `CLIENT-007` real DB token smoke. `HARDEN-001` added as the default loop 18 task.

## Changes

- Files changed:
  - `src/lib/services/client-portal-readiness.service.ts`
  - `src/lib/services/admin-readiness.service.ts`
  - `src/app/(dashboard)/admin/page.tsx`
  - `src/app/(dashboard)/settings/page.tsx`
  - `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
  - `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
  - `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: protected `/admin` now renders a full Client Portal launch-hardening table, and protected `/settings` now renders an owner-facing Client Portal readiness summary.
- Public behavior unchanged: `/client/[token]` still fails closed unless the explicit DB gate and existing DB/token/visibility checks pass.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:check --json` | Blocked as expected | Supabase public URL/key missing, DB host DNS `ENOTFOUND`, auth mode `supabase`, no deployment marker. |
| `pnpm exec tsc --noEmit --pretty false` | Pass | TypeScript accepted the readiness service and protected UI integrations. |
| `pnpm db:validate` | Pass | Prisma schema remains valid; no schema/migration was changed. |
| `pnpm build` | Pass | Production build completed; `/admin`, `/settings`, and `/client/[token]` are dynamic. |
| `node -e "JSON.parse(...loop-state.json...)"` | Pass | Loop state JSON remains valid and records loop 17 complete. |
| `curl -i -s 'http://127.0.0.1:3032/admin'` | Pass | Returned `307` to `/login?next=%2Fadmin`. |
| `curl -i -s 'http://127.0.0.1:3032/settings'` | Pass | Returned `307` to `/login?next=%2Fsettings`. |
| `curl -i -s 'http://127.0.0.1:3032/client/tok-lisa-q2-2026'` | Pass | Returned `404`, `Cache-Control: private, no-cache, no-store`, and noindex metadata. |
| Public client marker scan | Pass | Required unavailable markers were present; forbidden private/mock markers were absent. |
| `git diff --check` | Pass | No whitespace errors reported by Git. |
| touched-file whitespace scan | Pass | No trailing whitespace found in touched files. |

## Evidence

- Launch check at `2026-06-20T15:06:25.542Z` remained `overallStatus: blocked`, with missing Supabase public env, DB DNS `ENOTFOUND`, and missing deployment marker.
- Public client route marker scan found `Client Portal unavailable`, `客戶連結目前不可用`, and `No mock output`.
- Public client route marker scan did not find `Lisa Q2`, `銷售趨勢`, `mockProjectsFull`, `mockTasks`, `mockDeliverables`, `clientToken`, `任務進度`, or `交付物 (`.
- Protected admin/settings route smoke confirmed unauthenticated requests still preserve their exact `next` targets.
- DB checks: `pnpm db:validate` passed. No migration, seed, write action, or production DB mutation was run.

## Remaining Risks

- Client Portal public sharing is still not launch-ready.
- Token hashing/schema, uniqueness/index behavior, revoke/rotate lifecycle, audit persistence, public storage/file URL policy, and real DB token smoke remain incomplete.
- `AUTH-005` and `WORK-007` remain blocked until Supabase public env/session and DB connectivity improve.
- `CLIENT-005` must stop for explicit approval before any token lifecycle writes or valuable DB mutation.

## Final Status

- Status: DONE
- Launch level after loop: `L0_LOCAL_PROTOTYPE`
- Recommended next task: HARDEN-001 cross-page protected/public unavailable-state hardening, unless `AUTH-005` or `WORK-007` unblocks first.
