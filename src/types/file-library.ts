// ─── File Library: single-asset, multi-source-and-preservation model ────────
//
// A row in the file library is one logical Asset. External Reference (a live
// Google Drive source) and Snapshot (an immutable Cloudflare R2 copy) are not
// exclusive file "types" — they are properties that can both exist on the same
// asset at once. A new Asset is only created when the user explicitly saves an
// independent copy or builds a new document from a version.

export type FileAssetStatus = "active" | "archived" | "deleted"

export type FileSourceProvider = "r2" | "google_drive"

export type FileSourceAvailability = "available" | "permission_lost" | "source_deleted"

export type FileSourceSyncStatus = "synced" | "outdated" | "syncing" | "error"

export interface FileAssetSource {
  provider: FileSourceProvider
  availability: FileSourceAvailability
  syncStatus: FileSourceSyncStatus
  providerVersion?: string
  sourceModifiedAt?: string
  lastSyncedAt?: string
  lastCheckedAt?: string
  webViewUrl?: string
  driveFileId?: string
  driveFolderPath?: string
  errorMessage?: string
}

export interface FileAssetSnapshot {
  id: string
  versionNumber: number
  sourceVersion?: string
  createdAt: string
  referenceCount: number
  referencedBy?: string[]
  objectKey?: string
}

export type FileExtractionStatus = "not_started" | "processing" | "completed" | "failed"

export interface FileAssetProcessing {
  extractionStatus: FileExtractionStatus
  indexed: boolean
  chunkCount?: number
  errorMessage?: string
}

export interface FileAssetReferences {
  chats: number
  evidence: number
  observationUnits: number
  reports: number
  sprints: number
}

export interface FileAssetActivityEntry {
  id: string
  label: string
  occurredAt: string
}

export interface FileAsset {
  id: string
  title: string
  /** AI-facing stable reference code, assign-once. See RES-018 §4. */
  referenceCode: string
  mimeType: string
  size?: number
  status: FileAssetStatus

  source?: FileAssetSource
  snapshots: FileAssetSnapshot[]
  processing?: FileAssetProcessing
  references?: FileAssetReferences

  tags?: string[]

  createdAt: string
  lastUsedAt?: string
  recentActivity?: FileAssetActivityEntry[]
}

// ─── Derived helpers (see src/lib/file-library/file-asset-status.ts) ────────

export function hasExternalSource(asset: FileAsset): boolean {
  return asset.source?.provider === "google_drive"
}

export function hasSnapshot(asset: FileAsset): boolean {
  return asset.snapshots.length > 0
}

export function latestSnapshot(asset: FileAsset): FileAssetSnapshot | undefined {
  if (asset.snapshots.length === 0) return undefined
  return [...asset.snapshots].sort((a, b) => b.versionNumber - a.versionNumber)[0]
}

export function totalReferenceCount(asset: FileAsset): number {
  if (!asset.references) return 0
  const { chats, evidence, observationUnits, reports, sprints } = asset.references
  return chats + evidence + observationUnits + reports + sprints
}

// ─── Filters ──────────────────────────────────────────────────────────────

export type FileLibraryTab = "all" | "recent" | "needs_attention" | "archived"

export type FileSourceFilter = "all" | "managed" | "google_drive"
export type FilePreservationFilter = "all" | "external_only" | "has_snapshot" | "no_snapshot"
export type FileSyncFilter = "all" | "synced" | "outdated" | "syncing" | "error" | "disconnected"
export type FileProcessingFilter = "all" | "completed" | "processing" | "not_started" | "failed"
export type FileTypeFilter = "all" | "pdf" | "md" | "doc" | "sheet" | "ppt" | "other"

export interface FileLibraryFilters {
  source: FileSourceFilter
  preservation: FilePreservationFilter
  sync: FileSyncFilter
  processing: FileProcessingFilter
  type: FileTypeFilter
}

export const DEFAULT_FILE_LIBRARY_FILTERS: FileLibraryFilters = {
  source: "all",
  preservation: "all",
  sync: "all",
  processing: "all",
  type: "all",
}
