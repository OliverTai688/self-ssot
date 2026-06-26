# 紀錄分頁 + 脈搏時間線計畫

## 目標

### 1. 紀錄區域 (Work tab → 紀錄)
- **AI / 手動切換 Tab**：區分 AI 自動擷取的紀錄與使用者手動輸入的紀錄
- **排序模式**：最新優先 / 最舊優先 / 依階段對照
- **依階段對照**：將紀錄按照專案時間線的各階段分組呈現，可比對紀錄發生時間與專案進度

### 2. 脈搏 tab 新增區域
- **專案時間線**：依照 `startedAt` / `dueAt` 與目前 `phase` 推算各階段時間窗口
  - 各階段顯示：名稱、日期範圍、狀態 (done / active / upcoming)、里程碑節點
- **檔案結構（交付物）**：DeliverableTree 整合到脈搏 tab

---

## 資料模型變更

### `src/types/work.ts`

```typescript
// 新增
export type NoteOrigin = "ai" | "manual"

// ProjectNote 新增欄位
export interface ProjectNote {
  // ... 現有欄位 ...
  origin: NoteOrigin   // "ai" = AI 自動生成, "manual" = 使用者手動輸入
}

// 時間線相關
export interface ProjectMilestone {
  id: string
  title: string
  date: string          // ISO date
  status: "upcoming" | "completed"
}

export interface ProjectPhaseNode {
  phase: ProjectPhase
  label: string
  startDate: string     // ISO date
  endDate: string       // ISO date
  status: "done" | "active" | "upcoming"
  milestones: ProjectMilestone[]
}

export interface ProjectTimeline {
  projectId: string
  phases: ProjectPhaseNode[]
  generatedAt: string
}
```

### Mock 資料變更

- `mock-notes.ts`：所有現有紀錄加 `origin: "manual"`，新增 3 筆 AI 生成紀錄
- `mock-timeline.ts`：新檔案，包含 p1/p2/p3 的 ProjectTimeline 資料
- `mock/work/index.ts`：re-export `mockProjectTimelines`

---

## 元件變更

### `NoteTimeline`（更新）

新增兩個控制項：
1. **Origin Tab**：`全部 | AI生成 | 手動輸入`
2. **Sort Select**：`最新 | 最舊 | 依階段`

依階段模式：
- 接收 `timeline?: ProjectTimeline` prop
- 將 notes 按 `createdAt` 對照 phase 的 `startDate`/`endDate` 分組
- 每個 phase 顯示一個 header + 該階段的 notes

### `NoteItem`（更新）

在 source badge 旁新增 AI origin 小標籤（Sparkles icon, 僅當 `origin === "ai"`）

### `ProjectTimelineSection`（新元件）

路徑：`src/components/work/timeline/project-timeline-section.tsx`

- 垂直時間線，5 個 phase 節點
- 每個節點：phase label、日期範圍、狀態圓點、里程碑清單
- active phase 高亮

### `ProjectPulseSection`（更新）

在現有 AI 分析內容下方新增兩個可收合區塊：
1. **專案時間線**（使用 ProjectTimelineSection）
2. **交付物結構**（使用輕量版 DeliverableTree，只讀不增刪）

Props 新增：
```typescript
timeline?: ProjectTimeline
deliverables?: ProjectDeliverable[]
```

### `work/[projectId]/page.tsx`（更新）

- 從 `mockProjectTimelines` 取得 `timeline`
- 傳給 `ProjectPulseSection` 和 `NoteTimeline`

---

## 實作順序

1. types/work.ts
2. mock-notes.ts（加 origin）
3. mock-timeline.ts（新建）
4. mock/work/index.ts（export）
5. note-item.tsx（AI badge）
6. note-timeline.tsx（tabs + sort）
7. project-timeline-section.tsx（新建）
8. project-pulse-section.tsx（加 timeline + deliverables）
9. project detail page（wire up）
