"use client"

import { ExternalLinkIcon, MessageSquareIcon } from "lucide-react"
import { AcademicPerson } from "@/types/research"

const roleColors: Record<string, string> = {
  author: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  chair: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  session_chair: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  keynote: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  editor: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  reviewer: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

const roleLabels: Record<string, string> = {
  author: "作者",
  chair: "主席",
  session_chair: "場次主席",
  keynote: "主題演講",
  editor: "編輯",
  reviewer: "審稿人",
}

interface AcademicPersonCardProps {
  person: AcademicPerson
}

export function AcademicPersonCard({ person }: AcademicPersonCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {person.role && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${roleColors[person.role]}`}>
              {roleLabels[person.role]}
            </span>
          )}
          {person.country && <span className="text-[10px] text-muted-foreground">{person.country}</span>}
        </div>
        {person.profileUrl && (
          <a href={person.profileUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon className="size-3.5 text-muted-foreground hover:text-primary transition-colors shrink-0" />
          </a>
        )}
      </div>

      <div className="space-y-0.5">
        <h3 className="text-sm font-bold text-foreground">{person.name}</h3>
        {person.affiliation && (
          <p className="text-[11px] text-muted-foreground">{person.affiliation}</p>
        )}
      </div>

      {person.researchAreas && person.researchAreas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {person.researchAreas.map((area) => (
            <span key={area} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {area}
            </span>
          ))}
        </div>
      )}

      {person.relevanceToMyResearch && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {person.relevanceToMyResearch}
        </p>
      )}

      {person.conversationAngles && person.conversationAngles.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <MessageSquareIcon className="size-3" /> 交流切入點
          </div>
          <ul className="space-y-0.5">
            {person.conversationAngles.slice(0, 2).map((angle, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                <span className="text-primary shrink-0">·</span> {angle}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
