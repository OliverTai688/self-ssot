/**
 * LINE Messaging API 的最小用戶端（AUT-010 §5）。
 *
 * 只包系統實際會做的六件事。沒有「傳任意訊息到任意對象」這種通用函式 ——
 * 對外輸出的種類是授權邊界的一部分，少一個入口就少一條繞過去的路。
 *
 * 做成介面是為了測試能換掉它：整合測試不該真的打 LINE。
 */
import { randomUUID } from "node:crypto"

export interface LineProfile {
  displayName: string
  pictureUrl: string | null
}

export interface LineBotInfo {
  basicId: string
  displayName: string
}

export interface LineQuota {
  /** null = 方案沒有上限 */
  limit: number | null
  used: number
}

export interface LineApi {
  replyText(replyToken: string, text: string): Promise<boolean>
  pushText(to: string, text: string): Promise<boolean>
  getProfile(userId: string): Promise<LineProfile | null>
  getBotInfo(): Promise<LineBotInfo | null>
  getQuota(): Promise<LineQuota | null>
  leaveGroup(kind: "group" | "room", id: string): Promise<boolean>
}

const BASE = "https://api.line.me/v2/bot"
const TIMEOUT_MS = 8000

export function readLineConfig(): { channelSecret: string; accessToken: string } | null {
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim()
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()
  return channelSecret && accessToken ? { channelSecret, accessToken } : null
}

/**
 * 失敗一律回 false／null，不丟例外、不把 LINE 的錯誤內容往外帶：
 * 呼叫端只需要知道「有沒有成功」，而錯誤訊息裡可能有 userId。
 */
export function createLineApi(accessToken: string): LineApi {
  const call = async (path: string, init?: { body?: unknown; retryKey?: boolean }) => {
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
      if (init?.body !== undefined) headers["Content-Type"] = "application/json"
      if (init?.retryKey) headers["X-Line-Retry-Key"] = randomUUID()
      const res = await fetch(BASE + path, {
        method: init?.body !== undefined ? "POST" : "GET",
        headers,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      })
      if (!res.ok) {
        console.warn(`[line] ${path.replace(/\/[UCR][0-9a-f]{32}/g, "/:id")} → ${res.status}`)
        return null
      }
      return (await res.json().catch(() => ({}))) as Record<string, unknown>
    } catch {
      console.warn(`[line] ${path.replace(/\/[UCR][0-9a-f]{32}/g, "/:id")} → network error`)
      return null
    }
  }
  const text = (value: string) => [{ type: "text", text: value }]

  return {
    async replyText(replyToken, value) {
      return (await call("/message/reply", { body: { replyToken, messages: text(value) } })) !== null
    },
    async pushText(to, value) {
      return (await call("/message/push", { body: { to, messages: text(value) }, retryKey: true })) !== null
    },
    async getProfile(userId) {
      const data = await call(`/profile/${encodeURIComponent(userId)}`)
      if (!data || typeof data.displayName !== "string") return null
      return { displayName: data.displayName.slice(0, 80), pictureUrl: typeof data.pictureUrl === "string" ? data.pictureUrl : null }
    },
    async getBotInfo() {
      const data = await call("/info")
      if (!data || typeof data.basicId !== "string") return null
      return { basicId: data.basicId, displayName: typeof data.displayName === "string" ? data.displayName : "" }
    },
    async getQuota() {
      const [quota, usage] = await Promise.all([call("/message/quota"), call("/message/quota/consumption")])
      if (!quota || !usage || typeof usage.totalUsage !== "number") return null
      return { limit: quota.type === "limited" && typeof quota.value === "number" ? quota.value : null, used: usage.totalUsage }
    },
    async leaveGroup(kind, id) {
      return (await call(`/${kind}/${encodeURIComponent(id)}/leave`, { body: {} })) !== null
    },
  }
}
