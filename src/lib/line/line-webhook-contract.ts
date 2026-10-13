/**
 * LINE webhook 與綁定代碼的純契約（AUT-010 §2、§3）。
 *
 * 沒有資料庫、沒有網路、沒有 `server-only`：簽章比對、代碼的產生與正規化、
 * 事件落地前的去內容化，全部可以用固定向量單獨測。
 *
 * 這裡的三條規則各自對應一個不能出錯的地方：
 *   1. 簽章以「收到的原始字串」計算。先 parse 再 stringify 就不是同一串了。
 *   2. 代碼只在經過雜湊之後離開這個檔案。資料庫與收件匣裡沒有任何一處有原值。
 *   3. 事件落地前把訊息內文拿掉。S1 只需要知道「誰、什麼事件、是不是代碼」。
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

export const LINE_SIGNATURE_HEADER = "x-line-signature"
/** LINE 的 webhook 一批最多數十個事件；超過這個大小的請求不是 LINE 送的。 */
export const MAX_WEBHOOK_BYTES = 1_000_000

export const BIND_CODE_TTL_MS = 10 * 60 * 1000
export const BIND_CODE_ATTEMPTS_PER_HOUR = 5
/** 去掉 0／O／1／I：人要在手機上照著打。32 個字 × 8 碼 = 40 bit。 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_LENGTH = 8
const CODE_PREFIX = "YZ"

/**
 * 以 channel secret 對原始 body 做 HMAC-SHA256，Base64 後與標頭做常數時間比對。
 * 任一項缺少都是 false —— 沒有密鑰的環境不會「暫時放行」。
 */
export function verifyLineSignature(rawBody: string, signature: string | null | undefined, channelSecret: string | null | undefined): boolean {
  if (!channelSecret || !signature) return false
  const expected = createHmac("sha256", channelSecret).update(rawBody, "utf8").digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, "base64")
  } catch {
    return false
  }
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** 顯示給人看的樣子：`YZ-4K7Q-9MXT`。 */
export function generateBindCode(): string {
  let body = ""
  for (let i = 0; i < CODE_LENGTH; i++) body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return `${CODE_PREFIX}-${body.slice(0, 4)}-${body.slice(4)}`
}

/**
 * 人打的字 → 比對用的形狀。容許小寫、全形、空白與少打連字號；
 * 不是代碼的樣子就回 null（一般聊天訊息不該被當成一次失敗的嘗試）。
 */
export function normalizeBindCode(text: string | null | undefined): string | null {
  if (!text) return null
  const compact = text
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s\-‐-―_]/g, "")
  if (!compact.startsWith(CODE_PREFIX)) return null
  const body = compact.slice(CODE_PREFIX.length)
  if (body.length !== CODE_LENGTH) return null
  for (const ch of body) if (!CODE_ALPHABET.includes(ch)) return null
  return CODE_PREFIX + body
}

/** 以 channel secret 當金鑰的 HMAC：資料庫外洩時拿不到密鑰就無法離線窮舉 40 bit。 */
export function hashBindCode(normalized: string, channelSecret: string): string {
  return createHmac("sha256", channelSecret).update("line-bind-code:" + normalized, "utf8").digest("hex")
}

export interface LineWebhookEnvelope {
  destination?: string
  events: unknown[]
}

export function parseWebhookBody(rawBody: string): LineWebhookEnvelope | null {
  try {
    const parsed = JSON.parse(rawBody) as { destination?: unknown; events?: unknown }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.events)) return null
    return { destination: typeof parsed.destination === "string" ? parsed.destination : undefined, events: parsed.events }
  } catch {
    return null
  }
}

export interface SanitizedLineEvent {
  webhookEventId: string
  type: string
  sourceType: "user" | "group" | "room" | null
  lineUserId: string | null
  groupId: string | null
  occurredAt: Date
  isRedelivery: boolean
  /** 落地的內容：沒有訊息內文、沒有代碼原值 */
  payload: {
    replyToken?: string
    message?: { id?: string; type?: string; codeHash?: string }
  }
}

const str = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 256 ? v : null)

/**
 * 事件 → 可以落地的形狀。
 *
 * 一對一聊天室裡長得像代碼的文字，在這裡就換成雜湊；其他文字整段丟掉。
 * 群組裡的文字不看內容：代碼出現在群組一律無效（AUT-010 §3），
 * 而未認領的群組不保存任何內文（§4）。
 */
export function sanitizeLineEvent(event: unknown, channelSecret: string): SanitizedLineEvent | null {
  if (!event || typeof event !== "object") return null
  const e = event as Record<string, unknown>
  const webhookEventId = str(e.webhookEventId)
  const type = str(e.type)
  if (!webhookEventId || !type) return null

  const source = (e.source && typeof e.source === "object" ? e.source : {}) as Record<string, unknown>
  const rawSourceType = str(source.type)
  const sourceType = rawSourceType === "user" || rawSourceType === "group" || rawSourceType === "room" ? rawSourceType : null
  const delivery = (e.deliveryContext && typeof e.deliveryContext === "object" ? e.deliveryContext : {}) as Record<string, unknown>
  const timestamp = typeof e.timestamp === "number" && Number.isFinite(e.timestamp) ? e.timestamp : Date.now()

  const payload: SanitizedLineEvent["payload"] = {}
  const replyToken = str(e.replyToken)
  if (replyToken) payload.replyToken = replyToken

  if (type === "message" && e.message && typeof e.message === "object") {
    const m = e.message as Record<string, unknown>
    payload.message = { id: str(m.id) ?? undefined, type: str(m.type) ?? undefined }
    if (sourceType === "user" && m.type === "text") {
      const code = normalizeBindCode(typeof m.text === "string" ? m.text : null)
      if (code) payload.message.codeHash = hashBindCode(code, channelSecret)
    }
  }

  return {
    webhookEventId,
    type,
    sourceType,
    lineUserId: str(source.userId),
    groupId: str(source.groupId) ?? str(source.roomId),
    occurredAt: new Date(timestamp),
    isRedelivery: delivery.isRedelivery === true,
    payload,
  }
}

/** bot 會說的話只有這幾句，全部是固定文字（AUT-010 §5）。 */
export const LINE_TEXT = {
  codeAccepted: "已收到代碼。請回到圓展工作台按「是我」完成連結。",
  codeInvalid: "這組代碼無效或已過期。請回到圓展工作台重新產生。",
  codeLimited: "嘗試次數過多，請一小時後再試。",
  codeConflict: "這個 LINE 帳號已經連結到另一位成員，或你的席位已經連結了別的帳號。請先在圓展工作台解除連結。",
  linked: "已連結圓展工作台。",
  testPush: "圓展工作台測試推播：收到這一則，代表推播正常。",
} as const
