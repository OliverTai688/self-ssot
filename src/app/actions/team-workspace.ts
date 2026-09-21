"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/services/auth.service"
import {
  createTeamWorkspaceForProfile,
  TeamWorkspaceCommandError,
} from "@/lib/services/team-workspace-command.service"
import type {
  CreateTeamWorkspaceActionState,
  CreateTeamWorkspaceFieldErrors,
  TeamWorkspaceCommandErrorCode,
} from "@/types/team-workspace-command"

export type { CreateTeamWorkspaceActionState } from "@/types/team-workspace-command"

const CreateTeamWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "團隊名稱至少需要 2 個字元")
    .max(80, "團隊名稱不可超過 80 個字元")
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "團隊名稱包含不允許的字元"),
  idempotencyKey: z.string().uuid("請重新開啟建立團隊視窗後再試一次"),
})

const BLOCKED_MESSAGES: Record<
  Exclude<TeamWorkspaceCommandErrorCode, "idempotency_conflict">,
  string
> = {
  not_platform_owner: "目前帳號沒有建立團隊的資格。",
  personal_workspace_required: "請先完成個人工作區初始化，再建立團隊。",
  personal_owner_membership_required: "個人工作區的擁有者資格尚未完成初始化。",
  owner_projects_unscoped: "仍有尚未歸入個人工作區的專案，暫時無法建立團隊。",
  audit_storage_unavailable: "稽核儲存尚未就緒，建立團隊功能暫時無法使用。",
  unavailable: "目前無法安全地建立團隊，請稍後再試。",
}

function toFieldErrors(error: z.ZodError): CreateTeamWorkspaceFieldErrors {
  const fieldErrors: CreateTeamWorkspaceFieldErrors = {}

  for (const issue of error.issues) {
    const field = issue.path[0]
    if (field !== "name" && field !== "idempotencyKey") {
      continue
    }

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message]
  }

  return fieldErrors
}

export async function createTeamWorkspace(
  _previousState: CreateTeamWorkspaceActionState,
  formData: FormData,
): Promise<CreateTeamWorkspaceActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>

  try {
    user = await requireUser()
  } catch {
    return {
      status: "error",
      code: "unavailable",
      message: "請先登入後再建立團隊。",
    }
  }

  const parsed = CreateTeamWorkspaceSchema.safeParse({
    name: formData.get("name"),
    idempotencyKey: formData.get("idempotencyKey"),
  })

  if (!parsed.success) {
    return {
      status: "validation_error",
      code: "name_invalid",
      message: "請確認團隊名稱與表單狀態後再試一次。",
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const result = await createTeamWorkspaceForProfile(user.id, parsed.data)
    revalidatePath("/work")

    return {
      status: "success",
      code: "create_succeeded",
      message: result.idempotentReplay ? "團隊已建立。" : "團隊建立成功。",
      workspaceId: result.workspaceId,
      workspaceHref: result.workspaceHref,
    }
  } catch (error) {
    if (error instanceof TeamWorkspaceCommandError) {
      if (error.code === "idempotency_conflict") {
        return {
          status: "conflict",
          code: error.code,
          message: "這次建立請求已用於另一個團隊名稱，請重新開啟視窗後再試。",
        }
      }

      return {
        status: "blocked",
        code: error.code,
        message: BLOCKED_MESSAGES[error.code],
      }
    }

    return {
      status: "error",
      code: "unavailable",
      message: "目前無法安全地建立團隊，請稍後再試。",
    }
  }
}
