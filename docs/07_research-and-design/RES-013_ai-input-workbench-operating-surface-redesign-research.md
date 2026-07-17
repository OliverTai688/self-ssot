# AI Input Workbench (AI 工作台) Operating Surface Redesign Research

**Document ID:** `RES-013`  
**Last updated:** 2026-07-16  
**Status:** Research / design — no runtime implementation in this loop  
**Trigger:** User request to re-evaluate the design and purpose of the AI Workbench (`AI 工作台` / Source Workflow Console) based on existing research documents (`RES-002`, `RES-006`, `RES-007`, `RES-011`, `RES-012`).

---

## 1. Purpose & Core Proposition

The **AI 工作台 (AI Workbench / Source Workflow Console)** is the primary human-in-the-loop (HITL) operating cockpit for incoming data stream triage, pipeline observation, and write authorization within Personal OS. 

As currently implemented in `ai-input-client.tsx`, the workbench is a read-only table index of mock workflow runs, falling back to a static "Readiness Contract" when switched to Formal Mode. To satisfy the mature SaaS/OS operating surface standard (`RES-002`), it must transition from a passive status board to an active, dense workspace where the owner can:
1. **Review & Dispatch:** Verify, modify, and authorize incoming AI-generated triage proposals, data extractions, and downstream write-intents (`InboxItem`, `NormalizedRecordProposal`, `ActionIntent`).
2. **Observe Agent Coworking:** Drill down into active or historic ingestion runs (`AIWorkflowRun`) to inspect the turn-by-turn `AIAnalysisConversation` between the Ingestion Agent and System Intelligence.
3. **Control Intake Syncs:** Monitor external source connector health (`SourceConnection`) and trigger manual syncs or drill into connection settings drawers.
4. **Audit Execution Logs:** Search and trace sync events, agent reasoning cycles, validation exceptions, and human approval events (`AnalysisEvent`).

---

## 2. Gaps Audit vs. SaaS/OS Maturity Standard

By comparing the current `/ai-input` Workbench tab (and its five sub-tabs: *今日 Workflow, 需要確認, 來源環境, 整理結果, 工作紀錄*) against `RES-002` (SaaS/OS Maturity) and `RES-011` (Event Model), we identify several structural and product gaps:

| Tab in Current UI | Identified Overlaps & Gaps | Target Design Mapping (`RES-002` Standard) |
|---|---|---|
| **今日 Workflow** | Displays a list of runs, but does not provide drill-down detail drawers to inspect the underlying agent logic or conversations. | **Agent Workspace (執行狀態與對話)**: Allows clicking a run to view the `AIAnalysisConversation` drawer. |
| **需要確認** | Overlaps heavily with "整理結果". Shows raw text cards rather than structured, actionable proposals that can be edited and approved. | **Triage Queue (提案審查與派發)**: Primary workspace. Master-Detail view of uncommitted proposals with quick actions. |
| **來源環境** | Displays a static list of sync modes. Conceptually duplicates the `同步設定` tab and does not show active connection health or trigger manual syncs. | **Source Status (來源狀態矩陣)**: Actionable matrix of connections with status badges, manual trigger triggers, and links to `RES-012` settings drawers. |
| **整理結果** | Redundant. Ingested items are either *Triage Proposals* (needing confirmation) or *Source Assets* (stored in the libraries). | **Resource Index / Libraries**: Restructured into unified `檔案庫` and `圖片庫` subpages; not kept as a separate workbench tab. |
| **工作紀錄** | Displays static logs. Does not tie to the append-only `AnalysisEvent` / `DBS-006` schemas. | **Records & Audit (審計日誌)**: Filterable operational log of all syncs, decisions, and system alerts. |

---

## 3. Redesigned Information Architecture (IA)

To resolve these overlaps, the Workbench subpages are consolidated into **four dense, operational workspaces** that map cleanly to the SaaS/OS role boundaries:

```text
[AI 工作台 (Source Workflow Console)]
  ├─ Tab 1: 待審提案 (Triage Queue) ───────────> [Operation / HITL]
  │    └─ Master-Detail panel to review and dispatch InboxItems & WriteIntents
  ├─ Tab 2: 執行狀態 (Workflow Runs) ─────────> [Agent / Observability]
  │    └─ Ingestion pipeline monitor. Click to open Agent Reasoning Transcript Drawer
  ├─ Tab 3: 來源狀態 (Source Connections) ─────> [Resource / Sync Control]
  │    └─ Matrix of connected feeds. Sync Now button + open Settings Drawer
  └─ Tab 4: 審計日誌 (Records & Audit) ─────────> [Records / Compliance]
       └─ Trace log for syncs, approvals, rejections, and system errors
```

---

## 4. Tab-by-Tab Detailed Design

### 4.1 Tab 1: 待審提案 (Triage Queue)

This is the default view. It is structured as a **Master-Detail split screen** or a list with detail panels, optimizing the operator's throughput.

```
+------------------------------------+---------------------------------------+
|  待審提案 (3)                      | 提案詳情: [LINE 核心幹部群]            |
+------------------------------------+---------------------------------------+
| [LINE 商會] 任務起草 (BNI演講)      | 來源批次: #batch-9812                 |
|   - BNI 簡報起草 / 延期 3 天        | 擷取時間: 2026-07-16 10:15            |
|                                    | 擷取內文: "BNI簡報請Allan在週五前..." |
| [RSS 教育] 研究存檔 (AI治理)        | +-----------------------------------+ |
|   - 新加坡AI監管框架草案 / 摘要    | | 建議模組: [工作 (Work)]             |
|                                    | | 優先等級: [中 (Medium)]            |
| [Drive 專案] 文件摘要 (設計變更)   | | 派發標題: [BNI 簡報設計與起草]     |
|   - 7/16 會議紀錄變更              | | 到期時間: [2026-07-18]             |
|                                    | +-----------------------------------+ |
|                                    | [ 駁回提案 ]  [ 編輯 ]  [ 同意寫入 ]   |
+------------------------------------+---------------------------------------+
```

- **Triage Proposals:** Renders `AITriageProposal` data containing target module suggestions (e.g. Work, Research), urgency levels, and core title summaries.
- **Write-Intents:** Renders specific module creation templates (`ModuleWriteIntent`).
- **Interactive Actions:**
  - **Approve (同意寫入):** Gated by `requireUser()` and service authorization check. Triggers writing to the destination module (e.g., creating a Prisma record in Work or Research) and logs an approval event.
  - **Reject (駁回提案):** Discards the proposal and logs a rejection event (which can be fed back to improve the ingestion agent's settings).
  - **Edit (編輯):** Allows inline editing of module fields (e.g. changing default target module, fixing date mapping) before final confirmation.

---

### 4.2 Tab 2: 執行狀態 (Workflow Runs)

This tab displays active and historic `AIWorkflowRun` sessions, giving the owner insight into what the agents are doing behind the scenes.

- **Run Index Table:** Columns include: Run ID, Connection Name, Sync Mode (Scheduled/Manual), Run Status (Running, Success, Exception), Step Progress, Start Time, and Duration.
- **Agent Reasoning Transcript Drawer:** Clicking on a run row slides out a drawer showing the turn-by-turn `AIAnalysisConversation` between the Ingestion Agent (`IngestionAgent` / `source_understanding_agent`) and the System Intelligence (`personal_os_reasoning_agent`).

```
[代理人思考歷程: LINE 商會核心幹部群 - Run #1209]
========================================================================
[10:15:02] [◯◯ Ingestion Agent]
觀測到 BNI 聊天室有 3 筆未讀對話。
內文: "Allan 週五前請交簡報，另外週四晚上要跟 Cathy 對稿。"
初步判斷: 包含兩筆任務性承諾。
------------------------------------------------------------------------
[10:15:05] [◯ System Intelligence]
分析實體:
1. 任務：交簡報。主責人：Allan。期限：週五 (2026-07-17)。
2. 任務：對稿。關係人：Cathy。時間：週四晚上 (2026-07-16)。
挑戰評估: 週四晚上的會議與既有日曆中的「Chamber核心小組會」衝突。
建議處理: 起草任務「BNI 簡報設計」，並標記時間衝突警告於 Triage 提案中。
------------------------------------------------------------------------
[10:15:08] [◯◯ Ingestion Agent]
同意建議。已封裝為 triage 提案 #triage-451，發送至 AI 工作台待確認。
========================================================================
```

---

### 4.3 Tab 3: 來源狀態 (Source Connections)

Provides an actionable summary of connected external services, linking to connection setups and manual triggers.

- **Grid/Table Layout:**
  - **Connection Name:** (e.g. LINE 商會核心幹部群, Drive 專案資料夾).
  - **Health Indicator:** green (Connected/Active), yellow (API Token Expiring), red (Auth Failed/Disconnected), grey (Inactive/Demo).
  - **Last Sync Timestamp:** showing when the feed was last queried.
  - **Sync Trigger (立即同步):** Button to manually invoke external scraping. Runs in the background and spawns a new `AIWorkflowRun`.
  - **Configure Button (設定):** Opens the `SettingsDrawer` (defined in `RES-012`) to manage custom prompts, routing scopes, schedules, and policies.

---

### 4.4 Tab 4: 審計日誌 (Records & Audit)

Displays append-only operational events for governance, tracing, and debugging.

- **Auditable Events:**
  - `ai-input.source.sync_triggered` (Who triggered the sync, how many raw items found).
  - `ai-input.proposal.created` (Proposal ID generated, nodes executed).
  - `ai-input.proposal.approved` (Approved by owner, data committed to Work/Research).
  - `ai-input.proposal.rejected` (Rejected by owner).
  - `ai-input.connector.auth_failed` (Authentication token expired for RSS/Drive).
- **Filtering Options:** Filter by Event Level (Info, Warning, Error), Connection Name, or Target Module.

---

## 5. BFF Contracts & Persistence Model

The Workbench operates on a series of query and mutation routes. Gate real data reads and mutations behind `requireUser()` and service-layer authorization to protect private context.

### 5.1 Data Contracts (DTOs)

```typescript
export interface AITriageProposalDTO {
  id: string;
  sourceConnectionId: string;
  sourceConnectionName: string;
  sourceBatchIds: string[];
  rawContentSnippet: string;
  triageType: "task" | "research" | "crm" | "finance" | "anomaly" | "ignore";
  suggestedModule: "work" | "research" | "chamber" | "life" | "finance" | "company";
  suggestedTitle: string;
  suggestedDetails: Record<string, any>; // e.g. dueDate, priority, BNI client name
  confidenceScore: number;
  reasoningNotes: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export interface AIWorkflowRunDTO {
  id: string;
  sourceConnectionId: string;
  sourceConnectionName: string;
  triggerType: "manual" | "scheduled" | "source_event";
  status: "idle" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  stepProgress: string; // e.g. "2/4 Nodes Completed"
  conversationTurns: AIAnalysisTurn[];
}

export interface AIAnalysisTurn {
  role: "ingestion_agent" | "system_intelligence";
  timestamp: Date;
  message: string;
  turnKind: "observation" | "proposal" | "critique" | "consensus";
}
```

### 5.2 BFF Action Handlers

```typescript
// Queries
export async function getPendingTriageProposals(): Promise<AITriageProposalDTO[]>;
export async function getWorkflowRuns(limit?: number): Promise<AIWorkflowRunDTO[]>;
export async function getAuditLogs(filters?: AuditLogFilters): Promise<AnalysisEventDTO[]>;

// Mutations (gated by requireUser() and service authz)
export async function approveTriageProposal(proposalId: string, overrides?: Partial<AITriageProposalDTO>): Promise<{ success: boolean; targetRecordId?: string }>;
export async function rejectTriageProposal(proposalId: string): Promise<{ success: boolean }>;
export async function triggerManualSync(sourceConnectionId: string): Promise<{ success: boolean; workflowRunId: string }>;
```

---

## 6. NANDA Agent Alignment (`ARC-028`)

- **Affected Agent:** `IngestionAgent` (Ingestion Coworking Loop).
- **Core Capability:** `triage-queue-dispatching-and-hitl` (allows the agent to bundle raw items, draft proposals, and queue them for human approval).
- **Security Boundary:** Gated by `externalRegisterable: false` and `requiresHumanApproval: true`. The agent can never perform direct module database writes without human clearance in the triage queue.
- **Observability:** Every reasoning step in the thinking node pipeline is logged to the `AIWorkflowStep` table and exposed as an `AIAnalysisTurn` DTO.

---

## 7. Executable Backlog & Tasks

Following the Research-to-Task gate, the workbench redesign is mapped to concrete tasks in the backlog:

| Task ID | Title | Scope | Files Affected | Verification |
|---|---|---|---|---|
| `AIINPUT-WORK-001` | Add `AITriageProposal` and `AIWorkflowRun` data contracts | Add TypeScript DTO definitions for proposals, runs, and conversation turns. | `src/types/ingestion.ts` | Type check compilation. |
| `AIINPUT-WORK-002` | Refactor Workbench UI Sub-tabs | Reorganize tabs to: 待審提案, 執行狀態, 來源狀態, 審計日誌. Implement mock list states. | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Click through navigation, mock state inspection. |
| `AIINPUT-WORK-003` | Implement Triage Proposal Detail Panel & Actions | Build the Master-Detail panel in "待審提案" tab with Approve/Reject/Edit action handlers. | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Manual confirmation of editing and mock approval. |
| `AIINPUT-WORK-004` | Implement Agent Reasoning Transcript Drawer | Build the side drawer on "執行狀態" page to display the turn-by-turn coworking dialogue. | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Click run row -> drawer slides open -> text displays. |
| `AIINPUT-WORK-005` | Build manual sync trigger mechanism | Connect "立即同步" button on Tab 3 to background mock run initialization. | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Click sync button -> new run row added to Tab 2 as running. |
