# AI Input Source Settings and Boundaries Operating Surface Redesign Research

**Document ID:** `RES-012`  
**Last updated:** 2026-07-16  
**Status:** Research / design — no runtime implementation in this document  
**Trigger:** Owner-directed roadmap alignment on `/ai-input` settings cockpit and upcoming `DATTR-024` real-data boundaries.

---

## 1. Purpose

The current AI Input settings subpage (`同步設定` inside `/ai-input`, introduced in `DATTR-021` and `DATTR-022`) displays a flat, read-only overview table of external source connectors and a readiness contract panel. While this serves as a good read DTO presentation for launch level verification, it lacks the interactive settings and boundaries cockpit required by a mature SaaS/OS operating surface (`RES-002`).

Under the new event-driven operating model (`RES-011` and `RES-007`), the owner needs granular control over **how** each source connection enters, is processed by, and interacts with the Personal OS. Specifically:
1. **Sync vs. Analysis Scheduling:** The owner must be able to configure separate trigger modes (manual vs. scheduled) and schedules (interval/cron) for sync (external fetching, gated by `AUT-007` security controls) and analysis (internal AI reasoning, independent of external polling).
2. **AI Ingestion Node Customization:** The owner must be able to reorder, enable/disable, and specify custom instructions (prompts) for specific `SourceThinkingNode` enums (e.g. `link_existing_context`, `detect_risk`) on a per-source basis.
3. **Data Routing and Target Scoping:** The owner must define default target modules (e.g. Work, Research, CRM) and write authorization boundaries for each source's output.
4. **Risk Policies & Approvals:** The owner must specify risk levels, required human approval gates for generated `ActionIntent` types, and toggle morning brief digest inclusion.
5. **Storage & Retention Policies:** The owner must set data retention limits (e.g. auto-delete raw items after 30 days) and PII masking rules.

This document audits the current settings subpage against these requirements, designs the interactive settings cockpit layout, defines the underlying data structures and BFF contracts, and converts the remaining gaps into executable backlog rows.

---

## 2. Source Basis

Local documentation and source code reviewed:
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md` — SaaS/OS operating-surface maturity standard covering resource indexes, settings/boundaries, and real-data progression.
- `docs/07_research-and-design/RES-007_source-triggered-thinking-node-pipeline-and-action-fanout-research.md` — defines `SourceBatch`, `SourceProcessingPolicy` (§12.7), and `SourceThinkingNode` (§8) type proposals and triggering rules.
- `docs/07_research-and-design/RES-011_human-ai-event-operating-model-research.md` — defines the event-driven operating model (`Resource`, `ResourceVersion`, `AnalysisEvent`) and how it aggregates source data.
- `docs/02_architecture-and-rules/ARC-008_ai-source-workflow-layer.md` — defines the workflow run, step, and write-intent boundary.
- `docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md` — defines `SourceConnection` entity and its scope settings.
- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md` — polling/webhook runtime approval gate.
- `src/app/(dashboard)/ai-input/ai-input-client.tsx` — current client UI implementation for `同步設定` tab.

---

## 3. Settings Operating Surface Gaps

| Capability/Component | Current State in `/ai-input/` | Mature Settings Surface Target (`RES-002`) | Identified Gap |
|---|---|---|---|
| **Interaction Model** | Read-only matrix showing status/mode. No edit triggers or selection paths. | Selectable rows, slide-out drawer, or detail view panel for configuring each source. | The settings page is a static display with no interactive configuration forms or buttons. |
| **Sync & Analysis Configuration** | Flat text description of sync cadence (e.g. `每日 08:30`, `手動同步`). | Interactive selection of syncMode (`manual` / `scheduled`), syncInterval input, and active toggle. | Policies are hardcoded in the mock connectors list and cannot be customized by the owner. |
| **Thinking Node Editor** | Absent. Nodes do not exist in client state or views. | Interactive list of thinking nodes with reordering handles, status toggles, and customized instruction prompt textareas. | No interface exists to customize agent thinking processes per source. |
| **Data Routing & Scoping** | Text display of `defaultModule` (e.g. `商會`, `工作`). | Dropdown selection of default module mapping and allowed target module checkboxes. | Lack of validation boundary controls for writing proposed data to downstream modules. |
| **Risk & Approval Interruption** | Displays a static risk level (`高`/`中`/`低`). | Risk categorization select, automated execution rules, and morning brief reporting toggle. | Human-in-the-loop validation levels cannot be configured per connection. |
| **Storage & Retention** | Absent. | Selection of data preservation limits and PII masking configurations. | No parameters exist to control data lifespan or redaction scopes. |

---

## 4. Redesigned Source Settings Architecture

To align the `同步設定` subpage with the `RES-002` SaaS/OS maturity standard, we transition it from a static summary panel to a **Master-Detail Settings Surface**.

### 4.1 Master View: Source Connections Index
The primary view of `同步設定` remains the **來源輸入矩陣 (Source Input Matrix)** table and the **同步狀態總覽 (Sync Status Summary)** cards. However, each row in the matrix becomes a clickable element that triggers the detail view.

```text
[同步設定主頁面]
  ├─ 狀態總覽卡片 (已串接: 0 / 待設定: 7 / 需確認: 8)
  ├─ 來源輸入矩陣 (表格)
  │    ├─ LINE 商會核心幹部群 ──> [點擊開啟詳細設定]
  │    ├─ Google Drive 研究資料夾 ──> [點擊開啟詳細設定]
  │    └─ RSS 教育科技 ──> [點擊開啟詳細設定]
  └─ 正式資料 BFF Readiness 狀態面板 (僅 formal mode)
```

### 4.2 Detail View: Connection Settings Drawer
Clicking on a source connection opens a slide-out drawer (`SettingsDrawer`) displaying the full suite of configuration panels for that specific source connection. The drawer is organized into five configuration tabs:

```text
[詳細設定抽屜: LINE 商會核心幹部群]
  ├─ Tab 1: 同步與分析 (Sync & Analysis)
  ├─ Tab 2: 思考節點配置 (Thinking Nodes)
  ├─ Tab 3: 資料路由與模組 (Data Routing)
  ├─ Tab 4: 風險與審批 (Risk & Approval)
  └─ Tab 5: 治理與隱私 (Retention & PII)
```

#### 4.2.1 Tab 1: 同步與分析 (Sync & Analysis)
- **同步模式 (Sync Mode):** Radio options for `手動同步 (Manual Only)` vs. `排程同步 (Manual & Scheduled)`.
- **同步排程 (Sync Schedule):** Custom interval selector (Hourly, Daily, Custom Cron String) and timezone mapping.
- **分析模式 (Analysis Mode):** Radio options for `手動分析 (Manual Only)` vs. `排程分析 (Manual & Scheduled)`.
- **分析排程 (Analysis Schedule):** Cron/interval configurations for running AI analysis over accumulated batches, independent of sync.
- **僅在有新資料時分析 (Analyze Only When Pending):** Toggle to prevent wasteful scheduled analysis runs.

#### 4.2.2 Tab 2: 思考節點配置 (Thinking Nodes)
Allows customizing the conversational pipeline agents (`SourceUnderstandingAgent` ↔ `PersonalOSReasoningAgent`) reasoning nodes:
- **節點清單 (Nodes List):** Rendered as a drag-and-drop sortable list of active `SourceThinkingNode` types.
- **節點控制 (Node Toggle):** Enable/disable switch per node.
- **客製化指令 (Custom Instruction):** Textarea allowing the owner to input specific prompt overrides.
  - *Example:* For the `challenge_interpretation` node, the owner might specify: *"特別挑戰所有涉及金額與承諾期限的對話，必須精確核實。" (Challenge all dialogue touching amounts or commitment deadlines; verify precisely.)*

#### 4.2.3 Tab 3: 資料路由與模組 (Data Routing)
- **預設發布模組 (Default Module):** Dropdown to select the primary target module (Work, Research, Chamber/CRM, Life, Finance, Company).
- **授權寫入範圍 (Allowed Modules):** Multi-select checkboxes defining the limits of what this source can suggest writes to.
  - *Example:* A low-trust public RSS feed connection may be restricted to only writing to the `Research` module.

#### 4.2.4 Tab 4: 風險與審批 (Risk & Approval)
- **風險等級 (Risk Classification):** Select dropdown (`高 (High)` / `中 (Medium)` / `低 (Low)`).
- **行動提案審批等級 (Approval Level):**
  - `所有提案均需確認 (Always Require Approval):` Pauses the pipeline at `ActionIntent` stage for human verification.
  - `低風險提案自動執行 (Auto-execute Low Risk):` Allows low-risk actions to commit automatically, pausing only high-risk writes.
  - `完全自動化 (Full Automation):` Highly restricted, only allowed for verified low-risk internal sources.
- **早安簡報設定 (Morning Brief Integration):** Toggle to report anomalies, failures, or critical findings into the owner's daily brief.

#### 4.2.5 Tab 5: 治理與隱私 (Retention & PII)
- **保留期限 (Retention Period):** Options for raw source content deletion (`30 天`, `90 天`, `永久保存`).
- **去識別化設定 (PII Masking):** Toggle to automatically redact names, phone numbers, and email addresses from raw data before passing to analysis.
- **上傳路徑 (Upload Directory):** Sets default target folder inside `檔案庫` or `圖片庫` for manual file uploads associated with this source.

---

## 5. UI/UX Interface Design

Following the aesthetic rules of Personal OS, the interface uses vanilla CSS classes with modern typography and dense, operational tabular layouts.

### 5.1 Drawer UI Layout
The Settings Drawer opens on the right side of the viewport, squeezing the main matrix view slightly to preserve context:

```
+------------------------------------+--------------------------+
|  AI Input > 同步設定                 | LINE 商會核心幹部群      |
+------------------------------------+ [連線中]                  |
| [狀態總覽]                         | +----------------------+ |
| 已串接: 0  待設定: 7  需確認: 8    | | 同步 | 節點 | 路由 | 審批 | |
|                                    | +----------------------+ |
| [來源輸入矩陣]                     |                          |
| > LINE 商會核心幹部群 (Selected)    | [X] 啟用排程同步         |
|   Google Drive 專案資料夾           | 同步頻率: 每日 08:30     |
|   RSS 教育科技                     |                          |
|                                    | [X] 啟用排程分析         |
| [正式資料 BFF Readiness]           | 分析頻率: 每日 09:00     |
| ...                                |                          |
|                                    | [ 儲存設定 ]  [ 關閉 ]   |
+------------------------------------+--------------------------+
```

### 5.2 Drag-and-Drop Node Customization UI
Within the "Thinking Nodes" tab, nodes are presented as interactive blocks with a grab handle `::`:

```
:: [V] 1. 來源脈絡判斷 (source_context) ------------------- [*]
:: [V] 2. 關係人與實體抽取 (extract_entity) --------------- [*]
   | 指令: 優先抽取 BNI 會員名稱與所屬產業。                    |
:: [ ] 3. 挑戰語意解讀 (challenge_interpretation) -------- [*]
:: [V] 4. 行動方案起草 (draft_inbox_items) ---------------- [*]
```

---

## 6. BFF & Data API Contract

To support the interactive settings surface, the BFF contract (`src/app/(dashboard)/ai-input/actions.ts` or route handlers) must be extended with mock/formal endpoint definitions.

```typescript
// src/types/ai-input-settings.ts

export type SourceSyncMode = "manual_only" | "manual_and_scheduled";
export type SourceAnalysisMode = "manual_only" | "manual_and_scheduled";
export type SourceRiskClassification = "high" | "medium" | "low";
export type SourceApprovalLevel = "always_require" | "auto_execute_low_risk" | "full_automation";

export interface SourceProcessingPolicyDTO {
  sourceConnectionId: string;
  syncMode: SourceSyncMode;
  syncSchedule: string | null; // Cron expression
  syncEnabled: boolean;
  analysisMode: SourceAnalysisMode;
  analysisSchedule: string | null; // Cron expression
  analysisEnabled: boolean;
  analyzeOnlyWhenPending: boolean;
  defaultModule: string;
  allowedTargetModules: string[];
  riskClassification: SourceRiskClassification;
  approvalLevel: SourceApprovalLevel;
  includeInMorningBrief: boolean;
  retentionDays: number; // 0 for infinite
  piiMaskingEnabled: boolean;
}

export interface SourceThinkingNodeDTO {
  id: string;
  nodeType: string;
  order: number;
  enabled: boolean;
  instruction: string | null;
}

// BFF Server Actions / Endpoints
export interface AISourceSettingsBFFContract {
  // Get settings policies
  getSourceProcessingPolicy(sourceConnectionId: string): Promise<SourceProcessingPolicyDTO>;
  
  // Save settings policies
  updateSourceProcessingPolicy(
    sourceConnectionId: string, 
    policy: Partial<SourceProcessingPolicyDTO>
  ): Promise<{ success: boolean; data?: SourceProcessingPolicyDTO }>;

  // Get active nodes for customization
  listSourceThinkingNodes(sourceConnectionId: string): Promise<SourceThinkingNodeDTO[]>;

  // Save customized nodes list and instructions
  updateSourceThinkingNodes(
    sourceConnectionId: string,
    nodes: SourceThinkingNodeDTO[]
  ): Promise<{ success: boolean; data?: SourceThinkingNodeDTO[] }>;
}
```

---

## 7. NANDA Agent Protocol Gate (`ARC-028`)

- **Affected Agent:** `IngestionAgent` (governs raw input triage and proposal workflows).
- **AgentFacts-Lite Manifest Impact:**
  - Capability additions:
    - `source-processing-policy-configuration` (Allows managing synchronization triggers, scopes, and target module permissions; `riskLevel: LOW`, `requiresHumanApproval: false`).
    - `thinking-node-override-management` (Allows configuring specific prompt sequences and instructions for raw ingestion reasoning; `riskLevel: MEDIUM`, `requiresHumanApproval: true`).
- **Trust Boundary & Visibility:** Remains `externalRegisterable: false`, restricted to internal dashboard settings. Configuration mutations require `requireUser()` session validation.
- **Observability:** Actions modifying policies or node order must write append-only audit records to `DBS-006` (`launch-operator-action-registry`).

---

## 8. Executable Backlog

To implement this settings operating surface, we split the work into five focused tasks:

| Task ID | Title | Scope | Files likely affected | Acceptance Criteria | Verification | Risks / Stop Rules |
|---|---|---|---|---|---|---|
| `AIINPUT-SET-001` | Define configuration types & static mock schemas | Add `SourceProcessingPolicyDTO` and `SourceThinkingNodeDTO` types to `src/types/` and write static mock data fixtures | `src/types/ai-input-settings.ts`, `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Types build cleanly, MOCK connectors array is extended to mock policy fields | `pnpm exec tsc --noEmit --pretty false` | None — type-only, no database impact. |
| `AIINPUT-SET-002` | Implement Settings Drawer and Tabs Layout | Create `SettingsDrawer` client component inside `/ai-input`, trigger it on click of rows in the 來源輸入矩陣 table | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Clicking a row slides open the drawer on the right side. Tabs switch between Sync, Nodes, Routing, Approvals, and Governance views. | Manual browser click-through validation | Maintain spacing and mobile-viewport responsiveness. |
| `AIINPUT-SET-003` | Build drag-and-drop Thinking Node configuration UI | Implement custom ordering UI (via simple handles or move up/down buttons) and textareas for instructions in the Nodes tab | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | User can reorder nodes, toggle node status switches, and edit customized instruction text | Manual verification of node reordering and custom instruction text binding | Keep code simple; do not pull in heavy external drag-and-drop libraries unless necessary. |
| `AIINPUT-SET-004` | Add mock-save actions and state handlers | Implement client-side save handlers that update local `connectors` state array on confirm and display success toasts | `src/app/(dashboard)/ai-input/ai-input-client.tsx` | Editing policies and nodes updates the matrix view locally. Refreshing resets state (as mock is not persisted). | Manual edit → save → verify table updates instantly | Clearly display warning "Mock settings are not persisted" to preserve mode transparency. |
| `AIINPUT-SET-005` | Extend `IngestionAgent` AgentFacts-lite registry | Register `source-processing-policy-configuration` and `thinking-node-override-management` capabilities in manifest | `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` | Manifest aggregates new capabilities. Stays `externalRegisterable: false`. | `pnpm agent:registry:check` | Stays non-runtime governance. |

---

## 9. Verification Plan

### Automated Checks
- **TypeScript Compilation:** Verify types compilation across files.
```bash
pnpm exec tsc --noEmit --pretty false
```
- **Registry Compliance:** Ensure agent facts updates match the registry checker.
```bash
pnpm agent:registry:check
```
