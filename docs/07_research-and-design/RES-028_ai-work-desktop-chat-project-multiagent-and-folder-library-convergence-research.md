# AI Work Desktop Chat/Project Container, Multi-Agent Lounge, and Cloud Folder Library Convergence Research

**Document ID:** `RES-028`
**Last updated:** 2026-08-24
**Status:** Research / design — no runtime implementation in this loop
**Trigger:** Owner (Oliver) feedback on five `/ai-input` ("AI 工作桌") screenshots plus one live `localhost:3000` walkthrough via Claude in Chrome. Owner's five asks, as given:

1. 「這兩個要合併」— two things shown across the screenshots should be merged.
2. 「快速擷取點旁邊應該要可以關掉」— there should be a way to dismiss/close next to Quick Capture.
3. 「對齊 codex 的設計，重新設計引用來源新增檔案多聊天管理的介面，且要包含讓所有 AI 可以自由交流發起聊天的區域，同步也可以我手動將多個 AI 加入」— redesign the reference-source/add-file/multi-chat management surface aligned to Codex's design, including an area where all AIs can freely converse and initiate chats, plus manual multi-AI invite into a chat.
4. 「應該要可以收縮起來，且最下面應該參考 clickup 的方式有所謂成員使用者的小卡，使用者設定和系統設定應該會是分開的頁面」— the sidebar should collapse; its bottom should carry a ClickUp-style member card; user settings and system settings should be separate pages.
5. 「參考脈絡頁面充斥著 demo 資料，但是正式版本並沒有可以新增參考脈絡的部分，且參考脈絡的部分跟聊天室引用資料夾的流程衝突，請合併到聊天室，並參考對齊 claude 的設計進行 chat, project 的管理，而原先的檔案庫和媒體庫之外應該要多一個類似桌面資料夾管理的項目，這樣 project 或是 chat 才能引用特定資料夾進行使用，但是不用依賴本機」— the Reference Context page is full of demo data with no way to add anything in formal mode, and it conflicts with the chat's own folder-reference flow; merge it into chat, align to Claude's chat/project management, and add a folder-manager-like item beside File Library/Media Library so a Project or Chat can reference specific (cloud, not local-machine) folders.

Owner note: 「可自主新增需要的頁面結構」— Claude may add new page structure at its own discretion.

---

## 1. Source Basis

Local sources reviewed (files, not summaries):

- `AGENTS.md` — closed-loop rules, UI/UX rules (§12), Page Requirement Understanding Score Gate.
- `ui-audit-and-fixes.md` (2026-08-24) — the just-completed Payload-CMS-referenced compression pass on `/ai-input`, `/dashboard`, `/settings`, `/admin`, `/research`, `/`, `/login`. This is the *baseline* these five asks build on, not a prior state.
- `docs/05_execution-plans/PLN-067_owner-ai-work-desktop-and-company-sharing-contraction-plan.md` — v1 scope freeze, "internal AI Public Space" (`OWNEROS-006`, Stage 6, `BLOCKED_DECISION`), Stage 2 `ContextPackage` contract.
- `docs/05_execution-plans/PLN-068_chinese-first-simplified-saas-ui-convergence-plan.md` — sidebar grouping (今日/AI 工作/核心作業/系統/更多), shared page skeleton, resource-stack adoption gate.
- `docs/07_research-and-design/RES-006, RES-008, RES-014, RES-015, RES-016, RES-017` — prior owner-directed research on source coworking threads, quick-capture, chat folders/rename/multi-agent display, reference-context-in-chat, module-scoped libraries, human-AI inbox collaboration. **All five of this document's asks were partially anticipated by these docs; §2 maps exactly what is already decided vs. what is new.**
- `docs/05_execution-plans/PLN-060_task-backlog.md` — confirmed via `rg` that `AICHAT-001..013` and `AIINPUT-CAPTURE-001..006` are still `TODO`. Nothing in §2's gap analysis has silently shipped since those docs were written.
- `src/components/layout/app-sidebar.tsx` — full read; confirmed fixed `w-56`, no collapse control, footer has only a text hint + one demo/formal badge, no member/user card.
- `src/app/(dashboard)/ai-input/ai-input-client.tsx` — read the subpage nav array (`AIInputSubpage = "chat" | "context" | "files" | "media" | "settings" | "workbench"`, lines ~2421-2433) and the "workbench" tab's existing `reviewCount` badge (confirms `workbench` = the 待審提案/審核 queue, not a resource browser — must stay a distinct concern from §3.5's redesign).
- **Live verification, `localhost:3000`, via Claude in Chrome (screenshots below map 1:1 to what is described here):**
  - `/ai-input` in **示範 (demo)** mode: top-right corner badge reads "示範" *and* the module header row directly under it repeats a second "示範" chip next to the title, i.e. two badges stating the same fact, stacked.
  - `/ai-input` → 正式 (formal) mode → 參考脈絡 tab: 已加入 `0` / 來源池 `0` / 可引用 `0`, "尚未加入參考脈絡，仍可直接對話" and "尚無可引用來源" — a confirmed dead end, exactly the owner's point 5 complaint.
  - `/ai-input` chat tab's own "擷取" header button does **not** open a dialog — it prefills the composer textarea with a template string. The actual "快速擷取 – AI 將自動分類" modal (matching the owner's screenshot) lives on `/dashboard`'s "快速擷取 ⌘K" button — confirmed by opening it live. Its header row has the title only; the only dismiss affordance is the "Esc 關閉" **text hint** at the bottom-left — there is no clickable ✕. This is the owner's point 2, confirmed with a live screenshot, not inferred from the static image.
  - `/ai-input` sidebar ("對話與來源處理") already renders RES-014 §3.1's two seeded folders — 個人對話 (1) and 來源協作 (0) — confirming `AICHAT-001`'s folder model is **partially live** even though `PLN-060` still marks the row `TODO` (front-end shape exists; rename/AI-title/multi-agent-link pieces do not).
  - `/settings` mixes owner-personal fields (Email, 角色=OWNER as a *display* of the signed-in user) with workspace/system fields (成員, 角色 as a *permission model*, AI 分享, 模組 11/11, 人工設定, 系統就緒, 安全邊界) on one page — confirms the owner's point 4 "使用者設定和系統設定應該分開" is a real, currently-unaddressed gap, not a misreading of the screenshots.

## 2. What Is Already Decided vs. What Is New

| Owner ask | Already covered by existing research | Status | What this document adds |
|---|---|---|---|
| 1. Merge the two things | Not covered by name. `PLN-068` §4 principle 2 ("one global navigation layer... avoid stacking sidebar + top nav + inner tab bar + card grid") is the closest existing rule. | New | Identifies the two concrete redundant elements (the duplicated demo/formal badge; the two-tier "AI 對話" tab-label / "AI 工作桌" title-card naming) from the live walkthrough and folds them into one header. See §3.1. |
| 2. Quick Capture dismiss | `RES-008` (`AIINPUT-CAPTURE-001`, `DONE` as research) already diagnosed the modal as too heavy and proposed replacing it with a **collapsible capture dock** (`AIINPUT-CAPTURE-002/003`, still `TODO`). | Larger fix already researched, not yet built | Adds the small, immediate, no-risk fix (a real ✕ button) that stands on its own *and* remains correct once the dock ships — see §3.2. Does not re-litigate `RES-008`'s dock design. |
| 3. Codex-aligned source/file/multi-chat UI + AI free-chat lounge + manual multi-AI invite | `RES-014` §3.4 designed a **read-only, link-only** "多代理協作 (連結)" section (`AICHAT-004`, `TODO`) specifically to avoid blurring `ARC-032`'s "no live chat UI" boundary. `PLN-067` Stage 6 (`OWNEROS-006`, internal AI Public Space) is the fuller version of a multi-agent lounge but is `BLOCKED_DECISION` pending owner answers to `RPT-062 §3.5` Q1/Q3/Q4. | Partially researched, explicitly blocked | The owner is now, in this conversation, the source of a partial unblock: confirms a visible multi-agent discussion space and manual multi-AI invite are wanted. §3.3 designs both **without** claiming full `OWNEROS-006` unblock — see the owner-decision framing in §3.3.3. |
| 4. Collapsible sidebar + ClickUp member card + split settings | Not covered anywhere. `app-sidebar.tsx` confirmed to have no collapse control and no member card. `/settings` confirmed to mix personal and workspace fields. | New | §3.4. |
| 5. Kill 參考脈絡 tab, merge into chat, Claude-style Project container, new cloud folder library | `RES-015` already recommended removing the "參考脈絡" tab and replacing it with a **per-thread** reference drawer (`AICHAT-005/006`, `TODO`). `RES-014` already designed **folders** (個人對話/來源協作) as thread grouping. `RES-016` designed **module-scoped** (not chat-scoped) file/media library tabs — a different axis, still relevant but not what closes this gap. | Partially researched | The owner's new, more specific direction is to *fuse* RES-014's folders and RES-015's reference drawer into one Claude-style **Project** object (a folder *is* a project; a project owns its own knowledge, not just a modal-scoped mention list), and to add a **new** cloud-native folder-browsing surface that neither `RES-006` (flat source list) nor `RES-016` (module tabs) provides. §3.5. |

None of RES-014/015/016's existing backlog rows are wrong — they are extended, not replaced. Where this document's design differs in shape from an existing `TODO` row, §7 states exactly which rows are superseded and which stand as-is.

## 3. Design Proposal

### 3.1 Merge Point 1 — One Header, Not Two

Live evidence (§1) found two concrete duplications on `/ai-input`, both plausibly what "這兩個要合併" refers to:

1. **The demo/formal badge appears twice** — once at the far top-right of the whole subpage-tab row, once again immediately under the "AI 工作桌" title in the compact header `ui-audit-and-fixes.md` §3.2 already introduced. Both say the same thing ("示範" or "正式") a few pixels apart.
2. **Two names for one screen** — the active tab pill reads "AI 對話" while the title directly beneath it reads "AI 工作桌", with a third label ("捕捉、審核…") beneath that. A first-time viewer cannot tell whether these are three different things or one.

Resolution: collapse into **one header row**:

```txt
[icon] AI 對話            [InsightRail: 審核 N · 來源 N · 脈絡 N]  [擷取] […]  [state badge]
```

- Keep exactly **one** state badge (示範/正式), placed at the end of this single row — delete the duplicate.
- The module's own name ("AI 工作桌") becomes the sidebar nav label and the browser tab title only; the in-page header shows the **active view name** ("AI 對話", "資源", …) the way Linear/Claude/Codex all do (page chrome names the workspace once, in the nav; the content header names what you're looking at). This directly extends `PLN-068` §4 principle 2 and reuses the shared `AppHeader` pattern `ui-audit-and-fixes.md` already applied to `/research`, `/dashboard`, `/settings` — `/ai-input` is the one core page that pattern has not yet fully reached, per `ui-audit-and-fixes.md` §3.2's own note that this page is "已完成，優先度最高" only for the *outer* compression, not this specific double-naming.

### 3.2 Quick Capture Dismiss (Point 2)

Two fixes at two timescales, matching `RES-008`'s own two-tier framing (§2 above):

**Now (this task, LOW risk, ships independently of the dock rework):** add a real `✕` icon button top-right of the "快速擷取 – AI 將自動分類" dialog header, wired to the same close handler Escape already calls. Keep "Esc 關閉" as a secondary hint, not the only path — a modal with no visible dismiss control fails basic dialog affordance regardless of what replaces it later.

**Later (`AIINPUT-CAPTURE-002/003`, already `TODO`, unchanged by this doc):** the collapsible capture dock. When it lands, its collapse chevron *is* the dismiss control and this interim ✕ becomes redundant — plan for that, don't block on it.

### 3.3 Codex-Aligned Chat/Source Management + AI Lounge + Manual Multi-AI Invite (Point 3)

#### 3.3.1 What "Codex-aligned" means here, concretely

From the reviewed Codex material: a persistent **task list** in the rail (one row per unit of work, with a status indicator), a **summary pane** that tracks plans/sources/artifacts for the selected task, and support for **multiple concurrent tasks** that don't interfere with each other. Applied to `/ai-input`:

- The left rail's rows (today: flat `ChatThread` list plus RES-014's two folders) gain a **status pill** per row when the thread is a source-coworking or capture-pipeline thread (作答中/待審核/已完成 — reusing the existing `AIWorkflowRun`/triage state already modeled in `src/types/ingestion.ts`, not inventing a new state machine).
- A dedicated, **collapsible** right-hand "resource rail" (see §3.5) becomes the Codex-style "summary pane" — the thing that tracks what a thread is actually grounded in, always one click away without navigating off the thread the way the current standalone 檔案庫/媒體庫/同步設定 tabs force today.

#### 3.3.2 Manual multi-AI invite

A human-convened thread is a **new**, narrowly-scoped capability, distinct from `ARC-032`'s `AgentBusTask` automation:

- Composer gains an "+ 邀請 AI" control. Opens a multi-select of the existing module agents already modeled in this repo (`CoreAI`/orchestrator per `PLN-068` §6.1.3, `IngestionAgent`, and any `WorkAgent`/`ResearchAgent`/`CompanyAgent` surfaced in `/agents`).
- Selected agents become additional `mentions`-style participants on that one `ChatThread` only — each reply is attributed (avatar + label) per participant, matching how `RES-006`'s existing two-voice `[◯◯ 採集代理] ↔ [系統智能]` pattern already renders multiple speakers in one thread, just generalized past two fixed voices to an owner-chosen roster.
- This is explicitly **not** `AgentBusTask` — no approval-gated automation, no redaction policy, no audit trail beyond normal conversation history. It is a human sitting in a room and inviting people in; it stays inside the same governance boundary as any other owner-initiated `/ai-input` chat. `RES-014` §3.4's "多代理協作 (連結)" read-only cross-link to real `AgentBusTask` rows is kept exactly as designed — the two remain visually adjacent (same rail) but structurally distinct, per `RES-014`'s own resolution.

#### 3.3.3 AI free-chat lounge — a scoped, non-blocking slice of `OWNEROS-006`

`PLN-067` Stage 6 (full "Internal AI Public Space": scheduled discussion tasks, C-level filtering, proposal-only downstream writes, retention/pause/cancel) remains `BLOCKED_DECISION` — this document does not implement it and does not claim to.

What *is* being recorded as an owner decision today: the owner wants a **visible, always-present** space (not a scheduled task) where the invited module AIs can converse with each other and with the owner, observable and interruptible at any time. Scoped narrowly:

- A permanently-pinned Project (see §3.5) titled **"AI 交流廣場"**, seeded by default, not deletable.
- Participants are limited to the same allow-listed module agent roster as §3.3.2's manual invite — no external/cross-organization participants, matching `PLN-067` §3's non-negotiable boundaries.
- Full transcript, owner can post into it at any time exactly like `OWNEROS-006`'s eventual "full human-readable transcript and intervention" requirement — this slice is a compatible subset, not a divergent design.
- **Explicitly out of scope for this slice** (remains gated on `RPT-062 §3.5` Q3/Q4 before it can be built): autonomous scheduling of a discussion without an owner or agent explicitly starting it, any downstream write/action proposal generated from this space, retention policy beyond normal chat history. Until those questions are answered, the lounge is a chat surface, not an automation surface — it may not silently grow write capability.

### 3.4 Collapsible Sidebar, ClickUp-Style Member Card, Split Settings (Point 4)

Confirmed via `app-sidebar.tsx` read: `<aside className="flex h-full w-56 flex-col ...">` has no width-toggle state anywhere in the file, and the `<div className="border-t p-3">` footer holds only a text hint plus the single demo/formal toggle — no avatar, no name, no workspace switcher.

- **Collapse:** add `collapsed` boolean state (persisted client-side, e.g. `localStorage` or a settings preference once `OWNEROS-I18N-001`-style preference storage exists), a chevron control at the top of the `<aside>`, and a `w-14`/icon-only layout when collapsed — group labels hide, `NavItem` icons remain with `title` tooltips. This mirrors ClickUp 3.0's own documented pattern (drag-resizable width, double-click to reset, collapse via the global-nav expand icon) — confirmed via ClickUp's own help documentation ([Intro to the Sidebar in ClickUp 3.0](https://help.clickup.com/hc/en-us/articles/12755292456983-Intro-to-Sidebar)).
- **Member card:** replace the current bare footer with two stacked rows: (1) a compact member card — avatar circle, display name, workspace/tenant name, a presence dot — click opens a lightweight account switcher/profile popover; (2) the existing demo/formal badge, kept but now alone (no duplicate, per §3.1). This is the ClickUp pattern of a persistent identity anchor at the base of primary navigation, adapted to this repo's single-owner-plus-invited-members model (`PLN-067` Stage 1) rather than copied wholesale — per `PLN-068` §8's adoption-gate rule ("extract behavior and hierarchy, not branding").
- **Split settings:** confirmed live that `/settings` mixes Email/個人語言 (user-scoped) with 成員/角色/AI分享/模組/人工設定/系統就緒/安全邊界 (workspace-scoped). Split into:
  - `/settings` — re-scoped to **使用者設定**: profile (name, email, avatar), language preference (`OWNEROS-I18N-001`), personal notification preference, personal AI-sharing default. This is what the sidebar's existing "設定" item should mean going forward.
  - `/settings/system` (**new route**) — **系統設定**: 成員, 角色, AI 分享 policy, 模組 enablement (11/11), 人工設定, and the "設定控制台" overview card that currently opens `/settings`. This is workspace/tenant configuration, not personal preference, and belongs to the owner/admin persona, not every member.
  - `/admin` is unchanged — it stays proof/audit-oriented ("操作邊界"/readiness evidence) per `PLN-068` §7's admin exception, distinct from `/settings/system`'s configuration surface.
  - Sidebar 系統 group becomes three items: 使用者設定 (`/settings`) / 系統設定 (`/settings/system`) / 管理 (`/admin`).

### 3.5 Kill 參考脈絡, Claude-Style Chat/Project Container, New Cloud Folder Library (Point 5)

#### 3.5.1 Confirmed dead end

Live: 正式 mode → 參考脈絡 → 已加入 0 / 來源池 0 / 可引用 0, no add affordance anywhere on the page. `RES-015` already recommended removing this as a standalone tab (`AICHAT-005`) in favor of a thread-scoped drawer — that recommendation stands and is subsumed below, not reversed.

#### 3.5.2 Claude-style Project container

Per the reviewed Claude Projects material: a Project is a persistent container holding (a) a knowledge base of documents that (b) every chat inside the project automatically inherits, plus (c) custom instructions, accessed from a sidebar list with "+ New Project," and existing standalone chats can be moved into a project ([Claude AI Projects guide](https://fast.io/resources/claude-ai-projects-guide/)).

Fuse this with `RES-014`'s already-shipped folder model (個人對話/來源協作 are already, structurally, one-level containers of threads) and `RES-015`'s reference drawer:

```ts
interface ChatProject {
  id: string
  label: string
  icon?: string
  pinned: boolean            // true for "個人對話", "來源協作", "AI 交流廣場" — seeded, not deletable
  folderRefs: CloudFolderRef[]   // §3.5.3 — the project's own knowledge base
  memberAgentIds: string[]       // default participant roster for new threads in this project (§3.3.2)
}

interface ChatThread {
  // ...existing fields per RES-014 §3.1
  projectId: string | null   // supersedes RES-014's folderId — a project *is* the folder
}
```

- The 參考脈絡 tab is removed entirely (not replaced by a per-thread modal as `RES-015` originally scoped it, but by the Project's own always-visible knowledge panel — a stronger version of the same fix, because the reference set now belongs to the Project and every thread in it inherits it automatically, matching Claude's actual behavior instead of re-asking per thread).
- A thread can still pin extra one-off references beyond its Project's defaults (the per-thread drawer from `RES-015` §3.1 survives as an *addition* layer, not the whole mechanism).
- `RES-014`'s `folderId` field is renamed/absorbed into `projectId` — a one-line migration, not a redesign, since the two concepts were already structurally identical (one level, seeded defaults, ungrouped-at-top fallback).

#### 3.5.3 New: cloud folder library (not module-scoped, not local-machine-dependent)

Neither existing surface covers this:

- `RES-006`'s 檔案庫/媒體庫 are **flat asset lists**, not a folder tree — there is nothing to "browse into."
- `RES-016`'s module-scoped library tabs classify assets **by product module** (工作/研究/公司/…), not by arbitrary owner-defined folder.

What the owner is asking for is a third, new library type — a **資料夾庫** (folder library): a navigable tree the owner can create/organize inside Personal OS itself, into which existing source connections (LINE, Google Drive, Gmail — per `PLN-067` Stage 4 and `RES-027`'s multi-account source connections) and already-ingested assets can be filed, entirely server-side. Critically, **not** a local filesystem picker — the folder tree is backed by the same authorized `ContextPackage`/source-connection catalog `PLN-067` Stage 2 already defines, so a Project or a Chat attaches a *folder reference*, not a local path, and it resolves identically for the owner on any device.

```ts
interface CloudFolder {
  id: string
  label: string
  parentId: string | null       // one level of nesting is enough for v1, matching RES-014 §4's rejected-nesting precedent
  memberAssetIds: string[]      // FileAsset/MediaAsset ids already in 檔案庫/媒體庫
  memberSourceConnectionIds: string[]  // e.g. a whole "LINE 商會核心幹部群" connection, filed as one folder entry
}

interface CloudFolderRef {
  folderId: string
  addedAt: string
}
```

- Sidebar of `/ai-input`'s resource rail becomes 4 tabs instead of the old 3+context: **資料夾庫** (new, default tab) / 檔案庫 / 媒體庫 / 同步設定. "AI 工作台" (the 待審提案 queue, `AIINPUT-WORK-002`'s own planned 4-tab reorg) stays a **separate** top-level concern per §1's file-level confirmation that `workbench` already means something else — it is not folded into this rail.
- Attaching a `CloudFolder` to a `ChatProject` is exactly what "project 或是 chat 才能引用特定資料夾進行使用" asks for, and resolving its contents happens through the same `requireUser()` + service-layer authorization path as every other source read in this repo — no new trust boundary, no client-side raw source payloads.

## 4. New Page/Route Structure

| Route | Change | Notes |
|---|---|---|
| `/ai-input` | Kept. Internal shape changes per §3.1/§3.3/§3.5: left rail = Projects (pinned: 個人對話, 來源協作, **AI 交流廣場** new) + their threads; center = active thread with 邀請 AI control; right rail (collapsible) = 資料夾庫 (new) / 檔案庫 / 媒體庫 / 同步設定; 參考脈絡 top-level tab **removed**; AI 工作台 tab stays, unaffected by this doc. | No route change — internal IA only. |
| `/settings` | Re-scoped to **使用者設定** only (§3.4). | Existing route, narrowed content. |
| `/settings/system` | **New.** 系統設定 — 成員/角色/AI 分享/模組/人工設定 content moved here from today's `/settings`. | New page structure, per owner's explicit "可自主新增需要的頁面結構." |
| `/admin` | Unchanged. | Stays proof/audit, per `PLN-068` §7. |
| `/agents?task=<id>` | Unchanged target of `RES-014`'s read-only cross-link — still the home of governed `AgentBusTask` automation, not touched by §3.3's manual-invite or lounge design. | No change. |

Sidebar (`app-sidebar.tsx`) 系統 group becomes: 使用者設定 (`/settings`) / 系統設定 (`/settings/system`) / 管理 (`/admin`). Footer gains the collapse control and member card per §3.4.

## 5. Rejected Alternatives

| Option | Why rejected |
|---|---|
| Keep 參考脈絡 as a tab, just seed it with real data in formal mode | Doesn't fix the actual complaint — the owner explicitly said the *flow* conflicts with chat-scoped referencing, not just that the demo data is stale. A populated dead-end tab is still a dead end. |
| Build the full `OWNEROS-006` Internal AI Public Space now to satisfy the "AI 交流廣場" ask | `RPT-062 §3.5` Q3/Q4 remain unanswered; building scheduling/proposal/retention now would ship ungoverned autonomous writes ahead of the owner's own stop condition in `PLN-067` Stage 6. §3.3.3 ships a compatible, strictly observation/manual-participation subset instead. |
| Make `CloudFolder` mirror the local filesystem (drag a real device folder in) | Explicitly rejected by the owner ("不用依賴本機"). Also breaks the BFF-first/service-authorization rule (`AGENTS.md` §6) — a local path has no server-side authorization story. |
| Fold "AI 工作台" (待審提案 queue) into the new 資料夾庫/檔案庫/媒體庫 resource rail | `ai-input-client.tsx` already models `workbench` as the review-queue tab with its own `reviewCount`, and `RES-013`'s `AIINPUT-WORK-002..004` already plans its own internal 4-tab reorg (待審提案/執行狀態/來源狀態/審計日誌). Merging two independently-planned reorganizations in one pass raises the risk of both landing wrong. |
| One global settings page with collapsible sections instead of two routes | The owner asked for **separate pages** specifically ("應該會是分開的頁面"), and the existing `/admin` vs `/settings` split already establishes the precedent of route-level separation by audience (`PLN-068` §7) — a third audience (workspace/system config) gets a third route, not a third accordion on one page. |

## 6. NANDA Agent Protocol Gate

§3.3.2 (manual multi-AI invite) and §3.3.3 (AI 交流廣場) both touch AI agent capability exposure and require the gate per `ARC-028`:

- **AgentFacts-lite fields affected:** capabilities (each module agent gains a "participate in owner-convened multi-party chat thread" capability, LOW risk, no write access), no change to `externalRegisterable` (stays `false` for every internal agent involved).
- **Governance tier:** both surfaces are **protected-owner visible**, not external-registerable and not internal-runtime-autonomous — every participant is either explicitly invited by the owner (§3.3.2) or a pre-approved seed member of the pinned lounge project (§3.3.3); no agent can add itself or another agent.
- **Trust boundary:** §3.3.3 explicitly forbids downstream write/action proposals from the lounge until `RPT-062 §3.5` Q3/Q4 are answered — this is the concrete stop condition carried forward from `PLN-067` Stage 6, not loosened by this document.
- **Artifact produced:** this document's §3.3, plus the backlog rows in §8, are the required concrete artifact (a scoped capability description) for this loop; a full `AgentFacts-lite` manifest diff is deferred to the implementation task since no runtime capability is being added by documentation alone.

§3.1, §3.2, §3.4, §3.5 are UI/IA/data-shape changes with no new agent capability — no NANDA gate applies to those.

## 7. Relationship to Existing RES/PLN Rows

| Existing row | Disposition |
|---|---|
| `AICHAT-001` (folders) | **Extended, not replaced.** `folderId` becomes `projectId` (§3.5.2) — same shape, renamed field, plus the two new fields (`folderRefs`, `memberAgentIds`) a Project needs that a bare folder didn't. |
| `AICHAT-002`/`AICHAT-003` (rename, AI auto-title) | Unaffected — still valid as scoped. |
| `AICHAT-004` (多代理協作 link-only section) | Unaffected — kept exactly as designed, sits alongside (not inside) §3.3.2's new manual-invite participants. |
| `AICHAT-005`/`AICHAT-006` (remove 參考脈絡 tab, per-thread drawer) | **Superseded in shape, not intent.** The tab removal stands; the replacement is the Project knowledge panel (§3.5.2) rather than a purely per-thread modal — the per-thread drawer becomes an *additive* layer on top of the Project's defaults, not the sole mechanism. |
| `AICHAT-007`/`AICHAT-008` | Already marked superseded by `RES-015`'s own addendum in favor of `RES-016`'s `MODLIB-004/005/007` — this document does not touch that correction. |
| `AIINPUT-CAPTURE-001..006` (`RES-008`) | Unaffected by the dock design; §3.2 adds one interim task ahead of `AIINPUT-CAPTURE-003`. |
| `PLN-067` `OWNEROS-006` (`BLOCKED_DECISION`) | Not unblocked in full. §3.3.3 records a scoped owner decision (visible lounge + manual participation, no autonomy/writes) that can ship independently of the full Stage 6 gate. |

## 8. Backlog Rows

| Task id | Title | Module | Files likely affected | Acceptance criteria | Verification | Risk / Notes |
|---|---|---|---|---|---|---|
| `AIWORKDESK-001` | Collapse duplicate demo/formal badge and unify tab-label/title-card naming | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Only one 示範/正式 badge renders on `/ai-input`; header shows one active-view name, module name moves to sidebar/tab-title only | `pnpm exec tsc --noEmit --pretty false`, browser screenshot diff (demo + formal mode) | LOW — layout-only. See §3.1. |
| `AIWORKDESK-002` | Add explicit ✕ dismiss button to Quick Capture dialog | Dashboard / AI Input | Quick Capture dialog component (triggered from `/dashboard`'s "快速擷取" button; confirm exact file via `rg "快速擷取 – AI"`) | Dialog header shows a clickable ✕ that closes the dialog identically to Escape; Escape/backdrop-click still work | `pnpm exec tsc --noEmit --pretty false`, manual click-through | LOW — independent of `AIINPUT-CAPTURE-003`. See §3.2. |
| `AIWORKDESK-003` | Add `ChatProject` model, migrate `folderId`→`projectId`, seed 個人對話/來源協作/AI 交流廣場 | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | `ChatProject` type exists with `folderRefs`/`memberAgentIds`; existing two seeded folders become Projects unchanged in behavior; "AI 交流廣場" seeded as a third pinned, non-deletable Project | `pnpm exec tsc --noEmit --pretty false`, manual click-through | MEDIUM — supersedes `AICHAT-001`'s field name; depends on this doc's §3.5.2 being accepted over `RES-014`'s literal `folderId`. |
| `AIWORKDESK-004` | Remove 參考脈絡 tab; add Project knowledge panel + per-thread addition drawer | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | 參考脈絡 no longer appears in top nav; selecting a Project shows its `folderRefs` as always-on context; a thread can add one-off extra references beyond the Project default | `pnpm exec tsc --noEmit --pretty false`, manual click-through (formal mode, verify no dead end) | MEDIUM — supersedes `AICHAT-005`/`AICHAT-006`'s shape per §7. |
| `AIWORKDESK-005` | Add `CloudFolder` model and 資料夾庫 tab in the resource rail | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx`, `src/types/file-library.ts` or new `src/types/cloud-folder.ts` | New 資料夾庫 tab lists/creates one-level folders; a folder can contain existing FileAsset/MediaAsset ids and whole source-connection ids; no local-filesystem API used anywhere | `pnpm exec tsc --noEmit --pretty false`, manual click-through | MEDIUM — new data shape; must route through existing service-layer authorization per `AGENTS.md` §6/§9, no direct client Prisma/local FS access. |
| `AIWORKDESK-006` | Attach `CloudFolderRef`s to a `ChatProject`; resolve in thread context | AI Input | Same files as `AIWORKDESK-003`/`005` | Attaching a folder to a Project makes its members available to every thread in that Project without per-thread re-selection | `pnpm exec tsc --noEmit --pretty false`, manual click-through | MEDIUM — depends on `AIWORKDESK-003`/`005`. |
| `AIWORKDESK-007` | Add "+ 邀請 AI" manual multi-participant control to the composer | AI Input | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Composer offers a multi-select of existing module agents; selected agents appear as attributed participants in that thread only; no `AgentBusTask` created or modified | `pnpm exec tsc --noEmit --pretty false`, manual click-through | MEDIUM — NANDA gate applies, see §6. Must not create/route/modify any `AgentBusTask`. |
| `AIWORKDESK-008` | Seed "AI 交流廣場" pinned Project as observation/manual-participation lounge | AI Input | Same as `AIWORKDESK-003` | Lounge Project is visible by default, not deletable, participants limited to allow-listed module agents, no autonomous scheduling or downstream write proposal exists anywhere in this slice | `pnpm exec tsc --noEmit --pretty false`, manual click-through | HIGH-adjacent — must not silently expand into `OWNEROS-006` scope. Stop condition: no write/proposal capability until `RPT-062 §3.5` Q3/Q4 are answered. See §3.3.3, §6. |
| `AIWORKDESK-009` | Add sidebar collapse control + persisted state | Layout | `src/components/layout/app-sidebar.tsx` | Chevron toggles `w-56` ⇄ icon-only rail; state persists across reload; icon-only mode keeps `title` tooltips for a11y | `pnpm exec tsc --noEmit --pretty false`, manual click-through, keyboard/tooltip check | LOW — client state only. |
| `AIWORKDESK-010` | Add ClickUp-style member card to sidebar footer | Layout | `src/components/layout/app-sidebar.tsx` | Footer shows avatar/display-name/workspace + presence dot above the (now singular, per `AIWORKDESK-001`) demo/formal badge | `pnpm exec tsc --noEmit --pretty false`, manual click-through | LOW — presentational; wire to existing auth/profile data only, no new backend call required for v1 (reuse whatever already renders Email/OWNER on `/settings`). |
| `AIWORKDESK-011` | Split `/settings` into 使用者設定 (`/settings`) and new 系統設定 (`/settings/system`) | Settings | `src/app/(dashboard)/settings/*`, `src/components/layout/app-sidebar.tsx` | `/settings` shows only profile/language/personal notification/personal AI-sharing default; new `/settings/system` route shows 成員/角色/AI 分享 policy/模組/人工設定/設定控制台; sidebar 系統 group has three items | `pnpm exec tsc --noEmit --pretty false`, `pnpm build`, manual click-through both routes | MEDIUM — route split; must preserve existing `requireUser()`/module-permission checks on every field that moves, per `AGENTS.md` §10. |
| `AIWORKDESK-012` | Add acceptance/QA checklist entries for this document | Acceptance / QA | `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md` | Checklist covers: single state badge, Quick Capture ✕, Project/folder merge (no 參考脈絡 dead end), 資料夾庫 tab, manual multi-AI invite governance boundary, AI 交流廣場 no-write boundary, sidebar collapse, settings split | Docs scan, `git diff --check` | LOW — docs-only. |

## 9. Verification Expectations

Documentation stage (this loop):

```bash
test -f docs/07_research-and-design/RES-028_ai-work-desktop-chat-project-multiagent-and-folder-library-convergence-research.md
rg "AIWORKDESK-0(0[1-9]|1[0-2])" docs/05_execution-plans/PLN-060_task-backlog.md tasks.md docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md
```

(The `rg` check will report no matches until a follow-up loop copies §8's rows into `PLN-060`/`PLN-061`/`tasks.md` per `AGENTS.md` §14 — this document intentionally does not hand-edit those large, actively-updated files itself; see the accompanying `ui-audit-and-fixes.md` addendum for the discoverable pointer.)

Runtime stages (each `AIWORKDESK-0xx` task, when picked up) must run `pnpm exec tsc --noEmit --pretty false` at minimum, and `pnpm build` for any task touching routing (`AIWORKDESK-011`) per `AGENTS.md` §13.

## 10. Owner Decisions Recorded (2026-08-24)

1. The sidebar must collapse and carry a ClickUp-style member card; 使用者設定 and 系統設定 must be separate pages — both confirmed as direct owner instructions, not proposals. `AIWORKDESK-009/010/011` are cleared to implement as scoped without further sign-off.
2. A visible AI-to-AI free-discussion area and manual multi-AI invite into a chat are wanted now — this is treated as a **partial** owner answer to `PLN-067` Stage 6 / `OWNEROS-006`'s blocked question 1 (visibility/participation model), narrowly scoped per §3.3.3. Full Stage 6 (scheduling, proposal-only downstream writes, retention/pause/cancel policy) remains gated on `RPT-062 §3.5` Q3 and Q4 — those questions are **not** answered by this conversation and still require explicit owner sign-off before `AIWORKDESK-008` may grow beyond an observation/manual-participation surface.
3. Cloud folders must not depend on the local machine — confirmed; `CloudFolder`/`CloudFolderRef` (§3.5.3) are server-authorized, device-independent by construction.

Open question for the owner, not resolved by this document: whether `/settings/system` should be visible to non-owner Team members with lower roles (MANAGER/EDITOR/VIEWER/GUEST per the existing role model shown live on `/settings`) or restricted to OWNER only. `AIWORKDESK-011` should not ship its route guard until this is answered — recommend OWNER-only as the safe default, matching `/admin`'s existing posture, unless the owner says otherwise.
