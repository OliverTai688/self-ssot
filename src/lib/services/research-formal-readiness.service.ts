import "server-only"

import {
  RESEARCH_FORMAL_READINESS_CONTRACT,
  type ResearchReadinessLevel,
} from "@/lib/contracts/research-formal-readiness.contract"

export type ResearchFormalReadinessTone = "good" | "warn" | "blocked" | "neutral"

export type ResearchFormalReadinessSummaryView = {
  taskId: string
  version: string
  statusLabel: string
  modeLabel: string
  resourceFamilyCount: number
  blockedWriteCount: number
  blockedResourceFamilyCount: number
  partialModelCount: number
  mockOnlyCount: number
  proposalOnlyCount: number
  formalReadinessCount: number
  primaryBlockedReason: string
  nextOwnerAction: string
}

export type ResearchFormalReadinessFamilyView = {
  id: string
  label: string
  currentSource: string
  formalReadiness: ResearchReadinessLevel
  readinessLabel: string
  displayLabel: string
  futureDto: string
  writeBoundary: string
  tone: ResearchFormalReadinessTone
}

export type ResearchFormalReadinessBoundaryView = {
  id: string
  label: string
  evidence: string
  risk: string
  formalUse: string
  nextSafeAction: string
  tone: ResearchFormalReadinessTone
}

export type ResearchFormalReadinessBlockedOperationView = {
  id: string
  label: string
  reason: string
  requiredBeforeUnlock: string[]
}

export type ResearchFormalReadinessSafetyView = {
  id: string
  label: string
  allowed: false
}

export type ResearchFormalReadinessSurfaceView = {
  summary: ResearchFormalReadinessSummaryView
  currentStateSplit: ResearchFormalReadinessBoundaryView[]
  futureBffPath: string[]
  resourceFamilies: ResearchFormalReadinessFamilyView[]
  blockedWriteOperations: ResearchFormalReadinessBlockedOperationView[]
  safety: ResearchFormalReadinessSafetyView[]
  agentBoundary: {
    surfaceType: string
    protocolStatus: string
    externalRegisterable: false
    approvalRequiredBeforeExternalUse: true
  }
  sourceRefs: string[]
  verification: string[]
  nextTasks: string[]
}

const READINESS_LABELS: Record<ResearchReadinessLevel, string> = {
  mock_local_storage_only: "Mock/localStorage only",
  partial_thread_prisma_model: "Partial Prisma thread model",
  formal_readiness_contract: "Formal readiness contract",
  blocked_until_model_reconciliation: "Blocked: model reconciliation",
  proposal_only: "Proposal only",
}

const DISPLAY_LABELS = {
  available_as_mock_ui: "Mock UI available",
  available_as_partial_model: "Partial model available",
  readiness_only: "Readiness only",
  blocked: "Blocked",
} as const

function toneForReadiness(level: ResearchReadinessLevel): ResearchFormalReadinessTone {
  if (level === "formal_readiness_contract") return "good"
  if (level === "partial_thread_prisma_model" || level === "proposal_only") return "warn"
  if (level === "blocked_until_model_reconciliation") return "blocked"
  return "neutral"
}

function toneForRisk(risk: string): ResearchFormalReadinessTone {
  if (risk === "HIGH") return "blocked"
  if (risk === "MEDIUM") return "warn"
  return "good"
}

function countReadiness(level: ResearchReadinessLevel) {
  return RESEARCH_FORMAL_READINESS_CONTRACT.resourceFamilies.filter(
    (family) => family.formalReadiness === level
  ).length
}

function buildSafetyRows(): ResearchFormalReadinessSafetyView[] {
  return [
    { id: "runtimeDbReadAllowed", label: "Runtime DB read", allowed: false },
    { id: "runtimeDbWriteAllowed", label: "Runtime DB write", allowed: false },
    { id: "routeHandlerAllowed", label: "Route handler", allowed: false },
    { id: "serverActionWriteAllowed", label: "Server action write", allowed: false },
    { id: "schemaMigrationAllowed", label: "Schema or migration", allowed: false },
    { id: "publicOutputAllowed", label: "Public output", allowed: false },
    { id: "externalCollaborationAllowed", label: "External collaboration", allowed: false },
    { id: "agentFinalWriteAllowed", label: "Agent final write", allowed: false },
    { id: "externalRegisterable", label: "External registration", allowed: false },
    { id: "launchLevelUpgradeClaimed", label: "Launch level claim", allowed: false },
  ]
}

export function buildResearchFormalReadinessSurface(): ResearchFormalReadinessSurfaceView {
  const contract = RESEARCH_FORMAL_READINESS_CONTRACT

  return {
    summary: {
      taskId: "RESEARCH-OPS-002-RESEARCH-FORMAL-READINESS-SURFACE",
      version: contract.version,
      statusLabel: contract.uiDisplayContract.readinessLabel,
      modeLabel: contract.mode,
      resourceFamilyCount: contract.resourceFamilies.length,
      blockedWriteCount: contract.blockedWriteOperations.length,
      blockedResourceFamilyCount: countReadiness("blocked_until_model_reconciliation"),
      partialModelCount: countReadiness("partial_thread_prisma_model"),
      mockOnlyCount: countReadiness("mock_local_storage_only"),
      proposalOnlyCount: countReadiness("proposal_only"),
      formalReadinessCount: countReadiness("formal_readiness_contract"),
      primaryBlockedReason: contract.uiDisplayContract.primaryBlockedReason,
      nextOwnerAction: contract.uiDisplayContract.nextOwnerAction,
    },
    currentStateSplit: contract.currentStateSplit.map((boundary) => ({
      id: boundary.id,
      label: boundary.label,
      evidence: boundary.evidence,
      risk: boundary.risk,
      formalUse: boundary.formalUse,
      nextSafeAction: boundary.nextSafeAction,
      tone: toneForRisk(boundary.risk),
    })),
    futureBffPath: [...contract.futureBffPath],
    resourceFamilies: contract.resourceFamilies.map((family) => ({
      id: family.id,
      label: family.label,
      currentSource: family.currentSource,
      formalReadiness: family.formalReadiness,
      readinessLabel: READINESS_LABELS[family.formalReadiness],
      displayLabel: DISPLAY_LABELS[family.displayState],
      futureDto: family.futureDto,
      writeBoundary: family.writeBoundary,
      tone: toneForReadiness(family.formalReadiness),
    })),
    blockedWriteOperations: contract.blockedWriteOperations.map((operation) => ({
      id: operation.id,
      label: operation.label,
      reason: operation.reason,
      requiredBeforeUnlock: [...operation.requiredBeforeUnlock],
    })),
    safety: buildSafetyRows(),
    agentBoundary: {
      surfaceType: contract.nandaBoundary.agentSurfaceType,
      protocolStatus: contract.nandaBoundary.protocolStatus,
      externalRegisterable: false,
      approvalRequiredBeforeExternalUse: true,
    },
    sourceRefs: [...contract.sourceRefs],
    verification: [...contract.verification],
    nextTasks: [...contract.nextTasks],
  }
}
