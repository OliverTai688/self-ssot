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
import { useProductLanguage } from "@/lib/context/product-language-context"
import {
  parseProjectDocuments,
  type ProjectInitResult,
} from "@/lib/ai/project-init"
import { createProject } from "@/app/actions/work"
import { requestFileUpload } from "@/app/actions/storage"
import { useLibraryClassification } from "@/lib/context/library-classification-context"
import { generateReferenceCode } from "@/lib/naming/reference-code"
import type { FileAsset } from "@/types/file-library"

type Mode = "manual" | "ai"
type AIStep = "upload" | "parsing" | "preview"

const ACCEPTED_EXTS = /\.(pdf|doc|docx|txt)$/i

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
}

let subModuleUploadCounter = 0

function makeSubModuleAssetId(): string {
  subModuleUploadCounter += 1
  return `fa-work-upload-${Date.now()}-${subModuleUploadCounter}`
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}

/**
 * Builds a real `FileAsset` from a browser `File` and uploads its bytes to R2
 * (RES-019 §6/§8 `MODLIB-010` stopped discarding metadata; `R2STORE-006`/`RES-022`
 * §4 closes the remaining gap — the bytes themselves were still never persisted).
 * Falls back to a metadata-only asset (no `objectKey`) if the R2 upload fails,
 * so one failed upload does not block the rest of project creation.
 */
async function toFileAsset(file: File): Promise<FileAsset> {
  const now = new Date().toISOString()
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  const id = makeSubModuleAssetId()
  const mimeType = file.type || MIME_BY_EXT[ext] || "application/octet-stream"

  let objectKey: string | undefined
  let persistedAsset: FileAsset | undefined
  try {
    const requested = await requestFileUpload({
      displayName: file.name,
      mimeType,
      sizeBytes: file.size,
    })
    if (requested.success) {
      const putResponse = await fetch(requested.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: file,
      })
      if (putResponse.ok) {
        objectKey = requested.data.objectKey
        persistedAsset = requested.data.asset
      }
    }
  } catch {
    // Upload failed — fall through to a metadata-only asset, same as before R2STORE-006.
  }

  if (persistedAsset) return persistedAsset

  return {
    id,
    title: file.name,
    referenceCode: generateReferenceCode("FILE", "WORK", now),
    mimeType,
    size: file.size,
    status: "active",
    source: objectKey
      ? { provider: "r2", availability: "available", syncStatus: "synced", lastSyncedAt: now, lastCheckedAt: now }
      : undefined,
    snapshots: [{ id: `${id}-snap-1`, versionNumber: 1, createdAt: now, referenceCount: 0, objectKey }],
    processing: { extractionStatus: "not_started", indexed: false },
    references: { chats: 0, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
    createdAt: now,
  }
}

export function AddProjectDialog() {
  const router = useRouter()
  const { copy } = useProductLanguage()
  const dialogCopy = copy.work.addProject
  const { createFileAssetFromSubModuleUpload } = useLibraryClassification()
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

      // RES-019 §6/§8 MODLIB-010: uploaded documents become real File Library
      // assets tagged to `work`, with an origin backlink to this project —
      // instead of being discarded once this dialog closes.
      if (files.length > 0) {
        const project = result.data
        for (const file of files) {
          const asset = await toFileAsset(file)
          createFileAssetFromSubModuleUpload(asset, "work", {
            contextType: "project",
            contextId: project.id,
            contextLabel: `${dialogCopy.contextLabelPrefix}${project.name}`,
            href: `/work/${project.id}`,
          })
        }
      }

      setSubmitted(true)
      startTransition(() => router.refresh())
      window.setTimeout(() => {
        resetAll()
        setOpen(false)
      }, 700)
    } catch {
      setSubmitError(dialogCopy.fallbackError)
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
            {dialogCopy.trigger}
          </Button>
        }
      />
      <DialogContent className={cn(isPreview && "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>{dialogCopy.title}</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-4 text-center">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              ✓ {dialogCopy.successTitle}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {dialogCopy.successBody}
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
                {dialogCopy.manualMode}
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
                {dialogCopy.aiMode}
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
                  <Label htmlFor="project-name">{dialogCopy.name}</Label>
                  <Input
                    id="project-name"
                    placeholder={dialogCopy.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && void handleManualSubmit()
                    }
                    disabled={isCreating}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="client-name">{dialogCopy.clientName}</Label>
                  <Input
                    id="client-name"
                    placeholder={dialogCopy.clientPlaceholder}
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
                    {dialogCopy.parseFailed}
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
                    {dialogCopy.uploadPrompt}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {dialogCopy.uploadHint}
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
                          aria-label={formatCopy(dialogCopy.removeFileAriaTemplate, {
                            file: file.name,
                          })}
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional name hint */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name-hint">{dialogCopy.nameHint}</Label>
                  <Input
                    id="name-hint"
                    placeholder={dialogCopy.nameHintPlaceholder}
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
                <p className="text-sm font-medium">{dialogCopy.parsingTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {dialogCopy.parsingBody}
                </p>
              </div>
            )}

            {/* ── AI mode: preview step ── */}
            {mode === "ai" && aiStep === "preview" && parseResult && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                  <CheckIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400">
                    {formatCopy(dialogCopy.previewReadyTemplate, { count: files.length })}
                  </span>
                </div>

                {/* Editable fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preview-name">{dialogCopy.previewName}</Label>
                    <Input
                      id="preview-name"
                      value={previewName}
                      onChange={(e) => setPreviewName(e.target.value)}
                      placeholder={dialogCopy.previewNamePlaceholder}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="preview-client">{dialogCopy.previewClient}</Label>
                    <Input
                      id="preview-client"
                      value={previewClient}
                      onChange={(e) => setPreviewClient(e.target.value)}
                      placeholder={dialogCopy.previewClientPlaceholder}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="preview-due">{dialogCopy.previewDue}</Label>
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
                    {formatCopy(dialogCopy.timelineTitleTemplate, {
                      count: parseResult.phases.length,
                    })}
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
                          {formatCopy(dialogCopy.milestoneCountTemplate, {
                            count: phase.milestones.length,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key deliverables */}
                {parseResult.keyDeliverables.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {dialogCopy.keyDeliverables}
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
                {isCreating ? dialogCopy.creating : dialogCopy.create}
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
                {dialogCopy.startAiParse}
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
                {isCreating ? dialogCopy.creating : dialogCopy.create}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
