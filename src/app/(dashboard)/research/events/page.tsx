"use client"

import * as React from "react"
import { CalendarIcon, PlusIcon, ClockIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { EventCard } from "@/components/research/event-card"
import { Button } from "@/components/ui/button"
import { ResearchEventType } from "@/types/research"

export default function EventsPage() {
  const { events, addEvent } = useResearch()

  const [isAdding, setIsAdding] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newType, setNewType] = React.useState<ResearchEventType>("conference")
  const [newFields, setNewFields] = React.useState("")
  const [filterType, setFilterType] = React.useState("all")

  function handleCreate() {
    if (!newName.trim()) return
    addEvent(newName.trim(), newType, newFields.split(",").map((f) => f.trim()).filter(Boolean))
    setNewName("")
    setNewFields("")
    setIsAdding(false)
  }

  const now = new Date()
  const upcoming = events
    .filter((e) => e.submissionDeadline && new Date(e.submissionDeadline) > now)
    .sort((a, b) => new Date(a.submissionDeadline!).getTime() - new Date(b.submissionDeadline!).getTime())
  const past = events.filter((e) => !e.submissionDeadline || new Date(e.submissionDeadline) <= now)

  const filtered = filterType === "all" ? events : events.filter((e) => e.eventType === filterType)

  const typeOptions = [
    { value: "all", label: "全部" },
    { value: "conference", label: "研討會" },
    { value: "workshop", label: "工作坊" },
    { value: "seminar", label: "演講" },
    { value: "summer_school", label: "暑期學校" },
    { value: "webinar", label: "線上研討" },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="研討會 & CFP 追蹤" description="追蹤截止日倒數與 AI 推薦投稿模式" />

      <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* CFP Countdown Timeline */}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ClockIcon className="size-3.5 text-rose-500" /> CFP 截止倒數
              </h3>
              <div className="space-y-2">
                {upcoming.map((ev) => {
                  const days = Math.ceil((new Date(ev.submissionDeadline!).getTime() - now.getTime()) / 86400000)
                  const progress = Math.max(0, Math.min(100, (1 - days / 90) * 100))
                  return (
                    <div key={ev.id} className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{ev.name}</p>
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${days <= 14 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                          {days} 天後截止
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${days <= 14 ? "bg-rose-500" : "bg-amber-500"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-rose-500" />
              <span className="text-sm font-semibold text-foreground">{events.length} 個活動</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {typeOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setFilterType(opt.value)}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${filterType === opt.value ? "bg-background text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setIsAdding((v) => !v)}>
                <PlusIcon className="size-3.5" /> 新增活動
              </Button>
            </div>
          </div>

          {/* Create Form */}
          {isAdding && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold">新增研討會 / 活動</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">活動名稱 *</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如: ACM SIGCHI 2027"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">類型</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value as ResearchEventType)}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2 py-1.5 text-xs outline-none mt-1">
                    <option value="conference">研討會</option>
                    <option value="workshop">工作坊</option>
                    <option value="seminar">演講</option>
                    <option value="summer_school">暑期學校</option>
                    <option value="webinar">線上研討</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">研究領域 (逗號分隔)</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如: HCI, ESG, 永續計算"
                    value={newFields}
                    onChange={(e) => setNewFields(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>取消</Button>
                <Button size="sm" className="h-7 text-xs" disabled={!newName.trim()} onClick={handleCreate}>新增</Button>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              暫無活動記錄
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
