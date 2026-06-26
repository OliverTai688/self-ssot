import "server-only"

import { RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY } from "@/lib/contracts/research-owner-read-adapter-runtime.contract"
import {
  RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE,
  RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_SUMMARY,
  type ResearchOwnerReadIssuesRuntimeReadinessGate,
} from "@/lib/contracts/research-owner-read-issues-runtime-readiness.contract"
import {
  buildResearchOwnerReadIssuesAdapterProof,
  type ResearchOwnerReadIssuesAdapterProof,
} from "@/lib/services/research-owner-read-issues-adapter.service"
import {
  buildResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof,
  type ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof,
} from "@/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service"
import {
  buildResearchOwnerReadIssuesLiveReadProofRunnerContract,
  type ResearchOwnerReadIssuesLiveReadProofRunnerContract,
} from "@/lib/services/research-owner-read-issues-live-read-proof-runner.service"
import type { ResearchOwnerReadIssuesServiceAuthzRuntimeProof } from "@/lib/services/research-owner-read-issues-runtime-readiness.service"
import {
  RESEARCH_OWNER_READ_DTO_CONTRACT,
  RESEARCH_OWNER_READ_DTO_SUMMARY,
  type ResearchOwnerReadDtoFamilyId,
  type ResearchOwnerReadinessStateId,
} from "@/lib/contracts/research-owner-read-dto.contract"
import {
  RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT,
  RESEARCH_OWNER_READ_QUERY_PLAN_SUMMARY,
  type ResearchOwnerReadQueryAdapterKind,
  type ResearchOwnerReadQueryPlanRow,
  type ResearchOwnerReadQueryRuntimeState,
} from "@/lib/contracts/research-owner-read-query-plan.contract"

export type ResearchOwnerReadDtoServiceTaskId =
  | "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE"
  | "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON"
  | "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE"
  | "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON"

export type ResearchOwnerReadDtoServiceStatus =
  | "service_surface_skeleton_ready_no_runtime_db_read"
  | "owner_read_dto_authz_skeleton_ready_no_runtime_db_read"
  | "owner_read_dto_mapper_empty_state_skeleton_ready_no_runtime_db_read"
  | "owner_read_query_plan_service_loader_skeleton_ready_no_runtime_db_read"

export type ResearchOwnerReadDtoServiceMode =
  "protected_surface_skeleton_no_runtime_db_read"

export type ResearchOwnerReadDtoServiceTone = "good" | "warn" | "blocked" | "neutral"

export type ResearchOwnerReadDtoServiceSummary = {
  taskId: ResearchOwnerReadDtoServiceTaskId
  serviceSurfaceTaskId: "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE"
  contractTaskId: typeof RESEARCH_OWNER_READ_DTO_CONTRACT.id
  status: ResearchOwnerReadDtoServiceStatus
  mode: ResearchOwnerReadDtoServiceMode
  protectedRoute: "/research/readiness"
  readFamilyCount: number
  authorizationInvariantCount: number
  authorizationStageCount: number
  permissionDecisionCount: number
  mapperResponseCount: number
  responseStateCount: number
  queryPlanLoaderCount: number
  queryPlanReadyCount: number
  queryPlanBlockedCount: number
  emptyStateCount: number
  blockedOperationCount: number
  futureBffPath: readonly string[]
}

export type ResearchOwnerReadDtoIdentityBoundary = {
  ownerIdentitySource: "requireUser()"
  runtimeRequireUserCallInThisSlice: false
  callerSuppliedOwnerIdAllowed: false
  directThreadIdOnlyAccessAllowed: false
  label: string
  evidence: string
}

export type ResearchOwnerReadDtoServiceBoundary = {
  serverOnly: true
  importsContractOnly: true
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  routeHandlerEnabled: false
  serverActionWriteEnabled: false
  publicOutputEnabled: false
  externalCollaborationEnabled: false
  externalRegisterable: false
  launchLevelUpgradeClaimed: false
  adapterBoundary: string
  mapperBoundary: string
}

export type ResearchOwnerReadDtoFamilyRow = {
  id: ResearchOwnerReadDtoFamilyId
  label: string
  targetDto: string
  currentPersistence: string
  ownerScope: string
  authorization: string
  mapperBoundary: string
  emptyState: ResearchOwnerReadinessStateId
  blockedWrites: string
}

export type ResearchOwnerReadDtoEmptyStateRow = {
  id: ResearchOwnerReadinessStateId
  label: string
  mode: string
  message: string
  nextAction: string
  tone: ResearchOwnerReadDtoServiceTone
}

export type ResearchOwnerReadDtoAuthorizationRow = {
  id: string
  label: string
  evidence: string
  rejectedPattern: string
}

export type ResearchOwnerReadDtoAuthorizationSkeleton = {
  taskId: "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON"
  status: "owner_read_dto_authz_skeleton_ready_no_runtime_db_read"
  mode: "require_user_shaped_service_authorization_skeleton"
  ownerIdentitySource: "requireUser()"
  authorizationDecisionMode: "deny_runtime_research_reads_until_service_authz"
  serviceAuthorizationRequiredBeforeAdapter: true
  mapperRequiresAuthorizedRows: true
  callerSuppliedOwnerIdDecision: "refused"
  directThreadIdAccessDecision: "refused_without_owner_scope"
  runtimeRequireUserCallInThisSlice: false
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  launchLevelUpgradeClaimed: false
}

export type ResearchOwnerReadDtoAuthorizationStageRow = {
  id: string
  label: string
  inputSource: string
  requiredCheck: string
  deniedPattern: string
  unavailableState: ResearchOwnerReadinessStateId
  allowedInThisSlice: false
  runtimeDbReadEnabled: false
}

export type ResearchOwnerReadDtoPermissionDecisionRow = {
  id: string
  label: string
  operation: string
  decision: string
  blockedUntil: string
  passSignal: string
  allowedInThisSlice: false
}

export type ResearchOwnerReadDtoResponseKind =
  | "authorized_empty"
  | "model_ready_unavailable"
  | "partial_transitional_unavailable"
  | "formal_read_disabled"
  | "proposal_only"

export type ResearchOwnerReadDtoMapperResponseSkeleton = {
  taskId: "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE"
  status: "owner_read_dto_mapper_empty_state_skeleton_ready_no_runtime_db_read"
  mode: "mapper_empty_state_skeleton_no_runtime_db_read"
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  routeHandlerEnabled: false
  serverActionWriteEnabled: false
  publicOutputEnabled: false
  externalRegisterable: false
  mapperInput: "authorized_rows_or_explicit_unavailable_state"
  mapperOutput: "ui_safe_research_owner_read_response_dto"
  emptyStateFallbackPolicy: "explicit_state_only_no_mock_fallback"
  clientPayloadPolicy: "counts_labels_next_actions_no_raw_private_rows"
  formalMockFallbackAllowed: false
}

export type ResearchOwnerReadDtoMapperResponseRow = {
  id: ResearchOwnerReadDtoFamilyId
  label: string
  targetDto: string
  responseKind: ResearchOwnerReadDtoResponseKind
  responseDto: string
  emptyState: ResearchOwnerReadinessStateId
  itemCount: 0
  readEnabledInThisSlice: false
  mapperInput: "authorized_rows_or_explicit_unavailable_state"
  clientPayloadShape: string
  displayMessage: string
  nextAction: string
  auditRef: string
}

export type ResearchOwnerReadDtoResponseStateRow = {
  id: ResearchOwnerReadinessStateId
  label: string
  responseKind: ResearchOwnerReadDtoResponseKind
  displayMode: string
  httpSemantics: "protected_ui_state_only_no_route_response"
  clientPayloadShape: string
  mockFallbackAllowed: false
  tone: ResearchOwnerReadDtoServiceTone
}

export type ResearchOwnerReadDtoBlockedOperationRow = {
  id: string
  label: string
  reason: string
  unlockCriteria: readonly string[]
}

export type ResearchOwnerReadQueryPlanServiceLoaderSkeleton = {
  taskId: "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON"
  contractTaskId: typeof RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.id
  status: "owner_read_query_plan_service_loader_skeleton_ready_no_runtime_db_read"
  mode: "query_plan_service_loader_skeleton_no_runtime_db_read"
  consumesQueryPlanContract: true
  serviceAuthorizationRequiredBeforeAdapter: true
  mapperRequiresAuthorizedRows: true
  selectedFieldBoundaryVisible: true
  rejectedUnsafePatternsVisible: true
  adapterExecutionAllowed: false
  runtimeRequireUserCallInThisSlice: false
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  routeHandlerEnabled: false
  serverActionWriteEnabled: false
  publicOutputEnabled: false
  externalRegisterable: false
  loaderPath: readonly string[]
  nextSafeActionPolicy: string
}

export type ResearchOwnerReadQueryPlanLoaderRow = {
  id: ResearchOwnerReadDtoFamilyId
  label: string
  targetDto: string
  queryPlanId: string
  adapterKind: ResearchOwnerReadQueryAdapterKind
  runtimeState: ResearchOwnerReadQueryRuntimeState
  ownerScopePredicate: string
  selectedFieldBoundary: string
  unavailableState: ResearchOwnerReadinessStateId
  rejectedUnsafePatterns: readonly string[]
  nextSafeLoaderAction: string
  auditRef: string
  tone: ResearchOwnerReadDtoServiceTone
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  adapterExecutionAllowed: false
}

export type ResearchOwnerReadRuntimeAdapterGate = {
  taskId: typeof RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.taskId
  status: typeof RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.status
  mode: typeof RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.mode
  selectedFamily: typeof RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.selectedFamily
  selectedFamilyLabel: string
  adapterExecutionDecision: typeof RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.adapterExecutionDecision
  ownerScopeProofPath: string
  selectedFieldBoundary: string
  runtimeDbReadEnabled: false
  adapterExecutionAllowed: false
  tone: ResearchOwnerReadDtoServiceTone
  nextSafeAction: string
}

export type ResearchOwnerReadDtoSafetyRow = {
  id: string
  label: string
  allowed: false
}

export type ResearchOwnerReadDtoServiceSurface = {
  summary: ResearchOwnerReadDtoServiceSummary
  ownerIdentity: ResearchOwnerReadDtoIdentityBoundary
  serviceBoundary: ResearchOwnerReadDtoServiceBoundary
  readFamilyRows: ResearchOwnerReadDtoFamilyRow[]
  emptyStateRows: ResearchOwnerReadDtoEmptyStateRow[]
  authorizationRows: ResearchOwnerReadDtoAuthorizationRow[]
  authorizationSkeleton: ResearchOwnerReadDtoAuthorizationSkeleton
  authorizationSkeletonRows: ResearchOwnerReadDtoAuthorizationStageRow[]
  permissionDecisionRows: ResearchOwnerReadDtoPermissionDecisionRow[]
  mapperResponseSkeleton: ResearchOwnerReadDtoMapperResponseSkeleton
  mapperResponseRows: ResearchOwnerReadDtoMapperResponseRow[]
  responseStateRows: ResearchOwnerReadDtoResponseStateRow[]
  queryPlanLoaderSkeleton: ResearchOwnerReadQueryPlanServiceLoaderSkeleton
  queryPlanLoaderRows: ResearchOwnerReadQueryPlanLoaderRow[]
  runtimeAdapterGate: ResearchOwnerReadRuntimeAdapterGate
  issuesAdapterProof: ResearchOwnerReadIssuesAdapterProof
  issuesRuntimeReadinessGate: ResearchOwnerReadIssuesRuntimeReadinessGate
  issuesSelectedFieldRuntimeAdapterProof?: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof
  issuesLiveReadProofRunnerContract?: ResearchOwnerReadIssuesLiveReadProofRunnerContract
  blockedOperations: ResearchOwnerReadDtoBlockedOperationRow[]
  safety: ResearchOwnerReadDtoSafetyRow[]
  nandaBoundary: {
    affectedSurface: typeof RESEARCH_OWNER_READ_DTO_CONTRACT.nandaBoundary.affectedSurface
    runtimeAgentChanged: false
    protocolStatus: typeof RESEARCH_OWNER_READ_DTO_CONTRACT.nandaBoundary.protocolStatus
    externalRegisterable: false
    finalWritesRequireHumanApproval: true
  }
  clientPayloadRules: readonly string[]
  nextActions: readonly string[]
}

const EMPTY_STATE_TONES: Record<
  ResearchOwnerReadinessStateId,
  ResearchOwnerReadDtoServiceTone
> = {
  "empty-no-research-rows": "neutral",
  "model-ready-read-unavailable": "blocked",
  "partial-transitional-data": "warn",
  "formal-read-disabled": "blocked",
  "proposal-only-agent-output": "warn",
}

const SAFETY_LABELS: Record<keyof typeof RESEARCH_OWNER_READ_DTO_CONTRACT.safety, string> = {
  runtimeDbReadAllowed: "Runtime Research DB read",
  runtimeDbWriteAllowed: "Runtime Research DB write",
  schemaMigrationAllowed: "Schema migration",
  migrationApplyAllowed: "Migration apply",
  seedChangeAllowed: "Seed change",
  routeHandlerAllowed: "Route handler",
  serverActionWriteAllowed: "Server action write",
  connectorRuntimeAllowed: "Connector runtime",
  providerRuntimeAllowed: "Provider runtime",
  publicOutputAllowed: "Public output",
  externalCollaborationAllowed: "External collaboration",
  externalAgentDatabaseAccessAllowed: "External agent database access",
  agentFinalWriteAllowed: "Agent final write",
  externalRegisterable: "External registration",
  hiddenMockToFormalClaimAllowed: "Hidden mock-to-formal claim",
  launchLevelUpgradeClaimed: "Launch level claim",
}

function buildSafetyRows(): ResearchOwnerReadDtoSafetyRow[] {
  return Object.keys(RESEARCH_OWNER_READ_DTO_CONTRACT.safety).map((id) => ({
    id,
    label: SAFETY_LABELS[id as keyof typeof SAFETY_LABELS],
    allowed: false,
  }))
}

const RESEARCH_OWNER_READ_DTO_AUTHORIZATION_SKELETON: ResearchOwnerReadDtoAuthorizationSkeleton = {
  taskId: "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON",
  status: "owner_read_dto_authz_skeleton_ready_no_runtime_db_read",
  mode: "require_user_shaped_service_authorization_skeleton",
  ownerIdentitySource: "requireUser()",
  authorizationDecisionMode: "deny_runtime_research_reads_until_service_authz",
  serviceAuthorizationRequiredBeforeAdapter: true,
  mapperRequiresAuthorizedRows: true,
  callerSuppliedOwnerIdDecision: "refused",
  directThreadIdAccessDecision: "refused_without_owner_scope",
  runtimeRequireUserCallInThisSlice: false,
  runtimeDbReadEnabled: false,
  runtimeDbWriteEnabled: false,
  launchLevelUpgradeClaimed: false,
}

const RESEARCH_OWNER_READ_DTO_AUTHORIZATION_STAGES = [
  {
    id: "owner-session",
    label: "Owner session",
    inputSource: "requireUser() authenticated profile id",
    requiredCheck: "Resolve the owner profile on the server before any Research read operation.",
    deniedPattern: "caller-supplied ownerId",
    unavailableState: "formal-read-disabled",
    allowedInThisSlice: false,
    runtimeDbReadEnabled: false,
  },
  {
    id: "module-permission",
    label: "Research module permission",
    inputSource: "service-layer authorization decision",
    requiredCheck: "Confirm the authenticated owner may access protected Research read surfaces.",
    deniedPattern: "client-only route guard as authorization",
    unavailableState: "model-ready-read-unavailable",
    allowedInThisSlice: false,
    runtimeDbReadEnabled: false,
  },
  {
    id: "resource-owner-scope",
    label: "Resource owner scope",
    inputSource: "authorized Research issue/thread/source ownership join",
    requiredCheck: "Filter candidate rows by owner scope before mapper or graph projection output.",
    deniedPattern: "raw id lookup before owner scope",
    unavailableState: "partial-transitional-data",
    allowedInThisSlice: false,
    runtimeDbReadEnabled: false,
  },
  {
    id: "direct-thread-id-refusal",
    label: "Direct threadId access refusal",
    inputSource: "request parameters after requireUser()",
    requiredCheck: "Reject direct threadId-only access unless the service proves owner-linked Research scope.",
    deniedPattern: "direct threadId-only read",
    unavailableState: "model-ready-read-unavailable",
    allowedInThisSlice: false,
    runtimeDbReadEnabled: false,
  },
  {
    id: "mapper-output",
    label: "Authorized mapper output",
    inputSource: "owner-authorized rows only",
    requiredCheck: "Map only UI-safe DTO fields and explicit empty/readiness states.",
    deniedPattern: "raw model payload or private identifier passthrough",
    unavailableState: "empty-no-research-rows",
    allowedInThisSlice: false,
    runtimeDbReadEnabled: false,
  },
  {
    id: "agent-proposal-boundary",
    label: "Research agent proposal boundary",
    inputSource: "protected owner-visible proposal DTO",
    requiredCheck: "Keep Research agent output proposal-only until human approval and audit exist.",
    deniedPattern: "agent final write or external sharing",
    unavailableState: "proposal-only-agent-output",
    allowedInThisSlice: false,
    runtimeDbReadEnabled: false,
  },
] as const satisfies readonly ResearchOwnerReadDtoAuthorizationStageRow[]

const RESEARCH_OWNER_READ_DTO_PERMISSION_DECISIONS = [
  {
    id: "owner-read-operation",
    label: "Owner-scoped Research read",
    operation: "Read Research DTO families from protected owner surface",
    decision: "Blocked until runtime requireUser() plus service authorization is implemented.",
    blockedUntil: "Authorized Research service can prove owner scope before adapter reads.",
    passSignal: "A future proof shows requireUser(), owner scope filtering, mapper output, and no cross-owner rows.",
    allowedInThisSlice: false,
  },
  {
    id: "direct-thread-id-read",
    label: "Direct threadId read",
    operation: "Read a ResearchThread or transitional issue by threadId alone",
    decision: "Refused; threadId is not authority without owner-linked service authorization.",
    blockedUntil: "The service joins thread/issue/source ownership to the authenticated owner profile.",
    passSignal: "A future proof rejects caller-supplied threadId-only access and returns unavailable state.",
    allowedInThisSlice: false,
  },
  {
    id: "agent-proposal-read",
    label: "Research agent proposal read",
    operation: "Show Research agent proposal summaries",
    decision: "Proposal-only and protected-owner visible; no final writes or external sharing.",
    blockedUntil: "Human approval, audit, public-safety, and registry boundaries exist.",
    passSignal: "A future proof shows proposals stay non-registerable and cannot write final records.",
    allowedInThisSlice: false,
  },
] as const satisfies readonly ResearchOwnerReadDtoPermissionDecisionRow[]

const RESEARCH_OWNER_READ_DTO_MAPPER_RESPONSE_SKELETON: ResearchOwnerReadDtoMapperResponseSkeleton = {
  taskId: "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE",
  status: "owner_read_dto_mapper_empty_state_skeleton_ready_no_runtime_db_read",
  mode: "mapper_empty_state_skeleton_no_runtime_db_read",
  runtimeDbReadEnabled: false,
  runtimeDbWriteEnabled: false,
  routeHandlerEnabled: false,
  serverActionWriteEnabled: false,
  publicOutputEnabled: false,
  externalRegisterable: false,
  mapperInput: "authorized_rows_or_explicit_unavailable_state",
  mapperOutput: "ui_safe_research_owner_read_response_dto",
  emptyStateFallbackPolicy: "explicit_state_only_no_mock_fallback",
  clientPayloadPolicy: "counts_labels_next_actions_no_raw_private_rows",
  formalMockFallbackAllowed: false,
}

const RESEARCH_OWNER_READ_QUERY_PLAN_SERVICE_LOADER_SKELETON: ResearchOwnerReadQueryPlanServiceLoaderSkeleton = {
  taskId: "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
  contractTaskId: RESEARCH_OWNER_READ_QUERY_PLAN_SUMMARY.taskId,
  status: "owner_read_query_plan_service_loader_skeleton_ready_no_runtime_db_read",
  mode: "query_plan_service_loader_skeleton_no_runtime_db_read",
  consumesQueryPlanContract: true,
  serviceAuthorizationRequiredBeforeAdapter: true,
  mapperRequiresAuthorizedRows: true,
  selectedFieldBoundaryVisible: true,
  rejectedUnsafePatternsVisible: true,
  adapterExecutionAllowed: false,
  runtimeRequireUserCallInThisSlice: false,
  runtimeDbReadEnabled: false,
  runtimeDbWriteEnabled: false,
  routeHandlerEnabled: false,
  serverActionWriteEnabled: false,
  publicOutputEnabled: false,
  externalRegisterable: false,
  loaderPath: RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.bffPath,
  nextSafeActionPolicy:
    "Only implement an adapter after requireUser(), service authorization, owner-scope filtering, selected-field mapping, and no-secret UI-safe DTO proof are all present.",
}

const RESEARCH_OWNER_READ_DTO_RESPONSE_KIND_BY_STATE: Record<
  ResearchOwnerReadinessStateId,
  ResearchOwnerReadDtoResponseKind
> = {
  "empty-no-research-rows": "authorized_empty",
  "model-ready-read-unavailable": "model_ready_unavailable",
  "partial-transitional-data": "partial_transitional_unavailable",
  "formal-read-disabled": "formal_read_disabled",
  "proposal-only-agent-output": "proposal_only",
}

const RESEARCH_OWNER_READ_DTO_CLIENT_PAYLOAD_BY_KIND: Record<
  ResearchOwnerReadDtoResponseKind,
  string
> = {
  authorized_empty: "items: [], count: 0, state, message, nextAction",
  model_ready_unavailable: "items: [], unavailable: true, state, message, nextAction",
  partial_transitional_unavailable:
    "items: [], transitional: true, state, message, nextAction, auditRef",
  formal_read_disabled: "items: [], disabled: true, state, message, nextAction",
  proposal_only: "items: [], proposalOnly: true, state, message, nextAction, humanApprovalRequired",
}

function findReadinessState(id: ResearchOwnerReadinessStateId) {
  return RESEARCH_OWNER_READ_DTO_CONTRACT.emptyAndReadinessStates.find(
    (state) => state.id === id
  )
}

function buildMapperResponseRows(): ResearchOwnerReadDtoMapperResponseRow[] {
  return RESEARCH_OWNER_READ_DTO_CONTRACT.readFamilies.map((family) => {
    const state = findReadinessState(family.emptyState)
    const responseKind = RESEARCH_OWNER_READ_DTO_RESPONSE_KIND_BY_STATE[family.emptyState]

    return {
      id: family.id,
      label: family.label,
      targetDto: family.targetDto,
      responseKind,
      responseDto: `${family.targetDto}Response`,
      emptyState: family.emptyState,
      itemCount: 0,
      readEnabledInThisSlice: false,
      mapperInput: "authorized_rows_or_explicit_unavailable_state",
      clientPayloadShape: RESEARCH_OWNER_READ_DTO_CLIENT_PAYLOAD_BY_KIND[responseKind],
      displayMessage: state?.message ?? "No runtime Research owner-read response is enabled yet.",
      nextAction: state?.nextAction ?? "Keep the response explicit until service authorization is proven.",
      auditRef: `research-owner-read-dto:${family.id}:${family.emptyState}`,
    }
  })
}

function buildResponseStateRows(): ResearchOwnerReadDtoResponseStateRow[] {
  return RESEARCH_OWNER_READ_DTO_CONTRACT.emptyAndReadinessStates.map((state) => {
    const responseKind = RESEARCH_OWNER_READ_DTO_RESPONSE_KIND_BY_STATE[state.id]

    return {
      id: state.id,
      label: state.label,
      responseKind,
      displayMode: state.displayMode,
      httpSemantics: "protected_ui_state_only_no_route_response",
      clientPayloadShape: RESEARCH_OWNER_READ_DTO_CLIENT_PAYLOAD_BY_KIND[responseKind],
      mockFallbackAllowed: false,
      tone: EMPTY_STATE_TONES[state.id],
    }
  })
}

function queryPlanTone(row: ResearchOwnerReadQueryPlanRow): ResearchOwnerReadDtoServiceTone {
  if (row.runtimeState === "query_plan_ready_no_runtime_read") {
    return "good"
  }

  if (row.runtimeState === "blocked_owner_scope_missing") {
    return "blocked"
  }

  if (row.runtimeState === "derived_projection_only" || row.runtimeState === "generated_evidence_only") {
    return "neutral"
  }

  return "warn"
}

function summarizeSelectedFieldBoundary(row: ResearchOwnerReadQueryPlanRow): string {
  const preview = row.selectedFields.slice(0, 5).join(", ")
  const suffix = row.selectedFields.length > 5 ? ", ..." : ""

  return `${row.selectedFields.length} selected-field markers: ${preview}${suffix}`
}

function buildNextSafeLoaderAction(row: ResearchOwnerReadQueryPlanRow): string {
  if (row.runtimeState === "query_plan_ready_no_runtime_read") {
    return "Next: add an authorized adapter behind requireUser() and service authorization, then map only selected fields into the UI-safe DTO."
  }

  if (row.runtimeState === "blocked_owner_scope_missing") {
    return "Next: resolve the owner-scope relation or privacy split before any loader can read this family."
  }

  if (row.runtimeState === "derived_projection_only") {
    return "Next: derive this projection only from already-authorized DTO rows; do not query graph data directly."
  }

  if (row.runtimeState === "generated_evidence_only") {
    return "Next: read only whitelisted no-secret generated evidence packets through a server-only resolver."
  }

  return "Next: keep this as protected-owner proposal-only output until human approval, audit, and agent trust boundaries exist."
}

function buildQueryPlanLoaderRows(): ResearchOwnerReadQueryPlanLoaderRow[] {
  return RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.queryPlans.map((row) => ({
    id: row.id,
    label: row.label,
    targetDto: row.targetDto,
    queryPlanId: row.queryPlanId,
    adapterKind: row.adapterKind,
    runtimeState: row.runtimeState,
    ownerScopePredicate: row.ownerScopePredicate,
    selectedFieldBoundary: summarizeSelectedFieldBoundary(row),
    unavailableState: row.unavailableState,
    rejectedUnsafePatterns: row.rejectedUnsafePatterns,
    nextSafeLoaderAction: buildNextSafeLoaderAction(row),
    auditRef: row.auditRef,
    tone: queryPlanTone(row),
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    adapterExecutionAllowed: false,
  }))
}

export function buildResearchOwnerReadDtoSurface(
  issuesServiceAuthzRuntimeProof?: ResearchOwnerReadIssuesServiceAuthzRuntimeProof,
): ResearchOwnerReadDtoServiceSurface {
  const contract = RESEARCH_OWNER_READ_DTO_CONTRACT
  const mapperResponseRows = buildMapperResponseRows()
  const responseStateRows = buildResponseStateRows()
  const queryPlanLoaderRows = buildQueryPlanLoaderRows()
  const issuesAdapterProof = buildResearchOwnerReadIssuesAdapterProof()
  const issuesRuntimeReadinessGate =
    RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE
  const issuesSelectedFieldRuntimeAdapterProof = issuesServiceAuthzRuntimeProof
    ? buildResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof(
        issuesServiceAuthzRuntimeProof,
      )
    : undefined
  const issuesLiveReadProofRunnerContract = issuesSelectedFieldRuntimeAdapterProof
    ? buildResearchOwnerReadIssuesLiveReadProofRunnerContract(
        issuesSelectedFieldRuntimeAdapterProof,
      )
    : undefined

  return {
    summary: {
      taskId: "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
      serviceSurfaceTaskId: "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE",
      contractTaskId: RESEARCH_OWNER_READ_DTO_SUMMARY.taskId,
      status: "owner_read_query_plan_service_loader_skeleton_ready_no_runtime_db_read",
      mode: "protected_surface_skeleton_no_runtime_db_read",
      protectedRoute: "/research/readiness",
      readFamilyCount: contract.readFamilies.length,
      authorizationInvariantCount: contract.authorizationInvariants.length,
      authorizationStageCount: RESEARCH_OWNER_READ_DTO_AUTHORIZATION_STAGES.length,
      permissionDecisionCount: RESEARCH_OWNER_READ_DTO_PERMISSION_DECISIONS.length,
      mapperResponseCount: mapperResponseRows.length,
      responseStateCount: responseStateRows.length,
      queryPlanLoaderCount: queryPlanLoaderRows.length,
      queryPlanReadyCount: queryPlanLoaderRows.filter(
        (row) => row.runtimeState === "query_plan_ready_no_runtime_read"
      ).length,
      queryPlanBlockedCount: queryPlanLoaderRows.filter(
        (row) => row.runtimeState === "blocked_owner_scope_missing"
      ).length,
      emptyStateCount: contract.emptyAndReadinessStates.length,
      blockedOperationCount: contract.blockedOperations.length,
      futureBffPath: RESEARCH_OWNER_READ_DTO_SUMMARY.futureBffPath,
    },
    ownerIdentity: {
      ownerIdentitySource: "requireUser()",
      runtimeRequireUserCallInThisSlice: false,
      callerSuppliedOwnerIdAllowed: false,
      directThreadIdOnlyAccessAllowed: false,
      label: "Owner identity is reserved for the server-only BFF path",
      evidence:
        "This service surface is protected-owner visible proposal-only and documents no caller-supplied ownerId plus no direct threadId-only access before runtime reads are enabled.",
    },
    serviceBoundary: {
      serverOnly: true,
      importsContractOnly: true,
      runtimeDbReadEnabled: false,
      runtimeDbWriteEnabled: false,
      routeHandlerEnabled: false,
      serverActionWriteEnabled: false,
      publicOutputEnabled: false,
      externalCollaborationEnabled: false,
      externalRegisterable: false,
      launchLevelUpgradeClaimed: false,
      adapterBoundary: "Adapter reads stay behind a future authorized Research service, not this slice.",
      mapperBoundary: "Only UI-safe DTO summaries and explicit empty/readiness states may reach Client Components.",
    },
    readFamilyRows: contract.readFamilies.map((family) => ({
      id: family.id,
      label: family.label,
      targetDto: family.targetDto,
      currentPersistence: family.currentPersistence,
      ownerScope: family.ownerScope,
      authorization: family.requiredAuthorization,
      mapperBoundary: family.mapperBoundary,
      emptyState: family.emptyState,
      blockedWrites: family.blockedWrites,
    })),
    emptyStateRows: contract.emptyAndReadinessStates.map((state) => ({
      id: state.id,
      label: state.label,
      mode: state.displayMode,
      message: state.message,
      nextAction: state.nextAction,
      tone: EMPTY_STATE_TONES[state.id],
    })),
    authorizationRows: contract.authorizationInvariants.map((invariant) => ({
      id: invariant.id,
      label: invariant.label,
      evidence: invariant.evidence,
      rejectedPattern: invariant.rejectedPattern,
    })),
    authorizationSkeleton: RESEARCH_OWNER_READ_DTO_AUTHORIZATION_SKELETON,
    authorizationSkeletonRows: [...RESEARCH_OWNER_READ_DTO_AUTHORIZATION_STAGES],
    permissionDecisionRows: [...RESEARCH_OWNER_READ_DTO_PERMISSION_DECISIONS],
    mapperResponseSkeleton: RESEARCH_OWNER_READ_DTO_MAPPER_RESPONSE_SKELETON,
    mapperResponseRows,
    responseStateRows,
    queryPlanLoaderSkeleton: RESEARCH_OWNER_READ_QUERY_PLAN_SERVICE_LOADER_SKELETON,
    queryPlanLoaderRows,
    runtimeAdapterGate: {
      taskId: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.taskId,
      status: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.status,
      mode: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.mode,
      selectedFamily: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.selectedFamily,
      selectedFamilyLabel: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.selectedFamilyLabel,
      adapterExecutionDecision:
        RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.adapterExecutionDecision,
      ownerScopeProofPath: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.ownerScopeProofPath,
      selectedFieldBoundary: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.selectedFieldBoundary,
      runtimeDbReadEnabled: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.runtimeDbReadEnabled,
      adapterExecutionAllowed:
        RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.adapterExecutionAllowed,
      tone: "warn",
      nextSafeAction: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.nextSafeAction,
    },
    issuesAdapterProof,
    issuesRuntimeReadinessGate,
    issuesSelectedFieldRuntimeAdapterProof,
    issuesLiveReadProofRunnerContract,
    blockedOperations: contract.blockedOperations.map((operation) => ({
      id: operation.id,
      label: operation.label,
      reason: operation.reason,
      unlockCriteria: operation.unlockCriteria,
    })),
    safety: buildSafetyRows(),
    nandaBoundary: {
      affectedSurface: contract.nandaBoundary.affectedSurface,
      runtimeAgentChanged: false,
      protocolStatus: contract.nandaBoundary.protocolStatus,
      externalRegisterable: false,
      finalWritesRequireHumanApproval: true,
    },
    clientPayloadRules: contract.clientPayloadRules,
    nextActions: [
      "If proof prerequisites appear, run AUTH-005 or WORK-009 before Research BFF runtime reads.",
      "Use RESEARCH-BFF-006 query-plan loader rows as the safe checklist before expanding adapter reads.",
      "Use RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE as the first runtime adapter gate in proof_gated_adapter_skeleton_no_runtime_db_read mode: selected family is issues, execution remains disabled until owner identity and proof target are proven.",
      "Use RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF as the issues adapter interface and mapper proof before any runtime Prisma read.",
      `Use RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE (${RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_SUMMARY.taskId}) as the issues runtime-readiness preflight gate before service authz runtime proof or Prisma read.`,
      "Use RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF to call requireUser() in the protected server path and return a no-secret owner preflight packet before any Research Prisma read.",
      "Use RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF to prove selected scalar fields, _count relation keys, owner scope, and mapper handoff while live Prisma reads remain disabled.",
      "Use RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT as the dry-run-first owner-run proof contract before any live Research issues Prisma read.",
      "Stop before runtime Research DB reads until requireUser() and service authorization can be proven end to end.",
    ],
  }
}

export const RESEARCH_OWNER_READ_DTO_SERVICE_SURFACE =
  buildResearchOwnerReadDtoSurface()
