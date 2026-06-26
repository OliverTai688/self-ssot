import "dotenv/config"
import crypto from "crypto"
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
  UserRole,
  VisibilityType,
} from "@prisma/client"

import { db as prisma } from "../src/lib/db"
import { mockProjectsFull } from "../src/lib/mock/work/mock-projects"
import { mockTasks } from "../src/lib/mock/work/mock-tasks"
import { mockNotes } from "../src/lib/mock/work/mock-notes"
import { mockDeliverables } from "../src/lib/mock/work/mock-deliverables"
import type { ProjectDeliverable } from "../src/types/work"

const DEMO_PROFILE_EMAIL = "admin@example.com"
const DEMO_PROFILE_NAME = "Admin User"
const DEMO_PROFILE_ROLE: UserRole = "OWNER"
const DEMO_SEED_NAMESPACE = "personal-os:v0.1:work-demo"

type SeedEntityKind = "project" | "task" | "note" | "deliverable"

function deterministicUuid(kind: SeedEntityKind, sourceId: string) {
  const bytes = crypto
    .createHash("sha256")
    .update(`${DEMO_SEED_NAMESPACE}:${kind}:${sourceId}`)
    .digest()
    .subarray(0, 16)

  // Keep the generated value RFC 4122-shaped while remaining deterministic.
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = bytes.toString("hex")
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-")
}

function seedUuid(kind: SeedEntityKind, sourceId: string) {
  return deterministicUuid(kind, sourceId)
}

function nullableSeedUuid(kind: SeedEntityKind, sourceId: string | null | undefined) {
  return sourceId ? seedUuid(kind, sourceId) : null
}

function upperEnum<T extends string>(value: string) {
  return value.toUpperCase() as T
}

function toVisibility(value: "internal" | "client_shared" | "client_visible") {
  return value === "client_shared" || value === "client_visible"
    ? "CLIENT_VISIBLE"
    : "INTERNAL_ONLY"
}

function assertUniqueIds(label: string, ids: string[]) {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${label} mock id: ${id}`)
    }
    seen.add(id)
  }
}

function validateWorkMockSeedData() {
  assertUniqueIds("project", mockProjectsFull.map((project) => project.id))
  assertUniqueIds("task", mockTasks.map((task) => task.id))
  assertUniqueIds("note", mockNotes.map((note) => note.id))
  assertUniqueIds("deliverable", mockDeliverables.map((deliverable) => deliverable.id))

  const projectIds = new Set(mockProjectsFull.map((project) => project.id))
  const deliverableIds = new Set(mockDeliverables.map((deliverable) => deliverable.id))

  for (const task of mockTasks) {
    if (!projectIds.has(task.projectId)) {
      throw new Error(`Task ${task.id} references missing project ${task.projectId}`)
    }
  }

  for (const note of mockNotes) {
    if (!projectIds.has(note.projectId)) {
      throw new Error(`Note ${note.id} references missing project ${note.projectId}`)
    }
  }

  for (const deliverable of mockDeliverables) {
    if (!projectIds.has(deliverable.projectId)) {
      throw new Error(`Deliverable ${deliverable.id} references missing project ${deliverable.projectId}`)
    }

    if (deliverable.parentId && !deliverableIds.has(deliverable.parentId)) {
      throw new Error(`Deliverable ${deliverable.id} references missing parent ${deliverable.parentId}`)
    }
  }
}

function sortDeliverablesForSeed(deliverables: ProjectDeliverable[]) {
  const remaining = new Map(deliverables.map((deliverable) => [deliverable.id, deliverable]))
  const inserted = new Set<string>()
  const sorted: ProjectDeliverable[] = []

  while (remaining.size > 0) {
    let progressed = false

    for (const [id, deliverable] of remaining) {
      if (!deliverable.parentId || inserted.has(deliverable.parentId)) {
        sorted.push(deliverable)
        inserted.add(id)
        remaining.delete(id)
        progressed = true
      }
    }

    if (!progressed) {
      const blockedIds = Array.from(remaining.keys()).join(", ")
      throw new Error(`Deliverable hierarchy has a cycle or missing parent around: ${blockedIds}`)
    }
  }

  return sorted
}

async function main() {
  console.log("Starting DB seed...")
  console.log(`Using deterministic demo seed namespace: ${DEMO_SEED_NAMESPACE}`)

  validateWorkMockSeedData()

  // Create or get default profile
  const profile = await prisma.profile.upsert({
    where: { email: DEMO_PROFILE_EMAIL },
    update: {
      fullName: DEMO_PROFILE_NAME,
      role: DEMO_PROFILE_ROLE,
    },
    create: {
      email: DEMO_PROFILE_EMAIL,
      fullName: DEMO_PROFILE_NAME,
      role: DEMO_PROFILE_ROLE,
    },
  })

  const ownerId = profile.id

  // 1. Projects
  console.log(`Seeding ${mockProjectsFull.length} projects...`)
  for (const project of mockProjectsFull) {
    const projectId = seedUuid("project", project.id)
    const data = {
      ownerId,
      name: project.name,
      clientName: project.clientName ?? null,
      description: project.description ?? null,
      status: upperEnum<ProjectStatus>(project.status),
      phase: upperEnum<ProjectPhase>(project.phase),
      health: upperEnum<ProjectHealth>(project.health),
      visibility: toVisibility(project.visibility) as VisibilityType,
      clientToken: project.clientToken ?? null,
      startedAt: project.startedAt ? new Date(project.startedAt) : null,
      dueAt: project.dueAt ? new Date(project.dueAt) : null,
      nextAction: project.nextAction ?? null,
      companyAxis: project.companyAxis ?? null,
      tasksDone: project.tasksDone,
      tasksTotal: project.tasksTotal,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }

    await prisma.project.upsert({
      where: { id: projectId },
      update: data,
      create: {
        id: projectId,
        ...data,
      },
    })
  }

  // 2. Tasks
  console.log(`Seeding ${mockTasks.length} tasks...`)
  for (const task of mockTasks) {
    const taskId = seedUuid("task", task.id)
    const data = {
      projectId: seedUuid("project", task.projectId),
      title: task.title,
      body: task.body ?? null,
      status: upperEnum<TaskStatus>(task.status),
      visibility: toVisibility(task.visibility) as VisibilityType,
      priority: task.priority,
      source: upperEnum<TaskSource>(task.source),
      dueAt: task.dueAt ? new Date(task.dueAt) : null,
      completedAt: task.completedAt ? new Date(task.completedAt) : null,
      createdAt: new Date(task.createdAt),
      updatedAt: task.completedAt ? new Date(task.completedAt) : new Date(task.createdAt),
    }

    await prisma.projectTask.upsert({
      where: { id: taskId },
      update: data,
      create: {
        id: taskId,
        ...data,
      },
    })
  }

  // 3. Notes
  console.log(`Seeding ${mockNotes.length} notes...`)
  for (const note of mockNotes) {
    const noteId = seedUuid("note", note.id)
    const data = {
      projectId: seedUuid("project", note.projectId),
      title: note.title ?? null,
      body: note.body,
      source: upperEnum<NoteSource>(note.source),
      visibility: toVisibility(note.visibility) as VisibilityType,
      origin: upperEnum<NoteOrigin>(note.origin),
      isPinned: note.isPinned,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
    }

    await prisma.projectNote.upsert({
      where: { id: noteId },
      update: data,
      create: {
        id: noteId,
        ...data,
      },
    })
  }

  // 4. Deliverables
  console.log(`Seeding ${mockDeliverables.length} deliverables...`)
  for (const del of sortDeliverablesForSeed(mockDeliverables)) {
    const delId = seedUuid("deliverable", del.id)
    const data = {
      projectId: seedUuid("project", del.projectId),
      parentId: nullableSeedUuid("deliverable", del.parentId),
      nodeType: upperEnum<DeliverableNodeType>(del.type),
      title: del.title,
      description: del.description ?? null,
      status: upperEnum<DeliverableStatus>(del.status),
      visibility: toVisibility(del.visibility) as VisibilityType,
      deliveredAt: del.deliveredAt ? new Date(del.deliveredAt) : null,
      createdAt: new Date(del.createdAt),
      updatedAt: new Date(del.createdAt),
    }

    await prisma.projectDeliverable.upsert({
      where: { id: delId },
      update: data,
      create: {
        id: delId,
        ...data,
      },
    })
  }

  console.log("Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
