"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TaskPriority, TaskVisibility } from "@/types/work"

export interface TaskSheetInput {
  title: string
  status: "todo"
  priority: TaskPriority
  visibility: TaskVisibility
  source: "manual"
}

interface TaskSheetProps {
  open: boolean
  onClose: () => void
  onSave: (task: TaskSheetInput) => boolean | Promise<boolean>
  isSaving?: boolean
  error?: string | null
}

export function TaskSheet({
  open,
  onClose,
  onSave,
  isSaving = false,
  error,
}: TaskSheetProps) {
  const [title, setTitle] = React.useState("")
  const [priority, setPriority] = React.useState<string>("2")
  const [visibility, setVisibility] = React.useState<TaskVisibility>("internal")

  function resetForm() {
    setTitle("")
    setPriority("2")
    setVisibility("internal")
  }

  async function handleSave() {
    if (!title.trim() || isSaving) return

    const saved = await onSave({
      title: title.trim(),
      status: "todo",
      priority: Number(priority) as TaskPriority,
      visibility,
      source: "manual",
    })

    if (!saved) return

    resetForm()
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && !isSaving && onClose()}>
      <SheetTrigger className="hidden" />
      <SheetContent side="right" className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle>新增任務</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 flex-1 p-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">任務名稱</Label>
            <Input
              id="task-title"
              placeholder="例：修改色彩對比度"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave()
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>優先度</Label>
            <Select
              value={priority}
              onValueChange={(v) => { if (v) setPriority(v) }}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">高</SelectItem>
                <SelectItem value="2">中</SelectItem>
                <SelectItem value="3">低</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>可見性</Label>
            <Select
              value={visibility}
              onValueChange={(v) => { if (v) setVisibility(v as TaskVisibility) }}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">內部</SelectItem>
                <SelectItem value="client_visible">客戶可見</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter>
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
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? "新增中" : "新增任務"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
