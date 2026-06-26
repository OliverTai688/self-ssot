import type {
  AIInputSourceWorkflowServiceAuthzObjectId,
  AIInputSourceWorkflowServiceAuthzOperationId,
  AIInputSourceWorkflowServiceAuthzSurface,
} from "@/lib/contracts/ai-input-source-workflow-service-authz.contract"

export type AIInputSourceWorkflowServiceRuntimeStatus = "service_authz_runtime_unavailable"

export type AIInputSourceWorkflowServiceRuntimeMode = "service_authz_runtime_no_db_read"

export type AIInputSourceWorkflowServiceRuntimeObjectState =
  | "unavailable_until_migration_and_proof"
  | "proposal_only_until_owner_review"
  | "audit_storage_pending"

export type AIInputSourceWorkflowServiceRuntimeActionState =
  | "protected_read_boundary_ready"
  | "blocked_until_migration_review"
  | "blocked_until_rls_audit_storage"
  | "blocked_until_owner_approval"
  | "blocked_high_risk"

export type AIInputSourceWorkflowServiceRuntimeOwnerScope = {
  authenticated: true
  source: "requireUser()"
  ownerProfileSource: "authenticated_profile"
  ownerProfileIdRedacted: true
  emailRedacted: true
  roleRedacted: true
  visibility: "protected_authenticated_owner_scope_only"
}

export type AIInputSourceWorkflowServiceRuntimePersistence = {
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  migrationApplyAllowed: false
  reviewedMigrationRequired: true
  proofTargetRequired: true
  rlsAuditStorageRequired: true
  connectorRuntimeAllowed: false
  formalCutoverAllowed: false
  reason: string
}

export type AIInputSourceWorkflowServiceRuntimeObject = {
  objectId: AIInputSourceWorkflowServiceAuthzObjectId
  label: string
  state: AIInputSourceWorkflowServiceRuntimeObjectState
  count: null
  ownerScoped: true
  uiSafeDtoOnly: true
  nextGate: "DATTR-024K-RLS-AUDIT-STORAGE" | "DATTR-024" | "AUDIT-OPS-004"
  auditFamily: "ai-input.source-workflow"
  exposureBoundary: string
}

export type AIInputSourceWorkflowServiceRuntimeOperation = {
  id: AIInputSourceWorkflowServiceAuthzOperationId
  title: string
  surface: AIInputSourceWorkflowServiceAuthzSurface
  actionState: AIInputSourceWorkflowServiceRuntimeActionState
  authBoundary: "requireUser()"
  serviceAuthorization: readonly string[]
  inputBoundary: readonly string[]
  outputBoundary: readonly string[]
  auditActions: readonly string[]
  externalRegisterable: false
}

export type AIInputSourceWorkflowServiceRuntimeSafety = {
  routeHandlerAllowed: false
  serverActionAllowed: false
  providerDataAllowed: false
  publicOutputAllowed: false
  moduleFinalWriteAllowed: false
  externalCollaborationAllowed: false
  externalAgentDatabaseAccessAllowed: false
  externalRegisterable: false
  hiddenMockFallbackAllowed: false
  unsafeSecretsExcluded: readonly string[]
}

export type AIInputSourceWorkflowServiceRuntimeSummary = {
  taskId: "DATTR-024J-SERVICE-AUTHZ-RUNTIME"
  status: AIInputSourceWorkflowServiceRuntimeStatus
  mode: AIInputSourceWorkflowServiceRuntimeMode
  objectCount: number
  operationCount: number
  protectedByRequireUser: true
  uiSafeDtoOnly: true
  noDbReadInThisSlice: true
  noDbWriteInThisSlice: true
  nextTask: "DATTR-024K-RLS-AUDIT-STORAGE"
}

export type AIInputSourceWorkflowServiceRuntimeContract = {
  id: "DATTR-024J-SERVICE-AUTHZ-RUNTIME"
  generatedAt: string
  status: AIInputSourceWorkflowServiceRuntimeStatus
  mode: AIInputSourceWorkflowServiceRuntimeMode
  ownerScope: AIInputSourceWorkflowServiceRuntimeOwnerScope
  persistence: AIInputSourceWorkflowServiceRuntimePersistence
  objects: readonly AIInputSourceWorkflowServiceRuntimeObject[]
  operations: readonly AIInputSourceWorkflowServiceRuntimeOperation[]
  safety: AIInputSourceWorkflowServiceRuntimeSafety
  summary: AIInputSourceWorkflowServiceRuntimeSummary
  sourceRefs: readonly string[]
  stopConditions: readonly string[]
  nextGates: readonly [
    "DATTR-024K-RLS-AUDIT-STORAGE",
    "approved migration apply",
    "safe Source Workflow proof run",
    "connector runtime approval",
    "formal-mode cutover",
  ]
}
