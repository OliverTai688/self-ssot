import type { AITriageProposal } from "@/types/ingestion"

export const mockTriageProposals: AITriageProposal[] = [
  // atp-1: LINE message from Lisa → project_context
  {
    id: "atp-1",
    rawSourceItemIds: ["rsi-1"],
    evidenceIds: ["ev-1", "ev-2"],
    aiType: "project_context",
    detectedType: "客戶設計反饋（LINE 訊息）",
    extractedEntities: ["Lisa Chen", "Q2 Dashboard", "Facebook Banner", "1200×628"],
    suggestedEntityType: "project",
    suggestedEntityId: "p1",
    suggestedPlacement: "工作 → Lisa Q2 Dashboard → 設計反饋",
    summary: "Lisa 透過 LINE 提出兩項具體的 Banner 修改需求：尺寸從現有規格改為 1200×628（Facebook 適用），以及調亮背景色以提升對比度。",
    recommendation: "確認後新增為 Lisa Q2 Dashboard 的設計任務，今天回覆 Lisa 預計修改時間。",
    reasoning: "LINE 訊息內容包含明確的設計規格（1200×628）與視覺反饋（背景太暗），與進行中的 Lisa Q2 Dashboard 高度相關，屬於客戶端的具體修改請求。",
    confidence: "high",
    status: "pending",
    createdAt: "2026-05-05T14:23:00Z",
  },

  // atp-2: Google Doc → research_mapping
  {
    id: "atp-2",
    rawSourceItemIds: ["rsi-2"],
    evidenceIds: ["ev-3", "ev-4"],
    aiType: "research_mapping",
    detectedType: "研究草稿（Google Docs）",
    extractedEntities: ["CBAM", "供應鏈透明度", "ESG", "台灣製造業", "碳足跡"],
    suggestedEntityType: "research",
    suggestedEntityId: "e6",
    suggestedPlacement: "研究 → 永續供應鏈研究 → 核心文獻",
    summary: "這份 Google Doc 是一篇關於 EU CBAM 對台灣供應鏈影響的研究初稿，含背景、方法、初步實證數據三個部分，總計約 3,200 字。",
    recommendation: "確認後存入永續供應鏈研究主題，初步發現中的 23% 數據可作為論文量化論點。",
    reasoning: "文件標題、摘要與內文均包含研究型關鍵詞（CBAM、供應鏈揭露、混合研究法），且具備完整學術結構，與現有研究主題高度吻合。",
    confidence: "high",
    status: "pending",
    createdAt: "2026-05-04T18:33:00Z",
  },

  // atp-3: Markdown meeting notes → project_context for Allen
  {
    id: "atp-3",
    rawSourceItemIds: ["rsi-3"],
    evidenceIds: ["ev-5", "ev-6"],
    aiType: "project_context",
    detectedType: "專案會議記錄（Markdown）",
    extractedEntities: ["Allen NGO", "財務規劃", "2026-05-12", "執行摘要"],
    suggestedEntityType: "project",
    suggestedEntityId: "p2",
    suggestedPlacement: "工作 → Allen NGO Proposal → 會議記錄",
    summary: "這份會議記錄確認了 Allen NGO 提案的截止日（5/12）、三個章節結構，以及財務規劃零進度的高風險狀態。包含 4 個具體行動項目。",
    recommendation: "確認後存入 Allen NGO Proposal，並將「聯絡 Allen 索取財務數據」列為今日第一優先任務。",
    reasoning: "Markdown 文件的標題、結構與內容明確對應 Allen NGO Proposal 專案，包含截止日期與行動項目，屬於專案情境更新。",
    confidence: "high",
    status: "pending",
    createdAt: "2026-05-05T18:08:00Z",
  },

  // atp-4: Receipt → finance_draft
  {
    id: "atp-4",
    rawSourceItemIds: ["rsi-4"],
    evidenceIds: ["ev-7"],
    aiType: "finance_draft",
    detectedType: "購物收據（圖片）",
    extractedEntities: ["NT$1,240", "文具王", "2026-05-04", "辦公耗材"],
    suggestedEntityType: "finance",
    suggestedEntityId: null,
    suggestedPlacement: "財務 → 支出記錄 → 2026年05月",
    summary: "收據顯示 2026-05-04 在文具王以信用卡消費 NT$1,240，品項為辦公文具與印刷耗材。",
    recommendation: "確認金額與分類正確後記入財務支出。注意：AI 不會自動記錄財務，需要你手動確認。",
    reasoning: "圖片經 OCR 識別，提取到商家名稱、消費金額、日期與付款方式，符合財務記錄的基本要素。",
    confidence: "high",
    status: "pending",
    createdAt: "2026-05-04T16:48:00Z",
  },

  // atp-5: Audio → life_care
  {
    id: "atp-5",
    rawSourceItemIds: ["rsi-5"],
    evidenceIds: ["ev-8", "ev-9"],
    aiType: "life_care",
    detectedType: "語音備忘（健康狀況）",
    extractedEntities: ["睡眠", "三天", "凌晨一點", "運動"],
    suggestedEntityType: "life",
    suggestedEntityId: null,
    suggestedPlacement: "生活 → 健康追蹤 → 睡眠記錄",
    summary: "語音備忘記錄了連續三天睡眠不足（5–6 小時）、工作至凌晨的模式，以及本週完全未運動的情況。",
    recommendation: "記錄此生活節律警訊，考慮設定晚間工作提醒（23:00 停止），並為本週安排至少一次運動。",
    reasoning: "語音內容的情感語境（「不太好」、「長期下去」）與具體時間數據（凌晨一點、五到六小時）共同指向生活節律問題，需要關注。",
    confidence: "medium",
    status: "pending",
    createdAt: "2026-05-05T23:57:00Z",
  },

  // atp-6: Manual message → memory_capture
  {
    id: "atp-6",
    rawSourceItemIds: ["rsi-6"],
    evidenceIds: ["ev-10"],
    aiType: "memory_capture",
    detectedType: "手動備忘（人際記憶）",
    extractedEntities: ["Mark Wu", "2026-05-15", "生日"],
    suggestedEntityType: "contact",
    suggestedEntityId: "e4",
    suggestedPlacement: "關係 → Mark Wu → 重要日期",
    summary: "記錄了商會理事 Mark Wu 的生日日期（2026-05-15，下週五），並有提前準備的意願。",
    recommendation: "存入 Mark Wu 的聯絡記錄，並在 2026-05-14 設定提醒。",
    reasoning: "內容包含明確的人名（Mark）、日期（5/15）與關係情境（生日）。這是一個高價值的關係記憶節點，遺漏可能影響人際關係。",
    confidence: "high",
    status: "pending",
    createdAt: "2026-05-06T09:01:00Z",
  },
]

export function getProposalsForItems(rawSourceItemIds: string[]): AITriageProposal[] {
  return mockTriageProposals.filter((p) =>
    p.rawSourceItemIds.some((id) => rawSourceItemIds.includes(id))
  )
}
