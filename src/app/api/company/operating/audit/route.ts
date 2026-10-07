import { NextResponse, type NextRequest } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import { listOperatingAuditLog } from "@/lib/services/operating-audit-log.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

type ErrorCode =
  | "unauthenticated"
  | "no_seat"
  | "owner_only"
  | "source_not_database"
  | "invalid_input"
  | "audit_route_failed"

function errorResponse(status: number, code: ErrorCode, error: string) {
  return NextResponse.json({ error, code }, { status, headers: noStoreHeaders })
}

/**
 * 稽核軌跡的讀取 BFF：工作台稽核抽屜的資料來源。
 *
 * 只有 GET。這條路沒有寫入、沒有刪除，之後也不該長出來 —— 命令紀錄只由
 * `/api/company/operating/commands` 在套用成功後新增。
 *
 * 僅負責人（契約 §18）。前端的 can('audit') 只是不顯示入口，擋人的是這裡：
 * 員工直接打這個網址一樣拿不到。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) {
      return errorResponse(403, "no_seat", "這個帳號沒有營運工作台席位。")
    }
    if (seat.role !== "owner") {
      return errorResponse(403, "owner_only", "稽核軌跡僅負責人可檢視（契約 §18）。")
    }
    if (readOperatingDataSource() !== "database") {
      return errorResponse(403, "source_not_database", "這個環境的營運工作台是預覽模式，沒有稽核紀錄。")
    }

    const params = request.nextUrl.searchParams
    const beforeRaw = params.get("before")
    const before = beforeRaw ? new Date(beforeRaw) : null
    if (before && Number.isNaN(before.getTime())) {
      return errorResponse(400, "invalid_input", "游標格式不正確。")
    }

    const result = await listOperatingAuditLog({
      before,
      includeAutosave: params.get("autosave") === "1",
    })
    return NextResponse.json(result, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse(401, "unauthenticated", "請先登入。")
    }
    console.error("[api/company/operating/audit] GET failed:", error)
    return errorResponse(500, "audit_route_failed", "稽核紀錄讀取失敗。")
  }
}
