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
  /** Owner-facing display label. Always Traditional Chinese — this is what renders in the AI Command Center UI. */
  label: string
  /** Machine/agent-facing task label. Always English — embedded into internal agent-bus task titles and proposal summaries, never rendered directly to the owner. */
  agentInstructionLabel: string
  moduleKey: ModuleAgentCommandModule
  ownerAgent: string
  targetModule: string
  riskLevel: AgentOperationApiRisk
  approvalLevel: AgentOperationApiApproval
  dataVisibilityLevel: string
  scopes: readonly string[]
  allowedModes: readonly ["dry_run"]
  uiEntrySurface: string
  /** Owner-facing proposal output list. Always Traditional Chinese. */
  proposalOutputs: readonly string[]
  /** Agent-bus-facing proposal output list. Always English. */
  agentProposalOutputs: readonly string[]
  /** Owner-facing blocked-write list. Always Traditional Chinese. */
  blockedWrites: readonly string[]
  /** Agent-bus-facing blocked-action list. Always English. */
  agentBlockedWrites: readonly string[]
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
    label: "規劃工作資料檢查",
    agentInstructionLabel: "Plan Work proof-data preflight check",
    moduleKey: "work",
    ownerAgent: "WorkAgent",
    targetModule: "work",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-proof-metadata",
    scopes: ["work:proof:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/work agent workspace",
    proposalOutputs: ["檢查前清單", "安全目標準備說明", "下一步檢查命令"],
    agentProposalOutputs: ["pre-check checklist", "safe target preparation notes", "next check command"],
    blockedWrites: [
      "未完成正式工作資料確認前不寫入 DB",
      "不自動改動重要資料",
      "未核准前不執行瀏覽器寫入檢查",
    ],
    agentBlockedWrites: [
      "no DB write before formal work data confirmation is complete",
      "no automatic mutation of critical data",
      "no browser write check execution before approval",
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
    label: "規劃研究工作區整合",
    agentInstructionLabel: "Plan Research workspace synthesis",
    moduleKey: "research",
    ownerAgent: "ResearchAgent",
    targetModule: "research",
    riskLevel: "LOW",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-local-prototype-state",
    scopes: ["research:workspace:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/research agent workspace",
    proposalOutputs: ["來源分群計畫", "議題整合大綱", "寫作下一步提案"],
    agentProposalOutputs: ["source clustering plan", "issue synthesis outline", "writing next-step proposal"],
    blockedWrites: ["發布研究成果", "修改來源紀錄", "寄送外部協作封包"],
    agentBlockedWrites: ["publish research output", "mutate source records", "send external collaboration packets"],
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
    label: "檢查 AI 輸入來源工作流就緒狀態",
    agentInstructionLabel: "Review AI Input source workflow readiness",
    moduleKey: "ai-input",
    ownerAgent: "IngestionAgent",
    targetModule: "ai-input",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "repo-docs-and-source-workflow-readiness",
    scopes: ["ai-input:source-workflow:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/ai-input formal source workflow agent panel",
    proposalOutputs: ["連接器邊界檢查", "提案行動清單", "驗證目標就緒說明"],
    agentProposalOutputs: ["connector boundary review", "proposal action checklist", "proof target readiness notes"],
    blockedWrites: [
      "連接器 OAuth 或 webhook runtime",
      "來源工作流 DB 寫入",
      "provider 內容讀取",
      "對外 agent 上下文封包",
    ],
    agentBlockedWrites: [
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
    label: "規劃自動化佇列與邊界",
    agentInstructionLabel: "Plan Workflow queue and automation boundary",
    moduleKey: "workflow",
    ownerAgent: "WorkflowAgent",
    targetModule: "workflow",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-workflow-prototype-state",
    scopes: ["workflow:queue:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/workflow agent workspace",
    proposalOutputs: ["自動化流程提案", "任務路由說明", "核准流程清單"],
    agentProposalOutputs: ["automation sequence proposal", "task routing notes", "approval lane checklist"],
    blockedWrites: ["自動執行工作流", "排程／provider 修改", "跨模組正式寫入"],
    agentBlockedWrites: ["autonomous workflow execution", "schedule/provider mutation", "cross-module final write"],
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
    label: "提出生活作息下一步行動",
    agentInstructionLabel: "Propose Life routine next action",
    moduleKey: "life",
    ownerAgent: "LifeAgent",
    targetModule: "life",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-life-context",
    scopes: ["life:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/life agent proposals tab",
    proposalOutputs: ["作息提案", "習慣檢視說明", "人工核准清單"],
    agentProposalOutputs: ["routine proposal", "habit review notes", "manual approval checklist"],
    blockedWrites: ["健康或生活資料正式寫入", "對外分享", "行事曆／provider 修改"],
    agentBlockedWrites: ["health or life data final write", "external sharing", "calendar/provider mutation"],
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
    label: "檢查財務草案與風險邊界",
    agentInstructionLabel: "Review Finance draft and risk boundary",
    moduleKey: "finance",
    ownerAgent: "FinanceAgent",
    targetModule: "finance",
    riskLevel: "CRITICAL",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-finance-context",
    scopes: ["finance:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/finance agent proposals tab",
    proposalOutputs: ["財務草案檢視", "風險說明", "人工核准清單"],
    agentProposalOutputs: ["finance draft review", "risk note", "manual approval checklist"],
    blockedWrites: ["財務正式寫入", "交易", "對外分享", "provider 修改"],
    agentBlockedWrites: ["financial final write", "transaction", "external sharing", "provider mutation"],
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
    label: "規劃商會關係後續追蹤",
    agentInstructionLabel: "Plan Chamber relationship follow-up",
    moduleKey: "chamber",
    ownerAgent: "ChamberAgent",
    targetModule: "chamber",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-relationship-context",
    scopes: ["chamber:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/chamber agent proposals tab",
    proposalOutputs: ["後續追蹤提案", "關係脈絡清單", "人工發送邊界"],
    agentProposalOutputs: ["follow-up proposal", "relationship context checklist", "manual send boundary"],
    blockedWrites: ["發送訊息", "發布聯絡資訊", "對外 CRM 同步"],
    agentBlockedWrites: ["send message", "publish contact detail", "external CRM sync"],
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
    label: "檢查公司策略提案",
    agentInstructionLabel: "Review Company strategy proposal",
    moduleKey: "company",
    ownerAgent: "CompanyAgent",
    targetModule: "company",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-company-context",
    scopes: ["company:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/company agent proposals tab",
    proposalOutputs: ["策略選項檢視", "決策風險說明", "人工核准清單"],
    agentProposalOutputs: ["strategy option review", "decision risk note", "manual approval checklist"],
    blockedWrites: ["公司策略正式寫入", "對外承諾", "對外分享"],
    agentBlockedWrites: ["company strategy final write", "public commitment", "external sharing"],
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
    label: "檢查客戶入口可見性邊界",
    agentInstructionLabel: "Preflight Client Portal visibility boundary",
    moduleKey: "client-portal",
    ownerAgent: "ClientPortalAgent",
    targetModule: "client-portal",
    riskLevel: "CRITICAL",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "public-output-boundary-metadata-only",
    scopes: ["client-portal:visibility:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/admin client portal readiness panel",
    proposalOutputs: ["可見性清單", "對外輸出風險說明", "token 權限檢視"],
    agentProposalOutputs: ["visibility checklist", "public output risk note", "token-gate review"],
    blockedWrites: ["擴大對外輸出", "token 生命週期修改", "客戶可見資料變更"],
    agentBlockedWrites: ["public output expansion", "token lifecycle mutation", "client-visible data change"],
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
    label: "說明 Agent Team OS 操作合約",
    agentInstructionLabel: "Describe Agent Team OS operation contract",
    moduleKey: "agent-team-os",
    ownerAgent: "WorkflowAgent",
    targetModule: "agent-team-os",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-generated-agent-evidence",
    scopes: ["agent:operation:read", "agent:manifest:read"],
    allowedModes: ["dry_run"],
    uiEntrySurface: "/admin or /settings agent protocol readiness surface",
    proposalOutputs: ["操作合約摘要", "信任邊界說明", "下一個協議任務"],
    agentProposalOutputs: ["operation contract summary", "trust boundary notes", "next protocol task"],
    blockedWrites: [
      "執行 runtime agent",
      "自動寫入",
      "對外 endpoint 暴露",
      "外部登錄寫入",
      "外部 agent 直接存取資料庫",
    ],
    agentBlockedWrites: [
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
