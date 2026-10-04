import "server-only"

import { randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import {
  assertProjectCapability,
} from "@/lib/services/project-capability.service"
import {
  ProjectWorkspaceBindingError,
  ensureProjectWorkspaceBinding,
} from "@/lib/services/project.service"
import { headObject } from "@/lib/storage/object-head"
import { createDownloadUrl, createUploadUrl } from "@/lib/storage/presigned-url"
import { getR2BucketName } from "@/lib/storage/r2-client"
import {
  classifyAsset,
  formatAssetRefCode,
  parseAssetRefSeq,
} from "@/lib/ui-data/yuanzhan/operating-assets"

/**
 * 專案雲端硬碟的服務層（`PLN-075` S2 第 4 項，整合決策 §5「檔案」分頁）。
 *
 * 三條不可妥協的事，整份檔案都在守它們：
 *
 * 1. **歸檔只改 DB，永不動 R2 bytes。** 資料夾存在 `project_folders`，檔案的位置是
 *    `OperatingAsset.folderId` 這一欄 —— 不是 `objectKey` 的前綴。R2 沒有 server-side
 *    rename，把資料夾寫進 key 的代價是「搬一個資料夾＝複製整個子樹的 bytes」。
 *    `planAssetFiling()` 因此明文回傳一個永遠是空陣列的 `r2Operations`，
 *    讓「這個動作不碰 R2」成為可被測試的斷言，而不是一句註解。
 *
 * 2. **可見性是 deny-by-default，而且只能收緊、不能被子夾放寬。** 祖先是
 *    `INTERNAL_ONLY` 時子夾不得是 `CLIENT_VISIBLE`；`RESTRICTED_NO_INDEX` 的語意不只是
 *    一個 enum 值，而是「這個子樹不得建立全文索引」——由 `resolveIndexingPolicy()` ＋
 *    `assertIndexingAllowed()` 這對守門負責，任何要寫 `extractedText` 的路徑都得先過它。
 *    （來源：`05/商城專案資訊.docx` 內含明文密碼，資料夾權限擋不住全文索引。）
 *
 * 3. **`workspaceId` 一律伺服器端解析。** 服務層不接受呼叫端送來的 workspaceId；
 *    它是授權範圍本身，讓呼叫端指定等於讓呼叫端挑租戶（OD-C）。
 *
 * Wave 1 留下的落差（見
 * `reports/personal-os-owner-directed-20261003-project-workspace-data-layer.md` §已知設計落差 2）
 * 在這裡補完：`moveProjectFolder()` 以**一次子樹 UPDATE** 修正子孫的 `path` 前綴與 `depth`，
 * 而不是只算自己那一列。
 */

/* ===== PROJECT-DRIVE-PURE:BEGIN =====================================
 * 這一段是純函式區，`scripts/verify-project-drive.mjs` 會把它**原文抽出來實際執行**
 * （與 `scripts/check-operating-persistence.mjs` 同一個做法：不抄第二份邏輯，
 * 測的就是會被打包進 runtime 的那一份）。
 *
 * 因此這一段必須自給自足：
 *   - 不得 import、不得碰 `db`、不得引用本區塊以外的任何符號
 *   - 不得使用 `enum` / `namespace`（Node 的型別剝離不支援，驗證腳本會當場掛）
 *   - 只接受已經撈好的列當輸入，不自己查資料庫
 */

/* ================================================================== */
/* 錯誤                                                               */
/* ================================================================== */

export class ProjectDriveNotFoundError extends Error {
  constructor(message = "找不到這個資料夾。") {
    super(message)
    this.name = "ProjectDriveNotFoundError"
  }
}

export class ProjectDriveRuleError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "ProjectDriveRuleError"
    this.code = code
  }
}

/**
 * 「這個子樹不得建立全文索引」被違反時丟這個，而不是靜靜地不寫。
 * 靜靜地不寫會讓下一個人以為索引壞了，於是把守門繞過去。
 */
export class ProjectDriveIndexingBlockedError extends ProjectDriveRuleError {
  constructor(message = "這個資料夾標記為最高敏感，不得建立全文索引。") {
    super("indexing_blocked", message)
    this.name = "ProjectDriveIndexingBlockedError"
  }
}

export const PROJECT_DRIVE_VISIBILITIES = [
  "CLIENT_VISIBLE",
  "INTERNAL_ONLY",
  "RESTRICTED_NO_INDEX",
] as const
export type DriveVisibility = (typeof PROJECT_DRIVE_VISIBILITIES)[number]

/** 數字越大越嚴。放寬＝往小的方向走，那是被禁止的方向。 */
export const DRIVE_VISIBILITY_RANK: Record<DriveVisibility, number> = {
  CLIENT_VISIBLE: 0,
  INTERNAL_ONLY: 1,
  RESTRICTED_NO_INDEX: 2,
}

export const PROJECT_DRIVE_KINDS = [
  "ROOT",
  "INBOX",
  "GENERIC",
  "PROPOSAL",
  "CONTRACT",
  "MILESTONE",
  "MEETING",
  "SHARED",
  "INTERNAL",
  "REVISION",
  "MATERIAL",
  "FINANCE",
  "CHAT_DROP",
  "LINE_DROP",
] as const
export type DriveFolderKind = (typeof PROJECT_DRIVE_KINDS)[number]

/** schema 的註解寫明這三種「**禁止**被設為 CLIENT_VISIBLE」。這裡是它的執行點。 */
export const CLIENT_VISIBLE_FORBIDDEN_KINDS: DriveFolderKind[] = [
  "CONTRACT",
  "INTERNAL",
  "FINANCE",
]

/** 系統資料夾：不可改名、不可刪除、不可搬移（`ProjectFolder.isSystem` 的註解）。 */
export const SYSTEM_FOLDER_KINDS: DriveFolderKind[] = ["ROOT", "INBOX", "CHAT_DROP"]

export const DRIVE_MAX_FOLDER_NAME_LENGTH = 120
/** 深度上限不是美觀問題：`path` 是具體化字串，無上限等於讓一列長到寫不進去。 */
export const DRIVE_MAX_DEPTH = 12

export type DriveFolderNode = {
  id: string
  projectId: string
  parentId: string | null
  kind: DriveFolderKind
  visibility: DriveVisibility
  name: string
  nameNormalized: string
  path: string
  depth: number
  sortOrder: number
  isSystem: boolean
  deletedAt: Date | null
}

export type DriveRuleFailure = { ok: false; code: string; error: string }

/* ------------------------------------------------------------------ */
/* 名稱                                                               */
/* ------------------------------------------------------------------ */

/**
 * 同層唯一性比的是這個值，顯示永遠用 `name`。
 *
 * NFC 而不是 NFKC：全形括號與半形括號在 Owner 既有慣例裡是**不同的內容**
 * （`[共用]` 是半形），NFKC 會把它們折成同一個，於是兩個本來合法的資料夾撞名。
 */
export function normalizeFolderName(name: string): string {
  return String(name ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

export type DriveNameVerdict =
  | { ok: true; name: string; nameNormalized: string }
  | DriveRuleFailure

export function validateFolderName(name: string): DriveNameVerdict {
  const raw = String(name ?? "")
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
  if (!raw) return { ok: false, code: "invalid_name", error: "資料夾名稱不能空白。" }
  if (raw.length > DRIVE_MAX_FOLDER_NAME_LENGTH) {
    return { ok: false, code: "invalid_name", error: "資料夾名稱最多 " + DRIVE_MAX_FOLDER_NAME_LENGTH + " 個字。" }
  }
  // 路徑分隔字元與控制字元：資料夾名稱是顯示字串，不是路徑的一段，
  // 但它會被寫進匯出檔名與 zip 裡，所以在這裡就擋掉。
  if (/[/\\]/.test(raw)) return { ok: false, code: "invalid_name", error: "資料夾名稱不能包含 / 或 \\。" }
  if (/[\u0000-\u001f\u007f]/.test(raw)) {
    return { ok: false, code: "invalid_name", error: "資料夾名稱包含不可見字元。" }
  }
  if (raw === "." || raw === "..") {
    return { ok: false, code: "invalid_name", error: "這個名稱保留給系統。" }
  }
  return { ok: true, name: raw, nameNormalized: normalizeFolderName(raw) }
}

/**
 * 同層撈撞名。回傳撞到的那一列，讓錯誤訊息講得出是撞到誰。
 * DB 的 `(parent_id, name_normalized)` UNIQUE 是最後一道；這一道是為了回得出人看得懂的理由。
 */
export function findSiblingNameConflict(
  siblings: Pick<DriveFolderNode, "id" | "name" | "nameNormalized" | "deletedAt">[],
  nameNormalized: string,
  selfId?: string | null
): { id: string; name: string } | null {
  for (const sibling of siblings) {
    if (sibling.deletedAt) continue
    if (selfId && sibling.id === selfId) continue
    if (sibling.nameNormalized === nameNormalized) return { id: sibling.id, name: sibling.name }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* path：具體化路徑                                                    */
/* ------------------------------------------------------------------ */

/** `/<rootId>/<id>/`。前後都有斜線，所以前綴比對不會把 `abc` 當成 `abcd` 的祖先。 */
export function buildFolderPath(parentPath: string | null, folderId: string): string {
  const base = parentPath && parentPath !== "/" ? parentPath : "/"
  return base + folderId + "/"
}

export function parseFolderPathIds(path: string): string[] {
  return String(path ?? "")
    .split("/")
    .filter(Boolean)
}

/** 根是 0。`depth` 存成欄位只是為了排序與上限檢查，真相永遠是 `path`。 */
export function depthForPath(path: string): number {
  return Math.max(0, parseFolderPathIds(path).length - 1)
}

/** 子樹判定。`candidate === ancestor` 也算（自己是自己的子樹）。 */
export function isWithinSubtree(candidatePath: string, ancestorPath: string): boolean {
  if (!ancestorPath || ancestorPath === "/") return true
  return candidatePath === ancestorPath || candidatePath.startsWith(ancestorPath)
}

/** 把一列的 path 從舊前綴換到新前綴。前綴對不上就原封不動回傳，不猜。 */
export function rewriteSubtreePath(path: string, oldPrefix: string, newPrefix: string): string {
  if (!path.startsWith(oldPrefix)) return path
  return newPrefix + path.slice(oldPrefix.length)
}

/* ------------------------------------------------------------------ */
/* 可見性：三級 ＋ 不得放寬                                             */
/* ------------------------------------------------------------------ */

/** 祖先鏈裡最嚴的那一級。空鏈回 `CLIENT_VISIBLE`（rank 0），代表不施加下限。 */
export function strictestAncestorVisibility(
  ancestors: Pick<DriveFolderNode, "visibility">[]
): DriveVisibility {
  let worst: DriveVisibility = "CLIENT_VISIBLE"
  for (const ancestor of ancestors) {
    if (DRIVE_VISIBILITY_RANK[ancestor.visibility] > DRIVE_VISIBILITY_RANK[worst]) {
      worst = ancestor.visibility
    }
  }
  return worst
}

/** 沒有指定可見性時，子夾繼承父夾。沒有父夾（ROOT）時落到最保守的 `INTERNAL_ONLY`。 */
export function inheritVisibility(
  parentVisibility: DriveVisibility | null | undefined
): DriveVisibility {
  return parentVisibility ?? "INTERNAL_ONLY"
}

export type DriveVisibilityVerdict = { ok: true; visibility: DriveVisibility } | DriveRuleFailure

/**
 * 可見性的單一判定點：建立、改可見性、搬移全部走這裡。
 *
 * 兩條規則：
 *   ① `CONTRACT` / `INTERNAL` / `FINANCE` 永遠不得 `CLIENT_VISIBLE`（schema 註解的執行點）
 *   ② **不得比最嚴的祖先寬**。這條涵蓋了任務書點名的那一條
 *      （祖先 `INTERNAL_ONLY`／`RESTRICTED_NO_INDEX` 時不得調成 `CLIENT_VISIBLE`），
 *      同時也擋住 `RESTRICTED_NO_INDEX` 之下冒出 `INTERNAL_ONLY` 這種半放寬。
 */
export function evaluateVisibility(input: {
  requested?: DriveVisibility | null
  kind: DriveFolderKind
  ancestors: Pick<DriveFolderNode, "visibility">[]
  parentVisibility?: DriveVisibility | null
}): DriveVisibilityVerdict {
  const visibility = input.requested ?? inheritVisibility(input.parentVisibility)
  if (!PROJECT_DRIVE_VISIBILITIES.includes(visibility)) {
    return { ok: false, code: "invalid_visibility", error: "不認得這個可見性等級。" }
  }
  if (visibility === "CLIENT_VISIBLE" && CLIENT_VISIBLE_FORBIDDEN_KINDS.includes(input.kind)) {
    return {
      ok: false,
      code: "kind_forbids_client_visible",
      error: "這一類資料夾（合約／內部／財務）不得對客戶可見。",
    }
  }
  const floor = strictestAncestorVisibility(input.ancestors)
  if (DRIVE_VISIBILITY_RANK[visibility] < DRIVE_VISIBILITY_RANK[floor]) {
    return {
      ok: false,
      code: "ancestor_visibility_floor",
      error: "上層資料夾是「" + floor + "」，底下不能比它寬。",
    }
  }
  return { ok: true, visibility }
}

/* ------------------------------------------------------------------ */
/* RESTRICTED_NO_INDEX：不是一個 enum 值，是一道守門                     */
/* ------------------------------------------------------------------ */

export type DriveIndexingPolicy = {
  /** false＝這個子樹不得建立全文索引。 */
  indexable: boolean
  /** 擋下來的那一層（自己或某個祖先）的 id；自己時為 "self"。 */
  blockedBy: string | null
  reason: string | null
}

/**
 * 索引政策由**整條祖先鏈**決定，不只看自己。
 *
 * 只看自己會漏掉這個形狀：`05/`（`RESTRICTED_NO_INDEX`）底下開一個
 * `GENERIC` 子夾，把 `商城專案資訊.docx` 丟進去 —— 子夾自己的 enum 值是
 * `INTERNAL_ONLY`，於是明文密碼就這樣進了全文索引。
 */
export function resolveIndexingPolicy(input: {
  folder: Pick<DriveFolderNode, "visibility"> | null
  ancestors: Pick<DriveFolderNode, "id" | "visibility">[]
}): DriveIndexingPolicy {
  if (input.folder && input.folder.visibility === "RESTRICTED_NO_INDEX") {
    return {
      indexable: false,
      blockedBy: "self",
      reason: "資料夾標記為最高敏感（RESTRICTED_NO_INDEX）。",
    }
  }
  for (const ancestor of input.ancestors) {
    if (ancestor.visibility === "RESTRICTED_NO_INDEX") {
      return {
        indexable: false,
        blockedBy: ancestor.id,
        reason: "上層資料夾標記為最高敏感（RESTRICTED_NO_INDEX），整個子樹都不建索引。",
      }
    }
  }
  return { indexable: true, blockedBy: null, reason: null }
}

/**
 * 要寫 `extractedText`／要送進全文索引的路徑，一律先過這裡。
 * 回 `null` 代表可以；回一個理由字串代表不可以，呼叫端必須丟
 * `ProjectDriveIndexingBlockedError`，不得改成「安靜地不寫」。
 */
export function indexingRefusalReason(policy: DriveIndexingPolicy): string | null {
  return policy.indexable ? null : policy.reason ?? "不得建立全文索引。"
}

/* ------------------------------------------------------------------ */
/* 搬移：一次子樹 UPDATE 的計畫                                         */
/* ------------------------------------------------------------------ */

export type DriveMovePlan = {
  ok: true
  folderId: string
  oldPrefix: string
  newPrefix: string
  depthDelta: number
  /** 子樹每一列搬完之後應該長的樣子。SQL 用前綴一次更新，這裡是它的預期值。 */
  rows: { id: string; path: string; depth: number }[]
}

/**
 * 搬移的所有規則都在這裡，一次算完整個子樹。
 *
 * Wave 1 的 handler 只算自己那一列，於是搬動帶子樹的資料夾之後，
 * 子孫的 `path` 留在舊前綴 —— 樹看起來沒事（UI 讀 `parentId`），
 * 但任何以 `path` 前綴做的子樹查詢（可見性繼承、索引政策、批次授權）全部算錯。
 */
export function planFolderMove(input: {
  folder: DriveFolderNode
  newParent: DriveFolderNode | null
  /** `path` 以 `folder.path` 為前綴的所有未刪除列，**含自己**。 */
  subtree: DriveFolderNode[]
  /** 新父夾底下現有的未刪除子夾。 */
  siblings: Pick<DriveFolderNode, "id" | "name" | "nameNormalized" | "deletedAt">[]
  /** 新父夾（含）往上的祖先鏈。 */
  newAncestors: Pick<DriveFolderNode, "id" | "visibility">[]
}): DriveMovePlan | DriveRuleFailure {
  const { folder, newParent, subtree, siblings, newAncestors } = input

  if (folder.deletedAt) return { ok: false, code: "folder_deleted", error: "這個資料夾已刪除。" }
  if (folder.isSystem || SYSTEM_FOLDER_KINDS.includes(folder.kind)) {
    return { ok: false, code: "system_folder_immutable", error: "系統資料夾不能搬移。" }
  }
  // 根只有一個，而它是系統資料夾；所以「搬到沒有父夾」永遠是錯的輸入，
  // 不是「搬到根」的簡寫 —— 真要搬到根，呼叫端得明確給 ROOT 的 id。
  if (!newParent) return { ok: false, code: "parent_required", error: "請指定目標資料夾。" }
  if (newParent.deletedAt) return { ok: false, code: "parent_deleted", error: "目標資料夾已刪除。" }
  if (newParent.projectId !== folder.projectId) {
    return { ok: false, code: "cross_project_move", error: "不能把資料夾搬到別的專案。" }
  }
  if (newParent.id === folder.id) {
    return { ok: false, code: "cycle", error: "資料夾不能搬進自己裡面。" }
  }
  // 環：目標是自己的子孫時，`newParent.path` 一定以 `folder.path` 為前綴。
  if (isWithinSubtree(newParent.path, folder.path)) {
    return { ok: false, code: "cycle", error: "資料夾不能搬進自己的子資料夾裡面。" }
  }
  if (newParent.id === folder.parentId) {
    return { ok: false, code: "noop", error: "已經在這個資料夾裡了。" }
  }

  const conflict = findSiblingNameConflict(siblings, folder.nameNormalized, folder.id)
  if (conflict) {
    return { ok: false, code: "duplicate_name", error: "目標資料夾裡已經有「" + conflict.name + "」。" }
  }

  // 搬移同樣過可見性的門：把 CLIENT_VISIBLE 的夾搬進 INTERNAL_ONLY 底下，
  // 效果與直接把它調成 CLIENT_VISIBLE 一樣，所以用同一條規則擋。
  const verdict = evaluateVisibility({
    requested: folder.visibility,
    kind: folder.kind,
    ancestors: newAncestors,
  })
  if (!verdict.ok) return verdict

  const oldPrefix = folder.path
  const newPrefix = buildFolderPath(newParent.path, folder.id)
  const depthDelta = newParent.depth + 1 - folder.depth

  let maxDepth = 0
  const rows = subtree.map((row) => {
    const path = rewriteSubtreePath(row.path, oldPrefix, newPrefix)
    const depth = depthForPath(path)
    if (depth > maxDepth) maxDepth = depth
    return { id: row.id, path, depth }
  })
  if (maxDepth > DRIVE_MAX_DEPTH) {
    return { ok: false, code: "too_deep", error: "資料夾層數最多 " + DRIVE_MAX_DEPTH + " 層。" }
  }

  return { ok: true, folderId: folder.id, oldPrefix, newPrefix, depthDelta, rows }
}

/* ------------------------------------------------------------------ */
/* 軟刪                                                               */
/* ------------------------------------------------------------------ */

export type DriveDeletePlan =
  | { ok: true; prefix: string; ids: string[] }
  | DriveRuleFailure

/**
 * 軟刪整個子樹，但**子樹裡還有檔案就拒絕**。
 *
 * 理由不是潔癖：檔案的 bytes 在 R2，而 `folderId` 指著一個已刪除的資料夾時，
 * 它既不在收件匣也不在任何樹上 —— 使用者看不到它，孤兒清理也不會動它（它是 ready），
 * 於是變成一筆查不清的儲存費。要刪夾，先把檔案搬走或刪掉。
 */
export function planFolderSoftDelete(input: {
  folder: DriveFolderNode
  subtree: DriveFolderNode[]
  liveAssetCount: number
}): DriveDeletePlan {
  const { folder, subtree, liveAssetCount } = input
  if (folder.deletedAt) return { ok: false, code: "folder_deleted", error: "這個資料夾已經刪除了。" }
  if (folder.isSystem || SYSTEM_FOLDER_KINDS.includes(folder.kind)) {
    return { ok: false, code: "system_folder_immutable", error: "系統資料夾不能刪除。" }
  }
  if (liveAssetCount > 0) {
    return {
      ok: false,
      code: "folder_not_empty",
      error: "這個資料夾（含子資料夾）還有 " + liveAssetCount + " 個檔案，請先搬走或刪除。",
    }
  }
  return { ok: true, prefix: folder.path, ids: subtree.map((row) => row.id) }
}

/* ------------------------------------------------------------------ */
/* 歸檔：只改 folderId / filedAt，永不動 R2                             */
/* ------------------------------------------------------------------ */

/** 歸檔允許寫的欄位白名單。`objectKey`／`bucket`／`sizeBytes`／`status` 刻意不在裡面。 */
export const ASSET_FILING_WRITABLE_FIELDS = [
  "projectId",
  "folderId",
  "filedAt",
  "extractedText",
] as const

export type AssetFilingPlan = {
  ok: true
  data: {
    projectId?: string
    folderId: string
    filedAt: Date
    /** 只有「落進不得索引的子樹」時才出現，而且一定是 null（把既有索引內容清掉）。 */
    extractedText?: null
  }
  /** 永遠是空陣列。歸檔是 DB 動作，不是搬 bytes —— 這一欄讓它成為可測的斷言。 */
  r2Operations: never[]
  indexing: DriveIndexingPolicy
}

export function planAssetFiling(input: {
  asset: {
    id: string
    projectId: string | null
    folderId: string | null
    status: string
    deletedAt: Date | null
    extractedText?: string | null
  }
  folder: DriveFolderNode
  ancestors: Pick<DriveFolderNode, "id" | "visibility">[]
  now: Date
}): AssetFilingPlan | DriveRuleFailure {
  const { asset, folder, ancestors, now } = input
  if (asset.deletedAt) return { ok: false, code: "asset_deleted", error: "這個檔案已刪除。" }
  if (asset.status !== "ready") {
    return { ok: false, code: "asset_not_ready", error: "檔案還沒傳完，不能歸檔。" }
  }
  if (folder.deletedAt) return { ok: false, code: "folder_deleted", error: "目標資料夾已刪除。" }
  if (asset.projectId && asset.projectId !== folder.projectId) {
    return { ok: false, code: "cross_project_filing", error: "不能把檔案歸到別的專案的資料夾。" }
  }

  const indexing = resolveIndexingPolicy({ folder, ancestors })
  const data: AssetFilingPlan["data"] = { folderId: folder.id, filedAt: now }
  if (!asset.projectId) data.projectId = folder.projectId
  // 落進不得索引的子樹時，**把既有的抽文字清掉**。
  // 「以後不要再建索引」不夠 —— 先前抽好的明文已經在那一欄裡了。
  if (!indexing.indexable && asset.extractedText) data.extractedText = null

  return { ok: true, data, r2Operations: [], indexing }
}

/* ------------------------------------------------------------------ */
/* R2 key：路徑與中文檔名一律不進 key                                    */
/* ------------------------------------------------------------------ */

export const PROJECT_DRIVE_KEY_ROOT = "operating/"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** key 只允許這些字元。SigV4 的簽章與實際請求只要差一個位元組就是 403，而且錯誤訊息不會告訴你差在哪。 */
const SAFE_KEY_PATTERN = /^[A-Za-z0-9/_.-]+$/

/**
 * 從檔名取副檔名，而且**只取副檔名**。
 * `報價單.DOCX` → `docx`；`商城專案資訊.docx` 的「商城專案資訊」永遠不進 key。
 */
export function sanitizeKeyExtension(fileNameOrExt: string): string {
  const raw = String(fileNameOrExt ?? "")
  const tail = raw.includes(".") ? raw.slice(raw.lastIndexOf(".") + 1) : raw
  return tail
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8)
}

/**
 * `operating/{workspaceId}/project/{projectId}/{yyyy-mm}/{uuid}{ext}`（`RES-033` §R2 key 策略）。
 *
 * 三件事刻意不做：
 *   - **資料夾路徑不進 key**。R2 沒有 server-side rename，搬一個資料夾就得複製整個子樹的 bytes。
 *   - **原檔名不進 key**。中文／全形在 SigV4 會變成查不出原因的 403，而且使用者送來的路徑
 *     是目錄穿越最常見的入口。顯示名稱存在 DB 的 `displayName`。
 *   - **不接受呼叫端送來的 key**。uuid 也在這裡驗格式，形狀不對就丟。
 */
export function buildProjectDriveObjectKey(input: {
  workspaceId: string
  projectId: string
  uuid: string
  /** 原檔名或副檔名，只會被用來取 ASCII 副檔名。 */
  fileName?: string | null
  now?: Date
}): string {
  if (!UUID_PATTERN.test(input.workspaceId)) {
    throw new ProjectDriveRuleError("bad_workspace_id", "工作區代號格式不對。")
  }
  if (!UUID_PATTERN.test(input.projectId)) {
    throw new ProjectDriveRuleError("bad_project_id", "專案代號格式不對。")
  }
  if (!UUID_PATTERN.test(input.uuid)) {
    throw new ProjectDriveRuleError("bad_object_uuid", "物件代號必須由伺服器產生。")
  }
  const month = (input.now ?? new Date()).toISOString().slice(0, 7)
  const ext = sanitizeKeyExtension(input.fileName ?? "")
  const key =
    PROJECT_DRIVE_KEY_ROOT +
    input.workspaceId +
    "/project/" +
    input.projectId +
    "/" +
    month +
    "/" +
    input.uuid +
    (ext ? "." + ext : "")
  if (!isWellFormedProjectDriveKey(key)) {
    throw new ProjectDriveRuleError("bad_object_key", "產生出來的檔案位置不合法。")
  }
  return key
}

export function isWellFormedProjectDriveKey(objectKey: string): boolean {
  const key = String(objectKey ?? "")
  if (!key.startsWith(PROJECT_DRIVE_KEY_ROOT)) return false
  if (key.includes("..") || key.includes("//")) return false
  if (key.length > 1024) return false
  if (!SAFE_KEY_PATTERN.test(key)) return false
  return /^operating\/[0-9a-f-]{36}\/project\/[0-9a-f-]{36}\/\d{4}-\d{2}\/[0-9a-f-]{36}(\.[a-z0-9]{1,8})?$/i.test(
    key
  )
}

/* ------------------------------------------------------------------ */
/* 樹                                                                 */
/* ------------------------------------------------------------------ */

export type DriveTreeNode = {
  id: string
  parentId: string | null
  kind: DriveFolderKind
  visibility: DriveVisibility
  name: string
  path: string
  depth: number
  isSystem: boolean
  /** 直接放在這個夾裡的檔案數。 */
  fileCount: number
  /** 含子樹的檔案總數。 */
  fileCountDeep: number
  /** 這個夾（含祖先鏈）允不允許建全文索引。 */
  indexable: boolean
  children: DriveTreeNode[]
}

/**
 * 由列組樹。檔案計數與索引政策一起算完，因為兩者都要走同一次 DFS，
 * 讓呼叫端再走一次只會讓兩邊算出不一樣的答案。
 *
 * 父夾對不上的列（資料損壞或父夾被軟刪）當成根層孤兒列出來，不默默丟掉 ——
 * 看不見的列是最難查的那一種。
 */
export function buildFolderTree(
  rows: DriveFolderNode[],
  fileCounts: Record<string, number> = {}
): DriveTreeNode[] {
  const live = rows.filter((row) => !row.deletedAt)
  const byId = new Map<string, DriveTreeNode>()
  for (const row of live) {
    byId.set(row.id, {
      id: row.id,
      parentId: row.parentId,
      kind: row.kind,
      visibility: row.visibility,
      name: row.name,
      path: row.path,
      depth: row.depth,
      isSystem: row.isSystem,
      fileCount: fileCounts[row.id] ?? 0,
      fileCountDeep: 0,
      indexable: true,
      children: [],
    })
  }
  const roots: DriveTreeNode[] = []
  for (const row of live) {
    const node = byId.get(row.id)
    if (!node) continue
    const parent = row.parentId ? byId.get(row.parentId) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortRows = (nodes: DriveTreeNode[]) => {
    nodes.sort((a, b) => {
      const sa = live.find((r) => r.id === a.id)?.sortOrder ?? 0
      const sb = live.find((r) => r.id === b.id)?.sortOrder ?? 0
      if (sa !== sb) return sa - sb
      return a.name.localeCompare(b.name, "zh-Hant")
    })
    for (const node of nodes) sortRows(node.children)
  }
  sortRows(roots)

  const walk = (node: DriveTreeNode, inheritedNoIndex: boolean): number => {
    const noIndex = inheritedNoIndex || node.visibility === "RESTRICTED_NO_INDEX"
    node.indexable = !noIndex
    let total = node.fileCount
    for (const child of node.children) total += walk(child, noIndex)
    node.fileCountDeep = total
    return total
  }
  for (const root of roots) walk(root, false)
  return roots
}

/** 由 `path` 還原祖先鏈（不含自己），依根→父排序。查詢回來的列用這個組鏈，不另外遞迴查。 */
export function ancestorsFromPath(
  folder: Pick<DriveFolderNode, "id" | "path">,
  pool: DriveFolderNode[]
): DriveFolderNode[] {
  const ids = parseFolderPathIds(folder.path).filter((id) => id !== folder.id)
  const byId = new Map(pool.map((row) => [row.id, row]))
  const chain: DriveFolderNode[] = []
  for (const id of ids) {
    const row = byId.get(id)
    if (row) chain.push(row)
  }
  return chain
}

/* ===== PROJECT-DRIVE-PURE:END ===================================== */

/* ================================================================== */
/* 以下是持久化層：所有 Prisma 查詢都在這裡，純函式區不碰 db             */
/* ================================================================== */

/**
 * 新 delegate 的單一取用點。
 *
 * `pnpm db:generate` 跑過之前，`PrismaClient` 上還沒有 `projectFolder`，
 * tsc 會在這一行報一次 —— 刻意收在這一個點，而不是散落在每一個查詢裡。
 * **不用 `as unknown as` 把它蓋掉**：那會讓這些查詢在 client 產生之後
 * 永遠失去型別檢查，而現在這個錯誤正是「還沒 generate」這件事的提示。
 */
const folderTable = () => db.projectFolder

const FOLDER_FIELDS = {
  id: true,
  projectId: true,
  workspaceId: true,
  parentId: true,
  kind: true,
  visibility: true,
  name: true,
  nameNormalized: true,
  path: true,
  depth: true,
  sortOrder: true,
  isSystem: true,
  deletedAt: true,
} as const

type FolderRow = DriveFolderNode & { workspaceId: string }

/* ------------------------------------------------------------------ */
/* workspaceId：伺服器端解析，永不吃前端參數（OD-C）                     */
/* ------------------------------------------------------------------ */

/**
 * 專案所屬的工作區。順序刻意：先問專案自己，再退回 Owner 的工作區。
 *
 * 呼叫端送來的 workspaceId **一律忽略**（route 層連欄位都不讀）。
 * 它是授權的範圍本身 —— 讓呼叫端指定等於讓呼叫端自己挑要看哪一個租戶的資料。
 */
export async function resolveProjectWorkspaceId(
  profileId: string,
  projectId: string
): Promise<string> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  })
  if (!project) throw new ProjectDriveNotFoundError("找不到這個專案。")
  if (project.workspaceId) return project.workspaceId

  // `Project.workspaceId` 可空（Wave 1 的 schema 註解寫明），舊列沒有值。
  // OD-C（Owner 已批准）：**開啟專案硬碟時就把 null 綁定到公司工作區**，
  // 否則既有的私人專案永遠接不上 workspace-scoped 的資源
  // （`OperatingAsset.workspaceId` 是 NOT NULL）。
  //
  // 為什麼這裡呼叫是安全的：能力解析對「未綁 workspace」的專案只放行擁有者
  // （非擁有者拿到空集合、在上游就被擋掉），所以走到這一行的一定是擁有者，
  // 而 `ensureProjectWorkspaceBinding()` 內部的擁有者精確比對不會把人擋在外面。
  // 它是冪等的：已綁定就原樣回傳，併發落敗時重讀現值而不覆寫。
  try {
    return await ensureProjectWorkspaceBinding(profileId, projectId)
  } catch (error) {
    if (error instanceof ProjectWorkspaceBindingError) {
      throw new ProjectDriveRuleError("no_workspace", "這個帳號還沒有營運工作區。")
    }
    throw error
  }
}

/* ------------------------------------------------------------------ */
/* 讀取                                                               */
/* ------------------------------------------------------------------ */

async function loadProjectFolders(projectId: string): Promise<FolderRow[]> {
  return folderTable().findMany({
    where: { projectId, deletedAt: null },
    select: FOLDER_FIELDS,
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  })
}

async function requireFolder(folderId: string): Promise<FolderRow> {
  const folder = await folderTable().findFirst({
    where: { id: folderId, deletedAt: null },
    select: FOLDER_FIELDS,
  })
  if (!folder) throw new ProjectDriveNotFoundError()
  return folder
}

/** 每夾的**直接**檔案數。`fileCountDeep` 由 `buildFolderTree()` 在同一次 DFS 裡捲起來。 */
async function countFilesByFolder(projectId: string): Promise<Record<string, number>> {
  const grouped = await db.operatingAsset.groupBy({
    by: ["folderId"],
    where: { projectId, deletedAt: null, status: "ready" },
    _count: { _all: true },
  })
  const counts: Record<string, number> = {}
  for (const row of grouped) {
    if (row.folderId) counts[row.folderId] = row._count._all
  }
  return counts
}

export type ProjectFolderTree = {
  projectId: string
  workspaceId: string
  rootId: string | null
  inboxId: string | null
  /** 待整理（`filedAt` 為 null）的檔案數。收件匣的紅點讀這個。 */
  unfiledCount: number
  nodes: DriveTreeNode[]
}

export async function listProjectFolderTree(
  profileId: string,
  projectId: string
): Promise<ProjectFolderTree> {
  await assertProjectCapability(profileId, projectId, "drive:read")
  const workspaceId = await resolveProjectWorkspaceId(profileId, projectId)

  const [rows, counts, unfiledCount] = await Promise.all([
    loadProjectFolders(projectId),
    countFilesByFolder(projectId),
    db.operatingAsset.count({
      where: { projectId, deletedAt: null, status: "ready", filedAt: null },
    }),
  ])

  const root = rows.find((row) => row.kind === "ROOT") ?? null
  const inbox = rows.find((row) => row.kind === "INBOX") ?? null

  return {
    projectId,
    workspaceId,
    rootId: root ? root.id : null,
    inboxId: inbox ? inbox.id : null,
    unfiledCount,
    nodes: buildFolderTree(rows, counts),
  }
}

/* ------------------------------------------------------------------ */
/* ROOT ＋ INBOX：冪等地保證每專案各一個                                */
/* ------------------------------------------------------------------ */

export type ProjectDriveBootstrap = { rootId: string; inboxId: string; created: string[] }

/**
 * 冪等。重複呼叫不會多建、不會改既有列。
 *
 * **刻意沒有 profileId 參數**（任務書的簽章）：這是一個內部的 bootstrap 步驟，
 * 授權在呼叫端 —— 每一個對外的寫入入口都已經先過 `assertProjectCapability()`。
 *
 * 併發要靠鎖，不能只靠「先查再建」：`(parent_id, name_normalized)` 的 UNIQUE
 * 在 `parent_id IS NULL` 時擋不住重複（Postgres 視 NULL 互不相等），
 * 所以兩個同時啟用硬碟的請求能各建出一個 ROOT。advisory lock 關掉這個窗口。
 */
export async function ensureProjectRootAndInbox(
  projectId: string,
  workspaceId: string
): Promise<ProjectDriveBootstrap> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`project-drive:bootstrap:${projectId}`}))`
    )
    const table = tx.projectFolder
    const existing: FolderRow[] = await table.findMany({
      where: { projectId, deletedAt: null, kind: { in: ["ROOT", "INBOX"] } },
      select: FOLDER_FIELDS,
    })
    const created: string[] = []

    // 一次賦值而不是 `let` ＋ `if (!root) root = …`：後者在型別上仍是
    // `FolderRow | null`，底下每次用到 root 都得再判一次 null。
    const createSystemFolder = async (input: {
      kind: "ROOT" | "INBOX"
      name: string
      parent: FolderRow | null
    }): Promise<FolderRow> => {
      const id = randomUUID()
      const row: FolderRow = await table.create({
        data: {
          id,
          projectId,
          workspaceId,
          parentId: input.parent ? input.parent.id : null,
          kind: input.kind,
          visibility: "INTERNAL_ONLY",
          name: input.name,
          nameNormalized: normalizeFolderName(input.name),
          path: buildFolderPath(input.parent ? input.parent.path : null, id),
          depth: input.parent ? input.parent.depth + 1 : 0,
          sortOrder: 0,
          isSystem: true,
        },
        select: FOLDER_FIELDS,
      })
      created.push(input.kind)
      return row
    }

    const root: FolderRow =
      existing.find((row) => row.kind === "ROOT") ??
      (await createSystemFolder({ kind: "ROOT", name: "專案硬碟", parent: null }))

    const inbox: FolderRow =
      existing.find((row) => row.kind === "INBOX") ??
      (await createSystemFolder({ kind: "INBOX", name: "收件匣", parent: root }))

    return { rootId: root.id, inboxId: inbox.id, created }
  })
}

/* ------------------------------------------------------------------ */
/* 建立                                                               */
/* ------------------------------------------------------------------ */

export type CreateProjectFolderInput = {
  parentId?: string | null
  name: string
  kind?: DriveFolderKind
  visibility?: DriveVisibility | null
  note?: string | null
  space?: "team" | "personal"
}

export async function createProjectFolder(
  profileId: string,
  projectId: string,
  input: CreateProjectFolderInput
): Promise<FolderRow> {
  await assertProjectCapability(profileId, projectId, "drive:write")
  const workspaceId = await resolveProjectWorkspaceId(profileId, projectId)
  const bootstrap = await ensureProjectRootAndInbox(projectId, workspaceId)

  const kind: DriveFolderKind = input.kind ?? "GENERIC"
  if (!PROJECT_DRIVE_KINDS.includes(kind)) {
    throw new ProjectDriveRuleError("invalid_kind", "不認得這個資料夾類型。")
  }
  // 系統資料夾只能由 bootstrap 建。讓呼叫端建第二個 ROOT／INBOX，
  // 收件匣就會變成「其中一個收件匣」，所有落點邏輯跟著失真。
  if (SYSTEM_FOLDER_KINDS.includes(kind)) {
    throw new ProjectDriveRuleError("system_folder_immutable", "系統資料夾由系統建立。")
  }

  const verdictName = validateFolderName(input.name)
  if (!verdictName.ok) throw new ProjectDriveRuleError(verdictName.code, verdictName.error)

  const rows = await loadProjectFolders(projectId)
  const parent = rows.find((row) => row.id === (input.parentId ?? bootstrap.rootId)) ?? null
  if (!parent) throw new ProjectDriveNotFoundError("找不到上層資料夾。")
  if (parent.projectId !== projectId) {
    throw new ProjectDriveRuleError("cross_project_parent", "上層資料夾不屬於這個專案。")
  }

  const ancestors = [...ancestorsFromPath(parent, rows), parent]
  const verdictVisibility = evaluateVisibility({
    requested: input.visibility ?? null,
    kind,
    ancestors,
    parentVisibility: parent.visibility,
  })
  if (!verdictVisibility.ok) {
    throw new ProjectDriveRuleError(verdictVisibility.code, verdictVisibility.error)
  }

  const siblings = rows.filter((row) => row.parentId === parent.id)
  const conflict = findSiblingNameConflict(siblings, verdictName.nameNormalized)
  if (conflict) {
    throw new ProjectDriveRuleError(
      "duplicate_name",
      "這個資料夾裡已經有「" + conflict.name + "」。"
    )
  }

  const depth = parent.depth + 1
  if (depth > DRIVE_MAX_DEPTH) {
    throw new ProjectDriveRuleError("too_deep", "資料夾層數最多 " + DRIVE_MAX_DEPTH + " 層。")
  }

  const id = randomUUID()
  const sortOrder = siblings.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 10
  try {
    return await folderTable().create({
      data: {
        id,
        projectId,
        workspaceId,
        parentId: parent.id,
        kind,
        visibility: verdictVisibility.visibility,
        name: verdictName.name,
        nameNormalized: verdictName.nameNormalized,
        path: buildFolderPath(parent.path, id),
        depth,
        sortOrder,
        isSystem: false,
        space: input.space === "personal" ? "personal" : "team",
        createdByProfileId: profileId,
        note: input.note ?? null,
      },
      select: FOLDER_FIELDS,
    })
  } catch (error) {
    // 同層撞名的最後一道是 DB 的 UNIQUE；上面那一道只是為了回得出看得懂的理由。
    if ((error as { code?: string })?.code === "P2002") {
      throw new ProjectDriveRuleError("duplicate_name", "這個資料夾裡已經有同名資料夾。")
    }
    throw error
  }
}

/* ------------------------------------------------------------------ */
/* 改名                                                               */
/* ------------------------------------------------------------------ */

export async function renameProjectFolder(
  profileId: string,
  folderId: string,
  name: string
): Promise<FolderRow> {
  const folder = await requireFolder(folderId)
  await assertProjectCapability(profileId, folder.projectId, "drive:write")
  if (folder.isSystem || SYSTEM_FOLDER_KINDS.includes(folder.kind)) {
    throw new ProjectDriveRuleError("system_folder_immutable", "系統資料夾不能改名。")
  }

  const verdict = validateFolderName(name)
  if (!verdict.ok) throw new ProjectDriveRuleError(verdict.code, verdict.error)

  const siblings = await folderTable().findMany({
    where: { projectId: folder.projectId, parentId: folder.parentId, deletedAt: null },
    select: FOLDER_FIELDS,
  })
  const conflict = findSiblingNameConflict(siblings, verdict.nameNormalized, folder.id)
  if (conflict) {
    throw new ProjectDriveRuleError("duplicate_name", "同一層已經有「" + conflict.name + "」。")
  }

  // 改名**不動 path**：path 由 id 組成，與顯示名稱無關。
  // 這是「資料夾改名不需要搬 R2 bytes」的另一半理由。
  return folderTable().update({
    where: { id: folder.id },
    data: { name: verdict.name, nameNormalized: verdict.nameNormalized },
    select: FOLDER_FIELDS,
  })
}

/* ------------------------------------------------------------------ */
/* 搬移：一次子樹 UPDATE                                                */
/* ------------------------------------------------------------------ */

export type MoveProjectFolderResult = {
  folderId: string
  newParentId: string
  /** 這次被重寫 path 的列數（含自己）。 */
  rewritten: number
  oldPrefix: string
  newPrefix: string
}

/**
 * 搬移。Wave 1 的落差②就補在這裡。
 *
 * 子孫的 `path` 與 `depth` 由**一條** SQL 重寫完：
 *
 * ```sql
 * UPDATE project_folders
 *    SET parent_id = CASE WHEN id = $folder THEN $newParent ELSE parent_id END,
 *        path  = $newPrefix || substr(path, length($oldPrefix) + 1),
 *        depth = depth + $delta
 *  WHERE project_id = $project AND deleted_at IS NULL AND path LIKE $oldPrefix || '%'
 * ```
 *
 * 用 SQL 而不是 N 次 `update`：子樹可以有幾百列，逐列更新會在半途被任何一個錯誤
 * 切成「一半在新前綴、一半在舊前綴」—— 那比沒搬成功更糟，因為樹看起來是對的
 * （UI 讀 `parentId`），只有以 `path` 前綴做的子樹查詢會靜靜地算錯。
 *
 * `LIKE` 的前綴是 `/uuid/uuid/` 形狀，不含 `%` 或 `_`，所以不需要 escape；
 * `path` 的頭尾都有 `/`，所以前綴比對不會把 `/a/` 誤判成 `/ab/` 的祖先。
 */
export async function moveProjectFolder(
  profileId: string,
  folderId: string,
  newParentId: string
): Promise<MoveProjectFolderResult> {
  const folder = await requireFolder(folderId)
  await assertProjectCapability(profileId, folder.projectId, "drive:write")

  const rows = await loadProjectFolders(folder.projectId)
  const newParent = rows.find((row) => row.id === newParentId) ?? null
  // 跨專案搬移在 planFolderMove 裡也擋一次；這裡先擋是為了不洩漏「那個 id 存在」。
  if (!newParent) {
    const foreign = await folderTable().findFirst({
      where: { id: newParentId, deletedAt: null },
      select: { id: true },
    })
    if (foreign) {
      throw new ProjectDriveRuleError("cross_project_move", "不能把資料夾搬到別的專案。")
    }
    throw new ProjectDriveNotFoundError("找不到目標資料夾。")
  }

  const subtree = rows.filter((row) => isWithinSubtree(row.path, folder.path))
  const siblings = rows.filter((row) => row.parentId === newParent.id)
  const newAncestors = [...ancestorsFromPath(newParent, rows), newParent]

  const plan = planFolderMove({ folder, newParent, subtree, siblings, newAncestors })
  if (!plan.ok) throw new ProjectDriveRuleError(plan.code, plan.error)

  await db.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`project-drive:tree:${folder.projectId}`}))`
    )
    await tx.$executeRaw(Prisma.sql`
      UPDATE project_folders
         SET parent_id = CASE WHEN id = ${plan.folderId}::uuid
                              THEN ${newParent.id}::uuid
                              ELSE parent_id END,
             path = ${plan.newPrefix} || substr(path, ${plan.oldPrefix.length + 1}::int),
             depth = depth + ${plan.depthDelta}::int,
             updated_at = now()
       WHERE project_id = ${folder.projectId}::uuid
         AND deleted_at IS NULL
         AND path LIKE ${plan.oldPrefix + "%"}
    `)
  })

  return {
    folderId: plan.folderId,
    newParentId: newParent.id,
    rewritten: plan.rows.length,
    oldPrefix: plan.oldPrefix,
    newPrefix: plan.newPrefix,
  }
}

/* ------------------------------------------------------------------ */
/* 可見性                                                             */
/* ------------------------------------------------------------------ */

export type SetVisibilityResult = { folderId: string; visibility: DriveVisibility; affected: number }

/**
 * 改可見性。放寬的方向由 `evaluateVisibility()` 擋（祖先較嚴時一律拒絕）。
 *
 * 收緊的方向則會**往下傳**：把一個夾改成 `RESTRICTED_NO_INDEX` 之後，
 * 底下任何 `CLIENT_VISIBLE` 的子夾就成了違反不變量的列，所以同一筆交易裡
 * 一次把子樹裡比它寬的列拉到同一級。不這樣做的話，不變量只在寫入時成立，
 * 讀取端就得每次自己走祖先鏈 —— 而漏走一次就是一次外洩。
 */
export async function setProjectFolderVisibility(
  profileId: string,
  folderId: string,
  visibility: DriveVisibility
): Promise<SetVisibilityResult> {
  const folder = await requireFolder(folderId)
  await assertProjectCapability(profileId, folder.projectId, "drive:write")

  const rows = await loadProjectFolders(folder.projectId)
  const ancestors = ancestorsFromPath(folder, rows)
  const verdict = evaluateVisibility({ requested: visibility, kind: folder.kind, ancestors })
  if (!verdict.ok) throw new ProjectDriveRuleError(verdict.code, verdict.error)

  const target = verdict.visibility
  const looserDescendants = rows.filter(
    (row) =>
      row.id !== folder.id &&
      isWithinSubtree(row.path, folder.path) &&
      DRIVE_VISIBILITY_RANK[row.visibility] < DRIVE_VISIBILITY_RANK[target]
  )

  await db.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`project-drive:tree:${folder.projectId}`}))`
    )
    const table = tx.projectFolder
    await table.update({ where: { id: folder.id }, data: { visibility: target } })
    if (looserDescendants.length) {
      await table.updateMany({
        where: { id: { in: looserDescendants.map((row) => row.id) } },
        data: { visibility: target },
      })
    }
    // 不得索引的子樹裡不能留著先前抽好的明文。
    if (target === "RESTRICTED_NO_INDEX") {
      await tx.operatingAsset.updateMany({
        where: {
          projectId: folder.projectId,
          folderId: { in: [folder.id, ...rows.filter((row) => isWithinSubtree(row.path, folder.path)).map((row) => row.id)] },
          extractedText: { not: null },
        },
        data: { extractedText: null },
      })
    }
  })

  return { folderId: folder.id, visibility: target, affected: looserDescendants.length + 1 }
}

/* ------------------------------------------------------------------ */
/* 軟刪                                                               */
/* ------------------------------------------------------------------ */

export type SoftDeleteResult = { folderId: string; deleted: number }

export async function softDeleteProjectFolder(
  profileId: string,
  folderId: string
): Promise<SoftDeleteResult> {
  const folder = await requireFolder(folderId)
  await assertProjectCapability(profileId, folder.projectId, "drive:write")

  const rows = await loadProjectFolders(folder.projectId)
  const subtree = rows.filter((row) => isWithinSubtree(row.path, folder.path))
  const liveAssetCount = await db.operatingAsset.count({
    where: {
      projectId: folder.projectId,
      folderId: { in: subtree.map((row) => row.id) },
      deletedAt: null,
    },
  })

  const plan = planFolderSoftDelete({ folder, subtree, liveAssetCount })
  if (!plan.ok) throw new ProjectDriveRuleError(plan.code, plan.error)

  // 同樣是一條子樹 UPDATE：軟刪一個夾等於軟刪它的整個子樹，
  // 留下「父夾已刪、子夾還活著」的狀態會讓子夾變成讀不到卻存在的列。
  await db.$executeRaw(Prisma.sql`
    UPDATE project_folders
       SET deleted_at = now(), updated_at = now()
     WHERE project_id = ${folder.projectId}::uuid
       AND deleted_at IS NULL
       AND path LIKE ${plan.prefix + "%"}
  `)

  return { folderId: folder.id, deleted: plan.ids.length }
}

/* ------------------------------------------------------------------ */
/* 歸檔                                                               */
/* ------------------------------------------------------------------ */

export type FileAssetResult = {
  assetId: string
  folderId: string
  filedAt: Date
  indexing: DriveIndexingPolicy
  /** 永遠是 0。歸檔不碰 R2。 */
  r2OperationCount: number
}

/**
 * 歸檔＝只改 `folderId` / `filedAt`。`objectKey` 一個字都不動。
 *
 * 這是把資料夾放在 DB 而不是 key 裡的回報：搬一萬個檔案是一萬次
 * 單欄 UPDATE，而不是一萬次 R2 CopyObject＋DeleteObject（Class A 操作要錢，
 * 而且 R2 沒有 server-side rename，所謂搬移其實是複製再刪）。
 */
export async function fileAssetIntoFolder(
  profileId: string,
  assetId: string,
  folderId: string
): Promise<FileAssetResult> {
  const folder = await requireFolder(folderId)
  await assertProjectCapability(profileId, folder.projectId, "drive:write")

  const asset = await db.operatingAsset.findFirst({
    where: { id: assetId, deletedAt: null },
    select: {
      id: true,
      workspaceId: true,
      projectId: true,
      folderId: true,
      status: true,
      deletedAt: true,
      extractedText: true,
    },
  })
  if (!asset) throw new ProjectDriveNotFoundError("找不到這個檔案。")
  // 租戶隔離（`ARC-033`）：資料夾與夾內檔案必須同一個工作區。
  if (asset.workspaceId !== folder.workspaceId) {
    throw new ProjectDriveRuleError("cross_workspace_filing", "這個檔案不屬於這個工作區。")
  }

  const rows = await loadProjectFolders(folder.projectId)
  const ancestors = ancestorsFromPath(folder, rows)
  const now = new Date()
  const plan = planAssetFiling({ asset, folder, ancestors, now })
  if (!plan.ok) throw new ProjectDriveRuleError(plan.code, plan.error)

  await db.operatingAsset.update({ where: { id: asset.id }, data: plan.data })

  return {
    assetId: asset.id,
    folderId: folder.id,
    filedAt: now,
    indexing: plan.indexing,
    r2OperationCount: plan.r2Operations.length,
  }
}

/**
 * 要寫 `extractedText`／要送進全文索引的唯一入口。
 *
 * `RESTRICTED_NO_INDEX` 不是一個「顯示用」的 enum 值，它的語意是這道守門：
 * 擋下來時**丟例外**，不是安靜地不寫 —— 安靜地不寫會讓下一個人以為索引壞了，
 * 於是把守門繞過去。
 */
export async function writeAssetExtractedText(
  profileId: string,
  assetId: string,
  extractedText: string
): Promise<{ assetId: string; indexed: true }> {
  const asset = await db.operatingAsset.findFirst({
    where: { id: assetId, deletedAt: null },
    select: { id: true, projectId: true, folderId: true },
  })
  if (!asset) throw new ProjectDriveNotFoundError("找不到這個檔案。")
  if (!asset.projectId) {
    throw new ProjectDriveRuleError("asset_not_in_project", "這個檔案不在專案硬碟上。")
  }
  await assertProjectCapability(profileId, asset.projectId, "drive:write")

  const rows = await loadProjectFolders(asset.projectId)
  const folder = asset.folderId ? rows.find((row) => row.id === asset.folderId) ?? null : null
  const policy = resolveIndexingPolicy({
    folder,
    ancestors: folder ? ancestorsFromPath(folder, rows) : [],
  })
  const refusal = indexingRefusalReason(policy)
  if (refusal) throw new ProjectDriveIndexingBlockedError(refusal)

  await db.operatingAsset.update({ where: { id: asset.id }, data: { extractedText } })
  return { assetId: asset.id, indexed: true }
}

/* ------------------------------------------------------------------ */
/* bytes：沿用既有的 presigned PUT ＋ headObject() finalize 形狀          */
/* ------------------------------------------------------------------ */

/**
 * 專案硬碟的檔案也走 `OperatingAsset`（OD-E：它是專案檔案唯一的家），
 * 所以 `refCode` 沿用 `AST-{JRNL|LIB|CASH}-…` 的既有格式。
 * 專案檔案記成 `library`（`LIB`）—— 新增一個 token 要改
 * `src/lib/ui-data/yuanzhan/operating-assets.ts` 的 `ASSET_REF_CODE_PATTERN`，
 * 那個檔不在本 wave 的所有權內。待後續 wave 決定是否加 `PROJ` token。
 */
const PROJECT_ASSET_ORIGIN = "library"

async function nextProjectRefSeq(workspaceId: string): Promise<number> {
  const rows = await db.operatingAsset.findMany({
    where: { workspaceId },
    select: { refCode: true },
  })
  let max = 0
  for (const row of rows) {
    const seq = parseAssetRefSeq(row.refCode)
    if (seq > max) max = seq
  }
  return max + 1
}

export type CreateProjectUploadInput = {
  projectId: string
  /** 省略＝落進收件匣（`role='inbox'` 的真資料夾，不是另一個分頁）。 */
  folderId?: string | null
  name: string
  contentType?: string | null
  bytes: number
}

export type CreateProjectUploadResult = {
  assetId: string
  refCode: string
  objectKey: string
  uploadUrl: string
  folderId: string
  filed: boolean
  kind: string
  multipart: boolean
}

/**
 * 列先建、網址後給（與 `operating-assets.service.ts` 的 `createPendingAsset()` 同一個順序）。
 *
 * 反過來會在使用者於兩者之間關掉分頁時，於 R2 留下一份沒有任何一列指得到的 bytes。
 */
export async function createProjectDriveUpload(
  profileId: string,
  input: CreateProjectUploadInput
): Promise<CreateProjectUploadResult> {
  await assertProjectCapability(profileId, input.projectId, "drive:write")
  const workspaceId = await resolveProjectWorkspaceId(profileId, input.projectId)

  // 白名單與分級上限走共用契約，前端擋下來的理由與這裡一字不差。
  const verdict = classifyAsset({ name: input.name, bytes: input.bytes, mimeType: input.contentType })
  if (!verdict.ok) throw new ProjectDriveRuleError(verdict.code, verdict.error)

  const bootstrap = await ensureProjectRootAndInbox(input.projectId, workspaceId)
  const targetId = input.folderId ?? bootstrap.inboxId
  const folder = await requireFolder(targetId)
  if (folder.projectId !== input.projectId) {
    throw new ProjectDriveRuleError("cross_project_filing", "目標資料夾不屬於這個專案。")
  }

  const now = new Date()
  const bucket = getR2BucketName()
  const explicitFolder = Boolean(input.folderId) && folder.kind !== "INBOX"

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const refCode = formatAssetRefCode({
      origin: PROJECT_ASSET_ORIGIN,
      seq: await nextProjectRefSeq(workspaceId),
      now,
    })
    const objectKey = buildProjectDriveObjectKey({
      workspaceId,
      projectId: input.projectId,
      uuid: randomUUID(),
      fileName: input.name,
      now,
    })
    try {
      const asset = await db.operatingAsset.create({
        data: {
          workspaceId,
          refCode,
          kind: verdict.kind,
          displayName: input.name,
          bucket,
          objectKey,
          mimeType: input.contentType ?? null,
          sizeBytes: input.bytes,
          status: "uploading",
          space: "team",
          authorKey: null,
          origin: PROJECT_ASSET_ORIGIN,
          bornAt: now,
          workbenchRef: refCode,
          projectId: input.projectId,
          folderId: folder.id,
          // 直接丟進指定資料夾＝已整理；落進收件匣＝待整理（`filedAt` 為 null）。
          filedAt: explicitFolder ? now : null,
        },
        select: { id: true, refCode: true, objectKey: true, bucket: true, kind: true },
      })
      const uploadUrl = await createUploadUrl(asset.bucket, asset.objectKey, input.contentType)
      return {
        assetId: asset.id,
        refCode: asset.refCode,
        objectKey: asset.objectKey,
        uploadUrl,
        folderId: folder.id,
        filed: explicitFolder,
        kind: asset.kind,
        multipart: verdict.multipart,
      }
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002" && attempt < 2) continue
      throw error
    }
  }
  throw new ProjectDriveRuleError("ref_code_exhausted", "無法指派參考碼，請重試。")
}

export type FinalizeProjectUploadResult =
  | { ok: true; assetId: string; status: string; sizeBytes: number; refCode: string }
  | { ok: false; code: "missing" | "size_mismatch"; error: string }

/**
 * finalize：伺服器回頭問 R2 這個 key 存進去了沒、大小對不對。
 *
 * 形狀與 `operating-assets.service.ts` 的 `finalizeAsset()` 一致（同一個
 * `headObject()`、同一條「大小對不上就 failed」的規則）。差別只在授權：
 * 那一條看席位，這一條看專案 capability。
 */
export async function finalizeProjectDriveAsset(
  profileId: string,
  projectId: string,
  assetId: string
): Promise<FinalizeProjectUploadResult> {
  await assertProjectCapability(profileId, projectId, "drive:write")

  const asset = await db.operatingAsset.findFirst({
    where: { id: assetId, projectId, deletedAt: null },
    select: {
      id: true,
      refCode: true,
      bucket: true,
      objectKey: true,
      sizeBytes: true,
      status: true,
      mimeType: true,
    },
  })
  if (!asset) throw new ProjectDriveNotFoundError("找不到這個檔案。")
  // 重送 finalize 不是錯誤：網路重試會造成這件事。回報現狀即可。
  if (asset.status === "ready") {
    return { ok: true, assetId: asset.id, status: asset.status, sizeBytes: asset.sizeBytes ?? 0, refCode: asset.refCode }
  }
  if (asset.status !== "uploading") {
    throw new ProjectDriveRuleError("bad_state", "這個檔案的狀態不允許這個動作。")
  }

  const head = await headObject(asset.bucket, asset.objectKey)
  if (!head) {
    await db.operatingAsset.update({ where: { id: asset.id }, data: { status: "failed" } })
    return { ok: false, code: "missing", error: "檔案沒有傳上去，請重試。" }
  }
  if (asset.sizeBytes != null && head.bytes !== asset.sizeBytes) {
    await db.operatingAsset.update({ where: { id: asset.id }, data: { status: "failed" } })
    return {
      ok: false,
      code: "size_mismatch",
      error: "檔案傳到一半就中斷了（" + head.bytes + " / " + asset.sizeBytes + " bytes），請重試。",
    }
  }

  const updated = await db.operatingAsset.update({
    where: { id: asset.id },
    data: {
      status: "ready",
      sizeBytes: head.bytes,
      contentHash: head.etag,
      mimeType: head.contentType ?? asset.mimeType,
    },
    select: { id: true, status: true, sizeBytes: true, refCode: true },
  })
  return {
    ok: true,
    assetId: updated.id,
    status: updated.status,
    sizeBytes: updated.sizeBytes ?? head.bytes,
    refCode: updated.refCode,
  }
}

export async function failProjectDriveAsset(
  profileId: string,
  projectId: string,
  assetId: string
): Promise<{ status: "failed" }> {
  await assertProjectCapability(profileId, projectId, "drive:write")
  await db.operatingAsset.updateMany({
    where: { id: assetId, projectId, status: "uploading" },
    data: { status: "failed" },
  })
  return { status: "failed" }
}

/**
 * 下載網址。先查「這個 key 屬於哪一列、那一列在不在這個專案」再簽 —— 不只檢查前綴。
 * 只檢查前綴等於「有席位就能下載任何檔案」，那個洞在
 * `claude/journal-asset-upload-r2-proposals.md` 已經記過一次。
 */
export async function resolveProjectDriveDownloadUrl(
  profileId: string,
  projectId: string,
  objectKey: string
): Promise<{ downloadUrl: string }> {
  await assertProjectCapability(profileId, projectId, "drive:read")
  if (!isWellFormedProjectDriveKey(objectKey)) {
    throw new ProjectDriveNotFoundError("無效的檔案位置。")
  }
  const workspaceId = await resolveProjectWorkspaceId(profileId, projectId)
  const asset = await db.operatingAsset.findFirst({
    where: { workspaceId, projectId, objectKey, deletedAt: null },
    select: { bucket: true, objectKey: true },
  })
  if (!asset) throw new ProjectDriveNotFoundError("找不到這個檔案。")
  const downloadUrl = await createDownloadUrl(asset.bucket, asset.objectKey)
  return { downloadUrl }
}

export type ProjectDriveFolderContents = {
  folderId: string
  indexing: DriveIndexingPolicy
  assets: {
    id: string
    refCode: string
    displayName: string
    kind: string
    sizeBytes: number | null
    objectKey: string
    status: string
    filedAt: Date | null
    createdAt: Date
  }[]
}

export async function listFolderContents(
  profileId: string,
  folderId: string
): Promise<ProjectDriveFolderContents> {
  const folder = await requireFolder(folderId)
  await assertProjectCapability(profileId, folder.projectId, "drive:read")
  const rows = await loadProjectFolders(folder.projectId)
  const assets = await db.operatingAsset.findMany({
    where: { projectId: folder.projectId, folderId: folder.id, deletedAt: null },
    select: {
      id: true,
      refCode: true,
      displayName: true,
      kind: true,
      sizeBytes: true,
      objectKey: true,
      status: true,
      filedAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  })
  return {
    folderId: folder.id,
    indexing: resolveIndexingPolicy({ folder, ancestors: ancestorsFromPath(folder, rows) }),
    assets,
  }
}
