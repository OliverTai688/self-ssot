import { CheckCircleIcon, CircleDotIcon, CircleIcon, XCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AIStatus, ProcessingStatus } from "@/types/ingestion"

const PROCESSING_CONFIG: Record<ProcessingStatus, { label: string; icon: React.ReactNode; className: string }> = {
  unprocessed: {
    label: "未處理",
    icon: <CircleIcon className="size-3" />,
    className: "text-muted-foreground",
  },
  processing: {
    label: "處理中",
    icon: <CircleDotIcon className="size-3 animate-pulse" />,
    className: "text-amber-600 dark:text-amber-400",
  },
  processed: {
    label: "已處理",
    icon: <CheckCircleIcon className="size-3" />,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    label: "處理失敗",
    icon: <XCircleIcon className="size-3" />,
    className: "text-destructive",
  },
}

const AI_STATUS_CONFIG: Record<AIStatus, { label: string; className: string }> = {
  not_started: { label: "AI 未分析", className: "text-muted-foreground/60" },
  proposed: { label: "AI 已建議", className: "text-primary" },
  confirmed: { label: "已確認", className: "text-emerald-600 dark:text-emerald-400" },
  dismissed: { label: "已略過", className: "text-muted-foreground/50" },
}

export function ProcessingStatusBadge({
  processingStatus,
  className,
}: {
  processingStatus: ProcessingStatus
  className?: string
}) {
  const config = PROCESSING_CONFIG[processingStatus]
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", config.className, className)}>
      {config.icon}
      {config.label}
    </span>
  )
}

export function AIStatusBadge({
  aiStatus,
  className,
}: {
  aiStatus: AIStatus
  className?: string
}) {
  const config = AI_STATUS_CONFIG[aiStatus]
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", config.className, className)}>
      {config.label}
    </span>
  )
}
