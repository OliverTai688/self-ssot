# Agent Loop Evidence Report

## Task

- Task ID: DATTR-025
- Title: Add AI Input formal BFF readiness contract
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
- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md`
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md`
- `docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md`
- `docs/02_architecture-and-rules/DBS-002_source-workflow-schema-contract.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

## Scope

- In scope: add a server-only, UI-safe AI Input formal-mode readiness contract; preserve the existing client-side mock workbench behavior; document the BFF pattern; update backlog, sprint, acceptance, completed log, and loop state.
- Out of scope: Prisma schema changes, connector adapters, source ingestion writes, workflow execution writes, module write intent approval execution, Supabase env repair, or public deployment.

## Research / Reference Basis

- Local docs/code reviewed: AI Input source workflow architecture, source connector contract, intake privacy rules, source workflow schema contract, admin settings BFF precedent, existing AI Input page implementation, Supabase public-config helper, dashboard auth route behavior, and launch checks.
- Next.js docs reviewed locally: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`, and `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`.
- External or reference websites reviewed: none. Current behavior was covered by local product docs, local framework docs, and existing code patterns.
- Selected implementation pattern: Server Component wrapper calls a server-only service, returns a serializable readiness DTO to the existing Client Component, and renders the contract only when AI Input is in formal mode.
- Rejected alternatives: Client Component importing Prisma/config directly; route handler or server action for read-only initial data; adding DB schema before the formal source models are approved; continuing to show mock connector/workflow controls in formal mode.
- Task shape created or updated: DATTR-025 completed; CLIENT-003 added as the next launch-leverage split for Client Portal token lifecycle and public-readiness hardening.

## Changes

- Files changed:
  - `src/app/(dashboard)/ai-input/page.tsx`
  - `src/app/(dashboard)/ai-input/ai-input-client.tsx`
  - `src/lib/services/ai-input-readiness.service.ts`
  - `src/types/ai-input-readiness.ts`
  - `docs/02_architecture-and-rules/ARC-027_ai-input-formal-readiness-bff.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
  - `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: `/ai-input` is now a dynamic Server Component route that builds a formal readiness contract server-side and passes it into the interactive client UI. In formal mode, mock-only connector/workflow rows remain hidden and the UI shows readiness rows for source connections, assets, workflow runs, module write intent boundaries, and Supabase public config.
- Docs changed: added ARC-027 and updated product, acceptance, sprint, backlog, completed log, and loop-state memory.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Pass | TypeScript accepted the Server Component wrapper, client component props, and shared readiness DTO. |
| `pnpm db:validate` | Pass | Prisma schema validated; no schema or migration was changed. |
| `pnpm build` | Pass | Production build completed; route table marks `/ai-input` as dynamic. |
| `pnpm launch:check --json` | Blocked as expected | Supabase public URL/key are missing, DB host DNS returns `ENOTFOUND`, and no deployment marker is present. |
| `curl -i -s 'http://127.0.0.1:3031/ai-input'` against `pnpm exec next start -p 3031` | Pass | Protected route returned `307 Temporary Redirect` to `/login?next=%2Fai-input`. |
| `curl -s -L 'http://127.0.0.1:3031/ai-input'` marker check | Pass | Login page markers were present after redirect. |
| `node -e "JSON.parse(...loop-state.json...)"` | Pass | Loop state remained valid JSON. |
| `git diff --check` | Pass | No whitespace errors reported by Git. |
| touched-file whitespace scan | Pass | No trailing whitespace found in touched files. |

## Evidence

- Relevant output or observation: launch check at `2026-06-20T14:44:56.855Z` reported `overallStatus: blocked`, `supabasePublicUrlPresent: false`, `supabasePublishableOrAnonKeyPresent: false`, `databaseHostResolves: false`, `databaseHostError: ENOTFOUND`, `effectiveAuthMode: supabase`, and `deploymentMarkerPresent: false`.
- Screenshots or browser checks: not run; this slice is a protected route/BFF contract change, and the production route smoke confirmed auth redirect behavior.
- DB checks: `pnpm db:validate` passed. No DB connection, Prisma model, migration, or seed write was required.

## Remaining Risks

- Formal AI Input still needs approved DB-backed source connection, source asset, workflow run, work item, and write intent persistence before it becomes operational.
- Supabase public env and DB DNS remain blocked, so auth/DB smoke and deployment checks cannot yet pass.
- Client Portal public output still needs token lifecycle, public-readiness hardening, and storage/file URL review before it should be expanded.

## Final Status

- Status: DONE
- Recommended next task: CLIENT-003 Client Portal token lifecycle and public-readiness hardening split, unless AUTH-005 or WORK-007 unblocks first.
