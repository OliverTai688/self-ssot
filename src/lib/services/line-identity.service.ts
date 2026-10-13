import "server-only"

import { createHash, randomUUID } from "node:crypto"

import type { YuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { getYuanzhanSeats } from "@/lib/auth/yuanzhan-actor"
import { db } from "@/lib/db"
import { createLineApi, readLineConfig, type LineApi } from "@/lib/line/line-api"
import {
  BIND_CODE_ATTEMPTS_PER_HOUR,
  BIND_CODE_TTL_MS,
  LINE_TEXT,
  MAX_WEBHOOK_BYTES,
  generateBindCode,
  hashBindCode,
  normalizeBindCode,
  parseWebhookBody,
  sanitizeLineEvent,
  verifyLineSignature,
} from "@/lib/line/line-webhook-contract"
import type { AuthenticatedUser } from "@/lib/services/auth.service"
import { DEFAULT_ORG_KEY } from "@/lib/services/operating-settings.service"

/**
 * LINE webhook 收件匣與成員綁定（AUT-010 §2、§3 · LINESIG-S1）。
 *
 * 這個檔案有兩種呼叫者，信任程度完全不同：
 *
 *   receiveLineWebhook / processLineInbox   來自公開的 webhook。沒有登入身分，
 *     唯一的憑證是簽章。簽章不過就什麼都不寫；簽章過了也只把事件「去內容後」落地。
 *
 *   其餘（代碼、確認、解除、測試推播、狀態）  來自已登入、有席位的成員。
 *     授權在 route handler；這裡一律只動呼叫者自己的那一列（seat.actor），
 *     沒有任何參數能指定「替誰操作」。
 *
 * 兩邊的交會點只有綁定代碼：webhook 收到正確的代碼，只能把綁定推進到 pending；
 * 要成立，必須是發起代碼的那個人在網站上看著 LINE 的名字與頭像按下確認。
 *
 * S1 不碰群組：bot 被拉進群就立刻離開，群組訊息一律不看。
 */

const EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const CODE_RETENTION_MS = 24 * 60 * 60 * 1000
const CLAIM_TIMEOUT_MS = 2 * 60 * 1000
const MAX_ATTEMPTS = 5
const HOUR_MS = 60 * 60 * 1000

export class LineActionError extends Error {
  constructor(
    public readonly code:
      | "line_not_configured"
      | "shared_seat"
      | "already_linked"
      | "nothing_pending"
      | "not_linked"
      | "push_disabled"
      | "push_failed",
    message: string,
  ) {
    super(message)
  }
}

function apiFor(override?: LineApi): { api: LineApi; channelSecret: string } | null {
  const config = readLineConfig()
  if (!config) return null
  return { api: override ?? createLineApi(config.accessToken), channelSecret: config.channelSecret }
}

async function findWorkspaceId(): Promise<string | null> {
  const row = await db.workspace.findUnique({ where: { slug: DEFAULT_ORG_KEY }, select: { id: true } })
  return row ? row.id : null
}

/** 與 operating-commands 相同的建立方式：第一個寫入的人成為建立者。 */
async function ensureWorkspaceId(user: AuthenticatedUser): Promise<string> {
  const existing = await findWorkspaceId()
  if (existing) return existing
  const created = await db.workspace.create({
    data: { type: "TEAM", name: "圓展", slug: DEFAULT_ORG_KEY, createdByProfileId: user.id },
    select: { id: true },
  })
  return created.id
}

async function writeAudit(workspaceId: string, user: AuthenticatedUser, seat: YuanzhanSeat, op: "create" | "delete", detail: string) {
  await db.operatingCommandLog.create({
    data: {
      workspaceId,
      clientRefHash: createHash("sha256").update(randomUUID()).digest("hex"),
      actorProfileId: user.id,
      actorKey: seat.actor,
      op,
      entity: "LINE 連結",
      label: seat.actor,
      detail,
      collections: ["lineIdentities"],
      changeCount: 1,
      riskLevel: "low",
    },
  })
}

/* ------------------------------------------------------------------ */
/* 公開 webhook                                                        */
/* ------------------------------------------------------------------ */

export type WebhookReceipt = { accepted: boolean; stored: number }

/**
 * 驗簽、去重、落地。回傳後 route handler 立刻回 200；處理在回應之後。
 *
 * 簽章不過：不寫任何列，只留一行不含內容的紀錄。LINE 後台的「Verify」會送一個
 * 簽章正確、events 為空的請求 —— 那一筆記成一列 `verify`，設定頁才知道 webhook 通了。
 */
export async function receiveLineWebhook(rawBody: string, signature: string | null): Promise<WebhookReceipt> {
  const config = readLineConfig()
  if (!config) return { accepted: false, stored: 0 }
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) return { accepted: false, stored: 0 }
  if (!verifyLineSignature(rawBody, signature, config.channelSecret)) {
    console.warn("[line] webhook signature rejected")
    return { accepted: false, stored: 0 }
  }
  const envelope = parseWebhookBody(rawBody)
  if (!envelope) return { accepted: false, stored: 0 }

  if (envelope.events.length === 0) {
    await db.lineWebhookEvent.create({
      data: { webhookEventId: `verify-${randomUUID()}`, eventType: "verify", occurredAt: new Date(), outcome: "verified", processedAt: new Date() },
    })
    return { accepted: true, stored: 0 }
  }

  const rows = envelope.events
    .map((event) => sanitizeLineEvent(event, config.channelSecret))
    .filter((event): event is NonNullable<typeof event> => event !== null)
    .map((event) => ({
      webhookEventId: event.webhookEventId,
      eventType: event.type,
      sourceType: event.sourceType,
      lineUserId: event.lineUserId,
      groupId: event.groupId,
      occurredAt: event.occurredAt,
      isRedelivery: event.isRedelivery,
      payload: event.payload,
    }))
  if (!rows.length) return { accepted: true, stored: 0 }
  // 重送與重複投遞撞到唯一鍵就略過：同一個事件只會有一列。
  const result = await db.lineWebhookEvent.createMany({ data: rows, skipDuplicates: true })
  return { accepted: true, stored: result.count }
}

type InboxRow = {
  id: string
  eventType: string
  sourceType: string | null
  lineUserId: string | null
  groupId: string | null
  payload: unknown
}

/**
 * 處理收件匣裡還沒處理的事件。可以重複呼叫、可以同時被兩個請求呼叫：
 * 每一列先認領（claimedAt）才處理，認領不到就跳過。
 */
export async function processLineInbox(options: { api?: LineApi; limit?: number } = {}): Promise<{ processed: number }> {
  const line = apiFor(options.api)
  if (!line) return { processed: 0 }
  const now = new Date()
  const stale = new Date(now.getTime() - CLAIM_TIMEOUT_MS)
  const pending = await db.lineWebhookEvent.findMany({
    where: { processedAt: null, OR: [{ claimedAt: null }, { claimedAt: { lt: stale } }] },
    orderBy: { receivedAt: "asc" },
    take: options.limit ?? 20,
    select: { id: true, eventType: true, sourceType: true, lineUserId: true, groupId: true, payload: true, attempts: true },
  })

  let processed = 0
  for (const row of pending) {
    const claim = await db.lineWebhookEvent.updateMany({
      where: { id: row.id, processedAt: null, OR: [{ claimedAt: null }, { claimedAt: { lt: stale } }] },
      data: { claimedAt: new Date(), attempts: { increment: 1 } },
    })
    if (claim.count !== 1) continue

    let outcome: string
    try {
      outcome = await handleEvent(row, line.api)
    } catch (error) {
      console.warn("[line] event handling failed:", error instanceof Error ? error.name : "unknown")
      if (row.attempts + 1 < MAX_ATTEMPTS) {
        // 留在收件匣，下一次再試。
        await db.lineWebhookEvent.update({ where: { id: row.id }, data: { claimedAt: null } })
        continue
      }
      outcome = "failed"
    }
    // 處理完就把 replyToken 拿掉：它只有一分鐘的用途。
    const payload = { ...((row.payload ?? {}) as Record<string, unknown>) }
    delete payload.replyToken
    await db.lineWebhookEvent.update({ where: { id: row.id }, data: { outcome, processedAt: new Date(), payload: payload as object } })
    processed++
  }

  // 保留期限（AUT-010 §8）。順手清，不另開排程。
  await db.lineWebhookEvent.deleteMany({ where: { processedAt: { lt: new Date(now.getTime() - EVENT_RETENTION_MS) } } })
  const codeCutoff = new Date(now.getTime() - CODE_RETENTION_MS)
  await db.lineBindCode.deleteMany({ where: { OR: [{ usedAt: { lt: codeCutoff } }, { expiresAt: { lt: codeCutoff } }] } })
  return { processed }
}

async function handleEvent(row: InboxRow, api: LineApi): Promise<string> {
  const payload = (row.payload ?? {}) as { replyToken?: string; message?: { type?: string; codeHash?: string } }

  // S1 不碰群組：被拉進群就離開；群組裡的任何訊息（包含代碼）都不看。
  if (row.sourceType === "group" || row.sourceType === "room") {
    if (row.eventType === "join" && row.groupId) {
      await api.leaveGroup(row.sourceType, row.groupId)
      return "group_left"
    }
    return "group_ignored"
  }
  if (row.sourceType !== "user" || !row.lineUserId) return "ignored"

  if (row.eventType === "unfollow") {
    await db.lineIdentity.updateMany({ where: { lineUserId: row.lineUserId }, data: { pushEnabled: false } })
    return "unfollowed"
  }
  if (row.eventType === "follow") {
    await db.lineIdentity.updateMany({ where: { lineUserId: row.lineUserId }, data: { pushEnabled: true } })
    return "followed"
  }
  if (row.eventType !== "message" || !payload.message?.codeHash) return "ignored"

  const reply = async (text: string) => {
    if (payload.replyToken) await api.replyText(payload.replyToken, text)
  }
  const now = new Date()

  const recentFailures = await db.lineWebhookEvent.count({
    where: { lineUserId: row.lineUserId, outcome: "code_bad", receivedAt: { gt: new Date(now.getTime() - HOUR_MS) } },
  })
  if (recentFailures >= BIND_CODE_ATTEMPTS_PER_HOUR) {
    await reply(LINE_TEXT.codeLimited)
    return "code_limited"
  }

  const code = await db.lineBindCode.findUnique({ where: { codeHash: payload.message.codeHash } })
  if (!code) {
    await reply(LINE_TEXT.codeInvalid)
    return "code_bad"
  }
  // 單次使用：只有把 usedAt 從 NULL 改成現在的那一個請求算數。
  const redeemed = await db.lineBindCode.updateMany({
    where: { id: code.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  })
  if (redeemed.count !== 1) {
    await reply(LINE_TEXT.codeInvalid)
    return "code_bad"
  }

  const current = await db.lineIdentity.findUnique({ where: { workspaceId_actorKey: { workspaceId: code.workspaceId, actorKey: code.actorKey } } })
  const taken = await db.lineIdentity.findUnique({ where: { workspaceId_lineUserId: { workspaceId: code.workspaceId, lineUserId: row.lineUserId } } })
  // 改綁要先解除；別人的帳號（包含別人等待確認中的）不能搶。
  if (current?.status === "linked" || (taken && taken.actorKey !== code.actorKey && isLive(taken, now))) {
    await reply(LINE_TEXT.codeConflict)
    return "code_conflict"
  }
  if (taken && taken.actorKey !== code.actorKey) {
    // 別的席位留下的過期 pending：讓出這個 LINE 帳號。
    await db.lineIdentity.update({ where: { id: taken.id }, data: { lineUserId: null, status: "unlinked", pendingExpiresAt: null } })
  }

  const profile = await api.getProfile(row.lineUserId)
  const data = {
    profileId: code.profileId,
    lineUserId: row.lineUserId,
    displayName: profile?.displayName ?? null,
    pictureUrl: profile?.pictureUrl ?? null,
    status: "pending",
    pushEnabled: true,
    pendingExpiresAt: new Date(now.getTime() + BIND_CODE_TTL_MS),
    linkedAt: null,
    unlinkedAt: null,
  }
  await db.lineIdentity.upsert({
    where: { workspaceId_actorKey: { workspaceId: code.workspaceId, actorKey: code.actorKey } },
    create: { workspaceId: code.workspaceId, actorKey: code.actorKey, ...data },
    update: data,
  })
  await reply(LINE_TEXT.codeAccepted)
  return "code_ok"
}

function isLive(identity: { status: string; pendingExpiresAt: Date | null }, now: Date): boolean {
  if (identity.status === "linked") return true
  return identity.status === "pending" && !!identity.pendingExpiresAt && identity.pendingExpiresAt > now
}

/* ------------------------------------------------------------------ */
/* 已登入的成員                                                        */
/* ------------------------------------------------------------------ */

export type LineMemberState = "none" | "code" | "pending" | "linked"

export type LineStatusResponse = {
  /** 兩個環境變數都在 */
  configured: boolean
  /** 最近一次簽章通過的請求（含 LINE 後台的 Verify） */
  lastWebhookAt: string | null
  bot: { basicId: string; displayName: string } | null
  /** 共用帳號不能綁定：它不代表任何一個人 */
  canBind: boolean
  me: {
    state: LineMemberState
    codeExpiresAt: string | null
    pendingExpiresAt: string | null
    displayName: string | null
    pictureUrl: string | null
    pushEnabled: boolean
    linkedAt: string | null
  }
  /** 只有負責人看得到其他席位；而且只有「連了沒」，沒有 LINE userId */
  team: Array<{ actor: string; state: "linked" | "none"; pushEnabled: boolean }>
  quota: { used: number; limit: number | null } | null
}

let botInfoCache: { at: number; value: LineStatusResponse["bot"] } | null = null

export async function getLineStatus(seat: YuanzhanSeat, options: { api?: LineApi; withQuota?: boolean } = {}): Promise<LineStatusResponse> {
  const line = apiFor(options.api)
  const now = new Date()
  const empty: LineStatusResponse["me"] = { state: "none", codeExpiresAt: null, pendingExpiresAt: null, displayName: null, pictureUrl: null, pushEnabled: false, linkedAt: null }
  const base: LineStatusResponse = { configured: !!line, lastWebhookAt: null, bot: null, canBind: !seat.canSwitchActor, me: empty, team: [], quota: null }
  if (!line) return base

  const workspaceId = await findWorkspaceId()
  const [lastEvent, identities, code] = await Promise.all([
    db.lineWebhookEvent.findFirst({ orderBy: { receivedAt: "desc" }, select: { receivedAt: true } }),
    workspaceId ? db.lineIdentity.findMany({ where: { workspaceId } }) : Promise.resolve([]),
    workspaceId
      ? db.lineBindCode.findFirst({ where: { workspaceId, actorKey: seat.actor, usedAt: null, expiresAt: { gt: now } }, orderBy: { createdAt: "desc" }, select: { expiresAt: true } })
      : Promise.resolve(null),
  ])
  base.lastWebhookAt = lastEvent ? lastEvent.receivedAt.toISOString() : null

  const mine = identities.find((row) => row.actorKey === seat.actor)
  if (mine && mine.status === "linked") {
    base.me = { state: "linked", codeExpiresAt: null, pendingExpiresAt: null, displayName: mine.displayName, pictureUrl: mine.pictureUrl, pushEnabled: mine.pushEnabled, linkedAt: mine.linkedAt?.toISOString() ?? null }
  } else if (mine && isLive(mine, now)) {
    base.me = { state: "pending", codeExpiresAt: null, pendingExpiresAt: mine.pendingExpiresAt?.toISOString() ?? null, displayName: mine.displayName, pictureUrl: mine.pictureUrl, pushEnabled: mine.pushEnabled, linkedAt: null }
  } else if (code) {
    base.me = { ...empty, state: "code", codeExpiresAt: code.expiresAt.toISOString() }
  }

  if (seat.role === "owner") {
    const actors = [...new Set(getYuanzhanSeats().map((s) => s.actor))]
    base.team = actors.map((actor) => {
      const row = identities.find((r) => r.actorKey === actor && r.status === "linked")
      return { actor, state: row ? ("linked" as const) : ("none" as const), pushEnabled: !!row?.pushEnabled }
    })
  }

  if (!botInfoCache || now.getTime() - botInfoCache.at > 10 * 60 * 1000 || options.api) {
    const info = await line.api.getBotInfo()
    botInfoCache = { at: now.getTime(), value: info ? { basicId: info.basicId, displayName: info.displayName } : null }
  }
  base.bot = botInfoCache.value
  if (options.withQuota) base.quota = await line.api.getQuota()
  return base
}

function requireBindable(seat: YuanzhanSeat) {
  if (seat.canSwitchActor) throw new LineActionError("shared_seat", "共用帳號不能連結 LINE。請用自己的帳號登入。")
}

/** 產生一次性代碼。原值只在這一次回應裡出現，資料庫只有雜湊。 */
export async function createBindCode(seat: YuanzhanSeat, user: AuthenticatedUser): Promise<{ code: string; expiresAt: string }> {
  const config = readLineConfig()
  if (!config) throw new LineActionError("line_not_configured", "LINE 官方帳號尚未開通。")
  requireBindable(seat)
  const workspaceId = await ensureWorkspaceId(user)
  const current = await db.lineIdentity.findUnique({ where: { workspaceId_actorKey: { workspaceId, actorKey: seat.actor } } })
  if (current?.status === "linked") throw new LineActionError("already_linked", "已經連結了一個 LINE 帳號。要換帳號請先解除連結。")

  const now = new Date()
  // 同一個人同時只有一組有效的代碼：產生新的就讓舊的失效。
  await db.lineBindCode.updateMany({ where: { workspaceId, actorKey: seat.actor, usedAt: null, expiresAt: { gt: now } }, data: { expiresAt: now } })
  const code = generateBindCode()
  const expiresAt = new Date(now.getTime() + BIND_CODE_TTL_MS)
  await db.lineBindCode.create({
    data: { workspaceId, actorKey: seat.actor, profileId: user.id, codeHash: hashBindCode(normalizeBindCode(code) as string, config.channelSecret), expiresAt },
  })
  return { code, expiresAt: expiresAt.toISOString() }
}

/** 「是我」。只有這一步會讓綁定成立。 */
export async function confirmBinding(seat: YuanzhanSeat, user: AuthenticatedUser, options: { api?: LineApi } = {}): Promise<{ notified: boolean }> {
  const line = apiFor(options.api)
  if (!line) throw new LineActionError("line_not_configured", "LINE 官方帳號尚未開通。")
  requireBindable(seat)
  const workspaceId = await findWorkspaceId()
  const now = new Date()
  const updated = workspaceId
    ? await db.lineIdentity.updateMany({
        where: { workspaceId, actorKey: seat.actor, status: "pending", pendingExpiresAt: { gt: now }, lineUserId: { not: null } },
        data: { status: "linked", linkedAt: now, pendingExpiresAt: null, profileId: user.id },
      })
    : { count: 0 }
  if (!workspaceId || updated.count !== 1) throw new LineActionError("nothing_pending", "沒有等待確認的 LINE 帳號，或已經超過 10 分鐘。請重新產生代碼。")

  await writeAudit(workspaceId, user, seat, "create", "成員 LINE 帳號連結成立")
  const row = await db.lineIdentity.findUnique({ where: { workspaceId_actorKey: { workspaceId, actorKey: seat.actor } }, select: { lineUserId: true } })
  const notified = row?.lineUserId ? await line.api.pushText(row.lineUserId, LINE_TEXT.linked) : false
  return { notified }
}

/** 「不是我」：把等待確認的那個 LINE 帳號放掉。 */
export async function rejectBinding(seat: YuanzhanSeat): Promise<void> {
  const workspaceId = await findWorkspaceId()
  if (!workspaceId) return
  await db.lineIdentity.updateMany({
    where: { workspaceId, actorKey: seat.actor, status: "pending" },
    data: { status: "unlinked", lineUserId: null, displayName: null, pictureUrl: null, pendingExpiresAt: null },
  })
}

export async function unlinkLine(seat: YuanzhanSeat, user: AuthenticatedUser): Promise<void> {
  const workspaceId = await findWorkspaceId()
  const updated = workspaceId
    ? await db.lineIdentity.updateMany({
        where: { workspaceId, actorKey: seat.actor, status: "linked" },
        data: { status: "unlinked", lineUserId: null, displayName: null, pictureUrl: null, unlinkedAt: new Date() },
      })
    : { count: 0 }
  if (!workspaceId || updated.count !== 1) throw new LineActionError("not_linked", "目前沒有連結 LINE 帳號。")
  await writeAudit(workspaceId, user, seat, "delete", "成員 LINE 帳號連結解除")
}

export async function sendTestPush(seat: YuanzhanSeat, options: { api?: LineApi } = {}): Promise<void> {
  const line = apiFor(options.api)
  if (!line) throw new LineActionError("line_not_configured", "LINE 官方帳號尚未開通。")
  const mine = (await listPushRecipients({ includeBlocked: true })).find((r) => r.actorKey === seat.actor)
  if (!mine) throw new LineActionError("not_linked", "先連結 LINE 帳號，才能收到推播。")
  if (!mine.pushEnabled) throw new LineActionError("push_disabled", "你封鎖了官方帳號，推播送不到。在 LINE 解除封鎖後再試。")
  if (!(await line.api.pushText(mine.lineUserId, LINE_TEXT.testPush))) throw new LineActionError("push_failed", "LINE 沒有收下這則推播。可能是本月額度用完，或官方帳號被封鎖。")
}

/**
 * 推播名單（AUT-010 §5）：已連結、而且沒有封鎖官方帳號的成員。
 * 等待確認中的、已解除的、外部的人都不在裡面 —— 這是唯一產生收件人的地方。
 */
export async function listPushRecipients(options: { includeBlocked?: boolean } = {}): Promise<Array<{ actorKey: string; lineUserId: string; pushEnabled: boolean }>> {
  const workspaceId = await findWorkspaceId()
  if (!workspaceId) return []
  const rows = await db.lineIdentity.findMany({
    where: { workspaceId, status: "linked", lineUserId: { not: null }, ...(options.includeBlocked ? {} : { pushEnabled: true }) },
    select: { actorKey: true, lineUserId: true, pushEnabled: true },
  })
  return rows.map((row) => ({ actorKey: row.actorKey, lineUserId: row.lineUserId as string, pushEnabled: row.pushEnabled }))
}
