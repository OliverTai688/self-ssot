"use client"

import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type LineageStage = "raw" | "normalized" | "evidence" | "proposal" | "decision"

interface DataLineagePipelineProps {
  /** Which stages have been reached (inclusive) */
  reachedStage: LineageStage
  className?: string
}

const STAGES: { key: LineageStage; label: string }[] = [
  { key: "raw", label: "原始" },
  { key: "normalized", label: "標準化" },
  { key: "evidence", label: "證據" },
  { key: "proposal", label: "提案" },
  { key: "decision", label: "決策" },
]

const STAGE_ORDER: Record<LineageStage, number> = {
  raw: 0, normalized: 1, evidence: 2, proposal: 3, decision: 4,
}

export function DataLineagePipeline({ reachedStage, className }: DataLineagePipelineProps) {
  const reachedIndex = STAGE_ORDER[reachedStage]

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {STAGES.map((stage, i) => {
        const done = i <= reachedIndex
        const current = i === reachedIndex
        return (
          <div key={stage.key} className="flex items-center gap-0.5">
            <div
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                done
                  ? current
                    ? "bg-foreground text-background"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "text-muted-foreground/40"
              )}
            >
              {done && !current && <CheckIcon className="size-2.5 shrink-0" />}
              {stage.label}
            </div>
            {i < STAGES.length - 1 && (
              <span className={cn(
                "text-[10px] select-none",
                i < reachedIndex ? "text-emerald-400/60" : "text-muted-foreground/20"
              )}>
                →
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
