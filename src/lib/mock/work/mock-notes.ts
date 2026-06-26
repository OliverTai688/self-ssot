import type { ProjectNote } from "@/types/work"

export const mockNotes: ProjectNote[] = [
  // ─── p1: Lisa Q2 Dashboard ────────────────────────────────────────────────
  {
    id: "n1-p1", projectId: "p1",
    title: "Lisa 色彩反饋",
    body: "Lisa 說客戶分層的顏色看起來太相近，在深色背景上難以區分，希望能調高對比度。要確保 WCAG AA 標準。",
    source: "line", visibility: "internal", origin: "manual", isPinned: false,
    createdAt: "2026-05-05T14:22:00Z", updatedAt: "2026-05-05T14:22:00Z",
  },
  {
    id: "n2-p1", projectId: "p1",
    title: "5/6 客戶會議紀錄",
    body: "Lisa 確認三個模組範圍不變。PDF 格式待定，可能需要互動式版本，但她說先交靜態版就好。截止日維持 5/20。",
    source: "meeting", visibility: "internal", origin: "manual", isPinned: true,
    createdAt: "2026-05-06T11:00:00Z", updatedAt: "2026-05-06T11:00:00Z",
  },
  {
    id: "n3-p1", projectId: "p1",
    title: "Lisa 詢問互動式版本",
    body: "Lisa 來信：想請問銷售趨勢是否可以做成可互動的版本？現階段預算是否支持？",
    source: "email", visibility: "internal", origin: "manual", isPinned: false,
    createdAt: "2026-05-04T09:30:00Z", updatedAt: "2026-05-04T09:30:00Z",
  },
  {
    id: "n4-p1", projectId: "p1",
    body: "技術評估：互動式圖表（D3 / Echarts）需要額外 2 天。建議先交靜態版本，後續有需求再升級。",
    source: "internal", visibility: "internal", origin: "manual", isPinned: false,
    createdAt: "2026-05-04T14:00:00Z", updatedAt: "2026-05-04T14:00:00Z",
  },
  // AI-generated notes for p1
  {
    id: "n5-p1", projectId: "p1",
    title: "AI 風險偵測：審稿階段延遲風險",
    body: "根據近期 LINE 與 Email 訊息分析，Lisa 對互動式版本有明確期待，但技術評估顯示需額外 2 天。建議盡早書面確認靜態版交付範圍，避免審稿階段產生範疇蔓延。",
    source: "internal", visibility: "internal", origin: "ai", isPinned: false,
    createdAt: "2026-05-07T08:00:00Z", updatedAt: "2026-05-07T08:00:00Z",
  },
  {
    id: "n6-p1", projectId: "p1",
    title: "AI 摘要：執行階段主要決策",
    body: "執行階段（4/22–5/9）關鍵決策：1) 確認三模組範圍不變；2) 靜態版優先，互動功能列入後續需求；3) 顏色對比度需符合 WCAG AA。本階段尚未解決：互動版本預算確認。",
    source: "internal", visibility: "internal", origin: "ai", isPinned: false,
    createdAt: "2026-05-09T07:30:00Z", updatedAt: "2026-05-09T07:30:00Z",
  },

  // ─── p2: Allen NGO Proposal ───────────────────────────────────────────────
  {
    id: "n1-p2", projectId: "p2",
    title: "Allen 財務數據延遲",
    body: "Allen 說財務數據要等理事會開完會才能給，最快 5/9 才能提供。可能需要調整最終交付範圍。",
    source: "line", visibility: "internal", origin: "manual", isPinned: true,
    createdAt: "2026-05-07T16:00:00Z", updatedAt: "2026-05-07T16:00:00Z",
  },
  {
    id: "n2-p2", projectId: "p2",
    title: "啟動會議紀錄",
    body: "封面風格決定走簡潔路線，避免過度設計。Allen 希望整體視覺傳達「可信賴、專業、接地氣」的感覺。",
    source: "meeting", visibility: "internal", origin: "manual", isPinned: false,
    createdAt: "2026-04-16T10:00:00Z", updatedAt: "2026-04-16T10:00:00Z",
  },
  {
    id: "n3-p2", projectId: "p2",
    title: "AI 風險警示：截止日壓力",
    body: "截止日 5/12 距今僅 4 天，但財務數據最早 5/9 到位，財務規劃章節實際可用工時不足 3 天。建議立即向 Allen 確認是否接受不含財務數據的初版，或協商延後。",
    source: "internal", visibility: "internal", origin: "ai", isPinned: false,
    createdAt: "2026-05-08T09:00:00Z", updatedAt: "2026-05-08T09:00:00Z",
  },

  // ─── p3: 商會活動 Banner 系列 ──────────────────────────────────────────────
  {
    id: "n1-p3", projectId: "p3",
    title: "Mark 截止日提前",
    body: "Mark 說印刷活動三的截止日期提前到 5/7，需要確認印刷廠的收檔時間。要盡快完成活動三的設計。",
    source: "line", visibility: "internal", origin: "manual", isPinned: false,
    createdAt: "2026-05-05T09:00:00Z", updatedAt: "2026-05-05T09:00:00Z",
  },
  {
    id: "n2-p3", projectId: "p3",
    body: "提醒自己：這套 Banner 風格統一，後續可以整理成商業提案模板，省去下次類似專案的設計時間。",
    source: "internal", visibility: "internal", origin: "manual", isPinned: false,
    createdAt: "2026-05-06T22:00:00Z", updatedAt: "2026-05-06T22:00:00Z",
  },
  {
    id: "n3-p3", projectId: "p3",
    title: "AI 建議：模板化機會",
    body: "此專案的 Banner 風格一致性高，建議在完工後將設計規範（色票、字型、版式）整理為可重用模板，預估下次類似專案可節省 30% 前置設計時間。",
    source: "internal", visibility: "internal", origin: "ai", isPinned: false,
    createdAt: "2026-05-07T08:30:00Z", updatedAt: "2026-05-07T08:30:00Z",
  },
]
