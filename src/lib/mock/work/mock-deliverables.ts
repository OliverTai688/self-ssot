import type { ProjectDeliverable } from "@/types/work"

export const mockDeliverables: ProjectDeliverable[] = [
  // ─── p1: Lisa Q2 Dashboard ────────────────────────────────────────────────
  {
    id: "df1-p1", projectId: "p1", type: "folder", parentId: null,
    title: "設計稿",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-09T09:00:00Z",
  },
  {
    id: "df2-p1", projectId: "p1", type: "folder", parentId: "df1-p1",
    title: "已交付",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-09T09:10:00Z",
  },
  {
    id: "df3-p1", projectId: "p1", type: "folder", parentId: "df1-p1",
    title: "進行中",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-09T09:20:00Z",
  },
  {
    id: "d1-p1", projectId: "p1", type: "file", parentId: "df2-p1",
    title: "銷售趨勢模組（網頁版）",
    description: "完整的銷售趨勢視覺化模組，含月度趨勢折線圖與年度對比",
    status: "approved", visibility: "client_visible",
    deliveredAt: "2026-05-03",
    createdAt: "2026-04-10T09:00:00Z",
  },
  {
    id: "d2-p1", projectId: "p1", type: "file", parentId: "df2-p1",
    title: "渠道分析模組（網頁版）",
    description: "各銷售渠道的佔比分析與趨勢，含圓餅圖與橫條圖",
    status: "delivered", visibility: "client_visible",
    deliveredAt: "2026-05-07",
    createdAt: "2026-04-15T09:00:00Z",
  },
  {
    id: "d3-p1", projectId: "p1", type: "file", parentId: "df3-p1",
    title: "客戶分層模組（修改版）",
    description: "依 RFM 分析結果分層的客戶視覺化，色彩待修改",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-20T09:00:00Z",
  },

  // ─── p2: Allen NGO Proposal ───────────────────────────────────────────────
  {
    id: "df1-p2", projectId: "p2", type: "folder", parentId: null,
    title: "計畫書稿件",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-19T09:00:00Z",
  },
  {
    id: "d1-p2", projectId: "p2", type: "file", parentId: "df1-p2",
    title: "計畫書封面設計稿",
    description: "2026 年度 NGO 計畫書封面，簡潔路線",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-20T09:00:00Z",
  },
  {
    id: "d2-p2", projectId: "p2", type: "file", parentId: "df1-p2",
    title: "執行摘要文件",
    description: "年度計畫執行摘要，含目標、策略、預期成果",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-22T09:00:00Z",
  },

  // ─── p3: 商會活動 Banner 系列 ──────────────────────────────────────────────
  {
    id: "df1-p3", projectId: "p3", type: "folder", parentId: null,
    title: "活動一",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-20T09:00:00Z",
  },
  {
    id: "df2-p3", projectId: "p3", type: "folder", parentId: null,
    title: "活動二",
    status: "draft", visibility: "internal",
    createdAt: "2026-04-21T09:00:00Z",
  },
  {
    id: "d1-p3", projectId: "p3", type: "file", parentId: "df1-p3",
    title: "Banner 正式檔案",
    description: "社群版 1200x628 + 印刷版 A3，含 AI / PDF",
    status: "approved", visibility: "client_visible",
    deliveredAt: "2026-05-02",
    createdAt: "2026-04-21T09:00:00Z",
  },
  {
    id: "d2-p3", projectId: "p3", type: "file", parentId: "df2-p3",
    title: "Banner（審稿中）",
    description: "社群版 1200x628，印刷版待確認",
    status: "delivered", visibility: "client_visible",
    deliveredAt: "2026-05-06",
    createdAt: "2026-04-22T09:00:00Z",
  },

  // ─── p5: 商會年刊 2025 ────────────────────────────────────────────────────
  {
    id: "df1-p5", projectId: "p5", type: "folder", parentId: null,
    title: "完稿文件",
    status: "draft", visibility: "internal",
    createdAt: "2026-01-09T09:00:00Z",
  },
  {
    id: "d1-p5", projectId: "p5", type: "file", parentId: "df1-p5",
    title: "2025 年刊完稿印刷檔",
    description: "100 頁年刊 PDF + 印刷廠規格 AI 原始檔案",
    status: "approved", visibility: "client_visible",
    deliveredAt: "2026-03-28",
    createdAt: "2026-01-10T09:00:00Z",
  },
]
