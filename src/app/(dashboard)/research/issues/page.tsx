"use client"

import * as React from "react"
import { PlusIcon, FlaskConicalIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { ResearchIssueCard } from "@/components/research/research-issue-card"
import { Button } from "@/components/ui/button"

export default function IssuesPage() {
  const { issues, questions, sources, writingProjects, links, addIssue } = useResearch()

  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [newDesc, setNewDesc] = React.useState("")
  const [newKeywords, setNewKeywords] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState<string>("all")

  function handleCreate() {
    if (!newTitle.trim()) return
    addIssue(
      newTitle.trim(),
      newDesc.trim() || undefined,
      newKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    )
    setNewTitle("")
    setNewDesc("")
    setNewKeywords("")
    setIsAdding(false)
  }

  const filtered = filterStatus === "all" ? issues : issues.filter((i) => i.status === filterStatus)

  const statusOptions = [
    { value: "all", label: "全部" },
    { value: "exploring", label: "探索中" },
    { value: "active", label: "進行中" },
    { value: "writing", label: "撰寫中" },
    { value: "submitted", label: "已投稿" },
    { value: "published", label: "已發表" },
    { value: "paused", label: "暫停" },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="研究議題" description="定義研究命題與核心問題，作為物件關聯的組織標籤" />

      <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FlaskConicalIcon className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{issues.length} 個研究議題</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterStatus(opt.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${filterStatus === opt.value ? "bg-background text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setIsAdding((v) => !v)}>
                <PlusIcon className="size-3.5" /> 新增議題
              </Button>
            </div>
          </div>

          {/* Inline Create Form */}
          {isAdding && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold text-foreground">定義新研究議題</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">議題標題 *</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如：企業碳排數據信任邊界與語意治理"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">核心摘要</label>
                  <textarea
                    className="w-full h-16 bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 resize-none mt-1"
                    placeholder="描述此議題的研究動機與核心目標…"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">關鍵詞 (逗號分隔)</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 mt-1"
                    placeholder="例如：碳足跡, 供應鏈, ESG, CBAM"
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>取消</Button>
                <Button size="sm" className="h-7 text-xs" disabled={!newTitle.trim()} onClick={handleCreate}>建立議題</Button>
              </div>
            </div>
          )}

          {/* Issue Cards Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              {filterStatus === "all" ? "尚無研究議題，點擊「新增議題」開始建立。" : "此狀態下暫無議題。"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((issue) => {
                const qCount = questions.filter((q) => q.issueId === issue.id).length
                const sCount = links.filter((l) => l.toType === "issue" && l.toId === issue.id && l.fromType === "source").length
                  + links.filter((l) => l.fromType === "issue" && l.fromId === issue.id && l.toType === "source").length
                const wCount = writingProjects.filter((w) => w.issueId === issue.id).length
                return (
                  <ResearchIssueCard
                    key={issue.id}
                    issue={issue}
                    questionCount={qCount}
                    sourceCount={sCount}
                    writingCount={wCount}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
