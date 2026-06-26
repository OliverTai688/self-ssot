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
import { cn } from "@/lib/utils"
import type { ProjectDeliverable, DeliverableStatus, DeliverableVisibility, DeliverableNodeType } from "@/types/work"

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
          <DialogTitle>新增{type === "folder" ? "資料夾" : "文件"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Type toggle */}
          <div className="flex flex-col gap-1.5">
            <Label>類型</Label>
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
                  {t === "folder" ? "資料夾" : "文件"}
                </button>
              ))}
            </div>
          </div>

          {/* Parent folder */}
          {folders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>所在資料夾</Label>
              <Select
                value={selectedParentId ?? "__root__"}
                onValueChange={(v) => { if (v) setSelectedParentId(v === "__root__" ? null : v) }}
                disabled={isSaving}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">根目錄</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="d-title">{type === "folder" ? "資料夾名稱" : "文件名稱"}</Label>
            <Input
              id="d-title"
              placeholder={type === "folder" ? "例：設計稿 / 已交付" : "例：銷售趨勢模組（網頁版）"}
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
                <Label htmlFor="d-desc">說明（選填）</Label>
                <Input
                  id="d-desc"
                  placeholder="簡短描述交付物內容"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>狀態</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => { if (v) setStatus(v as DeliverableStatus) }}
                    disabled={isSaving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="delivered">已交付</SelectItem>
                      <SelectItem value="approved">已核准</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>可見性</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) => { if (v) setVisibility(v as DeliverableVisibility) }}
                    disabled={isSaving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">內部</SelectItem>
                      <SelectItem value="client_visible">客戶可見</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSaving}>取消</Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? "新增中" : `新增${type === "folder" ? "資料夾" : "文件"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
