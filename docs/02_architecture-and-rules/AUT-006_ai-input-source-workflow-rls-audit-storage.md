# AUT-006 AI Input Source Workflow RLS And Audit Storage Policy

**Document ID:** `AUT-006`  
**Task:** `DATTR-024K-RLS-AUDIT-STORAGE`  
**Date:** 2026-06-23  
**Status:** Review gate ready; no policy apply or DB runtime

## Purpose

`DATTR-024K-RLS-AUDIT-STORAGE` closes the next Source Workflow persistence blocker after the service boundary in `DATTR-024J`. It defines what must be true before AI Input Source Workflow tables can move from review-only schema to DB-backed read/write runtime.

This is a security and audit review gate, not a migration/apply task.

Current state:

- `identityStrategySelected=false`
- `rlsPolicyApplyAllowed=false`
- `auditStorageRuntimeAllowed=false`
- `databaseReadAllowed=false`
- `databaseWriteAllowed=false`
- `externalRegisterable=false`

## Source Basis

Local sources:

- `docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md`
- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md`
- `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md`
- `src/lib/contracts/operating-audit-storage-review.contract.ts`
- `src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts`
- `src/lib/services/ai-input-source-workflow.service.ts`
- `scripts/check-ai-input-source-workflow-rls-audit-storage.mjs`

Primary/official sources:

- Supabase RLS guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase secure data guide: https://supabase.com/docs/guides/database/secure-data
- Supabase Vault guide: https://supabase.com/docs/guides/database/vault
- Supabase RLS performance guide: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- PostgreSQL row security policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL policy command reference: https://www.postgresql.org/docs/current/sql-createpolicy.html

## Key Decision

Do not apply Source Workflow RLS policies until identity strategy is selected.

The repo currently resolves `Profile` primarily through email mapping and server-side service authorization. The draft Source Workflow tables use `owner_id`, but that does not automatically mean a Supabase JWT `auth.uid()` equals `profiles.id`, and Prisma direct database connections do not automatically carry Supabase Auth JWT claims into row policies.

Allowed future identity strategies:

| Strategy | When it can be selected | Current state |
|---|---|---|
| `supabase-auth-user-id-mapping` | `Profile` stores a stable Supabase Auth user id and `AUTH-005` proves mapping | Not selected |
| `trusted-server-transaction-claim` | Trusted server services set a reviewed transaction-scoped owner/profile claim before Source Workflow queries | Not selected |

Rejected assumptions:

- Assuming `auth.uid() = owner_id` before `Profile` stores and proves a Supabase auth id mapping.
- Assuming Prisma direct DB connections automatically carry Supabase JWT claims.
- Treating service-role or table-owner access as proof that RLS works; service/owner/bypass roles can bypass policy behavior.

## Required Review Gates

`src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts` is the machine-readable gate. It must cover:

- identity strategy review;
- RLS default-deny review;
- owner-scoped SELECT review;
- INSERT/UPDATE `WITH CHECK` review;
- proposal approval and high-risk module write separation;
- persisted `OperatingAuditEvent` model/storage review;
- append-only audit integrity;
- protected redacted audit read DTOs;
- secret separation and Vault/backend env review;
- same-owner and cross-owner proof matrix;
- migration apply boundary;
- external-agent database access boundary.

## RLS Rules

The DATTR-024H draft intentionally enables RLS and creates no policies. That keeps draft tables fail-closed until policy behavior is reviewed.

Future policy review must name, per table:

- table name;
- command: SELECT, INSERT, UPDATE, DELETE if allowed;
- role;
- identity strategy;
- owner expression;
- `USING` expression;
- `WITH CHECK` expression for writes;
- same-owner pass proof;
- cross-owner deny proof;
- service-layer authorization pair;
- index/performance impact.

Required Source Workflow tables:

- `source_connections`
- `source_assets`
- `ai_workflow_runs`
- `ai_work_items`
- `source_naming_profiles`
- `data_unit_proposals`
- `module_write_intents`
- future `operating_audit_events`

## Audit Storage Rules

Persisted audit storage remains blocked until `AUDIT-OPS-004` and this gate align.

Future Source Workflow runtime may keep using `audit_ref`, `proof_ref`, and draft audit envelopes, but DB writes require one of:

- persisted audit storage proof with append-only behavior, redacted metadata, retention/export/purge, integrity refs, and protected read DTOs; or
- an explicit disposable-proof-only deferral that cannot be used for launch-level claims.

Audit rows must not store raw proof packets, source bodies, provider payloads, tokens, cookies, database URLs, profile IDs, row IDs, or target module final payloads.

## Secret Separation

Source Workflow rows may store only `secret_ref` and `provider_account_ref`.

Raw OAuth tokens, webhook secrets, signing secrets, refresh tokens, provider credentials, service-role keys, and database URLs must stay outside Source Workflow rows and UI DTOs. Supabase Vault or backend environment storage requires separate review and human approval before connector runtime.

## NANDA / Agent Boundary

This task touches AI Input and agent-mediated proposal surfaces.

- Current posture: protected-owner/internal only.
- External agents: no direct database access.
- External registration: `externalRegisterable=false`.
- Future external adapter work remains `DATTR-024L-CONNECTOR-RUNTIME` / `AGENT-013` gated by endpoint, auth, trust, rollback, public-safety review, deployment evidence, and human approval.

## Acceptance

Accepted when:

- `pnpm ai-input:rls-audit-storage:check` passes.
- `DATTR-024K-RLS-AUDIT-STORAGE` is recorded in `ARC-031`, `ACC-002`, backlog, sprint, tasks, completed log, and loop evidence.
- `DATTR-024L-CONNECTOR-RUNTIME` is the next implementation blocker after the required loop-115 launch-level review.
- No migration apply, RLS policy apply, DB read/write, persisted audit row, connector runtime, public output, final module write, external agent DB access, or external registration is added.

## Verification

```bash
pnpm ai-input:rls-audit-storage:check
pnpm ai-input:service-runtime:check
pnpm audit:storage-review:check
pnpm ai-input:migration-draft:check
pnpm db:validate
pnpm exec tsc --noEmit --pretty false
git diff --check
```

## Stop Conditions

Stop before:

- selecting an identity strategy without `AUTH-005` or a reviewed transaction-claim design;
- copying SQL into `prisma/migrations`;
- applying migrations or RLS policies;
- creating persisted audit rows;
- adding Source Workflow DB runtime reads/writes;
- exposing provider data, secrets, public output, final module writes, direct external-agent DB access, or external registration.
