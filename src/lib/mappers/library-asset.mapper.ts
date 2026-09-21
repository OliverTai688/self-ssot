import type { FileAsset } from "@/types/file-library"
import type { MediaAsset, MediaKind } from "@/types/media-library"

type StoredFileAsset = {
  id: string
  displayName: string
  objectKey: string
  mimeType: string | null
  sizeBytes: number | null
  createdAt: Date
  updatedAt: Date
}

type StoredMediaAsset = StoredFileAsset & {
  durationSeconds: number | null
}

function stableSequence(id: string): string {
  let hash = 0
  for (const character of id) {
    hash = Math.imul(hash, 31) + character.charCodeAt(0)
  }
  return String((hash >>> 0) % 1_000_000).padStart(6, "0")
}

function persistedReferenceCode(
  objectType: "FILE" | "MEDIA",
  id: string,
  createdAt: Date
): string {
  const date = createdAt.toISOString().slice(0, 10).replaceAll("-", "")
  return `${objectType}-AIINPUT-${stableSequence(id)}-${date}`
}

function mediaKindFromStoredAsset(asset: StoredMediaAsset): MediaKind {
  const mimeType = asset.mimeType ?? ""
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  return "image"
}

function formatDuration(durationSeconds: number | null): string | undefined {
  if (durationSeconds === null) return undefined
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function mapStoredFileAsset(asset: StoredFileAsset): FileAsset {
  const createdAt = asset.createdAt.toISOString()
  const updatedAt = asset.updatedAt.toISOString()

  return {
    id: asset.id,
    title: asset.displayName,
    referenceCode: persistedReferenceCode("FILE", asset.id, asset.createdAt),
    mimeType: asset.mimeType ?? "application/octet-stream",
    size: asset.sizeBytes ?? undefined,
    status: "active",
    source: {
      provider: "r2",
      availability: "available",
      syncStatus: "synced",
      lastSyncedAt: createdAt,
      lastCheckedAt: updatedAt,
    },
    snapshots: [
      {
        id: `${asset.id}:r2:1`,
        versionNumber: 1,
        createdAt,
        referenceCount: 0,
        objectKey: asset.objectKey,
      },
    ],
    processing: {
      extractionStatus: "not_started",
      indexed: false,
    },
    references: {
      chats: 0,
      evidence: 0,
      observationUnits: 0,
      reports: 0,
      sprints: 0,
    },
    createdAt,
    lastUsedAt: updatedAt,
  }
}

export function mapStoredMediaAsset(asset: StoredMediaAsset): MediaAsset {
  return {
    id: asset.id,
    name: asset.displayName,
    referenceCode: persistedReferenceCode("MEDIA", asset.id, asset.createdAt),
    kind: mediaKindFromStoredAsset(asset),
    date: asset.createdAt.toISOString().slice(0, 10),
    duration: formatDuration(asset.durationSeconds),
    objectKey: asset.objectKey,
  }
}
