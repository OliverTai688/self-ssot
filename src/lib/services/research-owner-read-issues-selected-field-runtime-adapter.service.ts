import "server-only"

import { RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE } from "@/lib/contracts/research-owner-read-issues-runtime-readiness.contract"
import {
  RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_TASK_ID,
  type ResearchOwnerReadIssuesServiceAuthzRuntimeProof,
} from "@/lib/services/research-owner-read-issues-runtime-readiness.service"

export const RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"

export const RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_MODE =
  "selected_field_runtime_adapter_proof_gate_no_live_research_read"

const RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_NEXT_TASK_ID =
  "LOOP-168-RESEARCH-POST-SELECTED-FIELD-ADAPTER-GAP-REVIEW"

const RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_DEPENDENCY_TASK_IDS =
  [
    "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF",
    "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE",
    "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF",
    "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
  ] as const

export type ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterStatus =
  | "selected_field_runtime_adapter_proof_gate_ready_no_live_research_read"
  | "blocked_until_service_authz_and_proof_target"

export type ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterTone =
  | "good"
  | "warn"
  | "blocked"
  | "neutral"

export type ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterRow = {
  id: string
  label: string
  proofSignal: string
  passCriteria: string
  blockedPattern: string
  tone: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterTone
}

export type ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof = {
  taskId: typeof RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_TASK_ID
  status: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterStatus
  mode: typeof RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_MODE
  generatedAt: string
  selectedFamily: "issues"
  selectedModel: "ResearchThread"
  dependsOn: {
    bff012TaskId: typeof RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_TASK_ID
    bff011TaskId: typeof RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.taskId
    bff010TaskId: typeof RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.dependsOn.bff010TaskId
    bff009TaskId: typeof RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.dependsOn.bff009TaskId
  }
  dependencyTaskIds: typeof RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_DEPENDENCY_TASK_IDS
  protectedRoute: "/research/readiness"
  ownerIdentitySource: "requireUser().profileId"
  ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId"
  callerSuppliedOwnerIdAllowed: false
  directThreadIdOnlyAccessAllowed: false
  serviceAuthzPreflightStatus: ResearchOwnerReadIssuesServiceAuthzRuntimeProof["status"]
  serviceAuthzPreflightReady: boolean
  ownerAuthenticated: boolean
  ownerProfileIdPresent: boolean
  selectedScalarFields: readonly string[]
  relationCountKeys: readonly ["sources", "concepts", "writingProjects"]
  relationCountSelection: typeof RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.futurePrismaReadShape.relationCountSelection
  stableSort: string
  defaultLimit: number
  plannedPrismaOperation: "prisma.researchThread.findMany"
  plannedWhere: "where: { ownerId: ownerProfileId }"
  plannedSelectShape: readonly string[]
  mapperFunction: "mapAuthorizedResearchIssueRowsToDtos"
  mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state"
  mapperOutputBoundary: "ui_safe_research_issue_read_dto"
  proofTargetReady: false
  livePrismaReadAllowed: false
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  runtimePrismaReadEnabled: false
  adapterExecutionAllowed: false
  routeHandlerEnabled: false
  serverActionWriteEnabled: false
  publicOutputEnabled: false
  externalCollaborationEnabled: false
  externalAgentDatabaseAccessAllowed: false
  agentFinalWriteAllowed: false
  externalRegisterable: false
  launchLevelUpgradeClaimed: false
  unavailableFallback: {
    state: "model-ready-read-unavailable"
    items: []
    count: 0
    runtimeDbReadEnabled: false
    adapterExecutionAllowed: false
    nextAction: string
  }
  ownerRunCriteria: readonly string[]
  rows: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterRow[]
  rejectedAlternatives: readonly string[]
  stopConditions: readonly string[]
  sourceRefs: readonly string[]
  nextSafeAction: string
  tone: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterTone
}

const SOURCE_REFS = [
  "node_modules/next/dist/docs/01-app/02-guides/data-security.md",
  "node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md",
  "https://www.prisma.io/docs/orm/prisma-client/queries/select-fields",
  "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
  "docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md",
  "docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
] as const

const REJECTED_ALTERNATIVES = [
  "Enable the live ResearchThread Prisma read in the selected-field adapter proof gate.",
  "Read a ResearchThread by threadId before proving owner scope.",
  "Pass raw Prisma ResearchThread rows, ownerId, Profile id, source bodies, or unselected relations into the UI tree.",
  "Expose the proof through a route handler, server action, public endpoint, external collaboration path, or external agent registration target.",
] as const

const STOP_CONDITIONS = [
  "Stop before importing Prisma client, db clients, provider clients, cookies, headers, or environment variables in this service.",
  "Stop before Research DB read/write, schema migration, migration apply, seed change, route handler, server action, public output, or launch-level claim.",
  "Stop before external collaboration, Research agent final write, external agent database access, or external registration.",
  "Stop if AUTH-005, proof target classification, owner scope, selected fields, relation-count shape, mapper output, or no-secret evidence becomes ambiguous.",
] as const

const OWNER_RUN_CRITERIA = [
  "AUTH-005 or explicit development mock auth must prove requireUser().profileId maps to the intended owner Profile.",
  "Use a local/disposable or owner-approved proof target; never silently use a valuable production Research dataset.",
  "Run pnpm research:read-issues-selected-field-runtime-adapter:check and confirm serviceAuthzPreflightReady is true before considering a live adapter proof.",
  "When live read proof is later selected, verify the adapter uses only selected scalar fields plus _count for sources, concepts, and writingProjects.",
  "Mapper output must use mapAuthorizedResearchIssueRowsToDtos and return only ui_safe_research_issue_read_dto fields.",
  "No public output, external agent DB access, external registration, route/action expansion, write behavior, or launch-level upgrade may be claimed from this proof gate.",
] as const

function buildPlannedSelectShape(): string[] {
  const scalarFields =
    RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.futurePrismaReadShape
      .selectScalarFields
  const countFields =
    RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.relationCountKeys.map(
      (key) => `_count.${key}`,
    )

  return [...scalarFields, ...countFields]
}

function buildRows({
  serviceAuthzPreflightReady,
}: {
  serviceAuthzPreflightReady: boolean
}): ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterRow[] {
  const gate = RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE

  return [
    {
      id: "service-authz-preflight",
      label: "Service authz preflight",
      proofSignal: serviceAuthzPreflightReady
        ? "BFF-012 resolved requireUser() in the protected server path."
        : "BFF-012 is not ready in this environment; keep the adapter proof disabled.",
      passCriteria:
        "ownerAuthenticated and ownerProfileIdPresent are true while Profile id remains redacted.",
      blockedPattern: "Live adapter read before requireUser() owner preflight",
      tone: serviceAuthzPreflightReady ? "good" : "blocked",
    },
    {
      id: "owner-scope-predicate",
      label: "Owner-scope predicate",
      proofSignal: gate.ownerScopePredicate,
      passCriteria: "Every future candidate row is filtered by ownerId before mapper output.",
      blockedPattern: "caller-supplied ownerId or threadId-only lookup",
      tone: "neutral",
    },
    {
      id: "selected-field-shape",
      label: "Selected-field shape",
      proofSignal: `${gate.futurePrismaReadShape.selectScalarFields.length} scalar fields plus ${gate.relationCountKeys.length} relation-count keys`,
      passCriteria:
        "Adapter selects only scalar DTO fields and _count keys needed by mapAuthorizedResearchIssueRowsToDtos.",
      blockedPattern: "Raw Prisma payload or unselected relation passthrough",
      tone: "good",
    },
    {
      id: "stable-window",
      label: "Stable sort and limit",
      proofSignal: `${gate.futurePrismaReadShape.stableSort} · limit ${gate.futurePrismaReadShape.defaultLimit}`,
      passCriteria: "Read proof has a deterministic first page and does not scan unbounded rows.",
      blockedPattern: "Unbounded or unstable ResearchThread read",
      tone: "neutral",
    },
    {
      id: "mapper-handoff",
      label: "Mapper handoff",
      proofSignal: "mapAuthorizedResearchIssueRowsToDtos -> ui_safe_research_issue_read_dto",
      passCriteria: "Only mapper DTO fields reach the protected readiness UI.",
      blockedPattern: "Private owner/source fields reaching Client Components",
      tone: "good",
    },
    {
      id: "live-read-stop",
      label: "Live read remains stopped",
      proofSignal:
        "proofTargetReady=false, livePrismaReadAllowed=false, adapterExecutionAllowed=false",
      passCriteria: "This loop creates the proof gate only; future live read proof needs owner-run evidence.",
      blockedPattern: "Runtime Research DB read success claim before owner-approved proof target",
      tone: "blocked",
    },
  ]
}

export function buildResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof(
  serviceAuthzProof: ResearchOwnerReadIssuesServiceAuthzRuntimeProof,
): ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof {
  const gate = RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE
  const serviceAuthzPreflightReady =
    serviceAuthzProof.status ===
      "service_authz_runtime_proof_ready_no_research_db_read" &&
    serviceAuthzProof.ownerAuthenticated &&
    serviceAuthzProof.ownerProfileIdPresent

  return {
    taskId: RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_TASK_ID,
    status: serviceAuthzPreflightReady
      ? "selected_field_runtime_adapter_proof_gate_ready_no_live_research_read"
      : "blocked_until_service_authz_and_proof_target",
    mode: RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_MODE,
    generatedAt: new Date().toISOString(),
    selectedFamily: "issues",
    selectedModel: "ResearchThread",
    dependsOn: {
      bff012TaskId: RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_TASK_ID,
      bff011TaskId: gate.taskId,
      bff010TaskId: gate.dependsOn.bff010TaskId,
      bff009TaskId: gate.dependsOn.bff009TaskId,
    },
    dependencyTaskIds:
      RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_DEPENDENCY_TASK_IDS,
    protectedRoute: "/research/readiness",
    ownerIdentitySource: "requireUser().profileId",
    ownerScopePredicate: gate.ownerScopePredicate,
    callerSuppliedOwnerIdAllowed: false,
    directThreadIdOnlyAccessAllowed: false,
    serviceAuthzPreflightStatus: serviceAuthzProof.status,
    serviceAuthzPreflightReady,
    ownerAuthenticated: serviceAuthzProof.ownerAuthenticated,
    ownerProfileIdPresent: serviceAuthzProof.ownerProfileIdPresent,
    selectedScalarFields: gate.futurePrismaReadShape.selectScalarFields,
    relationCountKeys: gate.relationCountKeys,
    relationCountSelection: gate.futurePrismaReadShape.relationCountSelection,
    stableSort: gate.futurePrismaReadShape.stableSort,
    defaultLimit: gate.futurePrismaReadShape.defaultLimit,
    plannedPrismaOperation: gate.futurePrismaReadShape.operation,
    plannedWhere: gate.futurePrismaReadShape.where,
    plannedSelectShape: buildPlannedSelectShape(),
    mapperFunction: "mapAuthorizedResearchIssueRowsToDtos",
    mapperInputBoundary: gate.mapperInputBoundary,
    mapperOutputBoundary: gate.mapperOutputBoundary,
    proofTargetReady: false,
    livePrismaReadAllowed: false,
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    runtimePrismaReadEnabled: false,
    adapterExecutionAllowed: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
    publicOutputEnabled: false,
    externalCollaborationEnabled: false,
    externalAgentDatabaseAccessAllowed: false,
    agentFinalWriteAllowed: false,
    externalRegisterable: false,
    launchLevelUpgradeClaimed: false,
    unavailableFallback: {
      state: "model-ready-read-unavailable",
      items: [],
      count: 0,
      runtimeDbReadEnabled: false,
      adapterExecutionAllowed: false,
      nextAction:
        "Return explicit unavailable Research issues output until AUTH-005, service authz, proof target, selected-field shape, and mapper output are proven together.",
    },
    ownerRunCriteria: OWNER_RUN_CRITERIA,
    rows: buildRows({ serviceAuthzPreflightReady }),
    rejectedAlternatives: REJECTED_ALTERNATIVES,
    stopConditions: STOP_CONDITIONS,
    sourceRefs: SOURCE_REFS,
    nextSafeAction:
      serviceAuthzPreflightReady
        ? "Keep this proof gate disabled until a safe proof target is present, then select a live read proof loop with owner-run evidence criteria."
        : `Run ${RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_TASK_ID} in an environment where requireUser() resolves before selecting a live read proof. Next cadence review: ${RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_NEXT_TASK_ID}.`,
    tone: serviceAuthzPreflightReady ? "warn" : "blocked",
  }
}
