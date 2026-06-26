import {
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT,
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS,
  type ResearchOwnerReadAdapterAuthzDecisionRow,
  type ResearchOwnerReadAdapterAuthzEligibility,
} from "./research-owner-read-adapter-authz.contract"
import type { ResearchOwnerReadDtoFamilyId } from "./research-owner-read-dto.contract"

export type ResearchOwnerReadAdapterMockHarnessTaskId =
  "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS"

export type ResearchOwnerReadAdapterMockHarnessMode =
  "adapter_mock_harness_only_no_runtime_db_read"

export type ResearchOwnerReadAdapterMockHarnessStatus =
  "ready_for_research_owner_read_adapter_mock_harness_use"

export type ResearchOwnerReadAdapterMockHarnessOutcome =
  | "fixture_adapter_exercised_no_db"
  | "blocked_no_adapter_execution"
  | "derived_projection_no_adapter_execution"
  | "generated_evidence_metadata_only"
  | "proposal_only_no_final_write"

export type ResearchOwnerReadAdapterMockResult =
  | "fixture_result_returned"
  | "not_executed"

export type ResearchOwnerReadAdapterMockFixtureRow = {
  id: string
  familyId: ResearchOwnerReadDtoFamilyId
  displayLabel: string
  safeSelectedFieldKeys: readonly string[]
  fixtureState:
    | "owner_scoped_fixture_row"
    | "blocked_fixture_marker"
    | "derived_fixture_marker"
    | "generated_evidence_marker"
    | "proposal_queue_marker"
  redactionPolicy: string
}

export type ResearchOwnerReadAdapterMockHarnessRow = {
  id: ResearchOwnerReadDtoFamilyId
  label: string
  sourceDecisionEligibility: ResearchOwnerReadAdapterAuthzEligibility
  fixtureRowId: string
  fixtureAdapterExercised: boolean
  mockAdapterResult: ResearchOwnerReadAdapterMockResult
  harnessOutcome: ResearchOwnerReadAdapterMockHarnessOutcome
  proofMessage: string
  realAdapterExecutionAllowed: false
  runtimeAdapterExecutionAllowed: false
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  routeHandlerEnabled: false
  serverActionWriteEnabled: false
  publicOutputEnabled: false
  externalCollaborationEnabled: false
  externalAgentDatabaseAccessAllowed: false
  agentFinalWriteAllowed: false
  externalRegisterable: false
}

export type ResearchOwnerReadAdapterMockHarnessContract = {
  id: ResearchOwnerReadAdapterMockHarnessTaskId
  version: "0.1.0"
  status: ResearchOwnerReadAdapterMockHarnessStatus
  mode: ResearchOwnerReadAdapterMockHarnessMode
  adapterAuthzContractId: typeof RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.id
  requiresBff007AuthzDecision: true
  fixtureRows: readonly ResearchOwnerReadAdapterMockFixtureRow[]
  harnessRows: readonly ResearchOwnerReadAdapterMockHarnessRow[]
  contractEligibleFamilies: readonly ResearchOwnerReadDtoFamilyId[]
  nonExecutableFamilies: readonly ResearchOwnerReadDtoFamilyId[]
  forbiddenPatterns: readonly string[]
  stopConditions: readonly string[]
  safety: {
    mockOnlyAdapterHarness: true
    realAdapterExecutionAllowed: false
    runtimeAdapterExecutionAllowed: false
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

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_OUTCOME_POLICY = {
  contract_eligible_after_service_authz: {
    fixtureAdapterExercised: true,
    mockAdapterResult: "fixture_result_returned",
    harnessOutcome: "fixture_adapter_exercised_no_db",
  },
  blocked_owner_scope_missing: {
    fixtureAdapterExercised: false,
    mockAdapterResult: "not_executed",
    harnessOutcome: "blocked_no_adapter_execution",
  },
  derived_only: {
    fixtureAdapterExercised: false,
    mockAdapterResult: "not_executed",
    harnessOutcome: "derived_projection_no_adapter_execution",
  },
  generated_evidence_only: {
    fixtureAdapterExercised: false,
    mockAdapterResult: "not_executed",
    harnessOutcome: "generated_evidence_metadata_only",
  },
  proposal_only_no_final_write: {
    fixtureAdapterExercised: false,
    mockAdapterResult: "not_executed",
    harnessOutcome: "proposal_only_no_final_write",
  },
} as const satisfies Record<
  ResearchOwnerReadAdapterAuthzEligibility,
  {
    fixtureAdapterExercised: boolean
    mockAdapterResult: ResearchOwnerReadAdapterMockResult
    harnessOutcome: ResearchOwnerReadAdapterMockHarnessOutcome
  }
>

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS_BY_FAMILY = {
  "issues": {
    id: "fixture-research-issue-owner-scoped",
    familyId: "issues",
    displayLabel: "Research issue owner-scoped fixture",
    safeSelectedFieldKeys: ["id", "title", "status", "updatedAt", "_count.sources"],
    fixtureState: "owner_scoped_fixture_row",
    redactionPolicy: "No raw notes, source bodies, private payloads, or cross-owner identifiers.",
  },
  "sources": {
    id: "fixture-research-source-owner-scoped",
    familyId: "sources",
    displayLabel: "Research source citation fixture",
    safeSelectedFieldKeys: ["id", "threadId", "title", "sourceType", "authors", "year"],
    fixtureState: "owner_scoped_fixture_row",
    redactionPolicy: "Citation metadata only; no originalText, fileUrl, or private source body.",
  },
  "concepts": {
    id: "fixture-research-concept-owner-scoped",
    familyId: "concepts",
    displayLabel: "Research concept fixture",
    safeSelectedFieldKeys: ["id", "threadId", "name", "aliases", "definition"],
    fixtureState: "owner_scoped_fixture_row",
    redactionPolicy: "Concept summary only; source references stay citation-safe.",
  },
  "writing-projects": {
    id: "fixture-research-writing-project-owner-scoped",
    familyId: "writing-projects",
    displayLabel: "Writing project fixture",
    safeSelectedFieldKeys: ["id", "threadId", "title", "status", "updatedAt"],
    fixtureState: "owner_scoped_fixture_row",
    redactionPolicy: "Project metadata only; no full draft body leaves the fixture.",
  },
  "writing-sections": {
    id: "fixture-research-writing-section-owner-scoped",
    familyId: "writing-sections",
    displayLabel: "Writing section fixture",
    safeSelectedFieldKeys: ["id", "projectId", "title", "order", "status"],
    fixtureState: "owner_scoped_fixture_row",
    redactionPolicy: "Section ordering and status only; full-body text remains blocked.",
  },
  "events": {
    id: "fixture-research-event-blocked",
    familyId: "events",
    displayLabel: "Event blocked marker",
    safeSelectedFieldKeys: ["blockedReason", "ownerScopeRequired"],
    fixtureState: "blocked_fixture_marker",
    redactionPolicy: "No event row is returned until owner scope or privacy split is approved.",
  },
  "people": {
    id: "fixture-research-person-blocked",
    familyId: "people",
    displayLabel: "Person blocked marker",
    safeSelectedFieldKeys: ["blockedReason", "privacySplitRequired"],
    fixtureState: "blocked_fixture_marker",
    redactionPolicy: "No relationship labels, private notes, or owner-specific relevance are returned.",
  },
  "typed-links": {
    id: "fixture-research-typed-links-derived",
    familyId: "typed-links",
    displayLabel: "Typed links derived marker",
    safeSelectedFieldKeys: ["derivedOnly", "requiresAuthorizedEndpoints"],
    fixtureState: "derived_fixture_marker",
    redactionPolicy: "Edges can only be derived after both endpoints pass owner authorization.",
  },
  "graph-projections": {
    id: "fixture-research-graph-derived",
    familyId: "graph-projections",
    displayLabel: "Graph projection derived marker",
    safeSelectedFieldKeys: ["derivedOnly", "requiresAuthorizedFamilies"],
    fixtureState: "derived_fixture_marker",
    redactionPolicy: "Graph output must derive from already-authorized DTO rows only.",
  },
  "readiness-evidence": {
    id: "fixture-research-readiness-evidence-generated",
    familyId: "readiness-evidence",
    displayLabel: "Generated evidence metadata marker",
    safeSelectedFieldKeys: ["path", "status", "generatedAt", "errorsCount"],
    fixtureState: "generated_evidence_marker",
    redactionPolicy: "No raw packet bodies, secrets, auth claims, URLs, or database hosts.",
  },
  "agent-proposals": {
    id: "fixture-research-agent-proposal-review",
    familyId: "agent-proposals",
    displayLabel: "Research agent proposal review marker",
    safeSelectedFieldKeys: ["proposalId", "status", "risk", "humanApprovalRequired"],
    fixtureState: "proposal_queue_marker",
    redactionPolicy: "Owner-visible proposal metadata only; no final write or external sharing.",
  },
} as const satisfies Record<ResearchOwnerReadDtoFamilyId, ResearchOwnerReadAdapterMockFixtureRow>

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS = Object.values(
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS_BY_FAMILY,
)

function buildHarnessProofMessage(
  decision: ResearchOwnerReadAdapterAuthzDecisionRow,
  outcome: ResearchOwnerReadAdapterMockHarnessOutcome,
): string {
  if (outcome === "fixture_adapter_exercised_no_db") {
    return `${decision.id} can exercise the fixture-only adapter after BFF-007 service authz, but real adapter execution and runtime DB reads remain disabled.`
  }

  return `${decision.id} is ${decision.adapterAuthzEligibility}; the harness returns a non-executable marker and refuses adapter execution.`
}

function buildHarnessRow(
  decision: ResearchOwnerReadAdapterAuthzDecisionRow,
): ResearchOwnerReadAdapterMockHarnessRow {
  const policy =
    RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_OUTCOME_POLICY[
      decision.adapterAuthzEligibility
    ]
  const fixture = RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS_BY_FAMILY[decision.id]

  return {
    id: decision.id,
    label: decision.label,
    sourceDecisionEligibility: decision.adapterAuthzEligibility,
    fixtureRowId: fixture.id,
    fixtureAdapterExercised: policy.fixtureAdapterExercised,
    mockAdapterResult: policy.mockAdapterResult,
    harnessOutcome: policy.harnessOutcome,
    proofMessage: buildHarnessProofMessage(decision, policy.harnessOutcome),
    realAdapterExecutionAllowed: false,
    runtimeAdapterExecutionAllowed: false,
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
    publicOutputEnabled: false,
    externalCollaborationEnabled: false,
    externalAgentDatabaseAccessAllowed: false,
    agentFinalWriteAllowed: false,
    externalRegisterable: false,
  }
}

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_ROWS =
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS.map(buildHarnessRow)

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT_ELIGIBLE_FAMILIES =
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_ROWS.filter(
    (row) => row.harnessOutcome === "fixture_adapter_exercised_no_db",
  ).map((row) => row.id)

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_NON_EXECUTABLE_FAMILIES =
  RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_ROWS.filter(
    (row) => row.harnessOutcome !== "fixture_adapter_exercised_no_db",
  ).map((row) => row.id)

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FORBIDDEN_PATTERNS = [
  "Prisma client import",
  "runtime Research DB read",
  "runtime Research DB write",
  "route handler",
  "server action",
  "caller-supplied ownerId",
  "direct threadId-only access",
  "raw adapter payload passthrough",
  "hidden mock-to-formal claim",
  "public output expansion",
  "external collaboration",
  "external agent database access",
  "Research agent final write",
  "external registration enabled",
] as const

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_STOP_CONDITIONS = [
  "Stop if the fixture harness needs a database connection or Prisma client import.",
  "Stop if a blocked, derived, generated-evidence, or proposal-only family attempts adapter execution.",
  "Stop if fixture data is treated as formal runtime data or launch proof.",
  "Stop if Research agent proposals would final-write, publish, call external agents, or become external-registerable.",
] as const

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT = {
  id: "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
  version: "0.1.0",
  status: "ready_for_research_owner_read_adapter_mock_harness_use",
  mode: "adapter_mock_harness_only_no_runtime_db_read",
  adapterAuthzContractId: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.id,
  requiresBff007AuthzDecision: true,
  fixtureRows: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS,
  harnessRows: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_ROWS,
  contractEligibleFamilies:
    RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT_ELIGIBLE_FAMILIES,
  nonExecutableFamilies: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_NON_EXECUTABLE_FAMILIES,
  forbiddenPatterns: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FORBIDDEN_PATTERNS,
  stopConditions: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_STOP_CONDITIONS,
  safety: {
    mockOnlyAdapterHarness: true,
    realAdapterExecutionAllowed: false,
    runtimeAdapterExecutionAllowed: false,
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
    "src/lib/contracts/research-owner-read-adapter-authz.contract.ts",
    "src/lib/contracts/research-owner-read-query-plan.contract.ts",
    "src/lib/services/research-owner-read-dto.service.ts",
    "docs/06_audits-and-reports/RPT-047_loop-157-research-post-loader-gap-review.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  ],
  verification: [
    "node --check scripts/check-research-owner-read-adapter-mock-harness.mjs",
    "pnpm research:read-adapter-mock:check",
    "pnpm research:read-adapter-authz:check",
    "pnpm research:read-query-plan:check",
    "pnpm research:read-dto:check",
    "pnpm research:model:check",
    "pnpm research:readiness:check",
    "pnpm db:validate",
    "pnpm exec tsc --noEmit --pretty false",
    "git diff --check",
  ],
  nextTasks: [
    "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
    "AUTH-005",
    "WORK-009",
  ],
} as const satisfies ResearchOwnerReadAdapterMockHarnessContract

export const RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_SUMMARY = {
  taskId: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.id,
  status: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.status,
  mode: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.mode,
  adapterAuthzContractId:
    RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.adapterAuthzContractId,
  fixtureRowCount: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.fixtureRows.length,
  harnessRowCount: RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.harnessRows.length,
  fixtureAdapterExercisedCount:
    RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT.harnessRows.filter(
      (row) => row.fixtureAdapterExercised,
    ).length,
  nonExecutableCount:
    RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_NON_EXECUTABLE_FAMILIES.length,
  requiresBff007AuthzDecision: true,
  mockOnlyAdapterHarness: true,
  realAdapterExecutionAllowed: false,
  runtimeAdapterExecutionAllowed: false,
  runtimeDbReadEnabled: false,
  runtimeDbWriteEnabled: false,
  publicOutputEnabled: false,
  externalRegisterable: false,
  launchLevelUpgradeClaimed: false,
  nextRecommendedTask:
    "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
} as const
