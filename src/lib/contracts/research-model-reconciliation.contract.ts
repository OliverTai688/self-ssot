export type ResearchModelReconciliationTaskId =
  "RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION"

export type ResearchModelReconciliationMode = "contract_only_no_runtime_db"

export type ResearchModelReconciliationStatus = "ready_for_research_model_reconciliation_use"

export type TransitionalResearchPrismaModel =
  | "ResearchThread"
  | "ResearchSource"
  | "ResearchConcept"
  | "ResearchWritingProject"
  | "ResearchWritingSection"
  | "AIFeedbackRun"
  | "ResearchDigest"
  | "ResearchEvent"
  | "AcademicPerson"

export type CanonicalResearchFamilyId =
  | "issues"
  | "threads"
  | "questions"
  | "sources"
  | "concepts"
  | "ideas"
  | "writing-projects"
  | "writing-sections"
  | "feedback-runs"
  | "events"
  | "people"
  | "links"
  | "graph-projection"
  | "records-audit"
  | "agent-proposals"

export type ResearchTransitionStatus =
  | "canonical_target"
  | "transitional_thread_model"
  | "mock_or_local_state_only"
  | "read_projection_only"
  | "proposal_only"
  | "blocked_until_canonical_model"

export type ResearchModelFamilyMapping = {
  id: CanonicalResearchFamilyId
  label: string
  currentUiType: string
  currentPrismaModel: TransitionalResearchPrismaModel | "none" | "planned"
  targetDto: string
  targetPersistenceShape: string
  transitionStatus: ResearchTransitionStatus
  readBoundary: string
  writeBoundary: string
}

export type ResearchTypedLinkDefinition = {
  id: string
  fromFamilies: readonly CanonicalResearchFamilyId[]
  toFamilies: readonly CanonicalResearchFamilyId[]
  relationTypes: readonly string[]
  requiredMetadata: readonly string[]
  persistenceStatus: "blocked_contract_only"
  unlockCriteria: readonly string[]
}

export type ResearchUnsafeRuntimeAction = {
  id: string
  file: string
  unsafeInputs: readonly string[]
  reason: string
  replacementBoundary: string
}

export type ResearchModelReconciliationContract = {
  id: ResearchModelReconciliationTaskId
  version: "0.1.0"
  status: ResearchModelReconciliationStatus
  mode: ResearchModelReconciliationMode
  currentPrismaState: {
    state: "partial_thread_first_transitional"
    staleStatementSuperseded: "DBS-003 previous no-research-tables statement is superseded"
    transitionalModels: readonly TransitionalResearchPrismaModel[]
    absentCanonicalModels: readonly string[]
  }
  futureOwnerScopedBffReadDtoPath: readonly string[]
  canonicalTransitionFamilies: readonly ResearchModelFamilyMapping[]
  typedLinks: readonly ResearchTypedLinkDefinition[]
  unsafeCurrentActions: readonly ResearchUnsafeRuntimeAction[]
  blockedOperations: readonly string[]
  safety: {
    runtimeDbReadAllowed: false
    runtimeDbWriteAllowed: false
    schemaMigrationAllowed: false
    migrationApplyAllowed: false
    seedChangeAllowed: false
    routeHandlerAllowed: false
    serverActionWriteAllowed: false
    publicOutputAllowed: false
    externalCollaborationAllowed: false
    externalAgentDatabaseAccessAllowed: false
    agentFinalWriteAllowed: false
    externalRegisterable: false
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

export const RESEARCH_MODEL_TRANSITIONAL_PRISMA_MODELS = [
  "ResearchThread",
  "ResearchSource",
  "ResearchConcept",
  "ResearchWritingProject",
  "ResearchWritingSection",
  "AIFeedbackRun",
  "ResearchDigest",
  "ResearchEvent",
  "AcademicPerson",
] as const satisfies readonly TransitionalResearchPrismaModel[]

export const RESEARCH_MODEL_OWNER_SCOPED_BFF_READ_DTO_PATH = [
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "Prisma or approved adapter",
  "UI-safe DTO",
  "Client Component interaction",
] as const

export const RESEARCH_MODEL_CANONICAL_FAMILIES = [
  {
    id: "issues",
    label: "ResearchIssue canonical organizer",
    currentUiType: "ResearchIssue",
    currentPrismaModel: "ResearchThread",
    targetDto: "ResearchIssueReadDto",
    targetPersistenceShape: "typed owner-scoped issue table or explicitly renamed thread mapping",
    transitionStatus: "canonical_target",
    readBoundary: "Read through owner-scoped BFF DTO after requireUser() and service authorization.",
    writeBoundary: "Create/update/archive remain blocked until issue/thread migration impact is approved.",
  },
  {
    id: "threads",
    label: "ResearchThread transitional container",
    currentUiType: "ResearchThread legacy route",
    currentPrismaModel: "ResearchThread",
    targetDto: "ResearchThreadTransitionDto",
    targetPersistenceShape: "transitional bridge to issues, not canonical parent for all resources",
    transitionStatus: "transitional_thread_model",
    readBoundary: "Allowed only as reconciliation/readiness evidence, not as new formal UX vocabulary.",
    writeBoundary: "Do not add new thread-first writes before canonical issue mapping is decided.",
  },
  {
    id: "questions",
    label: "Research questions",
    currentUiType: "ResearchQuestion",
    currentPrismaModel: "none",
    targetDto: "ResearchQuestionReadDto",
    targetPersistenceShape: "owner-scoped questions linked optionally to issues",
    transitionStatus: "mock_or_local_state_only",
    readBoundary: "Read from mock/local state until canonical issue model exists.",
    writeBoundary: "Persistence waits for issue ownership and link/audit policy.",
  },
  {
    id: "sources",
    label: "Research sources",
    currentUiType: "ResearchSource",
    currentPrismaModel: "ResearchSource",
    targetDto: "ResearchSourceReadDto",
    targetPersistenceShape: "free-standing source table with optional typed links to issues, concepts, and writing",
    transitionStatus: "blocked_until_canonical_model",
    readBoundary: "Future reads must filter by owner and return citation-safe DTOs.",
    writeBoundary: "Import/edit/citation writes wait for provenance, source refs, and owner authz.",
  },
  {
    id: "concepts",
    label: "Concepts and claims",
    currentUiType: "ResearchConcept",
    currentPrismaModel: "ResearchConcept",
    targetDto: "ResearchConceptReadDto",
    targetPersistenceShape: "owner-scoped concept table plus typed source definitions",
    transitionStatus: "blocked_until_canonical_model",
    readBoundary: "Future reads must separate user interpretation from cited source definitions.",
    writeBoundary: "Promotion remains proposal-only until provenance and audit refs are defined.",
  },
  {
    id: "ideas",
    label: "Research idea inbox",
    currentUiType: "ResearchIdeaV2",
    currentPrismaModel: "none",
    targetDto: "ResearchIdeaReadDto",
    targetPersistenceShape: "free-standing ideas with optional issue/work/source links",
    transitionStatus: "mock_or_local_state_only",
    readBoundary: "Mock/local only until owner-scoped read contract is implemented.",
    writeBoundary: "Final writes require ownership, source context, and review state.",
  },
  {
    id: "writing-projects",
    label: "Writing projects",
    currentUiType: "ResearchWritingProject",
    currentPrismaModel: "ResearchWritingProject",
    targetDto: "ResearchWritingProjectReadDto",
    targetPersistenceShape: "owner-scoped writing projects with issue/source link edges",
    transitionStatus: "blocked_until_canonical_model",
    readBoundary: "Future reads must avoid leaking drafts or private source notes.",
    writeBoundary: "Draft writes wait for owner authz, audit, and source provenance.",
  },
  {
    id: "writing-sections",
    label: "Writing sections",
    currentUiType: "WritingSection",
    currentPrismaModel: "ResearchWritingSection",
    targetDto: "ResearchWritingSectionReadDto",
    targetPersistenceShape: "ordered child sections of writing projects",
    transitionStatus: "transitional_thread_model",
    readBoundary: "Future reads must be scoped through authorized writing project access.",
    writeBoundary: "Section edits require project ownership and audit before formal use.",
  },
  {
    id: "feedback-runs",
    label: "AI feedback runs",
    currentUiType: "AIFeedbackRun",
    currentPrismaModel: "AIFeedbackRun",
    targetDto: "ResearchFeedbackRunReadDto",
    targetPersistenceShape: "proposal-only AI feedback with target type/id and source refs",
    transitionStatus: "proposal_only",
    readBoundary: "Future reads show AI output as feedback, not final research conclusion.",
    writeBoundary: "Agent final writes remain blocked and require human approval.",
  },
  {
    id: "events",
    label: "Research events and CFPs",
    currentUiType: "ResearchEvent",
    currentPrismaModel: "ResearchEvent",
    targetDto: "ResearchEventReadDto",
    targetPersistenceShape: "owner-scoped or shared event table linked to writing/issues",
    transitionStatus: "blocked_until_canonical_model",
    readBoundary: "Future reads must distinguish general event metadata from private intent notes.",
    writeBoundary: "Event capture waits for audit and sharing boundary decisions.",
  },
  {
    id: "people",
    label: "Academic people and relationships",
    currentUiType: "AcademicPerson",
    currentPrismaModel: "AcademicPerson",
    targetDto: "ResearchPersonReadDto",
    targetPersistenceShape: "relationship-aware person records with privacy labels",
    transitionStatus: "blocked_until_canonical_model",
    readBoundary: "Future reads must keep relationship context owner-only by default.",
    writeBoundary: "Relationship notes need privacy and external-sharing rules before persistence.",
  },
  {
    id: "links",
    label: "Typed research links",
    currentUiType: "ResearchLink",
    currentPrismaModel: "planned",
    targetDto: "ResearchLinkReadDto",
    targetPersistenceShape: "explicit typed link table with source/target families, relation, provenance, and audit refs",
    transitionStatus: "blocked_until_canonical_model",
    readBoundary: "Future graph reads are projections over authorized link rows.",
    writeBoundary: "Runtime persistence is blocked until link metadata and authz are defined.",
  },
  {
    id: "graph-projection",
    label: "Research graph projection",
    currentUiType: "ResearchNetworkGraph",
    currentPrismaModel: "none",
    targetDto: "ResearchGraphProjectionDto",
    targetPersistenceShape: "read projection over authorized objects and typed links",
    transitionStatus: "read_projection_only",
    readBoundary: "Graph is not a write model; it must project owner-authorized DTOs only.",
    writeBoundary: "Graph mutations remain disabled.",
  },
  {
    id: "records-audit",
    label: "Records and audit",
    currentUiType: "readiness evidence and future operating audit",
    currentPrismaModel: "planned",
    targetDto: "ResearchAuditEventReadDto",
    targetPersistenceShape: "append-only operating audit refs for imports, links, writing edits, and agent proposals",
    transitionStatus: "blocked_until_canonical_model",
    readBoundary: "Future reads can summarize audit refs without raw private payloads.",
    writeBoundary: "Audit storage must be approved before formal Research writes.",
  },
  {
    id: "agent-proposals",
    label: "Research agent proposals",
    currentUiType: "Research agent proposal boundary",
    currentPrismaModel: "planned",
    targetDto: "ResearchAgentProposalReadDto",
    targetPersistenceShape: "protected owner-visible proposal queue",
    transitionStatus: "proposal_only",
    readBoundary: "Agent outputs are protected-owner visible and not externally registerable.",
    writeBoundary: "Final writes, external collaboration, and public output require human approval.",
  },
] as const satisfies readonly ResearchModelFamilyMapping[]

export const RESEARCH_MODEL_TYPED_LINKS = [
  {
    id: "evidence-links",
    fromFamilies: ["sources", "concepts", "ideas"],
    toFamilies: ["issues", "concepts", "writing-projects"],
    relationTypes: ["supports", "contradicts", "defines", "mentions", "clarifies", "extends"],
    requiredMetadata: ["ownerId", "sourceRef", "confidence", "createdBy", "auditRef"],
    persistenceStatus: "blocked_contract_only",
    unlockCriteria: ["canonical issue/source model", "owner-scoped authorization", "append-only audit refs"],
  },
  {
    id: "workflow-links",
    fromFamilies: ["ideas", "writing-projects", "writing-sections"],
    toFamilies: ["sources", "events", "issues"],
    relationTypes: ["inspired_by", "used_in", "submitted_to", "belongs_to", "related_to"],
    requiredMetadata: ["ownerId", "targetReason", "createdBy", "auditRef"],
    persistenceStatus: "blocked_contract_only",
    unlockCriteria: ["writing ownership check", "source provenance policy", "reviewable mutation path"],
  },
  {
    id: "relationship-links",
    fromFamilies: ["people", "events", "sources"],
    toFamilies: ["sources", "events", "issues"],
    relationTypes: ["authored_by", "chaired_by", "participates_in", "affiliated_with", "related_to"],
    requiredMetadata: ["ownerId", "privacyLabel", "sourceRef", "auditRef"],
    persistenceStatus: "blocked_contract_only",
    unlockCriteria: ["privacy boundary", "external-sharing policy", "owner approval for relationship notes"],
  },
] as const satisfies readonly ResearchTypedLinkDefinition[]

export const RESEARCH_MODEL_UNSAFE_CURRENT_ACTIONS = [
  {
    id: "research-thread-actions",
    file: "src/lib/actions/research-threads.ts",
    unsafeInputs: ["ownerId", "id"],
    reason:
      "Current actions accept caller-supplied owner or thread identifiers and do not derive owner identity from requireUser().",
    replacementBoundary:
      "Use a server-only Research service that receives profileId from requireUser() and enforces owner-scoped authorization.",
  },
  {
    id: "research-source-concept-actions",
    file: "src/lib/actions/research-sources.ts",
    unsafeInputs: ["threadId", "id"],
    reason:
      "Current source/concept actions are thread-first and cannot prove canonical issue/source/link ownership yet.",
    replacementBoundary:
      "Wrap future reads and writes behind an owner-scoped DTO service after model reconciliation and audit policy.",
  },
  {
    id: "research-writing-actions",
    file: "src/lib/actions/research-writing.ts",
    unsafeInputs: ["threadId", "projectId", "sourceId"],
    reason:
      "Current writing and feedback actions remain tied to thread-first state and do not represent a reviewed Research object network boundary.",
    replacementBoundary:
      "Move formal writing reads to authorized project DTOs and keep feedback runs proposal-only until audit exists.",
  },
  {
    id: "research-event-digest-actions",
    file: "src/lib/actions/research-events.ts",
    unsafeInputs: ["threadId", "id"],
    reason:
      "Current event/digest actions lack the canonical event/person/link privacy and ownership split.",
    replacementBoundary:
      "Require owner-scoped read DTOs and a separate privacy policy before relationship or event writes.",
  },
] as const satisfies readonly ResearchUnsafeRuntimeAction[]

export const RESEARCH_MODEL_RECONCILIATION_CONTRACT = {
  id: "RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION",
  version: "0.1.0",
  status: "ready_for_research_model_reconciliation_use",
  mode: "contract_only_no_runtime_db",
  currentPrismaState: {
    state: "partial_thread_first_transitional",
    staleStatementSuperseded: "DBS-003 previous no-research-tables statement is superseded",
    transitionalModels: RESEARCH_MODEL_TRANSITIONAL_PRISMA_MODELS,
    absentCanonicalModels: [
      "ResearchIssue",
      "ResearchQuestion",
      "ResearchIdeaV2",
      "ResearchLink",
      "ResearchAuditEvent",
      "ResearchAgentProposal",
    ],
  },
  futureOwnerScopedBffReadDtoPath: RESEARCH_MODEL_OWNER_SCOPED_BFF_READ_DTO_PATH,
  canonicalTransitionFamilies: RESEARCH_MODEL_CANONICAL_FAMILIES,
  typedLinks: RESEARCH_MODEL_TYPED_LINKS,
  unsafeCurrentActions: RESEARCH_MODEL_UNSAFE_CURRENT_ACTIONS,
  blockedOperations: [
    "Prisma schema changes",
    "migration draft or apply",
    "seed changes",
    "route handlers",
    "server actions",
    "runtime DB reads or writes",
    "public output",
    "external collaboration",
    "Research agent final writes",
    "external agent direct database access",
    "external registration",
    "launch-level claims",
  ],
  safety: {
    runtimeDbReadAllowed: false,
    runtimeDbWriteAllowed: false,
    schemaMigrationAllowed: false,
    migrationApplyAllowed: false,
    seedChangeAllowed: false,
    routeHandlerAllowed: false,
    serverActionWriteAllowed: false,
    publicOutputAllowed: false,
    externalCollaborationAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    agentFinalWriteAllowed: false,
    externalRegisterable: false,
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
    "docs/02_architecture-and-rules/ARC-006_research-ia-refactor-plan.md",
    "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
    "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md",
    "docs/06_audits-and-reports/RPT-041_loop-144-research-model-reconciliation-gap-review.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    "prisma/schema.prisma",
    "src/types/research.ts",
    "src/lib/actions/research-threads.ts",
    "src/lib/actions/research-sources.ts",
    "src/lib/actions/research-writing.ts",
    "src/lib/actions/research-events.ts",
  ],
  verification: [
    "node --check scripts/check-research-model-reconciliation.mjs",
    "pnpm research:model:check",
    "pnpm research:readiness:check",
    "pnpm module:realdata:check",
    "pnpm module:index:check",
    "pnpm db:validate",
    "pnpm exec tsc --noEmit --pretty false",
  ],
  nextTasks: [
    "LOOP-147-RESEARCH-GAP-REVIEW",
    "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
  ],
} as const satisfies ResearchModelReconciliationContract

export const RESEARCH_MODEL_RECONCILIATION_SUMMARY = {
  taskId: RESEARCH_MODEL_RECONCILIATION_CONTRACT.id,
  status: RESEARCH_MODEL_RECONCILIATION_CONTRACT.status,
  mode: RESEARCH_MODEL_RECONCILIATION_CONTRACT.mode,
  currentPrismaState: RESEARCH_MODEL_RECONCILIATION_CONTRACT.currentPrismaState.state,
  transitionalPrismaModelCount: RESEARCH_MODEL_TRANSITIONAL_PRISMA_MODELS.length,
  canonicalFamilyCount: RESEARCH_MODEL_CANONICAL_FAMILIES.length,
  typedLinkGroupCount: RESEARCH_MODEL_TYPED_LINKS.length,
  unsafeActionGroupCount: RESEARCH_MODEL_UNSAFE_CURRENT_ACTIONS.length,
  futureOwnerScopedBffReadDtoPath:
    RESEARCH_MODEL_RECONCILIATION_CONTRACT.futureOwnerScopedBffReadDtoPath,
  safety: RESEARCH_MODEL_RECONCILIATION_CONTRACT.safety,
  nextTask: RESEARCH_MODEL_RECONCILIATION_CONTRACT.nextTasks[0],
} as const
