import type { Project as DbProject, ProjectTask as DbProjectTask, ProjectNote as DbProjectNote, ProjectDeliverable as DbProjectDeliverable } from "@prisma/client"
import type { Project, ProjectTask, ProjectNote, ProjectDeliverable } from "@/types/work"

type ProjectProgressSource = {
  tasks?: Pick<DbProjectTask, "status">[]
  derivedTasksDone?: number
  derivedTasksTotal?: number
  _count?: { tasks?: number; notes?: number }
}

function getProjectTaskProgress(p: DbProject & ProjectProgressSource) {
  if (
    typeof p.derivedTasksDone === "number" &&
    typeof p.derivedTasksTotal === "number"
  ) {
    return {
      tasksDone: p.derivedTasksDone,
      tasksTotal: p.derivedTasksTotal,
    }
  }

  // Prefer relation-derived counts so progress cannot drift from task rows.
  if (p.tasks) {
    return {
      tasksDone: p.tasks.filter((task) => task.status === "DONE").length,
      tasksTotal: p.tasks.length,
    }
  }

  return {
    tasksDone: p.tasksDone ?? 0,
    tasksTotal: p.tasksTotal ?? p._count?.tasks ?? 0,
  }
}

export function toProjectViewModel(p: DbProject & ProjectProgressSource): Project {
  const taskProgress = getProjectTaskProgress(p)

  return {
    id: p.id,
    name: p.name,
    clientName: p.clientName || undefined,
    description: p.description || undefined,
    status: p.status.toLowerCase() as Project["status"],
    phase: p.phase.toLowerCase() as Project["phase"],
    health: p.health.toLowerCase() as Project["health"],
    visibility: p.visibility === "CLIENT_VISIBLE" ? "client_shared" : "internal",
    clientToken: p.clientToken || undefined,
    startedAt: p.startedAt?.toISOString() || undefined,
    dueAt: p.dueAt?.toISOString() || undefined,
    nextAction: p.nextAction || undefined,
    companyAxis: p.companyAxis || undefined,
    tasksDone: taskProgress.tasksDone,
    tasksTotal: taskProgress.tasksTotal,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

export function toTaskViewModel(t: DbProjectTask): ProjectTask {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    body: t.body || undefined,
    status: t.status.toLowerCase() as ProjectTask["status"],
    visibility: t.visibility === "CLIENT_VISIBLE" ? "client_visible" : "internal",
    priority: t.priority as ProjectTask["priority"],
    source: t.source.toLowerCase() as ProjectTask["source"],
    dueAt: t.dueAt?.toISOString() || undefined,
    completedAt: t.completedAt?.toISOString() || undefined,
    createdAt: t.createdAt.toISOString(),
  }
}

export function toNoteViewModel(n: DbProjectNote): ProjectNote {
  return {
    id: n.id,
    projectId: n.projectId,
    title: n.title || undefined,
    body: n.body,
    source: n.source.toLowerCase() as ProjectNote["source"],
    visibility: n.visibility === "CLIENT_VISIBLE" ? "client_visible" : "internal",
    origin: n.origin.toLowerCase() as ProjectNote["origin"],
    isPinned: n.isPinned,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }
}

export function toDeliverableViewModel(d: DbProjectDeliverable): ProjectDeliverable {
  return {
    id: d.id,
    projectId: d.projectId,
    type: d.nodeType.toLowerCase() as ProjectDeliverable["type"],
    parentId: d.parentId,
    title: d.title,
    description: d.description || undefined,
    status: d.status.toLowerCase() as ProjectDeliverable["status"],
    visibility: d.visibility === "CLIENT_VISIBLE" ? "client_visible" : "internal",
    deliveredAt: d.deliveredAt?.toISOString() || undefined,
    createdAt: d.createdAt.toISOString(),
  }
}
