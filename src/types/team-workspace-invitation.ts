export type TeamWorkspaceInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "EXPIRED"
  | "REVOKED"

export type TeamWorkspaceInvitationDeliveryStatus = "manual_email_link"

export type TeamWorkspaceInvitationWorkspaceRole =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "GUEST"

export type TeamWorkspaceInvitationProjectRole =
  | "VIEWER"
  | "COMMENTER"
  | "EDITOR"
  | "MANAGER"

export type TeamWorkspaceInvitationRecipientRequirement =
  "existing_profile_with_verified_email"

export type TeamWorkspaceInvitationDto = {
  id: string
  normalizedEmail: string
  workspaceRole: TeamWorkspaceInvitationWorkspaceRole
  project: {
    id: string
    name: string
    role: TeamWorkspaceInvitationProjectRole
  } | null
  status: TeamWorkspaceInvitationStatus
  expiresAt: string
  createdAt: string
  deliveryStatus: TeamWorkspaceInvitationDeliveryStatus
}

export type TeamWorkspaceMemberDto = {
  membershipId: string
  displayName: string
  email: string
  role: TeamWorkspaceInvitationWorkspaceRole
  status: "ACTIVE" | "SUSPENDED" | "LEFT" | "REMOVED"
  joinedAt: string | null
}

export type TeamWorkspaceInvitationIndexDto = {
  source: "database" | "unavailable"
  state: "ready" | "empty" | "not_found_or_forbidden" | "unavailable"
  recipientRequirement: TeamWorkspaceInvitationRecipientRequirement
  workspace: {
    id: string
    name: string
  } | null
  capabilities: {
    canReadMembers: boolean
    canInvite: boolean
    canManage: boolean
  }
  projects: Array<{
    id: string
    name: string
  }>
  invitations: TeamWorkspaceInvitationDto[]
  members: TeamWorkspaceMemberDto[]
}

export type TeamWorkspaceInvitationErrorCode =
  | "not_found_or_forbidden"
  | "invalid_input"
  | "audit_storage_unavailable"
  | "already_active_member"
  | "existing_membership_requires_management"
  | "owner_invite_requires_owner"
  | "project_scope_invalid"
  | "invitation_is_expired"
  | "invitation_is_revoked"
  | "invitation_is_accepted"
  | "email_mismatch"
  | "existing_profile_required"
  | "membership_inactive"
  | "idempotency_conflict"
  | "unavailable"

export type TeamWorkspaceInvitationActionStatus =
  | "idle"
  | "success"
  | "validation_error"
  | "blocked"
  | "conflict"
  | "error"

export type TeamWorkspaceInvitationActionCode =
  | TeamWorkspaceInvitationErrorCode
  | "invitation_created"
  | "invitation_revoked"
  | "invitation_accepted"

export type TeamWorkspaceInvitationFieldErrors = Partial<
  Record<
    | "workspaceId"
    | "invitationId"
    | "email"
    | "workspaceRole"
    | "projectId"
    | "projectRole"
    | "idempotencyKey"
    | "token",
    string[]
  >
>

type InvitationActionFailureState = {
  status: Exclude<TeamWorkspaceInvitationActionStatus, "success">
  code: Exclude<
    TeamWorkspaceInvitationActionCode,
    "invitation_created" | "invitation_revoked" | "invitation_accepted"
  >
  message: string
  fieldErrors?: TeamWorkspaceInvitationFieldErrors
}

export type CreateTeamWorkspaceInvitationActionState =
  | InvitationActionFailureState
  | {
      status: "success"
      code: "invitation_created"
      message: string
      invitation: TeamWorkspaceInvitationDto
      acceptanceUrl: string | null
      deliveryStatus: TeamWorkspaceInvitationDeliveryStatus
      idempotentReplay: boolean
    }

export type RevokeTeamWorkspaceInvitationActionState =
  | InvitationActionFailureState
  | {
      status: "success"
      code: "invitation_revoked"
      message: string
      invitationId: string
      idempotentReplay: boolean
    }

export type AcceptTeamWorkspaceInvitationActionState =
  | InvitationActionFailureState
  | {
      status: "success"
      code: "invitation_accepted"
      message: string
      workspaceId: string
      workspaceHref: string
      membershipId: string
      idempotentReplay: boolean
    }

export const INITIAL_CREATE_TEAM_WORKSPACE_INVITATION_ACTION_STATE = {
  status: "idle",
  code: "unavailable",
  message: "",
} as const satisfies CreateTeamWorkspaceInvitationActionState

export const INITIAL_REVOKE_TEAM_WORKSPACE_INVITATION_ACTION_STATE = {
  status: "idle",
  code: "unavailable",
  message: "",
} as const satisfies RevokeTeamWorkspaceInvitationActionState

export const INITIAL_ACCEPT_TEAM_WORKSPACE_INVITATION_ACTION_STATE = {
  status: "idle",
  code: "unavailable",
  message: "",
} as const satisfies AcceptTeamWorkspaceInvitationActionState

export type CreateTeamWorkspaceInvitationCommandInput = {
  workspaceId: string
  email: string
  workspaceRole: TeamWorkspaceInvitationWorkspaceRole
  projectId?: string | null
  projectRole?: TeamWorkspaceInvitationProjectRole | null
  idempotencyKey: string
}

export type RevokeTeamWorkspaceInvitationCommandInput = {
  workspaceId: string
  invitationId: string
  idempotencyKey: string
}

export type AcceptTeamWorkspaceInvitationCommandInput = {
  token: string
}

export type CreateTeamWorkspaceInvitationCommandResult = {
  invitation: TeamWorkspaceInvitationDto
  acceptanceUrl: string | null
  deliveryStatus: TeamWorkspaceInvitationDeliveryStatus
  idempotentReplay: boolean
}

export type RevokeTeamWorkspaceInvitationCommandResult = {
  invitationId: string
  idempotentReplay: boolean
}

export type AcceptTeamWorkspaceInvitationCommandResult = {
  workspaceId: string
  workspaceHref: string
  membershipId: string
  idempotentReplay: boolean
}
