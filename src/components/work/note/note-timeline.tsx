"use client"

import * as React from "react"
import { PlusIcon, ChevronDownIcon, ChevronRightIcon, CheckCircle2Icon, ActivityIcon, ClockIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { addProjectNote, toggleProjectNotePin, deleteProjectNote } from "@/app/actions/work"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NoteItem } from "@/components/work/note/note-item"
import { AddNoteDialog, type AddNoteInput } from "@/components/work/note/add-note-dialog"
import type { ProjectNote, NoteOrigin, ProjectTimeline, ProjectPhaseNode } from "@/types/work"

type SortMode = "newest" | "oldest" | "phase"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const phaseStatusConfig: Record<ProjectPhaseNode["status"], { icon: React.ReactNode; className: string }> = {
  done: {
    icon: <CheckCircle2Icon className="size-3.5 text-emerald-500" />,
    className: "border-emerald-200 dark:border-emerald-800",
  },
  active: {
    icon: <ActivityIcon className="size-3.5 text-blue-500" />,
    className: "border-blue-300 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/20",
  },
  upcoming: {
    icon: <ClockIcon className="size-3.5 text-muted-foreground/50" />,
    className: "border-dashed border-border",
  },
}

function PhaseGroup({
  phaseNode,
  notes,
  onTogglePin,
  onDeleteNote,
  pendingNoteIds,
  deletingNoteIds,
  canToggleNotePin,
}: {
  phaseNode: ProjectPhaseNode
  notes: ProjectNote[]
  onTogglePin: (id: string) => void
  onDeleteNote: (id: string) => void
  pendingNoteIds: Set<string>
  deletingNoteIds: Set<string>
  canToggleNotePin: (note: ProjectNote) => boolean
}) {
  const [expanded, setExpanded] = React.useState(phaseNode.status !== "upcoming")
  const cfg = phaseStatusConfig[phaseNode.status]

  const startLabel = new Date(phaseNode.startDate).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })
  const endLabel = new Date(phaseNode.endDate).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })

  return (
    <div className={cn("rounded-lg border px-3 py-2.5 flex flex-col gap-2", cfg.className)}>
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {cfg.icon}
        <span className="text-sm font-medium flex-1">{phaseNode.label}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {startLabel} – {endLabel}
        </span>
        <span className="text-[11px] text-muted-foreground/60 ml-1">
          {notes.length > 0 ? `${notes.length} 則` : "無紀錄"}
        </span>
        {expanded ? (
          <ChevronDownIcon className="size-3.5 text-muted-foreground/60 shrink-0" />
        ) : (
          <ChevronRightIcon className="size-3.5 text-muted-foreground/60 shrink-0" />
        )}
      </button>

      {expanded && notes.length > 0 && (
        <div className="flex flex-col gap-2 pt-1 border-t border-border/50">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isPending={pendingNoteIds.has(note.id)}
              isDeleting={deletingNoteIds.has(note.id)}
              canTogglePin={canToggleNotePin(note)}
              onTogglePin={onTogglePin}
              onDelete={onDeleteNote}
            />
          ))}
        </div>
      )}

      {expanded && notes.length === 0 && (
        <p className="text-xs text-muted-foreground/50 pt-1 border-t border-border/50">此階段無紀錄</p>
      )}
    </div>
  )
}

interface NoteTimelineProps {
  initialNotes: ProjectNote[]
  projectId: string
  timeline?: ProjectTimeline
}

export function NoteTimeline({ initialNotes, projectId, timeline }: NoteTimelineProps) {
  const router = useRouter()
  const [notes, setNotes] = React.useState<ProjectNote[]>(initialNotes)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [originFilter, setOriginFilter] = React.useState<NoteOrigin | "all">("all")
  const [sortMode, setSortMode] = React.useState<SortMode>("newest")
  const [isAdding, setIsAdding] = React.useState(false)
  const [pendingNoteIds, setPendingNoteIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [deletingNoteIds, setDeletingNoteIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [, startTransition] = React.useTransition()

  function refreshProjectDetail() {
    startTransition(() => router.refresh())
  }

  function canToggleNotePin(note: ProjectNote) {
    return UUID_PATTERN.test(note.id)
  }

  async function handleTogglePin(id: string) {
    if (pendingNoteIds.has(id)) return

    const note = notes.find((n) => n.id === id)
    if (!note) return

    if (!canToggleNotePin(note)) {
      setActionError("此紀錄尚未寫入 Work 資料庫，暫不支援釘選")
      return
    }

    const nextNote: ProjectNote = {
      ...note,
      isPinned: !note.isPinned,
      updatedAt: new Date().toISOString(),
    }

    setActionError(null)
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? nextNote : n))
    )
    setPendingNoteIds((prev) => new Set(prev).add(id))

    try {
      const result = await toggleProjectNotePin(id)

      if (!result.success) {
        setNotes((prev) => prev.map((n) => (n.id === id ? note : n)))
        setActionError(result.error)
        return
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === id ? result.data : n))
      )
      refreshProjectDetail()
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)))
      setActionError("切換釘選狀態失敗，請稍後再試")
    } finally {
      setPendingNoteIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleDeleteNote(id: string) {
    if (deletingNoteIds.has(id)) return

    const note = notes.find((n) => n.id === id)
    if (!note) return

    setActionError(null)
    setDeletingNoteIds((prev) => new Set(prev).add(id))
    setNotes((prev) => prev.filter((n) => n.id !== id))

    try {
      const result = await deleteProjectNote(id)

      if (!result.success) {
        setNotes((prev) => [note, ...prev])
        setActionError(result.error)
      } else {
        refreshProjectDetail()
      }
    } catch {
      setNotes((prev) => [note, ...prev])
      setActionError("刪除紀錄失敗，請稍後再試")
    } finally {
      setDeletingNoteIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleAddNote(note: AddNoteInput) {
    if (isAdding) return false

    setActionError(null)
    setIsAdding(true)

    try {
      const result = await addProjectNote(projectId, {
        ...note,
        visibility: "internal",
      })

      if (!result.success) {
        setActionError(result.error)
        return false
      }

      setNotes((prev) => [result.data, ...prev])
      refreshProjectDetail()
      return true
    } catch {
      setActionError("新增紀錄失敗，請稍後再試")
      return false
    } finally {
      setIsAdding(false)
    }
  }

  const filtered = notes.filter((n) => originFilter === "all" || n.origin === originFilter)

  const pinned = filtered.filter((n) => n.isPinned)
  const rest = filtered.filter((n) => !n.isPinned)

  const sortedRest =
    sortMode === "newest"
      ? [...rest].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : sortMode === "oldest"
        ? [...rest].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : rest

  function getNotesForPhase(phase: ProjectPhaseNode): ProjectNote[] {
    const start = new Date(phase.startDate).getTime()
    const end = new Date(phase.endDate + "T23:59:59Z").getTime()
    return filtered
      .filter((n) => {
        const t = new Date(n.createdAt).getTime()
        return t >= start && t <= end
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  const aiCount = notes.filter((n) => n.origin === "ai").length
  const manualCount = notes.filter((n) => n.origin === "manual").length

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {actionError}
        </p>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{filtered.length} 則紀錄</span>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            setActionError(null)
            setDialogOpen(true)
          }}
        >
          <PlusIcon className="size-3.5" />
          新增紀錄
        </Button>
      </div>

      {/* Origin filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 w-fit">
        {(["all", "manual", "ai"] as const).map((o) => {
          const label = o === "all" ? `全部 ${notes.length}` : o === "ai" ? `AI生成 ${aiCount}` : `手動 ${manualCount}`
          return (
            <button
              key={o}
              onClick={() => setOriginFilter(o)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                originFilter === o
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Sort control */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">排序：</span>
        <div className="flex items-center gap-1">
          {([
            { key: "newest", label: "最新" },
            { key: "oldest", label: "最舊" },
            ...(timeline ? [{ key: "phase", label: "依階段" }] : []),
          ] as { key: SortMode; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortMode(key)}
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
                sortMode === key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">還沒有紀錄</p>
          <p className="text-xs text-muted-foreground/60 mt-1">從 Cmd+K 擷取後歸入，或手動新增</p>
        </div>
      ) : sortMode === "phase" && timeline ? (
        <div className="flex flex-col gap-2">
          {timeline.phases.map((phase) => (
            <PhaseGroup
              key={phase.phase}
              phaseNode={phase}
              notes={getNotesForPhase(phase)}
              pendingNoteIds={pendingNoteIds}
              deletingNoteIds={deletingNoteIds}
              canToggleNotePin={canToggleNotePin}
              onTogglePin={(id) => void handleTogglePin(id)}
              onDeleteNote={(id) => void handleDeleteNote(id)}
            />
          ))}
          {/* Notes outside phase windows */}
          {(() => {
            const allPhaseNotes = timeline.phases.flatMap(getNotesForPhase)
            const phaseNoteIds = new Set(allPhaseNotes.map((n) => n.id))
            const orphans = filtered.filter((n) => !phaseNoteIds.has(n.id))
            if (orphans.length === 0) return null
            return (
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-[11px] text-muted-foreground/60 pl-1">階段外紀錄</p>
                {orphans.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isPending={pendingNoteIds.has(note.id)}
                    isDeleting={deletingNoteIds.has(note.id)}
                    canTogglePin={canToggleNotePin(note)}
                    onTogglePin={(id) => void handleTogglePin(id)}
                    onDelete={(id) => void handleDeleteNote(id)}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pinned.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isPending={pendingNoteIds.has(note.id)}
              canTogglePin={canToggleNotePin(note)}
              onTogglePin={(id) => void handleTogglePin(id)}
              onDelete={(id) => void handleDeleteNote(id)}
            />
          ))}
          {sortedRest.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isPending={pendingNoteIds.has(note.id)}
              canTogglePin={canToggleNotePin(note)}
              onTogglePin={(id) => void handleTogglePin(id)}
              onDelete={(id) => void handleDeleteNote(id)}
            />
          ))}
        </div>
      )}

      <AddNoteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAddNote}
        isSaving={isAdding}
        error={actionError}
      />
    </div>
  )
}
