"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { notFound } from "next/navigation"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  EyeIcon,
  StickyNoteIcon,
  PackageIcon,
  RefreshCwIcon,
  BotIcon,
  ShieldCheckIcon,
  ListIcon,
  FileClockIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { AppHeader } from "@/components/layout/app-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectPulseSection } from "@/components/ai/project-pulse-section"
import { PulseSourceMetaDisplay } from "@/components/work/pulse/pulse-source-meta"
import { TaskList } from "@/components/work/task/task-list"
import { NoteTimeline } from "@/components/work/note/note-timeline"
import { DeliverableTree } from "@/components/work/deliverable/deliverable-tree"
import { ShareLinkButton } from "@/components/work/share/share-link-button"

import { Project, ProjectTask, ProjectNote, ProjectDeliverable, ProjectTimeline, PulseSourceMeta } from "@/types/work"
import { useResearch } from "@/lib/context/research-context"
import type { MockProject, AICard, PublicOutput } from "@/types/ai"

// ─── Phase labels ─────────────────────────────────────────────────────────────

const phaseLabels: Record<string, string> = {
  discovery: "探索", planning: "規劃", execution: "執行",
  review: "審稿", maintenance: "維護",
}

const healthConfig = {
  good: { label: "健康", className: "border-emerald-300/60 text-emerald-700 dark:text-emerald-400" },
  watch: { label: "需留意", className: "border-amber-300/60 text-amber-700 dark:text-amber-400" },
  risk: { label: "風險", className: "border-destructive/40 text-destructive" },
}

function WorkAdjunctPrototypeBoundary({
  hasPulse,
  hasTimeline,
  hasPublicOutput,
  hasSourceMeta,
}: {
  hasPulse: boolean
  hasTimeline: boolean
  hasPublicOutput: boolean
  hasSourceMeta: boolean
}) {
  const adjunctSignals = [
    hasPulse ? "AI 脈搏" : null,
    hasTimeline ? "階段時間軸" : null,
    hasPublicOutput ? "客戶草稿" : null,
    hasSourceMeta ? "來源摘要" : null,
  ].filter(Boolean)

  return (
    <div
      data-work-boundary="WORK-015-ADJUNCT-MOCK-GATE"
      className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex flex-wrap items-center gap-2">
        <BotIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">AI 輔助層 · Prototype</span>
        <Badge variant="outline" className="border-amber-300/70 bg-background/70 text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-200">
          非正式 Work 證據
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/75">
        正式 Work 資料以任務、紀錄與交付物為準；此區只呈現 AI 輔助判讀與提案草稿，不會自動寫入資料庫或代表持久化 proof。
      </p>
      {adjunctSignals.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {adjunctSignals.map((signal) => (
            <Badge key={signal} variant="outline" className="border-amber-300/60 bg-background/60 text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-200">
              {signal}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkFormalDataBoundary() {
  return (
    <div
      data-work-boundary="WORK-015-FORMAL-CRUD-ONLY"
      className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-100"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheckIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">正式 Work 資料</span>
        <Badge variant="outline" className="border-emerald-300/70 bg-background/70 text-[10px] text-emerald-700 dark:border-emerald-800 dark:text-emerald-200">
          DB-backed
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-100/75">
        任務、紀錄與交付物走 Work action/service 授權路徑；AI 階段時間軸保留在脈搏層，不用來排序正式紀錄。
      </p>
    </div>
  )
}

function ClientPortalPublishBoundary({
  project,
  clientTaskCount,
  clientDeliverableCount,
  hasDraft,
}: {
  project: Project
  clientTaskCount: number
  clientDeliverableCount: number
  hasDraft: boolean
}) {
  const shareReady = project.visibility === "client_shared" && Boolean(project.clientToken)

  return (
    <div
      data-work-boundary="WORK-016-CLIENT-PORTAL-PUBLISH-GATE"
      className="rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/25 dark:text-sky-100"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheckIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">Client Portal 發布閘門</span>
        <Badge variant="outline" className="border-sky-300/70 bg-background/70 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {shareReady ? "可複製入口" : "尚未發布"}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-sky-900/80 dark:text-sky-100/75">
        對外內容只以已標記 client_visible 的任務與交付物為準；AI 客戶更新草稿是提案，不會自動發布到 `/client/[token]`。
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {project.visibility === "client_shared" ? "專案分享開啟" : "專案內部模式"}
        </Badge>
        <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {project.clientToken ? "token 已存在" : "尚無 token"}
        </Badge>
        <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {clientTaskCount} 任務 / {clientDeliverableCount} 交付物
        </Badge>
        {hasDraft && (
          <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
            草稿需人工確認
          </Badge>
        )}
      </div>
    </div>
  )
}

type ClientShareReviewState = "pass" | "warn" | "blocked"

type ClientShareReviewRow = {
  id: string
  boundary: string
  label: string
  detail: string
  action: string
  state: ClientShareReviewState
}

const clientShareReviewConfig: Record<
  ClientShareReviewState,
  {
    label: string
    className: string
    iconClassName: string
    badgeClassName: string
    icon: React.ElementType
  }
> = {
  pass: {
    label: "Pass",
    className: "border-emerald-200 bg-emerald-50/60 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:text-emerald-100",
    iconClassName: "text-emerald-600 dark:text-emerald-300",
    badgeClassName: "border-emerald-300/70 text-emerald-700 dark:border-emerald-800 dark:text-emerald-200",
    icon: CheckCircle2Icon,
  },
  warn: {
    label: "Review",
    className: "border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/20 dark:text-amber-100",
    iconClassName: "text-amber-600 dark:text-amber-300",
    badgeClassName: "border-amber-300/70 text-amber-700 dark:border-amber-800 dark:text-amber-200",
    icon: AlertTriangleIcon,
  },
  blocked: {
    label: "Blocked",
    className: "border-border bg-muted/30 text-foreground",
    iconClassName: "text-muted-foreground",
    badgeClassName: "border-border text-muted-foreground",
    icon: ShieldCheckIcon,
  },
}

function ClientShareReviewChecklist({
  project,
  clientTaskCount,
  clientDeliverableCount,
  publicOutput,
}: {
  project: Project
  clientTaskCount: number
  clientDeliverableCount: number
  publicOutput: PublicOutput | null
}) {
  const shareReady = project.visibility === "client_shared" && Boolean(project.clientToken)
  const hasClientVisibleRecords = clientTaskCount + clientDeliverableCount > 0
  const hasConfirmedClientDraft = publicOutput?.status === "confirmed"
  const hasUnconfirmedClientDraft = Boolean(publicOutput) && !hasConfirmedClientDraft
  const nextActionState: ClientShareReviewState =
    !shareReady ? "blocked" : !hasClientVisibleRecords || hasUnconfirmedClientDraft ? "warn" : "pass"

  const rows: ClientShareReviewRow[] = [
    {
      id: "visibility",
      boundary: "WORK-017-CHECKLIST-ROW-VISIBILITY",
      label: "專案可見性",
      detail: project.visibility === "client_shared" ? "Client sharing 已開啟。" : "目前仍是內部模式。",
      action: project.visibility === "client_shared" ? "保留分享狀態，繼續檢查 token 與內容。" : "先在受保護的 owner 流程確認分享意圖。",
      state: project.visibility === "client_shared" ? "pass" : "blocked",
    },
    {
      id: "token",
      boundary: "WORK-017-CHECKLIST-ROW-TOKEN",
      label: "Token 狀態",
      detail: project.clientToken ? "專案已有 Client Portal token。" : "尚未設定 Client Portal token。",
      action: project.clientToken ? "可進入下一步；token rotate/revoke 仍屬後續高風險任務。" : "不要建立公開入口；等待 token lifecycle 任務或 owner setup。",
      state: project.clientToken ? "pass" : "blocked",
    },
    {
      id: "client-visible-records",
      boundary: "WORK-017-CHECKLIST-ROW-CLIENT-VISIBLE-RECORDS",
      label: "客戶可見內容",
      detail: `${clientTaskCount} 個任務、${clientDeliverableCount} 個交付物會進入 client-visible review。`,
      action: hasClientVisibleRecords ? "逐項確認內容是否能對外。" : "先標記至少一個可分享的任務或交付物，或明確接受空白入口。",
      state: hasClientVisibleRecords ? "pass" : "warn",
    },
    {
      id: "ai-draft",
      boundary: "WORK-017-CHECKLIST-ROW-AI-DRAFT",
      label: "AI 客戶草稿",
      detail: publicOutput
        ? hasConfirmedClientDraft
          ? "有已確認草稿；仍不是自動公開內容。"
          : "有待確認草稿；不可視為已發布。"
        : "目前沒有 AI 客戶更新草稿。",
      action: publicOutput ? "只作為人工審閱素材，不進入 token-only public output。" : "無草稿可審；以 client-visible 記錄為準。",
      state: publicOutput ? "warn" : "pass",
    },
    {
      id: "next-action",
      boundary: "WORK-017-CHECKLIST-ROW-NEXT-ACTION",
      label: "下一步",
      detail: shareReady ? "分享入口條件成立，但仍需依本清單完成人工 review。" : "分享入口條件尚未成立。",
      action:
        nextActionState === "pass"
          ? "可複製連結並進行 owner-run visual check。"
          : nextActionState === "warn"
            ? "先處理 review 警示，再決定是否複製連結。"
            : "不要複製或交付公開入口。",
      state: nextActionState,
    },
  ]

  return (
    <section
      data-work-boundary="WORK-017-CLIENT-SHARE-REVIEW-CHECKLIST"
      className="rounded-lg border border-border bg-background px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <FileClockIcon className="size-4 shrink-0 text-muted-foreground" />
        <h3 className="text-sm font-semibold">發布前檢查</h3>
        <Badge variant="outline" className="text-[10px]">
          Protected owner review
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => {
          const config = clientShareReviewConfig[row.state]
          const Icon = config.icon

          return (
            <div
              key={row.id}
              data-work-boundary={row.boundary}
              className={cn("rounded-lg border px-3 py-2.5", config.className)}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", config.iconClassName)} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold">{row.label}</p>
                      <Badge variant="outline" className={cn("text-[10px]", config.badgeClassName)}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed opacity-85">{row.detail}</p>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground sm:w-48">{row.action}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Quick stat button ────────────────────────────────────────────────────────

function QuickStat({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border border-border px-4 py-3 text-center transition-colors",
        onClick ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px]">{label}</span>
      </div>
      <span className="text-lg font-semibold tabular-nums leading-none">{value}</span>
    </button>
  )
}

// ─── Client Tab ───────────────────────────────────────────────────────────────

function ClientTab({
  project,
  clientTasks,
  clientDeliverables,
  publicOutput,
  pulseCard,
}: {
  project: Project
  clientTasks: ProjectTask[]
  clientDeliverables: ProjectDeliverable[]
  publicOutput: PublicOutput | null
  pulseCard: AICard | null
}) {
  if (!project) return null
  const clientPortalShareReady = project.visibility === "client_shared" && Boolean(project.clientToken)

  return (
    <div className="flex flex-col gap-6">
      <ClientPortalPublishBoundary
        project={project}
        clientTaskCount={clientTasks.length}
        clientDeliverableCount={clientDeliverables.length}
        hasDraft={Boolean(publicOutput)}
      />

      <ClientShareReviewChecklist
        project={project}
        clientTaskCount={clientTasks.length}
        clientDeliverableCount={clientDeliverables.length}
        publicOutput={publicOutput}
      />

      {/* Share settings */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">分享設定</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">可見性：</span>
          <Badge variant="outline" className={project.visibility === "client_shared" ? "border-blue-300/60 text-blue-600 dark:text-blue-400" : ""}>
            {project.visibility === "client_shared" ? "客戶分享" : "內部"}
          </Badge>
        </div>
        {clientPortalShareReady ? (
          <ShareLinkButton token={project.clientToken} />
        ) : project.clientToken ? (
          <div
            data-work-boundary="WORK-016-SHARE-LINK-INTERNAL-GATE"
            className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
          >
            token 已存在，但專案目前是內部模式；此處不提供複製入口，避免把尚未發布的 Client Portal 當成正式對外連結。
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60">此專案未設定客戶分享連結</p>
        )}
      </section>

      {/* Client-visible tasks */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <EyeIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">客戶可見任務</h3>
          <span className="text-xs text-muted-foreground">({clientTasks.length})</span>
        </div>
        {clientTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 rounded-lg border border-dashed border-border px-4 py-4 text-center">
            目前沒有客戶可見的任務
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {clientTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <CheckCircle2Icon className={cn("size-4 shrink-0", t.status === "done" ? "text-emerald-500" : "text-muted-foreground/40")} />
                <span className={cn("text-sm flex-1", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {t.status === "done" ? "完成" : t.status === "in_progress" ? "進行中" : "待辦"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Client-visible deliverables */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <PackageIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">客戶可見交付物</h3>
          <span className="text-xs text-muted-foreground">({clientDeliverables.length})</span>
        </div>
        {clientDeliverables.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 rounded-lg border border-dashed border-border px-4 py-4 text-center">
            目前沒有客戶可見的交付物
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {clientDeliverables.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-sm flex-1">{d.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {d.status === "approved" ? "已核准" : d.status === "delivered" ? "已交付" : "草稿"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Boundary notice */}
      <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <p className="font-medium mb-1">以下內容對客戶不可見：</p>
        <ul className="list-disc pl-4 flex flex-col gap-0.5">
          <li>所有 internal 紀錄與 AI 分析</li>
          <li>internal 任務與交付物</li>
          <li>AI 內部判斷（internalInsight）</li>
          <li>任何未明確標記為 client_visible 的內容</li>
        </ul>
      </div>

      {/* Client update */}
      {publicOutput && pulseCard && (
        <section data-work-boundary="WORK-016-CLIENT-DRAFT-PROPOSAL-ONLY" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">客戶更新草稿</h3>
            <Badge variant="outline" className="text-[10px]">
              Proposal
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              不會自動發布
            </Badge>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">
              AI 草稿狀態：{publicOutput.status === "confirmed" ? "已確認草稿" : "待確認草稿"}；正式對外仍以 Client Portal visibility 與人工確認為準。
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{publicOutput.clientSafeContent}</p>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Agent Tab ────────────────────────────────────────────────────────────────

const MOCK_AGENT_PROPOSALS = [
  {
    id: "ap-1",
    type: "任務建議",
    content: "將「客戶簡報草稿」交付物狀態更新為「審核中」",
    confidence: 92,
    status: "pending",
  },
  {
    id: "ap-2",
    type: "風險提示",
    content: "距離截止日期僅剩 3 天，但仍有 2 個任務未完成",
    confidence: 88,
    status: "pending",
  },
]

function AgentTab({ project }: { project: Project }) {
  const [expandBoundary, setExpandBoundary] = React.useState(false)

  return (
    <div className="flex flex-col gap-6">
      {/* Agent status header */}
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <div className="size-2 rounded-full bg-amber-400/80 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-xs font-medium">WorkAgent · 模擬模式</span>
          <span className="text-[11px] text-muted-foreground">需 Supabase 連線 + AUTH-001 完成後啟用</span>
        </div>
        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300/60 shrink-0">
          Mock
        </Badge>
      </div>

      {/* Proposals queue */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ListIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">審閱佇列</h3>
          <span className="text-xs text-muted-foreground">({MOCK_AGENT_PROPOSALS.length} 項待審閱)</span>
        </div>
        <div className="flex flex-col gap-2">
          {MOCK_AGENT_PROPOSALS.map((p) => (
            <div key={p.id} className="rounded-lg border border-border px-3 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                <span className="text-[11px] text-muted-foreground ml-auto">信心度 {p.confidence}%</span>
              </div>
              <p className="text-sm">{p.content}</p>
              <div className="flex items-center gap-2 pt-1">
                <button className="text-[11px] px-2.5 py-1 rounded-md bg-foreground text-background font-medium transition-opacity opacity-60 cursor-not-allowed" disabled>
                  接受
                </button>
                <button className="text-[11px] px-2.5 py-1 rounded-md border border-border text-muted-foreground transition-opacity opacity-60 cursor-not-allowed" disabled>
                  拒絕
                </button>
                <span className="text-[10px] text-muted-foreground/50 ml-1">· 需真實 Agent 上線後操作</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Run log */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FileClockIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">執行記錄</h3>
        </div>
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center flex flex-col gap-1">
          <BotIcon className="size-5 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground/60">尚無 Agent 執行記錄</p>
          <p className="text-[11px] text-muted-foreground/40">WorkAgent 啟用後，所有分析與建議操作將記錄於此</p>
        </div>
      </section>

      {/* Boundary panel */}
      <section className="flex flex-col gap-2">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-left w-full"
          onClick={() => setExpandBoundary((v) => !v)}
        >
          <ShieldCheckIcon className="size-3.5 text-muted-foreground" />
          <span>Agent 邊界設定</span>
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            {expandBoundary ? "收合" : "展開"}
          </span>
        </button>
        {expandBoundary && (
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
            <div>
              <p className="font-medium mb-1">Agent 可執行：</p>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>讀取本專案所有 internal 任務、紀錄、交付物</li>
                <li>根據資料生成分析摘要與建議</li>
                <li>草擬任務狀態更新提案（需人工確認）</li>
                <li>識別風險項目並發出提示</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1 text-destructive/70">Agent 不可執行：</p>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                <li>直接寫入 DB（所有寫入需人工審閱確認）</li>
                <li>讀取 Finance、Life、Company 模組資料</li>
                <li>對外部系統發出任何請求</li>
                <li>修改客戶可見性設定</li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Records Tab ──────────────────────────────────────────────────────────────

type RecordFilter = "all" | "user" | "agent" | "system"

const MOCK_RECORDS: { id: string; type: RecordFilter; actor: string; action: string; ts: string }[] = []

function RecordsTab() {
  const [filter, setFilter] = React.useState<RecordFilter>("all")

  const filtered = filter === "all" ? MOCK_RECORDS : MOCK_RECORDS.filter((r) => r.type === filter)

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 w-fit">
        {(["all", "user", "agent", "system"] as RecordFilter[]).map((f) => {
          const labels: Record<RecordFilter, string> = {
            all: "全部",
            user: "使用者操作",
            agent: "Agent 提案",
            system: "系統事件",
          }
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {labels[f]}
            </button>
          )
        })}
      </div>

      {/* Records table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 flex flex-col items-center gap-2">
          <FileClockIcon className="size-6 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground/60">此專案尚無操作記錄</p>
          <p className="text-[11px] text-muted-foreground/40">
            任務新增、紀錄建立、Agent 建議確認等事件將自動記錄於此
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">時間</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">執行者</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">操作</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">類型</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 text-muted-foreground tabular-nums">{r.ts}</td>
                  <td className="px-3 py-2">{r.actor}</td>
                  <td className="px-3 py-2 flex-1">{r.action}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailClient({
  project,
  initialTasks,
  initialNotes,
  initialDeliverables,
  pulseCard,
  publicOutput,
  pulseMeta,
  timeline,
}: {
  project: Project
  initialTasks: ProjectTask[]
  initialNotes: ProjectNote[]
  initialDeliverables: ProjectDeliverable[]
  pulseCard: AICard | null
  publicOutput: PublicOutput | null
  pulseMeta: PulseSourceMeta | null
  timeline: ProjectTimeline | null
}) {
  const projectId = project.id

  const { ideas } = useResearch()

  const projectTasks = initialTasks
  
  // Bilateral link syncing: convert matching Research Ideas to ProjectNotes format
  const linkedIdeasAsNotes: ProjectNote[] = ideas
    .filter((idea) => idea.linkedProjectId === projectId)
    .map((idea) => ({
      id: idea.id,
      projectId: idea.linkedProjectId!,
      title: `✦ 學術靈感 [${idea.ideaType.toUpperCase()}]: ${idea.title}`,
      body: idea.body,
      source: "internal",
      visibility: "internal",
      origin: "ai",
      isPinned: true,
      createdAt: idea.createdAt,
      updatedAt: idea.createdAt,
    }))

  const projectNotes: ProjectNote[] = [
    ...linkedIdeasAsNotes,
    ...initialNotes,
  ]

  const projectDeliverables = initialDeliverables

  const clientTasks = projectTasks.filter((t) => t.visibility === "client_visible")
  const clientDeliverables = projectDeliverables.filter((d) => d.visibility === "client_visible")

  const [tab, setTab] = React.useState("pulse")

  const daysLeft = project.dueAt
    ? Math.ceil((new Date(project.dueAt).getTime() - Date.now()) / 86400000)
    : null

  // Adapter for ProjectPulseSection which expects MockProject
  const mockProjectCompat: MockProject = {
    id: project.id,
    name: project.name,
    clientName: project.clientName ?? "",
    status: project.status === "archived" ? "completed" : project.status,
    visibility: project.visibility,
    dueDate: project.dueAt,
    description: project.description,
    tasksDone: project.tasksDone,
    tasksTotal: project.tasksTotal,
  }

  const health = healthConfig[project.health]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title={project.name} description={project.clientName} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">

          {/* Project header */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {phaseLabels[project.phase]}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", health.className)}>
                {project.health === "risk" && <AlertTriangleIcon className="size-3 mr-1" />}
                {health.label}
              </Badge>
              {daysLeft !== null && (
                <span className={cn(
                  "flex items-center gap-1 text-xs",
                  daysLeft < 0 ? "text-destructive" : daysLeft <= 3 ? "text-amber-600" : "text-muted-foreground"
                )}>
                  <ClockIcon className="size-3" />
                  {daysLeft < 0 ? `逾期 ${Math.abs(daysLeft)} 天` : daysLeft === 0 ? "今天截止" : `${daysLeft} 天後截止`}
                </span>
              )}
            </div>
          </div>

          {/* Concept tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="pulse" className="text-sm gap-1.5">
                ✦ 脈搏
              </TabsTrigger>
              <TabsTrigger value="work" className="text-sm">
                工作
              </TabsTrigger>
              <TabsTrigger value="client" className="text-sm">
                客戶
              </TabsTrigger>
              <TabsTrigger value="agent" className="text-sm gap-1">
                <BotIcon className="size-3.5" />
                代理人
              </TabsTrigger>
              <TabsTrigger value="records" className="text-sm gap-1">
                <FileClockIcon className="size-3.5" />
                紀錄
              </TabsTrigger>
            </TabsList>

            {/* ── Pulse Tab ── */}
            <TabsContent value="pulse" className="flex flex-col gap-6 pt-4">
              <WorkAdjunctPrototypeBoundary
                hasPulse={Boolean(pulseCard)}
                hasTimeline={Boolean(timeline)}
                hasPublicOutput={Boolean(publicOutput)}
                hasSourceMeta={Boolean(pulseMeta)}
              />

              <ProjectPulseSection
                project={mockProjectCompat}
                pulseCard={pulseCard}
                publicOutput={publicOutput}
                timeline={timeline ?? undefined}
                deliverables={projectDeliverables}
              />

              {pulseMeta && <PulseSourceMetaDisplay meta={pulseMeta} />}

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-2">
                <QuickStat
                  icon={CheckCircle2Icon}
                  label="任務"
                  value={`${project.tasksDone}/${project.tasksTotal}`}
                  onClick={() => setTab("work")}
                />
                <QuickStat
                  icon={StickyNoteIcon}
                  label="紀錄"
                  value={projectNotes.length}
                  onClick={() => setTab("work")}
                />
                <QuickStat
                  icon={PackageIcon}
                  label="交付物"
                  value={projectDeliverables.length}
                  onClick={() => setTab("work")}
                />
                <QuickStat
                  icon={ClockIcon}
                  label="剩餘天數"
                  value={daysLeft !== null ? (daysLeft < 0 ? "逾期" : `${daysLeft}天`) : "—"}
                />
              </div>
            </TabsContent>

            {/* ── Work Tab ── */}
            <TabsContent value="work" className="flex flex-col gap-8 pt-4">
              <WorkFormalDataBoundary />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">任務</h3>
                <TaskList initialTasks={projectTasks} projectId={projectId} />
              </section>

              <div className="border-t" />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">紀錄</h3>
                <NoteTimeline initialNotes={projectNotes} projectId={projectId} />
              </section>

              <div className="border-t" />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">交付物</h3>
                <DeliverableTree initialDeliverables={projectDeliverables} projectId={projectId} />
              </section>
            </TabsContent>

            {/* ── Client Tab ── */}
            <TabsContent value="client" className="pt-4">
              <ClientTab
                project={project}
                clientTasks={clientTasks}
                clientDeliverables={clientDeliverables}
                publicOutput={publicOutput}
                pulseCard={pulseCard}
              />
            </TabsContent>

            {/* ── Agent Tab ── */}
            <TabsContent value="agent" className="pt-4">
              <AgentTab project={project} />
            </TabsContent>

            {/* ── Records Tab ── */}
            <TabsContent value="records" className="pt-4">
              <RecordsTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
