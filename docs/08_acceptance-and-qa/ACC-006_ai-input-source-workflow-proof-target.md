# AI Input Source Workflow Proof Target Boundary

**Document ID:** `ACC-006`
**Last updated:** 2026-06-23
**Status:** Active for `DATTR-024C`; runner gate added by `DATTR-024I-PROOF-RUNNER`

## Purpose

Define the disposable/local proof target boundary for future AI Input Source Workflow persistence proof.

`DATTR-024C` does not run writes. It creates the acceptance contract that must pass before any future proof harness writes SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, ModuleWriteIntent, or OperatingAuditEvent rows.

`DATTR-024I-PROOF-RUNNER` adds `pnpm ai-input:proof` as the dry-run-first runner gate. It can classify target readiness and write confirmations into a no-secret packet, but the loop 112 implementation still stops before DB connection, migration apply, and DB writes.

## Source Basis

Local basis:

- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md`
- `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md`
- `docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md`
- `docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md`

External primary references:

- [Prisma Migrate development and production workflow](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Supabase local development](https://supabase.com/docs/guides/local-development)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

## Safety Contract

Machine-readable safety markers:

- No Prisma schema edit in DATTR-024C.
- No migration apply in DATTR-024C.
- No runtime DB read/write in DATTR-024C.
- No connector runtime in DATTR-024C.
- No provider data in DATTR-024C.
- No public output expansion in DATTR-024C.
- No module final write in DATTR-024C.
- No external agent database access in DATTR-024C.
- `externalRegisterable: false`.

Future proof writes must default to dry-run and stay blocked unless all of these are true:

- `--run` is passed to a future `pnpm ai-input:proof` command.
- `AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL` is set.
- `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1` is set.
- `PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA` is set.
- The target is local, or `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1` is set for an explicitly approved disposable remote target.
- A remote disposable target has a database-name marker such as `ai_input_proof`, `source_workflow_proof`, `disposable`, `scratch`, `test`, `local`, or `tmp`.

The proof packet must never print database URLs, database hosts, credentials, Supabase keys, cookies, tokens, raw claims, profile IDs, row IDs, provider payloads, raw adapter payloads, source file bodies, private source material, or user data.

## DATTR-024I Runner Gate

The current runner gate is:

- command: `pnpm ai-input:proof`;
- checker: `pnpm ai-input:proof-runner:check`;
- runner file: `scripts/ai-input-source-workflow-proof-runner.mjs`;
- checker file: `scripts/check-ai-input-source-workflow-proof-runner.mjs`;
- default mode: `dry_run`;
- write-request mode: `--run`, still with `writesExecuted=false` in this slice;
- next runtime slice: `DATTR-024J-SERVICE-AUTHZ-RUNTIME`.

`DATTR-024I-PROOF-RUNNER` is accepted only as a no-write proof runner boundary. It does not replace human review of `MIG-003`, it does not apply `prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql`, and it does not prove formal launch readiness.

## Future Proof Sequence

When a future proof harness is approved and all safety gates pass, it should:

1. Classify the target without printing URL or host.
2. Confirm write flags and the exact confirmation phrase.
3. Optionally apply a reviewed migration to the disposable/local target only.
4. Create a proof-only owner/profile context using `example.invalid`.
5. Create proof-only SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, and ModuleWriteIntent records.
6. Keep ModuleWriteIntent proposal-only; do not write final Work, Research, Life, Finance, Chamber, Company, Client Portal, public output, auth/permission, or external collaboration rows.
7. Record or propose OperatingAuditEvent evidence under `ai-input.source-workflow`.
8. Disconnect and reconnect before read verification.
9. Verify proof rows by marker and `ownerProfileId`.
10. Delete proof-only rows by marker and `ownerProfileId`.
11. Verify cleanup count is zero for every proof object.

## Migration Boundary

`DATTR-024C` is not a migration task.

Allowed in this slice:

- proof target rules;
- write confirmation rules;
- cleanup and rollback rules;
- no-secret evidence rules;
- static contract and checker.

Still blocked:

- Prisma schema edit;
- migration apply;
- seed change;
- DB read/write runtime;
- connector runtime;
- provider sync;
- public output expansion;
- module final writes.

A future setup step may run `pnpm db:deploy` only against a target that passes the proof target classifier and only after a reviewed migration exists. `prisma migrate dev` and `prisma migrate reset` remain development-only and must not run against valuable launch data.

## RLS And Authz Boundary

Disposable proof can prove service-layer persistence mechanics, but it cannot claim browser/API launch readiness by itself.

To claim DB-backed AI Input launch readiness later:

- BFF entry points must call `requireUser()`.
- Source Workflow services must scope by `ownerProfileId`.
- Module writes must pass target module authorization.
- RLS must be enabled and policies reviewed before any Supabase-exposed API path.
- Service keys and RLS-bypass roles must never be exposed to browser/customer code.

## Transaction Boundary

Future write proof should use short, auditable steps.

No connector fetch, AI model call, OCR, transcription, webhook handling, file ingestion, or external IO may run inside a database transaction. Any future multi-step transaction needs a short timeout and explicit retry plan for write conflicts.

## Acceptance

`DATTR-024C` is accepted when:

- `src/lib/contracts/ai-input-source-workflow-proof-target.contract.ts` exports `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS`, `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_ENV`, `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_REQUIREMENTS`, `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SEQUENCE`, and `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SUMMARY`.
- The contract names all seven required objects.
- The contract defines target classification, write confirmations, migration boundary, data isolation, cleanup/rollback, audit proof, no-secret output, RLS/authz, transaction behavior, and stop conditions.
- `scripts/check-ai-input-source-workflow-proof-target.mjs` exists and is exposed as `pnpm ai-input:proof-target:check`.
- `pnpm ai-input:proof-target:check` validates this doc, the contract, `ARC-031`, `SCH-003`, `ACC-002`, `PLN-060`, `package.json`, required official references, and no-write safety markers.
- No runtime DB read/write, Prisma schema edit, migration apply, route handler, server action, connector runtime, public output, module final write, external agent database access, or external registration is added.

## Next Decision

After `DATTR-024C`:

1. Run `AUTH-005` if Supabase public env and signed-in `/auth/status` evidence appear.
2. Run `WORK-009` if a safe Work proof target appears.
3. Otherwise after loop 112, continue to `DATTR-024J-SERVICE-AUTHZ-RUNTIME` while Source Workflow proof target evidence remains Manual Ops.
