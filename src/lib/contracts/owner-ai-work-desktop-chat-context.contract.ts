export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_CONTRACT_ID = "OWNEROS-002A" as const

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_STATUS = "contract_only_no_runtime" as const

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_GATE_CRITERION =
  "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT" as const

export type OwnerAIWorkDesktopChatContextSourceType =
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

export type OwnerAIWorkDesktopChatContextVisibility =
  | "personal_private"
  | "team_project"
  | "company_internal"
  | "c_level"
  | "external_client_disabled"

export type OwnerAIWorkDesktopConversationStatus =
  | "draft"
  | "active"
  | "archived"
  | "blocked_authz"
  | "blocked_retention_review"

export type OwnerAIWorkDesktopMessageRole =
  | "owner"
  | "assistant"
  | "system"
  | "internal_agent_proposal"

export type OwnerAIWorkDesktopMessageStatus =
  | "draft"
  | "submitted"
  | "context_resolved"
  | "provider_pending"
  | "assistant_ready"
  | "failed_redacted"
  | "blocked_authz"

export type OwnerAIWorkDesktopContextPackageStatus =
  | "draft"
  | "resolved"
  | "denied"
  | "expired"
  | "retention_review_required"

export type OwnerAIWorkDesktopAuthzCheck =
  | "requireUser"
  | "profile_workspace_membership"
  | "source_owner_or_grant"
  | "visibility_lattice"
  | "c_level_gate"
  | "context_redaction"
  | "negative_cross_owner"

export type OwnerAIWorkDesktopRedactionClass =
  | "metadata_only"
  | "summary_only"
  | "content_excerpt"
  | "owner_full_private"
  | "blocked_secret_or_high_risk"

export type OwnerAIWorkDesktopRetentionClass =
  | "session_ephemeral"
  | "owner_private_default"
  | "company_internal_review"
  | "legal_or_high_risk_review_required"

export type OwnerAIWorkDesktopContextResolutionStatus =
  | "allowed"
  | "denied_cross_owner"
  | "denied_visibility"
  | "denied_c_level"
  | "denied_missing_source"
  | "denied_retention"

export type OwnerAIWorkDesktopContextReferenceDto = {
  refId: string
  sourceType: OwnerAIWorkDesktopChatContextSourceType
  sourceId: string
  sourceDisplayLabel: string
  visibility: OwnerAIWorkDesktopChatContextVisibility
  redactionClass: OwnerAIWorkDesktopRedactionClass
  retentionClass: OwnerAIWorkDesktopRetentionClass
  auditSourcePath: string
  resolvedStatus: OwnerAIWorkDesktopContextResolutionStatus
}

export type OwnerAIWorkDesktopContextResolutionCheck = {
  checkId: OwnerAIWorkDesktopAuthzCheck
  passed: boolean
  failureCode: string | null
  redactedReason: string | null
}

export type OwnerAIWorkDesktopContextPackageDto = {
  contextPackageId: string
  conversationId: string
  status: OwnerAIWorkDesktopContextPackageStatus
  visibility: OwnerAIWorkDesktopChatContextVisibility
  sourceRefs: readonly OwnerAIWorkDesktopContextReferenceDto[]
  resolutionChecks: readonly OwnerAIWorkDesktopContextResolutionCheck[]
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
  text: string
  contextPackageId: string | null
  sourceRefIds: readonly string[]
  auditEventId: string | null
  createdAtIso: string
}

export type OwnerAIWorkDesktopConversationDto = {
  conversationId: string
  ownerProfileRef: string
  workspaceRef: string
  title: string
  status: OwnerAIWorkDesktopConversationStatus
  visibility: OwnerAIWorkDesktopChatContextVisibility
  messages: readonly OwnerAIWorkDesktopMessageDto[]
  latestContextPackage: OwnerAIWorkDesktopContextPackageDto | null
  archivedAtIso: string | null
  updatedAtIso: string
}

export type OwnerAIWorkDesktopContextPackageManifest = {
  manifestId: "urn:personal-os:owner-ai-work-desktop:context-package"
  contractId: typeof OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_CONTRACT_ID
  gateCriterion: typeof OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_GATE_CRITERION
  runtimeStatus: typeof OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_STATUS
  sourceTypes: readonly OwnerAIWorkDesktopChatContextSourceType[]
  visibilityLevels: readonly OwnerAIWorkDesktopChatContextVisibility[]
  requiredAuthzChecks: readonly OwnerAIWorkDesktopAuthzCheck[]
  stopConditions: readonly string[]
  nanda: {
    lifecycle: "contract_only_no_runtime"
    protocols: readonly ["internal_bff_service_contract"]
    externalRegisterable: false
    registrationStatus: "not-registered"
    externalAgentDatabaseAccess: false
  }
}

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_SOURCE_TYPES = [
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
] as const satisfies readonly OwnerAIWorkDesktopChatContextSourceType[]

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_VISIBILITY_LEVELS = [
  "personal_private",
  "team_project",
  "company_internal",
  "c_level",
  "external_client_disabled",
] as const satisfies readonly OwnerAIWorkDesktopChatContextVisibility[]

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_REQUIRED_AUTHZ_CHECKS = [
  "requireUser",
  "profile_workspace_membership",
  "source_owner_or_grant",
  "visibility_lattice",
  "c_level_gate",
  "context_redaction",
  "negative_cross_owner",
] as const satisfies readonly OwnerAIWorkDesktopAuthzCheck[]

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_RUNTIME_FLAGS = {
  routeHandlerCreated: false,
  serverActionCreated: false,
  schemaMigrationIncluded: false,
  runtimePersistenceEnabled: false,
  databaseRead: false,
  databaseWrite: false,
  aiProviderExecutionEnabled: false,
  sendsEmail: false,
  publicOutputEnabled: false,
  externalRuntimeEnabled: false,
  externalAgentDatabaseAccess: false,
  externalRegisterable: false,
} as const

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_STOP_CONDITIONS = [
  "Stop before Prisma schema or migration edits without OWNEROS-002B review.",
  "Stop before configured or production database writes.",
  "Stop before provider execution or secret handling.",
  "Stop before shared, C-level, Company-published, Client Portal, or public context expansion.",
  "Stop before external agent, MCP, A2A, or NANDA registration exposure.",
  "Stop if cross-owner denial fixtures are missing.",
] as const

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_ACCEPTANCE_ROWS = [
  {
    id: "OWNEROS-002A-CONTRACT",
    gateCriterion: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_GATE_CRITERION,
    status: "ready_for_contract_review",
    evidence: "pnpm owner:chat-context:check",
  },
  {
    id: "OWNEROS-002-RUNTIME",
    gateCriterion: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_GATE_CRITERION,
    status: "not_achieved",
    evidence:
      "Requires protected durable runtime, DB-backed reload, provider fixture, owner browser proof, and negative cross-owner proof.",
  },
] as const

export const OWNER_AI_WORK_DESKTOP_CONTEXT_PACKAGE_MANIFEST = {
  manifestId: "urn:personal-os:owner-ai-work-desktop:context-package",
  contractId: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_CONTRACT_ID,
  gateCriterion: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_GATE_CRITERION,
  runtimeStatus: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_STATUS,
  sourceTypes: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_SOURCE_TYPES,
  visibilityLevels: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_VISIBILITY_LEVELS,
  requiredAuthzChecks: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_REQUIRED_AUTHZ_CHECKS,
  stopConditions: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_STOP_CONDITIONS,
  nanda: {
    lifecycle: "contract_only_no_runtime",
    protocols: ["internal_bff_service_contract"],
    externalRegisterable: false,
    registrationStatus: "not-registered",
    externalAgentDatabaseAccess: false,
  },
} as const satisfies OwnerAIWorkDesktopContextPackageManifest

export const OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_CONTRACT_SUMMARY = {
  id: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_CONTRACT_ID,
  status: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_STATUS,
  gateCriterion: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_GATE_CRITERION,
  sourceTypeCount: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_SOURCE_TYPES.length,
  visibilityLevelCount: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_VISIBILITY_LEVELS.length,
  authzCheckCount: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_REQUIRED_AUTHZ_CHECKS.length,
  runtimeFlags: OWNER_AI_WORK_DESKTOP_CHAT_CONTEXT_RUNTIME_FLAGS,
  firstRuntimeSlice: "personal_private_only",
} as const

