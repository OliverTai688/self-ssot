import {
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT,
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS,
  type ResearchOwnerReadAdapterAuthzDecisionRow,
} from "./research-owner-read-adapter-authz.contract"
import {
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT,
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS_BY_FAMILY,
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_ROWS,
  type ResearchOwnerReadAdapterMockFixtureRow,
  type ResearchOwnerReadAdapterMockHarnessRow,
} from "./research-owner-read-adapter-mock-harness.contract"
import {
  RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT,
  RESEARCH_OWNER_READ_QUERY_PLAN_ROWS,
  type ResearchOwnerReadQueryPlanRow,
} from "./research-owner-read-query-plan.contract"
import type { ResearchOwnerReadDtoFamilyId } from "./research-owner-read-dto.contract"

export type ResearchOwnerReadFirstRuntimeAdapterTaskId =
  "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE"

export type ResearchOwnerReadFirstRuntimeAdapterMode =
  "proof_gated_adapter_skeleton_no_runtime_db_read"

export type ResearchOwnerReadFirstRuntimeAdapterStatus =
  "ready_for_first_research_owner_read_runtime_adapter_slice_gate"

export type ResearchOwnerReadFirstRuntimeAdapterExecutionDecision =
  "proof_gated_disabled_until_auth_profile_and_proof_target"

export type ResearchOwnerReadFirstRuntimeAdapterGate = {
  id: ResearchOwnerReadFirstRuntimeAdapterTaskId
  version: "0.1.0"
  status: ResearchOwnerReadFirstRuntimeAdapterStatus
  mode: ResearchOwnerReadFirstRuntimeAdapterMode
  selectedFamily: "issues"
  selectedFamilyCount: 1
  enabledRuntimeReadFamilies: readonly ResearchOwnerReadDtoFamilyId[]
  adapterExecutionDecision: ResearchOwnerReadFirstRuntimeAdapterExecutionDecision
  consumesContracts: {
    queryPlanContractId: typeof RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.id
    authzContractId: typeof RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.id
    mockHarnessContractId: typeof RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.id
    consumesBff005QueryPlan: true
    consumesBff006LoaderBoundary: true
    consumesBff007AuthzDecision: true
    consumesBff008MockHarness: true
  }
  selectedQueryPlan: {
    familyId: "issues"
    queryPlanId: string
    modelCandidate: "ResearchThread"
    ownerScopePredicate: string
    selectedFields: readonly string[]
    stableSort: string
    defaultLimit: number
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state"
    selectedFieldBoundary: string
  }
  selectedAuthzDecision: {
    adapterEligibility: "contract_eligible_after_service_authz"
    requiredOwnerIdentitySource: "requireUser().profileId"
    ownerScopeProofPath: string
    serviceAuthorizationRule: string
    deniedUnsafePatterns: readonly string[]
  }
  selectedFixture: {
    fixtureRowId: string
    safeSelectedFieldKeys: readonly string[]
    redactionPolicy: string
  }
  proofGatedAdapterSkeleton: {
    proofGatedAdapterSkeleton: true
    runtimeAdapterExecutionAllowed: false
    realAdapterExecutionAllowed: false
    adapterExecutionAllowed: false
    runtimeRequireUserCallInThisSlice: false
    runtimeDbReadEnabled: false
    runtimeDbWriteEnabled: false
    routeHandlerEnabled: false
    serverActionWriteEnabled: false
    publicOutputEnabled: false
    externalCollaborationEnabled: false
    externalAgentDatabaseAccessAllowed: false
    agentFinalWriteAllowed: false
    externalRegisterable: false
    launchLevelUpgradeClaimed: false
  }
  blockedUntil: readonly string[]
  runtimeEnablementConditions: readonly string[]
  rejectedAlternatives: readonly string[]
  stopConditions: readonly string[]
  nextSafeAction: string
  safety: {
    runtimeDbReadAllowed: false
    runtimeDbWriteAllowed: false
    schemaMigrationAllowed: false
    migrationApplyAllowed: false
    seedChangeAllowed: false
    routeHandlerAllowed: false
    serverActionWriteAllowed: false
    connectorRuntimeAllowed: false
    providerRuntimeAllowed: false
    publicOutputAllowed: false
    externalCollaborationAllowed: false
    externalAgentDatabaseAccessAllowed: false
    agentFinalWriteAllowed: false
    externalRegisterable: false
    hiddenMockToFormalClaimAllowed: false
    launchLevelUpgradeClaimed: false
  }
  nandaBoundary: {
    affectedSurface: "Research agent proposals"
    runtimeAgentChanged: false
    protocolStatus: "protected_owner_visible_proposal_only"
    externalRegisterable: false
    finalWritesRequireHumanApproval: true
  }
  sourceRefs: readonly string[]
  verification: readonly string[]
  nextTasks: readonly string[]
}

export type ResearchOwnerReadFirstRuntimeAdapterSummary = {
  taskId: ResearchOwnerReadFirstRuntimeAdapterTaskId
  status: ResearchOwnerReadFirstRuntimeAdapterStatus
  mode: ResearchOwnerReadFirstRuntimeAdapterMode
  selectedFamily: "issues"
  selectedFamilyLabel: string
  adapterExecutionDecision: ResearchOwnerReadFirstRuntimeAdapterExecutionDecision
  ownerScopeProofPath: string
  selectedFieldBoundary: string
  runtimeDbReadEnabled: false
  adapterExecutionAllowed: false
  nextSafeAction: string
}

export const RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SELECTED_FAMILY =
  "issues" as const

export const RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_ENABLED_RUNTIME_READ_FAMILIES =
  [] as const satisfies readonly ResearchOwnerReadDtoFamilyId[]

function requireRow<T extends { id: string }>(
  rows: readonly T[],
  id: string,
  label: string,
): T {
  const row = rows.find((candidate) => candidate.id === id)

  if (!row) {
    throw new Error(`Missing ${label} for ${id}`)
  }

  return row
}

const selectedQueryPlan = requireRow<ResearchOwnerReadQueryPlanRow>(
  RESEARCH_OWNER_READ_QUERY_PLAN_ROWS,
  RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SELECTED_FAMILY,
  "Research owner-read query plan",
)

const selectedAuthzDecision = requireRow<ResearchOwnerReadAdapterAuthzDecisionRow>(
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS,
  RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SELECTED_FAMILY,
  "Research owner-read adapter authz decision",
)

const selectedMockHarnessRow = requireRow<ResearchOwnerReadAdapterMockHarnessRow>(
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_ROWS,
  RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SELECTED_FAMILY,
  "Research owner-read adapter mock harness row",
)

const selectedFixture: ResearchOwnerReadAdapterMockFixtureRow =
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS_BY_FAMILY[
    RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SELECTED_FAMILY
  ]

function summarizeSelectedFields(row: ResearchOwnerReadQueryPlanRow): string {
  return `${row.selectedFields.length} selected-field markers: ${row.selectedFields.join(", ")}`
}

export const RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE: ResearchOwnerReadFirstRuntimeAdapterGate =
  {
    id: "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
    version: "0.1.0",
    status: "ready_for_first_research_owner_read_runtime_adapter_slice_gate",
    mode: "proof_gated_adapter_skeleton_no_runtime_db_read",
    selectedFamily: "issues",
    selectedFamilyCount: 1,
    enabledRuntimeReadFamilies: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_ENABLED_RUNTIME_READ_FAMILIES,
    adapterExecutionDecision: "proof_gated_disabled_until_auth_profile_and_proof_target",
    consumesContracts: {
      queryPlanContractId: RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.id,
      authzContractId: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.id,
      mockHarnessContractId: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.id,
      consumesBff005QueryPlan: true,
      consumesBff006LoaderBoundary: true,
      consumesBff007AuthzDecision: true,
      consumesBff008MockHarness: true,
    },
    selectedQueryPlan: {
      familyId: "issues",
      queryPlanId: selectedQueryPlan.queryPlanId,
      modelCandidate: "ResearchThread",
      ownerScopePredicate: selectedQueryPlan.ownerScopePredicate,
      selectedFields: selectedQueryPlan.selectedFields,
      stableSort: selectedQueryPlan.stableSort,
      defaultLimit: selectedQueryPlan.defaultLimit,
      mapperInputBoundary: selectedQueryPlan.mapperInput,
      selectedFieldBoundary: summarizeSelectedFields(selectedQueryPlan),
    },
    selectedAuthzDecision: {
      adapterEligibility: "contract_eligible_after_service_authz",
      requiredOwnerIdentitySource: "requireUser().profileId",
      ownerScopeProofPath: selectedAuthzDecision.ownerScopeProofPath,
      serviceAuthorizationRule: selectedAuthzDecision.serviceAuthorizationRule,
      deniedUnsafePatterns: selectedAuthzDecision.deniedUnsafePatterns,
    },
    selectedFixture: {
      fixtureRowId: selectedMockHarnessRow.fixtureRowId,
      safeSelectedFieldKeys: selectedFixture.safeSelectedFieldKeys,
      redactionPolicy: selectedFixture.redactionPolicy,
    },
    proofGatedAdapterSkeleton: {
      proofGatedAdapterSkeleton: true,
      runtimeAdapterExecutionAllowed: false,
      realAdapterExecutionAllowed: false,
      adapterExecutionAllowed: false,
      runtimeRequireUserCallInThisSlice: false,
      runtimeDbReadEnabled: false,
      runtimeDbWriteEnabled: false,
      routeHandlerEnabled: false,
      serverActionWriteEnabled: false,
      publicOutputEnabled: false,
      externalCollaborationEnabled: false,
      externalAgentDatabaseAccessAllowed: false,
      agentFinalWriteAllowed: false,
      externalRegisterable: false,
      launchLevelUpgradeClaimed: false,
    },
    blockedUntil: [
      "AUTH-005 Supabase public env plus signed-in sanitized /auth/status evidence is present.",
      "A service-layer requireUser() owner profile proof can be verified without caller-supplied ownerId.",
      "A safe local/disposable proof target or owner-approved DB target is available for runtime read proof.",
      "The mapper proves selected ResearchThread fields only and refuses raw Prisma payload passthrough.",
    ],
    runtimeEnablementConditions: [
      "Read request enters through Server Component loader or service function, not public route output.",
      "requireUser().profileId is the only owner identity source.",
      "ResearchThread.ownerId equals requireUser().profileId is part of the adapter predicate.",
      "Adapter returns only selected fields and counts from the BFF-005 query plan.",
      "Mapper returns UI-safe DTO or explicit unavailable state.",
      "Checker proves no route handler, server action write, public output, external collaboration, or launch-level claim was added.",
    ],
    rejectedAlternatives: [
      "Enable all Research owner-read families in one slice.",
      "Select sources first before proving the direct ResearchThread owner field path.",
      "Accept caller-supplied ownerId or direct threadId-only access.",
      "Import Prisma or execute a DB read before AUTH-005 and proof-target evidence exist.",
      "Expose the adapter through public HTTP, external agent collaboration, or Research agent final writes.",
    ],
    stopConditions: [
      "Stop before runtime DB read if requireUser()/Profile proof remains absent.",
      "Stop before runtime DB read if selected-field mapper redaction is unclear.",
      "Stop before schema, migration, seed, route handler, server action, public output, external collaboration, or launch-level upgrade changes.",
      "Stop before external agent registration or external database access.",
    ],
    nextSafeAction:
      "Implement the Research issues adapter interface and mapper proof behind this gate, or enable a disposable/owner-approved runtime proof only after AUTH-005 and proof-target prerequisites exist.",
    safety: {
      runtimeDbReadAllowed: false,
      runtimeDbWriteAllowed: false,
      schemaMigrationAllowed: false,
      migrationApplyAllowed: false,
      seedChangeAllowed: false,
      routeHandlerAllowed: false,
      serverActionWriteAllowed: false,
      connectorRuntimeAllowed: false,
      providerRuntimeAllowed: false,
      publicOutputAllowed: false,
      externalCollaborationAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      agentFinalWriteAllowed: false,
      externalRegisterable: false,
      hiddenMockToFormalClaimAllowed: false,
      launchLevelUpgradeClaimed: false,
    },
    nandaBoundary: {
      affectedSurface: "Research agent proposals",
      runtimeAgentChanged: false,
      protocolStatus: "protected_owner_visible_proposal_only",
      externalRegisterable: false,
      finalWritesRequireHumanApproval: true,
    },
    sourceRefs: [
      "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md#research-bff-009-research-owner-read-first-runtime-adapter-slice-acceptance",
      "docs/06_audits-and-reports/RPT-048_loop-160-launch-level-and-research-review.md",
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
      "src/lib/contracts/research-owner-read-query-plan.contract.ts",
      "src/lib/contracts/research-owner-read-adapter-authz.contract.ts",
      "src/lib/contracts/research-owner-read-adapter-mock-harness.contract.ts",
      "prisma/schema.prisma#ResearchThread",
    ],
    verification: [
      "pnpm research:read-adapter-runtime:check",
      "pnpm research:read-adapter-mock:check",
      "pnpm research:read-adapter-authz:check",
      "pnpm research:read-query-plan:check",
      "pnpm research:read-dto:check",
      "pnpm research:model:check",
      "pnpm research:readiness:check",
      "pnpm db:validate",
      "pnpm exec tsc --noEmit --pretty false",
    ],
    nextTasks: [
      "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF",
      "AUTH-005 when Supabase public env plus signed-in /auth/status evidence appears",
      "WORK-009 when safe proof target plus exact write confirmations appear",
    ],
  }

export const RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY: ResearchOwnerReadFirstRuntimeAdapterSummary =
  {
    taskId: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.id,
    status: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.status,
    mode: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.mode,
    selectedFamily: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.selectedFamily,
    selectedFamilyLabel: selectedQueryPlan.label,
    adapterExecutionDecision:
      RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.adapterExecutionDecision,
    ownerScopeProofPath:
      RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.selectedAuthzDecision.ownerScopeProofPath,
    selectedFieldBoundary:
      RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.selectedQueryPlan.selectedFieldBoundary,
    runtimeDbReadEnabled:
      RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.proofGatedAdapterSkeleton
        .runtimeDbReadEnabled,
    adapterExecutionAllowed:
      RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.proofGatedAdapterSkeleton
        .adapterExecutionAllowed,
    nextSafeAction: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.nextSafeAction,
  }
