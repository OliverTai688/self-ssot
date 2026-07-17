import type { ModuleKey } from "@/types/module-permission"
import type {
  ClassificationSource,
  LibraryAssetKind,
  LibraryAssetModuleLink,
  LibraryAssetOriginContext,
} from "@/types/library-classification"
import { isHighRiskLibraryModule } from "@/types/library-classification"

export function getAssetLinks(
  links: LibraryAssetModuleLink[],
  assetId: string
): LibraryAssetModuleLink[] {
  return links.filter((l) => l.assetId === assetId)
}

/** All modules an asset is linked to, regardless of confirm state — used on the AI Input side (RES-016 §6.4). */
export function getAllModuleKeysForAsset(
  links: LibraryAssetModuleLink[],
  assetId: string
): ModuleKey[] {
  return getAssetLinks(links, assetId).map((l) => l.moduleKey)
}

/** Modules whose own read-only Library tab should show this asset (RES-016 §6.5): human-confirmed always qualifies; ai-suggested only qualifies for non-high-risk modules. */
export function getVisibleModuleKeysForModulePage(
  links: LibraryAssetModuleLink[],
  assetId: string
): ModuleKey[] {
  return getAssetLinks(links, assetId)
    .filter((l) => l.classificationSource === "human_confirmed" || !isHighRiskLibraryModule(l.moduleKey))
    .map((l) => l.moduleKey)
}

export function replaceAssetModuleLinks(
  links: LibraryAssetModuleLink[],
  assetId: string,
  assetKind: LibraryAssetKind,
  moduleKeys: ModuleKey[],
  source: ClassificationSource = "human_confirmed"
): LibraryAssetModuleLink[] {
  const now = new Date().toISOString()
  const kept = links.filter((l) => l.assetId !== assetId)
  const added: LibraryAssetModuleLink[] = moduleKeys.map((moduleKey) => ({
    id: `link-${assetId}-${moduleKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId,
    assetKind,
    moduleKey,
    classificationSource: source,
    createdAt: now,
    confirmedAt: source === "human_confirmed" ? now : undefined,
  }))
  return [...kept, ...added]
}

/** Asset ids visible inside one module's read-only Library tab, for a given asset kind. */
export function assetIdsVisibleForModule(
  links: LibraryAssetModuleLink[],
  moduleKey: ModuleKey,
  assetKind: LibraryAssetKind
): Set<string> {
  const ids = new Set<string>()
  links.forEach((l) => {
    if (l.assetKind !== assetKind || l.moduleKey !== moduleKey) return
    if (l.classificationSource === "human_confirmed" || !isHighRiskLibraryModule(l.moduleKey)) {
      ids.add(l.assetId)
    }
  })
  return ids
}

/**
 * Sub-module upload path (RES-019 §6, ARC-012 §5A.1/§5A.6): a human-initiated
 * upload from inside a module context creates one `human_confirmed` link
 * immediately, carrying an origin context for the central library's
 * "使用於" backlink. Adds a new link rather than replacing existing ones,
 * since a freshly uploaded asset has no prior classification to overwrite.
 */
export function addAssetModuleLinkWithOrigin(
  links: LibraryAssetModuleLink[],
  assetId: string,
  assetKind: LibraryAssetKind,
  moduleKey: ModuleKey,
  originContext: LibraryAssetOriginContext
): LibraryAssetModuleLink[] {
  const now = new Date().toISOString()
  const newLink: LibraryAssetModuleLink = {
    id: `link-${assetId}-${moduleKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId,
    assetKind,
    moduleKey,
    classificationSource: "human_confirmed",
    createdAt: now,
    confirmedAt: now,
    originContext,
  }
  return [...links, newLink]
}

/** First origin context recorded for an asset, if any — used for the AI Input "使用於" backlink chip (RES-019 §6.4). */
export function getOriginContextForAsset(
  links: LibraryAssetModuleLink[],
  assetId: string
): LibraryAssetOriginContext | undefined {
  return getAssetLinks(links, assetId).find((l) => l.originContext)?.originContext
}
