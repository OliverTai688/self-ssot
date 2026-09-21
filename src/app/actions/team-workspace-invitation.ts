"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  requireUser,
  resolveCurrentUser,
} from "@/lib/services/auth.service"
import {
  acceptTeamWorkspaceInvitationForProfile,
  createTeamWorkspaceInvitationForProfile,
  revokeTeamWorkspaceInvitationForProfile,
  TeamWorkspaceInvitationError,
} from "@/lib/services/team-workspace-invitation.service"
import type {
  AcceptTeamWorkspaceInvitationActionState,
  CreateTeamWorkspaceInvitationActionState,
  RevokeTeamWorkspaceInvitationActionState,
  TeamWorkspaceInvitationErrorCode,
  TeamWorkspaceInvitationFieldErrors,
} from "@/types/team-workspace-invitation"

export type {
  AcceptTeamWorkspaceInvitationActionState,
  CreateTeamWorkspaceInvitationActionState,
  RevokeTeamWorkspaceInvitationActionState,
} from "@/types/team-workspace-invitation"

const WorkspaceRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "GUEST"])
const ProjectRoleSchema = z.enum(["VIEWER", "COMMENTER", "EDITOR", "MANAGER"])

const CreateInvitationSchema = z
  .object({
    workspaceId: z.string().uuid("工作區狀態無效，請重新整理後再試"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("請輸入有效的 Email")
      .max(254, "Email 長度不可超過 254 個字元"),
    workspaceRole: WorkspaceRoleSchema,
    projectId: z.union([z.string().uuid(), z.literal("")]).optional(),
    projectRole: z.union([ProjectRoleSchema, z.literal("")]).optional(),
    idempotencyKey: z.string().uuid("請重新開啟邀請視窗後再試一次"),
  })
  .superRefine((value, context) => {
    if (Boolean(value.projectId) !== Boolean(value.projectRole)) {
      context.addIssue({
        code: "custom",
        path: ["projectId"],
        message: "專案與專案角色必須一起選擇",
      })
    }
  })

const RevokeInvitationSchema = z.object({
  workspaceId: z.string().uuid("工作區狀態無效，請重新整理後再試"),
  invitationId: z.string().uuid("邀請狀態無效，請重新整理後再試"),
  idempotencyKey: z.string().uuid("請重新整理後再試一次"),
})

const AcceptInvitationSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{64}$/i, "邀請連結無效或不完整"),
})

const ERROR_MESSAGES: Record<TeamWorkspaceInvitationErrorCode, string> = {
  not_found_or_forbidden: "找不到可使用的邀請，或目前帳號沒有權限。",
  invalid_input: "邀請資料無效，請重新整理後再試。",
  audit_storage_unavailable: "邀請稽核尚未就緒，功能已安全暫停。",
  already_active_member: "這個 Email 已是團隊的有效成員。",
  existing_membership_requires_management:
    "這個 Email 已有停用或離開的成員紀錄，請由成員管理流程處理。",
  owner_invite_requires_owner: "只有團隊擁有者可以邀請新的擁有者。",
  project_scope_invalid: "選擇的專案不屬於這個團隊，邀請未建立。",
  invitation_is_expired: "這份邀請已過期，請請團隊管理者重新邀請。",
  invitation_is_revoked: "這份邀請已撤銷。",
  invitation_is_accepted: "這份邀請已由其他帳號接受。",
  email_mismatch: "登入 Email 與受邀 Email 不相符，邀請未接受。",
  existing_profile_required:
    "目前邀請僅支援已有 Personal OS Profile 且完成 Email 驗證的帳號。",
  membership_inactive: "既有成員資格目前不是有效狀態，請聯絡團隊管理者。",
  idempotency_conflict: "這次請求識別已用於不同邀請資料，請重新操作。",
  unavailable: "目前無法安全地處理邀請，請稍後再試。",
}

function toFieldErrors(error: z.ZodError): TeamWorkspaceInvitationFieldErrors {
  const fieldErrors: TeamWorkspaceInvitationFieldErrors = {}
  for (const issue of error.issues) {
    const field = issue.path[0]
    if (
      field !== "workspaceId" &&
      field !== "invitationId" &&
      field !== "email" &&
      field !== "workspaceRole" &&
      field !== "projectId" &&
      field !== "projectRole" &&
      field !== "idempotencyKey" &&
      field !== "token"
    ) {
      continue
    }
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message]
  }
  return fieldErrors
}

function errorStatus(code: TeamWorkspaceInvitationErrorCode) {
  if (code === "idempotency_conflict") return "conflict" as const
  if (code === "unavailable") return "error" as const
  return "blocked" as const
}

export async function createTeamWorkspaceInvitation(
  _previousState: CreateTeamWorkspaceInvitationActionState,
  formData: FormData,
): Promise<CreateTeamWorkspaceInvitationActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch {
    return {
      status: "blocked",
      code: "not_found_or_forbidden",
      message: "請先登入後再邀請團隊成員。",
    }
  }

  const parsed = CreateInvitationSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    email: formData.get("email"),
    workspaceRole: formData.get("workspaceRole"),
    projectId: formData.get("projectId") ?? "",
    projectRole: formData.get("projectRole") ?? "",
    idempotencyKey: formData.get("idempotencyKey"),
  })
  if (!parsed.success) {
    return {
      status: "validation_error",
      code: "invalid_input",
      message: "請確認 Email、角色與專案範圍。",
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const result = await createTeamWorkspaceInvitationForProfile(user.id, {
      workspaceId: parsed.data.workspaceId,
      email: parsed.data.email,
      workspaceRole: parsed.data.workspaceRole,
      projectId: parsed.data.projectId || null,
      projectRole: parsed.data.projectRole || null,
      idempotencyKey: parsed.data.idempotencyKey,
    })
    revalidatePath("/work")
    return {
      status: "success",
      code: "invitation_created",
      message: result.idempotentReplay
        ? "邀請已建立；基於安全性，重新提交不會再次顯示一次性連結。"
        : "邀請已建立，請手動寄送這次顯示的一次性連結。",
      ...result,
    }
  } catch (error) {
    const code =
      error instanceof TeamWorkspaceInvitationError
        ? error.code
        : "unavailable"
    return { status: errorStatus(code), code, message: ERROR_MESSAGES[code] }
  }
}

export async function revokeTeamWorkspaceInvitation(
  _previousState: RevokeTeamWorkspaceInvitationActionState,
  formData: FormData,
): Promise<RevokeTeamWorkspaceInvitationActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch {
    return {
      status: "blocked",
      code: "not_found_or_forbidden",
      message: "請先登入後再撤銷邀請。",
    }
  }

  const parsed = RevokeInvitationSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    invitationId: formData.get("invitationId"),
    idempotencyKey: formData.get("idempotencyKey"),
  })
  if (!parsed.success) {
    return {
      status: "validation_error",
      code: "invalid_input",
      message: "邀請狀態無效，請重新整理後再試。",
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const result = await revokeTeamWorkspaceInvitationForProfile(
      user.id,
      parsed.data,
    )
    revalidatePath("/work")
    return {
      status: "success",
      code: "invitation_revoked",
      message: "邀請已撤銷。",
      ...result,
    }
  } catch (error) {
    const code =
      error instanceof TeamWorkspaceInvitationError
        ? error.code
        : "unavailable"
    return { status: errorStatus(code), code, message: ERROR_MESSAGES[code] }
  }
}

export async function acceptTeamWorkspaceInvitation(
  _previousState: AcceptTeamWorkspaceInvitationActionState,
  formData: FormData,
): Promise<AcceptTeamWorkspaceInvitationActionState> {
  const resolution = await resolveCurrentUser()
  if (!resolution.user || !resolution.verifiedEmail) {
    const code = resolution.verifiedEmail
      ? "existing_profile_required"
      : "not_found_or_forbidden"
    return {
      status: "blocked",
      code,
      message: resolution.verifiedEmail
        ? ERROR_MESSAGES.existing_profile_required
        : "請先以受邀 Email 登入後再接受邀請。",
    }
  }

  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch {
    return {
      status: "blocked",
      code: "not_found_or_forbidden",
      message: "請先以受邀 Email 登入後再接受邀請。",
    }
  }
  if (user.id !== resolution.user.id) {
    return {
      status: "blocked",
      code: "not_found_or_forbidden",
      message: "登入狀態已變更，請重新整理後再試。",
    }
  }

  const parsed = AcceptInvitationSchema.safeParse({
    token: formData.get("token"),
  })
  if (!parsed.success) {
    return {
      status: "validation_error",
      code: "invalid_input",
      message: "邀請連結無效或不完整。",
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const result = await acceptTeamWorkspaceInvitationForProfile(
      user.id,
      resolution.verifiedEmail,
      parsed.data,
    )
    revalidatePath("/work")
    return {
      status: "success",
      code: "invitation_accepted",
      message: result.idempotentReplay
        ? "你已加入這個團隊。"
        : "邀請已接受，你現在可以進入團隊工作區。",
      ...result,
    }
  } catch (error) {
    const code =
      error instanceof TeamWorkspaceInvitationError
        ? error.code
        : "unavailable"
    return { status: errorStatus(code), code, message: ERROR_MESSAGES[code] }
  }
}
