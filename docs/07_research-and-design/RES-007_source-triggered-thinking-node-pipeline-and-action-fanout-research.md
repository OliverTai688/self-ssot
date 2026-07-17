# Source Batch, AI Analysis Conversation, and Inbox Handoff Pipeline Research

**Document ID:** `RES-007`
**Last updated:** 2026-07-14 (revision 3 — targeted consistency fixes on top of revision 2's corrected model)
**Status:** Research / design — no runtime implementation, no Prisma schema/migration, in this document
**Trigger:** Owner-directed correction of this document's core trigger assumption and end-to-end pipeline model (revision 2); revision 3 fixes four internal inconsistencies the owner flagged in revision 2 without changing its core direction

---

## 0. What Changed From Revision 1 (and Revision 2)

Revision 1 of this document designed the primary trigger as "when a source receives new data, automatically start an AI thinking process." The owner rejected that assumption directly: this is not the intended product direction. Revision 2 replaced the trigger model, the end-to-end pipeline, the roles of `/ai-input` and `/inbox`, and the data model — a full rewrite, not an addendum. Where revision 1's code audit findings remained factually accurate (they describe what exists today, not what should be built), they were preserved and re-interpreted under the corrected model.

**Revision 3 does not change revision 2's core direction.** It fixes four internal inconsistencies the owner flagged after reviewing revision 2:

1. §2 and §3 overstated that `scheduled_sync` needs no runtime change under `AUT-007` — a real scheduled external re-fetch is Polling by definition and stays gated; only `scheduled_sync` *configuration* plus a simulated execution is in scope now, and `scheduled_analysis` (which only touches batches already inside this system) is now explicitly distinguished as a separate, non-polling concern.
2. §12.2's `AIAnalysisConversation`/`AIWorkflowRun` design contradicted §16's own backlog (`SRCPIPE-013` already lets the owner select multiple pending batches for one analysis) by only allowing a single `sourceBatchId`. Both are now `sourceBatchIds: string[]`.
3. §7's worked example and §14's governance boundary implied a written note is required every time. The condition is now uniformly "explicit human review has been recorded," which can be a note/correction or an explicit "no note needed" confirmation — matching what §16's `SRCPIPE-040` already specified.
4. §12 was missing a per-source schedule/mode configuration object. §12.7 adds `SourceProcessingPolicy`.

## 1. Purpose

The owner wants sources they connect (a specific LINE group, a specific Google Doc, an RSS feed, uploaded files) to accumulate data, and wants the owner — not an automatic per-item event — to control when that data gets synced and when it gets analyzed. Once analysis runs, it should reason about the source content using thinking nodes the owner configures, through a visible AI-to-AI conversation. The output of that conversation is not a finished action. It is a set of human-readable **Inbox Items** that land in `/inbox`, where the owner reads them, adds notes, corrects the AI's understanding, and only then does the system produce a standardized proposal, a module-routing decision, and a final action for the owner to confirm.

This document defines that corrected end-to-end model, redefines the product roles of `/ai-input` and `/inbox`, defines the data objects the pipeline needs (as type proposals only), and rewrites the executable backlog so it can be implemented in the right order.

## 2. Source Basis

Local docs and code reviewed (same base as revision 1; re-audited against the corrected model):

- `docs/07_research-and-design/RES-006_ai-input-source-conversation-and-reference-library-gap-research.md` — per-source coworking-thread research. Its core finding (threads should be keyed by `SourceConnection` instance, not provider type, and should accumulate) still holds and is reused here; its trigger framing did not address sync/analysis separation and is extended, not contradicted, by this document.
- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` §5.1 (`AIWorkflowRun`, including its `triggerType` enum, which already lists `manual` and `scheduled` alongside `source_event`), §5.2 (`AIWorkflowStep`), §5.3 (`AIWorkItem`), §8 (Review and Anomaly Rules).
- `docs/02_architecture-and-rules/ARC-020_internal-agents.md` line 13 — `IngestionAgent` charter: "Govern raw input classification and triage routing" over "AI Input, Inbox, ingestion context, triage proposals"; may "Create proposal flows, route to module drafts, preserve evidence"; may not "Directly write Finance, Client Portal, or public data".
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md` — `SourceConnection` entity, the identity a sync schedule, analysis schedule, and thinking-node list should all attach to.
- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md` — `webhookRuntimeAllowed=false`, `pollingRuntimeAllowed=false`, `externalRegisterable=false`. `manual_sync` and `manual_analysis` are owner-initiated actions and need no runtime change to build. `scheduled_sync`, however, is a real automated re-fetch from an external provider on an interval — that is Polling by `AUT-007`'s own definition, so it stays behind `pollingRuntimeAllowed=false` exactly like `source_event`; this design can only ship the schedule *configuration* UI plus a simulated/mock execution in this phase, not a real automatic external fetch (§3). `scheduled_analysis`, by contrast, only re-runs AI analysis over `SourceBatch` records that already exist inside this system — an internal scheduler question, not a call to an external provider — so it is not blocked by `AUT-007` and can be evaluated as its own, separately-scoped runtime task (§16 `SRCPIPE-054`). Real webhook-driven `source_event` triggering remains reserved for the future and remains `AUT-007`'s gate, not this document's.
- `docs/05_execution-plans/PLN-025_source-action-item-to-write-intent.md` (`D-PLAN-016`) — `SourceActionItem → ModuleWriteIntent → Work` design. Confirmed via code search: **`SourceActionItem` does not exist in `src/`.** This remains the design target for this document's `ActionIntent` → Work-module write path; this document does not replace `PLN-025`, it feeds it.
- `src/types/ingestion.ts` — `RawSourceItem` (:367), `AITriageType` (:444), `AITriageProposal` (:454), `AIWorkflowRun`/`AIWorkflowStep`/`AIWorkItem` (:1003–1100+), `AIWorkflowStepType` (:1026, an 11-value closed enum), `AIWorkItemType` (:1061, a 9-value closed enum). **Code-confirmed**: none of `SourceBatch`, `AIAnalysisConversation`, `InboxItem`, `NormalizedRecordProposal`, or `ActionIntent` exist as types anywhere in this file or elsewhere in `src/`. Every data object in §6 below is a **design proposal**, not a description of existing code.
- `src/lib/context/ingestion-context.tsx` (1311 lines) — the entire runtime behind `/inbox` today: `detectAIType`/`PLACEMENT_MAP`/`REASONING_MAP` (:37–108, keyword classifier), `mockSyncLINE`/`mockImportGoogleDoc`/`mockUploadMarkdown`/`mockUploadMedia` (single combined sync-and-analyze button handlers — **code-confirmed**: sync and analysis are not currently separate actions), `runMockAnalysis` (:1099–1150), `resolveProposal` (:1154–1190).
- `src/lib/ai/triage.ts` (:5–115) — a second, near-duplicate keyword classifier, not imported by `ingestion-context.tsx` — still an orphaned parallel implementation, unchanged finding from revision 1.
- `src/lib/workflow/ingestion-bridge.ts` (:11–29) — `triageTypeToDispatch`, five module intents, no email/notify intent. **Code-confirmed**, unchanged from revision 1.
- `src/app/(dashboard)/inbox/page.tsx` (342 lines) — the four-tab UI (`raw`/`processing`/`review`/`confirmed`, :25–32). **Code-confirmed**: this page reads `RawSourceItem` directly (via `ingestion-context.tsx`), not an already-AI-processed handoff object — this is the specific gap §4.2 corrects.
- `src/app/(dashboard)/ai-input/ai-input-client.tsx` — the coworking-thread implementation RES-006 audited; still a single fixed canned script per provider type, still no sync/analysis separation, still no node concept. **Code-confirmed**, unchanged from revision 1.
- Grep across `src/` for `思考節點`, `ThinkingNode`, `SourceBatch`, `InboxItem`, `ActionIntent`, `NormalizedRecordProposal`, schedule-config UI: **zero matches** for all of these except where noted above. None of this document's proposed objects, and no sync/analysis schedule concept, exist in code today.

## 3. Corrected Trigger Model

The primary correction: **no automatic per-item event trigger.** External sources accumulate data continuously; the owner controls when the system reacts to it.

| Trigger type | Meaning | Status |
|---|---|---|
| `manual_sync` | Owner presses a button; the adapter pulls whatever is new since the last sync into a `SourceBatch` | Primary, build first |
| `scheduled_sync` | Owner configures a sync interval per source; the same sync logic runs on a schedule instead of a button press | Primary **configuration** target; real automated external re-fetch is Polling under `AUT-007` (`pollingRuntimeAllowed=false`) and stays gated provider-by-provider — build schedule config + a simulated/mock execution first (§16 Phase 6) |
| `manual_analysis` | Owner presses a button to run AI analysis over one or more pending `SourceBatch` records | Primary, build first |
| `scheduled_analysis` | Owner configures an analysis interval per source, independent of the sync schedule | Primary — analyzes only `SourceBatch` records already inside this system, so it is an internal scheduler concern, not external provider polling; not gated by `AUT-007`, though it still ships as mock/simulated execution first in this backlog (§16 Phase 6), with a real internal-scheduler runtime evaluated separately (§16 `SRCPIPE-054`) |
| `manual_rerun` | Owner re-runs analysis over an existing batch (e.g. after editing thinking nodes, or after an unresolved question was answered) | Primary |
| `source_event` | A provider push (webhook) triggers sync and/or analysis automatically | **Reserved for a possible future phase.** Not part of this design's primary flow. Still gated by `AUT-007` (`webhookRuntimeAllowed=false`), and this document does not request that gate change. |

**`scheduled_sync` and `scheduled_analysis` carry different risk, and must not be conflated.** `scheduled_sync` automates contact with an external provider — that is Polling under `AUT-007`'s own definition and stays blocked until that gate clears, provider by provider. `scheduled_analysis` only re-runs this document's own AI analysis over batches that already exist locally — no external call is involved, so it can be built as a real internal scheduler independently of `AUT-007`. Until `AUT-007` clears, `scheduled_sync` in this document means schedule *configuration* UI plus a simulated/mock execution, never a real automatic external fetch. Each source's sync/analysis mode and schedule are captured by `SourceProcessingPolicy` (§12.7).

Sync and analysis are explicitly two separate actions, not one combined step. The owner should be able to choose any of:

- sync only, analyze later;
- sync and immediately analyze;
- let several sync batches accumulate, then analyze them together;
- re-analyze an existing batch without re-syncing.

This directly corrects `ingestion-context.tsx`'s current design, where `mockSyncLINE` and equivalent handlers both fetch and analyze in one call (§7 backlog Phase 2 splits this).

## 4. Corrected End-to-End Pipeline

```text
外部來源 (LINE / Google Docs / RSS / 上傳檔案)
        ↓  manual_sync 或 scheduled_sync
    SourceBatch
        ↓  manual_analysis 或 scheduled_analysis 或 manual_rerun
    AIAnalysisConversation（AI 與 AI 之間的對話式分析）
        ↓
    InboxItem（一至多個）
        ↓  送入 /inbox
    人類閱讀、備註、修正、補充背景（或退回重新分析）
        ↓
    NormalizedRecordProposal（標準化提案）
        ↓  分類與模組路由
    ActionIntent（行動提案）
        ↓  使用者確認
    正式寫入 Todo／Project／Research／CRM／Calendar 等模組
```

This replaces revision 1's `新資料事件 → 思考節點 → 直接產生分類、Todo 或 Email 草稿` model outright. The two corrections that matter most: (1) nothing runs until the owner triggers sync and, separately, analysis; (2) AI analysis output is never a final action — it always lands as one or more `InboxItem` records for human review first, and standardization/routing/action-proposal only happen *after* that human review, not before it.

## 5. Product Role: `/ai-input` — AI Analysis Studio

`/ai-input` is not a source-sync page and not where final actions are produced. It is:

> The AI analysis studio — source management, batch creation, thinking-node configuration, and AI-to-AI conversational analysis.

Responsibilities:

- Manage connected sources and show each one's sync status (last synced, pending-item count).
- Manual sync per source (buildable now); scheduled-sync **configuration** per source (real automated external re-fetch stays gated by `AUT-007`'s polling boundary — see §3).
- Show how many items are pending analysis.
- Create an analysis batch (group one or more pending syncs).
- Configure each source's thinking-node list (order, instruction, enabled).
- Manual or scheduled analysis start.
- Render the AI-agent-to-AI-agent analysis conversation.
- Preserve evidence citations and the analysis process (the conversation transcript itself is the audit trail).
- Package the completed analysis into one or more `InboxItem` records.
- Hand those `InboxItem` records to `/inbox`.

**Multi-role conversation, not a single canned voice.** The conversation should visibly involve at least two roles, extending the two-voice pattern RES-006 already documented:

- **Source Understanding Agent** — understands the raw source content: extracts people, events, requests, commitments, dates, amounts; explicitly separates fact from inference and flags missing information.
- **Personal OS Reasoning Agent** — judges how the content relates to existing projects, clients, research, or tasks; checks whether a task is actually warranted; surfaces duplicates, contradictions, risks, and missing context; challenges the first agent's read when warranted.
- Additional constrained roles may be added later if a specific module (e.g. Finance, Chamber) needs its own reasoning voice — not designed here; any such addition follows the same `ARC-019` propose-don't-write boundary.

The UI should render this as **structured, product-facing reasoning**, not as a transcript of a model's private chain of thought. Use these concepts explicitly, as the vocabulary for conversation turns:

- Agent observation
- Agent proposal
- Agent critique
- Evidence citation
- Consensus
- Unresolved question
- Final handoff summary

Both roles stay inside `IngestionAgent`'s existing charter (§8) — analysis, evidence-preservation, and proposal generation, never a direct module write. **AI analysis completing does not mean a Todo, an email, or a module write has been created.** It means one or more `InboxItem` records now exist for a human to read.

## 6. Product Role: `/inbox` — Human-AI Handoff and Standardization

`/inbox` does not receive raw source data. Raw source items are analyzed first in `/ai-input`; only the resulting `InboxItem` records — written like a work handoff, a letter, or a task notification — reach `/inbox`. This corrects revision 1's `原始來源 → 標準化 → AI 審閱 → 已確認` framing, which had `/inbox` doing the AI's job.

`/inbox` is:

> The handoff, annotation, correction, standardization, and action-approval surface between AI and the human owner.

The owner should be able to, exactly as with email or a task list:

- read the AI-written summary;
- see the source and the analysis scope (which batch, which date range, how many raw items);
- see the AI's suggested meaning and suggested action;
- see cited evidence;
- add their own notes;
- correct the AI's understanding;
- supply missing context;
- rewrite the title or summary;
- defer, archive, or return the item for re-analysis (with an explicit instruction, preserving the prior version rather than overwriting it);
- decide whether to proceed to standardization;
- review classification/module routing;
- confirm the resulting action.

Suggested status flow (names may be adjusted later, but the seven layers below must stay distinct):

```text
AI 新收件 (AI analysis complete)
→ 人類閱讀／備註 (human read / annotate)
→ 待標準化 (pending standardization)
→ 標準化提案 (normalized proposal)
→ 行動提案 (action proposal)
→ 待確認 (pending confirmation)
→ 已執行／已封存 (executed / archived)
```

The seven layers that must remain distinct, regardless of exact label wording: (1) AI analysis complete, (2) human read and annotate, (3) standardization, (4) classification and routing, (5) action proposal, (6) human confirmation, (7) formal write.

## 7. Separating AI Analysis From Standardization

AI-to-AI conversational analysis exists to **understand and organize** source content — it is not the same thing as producing standardized, module-ready data. Conflating the two was revision 1's other core error (standardization happened immediately, with no room for human review to change the outcome).

**Stage 1 — `InboxItem` (natural-language analysis result, human-readable):**

```text
標題：
宜蘭活動場地確認

來源：
LINE「活動籌備群」

分析範圍：
2026-07-13 至 2026-07-14，共 38 則訊息

AI 摘要：
場地目前暫定容納 30 人，預算上限為 15,000 元。
星期五前需要向場地方確認最終人數。

AI 建議：
可能需要建立一項 Todo。

待確認資訊：
設備確認由誰負責，目前仍不明確。

來源證據：
相關訊息 6 則
```

**Stage 1.5 — explicit human review, recorded in `/inbox` before anything is standardized.** Review does not require a written note every time: the owner can add a note/correction, or explicitly confirm that no note is needed. The example below is the with-notes branch, since it best illustrates why the review step matters:

```text
設備由文齡姐負責。
我只需要確認參與人數，不要為設備建立任務。
```

**Stage 2 — `NormalizedRecordProposal`, produced only after that review is explicitly recorded (`InboxItem.humanReviewStatus` leaves `not_reviewed`, §12.3):**

```text
type: task
title: 確認宜蘭活動參與人數
dueDate: 2026-07-17
project: 宜蘭活動
owner: 戴宇星
priority: medium
sourceBatchIds: [...]
inboxItemId: ...
```

Note that the human note directly changed the outcome — without it, the AI's raw suggestion ("可能需要建立一項 Todo") could have produced a task for equipment confirmation, which the owner explicitly did not want. This is why standardization must be a distinct stage that runs *after* an explicit human-review checkpoint — whether that review adds a note or explicitly confirms none is needed — not a direct output of AI analysis. `InboxItem` (natural-language analysis result) and `NormalizedRecordProposal` (standardized module-ready data) are two different objects at two different pipeline stages, never conflated.

## 8. `SourceThinkingNode` — Drives Analysis, Not Final Actions

`SourceThinkingNode` remains an important part of this design, but its output is not equivalent to a final module action — that was revision 1's error for this object specifically. Thinking nodes drive the AI-to-AI conversation described in §5; they do not write Todos, send emails, or write to modules directly.

Node types (closed, extensible enum — owner configures order + instruction per source, same discipline as revision 1's reasoning for keeping this bounded rather than freeform):

- `source_context`
- `classify_information`
- `extract_entity`
- `extract_commitment`
- `detect_task_candidate`
- `detect_risk`
- `link_existing_context`
- `challenge_interpretation`
- `identify_missing_context`
- `summarize_handoff`
- `draft_inbox_items`

Fields (type proposal, unchanged shape from revision 1): `id`, `order`, `nodeType`, `instruction`, `enabled`. Example owner-authored instruction for a `link_existing_context` node:

```text
如果內容提到 BNI 會員或商會引薦，
檢查是否與既有 CRM 關係人或商會紀錄相關。
```

**Terminal outputs of a thinking-node run are limited to:** `InboxItem` (one or more), `unresolved_question`, or `no_action_needed`. A thinking-node run must never directly terminate in a Todo, an email send, or a module write — those only exist further downstream, produced from the Inbox stage described in §6–§7, after human review.

## 9. Action Intent Fan-Out and the Repositioned Email Draft

Revision 1 treated `owner_digest_draft` (an email draft) as a terminal output of the AI thinking pipeline. That is corrected here: **email drafting is not an AI-analysis-stage action.** It is repositioned as one of several possible `ActionIntent` kinds, generated from the Inbox stage after standardization/routing, alongside Todo creation and other module actions:

- `task.create`
- `project.update`
- `research.note.create`
- `calendar.event.create`
- `contact.update`
- `finance.record.propose`
- `email.draft_create`
- `archive`
- `request_more_context`

Rationale for the repositioning: an `InboxItem` is the actual unit the AI analysis produces; converting it to an email is a choice the owner (or a downstream rule) makes about *how to package* that Inbox Item's content, not something the analysis stage needs to decide on its own. This also means the same `InboxItem` can become a Todo, an email draft, both, or neither, depending on what the owner confirms — it is no longer forced to pick exactly one terminal action at analysis time.

`email.draft_create` stays governed exactly as revision 1 specified: v1 produces a copyable, editable draft only. No send. No SMTP integration, no Gmail API call, no outbound side effect of any kind. Sending, if ever added, is a separate, explicitly-approved follow-on gated the same way `AUT-007` gates connector runtime — not something this document authorizes.

## 10. Relationship Between `/ai-input` and `/inbox`

> `/ai-input` 負責 AI 思考與分析；`/inbox` 負責人機交接、備註、標準化與行動審批。

They are **sequential stages of one pipeline**, not two views of the same interface and not two duplicate pipelines:

```text
/ai-input
來源管理、同步、批次、AI 對話、分析交接
        ↓
/inbox
閱讀、備註、修正、標準化、分類、行動確認
```

They share underlying entities — `SourceConnection`, `SourceBatch`, `AIWorkflowRun`, `AIWorkflowStep`, evidence references, and workflow IDs — but keep distinct product responsibilities and distinct information architecture. Revision 1's `AIINPUT-UNIFY-001` asked "should these two pages be merged?" — that was the wrong question and is retired. The right question, `SRCPIPE-008` below, is: **how do these two pages share one workflow/evidence chain while keeping their different responsibilities and IA?** Unless a future, explicit product decision says otherwise, the two pages stay separate surfaces connected by shared IDs, not merged into one.

## 11. Current-State Audit (Corrected Interpretation)

Revision 1's original code-level findings remain accurate; what changes here is what they mean for the corrected model.

1. **`/ai-input` has no `SourceBatch` concept at all.** There is no notion of "the data pulled by this particular sync," only a live mock chat/thread state. Needed before anything else in this design can be built (§13 Phase 1–2).
2. **Manual sync and AI analysis are currently the same action.** `ingestion-context.tsx`'s `mockSyncLINE` and siblings both fetch and analyze in one call — this must split into two independent actions (§13 Phase 2).
3. **No schedule configuration exists** for sync or analysis, at any granularity (§13 Phase 6) — and neither today's code nor revision 2 of this document distinguished that a scheduled external sync is Polling under `AUT-007`, while a scheduled internal analysis is not (§3).
4. **The AI conversation is a fixed canned script**, not driven by thinking nodes or distinct agent roles — RES-006 already flagged the "fixed script" problem; this document adds that it is also not structured into observation/proposal/critique/consensus turns (§13 Phase 3).
5. **AI conversation output never becomes a formal `InboxItem`.** Today's "Ingestion proposal" card in `/ai-input` is the closest analog, but it is not a distinct, human-annotatable object that gets handed to `/inbox` (§13 Phase 3–4).
6. **`/inbox` reads `RawSourceItem` directly** (`ingestion-context.tsx`), which is exactly backwards from this design's intended handoff boundary — `/inbox` should only ever see post-analysis `InboxItem` records (§13 Phase 4).
7. **`/inbox` has no human-note, correction, return-for-reanalysis, or action-confirmation flow.** Its current four tabs (原始來源/標準化/AI 審閱/已確認) do not include an explicit human-annotation step before standardization (§13 Phase 4–5).
8. **Standardization currently happens immediately** inside `runMockAnalysis`, with no step for an explicit human review to change the outcome first — this is the specific bug the 宜蘭活動 example in §7 illustrates (§13 Phase 5).
9. **Two parallel keyword classifiers still exist** (`ingestion-context.tsx`'s `detectAIType` and the orphaned `src/lib/ai/triage.ts`) — still unconsolidated; whichever classifier logic survives should back `classify_information` node reasoning, not live as a third parallel system (§13 Phase 1, note under `SRCPIPE-006`).
10. **Todo, email drafts, and other module actions should come from the Inbox `ActionIntent` layer, not from AI analysis directly** — today nothing produces them from either layer, but the design target (§9) is explicit that they must sit downstream of human confirmation, never upstream of it.

## 12. Data Model (Type Proposals Only — No Prisma Schema, No Migration)

All objects below are **design proposals**. None exist in `src/types/ingestion.ts` or elsewhere in the codebase today (confirmed by grep, §2). Following this repo's established discipline (`DBS-002`, `SCH-003`, `MIG-003`, and RES-006's identical reasoning), no Prisma table or migration is authorized by this document — these are documented as future type additions, most of them extending the existing `AIWorkflowRun`/`AIWorkflowStep` records rather than inventing wholly new tables.

### 12.1 `SourceBatch`

One manual or scheduled sync's worth of incremental data.

```text
SourceBatch
  id
  sourceConnectionId
  triggerType            // manual_sync | scheduled_sync
  syncStartedAt
  syncCompletedAt
  rangeStart
  rangeEnd
  cursorBefore
  cursorAfter
  rawItemCount
  deduplicatedItemCount
  status
  createdBy
  sourceSnapshotRefs
```

### 12.2 `AIAnalysisConversation`

One AI-to-AI analysis pass over **one or more** `SourceBatch` records — §16's `SRCPIPE-013` already lets the owner select several pending batches for a single analysis run, so this object must not be limited to a single batch. Reuses `AIWorkflowRun`/`AIWorkflowStep` (ARC-008 §5.1–5.2) as its backing records rather than a new table — extend, don't duplicate:

```text
AIAnalysisConversation  (backed by AIWorkflowRun + AIWorkflowStep[])
  id
  sourceBatchIds                     // one or more SourceBatch ids analyzed together in this run
  workflowRunId                     // -> AIWorkflowRun.id
  thinkingNodeConfigurationId
  startedAt
  completedAt
  status
  participants                      // e.g. ["source_understanding_agent", "personal_os_reasoning_agent"]
  conversationTurns                  // -> AIWorkflowStep[] rendered as turns
  evidenceRefs
  consensusSummary
  unresolvedQuestions
  failureReason
```

To support this, extend the existing type proposals:

- `AIWorkflowRun.sourceBatchIds?: string[]` — links a run to the one or more batches it analyzed together. This **supersedes** RES-006 §4.1's proposed singular `AIWorkflowRun.sourceConnectionId` field: under the corrected model, a run analyzes one or more batches, and each batch already carries its own `sourceConnectionId`, so the connection(s) are reachable through the batch array without a second direct FK. (RES-006's `AIINPUT-CONV-001` should be read as amended by this paragraph, not duplicated.) Cross-batch evidence traceability is preserved per turn, not lost by batching: each `AIWorkflowStep`'s `evidenceRefs` records which specific `sourceBatchId`/raw item it draws from, so a multi-batch analysis never loses per-source attribution.
- `AIWorkflowStep.role?: "source_understanding_agent" | "personal_os_reasoning_agent" | "user" | "system"` (extends RES-006's proposed `role` field with the two named analysis roles from §5).
- `AIWorkflowStep.turnKind?: "observation" | "proposal" | "critique" | "evidence_citation" | "consensus" | "unresolved_question" | "handoff_summary"` — new field, gives each step/turn the vocabulary §5 specifies instead of an opaque message string only.

### 12.3 `InboxItem`

The unit of work handed to the human after AI analysis completes.

```text
InboxItem
  id
  analysisConversationId
  sourceBatchIds             // denormalized from AIAnalysisConversation.sourceBatchIds, for direct filtering
  title
  summary
  suggestedMeaning
  suggestedAction
  humanReviewStatus           // not_reviewed | reviewed_with_notes | reviewed_no_notes_needed
  humanNotes                  // optional — present when humanReviewStatus = reviewed_with_notes
  humanCorrections            // optional — present when humanReviewStatus = reviewed_with_notes
  evidenceRefs
  status
  priority
  createdAt
  reviewedAt                  // set once humanReviewStatus leaves not_reviewed, regardless of which value it becomes
```

`humanReviewStatus` is the standardization gate (§7, §14): it does not require a written note every time. `reviewed_no_notes_needed` is an equally valid, explicit way to clear the gate as `reviewed_with_notes` — the only disallowed state for proceeding to standardization is `not_reviewed`.

One `AIAnalysisConversation` can produce **one or more** `InboxItem` records. Example: a single batch of LINE messages might yield a customer-request summary, a candidate to-do, a date needing confirmation, and a separate research note worth preserving — four `InboxItem` rows from one conversation, not one row forced to represent all of it.

### 12.4 `NormalizedRecordProposal`

Produced only after `InboxItem.humanReviewStatus` (§12.3) leaves `not_reviewed` — i.e. after explicit human review has been recorded, with or without notes (§7).

```text
NormalizedRecordProposal
  recordType
  normalizedFields
  targetModule
  confidence
  validationIssues
  sourceEvidence
  humanNoteRefs
```

### 12.5 `ActionIntent`

The action awaiting user confirmation before any real module write.

```text
ActionIntent
  kind    // task.create | project.update | research.note.create |
          // calendar.event.create | contact.update |
          // finance.record.propose | email.draft_create |
          // archive | request_more_context
  ...     // fields specific to `kind`, following PLN-025's existing
          // SourceActionItem -> ModuleWriteIntent shape where `kind`
          // overlaps with a module write (task.create, etc.)
```

### 12.6 Full Relationship Chain

```text
SourceConnection
    ↓
SourceBatch（1..n，可累積後合併分析）
    ↓
AIAnalysisConversation
    ↓
InboxItem（1..n）
    ↓
Explicit Human Review（有備註或明確確認不需要備註）
    ↓
NormalizedRecordProposal
    ↓
ActionIntent
    ↓
Confirmed Module Write
```

### 12.7 `SourceProcessingPolicy`

Per-source configuration for how sync and analysis run — the object `scheduled_sync`/`scheduled_analysis` configuration (§3, §5) and Phase 6's scheduling backlog (§16) write to and read from.

```text
SourceProcessingPolicy
  sourceConnectionId
  syncMode                  // manual_only | manual_and_scheduled
  syncSchedule               // interval/cron-shaped config; meaningless when syncMode = manual_only
  syncEnabled
  analysisMode               // manual_only | manual_and_scheduled
  analysisSchedule            // interval/cron-shaped config, independent of syncSchedule
  analysisEnabled
  analyzeOnlyWhenPending      // skip a scheduled analysis run when no SourceBatch is pending
  timezone
  lastSyncAttemptAt
  lastSyncSuccessAt
  nextScheduledSyncAt
  lastAnalysisAttemptAt
  lastAnalysisSuccessAt
  nextScheduledAnalysisAt
```

`syncSchedule`/`syncEnabled` govern `scheduled_sync`; because a real scheduled *sync* is Polling under `AUT-007` (§3), this policy's sync side is configuration/state only until that gate clears — it does not, by itself, authorize a running scheduler that calls an external provider. `analysisSchedule`/`analysisEnabled` govern `scheduled_analysis`, which only touches batches already inside this system and is therefore eligible for a real internal scheduler runtime as its own, separately-evaluated task (§16 `SRCPIPE-054`), independent of `AUT-007`.

## 13. BFF/Data Contract Implications

Following `AGENTS.md` §6 and the existing `ARC-015` §13 / `ARC-030` / `ARC-031` contract pattern. All operations below are proposal-only until `DATTR-024` cutover readiness (`DATTR-024M`) allows real Source Workflow DB reads/writes, matching every other AI Input real-data slice's sequencing in this repo. This table **replaces** revision 1's operation list (`runSourceThinkingPipeline`, `draftOwnerDigestEmail`, etc.) with the corrected stage boundaries:

```text
getSourceProcessingPolicy(sourceConnectionId)
updateSourceProcessingPolicy(sourceConnectionId, policy)

syncSource(sourceConnectionId, trigger)
scheduleSourceSync(sourceConnectionId, schedule)
createSourceBatch(sourceConnectionId, syncResult)

listSourceThinkingNodes(sourceConnectionId)
updateSourceThinkingNodes(sourceConnectionId, nodes)

runSourceAnalysis(sourceBatchIds, trigger)
appendAgentConversationTurn(analysisConversationId, turn)
completeSourceAnalysis(analysisConversationId)

createInboxItemsFromAnalysis(analysisConversationId)
listInboxItems(filters)
addInboxItemNote(inboxItemId, note)
correctInboxItem(inboxItemId, corrections)
returnInboxItemForReanalysis(inboxItemId, instruction)

generateNormalizationProposal(inboxItemId)
updateNormalizationProposal(inboxItemId, fields)
createActionIntent(inboxItemId, normalizedProposal)

approveActionIntent(actionIntentId)
rejectActionIntent(actionIntentId)
archiveInboxItem(inboxItemId)
```

`appendSourceConversationTurn` from RES-006 §5 is superseded by `appendAgentConversationTurn` above (same purpose, aligned to the `AIAnalysisConversation` object and its `turnKind` vocabulary).

## 14. Agent Protocol / Governance Gate (`ARC-028`)

- Affected agent: `IngestionAgent` only — same agent RES-006 already extends; the two analysis roles in §5 (Source Understanding Agent, Personal OS Reasoning Agent) are modeled as **two voices inside `IngestionAgent`'s existing charter**, not new named agents, for the same reason RES-006 rejected inventing a new agent: unnecessary manifest sprawl against the stable roster in `ARC-020`.
- Affected AgentFacts-lite fields — `capabilities`:
  - `configurable-thinking-node-analysis` — `riskLevel: LOW`, `requiresHumanApproval: false`. Covers everything through `InboxItem` creation: sync, batch creation, node-driven conversation, evidence citation. Nothing at this tier writes to another module or sends anything externally.
  - `inbox-action-intent-proposal` — `riskLevel: MEDIUM`, `requiresHumanApproval: true`. Covers `NormalizedRecordProposal` and `ActionIntent` creation for any `kind` that could become a real module write (`task.create`, `calendar.event.create`, `finance.record.propose`, etc.) or an `email.draft_create`. Human confirmation (`approveActionIntent`) is mandatory before any of these becomes a formal write; this tier is proposal-only by design, matching `IngestionAgent`'s existing "may not directly write Finance, Client Portal, or public data" boundary.
- `lifecycle.status` stays `governance-only` until real data backs the pipeline.
- Visibility class: internal runtime, protected-owner-visible only. `registry.externalRegisterable` stays `false`; `registry.registrationStatus` stays `not-registered`. No outbound email send, no webhook/polling runtime, no external agent access — nothing here changes `AUT-007`'s connector-runtime or external-registration boundary.
- Concrete artifact required before/with implementation: extend `IngestionAgent`'s entry in `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` with both capabilities above (bundle with RES-006's still-open `AIINPUT-CONV-003` manifest remediation, since all three touch the same agent entry), then re-run `pnpm agent:registry:check`. Tracked as `SRCPIPE-007` below.

### Governance and Safety Boundaries (must hold regardless of implementation order)

1. The AI analysis stage never writes directly to another module.
2. AI agents only produce analysis results and `InboxItem` records at that stage — nothing further downstream.
3. Standardization and `ActionIntent` creation happen only after explicit human review has been recorded on the source `InboxItem` (`humanReviewStatus` leaves `not_reviewed`, §12.3) — a written note is not required every time; an explicit "no note needed" confirmation satisfies this gate equally.
4. An `ActionIntent` must be explicitly approved by the owner before it executes as a real module write.
5. No automatic email sending, ever, in this design. `email.draft_create` produces a draft only.
6. No unapproved webhook or polling runtime — `AUT-007` remains the sole gate for that, unchanged by this document.
7. The UI never presents raw private model chain-of-thought; it presents the structured, product-facing vocabulary from §5 (observation/proposal/critique/evidence/consensus/unresolved question/handoff summary).
8. Every conclusion must be traceable back to its `SourceBatch`, cited evidence, and `AIAnalysisConversation`.
9. Returning an `InboxItem` for re-analysis preserves the prior version; it does not overwrite the existing record.
10. Every `SourceBatch` needs deduplication, cursor tracking, and rerun identification so the same underlying data cannot silently produce duplicate `InboxItem`/`ActionIntent` rows across multiple syncs or reruns.

## 15. Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| Automatic per-item event trigger as the primary flow (revision 1's original design) | Explicitly rejected by the owner; replaced with owner-controlled `manual_sync`/`scheduled_sync`/`manual_analysis`/`scheduled_analysis`/`manual_rerun`. `source_event` stays reserved for a possible future phase, still gated by `AUT-007`. |
| Sync and analysis as one inseparable action | Blocks the owner's stated need to sync-without-analyzing, batch multiple syncs before analyzing, or re-analyze without re-syncing; must be two independent actions. |
| Standardization immediately after AI analysis, before any explicit human review | The 宜蘭活動 example (§7) shows this can produce an unwanted task; standardization must wait for an explicit human-review checkpoint (with or without a written note — see `humanReviewStatus`, §12.3). |
| Requiring a written note on every `InboxItem` before standardization | Unnecessarily blocks routine items the owner has nothing to add to; `reviewed_no_notes_needed` is an equally valid, explicit way to clear the review gate as `reviewed_with_notes`. |
| A single `sourceBatchId` per `AIAnalysisConversation`/`AIWorkflowRun` | Contradicts §16's own `SRCPIPE-013`, which lets the owner select multiple pending batches for one analysis pass; both objects use `sourceBatchIds: string[]` instead. |
| Treating `scheduled_sync` as already compatible with `AUT-007`'s current boundary | A real scheduled external re-fetch is Polling by `AUT-007`'s own definition and stays gated; only schedule configuration plus a simulated/mock execution is in scope until that gate clears. |
| Thinking nodes terminating directly in Todo/email/module write | Collapses the human-review boundary; thinking nodes must terminate in `InboxItem`/`unresolved_question`/`no_action_needed` only. |
| Treating email drafting as a terminal AI-analysis-stage action | An `InboxItem` is the real analysis output; converting it to an email is a downstream `ActionIntent` choice, not something the analysis stage must decide unilaterally. |
| Real outbound email send in this design | External side-effect requiring its own provider/secret/auth review, mirroring `AUT-007`'s existing caution; draft-only satisfies the owner's stated need without granting a new external-send capability. |
| Real webhook/polling event triggering in this design | Already decided and blocked by `AUT-007`; unaffected by this document's corrected manual/scheduled model, which does not need webhook runtime to work. |
| Merging `/inbox` and `/ai-input` into one page/pipeline | They are sequential stages with distinct product responsibilities (analysis vs. handoff/approval), not duplicate views of the same thing; share entities and IDs, keep separate IA. |
| Fully freeform LLM-prompt thinking nodes with no closed node-type enum | Unbounded/unreviewable risk surface for a system whose agents otherwise operate under a strict propose-don't-write boundary (`ARC-019`); keep the closed, extensible `nodeType` set from §8. |
| New Prisma tables for any object in §12 right now | Schema addition before `DATTR-024` cutover; follow this repo's established discipline of type-proposal-only additions, extending `AIWorkflowRun`/`AIWorkflowStep` where possible instead of inventing new tables. |

## 16. Executable Backlog

Ordered by product-landing phase. Task IDs use the `SRCPIPE-0NN` prefix and **retire** revision 1's `AIINPUT-NODE-00N`, `AIINPUT-ACTION-00N`, and `AIINPUT-UNIFY-001` rows (see the separate backlog change-mapping table delivered alongside this document). RES-006's `AIINPUT-CONV-00N`, `AIINPUT-REF-001`, and `AIINPUT-LIB-001` rows are unaffected except where explicitly noted (`AIINPUT-CONV-001` is amended by §12.2, not replaced).

### Phase 1 — Docs and Type Proposals

| Task id | Title | Scope | Files likely affected | Dependencies | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `SRCPIPE-001` | Define `SourceBatch` type proposal | Docs-only | `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` | ARC-015 (`SourceConnection`) | ARC-008 documents `SourceBatch` (§12.1 shape) as a type proposal; no schema/migration | Docs review, `git diff --check` | None — additive docs only. |
| `SRCPIPE-002` | Define `AIAnalysisConversation` type proposal, extending `AIWorkflowRun`/`AIWorkflowStep` | Docs-only | `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` | `SRCPIPE-001` | ARC-008 documents `AIWorkflowRun.sourceBatchIds: string[]` (plural — one run may analyze several pending batches), `AIWorkflowStep.role` (extended with the two named roles), and `AIWorkflowStep.turnKind`; explicitly notes this supersedes RES-006's singular `AIWorkflowRun.sourceConnectionId` proposal | Docs review, `git diff --check` | Stop if a reviewer wants a dedicated `AIAnalysisConversation` table instead of extending `AIWorkflowRun`/`Step` — resolve before touching code. |
| `SRCPIPE-009` | Define `SourceProcessingPolicy` type proposal | Docs-only | `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` or `ARC-015` | `SRCPIPE-001` | ARC-008/ARC-015 documents `SourceProcessingPolicy` (§12.7 shape) as a type proposal; explicitly notes `syncSchedule`/`syncEnabled` stay configuration/state only until `AUT-007` clears polling, while `analysisSchedule`/`analysisEnabled` are eligible for a real internal scheduler runtime (`SRCPIPE-054`) | Docs review, `git diff --check` | None — additive docs only. |
| `SRCPIPE-003` | Define `InboxItem` type proposal | Docs-only | `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` or a new `ARC-*` doc | `SRCPIPE-002` | `InboxItem` (§12.3 shape) documented; explicit note that one conversation can produce 1..n items | Docs review, `git diff --check` | None. |
| `SRCPIPE-004` | Define `NormalizedRecordProposal` and `ActionIntent` type proposals | Docs-only | Same doc as `SRCPIPE-003`, cross-linked to `PLN-025` | `SRCPIPE-003`, PLN-025 | Both objects documented (§12.4–§12.5 shape); `ActionIntent.kind` enum matches §9; explicit note that `task.create`/etc. route into `PLN-025`'s existing pipeline once its Prisma models exist | Docs review, `git diff --check` | Do not implement `SourceActionItem`/`ModuleWriteIntent` Prisma models here — remains `PLN-025`'s own unchecked follow-on. |
| `SRCPIPE-005` | Revise `SourceThinkingNode` terminal-output design | Docs-only; supersedes `AIINPUT-NODE-001` | `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` | `SRCPIPE-003` | Node type enum matches §8's 11 values; explicit statement that terminal outputs are limited to `InboxItem`/`unresolved_question`/`no_action_needed` | Docs review, `git diff --check` | None — additive docs only. |
| `SRCPIPE-006` | Consolidate the two parallel keyword classifiers behind `classify_information` | Docs note plus a follow-on code task; do not merge code in this docs-only pass | Note in `ARC-008`; actual merge is a separate future implementation task | Current-state audit §11 point 9 | Doc records the decision that `src/lib/ai/triage.ts`'s logic should be retired or merged into whatever backs the `classify_information` node, not kept as a third system | Docs review | Do not delete `triage.ts` in this pass — that's implementation, not research. |
| `SRCPIPE-007` | Extend `IngestionAgent` AgentFacts-lite manifest with both new capabilities | NANDA governance artifact; supersedes `AIINPUT-NODE-004`; bundle with RES-006's open `AIINPUT-CONV-003` | `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` | §14 | `configurable-thinking-node-analysis` (LOW) and `inbox-action-intent-proposal` (MEDIUM, `requiresHumanApproval: true`) both present; `externalRegisterable` stays `false` | `pnpm agent:registry:check` | Additive, non-runtime. |
| `SRCPIPE-008` | Decision review: shared workflow/evidence backbone between `/ai-input` and `/inbox` | Research/decision follow-on, not an implementation task; supersedes `AIINPUT-UNIFY-001` | New `ARC-*` decision doc or update to `ARC-008` | `SRCPIPE-001`–`SRCPIPE-004` | Decision doc answers *how* the two pages share `SourceConnection`/`SourceBatch`/`AIWorkflowRun` IDs and evidence refs while keeping distinct IA — not whether to merge them (§10 already answers that: they stay separate) | Docs review | Stop for owner/product-decision input if anything beyond shared IDs/evidence is proposed. |

### Phase 2 — Manual Sync and Batch

| Task id | Title | Scope | Files likely affected | Dependencies | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `SRCPIPE-010` | Split "sync" and "analyze" into two separate mock actions | Mock-only UI/state change | `src/app/(dashboard)/ai-input/ai-input-client.tsx`, `src/lib/context/ingestion-context.tsx` | `SRCPIPE-001` | Pressing sync no longer triggers analysis; a distinct "開始分析" action is required to run analysis over pending batches | `pnpm exec tsc --noEmit --pretty false`, manual click-through (sync with no analysis; then analyze separately) | Must not silently keep the old combined behavior as a hidden default. |
| `SRCPIPE-011` | Show pending-item count per source after sync | Mock-only UI | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-010` | Each source row shows how many synced items are awaiting analysis | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |
| `SRCPIPE-012` | Create a mock `SourceBatch` record on each sync | Mock-only state | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-001`, `SRCPIPE-010` | Each sync produces a `SourceBatch`-shaped mock object with a stable id, referenced by later analysis | `pnpm exec tsc --noEmit --pretty false` | Explicit mock/non-persistent labeling required per `AGENTS.md` §6. |
| `SRCPIPE-013` | Manual "開始分析" action, decoupled from sync, can target one or more pending batches | Mock-only UI/state | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-012` | Owner can select one or more pending batches and start analysis independently of when they were synced | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |

### Phase 3 — AI Analysis Conversation

| Task id | Title | Scope | Files likely affected | Dependencies | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `SRCPIPE-020` | Node-driven AI analysis conversation runner | Mock-only; supersedes `AIINPUT-NODE-003` | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-005`, `SRCPIPE-013`, `AIINPUT-CONV-002` (RES-006) | Starting analysis on a batch walks the source's enabled thinking-node list in order, instead of a fixed script | `pnpm exec tsc --noEmit --pretty false`, manual click-through (two sources with different node lists produce different step sequences) | Simulated only — no real webhook/poll wiring. |
| `SRCPIPE-021` | Multi-role agent turns with observation/proposal/critique/consensus structure | Mock-only | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-020` | Conversation turns are tagged with a role (Source Understanding / Personal OS Reasoning) and a `turnKind` from §12.2, rendered distinctly in the UI | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None — UI-only rendering change. |
| `SRCPIPE-022` | Evidence citation references in conversation turns | Mock-only | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-021` | Turns can cite specific source evidence (e.g. specific message ids) shown inline or on hover | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |
| `SRCPIPE-023` | Conversation completion produces 1..n mock `InboxItem` records | Mock-only | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-003`, `SRCPIPE-021` | A completed conversation yields one or more `InboxItem`-shaped mock objects, visibly handed toward `/inbox` | `pnpm exec tsc --noEmit --pretty false`, manual click-through (one analysis run, whether over a single batch or several selected batches, produces multiple distinct items when warranted) | Must not produce a final action (Todo/email/write) directly — output is `InboxItem` only. |

### Phase 4 — Inbox Handoff

| Task id | Title | Scope | Files likely affected | Dependencies | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `SRCPIPE-030` | `/inbox` reads `InboxItem` instead of `RawSourceItem` directly | Mock-only, but a real IA correction | `src/app/(dashboard)/inbox/page.tsx`, `src/lib/context/ingestion-context.tsx` | `SRCPIPE-023` | `/inbox`'s primary list renders `InboxItem` records produced by `/ai-input`'s analysis stage; raw, unanalyzed source items are no longer shown as if they were review-ready | `pnpm exec tsc --noEmit --pretty false`, manual click-through | This changes `/inbox`'s current four-tab model — coordinate with `SRCPIPE-008`'s decision review if tab structure itself needs to change. |
| `SRCPIPE-031` | Human note/correction UI on `InboxItem` | Mock-only | `src/app/(dashboard)/inbox/page.tsx` | `SRCPIPE-030` | Owner can add a note and/or correct the AI's summary on any `InboxItem` before it can proceed to standardization | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |
| `SRCPIPE-032` | Return-for-reanalysis action, preserving the prior version | Mock-only | `src/app/(dashboard)/inbox/page.tsx` | `SRCPIPE-031` | Returning an item for re-analysis with an instruction creates a new version linked to the old one; the old version is not overwritten | `pnpm exec tsc --noEmit --pretty false`, manual click-through | Must not delete/overwrite the prior `InboxItem` version. |
| `SRCPIPE-033` | Archive / defer actions on `InboxItem` | Mock-only | `src/app/(dashboard)/inbox/page.tsx` | `SRCPIPE-030` | Owner can archive or defer an item without proceeding to standardization | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |

### Phase 5 — Standardization and Action Intent

| Task id | Title | Scope | Files likely affected | Dependencies | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `SRCPIPE-040` | Generate `NormalizedRecordProposal` from `InboxItem` + recorded human review | Mock-only | `src/app/(dashboard)/inbox/page.tsx` | `SRCPIPE-004`, `SRCPIPE-031` | Standardization can only run once `InboxItem.humanReviewStatus` leaves `not_reviewed` (either `reviewed_with_notes` or `reviewed_no_notes_needed`); when notes exist, output reflects them (per §7's worked example) | `pnpm exec tsc --noEmit --pretty false`, manual click-through (verify a note changes the standardized output; verify an explicit no-notes-needed confirmation also unblocks standardization) | Must not allow standardization to run while `humanReviewStatus = not_reviewed`. |
| `SRCPIPE-041` | Manual field edit on the normalization proposal | Mock-only | `src/app/(dashboard)/inbox/page.tsx` | `SRCPIPE-040` | Owner can edit any field of the proposed standardized record before confirming | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |
| `SRCPIPE-042` | Create `ActionIntent` from a confirmed normalization proposal | Mock-only | `src/app/(dashboard)/inbox/page.tsx` | `SRCPIPE-041` | Confirming a normalization proposal produces an `ActionIntent`-shaped mock object with the correct `kind`, awaiting approval | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None — proposal-only, no module write yet. |
| `SRCPIPE-043` | Cross-link Todo `ActionIntent` (`task.create`) to `PLN-025` | Docs cross-link; supersedes `AIINPUT-ACTION-002` | `docs/05_execution-plans/PLN-025_source-action-item-to-write-intent.md`, `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` | `SRCPIPE-042`, PLN-025 | Docs note that `task.create` intents route into `PLN-025`'s existing `SourceActionItem → ModuleWriteIntent → Work` pipeline once its Prisma models exist | Docs review, `git diff --check` | Do not implement `PLN-025`'s Prisma models here. |
| `SRCPIPE-044` | Add `email.draft_create` as an `ActionIntent` kind, draft-only | Mock-only; supersedes `AIINPUT-ACTION-001`, repositioned per §9 | `src/app/(dashboard)/inbox/page.tsx`, `src/types/ingestion.ts` (type-proposal-only addition) | `SRCPIPE-042` | Confirming an `email.draft_create` intent produces a copyable/editable subject+body; no outbound send capability exists anywhere in the flow | `pnpm exec tsc --noEmit --pretty false`, manual click-through | Must not add any SMTP/email-provider API call, secret, or route handler; explicit no-send boundary visible in UI text. |
| `SRCPIPE-045` | User confirm/reject gate before any module write | Mock-only | `src/app/(dashboard)/inbox/page.tsx` | `SRCPIPE-042` | No `ActionIntent`, of any `kind`, transitions to "executed" without an explicit owner confirmation action; rejection is equally explicit and reversible | `pnpm exec tsc --noEmit --pretty false`, manual click-through | This is the safety-critical gate in §14's governance boundaries — do not weaken or bypass it for convenience. |

### Phase 6 — Scheduling

| Task id | Title | Scope | Files likely affected | Dependencies | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `SRCPIPE-050` | Per-source sync schedule configuration (mock), backed by `SourceProcessingPolicy` | Mock-only config UI | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-009`, `SRCPIPE-010` | Owner can set `syncSchedule`/`syncEnabled` per source; mock/local state only, explicitly labeled as such | `pnpm exec tsc --noEmit --pretty false`, manual click-through | No real scheduler/cron runtime and no real external re-fetch in this row — `scheduled_sync` execution is Polling under `AUT-007` and stays gated (§3); this row is configuration/simulated-state only. |
| `SRCPIPE-051` | Per-source analysis schedule configuration (mock), independent of sync schedule, backed by `SourceProcessingPolicy` | Mock-only config UI | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-013`, `SRCPIPE-050` | Owner can set `analysisSchedule`/`analysisEnabled` independently of `syncSchedule` for the same source | `pnpm exec tsc --noEmit --pretty false`, manual click-through | Still mock/simulated execution in this row; a real internal scheduler runtime (distinct from external polling) is evaluated separately in `SRCPIPE-054`. |
| `SRCPIPE-052` | "Analyze only when pending items exist" condition | Mock-only | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-051` | Scheduled analysis (simulated) honors `SourceProcessingPolicy.analyzeOnlyWhenPending` and skips a run when no batch is pending | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |
| `SRCPIPE-053` | Failure/retry/last-attempt/last-success-time tracking (mock) | Mock-only | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `SRCPIPE-050` | Each source shows `SourceProcessingPolicy`'s last-attempt/last-success/next-scheduled times for sync and analysis separately, plus a simulated failure/retry state | `pnpm exec tsc --noEmit --pretty false`, manual click-through | None. |
| `SRCPIPE-054` | Evaluate a real internal analysis-scheduler runtime, separate from external connector polling | Research/decision follow-on for `scheduled_analysis` only; does not touch `scheduled_sync` | New `ARC-*` note or update to `ARC-008`/`AUT-007` | `SRCPIPE-051`, `SRCPIPE-009` | Decision doc confirms `scheduled_analysis` (re-running AI analysis over existing `SourceBatch` records) can run as a real internal scheduler without triggering `AUT-007`'s polling gate, since no external provider call is involved, and names the concrete implementation shape if approved | Docs review | Must not be read as approval for any external re-fetch scheduler; that remains `scheduled_sync`/Phase 7's `SRCPIPE-060`, gated by `AUT-007`. |

### Phase 7 — Real Connector Runtime (Reserved, Not Actionable Now)

| Task id | Title | Scope | Files likely affected | Dependencies | Acceptance criteria | Verification | Risks / stop conditions |
|---|---|---|---|---|---|---|---|
| `SRCPIPE-060` | Real webhook/polling-driven sync and analysis | Reserved — explicitly not authorized by this document | N/A | `AUT-007` full approval package | Only becomes actionable after `AUT-007`'s required approval gates (provider scope, OAuth flow, webhook signature verification, replay/rate-limit proof, secret storage, rollback, explicit human approval) are complete | N/A until `AUT-007` clears | This row exists only to name the phase and its gate; do not attempt any webhook endpoint, polling job, OAuth callback, or provider runtime under this or any other task id in this document. |

## 17. Acceptance Mapping

These tasks target `ACC-002_module-acceptance-criteria.md`'s AI Input section and `PRD-005`'s AI Input value proposition (source-specific handling that improves over time, now correctly staged through owner-controlled sync/analysis, AI-to-AI conversational analysis, and human-gated standardization and action approval). No acceptance-criteria text is changed by this document; Phase 2–5 tasks should update `ACC-002` when they ship real behavior, per `AGENTS.md` §14. `SRCPIPE-008`'s outcome may also require updating `ARC-013_module-map.md` if the `/ai-input`/`/inbox` relationship changes there. `PLN-025` should be updated to reference `ActionIntent` (§12.5) as its upstream source once `SRCPIPE-004`/`SRCPIPE-043` land.
