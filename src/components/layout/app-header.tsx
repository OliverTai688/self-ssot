"use client"

import * as React from "react"
import { PlusIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useIngestion } from "@/lib/context/ingestion-context"
import { ModuleSettingsControl } from "@/components/layout/module-settings-control"

// ─── Quick Capture Modal ──────────────────────────────────────────────────────

function QuickCaptureModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { addManualCapture } = useIngestion()
  const [value, setValue] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (open) {
      setValue("")
      setTimeout(() => textareaRef.current?.focus(), 50)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  function handleSubmit() {
    if (!value.trim()) return
    addManualCapture(value.trim())
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleSubmit()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 isolate z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl rounded-xl bg-popover ring-1 ring-foreground/10 shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
          <SparklesIcon className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">快速擷取 — AI 將自動分類</span>
        </div>

        <div className="p-4">
          <textarea
            ref={textareaRef}
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
            rows={4}
            placeholder="隨便說什麼都行：想法、任務、收據、感受、連結…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex items-center justify-between px-4 pb-4">
          <p className="text-xs text-muted-foreground/50">⌘ + Enter 送出 · Esc 關閉</p>
          <Button size="sm" onClick={handleSubmit} disabled={!value.trim()}>
            <SparklesIcon className="size-3.5" />
            擷取並分析
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── App Header ───────────────────────────────────────────────────────────────

interface AppHeaderProps {
  title: string
  description?: string
}

export function AppHeader({ title, description }: AppHeaderProps) {
  const [captureOpen, setCaptureOpen] = React.useState(false)

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setCaptureOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const closeCapture = React.useCallback(() => setCaptureOpen(false), [])

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b px-6">
        <div className="flex flex-col justify-center">
          <h1 className="text-sm font-semibold leading-tight">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ModuleSettingsControl />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setCaptureOpen(true)}
          >
            <PlusIcon className="size-3.5" />
            快速擷取
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
              <span>⌘</span><span>K</span>
            </kbd>
          </Button>
        </div>
      </header>

      <QuickCaptureModal open={captureOpen} onClose={closeCapture} />
    </>
  )
}
