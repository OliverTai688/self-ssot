import type {
  AgentOperationApiApproval,
  AgentOperationApiOperation,
  AgentOperationApiRisk,
} from "@/lib/contracts/agent-operation-api.contract"

export type ModuleAgentCommandModule =
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

export type ModuleAgentCommand = {
  id: string
  label: string
  moduleKey: ModuleAgentCommandModule
  ownerAgent: string
  targetModule: string
  riskLevel: AgentOperationApiRisk
  approvalLevel: AgentOperationApiApproval
  dataVisibilityLevel: string
  scopes: readonly string[]
  allowedModes: readonly ["dry_run"]
  uiEntrySurface: string
  proposalOutputs: readonly string[]
  blockedWrites: readonly string[]
  sourceRefs: readonly string[]
  httpDryRunPayload: {
    operationId: string
    mode: "dry_run"
    targetModule: string
  }
  cliDryRunCommand: string
}

export const MODULE_AGENT_COMMAND_CATALOG = [
  {
    id: "work.proof.preflight",
    label: "Plan Work proof preflight",
    moduleKey: "work",
    ownerAgent: "WorkAgent",
    targetModule: "work",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-proof-metadata",
    scopes: ["work:proof:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/work agent workspace",
    proposalOutputs: ["proof preflight checklist", "safe target readiness notes", "next proof command"],
    blockedWrites: [
      "DB write without WORK-009 confirmations",
      "valuable database mutation",
      "browser write smoke without approval",
    ],
    sourceRefs: [
      "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md",
      "scripts/work-refresh-proof.mjs",
    ],
    httpDryRunPayload: {
      operationId: "work.proof.preflight",
      mode: "dry_run",
      targetModule: "work",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation work.proof.preflight --json",
  },
  {
    id: "research.workspace.plan",
    label: "Plan Research workspace synthesis",
    moduleKey: "research",
    ownerAgent: "ResearchAgent",
    targetModule: "research",
    riskLevel: "LOW",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-local-prototype-state",
    scopes: ["research:workspace:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/research agent workspace",
    proposalOutputs: ["source clustering plan", "issue synthesis outline", "writing next-step proposal"],
    blockedWrites: ["publish research output", "mutate source records", "send external collaboration packets"],
    sourceRefs: [
      "docs/01_product-requirements/PRD-005_situation-driven-prd.md",
      "docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md",
    ],
    httpDryRunPayload: {
      operationId: "research.workspace.plan",
      mode: "dry_run",
      targetModule: "research",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation research.workspace.plan --json",
  },
  {
    id: "ai-input.source-workflow.review",
    label: "Review AI Input source workflow readiness",
    moduleKey: "ai-input",
    ownerAgent: "IngestionAgent",
    targetModule: "ai-input",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "repo-docs-and-source-workflow-readiness",
    scopes: ["ai-input:source-workflow:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/ai-input formal source workflow agent panel",
    proposalOutputs: ["connector boundary review", "proposal action checklist", "proof target readiness notes"],
    blockedWrites: [
      "connector OAuth or webhook runtime",
      "source workflow DB write",
      "provider payload read",
      "external agent context package",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
      "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
    ],
    httpDryRunPayload: {
      operationId: "ai-input.source-workflow.review",
      mode: "dry_run",
      targetModule: "ai-input",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation ai-input.source-workflow.review --json",
  },
  {
    id: "workflow.queue.plan",
    label: "Plan Workflow queue and automation boundary",
    moduleKey: "workflow",
    ownerAgent: "WorkflowAgent",
    targetModule: "workflow",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-workflow-prototype-state",
    scopes: ["workflow:queue:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/workflow agent workspace",
    proposalOutputs: ["automation sequence proposal", "task routing notes", "approval lane checklist"],
    blockedWrites: ["autonomous workflow execution", "schedule/provider mutation", "cross-module final write"],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-023_agent-team-os-operating-contract.md",
      "docs/06_audits-and-reports/RPT-011_loop-68-research-gap-review.md",
    ],
    httpDryRunPayload: {
      operationId: "workflow.queue.plan",
      mode: "dry_run",
      targetModule: "workflow",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation workflow.queue.plan --json",
  },
  {
    id: "life.routine.propose",
    label: "Propose Life routine next action",
    moduleKey: "life",
    ownerAgent: "LifeAgent",
    targetModule: "life",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-life-context",
    scopes: ["life:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/life agent proposals tab",
    proposalOutputs: ["routine proposal", "habit review notes", "manual approval checklist"],
    blockedWrites: ["health or life data final write", "external sharing", "calendar/provider mutation"],
    sourceRefs: [
      "docs/07_research-and-design/RES-003_interface-completion-operating-surface-research.md",
      "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md",
    ],
    httpDryRunPayload: {
      operationId: "life.routine.propose",
      mode: "dry_run",
      targetModule: "life",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation life.routine.propose --json",
  },
  {
    id: "finance.review-draft",
    label: "Review Finance draft and risk boundary",
    moduleKey: "finance",
    ownerAgent: "FinanceAgent",
    targetModule: "finance",
    riskLevel: "CRITICAL",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-finance-context",
    scopes: ["finance:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/finance agent proposals tab",
    proposalOutputs: ["finance draft review", "risk note", "manual approval checklist"],
    blockedWrites: ["financial final write", "transaction", "external sharing", "provider mutation"],
    sourceRefs: [
      "docs/05_execution-plans/PLN-026_finance-draft-only-mvp.md",
      "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md",
    ],
    httpDryRunPayload: {
      operationId: "finance.review-draft",
      mode: "dry_run",
      targetModule: "finance",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation finance.review-draft --json",
  },
  {
    id: "chamber.relationship.plan",
    label: "Plan Chamber relationship follow-up",
    moduleKey: "chamber",
    ownerAgent: "ChamberAgent",
    targetModule: "chamber",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-relationship-context",
    scopes: ["chamber:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/chamber agent proposals tab",
    proposalOutputs: ["follow-up proposal", "relationship context checklist", "manual send boundary"],
    blockedWrites: ["send message", "publish contact detail", "external CRM sync"],
    sourceRefs: [
      "docs/05_execution-plans/PLN-027_chamber-crm-mvp.md",
      "docs/07_research-and-design/RES-003_interface-completion-operating-surface-research.md",
    ],
    httpDryRunPayload: {
      operationId: "chamber.relationship.plan",
      mode: "dry_run",
      targetModule: "chamber",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation chamber.relationship.plan --json",
  },
  {
    id: "company.strategy.review",
    label: "Review Company strategy proposal",
    moduleKey: "company",
    ownerAgent: "CompanyAgent",
    targetModule: "company",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-company-context",
    scopes: ["company:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/company agent proposals tab",
    proposalOutputs: ["strategy option review", "decision risk note", "manual approval checklist"],
    blockedWrites: ["company strategy final write", "public commitment", "external sharing"],
    sourceRefs: [
      "docs/05_execution-plans/PLN-028_company-strategy-mvp.md",
      "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md",
    ],
    httpDryRunPayload: {
      operationId: "company.strategy.review",
      mode: "dry_run",
      targetModule: "company",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation company.strategy.review --json",
  },
  {
    id: "client-portal.visibility.preflight",
    label: "Preflight Client Portal visibility boundary",
    moduleKey: "client-portal",
    ownerAgent: "ClientPortalAgent",
    targetModule: "client-portal",
    riskLevel: "CRITICAL",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "public-output-boundary-metadata-only",
    scopes: ["client-portal:visibility:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/admin client portal readiness panel",
    proposalOutputs: ["visibility checklist", "public output risk note", "token-gate review"],
    blockedWrites: ["public output expansion", "token lifecycle mutation", "client-visible data change"],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md",
      "docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md",
    ],
    httpDryRunPayload: {
      operationId: "client-portal.visibility.preflight",
      mode: "dry_run",
      targetModule: "client-portal",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation client-portal.visibility.preflight --json",
  },
  {
    id: "agent.ops.describe-contract",
    label: "Describe Agent Team OS operation contract",
    moduleKey: "agent-team-os",
    ownerAgent: "WorkflowAgent",
    targetModule: "agent-team-os",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-generated-agent-evidence",
    scopes: ["agent:operation:read", "agent:manifest:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/admin or /settings agent protocol readiness surface",
    proposalOutputs: ["operation contract summary", "trust boundary notes", "next protocol task"],
    blockedWrites: [
      "runtime agent execution",
      "autonomous write",
      "public endpoint exposure",
      "external registry write",
      "direct database access by external agents",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
      "docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md",
    ],
    httpDryRunPayload: {
      operationId: "agent.ops.describe-contract",
      mode: "dry_run",
      targetModule: "agent-team-os",
    },
    cliDryRunCommand: "pnpm agent:op -- --operation agent.ops.describe-contract --json",
  },
] as const satisfies readonly ModuleAgentCommand[]

export const MODULE_AGENT_OPERATION_API_OPERATIONS = MODULE_AGENT_COMMAND_CATALOG.map(
  (command): AgentOperationApiOperation => ({
    id: command.id,
    ownerAgent: command.ownerAgent,
    targetModule: command.targetModule,
    riskLevel: command.riskLevel,
    approvalLevel: command.approvalLevel,
    allowedModes: command.allowedModes,
    scopes: command.scopes,
    cliParityCommand: command.cliDryRunCommand,
    blockedActions: command.blockedWrites,
  })
)

export const MODULE_AGENT_COMMAND_CATALOG_SUMMARY = {
  taskId: "AGENT-010",
  status: "ready_for_module_agent_workspace_use",
  moduleCount: MODULE_AGENT_COMMAND_CATALOG.length,
  operationCount: MODULE_AGENT_OPERATION_API_OPERATIONS.length,
  allowedMode: "dry_run",
  externalRegisterable: false,
  nextTask: "AGENT-011 internal multi-agent task/message bus contract",
} as const
