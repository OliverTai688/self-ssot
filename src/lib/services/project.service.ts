import type {
  DeliverableNodeType,
  DeliverableStatus,
  NoteOrigin,
  NoteSource,
  ProjectHealth,
  ProjectPhase,
  ProjectStatus,
  TaskSource,
  TaskStatus,
  VisibilityType,
} from "@prisma/client"
import { cache } from "react"

import { db } from "@/lib/db"
import { resolveOwnerWorkspaceId } from "@/lib/services/project-capability.service"

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized to access this project") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

export class NotFoundError extends Error {
  constructor(message = "Project not found") {
    super(message)
    this.name = "NotFoundError"
  }
}

/**
 * 專案與公司工作區的綁定失敗。帶 `code` 讓呼叫端可判讀（不要只丟字串）。
 *
 * - `no_workspace_membership`：這個帳號沒有任何可用的公司 workspace membership。
 *   **必須明確失敗**：靜默建出一個 `workspaceId = null` 的私人專案，就是 Wave 2a
 *   要修掉的 P0——那樣的專案接不上五大資源裡的任何一個。
 * - `client_supplied_scope`：呼叫端試圖自己指定 `workspaceId`／`accessMode`／`ownerId`。
 *   授權範圍只能由伺服器解析。
 */
export type ProjectWorkspaceBindingErrorCode =
  | "no_workspace_membership"
  | "client_supplied_scope"

export class ProjectWorkspaceBindingError extends Error {
  readonly code: ProjectWorkspaceBindingErrorCode

  constructor(code: ProjectWorkspaceBindingErrorCode, message: string) {
    super(message)
    this.name = "ProjectWorkspaceBindingError"
    this.code = code
  }
}

/**
 * 只有伺服器能決定的欄位。出現在呼叫端 payload 裡就是個錯誤，不是可以忽略的雜訊：
 * 它代表某條路徑把範圍決定權交了出去（與
 * `src/app/api/company/operating/uploads/route.ts` 的 `resolveActor()` 同一條規則）。
 */
const SERVER_RESOLVED_PROJECT_KEYS = ["workspaceId", "accessMode", "ownerId"] as const

function assertNoClientSuppliedScope(input: object) {
  for (const key of SERVER_RESOLVED_PROJECT_KEYS) {
    if (key in input) {
      throw new ProjectWorkspaceBindingError(
        "client_supplied_scope",
        `${key} 由伺服器解析，不接受呼叫端指定。`
      )
    }
  }
}

export async function assertCanAccessProject(profileId: string, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  })

  if (!project) {
    throw new NotFoundError()
  }

  if (project.ownerId !== profileId) {
    throw new UnauthorizedError()
  }

  return true
}

export async function getProjectsForProfile(profileId: string) {
  return await db.project.findMany({
    where: { ownerId: profileId },
    include: {
      tasks: {
        select: { status: true },
      },
    },
    orderBy: { updatedAt: 'desc' }
  })
}

export const getProjectCountForProfile = cache(async (profileId: string) => {
  return await db.project.count({
    where: { ownerId: profileId },
  })
})

export async function getProjectDetailForProfile(profileId: string, projectId: string) {
  await assertCanAccessProject(profileId, projectId)

  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: true,
      notes: true,
      deliverables: true
    }
  })

  if (!p) throw new NotFoundError()
  return p
}

export async function deleteProjectForProfile(profileId: string, projectId: string) {
  await assertCanAccessProject(profileId, projectId)
  await db.project.delete({ where: { id: projectId } })
}

export interface CreateProjectForProfileInput {
  name: string
  clientName?: string | null
  description?: string | null
  status?: ProjectStatus
  phase?: ProjectPhase
  health?: ProjectHealth
  visibility?: VisibilityType
  dueAt?: Date | null
}

/**
 * 建立專案。
 *
 * **P0 修正（PLN-075 S2 Wave 2a）**：這裡原本完全沒有寫 `workspaceId`。
 * `Project.workspaceId` 可空、`accessMode` 預設 `PRIVATE`，所以每一個新建專案
 * 都是「掛不上任何公司資源的私人專案」——硬碟、聊天、會議、計劃、專案本體
 * 五大資源一個都接不上，而且症狀要到使用者開硬碟時才出現。
 *
 * 現在 workspaceId **由伺服器端解析**（`resolveOwnerWorkspaceId()`，走 membership
 * 關聯、不做公司名稱字串比對），並一併設 `accessMode: WORKSPACE_VISIBLE`。
 * 呼叫端不能、也不會傳 workspaceId：`CreateProjectForProfileInput` 沒有這個欄位，
 * 且 `assertNoClientSuppliedScope()` 在執行期再擋一次。
 *
 * 沒有任何公司 workspace membership 時**丟錯**，不退回私人專案。
 */
export async function createProjectForProfile(profileId: string, input: CreateProjectForProfileInput) {
  assertNoClientSuppliedScope(input)

  const workspaceId = await resolveOwnerWorkspaceId(profileId)

  if (!workspaceId) {
    throw new ProjectWorkspaceBindingError(
      "no_workspace_membership",
      "這個帳號還沒有可用的公司工作區成員資格，無法建立專案。請先加入公司工作區（圓展教育科技有限公司）後再試。"
    )
  }

  return await db.project.create({
    data: {
      ownerId: profileId,
      workspaceId,
      accessMode: "WORKSPACE_VISIBLE",
      name: input.name,
      clientName: input.clientName,
      description: input.description,
      status: input.status,
      phase: input.phase,
      health: input.health,
      visibility: input.visibility,
      dueAt: input.dueAt,
    },
  })
}

/**
 * 冪等地把 `Project.workspaceId` 由 null 綁定到這個人的公司 workspace（OD-C）。
 *
 * 呼叫時機：開啟專案硬碟（或任何需要公司資源的入口）。既有專案是在 P0 修正之前
 * 建出來的，`workspaceId` 一律是 null；要它們接上五大資源，只能在使用時補綁。
 *
 * 冪等保證：
 * - **只在 `workspaceId IS NULL` 時寫**。`updateMany` 的 where 帶 `workspaceId: null`，
 *   所以兩個請求同時進來只有一個會寫到（`count === 1`），另一個讀回已綁的值。
 * - 已綁定則一個欄位都不動，直接回傳現有的 workspaceId。
 * - `accessMode` 只在同一次綁定裡從 `PRIVATE` 升為 `WORKSPACE_VISIBLE`：
 *   `workspaceId` 是 null 的時候 `PRIVATE` 不帶任何資訊（沒有工作區可以被看見），
 *   所以那不是一個刻意的隱私設定，而正是 P0 留下的未設定狀態。
 *   已經綁了工作區卻刻意設 `PRIVATE` 的專案不在這條路徑上，不會被動到。
 *
 * 授權：沿用 `assertCanAccessProject()`（擁有者精確比對）。綁定是擁有者層級的動作，
 * 不開放給 membership 或 grant 的持有者。
 */
export async function ensureProjectWorkspaceBinding(
  profileId: string,
  projectId: string
): Promise<string> {
  await assertCanAccessProject(profileId, projectId)

  const existing = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })

  if (!existing) {
    throw new NotFoundError()
  }

  if (existing.workspaceId) {
    return existing.workspaceId
  }

  const workspaceId = await resolveOwnerWorkspaceId(profileId)

  if (!workspaceId) {
    throw new ProjectWorkspaceBindingError(
      "no_workspace_membership",
      "這個帳號還沒有可用的公司工作區成員資格，無法把專案綁定到公司。請先加入公司工作區（圓展教育科技有限公司）後再試。"
    )
  }

  const bound = await db.project.updateMany({
    where: { id: projectId, workspaceId: null },
    data: { workspaceId, accessMode: "WORKSPACE_VISIBLE" },
  })

  if (bound.count === 1) {
    return workspaceId
  }

  // 併發：另一個請求先綁好了。以資料庫裡的值為準，不覆寫。
  const current = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  })

  if (!current?.workspaceId) {
    throw new NotFoundError()
  }

  return current.workspaceId
}

export interface UpdateProjectForProfileInput {
  name?: string
  clientName?: string | null
  description?: string | null
  status?: ProjectStatus
  phase?: ProjectPhase
  health?: ProjectHealth
  visibility?: VisibilityType
  dueAt?: Date | null
  nextAction?: string | null
  companyAxis?: string | null
}

export async function updateProjectForProfile(
  profileId: string,
  projectId: string,
  input: UpdateProjectForProfileInput
) {
  await assertCanAccessProject(profileId, projectId)

  return await db.project.update({
    where: { id: projectId },
    data: input,
  })
}

export interface CreateTaskForProjectInput {
  title: string
  body?: string | null
  status?: TaskStatus
  visibility?: VisibilityType
  priority?: number
  source?: TaskSource
  dueAt?: Date | null
}

export async function createTaskForProject(
  profileId: string,
  projectId: string,
  input: CreateTaskForProjectInput
) {
  await assertCanAccessProject(profileId, projectId)

  return await db.projectTask.create({
    data: {
      projectId,
      title: input.title,
      body: input.body,
      status: input.status,
      visibility: input.visibility,
      priority: input.priority,
      source: input.source,
      dueAt: input.dueAt,
    },
  })
}

async function getTaskForProfile(profileId: string, taskId: string) {
  const task = await db.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { ownerId: true } } },
  })

  if (!task) {
    throw new NotFoundError("Task not found")
  }

  if (task.project.ownerId !== profileId) {
    throw new UnauthorizedError("Unauthorized to access this task")
  }

  return task
}

export interface UpdateTaskForProfileInput {
  title?: string
  body?: string | null
  status?: TaskStatus
  visibility?: VisibilityType
  priority?: number
  source?: TaskSource
  dueAt?: Date | null
  completedAt?: Date | null
}

export async function updateTaskForProfile(
  profileId: string,
  taskId: string,
  input: UpdateTaskForProfileInput
) {
  await getTaskForProfile(profileId, taskId)

  return await db.projectTask.update({
    where: { id: taskId },
    data: input,
  })
}

export async function toggleTaskCompleteForProfile(profileId: string, taskId: string) {
  const task = await getTaskForProfile(profileId, taskId)
  const isDone = task.status === "DONE"

  return await db.projectTask.update({
    where: { id: taskId },
    data: {
      status: isDone ? "TODO" : "DONE",
      completedAt: isDone ? null : new Date(),
    },
  })
}

export async function deleteTaskForProfile(profileId: string, taskId: string) {
  const task = await getTaskForProfile(profileId, taskId)
  await db.projectTask.delete({ where: { id: taskId } })
  return task.projectId
}

export interface CreateNoteForProjectInput {
  title?: string | null
  body: string
  source?: NoteSource
  visibility?: VisibilityType
  origin?: NoteOrigin
  isPinned?: boolean
}

export async function createNoteForProject(
  profileId: string,
  projectId: string,
  input: CreateNoteForProjectInput
) {
  await assertCanAccessProject(profileId, projectId)

  return await db.projectNote.create({
    data: {
      projectId,
      title: input.title,
      body: input.body,
      source: input.source,
      visibility: input.visibility,
      origin: input.origin,
      isPinned: input.isPinned,
    },
  })
}

async function getNoteForProfile(profileId: string, noteId: string) {
  const note = await db.projectNote.findUnique({
    where: { id: noteId },
    include: { project: { select: { ownerId: true } } },
  })

  if (!note) {
    throw new NotFoundError("Note not found")
  }

  if (note.project.ownerId !== profileId) {
    throw new UnauthorizedError("Unauthorized to access this note")
  }

  return note
}

export interface UpdateNoteForProfileInput {
  title?: string | null
  body?: string
  source?: NoteSource
  visibility?: VisibilityType
  origin?: NoteOrigin
  isPinned?: boolean
}

export async function updateNoteForProfile(
  profileId: string,
  noteId: string,
  input: UpdateNoteForProfileInput
) {
  await getNoteForProfile(profileId, noteId)

  return await db.projectNote.update({
    where: { id: noteId },
    data: input,
  })
}

export async function toggleNotePinForProfile(profileId: string, noteId: string) {
  const note = await getNoteForProfile(profileId, noteId)

  return await db.projectNote.update({
    where: { id: noteId },
    data: { isPinned: !note.isPinned },
  })
}

export async function deleteNoteForProfile(profileId: string, noteId: string) {
  const note = await getNoteForProfile(profileId, noteId)
  await db.projectNote.delete({ where: { id: noteId } })
  return note.projectId
}

export async function createDeliverableForProject(
  profileId: string,
  projectId: string,
  input: {
    title: string
    description?: string | null
    nodeType: DeliverableNodeType
    parentId?: string | null
    status?: DeliverableStatus
    visibility?: VisibilityType
    deliveredAt?: Date | null
  }
) {
  await assertCanAccessProject(profileId, projectId)
  await assertDeliverableParentInProject(projectId, input.parentId)

  return await db.projectDeliverable.create({
    data: {
      projectId,
      title: input.title,
      description: input.description,
      nodeType: input.nodeType,
      parentId: input.parentId,
      status: input.status,
      visibility: input.visibility,
      deliveredAt: input.deliveredAt,
    }
  })
}

async function assertDeliverableParentInProject(projectId: string, parentId?: string | null) {
  if (!parentId) return

  const parent = await db.projectDeliverable.findUnique({
    where: { id: parentId },
    select: { projectId: true, nodeType: true },
  })

  if (!parent) {
    throw new NotFoundError("Parent deliverable not found")
  }

  if (parent.projectId !== projectId) {
    throw new UnauthorizedError("Parent deliverable belongs to a different project")
  }

  if (parent.nodeType !== "FOLDER") {
    throw new Error("Parent deliverable must be a folder")
  }
}

async function getDeliverableForProfile(profileId: string, deliverableId: string) {
  const deliverable = await db.projectDeliverable.findUnique({
    where: { id: deliverableId },
    include: { project: { select: { ownerId: true } } },
  })

  if (!deliverable) {
    throw new NotFoundError("Deliverable not found")
  }

  if (deliverable.project.ownerId !== profileId) {
    throw new UnauthorizedError("Unauthorized to access this deliverable")
  }

  return deliverable
}

export interface UpdateDeliverableForProfileInput {
  title?: string
  description?: string | null
  status?: DeliverableStatus
  visibility?: VisibilityType
  deliveredAt?: Date | null
}

export async function updateDeliverableForProfile(
  profileId: string,
  deliverableId: string,
  input: UpdateDeliverableForProfileInput
) {
  await getDeliverableForProfile(profileId, deliverableId)

  return await db.projectDeliverable.update({
    where: { id: deliverableId },
    data: input,
  })
}

export async function updateDeliverableVisibilityForProfile(
  profileId: string,
  deliverableId: string,
  visibility: VisibilityType
) {
  return await updateDeliverableForProfile(profileId, deliverableId, { visibility })
}

export async function deleteDeliverableForProfile(profileId: string, deliverableId: string) {
  const deliverable = await getDeliverableForProfile(profileId, deliverableId)
  await db.projectDeliverable.delete({ where: { id: deliverableId } })
  return deliverable.projectId
}
