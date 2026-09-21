"use client"

import { CheckCircleIcon, CircleDotIcon, CircleIcon, XCircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { AIStatus, ProcessingStatus } from "@/types/ingestion"

const PROCESSING_CONFIG: Record<ProcessingStatus, { icon: React.ReactNode; className: string }> = {
  unprocessed: {
    icon: <CircleIcon className="size-3" />,
    className: "text-muted-foreground",
  },
  processing: {
    icon: <CircleDotIcon className="size-3 animate-pulse" />,
    className: "text-amber-600 dark:text-amber-400",
  },
  processed: {
    icon: <CheckCircleIcon className="size-3" />,
    className: "text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    icon: <XCircleIcon className="size-3" />,
    className: "text-destructive",
  },
}

const AI_STATUS_CONFIG: Record<AIStatus, { className: string }> = {
  not_started: { className: "text-muted-foreground/60" },
  proposed: { className: "text-primary" },
  confirmed: { className: "text-emerald-600 dark:text-emerald-400" },
  dismissed: { className: "text-muted-foreground/50" },
}

export function ProcessingStatusBadge({
  processingStatus,
  className,
}: {
  processingStatus: ProcessingStatus
  className?: string
}) {
  const config = PROCESSING_CONFIG[processingStatus]
  const { copy } = useProductLanguage()
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", config.className, className)}>
      {config.icon}
      {copy.inbox.badges.processingStatus[processingStatus]}
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
  const { copy } = useProductLanguage()
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", config.className, className)}>
      {copy.inbox.badges.aiStatus[aiStatus]}
    </span>
  )
}
