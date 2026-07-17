"use client"

import * as React from "react"
import Link from "next/link"
import { FileArchiveIcon, FileCodeIcon, FileIcon, FileSpreadsheetIcon, FileTextIcon, LinkIcon, PresentationIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { FileAsset } from "@/types/file-library"
import type { LibraryAssetOriginContext } from "@/types/library-classification"
import {
  formatFileSize,
  formatRelativeTimeZh,
  getAssetBadges,
  getAssetPrimaryAction,
  getAssetSecondaryInlineAction,
  getAssetStatusMessage,
  getAvailableAssetActions,
  getModuleReadonlyActions,
  getFileTypeCategory,
  type FileAssetActionId,
} from "@/lib/file-library/file-asset-status"
import { FileStatusBadges } from "@/components/ai/file-library/file-status-badges"
import { FileActionsMenu } from "@/components/ai/file-library/file-actions-menu"
import { ALL_MODULES, type ModuleKey } from "@/types/module-permission"

const MODULE_LABELS: Record<ModuleKey, string> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m.name])
) as Record<ModuleKey, string>

function renderMimeIcon(asset: FileAsset, className: string) {
  switch (getFileTypeCategory(asset)) {
    case "sheet":
      return <FileSpreadsheetIcon className={className} />
    case "ppt":
      return <PresentationIcon className={className} />
    case "md":
      return <FileCodeIcon className={className} />
    case "pdf":
    case "doc":
      return <FileTextIcon className={className} />
    case "other":
      return asset.mimeType.includes("zip") || asset.mimeType.includes("compressed")
        ? <FileArchiveIcon className={className} />
        : <FileIcon className={className} />
    default:
      return <FileIcon className={className} />
  }
}

function formatReferenceSummary(asset: FileAsset): string | undefined {
  if (!asset.references) return undefined
  const parts: string[] = []
  const { chats, evidence, observationUnits, reports, sprints } = asset.references
  if (chats > 0) parts.push(`${chats} 個對話`)
  if (evidence > 0) parts.push(`${evidence} 個 Evidence`)
  if (observationUnits > 0) parts.push(`${observationUnits} 個 Observation Unit`)
  if (reports > 0) parts.push(`${reports} 份報告`)
  if (sprints > 0) parts.push(`${sprints} 個 Sprint`)
  if (parts.length === 0) return undefined
  return `引用：${parts.join("、")}`
}

export function FileAssetRow({
  asset,
  isReferenced,
  readOnly = false,
  moduleKeys = [],
  originContext,
  onOpenDrawer,
  onReference,
  onAction,
}: {
  asset: FileAsset
  isReferenced: boolean
  readOnly?: boolean
  moduleKeys?: ModuleKey[]
  /** RES-019 §6.4: where this asset was captured from, if it came from a sub-module upload. */
  originContext?: LibraryAssetOriginContext
  onOpenDrawer: (asset: FileAsset) => void
  onReference: (asset: FileAsset) => void
  onAction: (asset: FileAsset, actionId: FileAssetActionId) => void
}) {
  const badges = getAssetBadges(asset)
  const statusMessage = getAssetStatusMessage(asset)
  const referenceSummary = formatReferenceSummary(asset)
  const readonlyActions = readOnly ? getModuleReadonlyActions(asset) : []
  const primaryAction = readOnly ? readonlyActions[0] : getAssetPrimaryAction(asset)
  const secondaryAction = readOnly ? undefined : getAssetSecondaryInlineAction(asset)
  const menuActions = readOnly ? readonlyActions.slice(1) : getAvailableAssetActions(asset)

  function runPrimary() {
    if (!primaryAction) return
    if (primaryAction.id === "reference") {
      onReference(asset)
      return
    }
    onAction(asset, primaryAction.id)
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border/40 p-3.5 last:border-b-0 hover:bg-muted/30 transition-colors sm:flex-row sm:items-center sm:gap-3">
      {/* 1. Icon */}
      <div className="flex items-center gap-3 sm:contents">
        <div className="size-9 shrink-0 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
          {renderMimeIcon(asset, "size-4")}
        </div>

        {/* 2. Primary info */}
        <div className="min-w-0 flex-1 sm:hidden">
          <button
            onClick={() => onOpenDrawer(asset)}
            className="block truncate text-left text-xs font-medium text-foreground hover:underline"
          >
            {asset.title}
          </button>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 sm:block">
        <button
          onClick={() => onOpenDrawer(asset)}
          className="block truncate text-left text-xs font-medium text-foreground hover:underline"
        >
          {asset.title}
        </button>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {formatFileSize(asset.size)} · {asset.mimeType.split("/").pop()}
        </p>
      </div>

      {/* 3. Status + references */}
      <div className="min-w-0 flex-[1.4] space-y-1">
        <FileStatusBadges badges={badges} />
        {moduleKeys.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {moduleKeys.map((key) => (
              <Badge key={key} variant="outline" className="rounded-full font-normal text-[10px] px-1.5 py-0">
                {MODULE_LABELS[key]}
              </Badge>
            ))}
          </div>
        )}
        {originContext && (
          <Link
            href={originContext.href}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground hover:underline w-fit"
          >
            <LinkIcon className="size-2.5" />
            使用於：{originContext.contextLabel}
          </Link>
        )}
        {statusMessage && (
          <p className={cn("text-[11px] leading-snug", "text-muted-foreground")}>{statusMessage}</p>
        )}
        {asset.source?.lastCheckedAt && (
          <p className="text-[10px] text-muted-foreground/70">最後檢查：{formatRelativeTimeZh(asset.source.lastCheckedAt)}</p>
        )}
        {referenceSummary && <p className="text-[10px] text-muted-foreground/80">{referenceSummary}</p>}
        {asset.lastUsedAt && (
          <p className="text-[10px] text-muted-foreground/60">最後使用：{formatRelativeTimeZh(asset.lastUsedAt)}</p>
        )}
      </div>

      {/* 4. Actions */}
      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {primaryAction && (
          <Button
            size="xs"
            variant={primaryAction.id === "reference" && isReferenced ? "ghost" : "outline"}
            onClick={runPrimary}
            className={cn(
              "rounded-full text-[11px] h-7 px-3",
              primaryAction.id === "reference" && isReferenced && "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
            )}
          >
            {primaryAction.id === "reference" && isReferenced ? "已引用" : primaryAction.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => onAction(asset, secondaryAction.id)}
            className="hidden rounded-full text-[11px] h-7 px-3 md:inline-flex"
          >
            {secondaryAction.label}
          </Button>
        )}
        <FileActionsMenu
          assetTitle={asset.title}
          actions={menuActions}
          onAction={(id) => (id === "reference" ? onReference(asset) : onAction(asset, id))}
        />
      </div>
    </div>
  )
}
