"use client"

import Link from "next/link"
import { ArrowRightIcon, SparklesIcon } from "lucide-react"
import { ResearchWritingProject } from "@/types/research"

const statusColors: Record<string, string> = {
  idea: "bg-muted text-muted-foreground",
  outline: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  drafting: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  reviewing: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  submitted: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  accepted: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

const statusLabels: Record<string, string> = {
  idea: "想法",
  outline: "大綱中",
  drafting: "草稿中",
  reviewing: "評審中",
  submitted: "已投稿",
  accepted: "已錄取",
  rejected: "已拒稿",
}

const typeLabels: Record<string, string> = {
  paper: "期刊論文",
  conference_paper: "研討會論文",
  proposal: "研究計劃",
  poster: "海報",
  presentation: "簡報",
  essay: "散文/評論",
}

interface WritingProjectCardProps {
  project: ResearchWritingProject
  latestFeedbackSummary?: string
}

export function WritingProjectCard({ project, latestFeedbackSummary }: WritingProjectCardProps) {
  return (
    <Link
      href={`/research/writing/${project.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/25 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
            {typeLabels[project.writingType] || project.writingType}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusColors[project.status]}`}>
            {statusLabels[project.status]}
          </span>
        </div>
        <ArrowRightIcon className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{project.title}</h3>
        {project.targetVenueName && (
          <p className="text-[11px] text-muted-foreground">目標: {project.targetVenueName}</p>
        )}
      </div>

      {project.thesisStatement && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {project.thesisStatement}
        </p>
      )}

      {latestFeedbackSummary && (
        <div className="flex items-start gap-1.5 rounded-lg bg-primary/[0.04] px-2.5 py-2 border border-primary/10">
          <SparklesIcon className="size-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{latestFeedbackSummary}</p>
        </div>
      )}
    </Link>
  )
}
