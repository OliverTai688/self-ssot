# Agent Workflow 系統需求書

**文件編號：** I  
**文件版本：** v1.0  
**最後更新：** 2026-05-20  
**參考架構：** MIT NANDA（Networked Agents and Decentralized AI）

---

## 目錄

1. [背景與動機](#1-背景與動機)
2. [MIT NANDA 架構精要](#2-mit-nanda-架構精要)
3. [系統設計原則](#3-系統設計原則)
4. [模組 Agent 角色定義](#4-模組-agent-角色定義)
5. [Agent 溝通協議](#5-agent-溝通協議)
6. [Workflow 頁面需求](#6-workflow-頁面需求)
7. [輸入流向設計](#7-輸入流向設計)
8. [資料結構設計](#8-資料結構設計)
9. [UI/UX 規格](#9-uiux-規格)
10. [開發路線圖](#10-開發路線圖)

---

## 1. 背景與動機

### 1.1 現況問題

Personal OS 目前的 6 個模組（Work、Chamber、Company、Finance、Research、Life）各自獨立運作，資訊在模組間的流動依賴使用者手動複製貼上，造成：

- **認知負荷高**：使用者需記住哪些資訊要同步到哪個模組
- **脈絡斷裂**：一個會議紀錄可能同時涉及 Work（任務）、Chamber（CRM 聯繫人）、Finance（報價）三個模組，但無法自動關聯
- **輸入效率低**：自然語言輸入（AI Input）後，路由邏輯由使用者決定，無智能分發

### 1.2 目標願景

讓每個模組擁有自己的「思考能力」，模組之間能主動溝通、協商、移交任務，使用者只需在一個地方輸入，系統自動路由、分析、歸因並通知相關模組。

---

## 2. MIT NANDA 架構精要

NANDA（Networked Agents and Decentralized AI）是 MIT Media Lab Ramesh Raskar 教授帶領的研究計畫，目標是建立「AI 代理的網際網路基礎設施」。

### 2.1 核心概念

| 概念 | NANDA 定義 | 應用到本系統 |
|------|-----------|------------|
| **Agent** | 具有簽名身份、能力描述、可發現的自治程序 | 每個模組（Work、Finance 等）是一個 Agent |
| **AgentFacts** | Agent 的能力聲明（JSON-LD 格式） | 每個模組聲明自己能處理哪類資訊 |
| **Registry** | 去中心化的 Agent 發現索引 | Workflow 頁面的路由規則表 |
| **A2A Protocol** | Agent 之間的標準化訊息交換格式 | 模組間的 Event 物件格式 |
| **Orchestration** | 從 Registry 中動態發現合適 Agent，無硬編碼依賴 | Workflow Engine 根據規則動態路由 |
| **Audit Trail** | 所有 Agent 互動的不可竄改紀錄 | Workflow 執行歷史日誌 |

### 2.2 NANDA vs 傳統多 Agent 框架

NANDA 最重要的設計差異：**無中心化 Orchestrator**。每個 Agent 透過能力聲明主動「被發現」，而不是被中央控制器硬編碼指派任務。

本系統採用 NANDA 精神但簡化實作：以 **Workflow 規則引擎** 取代去中心化 Registry，保留「能力聲明 → 路由匹配 → Agent 協作」的核心流程。

---

## 3. 系統設計原則

### P1：能力聲明驅動路由

每個模組 Agent 聲明自己能接收哪些 `intent` 類型。輸入內容被分析為 intent 後，Workflow Engine 找到匹配的 Agent 並分發。

### P2：Agent 可主動觸發其他 Agent

Work Agent 建立任務後，可主動通知 Finance Agent「此任務有報價需求」。Agent 間溝通是平等的 peer-to-peer，不需要使用者介入。

### P3：使用者可見的 Workflow 控制層

所有 Agent 互動規則對使用者透明，並可透過 Workflow 頁面調整。使用者是「規則制定者」而非「訊息路由者」。

### P4：Audit Trail 優先

每一筆 Agent 間的訊息、每一個路由決策，都寫入不可刪除的事件日誌，使用者可回溯查閱。

---

## 4. 模組 Agent 角色定義

### 4.1 AgentFacts 能力聲明格式

```typescript
interface AgentFacts {
  agentId: string           // 唯一識別碼，如 "work-agent"
  displayName: string       // 顯示名稱，如 "工作管理"
  icon: string              // Lucide icon name
  color: string             // 模組顏色
  capabilities: Intent[]    // 能處理的 intent 清單
  triggers: Trigger[]       // 主動觸發其他 agent 的條件
  priority: number          // 當多個 agent 匹配同一 intent 時的優先權
}

type Intent =
  | "task.create"           // 建立任務
  | "task.update"           // 更新任務狀態
  | "contact.create"        // 建立聯繫人
  | "contact.update"        // 更新聯繫人資訊
  | "finance.record"        // 財務紀錄
  | "finance.invoice"       // 開立發票/報價
  | "research.note"         // 研究筆記
  | "research.source"       // 文獻來源
  | "event.log"             // 生活事件
  | "reminder.set"          // 設定提醒
  | "company.update"        // 公司資訊更新
  | "chamber.meeting"       // 商會會議記錄
```

### 4.2 各模組 Agent 能力聲明

**Work Agent**
```
capabilities: ["task.create", "task.update", "reminder.set"]
triggers:
  - 當 task 附帶金額 → 通知 Finance Agent (finance.record)
  - 當 task 涉及 contact → 通知 Chamber Agent (contact.update)
  - 當 task 有 deadline → 自動設定 reminder
```

**Chamber Agent（商會 CRM）**
```
capabilities: ["contact.create", "contact.update", "chamber.meeting"]
triggers:
  - 當新增聯繫人有公司資訊 → 通知 Company Agent (company.update)
  - 當會議記錄有任務事項 → 通知 Work Agent (task.create)
```

**Company Agent**
```
capabilities: ["company.update"]
triggers:
  - 當公司有財務往來記錄 → 通知 Finance Agent (finance.record)
```

**Finance Agent**
```
capabilities: ["finance.record", "finance.invoice"]
triggers:
  - 當月底有未結發票 → 通知 Work Agent (reminder.set)
```

**Research Agent**
```
capabilities: ["research.note", "research.source"]
triggers:
  - 當研究筆記有任務事項 → 通知 Work Agent (task.create)
```

**Life Agent**
```
capabilities: ["event.log", "reminder.set"]
triggers: []  // Life 為消費終點，不向其他模組觸發
```

---

## 5. Agent 溝通協議

### 5.1 AgentMessage 格式

```typescript
interface AgentMessage {
  id: string                    // UUID
  timestamp: string             // ISO 8601
  fromAgent: string             // 發送方 agentId
  toAgent: string               // 接收方 agentId
  intent: Intent                // 意圖類型
  payload: Record<string, any>  // 攜帶的資料
  status: "pending" | "accepted" | "rejected" | "completed"
  traceId: string               // 追蹤同一個 input 引發的所有 messages
  parentMessageId?: string      // 若為次級觸發，指向父 message
}
```

### 5.2 輸入到 Agent 路由流程

```
使用者輸入（AI Input）
        ↓
  Intent Classifier（AI 分析）
        ↓
  ┌─────────────────────────────┐
  │   Workflow Engine           │
  │   - 查詢各 Agent 能力聲明   │
  │   - 匹配 intent → agent(s) │
  │   - 生成 AgentMessage(s)   │
  └─────────────────────────────┘
        ↓
  分發至各 Agent（可同時觸發多個）
        ↓
  Agent 執行 → 寫入各模組資料
        ↓
  Agent Trigger 條件判斷
        ↓
  （若滿足條件）發送次級 AgentMessage 給其他 Agent
        ↓
  寫入 Audit Trail
```

### 5.3 衝突解決規則

當多個 Agent 都聲明能處理同一 intent 時：
1. 依照 `priority` 數值排序（數字越小優先）
2. 若 priority 相同，依 Workflow 規則中使用者設定的順序
3. 預設行為：所有匹配的 Agent 都收到訊息（廣播模式，可在 Workflow 中改為獨佔模式）

---

## 6. Workflow 頁面需求

### 6.1 頁面路徑

```
/dashboard/workflow
```

### 6.2 頁面功能區塊

#### A. Agent 狀態總覽（Agent Registry Panel）

顯示所有 6 個模組 Agent 的即時狀態卡片，每張卡片顯示：
- Agent 名稱、圖示、顏色
- 目前宣告的能力清單（可展開）
- 今日處理的訊息數量
- 最後活躍時間
- 啟用/停用開關

#### B. Workflow 規則編輯器（Rule Builder）

視覺化規則設定介面：
```
觸發條件（WHEN）：
  [Work Agent 建立任務] 且 [任務含有金額]

執行動作（THEN）：
  → 通知 [Finance Agent]，攜帶 [任務標題, 金額, 截止日]

設定（OPTIONS）：
  模式：[ 廣播 / 獨佔 ]
  延遲：[ 即時 / 5分鐘後 / 手動批准 ]
```

規則以卡片形式排列，可拖曳排序（影響執行優先權）。

#### C. 執行流視覺化（Flow Visualizer）

仿 NANDA 網絡拓撲圖：
- 節點（Node）：6 個 Agent，圓形圖示
- 邊（Edge）：有效的 Workflow 規則，帶箭頭連線
- 邊的粗細反映：該路由今日使用次數（越粗越常用）
- 點擊邊可查看對應規則與近期執行紀錄

技術方案：**React Flow**（或 Reactflow）

#### D. 事件日誌（Audit Trail）

時間軸格式，記錄所有 AgentMessage：
```
10:32  [AI Input] → Intent Classifier → work.task.create, finance.record
10:32  Work Agent  接收 "建立任務：與 Kevin 開會" ✓
10:32  Finance Agent 接收 "記錄支出：午餐費 300 元" ✓
10:32  Work Agent → Chamber Agent  "聯繫人：Kevin Chen 已存在，更新互動紀錄" ✓
```

支援：
- 依 Agent 篩選
- 依日期範圍篩選
- 依 traceId 展開完整呼叫鏈
- 匯出為 JSON/CSV

#### E. 手動觸發面板（Manual Dispatch）

測試用介面，讓使用者手動組裝一個 AgentMessage 並發送，用於除錯 Workflow 規則。

---

## 7. 輸入流向設計

### 7.1 AI Input 強化

現有的 AI Input（`/dashboard/ai-input`）需增加：

1. **Intent 標記顯示**：AI 分析結果顯示偵測到的 intent，讓使用者確認後再分發
2. **路由預覽**：顯示「此輸入將分發給：Work Agent、Finance Agent」
3. **手動覆蓋**：使用者可取消特定 Agent 的接收，或手動新增
4. **Trace 連結**：輸入提交後，顯示「查看 Workflow 執行紀錄」的連結

### 7.2 模組內部輸入

各模組頁面內的新增操作（如 Work 中「新增任務」）也會觸發 Workflow Engine，判斷是否需要通知其他 Agent。

---

## 8. 資料結構設計

### 8.1 新增資料表

```sql
-- Agent 能力聲明（靜態配置，初期以 JSON 檔存放）
-- 未來可移至 Supabase 以支援動態更新

-- Workflow 規則表
CREATE TABLE workflow_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  from_agent TEXT NOT NULL,          -- 觸發方 agentId（"*" 表示任意）
  intent TEXT NOT NULL,              -- 觸發的 intent
  conditions JSONB,                  -- 額外條件（如 payload.amount > 0）
  to_agent TEXT NOT NULL,            -- 目標 agentId
  target_intent TEXT NOT NULL,       -- 目標 intent
  payload_mapping JSONB,             -- 欄位映射規則
  mode TEXT DEFAULT 'broadcast',     -- broadcast | exclusive
  delay_seconds INTEGER DEFAULT 0,
  requires_approval BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 訊息日誌（Audit Trail）
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id UUID NOT NULL,
  parent_message_id UUID REFERENCES agent_messages(id),
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  intent TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',     -- pending | accepted | rejected | completed
  rule_id UUID REFERENCES workflow_rules(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Intent 分類結果快取
CREATE TABLE intent_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id UUID NOT NULL,
  raw_input TEXT NOT NULL,
  source TEXT NOT NULL,              -- ai-input | work | chamber | ...
  detected_intents JSONB,            -- [{intent, confidence, payload}]
  user_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.2 Agent 能力聲明 JSON 檔

```
src/config/agents.json
```

初期以靜態 JSON 存放，免除資料庫遷移複雜度，未來可改為 DB 動態管理。

---

## 9. UI/UX 規格

### 9.1 Workflow 頁面佈局

```
┌─────────────────────────────────────────────────────┐
│  Workflow                              [+ 新增規則]  │
├────────────────┬────────────────────────────────────┤
│                │                                    │
│  Agent 狀態    │   Flow Visualizer                  │
│  (左側面板)    │   (中央主區域 - React Flow 圖)      │
│                │                                    │
│  ○ Work        │        Work ──→ Finance            │
│  ○ Chamber     │         ↓          ↓               │
│  ○ Company     │       Chamber ──→ Company          │
│  ○ Finance     │                                    │
│  ○ Research    │                                    │
│  ○ Life        │                                    │
│                │                                    │
├────────────────┴────────────────────────────────────┤
│  事件日誌 (底部抽屜，可展開)                         │
│  10:32 [trace-abc] Work → Finance  finance.record ✓ │
└─────────────────────────────────────────────────────┘
```

### 9.2 互動設計

- **Flow Visualizer 互動**：
  - 懸停 Agent 節點：顯示今日訊息數量 tooltip
  - 點擊 Agent 節點：側邊欄展開該 Agent 的規則清單
  - 點擊連線：展開對應規則詳情，可直接編輯
  - 雙擊空白區：新增規則（打開 Rule Builder modal）

- **規則卡片**：
  - 拖曳排序（影響同一 intent 的執行優先權）
  - 切換啟用/停用
  - 右鍵選單：複製、編輯、刪除

- **Audit Trail**：
  - 即時更新（Supabase Realtime subscription）
  - 點擊 traceId badge 展開完整呼叫鏈（樹狀視圖）

### 9.3 設計風格

延續現有系統設計語言：
- 深色底（`bg-zinc-950`）
- 模組顏色識別（Work=藍、Chamber=綠、Finance=黃、Research=紫、Life=橙、Company=紅）
- Agent 節點顏色對應模組顏色
- 連線顏色：對應觸發方 Agent 顏色

---

## 10. 開發路線圖

### Phase 1：基礎設施（1-2 週）

- [ ] 定義 `AgentFacts` 靜態配置（`src/config/agents.json`）
- [ ] 建立 `workflow_rules` 和 `agent_messages` 資料表
- [ ] 實作 `WorkflowEngine` 核心邏輯（`src/lib/workflow/engine.ts`）
  - intent → agent 匹配
  - AgentMessage 生成與發送
  - 條件判斷
- [ ] 整合現有 AI Input 流程，加入 intent 分類步驟

### Phase 2：Workflow 頁面（2-3 週）

- [ ] `/dashboard/workflow` 頁面骨架
- [ ] Agent 狀態面板（左側）
- [ ] React Flow 視覺化圖（中央）
- [ ] 規則列表（卡片式，可拖曳）
- [ ] 事件日誌（底部，Realtime 更新）

### Phase 3：Rule Builder（1-2 週）

- [ ] 規則新增/編輯 Modal
- [ ] WHEN/THEN 視覺化表單
- [ ] Payload 映射設定
- [ ] 規則測試（Manual Dispatch 面板）

### Phase 4：模組整合（2-3 週）

- [ ] Work 模組：任務建立/更新時觸發 Workflow Engine
- [ ] Chamber 模組：聯繫人/會議記錄觸發
- [ ] Finance 模組：財務紀錄觸發
- [ ] Research 模組：筆記觸發
- [ ] AI Input 增強：intent 標記、路由預覽、手動覆蓋

### Phase 5：進階功能（未來）

- [ ] 條件分支（IF-THEN-ELSE）
- [ ] 延遲執行（Scheduled Messages）
- [ ] 人工批准流程（Requires Approval）
- [ ] Workflow 範本市場（匯入/匯出規則集）
- [ ] Agent 效能分析儀表板

---

## 附錄：核心檔案結構

```
src/
├── config/
│   └── agents.json                    # Agent 能力聲明靜態配置
├── lib/
│   └── workflow/
│       ├── engine.ts                  # WorkflowEngine 核心
│       ├── classifier.ts              # Intent 分類器（AI 呼叫）
│       ├── dispatcher.ts              # AgentMessage 分發邏輯
│       └── types.ts                   # 型別定義
├── app/(dashboard)/
│   └── workflow/
│       ├── page.tsx                   # Workflow 主頁面
│       ├── components/
│       │   ├── AgentRegistryPanel.tsx # 左側 Agent 狀態面板
│       │   ├── FlowVisualizer.tsx     # React Flow 視覺化
│       │   ├── RuleList.tsx           # 規則卡片列表
│       │   ├── RuleBuilder.tsx        # 規則新增/編輯 Modal
│       │   ├── AuditTrail.tsx         # 事件日誌
│       │   └── ManualDispatch.tsx     # 手動觸發測試面板
│       └── hooks/
│           ├── useAgentMessages.ts    # Realtime 訂閱
│           └── useWorkflowRules.ts    # 規則 CRUD
└── api/
    └── workflow/
        ├── dispatch/route.ts          # POST /api/workflow/dispatch
        ├── rules/route.ts             # GET/POST /api/workflow/rules
        └── messages/route.ts          # GET /api/workflow/messages
```

---

## 參考資料

- [MIT NANDA 官方網站](https://nanda.mit.edu/)
- [MIT NANDA GitHub](https://github.com/projnanda)
- arXiv 2507.14263 — Beyond DNS: Unlocking the Internet of AI Agents via the NANDA Index and Verified AgentFacts
- arXiv 2507.07901 — The Trust Fabric: Decentralized Interoperability and Economic Coordination for the Agentic Web
- arXiv 2508.03101 — Using the NANDA Index Architecture in Practice: An Enterprise Perspective
- [React Flow](https://reactflow.dev/) — Flow 視覺化函式庫
- [Google A2A Protocol](https://google.github.io/A2A/) — Agent-to-Agent 通訊協定
- [Anthropic MCP](https://modelcontextprotocol.io/) — Model Context Protocol
