# Personal OS Loop 12 Evidence - AUTH-002 Module Permission Source

Date: 2026-06-20
Automation: `personal-os-20m-aggressive-launch-loop`
Loop: 12 of 30
Task: `AUTH-002 - Move module permissions toward DB-backed source`
Result: `DONE`

## Decision

Loop 11 confirmed that `AUTH-005` and `WORK-007` remain blocked by missing Supabase public env/session and DB host DNS `ENOTFOUND`. The highest safe launch-leverage task was therefore `AUTH-002`: remove silent owner/localStorage-only module defaults from initial dashboard render and define a server-side permission snapshot that can later accept DB-backed writes.

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-11-20260620-launch-env-readiness.md`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`

## Research / Reference Basis

Local code reviewed:

- `src/types/module-permission.ts`
- `src/lib/context/module-permissions-context.tsx`
- `src/components/layout/module-guard.tsx`
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/module-settings-control.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/settings/settings-client.tsx`
- `src/lib/services/auth.service.ts`
- `src/lib/services/admin-readiness.service.ts`
- `prisma/schema.prisma`

Local Next.js 16 docs reviewed:

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/02-guides/data-security.md`
- `node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md`

Selected implementation pattern:

- Create a server-only permission read model instead of adding permission writes.
- Use the existing `UserModulePermission` model as sparse DB overlays on top of role defaults.
- Return a minimal `ModulePermissionSnapshot` DTO to Client Components.
- Treat browser role/module toggles as explicit `browser_override` rehearsal only.
- Keep service-layer authorization as the real data boundary.

Rejected alternatives:

- Keep localStorage-only defaults: rejected because initial dashboard render could drift from the authenticated profile.
- Treat module guards/sidebar filtering as security: rejected because Client Component state is user-controlled.
- Add permission write actions now: rejected because writes need a clearer audit, validation, and role policy contract.
- Add a Prisma migration: rejected because the existing schema already has `UserModulePermission`.

Executable task shape:

- Scope: server-only read model, dashboard provider injection, settings/admin display, docs/task tracking.
- Acceptance: server snapshot, DB row overlay, unknown row count, browser override label/reset, no writes/migrations.
- Files likely affected: module permission service/context/types, dashboard layout, settings page/client, admin readiness service, AUT/ACC/task docs.
- Verification: typecheck, DB validate, build, launch readiness check, browser protected-route smoke, whitespace check.
- Risks: no persisted writes/audit yet; no service-level module authz beyond Work; real DB/session proof still blocked.

## Changes

Files changed:

- `src/lib/services/module-permission.service.ts`
- `src/types/module-permission.ts`
- `src/lib/context/module-permissions-context.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/settings/settings-client.tsx`
- `src/lib/services/admin-readiness.service.ts`
- `docs/02_architecture-and-rules/AUT-003_module-permission-source.md`
- `docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`

Behavior changed:

- Dashboard layout now resolves a server-side module permission snapshot after the authenticated profile resolves.
- Module permission context starts from the server snapshot instead of implicit owner/all-modules defaults.
- Existing browser role/module toggles now become `browser_override` and can reset to the server snapshot.
- Settings shows permission source, DB row count, unknown row count, enabled count, and hidden count.
- Admin readiness reports the same permission source and counts.

No Prisma schema, migration, seed, permission write action, production DB mutation, auth provider mutation, public output change, or high-risk module final write was added.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript accepted the new service, provider prop, and settings/admin DTO use. |
| `pnpm db:validate` | Passed | Prisma schema remains valid; no DB connection or mutation required. |
| `pnpm build` | Passed | Next.js 16 build completed; `/settings` and `/admin` remain dynamic. |
| `pnpm launch:check --json` | Passed as evidence collection | Overall remains `blocked`; Supabase public env missing and DB host DNS is `ENOTFOUND`. |
| Browser smoke on `http://127.0.0.1:3001/settings` | Passed | Redirected to `/login?next=%2Fsettings`, showed login email input, did not render settings internals, no console errors. |
| Browser smoke on `http://127.0.0.1:3001/admin` | Passed | Redirected to `/login?next=%2Fadmin`, showed login email input, did not render admin console internals, no console errors. |
| `git diff --check` | Passed | No patch whitespace errors. |

Current `pnpm launch:check --json` result remains blocked:

```txt
overallStatus: blocked
supabasePublicUrlPresent: false
supabasePublishableOrAnonKeyPresent: false
databaseUrlPresent: true
databaseUrlParseable: true
databaseHostResolves: false
databaseHostError: ENOTFOUND
effectiveAuthMode: supabase
deploymentMarkerPresent: false
```

## Acceptance Evidence

- `module-permission.service.ts` is server-only and returns a minimal `ModulePermissionSnapshot`.
- The snapshot overlays persisted `UserModulePermission` rows on role defaults.
- Unknown module keys are counted, not passed as active module keys.
- Dashboard layout initializes the module context from the authenticated profile snapshot.
- Settings and admin expose the same source/count model.
- Browser overrides are labeled separately and resettable.
- Client Components still do not import Prisma clients, raw auth claims, provider secrets, or raw permission rows.

## Remaining Risks

- Permission write actions, audit persistence, and production owner permission seed rows are still future work.
- Client Component module visibility is still not service-layer authorization.
- Non-Work DB-backed module authorization remains future work because those modules are not production DB-backed yet.
- `AUTH-005` and `WORK-007` remain blocked by missing Supabase env/session and DB DNS.

## Final Status

- Status: `DONE`
- Recommended next task: `CLIENT-001` as a public-safe BFF contract split while launch readiness remains blocked; run `WORK-007` instead if a reachable DB appears, and let `AUTH-005` preempt if real Supabase env/session becomes available.
