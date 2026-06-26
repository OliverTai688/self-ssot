"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  PlusIcon,
  UploadIcon,
  FileTextIcon,
  XIcon,
  SparklesIcon,
  CheckIcon,
  Loader2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  parseProjectDocuments,
  type ProjectInitResult,
} from "@/lib/ai/project-init"
import { createProject } from "@/app/actions/work"

type Mode = "manual" | "ai"
type AIStep = "upload" | "parsing" | "preview"

const ACCEPTED_EXTS = /\.(pdf|doc|docx|txt)$/i

export function AddProjectDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<Mode>("manual")
  const [submitted, setSubmitted] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  // Manual mode
  const [name, setName] = React.useState("")
  const [clientName, setClientName] = React.useState("")

  // AI mode
  const [aiStep, setAIStep] = React.useState<AIStep>("upload")
  const [files, setFiles] = React.useState<File[]>([])
  const [nameHint, setNameHint] = React.useState("")
  const [isDragging, setIsDragging] = React.useState(false)
  const [parseResult, setParseResult] = React.useState<ProjectInitResult | null>(null)
  const [parseError, setParseError] = React.useState(false)

  // Preview editable fields (populated from parseResult)
  const [previewName, setPreviewName] = React.useState("")
  const [previewClient, setPreviewClient] = React.useState("")
  const [previewDue, setPreviewDue] = React.useState("")

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const isCreating = isSubmitting || isPending

  function resetAll() {
    setMode("manual")
    setSubmitted(false)
    setIsSubmitting(false)
    setSubmitError(null)
    setName("")
    setClientName("")
    setAIStep("upload")
    setFiles([])
    setNameHint("")
    setIsDragging(false)
    setParseResult(null)
    setParseError(false)
    setPreviewName("")
    setPreviewClient("")
    setPreviewDue("")
  }

  function handleOpenChange(next: boolean) {
    if (!next && isCreating) return
    if (!next) resetAll()
    setOpen(next)
  }

  async function submitProject(input: {
    name: string
    clientName?: string
    dueAt?: string
  }) {
    const projectName = input.name.trim()
    if (!projectName || isCreating) return

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const result = await createProject({
        name: projectName,
        clientName: input.clientName?.trim() || undefined,
        dueAt: input.dueAt || undefined,
      })

      if (!result.success) {
        setSubmitError(result.error)
        return
      }

      setSubmitted(true)
      startTransition(() => router.refresh())
      window.setTimeout(() => {
        resetAll()
        setOpen(false)
      }, 700)
    } catch {
      setSubmitError("建立專案失敗，請稍後再試")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleManualSubmit() {
    await submitProject({ name, clientName })
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const valid = Array.from(incoming).filter((f) => ACCEPTED_EXTS.test(f.name))
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      return [...prev, ...valid.filter((f) => !existing.has(f.name))].slice(0, 5)
    })
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleParse() {
    setParseError(false)
    setAIStep("parsing")
    try {
      const result = await parseProjectDocuments(files, nameHint || undefined)
      setParseResult(result)
      setPreviewName(result.name ?? nameHint)
      setPreviewClient(result.clientName ?? "")
      setPreviewDue(result.dueDate ?? "")
      setAIStep("preview")
    } catch {
      setParseError(true)
      setAIStep("upload")
    }
  }

  async function handleAISubmit() {
    await submitProject({
      name: previewName,
      clientName: previewClient,
      dueAt: previewDue,
    })
  }

  const isPreview = mode === "ai" && aiStep === "preview"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <PlusIcon className="size-3.5" />
            新增專案
          </Button>
        }
      />
      <DialogContent className={cn(isPreview && "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>新增專案</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-4 text-center">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              ✓ 專案已建立
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              正在重新整理專案列表
            </p>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <button
                onClick={() => setMode("manual")}
                disabled={isCreating}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                  mode === "manual"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                手動建立
              </button>
              <button
                onClick={() => {
                  setMode("ai")
                  if (aiStep !== "parsing") setAIStep("upload")
                }}
                disabled={isCreating}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                  mode === "ai"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <SparklesIcon className="size-3" />
                AI 文件初始化
              </button>
            </div>

            {submitError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {submitError}
              </p>
            )}

            {/* ── Manual mode ── */}
            {mode === "manual" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project-name">專案名稱</Label>
                  <Input
                    id="project-name"
                    placeholder="例：Lisa Q3 報表設計"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && void handleManualSubmit()
                    }
                    disabled={isCreating}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="client-name">客戶名稱（選填）</Label>
                  <Input
                    id="client-name"
                    placeholder="例：Lisa Chen"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>
            )}

            {/* ── AI mode: upload step ── */}
            {mode === "ai" && aiStep === "upload" && (
              <div className="flex flex-col gap-4">
                {parseError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    解析失敗，請重試
                  </p>
                )}

                {/* Dropzone */}
                <div
                  role="button"
                  tabIndex={0}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    addFiles(e.dataTransfer.files)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fileInputRef.current?.click()
                  }
                  className={cn(
                    "cursor-pointer rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                  <UploadIcon className="mx-auto mb-2 size-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    拖曳或點擊上傳需求書、合約等文件
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    支援 PDF、Word、TXT，最多 5 個檔案
                  </p>
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {files.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                      >
                        <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{file.name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(i)
                          }}
                          disabled={isCreating}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={`移除 ${file.name}`}
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional name hint */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name-hint">專案名稱提示（選填）</Label>
                  <Input
                    id="name-hint"
                    placeholder="例：品牌網站設計"
                    value={nameHint}
                    onChange={(e) => setNameHint(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>
            )}

            {/* ── AI mode: parsing step ── */}
            {mode === "ai" && aiStep === "parsing" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2Icon className="size-8 animate-spin text-primary" />
                <p className="text-sm font-medium">AI 正在解析文件…</p>
                <p className="text-xs text-muted-foreground">
                  擷取 timeline、交付物與里程碑
                </p>
              </div>
            )}

            {/* ── AI mode: preview step ── */}
            {mode === "ai" && aiStep === "preview" && parseResult && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                  <CheckIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    AI 解析完成，來自 {files.length} 份文件，可編輯後建立
                  </span>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preview-name">專案名稱</Label>
                    <Input
                      id="preview-name"
                      value={previewName}
                      onChange={(e) => setPreviewName(e.target.value)}
                      placeholder="輸入專案名稱"
                      disabled={isCreating}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preview-client">客戶名稱</Label>
                    <Input
                      id="preview-client"
                      value={previewClient}
                      onChange={(e) => setPreviewClient(e.target.value)}
                      placeholder="客戶名稱（選填）"
                      disabled={isCreating}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="preview-due">預計完成日期</Label>
                    <Input
                      id="preview-due"
                      type="date"
                      value={previewDue}
                      onChange={(e) => setPreviewDue(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                </div>

                {/* Timeline phases */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    專案 Timeline（{parseResult.phases.length} 個階段）
                  </p>
                  <div className="flex flex-col gap-1">
                    {parseResult.phases.map((phase) => (
                      <div
                        key={phase.phase}
                        className="flex items-center gap-2.5 rounded-md border px-3 py-2"
                      >
                        <div className="size-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="flex-1 text-xs font-medium">
                          {phase.label}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {phase.startDate} → {phase.endDate}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground/60">
                          {phase.milestones.length} 里程碑
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key deliverables */}
                {parseResult.keyDeliverables.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      關鍵交付物
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parseResult.keyDeliverables.map((d) => (
                        <span
                          key={d}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!submitted && (
          <DialogFooter>
            {mode === "manual" && (
              <Button
                size="sm"
                onClick={() => void handleManualSubmit()}
                disabled={!name.trim() || isCreating}
                className="gap-1.5"
              >
                {isCreating && <Loader2Icon className="size-3.5 animate-spin" />}
                {isCreating ? "建立中" : "建立專案"}
              </Button>
            )}
            {mode === "ai" && aiStep === "upload" && (
              <Button
                size="sm"
                onClick={handleParse}
                disabled={files.length === 0 || isCreating}
                className="gap-1.5"
              >
                <SparklesIcon className="size-3.5" />
                開始 AI 解析
              </Button>
            )}
            {mode === "ai" && aiStep === "preview" && (
              <Button
                size="sm"
                onClick={() => void handleAISubmit()}
                disabled={!previewName.trim() || isCreating}
                className="gap-1.5"
              >
                {isCreating && <Loader2Icon className="size-3.5 animate-spin" />}
                {isCreating ? "建立中" : "建立專案"}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
