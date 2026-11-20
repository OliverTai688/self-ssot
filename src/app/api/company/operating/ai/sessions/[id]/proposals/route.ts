import { NextResponse, type NextRequest } from "next/server"

import { settleProposal } from "@/lib/services/operating-ai.service"
import { aiError, aiHandleError, aiNoStore, isAiResponse, resolveAiActor } from "@/lib/services/operating-ai-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * 記下提案的結果（RES-038 §5）：{ messageId, proposalId, status: accepted|dismissed, rid? }。
 * 物件本身由畫面走既有的議題／任務建立流程寫入；這裡只記「建立了哪一個、誰按的」。
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const status = body?.status === "accepted" || body?.status === "dismissed" ? body.status : null
    if (!body || typeof body.messageId !== "string" || typeof body.proposalId !== "string" || !status) {
      return aiError(400, "bad_request", "格式不對。")
    }
    const message = await settleProposal(actor, id, body.messageId, body.proposalId, {
      status,
      ...(typeof body.rid === "string" ? { rid: body.rid } : {}),
    })
    return NextResponse.json({ message }, { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("POST proposals", error)
  }
}
