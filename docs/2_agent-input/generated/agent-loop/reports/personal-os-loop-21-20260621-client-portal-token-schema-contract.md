# Agent Loop Evidence Report

## Task

- Task ID: `CLIENT-004`
- Title: Propose Client Portal token schema and hashing contract
- Date: 2026-06-21
- Agent: Codex heartbeat loop `personal-os-20m-aggressive-launch-loop`
- Loop: 21
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
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-17-20260620-client-portal-readiness-contract.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-20-20260620-launch-level-review.md`
- `package.json`
- `prisma/schema.prisma`

## Scope

- In scope: research token storage method, define schema/hash contract, update protected readiness state, update Client Portal architecture/acceptance/task docs, and write loop evidence.
- Out of scope: Prisma schema changes, migrations, seed changes, token generate/rotate/revoke actions, public write actions, public file URL rendering, production DB mutation, enabling `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB`, or expanding public `/client/[token]` output.

## Research / Reference Basis

- Local docs/code reviewed: existing Client Portal BFF loader, readiness service, public fail-closed route contract, Prisma `Project.clientToken` field, ACC criteria, and loop 13/17 evidence.
- External primary/security references reviewed:
  - [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
  - [OWASP Web Security Testing Guide: weak password reset functionality](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/09-Testing_for_Weak_Password_Change_or_Reset_Functionalities)
  - [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
  - [Node.js crypto docs](https://nodejs.org/api/crypto.html)
  - [Prisma index docs](https://www.prisma.io/docs/orm/prisma-schema/data-model/indexes)
  - [Prisma schema reference](https://www.prisma.io/docs/orm/reference/prisma-schema-reference)
  - [PostgreSQL unique index docs](https://www.postgresql.org/docs/current/indexes-unique.html)
- Selected implementation pattern: proposal-only selector/verifier capability URL. The public token is `posc_<selector>_<verifier>`, DB lookup uses selector, DB stores HMAC-SHA256 digest plus key id, validation uses constant-time digest compare, and all public failures remain fail-closed/noindex.
- Rejected alternatives: keeping plain `Project.clientToken`, using project/client slugs as token material, storing reversible encrypted tokens, using self-contained signed tokens without DB revoke state, scanning by hash only without selector, enabling token lifecycle writes in this loop, or exposing public storage/file URLs.
- Task shape created or updated: `CLIENT-004` marked done; `DBS-004` created; `CLIENT-005` remains blocked on approval/safe DB target; loop 22 defaults to `CLIENT-006`.

## Changes

- Files changed:
  - `docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md`
  - `src/lib/services/client-portal-readiness.service.ts`
  - `src/app/(dashboard)/admin/page.tsx`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
  - `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: protected admin/settings readiness now identifies the Client Portal token schema strategy as reviewed and proposal-only. Public `/client/[token]` behavior is unchanged.
- Docs changed: `DBS-004` is now the token schema/hash source of truth, `ARC-025` points to it, acceptance criteria cover `CLIENT-004`, and loop tracking now points to `CLIENT-006`.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm exec tsc --noEmit --pretty false` | Pass | Readiness service/admin type changes compile. |
| `pnpm db:validate` | Pass | Prisma schema remains valid; no schema change was made. |
| `node -e "JSON.parse(...loop-state.json...)"` | Pass | Loop state records loop 21 complete and loop 22 `CLIENT-006` next. |
| `rg -n "DBS-004\|CLIENT-004\|CLIENT-006" ...` | Pass | Required references exist across index, architecture, acceptance, sprint/backlog, completed log, task memory, and readiness service. |
| `git diff --check` | Pass | No whitespace errors reported. |
| touched-file whitespace scan | Pass | No trailing whitespace or tab characters found in touched files. |

## Evidence

- `DBS-004` defines the selected token pattern, proposed Prisma shape, validation flow, lifecycle rules, migration/backfill plan, and remaining decisions.
- Protected readiness `id` is now `CLIENT-004` with status `token_schema_contract_reviewed`.
- `schemaReadiness.implementationStatus` remains `proposal_only_no_schema_change`.
- `loop-state.json` now reports `currentLoop=21`, `nextLoopNumber=22`, and next recommended task `CLIENT-006`.
- DB checks: `pnpm db:validate` passed. No migration, seed, valuable DB write, or production mutation was run.

## Remaining Risks

- The contract is not yet implemented in Prisma schema or runtime lookup.
- `Project.clientToken` remains the current runtime field until an approved migration and action path are implemented.
- `CLIENT-005` needs explicit approval for token write actions, schema/migration target, owner confirmation UX, and audit write behavior.
- `CLIENT-006` must review public storage and signed URL exposure before file links can appear in `/client/[token]`.
- `AUTH-005` and `WORK-007` remain blocked by missing Supabase public env/session and DB DNS/connectivity proof.

## Final Status

- Status: DONE
- Recommended next task: `CLIENT-006` public storage and file URL exposure review, unless `AUTH-005` or `WORK-007` unblocks first.
