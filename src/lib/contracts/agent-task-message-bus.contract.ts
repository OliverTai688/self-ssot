import type {
  AgentOperationApiApproval,
  AgentOperationApiRisk,
} from "@/lib/contracts/agent-operation-api.contract"
import {
  MODULE_AGENT_COMMAND_CATALOG,
  type ModuleAgentCommandModule,
} from "@/lib/contracts/module-agent-command-catalog.contract"

export type AgentBusLifecycleState =
  | "draft"
  | "submitted"
  | "working"
  | "input_required"
  | "proposal_ready"
  | "approved_for_manual_action"
  | "rejected"
  | "blocked"
  | "completed_no_write"

export type AgentBusParticipantKind =
  | "owner"
  | "internal_agent"
  | "system"
  | "external_agent_placeholder"

export type AgentBusParticipantRole =
  | "task_owner"
  | "lead_agent"
  | "review_agent"
  | "system_recorder"
  | "future_disabled_placeholder"

export type AgentBusMessageRole =
  | "instruction"
  | "agent_turn"
  | "review_note"
  | "system_status"
  | "proposal_summary"

export type AgentBusMessagePartKind =
  | "text"
  | "artifact_ref"
  | "proposal_ref"
  | "proof_ref"
  | "blocked_action_ref"

export type AgentBusVisibility =
  | "owner_only"
  | "internal_agents_only"
  | "owner_and_internal_agents"
  | "redacted_summary"

export type AgentBusRetentionClass =
  | "security_1_year"
  | "high_risk_7_year_review_required"
  | "docs_trace"

export type AgentBusParticipant = {
  participantId: string
  kind: AgentBusParticipantKind
  agentLabel: string | null
  role: AgentBusParticipantRole
  permissions: readonly string[]
  externalRegisterable: false
}

export type AgentBusMessagePart = {
  kind: AgentBusMessagePartKind
  text: string
  artifactRef: string | null
  proposalRef: string | null
  proofRef: string | null
  redactionPolicy: "no_secret_values" | "metadata_only" | "owner_review_required"
}

export type AgentBusMessage = {
  messageId: string
  taskId: string
  sender: string
  role: AgentBusMessageRole
  parts: readonly AgentBusMessagePart[]
  references: readonly string[]
  visibility: AgentBusVisibility
  createdAtLabel: string
}

export type AgentBusProposal = {
  proposalId: string
  taskId: string
  summary: string
  targetModule: ModuleAgentCommandModule
  riskLevel: AgentOperationApiRisk
  approvalRequired: boolean
  writeBlocked: true
  nextOwnerAction: string
}

export type AgentBusAuditMapping = {
  eventFamily: "agent.operation"
  sourceKind: "internal_agent_bus"
  operationId: string
  proofRef: string
  retentionClass: AgentBusRetentionClass
}

export type AgentBusTask = {
  id: string
  title: string
  targetModule: ModuleAgentCommandModule
  operationId: string
  state: AgentBusLifecycleState
  riskLevel: AgentOperationApiRisk
  approvalLevel: AgentOperationApiApproval
  createdBy: "owner" | "system"
  participants: readonly string[]
  sourceRefs: readonly string[]
  auditRefs: readonly string[]
  blockedActions: readonly string[]
}

export type AgentBusOperationBinding = {
  operationId: string
  targetModule: ModuleAgentCommandModule
  ownerAgent: string
  riskLevel: AgentOperationApiRisk
  approvalLevel: AgentOperationApiApproval
  proposalOutputs: readonly string[]
  blockedActions: readonly string[]
  writeBlocked: true
  externalRegisterable: false
}

export type AgentBusParticipantKindPolicy = {
  participantKind:
    | AgentBusParticipantKind
    | "external_agent_runtime"
  allowedNow: boolean
  rule: string
}

export type AgentTaskMessageBusContract = {
  id: "AGENT-011"
  version: "0.1.0"
  status: "ready_for_internal_agent_bus_contract_use"
  lifecycleStates: readonly AgentBusLifecycleState[]
  forbiddenLifecycleStates: readonly string[]
  participantKindPolicies: readonly AgentBusParticipantKindPolicy[]
  internalAgentLabels: readonly string[]
  participants: readonly AgentBusParticipant[]
  operationBindings: readonly AgentBusOperationBinding[]
  taskTemplates: readonly AgentBusTask[]
  messageTemplate: AgentBusMessage
  proposalPolicies: readonly AgentBusProposal[]
  auditMappings: readonly AgentBusAuditMapping[]
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

export const AGENT_BUS_LIFECYCLE_STATES = [
  "draft",
  "submitted",
  "working",
  "input_required",
  "proposal_ready",
  "approved_for_manual_action",
  "rejected",
  "blocked",
  "completed_no_write",
] as const satisfies readonly AgentBusLifecycleState[]

export const AGENT_BUS_FORBIDDEN_LIFECYCLE_STATES = [
  "executed",
  "auto_written",
  "external_sent",
] as const

export const AGENT_BUS_REQUIRED_OPERATION_IDS = [
  "work.proof.preflight",
  "research.workspace.plan",
  "ai-input.source-workflow.review",
  "workflow.queue.plan",
  "life.routine.propose",
  "finance.review-draft",
  "chamber.relationship.plan",
  "company.strategy.review",
  "client-portal.visibility.preflight",
  "agent.ops.describe-contract",
] as const

export const AGENT_BUS_HIGH_RISK_OPERATION_IDS = [
  "ai-input.source-workflow.review",
  "life.routine.propose",
  "finance.review-draft",
  "company.strategy.review",
  "client-portal.visibility.preflight",
] as const

const HIGH_RISK_LEVELS = ["HIGH", "CRITICAL"] as const

function requiresOwnerApproval(
  riskLevel: AgentOperationApiRisk,
  approvalLevel: AgentOperationApiApproval
) {
  return approvalLevel === "HUMAN_APPROVAL_REQUIRED" || HIGH_RISK_LEVELS.includes(riskLevel as "HIGH" | "CRITICAL")
}

export const AGENT_BUS_PARTICIPANT_KIND_POLICIES = [
  {
    participantKind: "owner",
    allowedNow: true,
    rule: "Owner can submit bounded instructions and approve or reject proposal outputs.",
  },
  {
    participantKind: "internal_agent",
    allowedNow: true,
    rule: "Internal agents must map to generated AgentFacts-lite labels and can only produce proposal or review output.",
  },
  {
    participantKind: "system",
    allowedNow: true,
    rule: "System records routing, validation, and blocked states without executing writes.",
  },
  {
    participantKind: "external_agent_placeholder",
    allowedNow: true,
    rule: "Placeholder is documentation-only and cannot receive context or messages.",
  },
  {
    participantKind: "external_agent_runtime",
    allowedNow: false,
    rule: "External runtime is blocked until AGENT-013, auth scopes, trust, deployment proof, public-safety review, and human approval.",
  },
] as const satisfies readonly AgentBusParticipantKindPolicy[]

export const AGENT_BUS_INTERNAL_AGENT_LABELS = [
  "ProductManagerAgent",
  "DBAgent",
  "WorkAgent",
  "ResearchAgent",
  "IngestionAgent",
  "WorkflowAgent",
  "UIUXAgent",
  "AuthPermissionAgent",
  "ClientPortalAgent",
  "LifeAgent",
  "FinanceAgent",
  "CompanyAgent",
  "ChamberAgent",
  "QAAgent",
  "DevOpsAgent",
] as const

export const AGENT_BUS_PARTICIPANTS = [
  {
    participantId: "owner:personal-os-owner",
    kind: "owner",
    agentLabel: null,
    role: "task_owner",
    permissions: ["submit_instruction", "approve_manual_action", "reject_proposal"],
    externalRegisterable: false,
  },
  {
    participantId: "internal-agent:WorkflowAgent",
    kind: "internal_agent",
    agentLabel: "WorkflowAgent",
    role: "lead_agent",
    permissions: ["draft_task_route", "coordinate_internal_agents", "produce_proposal"],
    externalRegisterable: false,
  },
  {
    participantId: "internal-agent:QAAgent",
    kind: "internal_agent",
    agentLabel: "QAAgent",
    role: "review_agent",
    permissions: ["validate_contract", "review_evidence", "flag_stop_condition"],
    externalRegisterable: false,
  },
  {
    participantId: "system:personal-os-agent-bus",
    kind: "system",
    agentLabel: null,
    role: "system_recorder",
    permissions: ["record_lifecycle_state", "record_audit_mapping", "block_for_policy"],
    externalRegisterable: false,
  },
  {
    participantId: "external-placeholder:future-approved-agent",
    kind: "external_agent_placeholder",
    agentLabel: null,
    role: "future_disabled_placeholder",
    permissions: [],
    externalRegisterable: false,
  },
] as const satisfies readonly AgentBusParticipant[]

export const AGENT_BUS_OPERATION_BINDINGS = MODULE_AGENT_COMMAND_CATALOG.map(
  (command): AgentBusOperationBinding => ({
    operationId: command.id,
    targetModule: command.moduleKey,
    ownerAgent: command.ownerAgent,
    riskLevel: command.riskLevel,
    approvalLevel: command.approvalLevel,
    proposalOutputs: command.proposalOutputs,
    blockedActions: command.blockedWrites,
    writeBlocked: true,
    externalRegisterable: false,
  })
) satisfies readonly AgentBusOperationBinding[]

export const AGENT_BUS_HIGH_RISK_MODULES = [
  "ai-input",
  "life",
  "finance",
  "company",
  "client-portal",
] as const satisfies readonly ModuleAgentCommandModule[]

export const AGENT_BUS_TASK_TEMPLATES = MODULE_AGENT_COMMAND_CATALOG.map(
  (command): AgentBusTask => ({
    id: `agent-bus-task:${command.id}`,
    title: `Internal proposal task for ${command.label}`,
    targetModule: command.moduleKey,
    operationId: command.id,
    state: "draft",
    riskLevel: command.riskLevel,
    approvalLevel: command.approvalLevel,
    createdBy: "owner",
    participants: [
      "owner:personal-os-owner",
      `internal-agent:${command.ownerAgent}`,
      "system:personal-os-agent-bus",
    ],
    sourceRefs: command.sourceRefs,
    auditRefs: [`agent.operation:${command.id}`, "DBS-006:internal_agent_bus"],
    blockedActions: command.blockedWrites,
  })
) satisfies readonly AgentBusTask[]

export const AGENT_BUS_MESSAGE_TEMPLATE = {
  messageId: "agent-bus-message:template-owner-instruction",
  taskId: "agent-bus-task:<operation-id>",
  sender: "owner:personal-os-owner",
  role: "instruction",
  parts: [
    {
      kind: "text",
      text: "Owner asks an internal agent group for a bounded dry-run or proposal.",
      artifactRef: null,
      proposalRef: null,
      proofRef: null,
      redactionPolicy: "no_secret_values",
    },
    {
      kind: "proof_ref",
      text: "Reference generated proof only by safe relative path.",
      artifactRef: null,
      proposalRef: null,
      proofRef: "docs/2_agent-input/generated/agent-loop/reports/<proof>.json",
      redactionPolicy: "metadata_only",
    },
  ],
  references: [
    "docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md",
    "src/lib/contracts/module-agent-command-catalog.contract.ts",
  ],
  visibility: "owner_and_internal_agents",
  createdAtLabel: "runtime_generated_label_only",
} as const satisfies AgentBusMessage

export const AGENT_BUS_PROPOSAL_POLICIES = MODULE_AGENT_COMMAND_CATALOG.map(
  (command): AgentBusProposal => ({
    proposalId: `agent-bus-proposal:${command.id}`,
    taskId: `agent-bus-task:${command.id}`,
    summary: `Reviewable proposal output for ${command.label}.`,
    targetModule: command.moduleKey,
    riskLevel: command.riskLevel,
    approvalRequired: requiresOwnerApproval(command.riskLevel, command.approvalLevel),
    writeBlocked: true,
    nextOwnerAction:
      command.approvalLevel === "HUMAN_APPROVAL_REQUIRED"
        ? "Owner must review, approve, reject, or keep blocked before any manual follow-up."
        : "Owner can review the proposal and run a later approved manual action.",
  })
) satisfies readonly AgentBusProposal[]

export const AGENT_BUS_AUDIT_MAPPINGS = MODULE_AGENT_COMMAND_CATALOG.map(
  (command): AgentBusAuditMapping => ({
    eventFamily: "agent.operation",
    sourceKind: "internal_agent_bus",
    operationId: command.id,
    proofRef: `docs/2_agent-input/generated/agent-loop/reports/<loop>-agent-bus-${command.moduleKey}.json`,
    retentionClass:
      command.riskLevel === "HIGH" || command.riskLevel === "CRITICAL"
        ? "high_risk_7_year_review_required"
        : "security_1_year",
  })
) satisfies readonly AgentBusAuditMapping[]

export const AGENT_TASK_MESSAGE_BUS_CONTRACT = {
  id: "AGENT-011",
  version: "0.1.0",
  status: "ready_for_internal_agent_bus_contract_use",
  lifecycleStates: AGENT_BUS_LIFECYCLE_STATES,
  forbiddenLifecycleStates: AGENT_BUS_FORBIDDEN_LIFECYCLE_STATES,
  participantKindPolicies: AGENT_BUS_PARTICIPANT_KIND_POLICIES,
  internalAgentLabels: AGENT_BUS_INTERNAL_AGENT_LABELS,
  participants: AGENT_BUS_PARTICIPANTS,
  operationBindings: AGENT_BUS_OPERATION_BINDINGS,
  taskTemplates: AGENT_BUS_TASK_TEMPLATES,
  messageTemplate: AGENT_BUS_MESSAGE_TEMPLATE,
  proposalPolicies: AGENT_BUS_PROPOSAL_POLICIES,
  auditMappings: AGENT_BUS_AUDIT_MAPPINGS,
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
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    "docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md",
    "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
    "docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md",
    "src/lib/contracts/module-agent-command-catalog.contract.ts",
  ],
  rejectedAlternatives: [
    "Build a live group chat before task lifecycle, proposal, redaction, and audit semantics exist.",
    "Persist AgentMessage rows before schema, authorization, audit storage, and proof target approval.",
    "Publish A2A, MCP, NANDA, Agent Card, or AgentFacts endpoints before AGENT-013 approval.",
    "Let external agents receive private context or query Personal OS databases directly.",
  ],
} as const satisfies AgentTaskMessageBusContract

export const AGENT_TASK_MESSAGE_BUS_CONTRACT_SUMMARY = {
  taskId: "AGENT-011",
  status: AGENT_TASK_MESSAGE_BUS_CONTRACT.status,
  lifecycleStateCount: AGENT_BUS_LIFECYCLE_STATES.length,
  participantKindCount: AGENT_BUS_PARTICIPANT_KIND_POLICIES.length,
  participantCount: AGENT_BUS_PARTICIPANTS.length,
  internalAgentLabelCount: AGENT_BUS_INTERNAL_AGENT_LABELS.length,
  operationBindingCount: AGENT_BUS_OPERATION_BINDINGS.length,
  proposalPolicyCount: AGENT_BUS_PROPOSAL_POLICIES.length,
  auditMappingCount: AGENT_BUS_AUDIT_MAPPINGS.length,
  externalRegisterable: false,
  nextTask: "AGENT-012 protected owner AI command center",
} as const
