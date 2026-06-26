# Agent Loop Evidence Report

## Task

- Task ID: `CLIENT-001`
- Title: Make Client Portal DB-backed
- Date: 2026-06-20
- Agent: Codex

## Source Docs Read

- `AGENTS.md`
- `docs/00_manual-and-index/MAN-000_docs-usage-manual.md`
- `docs/00_manual-and-index/MAN-001_document-index.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/02_architecture-and-rules/ARC-018_work-module-contract.md`
- `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`

## Scope

- In scope: add a server-only, env-gated DB-backed BFF loader for `/client/[token]`; render only a UI-safe client-visible DTO; keep the public route fail-closed by default; update task memory and acceptance docs.
- Out of scope: token rotation/revoke, audit persistence, Prisma schema changes, migrations, seed changes, public storage/file URL review, public writes, production DB mutation, and real Supabase token smoke while launch env is blocked.

## Research / Reference Basis

- Local docs/code reviewed: Work service authorization patterns, Work mapper DTO boundary, Prisma project/task/deliverable visibility fields, existing Client Portal containment route, and Next.js 16 local docs under `node_modules/next/dist/docs/`.
- External or reference websites reviewed:
  - [OWASP Insecure Direct Object Reference Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
  - [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- Selected implementation pattern: a server-only BFF service validates token shape, reads only scoped DB records, maps to a narrow DTO, and lets the Server Component render only `ready` results while all other states call `notFound()`.
- Rejected alternatives: mock fallback, token-derived project selection, raw Prisma row rendering, public notes/file URLs in this slice, first-match duplicate token behavior, and enabling DB rendering without an explicit env gate.
- Task shape created or updated: `CLIENT-001` marked `DONE`; `ADMIN-002` added as the next read-only admin/settings audit BFF candidate.

## Changes

- Files changed:
  - `src/lib/services/client-portal.service.ts`
  - `src/app/client/[token]/page.tsx`
  - `src/app/client/[token]/not-found.tsx`
  - `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
  - `docs/02_architecture-and-rules/ARC-018_work-module-contract.md`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
  - `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
- Behavior changed:
  - `/client/[token]` calls `connection()` and then `getClientPortalViewByToken(token)`.
  - Default env state remains unavailable/noindex because `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB` is not enabled.
  - When enabled, DB rendering requires a valid token format, exactly one matching client-visible project, and client-visible task/deliverable filters.
  - Public output excludes notes, file URLs, internal IDs, `clientToken`, raw rows, and mock data.
- Docs changed: added `ARC-025`, updated PRD/acceptance/backlog/sprint/completed log/loop state to make the gated state explicit.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Passed | TypeScript accepted the new service and route wiring. |
| `pnpm db:validate` | Passed | Prisma schema remains valid; no schema change was made. |
| `pnpm build` | Passed | `/client/[token]` is listed as dynamic in the route summary. |
| `pnpm launch:check --json` | Blocked as expected | Supabase public URL/key are missing, DB URL is present/parseable, DB host DNS returns `ENOTFOUND`, auth mode is `supabase`, deployment marker is missing locally. |
| Public `/client/tok-lisa-q2-2026` HTTP unavailable smoke | Passed | Returned 404 with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`; required unavailable markers found; forbidden mock/private markers not found. |
| In-app Browser unavailable smoke | Passed | Visible H1 was `客戶連結目前不可用`; required unavailable markers found; forbidden mock/private markers not found. |
| `git diff --check` | Passed | No whitespace errors in the tracked diff. |
| Touched-file trailing whitespace scan | Passed | No trailing whitespace in the code/docs touched by this loop, including currently untracked files. |

## Evidence

- Relevant output or observation: `src/lib/services/client-portal.service.ts` uses `import "server-only"`, env gate, token allowlist, `Project.clientToken` + `Project.visibility = CLIENT_VISIBLE`, `take: 2` duplicate fail-closed behavior, and nested task/deliverable `CLIENT_VISIBLE` filters.
- Screenshots or browser checks: in-app Browser opened `http://127.0.0.1:3000/client/tok-lisa-q2-2026`; title was `Client Portal | Personal OS`, H1 was `客戶連結目前不可用`, required markers were present, and forbidden markers were absent.
- DB checks: no DB mutation, migration, or seed was run. `pnpm db:validate` passed.

## Remaining Risks

- Real DB token rendering has not been smoke-tested because launch readiness remains blocked by env/session/DB connectivity.
- Token rotation/revoke and persisted audit records are not implemented.
- `Project.clientToken` uniqueness/index strategy needs a reviewed migration task before production sharing at scale.
- File URLs remain excluded until public storage and signed URL behavior are reviewed.
- `AUTH-005` and `WORK-007` remain blocked until Supabase public env/session and DB connectivity improve.

## Final Status

- Status: `CLIENT-001` implementation complete, default public route still fail-closed.
- Recommended next task: `ADMIN-002` read-only admin/settings audit BFF contract, unless `AUTH-005` or `WORK-007` unblocks.
