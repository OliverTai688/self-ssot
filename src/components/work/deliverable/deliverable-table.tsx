"use client"

import * as React from "react"
import { CheckCircleIcon, CircleIcon, ClockIcon, EyeIcon, LockIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddDeliverableDialog } from "@/components/work/deliverable/add-deliverable-dialog"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProjectDeliverable, DeliverableStatus } from "@/types/work"

const statusConfig: Record<DeliverableStatus, { Icon: React.ElementType; className: string }> = {
  draft: { Icon: CircleIcon, className: "text-muted-foreground" },
  delivered: { Icon: ClockIcon, className: "text-blue-600 dark:text-blue-400" },
  approved: { Icon: CheckCircleIcon, className: "text-emerald-600 dark:text-emerald-400" },
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

interface DeliverableTableProps {
  initialDeliverables: ProjectDeliverable[]
  projectId: string
}

export function DeliverableTable({ initialDeliverables, projectId }: DeliverableTableProps) {
  const { copy, locale } = useProductLanguage()
  const deliverableCopy = copy.work.deliverables
  const dateLocale = locale === "zh-TW" ? "zh-TW" : "en-US"
  const [deliverables, setDeliverables] = React.useState<ProjectDeliverable[]>(initialDeliverables)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  function handleAdd(d: Omit<ProjectDeliverable, "id" | "projectId" | "createdAt">) {
    setDeliverables((prev) => [
      { ...d, id: `d-${Date.now()}`, projectId, createdAt: new Date().toISOString() },
      ...prev,
    ])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatCopy(deliverableCopy.table.summaryTemplate, {
            count: deliverables.length,
          })}
        </span>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-3.5" />
          {deliverableCopy.table.add}
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">{deliverableCopy.table.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {deliverables.map((d) => {
            const { Icon, className } = statusConfig[d.status]
            return (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <Icon className={cn("size-4 mt-0.5 shrink-0", className)} />
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{d.title}</p>
                  {d.description && (
                    <p className="text-xs text-muted-foreground/70 truncate">{d.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] h-4", className)}>
                      {deliverableCopy.statuses[d.status]}
                    </Badge>
                    {d.visibility === "client_visible" ? (
                      <span className="flex items-center gap-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                        <EyeIcon className="size-2.5" />
                        {deliverableCopy.visibility.client_visible}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60">
                        <LockIcon className="size-2.5" />
                        {deliverableCopy.visibility.internal}
                      </span>
                    )}
                    {d.deliveredAt && (
                      <span className="text-[11px] text-muted-foreground">
                        {formatCopy(deliverableCopy.table.deliveredAtTemplate, {
                          date: new Date(d.deliveredAt).toLocaleDateString(dateLocale, {
                            month: "numeric",
                            day: "numeric",
                          }),
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddDeliverableDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAdd}
      />
    </div>
  )
}
