import "server-only"

import { createHash, randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import { isTeamCollaborationAuditStorageReady } from "@/lib/services/team-workspace-audit-readiness.service"
import type {
  CreateTeamWorkspaceCommandInput,
  CreateTeamWorkspaceCommandResult,
  TeamWorkspaceCommandErrorCode,
  TeamWorkspaceCreationReadinessDto,
} from "@/types/team-workspace-command"

const WORKSPACE_CREATED_ACTION = "workspace.created" as const
const AUDIT_REDACTION_VERSION = "teamcollab-005b-v1" as const
const AUDIT_RETENTION_CLASS = "high_risk_7_year_review_required" as const
const MAX_TRANSACTION_ATTEMPTS = 3
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class TeamWorkspaceCommandError extends Error {
  constructor(
    public readonly code: TeamWorkspaceCommandErrorCode,
    message = code,
  ) {
    super(message)
    this.name = "TeamWorkspaceCommandError"
  }
}

function isMissingTableError(error: unknown, tableOrModel?: string): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false
  }

  const candidate = error as {
    code?: unknown
    message?: unknown
    meta?: { modelName?: unknown; table?: unknown }
  }

  if (candidate.code !== "P2021") {
    return false
  }

  if (!tableOrModel) {
    return true
  }

  const evidence = [
    candidate.message,
    candidate.meta?.modelName,
    candidate.meta?.table,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase()

  return evidence.includes(tableOrModel.toLowerCase())
}

function createRequestRef(profileId: string, idempotencyKey: string): string {
  return createHash("sha256")
    .update(`teamcollab-005b\u0000${profileId}\u0000${WORKSPACE_CREATED_ACTION}\u0000${idempotencyKey}`)
    .digest("hex")
}

function normalizeCommandInput(input: CreateTeamWorkspaceCommandInput): {
  name: string
  idempotencyKey: string
} {
  const candidate: unknown = input
  if (typeof candidate !== "object" || candidate === null) {
    throw new TeamWorkspaceCommandError("unavailable")
  }

  const raw = candidate as Record<string, unknown>
  if (typeof raw.name !== "string" || typeof raw.idempotencyKey !== "string") {
    throw new TeamWorkspaceCommandError("unavailable")
  }

  const name = raw.name.trim()
  if (
    name.length < 2 ||
    name.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(name) ||
    !UUID_PATTERN.test(raw.idempotencyKey)
  ) {
    throw new TeamWorkspaceCommandError("unavailable")
  }

  return { name, idempotencyKey: raw.idempotencyKey.toLowerCase() }
}

function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  const candidate = error as {
    code?: unknown
    cause?: { code?: unknown }
  }
  const code = candidate.code ?? candidate.cause?.code
  return code === "P2002" || code === "P2034" || code === "23505" || code === "40001"
}

function toWorkspaceSlug(name: string, workspaceId: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  return `${base || "team"}-${workspaceId.replaceAll("-", "").slice(0, 12)}`
}

async function assertTeamWorkspaceCreateReadiness(
  tx: Prisma.TransactionClient,
  profileId: string,
): Promise<void> {
  const profile = await tx.profile.findUnique({
    where: { id: profileId },
    select: { role: true },
  })

  // Platform eligibility is a global Profile decision. Workspace membership
  // capabilities must never be treated as permission to create a new team.
  if (!profile || profile.role !== "OWNER") {
    throw new TeamWorkspaceCommandError("not_platform_owner")
  }

  const personalWorkspaces = await tx.workspace.findMany({
    where: {
      createdByProfileId: profileId,
      type: "PERSONAL",
      status: "ACTIVE",
    },
    select: {
      id: true,
      memberships: {
        where: {
          profileId,
          role: "OWNER",
          status: "ACTIVE",
        },
        select: { id: true },
      },
    },
    take: 2,
  })

  if (personalWorkspaces.length === 0) {
    throw new TeamWorkspaceCommandError("personal_workspace_required")
  }

  if (personalWorkspaces.length !== 1) {
    throw new TeamWorkspaceCommandError("unavailable")
  }

  if (personalWorkspaces[0].memberships.length !== 1) {
    throw new TeamWorkspaceCommandError("personal_owner_membership_required")
  }

  const unscopedOwnerProjectCount = await tx.project.count({
    where: {
      ownerId: profileId,
      workspaceId: null,
    },
  })

  if (unscopedOwnerProjectCount > 0) {
    throw new TeamWorkspaceCommandError("owner_projects_unscoped")
  }
}

async function findIdempotentWorkspaceReplay(
  tx: Prisma.TransactionClient,
  profileId: string,
  normalizedName: string,
  requestRef: string,
): Promise<CreateTeamWorkspaceCommandResult | null> {
  const existingAudit = await tx.operatingAuditEvent.findFirst({
    where: {
      actorRef: profileId,
      action: WORKSPACE_CREATED_ACTION,
      requestRef,
    },
    select: {
      id: true,
      targetRef: true,
    },
  })

  if (!existingAudit) {
    return null
  }

  if (!existingAudit.targetRef) {
    throw new TeamWorkspaceCommandError("unavailable")
  }

  const existingWorkspace = await tx.workspace.findFirst({
    where: {
      id: existingAudit.targetRef,
      type: "TEAM",
      status: "ACTIVE",
      createdByProfileId: profileId,
    },
    select: {
      id: true,
      name: true,
      memberships: {
        where: {
          profileId,
          role: "OWNER",
          status: "ACTIVE",
        },
        select: { id: true },
      },
    },
  })

  if (!existingWorkspace || existingWorkspace.memberships.length !== 1) {
    throw new TeamWorkspaceCommandError("unavailable")
  }

  if (existingWorkspace.name !== normalizedName) {
    throw new TeamWorkspaceCommandError("idempotency_conflict")
  }

  return {
    workspaceId: existingWorkspace.id,
    workspaceHref: `/work?workspace=${encodeURIComponent(existingWorkspace.id)}`,
    idempotentReplay: true,
  }
}

export async function getTeamWorkspaceCreateReadinessForProfile(
  profileId: string,
): Promise<TeamWorkspaceCreationReadinessDto> {
  if (typeof profileId !== "string" || profileId.trim().length === 0) {
    return { available: false, code: "unavailable" }
  }

  try {
    const profile = await db.profile.findUnique({
      where: { id: profileId },
      select: { role: true },
    })

    if (!profile || profile.role !== "OWNER") {
      return { available: false, code: "not_platform_owner" }
    }

    const personalWorkspaces = await db.workspace.findMany({
      where: {
        createdByProfileId: profileId,
        type: "PERSONAL",
        status: "ACTIVE",
      },
      select: {
        id: true,
        memberships: {
          where: {
            profileId,
            role: "OWNER",
            status: "ACTIVE",
          },
          select: { id: true },
        },
      },
      take: 2,
    })

    if (personalWorkspaces.length === 0) {
      return { available: false, code: "personal_workspace_required" }
    }

    if (personalWorkspaces.length !== 1) {
      return { available: false, code: "unavailable" }
    }

    if (personalWorkspaces[0].memberships.length !== 1) {
      return { available: false, code: "personal_owner_membership_required" }
    }

    const unscopedOwnerProjectCount = await db.project.count({
      where: { ownerId: profileId, workspaceId: null },
    })

    if (unscopedOwnerProjectCount > 0) {
      return { available: false, code: "owner_projects_unscoped" }
    }

    if (!(await isTeamCollaborationAuditStorageReady(db, "workspace.created"))) {
      return { available: false, code: "audit_storage_unavailable" }
    }

    return { available: true, code: "ready" }
  } catch {
    return { available: false, code: "unavailable" }
  }
}

export async function createTeamWorkspaceForProfile(
  profileId: string,
  input: CreateTeamWorkspaceCommandInput,
): Promise<CreateTeamWorkspaceCommandResult> {
  const normalizedInput = normalizeCommandInput(input)
  const requestRef = createRequestRef(profileId, normalizedInput.idempotencyKey)
  const normalizedName = normalizedInput.name
  let sawRetryableFailure = false

  for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`team-workspace-create:${profileId}`}))`,
        )

        await assertTeamWorkspaceCreateReadiness(tx, profileId)

        if (!(await isTeamCollaborationAuditStorageReady(tx, "workspace.created"))) {
          throw new TeamWorkspaceCommandError("audit_storage_unavailable")
        }

        const replay = await findIdempotentWorkspaceReplay(
          tx,
          profileId,
          normalizedName,
          requestRef,
        )
        if (replay) {
          return replay
        }

        const workspaceId = randomUUID()
        const occurredAt = new Date()
        const workspace = await tx.workspace.create({
          data: {
            id: workspaceId,
            type: "TEAM",
            name: normalizedName,
            slug: toWorkspaceSlug(normalizedName, workspaceId),
            status: "ACTIVE",
            defaultProjectAccessRole: "VIEWER",
            aiFeedbackMemoryEnabled: false,
            createdByProfileId: profileId,
          },
          select: { id: true },
        })

        await tx.workspaceMembership.create({
          data: {
            workspaceId: workspace.id,
            profileId,
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: occurredAt,
          },
          select: { id: true },
        })

        await tx.operatingAuditEvent.create({
          data: {
            occurredAt,
            actorType: "owner",
            actorRef: profileId,
            requestRef,
            moduleKey: "work",
            action: WORKSPACE_CREATED_ACTION,
            targetType: "workspace",
            targetRef: workspace.id,
            result: "success",
            riskLevel: "HIGH",
            approvalLevel: "owner_review",
            humanApprovalRequired: true,
            sourceKind: "server_action",
            metadata: {},
            redactionVersion: AUDIT_REDACTION_VERSION,
            retentionClass: AUDIT_RETENTION_CLASS,
          },
          select: { id: true },
        })

        return {
          workspaceId: workspace.id,
          workspaceHref: `/work?workspace=${encodeURIComponent(workspace.id)}`,
          idempotentReplay: false,
        }
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      )
    } catch (error) {
      if (error instanceof TeamWorkspaceCommandError) {
        throw error
      }

      if (
        isMissingTableError(error, "operating_audit_events") ||
        isMissingTableError(error, "OperatingAuditEvent")
      ) {
        throw new TeamWorkspaceCommandError("audit_storage_unavailable")
      }

      if (isRetryableTransactionError(error)) {
        sawRetryableFailure = true
        continue
      }

      throw new TeamWorkspaceCommandError("unavailable")
    }
  }

  if (sawRetryableFailure) {
    try {
      const replay = await db.$transaction(async (tx) => {
        await assertTeamWorkspaceCreateReadiness(tx, profileId)
        if (!(await isTeamCollaborationAuditStorageReady(tx, "workspace.created"))) {
          throw new TeamWorkspaceCommandError("audit_storage_unavailable")
        }
        return findIdempotentWorkspaceReplay(
          tx,
          profileId,
          normalizedName,
          requestRef,
        )
      })

      if (replay) {
        return replay
      }
    } catch (error) {
      if (error instanceof TeamWorkspaceCommandError) {
        throw error
      }
    }
  }

  throw new TeamWorkspaceCommandError("unavailable")
}
