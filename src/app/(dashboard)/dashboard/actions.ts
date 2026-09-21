"use server"

import { z } from "zod"

import { requireUser } from "@/lib/services/auth.service"
import { createTodayProposalDraftForOwner } from "@/lib/services/today-proposal.service"
import type { TodayProposalActionState } from "@/lib/contracts/today-proposal.contract"

const TodayProposalSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(2, "請至少輸入 2 個字元。")
    .max(1200, "今日回饋請控制在 1200 字以內。")
    .refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value), "內容含有不支援的控制字元。"),
  locale: z.enum(["zh-TW", "en-US"]).default("zh-TW"),
})

function toFieldErrors(error: z.ZodError): { comment?: string[] } {
  const fieldErrors: { comment?: string[] } = {}

  for (const issue of error.issues) {
    if (issue.path[0] === "comment") {
      fieldErrors.comment = [...(fieldErrors.comment ?? []), issue.message]
    }
  }

  return fieldErrors
}

export async function createTodayProposalDraft(
  _previousState: TodayProposalActionState,
  formData: FormData
): Promise<TodayProposalActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>

  try {
    user = await requireUser()
  } catch {
    return {
      status: "unauthorized",
      message: "請先登入後再建立今日提案。",
      proposal: null,
    }
  }

  const parsed = TodayProposalSchema.safeParse({
    comment: formData.get("comment"),
    locale: formData.get("locale"),
  })

  if (!parsed.success) {
    return {
      status: "validation_error",
      message: "請確認今日回饋內容後再試一次。",
      proposal: null,
      fieldErrors: toFieldErrors(parsed.error),
    }
  }

  try {
    const proposal = createTodayProposalDraftForOwner({
      user,
      request: parsed.data,
    })

    return {
      status: "success",
      message:
        parsed.data.locale === "en-US"
          ? "Proposal draft created for review."
          : "已建立待審核的今日提案草稿。",
      proposal,
    }
  } catch {
    return {
      status: "error",
      message: "目前無法建立提案草稿，請稍後再試。",
      proposal: null,
    }
  }
}
