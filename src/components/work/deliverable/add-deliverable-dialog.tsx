"use client"

import * as React from "react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProductLanguage } from "@/lib/context/product-language-context"
import { cn } from "@/lib/utils"
import type { ProjectDeliverable, DeliverableStatus, DeliverableVisibility, DeliverableNodeType } from "@/types/work"

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

export interface DeliverableDialogInput {
  type: DeliverableNodeType
  parentId: string | null
  title: string
  description?: string
  status: DeliverableStatus
  visibility: DeliverableVisibility
}

interface AddDeliverableDialogProps {
  open: boolean
  onClose: () => void
  onSave: (deliverable: DeliverableDialogInput) => boolean | Promise<boolean> | void
  defaultType?: DeliverableNodeType
  parentId?: string | null
  allNodes?: ProjectDeliverable[]
  isSaving?: boolean
  error?: string | null
}

export function AddDeliverableDialog({
  open,
  onClose,
  onSave,
  defaultType = "file",
  parentId = null,
  allNodes = [],
  isSaving = false,
  error,
}: AddDeliverableDialogProps) {
  const { copy } = useProductLanguage()
  const deliverableCopy = copy.work.deliverables
  const [type, setType] = React.useState<DeliverableNodeType>(defaultType)
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(parentId)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState<DeliverableStatus>("draft")
  const [visibility, setVisibility] = React.useState<DeliverableVisibility>("internal")

  const folders = allNodes.filter((n) => n.type === "folder")

  function resetForm() {
    setType(defaultType)
    setSelectedParentId(parentId)
    setTitle("")
    setDescription("")
    setStatus("draft")
    setVisibility("internal")
  }

  function handleClose() {
    if (isSaving) return
    resetForm()
    onClose()
  }

  async function handleSave() {
    if (!title.trim() || isSaving) return

    const saved = await onSave({
      type,
      parentId: selectedParentId,
      title: title.trim(),
      description: type === "file" ? (description.trim() || undefined) : undefined,
      status,
      visibility,
    })

    if (saved === false) return

    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogTrigger className="hidden" />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {formatCopy(deliverableCopy.dialog.titleTemplate, {
              type: deliverableCopy.types[type],
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Type toggle */}
          <div className="flex flex-col gap-1.5">
            <Label>{deliverableCopy.dialog.type}</Label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["folder", "file"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  disabled={isSaving}
                  className={cn(
                    "flex-1 py-1.5 text-sm transition-colors",
                    type === t
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-background text-muted-foreground hover:bg-muted/50",
                    isSaving && "cursor-not-allowed opacity-60"
                  )}
                >
                  {deliverableCopy.types[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Parent folder */}
          {folders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>{deliverableCopy.dialog.parentFolder}</Label>
              <Select
                value={selectedParentId ?? "__root__"}
                onValueChange={(v) => { if (v) setSelectedParentId(v === "__root__" ? null : v) }}
                disabled={isSaving}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">{deliverableCopy.dialog.rootFolder}</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="d-title">
              {type === "folder"
                ? deliverableCopy.dialog.folderName
                : deliverableCopy.dialog.fileName}
            </Label>
            <Input
              id="d-title"
              placeholder={
                type === "folder"
                  ? deliverableCopy.dialog.folderPlaceholder
                  : deliverableCopy.dialog.filePlaceholder
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={isSaving}
            />
          </div>

          {/* File-only fields */}
          {type === "file" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-desc">{deliverableCopy.dialog.description}</Label>
                <Input
                  id="d-desc"
                  placeholder={deliverableCopy.dialog.descriptionPlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>{deliverableCopy.dialog.status}</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => { if (v) setStatus(v as DeliverableStatus) }}
                    disabled={isSaving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{deliverableCopy.statuses.draft}</SelectItem>
                      <SelectItem value="delivered">{deliverableCopy.statuses.delivered}</SelectItem>
                      <SelectItem value="approved">{deliverableCopy.statuses.approved}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{deliverableCopy.dialog.visibility}</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => { if (v) setVisibility(v as DeliverableVisibility) }}
                    disabled={isSaving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">{deliverableCopy.visibility.internal}</SelectItem>
                      <SelectItem value="client_visible">
                        {deliverableCopy.visibility.client_visible}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSaving}>
            {deliverableCopy.dialog.cancel}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={!title.trim() || isSaving}
          >
            {isSaving
              ? deliverableCopy.dialog.saving
              : formatCopy(deliverableCopy.dialog.saveTemplate, {
                  type: deliverableCopy.types[type],
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
