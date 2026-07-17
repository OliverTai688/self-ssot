// ─── Module classification for File/Media Library assets (RES-016) ──────────
//
// An asset can belong to one or more modules at once. This is modeled as
// link rows (many rows per asset, each row naming one module) rather than an
// array field on the asset itself, to stay consistent with this repo's
// pervasive singular-`targetModule` contract convention (see RES-016 §6.2).

import type { ModuleKey } from "@/types/module-permission"

export type LibraryAssetKind = "file" | "media"
export type ClassificationSource = "ai_suggested" | "human_confirmed"

/**
 * Where a sub-module upload was captured from (RES-019 §6.2 / ARC-012 §5A.6).
 * Additive metadata on a classification link, not a second store — there is
 * still exactly one asset row; this only records which specific sub-module
 * object captured it, for the central library's "使用於" backlink.
 */
export interface LibraryAssetOriginContext {
  contextType: "project" | "task" | "deliverable" | "discussion_thread" | "chat_message" | "note"
  contextId: string
  contextLabel: string
  href: string
}

export interface LibraryAssetModuleLink {
  id: string
  assetId: string
  assetKind: LibraryAssetKind
  moduleKey: ModuleKey
  classificationSource: ClassificationSource
  createdAt: string
  confirmedAt?: string
  originContext?: LibraryAssetOriginContext
}

/** The seven modules owner-decided in scope for a module-side read-only Library tab (RES-016 §0A). */
export const MODULE_LIBRARY_SCOPE: ModuleKey[] = [
  "work",
  "research",
  "chamber",
  "finance",
  "life",
  "company",
  "self",
]

/** High-risk modules require human confirmation before an AI-suggested classification is shown in that module's own tab (AGENTS.md §11). */
export const HIGH_RISK_LIBRARY_MODULES: ModuleKey[] = ["finance", "life", "company"]

export function isHighRiskLibraryModule(moduleKey: ModuleKey): boolean {
  return HIGH_RISK_LIBRARY_MODULES.includes(moduleKey)
}
