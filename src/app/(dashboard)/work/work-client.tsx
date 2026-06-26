"use client"

import * as React from "react"
import { BriefcaseIcon, BotIcon, FileClockIcon, AlertTriangleIcon } from "lucide-react"

import { AppHeader } from "@/components/layout/app-header"
import { ProjectCard } from "@/components/work/project/project-card"
import { ProjectFocusCard } from "@/components/work/project/project-focus-card"
import { ProjectFilterBar } from "@/components/work/project/project-filter-bar"
import { AddProjectDialog } from "@/components/work/project/add-project-dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Project, ProjectStatus } from "@/types/work"

type StatusFilter = ProjectStatus | "all"
type SortKey = "updatedAt" | "dueAt" | "name"
type WorkView = "projects" | "agent" | "records"

function sortProjects(projects: Project[], key: SortKey) {
  return [...projects].sort((a, b) => {
    if (key === "name") return a.name.localeCompare(b.name, "zh-TW")
    if (key === "dueAt") {
      if (!a.dueAt && !b.dueAt) return 0
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

// ─── Module nav ───────────────────────────────────────────────────────────────

const MODULE_VIEWS: { key: WorkView; icon: React.ElementType; label: string; available: boolean }[] = [
  { key: "projects", icon: BriefcaseIcon, label: "專案", available: true },
  { key: "agent", icon: BotIcon, label: "代理人", available: false },
  { key: "records", icon: FileClockIcon, label: "紀錄", available: false },
]

// ─── Stub views ───────────────────────────────────────────────────────────────

function AgentModuleView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
        <div className="size-2 rounded-full bg-amber-400/80 shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-xs font-medium">WorkAgent · 模擬模式</span>
          <span className="text-[11px] text-muted-foreground">需 AUTH-001 + WORK-007 完成後啟用全模組代理人</span>
        </div>
        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300/60 shrink-0">Mock</Badge>
      </div>
      <div className="rounded-lg border border-dashed border-border px-4 py-10 flex flex-col items-center gap-2">
        <BotIcon className="size-6 text-muted-foreground/25" />
        <p className="text-sm text-muted-foreground/60">跨專案代理人工作區</p>
        <p className="text-[11px] text-muted-foreground/40">WorkAgent 上線後可在此審閱跨專案建議、查看執行記錄、設定代理人邊界</p>
      </div>
    </div>
  )
}

function RecordsModuleView() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 w-fit">
        {(["全部", "使用者操作", "Agent 提案", "系統事件"] as const).map((label, i) => (
          <button
            key={i}
            disabled
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              i === 0 ? "bg-background text-foreground shadow-sm" : "text-muted-foreground/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-border px-4 py-10 flex flex-col items-center gap-2">
        <FileClockIcon className="size-6 text-muted-foreground/25" />
        <p className="text-sm text-muted-foreground/60">跨專案操作紀錄</p>
        <p className="text-[11px] text-muted-foreground/40">任務異動、Agent 提案確認、可見性調整等事件將在此彙整</p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WorkClient({ initialProjects }: { initialProjects: Project[] }) {
  const [workView, setWorkView] = React.useState<WorkView>("projects")
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all")
  const [sortKey, setSortKey] = React.useState<SortKey>("updatedAt")

  const riskCount = initialProjects.filter(
    (p) => p.status === "active" && p.health === "risk"
  ).length

  const overdueCount = initialProjects.filter(
    (p) => p.dueAt && new Date(p.dueAt) < new Date() && p.status !== "archived"
  ).length

  const focusProjects = initialProjects
    .filter((p) => p.status === "active" && (p.health === "risk" || p.health === "watch"))
    .sort((a, b) => {
      if (a.health === "risk" && b.health !== "risk") return -1
      if (a.health !== "risk" && b.health === "risk") return 1
      return 0
    })
    .slice(0, 2)

  const filtered = initialProjects.filter(
    (p) => statusFilter === "all" || p.status === statusFilter
  )
  const sorted = sortProjects(filtered, sortKey)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader
        title="工作"
        description="將專案、任務、紀錄轉化為可追溯的工作記憶"
      />

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl flex flex-col gap-6">

          {/* Module-level attention strip */}
          {(riskCount > 0 || overdueCount > 0) && workView === "projects" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 px-4 py-2.5">
              <AlertTriangleIcon className="size-3.5 text-amber-600 shrink-0" />
              <span className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                {[
                  riskCount > 0 && `${riskCount} 個高風險專案`,
                  overdueCount > 0 && `${overdueCount} 個逾期專案`,
                ].filter(Boolean).join("・")}需要關注
              </span>
            </div>
          )}

          {/* Module navigation */}
          <div className="flex items-center gap-1 border-b border-border pb-0 -mb-1">
            {MODULE_VIEWS.map(({ key, icon: Icon, label, available }) => (
              <button
                key={key}
                onClick={() => available && setWorkView(key)}
                disabled={!available}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                  workView === key
                    ? "border-foreground text-foreground font-medium"
                    : available
                      ? "border-transparent text-muted-foreground hover:text-foreground"
                      : "border-transparent text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <Icon className="size-3.5" />
                {label}
                {!available && (
                  <span className="text-[10px] text-muted-foreground/40 ml-0.5">即將</span>
                )}
              </button>
            ))}
          </div>

          {/* View content */}
          {workView === "agent" && <AgentModuleView />}
          {workView === "records" && <RecordsModuleView />}

          {workView === "projects" && (
            <div className="flex flex-col gap-8">
              {/* Today's focus */}
              {focusProjects.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-sm font-semibold text-muted-foreground">今日焦點</h2>
                  <div className="flex flex-col gap-2">
                    {focusProjects.map((p) => (
                      <ProjectFocusCard key={p.id} project={p} />
                    ))}
                  </div>
                </section>
              )}

              {/* Project list */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">全部專案</h2>
                  <AddProjectDialog />
                </div>

                <ProjectFilterBar
                  statusFilter={statusFilter}
                  sortKey={sortKey}
                  onStatusChange={setStatusFilter}
                  onSortChange={setSortKey}
                />

                {sorted.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
                    <p className="text-sm text-muted-foreground">此分類沒有專案</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sorted.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
