import { requireUser } from "@/lib/services/auth.service"
import { getTeamWorkspaceCreateReadinessForProfile } from "@/lib/services/team-workspace-command.service"
import { getTeamWorkspaceInvitationIndexForProfile } from "@/lib/services/team-workspace-invitation.service"
import { getWorkspaceProjectIndexForProfile } from "@/lib/services/team-workspace.service"
import type { TeamCollaborationPanelViewModel } from "@/components/work/workspace/team-collaboration-sheet"
import type { TeamWorkspaceInvitationIndexDto } from "@/types/team-workspace-invitation"
import WorkClient from "./work-client"

export const dynamic = "force-dynamic"

type WorkPageSearchParams = {
  workspace?: string | string[]
  invitation?: string | string[]
}

const dateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatDateTime(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : dateTimeFormatter.format(date)
}

function toTeamCollaborationPanelViewModel({
  index,
  selectedWorkspace,
  currentUserEmail,
}: {
  index: TeamWorkspaceInvitationIndexDto
  selectedWorkspace: NonNullable<
    Awaited<ReturnType<typeof getWorkspaceProjectIndexForProfile>>["selectedWorkspace"]
  >
  currentUserEmail: string
}): TeamCollaborationPanelViewModel {
  const workspace = index.workspace ?? {
    id: selectedWorkspace.id,
    name: selectedWorkspace.name,
  }
  const normalizedCurrentUserEmail = currentUserEmail.trim().toLowerCase()

  return {
    state:
      index.state === "ready" || index.state === "empty"
        ? "ready"
        : index.state,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    currentUserRole: selectedWorkspace.role,
    canInvite: index.capabilities.canInvite,
    projects: index.projects,
    members: index.members.map((member) => ({
      id: member.membershipId,
      displayName: member.displayName,
      emailLabel: member.email,
      role: member.role,
      status: member.status,
      joinedAtLabel: formatDateTime(member.joinedAt),
      isCurrentUser: member.email === normalizedCurrentUserEmail,
    })),
    invitations: index.invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.normalizedEmail,
      role: invitation.workspaceRole,
      project: invitation.project
        ? {
            name: invitation.project.name,
            role: invitation.project.role,
          }
        : null,
      status: invitation.status,
      createdAtLabel: formatDateTime(invitation.createdAt) ?? "",
      expiresAtLabel: formatDateTime(invitation.expiresAt) ?? "",
      canRevoke:
        index.capabilities.canInvite && invitation.status === "PENDING",
      deliveryMode: "MANUAL_EMAIL_LINK",
      deliveryStatus: "AWAITING_MANUAL_SEND",
    })),
  }
}

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<WorkPageSearchParams>
}) {
  const user = await requireUser()
  const query = await searchParams
  const workspaceParam = Array.isArray(query.workspace) ? query.workspace[0] : query.workspace
  const invitationParam = Array.isArray(query.invitation)
    ? query.invitation[0]
    : query.invitation
  const requestedWorkspaceId =
    workspaceParam && workspaceParam.length <= 128 ? workspaceParam : null
  const invitationToken =
    invitationParam && /^[0-9a-f]{64}$/i.test(invitationParam)
      ? invitationParam
      : null
  const [projectIndex, teamWorkspaceCreation] = await Promise.all([
    getWorkspaceProjectIndexForProfile(user.id, requestedWorkspaceId),
    getTeamWorkspaceCreateReadinessForProfile(user.id),
  ])
  const initialIndex = { ...projectIndex, teamWorkspaceCreation }
  const selectedWorkspace = initialIndex.selectedWorkspace
  const invitationIndex =
    selectedWorkspace?.type === "TEAM"
      ? await getTeamWorkspaceInvitationIndexForProfile(
          user.id,
          selectedWorkspace.id,
        )
      : null
  const initialTeamCollaboration =
    invitationIndex && selectedWorkspace
      ? toTeamCollaborationPanelViewModel({
          index: invitationIndex,
          selectedWorkspace,
          currentUserEmail: user.email,
        })
      : null

  return (
    <WorkClient
      initialIndex={initialIndex}
      initialTeamCollaboration={initialTeamCollaboration}
      initialInvitationToken={invitationToken}
    />
  )
}
