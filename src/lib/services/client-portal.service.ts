import "server-only"

import { db } from "@/lib/db"

export type ClientPortalLoadStatus =
  | "ready"
  | "disabled"
  | "invalid_token"
  | "not_found"
  | "unavailable"

export type ClientPortalProject = {
  name: string
  clientName: string | null
  description: string | null
  status: "exploring" | "active" | "paused" | "completed" | "archived"
  phase: "discovery" | "planning" | "execution" | "review" | "maintenance"
  health: "good" | "watch" | "risk"
  dueAt: string | null
  updatedAt: string
  progress: {
    done: number
    total: number
  }
}

export type ClientPortalTask = {
  title: string
  status: "todo" | "in_progress" | "done" | "blocked"
  priority: number
  dueAt: string | null
  completedAt: string | null
}

export type ClientPortalDeliverable = {
  title: string
  description: string | null
  type: "folder" | "file"
  status: "draft" | "delivered" | "approved"
  deliveredAt: string | null
}

export type ClientPortalView = {
  generatedAt: string
  project: ClientPortalProject
  tasks: ClientPortalTask[]
  deliverables: ClientPortalDeliverable[]
  notes: []
  boundary: {
    notesExcluded: true
    internalRecordsExcluded: true
    fileUrlsExcluded: true
  }
}

export type ClientPortalLoadResult =
  | { status: "ready"; view: ClientPortalView }
  | { status: Exclude<ClientPortalLoadStatus, "ready"> }

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{7,127}$/

function isClientPortalDbEnabled() {
  return process.env.PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB === "1"
}

function normalizeToken(token: string) {
  const trimmed = token.trim()
  return TOKEN_PATTERN.test(trimmed) ? trimmed : null
}

function toIsoOrNull(value: Date | null) {
  return value ? value.toISOString() : null
}

export async function getClientPortalViewByToken(token: string): Promise<ClientPortalLoadResult> {
  if (!isClientPortalDbEnabled()) {
    return { status: "disabled" }
  }

  const normalizedToken = normalizeToken(token)

  if (!normalizedToken) {
    return { status: "invalid_token" }
  }

  try {
    const projects = await db.project.findMany({
      where: {
        clientToken: normalizedToken,
        visibility: "CLIENT_VISIBLE",
      },
      take: 2,
      select: {
        name: true,
        clientName: true,
        description: true,
        status: true,
        phase: true,
        health: true,
        dueAt: true,
        updatedAt: true,
        tasks: {
          where: { visibility: "CLIENT_VISIBLE" },
          orderBy: [{ status: "asc" }, { createdAt: "asc" }],
          select: {
            title: true,
            status: true,
            priority: true,
            dueAt: true,
            completedAt: true,
          },
        },
        deliverables: {
          where: { visibility: "CLIENT_VISIBLE" },
          orderBy: [{ nodeType: "asc" }, { createdAt: "asc" }],
          select: {
            title: true,
            description: true,
            nodeType: true,
            status: true,
            deliveredAt: true,
          },
        },
      },
    })

    if (projects.length !== 1) {
      return { status: "not_found" }
    }

    const project = projects[0]
    const done = project.tasks.filter((task) => task.status === "DONE").length

    return {
      status: "ready",
      view: {
        generatedAt: new Date().toISOString(),
        project: {
          name: project.name,
          clientName: project.clientName,
          description: project.description,
          status: project.status.toLowerCase() as ClientPortalProject["status"],
          phase: project.phase.toLowerCase() as ClientPortalProject["phase"],
          health: project.health.toLowerCase() as ClientPortalProject["health"],
          dueAt: toIsoOrNull(project.dueAt),
          updatedAt: project.updatedAt.toISOString(),
          progress: {
            done,
            total: project.tasks.length,
          },
        },
        tasks: project.tasks.map((task) => ({
          title: task.title,
          status: task.status.toLowerCase() as ClientPortalTask["status"],
          priority: task.priority,
          dueAt: toIsoOrNull(task.dueAt),
          completedAt: toIsoOrNull(task.completedAt),
        })),
        deliverables: project.deliverables.map((deliverable) => ({
          title: deliverable.title,
          description: deliverable.description,
          type: deliverable.nodeType.toLowerCase() as ClientPortalDeliverable["type"],
          status: deliverable.status.toLowerCase() as ClientPortalDeliverable["status"],
          deliveredAt: toIsoOrNull(deliverable.deliveredAt),
        })),
        notes: [],
        boundary: {
          notesExcluded: true,
          internalRecordsExcluded: true,
          fileUrlsExcluded: true,
        },
      },
    }
  } catch {
    return { status: "unavailable" }
  }
}
