export type TeamWorkspaceCreateReadinessCode =
  | "ready"
  | "not_platform_owner"
  | "personal_workspace_required"
  | "personal_owner_membership_required"
  | "owner_projects_unscoped"
  | "audit_storage_unavailable"
  | "unavailable"

export interface TeamWorkspaceCreationReadinessDto {
  available: boolean
  code: TeamWorkspaceCreateReadinessCode
}

export type CreateTeamWorkspaceActionStatus =
  | "idle"
  | "success"
  | "validation_error"
  | "blocked"
  | "conflict"
  | "error"

export type CreateTeamWorkspaceActionCode =
  | TeamWorkspaceCreateReadinessCode
  | "create_succeeded"
  | "name_invalid"
  | "idempotency_conflict"

export type CreateTeamWorkspaceFieldErrors = Partial<
  Record<"name" | "idempotencyKey", string[]>
>

type CreateTeamWorkspaceActionNonSuccessState = {
  status: Exclude<CreateTeamWorkspaceActionStatus, "success">
  code: Exclude<CreateTeamWorkspaceActionCode, "create_succeeded">
  message: string
  fieldErrors?: CreateTeamWorkspaceFieldErrors
  workspaceId?: never
  workspaceHref?: never
}

type CreateTeamWorkspaceActionSuccessState = {
  status: "success"
  code: "create_succeeded"
  message: string
  workspaceId: string
  workspaceHref: string
  fieldErrors?: never
}

export type CreateTeamWorkspaceActionState =
  | CreateTeamWorkspaceActionNonSuccessState
  | CreateTeamWorkspaceActionSuccessState

export const INITIAL_CREATE_TEAM_WORKSPACE_ACTION_STATE = {
  status: "idle",
  code: "ready",
  message: "",
} as const satisfies CreateTeamWorkspaceActionState

export type CreateTeamWorkspaceCommandInput = {
  name: string
  idempotencyKey: string
}

export type CreateTeamWorkspaceCommandResult = {
  workspaceId: string
  workspaceHref: string
  idempotentReplay: boolean
}

export type TeamWorkspaceCommandErrorCode = Exclude<
  TeamWorkspaceCreateReadinessCode,
  "ready"
> | "idempotency_conflict"
