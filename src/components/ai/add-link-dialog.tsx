"use client"

import * as React from "react"
import { LinkIcon, PlusIcon, GlobeIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LinkResourceCard, type LinkMeta } from "@/components/ai/link-resource-card"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UrlEntry {
  id: string
  url: string
  status: "idle" | "loading" | "ready"
  meta?: LinkMeta
}

function makeEntry(): UrlEntry {
  return {
    id: `ue-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    url: "",
    status: "idle",
  }
}

// ─── Mock metadata fetch ──────────────────────────────────────────────────────

async function mockFetchMeta(url: string): Promise<LinkMeta> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 500))

  const lower = url.toLowerCase()

  let domain = url
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    domain = u.hostname.replace(/^www\./, "")
  } catch {
    // use raw url as domain
  }

  if (lower.includes("github.com")) {
    const path = url.split("github.com").pop()?.replace(/^\//, "") ?? ""
    const name = path.split("/").filter(Boolean).slice(0, 2).join("/") || "repository"
    return {
      title: `GitHub — ${name}`,
      description: "原始碼儲存庫，包含版本記錄、Issue 追蹤與貢獻者討論",
      domain: "github.com",
      favicon: "https://github.com/favicon.ico",
    }
  }

  if (lower.includes("medium.com")) {
    return {
      title: "Medium 文章",
      description: "深入探討技術、商業或人文主題的長篇文章",
      domain: "medium.com",
    }
  }

  if (lower.includes("substack.com")) {
    return {
      title: "Substack Newsletter",
      description: "專欄文章或電子報，適合長期追蹤的知識資源",
      domain: "substack.com",
    }
  }

  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return {
      title: "YouTube 影片",
      description: "影音資源，可轉錄為文字後進行 AI 分析",
      domain: "youtube.com",
    }
  }

  if (lower.includes("twitter.com") || lower.includes("x.com")) {
    return {
      title: "X (Twitter) 貼文",
      description: "社群媒體貼文或討論串",
      domain: "x.com",
    }
  }

  return {
    title: domain || "網頁資源",
    description: "擷取後 AI 將自動分析內容並建議最佳歸類位置",
    domain,
  }
}

// ─── URL validation ───────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  const t = url.trim()
  return (
    t.length > 5 &&
    (t.startsWith("http://") ||
      t.startsWith("https://") ||
      /^[\w][\w.-]+\.\w{2,}/.test(t))
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AddLinkDialogProps {
  onAdd: (urls: string[]) => void
  trigger?: React.ReactNode
}

export function AddLinkDialog({ onAdd, trigger }: AddLinkDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [entries, setEntries] = React.useState<UrlEntry[]>([makeEntry()])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const debounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function handleOpenChange(open: boolean) {
    if (!open) {
      Object.values(debounceRef.current).forEach(clearTimeout)
      debounceRef.current = {}
      setEntries([makeEntry()])
      setIsSubmitting(false)
    }
    setIsOpen(open)
  }

  function triggerFetch(id: string, url: string) {
    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id])

    if (!isValidUrl(url)) return

    debounceRef.current[id] = setTimeout(async () => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "loading" } : e))
      )
      const meta = await mockFetchMeta(url.trim())
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "ready", meta } : e))
      )
    }, 400)
  }

  function handleUrlChange(id: string, value: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, url: value, status: "idle", meta: undefined } : e
      )
    )
    triggerFetch(id, value)
  }

  function handleAddEntry() {
    setEntries((prev) => [...prev, makeEntry()])
  }

  function handleRemoveEntry(id: string) {
    if (debounceRef.current[id]) clearTimeout(debounceRef.current[id])
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.id !== id)
      return filtered.length === 0 ? [makeEntry()] : filtered
    })
  }

  async function handleSubmit() {
    const validUrls = entries
      .filter((e) => isValidUrl(e.url.trim()))
      .map((e) => e.url.trim())
    if (validUrls.length === 0) return

    setIsSubmitting(true)
    await new Promise((r) => setTimeout(r, 200))
    onAdd(validUrls)
    handleOpenChange(false)
  }

  const readyCount = entries.filter((e) => isValidUrl(e.url.trim())).length
  const hasAnyLoading = entries.some((e) => e.status === "loading")

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          (trigger as React.ReactElement) ?? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-full gap-1.5 px-2.5"
            >
              <LinkIcon className="size-3" />
              連結
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="size-4 text-primary" />
            擷取網頁資源
          </DialogTitle>
          <DialogDescription>
            貼上連結，系統將模擬擷取網頁 Metadata，AI 完成後自動分類整理。
          </DialogDescription>
        </DialogHeader>

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="space-y-2">
              {/* URL input */}
              <div className="relative flex items-center gap-2">
                <GlobeIcon className="absolute left-3 size-3.5 text-muted-foreground/40 pointer-events-none" />
                <input
                  className={cn(
                    "flex-1 bg-muted/40 border border-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none",
                    "focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all",
                    entry.status === "ready" && "border-primary/30 bg-primary/5"
                  )}
                  placeholder="https://example.com"
                  value={entry.url}
                  onChange={(e) => handleUrlChange(entry.id, e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text")
                    if (pasted.trim()) {
                      setTimeout(() => triggerFetch(entry.id, pasted.trim()), 0)
                    }
                  }}
                />
                {entries.length > 1 || entry.url !== "" ? (
                  <button
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                  >
                    移除
                  </button>
                ) : null}
              </div>

              {/* Preview card */}
              {entry.status !== "idle" && (
                <LinkResourceCard
                  url={entry.url}
                  meta={entry.meta}
                  isLoading={entry.status === "loading"}
                  className="ml-1"
                />
              )}
            </div>
          ))}

          <button
            onClick={handleAddEntry}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-1"
          >
            <PlusIcon className="size-3.5" />
            新增連結
          </button>
        </div>

        <DialogFooter className="rounded-b-xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            variant="default"
            size="sm"
            className="min-w-[100px]"
            onClick={handleSubmit}
            disabled={isSubmitting || readyCount === 0 || hasAnyLoading}
          >
            {isSubmitting
              ? "處理中…"
              : hasAnyLoading
              ? "擷取中…"
              : readyCount > 0
              ? `確認加入 (${readyCount})`
              : "擷取資源"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
