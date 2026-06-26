"use client"

import * as React from "react"
import {
  AudioLinesIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  HistoryIcon,
  ListChecksIcon,
  MessageSquareIcon,
  PenLineIcon,
  PlusIcon,
  RssIcon,
  SendIcon,
  Settings2Icon,
  ShieldAlertIcon,
  SparklesIcon,
  UploadIcon,
  LinkIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { TriageProposalCard } from "@/components/ai/triage-proposal-card"
import { useIngestion } from "@/lib/context/ingestion-context"
import { useMockDataMode } from "@/lib/context/mock-data-mode-context"
import { cn } from "@/lib/utils"
import { AddLinkDialog } from "@/components/ai/add-link-dialog"
import type {
  AIInputFormalReadinessContract,
  AIInputFormalReadinessRow,
  AIInputFormalReadinessTone,
  AIInputSourceControlConnectionStatus,
  AIInputSourceControlInputMode,
  AIInputSourceControlRiskLevel,
  AIInputSourceControlSyncStatus,
  AIInputSourceWorkflowReadModelKind,
} from "@/types/ai-input-readiness"
import type { MentionRef } from "@/types/sync-scope"
import type { AITriageProposal, DecisionType, Evidence, RawSourceItem } from "@/types/ingestion"

// ─── Chat Mode ────────────────────────────────────────────────────────────────

type ChatMode = "capture" | "reflection" | "project" | "research" | "report"

const CHAT_MODES: Record<ChatMode, { label: string; placeholder: string; hint: string; actions: string[] }> = {
  capture: {
    label: "Capture",
    placeholder: "快速記錄任何想法、訊息或碎片…",
    hint: "快速擷取，AI 負責分類",
    actions: ["line", "googledoc", "link", "markdown", "image", "audio", "rss"],
  },
  reflection: {
    label: "Reflection",
    placeholder: "整理當下的狀態或想法，AI 協助梳理…",
    hint: "自我整理，識別情緒脈絡",
    actions: [],
  },
  project: {
    label: "Project",
    placeholder: "討論專案進度、問題或客戶情況…",
    hint: "專案脈絡，AI 根據現有資料回應",
    actions: ["line", "googledoc", "markdown"],
  },
  research: {
    label: "Research",
    placeholder: "輸入文獻連結、研究想法或問題…",
    hint: "文獻分析，AI 建議研究歸屬",
    actions: ["googledoc", "rss", "markdown"],
  },
  report: {
    label: "Report",
    placeholder: "描述要生成的報告範圍或時段…",
    hint: "報告生成，AI 從記錄中彙整敘事",
    actions: [],
  },
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Sender = "user" | "ai"
type WorkbenchTab = "today" | "review" | "environment" | "results" | "log"
type AIInputSubpage = "chat" | "context" | "settings" | "workbench"

interface ChatMessage {
  id: string
  sender: Sender
  type: "text" | "triage" | "system"
  content: string
  proposalId?: string
  timestamp: Date
}

interface WorkflowRunCard {
  id: string
  source: string
  status: "completed" | "review" | "partial"
  detail: string
  reviewCount: number
  mentionLabel: string
}

interface ReviewItemCard {
  id: string
  label: string
  title: string
  description: string
  target: string
  severity: "medium" | "high"
}

interface SourceEnvironmentCard {
  id: string
  source: string
  cadence: string
  module: string
  risk: string
  brief: string
}

interface OrganizingResultCard {
  id: string
  title: string
  detail: string
  status: string
}

interface WorkLogEntry {
  id: string
  time: string
  text: string
}

interface SourceConnectorRow {
  id: string
  source: string
  provider: string
  connectorType: string
  connectionStatus: AIInputSourceControlConnectionStatus
  syncStatus: AIInputSourceControlSyncStatus
  scope: string
  cadence: string
  lastSync: string
  nextSync: string
  defaultModule: string
  riskPolicy: string
  reviewRule: string
  inputMode: AIInputSourceControlInputMode
  nextAction: string
  missingPermissions: string | null
}

interface SourceInputMatrixRow {
  id: string
  source: string
  provider: string
  connectionStatus: AIInputSourceControlConnectionStatus
  inputMode: AIInputSourceControlInputMode
  inputModeLabel: string
  riskLevel: AIInputSourceControlRiskLevel
  riskLabel: string
  nextAction: string
  missingPermissions: string | null
  boundary?: string
}

interface SyncReviewPolicy {
  id: string
  condition: string
  handling: string
  reason: string
}

interface CoworkStarter {
  id: string
  icon: React.ReactNode
  label: string
  description: string
  mode: ChatMode
  prompt: string
  contextHint: string
}

const QUICK_PROMPTS = [
  { icon: <PenLineIcon className="size-4" />, label: "整理思路", prompt: "幫我整理今天的想法和待辦：" },
  { icon: <FolderIcon className="size-4" />, label: "專案更新", prompt: "記錄專案最新進展：" },
  { icon: <MessageSquareIcon className="size-4" />, label: "會議紀錄", prompt: "整理以下會議內容：" },
  { icon: <SparklesIcon className="size-4" />, label: "分析資訊", prompt: "分析並整理以下資訊：" },
]

const COWORK_STARTERS: CoworkStarter[] = [
  {
    id: "work",
    icon: <FolderIcon className="size-4" />,
    label: "工作專案共作",
    description: "把客戶訊息、文件與下一步先丟進來，AI 先幫你整理脈絡。",
    mode: "project",
    prompt: "我想整理一個工作或客戶專案脈絡：",
    contextHint: "適合搭配 LINE、Google Doc、Markdown",
  },
  {
    id: "research",
    icon: <FileTextIcon className="size-4" />,
    label: "研究想法共作",
    description: "先保留想法、文獻、概念與可轉化到工作的線索，不急著歸類。",
    mode: "research",
    prompt: "我想整理一個研究想法或文獻脈絡：",
    contextHint: "適合搭配 RSS、Google Doc、資料組候選",
  },
  {
    id: "relationship",
    icon: <MessageSquareIcon className="size-4" />,
    label: "商會關係共作",
    description: "把對話、引薦線索與合作可能先放進共同工作脈絡。",
    mode: "capture",
    prompt: "我想整理一段商會或人際合作脈絡：",
    contextHint: "適合搭配 LINE 群組、聯絡人、會議紀錄",
  },
]

const WORKBENCH_TABS: Array<{ id: WorkbenchTab; label: string; icon: React.ReactNode }> = [
  { id: "today", label: "今日 Workflow", icon: <ListChecksIcon className="size-3.5" /> },
  { id: "review", label: "需要確認", icon: <ShieldAlertIcon className="size-3.5" /> },
  { id: "environment", label: "來源環境", icon: <Settings2Icon className="size-3.5" /> },
  { id: "results", label: "整理結果", icon: <DatabaseIcon className="size-3.5" /> },
  { id: "log", label: "工作紀錄", icon: <HistoryIcon className="size-3.5" /> },
]

const MOCK_WORKFLOW_RUNS: WorkflowRunCard[] = [
  {
    id: "SRC-RUN-2026-00127",
    source: "LINE 商會核心幹部群",
    status: "review",
    detail: "完成 · 34 則訊息 · 1 個需確認",
    reviewCount: 1,
    mentionLabel: "@SRC-RUN-2026-00127",
  },
  {
    id: "SRC-RUN-2026-00128",
    source: "Google Doc Personal OS 研究",
    status: "completed",
    detail: "完成 · 2 份文件更新 · 無異常",
    reviewCount: 0,
    mentionLabel: "@SRC-RUN-2026-00128",
  },
  {
    id: "SRC-RUN-2026-00129",
    source: "RSS 教育科技",
    status: "partial",
    detail: "部分完成 · 5 篇文章 · 2 篇高相關",
    reviewCount: 0,
    mentionLabel: "@SRC-RUN-2026-00129",
  },
  {
    id: "SRC-RUN-2026-00130",
    source: "手動匯入 CDR 文件",
    status: "completed",
    detail: "完成 · 已建立研究資料候選組",
    reviewCount: 0,
    mentionLabel: "@SRC-RUN-2026-00130",
  },
]

const MOCK_REVIEW_ITEMS: ReviewItemCard[] = [
  {
    id: "AI-WORK-2026-0041",
    label: "分類不確定",
    title: "演藝經紀 AI 專案",
    description: "AI 無法確定這批資料應該歸到工作、商會、公司或研究。",
    target: "@AI-WORK-2026-0041",
    severity: "medium",
  },
  {
    id: "AI-WORK-2026-0042",
    label: "風險提醒",
    title: "LINE 群組出現私人電話",
    description: "已暫時從摘要中隱藏，等待確認是否保留於內部脈絡。",
    target: "@AI-WORK-2026-0042",
    severity: "high",
  },
]

const MOCK_SOURCE_ENVIRONMENTS: SourceEnvironmentCard[] = [
  { id: "env-line", source: "LINE 商會核心幹部群", cadence: "每日同步", module: "商會", risk: "中風險", brief: "進早安簡報" },
  { id: "env-drive", source: "Google Drive Personal OS 研究", cadence: "手動同步", module: "研究", risk: "低風險", brief: "異常才回報" },
  { id: "env-rss", source: "RSS 教育科技", cadence: "每日同步", module: "研究", risk: "低風險", brief: "只摘要高相關文章" },
]

const MOCK_ORGANIZING_RESULTS: OrganizingResultCard[] = [
  { id: "res-1", title: "RES-2026-004 教育科技資料治理研究包", detail: "5 篇文章中 2 篇被標為高相關，等待研究資料組確認。", status: "DataUnitProposal" },
  { id: "res-2", title: "INT-2026-001 王小明訪談資料", detail: "逐字稿、研究者筆記、AI coding 被列為候選組合。", status: "Candidate" },
  { id: "res-3", title: "來源命名", detail: "6 個已自動命名，2 個需要確認。", status: "Naming" },
  { id: "res-4", title: "補充情境", detail: "3 則 LINE 訊息已連到資料組候選，不進最終模組資料。", status: "Context" },
]

const MOCK_WORK_LOG: WorkLogEntry[] = [
  { id: "log-1", time: "09:10", text: "LINE 同步開始" },
  { id: "log-2", time: "09:11", text: "建立 34 個 Message SourceAsset" },
  { id: "log-3", time: "09:12", text: "AI 辨識 3 個可能行動項目" },
  { id: "log-4", time: "09:13", text: "建議建立商會合作機會摘要" },
  { id: "log-5", time: "09:14", text: "標記 1 個需確認項目" },
]

const MOCK_SOURCE_CONNECTORS: SourceConnectorRow[] = [
  {
    id: "sync-line-chamber",
    source: "LINE 商會核心幹部群",
    provider: "LINE",
    connectorType: "Messaging",
    connectionStatus: "connected",
    syncStatus: "review",
    scope: "最近 24 小時訊息、附件與連結",
    cadence: "每日 08:30",
    lastSync: "今天 09:14",
    nextSync: "明天 08:30",
    defaultModule: "商會",
    riskPolicy: "中",
    reviewRule: "1 個需確認",
    inputMode: "scheduled",
    nextAction: "確認 1 個待審項目",
    missingPermissions: null,
  },
  {
    id: "sync-drive-research",
    source: "Google Drive Personal OS 研究",
    provider: "Drive",
    connectorType: "Cloud files",
    connectionStatus: "connected",
    syncStatus: "completed",
    scope: "研究資料夾新增與更新文件",
    cadence: "手動同步",
    lastSync: "昨天 18:20",
    nextSync: "手動觸發",
    defaultModule: "研究",
    riskPolicy: "低",
    reviewRule: "命名衝突",
    inputMode: "manual",
    nextAction: "無需操作",
    missingPermissions: null,
  },
  {
    id: "sync-google-docs-work",
    source: "Google Docs 專案文件",
    provider: "Google Docs",
    connectorType: "Document",
    connectionStatus: "connected",
    syncStatus: "idle",
    scope: "指定文件清單與文件更新",
    cadence: "文件變更",
    lastSync: "今天 10:08",
    nextSync: "等待變更",
    defaultModule: "工作",
    riskPolicy: "中",
    reviewRule: "外部分享前確認",
    inputMode: "event",
    nextAction: "無需操作",
    missingPermissions: null,
  },
  {
    id: "sync-rss-edtech",
    source: "RSS 教育科技",
    provider: "RSS",
    connectorType: "Feed",
    connectionStatus: "connected",
    syncStatus: "completed",
    scope: "高相關文章與引用連結",
    cadence: "每日 07:30",
    lastSync: "今天 07:30",
    nextSync: "明天 07:30",
    defaultModule: "研究",
    riskPolicy: "低",
    reviewRule: "2 篇高相關",
    inputMode: "scheduled",
    nextAction: "查看 2 篇高相關文章",
    missingPermissions: null,
  },
  {
    id: "sync-telegram-research",
    source: "Telegram 研究討論群",
    provider: "Telegram",
    connectorType: "Messaging",
    connectionStatus: "needs_setup",
    syncStatus: "not_configured",
    scope: "尚未授權",
    cadence: "未設定",
    defaultModule: "研究",
    lastSync: "尚未同步",
    nextSync: "設定後啟用",
    riskPolicy: "高",
    reviewRule: "需隱私審核",
    inputMode: "webhook",
    nextAction: "完成 Bot 授權設定",
    missingPermissions: "Telegram Bot Token、webhook endpoint",
  },
  {
    id: "sync-gmail-client",
    source: "Gmail 客戶信件",
    provider: "Gmail",
    connectorType: "Email",
    connectionStatus: "planned",
    syncStatus: "not_configured",
    scope: "客戶 thread 與附件",
    cadence: "未設定",
    defaultModule: "工作",
    lastSync: "尚未同步",
    nextSync: "待 adapter contract",
    riskPolicy: "高",
    reviewRule: "ClientPortal 前確認",
    inputMode: "polling",
    nextAction: "等待 adapter contract 確認",
    missingPermissions: "gmail.readonly, gmail.modify OAuth scope",
  },
  {
    id: "sync-github-markdown",
    source: "GitHub Repo / Markdown",
    provider: "GitHub",
    connectorType: "Repo files",
    connectionStatus: "planned",
    syncStatus: "not_configured",
    scope: "docs、reference、AGENTS / SKILL",
    cadence: "手動 import/export",
    defaultModule: "Agent Team OS",
    lastSync: "尚未同步",
    nextSync: "待明確動作",
    riskPolicy: "中",
    reviewRule: "不得靜默覆寫",
    inputMode: "one_time",
    nextAction: "決定 import/export 工作流程",
    missingPermissions: "repo read OAuth scope（如需 private repo）",
  },
  {
    id: "sync-manual-import",
    source: "手動匯入與本機檔案",
    provider: "Manual",
    connectorType: "Upload",
    connectionStatus: "connected",
    syncStatus: "idle",
    scope: "圖片、語音、Markdown、連結、批次檔",
    cadence: "使用者觸發",
    defaultModule: "依 AI triage",
    lastSync: "本次操作",
    nextSync: "手動觸發",
    riskPolicy: "依來源",
    reviewRule: "高風險需確認",
    inputMode: "manual",
    nextAction: "無需操作",
    missingPermissions: null,
  },
]

const SYNC_SETTING_BOUNDARIES = [
  {
    label: "這裡管理",
    value: "外部來源是否已串接、授權/範圍、同步頻率、上次與下次同步、同步健康狀態、風險與確認條件",
  },
  {
    label: "這裡不做",
    value: "選擇本次對話引用、直接寫入模組、公開分享、執行真實 connector 或覆寫外部來源",
  },
]

const SYNC_REVIEW_POLICIES: SyncReviewPolicy[] = [
  {
    id: "review-risk",
    condition: "高風險或個資片段",
    handling: "建立 AIWorkItem，暫時從摘要隱藏",
    reason: "避免私人電話、客戶資料或敏感內容被直接送入簡報或公開輸出。",
  },
  {
    id: "review-routing",
    condition: "模組分類不確定",
    handling: "要求使用者選擇 Work / Research / Chamber / Company 等模組",
    reason: "同步設定只能提供預設模組，不能替代人工決策與 module write approval。",
  },
  {
    id: "review-source-quality",
    condition: "來源品質或格式偵測衝突",
    handling: "保留 SourceAsset，但不自動建立 DataUnit 或 ModuleWriteIntent",
    reason: "避免錯誤 MIME、缺漏轉錄或低品質來源污染後續 AI grouping。",
  },
]

function makeClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}`
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIInputClient({
  formalReadiness,
}: {
  formalReadiness: AIInputFormalReadinessContract
}) {
  const { isMockDataEnabled, toggleMockData } = useMockDataMode()
  const {
    addManualCapture,
    mockSyncLINE,
    mockSyncRSS,
    mockImportGoogleDoc,
    mockUploadMarkdown,
    mockUploadMedia,
    proposals,
    rawSourceItems,
    getEvidenceForProposal,
    resolveProposal,
    lineChats,
    driveRoot,
    addUrlCapture,
    resourceNodes,
  } = useIngestion()

  const [activeConvId, setActiveConvId] = React.useState<string | null>(null)
  const [workspaceView, setWorkspaceView] = React.useState<AIInputSubpage>("chat")
  const [mode, setMode] = React.useState<ChatMode>("capture")
  const [workbenchTab, setWorkbenchTab] = React.useState<WorkbenchTab>("today")
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [inputText, setInputText] = React.useState("")
  const [mentions, setMentions] = React.useState<MentionRef[]>([])
  const [atQuery, setAtQuery] = React.useState<string | null>(null)
  const [isTyping, setIsTyping] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const shownProposalIdsRef = React.useRef<Set<string> | null>(null)
  React.useEffect(() => {
    if (shownProposalIdsRef.current === null) {
      shownProposalIdsRef.current = new Set(proposals.map((p) => p.id))
      return
    }
    if (!isTyping) return
    const newProposals = proposals.filter((p) => !shownProposalIdsRef.current!.has(p.id))
    if (newProposals.length === 0) return
    newProposals.forEach((p) => shownProposalIdsRef.current!.add(p.id))
    setIsTyping(false)
    newProposals.forEach((proposal, i) => {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: proposal.id, sender: "ai", type: "triage", content: "", proposalId: proposal.id, timestamp: new Date() },
        ])
      }, i * 350)
    })
  }, [proposals, isTyping])

  function startNewConversation(initialText?: string) {
    const id = makeClientId("new")
    setActiveConvId(id)
    const welcome: ChatMessage = {
      id: makeClientId("welcome"),
      sender: "ai",
      type: "text",
      content: "您好！我是您的 Personal OS 助理。您可以將任何資訊丟進這裡，我會幫您整理、分類並給予下一步建議。",
      timestamp: new Date(),
    }
    setMessages([welcome])
    if (initialText) {
      setTimeout(() => doSendText(initialText), 50)
    }
  }

  function doSendText(text: string, currentMentions: MentionRef[] = []) {
    const contextSuffix = currentMentions.length > 0
      ? `\n\n[參考背景：${currentMentions.map((m) => m.name).join("、")}]`
      : ""
    const displayText = currentMentions.length > 0
      ? `${text}\n＠ ${currentMentions.map((m) => m.name).join("、")}`
      : text
    setMessages((prev) => [
      ...prev,
      { id: makeClientId("msg"), sender: "user", type: "text", content: displayText, timestamp: new Date() },
    ])
    setIsTyping(true)
    addManualCapture(text + contextSuffix)
    setMentions([])
  }

  function handleSend() {
    if (!inputText.trim() && mentions.length === 0) return
    const text = inputText.trim()
    setInputText("")
    setAtQuery(null)
    if (!activeConvId) {
      startNewConversation(text || undefined)
      return
    }
    doSendText(text, mentions)
  }

  function handleInputChange(val: string) {
    setInputText(val)
    const atMatch = val.match(/@([一-鿿\w]*)$/)
    setAtQuery(atMatch ? atMatch[1] : null)
  }

  function selectMention(ref: MentionRef) {
    setMentions((prev) => prev.some((m) => m.id === ref.id) ? prev : [...prev, ref])
    setInputText((prev) => prev.replace(/@([一-鿿\w]*)$/, ""))
    setAtQuery(null)
    textareaRef.current?.focus()
  }

  function removeMention(id: string) {
    setMentions((prev) => prev.filter((m) => m.id !== id))
  }

  function handleQuickPrompt(prompt: string) {
    setWorkspaceView("chat")
    setInputText(prompt)
    if (!activeConvId) startNewConversation()
  }

  function handleCoworkStarter(starter: CoworkStarter) {
    setMode(starter.mode)
    setWorkspaceView("chat")
    handleQuickPrompt(starter.prompt)
  }

  function handleAction(name: string, action: () => void) {
    if (!activeConvId) startNewConversation()
    setMessages((prev) => [
      ...prev,
      { id: makeClientId("msg"), sender: "user", type: "text", content: `模擬匯入：${name}`, timestamp: new Date() },
    ])
    setIsTyping(true)
    action()
  }

  function handleAddLinks(urls: string[]) {
    if (!activeConvId) startNewConversation()
    setMessages((prev) => [
      ...prev,
      { id: makeClientId("msg"), sender: "user", type: "text", content: `匯入資源：\n${urls.map(u => `· ${u}`).join('\n')}`, timestamp: new Date() },
    ])
    setIsTyping(true)
    addUrlCapture(urls)
    setWorkspaceView("context")
  }

  function handleModeChange(newMode: ChatMode) {
    if (newMode === mode) return
    setMode(newMode)
    if (activeConvId) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeClientId("mode"),
          sender: "ai",
          type: "system",
          content: `${CHAT_MODES[newMode].label} 模式 — ${CHAT_MODES[newMode].hint}`,
          timestamp: new Date(),
        },
      ])
    }
  }

  const allActions = [
    { id: "line",      icon: <MessageSquareIcon />, label: "LINE",       onClick: () => handleAction("LINE 同步",   mockSyncLINE) },
    { id: "googledoc", icon: <FileTextIcon />,      label: "Google Doc", onClick: () => handleAction("Google Doc",  mockImportGoogleDoc) },
    { id: "link",      icon: <LinkIcon />,          label: "連結",       onClick: () => {} }, // Dialog handled below
    { id: "markdown",  icon: <FileTextIcon />,      label: "Markdown",   onClick: () => handleAction("Markdown",    mockUploadMarkdown) },
    { id: "image",     icon: <UploadIcon />,         label: "圖片",       onClick: () => handleAction("圖片",        () => mockUploadMedia("image")) },
    { id: "audio",     icon: <AudioLinesIcon />,     label: "語音",       onClick: () => handleAction("語音",        () => mockUploadMedia("audio")) },
    { id: "rss",       icon: <RssIcon />,            label: "RSS",        onClick: () => handleAction("RSS 同步",    mockSyncRSS) },
  ]

  const visibleActions = isMockDataEnabled && CHAT_MODES[mode].actions.length > 0
    ? allActions.filter((a) => CHAT_MODES[mode].actions.includes(a.id))
    : []

  // Mentionable sources: LINE chats + Drive files (no folders)
  const MOCK_EXTENDED_MENTIONS: MentionRef[] = React.useMemo(() => isMockDataEnabled ? [
    { kind: "source_asset", id: "sa-001", name: "AI治理架構白皮書.pdf", description: "PDF · 2.3MB · 2026-06-01" },
    { kind: "source_asset", id: "sa-002", name: "ESG Reporting Framework v3.docx", description: "Word · 來自 Google Drive" },
    { kind: "source_asset", id: "sa-003", name: "訪談紀錄_林副理事長_0605.m4a", description: "音訊 · 42分鐘 · 待轉錄" },
    { kind: "data_unit_proposal", id: "du-001", name: "DU: AI治理框架比較研究", description: "DataUnit提案 · 3個來源資產" },
    { kind: "data_unit_proposal", id: "du-002", name: "DU: ESG2025年度報告摘要", description: "DataUnit提案 · 已審閱" },
    { kind: "ai_workflow_run", id: "wf-001", name: "來源整理工作流 #WF-2026-0041", description: "已完成 · 2026-06-08" },
    { kind: "ai_workflow_run", id: "wf-002", name: "晨間簡報生成 #WF-2026-0042", description: "進行中" },
    { kind: "ai_work_item", id: "wi-001", name: "AI-WORK: 歸屬「AI治理」想法至研究議題", description: "待審閱" },
    { kind: "ai_work_item", id: "wi-002", name: "AI-WORK: 建立訪談紀錄摘要", description: "已完成" },
    { kind: "morning_brief", id: "mb-001", name: "晨間簡報 2026-06-09", description: "今日簡報 · 5個重點" },
    { kind: "morning_brief", id: "mb-002", name: "晨間簡報 2026-06-08", description: "昨日簡報" },
    { kind: "module_record", id: "mr-001", name: "Work: 客戶提案專案", description: "Work模組 · 活躍" },
    { kind: "module_record", id: "mr-002", name: "Research: AI治理研究議題", description: "Research模組 · 進行中" },
  ] : [], [isMockDataEnabled])

  const mentionOptions: MentionRef[] = React.useMemo(() => {
    function flatFiles(items: typeof driveRoot): typeof driveRoot {
      return items.flatMap((i) => (i.type === "folder" && i.children ? [i, ...flatFiles(i.children)] : [i]))
    }
    return [
      ...lineChats.map((c) => ({ kind: "line" as const, id: c.id, name: c.name })),
      ...flatFiles(driveRoot).filter((i) => i.type !== "folder").map((i) => ({ kind: "drive" as const, id: i.id, name: i.name })),
      ...MOCK_EXTENDED_MENTIONS,
    ]
  }, [lineChats, driveRoot, MOCK_EXTENDED_MENTIONS])

  const filteredMentions = atQuery === null
    ? []
    : atQuery === ""
    ? mentionOptions
    : mentionOptions.filter((m) => m.name.toLowerCase().includes(atQuery.toLowerCase()))

  const pendingProposalCount = proposals.filter((proposal) => proposal.status === "pending").length
  const mockReviewCount = isMockDataEnabled ? MOCK_REVIEW_ITEMS.length : 0
  const reviewCount = mockReviewCount + pendingProposalCount

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <AIInputSubpageNav
        activeView={workspaceView}
        contextCount={mentions.length}
        reviewCount={reviewCount}
        syncSourceCount={isMockDataEnabled ? MOCK_SOURCE_CONNECTORS.length : formalReadiness.sourceControlMatrix.summary.rowCount}
        isMockDataEnabled={isMockDataEnabled}
        onToggleMockData={toggleMockData}
        onChange={setWorkspaceView}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {workspaceView === "chat" && (activeConvId === null ? (
          /* Landing Screen */
          <div className="flex h-full flex-col items-center justify-start overflow-y-auto px-6 pb-16 pt-12 md:pt-16 xl:pt-20">
            <div className="w-full max-w-2xl space-y-8">
              <MockModeInlineNotice isMockDataEnabled={isMockDataEnabled} />

              <div className="text-center space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  再度光臨，Oliver
                </h1>
                <p className="text-sm text-muted-foreground">有什麼想整理或思考的嗎？</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => handleQuickPrompt(qp.prompt)}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 text-sm text-left hover:bg-muted/60 transition-colors group"
                  >
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{qp.icon}</span>
                    <span className="font-medium">{qp.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                {COWORK_STARTERS.map((starter) => (
                  <button
                    key={starter.id}
                    onClick={() => handleCoworkStarter(starter)}
                    className="min-h-24 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="text-primary">{starter.icon}</span>
                    <span className="mt-2 block text-sm font-semibold">{starter.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{starter.contextHint}</span>
                  </button>
                ))}
              </div>

              <div className="relative">
                {filteredMentions.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-border bg-popover shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">選擇參考來源</p>
                    {filteredMentions.map((m) => (
                      <button
                        key={m.id}
                        onMouseDown={(e) => { e.preventDefault(); selectMention(m) }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
                          {m.kind === "line" ? "LINE" : "Drive"}
                        </span>
                        <span className="flex-1 truncate">{m.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {mentions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {mentions.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] text-primary font-medium">
                        <span className="opacity-60">@</span>{m.name}
                        <button onClick={() => removeMention(m.id)} className="ml-0.5 opacity-50 hover:opacity-100">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setAtQuery(null); return }
                    if (e.key === "Enter" && !e.shiftKey && filteredMentions.length === 0) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="輸入訊息、想法，或直接開始對話…輸入 @ 可選擇參考來源"
                  className="w-full bg-muted/30 border border-border/60 rounded-2xl px-4 py-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none min-h-[60px] max-h-[180px]"
                  rows={2}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() && mentions.length === 0}
                  className="absolute right-3 bottom-3 p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                >
                  <SendIcon className="size-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-center">
                {isMockDataEnabled ? (
                  <>
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest mr-1">快速匯入</span>
                    <ActionButton icon={<MessageSquareIcon />} label="LINE" onClick={() => handleAction("LINE 同步", mockSyncLINE)} />
                    <AddLinkDialog onAdd={handleAddLinks} />
                    <ActionButton icon={<FileTextIcon />} label="Google Doc" onClick={() => handleAction("Google Doc", mockImportGoogleDoc)} />
                    <ActionButton icon={<FileTextIcon />} label="Markdown" onClick={() => handleAction("Markdown", mockUploadMarkdown)} />
                    <ActionButton icon={<UploadIcon />} label="圖片" onClick={() => handleAction("圖片", () => mockUploadMedia("image"))} />
                    <ActionButton icon={<AudioLinesIcon />} label="語音" onClick={() => handleAction("語音", () => mockUploadMedia("audio"))} />
                    <ActionButton icon={<RssIcon />} label="RSS" onClick={() => handleAction("RSS 同步", mockSyncRSS)} />
                  </>
                ) : (
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    Mock 快速匯入已關閉。等 SourceAsset / Workflow Run 接上 Supabase-backed BFF 後，這裡會改成真實匯入入口。
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat */
          <div className="flex flex-col h-full overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth">
              <div className="max-w-2xl mx-auto space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={cn(
                        "flex flex-col gap-1.5",
                        msg.type === "system"
                          ? "items-center"
                          : msg.sender === "user"
                          ? "items-end"
                          : "items-start"
                      )}
                    >
                      {msg.sender === "ai" && msg.type !== "system" && (
                        <div className="flex items-center gap-2 mb-0.5 px-1">
                          <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <SparklesIcon className="size-3 text-primary" />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Personal AI</span>
                        </div>
                      )}

                      {msg.type === "system" ? (
                        <span className="text-[10px] text-muted-foreground/50 px-3 py-1 rounded-full border border-border/40 bg-muted/20">
                          {msg.content}
                        </span>
                      ) : msg.type === "text" ? (
                        <div className={cn(
                          "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted/50 border border-border/50 text-foreground rounded-tl-none"
                        )}>
                          {msg.content}
                        </div>
                      ) : msg.type === "triage" && msg.proposalId ? (
                        <div className="w-full max-w-xl">
                          <TriageCardWrapper
                            proposalId={msg.proposalId}
                            proposals={proposals}
                            rawSourceItems={rawSourceItems}
                            getEvidenceForProposal={getEvidenceForProposal}
                            resolveProposal={resolveProposal}
                          />
                        </div>
                      ) : null}

                      {msg.type !== "system" && (
                        <span className="text-[10px] text-muted-foreground/40 px-1">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2">
                    <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <SparklesIcon className="size-3 text-primary animate-pulse" />
                    </div>
                    <div className="bg-muted/30 rounded-2xl px-4 py-3 flex gap-1 items-center">
                      <span className="size-1.5 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="size-1.5 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="size-1.5 bg-muted-foreground/30 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl p-4 pb-6">
              <div className="max-w-2xl mx-auto space-y-3">
                {/* Mode tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {(Object.keys(CHAT_MODES) as ChatMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                        mode === m
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {CHAT_MODES[m].label}
                    </button>
                  ))}
                </div>

                {/* Import action buttons (mode-filtered) */}
                {visibleActions.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap">匯入</span>
                    {visibleActions.map((a) => (
                      a.id === "link" ? (
                        <AddLinkDialog key={a.id} onAdd={handleAddLinks} trigger={
                          <Button variant="outline" size="sm" className="h-7 rounded-full border-border/50 bg-background/50 hover:bg-muted text-xs font-normal gap-1.5 px-2.5 whitespace-nowrap shadow-sm">
                            <span className="size-3 text-muted-foreground">{a.icon}</span>
                            {a.label}
                          </Button>
                        } />
                      ) : (
                        <ActionButton key={a.id} icon={a.icon} label={a.label} onClick={a.onClick} />
                      )
                    ))}
                  </div>
                )}
                {!isMockDataEnabled && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    正式模式已啟用，mock 匯入已關閉。對話仍可使用；來源寫入需等 Supabase-backed SourceAsset BFF 接上。
                  </p>
                )}

                {/* Mention chips */}
                {mentions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {mentions.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] text-primary font-medium">
                        <span className="opacity-60">@</span>{m.name}
                        <button onClick={() => removeMention(m.id)} className="ml-0.5 opacity-50 hover:opacity-100">×</button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input with @ mention picker */}
                <div className="relative">
                  {/* Mention picker dropdown */}
                  {filteredMentions.length > 0 && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-border bg-popover shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">選擇參考來源</p>
                      {filteredMentions.map((m) => (
                        <button
                          key={m.id}
                          onMouseDown={(e) => { e.preventDefault(); selectMention(m) }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
                            {m.kind === "line" ? "LINE" : "Drive"}
                          </span>
                          <span className="flex-1 truncate">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setAtQuery(null); return }
                      if (e.key === "Enter" && !e.shiftKey && filteredMentions.length === 0) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder={atQuery !== null ? "搜尋 LINE 群組或文件…" : CHAT_MODES[mode].placeholder}
                    className="w-full bg-muted/40 border border-border/60 rounded-2xl px-4 py-3.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none min-h-[52px] max-h-[160px]"
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputText.trim() && mentions.length === 0}
                    className="absolute right-3 bottom-3 p-1.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                  >
                    <SendIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {workspaceView === "context" && (
          <SubpageShell
            description="只管理這次 AI 對話要引用哪些背景。這裡不是來源同步設定，也不會寫入模組資料。"
            eyebrow="Reference Context"
            title="參考脈絡"
          >
            <SourceContextPanelContent
              mentionOptions={mentionOptions}
              mentions={mentions}
              rawSourceCount={rawSourceItems.length}
              onRemoveMention={removeMention}
              onSelectMention={selectMention}
            />
          </SubpageShell>
        )}

        {workspaceView === "settings" && (
          <SubpageShell
            description="查看 LINE、Drive、Docs、RSS、Telegram、Gmail、GitHub 等外部來源的串接狀態、同步健康度、範圍與確認條件。這不是當前對話引用內容。"
            eyebrow="Source Settings"
            title="同步設定"
            wide
          >
            <SourceStructurePanelContent
              formalReadiness={formalReadiness}
              isMockDataEnabled={isMockDataEnabled}
              resourceNodesCount={resourceNodes.length}
            />
          </SubpageShell>
        )}

        {workspaceView === "workbench" && (
          <SubpageShell
            description={isMockDataEnabled
              ? "以表格查看今日 workflow、確認項目、來源環境、整理結果與工作紀錄。這裡只顯示 mock 狀態，不執行同步。"
              : "正式模式只顯示 Supabase-backed workflow。若尚未接上資料庫表，這裡會維持空狀態。"}
            eyebrow="Workflow Console"
            title="AI 工作台"
            wide
          >
            <WorkflowWorkbenchPanelContent
              activeTab={workbenchTab}
              formalReadiness={formalReadiness}
              isMockDataEnabled={isMockDataEnabled}
              onTabChange={setWorkbenchTab}
              pendingProposalCount={pendingProposalCount}
              rawSourceCount={rawSourceItems.length}
            />
          </SubpageShell>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AIInputSubpageNav({
  activeView,
  contextCount,
  isMockDataEnabled,
  reviewCount,
  syncSourceCount,
  onToggleMockData,
  onChange,
}: {
  activeView: AIInputSubpage
  contextCount: number
  isMockDataEnabled: boolean
  reviewCount: number
  syncSourceCount: number
  onToggleMockData: () => void
  onChange: (view: AIInputSubpage) => void
}) {
  const navItems: Array<{
    id: AIInputSubpage
    label: string
    description: string
    count?: number
    icon: React.ReactNode
  }> = [
    {
      id: "chat",
      label: "AI 對話",
      description: "先開始 cowork",
      icon: <SparklesIcon className="size-4" />,
    },
    {
      id: "context",
      label: "參考脈絡",
      description: "本次對話引用",
      count: contextCount,
      icon: <MessageSquareIcon className="size-4" />,
    },
    {
      id: "settings",
      label: "同步設定",
      description: "串接與狀態",
      count: syncSourceCount,
      icon: <Settings2Icon className="size-4" />,
    },
    {
      id: "workbench",
      label: "AI 工作台",
      description: "workflow 表格",
      count: reviewCount,
      icon: <ListChecksIcon className="size-4" />,
    },
  ]

  return (
    <div className="shrink-0 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              data-testid={`ai-input-subpage-${item.id}`}
              onClick={() => onChange(item.id)}
              className={cn(
                "grid min-w-[132px] grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                activeView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className={activeView === item.id ? "text-primary-foreground" : "text-muted-foreground"}>
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{item.label}</span>
                <span className={cn("block truncate text-[10px]", activeView === item.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {item.description}
                </span>
              </span>
              {typeof item.count === "number" && item.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  activeView === item.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleMockData}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors",
            isMockDataEnabled
              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          )}
          title={isMockDataEnabled ? "關閉 mock data，切到正式模式" : "重新開啟 mock data demo"}
        >
          <DatabaseIcon className="size-3.5" />
          <span className="hidden sm:inline">{isMockDataEnabled ? "Mock 開" : "正式模式"}</span>
          <span className="sm:hidden">{isMockDataEnabled ? "Mock" : "Live"}</span>
        </button>
      </div>
    </div>
  )
}

function MockModeInlineNotice({ isMockDataEnabled }: { isMockDataEnabled: boolean }) {
  return (
    <div className={cn(
      "rounded-lg border px-3 py-2 text-center text-xs leading-relaxed",
      isMockDataEnabled
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800"
    )}>
      {isMockDataEnabled
        ? "Mock data 目前開啟：這個頁面會使用 demo 來源、demo workflow 與本機狀態。右上角可切到正式模式。"
        : "正式模式已啟用：mock 來源與 demo workflow 已關閉；尚未接上 Supabase 的來源功能會保持空狀態。"}
    </div>
  )
}

function SubpageShell({
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="h-full overflow-y-auto px-4 py-5">
      <div className={cn("mx-auto flex min-h-full flex-col gap-5", wide ? "max-w-6xl" : "max-w-3xl")}>
        <header className="border-b border-border/60 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function SourceContextPanelContent({
  mentionOptions,
  mentions,
  rawSourceCount,
  onRemoveMention,
  onSelectMention,
}: {
  mentionOptions: MentionRef[]
  mentions: MentionRef[]
  rawSourceCount: number
  onRemoveMention: (id: string) => void
  onSelectMention: (ref: MentionRef) => void
}) {
  const KIND_LABELS: Record<string, string> = {
    line: "LINE", drive: "Drive", gmail: "Gmail",
    source_asset: "資產", data_unit_proposal: "DataUnit",
    ai_workflow_run: "工作流", ai_work_item: "工作項",
    morning_brief: "簡報", module_record: "模組",
  }
  const lineOptions = mentionOptions.filter((o) => o.kind === "line").slice(0, 5)
  const driveOptions = mentionOptions.filter((o) => o.kind === "drive").slice(0, 5)
  const extendedOptions = mentionOptions.filter((o) =>
    !["line", "drive", "gmail"].includes(o.kind)
  ).slice(0, 10)
  const contextRows = [
    ...lineOptions.map((o) => ({ ...o, label: KIND_LABELS[o.kind] ?? o.kind })),
    ...driveOptions.map((o) => ({ ...o, label: KIND_LABELS[o.kind] ?? o.kind })),
  ]
  const extendedRows = extendedOptions.map((o) => ({ ...o, label: KIND_LABELS[o.kind] ?? o.kind }))

  return (
    <div className="space-y-4">
      <section className="space-y-2 border-b border-sidebar-border/60 pb-3">
        <p className="text-xs font-semibold text-sidebar-foreground">參考脈絡只影響這次對話</p>
        <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
          在這裡加入的來源只是 AI cowork 的背景，不會歸檔、不會同步、不會寫入模組。
        </p>
        <div className="grid grid-cols-3 divide-x divide-sidebar-border/60 rounded-lg border border-sidebar-border/60 bg-background/40 text-center">
          <SourceStat label="已加入" value={mentions.length.toString()} />
          <SourceStat label="來源池" value={rawSourceCount.toString()} />
          <SourceStat label="可引用" value={mentionOptions.length.toString()} />
        </div>
      </section>

      <section className="space-y-2">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">目前已加入</p>
        {mentions.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-sidebar-border/60">
            {mentions.map((mention) => (
              <div key={mention.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-sidebar-border/50 px-2.5 py-2 last:border-b-0">
                <span className="min-w-0 truncate text-xs text-sidebar-foreground">
                  <span className="text-sidebar-foreground/35">@</span>
                  {mention.name}
                </span>
                <button onClick={() => onRemoveMention(mention.id)} className="text-[11px] text-sidebar-foreground/45 hover:text-sidebar-foreground">
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-sidebar-border/70 px-3 py-3 text-[11px] text-sidebar-foreground/45">
            尚未加入參考脈絡，仍可直接對話。
          </p>
        )}
      </section>

      <SourceOptionGroup
        title="外部來源"
        options={contextRows}
        onSelectMention={onSelectMention}
      />
      {extendedRows.length > 0 && (
        <SourceOptionGroup
          title="系統資產與記錄 (Mock)"
          options={extendedRows}
          onSelectMention={onSelectMention}
        />
      )}
    </div>
  )
}

function SourceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-2">
      <p className="text-[10px] text-sidebar-foreground/40">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-sidebar-foreground">{value}</p>
    </div>
  )
}

function SourceOptionGroup({
  title,
  options,
  onSelectMention,
}: {
  title: string
  options: Array<MentionRef & { label?: string }>
  onSelectMention: (ref: MentionRef) => void
}) {
  return (
    <section className="space-y-2">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">{title}</p>
      {options.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-sidebar-border/60">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelectMention(option)}
              className="grid min-h-9 w-full grid-cols-[48px_1fr_auto] items-center gap-2 border-b border-sidebar-border/50 px-2.5 py-2 text-left transition-colors last:border-b-0 hover:bg-sidebar-accent/40"
            >
              <span className="text-[10px] font-semibold text-sidebar-foreground/40">
                {option.label ?? option.kind}
              </span>
              <div className="min-w-0">
                <span className="block truncate text-xs text-sidebar-foreground/75">{option.name}</span>
                {option.description && (
                  <span className="block truncate text-[10px] text-sidebar-foreground/40">{option.description}</span>
                )}
              </div>
              <PlusIcon className="size-3.5 shrink-0 text-sidebar-foreground/35" />
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-sidebar-border/70 px-3 py-3 text-[11px] text-sidebar-foreground/45">尚無可引用來源</p>
      )}
    </section>
  )
}

function SourceStructurePanelContent({
  formalReadiness,
  isMockDataEnabled,
  resourceNodesCount,
}: {
  formalReadiness: AIInputFormalReadinessContract
  isMockDataEnabled: boolean
  resourceNodesCount: number
}) {
  const connectors = isMockDataEnabled ? MOCK_SOURCE_CONNECTORS : []
  const sourceInputMatrixRows: SourceInputMatrixRow[] = isMockDataEnabled
    ? connectors.map((connector) => {
        const inputModeLabel: Record<AIInputSourceControlInputMode, string> = {
          manual: "手動",
          polling: "輪詢",
          webhook: "Webhook",
          event: "事件驅動",
          scheduled: "排程",
          one_time: "一次性",
        }
        const riskLevel: AIInputSourceControlRiskLevel =
          connector.riskPolicy === "高" ? "high" : connector.riskPolicy === "中" ? "medium" : "low"

        return {
          id: connector.id,
          source: connector.source,
          provider: connector.provider,
          connectionStatus: connector.connectionStatus,
          inputMode: connector.inputMode,
          inputModeLabel: inputModeLabel[connector.inputMode],
          riskLevel,
          riskLabel: connector.riskPolicy,
          nextAction: connector.nextAction,
          missingPermissions: connector.missingPermissions,
        }
      })
    : formalReadiness.sourceControlMatrix.rows
  const connectedCount = isMockDataEnabled
    ? connectors.filter((connector) => connector.connectionStatus === "connected").length
    : formalReadiness.sourceControlMatrix.summary.connectedCount
  const setupCount = isMockDataEnabled
    ? connectors.filter((connector) => connector.connectionStatus === "needs_setup").length
    : formalReadiness.sourceControlMatrix.summary.plannedCount +
      formalReadiness.sourceControlMatrix.summary.needsSetupCount
  const reviewCount = isMockDataEnabled
    ? connectors.filter((connector) => connector.syncStatus === "review" || connector.syncStatus === "failed").length
    : formalReadiness.sourceControlMatrix.summary.highRiskCount +
      formalReadiness.sourceControlMatrix.summary.missingPermissionCount

  return (
    <div className="space-y-6 pb-8">
      <section className="grid gap-4 border-b border-border/60 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(420px,1.2fr)]">
        <div>
          <p className="text-sm font-semibold text-foreground">同步設定是外部來源串接與同步狀態</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            這裡先回答哪些來源已經串接、哪些還需要設定、同步是否成功、上次與下次同步時間，以及同步結果是否需要你確認。
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {isMockDataEnabled
              ? `目前為 UI-only mock 狀態總覽，不執行真實同步、不寫入資料庫。可納入設定的 Resource 節點：${resourceNodesCount}。`
              : `正式模式已關閉 mock connector rows。AIINPUT-OPS-002 目前顯示 ${formalReadiness.sourceControlMatrix.summary.rowCount} 個 protected source-control matrix row，並維持 connector runtime 關閉。`}
          </p>
          <div className="mt-4 grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-muted/20">
            <WorkflowStat label="已串接" value={connectedCount.toString()} />
            <WorkflowStat label="待設定" value={setupCount.toString()} />
            <WorkflowStat label="需確認" value={reviewCount.toString()} tone={reviewCount > 0 ? "warning" : "default"} />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border/60">
          {SYNC_SETTING_BOUNDARIES.map((row) => (
            <div key={row.label} className="grid gap-3 border-b border-border/60 px-3 py-2.5 text-xs last:border-b-0 md:grid-cols-[96px_1fr]">
              <span className="font-semibold text-muted-foreground">{row.label}</span>
              <span className="leading-relaxed text-foreground/80">{row.value}</span>
            </div>
          ))}
        </div>
      </section>

      {!isMockDataEnabled && (
        <>
          <FormalReadinessContractPanel
            contract={formalReadiness}
            description="正式模式的 server-only readiness contract。它列出目前可以安全顯示的狀態、被刻意禁止的 runtime 行為，以及 DATTR-024 之前不能跨過的 persistence gate。"
            title="正式資料 BFF readiness"
          />
          <FormalSourceWorkflowReadModelTable contract={formalReadiness} />
          <FormalSourceWorkflowProofBootstrapPanel contract={formalReadiness} />
          <FormalSourceWorkflowGateMatrixTable contract={formalReadiness} />
        </>
      )}

      {/* Input Matrix — DATTR-012 */}
      <WorkbenchTable
        columns={["來源", "輸入模式", "風險", "狀態", "下一步行動", "缺少權限"]}
        description={isMockDataEnabled
          ? "快速掃描每個來源的輸入方式、風險等級與目前需要採取的行動。"
          : `${formalReadiness.sourceControlMatrix.id} 顯示正式來源控制契約；不執行 provider 讀取、webhook、polling、file ingestion 或 DB 寫入。`}
        gridClassName="grid-cols-[minmax(200px,1.4fr)_100px_72px_100px_minmax(180px,1.2fr)_minmax(200px,1.3fr)]"
        title="來源輸入矩陣"
      >
        {sourceInputMatrixRows.length > 0 ? (
          sourceInputMatrixRows.map((row) => {
            const riskColor =
              row.riskLevel === "high"
                ? "text-red-600 dark:text-red-400"
                : row.riskLevel === "medium" || row.riskLevel === "variable"
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            return (
              <WorkflowTableRow
                key={row.id}
                cells={[
                  <span key="src" className="block min-w-0">
                    <span className="block truncate font-medium text-foreground">{row.source}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{row.provider}</span>
                  </span>,
                  <span key="mode" className="text-xs text-muted-foreground">{row.inputModeLabel}</span>,
                  <span key="risk" className={cn("text-xs font-medium", riskColor)}>{row.riskLabel}</span>,
                  <ConnectionStatusBadge key="conn" status={row.connectionStatus} />,
                  <span key="action" className="block min-w-0">
                    <span className="block truncate text-xs text-foreground/80">{row.nextAction}</span>
                    {row.boundary && (
                      <span className="block truncate text-[10px] text-muted-foreground">{row.boundary}</span>
                    )}
                  </span>,
                  row.missingPermissions ? (
                    <span key="perm" className="block truncate text-[10px] text-amber-600 dark:text-amber-400">{row.missingPermissions}</span>
                  ) : (
                    <span key="perm" className="text-[10px] text-muted-foreground/50">—</span>
                  ),
                ]}
                gridClassName="grid-cols-[minmax(200px,1.4fr)_100px_72px_100px_minmax(180px,1.2fr)_minmax(200px,1.3fr)]"
              />
            )
          })
        ) : (
          <EmptyTableRow message="尚未有 source-control matrix row。需先建立 AIINPUT-OPS-002 契約。" />
        )}
      </WorkbenchTable>

      <WorkbenchTable
        columns={["外部來源", "串接", "同步", "同步範圍", "頻率", "上次 / 下次", "模組", "確認"]}
        description="先看 connector 狀態與同步健康度，再看範圍、頻率與需要人工確認的原因。這裡是同步總覽，不是本次對話的 @參考脈絡。"
        gridClassName="grid-cols-[minmax(220px,1.3fr)_110px_110px_minmax(220px,1.3fr)_116px_minmax(140px,1fr)_108px_minmax(150px,1fr)]"
        title="外部串接與同步狀態"
      >
        {connectors.length > 0 ? (
          connectors.map((connector) => (
            <WorkflowTableRow
              key={connector.id}
              cells={[
                <span key="source" className="block min-w-0">
                  <span className="block truncate font-medium text-foreground">{connector.source}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{connector.provider} · {connector.connectorType}</span>
                </span>,
                <ConnectionStatusBadge key="connection" status={connector.connectionStatus} />,
                <SourceSyncStatusBadge key="sync" status={connector.syncStatus} />,
                connector.scope,
                connector.cadence,
                <span key="sync-time" className="block min-w-0">
                  <span className="block truncate">{connector.lastSync}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{connector.nextSync}</span>
                </span>,
                connector.defaultModule,
                <span key="review" className="block min-w-0">
                  <span className="block truncate">{connector.reviewRule}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">風險：{connector.riskPolicy}</span>
                </span>,
              ]}
              gridClassName="grid-cols-[minmax(220px,1.3fr)_110px_110px_minmax(220px,1.3fr)_116px_minmax(140px,1fr)_108px_minmax(150px,1fr)]"
            />
          ))
        ) : (
          <EmptyTableRow message="Mock connector 已關閉；尚未有 Supabase-backed SourceConnection / AIWorkflowRun 資料可顯示。" />
        )}
      </WorkbenchTable>

      <WorkbenchTable
        columns={["條件", "處理方式", "原因"]}
        description="同步設定應該把不確定、敏感或需要決策的結果送到 AI 工作台與早安簡報，而不是自動寫入模組。"
        gridClassName="grid-cols-[minmax(180px,1fr)_minmax(240px,1.2fr)_minmax(300px,1.8fr)]"
        title="人工確認政策"
      >
        {SYNC_REVIEW_POLICIES.map((policy) => (
          <WorkflowTableRow
            key={policy.id}
            cells={[policy.condition, policy.handling, policy.reason]}
            gridClassName="grid-cols-[minmax(180px,1fr)_minmax(240px,1.2fr)_minmax(300px,1.8fr)]"
          />
        ))}
      </WorkbenchTable>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-7 rounded-full border-border/50 bg-background/50 hover:bg-muted text-xs font-normal gap-1.5 px-2.5 whitespace-nowrap shadow-sm"
    >
      <span className="size-3 text-muted-foreground">{icon}</span>
      {label}
    </Button>
  )
}

function TriageCardWrapper({
  proposalId,
  proposals,
  rawSourceItems,
  getEvidenceForProposal,
  resolveProposal,
}: {
  proposalId: string
  proposals: AITriageProposal[]
  rawSourceItems: RawSourceItem[]
  getEvidenceForProposal: (id: string) => Evidence[]
  resolveProposal: (id: string, decision: DecisionType, edited?: string) => void
}) {
  const proposal = proposals.find((p) => p.id === proposalId)
  if (!proposal) return null
  const linkedSources = rawSourceItems.filter((item) => proposal.rawSourceItemIds.includes(item.id))
  const evidences = getEvidenceForProposal(proposal.id)
  return (
    <TriageProposalCard
      proposal={proposal}
      linkedSources={linkedSources}
      evidences={evidences}
      onDecision={resolveProposal}
      className="shadow-md border-primary/10"
    />
  )
}

function WorkflowWorkbenchPanelContent({
  activeTab,
  formalReadiness,
  isMockDataEnabled,
  onTabChange,
  pendingProposalCount,
  rawSourceCount,
  compact = false,
}: {
  activeTab: WorkbenchTab
  formalReadiness: AIInputFormalReadinessContract
  isMockDataEnabled: boolean
  onTabChange: (tab: WorkbenchTab) => void
  pendingProposalCount: number
  rawSourceCount: number
  compact?: boolean
}) {
  const formalWorkflowKinds: AIInputSourceWorkflowReadModelKind[] = [
    "ai_workflow_run",
    "ai_work_item",
    "data_unit_proposal",
    "module_write_intent",
  ]
  const formalWorkflowModels = formalReadiness.sourceWorkflow.models.filter((model) =>
    formalWorkflowKinds.includes(model.kind)
  )
  const workflowRuns = isMockDataEnabled ? MOCK_WORKFLOW_RUNS : []
  const reviewItems = isMockDataEnabled ? MOCK_REVIEW_ITEMS : []
  const sourceEnvironments = isMockDataEnabled ? MOCK_SOURCE_ENVIRONMENTS : []
  const organizingResults = isMockDataEnabled ? MOCK_ORGANIZING_RESULTS : []
  const workLog = isMockDataEnabled ? MOCK_WORK_LOG : []
  const reviewCount = isMockDataEnabled ? reviewItems.length + pendingProposalCount : formalWorkflowModels.length
  const completedCount = workflowRuns.filter((run) => run.status === "completed").length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("border-b border-border/60 px-4 py-3", compact && "px-3")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">AI 工作台</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">Source Workflow Console</h2>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {isMockDataEnabled ? "Mock" : "正式模式"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-muted/20">
          <WorkflowStat label="今日" value={workflowRuns.length.toString()} />
          <WorkflowStat label="完成" value={completedCount.toString()} />
          <WorkflowStat label="確認" value={reviewCount.toString()} tone={reviewCount > 0 ? "warning" : "default"} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {isMockDataEnabled
            ? "目前只顯示 workflow 表格狀態；不執行真實同步、不寫入資料庫。"
            : "Mock workflow 已關閉；DATTR-024A 先顯示正式 workflow read model 的空/不可用狀態。"}
        </p>
      </div>

      <div className="border-b border-border/60 p-2">
        <div className={cn("flex gap-1 overflow-x-auto no-scrollbar", compact && "grid grid-cols-2 overflow-visible")}>
          {WORKBENCH_TABS.map((tab) => (
            <button
              key={tab.id}
              data-testid={`workbench-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex min-w-max items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {tab.icon}
              <span className="flex-1 truncate">{tab.label}</span>
              {tab.id === "review" && reviewCount > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  activeTab === tab.id ? "bg-primary-foreground/20" : "bg-amber-100 text-amber-700"
                )}>
                  {reviewCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto p-3", compact && "p-2")}>
        {!isMockDataEnabled && (
          <div className="mb-3 space-y-3">
            <FormalReadinessContractPanel
              compact
              contract={formalReadiness}
              description="Mock workflow 關閉後，AI 工作台先顯示 formal readiness contract，而不是假裝已有正式 run 或 work item。"
              title="正式 Workflow readiness"
            />
            <FormalSourceWorkflowReadModelTable
              compact
              contract={formalReadiness}
              focusKinds={formalWorkflowKinds}
            />
            <FormalSourceWorkflowProofBootstrapPanel compact contract={formalReadiness} />
            <FormalSourceWorkflowGateMatrixTable compact contract={formalReadiness} />
          </div>
        )}

        {activeTab === "today" && (
          <WorkbenchTable
            columns={["來源", "狀態", "整理結果", "可引用 ID"]}
            description={isMockDataEnabled
              ? `${rawSourceCount} 個 mock source assets 正在形成可觀察 workflow。`
              : "正式模式下不顯示 mock source assets；這裡會列出真實同步與整理 run。"}
            gridClassName="grid-cols-[minmax(160px,1.2fr)_96px_minmax(220px,2fr)_150px]"
            title="今日 Workflow"
          >
            {workflowRuns.length > 0 ? (
              workflowRuns.map((run) => (
                <WorkflowTableRow
                  key={run.id}
                  cells={[
                    run.source,
                    <WorkflowStatusBadge key="status" status={run.status} />,
                    run.detail,
                    <span key="mention" className="font-mono text-[11px] text-muted-foreground">{run.mentionLabel}</span>,
                  ]}
                  gridClassName="grid-cols-[minmax(160px,1.2fr)_96px_minmax(220px,2fr)_150px]"
                />
              ))
            ) : (
              <EmptyTableRow message="尚無 Supabase-backed workflow run。下一步需要實作 SourceAsset / AIWorkflowRun BFF。" />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "review" && (
          <WorkbenchTable
            columns={["類型", "目標", "需要確認的原因", "風險"]}
            description="只顯示不確定、風險、或需要你決策的項目。"
            gridClassName="grid-cols-[112px_minmax(160px,1fr)_minmax(240px,2fr)_88px]"
            title="需要確認"
          >
            {reviewItems.map((item) => (
                <WorkflowTableRow
                  key={item.id}
                  cells={[
                    item.label,
                    <span key="target" className="font-mono text-[11px] text-muted-foreground">{item.target}</span>,
                    `${item.title}：${item.description}`,
                    <span key="severity" className={cn("text-xs font-semibold", item.severity === "high" ? "text-rose-600" : "text-amber-600")}>
                      {item.severity === "high" ? "高" : "中"}
                    </span>,
                  ]}
                  gridClassName="grid-cols-[112px_minmax(160px,1fr)_minmax(240px,2fr)_88px]"
                />
              ))}
            {pendingProposalCount > 0 && (
              <WorkflowTableRow
                cells={[
                  "Triage",
                  <span key="target" className="font-mono text-[11px] text-muted-foreground">@TRIAGE-PENDING</span>,
                  `目前 ingestion mock pipeline 還有 ${pendingProposalCount} 個待確認 proposal，可在對話中逐一處理。`,
                  <span key="severity" className="text-xs font-semibold text-amber-600">中</span>,
                ]}
                gridClassName="grid-cols-[112px_minmax(160px,1fr)_minmax(240px,2fr)_88px]"
              />
            )}
            {reviewItems.length === 0 && pendingProposalCount === 0 && (
              <EmptyTableRow message="正式模式下目前沒有 Supabase-backed AIWorkItem。Mock 確認卡已關閉。" />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "environment" && (
          <WorkbenchTable
            columns={["來源", "頻率", "預設模組", "風險", "簡報規則"]}
            description="顯示來源處理規則，不是詳細 connector 後台。"
            gridClassName="grid-cols-[minmax(220px,1.6fr)_100px_100px_92px_132px]"
            title="來源環境"
          >
            {sourceEnvironments.length > 0 ? (
              sourceEnvironments.map((source) => (
                <WorkflowTableRow
                  key={source.id}
                  cells={[source.source, source.cadence, source.module, source.risk, source.brief]}
                  gridClassName="grid-cols-[minmax(220px,1.6fr)_100px_100px_92px_132px]"
                />
              ))
            ) : (
              <EmptyTableRow message="尚無正式 SourceWorkflowConfig。需先將來源環境設定持久化到 Supabase。" />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "results" && (
          <WorkbenchTable
            columns={["狀態", "候選成果", "說明"]}
            description="AI 已整理出的候選成果，仍需經由 proposal / write intent。"
            gridClassName="grid-cols-[116px_minmax(220px,1.2fr)_minmax(260px,2fr)]"
            title="整理結果"
          >
            {organizingResults.length > 0 ? (
              organizingResults.map((result) => (
                <WorkflowTableRow
                  key={result.id}
                  cells={[
                    <span key="status" className="text-xs font-semibold text-primary">{result.status}</span>,
                    result.title,
                    result.detail,
                  ]}
                  gridClassName="grid-cols-[116px_minmax(220px,1.2fr)_minmax(260px,2fr)]"
                />
              ))
            ) : (
              <EmptyTableRow message="尚無正式整理結果。需等 DataUnitProposal / ModuleWriteIntent 接上 Supabase。" />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "log" && (
          <WorkbenchTable
            columns={["時間", "事件"]}
            description="保留近期 workflow 透明度，詳細 step 之後再 drill down。"
            gridClassName="grid-cols-[80px_minmax(320px,1fr)]"
            title="工作紀錄"
          >
            {workLog.length > 0 ? (
              workLog.map((entry) => (
                <WorkflowTableRow
                  key={entry.id}
                  cells={[
                    <span key="time" className="font-mono text-[11px] text-muted-foreground">{entry.time}</span>,
                    entry.text,
                  ]}
                  gridClassName="grid-cols-[80px_minmax(320px,1fr)]"
                />
              ))
            ) : (
              <EmptyTableRow message="尚無正式 workflow event log。Mock 工作紀錄已關閉。" />
            )}
          </WorkbenchTable>
        )}
      </div>
    </div>
  )
}

function readinessToneClass(tone: AIInputFormalReadinessTone) {
  if (tone === "good") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (tone === "blocked") return "border-red-200 bg-red-50 text-red-700"
  if (tone === "warn") return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-border bg-muted/30 text-muted-foreground"
}

function FormalReadinessContractPanel({
  compact = false,
  contract,
  description,
  title,
}: {
  compact?: boolean
  contract: AIInputFormalReadinessContract
  description: string
  title: string
}) {
  const visibleRows = compact ? contract.rows.slice(0, 4) : contract.rows

  return (
    <section className={cn("overflow-hidden rounded-lg border border-border/60 bg-background", compact && "text-xs")}>
      <div className="flex flex-col gap-3 border-b border-border/60 px-3 py-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <ReadinessPill tone="neutral">{contract.id}</ReadinessPill>
          <ReadinessPill tone={contract.supabase.publicConfig === "configured" ? "neutral" : "blocked"}>
            Supabase {contract.supabase.publicConfig}
          </ReadinessPill>
          <ReadinessPill tone="blocked">{contract.persistence.current.replace(/_/g, " ")}</ReadinessPill>
        </div>
      </div>

      <div className="grid gap-0">
        {visibleRows.map((row) => (
          <FormalReadinessRowView key={row.area} row={row} />
        ))}
      </div>

      {!compact && (
        <div className="border-t border-border/60 bg-muted/20 px-3 py-3">
          <p className="text-xs font-semibold text-foreground">Blocked runtime behavior</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {contract.prohibitedRuntime.map((item) => (
              <ReadinessPill key={item} tone="warn">
                {item}
              </ReadinessPill>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{contract.persistence.futureGate}</p>
        </div>
      )}
    </section>
  )
}

function FormalSourceWorkflowReadModelTable({
  compact = false,
  contract,
  focusKinds,
}: {
  compact?: boolean
  contract: AIInputFormalReadinessContract
  focusKinds?: AIInputSourceWorkflowReadModelKind[]
}) {
  const models = focusKinds
    ? contract.sourceWorkflow.models.filter((model) => focusKinds.includes(model.kind))
    : contract.sourceWorkflow.models
  const title = compact ? "正式 Workflow read model" : "Source Workflow formal read model"
  const description = compact
    ? `${contract.sourceWorkflow.id} keeps workflow/proposal rows honest before persistence.`
    : `${contract.sourceWorkflow.id} exposes protected empty/unavailable DTOs for future SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, and ModuleWriteIntent without hidden mock fallback.`
  const columns = compact ? ["物件", "狀態", "下一步"] : ["物件", "目前狀態", "正式空狀態", "下一步", "追蹤"]
  const gridClassName = compact
    ? "grid-cols-[minmax(160px,1fr)_112px_minmax(220px,1.5fr)]"
    : "grid-cols-[minmax(160px,1fr)_128px_minmax(260px,1.5fr)_minmax(280px,1.7fr)_minmax(180px,1fr)]"

  return (
    <WorkbenchTable
      columns={columns}
      description={description}
      gridClassName={gridClassName}
      title={title}
    >
      {models.length > 0 ? (
        models.map((model) => (
          <WorkflowTableRow
            key={model.kind}
            cells={compact
              ? [
                  model.label,
                  <ReadinessPill key="state" tone={model.tone}>{model.statusLabel}</ReadinessPill>,
                  model.nextGate,
                ]
              : [
                  <span key="model" className="block min-w-0">
                    <span className="block truncate font-medium text-foreground">{model.label}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{model.description}</span>
                  </span>,
                  <span key="state" className="space-y-1">
                    <ReadinessPill tone={model.tone}>{model.statusLabel}</ReadinessPill>
                    <span className="block text-[10px] text-muted-foreground">
                      Count {model.count ?? "unavailable"}
                    </span>
                  </span>,
                  model.emptyState,
                  model.nextGate,
                  <span key="refs" className="block min-w-0">
                    <span className="block truncate text-[10px] text-muted-foreground">{model.auditRefs.join(" / ")}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{model.sourceRefs.join(" / ")}</span>
                  </span>,
                ]}
            gridClassName={gridClassName}
          />
        ))
      ) : (
        <EmptyTableRow message="這個 formal read model 尚無可顯示物件。" />
      )}
    </WorkbenchTable>
  )
}

function FormalSourceWorkflowGateMatrixTable({
  compact = false,
  contract,
}: {
  compact?: boolean
  contract: AIInputFormalReadinessContract
}) {
  const gateMatrix = contract.sourceWorkflowGateMatrix
  const rows = compact ? gateMatrix.rows.slice(-4) : gateMatrix.rows
  const title = compact ? "Source Workflow gate matrix" : "AIINPUT-OPS-003 Source Workflow gate matrix"
  const description = compact
    ? `${gateMatrix.id} shows H/I/J/K/L and cutover state without DB reads, writes, or connector runtime.`
    : `${gateMatrix.id} exposes the protected H/I/J/K/L gate state, owner-run proof commands, connector approval state, RLS/audit state, and blocked runtime behavior before formal persistence.`
  const columns = compact ? ["Gate", "State", "Command"] : ["Gate", "State", "Owner-run command", "Allowed now", "Blocked runtime", "Next"]
  const gridClassName = compact
    ? "grid-cols-[minmax(180px,1fr)_118px_minmax(220px,1.4fr)]"
    : "grid-cols-[minmax(180px,1fr)_120px_minmax(220px,1fr)_minmax(220px,1fr)_minmax(240px,1.1fr)_minmax(240px,1.1fr)]"

  return (
    <WorkbenchTable
      columns={columns}
      description={description}
      gridClassName={gridClassName}
      title={title}
    >
      {rows.map((row) => (
        <WorkflowTableRow
          key={row.id}
          cells={compact
            ? [
                <span key="gate" className="block min-w-0">
                  <span className="block truncate font-medium text-foreground">{row.gateLabel}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{row.id}</span>
                </span>,
                <ReadinessPill key="state" tone={row.tone}>{row.statusLabel}</ReadinessPill>,
                <span key="cmd" className="block min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                  {row.ownerRunCommand}
                </span>,
              ]
            : [
                <span key="gate" className="block min-w-0">
                  <span className="block truncate font-medium text-foreground">{row.gateLabel}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{row.id}</span>
                </span>,
                <span key="state" className="space-y-1">
                  <ReadinessPill tone={row.tone}>{row.statusLabel}</ReadinessPill>
                  <span className="block text-[10px] text-muted-foreground">{row.state.replace(/_/g, " ")}</span>
                </span>,
                <span key="cmd" className="block min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                  {row.ownerRunCommand}
                </span>,
                row.allowedNow,
                row.blockedRuntime,
                <span key="next" className="block min-w-0">
                  <span className="block text-xs text-foreground/80">{row.nextAction}</span>
                  <span className="block text-[10px] text-muted-foreground">{row.boundary}</span>
                </span>,
              ]}
          gridClassName={gridClassName}
        />
      ))}
    </WorkbenchTable>
  )
}

function FormalSourceWorkflowProofBootstrapPanel({
  compact = false,
  contract,
}: {
  compact?: boolean
  contract: AIInputFormalReadinessContract
}) {
  const proof = contract.sourceWorkflowProofBootstrap
  const proofEvidence = proof.latestEvidence
  const handoff = proof.proofTargetHandoff
  const tone: AIInputFormalReadinessTone = proof.summary.canRunChildProof
    ? "warn"
    : proof.summary.packetStatus === "missing_packet"
      ? "blocked"
      : "warn"
  const evidenceAge =
    proofEvidence.latest.latestAgeMinutes === null
      ? "not collected"
      : `${proofEvidence.latest.latestAgeMinutes} min old`
  const targetSummary = proof.target.provided
    ? `${proof.target.source} / ${proof.target.hostClass} / proof marker ${proof.target.databaseNameHasProofMarker ? "yes" : "no"}`
    : "No explicit local/disposable proof target"
  const safetySummary = [
    `no silent DATABASE_URL ${proof.safety.doesNotUseDatabaseUrlSilently ? "yes" : "no"}`,
    `no migration apply ${proof.safety.doesNotApplyMigration ? "yes" : "no"}`,
    `no default write ${proof.safety.doesNotWriteDatabaseByDefault ? "yes" : "no"}`,
    "externalRegisterable false",
  ].join(" / ")
  const handoffEvidenceTargets =
    handoff.evidenceTargets.length > 0 ? handoff.evidenceTargets.slice(0, 3).join(" / ") : "not_collected"

  return (
    <section className="rounded-lg border border-border/60 bg-muted/10">
      <div className="flex flex-col gap-3 border-b border-border/60 px-3 py-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {compact ? "Local proof bootstrap" : "DATTR-024O Source Workflow proof packet"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {compact
              ? "Latest local bootstrap packet, child proof command, and missing owner inputs."
              : "Protected no-secret view of the latest local Source Workflow proof bootstrap packet. The UI never executes the command or renders target URL, host, credentials, or raw packet body."}
          </p>
        </div>
        <ReadinessPill tone={tone}>{proof.summary.packetStatus}</ReadinessPill>
      </div>

      <div className={cn("grid gap-3 p-3 text-xs", compact ? "md:grid-cols-2" : "lg:grid-cols-4")}>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">Latest packet</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
            {proof.source.latestPacketPath}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{proof.summary.checkerStatus}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Evidence freshness {proofEvidence.latest.freshness} / {evidenceAge}
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">Target classification</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">{targetSummary}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            URL redacted {proof.target.targetUrlRedacted ? "yes" : "no"} / host redacted{" "}
            {proof.target.hostRedacted ? "yes" : "no"}
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">Child proof command</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
            {proof.plannedChildProcess.command}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            runnable now {proof.plannedChildProcess.runnableNow ? "yes" : "no"}
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">Manual Ops gap</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            {proof.summary.missingCount} missing / {proof.summary.warningCount} warning
          </p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
            {proof.source.bootstrapCommand}
          </p>
        </div>
      </div>

      {!compact && (
        <div className="grid gap-3 border-t border-border/60 p-3 text-xs lg:grid-cols-4">
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">DATTR-024Q proof target handoff</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">{handoff.ownerAction}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {handoff.missingPrerequisites.length} missing / no runtime execution
            </p>
          </div>
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">Env var names only</p>
            <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
              {handoff.envVarNames.join(" / ")}
            </p>
          </div>
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">Evidence targets</p>
            <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
              {handoffEvidenceTargets}
            </p>
          </div>
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">Pass / fail signals</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {handoff.passSignals[0]} Fail if {handoff.failSignals.slice(0, 2).join(" or ")}.
            </p>
          </div>
        </div>
      )}

      {!compact && (
        <div className="grid gap-3 border-t border-border/60 p-3 text-xs lg:grid-cols-3">
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">Next owner action</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {proof.ownerActions[0] ?? "Run the local proof bootstrap after selecting a disposable target."}
            </p>
          </div>
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">Missing prerequisites</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {proof.missing.length > 0 ? proof.missing.join(" / ") : "No missing prerequisite in the latest packet."}
            </p>
          </div>
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">Stop conditions</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              {handoff.stopConditions[0]} {safetySummary}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function FormalReadinessRowView({ row }: { row: AIInputFormalReadinessRow }) {
  return (
    <div className="grid gap-3 border-b border-border/60 px-3 py-3 text-xs last:border-b-0 lg:grid-cols-[180px_120px_minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{row.area}</p>
        <p className="mt-1 text-muted-foreground">{row.signal}</p>
      </div>
      <div>
        <ReadinessPill tone={row.tone}>{row.status.replace(/_/g, " ")}</ReadinessPill>
      </div>
      <p className="leading-relaxed text-muted-foreground">{row.safeExposure}</p>
      <p className="leading-relaxed text-muted-foreground">{row.nextGate}</p>
    </div>
  )
}

function ReadinessPill({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: AIInputFormalReadinessTone
}) {
  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", readinessToneClass(tone))}>
      {children}
    </span>
  )
}

function WorkflowStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <div className="px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold leading-tight", tone === "warning" && "text-amber-700")}>{value}</p>
    </div>
  )
}

function WorkbenchTable({
  title,
  description,
  columns,
  gridClassName,
  children,
}: {
  title: string
  description: string
  columns: string[]
  gridClassName: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <div className={cn("grid min-w-[680px] border-b border-border/60 bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground", gridClassName)}>
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        <div className="divide-y divide-border/60">{children}</div>
      </div>
    </section>
  )
}

function WorkflowTableRow({
  cells,
  gridClassName,
}: {
  cells: React.ReactNode[]
  gridClassName: string
}) {
  return (
    <div className={cn("grid min-w-[680px] items-center gap-3 px-3 py-2.5 text-xs text-foreground/80 hover:bg-muted/30", gridClassName)}>
      {cells.map((cell, index) => (
        <div key={index} className="min-w-0 truncate">
          {cell}
        </div>
      ))}
    </div>
  )
}

function EmptyTableRow({ message }: { message: string }) {
  return (
    <div className="min-w-[680px] px-3 py-6 text-xs leading-relaxed text-muted-foreground">
      {message}
    </div>
  )
}

function WorkflowStatusBadge({ status }: { status: WorkflowRunCard["status"] }) {
  const statusConfig = {
    completed: { label: "完成", icon: <CheckCircle2Icon className="size-3.5" />, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    review: { label: "需確認", icon: <AlertTriangleIcon className="size-3.5" />, className: "text-amber-700 bg-amber-50 border-amber-200" },
    partial: { label: "部分完成", icon: <Clock3Icon className="size-3.5" />, className: "text-sky-700 bg-sky-50 border-sky-200" },
  }[status]

  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", statusConfig.className)}>
      {statusConfig.icon}
      {statusConfig.label}
    </span>
  )
}

function ConnectionStatusBadge({ status }: { status: SourceConnectorRow["connectionStatus"] }) {
  const statusConfig = {
    connected: { label: "已串接", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    needs_setup: { label: "待設定", className: "text-amber-700 bg-amber-50 border-amber-200" },
    planned: { label: "規劃中", className: "text-sky-700 bg-sky-50 border-sky-200" },
    paused: { label: "暫停", className: "text-slate-600 bg-slate-50 border-slate-200" },
    error: { label: "錯誤", className: "text-rose-700 bg-rose-50 border-rose-200" },
  }[status]

  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", statusConfig.className)}>
      {statusConfig.label}
    </span>
  )
}

function SourceSyncStatusBadge({ status }: { status: SourceConnectorRow["syncStatus"] }) {
  const statusConfig = {
    completed: { label: "完成", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    review: { label: "需確認", className: "text-amber-700 bg-amber-50 border-amber-200" },
    idle: { label: "待機", className: "text-slate-600 bg-slate-50 border-slate-200" },
    running: { label: "同步中", className: "text-sky-700 bg-sky-50 border-sky-200" },
    not_configured: { label: "未設定", className: "text-muted-foreground bg-muted border-border" },
    failed: { label: "失敗", className: "text-rose-700 bg-rose-50 border-rose-200" },
  }[status]

  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", statusConfig.className)}>
      {statusConfig.label}
    </span>
  )
}
