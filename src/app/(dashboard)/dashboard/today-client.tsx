"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  InboxIcon,
  InfoIcon,
  LockIcon,
  MessageSquareIcon,
  SendIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DetailDrawer } from "@/components/owneros/detail-drawer"
import { InsightRail } from "@/components/owneros/insight-rail"
import { INITIAL_TODAY_PROPOSAL_ACTION_STATE } from "@/lib/contracts/today-proposal.contract"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { cn } from "@/lib/utils"
import type {
  AdminReadinessTone,
  DailyCommandCenterLane,
} from "@/lib/services/admin-readiness.service"
import { createTodayProposalDraft } from "./actions"

type TodayActionQueueItem = {
  id: string
  lane: DailyCommandCenterLane
  title: string
  status: string
  signal: string
  nextAction: string
  href: string
  hrefLabel: string
  tone: AdminReadinessTone
}

type TodaySummary = {
  actionCount: number
  blockedCount: number
  warningCount: number
  primaryAction: string
}

type TodayClientProps = {
  generatedAt: string
  summary: TodaySummary
  actionQueue: TodayActionQueueItem[]
}

const laneLabels: Record<DailyCommandCenterLane, { zh: string; en: string }> = {
  proof: { zh: "系統檢查", en: "System check" },
  operate: { zh: "工作", en: "Work" },
  capture: { zh: "擷取", en: "Capture" },
  agent: { zh: "AI 提案", en: "AI proposal" },
  admin: { zh: "管理", en: "Admin" },
  real_data: { zh: "資料", en: "Data" },
}

function statusVariant(tone: AdminReadinessTone) {
  if (tone === "good") return "secondary" as const
  if (tone === "blocked") return "destructive" as const
  return "outline" as const
}

function statusIcon(tone: AdminReadinessTone) {
  if (tone === "good") return <CheckCircle2Icon className="size-4 text-emerald-600" />
  if (tone === "blocked") return <AlertTriangleIcon className="size-4 text-red-600" />
  return <ClockIcon className="size-4 text-amber-600" />
}

function formatGeneratedAt(value: string, locale: "zh-TW" | "en-US") {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function productActionTitle(title: string, locale: "zh-TW" | "en-US") {
  if (locale === "en-US") return title

  const map: Record<string, string> = {
    "Prove real owner sign-in": "確認正式登入狀態",
    "Run the Work refresh proof when a disposable DB target exists": "工作資料同步檢查",
    "Capture and triage source material through the formal AI Input surface": "整理新來源與待審核內容",
    "Prepare agent commands through owner-only dry-run boundaries": "檢查 AI 指令草稿",
    "Review launch blockers and latest evidence": "查看系統阻塞",
    "Convert scenario gaps into one real-data path at a time": "補齊真實資料路徑",
  }

  return map[title] ?? title
}

function productStatus(status: string, locale: "zh-TW" | "en-US") {
  if (locale === "en-US") return status.replace(/_/g, " ")

  const map: Record<string, string> = {
    blocked: "待處理",
    "target needed": "需要設定",
    formal: "正式面板",
    "internal only": "內部",
    "matrix gate": "規劃中",
  }

  return map[status] ?? status.replace(/_/g, " ")
}

function productNextStep(actionId: string, fallback: string, locale: "zh-TW" | "en-US") {
  const zh: Record<string, string> = {
    "auth-owner-proof": "登入與身分檢查需要到系統就緒頁確認。",
    "work-refresh-proof": "工作資料同步仍需要安全測試目標後再執行。",
    "ai-input-capture": "請到 AI 工作桌審核新來源、分類與待處理內容。",
    "agent-command-readiness": "AI 指令目前只允許 dry-run 與提案審核。",
    "admin-evidence-review": "詳細系統阻塞與人工檢查請到管理頁查看。",
    "real-data-migration": "真實資料路徑會逐一補齊，先維持高風險模組提案模式。",
  }
  const en: Record<string, string> = {
    "auth-owner-proof": "Confirm sign-in and identity readiness from System readiness.",
    "work-refresh-proof": "Work data proof still needs a safe disposable target.",
    "ai-input-capture": "Review new sources, classifications, and pending work in AI Workbench.",
    "agent-command-readiness": "AI commands remain dry-run and proposal-only for now.",
    "admin-evidence-review": "Open Admin for detailed blockers and manual checks.",
    "real-data-migration": "Real-data paths will mature one at a time while high-risk modules stay proposal-only.",
  }

  return (locale === "en-US" ? en[actionId] : zh[actionId]) ?? fallback.replace(/[A-Z]+-[0-9]{3}[A-Z]?/g, "system check")
}

export function TodayClient({
  generatedAt,
  summary,
  actionQueue,
}: TodayClientProps) {
  const { locale } = useProductLanguage()
  const [comment, setComment] = React.useState("")
  const [proposalState, proposalAction, proposalPending] = React.useActionState(
    createTodayProposalDraft,
    INITIAL_TODAY_PROPOSAL_ACTION_STATE
  )
  const isEnglish = locale === "en-US"
  const primaryActions = actionQueue.slice(0, 4)
  const reviewCount = summary.blockedCount + summary.warningCount
  const proposal = proposalState.proposal

  React.useEffect(() => {
    if (proposalState.status === "success") {
      setComment("")
    }
  }, [proposalState.status])

  const boundaryDrawer = (
    <DetailDrawer
      title={isEnglish ? "Boundaries" : "操作邊界"}
      trigger={
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-3.5" />
          {isEnglish ? "Boundaries" : "操作邊界"}
        </Button>
      }
    >
      <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
        <p>{isEnglish ? "Core AI is proposal-only until runtime action approval is granted." : "總 AI 在核准前只建立提案，不自動執行 API 或 TODO 寫入。"}</p>
        <p>{isEnglish ? "Public output, provider calls, permission changes, Finance and Life writes stay blocked." : "公開輸出、provider 呼叫、權限變更、Finance/Life 寫入都保持封鎖。"}</p>
        <p className="rounded-md bg-muted/50 px-2 py-2">
          {isEnglish
            ? "Manual setup and proof details stay in Admin so Today can remain a daily operating surface."
            : "人工設定與證據細節保留在管理頁，今日頁只顯示日常操作需要知道的狀態。"}
        </p>
        <Button variant="outline" size="sm" className="w-fit" render={<Link href="/admin/system-readiness" />}>
          <LockIcon className="size-3.5" />
          {isEnglish ? "System readiness" : "系統就緒"}
        </Button>
      </div>
    </DetailDrawer>
  )

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
        <section className="rounded-lg border bg-background" data-owneros-ui="today-daily-loop">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col justify-center gap-3 border-b px-4 py-4 lg:border-b-0 lg:border-r">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {isEnglish ? `${summary.actionCount} things to look at today` : `${summary.actionCount} 件事需要你看`}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEnglish ? `Updated ${formatGeneratedAt(generatedAt, locale)}` : `更新於 ${formatGeneratedAt(generatedAt, locale)}`}
                </p>
              </div>
              <InsightRail
                className="grid-cols-3 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
                items={[
                  { label: isEnglish ? "Queue" : "今日佇列", value: summary.actionCount },
                  { label: isEnglish ? "Needs review" : "需要留意", value: reviewCount, tone: reviewCount > 0 ? "warn" : "default" },
                  { label: isEnglish ? "Mode" : "模式", value: isEnglish ? "Proposal" : "提案" },
                ]}
              />
              {boundaryDrawer}
            </div>

            <form action={proposalAction} className="grid gap-2.5 p-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{isEnglish ? "Tell Core AI what changed" : "回饋總 AI"}</h2>
              </div>
              <input type="hidden" name="locale" value={locale} />
              <Textarea
                name="comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                aria-invalid={proposalState.status === "validation_error"}
                placeholder={
                  isEnglish
                    ? "Example: Prioritize Lisa first, then turn the research note into a Work draft."
                    : "例：今天先處理 Lisa，然後把研究筆記整理成工作草稿。"
                }
              />
              <div className="flex flex-wrap gap-1.5">
                {(isEnglish
                  ? ["Prioritize today", "Project update", "Meeting notes", "Analyze sources"]
                  : ["整理今日優先序", "專案更新", "會議紀錄", "分析資訊"]
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setComment((current) => (current ? `${current}\n${preset}` : preset))}
                    className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {proposalState.message && (
                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    proposalState.status === "success" ? "text-emerald-700" : "text-muted-foreground"
                  )}
                  aria-live="polite"
                >
                  {proposalState.message}
                </p>
              )}
              {proposalState.fieldErrors?.comment?.map((error) => (
                <p key={error} className="text-xs leading-relaxed text-destructive" aria-live="polite">
                  {error}
                </p>
              ))}
              <Button type="submit" size="sm" disabled={!comment.trim() || proposalPending}>
                <SendIcon className="size-3.5" />
                {proposalPending
                  ? isEnglish
                    ? "Creating..."
                    : "建立中..."
                  : isEnglish
                    ? "Create proposal draft"
                    : "產生今日建議"}
              </Button>
            </form>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-lg border bg-background">
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <InboxIcon className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{isEnglish ? "Waiting on you" : "待確認"}</h2>
            </div>

            <div className="divide-y">
              {primaryActions.slice(0, 3).map((action, index) => (
                <div key={action.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{productActionTitle(action.title, locale)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {productNextStep(action.id, action.nextAction, locale)}
                    </p>
                  </div>
                  {statusIcon(action.tone)}
                  <DetailDrawer
                    title={productActionTitle(action.title, locale)}
                    trigger={<Button variant="ghost" size="icon-sm" className="shrink-0" aria-label={isEnglish ? "Detail" : "詳細"}><InfoIcon className="size-3.5" /></Button>}
                  >
                    <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">{isEnglish ? laneLabels[action.lane].en : laneLabels[action.lane].zh}</span>
                        {" · "}
                        {productStatus(action.status, locale)}
                      </p>
                      <p>{action.signal}</p>
                      <p>{productNextStep(action.id, action.nextAction, locale)}</p>
                    </div>
                  </DetailDrawer>
                  <Button variant="outline" size="sm" className="w-fit shrink-0" render={<Link href={action.href} />}>
                    {isEnglish ? action.hrefLabel : "前往"}
                    <ArrowRightIcon className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageSquareIcon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{isEnglish ? "AI summary" : "AI 摘要"}</h2>
              </div>
              {proposal && (
                <DetailDrawer
                  title={proposal.title}
                  trigger={<Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground"><InfoIcon className="size-3.5" />{isEnglish ? "Detail" : "詳細"}</Button>}
                >
                  <div className="grid gap-3 text-sm">
                    <p className="text-xs leading-relaxed text-muted-foreground">{proposal.summary}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{isEnglish ? "Owner review required" : "需要 owner 審核"}</Badge>
                      <Badge variant="outline">
                        {proposal.governance.providerCallEnabled ? (isEnglish ? "Provider enabled" : "已啟用 provider") : (isEnglish ? "No provider call" : "不呼叫 provider")}
                      </Badge>
                      <Badge variant="outline">
                        {proposal.governance.databaseWriteEnabled ? (isEnglish ? "DB write" : "資料庫寫入") : (isEnglish ? "No DB write" : "不寫入資料庫")}
                      </Badge>
                    </div>
                    <p className="rounded-md bg-muted/50 px-2 py-2 text-xs text-muted-foreground">
                      {isEnglish ? "Created at" : "建立時間"} {formatGeneratedAt(proposal.createdAt, locale)}
                      {" · "}
                      {isEnglish ? "Source length" : "來源長度"} {proposal.source.characterCount}
                    </p>
                    <p className="rounded-md bg-muted/50 px-2 py-2 text-xs text-muted-foreground">
                      {isEnglish ? "Audit preview" : "稽核預覽"}: {proposal.auditPreview.action} {"->"} {proposal.auditPreview.result}
                    </p>
                  </div>
                </DetailDrawer>
              )}
            </div>

            <div className="grid gap-3 p-4 text-sm">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {proposal
                  ? proposal.summary
                  : isEnglish
                    ? "Write an owner comment on the left to get a proposal draft."
                    : "在左邊留言，AI 會建立提案草稿。"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" render={<Link href="/ai-input" />}>
                  <SparklesIcon className="size-3.5" />
                  {isEnglish ? "AI Workbench" : "到 AI 工作桌審核"}
                </Button>
                <Button variant="outline" size="sm" render={<Link href="/inbox" />}>
                  <InboxIcon className="size-3.5" />
                  {isEnglish ? "Inbox" : "收件匣"}
                </Button>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
