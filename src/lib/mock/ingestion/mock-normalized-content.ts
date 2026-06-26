import type { NormalizedContent } from "@/types/ingestion"

export const mockNormalizedContent: NormalizedContent[] = [
  // rsi-1: LINE message → single message_text
  {
    id: "nc-1",
    rawSourceItemId: "rsi-1",
    contentType: "message_text",
    text: "嗨！那個 Banner 的尺寸能改成 1200×628 嗎？我們打算發在 Facebook，麻煩了！另外顏色也想調整一下，上次給的那版背景太暗。",
    orderIndex: 0,
    heading: null,
    tokenEstimate: 52,
    metadata: { sender: "Lisa Chen", platform: "line" },
    createdAt: "2026-05-05T14:22:35Z",
  },

  // rsi-2: Google Doc → 3 document chunks
  {
    id: "nc-2",
    rawSourceItemId: "rsi-2",
    contentType: "document_chunk",
    text: "本研究探討 EU 碳邊境調整機制（CBAM）對台灣出口企業的影響。隨著歐盟在 2026 年全面實施 CBAM，台灣製造業者面臨碳足跡揭露的新要求，特別是鋼鐵、水泥、鋁、化肥、電力五大品項。",
    orderIndex: 0,
    heading: "研究背景與動機",
    tokenEstimate: 95,
    metadata: { section: "introduction" },
    createdAt: "2026-05-04T18:32:00Z",
  },
  {
    id: "nc-3",
    rawSourceItemId: "rsi-2",
    contentType: "document_chunk",
    text: "本研究採用混合研究法，結合文獻分析與深度訪談。訪談對象涵蓋 12 家受 CBAM 影響的台灣中小企業，以及 3 位歐盟貿易政策研究員。分析框架以供應鏈揭露準備度（SCDR）指標為核心。",
    orderIndex: 1,
    heading: "研究方法",
    tokenEstimate: 88,
    metadata: { section: "methodology" },
    createdAt: "2026-05-04T18:32:05Z",
  },
  {
    id: "nc-4",
    rawSourceItemId: "rsi-2",
    contentType: "document_chunk",
    text: "初步發現顯示，受訪企業中僅 23% 已建立完整的供應鏈碳足跡追蹤系統。主要障礙包括：供應商資料不透明、量化工具不熟悉、以及缺乏內部 ESG 專業人才。",
    orderIndex: 2,
    heading: "初步發現",
    tokenEstimate: 76,
    metadata: { section: "preliminary_findings" },
    createdAt: "2026-05-04T18:32:10Z",
  },

  // rsi-3: Markdown meeting notes → 2 chunks
  {
    id: "nc-5",
    rawSourceItemId: "rsi-3",
    contentType: "document_chunk",
    text: "Allen NGO 年度計畫書截止日為 2026-05-12。會議確認三個主要章節：執行摘要、計畫說明、財務規劃。財務規劃目前零進度，為最高風險項目。需要 Allen 提供近三年財務數據。",
    orderIndex: 0,
    heading: "背景與現況",
    tokenEstimate: 81,
    metadata: { source: "meeting_notes" },
    createdAt: "2026-05-05T18:07:00Z",
  },
  {
    id: "nc-6",
    rawSourceItemId: "rsi-3",
    contentType: "document_chunk",
    text: "行動項目：(1) 今天聯絡 Allen 索取財務數據，(2) 明天完成執行摘要初稿，(3) 週四送 Allen 第一版審閱，(4) 若數據未到考慮縮減財務章節範圍。",
    orderIndex: 1,
    heading: "行動項目",
    tokenEstimate: 69,
    metadata: { source: "meeting_notes" },
    createdAt: "2026-05-05T18:07:05Z",
  },

  // rsi-4: Receipt → receipt_extraction
  {
    id: "nc-7",
    rawSourceItemId: "rsi-4",
    contentType: "receipt_extraction",
    text: "商家：文具王 \n金額：NT$1,240 \n日期：2026-05-04 \n品項：辦公文具、印刷耗材 \n付款方式：信用卡",
    orderIndex: 0,
    heading: null,
    tokenEstimate: 38,
    metadata: { merchant: "文具王", amount: 1240, currency: "TWD", date: "2026-05-04" },
    createdAt: "2026-05-04T16:47:00Z",
  },

  // rsi-5: Audio → transcript
  {
    id: "nc-8",
    rawSourceItemId: "rsi-5",
    contentType: "transcript",
    text: "連續三天都工作到凌晨一點多，今天感覺特別疲倦。睡眠大概只有五到六小時，長期這樣下去不太好。應該要設個提醒，晚上十一點之前要停下來。運動的事也一直拖，這週完全沒動。",
    orderIndex: 0,
    heading: null,
    tokenEstimate: 78,
    metadata: { durationSeconds: 42, language: "zh-TW" },
    createdAt: "2026-05-05T23:56:30Z",
  },

  // rsi-6: Manual message → message_text
  {
    id: "nc-9",
    rawSourceItemId: "rsi-6",
    contentType: "message_text",
    text: "剛想到，Mark 生日下週五（5/15），應該要準備個小禮物或至少傳個訊息，不要忘記。",
    orderIndex: 0,
    heading: null,
    tokenEstimate: 40,
    metadata: { inputMethod: "keyboard" },
    createdAt: "2026-05-06T09:00:05Z",
  },
]

export function getNormalizedForItem(rawSourceItemId: string): NormalizedContent[] {
  return mockNormalizedContent
    .filter((nc) => nc.rawSourceItemId === rawSourceItemId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
}
