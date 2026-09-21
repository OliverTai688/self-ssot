"use client"

import * as React from "react"
import { PlusIcon, SparklesIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useIngestion } from "@/lib/context/ingestion-context"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { ModuleSettingsControl } from "@/components/layout/module-settings-control"
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher"

// ─── Quick Capture Modal ──────────────────────────────────────────────────────

function QuickCaptureModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { addManualCapture } = useIngestion()
  const { copy } = useProductLanguage()
  const [value, setValue] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    let focusTimer: number | undefined

    if (open) {
      focusTimer = window.setTimeout(() => {
        setValue("")
        textareaRef.current?.focus()
      }, 50)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer)
      window.removeEventListener("keydown", handleKeyDown)
    }
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
          <span className="flex-1 text-sm text-muted-foreground">
            {copy.state.quickCaptureTitle}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.state.quickCaptureClose}
            className="rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            ref={textareaRef}
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
            rows={4}
            placeholder={copy.state.quickCapturePlaceholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex items-center justify-between px-4 pb-4">
          <p className="text-xs text-muted-foreground/50">
            {copy.state.quickCaptureShortcut}
          </p>
          <Button size="sm" onClick={handleSubmit} disabled={!value.trim()}>
            <SparklesIcon className="size-3.5" />
            {copy.state.quickCaptureSubmit}
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
  const { copy } = useProductLanguage()

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
          <WorkspaceSwitcher />
          <ModuleSettingsControl />
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setCaptureOpen(true)}
          >
            <PlusIcon className="size-3.5" />
            {copy.state.quickCaptureButton}
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
