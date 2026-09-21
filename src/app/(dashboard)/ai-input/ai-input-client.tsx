"use client"

import * as React from "react"
import {
  AudioLinesIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Clock3Icon,
  CopyIcon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  HistoryIcon,
  ImageIcon,
  InfoIcon,
  ListChecksIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  PenLineIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  RssIcon,
  SearchIcon,
  SendIcon,
  Settings2Icon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  LinkIcon,
  InboxIcon,
  ZapIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DetailDrawer } from "@/components/owneros/detail-drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TriageProposalCard } from "@/components/ai/triage-proposal-card"
import { useIngestion } from "@/lib/context/ingestion-context"
import { useIsDemoAccount } from "@/lib/context/demo-account-context"
import { useMockDataMode } from "@/lib/context/mock-data-mode-context"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { cn } from "@/lib/utils"
import { generateReferenceCode } from "@/lib/naming/reference-code"
import { AddLinkDialog } from "@/components/ai/add-link-dialog"
import { FileLibraryPage } from "@/components/ai/file-library/file-library-page"
import { MediaLibraryPage } from "@/components/ai/media-library/media-library-page"
import {
  SourceConnectionWizard,
  type SourceConnectionDraft,
} from "@/components/ai/source-connections/source-connection-wizard"
import type { ProductCopy } from "@/lib/i18n/product-copy"
import { getAIResponse } from "./actions"
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
import type { AIInputSourceConnectionCatalogDTO } from "@/types/ai-input-source-connection-catalog"
import type { AITriageProposal, DecisionType, Evidence, RawSourceItem } from "@/types/ingestion"
import type {
  SourceSyncMode,
  SourceAnalysisMode,
  SourceRiskClassification,
  SourceApprovalLevel,
  SourceThinkingNodeDTO,
  SourceProcessingPolicyDTO,
} from "@/types/ai-input-settings"


// ─── Chat Mode ────────────────────────────────────────────────────────────────

type ChatMode =
  | "general"
  | "report_gen"
  | "reflection"
  | "work"
  | "research"
  | "chamber"
  | "finance"
  | "life"
  | "company"

const CHAT_MODES: Record<ChatMode, { label: string; placeholder: string; hint: string; actions: string[] }> = {
  general: {
    label: "一般（自動分類）",
    placeholder: "快速記錄任何想法、訊息或碎片，由 AI 自動進行分類分流…",
    hint: "快速擷取，自動分類",
    actions: ["line", "googledoc", "link", "markdown", "image", "audio", "rss"],
  },
  report_gen: {
    label: "報告生成（自動分類）",
    placeholder: "描述要生成的報告範圍或時段，AI 將從歷史記錄中彙整大綱與報告內容…",
    hint: "報告彙整，自動生成",
    actions: [],
  },
  reflection: {
    label: "反思",
    placeholder: "整理當下的狀態、學習收穫、自我省思，AI 協助梳理思緒脈絡…",
    hint: "個人反思，自我整理",
    actions: [],
  },
  work: {
    label: "工作",
    placeholder: "輸入工作進度、待辦任務、專案問題或客戶反饋情況…",
    hint: "專案規劃，工作記憶",
    actions: ["line", "googledoc", "markdown"],
  },
  research: {
    label: "研究",
    placeholder: "輸入文獻連結、論文重點、研究方向想法或學術探討…",
    hint: "知識分析，研究建議",
    actions: ["googledoc", "rss", "markdown"],
  },
  chamber: {
    label: "商會",
    placeholder: "記錄商會活動、成員引薦機會、拜訪線索或合作計畫…",
    hint: "成員互動，人際關係",
    actions: ["line", "googledoc", "markdown"],
  },
  finance: {
    label: "財務",
    placeholder: "記下收支明細，例如：『買午餐 150 元』或『收到專案款項』…",
    hint: "記帳分析，收支管理",
    actions: ["line", "markdown"],
  },
  life: {
    label: "生活",
    placeholder: "記錄日常健康狀態、運動、睡眠感受，或是重要的人生記憶…",
    hint: "日常節律，健康追蹤",
    actions: ["line", "markdown"],
  },
  company: {
    label: "公司",
    placeholder: "整理公司策略願景、核心發展指標，或中長期規劃方向…",
    hint: "願景定版，戰略規畫",
    actions: ["googledoc", "markdown"],
  },
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Sender = "user" | "ai"
type WorkbenchTab = "today" | "review" | "environment" | "results" | "log"
type AIInputSubpage = "chat" | "context" | "settings" | "workbench" | "files" | "media"

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
  provenanceNote?: string | null
  accountLabel?: string
  mockOnly?: true
}

type SourceSettingsCopy = ProductCopy["aiInput"]["chat"]["sourceSettings"]
const SOURCE_SETTINGS_DRAWER_TABS = ["sync", "nodes", "routing", "approval", "governance"] as const
type SourceSettingsDrawerTab = (typeof SOURCE_SETTINGS_DRAWER_TABS)[number]

interface SourceConnectorDisplayCopy {
  source?: string
  provider?: string
  connectorType?: string
  scope?: string
  cadence?: string
  lastSync?: string
  nextSync?: string
  defaultModule?: string
  riskLabel?: string
  reviewRule?: string
  nextAction?: string
  missingPermissions?: string
  provenanceNote?: string
}

interface ExtendedSourceConnectorRow extends SourceConnectorRow {
  syncMode: SourceSyncMode
  syncSchedule: string | null
  syncEnabled: boolean
  analysisMode: SourceAnalysisMode
  analysisSchedule: string | null
  analysisEnabled: boolean
  analyzeOnlyWhenPending: boolean
  allowedTargetModules: string[]
  riskClassification: SourceRiskClassification
  approvalLevel: SourceApprovalLevel
  includeInMorningBrief: boolean;
  retentionDays: number
  piiMaskingEnabled: boolean
  uploadDirectory: string
  thinkingNodes: SourceThinkingNodeDTO[]
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

interface OwnerAIInputSourceIndexRow {
  id: string
  label: string
  meta: string
  status: AIInputSourceControlConnectionStatus
  nextAction: string
}

interface OwnerAIInputSourceSummary {
  rowCount: number
  connectedCount: number
  attentionCount: number
  providerCount: number
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

// 2026-09-05: hidden per product owner direction — the landing screen should
// stay minimal (title + composer only) while the owner explores the surface
// unaided. Left in place, not deleted, so the suggestion grid can come back
// later (e.g. as an onboarding-only affordance) without re-authoring it.
const SHOW_LANDING_SUGGESTIONS = false

const QUICK_PROMPTS = [
  { id: "thought", icon: <PenLineIcon className="size-4" /> },
  { id: "project", icon: <FolderIcon className="size-4" /> },
  { id: "meeting", icon: <MessageSquareIcon className="size-4" /> },
  { id: "insight", icon: <SparklesIcon className="size-4" /> },
] as const

const COWORK_STARTERS: CoworkStarter[] = [
  {
    id: "work",
    icon: <FolderIcon className="size-4" />,
    label: "工作專案共作",
    description: "把客戶訊息、文件與下一步先丟進來，AI 先幫你整理脈絡。",
    mode: "work",
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
    mode: "chamber",
    prompt: "我想整理一段商會或人際合作脈絡：",
    contextHint: "適合搭配 LINE 群組、聯絡人、會議紀錄",
  },
]

const WORKBENCH_TABS: Array<{ id: WorkbenchTab; icon: React.ReactNode }> = [
  { id: "today", icon: <ListChecksIcon className="size-3.5" /> },
  { id: "review", icon: <ShieldAlertIcon className="size-3.5" /> },
  { id: "environment", icon: <Settings2Icon className="size-3.5" /> },
  { id: "results", icon: <DatabaseIcon className="size-3.5" /> },
  { id: "log", icon: <HistoryIcon className="size-3.5" /> },
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
  { id: "env-line", source: "LINE 商會核心幹部群", cadence: "每日同步", module: "商會", risk: "中風險", brief: "進今日摘要" },
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
    source: "Google Drive Personal OS 研究資料夾",
    provider: "Google Drive",
    connectorType: "Folder files",
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
    provenanceNote: "資料夾內 Google Docs、Sheets 與 Slides 保留 Drive 檔案身分與快照來源。",
  },
  {
    id: "sync-google-drive-work-folder",
    source: "Google Drive 專案資料夾",
    provider: "Google Drive",
    connectorType: "Folder files",
    connectionStatus: "connected",
    syncStatus: "idle",
    scope: "指定資料夾內 Docs、Sheets、Slides、PDF 等檔案與更新",
    cadence: "文件變更",
    lastSync: "今天 10:08",
    nextSync: "等待變更",
    defaultModule: "工作",
    riskPolicy: "中",
    reviewRule: "外部分享前確認",
    inputMode: "event",
    nextAction: "無需操作",
    missingPermissions: null,
    provenanceNote: "Google Docs 等原生檔案保留 Drive file ID、MIME type、revision 與 export/snapshot 來源。",
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

function formatCopyTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  )
}

function getSourceConnectorDisplay(
  connector: SourceConnectorRow,
  sourceSettingsCopy: SourceSettingsCopy
) {
  const rowCopy = (sourceSettingsCopy.sourceRows as Record<string, SourceConnectorDisplayCopy>)[connector.id] ?? {}

  return {
    source: rowCopy.source ?? connector.source,
    provider: rowCopy.provider ?? connector.provider,
    connectorType: rowCopy.connectorType ?? connector.connectorType,
    scope: rowCopy.scope ?? connector.scope,
    cadence: rowCopy.cadence ?? connector.cadence,
    lastSync: rowCopy.lastSync ?? connector.lastSync,
    nextSync: rowCopy.nextSync ?? connector.nextSync,
    defaultModule: rowCopy.defaultModule ?? connector.defaultModule,
    riskLabel: rowCopy.riskLabel ?? connector.riskPolicy,
    reviewRule: rowCopy.reviewRule ?? connector.reviewRule,
    nextAction: rowCopy.nextAction ?? connector.nextAction,
    missingPermissions: rowCopy.missingPermissions ?? connector.missingPermissions,
    provenanceNote: rowCopy.provenanceNote ?? connector.provenanceNote,
  }
}

function getSourceProviderTypeLabel(
  provider: string,
  connectorType: string,
  sourceSettingsCopy: SourceSettingsCopy
) {
  const key = `${provider} · ${connectorType}`
  const providerTypeLabels = sourceSettingsCopy.providerTypeLabels as Record<string, string>
  return providerTypeLabels[key] ?? key
}

function generateAIResponse(text: string, mode: ChatMode, locale: "zh-TW" | "en-US"): string {
  const normalizedText = text.toLowerCase().trim()

  if (locale === "en-US") {
    if (["hi", "hello", "你好", "嗨", "哈囉", "greet"].some((g) => normalizedText.includes(g))) {
      return "Hello! I am your Personal OS assistant. What would you like to capture, organize, or plan today?"
    }

    if (["好的", "ok", "了解", "收到", "嗯嗯", "okay", "對", "好的！"].some((a) => normalizedText === a)) {
      return "Got it. Send me the idea, task, context, or project update whenever you are ready."
    }

    if (["什麼", "如何", "怎麼", "哪裡", "嗎", "？", "?"].some((q) => normalizedText.includes(q))) {
      if (normalizedText.includes("project") || normalizedText.includes("work") || normalizedText.includes("task") || normalizedText.includes("專案") || normalizedText.includes("工作") || normalizedText.includes("任務")) {
        return "For work planning, start by naming the outcome, current blocker, next owner action, and any source context. I can help turn that into a clean next-step proposal."
      }
      if (normalizedText.includes("research") || normalizedText.includes("paper") || normalizedText.includes("文獻") || normalizedText.includes("研究")) {
        return "For research work, it helps to separate the question, source material, claims, and possible work applications. Share the source or idea and I will help structure it."
      }
      if (normalizedText.includes("finance") || normalizedText.includes("expense") || normalizedText.includes("money") || normalizedText.includes("財務") || normalizedText.includes("錢") || normalizedText.includes("支出")) {
        return "For finance-related notes, keep the amount, category, date, and context clear. I can help draft a review item, but final finance writes stay owner-approved."
      }
      return `Good question. For "${text}", we can break this into context, decision, next action, and what evidence would make the answer more reliable.`
    }

    switch (mode) {
      case "general":
        return `Useful capture. For "${text}", I would first ask: what is the fastest way to validate it, who is involved, and what should happen next?`
      case "report_gen":
        return `Received the report direction: "${text}". I can help shape the outline, scope, source references, and next owner review point.`
      case "reflection":
        return `Thanks for sharing that reflection. For "${text}", it may help to name the feeling, what triggered it, and one small adjustment you want to try.`
      case "work":
        return `Received the work context: "${text}". The useful next step is to turn it into an outcome, blocker, owner action, and follow-up date.`
      case "research":
        return `I have noted the research idea: "${text}". We can turn it into a question, source list, claim map, and possible work application.`
      case "chamber":
        return `Received the chamber or relationship context: "${text}". We can structure it as a contact, opportunity, follow-up action, and relationship note.`
      case "finance":
        return `I have captured the finance-related note: "${text}". I can help draft a review item, while final finance records remain approval-gated.`
      case "life":
        return `Received the life rhythm note: "${text}". We can track the pattern, energy impact, and one practical adjustment for the week.`
      case "company":
        return `Received the company strategy context: "${text}". We can connect it to vision, metrics, constraints, and the next strategic decision.`
      default:
        return `I understand "${text}". We can keep exploring it, or turn it into a clean next-step proposal when you are ready.`
    }
  }
  
  // 1. Greetings
  if (["hi", "hello", "你好", "嗨", "哈囉", "greet"].some(g => normalizedText.includes(g))) {
    return "您好！我是您的 Personal OS 助理。很高興與您交流，今天有什麼想記錄、討論或規劃的嗎？"
  }
  
  // 2. Acknowledgements
  if (["好的", "ok", "了解", "收到", "嗯嗯", "okay", "對", "好的！"].some(a => normalizedText === a)) {
    return "好的！隨時可以告訴我您想討論或記錄的具體想法、待辦事項或專案進度。"
  }
  
  // 3. Questions / Queries
  if (["什麼", "如何", "怎麼", "哪裡", "嗎", "？", "?"].some(q => normalizedText.includes(q))) {
    if (normalizedText.includes("專案") || normalizedText.includes("工作") || normalizedText.includes("任務")) {
      return "關於專案與工作任務的規劃，我建議可以先釐清目標、里程碑和具體交付物。您可以跟我討論這些細節，對話完成後，我們可以將對話紀錄整筆匯入來源分析區域，AI 會自動幫您生成 Work 模組的任務建議。"
    }
    if (normalizedText.includes("研究") || normalizedText.includes("文獻")) {
      return "關於學術或技術研究，我建議先建立一個 Research Object（研究對象）。您可以把想要分析的概念或論文丟進來，結束對話後整筆匯入 Ingestion 系統，我們會幫您自動對接 Research 知識圖譜。"
    }
    if (normalizedText.includes("財務") || normalizedText.includes("錢") || normalizedText.includes("支出")) {
      return "管理財務與支出時，請記錄明細、金額和科目。雖然我不會直接寫入您的真實賬本，但您可以跟我說：『今天吃了午餐 150 元』，結束後整筆匯入來源分析，AI 就會生成財務記賬建議。"
    }
    return `這是一個好問題！關於「${text}」，我們可以從幾個層面來思考。首先，您可以記錄目前的現狀與面臨的挑戰，然後我們共同擬定下一步行動。這整段對話過程在匯入 Ingestion 後，會成為您 Personal OS 的長期記憶與上下文背景。`
  }

  // 4. Default / Context-Aware answers
  switch (mode) {
    case "general":
      return `非常棒的靈感！對於「${text}」，我們可以進一步思考：這個想法最快可以用什麼方式驗證？您需要跟誰協作？您可以繼續補充您的細節，等討論告一段落，再將這整筆對話紀錄匯入 Ingestion 進行來源分析。`
    case "report_gen":
      return `收到報告草稿要點：「${text}」。我會在此基礎上幫您串接最近的 Ingestion 來源日誌。您可以繼續描述需要涵蓋的範圍或重要里程碑。`
    case "reflection":
      return `感謝您的自我整理。聽到您說「${text}」，我能感受到您正在釐清自己的思緒。這是一個很好的自我察覺。接下來，有什麼具體的行動或改變是您想要嘗試的嗎？`
    case "work":
      return `收到專案上下文：「${text}」。這與我們目前的任務進度密切相關。我會將此內容納入專案背景中。您有需要為此對話中的內容建立具體的 TODO 嗎？對話結束後整筆匯入將可以自動生成任務卡。`
    case "research":
      return `已將文獻或研究構想「${text}」列入參考。這將有助於您目前的研究寫作。您是否需要我幫您從已連結的 Drive 文件中搜尋相關的理論支持？`
    case "chamber":
      return `收到關於商會或人際合作的記錄：「${text}」。這對於拓展引薦網路和合作機會非常有價值。您需要我為這名聯絡人設定跟進行動嗎？`
    case "finance":
      return `已記錄您的財務收支內容：「${text}」。我會為此生成支出或收入草稿記錄，結束後匯入來源分析，即可正式生成對應的帳目建議。`
    case "life":
      return `收到生活健康感受或日常狀態：「${text}」。我已將本機暫存為健康及日常軌跡的分析依據。您本週是否有感覺能量狀況改善？`
    case "company":
      return `收到公司發展或策略方向調整：「${text}」。這與我們的核心願景和中長期規劃高度契合。需要我幫您關聯到現有的策略文件草稿嗎？`
    default:
      return `了解您提到的「${text}」。這是一個很好的起點。我們可以繼續深入探討，或者您也可以在結束對話時，點擊上方的「手動匯入」將這整筆對話打包匯入至來源分析區域，以生成下一步的系統建議。`
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIInputClient({
  formalReadiness,
  sourceConnectionCatalog,
}: {
  formalReadiness: AIInputFormalReadinessContract
  sourceConnectionCatalog: AIInputSourceConnectionCatalogDTO
}) {
  const { isMockDataEnabled, toggleMockData } = useMockDataMode()
  // AUTH-013: the demo/formal toggle and its inline notice are illustrative
  // affordances for the fixed-code demo account only. Every other signed-in
  // (real tenant) account never sees them — the surface starts blank and
  // usable with no mode-switch chrome.
  const isDemoAccount = useIsDemoAccount()
  const { locale, copy } = useProductLanguage()
  const chatCopy = copy.aiInput.chat
  const sourceSettingsCopy = chatCopy.sourceSettings
  const {
    addManualCapture,
    addConversationCapture,
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

  interface ChatThreadFolder {
    id: string
    label: string
    collapsed: boolean
    pinned?: boolean
  }

  type ChatThreadKind = "personal" | "source_coworking" | "agent_task_link"

  interface ChatThread {
    id: string
    title: string
    messages: ChatMessage[]
    mode: ChatMode
    isImported: boolean
    importType: "manual" | "auto" | null
    mentions: MentionRef[]
    isSourceThread?: boolean
    sourceType?: string
    folderId: string | null
    threadKind: ChatThreadKind
    referenceCode: string
    pinned?: boolean
  }

  const PERSONAL_FOLDER_ID = "folder-personal"
  const SOURCE_FOLDER_ID = "folder-source-coworking"

  const [folders, setFolders] = React.useState<ChatThreadFolder[]>([
    { id: PERSONAL_FOLDER_ID, label: chatCopy.personalFolder, collapsed: false },
    { id: SOURCE_FOLDER_ID, label: chatCopy.sourceFolder, collapsed: false },
  ])

  const [threads, setThreads] = React.useState<ChatThread[]>([
    {
      id: "default",
      title: chatCopy.newConversationTitle,
      messages: [
        {
          id: "welcome",
          sender: "ai",
          type: "text",
          content: chatCopy.welcomeMessage,
          timestamp: new Date(),
        }
      ],
      mode: "general",
      isImported: false,
      importType: null,
      mentions: [],
      folderId: PERSONAL_FOLDER_ID,
      threadKind: "personal",
      referenceCode: "THREAD-AIINPUT-DEFAULT",
    }
  ])
  const [activeConvId, setActiveConvId] = React.useState<string>("default")
  const [renamingThreadId, setRenamingThreadId] = React.useState<string | null>(null)
  const [renameDraft, setRenameDraft] = React.useState("")
  const [deleteCandidateId, setDeleteCandidateId] = React.useState<string | null>(null)
  const [workspaceView, setWorkspaceView] = React.useState<AIInputSubpage>("chat")
  const [workbenchTab, setWorkbenchTab] = React.useState<WorkbenchTab>("today")
  const [inputText, setInputText] = React.useState("")
  const [isScheduledDialogOpen, setIsScheduledDialogOpen] = React.useState(false)
  // Clicking a Project navigates into a dedicated project workspace — per
  // Anthropic's own docs, a project is its own page with its own chat list,
  // knowledge, and instructions, not a filter over the global chat list.
  // https://support.claude.com/en/articles/9517075-what-are-projects
  // https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects
  const [projectViewId, setProjectViewId] = React.useState<string | null>(null)
  // Sidebar search + filter: a real (not decorative) pop-up search over all
  // chats/projects, and a real, data-backed filter/group/sort panel — no
  // fabricated chrome.
  const [isSearchDialogOpen, setIsSearchDialogOpen] = React.useState(false)
  const [chatSearchQuery, setChatSearchQuery] = React.useState("")
  const [chatTypeFilter, setChatTypeFilter] = React.useState<"all" | ChatThreadKind>("all")
  const [chatStatusFilter, setChatStatusFilter] = React.useState<"all" | "imported" | "not_imported">("all")
  const [chatActivityFilter, setChatActivityFilter] = React.useState<"all" | "today" | "week">("all")
  const [chatGroupBy, setChatGroupBy] = React.useState<"none" | "mode" | "status">("none")
  const [chatSortBy, setChatSortBy] = React.useState<"last_activity" | "title">("last_activity")
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = React.useState(false)
  const [newFolderNameDraft, setNewFolderNameDraft] = React.useState("")
  const [renamingFolderId, setRenamingFolderId] = React.useState<string | null>(null)
  const [folderRenameDraft, setFolderRenameDraft] = React.useState("")
  const [deleteFolderCandidateId, setDeleteFolderCandidateId] = React.useState<string | null>(null)
  const [isChatsSectionCollapsed, setIsChatsSectionCollapsed] = React.useState(false)
  const [isProjectsSectionCollapsed, setIsProjectsSectionCollapsed] = React.useState(false)

  const [connectorsState, setConnectorsState] = React.useState<ExtendedSourceConnectorRow[]>(() => {
    const DEFAULT_THINKING_NODES: SourceThinkingNodeDTO[] = [
      { id: "node-1", nodeType: "source_context", order: 1, enabled: true, instruction: "判斷目前輸入來源的脈絡與時段。" },
      { id: "node-2", nodeType: "classify_information", order: 2, enabled: true, instruction: "對資料進行主題分類，判斷適用的發布模組。" },
      { id: "node-3", nodeType: "extract_entity", order: 3, enabled: true, instruction: "抽取出文中提及的人物姓名、公司名稱與聯繫方式。" },
      { id: "node-4", nodeType: "extract_commitment", order: 4, enabled: false, instruction: "抽取出雙方的承諾事項與預期交付物。" },
      { id: "node-5", nodeType: "detect_task_candidate", order: 5, enabled: true, instruction: "判斷是否需要建立待辦任務（Todo）。" },
      { id: "node-6", nodeType: "detect_risk", order: 6, enabled: false, instruction: "識別潛在的執行風險或時間衝突。" },
      { id: "node-7", nodeType: "draft_inbox_items", order: 7, enabled: true, instruction: "將分析結果起草為 Inbox Item 格式。" },
    ]

    return MOCK_SOURCE_CONNECTORS.map((connector) => {
      const isMessaging = connector.provider === "LINE" || connector.provider === "Telegram" || connector.provider === "Gmail";
      const isDriveOrRepo = connector.provider === "Google Drive" || connector.provider === "GitHub";
      return {
        ...connector,
        syncMode: isMessaging ? "manual_and_scheduled" : "manual_only",
        syncSchedule: isMessaging ? "0 8 * * *" : null,
        syncEnabled: isMessaging,
        analysisMode: isMessaging ? "manual_and_scheduled" : "manual_only",
        analysisSchedule: isMessaging ? "0 9 * * *" : null,
        analysisEnabled: isMessaging,
        analyzeOnlyWhenPending: true,
        allowedTargetModules: isMessaging ? ["chamber", "work"] : isDriveOrRepo ? ["research", "work"] : ["research"],
        riskClassification: connector.riskPolicy === "高" ? "high" : connector.riskPolicy === "中" ? "medium" : "low",
        approvalLevel: connector.riskPolicy === "高" ? "always_require" : "auto_execute_low_risk",
        includeInMorningBrief: isMessaging,
        retentionDays: isMessaging ? 90 : isDriveOrRepo ? 0 : 30,
        piiMaskingEnabled: false,
        uploadDirectory: isMessaging ? `/uploads/${connector.provider.toLowerCase()}` : "/uploads/general",
        thinkingNodes: DEFAULT_THINKING_NODES.map((node) => ({ ...node })),
      } as ExtendedSourceConnectorRow
    })
  })


  const pushToast = React.useCallback((msg: string) => {
    console.log(`[Toast]: ${msg}`)
  }, [])

  // Getters from active thread
  const activeThread = threads.find((t) => t.id === activeConvId) || threads[0]
  const messages = activeThread.messages
  const mode = activeThread.mode
  const isImported = activeThread.isImported
  const importType = activeThread.importType
  const mentions = activeThread.mentions
  const referencedTitles = React.useMemo(() => new Set(mentions.map((m) => m.name)), [mentions])

  function getModeLabel(selectedMode: ChatMode) {
    return chatCopy.modes[selectedMode]?.label ?? chatCopy.modes.general.label
  }

  function getModeHint(selectedMode: ChatMode) {
    return chatCopy.modes[selectedMode]?.hint ?? chatCopy.modes.general.hint
  }

  function getModePlaceholder(selectedMode: ChatMode) {
    return chatCopy.modes[selectedMode]?.placeholder ?? chatCopy.modes.general.placeholder
  }

  function getFolderDisplayLabel(folder: ChatThreadFolder) {
    if (folder.id === PERSONAL_FOLDER_ID) return chatCopy.personalFolder
    if (folder.id === SOURCE_FOLDER_ID) return chatCopy.sourceFolder
    return folder.label
  }

  // Every thread — including the very first one — starts out as a plain
  // "New chat" like Claude's own sidebar, not a personalized welcome title.
  // It only ever gets a real name via manual rename or AI naming.
  function getThreadDisplayTitle(thread: ChatThread) {
    return thread.title || chatCopy.newConversationTitle
  }

  function withChatCopyTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce(
      (text, [key, value]) => text.replaceAll(`{${key}}`, value),
      template
    )
  }

  // State wrappers/setters for backward compatibility
  const setMessages = React.useCallback((newMessagesOrUpdater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setThreads((prevThreads) => prevThreads.map((t) => {
      if (t.id === activeConvId) {
        const nextMessages = typeof newMessagesOrUpdater === "function"
          ? newMessagesOrUpdater(t.messages)
          : newMessagesOrUpdater
        return { ...t, messages: nextMessages }
      }
      return t
    }))
  }, [activeConvId])

  const setMode = React.useCallback((newModeOrUpdater: ChatMode | ((prev: ChatMode) => ChatMode)) => {
    setThreads((prevThreads) => prevThreads.map((t) => {
      if (t.id === activeConvId) {
        const nextMode = typeof newModeOrUpdater === "function"
          ? newModeOrUpdater(t.mode)
          : newModeOrUpdater
        return { ...t, mode: nextMode }
      }
      return t
    }))
  }, [activeConvId])

  const setIsImported = React.useCallback((val: boolean) => {
    setThreads((prev) => prev.map((t) => t.id === activeConvId ? { ...t, isImported: val } : t))
  }, [activeConvId])

  const setImportType = React.useCallback((val: "manual" | "auto" | null) => {
    setThreads((prev) => prev.map((t) => t.id === activeConvId ? { ...t, importType: val } : t))
  }, [activeConvId])

  const setMentions = React.useCallback((val: MentionRef[] | ((prev: MentionRef[]) => MentionRef[])) => {
    setThreads((prev) => prev.map((t) => {
      if (t.id === activeConvId) {
        const nextMentions = typeof val === "function" ? val(t.mentions) : val
        return { ...t, mentions: nextMentions }
      }
      return t
    }))
  }, [activeConvId])

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

  function startNewConversation(initialText?: string, title?: string, folderId: string = PERSONAL_FOLDER_ID, mode: ChatMode = "general") {
    const id = makeClientId("new")
    const welcome: ChatMessage = {
      id: makeClientId("welcome"),
      sender: "ai",
      type: "text",
      content: chatCopy.welcomeMessage,
      timestamp: new Date(),
    }
    const newThread: ChatThread = {
      id: id,
      title: title || chatCopy.newConversationTitle,
      messages: [welcome],
      mode,
      isImported: false,
      importType: null,
      mentions: [],
      folderId,
      threadKind: folderId === PERSONAL_FOLDER_ID ? "personal" : "source_coworking",
      referenceCode: generateReferenceCode("THREAD", "AIINPUT"),
    }
    setThreads((prev) => [...prev, newThread])
    setActiveConvId(id)
    if (initialText) {
      setTimeout(() => doSendText(initialText), 50)
    }
  }

  // A proper in-app dialog, not the browser's native window.prompt() — that
  // renders as an OS-chrome popup labeled with the page's own origin
  // (e.g. "localhost:3000 says"), which reads as a broken/foreign prompt
  // rather than part of the product.
  function commitCreateFolder() {
    const label = newFolderNameDraft.trim()
    if (!label) return
    setFolders((prev) => [...prev, { id: makeClientId("folder"), label, collapsed: false }])
    setNewFolderNameDraft("")
    setIsNewFolderDialogOpen(false)
  }

  function beginRenameFolder(folderId: string, currentLabel: string) {
    setRenamingFolderId(folderId)
    setFolderRenameDraft(currentLabel)
  }

  function commitRenameFolder() {
    const label = folderRenameDraft.trim()
    if (renamingFolderId && label) {
      setFolders((prev) => prev.map((f) => f.id === renamingFolderId ? { ...f, label } : f))
    }
    setRenamingFolderId(null)
    setFolderRenameDraft("")
  }

  function cancelRenameFolder() {
    setRenamingFolderId(null)
    setFolderRenameDraft("")
  }

  function handleTogglePinFolder(folderId: string) {
    setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, pinned: !f.pinned } : f))
  }

  function confirmDeleteFolder() {
    const id = deleteFolderCandidateId
    if (!id) return
    setFolders((prev) => prev.filter((f) => f.id !== id))
    setThreads((prev) => prev.map((t) => t.folderId === id ? { ...t, folderId: null } : t))
    if (projectViewId === id) setProjectViewId(null)
    setDeleteFolderCandidateId(null)
  }

  function handleMoveThreadToFolder(threadId: string, folderId: string | null) {
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, folderId } : t))
  }

  function handleTogglePinThread(threadId: string) {
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, pinned: !t.pinned } : t))
  }

  function beginRenameThread(threadId: string, currentTitle: string) {
    setRenamingThreadId(threadId)
    setRenameDraft(currentTitle)
  }

  function commitRenameThread() {
    const title = renameDraft.trim()
    if (renamingThreadId && title) {
      setThreads((prev) => prev.map((t) => t.id === renamingThreadId ? { ...t, title } : t))
    }
    setRenamingThreadId(null)
    setRenameDraft("")
  }

  function cancelRenameThread() {
    setRenamingThreadId(null)
    setRenameDraft("")
  }

  function generateThreadTitle(thread: ChatThread): string {
    const firstUserMessage = thread.messages.find((m) => m.sender === "user" && m.type === "text")
    const source = firstUserMessage?.content?.trim() || thread.messages.find((m) => m.type === "text")?.content?.trim()
    if (!source) return thread.title
    const excerpt = source.replace(/\s+/g, " ").slice(0, 16)
    return `${excerpt}${source.length > 16 ? "…" : ""}`
  }

  function handleAutoTitleThread(threadId: string) {
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, title: generateThreadTitle(t) } : t))
  }

  function confirmDeleteThread() {
    const id = deleteCandidateId
    if (!id) return
    const next = threads.filter((t) => t.id !== id)
    setThreads(next)
    if (activeConvId === id) {
      setActiveConvId(next[0]?.id ?? "default")
    }
    setDeleteCandidateId(null)
  }

  function doSendText(text: string, currentMentions: MentionRef[] = []) {
    const referenceList = currentMentions.map((m) => m.name).join(chatCopy.referenceSeparator)
    const contextSuffix = currentMentions.length > 0
      ? `\n\n[${withChatCopyTemplate(chatCopy.referenceContextSuffix, { references: referenceList })}]`
      : ""
    const displayText = currentMentions.length > 0
      ? `${text}\n${chatCopy.referenceDisplayPrefix} ${referenceList}`
      : text

    const newUserMsg = {
      id: makeClientId("msg_" + Date.now()),
      sender: "user" as const,
      type: "text" as const,
      content: displayText,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, newUserMsg])
    setIsTyping(true)
    
    // Simulate AI response after a short delay
    setTimeout(async () => {
      let aiReply = ""
      try {
        const historyContext = [...messages, newUserMsg]
        aiReply = await getAIResponse(text, mode, historyContext, locale)
      } catch (err) {
        aiReply = generateAIResponse(text, mode, locale)
      }

      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          id: makeClientId("ai_reply_" + Date.now()),
          sender: "ai",
          type: "text",
          content: aiReply,
          timestamp: new Date(),
        },
      ])
    }, 800)

    setMentions([])
  }

  const handleImportConversation = React.useCallback((type: "manual" | "auto") => {
    if (messages.length <= 1) return // Welcome message only, nothing to import
    
    const transcript = messages
      .filter((m) => m.type === "text")
      .map((m) => {
        const role = m.sender === "user" ? chatCopy.transcriptUserRole : chatCopy.transcriptAiRole
        const time = m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        return `[${time}] ${role}${locale === "en-US" ? ": " : "："}${m.content}`
      })
      .join("\n")

    const modeLabel = getModeLabel(mode)

    // Construct dynamic topics list based on user inputs
    const userMsgs = messages.filter((m) => m.sender === "user" && m.type === "text")
    const topics = userMsgs.map((m) => m.content).join("；")
    const customSummary = userMsgs.length > 0
      ? withChatCopyTemplate(chatCopy.transcriptSummaryWithTopics, {
          mode: modeLabel,
          topics: topics.length > 80 ? topics.slice(0, 77) + "..." : topics,
        })
      : withChatCopyTemplate(chatCopy.transcriptSummaryEmpty, { mode: modeLabel })
      
    addConversationCapture(transcript, modeLabel, customSummary)
    
    setIsImported(true)
    setImportType(type)
    
    // Add system message to the chat
    const systemText = type === "manual"
      ? chatCopy.systemImportedManual
      : chatCopy.systemImportedAuto
      
    setMessages((prev) => [
      ...prev,
      {
        id: makeClientId("sys_" + Date.now()),
        sender: "ai",
        type: "system",
        content: systemText,
        timestamp: new Date(),
      }
    ])
  }, [messages, mode, locale, chatCopy, addConversationCapture])

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
  }

  function handleCoworkStarter(starter: CoworkStarter) {
    setMode(starter.mode)
    setWorkspaceView("chat")
    handleQuickPrompt(starter.prompt)
  }

  const handleSourceSyncAction = React.useCallback((sourceId: string, label: string, callback: () => void) => {
    // 1. Run sync callback
    callback()

    // 2. Generate coworking messages
    const now = new Date()
    const sourceCowork =
      chatCopy.sourceCowork[sourceId as keyof typeof chatCopy.sourceCowork]
      ?? chatCopy.sourceCowork.default
    const title = withChatCopyTemplate(sourceCowork.title, { label })
    const coworkMessages: ChatMessage[] = sourceCowork.messages.map((content, index) => ({
      id: `cw-${index + 1}`,
      sender: "ai",
      type: "text",
      content: withChatCopyTemplate(content, { label }),
      timestamp: now,
    }))

    const threadId = "source-" + sourceId
    setThreads((prev) => {
      const exists = prev.some((t) => t.id === threadId)
      if (exists) {
        return prev.map((t) => t.id === threadId ? { ...t, messages: coworkMessages } : t)
      }
      const newThread: ChatThread = {
        id: threadId,
        title: `🔄 ${title}`,
        messages: coworkMessages,
        mode: "general",
        isImported: true,
        importType: "auto",
        mentions: [],
        isSourceThread: true,
        sourceType: sourceId,
        folderId: SOURCE_FOLDER_ID,
        threadKind: "source_coworking",
        referenceCode: generateReferenceCode("THREAD", sourceId),
      }
      return [...prev, newThread]
    })

    setActiveConvId(threadId)
    setWorkspaceView("chat")
    pushToast(withChatCopyTemplate(sourceCowork.toast, { label, title }))
  }, [chatCopy, pushToast])

  const handleReferenceLibraryItem = React.useCallback((name: string, kind: "file" | "media") => {
    setMentions((prev) => {
      if (prev.some((m) => m.name === name)) {
        pushToast(chatCopy.referenceAlreadyAddedToast)
        return prev
      }
      const newMention: MentionRef = {
        kind: "source_asset",
        id: "lib-ref-" + Date.now(),
        name: name,
        description: kind === "file"
          ? chatCopy.fileReferenceDescription
          : chatCopy.mediaReferenceDescription,
      }
      pushToast(withChatCopyTemplate(chatCopy.referenceAddedToast, { name }))
      return [...prev, newMention]
    })
  }, [chatCopy, pushToast])

  function handleAddLinks(urls: string[]) {
    addUrlCapture(urls)
    handleSourceSyncAction("link", chatCopy.importActions.link, () => {})
  }

  const displayMessages = React.useMemo(() => {
    const list = [...messages]
    if (activeConvId.startsWith("source-")) {
      const coworkProposals = proposals.filter((p) => {
        if (p.status !== "pending") return false
        if (activeConvId === "source-line") return p.detectedType?.includes("LINE") || p.summary?.includes("LINE")
        if (activeConvId === "source-rss") return p.detectedType?.includes("RSS") || p.summary?.includes("RSS")
        if (activeConvId === "source-googledoc") return p.detectedType?.includes("Google") || p.detectedType?.includes("Doc") || p.summary?.includes("Google")
        if (activeConvId === "source-markdown") return p.detectedType?.includes("Markdown") || p.summary?.includes("Markdown")
        if (activeConvId === "source-image") return p.detectedType?.includes("圖片") || p.summary?.includes("圖片")
        if (activeConvId === "source-audio") return p.detectedType?.includes("語音") || p.summary?.includes("語音")
        if (activeConvId === "source-link") return p.detectedType?.includes("連結") || p.summary?.includes("連結")
        return false
      })
      
      coworkProposals.forEach((p) => {
        // Only append if it's not already added
        if (!list.some((msg) => msg.proposalId === p.id)) {
          list.push({
            id: "msg-triage-" + p.id,
            sender: "ai",
            type: "triage",
            content: "",
            proposalId: p.id,
            timestamp: new Date(),
          })
        }
      })
    }
    return list
  }, [messages, activeConvId, proposals])

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
          content: `${getModeLabel(newMode)} - ${getModeHint(newMode)}`,
          timestamp: new Date(),
        },
      ])
    }
  }

  const allActions = [
    { id: "line",      icon: <MessageSquareIcon />, label: "LINE",       onClick: () => handleSourceSyncAction("line", "LINE", mockSyncLINE) },
    { id: "googledoc", icon: <FileTextIcon />,      label: "Google Doc", onClick: () => handleSourceSyncAction("googledoc", "Google Doc", mockImportGoogleDoc) },
    { id: "link",      icon: <LinkIcon />,          label: chatCopy.importActions.link, onClick: () => {} }, // Dialog handled below
    { id: "markdown",  icon: <FileTextIcon />,      label: "Markdown",   onClick: () => handleSourceSyncAction("markdown", "Markdown", mockUploadMarkdown) },
    { id: "image",     icon: <UploadIcon />,         label: chatCopy.importActions.image, onClick: () => handleSourceSyncAction("image", chatCopy.importActions.image, () => mockUploadMedia("image")) },
    { id: "audio",     icon: <AudioLinesIcon />,     label: chatCopy.importActions.audio, onClick: () => handleSourceSyncAction("audio", chatCopy.importActions.audio, () => mockUploadMedia("audio")) },
    { id: "rss",       icon: <RssIcon />,            label: "RSS",        onClick: () => handleSourceSyncAction("rss", "RSS", mockSyncRSS) },
  ]

  // All import actions are available regardless of the selected chat mode

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

  const sourceIndexRows = React.useMemo<OwnerAIInputSourceIndexRow[]>(() => {
    const rows = isMockDataEnabled
      ? connectorsState.map((connector) => {
          const display = getSourceConnectorDisplay(connector, sourceSettingsCopy)
          return {
            id: connector.id,
            label: display.source,
            meta: `${display.provider} · ${display.defaultModule}`,
            status: connector.connectionStatus,
            nextAction: display.nextAction,
          }
        })
      : formalReadiness.sourceControlMatrix.rows.map((row) => ({
          id: row.id,
          label: row.source,
          meta: `${row.provider} · ${row.defaultModule}`,
          status: row.connectionStatus,
          nextAction: row.nextAction,
        }))

    return rows.slice(0, 4)
  }, [connectorsState, formalReadiness.sourceControlMatrix.rows, isMockDataEnabled, sourceSettingsCopy])

  const sourceSummary = React.useMemo<OwnerAIInputSourceSummary>(() => {
    if (isMockDataEnabled) {
      return {
        rowCount: connectorsState.length,
        connectedCount: connectorsState.filter((connector) => connector.connectionStatus === "connected").length,
        attentionCount: connectorsState.filter((connector) =>
          connector.connectionStatus !== "connected" ||
          connector.syncStatus === "review" ||
          connector.syncStatus === "failed"
        ).length,
        providerCount: sourceConnectionCatalog.summary.providerCount,
      }
    }

    return {
      rowCount: formalReadiness.sourceControlMatrix.summary.rowCount,
      connectedCount: formalReadiness.sourceControlMatrix.summary.connectedCount,
      attentionCount:
        formalReadiness.sourceControlMatrix.summary.needsSetupCount +
        formalReadiness.sourceControlMatrix.summary.plannedCount +
        formalReadiness.sourceControlMatrix.summary.missingPermissionCount +
        formalReadiness.sourceControlMatrix.summary.highRiskCount,
      providerCount: sourceConnectionCatalog.summary.providerCount,
    }
  }, [connectorsState, formalReadiness.sourceControlMatrix.summary, isMockDataEnabled, sourceConnectionCatalog.summary.providerCount])

  // Sidebar sections mirror Claude.ai's Pinned/Projects/Chats layout: a
  // thread appears in exactly one section, pinned threads taking priority.
  // Chats always means the personal/uncategorized list — a Project is its
  // own workspace (see projectViewId above), never a filter over this list.
  const pinnedThreads = threads.filter((t) => t.pinned)
  const projectFolders = folders
    .filter((f) => f.id !== PERSONAL_FOLDER_ID)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  const openProject = projectFolders.find((f) => f.id === projectViewId) || null

  // Search and the import filter are real, client-side filters over actual
  // thread data — not decorative chrome.
  function getThreadLastActivity(t: ChatThread): number {
    const timestamps = t.messages.map((m) => m.timestamp.getTime())
    return timestamps.length > 0 ? Math.max(...timestamps) : 0
  }

  const chatSectionThreads = threads
    .filter((t) => !t.pinned && (t.folderId === PERSONAL_FOLDER_ID || t.folderId === null))
    .filter((t) => chatTypeFilter === "all" || t.threadKind === chatTypeFilter)
    .filter((t) => chatStatusFilter === "all" || (chatStatusFilter === "imported" ? t.isImported : !t.isImported))
    .filter((t) => {
      if (chatActivityFilter === "all") return true
      const last = getThreadLastActivity(t)
      const day = 24 * 60 * 60 * 1000
      const elapsed = Date.now() - last
      return chatActivityFilter === "today" ? elapsed < day : elapsed < 7 * day
    })
    .sort((a, b) =>
      chatSortBy === "title"
        ? getThreadDisplayTitle(a).localeCompare(getThreadDisplayTitle(b))
        : getThreadLastActivity(b) - getThreadLastActivity(a)
    )

  // Group by is a real (non-decorative) grouping over the filtered/sorted
  // set above — "none" renders as a single ungrouped list.
  const chatSectionGroups: Array<{ label: string; items: ChatThread[] }> =
    chatGroupBy === "none"
      ? [{ label: "", items: chatSectionThreads }]
      : chatGroupBy === "mode"
      ? Array.from(
          chatSectionThreads.reduce((map, t) => {
            const key = getModeLabel(t.mode)
            map.set(key, [...(map.get(key) ?? []), t])
            return map
          }, new Map<string, ChatThread[]>())
        ).map(([label, items]) => ({ label, items }))
      : (["imported", "not_imported"] as const)
          .map((status) => ({
            label: status === "imported" ? "已匯入來源" : "尚未匯入",
            items: chatSectionThreads.filter((t) => (status === "imported" ? t.isImported : !t.isImported)),
          }))
          .filter((g) => g.items.length > 0)

  const deleteCandidateThread = threads.find((t) => t.id === deleteCandidateId) || null

  function formatRelativeActivity(ms: number): string {
    if (!ms) return ""
    const diff = Date.now() - ms
    const day = 24 * 60 * 60 * 1000
    if (diff < day) return "今天"
    if (diff < 2 * day) return "昨天"
    if (diff < 7 * day) return "本週"
    if (diff < 30 * day) return "上個月內"
    return new Date(ms).toLocaleDateString()
  }

  // Real search over both projects and chats, like Claude's own "Search
  // chats and projects" panel — not a mock/decorative results list.
  const searchResults: Array<{ id: string; kind: "project" | "thread"; label: string; meta: string; sortKey: number }> = (() => {
    const q = chatSearchQuery.trim().toLowerCase()
    const projectMatches = folders
      .filter((f) => f.id !== PERSONAL_FOLDER_ID)
      .map((f) => ({ folder: f, label: getFolderDisplayLabel(f) }))
      .filter(({ label }) => !q || label.toLowerCase().includes(q))
      .map(({ folder, label }) => ({
        id: folder.id,
        kind: "project" as const,
        label,
        meta: `${threads.filter((t) => t.folderId === folder.id).length} 個對話`,
        sortKey: Math.max(0, ...threads.filter((t) => t.folderId === folder.id).map(getThreadLastActivity)),
      }))
    const threadMatches = threads
      .map((t) => ({ thread: t, label: getThreadDisplayTitle(t) }))
      .filter(({ label }) => !q || label.toLowerCase().includes(q))
      .map(({ thread, label }) => ({
        id: thread.id,
        kind: "thread" as const,
        label,
        meta: formatRelativeActivity(getThreadLastActivity(thread)),
        sortKey: getThreadLastActivity(thread),
      }))
    return [...projectMatches, ...threadMatches].sort((a, b) => b.sortKey - a.sortKey)
  })()

  function renderThreadRow(t: ChatThread) {
    const isActive = t.id === activeConvId
    const isRenaming = renamingThreadId === t.id
    const displayTitle = getThreadDisplayTitle(t)
    return (
      <div
        key={t.id}
        className={cn(
          "group w-full flex items-center gap-1 rounded-lg text-left text-xs font-medium transition-all",
          isActive
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        {isRenaming ? (
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRenameThread}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRenameThread()
              if (e.key === "Escape") cancelRenameThread()
            }}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 mx-2.5 my-1.5 rounded border border-primary/40 bg-background px-1.5 py-1 text-xs outline-none"
          />
        ) : (
          <button
            onClick={() => { setActiveConvId(t.id); setProjectViewId(null) }}
            onDoubleClick={() => beginRenameThread(t.id, displayTitle)}
            className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 text-left"
          >
            <MessageSquareIcon className="size-3 shrink-0 text-muted-foreground/50" />
            {t.pinned && <PinIcon className="size-3 shrink-0 text-muted-foreground/70" />}
            <span className="truncate flex-1">{displayTitle}</span>
            {t.isSourceThread && (
              <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
            )}
          </button>
        )}
        {!isRenaming && (
          <button
            onClick={(e) => { e.stopPropagation(); beginRenameThread(t.id, displayTitle) }}
            title={chatCopy.renameThread}
            className="shrink-0 size-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted"
          >
            <PenLineIcon className="size-3" />
          </button>
        )}
        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 mr-1 size-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted data-open:opacity-100"
                />
              }
            >
              <MoreVerticalIcon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(t.referenceCode)
                  pushToast(withChatCopyTemplate(chatCopy.copiedReferenceToast, { reference: t.referenceCode }))
                }}
              >
                <CopyIcon className="size-3.5" />
                <span className="font-mono text-[10px] truncate">{t.referenceCode}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleTogglePinThread(t.id)}>
                {t.pinned ? (
                  <>
                    <PinOffIcon className="size-3.5" /> 取消釘選
                  </>
                ) : (
                  <>
                    <PinIcon className="size-3.5" /> 釘選
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => beginRenameThread(t.id, displayTitle)}>
                <PenLineIcon className="size-3.5" /> {chatCopy.renameThread}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAutoTitleThread(t.id)}>
                <SparklesIcon className="size-3.5" /> {chatCopy.aiNameThread}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderIcon className="size-3.5" /> {chatCopy.moveToFolder}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {t.folderId !== null && (
                    <DropdownMenuItem onClick={() => handleMoveThreadToFolder(t.id, null)}>
                      {chatCopy.uncategorized}
                    </DropdownMenuItem>
                  )}
                  {folders.map((f) => (
                    f.id !== t.folderId && (
                      <DropdownMenuItem key={f.id} onClick={() => handleMoveThreadToFolder(t.id, f.id)}>
                        {getFolderDisplayLabel(f)}
                      </DropdownMenuItem>
                    )
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteCandidateId(t.id)}>
                <Trash2Icon className="size-3.5" /> {chatCopy.deleteConversation}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <AIInputHeaderBar
        activeView={workspaceView}
        contextCount={mentions.length}
        isDemoAccount={isDemoAccount}
        isMockDataEnabled={isMockDataEnabled}
        pendingProposalCount={pendingProposalCount}
        reviewCount={reviewCount}
        sourceIndexRows={sourceIndexRows}
        sourceSummary={sourceSummary}
        syncSourceCount={isMockDataEnabled ? MOCK_SOURCE_CONNECTORS.length : formalReadiness.sourceControlMatrix.summary.rowCount}
        threadCount={threads.length}
        workflowRunCount={isMockDataEnabled ? MOCK_WORKFLOW_RUNS.length : formalReadiness.sourceWorkflow.summary.totalObjects}
        onCapture={() => {
          setWorkspaceView("chat")
          setInputText((current) => current || chatCopy.capturePrompt)
          setTimeout(() => textareaRef.current?.focus(), 0)
        }}
        onChange={setWorkspaceView}
        onToggleMockData={toggleMockData}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {workspaceView === "chat" && (
          <div className="flex h-full w-full overflow-hidden">
            {/* Left Thread List Sidebar — Claude.ai-style New/Scheduled header
                plus Pinned/Projects/Chats sections. */}
            <div className="w-56 shrink-0 border-r border-border/50 bg-muted/15 flex flex-col overflow-hidden">
              {/* A plain, always-visible list — like Claude's own top-of-
                  sidebar rows — not a menu you have to click open. */}
              <div className="p-1.5 border-b border-border/50 space-y-0.5">
                <button
                  onClick={() => startNewConversation(undefined, chatCopy.newConversationTitle)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
                >
                  <PlusIcon className="size-3.5 shrink-0" />
                  {chatCopy.addConversation}
                </button>
                <button
                  onClick={() => setIsScheduledDialogOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
                >
                  <Clock3Icon className="size-3.5 shrink-0" />
                  排程任務
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 no-scrollbar">
                {pinnedThreads.length > 0 && (
                  <div className="pb-2">
                    <p className="px-1.5 pb-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Pinned</p>
                    <div className="space-y-0.5">{pinnedThreads.map(renderThreadRow)}</div>
                  </div>
                )}

                {/* Projects — flat rows like Claude's own Projects list, no
                    nested per-folder chat tree (that would just repeat what
                    the folder name already says). Clicking a project filters
                    the Chats section below to that project's conversations. */}
                <div className="pb-2">
                  <div className="flex items-center gap-1 px-1.5 pb-1">
                    <button
                      onClick={() => setIsProjectsSectionCollapsed((v) => !v)}
                      className="flex flex-1 items-center gap-1 text-left text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-foreground"
                    >
                      <ChevronDownIcon className={cn("size-3 transition-transform", isProjectsSectionCollapsed && "-rotate-90")} />
                      Projects
                    </button>
                    {projectFolders.reduce((sum, f) => sum + threads.filter((t) => t.folderId === f.id).length, 0) > 0 && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {projectFolders.reduce((sum, f) => sum + threads.filter((t) => t.folderId === f.id).length, 0)}
                      </span>
                    )}
                    <button
                      onClick={() => setIsNewFolderDialogOpen(true)}
                      title={chatCopy.addFolder}
                      className="size-5 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <PlusIcon className="size-3" />
                    </button>
                  </div>
                  {!isProjectsSectionCollapsed && (
                  <div className="space-y-0.5">
                    {projectFolders.map((folder) => {
                      const folderThreadCount = threads.filter((t) => t.folderId === folder.id).length
                      const isOpen = projectViewId === folder.id
                      const isRenaming = renamingFolderId === folder.id
                      const folderLabel = getFolderDisplayLabel(folder)
                      if (isRenaming) {
                        return (
                          <input
                            key={folder.id}
                            autoFocus
                            value={folderRenameDraft}
                            onChange={(e) => setFolderRenameDraft(e.target.value)}
                            onBlur={commitRenameFolder}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRenameFolder()
                              if (e.key === "Escape") cancelRenameFolder()
                            }}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-full rounded-lg border border-primary/40 bg-background px-2 py-1.5 text-xs outline-none"
                          />
                        )
                      }
                      return (
                        <div
                          key={folder.id}
                          className={cn(
                            "group w-full flex items-center gap-1 rounded-lg text-xs font-medium transition-colors",
                            isOpen
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <button
                            onClick={() => setProjectViewId(folder.id)}
                            className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 text-left"
                          >
                            <FolderIcon className="size-3.5 shrink-0" />
                            {folder.pinned && <PinIcon className="size-3 shrink-0 text-muted-foreground/70" />}
                            <span className="flex-1 text-left truncate">{folderLabel}</span>
                            <span className="text-muted-foreground/60">{folderThreadCount}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); beginRenameFolder(folder.id, folderLabel) }}
                            title={chatCopy.renameThread}
                            className="shrink-0 size-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted"
                          >
                            <PenLineIcon className="size-3" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 mr-1 size-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted data-open:opacity-100"
                                />
                              }
                            >
                              <MoreVerticalIcon className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40">
                              <DropdownMenuItem onClick={() => beginRenameFolder(folder.id, folderLabel)}>
                                <PenLineIcon className="size-3.5" /> {chatCopy.renameThread}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteFolderCandidateId(folder.id)}>
                                <Trash2Icon className="size-3.5" /> 刪除 Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    })}
                  </div>
                  )}
                </div>

                <div className="pb-2">
                  <div className="flex items-center gap-1 px-1.5 pb-1">
                    <button
                      onClick={() => setIsChatsSectionCollapsed((v) => !v)}
                      className="flex flex-1 items-center gap-1 text-left text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-foreground"
                    >
                      <ChevronDownIcon className={cn("size-3 transition-transform", isChatsSectionCollapsed && "-rotate-90")} />
                      Chats
                    </button>
                    {chatSectionThreads.length > 0 && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {chatSectionThreads.length}
                      </span>
                    )}
                    {/* Search opens a pop-up panel over the whole workspace,
                        like Claude's own Cmd+K-style chat/project search —
                        not an inline text field squeezed into the sidebar. */}
                    <button
                      onClick={() => setIsSearchDialogOpen(true)}
                      title="搜尋對話與 Project"
                      className="size-5 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <SearchIcon className="size-3" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            title="篩選與排序"
                            className={cn(
                              "size-5 rounded-md flex items-center justify-center hover:bg-muted",
                              chatTypeFilter !== "all" || chatStatusFilter !== "all" || chatActivityFilter !== "all" || chatGroupBy !== "none"
                                ? "text-foreground bg-muted"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          />
                        }
                      >
                        <SlidersHorizontalIcon className="size-3" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            Type
                            <span className="ml-auto text-muted-foreground">
                              {chatTypeFilter === "all" ? "All" : chatTypeFilter === "personal" ? "個人" : "來源協作"}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setChatTypeFilter("all")} className="text-xs">All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatTypeFilter("personal")} className="text-xs">個人對話</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatTypeFilter("source_coworking")} className="text-xs">來源協作</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            Status
                            <span className="ml-auto text-muted-foreground">
                              {chatStatusFilter === "all" ? "All" : chatStatusFilter === "imported" ? "已匯入" : "未匯入"}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setChatStatusFilter("all")} className="text-xs">All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatStatusFilter("imported")} className="text-xs">已匯入來源</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatStatusFilter("not_imported")} className="text-xs">尚未匯入</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            Last activity
                            <span className="ml-auto text-muted-foreground">
                              {chatActivityFilter === "all" ? "All" : chatActivityFilter === "today" ? "今天" : "本週"}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setChatActivityFilter("all")} className="text-xs">All</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatActivityFilter("today")} className="text-xs">今天</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatActivityFilter("week")} className="text-xs">本週</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            Group by
                            <span className="ml-auto text-muted-foreground">
                              {chatGroupBy === "none" ? "None" : chatGroupBy === "mode" ? "模式" : "狀態"}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setChatGroupBy("none")} className="text-xs">None</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatGroupBy("mode")} className="text-xs">依模式</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatGroupBy("status")} className="text-xs">依匯入狀態</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="text-xs">
                            Sort by
                            <span className="ml-auto text-muted-foreground">
                              {chatSortBy === "last_activity" ? "最後活動" : "標題"}
                            </span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => setChatSortBy("last_activity")} className="text-xs">最後活動時間</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChatSortBy("title")} className="text-xs">標題</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      onClick={() => startNewConversation(undefined, chatCopy.newConversationTitle)}
                      title={chatCopy.addConversation}
                      className="size-5 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <PlusIcon className="size-3" />
                    </button>
                  </div>

                  {!isChatsSectionCollapsed && (
                    chatSectionThreads.length === 0 ? (
                      <div className="px-3 py-1.5 text-[11px] text-muted-foreground/60">{chatCopy.emptyFolder}</div>
                    ) : (
                      chatSectionGroups.map((group) => (
                        <div key={group.label || "_all"} className="space-y-0.5 pb-1">
                          {group.label && (
                            <p className="px-2 pt-1 text-[10px] font-medium text-muted-foreground/50">{group.label}</p>
                          )}
                          {group.items.map(renderThreadRow)}
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Right Chat Main Area */}
            <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
              {openProject ? (
          <ProjectWorkspaceView
            folderLabel={getFolderDisplayLabel(openProject)}
            isPinned={!!openProject.pinned}
            onTogglePin={() => handleTogglePinFolder(openProject.id)}
            onRename={() => beginRenameFolder(openProject.id, getFolderDisplayLabel(openProject))}
            onDelete={() => setDeleteFolderCandidateId(openProject.id)}
            chatCount={threads.filter((t) => t.folderId === openProject.id).length}
            chatRows={threads.filter((t) => t.folderId === openProject.id).map(renderThreadRow)}
            contextItems={Array.from(
              new Map(
                threads
                  .filter((t) => t.folderId === openProject.id)
                  .flatMap((t) => t.mentions)
                  .map((m) => [m.id, m])
              ).values()
            )}
            onBack={() => setProjectViewId(null)}
            onSend={(text, mode) => {
              startNewConversation(text, chatCopy.newConversationTitle, openProject.id, mode)
              setProjectViewId(null)
            }}
            isMockDataEnabled={isMockDataEnabled}
            allActions={allActions}
            onAddLink={handleAddLinks}
            onVoice={() => handleSourceSyncAction("audio", chatCopy.importActions.audio, () => mockUploadMedia("audio"))}
            chatCopy={chatCopy}
            getModeLabel={getModeLabel}
          />
        ) : activeConvId === "default" && messages.length <= 1 ? (
          /* Landing Screen — vertically centered like claude.ai's own
             empty-state composer, rather than pinned to the top. */
          <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-12">
            <div className="w-full max-w-2xl space-y-8">
              {isDemoAccount && <MockModeInlineNotice isMockDataEnabled={isMockDataEnabled} />}

              <div className="text-center space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {chatCopy.landingTitle}
                </h1>
                <p className="text-sm text-muted-foreground">{chatCopy.landingSubtitle}</p>
              </div>

              {SHOW_LANDING_SUGGESTIONS && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    {QUICK_PROMPTS.map((qp) => (
                      <button
                        key={qp.id}
                        onClick={() => handleQuickPrompt(chatCopy.quickPrompts[qp.id].prompt)}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3.5 text-sm text-left hover:bg-muted/60 transition-colors group"
                      >
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{qp.icon}</span>
                        <span className="font-medium">{chatCopy.quickPrompts[qp.id].label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    {COWORK_STARTERS.map((starter) => (
                      <button
                        key={starter.id}
                        onClick={() =>
                          handleCoworkStarter({
                            ...starter,
                            ...chatCopy.coworkStarters[starter.id as keyof typeof chatCopy.coworkStarters],
                          })
                        }
                        className="min-h-24 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="text-primary">{starter.icon}</span>
                        <span className="mt-2 block text-sm font-semibold">{chatCopy.coworkStarters[starter.id as keyof typeof chatCopy.coworkStarters].label}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{chatCopy.coworkStarters[starter.id as keyof typeof chatCopy.coworkStarters].contextHint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="relative">
                {filteredMentions.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl border border-border bg-popover shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{chatCopy.referencePicker}</p>
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
                  placeholder={chatCopy.inputPlaceholder}
                  className="w-full bg-muted/30 border border-border/60 rounded-t-2xl rounded-b-none px-4 pt-4 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none min-h-[60px] max-h-[180px]"
                  rows={2}
                />
                <div className="rounded-b-2xl border border-t-0 border-border/60 bg-muted/30 px-3 pb-2.5 pt-1">
                  <ComposerToolbar
                    mode={mode}
                    onModeChange={handleModeChange}
                    activeFolderId={activeThread.folderId}
                    folderOptions={folders.map((f) => ({ id: f.id, label: getFolderDisplayLabel(f) }))}
                    onFolderChange={(folderId) => handleMoveThreadToFolder(activeConvId, folderId)}
                    isMockDataEnabled={isMockDataEnabled}
                    allActions={allActions}
                    onAddLink={handleAddLinks}
                    onVoice={() => handleSourceSyncAction("audio", chatCopy.importActions.audio, () => mockUploadMedia("audio"))}
                    chatCopy={chatCopy}
                    getModeLabel={getModeLabel}
                    onSend={handleSend}
                    sendDisabled={!inputText.trim() && mentions.length === 0}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Conversation Ingestion Control Banner */}
            <div className="shrink-0 border-b border-border/40 bg-background/60 backdrop-blur-md px-6 py-3">
              <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "size-2 rounded-full",
                    isImported ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"
                  )} />
                  <div className="text-xs">
                    {!isImported ? (
                      <>
                        <span className="font-semibold text-foreground">{chatCopy.statusSavedInChat}</span>
                        <span className="text-muted-foreground ml-1.5">({chatCopy.statusNotImported})</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{chatCopy.statusImported}</span>
                        <span className="text-muted-foreground ml-1.5">
                          ({chatCopy.importMethod}: {importType === "manual" ? chatCopy.importManualMethod : chatCopy.importIdleMethod})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!isImported ? (
                    <>
                      <Button
                        size="xs"
                        variant="default"
                        disabled={messages.length <= 1}
                        onClick={() => handleImportConversation("manual")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] h-7 px-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1"
                      >
                        <InboxIcon className="size-3.5" />
                        <span>{chatCopy.manualImport}</span>
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={messages.length <= 1}
                        onClick={() => handleImportConversation("auto")}
                        className="border-border/60 hover:bg-muted text-[11px] h-7 px-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1"
                      >
                        <ZapIcon className="size-3.5 text-amber-500 fill-amber-500/10" />
                        <span>{chatCopy.simulateIdleImport}</span>
                      </Button>
                      <span className="text-[10px] text-muted-foreground/60 hidden xl:inline-flex items-center gap-0.5">
                        (<Clock3Icon className="size-3" />
                        <span>{chatCopy.idleImportHint}</span>)
                      </span>
                    </>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled
                      className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[11px] h-7 px-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/50 font-medium"
                    >
                      <CheckCircle2Icon className="size-3.5" />
                      {chatCopy.importedSafe}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 scroll-smooth">
              <div className="max-w-2xl mx-auto space-y-6">
                <AnimatePresence initial={false}>
                  {displayMessages.map((msg) => (
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
              <div className="max-w-2xl mx-auto space-y-2">
                {!isMockDataEnabled && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {chatCopy.liveModeChatNote}
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
                      <p className="px-3 pt-2 pb-1 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{chatCopy.referencePicker}</p>
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
                    placeholder={atQuery !== null ? chatCopy.searchReferencePlaceholder : getModePlaceholder(mode)}
                    className="w-full bg-muted/40 border border-border/60 rounded-t-2xl rounded-b-none px-4 pt-3.5 pb-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none min-h-[52px] max-h-[160px]"
                    rows={1}
                  />
                  <div className="rounded-b-2xl border border-t-0 border-border/60 bg-muted/40 px-3 pb-2 pt-1">
                    <ComposerToolbar
                      mode={mode}
                      onModeChange={handleModeChange}
                      activeFolderId={activeThread.folderId}
                      folderOptions={folders.map((f) => ({ id: f.id, label: getFolderDisplayLabel(f) }))}
                      onFolderChange={(folderId) => handleMoveThreadToFolder(activeConvId, folderId)}
                      isMockDataEnabled={isMockDataEnabled}
                      allActions={allActions}
                      onAddLink={handleAddLinks}
                      onVoice={() => handleSourceSyncAction("audio", chatCopy.importActions.audio, () => mockUploadMedia("audio"))}
                      chatCopy={chatCopy}
                      getModeLabel={getModeLabel}
                      onSend={handleSend}
                      sendDisabled={!inputText.trim() && mentions.length === 0}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div>
  </div>
)}

        {workspaceView === "context" && (
          <SubpageShell
            description={chatCopy.subpageShell.context.description}
            eyebrow={chatCopy.subpageShell.context.eyebrow}
            title={chatCopy.subpageShell.context.title}
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

        {workspaceView === "files" && (
          <SubpageShell
            description={chatCopy.subpageShell.files.description}
            eyebrow={chatCopy.subpageShell.files.eyebrow}
            title={chatCopy.subpageShell.files.title}
            wide
          >
            <FileLibraryPage
              referencedTitles={referencedTitles}
              onReferenceAsset={(title) => handleReferenceLibraryItem(title, "file")}
            />
          </SubpageShell>
        )}

        {workspaceView === "media" && (
          <SubpageShell
            description={chatCopy.subpageShell.media.description}
            eyebrow={chatCopy.subpageShell.media.eyebrow}
            title={chatCopy.subpageShell.media.title}
            wide
          >
            <MediaLibraryPage
              referencedTitles={referencedTitles}
              onReferenceAsset={(name) => handleReferenceLibraryItem(name, "media")}
            />
          </SubpageShell>
        )}

        {workspaceView === "settings" && (
          <SubpageShell
            description={chatCopy.subpageShell.settings.description}
            eyebrow={chatCopy.subpageShell.settings.eyebrow}
            title={chatCopy.subpageShell.settings.title}
            wide
          >
            <SourceStructurePanelContent
              key={isMockDataEnabled ? "mock-source-settings" : "formal-source-settings"}
              formalReadiness={formalReadiness}
              sourceConnectionCatalog={sourceConnectionCatalog}
              isMockDataEnabled={isMockDataEnabled}
              resourceNodesCount={resourceNodes.length}
              connectorsState={connectorsState}
              setConnectorsState={setConnectorsState}
              pushToast={pushToast}
            />
          </SubpageShell>
        )}

        {workspaceView === "workbench" && (
          <SubpageShell
            description={isMockDataEnabled
              ? chatCopy.subpageShell.workbench.mockDescription
              : chatCopy.subpageShell.workbench.formalDescription}
            eyebrow={chatCopy.subpageShell.workbench.eyebrow}
            title={chatCopy.subpageShell.workbench.title}
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

      <Dialog open={deleteCandidateId !== null} onOpenChange={(open) => !open && setDeleteCandidateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{chatCopy.deleteDialogTitle}</DialogTitle>
            <DialogDescription>
              {withChatCopyTemplate(chatCopy.deleteDialogDescription, {
                title: deleteCandidateThread ? getThreadDisplayTitle(deleteCandidateThread) : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCandidateId(null)}>{chatCopy.cancel}</Button>
            <Button variant="destructive" onClick={confirmDeleteThread}>{chatCopy.deleteAction}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduledDialogOpen} onOpenChange={setIsScheduledDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>排程任務</DialogTitle>
            <DialogDescription>
              尚未串接排程任務來源。接上後，這裡會顯示自動匯入、定期整理等排程結果，而不是假造的排程清單。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
            尚無排程任務
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduledDialogOpen(false)}>{chatCopy.cancel}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isNewFolderDialogOpen}
        onOpenChange={(open) => {
          setIsNewFolderDialogOpen(open)
          if (!open) setNewFolderNameDraft("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增 Project</DialogTitle>
            <DialogDescription>Project 底下可以放多個對話，方便依主題整理來源與脈絡。</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={newFolderNameDraft}
            onChange={(e) => setNewFolderNameDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitCreateFolder() }}
            placeholder={chatCopy.newFolderPrompt}
            className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/30"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>{chatCopy.cancel}</Button>
            <Button onClick={commitCreateFolder} disabled={!newFolderNameDraft.trim()}>{chatCopy.addFolder}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search: a real pop-up panel over chats + projects, like Claude's own
          search — not an inline field squeezed into the sidebar. */}
      <Dialog
        open={isSearchDialogOpen}
        onOpenChange={(open) => {
          setIsSearchDialogOpen(open)
          if (!open) setChatSearchQuery("")
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="搜尋對話與 Project…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {searchResults.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">沒有符合的結果</p>
            ) : (
              searchResults.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  onClick={() => {
                    if (r.kind === "project") {
                      setProjectViewId(r.id)
                    } else {
                      setActiveConvId(r.id)
                      setProjectViewId(null)
                    }
                    setIsSearchDialogOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/60 transition-colors"
                >
                  {r.kind === "project" ? (
                    <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <MessageSquareIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 min-w-0 truncate">{r.label}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground/60">{r.meta}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteFolderCandidateId !== null} onOpenChange={(open) => !open && setDeleteFolderCandidateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除 Project</DialogTitle>
            <DialogDescription>
              確定要刪除這個 Project 嗎？裡面的對話會移回「未分類」，不會被刪除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFolderCandidateId(null)}>{chatCopy.cancel}</Button>
            <Button variant="destructive" onClick={confirmDeleteFolder}>{chatCopy.deleteAction}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AIInputHeaderBar({
  activeView,
  contextCount,
  isDemoAccount,
  isMockDataEnabled,
  pendingProposalCount,
  reviewCount,
  sourceIndexRows,
  sourceSummary,
  syncSourceCount,
  threadCount,
  workflowRunCount,
  onCapture,
  onChange,
  onToggleMockData,
}: {
  activeView: AIInputSubpage
  contextCount: number
  isDemoAccount: boolean
  isMockDataEnabled: boolean
  pendingProposalCount: number
  reviewCount: number
  sourceIndexRows: OwnerAIInputSourceIndexRow[]
  sourceSummary: OwnerAIInputSourceSummary
  syncSourceCount: number
  threadCount: number
  workflowRunCount: number
  onCapture: () => void
  onChange: (view: AIInputSubpage) => void
  onToggleMockData: () => void
}) {
  const [mounted, setMounted] = React.useState(false)
  const { copy } = useProductLanguage()
  const surfaceCopy = copy.aiInput.surface
  const subpageCopy = copy.aiInput.subpages

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const topSources = sourceIndexRows.length > 0
    ? sourceIndexRows
    : [{
        id: "source-empty",
        label: surfaceCopy.noSourceRows,
        meta: surfaceCopy.formalOnly,
        status: "planned" as const,
        nextAction: surfaceCopy.openSourceSettings,
      }]

  // 導覽分頁本身即可切換到 參考脈絡／同步設定／AI 工作台，數字徽章與下方詳細
  // 面板共用同一組數值，不再另外用一整排統計卡重複呈現（合併自舊版
  // AIInputSubpageNav + OwnerAIInputWorkDesktopSurface 兩排標頭）。
  const navItems: Array<{
    id: AIInputSubpage
    label: string
    count?: number
    icon: React.ReactNode
  }> = [
    { id: "chat", label: subpageCopy.chat.label, count: mounted ? threadCount : undefined, icon: <SparklesIcon className="size-4" /> },
    { id: "context", label: subpageCopy.context.label, count: mounted ? contextCount : undefined, icon: <MessageSquareIcon className="size-4" /> },
    { id: "files", label: subpageCopy.files.label, icon: <FileTextIcon className="size-4" /> },
    { id: "media", label: subpageCopy.media.label, icon: <ImageIcon className="size-4" /> },
    { id: "settings", label: subpageCopy.settings.label, count: mounted ? syncSourceCount : undefined, icon: <Settings2Icon className="size-4" /> },
    { id: "workbench", label: subpageCopy.workbench.label, count: mounted ? reviewCount : undefined, icon: <ListChecksIcon className="size-4" /> },
  ]

  return (
    <div
      className="shrink-0 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur"
      data-owneros-task="OWNEROS-AIINPUT-UI-001-SURFACE"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              data-testid={`ai-input-subpage-${item.id}`}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
                activeView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className={activeView === item.id ? "text-primary-foreground" : "text-muted-foreground"}>
                {item.icon}
              </span>
              <span className="text-xs font-semibold">{item.label}</span>
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

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-md px-2.5 text-xs"
            onClick={onCapture}
          >
            <PenLineIcon className="size-3.5" />
            {surfaceCopy.capture}
          </Button>

          <DetailDrawer
            title={surfaceCopy.title}
            description={surfaceCopy.subtitle}
            wide
            trigger={
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-md px-2.5 text-xs">
                <InfoIcon className="size-3.5" />
                查看詳細
              </Button>
            }
          >
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{surfaceCopy.ownerPrivate}</Badge>
                <Badge variant="outline">{isMockDataEnabled ? surfaceCopy.mockReadiness : surfaceCopy.formalReadiness}</Badge>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">{surfaceCopy.gateAIncomplete}</Badge>
                <Badge variant="outline">{surfaceCopy.externalRegistrationOff}</Badge>
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{surfaceCopy.sourceIndex}</p>
                  <span className="text-[10px] font-semibold text-muted-foreground">{sourceSummary.rowCount} {surfaceCopy.sourceCount}</span>
                </div>
                <div className="mt-3 grid grid-cols-4 divide-x divide-border/60 rounded-md border border-border/60 bg-muted/10 text-center">
                  <OwnerAISurfaceStat label={surfaceCopy.threads} value={threadCount} />
                  <OwnerAISurfaceStat label={surfaceCopy.context} value={contextCount} />
                  <OwnerAISurfaceStat label={surfaceCopy.ready} value={sourceSummary.connectedCount} />
                  <OwnerAISurfaceStat label={surfaceCopy.review} value={sourceSummary.attentionCount} />
                </div>
                <div className="mt-3 space-y-1.5">
                  {topSources.map((row) => (
                    <div key={row.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-border/50 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{row.label}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{row.meta} · {row.nextAction}</p>
                      </div>
                      <ConnectionStatusBadge status={row.status} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{surfaceCopy.proposalDetail}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {pendingProposalCount > 0
                        ? `${pendingProposalCount} ${surfaceCopy.pendingProposal}`
                        : surfaceCopy.noPendingProposal}
                    </p>
                  </div>
                  <span className="rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs font-semibold text-foreground">
                    {reviewCount}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md border border-border/60 bg-muted/10 px-2.5 py-2">
                    <p className="font-semibold text-foreground">{surfaceCopy.nextDecision}</p>
                    <p className="mt-1 text-muted-foreground">{surfaceCopy.nextDecisionBody}</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/10 px-2.5 py-2">
                    <p className="font-semibold text-foreground">{surfaceCopy.workflow}</p>
                    <p className="mt-1 text-muted-foreground">{workflowRunCount} {surfaceCopy.workflowBody}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{surfaceCopy.settingsBoundaries}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {surfaceCopy.settingsBoundariesBody}
                    </p>
                  </div>
                  <ShieldAlertIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="mt-3 grid gap-1.5 text-[10px] font-medium text-muted-foreground sm:grid-cols-2">
                  <span className="rounded-md bg-muted/30 px-2 py-1">{surfaceCopy.noProviderRuntime}</span>
                  <span className="rounded-md bg-muted/30 px-2 py-1">{surfaceCopy.noDbWrite}</span>
                  <span className="rounded-md bg-muted/30 px-2 py-1">{surfaceCopy.noPublicOutput}</span>
                  <span className="rounded-md bg-muted/30 px-2 py-1">{sourceSummary.providerCount} {surfaceCopy.providerManifests}</span>
                </div>
              </div>
            </div>
          </DetailDrawer>

          {/* AUTH-013: demo/formal toggle exists only for the fixed-code demo
              account. Every real tenant login has no demo affordance at all —
              the surface is simply the real, blank, usable one. */}
          {isDemoAccount && (
            <button
              type="button"
              onClick={onToggleMockData}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors",
                isMockDataEnabled
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              )}
              title={isMockDataEnabled ? copy.state.mockTitle : copy.state.formalTitle}
            >
              <DatabaseIcon className="size-3.5" />
              <span className="hidden sm:inline">{isMockDataEnabled ? copy.state.mock : copy.state.formal}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function OwnerAISurfaceStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function MockModeInlineNotice({ isMockDataEnabled }: { isMockDataEnabled: boolean }) {
  const { copy } = useProductLanguage()

  return (
    <div className="flex justify-center">
      <span className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-full border px-3 py-1 text-[11px]",
        isMockDataEnabled
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      )}>
        {isMockDataEnabled
          ? copy.state.mockEnabledNotice
          : copy.state.formalModeNotice}
      </span>
    </div>
  )
}

// Claude.ai-style composer toolbar: "+" attach/import, a Project-or-folder
// binder, then chat mode + model pickers and voice on the right, mirroring
// the reference composer (attach, project selector, model/voice cluster).
// Shared by the landing composer and the active-chat composer so both stay
// visually and behaviorally identical.
type ComposerFolderOption = { id: string; label: string }
type ComposerImportAction = { id: string; icon: React.ReactNode; label: string; onClick: () => void }

function ComposerToolbar({
  mode,
  onModeChange,
  activeFolderId,
  folderOptions,
  onFolderChange,
  isMockDataEnabled,
  allActions,
  onAddLink,
  onVoice,
  chatCopy,
  getModeLabel,
  onSend,
  sendDisabled,
  showFolderSelector = true,
}: {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  activeFolderId: string | null
  folderOptions: ComposerFolderOption[]
  onFolderChange: (folderId: string | null) => void
  isMockDataEnabled: boolean
  allActions: ComposerImportAction[]
  onAddLink: (urls: string[]) => void
  onVoice: () => void
  chatCopy: ProductCopy["aiInput"]["chat"]
  getModeLabel: (mode: ChatMode) => string
  onSend: () => void
  sendDisabled: boolean
  /** Hide the Project-or-folder picker when the composer already lives
   * inside that project's own page (e.g. ProjectWorkspaceView) — showing
   * it there would be a redundant, no-op control. */
  showFolderSelector?: boolean
}) {
  const activeFolderLabel = folderOptions.find((f) => f.id === activeFolderId)?.label ?? chatCopy.uncategorized

  return (
    <div className="flex items-center gap-1.5">
      {/* + attach / import a source */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              title={chatCopy.quickImport}
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            />
          }
        >
          <PlusIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {isMockDataEnabled ? (
            allActions.map((a) =>
              a.id === "link" ? (
                <AddLinkDialog
                  key={a.id}
                  onAdd={onAddLink}
                  trigger={
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/80"
                    >
                      <span className="flex size-3.5 items-center justify-center text-muted-foreground [&>svg]:size-3.5">{a.icon}</span>
                      {a.label}
                    </button>
                  }
                />
              ) : (
                <DropdownMenuItem key={a.id} onClick={a.onClick} className="gap-2 text-xs">
                  <span className="flex size-3.5 items-center justify-center text-muted-foreground [&>svg]:size-3.5">{a.icon}</span>
                  {a.label}
                </DropdownMenuItem>
              )
            )
          ) : (
            <div className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {chatCopy.mockImportDisabled}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Project or folder — binds this conversation to an existing
          collaboration folder (Personal OS's equivalent of a Claude project). */}
      {showFolderSelector && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex h-7 min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              />
            }
          >
            <FolderIcon className="size-3 shrink-0" />
            <span className="max-w-20 truncate">{activeFolderLabel}</span>
            <ChevronDownIcon className="size-3 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => onFolderChange(null)} className="text-xs">
              {chatCopy.uncategorized}
            </DropdownMenuItem>
            {folderOptions.map((f) => (
              <DropdownMenuItem key={f.id} onClick={() => onFolderChange(f.id)} className="text-xs">
                {f.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="min-w-0 flex-1" />

      {/* 對話模式：drives placeholder + tone, unlike the model picker this is fully wired. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex h-7 min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            />
          }
        >
          <SparklesIcon className="size-3 shrink-0" />
          <span className="max-w-16 truncate">{getModeLabel(mode)}</span>
          <ChevronDownIcon className="size-3 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-64 w-48 overflow-y-auto">
          {(Object.keys(CHAT_MODES) as ChatMode[]).map((m) => (
            <DropdownMenuItem key={m} onClick={() => onModeChange(m)} className="text-xs">
              {getModeLabel(m)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 多模型：placeholder only — backend has a single model today, so this
          is shown honestly as not-yet-available rather than faking a working
          switcher. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              title="多模型切換即將支援"
              className="hidden h-7 shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            />
          }
        >
          <ZapIcon className="size-3 shrink-0" />
          <span>標準模型</span>
          <ChevronDownIcon className="size-3 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem disabled className="text-xs">Personal OS 標準模型（目前唯一可用）</DropdownMenuItem>
          <DropdownMenuItem disabled className="text-xs">多模型切換即將開放</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Voice — reuses the same audio capture action as the import menu. */}
      <button
        type="button"
        onClick={onVoice}
        disabled={!isMockDataEnabled}
        title={isMockDataEnabled ? chatCopy.importActions.audio : chatCopy.mockImportDisabled}
        className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-background/60 disabled:hover:text-muted-foreground"
      >
        <AudioLinesIcon className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onSend}
        disabled={sendDisabled}
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
      >
        <SendIcon className="size-3.5" />
      </button>
    </div>
  )
}

// A Project's own page — per Anthropic's docs, clicking a project navigates
// into a dedicated workspace with its own chat list, knowledge, and
// instructions, rather than filtering the global chat list.
// https://support.claude.com/en/articles/9517075-what-are-projects
// https://support.claude.com/en/articles/9519177-how-can-i-create-and-manage-projects
function ProjectWorkspaceView({
  folderLabel,
  isPinned,
  onTogglePin,
  onRename,
  onDelete,
  chatCount,
  chatRows,
  contextItems,
  onBack,
  onSend,
  isMockDataEnabled,
  allActions,
  onAddLink,
  onVoice,
  chatCopy,
  getModeLabel,
}: {
  folderLabel: string
  isPinned: boolean
  onTogglePin: () => void
  onRename: () => void
  onDelete: () => void
  chatCount: number
  chatRows: React.ReactNode
  contextItems: MentionRef[]
  onBack: () => void
  onSend: (text: string, mode: ChatMode) => void
  isMockDataEnabled: boolean
  allActions: ComposerImportAction[]
  onAddLink: (urls: string[]) => void
  onVoice: () => void
  chatCopy: ProductCopy["aiInput"]["chat"]
  getModeLabel: (mode: ChatMode) => string
}) {
  const [draftText, setDraftText] = React.useState("")
  const [draftMode, setDraftMode] = React.useState<ChatMode>("general")

  function handleSubmit() {
    if (!draftText.trim()) return
    onSend(draftText.trim(), draftMode)
    setDraftText("")
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3.5" /> 所有對話
          </button>
          {/* Browser-tab-like chrome: pin + more options, matching what
              every Chats row already has. */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onTogglePin}
              title={isPinned ? "取消釘選" : "釘選"}
              className={cn(
                "size-7 rounded-md flex items-center justify-center hover:bg-muted",
                isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isPinned ? <PinIcon className="size-3.5" /> : <PinOffIcon className="size-3.5" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground" />
                }
              >
                <MoreVerticalIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onRename}>
                  <PenLineIcon className="size-3.5" /> {chatCopy.renameThread}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2Icon className="size-3.5" /> 刪除 Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderIcon className="size-4.5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{folderLabel}</h1>
            <p className="text-xs text-muted-foreground">Project · {chatCount} 個對話</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-6 py-6">
          {/* Directly usable chat frame — like Claude's own project page —
              instead of a plain "start" button. */}
          <div className="relative">
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder={`在「${folderLabel}」中開始新對話…`}
              rows={2}
              className="w-full resize-none rounded-t-2xl border border-border/60 bg-muted/30 px-4 pt-3.5 pb-1.5 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20 min-h-[60px] max-h-[160px]"
            />
            <div className="rounded-b-2xl border border-t-0 border-border/60 bg-muted/30 px-3 pb-2 pt-1">
              <ComposerToolbar
                mode={draftMode}
                onModeChange={setDraftMode}
                activeFolderId={null}
                folderOptions={[]}
                onFolderChange={() => {}}
                showFolderSelector={false}
                isMockDataEnabled={isMockDataEnabled}
                allActions={allActions}
                onAddLink={onAddLink}
                onVoice={onVoice}
                chatCopy={chatCopy}
                getModeLabel={getModeLabel}
                onSend={handleSubmit}
                sendDisabled={!draftText.trim()}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">對話</p>
            {chatCount === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                這個 Project 還沒有對話
              </p>
            ) : (
              <div className="space-y-0.5">{chatRows}</div>
            )}
          </div>
        </div>

        {/* Instructions / Memory / Context / Scheduled — mirrors Claude's own
            project settings panel. Instructions/Memory/Scheduled are honest
            not-yet-available states; Context lists real referenced sources
            aggregated from this project's own conversations. */}
        <div className="w-full shrink-0 border-t border-border/50 px-6 py-6 lg:w-72 lg:border-t-0 lg:border-l">
          <ProjectPanelSection title="Instructions">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              尚未支援 Project 專屬指示，所有對話目前共用整體來源設定。
            </p>
          </ProjectPanelSection>
          <ProjectPanelSection title="Memory">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              尚未接上記憶功能，這個 Project 目前不會保留跨對話記憶。
            </p>
          </ProjectPanelSection>
          <ProjectPanelSection title="Context" defaultOpen>
            {contextItems.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-muted-foreground">這個 Project 的對話目前沒有引用任何來源。</p>
            ) : (
              <div className="space-y-1">
                {contextItems.map((item) => (
                  <div key={item.id} className="truncate rounded-md bg-muted/30 px-2 py-1 text-[11px] text-foreground">
                    {item.name}
                  </div>
                ))}
              </div>
            )}
          </ProjectPanelSection>
          <ProjectPanelSection title="Scheduled">
            <p className="text-[11px] leading-relaxed text-muted-foreground">尚未串接排程任務來源。</p>
          </ProjectPanelSection>
        </div>
      </div>
    </div>
  )
}

function ProjectPanelSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-b border-border/50 py-3 first:pt-0 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold text-foreground"
      >
        {title}
        <ChevronDownIcon className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-2">{children}</div>}
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
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className={cn("mx-auto flex min-h-full flex-col gap-3", wide ? "max-w-6xl" : "max-w-3xl")}>
        <header className="flex items-baseline gap-2 border-b border-border/60 pb-2.5">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="truncate text-xs text-muted-foreground" title={description}>{description}</p>
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
  sourceConnectionCatalog,
  isMockDataEnabled,
  resourceNodesCount,
  connectorsState,
  setConnectorsState,
  pushToast,
}: {
  formalReadiness: AIInputFormalReadinessContract
  sourceConnectionCatalog: AIInputSourceConnectionCatalogDTO
  isMockDataEnabled: boolean
  resourceNodesCount: number
  connectorsState: ExtendedSourceConnectorRow[]
  setConnectorsState: React.Dispatch<React.SetStateAction<ExtendedSourceConnectorRow[]>>
  pushToast: (msg: string) => void
}) {
  const { copy } = useProductLanguage()
  const sourceSettingsCopy = copy.aiInput.chat.sourceSettings
  const drawerCopy = sourceSettingsCopy.drawer
  const [isConnectionWizardOpen, setIsConnectionWizardOpen] = React.useState(false)
  const [selectedConnectorId, setSelectedConnectorId] = React.useState<string | null>(null)
  const [drawerTab, setDrawerTab] = React.useState<SourceSettingsDrawerTab>("sync")
  const [formData, setFormData] = React.useState<ExtendedSourceConnectorRow | null>(null)

  const openConnectorSettings = React.useCallback((connectorId: string) => {
    if (!isMockDataEnabled) return
    const connector = connectorsState.find((candidate) => candidate.id === connectorId)
    if (!connector) return
    setSelectedConnectorId(connectorId)
    setFormData(structuredClone(connector))
  }, [connectorsState, isMockDataEnabled])

  const closeConnectorSettings = React.useCallback(() => {
    setSelectedConnectorId(null)
    setFormData(null)
  }, [])

  const selectDrawerTab = React.useCallback((tab: SourceSettingsDrawerTab, focusTab = false) => {
    setDrawerTab(tab)
    if (focusTab) {
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>(`[data-source-settings-tab="${tab}"]`)
          ?.focus()
      })
    }
  }, [])

  const connectors = isMockDataEnabled ? connectorsState : []
  const sourceInputMatrixRows: SourceInputMatrixRow[] = isMockDataEnabled
    ? connectors.map((connector) => {
        const display = getSourceConnectorDisplay(connector, sourceSettingsCopy)
        const inputModeLabel = sourceSettingsCopy.inputModeLabels as Record<AIInputSourceControlInputMode, string>
        const riskLevel: AIInputSourceControlRiskLevel =
          connector.riskPolicy === "高" ? "high" : connector.riskPolicy === "中" ? "medium" : "low"

        return {
          id: connector.id,
          source: display.source,
          provider: display.provider,
          connectionStatus: connector.connectionStatus,
          inputMode: connector.inputMode,
          inputModeLabel: inputModeLabel[connector.inputMode],
          riskLevel,
          riskLabel: display.riskLabel,
          nextAction: display.nextAction,
          missingPermissions: display.missingPermissions,
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
  const selectedConnectorDisplay = formData ? getSourceConnectorDisplay(formData, sourceSettingsCopy) : null

  const unifiedRows = isMockDataEnabled
    ? connectorsState.map((connector) => {
        const display = getSourceConnectorDisplay(connector, sourceSettingsCopy)
        const riskColor =
          connector.riskPolicy === "高"
            ? "text-red-600 dark:text-red-400"
            : connector.riskPolicy === "中"
            ? "text-amber-600 dark:text-amber-400"
            : "text-emerald-600 dark:text-emerald-400"
        return {
          id: connector.id,
          source: display.source,
          provider: display.provider,
          connectorType: display.connectorType,
          riskLabel: display.riskLabel,
          riskColor,
          reviewRule: display.reviewRule,
          cadence: display.cadence,
          lastSync: display.lastSync,
          nextSync: display.nextSync,
          defaultModule: display.defaultModule,
          connectionStatus: connector.connectionStatus,
          syncStatus: connector.syncStatus,
          missingPermissions: display.missingPermissions,
          provenanceNote: display.provenanceNote,
          accountLabel: connector.accountLabel,
        }
      })
    : formalReadiness.sourceControlMatrix.rows.map((row) => {
        const riskColor =
          row.riskLevel === "high"
            ? "text-red-600 dark:text-red-400"
            : row.riskLevel === "medium" || row.riskLevel === "variable"
            ? "text-amber-600 dark:text-amber-400"
            : "text-emerald-600 dark:text-emerald-400"
        return {
          id: row.id,
          source: row.source,
          provider: row.provider,
          connectorType: row.connectorType,
          riskLabel: row.riskLabel,
          riskColor,
          reviewRule: row.reviewRule,
          cadence: row.cadence,
          lastSync: row.lastSync,
          nextSync: row.nextSync,
          defaultModule: row.defaultModule,
          connectionStatus: row.connectionStatus,
          syncStatus: row.syncStatus,
          missingPermissions: row.missingPermissions,
          provenanceNote: row.provenanceNote,
          accountLabel: undefined,
        }
      })

  const handleConnectionDraftsCreated = React.useCallback((drafts: SourceConnectionDraft[]) => {
    if (!isMockDataEnabled || drafts.length === 0) return

    const connectorTypes: Record<SourceConnectionDraft["provider"], string> = {
      line: "Messaging",
      google_drive: "Folder files",
      rss: "Feed",
      gmail: "Email",
      github: "Repo files",
      telegram: "Messaging",
    }
    const inputModes: Record<SourceConnectionDraft["provider"], AIInputSourceControlInputMode> = {
      line: "webhook",
      google_drive: "event",
      rss: "polling",
      gmail: "polling",
      github: "event",
      telegram: "webhook",
    }
    const targetModules: Record<SourceConnectionDraft["targetModule"], string> = {
      work: "工作",
      research: "研究",
      chamber: "商會",
      inbox: "Inbox",
    }
    const targetModuleIds: Record<SourceConnectionDraft["targetModule"], string> = {
      work: "work",
      research: "research",
      chamber: "chamber",
      inbox: "inbox",
    }
    const riskLabels: Record<SourceConnectionDraft["riskLevel"], string> = {
      low: "低",
      medium: "中",
      high: "高",
    }

    const createdRows: ExtendedSourceConnectorRow[] = drafts.map((draft) => {
      const isScheduled = draft.syncMode === "scheduled"
      const riskPolicy = riskLabels[draft.riskLevel]
      return {
        id: draft.id,
        source: draft.displayName,
        provider: draft.provider === "google_drive" ? "Google Drive" : draft.providerLabel,
        connectorType: connectorTypes[draft.provider],
        connectionStatus: "planned",
        syncStatus: "not_configured",
        scope: [
          draft.scopeLabel,
          draft.includeSubfolders ? "包含子資料夾" : null,
          draft.includeAttachments ? "包含附件" : null,
        ].filter(Boolean).join(" · "),
        cadence: draft.syncCadence,
        lastSync: "尚未同步",
        nextSync: "草稿確認後才可啟用",
        defaultModule: targetModules[draft.targetModule],
        riskPolicy,
        reviewRule: draft.approvalRule === "always_review" ? "所有提案需人工確認" : "依風險分級確認",
        inputMode: draft.syncMode === "manual" ? "manual" : isScheduled ? "scheduled" : inputModes[draft.provider],
        nextAction: "管理 mock 草稿並確認邊界",
        missingPermissions: "Mock 草稿：未建立真實授權、provider 連線或持久化。",
        provenanceNote:
          draft.provider === "google_drive"
            ? "Google Docs、Sheets 與 Slides 僅作為 Drive 檔案子類型，保留檔案身分與快照來源。"
            : null,
        accountLabel: draft.accountLabel,
        mockOnly: true,
        syncMode: isScheduled ? "manual_and_scheduled" : "manual_only",
        syncSchedule: isScheduled ? draft.syncCadence : null,
        syncEnabled: false,
        analysisMode: draft.analysisMode === "scheduled" ? "manual_and_scheduled" : "manual_only",
        analysisSchedule: draft.analysisMode === "scheduled" ? draft.syncCadence : null,
        analysisEnabled: false,
        analyzeOnlyWhenPending: true,
        allowedTargetModules: [targetModuleIds[draft.targetModule]],
        riskClassification: draft.riskLevel,
        approvalLevel: draft.approvalRule === "always_review" ? "always_require" : "auto_execute_low_risk",
        includeInMorningBrief: draft.includeInMorningBrief,
        retentionDays: draft.retentionDays,
        piiMaskingEnabled: draft.piiMaskingEnabled,
        uploadDirectory: `/uploads/${draft.provider}`,
        thinkingNodes: [
          { id: `${draft.id}-context`, nodeType: "source_context", order: 1, enabled: true, instruction: "判斷這個連線草稿的來源脈絡。" },
          { id: `${draft.id}-classify`, nodeType: "classify_information", order: 2, enabled: true, instruction: "依資訊主題分類並建議路由。" },
          { id: `${draft.id}-risk`, nodeType: "detect_risk", order: 3, enabled: true, instruction: "識別授權、隱私與寫入風險。" },
        ],
      }
    })

    setConnectorsState((current) => {
      const createdIds = new Set(createdRows.map((row) => row.id))
      return [...current.filter((row) => !createdIds.has(row.id)), ...createdRows]
    })
    pushToast(`已建立 ${createdRows.length} 個 mock 連線草稿；尚未授權、同步或儲存。`)
  }, [isMockDataEnabled, pushToast, setConnectorsState])

  return (
    <div className="space-y-6 pb-8">
      {/* Compact action toolbar — the tab header above already states title/description, so this row only carries actions and counts. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4 text-xs">
        <span
          className="inline-flex cursor-help items-center gap-1 text-muted-foreground"
          title={sourceSettingsCopy.boundaryTooltip}
        >
          <span className="inline-flex items-center justify-center size-4 rounded-full bg-muted text-[10px] font-semibold">
            i
          </span>
          管理邊界
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1 text-foreground/80 font-medium">
            {sourceSettingsCopy.connectedCountLabel} <strong className="text-foreground">{connectedCount}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1 text-foreground/80 font-medium">
            {sourceSettingsCopy.setupCountLabel} <strong className="text-foreground">{setupCount}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/50 bg-amber-50/20 px-2.5 py-1 text-amber-700 font-medium dark:text-amber-400">
            {sourceSettingsCopy.reviewCountLabel} <strong className="text-amber-600 dark:text-amber-500">{reviewCount}</strong>
          </span>
          <Button
            size="sm"
            disabled={!isMockDataEnabled}
            onClick={() => {
              if (isMockDataEnabled) setIsConnectionWizardOpen(true)
            }}
            title={isMockDataEnabled ? sourceSettingsCopy.addConnectionTitleMock : sourceSettingsCopy.addConnectionTitleLive}
            className="h-7 gap-1.5 text-xs"
          >
            <PlusIcon className="size-3.5" />
            {isMockDataEnabled ? sourceSettingsCopy.addConnectionMock : sourceSettingsCopy.addConnectionLive}
          </Button>
        </div>
      </div>

      {/* Unified Settings & Sync Management Dashboard */}
      <WorkbenchTable
        columns={[...sourceSettingsCopy.tableColumns]}
        gridClassName="grid-cols-[minmax(180px,1.2fr)_110px_120px_110px_140px_110px_100px_80px]"
      >
        {unifiedRows.length > 0 ? (
          unifiedRows.map((row) => {
            const typeLabel = getSourceProviderTypeLabel(row.provider, row.connectorType, sourceSettingsCopy)

            return (
              <WorkflowTableRow
                key={row.id}
                onClick={isMockDataEnabled ? () => openConnectorSettings(row.id) : undefined}
                cells={[
                  <span key="source" className="block min-w-0">
                    <span className="block truncate font-semibold text-foreground">{row.source}</span>
                    {row.accountLabel && (
                      <span className="block truncate text-[10px] text-muted-foreground mt-0.5" title={row.accountLabel}>
                        {sourceSettingsCopy.externalAccountPrefix}: {row.accountLabel}
                      </span>
                    )}
                    {row.missingPermissions && (
                      <span 
                        className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-1 cursor-help"
                        title={`${sourceSettingsCopy.missingPermissionTitle}:\n${row.missingPermissions}`}
                      >
                        ⚠️ {sourceSettingsCopy.missingPermissionLabel}
                      </span>
                    )}
                    {row.provenanceNote && (
                      <span className="block truncate text-[10px] text-muted-foreground mt-1" title={row.provenanceNote}>
                        {sourceSettingsCopy.provenanceRetainedLabel}
                      </span>
                    )}
                  </span>,
                  <span key="type" className="text-xs text-muted-foreground">{typeLabel}</span>,
                  <span 
                    key="risk"
                    className="inline-flex items-center gap-1.5 cursor-help" 
                    title={`${sourceSettingsCopy.reviewRuleTitle}:\n${row.reviewRule}`}
                  >
                    <span className={cn("size-2 rounded-full", 
                      row.riskColor.includes("red") ? "bg-red-500" : row.riskColor.includes("amber") ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <span className={cn("text-xs font-semibold", row.riskColor)}>
                      {formatCopyTemplate(sourceSettingsCopy.riskLabelTemplate, { risk: row.riskLabel })}
                    </span>
                  </span>,
                  <span key="cadence" className="text-xs text-foreground/80">{row.cadence}</span>,
                  <span key="sync-time" className="block min-w-0">
                    <span className="block text-xs text-foreground/85">{sourceSettingsCopy.previousSyncLabel}: {row.lastSync}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">{sourceSettingsCopy.nextSyncLabel}: {row.nextSync}</span>
                  </span>,
                  <span key="module" className="inline-flex items-center rounded bg-primary/5 border border-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                    {row.defaultModule}
                  </span>,
                  <div key="status" className="flex flex-col gap-1 w-[84px]">
                    <ConnectionStatusBadge status={row.connectionStatus} />
                    <SourceSyncStatusBadge status={row.syncStatus} />
                  </div>,
                  <button
                    key="manage"
                    disabled={!isMockDataEnabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isMockDataEnabled) openConnectorSettings(row.id)
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                    title={isMockDataEnabled ? sourceSettingsCopy.manageConnectionTitleMock : sourceSettingsCopy.manageConnectionTitleLive}
                  >
                    {isMockDataEnabled ? sourceSettingsCopy.manageMockLabel : sourceSettingsCopy.manageLiveLabel}
                  </button>,
                ]}
                gridClassName="grid-cols-[minmax(180px,1.2fr)_110px_120px_110px_140px_110px_100px_80px]"
              />
            )
          })
        ) : (
          <EmptyTableRow message={sourceSettingsCopy.emptyConnections} />
        )}
      </WorkbenchTable>

      {/* Collapsible formal readiness panel for owner setup review. */}
      {!isMockDataEnabled && (
        <details className="border border-border/50 rounded-lg bg-muted/5 transition-all duration-200">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground select-none flex items-center gap-2">
            <span>正式資料準備與系統邊界</span>
          </summary>
          <div className="p-4 border-t border-border/50 space-y-6 bg-background">
            <FormalReadinessContractPanel
              contract={formalReadiness}
              description="正式模式只顯示安全可見的準備狀態，並標出目前被刻意關閉的同步、寫入與外部執行能力。"
              title="正式資料準備狀態"
            />
            <FormalSourceWorkflowReadModelTable contract={formalReadiness} />
            <FormalSourceWorkflowProofBootstrapPanel contract={formalReadiness} />
            <FormalSourceWorkflowGateMatrixTable contract={formalReadiness} />
          </div>
        </details>
      )}

      <WorkbenchTable
        columns={[...sourceSettingsCopy.reviewPolicy.columns]}
        description={sourceSettingsCopy.reviewPolicy.description}
        gridClassName="grid-cols-[minmax(180px,1fr)_minmax(240px,1.2fr)_minmax(300px,1.8fr)]"
        title={sourceSettingsCopy.reviewPolicy.title}
      >
        {SYNC_REVIEW_POLICIES.map((policy) => {
          const policyCopy = (sourceSettingsCopy.reviewPolicy.rows as Record<string, Omit<SyncReviewPolicy, "id">>)[policy.id] ?? policy
          return (
            <WorkflowTableRow
              key={policy.id}
              cells={[policyCopy.condition, policyCopy.handling, policyCopy.reason]}
              gridClassName="grid-cols-[minmax(180px,1fr)_minmax(240px,1.2fr)_minmax(300px,1.8fr)]"
            />
          )
        })}
       </WorkbenchTable>

      {/* Settings Drawer */}
      <AnimatePresence>
        {selectedConnectorId && formData && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeConnectorSettings}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            {/* Drawer Container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-muted/30">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{selectedConnectorDisplay?.source ?? formData.source}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConnectorDisplay
                      ? getSourceProviderTypeLabel(selectedConnectorDisplay.provider, selectedConnectorDisplay.connectorType, sourceSettingsCopy)
                      : `${formData.provider} · ${formData.connectorType}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeConnectorSettings}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <span className="text-xl font-light">&times;</span>
                </button>
              </div>

              {/* Tabs Nav */}
              <div
                role="tablist"
                aria-label={drawerCopy.tabListLabel}
                className="flex border-b border-border/60 px-4 bg-muted/10 text-xs font-medium scrollbar-none overflow-x-auto"
              >
                {SOURCE_SETTINGS_DRAWER_TABS.map((tab, tabIndex) => {
                  const isActive = drawerTab === tab
                  return (
                    <button
                      type="button"
                      key={tab}
                      id={`source-settings-tab-${tab}`}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`source-settings-panel-${tab}`}
                      data-source-settings-tab={tab}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => selectDrawerTab(tab)}
                      onKeyDown={(event) => {
                        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
                        event.preventDefault()
                        const direction = event.key === "ArrowRight" ? 1 : -1
                        const nextIndex =
                          (tabIndex + direction + SOURCE_SETTINGS_DRAWER_TABS.length) %
                          SOURCE_SETTINGS_DRAWER_TABS.length
                        selectDrawerTab(SOURCE_SETTINGS_DRAWER_TABS[nextIndex], true)
                      }}
                      className={cn(
                        "px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
                        isActive
                          ? "border-primary text-foreground font-semibold"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {drawerCopy.tabs[tab]}
                    </button>
                  )
                })}
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
                {drawerTab === "sync" && (
                  <div
                    id="source-settings-panel-sync"
                    role="tabpanel"
                    aria-labelledby="source-settings-tab-sync"
                    className="space-y-5"
                  >
                    {/* Sync Section */}
                    <div className="border border-border/60 rounded-lg p-4 bg-muted/10 space-y-4">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ZapIcon className="size-3.5 text-amber-500" />
                        {drawerCopy.syncPolicyTitle}
                      </h4>
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-muted-foreground">{drawerCopy.enableScheduledSync}</label>
                        <input
                          type="checkbox"
                          checked={formData.syncEnabled}
                          onChange={(e) => setFormData({ ...formData, syncEnabled: e.target.checked })}
                          className="rounded border-border/60 text-primary focus:ring-primary size-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground block">{drawerCopy.syncTriggerMode}</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="syncMode"
                              checked={formData.syncMode === "manual_only"}
                              onChange={() => setFormData({ ...formData, syncMode: "manual_only", syncSchedule: null })}
                            />
                            {drawerCopy.manualOnly}
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="syncMode"
                              checked={formData.syncMode === "manual_and_scheduled"}
                              onChange={() => setFormData({ ...formData, syncMode: "manual_and_scheduled", syncSchedule: "0 8 * * *" })}
                            />
                            {drawerCopy.manualAndScheduled}
                          </label>
                        </div>
                      </div>
                      {formData.syncMode === "manual_and_scheduled" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground block">{drawerCopy.syncCronLabel}</label>
                          <input
                            type="text"
                            value={formData.syncSchedule || ""}
                            onChange={(e) => setFormData({ ...formData, syncSchedule: e.target.value })}
                            className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-border/80"
                            placeholder="e.g. 0 8 * * *"
                          />
                        </div>
                      )}
                    </div>

                    {/* Analysis Section */}
                    <div className="border border-border/60 rounded-lg p-4 bg-muted/10 space-y-4">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <SparklesIcon className="size-3.5 text-indigo-500" />
                        {drawerCopy.analysisPolicyTitle}
                      </h4>
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-muted-foreground">{drawerCopy.enableAutoAnalysis}</label>
                        <input
                          type="checkbox"
                          checked={formData.analysisEnabled}
                          onChange={(e) => setFormData({ ...formData, analysisEnabled: e.target.checked })}
                          className="rounded border-border/60 text-primary focus:ring-primary size-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground block">{drawerCopy.analysisTriggerMode}</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="analysisMode"
                              checked={formData.analysisMode === "manual_only"}
                              onChange={() => setFormData({ ...formData, analysisMode: "manual_only", analysisSchedule: null })}
                            />
                            {drawerCopy.manualOnly}
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="analysisMode"
                              checked={formData.analysisMode === "manual_and_scheduled"}
                              onChange={() => setFormData({ ...formData, analysisMode: "manual_and_scheduled", analysisSchedule: "0 9 * * *" })}
                            />
                            {drawerCopy.manualAndScheduled}
                          </label>
                        </div>
                      </div>
                      {formData.analysisMode === "manual_and_scheduled" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground block">{drawerCopy.analysisCronLabel}</label>
                          <input
                            type="text"
                            value={formData.analysisSchedule || ""}
                            onChange={(e) => setFormData({ ...formData, analysisSchedule: e.target.value })}
                            className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:border-border/80"
                            placeholder="e.g. 0 9 * * *"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="text-muted-foreground">{drawerCopy.analyzeOnlyWhenPending}</label>
                        <input
                          type="checkbox"
                          checked={formData.analyzeOnlyWhenPending}
                          onChange={(e) => setFormData({ ...formData, analyzeOnlyWhenPending: e.target.checked })}
                          className="rounded border-border/60 text-primary focus:ring-primary size-4"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === "nodes" && (
                  <div
                    id="source-settings-panel-nodes"
                    role="tabpanel"
                    aria-labelledby="source-settings-tab-nodes"
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-xs text-muted-foreground">{drawerCopy.nodesHelp}</span>
                    </div>
                    <div className="space-y-3">
                      {formData.thinkingNodes
                        ?.sort((a, b) => a.order - b.order)
                        .map((node, index) => {
                          const nodeLabel = drawerCopy.nodeLabels as Record<string, string>
                          return (
                            <div key={node.id} className="border border-border/60 rounded-lg p-3 bg-muted/5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {/* Reordering buttons instead of complex drag */}
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => {
                                        if (!formData || !formData.thinkingNodes) return
                                        const nodes = [...formData.thinkingNodes].sort((a,b)=>a.order-b.order)
                                        const temp = nodes[index]
                                        nodes[index] = nodes[index - 1]
                                        nodes[index - 1] = temp
                                        nodes.forEach((n, idx) => { n.order = idx + 1 })
                                        setFormData({ ...formData, thinkingNodes: nodes })
                                      }}
                                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-[9px] font-bold p-0.5"
                                      title={drawerCopy.moveUpTitle}
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      disabled={index === (formData.thinkingNodes?.length || 1) - 1}
                                      onClick={() => {
                                        if (!formData || !formData.thinkingNodes) return
                                        const nodes = [...formData.thinkingNodes].sort((a,b)=>a.order-b.order)
                                        const temp = nodes[index]
                                        nodes[index] = nodes[index + 1]
                                        nodes[index + 1] = temp
                                        nodes.forEach((n, idx) => { n.order = idx + 1 })
                                        setFormData({ ...formData, thinkingNodes: nodes })
                                      }}
                                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-[9px] font-bold p-0.5"
                                      title={drawerCopy.moveDownTitle}
                                    >
                                      ▼
                                    </button>
                                  </div>
                                  <span className="text-xs font-semibold text-foreground/90">
                                    {index + 1}. {nodeLabel[node.nodeType] || node.nodeType}
                                  </span>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={node.enabled}
                                  onChange={() => {
                                    if (!formData || !formData.thinkingNodes) return
                                    const nodes = formData.thinkingNodes.map(n => n.id === node.id ? { ...n, enabled: !n.enabled } : n)
                                    setFormData({ ...formData, thinkingNodes: nodes })
                                  }}
                                  className="rounded border-border/60 text-primary focus:ring-primary size-3.5"
                                />
                              </div>
                              {node.enabled && (
                                <textarea
                                  value={node.instruction || ""}
                                  onChange={(e) => {
                                    if (!formData || !formData.thinkingNodes) return
                                    const nodes = formData.thinkingNodes.map(n => n.id === node.id ? { ...n, instruction: e.target.value } : n)
                                    setFormData({ ...formData, thinkingNodes: nodes })
                                  }}
                                  rows={2}
                                  className="w-full text-[11px] leading-relaxed bg-muted/40 border border-border/50 rounded p-2 text-foreground focus:outline-none focus:border-border/80"
                                  placeholder={drawerCopy.nodePlaceholder}
                                />
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {drawerTab === "routing" && (
                  <div
                    id="source-settings-panel-routing"
                    role="tabpanel"
                    aria-labelledby="source-settings-tab-routing"
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">{drawerCopy.defaultModuleLabel}</label>
                      <select
                        value={formData.defaultModule}
                        onChange={(e) => setFormData({ ...formData, defaultModule: e.target.value })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="工作">{drawerCopy.moduleOptions.work}</option>
                        <option value="研究">{drawerCopy.moduleOptions.research}</option>
                        <option value="商會">{drawerCopy.moduleOptions.chamber}</option>
                        <option value="生活">{drawerCopy.moduleOptions.life}</option>
                        <option value="財務">{drawerCopy.moduleOptions.finance}</option>
                        <option value="公司">{drawerCopy.moduleOptions.company}</option>
                        <option value="Inbox">{drawerCopy.moduleOptions.inbox}</option>
                        <option value="依 AI triage">{drawerCopy.moduleOptions.triage}</option>
                      </select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-semibold text-foreground block">{drawerCopy.allowedTargetModulesLabel}</label>
                      <div className="border border-border/60 rounded-lg p-3 bg-muted/10 space-y-2.5">
                        {[
                          { id: "work", label: drawerCopy.allowedModuleOptions.work },
                          { id: "research", label: drawerCopy.allowedModuleOptions.research },
                          { id: "chamber", label: drawerCopy.allowedModuleOptions.chamber },
                          { id: "life", label: drawerCopy.allowedModuleOptions.life },
                          { id: "finance", label: drawerCopy.allowedModuleOptions.finance },
                          { id: "company", label: drawerCopy.allowedModuleOptions.company },
                          { id: "inbox", label: drawerCopy.allowedModuleOptions.inbox },
                        ].map((mod) => {
                          const isChecked = formData.allowedTargetModules?.includes(mod.id)
                          return (
                            <label key={mod.id} className="flex items-center justify-between text-xs text-foreground/80 cursor-pointer">
                              <span>{mod.label}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  let list = [...(formData.allowedTargetModules || [])]
                                  if (isChecked) {
                                    list = list.filter(item => item !== mod.id)
                                  } else {
                                    list.push(mod.id)
                                  }
                                  setFormData({ ...formData, allowedTargetModules: list })
                                }}
                                className="rounded border-border/60 text-primary focus:ring-primary size-4"
                              />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === "approval" && (
                  <div
                    id="source-settings-panel-approval"
                    role="tabpanel"
                    aria-labelledby="source-settings-tab-approval"
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">{drawerCopy.riskLevelLabel}</label>
                      <select
                        value={formData.riskClassification}
                        onChange={(e) => setFormData({ ...formData, riskClassification: e.target.value as SourceRiskClassification })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="low">{drawerCopy.riskOptions.low}</option>
                        <option value="medium">{drawerCopy.riskOptions.medium}</option>
                        <option value="high">{drawerCopy.riskOptions.high}</option>
                      </select>
                      <span className="text-[10px] text-muted-foreground block">{drawerCopy.riskHelp}</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">{drawerCopy.approvalLevelLabel}</label>
                      <select
                        value={formData.approvalLevel}
                        onChange={(e) => setFormData({ ...formData, approvalLevel: e.target.value as SourceApprovalLevel })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="always_require">{drawerCopy.approvalOptions.always_require}</option>
                        <option value="auto_execute_low_risk">{drawerCopy.approvalOptions.auto_execute_low_risk}</option>
                        <option value="full_automation">{drawerCopy.approvalOptions.full_automation}</option>
                      </select>
                    </div>

                    <div className="border border-border/60 rounded-lg p-4 bg-muted/10 space-y-3">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Settings2Icon className="size-3.5 text-muted-foreground" />
                        {drawerCopy.todayNotificationTitle}
                      </h4>
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-muted-foreground">{drawerCopy.includeInToday}</label>
                        <input
                          type="checkbox"
                          checked={formData.includeInMorningBrief}
                          onChange={(e) => setFormData({ ...formData, includeInMorningBrief: e.target.checked })}
                          className="rounded border-border/60 text-primary focus:ring-primary size-4"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === "governance" && (
                  <div
                    id="source-settings-panel-governance"
                    role="tabpanel"
                    aria-labelledby="source-settings-tab-governance"
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">{drawerCopy.retentionLabel}</label>
                      <select
                        value={formData.retentionDays}
                        onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="30">{drawerCopy.retentionOptions["30"]}</option>
                        <option value="90">{drawerCopy.retentionOptions["90"]}</option>
                        <option value="0">{drawerCopy.retentionOptions["0"]}</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-xs border border-border/60 rounded-lg p-4 bg-muted/10">
                      <div>
                        <label className="font-semibold text-foreground block">{drawerCopy.piiTitle}</label>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">{drawerCopy.piiDescription}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.piiMaskingEnabled}
                        onChange={(e) => setFormData({ ...formData, piiMaskingEnabled: e.target.checked })}
                        className="rounded border-border/60 text-primary focus:ring-primary size-4"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">{drawerCopy.uploadPathLabel}</label>
                      <input
                        type="text"
                        value={formData.uploadDirectory}
                        onChange={(e) => setFormData({ ...formData, uploadDirectory: e.target.value })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                        placeholder="e.g. /uploads/gmail"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-border/60 px-6 py-4 flex gap-3 bg-muted/10">
                <Button
                  onClick={() => {
                    setConnectorsState((prev) =>
                      prev.map((c) =>
                        c.id === formData.id
                          ? {
                              ...formData,
                              defaultModule: formData.defaultModule,
                              riskPolicy:
                                formData.riskClassification === "high"
                                  ? "高"
                                  : formData.riskClassification === "medium"
                                  ? "中"
                                  : "低",
                              reviewRule:
                                formData.approvalLevel === "always_require"
                                  ? "需人工審核"
                                  : "低風險自執",
                            }
                          : c
                      )
                    )
                    pushToast(formatCopyTemplate(drawerCopy.savedToast, { source: selectedConnectorDisplay?.source ?? formData.source }))
                    closeConnectorSettings()
                  }}
                  className="flex-1 bg-primary text-primary-foreground text-xs h-9 rounded-lg hover:bg-primary/95"
                >
                  {drawerCopy.save}
                </Button>
                <Button
                  variant="outline"
                  onClick={closeConnectorSettings}
                  className="flex-1 border-border/60 text-foreground hover:bg-muted text-xs h-9 rounded-lg"
                >
                  {drawerCopy.cancel}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SourceConnectionWizard
        catalog={sourceConnectionCatalog}
        open={isMockDataEnabled && isConnectionWizardOpen}
        onOpenChange={(open) => setIsConnectionWizardOpen(isMockDataEnabled && open)}
        onCreated={handleConnectionDraftsCreated}
      />
    </div>
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
  const { copy } = useProductLanguage()
  const workbenchCopy = copy.aiInput.chat.workbench
  const formalWorkflowKinds: AIInputSourceWorkflowReadModelKind[] = [
    "ai_workflow_run",
    "ai_work_item",
    "data_unit_proposal",
    "module_write_intent",
  ]
  const formalWorkflowModels = formalReadiness.sourceWorkflow.models.filter((model) =>
    formalWorkflowKinds.includes(model.kind)
  )
  const demoRows = workbenchCopy.demoRows
  const workflowRuns = isMockDataEnabled
    ? MOCK_WORKFLOW_RUNS.map((run) => ({
        ...run,
        ...((demoRows.workflowRuns as Record<string, Partial<WorkflowRunCard>>)[run.id] ?? {}),
      }))
    : []
  const reviewItems = isMockDataEnabled
    ? MOCK_REVIEW_ITEMS.map((item) => ({
        ...item,
        ...((demoRows.reviewItems as Record<string, Partial<ReviewItemCard>>)[item.id] ?? {}),
      }))
    : []
  const sourceEnvironments = isMockDataEnabled
    ? MOCK_SOURCE_ENVIRONMENTS.map((source) => ({
        ...source,
        ...((demoRows.sourceEnvironments as Record<string, Partial<SourceEnvironmentCard>>)[source.id] ?? {}),
      }))
    : []
  const organizingResults = isMockDataEnabled
    ? MOCK_ORGANIZING_RESULTS.map((result) => ({
        ...result,
        ...((demoRows.organizingResults as Record<string, Partial<OrganizingResultCard>>)[result.id] ?? {}),
      }))
    : []
  const workLog = isMockDataEnabled
    ? MOCK_WORK_LOG.map((entry) => ({
        ...entry,
        text: (demoRows.workLog as Record<string, string>)[entry.id] ?? entry.text,
      }))
    : []
  const reviewCount = isMockDataEnabled ? reviewItems.length + pendingProposalCount : formalWorkflowModels.length
  const completedCount = workflowRuns.filter((run) => run.status === "completed").length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("border-b border-border/60 px-4 py-3", compact && "px-3")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{workbenchCopy.consoleEyebrow}</p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">{workbenchCopy.consoleTitle}</h2>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {isMockDataEnabled ? workbenchCopy.mockBadge : workbenchCopy.formalBadge}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-border/60 rounded-lg border border-border/60 bg-muted/20">
          <WorkflowStat label={workbenchCopy.stats.today} value={workflowRuns.length.toString()} />
          <WorkflowStat label={workbenchCopy.stats.completed} value={completedCount.toString()} />
          <WorkflowStat label={workbenchCopy.stats.review} value={reviewCount.toString()} tone={reviewCount > 0 ? "warning" : "default"} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {isMockDataEnabled ? workbenchCopy.mockNotice : workbenchCopy.formalNotice}
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
              <span className="flex-1 truncate">{workbenchCopy.tabs[tab.id]}</span>
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
              description={workbenchCopy.formalReadinessDescription}
              title={workbenchCopy.formalReadinessTitle}
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
            columns={[...workbenchCopy.tables.today.columns]}
            description={isMockDataEnabled
              ? formatCopyTemplate(workbenchCopy.tables.today.mockDescription, { count: rawSourceCount })
              : workbenchCopy.tables.today.formalDescription}
            gridClassName="grid-cols-[minmax(160px,1.2fr)_96px_minmax(220px,2fr)_150px]"
            title={workbenchCopy.tables.today.title}
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
              <EmptyTableRow message={workbenchCopy.tables.today.empty} />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "review" && (
          <WorkbenchTable
            columns={[...workbenchCopy.tables.review.columns]}
            description={workbenchCopy.tables.review.description}
            gridClassName="grid-cols-[112px_minmax(160px,1fr)_minmax(240px,2fr)_88px]"
            title={workbenchCopy.tables.review.title}
          >
            {reviewItems.map((item) => (
                <WorkflowTableRow
                  key={item.id}
                  cells={[
                    item.label,
                    <span key="target" className="font-mono text-[11px] text-muted-foreground">{item.target}</span>,
                    `${item.title}：${item.description}`,
                    <span key="severity" className={cn("text-xs font-semibold", item.severity === "high" ? "text-rose-600" : "text-amber-600")}>
                      {item.severity === "high" ? workbenchCopy.tables.review.highSeverity : workbenchCopy.tables.review.mediumSeverity}
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
                  formatCopyTemplate(workbenchCopy.tables.review.pendingProposalDescription, { count: pendingProposalCount }),
                  <span key="severity" className="text-xs font-semibold text-amber-600">{workbenchCopy.tables.review.mediumSeverity}</span>,
                ]}
                gridClassName="grid-cols-[112px_minmax(160px,1fr)_minmax(240px,2fr)_88px]"
              />
            )}
            {reviewItems.length === 0 && pendingProposalCount === 0 && (
              <EmptyTableRow message={workbenchCopy.tables.review.empty} />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "environment" && (
          <WorkbenchTable
            columns={[...workbenchCopy.tables.environment.columns]}
            description={workbenchCopy.tables.environment.description}
            gridClassName="grid-cols-[minmax(220px,1.6fr)_100px_100px_92px_132px]"
            title={workbenchCopy.tables.environment.title}
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
              <EmptyTableRow message={workbenchCopy.tables.environment.empty} />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "results" && (
          <WorkbenchTable
            columns={[...workbenchCopy.tables.results.columns]}
            description={workbenchCopy.tables.results.description}
            gridClassName="grid-cols-[116px_minmax(220px,1.2fr)_minmax(260px,2fr)]"
            title={workbenchCopy.tables.results.title}
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
              <EmptyTableRow message={workbenchCopy.tables.results.empty} />
            )}
          </WorkbenchTable>
        )}

        {activeTab === "log" && (
          <WorkbenchTable
            columns={[...workbenchCopy.tables.log.columns]}
            description={workbenchCopy.tables.log.description}
            gridClassName="grid-cols-[80px_minmax(320px,1fr)]"
            title={workbenchCopy.tables.log.title}
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
              <EmptyTableRow message={workbenchCopy.tables.log.empty} />
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
    "external registration off",
  ].join(" / ")
  const handoffEvidenceTargets =
    handoff.evidenceTargets.length > 0 ? handoff.evidenceTargets.slice(0, 3).join(" / ") : "not_collected"

  return (
    <section className="rounded-lg border border-border/60 bg-muted/10">
      <div className="flex flex-col gap-3 border-b border-border/60 px-3 py-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {compact ? "本機檢查啟動包" : "來源流程檢查包"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {compact
              ? "最新本機啟動包、檢查命令與缺少的 owner input。"
              : "受保護的無密鑰來源流程檢查視圖。此 UI 不執行命令，也不顯示目標 URL、host、憑證或原始封包內容。"}
          </p>
        </div>
        <ReadinessPill tone={tone}>{proof.summary.packetStatus}</ReadinessPill>
      </div>

      <div className={cn("grid gap-3 p-3 text-xs", compact ? "md:grid-cols-2" : "lg:grid-cols-4")}>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">最新檢查包</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
            {proof.source.latestPacketPath}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">{proof.summary.checkerStatus}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            證據新鮮度 {proofEvidence.latest.freshness} / {evidenceAge}
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">目標分類</p>
          <p className="mt-1 leading-relaxed text-muted-foreground">{targetSummary}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            URL 已遮蔽 {proof.target.targetUrlRedacted ? "yes" : "no"} / host 已遮蔽{" "}
            {proof.target.hostRedacted ? "yes" : "no"}
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">檢查命令</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
            {proof.plannedChildProcess.command}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            現在可執行 {proof.plannedChildProcess.runnableNow ? "yes" : "no"}
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-background/70 px-3 py-2">
          <p className="font-medium text-foreground">設定缺口</p>
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
            <p className="font-medium text-foreground">設定交接目標</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">{handoff.ownerAction}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {handoff.missingPrerequisites.length} 項待補 / 未執行 runtime
            </p>
          </div>
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">環境變數名稱</p>
            <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-muted-foreground">
              {handoff.envVarNames.join(" / ")}
            </p>
          </div>
          <div className="rounded-md bg-background/70 px-3 py-2">
            <p className="font-medium text-foreground">檢查目標</p>
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
  title?: string
  description?: string
  columns: string[]
  gridClassName: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      {title && (
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
      )}
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
  onClick,
  className,
}: {
  cells: React.ReactNode[]
  gridClassName: string
  onClick?: () => void
  className?: string
}) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "grid min-w-[680px] items-center gap-3 px-3 py-2.5 text-xs text-foreground/80 hover:bg-muted/30", 
        onClick && "cursor-pointer transition-colors duration-150 hover:bg-muted/50",
        gridClassName,
        className
      )}
    >
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
  const { copy } = useProductLanguage()
  const labels = copy.aiInput.chat.workbench.workflowStatus
  const statusConfig = {
    completed: { label: labels.completed, icon: <CheckCircle2Icon className="size-3.5" />, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    review: { label: labels.review, icon: <AlertTriangleIcon className="size-3.5" />, className: "text-amber-700 bg-amber-50 border-amber-200" },
    partial: { label: labels.partial, icon: <Clock3Icon className="size-3.5" />, className: "text-sky-700 bg-sky-50 border-sky-200" },
  }[status]

  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", statusConfig.className)}>
      {statusConfig.icon}
      {statusConfig.label}
    </span>
  )
}

function ConnectionStatusBadge({ status }: { status: SourceConnectorRow["connectionStatus"] }) {
  const { copy } = useProductLanguage()
  const labels = copy.aiInput.chat.sourceSettings.connectionStatus
  const statusConfig = {
    connected: { label: labels.connected, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    needs_setup: { label: labels.needs_setup, className: "text-amber-700 bg-amber-50 border-amber-200" },
    planned: { label: labels.planned, className: "text-sky-700 bg-sky-50 border-sky-200" },
    paused: { label: labels.paused, className: "text-slate-600 bg-slate-50 border-slate-200" },
    error: { label: labels.error, className: "text-rose-700 bg-rose-50 border-rose-200" },
  }[status]

  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", statusConfig.className)}>
      {statusConfig.label}
    </span>
  )
}

function SourceSyncStatusBadge({ status }: { status: SourceConnectorRow["syncStatus"] }) {
  const { copy } = useProductLanguage()
  const labels = copy.aiInput.chat.sourceSettings.syncStatus
  const statusConfig = {
    completed: { label: labels.completed, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    review: { label: labels.review, className: "text-amber-700 bg-amber-50 border-amber-200" },
    idle: { label: labels.idle, className: "text-slate-600 bg-slate-50 border-slate-200" },
    running: { label: labels.running, className: "text-sky-700 bg-sky-50 border-sky-200" },
    not_configured: { label: labels.not_configured, className: "text-muted-foreground bg-muted border-border" },
    failed: { label: labels.failed, className: "text-rose-700 bg-rose-50 border-rose-200" },
  }[status]

  return (
    <span className={cn("inline-flex w-fit items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium", statusConfig.className)}>
      {statusConfig.label}
    </span>
  )
}
