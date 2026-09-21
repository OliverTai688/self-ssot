import "server-only"

import {
  hasTeamProjectCapability,
  hasTeamWorkspaceCapability,
  resolveTeamProjectCapabilities,
  resolveTeamWorkspaceCapabilities,
  type TeamWorkspaceCapabilityResolution,
  type TeamWorkspaceMembershipStatus,
  type TeamWorkspaceStatus,
} from "@/lib/contracts/team-workspace-capability.contract"
import { db } from "@/lib/db"
import {
  toLegacyPersonalProjectDto,
  toLegacyPersonalWorkspaceDto,
  toWorkspaceProjectIndexProjectDto,
  toWorkspaceProjectIndexWorkspaceDto,
} from "@/lib/mappers/team-workspace.mapper"
import {
  LEGACY_PERSONAL_WORKSPACE_ID,
  type WorkspaceProjectIndexDto,
  type WorkspaceProjectIndexProjectDto,
} from "@/types/workspace-project-index"

type VerifiedMembership = {
  membership: {
    id: string
    workspaceId: string
    profileId: string
    role: "OWNER" | "ADMIN" | "MEMBER" | "GUEST"
    status: TeamWorkspaceMembershipStatus
  }
  workspace: {
    id: string
    name: string
    type: "PERSONAL" | "TEAM"
    status: TeamWorkspaceStatus
    defaultProjectAccessRole: "VIEWER" | "COMMENTER" | "EDITOR" | "MANAGER"
    activeMemberCount: number
  }
  resolution: TeamWorkspaceCapabilityResolution
}

function unavailableIndex(
  state: WorkspaceProjectIndexDto["state"] = "unavailable",
): WorkspaceProjectIndexDto {
  return {
    source: "unavailable",
    state,
    selectionResolution: "unavailable",
    notice: state === "unavailable" ? "workspace_data_unavailable" : null,
    selectedWorkspaceId: null,
    selectedWorkspace: null,
    workspaces: [],
    projects: [],
    teamWorkspaceCreation: { available: false, code: "unavailable" },
    canUseLegacyPersonalWrites: false,
  }
}

function isPrismaMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2021"
  )
}

function normalizeRequestedWorkspaceId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

async function getLegacyPersonalCompatibilityIndex(
  profileId: string,
  requestedWorkspaceId: string | null,
): Promise<WorkspaceProjectIndexDto> {
  try {
    // Keep this select limited to columns that predate TEAMCOLLAB-004. Prisma's
    // default scalar selection would request workspace_id/access_mode and break
    // the intended P2021 compatibility path on an unmigrated valuable database.
    const legacyProjects = await db.project.findMany({
      where: { ownerId: profileId },
      select: {
        id: true,
        ownerId: true,
        name: true,
        clientName: true,
        description: true,
        status: true,
        phase: true,
        health: true,
        visibility: true,
        startedAt: true,
        dueAt: true,
        nextAction: true,
        companyAxis: true,
        tasksDone: true,
        tasksTotal: true,
        createdAt: true,
        updatedAt: true,
        tasks: {
          select: { status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const projects = legacyProjects
      .map((project) =>
        toLegacyPersonalProjectDto({
          project: {
            ...project,
            workspaceId: null,
            accessMode: "PRIVATE",
            clientToken: null,
          },
          workspaceId: LEGACY_PERSONAL_WORKSPACE_ID,
          profileId,
        }),
      )
      .filter((project): project is WorkspaceProjectIndexProjectDto => project !== null)

    const workspace = toLegacyPersonalWorkspaceDto({
      id: LEGACY_PERSONAL_WORKSPACE_ID,
      name: "個人",
      projectCount: projects.length,
    })

    return {
      source: "legacy_personal_compatibility",
      state: projects.length > 0 ? "ready" : "empty",
      selectionResolution: "legacy_personal_compatibility",
      notice:
        requestedWorkspaceId && requestedWorkspaceId !== LEGACY_PERSONAL_WORKSPACE_ID
          ? "selected_workspace_unavailable"
          : "legacy_personal_compatibility",
      selectedWorkspaceId: workspace.id,
      selectedWorkspace: workspace,
      workspaces: [workspace],
      projects,
      teamWorkspaceCreation: {
        available: false,
        code: "personal_workspace_required",
      },
      canUseLegacyPersonalWrites: true,
    }
  } catch {
    return unavailableIndex()
  }
}

async function getVisibleProjectsForMembership(
  profileId: string,
  verified: VerifiedMembership,
): Promise<WorkspaceProjectIndexProjectDto[]> {
  const { membership, workspace } = verified
  const manager = membership.role === "OWNER" || membership.role === "ADMIN"

  const projects = await db.project.findMany({
    where: {
      workspaceId: workspace.id,
      ...(manager
        ? {}
        : membership.role === "MEMBER"
          ? {
              OR: [
                { accessMode: "WORKSPACE_VISIBLE" as const },
                { accessGrants: { some: { membershipId: membership.id } } },
              ],
            }
          : { accessGrants: { some: { membershipId: membership.id } } }),
    },
    select: {
      id: true,
      ownerId: true,
      workspaceId: true,
      accessMode: true,
      name: true,
      clientName: true,
      description: true,
      status: true,
      phase: true,
      health: true,
      visibility: true,
      startedAt: true,
      dueAt: true,
      nextAction: true,
      companyAxis: true,
      tasksDone: true,
      tasksTotal: true,
      createdAt: true,
      updatedAt: true,
      tasks: {
        select: { status: true },
      },
      accessGrants: {
        where: { membershipId: membership.id },
        select: {
          projectId: true,
          membershipId: true,
          role: true,
          status: true,
          membership: {
            select: { workspaceId: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return projects.flatMap((project) => {
    const grant = project.accessGrants.find(
      (candidate) => candidate.membershipId === membership.id,
    )
    const resolution = resolveTeamProjectCapabilities({
      identity: { profileId },
      workspace: {
        id: workspace.id,
        status: workspace.status,
        defaultProjectRole: workspace.defaultProjectAccessRole,
      },
      membership,
      project: {
        id: project.id,
        workspaceId: project.workspaceId ?? "",
        status: project.status === "ARCHIVED" ? "INACTIVE" : "ACTIVE",
        accessMode: project.accessMode,
      },
      directGrant: grant
        ? {
            projectId: grant.projectId,
            workspaceId: grant.membership.workspaceId,
            membershipId: grant.membershipId,
            role: grant.role,
            status: grant.status,
          }
        : null,
    })

    if (!hasTeamProjectCapability(resolution, "project.read")) {
      return []
    }

    const mapped = toWorkspaceProjectIndexProjectDto({
      project: { ...project, clientToken: null },
      workspaceId: workspace.id,
      workspaceType: workspace.type,
      profileId,
      resolution,
    })

    return mapped ? [mapped] : []
  })
}

/**
 * Server-only, read-only BFF for the Work workspace selector and project index.
 * The requested workspace id is a preference only; it is never used as proof
 * and is matched only after active memberships have been resolved.
 */
export async function getWorkspaceProjectIndexForProfile(
  profileId: string,
  requestedWorkspaceId?: string | null,
): Promise<WorkspaceProjectIndexDto> {
  if (typeof profileId !== "string" || profileId.trim().length === 0) {
    return unavailableIndex("not_found_or_forbidden")
  }

  const requestedId = normalizeRequestedWorkspaceId(requestedWorkspaceId)

  try {
    const membershipRows = await db.workspaceMembership.findMany({
      where: {
        profileId,
        status: "ACTIVE",
        workspace: { status: "ACTIVE" },
      },
      select: {
        id: true,
        workspaceId: true,
        profileId: true,
        role: true,
        status: true,
        workspace: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            defaultProjectAccessRole: true,
            _count: {
              select: {
                memberships: { where: { status: "ACTIVE" } },
              },
            },
          },
        },
      },
      orderBy: [{ workspace: { type: "asc" } }, { workspace: { name: "asc" } }],
    })

    if (membershipRows.length === 0) {
      return getLegacyPersonalCompatibilityIndex(profileId, requestedId)
    }

    const verifiedMemberships = membershipRows.flatMap((row): VerifiedMembership[] => {
      const membership = {
        id: row.id,
        workspaceId: row.workspaceId,
        profileId: row.profileId,
        role: row.role,
        status: row.status,
      }
      const workspace = {
        id: row.workspace.id,
        name: row.workspace.name,
        type: row.workspace.type,
        status: row.workspace.status,
        defaultProjectAccessRole: row.workspace.defaultProjectAccessRole,
        activeMemberCount: row.workspace._count.memberships,
      }
      const resolution = resolveTeamWorkspaceCapabilities({
        identity: { profileId },
        workspace: {
          id: workspace.id,
          status: workspace.status,
          defaultProjectRole: workspace.defaultProjectAccessRole,
        },
        membership,
      })

      if (!hasTeamWorkspaceCapability(resolution, "workspace.read")) {
        return []
      }

      return [{ membership, workspace, resolution }]
    })

    if (verifiedMemberships.length === 0) {
      return unavailableIndex("not_found_or_forbidden")
    }

    const requestedMembership = requestedId
      ? verifiedMemberships.find(({ workspace }) => workspace.id === requestedId)
      : undefined
    const selectedMembership =
      requestedMembership ??
      verifiedMemberships.find(({ workspace }) => workspace.type === "PERSONAL") ??
      verifiedMemberships[0]

    if (!selectedMembership) {
      return unavailableIndex("not_found_or_forbidden")
    }

    const visibleProjectsByWorkspace = new Map(
      await Promise.all(
        verifiedMemberships.map(async (verified) => [
          verified.workspace.id,
          await getVisibleProjectsForMembership(profileId, verified),
        ] as const),
      ),
    )

    const selectedProjects = visibleProjectsByWorkspace.get(selectedMembership.workspace.id) ?? []
    const workspaces = verifiedMemberships.flatMap((verified) => {
      const mapped = toWorkspaceProjectIndexWorkspaceDto({
        id: verified.workspace.id,
        name: verified.workspace.name,
        type: verified.workspace.type,
        memberCount: verified.workspace.activeMemberCount,
        projectCount: visibleProjectsByWorkspace.get(verified.workspace.id)?.length ?? 0,
        isSelected: verified.workspace.id === selectedMembership.workspace.id,
        resolution: verified.resolution,
      })

      return mapped ? [mapped] : []
    })
    const selectedWorkspace =
      workspaces.find((workspace) => workspace.id === selectedMembership.workspace.id) ?? null

    if (!selectedWorkspace) {
      return unavailableIndex()
    }

    return {
      source: "team_membership",
      state: selectedProjects.length > 0 ? "ready" : "empty",
      selectionResolution: requestedId && !requestedMembership ? "safe_fallback" : "verified",
      notice:
        requestedId && !requestedMembership ? "selected_workspace_unavailable" : null,
      selectedWorkspaceId: selectedWorkspace.id,
      selectedWorkspace,
      workspaces,
      projects: selectedProjects,
      teamWorkspaceCreation: { available: false, code: "unavailable" },
      canUseLegacyPersonalWrites: false,
    }
  } catch (error) {
    if (isPrismaMissingTableError(error)) {
      return getLegacyPersonalCompatibilityIndex(profileId, requestedId)
    }

    return unavailableIndex()
  }
}
