"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon, PenLineIcon, ArrowRightIcon, SparklesIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ResearchWritingProject } from "@/types/research"

const statusOptions = [
  { value: "all", label: "全部" },
  { value: "idea", label: "想法" },
  { value: "outline", label: "大綱" },
  { value: "drafting", label: "草稿" },
  { value: "reviewing", label: "評審" },
  { value: "submitted", label: "已投稿" },
]

const typeOptions: { value: ResearchWritingProject["writingType"] | "all"; label: string }[] = [
  { value: "all", label: "全部類型" },
  { value: "paper", label: "期刊論文" },
  { value: "conference_paper", label: "研討會論文" },
  { value: "proposal", label: "研究計劃" },
  { value: "poster", label: "海報" },
  { value: "presentation", label: "簡報" },
]

const statusColors: Record<string, string> = {
  idea: "text-muted-foreground",
  outline: "text-blue-600 dark:text-blue-400",
  drafting: "text-amber-600 dark:text-amber-400",
  reviewing: "text-violet-600 dark:text-violet-400",
  submitted: "text-teal-600 dark:text-teal-400",
  accepted: "text-emerald-600 dark:text-emerald-400",
  rejected: "text-rose-600 dark:text-rose-400",
}

const statusLabels: Record<string, string> = {
  idea: "想法", outline: "大綱中", drafting: "草稿中",
  reviewing: "評審中", submitted: "已投稿", accepted: "已錄取", rejected: "已拒稿",
}

const typeLabels: Record<string, string> = {
  paper: "期刊", conference_paper: "研討會", proposal: "計劃書",
  poster: "海報", presentation: "簡報", essay: "評論",
}

function WritingProjectRow({ project, hasFeedback }: { project: ResearchWritingProject; hasFeedback: boolean }) {
  return (
    <Link
      href={`/research/writing/${project.id}`}
      className="group flex items-center gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="flex flex-col gap-0.5 min-w-[80px] shrink-0">
        <span className="text-[10px] text-muted-foreground/70">{typeLabels[project.writingType] ?? project.writingType}</span>
        <span className={cn("text-[11px] font-semibold", statusColors[project.status])}>
          {statusLabels[project.status] ?? project.status}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{project.title}</p>
        {project.targetVenueName && (
          <p className="text-[11px] text-muted-foreground truncate">{project.targetVenueName}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {hasFeedback && (
          <SparklesIcon className="size-3.5 text-violet-500" aria-label="有 AI 評審" />
        )}
        <ArrowRightIcon className="size-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </Link>
  )
}

export default function WritingPage() {
  const { writingProjects, feedbackRuns, addWritingProject } = useResearch()

  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [newType, setNewType] = React.useState<ResearchWritingProject["writingType"]>("conference_paper")
  const [newVenue, setNewVenue] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterType, setFilterType] = React.useState("all")

  function handleCreate() {
    if (!newTitle.trim()) return
    addWritingProject(newTitle.trim(), newType, undefined, newVenue.trim() || undefined)
    setNewTitle("")
    setNewVenue("")
    setIsAdding(false)
  }

  let filtered = writingProjects
  if (filterStatus !== "all") filtered = filtered.filter((w) => w.status === filterStatus)
  if (filterType !== "all") filtered = filtered.filter((w) => w.writingType === filterType)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="研究撰寫" description="論文、研究計劃、海報 — 含三欄式寫作視圖與 AI 多視角評審" />

      <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PenLineIcon className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{writingProjects.length} 個寫作專案</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {statusOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${filterStatus === opt.value ? "bg-background text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs bg-muted border-0 rounded-lg px-2 py-1.5 text-muted-foreground outline-none"
              >
                {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setIsAdding((v) => !v)}>
                <PlusIcon className="size-3.5" /> 新增專案
              </Button>
            </div>
          </div>

          {/* Create Form */}
          {isAdding && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold">建立新寫作專案</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">論文/計劃標題 *</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="輸入完整標題…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">類型</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as ResearchWritingProject["writingType"])}
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                  >
                    {typeOptions.filter((o) => o.value !== "all").map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">目標 Venue (選填)</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如: CHI 2026, IEEE Trans HCI"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>取消</Button>
                <Button size="sm" className="h-7 text-xs" disabled={!newTitle.trim()} onClick={handleCreate}>建立</Button>
              </div>
            </div>
          )}

          {/* Project list */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              暫無符合條件的寫作專案
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((w) => {
                const hasFeedback = feedbackRuns.some((f) => f.targetId === w.id)
                return <WritingProjectRow key={w.id} project={w} hasFeedback={hasFeedback} />
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
