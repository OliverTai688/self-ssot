/**
 * 請求（`operating_requests`）那一列的合併規則。
 *
 * 一筆請求是雙方共用的一列：問的人、答的人，以及同一個人的另一台裝置，都會把整列寫回來。
 * 前端送的是「我這一頁手上的那一份」，不是「我改了哪幾個欄位」，所以只要有一個分頁拿著
 * 舊副本寫了一次，整列覆蓋就會把別人已經存進去的回覆蓋掉 —— firstReplyAt 跟著變回 null，
 * 過了 24 小時又變成逾期。2026-10-21 回報的「回覆會消失，隔天又跳出還沒回覆」就是這樣來的。
 *
 * 所以這裡不覆蓋，而是合併，而且每個欄位只往「有發生過」的方向走：
 *
 * - replies：兩邊的聯集（以 `作者@時刻` 認同一則），照時間排。唯一會讓一則回覆消失的是
 *   明確撤回 —— 撤回時前端在 `withdrawn` 記下那一則；撤回標記也是聯集，舊副本復活不了它。
 * - firstReplyAt：合併後答的人最早那一則回覆（含「收到，晚點處理」、決策選項）的時刻；
 *   沒有回覆但已結案就用記下來的值；一則都不剩且未結案，才回到待回覆（撤回唯一一則回覆）。
 * - seenAt：取較早的（讀過就是讀過）。
 * - choice／resolvedAt／deferReason／deferredAt：一旦有值就保留。畫面上沒有「改決定」
 *   「取消結案」「取消延後」這些操作，所以既有值被清掉只可能是舊副本。
 * - nudges：聯集（以時刻認同一筆）。
 * - pinged：每個瀏覽器自己的提醒紀錄，不是共用資料；前端已不再寫它，這裡原樣保留舊值。
 */

export type RequestReply = {
  w?: unknown
  at?: unknown
  [key: string]: unknown
}

export type RequestPayload = {
  options: unknown[]
  replies: RequestReply[]
  nudges: Record<string, unknown>[]
  pinged: Record<string, unknown>
  via: unknown
  seenAt: number | null
  firstReplyAt: number | null
  resolvedAt: number | null
  choice: unknown
  deferReason: unknown
  deferredAt: number | null
  withdrawn: string[]
}

type Loose = Record<string, unknown> | null | undefined

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const has = (v: unknown) => v !== null && v !== undefined && v !== ''
const earliest = (...values: unknown[]): number | null => {
  const list = values.map(num).filter((v): v is number => v !== null)
  return list.length ? Math.min(...list) : null
}

/** 一則回覆的身分：誰、在哪一刻。前端撤回時記的就是這個字串。 */
export function replyKey(reply: RequestReply): string {
  return `${String(reply?.w ?? '')}@${String(reply?.at ?? '')}`
}

export function mergeRequestPayload(
  existing: Loose,
  incoming: Loose,
  people: { from: string | null | undefined; to: string | null | undefined },
): RequestPayload {
  const prev = (existing ?? {}) as Record<string, unknown>
  const next = (incoming ?? {}) as Record<string, unknown>

  const withdrawn = [...new Set([...arr<string>(prev.withdrawn), ...arr<string>(next.withdrawn)].map(String))]
  const gone = new Set(withdrawn)

  const byKey = new Map<string, RequestReply>()
  // 新的一份後放，同一則以新的內容為準（例如引用物件後補上去的 refs）。
  for (const reply of [...arr<RequestReply>(prev.replies), ...arr<RequestReply>(next.replies)]) {
    if (!reply || typeof reply !== 'object') continue
    const key = replyKey(reply)
    if (gone.has(key)) continue
    byKey.set(key, reply)
  }
  const replies = [...byKey.values()].sort((a, b) => (num(a.at) ?? 0) - (num(b.at) ?? 0))

  const nudgeByAt = new Map<string, Record<string, unknown>>()
  for (const nudge of [...arr<Record<string, unknown>>(prev.nudges), ...arr<Record<string, unknown>>(next.nudges)]) {
    if (!nudge || typeof nudge !== 'object') continue
    nudgeByAt.set(String(nudge.at ?? JSON.stringify(nudge)), nudge)
  }
  const nudges = [...nudgeByAt.values()].sort((a, b) => (num(a.at) ?? 0) - (num(b.at) ?? 0))

  const resolvedAt = earliest(prev.resolvedAt, next.resolvedAt)
  const to = people.to ?? ''
  const answered = replies.filter((r) => String(r.w ?? '') === to)
  // 有答的人的回覆，就以「最早那一則」為準 —— 那就是 firstReplyAt 的定義，也不會被撤回過的
  // 那一則的舊時刻帶偏。沒有回覆但已結案（答的人直接按「標記已解決」）才用記下來的值。
  const firstReplyAt = answered.length
    ? earliest(...answered.map((r) => r.at)) ?? earliest(prev.firstReplyAt, next.firstReplyAt)
    : resolvedAt
      ? earliest(prev.firstReplyAt, next.firstReplyAt) ?? resolvedAt
      : null

  const nextOptions = arr(next.options)
  return {
    options: nextOptions.length ? nextOptions : arr(prev.options),
    replies,
    nudges,
    pinged: (prev.pinged && typeof prev.pinged === 'object' ? prev.pinged : next.pinged && typeof next.pinged === 'object' ? next.pinged : {}) as Record<string, unknown>,
    via: has(next.via) ? next.via : has(prev.via) ? prev.via : null,
    seenAt: earliest(prev.seenAt, next.seenAt),
    firstReplyAt,
    resolvedAt,
    choice: has(prev.choice) ? prev.choice : has(next.choice) ? next.choice : null,
    deferReason: has(prev.deferReason) ? prev.deferReason : has(next.deferReason) ? next.deferReason : null,
    deferredAt: earliest(prev.deferredAt, next.deferredAt),
    withdrawn,
  }
}
