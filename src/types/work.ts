// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "paused" | "completed" | "archived"

export type ProjectPhase =
  | "discovery"
  | "planning"
  | "execution"
  | "review"
  | "maintenance"

export type ProjectHealth = "good" | "watch" | "risk"

export type ProjectVisibility = "internal" | "client_shared"

export interface Project {
  id: string
  name: string
  clientName?: string
  description?: string
  status: ProjectStatus
  phase: ProjectPhase
  health: ProjectHealth
  visibility: ProjectVisibility
  clientToken?: string
  startedAt?: string
  dueAt?: string
  nextAction?: string
  companyAxis?: string
  tasksDone: number
  tasksTotal: number
  createdAt: string
  updatedAt: string
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "done" | "blocked"

export type TaskPriority = 1 | 2 | 3

export type TaskVisibility = "internal" | "client_visible"

export type TaskSource = "manual" | "ai_suggested" | "triage" | "client_request"

export interface ProjectTask {
  id: string
  projectId: string
  title: string
  body?: string
  status: TaskStatus
  visibility: TaskVisibility
  priority: TaskPriority
  source: TaskSource
  dueAt?: string
  completedAt?: string
  createdAt: string
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export type NoteSource = "line" | "email" | "meeting" | "internal"

export type NoteVisibility = "internal" | "client_visible"

export type NoteOrigin = "ai" | "manual"

export interface ProjectNote {
  id: string
  projectId: string
  title?: string
  body: string
  source: NoteSource
  visibility: NoteVisibility
  origin: NoteOrigin
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

// ─── Deliverable ──────────────────────────────────────────────────────────────

export type DeliverableStatus = "draft" | "delivered" | "approved"

export type DeliverableVisibility = "internal" | "client_visible"

export type DeliverableNodeType = "folder" | "file"

export interface ProjectDeliverable {
  id: string
  projectId: string
  type: DeliverableNodeType
  parentId: string | null
  title: string
  description?: string
  status: DeliverableStatus
  visibility: DeliverableVisibility
  deliveredAt?: string
  createdAt: string
}

// ─── Project Timeline ─────────────────────────────────────────────────────────

export interface ProjectMilestone {
  id: string
  title: string
  date: string
  status: "upcoming" | "completed"
}

export interface ProjectPhaseNode {
  phase: ProjectPhase
  label: string
  startDate: string
  endDate: string
  status: "done" | "active" | "upcoming"
  milestones: ProjectMilestone[]
}

export interface ProjectTimeline {
  projectId: string
  phases: ProjectPhaseNode[]
  generatedAt: string
}

// ─── AI Pulse Source Metadata ─────────────────────────────────────────────────

export interface PulseSourceMeta {
  generatedAt: string
  basedOnTaskIds: string[]
  basedOnNoteIds: string[]
  basedOnDeliverableIds: string[]
}
