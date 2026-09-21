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
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { MockProject, AICard, PublicOutput } from "@/types/ai"

const healthConfig = {
  good: { className: "border-emerald-300/60 text-emerald-700 dark:text-emerald-400" },
  watch: { className: "border-amber-300/60 text-amber-700 dark:text-amber-400" },
  risk: { className: "border-destructive/40 text-destructive" },
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    template,
  )
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
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail
  const adjunctSignals = [
    hasPulse ? detailCopy.adjunct.signals.pulse : null,
    hasTimeline ? detailCopy.adjunct.signals.timeline : null,
    hasPublicOutput ? detailCopy.adjunct.signals.publicOutput : null,
    hasSourceMeta ? detailCopy.adjunct.signals.sourceMeta : null,
  ].filter(Boolean)

  return (
    <div
      data-work-boundary="WORK-015-ADJUNCT-MOCK-GATE"
      className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <div className="flex flex-wrap items-center gap-2">
        <BotIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">{detailCopy.adjunct.title}</span>
        <Badge variant="outline" className="border-amber-300/70 bg-background/70 text-[10px] text-amber-700 dark:border-amber-800 dark:text-amber-200">
          {detailCopy.adjunct.badge}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/75">
        {detailCopy.adjunct.body}
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
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail

  return (
    <div
      data-work-boundary="WORK-015-FORMAL-CRUD-ONLY"
      className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-100"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheckIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">{detailCopy.formal.title}</span>
        <Badge variant="outline" className="border-emerald-300/70 bg-background/70 text-[10px] text-emerald-700 dark:border-emerald-800 dark:text-emerald-200">
          {detailCopy.formal.badge}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-100/75">
        {detailCopy.formal.body}
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
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail
  const shareReady = project.visibility === "client_shared" && Boolean(project.clientToken)

  return (
    <div
      data-work-boundary="WORK-016-CLIENT-PORTAL-PUBLISH-GATE"
      className="rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/25 dark:text-sky-100"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheckIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">{detailCopy.clientBoundary.title}</span>
        <Badge variant="outline" className="border-sky-300/70 bg-background/70 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {shareReady ? detailCopy.clientBoundary.ready : detailCopy.clientBoundary.unpublished}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-sky-900/80 dark:text-sky-100/75">
        {detailCopy.clientBoundary.body}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {project.visibility === "client_shared"
            ? detailCopy.clientBoundary.sharingOn
            : detailCopy.clientBoundary.internalMode}
        </Badge>
        <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {project.clientToken
            ? detailCopy.clientBoundary.tokenReady
            : detailCopy.clientBoundary.tokenMissing}
        </Badge>
        <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
          {formatCopy(detailCopy.clientBoundary.contentCountTemplate, {
            tasks: clientTaskCount,
            deliverables: clientDeliverableCount,
          })}
        </Badge>
        {hasDraft && (
          <Badge variant="outline" className="border-sky-300/60 bg-background/60 text-[10px] text-sky-700 dark:border-sky-800 dark:text-sky-200">
            {detailCopy.clientBoundary.draftNeedsReview}
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
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail
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
      label: detailCopy.clientReview.rows.visibility.label,
      detail: project.visibility === "client_shared"
        ? detailCopy.clientReview.rows.visibility.detailShared
        : detailCopy.clientReview.rows.visibility.detailInternal,
      action: project.visibility === "client_shared"
        ? detailCopy.clientReview.rows.visibility.actionShared
        : detailCopy.clientReview.rows.visibility.actionInternal,
      state: project.visibility === "client_shared" ? "pass" : "blocked",
    },
    {
      id: "token",
      boundary: "WORK-017-CHECKLIST-ROW-TOKEN",
      label: detailCopy.clientReview.rows.token.label,
      detail: project.clientToken
        ? detailCopy.clientReview.rows.token.detailReady
        : detailCopy.clientReview.rows.token.detailMissing,
      action: project.clientToken
        ? detailCopy.clientReview.rows.token.actionReady
        : detailCopy.clientReview.rows.token.actionMissing,
      state: project.clientToken ? "pass" : "blocked",
    },
    {
      id: "client-visible-records",
      boundary: "WORK-017-CHECKLIST-ROW-CLIENT-VISIBLE-RECORDS",
      label: detailCopy.clientReview.rows.records.label,
      detail: formatCopy(detailCopy.clientReview.rows.records.detailTemplate, {
        tasks: clientTaskCount,
        deliverables: clientDeliverableCount,
      }),
      action: hasClientVisibleRecords
        ? detailCopy.clientReview.rows.records.actionReady
        : detailCopy.clientReview.rows.records.actionMissing,
      state: hasClientVisibleRecords ? "pass" : "warn",
    },
    {
      id: "ai-draft",
      boundary: "WORK-017-CHECKLIST-ROW-AI-DRAFT",
      label: detailCopy.clientReview.rows.draft.label,
      detail: publicOutput
        ? hasConfirmedClientDraft
          ? detailCopy.clientReview.rows.draft.detailConfirmed
          : detailCopy.clientReview.rows.draft.detailPending
        : detailCopy.clientReview.rows.draft.detailMissing,
      action: publicOutput
        ? detailCopy.clientReview.rows.draft.actionPresent
        : detailCopy.clientReview.rows.draft.actionMissing,
      state: publicOutput ? "warn" : "pass",
    },
    {
      id: "next-action",
      boundary: "WORK-017-CHECKLIST-ROW-NEXT-ACTION",
      label: detailCopy.clientReview.rows.next.label,
      detail: shareReady
        ? detailCopy.clientReview.rows.next.detailReady
        : detailCopy.clientReview.rows.next.detailBlocked,
      action:
        nextActionState === "pass"
          ? detailCopy.clientReview.rows.next.actionPass
          : nextActionState === "warn"
            ? detailCopy.clientReview.rows.next.actionWarn
            : detailCopy.clientReview.rows.next.actionBlocked,
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
        <h3 className="text-sm font-semibold">{detailCopy.clientReview.title}</h3>
        <Badge variant="outline" className="text-[10px]">
          {detailCopy.clientReview.badge}
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
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail
  const taskCopy = copy.work.tasks
  const deliverableCopy = copy.work.deliverables
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
        <h3 className="text-sm font-semibold">{detailCopy.clientTab.shareSettings}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {detailCopy.clientTab.visibilityLabel}
          </span>
          <Badge variant="outline" className={project.visibility === "client_shared" ? "border-blue-300/60 text-blue-600 dark:text-blue-400" : ""}>
            {project.visibility === "client_shared"
              ? detailCopy.clientTab.clientShared
              : detailCopy.clientTab.internal}
          </Badge>
        </div>
        {clientPortalShareReady ? (
          <ShareLinkButton token={project.clientToken} />
        ) : project.clientToken ? (
          <div
            data-work-boundary="WORK-016-SHARE-LINK-INTERNAL-GATE"
            className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
          >
            {detailCopy.clientTab.tokenInternalGate}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/60">
            {detailCopy.clientTab.noShareLink}
          </p>
        )}
      </section>

      {/* Client-visible tasks */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <EyeIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{detailCopy.clientTab.clientTasks}</h3>
          <span className="text-xs text-muted-foreground">({clientTasks.length})</span>
        </div>
        {clientTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 rounded-lg border border-dashed border-border px-4 py-4 text-center">
            {detailCopy.clientTab.noClientTasks}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {clientTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <CheckCircle2Icon className={cn("size-4 shrink-0", t.status === "done" ? "text-emerald-500" : "text-muted-foreground/40")} />
                <span className={cn("text-sm flex-1", t.status === "done" && "line-through text-muted-foreground")}>{t.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {taskCopy.statuses[t.status]}
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
          <h3 className="text-sm font-semibold">{detailCopy.clientTab.clientDeliverables}</h3>
          <span className="text-xs text-muted-foreground">({clientDeliverables.length})</span>
        </div>
        {clientDeliverables.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 rounded-lg border border-dashed border-border px-4 py-4 text-center">
            {detailCopy.clientTab.noClientDeliverables}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {clientDeliverables.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-sm flex-1">{d.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {deliverableCopy.statuses[d.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Boundary notice */}
      <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        <p className="font-medium mb-1">{detailCopy.clientTab.hiddenTitle}</p>
        <ul className="list-disc pl-4 flex flex-col gap-0.5">
          {detailCopy.clientTab.hiddenItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {/* Client update */}
      {publicOutput && pulseCard && (
        <section data-work-boundary="WORK-016-CLIENT-DRAFT-PROPOSAL-ONLY" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{detailCopy.clientTab.draftTitle}</h3>
            <Badge variant="outline" className="text-[10px]">
              {detailCopy.clientTab.proposal}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {detailCopy.clientTab.noAutoPublish}
            </Badge>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">
              {formatCopy(detailCopy.clientTab.draftStatusTemplate, {
                status: publicOutput.status === "confirmed"
                  ? detailCopy.clientTab.draftConfirmed
                  : detailCopy.clientTab.draftPending,
              })}
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
    confidence: 92,
    status: "pending",
  },
  {
    id: "ap-2",
    confidence: 88,
    status: "pending",
  },
]

function AgentTab({ project }: { project: Project }) {
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail
  const [expandBoundary, setExpandBoundary] = React.useState(false)

  return (
    <div className="flex flex-col gap-6">
      {/* Agent status header */}
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <div className="size-2 rounded-full bg-amber-400/80 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-xs font-medium">{detailCopy.agent.mockTitle}</span>
          <span className="text-[11px] text-muted-foreground">
            {detailCopy.agent.mockBody}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300/60 shrink-0">
          Mock
        </Badge>
      </div>

      {/* Proposals queue */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ListIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{detailCopy.agent.queueTitle}</h3>
          <span className="text-xs text-muted-foreground">
            {formatCopy(detailCopy.agent.queueCountTemplate, {
              count: MOCK_AGENT_PROPOSALS.length,
            })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {MOCK_AGENT_PROPOSALS.map((p, index) => {
            const proposalCopy = detailCopy.agent.proposals[index]
            return (
            <div key={p.id} className="rounded-lg border border-border px-3 py-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{proposalCopy.type}</Badge>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {formatCopy(detailCopy.agent.confidenceTemplate, {
                    confidence: p.confidence,
                  })}
                </span>
              </div>
              <p className="text-sm">{proposalCopy.content}</p>
              <div className="flex items-center gap-2 pt-1">
                <button className="text-[11px] px-2.5 py-1 rounded-md bg-foreground text-background font-medium transition-opacity opacity-60 cursor-not-allowed" disabled>
                  {detailCopy.agent.accept}
                </button>
                <button className="text-[11px] px-2.5 py-1 rounded-md border border-border text-muted-foreground transition-opacity opacity-60 cursor-not-allowed" disabled>
                  {detailCopy.agent.reject}
                </button>
                <span className="text-[10px] text-muted-foreground/50 ml-1">
                  {detailCopy.agent.disabledHint}
                </span>
              </div>
            </div>
          )})}
        </div>
      </section>

      {/* Run log */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FileClockIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{detailCopy.agent.runLogTitle}</h3>
        </div>
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center flex flex-col gap-1">
          <BotIcon className="size-5 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground/60">
            {detailCopy.agent.emptyRunLogTitle}
          </p>
          <p className="text-[11px] text-muted-foreground/40">
            {detailCopy.agent.emptyRunLogBody}
          </p>
        </div>
      </section>

      {/* Boundary panel */}
      <section className="flex flex-col gap-2">
        <button
          className="flex items-center gap-2 text-sm font-semibold text-left w-full"
          onClick={() => setExpandBoundary((v) => !v)}
        >
          <ShieldCheckIcon className="size-3.5 text-muted-foreground" />
          <span>{detailCopy.agent.boundaryTitle}</span>
          <span className="text-xs text-muted-foreground font-normal ml-auto">
            {expandBoundary ? detailCopy.agent.collapse : detailCopy.agent.expand}
          </span>
        </button>
        {expandBoundary && (
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
            <div>
              <p className="font-medium mb-1">{detailCopy.agent.canDoTitle}</p>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                {detailCopy.agent.canDo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1 text-destructive/70">
                {detailCopy.agent.cannotDoTitle}
              </p>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                {detailCopy.agent.cannotDo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
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
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail
  const [filter, setFilter] = React.useState<RecordFilter>("all")

  const filtered = filter === "all" ? MOCK_RECORDS : MOCK_RECORDS.filter((r) => r.type === filter)

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 w-fit">
        {(["all", "user", "agent", "system"] as RecordFilter[]).map((f) => {
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
              {detailCopy.records.filters[f]}
            </button>
          )
        })}
      </div>

      {/* Records table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 flex flex-col items-center gap-2">
          <FileClockIcon className="size-6 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground/60">
            {detailCopy.records.emptyTitle}
          </p>
          <p className="text-[11px] text-muted-foreground/40">
            {detailCopy.records.emptyBody}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{detailCopy.records.columns.time}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{detailCopy.records.columns.actor}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{detailCopy.records.columns.action}</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">{detailCopy.records.columns.type}</th>
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
  const { copy } = useProductLanguage()
  const detailCopy = copy.work.projectDetail
  const projectId = project.id

  const { ideas } = useResearch()

  const projectTasks = initialTasks
  
  // Bilateral link syncing: convert matching Research Ideas to ProjectNotes format
  const linkedIdeasAsNotes: ProjectNote[] = ideas
    .filter((idea) => idea.linkedProjectId === projectId)
    .map((idea) => ({
      id: idea.id,
      projectId: idea.linkedProjectId!,
      title: formatCopy(detailCopy.page.linkedIdeaTitleTemplate, {
        type: idea.ideaType.toUpperCase(),
        title: idea.title,
      }),
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
  const nowMs = new Date().getTime()

  const daysLeft = project.dueAt
    ? Math.ceil((new Date(project.dueAt).getTime() - nowMs) / 86400000)
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
  const phaseLabel =
    detailCopy.phases[project.phase as keyof typeof detailCopy.phases] ?? project.phase
  const healthLabel = detailCopy.health[project.health]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title={project.name} description={project.clientName} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-6 flex flex-col gap-6">

          {/* Project header */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {phaseLabel}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", health.className)}>
                {project.health === "risk" && <AlertTriangleIcon className="size-3 mr-1" />}
                {healthLabel}
              </Badge>
              {daysLeft !== null && (
                <span className={cn(
                  "flex items-center gap-1 text-xs",
                  daysLeft < 0 ? "text-destructive" : daysLeft <= 3 ? "text-amber-600" : "text-muted-foreground"
                )}>
                  <ClockIcon className="size-3" />
                  {daysLeft < 0
                    ? formatCopy(detailCopy.page.dueOverdueTemplate, {
                        count: Math.abs(daysLeft),
                      })
                    : daysLeft === 0
                      ? detailCopy.page.dueToday
                      : formatCopy(detailCopy.page.dueInTemplate, {
                          count: daysLeft,
                        })}
                </span>
              )}
            </div>
          </div>

          {/* Concept tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="pulse" className="text-sm gap-1.5">
                {detailCopy.page.tabs.pulse}
              </TabsTrigger>
              <TabsTrigger value="work" className="text-sm">
                {detailCopy.page.tabs.work}
              </TabsTrigger>
              <TabsTrigger value="client" className="text-sm">
                {detailCopy.page.tabs.client}
              </TabsTrigger>
              <TabsTrigger value="agent" className="text-sm gap-1">
                <BotIcon className="size-3.5" />
                {detailCopy.page.tabs.agent}
              </TabsTrigger>
              <TabsTrigger value="records" className="text-sm gap-1">
                <FileClockIcon className="size-3.5" />
                {detailCopy.page.tabs.records}
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
                  label={detailCopy.page.stats.tasks}
                  value={`${project.tasksDone}/${project.tasksTotal}`}
                  onClick={() => setTab("work")}
                />
                <QuickStat
                  icon={StickyNoteIcon}
                  label={detailCopy.page.stats.notes}
                  value={projectNotes.length}
                  onClick={() => setTab("work")}
                />
                <QuickStat
                  icon={PackageIcon}
                  label={detailCopy.page.stats.deliverables}
                  value={projectDeliverables.length}
                  onClick={() => setTab("work")}
                />
                <QuickStat
                  icon={ClockIcon}
                  label={detailCopy.page.stats.daysLeft}
                  value={
                    daysLeft !== null
                      ? daysLeft < 0
                        ? detailCopy.page.stats.overdue
                        : formatCopy(detailCopy.page.stats.daysTemplate, {
                            count: daysLeft,
                          })
                      : "—"
                  }
                />
              </div>
            </TabsContent>

            {/* ── Work Tab ── */}
            <TabsContent value="work" className="flex flex-col gap-8 pt-4">
              <WorkFormalDataBoundary />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {detailCopy.page.sections.tasks}
                </h3>
                <TaskList initialTasks={projectTasks} projectId={projectId} />
              </section>

              <div className="border-t" />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {detailCopy.page.sections.notes}
                </h3>
                <NoteTimeline initialNotes={projectNotes} projectId={projectId} />
              </section>

              <div className="border-t" />

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {detailCopy.page.sections.deliverables}
                </h3>
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
