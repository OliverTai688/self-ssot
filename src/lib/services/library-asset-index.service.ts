import "server-only"

import {
  getFileAssetsForProfile,
  getMediaAssetsForProfile,
} from "@/lib/services/storage.service"
import {
  mapStoredFileAsset,
  mapStoredMediaAsset,
} from "@/lib/mappers/library-asset.mapper"
import type { FormalLibraryAssetIndex } from "@/types/library-asset-index"

export async function buildFormalLibraryAssetIndex(
  profileId: string
): Promise<FormalLibraryAssetIndex> {
  try {
    const [fileAssets, mediaAssets] = await Promise.all([
      getFileAssetsForProfile(profileId),
      getMediaAssetsForProfile(profileId),
    ])

    return {
      status: "ready",
      fileAssets: fileAssets.map(mapStoredFileAsset),
      mediaAssets: mediaAssets.map(mapStoredMediaAsset),
      hiddenMockFallback: true,
      ownerScoped: true,
    }
  } catch {
    return {
      status: "unavailable",
      fileAssets: [],
      mediaAssets: [],
      hiddenMockFallback: true,
      ownerScoped: true,
      message: "正式檔案資料目前無法載入，請稍後重新整理。",
    }
  }
}
