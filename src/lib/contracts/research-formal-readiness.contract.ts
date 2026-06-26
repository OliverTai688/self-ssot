export type ResearchFormalReadinessTaskId = "RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF"

export type ResearchFormalReadinessMode = "contract_only_no_db_runtime"

export type ResearchFormalReadinessStatus = "ready_for_formal_readiness_contract_use"

export type ResearchFormalReadinessSurface = "protected_owner_research"

export type ResearchResourceFamilyId =
  | "issues"
  | "sources"
  | "concepts"
  | "writing-projects"
  | "questions"
  | "events"
  | "people"
  | "links"
  | "graph"
  | "agent-proposals"
  | "records-readiness"

export type ResearchReadinessLevel =
  | "mock_local_storage_only"
  | "partial_thread_prisma_model"
  | "formal_readiness_contract"
  | "blocked_until_model_reconciliation"
  | "proposal_only"

export type ResearchResourceFamily = {
  id: ResearchResourceFamilyId
  label: string
  currentSource: string
  formalReadiness: ResearchReadinessLevel
  futureDto: string
  displayState: "available_as_mock_ui" | "available_as_partial_model" | "readiness_only" | "blocked"
  writeBoundary: string
}

export type ResearchStateBoundary = {
  id: string
  label: string
  evidence: string
  risk: "LOW" | "MEDIUM" | "HIGH"
  formalUse: "allowed_for_ui_context_only" | "readiness_only" | "blocked"
  nextSafeAction: string
}

export type ResearchBlockedOperation = {
  id: string
  label: string
  reason: string
  requiredBeforeUnlock: readonly string[]
}

export type ResearchFormalReadinessContract = {
  id: ResearchFormalReadinessTaskId
  version: "0.1.0"
  status: ResearchFormalReadinessStatus
  mode: ResearchFormalReadinessMode
  surface: ResearchFormalReadinessSurface
  currentStateSplit: readonly ResearchStateBoundary[]
  futureBffPath: readonly string[]
  resourceFamilies: readonly ResearchResourceFamily[]
  blockedWriteOperations: readonly ResearchBlockedOperation[]
  uiDisplayContract: {
    readinessLabel: string
    primaryBlockedReason: string
    nextOwnerAction: string
    emptyState: string
    noHiddenMockFallback: true
  }
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
    agentFinalWriteAllowed: false
    externalRegisterable: false
    hiddenMockToFormalClaimAllowed: false
    launchLevelUpgradeClaimed: false
  }
  nandaBoundary: {
    agentSurfaceType: "protected_owner_visible_proposal_queue_only"
    externalRegisterable: false
    protocolStatus: "internal_readiness_only"
    approvalRequiredBeforeExternalUse: true
  }
  sourceRefs: readonly string[]
  verification: readonly string[]
  nextTasks: readonly string[]
}

const FUTURE_BFF_PATH = [
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "Prisma or approved adapter",
  "UI-safe DTO",
  "Client Component interaction",
] as const

export const RESEARCH_FORMAL_READINESS_CONTRACT = {
  id: "RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF",
  version: "0.1.0",
  status: "ready_for_formal_readiness_contract_use",
  mode: "contract_only_no_db_runtime",
  surface: "protected_owner_research",
  currentStateSplit: [
    {
      id: "research-ui-context",
      label: "useResearch() localStorage/mock UI state",
      evidence:
        "Current Research pages and graph interactions are operable through useResearch() and local prototype state.",
      risk: "MEDIUM",
      formalUse: "allowed_for_ui_context_only",
      nextSafeAction: "Keep rendering prototype state as mock/prototype until the formal read DTO exists.",
    },
    {
      id: "research-prisma-thread-model",
      label: "partial thread-first Prisma Research models",
      evidence:
        "Current schema includes ResearchThread, ResearchSource, ResearchConcept, ResearchWritingProject, sections, feedback runs, digests, and events.",
      risk: "MEDIUM",
      formalUse: "readiness_only",
      nextSafeAction:
        "Reconcile the ResearchIssue versus ResearchThread model boundary before any migration or write expansion.",
    },
    {
      id: "research-actions-unsafe-formal",
      label: "existing unsafe-for-formal server actions",
      evidence:
        "Existing Research actions accept caller-supplied owner or thread identifiers and are not the formal owner-scoped BFF boundary.",
      risk: "HIGH",
      formalUse: "blocked",
      nextSafeAction:
        "Replace formal reads with a service that derives owner identity from requireUser() and performs service-layer authorization.",
    },
    {
      id: "research-model-boundary",
      label: "unresolved ResearchIssue versus ResearchThread model boundary",
      evidence:
        "DBS-003 prefers typed issue/source/link tables while the current runtime schema is thread-first.",
      risk: "HIGH",
      formalUse: "blocked",
      nextSafeAction: "Create a model reconciliation decision before enabling formal writes or graph/link promotion.",
    },
  ],
  futureBffPath: FUTURE_BFF_PATH,
  resourceFamilies: [
    {
      id: "issues",
      label: "Research issues",
      currentSource: "useResearch() issue list and partial ResearchThread schema",
      formalReadiness: "blocked_until_model_reconciliation",
      futureDto: "ResearchIssueReadDto",
      displayState: "readiness_only",
      writeBoundary: "Create/update/archive remain blocked until issue/thread reconciliation and owner authz exist.",
    },
    {
      id: "sources",
      label: "Research sources",
      currentSource: "useResearch() source list and partial ResearchSource schema",
      formalReadiness: "partial_thread_prisma_model",
      futureDto: "ResearchSourceReadDto",
      displayState: "available_as_partial_model",
      writeBoundary: "Import, edit, and citation writes stay blocked before approved source service authorization.",
    },
    {
      id: "concepts",
      label: "Concepts and claims",
      currentSource: "useResearch() concept graph and partial ResearchConcept schema",
      formalReadiness: "partial_thread_prisma_model",
      futureDto: "ResearchConceptReadDto",
      displayState: "available_as_partial_model",
      writeBoundary: "Concept promotion stays proposal-only until provenance and audit refs exist.",
    },
    {
      id: "writing-projects",
      label: "Writing projects",
      currentSource: "Research writing UI and partial ResearchWritingProject schema",
      formalReadiness: "partial_thread_prisma_model",
      futureDto: "ResearchWritingProjectReadDto",
      displayState: "available_as_partial_model",
      writeBoundary: "Section writes and feedback runs require owner authz, source refs, and audit policy first.",
    },
    {
      id: "questions",
      label: "Research questions",
      currentSource: "useResearch() question prompts and issue detail UI",
      formalReadiness: "mock_local_storage_only",
      futureDto: "ResearchQuestionReadDto",
      displayState: "available_as_mock_ui",
      writeBoundary: "Question persistence waits for the canonical issue model.",
    },
    {
      id: "events",
      label: "Research events",
      currentSource: "partial ResearchEvent-style schema and UI timeline concepts",
      formalReadiness: "partial_thread_prisma_model",
      futureDto: "ResearchEventReadDto",
      displayState: "available_as_partial_model",
      writeBoundary: "Event capture waits for append-only audit and source provenance decisions.",
    },
    {
      id: "people",
      label: "People and researcher relationships",
      currentSource: "useResearch() people/reference UI concepts",
      formalReadiness: "mock_local_storage_only",
      futureDto: "ResearchPersonReadDto",
      displayState: "available_as_mock_ui",
      writeBoundary: "Relationship writes need explicit privacy and sharing rules first.",
    },
    {
      id: "links",
      label: "Typed research links",
      currentSource: "DBS-003 planned typed links and current UI graph edges",
      formalReadiness: "blocked_until_model_reconciliation",
      futureDto: "ResearchLinkReadDto",
      displayState: "blocked",
      writeBoundary: "Graph/link promotion remains blocked until canonical link tables and audit refs exist.",
    },
    {
      id: "graph",
      label: "Research graph",
      currentSource: "useResearch() graph projection over mock/prototype records",
      formalReadiness: "mock_local_storage_only",
      futureDto: "ResearchGraphReadDto",
      displayState: "available_as_mock_ui",
      writeBoundary: "Graph mutations stay disabled; future graph is a read projection over authorized resources.",
    },
    {
      id: "agent-proposals",
      label: "Research agent proposals",
      currentSource: "protected owner-only proposal concept; no external agent runtime",
      formalReadiness: "proposal_only",
      futureDto: "ResearchAgentProposalReadDto",
      displayState: "readiness_only",
      writeBoundary: "AI agent outputs remain review proposals and cannot final-write Research records.",
    },
    {
      id: "records-readiness",
      label: "Records and readiness evidence",
      currentSource: "generated loop evidence, formal docs, and future operating audit refs",
      formalReadiness: "formal_readiness_contract",
      futureDto: "ResearchReadinessEvidenceDto",
      displayState: "readiness_only",
      writeBoundary: "Readiness evidence is read-only in this slice and cannot mutate launch level.",
    },
  ],
  blockedWriteOperations: [
    {
      id: "research-schema-migration",
      label: "Schema migration or model promotion",
      reason: "ResearchIssue versus ResearchThread is unresolved.",
      requiredBeforeUnlock: ["model reconciliation decision", "migration impact review", "owner approval"],
    },
    {
      id: "research-runtime-read-write",
      label: "Runtime DB reads or writes",
      reason: "The formal BFF path is specified but not implemented in this contract-only slice.",
      requiredBeforeUnlock: ["requireUser() owner identity", "Research service authorization", "UI-safe DTO mapper"],
    },
    {
      id: "research-graph-link-promotion",
      label: "Graph/link promotion",
      reason: "Typed links and provenance/audit rules are not finalized.",
      requiredBeforeUnlock: ["canonical link model", "source provenance refs", "append-only audit policy"],
    },
    {
      id: "research-agent-final-write",
      label: "Research AI agent final writes",
      reason: "Agent proposals are owner-review-only and no external collaboration is approved.",
      requiredBeforeUnlock: ["proposal review workflow", "approval audit", "human approval"],
    },
    {
      id: "research-public-output",
      label: "Public output or external collaboration",
      reason: "Research material may include private sources, unpublished ideas, and relationship data.",
      requiredBeforeUnlock: ["public-output policy", "redaction checks", "explicit approval"],
    },
  ],
  uiDisplayContract: {
    readinessLabel: "Research formal readiness contract ready",
    primaryBlockedReason: "Formal DB mode waits for issue/thread model reconciliation and owner-scoped BFF authz.",
    nextOwnerAction:
      "Review the readiness surface, then choose whether to implement the protected Research read surface or reconcile the model.",
    emptyState: "Show formal empty/readiness state without silently falling back to localStorage mock records.",
    noHiddenMockFallback: true,
  },
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
    agentFinalWriteAllowed: false,
    externalRegisterable: false,
    hiddenMockToFormalClaimAllowed: false,
    launchLevelUpgradeClaimed: false,
  },
  nandaBoundary: {
    agentSurfaceType: "protected_owner_visible_proposal_queue_only",
    externalRegisterable: false,
    protocolStatus: "internal_readiness_only",
    approvalRequiredBeforeExternalUse: true,
  },
  sourceRefs: [
    "docs/01_product-requirements/PRD-005_situation-driven-prd.md",
    "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
    "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md",
    "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
    "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
    "docs/06_audits-and-reports/RPT-040_loop-141-research-realdata-gap-review.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  ],
  verification: [
    "node --check scripts/check-research-formal-readiness.mjs",
    "pnpm research:readiness:check",
    "pnpm module:realdata:check",
    "pnpm module:index:check",
    "pnpm db:validate",
    "pnpm exec tsc --noEmit --pretty false",
  ],
  nextTasks: [
    "RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE",
    "RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION",
  ],
} as const satisfies ResearchFormalReadinessContract

export const RESEARCH_FORMAL_READINESS_SUMMARY = {
  taskId: RESEARCH_FORMAL_READINESS_CONTRACT.id,
  status: RESEARCH_FORMAL_READINESS_CONTRACT.status,
  mode: RESEARCH_FORMAL_READINESS_CONTRACT.mode,
  resourceFamilyCount: RESEARCH_FORMAL_READINESS_CONTRACT.resourceFamilies.length,
  blockedWriteCount: RESEARCH_FORMAL_READINESS_CONTRACT.blockedWriteOperations.length,
  futureBffPath: RESEARCH_FORMAL_READINESS_CONTRACT.futureBffPath,
  nextTask: RESEARCH_FORMAL_READINESS_CONTRACT.nextTasks[0],
  safety: RESEARCH_FORMAL_READINESS_CONTRACT.safety,
} as const
