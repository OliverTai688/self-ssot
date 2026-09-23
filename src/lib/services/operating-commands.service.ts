import "server-only"

import { createHash } from "node:crypto"

import type { Prisma } from "@prisma/client"

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
  暫停: { status: "PAUSED", phase: "PLANNING" },
}

const TASK_STATUS_MAP: Record<string, "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED"> = {
  Todo: "TODO",
  Doing: "IN_PROGRESS",
  // TaskStatus 沒有 REVIEW；原字串保留在 operatingStatus，列舉取最接近的。
  Review: "IN_PROGRESS",
  Done: "DONE",
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

  await db.project.upsert({ where: { id }, create: { id, ...core }, update: core })

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

async function applyIssue(change: RowChange, _ctx: ApplyContext): Promise<void> {
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

  const operatingStatus = str(row.st) ?? "Todo"
  const data = {
    projectId,
    title: str(row.t) ?? "（未命名）",
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

  const start = toDateOnly(row.startOn) ?? new Date()
  const data = {
    projectId,
    phase: toPhaseValue(row.phase),
    label: str(row.label) ?? "（未命名階段）",
    startDate: start,
    endDate: toDateOnly(row.endOn) ?? start,
  }
  await db.projectPhaseNode.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyMilestone(change: RowChange, _ctx: ApplyContext): Promise<void> {
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
    note: str(row.note),
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
  const data = {
    workspaceId: ctx.workspaceId,
    actorKey: str(row.who),
    title: str(row.t) ?? "（未命名報帳）",
    amount: toAmount(row.amt),
    status: str(row.st) ?? "待送",
    onDate: toDateOnly(row.d),
  }
  await db.operatingReimbursement.upsert({ where: { id }, create: { id, ...data, workbenchRef: change.id }, update: { ...data, workbenchRef: change.id } })
}

async function applyBankEntry(change: RowChange, ctx: ApplyContext): Promise<void> {
  const id = rowUuid("bank", change.id)
  if (change.op === "delete") {
    await db.operatingBankEntry.deleteMany({ where: { id, workspaceId: ctx.workspaceId } })
    return
  }
  const row = (change.after ?? {}) as Record<string, unknown>
  const onDate = toDateOnly(row.d)
  if (!onDate) throw new Error(`bank entry ${change.id} has no usable date`)

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
    meta: toJson({ ts: row.ts ?? null, day: row.day ?? null, blockId: row.blockId ?? null }, {}),
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
    // options／replies／nudges／pinged 形狀仍在演進，整包存比拆表安全
    payload: toJson(
      { options: row.options ?? [], replies: row.replies ?? [], nudges: row.nudges ?? [], pinged: row.pinged ?? {} },
      {},
    ),
  }

  await db.operatingRequest.upsert({ where: { id }, create: { id, ...data }, update: data })
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
  lineComments: applyComment,
  journalComments: applyComment,
  objectComments: applyComment,
  requests: applyRequest,
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
          riskLevel: riskLevelFor(command.changes),
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
