import { QuoteIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Evidence } from "@/types/ingestion"

interface EvidenceListProps {
  evidences: Evidence[]
  className?: string
}

export function EvidenceList({ evidences, className }: EvidenceListProps) {
  if (evidences.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <QuoteIcon className="size-3" />
        AI 使用的原文依據（{evidences.length} 段）
      </div>
      <div className="flex flex-col gap-2">
        {evidences.map((ev) => (
          <div key={ev.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-xs text-foreground/80 leading-relaxed italic">
              「{ev.excerpt}」
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              依據：{ev.reasonUsed}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
