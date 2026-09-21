import "server-only"

import { createHash } from "node:crypto"

import type { AuthenticatedUser } from "@/lib/services/auth.service"
import type {
  TodayProposalDraft,
  TodayProposalRequest,
} from "@/lib/contracts/today-proposal.contract"

function makeProposalId(user: AuthenticatedUser, comment: string, createdAt: string) {
  const digest = createHash("sha256")
    .update(`${user.id}:${createdAt}:${comment}`)
    .digest("hex")
    .slice(0, 12)

  return `today-proposal-${digest}`
}

function excerpt(comment: string) {
  return comment.length > 160 ? `${comment.slice(0, 157)}...` : comment
}

export function createTodayProposalDraftForOwner({
  user,
  request,
}: {
  user: AuthenticatedUser
  request: TodayProposalRequest
}): TodayProposalDraft {
  const createdAt = new Date().toISOString()
  const isEnglish = request.locale === "en-US"
  const cleanComment = request.comment.trim()

  return {
    id: makeProposalId(user, cleanComment, createdAt),
    status: "review_required",
    title: isEnglish ? "Core AI proposal draft" : "總 AI 提案草稿",
    summary: isEnglish
      ? `Core AI received an owner note and can prepare a review-only proposal: "${excerpt(cleanComment)}".`
      : `總 AI 已收到 owner 回饋，可先整理成待審核提案：「${excerpt(cleanComment)}」。`,
    nextStep: isEnglish
      ? "Review this draft in AI Workbench before any module action, API call, or task write is allowed."
      : "請先到 AI 工作桌審核；在核准前不會執行 API、寫入 TODO 或觸發外部服務。",
    createdAt,
    source: {
      kind: "owner_comment",
      excerpt: excerpt(cleanComment),
      characterCount: cleanComment.length,
    },
    routing: {
      reviewHref: "/ai-input",
      returnHref: "/inbox",
      originHref: "/dashboard",
    },
    governance: {
      actionMode: "proposal_only",
      riskLevel: "low",
      requiresOwnerReview: true,
      providerCallEnabled: false,
      databaseWriteEnabled: false,
      publicOutputEnabled: false,
      externalRegisterable: false,
      allowedNextActions: [
        "review_in_ai_workbench",
        "send_to_inbox_return_path",
        "convert_to_module_draft_after_approval",
      ],
      blockedActions: [
        "provider_call",
        "database_write",
        "public_output",
        "permission_change",
        "external_agent_registration",
      ],
    },
    auditPreview: {
      actorRole: user.role,
      action: "today.owner_comment.propose",
      target: "core-ai-proposal-draft",
      result: "draft_returned_to_owner",
    },
  }
}
