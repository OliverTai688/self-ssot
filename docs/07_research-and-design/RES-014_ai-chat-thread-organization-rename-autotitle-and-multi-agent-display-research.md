# AI Chat Thread Organization, Rename, Auto-Title, and Multi-Agent Conversation Display Research

**Document ID:** `RES-014`
**Last updated:** 2026-07-16
**Status:** Research / design — no runtime implementation in this loop
**Trigger:** Owner feedback on the `AI 對話` (chat) tab of `/ai-input`, given while looking at the current sidebar screenshot. Owner's three asks, translated:

1. The "對話與來源處理" sidebar list should support **folders** — a folder can contain several conversations, not just one flat list.
2. A conversation's title should be **renameable**, and there should be a small button that lets the AI **auto-generate a title** from the conversation content.
3. Some conversations are **between two or more AI agents** (not owner-and-one-AI). Per earlier docs, those may also need to be persisted and shown in this same sidebar — this scenario must be accounted for in the design.

## 1. Source Basis

Local sources reviewed:

- `src/app/(dashboard)/ai-input/ai-input-client.tsx` — current `ChatThread` model and sidebar implementation (read directly, §2 below).
- `RES-006_ai-input-source-conversation-and-reference-library-gap-research.md` — defines the per-source-instance coworking thread (`AI-SOURCE-COWORKING-THREADS`), the shipped two-voice `[◯◯ 採集代理] ↔ [系統智能]` dialogue pattern, and `AIINPUT-CONV-002/003` (still `TODO`), which this document extends rather than duplicates.
- `RES-011_human-ai-event-operating-model-research.md` and `RES-010_cross-module-human-ai-agent-operating-model-research.md` — define `Thread`/`Conversation` as distinct domain objects from `AnalysisEvent`/`InboxItem`, and already flag the exact ambiguity the owner is now raising: `EVENTOPS-025` ("Stop if `/inbox` versus `/ai-input` IA needs owner decision") and `EVENTOPS-027` ("Define multi-agent conversation and invite permission contract", `TODO`, `P1`, `HIGH`, depends on `ARC-032`).
- `ARC-032_internal-multi-agent-task-message-bus-contract.md` — the only implemented multi-agent conversation primitive today (`AgentBusTask`/`AgentBusParticipant`/`AgentBusMessage`), explicitly scoped as **not** a live chat UI; out of scope includes "Live chat UI."
- `src/app/(dashboard)/agents/agent-command-center-client.tsx` and `src/lib/services/agent-command-center.service.ts` (`AGENT-012`, `DONE`) — the one place multi-agent/owner-to-group instruction threads are actually rendered today, as a **separate protected surface** from `/ai-input`.
- `src/components/ui/dropdown-menu.tsx`, `src/components/ui/dialog.tsx` — existing primitives available for rename/menu UI; no new dependency needed.
- `RES-002_saas-os-operating-surface-maturity-research.md` — SaaS/OS maturity bar (resource index / command bar / detail surface / agent workspace / records-audit / settings).

## 2. Current Implementation Audit

`ChatThread` (`ai-input-client.tsx:639-649`):

```ts
interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  mode: ChatMode
  isImported: boolean
  importType: "manual" | "auto" | null
  mentions: MentionRef[]
  isSourceThread?: boolean
  sourceType?: string
}
```

The sidebar (`ai-input-client.tsx:1310-1345`) renders `threads.map(...)` as one flat, unnested button list. Findings:

| Owner ask | Current state | Gap |
|---|---|---|
| Folder grouping | `threads` is a flat array; no `folderId`, no group headers, no nesting in the render. | No data field and no UI exists for grouping. |
| Rename | `title` is set once at creation (`startNewConversation`, line 811; `handleSourceSyncAction`, line 1156) and never mutated afterward. No edit affordance in the sidebar row. | No rename path, no inline edit UI, no persistence hook. |
| AI auto-title button | No title-generation logic anywhere in the file. No LLM/provider call capability exists in the codebase at all (`grep` for `anthropic`/`openai`/`generateText`/`@ai-sdk` across `src/` returns only `AgentBusTask`-style *type contracts*, not an actual provider call) — see `ARC-028`/`ARC-029`, which keep every agent op in `dry_run`. | Needs both a UI affordance and a decision on what "AI-generated" means before any real provider exists. |
| Multi-agent (AI-to-AI) conversations shown here | `isSourceThread: true` (blue dot, line 1338-1340) is the only "this thread is not owner↔one-AI" signal today, and it specifically means *ingestion agent ↔ system intelligence* for one source (`RES-006` §3, §4.1) — not a general multi-participant marker. The actual multi-agent primitive (`AgentBusTask`, `ARC-032`) lives entirely outside `ai-input-client.tsx`, in `/agents`. | No `threadKind` distinguishing "personal 1:1", "source coworking (2 AI voices, same shape as chat)", and "multi-agent task thread (different object, different governance)". Owner's intuition that these might all need to render "here" collides with `ARC-032`'s explicit "no live chat UI" boundary and `EVENTOPS-025`'s open `/inbox` vs `/ai-input` IA question. |

## 3. Design Proposal

### 3.1 Folders

Add a thin grouping layer, not a full nested filesystem — matches the existing flat, dense sidebar pattern used elsewhere in this repo (`ARC-012`'s "prefer clear operating surfaces over card-heavy arrangements").

```ts
interface ChatThreadFolder {
  id: string
  label: string
  collapsed: boolean
}

interface ChatThread {
  // ...existing fields
  folderId: string | null  // null = ungrouped, rendered at the top as today
}
```

Sidebar renders: ungrouped threads first (current behavior, zero regression), then one collapsible `<details>`-style section per folder, each listing its threads. A folder is created via "新增資料夾" next to the existing `+` button, or via a thread's row menu ("移到資料夾..."). No folder nesting (folder-in-folder) — one level is enough for the stated use case ("一個資料夾裡面有好幾個對話") and avoids reintroducing the tree-depth complexity `RES-009`/`ARC-012` explicitly steered away from for module tabs.

Two sensible default folders, seeded but renamable/deletable: **來源協作** (auto-holds every `isSourceThread: true` thread — replaces the current bare blue-dot signal with an actual grouping) and **個人對話** (holds the default thread and any owner-started ad hoc thread). This gives immediate value without the owner having to manually sort anything on day one.

### 3.2 Rename

Two entry points, both mutating `title` via the existing `setThreads` pattern (no new state shape needed):

1. **Double-click the thread row title** → turns into an inline `<input>` (autofocus, select-all, commit on blur/Enter, cancel on Escape) — cheapest, keyboard-friendly, matches how VS Code/Linear rename tabs.
2. **Row hover reveals a `⋮` menu** (`DropdownMenu`, already imported elsewhere in the design system) with "重新命名" / "移到資料夾" / "刪除對話" — needed anyway once folders exist, so rename can reuse that same menu instead of shipping a second, redundant hover affordance.

### 3.3 AI auto-title button

Sits inside the rename `DropdownMenu` (and optionally as a small sparkle icon next to the inline-edit input) — "AI 命名". Two-tier implementation, matching this repo's mock-first/no-provider-yet reality (§2 above):

- **Mock-mode / no-provider stub (implement now):** deterministic heuristic — take the first user message's first ~16 characters (or the first `triage`/`text` message's subject line if present), same approach the codebase already uses for `startNewConversation`'s time-based fallback title. Label the button's result as generated, not silently swap the title without owner action — the click is the confirmation, no separate "accept" step needed since it's non-destructive and instantly undoable via rename.
- **Real-provider mode (future, gated):** once any LLM provider call exists anywhere in this repo (currently none — first real call would itself need its own `ARC`/`AUT` gate per `AGENTS.md` §10 "Auth and Permission Rules" and the NANDA gate for any new agent capability), swap the heuristic for a real summarization call behind the same button — the UI contract doesn't change, only the implementation behind it. Do not build this tier now; note it as the reason the button dispatches through one indirection point (`generateThreadTitle(thread): string`) instead of being inlined.

### 3.4 Multi-agent (AI-to-AI) conversation visibility

This is the part that needs a boundary decision, not just a UI tweak, because two existing docs already stake out (partially conflicting) positions:

- `RES-006` already ships a "two-AI-voices-in-one-thread" pattern (`[◯◯ 採集代理] ↔ [系統智能]`) *inside* `ai-input-client.tsx`'s own thread model — this is genuinely a multi-agent conversation, and it already renders in this sidebar today. The owner's ask #3 is *partially already satisfied* by this, once §3.1's "來源協作" folder makes it visible as a distinct group instead of a mixed flat list.
- `ARC-032`'s `AgentBusTask`/`AgentBusMessage` (owner-instructs-one-or-a-group-of-agents, `/agents` surface) is explicitly **out of scope for a live chat UI** and lives under different governance (approval gates, `AgentBusProposal`, redaction policy, `DBS-006` audit mapping) that `ai-input-client.tsx` has no equivalent for. Rendering `AgentBusTask` threads inline inside the free-form chat composer would silently erase that governance boundary — an owner typing in the `/ai-input` composer must never be able to accidentally address a bounded, audited `AgentBusTask` as if it were a casual chat thread.

Recommended resolution (does not require new runtime code in this loop): keep the two object kinds **structurally distinct but visually adjacent**.

- Add `threadKind: "personal" | "source_coworking" | "agent_task_link"` to `ChatThread` (`isSourceThread`/`sourceType` become derived from `threadKind === "source_coworking"`, kept for now to avoid an unrelated refactor).
- A third sidebar section, **多代理協作 (連結)**, lists a read-only reference row per `AgentBusTask` the owner has already created in `/agents` (`id`, `title`, `state`) — clicking it **navigates to `/agents?task=<id>`**, it does not open an inline editable thread in `/ai-input`. This satisfies "should also be saved and shown here" (discoverability) without violating `ARC-032`'s no-live-chat-UI boundary or duplicating `AgentBusMessage` storage in `ChatThread.messages`.
- This directly resolves `EVENTOPS-025`'s open question ("Stop if `/inbox` versus `/ai-input` IA needs owner decision") for the `/ai-input` half: multi-agent *task* conversations are owned by `/agents`; `/ai-input` only cross-links to them. It does not resolve `/inbox`'s side, which stays out of scope here.

## 4. Rejected Alternatives

| Option | Why rejected |
|---|---|
| Unlimited folder nesting (folder-in-folder) | No stated need for more than one level; adds tree-state complexity (expand-path persistence, drag depth limits) this sidebar's 224px width can't usefully display anyway. |
| Auto-rename on every new message (no button) | Silently overwrites an owner-chosen title with no undo path; owner explicitly asked for a *button*, i.e. an opt-in action, not an automatic one. |
| Render `AgentBusTask` messages inline as ordinary `ChatMessage` rows in `/ai-input` | Breaks `ARC-032`'s explicit "no live chat UI" boundary and its approval/redaction/audit model; would let an owner address a governed multi-agent task from an ungoverned composer. |
| Build the real LLM auto-title call now | No provider call exists anywhere in this repo yet; adding the first one belongs to its own `ARC`/`AUT`-gated task, not folded into a sidebar UI change. |

## 5. NANDA Agent Protocol Gate

This task is chat-history/UI organization plus a read-only cross-link to an existing `AgentBusTask` list — it does not create, modify, route, or expose a new AI agent capability. `IngestionAgent`'s manifest (already covers the `source_coworking` two-voice dialogue per `RES-006` §7) is unaffected. The mock-mode auto-title heuristic (§3.3) is a deterministic client-side string function, not an agent capability, so no `AgentFacts-lite` change is needed for it. If/when the real-provider tier (§3.3 second bullet) is built, that is the point a NANDA gate and capability-manifest entry become mandatory — flagged here so the future task doesn't skip it.

## 6. Backlog Rows

| Task id | Title | Module | Files likely affected | Acceptance criteria | Verification | Risk / Notes |
|---|---|---|---|---|---|---|
| `AICHAT-001` | Add `folderId`/`ChatThreadFolder` and render grouped sidebar | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `ChatThread` gains `folderId: string \| null`; two seeded folders (`來源協作` auto-collects `isSourceThread`/`source_coworking` threads, `個人對話` holds the default + ad hoc threads); sidebar renders ungrouped threads first, then collapsible folder sections; "新增資料夾" action; existing thread click/active behavior unchanged | `pnpm exec tsc --noEmit --pretty false`, manual click-through (create folder, drag/move a thread via row menu, collapse/expand persists within session) | LOW — client state only, no schema/server action. |
| `AICHAT-002` | Add inline rename + row `⋮` menu (rename / move to folder / delete) | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Double-click title enters inline edit (autofocus, select-all, Enter commits, Escape cancels); `⋮` `DropdownMenu` offers 重新命名/移到資料夾/刪除對話; delete requires a confirm step (reuse `dialog.tsx`) since it's destructive to session-local history | `pnpm exec tsc --noEmit --pretty false`, manual click-through | LOW — depends on `AICHAT-001` for the "move to folder" menu item; delete only removes client state, no DB row exists yet to lose. |
| `AICHAT-003` | Add mock-mode "AI 命名" auto-title button | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Button in the rename menu calls a `generateThreadTitle(thread): string` heuristic (first user message excerpt) and commits it as the new title through the same rename path as `AICHAT-002`; clearly a client-side heuristic, not a provider call — no new AgentFacts-lite entry needed per §5 | `pnpm exec tsc --noEmit --pretty false`, manual click-through (verify title updates from a thread with several messages) | LOW — single indirection point (`generateThreadTitle`) so a future real-provider tier is a drop-in swap, not a rewrite. |
| `AICHAT-004` | Add `threadKind` field and read-only "多代理協作 (連結)" sidebar section | AI Input / Agent Team OS | `src/app/(dashboard)/ai-input/ai-input-client.tsx`, `src/lib/services/agent-command-center.service.ts` (read existing `AgentBusTask` list only) | `ChatThread` gains `threadKind: "personal" \| "source_coworking" \| "agent_task_link"`; a third sidebar section lists existing `AgentBusTask` rows by title/state; clicking navigates to `/agents?task=<id>` (or existing task-detail route) instead of opening an inline thread; no `AgentBusMessage` content is copied into `ChatThread.messages` | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual click-through (confirm navigation, confirm no compose-bar path can address a task thread) | MEDIUM — must not blur the `ARC-032` "no live chat UI" boundary; keep strictly read-only/link-only in this pass. Resolves `EVENTOPS-025`'s `/ai-input`-side IA question. |

## 7. Owner Decision (2026-07-16)

Owner confirmed §3.4's recommendation: multi-agent *task* threads (`AgentBusTask`) are **link-only** in `/ai-input` — a row in the "多代理協作 (連結)" sidebar section navigates to `/agents?task=<id>`; no `AgentBusMessage` transcript is inlined or copied into `ChatThread.messages`. Rationale confirmed: preserves `ARC-032`'s "no live chat UI" boundary and keeps approval/redaction/audit ownership entirely on `/agents`, so the `/ai-input` composer can never be mistaken for a channel that addresses a governed multi-agent task. `AICHAT-004` is cleared to implement as scoped in §3.4/§6 without further owner sign-off. `EVENTOPS-027` ("Define multi-agent conversation and invite permission contract") should still formalize this as the general cross-module rule when it moves off `TODO`.
