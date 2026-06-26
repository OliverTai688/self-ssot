# Agent Loop Evidence Report

## Task

- Task ID: HARDEN-001
- Title: Harden protected/public flow unavailable states
- Date: 2026-06-20
- Agent: Codex heartbeat loop `personal-os-20m-aggressive-launch-loop`
- Loop: 18
- Launch level before: `L0_LOCAL_PROTOTYPE`
- Launch level after: `L0_LOCAL_PROTOTYPE`

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/00_manual-and-index/MAN-002_development-loop.md`
- `docs/01_product-requirements/PRD-001_personal-os-situation.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
- `docs/01_product-requirements/PRD-005_situation-driven-prd.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/prompts/continue-loop.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-17-20260620-client-portal-readiness-contract.md`

## Scope

- In scope: shared route-state UI, protected dashboard loading/error/not-found states, public root not-found, public Client Portal error/unavailable hardening, acceptance/task memory, and route smoke evidence.
- Out of scope: schema changes, migrations, seed changes, token rotation/revoke actions, public output expansion, production DB mutation, deployment provider writes, auth provider changes, Work persistence smoke, and broad visual redesign.

## Research / Reference Basis

- Local docs/code reviewed: current sprint/backlog, v0.1 acceptance, module acceptance, dashboard layout auth guard, login redirect helper, Proxy redirect behavior, public root page, Client Portal public page/unavailable boundary, admin/settings readiness patterns, and prior loop 17 report.
- Next.js docs reviewed locally:
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`
  - `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`
- External or reference websites reviewed: none. The framework behavior was verified against the checked-in official Next.js docs under `node_modules`.
- Selected implementation pattern: use one reusable `RouteStatePanel` for consistent no-secret status UI; add segment-level loading/error/not-found only where it does not weaken HTTP status evidence; keep public Client Portal fail-closed.
- Rejected alternatives: adding public `/client/[token]/loading.tsx` was rejected after smoke showed it streamed a `200` status before a later `notFound()`; rendering exception messages in error boundaries was rejected; moving public token checks into public UI copy was rejected; broad dashboard redesign was rejected.
- Task shape created or updated: `HARDEN-001` completed. `DEPLOY-001` added as loop 19 candidate for deployment/env proof package unless `AUTH-005` or `WORK-007` unblocks first.

## Changes

- Files changed:
  - `src/components/layout/route-state-panel.tsx`
  - `src/app/(dashboard)/loading.tsx`
  - `src/app/(dashboard)/error.tsx`
  - `src/app/(dashboard)/not-found.tsx`
  - `src/app/client/[token]/error.tsx`
  - `src/app/client/[token]/not-found.tsx`
  - `src/app/not-found.tsx`
  - `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: protected dashboard route segments now have consistent loading/error/not-found UI; public unmatched routes have a no-secret 404; public Client Portal unavailable/error UI uses the same route-boundary language.
- Behavior preserved: protected unauthenticated routes still redirect to `/login?next=...`; public `/client/[token]` remains 404/no-store/noindex and retains `No mock output`.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:check --json` | Blocked as expected | Supabase public URL/key missing, DB DNS `ENOTFOUND`, auth mode `supabase`, and no deployment marker. |
| `pnpm exec tsc --noEmit --pretty false` | Pass | Route-state panel and Next route files typecheck. |
| `pnpm db:validate` | Pass | Prisma schema unchanged and valid. |
| `pnpm build` | Pass | Production build completed; `/_not-found` generated and app routes compiled. |
| initial production route smoke | Failed usefully | Public Client Portal returned `200` after adding segment `loading.tsx`, proving the streaming-status issue. |
| corrected production route smoke | Pass | `/admin`, `/settings`, and `/ai-input` redirect to `/login?next=...`; `/client/tok-lisa-q2-2026` returns 404/no-store and required markers; missing public route returns 404 and safe markers. |
| `node -e "JSON.parse(...loop-state.json...)"` | Pass | Loop state JSON remains valid and records loop 18 complete. |
| `git diff --check` | Pass | No whitespace errors reported by Git. |
| touched-file whitespace scan | Pass | No trailing whitespace found in touched runtime/report files. |

## Evidence

- Launch check at `2026-06-20T15:23:32.565Z` remained `overallStatus: blocked`.
- Initial route smoke found `/client/tok-lisa-q2-2026` returned `200` while required unavailable markers were present, because `loading.tsx` started streaming before `notFound()`.
- The public Client Portal segment `loading.tsx` was removed to preserve HTTP 404 status.
- Corrected route smoke:
  - `/admin` returned `307 /login?next=%2Fadmin`.
  - `/settings` returned `307 /login?next=%2Fsettings`.
  - `/ai-input` returned `307 /login?next=%2Fai-input`.
  - `/client/tok-lisa-q2-2026` returned `404` with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.
  - Client Portal required markers were present: `客戶連結目前不可用`, `No mock output`, `Client Portal unavailable`.
  - Client Portal forbidden markers were absent: `Lisa Q2`, `銷售趨勢`, `mockProjectsFull`, `mockTasks`, `mockDeliverables`, `clientToken`, `任務進度`, `交付物 (`.
  - `/missing-public-route-for-hardening` returned `404` with `找不到這個頁面`, `404`, and `Public boundary`, and did not expose `DATABASE_URL` or `NEXT_PUBLIC_SUPABASE`.
- DB checks: `pnpm db:validate` passed. No migration, seed, write action, or production DB mutation was run.

## Remaining Risks

- Launch level remains `L0_LOCAL_PROTOTYPE` because `AUTH-005`, `WORK-007`, and deployed-environment proof are still blocked.
- Public Client Portal loading is intentionally absent until the token route can preserve 404 status through a pre-stream gate such as Proxy or another approved fast precheck.
- Error boundaries log only a digest object client-side; production observability and persisted audit are still future work.
- `DEPLOY-001` should prepare deployment/env proof before loop 20 review unless environment/session/DB readiness unblocks `AUTH-005` or `WORK-007`.

## Final Status

- Status: DONE
- Recommended next task: `DEPLOY-001` deployment/env proof package and launch QA checklist, unless `AUTH-005` or `WORK-007` unblocks first.
