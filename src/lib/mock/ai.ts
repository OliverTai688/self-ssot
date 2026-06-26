import type {
  AICard,
  Entity,
  MockProject,
  PublicOutput,
} from "@/types/ai"

// ─── Entities ───────────────────────────────────────────────────────────────

export const mockEntities: Entity[] = [
  { id: "e1", type: "project", name: "Lisa Q2 Dashboard", description: "客戶 Lisa 的 Q2 數據儀表板專案" },
  { id: "e2", type: "project", name: "Allen NGO Proposal", description: "Allen 的非營利組織提案設計" },
  { id: "e3", type: "contact", name: "Lisa Chen", description: "客戶，品牌設計需求，主要透過 LINE 聯絡" },
  { id: "e4", type: "contact", name: "Mark Wu", description: "商會理事，長期合作夥伴" },
  { id: "e5", type: "contact", name: "Allen Huang", description: "NGO 客戶，對提案時程敏感" },
  { id: "e6", type: "research", name: "永續供應鏈研究", description: "ESG 框架下的供應鏈透明度研究主題" },
]

// ─── Mock Projects ───────────────────────────────────────────────────────────

export const mockProjects: MockProject[] = [
  {
    id: "p1",
    name: "Lisa Q2 Dashboard",
    clientName: "Lisa Chen",
    status: "active",
    visibility: "client_shared",
    dueDate: "2026-05-20",
    description: "Q2 業績數據視覺化儀表板，需包含銷售趨勢、客戶分層、渠道分析三個模組。",
    tasksDone: 6,
    tasksTotal: 10,
  },
  {
    id: "p2",
    name: "Allen NGO Proposal",
    clientName: "Allen Huang",
    status: "active",
    visibility: "internal",
    dueDate: "2026-05-12",
    description: "非營利組織年度計畫書設計，含封面、執行摘要、財務規劃三部分。",
    tasksDone: 2,
    tasksTotal: 8,
  },
  {
    id: "p3",
    name: "商會活動 Banner 系列",
    clientName: "Mark Wu",
    status: "active",
    visibility: "internal",
    dueDate: "2026-05-08",
    description: "5 月份商會三場活動的 Banner 設計，含社群版與印刷版。",
    tasksDone: 4,
    tasksTotal: 6,
  },
]

// ─── Morning Brief Cards ─────────────────────────────────────────────────────

export const mockMorningBriefCards: AICard[] = [
  {
    id: "mb1",
    title: "Allen 的提案明天截止",
    summary: "Allen NGO Proposal 距離截止日只剩 6 天，目前完成度只有 25%。財務規劃部分還沒開始動工，這是最重的未完成項目。",
    aiType: "morning_brief",
    confidence: "high",
    relatedEntityId: "e2",
    relatedEntityType: "project",
    relatedEntityName: "Allen NGO Proposal",
    reasoning: "根據專案截止日 2026-05-12 與現有任務完成率（2/8），AI 判斷此專案有延遲風險。財務規劃模組尚未建立任何任務，屬於零進度狀態。",
    recommendation: "今天先打開 Allen NGO Proposal，把財務規劃拆成 3 個子任務，哪怕只是草稿也算推進。",
    sources: [
      { label: "Allen NGO Proposal", href: "/work/p2", type: "project" },
      { label: "任務完成率 2/8", type: "task" },
      { label: "截止日 2026-05-12", type: "calendar" },
    ],
    status: "pending",
    createdAt: "2026-05-06T07:30:00Z",
  },
  {
    id: "mb2",
    title: "Lisa 昨天傳了訊息，還沒回覆",
    summary: "Lisa 昨天下午透過 LINE 詢問儀表板的銷售趨勢模組何時完成，目前訊息已讀未回超過 18 小時。",
    aiType: "morning_brief",
    confidence: "high",
    relatedEntityId: "e3",
    relatedEntityType: "contact",
    relatedEntityName: "Lisa Chen",
    reasoning: "從最近的擷取記錄中偵測到 LINE 訊息來自 Lisa，內容包含「銷售趨勢」、「什麼時候」等查詢型關鍵字，且超過 12 小時未有後續 capture 表示回覆。",
    recommendation: "給 Lisa 一個簡短的進度更新，即使只是「本週五前完成初版」也能降低她的焦慮。",
    sources: [
      { label: "LINE 訊息 · 2026-05-05 14:22", type: "line" },
      { label: "Lisa Chen", href: "/chamber", type: "contact" },
      { label: "Lisa Q2 Dashboard", href: "/work/p1", type: "project" },
    ],
    status: "pending",
    createdAt: "2026-05-06T07:30:00Z",
  },
  {
    id: "mb3",
    title: "商會 Banner 後天需要送印",
    summary: "Mark 的商會活動 Banner 設計本週四需要送印，目前 3 張已完成、2 張待審稿，還有 1 張尚未開始。",
    aiType: "morning_brief",
    confidence: "medium",
    relatedEntityId: "p3",
    relatedEntityType: "project",
    relatedEntityName: "商會活動 Banner 系列",
    reasoning: "截止日為 2026-05-08（後天），任務完成率 4/6，AI 判斷剩餘工作量在 2 天內可完成，但需要今天確認審稿狀態。",
    recommendation: "確認 Mark 是否已收到兩張待審稿，若還沒審就主動追蹤。",
    sources: [
      { label: "商會活動 Banner 系列", href: "/work/p3", type: "project" },
      { label: "任務完成率 4/6", type: "task" },
      { label: "送印截止日 2026-05-08", type: "calendar" },
    ],
    status: "pending",
    createdAt: "2026-05-06T07:30:00Z",
  },
]

// ─── Triage Cards (pre-seeded inbox) ────────────────────────────────────────

export const mockTriageCards: AICard[] = [
  {
    id: "t1",
    title: "Lisa 反饋：客戶分層模組需要調整色彩",
    summary: "Lisa 透過 LINE 說客戶分層的顏色看起來太相近，在深色背景上難以區分，希望能調高對比度。",
    aiType: "triage",
    triageCategory: "project_note",
    confidence: "high",
    relatedEntityId: "e1",
    relatedEntityType: "project",
    relatedEntityName: "Lisa Q2 Dashboard",
    extractedEntities: ["Lisa Chen", "Q2 Dashboard", "客戶分層"],
    suggestedPlacement: "工作 → Lisa Q2 Dashboard → 任務備註",
    reasoning: "內容包含「客戶」、「design（色彩調整）」、「LINE」等關鍵字，與進行中的 Lisa Q2 Dashboard 高度相關，屬於具體的專案設計反饋。",
    recommendation: "確認後加入 Lisa Q2 Dashboard 的任務備註，並評估是否需要更新設計稿。",
    status: "pending",
    createdAt: "2026-05-05T14:22:00Z",
  },
  {
    id: "t2",
    title: "可能的研究方向：碳足跡揭露與供應鏈透明度",
    summary: "讀到一篇關於 EU 碳邊境調整機制（CBAM）的 thread，其中提到供應鏈揭露要求與我的 ESG 研究方向高度重疊。",
    aiType: "triage",
    triageCategory: "research_idea",
    confidence: "medium",
    relatedEntityId: "e6",
    relatedEntityType: "research",
    relatedEntityName: "永續供應鏈研究",
    extractedEntities: ["CBAM", "碳足跡", "供應鏈透明度", "ESG"],
    suggestedPlacement: "研究 → 永續供應鏈研究 → 研究方向",
    reasoning: "內容包含「research（研究）」、「paper（文獻）」、「thread」等關鍵字，且提及具體的學術/政策文獻，歸類為研究想法。",
    recommendation: "確認後存入研究主題，考慮將 CBAM 作為一個新的子研究方向展開。",
    status: "pending",
    createdAt: "2026-05-05T10:05:00Z",
  },
  {
    id: "t3",
    title: "五月份辦公室耗材花費",
    summary: "購買辦公室文具與印刷耗材，收據金額 NT$1,240，刷卡日期 2026-05-04。",
    aiType: "triage",
    triageCategory: "finance_record",
    confidence: "high",
    extractedEntities: ["NT$1,240", "辦公耗材", "2026-05-04"],
    suggestedPlacement: "財務 → 支出記錄 → 五月",
    reasoning: "內容包含「receipt（收據）」、「amount（金額）」、「expense（支出）」等關鍵字，且有明確金額與日期，歸類為財務記錄。",
    recommendation: "確認金額與分類正確後存入財務模組。注意：AI 不會自動記錄財務，需要你確認。",
    status: "pending",
    createdAt: "2026-05-04T16:45:00Z",
  },
  {
    id: "t4",
    title: "連續三天工作到凌晨，需要注意睡眠",
    summary: "過去三天的工作記錄顯示結束時間都在凌晨 1 點後，睡眠時間可能不足 6 小時。",
    aiType: "triage",
    triageCategory: "life_care",
    confidence: "medium",
    extractedEntities: ["睡眠", "工作時間"],
    suggestedPlacement: "生活 → 健康追蹤 → 睡眠",
    reasoning: "內容包含「body（身體）」、「exercise（作息）」等相關語境，反映生活節律問題，歸類為生活照護。",
    recommendation: "記下這個模式，考慮設定一個晚間結束工作的提醒。",
    status: "pending",
    createdAt: "2026-05-05T23:55:00Z",
  },
  {
    id: "t5",
    title: "Mark 生日下週五",
    summary: "商會理事 Mark 的生日是 2026-05-15，目前沒有任何提醒或計畫。",
    aiType: "triage",
    triageCategory: "memory",
    confidence: "high",
    relatedEntityId: "e4",
    relatedEntityType: "contact",
    relatedEntityName: "Mark Wu",
    extractedEntities: ["Mark Wu", "2026-05-15", "生日"],
    suggestedPlacement: "關係 → Mark Wu → 重要日期",
    reasoning: "內容包含「birthday（生日）」、「friend（朋友/關係）」等關鍵字，屬於人際關係中的重要記憶節點。",
    recommendation: "存入 Mark 的聯絡資料，並考慮在 2026-05-14 設一個提醒。",
    status: "pending",
    createdAt: "2026-05-05T09:00:00Z",
  },
]

// ─── Project Pulse Cards ──────────────────────────────────────────────────────

export const mockProjectPulseCards: AICard[] = [
  {
    id: "pp1",
    title: "Lisa Q2 Dashboard — 進度穩健，但一個模組需要關注",
    summary: "整體進度 60%，銷售趨勢與渠道分析已完成，客戶分層模組因設計反饋需要修改。",
    aiType: "project_pulse",
    confidence: "high",
    relatedEntityId: "e1",
    relatedEntityType: "project",
    relatedEntityName: "Lisa Q2 Dashboard",
    reasoning: "任務完成率 6/10（60%），距截止日 14 天，屬於可控範圍。但客戶分層模組的最新 capture 顯示有設計反饋待處理，若不處理可能影響後續審稿。",
    recommendation: "今天處理色彩對比度問題，明天讓 Lisa 確認後再進入最終輸出階段。",
    status: "confirmed",
    createdAt: "2026-05-06T07:00:00Z",
    pulseSummary: {
      inProgress: ["客戶分層模組色彩修改", "最終輸出格式確認"],
      openQuestions: ["Lisa 是否需要 PDF 版本還是只要 Web 版本？", "數據更新頻率是否需要自動化？"],
      blockers: ["客戶分層設計反饋待處理（影響後續審稿）"],
      todayPriorities: ["處理色彩對比度問題", "傳更新進度給 Lisa"],
      progressPercent: 60,
      daysUntilDue: 14,
    },
  },
  {
    id: "pp2",
    title: "Allen NGO Proposal — 進度落後，需要加速",
    summary: "整體進度 25%，距截止日只剩 6 天，財務規劃部分尚未開始，存在延遲風險。",
    aiType: "project_pulse",
    confidence: "high",
    relatedEntityId: "e2",
    relatedEntityType: "project",
    relatedEntityName: "Allen NGO Proposal",
    reasoning: "任務完成率 2/8（25%），距截止日 2026-05-12 僅 6 天。以目前進度速率，若不加速將無法準時交付。財務規劃模組尚無任何進度，風險最高。",
    recommendation: "立即拆解財務規劃為子任務，今明兩天集中完成，必要時與 Allen 溝通可能的範圍縮減。",
    status: "confirmed",
    createdAt: "2026-05-06T07:00:00Z",
    pulseSummary: {
      inProgress: ["執行摘要初稿", "封面設計"],
      openQuestions: ["財務規劃需要幾年的預算數字？", "Allen 是否有既有的財務格式要求？"],
      blockers: ["財務規劃模組零進度（截止前 6 天）", "尚未收到 Allen 的財務數據"],
      todayPriorities: ["聯絡 Allen 確認財務數據", "拆解財務規劃子任務"],
      progressPercent: 25,
      daysUntilDue: 6,
    },
  },
]

// ─── Public Output Drafts ────────────────────────────────────────────────────

export const mockPublicOutputs: PublicOutput[] = [
  {
    id: "po1",
    aiCardId: "pp1",
    internalInsight: "Lisa Q2 Dashboard 整體進度 60%，客戶分層模組因設計反饋稍微落後，預計明天可修正完畢。Lisa 昨天有透過 LINE 詢問進度，建議今天主動更新她。",
    clientSafeContent: "Hi Lisa，Q2 Dashboard 整體進展順利，目前已完成銷售趨勢與渠道分析兩個模組。客戶分層部分我們正在根據您的色彩反饋進行調整，預計明天（5/7）可以給您看更新版本。如有其他想法歡迎隨時告知！",
    status: "draft",
    entityId: "e1",
    entityType: "project",
    createdAt: "2026-05-06T08:00:00Z",
  },
  {
    id: "po2",
    aiCardId: "pp2",
    internalInsight: "Allen 的提案嚴重落後，財務規劃完全沒有進展。客戶端溝通需要謹慎措辭，不要讓 Allen 感覺到恐慌，但要盡快拿到財務數據。",
    clientSafeContent: "Hi Allen，提案目前封面與執行摘要的部分都在順利推進！為了確保財務規劃部分的準確性，方便在 5/7 前提供貴組織近三年的財務概況資料嗎？這樣我們才能在截止日前完成高品質的提案。謝謝！",
    status: "draft",
    entityId: "e2",
    entityType: "project",
    createdAt: "2026-05-06T08:00:00Z",
  },
]

// ─── Combined getter ─────────────────────────────────────────────────────────

export function getAllMockCards(): AICard[] {
  return [
    ...mockMorningBriefCards,
    ...mockTriageCards,
    ...mockProjectPulseCards,
  ]
}
