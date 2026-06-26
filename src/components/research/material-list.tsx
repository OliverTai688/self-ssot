"use client"

import * as React from "react"
import { BookOpenIcon, LinkIcon, UserIcon, PlusIcon, GlobeIcon, QuoteIcon, TagIcon } from "lucide-react"

import { ResearchMaterial, Researcher } from "@/types/research"
import { useResearch } from "@/lib/context/research-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MaterialListProps {
  threadId: string
  materials: ResearchMaterial[]
  researchers: Researcher[]
}

const materialTypeLabels: Record<ResearchMaterial["type"], { label: string; className: string }> = {
  paper: { label: "學術論文", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  book: { label: "專著專書", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  article: { label: "網路文章", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  data: { label: "研究數據", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  tool: { label: "開源工具", className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
}

export function MaterialList({ threadId, materials, researchers }: MaterialListProps) {
  const { addMaterial } = useResearch()
  const [isAdding, setIsAdding] = React.useState(false)

  // Add form state
  const [title, setTitle] = React.useState("")
  const [type, setType] = React.useState<ResearchMaterial["type"]>("paper")
  const [url, setUrl] = React.useState("")
  const [notes, setNotes] = React.useState("")

  function handleSaveMaterial() {
    if (!title.trim()) return
    addMaterial(threadId, title.trim(), type, url.trim() || undefined, notes.trim() || undefined)
    setTitle("")
    setType("paper")
    setUrl("")
    setNotes("")
    setIsAdding(false)
  }

  return (
    <div className="space-y-6">
      {/* ─── Subsection: Materials ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
            <BookOpenIcon className="size-4 text-blue-500" />
            學術文獻與實體材料庫
          </h4>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 cursor-pointer"
            onClick={() => setIsAdding((v) => !v)}
          >
            <PlusIcon className="size-3.5" />
            新增文獻材料
          </Button>
        </div>

        {/* Add material form */}
        {isAdding && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b pb-2 border-border/40">
              <span className="text-xs font-semibold text-foreground">登記參考文獻或工具</span>
              <div className="flex items-center gap-1">
                {(["paper", "tool", "article", "data"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={cn(
                      "text-[9px] px-2 py-0.5 rounded border transition-all cursor-pointer",
                      type === t
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {materialTypeLabels[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <input
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                placeholder="文獻標題或工具名稱…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
                placeholder="來源連結 URL (選填, 例如: https://scholar.google.com/...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <textarea
                className="w-full h-16 bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50 resize-none leading-relaxed"
                placeholder="寫下你的文獻讀後感、關鍵算式，或是工具的呼叫參數說明…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
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
                disabled={!title.trim()}
                onClick={handleSaveMaterial}
              >
                儲存文獻
              </Button>
            </div>
          </div>
        )}

        {/* Materials List */}
        {materials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-6 text-center text-xs text-muted-foreground">
            尚無文獻。點擊新增！
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border/60 overflow-hidden">
            {materials.map((m) => {
              const labelCfg = materialTypeLabels[m.type]
              return (
                <div key={m.id} className="p-3.5 hover:bg-muted/10 transition-colors flex gap-3.5 items-start">
                  <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/30 flex items-center justify-center shrink-0">
                    <BookOpenIcon className="size-4 text-muted-foreground/80" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-semibold text-foreground leading-snug">
                        {m.title}
                      </span>
                      <span className={cn("text-[9px] px-1.5 py-0.2 rounded font-medium", labelCfg.className)}>
                        {labelCfg.label}
                      </span>
                    </div>

                    {m.notes && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {m.notes}
                      </p>
                    )}

                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold pt-0.5"
                      >
                        <GlobeIcon className="size-3" />
                        開啟學術源連結
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Subsection: Researchers ─── */}
      <div className="space-y-4 pt-4 border-t border-border/40">
        <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <UserIcon className="size-4 text-purple-500" />
          相關學者人脈與領域地圖
        </h4>

        {researchers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-6 text-center text-xs text-muted-foreground">
            目前尚未記錄同領域學者。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {researchers.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border/80 bg-card p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <h5 className="text-xs font-bold text-foreground truncate">{r.name}</h5>
                      {r.affiliation && (
                        <p className="text-[10px] text-muted-foreground truncate">{r.affiliation}</p>
                      )}
                    </div>
                    {r.profileUrl && (
                      <a
                        href={r.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded hover:bg-muted text-muted-foreground/60 hover:text-primary transition-colors shrink-0"
                      >
                        <LinkIcon className="size-3.5" />
                      </a>
                    )}
                  </div>

                  {r.researchArea && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 px-2.5 py-0.5 rounded border border-border/40 w-fit">
                      <TagIcon className="size-3" />
                      <span>焦點: {r.researchArea}</span>
                    </div>
                  )}

                  {r.relationNote && (
                    <div className="rounded-lg bg-purple-500/[0.02] border border-purple-500/10 p-2.5 space-y-1">
                      <p className="text-[9px] font-bold text-purple-500 leading-none">學者交往備忘錄 (僅 Owner 可見)</p>
                      <p className="text-[10px] text-muted-foreground leading-normal italic">
                        "{r.relationNote}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Published papers nested list */}
                {r.papers && r.papers.length > 0 && (
                  <div className="pt-2.5 border-t border-border/40 space-y-1.5">
                    <p className="text-[9px] text-muted-foreground/80 font-bold uppercase tracking-wider flex items-center gap-1">
                      <QuoteIcon className="size-2.5" />
                      代表論文與文獻
                    </p>
                    <div className="space-y-1">
                      {r.papers.map((p, i) => (
                        <div key={i} className="text-[10px] flex items-start gap-1 justify-between min-w-0">
                          <span className="text-foreground font-medium truncate flex-1 leading-normal">
                            - {p.title}
                          </span>
                          {p.publishedAt && (
                            <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0 ml-2">
                              {p.publishedAt}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
