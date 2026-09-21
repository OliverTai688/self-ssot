import Link from "next/link"
import { AlertTriangleIcon, ArrowRightIcon, EyeIcon, LockIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { Project } from "@/types/work"

interface ProjectFocusCardProps {
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

export function ProjectFocusCard({
  project,
  detailHref,
  projectRole,
  accessSource,
  isReadOnly = false,
}: ProjectFocusCardProps) {
  const { copy } = useProductLanguage()
  const cardCopy = copy.work.projectCard
  const isRisk = project.health === "risk"
  const resolvedDetailHref = detailHref === undefined ? `/work/${project.id}` : detailHref

  const content = (
    <>
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
        {resolvedDetailHref ? (
          <ArrowRightIcon className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
        ) : (
          <LockIcon className="size-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
        )}
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
        <span className="tabular-nums">
          {formatCopy(cardCopy.tasksDoneTemplate, {
            done: project.tasksDone,
            total: project.tasksTotal,
          })}
        </span>
        {project.visibility === "client_shared" && (
          <span className="flex items-center gap-1">
            <EyeIcon className="size-2.5" />
            {cardCopy.clientVisible}
          </span>
        )}
      </div>

      {(projectRole || (accessSource && accessSource !== "none") || isReadOnly || !resolvedDetailHref) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {projectRole && (
            <Badge variant="secondary" className="h-5 text-[10px]">
              {cardCopy.roles[projectRole]}
            </Badge>
          )}
          {accessSource && accessSource !== "none" && (
            <span className="text-[10px] text-muted-foreground">
              {cardCopy.accessSources[accessSource]}
            </span>
          )}
          {(isReadOnly || !resolvedDetailHref) && (
            <Badge variant="outline" className="h-5 gap-1 text-[10px]">
              <LockIcon className="size-2.5" />
              {cardCopy.readOnly}
            </Badge>
          )}
        </div>
      )}
    </>
  )

  const className = cn(
    "flex flex-col gap-2 rounded-xl border px-4 py-3.5 transition-all group",
    isRisk
      ? "border-destructive/30 bg-destructive/5"
      : "border-amber-300/50 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
    resolvedDetailHref
      ? isRisk
        ? "hover:border-destructive/50 hover:shadow-sm"
        : "hover:border-amber-400/70 hover:shadow-sm"
      : "cursor-default border-dashed",
  )

  if (!resolvedDetailHref) {
    return (
      <article
        className={className}
        aria-label={formatCopy(cardCopy.readOnlyFocusAriaTemplate, {
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
