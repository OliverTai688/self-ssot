# 工作管理模組 — AI-Native Project Memory 開發計劃

**文件版本：** v3.0  
**建立日期：** 2026-05-12  
**參考文件：** `A_ai_situation_prd.md` · `phase1_ai_native_plan.md` · `phase1_frontend_plan.md`

---

## 目錄

0. [全域 Layout 重設計（AI 右側面板）](#0-全域-layout-重設計ai-右側面板)
1. [Codebase 審查報告](#1-codebase-審查報告)
2. [缺口分析（Gap Analysis）](#2-缺口分析gap-analysis)
3. [模組定位：AI-Native Project Memory](#3-模組定位ai-native-project-memory)
4. [優化後的檔案架構](#4-優化後的檔案架構)
5. [型別設計](#5-型別設計)
6. [Mock 資料規格](#6-mock-資料規格)
7. [頁面設計](#7-頁面設計)
8. [元件清單](#8-元件清單)
9. [實作順序](#9-實作順序)
10. [完成標準](#10-完成標準)

---

## 0. 全域 Layout 重設計（AI 右側面板）

> **設計決策：** 這不只是工作模組的改動，而是整個 Dashboard 的 Layout 升級。  
> AI 右側面板是跨頁面持久存在的，不屬於任何單一模組。

### 0.1 新 Layout 結構

```
┌── AppSidebar ──┬────── Main Content (flex-1) ──────┬── AI Panel ──┐
│   w-56         │  AppHeader                         │  w-80        │
│                │  ─────────────────────────────────  │  fixed       │
│  Navigation    │  <page content scrollable>         │  persistent  │
│                │                                    │  cross-page  │
└────────────────┴────────────────────────────────────┴──────────────┘
```

現有 `(dashboard)/layout.tsx`：
```tsx
// 現有（單欄）
<div className="flex h-screen overflow-hidden">
  <AppSidebar />
  <div className="flex flex-1 flex-col overflow-hidden">
    {children}
  </div>
</div>

// 新增（加入右側 AI Panel）
<div className="flex h-screen overflow-hidden">
  <AppSidebar />
  <div className="flex flex-1 flex-col overflow-hidden">
    {children}
  </div>
  <AiContextPanel />   {/* 新增：右側固定面板 */}
</div>
```

### 0.2 AI 右側面板（`AiContextPanel`）

```
┌──────────────────────────────┐
│ ✦ AI 助理          [收合 ×] │  ← 可收合（收合後只剩 icon strip）
├──────────────────────────────┤
│ 脈絡感知：                   │
│  ● 工作 › Lisa Q2 Dashboard  │  ← 自動偵測目前所在頁面
│  ● 任務 Tab                  │
├──────────────────────────────┤
│ [對話紀錄區]                  │
│                              │
│  AI: 這個專案目前有一個阻礙   │
│      因素：色彩對比度問題尚   │
│      未解決。建議今天優先處理。│
│                              │
│  你: 有哪些任務待辦？         │
│                              │
│  AI: 目前有 4 個待辦任務：   │
│      ① 修改色彩對比度 [跳轉] │  ← 可點擊跳轉
│      ② 確認輸出格式 [跳轉]   │
│      ...                     │
├──────────────────────────────┤
│ [輸入框]           [送出 ↑] │
└──────────────────────────────┘
```

### 0.3 AI 面板的跨頁面行為

| 使用者在哪 | AI 面板的脈絡感知 | 可以跳轉到 |
|-----------|----------------|-----------|
| `/dashboard` | 今日整體概覽 | 各模組頁面、specific project |
| `/work` | 工作模組整體狀態 | 特定專案詳情 |
| `/work/[id]` 脈搏 | 此專案 AI Pulse + tasks | 同專案的工作/客戶 Tab |
| `/work/[id]` 工作 | 此專案任務/紀錄/交付物 | 跳回脈搏 Tab、客戶視角 |
| `/work/[id]` 客戶 | 客戶可見內容邊界 | 編輯任務可見性 |
| `/research` | 研究主軸脈絡 | 特定研究主軸 |
| 其他模組 | 通用問答 | 任意頁面 |

### 0.4 跳轉卡片格式（AI 回應中的導航建議）

```tsx
// AI 回應中可以嵌入跳轉卡片（非純文字連結）
interface AiNavSuggestion {
  label: string        // "修改色彩對比度"
  href: string         // "/work/p1?tab=work&focus=task-t1-p1"
  type: "task" | "note" | "project" | "tab" | "page"
  context?: string     // "在任務 Tab 的第 1 項"
}
```

### 0.5 Phase 1 模擬方式

- AI 面板的回應為預寫 mock（根據目前路徑選擇對應的 mock 回應集）
- 輸入框送出後，依關鍵詞觸發不同 mock 回覆（5–8 種模式）
- 跳轉連結完全功能正常（`router.push` 或 `<Link>`）
- 面板收合狀態存在 `localStorage`（跨頁面記憶收合/展開）
- 後端整合時替換 mock 回應為真實 LLM 呼叫

### 0.6 影響的檔案

| 檔案 | 變動 |
|------|------|
| `src/app/(dashboard)/layout.tsx` | 加入 `<AiContextPanel />` |
| `src/components/ai/ai-context-panel.tsx` | 全新：右側面板主元件 |
| `src/components/ai/ai-nav-suggestion.tsx` | 全新：跳轉卡片元件 |
| `src/lib/mock/ai-panel/mock-responses.ts` | 全新：各頁面的 mock 回應集 |
| `src/lib/context/ai-panel-context.tsx` | 全新：面板狀態（展開/收合、脈絡）Context |

---

## 1. Codebase 審查報告

### 1.1 已完成的工作模組

| 項目 | 檔案 | 實際狀態 |
|------|------|---------|
| 專案列表頁 | `src/app/(dashboard)/work/page.tsx` | 卡片列表，僅顯示 active；無篩選、無新增入口 |
| 專案詳情頁 | `src/app/(dashboard)/work/[projectId]/page.tsx` | 正確使用 `await params`；顯示 AI Pulse，無 Tab 結構 |
| AI Pulse UI | `src/components/ai/project-pulse-section.tsx` | 完整：Pulse 摘要、今日優先、阻礙、客戶更新 Dialog |
| AI Pulse 型別 | `src/types/ai.ts` → `AICard` / `ProjectPulseSummary` | 結構完整，含 pulseSummary 欄位 |
| Pulse mock | `src/lib/mock/ai.ts` → `mockProjectPulseCards` (2 筆) | p1、p2 各有完整 Pulse 資料 |
| 客戶更新 Dialog | `project-pulse-section.tsx` → `ClientUpdateDialog` | 可編輯 textarea + 複製，Human-in-the-loop 警告語 |
| Public Output | `src/lib/mock/ai.ts` → `mockPublicOutputs` (2 筆) | 含 `internalInsight` 與 `clientSafeContent` 分離 |

### 1.2 UI 基礎設施（重要差異）

> **關鍵發現：** 本專案的 UI 元件底層使用 `@base-ui/react`，**不是**傳統 shadcn/ui。  
> 這影響 Dialog、Sheet、Tabs 的使用方式，需要特別遵守以下慣例：

```tsx
// ✅ 正確：DialogTrigger 使用 render prop
<DialogTrigger render={<Button variant="outline" size="sm" />}>
  開啟
</DialogTrigger>

// ✅ 正確：Tabs 使用 @base-ui/react/tabs 的 data-active 模式
<Tabs defaultValue="tasks">
  <TabsList variant="line">
    <TabsTrigger value="tasks">任務</TabsTrigger>
  </TabsList>
  <TabsContent value="tasks">...</TabsContent>
</Tabs>

// ✅ 正確：Sheet 使用 @base-ui/react/dialog 底層
<Sheet>
  <SheetTrigger>...</SheetTrigger>
  <SheetContent side="right">...</SheetContent>
</Sheet>
```

### 1.3 Layout 與設計規範

| 規範 | 說明 |
|------|------|
| Dashboard Layout | `flex h-screen overflow-hidden` → Sidebar + `flex-1 overflow-hidden` content |
| 頁面容器 | `flex-1 overflow-y-auto px-6 py-6` 或 `py-8` |
| 內容寬度 | `mx-auto max-w-2xl` 或 `max-w-3xl` |
| 頁面 Header | `AppHeader` 元件（title + description + Cmd+K） |
| Context | `IngestionProvider` 包裝所有 dashboard 頁面 |
| Dark mode | Tailwind `dark:` prefix，全系統支援 |
| 動態路由 | 已正確使用 `await params`（Next.js 16 規範） |

---

## 2. 缺口分析（Gap Analysis）

### 2.1 資料模型缺口

| 缺少的型別 | 影響 |
|-----------|------|
| `Project` 完整型別 | 現有 `MockProject`（`src/types/ai.ts`）缺少 phase、health、nextAction、clientToken 等欄位 |
| `ProjectTask` | 完全不存在；無法展示任務層 |
| `ProjectNote` | 完全不存在；無法展示紀錄層（AI Triage 的 project_note 歸入目標） |
| `ProjectDeliverable` | 完全不存在；無法展示交付物層 |
| Pulse Source Metadata | `AICard.pulseSummary` 缺少 `basedOnTaskIds`、`basedOnNoteIds` 等溯源欄位 |

### 2.2 Mock 資料缺口

| 缺少的資料 | 影響 |
|-----------|------|
| 任務 mock data | 任務 Tab 無法顯示任何內容 |
| 紀錄 mock data | 紀錄 Tab 無法顯示（且無法示範 AI Triage → Note 的流程） |
| 交付物 mock data | 交付物 Tab 無法顯示 |
| 更多專案狀態 | 目前只有 3 個 active 專案，無法展示 paused/completed/archived |
| 客戶 token | `MockProject` 無 `clientToken` 欄位，`/client/[token]` 頁面無法建立 |

### 2.3 頁面結構缺口

| 頁面 | 缺口 |
|------|------|
| `/work` | 無狀態篩選 Tab；無「新增專案」入口；只顯示 active 專案 |
| `/work/[projectId]` | 無 Tab 層（任務/紀錄/交付物）；無專案 header 操作按鈕（編輯、分享） |
| `/client/[token]` | 頁面不存在；客戶分享流程完全缺席 |

### 2.4 元件缺口

| 缺少的元件 | 影響 |
|-----------|------|
| `task-list.tsx` / `task-item.tsx` | 任務層無從顯示 |
| `task-sheet.tsx` | 無法新增/編輯任務 |
| `note-timeline.tsx` | 無法顯示紀錄時間軸 |
| `deliverable-table.tsx` | 無法顯示交付物 |
| `pulse-source-meta.tsx` | AI Pulse 溯源無法視覺化（缺少「此分析基於 X 個任務、Y 個紀錄」的說明） |
| `share-link-button.tsx` | 客戶分享連結無法複製 |

### 2.5 AI Pulse 溯源缺口

現有的 `pulseSummary` 只有輸出摘要（`inProgress`、`blockers` 等），缺少：
- 分析基於哪些任務（`basedOnTaskIds`）
- 分析基於哪些紀錄（`basedOnNoteIds`）
- 分析基於哪些交付物（`basedOnDeliverableIds`）
- 分析產生時間（`generatedAt`）

這導致 AI Pulse 的「可追溯性」不足，違反 AI-native 設計哲學。

### 2.6 客戶邊界缺口

- `ProjectTask` 缺 `visibility` 欄位，無法區分「客戶可見」vs「內部」
- `ProjectNote` 缺 `visibility` 欄位，無法防止內部思考洩露給客戶
- `/client/[token]` 頁面完全不存在，沒有任何客戶隔離機制

### 2.7 UX 流程缺口

- 任務的 Checkbox 狀態切換（前端 state）不存在
- 紀錄的 Pin/Unpin 互動不存在
- 沒有「今日焦點」區塊，使用者打開 `/work` 時不知道從哪裡開始
- AI 建議來源的任務（`source: "ai_suggested"`）沒有視覺標記

### 2.8 後端整合預留缺口

- `Project.id` 已與 `AICard.relatedEntityId` 對應，結構正確
- 但任務/紀錄/交付物目前只有 mock，後端整合時需要對應的 Supabase schema
- 客戶 token 現在是靜態字串，後端需要 HMAC 簽章機制

---

## 3. 模組定位：AI-Native Project Memory

### 3.1 核心哲學

> **不是任務管理工具，是工作記憶系統。**
> 
> 每一個專案都是一個持續累積的知識容器：任務是執行紀錄，筆記是脈絡記憶，交付物是可交付的輸出邊界，AI Pulse 是對這些原始證據的即時合成。

### 3.2 四層結構

```
┌─ 1. Project Context Layer ──────────────────────────────────┐
│  name · client · status · phase · health · dueAt           │
│  nextAction · companyAxis · updatedAt                       │
├─ 2. Work Evidence Layer ────────────────────────────────────┤
│  tasks (manual / ai_suggested / client_request)             │
│  notes (line / email / meeting / internal)                  │
│  deliverables (draft → delivered → approved)                │
│  + visibility: internal | client_visible                    │
├─ 3. AI Synthesis Layer ─────────────────────────────────────┤
│  AI Project Pulse (basedOn: tasks + notes + deliverables)  │
│  todayPriorities · blockers · openQuestions                 │
│  client update draft (AI generates, human confirms)         │
├─ 4. Client Boundary Layer ──────────────────────────────────┤
│  /client/[token] — only client_visible items                │
│  no internal notes · no AI reasoning · no strategy          │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 使用情境 → 系統回應

| 情境 | 系統回應 |
|------|---------|
| 客戶突然來電問進度 | 打開 `/work/p1` → AI Pulse 30 秒摘要 → 點「生成客戶更新」複製 |
| 晚上想到一個解法 | Cmd+K → AI Triage 歸入專案 → 次日在紀錄 Tab 看到（source: internal） |
| 收到客戶 LINE 訊息 | AI Triage 自動建議 → 確認歸入專案紀錄 Tab（source: line） |
| 需要傳進度給客戶 | `/client/[token]` 連結已自動過濾，只顯示 client_visible 內容 |
| 想知道哪個專案最需要注意 | `/work` 頁的「今日焦點」區塊由 Pulse 健康度決定排序 |

---

## 4. 優化後的檔案架構

遵循現有專案的組織慣例（`src/components/ai/`、`src/components/ingestion/` 的模式）：

```
src/
├── types/
│   └── work.ts                          # 全新：完整 Work 型別定義
│
├── lib/
│   ├── context/
│   │   └── ai-panel-context.tsx         # 全新：AI 面板狀態（展開/收合、脈絡）Context
│   └── mock/
│       ├── ai.ts                        # 現有（不刪），新增 pulse source meta
│       ├── ai-panel/
│       │   └── mock-responses.ts        # 全新：各頁面的 mock 回應集（依路徑分組）
│       └── work/
│           ├── mock-projects.ts         # 5 筆完整 Project
│           ├── mock-tasks.ts            # 15-20 筆 ProjectTask
│           ├── mock-notes.ts            # 8-10 筆 ProjectNote
│           ├── mock-deliverables.ts     # 6-8 筆 ProjectDeliverable
│           └── index.ts                 # re-export
│
├── components/
│   ├── ai/
│   │   ├── ai-context-panel.tsx         # 全新：右側固定面板主元件（可收合）
│   │   └── ai-nav-suggestion.tsx        # 全新：AI 回應中嵌入的跳轉卡片
│   └── work/
│       ├── project/
│       │   ├── project-card.tsx         # 從 work/page.tsx 抽出
│       │   ├── project-filter-bar.tsx   # 狀態篩選 + 排序
│       │   ├── project-focus-card.tsx   # 今日焦點卡片（health risk）
│       │   └── add-project-dialog.tsx   # 新增專案 Dialog
│       ├── task/
│       │   ├── task-list.tsx            # 任務列表（含前端 state）
│       │   ├── task-item.tsx            # 單一任務列項
│       │   └── task-sheet.tsx           # 新增/編輯 Sheet
│       ├── note/
│       │   ├── note-timeline.tsx        # 時間軸容器
│       │   ├── note-item.tsx            # 單一紀錄卡
│       │   └── add-note-dialog.tsx      # 新增紀錄 Dialog
│       ├── deliverable/
│       │   ├── deliverable-table.tsx    # 交付物表格
│       │   └── add-deliverable-dialog.tsx
│       ├── share/
│       │   └── share-link-button.tsx    # 複製分享連結
│       └── pulse/
│           └── pulse-source-meta.tsx    # AI Pulse 溯源說明
│
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # 更新：加入 <AiContextPanel />
│   │   └── work/
│   │       ├── page.tsx                 # 更新：篩選 + 今日焦點 + 全部專案
│   │       └── [projectId]/
│   │           └── page.tsx             # 更新：Header + Pulse + 3 Tabs
│   └── client/
│       └── [token]/
│           └── page.tsx                 # 全新：極簡客戶公開頁
```

> **對應現有慣例：**
> - `src/components/work/` 與 `src/components/ai/`、`src/components/ingestion/` 並列
> - mock 資料集中在 `src/lib/mock/`，子目錄按領域分
> - 元件在子目錄內按功能分群（project/task/note/deliverable）

---

## 5. 型別設計

### 5.1 `src/types/work.ts`（全新檔案）

```typescript
// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "paused" | "completed" | "archived"

export type ProjectPhase =
  | "discovery"     // 需求探索
  | "planning"      // 規劃中
  | "execution"     // 執行中
  | "review"        // 審稿/驗收
  | "maintenance"   // 維護期

export type ProjectHealth = "good" | "watch" | "risk"
// good  = 進度正常，無緊迫問題
// watch = 有待確認的問題，但尚未阻塞
// risk  = 進度落後或有明確阻礙

export type ProjectVisibility = "internal" | "client_shared"

export interface Project {
  id: string                    // 與 MockProject.id 保持一致（p1/p2/p3...）
  name: string
  clientName?: string
  description?: string
  status: ProjectStatus
  phase: ProjectPhase
  health: ProjectHealth
  visibility: ProjectVisibility
  clientToken?: string          // 客戶分享 token，visibility = client_shared 時有值
  startedAt?: string            // ISO date string
  dueAt?: string
  nextAction?: string           // 下一個明確行動（顯示在列表卡片）
  companyAxis?: string          // 對應公司主軸（跨模組連結）
  tasksDone: number             // 快取計算值
  tasksTotal: number
  createdAt: string
  updatedAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked"

export type TaskPriority = 1 | 2 | 3   // 1=高, 2=中, 3=低

export type TaskVisibility = "internal" | "client_visible"

export type TaskSource =
  | "manual"          // 使用者手動建立
  | "ai_suggested"    // AI 建議（來自 Triage 確認）
  | "triage"          // 直接從 Triage 確認轉入
  | "client_request"  // 來自客戶明確要求

export interface ProjectTask {
  id: string
  projectId: string
  title: string
  body?: string
  status: TaskStatus
  visibility: TaskVisibility
  priority: TaskPriority
  source: TaskSource
  dueAt?: string
  completedAt?: string
  createdAt: string
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export type NoteSource = "line" | "email" | "meeting" | "internal"

export type NoteVisibility = "internal" | "client_visible"

export interface ProjectNote {
  id: string
  projectId: string
  title?: string
  body: string              // 純文字，Phase 1 不需要完整 Markdown 渲染
  source: NoteSource
  visibility: NoteVisibility
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

// ─── Deliverable ──────────────────────────────────────────────────────────────

export type DeliverableStatus = "draft" | "delivered" | "approved"

export type DeliverableVisibility = "internal" | "client_visible"

export interface ProjectDeliverable {
  id: string
  projectId: string
  title: string
  description?: string
  status: DeliverableStatus
  visibility: DeliverableVisibility
  deliveredAt?: string
  createdAt: string
}

// ─── AI Pulse Source Metadata（擴充 ai.ts 的 ProjectPulseSummary）────────────

export interface PulseSourceMeta {
  generatedAt: string
  basedOnTaskIds: string[]
  basedOnNoteIds: string[]
  basedOnDeliverableIds: string[]
}
```

### 5.2 與現有型別的關係

```
src/types/ai.ts (保留)
  └── MockProject          → 供 AI mock 資料使用，不修改
  └── AICard               → 不修改
  └── ProjectPulseSummary  → 不修改，在 mock 資料中加 PulseSourceMeta

src/types/work.ts (新增)
  └── Project              → id 欄位與 MockProject.id 對應（p1/p2/p3）
  └── ProjectTask
  └── ProjectNote
  └── ProjectDeliverable
  └── PulseSourceMeta      → 附加到 mockProjectPulseCards 的 mock 資料旁
```

---

## 6. Mock 資料規格

### 6.1 `src/lib/mock/work/mock-projects.ts`

5 筆，前 3 筆 id 對應現有 `mockProjects`（`ai.ts`）：

```typescript
import type { Project } from "@/types/work"

export const mockProjectsFull: Project[] = [
  // p1 — active, good, client_shared
  {
    id: "p1",
    name: "Lisa Q2 Dashboard",
    clientName: "Lisa Chen",
    description: "Q2 業績數據視覺化儀表板，含銷售趨勢、客戶分層、渠道分析三個模組。",
    status: "active",
    phase: "review",
    health: "watch",            // 有客戶反饋待處理
    visibility: "client_shared",
    clientToken: "tok-lisa-q2-2026",
    startedAt: "2026-04-01",
    dueAt: "2026-05-20",
    nextAction: "回覆 Lisa 的色彩對比度反饋",
    companyAxis: "數位轉型顧問服務",
    tasksDone: 6, tasksTotal: 10,
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-05-09T10:00:00Z",
  },
  // p2 — active, risk, internal
  {
    id: "p2",
    name: "Allen NGO Proposal",
    clientName: "Allen Huang",
    description: "非營利組織年度計畫書設計，含封面、執行摘要、財務規劃三部分。",
    status: "active",
    phase: "execution",
    health: "risk",             // 嚴重落後
    visibility: "internal",
    startedAt: "2026-04-15",
    dueAt: "2026-05-12",
    nextAction: "聯絡 Allen 確認財務數據格式",
    tasksDone: 2, tasksTotal: 8,
    createdAt: "2026-04-15T09:00:00Z",
    updatedAt: "2026-05-08T14:00:00Z",
  },
  // p3 — active, watch, internal
  {
    id: "p3",
    name: "商會活動 Banner 系列",
    clientName: "Mark Wu",
    description: "5 月份商會三場活動的 Banner 設計，含社群版與印刷版。",
    status: "active",
    phase: "execution",
    health: "watch",
    visibility: "internal",
    dueAt: "2026-05-08",
    nextAction: "確認 Mark 是否已審兩張待審稿",
    tasksDone: 4, tasksTotal: 6,
    createdAt: "2026-04-20T09:00:00Z",
    updatedAt: "2026-05-07T09:00:00Z",
  },
  // p4 — paused, good
  {
    id: "p4",
    name: "Cathy ESG 報告設計",
    clientName: "Cathy Chen",
    description: "企業永續報告書的視覺設計，等待客戶提供文字內容。",
    status: "paused",
    phase: "planning",
    health: "good",
    visibility: "internal",
    startedAt: "2026-03-01",
    nextAction: "等待 Cathy 確認完稿時間",
    tasksDone: 1, tasksTotal: 5,
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-04-10T11:00:00Z",
  },
  // p5 — completed, good, client_shared
  {
    id: "p5",
    name: "商會年刊 2025",
    clientName: "Mark Wu",
    description: "2025 年度商會年刊設計與印刷檔輸出。",
    status: "completed",
    phase: "maintenance",
    health: "good",
    visibility: "client_shared",
    clientToken: "tok-chamber-2025",
    startedAt: "2026-01-10",
    dueAt: "2026-03-31",
    tasksDone: 12, tasksTotal: 12,
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-03-28T17:00:00Z",
  },
]
```

### 6.2 `src/lib/mock/work/mock-tasks.ts`

15-20 筆，涵蓋所有狀態/優先度/可見性/來源：

| 專案 | 任務 | 狀態 | 優先度 | 可見性 | 來源 |
|------|------|------|--------|--------|------|
| p1 | 修改客戶分層色彩對比度 | in_progress | 1(高) | internal | triage |
| p1 | 確認 Lisa 的輸出格式需求 | todo | 1(高) | client_visible | client_request |
| p1 | 銷售趨勢模組 → 完成輸出 | done | 2(中) | client_visible | manual |
| p1 | 渠道分析模組完成 | done | 2(中) | client_visible | manual |
| p1 | 最終版本 PDF 輸出 | todo | 2(中) | client_visible | manual |
| p1 | 評估是否需要數據自動更新 | todo | 3(低) | internal | ai_suggested |
| p2 | 封面設計初稿 | in_progress | 1(高) | internal | manual |
| p2 | 執行摘要文字整理 | in_progress | 1(高) | internal | manual |
| p2 | 向 Allen 確認財務數據格式 | blocked | 1(高) | internal | ai_suggested |
| p2 | 財務規劃模組設計 | todo | 1(高) | internal | manual |
| p2 | 附錄整理 | todo | 3(低) | internal | manual |
| p3 | 活動一 Banner (社群版) | done | 2(中) | internal | manual |
| p3 | 活動一 Banner (印刷版) | done | 2(中) | internal | manual |
| p3 | 活動二 Banner (社群版) | done | 2(中) | internal | manual |
| p3 | 活動二 Banner (印刷版) | todo | 2(中) | internal | manual |
| p3 | 活動三 Banner (社群版) | todo | 1(高) | internal | manual |
| p3 | 確認 Mark 審稿狀態 | todo | 1(高) | internal | ai_suggested |

### 6.3 `src/lib/mock/work/mock-notes.ts`

8-10 筆，展示 AI Triage → Note 歸入的完整流程：

| 專案 | 來源 | 可見性 | isPinned | 重點內容 |
|------|------|--------|----------|---------|
| p1 | line | internal | false | Lisa：客戶分層顏色太相近，深色背景難分辨 |
| p1 | meeting | internal | true | 5/6 客戶會議：Lisa 確認三個模組範圍，PDF 格式待定 |
| p1 | email | internal | false | Lisa 來信：想請問銷售趨勢是否可以做成可互動的版本 |
| p1 | internal | internal | false | 技術評估：互動式圖表需要額外 2 天，建議先交靜態版本 |
| p2 | line | internal | true | Allen：財務數據要等理事會開完會才能給，最快 5/9 |
| p2 | meeting | internal | false | 啟動會議紀錄：封面風格決定走簡潔路線，避免過度設計 |
| p3 | line | internal | false | Mark：印刷活動三的截止日期提前到 5/7，需要確認 |
| p3 | internal | internal | false | 提醒自己：這套 Banner 後續可以作為商業提案模板使用 |

### 6.4 `src/lib/mock/work/mock-deliverables.ts`

6-8 筆，展示各狀態與可見性：

| 專案 | 標題 | 狀態 | 可見性 | 交付日 |
|------|------|------|--------|--------|
| p1 | 銷售趨勢模組（網頁版） | approved | client_visible | 2026-05-03 |
| p1 | 渠道分析模組（網頁版） | delivered | client_visible | 2026-05-07 |
| p1 | 客戶分層模組（修改版） | draft | internal | - |
| p2 | 計畫書封面設計稿 | draft | internal | - |
| p2 | 執行摘要文件 | draft | internal | - |
| p3 | 活動一 Banner 正式檔案 | approved | client_visible | 2026-05-02 |
| p3 | 活動二 Banner（審稿中） | delivered | client_visible | 2026-05-06 |
| p5 | 2025 年刊完稿印刷檔 | approved | client_visible | 2026-03-28 |

### 6.5 Pulse Source Metadata（附加到現有 mock）

在 `src/lib/mock/work/index.ts` 中建立：

```typescript
import type { PulseSourceMeta } from "@/types/work"

export const mockPulseSourceMeta: Record<string, PulseSourceMeta> = {
  "pp1": {
    generatedAt: "2026-05-06T07:00:00Z",
    basedOnTaskIds: ["t1-p1", "t2-p1", "t3-p1", "t4-p1", "t5-p1", "t6-p1"],
    basedOnNoteIds: ["n1-p1", "n2-p1", "n3-p1"],
    basedOnDeliverableIds: ["d1-p1", "d2-p1"],
  },
  "pp2": {
    generatedAt: "2026-05-06T07:00:00Z",
    basedOnTaskIds: ["t1-p2", "t2-p2", "t3-p2", "t4-p2", "t5-p2"],
    basedOnNoteIds: ["n1-p2", "n2-p2"],
    basedOnDeliverableIds: ["d1-p2", "d2-p2"],
  },
}
```

---

## 7. 頁面設計

### 7.1 `/work` — 工作指揮中心

```
[AppHeader] 工作  "將專案、任務、紀錄轉化為可追溯的工作記憶"
  右側：[+ 新增專案] 按鈕（開啟 Dialog）

────── 今日焦點 ──────
只顯示 health = "risk" 或 "watch" 且 status = "active" 的專案
最多 2 張 FocusCard，依 health 排序（risk 優先）：
  ├── health 色塊（risk=紅, watch=琥珀）
  ├── 專案名稱 + 客戶
  ├── nextAction 文字
  └── [進入專案] 連結

────── 全部專案 ──────
[篩選 Tab] 全部 | 進行中 | 暫停 | 完成 | 封存
           右側 Select：最近更新 / 截止日 / 名稱

[ProjectCard 列表] 2 欄 Grid（sm 以上）：
  每張卡片：
  ├── [health 色點] 專案名稱 (粗體)
  ├── 客戶名稱
  ├── [status badge] [phase badge]
  ├── 任務進度 bar (done/total %)
  ├── 截止日（逾期 = 紅色）
  └── nextAction（灰色小字）
```

### 7.2 `/work/[projectId]` — 專案詳情（大概念 Tab 設計）

專案詳情頁使用**三個大概念 Tab** 作為主要導覽，每個 Tab 代表一種完整的觀看視角，而非只是不同的資料列表。

```
整體佈局（含右側 AI 面板後）：

┌── Sidebar ──┬────────── 專案詳情（flex-1）────────────┬── AI Panel ──┐
│             │ [AppHeader] 專案名稱 · 客戶名稱          │ ✦ AI 助理    │
│             │ ─────────────────────────────────────── │              │
│             │ [大概念 Tab 列]                          │ 脈絡感知：   │
│             │  [脈搏 Pulse] [工作 Work] [客戶 Client]  │ ● 此專案     │
│             │ ─────────────────────────────────────── │ ● Pulse Tab  │
│             │ [Tab 內容區 - scrollable]                │              │
│             │                                          │ [對話區]     │
│             │                                          │ [輸入框]     │
└─────────────┴──────────────────────────────────────────┴──────────────┘
```

#### Tab 設計哲學

| Tab | 定位 | 使用時機 |
|-----|------|---------|
| 脈搏 Pulse | AI 合成視角：現在這個專案的整體狀態是什麼 | 進入專案的第一視角、快速判斷健康度 |
| 工作 Work | 執行視角：任務 / 紀錄 / 交付物的原始證據 | 實際推進工作、查找細節、新增記錄 |
| 客戶 Client | 邊界視角：客戶能看到什麼、分享連結管理 | 準備客戶溝通、確認公開內容 |

---

#### Tab 1：脈搏 Pulse（預設 Tab）

```
[專案 Header]
  {專案名稱}（h1）  [{clientName} Badge]
  [{status}] [{phase}] [{health}]  · {daysLeft} 天後截止
  [更多操作 ▾]（編輯專案基本資訊、封存）

─────────────────────────────────────────────────────
[大概念 Tab 列]  ← 字級比內容 Tab 稍大，視覺明顯
  [脈搏 ✦]  [工作]  [客戶]
─────────────────────────────────────────────────────

[AI 專案脈搏區塊]（現有 ProjectPulseSection）
  ✦ AI 專案脈搏  [ConfidencePip]        [生成客戶更新]
  ─────────────────────────────────────
  AI 摘要（bg-muted/30 卡片）：
    {summary 文字}
    進行中：...
    ⚠ 阻礙：...
    ? 待釐清：...

  今天建議優先做：
    ① {priority 1}
    ② {priority 2}

  [AI 判斷依據 ▾]（展開 reasoning）

[Pulse 溯源]
  小字灰色：「此分析基於 6 個任務、3 個紀錄、2 個交付物 · 2026-05-06 07:00 生成」

[快速概況]（數字摘要，輔助脈搏判讀）
  ┌──────────┬──────────┬──────────┬──────────┐
  │ 任務     │ 紀錄     │ 交付物   │ 截止倒數 │
  │ 6/10 完  │  4 則    │  3 份    │ 14 天    │
  └──────────┴──────────┴──────────┴──────────┘
  → 點擊「6/10 完」自動切換到工作 Tab 且聚焦任務區
  → 點擊「4 則」切換到工作 Tab 且聚焦紀錄區
```

---

#### Tab 2：工作 Work

```
[工作 Tab 內容]

─── 任務 ─────────────────────────────────────────
[+ 新增任務]  [篩選: 全部/待辦/進行/完成/阻塞]

任務列表（依 priority 排序）：
  每一項：
  ├── Checkbox（切換 done/todo 前端 state）
  ├── 任務名稱
  ├── [status badge] [priority badge]
  ├── [Eye icon]（client_visible）或 [Lock icon]（internal）
  ├── [✦ icon]（source = ai_suggested）
  ├── 截止日
  └── [更多 ▾ → 編輯 / 刪除]

Empty：「還沒有任務，點擊新增」

─── 紀錄 ─────────────────────────────────────────
[+ 新增紀錄]

置頂紀錄（isPinned = true）顯示在最上方
時間軸（最新在上）：
  每一項：
  ├── 來源 Badge（LINE / Email / 會議 / 內部）
  ├── 可見性 Badge（client_visible 時顯示 Eye icon）
  ├── [Pin icon]（可點擊切換）
  ├── 標題（若有）+ 內容前 80 字
  └── 時間戳

Empty：「還沒有紀錄，從 Cmd+K 擷取後歸入，或手動新增」

─── 交付物 ───────────────────────────────────────
[+ 新增交付物]

表格：
  標題 / 說明 / [status badge] / [visibility badge] / 交付日 / 操作

Empty：「還沒有交付物」
```

> **設計說明：** 工作 Tab 內的三個區塊（任務/紀錄/交付物）不用 Sub-Tab，  
> 而是**垂直分區**連續排列，讓使用者在同一個滾動視圖中看到全部工作證據。  
> 快速瀏覽時不需要多次點擊切換，滾動即可。

---

#### Tab 3：客戶 Client

```
[客戶 Tab 內容]

─── 分享設定 ──────────────────────────────────────
可見性：[client_shared Badge] 或 [internal Badge]
客戶分享連結：
  https://personal-os.app/client/tok-lisa-q2-2026  [複製]
  [重新產生連結]（Toast 確認）  [撤銷連結]（二次確認）

─── 客戶可見任務 ──────────────────────────────────
僅顯示 visibility = "client_visible" 的任務
  每筆：任務名稱 / 狀態 Badge / 截止日 / [改為內部 ↩]

[+ 新增客戶可見任務]

─── 客戶可見交付物 ────────────────────────────────
僅顯示 visibility = "client_visible" 的交付物
  每筆：標題 / 狀態 Badge / 交付日 / [改為內部 ↩]

[+ 新增客戶可見交付物]

─── 邊界說明 ──────────────────────────────────────
bg-muted/40 小字區塊：
  「以下內容對客戶不可見：
   · 所有 internal 紀錄與 AI 分析
   · internal 任務與交付物
   · AI 內部判斷（internalInsight）
   · 任何未明確標記為 client_visible 的內容」

─── 客戶更新草稿 ──────────────────────────────────
[AI 生成客戶更新] 按鈕
→ 開啟 ClientUpdateDialog（現有元件）
```

### 7.3 `/client/[token]` — 客戶公開頁

> 位於 `src/app/client/[token]/page.tsx`（不在 dashboard group 內，無 Sidebar）

```
[極簡 Header]
  左：Personal OS 小 Logo + 文字
  右：專案名稱

[邊界聲明橫幅]
  bg-muted/40, 小字：
  "此頁面僅顯示明確標記為可分享的任務與交付物。
   內部工作紀錄、AI 分析與策略討論均不包含在此。"

[專案摘要]
  名稱 / 客戶名稱 / 說明 / 起訖日期 / 狀態 Badge

[Tabs] 任務進度 | 交付物

Tab：任務進度
  僅顯示 visibility = "client_visible" 的任務
  每筆：任務名稱 / 狀態 Badge / 截止日
  若無 → "目前沒有可分享的任務進度"

Tab：交付物
  僅顯示 visibility = "client_visible" 的交付物
  每筆：標題 / 說明 / 狀態 Badge / 交付日
  [下載]（Phase 1 disabled，Tooltip 說明後端整合後啟用）

[Footer] "Personal OS · 僅供客戶查閱，請勿轉發"

[Token 無效時]
  中央卡片：「此連結無效或已過期。請聯絡您的專案負責人取得新連結。」
```

---

## 8. 元件清單

### 8.1 `src/components/work/project/`

| 元件 | 說明 | 注意 |
|------|------|------|
| `project-card.tsx` | 從 `/work/page.tsx` 抽出，接受 `Project` 型別 | Server Component 可 |
| `project-filter-bar.tsx` | 狀態 Tab（line variant）+ 排序 Select | Client Component |
| `project-focus-card.tsx` | 今日焦點卡（risk/watch 高亮）| Server Component 可 |
| `add-project-dialog.tsx` | Dialog + 表單，送出 Toast | Client Component |

### 8.2 `src/components/work/task/`

| 元件 | 說明 | 注意 |
|------|------|------|
| `task-list.tsx` | 任務列表容器，管理 local state | Client Component |
| `task-item.tsx` | 單一任務列項（Checkbox、Badge 群、操作） | 由 task-list 管理 |
| `task-sheet.tsx` | 新增/編輯 Sheet（side="right"） | Client Component；使用 `@base-ui/react/dialog` 底層 |

### 8.3 `src/components/work/note/`

| 元件 | 說明 |
|------|------|
| `note-timeline.tsx` | 時間軸容器，管理 pin state | Client Component |
| `note-item.tsx` | 單一紀錄卡（來源 Badge、可見性、Pin 按鈕）|
| `add-note-dialog.tsx` | Dialog 表單（來源、可見性、標題、內容）|

### 8.4 `src/components/work/deliverable/`

| 元件 | 說明 |
|------|------|
| `deliverable-table.tsx` | 簡單表格（可用 `<table>` 或 `src/components/tables/data-table-shell.tsx`）|
| `add-deliverable-dialog.tsx` | Dialog 表單（標題、說明、可見性、狀態）|

### 8.5 `src/components/work/share/`

| 元件 | 說明 |
|------|------|
| `share-link-button.tsx` | Button + clipboard copy + Toast；token 為 null 時 disabled |

### 8.6 `src/components/work/pulse/`

| 元件 | 說明 |
|------|------|
| `pulse-source-meta.tsx` | 純顯示：「基於 N 個任務、N 個紀錄、N 個交付物 · 時間」；無互動 |

### 8.7 `src/components/ai/`（AI 右側面板）

| 元件 | 說明 | 注意 |
|------|------|------|
| `ai-context-panel.tsx` | 右側固定面板（可收合）；含脈絡感知區、對話紀錄列表、訊息輸入框 | Client Component；讀取 `usePathname` 自動偵測頁面 |
| `ai-nav-suggestion.tsx` | AI 回應中嵌入的跳轉卡片（label + href + type + context）| 使用 Next.js `<Link>` 或 `router.push` |

### 8.8 `src/lib/` AI 面板支援

| 檔案 | 說明 |
|------|------|
| `src/lib/context/ai-panel-context.tsx` | 面板展開/收合 state（`isOpen`）+ 當前脈絡文字（`contextLabel`）；收合狀態存 `localStorage` |
| `src/lib/mock/ai-panel/mock-responses.ts` | 依路徑前綴分組的 mock 回應集（5–8 種關鍵詞觸發模式）；每筆回應可含 `AiNavSuggestion[]` |

---

## 9. 實作順序

### 第零批（Dashboard Layout Upgrade）— AI 右側面板

```
Step 0a: 建立 src/lib/context/ai-panel-context.tsx
         - isOpen state（預設 true）+ localStorage 同步
         - contextLabel：根據 usePathname 回傳對應脈絡文字
Step 0b: 建立 src/lib/mock/ai-panel/mock-responses.ts
         - 依路徑前綴分組（dashboard / work / work/[id] 等）
         - 每組 5–8 筆 mock 回應，部分含 AiNavSuggestion[]
Step 0c: 建立 src/components/ai/ai-nav-suggestion.tsx
         - 接受 AiNavSuggestion[]，渲染可點擊跳轉卡片
Step 0d: 建立 src/components/ai/ai-context-panel.tsx
         - 右側 w-80 面板；讀取 ai-panel-context
         - 輸入送出 → 依關鍵詞匹配 mock 回應 → 顯示訊息泡泡
         - 收合後只顯示 icon strip（寬度縮為 w-12）
Step 0e: 更新 src/app/(dashboard)/layout.tsx
         - 在 children 後加入 <AiContextPanel />
         - AiPanelProvider 包裝整個 layout
```

預估工時：2.5 小時

---

### 第一批（Foundation）— 型別 + Mock 資料

```
Step 1: 建立 src/types/work.ts
Step 2: 建立 src/lib/mock/work/mock-projects.ts
Step 3: 建立 src/lib/mock/work/mock-tasks.ts
Step 4: 建立 src/lib/mock/work/mock-notes.ts
Step 5: 建立 src/lib/mock/work/mock-deliverables.ts
Step 6: 建立 src/lib/mock/work/index.ts（re-export）
```

預估工時：2 小時

---

### 第二批（/work Page）— 列表指揮中心

```
Step 7:  project-card.tsx（從 page.tsx 抽出，升級為 Project 型別）
Step 8:  project-focus-card.tsx（health risk/watch 焦點卡）
Step 9:  project-filter-bar.tsx（狀態 Tab + 排序）
Step 10: add-project-dialog.tsx（新增專案表單 + Toast）
Step 11: 更新 /work/page.tsx（組合以上元件）
```

預估工時：3 小時

---

### 第三批（/work/[projectId] Page）— 專案詳情

```
Step 12: task-item.tsx
Step 13: task-list.tsx（Checkbox 前端 state，篩選）
Step 14: task-sheet.tsx（新增/編輯 Sheet）
Step 15: note-item.tsx
Step 16: note-timeline.tsx（Pin state 管理）
Step 17: add-note-dialog.tsx
Step 18: deliverable-table.tsx
Step 19: add-deliverable-dialog.tsx
Step 20: pulse-source-meta.tsx
Step 21: share-link-button.tsx
Step 22: 更新 /work/[projectId]/page.tsx（組合 Header + Pulse + Tabs）
```

預估工時：5 小時

---

### 第四批（/client/[token]）— 客戶公開頁

```
Step 23: 建立 src/app/client/[token]/page.tsx
         - 從 mockProjectsFull 依 clientToken 查詢
         - 過濾 client_visible 任務和交付物
         - 無效 token 顯示 fallback
```

預估工時：1.5 小時

---

### 第五批（Type Check + Polish）

```
Step 24: 執行 npx tsc --noEmit，修正型別錯誤
Step 25: 確認 dark mode 顯示
Step 26: 確認 390px 手機視圖（Tab 切換、Sheet/Dialog 顯示）
Step 27: 確認 Empty State 各 Tab 都有
```

預估工時：1 小時

**總計預估：** 約 15 小時（含第零批 AI 面板）

---

## 10. 完成標準

### 10.1 功能完整性

- [ ] `/work`：今日焦點顯示 risk/watch 專案；篩選 Tab 可切換；排序有效；新增 Dialog 送出有 Toast
- [ ] `/work/[projectId]`：Header 含 status/phase/health；AI Pulse 正常顯示；三個 Tab 各有資料
- [ ] 任務 Tab：Checkbox 點擊切換 done/todo（前端 state）；新增 Sheet 開啟可用；空狀態存在
- [ ] 紀錄 Tab：置頂顯示在上；來源 Badge；Pin 按鈕可點擊（前端 state）；空狀態存在
- [ ] 交付物 Tab：表格顯示；新增 Dialog 可用；空狀態存在
- [ ] AI Pulse 溯源：「基於 N 個任務…」說明文字顯示
- [ ] 分享連結按鈕：clientToken 存在時可點擊複製，無 token 時 disabled
- [ ] `/client/[token]`：無 Sidebar；只顯示 client_visible 項目；邊界聲明橫幅存在；無效 token fallback

### 10.2 AI 整合點

- [ ] AI Project Pulse 顯示在 Tab 上方（主視覺優先）
- [ ] 客戶更新 Dialog 可編輯並複製（現有功能，確保 Tab 重構後仍運作）
- [ ] `source = "ai_suggested"` 的任務顯示 Sparkles 圖示
- [ ] `visibility = "client_visible"` 的任務顯示 Eye 圖示

### 10.3 AI 右側面板

- [ ] 面板固定顯示在 Dashboard 右側，不隨頁面內容捲動
- [ ] 面板可收合：收合後縮為 icon strip（`w-12`），展開為完整面板（`w-80`）
- [ ] 收合狀態存於 `localStorage`，跨頁面導覽後記憶
- [ ] 脈絡感知：`usePathname` 自動偵測目前頁面，顯示對應的脈絡說明
- [ ] 對話模擬：輸入送出後，依關鍵詞觸發對應 mock 回覆（至少 5 種觸發模式）
- [ ] 跳轉卡片：AI 回覆中的 `AiNavSuggestion` 可點擊正確跳轉（含 Tab query string）
- [ ] 跨頁面持久：切換 Sidebar 導覽項目後，面板對話紀錄保留

### 10.5 程式碼品質

- [ ] `src/types/work.ts` 無 `any`
- [ ] `MockProject`（ai.ts）未被刪除或修改
- [ ] `Project.id` 與 `MockProject.id` 完全一致（p1/p2/p3）
- [ ] `await params` 用於 `/work/[projectId]` 和 `/client/[token]`
- [ ] 所有 Dialog/Sheet 使用 `@base-ui/react` 底層元件（不使用 shadcn 的 radix-ui 模式）
- [ ] `DialogTrigger` 使用 `render` prop 傳入 Button（遵循現有 project-pulse-section 慣例）
- [ ] 無 console error / warning
- [ ] Dark mode 正常顯示
- [ ] 手機 390px：Tab 可切換；Sheet 從右側滑出；Dialog 置中顯示

---

## 附錄 A：與其他模組的連結點預留

| 連結方向 | 欄位 | Phase 1 處理 |
|---------|------|-------------|
| 工作 → 公司主軸 | `Project.companyAxis` | 顯示靜態文字 |
| 工作 → 財務 | `finance_records.project_id` | 財務模組建立時接入 |
| 工作 → 商會 | 無硬關聯 | 商會聯絡人詳情頁顯示「關聯專案」 |
| AI Triage → 工作紀錄 | `TriageCategory = "project_note"` | Triage 確認後 source = "triage" |
| AI Triage → 工作任務 | `TriageCategory = "project_note"` | Triage 確認後可建立任務 |

## 附錄 B：後端整合時的 Supabase schema 對應

| 型別 | 對應 Supabase 表 | 備注 |
|------|----------------|------|
| `Project` | `projects` | `clientToken` → `client_token` |
| `ProjectTask` | `project_tasks` | `source` 欄位為 Phase 2 新增 |
| `ProjectNote` | `project_notes` | `visibility` 欄位為 Phase 2 新增 |
| `ProjectDeliverable` | `project_deliverables` | `visibility` 欄位為 Phase 2 新增 |
| `PulseSourceMeta` | AI 合成層，不存資料庫 | 後端以 Supabase Edge Function 生成 |

---

*本計劃以前端模擬（Phase 1）為實作範圍。後端整合（Supabase RLS、API Route、真實 Auth）在 Phase 2 逐模組銜接，屆時型別設計可直接對應，不需重構。*
