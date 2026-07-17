"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MODULE_LIBRARY_SCOPE } from "@/types/library-classification"
import { ALL_MODULES, type ModuleKey } from "@/types/module-permission"

const MODULE_LABELS: Record<ModuleKey, string> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m.name])
) as Record<ModuleKey, string>

// Note: parents must pass `key={assetId}` so React remounts (and re-derives
// initial state) whenever the target asset changes, matching the convention
// used by the other quick-edit dialogs in file-quick-edit-dialogs.tsx.

/** Shared "分類至模組" multi-select, used by both the File Library and Media Library (RES-016 §6.3). */
export function ModuleClassificationDialog({
  assetName,
  initialModuleKeys,
  open,
  onOpenChange,
  onSubmit,
}: {
  assetName: string
  initialModuleKeys: ModuleKey[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (moduleKeys: ModuleKey[]) => void
}) {
  const [selected, setSelected] = React.useState<ModuleKey[]>(initialModuleKeys)

  function toggle(moduleKey: ModuleKey) {
    setSelected((prev) =>
      prev.includes(moduleKey) ? prev.filter((k) => k !== moduleKey) : [...prev, moduleKey]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>分類至模組</DialogTitle>
          <DialogDescription>
            選擇「{assetName}」應歸類到的一個或多個模組。財務／生活／公司的分類需經確認後才會顯示在該模組頁面。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {MODULE_LIBRARY_SCOPE.map((moduleKey) => (
            <Label
              key={moduleKey}
              className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2 text-sm font-normal cursor-pointer hover:bg-muted/50"
            >
              <Checkbox checked={selected.includes(moduleKey)} onCheckedChange={() => toggle(moduleKey)} />
              {MODULE_LABELS[moduleKey]}
            </Label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button
            onClick={() => {
              onSubmit(selected)
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
