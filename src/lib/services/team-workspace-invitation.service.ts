import "server-only"

import { createHash, randomBytes, randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import {
  hasTeamWorkspaceCapability,
  resolveTeamWorkspaceCapabilities,
} from "@/lib/contracts/team-workspace-capability.contract"
import { db } from "@/lib/db"
import { isTeamCollaborationAuditStorageReady } from "@/lib/services/team-workspace-audit-readiness.service"
import type {
  AcceptTeamWorkspaceInvitationCommandInput,
  AcceptTeamWorkspaceInvitationCommandResult,
  CreateTeamWorkspaceInvitationCommandInput,
  CreateTeamWorkspaceInvitationCommandResult,
  RevokeTeamWorkspaceInvitationCommandInput,
  RevokeTeamWorkspaceInvitationCommandResult,
  TeamWorkspaceInvitationDto,
  TeamWorkspaceInvitationErrorCode,
  TeamWorkspaceInvitationIndexDto,
  TeamWorkspaceInvitationProjectRole,
  TeamWorkspaceInvitationWorkspaceRole,
} from "@/types/team-workspace-invitation"

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const INVITATION_REDACTION_VERSION = "teamcollab-006-v1" as const
const INVITATION_RETENTION_CLASS =
  "high_risk_7_year_review_required" as const
const INVITATION_APPROVAL_LEVEL = "workspace_manager" as const
const INVITATION_TARGET_TYPE = "workspace_invitation" as const
const MAX_TRANSACTION_ATTEMPTS = 3
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i

const WORKSPACE_ROLE_RANK = {
  GUEST: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
} as const satisfies Record<TeamWorkspaceInvitationWorkspaceRole, number>

const PROJECT_ROLE_RANK = {
  VIEWER: 0,
  COMMENTER: 1,
  EDITOR: 2,
  MANAGER: 3,
} as const satisfies Record<TeamWorkspaceInvitationProjectRole, number>

type InvitationAuditAction =
  | "workspace.member.invited"
  | "workspace.invitation.accepted"
  | "workspace.invitation.revoked"
  | "workspace.invitation.expired"

type WorkspaceManagerContext = {
  workspace: {
    id: string
    name: string
    status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
    defaultProjectAccessRole: TeamWorkspaceInvitationProjectRole
  }
  membership: {
    id: string
    workspaceId: string
    profileId: string
    role: TeamWorkspaceInvitationWorkspaceRole
    status: "ACTIVE" | "SUSPENDED" | "LEFT" | "REMOVED"
  }
}

type InvitationRecordForDto = {
  id: string
  normalizedEmail: string
  workspaceRole: TeamWorkspaceInvitationWorkspaceRole
  projectId: string | null
  projectRole: TeamWorkspaceInvitationProjectRole | null
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  expiresAt: Date
  createdAt: Date
  project: { id: string; name: string } | null
}

type AcceptTransactionOutcome =
  | { ok: true; result: AcceptTeamWorkspaceInvitationCommandResult }
  | { ok: false; code: TeamWorkspaceInvitationErrorCode }

export class TeamWorkspaceInvitationError extends Error {
  constructor(
    public readonly code: TeamWorkspaceInvitationErrorCode,
    message = code,
  ) {
    super(message)
    this.name = "TeamWorkspaceInvitationError"
  }
}

function unavailableIndex(
  state: TeamWorkspaceInvitationIndexDto["state"] = "unavailable",
): TeamWorkspaceInvitationIndexDto {
  return {
    source: "unavailable",
    state,
    recipientRequirement: "existing_profile_with_verified_email",
    workspace: null,
    capabilities: {
      canReadMembers: false,
      canInvite: false,
      canManage: false,
    },
    projects: [],
    invitations: [],
    members: [],
  }
}

function normalizeEmail(email: unknown): string {
  if (typeof email !== "string") {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }

  const normalized = email.trim().normalize("NFKC").toLowerCase()
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }

  return normalized
}

function normalizeUuid(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  return value.toLowerCase()
}

function normalizeWorkspaceRole(
  value: unknown,
): TeamWorkspaceInvitationWorkspaceRole {
  if (
    value !== "OWNER" &&
    value !== "ADMIN" &&
    value !== "MEMBER" &&
    value !== "GUEST"
  ) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  return value
}

function normalizeProjectRole(
  value: unknown,
): TeamWorkspaceInvitationProjectRole | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (
    value !== "VIEWER" &&
    value !== "COMMENTER" &&
    value !== "EDITOR" &&
    value !== "MANAGER"
  ) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  return value
}

function normalizeOptionalProjectId(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  return normalizeUuid(value)
}

function normalizeCreateInput(input: CreateTeamWorkspaceInvitationCommandInput) {
  const candidate: unknown = input
  if (!candidate || typeof candidate !== "object") {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  const raw = candidate as Record<string, unknown>
  const projectId = normalizeOptionalProjectId(raw.projectId)
  const projectRole = normalizeProjectRole(raw.projectRole)

  if (Boolean(projectId) !== Boolean(projectRole)) {
    throw new TeamWorkspaceInvitationError("project_scope_invalid")
  }

  return {
    workspaceId: normalizeUuid(raw.workspaceId),
    normalizedEmail: normalizeEmail(raw.email),
    workspaceRole: normalizeWorkspaceRole(raw.workspaceRole),
    projectId,
    projectRole,
    idempotencyKey: normalizeUuid(raw.idempotencyKey),
  }
}

function normalizeRevokeInput(input: RevokeTeamWorkspaceInvitationCommandInput) {
  const candidate: unknown = input
  if (!candidate || typeof candidate !== "object") {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  const raw = candidate as Record<string, unknown>
  return {
    workspaceId: normalizeUuid(raw.workspaceId),
    invitationId: normalizeUuid(raw.invitationId),
    idempotencyKey: normalizeUuid(raw.idempotencyKey),
  }
}

function normalizeAcceptInput(input: AcceptTeamWorkspaceInvitationCommandInput) {
  const candidate: unknown = input
  if (!candidate || typeof candidate !== "object") {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  const raw = candidate as Record<string, unknown>
  if (typeof raw.token !== "string" || !TOKEN_PATTERN.test(raw.token)) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  return { token: raw.token.toLowerCase() }
}

function createRequestRef(
  actorProfileId: string,
  action: InvitationAuditAction,
  idempotencyMaterial: string,
): string {
  return createHash("sha256")
    .update(
      `teamcollab-006\u0000${actorProfileId}\u0000${action}\u0000${idempotencyMaterial}`,
    )
    .digest("hex")
}

function digestInvitationToken(token: string): string {
  return createHash("sha256")
    .update(`teamcollab-006-invitation\u0000${token}`)
    .digest("hex")
}

function isRetryableTransactionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as { code?: unknown; cause?: { code?: unknown } }
  const code = candidate.code ?? candidate.cause?.code
  return code === "P2002" || code === "P2034" || code === "23505" || code === "40001"
}

function isMissingAuditStorageError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false
  return (error as { code?: unknown }).code === "P2021"
}

function strongerWorkspaceRole(
  existing: TeamWorkspaceInvitationWorkspaceRole,
  requested: TeamWorkspaceInvitationWorkspaceRole,
): TeamWorkspaceInvitationWorkspaceRole {
  return WORKSPACE_ROLE_RANK[existing] >= WORKSPACE_ROLE_RANK[requested]
    ? existing
    : requested
}

function strongerProjectRole(
  existing: TeamWorkspaceInvitationProjectRole,
  requested: TeamWorkspaceInvitationProjectRole,
): TeamWorkspaceInvitationProjectRole {
  return PROJECT_ROLE_RANK[existing] >= PROJECT_ROLE_RANK[requested]
    ? existing
    : requested
}

function toInvitationDto(
  invitation: InvitationRecordForDto,
  now = new Date(),
): TeamWorkspaceInvitationDto {
  const effectiveStatus =
    invitation.status === "PENDING" && invitation.expiresAt.getTime() <= now.getTime()
      ? "EXPIRED"
      : invitation.status

  return {
    id: invitation.id,
    normalizedEmail: invitation.normalizedEmail,
    workspaceRole: invitation.workspaceRole,
    project:
      invitation.project && invitation.projectId && invitation.projectRole
        ? {
            id: invitation.project.id,
            name: invitation.project.name,
            role: invitation.projectRole,
          }
        : null,
    status: effectiveStatus,
    expiresAt: invitation.expiresAt.toISOString(),
    createdAt: invitation.createdAt.toISOString(),
    deliveryStatus: "manual_email_link",
  }
}

async function loadWorkspaceManagerContext(
  tx: Prisma.TransactionClient,
  actorProfileId: string,
  workspaceId: string,
  requiredCapability: "workspace.members.read" | "workspace.members.invite" | "workspace.members.manage",
): Promise<WorkspaceManagerContext> {
  const row = await tx.workspaceMembership.findUnique({
    where: {
      workspaceId_profileId: { workspaceId, profileId: actorProfileId },
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
        },
      },
    },
  })

  if (!row || row.workspace.type !== "TEAM") {
    throw new TeamWorkspaceInvitationError("not_found_or_forbidden")
  }

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
    status: row.workspace.status,
    defaultProjectAccessRole: row.workspace.defaultProjectAccessRole,
  }
  const resolution = resolveTeamWorkspaceCapabilities({
    identity: { profileId: actorProfileId },
    workspace: {
      id: workspace.id,
      status: workspace.status,
      defaultProjectRole: workspace.defaultProjectAccessRole,
    },
    membership,
  })

  if (!hasTeamWorkspaceCapability(resolution, requiredCapability)) {
    throw new TeamWorkspaceInvitationError("not_found_or_forbidden")
  }

  return { workspace, membership }
}

async function writeInvitationAudit(
  tx: Prisma.TransactionClient,
  input: {
    actorProfileId: string
    action: InvitationAuditAction
    invitationId: string
    requestRef: string
    result: "success" | "blocked"
    beforeRef: string | null
    afterRef: string | null
  },
): Promise<void> {
  const existing = await tx.operatingAuditEvent.findFirst({
    where: {
      actorRef: input.actorProfileId,
      action: input.action,
      requestRef: input.requestRef,
    },
    select: { targetRef: true, result: true },
  })
  if (existing) {
    if (
      existing.targetRef !== input.invitationId ||
      existing.result !== input.result
    ) {
      throw new TeamWorkspaceInvitationError("idempotency_conflict")
    }
    return
  }

  await tx.operatingAuditEvent.create({
    data: {
      occurredAt: new Date(),
      actorType: "profile",
      actorRef: input.actorProfileId,
      requestRef: input.requestRef,
      moduleKey: "work",
      action: input.action,
      targetType: INVITATION_TARGET_TYPE,
      targetRef: input.invitationId,
      result: input.result,
      riskLevel: "HIGH",
      approvalLevel: INVITATION_APPROVAL_LEVEL,
      humanApprovalRequired: true,
      sourceKind: "server_action",
      beforeRef: input.beforeRef,
      afterRef: input.afterRef,
      metadata: {},
      redactionVersion: INVITATION_REDACTION_VERSION,
      retentionClass: INVITATION_RETENTION_CLASS,
    },
    select: { id: true },
  })
}

async function findCreateReplay(
  tx: Prisma.TransactionClient,
  actorProfileId: string,
  requestRef: string,
  normalized: ReturnType<typeof normalizeCreateInput>,
): Promise<CreateTeamWorkspaceInvitationCommandResult | null> {
  const audit = await tx.operatingAuditEvent.findFirst({
    where: {
      actorRef: actorProfileId,
      action: "workspace.member.invited",
      requestRef,
    },
    select: { targetRef: true },
  })
  if (!audit) return null
  if (!audit.targetRef) throw new TeamWorkspaceInvitationError("unavailable")

  const invitation = await tx.collaborationInvitation.findFirst({
    where: { id: audit.targetRef, workspaceId: normalized.workspaceId },
    select: {
      id: true,
      normalizedEmail: true,
      workspaceRole: true,
      projectId: true,
      projectRole: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
    },
  })

  if (
    !invitation ||
    invitation.normalizedEmail !== normalized.normalizedEmail ||
    invitation.workspaceRole !== normalized.workspaceRole ||
    invitation.projectId !== normalized.projectId ||
    invitation.projectRole !== normalized.projectRole
  ) {
    throw new TeamWorkspaceInvitationError("idempotency_conflict")
  }

  return {
    invitation: toInvitationDto(invitation),
    acceptanceUrl: null,
    deliveryStatus: "manual_email_link",
    idempotentReplay: true,
  }
}

export async function getTeamWorkspaceInvitationIndexForProfile(
  actorProfileId: string,
  workspaceId: string,
): Promise<TeamWorkspaceInvitationIndexDto> {
  if (!UUID_PATTERN.test(actorProfileId) || !UUID_PATTERN.test(workspaceId)) {
    return unavailableIndex("not_found_or_forbidden")
  }

  try {
    return await db.$transaction(async (tx) => {
      const context = await loadWorkspaceManagerContext(
        tx,
        actorProfileId,
        workspaceId,
        "workspace.members.read",
      )
      const resolution = resolveTeamWorkspaceCapabilities({
        identity: { profileId: actorProfileId },
        workspace: {
          id: context.workspace.id,
          status: context.workspace.status,
          defaultProjectRole: context.workspace.defaultProjectAccessRole,
        },
        membership: context.membership,
      })

      const [invitations, members, projects] = await Promise.all([
        tx.collaborationInvitation.findMany({
          where: { workspaceId },
          select: {
            id: true,
            normalizedEmail: true,
            workspaceRole: true,
            projectId: true,
            projectRole: true,
            status: true,
            expiresAt: true,
            createdAt: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        tx.workspaceMembership.findMany({
          where: { workspaceId },
          select: {
            id: true,
            role: true,
            status: true,
            joinedAt: true,
            profile: { select: { email: true, fullName: true } },
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        }),
        tx.project.findMany({
          where: { workspaceId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ])

      return {
        source: "database",
        state:
          invitations.length === 0 && members.length === 0 ? "empty" : "ready",
        recipientRequirement: "existing_profile_with_verified_email",
        workspace: { id: context.workspace.id, name: context.workspace.name },
        capabilities: {
          canReadMembers: hasTeamWorkspaceCapability(
            resolution,
            "workspace.members.read",
          ),
          canInvite: hasTeamWorkspaceCapability(
            resolution,
            "workspace.members.invite",
          ),
          canManage: hasTeamWorkspaceCapability(
            resolution,
            "workspace.members.manage",
          ),
        },
        projects,
        invitations: invitations.map((invitation) =>
          toInvitationDto(invitation),
        ),
        members: members.map((member) => ({
          membershipId: member.id,
          displayName:
            member.profile.fullName?.trim() || member.profile.email,
          email: normalizeEmail(member.profile.email),
          role: member.role,
          status: member.status,
          joinedAt: member.joinedAt?.toISOString() ?? null,
        })),
      }
    })
  } catch (error) {
    if (
      error instanceof TeamWorkspaceInvitationError &&
      error.code === "not_found_or_forbidden"
    ) {
      return unavailableIndex("not_found_or_forbidden")
    }
    return unavailableIndex()
  }
}

export async function createTeamWorkspaceInvitationForProfile(
  actorProfileId: string,
  input: CreateTeamWorkspaceInvitationCommandInput,
): Promise<CreateTeamWorkspaceInvitationCommandResult> {
  if (!UUID_PATTERN.test(actorProfileId)) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  const normalized = normalizeCreateInput(input)
  const requestRef = createRequestRef(
    actorProfileId,
    "workspace.member.invited",
    normalized.idempotencyKey,
  )

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          await tx.$executeRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`team-invite:${normalized.workspaceId}:${normalized.normalizedEmail}`}))`,
          )

          if (
            !(await isTeamCollaborationAuditStorageReady(
              tx,
              "workspace.invitation",
            ))
          ) {
            throw new TeamWorkspaceInvitationError(
              "audit_storage_unavailable",
            )
          }

          const context = await loadWorkspaceManagerContext(
            tx,
            actorProfileId,
            normalized.workspaceId,
            "workspace.members.invite",
          )
          if (
            normalized.workspaceRole === "OWNER" &&
            context.membership.role !== "OWNER"
          ) {
            throw new TeamWorkspaceInvitationError(
              "owner_invite_requires_owner",
            )
          }

          const replay = await findCreateReplay(
            tx,
            actorProfileId,
            requestRef,
            normalized,
          )
          if (replay) return replay

          if (normalized.projectId) {
            const project = await tx.project.findFirst({
              where: {
                id: normalized.projectId,
                workspaceId: normalized.workspaceId,
              },
              select: { id: true },
            })
            if (!project) {
              throw new TeamWorkspaceInvitationError("project_scope_invalid")
            }
          }

          const recipientProfile = await tx.profile.findFirst({
            where: {
              email: {
                equals: normalized.normalizedEmail,
                mode: "insensitive",
              },
            },
            select: {
              workspaceMemberships: {
                where: { workspaceId: normalized.workspaceId },
                select: { status: true },
                take: 1,
              },
            },
          })
          const existingMembership =
            recipientProfile?.workspaceMemberships[0] ?? null
          if (!recipientProfile) {
            throw new TeamWorkspaceInvitationError(
              "existing_profile_required",
            )
          }
          if (existingMembership?.status === "ACTIVE") {
            throw new TeamWorkspaceInvitationError("already_active_member")
          }
          if (existingMembership) {
            throw new TeamWorkspaceInvitationError(
              "existing_membership_requires_management",
            )
          }

          const priorPendingInvitations =
            await tx.collaborationInvitation.findMany({
              where: {
                workspaceId: normalized.workspaceId,
                normalizedEmail: normalized.normalizedEmail,
                status: "PENDING",
              },
              select: { id: true },
              orderBy: { createdAt: "asc" },
            })

          const revokedAt = new Date()
          for (const prior of priorPendingInvitations) {
            await tx.collaborationInvitation.update({
              where: { id: prior.id },
              data: { status: "REVOKED", revokedAt },
              select: { id: true },
            })
            await writeInvitationAudit(tx, {
              actorProfileId,
              action: "workspace.invitation.revoked",
              invitationId: prior.id,
              requestRef: createRequestRef(
                actorProfileId,
                "workspace.invitation.revoked",
                `reinvite:${requestRef}:${prior.id}`,
              ),
              result: "success",
              beforeRef: "PENDING",
              afterRef: "REVOKED",
            })
          }

          const rawToken = randomBytes(32).toString("hex")
          const invitation = await tx.collaborationInvitation.create({
            data: {
              id: randomUUID(),
              workspaceId: normalized.workspaceId,
              normalizedEmail: normalized.normalizedEmail,
              tokenDigest: digestInvitationToken(rawToken),
              workspaceRole: normalized.workspaceRole,
              projectId: normalized.projectId,
              projectRole: normalized.projectRole,
              status: "PENDING",
              invitedByProfileId: actorProfileId,
              expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
            },
            select: {
              id: true,
              normalizedEmail: true,
              workspaceRole: true,
              projectId: true,
              projectRole: true,
              status: true,
              expiresAt: true,
              createdAt: true,
              project: { select: { id: true, name: true } },
            },
          })

          await writeInvitationAudit(tx, {
            actorProfileId,
            action: "workspace.member.invited",
            invitationId: invitation.id,
            requestRef,
            result: "success",
            beforeRef: null,
            afterRef: "PENDING",
          })

          return {
            invitation: toInvitationDto(invitation),
            acceptanceUrl: `/work?invitation=${encodeURIComponent(rawToken)}`,
            deliveryStatus: "manual_email_link",
            idempotentReplay: false,
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (error) {
      if (error instanceof TeamWorkspaceInvitationError) throw error
      if (isMissingAuditStorageError(error)) {
        throw new TeamWorkspaceInvitationError("audit_storage_unavailable")
      }
      if (isRetryableTransactionError(error)) continue
      throw new TeamWorkspaceInvitationError("unavailable")
    }
  }

  throw new TeamWorkspaceInvitationError("unavailable")
}

export async function revokeTeamWorkspaceInvitationForProfile(
  actorProfileId: string,
  input: RevokeTeamWorkspaceInvitationCommandInput,
): Promise<RevokeTeamWorkspaceInvitationCommandResult> {
  if (!UUID_PATTERN.test(actorProfileId)) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  const normalized = normalizeRevokeInput(input)
  const requestRef = createRequestRef(
    actorProfileId,
    "workspace.invitation.revoked",
    normalized.idempotencyKey,
  )

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          await tx.$executeRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`team-invitation-revoke:${normalized.invitationId}`}))`,
          )
          if (
            !(await isTeamCollaborationAuditStorageReady(
              tx,
              "workspace.invitation",
            ))
          ) {
            throw new TeamWorkspaceInvitationError(
              "audit_storage_unavailable",
            )
          }
          await loadWorkspaceManagerContext(
            tx,
            actorProfileId,
            normalized.workspaceId,
            "workspace.members.invite",
          )

          const replay = await tx.operatingAuditEvent.findFirst({
            where: {
              actorRef: actorProfileId,
              action: "workspace.invitation.revoked",
              requestRef,
            },
            select: { targetRef: true },
          })
          if (replay) {
            if (replay.targetRef !== normalized.invitationId) {
              throw new TeamWorkspaceInvitationError("idempotency_conflict")
            }
            return {
              invitationId: normalized.invitationId,
              idempotentReplay: true,
            }
          }

          const invitation = await tx.collaborationInvitation.findFirst({
            where: {
              id: normalized.invitationId,
              workspaceId: normalized.workspaceId,
            },
            select: { id: true, status: true },
          })
          if (!invitation) {
            throw new TeamWorkspaceInvitationError("not_found_or_forbidden")
          }
          if (invitation.status === "REVOKED") {
            throw new TeamWorkspaceInvitationError("invitation_is_revoked")
          }
          if (invitation.status === "ACCEPTED") {
            throw new TeamWorkspaceInvitationError(
              "invitation_is_accepted",
            )
          }
          if (invitation.status === "EXPIRED") {
            throw new TeamWorkspaceInvitationError("invitation_is_expired")
          }

          await tx.collaborationInvitation.update({
            where: { id: invitation.id },
            data: { status: "REVOKED", revokedAt: new Date() },
            select: { id: true },
          })
          await writeInvitationAudit(tx, {
            actorProfileId,
            action: "workspace.invitation.revoked",
            invitationId: invitation.id,
            requestRef,
            result: "success",
            beforeRef: "PENDING",
            afterRef: "REVOKED",
          })

          return { invitationId: invitation.id, idempotentReplay: false }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (error) {
      if (error instanceof TeamWorkspaceInvitationError) throw error
      if (isMissingAuditStorageError(error)) {
        throw new TeamWorkspaceInvitationError("audit_storage_unavailable")
      }
      if (isRetryableTransactionError(error)) continue
      throw new TeamWorkspaceInvitationError("unavailable")
    }
  }

  throw new TeamWorkspaceInvitationError("unavailable")
}

export async function acceptTeamWorkspaceInvitationForProfile(
  actorProfileId: string,
  verifiedEmail: string,
  input: AcceptTeamWorkspaceInvitationCommandInput,
): Promise<AcceptTeamWorkspaceInvitationCommandResult> {
  if (!UUID_PATTERN.test(actorProfileId)) {
    throw new TeamWorkspaceInvitationError("invalid_input")
  }
  const normalized = normalizeAcceptInput(input)
  const normalizedVerifiedEmail = normalizeEmail(verifiedEmail)
  const tokenDigest = digestInvitationToken(normalized.token)

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      const outcome = await db.$transaction<AcceptTransactionOutcome>(
        async (tx) => {
          await tx.$executeRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`team-invitation-accept:${tokenDigest}`}))`,
          )
          if (
            !(await isTeamCollaborationAuditStorageReady(
              tx,
              "workspace.invitation",
            ))
          ) {
            throw new TeamWorkspaceInvitationError(
              "audit_storage_unavailable",
            )
          }

          const invitation = await tx.collaborationInvitation.findUnique({
            where: { tokenDigest },
            select: {
              id: true,
              workspaceId: true,
              normalizedEmail: true,
              workspaceRole: true,
              projectId: true,
              projectRole: true,
              status: true,
              expiresAt: true,
              invitedByProfileId: true,
              acceptedByProfileId: true,
              workspace: { select: { status: true } },
              project: { select: { workspaceId: true } },
            },
          })
          if (!invitation) {
            return { ok: false, code: "not_found_or_forbidden" }
          }

          const acceptedRequestRef = createRequestRef(
            actorProfileId,
            "workspace.invitation.accepted",
            tokenDigest,
          )

          if (invitation.status === "ACCEPTED") {
            if (
              invitation.acceptedByProfileId !== actorProfileId ||
              invitation.normalizedEmail !== normalizedVerifiedEmail
            ) {
              await writeInvitationAudit(tx, {
                actorProfileId,
                action: "workspace.invitation.accepted",
                invitationId: invitation.id,
                requestRef: createRequestRef(
                  actorProfileId,
                  "workspace.invitation.accepted",
                  `${tokenDigest}:already-accepted`,
                ),
                result: "blocked",
                beforeRef: "ACCEPTED",
                afterRef: "ACCEPTED",
              })
              return { ok: false, code: "invitation_is_accepted" }
            }
            const membership = await tx.workspaceMembership.findUnique({
              where: {
                workspaceId_profileId: {
                  workspaceId: invitation.workspaceId,
                  profileId: actorProfileId,
                },
              },
              select: { id: true, status: true },
            })
            if (!membership || membership.status !== "ACTIVE") {
              await writeInvitationAudit(tx, {
                actorProfileId,
                action: "workspace.invitation.accepted",
                invitationId: invitation.id,
                requestRef: createRequestRef(
                  actorProfileId,
                  "workspace.invitation.accepted",
                  `${tokenDigest}:membership-inactive-replay`,
                ),
                result: "blocked",
                beforeRef: "ACCEPTED",
                afterRef: "ACCEPTED",
              })
              return { ok: false, code: "membership_inactive" }
            }
            return {
              ok: true,
              result: {
                workspaceId: invitation.workspaceId,
                workspaceHref: `/work?workspace=${encodeURIComponent(invitation.workspaceId)}`,
                membershipId: membership.id,
                idempotentReplay: true,
              },
            }
          }

          if (invitation.status === "REVOKED") {
            await writeInvitationAudit(tx, {
              actorProfileId,
              action: "workspace.invitation.accepted",
              invitationId: invitation.id,
              requestRef: acceptedRequestRef,
              result: "blocked",
              beforeRef: "REVOKED",
              afterRef: "REVOKED",
            })
            return { ok: false, code: "invitation_is_revoked" }
          }
          if (invitation.status === "EXPIRED") {
            await writeInvitationAudit(tx, {
              actorProfileId,
              action: "workspace.invitation.expired",
              invitationId: invitation.id,
              requestRef: createRequestRef(
                actorProfileId,
                "workspace.invitation.expired",
                tokenDigest,
              ),
              result: "blocked",
              beforeRef: "EXPIRED",
              afterRef: "EXPIRED",
            })
            return { ok: false, code: "invitation_is_expired" }
          }

          if (invitation.normalizedEmail !== normalizedVerifiedEmail) {
            await writeInvitationAudit(tx, {
              actorProfileId,
              action: "workspace.invitation.accepted",
              invitationId: invitation.id,
              requestRef: acceptedRequestRef,
              result: "blocked",
              beforeRef: "PENDING",
              afterRef: "PENDING",
            })
            return { ok: false, code: "email_mismatch" }
          }

          if (invitation.expiresAt.getTime() <= Date.now()) {
            await tx.collaborationInvitation.update({
              where: { id: invitation.id },
              data: { status: "EXPIRED" },
              select: { id: true },
            })
            await writeInvitationAudit(tx, {
              actorProfileId,
              action: "workspace.invitation.expired",
              invitationId: invitation.id,
              requestRef: createRequestRef(
                actorProfileId,
                "workspace.invitation.expired",
                tokenDigest,
              ),
              result: "blocked",
              beforeRef: "PENDING",
              afterRef: "EXPIRED",
            })
            return { ok: false, code: "invitation_is_expired" }
          }

          if (
            invitation.workspace.status !== "ACTIVE" ||
            Boolean(invitation.projectId) !== Boolean(invitation.projectRole) ||
            (invitation.projectId &&
              invitation.project?.workspaceId !== invitation.workspaceId)
          ) {
            await writeInvitationAudit(tx, {
              actorProfileId,
              action: "workspace.invitation.accepted",
              invitationId: invitation.id,
              requestRef: acceptedRequestRef,
              result: "blocked",
              beforeRef: "PENDING",
              afterRef: "PENDING",
            })
            return { ok: false, code: "not_found_or_forbidden" }
          }

          const existingMembership = await tx.workspaceMembership.findUnique({
            where: {
              workspaceId_profileId: {
                workspaceId: invitation.workspaceId,
                profileId: actorProfileId,
              },
            },
            select: { id: true, role: true, status: true },
          })
          if (existingMembership && existingMembership.status !== "ACTIVE") {
            await writeInvitationAudit(tx, {
              actorProfileId,
              action: "workspace.invitation.accepted",
              invitationId: invitation.id,
              requestRef: acceptedRequestRef,
              result: "blocked",
              beforeRef: "PENDING",
              afterRef: "PENDING",
            })
            return { ok: false, code: "membership_inactive" }
          }

          const now = new Date()
          const membership = existingMembership
            ? await tx.workspaceMembership.update({
                where: { id: existingMembership.id },
                data: {
                  role: strongerWorkspaceRole(
                    existingMembership.role,
                    invitation.workspaceRole,
                  ),
                },
                select: { id: true },
              })
            : await tx.workspaceMembership.create({
                data: {
                  workspaceId: invitation.workspaceId,
                  profileId: actorProfileId,
                  role: invitation.workspaceRole,
                  status: "ACTIVE",
                  invitedByProfileId: invitation.invitedByProfileId,
                  joinedAt: now,
                },
                select: { id: true },
              })

          if (invitation.projectId && invitation.projectRole) {
            const existingGrant = await tx.projectAccessGrant.findUnique({
              where: {
                projectId_membershipId: {
                  projectId: invitation.projectId,
                  membershipId: membership.id,
                },
              },
              select: { id: true, role: true },
            })
            if (existingGrant) {
              await tx.projectAccessGrant.update({
                where: { id: existingGrant.id },
                data: {
                  role: strongerProjectRole(
                    existingGrant.role,
                    invitation.projectRole,
                  ),
                  status: "ACTIVE",
                  grantedByProfileId: invitation.invitedByProfileId,
                },
                select: { id: true },
              })
            } else {
              await tx.projectAccessGrant.create({
                data: {
                  projectId: invitation.projectId,
                  membershipId: membership.id,
                  role: invitation.projectRole,
                  status: "ACTIVE",
                  grantedByProfileId: invitation.invitedByProfileId,
                },
                select: { id: true },
              })
            }
          }

          await tx.collaborationInvitation.update({
            where: { id: invitation.id },
            data: {
              status: "ACCEPTED",
              acceptedByProfileId: actorProfileId,
              acceptedAt: now,
            },
            select: { id: true },
          })
          await writeInvitationAudit(tx, {
            actorProfileId,
            action: "workspace.invitation.accepted",
            invitationId: invitation.id,
            requestRef: acceptedRequestRef,
            result: "success",
            beforeRef: "PENDING",
            afterRef: "ACCEPTED",
          })

          return {
            ok: true,
            result: {
              workspaceId: invitation.workspaceId,
              workspaceHref: `/work?workspace=${encodeURIComponent(invitation.workspaceId)}`,
              membershipId: membership.id,
              idempotentReplay: false,
            },
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )

      if (!outcome.ok) {
        throw new TeamWorkspaceInvitationError(outcome.code)
      }
      return outcome.result
    } catch (error) {
      if (error instanceof TeamWorkspaceInvitationError) throw error
      if (isMissingAuditStorageError(error)) {
        throw new TeamWorkspaceInvitationError("audit_storage_unavailable")
      }
      if (isRetryableTransactionError(error)) continue
      throw new TeamWorkspaceInvitationError("unavailable")
    }
  }

  throw new TeamWorkspaceInvitationError("unavailable")
}
