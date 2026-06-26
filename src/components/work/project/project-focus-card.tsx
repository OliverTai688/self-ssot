import Link from "next/link"
import { AlertTriangleIcon, ArrowRightIcon, EyeIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Project } from "@/types/work"

interface ProjectFocusCardProps {
  project: Project
}

export function ProjectFocusCard({ project }: ProjectFocusCardProps) {
  const isRisk = project.health === "risk"

  return (
    <Link
      href={`/work/${project.id}`}
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3.5 hover:shadow-sm transition-all group",
        isRisk
          ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
          : "border-amber-300/50 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 hover:border-amber-400/70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangleIcon
            className={cn(
              "size-4 shrink-0 mt-0.5",
              isRisk ? "text-destructive" : "text-amber-600 dark:text-amber-400"
            )}
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug truncate">{project.name}</p>
            {project.clientName && (
              <p className="text-xs text-muted-foreground">{project.clientName}</p>
            )}
          </div>
        </div>
        <ArrowRightIcon className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
      </div>

      {project.nextAction && (
        <p className={cn(
          "text-xs leading-relaxed",
          isRisk ? "text-destructive/80" : "text-amber-700 dark:text-amber-400"
        )}>
          → {project.nextAction}
        </p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="tabular-nums">{project.tasksDone}/{project.tasksTotal} 任務完成</span>
        {project.visibility === "client_shared" && (
          <span className="flex items-center gap-1">
            <EyeIcon className="size-2.5" />
            客戶可見
          </span>
        )}
      </div>
    </Link>
  )
}
