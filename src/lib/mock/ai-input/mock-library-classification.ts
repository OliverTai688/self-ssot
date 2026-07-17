import type { LibraryAssetModuleLink } from "@/types/library-classification"

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString()
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60_000).toISOString()
}

/**
 * Demo classification links (RES-016 §6.2/§0A). Covers: a multi-module file
 * (fa-002), a low-risk AI-suggested file (fa-010), a high-risk AI-suggested
 * pending file (fa-001 → company) and media item (media-003 → finance) that
 * should not yet appear inside their module's own tab, and confirmed
 * single-module baselines.
 */
export const mockLibraryAssetModuleLinks: LibraryAssetModuleLink[] = [
  { id: "link-fa-002-work", assetId: "fa-002", assetKind: "file", moduleKey: "work", classificationSource: "human_confirmed", createdAt: daysAgo(38), confirmedAt: daysAgo(38) },
  { id: "link-fa-002-chamber", assetId: "fa-002", assetKind: "file", moduleKey: "chamber", classificationSource: "human_confirmed", createdAt: daysAgo(38), confirmedAt: daysAgo(38) },
  { id: "link-fa-003-chamber", assetId: "fa-003", assetKind: "file", moduleKey: "chamber", classificationSource: "human_confirmed", createdAt: daysAgo(3), confirmedAt: daysAgo(3) },
  { id: "link-fa-005-chamber", assetId: "fa-005", assetKind: "file", moduleKey: "chamber", classificationSource: "human_confirmed", createdAt: daysAgo(45), confirmedAt: daysAgo(45) },
  { id: "link-fa-009-chamber", assetId: "fa-009", assetKind: "file", moduleKey: "chamber", classificationSource: "human_confirmed", createdAt: daysAgo(20), confirmedAt: daysAgo(20) },
  { id: "link-fa-010-research", assetId: "fa-010", assetKind: "file", moduleKey: "research", classificationSource: "ai_suggested", createdAt: daysAgo(5) },
  { id: "link-fa-001-company", assetId: "fa-001", assetKind: "file", moduleKey: "company", classificationSource: "ai_suggested", createdAt: minutesAgo(95) },
  { id: "link-media-001-work", assetId: "media-001", assetKind: "media", moduleKey: "work", classificationSource: "human_confirmed", createdAt: daysAgo(12), confirmedAt: daysAgo(12) },
  { id: "link-media-002-chamber", assetId: "media-002", assetKind: "media", moduleKey: "chamber", classificationSource: "human_confirmed", createdAt: daysAgo(10), confirmedAt: daysAgo(10) },
  { id: "link-media-003-finance", assetId: "media-003", assetKind: "media", moduleKey: "finance", classificationSource: "ai_suggested", createdAt: daysAgo(13) },
  { id: "link-media-004-chamber", assetId: "media-004", assetKind: "media", moduleKey: "chamber", classificationSource: "ai_suggested", createdAt: daysAgo(8) },
]
