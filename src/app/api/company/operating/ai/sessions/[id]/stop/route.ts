import { NextResponse, type NextRequest } from "next/server"

import { stopTurn } from "@/lib/services/operating-ai.service"
import { aiHandleError, aiNoStore, isAiResponse, resolveAiActor } from "@/lib/services/operating-ai-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** 停止這個對話正在跑的那一則。沒有在跑的就什麼都不做。 */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    await stopTurn(actor, id)
    return NextResponse.json({ ok: true }, { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("POST stop", error)
  }
}
