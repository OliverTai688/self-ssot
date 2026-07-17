"use client"

import * as React from "react"
import {
  AudioLinesIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  Clock3Icon,
  CopyIcon,
  DatabaseIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  HistoryIcon,
  ImageIcon,
  ListChecksIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  PenLineIcon,
  PlusIcon,
  RssIcon,
  SendIcon,
  Settings2Icon,
  ShieldAlertIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  LinkIcon,
  InboxIcon,
  ZapIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
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
import { useMockDataMode } from "@/lib/context/mock-data-mode-context"
import { cn } from "@/lib/utils"
import { generateReferenceCode } from "@/lib/naming/reference-code"
import { AddLinkDialog } from "@/components/ai/add-link-dialog"
import { FileLibraryPage } from "@/components/ai/file-library/file-library-page"
import { MediaLibraryPage } from "@/components/ai/media-library/media-library-page"
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

function generateAIResponse(text: string, mode: ChatMode): string {
  const normalizedText = text.toLowerCase().trim()
  
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
}: {
  formalReadiness: AIInputFormalReadinessContract
}) {
  const { isMockDataEnabled, toggleMockData } = useMockDataMode()
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
  }

  const PERSONAL_FOLDER_ID = "folder-personal"
  const SOURCE_FOLDER_ID = "folder-source-coworking"

  const [folders, setFolders] = React.useState<ChatThreadFolder[]>([
    { id: PERSONAL_FOLDER_ID, label: "個人對話", collapsed: false },
    { id: SOURCE_FOLDER_ID, label: "來源協作", collapsed: false },
  ])

  const [threads, setThreads] = React.useState<ChatThread[]>([
    {
      id: "default",
      title: "💬 個人 AI 對話 (Oliver)",
      messages: [
        {
          id: "welcome",
          sender: "ai",
          type: "text",
          content: "您好！我是您的 Personal OS 助理。您可以將任何資訊丟進這裡，我會幫您整理、分類並給予下一步建議。",
          timestamp: new Date(),
        }
      ],
      mode: "general",
      isImported: false,
      importType: null,
      mentions: [],
      folderId: PERSONAL_FOLDER_ID,
      threadKind: "personal",
      referenceCode: generateReferenceCode("THREAD", "AIINPUT"),
    }
  ])
  const [activeConvId, setActiveConvId] = React.useState<string>("default")
  const [renamingThreadId, setRenamingThreadId] = React.useState<string | null>(null)
  const [renameDraft, setRenameDraft] = React.useState("")
  const [deleteCandidateId, setDeleteCandidateId] = React.useState<string | null>(null)
  const [workspaceView, setWorkspaceView] = React.useState<AIInputSubpage>("chat")
  const [workbenchTab, setWorkbenchTab] = React.useState<WorkbenchTab>("today")
  const [inputText, setInputText] = React.useState("")
  const [isImportDropdownOpen, setIsImportDropdownOpen] = React.useState(false)

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
      const isDriveOrDocs = connector.provider === "Drive" || connector.provider === "Google Docs" || connector.provider === "GitHub";
      return {
        ...connector,
        syncMode: isMessaging ? "manual_and_scheduled" : "manual_only",
        syncSchedule: isMessaging ? "0 8 * * *" : null,
        syncEnabled: isMessaging,
        analysisMode: isMessaging ? "manual_and_scheduled" : "manual_only",
        analysisSchedule: isMessaging ? "0 9 * * *" : null,
        analysisEnabled: isMessaging,
        analyzeOnlyWhenPending: true,
        allowedTargetModules: isMessaging ? ["chamber", "work"] : isDriveOrDocs ? ["research", "work"] : ["research"],
        riskClassification: connector.riskPolicy === "高" ? "high" : connector.riskPolicy === "中" ? "medium" : "low",
        approvalLevel: connector.riskPolicy === "高" ? "always_require" : "auto_execute_low_risk",
        includeInMorningBrief: isMessaging,
        retentionDays: isMessaging ? 90 : isDriveOrDocs ? 0 : 30,
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

  function startNewConversation(initialText?: string, title?: string) {
    const id = makeClientId("new")
    const welcome: ChatMessage = {
      id: makeClientId("welcome"),
      sender: "ai",
      type: "text",
      content: "您好！我是您的 Personal OS 助理。您可以將任何資訊丟進這裡，我會幫您整理、分類並給予下一步建議。",
      timestamp: new Date(),
    }
    const newThread: ChatThread = {
      id: id,
      title: title || `💬 AI 對話 (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
      messages: [welcome],
      mode: "general",
      isImported: false,
      importType: null,
      mentions: [],
      folderId: PERSONAL_FOLDER_ID,
      threadKind: "personal",
      referenceCode: generateReferenceCode("THREAD", "AIINPUT"),
    }
    setThreads((prev) => [...prev, newThread])
    setActiveConvId(id)
    setIsImportDropdownOpen(false)
    if (initialText) {
      setTimeout(() => doSendText(initialText), 50)
    }
  }

  function handleCreateFolder() {
    const label = window.prompt("資料夾名稱")?.trim()
    if (!label) return
    setFolders((prev) => [...prev, { id: makeClientId("folder"), label, collapsed: false }])
  }

  function handleToggleFolder(folderId: string) {
    setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, collapsed: !f.collapsed } : f))
  }

  function handleMoveThreadToFolder(threadId: string, folderId: string | null) {
    setThreads((prev) => prev.map((t) => t.id === threadId ? { ...t, folderId } : t))
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
    return `💬 ${excerpt}${source.length > 16 ? "…" : ""}`
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
    const contextSuffix = currentMentions.length > 0
      ? `\n\n[參考背景：${currentMentions.map((m) => m.name).join("、")}]`
      : ""
    const displayText = currentMentions.length > 0
      ? `${text}\n＠ ${currentMentions.map((m) => m.name).join("、")}`
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
        aiReply = await getAIResponse(text, mode, historyContext)
      } catch (err) {
        aiReply = generateAIResponse(text, mode)
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
        const role = m.sender === "user" ? "使用者" : "AI"
        const time = m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        return `[${time}] ${role}：${m.content}`
      })
      .join("\n")

    const modeLabel = CHAT_MODES[mode]?.label || "Capture"

    // Construct dynamic topics list based on user inputs
    const userMsgs = messages.filter((m) => m.sender === "user" && m.type === "text")
    const topics = userMsgs.map((m) => m.content).join("；")
    const customSummary = userMsgs.length > 0
      ? `與 AI 的對話紀錄 (${modeLabel})。討論要點包括：${topics.length > 80 ? topics.slice(0, 77) + "..." : topics}`
      : `與 AI 的對話紀錄 (${modeLabel})，共包含對話內容。`
      
    addConversationCapture(transcript, modeLabel, customSummary)
    
    setIsImported(true)
    setImportType(type)
    
    // Add system message to the chat
    const systemText = type === "manual"
      ? "系統訊息：您已手動將此對話紀錄匯入來源分析區域。"
      : "系統訊息：因閒置 24 小時，系統已自動將此對話紀錄匯入來源分析區域。"
      
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
  }, [messages, mode, addConversationCapture])

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
    let coworkMessages: ChatMessage[] = []

    if (sourceId === "line") {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: "🔄 **[LINE 採集代理]**: 偵測到社群『商會核心幹部群』有新訊息！已自動同步 34 則未處理對話，正啟動 Co-working 對話以進行分析分類...",
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: "🤖 **[系統智能]**: 收到 LINE 對話包！分析結果：內容主要涵蓋『商會幹部例會籌備』與『人際引薦線索』。建議分類至 **商會** 模組，並在此生成 Ingestion 提案供 Oliver 確認。",
          timestamp: now,
        },
        {
          id: "cw-3",
          sender: "ai",
          type: "text",
          content: "🔄 **[LINE 採集代理]**: 分析合理，確認建立提案！已生成 Ingestion 審核卡，包含會議待辦及引薦卡草稿，請 Oliver 確認分類或進行後續優化處理。",
          timestamp: now,
        }
      ]
    } else if (sourceId === "rss") {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: "🔄 **[RSS 採集代理]**: 已從訂閱源同步最新文章：『Next.js 16 新特性與記憶體優化指南』。正提取大綱與核心關鍵字並引導分流...",
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: "🤖 **[系統智能]**: 讀取完畢。該文深入探討 Webpack 編譯 Worker 與記憶體優化，屬於技術文獻。建議歸檔至 **研究** 模組，作為 Oliver 的知識庫參考。",
          timestamp: now,
        },
        {
          id: "cw-3",
          sender: "ai",
          type: "text",
          content: "🔄 **[RSS 採集代理]**: 分類確認！已在此建立研究 Ingestion 審核提案，將其對接至知識圖譜中。",
          timestamp: now,
        }
      ]
    } else if (sourceId === "googledoc") {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: "🔄 **[Google Doc 採集代理]**: 檢測到文件『CDR 破產與重組技術比較分析』有變更。正在提取文檔段落以對接 Personal OS 專案...",
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: "🤖 **[系統智能]**: 收到文件。內容提及破產程序法規及案例分析，這與當前 **工作** 模組的破產重組專案緊密關聯。建議將該文件歸類至 **工作** 分類。",
          timestamp: now,
        },
        {
          id: "cw-3",
          sender: "ai",
          type: "text",
          content: "🔄 **[Google Doc 採集代理]**: 確認。已建立 Ingestion 工作卡提案，方便將下一步任務映射到時間軸中。",
          timestamp: now,
        }
      ]
    } else if (sourceId === "markdown") {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: "🔄 **[Markdown 文件代理]**: 已讀取匯入的 Markdown 檔案『2026年個人目標與反思總結』。正在分析內容語調與反思深度...",
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: "🤖 **[系統智能]**: 該文件涉及個人的情緒感受、時間分配反思以及明年的心智決策模型。這顯然屬於 **自己 (Self)** 模組。建議建立反思日誌提案。",
          timestamp: now,
        },
        {
          id: "cw-3",
          sender: "ai",
          type: "text",
          content: "🔄 **[Markdown 文件代理]**: 分類完畢。已在此生成個人反思 Ingestion 提案，請確認。",
          timestamp: now,
        }
      ]
    } else if (sourceId === "image") {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: "🔄 **[圖片分析代理]**: 偵測到新圖片上傳！正在執行多模態 OCR 解析與結構描繪...",
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: "🤖 **[系統智能]**: 圖片包含一張『系統設計架構圖與時序流程』。這可作專案文檔背景。建議歸類至 **工作** 分類中的架構資產庫。",
          timestamp: now,
        },
        {
          id: "cw-3",
          sender: "ai",
          type: "text",
          content: "🔄 **[圖片分析代理]**: 好的，已將圖片記錄包裝為 Ingestion 提案供審查。",
          timestamp: now,
        }
      ]
    } else if (sourceId === "audio") {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: "🔄 **[語音轉錄代理]**: 已收到新語音錄音檔案。啟動 Whisper 音訊轉譯，正在生成逐字稿與結構摘要...",
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: "🤖 **[系統智能]**: 轉譯結果顯示這是一段與商會理事長的拜訪談話。主要提及未來引薦機會與人脈連結。建議分類至 **商會** CRM 歸檔。",
          timestamp: now,
        },
        {
          id: "cw-3",
          sender: "ai",
          type: "text",
          content: "🔄 **[語音轉錄代理]**: 已生成引薦人脈的 Ingestion 審核提案，並包含 Whisper 摘要供 Oliver 參考。",
          timestamp: now,
        }
      ]
    } else if (sourceId === "link") {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: "🔄 **[網頁連結解析代理]**: 正在解析匯入的外部連結。讀取 HTML 中並抓取標題、敘事與結構...",
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: "🤖 **[系統智能]**: 該網頁包含關於 Next.js 16 更新的官方部落格。建議歸類至 **研究** 知識庫以擴展研究視野。",
          timestamp: now,
        },
        {
          id: "cw-3",
          sender: "ai",
          type: "text",
          content: "🔄 **[網頁連結解析代理]**: 好的，已在此生成 Ingestion 提案。",
          timestamp: now,
        }
      ]
    } else {
      coworkMessages = [
        {
          id: "cw-1",
          sender: "ai",
          type: "text",
          content: `🔄 **[${label} 採集代理]**: 偵測到新來源同步中...`,
          timestamp: now,
        },
        {
          id: "cw-2",
          sender: "ai",
          type: "text",
          content: `🤖 **[系統智能]**: 收到來源。建議進行自動分類，並在此生成 Ingestion 提案。`,
          timestamp: now,
        }
      ]
    }

    const threadId = "source-" + sourceId
    setThreads((prev) => {
      const exists = prev.some((t) => t.id === threadId)
      if (exists) {
        return prev.map((t) => t.id === threadId ? { ...t, messages: coworkMessages } : t)
      }
      const newThread: ChatThread = {
        id: threadId,
        title: `🔄 ${label} 來源處理對話`,
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
    pushToast(`已切換至「${label} 來源處理對話」進行協作確認！`)
  }, [threads, pushToast])

  const handleReferenceLibraryItem = React.useCallback((name: string, kind: "file" | "media") => {
    setMentions((prev) => {
      if (prev.some((m) => m.name === name)) {
        pushToast("此項目已存在於本次對話的引用脈絡中。")
        return prev
      }
      const newMention: MentionRef = {
        kind: "source_asset",
        id: "lib-ref-" + Date.now(),
        name: name,
        description: kind === "file" ? "自系統檔案庫引用" : "自系統媒體庫引用",
      }
      pushToast(`已成功引用「${name}」作為本次對話的參考脈絡！`)
      return [...prev, newMention]
    })
  }, [pushToast])

  function handleAddLinks(urls: string[]) {
    addUrlCapture(urls)
    handleSourceSyncAction("link", "連結", () => {})
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
          content: `${CHAT_MODES[newMode].label} 模式 — ${CHAT_MODES[newMode].hint}`,
          timestamp: new Date(),
        },
      ])
    }
  }

  const allActions = [
    { id: "line",      icon: <MessageSquareIcon />, label: "LINE",       onClick: () => handleSourceSyncAction("line", "LINE", mockSyncLINE) },
    { id: "googledoc", icon: <FileTextIcon />,      label: "Google Doc", onClick: () => handleSourceSyncAction("googledoc", "Google Doc", mockImportGoogleDoc) },
    { id: "link",      icon: <LinkIcon />,          label: "連結",       onClick: () => {} }, // Dialog handled below
    { id: "markdown",  icon: <FileTextIcon />,      label: "Markdown",   onClick: () => handleSourceSyncAction("markdown", "Markdown", mockUploadMarkdown) },
    { id: "image",     icon: <UploadIcon />,         label: "圖片",       onClick: () => handleSourceSyncAction("image", "圖片", () => mockUploadMedia("image")) },
    { id: "audio",     icon: <AudioLinesIcon />,     label: "語音",       onClick: () => handleSourceSyncAction("audio", "語音", () => mockUploadMedia("audio")) },
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

  const ungroupedThreads = threads.filter((t) => !t.folderId)
  const deleteCandidateThread = threads.find((t) => t.id === deleteCandidateId) || null

  function renderThreadRow(t: ChatThread) {
    const isActive = t.id === activeConvId
    const isRenaming = renamingThreadId === t.id
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
            onClick={() => setActiveConvId(t.id)}
            onDoubleClick={() => beginRenameThread(t.id, t.title)}
            className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 text-left"
          >
            <span className="truncate flex-1">{t.title}</span>
            {t.isSourceThread && (
              <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
            )}
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
                  pushToast(`已複製 AI 參考代碼：${t.referenceCode}`)
                }}
              >
                <CopyIcon className="size-3.5" />
                <span className="font-mono text-[10px] truncate">{t.referenceCode}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => beginRenameThread(t.id, t.title)}>
                <PenLineIcon className="size-3.5" /> 重新命名
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAutoTitleThread(t.id)}>
                <SparklesIcon className="size-3.5" /> AI 命名
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderIcon className="size-3.5" /> 移到資料夾
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {t.folderId !== null && (
                    <DropdownMenuItem onClick={() => handleMoveThreadToFolder(t.id, null)}>
                      未分類
                    </DropdownMenuItem>
                  )}
                  {folders.map((f) => (
                    f.id !== t.folderId && (
                      <DropdownMenuItem key={f.id} onClick={() => handleMoveThreadToFolder(t.id, f.id)}>
                        {f.label}
                      </DropdownMenuItem>
                    )
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteCandidateId(t.id)}>
                <Trash2Icon className="size-3.5" /> 刪除對話
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    )
  }

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
        {workspaceView === "chat" && (
          <div className="flex h-full w-full overflow-hidden">
            {/* Left Thread List Sidebar */}
            <div className="w-56 shrink-0 border-r border-border/50 bg-muted/15 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border/50 flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">對話與來源處理</span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 rounded-md hover:bg-muted"
                    title="新增資料夾"
                    onClick={handleCreateFolder}
                  >
                    <FolderPlusIcon className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 rounded-md hover:bg-muted"
                    title="新增對話"
                    onClick={() => startNewConversation(undefined, "💬 新增對話")}
                  >
                    <PlusIcon className="size-3" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 no-scrollbar">
                {ungroupedThreads.map(renderThreadRow)}

                {folders.map((folder) => {
                  const folderThreads = threads.filter((t) => t.folderId === folder.id)
                  return (
                    <div key={folder.id} className="pt-1">
                      <button
                        onClick={() => handleToggleFolder(folder.id)}
                        className="w-full flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
                      >
                        {folder.collapsed ? (
                          <ChevronRightIcon className="size-3" />
                        ) : (
                          <ChevronDownIcon className="size-3" />
                        )}
                        <FolderIcon className="size-3" />
                        <span className="flex-1 text-left truncate">{folder.label}</span>
                        <span className="text-muted-foreground/70">{folderThreads.length}</span>
                      </button>
                      {!folder.collapsed && (
                        <div className="space-y-0.5">
                          {folderThreads.length === 0 ? (
                            <div className="px-3 py-1.5 text-[11px] text-muted-foreground/60">尚無對話</div>
                          ) : (
                            folderThreads.map(renderThreadRow)
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Chat Main Area */}
            <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
              {activeConvId === "default" && messages.length <= 1 ? (
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
                    <ActionButton icon={<MessageSquareIcon />} label="LINE" onClick={() => handleSourceSyncAction("line", "LINE", mockSyncLINE)} />
                    <AddLinkDialog onAdd={handleAddLinks} />
                    <ActionButton icon={<FileTextIcon />} label="Google Doc" onClick={() => handleSourceSyncAction("googledoc", "Google Doc", mockImportGoogleDoc)} />
                    <ActionButton icon={<FileTextIcon />} label="Markdown" onClick={() => handleSourceSyncAction("markdown", "Markdown", mockUploadMarkdown)} />
                    <ActionButton icon={<UploadIcon />} label="圖片" onClick={() => handleSourceSyncAction("image", "圖片", () => mockUploadMedia("image"))} />
                    <ActionButton icon={<AudioLinesIcon />} label="語音" onClick={() => handleSourceSyncAction("audio", "語音", () => mockUploadMedia("audio"))} />
                    <ActionButton icon={<RssIcon />} label="RSS" onClick={() => handleSourceSyncAction("rss", "RSS", mockSyncRSS)} />
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
                        <span className="font-semibold text-foreground">對話狀態：保存在聊天視窗</span>
                        <span className="text-muted-foreground ml-1.5">(尚未匯入來源分析)</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">對話狀態：已匯入來源分析</span>
                        <span className="text-muted-foreground ml-1.5">
                          (方式: {importType === "manual" ? "手動確認" : "閒置 24 小時自動匯入"})
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
                        <span>手動匯入來源分析</span>
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={messages.length <= 1}
                        onClick={() => handleImportConversation("auto")}
                        className="border-border/60 hover:bg-muted text-[11px] h-7 px-2.5 rounded-lg transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1"
                      >
                        <ZapIcon className="size-3.5 text-amber-500 fill-amber-500/10" />
                        <span>模擬閒置 24h</span>
                      </Button>
                      <span className="text-[10px] text-muted-foreground/60 hidden xl:inline-flex items-center gap-0.5">
                        (<Clock3Icon className="size-3" />
                        <span>24h 閒置自動匯入</span>)
                      </span>
                    </>
                  ) : (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled
                      className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[11px] h-7 px-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/50 font-medium"
                    >
                      ✓ 已安全匯入 Ingestion
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

                {/* Import actions dropdown (unfiltered) */}
                {isMockDataEnabled && (
                  <div className="flex items-center gap-2 pb-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest whitespace-nowrap">匯入</span>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 rounded-full border-border/50 bg-background/50 hover:bg-muted text-xs font-normal gap-1.5 px-3 whitespace-nowrap shadow-sm"
                        onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                      >
                        <PlusIcon className="size-3 text-muted-foreground" />
                        <span>選擇匯入來源</span>
                      </Button>

                      <AnimatePresence>
                        {isImportDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsImportDropdownOpen(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 5 }}
                              transition={{ duration: 0.15 }}
                              className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-border/50 bg-background/95 backdrop-blur-md p-1 shadow-lg z-50 flex flex-col gap-0.5"
                            >
                              {allActions.map((a) => (
                                a.id === "link" ? (
                                  <AddLinkDialog
                                    key={a.id}
                                    onAdd={handleAddLinks}
                                    trigger={
                                      <button
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                                        onClick={() => setIsImportDropdownOpen(false)}
                                      >
                                        <span className="size-3 text-muted-foreground flex items-center justify-center [&>svg]:size-3">{a.icon}</span>
                                        <span className="flex-1">{a.label}</span>
                                      </button>
                                    }
                                  />
                                ) : (
                                  <button
                                    key={a.id}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                                    onClick={() => {
                                      setIsImportDropdownOpen(false)
                                      a.onClick()
                                    }}
                                  >
                                    <span className="size-3 text-muted-foreground flex items-center justify-center [&>svg]:size-3">{a.icon}</span>
                                    <span className="flex-1">{a.label}</span>
                                  </button>
                                )
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
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
        )
      }
    </div>
  </div>
)}

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

        {workspaceView === "files" && (
          <SubpageShell
            description="管理系統所有的檔案資產：每份檔案可能同時具備 Google Drive 外部來源與 PersonalOS 已保存的 Snapshot。您可以直接在此上傳新檔案，或將其引用作為目前對話的背景參考。"
            eyebrow="File Library"
            title="系統檔案庫"
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
            description="管理系統的所有媒體資產：圖片、影片與音樂。依分類瀏覽，上傳後可直接引用至當前 AI 對話進行多模態分析（圖片 OCR、影片畫面辨識、語音轉錄）。"
            eyebrow="Media Library"
            title="系統媒體庫"
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
            description="查看 LINE、Drive、Docs、RSS、Telegram、Gmail、GitHub 等外部來源的串接狀態、同步健康度、範圍與確認條件。這不是當前對話引用內容。"
            eyebrow="Source Settings"
            title="同步設定"
            wide
          >
            <SourceStructurePanelContent
              formalReadiness={formalReadiness}
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

      <Dialog open={deleteCandidateId !== null} onOpenChange={(open) => !open && setDeleteCandidateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除對話</DialogTitle>
            <DialogDescription>
              確定要刪除「{deleteCandidateThread?.title}」嗎？此對話的訊息紀錄將從本次工作階段移除，且無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCandidateId(null)}>取消</Button>
            <Button variant="destructive" onClick={confirmDeleteThread}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

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
      count: mounted ? contextCount : undefined,
      icon: <MessageSquareIcon className="size-4" />,
    },
    {
      id: "files",
      label: "檔案庫",
      description: "系統資源檔案",
      icon: <FileTextIcon className="size-4" />,
    },
    {
      id: "media",
      label: "媒體庫",
      description: "圖片・影片・音樂",
      icon: <ImageIcon className="size-4" />,
    },
    {
      id: "settings",
      label: "同步設定",
      description: "串接與狀態",
      count: mounted ? syncSourceCount : undefined,
      icon: <Settings2Icon className="size-4" />,
    },
    {
      id: "workbench",
      label: "AI 工作台",
      description: "workflow 表格",
      count: mounted ? reviewCount : undefined,
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
  connectorsState,
  setConnectorsState,
  pushToast,
}: {
  formalReadiness: AIInputFormalReadinessContract
  isMockDataEnabled: boolean
  resourceNodesCount: number
  connectorsState: ExtendedSourceConnectorRow[]
  setConnectorsState: React.Dispatch<React.SetStateAction<ExtendedSourceConnectorRow[]>>
  pushToast: (msg: string) => void
}) {
  const [selectedConnectorId, setSelectedConnectorId] = React.useState<string | null>(null)
  const [drawerTab, setDrawerTab] = React.useState<"sync" | "nodes" | "routing" | "approval" | "governance">("sync")
  const selectedConnector = React.useMemo(() => {
    if (!selectedConnectorId) return null
    const mockMatch = connectorsState.find((c) => c.id === selectedConnectorId)
    if (mockMatch) return mockMatch
    const formalRow = formalReadiness.sourceControlMatrix.rows.find((r) => r.id === selectedConnectorId)
    if (formalRow) {
      const baseMock = connectorsState.find(m => m.provider === formalRow.provider) || connectorsState[0]
      return {
        ...baseMock,
        id: formalRow.id,
        source: formalRow.source,
        provider: formalRow.provider,
        connectorType: formalRow.connectorType,
        connectionStatus: formalRow.connectionStatus,
        syncStatus: formalRow.syncStatus,
        riskPolicy: formalRow.riskLabel,
        reviewRule: formalRow.reviewRule,
      } as ExtendedSourceConnectorRow
    }
    return null
  }, [selectedConnectorId, connectorsState, formalReadiness])
  const [formData, setFormData] = React.useState<ExtendedSourceConnectorRow | null>(null)

  React.useEffect(() => {
    if (selectedConnector) {
      setFormData(JSON.parse(JSON.stringify(selectedConnector))) // Deep copy to prevent side-effects on active row
    } else {
      setFormData(null)
    }
  }, [selectedConnectorId, selectedConnector])

  const connectors = isMockDataEnabled ? connectorsState : []
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

  const unifiedRows = isMockDataEnabled
    ? connectorsState.map((connector) => {
        const riskColor =
          connector.riskPolicy === "高"
            ? "text-red-600 dark:text-red-400"
            : connector.riskPolicy === "中"
            ? "text-amber-600 dark:text-amber-400"
            : "text-emerald-600 dark:text-emerald-400"
        return {
          id: connector.id,
          source: connector.source,
          provider: connector.provider,
          connectorType: connector.connectorType,
          riskLabel: connector.riskPolicy,
          riskColor,
          reviewRule: connector.reviewRule,
          cadence: connector.cadence,
          lastSync: connector.lastSync,
          nextSync: connector.nextSync,
          defaultModule: connector.defaultModule,
          connectionStatus: connector.connectionStatus,
          syncStatus: connector.syncStatus,
          missingPermissions: connector.missingPermissions,
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
        }
      })

  return (
    <div className="space-y-6 pb-8">
      {/* Simplified Compact Header with Boundaries Tooltip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-1.5">
            外部資料源同步設定
            <span 
              className="group relative cursor-help inline-flex items-center justify-center size-4 rounded-full bg-muted text-[10px] text-muted-foreground hover:bg-muted-hover hover:text-foreground font-semibold"
              title="【管理邊界說明】&#10;• 這裡管理：外部來源串接狀態、授權範圍、同步頻率排程、健康度、風險與 AI 審批政策。&#10;• 這裡不執行：直接寫入資料庫或覆寫外部來源檔案。"
            >
              i
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">管理並監控 LINE、Google Drive、Docs、RSS、Telegram、Gmail、GitHub 等管道的串接排程與 AI 處理邊界。</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1 text-foreground/80 font-medium">
            已串接 <strong className="text-foreground">{connectedCount}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1 text-foreground/80 font-medium">
            待設定 <strong className="text-foreground">{setupCount}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200/50 bg-amber-50/20 px-2.5 py-1 text-amber-700 font-medium dark:text-amber-400">
            需確認 <strong className="text-amber-600 dark:text-amber-500">{reviewCount}</strong>
          </span>
        </div>
      </div>

      {/* Unified Settings & Sync Management Dashboard */}
      <WorkbenchTable
        columns={["來源管道", "類型", "風險與審核", "頻率排程", "上次/下次同步", "目標模組", "狀態", "操作"]}
        description="管理所有資料來源的串接狀態、同步頻率排程、AI 分析管道與人工審核邊界政策。"
        gridClassName="grid-cols-[minmax(180px,1.2fr)_110px_120px_110px_140px_110px_100px_80px]"
        title="來源設定與同步管理面板"
      >
        {unifiedRows.length > 0 ? (
          unifiedRows.map((row) => {
            const translatedProviderType: Record<string, string> = {
              "Manual · Upload": "手動匯入 · 上傳",
              "LINE · Messaging": "LINE · 即時通訊",
              "Google Docs · Document": "Google Docs · 文件",
              "RSS · Feed": "RSS · 訂閱源",
              "Gmail · Email": "Gmail · 電子郵件",
              "GitHub · Repo files": "GitHub · 程式庫檔案",
              "Telegram · Messaging": "Telegram · 即時通訊",
              "Drive · Cloud files": "Drive · 雲端檔案",
              "Drive · Folder files": "Drive · 資料夾檔案",
            }
            const key = `${row.provider} · ${row.connectorType}`
            const typeLabel = translatedProviderType[key] || key

            return (
              <WorkflowTableRow
                key={row.id}
                onClick={() => setSelectedConnectorId(row.id)}
                cells={[
                  <span key="source" className="block min-w-0">
                    <span className="block truncate font-semibold text-foreground">{row.source}</span>
                    {row.missingPermissions && (
                      <span 
                        className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-1 cursor-help"
                        title={`缺少授權權限限制：\n${row.missingPermissions}`}
                      >
                        ⚠️ 缺少授權 (懸停查看)
                      </span>
                    )}
                  </span>,
                  <span key="type" className="text-xs text-muted-foreground">{typeLabel}</span>,
                  <span 
                    key="risk"
                    className="inline-flex items-center gap-1.5 cursor-help" 
                    title={`人工確認規則：\n${row.reviewRule}`}
                  >
                    <span className={cn("size-2 rounded-full", 
                      row.riskLabel === "高" ? "bg-red-500" : row.riskLabel === "中" ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <span className={cn("text-xs font-semibold", row.riskColor)}>{row.riskLabel}風險</span>
                  </span>,
                  <span key="cadence" className="text-xs text-foreground/80">{row.cadence}</span>,
                  <span key="sync-time" className="block min-w-0">
                    <span className="block text-xs text-foreground/85">上次：{row.lastSync}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">下次：{row.nextSync}</span>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedConnectorId(row.id)
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/95 transition-colors shadow-sm"
                  >
                    設定
                  </button>,
                ]}
                gridClassName="grid-cols-[minmax(180px,1.2fr)_110px_120px_110px_140px_110px_100px_80px]"
              />
            )
          })
        ) : (
          <EmptyTableRow message="尚無外部來源連線資料。" />
        )}
      </WorkbenchTable>

      {/* Collapsible Developer Readiness Panel for Formal Mode */}
      {!isMockDataEnabled && (
        <details className="border border-border/50 rounded-lg bg-muted/5 transition-all duration-200">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground select-none flex items-center gap-2">
            <span>⚙️ 開發者準備度與系統邊界資訊 (BFF Readiness Details)</span>
          </summary>
          <div className="p-4 border-t border-border/50 space-y-6 bg-background">
            <FormalReadinessContractPanel
              contract={formalReadiness}
              description="正式模式的 server-only readiness contract。它列出目前可以安全顯示的狀態、被刻意禁止的 runtime 行為，以及 DATTR-024 之前不能跨過的 persistence gate。"
              title="正式資料 BFF readiness"
            />
            <FormalSourceWorkflowReadModelTable contract={formalReadiness} />
            <FormalSourceWorkflowProofBootstrapPanel contract={formalReadiness} />
            <FormalSourceWorkflowGateMatrixTable contract={formalReadiness} />
          </div>
        </details>
      )}

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

      {/* Settings Drawer */}
      <AnimatePresence>
        {selectedConnectorId && selectedConnector && formData && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedConnectorId(null)}
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
                  <h3 className="text-base font-semibold text-foreground">{formData.source}</h3>
                  <p className="text-xs text-muted-foreground">{formData.provider} · {formData.connectorType}</p>
                </div>
                <button
                  onClick={() => setSelectedConnectorId(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <span className="text-xl font-light">&times;</span>
                </button>
              </div>

              {/* Tabs Nav */}
              <div className="flex border-b border-border/60 px-4 bg-muted/10 text-xs font-medium scrollbar-none overflow-x-auto">
                {(["sync", "nodes", "routing", "approval", "governance"] as const).map((tab) => {
                  const labels = {
                    sync: "同步與分析",
                    nodes: "思考節點",
                    routing: "資料路由",
                    approval: "風險審批",
                    governance: "治理隱私"
                  }
                  return (
                    <button
                      key={tab}
                      onClick={() => setDrawerTab(tab)}
                      className={cn(
                        "px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
                        drawerTab === tab
                          ? "border-primary text-foreground font-semibold"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {labels[tab]}
                    </button>
                  )
                })}
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">
                {drawerTab === "sync" && (
                  <div className="space-y-5">
                    {/* Sync Section */}
                    <div className="border border-border/60 rounded-lg p-4 bg-muted/10 space-y-4">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <ZapIcon className="size-3.5 text-amber-500" />
                        外部同步政策
                      </h4>
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-muted-foreground">啟用排程自動同步</label>
                        <input
                          type="checkbox"
                          checked={formData.syncEnabled}
                          onChange={(e) => setFormData({ ...formData, syncEnabled: e.target.checked })}
                          className="rounded border-border/60 text-primary focus:ring-primary size-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground block">同步觸發模式</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="syncMode"
                              checked={formData.syncMode === "manual_only"}
                              onChange={() => setFormData({ ...formData, syncMode: "manual_only", syncSchedule: null })}
                            />
                            僅限手動
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="syncMode"
                              checked={formData.syncMode === "manual_and_scheduled"}
                              onChange={() => setFormData({ ...formData, syncMode: "manual_and_scheduled", syncSchedule: "0 8 * * *" })}
                            />
                            手動與排程
                          </label>
                        </div>
                      </div>
                      {formData.syncMode === "manual_and_scheduled" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground block">自動同步頻率 (Cron String)</label>
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
                        AI Ingestion 分析政策
                      </h4>
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-muted-foreground">啟用自動 AI 分析</label>
                        <input
                          type="checkbox"
                          checked={formData.analysisEnabled}
                          onChange={(e) => setFormData({ ...formData, analysisEnabled: e.target.checked })}
                          className="rounded border-border/60 text-primary focus:ring-primary size-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground block">分析觸發模式</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="analysisMode"
                              checked={formData.analysisMode === "manual_only"}
                              onChange={() => setFormData({ ...formData, analysisMode: "manual_only", analysisSchedule: null })}
                            />
                            僅限手動
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-foreground/80 cursor-pointer">
                            <input
                              type="radio"
                              name="analysisMode"
                              checked={formData.analysisMode === "manual_and_scheduled"}
                              onChange={() => setFormData({ ...formData, analysisMode: "manual_and_scheduled", analysisSchedule: "0 9 * * *" })}
                            />
                            手動與排程
                          </label>
                        </div>
                      </div>
                      {formData.analysisMode === "manual_and_scheduled" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground block">自動分析頻率 (Cron String)</label>
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
                        <label className="text-muted-foreground">僅在有未處理的 Sync Batch 時分析</label>
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
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-xs text-muted-foreground">調整 Ingestion 代理人的分析思緒節點與自訂提示詞</span>
                    </div>
                    <div className="space-y-3">
                      {formData.thinkingNodes
                        ?.sort((a, b) => a.order - b.order)
                        .map((node, index) => {
                          const nodeLabel: Record<string, string> = {
                            source_context: "來源脈絡判斷",
                            classify_information: "資訊主題分類",
                            extract_entity: "關係人與實體抽取",
                            extract_commitment: "承諾事項與交付物",
                            detect_task_candidate: "行動任務候選識別",
                            detect_risk: "潛在執行風險識別",
                            draft_inbox_items: "Inbox 提案封裝起草",
                          }
                          return (
                            <div key={node.id} className="border border-border/60 rounded-lg p-3 bg-muted/5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {/* Reordering buttons instead of complex drag */}
                                  <div className="flex flex-col gap-0.5">
                                    <button
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
                                      title="上移"
                                    >
                                      ▲
                                    </button>
                                    <button
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
                                      title="下移"
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
                                  placeholder="請輸入給此分析節點的客製化引導指令..."
                                />
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {drawerTab === "routing" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">預設發布模組 (Default Module)</label>
                      <select
                        value={formData.defaultModule}
                        onChange={(e) => setFormData({ ...formData, defaultModule: e.target.value })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="工作">工作 (Work)</option>
                        <option value="研究">研究 (Research)</option>
                        <option value="商會">商會 (Chamber/CRM)</option>
                        <option value="生活">生活 (Life)</option>
                        <option value="財務">財務 (Finance)</option>
                        <option value="公司">公司 (Company Strategy)</option>
                        <option value="依 AI triage">依 AI 自動判斷 (Triage)</option>
                      </select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-semibold text-foreground block">授權寫入目標模組 (Allowed Target Modules)</label>
                      <div className="border border-border/60 rounded-lg p-3 bg-muted/10 space-y-2.5">
                        {[
                          { id: "work", label: "工作模組 (Work)" },
                          { id: "research", label: "研究模組 (Research)" },
                          { id: "chamber", label: "商會模組 (Chamber)" },
                          { id: "life", label: "生活模組 (Life)" },
                          { id: "finance", label: "財務模組 (Finance - 高風險)" },
                          { id: "company", label: "公司策略模組 (Company - 高風險)" },
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
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">風險等級設定</label>
                      <select
                        value={formData.riskClassification}
                        onChange={(e) => setFormData({ ...formData, riskClassification: e.target.value as SourceRiskClassification })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="low">低風險 (Low)</option>
                        <option value="medium">中風險 (Medium)</option>
                        <option value="high">高風險 (High)</option>
                      </select>
                      <span className="text-[10px] text-muted-foreground block">風險等級會影響 AI Ingestion 提案的預設審查優先級與去識別化觸發條件。</span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">行動提案審批政策 (Approval Level)</label>
                      <select
                        value={formData.approvalLevel}
                        onChange={(e) => setFormData({ ...formData, approvalLevel: e.target.value as SourceApprovalLevel })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="always_require">所有提案均需人工確認 (Always Require)</option>
                        <option value="auto_execute_low_risk">低風險提案自動執行，中高風險需確認</option>
                        <option value="full_automation">完全自動化執行 (Full Automation - 限極低風險)</option>
                      </select>
                    </div>

                    <div className="border border-border/60 rounded-lg p-4 bg-muted/10 space-y-3">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Settings2Icon className="size-3.5 text-muted-foreground" />
                        早安簡報通知設定
                      </h4>
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-muted-foreground">將同步異常與決策項目匯入早安簡報</label>
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">資料保存期限 (Retention Policy)</label>
                      <select
                        value={formData.retentionDays}
                        onChange={(e) => setFormData({ ...formData, retentionDays: parseInt(e.target.value) })}
                        className="w-full text-xs bg-muted/30 border border-border/60 rounded-md px-3 py-2 text-foreground focus:outline-none focus:border-border/80"
                      >
                        <option value="30">保存 30 天後自動刪除/封存</option>
                        <option value="90">保存 90 天後自動刪除/封存</option>
                        <option value="0">永久保存 (Infinite)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-xs border border-border/60 rounded-lg p-4 bg-muted/10">
                      <div>
                        <label className="font-semibold text-foreground block">去識別化敏感資訊 (PII Masking)</label>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">自動遮蔽分析過程中的人名、電話、Email 等隱私資訊</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.piiMaskingEnabled}
                        onChange={(e) => setFormData({ ...formData, piiMaskingEnabled: e.target.checked })}
                        className="rounded border-border/60 text-primary focus:ring-primary size-4"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">本機手動上傳預設目錄 (Upload Path)</label>
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
                    pushToast(`[儲存成功]: 已儲存 ${formData.source} 的同步與處理設定。`)
                    setSelectedConnectorId(null)
                  }}
                  className="flex-1 bg-primary text-primary-foreground text-xs h-9 rounded-lg hover:bg-primary/95"
                >
                  儲存設定
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedConnectorId(null)}
                  className="flex-1 border-border/60 text-foreground hover:bg-muted text-xs h-9 rounded-lg"
                >
                  取消
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
