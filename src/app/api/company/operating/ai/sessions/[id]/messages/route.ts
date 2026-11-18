import { after, NextResponse, type NextRequest } from "next/server"

import {
  executeTurn,
  listMessages,
  prepareTurn,
  sanitizeTurnInput,
} from "@/lib/services/operating-ai.service"
import { aiError, aiHandleError, aiNoStore, isAiResponse, resolveAiActor } from "@/lib/services/operating-ai-route"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
// 多次工具呼叫可能超過 60 秒（RES-037 §6.3）。部署前確認 Vercel 方案的上限。
export const maxDuration = 300

type Ctx = { params: Promise<{ id: string }> }

/** 讀一個對話的全部訊息。最後一則若還是 streaming，畫面會輪詢這條直到它結束。 */
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    return NextResponse.json(await listMessages(actor, id), { headers: aiNoStore })
  } catch (error) {
    return aiHandleError("GET messages", error)
  }
}

/**
 * 送出一則，回傳 SSE（text/event-stream）：
 *   meta   { user, assistantId }      使用者訊息已存、assistant 佔位已建
 *   step   { tool, label, hits }      每次工具呼叫
 *   delta  { text }                   答案的字（引用標記尚未驗證）
 *   reset  {}                         上一段是工具前的過場話，清掉重來
 *   done   { message }                最終訊息（引用已驗證）
 *
 * 回答本身掛在 after() 上：畫面關掉、切到背景、網路斷了，伺服器都會跑完並存檔，
 * 畫面回來時用 GET 讀到完整答案（RES-037 §6.4）。
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const actor = await resolveAiActor()
    if (isAiResponse(actor)) return actor
    const { id } = await ctx.params
    const input = sanitizeTurnInput(await request.json().catch(() => null))
    if (!input) return aiError(400, "bad_request", "問題不能是空的。")

    const prepared = await prepareTurn(actor, id, input)
    const encoder = new TextEncoder()
    let send: (event: string, data: unknown) => void = () => {}
    let close: () => void = () => {}

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let open = true
        send = (event, data) => {
          if (!open) return
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
          } catch {
            open = false // 畫面已經斷線；回答照樣在背景跑完
          }
        }
        close = () => {
          if (!open) return
          open = false
          try { controller.close() } catch { /* 已關閉 */ }
        }
        // Safari 收到 1KB 之前不會開始畫串流（Next.js 16 streaming 指南），先墊一段註解行
        controller.enqueue(encoder.encode(`: ${" ".repeat(2048)}\n\n`))
        send("meta", { user: prepared.user, assistantId: prepared.assistantId })
      },
      cancel() {
        send = () => {}
      },
    })

    const work = executeTurn(actor, prepared, input, (event) => {
      if (event.type === "delta") send("delta", { text: event.text })
      else if (event.type === "step") send("step", event.step)
      else send("reset", {})
    }).then((message) => {
      send("done", { message })
      close()
    })
    after(() => work)

    return new Response(stream, {
      headers: {
        ...aiNoStore,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "private, no-store, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return aiHandleError("POST messages", error)
  }
}
