"use client"

import { AlertCircleIcon } from "lucide-react"
import { ResearchConcept } from "@/types/research"

const statusColors: Record<string, string> = {
  raw: "bg-muted text-muted-foreground",
  clarifying: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  stable: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  contested: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

const statusLabels: Record<string, string> = {
  raw: "原始",
  clarifying: "釐清中",
  stable: "穩定",
  contested: "有爭議",
}

interface ConceptCardProps {
  concept: ResearchConcept
  definitionCount?: number
}

export function ConceptCard({ concept, definitionCount = 0 }: ConceptCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusColors[concept.status]}`}>
          {statusLabels[concept.status]}
        </span>
        {definitionCount > 0 && (
          <span className="text-[10px] text-muted-foreground">{definitionCount} 個定義</span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground">{concept.name}</h3>
        {concept.aliases && concept.aliases.length > 0 && (
          <p className="text-[10px] text-muted-foreground/70">又稱: {concept.aliases.join(", ")}</p>
        )}
      </div>

      {concept.shortDefinition && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{concept.shortDefinition}</p>
      )}

      {concept.confusionPoints && concept.confusionPoints.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircleIcon className="size-3" /> 容易混淆點
          </div>
          <ul className="space-y-0.5">
            {concept.confusionPoints.slice(0, 2).map((pt, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                <span className="text-amber-500 shrink-0">·</span> {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
