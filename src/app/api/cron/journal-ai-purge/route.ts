import { timingSafeEqual } from "node:crypto"

import { NextResponse, type NextRequest } from "next/server"

import { purgeDeletedSessions } from "@/lib/services/operating-ai.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * 每天清掉軟刪除超過 30 天的日誌 AI 對話（RES-037 D6）。由 Vercel Cron 呼叫（vercel.json）。
 *
 * Vercel 會帶 `Authorization: Bearer <CRON_SECRET>`。沒有設定 CRON_SECRET 的環境一律拒絕 ——
 * 寧可不清，也不要讓任何人打一下網址就能觸發刪除。
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 })
  const given = Buffer.from(request.headers.get("authorization") ?? "")
  const want = Buffer.from(`Bearer ${secret}`)
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  try {
    const result = await purgeDeletedSessions({ apply: true })
    console.log("[cron/journal-ai-purge]", JSON.stringify(result))
    return NextResponse.json(result)
  } catch (error) {
    console.error("[cron/journal-ai-purge] failed", error)
    return NextResponse.json({ error: "purge_failed" }, { status: 500 })
  }
}
