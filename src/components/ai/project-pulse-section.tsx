"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleHelpIcon,
  ClipboardCopyIcon,
  ClockIcon,
  FolderIcon,
  SendIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ConfidencePip } from "@/components/ai/confidence-pip"
import { ProjectTimelineSection } from "@/components/work/timeline/project-timeline-section"
import { DeliverableTree } from "@/components/work/deliverable/deliverable-tree"
import type { AICard, MockProject, PublicOutput } from "@/types/ai"
import type { ProjectTimeline, ProjectDeliverable } from "@/types/work"

// ─── Pulse summary items ──────────────────────────────────────────────────────

function PulseList({
  icon,
  label,
  items,
  variant = "default",
}: {
  icon: React.ReactNode
  label: string
  items: string[]
  variant?: "default" | "warning"
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("flex items-center gap-1.5 text-xs font-medium", variant === "warning" ? "text-destructive" : "text-muted-foreground")}>
        {icon}
        {label}
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="mt-1.5 size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Client Update Dialog ─────────────────────────────────────────────────────

function ClientUpdateDialog({
  publicOutput,
  projectName,
}: {
  publicOutput: PublicOutput
  projectName: string
}) {
  const [content, setContent] = React.useState(publicOutput.clientSafeContent)
  const [copied, setCopied] = React.useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <SendIcon className="size-3.5" />
            生成客戶更新
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>客戶更新草稿</DialogTitle>
          <DialogDescription>
            AI 生成了這份草稿。請仔細審閱再複製使用，AI 不會自動發送。
          </DialogDescription>
        </DialogHeader>

        {/* Internal note (read-only) */}
        <div className="rounded-lg bg-muted/50 border border-border px-3 py-2.5 flex flex-col gap-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">AI 內部判斷（不會對外顯示）</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {publicOutput.internalInsight}
          </p>
        </div>

        {/* Editable client content */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">客戶版本（可自由編輯）</p>
          <textarea
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 min-h-[140px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          提醒：這份草稿絕不會被自動傳送。只有你複製並手動發送後才會對外。
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
            <ClipboardCopyIcon className="size-3.5" />
            {copied ? "已複製！" : "複製內容"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Collapsible section wrapper ──────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div className="flex flex-col gap-3">
      <button
        className="flex items-center gap-2 w-full text-left group"
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
        <span className="text-sm font-semibold flex-1">{title}</span>
        {open
          ? <ChevronUpIcon className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          : <ChevronDownIcon className="size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
        }
      </button>
      {open && children}
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────

interface ProjectPulseSectionProps {
  project: MockProject
  pulseCard: AICard | null
  publicOutput: PublicOutput | null
  timeline?: ProjectTimeline
  deliverables?: ProjectDeliverable[]
}

export function ProjectPulseSection({
  project,
  pulseCard,
  publicOutput,
  timeline,
  deliverables,
}: ProjectPulseSectionProps) {
  const [reasoningOpen, setReasoningOpen] = React.useState(false)

  const pct = project.tasksTotal === 0 ? 0 : Math.round((project.tasksDone / project.tasksTotal) * 100)

  return (
    <section className="flex flex-col gap-6">
      {/* ── AI Analysis ── */}
      <CollapsibleSection
        title="AI 專案脈搏"
        icon={
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-muted-foreground" />
            {pulseCard && <ConfidencePip confidence={pulseCard.confidence} />}
          </div>
        }
        defaultOpen
      >
        {/* Action button */}
        {publicOutput && pulseCard && (
          <div className="flex justify-end -mt-1">
            <ClientUpdateDialog publicOutput={publicOutput} projectName={project.name} />
          </div>
        )}

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>整體進度</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-destructive/60"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {pulseCard ? (
          <div className="flex flex-col gap-5">
            {/* AI summary */}
            <div className="rounded-xl bg-muted/30 border border-border px-4 py-4 flex flex-col gap-4">
              <p className="text-sm leading-relaxed">{pulseCard.summary}</p>

              {pulseCard.pulseSummary && (
                <>
                  <PulseList
                    icon={<ZapIcon className="size-3" />}
                    label="進行中"
                    items={pulseCard.pulseSummary.inProgress}
                  />
                  <PulseList
                    icon={<AlertCircleIcon className="size-3" />}
                    label="阻礙因素"
                    items={pulseCard.pulseSummary.blockers}
                    variant="warning"
                  />
                  <PulseList
                    icon={<CircleHelpIcon className="size-3" />}
                    label="待釐清問題"
                    items={pulseCard.pulseSummary.openQuestions}
                  />
                </>
              )}
            </div>

            {/* Today's priorities */}
            {pulseCard.pulseSummary && pulseCard.pulseSummary.todayPriorities.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">今天建議優先做</p>
                <div className="flex flex-col gap-1.5">
                  {pulseCard.pulseSummary.todayPriorities.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
              {pulseCard.recommendation}
            </div>

            {/* Reasoning toggle */}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
              onClick={() => setReasoningOpen((v) => !v)}
            >
              {reasoningOpen ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
              AI 判斷依據
            </button>

            {reasoningOpen && (
              <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
                {pulseCard.reasoning}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">此專案尚無 AI 脈搏分析</p>
            <p className="text-xs text-muted-foreground/60 mt-1">擷取更多專案相關資訊後，AI 將自動生成分析</p>
          </div>
        )}
      </CollapsibleSection>

      <div className="border-t border-border/60" />

      {/* ── Project Timeline ── */}
      {timeline ? (
        <CollapsibleSection
          title="專案時間線"
          icon={<ClockIcon className="size-4 text-muted-foreground" />}
          defaultOpen
        >
          <ProjectTimelineSection timeline={timeline} />
        </CollapsibleSection>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-6 text-center">
          <p className="text-sm text-muted-foreground">尚未生成專案時間線</p>
          <p className="text-xs text-muted-foreground/60 mt-1">補充專案目標與截止日後可自動推算各階段節點</p>
        </div>
      )}

      <div className="border-t border-border/60" />

      {/* ── Deliverable File Structure ── */}
      <CollapsibleSection
        title="交付物結構"
        icon={<FolderIcon className="size-4 text-muted-foreground" />}
        defaultOpen={false}
      >
        {deliverables && deliverables.length > 0 ? (
          <DeliverableTree initialDeliverables={deliverables} projectId={project.id} />
        ) : (
          <div className="rounded-xl border border-dashed border-border px-6 py-6 text-center">
            <p className="text-sm text-muted-foreground">尚無交付物</p>
            <p className="text-xs text-muted-foreground/60 mt-1">在工作頁面新增交付物後會自動顯示於此</p>
          </div>
        )}
      </CollapsibleSection>
    </section>
  )
}
