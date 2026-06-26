// ─── Source & Category ─────────────────────────────────────────────────────

export type SourceType =
  | "manual"
  | "line"
  | "voice"
  | "image"
  | "url"
  | "receipt"

export type TriageCategory =
  | "project_note"
  | "research_idea"
  | "finance_record"
  | "life_care"
  | "memory"
  | "relationship"
  | "general"

export type EntityType =
  | "project"
  | "research"
  | "contact"
  | "company"
  | "finance"
  | "life"
  | "memory"

// ─── Confidence & Card Status ───────────────────────────────────────────────

export type Confidence = "high" | "medium" | "low"

export type AICardStatus = "pending" | "confirmed" | "edited" | "dismissed"

export type AICardType =
  | "morning_brief"
  | "triage"
  | "project_pulse"
  | "public_output"

export type DecisionType = "confirm" | "edit" | "dismiss" | "defer"

// ─── Core Data Units ────────────────────────────────────────────────────────

export interface Capture {
  id: string
  content: string
  sourceType: SourceType
  createdAt: string
  rawMetadata?: Record<string, string | number | boolean>
}

export interface Evidence {
  id: string
  captureId: string
  excerpt: string
  sourceType: SourceType
  createdAt: string
}

export interface Entity {
  id: string
  type: EntityType
  name: string
  description?: string
}

export interface ContextSnapshot {
  entityId: string
  entityType: EntityType
  summary: string
  lastUpdated: string
  signals: string[]
}

// ─── Project Pulse ──────────────────────────────────────────────────────────

export interface ProjectPulseSummary {
  inProgress: string[]
  openQuestions: string[]
  blockers: string[]
  todayPriorities: string[]
  progressPercent: number
  daysUntilDue: number | null
}

// ─── AI Card (primary frontend display unit) ────────────────────────────────

export interface AICardSource {
  label: string
  href?: string
  type?: "project" | "contact" | "line" | "email" | "calendar" | "task"
}

export interface AICard {
  id: string
  title: string
  summary: string
  aiType: AICardType
  triageCategory?: TriageCategory
  confidence: Confidence
  relatedEntityId?: string
  relatedEntityType?: EntityType
  relatedEntityName?: string
  extractedEntities?: string[]
  suggestedPlacement?: string
  reasoning: string
  recommendation: string
  sources?: AICardSource[]
  status: AICardStatus
  createdAt: string
  // Project pulse only
  pulseSummary?: ProjectPulseSummary
}

// ─── Decision & Action ──────────────────────────────────────────────────────

export interface Decision {
  id: string
  aiCardId: string
  decisionType: DecisionType
  editedContent?: string
  createdAt: string
}

export interface Action {
  id: string
  decisionId: string
  actionType: string
  description: string
  entityId?: string
  createdAt: string
}

// ─── Public Output ──────────────────────────────────────────────────────────

export interface PublicOutput {
  id: string
  aiCardId: string
  internalInsight: string
  clientSafeContent: string
  status: "draft" | "confirmed"
  entityId: string
  entityType: EntityType
  createdAt: string
}

// ─── Memory ─────────────────────────────────────────────────────────────────

export interface Memory {
  id: string
  title: string
  summary: string
  relatedPersons: string[]
  occurredAt: string
  createdAt: string
  aiGenerated: boolean
}

// ─── Lightweight Project type for Phase 1 ───────────────────────────────────

export interface MockProject {
  id: string
  name: string
  clientName: string
  status: "active" | "paused" | "completed"
  visibility: "internal" | "client_shared"
  dueDate?: string
  description?: string
  tasksDone: number
  tasksTotal: number
}
