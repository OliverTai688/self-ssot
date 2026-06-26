# AI Input Source Workflow Schema Review Packet

| Field | Value |
|---|---|
| Document ID | SCH-003 |
| Status | DATTR-024B completed as proposal-only schema review |
| Date | 2026-06-21 |
| Runtime scope | No runtime implementation |
| Related docs | ARC-031, DBS-002, DBS-006, AUT-001, ARC-015, ARC-027, ACC-002 |

> 2026-06-23 update: `DATTR-024H-MIGRATION-DRAFT` intentionally materialized this review into `prisma/schema.prisma` plus `MIG-003` and a review-only SQL draft outside `prisma/migrations`. The original `DATTR-024B` no-migration boundary remains historically true for loop 61; later schema materialization is now validated by `pnpm ai-input:migration-draft:check`.

## 1. Purpose

This packet turns the AI Input Source Workflow persistence plan into an executable schema-review boundary before any migration or database write. It narrows DATTR-024B to a Proposal-only artifact set:

- formal schema review matrix;
- machine-checkable contract;
- no-write / no-migration safety guards;
- official-source-informed migration and proof boundary;
- next implementation slice: DATTR-024C disposable proof target preparation.

DATTR-024B does not edit `prisma/schema.prisma`, does not create or apply a migration, does not read or write the database, does not call a connector, does not expand public output, and does not perform final module writes.

Machine-readable safety markers:

- No Prisma schema edit.
- No migration apply.
- No runtime DB read/write.
- No connector runtime.
- No public output expansion.
- No module final write.

## 2. Source Basis

Local basis:

- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `docs/02_architecture-and-rules/DBS-002_source-workflow-schema-contract.md`
- `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md`
- `docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md`
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md`
- `docs/02_architecture-and-rules/ARC-027_ai-input-formal-readiness-bff.md`

External primary references:

- [Prisma Migrate development and production workflow](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

Key implications for this repo:

- Use create-only migration review before applying schema changes to a valuable database.
- Keep workflow transitions short and auditable; long-running work must not sit inside a transaction.
- Enable row-level security and policies before exposing future source workflow tables through Supabase-facing paths.
- Never store provider tokens or raw secrets in normal source workflow rows.
- Foreign keys protect integrity, but referencing-side indexes must be planned explicitly for owner-scoped reads.

## 3. Current Code Fit

Current runtime has a formal readiness BFF split and local mock/prototype surfaces. The Prisma schema does not yet contain the Source Workflow persistence models. This is correct for DATTR-024B.

The new static contract is:

```txt
src/lib/contracts/ai-input-source-workflow-schema-review.contract.ts
```

The new verifier is:

```bash
pnpm ai-input:schema-review:check
```

The verifier asserts that this review remains a no-write schema packet and that the next runnable slice is DATTR-024C.

## 4. Required Object Matrix

| Object | Proposed table | Required owner/auth boundary | Retention/redaction boundary | Audit family | Stop condition |
|---|---|---|---|---|---|
| SourceConnection | `source_connections` | `ownerProfileId`; `requireUser()`; service-layer authorization before metadata return | Explicit retention class; secret material by `secretRef/providerRef`, not raw fields | `ai-input.source-workflow.connection.*` | No connector runtime or provider calls in DATTR-024B |
| SourceAsset | `source_assets` | `ownerProfileId`; optional `sourceConnectionId`; owner-scoped loaders | `retentionClass`, source state, deletion/revocation markers, redacted view models | `ai-input.source-workflow.asset.*` | No runtime DB read/write and no public output route exposure |
| AIWorkflowRun | `ai_workflow_runs` | `ownerProfileId`; initiating actor; source refs where applicable | Bounded run logs; source IDs, provider refs, proof refs; redacted prompt/output summaries | `ai-input.source-workflow.run.*` | No long transaction design and no autonomous final module write |
| AIWorkItem | `ai_work_items` | `ownerProfileId`; parent run relation; worker adapters get scoped context only | Separate durable metadata from expiring raw inputs/intermediate outputs | `ai-input.source-workflow.work-item.*` | No external agent direct DB access |
| DataUnitProposal | `data_unit_proposals` | `ownerProfileId`; source asset and provenance refs; target module permission before promotion | Rejected proposals retain minimal reason/provenance and expire raw payload | `ai-input.source-workflow.proposal.*` | No hidden persistence of accepted-looking demo data |
| ModuleWriteIntent | `module_write_intents` | `ownerProfileId`; approver actor when approved; target module and source lineage | Preserve decision state, rollback refs, and proof refs after raw payload expiry | `ai-input.source-workflow.write-intent.*` | No final high-risk module writes without human approval |
| OperatingAuditEvent | `operating_audit_events` | `ownerProfileId` where available; subject refs for lineage | Append-only retention class, hash/checksum, proof artifact refs | `ai-input.source-workflow.audit.*` | No public audit payload exposure |

## 5. Cross-Cutting Rules

Every owner-scoped object needs `ownerProfileId`. Future BFF and Server Action entry points must call `requireUser()` and then use service-layer authorization before returning or mutating source workflow data.

Every UI-visible source, proposal, workflow, or audit payload needs an explicit `redactionVersion`. Every retained raw payload or derived payload needs `retentionClass`, source lineage, and deletion/revocation behavior.

`OperatingAuditEvent` must cover at least these outcomes before DB-backed source workflow is accepted:

- reviewed;
- blocked;
- proof started/completed;
- approved;
- rejected;
- rollback requested/completed.

AI/agent scope remains internal runtime or owner-visible proposal review only. `externalRegisterable: false` is mandatory until endpoint, auth, trust, permission, public-safety, rollback, observability, and human approval gates are complete.

## 6. Migration Boundary

DATTR-024B is not a migration task. The migration sequence must be:

1. DATTR-024B: schema review packet and static proof only.
2. DATTR-024C: disposable proof target boundary, write-confirmation policy, cleanup criteria, and rollback checklist.
3. Create-only migration draft for review.
4. Disposable database proof run with explicit `WORK_PROOF_DATABASE_URL`-style target and write confirmations.
5. Human review before applying to any valuable Supabase/Postgres database.

No migration apply is allowed before DATTR-024C proof-target rules exist and the owner approves the target.

## 7. Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Add Prisma models directly in DATTR-024B | It would exceed the selected no-write review slice and create migration-review risk before proof target rules exist. |
| Implement connector sync first | It would cross source-consent, secret storage, retention, and provider-runtime boundaries without persistence proof. |
| Store raw provider payload in normal JSON columns | It conflicts with AUT-001 retention, privacy, and secret-separation requirements. |
| Let AI workflow runs directly write target modules | It violates proposal-first and high-risk human approval rules. |
| Make source workflow audit editable | It weakens DBS-006 append-only operating evidence semantics. |

## 8. Verification

DATTR-024B is accepted when all of the following pass:

```bash
pnpm ai-input:schema-review:check
pnpm ai-input:split:check
pnpm audit:ops:check
pnpm exec tsc --noEmit --pretty false
pnpm db:validate
```

The schema review checker must verify:

- all seven required objects exist in the contract and this doc;
- official reference links are preserved;
- no-write safety flags are false for schema write, migration apply, runtime reads/writes, connector runtime, public output, module final writes, and external agent DB access;
- `prisma/schema.prisma` does not yet contain the proposed DATTR-024B models;
- `DATTR-024C` is the next runnable slice.

## 9. Next Task

Recommended next task after this packet:

```txt
DATTR-024C - Prepare AI Input Source Workflow disposable proof target boundary.
```

Scope: define proof database target rules, write-confirmation variables, cleanup SQL/reversal expectations, migration create-only review gate, seed/test data naming, audit proof refs, and stop conditions before any source workflow table is written.
