import type { ProjectMilestoneStatus, ProjectPhase, ProjectPhaseNodeStatus } from "@prisma/client"

import { db } from "@/lib/db"
import { assertCanAccessProject, NotFoundError, UnauthorizedError } from "@/lib/services/project.service"

export { NotFoundError, UnauthorizedError }

async function assertCanAccessPhaseNode(profileId: string, phaseNodeId: string) {
  const node = await db.projectPhaseNode.findUnique({
    where: { id: phaseNodeId },
    select: { project: { select: { ownerId: true } } },
  })

  if (!node) throw new NotFoundError("Phase node not found")
  if (node.project.ownerId !== profileId) throw new UnauthorizedError("Unauthorized to access this phase node")

  return true
}

async function assertCanAccessMilestone(profileId: string, milestoneId: string) {
  const milestone = await db.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { phaseNode: { select: { project: { select: { ownerId: true } } } } },
  })

  if (!milestone) throw new NotFoundError("Milestone not found")
  if (milestone.phaseNode.project.ownerId !== profileId) {
    throw new UnauthorizedError("Unauthorized to access this milestone")
  }

  return true
}

export async function getProjectTimelineForProfile(profileId: string, projectId: string) {
  await assertCanAccessProject(profileId, projectId)

  return db.projectPhaseNode.findMany({
    where: { projectId },
    include: { milestones: { orderBy: { date: "asc" } } },
    orderBy: { startDate: "asc" },
  })
}

export async function createPhaseNodeForProject(
  profileId: string,
  projectId: string,
  input: { phase: ProjectPhase; label: string; startDate: Date; endDate: Date; status?: ProjectPhaseNodeStatus }
) {
  await assertCanAccessProject(profileId, projectId)

  return db.projectPhaseNode.create({
    data: {
      projectId,
      phase: input.phase,
      label: input.label,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status ?? "UPCOMING",
    },
  })
}

export async function updatePhaseNodeForProfile(
  profileId: string,
  phaseNodeId: string,
  input: Partial<{ phase: ProjectPhase; label: string; startDate: Date; endDate: Date; status: ProjectPhaseNodeStatus }>
) {
  await assertCanAccessPhaseNode(profileId, phaseNodeId)

  return db.projectPhaseNode.update({ where: { id: phaseNodeId }, data: input })
}

export async function deletePhaseNodeForProfile(profileId: string, phaseNodeId: string) {
  await assertCanAccessPhaseNode(profileId, phaseNodeId)

  return db.projectPhaseNode.delete({ where: { id: phaseNodeId } })
}

export async function createMilestoneForPhaseNode(
  profileId: string,
  phaseNodeId: string,
  input: { title: string; date: Date; status?: ProjectMilestoneStatus }
) {
  await assertCanAccessPhaseNode(profileId, phaseNodeId)

  return db.projectMilestone.create({
    data: {
      phaseNodeId,
      title: input.title,
      date: input.date,
      status: input.status ?? "UPCOMING",
    },
  })
}

export async function updateMilestoneForProfile(
  profileId: string,
  milestoneId: string,
  input: Partial<{ title: string; date: Date; status: ProjectMilestoneStatus }>
) {
  await assertCanAccessMilestone(profileId, milestoneId)

  return db.projectMilestone.update({ where: { id: milestoneId }, data: input })
}

export async function deleteMilestoneForProfile(profileId: string, milestoneId: string) {
  await assertCanAccessMilestone(profileId, milestoneId)

  return db.projectMilestone.delete({ where: { id: milestoneId } })
}
