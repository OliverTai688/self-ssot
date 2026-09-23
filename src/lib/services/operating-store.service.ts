import "server-only"

import { getYuanzhanSeats } from "@/lib/auth/yuanzhan-actor"
import { db } from "@/lib/db"

/**
 * 讀取路徑（PLN-074 M5）。
 *
 * 寫入走 `commit()` → diff → commands；讀取是它的鏡像：把資料庫的列還原成
 * v5 runtime 認得的 `DB` 形狀。少了這一半，寫進去的東西讀不回來，
 * 工作台每次打開都會回到 seed —— 那比不保存更糟，因為它看起來保存了。
 *
 * 兩條規則：
 *   1. 讀取不建立任何東西。沒有 workspace 就回空，不 create（ARC-040）。
 *   2. `workbench_ref` 為空的列一律略過。它們是在反查欄位存在之前寫入的，
 *      還原不出工作台需要的 id，硬塞進去只會產生指不到東西的關聯。
 */

/** 只取工作台需要的欄位形狀；與 v5-seed 的鍵名一致。 */
export type OperatingStore = Record<string, unknown>

function iso(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10) : ""
}

function dayStateSince(): Date {
  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - DAY_STATE_WINDOW_DAYS)
  return since
}

function seatKeyMap(profiles: Array<{ id: string; email: string }>): Map<string, string> {
  const seats = getYuanzhanSeats()
  const byEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), p.id]))
  const map = new Map<string, string>()
  for (const seat of seats) {
    const profileId = byEmail.get(seat.email.toLowerCase())
    if (profileId) map.set(profileId, seat.actor)
  }
  return map
}

function toActorKeys(ids: string[], seatByProfile: Map<string, string>): string[] {
  return ids.map((id) => seatByProfile.get(id)).filter((key): key is string => Boolean(key))
}

/**
 * 有 ref 才還原得回去；沒有的列在工作台裡沒有身分可言。
 *
 * 泛型刻意不加 `extends { workbenchRef }` 約束：加了之後，在 Prisma client 尚未
 * 重新產生（欄位還不在生成型別裡）時 T 會塌成約束本身，讓整個檔案的欄位存取全部報錯，
 * 把真正的錯誤埋在噪音裡。不加約束則推導保有完整的列型別。
 */
function withRef<T>(rows: T[]): Array<T & { workbenchRef: string }> {
  return (rows as Array<T & { workbenchRef: string | null }>).filter(
    (row): row is T & { workbenchRef: string } => Boolean(row.workbenchRef),
  )
}

/**
 * 今日脈絡與今日議題讀回多久。
 *
 * 這兩張表是一筆事件一列，會一直長；每次開頁都把一整年搬進瀏覽器沒有意義，
 * 日誌的日期選擇器實際上也只走得到最近這一段。超過視窗的列留在資料庫裡，
 * 不會被刪 —— 比對只發生在本地載到的列之間，沒載到的不會被當成「已刪除」送上去。
 */
const DAY_STATE_WINDOW_DAYS = 90

const PROJECT_STATUS_FALLBACK = "進行中"
const TASK_STATUS_FALLBACK = "Todo"

const OCCASION_CATEGORY_LABEL: Record<string, string> = {
  COMPANY_EVENT: "公司活動",
  CLIENT_MEETING: "客戶會議",
  TRAVEL: "出差",
  BIRTHDAY: "生日",
  VISIT: "拜訪",
  ADMIN: "行政",
}

export async function findOperatingWorkspaceId(slug: string): Promise<string | null> {
  const workspace = await db.workspace.findUnique({ where: { slug }, select: { id: true } })
  return workspace?.id ?? null
}

export async function loadOperatingStore(workspaceId: string, viewerProfileId: string): Promise<OperatingStore> {
  const seats = getYuanzhanSeats()
  const profiles = await db.profile.findMany({
    where: { email: { in: seats.map((seat) => seat.email) } },
    select: { id: true, email: true },
  })
  const seatByProfile = seatKeyMap(profiles)
  const viewerSeatKeys = [seatByProfile.get(viewerProfileId)].filter((key): key is string => Boolean(key))

  const [
    goals,
    profileRows,
    taskRows,
    phaseRows,
    milestoneRows,
    objectiveRows,
    rhythmRows,
    sessionRows,
    occasionRows,
    journalRows,
    commentRows,
    requestRows,
    decisionRows,
    documentRows,
    commitmentRows,
    threadRows,
    repoRows,
    capacityRows,
    timesheetRows,
    txnRows,
    reimbRows,
    bankRows,
    payrollRows,
    fileRows,
    docObjectRows,
    dayLogRows,
    todayIssueRows,
  ] = await Promise.all([
    db.operatingGoal.findMany({ where: { workspaceId } }),
    db.operatingProjectProfile.findMany({ include: { project: true } }),
    db.projectTask.findMany({ where: { project: { workspaceId } } }),
    db.projectPhaseNode.findMany({ where: { project: { workspaceId } } }),
    db.projectMilestone.findMany({ where: { phaseNode: { project: { workspaceId } } } }),
    db.projectObjective.findMany({ where: { milestone: { phaseNode: { project: { workspaceId } } } } }),
    db.rhythm.findMany({ where: { workspaceId } }),
    db.rhythmSession.findMany({ where: { rhythm: { workspaceId } }, include: { rhythm: true } }),
    db.occasion.findMany({ where: { workspaceId } }),
    // 私人日誌只有作者讀得到，即使同 workspace（契約 §18）。
    db.operatingJournalEntry.findMany({
      where: { workspaceId, OR: [{ visibility: "company" }, { authorId: viewerProfileId }] },
    }),
    db.operatingComment.findMany({ where: { workspaceId, deletedAt: null } }),
    db.operatingRequest.findMany({ where: { workspaceId } }),
    db.operatingDecision.findMany({ where: { workspaceId } }),
    db.operatingDocument.findMany({ where: { workspaceId } }),
    db.operatingCommitment.findMany({ where: { workspaceId } }),
    db.operatingThread.findMany({ where: { workspaceId } }),
    db.operatingEvidenceRepo.findMany({ where: { workspaceId } }),
    db.operatingCapacityPlan.findMany({ where: { workspaceId } }),
    db.operatingTimesheet.findMany({ where: { workspaceId } }),
    db.operatingTransaction.findMany({ where: { workspaceId }, orderBy: { onDate: "desc" } }),
    db.operatingReimbursement.findMany({ where: { workspaceId } }),
    db.operatingBankEntry.findMany({ where: { workspaceId }, orderBy: { onDate: "asc" } }),
    db.operatingPayrollDraft.findMany({ where: { workspaceId } }),
    // 私人文件只有作者看得到，與日誌同一條界線（契約 §18）。
    db.operatingLibraryFile.findMany({
      where: { workspaceId, OR: [{ space: "team" }, { authorKey: { in: viewerSeatKeys } }] },
    }),
    db.operatingDocObject.findMany({ where: { workspaceId } }),
    db.operatingDayLog.findMany({
      where: { workspaceId, onDate: { gte: dayStateSince() } },
      orderBy: [{ onDate: "asc" }, { atTime: "asc" }, { createdAt: "asc" }],
    }),
    db.operatingTodayIssue.findMany({
      where: { workspaceId, onDate: { gte: dayStateSince() } },
      orderBy: [{ onDate: "asc" }, { createdAt: "asc" }],
    }),
  ])

  /** 主鍵 → 工作台 id，讓子列的關聯接得回父列。 */
  const projectRefById = new Map(withRef(profileRows).map((row) => [row.projectId, row.workbenchRef]))
  const phaseRefById = new Map(withRef(phaseRows).map((row) => [row.id, row.workbenchRef]))
  const phaseProjectById = new Map(phaseRows.map((row) => [row.id, row.projectId]))
  const milestoneRefById = new Map(withRef(milestoneRows).map((row) => [row.id, row.workbenchRef]))
  const rhythmRefById = new Map(withRef(rhythmRows).map((row) => [row.id, row.workbenchRef]))

  /**
   * 日誌一定要分作者。
   *
   * 資料庫那一頭是 (workspace, author, date) 唯一，寫入也是照作者寫的；但讀回來時
   * 只用日期當鍵的話，同一天兩個人的日誌會互相覆蓋，最後由查詢順序決定誰留下來——
   * 看的人會在自己的編輯區看到對方的內容，一存檔就把它抄進自己那一列。
   *
   * `journalPeer` 只給右欄唯讀顯示用，不在可寫入的集合清單裡，所以它不會被比對、
   * 也不會被送回伺服器。
   */
  const journal: Record<string, unknown> = {}
  const journalPeer: Record<string, unknown> = {}
  for (const row of journalRows) {
    const entry = { title: row.title ?? iso(row.onDate), blocks: row.blocks, visibility: row.visibility }
    if (row.authorId === viewerProfileId) journal[iso(row.onDate)] = entry
    else journalPeer[iso(row.onDate)] = entry
  }

  const repos: Record<string, unknown> = {}
  for (const row of repoRows) {
    const ref = row.workbenchRef ?? projectRefById.get(row.projectId)
    if (!ref) continue
    repos[ref] = { version: row.version, frozen: row.frozen, readme: row.readme ?? "", versions: row.versions, tree: row.tree }
  }

  const capacity: Record<string, unknown> = {}
  for (const row of capacityRows) capacity[row.actorKey] = row.allocations
  const timesheet: Record<string, unknown> = {}
  for (const row of timesheetRows) timesheet[row.actorKey] = row.weeks

  const commentsByKind: Record<string, unknown[]> = { line: [], journal: [], object: [] }
  for (const row of commentRows) {
    const bucket = commentsByKind[row.targetType]
    if (!bucket) continue
    const meta = (row.meta ?? {}) as Record<string, unknown>
    bucket.push({
      id: row.workbenchRef ?? row.id,
      parent: row.targetRef,
      w: row.authorKey ?? "",
      author: row.authorKey ?? "",
      x: row.body,
      ts: meta.ts ?? "",
      day: meta.day ?? "",
      blockId: meta.blockId ?? "",
    })
  }

  return {
    goals: withRef(goals).map((row) => ({
      id: row.workbenchRef,
      t: row.title,
      period: row.period,
      pct: row.progressPct,
      ...(row.warning ? { warn: row.warning } : {}),
    })),

    projects: withRef(profileRows).map((row) => ({
      id: row.workbenchRef,
      t: row.project.name,
      client: row.client ?? "",
      goal: row.goalId ? (goals.find((g) => g.id === row.goalId)?.workbenchRef ?? "") : "",
      type: row.engagementType ?? "",
      owner: seatByProfile.get(row.project.ownerId) ?? "",
      status: row.operatingStatus || PROJECT_STATUS_FALLBACK,
      rate: row.bonusRatePct,
      cap: row.bonusCapPct,
      budget: row.budgetAmount,
      repo: row.evidenceRepoTag ?? "—",
      start: iso(row.startedOn) || "—",
      delivery: [],
    })),

    issues: withRef(taskRows).map((row) => ({
      id: row.workbenchRef,
      t: row.title,
      p: projectRefById.get(row.projectId) ?? "",
      owner: "",
      size: row.sizeClass ?? "M",
      st: row.operatingStatus || TASK_STATUS_FALLBACK,
      created: iso(row.createdAt),
      done: iso(row.completedAt),
      blocker: row.blocker ?? "",
      exp: row.expectation ?? "",
      ev: row.evidenceCount,
      pri: row.priority,
      due: iso(row.dueAt),
      rel: row.relations,
      cf: row.customFields,
      sub: row.subtasks,
    })),

    phases: withRef(phaseRows).map((row) => ({
      id: row.workbenchRef,
      projectId: projectRefById.get(row.projectId) ?? "",
      phase: row.phase.toLowerCase(),
      label: row.label,
      startOn: iso(row.startDate),
      endOn: iso(row.endDate),
    })),

    milestones: withRef(milestoneRows).map((row) => ({
      id: row.workbenchRef,
      projectId: projectRefById.get(phaseProjectById.get(row.phaseNodeId) ?? "") ?? "",
      phaseId: phaseRefById.get(row.phaseNodeId) ?? "",
      title: row.title,
      // 空字串＝日期待補，不進日曆 —— 與寫入端的約定相同
      dueOn: iso(row.date),
      accept: row.acceptance ?? "",
      derivedFrom: row.derivedFrom ?? "",
      remind: row.remind ?? "",
    })),

    objectives: withRef(objectiveRows).map((row) => ({
      id: row.workbenchRef,
      milestoneId: milestoneRefById.get(row.milestoneId) ?? "",
      title: row.title,
    })),

    rhythms: withRef(rhythmRows).map((row) => ({
      id: row.workbenchRef,
      title: row.title,
      kind: row.kind.toLowerCase(),
      scope: row.scope.toLowerCase(),
      ownerIds: toActorKeys(row.ownerIds, seatByProfile),
      rrule: row.rrule,
      dtstart: iso(row.dtstart),
      until: row.until ? iso(row.until) : null,
      timeOfDay: row.timeOfDay ?? "",
      timezone: row.timezone,
      expectMedia: row.expectMedia,
      derivedFrom: row.derivedFrom ?? "",
      remind: row.remind ?? "",
      active: row.active,
    })),

    sessions: sessionRows
      .filter((row) => rhythmRefById.has(row.rhythmId))
      .map((row) => ({
        rhythmId: rhythmRefById.get(row.rhythmId) ?? "",
        occurrenceDate: iso(row.occurrenceDate),
        state: row.state.toLowerCase(),
        movedTo: row.movedTo ? iso(row.movedTo) : "",
        note: row.note ?? "",
        media: [],
      })),

    occasions: withRef(occasionRows).map((row) => ({
      id: row.workbenchRef,
      title: row.title,
      cat: OCCASION_CATEGORY_LABEL[row.category] ?? "公司活動",
      onDate: iso(row.onDate),
      endOn: row.endOn ? iso(row.endOn) : "",
      place: row.place ?? "",
      actorIds: toActorKeys(row.actorIds, seatByProfile),
      projectId: row.projectId ? (projectRefById.get(row.projectId) ?? "") : "",
      star: row.star,
      prep: row.prep,
      recap: row.recap ?? "",
      media: [],
      derivedFrom: row.derivedFrom ?? "",
      remind: row.remind ?? "",
    })),

    decisions: withRef(decisionRows).map((row) => ({
      id: row.workbenchRef,
      t: row.title,
      body: row.body ?? "",
      d: iso(row.decidedOn),
    })),

    docs: withRef(documentRows).map((row) => ({
      id: row.workbenchRef,
      dir: row.direction,
      t: row.title,
      clauses: row.clauses,
    })),

    commitments: withRef(commitmentRows).map((row) => ({
      id: row.workbenchRef,
      doc: row.documentRef ?? "",
      clause: row.clauseRef ?? "",
      dir: row.direction,
      t: row.title,
      owner: row.ownerKey ?? "",
      st: row.status,
      due: row.cadence ?? "",
      logs: row.logs,
    })),

    threads: withRef(threadRows).map((row) => ({
      id: row.workbenchRef,
      p: row.projectId ? (projectRefById.get(row.projectId) ?? "") : "",
      t: row.title,
      closed: row.closed,
      msgs: row.messages,
      close: row.closeNote,
      files: row.files,
    })),

    txns: withRef(txnRows).map((row) => ({
      id: row.workbenchRef,
      d: iso(row.onDate),
      t: row.title,
      p: row.projectRef ?? "",
      cat: row.category ?? "",
      amt: row.amount,
      ...(row.formula ? { formula: row.formula } : {}),
      pass: row.passThrough,
      v: row.vouchers,
      note: row.note ?? "",
    })),

    reimb: withRef(reimbRows).map((row) => ({
      id: row.workbenchRef,
      who: row.actorKey ?? "",
      t: row.title,
      amt: row.amount,
      st: row.status,
      d: iso(row.onDate),
    })),

    bank: withRef(bankRows).map((row) => ({
      id: row.workbenchRef,
      d: iso(row.onDate),
      t: row.title,
      amt: row.amount,
      m: row.matchedRef ?? "",
    })),

    payroll: payrollRows.map((row) => ({
      who: row.actorKey,
      base: row.baseAmount,
      overtime: row.overtime,
      milestone: row.milestone,
      separate: row.separate,
    })),

    requests: withRef(requestRows).map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>
      return {
        id: row.workbenchRef,
        from: row.fromKey ?? "",
        to: row.toKey ?? "",
        day: iso(row.onDate),
        blockId: row.blockId ?? "",
        text: row.text,
        kind: row.kind,
        sentAt: row.sentAt ? row.sentAt.getTime() : 0,
        options: payload.options ?? [],
        replies: payload.replies ?? [],
        nudges: payload.nudges ?? [],
        pinged: payload.pinged ?? {},
      }
    }),

    files: withRef(fileRows).map((row) => ({
      id: row.workbenchRef,
      name: row.name,
      category: row.category,
      tags: row.tags,
      space: row.space,
      author: row.authorKey ?? "",
      versions: row.versions,
    })),

    docObjects: withRef(docObjectRows).map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>
      return {
        id: row.workbenchRef,
        type: row.kind,
        subType: row.subKind ?? row.kind,
        title: row.title,
        titleAuto: row.titleAuto,
        day: iso(row.onDate),
        author: row.authorKey ?? "",
        collapsed: payload.collapsed === true,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime(),
        secs: payload.secs ?? [],
      }
    }),

    journal,
    journalPeer,
    repos,
    capacity,
    timesheet,
    lineComments: commentsByKind.line,
    journalComments: commentsByKind.journal,
    objectComments: commentsByKind.object,

    dayLogs: withRef(dayLogRows).map((row) => ({
      id: row.workbenchRef,
      day: iso(row.onDate),
      w: row.actorKey ?? "",
      t: row.atTime,
      kind: row.kind,
      text: row.text,
    })),

    todayIssues: withRef(todayIssueRows).map((row) => ({
      id: row.workbenchRef,
      author: row.authorKey ?? "",
      day: iso(row.onDate),
      blockId: row.blockId ?? "",
      text: row.text,
      at: row.flaggedAt ? row.flaggedAt.getTime() : row.createdAt.getTime(),
      // 沒完成的議題不帶 doneAt：工作台判斷的是「這個欄位在不在」，帶個 0 會被當成已完成。
      ...(row.doneAt ? { doneAt: row.doneAt.getTime() } : {}),
      ...(row.deferred > 0 ? { deferred: row.deferred } : {}),
    })),
  }
}
