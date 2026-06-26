import type { ProjectTask } from "@/types/work"

export const mockTasks: ProjectTask[] = [
  // ─── p1: Lisa Q2 Dashboard ────────────────────────────────────────────────
  {
    id: "t1-p1", projectId: "p1",
    title: "修改客戶分層色彩對比度",
    status: "in_progress", priority: 1, visibility: "internal", source: "triage",
    createdAt: "2026-05-05T14:00:00Z",
  },
  {
    id: "t2-p1", projectId: "p1",
    title: "確認 Lisa 的輸出格式需求（PDF 或 Web）",
    status: "todo", priority: 1, visibility: "client_visible", source: "client_request",
    createdAt: "2026-05-04T10:00:00Z",
  },
  {
    id: "t3-p1", projectId: "p1",
    title: "銷售趨勢模組 → 完成輸出",
    status: "done", priority: 2, visibility: "client_visible", source: "manual",
    completedAt: "2026-05-03T18:00:00Z",
    createdAt: "2026-04-10T09:00:00Z",
  },
  {
    id: "t4-p1", projectId: "p1",
    title: "渠道分析模組完成輸出",
    status: "done", priority: 2, visibility: "client_visible", source: "manual",
    completedAt: "2026-05-07T17:00:00Z",
    createdAt: "2026-04-15T09:00:00Z",
  },
  {
    id: "t5-p1", projectId: "p1",
    title: "最終版本 PDF 輸出",
    status: "todo", priority: 2, visibility: "client_visible", source: "manual",
    dueAt: "2026-05-19",
    createdAt: "2026-04-20T09:00:00Z",
  },
  {
    id: "t6-p1", projectId: "p1",
    title: "評估是否需要數據自動更新機制",
    status: "todo", priority: 3, visibility: "internal", source: "ai_suggested",
    createdAt: "2026-05-06T07:00:00Z",
  },

  // ─── p2: Allen NGO Proposal ───────────────────────────────────────────────
  {
    id: "t1-p2", projectId: "p2",
    title: "封面設計初稿",
    status: "in_progress", priority: 1, visibility: "internal", source: "manual",
    createdAt: "2026-04-20T09:00:00Z",
  },
  {
    id: "t2-p2", projectId: "p2",
    title: "執行摘要文字整理",
    status: "in_progress", priority: 1, visibility: "internal", source: "manual",
    createdAt: "2026-04-22T09:00:00Z",
  },
  {
    id: "t3-p2", projectId: "p2",
    title: "向 Allen 確認財務數據格式",
    status: "blocked", priority: 1, visibility: "internal", source: "ai_suggested",
    createdAt: "2026-05-06T07:00:00Z",
  },
  {
    id: "t4-p2", projectId: "p2",
    title: "財務規劃模組設計",
    status: "todo", priority: 1, visibility: "internal", source: "manual",
    createdAt: "2026-04-25T09:00:00Z",
  },
  {
    id: "t5-p2", projectId: "p2",
    title: "附錄整理與格式化",
    status: "todo", priority: 3, visibility: "internal", source: "manual",
    createdAt: "2026-04-25T09:00:00Z",
  },

  // ─── p3: 商會活動 Banner 系列 ──────────────────────────────────────────────
  {
    id: "t1-p3", projectId: "p3",
    title: "活動一 Banner（社群版）",
    status: "done", priority: 2, visibility: "internal", source: "manual",
    completedAt: "2026-05-01T17:00:00Z",
    createdAt: "2026-04-21T09:00:00Z",
  },
  {
    id: "t2-p3", projectId: "p3",
    title: "活動一 Banner（印刷版）",
    status: "done", priority: 2, visibility: "internal", source: "manual",
    completedAt: "2026-05-02T17:00:00Z",
    createdAt: "2026-04-21T09:00:00Z",
  },
  {
    id: "t3-p3", projectId: "p3",
    title: "活動二 Banner（社群版）",
    status: "done", priority: 2, visibility: "internal", source: "manual",
    completedAt: "2026-05-04T17:00:00Z",
    createdAt: "2026-04-22T09:00:00Z",
  },
  {
    id: "t4-p3", projectId: "p3",
    title: "活動二 Banner（印刷版）",
    status: "todo", priority: 2, visibility: "internal", source: "manual",
    dueAt: "2026-05-07",
    createdAt: "2026-04-22T09:00:00Z",
  },
  {
    id: "t5-p3", projectId: "p3",
    title: "活動三 Banner（社群版）",
    status: "todo", priority: 1, visibility: "internal", source: "manual",
    dueAt: "2026-05-07",
    createdAt: "2026-04-23T09:00:00Z",
  },
  {
    id: "t6-p3", projectId: "p3",
    title: "確認 Mark 審稿狀態",
    status: "todo", priority: 1, visibility: "internal", source: "ai_suggested",
    createdAt: "2026-05-06T07:00:00Z",
  },
]
