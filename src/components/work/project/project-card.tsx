import Link from "next/link"
import { AlertTriangleIcon, ArrowRightIcon, ClockIcon, EyeIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { Project } from "@/types/work"

const healthColors = {
  good: "bg-emerald-500",
  watch: "bg-amber-400",
  risk: "bg-destructive",
}

const phaseLabels: Record<string, string> = {
  discovery: "探索",
  planning: "規劃",
  execution: "執行",
  review: "審稿",
  maintenance: "維護",
}

const statusLabels: Record<string, string> = {
  active: "進行中",
  paused: "暫停",
  completed: "完成",
  archived: "封存",
}

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const pct = project.tasksTotal === 0 ? 0 : Math.round((project.tasksDone / project.tasksTotal) * 100)

  const isOverdue = project.dueAt && new Date(project.dueAt) < new Date()

  const daysLeft = project.dueAt
    ? Math.ceil((new Date(project.dueAt).getTime() - Date.now()) / 86400000)
    : null

  return (
    <Link
      href={`/work/${project.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:border-ring/40 hover:shadow-sm transition-all"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn("mt-0.5 size-2 rounded-full shrink-0", healthColors[project.health])}
            title={`健康度：${project.health}`}
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug truncate">{project.name}</p>
            {project.clientName && (
              <p className="text-xs text-muted-foreground truncate">{project.clientName}</p>
            )}
          </div>
        </div>
        <ArrowRightIcon className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[11px] h-5">
          {statusLabels[project.status]}
        </Badge>
        <Badge variant="outline" className="text-[11px] h-5">
          {phaseLabels[project.phase]}
        </Badge>
        {project.visibility === "client_shared" && (
          <Badge variant="outline" className="text-[11px] h-5 gap-1">
            <EyeIcon className="size-2.5" />
            已分享
          </Badge>
        )}
        {project.health === "risk" && (
          <Badge variant="outline" className="text-[11px] h-5 gap-1 border-destructive/40 text-destructive">
            <AlertTriangleIcon className="size-2.5" />
            風險
          </Badge>
        )}
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>任務進度</span>
          <span className="tabular-nums">{project.tasksDone}/{project.tasksTotal}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 75 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-destructive/60"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Due date + next action */}
      <div className="flex flex-col gap-1">
        {daysLeft !== null && (
          <p className={cn("text-[11px] flex items-center gap-1", isOverdue ? "text-destructive" : "text-muted-foreground")}>
            <ClockIcon className="size-3" />
            {isOverdue ? `已逾期 ${Math.abs(daysLeft)} 天` : daysLeft === 0 ? "今天截止" : `${daysLeft} 天後截止`}
          </p>
        )}
        {project.nextAction && (
          <p className="text-[11px] text-muted-foreground/70 truncate">→ {project.nextAction}</p>
        )}
      </div>
    </Link>
  )
}
