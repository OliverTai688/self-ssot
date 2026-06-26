"use client"

import { LinkIcon, HelpCircleIcon, ArchiveIcon } from "lucide-react"
import { ResearchIdeaV2 } from "@/types/research"
import { Button } from "@/components/ui/button"

const ideaTypeColors: Record<string, string> = {
  concept: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  hypothesis: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  question: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  observation: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  connection: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

const ideaTypeLabels: Record<string, string> = {
  concept: "概念",
  hypothesis: "假設",
  question: "問題",
  observation: "觀察",
  connection: "關聯",
}

const contextLabels: Record<string, string> = {
  manual: "手動輸入",
  meeting: "會議",
  workshop: "工作坊",
  reading: "閱讀",
  voice_note: "語音筆記",
  ai_chat: "AI 對話",
}

const statusColors: Record<string, string> = {
  inbox: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  linked: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  developing: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  archived: "bg-muted text-muted-foreground",
}

interface IdeaCaptureCardProps {
  idea: ResearchIdeaV2
  onLinkToIssue?: (ideaId: string) => void
  onConvertToQuestion?: (ideaId: string) => void
  onArchive?: (ideaId: string) => void
}

export function IdeaCaptureCard({ idea, onLinkToIssue, onConvertToQuestion, onArchive }: IdeaCaptureCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ideaTypeColors[idea.ideaType]}`}>
            {ideaTypeLabels[idea.ideaType]}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[idea.status]}`}>
            {idea.status === "inbox" ? "Inbox" : idea.status === "linked" ? "已關聯" : idea.status === "developing" ? "發展中" : "已封存"}
          </span>
          {idea.sourceContext && (
            <span className="text-[10px] text-muted-foreground/70">來自: {contextLabels[idea.sourceContext]}</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/50 shrink-0">
          {new Date(idea.createdAt).toLocaleDateString("zh-TW")}
        </span>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xs font-bold text-foreground">{idea.title}</h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">{idea.body}</p>
      </div>

      {idea.linkedProjectName && (
        <div className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          工作連結: {idea.linkedProjectName}
        </div>
      )}

      {(onLinkToIssue || onConvertToQuestion || onArchive) && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
          {onLinkToIssue && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => onLinkToIssue(idea.id)}>
              <LinkIcon className="size-3" /> 連到議題
            </Button>
          )}
          {onConvertToQuestion && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={() => onConvertToQuestion(idea.id)}>
              <HelpCircleIcon className="size-3" /> 轉為問題
            </Button>
          )}
          {onArchive && idea.status !== "archived" && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 gap-1 text-muted-foreground" onClick={() => onArchive(idea.id)}>
              <ArchiveIcon className="size-3" /> 封存
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
