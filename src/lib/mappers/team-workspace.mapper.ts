import "server-only"

import type {
  TeamProjectCapabilityResolution,
  TeamWorkspaceCapabilityResolution,
  TeamWorkspaceRole,
} from "@/lib/contracts/team-workspace-capability.contract"
import { toProjectViewModel } from "@/lib/mappers/work.mapper"
import type {
  ProjectReadCapabilitySnapshotDto,
  WorkspaceProjectIndexProjectDto,
  WorkspaceProjectIndexWorkspaceDto,
  WorkspaceReadCapability,
  WorkspaceReadCapabilitySnapshotDto,
} from "@/types/workspace-project-index"

type ProjectMapperInput = Parameters<typeof toProjectViewModel>[0]

type WorkspaceSummaryInput = {
  id: string
  name: string
  type: "PERSONAL" | "TEAM"
  memberCount: number
  projectCount: number
  isSelected: boolean
  resolution: TeamWorkspaceCapabilityResolution
}

type ProjectSummaryInput = {
  project: ProjectMapperInput
  workspaceId: string
  workspaceType: "PERSONAL" | "TEAM"
  profileId: string
  resolution: TeamProjectCapabilityResolution
}

const PROJECT_READ_CAPABILITIES = ["project.read"] as const

function isWorkspaceReadCapability(
  capability: string,
): capability is WorkspaceReadCapability {
  return capability === "workspace.read" || capability === "workspace.projects.list"
}

function toWorkspaceReadCapabilitySnapshot(
  resolution: TeamWorkspaceCapabilityResolution,
): WorkspaceReadCapabilitySnapshotDto | null {
  if (!resolution.allowed || !resolution.role) {
    return null
  }

  return {
    decision: "ALLOW",
    role: resolution.role,
    authorizedReadCapabilities: resolution.capabilities.filter(isWorkspaceReadCapability),
    runtimeMode: "READ_ONLY",
    canCreateProject: false,
  }
}

function toProjectReadCapabilitySnapshot(
  resolution: TeamProjectCapabilityResolution,
): ProjectReadCapabilitySnapshotDto | null {
  if (
    !resolution.allowed ||
    !resolution.workspaceRole ||
    !resolution.projectRole ||
    resolution.accessSource === "none" ||
    !resolution.capabilities.includes("project.read")
  ) {
    return null
  }

  return {
    decision: "ALLOW",
    workspaceRole: resolution.workspaceRole,
    projectRole: resolution.projectRole,
    accessSource: resolution.accessSource,
    authorizedReadCapabilities: PROJECT_READ_CAPABILITIES,
    runtimeMode: "READ_ONLY",
    canRead: true,
    canCreateFeedback: false,
    canWriteContent: false,
    canManageAccess: false,
    canTransfer: false,
  }
}

export function toWorkspaceProjectIndexWorkspaceDto(
  input: WorkspaceSummaryInput,
): WorkspaceProjectIndexWorkspaceDto | null {
  const capability = toWorkspaceReadCapabilitySnapshot(input.resolution)

  if (!capability) {
    return null
  }

  return {
    id: input.id,
    name: input.name,
    type: input.type,
    role: capability.role,
    memberCount: input.memberCount,
    projectCount: input.projectCount,
    isSelected: input.isSelected,
    capability,
  }
}

export function toWorkspaceProjectIndexProjectDto(
  input: ProjectSummaryInput,
): WorkspaceProjectIndexProjectDto | null {
  const capability = toProjectReadCapabilitySnapshot(input.resolution)

  if (!capability) {
    return null
  }

  const { clientToken, ...safeProject } = toProjectViewModel(input.project)
  void clientToken

  return {
    project: safeProject,
    workspaceId: input.workspaceId,
    workspaceType: input.workspaceType,
    workspaceRole: capability.workspaceRole,
    projectRole: capability.projectRole,
    accessSource: capability.accessSource,
    capability,
    // The existing detail loader still checks exact ownerId authorization.
    detailHref:
      input.workspaceType === "PERSONAL" && input.project.ownerId === input.profileId
        ? `/work/${input.project.id}`
        : null,
    isReadOnly: true,
  }
}

export function toLegacyPersonalWorkspaceDto(input: {
  id: string
  name: string
  projectCount: number
}): WorkspaceProjectIndexWorkspaceDto {
  const role: TeamWorkspaceRole = "OWNER"

  return {
    id: input.id,
    name: input.name,
    type: "PERSONAL",
    role,
    memberCount: 1,
    projectCount: input.projectCount,
    isSelected: true,
    capability: {
      decision: "ALLOW",
      role,
      authorizedReadCapabilities: ["workspace.read", "workspace.projects.list"],
      runtimeMode: "READ_ONLY",
      canCreateProject: false,
    },
  }
}

export function toLegacyPersonalProjectDto(input: {
  project: ProjectMapperInput
  workspaceId: string
  profileId: string
}): WorkspaceProjectIndexProjectDto | null {
  if (input.project.ownerId !== input.profileId) {
    return null
  }

  const { clientToken, ...safeProject } = toProjectViewModel(input.project)
  void clientToken

  return {
    project: safeProject,
    workspaceId: input.workspaceId,
    workspaceType: "PERSONAL",
    workspaceRole: "OWNER",
    projectRole: "MANAGER",
    accessSource: "legacy_exact_owner",
    capability: {
      decision: "ALLOW",
      workspaceRole: "OWNER",
      projectRole: "MANAGER",
      accessSource: "legacy_exact_owner",
      authorizedReadCapabilities: PROJECT_READ_CAPABILITIES,
      runtimeMode: "READ_ONLY",
      canRead: true,
      canCreateFeedback: false,
      canWriteContent: false,
      canManageAccess: false,
      canTransfer: false,
    },
    detailHref: `/work/${input.project.id}`,
    isReadOnly: true,
  }
}
