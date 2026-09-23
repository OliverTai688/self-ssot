import { NextResponse } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import {
  OPERATING_WORKSPACE_SLUG,
  readOperatingVersion,
} from "@/lib/services/operating-commands.service"
import { findOperatingWorkspaceId, loadOperatingStore } from "@/lib/services/operating-store.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" }

/**
 * 重新取得整份 store，給跨裝置合併用（ARC-042 §7.5）。
 *
 * 初次載入走 Server Component，不需要這條；這條是「另一個席位改了東西之後」
 * 在不重整頁面的情況下把新內容接回來。合併規則在前端：伺服器不知道哪些編輯還沒送出。
 */
export async function GET() {
  try {
    const user = await requireUser()
    const seat = resolveYuanzhanSeat(user.email)
    if (!seat) {
      return NextResponse.json({ error: "這個帳號沒有營運工作台席位。", code: "no_seat" }, { status: 403, headers: noStoreHeaders })
    }
    if (readOperatingDataSource() !== "database") {
      return NextResponse.json({ error: "這個環境是預覽模式。", code: "source_not_database" }, { status: 403, headers: noStoreHeaders })
    }

    const workspaceId = await findOperatingWorkspaceId(OPERATING_WORKSPACE_SLUG)
    const [store, version] = await Promise.all([
      workspaceId ? loadOperatingStore(workspaceId, user.id) : Promise.resolve({}),
      readOperatingVersion(),
    ])

    return NextResponse.json({ version, store }, { headers: noStoreHeaders })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "請先登入。", code: "unauthenticated" }, { status: 401, headers: noStoreHeaders })
    }
    console.error("[api/company/operating/store] GET failed:", error)
    return NextResponse.json({ error: "讀取失敗。", code: "store_route_failed" }, { status: 500, headers: noStoreHeaders })
  }
}
