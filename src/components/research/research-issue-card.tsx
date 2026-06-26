"use client"

import Link from "next/link"
import { ArrowRightIcon, BookOpenIcon, LightbulbIcon, PenLineIcon } from "lucide-react"
import { ResearchIssue } from "@/types/research"

const statusColors: Record<string, string> = {
  exploring: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  writing: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  published: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  paused: "bg-muted text-muted-foreground border-border",
}

const statusLabels: Record<string, string> = {
  exploring: "探索中",
  active: "進行中",
  writing: "撰寫中",
  submitted: "已投稿",
  published: "已發表",
  paused: "暫停",
}

interface ResearchIssueCardProps {
  issue: ResearchIssue
  questionCount?: number
  sourceCount?: number
  writingCount?: number
}

export function ResearchIssueCard({ issue, questionCount = 0, sourceCount = 0, writingCount = 0 }: ResearchIssueCardProps) {
  return (
    <Link
      href={`/research/issues/${issue.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary/25 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusColors[issue.status]}`}>
          {statusLabels[issue.status]}
        </span>
        <ArrowRightIcon className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">{issue.title}</h3>
        {issue.mainResearchQuestion && (
          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">
            &ldquo;{issue.mainResearchQuestion}&rdquo;
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {issue.keywords.slice(0, 5).map((kw) => (
          <span key={kw} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            {kw}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-1 border-t border-border/50 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <LightbulbIcon className="size-3" /> {questionCount} 問題
        </span>
        <span className="flex items-center gap-1">
          <BookOpenIcon className="size-3" /> {sourceCount} 來源
        </span>
        <span className="flex items-center gap-1">
          <PenLineIcon className="size-3" /> {writingCount} 寫作
        </span>
      </div>
    </Link>
  )
}
