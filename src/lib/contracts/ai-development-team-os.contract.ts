import type {
  AgentOperationApiApproval,
  AgentOperationApiRisk,
} from "@/lib/contracts/agent-operation-api.contract"
import type { ModuleAgentCommandModule } from "@/lib/contracts/module-agent-command-catalog.contract"

// Bounded Contexts and trust plane type wrappers
export type SharedAgentTrustPlane = {
  trustPlaneId: "urn:trust-plane:personal-os:shared"
  governedContexts: readonly string[]
  registryPosture: "externalRegisterable=false"
  externalRegistrationGateBlocked: true
}

export type ConversationConsentContext = {
  contextId: "urn:context:personal-os:conversation-consent"
  allowedSourceTypes: readonly string[]
  inboxEscalationEnabled: true
}

export type DevelopmentExecutionContext = {
  contextId: "urn:context:personal-os:development-execution"
  allowedWorkspaceTypes: readonly string[]
  runtimeApprovalGateActive: true
}

export type IndependentAIDevelopmentTeamInterface = {
  routePath: "/ai-dev-team"
  visibility: "protected_owner_only"
  modes: readonly string[]
}

export type CrossContextAccessRequest = {
  requestId: string
  sourceContextId: string
  targetContextId: string
  requestUrn: string
  reason: string
  status: "pending" | "granted" | "denied"
}

export type ContextPackageManifest = {
  manifestId: string
  taskId: string
  assetRefs: readonly string[]
  redactionApplied: boolean
}

export type DecisionRuleScope =
  | "module_scoped"
  | "agent_scoped"
  | "global"

export type AuditEvidenceEnvelope = {
  auditEventId: string
  taskUrn: string
  eventFamily: "agent.operation"
  sourceKind: "ai_dev_team"
  evidenceRef: string
}

export type ExternalRegistrationGate = {
  gateId: "urn:gate:personal-os:external-registration"
  externalRegisterable: false
  rule: "Zero external registration allowed by default"
}

export type RuntimeApprovalGate = {
  gateId: "urn:gate:personal-os:runtime-approval"
  mode: "dry_run_intercept" | "human_approval_required"
  shellInterceptActive: true
}

// Bounded context workflow objects
export type DevAgentRole =
  | "product_manager"
  | "architect"
  | "developer"
  | "qa"
  | "reviewer"
  | "memory_manager"

export type DevTeamTaskState =
  | "assigned"
  | "context_requested"
  | "awaiting_owner"
  | "running"
  | "testing"
  | "review_requested"
  | "changes_requested"
  | "completed_no_merge"
  | "memory_candidate"
  | "skill_candidate"
  | "rejected"

export type DevTeamTask = {
  id: string
  title: string
  linkedBacklogTask: string
  targetModule: ModuleAgentCommandModule
  riskLevel: AgentOperationApiRisk
  approvalLevel: AgentOperationApiApproval
  state: DevTeamTaskState
}

export type DevAgentAssignment = {
  assignmentId: string
  taskUrn: string
  assignedRole: DevAgentRole
  tools: readonly string[]
  timeBudgetMs: number
  costBudgetUsd: number
}

export type DevContextRequest = {
  requestId: string
  taskUrn: string
  requesterRole: DevAgentRole
  custodianRole: DevAgentRole
  requestedPath: string
}

export type DevWorktreeSession = {
  sessionId: string
  taskUrn: string
  gitBranch: string
  worktreePath: string
  activeProcessId: number | null
  touchedFiles: readonly string[]
}

export type CodingAgentAdapterPolicy = {
  adapterId: string
  policyName: string
  allowedPaths: readonly string[]
  mode: "read_only" | "plan" | "build"
}

export type DevRunEvidence = {
  evidenceId: string
  runCommands: readonly string[]
  testReportPath: string
  consoleLogsPath: string
  diffPath: string
}

export type DevReviewDecision = {
  decisionId: string
  taskUrn: string
  reviewerRole: DevAgentRole | "owner"
  verdict: "approve" | "reject" | "changes_requested"
  reason: string
}

export type DevExperienceMemory = {
  memoryId: string
  runEvidenceId: string
  keyLearnings: readonly string[]
  status: "draft_candidate" | "approved" | "archived"
}

export type DevSkillCandidate = {
  candidateId: string
  skillLabel: string
  steps: readonly string[]
  targetSkillPath: string
}

// Summary interface representing the complete contract metadata
export interface AIDevelopmentTeamOsContract {
  id: "AIDEVTEAM-002"
  version: "0.1.0"
  status: "contract_only_no_runtime"
  concepts: {
    trustPlane: SharedAgentTrustPlane
    consentContext: ConversationConsentContext
    executionContext: DevelopmentExecutionContext
    interface: IndependentAIDevelopmentTeamInterface
    accessRequest: CrossContextAccessRequest
    manifest: ContextPackageManifest
    ruleScope: DecisionRuleScope
    auditEnvelope: AuditEvidenceEnvelope
    registrationGate: ExternalRegistrationGate
    approvalGate: RuntimeApprovalGate
    task: DevTeamTask
    role: DevAgentRole
    assignment: DevAgentAssignment
    contextRequest: DevContextRequest
    worktreeSession: DevWorktreeSession
    adapterPolicy: CodingAgentAdapterPolicy
    runEvidence: DevRunEvidence
    reviewDecision: DevReviewDecision
    experienceMemory: DevExperienceMemory
    skillCandidate: DevSkillCandidate
  }
  safety: {
    publicEndpointCreated: false
    routeHandlerCreated: false
    serverActionCreated: false
    databaseRead: false
    databaseWrite: false
    providerCall: false
    externalRuntimeEnabled: false
    externalRegistryWrite: false
    autonomousExecution: false
    highRiskFinalWrite: false
    persistedAuditNow: false
    externalAgentDatabaseAccess: false
  }
  sourceRefs: readonly string[]
  rejectedAlternatives: readonly string[]
}

export const AI_DEVELOPMENT_TEAM_OS_CONTRACT: AIDevelopmentTeamOsContract = {
  id: "AIDEVTEAM-002",
  version: "0.1.0",
  status: "contract_only_no_runtime",
  concepts: {
    trustPlane: {
      trustPlaneId: "urn:trust-plane:personal-os:shared",
      governedContexts: ["conversation-consent", "development-execution"],
      registryPosture: "externalRegisterable=false",
      externalRegistrationGateBlocked: true,
    },
    consentContext: {
      contextId: "urn:context:personal-os:conversation-consent",
      allowedSourceTypes: ["chat", "reference_asset"],
      inboxEscalationEnabled: true,
    },
    executionContext: {
      contextId: "urn:context:personal-os:development-execution",
      allowedWorkspaceTypes: ["worktree", "sandbox"],
      runtimeApprovalGateActive: true,
    },
    interface: {
      routePath: "/ai-dev-team",
      visibility: "protected_owner_only",
      modes: ["task_board", "worktree_sessions", "evidence_review"],
    },
    accessRequest: {
      requestId: "cross-context-access-request-template",
      sourceContextId: "urn:context:personal-os:development-execution",
      targetContextId: "urn:context:personal-os:conversation-consent",
      requestUrn: "urn:request:cross-context:access",
      reason: "Needs chat context context package",
      status: "pending",
    },
    manifest: {
      manifestId: "context-package-manifest-template",
      taskId: "task-urn-template",
      assetRefs: ["file-asset-urn-template"],
      redactionApplied: true,
    },
    ruleScope: "module_scoped",
    auditEnvelope: {
      auditEventId: "audit-envelope-template",
      taskUrn: "task-urn-template",
      eventFamily: "agent.operation",
      sourceKind: "ai_dev_team",
      evidenceRef: "docs/2_agent-input/generated/agent-loop/reports/evidence.md",
    },
    registrationGate: {
      gateId: "urn:gate:personal-os:external-registration",
      externalRegisterable: false,
      rule: "Zero external registration allowed by default",
    },
    approvalGate: {
      gateId: "urn:gate:personal-os:runtime-approval",
      mode: "dry_run_intercept",
      shellInterceptActive: true,
    },
    task: {
      id: "task-urn-template",
      title: "Task title template",
      linkedBacklogTask: "AIDEVTEAM-002",
      targetModule: "work",
      riskLevel: "LOW",
      approvalLevel: "AUTO_PROPOSE",
      state: "assigned",
    },
    role: "developer",
    assignment: {
      assignmentId: "assignment-urn-template",
      taskUrn: "task-urn-template",
      assignedRole: "developer",
      tools: ["git", "tsc", "eslint"],
      timeBudgetMs: 3600000,
      costBudgetUsd: 1.0,
    },
    contextRequest: {
      requestId: "context-request-urn-template",
      taskUrn: "task-urn-template",
      requesterRole: "developer",
      custodianRole: "architect",
      requestedPath: "src/lib/contracts/ai-development-team-os.contract.ts",
    },
    worktreeSession: {
      sessionId: "worktree-session-urn-template",
      taskUrn: "task-urn-template",
      gitBranch: "feature/ai-dev-team-contract",
      worktreePath: "worktrees/ai-dev-team-contract",
      activeProcessId: null,
      touchedFiles: ["src/lib/contracts/ai-development-team-os.contract.ts"],
    },
    adapterPolicy: {
      adapterId: "adapter-id-template",
      policyName: "Default dry-run adapter policy",
      allowedPaths: ["src/lib/contracts"],
      mode: "read_only",
    },
    runEvidence: {
      evidenceId: "run-evidence-urn-template",
      runCommands: ["pnpm agent:devteam:check"],
      testReportPath: "reports/test-report.json",
      consoleLogsPath: "reports/console-logs.txt",
      diffPath: "reports/diff.patch",
    },
    reviewDecision: {
      decisionId: "review-decision-urn-template",
      taskUrn: "task-urn-template",
      reviewerRole: "owner",
      verdict: "approve",
      reason: "Static verification of contracts passed",
    },
    experienceMemory: {
      memoryId: "experience-memory-urn-template",
      runEvidenceId: "run-evidence-urn-template",
      keyLearnings: ["Contract-first testing avoids side effects"],
      status: "draft_candidate",
    },
    skillCandidate: {
      candidateId: "skill-candidate-urn-template",
      skillLabel: "Verify contract markers",
      steps: ["Read file", "Search markers", "Emit report"],
      targetSkillPath: ".codex/skills/verify-contract-markers/SKILL.md",
    },
  },
  safety: {
    publicEndpointCreated: false,
    routeHandlerCreated: false,
    serverActionCreated: false,
    databaseRead: false,
    databaseWrite: false,
    providerCall: false,
    externalRuntimeEnabled: false,
    externalRegistryWrite: false,
    autonomousExecution: false,
    highRiskFinalWrite: false,
    persistedAuditNow: false,
    externalAgentDatabaseAccess: false,
  },
  sourceRefs: [
    "docs/07_research-and-design/RES-023_ai-development-team-os-structural-research.md",
    "docs/07_research-and-design/RES-024_shared-team-os-trust-plane-and-independent-ai-development-team-interface-research.md",
    "docs/07_research-and-design/RES-025_github-reference-repositories-for-ai-development-team-os-research.md",
  ],
  rejectedAlternatives: [
    "Duplicating rule-memory and identity structures across contexts",
    "Exposing direct Prisma client handles to developer agents",
    "Enabling external registries or global MCP endpoints autonomously",
  ],
}
