# AI Input Source Workflow BFF Split Contract

**Document ID:** `ARC-031`
**Status:** Active contract
**Last updated:** 2026-06-23
**Related tasks:** `DATTR-024-SPLIT`, `DATTR-024`, `DATTR-024A`, `DATTR-024B`, `DATTR-024C`, `DATTR-024D`, `DATTR-024E`, `DATTR-024F`, `DATTR-024G`, `DATTR-024H`, `DATTR-024I`, `DATTR-024J`, `DATTR-024K`, `DATTR-024L`, `AIINPUT-OPS-002`

## Purpose

`DATTR-024` is too large to implement safely as one persistence task. It combines protected AI Input formal-mode reads, schema review, proof-target setup, proposal writes, connector consent, audit, and high-risk module boundaries.

This contract splits `DATTR-024` into reviewed slices that can loop safely:

1. protected read DTO and formal empty/unavailable state;
2. schema review packet and migration boundary;
3. disposable proof target;
4. owner-reviewed proposal actions with audit mapping;
5. connector runtime consent/revoke/provider-event boundary;
6. service authorization and BFF operation boundary before persistence implementation;
7. connector runtime approval package before provider activation.

`DATTR-024-SPLIT` is intentionally no-migration and no-runtime-write. It creates an executable task shape before the persistence step.

## Source Basis

### Local Sources

- `DBS-006_operating-audit-event-schema-contract.md` defines `AUDIT-OPS-001` and the `ai-input.source-workflow` event family.
- `DBS-005_per-module-real-data-migration-matrix.md` identifies AI Input as `formal_readiness` and names the next objects: `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `DataUnitProposal`, and `ModuleWriteIntent`.
- `ARC-027_ai-input-formal-readiness-bff.md` defines the current formal-mode readiness bridge and no-hidden-mock rule.
- `DBS-002_source-workflow-schema-contract.md` defines the source workflow schema proposal and migration questions.
- `SCH-003_ai-input-source-workflow-schema-review.md` completes `DATTR-024B` as the proposal-only schema review packet and no-write migration boundary.
- `ACC-006_ai-input-source-workflow-proof-target.md` completes `DATTR-024C` as the disposable/local proof-target boundary and no-write acceptance contract.
- `src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts` completes `DATTR-024D-CONTRACT` as the no-write owner-reviewed proposal action contract before any runtime server action.
- `src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts` completes `DATTR-024E-CONTRACT` as the no-runtime connector consent/revoke/provider-event boundary before OAuth, webhooks, polling, provider API calls, file ingestion, OCR, transcription, or raw adapter payload handling.
- `src/lib/contracts/ai-input-source-workflow-service-authz.contract.ts` completes `DATTR-024F-CONTRACT` as the no-runtime service authorization and BFF operation boundary before Source Workflow persistence implementation.
- `docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md`, `prisma/schema.prisma`, and `prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql` complete `DATTR-024H-MIGRATION-DRAFT` as a no-apply schema/migration draft before proof-runner or runtime service implementation.
- `scripts/ai-input-source-workflow-proof-runner.mjs` completes `DATTR-024I-PROOF-RUNNER` as a dry-run-first no-secret proof runner gate that classifies `AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL`, refuses unsafe/valuable targets, requires explicit write confirmations, and still stops before DB connection or writes until the later service/RLS/audit gates pass.
- `src/lib/services/ai-input-source-workflow.service.ts` completes `DATTR-024J-SERVICE-AUTHZ-RUNTIME` as a callable server-only service boundary that calls `requireUser()`, returns UI-safe redacted DTOs, and keeps Source Workflow DB runtime disabled.
- `docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md` and `src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts` complete `DATTR-024K-RLS-AUDIT-STORAGE` as the RLS/audit storage review gate before DB read/write runtime.
- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md` and `src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts` complete `DATTR-024L-CONNECTOR-RUNTIME` as the connector runtime approval package before OAuth, webhook, polling, provider API, secret write, DB read/write, or external registration activation.
- `src/lib/services/ai-input-readiness.service.ts` completes `AIINPUT-OPS-002` as the formal source control matrix contract before SourceConnection persistence or connector runtime.
- `AUT-001_source-intake-security-privacy.md` defines consent, retention, deletion, high-risk source handling, and external-agent restrictions.
- `ARC-015_source-connection-adapter-contract.md` defines SourceConnection / InputAdapter lifecycle and connector stop conditions.
- `ARC-028_nanda-agent-protocol-alignment.md` keeps agent-facing source workflow capabilities internal/protected and `externalRegisterable: false`.

### Official Sources

- [Next.js fetching data](https://nextjs.org/docs/app/getting-started/fetching-data): Server Components can fetch server-side data, but auth and authorization remain required.
- [Next.js mutating data](https://nextjs.org/docs/app/getting-started/mutating-data): Server Functions/Actions are the mutation boundary and should authenticate before changing data.
- [Next.js forms guide](https://nextjs.org/docs/app/guides/forms): server-side validation is the right default for form/action inputs.
- [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route): route handlers are custom HTTP endpoints and should be delayed for provider events until verification and audit are designed.
- [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security): exposed tables should enable RLS, and policies should control API visibility.
- [Prisma best practices](https://www.prisma.io/docs/orm/more/best-practices): production migrations should use reviewed, committed migrations and deploy-only behavior.

## BFF Boundary

```txt
Protected AI Input formal UI
  -> Server Component loader
  -> requireUser()
  -> AI Input service authorization
  -> source workflow read model or unavailable state
  -> UI-safe mapper
  -> Client Component interaction
```

Future owner-reviewed proposal writes use:

```txt
Client form/action
  -> Server Action
  -> server-side validation
  -> requireUser()
  -> AI Input service authorization
  -> proposal record
  -> OperatingAuditEvent reference
  -> UI-safe result
```

Route handlers are not part of the first persistence slice. Provider events, webhooks, polling, OAuth callbacks beyond existing auth, and external connector runtime belong to the `DATTR-024E` boundary plus the `DATTR-024L` approval package after consent, replay protection, verification, secret storage, identity/RLS/audit storage, proof target, rollback, and human approval are complete.

## Split Slices

| Slice | Mode | Status | Done when |
|---|---|---|---|
| `DATTR-024A` | Protected read contract | Done in loop 59 | Formal AI Input can show a real unavailable/empty source workflow DTO without hidden mock rows |
| `DATTR-024B` | Schema review packet | Done in loop 61 | Source workflow and audit schema boundaries are reconciled before migration |
| `DATTR-024C` | Disposable proof target | Done in loop 62 as boundary-only; blocked for writes until explicit target approval | Proof-only source workflow persistence can run against an explicit safe target |
| `DATTR-024D` | Proposal action contract | Done in loop 66 as contract-only; runtime server actions remain blocked until explicit approval | Owner-reviewed proposal actions are defined without final module writes |
| `DATTR-024E` | Connector boundary review | Done in loop 67 as contract-only; connector runtime remains human approval | Consent/revoke/provider-event boundaries are approved before connector runtime |
| `DATTR-024F` | Service authorization and BFF operation boundary | Done in loop 108 as contract-only; runtime loaders/actions remain blocked until proof target, migration, authz implementation, and RLS/audit proof exist | Source Workflow operations have `requireUser()`, owner scope, UI-safe DTO, audit, high-risk, and agent boundaries before persistence |
| `DATTR-024H` | Create-only migration draft | Done in loop 111 as schema/migration draft only; migration apply, DB writes, service runtime, RLS policy apply, audit storage, and connector runtime remain blocked | Prisma schema and review-only SQL draft make Source Workflow tables reviewable before proof-runner work |
| `DATTR-024I` | Dry-run-first proof runner | Done in loop 112 as no-write runner gate; actual DB connection/write proof remains blocked until safe target, service authz runtime, RLS/audit proof, and reviewed apply boundary exist | `pnpm ai-input:proof` emits no-secret target/readiness packets and `pnpm ai-input:proof-runner:check` verifies runner/task memory markers |
| `DATTR-024J` | Service authz runtime boundary | Done in loop 113 as server-only no-DB runtime boundary | `src/lib/services/ai-input-source-workflow.service.ts` calls `requireUser()`, maps DATTR-024F operations, and keeps `runtimeDbReadEnabled=false` / `runtimeDbWriteEnabled=false` |
| `DATTR-024K` | RLS and audit storage review gate | Done in loop 114 as review-only policy/audit gate; identity strategy, policy apply, audit storage runtime, and DB reads/writes remain blocked | `AUT-006`, `src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts`, and `pnpm ai-input:rls-audit-storage:check` make RLS/audit prerequisites machine-checkable |
| `DATTR-024L` | Connector runtime approval package | Done in loop 116 as approval-only security gate; OAuth, webhooks, polling, provider runtime, secret writes, DB reads/writes, and external registration remain blocked | `AUT-007`, `src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts`, and `pnpm ai-input:connector-runtime:check` make connector activation prerequisites machine-checkable |
| `AIINPUT-OPS-002` | Source control matrix contract | Done in loop 69 as read-only/formal UI contract | Formal AI Input can show source/input/risk/status/permission boundaries without mock rows or connector runtime |

## Required Objects

- `SourceConnection`
- `SourceAsset`
- `AIWorkflowRun`
- `AIWorkItem`
- `DataUnitProposal`
- `ModuleWriteIntent`
- `OperatingAuditEvent`

## Audit Mapping

Every source workflow persistence or proposal slice maps to `AUDIT-OPS-001`:

| Operation | Event family | Example actions |
|---|---|---|
| Formal read unavailable/empty | `ai-input.source-workflow` | `read.blocked`, `read.unavailable` |
| Schema review | `admin.operator` and `ai-input.source-workflow` | `schema.reviewed`, `schema.blocked` |
| Proof target run | `ai-input.source-workflow` | `proof.started`, `proof.cleaned_up` |
| Proposal lifecycle | `ai-input.source-workflow` | `proposal.created`, `proposal.approved`, `proposal.rejected` |
| Connector consent/revoke | `ai-input.source-workflow` | `connector.consent_changed`, `connector.revoked`, `provider_event.blocked` |
| Source control matrix | `ai-input.source-workflow` | `connection.blocked`, `provider_event.blocked`, `write-intent.review` |
| Service authorization / BFF operations | `ai-input.source-workflow` | `read.listed`, `read.detail`, `asset.reviewed`, `workflow_run.reviewed`, `work_item.reviewed`, `proposal.reviewed`, `write_intent.reviewed`, `audit_lineage.reviewed` |
| Connector runtime approval | `ai-input.source-workflow` | `connector.runtime_approval_reviewed`, `connector.runtime_blocked`, `provider_event.runtime_blocked` |

## DATTR-024D-CONTRACT Proposal Action Boundary

`DATTR-024D-CONTRACT` defines the owner-reviewed action vocabulary before any runtime action exists:

- Contract artifact: `src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts`.
- Checker artifact: `scripts/check-ai-input-source-workflow-proposal-action.mjs`, exposed as `pnpm ai-input:proposal-action:check`.
- Target objects: `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- Required command ids include `ai-input.proposal.review`, `ai-input.proposal.request_changes`, `ai-input.proposal.approve_for_write_intent`, `ai-input.proposal.reject`, `ai-input.proposal.archive`, `ai-input.write-intent.review`, `ai-input.write-intent.approve_draft`, `ai-input.write-intent.request_changes`, `ai-input.write-intent.reject`, and `ai-input.write-intent.cancel`.
- Lifecycle states include drafted, owner review, changes requested, approved for write intent, write-intent draft, approved for manual apply, rejected, archived, superseded, and blocked high risk.
- Approval levels include `AUTO_PROPOSE_ONLY`, `OWNER_REVIEW_REQUIRED`, `HUMAN_APPROVAL_REQUIRED`, `BLOCKED_UNTIL_PROOF_TARGET`, and `BLOCKED_HIGH_RISK`.
- Future runtime proposal actions must call `requireUser()`, enforce service-layer authorization, preserve source/proposal/write-intent/audit refs, and keep no-secret output.
- This contract is not a runtime mutation slice: no route handler, server action, Prisma schema edit, migration, seed, DB read/write, connector runtime, provider data read, public output, module final write, external collaboration, external agent database access, or external registration is added.
- NANDA posture remains internal/proposal-only and protected-owner visible; `externalRegisterable: false`.

## DATTR-024E-CONTRACT Connector Boundary

`DATTR-024E-CONTRACT` defines the connector consent and provider-event vocabulary before any connector runtime exists:

- Contract artifact: `src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts`.
- Checker artifact: `scripts/check-ai-input-source-workflow-connector-boundary.mjs`, exposed as `pnpm ai-input:connector-boundary:check`.
- Provider families include manual, local_file, URL, RSS, Google Drive, Google Docs, Gmail, LINE, Telegram, and GitHub Markdown.
- Boundary areas include consent scope, pause/resume/revoke, provider-event verification, replay protection, secret separation, retention/deletion, audit refs, and runtime stop conditions.
- Required command ids include `ai-input.connector.scope.review`, `ai-input.connector.consent.grant`, `ai-input.connector.pause`, `ai-input.connector.resume`, `ai-input.connector.revoke`, `ai-input.provider-event.receive`, `ai-input.provider-event.verify`, `ai-input.provider-event.reject_replay`, `ai-input.provider-event.block`, and `ai-input.connector.retention.delete_request`.
- Connector state changes map to the `ai-input.source-workflow` audit family with actions such as `connector.consent_granted`, `connector.paused`, `connector.resumed`, `connector.revoked`, `provider_event.verified`, `provider_event.blocked`, `provider_event.replay_rejected`, and `retention.delete_requested`.
- Secret separation is mandatory: OAuth tokens, webhook secrets, signing secrets, refresh tokens, and provider credentials stay outside source workflow rows and UI DTOs.
- This contract is not a connector runtime slice: no route handler, OAuth callback, webhook endpoint, polling job, provider API call, file ingestion, OCR, transcription, raw adapter payload exposure, Prisma schema edit, migration apply, DB read/write, public output, module final write, external collaboration, external agent database access, or external registration is added.
- NANDA posture remains protected-owner visible and internal/proposal-only; `externalRegisterable: false`.

Official references used for the connector boundary:

- OAuth 2.0 token revocation: https://datatracker.ietf.org/doc/html/rfc7009
- GitHub webhook signature validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Stripe webhook endpoint and signature guidance: https://docs.stripe.com/webhooks and https://docs.stripe.com/webhooks/signature
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

## AIINPUT-OPS-002 Source Control Matrix Boundary

`AIINPUT-OPS-002` defines the formal source control matrix before any `SourceConnection` persistence or connector runtime exists:

- Contract artifact: `AIInputSourceControlMatrixContract` in `src/types/ai-input-readiness.ts` and `src/lib/services/ai-input-readiness.service.ts`.
- Checker artifact: `scripts/check-ai-input-source-control-matrix.mjs`, exposed as `pnpm ai-input:source-control:check`.
- UI artifact: `/ai-input` formal mode renders the source control matrix with source, provider, input mode, risk, connection status, next action, missing permissions, boundary, and audit refs.
- Required input modes include manual, polling, webhook, event, scheduled, and one-time.
- Required source rows cover manual import, LINE, Google Docs, RSS, Gmail, GitHub/Markdown, and Telegram.
- Runtime stays blocked: no route handler, server action, OAuth/webhook/polling runtime, provider API call, file ingestion, OCR/transcription, raw adapter payload exposure, DB read/write, public output, high-risk module final write, external agent database access, or external registration.

## DATTR-024F-CONTRACT Service Authorization Boundary

`DATTR-024F-CONTRACT` defines the service authorization and BFF operation vocabulary before `DATTR-024` persistence implementation:

- Contract artifact: `src/lib/contracts/ai-input-source-workflow-service-authz.contract.ts`.
- Checker artifact: `scripts/check-ai-input-source-workflow-service-authz.mjs`, exposed as `pnpm ai-input:service-authz:check`.
- Required objects include `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- Required operation ids include `ai-input.source-workflow.list`, `ai-input.source-workflow.detail`, `ai-input.source-connection.review`, `ai-input.source-asset.review`, `ai-input.workflow-run.review`, `ai-input.work-item.review`, `ai-input.naming-profile.review`, `ai-input.data-unit-proposal.review`, `ai-input.module-write-intent.review`, `ai-input.connector-consent.review`, `ai-input.proof-target.review`, and `ai-input.audit-lineage.review`.
- Every future runtime operation must call `requireUser()`, derive `ownerProfileId` from the authenticated profile, reject cross-owner refs, return UI-safe DTOs, and preserve audit/proof/source refs without exposing raw Prisma rows, database URLs, provider payloads, tokens, cookies, raw auth claims, profile IDs, row IDs, private source bodies, or target module final payloads.
- `DataUnitProposal` and `ModuleWriteIntent` actions remain proposal-only until target module authorization, proof refs, rollback refs, and owner/human approval pass.
- Connector runtime still remains blocked by `DATTR-024E-CONTRACT`; persisted audit storage still remains gated by `AUDIT-OPS-004`.
- This contract is not a runtime persistence slice: no route handler, server action, Prisma schema edit, migration, seed, DB read/write, connector runtime, provider data read, public output, module final write, external collaboration, external agent database access, or external registration is added.
- NANDA posture remains internal/proposal-only and protected-owner visible; `externalRegisterable: false`.

## DATTR-024I-PROOF-RUNNER Boundary

`DATTR-024I-PROOF-RUNNER` defines the dry-run-first proof runner gate before any Source Workflow proof write can be attempted:

- Runner artifact: `scripts/ai-input-source-workflow-proof-runner.mjs`, exposed as `pnpm ai-input:proof`.
- Checker artifact: `scripts/check-ai-input-source-workflow-proof-runner.mjs`, exposed as `pnpm ai-input:proof-runner:check`.
- Target input: `AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL`; the runner never prints database URLs, hosts, credentials, profile IDs, row IDs, provider payloads, source bodies, private source material, or target module final payloads.
- Write gate inputs: `--run`, `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1`, `PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA`, and `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1` only for approved disposable remote targets.
- Required target objects include `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- Current loop 112 behavior remains no-write: `pnpm ai-input:proof` can emit a dry-run packet and `--run` can check the write gate, but it still reports `writesExecuted=false`, `doesNotConnectToDatabase=true`, `doesNotApplyMigration=true`, and `doesNotWriteDatabase=true`.
- The next runtime slice is `DATTR-024J-SERVICE-AUTHZ-RUNTIME`, which must implement `requireUser()`, owner scope, service authorization, and UI-safe mappers before any Source Workflow read/write runtime.
- NANDA posture remains protected-owner/internal proof tooling only; external agent database access and external registration remain blocked with `externalRegisterable=false`.

## DATTR-024J-SERVICE-AUTHZ-RUNTIME Boundary

`DATTR-024J-SERVICE-AUTHZ-RUNTIME` converts the prior service authorization contract into a callable server-only service boundary without starting Source Workflow persistence:

- Runtime artifact: `src/lib/services/ai-input-source-workflow.service.ts`.
- DTO/type artifact: `src/types/ai-input-source-workflow.ts`.
- Checker artifact: `scripts/check-ai-input-source-workflow-service-runtime.mjs`, exposed as `pnpm ai-input:service-runtime:check`.
- The service calls `requireUser()` before returning the runtime contract, marks `ownerProfileIdRedacted: true`, `emailRedacted: true`, and `roleRedacted: true`, and keeps the response visible only as a protected authenticated owner-scope DTO.
- Current runtime mode is `service_authz_runtime_no_db_read` with `runtimeDbReadEnabled=false`, `runtimeDbWriteEnabled=false`, `migrationApplyAllowed=false`, `connectorRuntimeAllowed=false`, `publicOutputAllowed=false`, `moduleFinalWriteAllowed=false`, `externalAgentDatabaseAccessAllowed=false`, and `externalRegisterable=false`.
- The service maps the `DATTR-024F-CONTRACT` operation catalog into UI-safe runtime operation states instead of duplicating operation definitions.
- Required objects remain `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- `DataUnitProposal` and `ModuleWriteIntent` stay proposal-only; `OperatingAuditEvent` stays pending persisted audit storage.
- This slice does not add route handlers, server actions, Prisma imports, DB client imports, env reads, provider calls, connector runtime, public output, module final writes, external collaboration, external agent database access, or external registration.
- The next executable persistence gate after `DATTR-024J-SERVICE-AUTHZ-RUNTIME` was `DATTR-024K-RLS-AUDIT-STORAGE`; it is now complete as a review-only gate, so runtime cutover remains blocked until identity strategy, RLS policy apply, audit storage runtime, proof target, migration apply approval, and connector runtime approval exist.
- NANDA posture remains protected-owner/internal service capability only; `externalRegisterable=false`.

## DATTR-024K-RLS-AUDIT-STORAGE Boundary

`DATTR-024K-RLS-AUDIT-STORAGE` converts Source Workflow RLS and audit storage prerequisites into a machine-checkable review gate without applying policies or enabling DB read/write runtime:

- Formal auth artifact: `docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md`.
- Runtime-neutral contract artifact: `src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts`.
- Checker artifact: `scripts/check-ai-input-source-workflow-rls-audit-storage.mjs`, exposed as `pnpm ai-input:rls-audit-storage:check`.
- The gate keeps `identityStrategySelected=false`, `rlsPolicyApplyAllowed=false`, `auditStorageRuntimeAllowed=false`, `databaseReadAllowed=false`, `databaseWriteAllowed=false`, `connectorRuntimeAllowed=false`, and `externalRegisterable=false`.
- The selected pattern is default-deny RLS until owner identity is proven; future write policies must include `WITH CHECK`, cross-owner deny proof, and service-layer authorization pairing.
- Source Workflow rows may store only `secret_ref` / `provider_account_ref`; OAuth tokens, service keys, provider payload secrets, and database URLs remain outside runtime DTOs and Source Workflow tables.
- External agents still have no database access. The next implementation blocker after the required loop-115 launch-level review is `DATTR-024L-CONNECTOR-RUNTIME`, which must prepare connector runtime approval without activating OAuth, webhooks, polling, provider runtime, public output, or external registration.

## DATTR-024L-CONNECTOR-RUNTIME Approval Boundary

`DATTR-024L-CONNECTOR-RUNTIME` converts the earlier connector boundary into an approval package for future runtime activation without adding runtime activation:

- Formal auth artifact: `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md`.
- Runtime-neutral contract artifact: `src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts`.
- Checker artifact: `scripts/check-ai-input-source-workflow-connector-runtime-approval.mjs`, exposed as `pnpm ai-input:connector-runtime:check`.
- The checker reports `ready_for_connector_runtime_approval_review` in `connector_runtime_approval_only_no_activation` mode.
- The gate keeps `runtimeApprovalSelected=false`, `connectorRuntimeAllowed=false`, `oauthRuntimeAllowed=false`, `webhookRuntimeAllowed=false`, `pollingRuntimeAllowed=false`, `providerApiRuntimeAllowed=false`, `secretWriteAllowed=false`, `databaseReadAllowed=false`, `databaseWriteAllowed=false`, and `externalRegisterable=false`.
- Provider families include manual, local file, URL, RSS, Google Drive, Google Docs, Gmail, LINE, Telegram, and GitHub Markdown.
- Approval gates cover provider inventory/data classification, OAuth consent scope and PKCE, secret storage/Vault or backend env review, webhook raw-body signature verification, replay/idempotency, polling rate-limit/cursor/backoff, adapter redaction, Source Workflow mapping, service authz/RLS/audit dependencies, dry-run-first proof target, owner/human approval/rollback, and external-agent/NANDA boundary.
- Future runtime must preserve `SourceConnection`, `SourceAsset`, `OperatingAuditEvent`, `providerEventRef`, `proofRef`, `requireUser()`, service-layer authorization, selected RLS identity strategy, and no-secret DTO/proof behavior before provider events can create side effects.
- This slice does not add route handlers, OAuth callbacks, webhook endpoints, polling jobs, provider API calls, file ingestion, OCR/transcription, raw adapter payload handling, secret writes, schema/migration apply, DB reads/writes, public output, module final writes, external agent database access, or external registration.
- The next anti-repeat implementation slice is `AIINPUT-OPS-003`, which should make H/I/J/K/L gate state visible in protected AI Input/admin/settings if `AUTH-005` and `WORK-009` proof prerequisites remain absent.
- NANDA posture remains protected-owner/internal approval capability only; `externalRegisterable=false`.

## Formal-Mode Rule

Formal mode must show one of:

- real DB-backed source workflow data after schema/auth/proof approval;
- explicit real empty state;
- explicit unavailable state with next action and blocker.

Formal mode must not show hidden mock connector rows, hidden mock workflow rows, fake source items, fake provider state, fake proposal records, or fake persisted writes.

## NANDA / Agent Protocol Gate

This task touches AI Input and agent-mediated source workflow proposals.

- Affected AgentFacts-lite fields: identity, lifecycle, capabilities, skills, auth, trust, observability, registry status.
- Current posture: protected owner-visible contract and internal proposal capability only.
- External registration: `externalRegisterable: false`.
- External agents: no direct data-store access; only scoped context packages and proposal outputs after approval.
- Concrete artifact: `src/lib/contracts/ai-input-source-workflow-split.contract.ts` plus `pnpm ai-input:split:check`.
- `DATTR-024B` concrete artifact: `docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md`, `src/lib/contracts/ai-input-source-workflow-schema-review.contract.ts`, and `pnpm ai-input:schema-review:check`.
- `DATTR-024C` concrete artifact: `docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md`, `src/lib/contracts/ai-input-source-workflow-proof-target.contract.ts`, and `pnpm ai-input:proof-target:check`.
- `DATTR-024D-CONTRACT` concrete artifact: `src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts`, `scripts/check-ai-input-source-workflow-proposal-action.mjs`, and `pnpm ai-input:proposal-action:check`.
- `DATTR-024E-CONTRACT` concrete artifact: `src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts`, `scripts/check-ai-input-source-workflow-connector-boundary.mjs`, and `pnpm ai-input:connector-boundary:check`.
- `AIINPUT-OPS-002` concrete artifact: `AIInputSourceControlMatrixContract`, `scripts/check-ai-input-source-control-matrix.mjs`, and `pnpm ai-input:source-control:check`.
- `DATTR-024F-CONTRACT` concrete artifact: `src/lib/contracts/ai-input-source-workflow-service-authz.contract.ts`, `scripts/check-ai-input-source-workflow-service-authz.mjs`, and `pnpm ai-input:service-authz:check`.
- `DATTR-024H-MIGRATION-DRAFT` concrete artifact: `docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md`, `prisma/schema.prisma`, `prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql`, `scripts/check-ai-input-source-workflow-migration-draft.mjs`, and `pnpm ai-input:migration-draft:check`.
- `DATTR-024I-PROOF-RUNNER` concrete artifact: `scripts/ai-input-source-workflow-proof-runner.mjs`, `scripts/check-ai-input-source-workflow-proof-runner.mjs`, `pnpm ai-input:proof`, and `pnpm ai-input:proof-runner:check`.
- `DATTR-024J-SERVICE-AUTHZ-RUNTIME` concrete artifact: `src/lib/services/ai-input-source-workflow.service.ts`, `src/types/ai-input-source-workflow.ts`, `scripts/check-ai-input-source-workflow-service-runtime.mjs`, and `pnpm ai-input:service-runtime:check`.
- `DATTR-024K-RLS-AUDIT-STORAGE` concrete artifact: `docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md`, `src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts`, `scripts/check-ai-input-source-workflow-rls-audit-storage.mjs`, and `pnpm ai-input:rls-audit-storage:check`.
- `DATTR-024L-CONNECTOR-RUNTIME` concrete artifact: `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md`, `src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts`, `scripts/check-ai-input-source-workflow-connector-runtime-approval.mjs`, and `pnpm ai-input:connector-runtime:check`.

## Rejected Alternatives

- Implementing full `DATTR-024` in one migration/action pass: rejected because schema, RLS, audit, connector consent, and high-risk proposal boundaries need separate review.
- Using route handlers for the first slice: rejected because first maturity step is protected owner formal read state, not provider webhooks or external HTTP events.
- Treating mock AI Input rows as formal fallback: rejected because it hides the real persistence blocker and weakens launch proof.
- Allowing final module writes from AI Input proposals: rejected until owner review, audit references, and module-specific authorization are implemented.
- Implementing proposal server actions in loop 66: rejected because proof target writes, service authorization tests, persisted audit rows, and high-risk module approval gates are not ready.
- Implementing connector runtime in loop 67: rejected because OAuth/webhook/polling/provider event runtime still requires route handler design, authz, audit storage, replay memory, proof target approval, secret storage, and human approval.
- Activating connector runtime in loop 116: rejected because `DATTR-024L-CONNECTOR-RUNTIME` is an approval package only and still keeps runtime activation, secret writes, DB reads/writes, public output, external agent DB access, and external registration disabled.
- Treating the mock `DATTR-012` matrix as formal readiness: rejected because formal mode needs a server-only contract with explicit source permission, risk, next action, and no-runtime boundaries.

## Verification

```bash
pnpm ai-input:proof-target:check
pnpm ai-input:proposal-action:check
pnpm ai-input:connector-boundary:check
pnpm ai-input:source-control:check
pnpm ai-input:service-authz:check
pnpm ai-input:schema-review:check
pnpm ai-input:split:check
pnpm ai-input:proof
pnpm ai-input:proof-runner:check
pnpm ai-input:service-runtime:check
pnpm ai-input:rls-audit-storage:check
pnpm audit:ops:check
pnpm db:validate
pnpm exec tsc --noEmit --pretty false
git diff --check
```

## Stop Conditions

Stop before:

- Prisma schema migration or seed changes;
- DB read/write runtime;
- connector OAuth, webhook, polling, provider API calls, file ingestion, OCR, or transcription runtime;
- public output expansion;
- final Work, Research, Life, Finance, Chamber, Company, or Client Portal writes;
- external agent collaboration or external registration.
