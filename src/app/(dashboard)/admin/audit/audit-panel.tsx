"use client"

import * as React from "react"
import { FlagIcon, MessageSquarePlusIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DetailList, DetailListRow, EmptyRow, FormDialog, PanelHeader } from "@/components/owneros/control-plane-shell"
import { useLocalEntities } from "@/lib/owneros/use-local-entities"

interface AuditEntry {
  id: string
  actor: string
  action: string
  target: string
  occurredAt: string
  flagged: boolean
  notes: string[]
}

const seedEntries: AuditEntry[] = []

/**
 * Audit trail. Deliberately NOT full CRUD: entries are append-only by
 * design (editing or deleting a log defeats its purpose), so the real,
 * working actions here are search/filter, "flag for review" (an update on
 * the entry's own review state), and "add investigation note" (an append,
 * not an edit, of the entry's immutable action/actor/target). Backed by the
 * same local store as everywhere else, ready to point at a real audit API.
 */
export function AuditPanel() {
  const entries = useLocalEntities<AuditEntry>(seedEntries, { storageKey: "admin-audit-entries" })
  const [query, setQuery] = React.useState("")
  const [noteTarget, setNoteTarget] = React.useState<AuditEntry | null>(null)
  const [noteText, setNoteText] = React.useState("")

  const filtered = entries.items.filter((entry) => {
    if (!query.trim()) return true
    const haystack = `${entry.actor} ${entry.action} ${entry.target}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <section className="rounded-lg border bg-background">
      <PanelHeader
        title="事件紀錄"
        description="唯讀、可追溯的紀錄；可標記待審或附加調查備註，但不能編輯或刪除既有事件。"
        count={entries.items.length}
        action={
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋 actor / action / target"
              className="h-7 w-56 pl-7 text-xs"
            />
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyRow label={entries.items.length === 0 ? "尚無事件紀錄。" : "沒有符合搜尋條件的事件。"} />
      ) : (
        <DetailList className="border-none">
          {filtered.map((entry) => (
            <DetailListRow
              key={entry.id}
              label={`${entry.actor} · ${entry.action}`}
              status={entry.flagged ? "已標記" : undefined}
              tone={entry.flagged ? "warn" : "neutral"}
              summary={`${entry.target} · ${new Date(entry.occurredAt).toLocaleString("zh-TW")}`}
              detailTitle={entry.action}
              detail={
                <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Actor</span>: {entry.actor}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Target</span>: {entry.target}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">時間</span>: {new Date(entry.occurredAt).toLocaleString("zh-TW")}
                  </p>
                  {entry.notes.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground">調查備註</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {entry.notes.map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              }
              trailing={
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={entry.flagged ? "取消標記" : "標記待審"}
                    title={entry.flagged ? "取消標記" : "標記待審"}
                    onClick={() => void entries.update(entry.id, { flagged: !entry.flagged })}
                  >
                    <FlagIcon className={entry.flagged ? "size-4 text-amber-600" : "size-4 text-muted-foreground"} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="新增備註"
                    title="新增備註"
                    onClick={() => { setNoteTarget(entry); setNoteText("") }}
                  >
                    <MessageSquarePlusIcon className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              }
            />
          ))}
        </DetailList>
      )}

      <FormDialog
        open={noteTarget !== null}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        title="新增調查備註"
        description="備註會附加到事件上，原始 actor/action/target 不會被改寫。"
        submitLabel="新增備註"
        isPending={entries.isPending}
        submitDisabled={!noteText.trim()}
        onSubmit={() => {
          if (!noteTarget) return
          void entries
            .update(noteTarget.id, { notes: [...noteTarget.notes, noteText.trim()] })
            .then(() => setNoteTarget(null))
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="audit-note">備註</Label>
          <Textarea
            id="audit-note"
            placeholder="這個事件為什麼需要留意？"
            value={noteText}
            onChange={(event) => setNoteText(event.target.value)}
          />
        </div>
      </FormDialog>
    </section>
  )
}
