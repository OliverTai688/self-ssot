# AI Input Per-Source Conversation Thread and Reference/Library Picker Gap Research

**Document ID:** `RES-006`
**Last updated:** 2026-07-13
**Status:** Research / design — no runtime implementation in this document
**Trigger:** Owner-directed product feedback on the AI Input (`/ai-input`) import and reference-context experience

---

## 1. Purpose

The owner reviewed the current `/ai-input` UI (匯入來源 dropdown, 參考脈絡 tab) and asked for two changes:

1. **Per-source AI-to-AI ingestion conversation.** Each connected source (a specific LINE group, a specific RSS feed, a specific Google Doc, etc.) should have its own independent, persistent AI-to-AI conversation. An ingestion-side agent pulls new updates from that source and "talks to" the system-intelligence side to decide classification/routing/action for each new item. The user can open and read this conversation at any time. Keeping one conversation per source (not one shared conversation) lets each source's handling improve over time instead of averaging across sources.
2. **Reference picker parity with connected sources and libraries.** When the user opens the "選擇匯入來源" picker inside an AI conversation, it should show the sources already connected (which specific LINE group, which specific RSS feed, etc.) so the user can pick one as this-turn context. Images and files should be selectable from an existing image library / file library, or uploaded locally — and a local upload should also land in that library. The AI Input top-tab bar should therefore include a 檔案庫 (file library) and 圖片庫 (image library) tab alongside the existing tabs.

This document audits what already exists in the codebase against both asks, defines the design for the real remaining gap, and converts it into executable backlog rows. Per `AGENTS.md` §7 (Research-To-Task Quality Gate) and §3 (Required Reading), this research was completed before any runtime code was written by this document's author.

**Note on concurrent implementation.** While this research was underway, a separate agent process (`Antigravity`, per `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-191-20260713-source-coworking-threads.md`) shipped `AI-SOURCE-COWORKING-THREADS` directly into `ai-input-client.tsx` — a mock-mode UI implementation covering most of the surface of ask #1 and the remainder of ask #2. This document was rewritten after that landed so it documents the real remaining gap instead of re-proposing already-shipped work. §3 and §4.1 below describe the shipped shape precisely, including where it falls short of the owner's stated intent.

## 2. Source Basis

Local docs and code reviewed:

- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` — `AIWorkflowRun` / `AIWorkflowStep` / `AIWorkItem` model, AI Import Workbench subpage layout (§7), `今日 Workflow` per-source summary rows (§7.1).
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md` — `SourceConnection` entity (§6), source scope (§7), BFF contract (§13), relationship to `AIWorkflowRun` (§16).
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md` — `IngestionAgent` charter ("Govern raw input classification and triage routing... AI Input, Inbox, ingestion context, triage proposals"), module agent workspace direction.
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md` — AgentFacts-lite manifest shape, `externalRegisterable` rule.
- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md`, `ARC-030_module-resource-index-bff-contract.md` — BFF split and resource-index pattern used elsewhere in the module.
- `docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md`, `DBS-002_source-workflow-schema-contract.md`, `SCH-002_source-asset-registry-schema-proposal.md` — real-data progression and asset registry shape.
- `src/app/(dashboard)/ai-input/ai-input-client.tsx` (current, uncommitted local state — 3,088 lines) — full current UI implementation.
- `docs/05_execution-plans/PLN-061_current-sprint.md` (loop 190 entry) and `docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-190-20260713-chat-ingestion-separation.md` — the most recent related change (`AI-CHAT-INGESTION-SEPARATION`), which separated live chat replies from a manual/simulated-24h ingestion pass that folds a whole conversation into one `RawSourceItem` and one triage proposal.
- `docs/05_execution-plans/PLN-060_task-backlog.md` — `AIINPUT-OPS-001..003` naming convention for AI Input readiness-surface tasks, used as the numbering precedent for new task IDs in this doc.

## 3. Current-State Audit

### 3.1 Already implemented (do not duplicate)

The screenshots the owner attached were taken against an earlier build state. Between the owner's request and this research being written, `AI-SOURCE-COWORKING-THREADS` (loop 191, agent `Antigravity`) landed directly in `ai-input-client.tsx`, so the current local file already covers most of the UI surface of both asks:

| Capability | Status in code |
|---|---|
| Six-tab subpage nav: `AI 對話 / 參考脈絡 / 檔案庫 / 圖片庫 / 同步設定 / AI 工作台` | Implemented (`AIInputSubpageNav`, `AIInputSubpage` type includes `"files"` and `"images"`) |
| 參考脈絡 tab lists specific named connected sources (e.g. `LINE 商會核心幹部群`, `LINE Cathy Chen`, `Drive 台灣中小企業資料治理與 AI 導入研究草稿`) as `+`-addable reference chips | Implemented (`SourceContextPanelContent`, `mentionOptions`) |
| `@mention` picker inside the chat textarea, filtered against the same named-source list | Implemented (`filteredMentions`, `selectMention`) |
| 檔案庫 / 圖片庫 subpages: browse existing items, "引用至對話" (reference into conversation) button per item, upload button | Implemented (`libraryFiles`, `libraryImages`, `handleReferenceLibraryItem`, `handleUploadFile`, `handleUploadImage`) |
| Per-source-type coworking conversation: selecting a source in the chat-bar dropdown spawns/reuses a dedicated `ChatThread` (`isSourceThread: true`) with a two-voice canned dialogue (`[◯◯ 採集代理]` ↔ `[系統智能]`) reasoning about classification, plus a "對話與來源處理" sidebar to switch threads | Implemented (`handleSourceSyncAction`, `threadId = "source-" + sourceId`, sidebar list at line ~1289) |
| Bottom-of-chat "選擇匯入來源" dropdown | Implemented, but still scoped to **source-type** triggers (`allActions`: `line / googledoc / link / markdown / image / audio / rss`), not specific connected-source instances — see gap below |

Two real gaps remain: the coworking-thread implementation is keyed and scripted at the wrong granularity for the owner's stated goal (§3.2, §4.1), and the library/reference-picker unification is still partial (§3.2, §4.2).

### 3.2 Confirmed gaps

1. **Threads are keyed by source *type*, not by source *instance*, so they cannot improve per source over time.** `handleSourceSyncAction` builds `threadId = "source-" + sourceId` where `sourceId` is one of the 7 fixed type ids (`line`, `rss`, `googledoc`, `markdown`, `image`, `audio`, `link`). Every LINE source — `商會核心幹部群`, `Cathy Chen`, `nuva藍設計討論`, `Allan Huang` — shares the single `source-line` thread. This is the opposite of the owner's stated rationale ("一種來源就會是一個獨立的對話，這樣才能針對該來源後續資料處理越來越優化" — one *specific source* gets its own conversation so handling for *that source* improves over time). The thread needs to be keyed by `SourceConnection.id` (ARC-015 §6), not by provider type.
2. **Threads reset instead of accumulating.** On re-trigger, `setThreads` replaces the existing thread's `messages` array wholesale (`t.messages = coworkMessages`) rather than appending a new turn. Nothing persists or "gets better over time" yet — every run resets to the same fixed 3-line script.
3. **Dialogue content is a hardcoded canned script per type**, not derived from the actual `RawSourceItem`/`AIWorkItem` content for that run. This is an acceptable interaction-pattern proof but is not yet reasoning that a user could trust to differ meaningfully between two different LINE groups.
4. **Not tied to the `AIWorkflowRun`/`AIWorkflowStep`/`SourceConnection` data model.** `AIWorkflowRun` (ARC-008 §5.1) still has no `sourceConnectionId` field, so even the future real-data version cannot query "the full history for 商會核心幹部群" as one continuous thread without a schema addition.
5. **NANDA gate was flagged but not closed.** Loop 191's own evidence report states `NANDA Applies?: Yes` and lists affected capabilities (LINE Agent, RSS Agent, Google Doc Agent, etc.), but records `AgentFacts-lite fields changed: N/A (Mocked capabilities)` — i.e. no manifest artifact was produced. `AGENTS.md` §3 requires "at least one concrete artifact" whenever the NANDA gate applies; this is an open item, not a completed one (§6, §8 below).
6. **Library tabs are UI-only mock state.** `libraryFiles` / `libraryImages` are `React.useState` arrays seeded with fixture rows; `handleUploadFile` / `handleUploadImage` pick a random name from a hardcoded list and push a toast — there is no `<input type="file">`, no real upload, and nothing is written to the `SourceAsset` registry (`SCH-002`). State is lost on refresh (confirmed in loop 191's own "Remaining Risks").
7. **The chat-bar picker and the named-source list are still disconnected.** "選擇匯入來源" only offers the 7 generic source-*type* actions. It does not read from the same `mentionOptions` / `SourceConnection` list that 參考脈絡 already has, so a user mid-conversation still cannot pick "this specific LINE group" without leaving the compose bar and switching tabs.

## 4. Design

### 4.1 Design A — Upgrade Coworking Threads from Source-Type to Source-Instance

The interaction pattern (dedicated thread, two-voice dialogue, sidebar switcher, inline proposal card) is already proven by `AI-SOURCE-COWORKING-THREADS`. The remaining design work is narrower than originally scoped: re-key that pattern from the 7 provider *types* to specific `SourceConnection` *instances*, and make history accumulate instead of reset.

**Model.** Do not introduce a new Prisma table yet. Reuse the existing `AIWorkflowRun` / `AIWorkflowStep` records (ARC-008 §5) as the eventual source of truth, and add:

- `AIWorkflowRun.sourceConnectionId?: string` — links a run to the `SourceConnection` (ARC-015 §6) that triggered it. Already fits the run's existing optional-linkage style (`sourceAssetIds`, `dataUnitIds`, etc.).
- `AIWorkflowStep.role?: "ingestion_agent" | "system_intelligence" | "user"` and `AIWorkflowStep.message?: string` — lets a step double as one turn of a rendered dialogue instead of only an opaque audit-trail row.

A **source conversation thread** is then a derived read model: all `AIWorkflowRun` rows for a given `sourceConnectionId`, ordered by `startedAt`, with their `AIWorkflowStep` children rendered as chat turns. This avoids a schema migration before `DATTR-024` cutover (this repo's established caution — see `DBS-002`, `SCH-003`, `MIG-003`) while still giving every source its own continuous, inspectable history.

**Mock-mode interim step (no schema needed yet).** Before real persistence exists, `ai-input-client.tsx` can get most of the way there by changing `threadId` in `handleSourceSyncAction` from `"source-" + sourceId` (type) to `"source-" + specificConnectionId` (instance — e.g. the specific LINE group's id from `MOCK_SOURCE_CONNECTORS` / `mentionOptions`), and by appending new turns to `thread.messages` instead of replacing them. This alone would make the existing mock feature match the owner's stated intent without waiting on backend work.

**Agent roles.** Keep reusing `IngestionAgent` (ARC-020) — the loop-191 implementation already renders two voices per thread (`[◯◯ 採集代理]` and `[系統智能]`), which maps cleanly onto `IngestionAgent`'s existing charter without inventing a new named agent:

- *Ingestion side* — reasoning about the specific source's raw content (format, quality, what changed since last sync).
- *System-intelligence side* — the routing/classification decision layer described in ARC-008 §8 ("Review and anomaly rules"), i.e. the module-routing and confidence-threshold logic that already decides when to create an `AIWorkItem`.

Both voices stay inside `IngestionAgent`'s existing boundary: propose, explain, request review — never a direct Finance/Client Portal/public write (ARC-020, ARC-019).

**UI.** The 今日 Workflow (AI 工作台) rows and the 同步設定 connector matrix (ARC-008 §7.0) should link into the *same* per-instance thread the chat-bar dropdown opens, so there is one canonical conversation per source reachable from three entry points, not three separate views of the same data.

**Explicitly not in scope for this design:** provider runtime (OAuth/webhook/polling), autonomous final writes, and any change to `AIWorkItem`'s existing review/accept/reject lifecycle. Those remain governed by `DATTR-024`/`AUT-007` and are unaffected.

### 4.2 Design B — Reference Picker and Library Real-Data Upgrade

1. **Unify the chat-bar picker with the named-source list.** Add a "常用來源" (frequently used) section at the top of the "選擇匯入來源" dropdown, fed by the same `mentionOptions` list that already powers 參考脈絡 and the `@mention` picker. Keep the existing 7 generic-type actions, but relabel the dropdown's two sections explicitly: "選擇既有來源" (pick an existing connected source — the new section) vs. "新增來源" (add a new source — the existing generic-type actions). This directly answers ask #2 without touching the already-working library tabs.
2. **Real local upload + persistence for 檔案庫/圖片庫.** Replace `handleUploadFile`/`handleUploadImage`'s fixture-name generator with a real `<input type="file">` flow. On confirm, the file should be written as a `SourceAsset` row (`SCH-002`) with `origin: "manual_upload"`, and the same action should add it as a reference mention for the current conversation turn — this is exactly the "upload also adds to the library and to this turn's context" behavior the owner asked for; the UI already assumes this behavior; only the persistence path is mock. Gate real writes behind `requireUser()` service authorization and the module's existing real-data progression steps (`DBS-005`), consistent with how every other AI Input real-data slice in this repo has been sequenced (`DATTR-024*` series).

## 5. BFF/Data Contract Implications

Following the BFF-first pattern (`AGENTS.md` §6) and the existing `ARC-015` §13 / `ARC-030` / `ARC-031` contracts, the eventual formal-mode surface needs:

| Operation | Purpose |
|---|---|
| `listSourceConversationThreads()` | Row list for 今日 Workflow / 同步設定 drill-down entry points |
| `getSourceConversationThread(sourceConnectionId)` | Full turn-by-turn transcript for one source |
| `appendSourceConversationTurn(...)` | Internal/agent-only append (no user-writable free text into another party's turn) |
| `listFrequentReferenceSources()` | Backs the new "常用來源" quick-pick section in the chat-bar dropdown |
| `uploadLibraryAsset(file, kind)` | Real local upload → `SourceAsset` write, gated by `requireUser()` and `DBS-005` |

All of the above stay proposal-only contracts until `DATTR-024` cutover readiness (`DATTR-024M`) allows real Source Workflow DB reads/writes — no schema migration or runtime DB write is authorized by this document.

## 6. NANDA Agent Protocol Gate (`ARC-028`)

- Affected agent: `IngestionAgent` only. No new named agent is introduced.
- Affected AgentFacts-lite fields: `capabilities` (add a `source-bound-conversation-reasoning` capability, `riskLevel: LOW`, `requiresHumanApproval: false`, `allowedTargetModules: ["ai-input"]`), `lifecycle.status` (stays `governance-only` until the drill-down UI ships against real data).
- Visibility class: internal runtime, protected-owner-visible only (the whole app is auth-gated). `registry.externalRegisterable` stays `false`; `registry.registrationStatus` stays `not-registered`.
- Concrete artifact required before/with implementation: extend `IngestionAgent`'s entry in `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` with the new capability, then re-run `pnpm agent:registry:check`. Tracked as `AIINPUT-CONV-003` below.
- **This closes an already-open gate, not a new one.** Loop 191's own evidence report marked `NANDA Applies?: Yes` and named the affected capabilities (LINE/RSS/Google Doc/Markdown/Image/Audio agents) but recorded `AgentFacts-lite fields changed: N/A (Mocked capabilities)` — no manifest artifact was produced despite the gate applying. `AIINPUT-CONV-003` is the remediation for that already-flagged, not-yet-closed requirement.

## 7. Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| One shared cross-source conversation | Degrades signal and prevents per-source pattern learning — directly contradicts the owner's stated rationale. |
| New `SourceConversationThread` Prisma table now | Schema bloat before `DATTR-024` cutover; the existing `AIWorkflowRun`/`AIWorkflowStep` aggregation is sufficient and matches this repo's create-only/no-premature-migration discipline (`MIG-003`, `SCH-003`). Revisit only if the aggregation query becomes a real performance problem post-cutover. |
| Invent a new named "system intelligence" agent | Unnecessary manifest sprawl against the stable 15-agent roster in `ARC-020`; `IngestionAgent`'s existing charter already covers both reasoning voices. |
| Make library upload a real DB write in this pass | Skips the `requireUser()`/service-authz/`DBS-005` sequencing every other AI Input real-data slice in this repo has followed; would be an unreviewed persistence-boundary jump. |

## 8. Executable Backlog

| Task id | Title | Scope | Files likely affected | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|
| `AIINPUT-CONV-001` | Add `sourceConnectionId` and step `role`/`message` type-proposal fields to `AIWorkflowRun`/`AIWorkflowStep` | Docs-only type-proposal update, no schema change | `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` | ARC-008 §5.1/§5.2 document the new optional fields with design notes; no Prisma schema or migration touched | Docs review, `git diff --check` | Stop if a reviewer wants these fields to live in a new table instead of on the existing run/step records — resolve before touching code. |
| `AIINPUT-CONV-002` | Re-key coworking threads from source-type to source-instance and accumulate history | In `handleSourceSyncAction`, change `threadId` from `"source-" + sourceId` (7 fixed types) to `"source-" + specificConnectionId` (one thread per named `SourceConnection`, e.g. per specific LINE group); append new turns instead of replacing `messages`; link 今日 Workflow rows and 同步設定 connector rows into the same per-instance thread | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Selecting two different LINE groups opens two distinct, independently-growing threads; re-triggering the same source appends a new turn instead of resetting the transcript; still mock-only, no new server action | `pnpm exec tsc --noEmit --pretty false`, manual click-through (verify two distinct named sources of the same provider type produce two threads) | Superseded scope note: the thread/sidebar/dialogue UI shell itself is already done (`AI-SOURCE-COWORKING-THREADS`, loop 191); this task only re-keys and persists it. Keep read-only in this pass; do not let the UI imply autonomous final writes. |
| `AIINPUT-CONV-003` | Extend `IngestionAgent` AgentFacts-lite manifest with `source-bound-conversation-reasoning` capability | NANDA governance artifact | `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` | New capability entry present with `riskLevel: LOW`, `requiresHumanApproval: false`, `allowedTargetModules: ["ai-input"]`; `externalRegisterable` stays `false` | `pnpm agent:registry:check` | None — additive, non-runtime. |
| `AIINPUT-REF-001` | Unify the chat-bar "選擇匯入來源" dropdown with the named `SourceConnection` list | Add a "常用來源" quick-pick section sourced from the existing `mentionOptions`; relabel existing type actions as "新增來源" | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Opening the dropdown mid-conversation shows specific connected sources (e.g. a named LINE group) as one-click reference adds, without leaving the compose bar | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None — pure UI reuse of existing state. |
| `AIINPUT-LIB-001` | Real local upload for 檔案庫/圖片庫, `SourceAsset`-backed | Replace fixture upload handlers with a real `<input type="file">` flow; define (do not yet apply) the `SourceAsset` write path per `SCH-002`/`DBS-005` | `src/app/(dashboard)/ai-input/ai-input-client.tsx`, `src/app/(dashboard)/ai-input/actions.ts`, possibly a new contract doc under `docs/02_architecture-and-rules/` | Local file picker works and shows a real preview/name; persistence path is documented as a contract (proposal-only) if DB write prerequisites are not yet ready, or implemented behind `requireUser()` if they are | `pnpm exec tsc --noEmit --pretty false`, `pnpm db:validate`, manual upload smoke | Follow the same DB-write gating every other AI Input real-data slice in this repo uses (`requireUser()`, `DBS-005` steps); do not add an unreviewed Supabase Storage write. |

## 9. Acceptance Mapping

These tasks target `ACC-002_module-acceptance-criteria.md`'s AI Input section and `PRD-005`'s AI Input value proposition (source-specific handling quality improving over time). No acceptance-criteria text is changed by this document; `AIINPUT-CONV-002`/`AIINPUT-LIB-001` should update `ACC-002` when they ship real behavior, per `AGENTS.md` §14.
