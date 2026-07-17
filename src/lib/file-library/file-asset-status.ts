import type {
  FileAsset,
  FileLibraryFilters,
  FileLibraryTab,
  FileTypeFilter,
} from "@/types/file-library"
import { hasExternalSource, hasSnapshot, latestSnapshot, totalReferenceCount } from "@/types/file-library"

// ─── Relative time formatting ─────────────────────────────────────────────

export function formatRelativeTimeZh(iso: string | undefined): string {
  if (!iso) return "從未"
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return "剛剛"
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "剛剛"
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(iso).toISOString().slice(0, 10)
}

export function formatDateZh(iso: string | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toISOString().slice(0, 10)
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return "—"
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ─── Badges ───────────────────────────────────────────────────────────────

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info"

export interface AssetBadge {
  key: string
  label: string
  tone: BadgeTone
}

export function getAssetBadges(asset: FileAsset): AssetBadge[] {
  const badges: AssetBadge[] = []
  const snapshot = latestSnapshot(asset)
  const external = hasExternalSource(asset)
  const source = asset.source

  // 1. Source badge
  if (external) {
    if (source?.availability === "permission_lost") {
      badges.push({ key: "source", label: "來源已中斷", tone: "danger" })
    } else if (source?.availability === "source_deleted") {
      badges.push({ key: "source", label: "來源無法存取", tone: "danger" })
    } else {
      badges.push({ key: "source", label: "Google Drive", tone: "neutral" })
    }
  } else {
    badges.push({ key: "source", label: "系統託管", tone: "neutral" })
  }

  // 2. Preservation badge
  if (snapshot) {
    badges.push({ key: "preservation", label: `已保存 v${snapshot.versionNumber}`, tone: "neutral" })
  } else if (external) {
    badges.push({ key: "preservation", label: "僅外部引用", tone: "warning" })
  } else {
    badges.push({ key: "preservation", label: "尚無快照", tone: "warning" })
  }

  // 3. Sync badge (Drive assets only, only once a snapshot exists to sync against)
  if (external && source && source.availability === "available" && snapshot) {
    const syncToneMap: Record<string, { label: string; tone: BadgeTone }> = {
      synced: { label: "同步完成", tone: "success" },
      outdated: { label: "有新版本", tone: "warning" },
      syncing: { label: "同步中", tone: "info" },
      error: { label: "同步失敗", tone: "danger" },
    }
    const entry = syncToneMap[source.syncStatus]
    if (entry) badges.push({ key: "sync", label: entry.label, tone: entry.tone })
  }

  // 4. AI badge (only when there's something to say, keep to 2-3 total)
  if (badges.length < 3 && asset.processing) {
    if (asset.processing.extractionStatus === "completed" && asset.processing.indexed) {
      badges.push({ key: "ai", label: "已索引", tone: "success" })
    } else if (asset.processing.extractionStatus === "processing") {
      badges.push({ key: "ai", label: "處理中", tone: "info" })
    } else if (asset.processing.extractionStatus === "failed") {
      badges.push({ key: "ai", label: "解析失敗", tone: "danger" })
    }
  }

  return badges.slice(0, 3)
}

// ─── Status message (secondary explanatory line) ─────────────────────────

export function getAssetStatusMessage(asset: FileAsset): string | undefined {
  const source = asset.source
  const snapshot = latestSnapshot(asset)

  if (source?.provider === "google_drive") {
    if (source.availability === "permission_lost") {
      return snapshot
        ? "仍可查看 PersonalOS 已保存的版本"
        : "重新連結來源後才能存取內容，目前沒有已保存版本"
    }
    if (source.availability === "source_deleted") {
      return snapshot
        ? "來源已被移除，仍可查看 PersonalOS 已保存的版本"
        : "來源已被移除，且沒有已保存版本"
    }
    if (source.syncStatus === "outdated") {
      return "Drive 已更新，PersonalOS 目前仍使用舊快照"
    }
    if (source.syncStatus === "error" && source.errorMessage) {
      return source.errorMessage
    }
  }

  if (asset.processing?.extractionStatus === "failed" && asset.processing.errorMessage) {
    return asset.processing.errorMessage
  }

  return undefined
}

// ─── File type category (pdf / md / doc / sheet / ppt / other) ───────────

export type FileTypeCategory = Exclude<FileTypeFilter, "all">

export function getFileTypeCategory(asset: FileAsset): FileTypeCategory {
  const mime = asset.mimeType.toLowerCase()
  const ext = asset.title.toLowerCase().split(".").pop() ?? ""

  if (mime.includes("pdf") || ext === "pdf") return "pdf"
  if (mime.includes("markdown") || ext === "md" || ext === "markdown") return "md"
  if (
    mime.includes("wordprocessingml") ||
    mime.includes("msword") ||
    mime === "application/vnd.google-apps.document" ||
    ext === "doc" ||
    ext === "docx"
  ) {
    return "doc"
  }
  if (
    mime.includes("spreadsheetml") ||
    mime.includes("ms-excel") ||
    mime === "application/vnd.google-apps.spreadsheet" ||
    ext === "xls" ||
    ext === "xlsx" ||
    ext === "csv"
  ) {
    return "sheet"
  }
  if (
    mime.includes("presentationml") ||
    mime.includes("ms-powerpoint") ||
    mime === "application/vnd.google-apps.presentation" ||
    ext === "ppt" ||
    ext === "pptx"
  ) {
    return "ppt"
  }
  return "other"
}

// ─── Actions ──────────────────────────────────────────────────────────────

export type FileAssetActionId =
  | "reference"
  | "download"
  | "open_source"
  | "view_info"
  | "create_snapshot"
  | "update_snapshot"
  | "sync_now"
  | "compare_diff"
  | "view_versions"
  | "view_snapshot"
  | "view_references"
  | "move_workspace"
  | "manage_tags"
  | "rename"
  | "archive"
  | "unarchive"
  | "disconnect_source"
  | "reconnect_source"
  | "remove_from_library"
  | "delete_permanent"

export interface FileAssetAction {
  id: FileAssetActionId
  label: string
  destructive?: boolean
}

/** The single leading button rendered inline on the row (not in the "..." menu). */
export function getAssetPrimaryAction(asset: FileAsset): FileAssetAction {
  const source = asset.source
  const snapshot = latestSnapshot(asset)

  if (source?.provider === "google_drive") {
    if (source.availability === "permission_lost" || source.availability === "source_deleted") {
      return snapshot
        ? { id: "view_snapshot", label: "查看快照" }
        : { id: "reconnect_source", label: "重新連結" }
    }
    if (source.syncStatus === "outdated") {
      return { id: "update_snapshot", label: "更新快照" }
    }
    if (!snapshot) {
      return { id: "create_snapshot", label: "建立快照" }
    }
  }

  return { id: "reference", label: "引用至對話" }
}

/** Secondary inline button shown next to the primary action, when relevant. */
export function getAssetSecondaryInlineAction(asset: FileAsset): FileAssetAction | undefined {
  const source = asset.source
  if (source?.provider === "google_drive") {
    if (source.availability === "permission_lost" || source.availability === "source_deleted") {
      return hasSnapshot(asset) ? { id: "reconnect_source", label: "重新連結來源" } : { id: "remove_from_library", label: "從檔案庫移除", destructive: true }
    }
    if (source.syncStatus === "outdated") {
      return { id: "compare_diff", label: "比較差異" }
    }
  }
  return undefined
}

/** Full "..." overflow menu, ordered and filtered to what applies to this asset. */
export function getAvailableAssetActions(asset: FileAsset): FileAssetAction[] {
  const actions: FileAssetAction[] = []
  const external = hasExternalSource(asset)
  const source = asset.source
  const snapshot = hasSnapshot(asset)
  const isArchived = asset.status === "archived"

  actions.push({ id: "reference", label: "引用至對話" })

  if (external && source?.availability === "available" && source.webViewUrl) {
    actions.push({ id: "open_source", label: "開啟原始檔" })
  }

  actions.push({ id: "view_info", label: "查看檔案資訊" })

  if (external) {
    if (!snapshot && source?.availability === "available") {
      actions.push({ id: "create_snapshot", label: "建立目前版本快照" })
    }
    if (snapshot && source?.availability === "available" && source.syncStatus === "outdated") {
      actions.push({ id: "update_snapshot", label: "更新快照" })
      actions.push({ id: "compare_diff", label: "比較差異" })
    }
    if (source?.availability === "available") {
      actions.push({ id: "sync_now", label: "立即同步" })
    }
  }

  if (snapshot) {
    actions.push({ id: "view_versions", label: "查看版本歷程" })
  }

  if (totalReferenceCount(asset) > 0) {
    actions.push({ id: "view_references", label: "查看引用位置" })
  }

  actions.push({ id: "move_workspace", label: "分類至模組" })
  actions.push({ id: "manage_tags", label: "管理標籤" })
  actions.push({ id: "rename", label: "重新命名" })

  if (isArchived) {
    actions.push({ id: "unarchive", label: "取消封存" })
  } else {
    actions.push({ id: "archive", label: "封存" })
  }

  if (external) {
    if (source?.availability === "available") {
      actions.push({ id: "disconnect_source", label: "中斷外部來源", destructive: true })
    } else if (source?.availability === "permission_lost" || source?.availability === "source_deleted") {
      actions.push({ id: "reconnect_source", label: "重新連結來源" })
    }
  }

  if (external && !snapshot && source && source.availability !== "available") {
    actions.push({ id: "remove_from_library", label: "從檔案庫移除", destructive: true })
  }

  actions.push({ id: "delete_permanent", label: "永久刪除", destructive: true })

  return actions
}

/** RES-016 §6.5 / ARC-012 §5A.5: module-scoped read-only surfaces only get view/open/download actions — no rename/tags/archive/delete/workspace/sync. */
export function getModuleReadonlyActions(asset: FileAsset): FileAssetAction[] {
  const actions: FileAssetAction[] = []
  const source = asset.source
  const snapshot = hasSnapshot(asset)

  if (source?.availability === "available" && source.webViewUrl) {
    actions.push({ id: "open_source", label: "開啟原始檔" })
  }
  actions.push({ id: "download", label: "下載" })
  actions.push({ id: "view_info", label: "查看檔案資訊" })
  if (snapshot) {
    actions.push({ id: "view_versions", label: "查看版本歷程" })
  }
  if (totalReferenceCount(asset) > 0) {
    actions.push({ id: "view_references", label: "查看引用位置" })
  }

  return actions
}

// ─── "Needs attention" detection ─────────────────────────────────────────

export function getAssetAttentionReason(asset: FileAsset): string | undefined {
  const source = asset.source
  if (source?.provider === "google_drive") {
    if (source.availability === "permission_lost") return "Google Drive 權限失效"
    if (source.availability === "source_deleted") return "來源已刪除"
    if (source.syncStatus === "outdated") return "Google Drive 有新版本"
    if (source.syncStatus === "error") return "上傳或同步失敗"
  }
  if (asset.processing?.extractionStatus === "failed") return "AI 解析失敗"
  return undefined
}

export function needsAttention(asset: FileAsset): boolean {
  return getAssetAttentionReason(asset) !== undefined
}

// ─── Tab membership ───────────────────────────────────────────────────────

export function matchesTab(asset: FileAsset, tab: FileLibraryTab): boolean {
  if (asset.status === "deleted") return false
  switch (tab) {
    case "all":
      return asset.status === "active"
    case "recent":
      return asset.status === "active" && Boolean(asset.lastUsedAt)
    case "needs_attention":
      return asset.status === "active" && needsAttention(asset)
    case "archived":
      return asset.status === "archived"
    default:
      return false
  }
}

// ─── Filter matching ──────────────────────────────────────────────────────

export function matchesFilters(asset: FileAsset, filters: FileLibraryFilters, query: string): boolean {
  if (query.trim().length > 0 && !asset.title.toLowerCase().includes(query.trim().toLowerCase())) {
    return false
  }

  const external = hasExternalSource(asset)
  const snapshot = hasSnapshot(asset)
  const source = asset.source

  if (filters.source === "managed" && external) return false
  if (filters.source === "google_drive" && !external) return false

  if (filters.preservation === "external_only" && (!external || snapshot)) return false
  if (filters.preservation === "has_snapshot" && !snapshot) return false
  if (filters.preservation === "no_snapshot" && snapshot) return false

  if (filters.sync !== "all") {
    if (!external || !source) return false
    if (filters.sync === "disconnected") {
      if (source.availability === "available") return false
    } else if (source.availability !== "available" || source.syncStatus !== filters.sync) {
      return false
    }
  }

  if (filters.processing !== "all") {
    if (!asset.processing || asset.processing.extractionStatus !== filters.processing) return false
  }

  if (filters.type !== "all" && getFileTypeCategory(asset) !== filters.type) return false

  return true
}

export function countNeedsAttention(assets: FileAsset[]): number {
  return assets.filter((a) => a.status === "active" && needsAttention(a)).length
}
