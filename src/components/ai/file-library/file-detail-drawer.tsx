"use client"

import * as React from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { CopyIcon, LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { FileAsset, FileAssetReferences } from "@/types/file-library"
import { hasExternalSource, latestSnapshot } from "@/types/file-library"
import { formatDateZh, formatFileSize, formatRelativeTimeZh } from "@/lib/file-library/file-asset-status"
import { FileStatusBadges } from "@/components/ai/file-library/file-status-badges"
import { getAssetBadges } from "@/lib/file-library/file-asset-status"
import { FileReferencesPanel } from "@/components/ai/file-library/file-references-panel"
import type { FileAssetActionId } from "@/lib/file-library/file-asset-status"
import type { LibraryAssetOriginContext } from "@/types/library-classification"
import { ALL_MODULES, type ModuleKey } from "@/types/module-permission"

const MODULE_LABELS: Record<ModuleKey, string> = Object.fromEntries(
  ALL_MODULES.map((m) => [m.key, m.name])
) as Record<ModuleKey, string>

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "正常",
  permission_lost: "權限失效",
  source_deleted: "來源已刪除",
}

const EXTRACTION_LABEL: Record<string, string> = {
  not_started: "未處理",
  processing: "處理中",
  completed: "已完成",
  failed: "處理失敗",
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h4>
}

function ReferenceCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1 rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
      title="複製 AI 參考代碼"
    >
      {code}
      <CopyIcon className="size-3" />
      {copied && <span className="text-primary">已複製</span>}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export function FileDetailDrawer({
  asset,
  getModuleKeysForAsset,
  getOriginContextForAsset,
  open,
  onOpenChange,
  onAction,
  onOpenVersionHistory,
  onViewReference,
}: {
  asset: FileAsset | null
  getModuleKeysForAsset?: (assetId: string) => ModuleKey[]
  getOriginContextForAsset?: (assetId: string) => LibraryAssetOriginContext | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (asset: FileAsset, actionId: FileAssetActionId) => void
  onOpenVersionHistory: (asset: FileAsset) => void
  onViewReference: (asset: FileAsset, kind: keyof FileAssetReferences, label: string) => void
}) {
  if (!asset) return null

  const moduleKeys = getModuleKeysForAsset?.(asset.id) ?? []
  const originContext = getOriginContextForAsset?.(asset.id)

  const external = hasExternalSource(asset)
  const snapshot = latestSnapshot(asset)
  const source = asset.source

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle className="truncate">{asset.title}</SheetTitle>
          <SheetDescription>檔案詳細資訊</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
          <FileStatusBadges badges={getAssetBadges(asset)} />

          {/* 基本資訊 */}
          <section className="space-y-2">
            <SectionLabel>基本資訊</SectionLabel>
            <div className="space-y-1.5 rounded-lg border border-border/50 p-3">
              <InfoRow label="檔名" value={asset.title} />
              <InfoRow label="AI 參考代碼" value={<ReferenceCodeBadge code={asset.referenceCode} />} />
              <InfoRow label="格式" value={asset.mimeType} />
              <InfoRow label="大小" value={formatFileSize(asset.size)} />
              <InfoRow label="建立時間" value={formatDateZh(asset.createdAt)} />
              <InfoRow label="最後使用時間" value={asset.lastUsedAt ? formatRelativeTimeZh(asset.lastUsedAt) : "尚未使用"} />
              <InfoRow
                label="所屬模組"
                value={moduleKeys.length > 0 ? moduleKeys.map((k) => MODULE_LABELS[k]).join("、") : "尚未分類"}
              />
              {originContext && (
                <InfoRow
                  label="使用於"
                  value={
                    <Link href={originContext.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <LinkIcon className="size-3" />
                      {originContext.contextLabel}
                    </Link>
                  }
                />
              )}
              <InfoRow label="標籤" value={asset.tags && asset.tags.length > 0 ? asset.tags.join("、") : "無"} />
            </div>
          </section>

          {/* 來源 */}
          <section className="space-y-2">
            <SectionLabel>來源</SectionLabel>
            <div className="space-y-1.5 rounded-lg border border-border/50 p-3">
              <InfoRow label="來源類型" value={external ? "Google Drive" : "系統上傳（R2）"} />
              {external && source && (
                <>
                  <InfoRow label="原始位置" value={source.driveFolderPath ?? "—"} />
                  <InfoRow label="最後來源修改時間" value={formatRelativeTimeZh(source.sourceModifiedAt)} />
                  <InfoRow label="最後同步時間" value={formatRelativeTimeZh(source.lastSyncedAt)} />
                  <InfoRow label="權限狀態" value={AVAILABILITY_LABEL[source.availability]} />
                </>
              )}
              {external && source?.webViewUrl && source.availability === "available" && (
                <Button
                  size="xs"
                  variant="outline"
                  className="mt-1 rounded-full text-[11px]"
                  onClick={() => onAction(asset, "open_source")}
                >
                  開啟原始檔
                </Button>
              )}
            </div>
          </section>

          {/* PersonalOS 保存 */}
          <section className="space-y-2">
            <SectionLabel>PersonalOS 保存</SectionLabel>
            <div className="space-y-1.5 rounded-lg border border-border/50 p-3">
              <InfoRow label="是否已有 Snapshot" value={snapshot ? "是" : "否"} />
              <InfoRow label="Snapshot 數量" value={asset.snapshots.length} />
              <InfoRow label="目前預設版本" value={snapshot ? `v${snapshot.versionNumber}` : "—"} />
              <InfoRow label="最新 Snapshot 建立時間" value={snapshot ? formatDateZh(snapshot.createdAt) : "—"} />
              <InfoRow
                label="是否有尚未保存的來源更新"
                value={external && source?.syncStatus === "outdated" ? "是" : "否"}
              />
              {asset.snapshots.length > 0 && (
                <Button
                  size="xs"
                  variant="outline"
                  className="mt-1 rounded-full text-[11px]"
                  onClick={() => onOpenVersionHistory(asset)}
                >
                  查看版本歷程
                </Button>
              )}
            </div>
          </section>

          {/* AI 處理 */}
          <section className="space-y-2">
            <SectionLabel>AI 處理</SectionLabel>
            <div className="space-y-1.5 rounded-lg border border-border/50 p-3">
              <InfoRow label="文字解析狀態" value={EXTRACTION_LABEL[asset.processing?.extractionStatus ?? "not_started"]} />
              <InfoRow label="索引狀態" value={asset.processing?.indexed ? "已索引" : "未索引"} />
              <InfoRow label="Chunk 數量" value={asset.processing?.chunkCount ?? "—"} />
              {asset.processing?.errorMessage && (
                <p className="text-[11px] text-destructive">{asset.processing.errorMessage}</p>
              )}
              {asset.processing?.extractionStatus === "failed" && (
                <Button
                  size="xs"
                  variant="outline"
                  className="mt-1 rounded-full text-[11px]"
                  onClick={() => onAction(asset, "sync_now")}
                >
                  重新處理
                </Button>
              )}
            </div>
          </section>

          {/* 引用 */}
          <section className="space-y-2">
            <SectionLabel>引用</SectionLabel>
            <FileReferencesPanel
              references={asset.references}
              onViewReference={(kind, label) => onViewReference(asset, kind, label)}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
