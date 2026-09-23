import "server-only"

import { createHash } from "node:crypto"

import type { Prisma } from "@prisma/client"

import { getYuanzhanSeats, type YuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { db } from "@/lib/db"
import type { AuthenticatedUser } from "@/lib/services/auth.service"
import { DEFAULT_ORG_KEY } from "@/lib/services/operating-settings.service"
import { removeSpine, syncOccasion, syncSession } from "@/lib/services/operating-spine.service"
import {
  HIGH_RISK_COLLECTIONS,
  WRITE_ENABLED_COLLECTIONS,
  isPersistedCollection,
  type CommandBatchResponse,
  type CommandRejection,
  type OperatingCommand,
  type PersistedCollection,
  type RowChange,
} from "@/lib/ui-data/yuanzhan/operating-commands"

/** 版本存在既有的 organization_settings，M1 因此不需要 migration。 */
const VERSION_SETTING_KEY = "operating.version"
const WORKSPACE_SLUG = DEFAULT_ORG_KEY

export class OperatingWriteDisabledError extends Error {}
export class OperatingConflictError extends Error {
  constructor(readonly version: number) {
    super("operating version conflict")
  }
}

/* ------------------------------------------------------------------ */
/* id 對應                                                             */
/* ------------------------------------------------------------------ */

const UUID_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"

/**
 * v5 的業務 id（`OCC-1`、`R2`）不是 UUID，而 Prisma 的主鍵是 `@db.Uuid`。
 *
 * 用 UUIDv5 從業務 id 推導主鍵，而不是另外加一個 external_ref 欄位：同樣的業務 id
 * 永遠算出同一個 UUID，所以重送、兩個裝置同時建立、或是重放佇列都會落在同一列，
 * 不需要先查再寫。代價是這個對應不可逆 —— 要從 UUID 反查業務 id 得靠另一邊的資料。
 */
function deterministicUuid(...parts: string[]): string {
  const name = parts.join(":")
  const hash = createHash("sha1")
  hash.update(Buffer.from(UUID_NAMESPACE.replace(/-/g, ""), "hex"))
  hash.update(Buffer.from(name, "utf8"))
  const bytes = hash.digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function rowUuid(collection: PersistedCollection, id: string): string {
  return deterministicUuid(WORKSPACE_SLUG, collection, id)
}

/* ------------------------------------------------------------------ */
/* workspace 與席位                                                    */
/* ------------------------------------------------------------------ */

/**
 * 只在「要寫入時」解析／建立 workspace。
 *
 * 讀取路徑不呼叫這個函式：ARC-040 的「渲染空日誌不自動建立資料」在這裡的對應是
 * 打開頁面不應該在資料庫留下任何東西。
 */
async function ensureOperatingWorkspace(user: AuthenticatedUser): Promise<string> {
  const existing = await db.workspace.findUnique({ where: { slug: WORKSPACE_SLUG }, select: { id: true } })
  if (existing) return existing.id

  const created = await db.workspace.create({
    data: { type: "TEAM", name: "圓展", slug: WORKSPACE_SLUG, createdByProfileId: user.id },
    select: { id: true },
  })
  return created.id
}

/** v5 用 'yz'／'lily' 指人；資料庫用 Profile uuid。對不到的人就丟掉，不編造。 */
async function buildActorMap(): Promise<Map<string, string>> {
  const seats = getYuanzhanSeats()
  const profiles = await db.profile.findMany({
    where: { email: { in: seats.map((seat) => seat.email) } },
    select: { id: true, email: true },
  })
  const byEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), p.id]))

  const map = new Map<string, string>()
  for (const seat of seats) {
    const profileId = byEmail.get(seat.email.toLowerCase())
    if (profileId) map.set(seat.actor, profileId)
  }
  return map
}

function toProfileIds(actorIds: unknown, actors: Map<string, string>): string[] {
  if (!Array.isArray(actorIds)) return []
  return actorIds
    .map((actor) => (typeof actor === "string" ? actors.get(actor) : undefined))
    .filter((id): id is string => Boolean(id))
}

/* ------------------------------------------------------------------ */
/* 版本                                                                */
/* ------------------------------------------------------------------ */

async function readVersion(): Promise<number> {
  const row = await db.organizationSetting.findUnique({
    where: { orgKey_key: { orgKey: DEFAULT_ORG_KEY, key: VERSION_SETTING_KEY } },
    select: { value: true },
  })
  return typeof row?.value === "number" ? row.value : 0
}

async function bumpVersion(profileId: string, next: number): Promise<void> {
  await db.organizationSetting.upsert({
    where: { orgKey_key: { orgKey: DEFAULT_ORG_KEY, key: VERSION_SETTING_KEY } },
    create: { orgKey: DEFAULT_ORG_KEY, key: VERSION_SETTING_KEY, value: next, updatedById: profileId },
    update: { value: next, updatedById: profileId },
  })
}

/* ------------------------------------------------------------------ */
/* 欄位轉換                                                            */
/* ------------------------------------------------------------------ */

const OCCASION_CATEGORIES = ["COMPANY_EVENT", "CLIENT_MEETING", "TRAVEL", "BIRTHDAY", "VISIT", "ADMIN"] as const
type OccasionCategory = (typeof OCCASION_CATEGORIES)[number]

const OCCASION_CATEGORY_BY_LABEL: Record<string, OccasionCategory> = {
  公司活動: "COMPANY_EVENT",
  客戶會議: "CLIENT_MEETING",
  出差: "TRAVEL",
  生日: "BIRTHDAY",
  拜訪: "VISIT",
  行政: "ADMIN",
}

function toOccasionCategory(value: unknown): OccasionCategory {
  if (typeof value !== "string") return "COMPANY_EVENT"
  const upper = value.toUpperCase() as OccasionCategory
  if ((OCCASION_CATEGORIES as readonly string[]).includes(upper)) return upper
  return OCCASION_CATEGORY_BY_LABEL[value] ?? "COMPANY_EVENT"
}

/** 天粒度欄位是 `@db.Date`；帶時間會讓「哪一天」在時區邊界上算歪。 */
function toDateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return new Date(`${value}T00:00:00.000Z`)
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

/* ------------------------------------------------------------------ */
/* 每個集合的處理器                                                     */
/* ------------------------------------------------------------------ */

type ApplyContext = { workspaceId: string; actors: Map<string, string>; profileId: string }

async function applyOccasion(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("occasions", change.id)

  if (change.op === "delete") {
    await removeSpine(db, "occasions", id)
    await db.occasion.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const onDate = toDateOnly(row.onDate)
  if (!onDate) throw new Error(`occasion ${change.id} has no usable onDate`)

  const data = {
    workspaceId: ctx.workspaceId,
    title: str(row.title) ?? "（未命名）",
    category: toOccasionCategory(row.cat),
    onDate,
    endOn: toDateOnly(row.endOn),
    place: str(row.place),
    actorIds: toProfileIds(row.actorIds, ctx.actors),
    star: row.star === true,
    prep: (Array.isArray(row.prep) ? row.prep : []) as Prisma.InputJsonValue,
    recap: str(row.recap),
    derivedFrom: str(row.derivedFrom),
    remind: str(row.remind),
  }

  await db.occasion.upsert({ where: { id }, create: { id, ...data }, update: data })
  await syncOccasion(db, id)
}

async function applyRhythm(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("rhythms", change.id)

  if (change.op === "delete") {
    await db.rhythm.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const dtstart = toDateOnly(row.dtstart)
  if (!dtstart) throw new Error(`rhythm ${change.id} has no usable dtstart`)
  if (!str(row.rrule)) throw new Error(`rhythm ${change.id} has no rrule`)

  const data = {
    workspaceId: ctx.workspaceId,
    title: str(row.title) ?? "（未命名）",
    kind: row.kind === "admin" ? ("ADMIN" as const) : ("RITUAL" as const),
    scope: row.scope === "personal" ? ("PERSONAL" as const) : ("COMPANY" as const),
    ownerIds: toProfileIds(row.ownerIds, ctx.actors),
    rrule: String(row.rrule),
    dtstart,
    until: toDateOnly(row.until),
    timeOfDay: str(row.timeOfDay),
    timezone: str(row.timezone) ?? "Asia/Taipei",
    expectMedia: Array.isArray(row.expectMedia) ? row.expectMedia.filter((m): m is string => typeof m === "string") : [],
    derivedFrom: str(row.derivedFrom),
    remind: str(row.remind),
    active: row.active !== false,
  }

  await db.rhythm.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applySession(change: RowChange, ctx: ApplyContext): Promise<void> {
  // 比對鍵是 `<rhythmId>|<occurrenceDate>`，與 Prisma 的 rhythm_sessions_occurrence_key 同義。
  const [rawRhythmId, rawDate] = change.id.split("|")
  const rhythmId = rowUuid("rhythms", rawRhythmId ?? "")
  const occurrenceDate = toDateOnly(rawDate)
  if (!occurrenceDate) throw new Error(`session ${change.id} has no usable occurrence date`)

  if (change.op === "delete") {
    const existing = await db.rhythmSession.findUnique({
      where: { rhythmId_occurrenceDate: { rhythmId, occurrenceDate } },
      select: { id: true },
    })
    if (existing) {
      await removeSpine(db, "rhythm_sessions", existing.id)
      await db.rhythmSession.delete({ where: { id: existing.id } })
    }
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const state = row.state === "skip" ? ("SKIP" as const) : row.state === "moved" ? ("MOVED" as const) : ("DONE" as const)

  const saved = await db.rhythmSession.upsert({
    where: { rhythmId_occurrenceDate: { rhythmId, occurrenceDate } },
    create: {
      rhythmId,
      occurrenceDate,
      state,
      movedTo: toDateOnly(row.movedTo),
      note: str(row.note),
      recordedById: ctx.profileId,
    },
    update: { state, movedTo: toDateOnly(row.movedTo), note: str(row.note), recordedById: ctx.profileId },
    select: { id: true },
  })

  await syncSession(db, saved.id)
}

const HANDLERS: Partial<Record<PersistedCollection, (change: RowChange, ctx: ApplyContext) => Promise<void>>> = {
  occasions: applyOccasion,
  rhythms: applyRhythm,
  sessions: applySession,
}

/* ------------------------------------------------------------------ */
/* 進入點                                                              */
/* ------------------------------------------------------------------ */

function screen(change: RowChange): CommandRejection["code"] | null {
  if (!isPersistedCollection(change.collection)) return "unknown_collection"
  if (HIGH_RISK_COLLECTIONS.includes(change.collection)) return "write_not_enabled"
  if (!WRITE_ENABLED_COLLECTIONS.includes(change.collection)) return "write_not_enabled"
  if (!HANDLERS[change.collection]) return "write_not_enabled"
  if (change.op !== "delete" && (change.after === undefined || change.after === null)) return "invalid_payload"
  return null
}

export async function applyOperatingCommands(
  user: AuthenticatedUser,
  seat: YuanzhanSeat,
  baseVersion: number,
  commands: OperatingCommand[],
): Promise<CommandBatchResponse> {
  const current = await readVersion()
  if (baseVersion !== current) throw new OperatingConflictError(current)

  const workspaceId = await ensureOperatingWorkspace(user)
  const actors = await buildActorMap()
  const ctx: ApplyContext = { workspaceId, actors, profileId: user.id }

  const applied: string[] = []
  const rejected: CommandRejection[] = []

  for (const command of commands) {
    // 冪等：同一個 clientRef 已經寫過稽核列就直接跳過，不重放它的變更。
    const seen = await db.operatingAuditEvent.findFirst({
      where: { actorRef: user.id, action: "operating.command", requestRef: command.clientRef },
      select: { id: true },
    })
    if (seen) {
      applied.push(command.clientRef)
      continue
    }

    const blocked = command.changes.map((change) => ({ change, code: screen(change) })).find((r) => r.code)
    if (blocked) {
      rejected.push({
        clientRef: command.clientRef,
        code: blocked.code!,
        message:
          blocked.code === "write_not_enabled"
            ? `「${blocked.change.collection}」尚未開放正式寫入`
            : `「${blocked.change.collection}」的變更內容無法處理`,
        collection: blocked.change.collection,
      })
      continue
    }

    try {
      for (const change of command.changes) {
        await HANDLERS[change.collection]!(change, ctx)
      }
      applied.push(command.clientRef)

      await db.operatingAuditEvent.create({
        data: {
          actorType: "human",
          actorRef: user.id,
          actorDisplay: seat.actor,
          requestRef: command.clientRef,
          moduleKey: "company.operating",
          action: "operating.command",
          targetType: command.changes[0]?.collection ?? "unknown",
          targetRef: command.changes[0]?.id ?? null,
          targetDisplay: command.label,
          result: "success",
          riskLevel: "low",
          approvalLevel: "none",
          humanApprovalRequired: false,
          sourceKind: "workbench",
          metadata: { op: command.op, ent: command.ent, changeCount: command.changes.length },
          redactionVersion: "v1",
          retentionClass: "operating",
        },
      })
    } catch (error) {
      console.warn("[operating] command failed", { clientRef: command.clientRef, error })
      rejected.push({
        clientRef: command.clientRef,
        code: "apply_failed",
        message: "這筆變更沒有被保存，請重試或改用其他方式記錄。",
      })
    }
  }

  const next = applied.length ? current + 1 : current
  if (applied.length) await bumpVersion(user.id, next)

  return { version: next, applied, rejected }
}

export async function readOperatingVersion(): Promise<number> {
  return readVersion()
}
