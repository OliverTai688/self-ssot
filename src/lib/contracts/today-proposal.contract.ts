export type TodayProposalActionMode = "proposal_only"
export type TodayProposalStatus = "review_required"
export type TodayProposalRiskLevel = "low"

export type TodayProposalRequest = {
  comment: string
  locale: "zh-TW" | "en-US"
}

export type TodayProposalDraft = {
  id: string
  status: TodayProposalStatus
  title: string
  summary: string
  nextStep: string
  createdAt: string
  source: {
    kind: "owner_comment"
    excerpt: string
    characterCount: number
  }
  routing: {
    reviewHref: "/ai-input"
    returnHref: "/inbox"
    originHref: "/dashboard"
  }
  governance: {
    actionMode: TodayProposalActionMode
    riskLevel: TodayProposalRiskLevel
    requiresOwnerReview: true
    providerCallEnabled: false
    databaseWriteEnabled: false
    publicOutputEnabled: false
    externalRegisterable: false
    allowedNextActions: string[]
    blockedActions: string[]
  }
  auditPreview: {
    actorRole: string
    action: "today.owner_comment.propose"
    target: "core-ai-proposal-draft"
    result: "draft_returned_to_owner"
  }
}

export type TodayProposalActionState =
  | {
      status: "idle"
      message: string
      proposal: null
      fieldErrors?: undefined
    }
  | {
      status: "success"
      message: string
      proposal: TodayProposalDraft
      fieldErrors?: undefined
    }
  | {
      status: "validation_error"
      message: string
      proposal: null
      fieldErrors: {
        comment?: string[]
      }
    }
  | {
      status: "unauthorized" | "error"
      message: string
      proposal: null
      fieldErrors?: undefined
    }

export const INITIAL_TODAY_PROPOSAL_ACTION_STATE: TodayProposalActionState = {
  status: "idle",
  message: "",
  proposal: null,
}
