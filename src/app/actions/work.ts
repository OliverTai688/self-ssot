"use server"

import type {
  DeliverableNodeType as DbDeliverableNodeType,
  DeliverableStatus as DbDeliverableStatus,
  NoteOrigin as DbNoteOrigin,
  NoteSource as DbNoteSource,
  ProjectHealth as DbProjectHealth,
  ProjectPhase as DbProjectPhase,
  ProjectStatus as DbProjectStatus,
  TaskSource as DbTaskSource,
  TaskStatus as DbTaskStatus,
  VisibilityType as DbVisibilityType,
} from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  toDeliverableViewModel,
  toNoteViewModel,
  toProjectViewModel,
  toTaskViewModel,
} from "@/lib/mappers/work.mapper"
import { requireUser } from "@/lib/services/auth.service"
import {
  createDeliverableForProject,
  createNoteForProject,
  createProjectForProfile,
  createTaskForProject,
  deleteDeliverableForProfile,
  deleteNoteForProfile,
  deleteProjectForProfile,
  deleteTaskForProfile,
  getProjectDetailForProfile,
  getProjectsForProfile,
  NotFoundError,
  toggleNotePinForProfile,
  toggleTaskCompleteForProfile,
  UnauthorizedError,
  updateDeliverableForProfile,
  updateDeliverableVisibilityForProfile,
  updateNoteForProfile,
  updateProjectForProfile,
  updateTaskForProfile,
} from "@/lib/services/project.service"
import type {
  DeliverableVisibility,
  Project,
  ProjectDeliverable,
  ProjectNote,
  ProjectTask,
} from "@/types/work"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

const IdSchema = z.string().uuid()

const OptionalTextSchema = z.string().trim().optional().nullable()
const OptionalDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "日期格式錯誤")

const ProjectStatusSchema = z.enum(["exploring", "active", "paused", "completed", "archived"])
const ProjectPhaseSchema = z.enum(["discovery", "planning", "execution", "review", "maintenance"])
const ProjectHealthSchema = z.enum(["good", "watch", "risk"])
const ProjectVisibilitySchema = z.enum(["internal", "client_shared"])
const TaskStatusSchema = z.enum(["todo", "in_progress", "done", "blocked"])
const TaskSourceSchema = z.enum(["manual", "ai_suggested", "triage", "client_request"])
const WorkItemVisibilitySchema = z.enum(["internal", "client_visible"])
const NoteSourceSchema = z.enum(["line", "email", "meeting", "internal"])
const NoteOriginSchema = z.enum(["ai", "manual"])
const DeliverableNodeTypeSchema = z.enum(["folder", "file"])
const DeliverableStatusSchema = z.enum(["draft", "delivered", "approved"])

const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, "專案名稱不能為空"),
  clientName: OptionalTextSchema,
  description: OptionalTextSchema,
  status: ProjectStatusSchema.optional(),
  phase: ProjectPhaseSchema.optional(),
  health: ProjectHealthSchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  dueAt: OptionalDateSchema,
})

const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  id: IdSchema,
  nextAction: OptionalTextSchema,
  companyAxis: OptionalTextSchema,
})

const AddTaskSchema = z.object({
  title: z.string().trim().min(1, "任務名稱不能為空"),
  body: OptionalTextSchema,
  status: TaskStatusSchema.optional(),
  visibility: WorkItemVisibilitySchema.optional(),
  priority: z.number().int().min(1).max(3).optional(),
  source: TaskSourceSchema.optional(),
  dueAt: OptionalDateSchema,
})

const UpdateTaskSchema = AddTaskSchema.partial().extend({
  completedAt: OptionalDateSchema,
})

const AddNoteSchema = z.object({
  title: OptionalTextSchema,
  body: z.string().trim().min(1, "紀錄內容不能為空"),
  source: NoteSourceSchema.optional(),
  visibility: WorkItemVisibilitySchema.optional(),
  origin: NoteOriginSchema.optional(),
  isPinned: z.boolean().optional(),
})

const UpdateNoteSchema = AddNoteSchema.partial()

const CreateDeliverableSchema = z.object({
  title: z.string().trim().min(1, "交付物名稱不能為空"),
  description: OptionalTextSchema,
  type: DeliverableNodeTypeSchema.optional(),
  parentId: IdSchema.optional().nullable(),
  status: DeliverableStatusSchema.optional(),
  visibility: WorkItemVisibilitySchema.optional(),
  deliveredAt: OptionalDateSchema,
})

const UpdateDeliverableSchema = CreateDeliverableSchema.partial().omit({
  type: true,
  parentId: true,
})

function emptyToNull(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null) return null
  return value.trim() || null
}

function optionalDate(value: string | null | undefined) {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  return new Date(value)
}

function upperEnum<T extends string>(value: string | undefined) {
  return value ? (value.toUpperCase() as T) : undefined
}

function toDbTaskStatus(value: z.infer<typeof TaskStatusSchema> | undefined): DbTaskStatus | undefined {
  return value ? (value.toUpperCase() as DbTaskStatus) : undefined
}

function toDbTaskSource(value: z.infer<typeof TaskSourceSchema> | undefined): DbTaskSource | undefined {
  return value ? (value.toUpperCase() as DbTaskSource) : undefined
}

function toDbVisibility(
  value: z.infer<typeof WorkItemVisibilitySchema> | z.infer<typeof ProjectVisibilitySchema> | undefined
): DbVisibilityType | undefined {
  if (!value) return undefined
  return value === "internal" ? "INTERNAL_ONLY" : "CLIENT_VISIBLE"
}

function toDbDeliverableNodeType(
  value: z.infer<typeof DeliverableNodeTypeSchema> | undefined
): DbDeliverableNodeType | undefined {
  return upperEnum<DbDeliverableNodeType>(value)
}

function toDbDeliverableStatus(
  value: z.infer<typeof DeliverableStatusSchema> | undefined
): DbDeliverableStatus | undefined {
  return upperEnum<DbDeliverableStatus>(value)
}

function validationError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Validation error"
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
    return "資料不存在或沒有權限"
  }

  console.error(error)
  return fallback
}

function revalidateWorkProject(projectId: string) {
  revalidatePath("/work")
  revalidatePath(`/work/${projectId}`)
}

export async function getProjects(): Promise<Project[]> {
  const user = await requireUser()
  const projects = await getProjectsForProfile(user.id)
  return projects.map(toProjectViewModel)
}

export async function getProjectById(id: string): Promise<{
  project: Project
  tasks: ProjectTask[]
  notes: ProjectNote[]
  deliverables: ProjectDeliverable[]
} | null> {
  const user = await requireUser()

  try {
    const project = await getProjectDetailForProfile(user.id, id)
    return {
      project: toProjectViewModel(project),
      tasks: project.tasks.map(toTaskViewModel),
      notes: project.notes.map(toNoteViewModel),
      deliverables: project.deliverables.map(toDeliverableViewModel),
    }
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
      return null
    }
    throw error
  }
}

export async function createProject(
  input: z.infer<typeof CreateProjectSchema>
): Promise<ActionResult<Project>> {
  const parsed = CreateProjectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const project = await createProjectForProfile(user.id, {
      name: parsed.data.name,
      clientName: emptyToNull(parsed.data.clientName),
      description: emptyToNull(parsed.data.description),
      status: upperEnum<DbProjectStatus>(parsed.data.status),
      phase: upperEnum<DbProjectPhase>(parsed.data.phase),
      health: upperEnum<DbProjectHealth>(parsed.data.health),
      visibility: toDbVisibility(parsed.data.visibility),
      dueAt: optionalDate(parsed.data.dueAt),
    })

    revalidatePath("/work")
    return { success: true, data: toProjectViewModel(project) }
  } catch (error) {
    return { success: false, error: actionError(error, "建立專案失敗") }
  }
}

export async function updateProject(
  input: z.infer<typeof UpdateProjectSchema>
): Promise<ActionResult<Project>> {
  const parsed = UpdateProjectSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const { id, ...data } = parsed.data
    const project = await updateProjectForProfile(user.id, id, {
      name: data.name,
      clientName: emptyToNull(data.clientName),
      description: emptyToNull(data.description),
      status: upperEnum<DbProjectStatus>(data.status),
      phase: upperEnum<DbProjectPhase>(data.phase),
      health: upperEnum<DbProjectHealth>(data.health),
      visibility: toDbVisibility(data.visibility),
      dueAt: optionalDate(data.dueAt),
      nextAction: emptyToNull(data.nextAction),
      companyAxis: emptyToNull(data.companyAxis),
    })

    revalidateWorkProject(id)
    return { success: true, data: toProjectViewModel(project) }
  } catch (error) {
    return { success: false, error: actionError(error, "更新專案失敗") }
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult<void>> {
  const parsed = IdSchema.safeParse(projectId)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    await deleteProjectForProfile(user.id, parsed.data)
    revalidatePath("/work")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: actionError(error, "刪除專案失敗") }
  }
}

export async function addProjectTask(
  projectId: string,
  input: z.infer<typeof AddTaskSchema>
): Promise<ActionResult<ProjectTask>> {
  const parsedProjectId = IdSchema.safeParse(projectId)
  if (!parsedProjectId.success) return { success: false, error: validationError(parsedProjectId.error) }

  const parsed = AddTaskSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const task = await createTaskForProject(user.id, parsedProjectId.data, {
      title: parsed.data.title,
      body: emptyToNull(parsed.data.body),
      status: toDbTaskStatus(parsed.data.status),
      visibility: toDbVisibility(parsed.data.visibility),
      priority: parsed.data.priority,
      source: toDbTaskSource(parsed.data.source),
      dueAt: optionalDate(parsed.data.dueAt),
    })

    revalidateWorkProject(parsedProjectId.data)
    return { success: true, data: toTaskViewModel(task) }
  } catch (error) {
    return { success: false, error: actionError(error, "新增任務失敗") }
  }
}

export async function toggleProjectTaskComplete(taskId: string): Promise<ActionResult<ProjectTask>> {
  const parsed = IdSchema.safeParse(taskId)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const task = await toggleTaskCompleteForProfile(user.id, parsed.data)
    revalidateWorkProject(task.projectId)
    return { success: true, data: toTaskViewModel(task) }
  } catch (error) {
    return { success: false, error: actionError(error, "切換任務狀態失敗") }
  }
}

export async function updateProjectTask(
  taskId: string,
  input: z.infer<typeof UpdateTaskSchema>
): Promise<ActionResult<ProjectTask>> {
  const parsedTaskId = IdSchema.safeParse(taskId)
  if (!parsedTaskId.success) return { success: false, error: validationError(parsedTaskId.error) }

  const parsed = UpdateTaskSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const task = await updateTaskForProfile(user.id, parsedTaskId.data, {
      title: parsed.data.title,
      body: emptyToNull(parsed.data.body),
      status: toDbTaskStatus(parsed.data.status),
      visibility: toDbVisibility(parsed.data.visibility),
      priority: parsed.data.priority,
      source: toDbTaskSource(parsed.data.source),
      dueAt: optionalDate(parsed.data.dueAt),
      completedAt: optionalDate(parsed.data.completedAt),
    })

    revalidateWorkProject(task.projectId)
    return { success: true, data: toTaskViewModel(task) }
  } catch (error) {
    return { success: false, error: actionError(error, "更新任務失敗") }
  }
}

export async function deleteProjectTask(taskId: string): Promise<ActionResult<void>> {
  const parsed = IdSchema.safeParse(taskId)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const projectId = await deleteTaskForProfile(user.id, parsed.data)
    revalidateWorkProject(projectId)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: actionError(error, "刪除任務失敗") }
  }
}

export async function addProjectNote(
  projectId: string,
  input: z.infer<typeof AddNoteSchema>
): Promise<ActionResult<ProjectNote>> {
  const parsedProjectId = IdSchema.safeParse(projectId)
  if (!parsedProjectId.success) return { success: false, error: validationError(parsedProjectId.error) }

  const parsed = AddNoteSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const note = await createNoteForProject(user.id, parsedProjectId.data, {
      title: emptyToNull(parsed.data.title),
      body: parsed.data.body,
      source: upperEnum<DbNoteSource>(parsed.data.source),
      visibility: toDbVisibility(parsed.data.visibility),
      origin: upperEnum<DbNoteOrigin>(parsed.data.origin),
      isPinned: parsed.data.isPinned,
    })

    revalidateWorkProject(parsedProjectId.data)
    return { success: true, data: toNoteViewModel(note) }
  } catch (error) {
    return { success: false, error: actionError(error, "新增紀錄失敗") }
  }
}

export async function toggleProjectNotePin(noteId: string): Promise<ActionResult<ProjectNote>> {
  const parsed = IdSchema.safeParse(noteId)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const note = await toggleNotePinForProfile(user.id, parsed.data)
    revalidateWorkProject(note.projectId)
    return { success: true, data: toNoteViewModel(note) }
  } catch (error) {
    return { success: false, error: actionError(error, "切換釘選狀態失敗") }
  }
}

export async function updateProjectNote(
  noteId: string,
  input: z.infer<typeof UpdateNoteSchema>
): Promise<ActionResult<ProjectNote>> {
  const parsedNoteId = IdSchema.safeParse(noteId)
  if (!parsedNoteId.success) return { success: false, error: validationError(parsedNoteId.error) }

  const parsed = UpdateNoteSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const note = await updateNoteForProfile(user.id, parsedNoteId.data, {
      title: emptyToNull(parsed.data.title),
      body: parsed.data.body,
      source: upperEnum<DbNoteSource>(parsed.data.source),
      visibility: toDbVisibility(parsed.data.visibility),
      origin: upperEnum<DbNoteOrigin>(parsed.data.origin),
      isPinned: parsed.data.isPinned,
    })

    revalidateWorkProject(note.projectId)
    return { success: true, data: toNoteViewModel(note) }
  } catch (error) {
    return { success: false, error: actionError(error, "更新紀錄失敗") }
  }
}

export async function deleteProjectNote(noteId: string): Promise<ActionResult<void>> {
  const parsed = IdSchema.safeParse(noteId)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const projectId = await deleteNoteForProfile(user.id, parsed.data)
    revalidateWorkProject(projectId)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: actionError(error, "刪除紀錄失敗") }
  }
}

export async function createProjectDeliverable(
  projectId: string,
  input: z.infer<typeof CreateDeliverableSchema>
): Promise<ActionResult<ProjectDeliverable>> {
  const parsedProjectId = IdSchema.safeParse(projectId)
  if (!parsedProjectId.success) return { success: false, error: validationError(parsedProjectId.error) }

  const parsed = CreateDeliverableSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const deliverable = await createDeliverableForProject(user.id, parsedProjectId.data, {
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      nodeType: toDbDeliverableNodeType(parsed.data.type) ?? "FILE",
      parentId: parsed.data.parentId,
      status: toDbDeliverableStatus(parsed.data.status),
      visibility: toDbVisibility(parsed.data.visibility),
      deliveredAt: optionalDate(parsed.data.deliveredAt),
    })

    revalidateWorkProject(parsedProjectId.data)
    return { success: true, data: toDeliverableViewModel(deliverable) }
  } catch (error) {
    return { success: false, error: actionError(error, "新增交付物失敗") }
  }
}

export async function updateProjectDeliverable(
  deliverableId: string,
  input: z.infer<typeof UpdateDeliverableSchema>
): Promise<ActionResult<ProjectDeliverable>> {
  const parsedDeliverableId = IdSchema.safeParse(deliverableId)
  if (!parsedDeliverableId.success) return { success: false, error: validationError(parsedDeliverableId.error) }

  const parsed = UpdateDeliverableSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const deliverable = await updateDeliverableForProfile(user.id, parsedDeliverableId.data, {
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      status: toDbDeliverableStatus(parsed.data.status),
      visibility: toDbVisibility(parsed.data.visibility),
      deliveredAt: optionalDate(parsed.data.deliveredAt),
    })

    revalidateWorkProject(deliverable.projectId)
    return { success: true, data: toDeliverableViewModel(deliverable) }
  } catch (error) {
    return { success: false, error: actionError(error, "更新交付物失敗") }
  }
}

export async function updateProjectDeliverableVisibility(
  deliverableId: string,
  visibility: DeliverableVisibility
): Promise<ActionResult<ProjectDeliverable>> {
  const parsedDeliverableId = IdSchema.safeParse(deliverableId)
  if (!parsedDeliverableId.success) return { success: false, error: validationError(parsedDeliverableId.error) }

  const parsedVisibility = WorkItemVisibilitySchema.safeParse(visibility)
  if (!parsedVisibility.success) return { success: false, error: validationError(parsedVisibility.error) }

  try {
    const user = await requireUser()
    const deliverable = await updateDeliverableVisibilityForProfile(
      user.id,
      parsedDeliverableId.data,
      toDbVisibility(parsedVisibility.data) ?? "INTERNAL_ONLY"
    )

    revalidateWorkProject(deliverable.projectId)
    return { success: true, data: toDeliverableViewModel(deliverable) }
  } catch (error) {
    return { success: false, error: actionError(error, "更新交付物可見性失敗") }
  }
}

export async function deleteProjectDeliverable(deliverableId: string): Promise<ActionResult<void>> {
  const parsed = IdSchema.safeParse(deliverableId)
  if (!parsed.success) return { success: false, error: validationError(parsed.error) }

  try {
    const user = await requireUser()
    const projectId = await deleteDeliverableForProfile(user.id, parsed.data)
    revalidateWorkProject(projectId)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: actionError(error, "刪除交付物失敗") }
  }
}

// Backward-compatible aliases for older imports during the Phase 1 transition.
export async function toggleTaskComplete(taskId: string): Promise<ActionResult<void>> {
  const result = await toggleProjectTaskComplete(taskId)
  if (!result.success) return result
  return { success: true, data: undefined }
}

export async function createDeliverable(input: z.infer<typeof CreateDeliverableSchema> & { projectId: string }) {
  const parsedProjectId = IdSchema.safeParse(input.projectId)
  if (!parsedProjectId.success) return { success: false, error: validationError(parsedProjectId.error) }
  return await createProjectDeliverable(parsedProjectId.data, input)
}
