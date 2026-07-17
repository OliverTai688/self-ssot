"use client"

import type { FileAsset } from "@/types/file-library"
import type { FileAssetActionId } from "@/lib/file-library/file-asset-status"
import type { LibraryAssetOriginContext } from "@/types/library-classification"
import type { ModuleKey } from "@/types/module-permission"
import { FileAssetRow } from "@/components/ai/file-library/file-asset-row"
import { FileLibraryEmptyState, type FileLibraryEmptyVariant } from "@/components/ai/file-library/file-empty-state"

export function FileAssetList({
  assets,
  referencedTitles,
  readOnly = false,
  getModuleKeysForAsset,
  getOriginContextForAsset,
  emptyVariant,
  emptyAction,
  onOpenDrawer,
  onReference,
  onAction,
}: {
  assets: FileAsset[]
  referencedTitles: Set<string>
  readOnly?: boolean
  getModuleKeysForAsset?: (assetId: string) => ModuleKey[]
  getOriginContextForAsset?: (assetId: string) => LibraryAssetOriginContext | undefined
  emptyVariant: FileLibraryEmptyVariant
  emptyAction?: { label: string; onClick: () => void }
  onOpenDrawer: (asset: FileAsset) => void
  onReference: (asset: FileAsset) => void
  onAction: (asset: FileAsset, actionId: FileAssetActionId) => void
}) {
  if (assets.length === 0) {
    if (readOnly) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-xs text-muted-foreground">此模組尚無已分類的檔案</p>
        </div>
      )
    }
    return <FileLibraryEmptyState variant={emptyVariant} action={emptyAction} />
  }

  return (
    <div className="rounded-xl border border-border/50 bg-background/50 overflow-hidden">
      {assets.map((asset) => (
        <FileAssetRow
          key={asset.id}
          asset={asset}
          isReferenced={referencedTitles.has(asset.title)}
          readOnly={readOnly}
          moduleKeys={getModuleKeysForAsset?.(asset.id) ?? []}
          originContext={getOriginContextForAsset?.(asset.id)}
          onOpenDrawer={onOpenDrawer}
          onReference={onReference}
          onAction={onAction}
        />
      ))}
    </div>
  )
}
