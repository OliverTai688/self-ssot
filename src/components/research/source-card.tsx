"use client"

import { ExternalLinkIcon } from "lucide-react"
import { ResearchSource } from "@/types/research"

const reliabilityColors: Record<string, string> = {
  primary: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  secondary: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  informal: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  personal_observation: "bg-muted text-muted-foreground border-border",
}

const reliabilityLabels: Record<string, string> = {
  primary: "原始文獻",
  secondary: "二手文獻",
  informal: "非正式",
  personal_observation: "個人觀察",
}

const statusColors: Record<string, string> = {
  unprocessed: "bg-muted text-muted-foreground",
  summarized: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  annotated: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  used_in_writing: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
}

const statusLabels: Record<string, string> = {
  unprocessed: "未處理",
  summarized: "已摘要",
  annotated: "已標注",
  used_in_writing: "已引用",
}

interface SourceCardProps {
  source: ResearchSource
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded capitalize">
            {source.sourceType.replace(/_/g, " ")}
          </span>
          {source.sourceReliability && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${reliabilityColors[source.sourceReliability]}`}>
              {reliabilityLabels[source.sourceReliability]}
            </span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[source.status]}`}>
            {statusLabels[source.status]}
          </span>
        </div>
        {source.url && (
          <a href={source.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            <ExternalLinkIcon className="size-3.5 text-muted-foreground hover:text-primary transition-colors shrink-0" />
          </a>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{source.title}</h3>
        {source.authors && source.authors.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {source.authors.join(", ")}{source.year ? ` (${source.year})` : ""}
          </p>
        )}
      </div>

      {source.summary && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{source.summary}</p>
      )}

      {(source.region || source.country || source.language) && (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
          {source.region && <span>{source.region}</span>}
          {source.country && <span>{source.country}</span>}
          {source.language && <span>· {source.language}</span>}
        </div>
      )}
    </div>
  )
}
