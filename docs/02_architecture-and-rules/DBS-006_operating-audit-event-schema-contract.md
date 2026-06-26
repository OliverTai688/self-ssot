# Operating Audit Event Schema Contract

**Document ID:** `DBS-006`
**Last updated:** 2026-06-21
**Status:** Schema/BFF contract proposal for `AUDIT-OPS-001`
**Runtime implementation:** Contract and static proof only; no Prisma schema, migration, seed, route handler, server action, database read, database write, export, or admin mutation is implemented in this slice.

---

## 1. Purpose

`AUDIT-OPS-001` defines the cross-module operating audit event contract required before Personal OS expands persisted writes across Work, AI Input, Client Portal, Agent Team OS, Workflow, and high-risk modules.

The goal is not to store audit rows in this loop. The goal is to make the future append-only audit model explicit enough that each next real-data task can implement one safe slice instead of inventing its own event vocabulary.

The machine-readable companion is `src/lib/contracts/operating-audit-event.contract.ts`, validated by:

```bash
pnpm audit:ops:check
```

## 2. Source Basis

Local context reviewed:

- `docs/02_architecture-and-rules/ARC-026_admin-settings-audit-bff.md`: admin/settings currently expose a read-only no-secret audit/readiness BFF; persisted audit is deferred.
- `docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md`: every module that moves toward real data names an append-only audit need before writes.
- `docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md`: future agent operation API should append an audit event after this contract exists.
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`: module acceptance requires no hidden persistence, service-layer authorization, and explicit public-output boundaries.
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`: mature module/admin surfaces include records/audit, settings/boundaries, BFF/API/CLI, and clear real/demo/mock state.

External references reviewed:

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): application logs should consistently record security-relevant events, including data add/modify/delete/export events, without leaking sensitive values.
- [OWASP Top 10 A09: Security Logging and Monitoring Failures](https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/): high-value transactions need audit trails with integrity controls, and logs should avoid injection-prone output.
- [Supabase Platform Audit Logs](https://supabase.com/docs/guides/security/platform-audit-logs): platform audit events include timestamp, actor, action, metadata, route/status, and target, while export/retention are plan-limited.
- [GitHub Enterprise Audit Log API](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/using-the-audit-log-api-for-your-enterprise): audit APIs expose actor/time/action event streams with filtering and pagination constraints.
- [Stripe Activity Logs API](https://docs.stripe.com/api/v2/iam/activity-logs?api-version=2026-04-22.preview): account activity events model one action performed on an account.
- [pgaudit](https://www.pgaudit.org/): PostgreSQL can emit detailed session/object audit logs through the database log facility, but that is a database audit layer rather than the application operating event model.

## 3. Selected Pattern

Use an application-level append-only operating audit event, then optionally add database-level audit logging later.

Selected shape:

```txt
protected UI/API/CLI need
  -> requireUser()
  -> service-layer authorization
  -> domain operation or dry-run/proposal
  -> redacted audit envelope
  -> future append-only OperatingAuditEvent row
  -> protected admin/settings records-audit read DTO
```

Why this pattern fits this repo:

- Personal OS needs actor, action, target, result, approval, source, proof, agent, and retention fields across modules, not only SQL statement logs.
- Client Portal and high-risk modules need redacted public/private boundaries before any export or display.
- Agent operations need proposal/dry-run/approval references, not just database rows changed by a connection.
- Current blockers prevent safe persisted writes, so this loop must leave a contract and proof artifact only.

## 4. Proposed Event Envelope

Future persisted event fields:

| Field | Purpose | Sensitive-data policy |
|---|---|---|
| `id` | Stable event id | Opaque reference |
| `occurredAt`, `receivedAt` | Event time and ingestion time | UTC timestamp only |
| `actorType`, `actorRef`, `actorDisplay` | Owner/system/internal-agent/public-token/external actor | Opaque refs, hash-only values, or safe labels |
| `sessionRef`, `requestRef` | Session/request correlation | Hash or opaque ref only |
| `ipAddressHash`, `userAgentHash` | Operational correlation | Hash-only, never raw in app DTOs |
| `moduleKey`, `action` | Module/surface and stable dotted action | Enum |
| `targetType`, `targetRef`, `targetDisplay` | Resource affected | Opaque refs or safe labels only |
| `result` | Success/failure/blocked/dry-run/proposal/approval/rejection/rollback | Enum |
| `riskLevel`, `approvalLevel`, `humanApprovalRequired` | Risk and approval state | Enum/boolean |
| `sourceKind`, `sourceRef` | Server action, route, loader, CLI proof, agent dry-run, manual review, or provider event | Redacted source ref |
| `agentRef`, `operationId` | Internal AgentFacts-lite label and operation id | Safe labels only |
| `proposalRef`, `proofRef` | Proposal/evidence linkage | Opaque ref or relative proof path |
| `beforeRef`, `afterRef` | Snapshot linkage | References only, not inline private payloads |
| `metadata` | Small extra detail | Validated and redacted JSON only |
| `redactionVersion` | Redaction policy version | Safe label |
| `retentionClass` | Retention/export/purge class | Enum |
| `previousEventHash`, `eventHash` | Future tamper-evidence fields | Hash-only |

Minimum retention classes:

| Class | Intended use |
|---|---|
| `standard_180_days` | Normal owner/admin operational events and proof references. |
| `security_1_year` | Auth, public token, agent operation, and source workflow security-sensitive events. |
| `high_risk_7_year_review_required` | Finance, life, company strategy, public output, external collaboration, and final high-risk approvals. |

## 5. Event Families

| Family | Modules | Actions | Next task link |
|---|---|---|---|
| `auth.session` | Auth, settings, admin | session proof, Profile mapping, mock boundary check | `AUTH-005` |
| `work.mutation` | Work | project/task/note/deliverable mutations, refresh proof | `WORK-009` |
| `ai-input.source-workflow` | AI Input | source review, workflow start, proposal create, write-intent review, connector.revoked, provider_event.blocked | `DATTR-024-SPLIT` |
| `agent.operation` | Agent Team OS, Workflow, Work | dry-run request, proposal create, approval, registry readiness | `AGENT-OPS-001` |
| `client-portal.public-access` | Client Portal | token create/rotate/revoke, public access allowed/denied | `CLIENT-005` |
| `high-risk.proposal` | Life, Finance, Company, Chamber, Workflow | proposal create/approve/reject, export request, boundary change | future high-risk draft task |
| `admin.operator` | Admin, settings, deployment | evidence review, permission proposal, deployment marker review, audit export request | `DEPLOY-002` |

## 6. BFF Read Contract

Future protected read surface:

```txt
protected /admin or /settings records-audit tab
  -> Server Component loader or protected route handler
  -> requireUser()
  -> owner/admin service authorization
  -> audit query service
  -> redacted OperatingAuditEventList DTO
```

Allowed filters:

- occurred-at range;
- actor type;
- module key;
- action;
- result;
- risk level;
- approval level;
- source kind.

Allowed redacted DTO fields:

- event id;
- occurred time;
- actor type and safe actor display;
- module/action;
- target type and safe target display;
- result/risk/approval;
- source kind;
- internal agent label and operation id where applicable;
- proof reference;
- retention class.

DTOs must not expose:

- raw provider claims;
- raw internal profile identifiers;
- cookies, session secrets, or token verifier values;
- database connection strings or hostnames;
- raw network addresses or raw browser strings;
- private report bodies;
- raw adapter payloads;
- private source material;
- internal notes, life/finance/company strategy records, or public Client Portal token secrets.

Exports are not part of this slice. A future export path requires owner/admin authorization, date range, redacted DTO mapper, high-risk approval handling, and separate acceptance criteria.

## 7. Future Schema Sketch

This is a proposal only, not an applied Prisma change:

```prisma
model OperatingAuditEvent {
  id                    String   @id @default(uuid())
  occurredAt            DateTime
  receivedAt            DateTime @default(now())
  actorType             String
  actorRef              String?
  actorDisplay          String?
  sessionRef            String?
  requestRef            String?
  ipAddressHash         String?
  userAgentHash         String?
  moduleKey             String
  action                String
  targetType            String
  targetRef             String?
  targetDisplay         String?
  result                String
  riskLevel             String
  approvalLevel         String
  humanApprovalRequired Boolean
  sourceKind            String
  sourceRef             String?
  agentRef              String?
  operationId           String?
  proposalRef           String?
  proofRef              String?
  beforeRef             String?
  afterRef              String?
  metadata              Json?
  redactionVersion      String
  retentionClass        String
  previousEventHash     String?
  eventHash             String?
}
```

Suggested indexes for a future reviewed migration:

- `(moduleKey, occurredAt desc)`;
- `(actorType, occurredAt desc)`;
- `(action, occurredAt desc)`;
- `(result, riskLevel, occurredAt desc)`;
- `(targetType, targetRef, occurredAt desc)`;
- `(operationId, occurredAt desc)`.

Do not add this model until the migration impact, retention policy, and service-layer authorization have been reviewed.

## 8. Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Persist audit rows immediately | Current loop has no approved migration target, retention review, or safe write proof. |
| Use only PostgreSQL statement auditing | It misses product actor, approval, source, proof, public/private DTO, and agent operation semantics. |
| Store raw generated report bodies | Risks leaking env status, private evidence text, and future sensitive payloads into app-facing records. |
| Use one generic JSON blob only | Makes filtering, retention, authorization, and acceptance proof weak. |
| Add public audit route | Audit data is owner/admin protected and must not become public output. |
| Start with Client Portal token lifecycle writes | Public token lifecycle is high risk and still needs approved schema/action and safe DB target. |

## 9. Acceptance

`AUDIT-OPS-001` is complete when:

- this formal `DBS-006` document exists;
- `src/lib/contracts/operating-audit-event.contract.ts` exports `OPERATING_AUDIT_EVENT_FIELDS`, `OPERATING_AUDIT_EVENT_FAMILIES`, `OPERATING_AUDIT_BFF_CONTRACT`, and `OPERATING_AUDIT_CONTRACT_SUMMARY`;
- `pnpm audit:ops:check` validates required fields, event families, module/surface coverage, referenced docs, no-write boundaries, redaction, retention, and tamper-evidence fields;
- `ACC-002`, `PLN-060`, `PLN-061`, `tasks.md`, `RPT-007`, loop state, and generated loop evidence all reference the same no-write contract;
- no route handler, server action, Prisma schema change, migration, seed, DB read/write, public output expansion, token lifecycle write, admin mutation, high-risk final write, autonomous agent write, or external registration is added.

## 10. Next Implementation Order

1. If Supabase public env and signed-in `/auth/status` evidence appear, run `AUTH-005`.
2. If an approved disposable Work proof target appears, run `WORK-009`.
3. If proof remains absent, use `AUDIT-OPS-002` to map existing backend operations and per-module agent commands to the required operating audit event families before any persisted audit writer is introduced.
4. If AI Input persistence is selected, split `DATTR-024` into audited Source Workflow BFF/schema-review/proof-target slices before persistence.
5. Implement persisted audit only after a reviewed migration task confirms retention, hash-chain behavior, redacted metadata rules, and admin/settings read authorization.
6. Client Portal lifecycle writes and agent protected operation API remain downstream of the audit schema and owner/admin authorization proof.

## 11. AUDIT-OPS-002 Runtime Mapping Follow-Up

`AUDIT-OPS-002` adds a no-write operating audit readiness catalog in `src/lib/contracts/operating-audit-readiness-catalog.contract.ts`, validated by:

```bash
pnpm audit:readiness:check
```

The catalog maps 13 backend operation rows and 10 per-module agent command rows to the `AUDIT-OPS-001` event families: `auth.session`, `work.mutation`, `ai-input.source-workflow`, `agent.operation`, `client-portal.public-access`, `high-risk.proposal`, and `admin.operator`.

Selected pattern:

```txt
operation contract or module agent command
  -> operation id and owner surface
  -> future audit event family and action
  -> risk/approval/source kind
  -> stop condition
  -> no-write readiness proof
```

This is still contract/static-proof only. It does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, admin mutations, high-risk final writes, autonomous agent execution, external agent database access, or external registration.

Research references used for this follow-up:

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): application logs should be consistent, application-owned, and include business/security events such as data changes and exports without over-logging sensitive values.
- [OWASP A09 Security Logging and Monitoring Failures](https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/): high-value transactions need audit trails with integrity controls and logging must avoid injection or sensitive information exposure.
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/): structured log/event records should keep stable top-level fields and attributes so records can be interpreted by downstream systems.

## 12. AUDIT-OPS-003 Draft Envelope Builder Follow-Up

`AUDIT-OPS-003` adds a pure server-only operating audit event envelope builder in `src/lib/services/operating-audit-event-builder.ts`, validated by:

```bash
pnpm audit:event-builder:check
```

The builder converts approved `AUDIT-OPS-002` operation ids into redacted draft envelopes aligned to the `AUDIT-OPS-001` field contract. It is the final no-write step before any reviewed persisted audit writer.

Selected pattern:

```txt
AUDIT-OPS-002 operation id
  -> mapped event family/action/result/risk/approval/source
  -> safe actor/source/target/proof metadata
  -> redacted draft OperatingAuditEvent envelope
  -> no persistence, no route, no server action, no DB access
```

The builder:

- rejects unknown operation ids and unsafe top-level strings;
- redacts sensitive metadata keys or values;
- blocks risk or approval downgrades from the mapped operation row;
- emits `draft_only_not_persisted` envelopes with `previousEventHash` and `eventHash` placeholders;
- keeps `runtimeAuditStorageImplemented=false`, `schemaMigrationImplemented=false`, `databaseWriteAdded=false`, `publicOutputAdded=false`, `directDatabaseAccessByExternalAgents=false`, and `externalRegisterable=false`.

This slice does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, database reads, database writes, public output expansion, token lifecycle writes, admin mutations, high-risk final writes, autonomous agent execution, external agent database access, persisted audit rows, exports, provider calls, network calls, or external registration.

Next storage work must still review:

- Prisma schema and migration impact;
- service-layer authorization and owner/admin read DTOs;
- append-only semantics and rollback policy;
- retention/export/purge behavior;
- future hash-chain integrity strategy;
- local/disposable proof target and cleanup evidence.

## 13. AUDIT-OPS-004 Storage Review Gate

`AUDIT-OPS-004` adds an operating audit storage review contract in `src/lib/contracts/operating-audit-storage-review.contract.ts`, validated by:

```bash
pnpm audit:storage-review:check
```

This is the persistence gate after the draft envelope builder and before any schema migration, writer service, route, server action, DB read, DB write, admin audit read path, export, or external registration.

Selected pattern:

```txt
AUDIT-OPS-001 event schema
  -> AUDIT-OPS-002 operation mapping
  -> AUDIT-OPS-003 redacted draft envelope
  -> AUDIT-OPS-004 storage review checklist
  -> future SCH/MIG/service proof only after approval and proof target
```

The review contract covers these required decisions:

- `audit.schema.model-review`: model fields, nullability, redaction policy, retention class, and rollback review;
- `audit.schema.index-review`: owner/admin filter indexes and write impact review;
- `audit.authz.service-boundary`: trusted writer boundary, owner/admin read authorization, and RLS stance;
- `audit.writer.append-only-boundary`: create-only writer, failure handling, idempotency, and rollback policy;
- `audit.dto.redaction-boundary`: protected redacted list/detail DTOs and no raw proof body rendering;
- `audit.retention.export-purge-policy`: retention classes, export approval, and purge review;
- `audit.integrity.hash-chain-review`: explicit future tamper-evidence scope before any integrity claim;
- `audit.proof-target.disposable-plan`: local/disposable proof target, write confirmation, and cleanup evidence;
- `audit.migration.stop-conditions`: migration generation/apply refusal rules;
- `audit.manual-ops.upgrade-boundary`: `M1_MANUAL_OPS_READY` stays separate from formal launch-level upgrade.

Research references used for this gate:

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html): application logging should cover security and operational events while avoiding sensitive data over-logging.
- [OWASP A09 Security Logging and Monitoring Failures](https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/): high-value transactions need audit trails and integrity controls.
- [Prisma Migrate production deployment docs](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate): production schema changes should go through reviewed migrations and deploy flow, not ad hoc mutation.
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security) and [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html): persisted audit reads need defense-in-depth authorization design before runtime exposure.

This slice does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, database reads, database writes, public output expansion, token lifecycle writes, admin mutations, high-risk final writes, autonomous agent execution, external agent database access, persisted audit rows, exports, provider calls, network calls, or external registration.
