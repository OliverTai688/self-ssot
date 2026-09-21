import type {
  TeamProjectAccessRole,
  TeamProjectAccessSource,
  TeamWorkspaceRole,
} from "@/lib/contracts/team-workspace-capability.contract"
import type { TeamWorkspaceCreationReadinessDto } from "@/types/team-workspace-command"
import type { Project } from "@/types/work"

export type {
  TeamWorkspaceCreateReadinessCode as TeamWorkspaceCreationReadinessCode,
  TeamWorkspaceCreationReadinessDto,
} from "@/types/team-workspace-command"

export const LEGACY_PERSONAL_WORKSPACE_ID = "legacy-personal" as const

export type WorkspaceProjectIndexSource =
  | "team_membership"
  | "legacy_personal_compatibility"
  | "unavailable"

export type WorkspaceProjectIndexState =
  | "ready"
  | "empty"
  | "not_found_or_forbidden"
  | "unavailable"

export type WorkspaceProjectIndexSelectionResolution =
  | "verified"
  | "safe_fallback"
  | "legacy_personal_compatibility"
  | "unavailable"

export type WorkspaceProjectIndexNotice =
  | "selected_workspace_unavailable"
  | "legacy_personal_compatibility"
  | "workspace_data_unavailable"
  | null

export type WorkspaceReadCapability =
  | "workspace.read"
  | "workspace.projects.list"

export interface WorkspaceReadCapabilitySnapshotDto {
  decision: "ALLOW"
  role: TeamWorkspaceRole
  authorizedReadCapabilities: readonly WorkspaceReadCapability[]
  runtimeMode: "READ_ONLY"
  canCreateProject: false
}

export interface ProjectReadCapabilitySnapshotDto {
  decision: "ALLOW"
  workspaceRole: TeamWorkspaceRole
  projectRole: TeamProjectAccessRole
  accessSource: TeamProjectAccessSource | "legacy_exact_owner"
  authorizedReadCapabilities: readonly ["project.read"]
  runtimeMode: "READ_ONLY"
  canRead: true
  canCreateFeedback: false
  canWriteContent: false
  canManageAccess: false
  canTransfer: false
}

export interface WorkspaceProjectIndexWorkspaceDto {
  id: string
  name: string
  type: "PERSONAL" | "TEAM"
  role: TeamWorkspaceRole
  memberCount: number
  projectCount: number
  isSelected: boolean
  capability: WorkspaceReadCapabilitySnapshotDto
}

export type WorkspaceProjectIndexSafeProjectDto = Omit<Project, "clientToken">

export interface WorkspaceProjectIndexProjectDto {
  project: WorkspaceProjectIndexSafeProjectDto
  workspaceId: string
  workspaceType: "PERSONAL" | "TEAM"
  workspaceRole: TeamWorkspaceRole
  projectRole: TeamProjectAccessRole
  accessSource: TeamProjectAccessSource | "legacy_exact_owner"
  capability: ProjectReadCapabilitySnapshotDto
  detailHref: string | null
  isReadOnly: true
}

/**
 * Client-safe Work project-index payload. It intentionally exposes only read
 * capabilities even when the resolver authorizes future collaboration writes;
 * TEAMCOLLAB-005 does not enable those mutation paths.
 */
export interface WorkspaceProjectIndexDto {
  source: WorkspaceProjectIndexSource
  state: WorkspaceProjectIndexState
  selectionResolution: WorkspaceProjectIndexSelectionResolution
  notice: WorkspaceProjectIndexNotice
  selectedWorkspaceId: string | null
  selectedWorkspace: WorkspaceProjectIndexWorkspaceDto | null
  workspaces: WorkspaceProjectIndexWorkspaceDto[]
  projects: WorkspaceProjectIndexProjectDto[]
  teamWorkspaceCreation: TeamWorkspaceCreationReadinessDto
  canUseLegacyPersonalWrites: boolean
}
