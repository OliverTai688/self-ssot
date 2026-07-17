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
import type { MediaAsset } from "@/types/media-library"

// Note: parents must pass `key={asset?.id ?? "none"}` when rendering this
// dialog so React remounts (and re-derives initial state) whenever the
// target asset changes, instead of syncing state via an effect.

// Mock-mode heuristic — see RES-018 §3/§5. Swap for a real provider call
// once one exists in this repo; keep the same call shape.
function suggestMediaName(asset: MediaAsset): string {
  const withoutExtension = asset.name.replace(/\.[a-zA-Z0-9]+$/, "")
  const cleaned = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  return cleaned || asset.name
}

export function MediaRenameDialog({
  asset,
  open,
  onOpenChange,
  onSubmit,
}: {
  asset: MediaAsset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (asset: MediaAsset, newName: string) => void
}) {
  const [value, setValue] = React.useState(asset?.name ?? "")

  if (!asset) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重新命名媒體</DialogTitle>
          <DialogDescription>只會變更 PersonalOS 內顯示的名稱。</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="media-rename-input">名稱</Label>
            <Button
              variant="ghost"
              size="xs"
              className="h-6 gap-1 text-[10px] text-muted-foreground"
              onClick={() => setValue(suggestMediaName(asset))}
            >
              <SparklesIcon className="size-3" /> AI 命名
            </Button>
          </div>
          <Input
            id="media-rename-input"
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
