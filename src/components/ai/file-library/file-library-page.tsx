"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  FileAsset,
  FileAssetReferences,
  FileLibraryFilters,
  FileLibraryTab,
} from "@/types/file-library"
import { DEFAULT_FILE_LIBRARY_FILTERS, latestSnapshot } from "@/types/file-library"
import { generateReferenceCode } from "@/lib/naming/reference-code"
import { useLibraryClassification } from "@/lib/context/library-classification-context"
import type { ModuleKey } from "@/types/module-permission"
import {
  countNeedsAttention,
  matchesFilters,
  matchesTab,
  type FileAssetActionId,
} from "@/lib/file-library/file-asset-status"
import { FileLibraryTabs } from "@/components/ai/file-library/file-library-tabs"
import { FileSearchAndFilters } from "@/components/ai/file-library/file-search-and-filters"
import { ActiveFilterChips } from "@/components/ai/file-library/active-filter-chips"
import { FileAssetList } from "@/components/ai/file-library/file-asset-list"
import type { FileLibraryEmptyVariant } from "@/components/ai/file-library/file-empty-state"
import { FileDetailDrawer } from "@/components/ai/file-library/file-detail-drawer"
import { FileVersionHistory, type FileVersionHistoryActionId } from "@/components/ai/file-library/file-version-history"
import { FileDeleteDialog } from "@/components/ai/file-library/file-delete-dialog"
import {
  FileRenameDialog,
  FileTagsDialog,
  FileWorkspaceDialog,
} from "@/components/ai/file-library/file-quick-edit-dialogs"

let uploadCounter = 0

function makeAssetId(prefix: string): string {
  uploadCounter += 1
  return `${prefix}-${Date.now()}-${uploadCounter}`
}

const MOCK_UPLOAD_NAMES = ["系統需求規格書.pdf", "破產保護程序大綱.docx", "商業模式畫布.pdf", "產品開發時程表.xlsx"]

export function FileLibraryPage({
  referencedTitles,
  onReferenceAsset,
  mode = "full",
  filterModuleKey,
}: {
  referencedTitles: Set<string>
  onReferenceAsset: (title: string) => void
  /** RES-016 §6.5: "module_readonly" hides upload and mutating actions, filtered to one module's classified assets. */
  mode?: "full" | "module_readonly"
  filterModuleKey?: ModuleKey
}) {
  const readOnly = mode === "module_readonly"
  const {
    getModuleKeysForAsset,
    getOriginContextForAsset,
    getAssetIdsForModule,
    setAssetModuleKeys,
    fileAssets: assets,
    setFileAssets: setAssets,
  } = useLibraryClassification()
  const [tab, setTab] = React.useState<FileLibraryTab>("all")
  const [filters, setFilters] = React.useState<FileLibraryFilters>(DEFAULT_FILE_LIBRARY_FILTERS)
  const [search, setSearch] = React.useState("")

  const [detailAssetId, setDetailAssetId] = React.useState<string | null>(null)
  const [versionHistoryAssetId, setVersionHistoryAssetId] = React.useState<string | null>(null)
  const [deleteAssetId, setDeleteAssetId] = React.useState<string | null>(null)
  const [renameAssetId, setRenameAssetId] = React.useState<string | null>(null)
  const [tagsAssetId, setTagsAssetId] = React.useState<string | null>(null)
  const [workspaceAssetId, setWorkspaceAssetId] = React.useState<string | null>(null)

  const [toast, setToast] = React.useState<string | null>(null)
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const pushToast = React.useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  React.useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  function updateAsset(id: string, updater: (asset: FileAsset) => FileAsset) {
    setAssets((prev) => prev.map((a) => (a.id === id ? updater(a) : a)))
  }

  const visibleAssets = React.useMemo(() => {
    const base = assets.filter((a) => a.status !== "deleted")
    if (!readOnly || !filterModuleKey) return base
    const moduleAssetIds = getAssetIdsForModule(filterModuleKey, "file")
    return base.filter((a) => a.status === "active" && moduleAssetIds.has(a.id))
  }, [assets, readOnly, filterModuleKey, getAssetIdsForModule])
  const needsAttentionCount = React.useMemo(() => countNeedsAttention(visibleAssets), [visibleAssets])

  const tabAssets = React.useMemo(
    () => visibleAssets.filter((a) => matchesTab(a, tab)),
    [visibleAssets, tab]
  )
  const filteredAssets = React.useMemo(() => {
    const list = tabAssets.filter((a) => matchesFilters(a, filters, search))
    return [...list].sort((a, b) => {
      const aTime = new Date(a.lastUsedAt ?? a.createdAt).getTime()
      const bTime = new Date(b.lastUsedAt ?? b.createdAt).getTime()
      return bTime - aTime
    })
  }, [tabAssets, filters, search])

  const hasActiveFilters = Object.values(filters).some((v) => v !== "all")
  const hasSearch = search.trim().length > 0

  const emptyVariant: FileLibraryEmptyVariant = React.useMemo(() => {
    if (tabAssets.length === 0) {
      if (tab === "recent") return "recent_empty"
      if (tab === "needs_attention") return "needs_attention_empty"
      if (tab === "archived") return "archived_empty"
      return "no_files"
    }
    if (hasSearch) return "search_no_results"
    return "filter_no_results"
  }, [tab, tabAssets.length, hasSearch])

  const detailAsset = assets.find((a) => a.id === detailAssetId) ?? null
  const versionHistoryAsset = assets.find((a) => a.id === versionHistoryAssetId) ?? null
  const deleteAsset = assets.find((a) => a.id === deleteAssetId) ?? null
  const renameAsset = assets.find((a) => a.id === renameAssetId) ?? null
  const tagsAsset = assets.find((a) => a.id === tagsAssetId) ?? null
  const workspaceAsset = assets.find((a) => a.id === workspaceAssetId) ?? null

  function openVersionHistory(asset: FileAsset) {
    setDetailAssetId(null)
    setVersionHistoryAssetId(asset.id)
  }

  function requestDelete(asset: FileAsset) {
    setDeleteAssetId(asset.id)
  }

  function handleReference(asset: FileAsset) {
    onReferenceAsset(asset.title)
    updateAsset(asset.id, (a) => ({ ...a, lastUsedAt: new Date().toISOString() }))
  }

  function handleAction(asset: FileAsset, actionId: FileAssetActionId) {
    const now = new Date().toISOString()

    switch (actionId) {
      case "download":
        pushToast("尚未接上真實檔案內容（示範資料），暫時無法下載。")
        return

      case "open_source":
        pushToast("尚未接上 Google Drive API：暫時無法在此開啟原始檔（示範資料）。")
        return

      case "view_info":
      case "view_snapshot":
      case "view_references":
        setDetailAssetId(asset.id)
        return

      case "create_snapshot":
      case "update_snapshot": {
        const nextVersion = asset.snapshots.length + 1
        updateAsset(asset.id, (a) => ({
          ...a,
          snapshots: [
            ...a.snapshots,
            { id: makeAssetId("snap"), versionNumber: nextVersion, sourceVersion: a.source?.providerVersion, createdAt: now, referenceCount: 0 },
          ],
          source: a.source ? { ...a.source, syncStatus: "synced", lastSyncedAt: now, lastCheckedAt: now } : a.source,
        }))
        pushToast(actionId === "create_snapshot" ? `已建立「v${nextVersion}」快照。` : `已更新快照至「v${nextVersion}」。`)
        return
      }

      case "sync_now": {
        if (asset.processing?.extractionStatus === "failed") {
          updateAsset(asset.id, (a) => ({ ...a, processing: { extractionStatus: "processing", indexed: false } }))
          setTimeout(() => {
            updateAsset(asset.id, (a) => ({
              ...a,
              processing: { extractionStatus: "completed", indexed: true, chunkCount: Math.max(4, Math.round((a.size ?? 400_000) / 60_000)) },
            }))
            pushToast(`「${asset.title}」重新處理完成，已建立索引。`)
          }, 900)
          return
        }
        updateAsset(asset.id, (a) => (a.source ? { ...a, source: { ...a.source, lastCheckedAt: now } } : a))
        pushToast("已重新檢查同步狀態。")
        return
      }

      case "compare_diff":
        setDetailAssetId(null)
        setVersionHistoryAssetId(asset.id)
        pushToast("差異比對服務尚未接上真實內容（示範資料），已改為顯示版本歷程。")
        return

      case "view_versions":
        openVersionHistory(asset)
        return

      case "move_workspace":
        setWorkspaceAssetId(asset.id)
        return
      case "manage_tags":
        setTagsAssetId(asset.id)
        return
      case "rename":
        setRenameAssetId(asset.id)
        return

      case "archive":
        updateAsset(asset.id, (a) => ({ ...a, status: "archived" }))
        pushToast("已封存，既有引用不受影響。")
        return
      case "unarchive":
        updateAsset(asset.id, (a) => ({ ...a, status: "active" }))
        pushToast("已取消封存。")
        return

      case "disconnect_source":
        updateAsset(asset.id, (a) => ({ ...a, source: undefined }))
        pushToast("已中斷外部來源，PersonalOS 已保存的版本不受影響。")
        return

      case "reconnect_source":
        updateAsset(asset.id, (a) =>
          a.source
            ? {
                ...a,
                source: {
                  ...a.source,
                  availability: "available",
                  syncStatus: latestSnapshot(a) && a.source.providerVersion !== latestSnapshot(a)?.sourceVersion ? "outdated" : "synced",
                  lastCheckedAt: now,
                  errorMessage: undefined,
                },
              }
            : a
        )
        pushToast("已重新連結來源。")
        return

      case "remove_from_library":
      case "delete_permanent":
        requestDelete(asset)
        return

      default:
        return
    }
  }

  function handleSnapshotAction(snapshot: { id: string; versionNumber: number }, action: FileVersionHistoryActionId) {
    if (!versionHistoryAsset) return
    if (action === "view" || action === "download") {
      pushToast("尚未接上真實 R2 檔案內容，此為示範資料，暫時無法查看或下載。")
      return
    }
    if (action === "reference") {
      onReferenceAsset(versionHistoryAsset.title)
      return
    }
    if (action === "view_references") {
      setVersionHistoryAssetId(null)
      setDetailAssetId(versionHistoryAsset.id)
      return
    }
    if (action === "compare") {
      pushToast("比較差異功能尚未接上真實 diff 服務（示範資料）。")
      return
    }
    if (action === "branch") {
      const newAsset: FileAsset = {
        id: makeAssetId("fa-copy"),
        title: `${versionHistoryAsset.title}（v${snapshot.versionNumber} 副本）`,
        referenceCode: generateReferenceCode("FILE", "AIINPUT"),
        mimeType: versionHistoryAsset.mimeType,
        size: versionHistoryAsset.size,
        status: "active",
        snapshots: [{ id: makeAssetId("snap"), versionNumber: 1, createdAt: new Date().toISOString(), referenceCount: 0 }],
        processing: versionHistoryAsset.processing,
        references: { chats: 0, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
        createdAt: new Date().toISOString(),
      }
      setAssets((prev) => [newAsset, ...prev])
      setVersionHistoryAssetId(null)
      pushToast(`已從 v${snapshot.versionNumber} 建立獨立副本「${newAsset.title}」。`)
    }
  }

  function handleViewReference(asset: FileAsset, kind: keyof FileAssetReferences, label: string) {
    pushToast(`「${asset.title}」的 ${label} 引用位置清單尚未接上真實查詢（示範資料）。`)
  }

  function handleUpload() {
    const name = MOCK_UPLOAD_NAMES[Math.floor(Math.random() * MOCK_UPLOAD_NAMES.length)]
    const id = makeAssetId("fa-upload")
    const now = new Date().toISOString()
    const newAsset: FileAsset = {
      id,
      title: name,
      referenceCode: generateReferenceCode("FILE", "AIINPUT", now),
      mimeType: name.endsWith(".xlsx")
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : name.endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf",
      size: 1_400_000,
      status: "active",
      snapshots: [{ id: makeAssetId("snap"), versionNumber: 1, createdAt: now, referenceCount: 0 }],
      processing: { extractionStatus: "processing", indexed: false },
      references: { chats: 0, evidence: 0, observationUnits: 0, reports: 0, sprints: 0 },
      createdAt: now,
      lastUsedAt: now,
    }
    setAssets((prev) => [newAsset, ...prev])
    pushToast(`檔案「${name}」已上傳，AI 正在解析中…`)
    setTimeout(() => {
      updateAsset(id, (a) => ({
        ...a,
        processing: { extractionStatus: "completed", indexed: true, chunkCount: 9 },
      }))
    }, 1100)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {readOnly ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">檔案庫</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            共有 {visibleAssets.length} 個檔案已分類至此模組（唯讀 — 上傳請至 AI 匯入）
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FileLibraryTabs active={tab} needsAttentionCount={needsAttentionCount} onChange={setTab} />
            <Button size="sm" onClick={handleUpload} className="rounded-full shadow-sm text-xs gap-1.5 px-4 h-8">
              <PlusIcon className="size-4" />
              <span>上傳新檔案</span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">共有 {visibleAssets.filter((a) => a.status === "active").length} 個檔案</p>

          <FileSearchAndFilters search={search} filters={filters} onSearchChange={setSearch} onFiltersChange={setFilters} />
          <ActiveFilterChips filters={filters} search={search} onFiltersChange={setFilters} onSearchChange={setSearch} />
        </>
      )}

      <div className="min-h-0 flex-1">
        <FileAssetList
          assets={filteredAssets}
          referencedTitles={referencedTitles}
          readOnly={readOnly}
          getModuleKeysForAsset={getModuleKeysForAsset}
          getOriginContextForAsset={getOriginContextForAsset}
          emptyVariant={emptyVariant}
          emptyAction={
            readOnly
              ? undefined
              : emptyVariant === "no_files"
                ? { label: "上傳新檔案", onClick: handleUpload }
                : hasActiveFilters || hasSearch
                  ? { label: "清除全部篩選", onClick: () => { setFilters(DEFAULT_FILE_LIBRARY_FILTERS); setSearch("") } }
                  : undefined
          }
          onOpenDrawer={(asset) => setDetailAssetId(asset.id)}
          onReference={handleReference}
          onAction={handleAction}
        />
      </div>

      <FileDetailDrawer
        asset={detailAsset}
        getModuleKeysForAsset={getModuleKeysForAsset}
        getOriginContextForAsset={getOriginContextForAsset}
        open={detailAssetId !== null}
        onOpenChange={(open) => !open && setDetailAssetId(null)}
        onAction={handleAction}
        onOpenVersionHistory={openVersionHistory}
        onViewReference={handleViewReference}
      />

      <FileVersionHistory
        asset={versionHistoryAsset}
        open={versionHistoryAssetId !== null}
        onOpenChange={(open) => !open && setVersionHistoryAssetId(null)}
        onSnapshotAction={handleSnapshotAction}
      />

      <FileDeleteDialog
        asset={deleteAsset}
        open={deleteAssetId !== null}
        onOpenChange={(open) => !open && setDeleteAssetId(null)}
        onViewReferences={(asset) => {
          setDeleteAssetId(null)
          setDetailAssetId(asset.id)
        }}
        onArchiveOnly={(asset) => {
          updateAsset(asset.id, (a) => ({ ...a, status: "archived" }))
          setDeleteAssetId(null)
          pushToast("已封存，既有引用不受影響。")
        }}
        onConfirmDelete={(asset) => {
          setAssets((prev) => prev.filter((a) => a.id !== asset.id))
          setDeleteAssetId(null)
          pushToast(`「${asset.title}」已永久刪除。`)
        }}
      />

      <FileRenameDialog
        key={`rename-${renameAsset?.id ?? "none"}`}
        asset={renameAsset}
        open={renameAssetId !== null}
        onOpenChange={(open) => !open && setRenameAssetId(null)}
        onSubmit={(asset, newTitle) => {
          updateAsset(asset.id, (a) => ({ ...a, title: newTitle }))
          pushToast("已更新檔名。")
        }}
      />
      <FileTagsDialog
        key={`tags-${tagsAsset?.id ?? "none"}`}
        asset={tagsAsset}
        open={tagsAssetId !== null}
        onOpenChange={(open) => !open && setTagsAssetId(null)}
        onSubmit={(asset, tags) => {
          updateAsset(asset.id, (a) => ({ ...a, tags }))
          pushToast("已更新標籤。")
        }}
      />
      <FileWorkspaceDialog
        key={`workspace-${workspaceAsset?.id ?? "none"}`}
        asset={workspaceAsset}
        initialModuleKeys={workspaceAsset ? getModuleKeysForAsset(workspaceAsset.id) : []}
        open={workspaceAssetId !== null}
        onOpenChange={(open) => !open && setWorkspaceAssetId(null)}
        onSubmit={(asset, moduleKeys) => {
          setAssetModuleKeys(asset.id, "file", moduleKeys, "human_confirmed")
          pushToast(
            moduleKeys.length > 0
              ? `已分類至：${moduleKeys.length} 個模組。`
              : "已清除模組分類。"
          )
        }}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4",
          )}
        >
          <div className="pointer-events-auto rounded-full border border-border/60 bg-foreground text-background px-4 py-2 text-xs shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
