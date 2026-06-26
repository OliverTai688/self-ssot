export type RealDataModuleKey =
  | "work"
  | "research"
  | "ai-input"
  | "workflow"
  | "life"
  | "finance"
  | "chamber"
  | "company"
  | "client-portal"
  | "agent-team-os"

export type RealDataStage =
  | "mock_only"
  | "seed_demo"
  | "formal_readiness"
  | "db_backed_read"
  | "db_backed_write_draft"
  | "db_backed_write_final"
  | "agent_operated"
  | "external_registerable"
  | "blocked"

export type RealDataRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type PublicExposure = "none" | "protected_owner_only" | "token_gated_fail_closed" | "public_blocked"

export type RealDataMigrationMatrixRow = {
  id: "REALDATA-001"
  moduleKey: RealDataModuleKey
  moduleLabel: string
  currentStage: RealDataStage
  currentSources: readonly string[]
  nextDataObjects: readonly string[]
  bffRouteOrAction: string
  authzBoundary: string
  auditNeed: string
  acceptanceProof: string
  stopCondition: string
  nextTask: string
  risk: RealDataRisk
  publicExposure: PublicExposure
  humanApprovalRequired: boolean
  schemaWriteAllowed: false
  runtimeWriteAllowed: false
  sourceRefs: readonly string[]
}

const SHARED_SOURCE_REFS = [
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md",
  "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
] as const

const STATIC_REAL_DATA_GUARDS = {
  id: "REALDATA-001",
  schemaWriteAllowed: false,
  runtimeWriteAllowed: false,
} as const

export const REAL_DATA_MIGRATION_MATRIX = [
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "work",
    moduleLabel: "Work",
    currentStage: "db_backed_write_draft",
    currentSources: [
      "Prisma Work models: Project, ProjectTask, ProjectNote, ProjectDeliverable",
      "server actions in src/app/actions/work.ts",
      "service boundary in src/lib/services/project.service.ts",
      "disposable proof harness in scripts/work-refresh-proof.mjs",
    ],
    nextDataObjects: [
      "proof-only Work project",
      "proof-only task",
      "proof-only note",
      "proof-only deliverable",
      "derived progress refresh marker",
    ],
    bffRouteOrAction:
      "Keep using Work server actions and project service; run WORK-009 before browser-level WORK-007.",
    authzBoundary:
      "requireUser() plus owner-scoped project service checks before every project-scoped read or write.",
    auditNeed:
      "Append-only operating audit event for project/task/note/deliverable mutations and proof refresh runs.",
    acceptanceProof:
      "WORK-009 proof packet succeeds against an explicitly approved disposable target, then WORK-007 confirms refresh persistence.",
    stopCondition:
      "Stop before any valuable data write when no safe proof target and write confirmation are present.",
    nextTask: "WORK-009",
    risk: "MEDIUM",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: false,
    sourceRefs: [
      ...SHARED_SOURCE_REFS,
      "docs/02_architecture-and-rules/ARC-018_work-module-contract.md",
      "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md",
    ],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "research",
    moduleLabel: "Research",
    currentStage: "mock_only",
    currentSources: [
      "Research UI pages and local mock/state data",
      "Prisma research thread/source/concept/writing models",
      "DBS-003 research model decision",
    ],
    nextDataObjects: [
      "research issue or thread",
      "research source",
      "source-to-concept link",
      "writing section",
      "AI feedback run",
    ],
    bffRouteOrAction:
      "Create a protected Research loader/action contract after reconciling DBS-003 with the current Prisma model names.",
    authzBoundary:
      "Owner-only protected reads and proposal writes until project/team sharing rules are explicitly designed.",
    auditNeed:
      "Capture source import, citation/link changes, writing section updates, and AI feedback provenance.",
    acceptanceProof:
      "Research schema decision is reconciled, then a no-mock protected read contract proves empty/formal states.",
    stopCondition:
      "Stop before migration or write actions if the ResearchIssue versus current thread model boundary remains ambiguous.",
    nextTask: "RESEARCH-001",
    risk: "MEDIUM",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: false,
    sourceRefs: [...SHARED_SOURCE_REFS, "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md"],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "ai-input",
    moduleLabel: "AI Input",
    currentStage: "formal_readiness",
    currentSources: [
      "AI Input formal readiness service",
      "source workflow schema proposal",
      "source adapter and source asset architecture docs",
      "mock/formal mode UI gate",
    ],
    nextDataObjects: [
      "SourceConnection",
      "SourceAsset",
      "AIWorkflowRun",
      "AIWorkItem",
      "DataUnitProposal",
      "ModuleWriteIntent proposal",
    ],
    bffRouteOrAction:
      "Split DATTR-024 into a reviewed protected loader/action contract before persistence or connector runtime.",
    authzBoundary:
      "Owner-only source access, connector consent boundary, and no module final writes without review.",
    auditNeed:
      "Record source workflow runs, source evidence refs, proposal lifecycle, connector consent changes, and write intent decisions.",
    acceptanceProof:
      "Formal mode reads real unavailable/empty states through a BFF contract and never falls back to hidden mock rows.",
    stopCondition:
      "Stop before connector OAuth, external sync, schema migration, or module write intent commit without approval.",
    nextTask: "DATTR-024-SPLIT",
    risk: "HIGH",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: true,
    sourceRefs: [
      ...SHARED_SOURCE_REFS,
      "docs/02_architecture-and-rules/DBS-002_source-workflow-schema-contract.md",
      "docs/02_architecture-and-rules/ARC-027_ai-input-formal-readiness-bff.md",
    ],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "workflow",
    moduleLabel: "Workflow",
    currentStage: "mock_only",
    currentSources: [
      "Workflow UI mock and engine concepts",
      "Prisma WorkflowRule and AgentMessage models",
      "workflow agent message proposal",
    ],
    nextDataObjects: ["WorkflowRule", "WorkflowRun", "RuleExecution", "AgentMessage", "ApprovalRequest"],
    bffRouteOrAction:
      "Define protected workflow run/read BFF and keep execution as dry-run or proposal-only until audit exists.",
    authzBoundary:
      "Owner-only workflow reads; execution proposals require explicit approval and module-specific authorization.",
    auditNeed:
      "Append rule evaluation, run start/finish, agent proposal, approval, rejection, and rollback refs.",
    acceptanceProof:
      "Dry-run workflow proof can list proposed actions and blocked final writes without touching module records.",
    stopCondition:
      "Stop before autonomous execution, scheduled triggers, or cross-module writes without audit and approval gates.",
    nextTask: "AUDIT-OPS-001",
    risk: "HIGH",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: true,
    sourceRefs: [...SHARED_SOURCE_REFS, "docs/05_execution-plans/EXE-002_workflow-agent-message-db-proposal.md"],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "life",
    moduleLabel: "Life",
    currentStage: "mock_only",
    currentSources: [
      "Life FOPS shell",
      "Fitness and life-context mock UI",
      "high-risk private module policy",
    ],
    nextDataObjects: ["PrivateCheckIn", "LifeEvent", "HealthHabit", "MemoryNote", "LifeReviewProposal"],
    bffRouteOrAction:
      "Create an owner-only Life draft schema proposal and read/empty-state BFF before any final private writes.",
    authzBoundary:
      "Owner-only private module access with no public output, no cross-module sharing, and no agent final writes.",
    auditNeed:
      "Minimal private audit for create/update/delete, agent proposals, export, and privacy-boundary changes.",
    acceptanceProof:
      "Protected page can show formal empty/readiness state and blocked final-write controls without mock persistence.",
    stopCondition:
      "Stop before final private writes, health conclusions, external sharing, or agent-written life records without human approval.",
    nextTask: "LIFE-001",
    risk: "CRITICAL",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: true,
    sourceRefs: [...SHARED_SOURCE_REFS, "docs/02_architecture-and-rules/ARC-013_module-map.md"],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "finance",
    moduleLabel: "Finance",
    currentStage: "mock_only",
    currentSources: [
      "Finance FOPS shell",
      "finance draft-only MVP plan",
      "high-risk finance policy",
    ],
    nextDataObjects: ["FinanceDraftEntry", "BudgetCategory", "ReceiptCapture", "CashflowNote", "FinanceReviewIntent"],
    bffRouteOrAction:
      "Draft-only Finance BFF proposal; all final writes stay blocked until reviewed schema and approval flow exist.",
    authzBoundary:
      "Owner-only finance scope; agent outputs are suggestions and cannot silently create final financial records.",
    auditNeed:
      "Append confirmation, source receipt refs, edits, rejection, export, and approval actor for every draft/final transition.",
    acceptanceProof:
      "Finance can show draft-only formal state and human-approval boundary without persisting final records.",
    stopCondition:
      "Stop before bank connector access, final ledger writes, financial advice, public output, or autonomous agent writes.",
    nextTask: "FINANCE-001",
    risk: "CRITICAL",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: true,
    sourceRefs: [...SHARED_SOURCE_REFS, "docs/05_execution-plans/PLN-026_finance-draft-only-mvp.md"],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "chamber",
    moduleLabel: "Chamber",
    currentStage: "mock_only",
    currentSources: ["Chamber FOPS shell", "chamber CRM MVP plan", "relationship and PII risk boundary"],
    nextDataObjects: ["ChamberContact", "Organization", "Interaction", "Opportunity", "FollowUp"],
    bffRouteOrAction:
      "Create a protected Chamber CRM read/draft BFF proposal before importing or editing real relationship data.",
    authzBoundary:
      "Owner-only CRM records with trust-level fields and no external contact sharing by default.",
    auditNeed:
      "Record contact creation, import source, interaction notes, follow-up changes, consent/trust labels, and agent proposals.",
    acceptanceProof:
      "Protected Chamber page can show real-data readiness and explicit PII stop rules before persistence.",
    stopCondition:
      "Stop before importing real contacts, sending messages, exposing PII, or agent-written relationship notes without approval.",
    nextTask: "CHAMBER-001",
    risk: "HIGH",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: true,
    sourceRefs: [...SHARED_SOURCE_REFS, "docs/05_execution-plans/PLN-027_chamber-crm-mvp.md"],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "company",
    moduleLabel: "Company",
    currentStage: "mock_only",
    currentSources: ["Company Strategy FOPS shell", "company strategy MVP plan", "high-risk strategy policy"],
    nextDataObjects: [
      "StrategyInitiative",
      "StrategyNote",
      "CompetitorEntry",
      "PartnershipPipeline",
      "DecisionRecord",
    ],
    bffRouteOrAction:
      "Draft-only protected strategy BFF proposal with owner review before any final strategic record writes.",
    authzBoundary:
      "Owner-only confidential company data; no public output or external agent context package by default.",
    auditNeed:
      "Capture decision source, strategy note changes, proposal approval, rejected alternatives, and external-sharing decisions.",
    acceptanceProof:
      "Company page can distinguish mock strategy examples from formal empty/private state and draft-only write proposals.",
    stopCondition:
      "Stop before final strategy writes, external sharing, competitor/private data import, or agent-authored decisions without approval.",
    nextTask: "COMPANY-001",
    risk: "CRITICAL",
    publicExposure: "protected_owner_only",
    humanApprovalRequired: true,
    sourceRefs: [...SHARED_SOURCE_REFS, "docs/05_execution-plans/PLN-028_company-strategy-mvp.md"],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "client-portal",
    moduleLabel: "Client Portal",
    currentStage: "db_backed_read",
    currentSources: [
      "fail-closed public token route",
      "gated Client Portal service",
      "token schema proposal",
      "public storage policy",
    ],
    nextDataObjects: ["ClientPortalShareToken", "ClientPortalAccessEvent", "ClientVisibleProjectView"],
    bffRouteOrAction:
      "Owner token lifecycle actions plus public token validation route only after schema/action approval.",
    authzBoundary:
      "Public route is token-gated and fail-closed; owner token management stays protected and audited.",
    auditNeed:
      "Append token created, rotated, revoked, accessed, failed lookup, file access, and public DTO render events.",
    acceptanceProof:
      "CLIENT-005/CLIENT-007 prove token lifecycle and public read smoke without exposing internal notes or private files.",
    stopCondition:
      "Stop before token lifecycle writes, public output expansion, file URL rendering, or public smoke without approved schema and target.",
    nextTask: "CLIENT-005",
    risk: "HIGH",
    publicExposure: "token_gated_fail_closed",
    humanApprovalRequired: true,
    sourceRefs: [
      ...SHARED_SOURCE_REFS,
      "docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md",
      "docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md",
      "docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md",
    ],
  },
  {
    ...STATIC_REAL_DATA_GUARDS,
    moduleKey: "agent-team-os",
    moduleLabel: "Agent Team OS",
    currentStage: "formal_readiness",
    currentSources: [
      "generated AgentFacts-lite manifests",
      "agent registry validation proof",
      "owner-only agent operation dry-run contract",
      "protected admin/settings readiness",
    ],
    nextDataObjects: ["AgentProfile", "AgentRun", "AgentApprovalRequest", "AgentMessage", "OperatingAuditEvent"],
    bffRouteOrAction:
      "Owner-only agent registry/operation read contract; keep operation API dry-run until audit and auth scopes exist.",
    authzBoundary:
      "Protected owner/admin visibility only; external registration remains disabled until endpoint, auth, trust, rollback, and approval exist.",
    auditNeed:
      "Append agent operation requested, dry-run generated, proposal approved/rejected, scope used, and registry readiness changes.",
    acceptanceProof:
      "agent:registry:check and agent:op proofs remain no-secret and internal-only; future API must prove auth, scopes, and audit.",
    stopCondition:
      "Stop before runtime endpoint, public registry, external collaboration, direct database access by agents, or external registration.",
    nextTask: "AUDIT-OPS-001",
    risk: "HIGH",
    publicExposure: "public_blocked",
    humanApprovalRequired: true,
    sourceRefs: [
      ...SHARED_SOURCE_REFS,
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
      "docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md",
      "docs/02_architecture-and-rules/SCH-001_agent-team-os-schema-proposal.md",
    ],
  },
] as const satisfies readonly RealDataMigrationMatrixRow[]

export const REAL_DATA_MIGRATION_MATRIX_SUMMARY = {
  id: "REALDATA-001",
  version: "0.1.0",
  moduleCount: REAL_DATA_MIGRATION_MATRIX.length,
  requiredModuleKeys: REAL_DATA_MIGRATION_MATRIX.map((row) => row.moduleKey),
  schemaWrites: false,
  runtimeWrites: false,
  publicOutputExpansion: false,
  nextTaskWhenProofStillBlocked: "AUDIT-OPS-001",
  proofPriority: ["AUTH-005", "WORK-009", "AUDIT-OPS-001"],
  acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  architectureDoc: "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md",
} as const
