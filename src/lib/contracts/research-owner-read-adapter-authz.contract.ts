import {
  RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT,
  RESEARCH_OWNER_READ_QUERY_PLAN_ROWS,
  type ResearchOwnerReadQueryAdapterKind,
  type ResearchOwnerReadQueryPlanRow,
  type ResearchOwnerReadQueryRuntimeState,
} from "./research-owner-read-query-plan.contract"
import type {
  ResearchOwnerReadDtoFamilyId,
  ResearchOwnerReadinessStateId,
} from "./research-owner-read-dto.contract"

export type ResearchOwnerReadAdapterAuthzTaskId =
  "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT"

export type ResearchOwnerReadAdapterAuthzMode =
  "adapter_authz_contract_only_no_runtime_db_read"

export type ResearchOwnerReadAdapterAuthzStatus =
  "ready_for_research_owner_read_adapter_authz_contract_use"

export type ResearchOwnerReadAdapterAuthzEligibility =
  | "contract_eligible_after_service_authz"
  | "blocked_owner_scope_missing"
  | "derived_only"
  | "generated_evidence_only"
  | "proposal_only_no_final_write"

export type ResearchOwnerReadAdapterAuthzDecisionBasis = {
  adapterAuthzEligibility: ResearchOwnerReadAdapterAuthzEligibility
  requiredOwnerIdentitySource: "requireUser().profileId" | "generated evidence path only" | "proposal owner review only"
  ownerScopeProofPath: string
  serviceAuthorizationRule: string
  mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state"
  nextImplementationCondition: string
}

export type ResearchOwnerReadAdapterAuthzDecisionRow = {
  id: ResearchOwnerReadDtoFamilyId
  label: string
  targetDto: string
  queryPlanId: string
  adapterKind: ResearchOwnerReadQueryAdapterKind
  queryRuntimeState: ResearchOwnerReadQueryRuntimeState
  adapterAuthzEligibility: ResearchOwnerReadAdapterAuthzEligibility
  requiredOwnerIdentitySource: ResearchOwnerReadAdapterAuthzDecisionBasis["requiredOwnerIdentitySource"]
  ownerScopeProofPath: string
  serviceAuthorizationRule: string
  deniedUnsafePatterns: readonly string[]
  selectedFieldBoundary: string
  mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state"
  unavailableState: ResearchOwnerReadinessStateId
  auditRef: string
  nextImplementationCondition: string
  adapterExecutionAllowed: false
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

export type ResearchOwnerReadAdapterAuthzContract = {
  id: ResearchOwnerReadAdapterAuthzTaskId
  version: "0.1.0"
  status: ResearchOwnerReadAdapterAuthzStatus
  mode: ResearchOwnerReadAdapterAuthzMode
  queryPlanContractId: typeof RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.id
  requiresBff006LoaderBoundary: true
  bffPath: readonly string[]
  decisions: readonly ResearchOwnerReadAdapterAuthzDecisionRow[]
  blockedFamilies: readonly ResearchOwnerReadDtoFamilyId[]
  derivedOnlyFamilies: readonly ResearchOwnerReadDtoFamilyId[]
  generatedEvidenceFamilies: readonly ResearchOwnerReadDtoFamilyId[]
  proposalOnlyFamilies: readonly ResearchOwnerReadDtoFamilyId[]
  forbiddenPatterns: readonly string[]
  adapterStopConditions: readonly string[]
  safety: {
    adapterExecutionAllowed: false
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

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_BFF_PATH = [
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "adapter authz decision",
  "approved adapter execution decision",
  "owner-scoped query plan",
  "mapper",
  "UI-safe DTO",
  "Client Component interaction",
] as const

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DENIED_PATTERNS = [
  "caller-supplied ownerId",
  "direct threadId-only access",
  "adapter execution before service authorization",
  "raw Prisma payload passthrough",
  "source read by threadId without thread ownership authorization",
  "section read by projectId alone",
  "global event/person reads treated as formal owner data",
  "hidden mock-to-formal claim",
  "route handler before service authorization",
  "server action write before owner-scoped read proof",
  "schema or migration change in the adapter-authz slice",
  "public output expansion",
  "external collaboration",
  "external agent database access",
  "Research agent final write",
  "external registration enabled",
] as const

const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISION_BASIS = {
  "issues": {
    adapterAuthzEligibility: "contract_eligible_after_service_authz",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath: "ResearchThread.ownerId equals requireUser().profileId.",
    serviceAuthorizationRule:
      "Service must authorize the transitional ResearchThread or future ResearchIssue before an adapter can return rows.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Add a no-write adapter mock harness, then a runtime adapter only after requireUser(), service authorization, and selected-field mapper proof pass.",
  },
  "sources": {
    adapterAuthzEligibility: "contract_eligible_after_service_authz",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath: "ResearchSource.thread.ownerId equals requireUser().profileId.",
    serviceAuthorizationRule:
      "Service must join through the owner-authorized thread before source metadata can be mapped.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Adapter may only return citation-safe selected fields after thread ownership and mapper redaction are proven.",
  },
  "concepts": {
    adapterAuthzEligibility: "contract_eligible_after_service_authz",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath: "ResearchConcept.thread.ownerId equals requireUser().profileId.",
    serviceAuthorizationRule:
      "Service must prove concept ownership through the authorized thread before returning concept rows.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Adapter may only return selected concept fields after provenance and owner authorization are checked.",
  },
  "writing-projects": {
    adapterAuthzEligibility: "contract_eligible_after_service_authz",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath: "ResearchWritingProject.thread.ownerId equals requireUser().profileId.",
    serviceAuthorizationRule:
      "Service must authorize the parent thread before writing-project metadata leaves the adapter.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Adapter may only expose project metadata and counts until draft privacy and audit rules are approved.",
  },
  "writing-sections": {
    adapterAuthzEligibility: "contract_eligible_after_service_authz",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath:
      "ResearchWritingSection.project.thread.ownerId equals requireUser().profileId.",
    serviceAuthorizationRule:
      "Service must authorize the parent writing project and thread before any section row is mapped.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Adapter may only expose ordering and redacted excerpts until full-body privacy and audit rules are approved.",
  },
  "events": {
    adapterAuthzEligibility: "blocked_owner_scope_missing",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath:
      "Blocked until ResearchEvent has an owner relation, or relatedThreadIds are joined through owner-authorized ResearchThread rows.",
    serviceAuthorizationRule:
      "Service must not treat global event metadata as formal owner data until owner scope or privacy split is approved.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Add owner relation or public/private event split before any adapter read is selected.",
  },
  "people": {
    adapterAuthzEligibility: "blocked_owner_scope_missing",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath:
      "Blocked until AcademicPerson separates public person metadata from owner-private relationship notes or receives an owner relation.",
    serviceAuthorizationRule:
      "Service must not expose relationship labels, private notes, or owner-specific relevance from a global person row.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Approve a privacy split before any people adapter read becomes runtime-eligible.",
  },
  "typed-links": {
    adapterAuthzEligibility: "derived_only",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath:
      "Derived only after both source and target objects are owner-authorized; current ResearchLink persistence is not approved.",
    serviceAuthorizationRule:
      "Service must verify both linked endpoints before an edge can appear in a UI-safe DTO.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Add link provenance, persistence, and audit rules before typed-link adapter reads are selected.",
  },
  "graph-projections": {
    adapterAuthzEligibility: "derived_only",
    requiredOwnerIdentitySource: "requireUser().profileId",
    ownerScopeProofPath:
      "Projection is derived from already-authorized DTO families and must not query graph data directly.",
    serviceAuthorizationRule:
      "Service must derive graph nodes and edges after all included family rows have passed authorization.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Build from authorized DTO rows only; keep graph mutations disabled.",
  },
  "readiness-evidence": {
    adapterAuthzEligibility: "generated_evidence_only",
    requiredOwnerIdentitySource: "generated evidence path only",
    ownerScopeProofPath: "Whitelisted generated reports and acceptance docs only; no Research table read.",
    serviceAuthorizationRule:
      "Resolver may surface no-secret evidence metadata only, never raw packet bodies or secret values.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Use whitelisted report scanning and no-secret metadata if a readiness resolver is implemented.",
  },
  "agent-proposals": {
    adapterAuthzEligibility: "proposal_only_no_final_write",
    requiredOwnerIdentitySource: "proposal owner review only",
    ownerScopeProofPath:
      "Protected-owner proposal queue only; no external agent receives database access.",
    serviceAuthorizationRule:
      "Research agent proposals may be displayed for owner review but cannot final-write, publish, or externally share.",
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    nextImplementationCondition:
      "Keep proposals protected-owner visible until human approval, audit, and trust policy exist.",
  },
} as const satisfies Record<ResearchOwnerReadDtoFamilyId, ResearchOwnerReadAdapterAuthzDecisionBasis>

function summarizeSelectedFields(row: ResearchOwnerReadQueryPlanRow): string {
  const preview = row.selectedFields.slice(0, 6).join(", ")
  const suffix = row.selectedFields.length > 6 ? ", ..." : ""

  return `${row.selectedFields.length} selected-field markers: ${preview}${suffix}`
}

function buildAdapterAuthzDecision(
  row: ResearchOwnerReadQueryPlanRow,
): ResearchOwnerReadAdapterAuthzDecisionRow {
  const basis = RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISION_BASIS[row.id]

  return {
    id: row.id,
    label: row.label,
    targetDto: row.targetDto,
    queryPlanId: row.queryPlanId,
    adapterKind: row.adapterKind,
    queryRuntimeState: row.runtimeState,
    adapterAuthzEligibility: basis.adapterAuthzEligibility,
    requiredOwnerIdentitySource: basis.requiredOwnerIdentitySource,
    ownerScopeProofPath: basis.ownerScopeProofPath,
    serviceAuthorizationRule: basis.serviceAuthorizationRule,
    deniedUnsafePatterns: [
      ...RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DENIED_PATTERNS,
      ...row.rejectedUnsafePatterns,
    ],
    selectedFieldBoundary: summarizeSelectedFields(row),
    mapperInputBoundary: basis.mapperInputBoundary,
    unavailableState: row.unavailableState,
    auditRef: row.auditRef,
    nextImplementationCondition: basis.nextImplementationCondition,
    adapterExecutionAllowed: false,
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

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS =
  RESEARCH_OWNER_READ_QUERY_PLAN_ROWS.map(buildAdapterAuthzDecision)

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_BLOCKED_FAMILIES =
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS.filter(
    (decision) => decision.adapterAuthzEligibility === "blocked_owner_scope_missing",
  ).map((decision) => decision.id)

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DERIVED_ONLY_FAMILIES =
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS.filter(
    (decision) => decision.adapterAuthzEligibility === "derived_only",
  ).map((decision) => decision.id)

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_GENERATED_EVIDENCE_FAMILIES =
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS.filter(
    (decision) => decision.adapterAuthzEligibility === "generated_evidence_only",
  ).map((decision) => decision.id)

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_PROPOSAL_ONLY_FAMILIES =
  RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS.filter(
    (decision) => decision.adapterAuthzEligibility === "proposal_only_no_final_write",
  ).map((decision) => decision.id)

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_STOP_CONDITIONS = [
  "Stop if adapter execution needs a new owner relation, schema change, or migration.",
  "Stop if runtime reads require caller-supplied ownerId, threadId-only access, projectId-only access, or raw Prisma payload passthrough.",
  "Stop if events or people are treated as formal owner data before owner scope or privacy split is approved.",
  "Stop if typed links or graph projections bypass per-family authorization.",
  "Stop if readiness evidence would expose raw packet bodies, secrets, or launch-level claims.",
  "Stop if Research agent proposals would final-write, publish, call external agents, or become external-registerable.",
] as const

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT = {
  id: "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
  version: "0.1.0",
  status: "ready_for_research_owner_read_adapter_authz_contract_use",
  mode: "adapter_authz_contract_only_no_runtime_db_read",
  queryPlanContractId: RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.id,
  requiresBff006LoaderBoundary: true,
  bffPath: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_BFF_PATH,
  decisions: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS,
  blockedFamilies: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_BLOCKED_FAMILIES,
  derivedOnlyFamilies: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DERIVED_ONLY_FAMILIES,
  generatedEvidenceFamilies: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_GENERATED_EVIDENCE_FAMILIES,
  proposalOnlyFamilies: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_PROPOSAL_ONLY_FAMILIES,
  forbiddenPatterns: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DENIED_PATTERNS,
  adapterStopConditions: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_STOP_CONDITIONS,
  safety: {
    adapterExecutionAllowed: false,
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
    "docs/06_audits-and-reports/RPT-047_loop-157-research-post-loader-gap-review.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    "src/lib/contracts/research-owner-read-query-plan.contract.ts",
    "src/lib/services/research-owner-read-dto.service.ts",
    "prisma/schema.prisma",
  ],
  verification: [
    "node --check scripts/check-research-owner-read-adapter-authz.mjs",
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
    "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
    "AUTH-005",
    "WORK-009",
    "LOOP-160-LAUNCH-LEVEL-REVIEW",
  ],
} as const satisfies ResearchOwnerReadAdapterAuthzContract

export const RESEARCH_OWNER_READ_ADAPTER_AUTHZ_SUMMARY = {
  taskId: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.id,
  status: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.status,
  mode: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.mode,
  queryPlanContractId: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.queryPlanContractId,
  decisionCount: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.decisions.length,
  contractEligibleCount: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT.decisions.filter(
    (decision) => decision.adapterAuthzEligibility === "contract_eligible_after_service_authz",
  ).length,
  blockedOwnerScopeCount: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_BLOCKED_FAMILIES.length,
  derivedOnlyCount: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DERIVED_ONLY_FAMILIES.length,
  generatedEvidenceOnlyCount: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_GENERATED_EVIDENCE_FAMILIES.length,
  proposalOnlyCount: RESEARCH_OWNER_READ_ADAPTER_AUTHZ_PROPOSAL_ONLY_FAMILIES.length,
  ownerIdentitySource: "requireUser().profileId",
  adapterExecutionAllowed: false,
  runtimeDbReadEnabled: false,
  runtimeDbWriteEnabled: false,
  routeHandlerEnabled: false,
  serverActionWriteEnabled: false,
  publicOutputEnabled: false,
  externalRegisterable: false,
  launchLevelUpgradeClaimed: false,
  nextRecommendedTask: "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
} as const
