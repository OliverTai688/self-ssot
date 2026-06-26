# Agent Loop Evidence Report

## Task

- Task ID: `CLIENT-006`
- Title: Review public storage and file URL exposure
- Date: 2026-06-21
- Agent: Codex heartbeat loop `personal-os-20m-aggressive-launch-loop`
- Loop: 22
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
- `docs/02_architecture-and-rules/ARC-001_data-flow-and-storage.md`
- `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
- `docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md`
- `docs/05_execution-plans/PLN-061_current-sprint.md`
- `docs/05_execution-plans/PLN-063_thirty-loop-launch-automation-plan.md`
- `docs/08_acceptance-and-qa/ACC-001_v0-1-operating-version.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- `docs/2_agent-input/generated/agent-loop/development-strategy.md`
- `docs/2_agent-input/generated/agent-loop/loop-state.json`
- `docs/2_agent-input/generated/agent-loop/prompts/continue-loop.md`
- `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-21-20260621-client-portal-token-schema-contract.md`
- `package.json`
- `prisma/schema.prisma`

## Scope

- In scope: research public file/storage exposure, define a Client Portal storage/file URL policy, keep public file links excluded, update protected readiness surfaces, update architecture/acceptance/task docs, and write loop evidence.
- Out of scope: Prisma schema changes, migrations, seed changes, storage bucket creation or policy changes, upload runtime, signed URL runtime, public file links, production database mutation, enabling `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB`, or expanding public `/client/[token]` output.

## Research / Reference Basis

- Local docs/code reviewed: existing Client Portal BFF loader, public route fail-closed UI, readiness service, token schema proposal, Work deliverable tree/actions, current nullable `ProjectDeliverable.fileUrl`, and Client Portal acceptance criteria.
- External primary/security references reviewed:
  - [Supabase Storage buckets fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals)
  - [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
  - [Supabase Storage serving assets](https://supabase.com/docs/guides/storage/serving/downloads)
  - [Supabase Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn)
  - [Supabase JavaScript `createSignedUrl`](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurl)
  - [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- Selected implementation pattern: keep `/client/[token]` metadata-only. Future file access must go through a server-side BFF route that revalidates token, project, deliverable, file share state, and revocation before generating a short-lived signed URL from a private bucket and writing an audit event.
- Rejected alternatives: rendering `ProjectDeliverable.fileUrl`, storing signed URLs in Postgres, public buckets for client deliverables, treating deliverable visibility as enough authorization for file bytes, generating signed URLs in a Client Component, prefetching signed URLs, exposing storage keys in HTML, or relying on token revoke to invalidate already-issued signed URLs immediately.
- Task shape updated: `CLIENT-006` marked done; `CLIENT-005` and `CLIENT-007` remain gated; default loop 23 task is `WORK-008` unless `AUTH-005` or `WORK-007` unblocks.

## Changes

- Files changed:
  - `docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md`
  - `src/lib/services/client-portal-readiness.service.ts`
  - `src/app/(dashboard)/admin/page.tsx`
  - `src/app/(dashboard)/settings/page.tsx`
  - `docs/00_manual-and-index/MAN-001_document-index.md`
  - `docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md`
  - `docs/01_product-requirements/PRD-004_next-stage-development-plan.md`
  - `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
  - `docs/05_execution-plans/PLN-060_task-backlog.md`
  - `docs/05_execution-plans/PLN-061_current-sprint.md`
  - `docs/06_audits-and-reports/RPT-007_completed-log.md`
  - `docs/2_agent-input/generated/agent-loop/loop-state.json`
  - `tasks.md`
- Behavior changed: protected admin/settings readiness now reports the Client Portal public storage policy as reviewed and proposal-only.
- Public behavior unchanged: `/client/[token]` still excludes file URLs, raw storage URLs, provider signed URLs, bucket names, object keys, storage secrets, upload controls, and signed URL runtime.
- Docs changed: `AUT-004` is now the storage/file URL policy source of truth; `ARC-025`, `ACC-002`, PRD, backlog, sprint, completed log, and loop state point to it.

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm launch:check --json` | Blocked as expected | Latest check is blocked by missing `NEXT_PUBLIC_SUPABASE_URL`, missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/anon key, and missing local deployment marker. DB URL is present/parseable and the latest DNS check resolved. |
| `pnpm exec tsc --noEmit --pretty false` | Pass | Readiness service, admin, and settings type changes compile. |
| `pnpm db:validate` | Pass | Prisma schema remains valid; no schema change was made. |
| public route file URL marker scan | Pass | `client-portal.service.ts` and `/client/[token]/page.tsx` contain `fileUrlsExcluded: true` and no direct `fileUrl`, `storage.from`, `signedUrl`, `getPublicUrl`, or `createSignedUrl` markers. |
| `node -e "JSON.parse(...loop-state.json...)"` | Pass | Loop state records loop 22 complete, `CLIENT-006` last completed, and loop 23 `WORK-008` next. |
| docs/source marker scan | Pass | Required `AUT-004`, `CLIENT-006`, and `WORK-008` references exist across index, architecture, acceptance, PRD, backlog, sprint, completed log, task memory, and readiness code. |
| `git diff --check` | Pass | No whitespace errors reported. |
| touched-file whitespace scan | Pass | No trailing whitespace or tab characters found in touched files. |

## Evidence

- `AUT-004` defines the selected future file-access route shape, private-bucket requirement, storage metadata proposal, Supabase-specific policy, TTL/cache/revocation limits, upload safety requirements, and rejected alternatives.
- `ClientPortalReadinessContract.id` is now `CLIENT-006` with status `public_storage_policy_reviewed`.
- `storageReadiness.implementationStatus` remains `proposal_only_no_file_url_rendering`.
- Protected `/settings` now shows the first six Client Portal readiness rows so the public storage row is visible.
- Protected `/admin` now includes storage readiness in the Client Portal launch hardening summary.
- `loop-state.json` reports `currentLoop=22`, `completedLoops=22`, `nextLoopNumber=23`, and next recommended task `WORK-008`.
- DB checks: `pnpm db:validate` passed. No migration, seed, valuable DB write, storage mutation, or production mutation was run.

## Remaining Risks

- File access is policy-only. No upload runtime, storage metadata table, signed URL BFF route, audit write path, or file-access smoke exists yet.
- `ProjectDeliverable.fileUrl` remains a nullable legacy/internal field and must not be used as a public URL source.
- Already-issued provider signed URLs may remain usable until TTL/CDN/browser cache expiry; future implementation must keep TTL short and document provider cache behavior.
- `CLIENT-005` still needs approved token rotate/revoke actions, owner confirmation UX, and audit writes before client sharing can be operator-ready.
- `CLIENT-007`, `AUTH-005`, and `WORK-007` remain blocked until launch env/session/DB proof is available or a disposable DB path is approved.

## Final Status

- Status: DONE
- Recommended next task: `WORK-008` disposable Work refresh proof harness, unless `AUTH-005` or `WORK-007` unblocks first.
