import "server-only"

import {
  AGENT_BUS_OPERATION_BINDINGS,
  AGENT_BUS_TASK_TEMPLATES,
  AGENT_TASK_MESSAGE_BUS_CONTRACT,
  type AgentBusTask,
} from "@/lib/contracts/agent-task-message-bus.contract"
import {
  MODULE_AGENT_COMMAND_CATALOG,
  type ModuleAgentCommand,
} from "@/lib/contracts/module-agent-command-catalog.contract"
import type {
  AgentCommandCenterCommandRow,
  AgentCommandCenterGroup,
  AgentCommandCenterModuleReadinessRow,
  OwnerAgentCommandCenterContract,
} from "@/types/agent-command-center"

const HIGH_RISK_LEVELS = ["HIGH", "CRITICAL"] as const

const COMMAND_CENTER_GROUPS = [
  {
    id: "launch-proof-squad",
    label: "Launch proof squad",
    description: "Auth, Work, QA, and DevOps review the shortest path to launch proof.",
    participantAgentLabels: ["AuthPermissionAgent", "WorkAgent", "QAAgent", "DevOpsAgent"],
    recommendedOperationIds: ["work.proof.preflight", "agent.ops.describe-contract"],
    boundary: "Proof planning only; no Supabase, DB, browser, or deployment mutation.",
  },
  {
    id: "source-workflow-squad",
    label: "Source workflow squad",
    description: "Ingestion, Workflow, and QA inspect source intake and automation boundaries.",
    participantAgentLabels: ["IngestionAgent", "WorkflowAgent", "QAAgent"],
    recommendedOperationIds: ["ai-input.source-workflow.review", "workflow.queue.plan"],
    boundary: "Connector and workflow recommendations only; no OAuth, webhook, provider, or DB writes.",
  },
  {
    id: "high-risk-review-board",
    label: "High-risk review board",
    description: "Finance, Life, Company, Client Portal, Auth, and QA review sensitive proposals.",
    participantAgentLabels: [
      "FinanceAgent",
      "LifeAgent",
      "CompanyAgent",
      "ClientPortalAgent",
      "AuthPermissionAgent",
      "QAAgent",
    ],
    recommendedOperationIds: [
      "finance.review-draft",
      "life.routine.propose",
      "company.strategy.review",
      "client-portal.visibility.preflight",
    ],
    boundary: "Human approval required; no final writes, public output, external sharing, or provider mutation.",
  },
  {
    id: "relationship-growth-cell",
    label: "Relationship growth cell",
    description: "Chamber, Research, and Product agents shape relationship and knowledge proposals.",
    participantAgentLabels: ["ChamberAgent", "ResearchAgent", "ProductManagerAgent"],
    recommendedOperationIds: ["chamber.relationship.plan", "research.workspace.plan"],
    boundary: "Proposal drafting only; owner reviews before messages, publishing, or CRM sync.",
  },
] as const satisfies readonly AgentCommandCenterGroup[]

function requiresApproval(command: ModuleAgentCommand) {
  return (
    command.approvalLevel === "HUMAN_APPROVAL_REQUIRED" ||
    HIGH_RISK_LEVELS.includes(command.riskLevel as "HIGH" | "CRITICAL")
  )
}

function findTaskTemplate(command: ModuleAgentCommand): AgentBusTask | null {
  return (
    AGENT_BUS_TASK_TEMPLATES.find((task) => task.operationId === command.id) ??
    null
  )
}

function findParticipantLabels(command: ModuleAgentCommand) {
  const group = findCommandGroupByOperationId(command.id)

  if (!group) {
    return [command.ownerAgent, "QAAgent"]
  }

  const labels = new Set([command.ownerAgent, ...group.participantAgentLabels])
  return Array.from(labels)
}

function findCommandGroupByOperationId(operationId: string): AgentCommandCenterGroup | null {
  const group = COMMAND_CENTER_GROUPS.find((candidate) =>
    candidate.recommendedOperationIds.some((candidateOperationId) => candidateOperationId === operationId)
  )

  return group ?? null
}

function toModuleLabel(moduleKey: string) {
  return moduleKey
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function toCommandRow(command: ModuleAgentCommand): AgentCommandCenterCommandRow {
  const busBinding = AGENT_BUS_OPERATION_BINDINGS.find(
    (binding) => binding.operationId === command.id
  )
  const taskTemplate = findTaskTemplate(command)

  return {
    operationId: command.id,
    label: command.label,
    moduleKey: command.moduleKey,
    ownerAgent: command.ownerAgent,
    targetModule: command.targetModule,
    riskLevel: command.riskLevel,
    approvalLevel: command.approvalLevel,
    approvalRequired: requiresApproval(command),
    taskTemplateId: taskTemplate?.id ?? null,
    lifecycleState: taskTemplate?.state ?? "draft",
    participantAgentLabels: findParticipantLabels(command),
    proposalOutputs: busBinding?.proposalOutputs ?? command.proposalOutputs,
    blockedActions: busBinding?.blockedActions ?? command.blockedWrites,
    sourceRefs: command.sourceRefs,
    cliDryRunCommand: command.cliDryRunCommand,
    httpDryRun: {
      path: "/api/agent-operations/dry-run",
      mode: "dry_run",
      operationId: command.httpDryRunPayload.operationId,
      targetModule: command.httpDryRunPayload.targetModule,
    },
    writeBlocked: true,
    externalRegisterable: false,
  }
}

function toModuleReadinessRow(
  command: AgentCommandCenterCommandRow
): AgentCommandCenterModuleReadinessRow {
  const group = findCommandGroupByOperationId(command.operationId)

  return {
    moduleKey: command.moduleKey,
    moduleLabel: toModuleLabel(command.moduleKey),
    operationId: command.operationId,
    ownerAgent: command.ownerAgent,
    targetModule: command.targetModule,
    riskLevel: command.riskLevel,
    approvalLevel: command.approvalLevel,
    approvalRequired: command.approvalRequired,
    lifecycleState: command.lifecycleState,
    cliDryRunCommand: command.cliDryRunCommand,
    httpDryRun: command.httpDryRun,
    internalBus: {
      contractId: AGENT_TASK_MESSAGE_BUS_CONTRACT.id,
      status: AGENT_TASK_MESSAGE_BUS_CONTRACT.status,
      taskTemplateId: command.taskTemplateId,
      groupId: group?.id ?? null,
      groupLabel: group?.label ?? null,
      participantAgentLabels: command.participantAgentLabels,
    },
    readiness: {
      uiSurface: "/agents",
      commandCatalogTask: "AGENT-010",
      protectedHttpTask: "AGENT-014",
      commandCenterTask: "AGENT-015",
      matrixTask: "AGENT-016",
      state: "protected_owner_module_readiness_ready",
    },
    audit: {
      eventFamily: "agent.operation",
      persistence: "future_append_only",
      prerequisite: "AUDIT-OPS-001 runtime storage and protected route auth proof",
    },
    proposalOutputs: command.proposalOutputs,
    blockedWrites: command.blockedActions,
    writeBlocked: true,
    externalRegisterable: false,
  }
}

export function buildOwnerAgentCommandCenterContract(): OwnerAgentCommandCenterContract {
  const commands = MODULE_AGENT_COMMAND_CATALOG.map(toCommandRow)
  const moduleReadinessRows = commands.map(toModuleReadinessRow)

  return {
    id: "AGENT-016",
    version: "0.3.0",
    status: "protected_owner_module_readiness_matrix_ready",
    generatedAt: new Date().toISOString(),
    route: "/agents",
    defaultMode: "single_agent",
    defaultInstruction:
      "Review current state, produce a proposal, list blocked actions, and wait for owner approval before any final write.",
    summary: {
      operationCount: commands.length,
      groupCount: COMMAND_CENTER_GROUPS.length,
      moduleReadinessCount: moduleReadinessRows.length,
      highRiskOperationCount: commands.filter((command) => command.approvalRequired).length,
      externalRegisterableCount: 0,
    },
    modes: [
      {
        id: "single_agent",
        label: "Single agent",
        description: "Route a bounded command to one module owner agent and return proposal output.",
      },
      {
        id: "group_agent",
        label: "Group agents",
        description: "Route a bounded command to an internal review group and return a joint proposal packet.",
      },
    ],
    groups: COMMAND_CENTER_GROUPS,
    commands,
    moduleReadinessRows,
    safety: {
      protectedOwnerOnly: true,
      proposalOnly: true,
      protectedDryRunRouteAvailable: true,
      dryRunProofPanelReady: true,
      moduleReadinessMatrixReady: true,
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
    prohibitedActions: [
      "public chat or unauthenticated command surface",
      "external registration enabled",
      "autonomous final write",
      "provider call or external runtime handoff",
      "database read or database write from the command center",
      "high-risk final write without human approval",
      "external agent database access",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
      "docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md",
      "docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md",
      "src/lib/contracts/module-agent-command-catalog.contract.ts",
      "src/lib/contracts/agent-task-message-bus.contract.ts",
      "docs/06_audits-and-reports/RPT-021_loop-97-research-gap-review.md",
      `AGENT-011:${AGENT_TASK_MESSAGE_BUS_CONTRACT.status}`,
    ],
    rejectedAlternatives: [
      "Expose dry-run commands through a public route, external directory, or unauthenticated chat UI.",
      "Persist command threads before audit storage and service authorization are complete.",
      "Turn dry-run proof into autonomous execution or final writes without human approval.",
      "Mark any internal agent as external-registerable before endpoint, auth, trust, rollback, and human approval gates are complete.",
    ],
    nextTask:
      "Loop 99 should run AUTH-005 if owner auth proof appears, WORK-009 if a safe proof target appears, otherwise continue the shortest agent/backend maturity slice without enabling external registration.",
  }
}
