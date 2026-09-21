"use client"

import { QuoteIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { Evidence } from "@/types/ingestion"

interface EvidenceListProps {
  evidences: Evidence[]
  className?: string
}

export function EvidenceList({ evidences, className }: EvidenceListProps) {
  const { copy } = useProductLanguage()

  if (evidences.length === 0) return null

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <QuoteIcon className="size-3" />
        {copy.inbox.proposalCard.evidenceTitleTemplate.replace(
          "{count}",
          String(evidences.length)
        )}
      </div>
      <div className="flex flex-col gap-2">
        {evidences.map((ev) => (
          <div key={ev.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-xs text-foreground/80 leading-relaxed italic">
              「{ev.excerpt}」
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {copy.inbox.proposalCard.evidenceReasonPrefix}{ev.reasonUsed}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
