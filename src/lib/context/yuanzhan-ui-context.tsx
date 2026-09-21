"use client"

import * as React from "react"
import type { ActorId, Kind, OperatingRecord, OperatingState, Space, View } from "@/types/yuanzhan-ui"
import { canRead, putRecord, removeRecord, updateProgress, visibleRecords } from "@/lib/ui-data/yuanzhan/commands"

type Context = {
  drafts: Record<string, string>; setDraft: (key: string, value: string) => void
  state: OperatingState; actor: ActorId; space: Space; view: View; tab: string
  records: OperatingRecord[]; selected: string | null; notice: string
  setActor: (actor: ActorId) => void; setSpace: (space: Space) => void
  navigate: (view: View, tab?: string) => void; setTab: (tab: string) => void
  open: (id: string | null) => void; save: (record: OperatingRecord) => boolean
  remove: (id: string) => boolean; progress: (id: string, status: string) => void
  make: (kind: Kind, fields?: Partial<OperatingRecord>) => OperatingRecord
  transact: (fn: (state: OperatingState) => OperatingState) => boolean
  notify: (text: string) => void; undo: () => void; canUndo: boolean
}
const OperatingContext = React.createContext<Context | null>(null)
export function OperatingProvider({ initialState, children }: { initialState: OperatingState; children: React.ReactNode }) {
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const setDraft = (key: string, value: string) => setDrafts(previous => ({ ...previous, [key]: value }))
  const [state, setState] = React.useState(initialState)
  const stateRef = React.useRef(state)
  const [actor, updateActor] = React.useState<ActorId>("yuxing")
  const [space, updateSpace] = React.useState<Space>("team")
  const [view, setView] = React.useState<View>("journal")
  const [tab, setTab] = React.useState("")
  const [selected, open] = React.useState<string | null>(null)
  const [notice, notify] = React.useState("")
  const [history, setHistory] = React.useState<OperatingState[]>([])
  const transact = React.useCallback((fn: (state: OperatingState) => OperatingState) => {
    try {
      const previous = stateRef.current
      const next = fn(previous)
      setHistory(h => [...h.slice(-29), previous]); stateRef.current = next; setState(next)
      return true
    } catch (error) { notify(error instanceof Error ? error.message : "操作失敗，請再試一次。"); return false }
  }, [])
  function setActor(next: ActorId) { updateActor(next); open(null); setHistory([]); notify("") }
  function setSpace(next: Space) { updateSpace(next); setView("journal"); setTab(""); open(null); notify("") }
  function navigate(next: View, nextTab = "") { setView(next); setTab(nextTab); open(null); notify("") }
  function save(record: OperatingRecord) { return transact(s => putRecord(s, record, actor, new Date().toISOString())) }
  function remove(id: string) {
    const success = transact(s => removeRecord(s, id, actor))
    if (success) { open(null); notify("已刪除，可使用復原。") }
    return success
  }
  function make(kind: Kind, fields: Partial<OperatingRecord> = {}): OperatingRecord {
    return { id: `${kind}-${crypto.randomUUID()}`, kind, title: "", space, author: actor, date: state.referenceDate, visibility: space === "personal" ? "private" : "team", ...fields }
  }
  function undo() {
    const previous = history.at(-1)
    if (previous) { stateRef.current = previous; setState(previous); setHistory(h => h.slice(0, -1)); notify("已復原上一步操作。") }
  }
  const records = visibleRecords(state, actor, space)
  const safeSelected = selected && records.some(r => r.id === selected && canRead(r, actor, state.records)) ? selected : null
  return <OperatingContext.Provider value={{ drafts, setDraft, state, records, actor, space, view, tab, selected: safeSelected, notice, setActor, setSpace, navigate, setTab, open, save, remove, make, transact, notify, undo, canUndo: history.length > 0, progress: (id, status) => { transact(s => updateProgress(s, id, actor, status, state.referenceDate)) } }}>{children}</OperatingContext.Provider>
}
export function useOperating() {
  const context = React.useContext(OperatingContext)
  if (!context) throw new Error("OperatingProvider missing")
  return context
}

export function useOperatingDraft(editorKey: string) {
  const { drafts, setDraft, actor, space } = useOperating()
  const key = `${space}:${actor}:${editorKey}`
  return [drafts[key] ?? "", (value: string) => setDraft(key, value)] as const
}
