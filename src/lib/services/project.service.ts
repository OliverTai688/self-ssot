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

export async function createProjectForProfile(profileId: string, input: CreateProjectForProfileInput) {
  return await db.project.create({
    data: {
      ownerId: profileId,
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
