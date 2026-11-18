import "server-only"

import { NextResponse } from "next/server"

import { resolveYuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { requireUser } from "@/lib/services/auth.service"
import { OPERATING_WORKSPACE_SLUG } from "@/lib/services/operating-commands.service"
import { findOperatingWorkspaceId } from "@/lib/services/operating-store.service"

import { AiBudgetError, AiNotFoundError, AiStateError, type AiActor } from "./operating-ai.service"

/** 日誌 AI 的路由共用的入口檢查與錯誤對應。與上傳路由同一個順序：登入 → 席位 → 資料來源 → 工作區。 */

export const aiNoStore = { "Cache-Control": "private, no-store, max-age=0" }

export function aiError(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status, headers: aiNoStore })
}

export async function resolveAiActor(): Promise<AiActor | NextResponse> {
  const user = await requireUser()
  const seat = resolveYuanzhanSeat(user.email)
  if (!seat) return aiError(403, "no_seat", "這個帳號沒有營運工作台席位。")
  // 預覽模式的資料只在瀏覽器裡，伺服器這一頭沒有東西可以查
  if (readOperatingDataSource() !== "database") return aiError(403, "source_not_database", "這個環境是預覽模式，日誌 AI 需要真實資料。")
  const workspaceId = await findOperatingWorkspaceId(OPERATING_WORKSPACE_SLUG)
  if (!workspaceId) return aiError(404, "no_workspace", "找不到營運工作區。")
  return { profileId: user.id, seatKey: seat.actor, workspaceId }
}

export function isAiResponse(value: AiActor | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export function aiHandleError(scope: string, error: unknown) {
  if (error instanceof Error && error.message === "Unauthorized") return aiError(401, "unauthenticated", "請先登入。")
  if (error instanceof AiNotFoundError) return aiError(404, "not_found", error.message)
  if (error instanceof AiStateError) return aiError(409, "busy", error.message)
  if (error instanceof AiBudgetError) return aiError(429, "monthly_cap", error.message)
  console.error(`[api/company/operating/ai] ${scope} failed:`, error)
  return aiError(500, "ai_route_failed", "處理失敗，請再試一次。")
}
