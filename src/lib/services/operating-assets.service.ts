import "server-only"

import { randomUUID } from "node:crypto"

import { db } from "@/lib/db"
import { headObject } from "@/lib/storage/object-head"
import { getR2BucketName } from "@/lib/storage/r2-client"
import {
  buildAssetObjectKey,
  canSeatReadAsset,
  canTransitionAsset,
  formatAssetRefCode,
  isWellFormedAssetKey,
  parseAssetRefSeq,
  type AssetKind,
  type AssetOrigin,
} from "@/lib/ui-data/yuanzhan/operating-assets"

export class AssetNotFoundError extends Error {
  constructor(message = "找不到這個檔案。") {
    super(message)
    this.name = "AssetNotFoundError"
  }
}

export class AssetForbiddenError extends Error {
  constructor(message = "沒有權限存取這個檔案。") {
    super(message)
    this.name = "AssetForbiddenError"
  }
}

export class AssetStateError extends Error {
  constructor(message = "這個檔案的狀態不允許這個動作。") {
    super(message)
    this.name = "AssetStateError"
  }
}

/* ------------------------------------------------------------------ */
/* 參考碼                                                              */
/* ------------------------------------------------------------------ */

/**
 * 續號，不從 0 重來。
 *
 * 只取 refCode 這一欄在記憶體裡算最大值，而不是開一張計數器表：兩人份的量級下
 * 這是最少的新機制。列數成長到需要它的時候，這裡換成一張 sequence 表，
 * 呼叫端不用改 —— 這是把它獨立成一個函式的理由。
 *
 * 併發仍可能讓兩個請求算出同一個號；靠 ref_code 的 UNIQUE 擋下來，
 * 呼叫端重試。這與前端計數器的差別在於：撞號會失敗並重試，而不是靜靜寫進兩列同號資料。
 */
async function nextRefSeq(workspaceId: string): Promise<number> {
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

/* ------------------------------------------------------------------ */
/* 建列                                                                */
/* ------------------------------------------------------------------ */

export type CreatePendingAssetInput = {
  workspaceId: string
  origin: AssetOrigin
  kind: AssetKind
  extension: string
  displayName: string
  mimeType: string | null
  sizeBytes: number
  space: "team" | "personal"
  authorKey: string | null
  bornDay?: Date | null
  workbenchRef?: string | null
}

/**
 * 列先建，網址後給。
 *
 * 順序是刻意的：如果先發預簽網址再建列，使用者在兩者之間關掉分頁，R2 就會多一份
 * 沒有任何一列指得到的 bytes —— 那是查不清也算不出來的儲存費。
 * 反過來，先建列最壞的情況是多一列 uploading，孤兒清理掃得到它。
 */
export async function createPendingAsset(input: CreatePendingAssetInput) {
  const bucket = getR2BucketName()
  const now = new Date()

  // 撞號就重算一次號碼再試；三次還撞代表不是併發問題，讓它往上丟。
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const seq = await nextRefSeq(input.workspaceId)
    const refCode = formatAssetRefCode({ origin: input.origin, seq, now })
    const objectKey = buildAssetObjectKey({
      workspaceId: input.workspaceId,
      extension: input.extension,
      uuid: randomUUID(),
      now,
    })

    try {
      return await db.operatingAsset.create({
        data: {
          workspaceId: input.workspaceId,
          refCode,
          kind: input.kind,
          displayName: input.displayName,
          bucket,
          objectKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          status: "uploading",
          space: input.space,
          authorKey: input.authorKey,
          origin: input.origin,
          bornDay: input.bornDay ?? null,
          bornAt: now,
          // 工作台那一側用 refCode 當 id，所以 workbenchRef 就是它 ——
          // 一份檔案不該有兩個身分，withRef() 也才撈得到這一列。
          workbenchRef: input.workbenchRef ?? refCode,
        },
      })
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue
      throw error
    }
  }
  throw new Error("無法指派參考碼，請重試。")
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002"
}

/* ------------------------------------------------------------------ */
/* finalize                                                           */
/* ------------------------------------------------------------------ */

export type FinalizeResult =
  | { ok: true; asset: Awaited<ReturnType<typeof createPendingAsset>> }
  | { ok: false; code: "missing" | "size_mismatch"; error: string }

/**
 * 只有 HeadObject 對得起來，狀態才會變 ready。
 *
 * 大小對不上就是 failed：截斷的檔案比沒有檔案更糟 —— 後者看得出來，前者會被當成好的。
 */
export async function finalizeAsset(params: {
  workspaceId: string
  assetId: string
  seatKeys: string[]
}): Promise<FinalizeResult> {
  const asset = await db.operatingAsset.findFirst({
    where: { id: params.assetId, workspaceId: params.workspaceId, deletedAt: null },
  })
  if (!asset) throw new AssetNotFoundError()
  if (!canSeatReadAsset(asset, { workspaceId: params.workspaceId, seatKeys: params.seatKeys })) {
    throw new AssetForbiddenError()
  }
  if (asset.status === "ready") {
    // 重送 finalize 不是錯誤：網路重試會造成這件事。回報現狀即可。
    return { ok: true, asset }
  }
  if (!canTransitionAsset("uploading", "ready") || asset.status !== "uploading") {
    throw new AssetStateError()
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
      // 副檔名是前端送的，可以偽造；R2 回報的 ContentType 至少是實際存進去的那一個。
      mimeType: head.contentType ?? asset.mimeType,
    },
  })
  return { ok: true, asset: updated }
}

/**
 * 重試：同一列、同一個參考碼、同一個 object key，只是重新開放上傳。
 *
 * 參考碼不能換 —— 日誌那一行存的就是它，換了那張卡片就指向一筆不存在的檔案（RES-018）。
 * key 也不換：單次 PUT 是整份取代，傳到一半中斷不會留下半份 bytes；
 * 換 key 反而會在「其實傳上去了、只是 finalize 沒回來」的情況下留下一份沒有列指得到的檔案。
 */
export async function reopenAssetUpload(params: {
  workspaceId: string
  assetId: string
  seatKeys: string[]
}) {
  const asset = await db.operatingAsset.findFirst({
    where: { id: params.assetId, workspaceId: params.workspaceId, deletedAt: null },
  })
  if (!asset) throw new AssetNotFoundError()
  if (!canSeatReadAsset(asset, { workspaceId: params.workspaceId, seatKeys: params.seatKeys })) {
    throw new AssetForbiddenError()
  }
  // 還停在 uploading 也收：分頁被關掉、連 failed 都來不及回報時就是這個狀態。
  if (asset.status === "ready") throw new AssetStateError("這個檔案已經上傳完成。")
  if (asset.status === "failed" && !canTransitionAsset("failed", "uploading")) throw new AssetStateError()

  return db.operatingAsset.update({ where: { id: asset.id }, data: { status: "uploading" } })
}

export async function failAsset(params: { workspaceId: string; assetId: string }) {
  await db.operatingAsset.updateMany({
    where: { id: params.assetId, workspaceId: params.workspaceId, status: "uploading" },
    data: { status: "failed" },
  })
}

/* ------------------------------------------------------------------ */
/* 下載授權                                                            */
/* ------------------------------------------------------------------ */

export type DownloadGrant = {
  bucket: string
  objectKey: string
  /** 資產列上的顯示名稱。舊檔案（文件庫版本、憑證、收件匣）沒有那一列，所以沒有。 */
  displayName?: string
}

/**
 * 「這個 key 你讀不讀得到」的唯一判定點。
 *
 * 在這之前，這條路只檢查 key 開頭是不是 `operating/` —— 任何有席位的人拿到 key
 * 就能換到下載網址，包含別人 space:'personal' 的私人文件。
 *
 * 新檔案走 operating_assets 那一列，規則與文件庫讀取一致（team 全員可見、
 * personal 只有作者）。舊檔案（文件庫版本、憑證、收件匣）沒有那一列，
 * 所以改為「找得到引用它的那一列，而且那一列你看得到」才放行 ——
 * 找不到任何引用的 key 一律拒絕，而不是像以前那樣放行。
 */
export async function resolveDownloadGrant(params: {
  workspaceId: string
  objectKey: string
  seatKeys: string[]
  isOwnerSeat: boolean
}): Promise<DownloadGrant> {
  const { workspaceId, objectKey, seatKeys } = params
  if (!isWellFormedAssetKey(objectKey)) throw new AssetNotFoundError("無效的檔案位置。")

  // 新資產表的查詢是新路徑的入口，但它失敗不該把底下三條舊路徑一起帶走。
  //
  // 2026-09-28 正式站就是這樣壞的：operating_assets 的 migration 還沒套用
  // （deploy 流程當時不跑 migration），這一行直接丟 P2021，
  // 於是每一張既有憑證 —— 文件庫、交易附件、收件匣 —— 全部讀不到，
  // 而那三條相容路徑本來就是為了讓它們繼續讀得到才寫的。
  //
  // 只吞基礎設施層的錯誤：查得到列但沒有權限，仍然是拒絕，不會往下改用團隊層級的舊路徑。
  let asset: Awaited<ReturnType<typeof db.operatingAsset.findFirst>> = null
  try {
    asset = await db.operatingAsset.findFirst({
      where: { workspaceId, objectKey, deletedAt: null },
    })
  } catch (error) {
    console.error("[operating-assets] 資產表查詢失敗，改走既有檔案的相容路徑", error)
  }
  if (asset) {
    if (!canSeatReadAsset(asset, { workspaceId, seatKeys })) throw new AssetForbiddenError()
    return { bucket: asset.bucket, objectKey: asset.objectKey, displayName: asset.displayName }
  }

  const bucket = getR2BucketName()

  // 舊路徑一：文件庫版本。可見性條件與 loadOperatingStore() 讀文件庫時同一條。
  const libraryFiles = await db.operatingLibraryFile.findMany({
    where: { workspaceId, OR: [{ space: "team" }, { authorKey: { in: seatKeys } }] },
    select: { versions: true },
  })
  if (libraryFiles.some((file) => jsonHasObjectKey(file.versions, objectKey))) {
    return { bucket, objectKey }
  }

  // 舊路徑二：金流憑證。交易是團隊層級的資料，沒有 personal 維度。
  const txns = await db.operatingTransaction.findMany({
    where: { workspaceId },
    select: { attachments: true },
  })
  if (txns.some((txn) => jsonHasObjectKey(txn.attachments, objectKey))) {
    return { bucket, objectKey }
  }

  // 舊路徑三：收件匣。成員只讀得到自己交的，負責人讀全部（與 store 的讀取規則一致）。
  const intake = await db.operatingIntakeItem.findMany({
    where: {
      workspaceId,
      ...(params.isOwnerSeat ? {} : { actorKey: { in: seatKeys } }),
    },
    select: { file: true },
  })
  if (intake.some((item) => jsonHasObjectKey(item.file, objectKey))) {
    return { bucket, objectKey }
  }

  throw new AssetNotFoundError()
}

/** JSON 欄位可能是物件也可能是陣列，兩種都要看；型別不對就是沒有。 */
function jsonHasObjectKey(value: unknown, objectKey: string): boolean {
  if (!value) return false
  const entries = Array.isArray(value) ? value : [value]
  return entries.some(
    (entry) =>
      entry != null &&
      typeof entry === "object" &&
      (entry as { objectKey?: unknown }).objectKey === objectKey
  )
}

/* ------------------------------------------------------------------ */
/* 孤兒                                                                */
/* ------------------------------------------------------------------ */

export async function listStaleUploadingAssets(params: { workspaceId?: string; before: Date }) {
  return db.operatingAsset.findMany({
    where: {
      status: "uploading",
      updatedAt: { lt: params.before },
      ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
    },
    orderBy: { updatedAt: "asc" },
  })
}
