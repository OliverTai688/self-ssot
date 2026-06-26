"use client"

import { EyeIcon, Loader2Icon, MailIcon, MessageCircleIcon, PinIcon, SparklesIcon, StickyNoteIcon, Trash2Icon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { ProjectNote, NoteSource } from "@/types/work"

const sourceConfig: Record<NoteSource, { label: string; Icon: React.ElementType; className: string }> = {
  line: {
    label: "LINE",
    Icon: MessageCircleIcon,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  email: {
    label: "Email",
    Icon: MailIcon,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  meeting: {
    label: "會議",
    Icon: UsersIcon,
    className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  internal: {
    label: "內部",
    Icon: StickyNoteIcon,
    className: "bg-muted text-muted-foreground",
  },
}

interface NoteItemProps {
  note: ProjectNote
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
  isPending?: boolean
  isDeleting?: boolean
  canTogglePin?: boolean
}

export function NoteItem({ note, onTogglePin, onDelete, isPending = false, isDeleting = false, canTogglePin = true }: NoteItemProps) {
  const { label, Icon, className } = sourceConfig[note.source]
  const preview = note.body.length > 120 ? note.body.slice(0, 120) + "…" : note.body

  return (
    <div
      className={cn(
        "group flex flex-col gap-2 rounded-lg border border-border p-3 transition-opacity",
        note.isPinned && "border-primary/30 bg-primary/5",
        (isPending || isDeleting) && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", className)}>
            <Icon className="size-3" />
            {label}
          </span>
          {note.origin === "ai" && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
              <SparklesIcon className="size-3" />
              AI 生成
            </span>
          )}
          {note.visibility === "client_visible" && (
            <Badge variant="outline" className="text-[10px] h-4 gap-0.5 border-blue-300/60 text-blue-600 dark:text-blue-400">
              <EyeIcon className="size-2.5" />
              客戶可見
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onTogglePin(note.id)}
            title={!canTogglePin ? "此紀錄暫不支援釘選" : note.isPinned ? "取消置頂" : "置頂"}
            disabled={isPending || !canTogglePin}
            className={cn(
              "p-1 rounded-md transition-colors",
              note.isPinned
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-muted-foreground",
              (isPending || !canTogglePin) && "cursor-not-allowed opacity-50 hover:text-muted-foreground/40"
            )}
          >
            {isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PinIcon className={cn("size-3.5", note.isPinned && "fill-primary")} />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            disabled={isPending || isDeleting}
            title="刪除紀錄"
            className={cn(
              "p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100",
              "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10",
              (isPending || isDeleting) && "cursor-not-allowed"
            )}
          >
            {isDeleting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <Trash2Icon className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      {note.title && (
        <p className="text-xs font-medium text-foreground/90">{note.title}</p>
      )}

      <p className="text-sm text-foreground/80 leading-relaxed">{preview}</p>

      <p className="text-[11px] text-muted-foreground/60">
        {new Date(note.createdAt).toLocaleDateString("zh-TW", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  )
}
