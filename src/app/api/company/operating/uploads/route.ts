import { randomUUID } from "node:crypto"

import { NextResponse, type NextRequest } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { requireUser } from "@/lib/services/auth.service"
import { createDownloadUrl, createUploadUrl } from "@/lib/storage/presigned-url"
import { getR2BucketName } from "@/lib/storage/r2-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

/** 與工作台上傳器的限制一致；伺服器這一側才是真正的那一道。 */
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_EXTENSIONS = /\.(md|txt|csv|json|png|jpe?g|webp|pdf)$/i

/** 所有營運附件都在這個前綴底下，越權存取別的 key 才擋得住。 */
const KEY_PREFIX = "operating/"

function errorResponse(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: noStoreHeaders })
}

/**
 * 預簽網址：bytes 直接在瀏覽器與 R2 之間傳，不經過這台伺服器。
 *
 * 之前檔案是以 base64 data URL 留在記憶體裡。那不只是重整即失 —— 一旦接上持久化，
 * 整包 base64 會被 diff 當成一般欄位送上伺服器，5 MB 的圖會變成 7 MB 的 JSON。
 * 所以持久化文件庫之前必須先有這條路。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const name = typeof body?.name === "string" ? body.name : ""
    const contentType = typeof body?.contentType === "string" ? body.contentType : null
    const bytes = Number(body?.bytes)

    if (!name || !ALLOWED_EXTENSIONS.test(name)) {
      return errorResponse(400, "unsupported_type", "不支援此格式。")
    }
    if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES) {
      return errorResponse(400, "too_large", "檔案上限 5 MB。")
    }

    // key 由伺服器決定，不採用使用者送來的路徑：那是目錄穿越最常見的入口。
    const extension = name.slice(name.lastIndexOf(".")).toLowerCase()
    const objectKey = `${KEY_PREFIX}${new Date().toISOString().slice(0, 7)}/${randomUUID()}${extension}`

    const uploadUrl = await createUploadUrl(getR2BucketName(), objectKey, contentType)
    return NextResponse.json({ objectKey, uploadUrl }, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, "unauthenticated", "請先登入。")
    }
    console.error("[api/company/operating/uploads] POST failed:", error)
    return errorResponse(500, "upload_url_failed", "取得上傳網址失敗。")
  }
}

/** 下載網址短命（5 分鐘），所以是每次要看的時候才換一張，而不是存起來。 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")

    const objectKey = request.nextUrl.searchParams.get("key") ?? ""
    if (!objectKey.startsWith(KEY_PREFIX) || objectKey.includes("..")) {
      return errorResponse(400, "invalid_key", "無效的檔案位置。")
    }

    const downloadUrl = await createDownloadUrl(getR2BucketName(), objectKey)
    return NextResponse.json({ downloadUrl }, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, "unauthenticated", "請先登入。")
    }
    console.error("[api/company/operating/uploads] GET failed:", error)
    return errorResponse(500, "download_url_failed", "取得下載網址失敗。")
  }
}
