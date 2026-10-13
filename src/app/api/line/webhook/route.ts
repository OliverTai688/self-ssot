import { after } from "next/server"

import { readOperatingDataSource } from "@/lib/config/operating-data-source"
import { LINE_SIGNATURE_HEADER } from "@/lib/line/line-webhook-contract"
import { processLineInbox, receiveLineWebhook } from "@/lib/services/line-identity.service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

/**
 * LINE 的 webhook（AUT-010 §2）。系統裡少數沒有登入狀態的公開入口之一。
 *
 * 這條 route 不讀 cookie、不呼叫 requireUser()。它唯一認得的身分證明是
 * `x-line-signature`：以 channel secret 對「收到的原始字串」做 HMAC。所以這裡用
 * request.text()，不用 request.json() —— parse 過再序列化就不是同一串了。
 *
 * 回應永遠是空的。簽章對不對、認不認得這個帳號、內部發生什麼事，從回應都看不出來；
 * 只有「事件落不了地」會回 500，讓 LINE 之後重送。
 *
 * 處理放在回應之後（after）：先落地、回 200，再慢慢做。處理失敗的事件留在收件匣，
 * 下一個 webhook 進來時一起重試。
 */
export async function POST(request: Request) {
  // 預覽模式的環境沒有資料庫可寫；照樣回 200，不讓 LINE 一直重送。
  if (readOperatingDataSource() !== "database") return new Response(null, { status: 200 })

  let stored = 0
  try {
    const rawBody = await request.text()
    const receipt = await receiveLineWebhook(rawBody, request.headers.get(LINE_SIGNATURE_HEADER))
    stored = receipt.stored
  } catch (error) {
    console.error("[line] webhook could not be stored:", error instanceof Error ? error.name : "unknown")
    return new Response(null, { status: 500 })
  }

  if (stored > 0) {
    after(async () => {
      try {
        await processLineInbox()
      } catch (error) {
        console.error("[line] inbox processing failed:", error instanceof Error ? error.name : "unknown")
      }
    })
  }
  return new Response(null, { status: 200 })
}
