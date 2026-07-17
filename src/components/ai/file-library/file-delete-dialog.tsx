"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FileAsset } from "@/types/file-library"
import { totalReferenceCount } from "@/types/file-library"

export function FileDeleteDialog({
  asset,
  open,
  onOpenChange,
  onViewReferences,
  onArchiveOnly,
  onConfirmDelete,
}: {
  asset: FileAsset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewReferences: (asset: FileAsset) => void
  onArchiveOnly: (asset: FileAsset) => void
  onConfirmDelete: (asset: FileAsset) => void
}) {
  if (!asset) return null

  const referenceCount = totalReferenceCount(asset)
  const isReferenced = referenceCount > 0

  const referenceLines: string[] = []
  if (asset.references) {
    if (asset.references.chats > 0) referenceLines.push(`${asset.references.chats} 個對話`)
    if (asset.references.evidence > 0) referenceLines.push(`${asset.references.evidence} 個 Evidence`)
    if (asset.references.observationUnits > 0) referenceLines.push(`${asset.references.observationUnits} 個 Observation Unit`)
    if (asset.references.reports > 0) referenceLines.push(`${asset.references.reports} 份報告`)
    if (asset.references.sprints > 0) referenceLines.push(`${asset.references.sprints} 個 Sprint`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isReferenced ? "此檔案目前正被使用" : "永久刪除檔案"}</DialogTitle>
          <DialogDescription>
            {isReferenced ? (
              <>
                「{asset.title}」目前被以下內容引用：
                <ul className="mt-2 list-disc space-y-0.5 pl-4">
                  {referenceLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>「{asset.title}」沒有任何引用，永久刪除後將無法復原（若有 Snapshot 也會一併移除）。</>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          {isReferenced && (
            <>
              <Button variant="outline" onClick={() => onViewReferences(asset)}>查看引用位置</Button>
              <Button variant="secondary" onClick={() => onArchiveOnly(asset)}>僅封存</Button>
            </>
          )}
          <Button variant="destructive" onClick={() => onConfirmDelete(asset)}>確認永久刪除</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
