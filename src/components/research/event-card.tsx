"use client"

import { CalendarIcon, ExternalLinkIcon, StarIcon } from "lucide-react"
import { ResearchEvent } from "@/types/research"

const eventTypeLabels: Record<string, string> = {
  conference: "研討會",
  workshop: "工作坊",
  seminar: "演講",
  summer_school: "暑期學校",
  webinar: "線上研討",
}

const modeLabels: Record<string, string> = {
  submit_paper: "投稿論文",
  submit_poster: "投稿海報",
  attend: "參與",
  ask_question: "提問",
  networking: "交流",
}

interface EventCardProps {
  event: ResearchEvent
}

export function EventCard({ event }: EventCardProps) {
  const deadline = event.submissionDeadline ? new Date(event.submissionDeadline) : null
  const now = new Date()
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / 86400000) : null
  const isPast = daysLeft !== null && daysLeft < 0

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
            {eventTypeLabels[event.eventType]}
          </span>
          {event.isOnline ? (
            <span className="text-[10px] text-blue-600 dark:text-blue-400">線上</span>
          ) : event.location ? (
            <span className="text-[10px] text-muted-foreground">{event.location}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {event.fitScore !== undefined && (
            <div className="flex items-center gap-0.5">
              <StarIcon className="size-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{event.fitScore}</span>
            </div>
          )}
          {event.url && (
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </a>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{event.name}</h3>
        <div className="flex flex-wrap gap-1">
          {event.fields.slice(0, 4).map((f) => (
            <span key={f} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{f}</span>
          ))}
        </div>
      </div>

      {event.aiFitReason && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 italic">{event.aiFitReason}</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <CalendarIcon className="size-3" />
          {deadline ? (
            <span>投稿截止: {deadline.toLocaleDateString("zh-TW")}</span>
          ) : (
            <span>無截止日</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {daysLeft !== null && (
            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${isPast ? "bg-muted text-muted-foreground" : daysLeft <= 14 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
              {isPast ? "已截止" : `剩 ${daysLeft} 天`}
            </span>
          )}
          {event.suggestedParticipationMode && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              {modeLabels[event.suggestedParticipationMode]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
