"use client"

import * as React from "react"
import { BookOpenIcon, PlusIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { SourceCard } from "@/components/research/source-card"
import { Button } from "@/components/ui/button"
import { ResearchSourceType } from "@/types/research"

const sourceTypeOptions: { value: ResearchSourceType | "all"; label: string }[] = [
  { value: "all", label: "全部類型" },
  { value: "paper", label: "論文" },
  { value: "book", label: "書籍" },
  { value: "article", label: "文章" },
  { value: "conference_record", label: "研討會紀錄" },
  { value: "meeting_record", label: "會議紀錄" },
  { value: "institution_report", label: "機構報告" },
  { value: "dataset", label: "資料集" },
  { value: "website", label: "網站" },
  { value: "personal_note", label: "個人筆記" },
]

const statusOptions = [
  { value: "all", label: "全部狀態" },
  { value: "unprocessed", label: "未處理" },
  { value: "summarized", label: "已摘要" },
  { value: "annotated", label: "已標注" },
  { value: "used_in_writing", label: "已引用" },
]

export default function SourcesPage() {
  const { sources, concepts, addSource } = useResearch()

  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [newType, setNewType] = React.useState<ResearchSourceType>("paper")
  const [newAuthors, setNewAuthors] = React.useState("")
  const [newYear, setNewYear] = React.useState("")
  const [newUrl, setNewUrl] = React.useState("")
  const [filterType, setFilterType] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")

  function handleCreate() {
    if (!newTitle.trim()) return
    addSource(
      newTitle.trim(),
      newType,
      newAuthors.split(",").map((a) => a.trim()).filter(Boolean),
      newYear ? parseInt(newYear) : undefined,
      newUrl.trim() || undefined,
    )
    setNewTitle("")
    setNewAuthors("")
    setNewYear("")
    setNewUrl("")
    setIsAdding(false)
  }

  let filtered = sources
  if (filterType !== "all") filtered = filtered.filter((s) => s.sourceType === filterType)
  if (filterStatus !== "all") filtered = filtered.filter((s) => s.status === filterStatus)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="資料來源庫" description="文獻、論文、紀錄與報告 — 自由跨議題引用" />

      <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-blue-500" />
                <span className="text-sm font-semibold text-foreground">{sources.length} 個來源</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{concepts.length} 個概念</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="text-xs bg-muted border-0 rounded-lg px-2 py-1.5 text-muted-foreground outline-none">
                {sourceTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs bg-muted border-0 rounded-lg px-2 py-1.5 text-muted-foreground outline-none">
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setIsAdding((v) => !v)}>
                <PlusIcon className="size-3.5" /> 新增來源
              </Button>
            </div>
          </div>

          {/* Create Form */}
          {isAdding && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold">新增資料來源</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">標題 *</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="文獻或資料的完整標題"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">類型</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value as ResearchSourceType)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs outline-none mt-1">
                    {sourceTypeOptions.filter((o) => o.value !== "all").map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">年份</label>
                  <input type="number" min="1900" max="2030"
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如: 2024"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">作者 (逗號分隔)</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如: Chang, M.S., Lin, Y.T."
                    value={newAuthors}
                    onChange={(e) => setNewAuthors(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">URL (選填)</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="https://…"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>取消</Button>
                <Button size="sm" className="h-7 text-xs" disabled={!newTitle.trim()} onClick={handleCreate}>新增</Button>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              暫無符合條件的資料來源
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((s) => <SourceCard key={s.id} source={s} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
