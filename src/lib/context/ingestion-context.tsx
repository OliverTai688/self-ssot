"use client"

import * as React from "react"
import { mockSourceConnections } from "@/lib/mock/ingestion/mock-source-connections"
import { mockRawSourceItems } from "@/lib/mock/ingestion/mock-raw-source-items"
import { mockNormalizedContent } from "@/lib/mock/ingestion/mock-normalized-content"
import { mockEvidence } from "@/lib/mock/ingestion/mock-evidence"
import { mockTriageProposals } from "@/lib/mock/ingestion/mock-triage-proposals"
import { mockLINEChats } from "@/lib/mock/ingestion/mock-line-structure"
import { mockDriveRoot } from "@/lib/mock/ingestion/mock-drive-structure"
import { mockGmailThreads } from "@/lib/mock/ingestion/mock-gmail-structure"
import type { LINEChat, DriveItem, GmailThread } from "@/types/sync-scope"
import { toggleDriveItemInTree } from "@/types/sync-scope"
import type {
  AITriageProposal,
  AITriageType,
  DecisionType,
  Evidence,
  NormalizedContent,
  NormalizedContentType,
  ProcessingStatus,
  ProposalStatus,
  RawSourceItem,
  RawSourceType,
  SourceConnection,
  UserDecision,
  ResourceNode,
} from "@/types/ingestion"
import type { Confidence } from "@/types/ai"
import { useResearch } from "@/lib/context/research-context"
import { useWorkflow } from "@/lib/context/workflow-context"
import { useMockDataMode } from "@/lib/context/mock-data-mode-context"
import { triageTypeToDispatch, formatRoutingLabel } from "@/lib/workflow/ingestion-bridge"

// ─── Keyword → aiType mapping ─────────────────────────────────────────────────

const KEYWORD_RULES: Array<{ keywords: string[]; aiType: AITriageType; detectedType: string }> = [
  {
    keywords: ["client", "line", "banner", "design", "project", "客戶", "設計", "專案", "提案", "banner"],
    aiType: "project_context",
    detectedType: "專案相關筆記",
  },
  {
    keywords: ["research", "paper", "thread", "literature", "研究", "論文", "文獻", "期刊", "投稿"],
    aiType: "research_mapping",
    detectedType: "研究想法或文獻",
  },
  {
    keywords: ["receipt", "amount", "payment", "expense", "收據", "金額", "付款", "支出", "費用", "發票"],
    aiType: "finance_draft",
    detectedType: "財務記錄",
  },
  {
    keywords: ["cold", "exercise", "body", "doctor", "health", "sleep", "感冒", "運動", "身體", "醫生", "健康", "睡眠"],
    aiType: "life_care",
    detectedType: "生活與健康記錄",
  },
  {
    keywords: ["friend", "dinner", "memory", "birthday", "朋友", "晚餐", "記憶", "回憶", "生日", "聚會"],
    aiType: "memory_capture",
    detectedType: "人際記憶",
  },
]

function detectAIType(text: string): { aiType: AITriageType; detectedType: string } {
  const lower = text.toLowerCase()
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return { aiType: rule.aiType, detectedType: rule.detectedType }
    }
  }
  return { aiType: "triage", detectedType: "一般內容" }
}

function detectConfidence(text: string, aiType: AITriageType): Confidence {
  if (aiType === "triage") return "low"
  const lower = text.toLowerCase()
  const rule = KEYWORD_RULES.find((r) => r.aiType === aiType)
  const matchCount = rule?.keywords.filter((kw) => lower.includes(kw.toLowerCase())).length ?? 0
  return matchCount >= 2 ? "high" : "medium"
}

const PLACEMENT_MAP: Record<AITriageType, string> = {
  project_context: "工作 → 專案任務備註",
  research_mapping: "研究 → 研究方向",
  finance_draft: "財務 → 支出記錄",
  life_care: "生活 → 健康追蹤",
  memory_capture: "關係 → 重要記憶",
  triage: "收件匣 → 待分類",
}

const REASONING_MAP: Record<AITriageType, string> = {
  project_context: "內容包含專案相關關鍵字，屬於具體的工作記錄或客戶反饋。",
  research_mapping: "內容包含研究相關關鍵字，屬於學術研究的想法或文獻線索。",
  finance_draft: "內容包含財務相關關鍵字，屬於財務記錄。確認前 AI 不會自動儲存。",
  life_care: "內容包含身體或生活健康相關關鍵字，屬於生活節律或健康狀態的記錄。",
  memory_capture: "內容包含人際關係的重要節點，值得保存為關係記憶。",
  triage: "無法從內容中識別出明確分類，暫時歸為一般項目。",
}

const RECOMMENDATION_MAP: Record<AITriageType, string> = {
  project_context: "確認後加入對應專案的任務備註。",
  research_mapping: "確認後存入對應的研究主題。",
  finance_draft: "確認金額與分類正確後存入財務模組。AI 不會自動記錄財務，需要你確認。",
  life_care: "記下這個身體或生活狀態，考慮是否需要設定追蹤或提醒。",
  memory_capture: "存入對應聯絡人的重要日期或記憶，考慮是否需要設定未來提醒。",
  triage: "請手動確認此項目的分類和存放位置。",
}

// ─── Toast notification ───────────────────────────────────────────────────────

export interface ToastMessage {
  id: string
  text: string
}

// ─── Context value ────────────────────────────────────────────────────────────

interface IngestionContextValue {
  sourceConnections: SourceConnection[]
  rawSourceItems: RawSourceItem[]
  normalizedContents: NormalizedContent[]
  evidences: Evidence[]
  proposals: AITriageProposal[]
  userDecisions: UserDecision[]
  toasts: ToastMessage[]
  dismissToast: (id: string) => void

  // Resource tree
  resourceNodes: ResourceNode[]
  addResourceNode: (node: Omit<ResourceNode, "id" | "createdAt">) => void
  updateResourceNode: (id: string, updates: Partial<ResourceNode>) => void
  deleteResourceNode: (id: string) => void

  // Sync structure state
  lineChats: LINEChat[]
  driveRoot: DriveItem[]
  gmailThreads: GmailThread[]
  toggleLineChat: (id: string) => void
  toggleDriveItem: (id: string) => void
  toggleGmailThread: (id: string) => void

  // Pipeline actions
  addManualCapture: (content: string) => void
  mockSyncLINE: () => void
  mockSyncGmail: () => void
  mockSyncRSS: () => void
  mockImportGoogleDoc: () => void
  mockUploadMarkdown: (parentId?: string | null) => void
  mockUploadMedia: (mediaType: "image" | "audio", parentId?: string | null) => void
  addUrlCapture: (urls: string[]) => void
  runMockAnalysis: (rawSourceItemId: string) => void
  resolveProposal: (id: string, decision: DecisionType, editedSummary?: string) => void

  // Derived
  pendingProposalCount: number
  getNormalizedForItem: (rawSourceItemId: string) => NormalizedContent[]
  getEvidenceForProposal: (proposalId: string) => Evidence[]
  getProposalsForItem: (rawSourceItemId: string) => AITriageProposal[]
}

const IngestionContext = React.createContext<IngestionContextValue | null>(null)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeTimestamp(): string {
  return new Date().toISOString()
}

function makeRawSourceItem(
  overrides: Partial<RawSourceItem> & Pick<RawSourceItem, "id" | "sourceConnectionId" | "sourceType">
): RawSourceItem {
  return {
    externalId: null,
    title: null,
    rawText: null,
    previewText: null,
    mediaUrl: null,
    mimeType: null,
    authorName: null,
    senderId: null,
    conversationId: null,
    capturedAt: makeTimestamp(),
    importedAt: makeTimestamp(),
    processingStatus: "processed",
    aiStatus: "proposed",
    contentHash: null,
    metadata: {},
    privacyLevel: "private",
    ...overrides,
  }
}

function makeNormalizedContent(
  overrides: Partial<NormalizedContent> &
    Pick<NormalizedContent, "id" | "rawSourceItemId" | "contentType" | "text">
): NormalizedContent {
  return {
    orderIndex: 0,
    heading: null,
    tokenEstimate: Math.ceil(overrides.text.length / 4),
    metadata: {},
    createdAt: makeTimestamp(),
    ...overrides,
  }
}

function makeEvidence(
  overrides: Partial<Evidence> &
    Pick<Evidence, "id" | "rawSourceItemId" | "normalizedContentId" | "excerpt" | "reasonUsed">
): Evidence {
  return {
    createdAt: makeTimestamp(),
    ...overrides,
  }
}

function makeProposal(
  rawSourceItemId: string,
  evidenceId: string,
  text: string
): AITriageProposal {
  const { aiType, detectedType } = detectAIType(text)
  const confidence = detectConfidence(text, aiType)
  return {
    id: makeId("atp"),
    rawSourceItemIds: [rawSourceItemId],
    evidenceIds: [evidenceId],
    aiType,
    detectedType,
    extractedEntities: [],
    suggestedEntityType: null,
    suggestedEntityId: null,
    suggestedPlacement: PLACEMENT_MAP[aiType],
    summary: text.length > 120 ? text.slice(0, 117) + "…" : text,
    recommendation: RECOMMENDATION_MAP[aiType],
    reasoning: REASONING_MAP[aiType],
    confidence,
    status: "pending",
    createdAt: makeTimestamp(),
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function IngestionProvider({ children }: { children: React.ReactNode }) {
  const { isMockDataEnabled } = useMockDataMode()
  const { addMaterial, threads } = useResearch()
  const { dispatch: workflowDispatch } = useWorkflow()
  const [sourceConnections, setSourceConnections] = React.useState<SourceConnection[]>(mockSourceConnections)
  const [lineChats, setLineChats] = React.useState<LINEChat[]>(mockLINEChats)
  const [driveRoot, setDriveRoot] = React.useState<DriveItem[]>(mockDriveRoot)
  const [gmailThreads, setGmailThreads] = React.useState<GmailThread[]>(mockGmailThreads)
  const [rawSourceItems, setRawSourceItems] = React.useState<RawSourceItem[]>(mockRawSourceItems)
  const [normalizedContents, setNormalizedContents] = React.useState<NormalizedContent[]>(mockNormalizedContent)
  const [evidences, setEvidences] = React.useState<Evidence[]>(mockEvidence)
  const [proposals, setProposals] = React.useState<AITriageProposal[]>(mockTriageProposals)
  const [userDecisions, setUserDecisions] = React.useState<UserDecision[]>([])
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])
  const [resourceNodes, setResourceNodes] = React.useState<ResourceNode[]>([
    { id: "rn-1", parentId: null, type: "folder", title: "專案參考資料", createdAt: makeTimestamp() },
    { id: "rn-2", parentId: "rn-1", type: "link", title: "GitHub Repo", url: "https://github.com/example/repo", createdAt: makeTimestamp() },
  ])

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = React.useCallback((text: string) => {
    const id = makeId("toast")
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => dismissToast(id), 5000)
  }, [dismissToast])

  const rejectMockWrite = React.useCallback((label: string) => {
    pushToast(`正式模式已啟用：${label} 仍是 mock/local-only，已停止建立假資料。請接上 Supabase-backed BFF 後再執行。`)
  }, [pushToast])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isMockDataEnabled) {
        setSourceConnections(mockSourceConnections)
        setLineChats(mockLINEChats)
        setDriveRoot(mockDriveRoot)
        setGmailThreads(mockGmailThreads)
        setRawSourceItems(mockRawSourceItems)
        setNormalizedContents(mockNormalizedContent)
        setEvidences(mockEvidence)
        setProposals(mockTriageProposals)
        setResourceNodes([
          { id: "rn-1", parentId: null, type: "folder", title: "專案參考資料", createdAt: makeTimestamp() },
          { id: "rn-2", parentId: "rn-1", type: "link", title: "GitHub Repo", url: "https://github.com/example/repo", createdAt: makeTimestamp() },
        ])
        return
      }

      setSourceConnections([])
      setLineChats([])
      setDriveRoot([])
      setGmailThreads([])
      setRawSourceItems([])
      setNormalizedContents([])
      setEvidences([])
      setProposals([])
      setUserDecisions([])
      setResourceNodes([])
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isMockDataEnabled])

  // ── Sync structure toggles ───────────────────────────────────────────────

  const toggleLineChat = React.useCallback((id: string) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("LINE 選取狀態")
      return
    }
    setLineChats((prev) => prev.map((c) => (c.id === id ? { ...c, isSelected: !c.isSelected } : c)))
  }, [isMockDataEnabled, rejectMockWrite])

  const toggleDriveItem = React.useCallback((id: string) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Drive 選取狀態")
      return
    }
    setDriveRoot((prev) => toggleDriveItemInTree(prev, id))
  }, [isMockDataEnabled, rejectMockWrite])

  const toggleGmailThread = React.useCallback((id: string) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Gmail 選取狀態")
      return
    }
    setGmailThreads((prev) => prev.map((t) => (t.id === id ? { ...t, isSelected: !t.isSelected } : t)))
  }, [isMockDataEnabled, rejectMockWrite])

  // ── Mock Sync Gmail ───────────────────────────────────────────────────────

  const mockSyncGmail = React.useCallback(() => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Gmail mock 同步")
      return
    }
    const selected = gmailThreads.filter((t) => t.isSelected)

    const targets = selected.length > 0 ? selected : gmailThreads.filter((t) => t.isUnread).slice(0, 3)

    const newItems: RawSourceItem[] = []
    const newNc: NormalizedContent[] = []
    const newEv: Evidence[] = []
    const newProposals: AITriageProposal[] = []

    for (const thread of targets) {
      const rsiId = makeId("rsi")
      const ncId = makeId("nc")
      const evId = makeId("ev")

      const fullText = thread.messages
        .map((m) => `寄件人：${m.from}\n${m.snippet}`)
        .join("\n\n---\n\n")

      const rsi = makeRawSourceItem({
        id: rsiId,
        sourceConnectionId: "sc-gmail",
        sourceType: "gmail_email",
        title: thread.subject,
        rawText: fullText,
        previewText: thread.snippet.length > 60 ? thread.snippet.slice(0, 57) + "…" : thread.snippet,
        authorName: thread.from,
        conversationId: thread.id,
        metadata: {
          gmailThreadId: thread.id,
          fromEmail: thread.fromEmail,
          messageCount: thread.messageCount,
          labels: thread.labels.join(","),
          platform: "gmail",
        },
      })

      const nc = makeNormalizedContent({
        id: ncId,
        rawSourceItemId: rsiId,
        contentType: "message_text",
        text: fullText,
        heading: thread.subject,
        metadata: { sender: thread.from, platform: "gmail" },
      })

      const ev = makeEvidence({
        id: evId,
        rawSourceItemId: rsiId,
        normalizedContentId: ncId,
        excerpt: thread.snippet,
        reasonUsed: "Gmail 信件串完整內容",
      })

      const proposal = makeProposal(rsiId, evId, fullText)
      proposal.detectedType = `Email（${proposal.detectedType}）`

      newItems.push(rsi)
      newNc.push(nc)
      newEv.push(ev)
      newProposals.push(proposal)
    }

    setRawSourceItems((prev) => [...newItems, ...prev])
    setNormalizedContents((prev) => [...newNc, ...prev])
    setEvidences((prev) => [...newEv, ...prev])
    setProposals((prev) => [...newProposals, ...prev])
    pushToast(`Gmail 同步完成。${targets.length} 封信件匯入，${targets.length} 則 AI 審閱建議已生成。`)
  }, [gmailThreads, isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Manual capture pipeline ───────────────────────────────────────────────

  const addManualCapture = React.useCallback((content: string) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("AI Input 本機 mock 擷取")
      return
    }
    if (!content.trim()) return

    const rsiId = makeId("rsi")
    const ncId = makeId("nc")
    const evId = makeId("ev")
    const now = makeTimestamp()

    const rsi = makeRawSourceItem({
      id: rsiId,
      sourceConnectionId: "sc-manual",
      sourceType: "manual_message",
      rawText: content,
      previewText: content.length > 60 ? content.slice(0, 57) + "…" : content,
      capturedAt: now,
      importedAt: now,
    })

    const nc = makeNormalizedContent({
      id: ncId,
      rawSourceItemId: rsiId,
      contentType: "message_text",
      text: content,
    })

    const ev = makeEvidence({
      id: evId,
      rawSourceItemId: rsiId,
      normalizedContentId: ncId,
      excerpt: content.length > 80 ? content.slice(0, 77) + "…" : content,
      reasonUsed: "使用者手動輸入的完整內容作為分類依據",
    })

    const proposal = makeProposal(rsiId, evId, content)

    setRawSourceItems((prev) => [rsi, ...prev])
    setNormalizedContents((prev) => [nc, ...prev])
    setEvidences((prev) => [ev, ...prev])
    setProposals((prev) => [proposal, ...prev])
    pushToast("已擷取為原始來源。AI 生成了 1 則審閱建議。")
  }, [isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Mock Sync LINE ────────────────────────────────────────────────────────

  const mockSyncLINE = React.useCallback(() => {
    if (!isMockDataEnabled) {
      rejectMockWrite("LINE mock 同步")
      return
    }
    const selected = lineChats.filter((c) => c.isSelected)

    // Fall back to hardcoded data when nothing selected
    const messages: Array<{ text: string; author: string; chatId?: string; chatName?: string; chatType?: string }> =
      selected.length > 0
        ? selected.flatMap((chat) =>
            chat.recentMessages.map((m) => ({
              text: m.text,
              author: m.authorName,
              chatId: chat.id,
              chatName: chat.name,
              chatType: chat.type,
            }))
          )
        : [
            { text: "Mark 說下週四商會聚餐，問我能不能去，需要回覆他。", author: "Mark Wu" },
            { text: "Allen 傳來說他有一份舊的財務表格可以提供作為參考，問我要不要。", author: "Allen Huang" },
            { text: "有個研究夥伴推薦我一篇關於碳揭露框架的 paper，說很值得看。", author: "研究夥伴 Cathy" },
          ]

    const newItems: RawSourceItem[] = []
    const newNc: NormalizedContent[] = []
    const newEv: Evidence[] = []
    const newProposals: AITriageProposal[] = []

    for (const msg of messages) {
      const rsiId = makeId("rsi")
      const ncId = makeId("nc")
      const evId = makeId("ev")

      const rsi = makeRawSourceItem({
        id: rsiId,
        sourceConnectionId: "sc-line",
        sourceType: "line_message",
        rawText: msg.text,
        previewText: msg.text.length > 60 ? msg.text.slice(0, 57) + "…" : msg.text,
        authorName: msg.author,
        conversationId: msg.chatId ?? null,
        metadata: {
          ...(msg.chatId    && { lineGroupId:   msg.chatId }),
          ...(msg.chatName  && { lineGroupName: msg.chatName }),
          ...(msg.chatType  && { lineGroupType: msg.chatType }),
          platform: "line",
        },
      })
      const nc = makeNormalizedContent({
        id: ncId,
        rawSourceItemId: rsiId,
        contentType: "message_text",
        text: msg.text,
        metadata: { sender: msg.author, platform: "line" },
      })
      const ev = makeEvidence({
        id: evId,
        rawSourceItemId: rsiId,
        normalizedContentId: ncId,
        excerpt: msg.text,
        reasonUsed: "LINE 訊息完整內容",
      })
      const proposal = makeProposal(rsiId, evId, msg.text)

      newItems.push(rsi)
      newNc.push(nc)
      newEv.push(ev)
      newProposals.push(proposal)
    }

    setRawSourceItems((prev) => [...newItems, ...prev])
    setNormalizedContents((prev) => [...newNc, ...prev])
    setEvidences((prev) => [...newEv, ...prev])
    setProposals((prev) => [...newProposals, ...prev])
    pushToast(`LINE 同步完成。${messages.length} 則訊息匯入，${messages.length} 則 AI 審閱建議已生成。`)
  }, [lineChats, isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Mock Sync RSS ─────────────────────────────────────────────────────────

  const mockSyncRSS = React.useCallback(() => {
    if (!isMockDataEnabled) {
      rejectMockWrite("RSS mock 同步")
      return
    }
    const rssItems: Array<{ title: string; text: string }> = [
      {
        title: "EU CBAM 延伸至供應鏈揭露要求（2026 Q2）",
        text: "歐盟碳邊境調整機制最新修正草案要求進口商揭露完整供應鏈的碳排放數據，預計 2027 年實施，與永續供應鏈研究主題高度相關。",
      },
      {
        title: "台灣 ESG 評比新標準：CDR 數據整合",
        text: "台灣永續發展金融學會公布新版 ESG 評比框架，強制納入碳捕捉與移除（CDR）相關指標，影響上市櫃公司揭露義務。",
      },
    ]

    const newItems: RawSourceItem[] = []
    const newNc: NormalizedContent[] = []
    const newEv: Evidence[] = []
    const newProposals: AITriageProposal[] = []

    for (const item of rssItems) {
      const rsiId = makeId("rsi")
      const ncId = makeId("nc")
      const evId = makeId("ev")

      const rsi = makeRawSourceItem({
        id: rsiId,
        sourceConnectionId: "sc-rss",
        sourceType: "url",
        title: item.title,
        rawText: item.text,
        previewText: item.text.length > 60 ? item.text.slice(0, 57) + "…" : item.text,
      })
      const nc = makeNormalizedContent({
        id: ncId,
        rawSourceItemId: rsiId,
        contentType: "url_excerpt",
        text: item.text,
        heading: item.title,
        metadata: { source: "rss" },
      })
      const ev = makeEvidence({
        id: evId,
        rawSourceItemId: rsiId,
        normalizedContentId: ncId,
        excerpt: item.text,
        reasonUsed: "RSS 文章摘要全文",
      })
      const proposal = makeProposal(rsiId, evId, item.text)

      newItems.push(rsi)
      newNc.push(nc)
      newEv.push(ev)
      newProposals.push(proposal)
    }

    setRawSourceItems((prev) => [...newItems, ...prev])
    setNormalizedContents((prev) => [...newNc, ...prev])
    setEvidences((prev) => [...newEv, ...prev])
    setProposals((prev) => [...newProposals, ...prev])
    pushToast(`RSS 同步完成。${rssItems.length} 篇文章已擷取，${rssItems.length} 則 AI 審閱建議已生成。`)
  }, [isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Mock Import Google Doc ────────────────────────────────────────────────

  const mockImportGoogleDoc = React.useCallback(() => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Google Doc / Drive mock 匯入")
      return
    }
    // Collect selected Drive files (flatten tree, skip folders)
    function collectSelected(items: DriveItem[]): DriveItem[] {
      const result: DriveItem[] = []
      for (const item of items) {
        if (item.isSelected && item.type !== "folder") result.push(item)
        if (item.children) result.push(...collectSelected(item.children))
      }
      return result
    }
    const selectedFiles = collectSelected(driveRoot)

    // Fall back to the original hardcoded doc when nothing selected
    if (selectedFiles.length === 0) {
      const rsiId = makeId("rsi")
      const chunks = [
        { heading: "研究背景",   text: "本文件探討台灣中小企業在數位轉型過程中面臨的資料治理挑戰，特別是 AI 導入後的資料品質問題。" },
        { heading: "初步訪談結果", text: "訪談了 8 家中小企業，發現 75% 的受訪者表示缺乏標準化的資料清理流程，導致 AI 模型訓練效果不穩定。" },
        { heading: "建議方向",   text: "建議從資料治理框架入手，優先建立資料目錄（Data Catalog）與資料品質評分機制，再進行 AI 模型導入。" },
      ]
      const newNcs: NormalizedContent[] = []
      const newEvs: Evidence[] = []
      for (let i = 0; i < chunks.length; i++) {
        const ncId = makeId("nc")
        newNcs.push(makeNormalizedContent({ id: ncId, rawSourceItemId: rsiId, contentType: "document_chunk", text: chunks[i].text, orderIndex: i, heading: chunks[i].heading }))
        newEvs.push(makeEvidence({ id: makeId("ev"), rawSourceItemId: rsiId, normalizedContentId: ncId, excerpt: chunks[i].text.slice(0, 60) + "…", reasonUsed: `第 ${i + 1} 個段落的核心論點` }))
      }
      const rsi = makeRawSourceItem({ id: rsiId, sourceConnectionId: "sc-gdocs", sourceType: "google_doc", title: "台灣中小企業資料治理與 AI 導入研究草稿", previewText: "探討台灣中小企業在數位轉型過程中面臨的資料治理挑戰…", mimeType: "application/vnd.google-apps.document", authorName: "Oliver Tai" })
      const proposal: AITriageProposal = {
        id: makeId("atp"), rawSourceItemIds: [rsiId], evidenceIds: newEvs.map((e) => e.id),
        aiType: "research_mapping", detectedType: "研究草稿（Google Docs）",
        extractedEntities: ["資料治理", "AI 導入", "中小企業", "Data Catalog"],
        suggestedEntityType: "research", suggestedEntityId: null, suggestedPlacement: "研究 → 新研究主題 → 資料治理",
        summary: `這份 Google Doc 是關於台灣中小企業資料治理與 AI 導入的研究草稿，含背景、訪談結果、建議三個部分，共 ${chunks.length} 個段落。`,
        recommendation: "確認後可存入研究主題，或開啟新的研究方向「資料治理與 AI 導入」。",
        reasoning: "文件結構完整，包含研究背景、實證數據（75% 缺乏標準流程）與具體建議，符合研究類文件的特徵。",
        confidence: "high", status: "pending", createdAt: makeTimestamp(),
      }
      setRawSourceItems((prev) => [rsi, ...prev])
      setNormalizedContents((prev) => [...newNcs, ...prev])
      setEvidences((prev) => [...newEvs, ...prev])
      setProposals((prev) => [proposal, ...prev])
      pushToast("Google Doc 匯入完成。3 個文件段落已提取，1 則 AI 審閱建議已生成。")
      return
    }

    // Process each selected file
    const allRsi: RawSourceItem[] = []
    const allNc: NormalizedContent[] = []
    const allEv: Evidence[] = []
    const allProposals: AITriageProposal[] = []

    for (const file of selectedFiles) {
      // Find parent folder name
      function findParentFolder(items: DriveItem[], fileId: string, parentName?: string): string | undefined {
        for (const item of items) {
          if (item.type === "folder" && item.children) {
            if (item.children.some((c) => c.id === fileId)) return item.name
            const found = findParentFolder(item.children, fileId, item.name)
            if (found) return found
          }
        }
        return parentName
      }
      const folderName = findParentFolder(driveRoot, file.id)

      const rsiId = makeId("rsi")
      const rsi = makeRawSourceItem({
        id: rsiId,
        sourceConnectionId: "sc-gdocs",
        sourceType: "google_doc",
        title: file.name,
        previewText: file.previewChunk ? file.previewChunk.slice(0, 60) + "…" : file.name,
        mimeType: file.type === "spreadsheet" ? "application/vnd.google-apps.spreadsheet" : "application/vnd.google-apps.document",
        authorName: file.ownerName,
        metadata: {
          driveFileId:  file.id,
          driveFileName: file.name,
          ...(folderName && { driveFolderName: folderName }),
        },
      })

      const preview = file.previewChunk ?? file.name
      const ncId = makeId("nc")
      const evId = makeId("ev")
      const nc = makeNormalizedContent({ id: ncId, rawSourceItemId: rsiId, contentType: "document_chunk", text: preview, heading: file.name })
      const ev = makeEvidence({ id: evId, rawSourceItemId: rsiId, normalizedContentId: ncId, excerpt: preview.slice(0, 80) + "…", reasonUsed: "Drive 文件主要內容" })

      const { aiType, detectedType } = detectAIType(preview)
      const confidence = detectConfidence(preview, aiType)
      const proposal: AITriageProposal = {
        id: makeId("atp"), rawSourceItemIds: [rsiId], evidenceIds: [evId],
        aiType, detectedType: `${detectedType}（${file.type === "spreadsheet" ? "試算表" : "Google Doc"}）`,
        extractedEntities: [],
        suggestedEntityType: null, suggestedEntityId: null, suggestedPlacement: PLACEMENT_MAP[aiType],
        summary: preview.length > 120 ? preview.slice(0, 117) + "…" : preview,
        recommendation: RECOMMENDATION_MAP[aiType], reasoning: REASONING_MAP[aiType],
        confidence, status: "pending", createdAt: makeTimestamp(),
      }

      allRsi.push(rsi)
      allNc.push(nc)
      allEv.push(ev)
      allProposals.push(proposal)
    }

    setRawSourceItems((prev) => [...allRsi, ...prev])
    setNormalizedContents((prev) => [...allNc, ...prev])
    setEvidences((prev) => [...allEv, ...prev])
    setProposals((prev) => [...allProposals, ...prev])
    pushToast(`Google Drive 同步完成。${selectedFiles.length} 份文件匯入，${allProposals.length} 則 AI 審閱建議已生成。`)
  }, [driveRoot, isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Mock Upload Markdown ──────────────────────────────────────────────────

  const mockUploadMarkdown = React.useCallback((parentId: string | null = null) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Markdown mock 匯入")
      return
    }
    const rsiId = makeId("rsi")
    const title = "2026-05-06 商業計畫討論記錄"
    const sections = [
      { heading: "會議目標", text: "確認下半年商業計畫的執行優先順序，特別是新客戶開發與現有客戶深化兩條線的資源分配。" },
      { heading: "行動項目", text: "1. 下週前整理現有客戶的年度回顧報告。2. 評估是否需要聘請業務助理。3. 設定新客戶目標（Q3 增加 2 個新客戶）。" },
    ]

    const newNcs: NormalizedContent[] = []
    const newEvs: Evidence[] = []

    for (let i = 0; i < sections.length; i++) {
      const ncId = makeId("nc")
      newNcs.push(makeNormalizedContent({
        id: ncId,
        rawSourceItemId: rsiId,
        contentType: "document_chunk",
        text: sections[i].text,
        orderIndex: i,
        heading: sections[i].heading,
      }))
      newEvs.push(makeEvidence({
        id: makeId("ev"),
        rawSourceItemId: rsiId,
        normalizedContentId: ncId,
        excerpt: sections[i].text.slice(0, 60) + "…",
        reasonUsed: `「${sections[i].heading}」段落內容`,
      }))
    }

    const rsi = makeRawSourceItem({
      id: rsiId,
      sourceConnectionId: "sc-local",
      sourceType: "markdown_document",
      title: "2026-05-06 商業計畫討論記錄",
      previewText: "確認下半年商業計畫的執行優先順序…",
      mimeType: "text/markdown",
      authorName: "Oliver Tai",
    })

    const proposal: AITriageProposal = {
      id: makeId("atp"),
      rawSourceItemIds: [rsiId],
      evidenceIds: newEvs.map((e) => e.id),
      aiType: "project_context",
      detectedType: "策略會議記錄（Markdown）",
      extractedEntities: ["新客戶開發", "客戶深化", "業務助理", "Q3"],
      suggestedEntityType: "project",
      suggestedEntityId: null,
      suggestedPlacement: "工作 → 業務計畫 → 會議記錄",
      summary: "會議記錄聚焦下半年客戶策略，包含現有客戶回顧、新客戶目標設定，以及人力評估三個行動項目。",
      recommendation: "確認後存入工作計畫，並將「整理現有客戶年度回顧報告」列為近期任務。",
      reasoning: "Markdown 文件包含明確的業務決策與行動項目，結構化程度高，與工作專案管理情境相關。",
      confidence: "medium",
      status: "pending",
      createdAt: makeTimestamp(),
    }

    setRawSourceItems((prev) => [rsi, ...prev])
    setNormalizedContents((prev) => [...newNcs, ...prev])
    setEvidences((prev) => [...newEvs, ...prev])
    setProposals((prev) => [proposal, ...prev])
    pushToast("Markdown 文件匯入完成。2 個段落已提取，1 則 AI 審閱建議已生成。")

    // Add to resource tree
    setResourceNodes((prev) => [
      ...prev,
      {
        id: makeId("rn"),
        parentId,
        type: "file",
        title: title,
        rawSourceItemId: rsiId,
        createdAt: makeTimestamp(),
      },
    ])
  }, [isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Mock Upload Media ─────────────────────────────────────────────────────

  const mockUploadMedia = React.useCallback((mediaType: "image" | "audio", parentId: string | null = null) => {
    if (!isMockDataEnabled) {
      rejectMockWrite(`${mediaType === "audio" ? "語音" : "圖片"} mock 匯入`)
      return
    }
    const rsiId = makeId("rsi")
    const ncId = makeId("nc")
    const evId = makeId("ev")

    const isAudio = mediaType === "audio"
    const title = isAudio ? "語音備忘 — 商會論壇討論" : "截圖 — 合約草稿"
    const contentType: NormalizedContentType = isAudio ? "transcript" : "image_summary"
    const sourceType: RawSourceType = isAudio ? "audio" : "image"

    const content = isAudio
      ? "今天跟 Mark 討論了一下商會下半年的方向，他提到想辦一場比較正式的論壇，邀請政府代表出席，感覺是個值得深入的方向。"
      : "螢幕截圖顯示一份合約草稿，抬頭為「服務協議書」，日期 2026-05-03，當事人為本公司與客戶甲方，簽署狀態：待確認。"

    const rsi = makeRawSourceItem({
      id: rsiId,
      sourceConnectionId: "sc-manual",
      sourceType,
      title: isAudio ? "語音備忘 — 商會論壇討論" : "截圖 — 合約草稿",
      previewText: content.slice(0, 60) + "…",
      mediaUrl: isAudio ? "/mock/voice-note.m4a" : "/mock/screenshot.png",
      mimeType: isAudio ? "audio/m4a" : "image/png",
    })

    const nc = makeNormalizedContent({
      id: ncId,
      rawSourceItemId: rsiId,
      contentType,
      text: content,
      metadata: isAudio ? { durationSeconds: 35, language: "zh-TW" } : { width: 1920, height: 1080 },
    })

    const ev = makeEvidence({
      id: evId,
      rawSourceItemId: rsiId,
      normalizedContentId: ncId,
      excerpt: content.slice(0, 80) + "…",
      reasonUsed: isAudio ? "語音轉錄的核心內容" : "圖片摘要的關鍵資訊",
    })

    const { aiType, detectedType } = detectAIType(content)
    const confidence = detectConfidence(content, aiType)

    const proposal: AITriageProposal = {
      id: makeId("atp"),
      rawSourceItemIds: [rsiId],
      evidenceIds: [evId],
      aiType,
      detectedType: isAudio ? `語音備忘（${detectedType}）` : `圖片（${detectedType}）`,
      extractedEntities: [],
      suggestedEntityType: null,
      suggestedEntityId: null,
      suggestedPlacement: PLACEMENT_MAP[aiType],
      summary: content,
      recommendation: RECOMMENDATION_MAP[aiType],
      reasoning: isAudio
        ? `語音已轉錄為文字，${REASONING_MAP[aiType]}`
        : `圖片已提取摘要，${REASONING_MAP[aiType]}`,
      confidence,
      status: "pending",
      createdAt: makeTimestamp(),
    }

    setRawSourceItems((prev) => [rsi, ...prev])
    setNormalizedContents((prev) => [nc, ...prev])
    setEvidences((prev) => [ev, ...prev])
    setProposals((prev) => [proposal, ...prev])
    pushToast(
      isAudio
        ? "語音備忘已上傳並轉錄。1 則 AI 審閱建議已生成。"
        : "圖片已上傳並分析。1 則 AI 審閱建議已生成。"
    )

      // Add to resource tree
      setResourceNodes((prev) => [
        ...prev,
        {
          id: makeId("rn"),
          parentId,
          type: "file",
          title: title,
          rawSourceItemId: rsiId,
          createdAt: makeTimestamp(),
        },
      ])
    }, [isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Mock URL capture ──────────────────────────────────────────────────────

  const addUrlCapture = React.useCallback((urls: string[]) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("URL mock 擷取")
      return
    }
    if (urls.length === 0) return

    const newItems: RawSourceItem[] = []
    const newNc: NormalizedContent[] = []
    const newEv: Evidence[] = []
    const newProposals: AITriageProposal[] = []

    for (const url of urls) {
      const rsiId = makeId("rsi")
      const ncId = makeId("nc")
      const evId = makeId("ev")

      // Mocking different metadata based on URL patterns
      let title = "網頁資源"
      let content = "正在分析網頁內容..."
      let aiType: AITriageType = "triage"

      if (url.includes("github.com")) {
        title = "GitHub Repository - " + url.split("/").pop()
        content = "這是一個 GitHub 專案連結，包含原始碼、文件與開發者討論脈絡。"
        aiType = "project_context"
      } else if (url.includes("medium.com") || url.includes("substack.com")) {
        title = "技術文章或研究摘要"
        content = "這是一篇深入探討特定主題的文章，適合歸類到研究主軸或知識庫中。"
        aiType = "research_mapping"
      } else if (url.includes("google.com")) {
        title = "Google 搜尋結果或相關文件"
        content = "包含 Google 搜尋資訊或文件的連結，可能與目前的任務脈絡相關。"
        aiType = "triage"
      }

      const rsi = makeRawSourceItem({
        id: rsiId,
        sourceConnectionId: "sc-url",
        sourceType: "url",
        title: title,
        rawText: url,
        previewText: url,
        metadata: { url },
      })

      const nc = makeNormalizedContent({
        id: ncId,
        rawSourceItemId: rsiId,
        contentType: "url_excerpt",
        text: content,
        heading: title,
      })

      const ev = makeEvidence({
        id: evId,
        rawSourceItemId: rsiId,
        normalizedContentId: ncId,
        excerpt: content,
        reasonUsed: "URL 擷取的核心內容摘要",
      })

      const proposal = makeProposal(rsiId, evId, content)
      proposal.aiType = aiType
      proposal.detectedType = "網頁連結 (" + (aiType === "project_context" ? "專案" : aiType === "research_mapping" ? "研究" : "一般") + ")"

      newItems.push(rsi)
      newNc.push(nc)
      newEv.push(ev)
      newProposals.push(proposal)
    }

    setRawSourceItems((prev) => [...newItems, ...prev])
    setNormalizedContents((prev) => [...newNc, ...prev])
    setEvidences((prev) => [...newEv, ...prev])
    setProposals((prev) => [...newProposals, ...prev])
    pushToast(`${urls.length} 個連結已擷取。AI 正在分析內容...`)

    // Also add to resource tree
    for (let i = 0; i < newItems.length; i++) {
      setResourceNodes((prev) => [
        ...prev,
        {
          id: makeId("rn"),
          parentId: null,
          type: "link",
          title: newItems[i].title || "網頁連結",
          url: urls[i],
          rawSourceItemId: newItems[i].id,
          createdAt: makeTimestamp(),
        },
      ])
    }
  }, [isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Resource Tree Actions ──────────────────────────────────────────────────

  const addResourceNode = React.useCallback((node: Omit<ResourceNode, "id" | "createdAt">) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Resource mock 節點")
      return
    }
    setResourceNodes((prev) => [...prev, { ...node, id: makeId("rn"), createdAt: makeTimestamp() }])
  }, [isMockDataEnabled, rejectMockWrite])

  const updateResourceNode = React.useCallback((id: string, updates: Partial<ResourceNode>) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Resource mock 節點更新")
      return
    }
    setResourceNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)))
  }, [isMockDataEnabled, rejectMockWrite])

  const deleteResourceNode = React.useCallback((id: string) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("Resource mock 節點刪除")
      return
    }
    setResourceNodes((prev) => prev.filter((n) => n.id !== id))
  }, [isMockDataEnabled, rejectMockWrite])

  // ── Run mock analysis on unprocessed item ────────────────────────────────

  const runMockAnalysis = React.useCallback((rawSourceItemId: string) => {
    if (!isMockDataEnabled) {
      rejectMockWrite("AI mock 分析")
      return
    }
    // Set to processing
    setRawSourceItems((prev) =>
      prev.map((item) =>
        item.id === rawSourceItemId
          ? { ...item, processingStatus: "processing" as ProcessingStatus }
          : item
      )
    )

    setTimeout(() => {
      const item = rawSourceItems.find((r) => r.id === rawSourceItemId)
      if (!item) return

      const text = item.rawText ?? item.previewText ?? item.title ?? "未知內容"
      const ncId = makeId("nc")
      const evId = makeId("ev")

      const nc = makeNormalizedContent({
        id: ncId,
        rawSourceItemId,
        contentType: "url_excerpt",
        text,
      })

      const ev = makeEvidence({
        id: evId,
        rawSourceItemId,
        normalizedContentId: ncId,
        excerpt: text.slice(0, 80),
        reasonUsed: "URL 擷取的主要內容",
      })

      const proposal = makeProposal(rawSourceItemId, evId, text)

      setRawSourceItems((prev) =>
        prev.map((r) =>
          r.id === rawSourceItemId
            ? { ...r, processingStatus: "processed", aiStatus: "proposed" }
            : r
        )
      )
      setNormalizedContents((prev) => [nc, ...prev])
      setEvidences((prev) => [ev, ...prev])
      setProposals((prev) => [proposal, ...prev])
      pushToast("AI 分析完成。1 則審閱建議已生成。")
    }, 800)
  }, [rawSourceItems, isMockDataEnabled, rejectMockWrite, pushToast])

  // ── Resolve proposal ──────────────────────────────────────────────────────

  const resolveProposal = React.useCallback(
    (id: string, decision: DecisionType, editedSummary?: string) => {
      const statusMap: Record<DecisionType, ProposalStatus> = {
        confirm: "confirmed",
        edit: "edited",
        dismiss: "dismissed",
        defer: "deferred",
      }

      setProposals((prev) =>
        prev.map((p) =>
          p.id !== id
            ? p
            : {
                ...p,
                status: statusMap[decision],
                summary: decision === "edit" && editedSummary ? editedSummary : p.summary,
              }
        )
      )

      // Update aiStatus on linked raw items
      const proposal = proposals.find((p) => p.id === id)
      if (proposal) {
        const newAIStatus =
          decision === "confirm" || decision === "edit"
            ? "confirmed"
            : decision === "dismiss"
              ? "dismissed"
              : "proposed"

        setRawSourceItems((prev) =>
          prev.map((item) =>
            proposal.rawSourceItemIds.includes(item.id)
              ? { ...item, aiStatus: newAIStatus }
              : item
          )
        )

        // Bilateral Sync: Auto archive research_mapping to Research Thread Materials
        if ((decision === "confirm" || decision === "edit") && proposal.aiType === "research_mapping") {
          const defaultThreadId = threads[0]?.id || "rt-1"
          const cleanTitle = editedSummary || proposal.summary
          addMaterial(
            defaultThreadId,
            cleanTitle.length > 80 ? cleanTitle.slice(0, 77) + "..." : cleanTitle,
            "paper",
            undefined,
            proposal.recommendation ?? "從 AI Ingestion 智能分流歸檔"
          )
          pushToast("✦ 已自動歸檔至學術研究主軸的文獻材料庫！")
        }

        // Workflow dispatch: route confirmed/edited proposals through the engine
        if (decision === "confirm" || decision === "edit") {
          const target = triageTypeToDispatch(proposal.aiType)
          if (target) {
            const summary = editedSummary || proposal.summary
            workflowDispatch(
              "user",
              target.toAgent,
              target.intent,
              { summary, proposalId: id, confidence: proposal.confidence },
              summary
            )
            pushToast(`✦ Workflow 已路由 ${formatRoutingLabel(target)}`)
          }
        }

        const ud: UserDecision = {
          id: makeId("ud"),
          proposalId: id,
          decisionType: decision,
          editedSummary: editedSummary ?? null,
          editedRecommendation: null,
          createdAt: makeTimestamp(),
        }
        setUserDecisions((prev) => [ud, ...prev])
      }
    },
    [proposals, threads, addMaterial, pushToast, workflowDispatch]
  )

  // ── Derived ───────────────────────────────────────────────────────────────

  const pendingProposalCount = proposals.filter((p) => p.status === "pending").length

  const getNormalizedForItem = React.useCallback(
    (rawSourceItemId: string) =>
      normalizedContents
        .filter((nc) => nc.rawSourceItemId === rawSourceItemId)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [normalizedContents]
  )

  const getEvidenceForProposal = React.useCallback(
    (proposalId: string) => {
      const proposal = proposals.find((p) => p.id === proposalId)
      if (!proposal) return []
      return evidences.filter((e) => proposal.evidenceIds.includes(e.id))
    },
    [proposals, evidences]
  )

  const getProposalsForItem = React.useCallback(
    (rawSourceItemId: string) =>
      proposals.filter((p) => p.rawSourceItemIds.includes(rawSourceItemId)),
    [proposals]
  )

  return (
    <IngestionContext.Provider
      value={{
        sourceConnections,
        lineChats,
        driveRoot,
        gmailThreads,
        toggleLineChat,
        toggleDriveItem,
        toggleGmailThread,
        rawSourceItems,
        normalizedContents,
        evidences,
        proposals,
        userDecisions,
        toasts,
        dismissToast,
        addManualCapture,
        mockSyncLINE,
        mockSyncGmail,
        mockSyncRSS,
        mockImportGoogleDoc,
        mockUploadMarkdown,
        mockUploadMedia,
        addUrlCapture,
        resourceNodes,
        addResourceNode,
        updateResourceNode,
        deleteResourceNode,
        runMockAnalysis,
        resolveProposal,
        pendingProposalCount,
        getNormalizedForItem,
        getEvidenceForProposal,
        getProposalsForItem,
      }}
    >
      {children}
    </IngestionContext.Provider>
  )
}

export function useIngestion() {
  const ctx = React.useContext(IngestionContext)
  if (!ctx) throw new Error("useIngestion must be used within IngestionProvider")
  return ctx
}
