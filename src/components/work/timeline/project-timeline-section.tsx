"use client"

import * as React from "react"
import {
  ActivityIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDotIcon,
  ClockIcon,
  FlagIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ProjectPhaseNode, ProjectTimeline } from "@/types/work"

// ─── Milestone row ────────────────────────────────────────────────────────────

function MilestoneRow({ milestone }: { milestone: ProjectPhaseNode["milestones"][number] }) {
  const dateLabel = new Date(milestone.date).toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
  })

  return (
    <div className="flex items-center gap-2 pl-2">
      <FlagIcon
        className={cn(
          "size-3 shrink-0",
          milestone.status === "completed" ? "text-emerald-500" : "text-muted-foreground/40"
        )}
      />
      <span
        className={cn(
          "text-xs flex-1",
          milestone.status === "completed" ? "text-muted-foreground line-through" : "text-foreground/80"
        )}
      >
        {milestone.title}
      </span>
      <span className="text-[11px] text-muted-foreground/60 tabular-nums shrink-0">{dateLabel}</span>
    </div>
  )
}

// ─── Phase node ───────────────────────────────────────────────────────────────

function PhaseNodeCard({
  node,
  isLast,
}: {
  node: ProjectPhaseNode
  isLast: boolean
}) {
  const [open, setOpen] = React.useState(node.status === "active")

  const startLabel = new Date(node.startDate).toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
  })
  const endLabel = new Date(node.endDate).toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
  })

  const statusIcon =
    node.status === "done" ? (
      <CheckCircle2Icon className="size-4 text-emerald-500 shrink-0" />
    ) : node.status === "active" ? (
      <ActivityIcon className="size-4 text-blue-500 shrink-0 animate-pulse" />
    ) : (
      <CircleDotIcon className="size-4 text-muted-foreground/30 shrink-0" />
    )

  const statusLabel =
    node.status === "done" ? "已完成" : node.status === "active" ? "進行中" : "待開始"

  const statusBadgeClass =
    node.status === "done"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : node.status === "active"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        : "bg-muted text-muted-foreground/60"

  return (
    <div className="flex gap-3">
      {/* Vertical connector */}
      <div className="flex flex-col items-center">
        <div className="mt-1">{statusIcon}</div>
        {!isLast && <div className={cn("w-px flex-1 mt-1", node.status === "done" ? "bg-emerald-200 dark:bg-emerald-800" : "bg-border")} />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-4">
        <button
          className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-2.5 border border-border hover:bg-muted/30 transition-colors"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-sm font-medium flex-1">{node.label}</span>
          <span className={cn("text-[10px] font-medium rounded-full px-2 py-0.5", statusBadgeClass)}>
            {statusLabel}
          </span>
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">
            {startLabel} – {endLabel}
          </span>
          {node.milestones.length > 0 && (
            open
              ? <ChevronDownIcon className="size-3.5 text-muted-foreground/60 shrink-0" />
              : <ChevronRightIcon className="size-3.5 text-muted-foreground/60 shrink-0" />
          )}
        </button>

        {open && node.milestones.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2 px-1">
            {node.milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

interface ProjectTimelineSectionProps {
  timeline: ProjectTimeline
}

export function ProjectTimelineSection({ timeline }: ProjectTimelineSectionProps) {
  const generatedLabel = new Date(timeline.generatedAt).toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const activePhase = timeline.phases.find((p) => p.status === "active")
  const doneCount = timeline.phases.filter((p) => p.status === "done").length

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">專案時間線</h3>
          {activePhase && (
            <span className="text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              目前：{activePhase.label}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground/50">
          {doneCount}/{timeline.phases.length} 階段完成 · 更新於 {generatedLabel}
        </span>
      </div>

      {/* Phase nodes */}
      <div>
        {timeline.phases.map((phase, i) => (
          <PhaseNodeCard
            key={phase.phase}
            node={phase}
            isLast={i === timeline.phases.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
