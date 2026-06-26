# Supabase Readiness Report

Date: 2026-06-07

## Purpose

This report documents what can safely move toward formal Supabase-backed use after adding the mock data kill switch on `/ai-input`.

The new switch is a readiness gate, not full persistence. It prevents mock source/workflow data from appearing or being created while formal mode is active.

## Current Decision

- Work module data should be backed by PostgreSQL/Supabase through Prisma and service-layer authorization.
- AI Input formal mode should not silently fall back to mock data.
- Mock data can remain available for prototype/demo mode only.
- Formal source/workflow data requires a reviewed BFF + Prisma persistence path before production use.
- DATTR-010 SourceConnection/InputAdapter contract is complete, but it is a proposal contract, not runtime connector implementation.

## Readiness Matrix

| Area | Current data source | Formal-use status | What is safe now | Required next work |
|---|---|---|---|---|
| Work projects | Prisma/PostgreSQL service layer | Mostly ready, pending Supabase connectivity verification | Project create reads/writes DB through canonical actions/services | Unblock `WORK-007` against reachable Supabase or disposable local DB |
| Work tasks | Prisma/PostgreSQL service layer | Mostly ready | Add/toggle persists; progress is derived from real task rows | Full browser refresh verification in `WORK-007` |
| Work notes | Prisma/PostgreSQL service layer | Mostly ready | Add/pin persists; notes remain internal | Full browser refresh verification in `WORK-007` |
| Work deliverables | Prisma/PostgreSQL service layer | Mostly ready | Create/status/visibility persists; client-visible flag exists | Client Portal DB filtering in `CLIENT-001` |
| AI Input conversation | Client-side state / mock ingestion provider | Not production persisted | User can still cowork with AI in formal mode | Define conversation/session persistence contract if needed |
| AI Input source pool | Mock context data | Not production persisted | Formal mode clears mock source pool | `DATTR-024` SourceAsset BFF persistence |
| AI Input quick imports | Mock sync/import actions | Not production ready | Formal mode blocks mock-only writes | `DATTR-011`, migration review, then connector/BFF implementation |
| AI Input workflow workbench | Mock workflow rows | Not production persisted | Formal mode hides mock workflow rows | `DATTR-024` AIWorkflowRun / AIWorkItem persistence |
| Source connections | Mock connector matrix | Not production persisted | Formal mode hides fake connector rows | Persist `SourceConnection` / `SourceWorkflowConfig` after schema approval |
| Composite DataUnit | Architecture + schema proposal | Not production persisted | DATTR-017 proposal is documented | Review migration C, then implementation |
| Research | Mock/localStorage/partial state | Not production ready | Planning and source architecture are documented | `RESEARCH-001` and future DB alignment |
| Workflow rules | Mock/planning state | Not production ready | Architecture exists | `INGEST-002` / AI workflow persistence proposal |
| Client Portal | Mock-backed public page | Not production ready | Do not expose new data through it yet | `CLIENT-001` DB-backed token query and visibility filtering |
| Auth / permissions | Mock admin and localStorage permissions | Not production ready | Existing `requireUser()` boundary remains in place | `AUTH-001`, `AUTH-002` |
| Life | Mock/localStorage | Not production ready | Keep private; no formal writes | Future Life MVP + privacy policy |
| Finance | Planning/mock | Not production ready | Keep draft-only, human-approved | `FINANCE-001` |
| Chamber / Company | Planning/mock | Not production ready | Use as planning context only | `CHAMBER-001`, `COMPANY-001` |

## What The Mock Toggle Does

When mock data is enabled:

- `/ai-input` shows demo source connections, source pools, workflow runs, review items, organizing results, and work logs.
- Quick import buttons can create mock `RawSourceItem`, `NormalizedContent`, `Evidence`, and `AITriageProposal` records in client state.
- The sidebar and AI Input top navigation both show mock/formal mode status.

When formal mode is enabled:

- Mock source pools are cleared.
- Mock connector/workflow rows are hidden.
- Mock quick import actions are blocked.
- The AI cowork entry remains usable.
- Empty states explain that Supabase-backed BFF persistence is required before formal source/workflow data appears.
- The sidebar and AI Input top navigation both allow switching back to mock mode when prototype/demo data is needed.

## Supabase Connectivity Note

`WORK-007` previously attempted safe Supabase verification after user approval. The configured Supabase host failed DNS resolution from this environment, so no migration deploy, seed, or browser write verification was run against Supabase.

Before claiming full formal readiness:

1. Provide or restore a reachable Supabase database URL.
2. Run migration status safely.
3. Apply reviewed migrations only after confirmation.
4. Verify Work read/write refresh behavior.
5. Implement and verify AI Input source workflow persistence through BFF/service boundaries.

## Recommended Next Tasks

1. `DATTR-011` — Define source intake security, privacy, and retention policy.
2. Review DATTR-017 migration A-D before changing Prisma schema.
3. `DATTR-024` — Persist AI Input Source Workflow data to Supabase BFF.
4. `WORK-007` — Verify Work persistence and refresh behavior end-to-end once Supabase connectivity is reachable.

## Caution

Turning off mock data is necessary for formal use, but it does not automatically make every module Supabase-backed. It is a guardrail that prevents prototype data from looking like production data.
