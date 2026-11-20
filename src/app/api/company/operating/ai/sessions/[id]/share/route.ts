import { NextResponse, type NextRequest } from "next/server"

import { setShared, sharePreview } from "@/lib/services/operating-ai.service"
import { aiError, aiHandleError, aiNoStore, isAiResponse, resolveAiActor } from "@/lib/services/operating-ai-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

/** 分享前的清單：這個對話用過、同事原本看不到的資料（RES-038 §4）。只有建立者能看。 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    return NextResponse.json(await sharePreview(actor, id), { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("GET share", error)
  }
}

/** { shared: true, confirm: true } 分享；{ shared: false } 取消分享。只有建立者能做。 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    const body = (await request.json().catch(() => null)) as { shared?: unknown; confirm?: unknown } | null
    if (!body || typeof body.shared !== "boolean") return aiError(400, "bad_request", "格式不對。")
    const session = await setShared(actor, id, body.shared, body.confirm === true)
    return NextResponse.json({ session }, { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("POST share", error)
  }
}
