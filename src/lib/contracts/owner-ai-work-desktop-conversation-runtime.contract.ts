export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_CONTRACT_ID = "OWNEROS-002B" as const

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_STATUS =
  "bff_contract_no_runtime_write" as const

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_GATE_CRITERIA = [
  "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
  "A5_INBOX_FREE_TEXT_RETURN_PATH",
] as const

export type OwnerAIWorkDesktopConversationRoute =
  | "/ai-input"
  | "/inbox"
  | "/dashboard"
  | "/agents"

export type OwnerAIWorkDesktopConversationKind =
  | "owner_private_chat"
  | "module_scoped_chat"
  | "inbox_return_thread"

export type OwnerAIWorkDesktopConversationRuntimeMode =
  | "personal_private_first_slice"
  | "team_project_blocked"
  | "company_internal_blocked"
  | "external_client_disabled"

export type OwnerAIWorkDesktopConversationStatus =
  | "draft"
  | "open"
  | "waiting_on_owner"
  | "assistant_proposed"
  | "action_review_required"
  | "archived"
  | "blocked_authz"
  | "blocked_retention_review"

export type OwnerAIWorkDesktopMessageRole =
  | "owner"
  | "assistant"
  | "system"
  | "internal_agent_proposal"
  | "inbox_sender"

export type OwnerAIWorkDesktopMessageStatus =
  | "draft"
  | "submitted"
  | "context_resolved"
  | "assistant_ready"
  | "inbox_returned"
  | "action_pending_review"
  | "failed_redacted"
  | "blocked_authz"

export type OwnerAIWorkDesktopContextSourceType =
  | "work_project"
  | "work_task"
  | "file_asset"
  | "media_asset"
  | "research_thread"
  | "research_source"
  | "company_private_note"
  | "company_formal_knowledge"
  | "inbox_thread"
  | "agent_diary_entry"
  | "source_connection_artifact"

export type OwnerAIWorkDesktopVisibility =
  | "personal_private"
  | "team_project_blocked"
  | "company_internal_blocked"
  | "c_level_blocked"
  | "public_disabled"

export type OwnerAIWorkDesktopRetentionClass =
  | "session_ephemeral"
  | "owner_private_default"
  | "owner_review_required"
  | "legal_or_high_risk_review_required"

export type OwnerAIWorkDesktopRedactionClass =
  | "metadata_only"
  | "summary_only"
  | "content_excerpt"
  | "owner_private_full"
  | "blocked_secret_or_high_risk"

export type OwnerAIWorkDesktopAuthzCheck =
  | "requireUser"
  | "profile_workspace_membership"
  | "personal_private_scope"
  | "source_owner_or_grant"
  | "visibility_lattice"
  | "context_redaction"
  | "inbox_origin_return_path"
  | "audit_event_required"
  | "negative_cross_owner"

export type OwnerAIWorkDesktopContextResolutionStatus =
  | "allowed"
  | "denied_cross_owner"
  | "denied_visibility"
  | "denied_missing_source"
  | "denied_high_risk"
  | "denied_retention"

export type OwnerAIWorkDesktopReplyActionPolicy =
  | "free_text_only"
  | "low_risk_draft_only"
  | "proposal_requires_owner_review"
  | "formal_write_blocked"
  | "public_output_blocked"

export type OwnerAIWorkDesktopActionRiskClass =
  | "read_only"
  | "low_risk_draft"
  | "owner_review_required"
  | "high_risk_blocked"

export type OwnerAIWorkDesktopContextReferenceDto = {
  refId: string
  sourceType: OwnerAIWorkDesktopContextSourceType
  sourceId: string
  sourceDisplayLabel: string
  visibility: OwnerAIWorkDesktopVisibility
  redactionClass: OwnerAIWorkDesktopRedactionClass
  retentionClass: OwnerAIWorkDesktopRetentionClass
  auditSourcePath: string
  resolvedStatus: OwnerAIWorkDesktopContextResolutionStatus
}

export type OwnerAIWorkDesktopContextResolutionCheckDto = {
  checkId: OwnerAIWorkDesktopAuthzCheck
  passed: boolean
  failureCode: string | null
  redactedReason: string | null
}

export type OwnerAIWorkDesktopContextPackageDto = {
  contextPackageId: string
  conversationId: string
  status: "draft" | "resolved" | "denied" | "expired" | "retention_review_required"
  visibility: OwnerAIWorkDesktopVisibility
  sourceRefs: readonly OwnerAIWorkDesktopContextReferenceDto[]
  resolutionChecks: readonly OwnerAIWorkDesktopContextResolutionCheckDto[]
  deniedRefCount: number
  redactionApplied: boolean
  providerSafe: boolean
  expiresAtIso: string | null
}

export type OwnerAIWorkDesktopMessageDto = {
  messageId: string
  conversationId: string
  role: OwnerAIWorkDesktopMessageRole
  status: OwnerAIWorkDesktopMessageStatus
  bodyText: string
  contextPackageId: string | null
  sourceRefIds: readonly string[]
  returnPathId: string | null
  auditEventId: string | null
  createdAtIso: string
}

export type OwnerAIWorkDesktopInboxReturnPathDto = {
  returnPathId: string
  inboxItemId: string
  originConversationId: string
  originRoute: "/inbox" | "/ai-input"
  originTaskId: string | null
  status: "draft" | "open" | "returned_to_conversation" | "closed" | "blocked_authz"
  replyPolicy: OwnerAIWorkDesktopReplyActionPolicy
  allowedActionRiskClasses: readonly OwnerAIWorkDesktopActionRiskClass[]
  blockedActionRiskClasses: readonly OwnerAIWorkDesktopActionRiskClass[]
  auditEventIds: readonly string[]
  retentionClass: OwnerAIWorkDesktopRetentionClass
  createdAtIso: string
  updatedAtIso: string
}

export type OwnerAIWorkDesktopConversationThreadDto = {
  conversationId: string
  ownerProfileRef: string
  workspaceRef: string
  route: OwnerAIWorkDesktopConversationRoute
  kind: OwnerAIWorkDesktopConversationKind
  runtimeMode: OwnerAIWorkDesktopConversationRuntimeMode
  title: string
  status: OwnerAIWorkDesktopConversationStatus
  visibility: OwnerAIWorkDesktopVisibility
  messages: readonly OwnerAIWorkDesktopMessageDto[]
  latestContextPackage: OwnerAIWorkDesktopContextPackageDto | null
  inboxReturnPath: OwnerAIWorkDesktopInboxReturnPathDto | null
  archivedAtIso: string | null
  updatedAtIso: string
}

export type OwnerAIWorkDesktopConversationRuntimeContract = {
  contractId: typeof OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_CONTRACT_ID
  status: typeof OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_STATUS
  gateCriteria: typeof OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_GATE_CRITERIA
  surfaces: readonly OwnerAIWorkDesktopConversationRoute[]
  firstRuntimeScope: "Personal Private only"
  bffFlow: readonly string[]
  requiredAuthzChecks: readonly OwnerAIWorkDesktopAuthzCheck[]
  dtoModels: readonly string[]
  runtimeFlags: typeof OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_FLAGS
  inboxReturnPathPolicy: {
    defaultReplyPolicy: OwnerAIWorkDesktopReplyActionPolicy
    allowedWithoutOwnerReview: readonly OwnerAIWorkDesktopActionRiskClass[]
    blockedWithoutOwnerReview: readonly OwnerAIWorkDesktopActionRiskClass[]
  }
  nanda: {
    lifecycle: "internal_bff_contract_only"
    protocols: readonly ["internal_bff_service_contract"]
    externalRegisterable: false
    registrationStatus: "not-registered"
    externalAgentDatabaseAccess: false
  }
  selectedPattern: string
  rejectedPatterns: readonly string[]
  stopConditions: readonly string[]
  nextSlices: readonly string[]
}

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_SURFACES = [
  "/ai-input",
  "/inbox",
  "/dashboard",
  "/agents",
] as const satisfies readonly OwnerAIWorkDesktopConversationRoute[]

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_SOURCE_TYPES = [
  "work_project",
  "work_task",
  "file_asset",
  "media_asset",
  "research_thread",
  "research_source",
  "company_private_note",
  "company_formal_knowledge",
  "inbox_thread",
  "agent_diary_entry",
  "source_connection_artifact",
] as const satisfies readonly OwnerAIWorkDesktopContextSourceType[]

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_REQUIRED_AUTHZ_CHECKS = [
  "requireUser",
  "profile_workspace_membership",
  "personal_private_scope",
  "source_owner_or_grant",
  "visibility_lattice",
  "context_redaction",
  "inbox_origin_return_path",
  "audit_event_required",
  "negative_cross_owner",
] as const satisfies readonly OwnerAIWorkDesktopAuthzCheck[]

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_BFF_FLOW = [
  "Server Component loader or Server Action receives owner intent.",
  "requireUser() resolves the authenticated owner profile.",
  "Service layer verifies profile/workspace membership and Personal Private scope.",
  "Server-side source resolver builds a redacted ContextPackage DTO.",
  "Inbox return-path resolver binds free text back to the originating conversation or task.",
  "Audit event envelope is prepared before persistence or provider execution.",
  "Client Component receives only safe DTO fields and no adapter payloads.",
] as const

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_FLAGS = {
  routeHandlerCreated: false,
  serverActionCreated: false,
  schemaMigrationIncluded: false,
  runtimePersistenceEnabled: false,
  databaseRead: false,
  databaseWrite: false,
  aiProviderExecutionEnabled: false,
  inboxReplyRuntimeEnabled: false,
  sendsEmail: false,
  publicOutputEnabled: false,
  externalRuntimeEnabled: false,
  externalAgentDatabaseAccess: false,
  externalRegisterable: false,
} as const

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_DTO_MODELS = [
  "OwnerAIWorkDesktopConversationThreadDto",
  "OwnerAIWorkDesktopMessageDto",
  "OwnerAIWorkDesktopContextPackageDto",
  "OwnerAIWorkDesktopContextReferenceDto",
  "OwnerAIWorkDesktopInboxReturnPathDto",
] as const

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_STOP_CONDITIONS = [
  "Stop before Prisma schema or migration edits without the OWNEROS-002C schema slice.",
  "Stop before configured or production database reads or writes.",
  "Stop before provider execution, secret handling, or email sending.",
  "Stop before shared team, Company-published, C-level, Client Portal, or public context expansion.",
  "Stop before external agent, MCP, A2A, or NANDA registration exposure.",
  "Stop if cross-owner denial fixtures or Inbox origin checks are missing.",
] as const

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_NEXT_SLICES = [
  "OWNEROS-002C: additive Conversation/Message/ContextPackage/InboxReturnPath schema draft with migration impact notes.",
  "OWNEROS-002D: protected server loader/service returning Personal Private thread DTOs with requireUser() and authz stubs.",
  "OWNEROS-004A: /inbox free-text return UI bound to the conversation thread DTO without autonomous writes.",
] as const

export const OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_CONTRACT =
  {
    contractId: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_CONTRACT_ID,
    status: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_STATUS,
    gateCriteria: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_GATE_CRITERIA,
    surfaces: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_SURFACES,
    firstRuntimeScope: "Personal Private only",
    bffFlow: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_BFF_FLOW,
    requiredAuthzChecks: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_REQUIRED_AUTHZ_CHECKS,
    dtoModels: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_DTO_MODELS,
    runtimeFlags: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_FLAGS,
    inboxReturnPathPolicy: {
      defaultReplyPolicy: "free_text_only",
      allowedWithoutOwnerReview: ["read_only", "low_risk_draft"],
      blockedWithoutOwnerReview: ["owner_review_required", "high_risk_blocked"],
    },
    nanda: {
      lifecycle: "internal_bff_contract_only",
      protocols: ["internal_bff_service_contract"],
      externalRegisterable: false,
      registrationStatus: "not-registered",
      externalAgentDatabaseAccess: false,
    },
    selectedPattern:
      "One OwnerConversation BFF contract owns durable chat DTOs, ContextPackage linkage, and Inbox return-path DTOs before schema or route expansion.",
    rejectedPatterns: [
      "Client-only localStorage chat history, because it cannot satisfy Gate A durable reload or authorization proof.",
      "A public Route Handler first, because Next.js route handlers are publicly reachable and require authz design before side effects.",
      "Direct provider execution, because Gate A still lacks durable authz, audit, and source-resolution proof.",
      "Separate Inbox and AI Input thread models, because return-path audit would split across two incompatible histories.",
    ],
    stopConditions: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_STOP_CONDITIONS,
    nextSlices: OWNER_AI_WORK_DESKTOP_CONVERSATION_RUNTIME_NEXT_SLICES,
  } as const satisfies OwnerAIWorkDesktopConversationRuntimeContract
