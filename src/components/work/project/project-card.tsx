import Link from "next/link"
import { AlertTriangleIcon, ArrowRightIcon, ClockIcon, EyeIcon, LockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { Project } from "@/types/work"

const healthColors = {
  good: "bg-emerald-500",
  watch: "bg-amber-400",
  risk: "bg-destructive",
}

interface ProjectCardProps {
  project: Project
  detailHref?: string | null
  projectRole?: "VIEWER" | "COMMENTER" | "EDITOR" | "MANAGER" | null
  accessSource?: "workspace_manager" | "direct_grant" | "workspace_default" | "none" | "legacy_exact_owner"
  isReadOnly?: boolean
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

export function ProjectCard({
  project,
  detailHref,
  projectRole,
  accessSource,
  isReadOnly = false,
}: ProjectCardProps) {
  const { copy } = useProductLanguage()
  const workCopy = copy.work
  const cardCopy = workCopy.projectCard
  const pct = project.tasksTotal === 0 ? 0 : Math.round((project.tasksDone / project.tasksTotal) * 100)
  const nowMs = new Date().getTime()
  const resolvedDetailHref = detailHref === undefined ? `/work/${project.id}` : detailHref

  const isOverdue = project.dueAt && new Date(project.dueAt) < new Date()

  const daysLeft = project.dueAt
    ? Math.ceil((new Date(project.dueAt).getTime() - nowMs) / 86400000)
    : null

  const content = (
    <>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn("mt-0.5 size-2 rounded-full shrink-0", healthColors[project.health])}
            title={formatCopy(cardCopy.healthTitleTemplate, {
              health: workCopy.health[project.health],
            })}
          />
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug truncate">{project.name}</p>
            {project.clientName && (
              <p className="text-xs text-muted-foreground truncate">{project.clientName}</p>
            )}
          </div>
        </div>
        {resolvedDetailHref ? (
          <ArrowRightIcon className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
        ) : (
          <LockIcon className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-[11px] h-5">
          {workCopy.status[project.status]}
        </Badge>
        <Badge variant="outline" className="text-[11px] h-5">
          {workCopy.phase[project.phase]}
        </Badge>
        {project.visibility === "client_shared" && (
          <Badge variant="outline" className="text-[11px] h-5 gap-1">
            <EyeIcon className="size-2.5" />
            {cardCopy.shared}
          </Badge>
        )}
        {project.health === "risk" && (
          <Badge variant="outline" className="text-[11px] h-5 gap-1 border-destructive/40 text-destructive">
            <AlertTriangleIcon className="size-2.5" />
            {cardCopy.risk}
          </Badge>
        )}
        {projectRole && (
          <Badge variant="secondary" className="text-[11px] h-5">
            {cardCopy.roles[projectRole]}
          </Badge>
        )}
        {(isReadOnly || !resolvedDetailHref) && (
          <Badge variant="outline" className="text-[11px] h-5 gap-1">
            <LockIcon className="size-2.5" />
            {cardCopy.readOnly}
          </Badge>
        )}
      </div>

      {accessSource && accessSource !== "none" && (
        <p className="text-[11px] text-muted-foreground">
          {cardCopy.accessSourcePrefix}
          {cardCopy.accessSources[accessSource]}
        </p>
      )}

      {/* Progress */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{cardCopy.taskProgress}</span>
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
            {isOverdue
              ? formatCopy(cardCopy.overdueTemplate, { count: Math.abs(daysLeft) })
              : daysLeft === 0
                ? cardCopy.dueToday
                : formatCopy(cardCopy.dueInTemplate, { count: daysLeft })}
          </p>
        )}
        {project.nextAction && (
          <p className="text-[11px] text-muted-foreground/70 truncate">→ {project.nextAction}</p>
        )}
      </div>
    </>
  )

  const className = cn(
    "group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all",
    resolvedDetailHref
      ? "hover:border-ring/40 hover:shadow-sm"
      : "cursor-default border-dashed bg-muted/10",
  )

  if (!resolvedDetailHref) {
    return (
      <article
        className={className}
        aria-label={formatCopy(cardCopy.readOnlyProjectAriaTemplate, {
          project: project.name,
        })}
      >
        {content}
      </article>
    )
  }

  return (
    <Link href={resolvedDetailHref} className={className}>
      {content}
    </Link>
  )
}
