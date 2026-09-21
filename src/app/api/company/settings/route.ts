import { NextResponse, type NextRequest } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { requireUser } from "@/lib/services/auth.service"
import {
  SettingsAuthorizationError,
  SettingsUnavailableError,
  SettingsValidationError,
  loadOperatingSettings,
  operatingSettingsCatalog,
  updateOperatingSetting,
} from "@/lib/services/operating-settings.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

type ErrorCode =
  | "unauthenticated"
  | "no_seat"
  | "not_owner"
  | "invalid_input"
  | "settings_unavailable"
  | "settings_route_failed"

function errorResponse(status: number, code: ErrorCode, error: string, nextAction?: string) {
  return NextResponse.json({ error, code, nextAction }, { status, headers: noStoreHeaders })
}

/** 營運工作台的設定 BFF。工作台跑在 shadow DOM 裡，用得到的是網址而不是 server action。 */
export async function GET() {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) {
      return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")
    }

    const settings = await loadOperatingSettings(user, seat)
    return NextResponse.json(
      { settings, catalog: operatingSettingsCatalog(), seat: { actor: seat.actor, role: seat.role, email: seat.email } },
      { headers: noStoreHeaders },
    )
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, "unauthenticated", "請先登入。")
    }
    console.error("[api/company/settings] GET failed:", error)
    return errorResponse(500, "settings_route_failed", "設定讀取失敗。")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) {
      return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, "invalid_input", "請傳 JSON：{ key, value }。")
    }

    const payload = body as { key?: unknown; value?: unknown }
    if (typeof payload?.key !== "string") {
      return errorResponse(400, "invalid_input", "缺少設定 key。")
    }

    const settings = await updateOperatingSetting(user, seat, payload.key, payload.value)
    return NextResponse.json({ settings }, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof SettingsAuthorizationError) {
      return errorResponse(403, "not_owner", error.message, "組織設定請用負責人帳號登入後修改。")
    }
    if (error instanceof SettingsValidationError) {
      return errorResponse(400, "invalid_input", error.message)
    }
    if (error instanceof SettingsUnavailableError) {
      return errorResponse(503, "settings_unavailable", error.message, "在專案根目錄執行 pnpm db:migrate。")
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, "unauthenticated", "請先登入。")
    }
    console.error("[api/company/settings] PATCH failed:", error)
    return errorResponse(500, "settings_route_failed", "設定沒有存起來。")
  }
}
