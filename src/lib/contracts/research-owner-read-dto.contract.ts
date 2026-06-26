export type ResearchOwnerReadDtoTaskId = "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT"

export type ResearchOwnerReadDtoMode = "contract_only_no_runtime_db_read"

export type ResearchOwnerReadDtoStatus = "ready_for_owner_scoped_research_read_dto_contract_use"

export type ResearchOwnerReadDtoSurface = "protected_owner_research_read"

export type ResearchOwnerReadDtoFamilyId =
  | "issues"
  | "sources"
  | "concepts"
  | "writing-projects"
  | "writing-sections"
  | "events"
  | "people"
  | "typed-links"
  | "graph-projections"
  | "readiness-evidence"
  | "agent-proposals"

export type ResearchOwnerReadinessStateId =
  | "empty-no-research-rows"
  | "model-ready-read-unavailable"
  | "partial-transitional-data"
  | "formal-read-disabled"
  | "proposal-only-agent-output"

export type ResearchOwnerReadDtoFamily = {
  id: ResearchOwnerReadDtoFamilyId
  label: string
  targetDto: string
  currentPersistence: string
  ownerScope: string
  requiredAuthorization: string
  mapperBoundary: string
  emptyState: ResearchOwnerReadinessStateId
  blockedWrites: string
}

export type ResearchOwnerReadAuthorizationInvariant = {
  id: string
  label: string
  required: true
  evidence: string
  rejectedPattern: string
}

export type ResearchOwnerReadEmptyState = {
  id: ResearchOwnerReadinessStateId
  label: string
  displayMode: "empty" | "readiness" | "partial" | "disabled" | "proposal_only"
  message: string
  nextAction: string
}

export type ResearchOwnerReadBlockedOperation = {
  id: string
  label: string
  reason: string
  unlockCriteria: readonly string[]
}

export type ResearchOwnerReadDtoContract = {
  id: ResearchOwnerReadDtoTaskId
  version: "0.1.0"
  status: ResearchOwnerReadDtoStatus
  mode: ResearchOwnerReadDtoMode
  surface: ResearchOwnerReadDtoSurface
  futureBffPath: readonly string[]
  readFamilies: readonly ResearchOwnerReadDtoFamily[]
  authorizationInvariants: readonly ResearchOwnerReadAuthorizationInvariant[]
  emptyAndReadinessStates: readonly ResearchOwnerReadEmptyState[]
  blockedOperations: readonly ResearchOwnerReadBlockedOperation[]
  clientPayloadRules: readonly string[]
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

export const RESEARCH_OWNER_READ_DTO_BFF_PATH = [
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "Prisma or approved adapter",
  "owner-scoped read query",
  "mapper",
  "UI-safe DTO",
  "Client Component interaction",
] as const

export const RESEARCH_OWNER_READ_DTO_FAMILIES = [
  {
    id: "issues",
    label: "Research issues",
    targetDto: "ResearchIssueReadDto",
    currentPersistence: "ResearchThread transitional bridge until canonical ResearchIssue storage is approved",
    ownerScope: "owner profile id from requireUser(); no caller-supplied ownerId",
    requiredAuthorization: "Research service must prove the transitional thread or canonical issue belongs to the owner.",
    mapperBoundary: "Map only title, status, summary, timestamps, counts, and readiness labels into UI-safe DTO fields.",
    emptyState: "model-ready-read-unavailable",
    blockedWrites: "Create/update/archive stay blocked until issue/thread migration and audit are approved.",
  },
  {
    id: "sources",
    label: "Research sources",
    targetDto: "ResearchSourceReadDto",
    currentPersistence: "ResearchSource transitional table through authorized issue/thread ownership",
    ownerScope: "source reads inherit owner scope from the authorized Research issue/thread or future source owner field.",
    requiredAuthorization: "No source read may use direct threadId-only access without service ownership authorization.",
    mapperBoundary: "Map citation-safe source metadata, processing status, and provenance refs without raw private notes.",
    emptyState: "partial-transitional-data",
    blockedWrites: "Import/edit/citation writes wait for source provenance, audit refs, and owner authorization.",
  },
  {
    id: "concepts",
    label: "Concepts and claims",
    targetDto: "ResearchConceptReadDto",
    currentPersistence: "ResearchConcept transitional table plus local Research object network concepts",
    ownerScope: "concept reads must be filtered through owner-authorized issues, sources, or future owner fields.",
    requiredAuthorization: "Concept reads cannot expose definitions through only caller-supplied ids.",
    mapperBoundary: "Separate user interpretation from source definitions and return provenance-aware DTO fields.",
    emptyState: "partial-transitional-data",
    blockedWrites: "Concept promotion remains proposal-only until provenance and audit refs exist.",
  },
  {
    id: "writing-projects",
    label: "Writing projects",
    targetDto: "ResearchWritingProjectReadDto",
    currentPersistence: "ResearchWritingProject transitional table",
    ownerScope: "writing project reads require owner-authorized parent issue/thread or future owner field.",
    requiredAuthorization: "Service authz must prevent draft leakage across owners.",
    mapperBoundary: "Map project title, writing type, status, target venue label, section count, and safe progress metadata.",
    emptyState: "partial-transitional-data",
    blockedWrites: "Draft writes and target changes require owner authz, source refs, and audit first.",
  },
  {
    id: "writing-sections",
    label: "Writing sections",
    targetDto: "ResearchWritingSectionReadDto",
    currentPersistence: "ResearchWritingSection child rows of transitional writing projects",
    ownerScope: "section reads are authorized through the owner-scoped writing project.",
    requiredAuthorization: "No section read can use projectId alone without project ownership validation.",
    mapperBoundary: "Map order, heading, word count, section type, and redacted excerpt only when safe.",
    emptyState: "partial-transitional-data",
    blockedWrites: "Section edits remain blocked until project ownership and audit are implemented.",
  },
  {
    id: "events",
    label: "Research events",
    targetDto: "ResearchEventReadDto",
    currentPersistence: "ResearchEvent transitional table and UI event concepts",
    ownerScope: "event reads must separate general event metadata from owner-private intent notes.",
    requiredAuthorization: "Private event notes require owner profile authorization before display.",
    mapperBoundary: "Map deadlines, status, location, field tags, and readiness state without private decision notes.",
    emptyState: "partial-transitional-data",
    blockedWrites: "Event capture waits for sharing boundary and append-only audit decisions.",
  },
  {
    id: "people",
    label: "People and researcher relationships",
    targetDto: "ResearchPersonReadDto",
    currentPersistence: "AcademicPerson transitional table and local relationship concepts",
    ownerScope: "relationship context stays owner-only by default.",
    requiredAuthorization: "Relationship labels and private notes require explicit owner authorization.",
    mapperBoundary: "Map public person metadata separately from owner-private relationship notes.",
    emptyState: "partial-transitional-data",
    blockedWrites: "Relationship writes need privacy and external-sharing rules first.",
  },
  {
    id: "typed-links",
    label: "Typed research links",
    targetDto: "ResearchLinkReadDto",
    currentPersistence: "Planned ResearchLink table; current graph edges are local/prototype projections",
    ownerScope: "link reads must be filtered by owner and by authorization of both source and target objects.",
    requiredAuthorization: "No link read may trust source/target ids without checking the connected objects.",
    mapperBoundary: "Map relation type, confidence, source refs, and redacted metadata into read-only edge DTOs.",
    emptyState: "model-ready-read-unavailable",
    blockedWrites: "Runtime link persistence remains blocked until canonical link metadata and audit refs exist.",
  },
  {
    id: "graph-projections",
    label: "Research graph projections",
    targetDto: "ResearchGraphProjectionDto",
    currentPersistence: "Read projection over mock/prototype records and future authorized ResearchLink rows",
    ownerScope: "graph projections are derived only from owner-authorized DTO families.",
    requiredAuthorization: "Graph read cannot bypass per-family authorization or expose hidden nodes.",
    mapperBoundary: "Return node/edge summaries and readiness flags; never raw model rows.",
    emptyState: "empty-no-research-rows",
    blockedWrites: "Graph mutations remain disabled; graph is a projection, not a write model.",
  },
  {
    id: "readiness-evidence",
    label: "Readiness evidence",
    targetDto: "ResearchReadinessEvidenceDto",
    currentPersistence: "Generated loop reports, acceptance docs, and future operating audit refs",
    ownerScope: "readiness evidence is owner/admin visible and no-secret.",
    requiredAuthorization: "Evidence display must not include raw private record payloads or secret values.",
    mapperBoundary: "Map command names, statuses, paths, and blocker labels only.",
    emptyState: "formal-read-disabled",
    blockedWrites: "Readiness evidence cannot mutate launch level or Research records.",
  },
  {
    id: "agent-proposals",
    label: "Research agent proposals",
    targetDto: "ResearchAgentProposalReadDto",
    currentPersistence: "Protected owner-visible proposal concept; no external agent runtime",
    ownerScope: "agent proposal reads stay protected-owner visible.",
    requiredAuthorization: "Research agents cannot final-write, publish, or externally share records from this DTO.",
    mapperBoundary: "Map proposed action, confidence, required approval, source refs, and rejection reason.",
    emptyState: "proposal-only-agent-output",
    blockedWrites: "Agent final writes, public output, and external collaboration require human approval.",
  },
] as const satisfies readonly ResearchOwnerReadDtoFamily[]

export const RESEARCH_OWNER_READ_AUTHORIZATION_INVARIANTS = [
  {
    id: "owner-derived-from-require-user",
    label: "Owner identity is derived by the server",
    required: true,
    evidence:
      "The formal path starts with requireUser(); the service receives the authenticated profile id and never accepts owner identity from the client.",
    rejectedPattern: "no caller-supplied ownerId",
  },
  {
    id: "no-thread-only-read",
    label: "Thread ids are not sufficient authority",
    required: true,
    evidence:
      "ResearchThread is transitional, so every thread or issue read must pass service ownership authorization before mapping.",
    rejectedPattern: "no direct threadId-only access",
  },
  {
    id: "service-layer-authz-before-mapper",
    label: "Authorization precedes mapping",
    required: true,
    evidence:
      "The mapper receives already-authorized records or formal empty/readiness state and cannot perform access checks itself.",
    rejectedPattern: "no Client Component authorization",
  },
  {
    id: "raw-payloads-blocked",
    label: "Client payloads are UI-safe only",
    required: true,
    evidence:
      "Client Components receive DTOs, not raw Prisma model payloads, raw adapter payloads, provider secrets, env values, request cookies or headers, or private IDs.",
    rejectedPattern: "no raw model payload or private identifier passthrough",
  },
  {
    id: "external-agent-db-blocked",
    label: "External agents never receive direct database access",
    required: true,
    evidence:
      "Research agent proposals remain protected-owner visible and proposal-only; scoped context packages are future work.",
    rejectedPattern: "no external agent direct database access",
  },
] as const satisfies readonly ResearchOwnerReadAuthorizationInvariant[]

export const RESEARCH_OWNER_READ_EMPTY_STATES = [
  {
    id: "empty-no-research-rows",
    label: "No Research rows",
    displayMode: "empty",
    message: "Show an honest empty Research state and primary setup action without falling back to mock rows.",
    nextAction: "Offer a protected create/import path only after service authorization and audit are approved.",
  },
  {
    id: "model-ready-read-unavailable",
    label: "Model-ready but read unavailable",
    displayMode: "readiness",
    message: "The model or DTO is defined, but runtime read remains disabled until service authorization exists.",
    nextAction: "Implement a server-only service skeleton before enabling adapter reads.",
  },
  {
    id: "partial-transitional-data",
    label: "Partial transitional data",
    displayMode: "partial",
    message: "Show partial thread-first data as transitional and avoid claiming canonical ResearchIssue operation.",
    nextAction: "Map transitional rows into UI-safe DTOs only after ownership checks.",
  },
  {
    id: "formal-read-disabled",
    label: "Formal read disabled",
    displayMode: "disabled",
    message: "The protected surface may render contract/readiness state while formal DB reads are off.",
    nextAction: "Keep the user on readiness or mock/prototype mode until the BFF service is implemented.",
  },
  {
    id: "proposal-only-agent-output",
    label: "Agent proposal only",
    displayMode: "proposal_only",
    message: "AI output is a review proposal, not a final Research write or public statement.",
    nextAction: "Require owner approval, source refs, and audit before any future final write.",
  },
] as const satisfies readonly ResearchOwnerReadEmptyState[]

export const RESEARCH_OWNER_READ_DTO_CONTRACT = {
  id: "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
  version: "0.1.0",
  status: "ready_for_owner_scoped_research_read_dto_contract_use",
  mode: "contract_only_no_runtime_db_read",
  surface: "protected_owner_research_read",
  futureBffPath: RESEARCH_OWNER_READ_DTO_BFF_PATH,
  readFamilies: RESEARCH_OWNER_READ_DTO_FAMILIES,
  authorizationInvariants: RESEARCH_OWNER_READ_AUTHORIZATION_INVARIANTS,
  emptyAndReadinessStates: RESEARCH_OWNER_READ_EMPTY_STATES,
  blockedOperations: [
    {
      id: "research-runtime-db-read",
      label: "Runtime Research DB read",
      reason: "This slice defines the DTO boundary only; it does not import adapters or query data.",
      unlockCriteria: ["server-only service", "requireUser() owner identity", "service authorization", "DTO mapper"],
    },
    {
      id: "research-runtime-write",
      label: "Runtime Research write",
      reason: "Writes require canonical model, audit, migration review, and explicit task selection.",
      unlockCriteria: ["canonical issue/thread mapping", "append-only audit", "approved migration", "owner approval"],
    },
    {
      id: "research-public-output",
      label: "Research public output",
      reason: "Research records can contain unpublished ideas, source notes, and relationship context.",
      unlockCriteria: ["public-output policy", "redaction check", "explicit approval"],
    },
    {
      id: "research-agent-final-write",
      label: "Research agent final write",
      reason: "Agent proposals remain protected-owner visible and proposal-only.",
      unlockCriteria: ["approval workflow", "audit event", "human approval"],
    },
    {
      id: "external-agent-registration",
      label: "External agent registration",
      reason: "No endpoint, auth scope, trust package, rollback, or public-safety review is approved here.",
      unlockCriteria: ["auth scopes", "trust evidence", "rollback plan", "human approval"],
    },
  ],
  clientPayloadRules: [
    "Client Components receive UI-safe DTOs only.",
    "No raw Prisma model payloads, database clients, provider secrets, env values, request cookies or headers, raw adapter payloads, or private IDs are passed to the client.",
    "Empty and readiness states must be explicit and must not silently fall back to local mock state.",
    "Research agent proposal DTOs stay protected-owner visible, proposal-only, and not externally registerable.",
  ],
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
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
    "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md",
    "docs/06_audits-and-reports/RPT-043_loop-147-research-post-model-gap-review.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    "src/lib/contracts/research-model-reconciliation.contract.ts",
    "src/lib/contracts/research-formal-readiness.contract.ts",
  ],
  verification: [
    "node --check scripts/check-research-owner-read-dto.mjs",
    "pnpm research:read-dto:check",
    "pnpm research:model:check",
    "pnpm research:readiness:check",
    "pnpm db:validate",
    "pnpm exec tsc --noEmit --pretty false",
  ],
  nextTasks: [
    "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE",
    "WORK-009",
    "AUTH-005",
  ],
} as const satisfies ResearchOwnerReadDtoContract

export const RESEARCH_OWNER_READ_DTO_SUMMARY = {
  taskId: RESEARCH_OWNER_READ_DTO_CONTRACT.id,
  status: RESEARCH_OWNER_READ_DTO_CONTRACT.status,
  mode: RESEARCH_OWNER_READ_DTO_CONTRACT.mode,
  surface: RESEARCH_OWNER_READ_DTO_CONTRACT.surface,
  readFamilyCount: RESEARCH_OWNER_READ_DTO_CONTRACT.readFamilies.length,
  authorizationInvariantCount: RESEARCH_OWNER_READ_DTO_CONTRACT.authorizationInvariants.length,
  emptyStateCount: RESEARCH_OWNER_READ_DTO_CONTRACT.emptyAndReadinessStates.length,
  futureBffPath: RESEARCH_OWNER_READ_DTO_CONTRACT.futureBffPath,
  safety: RESEARCH_OWNER_READ_DTO_CONTRACT.safety,
  nandaBoundary: RESEARCH_OWNER_READ_DTO_CONTRACT.nandaBoundary,
  nextTask: RESEARCH_OWNER_READ_DTO_CONTRACT.nextTasks[0],
} as const
