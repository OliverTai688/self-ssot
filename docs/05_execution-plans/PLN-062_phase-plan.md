# Phase Plan

## Phase 0A - Agent Team OS Contract

Define agent governance, approval/risk levels, skill registry, task routing, and future NANDA-like adapter boundaries.

Primary tasks: `AGENT-001`, `AGENT-002`

## Phase 0B - Local Codex Team Bootstrap

Create repo-level AGENTS.md, Codex skills, internal agent docs, boundary policy, and closed-loop task files.

Primary tasks: `DOC-001`, `AGENT-003`

Current status: `DOC-001` and `AGENT-003` are complete. Root `AGENTS.md`, the closed-loop task files, internal agent docs, boundary policy, task routing, skill registry, and seven reusable Codex skills are present and aligned.

## Phase 0 - DB Contract Stabilization

Reconcile Prisma schema, migration strategy, seed flow, enum casing, and app-layer authorization assumptions.

Primary tasks: `DB-001`, `DB-002`, `DB-003`, `DB-004`, `DB-005`, `DB-006`

Current status: `DB-001`, `DB-002`, `DB-003`, `DB-004`, and `DB-006` are complete. `DB-005` remains the legacy Supabase migration strategy review and is required before remote DB reconciliation.

## Phase 1 - Work Module DB-backed CRUD

Make Work the first operational module with persisted project/task/note/deliverable flows.

Primary tasks: `WORK-001`, `WORK-002`, `WORK-003`, `WORK-004`, `WORK-005`, `WORK-006`, `WORK-007`, `UIUX-001`

Current status: `WORK-001`, `WORK-002`, `WORK-003`, `WORK-004`, `WORK-005`, and `WORK-006` are complete. Project creation, task add/toggle, note add/pin, deliverable create/status/visibility, and derived project progress now use canonical DB-backed Work read/write boundaries. `WORK-007` is the next Work verification task.

## Phase 2 - Auth, Permission, and Client Portal

Move from mock admin/localStorage permissions toward explicit app-layer auth and public client visibility boundaries.

Primary tasks: `AUTH-001`, `AUTH-002`, `CLIENT-001`

## Phase 3 - Research Network DB Alignment

Align Research object network UI with canonical Prisma models and source/citation traceability.

Primary task: `RESEARCH-001`

## Phase 4 - Ingestion and Workflow Persistence

Persist raw input, evidence, triage proposals, decisions, workflow rules, and audit trails.

Primary tasks: `INGEST-001`, `INGEST-002`

## Cross-cutting Data Operations Layer

Define the interface/data/governance layer for multi-source input, module input/output, AI conversation data, lineage, write intents, approvals, operation habit analytics, and agent context packages.

Primary tasks: `DATA-001`, `DATA-002`, `DATA-003`, `DATA-004`, `DATA-005`

Sequencing:

- `DATA-001` is the documentation baseline and is already complete.
- `DB-006` has verified the fresh local database bootstrap; new persistence migrations still require reviewed schema impact notes.
- `DATA-002` should convert the documented data operations layer into a reviewed persistence contract before schema changes.
- `DATA-003` may proceed earlier only as a UI-only/mock lineage prototype.
- `DATA-005` should wait until Work action/service boundaries are consolidated through `WORK-001` and at least one Work persistence loop is wired.

## Source Asset / Document Attribute Layer

Define the shared registry and attribute contract for documents, HTML/web pages, images, videos, audio, links, LINE/Telegram messages, CSV/JSON/API responses, calendar/contact/profile inputs, AI conversation exports, actionable source items, snapshots, and extraction evidence.

Primary tasks: `DATTR-001`, `DATTR-002`, `DATTR-003`, `DATTR-004`, `DATTR-005`, `DATTR-006`, `DATTR-007`, `DATTR-008`, `DATTR-009`, `DATTR-010`, `DATTR-011`, `DATTR-012`, `DATTR-013`, `DATTR-014`, `DATTR-015`, `DATTR-016`, `DATTR-017`, `DATTR-018`, `DATTR-019`, `DATTR-020`, `DATTR-021`, `DATTR-022`, `DATTR-023`, `DATTR-024`

Sequencing:

- `DATTR-001` is the documentation baseline and is already complete.
- `DATTR-002` should propose the `SourceAsset`, `AssetAttributeSet`, `SourceActionItem`, `AssetExtraction`, `SourceAssetSnapshot`, and `SourceAssetLink` data contract with migration impact before any Prisma change.
- `DATTR-003` may proceed earlier only as a UI-only/mock source badge and triage prototype.
- `DATTR-004` focuses on Google Doc / Drive / Markdown identity and snapshot metadata.
- `DATTR-005` expands the same contract to image, video, audio, HTML, link, spreadsheet/CSV, JSON/API, and other source types.
- `DATTR-006` connects actionable source items to Work only through `ModuleWriteIntent` and Work service authorization.
- `DATTR-007` defines link-to-static-HTML sync: keep the original `LINK` asset, create a related `WEB_PAGE` asset, and record fetch runs, robots policy, snapshots, and content hashes.
- `DATTR-008` defines LINE / Telegram messaging source adapters: preserve provider event/update IDs, chat/message IDs, signature or dedupe status, attachments, URLs, privacy scope, and source evidence boundaries.
- `DATTR-009` inventories all current and future source/input surfaces and records missing input-side concerns.
- `DATTR-010` defines the shared `SourceConnection` / `InputAdapter` contract before runtime connectors. Status: complete as documentation/type proposal.
- `DATTR-011` defines security, privacy, retention, URL fetch, webhook, clipboard, media, and high-risk routing policies.
- `DATTR-012` prototypes the source control panel as UI-only/mock before real connector persistence.
- `DATTR-013` defines the Composite Data Unit Layer: source pool, naming normalization, DataUnit proposals, composer behavior, asset membership, annotations, and Research usage.
- `DATTR-014` optimizes the Single Source Recognition Layer before naming, grouping, DataUnit proposals, and module workflows.
- `DATTR-015` defines the AI Source Workflow Operating Layer: source environment workflows, organizing runs, correction runs, AI work items, morning brief anomaly reporting, and @mention targets.
- `DATTR-016` prototypes the AI Import page as a UI-only/mock AI Source Workflow Console with conversation plus workflow workbench tabs. Status: complete.
- `DATTR-018` makes the AI Import workbench mobile/tablet usable as a frontend-first UI-only pass. Status: complete.
- `DATTR-019` redesigns the AI Input cowork/source panel so the page preserves an immediate AI cowork entry while separating source context from lower-level source structure. Status: complete.
- `DATTR-020` should extend the @mention picker with mock workflow/source/DataUnit targets before runtime persistence.
- `DATTR-021` clarifies the AI Input IA by separating AI 對話, 參考脈絡, 同步設定, and AI 工作台 into subpage-style views. Status: complete.
- `DATTR-022` reworks 同步設定 into a multi-source external connector and sync status overview, showing connected/setup/planned state, sync health, scope, cadence, last/next sync, module hints, risk, and review conditions. Status: complete.
- `DATTR-023` adds a persistent mock data kill switch and formal-mode readiness gate so `/ai-input` can stop showing or creating mock SourceAsset/workflow data. Status: complete.
- `DATTR-024` should persist AI Input source workflow data to Supabase through reviewed BFF/service boundaries after schema proposal, DATTR-011 security/privacy policy, migration review, and Supabase connectivity are ready.
- `DATTR-017` translates Source Asset, Single Source Recognition, Composite Data Unit, and AI Source Workflow architecture into Prisma schema proposals and migration impact analysis before any production migration. Status: complete as proposal.

## Frontend Operating Surface Layer

Define the next large frontend development phase: every module gets clear attention, operation, Agent workspace, records/audit, and settings/boundary surfaces before more runtime behavior is added.

Primary tasks: `FOPS-001`, `FOPS-002`, `FOPS-003`, `FOPS-004`, `FOPS-005`, `FOPS-006`, `FOPS-007`, `FOPS-008`

Sequencing:

- `FOPS-001` defines the common frontend operating surface, module attention model, Agent workspace, records/audit pattern, and task batch. Status: complete.
- `FOPS-002` should audit current routes against the operating model before UI changes.
- `FOPS-003` should prototype common subpage navigation for overview, agent, records, and settings/boundaries.
- `FOPS-004` should prototype a module Agent workspace shell.
- `FOPS-005` should prototype a module records/audit subpage pattern.
- `FOPS-006` should apply the pattern to Work without breaking DB-backed CRUD.
- `FOPS-007` should apply the pattern to Research with evidence/source/DataUnit/citation boundaries.
- `FOPS-008` should turn placeholder modules into structured operating shells without high-risk final writes.

Design priority:

- clear first-viewport attention
- operational tables/lists/queues/timelines/editors
- module-specific structures
- no nested card-heavy default layouts
- frontend first, then BFF contract, then real persistence

## Phase 5 - AI Service Adapter and Morning Brief

Create AI service boundaries with mock fallback and source metadata preservation.

Primary task: `AI-001`

## Phase 6 - Finance / Chamber / Company MVP

Define and implement small, human-approved MVPs after DB/auth foundations are stable.

Primary tasks: `FINANCE-001`, `CHAMBER-001`, `COMPANY-001`
