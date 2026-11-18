import { NextResponse, type NextRequest } from "next/server"

import { deleteSession, updateSession } from "@/lib/services/operating-ai.service"
import { aiError, aiHandleError, aiNoStore, isAiResponse, resolveAiActor } from "@/lib/services/operating-ai-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

/** 改名、釘選、封存。只接受這三個欄位，其他一律忽略。 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    const body = (await request.json().catch(() => null)) as { title?: unknown; pinned?: unknown; archived?: unknown } | null
    if (!body) return aiError(400, "bad_request", "格式不對。")
    const session = await updateSession(actor, id, {
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.pinned === "boolean" ? { pinned: body.pinned } : {}),
      ...(typeof body.archived === "boolean" ? { archived: body.archived } : {}),
    })
    return NextResponse.json({ session }, { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("PATCH session", error)
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    await deleteSession(actor, id)
    return NextResponse.json({ ok: true }, { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("DELETE session", error)
  }
}
