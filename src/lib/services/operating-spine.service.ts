/**
 * time_spine 的單一 writer（ARC-041 §3 · PLN-073 OPS-T22）。
 *
 * 為什麼不用 DB trigger：trigger 寫衍生表在 Prisma migration 下難以版本控管與測試，
 * 而本專案已有 service-layer authorization 慣例，把骨幹寫入收在同一層更一致。
 * 代價是「漏寫」的可能，因此配 scripts/reconcile-time-spine.ts 定期對帳。
 *
 * 語意（狀態、weight、RRULE 展開、衝期規則）一律沿用純函式層
 * `@/lib/ui-data/yuanzhan/operating-spine`，避免 UI 與 DB 兩套判斷漂移。
 */
import type { Prisma, PrismaClient } from "@prisma/client"

import { db } from "@/lib/db"
import {
  addDays,
  buildSpine,
  detectConflicts,
  toIso,
  type Conflict,
  type SpineItem,
  type SpineStore,
} from "@/lib/ui-data/yuanzhan/operating-spine"

type Db = PrismaClient | Prisma.TransactionClient

const iso = (value: Date | string | null | undefined): string =>
  !value ? "" : typeof value === "string" ? value.slice(0, 10) : toIso(value)

const date = (value: string): Date => new Date(`${value}T00:00:00.000Z`)

/* ------------------------------------------------------------------ */
/* 寫入：每個來源各一個 sync，呼叫端在同一個 transaction 裡跟著跑        */
/* ------------------------------------------------------------------ */

interface SpineRow {
  workspaceId: string
  onDate: string
  track: "PROJECT" | "RHYTHM" | "OCCASION"
  refTable: string
  refId: string
  title: string
  actorIds: string[]
  weight: number
  state: "PLANNED" | "DONE" | "LATE" | "MISSED" | "SKIPPED"
  star: boolean
  projectId: string | null
  derivedFrom: string | null
}

async function upsertRows(tx: Db, refTable: string, refId: string, rows: SpineRow[]) {
  // 先刪後寫：一筆來源可能對應多天（跨日活動），改期後舊的日期必須消失。
  await tx.timeSpine.deleteMany({
    where: { refTable, refId, onDate: { notIn: rows.map((r) => date(r.onDate)) } },
  })
  for (const row of rows) {
    const { onDate, ...rest } = row
    await tx.timeSpine.upsert({
      where: { refTable_refId_onDate: { refTable, refId, onDate: date(onDate) } },
      create: { ...rest, refTable, refId, onDate: date(onDate) },
      update: { ...rest },
    })
  }
}

export async function removeSpine(tx: Db, refTable: string, refId: string) {
  await tx.timeSpine.deleteMany({ where: { refTable, refId } })
}

export async function syncMilestone(tx: Db, milestoneId: string, today = iso(new Date())) {
  const m = await tx.projectMilestone.findUnique({
    where: { id: milestoneId },
    include: { phaseNode: { select: { projectId: true, project: { select: { workspaceId: true } } } } },
  })
  if (!m) return removeSpine(tx, "project_milestones", milestoneId)

  const workspaceId = m.phaseNode.project.workspaceId
  const on = iso(m.date)
  // 日期待補或不屬於任何 workspace 的里程碑不進骨幹（刻意不猜日期）。
  if (!on || !workspaceId) return removeSpine(tx, "project_milestones", milestoneId)

  await upsertRows(tx, "project_milestones", milestoneId, [
    {
      workspaceId,
      onDate: on,
      track: "PROJECT",
      refTable: "project_milestones",
      refId: milestoneId,
      title: m.title,
      actorIds: [],
      weight: 3,
      state: m.status === "COMPLETED" ? "DONE" : on < today ? "LATE" : "PLANNED",
      star: true,
      projectId: m.phaseNode.projectId,
      derivedFrom: m.derivedFrom ?? null,
    },
  ])
}

export async function syncTask(tx: Db, taskId: string, today = iso(new Date())) {
  const t = await tx.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { workspaceId: true } } },
  })
  if (!t) return removeSpine(tx, "project_tasks", taskId)

  const on = iso(t.dueAt ?? t.completedAt)
  const workspaceId = t.project.workspaceId
  // 沒有到期日的工作只活在看板與樹狀圖裡，不進日曆。
  if (!on || !workspaceId) return removeSpine(tx, "project_tasks", taskId)

  await upsertRows(tx, "project_tasks", taskId, [
    {
      workspaceId,
      onDate: on,
      track: "PROJECT",
      refTable: "project_tasks",
      refId: taskId,
      title: t.title,
      actorIds: [],
      weight: 1,
      state: t.status === "DONE" ? "DONE" : on < today ? "LATE" : "PLANNED",
      star: false,
      projectId: t.projectId,
      derivedFrom: null,
    },
  ])
}

export async function syncOccasion(tx: Db, occasionId: string, today = iso(new Date())) {
  const o = await tx.occasion.findUnique({ where: { id: occasionId } })
  if (!o) return removeSpine(tx, "occasions", occasionId)

  const start = iso(o.onDate)
  const end = iso(o.endOn) || start
  const rows: SpineRow[] = []
  for (let d = start; d && d <= end; d = addDays(d, 1)) {
    rows.push({
      workspaceId: o.workspaceId,
      onDate: d,
      track: "OCCASION",
      refTable: "occasions",
      refId: occasionId,
      title: o.title,
      actorIds: o.actorIds,
      weight: o.star ? 5 : 2,
      state: d < today ? "DONE" : "PLANNED",
      star: o.star,
      projectId: o.projectId,
      derivedFrom: o.derivedFrom,
    })
  }
  await upsertRows(tx, "occasions", occasionId, rows)
}

/**
 * 節奏只在「實例發生了事情」時進骨幹；未來與未覆寫的實例由查詢期展開（ARC-041 §2.1）。
 * 所以這裡同步的是 RhythmSession，不是 Rhythm。
 */
export async function syncSession(tx: Db, sessionId: string, today = iso(new Date())) {
  const s = await tx.rhythmSession.findUnique({
    where: { id: sessionId },
    include: { rhythm: true },
  })
  if (!s) return removeSpine(tx, "rhythm_sessions", sessionId)

  const on = s.state === "MOVED" ? iso(s.movedTo) : iso(s.occurrenceDate)
  if (!on) return removeSpine(tx, "rhythm_sessions", sessionId)

  const admin = s.rhythm.kind === "ADMIN"
  await upsertRows(tx, "rhythm_sessions", sessionId, [
    {
      workspaceId: s.rhythm.workspaceId,
      onDate: on,
      track: "RHYTHM",
      refTable: "rhythm_sessions",
      refId: sessionId,
      title: s.state === "MOVED" ? `${s.rhythm.title}（改期）` : s.rhythm.title,
      actorIds: s.rhythm.ownerIds,
      weight: admin ? 2 : 1,
      state: s.state === "DONE" ? "DONE" : s.state === "SKIP" ? "SKIPPED" : on < today ? "LATE" : "PLANNED",
      star: false,
      projectId: null,
      derivedFrom: s.rhythm.derivedFrom,
    },
  ])
}

/* ------------------------------------------------------------------ */
/* 讀取：DB 骨幹 ∪ 查詢期展開的節奏實例                                 */
/* ------------------------------------------------------------------ */

export interface SpineQuery {
  from: string
  to: string
  tracks?: Array<"project" | "rhythm" | "occasion">
  projectIds?: string[]
  actorIds?: string[]
}

export async function querySpine(
  workspaceId: string,
  query: SpineQuery,
  today = iso(new Date()),
  client: Db = db,
): Promise<SpineItem[]> {
  const [rows, rhythms, sessions] = await Promise.all([
    client.timeSpine.findMany({
      where: { workspaceId, onDate: { gte: date(query.from), lte: date(query.to) } },
      orderBy: [{ onDate: "asc" }, { weight: "desc" }],
    }),
    client.rhythm.findMany({ where: { workspaceId, active: true } }),
    client.rhythmSession.findMany({ where: { rhythm: { workspaceId } } }),
  ])

  const materialized: SpineItem[] = rows.map((r) => ({
    key: `${r.refTable}:${r.refId}:${iso(r.onDate)}`,
    track: r.track.toLowerCase() as SpineItem["track"],
    refType:
      r.refTable === "project_milestones"
        ? "milestone"
        : r.refTable === "project_tasks"
          ? "task"
          : r.refTable === "occasions"
            ? "occasion"
            : "session",
    refId: r.refId,
    date: iso(r.onDate),
    title: r.title,
    sub: "",
    actorIds: r.actorIds,
    weight: r.weight,
    state: r.state.toLowerCase() as SpineItem["state"],
    star: r.star,
    projectId: r.projectId ?? "",
    derivedFrom: r.derivedFrom ?? "",
    remind: "",
  }))

  // 未來／未覆寫的節奏實例：用同一份純函式展開，語意與 UI 完全一致。
  const store: SpineStore = {
    rhythms: rhythms.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind === "ADMIN" ? "admin" : "ritual",
      scope: r.scope === "PERSONAL" ? "personal" : "company",
      ownerIds: r.ownerIds,
      rrule: r.rrule,
      dtstart: iso(r.dtstart),
      until: iso(r.until) || null,
      timeOfDay: r.timeOfDay ?? "",
      expectMedia: r.expectMedia,
      derivedFrom: r.derivedFrom ?? "",
      remind: r.remind ?? "",
      active: r.active,
    })),
    sessions: sessions.map((s) => ({
      rhythmId: s.rhythmId,
      occurrenceDate: iso(s.occurrenceDate),
      state: s.state === "DONE" ? "done" : s.state === "SKIP" ? "skip" : "moved",
      movedTo: iso(s.movedTo),
    })),
  }
  const expanded = buildSpine(store, { from: query.from, to: query.to }, today, { tracks: ["rhythm"] })
  // 已經落地成 session 的實例由骨幹提供，避免重複。
  const covered = new Set(
    materialized.filter((i) => i.refType === "session").map((i) => `${i.date}|${i.title.replace("（改期）", "")}`),
  )
  const merged = [
    ...materialized,
    ...expanded.filter((i) => !covered.has(`${i.date}|${i.title.replace("（改期）", "")}`)),
  ]

  return merged
    .filter((i) => !query.tracks || query.tracks.includes(i.track))
    .filter((i) => !query.projectIds || !i.projectId || query.projectIds.includes(i.projectId))
    .filter(
      (i) => !query.actorIds || !i.actorIds.length || i.actorIds.some((a) => query.actorIds!.includes(a)),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || b.weight - a.weight)
}

/** 衝期是警示不是禁止，所以用查詢判定，不用 EXCLUDE 約束（PLN-072 §2.4）。 */
export async function conflictsFor(
  workspaceId: string,
  query: SpineQuery,
  today = iso(new Date()),
  client: Db = db,
): Promise<Conflict[]> {
  const items = await querySpine(workspaceId, query, today, client)
  const occasions = await client.occasion.findMany({
    where: { workspaceId, onDate: { lte: date(query.to) } },
  })
  return detectConflicts(items, {
    occasions: occasions.map((o) => ({
      id: o.id,
      title: o.title,
      cat: o.category,
      onDate: iso(o.onDate),
      endOn: iso(o.endOn) || iso(o.onDate),
      star: o.star,
    })),
  })
}

/* ------------------------------------------------------------------ */
/* 對帳：防止單一 writer 漏寫造成骨幹與來源漂移                          */
/* ------------------------------------------------------------------ */

export interface ReconcileDiff {
  missing: Array<{ refTable: string; refId: string; onDate: string }>
  stale: Array<{ refTable: string; refId: string; onDate: string }>
  wrong: Array<{ refTable: string; refId: string; onDate: string; field: string }>
}

/** 重算整個 workspace 的骨幹並與現況 diff；`apply` 為 true 時順手修好。 */
export async function reconcileWorkspace(
  workspaceId: string,
  apply = false,
  today = iso(new Date()),
  client: PrismaClient = db,
): Promise<ReconcileDiff> {
  const before = await client.timeSpine.findMany({ where: { workspaceId } })
  const key = (t: string, i: string, d: string) => `${t}|${i}|${d}`
  const beforeMap = new Map(before.map((r) => [key(r.refTable, r.refId, iso(r.onDate)), r]))

  const [milestones, tasks, occasions, sessions] = await Promise.all([
    client.projectMilestone.findMany({ where: { phaseNode: { project: { workspaceId } } }, select: { id: true } }),
    client.projectTask.findMany({ where: { project: { workspaceId } }, select: { id: true } }),
    client.occasion.findMany({ where: { workspaceId }, select: { id: true } }),
    client.rhythmSession.findMany({ where: { rhythm: { workspaceId } }, select: { id: true } }),
  ])

  await client.$transaction(async (tx) => {
    for (const m of milestones) await syncMilestone(tx, m.id, today)
    for (const t of tasks) await syncTask(tx, t.id, today)
    for (const o of occasions) await syncOccasion(tx, o.id, today)
    for (const s of sessions) await syncSession(tx, s.id, today)
  })

  const after = await client.timeSpine.findMany({ where: { workspaceId } })
  const afterMap = new Map(after.map((r) => [key(r.refTable, r.refId, iso(r.onDate)), r]))

  const diff: ReconcileDiff = { missing: [], stale: [], wrong: [] }
  for (const [k, row] of afterMap) {
    const old = beforeMap.get(k)
    const [refTable, refId, onDate] = k.split("|")
    if (!old) {
      diff.missing.push({ refTable, refId, onDate })
      continue
    }
    for (const field of ["title", "weight", "state", "star", "projectId", "derivedFrom"] as const) {
      if (String(old[field] ?? "") !== String(row[field] ?? "")) diff.wrong.push({ refTable, refId, onDate, field })
    }
  }
  for (const [k] of beforeMap) {
    if (afterMap.has(k)) continue
    const [refTable, refId, onDate] = k.split("|")
    diff.stale.push({ refTable, refId, onDate })
  }

  if (!apply) {
    // dry-run：把骨幹還原回對帳前的狀態
    await client.$transaction(async (tx) => {
      await tx.timeSpine.deleteMany({ where: { workspaceId } })
      if (before.length) {
        await tx.timeSpine.createMany({
          data: before.map(({ id: _id, updatedAt: _updatedAt, ...rest }) => rest),
        })
      }
    })
  }

  return diff
}
