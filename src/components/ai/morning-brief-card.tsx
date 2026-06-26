"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon, ExternalLinkIcon, CalendarIcon, MessageCircleIcon, FolderIcon, UserIcon, ListChecksIcon } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { ConfidencePip } from "@/components/ai/confidence-pip"
import type { AICard, AICardSource } from "@/types/ai"

interface MorningBriefCardProps {
  card: AICard
  index: number
}

function sourceIcon(type: AICardSource["type"]) {
  switch (type) {
    case "line": return <MessageCircleIcon className="size-3 shrink-0" />
    case "calendar": return <CalendarIcon className="size-3 shrink-0" />
    case "contact": return <UserIcon className="size-3 shrink-0" />
    case "task": return <ListChecksIcon className="size-3 shrink-0" />
    default: return <FolderIcon className="size-3 shrink-0" />
  }
}

export function MorningBriefCard({ card, index }: MorningBriefCardProps) {
  const [reasoningOpen, setReasoningOpen] = React.useState(false)

  const entityLink =
    card.relatedEntityType === "project" && card.relatedEntityId
      ? `/work/${card.relatedEntityId}`
      : card.relatedEntityType === "contact" && card.relatedEntityId
        ? `/chamber`
        : null

  return (
    <div className="flex gap-4">
      {/* Index number */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground mt-0.5">
        {index}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug">{card.title}</p>
          <ConfidencePip confidence={card.confidence} />
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">{card.summary}</p>

        <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          {card.recommendation}
        </div>

        {/* Source attribution */}
        {card.sources && card.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/60">資料來源：</span>
            {card.sources.map((src, i) =>
              src.href ? (
                <Link
                  key={i}
                  href={src.href}
                  className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {sourceIcon(src.type)}
                  {src.label}
                </Link>
              ) : (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {sourceIcon(src.type)}
                  {src.label}
                </span>
              )
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setReasoningOpen((v) => !v)}
          >
            {reasoningOpen ? <ChevronUpIcon className="size-3" /> : <ChevronDownIcon className="size-3" />}
            AI 怎麼判斷的
          </button>

          {entityLink && card.relatedEntityName && (
            <Link
              href={entityLink}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              前往 {card.relatedEntityName}
              <ExternalLinkIcon className="size-3" />
            </Link>
          )}
        </div>

        {reasoningOpen && (
          <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
            {card.reasoning}
          </p>
        )}

        {/* Divider */}
        <div className="mt-1 border-b border-border/50" />
      </div>
    </div>
  )
}
