# AUT-007 AI Input Source Workflow Connector Runtime Approval

**Document ID:** `AUT-007`  
**Task:** `DATTR-024L-CONNECTOR-RUNTIME`  
**Date:** 2026-06-23  
**Status:** Approval gate ready; no connector runtime activation

## Purpose

`DATTR-024L-CONNECTOR-RUNTIME` converts the earlier connector consent/revoke/provider-event boundary into an executable approval package for future OAuth, webhook, polling, provider API, file ingestion, OCR/transcription, and adapter runtime work.

This is an approval and safety gate, not a runtime implementation.

Current state:

- `runtimeApprovalSelected=false`
- `connectorRuntimeAllowed=false`
- `oauthRuntimeAllowed=false`
- `webhookRuntimeAllowed=false`
- `pollingRuntimeAllowed=false`
- `providerApiRuntimeAllowed=false`
- `secretWriteAllowed=false`
- `databaseReadAllowed=false`
- `databaseWriteAllowed=false`
- `externalRegisterable=false`

## Source Basis

Local sources:

- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md`
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`
- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md`
- `docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md`
- `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md`
- `src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts`
- `src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts`
- `src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts`
- `src/lib/services/ai-input-source-workflow.service.ts`
- `src/lib/contracts/operating-audit-storage-review.contract.ts`
- `scripts/check-ai-input-source-workflow-connector-runtime-approval.mjs`

Primary/official sources:

- OAuth 2.0 Security Best Current Practice: https://www.rfc-editor.org/rfc/rfc9700.html
- OAuth 2.0 PKCE: https://www.rfc-editor.org/rfc/rfc7636
- GitHub webhook signature validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Stripe webhook signature guidance: https://docs.stripe.com/webhooks/signature
- Supabase Vault guide: https://supabase.com/docs/guides/database/vault

## Key Decision

Do not activate connector runtime until provider scope, OAuth flow, webhook verification, polling behavior, secret storage, Source Workflow mapping, RLS/audit storage, proof target, rollback, and explicit human approval are complete.

Approved future connector activation must be provider-by-provider. A broad "turn on connectors" action is rejected because different providers have different scope, consent, webhook, replay, rate-limit, and private-data risks.

Provider families covered by the approval package:

- `manual`
- `local_file`
- `url`
- `rss`
- `google_drive`
- `google_docs`
- `gmail`
- `line`
- `telegram`
- `github_markdown`

## Required Approval Gates

`src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts` is the machine-readable gate. It must cover:

- provider inventory and source data classification;
- OAuth consent scope, exact redirect review, CSRF/state binding, and PKCE;
- secret storage through backend env or reviewed Vault-style references;
- webhook raw-body signature verification before trust or parsing;
- webhook replay, timestamp, delivery id, and idempotency proof;
- polling rate-limit, cursor, backoff, and dedupe behavior;
- adapter payload redaction and no raw provider payload exposure;
- mapping into `SourceConnection`, `SourceAsset`, source refs, and `OperatingAuditEvent`;
- dependency on `requireUser()`, service-layer authorization, selected RLS identity, and audit storage;
- dry-run-first proof target and no-secret proof packets;
- owner/human approval, rollback, pause, revoke, and kill switch;
- NANDA/external-agent boundary with `externalRegisterable=false`.

## Runtime Stop Boundary

This task does not create:

- route handlers;
- OAuth callbacks;
- webhook endpoints;
- polling jobs;
- provider API calls;
- secret writes;
- DB reads or writes;
- migration apply;
- file ingestion, OCR, transcription, or raw adapter payload handling;
- public output;
- final module writes;
- direct external-agent DB access;
- external agent registration.

## NANDA / Agent Boundary

This task touches AI Input, future connector agents, and agent-mediated source workflow proposals.

- Current posture: protected-owner/internal approval package only.
- External agents: no direct database access.
- External registration: `externalRegisterable=false`.
- Future public or cross-organization connector/agent collaboration remains `HUMAN_APPROVAL_REQUIRED`.

## Acceptance

Accepted when:

- `pnpm ai-input:connector-runtime:check` passes.
- `DATTR-024L-CONNECTOR-RUNTIME` is recorded in `ARC-031`, `ACC-002`, backlog, sprint, tasks, completed log, and loop evidence.
- `AIINPUT-OPS-003` is the next anti-repeat implementation slice if `AUTH-005` or `WORK-009` proof prerequisites remain absent.
- No connector runtime, route handler, OAuth callback, webhook endpoint, polling job, provider call, secret write, DB read/write, public output, external agent DB access, or external registration is added.

## Verification

```bash
pnpm ai-input:connector-runtime:check
pnpm ai-input:connector-boundary:check
pnpm ai-input:rls-audit-storage:check
pnpm ai-input:service-runtime:check
pnpm audit:storage-review:check
pnpm db:validate
pnpm exec tsc --noEmit --pretty false
git diff --check
```

## Stop Conditions

Stop before:

- selecting provider scopes without owner review;
- adding OAuth/webhook/polling/provider runtime;
- writing tokens, signing secrets, provider credentials, or database URLs;
- trusting webhook payloads without raw-body signature and replay proof;
- applying migrations or RLS policies;
- reading or writing Source Workflow DB rows;
- exposing provider data, private source material, public output, final module writes, direct external-agent DB access, or external registration.
