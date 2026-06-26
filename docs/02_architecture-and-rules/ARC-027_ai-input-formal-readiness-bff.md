# AI Input Formal Readiness BFF Contract

**Document ID:** `ARC-027`
**Last updated:** 2026-06-21
**Status:** Active read-only contract

## Purpose

`DATTR-025` defines the server-only readiness contract for AI Input formal mode. `DATTR-024A` extends it with a protected Source Workflow read DTO before full persistence.

The goal is to make `/ai-input` honest when mock data is disabled: the page should keep the AI cowork entry usable, show why formal source/workflow data is unavailable, and avoid silently falling back to mock SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, or ModuleWriteIntent rows.

## Contract

```txt
Protected dashboard route
  -> server layout auth check
  -> Server Component page
  -> connection()
  -> server-only AI Input readiness service
  -> Supabase public config presence check
  -> UI-safe AIInputFormalReadinessContract DTO
  -> Client Component formal-mode panels
```

Runtime files:

- `src/app/(dashboard)/ai-input/page.tsx`
- `src/app/(dashboard)/ai-input/ai-input-client.tsx`
- `src/lib/services/ai-input-readiness.service.ts`
- `src/types/ai-input-readiness.ts`

## DTO Rules

`AIInputFormalReadinessContract` may expose:

- Contract id, status, generated timestamp, and formal BFF mode label.
- Supabase public config presence as `configured` or `missing`.
- `not_persisted` state for SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, and ModuleWriteIntent counts.
- Readiness rows explaining safe exposure, current status, and next gates.
- Prohibited runtime behavior list.
- A nested `sourceWorkflow` read contract with six formal empty/unavailable models, `hiddenMockFallback: false`, BFF boundary text, audit family `ai-input.source-workflow`, and next runnable slice `DATTR-024B`.

`AIInputFormalReadinessContract` must not expose:

- Supabase URLs or keys.
- Database URLs, database hostnames, cookies, tokens, raw claims, provider payloads, OAuth scopes, external account ids, provider object ids, or file URLs.
- Raw source payloads, evidence excerpts, normalized content, external message bodies, document contents, attachment metadata, or generated report bodies.
- Prisma models, raw adapter payloads, or mutation endpoints.

## Current Decision

`src/lib/services/ai-input-readiness.service.ts` is explicitly server-only and exports `buildAIInputFormalReadinessContract()`.

`/ai-input/page.tsx` is now a Server Component that calls `connection()`, builds the readiness DTO, and passes it to `ai-input-client.tsx` as serializable props.

`ai-input-client.tsx` keeps the interactive AI cowork UI, local mock/formal toggle, and mock-only workbench behavior. When mock data is disabled, it renders the readiness contract plus the `DATTR-024A` Source Workflow formal read model in `同步設定` and `AI 工作台` instead of displaying mock connector or workflow rows.

The contract is not persisted. It is a read model over the current formal-mode boundary.

## Research Basis

Local references reviewed:

- Next.js 16 Server and Client Components docs: pages are Server Components by default; Client Components are for state, events, and browser APIs.
- Next.js 16 data fetching docs: Server Components can perform server-side reads without sending credentials/query logic to the client.
- Next.js 16 `connection()` docs: use `connection()` when runtime rendering should wait for an incoming request.
- Next.js 16 `use client` docs: Client Component props must be serializable.
- `ARC-008_ai-source-workflow-layer.md`: AIWorkflowRun proposes and explains but must not write module SSOT records directly.
- `ARC-015_source-connection-adapter-contract.md`: Client Components must not call providers directly or receive provider secrets/tokens.
- `AUT-001_source-intake-security-privacy.md`: source intake needs consent, retention, encryption, and no shadow capture before runtime connectors.
- `DBS-002_source-workflow-schema-contract.md`: DATTR-024 persistence needs reviewed staged migrations and reachable DB proof.
- `ACC-002_module-acceptance-criteria.md`: formal mode must not re-enable mock rows or add schema/migrations/connectors.

Selected pattern: split `/ai-input` into a Server Component shell plus a Client Component interaction surface; pass a narrow UI-safe readiness DTO; add protected empty/unavailable Source Workflow DTO rows before schema work; keep full persistence for later `DATTR-024` slices.

Rejected alternatives:

- Let the Client Component import a server-only service.
- Start Prisma schema changes or migrations while DB connectivity is blocked.
- Reuse mock connector/workflow rows in formal mode.
- Add route handlers or actions that mutate source workflow data before authz and schema review.
- Read external providers, URLs, files, clipboard, media, or webhooks in this slice.

## Acceptance

- `/ai-input/page.tsx` is a Server Component and `ai-input-client.tsx` is the Client Component boundary.
- `src/lib/services/ai-input-readiness.service.ts` is server-only.
- Formal mode renders a UI-safe readiness contract for source connections, source assets, workflow runs, work items, module write intents, Supabase public config presence, and prohibited runtime behavior.
- Formal mode renders the `DATTR-024A` Source Workflow read model for `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `DataUnitProposal`, and `ModuleWriteIntent` as protected empty/unavailable DTO rows.
- Mock mode remains available for demo/prototype work.
- Formal mode continues to hide mock source/workflow rows and keeps AI cowork conversation usable.
- No Prisma schema change, migration apply, Supabase write, connector runtime, URL fetch, webhook, polling, OCR/transcription, provider secret exposure, public output expansion, or module SSOT write is added.

## Follow-Up

- `DATTR-024B`: produce the schema review packet for Source Workflow and audit boundaries before any migration.
- `DATTR-024`: implement real Supabase-backed AI Input source workflow persistence only after schema review, service authorization design, and reachable DB proof.
