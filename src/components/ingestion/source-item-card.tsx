"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, UserIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SourceTypeBadge } from "@/components/ingestion/source-type-badge"
import { ProcessingStatusBadge, AIStatusBadge } from "@/components/ingestion/processing-status-badge"
import { DataLineagePipeline, type LineageStage } from "@/components/ingestion/data-lineage-pipeline"
import { NormalizedContentPreview } from "@/components/ingestion/normalized-content-preview"
import type { NormalizedContent, RawSourceItem, ProcessingStatus, AIStatus } from "@/types/ingestion"

function deriveLineageStage(processingStatus: ProcessingStatus, aiStatus: AIStatus): LineageStage {
  if (aiStatus === "confirmed" || aiStatus === "dismissed") return "decision"
  if (aiStatus === "proposed") return "proposal"
  if (processingStatus === "processed") return "evidence"
  if (processingStatus === "processing") return "normalized"
  return "raw"
}

function deriveModuleHint(sourceType: RawSourceItem["sourceType"]): string | null {
  const hints: Partial<Record<RawSourceItem["sourceType"], string>> = {
    line_message: "Work / Research",
    google_doc: "Work",
    markdown_document: "Research",
    url: "Research",
    audio: "Research / Life",
    image: "Research",
    receipt: "Finance",
    gmail_email: "Work",
  }
  return hints[sourceType] ?? null
}

function deriveRiskBadge(privacyLevel: RawSourceItem["privacyLevel"]): { label: string; className: string } | null {
  if (privacyLevel === "private") return { label: "私人", className: "text-amber-600 dark:text-amber-400" }
  if (privacyLevel === "public_safe") return { label: "公開安全", className: "text-emerald-600 dark:text-emerald-400" }
  return null
}

interface SourceItemCardProps {
  item: RawSourceItem
  normalizedContents: NormalizedContent[]
  proposalCount: number
  onRunAnalysis?: (id: string) => void
  className?: string
}

export function SourceItemCard({
  item,
  normalizedContents,
  proposalCount,
  onRunAnalysis,
  className,
}: SourceItemCardProps) {
  const [expanded, setExpanded] = React.useState(false)

  const displayTitle =
    item.title ??
    item.previewText?.slice(0, 60) ??
    item.rawText?.slice(0, 60) ??
    "未命名來源"

  const capturedTime = new Date(item.capturedAt).toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const canRunAnalysis =
    item.processingStatus === "processed" && item.aiStatus === "not_started"
  const isProcessing = item.processingStatus === "processing"

  const lineageStage = deriveLineageStage(item.processingStatus, item.aiStatus)
  const moduleHint = deriveModuleHint(item.sourceType)
  const riskBadge = deriveRiskBadge(item.privacyLevel)

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card ring-1 ring-foreground/5 overflow-hidden",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <SourceTypeBadge sourceType={item.sourceType} />
            <ProcessingStatusBadge processingStatus={item.processingStatus} />
            <AIStatusBadge aiStatus={item.aiStatus} />
            {riskBadge && (
              <span className={cn("text-[10px] font-medium", riskBadge.className)}>
                {riskBadge.label}
              </span>
            )}
            {moduleHint && (
              <span className="text-[10px] text-muted-foreground/60 border border-border/60 rounded px-1 py-0.5">
                → {moduleHint}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-medium leading-snug text-foreground">
            {displayTitle}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {item.authorName && (
              <span className="flex items-center gap-1">
                <UserIcon className="size-3" />
                {item.authorName}
              </span>
            )}
            <time>{capturedTime}</time>
            {normalizedContents.length > 0 && (
              <span>{normalizedContents.length} 個標準化段落</span>
            )}
            {proposalCount > 0 && (
              <span className="text-primary">{proposalCount} 則 AI 建議</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {(canRunAnalysis || isProcessing) && onRunAnalysis && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onRunAnalysis(item.id)}
              disabled={isProcessing}
            >
              <SparklesIcon className="size-3" />
              {isProcessing ? "分析中…" : "執行 AI 分析"}
            </Button>
          )}
          {normalizedContents.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUpIcon className="size-3.5" /> : <ChevronDownIcon className="size-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Data lineage pipeline */}
      <div className="border-t border-border/50 bg-muted/20 px-4 py-1.5">
        <DataLineagePipeline reachedStage={lineageStage} />
      </div>

      {/* Expandable normalized content */}
      {expanded && normalizedContents.length > 0 && (
        <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            標準化內容
          </p>
          <NormalizedContentPreview contents={normalizedContents} />
        </div>
      )}
    </div>
  )
}
