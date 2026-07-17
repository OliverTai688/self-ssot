"use client"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type { FileAsset, FileAssetSnapshot } from "@/types/file-library"
import { latestSnapshot } from "@/types/file-library"
import { formatDateZh, formatRelativeTimeZh } from "@/lib/file-library/file-asset-status"

export type FileVersionHistoryActionId = "view" | "download" | "reference" | "view_references" | "compare" | "branch"

export function FileVersionHistory({
  asset,
  open,
  onOpenChange,
  onSnapshotAction,
}: {
  asset: FileAsset | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSnapshotAction: (snapshot: FileAssetSnapshot, action: FileVersionHistoryActionId) => void
}) {
  if (!asset) return null

  const snapshots = [...asset.snapshots].sort((a, b) => b.versionNumber - a.versionNumber)
  const latest = latestSnapshot(asset)
  const source = asset.source
  const sourceAheadOfSnapshot = Boolean(source && (!latest || source.providerVersion !== latest.sourceVersion))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle>版本歷程</SheetTitle>
          <SheetDescription>{asset.title}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
          {source && (
            <section className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">目前 Google Drive 版本</h4>
              <div className="rounded-lg border border-border/50 p-3 text-xs space-y-1">
                <p className="font-medium text-foreground">{formatDateZh(source.sourceModifiedAt)}（{formatRelativeTimeZh(source.sourceModifiedAt)}）</p>
                {sourceAheadOfSnapshot ? (
                  <p className="text-amber-600 dark:text-amber-400">
                    {latest ? "尚未建立對應 Snapshot，PersonalOS 目前仍使用舊版本" : "尚未建立 Snapshot"}
                  </p>
                ) : (
                  <p className="text-emerald-600 dark:text-emerald-400">與最新 Snapshot 版本一致</p>
                )}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PersonalOS 已保存版本</h4>
            {snapshots.length === 0 ? (
              <p className="text-xs text-muted-foreground">尚未建立任何 Snapshot。</p>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snap) => (
                  <div key={snap.id} className="rounded-lg border border-border/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="rounded-full font-normal">v{snap.versionNumber}</Badge>
                      <span className="text-[10px] text-muted-foreground">建立於 {formatDateZh(snap.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {snap.referenceCount > 0 ? `被 ${snap.referenceCount} 個項目引用` : "無引用"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="xs" variant="outline" className="rounded-full text-[11px]" onClick={() => onSnapshotAction(snap, "view")}>查看</Button>
                      <Button size="xs" variant="outline" className="rounded-full text-[11px]" onClick={() => onSnapshotAction(snap, "download")}>下載</Button>
                      <Button size="xs" variant="outline" className="rounded-full text-[11px]" onClick={() => onSnapshotAction(snap, "reference")}>引用至對話</Button>
                      {snap.referenceCount > 0 && (
                        <Button size="xs" variant="outline" className="rounded-full text-[11px]" onClick={() => onSnapshotAction(snap, "view_references")}>查看引用位置</Button>
                      )}
                      {source && (
                        <Button size="xs" variant="outline" className="rounded-full text-[11px]" onClick={() => onSnapshotAction(snap, "compare")}>與目前來源比較</Button>
                      )}
                      <Button size="xs" variant="outline" className="rounded-full text-[11px]" onClick={() => onSnapshotAction(snap, "branch")}>從此版本建立獨立副本</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
