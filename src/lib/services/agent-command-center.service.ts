import "server-only"

import {
  AGENT_BUS_TASK_TEMPLATES,
  AGENT_TASK_MESSAGE_BUS_CONTRACT,
  type AgentBusTask,
} from "@/lib/contracts/agent-task-message-bus.contract"
import { MODULE_AGENT_COMMAND_CATALOG } from "@/lib/contracts/module-agent-command-catalog.contract"
import type {
  AgentCommandCenterCommandRow,
  AgentCommandCenterGroup,
  AgentCommandCenterModuleReadinessRow,
  OwnerAgentCommandCenterContract,
} from "@/types/agent-command-center"
import { db as prisma } from "@/lib/db"
import type { AgentCommand } from "@prisma/client"

const HIGH_RISK_LEVELS = ["HIGH", "CRITICAL"] as const

// The groups can eventually be moved to DB, but for now we keep them here as hardcoded,
// or we can build them dynamically from TEAM_GROUP commands.
// The user asked for Single/Team split in CRUD, so team skills could just be commands with commandType = "TEAM_GROUP".
// For now, let's just use COMMAND_CENTER_GROUPS for the UI groups, or adapt the UI to group by TEAM_GROUP skills.
const COMMAND_CENTER_GROUPS = [
  {
    id: "launch-proof-squad",
    label: "上線驗證小組",
    description: "Auth、Work、QA、DevOps 共同檢視上線驗證的最短路徑。",
    participantAgentLabels: ["AuthPermissionAgent", "WorkAgent", "QAAgent", "DevOpsAgent"],
    recommendedOperationIds: ["work.proof.preflight", "agent.ops.describe-contract"],
    boundary: "Proof planning only; no Supabase, DB, browser, or deployment mutation.",
  },
  {
    id: "source-workflow-squad",
    label: "來源工作流小組",
    description: "Ingestion、Workflow、QA 共同檢視來源匯入與自動化邊界。",
    participantAgentLabels: ["IngestionAgent", "WorkflowAgent", "QAAgent"],
    recommendedOperationIds: ["ai-input.source-workflow.review", "workflow.queue.plan"],
    boundary: "Connector and workflow recommendations only; no OAuth, webhook, provider, or DB writes.",
  },
  {
    id: "high-risk-review-board",
    label: "高風險審查小組",
    description: "Finance、Life、Company、Client Portal、Auth、QA 共同檢視敏感提案。",
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
    label: "關係經營小組",
    description: "Chamber、Research、Product 共同形成關係與知識相關提案。",
    participantAgentLabels: ["ChamberAgent", "ResearchAgent", "ProductManagerAgent"],
    recommendedOperationIds: ["chamber.relationship.plan", "research.workspace.plan"],
    boundary: "Proposal drafting only; owner reviews before messages, publishing, or CRM sync.",
  },
] as const satisfies readonly AgentCommandCenterGroup[]

function requiresApproval(command: Pick<AgentCommand, 'approvalLevel' | 'riskLevel'>) {
  return (
    command.approvalLevel === "HUMAN_APPROVAL_REQUIRED" ||
    HIGH_RISK_LEVELS.includes(command.riskLevel as "HIGH" | "CRITICAL")
  )
}

function findTaskTemplate(operationId: string): AgentBusTask | null {
  return (
    AGENT_BUS_TASK_TEMPLATES.find((task) => task.operationId === operationId) ??
    null
  )
}

function findParticipantLabels(command: Pick<AgentCommand, 'operationId' | 'ownerAgent' | 'participantAgents' | 'commandType'>) {
  if (command.commandType === "TEAM_GROUP") {
     return Array.from(new Set([command.ownerAgent, ...command.participantAgents]))
  }

  const group = findCommandGroupByOperationId(command.operationId)
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

function toCommandRow(command: AgentCommand): AgentCommandCenterCommandRow {
  const taskTemplate = findTaskTemplate(command.operationId)

  return {
    operationId: command.operationId,
    commandType: command.commandType as "SINGLE_AGENT" | "TEAM_GROUP",
    stages: command.stages as any[],
    label: command.label,
    moduleKey: command.moduleKey as any,
    ownerAgent: command.ownerAgent,
    targetModule: command.targetModule,
    riskLevel: command.riskLevel as any,
    approvalLevel: command.approvalLevel as any,
    approvalRequired: requiresApproval(command),
    taskTemplateId: taskTemplate?.id ?? null,
    lifecycleState: taskTemplate?.state ?? "draft",
    participantAgentLabels: findParticipantLabels(command),
    proposalOutputs: command.proposalOutputs,
    blockedActions: command.blockedWrites,
    sourceRefs: command.sourceRefs,
    cliDryRunCommand: `pnpm agent:op -- --operation ${command.operationId} --json`,
    httpDryRun: {
      path: "/api/agent-operations/dry-run",
      mode: "dry_run",
      operationId: command.operationId,
    commandType: command.commandType as "SINGLE_AGENT" | "TEAM_GROUP",
    stages: command.stages as any[],
      targetModule: command.targetModule,
    },
    writeBlocked: command.writeBlocked,
    externalRegisterable: command.externalRegisterable,
  }
}

function toModuleReadinessRow(
  command: AgentCommandCenterCommandRow
): AgentCommandCenterModuleReadinessRow {
  const group = findCommandGroupByOperationId(command.operationId)

  return {
    moduleKey: command.moduleKey as any,
    moduleLabel: toModuleLabel(command.moduleKey),
    operationId: command.operationId,
    commandType: command.commandType as "SINGLE_AGENT" | "TEAM_GROUP",
    stages: command.stages as any[],
    ownerAgent: command.ownerAgent,
    targetModule: command.targetModule,
    riskLevel: command.riskLevel as any,
    approvalLevel: command.approvalLevel as any,
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
    writeBlocked: command.writeBlocked,
    externalRegisterable: command.externalRegisterable,
  }
}

export async function buildOwnerAgentCommandCenterContract(): Promise<OwnerAgentCommandCenterContract> {
  const count = await prisma.agentCommand.count()
  
  if (count === 0) {
    // Seed initial commands from the old catalog
    const seedData = MODULE_AGENT_COMMAND_CATALOG.map((cmd) => {
       return {
          operationId: cmd.id,
          label: cmd.label,
          agentInstructionLabel: cmd.agentInstructionLabel,
          moduleKey: cmd.moduleKey,
          ownerAgent: cmd.ownerAgent,
          targetModule: cmd.targetModule,
          riskLevel: cmd.riskLevel,
          approvalLevel: cmd.approvalLevel,
          dataVisibilityLevel: cmd.dataVisibilityLevel,
          scopes: [...cmd.scopes],
          allowedModes: [...cmd.allowedModes],
          uiEntrySurface: cmd.uiEntrySurface,
          proposalOutputs: [...cmd.proposalOutputs],
          agentProposalOutputs: [...cmd.agentProposalOutputs],
          blockedWrites: [...cmd.blockedWrites],
          agentBlockedWrites: [...cmd.agentBlockedWrites],
          sourceRefs: [...cmd.sourceRefs],
          commandType: "SINGLE_AGENT" as const,
          promptTemplate: null,
       }
    })
    
    await prisma.agentCommand.createMany({
       data: seedData,
       skipDuplicates: true
    })
  }

  const agentCommands = await prisma.agentCommand.findMany({
    orderBy: { createdAt: "desc" }
  })
  
  const commands = agentCommands.map(toCommandRow)
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
      highRiskOperationCount: commands.filter((command: AgentCommandCenterCommandRow) => command.approvalRequired).length,
      externalRegisterableCount: 0,
    },
    modes: [
      {
        id: "single_agent",
        label: "單一 Agent",
        description: "將受控指令路由至單一模組擁有者 Agent，並回傳提案輸出。",
      },
      {
        id: "group_agent",
        label: "群組 Agent",
        description: "將受控指令路由至內部審查群組，並回傳共同提案封包。",
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
