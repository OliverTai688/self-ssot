import { NextResponse } from "next/server"

import { createSession, listSessions } from "@/lib/services/operating-ai.service"
import { aiHandleError, aiNoStore, isAiResponse, resolveAiActor } from "@/lib/services/operating-ai-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** 我的對話清單（RES-037 §6.1）。只列自己的。 */
export async function GET() {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    return NextResponse.json({ sessions: await listSessions(actor) }, { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("GET sessions", error)
  }
}

/** 開一個新對話。標題等第一則訊息送出時自動取。 */
export async function POST() {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    return NextResponse.json({ session: await createSession(actor) }, { status: 201, headers: aiNoStore })
  } catch (error) {
    return aiHandleError("POST sessions", error)
  }
}
