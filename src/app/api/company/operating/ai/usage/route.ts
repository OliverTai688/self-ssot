import { NextResponse } from "next/server"

import { usageSummary } from "@/lib/services/operating-ai.service"
import { aiHandleError, aiNoStore, isAiResponse, resolveAiActor } from "@/lib/services/operating-ai-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** 本月日誌 AI 用量（RES-037 D5）：全公司總額與上限、自己的用量；負責人另外看得到各席位。 */
export async function GET() {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    return NextResponse.json(await usageSummary(actor), { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("GET usage", error)
  }
}
