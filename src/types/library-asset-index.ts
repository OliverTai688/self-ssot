import type { FileAsset } from "@/types/file-library"
import type { MediaAsset } from "@/types/media-library"

export type FormalLibraryDataStatus = "ready" | "unavailable"

/**
 * Serializable, protected-owner BFF contract for the canonical file/media
 * library. Mock assets never enter this contract.
 */
export interface FormalLibraryAssetIndex {
  status: FormalLibraryDataStatus
  fileAssets: FileAsset[]
  mediaAssets: MediaAsset[]
  hiddenMockFallback: true
  ownerScoped: true
  message?: string
}
