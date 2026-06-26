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
          <DialogTitle>新增紀錄</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-title">標題（選填）</Label>
            <Input
              id="note-title"
              placeholder="例：Lisa 5/6 會議紀錄"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="note-body">內容</Label>
            <textarea
              id="note-body"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 min-h-[100px]"
              placeholder="記下任何脈絡、反饋、備忘…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              autoFocus
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>來源</Label>
            <Select value={source} onValueChange={(v) => setSource(v as NoteSource)} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">內部備忘</SelectItem>
                <SelectItem value="line">LINE</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">會議</SelectItem>
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
            取消
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={!body.trim() || isSaving}
          >
            {isSaving ? "新增中" : "新增紀錄"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
