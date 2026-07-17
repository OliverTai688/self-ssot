"use client"

import * as React from "react"
import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FileAsset } from "@/types/file-library"
import type { ModuleKey } from "@/types/module-permission"
import { ModuleClassificationDialog } from "@/components/ai/library/module-classification-dialog"

// Note: parents must pass `key={asset?.id ?? "none"}` when rendering these
// dialogs so React remounts (and re-derives initial state) whenever the
// target asset changes, instead of syncing state via an effect.

// Mock-mode heuristic — see RES-018 §3/§5. Swap for a real provider call
// once one exists in this repo; keep the same call shape.
function suggestFileTitle(asset: FileAsset): string {
  const withoutExtension = asset.title.replace(/\.[a-zA-Z0-9]+$/, "")
  const cleaned = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  return cleaned || asset.title
}

export function FileRenameDialog({
  asset,
  open,
  onOpenChange,
  onSubmit,
}: {
  asset: FileAsset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (asset: FileAsset, newTitle: string) => void
}) {
  const [value, setValue] = React.useState(asset?.title ?? "")

  if (!asset) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重新命名檔案</DialogTitle>
          <DialogDescription>只會變更 PersonalOS 內顯示的名稱，不會變更 Google Drive 原始檔名。</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="file-rename-input">檔名</Label>
            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 text-[10px] text-muted-foreground"
              onClick={() => setValue(suggestFileTitle(asset))}
            >
              <SparklesIcon className="size-3" /> AI 命名
            </Button>
          </div>
          <Input
            id="file-rename-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            disabled={!value.trim()}
            onClick={() => {
              onSubmit(asset, value.trim())
              onOpenChange(false)
            }}
          >
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function FileTagsDialog({
  asset,
  open,
  onOpenChange,
  onSubmit,
}: {
  asset: FileAsset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (asset: FileAsset, tags: string[]) => void
}) {
  const [value, setValue] = React.useState((asset?.tags ?? []).join("、"))

  if (!asset) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>管理標籤</DialogTitle>
          <DialogDescription>用頓號（、）分隔多個標籤，例如：ESG、董事會、2026</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="file-tags-input">標籤</Label>
          <Input
            id="file-tags-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={() => {
              const tags = value.split(/[、,]/).map((t) => t.trim()).filter(Boolean)
              onSubmit(asset, tags)
              onOpenChange(false)
            }}
          >
            儲存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** RES-016 §6.3: thin wrapper around the shared `ModuleClassificationDialog`, replacing the old single-select "move to Workspace" dialog. */
export function FileWorkspaceDialog({
  asset,
  initialModuleKeys,
  open,
  onOpenChange,
  onSubmit,
}: {
  asset: FileAsset | null
  initialModuleKeys: ModuleKey[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (asset: FileAsset, moduleKeys: ModuleKey[]) => void
}) {
  if (!asset) return null

  return (
    <ModuleClassificationDialog
      assetName={asset.title}
      initialModuleKeys={initialModuleKeys}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={(moduleKeys) => onSubmit(asset, moduleKeys)}
    />
  )
}
