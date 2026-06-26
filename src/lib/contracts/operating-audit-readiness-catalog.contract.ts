export type OperatingAuditReadinessEventFamily =
  | "auth.session"
  | "work.mutation"
  | "ai-input.source-workflow"
  | "agent.operation"
  | "client-portal.public-access"
  | "high-risk.proposal"
  | "admin.operator"

export type OperatingAuditReadinessOperationSurface =
  | "backend_operation_catalog"
  | "module_agent_command_catalog"

export type OperatingAuditReadinessRuntimeState =
  | "ready"
  | "contract_ready"
  | "protected_dry_run_ready"
  | "owner_run"
  | "dry_run_only"
  | "approval_required"
  | "blocked"

export type OperatingAuditReadinessRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type OperatingAuditReadinessApproval =
  | "none"
  | "owner_review"
  | "admin_review"
  | "human_required"
  | "external_approval_required"

export type OperatingAuditReadinessResult =
  | "success"
  | "failure"
  | "blocked"
  | "dry_run"
  | "proposal_created"
  | "approved"
  | "rejected"
  | "rolled_back"

export type OperatingAuditReadinessSourceKind =
  | "server_action"
  | "route_handler"
  | "server_component_loader"
  | "cli_proof"
  | "agent_dry_run"
  | "manual_review"

export type OperatingAuditReadinessCatalogRow = {
  readonly operationId: string
  readonly operationSurface: OperatingAuditReadinessOperationSurface
  readonly label: string
  readonly targetModule: string
  readonly ownerSurface: string
  readonly currentRuntimeState: OperatingAuditReadinessRuntimeState
  readonly eventFamily: OperatingAuditReadinessEventFamily
  readonly relatedEventFamilies: readonly OperatingAuditReadinessEventFamily[]
  readonly eventActions: readonly string[]
  readonly expectedResults: readonly OperatingAuditReadinessResult[]
  readonly sourceKind: OperatingAuditReadinessSourceKind
  readonly riskLevel: OperatingAuditReadinessRisk
  readonly approvalLevel: OperatingAuditReadinessApproval
  readonly verificationCommand: string
  readonly sourceRefs: readonly string[]
  readonly stopCondition: string
  readonly runtimeAuditWriteAllowed: false
  readonly schemaMigrationAllowed: false
  readonly publicOutputAllowedByThisTask: false
  readonly directDatabaseAccessByExternalAgents: false
  readonly externalRegisterable: false
  readonly requiresHumanApproval: boolean
}

export type OperatingAuditReadinessCatalogContract = {
  readonly id: "AUDIT-OPS-002"
  readonly version: "0.1.0"
  readonly status: "ready_for_runtime_mapping_review"
  readonly visibility: "protected_owner_admin_only"
  readonly generatedByLoop: "LOOP-099"
  readonly sourceBasis: readonly string[]
  readonly requiredEventFamilies: readonly OperatingAuditReadinessEventFamily[]
  readonly requiredBackendOperationCount: 13
  readonly requiredModuleAgentCommandCount: 10
  readonly rows: readonly OperatingAuditReadinessCatalogRow[]
  readonly summary: {
    readonly rowCount: number
    readonly backendOperationRows: number
    readonly moduleAgentCommandRows: number
    readonly eventFamilyCount: number
    readonly highRiskRows: number
    readonly humanApprovalRows: number
    readonly runtimeAuditStorageImplemented: false
    readonly schemaMigrationImplemented: false
    readonly routeHandlerAdded: false
    readonly serverActionAdded: false
    readonly databaseWriteAdded: false
    readonly publicOutputAdded: false
    readonly externalRegistrationEnabled: false
    readonly directDatabaseAccessByExternalAgents: false
    readonly nextTask: string
  }
}

export const OPERATING_AUDIT_READINESS_REQUIRED_EVENT_FAMILIES = [
  "auth.session",
  "work.mutation",
  "ai-input.source-workflow",
  "agent.operation",
  "client-portal.public-access",
  "high-risk.proposal",
  "admin.operator",
] as const satisfies readonly OperatingAuditReadinessEventFamily[]

export const OPERATING_AUDIT_READINESS_CATALOG = [
  {
    operationId: "launch.proof",
    operationSurface: "backend_operation_catalog",
    label: "Launch proof packet",
    targetModule: "launch",
    ownerSurface: "cli",
    currentRuntimeState: "owner_run",
    eventFamily: "admin.operator",
    relatedEventFamilies: [],
    eventActions: ["admin.evidence.reviewed", "deployment.marker.reviewed"],
    expectedResults: ["success", "blocked"],
    sourceKind: "cli_proof",
    riskLevel: "LOW",
    approvalLevel: "admin_review",
    verificationCommand: "pnpm launch:proof -- --out <no-secret-proof.json>",
    sourceRefs: ["src/lib/contracts/backend-operation-catalog.contract.ts", "docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md"],
    stopCondition: "Stop before storing provider values, cookies, tokens, database URLs, deployment credentials, or raw proof packet bodies.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "auth.session-proof",
    operationSurface: "backend_operation_catalog",
    label: "Supabase session and Profile proof",
    targetModule: "auth",
    ownerSurface: "login",
    currentRuntimeState: "blocked",
    eventFamily: "auth.session",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["auth.session.proof", "auth.profile.mapping"],
    expectedResults: ["success", "blocked"],
    sourceKind: "cli_proof",
    riskLevel: "MEDIUM",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm auth:proof -- --out <no-secret-auth-proof.json>",
    sourceRefs: ["docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md", "docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md"],
    stopCondition: "Stop if signed-in evidence is missing, unsanitized, or contains cookies, tokens, raw claims, profile ids, or provider payloads.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "work.target-readiness",
    operationSurface: "backend_operation_catalog",
    label: "Work proof target readiness",
    targetModule: "work",
    ownerSurface: "cli",
    currentRuntimeState: "dry_run_only",
    eventFamily: "work.mutation",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["work.refresh.proof"],
    expectedResults: ["dry_run", "blocked", "success"],
    sourceKind: "cli_proof",
    riskLevel: "LOW",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm work:proof-target:check -- --out <readiness.json>",
    sourceRefs: ["docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md", "scripts/check-work-proof-target-readiness.mjs"],
    stopCondition: "Stop before run mode if target is missing, valuable-looking, remote without approval, or write confirmation is absent.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "work.docker-disposable",
    operationSurface: "backend_operation_catalog",
    label: "Docker disposable Work proof runner",
    targetModule: "work",
    ownerSurface: "cli",
    currentRuntimeState: "owner_run",
    eventFamily: "work.mutation",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["work.refresh.proof"],
    expectedResults: ["dry_run", "blocked", "success"],
    sourceKind: "cli_proof",
    riskLevel: "MEDIUM",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm work:proof:docker-disposable -- --json --out <docker-proof.json>",
    sourceRefs: ["scripts/work-proof-docker-disposable.mjs", "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md"],
    stopCondition: "Stop if Docker daemon is unavailable, target is external, proof marker is missing, or cleanup cannot be verified.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "work.server-actions",
    operationSurface: "backend_operation_catalog",
    label: "Work project/task/note/deliverable server actions",
    targetModule: "work",
    ownerSurface: "dashboard",
    currentRuntimeState: "ready",
    eventFamily: "work.mutation",
    relatedEventFamilies: [],
    eventActions: ["work.project.create", "work.task.update", "work.note.create", "work.deliverable.update"],
    expectedResults: ["success", "failure", "blocked", "rolled_back"],
    sourceKind: "server_action",
    riskLevel: "MEDIUM",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm work:source:check",
    sourceRefs: ["src/app/actions/work.ts", "src/lib/services/project.service.ts", "docs/02_architecture-and-rules/ARC-018_work-module-contract.md"],
    stopCondition: "Stop if actions bypass requireUser(), project owner authorization, mapper boundaries, or write against unapproved targets in proof mode.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "work.source-smoke",
    operationSurface: "backend_operation_catalog",
    label: "Work DB source/static smoke checker",
    targetModule: "work",
    ownerSurface: "cli",
    currentRuntimeState: "ready",
    eventFamily: "work.mutation",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["work.refresh.proof"],
    expectedResults: ["success", "blocked"],
    sourceKind: "cli_proof",
    riskLevel: "LOW",
    approvalLevel: "none",
    verificationCommand: "pnpm work:source:check -- --out <work-source.json>",
    sourceRefs: ["scripts/check-work-db-source-smoke.mjs", "src/app/actions/work.ts"],
    stopCondition: "Stop if the checker needs runtime imports, database connections, mock fallback claims, or secret-bearing file output.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "client.portal.gated-loader",
    operationSurface: "backend_operation_catalog",
    label: "Client Portal token-gated loader",
    targetModule: "client-portal",
    ownerSurface: "public-client",
    currentRuntimeState: "approval_required",
    eventFamily: "client-portal.public-access",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["client-portal.public-access.allowed", "client-portal.public-access.denied"],
    expectedResults: ["success", "failure", "blocked"],
    sourceKind: "server_component_loader",
    riskLevel: "HIGH",
    approvalLevel: "human_required",
    verificationCommand: "pnpm interface:smoke:check",
    sourceRefs: ["src/lib/services/client-portal.service.ts", "docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md"],
    stopCondition: "Stop before public payload expansion, token writes, storage URL exposure, or DB token smoke without explicit approval and safe proof.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
  {
    operationId: "agent.operations.dry-run-api",
    operationSurface: "backend_operation_catalog",
    label: "Protected agent operation dry-run API",
    targetModule: "agent-team-os",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "blocked", "proposal_created"],
    sourceKind: "route_handler",
    riskLevel: "MEDIUM",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm agent:api:check",
    sourceRefs: ["docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md", "src/app/api/agent-operations/dry-run/route.ts"],
    stopCondition: "Stop before execute mode, public endpoint exposure, provider calls, DB writes, external agent database access, or external registration.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "module.resource-index-check",
    operationSurface: "backend_operation_catalog",
    label: "Module resource index contract checker",
    targetModule: "module-surfaces",
    ownerSurface: "cli",
    currentRuntimeState: "ready",
    eventFamily: "admin.operator",
    relatedEventFamilies: [],
    eventActions: ["admin.evidence.reviewed"],
    expectedResults: ["success", "blocked"],
    sourceKind: "cli_proof",
    riskLevel: "LOW",
    approvalLevel: "none",
    verificationCommand: "pnpm module:index:check",
    sourceRefs: ["docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md", "scripts/check-module-resource-index-contract.mjs"],
    stopCondition: "Stop if the module index contract requires direct Client Component database imports, raw adapter payloads, or public output expansion.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "module.realdata-check",
    operationSurface: "backend_operation_catalog",
    label: "Per-module real-data migration matrix checker",
    targetModule: "module-surfaces",
    ownerSurface: "cli",
    currentRuntimeState: "ready",
    eventFamily: "admin.operator",
    relatedEventFamilies: ["work.mutation", "ai-input.source-workflow", "client-portal.public-access"],
    eventActions: ["admin.evidence.reviewed"],
    expectedResults: ["success", "blocked"],
    sourceKind: "cli_proof",
    riskLevel: "LOW",
    approvalLevel: "none",
    verificationCommand: "pnpm module:realdata:check",
    sourceRefs: ["docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md", "scripts/check-module-real-data-matrix.mjs"],
    stopCondition: "Stop before schema migration, connector runtime, high-risk final write, public output, or module persistence without approval.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "launch.operator-actions-check",
    operationSurface: "backend_operation_catalog",
    label: "Launch operator action registry checker",
    targetModule: "admin",
    ownerSurface: "cli",
    currentRuntimeState: "ready",
    eventFamily: "admin.operator",
    relatedEventFamilies: [],
    eventActions: ["admin.evidence.reviewed", "settings.permission.proposed"],
    expectedResults: ["success", "blocked", "proposal_created"],
    sourceKind: "cli_proof",
    riskLevel: "LOW",
    approvalLevel: "admin_review",
    verificationCommand: "pnpm launch:actions:check",
    sourceRefs: ["src/lib/contracts/launch-operator-action-registry.contract.ts", "docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md"],
    stopCondition: "Stop before command execution from UI, provider mutation, public route creation, token lifecycle write, or external registration.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "backend.operation-catalog-check",
    operationSurface: "backend_operation_catalog",
    label: "Backend operation catalog checker",
    targetModule: "backend",
    ownerSurface: "cli",
    currentRuntimeState: "contract_ready",
    eventFamily: "admin.operator",
    relatedEventFamilies: [],
    eventActions: ["admin.evidence.reviewed"],
    expectedResults: ["success", "blocked"],
    sourceKind: "cli_proof",
    riskLevel: "LOW",
    approvalLevel: "none",
    verificationCommand: "pnpm backend:ops:check",
    sourceRefs: ["src/lib/contracts/backend-operation-catalog.contract.ts", "scripts/check-backend-operation-catalog.mjs"],
    stopCondition: "Stop if the checker needs runtime imports, public OpenAPI output, secret-bearing strings, DB access, or external registry writes.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "agent.external-registration-approval",
    operationSurface: "backend_operation_catalog",
    label: "External agent registration approval blocker",
    targetModule: "agent-team-os",
    ownerSurface: "admin",
    currentRuntimeState: "blocked",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["high-risk.proposal", "admin.operator"],
    eventActions: ["agent.registry.readiness.checked", "agent.operation.approved"],
    expectedResults: ["blocked", "approved", "rejected"],
    sourceKind: "manual_review",
    riskLevel: "CRITICAL",
    approvalLevel: "external_approval_required",
    verificationCommand: "pnpm agent:api:check",
    sourceRefs: ["docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md", "docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md"],
    stopCondition: "Stop before public endpoint exposure, external NANDA/A2A/MCP registration, external collaboration runtime, or direct database access.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
  {
    operationId: "work.proof.preflight",
    operationSurface: "module_agent_command_catalog",
    label: "WorkAgent proof preflight",
    targetModule: "work",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["work.mutation"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "MEDIUM",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm agent:op -- --operation work.proof.preflight --json",
    sourceRefs: ["src/lib/contracts/module-agent-command-catalog.contract.ts", "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md"],
    stopCondition: "Stop before Work proof writes without WORK-009 target confirmations and cleanup proof.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "research.workspace.plan",
    operationSurface: "module_agent_command_catalog",
    label: "ResearchAgent workspace synthesis plan",
    targetModule: "research",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "LOW",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm agent:op -- --operation research.workspace.plan --json",
    sourceRefs: ["src/lib/contracts/module-agent-command-catalog.contract.ts", "docs/01_product-requirements/PRD-005_situation-driven-prd.md"],
    stopCondition: "Stop before publishing research output, mutating source records, or sending external collaboration packets.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "ai-input.source-workflow.review",
    operationSurface: "module_agent_command_catalog",
    label: "IngestionAgent source workflow readiness review",
    targetModule: "ai-input",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["ai-input.source-workflow", "high-risk.proposal"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "HIGH",
    approvalLevel: "human_required",
    verificationCommand: "pnpm agent:op -- --operation ai-input.source-workflow.review --json",
    sourceRefs: ["docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md", "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md"],
    stopCondition: "Stop before connector runtime, schema migration, external sync, final module writes, or raw provider payload reads.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
  {
    operationId: "workflow.queue.plan",
    operationSurface: "module_agent_command_catalog",
    label: "WorkflowAgent queue and automation boundary plan",
    targetModule: "workflow",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["high-risk.proposal"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "MEDIUM",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm agent:op -- --operation workflow.queue.plan --json",
    sourceRefs: ["docs/02_architecture-and-rules/ARC-023_agent-team-os-operating-contract.md", "docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md"],
    stopCondition: "Stop before autonomous workflow execution, schedule/provider mutation, or cross-module final write.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "life.routine.propose",
    operationSurface: "module_agent_command_catalog",
    label: "LifeAgent routine next-action proposal",
    targetModule: "life",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["high-risk.proposal"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "HIGH",
    approvalLevel: "human_required",
    verificationCommand: "pnpm agent:op -- --operation life.routine.propose --json",
    sourceRefs: ["docs/07_research-and-design/RES-003_interface-completion-operating-surface-research.md", "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md"],
    stopCondition: "Stop before health/life data final writes, external sharing, calendar/provider mutation, or autonomous action.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
  {
    operationId: "finance.review-draft",
    operationSurface: "module_agent_command_catalog",
    label: "FinanceAgent draft review",
    targetModule: "finance",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["high-risk.proposal"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "CRITICAL",
    approvalLevel: "human_required",
    verificationCommand: "pnpm agent:op -- --operation finance.review-draft --json",
    sourceRefs: ["docs/05_execution-plans/PLN-026_finance-draft-only-mvp.md", "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md"],
    stopCondition: "Stop before financial final writes, transactions, external sharing, provider mutation, or automated advice.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
  {
    operationId: "chamber.relationship.plan",
    operationSurface: "module_agent_command_catalog",
    label: "ChamberAgent relationship follow-up plan",
    targetModule: "chamber",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["high-risk.proposal"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "MEDIUM",
    approvalLevel: "owner_review",
    verificationCommand: "pnpm agent:op -- --operation chamber.relationship.plan --json",
    sourceRefs: ["docs/05_execution-plans/PLN-027_chamber-crm-mvp.md", "docs/07_research-and-design/RES-003_interface-completion-operating-surface-research.md"],
    stopCondition: "Stop before sending messages, publishing contact details, or syncing external CRM data.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: false,
  },
  {
    operationId: "company.strategy.review",
    operationSurface: "module_agent_command_catalog",
    label: "CompanyAgent strategy proposal review",
    targetModule: "company",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["high-risk.proposal"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "HIGH",
    approvalLevel: "human_required",
    verificationCommand: "pnpm agent:op -- --operation company.strategy.review --json",
    sourceRefs: ["docs/05_execution-plans/PLN-028_company-strategy-mvp.md", "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md"],
    stopCondition: "Stop before company strategy final writes, public commitments, external sharing, or autonomous decisioning.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
  {
    operationId: "client-portal.visibility.preflight",
    operationSurface: "module_agent_command_catalog",
    label: "ClientPortalAgent visibility boundary preflight",
    targetModule: "client-portal",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["client-portal.public-access", "high-risk.proposal"],
    eventActions: ["agent.operation.dry-run.requested", "agent.operation.proposal.created"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "CRITICAL",
    approvalLevel: "human_required",
    verificationCommand: "pnpm agent:op -- --operation client-portal.visibility.preflight --json",
    sourceRefs: ["docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md", "docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md"],
    stopCondition: "Stop before public payload expansion, token lifecycle writes, file URL exposure, or external sharing.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
  {
    operationId: "agent.ops.describe-contract",
    operationSurface: "module_agent_command_catalog",
    label: "Agent Team OS contract review",
    targetModule: "agent-team-os",
    ownerSurface: "agents",
    currentRuntimeState: "protected_dry_run_ready",
    eventFamily: "agent.operation",
    relatedEventFamilies: ["admin.operator"],
    eventActions: ["agent.operation.dry-run.requested", "agent.registry.readiness.checked"],
    expectedResults: ["dry_run", "proposal_created", "blocked"],
    sourceKind: "agent_dry_run",
    riskLevel: "HIGH",
    approvalLevel: "human_required",
    verificationCommand: "pnpm agent:op -- --operation agent.ops.describe-contract --json",
    sourceRefs: ["docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md", "docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md"],
    stopCondition: "Stop before external registration, public AgentFacts/Agent Card output, direct database access, or autonomous execution.",
    runtimeAuditWriteAllowed: false,
    schemaMigrationAllowed: false,
    publicOutputAllowedByThisTask: false,
    directDatabaseAccessByExternalAgents: false,
    externalRegisterable: false,
    requiresHumanApproval: true,
  },
] as const satisfies readonly OperatingAuditReadinessCatalogRow[]

export const OPERATING_AUDIT_READINESS_CONTRACT: OperatingAuditReadinessCatalogContract = {
  id: "AUDIT-OPS-002",
  version: "0.1.0",
  status: "ready_for_runtime_mapping_review",
  visibility: "protected_owner_admin_only",
  generatedByLoop: "LOOP-099",
  sourceBasis: [
    "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
    "src/lib/contracts/backend-operation-catalog.contract.ts",
    "src/lib/contracts/module-agent-command-catalog.contract.ts",
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    "OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
    "OWASP A09 Logging and Monitoring Failures: https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/",
    "OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/",
  ],
  requiredEventFamilies: OPERATING_AUDIT_READINESS_REQUIRED_EVENT_FAMILIES,
  requiredBackendOperationCount: 13,
  requiredModuleAgentCommandCount: 10,
  rows: OPERATING_AUDIT_READINESS_CATALOG,
  summary: {
    rowCount: OPERATING_AUDIT_READINESS_CATALOG.length,
    backendOperationRows: OPERATING_AUDIT_READINESS_CATALOG.filter(
      (row) => row.operationSurface === "backend_operation_catalog"
    ).length,
    moduleAgentCommandRows: OPERATING_AUDIT_READINESS_CATALOG.filter(
      (row) => row.operationSurface === "module_agent_command_catalog"
    ).length,
    eventFamilyCount: OPERATING_AUDIT_READINESS_REQUIRED_EVENT_FAMILIES.length,
    highRiskRows: OPERATING_AUDIT_READINESS_CATALOG.filter(
      (row) => row.riskLevel === "HIGH" || row.riskLevel === "CRITICAL"
    ).length,
    humanApprovalRows: OPERATING_AUDIT_READINESS_CATALOG.filter((row) => row.requiresHumanApproval).length,
    runtimeAuditStorageImplemented: false,
    schemaMigrationImplemented: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    databaseWriteAdded: false,
    publicOutputAdded: false,
    externalRegistrationEnabled: false,
    directDatabaseAccessByExternalAgents: false,
    nextTask:
      "Loop 100 should run the required launch-level review, then route to AUTH-005, WORK-009, or the shortest persisted audit/storage blocker only when prerequisites are approved.",
  },
}
