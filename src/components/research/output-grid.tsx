"use client"

import * as React from "react"
import { SparklesIcon, PlusIcon, MonitorIcon, ClipboardIcon, FileTextIcon, LayersIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import { ResearchOutput } from "@/types/research"
import { useResearch } from "@/lib/context/research-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface OutputGridProps {
  threadId: string
  outputs: ResearchOutput[]
}

const outputTypeConfigs: Record<ResearchOutput["type"], { label: string; icon: React.ReactNode; colorClass: string }> = {
  slide: { label: "匯報簡報", icon: <MonitorIcon className="size-4" />, colorClass: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  poster: { label: "展示海報", icon: <LayersIcon className="size-4" />, colorClass: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  summary: { label: "成果摘要", icon: <ClipboardIcon className="size-4" />, colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  learning_path: { label: "學習路徑", icon: <SparklesIcon className="size-4" />, colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  blog: { label: "科普文章", icon: <FileTextIcon className="size-4" />, colorClass: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
}

export function OutputGrid({ threadId, outputs }: OutputGridProps) {
  const { addOutput } = useResearch()
  const [isAdding, setIsAdding] = React.useState(false)

  // Form state
  const [title, setTitle] = React.useState("")
  const [type, setType] = React.useState<ResearchOutput["type"]>("summary")
  const [body, setBody] = React.useState("")

  function handleSaveOutput() {
    if (!title.trim()) return
    addOutput(threadId, type, title.trim(), body.trim() || undefined)
    setTitle("")
    setType("summary")
    setBody("")
    setIsAdding(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <SparklesIcon className="size-4 text-emerald-500 animate-pulse" />
          知識成果轉化區 (Outputs)
        </h4>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 cursor-pointer"
          onClick={() => setIsAdding((v) => !v)}
        >
          <PlusIcon className="size-3.5" />
          轉化新成果
        </Button>
      </div>

      {/* Add Output Form */}
      {isAdding && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between border-b pb-2 border-border/40">
            <span className="text-xs font-semibold text-foreground">登記/撰寫轉化輸出</span>
            <div className="flex items-center gap-1">
              {(["slide", "poster", "summary", "blog"] as const).map((t) => (
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
                  {outputTypeConfigs[t].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <input
              className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50"
              placeholder="成果文件標題…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="w-full h-20 bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary/50 resize-none leading-relaxed"
              placeholder="詳細描述這個轉化成果，如果是摘要或科普文章，可以直接在此撰寫核心段落…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
              onClick={handleSaveOutput}
            >
              確認發佈成果
            </Button>
          </div>
        </div>
      )}

      {/* Outputs Cards list */}
      {outputs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-xs text-muted-foreground">
          目前尚無轉化成果輸出。點擊右上角啟動轉化工程！
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outputs.map((out) => {
            const cfg = outputTypeConfigs[out.type]
            return (
              <div
                key={out.id}
                className="group relative rounded-xl border border-border bg-card p-4 hover:shadow-xs hover:border-primary/20 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-2.5">
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <div className={cn("inline-flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full border font-semibold", cfg.colorClass)}>
                      {cfg.icon}
                      <span>{cfg.label}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                      {out.isPublic ? (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <EyeIcon className="size-3" /> 公開展示中
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <EyeOffIcon className="size-3" /> 私人存檔
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Body */}
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {out.title}
                    </h5>
                    {out.body && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {out.body}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 text-[9px] text-muted-foreground/50">
                  成果轉化於 {new Date(out.createdAt).toLocaleDateString("zh-TW")}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
