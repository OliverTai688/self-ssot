import "server-only"

export type TeamWorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST"

export type TeamWorkspaceStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED"

export type TeamWorkspaceMembershipStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "LEFT"
  | "REMOVED"

export type TeamProjectAccessMode = "PRIVATE" | "WORKSPACE_VISIBLE"

export type TeamProjectAccessRole =
  | "VIEWER"
  | "COMMENTER"
  | "EDITOR"
  | "MANAGER"

export type TeamProjectResourceStatus = "ACTIVE" | "INACTIVE"

export type TeamProjectGrantStatus = "ACTIVE" | "INACTIVE"

export type TeamWorkspaceCapability =
  | "workspace.read"
  | "workspace.projects.list"
  | "workspace.projects.create"
  | "workspace.members.read"
  | "workspace.members.invite"
  | "workspace.members.manage"
  | "workspace.policy.manage"
  | "workspace.audit.read"
  | "workspace.project.receive_transfer"
  | "workspace.owner_policy.manage"

export type TeamProjectCapability =
  | "project.read"
  | "feedback.create"
  | "feedback.update_own"
  | "feedback.moderate"
  | "project.content.write"
  | "project.access.manage"
  | "project.transfer"
  | "project.feedback_memory.review"

export type TeamWorkspaceIdentityContext = {
  profileId: string
}

export type TeamWorkspaceContext = {
  id: string
  status: TeamWorkspaceStatus
  defaultProjectRole: TeamProjectAccessRole
}

export type TeamWorkspaceMembershipContext = {
  id: string
  workspaceId: string
  profileId: string
  role: TeamWorkspaceRole
  status: TeamWorkspaceMembershipStatus
}

export type TeamProjectContext = {
  id: string
  workspaceId: string
  status: TeamProjectResourceStatus
  accessMode: TeamProjectAccessMode
}

export type TeamProjectDirectGrantContext = {
  projectId: string
  workspaceId: string
  membershipId: string
  role: TeamProjectAccessRole
  status: TeamProjectGrantStatus
}

export type TeamWorkspaceCapabilityInput = {
  identity: TeamWorkspaceIdentityContext | null
  workspace: TeamWorkspaceContext | null
  membership: TeamWorkspaceMembershipContext | null
}

export type TeamProjectCapabilityInput = TeamWorkspaceCapabilityInput & {
  project: TeamProjectContext | null
  directGrant: TeamProjectDirectGrantContext | null
}

export type TeamWorkspaceDenialReason =
  | "identity_missing"
  | "identity_invalid"
  | "workspace_missing"
  | "workspace_status_invalid"
  | "workspace_default_role_invalid"
  | "workspace_inactive"
  | "membership_missing"
  | "membership_status_invalid"
  | "membership_role_invalid"
  | "membership_identity_mismatch"
  | "membership_workspace_mismatch"
  | "membership_inactive"

export type TeamProjectDenialReason =
  | TeamWorkspaceDenialReason
  | "project_missing"
  | "project_status_invalid"
  | "project_access_mode_invalid"
  | "project_inactive"
  | "project_workspace_mismatch"
  | "direct_grant_status_invalid"
  | "direct_grant_role_invalid"
  | "direct_grant_project_mismatch"
  | "direct_grant_workspace_mismatch"
  | "direct_grant_membership_mismatch"
  | "direct_grant_inactive"
  | "guest_requires_direct_grant"
  | "private_project_requires_direct_grant"
  | "project_access_unresolved"

export type TeamProjectAccessSource =
  | "workspace_manager"
  | "direct_grant"
  | "workspace_default"
  | "none"

export type TeamWorkspaceCapabilityResolution = {
  allowed: boolean
  role: TeamWorkspaceRole | null
  capabilities: readonly TeamWorkspaceCapability[]
  denialReason: TeamWorkspaceDenialReason | null
}

export type TeamProjectCapabilityResolution = {
  allowed: boolean
  workspaceRole: TeamWorkspaceRole | null
  projectRole: TeamProjectAccessRole | null
  accessSource: TeamProjectAccessSource
  capabilities: readonly TeamProjectCapability[]
  denialReason: TeamProjectDenialReason | null
}

export type TeamWorkspaceCapabilityDecisionDto = {
  decision: "ALLOW" | "DENY"
  role: TeamWorkspaceRole | null
  capabilities: readonly TeamWorkspaceCapability[]
  code: "allowed" | "identity_required" | "not_found_or_forbidden" | "resource_unavailable"
}

export type TeamProjectCapabilityDecisionDto = {
  decision: "ALLOW" | "DENY"
  workspaceRole: TeamWorkspaceRole | null
  projectRole: TeamProjectAccessRole | null
  accessSource: TeamProjectAccessSource
  capabilities: readonly TeamProjectCapability[]
  code: "allowed" | "identity_required" | "not_found_or_forbidden" | "resource_unavailable"
}

const NO_WORKSPACE_CAPABILITIES = [] as const satisfies readonly TeamWorkspaceCapability[]
const NO_PROJECT_CAPABILITIES = [] as const satisfies readonly TeamProjectCapability[]

export const TEAM_WORKSPACE_CAPABILITIES_BY_ROLE = {
  OWNER: [
    "workspace.read",
    "workspace.projects.list",
    "workspace.projects.create",
    "workspace.members.read",
    "workspace.members.invite",
    "workspace.members.manage",
    "workspace.policy.manage",
    "workspace.audit.read",
    "workspace.project.receive_transfer",
    "workspace.owner_policy.manage",
  ],
  ADMIN: [
    "workspace.read",
    "workspace.projects.list",
    "workspace.projects.create",
    "workspace.members.read",
    "workspace.members.invite",
    "workspace.members.manage",
    "workspace.policy.manage",
    "workspace.audit.read",
    "workspace.project.receive_transfer",
  ],
  MEMBER: ["workspace.read", "workspace.projects.list"],
  GUEST: ["workspace.read"],
} as const satisfies Record<TeamWorkspaceRole, readonly TeamWorkspaceCapability[]>

export const TEAM_PROJECT_CAPABILITIES_BY_ROLE = {
  VIEWER: ["project.read"],
  COMMENTER: ["project.read", "feedback.create", "feedback.update_own"],
  EDITOR: [
    "project.read",
    "feedback.create",
    "feedback.update_own",
    "project.content.write",
  ],
  MANAGER: [
    "project.read",
    "feedback.create",
    "feedback.update_own",
    "feedback.moderate",
    "project.content.write",
    "project.access.manage",
    "project.transfer",
    "project.feedback_memory.review",
  ],
} as const satisfies Record<TeamProjectAccessRole, readonly TeamProjectCapability[]>

function isNonEmptyId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTeamWorkspaceStatus(value: unknown): value is TeamWorkspaceStatus {
  return value === "ACTIVE" || value === "SUSPENDED" || value === "ARCHIVED"
}

function isTeamWorkspaceMembershipStatus(
  value: unknown,
): value is TeamWorkspaceMembershipStatus {
  return value === "ACTIVE" || value === "SUSPENDED" || value === "LEFT" || value === "REMOVED"
}

function isTeamWorkspaceRole(value: unknown): value is TeamWorkspaceRole {
  return value === "OWNER" || value === "ADMIN" || value === "MEMBER" || value === "GUEST"
}

function isTeamProjectAccessRole(value: unknown): value is TeamProjectAccessRole {
  return value === "VIEWER" || value === "COMMENTER" || value === "EDITOR" || value === "MANAGER"
}

function isTeamProjectResourceStatus(value: unknown): value is TeamProjectResourceStatus {
  return value === "ACTIVE" || value === "INACTIVE"
}

function isTeamProjectAccessMode(value: unknown): value is TeamProjectAccessMode {
  return value === "PRIVATE" || value === "WORKSPACE_VISIBLE"
}

function isTeamProjectGrantStatus(value: unknown): value is TeamProjectGrantStatus {
  return value === "ACTIVE" || value === "INACTIVE"
}

function denyWorkspace(
  denialReason: TeamWorkspaceDenialReason,
): TeamWorkspaceCapabilityResolution {
  return {
    allowed: false,
    role: null,
    capabilities: NO_WORKSPACE_CAPABILITIES,
    denialReason,
  }
}

function denyProject(
  denialReason: TeamProjectDenialReason,
  workspaceRole: TeamWorkspaceRole | null = null,
): TeamProjectCapabilityResolution {
  return {
    allowed: false,
    workspaceRole,
    projectRole: null,
    accessSource: "none",
    capabilities: NO_PROJECT_CAPABILITIES,
    denialReason,
  }
}

export function resolveTeamWorkspaceCapabilities(
  input: TeamWorkspaceCapabilityInput,
): TeamWorkspaceCapabilityResolution {
  if (!input.identity) {
    return denyWorkspace("identity_missing")
  }

  if (!isNonEmptyId(input.identity.profileId)) {
    return denyWorkspace("identity_invalid")
  }

  if (!input.workspace) {
    return denyWorkspace("workspace_missing")
  }

  if (!isNonEmptyId(input.workspace.id) || !isTeamWorkspaceStatus(input.workspace.status)) {
    return denyWorkspace("workspace_status_invalid")
  }

  if (!isTeamProjectAccessRole(input.workspace.defaultProjectRole)) {
    return denyWorkspace("workspace_default_role_invalid")
  }

  if (input.workspace.status !== "ACTIVE") {
    return denyWorkspace("workspace_inactive")
  }

  if (!input.membership) {
    return denyWorkspace("membership_missing")
  }

  if (
    !isNonEmptyId(input.membership.id) ||
    !isNonEmptyId(input.membership.profileId) ||
    !isNonEmptyId(input.membership.workspaceId)
  ) {
    return denyWorkspace("membership_identity_mismatch")
  }

  if (!isTeamWorkspaceMembershipStatus(input.membership.status)) {
    return denyWorkspace("membership_status_invalid")
  }

  if (!isTeamWorkspaceRole(input.membership.role)) {
    return denyWorkspace("membership_role_invalid")
  }

  if (input.membership.profileId !== input.identity.profileId) {
    return denyWorkspace("membership_identity_mismatch")
  }

  if (input.membership.workspaceId !== input.workspace.id) {
    return denyWorkspace("membership_workspace_mismatch")
  }

  if (input.membership.status !== "ACTIVE") {
    return denyWorkspace("membership_inactive")
  }

  return {
    allowed: true,
    role: input.membership.role,
    capabilities: TEAM_WORKSPACE_CAPABILITIES_BY_ROLE[input.membership.role],
    denialReason: null,
  }
}

export function resolveTeamProjectCapabilities(
  input: TeamProjectCapabilityInput,
): TeamProjectCapabilityResolution {
  const workspaceDecision = resolveTeamWorkspaceCapabilities(input)

  if (!workspaceDecision.allowed) {
    return denyProject(workspaceDecision.denialReason ?? "project_access_unresolved")
  }

  const workspaceRole = workspaceDecision.role

  if (!input.workspace || !input.membership || !workspaceRole) {
    return denyProject("project_access_unresolved")
  }

  if (!input.project) {
    return denyProject("project_missing", workspaceRole)
  }

  if (
    !isNonEmptyId(input.project.id) ||
    !isNonEmptyId(input.project.workspaceId) ||
    !isTeamProjectResourceStatus(input.project.status)
  ) {
    return denyProject("project_status_invalid", workspaceRole)
  }

  if (!isTeamProjectAccessMode(input.project.accessMode)) {
    return denyProject("project_access_mode_invalid", workspaceRole)
  }

  if (input.project.status !== "ACTIVE") {
    return denyProject("project_inactive", workspaceRole)
  }

  if (input.project.workspaceId !== input.workspace.id) {
    return denyProject("project_workspace_mismatch", workspaceRole)
  }

  const directGrant = input.directGrant
  if (directGrant) {
    if (
      !isNonEmptyId(directGrant.projectId) ||
      !isNonEmptyId(directGrant.workspaceId) ||
      !isNonEmptyId(directGrant.membershipId) ||
      !isTeamProjectGrantStatus(directGrant.status)
    ) {
      return denyProject("direct_grant_status_invalid", workspaceRole)
    }

    if (!isTeamProjectAccessRole(directGrant.role)) {
      return denyProject("direct_grant_role_invalid", workspaceRole)
    }

    if (directGrant.projectId !== input.project.id) {
      return denyProject("direct_grant_project_mismatch", workspaceRole)
    }

    if (directGrant.workspaceId !== input.workspace.id) {
      return denyProject("direct_grant_workspace_mismatch", workspaceRole)
    }

    if (directGrant.membershipId !== input.membership.id) {
      return denyProject("direct_grant_membership_mismatch", workspaceRole)
    }
  }

  if (workspaceRole === "OWNER" || workspaceRole === "ADMIN") {
    return allowProject(workspaceRole, "MANAGER", "workspace_manager")
  }

  if (directGrant) {
    if (directGrant.status !== "ACTIVE") {
      return denyProject("direct_grant_inactive", workspaceRole)
    }

    return allowProject(workspaceRole, directGrant.role, "direct_grant")
  }

  if (workspaceRole === "GUEST") {
    return denyProject("guest_requires_direct_grant", workspaceRole)
  }

  if (input.project.accessMode === "PRIVATE") {
    return denyProject("private_project_requires_direct_grant", workspaceRole)
  }

  if (workspaceRole === "MEMBER" && input.project.accessMode === "WORKSPACE_VISIBLE") {
    return allowProject(workspaceRole, input.workspace.defaultProjectRole, "workspace_default")
  }

  return denyProject("project_access_unresolved", workspaceRole)
}

function allowProject(
  workspaceRole: TeamWorkspaceRole,
  projectRole: TeamProjectAccessRole,
  accessSource: Exclude<TeamProjectAccessSource, "none">,
): TeamProjectCapabilityResolution {
  return {
    allowed: true,
    workspaceRole,
    projectRole,
    accessSource,
    capabilities: TEAM_PROJECT_CAPABILITIES_BY_ROLE[projectRole],
    denialReason: null,
  }
}

function toBffDecisionCode(
  allowed: boolean,
  denialReason: TeamWorkspaceDenialReason | TeamProjectDenialReason | null,
): TeamWorkspaceCapabilityDecisionDto["code"] {
  if (allowed) {
    return "allowed"
  }

  if (denialReason === "identity_missing") {
    return "identity_required"
  }

  if (
    denialReason === "workspace_inactive" ||
    denialReason === "membership_inactive" ||
    denialReason === "project_inactive" ||
    denialReason === "direct_grant_inactive"
  ) {
    return "resource_unavailable"
  }

  return "not_found_or_forbidden"
}

export function toTeamWorkspaceCapabilityDecisionDto(
  resolution: TeamWorkspaceCapabilityResolution,
): TeamWorkspaceCapabilityDecisionDto {
  return {
    decision: resolution.allowed ? "ALLOW" : "DENY",
    role: resolution.allowed ? resolution.role : null,
    capabilities: resolution.allowed ? resolution.capabilities : NO_WORKSPACE_CAPABILITIES,
    code: toBffDecisionCode(resolution.allowed, resolution.denialReason),
  }
}

export function toTeamProjectCapabilityDecisionDto(
  resolution: TeamProjectCapabilityResolution,
): TeamProjectCapabilityDecisionDto {
  return {
    decision: resolution.allowed ? "ALLOW" : "DENY",
    workspaceRole: resolution.allowed ? resolution.workspaceRole : null,
    projectRole: resolution.allowed ? resolution.projectRole : null,
    accessSource: resolution.allowed ? resolution.accessSource : "none",
    capabilities: resolution.allowed ? resolution.capabilities : NO_PROJECT_CAPABILITIES,
    code: toBffDecisionCode(resolution.allowed, resolution.denialReason),
  }
}

export function hasTeamWorkspaceCapability(
  resolution: TeamWorkspaceCapabilityResolution,
  capability: TeamWorkspaceCapability,
): boolean {
  return resolution.allowed && resolution.capabilities.includes(capability)
}

export function hasTeamProjectCapability(
  resolution: TeamProjectCapabilityResolution,
  capability: TeamProjectCapability,
): boolean {
  return resolution.allowed && resolution.capabilities.includes(capability)
}

export type TeamWorkspaceCapabilityFixture = {
  id: string
  input: TeamProjectCapabilityInput
  expectedAllowed: boolean
  expectedWorkspaceRole?: TeamWorkspaceRole
  expectedProjectRole?: TeamProjectAccessRole
  expectedAccessSource?: TeamProjectAccessSource
  expectedDenialReason?: TeamProjectDenialReason
  requireWorkspaceCapabilities?: readonly TeamWorkspaceCapability[]
  denyWorkspaceCapabilities?: readonly TeamWorkspaceCapability[]
  requireProjectCapabilities?: readonly TeamProjectCapability[]
  denyProjectCapabilities?: readonly TeamProjectCapability[]
}

const ACTIVE_WORKSPACE = {
  id: "workspace-alpha",
  status: "ACTIVE",
  defaultProjectRole: "VIEWER",
} as const satisfies TeamWorkspaceContext

const ACTIVE_PROJECT = {
  id: "project-alpha",
  workspaceId: ACTIVE_WORKSPACE.id,
  status: "ACTIVE",
  accessMode: "WORKSPACE_VISIBLE",
} as const satisfies TeamProjectContext

function activeMembership(role: TeamWorkspaceRole): TeamWorkspaceMembershipContext {
  return {
    id: `membership-${role.toLowerCase()}`,
    workspaceId: ACTIVE_WORKSPACE.id,
    profileId: "profile-alpha",
    role,
    status: "ACTIVE",
  }
}

function fixtureInput(
  role: TeamWorkspaceRole,
  overrides: Partial<TeamProjectCapabilityInput> = {},
): TeamProjectCapabilityInput {
  return {
    identity: { profileId: "profile-alpha" },
    workspace: ACTIVE_WORKSPACE,
    membership: activeMembership(role),
    project: ACTIVE_PROJECT,
    directGrant: null,
    ...overrides,
  }
}

export const TEAM_WORKSPACE_CAPABILITY_FIXTURES: readonly TeamWorkspaceCapabilityFixture[] = [
  {
    id: "owner-manages-private-project-without-direct-grant",
    input: fixtureInput("OWNER", {
      project: { ...ACTIVE_PROJECT, accessMode: "PRIVATE" },
    }),
    expectedAllowed: true,
    expectedWorkspaceRole: "OWNER",
    expectedProjectRole: "MANAGER",
    expectedAccessSource: "workspace_manager",
    requireWorkspaceCapabilities: ["workspace.owner_policy.manage"],
    requireProjectCapabilities: ["project.access.manage", "project.transfer"],
  },
  {
    id: "admin-manages-private-project-but-not-owner-policy",
    input: fixtureInput("ADMIN", {
      project: { ...ACTIVE_PROJECT, accessMode: "PRIVATE" },
    }),
    expectedAllowed: true,
    expectedWorkspaceRole: "ADMIN",
    expectedProjectRole: "MANAGER",
    expectedAccessSource: "workspace_manager",
    requireWorkspaceCapabilities: ["workspace.members.invite", "workspace.policy.manage"],
    denyWorkspaceCapabilities: ["workspace.owner_policy.manage"],
    requireProjectCapabilities: ["project.access.manage"],
  },
  {
    id: "member-inherits-viewer-on-workspace-visible-project",
    input: fixtureInput("MEMBER"),
    expectedAllowed: true,
    expectedWorkspaceRole: "MEMBER",
    expectedProjectRole: "VIEWER",
    expectedAccessSource: "workspace_default",
    requireProjectCapabilities: ["project.read"],
    denyProjectCapabilities: ["feedback.create", "project.content.write"],
  },
  {
    id: "member-direct-commenter-grant-overrides-default",
    input: fixtureInput("MEMBER", {
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: activeMembership("MEMBER").id,
        role: "COMMENTER",
        status: "ACTIVE",
      },
    }),
    expectedAllowed: true,
    expectedProjectRole: "COMMENTER",
    expectedAccessSource: "direct_grant",
    requireProjectCapabilities: ["feedback.create", "feedback.update_own"],
    denyProjectCapabilities: ["project.content.write"],
  },
  {
    id: "direct-viewer-grant-exactly-overrides-stronger-workspace-default",
    input: fixtureInput("MEMBER", {
      workspace: { ...ACTIVE_WORKSPACE, defaultProjectRole: "EDITOR" },
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: activeMembership("MEMBER").id,
        role: "VIEWER",
        status: "ACTIVE",
      },
    }),
    expectedAllowed: true,
    expectedProjectRole: "VIEWER",
    expectedAccessSource: "direct_grant",
    requireProjectCapabilities: ["project.read"],
    denyProjectCapabilities: ["feedback.create", "project.content.write"],
  },
  {
    id: "guest-requires-direct-grant-for-workspace-visible-project",
    input: fixtureInput("GUEST"),
    expectedAllowed: false,
    expectedDenialReason: "guest_requires_direct_grant",
    denyWorkspaceCapabilities: ["workspace.projects.list", "workspace.members.invite"],
  },
  {
    id: "guest-with-direct-viewer-grant-can-read-project",
    input: fixtureInput("GUEST", {
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: activeMembership("GUEST").id,
        role: "VIEWER",
        status: "ACTIVE",
      },
    }),
    expectedAllowed: true,
    expectedProjectRole: "VIEWER",
    expectedAccessSource: "direct_grant",
    requireProjectCapabilities: ["project.read"],
    denyProjectCapabilities: ["feedback.create"],
  },
  {
    id: "private-project-denies-member-without-direct-grant",
    input: fixtureInput("MEMBER", {
      project: { ...ACTIVE_PROJECT, accessMode: "PRIVATE" },
    }),
    expectedAllowed: false,
    expectedDenialReason: "private_project_requires_direct_grant",
  },
  {
    id: "missing-membership-denies-project-access",
    input: fixtureInput("MEMBER", { membership: null }),
    expectedAllowed: false,
    expectedDenialReason: "membership_missing",
  },
  {
    id: "suspended-membership-denies-old-workspace-selection",
    input: fixtureInput("MEMBER", {
      membership: { ...activeMembership("MEMBER"), status: "SUSPENDED" },
    }),
    expectedAllowed: false,
    expectedDenialReason: "membership_inactive",
  },
  {
    id: "cross-workspace-membership-denies-guessed-workspace",
    input: fixtureInput("MEMBER", {
      membership: { ...activeMembership("MEMBER"), workspaceId: "workspace-other" },
    }),
    expectedAllowed: false,
    expectedDenialReason: "membership_workspace_mismatch",
  },
  {
    id: "cross-workspace-project-denies-guessed-project",
    input: fixtureInput("MEMBER", {
      project: { ...ACTIVE_PROJECT, workspaceId: "workspace-other" },
    }),
    expectedAllowed: false,
    expectedDenialReason: "project_workspace_mismatch",
  },
  {
    id: "cross-membership-direct-grant-denies-access",
    input: fixtureInput("MEMBER", {
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: "membership-other",
        role: "MANAGER",
        status: "ACTIVE",
      },
    }),
    expectedAllowed: false,
    expectedDenialReason: "direct_grant_membership_mismatch",
  },
  {
    id: "inactive-workspace-denies-all-capabilities",
    input: fixtureInput("OWNER", {
      workspace: { ...ACTIVE_WORKSPACE, status: "SUSPENDED" },
    }),
    expectedAllowed: false,
    expectedDenialReason: "workspace_inactive",
  },
  {
    id: "unknown-runtime-workspace-role-fails-closed",
    input: fixtureInput("MEMBER", {
      membership: {
        ...activeMembership("MEMBER"),
        role: "UNKNOWN_ROLE" as TeamWorkspaceRole,
      },
    }),
    expectedAllowed: false,
    expectedDenialReason: "membership_role_invalid",
  },
  {
    id: "unknown-runtime-project-role-fails-closed",
    input: fixtureInput("MEMBER", {
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: activeMembership("MEMBER").id,
        role: "UNKNOWN_ROLE" as TeamProjectAccessRole,
        status: "ACTIVE",
      },
    }),
    expectedAllowed: false,
    expectedDenialReason: "direct_grant_role_invalid",
  },
  {
    id: "inactive-project-denies-all-capabilities",
    input: fixtureInput("OWNER", {
      project: { ...ACTIVE_PROJECT, status: "INACTIVE" },
    }),
    expectedAllowed: false,
    expectedDenialReason: "project_inactive",
  },
  {
    id: "inactive-direct-grant-denies-private-project",
    input: fixtureInput("MEMBER", {
      project: { ...ACTIVE_PROJECT, accessMode: "PRIVATE" },
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: activeMembership("MEMBER").id,
        role: "EDITOR",
        status: "INACTIVE",
      },
    }),
    expectedAllowed: false,
    expectedDenialReason: "direct_grant_inactive",
  },
  {
    id: "editor-cannot-invite-or-manage-workspace-policy",
    input: fixtureInput("MEMBER", {
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: activeMembership("MEMBER").id,
        role: "EDITOR",
        status: "ACTIVE",
      },
    }),
    expectedAllowed: true,
    expectedProjectRole: "EDITOR",
    requireProjectCapabilities: ["project.content.write"],
    denyWorkspaceCapabilities: ["workspace.members.invite", "workspace.policy.manage"],
  },
  {
    id: "project-manager-cannot-change-owner-policy-as-workspace-member",
    input: fixtureInput("MEMBER", {
      directGrant: {
        projectId: ACTIVE_PROJECT.id,
        workspaceId: ACTIVE_WORKSPACE.id,
        membershipId: activeMembership("MEMBER").id,
        role: "MANAGER",
        status: "ACTIVE",
      },
    }),
    expectedAllowed: true,
    expectedProjectRole: "MANAGER",
    requireProjectCapabilities: ["project.access.manage", "project.feedback_memory.review"],
    denyWorkspaceCapabilities: ["workspace.owner_policy.manage"],
  },
] as const

export type TeamWorkspaceCapabilityFixtureFailure = {
  fixtureId: string
  message: string
}

export function checkTeamWorkspaceCapabilityFixtures(): readonly TeamWorkspaceCapabilityFixtureFailure[] {
  const failures: TeamWorkspaceCapabilityFixtureFailure[] = []

  for (const fixture of TEAM_WORKSPACE_CAPABILITY_FIXTURES) {
    const workspaceResolution = resolveTeamWorkspaceCapabilities(fixture.input)
    const projectResolution = resolveTeamProjectCapabilities(fixture.input)

    if (projectResolution.allowed !== fixture.expectedAllowed) {
      failures.push({
        fixtureId: fixture.id,
        message: `Expected allowed=${fixture.expectedAllowed}; received ${projectResolution.allowed}.`,
      })
    }

    if (
      fixture.expectedWorkspaceRole !== undefined &&
      workspaceResolution.role !== fixture.expectedWorkspaceRole
    ) {
      failures.push({
        fixtureId: fixture.id,
        message: `Expected workspace role ${fixture.expectedWorkspaceRole}; received ${workspaceResolution.role ?? "none"}.`,
      })
    }

    if (
      fixture.expectedProjectRole !== undefined &&
      projectResolution.projectRole !== fixture.expectedProjectRole
    ) {
      failures.push({
        fixtureId: fixture.id,
        message: `Expected project role ${fixture.expectedProjectRole}; received ${projectResolution.projectRole ?? "none"}.`,
      })
    }

    if (
      fixture.expectedAccessSource !== undefined &&
      projectResolution.accessSource !== fixture.expectedAccessSource
    ) {
      failures.push({
        fixtureId: fixture.id,
        message: `Expected access source ${fixture.expectedAccessSource}; received ${projectResolution.accessSource}.`,
      })
    }

    if (
      fixture.expectedDenialReason !== undefined &&
      projectResolution.denialReason !== fixture.expectedDenialReason
    ) {
      failures.push({
        fixtureId: fixture.id,
        message: `Expected denial reason ${fixture.expectedDenialReason}; received ${projectResolution.denialReason ?? "none"}.`,
      })
    }

    for (const capability of fixture.requireWorkspaceCapabilities ?? []) {
      if (!hasTeamWorkspaceCapability(workspaceResolution, capability)) {
        failures.push({
          fixtureId: fixture.id,
          message: `Expected workspace capability ${capability}.`,
        })
      }
    }

    for (const capability of fixture.denyWorkspaceCapabilities ?? []) {
      if (hasTeamWorkspaceCapability(workspaceResolution, capability)) {
        failures.push({
          fixtureId: fixture.id,
          message: `Expected workspace capability ${capability} to be denied.`,
        })
      }
    }

    for (const capability of fixture.requireProjectCapabilities ?? []) {
      if (!hasTeamProjectCapability(projectResolution, capability)) {
        failures.push({
          fixtureId: fixture.id,
          message: `Expected project capability ${capability}.`,
        })
      }
    }

    for (const capability of fixture.denyProjectCapabilities ?? []) {
      if (hasTeamProjectCapability(projectResolution, capability)) {
        failures.push({
          fixtureId: fixture.id,
          message: `Expected project capability ${capability} to be denied.`,
        })
      }
    }
  }

  return failures
}

export type TeamCollaborationBffOperationPolicy = {
  operationId:
    | "workspace.select"
    | "workspace.project_index.read"
    | "workspace.project.create"
    | "workspace.members.read"
    | "workspace.member.invite"
    | "workspace.member.manage"
    | "workspace.policy.manage"
    | "workspace.audit.read"
    | "workspace.project.receive_transfer"
    | "project.read"
    | "feedback.create"
    | "feedback.update_own"
    | "feedback.moderate"
    | "project.content.write"
    | "project.access.manage"
    | "project.transfer"
    | "project.feedback_memory.review"
  requiredWorkspaceCapability: TeamWorkspaceCapability | null
  requiredProjectCapability: TeamProjectCapability | null
  additionalChecks: readonly string[]
  deniedDtoCode: "access_denied"
}

export const TEAMCOLLAB_BFF_OPERATION_POLICIES = [
  {
    operationId: "workspace.select",
    requiredWorkspaceCapability: "workspace.read",
    requiredProjectCapability: null,
    additionalChecks: ["selected workspace is a preference only; re-authorize every request"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.project_index.read",
    requiredWorkspaceCapability: "workspace.read",
    requiredProjectCapability: null,
    additionalChecks: [
      "resolve every returned project independently",
      "guest index contains direct-grant projects only",
    ],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.project.create",
    requiredWorkspaceCapability: "workspace.projects.create",
    requiredProjectCapability: null,
    additionalChecks: ["validate project input", "recheck capability in the write service"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.members.read",
    requiredWorkspaceCapability: "workspace.members.read",
    requiredProjectCapability: null,
    additionalChecks: ["return UI-safe member DTOs only"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.member.invite",
    requiredWorkspaceCapability: "workspace.members.invite",
    requiredProjectCapability: null,
    additionalChecks: ["exact normalized email", "trusted-server delivery only"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.member.manage",
    requiredWorkspaceCapability: "workspace.members.manage",
    requiredProjectCapability: null,
    additionalChecks: ["keep at least one active owner", "audit before and after state"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.policy.manage",
    requiredWorkspaceCapability: "workspace.policy.manage",
    requiredProjectCapability: null,
    additionalChecks: ["owner-only policy also requires workspace.owner_policy.manage"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.audit.read",
    requiredWorkspaceCapability: "workspace.audit.read",
    requiredProjectCapability: null,
    additionalChecks: ["redact secrets and private feedback content"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "workspace.project.receive_transfer",
    requiredWorkspaceCapability: "workspace.project.receive_transfer",
    requiredProjectCapability: null,
    additionalChecks: ["target workspace must be active", "actor must be target OWNER or ADMIN"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "project.read",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "project.read",
    additionalChecks: ["safe not-found-or-forbidden response"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "feedback.create",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "feedback.create",
    additionalChecks: ["persist attributed author and source version"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "feedback.update_own",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "feedback.update_own",
    additionalChecks: ["service must recheck feedback.authorProfileId"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "feedback.moderate",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "feedback.moderate",
    additionalChecks: ["moderation never rewrites authorship", "audit moderation action"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "project.content.write",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "project.content.write",
    additionalChecks: ["re-authorize the project inside the write service"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "project.access.manage",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "project.access.manage",
    additionalChecks: ["grant membership must belong to project workspace", "audit role changes"],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "project.transfer",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "project.transfer",
    additionalChecks: [
      "target resolver requires workspace.project.receive_transfer",
      "preserve stable project ID",
      "must preserve Client Portal visibility and token",
    ],
    deniedDtoCode: "access_denied",
  },
  {
    operationId: "project.feedback_memory.review",
    requiredWorkspaceCapability: null,
    requiredProjectCapability: "project.feedback_memory.review",
    additionalChecks: [
      "project-scoped evidence only",
      "no automatic durable memory promotion",
      "externalRegisterable remains false",
    ],
    deniedDtoCode: "access_denied",
  },
] as const satisfies readonly TeamCollaborationBffOperationPolicy[]

export type TeamcollabAut008CoverageRow = {
  scenarioId: string
  proofKind: "resolver_fixture" | "bff_operation_policy" | "declared_followup_boundary"
  coveredBy: readonly string[]
  runtimeProofClaimed: false
}

export const TEAMCOLLAB_AUT_008_NEGATIVE_COVERAGE = [
  {
    scenarioId: "non_member_lists_workspace_projects",
    proofKind: "resolver_fixture",
    coveredBy: ["missing-membership-denies-project-access"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "member_guesses_other_workspace_project",
    proofKind: "resolver_fixture",
    coveredBy: [
      "cross-workspace-membership-denies-guessed-workspace",
      "cross-workspace-project-denies-guessed-project",
    ],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "guest_lists_visible_project_without_grant",
    proofKind: "resolver_fixture",
    coveredBy: ["guest-requires-direct-grant-for-workspace-visible-project"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "viewer_posts_feedback",
    proofKind: "resolver_fixture",
    coveredBy: ["member-inherits-viewer-on-workspace-visible-project"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "commenter_edits_project_content",
    proofKind: "resolver_fixture",
    coveredBy: ["member-direct-commenter-grant-overrides-default"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "editor_invites_member",
    proofKind: "bff_operation_policy",
    coveredBy: ["workspace.member.invite", "editor-cannot-invite-or-manage-workspace-policy"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "project_manager_changes_workspace_owner_policy",
    proofKind: "bff_operation_policy",
    coveredBy: [
      "workspace.policy.manage",
      "workspace.owner_policy.manage",
      "project-manager-cannot-change-owner-policy-as-workspace-member",
    ],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "wrong_email_accepts_invitation",
    proofKind: "declared_followup_boundary",
    coveredBy: ["TEAMCOLLAB-006 exact authenticated-email acceptance"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "expired_or_revoked_invitation_reused",
    proofKind: "declared_followup_boundary",
    coveredBy: ["TEAMCOLLAB-006 invitation lifecycle validator"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "suspended_member_uses_old_workspace_preference",
    proofKind: "resolver_fixture",
    coveredBy: ["suspended-membership-denies-old-workspace-selection"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "project_transfer_expands_client_portal_visibility",
    proofKind: "bff_operation_policy",
    coveredBy: ["project.transfer", "must preserve Client Portal visibility and token"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "workagent_requests_other_workspace_feedback",
    proofKind: "resolver_fixture",
    coveredBy: ["cross-workspace-project-denies-guessed-project", "externalRegisterable=false"],
    runtimeProofClaimed: false,
  },
  {
    scenarioId: "withdrawn_feedback_appears_in_new_ai_retrieval",
    proofKind: "declared_followup_boundary",
    coveredBy: ["TEAMCOLLAB-009 retrieval eligibility and memory invalidation"],
    runtimeProofClaimed: false,
  },
] as const satisfies readonly TeamcollabAut008CoverageRow[]

export const TEAMCOLLAB_BFF_PATH = [
  "Server Component loader or validated Server Action",
  "requireUser()",
  "workspace membership lookup",
  "resolveTeamWorkspaceCapabilities()",
  "project workspace and direct-grant lookup",
  "resolveTeamProjectCapabilities()",
  "domain service capability check",
  "UI-safe DTO mapper",
  "Client Component interaction",
] as const

export const TEAM_WORKSPACE_CAPABILITY_CONTRACT = {
  id: "TEAMCOLLAB-003",
  version: "0.1.0",
  status: "contract_only_no_runtime",
  mode: "pure_server_only_capability_resolution",
  precedence: [
    "deny invalid identity, workspace, membership, project, or cross-workspace context",
    "grant workspace OWNER or ADMIN project MANAGER capabilities",
    "apply an active same-project same-membership direct grant",
    "inherit the workspace default only for active MEMBER on WORKSPACE_VISIBLE projects",
    "deny GUEST inheritance and PRIVATE access without a direct grant",
  ],
  bffBoundary: {
    input: "server_authorized_context_only",
    output: "redacted_capability_decision_dto",
    path: TEAMCOLLAB_BFF_PATH,
    operationPolicies: TEAMCOLLAB_BFF_OPERATION_POLICIES,
    hides: [
      "profileId",
      "membershipId",
      "workspaceId",
      "projectId",
      "direct grant relation details",
      "internal denial diagnostics",
    ],
  },
  safety: {
    runtimeDbReadAllowed: false,
    runtimeDbWriteAllowed: false,
    schemaMigrationAllowed: false,
    migrationApplyAllowed: false,
    seedChangeAllowed: false,
    routeHandlerAllowed: false,
    serverActionAllowed: false,
    providerRuntimeAllowed: false,
    invitationDeliveryAllowed: false,
    projectTransferWriteAllowed: false,
    publicOutputAllowed: false,
    clientPortalVisibilityChangeAllowed: false,
    aiRuntimeAllowed: false,
    automaticMemoryPromotionAllowed: false,
    agentFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
    launchLevelUpgradeClaimed: false,
  },
  nandaBoundary: {
    affectedAgent: "WorkAgent",
    lifecycle: "internal_protected_proposal_only",
    dataVisibility: "one_authorized_project_workspace",
    externalRegisterable: false,
  },
  negativeCoverage: TEAMCOLLAB_AUT_008_NEGATIVE_COVERAGE,
  sourceRefs: [
    "docs/07_research-and-design/RES-026_team-workspace-project-collaboration-and-ai-feedback-memory-research.md",
    "docs/02_architecture-and-rules/SCH-006_team-workspace-project-collaboration-schema-proposal.md",
    "docs/02_architecture-and-rules/AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md",
    "docs/05_execution-plans/PLN-066_team-workspace-collaboration-implementation-plan.md",
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  ],
} as const
