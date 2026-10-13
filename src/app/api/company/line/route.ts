import { NextResponse, type NextRequest } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import {
  LineActionError,
  confirmBinding,
  createBindCode,
  getLineStatus,
  rejectBinding,
  sendTestPush,
  unlinkLine,
} from "@/lib/services/line-identity.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

function errorResponse(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: noStoreHeaders })
}

async function resolveSeat() {
  const user = await requireUser()
  const seat = resolveYuanzhanSeat(user.email)
  if (!seat) return { error: errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。") }
  if (readOperatingDataSource() !== "database") {
    return { error: errorResponse(403, "source_not_database", "這個環境的營運工作台是預覽模式，沒有 LINE 連結。") }
  }
  return { user, seat }
}

/**
 * 成員自己的 LINE 連結（AUT-010 §3）：訊號頁「來源與推播」的資料來源。
 *
 * 每一個動作都只作用在呼叫者自己的席位上。請求裡沒有任何欄位能指定「替誰」——
 * 負責人看得到誰連了，但不能代替別人綁定或解除。
 * 回應不含 LINE userId、channel secret 或 access token。
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveSeat()
    if ("error" in ctx) return ctx.error
    const status = await getLineStatus(ctx.seat, { withQuota: request.nextUrl.searchParams.get("quota") === "1" })
    return NextResponse.json(status, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return errorResponse(401, "unauthenticated", "請先登入。")
    console.error("[line] status route failed:", error instanceof Error ? error.name : "unknown")
    return errorResponse(500, "line_route_failed", "讀不到 LINE 連結狀態。")
  }
}

const ACTIONS = ["code", "confirm", "reject", "unlink", "test"] as const
type Action = (typeof ACTIONS)[number]

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveSeat()
    if ("error" in ctx) return ctx.error
    const body = (await request.json().catch(() => null)) as { action?: unknown } | null
    const action = body && typeof body.action === "string" && (ACTIONS as readonly string[]).includes(body.action) ? (body.action as Action) : null
    if (!action) return errorResponse(400, "invalid_input", "不認得的動作。")

    let extra: Record<string, unknown> = {}
    if (action === "code") extra = await createBindCode(ctx.seat, ctx.user)
    else if (action === "confirm") extra = await confirmBinding(ctx.seat, ctx.user)
    else if (action === "reject") await rejectBinding(ctx.seat)
    else if (action === "unlink") await unlinkLine(ctx.seat, ctx.user)
    else await sendTestPush(ctx.seat)

    const status = await getLineStatus(ctx.seat, { withQuota: action === "test" })
    return NextResponse.json({ ...extra, status }, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") return errorResponse(401, "unauthenticated", "請先登入。")
    if (error instanceof LineActionError) return errorResponse(409, error.code, error.message)
    console.error("[line] action route failed:", error instanceof Error ? error.name : "unknown")
    return errorResponse(500, "line_route_failed", "這個動作沒有完成。")
  }
}
