"use client"

import * as React from "react"
import { LightbulbIcon, PlusIcon } from "lucide-react"
import { AppHeader } from "@/components/layout/app-header"
import { useResearch } from "@/lib/context/research-context"
import { IdeaCaptureCard } from "@/components/research/idea-capture-card"
import { Button } from "@/components/ui/button"
import { ResearchIdeaV2, IdeaSourceContext } from "@/types/research"

const filterOptions = [
  { value: "all", label: "全部" },
  { value: "inbox", label: "Inbox" },
  { value: "developing", label: "發展中" },
  { value: "linked", label: "已關聯" },
  { value: "archived", label: "已封存" },
]

export default function ExplorationPage() {
  const { ideasV2, issues, addIdeaV2 } = useResearch()

  const [isAdding, setIsAdding] = React.useState(false)
  const [newTitle, setNewTitle] = React.useState("")
  const [newBody, setNewBody] = React.useState("")
  const [newType, setNewType] = React.useState<ResearchIdeaV2["ideaType"]>("concept")
  const [newContext, setNewContext] = React.useState<IdeaSourceContext>("manual")
  const [newIssueId, setNewIssueId] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("all")

  function handleCreate() {
    if (!newTitle.trim() || !newBody.trim()) return
    addIdeaV2(newTitle.trim(), newBody.trim(), newType, newContext, newIssueId || undefined)
    setNewTitle("")
    setNewBody("")
    setNewIssueId("")
    setIsAdding(false)
  }

  const filtered = filterStatus === "all" ? ideasV2 : ideasV2.filter((i) => i.status === filterStatus)
  const inboxCount = ideasV2.filter((i) => i.status === "inbox").length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader title="想法探索 Inbox" description="自由捕捉靈感與假設 — 無需預先歸屬議題" />

      <main className="flex-1 overflow-y-auto px-6 py-8 bg-background">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <LightbulbIcon className="size-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">{ideasV2.length} 個想法</span>
              {inboxCount > 0 && (
                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">
                  {inboxCount} 待處理
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {filterOptions.map((opt) => (
                  <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${filterStatus === opt.value ? "bg-background text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button size="sm" className="gap-1.5 h-8" onClick={() => setIsAdding((v) => !v)}>
                <PlusIcon className="size-3.5" /> 捕捉想法
              </Button>
            </div>
          </div>

          {/* Quick Capture Form */}
          {isAdding && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-semibold text-foreground">快速捕捉想法</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">想法標題 *</label>
                  <input
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500/50 mt-1"
                    placeholder="一句話描述核心想法…"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase">詳細說明 *</label>
                  <textarea
                    className="w-full h-20 bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500/50 resize-none mt-1"
                    placeholder="展開你的思路，不需要完整也沒關係…"
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">類型</label>
                    <select value={newType} onChange={(e) => setNewType(e.target.value as ResearchIdeaV2["ideaType"])}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none mt-1">
                      <option value="concept">概念</option>
                      <option value="hypothesis">假設</option>
                      <option value="question">問題</option>
                      <option value="observation">觀察</option>
                      <option value="connection">關聯</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">來源情境</label>
                    <select value={newContext} onChange={(e) => setNewContext(e.target.value as IdeaSourceContext)}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none mt-1">
                      <option value="manual">手動輸入</option>
                      <option value="meeting">會議</option>
                      <option value="workshop">工作坊</option>
                      <option value="reading">閱讀</option>
                      <option value="voice_note">語音筆記</option>
                      <option value="ai_chat">AI 對話</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">關聯議題 (選填)</label>
                    <select value={newIssueId} onChange={(e) => setNewIssueId(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs outline-none mt-1">
                      <option value="">不選擇</option>
                      {issues.map((i) => <option key={i.id} value={i.id}>{i.title.slice(0, 24)}…</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>取消</Button>
                <Button size="sm" className="h-7 text-xs" disabled={!newTitle.trim() || !newBody.trim()} onClick={handleCreate}>捕捉</Button>
              </div>
            </div>
          )}

          {/* Ideas List */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              {filterStatus === "all" ? "尚無想法，點擊「捕捉想法」開始記錄。" : "此篩選條件下暫無想法。"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((idea) => (
                <IdeaCaptureCard key={idea.id} idea={idea} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
