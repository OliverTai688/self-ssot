"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import type { ModuleKey } from "@/types/module-permission"
import type {
  ClassificationSource,
  LibraryAssetKind,
  LibraryAssetModuleLink,
  LibraryAssetOriginContext,
} from "@/types/library-classification"
import {
  addAssetModuleLinkWithOrigin,
  assetIdsVisibleForModule,
  getAllModuleKeysForAsset,
  getOriginContextForAsset,
  getVisibleModuleKeysForModulePage,
  replaceAssetModuleLinks,
} from "@/lib/library/classification"
import { mockLibraryAssetModuleLinks } from "@/lib/mock/ai-input/mock-library-classification"
import type { FileAsset } from "@/types/file-library"
import { mockFileAssets } from "@/lib/mock/ai-input/mock-file-assets"
import type { MediaAsset } from "@/types/media-library"
import { mockMediaAssets } from "@/lib/mock/ai-input/mock-media-assets"

interface LibraryClassificationContextType {
  links: LibraryAssetModuleLink[]
  getModuleKeysForAsset: (assetId: string) => ModuleKey[]
  getVisibleModuleKeysForModulePage: (assetId: string) => ModuleKey[]
  getAssetIdsForModule: (moduleKey: ModuleKey, assetKind: LibraryAssetKind) => Set<string>
  getOriginContextForAsset: (assetId: string) => LibraryAssetOriginContext | undefined
  setAssetModuleKeys: (
    assetId: string,
    assetKind: LibraryAssetKind,
    moduleKeys: ModuleKey[],
    source?: ClassificationSource
  ) => void
  /** RES-019 §6: sub-module upload path — one new `human_confirmed` link with an origin backlink. */
  addAssetWithOrigin: (
    assetId: string,
    assetKind: LibraryAssetKind,
    moduleKey: ModuleKey,
    originContext: LibraryAssetOriginContext
  ) => void
  /**
   * Single canonical asset store (ARC-012 §5A.1): the same array every
   * capture surface — AI Input's own upload and any sub-module upload —
   * reads from and writes to, so "sync a copy" never has to happen because
   * there is only ever one row.
   */
  fileAssets: FileAsset[]
  setFileAssets: React.Dispatch<React.SetStateAction<FileAsset[]>>
  mediaAssets: MediaAsset[]
  setMediaAssets: React.Dispatch<React.SetStateAction<MediaAsset[]>>
  /** RES-019 §6: creates the `FileAsset` row and its origin-tagged module link in one call, for sub-module upload surfaces. */
  createFileAssetFromSubModuleUpload: (
    asset: FileAsset,
    moduleKey: ModuleKey,
    originContext: LibraryAssetOriginContext
  ) => void
}

const LibraryClassificationContext = createContext<LibraryClassificationContextType | null>(null)

export function LibraryClassificationProvider({ children }: { children: ReactNode }) {
  const [links, setLinks] = useState<LibraryAssetModuleLink[]>(mockLibraryAssetModuleLinks)
  const [fileAssets, setFileAssets] = useState<FileAsset[]>(mockFileAssets)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(mockMediaAssets)

  const getModuleKeysForAsset = useCallback(
    (assetId: string) => getAllModuleKeysForAsset(links, assetId),
    [links]
  )

  const getVisibleForModulePage = useCallback(
    (assetId: string) => getVisibleModuleKeysForModulePage(links, assetId),
    [links]
  )

  const getAssetIdsForModule = useCallback(
    (moduleKey: ModuleKey, assetKind: LibraryAssetKind) => assetIdsVisibleForModule(links, moduleKey, assetKind),
    [links]
  )

  const setAssetModuleKeys = useCallback(
    (assetId: string, assetKind: LibraryAssetKind, moduleKeys: ModuleKey[], source: ClassificationSource = "human_confirmed") => {
      setLinks((prev) => replaceAssetModuleLinks(prev, assetId, assetKind, moduleKeys, source))
    },
    []
  )

  const getOriginContext = useCallback(
    (assetId: string) => getOriginContextForAsset(links, assetId),
    [links]
  )

  const addAssetWithOrigin = useCallback(
    (assetId: string, assetKind: LibraryAssetKind, moduleKey: ModuleKey, originContext: LibraryAssetOriginContext) => {
      setLinks((prev) => addAssetModuleLinkWithOrigin(prev, assetId, assetKind, moduleKey, originContext))
    },
    []
  )

  const createFileAssetFromSubModuleUpload = useCallback(
    (asset: FileAsset, moduleKey: ModuleKey, originContext: LibraryAssetOriginContext) => {
      setFileAssets((prev) => [asset, ...prev])
      setLinks((prev) => addAssetModuleLinkWithOrigin(prev, asset.id, "file", moduleKey, originContext))
    },
    []
  )

  return (
    <LibraryClassificationContext.Provider
      value={{
        links,
        getModuleKeysForAsset,
        getVisibleModuleKeysForModulePage: getVisibleForModulePage,
        getAssetIdsForModule,
        getOriginContextForAsset: getOriginContext,
        setAssetModuleKeys,
        addAssetWithOrigin,
        fileAssets,
        setFileAssets,
        mediaAssets,
        setMediaAssets,
        createFileAssetFromSubModuleUpload,
      }}
    >
      {children}
    </LibraryClassificationContext.Provider>
  )
}

export function useLibraryClassification() {
  const ctx = useContext(LibraryClassificationContext)
  if (!ctx) throw new Error("useLibraryClassification must be used inside LibraryClassificationProvider")
  return ctx
}
