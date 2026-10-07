import "server-only"

import { createHash } from "node:crypto"

import { Prisma } from "@prisma/client"

import { getYuanzhanSeats, type YuanzhanSeat } from "@/lib/auth/yuanzhan-actor"
import { db } from "@/lib/db"
import type { AuthenticatedUser } from "@/lib/services/auth.service"
import { DEFAULT_ORG_KEY } from "@/lib/services/operating-settings.service"
import { removeSpine, syncMilestone, syncOccasion, syncSession } from "@/lib/services/operating-spine.service"
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
export const OPERATING_WORKSPACE_SLUG = DEFAULT_ORG_KEY
const WORKSPACE_SLUG = OPERATING_WORKSPACE_SLUG

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 工作台送上來的 id 可能是業務 id（`FLD-…`），也可能本來就是主鍵。
 *
 * 後者只發生在「伺服器自己建的列」：專案硬碟的 ROOT／INBOX 由
 * `ensureProjectRootAndInbox()` 以隨機 UUID 建立、沒有 workbenchRef，讀取路徑只能把
 * 主鍵原樣交給工作台。那一列之後被改名或被當成 parent 時，再套一次 UUIDv5 會算出
 * 另一個主鍵，於是同一個資料夾變成兩列。所以長得像 UUID 的就原樣使用。
 */
export function resolveWorkbenchRowId(collection: PersistedCollection, ref: string): string {
  return UUID_PATTERN.test(ref) ? ref.toLowerCase() : rowUuid(collection, ref)
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

/** 工作台用 epoch 毫秒記時刻；欄位存 timestamp，轉換留在這條邊界上。 */
function toInstant(value: unknown): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null
  return new Date(value)
}

/* ------------------------------------------------------------------ */
/* 每個集合的處理器                                                     */
/* ------------------------------------------------------------------ */

type ApplyContext = {
  workspaceId: string
  actors: Map<string, string>
  profileId: string
  /** 送出這批變更的席位（'yz' 為負責人）。月結只有負責人能動。 */
  actorKey: string
  /** 已結帳的月份（YYYY-MM）。一批命令內懶載入一次，月結變更時同步更新。 */
  closedPeriods?: Set<string>
}

/** 已結帳月份的交易只能加註、補憑證；金額、日期、歸屬唯讀（RES-032 §5.4 B-3）。 */
export class PeriodClosedError extends Error {
  constructor(public readonly period: string) {
    super(`${period} 已結帳，金額、日期與歸屬不能修改；需要時請負責人先解鎖。`)
    this.name = "PeriodClosedError"
  }
}

export class ForbiddenChangeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ForbiddenChangeError"
  }
}

const OWNER_ACTOR = "yz"

async function closedPeriodsOf(ctx: ApplyContext): Promise<Set<string>> {
  if (!ctx.closedPeriods) {
    const rows = await db.operatingPeriod.findMany({
      where: { workspaceId: ctx.workspaceId, status: "closed" },
      select: { period: true },
    })
    ctx.closedPeriods = new Set(rows.map((row) => row.period))
  }
  return ctx.closedPeriods
}

function monthOf(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 7) : null
}

/** 任一個涉及的月份已結帳就擋下。回傳被擋的月份，或 null。 */
async function lockedMonth(ctx: ApplyContext, ...dates: Array<Date | null | undefined>): Promise<string | null> {
  const closed = await closedPeriodsOf(ctx)
  for (const month of dates.map(monthOf)) if (month && closed.has(month)) return month
  return null
}

async function savedProjectIdOrNull(ref: string | null): Promise<string | null> {
  if (!ref) return null
  const id = resolveWorkbenchRowId("projects", ref)
  const row = await db.project.findUnique({ where: { id }, select: { id: true } })
  return row ? row.id : null
}

/** 只認同一個工作區、而且沒被刪掉的資料夾。 */
async function savedFolderIdOrNull(ref: string | null, workspaceId: string): Promise<string | null> {
  if (!ref) return null
  const id = resolveWorkbenchRowId("folders", ref)
  const row = await db.projectFolder.findFirst({ where: { id, workspaceId, deletedAt: null }, select: { id: true } })
  return row ? row.id : null
}

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
    // 會議（PLN-075 OD-D）：連結的專案、會議資料夾、外部與會者、注意事項。
    // 專案與資料夾對不到已保存的列時留空而不是拒絕整筆 —— 活動本身仍然成立，
    // 少的只是那條連結。
    projectId: await savedProjectIdOrNull(str(row.projectId)),
    folderId: await savedFolderIdOrNull(str(row.folderId), ctx.workspaceId),
    externalGuests: str(row.guests),
    cautions: str(row.cautions),
  }

  await db.occasion.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
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

  await db.rhythm.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
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


/* ------------------------------------------------------------------ */
/* M2：日常協作資料                                                     */
/* ------------------------------------------------------------------ */

/**
 * 工作台的狀態字串對 Work 模組的兩個列舉。
 *
 * 「驗收中」在 ProjectStatus 裡沒有對應值，但在 ProjectPhase 裡有（REVIEW），
 * 所以它拆成 status=ACTIVE + phase=REVIEW。原始字串一律存進側表的 operatingStatus，
 * 工作台讀回來看到的還是自己那一個字，不會因為往返而變。
 */
const PROJECT_STATUS_MAP: Record<string, { status: "EXPLORING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED"; phase: "DISCOVERY" | "PLANNING" | "EXECUTION" | "REVIEW" | "MAINTENANCE" }> = {
  商機: { status: "EXPLORING", phase: "DISCOVERY" },
  進行中: { status: "ACTIVE", phase: "EXECUTION" },
  驗收中: { status: "ACTIVE", phase: "REVIEW" },
  已完成: { status: "COMPLETED", phase: "MAINTENANCE" },
  // 工作台表單的第四個選項實際送來的是「已結案」。少了這一列，結案的專案會落到
  // 下面的 fallback，被存成 EXPLORING —— 也就是「商機」。
  已結案: { status: "COMPLETED", phase: "MAINTENANCE" },
  暫停: { status: "PAUSED", phase: "PLANNING" },
}

const TASK_STATUS_MAP: Record<string, "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED"> = {
  Todo: "TODO",
  Doing: "IN_PROGRESS",
  // TaskStatus 沒有 REVIEW；原字串保留在 operatingStatus，列舉取最接近的。
  Review: "IN_PROGRESS",
  Done: "DONE",
}

/** TODO 與審核是同一張表的兩種 kind。看不懂的值退回 TODO。 */
function toTaskKind(value: unknown): "TODO" | "REVIEW" {
  return typeof value === "string" && value.toUpperCase() === "REVIEW" ? "REVIEW" : "TODO"
}

const REVIEW_STATES = ["PENDING", "IN_REVIEW", "PASSED", "CHANGES_REQUESTED", "WAIVED"] as const
type ReviewState = (typeof REVIEW_STATES)[number]

/** 審核結果。空值要留 null —— 「還沒審」與「審過但待補」不是同一件事。 */
function toReviewState(value: unknown): ReviewState | null {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  return (REVIEW_STATES as readonly string[]).includes(upper) ? (upper as ReviewState) : null
}

function toJson(value: unknown, fallback: Prisma.InputJsonValue): Prisma.InputJsonValue {
  return (value === undefined || value === null ? fallback : value) as Prisma.InputJsonValue
}

async function applyProject(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("projects", change.id)

  if (change.op === "delete") {
    await db.project.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const operatingStatus = str(row.status) ?? "商機"
  const mapped = PROJECT_STATUS_MAP[operatingStatus] ?? PROJECT_STATUS_MAP["商機"]
  const ownerId = (typeof row.owner === "string" ? ctx.actors.get(row.owner) : undefined) ?? ctx.profileId

  const core = {
    ownerId,
    workspaceId: ctx.workspaceId,
    name: str(row.t) ?? "（未命名專案）",
    clientName: str(row.client),
    status: mapped.status,
    phase: mapped.phase,
    startedAt: toDateOnly(row.start),
  }

  // 專案總表的三欄（RES-034）。只在這一列真的帶著那個鍵時才寫：
  // 還沒更新的分頁送來的列沒有這些鍵，不能因此把資料庫裡的值清成空的。
  const brief: { nextAction?: string | null; priorityTier?: number | null; description?: string | null } = {}
  if ("next" in row) brief.nextAction = str(row.next)
  if ("desc" in row) brief.description = str(row.desc)
  if ("tier" in row) {
    const tier = Math.trunc(Number(row.tier))
    brief.priorityTier = Number.isFinite(tier) && tier >= 1 && tier <= 5 ? tier : null
  }

  await db.project.upsert({ where: { id }, create: { id, ...core, ...brief }, update: { ...core, ...brief } })

  const profile = {
    client: str(row.client),
    goalId: typeof row.goal === "string" && row.goal ? rowUuid("goals", row.goal) : null,
    engagementType: str(row.type),
    operatingStatus,
    bonusRatePct: Number.isFinite(Number(row.rate)) ? Math.trunc(Number(row.rate)) : 0,
    bonusCapPct: Number.isFinite(Number(row.cap)) ? Math.trunc(Number(row.cap)) : 0,
    budgetAmount: Number.isFinite(Number(row.budget)) ? Math.trunc(Number(row.budget)) : 0,
    evidenceRepoTag: str(row.repo),
    startedOn: toDateOnly(row.start),
  }

  await db.operatingProjectProfile.upsert({
    where: { projectId: id },
    create: { projectId: id, ...profile, workbenchRef: change.id },
    update: { ...profile, workbenchRef: change.id },
  })
}

async function applyIssue(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("issues", change.id)

  if (change.op === "delete") {
    await db.projectTask.deleteMany({ where: { id } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const projectRef = str(row.p)
  if (!projectRef) throw new Error(`issue ${change.id} has no project`)

  const projectId = rowUuid("projects", projectRef)
  const exists = await db.project.findUnique({ where: { id: projectId }, select: { id: true } })
  // 工作項不先於專案存在。缺專案就讓這一筆被拒，而不是造一個空殼專案出來。
  if (!exists) throw new Error(`issue ${change.id} references a project that is not saved yet`)

  // 直接掛里程碑（PLN-075 S2）：「里程碑底下的 TODO」不該被迫先發明一個目標。
  // objectiveId 仍然存在，但不再是必要的中間層。
  const milestoneRef = str(row.msId)
  let milestoneId: string | null = null
  if (milestoneRef) {
    milestoneId = rowUuid("milestones", milestoneRef)
    const milestone = await db.projectMilestone.findUnique({ where: { id: milestoneId }, select: { id: true } })
    if (!milestone) throw new Error(`issue ${change.id} references a milestone that is not saved yet`)
  }

  // 目標（里程碑底下更細的分組）。對不到已保存的目標時留空，工作本身照存。
  const objectiveRef = str(row.objectiveId)
  let objectiveId: string | null = null
  if (objectiveRef) {
    const candidate = rowUuid("objectives", objectiveRef)
    const objective = await db.projectObjective.findUnique({ where: { id: candidate }, select: { id: true } })
    objectiveId = objective ? objective.id : null
  }

  const reviewerKey = str(row.reviewer)
  const operatingStatus = str(row.st) ?? "Todo"
  const data = {
    projectId,
    objectiveId,
    title: str(row.t) ?? "（未命名）",
    // 審核任務（Migration ②）。欄位缺席時落在預設 TODO ／ null，
    // 所以既有工作台送上來的舊形狀列不會因此改變語意。
    kind: toTaskKind(row.kind),
    milestoneId,
    reviewerId: (reviewerKey ? ctx.actors.get(reviewerKey) : undefined) ?? null,
    reviewerKey,
    reviewResult: toReviewState(row.reviewResult),
    reviewedAt: toInstant(row.reviewedAt),
    reviewNote: str(row.reviewNote),
    status: TASK_STATUS_MAP[operatingStatus] ?? ("TODO" as const),
    operatingStatus,
    priority: Number.isFinite(Number(row.pri)) ? Math.trunc(Number(row.pri)) : 2,
    dueAt: toDateOnly(row.due),
    completedAt: toDateOnly(row.done),
    sizeClass: str(row.size),
    blocker: str(row.blocker),
    expectation: str(row.exp),
    evidenceCount: Number.isFinite(Number(row.ev)) ? Math.trunc(Number(row.ev)) : 0,
    relations: toJson(row.rel, []),
    customFields: toJson(row.cf, {}),
    subtasks: toJson(row.sub, []),
  }

  await db.projectTask.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyGoal(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("goals", change.id)

  if (change.op === "delete") {
    await db.operatingGoal.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    workspaceId: ctx.workspaceId,
    title: str(row.t) ?? "（未命名目標）",
    period: str(row.period) ?? "",
    progressPct: Number.isFinite(Number(row.pct)) ? Math.trunc(Number(row.pct)) : 0,
    warning: str(row.warn),
  }

  await db.operatingGoal.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyDecision(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("decisions", change.id)

  if (change.op === "delete") {
    await db.operatingDecision.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    workspaceId: ctx.workspaceId,
    authorId: ctx.profileId,
    title: str(row.t) ?? "（未命名決議）",
    body: str(row.body) ?? str(row.why),
    decidedOn: toDateOnly(row.d),
  }

  await db.operatingDecision.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

/** 一天的日誌有沒有寫東西：有字的行，或嵌了物件。 */
function journalBlocksHaveContent(blocks: unknown): boolean {
  if (!Array.isArray(blocks)) return false
  return blocks.some((block) => {
    if (!block || typeof block !== "object") return false
    const b = block as Record<string, unknown>
    return b.t === "obj" || (typeof b.text === "string" && b.text.trim().length > 0)
  })
}

/**
 * 有內容的一天不能被整天刪除。
 *
 * 工作台唯一會送出日誌 delete 的操作，是復原「剛新增的空白日期」。其餘的 delete 都不是
 * 使用者的意思，而是前端比對錯了對象 —— 2026-10-06 正式站一筆「自動保存」帶著五筆
 * delete 進來：使用者只是切到個人空間，前端拿空的那一本去比，就把團隊日誌整本判成刪除。
 * 前端已經修掉，但伺服器不能靠前端守這條線：還開著舊版分頁的人會照樣送。
 *
 * 在套用任何一筆變更之前先檢查。命令不是交易，等到 applyJournal 才擋，
 * 同一筆命令裡排在前面的變更已經寫進去了。
 */
async function assertJournalDeletesAreEmpty(changes: RowChange[], ctx: ApplyContext): Promise<void> {
  const days = changes
    .filter((change) => change.collection === "journal" && change.op === "delete")
    .map((change) => toDateOnly(change.id))
    .filter((day): day is Date => day !== null)
  if (!days.length) return

  const rows = await db.operatingJournalEntry.findMany({
    where: { workspaceId: ctx.workspaceId, authorId: ctx.profileId, onDate: { in: days } },
    select: { onDate: true, blocks: true },
  })
  const written = rows.filter((row) => journalBlocksHaveContent(row.blocks))
  if (!written.length) return

  const list = written.map((row) => row.onDate.toISOString().slice(0, 10)).join("、")
  throw new ForbiddenChangeError(
    `日誌 ${list} 有內容，不能整天刪除；這筆變更沒有套用，原本的內容還在。請重新整理頁面。`,
  )
}

/**
 * 日誌以日期為鍵，一人一天一筆。
 *
 * 不用 rowUuid：唯一鍵是 (workspace, author, onDate)，讓資料庫自己認人，
 * 這樣同一天兩個席位各寫各的，不會因為推導出同一個 id 而互相覆蓋。
 */
async function applyJournal(change: RowChange, ctx: ApplyContext): Promise<void> {
  const onDate = toDateOnly(change.id)
  if (!onDate) throw new Error(`journal ${change.id} is not a date key`)

  const key = { workspaceId_authorId_onDate: { workspaceId: ctx.workspaceId, authorId: ctx.profileId, onDate } }

  if (change.op === "delete") {
    // 走到這裡的 delete 已經過 assertJournalDeletesAreEmpty()：那一天是空白頁。
    await db.operatingJournalEntry.deleteMany({
      where: { workspaceId: ctx.workspaceId, authorId: ctx.profileId, onDate },
    })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    title: str(row.title),
    blocks: toJson(row.blocks, []),
    visibility: str(row.visibility) ?? "company",
  }

  await db.operatingJournalEntry.upsert({
    where: key,
    create: { workspaceId: ctx.workspaceId, authorId: ctx.profileId, onDate, ...data },
    update: data,
  })
}


/* ------------------------------------------------------------------ */
/* 專案軌：階段 → 里程碑 → 判準                                         */
/* ------------------------------------------------------------------ */

const PHASE_VALUES = ["DISCOVERY", "PLANNING", "EXECUTION", "REVIEW", "MAINTENANCE"] as const
type PhaseValue = (typeof PHASE_VALUES)[number]

function toPhaseValue(value: unknown): PhaseValue {
  const upper = typeof value === "string" ? (value.toUpperCase() as PhaseValue) : "EXECUTION"
  return (PHASE_VALUES as readonly string[]).includes(upper) ? upper : "EXECUTION"
}

/**
 * 里程碑在 Prisma 必須掛在一個階段下，但工作台允許里程碑先存在、階段之後再說。
 * 補一個推導出來的 EXECUTION 階段承接它們（PLN-073 §2.1 的決定）。
 */
async function ensureDefaultPhase(projectId: string): Promise<string> {
  const id = deterministicUuid(WORKSPACE_SLUG, "phases", `${projectId}:default`)
  const existing = await db.projectPhaseNode.findUnique({ where: { id }, select: { id: true } })
  if (existing) return id

  const today = new Date()
  await db.projectPhaseNode.create({
    data: { id, projectId, phase: "EXECUTION", label: "執行", startDate: today, endDate: today },
  })
  return id
}

const STAGE_KINDS = ["PROPOSAL", "CONTRACT", "EXECUTION", "ACCEPTANCE", "CLOSING", "CUSTOM"] as const
type StageKind = (typeof STAGE_KINDS)[number]

/** 五格流程的種類。舊形狀的階段列沒有這一欄，留 null。 */
function toStageKind(value: unknown): StageKind | null {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  return (STAGE_KINDS as readonly string[]).includes(upper) ? (upper as StageKind) : null
}

async function applyPhase(change: RowChange, _ctx: ApplyContext): Promise<void> {
  const id = rowUuid("phases", change.id)
  if (change.op === "delete") {
    await db.projectPhaseNode.deleteMany({ where: { id } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const projectRef = str(row.projectId)
  if (!projectRef) throw new Error(`phase ${change.id} has no project`)
  const projectId = rowUuid("projects", projectRef)
  const exists = await db.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!exists) throw new Error(`phase ${change.id} references a project that is not saved yet`)

  // 期（PLN-075）。可空是硬規定：v5 既有的階段列沒有期，照樣要寫得進來。
  const cycleRef = str(row.cycleId)
  let phaseCycleId: string | null = null
  if (cycleRef) {
    const candidate = rowUuid("phaseCycles", cycleRef)
    const cycle = await db.projectPhaseCycle.findUnique({ where: { id: candidate }, select: { id: true, projectId: true } })
    // 期與階段必須同一個專案；對不上就當作沒有期，不把階段掛到別人的期底下。
    phaseCycleId = cycle && cycle.projectId === projectId ? cycle.id : null
  }
  const ordinal = Math.trunc(Number(row.ordinal))

  const start = toDateOnly(row.startOn) ?? new Date()
  const data = {
    projectId,
    phase: toPhaseValue(row.phase),
    label: str(row.label) ?? "（未命名階段）",
    startDate: start,
    endDate: toDateOnly(row.endOn) ?? start,
    phaseCycleId,
    ordinal: Number.isFinite(ordinal) && ordinal > 0 ? ordinal : null,
    stageKind: toStageKind(row.stageKind),
  }
  await db.projectPhaseNode.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyMilestone(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("milestones", change.id)
  if (change.op === "delete") {
    await removeSpine(db, "project_milestones", id)
    await db.projectMilestone.deleteMany({ where: { id } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const projectRef = str(row.projectId)
  if (!projectRef) throw new Error(`milestone ${change.id} has no project`)
  const projectId = rowUuid("projects", projectRef)
  const exists = await db.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!exists) throw new Error(`milestone ${change.id} references a project that is not saved yet`)

  const phaseRef = str(row.phaseId)
  const phaseNodeId = phaseRef ? rowUuid("phases", phaseRef) : await ensureDefaultPhase(projectId)

  const data = {
    phaseNodeId,
    title: str(row.title) ?? "（未命名里程碑）",
    // 空字串＝日期待補；存 null 而不是猜一個日期，否則它會跑進日曆。
    date: toDateOnly(row.dueOn),
    acceptance: str(row.accept),
    derivedFrom: str(row.derivedFrom),
    remind: str(row.remind),
    bonusAmount: Math.max(0, toAmount(row.bonus)),
    // 已達成／進行中。之前沒有寫進來，重整後每個里程碑都回到「進行中」。
    status: row.state === "done" ? ("COMPLETED" as const) : ("UPCOMING" as const),
    // 交付夾是連結不是包含：資料夾不會被搬進里程碑。
    folderId: await savedFolderIdOrNull(str(row.folderId), ctx.workspaceId),
  }
  await db.projectMilestone.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
  await syncMilestone(db, id)
}

async function applyObjective(change: RowChange, _ctx: ApplyContext): Promise<void> {
  const id = rowUuid("objectives", change.id)
  if (change.op === "delete") {
    await db.projectObjective.deleteMany({ where: { id } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const milestoneRef = str(row.milestoneId)
  if (!milestoneRef) throw new Error(`objective ${change.id} has no milestone`)
  const milestoneId = rowUuid("milestones", milestoneRef)
  const exists = await db.projectMilestone.findUnique({ where: { id: milestoneId }, select: { id: true } })
  if (!exists) throw new Error(`objective ${change.id} references a milestone that is not saved yet`)

  const data = { milestoneId, title: str(row.title) ?? "（未命名判準）" }
  await db.projectObjective.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

/* ------------------------------------------------------------------ */
/* M3：Evidence、承諾、容量                                             */
/* ------------------------------------------------------------------ */

async function applyDocument(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("docs", change.id)
  if (change.op === "delete") {
    await db.operatingDocument.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    workspaceId: ctx.workspaceId,
    direction: str(row.dir) ?? "內部",
    title: str(row.t) ?? "（未命名文件）",
    clauses: toJson(row.clauses, []),
  }
  await db.operatingDocument.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyCommitment(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("commitments", change.id)
  if (change.op === "delete") {
    await db.operatingCommitment.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    workspaceId: ctx.workspaceId,
    documentRef: str(row.doc),
    clauseRef: str(row.clause),
    direction: str(row.dir) ?? "內部",
    title: str(row.t) ?? "（未命名承諾）",
    ownerKey: str(row.owner),
    status: str(row.st) ?? "履行中",
    cadence: str(row.due),
    logs: toJson(row.logs, []),
  }
  await db.operatingCommitment.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyThread(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("threads", change.id)
  if (change.op === "delete") {
    await db.operatingThread.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const projectRef = str(row.p)
  const data = {
    workspaceId: ctx.workspaceId,
    projectId: projectRef ? rowUuid("projects", projectRef) : null,
    title: str(row.t) ?? "（未命名討論）",
    closed: row.closed === true,
    messages: toJson(row.msgs, []),
    closeNote: (row.close ?? null) as Prisma.InputJsonValue,
    files: Array.isArray(row.files) ? row.files.filter((f): f is string => typeof f === "string") : [],
  }
  await db.operatingThread.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

/** repos 以 projectId 為鍵，change.id 就是工作台的專案 id。 */
async function applyEvidenceRepo(change: RowChange, ctx: ApplyContext): Promise<void> {
  const projectId = rowUuid("projects", change.id)
  if (change.op === "delete") {
    await db.operatingEvidenceRepo.deleteMany({ where: { projectId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    workspaceId: ctx.workspaceId,
    version: str(row.version) ?? "v0.1",
    frozen: row.frozen === true,
    readme: str(row.readme),
    versions: toJson(row.versions, []),
    tree: toJson(row.tree, []),
  }
  await db.operatingEvidenceRepo.upsert({
    where: { projectId },
    create: { projectId, ...data, workbenchRef: change.id },
    update: { ...data, workbenchRef: change.id },
  })
}

/** capacity / timesheet 以席位字串為鍵，一人一列。 */
async function applyCapacity(change: RowChange, ctx: ApplyContext): Promise<void> {
  const key = { workspaceId_actorKey: { workspaceId: ctx.workspaceId, actorKey: change.id } }
  if (change.op === "delete") {
    await db.operatingCapacityPlan.deleteMany({ where: { workspaceId: ctx.workspaceId, actorKey: change.id } })
    return
  }
  const allocations = toJson(change.after, [])
  await db.operatingCapacityPlan.upsert({
    where: key,
    create: { workspaceId: ctx.workspaceId, actorKey: change.id, allocations },
    update: { allocations },
  })
}

async function applyTimesheet(change: RowChange, ctx: ApplyContext): Promise<void> {
  const key = { workspaceId_actorKey: { workspaceId: ctx.workspaceId, actorKey: change.id } }
  if (change.op === "delete") {
    await db.operatingTimesheet.deleteMany({ where: { workspaceId: ctx.workspaceId, actorKey: change.id } })
    return
  }
  const weeks = toJson(change.after, [])
  await db.operatingTimesheet.upsert({
    where: key,
    create: { workspaceId: ctx.workspaceId, actorKey: change.id, weeks },
    update: { weeks },
  })
}

/* ------------------------------------------------------------------ */
/* M4：帳務                                                            */
/* ------------------------------------------------------------------ */

/** 金額一律整數。四捨五入到元，避免浮點誤差累積在對帳上。 */
function toAmount(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

async function applyTransaction(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("txns", change.id)
  if (change.op === "delete") {
    const existing = await db.operatingTransaction.findFirst({ where: { id, workspaceId: ctx.workspaceId } })
    const locked = await lockedMonth(ctx, existing?.onDate)
    if (locked) throw new PeriodClosedError(locked)
    await db.operatingTransaction.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const onDate = toDateOnly(row.d)
  if (!onDate) throw new Error(`transaction ${change.id} has no usable date`)

  const data = {
    workspaceId: ctx.workspaceId,
    onDate,
    title: str(row.t) ?? "（未命名交易）",
    projectRef: str(row.p),
    category: str(row.cat),
    amount: toAmount(row.amt),
    formula: str(row.formula),
    passThrough: row.pass === true,
    vouchers: Array.isArray(row.v) ? row.v.filter((x): x is string => typeof x === "string") : [],
    attachments: toAttachments(row.files),
    note: str(row.note),
  }

  // 已結帳月份：只允許加註與補憑證。比對的是資料庫裡的現值，不是客戶端說的「之前」。
  const existing = await db.operatingTransaction.findFirst({ where: { id, workspaceId: ctx.workspaceId } })
  const locked = await lockedMonth(ctx, existing?.onDate, onDate)
  if (locked) {
    const frozenChanged =
      !existing ||
      existing.onDate.getTime() !== onDate.getTime() ||
      existing.amount !== data.amount ||
      (existing.projectRef ?? null) !== data.projectRef ||
      (existing.category ?? null) !== data.category ||
      existing.passThrough !== data.passThrough ||
      existing.title !== data.title
    if (frozenChanged) throw new PeriodClosedError(locked)
  }

  await db.operatingTransaction.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyReimbursement(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("reimb", change.id)
  if (change.op === "delete") {
    await db.operatingReimbursement.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  // 核准與付款是負責人的動作（RES-032 §5.7）；成員只能送出自己的報帳。
  const status = str(row.st) ?? "待送"
  if (ctx.actorKey !== OWNER_ACTOR) {
    const existing = await db.operatingReimbursement.findFirst({ where: { id, workspaceId: ctx.workspaceId } })
    if ((status === "已核" || status === "已付") && existing?.status !== status) {
      throw new ForbiddenChangeError("報帳核准與付款由負責人處理。")
    }
  }
  const data = {
    workspaceId: ctx.workspaceId,
    actorKey: str(row.who),
    title: str(row.t) ?? "（未命名報帳）",
    amount: toAmount(row.amt),
    status,
    onDate: toDateOnly(row.d),
  }
  await db.operatingReimbursement.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyBankEntry(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("bank", change.id)
  const existing = await db.operatingBankEntry.findFirst({ where: { id, workspaceId: ctx.workspaceId } })
  if (change.op === "delete") {
    const locked = await lockedMonth(ctx, existing?.onDate)
    if (locked) throw new PeriodClosedError(locked)
    await db.operatingBankEntry.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const onDate = toDateOnly(row.d)
  if (!onDate) throw new Error(`bank entry ${change.id} has no usable date`)
  // 已結帳月份的銀行明細連勾稽都不動：勾稽狀態是月結檢查的一部分。
  const locked = await lockedMonth(ctx, existing?.onDate, onDate)
  if (locked) throw new PeriodClosedError(locked)

  const data = {
    workspaceId: ctx.workspaceId,
    onDate,
    title: str(row.t) ?? "（未命名明細）",
    amount: toAmount(row.amt),
    matchedRef: str(row.m),
  }
  await db.operatingBankEntry.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyPayrollDraft(change: RowChange, ctx: ApplyContext): Promise<void> {
  const key = { workspaceId_actorKey: { workspaceId: ctx.workspaceId, actorKey: change.id } }
  if (change.op === "delete") {
    await db.operatingPayrollDraft.deleteMany({ where: { workspaceId: ctx.workspaceId, actorKey: change.id } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    baseAmount: toAmount(row.base),
    overtime: toAmount(row.overtime),
    milestone: toAmount(row.milestone),
    separate: row.separate === true,
  }
  await db.operatingPayrollDraft.upsert({
    where: key,
    create: { workspaceId: ctx.workspaceId, actorKey: change.id, ...data },
    update: data,
  })
}


/* ------------------------------------------------------------------ */
/* M5：留言與請求                                                       */
/* ------------------------------------------------------------------ */

const COMMENT_TARGET_TYPE: Record<string, string> = {
  lineComments: "line",
  journalComments: "journal",
  objectComments: "object",
}

/**
 * 三種留言共用一張表。作者同時記 Profile uuid 與席位字串：
 * uuid 用來做權限，席位字串是工作台顯示的那個名字，對不到人時它仍然在。
 */
async function applyComment(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid(change.collection, change.id)
  const targetType = COMMENT_TARGET_TYPE[change.collection] ?? "object"

  if (change.op === "delete") {
    // 留言可能已被引用，引用的那一頭不該指向空白 —— 所以是軟刪除。
    await db.operatingComment.updateMany({
      where: { id, workspaceId: ctx.workspaceId },
      data: { deletedAt: new Date() },
    })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const authorKey = str(row.w) ?? str(row.author)
  const data = {
    workspaceId: ctx.workspaceId,
    authorId: (authorKey ? ctx.actors.get(authorKey) : undefined) ?? null,
    authorKey,
    workbenchRef: change.id,
    targetType,
    targetRef: str(row.parent) ?? str(row.blockId) ?? "",
    body: str(row.x) ?? "",
    // 行內留言的 author 是「那一行屬於誰的日誌」，不是留言的人（那是 w）。
    // 少存它，讀回來只剩 authorKey 可用，別人日誌上的留言就對不回那一行，重整即消失。
    meta: toJson(
      { ts: row.ts ?? null, day: row.day ?? null, blockId: row.blockId ?? null, lineAuthor: str(row.author) ?? null },
      {},
    ),
    deletedAt: null,
  }

  await db.operatingComment.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applyRequest(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("requests", change.id)

  if (change.op === "delete") {
    await db.operatingRequest.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const sentAt = Number(row.sentAt)
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    fromKey: str(row.from),
    toKey: str(row.to),
    onDate: toDateOnly(row.day),
    blockId: str(row.blockId),
    text: str(row.text) ?? "",
    kind: str(row.kind) ?? "ask",
    sentAt: Number.isFinite(sentAt) && sentAt > 0 ? new Date(sentAt) : null,
    // options／replies／nudges／pinged 形狀仍在演進，整包存比拆表安全。
    // seenAt／firstReplyAt／resolvedAt 一起存：少了它們，重新整理之後每一筆請求都會
    // 看起來像沒人讀過、沒人回過，24 小時的紅色提醒會重新開始跑；kind:'notice' 的
    // 通知匣未讀數也是靠 seenAt 算的。
    payload: toJson(
      {
        options: row.options ?? [],
        replies: row.replies ?? [],
        nudges: row.nudges ?? [],
        pinged: row.pinged ?? {},
        via: row.via ?? null,
        seenAt: row.seenAt ?? null,
        firstReplyAt: row.firstReplyAt ?? null,
        resolvedAt: row.resolvedAt ?? null,
        choice: row.choice ?? null,
        deferReason: row.deferReason ?? null,
        deferredAt: row.deferredAt ?? null,
      },
      {},
    ),
  }

  await db.operatingRequest.upsert({ where: { id }, create: { id, ...data }, update: data })
}


/* ------------------------------------------------------------------ */
/* M6：文件庫與文件物件                                                 */
/* ------------------------------------------------------------------ */

/**
 * 版本陣列裡不該出現 bytes。
 *
 * 上傳器在 database 模式已經把二進位送去 R2、只留 objectKey，但這是伺服器這一側的
 * 第二道：舊資料、其他客戶端或未來的改動都可能把 data URL 帶回來，
 * 存進去就等於把 base64 永久寫進資料庫。
 */
function stripFileBytes(versions: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(versions)) return []
  return versions.map((version) => {
    if (!version || typeof version !== "object") return version
    const { data: _data, ...rest } = version as Record<string, unknown>
    return rest
  }) as Prisma.InputJsonValue
}

async function applyLibraryFile(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("files", change.id)
  if (change.op === "delete") {
    await db.operatingLibraryFile.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    name: str(row.name) ?? "（未命名檔案）",
    category: str(row.category) ?? "material",
    tags: str(row.tags) ?? "",
    space: str(row.space) ?? "team",
    authorKey: str(row.author),
    versions: stripFileBytes(row.versions),
  }
  await db.operatingLibraryFile.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applyDocObject(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("docObjects", change.id)
  if (change.op === "delete") {
    await db.operatingDocObject.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    kind: str(row.type) ?? "note",
    subKind: str(row.subType),
    title: str(row.title) ?? "（未命名）",
    titleAuto: row.titleAuto !== false,
    onDate: toDateOnly(row.day),
    authorKey: str(row.author),
    payload: toJson(
      { collapsed: row.collapsed === true, secs: row.secs ?? [], ...(row.agenda ? { agenda: row.agenda } : {}) },
      {},
    ),
  }
  await db.operatingDocObject.upsert({ where: { id }, create: { id, ...data }, update: data })
}

const LINK_KIND = "link"

/** 只收 http／https。`javascript:`、`data:` 之類的網址存進來，下一個點它的人就會執行它。 */
function toHttpUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

/**
 * 連結物件：日誌裡貼上的網址。
 *
 * 與文件物件同一張表（operating_doc_objects，kind = 'link'），不另開一張：它要的欄位
 * ——標題、作者、誕生日、一包 JSON——那張表都已經有了，為了一個網址多一次 migration
 * 不划算。工作台那一頭是獨立的 `links` 集合，主鍵也由 "links" 推導，所以不會與
 * 文件物件撞 id；讀取端依 kind 把兩者分開。
 */
async function applyLinkObject(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("links", change.id)
  if (change.op === "delete") {
    await db.operatingDocObject.deleteMany({ where: { id, workspaceId: ctx.workspaceId, kind: LINK_KIND } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const url = toHttpUrl(row.url)
  if (!url) throw new Error(`link ${change.id} has no usable http(s) url`)

  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    kind: LINK_KIND,
    subKind: null,
    title: (str(row.title) ?? url.host).slice(0, 300),
    titleAuto: row.titleAuto !== false,
    onDate: toDateOnly(row.day),
    authorKey: str(row.author),
    payload: toJson(
      {
        url: url.toString(),
        note: str(row.note) ?? "",
        // 私人日誌裡貼的連結只有作者讀得到，與檔案物件同一條規則。
        space: row.space === "personal" ? "personal" : "team",
        bornAt: typeof row.bornAt === "number" && Number.isFinite(row.bornAt) ? row.bornAt : Date.now(),
      },
      {},
    ),
  }
  await db.operatingDocObject.upsert({ where: { id }, create: { id, ...data }, update: data })
}

/* ------------------------------------------------------------------ */
/* M7：日誌右欄的兩人共用狀態                                          */
/* ------------------------------------------------------------------ */

/**
 * 今日脈絡的一列事件。
 *
 * 沒有 update 的概念：事件發生過就是發生過，工作台只會新增。upsert 仍然保留，
 * 因為同一個 clientRef 重送時要落在同一列，而不是長出第二筆一模一樣的脈絡。
 */
async function applyDayLog(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("dayLogs", change.id)

  if (change.op === "delete") {
    await db.operatingDayLog.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const onDate = toDateOnly(row.day)
  if (!onDate) throw new Error(`day log ${change.id} has no usable day`)

  const actorKey = str(row.w)
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    onDate,
    actorId: (actorKey ? ctx.actors.get(actorKey) : undefined) ?? null,
    actorKey,
    atTime: str(row.t) ?? "",
    // onDate 是「掛在哪一天」，occurredAt 是「真的何時寫的」。回頭補記時兩者不同天，
    // 而 atTime 記的是補記當下的時鐘 —— 在 onDate 的時間軸上是假的。工作台靠這個差別分區顯示。
    occurredAt: toInstant(row.at),
    kind: str(row.kind) ?? "act",
    text: str(row.text) ?? "",
  }

  await db.operatingDayLog.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applyTodayIssue(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("todayIssues", change.id)

  if (change.op === "delete") {
    await db.operatingTodayIssue.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  // 延後會把議題往後搬，所以 day 是「目前掛在哪一天」，不是標記那天。
  const onDate = toDateOnly(row.day)
  if (!onDate) throw new Error(`today issue ${change.id} has no usable day`)

  const authorKey = str(row.author)
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    authorId: (authorKey ? ctx.actors.get(authorKey) : undefined) ?? null,
    authorKey,
    onDate,
    blockId: str(row.blockId),
    text: str(row.text) ?? "",
    flaggedAt: toInstant(row.at),
    doneAt: toInstant(row.doneAt),
    deferred: typeof row.deferred === "number" && row.deferred > 0 ? Math.floor(row.deferred) : 0,
  }

  await db.operatingTodayIssue.upsert({ where: { id }, create: { id, ...data }, update: data })
}

/* ------------------------------------------------------------------ */
/* RES-032：收件匣與月結                                               */
/* ------------------------------------------------------------------ */

type Attachment = { objectKey: string; name: string; type: string; bytes: number; at: string; by: string }

/**
 * 只收 R2 物件參照。data URL（prototype 模式的記憶體檔案）不會進資料庫：
 * 那會讓一張圖變成好幾 MB 的 JSON，而 MAX_COMMAND_BYTES 本來就會擋。
 */
function toAttachment(value: unknown): Attachment | null {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  const objectKey = str(v.objectKey)
  if (!objectKey || !objectKey.startsWith("operating/") || objectKey.includes("..")) return null
  return {
    objectKey,
    name: str(v.name) ?? "憑證",
    type: str(v.type) ?? "",
    bytes: typeof v.bytes === "number" && Number.isFinite(v.bytes) ? Math.max(0, Math.round(v.bytes)) : 0,
    at: str(v.at) ?? "",
    by: str(v.by) ?? "",
  }
}

function toAttachments(value: unknown): Attachment[] {
  return Array.isArray(value) ? value.map(toAttachment).filter((x): x is Attachment => x !== null) : []
}

const INTAKE_STATUSES = new Set(["draft", "unfiled", "posted", "discarded"])

async function applyIntakeItem(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("intake", change.id)
  const existing = await db.operatingIntakeItem.findFirst({ where: { id, workspaceId: ctx.workspaceId } })
  // 收件是個人的：只有交件人自己與負責人能改或刪。
  if (existing && existing.actorKey && existing.actorKey !== ctx.actorKey && ctx.actorKey !== OWNER_ACTOR) {
    throw new ForbiddenChangeError("只有交件人與負責人可以修改這筆收件。")
  }
  if (change.op === "delete") {
    await db.operatingIntakeItem.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const status = str(row.st) ?? "draft"
  // 歸帳（posted）會產生交易，那是記帳者的動作。
  if (status === "posted" && existing?.status !== "posted" && ctx.actorKey !== OWNER_ACTOR) {
    throw new ForbiddenChangeError("歸帳由負責人處理。")
  }
  const amount = row.amt === null || row.amt === undefined || row.amt === "" ? null : toAmount(row.amt)
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    // 成員只能以自己的名義交件；負責人核准代墊時會替成員建立待歸帳項目。
    actorKey: existing?.actorKey ?? (ctx.actorKey === OWNER_ACTOR ? str(row.who) ?? ctx.actorKey : ctx.actorKey),
    title: str(row.t) ?? "（未命名收件）",
    amount,
    onDate: toDateOnly(row.d),
    projectRef: str(row.p),
    status: INTAKE_STATUSES.has(status) ? status : "draft",
    file: toAttachment(row.file) ?? Prisma.DbNull,
    reimbRef: str(row.reimb),
    postedRef: str(row.txn),
  }
  await db.operatingIntakeItem.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applyPeriod(change: RowChange, ctx: ApplyContext): Promise<void> {
  if (ctx.actorKey !== OWNER_ACTOR) throw new ForbiddenChangeError("月結與解鎖只有負責人可以操作。")
  const period = change.id
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error(`period ${period} is not YYYY-MM`)
  const key = { workspaceId_period: { workspaceId: ctx.workspaceId, period } }
  const closed = await closedPeriodsOf(ctx)
  if (change.op === "delete") {
    // 月結紀錄不刪：解鎖是 status=open 並留下 log，刪掉就沒有痕跡了。
    throw new ForbiddenChangeError("月結紀錄不能刪除，請改用解鎖。")
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const status = row.st === "closed" ? "closed" : "open"
  const log = Array.isArray(row.log) ? row.log : []
  if (status === "open") {
    const last = log[log.length - 1] as Record<string, unknown> | undefined
    const wasClosed = closed.has(period)
    if (wasClosed && (!last || last.action !== "reopen" || !str(last.reason))) {
      throw new ForbiddenChangeError("解鎖需要填寫原因。")
    }
  }
  const data = {
    status,
    closedBy: status === "closed" ? str(row.by) ?? ctx.actorKey : null,
    closedAt: status === "closed" ? toInstant(row.at) ?? new Date() : null,
    checklist: Array.isArray(row.checklist) ? (row.checklist as Prisma.InputJsonValue) : [],
    log: log as Prisma.InputJsonValue,
  }
  await db.operatingPeriod.upsert({ where: key, create: { workspaceId: ctx.workspaceId, period, ...data }, update: data })
  if (status === "closed") closed.add(period)
  else closed.delete(period)
}

/* ── 合約金流 ──────────────────────────────────────────────────────────
   合約與期款決定推演與兩顆燈：改一筆金額就改變「還能活幾個月」的答案，
   所以這四支全部限負責人，並在 HIGH_RISK_COLLECTIONS 裡提高稽核層級。   */

async function applyContract(change: RowChange, ctx: ApplyContext): Promise<void> {
  if (ctx.actorKey !== OWNER_ACTOR) throw new ForbiddenChangeError("合約只有負責人可以建立或修改。")
  const id = rowUuid("contracts", change.id)
  if (change.op === "delete") {
    await db.operatingContract.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const projectRef = str(row.p)
  if (!projectRef) throw new Error("contract requires a project ref")
  const projectId = rowUuid("projects", projectRef)
  const project = await db.project.findFirst({ where: { id: projectId, workspaceId: ctx.workspaceId }, select: { id: true } })
  if (!project) throw new Error(`contract ${change.id} references a project that is not saved yet`)
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    projectId,
    title: str(row.title),
    totalAmount: toAmount(row.total),
    paymentTermsDays: Math.max(0, toAmount(row.termsDays) || 30),
    clauseRef: str(row.clause),
    signedOn: toDateOnly(row.signedOn),
    status: str(row.st) ?? "active",
  }
  await db.operatingContract.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applyContractTerm(change: RowChange, ctx: ApplyContext): Promise<void> {
  if (ctx.actorKey !== OWNER_ACTOR) throw new ForbiddenChangeError("期款只有負責人可以建立或修改。")
  const id = rowUuid("terms", change.id)
  if (change.op === "delete") {
    await db.operatingContractTerm.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const contractRef = str(row.c)
  if (!contractRef) throw new Error("term requires a contract ref")
  const contract = await db.operatingContract.findFirst({
    where: { id: rowUuid("contracts", contractRef), workspaceId: ctx.workspaceId },
    select: { id: true },
  })
  if (!contract) throw new Error(`contract ${contractRef} is not persisted yet`)
  const expectedOn = toDateOnly(row.expectedOn)
  if (!expectedOn) throw new Error("term requires expectedOn")
  const settledOn = toDateOnly(row.settledOn)
  // status 由日期推導，不另外信任前端送來的字串：存了兩份就會出現
  // 「已收但沒有實際收款日」這種對不起來的列。
  const status = settledOn ? "settled" : row.writtenOff ? "written_off" : toDateOnly(row.invoicedOn) ? "invoiced" : "pending"
  const pct = row.pct === null || row.pct === undefined || row.pct === "" ? null : toAmount(row.pct)
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    contractId: contract.id,
    seq: Math.max(1, toAmount(row.seq) || 1),
    label: str(row.label) ?? "（未命名期款）",
    amount: toAmount(row.amount),
    pctOfTotal: pct,
    triggerKind: str(row.trigger) ?? "date",
    milestoneRef: str(row.ms),
    expectedOn,
    invoicedOn: toDateOnly(row.invoicedOn),
    settledOn,
    status,
    txnRef: str(row.txn),
  }
  await db.operatingContractTerm.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applyCashAccount(change: RowChange, ctx: ApplyContext): Promise<void> {
  if (ctx.actorKey !== OWNER_ACTOR) throw new ForbiddenChangeError("現金帳戶只有負責人看得到，也只有負責人改得動。")
  const id = rowUuid("accounts", change.id)
  if (change.op === "delete") {
    await db.operatingCashAccount.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const openingAsOf = toDateOnly(row.asOf)
  if (!openingAsOf) throw new Error("cash account requires an opening date")
  const data = {
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    name: str(row.name) ?? "（未命名帳戶）",
    kind: str(row.kind) ?? "bank",
    openingBalance: toAmount(row.opening),
    openingAsOf,
  }
  await db.operatingCashAccount.upsert({ where: { id }, create: { id, ...data }, update: data })
}

async function applyCashAssumption(change: RowChange, ctx: ApplyContext): Promise<void> {
  if (ctx.actorKey !== OWNER_ACTOR) throw new ForbiddenChangeError("支出假設與燈號門檻只有負責人可以改。")
  // 一個工作區一列，不刪：刪掉會讓燈號無聲退回預設值而不是「尚未設定」。
  if (change.op === "delete") return
  const row = (change.after ?? {}) as Record<string, unknown>
  const pct = (v: unknown, fallback: number) => {
    const n = v === null || v === undefined || v === "" ? NaN : Number(v)
    return Number.isFinite(n) ? Math.round(n * 100) : fallback
  }
  const int = (v: unknown, fallback: number) => {
    const n = v === null || v === undefined || v === "" ? NaN : Number(v)
    return Number.isFinite(n) ? Math.round(n) : fallback
  }
  const data = {
    monthlyBurn: Math.max(0, int(row.monthlyBurn, 0)),
    runwayGreenMonths: int(row.runwayGreen, 6),
    runwayAmberMonths: int(row.runwayAmber, 3),
    coverageGreenPct: pct(row.coverageGreen, 120),
    coverageAmberPct: pct(row.coverageAmber, 80),
    overdueAmberDays: int(row.overdueAmber, 14),
    overdueRedDays: int(row.overdueRed, 30),
    probChallengeablePct: pct(row.probCHALLENGEABLE, 20),
    probProposedPct: pct(row.probPROPOSED, 50),
  }
  await db.operatingCashAssumption.upsert({
    where: { workspaceId: ctx.workspaceId },
    create: { workspaceId: ctx.workspaceId, ...data },
    update: data,
  })
}

/* ------------------------------------------------------------------ */
/* PLN-075 S2：專案工作區五大資源                                       */
/* ------------------------------------------------------------------ */

/**
 * 專案必須先存下來。
 *
 * 與 applyIssue／applyPhase 同一條規則：缺專案就讓這一筆被拒，
 * 而不是造一個空殼專案出來 —— 空殼專案會出現在清單裡，而且沒有人記得它為什麼存在。
 */
async function requireSavedProject(ref: string | null, what: string, rowId: string): Promise<string> {
  if (!ref) throw new Error(`${what} ${rowId} has no project`)
  const projectId = rowUuid("projects", ref)
  const exists = await db.project.findUnique({ where: { id: projectId }, select: { id: true } })
  if (!exists) throw new Error(`${what} ${rowId} references a project that is not saved yet`)
  return projectId
}

const FOLDER_KINDS = [
  "ROOT", "INBOX", "GENERIC", "PROPOSAL", "CONTRACT", "MILESTONE", "MEETING",
  "SHARED", "INTERNAL", "REVISION", "MATERIAL", "FINANCE", "CHAT_DROP", "LINE_DROP",
] as const
type FolderKind = (typeof FOLDER_KINDS)[number]

function toFolderKind(value: unknown): FolderKind {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  return (FOLDER_KINDS as readonly string[]).includes(upper) ? (upper as FolderKind) : "GENERIC"
}

const FOLDER_VISIBILITIES = ["CLIENT_VISIBLE", "INTERNAL_ONLY", "RESTRICTED_NO_INDEX"] as const
type FolderVisibility = (typeof FOLDER_VISIBILITIES)[number]

/**
 * 對客戶一律 deny-by-default：看不懂的值退回 INTERNAL_ONLY，不是 CLIENT_VISIBLE。
 *
 * CONTRACT 與 INTERNAL 兩種資料夾永遠不可能對客戶可見，而那條規則在這裡強制，
 * 不是在介面上用停用的選項暗示 —— 介面擋得住滑鼠，擋不住重送一次請求。
 */
function toFolderVisibility(value: unknown, kind: FolderKind): FolderVisibility {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  const parsed = (FOLDER_VISIBILITIES as readonly string[]).includes(upper)
    ? (upper as FolderVisibility)
    : "INTERNAL_ONLY"
  if (parsed === "CLIENT_VISIBLE" && (kind === "CONTRACT" || kind === "INTERNAL")) return "INTERNAL_ONLY"
  return parsed
}

const FOLDER_VISIBILITY_RANK: Record<FolderVisibility, number> = {
  CLIENT_VISIBLE: 0,
  INTERNAL_ONLY: 1,
  RESTRICTED_NO_INDEX: 2,
}

/** 兩者取較嚴的那一級。上層沒有（根）時原樣回傳。 */
function stricterVisibility(own: FolderVisibility, parent: FolderVisibility | null | undefined): FolderVisibility {
  if (!parent) return own
  return FOLDER_VISIBILITY_RANK[parent] > FOLDER_VISIBILITY_RANK[own] ? parent : own
}

/** 同層唯一性比對用的名字：NFC ＋ 去頭尾空白 ＋ 小寫。顯示一律用原字串。 */
function normalizeFolderName(name: string): string {
  return name.normalize("NFC").trim().toLowerCase()
}

/**
 * 資料夾樹的一列。
 *
 * 刪除一律軟刪：資料夾被里程碑交付夾（ProjectMilestone.folderId）或會議
 * （Occasion.folderId）引用過，硬刪會讓那一頭指向空白。
 *
 * 搬移時子孫的 path／depth 在同一個處理器裡以一條子樹 UPDATE 重寫（見函式結尾）。
 */
async function applyProjectFolder(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = resolveWorkbenchRowId("folders", change.id)

  if (change.op === "delete") {
    await db.projectFolder.updateMany({
      where: { id, workspaceId: ctx.workspaceId },
      data: { deletedAt: new Date() },
    })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const projectId = await requireSavedProject(str(row.projectId), "folder", change.id)

  const parentRef = str(row.parentId)
  const parentId = parentRef ? resolveWorkbenchRowId("folders", parentRef) : null
  const parent = parentId
    ? await db.projectFolder.findUnique({
        where: { id: parentId },
        select: { path: true, depth: true, visibility: true, projectId: true },
      })
    : null
  if (parentRef && !parent) throw new Error(`folder ${change.id} references a parent that is not saved yet`)
  if (parent && parent.projectId !== projectId) {
    throw new ForbiddenChangeError("上層資料夾不屬於這個專案。")
  }

  const existing = await db.projectFolder.findUnique({ where: { id }, select: { path: true, depth: true } })
  // 搬進自己的子樹會讓整棵樹斷成一個環：路徑互相包含，沒有一列走得回根。
  if (existing && parent && parent.path.startsWith(existing.path)) {
    throw new ForbiddenChangeError("不能把資料夾搬進它自己底下。")
  }

  const kind = toFolderKind(row.kind)
  const name = str(row.name) ?? "（未命名資料夾）"
  const authorKey = str(row.author)

  // 每個專案恰好一個 ROOT、一個 INBOX。上傳路徑的 ensureProjectRootAndInbox() 也會建
  // 這兩列，兩條路撞在一起時收件匣會變成「其中一個收件匣」，所有落點邏輯跟著失真。
  if (kind === "ROOT" || kind === "INBOX") {
    const twin = await db.projectFolder.findFirst({
      where: { projectId, kind, deletedAt: null, id: { not: id } },
      select: { id: true },
    })
    if (twin) throw new ForbiddenChangeError("這個專案已經有專案硬碟了，請重新整理後再試。")
  }

  const data = {
    projectId,
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    parentId,
    kind,
    // 子資料夾不能比上層更寬。介面本來就不會送出這種值；這裡是為了重送與併發時
    // 仍然成立 —— 而且是收緊，不是拒絕：對客戶一律 deny-by-default。
    visibility: stricterVisibility(toFolderVisibility(row.visibility, kind), parent?.visibility),
    name,
    nameNormalized: normalizeFolderName(name),
    // 路徑由伺服器算，不採用前端送來的值：路徑錯了，整棵子樹的查詢都會錯。
    path: `${parent ? parent.path : "/"}${id}/`,
    depth: parent ? parent.depth + 1 : 0,
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Math.trunc(Number(row.sortOrder)) : 0,
    // ROOT 與 INBOX 永遠是系統資料夾，無論前端怎麼送。
    isSystem: row.isSystem === true || kind === "ROOT" || kind === "INBOX",
    space: str(row.space) === "personal" ? "personal" : "team",
    createdByProfileId: (authorKey ? ctx.actors.get(authorKey) : undefined) ?? null,
    note: str(row.note),
    // 重新出現在工作台的 store 裡＝使用者把它救回來了。
    deletedAt: null,
  }

  await db.projectFolder.upsert({ where: { id }, create: { id, ...data }, update: data })

  // 搬移：子孫的 path／depth 用一條 SQL 一起重寫（與 project-drive.service 的
  // moveProjectFolder 同一個做法）。逐列更新會在半途被任何一個錯誤切成「一半在新前綴、
  // 一半在舊前綴」—— 樹看起來是對的（介面讀 parentId），只有以前綴做的子樹查詢會算錯。
  if (existing && existing.path !== data.path) {
    await db.$executeRaw(Prisma.sql`
      UPDATE project_folders
         SET path = ${data.path} || substr(path, ${existing.path.length + 1}::int),
             depth = depth + ${data.depth - existing.depth}::int,
             updated_at = now()
       WHERE project_id = ${projectId}::uuid
         AND id <> ${id}::uuid
         AND path LIKE ${existing.path + "%"}
    `)
  }
}

const CYCLE_STATUSES = ["PLANNED", "ACTIVE", "ACCEPTED", "CLOSED", "CANCELLED"] as const
type CycleStatus = (typeof CYCLE_STATUSES)[number]

function toCycleStatus(value: unknown): CycleStatus {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  return (CYCLE_STATUSES as readonly string[]).includes(upper) ? (upper as CycleStatus) : "PLANNED"
}

/**
 * 「期」的一列。
 *
 * 刪除是硬刪而不是軟刪：階段的 phase_cycle_id 是 ON DELETE SET NULL，所以硬刪之後
 * 階段會回到「沒有期」的狀態，也就是 v5 既有 `phases` 集合本來的樣子。
 * 軟刪反而會讓階段繼續指著一個看不見的期，於是「這個階段屬於哪一期」有兩個答案。
 */
async function applyPhaseCycle(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("phaseCycles", change.id)

  if (change.op === "delete") {
    await db.projectPhaseCycle.deleteMany({ where: { id } })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const projectId = await requireSavedProject(str(row.projectId), "phase cycle", change.id)

  const ordinal = Math.trunc(Number(row.ordinal))
  // 期數是它的身分（@@unique([projectId, ordinal])）。猜一個會把兩期併成一期。
  if (!Number.isFinite(ordinal) || ordinal < 1) {
    throw new Error(`phase cycle ${change.id} has no usable ordinal`)
  }

  const contractRef = str(row.contractId)
  let contractId: string | null = null
  if (contractRef) {
    contractId = rowUuid("contracts", contractRef)
    const contract = await db.operatingContract.findUnique({ where: { id: contractId }, select: { id: true } })
    if (!contract) throw new Error(`phase cycle ${change.id} references a contract that is not saved yet`)
  }

  const budget = Number(row.budget)
  const data = {
    projectId,
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    ordinal,
    title: str(row.title),
    contractId,
    // 可空：「還沒編預算」與「預算是 0」不是同一件事，所以空值不折成 0。
    budgetAmount: Number.isFinite(budget) ? Math.trunc(budget) : null,
    startOn: toDateOnly(row.startOn),
    endOn: toDateOnly(row.endOn),
    status: toCycleStatus(row.status),
    note: str(row.note),
    deletedAt: null,
  }

  await db.projectPhaseCycle.upsert({ where: { id }, create: { id, ...data }, update: data })
}

const CHANNEL_KINDS = ["MAIN", "TOPIC", "LINE_MIRROR", "CLIENT"] as const
type ChannelKind = (typeof CHANNEL_KINDS)[number]

function toChannelKind(value: unknown): ChannelKind {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  return (CHANNEL_KINDS as readonly string[]).includes(upper) ? (upper as ChannelKind) : "TOPIC"
}

const CHAT_ORIGINS = ["APP", "LINE", "LINE_IMPORT", "SYSTEM"] as const
type ChatOrigin = (typeof CHAT_ORIGINS)[number]

function toChatOrigin(value: unknown): ChatOrigin {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  return (CHAT_ORIGINS as readonly string[]).includes(upper) ? (upper as ChatOrigin) : "APP"
}

/**
 * 聊天室頻道。
 *
 * 刪除是軟刪：頻道的訊息是 ON DELETE CASCADE，硬刪會連同整段對話一起消失，
 * 而對話是「專案發生了什麼」的主要證據。
 */
async function applyChatChannel(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("chatChannels", change.id)

  if (change.op === "delete") {
    await db.projectChatChannel.updateMany({
      where: { id, workspaceId: ctx.workspaceId },
      data: { deletedAt: new Date(), isArchived: true },
    })
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const projectId = await requireSavedProject(str(row.projectId), "chat channel", change.id)

  const kind = toChannelKind(row.kind)
  const dropRef = str(row.dropFolderId)
  const authorKey = str(row.author)

  const data = {
    projectId,
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    kind,
    name: str(row.name) ?? "（未命名頻道）",
    topic: str(row.topic),
    // LINE 鏡射一律唯讀：站內不回傳訊息到 LINE（OD-H 本階段不接 LINE）。
    isReadOnly: kind === "LINE_MIRROR" ? true : row.readOnly === true,
    isArchived: row.archived === true,
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Math.trunc(Number(row.sortOrder)) : 0,
    dropFolderId: await savedFolderIdOrNull(dropRef, ctx.workspaceId),
    createdByProfileId: (authorKey ? ctx.actors.get(authorKey) : undefined) ?? null,
    deletedAt: null,
  }

  await db.projectChatChannel.upsert({ where: { id }, create: { id, ...data }, update: data })
}

/**
 * 一列一訊息（OD-F）。
 *
 * `projectId` 取自頻道，不取前端送來的值：訊息的授權範圍由頻道決定，
 * 讓客戶端自己宣告專案等於讓它自己宣告授權。
 *
 * 刪除是軟刪（抄 OperatingComment 的理由）：訊息被回覆或被 @ 引用過就不能真的消失，
 * 否則指向它的那一頭會變成空白。
 */
async function applyChatMessage(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("chatMessages", change.id)

  if (change.op === "delete") {
    // delete 沒有 after，所以頻道要先從既有列讀回來 —— 否則計數不會被重算。
    const existing = await db.projectChatMessage.findUnique({ where: { id }, select: { channelId: true } })
    await db.projectChatMessage.updateMany({
      where: { id, workspaceId: ctx.workspaceId },
      data: { deletedAt: new Date() },
    })
    if (existing) await syncChannelCounters(existing.channelId)
    return
  }

  const row = (change.after ?? {}) as Record<string, unknown>
  const channelRef = str(row.channelId)
  if (!channelRef) throw new Error(`chat message ${change.id} has no channel`)
  const channelId = rowUuid("chatChannels", channelRef)
  const channel = await db.projectChatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, projectId: true, isReadOnly: true },
  })
  if (!channel) throw new Error(`chat message ${change.id} references a channel that is not saved yet`)
  // 唯讀頻道（LINE 鏡射）只能由匯入／webhook 寫入，不能從站內送訊息進去。
  if (channel.isReadOnly && toChatOrigin(row.origin) === "APP") {
    throw new ForbiddenChangeError("這個頻道是唯讀的鏡射，站內不能往裡面發訊息。")
  }

  const authorKey = str(row.w) ?? str(row.author)
  const replyRef = str(row.replyTo)

  const data = {
    channelId,
    projectId: channel.projectId,
    workspaceId: ctx.workspaceId,
    workbenchRef: change.id,
    authorProfileId: (authorKey ? ctx.actors.get(authorKey) : undefined) ?? null,
    authorKey,
    authorExternalRef: str(row.externalAuthor),
    authorDisplayName: str(row.authorName),
    origin: toChatOrigin(row.origin),
    externalRef: str(row.externalRef),
    body: str(row.text) ?? "",
    messageType: str(row.type) ?? "text",
    isPlaceholder: row.placeholder === true,
    isHistorical: row.historical === true,
    replyToId: replyRef ? rowUuid("chatMessages", replyRef) : null,
    mentions: toJson(row.mentions, []),
    meta: toJson(row.meta, {}),
    // 真正發生的時刻。工作台沒送時用現在 —— 訊息沒有時間就排不進對話。
    sentAt: toInstant(row.at) ?? new Date(),
    editedAt: toInstant(row.editedAt),
    deletedAt: null,
  }

  await db.projectChatMessage.upsert({ where: { id }, create: { id, ...data }, update: data })
  await syncChannelCounters(channelId)
}

/** 頻道的衍生計數由服務層單一 writer 維護（與 TimeSpine 同模式），不信任客戶端送的數字。 */
async function syncChannelCounters(channelId: string): Promise<void> {
  const channel = await db.projectChatChannel.findUnique({ where: { id: channelId }, select: { id: true } })
  if (!channel) return

  const messageCount = await db.projectChatMessage.count({ where: { channelId, deletedAt: null } })
  const latest = await db.projectChatMessage.findFirst({
    where: { channelId, deletedAt: null },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  })
  await db.projectChatChannel.update({
    where: { id: channelId },
    data: { messageCount, lastMessageAt: latest?.sentAt ?? null },
  })
}

const HANDLERS: Partial<Record<PersistedCollection, (change: RowChange, ctx: ApplyContext) => Promise<void>>> = {
  occasions: applyOccasion,
  rhythms: applyRhythm,
  sessions: applySession,
  projects: applyProject,
  issues: applyIssue,
  goals: applyGoal,
  decisions: applyDecision,
  journal: applyJournal,
  phases: applyPhase,
  milestones: applyMilestone,
  objectives: applyObjective,
  docs: applyDocument,
  commitments: applyCommitment,
  threads: applyThread,
  repos: applyEvidenceRepo,
  capacity: applyCapacity,
  timesheet: applyTimesheet,
  txns: applyTransaction,
  reimb: applyReimbursement,
  bank: applyBankEntry,
  payroll: applyPayrollDraft,
  intake: applyIntakeItem,
  periods: applyPeriod,
  contracts: applyContract,
  terms: applyContractTerm,
  accounts: applyCashAccount,
  cashConfig: applyCashAssumption,
  dayLogs: applyDayLog,
  todayIssues: applyTodayIssue,
  lineComments: applyComment,
  journalComments: applyComment,
  objectComments: applyComment,
  requests: applyRequest,
  files: applyLibraryFile,
  docObjects: applyDocObject,
  // PLN-075 S2：專案工作區五大資源
  folders: applyProjectFolder,
  phaseCycles: applyPhaseCycle,
  chatChannels: applyChatChannel,
  chatMessages: applyChatMessage,
  links: applyLinkObject,
}

/* ------------------------------------------------------------------ */
/* 進入點                                                              */
/* ------------------------------------------------------------------ */

function screen(change: RowChange): CommandRejection["code"] | null {
  if (!isPersistedCollection(change.collection)) return "unknown_collection"
  if (!WRITE_ENABLED_COLLECTIONS.includes(change.collection)) return "write_not_enabled"
  if (!HANDLERS[change.collection]) return "write_not_enabled"
  if (change.op !== "delete" && (change.after === undefined || change.after === null)) return "invalid_payload"
  return null
}

/**
 * 一筆命令裡的變更要照「被引用的先寫」的順序套用。
 *
 * diff 的輸出順序是集合名單的順序，而那份名單不是依賴順序：`phases` 排在 `projects`
 * 之前、`occasions` 排在 `folders` 之前。於是「建立專案同時建階段」或「建立會議同時
 * 建它的資料夾」會因為被引用的那一列還沒寫進來而整筆被拒。
 *
 * 只把有外鍵關係的那幾個集合往前排，其餘維持原順序（Array.prototype.sort 是穩定的）。
 */
const APPLY_PRIORITY: Partial<Record<PersistedCollection, number>> = {
  projects: 0,
  contracts: 5,
  folders: 10,
  phaseCycles: 11,
  phases: 12,
  milestones: 13,
  objectives: 14,
}

function orderByDependency(changes: RowChange[]): RowChange[] {
  return [...changes].sort(
    (a, b) => (APPLY_PRIORITY[a.collection] ?? 20) - (APPLY_PRIORITY[b.collection] ?? 20),
  )
}

/** 帳務變更在稽核裡與一般編輯分得開，事後查帳才找得到。 */
function riskLevelFor(changes: RowChange[]): "high" | "low" {
  return changes.some((change) => HIGH_RISK_COLLECTIONS.includes(change.collection)) ? "high" : "low"
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
  const ctx: ApplyContext = { workspaceId, actors, profileId: user.id, actorKey: seat.actor }

  const applied: string[] = []
  const rejected: CommandRejection[] = []

  for (const command of commands) {
    // 冪等：同一個 clientRef 已經套用過就直接回報成功，不重放它的變更。
    // 雜湊而不是原值：clientRef 由客戶端生成，不該原樣落進資料庫。
    const clientRefHash = createHash("sha256").update(command.clientRef).digest("hex")
    const seen = await db.operatingCommandLog.findUnique({
      where: { workspaceId_clientRefHash: { workspaceId, clientRefHash } },
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
      await assertJournalDeletesAreEmpty(command.changes, ctx)
      for (const change of orderByDependency(command.changes)) {
        await HANDLERS[change.collection]!(change, ctx)
      }
      applied.push(command.clientRef)

      // 紀錄寫在變更之後：套用失敗的命令不該留下「做過了」的痕跡，
      // 否則重試會被冪等檢查擋下，變成永遠補不回來的一筆。
      await db.operatingCommandLog.create({
        data: {
          workspaceId,
          clientRefHash,
          actorProfileId: user.id,
          actorKey: seat.actor,
          op: command.op,
          entity: command.ent,
          label: command.label,
          collections: [...new Set(command.changes.map((change) => change.collection))],
          changeCount: command.changes.length,
          riskLevel: riskLevelFor(command.changes),
        },
      })
    } catch (error) {
      console.warn("[operating] command failed", { clientRef: command.clientRef, error })
      // 月結擋下的變更要讓使用者知道是哪個月、為什麼，而不是「請重試」：重試不會成功。
      if (error instanceof PeriodClosedError || error instanceof ForbiddenChangeError) {
        rejected.push({
          clientRef: command.clientRef,
          code: error instanceof PeriodClosedError ? "period_closed" : "forbidden",
          message: error.message,
        })
        continue
      }
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
