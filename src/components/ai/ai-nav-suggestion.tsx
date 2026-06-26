import Link from "next/link"
import { ArrowRightIcon, FileTextIcon, FolderIcon, ListTodoIcon, StickyNoteIcon, TabletIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { AiNavSuggestion } from "@/lib/mock/ai-panel/mock-responses"

const typeIcons = {
  task: ListTodoIcon,
  note: StickyNoteIcon,
  project: FolderIcon,
  tab: TabletIcon,
  page: FileTextIcon,
}

interface AiNavSuggestionCardProps {
  suggestion: AiNavSuggestion
  className?: string
}

export function AiNavSuggestionCard({ suggestion, className }: AiNavSuggestionCardProps) {
  const Icon = typeIcons[suggestion.type]
  return (
    <Link
      href={suggestion.href}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs hover:bg-muted transition-colors group",
        className
      )}
    >
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <span className="flex-1 text-foreground/80 leading-snug">{suggestion.label}</span>
      {suggestion.context && (
        <span className="text-muted-foreground/60 hidden group-hover:block">{suggestion.context}</span>
      )}
      <ArrowRightIcon className="size-3 text-muted-foreground shrink-0" />
    </Link>
  )
}
