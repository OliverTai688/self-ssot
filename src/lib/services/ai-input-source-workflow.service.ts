import "server-only"

import {
  AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OBJECTS,
  AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OPERATIONS,
  AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_REQUIRED_OPERATION_IDS,
  AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SOURCE_REFS,
  AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_STOP_CONDITIONS,
  type AIInputSourceWorkflowServiceAuthzObjectId,
  type AIInputSourceWorkflowServiceAuthzOperation,
} from "@/lib/contracts/ai-input-source-workflow-service-authz.contract"
import { requireUser } from "@/lib/services/auth.service"
import type {
  AIInputSourceWorkflowServiceRuntimeActionState,
  AIInputSourceWorkflowServiceRuntimeContract,
  AIInputSourceWorkflowServiceRuntimeObject,
  AIInputSourceWorkflowServiceRuntimeObjectState,
  AIInputSourceWorkflowServiceRuntimeOperation,
} from "@/types/ai-input-source-workflow"

const AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_TASK_ID = "DATTR-024J-SERVICE-AUTHZ-RUNTIME"
const AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_MODE = "service_authz_runtime_no_db_read"
const AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_AUDIT_FAMILY = "ai-input.source-workflow"

const OBJECT_LABELS: Record<AIInputSourceWorkflowServiceAuthzObjectId, string> = {
  SourceConnection: "SourceConnection",
  SourceAsset: "SourceAsset",
  AIWorkflowRun: "AIWorkflowRun",
  AIWorkItem: "AIWorkItem",
  SourceNamingProfile: "SourceNamingProfile",
  DataUnitProposal: "DataUnitProposal",
  ModuleWriteIntent: "ModuleWriteIntent",
  OperatingAuditEvent: "OperatingAuditEvent",
}

const PROPOSAL_ONLY_OBJECTS = new Set<AIInputSourceWorkflowServiceAuthzObjectId>([
  "DataUnitProposal",
  "ModuleWriteIntent",
])

const AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_UNSAFE_SECRETS_EXCLUDED = [
  "database URLs",
  "hosts",
  "credentials",
  "Supabase keys",
  "provider tokens",
  "cookies",
  "raw auth claims",
  "profile IDs",
  "row IDs",
  "provider payloads",
  "private source bodies",
  "target module final payloads",
] as const

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_SOURCE_REFS = [
  ...AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SOURCE_REFS,
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
  "scripts/ai-input-source-workflow-proof-runner.mjs",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
] as const

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_SUMMARY = {
  taskId: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_TASK_ID,
  mode: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_MODE,
  protectedByRequireUser: true,
  runtimeDbReadEnabled: false,
  runtimeDbWriteEnabled: false,
  migrationApplyAllowed: false,
  connectorRuntimeAllowed: false,
  publicOutputAllowed: false,
  moduleFinalWriteAllowed: false,
  externalAgentDatabaseAccessAllowed: false,
  externalRegisterable: false,
  nextTask: "DATTR-024K-RLS-AUDIT-STORAGE",
} as const

export async function getAIInputSourceWorkflowServiceRuntimeContract(): Promise<AIInputSourceWorkflowServiceRuntimeContract> {
  await requireUser()
  const generatedAt = new Date().toISOString()
  const operations = AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_REQUIRED_OPERATION_IDS.map((operationId) => {
    const operation = AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OPERATIONS.find((candidate) => candidate.id === operationId)
    if (!operation) {
      throw new Error(`Missing AI Input Source Workflow service operation: ${operationId}`)
    }
    return toRuntimeOperation(operation)
  })

  return {
    id: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_TASK_ID,
    generatedAt,
    status: "service_authz_runtime_unavailable",
    mode: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_MODE,
    ownerScope: {
      authenticated: true,
      source: "requireUser()",
      ownerProfileSource: "authenticated_profile",
      ownerProfileIdRedacted: true,
      emailRedacted: true,
      roleRedacted: true,
      visibility: "protected_authenticated_owner_scope_only",
    },
    persistence: {
      runtimeDbReadEnabled: false,
      runtimeDbWriteEnabled: false,
      migrationApplyAllowed: false,
      reviewedMigrationRequired: true,
      proofTargetRequired: true,
      rlsAuditStorageRequired: true,
      connectorRuntimeAllowed: false,
      formalCutoverAllowed: false,
      reason:
        "DATTR-024J creates the protected service/authz boundary only. It must not read or write Source Workflow tables until reviewed migration apply, RLS/audit storage, and proof-runner gates pass.",
    },
    objects: AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OBJECTS.map(toRuntimeObject),
    operations,
    safety: {
      routeHandlerAllowed: false,
      serverActionAllowed: false,
      providerDataAllowed: false,
      publicOutputAllowed: false,
      moduleFinalWriteAllowed: false,
      externalCollaborationAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      externalRegisterable: false,
      hiddenMockFallbackAllowed: false,
      unsafeSecretsExcluded: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_UNSAFE_SECRETS_EXCLUDED,
    },
    summary: {
      taskId: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_TASK_ID,
      status: "service_authz_runtime_unavailable",
      mode: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_MODE,
      objectCount: AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OBJECTS.length,
      operationCount: operations.length,
      protectedByRequireUser: true,
      uiSafeDtoOnly: true,
      noDbReadInThisSlice: true,
      noDbWriteInThisSlice: true,
      nextTask: "DATTR-024K-RLS-AUDIT-STORAGE",
    },
    sourceRefs: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_SOURCE_REFS,
    stopConditions: [
      ...AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_STOP_CONDITIONS,
      "No Prisma import, DB client import, provider fetch, or connector runtime in DATTR-024J-SERVICE-AUTHZ-RUNTIME.",
      "No route handler or server action in DATTR-024J-SERVICE-AUTHZ-RUNTIME.",
      "No Source Workflow DB read/write until DATTR-024K-RLS-AUDIT-STORAGE and proof-runner gates pass.",
    ],
    nextGates: [
      "DATTR-024K-RLS-AUDIT-STORAGE",
      "approved migration apply",
      "safe Source Workflow proof run",
      "connector runtime approval",
      "formal-mode cutover",
    ],
  }
}

function toRuntimeObject(objectId: AIInputSourceWorkflowServiceAuthzObjectId): AIInputSourceWorkflowServiceRuntimeObject {
  return {
    objectId,
    label: OBJECT_LABELS[objectId],
    state: getObjectState(objectId),
    count: null,
    ownerScoped: true,
    uiSafeDtoOnly: true,
    nextGate: objectId === "OperatingAuditEvent" ? "AUDIT-OPS-004" : "DATTR-024K-RLS-AUDIT-STORAGE",
    auditFamily: AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_AUDIT_FAMILY,
    exposureBoundary:
      "Return only redacted, owner-scoped DTOs. Raw Prisma rows, database identifiers, provider payloads, source bodies, and target module final payloads stay excluded.",
  }
}

function toRuntimeOperation(
  operation: AIInputSourceWorkflowServiceAuthzOperation,
): AIInputSourceWorkflowServiceRuntimeOperation {
  return {
    id: operation.id,
    title: operation.title,
    surface: operation.surface,
    actionState: getOperationState(operation),
    authBoundary: "requireUser()",
    serviceAuthorization: operation.authorizationChecks,
    inputBoundary: operation.inputDtoRules,
    outputBoundary: operation.outputDtoRules,
    auditActions: operation.auditActions,
    externalRegisterable: false,
  }
}

function getObjectState(
  objectId: AIInputSourceWorkflowServiceAuthzObjectId,
): AIInputSourceWorkflowServiceRuntimeObjectState {
  if (objectId === "OperatingAuditEvent") {
    return "audit_storage_pending"
  }

  if (PROPOSAL_ONLY_OBJECTS.has(objectId)) {
    return "proposal_only_until_owner_review"
  }

  return "unavailable_until_migration_and_proof"
}

function getOperationState(
  operation: AIInputSourceWorkflowServiceAuthzOperation,
): AIInputSourceWorkflowServiceRuntimeActionState {
  if (operation.approval === "BLOCKED_HIGH_RISK") {
    return "blocked_high_risk"
  }

  if (operation.approval === "HUMAN_APPROVAL_REQUIRED" || operation.approval === "OWNER_REVIEW_REQUIRED") {
    return "blocked_until_owner_approval"
  }

  if (operation.runtimeStage === "future_db_read") {
    return "protected_read_boundary_ready"
  }

  if (operation.runtimeStage === "future_proposal_write") {
    return "blocked_until_rls_audit_storage"
  }

  return "blocked_until_migration_review"
}
