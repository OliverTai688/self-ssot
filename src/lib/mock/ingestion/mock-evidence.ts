import type { Evidence } from "@/types/ingestion"

export const mockEvidence: Evidence[] = [
  // Evidence for atp-1 (LINE → project_context)
  {
    id: "ev-1",
    rawSourceItemId: "rsi-1",
    normalizedContentId: "nc-1",
    excerpt: "Banner 的尺寸能改成 1200×628 嗎？我們打算發在 Facebook",
    reasonUsed: "包含設計尺寸調整請求，與進行中的 Lisa Q2 Dashboard 專案相關",
    createdAt: "2026-05-05T14:23:00Z",
  },
  {
    id: "ev-2",
    rawSourceItemId: "rsi-1",
    normalizedContentId: "nc-1",
    excerpt: "顏色也想調整一下，上次給的那版背景太暗",
    reasonUsed: "設計反饋，涉及視覺修改請求，支持 project_context 分類",
    createdAt: "2026-05-05T14:23:00Z",
  },

  // Evidence for atp-2 (Google Doc → research_mapping)
  {
    id: "ev-3",
    rawSourceItemId: "rsi-2",
    normalizedContentId: "nc-2",
    excerpt: "探討 EU 碳邊境調整機制（CBAM）對台灣出口企業的影響",
    reasonUsed: "研究主題核心命題，與永續供應鏈研究方向高度吻合",
    createdAt: "2026-05-04T18:33:00Z",
  },
  {
    id: "ev-4",
    rawSourceItemId: "rsi-2",
    normalizedContentId: "nc-4",
    excerpt: "受訪企業中僅 23% 已建立完整的供應鏈碳足跡追蹤系統",
    reasonUsed: "初步實證數據，適合作為研究論點的量化支撐",
    createdAt: "2026-05-04T18:33:00Z",
  },

  // Evidence for atp-3 (Markdown → project_context for Allen)
  {
    id: "ev-5",
    rawSourceItemId: "rsi-3",
    normalizedContentId: "nc-5",
    excerpt: "Allen NGO 年度計畫書截止日為 2026-05-12，財務規劃目前零進度",
    reasonUsed: "明確的專案進度問題，截止日迫近且關鍵模組未啟動",
    createdAt: "2026-05-05T18:08:00Z",
  },
  {
    id: "ev-6",
    rawSourceItemId: "rsi-3",
    normalizedContentId: "nc-6",
    excerpt: "今天聯絡 Allen 索取財務數據，明天完成執行摘要初稿",
    reasonUsed: "具體行動項目，支持 project_context 分類並提供建議優先順序",
    createdAt: "2026-05-05T18:08:00Z",
  },

  // Evidence for atp-4 (Receipt → finance_draft)
  {
    id: "ev-7",
    rawSourceItemId: "rsi-4",
    normalizedContentId: "nc-7",
    excerpt: "商家：文具王 ｜ 金額：NT$1,240 ｜ 日期：2026-05-04",
    reasonUsed: "明確的財務交易記錄，含商家、金額、日期三要素，適合財務記錄",
    createdAt: "2026-05-04T16:48:00Z",
  },

  // Evidence for atp-5 (Audio → life_care)
  {
    id: "ev-8",
    rawSourceItemId: "rsi-5",
    normalizedContentId: "nc-8",
    excerpt: "連續三天都工作到凌晨一點多，睡眠大概只有五到六小時",
    reasonUsed: "具體的睡眠不足描述，連續三天模式表示需要關注",
    createdAt: "2026-05-05T23:57:00Z",
  },
  {
    id: "ev-9",
    rawSourceItemId: "rsi-5",
    normalizedContentId: "nc-8",
    excerpt: "這週完全沒動",
    reasonUsed: "運動缺乏的自我觀察，與睡眠問題共同指向生活節律失衡",
    createdAt: "2026-05-05T23:57:00Z",
  },

  // Evidence for atp-6 (Manual → memory_capture)
  {
    id: "ev-10",
    rawSourceItemId: "rsi-6",
    normalizedContentId: "nc-9",
    excerpt: "Mark 生日下週五（5/15）",
    reasonUsed: "明確的重要日期與人名，屬於關係記憶節點",
    createdAt: "2026-05-06T09:01:00Z",
  },
]

export function getEvidenceForItems(rawSourceItemIds: string[]): Evidence[] {
  return mockEvidence.filter((e) => rawSourceItemIds.includes(e.rawSourceItemId))
}
