"use client"

import * as React from "react"
import { LightbulbIcon, SparklesIcon, PlusIcon, LinkIcon, BrainCircuitIcon } from "lucide-react"

import { ResearchIdea } from "@/types/research"
import { mockProjectsFull } from "@/lib/mock/work"
import { useResearch } from "@/lib/context/research-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface IdeaInboxProps {
  threadId: string
  ideas: ResearchIdea[]
}

const ideaTypeLabels: Record<ResearchIdea["ideaType"], { label: string; className: string }> = {
  concept: { label: "核心概念", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  hypothesis: { label: "科學假設", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  question: { label: "待解問題", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
}

export function IdeaInbox({ threadId, ideas }: IdeaInboxProps) {
  const { addIdea, linkIdeaToWork } = useResearch()
  const [isAdding, setIsAdding] = React.useState(false)
  
  // New Idea Form State
  const [newTitle, setNewTitle] = React.useState("")
  const [newBody, setNewBody] = React.useState("")
  const [newType, setNewType] = React.useState<ResearchIdea["ideaType"]>("concept")
  const [selectedProjectId, setSelectedProjectId] = React.useState("")

  // Linking Dialog State
  const [activeLinkId, setActiveLinkId] = React.useState<string | null>(null)

  const activeProjects = mockProjectsFull.filter((p) => p.status === "active")

  function handleSaveIdea() {
    if (!newTitle.trim() || !newBody.trim()) return
    
    let linkedProjName = ""
    if (selectedProjectId) {
      const proj = mockProjectsFull.find((p) => p.id === selectedProjectId)
      if (proj) linkedProjName = proj.name
    }

    addIdea(
      threadId,
      newTitle.trim(),
      newBody.trim(),
      newType,
      selectedProjectId || undefined,
      linkedProjName || undefined
    )

    // Reset
    setNewTitle("")
    setNewBody("")
    setNewType("concept")
    setSelectedProjectId("")
    setIsAdding(false)
  }

  function handleLinkIdea(ideaId: string, projId: string) {
    const proj = mockProjectsFull.find((p) => p.id === projId)
    if (!proj) return
    linkIdeaToWork(ideaId, projId, proj.name)
    setActiveLinkId(null)
  }

  return (
    <div className="space-y-4">
      {/* Header and Toggle Add Form */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <BrainCircuitIcon className="size-4 text-purple-500 animate-pulse" />
          想法靈感沙盒
        </h4>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 cursor-pointer"
          onClick={() => setIsAdding((v) => !v)}
        >
          <PlusIcon className="size-3.5" />
          捕捉新點子
        </Button>
      </div>

      {/* Idea creation form */}
      {isAdding && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2 border-border/40">
            <span className="text-xs font-semibold text-foreground">捕捉即時學術想法</span>
            <div className="flex items-center gap-1.5">
              {(["concept", "hypothesis", "question"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded border transition-all cursor-pointer",
                    newType === t
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  {ideaTypeLabels[t].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <input
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/15"
              placeholder="給這個靈感一個亮眼標題…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="w-full h-20 bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/15 resize-none leading-relaxed"
              placeholder="詳細寫下你的靈感、觀察到的痛點，或是可證偽的學術假設…"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
            />

            {/* Optional work link on creation */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                <SparklesIcon className="size-3 text-primary" />
                直接連結至工作專案 (選填):
              </span>
              <select
                className="bg-muted/40 border border-border rounded px-2 py-1 text-[10px] outline-none flex-1 max-w-[200px]"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">-- 不連結 --</option>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setIsAdding(false)}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs min-w-[60px]"
              disabled={!newTitle.trim() || !newBody.trim()}
              onClick={handleSaveIdea}
            >
              分析並存檔
            </Button>
          </div>
        </div>
      )}

      {/* Ideas Card Flow */}
      {ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-xs text-muted-foreground">
          目前尚未記錄想法。點擊右上角捕捉靈感！
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea) => {
            const labelCfg = ideaTypeLabels[idea.ideaType]
            const isLinking = activeLinkId === idea.id

            return (
              <div
                key={idea.id}
                className="relative rounded-xl border border-border/80 bg-card p-4 hover:shadow-xs flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-[9px] px-1.5 py-0.2 border", labelCfg.className)}>
                      {labelCfg.label}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground/60">
                      {new Date(idea.createdAt).toLocaleDateString("zh-TW")}
                    </span>
                  </div>

                  <h5 className="text-xs font-semibold text-foreground leading-snug">
                    {idea.title}
                  </h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {idea.body}
                  </p>
                </div>

                {/* Linking action & display */}
                <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
                  {idea.linkedProjectId ? (
                    <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/[0.04] px-2 py-0.5 rounded border border-primary/10">
                      <SparklesIcon className="size-3 text-primary animate-pulse" />
                      <span>雙向連結中: </span>
                      <a
                        href={`/work/${idea.linkedProjectId}`}
                        className="font-semibold underline hover:text-primary/80"
                      >
                        {idea.linkedProjectName}
                      </a>
                    </div>
                  ) : isLinking ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <select
                        className="bg-muted/60 border border-border rounded px-2 py-0.5 text-[9px] outline-none flex-1 max-w-[150px]"
                        defaultValue=""
                        onChange={(e) => e.target.value && handleLinkIdea(idea.id, e.target.value)}
                      >
                        <option value="" disabled>選擇專案…</option>
                        {activeProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setActiveLinkId(null)}
                        className="text-[9px] text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveLinkId(idea.id)}
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <LinkIcon className="size-3" />
                      <span>連結至工作專案</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
