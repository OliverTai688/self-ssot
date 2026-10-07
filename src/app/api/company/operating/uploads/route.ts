import { NextResponse, type NextRequest } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import {
  AssetForbiddenError,
  AssetNotFoundError,
  AssetStateError,
  createPendingAsset,
  failAsset,
  finalizeAsset,
  reopenAssetUpload,
  resolveDownloadGrant,
} from "@/lib/services/operating-assets.service"
import {
  OPERATING_WORKSPACE_SLUG,
} from "@/lib/services/operating-commands.service"
import { findOperatingWorkspaceId } from "@/lib/services/operating-store.service"
import { createDownloadUrl, createUploadUrl } from "@/lib/storage/presigned-url"
import {
  classifyAsset,
  resolveAssetContentType,
  type AssetOrigin,
} from "@/lib/ui-data/yuanzhan/operating-assets"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

const ORIGINS: AssetOrigin[] = ["journal", "library", "cashflow"]

function errorResponse(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: noStoreHeaders })
}

type Actor = {
  seatKeys: string[]
  authorKey: string
  isOwnerSeat: boolean
  workspaceId: string
}

/**
 * 三個動詞共用的入口檢查：登入 → 席位 → 資料來源 → 工作區。
 *
 * 工作區在這裡才解析，不是從前端送來的：它是授權的範圍本身，
 * 讓呼叫端指定等於讓呼叫端自己決定要看哪一個租戶的資料。
 */
async function resolveActor(): Promise<Actor | NextResponse> {
  const user = await requireUser()
  const seat = resolveYuanzhanSeat(user.email)
  if (!seat) return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")
  if (readOperatingDataSource() !== "database") {
    return errorResponse(403, "source_not_database", "這個環境是預覽模式，檔案不會上傳。")
  }
  const workspaceId = await findOperatingWorkspaceId(OPERATING_WORKSPACE_SLUG)
  if (!workspaceId) return errorResponse(404, "no_workspace", "找不到營運工作區。")

  return {
    seatKeys: [seat.actor],
    authorKey: seat.actor,
    isOwnerSeat: seat.actor === "yz",
    workspaceId,
  }
}

function isResponse(value: Actor | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

function handleError(scope: string, error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return errorResponse(401, "unauthenticated", "請先登入。")
  }
  if (error instanceof AssetForbiddenError) return errorResponse(403, "forbidden", error.message)
  if (error instanceof AssetNotFoundError) return errorResponse(404, "not_found", error.message)
  if (error instanceof AssetStateError) return errorResponse(409, "bad_state", error.message)
  console.error("[api/company/operating/uploads] " + scope + " failed:", error)
  return errorResponse(500, scope + "_failed", "操作失敗。")
}

/**
 * 預簽網址：bytes 直接在瀏覽器與 R2 之間傳，不經過這台伺服器。
 *
 * 之前檔案是以 base64 data URL 留在記憶體裡。那不只是重整即失 —— 一旦接上持久化，
 * 整包 base64 會被 diff 當成一般欄位送上伺服器，5 MB 的圖會變成 7 MB 的 JSON。
 *
 * 這一版多做一件事：**先建 operating_assets 那一列，再發網址**。
 * 檔案因此有自己的 id 與參考碼，能被 @ 引用、進得了物件索引；
 * 而且預簽出去的每一個 key 都有一列指得到，不會在 bucket 裡變成算不出來的孤兒。
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    // 重試：不建新列，沿用原本那一列的參考碼與 key，只重新發一張上傳網址。
    const retryOf = typeof body?.retryOf === "string" ? body.retryOf : ""
    if (retryOf) {
      const asset = await reopenAssetUpload({
        workspaceId: actor.workspaceId,
        assetId: retryOf,
        seatKeys: actor.seatKeys,
      })
      const retryType = resolveAssetContentType({
        name: asset.displayName,
        mimeType: typeof body?.contentType === "string" ? body.contentType : asset.mimeType,
      })
      return NextResponse.json(
        {
          objectKey: asset.objectKey,
          uploadUrl: await createUploadUrl(asset.bucket, asset.objectKey, retryType),
          assetId: asset.id,
          refCode: asset.refCode,
          kind: asset.kind,
          contentType: retryType,
          multipart: false,
        },
        { headers: noStoreHeaders }
      )
    }

    const name = typeof body?.name === "string" ? body.name : ""
    const bytes = Number(body?.bytes)
    // 瀏覽器沒給型別（手機錄的 .mov、部分系統的 .m4a）就依副檔名補；
    // 補出來的值會簽進網址，所以要原樣回給前端，它 PUT 時送的必須是同一個字串。
    const contentType = resolveAssetContentType({
      name,
      mimeType: typeof body?.contentType === "string" ? body.contentType : null,
    })

    // 白名單與分級上限走共用契約，前端擋下來的理由與這裡一字不差。
    const verdict = classifyAsset({ name, bytes, mimeType: contentType })
    if (!verdict.ok) return errorResponse(400, verdict.code, verdict.error)

    const origin = ORIGINS.includes(body?.origin as AssetOrigin)
      ? (body?.origin as AssetOrigin)
      : "library"
    const space = body?.space === "personal" ? "personal" : "team"
    const bornDayRaw = typeof body?.bornDay === "string" ? body.bornDay : null
    const bornDay = bornDayRaw && /^\d{4}-\d{2}-\d{2}$/.test(bornDayRaw) ? new Date(bornDayRaw) : null

    const asset = await createPendingAsset({
      workspaceId: actor.workspaceId,
      origin,
      kind: verdict.kind,
      extension: verdict.extension,
      displayName: name,
      mimeType: contentType,
      sizeBytes: bytes,
      space,
      authorKey: actor.authorKey,
      bornDay,
      workbenchRef: typeof body?.workbenchRef === "string" ? body.workbenchRef : null,
    })

    const uploadUrl = await createUploadUrl(asset.bucket, asset.objectKey, contentType)

    return NextResponse.json(
      {
        // 既有呼叫端只讀這兩個欄位，形狀不變。
        objectKey: asset.objectKey,
        uploadUrl,
        // 以下是物件化之後才有的東西。
        assetId: asset.id,
        refCode: asset.refCode,
        kind: asset.kind,
        contentType,
        multipart: verdict.multipart,
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    return handleError("upload_url", error)
  }
}

/**
 * finalize：伺服器回頭問 R2 這個 key 到底存進去了沒、大小對不對。
 *
 * 沒有這一步，「ready」的唯一依據就是前端說它傳完了 —— 而截斷的檔案
 * 在前端看起來與成功一模一樣。
 */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const assetId = typeof body?.assetId === "string" ? body.assetId : ""
    if (!assetId) return errorResponse(400, "missing_asset_id", "缺少檔案代號。")

    // 使用者取消或前端自己就知道傳壞了：直接標 failed，不必浪費一次 HeadObject。
    if (body?.outcome === "failed") {
      await failAsset({ workspaceId: actor.workspaceId, assetId })
      return NextResponse.json({ status: "failed" }, { headers: noStoreHeaders })
    }

    const result = await finalizeAsset({
      workspaceId: actor.workspaceId,
      assetId,
      seatKeys: actor.seatKeys,
    })
    if (!result.ok) return errorResponse(422, result.code, result.error)

    return NextResponse.json(
      {
        status: result.asset.status,
        assetId: result.asset.id,
        refCode: result.asset.refCode,
        sizeBytes: result.asset.sizeBytes,
      },
      { headers: noStoreHeaders }
    )
  } catch (error) {
    return handleError("finalize", error)
  }
}

/**
 * 下載網址短命（5 分鐘），所以是每次要看的時候才換一張，而不是存起來。
 *
 * 這一版在簽之前先查資料庫：這個 key 屬於哪一列、那一列你看不看得到。
 * 先前只檢查 key 的前綴，等於「有席位就能下載任何檔案」，
 * 包含別人 space:'personal' 的私人文件。
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await resolveActor()
    if (isResponse(actor)) return actor

    const objectKey = request.nextUrl.searchParams.get("key") ?? ""
    const grant = await resolveDownloadGrant({
      workspaceId: actor.workspaceId,
      objectKey,
      seatKeys: actor.seatKeys,
      isOwnerSeat: actor.isOwnerSeat,
    })

    // download=1：簽成附件下載。檔名取資產列上的那一個，不收前端送來的。
    const asAttachment = request.nextUrl.searchParams.get("download") === "1"
    const downloadUrl = await createDownloadUrl(
      grant.bucket,
      grant.objectKey,
      asAttachment ? { downloadName: grant.displayName ?? grant.objectKey.split("/").pop() ?? "file" } : undefined
    )
    return NextResponse.json({ downloadUrl }, { headers: noStoreHeaders })
  } catch (error) {
    return handleError("download_url", error)
  }
}
