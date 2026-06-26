"use client"

import * as React from "react"
import { AlertCircleIcon, CalendarIcon, SparklesIcon, ClockIcon } from "lucide-react"

import { PublicationTarget } from "@/types/research"
import { mockProjectsFull } from "@/lib/mock/work"
import { cn } from "@/lib/utils"

interface PubTimelineProps {
  targets: PublicationTarget[]
}

export function PubTimeline({ targets }: PubTimelineProps) {
  // Find active projects with deadlines
  const activeProjects = mockProjectsFull.filter(
    (p) => p.status === "active" && p.dueAt
  )

  // Chronologically sort publication targets
  const sortedTargets = [...targets].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  )

  // Identify work deadline overlaps within a 15-day threshold
  const conflicts = sortedTargets.flatMap((target) => {
    const targetTime = new Date(target.deadline).getTime()
    return activeProjects
      .filter((project) => {
        const projectTime = new Date(project.dueAt!).getTime()
        const diffDays = Math.abs(projectTime - targetTime) / (1000 * 60 * 60 * 24)
        return diffDays <= 15 // Overlap threshold
      })
      .map((project) => ({
        target,
        project,
        daysDiff: Math.round(
          Math.abs(new Date(project.dueAt!).getTime() - new Date(target.deadline).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }))
  })

  return (
    <div className="space-y-4">
      {/* AI conflict warning banner */}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 flex gap-3 items-start">
          <SparklesIcon className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              AI 發表衝突警示 — 時間精力密度高危
            </h4>
            <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
              {conflicts.map((c, i) => (
                <p key={i}>
                  投稿目標 <span className="font-semibold text-foreground">[{c.target.venueName}]</span> (
                  {new Date(c.target.deadline).toLocaleDateString("zh-TW")}) 與工作專案{" "}
                  <span className="font-semibold text-foreground">[{c.project.name}]</span> 的截止日 (
                  {new Date(c.project.dueAt!).toLocaleDateString("zh-TW")}) 相距僅{" "}
                  <span className="font-bold text-amber-500">{c.daysDiff} 天</span>。
                  建議微調研究里程碑，或在工作模組中預先將部分任務外包/延後，以保障交付品質。
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline display */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b px-4 py-3 bg-muted/20 flex items-center gap-2">
          <CalendarIcon className="size-4 text-primary" />
          <span className="text-xs font-bold text-foreground">學術發表倒數行事曆 (未來 6 個月)</span>
        </div>

        {sortedTargets.length === 0 ? (
          <div className="px-6 py-8 text-center text-xs text-muted-foreground">
            目前沒有計畫中的發表目標
          </div>
        ) : (
          <div className="p-4 space-y-3.5">
            {sortedTargets.map((target) => {
              const deadlineDate = new Date(target.deadline)
              const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000)
              
              return (
                <div
                  key={target.id}
                  className="flex items-start gap-4 rounded-lg border border-border/60 hover:border-border p-3 transition-colors"
                >
                  {/* Countdown Circle */}
                  <div
                    className={cn(
                      "size-10 rounded-full flex flex-col items-center justify-center shrink-0 text-center font-bold tabular-nums text-xs",
                      daysLeft < 0
                        ? "bg-muted text-muted-foreground"
                        : daysLeft <= 30
                        ? "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                    )}
                  >
                    {daysLeft < 0 ? (
                      <span className="text-[10px]">截止</span>
                    ) : (
                      <>
                        <span>{daysLeft}</span>
                        <span className="text-[8px] font-normal -mt-0.5">天</span>
                      </>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {target.venueName}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium shrink-0">
                        {target.venueType === "conference"
                          ? "研討會"
                          : target.venueType === "journal"
                          ? "期刊"
                          : "平台"}
                      </span>
                    </div>

                    <p className="text-[10px] text-muted-foreground leading-normal line-clamp-1">
                      {target.notes || "無詳細筆記說明"}
                    </p>

                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80">
                      <ClockIcon className="size-3" />
                      <span>截止日期: {deadlineDate.toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
