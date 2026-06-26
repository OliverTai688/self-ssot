import type { AgentBusLifecycleState } from "@/lib/contracts/agent-task-message-bus.contract"
import type {
  AgentOperationApiApproval,
  AgentOperationApiRisk,
} from "@/lib/contracts/agent-operation-api.contract"
import type { ModuleAgentCommandModule } from "@/lib/contracts/module-agent-command-catalog.contract"

export type AgentCommandCenterMode = "single_agent" | "group_agent"

export type AgentCommandCenterDryRunProof = {
  schemaVersion: 1
  generatedAt: string
  request: {
    endpoint: "/api/agent-operations/dry-run"
    method: "POST"
    clientRequestId: string | null
  }
  mode: "dry_run"
  status: "ready_for_owner_dry_run"
  selectedOperation: {
    id: string
    ownerAgent: string
    targetModule: string
    riskLevel: AgentOperationApiRisk
    approvalLevel: AgentOperationApiApproval
    allowedModes: readonly ["dry_run"]
    scopes: readonly string[]
    cliParityCommand: string
    blockedActions: readonly string[]
    requestedAgent: string
    requestedTargetModule: string
    requestedChecks: readonly string[]
  }
  agentManifestSnapshot: {
    label: string
    lifecycleStatus: string | null
    internalDiscoverable: boolean
    externalRegisterable: boolean
    registrationStatus: string | null
    endpointCounts: {
      internal: number
      external: number
    }
  }
  registrySnapshot: {
    manifestCount: number
    internalDiscoverable: boolean
    externalRegisterable: boolean
    registrationStatus: string | null
    runtimeEndpoint: string | null
    publicDirectory: boolean
  }
  safety: {
    internalHttpEndpointUsed: boolean
    publicEndpointCreated: boolean
    writesPerformed: boolean
    databaseAccessed: boolean
    providerCalled: boolean
    environmentRead: boolean
    externalRegistryWrite: boolean
    externalRegisterableAfterRun: boolean
    externalAgentDatabaseAccess: boolean
    autonomousExecution: boolean
    highRiskFinalWrite: boolean
    rawSecretsIncluded: boolean
    auditPersisted: boolean
    blockedIfRunRequested: boolean
    reasons: readonly string[]
  }
  validation: {
    operationIdKnown: boolean
    agentMatchesOperation: boolean
    targetMatchesOperation: boolean
    dryRunModeOnly: boolean
    internalDiscoverable: boolean
    externalRegisterableBlocked: boolean
    noPublicDirectory: boolean
    allowedModeIsDryRunOnly: boolean
    requestSanitized: boolean
  }
  nextReview: string
}

export type AgentCommandCenterDryRunError = {
  error: string
  code: string
  allowedMethods?: readonly string[]
  allowedOperations?: readonly string[]
  nextAction?: string
}

export type AgentCommandCenterGroup = {
  id: string
  label: string
  description: string
  participantAgentLabels: readonly string[]
  recommendedOperationIds: readonly string[]
  boundary: string
}

export type AgentCommandCenterCommandRow = {
  operationId: string
  label: string
  moduleKey: ModuleAgentCommandModule
  ownerAgent: string
  targetModule: string
  riskLevel: AgentOperationApiRisk
  approvalLevel: AgentOperationApiApproval
  approvalRequired: boolean
  taskTemplateId: string | null
  lifecycleState: AgentBusLifecycleState
  participantAgentLabels: readonly string[]
  proposalOutputs: readonly string[]
  blockedActions: readonly string[]
  sourceRefs: readonly string[]
  cliDryRunCommand: string
  httpDryRun: {
    path: "/api/agent-operations/dry-run"
    mode: "dry_run"
    operationId: string
    targetModule: string
  }
  writeBlocked: true
  externalRegisterable: false
}

export type AgentCommandCenterModuleReadinessRow = {
  moduleKey: ModuleAgentCommandModule
  moduleLabel: string
  operationId: string
  ownerAgent: string
  targetModule: string
  riskLevel: AgentOperationApiRisk
  approvalLevel: AgentOperationApiApproval
  approvalRequired: boolean
  lifecycleState: AgentBusLifecycleState
  cliDryRunCommand: string
  httpDryRun: {
    path: "/api/agent-operations/dry-run"
    mode: "dry_run"
    operationId: string
    targetModule: string
  }
  internalBus: {
    contractId: "AGENT-011"
    status: string
    taskTemplateId: string | null
    groupId: string | null
    groupLabel: string | null
    participantAgentLabels: readonly string[]
  }
  readiness: {
    uiSurface: "/agents"
    commandCatalogTask: "AGENT-010"
    protectedHttpTask: "AGENT-014"
    commandCenterTask: "AGENT-015"
    matrixTask: "AGENT-016"
    state: "protected_owner_module_readiness_ready"
  }
  audit: {
    eventFamily: "agent.operation"
    persistence: "future_append_only"
    prerequisite: string
  }
  proposalOutputs: readonly string[]
  blockedWrites: readonly string[]
  writeBlocked: true
  externalRegisterable: false
}

export type OwnerAgentCommandCenterContract = {
  id: "AGENT-016"
  version: "0.3.0"
  status: "protected_owner_module_readiness_matrix_ready"
  generatedAt: string
  route: "/agents"
  defaultMode: AgentCommandCenterMode
  defaultInstruction: string
  summary: {
    operationCount: number
    groupCount: number
    moduleReadinessCount: number
    highRiskOperationCount: number
    externalRegisterableCount: 0
  }
  modes: readonly {
    id: AgentCommandCenterMode
    label: string
    description: string
  }[]
  groups: readonly AgentCommandCenterGroup[]
  commands: readonly AgentCommandCenterCommandRow[]
  moduleReadinessRows: readonly AgentCommandCenterModuleReadinessRow[]
  safety: {
    protectedOwnerOnly: true
    proposalOnly: true
    protectedDryRunRouteAvailable: true
    dryRunProofPanelReady: true
    moduleReadinessMatrixReady: true
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
  prohibitedActions: readonly string[]
  sourceRefs: readonly string[]
  rejectedAlternatives: readonly string[]
  nextTask: string
}
