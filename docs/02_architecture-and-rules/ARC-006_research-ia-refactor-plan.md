# Research 模組重構：Thread-centered → Research Object Network-centered

## 背景與問題診斷

### 現況架構（錯誤）
```
/research                     → Thread Grid + PubTimeline（首頁以研究主軸列表為主體）
/research/[threadId]          → Ideas / Materials / Publication / Outputs（四 Tab）
```

所有研究物件（想法、文獻、發表、里程碑）皆強制掛載在 `threadId` 底下，形成**樹狀父子結構**。  
這導致：一篇論文無法同時支援多個研究議題；一個概念無法在多篇寫作專案中共用；想法必須一開始就歸屬某個 Thread。

### 目標架構（正確）
```
/research                     → Research Workspace Hub（六入口工作台）
/research/issues              → 研究議題與概念（原 Thread Grid 移至此）
/research/issues/[issueId]    → 單一議題視角（相關物件關聯瀏覽）
/research/writing             → 研究撰寫工作台
/research/writing/[id]        → 三欄寫作視圖（Outline / Draft / Feedback）
/research/exploration         → 想法探索 Inbox（無需掛 issue）
/research/sources             → 資源整合總庫（source 不強制綁 issue）
/research/events              → 研討會與 CFP 追蹤
/research/people              → 作者、主席與機構網絡
```

研究議題（ResearchIssue）是**一種組織方式**，不是所有研究資料的父層。  
物件間關係用 `ResearchLink` 表達 many-to-many 網絡。

---

## 現況 Audit 摘要

### 需要保留的檔案（不破壞）
| 檔案 | 狀態 | 備註 |
|---|---|---|
| `src/components/layout/module-guard.tsx` | ✅ 保留 | 完整可用 |
| `src/lib/context/module-permissions-context.tsx` | ✅ 保留 | 完整可用 |
| `src/components/layout/module-settings-control.tsx` | ✅ 保留 | 完整可用 |
| `src/components/layout/app-sidebar.tsx` | ✅ 保留 | 動態過濾完整 |
| `src/app/(dashboard)/layout.tsx` | ✅ 保留 | Provider 巢狀已正確 |
| `src/lib/db.ts` | ✅ 保留 | Prisma Client |
| `prisma/schema.prisma` | ✅ 保留 | 完整 DB Schema |
| `src/lib/actions/` | ✅ 保留 | Server Actions（後端 API 層） |

### 需要重構的檔案
| 檔案 | 目前問題 | 處理方式 |
|---|---|---|
| `src/types/research.ts` | 所有型別依附 threadId；缺 Link/Issue/Question/Concept 等型別 | **擴充，保留舊型別 as legacy** |
| `src/lib/mock/research.ts` | 資料皆以 threadId 為父層 | **在檔案底部新增 network mock，不刪舊 export** |
| `src/lib/context/research-context.tsx` | API 強制帶 threadId 參數 | **擴充 context，新增 network-model 方法** |
| `src/app/(dashboard)/research/page.tsx` | Thread Grid 為首頁主體 | **改為 Workspace Hub（六入口）** |
| `src/app/(dashboard)/research/[threadId]/page.tsx` | 目前唯一詳情頁 | **降級為 legacy，加升級 Banner** |

---

## 關鍵設計決策

> [!IMPORTANT]
> **ModuleGuard 策略**：新增 `src/app/(dashboard)/research/layout.tsx`，在 layout 層統一包覆 `ModuleGuard moduleKey="research"`，讓所有 `/research/*` 子路由自動受保護，不需要每頁單獨包。同時移除 `research/page.tsx` 和 `[threadId]/page.tsx` 裡個別的 `<ModuleGuard>` 包覆（避免雙重包覆 hydration 問題）。

> [!IMPORTANT]
> **舊 [threadId] 路由相容**：保留 `src/app/(dashboard)/research/[threadId]/page.tsx`（不刪除，不破壞現有書籤），頁面頂部加升級 Banner + 跳轉按鈕引導至 `/research/issues/[id]`。

> [!IMPORTANT]
> **Context 策略**：`research-context.tsx` 擴充而非重寫。保留所有舊方法（`addThread`, `addIdea`, `addMaterial` 等）供 `[threadId]` legacy 頁面繼續使用；新增 network-model 方法供新頁面使用。

> [!WARNING]
> **Type 策略**：`ResearchIdea.threadId` 在舊型別中是必填 string。新型別 `ResearchIdea`（v2 命名）的 `issueId` 改為 **optional**，並用 `ResearchLink` 表達關聯。避免修改舊 ResearchIdea，以免舊 mock data 編譯失敗。

---

## Proposed Changes

---

### Component: 型別層

#### [MODIFY] [research.ts](file:///Users/pzps0964713/Documents/github/self-stucture-v1/src/types/research.ts)

在現有型別後面**追加**以下型別（不刪除現有任何型別）：

**新增 Network Layer 型別：**
- `ResearchEntityType` — 所有研究物件的 entity 分類 union type
- `ResearchRelationType` — 關係類型 union type（supports, contradicts, defines, authored_by 等 15 種）
- `ResearchLink` — many-to-many 網絡關係物件（fromType/fromId/toType/toId/relationType）

**新增 Core Entities：**
- `ResearchIssueStatus` / `ResearchIssue` — 取代 ResearchThread 的語意（不刪除 Thread）
- `ResearchQuestion` — 研究問題（issueId optional）
- `ResearchConcept` / `ConceptDefinition` — 概念與多來源定義

**新增 Source & Ideas（network-model）：**
- `ResearchSourceType` / `ResearchSource` — 不強制 threadId，加 `status` 欄位
- `ResearchIdeaV2` — issueId optional，增加 `sourceContext`, `status`

**新增 Writing：**
- `ResearchWritingProject` — 不強制 threadId，增加 `status` 細分
- `WritingSection` — 章節物件，加 `status`
- `ReviewPerspective` / `AIFeedbackRun` — 使用 `targetType/targetId` 取代 `threadId`

**新增 Events & People：**
- `ResearchEvent` — fields 改為 array，加 `suggestedParticipationMode`
- `AcademicPerson` — 加 `role` 欄位

---

### Component: Mock Data 層

#### [MODIFY] [research.ts](file:///Users/pzps0964713/Documents/github/self-stucture-v1/src/lib/mock/research.ts)

在現有 exports 後面**追加**（不刪除舊 exports 供 legacy 繼續使用）：

```ts
export const mockResearchIssues: ResearchIssue[]         // 3 個議題
export const mockResearchQuestions: ResearchQuestion[]   // 每個議題 2-3 個問題
export const mockResearchConcepts: ResearchConcept[]     // 4-5 個跨議題概念
export const mockConceptDefinitions: ConceptDefinition[] // 每概念 2 個不同定義
export const mockResearchSources: ResearchSource[]       // 5-6 個不帶 threadId 的資源
export const mockResearchIdeasV2: ResearchIdeaV2[]       // 4-5 個想法，issueId optional
export const mockResearchWritingProjects: ResearchWritingProject[]
export const mockWritingSections: WritingSection[]
export const mockAIFeedbackRuns: AIFeedbackRun[]
export const mockResearchEvents: ResearchEvent[]         // 3 個研討會
export const mockAcademicPeople: AcademicPerson[]        // 3-4 個學者
export const mockResearchLinks: ResearchLink[]           // ~10 條 link 展示 network
```

**示範關聯網絡（ResearchLinks）：**
```
Paper_A    supports      Concept_X
Concept_X  belongs_to    Issue_1
Idea_B     inspired_by   Workshop_C
Writing_D  used_in       Source_A
Event_E    submitted_to  Writing_D
Person_F   chaired_by    Event_E
Person_F   authored_by   Source_A
```

---

### Component: Context 層

#### [MODIFY] [research-context.tsx](file:///Users/pzps0964713/Documents/github/self-stucture-v1/src/lib/context/research-context.tsx)

**保留所有舊 state 和方法**，新增：

State：
```ts
issues: ResearchIssue[]
questions: ResearchQuestion[]
concepts: ResearchConcept[]
sources: ResearchSource[]       // free-standing
ideasV2: ResearchIdeaV2[]       // issueId optional
writingProjects: ResearchWritingProject[]
writingSections: WritingSection[]
feedbackRuns: AIFeedbackRun[]
events: ResearchEvent[]
people: AcademicPerson[]
links: ResearchLink[]
```

Methods：
```ts
addIssue(title, description?, keywords?, disciplines?)
addQuestion(question, issueId?)
addConcept(name, shortDefinition?)
addSource(title, sourceType, ...)        // no threadId required
addIdeaV2(title, body, ideaType, ...)    // no threadId required
addLink(fromType, fromId, toType, toId, relationType, note?)
addWritingProject(title, writingType, ...)
addEvent(name, eventType, ...)
addPerson(name, role?, affiliation?, ...)
getLinkedEntities(entityType, entityId)  // query links graph
```

---

### Component: 路由保護層

#### [NEW] [layout.tsx](file:///Users/pzps0964713/Documents/github/self-stucture-v1/src/app/(dashboard)/research/layout.tsx)

```tsx
"use client"
import { ModuleGuard } from "@/components/layout/module-guard"
export default function ResearchLayout({ children }) {
  return <ModuleGuard moduleKey="research">{children}</ModuleGuard>
}
```

---

### Component: 首頁重構

#### [MODIFY] [page.tsx](file:///Users/pzps0964713/Documents/github/self-stucture-v1/src/app/(dashboard)/research/page.tsx)

**六入口 Workspace Hub**，移除 Thread Grid 主體和 PubTimeline 主體：

**主要區塊**：六個 `WorkspaceCard` 入口卡片  
**次要區塊**（首頁下方）：
- 近期研究議題 `ResearchIssueCard` × 3
- 即將截止 CFP `EventCard` × 3
- 最近新增資料來源列表 × 3
- AI 建議下一步（mock 靜態卡片）

移除原本的 `ModuleGuard` wrapper（由 layout.tsx 統一處理）。

---

### Component: 新建元件

#### [NEW] `src/components/research/workspace-card.tsx`
Hub 入口卡片，Props：`title`, `description`, `href`, `icon`, `stats: {label, value}[]`, `accentColor`  
設計：大圖示、標題、副標、底部指標數字、hover 有 border glow 效果

#### [NEW] `src/components/research/research-issue-card.tsx`
取代 `thread-card.tsx`，Props 改用 `ResearchIssue` 型別  
顯示：主研究問題、status badge、keywords、關聯物件計數

#### [NEW] `src/components/research/source-card.tsx`
顯示：sourceType badge、title、authors、year、reliability badge、status

#### [NEW] `src/components/research/writing-project-card.tsx`
顯示：writingType、status（彩色 badge）、target venue、latest feedback 摘要

#### [NEW] `src/components/research/idea-capture-card.tsx`
顯示：ideaType badge、title、body preview、sourceContext、action buttons（連到議題 / 轉問題 / 封存）

#### [NEW] `src/components/research/event-card.tsx`
顯示：eventType badge、name、deadline countdown、fitScore、suggestedParticipationMode

#### [NEW] `src/components/research/academic-person-card.tsx`
顯示：role badge、name、affiliation、country、researchAreas chips、conversationAngles

#### [NEW] `src/components/research/concept-card.tsx`
顯示：name、shortDefinition、status badge、aliases、confusionPoints count

#### [NEW] `src/components/research/ai-feedback-panel.tsx`
顯示：perspective badge、summary、collapsible strengths/weaknesses/questions/actionItems

#### [NEW] `src/components/research/research-object-link-list.tsx`
顯示：entity 的所有 ResearchLink，按 relationType 分組

---

### Component: 六個子模組頁面

#### [NEW] `src/app/(dashboard)/research/issues/page.tsx`
Issue Card Grid + 新增表單（inline）+ filter（status）

#### [NEW] `src/app/(dashboard)/research/issues/[issueId]/page.tsx`
Eight-tab layout：Overview / Questions / Concepts / Linked Sources / Writing Projects / Events / People / Links

#### [NEW] `src/app/(dashboard)/research/writing/page.tsx`
Writing Project Card Grid + 新增按鈕 + filter（type, status）

#### [NEW] `src/app/(dashboard)/research/writing/[writingProjectId]/page.tsx`
三欄式佈局（左：Outline / 中：Draft mock editor / 右：AI Feedback Panel）

#### [NEW] `src/app/(dashboard)/research/exploration/page.tsx`
快速捕捉表單 + Idea Card 列表 + filter + action buttons

#### [NEW] `src/app/(dashboard)/research/sources/page.tsx`
Source Card Grid + multi-filter（type, reliability, status, region）

#### [NEW] `src/app/(dashboard)/research/events/page.tsx`
Event Card Grid + CFP 截止倒數時間軸

#### [NEW] `src/app/(dashboard)/research/people/page.tsx`
Academic Person Card Grid，grouped by role

---

### Component: Legacy 相容

#### [MODIFY] `src/app/(dashboard)/research/[threadId]/page.tsx`
移除 `ModuleGuard` wrapper（由 layout.tsx 統一）  
頁面最頂部加入升級 Banner  
保留所有現有功能不動

---

## 驗證計劃

### 自動化測試

```bash
pnpm build
```

驗證重點：
1. 舊型別 `ResearchThread`, `ResearchIdea`, `ResearchMaterial` 等不受影響
2. 新型別 `ResearchLink`, `ResearchIssue`, `ResearchIdeaV2` 等正確導出
3. 所有新路由頁面 TypeScript 編譯通過
4. `research/layout.tsx` 不造成 `ModuleGuard` 雙重包覆問題
5. Prisma build artifacts 存在且不影響編譯

### 手動驗證清單

- [ ] `/research` 顯示六入口卡片，非 Thread Grid
- [ ] `/research/issues` 顯示 Issue 卡片，可新增
- [ ] `/research/issues/[id]` 顯示八個 Tab，非父子資料依附
- [ ] `/research/writing/[id]` 顯示三欄式寫作視圖
- [ ] `/research/exploration` 想法可不選 issue 直接新增
- [ ] `/research/sources` source 無需綁定 issue
- [ ] `/research/events` CFP 截止倒數正確
- [ ] 停用 research 模組 → 所有 `/research/*` 被 layout.tsx ModuleGuard 統一攔截
- [ ] 舊 `/research/[threadId]` 頁面仍能進入，顯示升級 Banner

---

## Open Questions

> [!IMPORTANT]
> **Q1：舊 [threadId] route 是否要 redirect？**  
> 目前計劃：保留舊頁面 + Banner 提示升級。  
> 若要直接 redirect，可改為 `redirect('/research/issues/${threadId}')` 。

> [!IMPORTANT]
> **Q2：寫作頁面是否需要 rich text editor？**  
> 目前計劃：mock textarea。若需 tiptap，請告知，需額外安裝。

> [!NOTE]
> **Q3：[issueId] 詳情頁的 Tab 中是否支援直接新增物件？**  
> 例如在 Issues 頁面直接新增 Question / Concept / 連結 Source？

> [!NOTE]
> **Q4：Server Actions（`src/lib/actions/`）是否在本次同步更新？**  
> 建議：本次先以 mock data + context 完成前端重構，Server Actions 串接留 Phase 3。

---

## 實作時程估算

| Step | 內容 | 估時 |
|---|---|---|
| 1 | 型別擴充（research.ts） | 30 min |
| 2 | Mock Data 追加 | 30 min |
| 3 | Context 擴充 | 30 min |
| 4 | research/layout.tsx 新建 | 5 min |
| 5 | 首頁重構（research/page.tsx） | 45 min |
| 6a | 10 個新元件建立 | 60 min |
| 6b | issues/ 頁面（list + detail） | 45 min |
| 6c | writing/ 頁面（list + 三欄 detail） | 45 min |
| 6d | exploration/ 頁面 | 30 min |
| 6e | sources/ 頁面 | 30 min |
| 6f | events/ 頁面 | 30 min |
| 6g | people/ 頁面 | 30 min |
| 7 | [threadId] legacy 相容 Banner | 10 min |
| 8 | pnpm build 驗證修正 | 30 min |
| **Total** | | **~7 小時** |
