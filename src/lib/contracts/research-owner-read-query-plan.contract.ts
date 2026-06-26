import type {
  ResearchOwnerReadDtoFamilyId,
  ResearchOwnerReadinessStateId,
} from "./research-owner-read-dto.contract"

export type ResearchOwnerReadQueryPlanTaskId =
  "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT"

export type ResearchOwnerReadQueryPlanMode = "query_plan_contract_only_no_runtime_db_read"

export type ResearchOwnerReadQueryPlanStatus =
  "ready_for_owner_read_query_plan_contract_use"

export type ResearchOwnerReadQueryAdapterKind =
  | "prisma_transitional_owner_scoped"
  | "blocked_until_owner_scope"
  | "derived_from_authorized_dtos"
  | "generated_evidence_no_db"
  | "proposal_only_no_final_write"

export type ResearchOwnerReadQueryRuntimeState =
  | "query_plan_ready_no_runtime_read"
  | "blocked_owner_scope_missing"
  | "derived_projection_only"
  | "generated_evidence_only"
  | "proposal_only"

export type ResearchOwnerReadQueryModelCandidate =
  | "ResearchThread"
  | "ResearchSource"
  | "ResearchConcept"
  | "ResearchWritingProject"
  | "ResearchWritingSection"
  | "ResearchEvent"
  | "AcademicPerson"
  | "GeneratedEvidence"
  | "none"

export type ResearchOwnerReadQueryPlanRow = {
  id: ResearchOwnerReadDtoFamilyId
  label: string
  targetDto: string
  queryPlanId: string
  adapterKind: ResearchOwnerReadQueryAdapterKind
  runtimeState: ResearchOwnerReadQueryRuntimeState
  modelCandidates: readonly ResearchOwnerReadQueryModelCandidate[]
  ownerScopePredicate: string
  relationPath: string
  selectedFields: readonly string[]
  stableSort: string
  defaultLimit: number
  mapperInput: "authorized_rows_or_explicit_unavailable_state"
  unavailableState: ResearchOwnerReadinessStateId
  auditRef: string
  rejectedUnsafePatterns: readonly string[]
  runtimeDbReadEnabled: false
  runtimeDbWriteEnabled: false
  routeHandlerEnabled: false
  serverActionWriteEnabled: false
}

export type ResearchOwnerReadQueryPlanContract = {
  id: ResearchOwnerReadQueryPlanTaskId
  version: "0.1.0"
  status: ResearchOwnerReadQueryPlanStatus
  mode: ResearchOwnerReadQueryPlanMode
  bffPath: readonly string[]
  queryPlans: readonly ResearchOwnerReadQueryPlanRow[]
  forbiddenPatterns: readonly string[]
  adapterStopConditions: readonly string[]
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

export const RESEARCH_OWNER_READ_QUERY_PLAN_BFF_PATH = [
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "approved adapter",
  "owner-scoped query",
  "mapper",
  "UI-safe DTO",
  "Client Component interaction",
] as const

export const RESEARCH_OWNER_READ_QUERY_PLAN_ROWS = [
  {
    id: "issues",
    label: "Research issues",
    targetDto: "ResearchIssueReadDto",
    queryPlanId: "research-owner-read-query-plan-issues",
    adapterKind: "prisma_transitional_owner_scoped",
    runtimeState: "query_plan_ready_no_runtime_read",
    modelCandidates: ["ResearchThread"],
    ownerScopePredicate:
      "ResearchThread.ownerId equals requireUser().profileId; future ResearchIssue.ownerId must preserve the same owner predicate.",
    relationPath: "ResearchThread.ownerId direct owner field",
    selectedFields: [
      "id",
      "title",
      "description",
      "status",
      "keywords",
      "disciplines",
      "regions",
      "methodType",
      "mainResearchQuestion",
      "workLinkage",
      "createdAt",
      "updatedAt",
      "_count.sources",
      "_count.concepts",
      "_count.writingProjects",
    ],
    stableSort: "updatedAt desc, id asc",
    defaultLimit: 50,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "model-ready-read-unavailable",
    auditRef: "DBS-003 transitional ResearchThread owner field plus RPT-045 round 1.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no direct threadId-only access",
      "no raw Prisma payload passthrough",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "sources",
    label: "Research sources",
    targetDto: "ResearchSourceReadDto",
    queryPlanId: "research-owner-read-query-plan-sources",
    adapterKind: "prisma_transitional_owner_scoped",
    runtimeState: "query_plan_ready_no_runtime_read",
    modelCandidates: ["ResearchSource", "ResearchThread"],
    ownerScopePredicate: "ResearchSource.thread.ownerId equals requireUser().profileId.",
    relationPath: "ResearchSource.thread -> ResearchThread.ownerId",
    selectedFields: [
      "id",
      "threadId",
      "title",
      "sourceType",
      "authors",
      "year",
      "doi",
      "url",
      "institution",
      "region",
      "country",
      "language",
      "reliability",
      "createdAt",
      "updatedAt",
    ],
    stableSort: "updatedAt desc, title asc, id asc",
    defaultLimit: 100,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "partial-transitional-data",
    auditRef: "DBS-003 ResearchSource transitional child relation plus ACC-002 BFF-005.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no source read by threadId without thread ownership authorization",
      "no abstract/originalText/fileUrl/private payload passthrough",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "concepts",
    label: "Concepts and claims",
    targetDto: "ResearchConceptReadDto",
    queryPlanId: "research-owner-read-query-plan-concepts",
    adapterKind: "prisma_transitional_owner_scoped",
    runtimeState: "query_plan_ready_no_runtime_read",
    modelCandidates: ["ResearchConcept", "ResearchThread"],
    ownerScopePredicate: "ResearchConcept.thread.ownerId equals requireUser().profileId.",
    relationPath: "ResearchConcept.thread -> ResearchThread.ownerId",
    selectedFields: [
      "id",
      "threadId",
      "name",
      "aliases",
      "definition",
      "relatedSources",
      "relatedAuthors",
      "confusionPoints",
      "createdAt",
      "updatedAt",
    ],
    stableSort: "updatedAt desc, name asc, id asc",
    defaultLimit: 100,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "partial-transitional-data",
    auditRef: "DBS-003 ResearchConcept transitional child relation plus RPT-045 local code round.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no concept read by id without thread ownership authorization",
      "no raw competingDefinitions or private interpretation passthrough before mapper review",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "writing-projects",
    label: "Writing projects",
    targetDto: "ResearchWritingProjectReadDto",
    queryPlanId: "research-owner-read-query-plan-writing-projects",
    adapterKind: "prisma_transitional_owner_scoped",
    runtimeState: "query_plan_ready_no_runtime_read",
    modelCandidates: ["ResearchWritingProject", "ResearchThread"],
    ownerScopePredicate: "ResearchWritingProject.thread.ownerId equals requireUser().profileId.",
    relationPath: "ResearchWritingProject.thread -> ResearchThread.ownerId",
    selectedFields: [
      "id",
      "threadId",
      "title",
      "writingType",
      "status",
      "targetVenueId",
      "researchQuestion",
      "createdAt",
      "updatedAt",
      "_count.sections",
      "_count.feedbackRuns",
    ],
    stableSort: "updatedAt desc, title asc, id asc",
    defaultLimit: 75,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "partial-transitional-data",
    auditRef:
      "DBS-003 ResearchWritingProject transitional child relation plus ACC-002 mapper acceptance.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no draft read by projectId without thread ownership authorization",
      "no thesisStatement passthrough before owner-private mapper review",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "writing-sections",
    label: "Writing sections",
    targetDto: "ResearchWritingSectionReadDto",
    queryPlanId: "research-owner-read-query-plan-writing-sections",
    adapterKind: "prisma_transitional_owner_scoped",
    runtimeState: "query_plan_ready_no_runtime_read",
    modelCandidates: ["ResearchWritingSection", "ResearchWritingProject", "ResearchThread"],
    ownerScopePredicate:
      "ResearchWritingSection.project.thread.ownerId equals requireUser().profileId.",
    relationPath:
      "ResearchWritingSection.project -> ResearchWritingProject.thread -> ResearchThread.ownerId",
    selectedFields: [
      "id",
      "projectId",
      "title",
      "sectionOrder",
      "linkedSourceIds",
      "body.redactedExcerpt",
      "aiNotes.redactedCount",
    ],
    stableSort: "sectionOrder asc, id asc",
    defaultLimit: 200,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "partial-transitional-data",
    auditRef:
      "DBS-003 ResearchWritingSection child relation plus RPT-045 auth boundary round.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no section read by projectId alone",
      "no full body or aiNotes passthrough before explicit owner-private mapper policy",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "events",
    label: "Research events",
    targetDto: "ResearchEventReadDto",
    queryPlanId: "research-owner-read-query-plan-events",
    adapterKind: "blocked_until_owner_scope",
    runtimeState: "blocked_owner_scope_missing",
    modelCandidates: ["ResearchEvent"],
    ownerScopePredicate:
      "Blocked until relatedThreadIds can be joined against owner-authorized ResearchThread rows or an owner field is approved.",
    relationPath: "ResearchEvent.relatedThreadIds -> ResearchThread.id -> ResearchThread.ownerId",
    selectedFields: [
      "id",
      "name",
      "eventType",
      "field",
      "location",
      "country",
      "isOnline",
      "startDate",
      "endDate",
      "submissionDeadline",
      "registrationDeadline",
      "url",
      "relatedThreadIds.authorizedOnly",
      "fitScore",
      "suggestedParticipationMode",
      "createdAt",
      "updatedAt",
    ],
    stableSort: "submissionDeadline asc nulls last, startDate asc nulls last, name asc, id asc",
    defaultLimit: 75,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "partial-transitional-data",
    auditRef:
      "DBS-003 ResearchEvent lacks direct owner relation; RPT-045 rejects global reads as formal owner data.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no global event/person reads treated as formal owner data",
      "no cfpText or aiFitReason passthrough before owner scope and mapper review",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "people",
    label: "People and researcher relationships",
    targetDto: "ResearchPersonReadDto",
    queryPlanId: "research-owner-read-query-plan-people",
    adapterKind: "blocked_until_owner_scope",
    runtimeState: "blocked_owner_scope_missing",
    modelCandidates: ["AcademicPerson"],
    ownerScopePredicate:
      "Blocked until public person metadata is separated from owner-private relationship notes or an owner relation is approved.",
    relationPath: "AcademicPerson has no owner relation in the current schema",
    selectedFields: [
      "id",
      "name",
      "academicRole",
      "affiliation",
      "country",
      "profileUrl",
      "researchAreas",
      "importantWorks.publicOnly",
      "relatedEvents.authorizedOnly",
      "createdAt",
      "updatedAt",
    ],
    stableSort: "name asc, id asc",
    defaultLimit: 75,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "partial-transitional-data",
    auditRef:
      "DBS-003 AcademicPerson lacks owner relation; RPT-045 requires privacy split before formal owner read.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no global event/person reads treated as formal owner data",
      "no relevanceToMyResearch, conversationAngles, or backgroundSummary passthrough before privacy policy",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "typed-links",
    label: "Typed research links",
    targetDto: "ResearchLinkReadDto",
    queryPlanId: "research-owner-read-query-plan-typed-links",
    adapterKind: "blocked_until_owner_scope",
    runtimeState: "blocked_owner_scope_missing",
    modelCandidates: ["none"],
    ownerScopePredicate:
      "Blocked until a canonical typed-link model proves both source and target objects are owner-authorized.",
    relationPath: "planned ResearchLink.sourceObject -> authorized source plus targetObject -> authorized target",
    selectedFields: [
      "id",
      "sourceFamily",
      "sourceId.authorizedOnly",
      "targetFamily",
      "targetId.authorizedOnly",
      "relationType",
      "confidence",
      "sourceRefs",
      "createdAt",
    ],
    stableSort: "createdAt desc, relationType asc, id asc",
    defaultLimit: 150,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "model-ready-read-unavailable",
    auditRef: "RESEARCH-MODEL-001 typed link contract marks runtime link persistence as blocked.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no source/target id trust without checking both connected objects",
      "no graph edge from mock/local state claimed as formal DB data",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "graph-projections",
    label: "Research graph projections",
    targetDto: "ResearchGraphProjectionDto",
    queryPlanId: "research-owner-read-query-plan-graph-projections",
    adapterKind: "derived_from_authorized_dtos",
    runtimeState: "derived_projection_only",
    modelCandidates: ["none"],
    ownerScopePredicate:
      "Derived only after each included node and edge family has already passed owner authorization.",
    relationPath: "authorized DTO families -> graph node and edge projection",
    selectedFields: [
      "nodes.id",
      "nodes.family",
      "nodes.label",
      "nodes.status",
      "nodes.sourceRefs",
      "edges.id",
      "edges.relationType",
      "edges.sourceId.authorizedOnly",
      "edges.targetId.authorizedOnly",
      "readinessFlags",
    ],
    stableSort: "nodes.label asc, edges.relationType asc",
    defaultLimit: 250,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "empty-no-research-rows",
    auditRef: "ACC-002 graph projection remains a read projection over authorized DTO rows.",
    rejectedUnsafePatterns: [
      "no caller-supplied ownerId",
      "no graph read bypassing per-family authorization",
      "no hidden mock-to-formal graph claim",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "readiness-evidence",
    label: "Readiness evidence",
    targetDto: "ResearchReadinessEvidenceDto",
    queryPlanId: "research-owner-read-query-plan-readiness-evidence",
    adapterKind: "generated_evidence_no_db",
    runtimeState: "generated_evidence_only",
    modelCandidates: ["GeneratedEvidence"],
    ownerScopePredicate: "Owner/admin protected surface only; generated evidence must be no-secret.",
    relationPath: "generated loop reports, acceptance docs, and readiness packets",
    selectedFields: [
      "command",
      "status",
      "relativePath",
      "generatedAt",
      "blockerLabels",
      "nextOwnerAction",
      "noSecretFlags",
    ],
    stableSort: "generatedAt desc, relativePath asc",
    defaultLimit: 50,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "formal-read-disabled",
    auditRef: "Generated loop evidence and ACC-002 acceptance rows; no Research table read.",
    rejectedUnsafePatterns: [
      "no raw packet body passthrough",
      "no secret/env value rendering",
      "no launch-level upgrade claimed from readiness evidence alone",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
  {
    id: "agent-proposals",
    label: "Research agent proposals",
    targetDto: "ResearchAgentProposalReadDto",
    queryPlanId: "research-owner-read-query-plan-agent-proposals",
    adapterKind: "proposal_only_no_final_write",
    runtimeState: "proposal_only",
    modelCandidates: ["none"],
    ownerScopePredicate:
      "Protected-owner visible proposal queue only; no external agent receives database access.",
    relationPath: "internal proposal source refs -> owner review queue",
    selectedFields: [
      "proposalId",
      "sourceRefs",
      "proposedAction",
      "confidence",
      "requiredApproval",
      "rejectionReason",
      "createdAt",
    ],
    stableSort: "createdAt desc, proposalId asc",
    defaultLimit: 50,
    mapperInput: "authorized_rows_or_explicit_unavailable_state",
    unavailableState: "proposal-only-agent-output",
    auditRef: "ARC-028 NANDA gate keeps Research agent proposals protected-owner visible.",
    rejectedUnsafePatterns: [
      "no Research agent final write",
      "no public output or external collaboration",
      "externalRegisterable: false",
    ],
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
  },
] as const satisfies readonly ResearchOwnerReadQueryPlanRow[]

export const RESEARCH_OWNER_READ_QUERY_PLAN_FORBIDDEN_PATTERNS = [
  "caller-supplied ownerId",
  "direct threadId-only access",
  "source read by threadId without thread ownership authorization",
  "section read by projectId alone",
  "global event/person reads treated as formal owner data",
  "raw Prisma payload passthrough",
  "hidden mock-to-formal claim",
  "route handler before service authorization",
  "server action write before owner-scoped read proof",
  "schema or migration change in the query-plan slice",
  "public output expansion",
  "external collaboration",
  "external agent database access",
  "Research agent final write",
  "external registration enabled",
] as const

export const RESEARCH_OWNER_READ_QUERY_PLAN_ADAPTER_STOP_CONDITIONS = [
  "Stop if adapter implementation needs a new owner relation, schema change, or migration.",
  "Stop if runtime reads require caller-supplied ownerId, threadId-only access, or projectId-only access.",
  "Stop if a row would expose abstract/originalText/fileUrl/full body/aiNotes/private relationship fields before mapper policy.",
  "Stop if a page or API would treat global events or people as formal owner data.",
  "Stop if Research agent proposals would final-write, publish, call external agents, or become external-registerable.",
] as const

export const RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT = {
  id: "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
  version: "0.1.0",
  status: "ready_for_owner_read_query_plan_contract_use",
  mode: "query_plan_contract_only_no_runtime_db_read",
  bffPath: RESEARCH_OWNER_READ_QUERY_PLAN_BFF_PATH,
  queryPlans: RESEARCH_OWNER_READ_QUERY_PLAN_ROWS,
  forbiddenPatterns: RESEARCH_OWNER_READ_QUERY_PLAN_FORBIDDEN_PATTERNS,
  adapterStopConditions: RESEARCH_OWNER_READ_QUERY_PLAN_ADAPTER_STOP_CONDITIONS,
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
    "docs/06_audits-and-reports/RPT-045_loop-153-research-post-mapper-gap-review.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    "src/lib/contracts/research-owner-read-dto.contract.ts",
    "src/lib/services/research-owner-read-dto.service.ts",
    "prisma/schema.prisma",
  ],
  verification: [
    "node --check scripts/check-research-owner-read-query-plan.mjs",
    "pnpm research:read-query-plan:check",
    "pnpm research:read-dto:check",
    "pnpm research:model:check",
    "pnpm research:readiness:check",
    "pnpm db:validate",
    "pnpm exec tsc --noEmit --pretty false",
    "git diff --check",
  ],
  nextTasks: [
    "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
    "AUTH-005",
    "WORK-009",
    "LOOP-155-LAUNCH-LEVEL-REVIEW",
  ],
} as const satisfies ResearchOwnerReadQueryPlanContract

export const RESEARCH_OWNER_READ_QUERY_PLAN_SUMMARY = {
  taskId: RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.id,
  familyCount: RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.queryPlans.length,
  status: RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.status,
  mode: RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT.mode,
  ownerIdentitySource: "requireUser()",
  mapperInput: "authorized_rows_or_explicit_unavailable_state",
  runtimeDbReadEnabled: false,
  runtimeDbWriteEnabled: false,
  routeHandlerEnabled: false,
  serverActionWriteEnabled: false,
  externalRegisterable: false,
  launchLevelUpgradeClaimed: false,
} as const
