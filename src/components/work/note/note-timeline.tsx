"use client"

import * as React from "react"
import { PlusIcon, ChevronDownIcon, ChevronRightIcon, CheckCircle2Icon, ActivityIcon, ClockIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { addProjectNote, toggleProjectNotePin, deleteProjectNote } from "@/app/actions/work"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NoteItem } from "@/components/work/note/note-item"
import { AddNoteDialog, type AddNoteInput } from "@/components/work/note/add-note-dialog"
import { useProductLanguage } from "@/lib/context/product-language-context"
import type { ProjectNote, NoteOrigin, ProjectTimeline, ProjectPhaseNode } from "@/types/work"

type SortMode = "newest" | "oldest" | "phase"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

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
  const { copy, locale } = useProductLanguage()
  const noteCopy = copy.work.notes
  const dateLocale = locale === "zh-TW" ? "zh-TW" : "en-US"
  const [expanded, setExpanded] = React.useState(phaseNode.status !== "upcoming")
  const cfg = phaseStatusConfig[phaseNode.status]

  const startLabel = new Date(phaseNode.startDate).toLocaleDateString(dateLocale, { month: "numeric", day: "numeric" })
  const endLabel = new Date(phaseNode.endDate).toLocaleDateString(dateLocale, { month: "numeric", day: "numeric" })

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
          {notes.length > 0
            ? formatCopy(noteCopy.phaseNoteCountTemplate, { count: notes.length })
            : noteCopy.noNotes}
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
        <p className="text-xs text-muted-foreground/50 pt-1 border-t border-border/50">
          {noteCopy.phaseEmpty}
        </p>
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
  const { copy } = useProductLanguage()
  const noteCopy = copy.work.notes
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
      setActionError(noteCopy.errors.pinUnavailable)
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
        setActionError(noteCopy.errors.togglePin)
        return
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === id ? result.data : n))
      )
      refreshProjectDetail()
    } catch {
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)))
      setActionError(noteCopy.errors.togglePin)
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
        setActionError(noteCopy.errors.delete)
      } else {
        refreshProjectDetail()
      }
    } catch {
      setNotes((prev) => [note, ...prev])
      setActionError(noteCopy.errors.delete)
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
        setActionError(noteCopy.errors.add)
        return false
      }

      setNotes((prev) => [result.data, ...prev])
      refreshProjectDetail()
      return true
    } catch {
      setActionError(noteCopy.errors.add)
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
        <span className="text-xs text-muted-foreground">
          {formatCopy(noteCopy.summaryTemplate, { count: filtered.length })}
        </span>
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
          {noteCopy.actions.add}
        </Button>
      </div>

      {/* Origin filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5 w-fit">
        {(["all", "manual", "ai"] as const).map((o) => {
          const label =
            o === "all"
              ? formatCopy(noteCopy.filters.allTemplate, { count: notes.length })
              : o === "ai"
                ? formatCopy(noteCopy.filters.aiTemplate, { count: aiCount })
                : formatCopy(noteCopy.filters.manualTemplate, { count: manualCount })
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
        <span className="text-[11px] text-muted-foreground">{noteCopy.sort.label}</span>
        <div className="flex items-center gap-1">
          {([
            { key: "newest", label: noteCopy.sort.newest },
            { key: "oldest", label: noteCopy.sort.oldest },
            ...(timeline ? [{ key: "phase", label: noteCopy.sort.phase }] : []),
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
          <p className="text-sm text-muted-foreground">{noteCopy.emptyTitle}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{noteCopy.emptyBody}</p>
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
                <p className="text-[11px] text-muted-foreground/60 pl-1">
                  {noteCopy.outsidePhase}
                </p>
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
