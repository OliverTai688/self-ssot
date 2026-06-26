"use client"

import * as React from "react"
import { CheckCircleIcon, CircleIcon, ClockIcon, EyeIcon, LockIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddDeliverableDialog } from "@/components/work/deliverable/add-deliverable-dialog"
import type { ProjectDeliverable, DeliverableStatus } from "@/types/work"

const statusConfig: Record<DeliverableStatus, { label: string; Icon: React.ElementType; className: string }> = {
  draft: { label: "草稿", Icon: CircleIcon, className: "text-muted-foreground" },
  delivered: { label: "已交付", Icon: ClockIcon, className: "text-blue-600 dark:text-blue-400" },
  approved: { label: "已核准", Icon: CheckCircleIcon, className: "text-emerald-600 dark:text-emerald-400" },
}

interface DeliverableTableProps {
  initialDeliverables: ProjectDeliverable[]
  projectId: string
}

export function DeliverableTable({ initialDeliverables, projectId }: DeliverableTableProps) {
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
        <span className="text-xs text-muted-foreground">{deliverables.length} 個交付物</span>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-3.5" />
          新增交付物
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">還沒有交付物</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {deliverables.map((d) => {
            const { label, Icon, className } = statusConfig[d.status]
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
                      {label}
                    </Badge>
                    {d.visibility === "client_visible" ? (
                      <span className="flex items-center gap-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                        <EyeIcon className="size-2.5" />
                        客戶可見
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60">
                        <LockIcon className="size-2.5" />
                        內部
                      </span>
                    )}
                    {d.deliveredAt && (
                      <span className="text-[11px] text-muted-foreground">
                        交付於 {new Date(d.deliveredAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })}
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
