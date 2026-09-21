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
import type { NoteSource } from "@/types/work"

export interface AddNoteInput {
  title?: string
  body: string
  source: NoteSource
  visibility: "internal"
  origin: "manual"
  isPinned: false
}

interface AddNoteDialogProps {
  open: boolean
  onClose: () => void
  onSave: (note: AddNoteInput) => boolean | Promise<boolean>
  isSaving?: boolean
  error?: string | null
}

export function AddNoteDialog({
  open,
  onClose,
  onSave,
  isSaving = false,
  error,
}: AddNoteDialogProps) {
  const { copy } = useProductLanguage()
  const noteCopy = copy.work.notes
  const [title, setTitle] = React.useState("")
  const [body, setBody] = React.useState("")
  const [source, setSource] = React.useState<NoteSource>("internal")

  function resetForm() {
    setTitle("")
    setBody("")
    setSource("internal")
  }

  async function handleSave() {
    if (!body.trim() || isSaving) return

    const saved = await onSave({
      title: title.trim() || undefined,
      body: body.trim(),
      source,
      visibility: "internal",
      origin: "manual",
      isPinned: false,
    })

    if (!saved) return

    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isSaving && onClose()}>
      <DialogTrigger className="hidden" />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{noteCopy.dialog.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-title">{noteCopy.dialog.titleLabel}</Label>
            <Input
              id="note-title"
              placeholder={noteCopy.dialog.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-body">{noteCopy.dialog.bodyLabel}</Label>
            <textarea
              id="note-body"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 min-h-[100px]"
              placeholder={noteCopy.dialog.bodyPlaceholder}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{noteCopy.dialog.sourceLabel}</Label>
            <Select value={source} onValueChange={(v) => setSource(v as NoteSource)} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">{noteCopy.dialog.internalSource}</SelectItem>
                <SelectItem value="line">{noteCopy.sources.line}</SelectItem>
                <SelectItem value="email">{noteCopy.sources.email}</SelectItem>
                <SelectItem value="meeting">{noteCopy.sources.meeting}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            {noteCopy.dialog.cancel}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={!body.trim() || isSaving}
          >
            {isSaving ? noteCopy.dialog.saving : noteCopy.dialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
