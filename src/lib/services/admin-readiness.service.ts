import "server-only"

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"

import { getAuthRuntimeMode, getRequestedAuthMode, type AuthMode } from "@/lib/auth/runtime"
import { getSupabasePublicConfig } from "@/lib/supabase/env"
import {
  buildClientPortalReadinessContract,
  type ClientPortalReadinessContract,
} from "@/lib/services/client-portal-readiness.service"
import {
  buildAgentProtocolReadinessContract,
  type AgentProtocolReadinessContract,
} from "@/lib/services/agent-protocol-readiness.service"
import { buildAIInputSourceWorkflowProofBootstrapContract } from "@/lib/services/ai-input-source-workflow-proof-bootstrap-readiness.service"
import { AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS } from "@/lib/contracts/ai-input-source-workflow-proof-target.contract"
import {
  LAUNCH_READINESS_HISTORY_PROHIBITED_EXPOSURE,
  LAUNCH_READINESS_HISTORY_REQUIRED_SURFACES,
  LAUNCH_READINESS_HISTORY_SOURCE,
  type LaunchReadinessHistoryContract,
  type LaunchReadinessHistoryRow,
  type LaunchReadinessHistoryStatus,
  type LaunchReadinessHistoryTone,
} from "@/lib/contracts/launch-readiness-history.contract"
import {
  LAUNCH_OPERATOR_ACTION_PROHIBITED_EXPOSURE,
  LAUNCH_OPERATOR_ACTION_REGISTRY_SOURCE,
  LAUNCH_OPERATOR_ACTION_REQUIRED_IDS,
  type LaunchOperatorAction,
  type LaunchOperatorActionRegistryContract,
} from "@/lib/contracts/launch-operator-action-registry.contract"
import {
  BACKEND_OPERATION_CATALOG,
  type BackendOperationCatalogContract,
  type BackendOperationCatalogRow,
} from "@/lib/contracts/backend-operation-catalog.contract"
import {
  WORK_PROOF_EVIDENCE_PROHIBITED_EXPOSURE,
  type WorkProofEvidenceFamily,
  type WorkProofEvidenceFreshness,
  type WorkProofLatestEvidenceContract,
} from "@/lib/contracts/work-proof-evidence.contract"
import { resolveCurrentUser, type AuthResolutionStatus } from "@/lib/services/auth.service"
import {
  getModulePermissionSnapshotForProfile,
  getUnauthenticatedModulePermissionSnapshot,
} from "@/lib/services/module-permission.service"
import { getProjectCountForProfile } from "@/lib/services/project.service"
import { resolveWorkProofEvidence } from "@/lib/services/work-proof-evidence.service"
import type { ModulePermissionSnapshot } from "@/types/module-permission"
import type { AIInputSourceWorkflowProofBootstrapContract } from "@/types/ai-input-readiness"

export type AdminReadinessTone = "good" | "warn" | "blocked" | "neutral"

type LoopState = {
  automation?: {
    id?: string
    cadence?: string
  }
  goal?: {
    targetLoops?: number
  }
  launchLevels?: {
    current?: string
    targetNext?: string
  }
  loopProgress?: {
    currentLoop?: number
    completedLoops?: number
    normalLoopsSinceLastLevelReview?: number
    nextLoopNumber?: number
    nextRecommendedTask?: string
    lastCompletedTask?: string
    lastCompletedReport?: string
  }
}

export type AdminSummaryItem = {
  label: string
  value: string
  detail: string
  tone: AdminReadinessTone
}

export type AdminReadinessRow = {
  area: string
  status: string
  signal: string
  nextAction: string
  tone: AdminReadinessTone
}

export type AdminEvidenceRow = {
  title: string
  path: string
  updatedAt: string
}

export type AdminAuditBffRow = {
  area: string
  source: string
  safeExposure: string
  writeBoundary: string
  nextGate: string
  tone: AdminReadinessTone
}

export type AdminAuditBffContract = {
  id: "ADMIN-002"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"admin" | "settings">
  evidenceSource: {
    path: string
    recentCount: number
  }
  persistence: {
    current: "not_persisted"
    futureGate: string
  }
  prohibitedWrites: string[]
  rows: AdminAuditBffRow[]
}

type AuthBoundaryProofStatus = "ready" | "warn" | "blocked" | "unknown"

type AuthBoundaryProofPayload = {
  generatedAt?: string
  environmentSummary?: {
    nodeEnvClass?: string
    requestedAuthMode?: AuthMode
    effectiveAuthMode?: AuthMode
    devUserEmailSource?: "default_contract" | "custom_env"
    supabasePublicUrlPresent?: boolean
    supabasePublishableOrAnonKeyPresent?: boolean
  }
  proofSummary?: {
    overallStatus?: AuthBoundaryProofStatus
    boundaryStatus?: AuthBoundaryProofStatus
    canUseLocalDemo?: boolean
    canCollectSignedInAuthProof?: boolean
    canRunAuth005?: boolean
    nextAction?: string
  }
}

type LatestAuthBoundaryProof = {
  path: string
  updatedAt: string
  payload: AuthBoundaryProofPayload
}

export type OwnerAuthBoundaryContract = {
  id: "AUTH-MATURITY-002"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"admin" | "settings">
  source: {
    command: string
    latestProofPath: string
    architectureDoc: string
    proofScript: string
  }
  runtime: {
    requestedAuthMode: AuthMode
    effectiveAuthMode: AuthMode
    nodeEnvClass: "production" | "non_production_or_unset"
    devUserEmailSource: "default_contract" | "custom_env"
    supabasePublicUrlPresent: boolean
    supabasePublishableOrAnonKeyPresent: boolean
  }
  proof: {
    latestGeneratedAt: string
    overallStatus: AuthBoundaryProofStatus
    boundaryStatus: AuthBoundaryProofStatus
    canUseLocalDemo: boolean
    canCollectSignedInAuthProof: boolean
    canRunAuth005: boolean
    nextAction: string
  }
  prohibitedExposure: string[]
  rows: AdminReadinessRow[]
}

export type OperatingSurfaceMaturityState =
  | "db_backed"
  | "formal_readiness"
  | "mock_or_shell"
  | "gated"
  | "blocked"

export type OperatingSurfaceMaturityRow = {
  module: string
  surfaceState: OperatingSurfaceMaturityState
  mode: string
  dbState: string
  agentWorkspace: string
  recordsAudit: string
  settingsBoundary: string
  apiCli: string
  nextTask: string
  risk: string
  tone: AdminReadinessTone
}

export type OperatingSurfaceMaturityContract = {
  id: "SURFACE-MATURITY-002"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"admin" | "settings">
  source: {
    researchDoc: string
    maturityTarget: string
    acceptanceDoc: string
    backlogTask: "SURFACE-MATURITY-002"
  }
  summary: {
    moduleCount: number
    dbBackedCount: number
    formalReadinessCount: number
    mockOrShellCount: number
    highRiskCount: number
    apiCliReadyCount: number
    nextTask: string
    blockedBy: string[]
  }
  prohibitedExposure: string[]
  rows: OperatingSurfaceMaturityRow[]
}

export type AIInputSourceWorkflowOpsReadinessState =
  | "complete"
  | "ready_boundary"
  | "dry_run_only"
  | "blocked"
  | "human_approval_required"

export type AIInputSourceWorkflowOpsReadinessRow = {
  area: string
  state: AIInputSourceWorkflowOpsReadinessState
  status: string
  signal: string
  nextAction: string
  boundary: string
  ownerRunCommand?: string
  tone: AdminReadinessTone
}

export type AIInputSourceWorkflowOpsReadinessContract = {
  id: "AIINPUT-OPS-003"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"admin" | "settings">
  source: {
    formalReadDto: string
    splitContract: string
    schemaReview: string
    proofTarget: string
    connectorBoundary: string
    sourceControlMatrix: string
    migrationDraft: string
    proofRunner: string
    localProofBootstrap: string
    serviceRuntime: string
    rlsAuditStorage: string
	    connectorRuntimeApproval: string
	    opsSurface: string
	    proofTargetHandoff: string
	    researchReport: string
	    acceptanceDoc: string
	  }
  summary: {
    rowCount: number
    completeCount: number
    readyBoundaryCount: number
    dryRunOnlyCount: number
    blockedCount: number
    humanApprovalRequiredCount: number
	    proofTargetStatus: string
	    localProofPacketStatus: string
	    localProofCheckerStatus: string
	    latestLocalProofPacketPath: string
	    proofTargetHandoffStatus: string
	    proofTargetHandoffMissingCount: number
	    proofTargetHandoffEvidenceTarget: string
	    nextTask: string
	  }
  requiredObjects: readonly string[]
  prohibitedExposure: string[]
  proofBootstrap: AIInputSourceWorkflowProofBootstrapContract
  rows: AIInputSourceWorkflowOpsReadinessRow[]
}

export type BackendOperationCatalogSurfaceRow = BackendOperationCatalogRow & {
  tone: AdminReadinessTone
  safetySummary: string
}

export type BackendOperationCatalogSurfaceContract = {
  id: "BACKEND-OPS-002"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"admin" | "settings">
  source: {
    sourceContract: BackendOperationCatalogContract["id"]
    contractFile: string
    acceptanceDoc: string
    backlogTask: "BACKEND-OPS-002"
    checkerCommand: string
    referencePattern: string
  }
  pageRequirementUnderstanding: {
    score: 86
    level: "High"
    requiredResearchRounds: 3
    completedResearchRounds: 3
    selectedPattern: string
    rejectedPatterns: string[]
  }
  summary: {
    operationCount: number
    readyLikeCount: number
    ownerRunCount: number
    dryRunOnlyCount: number
    approvalRequiredCount: number
    blockedCount: number
    highRiskCount: number
    routeHandlerCount: number
    serverActionCount: number
    serviceLoaderCount: number
    cliCheckCommandCount: number
    agentDryRunCount: number
    ownerRunProofCommandCount: number
    publicOpenApiExported: false
    publicRouteAdded: false
    externalRegistrationEnabled: false
    nextTask: string
  }
  ownerActions: string[]
  prohibitedExposure: string[]
  rows: BackendOperationCatalogSurfaceRow[]
}

export type WorkProofEvidenceSurfaceFamily = WorkProofEvidenceFamily | "overall"

export type WorkProofEvidenceSurfaceRow = {
  family: WorkProofEvidenceSurfaceFamily
  label: string
  status: string
  path: string
  signal: string
  nextAction: string
  tone: AdminReadinessTone
}

export type WorkProofEvidenceSurfaceContract = {
  id: "ADMIN-OPS-003-WORK-PROOF-EVIDENCE-SURFACE"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"admin" | "settings">
  source: {
    sourceContract: WorkProofLatestEvidenceContract["id"]
    resolver: "resolveWorkProofEvidence"
    checkerCommand: "pnpm work:proof-evidence:check"
    acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
    backlogTask: "ADMIN-OPS-003-WORK-PROOF-EVIDENCE-SURFACE"
    nextJsDocs: readonly string[]
  }
  pageRequirementUnderstanding: {
    score: 93
    level: "High"
    requiredResearchRounds: 3
    completedResearchRounds: 3
    selectedPattern: string
    rejectedPatterns: string[]
  }
  summary: {
    rowCount: number
    freshness: WorkProofEvidenceFreshness
    latestOverallPacketPath: string
    latestOverallStatus: string
    latestAgeMinutes: number | null
    canRunWork009: boolean
    canRunDockerProof: boolean
    canRunLocalProof: boolean
    workProofPassed: boolean
    sourceStaticReady: boolean
    blockedLikeCount: number
    nextOwnerAction: string
    nextTask: string
    launchLevelUpgradeClaimed: false
    work009Claimed: false
  }
  safety: WorkProofLatestEvidenceContract["safety"] & {
    rendersRawPacketBody: false
    uiExecutesCommands: false
    launchLevelUpgradeClaimed: false
    work009Claimed: false
  }
  rows: WorkProofEvidenceSurfaceRow[]
}

export type ScenarioJourneyState = "usable" | "partial" | "blocked" | "not_started"

export type ScenarioJourneyRow = {
  scenario: string
  actor: string
  entrySurface: string
  currentExperience: string
  missingExperience: string
  nextAction: string
  linkedTask: string
  tone: AdminReadinessTone
  state: ScenarioJourneyState
}

export type ScenarioJourneyContract = {
  id: "SCENARIO-001"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"admin" | "settings">
  source: {
    situationPrd: string
    maturityResearch: string
    operatingSurfaceResearch: string
    resourceIndexContract: string
  }
  summary: {
    scenarioCount: number
    usableCount: number
    partialCount: number
    blockedCount: number
    nextTask: string
    primaryExperienceGap: string
  }
  rows: ScenarioJourneyRow[]
}

export type DailyCommandCenterLane =
  | "proof"
  | "operate"
  | "capture"
  | "agent"
  | "admin"
  | "real_data"

export type DailyCommandCenterAction = {
  id: string
  lane: DailyCommandCenterLane
  title: string
  status: string
  actor: string
  href: string
  hrefLabel: string
  sourceScenario: string
  linkedTask: string
  signal: string
  nextAction: string
  boundary: string
  tone: AdminReadinessTone
}

export type DailyCommandCenterContract = {
  id: "SCENARIO-002"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"dashboard">
  source: {
    scenarioContract: "SCENARIO-001"
    maturityResearch: string
    operatingSurfaceResearch: string
    acceptanceDoc: string
  }
  summary: {
    actionCount: number
    blockedCount: number
    warningCount: number
    launchLevel: string
    nextLoop: string
    nextRecommendedTask: string
    primaryAction: string
  }
  prohibitedWrites: string[]
  ownerEvidenceConsoleContract: OwnerEvidenceConsoleContract
  actions: DailyCommandCenterAction[]
}

export type OwnerEvidenceConsoleRow = {
  id: string
  priority: number
  surface: string
  status: string
  ownerAction: string
  command: string
  evidenceTarget: string
  passSignal: string
  failSignal: string
  linkedTask: string
  blocker: string
  tone: AdminReadinessTone
}

export type OwnerEvidenceConsoleContract = {
  id: "OWNER-EVIDENCE-001"
  status: "read_only_active"
  generatedAt: string
  sharedBy: Array<"dashboard" | "admin" | "settings">
  source: {
    maturityResearch: string
    operatingSurfaceResearch: string
    launchProofChecklist: string
    authProofChecklist: string
    workProofChecklist: string
    loop68ResearchReport: string
  }
  summary: {
    rowCount: number
    blockedCount: number
    ownerRunCount: number
    readyCount: number
    primaryOwnerAction: string
    nextTask: string
  }
  prohibitedExposure: string[]
  rows: OwnerEvidenceConsoleRow[]
}

export type AdminLaunchConsole = {
  generatedAt: string
  auth: {
    mode: "mock" | "supabase"
    status: AuthResolutionStatus
    email: string
    hasSupabaseConfig: boolean
  }
  loop: {
    automationId: string
    cadence: string
    currentLevel: string
    targetNextLevel: string
    currentLoop: string
    nextLoop: string
    nextRecommendedTask: string
    lastCompletedTask: string
    lastCompletedReport: string
  }
  summaryItems: AdminSummaryItem[]
  moduleRows: AdminReadinessRow[]
  environmentRows: AdminReadinessRow[]
  launchBlockers: AdminReadinessRow[]
  ownerAuthBoundaryContract: OwnerAuthBoundaryContract
  scenarioJourneyContract: ScenarioJourneyContract
  operatingSurfaceMaturityContract: OperatingSurfaceMaturityContract
  ownerEvidenceConsoleContract: OwnerEvidenceConsoleContract
  launchReadinessHistoryContract: LaunchReadinessHistoryContract
  launchOperatorActionRegistryContract: LaunchOperatorActionRegistryContract
  backendOperationCatalogSurfaceContract: BackendOperationCatalogSurfaceContract
  workProofEvidenceSurfaceContract: WorkProofEvidenceSurfaceContract
  aiInputSourceWorkflowOpsReadinessContract: AIInputSourceWorkflowOpsReadinessContract
  auditContract: AdminAuditBffContract
  clientPortalContract: ClientPortalReadinessContract
  agentProtocolContract: AgentProtocolReadinessContract
  recentEvidence: AdminEvidenceRow[]
}

export type AdminLaunchOverview = Pick<
  AdminLaunchConsole,
  "generatedAt" | "loop" | "summaryItems" | "launchBlockers"
>

export type AdminOwnerEvidenceSection = Pick<
  AdminLaunchConsole,
  "generatedAt" | "loop" | "summaryItems" | "launchBlockers" | "ownerEvidenceConsoleContract"
>

const LOOP_STATE_PATH = "docs/2_agent-input/generated/agent-loop/loop-state.json"
const REPORT_DIR = "docs/2_agent-input/generated/agent-loop/reports"
const RECENT_EVIDENCE_LIMIT = 6
const RECENT_PROOF_PACKET_LIMIT = 12
const AUTH_BOUNDARY_DOC = "docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md"
const AUTH_BOUNDARY_SCRIPT = "scripts/check-owner-account-boundary.mjs"
const AUTH_BOUNDARY_COMMAND = "pnpm auth:boundary"

const authStatusLabels: Record<AuthResolutionStatus, string> = {
  authenticated: "Authenticated",
  mock_profile_missing: "Mock profile missing",
  supabase_config_missing: "Supabase env missing",
  supabase_session_missing: "Session missing",
  supabase_profile_missing: "Profile missing",
}

const permissionSourceLabels: Record<ModulePermissionSnapshot["source"], string> = {
  database: "DB hybrid",
  role_default: "role default",
  browser_override: "browser override",
  unauthenticated: "unauthenticated",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toLoopState(value: unknown): LoopState {
  if (!isRecord(value)) return {}
  return value as LoopState
}

async function readLoopState(): Promise<LoopState> {
  try {
    const contents = await readFile(path.join(process.cwd(), LOOP_STATE_PATH), "utf8")
    return toLoopState(JSON.parse(contents))
  } catch {
    return {}
  }
}

function firstHeading(contents: string, fallback: string) {
  const heading = contents
    .split("\n")
    .find((line) => line.startsWith("# "))

  return heading?.replace(/^#\s+/, "").trim() || fallback
}

async function readRecentEvidence(): Promise<AdminEvidenceRow[]> {
  try {
    const reportDir = path.join(process.cwd(), REPORT_DIR)
    const names = (await readdir(reportDir)).filter((name) => name.endsWith(".md"))

    const candidates = await Promise.all(
      names.map(async (name) => {
        const absolutePath = path.join(reportDir, name)
        const fileStat = await stat(absolutePath)

        return {
          name,
          absolutePath,
          mtime: fileStat.mtime,
          mtimeMs: fileStat.mtimeMs,
        }
      })
    )

    const recentCandidates = candidates
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, RECENT_EVIDENCE_LIMIT)

    const reports = await Promise.all(
      recentCandidates.map(async ({ name, absolutePath, mtime }) => {
        const contents = await readFile(absolutePath, "utf8")

        return {
          title: firstHeading(contents, name),
          path: `${REPORT_DIR}/${name}`,
          updatedAt: mtime.toISOString(),
        }
      })
    )

    return reports
  } catch {
    return []
  }
}

type GeneratedProofPacket = {
  path: string
  updatedAt: string
  payload: Record<string, unknown>
  mtimeMs: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function readRecordPath(record: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  let current: Record<string, unknown> | null = record

  for (const key of keys) {
    if (!current) return null
    current = asRecord(current[key])
  }

  return current
}

function readStringPath(record: Record<string, unknown>, keys: string[]): string | null {
  const lastKey = keys.at(-1)
  if (!lastKey) return null

  const parent = keys.length === 1 ? record : readRecordPath(record, keys.slice(0, -1))
  const value = parent?.[lastKey]

  return typeof value === "string" ? value : null
}

function readBooleanPath(record: Record<string, unknown>, keys: string[]): boolean | null {
  const lastKey = keys.at(-1)
  if (!lastKey) return null

  const parent = keys.length === 1 ? record : readRecordPath(record, keys.slice(0, -1))
  const value = parent?.[lastKey]

  return typeof value === "boolean" ? value : null
}

function readStringArrayPath(record: Record<string, unknown>, keys: string[]): string[] {
  const lastKey = keys.at(-1)
  if (!lastKey) return []

  const parent = keys.length === 1 ? record : readRecordPath(record, keys.slice(0, -1))
  const value = parent?.[lastKey]

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

async function readJsonEvidencePackets(nameIncludes: string[]): Promise<GeneratedProofPacket[]> {
  try {
    const reportDir = path.join(process.cwd(), REPORT_DIR)
    const names = (await readdir(reportDir)).filter(
      (name) =>
        name.endsWith(".json") && nameIncludes.every((marker) => reportNameMatchesEvidenceMarker(name, marker))
    )

    const candidates = await Promise.all(
      names.map(async (name) => {
        const absolutePath = path.join(reportDir, name)
        const fileStat = await stat(absolutePath)

        return {
          name,
          absolutePath,
          mtime: fileStat.mtime,
          mtimeMs: fileStat.mtimeMs,
        }
      })
    )

    const recentCandidates = candidates
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, RECENT_PROOF_PACKET_LIMIT)

    const packets = await Promise.all(
      recentCandidates.map(async ({ name, absolutePath, mtime, mtimeMs }) => {
        const contents = await readFile(absolutePath, "utf8")
        const parsed = JSON.parse(contents)

        if (!isRecord(parsed)) return null

        return {
          path: `${REPORT_DIR}/${name}`,
          updatedAt: mtime.toISOString(),
          payload: parsed,
          mtimeMs,
        }
      })
    )

    return packets
      .filter((packet): packet is GeneratedProofPacket => packet !== null)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
  } catch {
    return []
  }
}

function reportNameMatchesEvidenceMarker(name: string, marker: string) {
  if (marker === "launch-proof") return /(^|-)launch-proof\.json$/.test(name)
  if (marker === "auth-proof") return /(^|-)auth-proof\.json$/.test(name)
  if (marker === "work-proof-target-readiness") return /(^|-)work-proof-target-readiness\.json$/.test(name)
  return name.includes(marker)
}

function normalizeLaunchHistoryStatus(
  value: string | null,
  fallback: LaunchReadinessHistoryStatus = "unknown"
): LaunchReadinessHistoryStatus {
  if (!value) return fallback
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_")

  if (normalized.includes("failed") || normalized.includes("error")) return "failed"
  if (normalized.includes("needs_operator_input")) return "needs_operator_input"
  if (normalized.includes("owner_run")) return "owner_run"
  if (normalized.includes("blocked")) return "blocked"
  if (normalized.includes("ready") || normalized.includes("target_signaled")) return "ready"
  if (normalized.includes("passed") || normalized.includes("success")) return "passed"
  if (normalized.includes("not_collected") || normalized.includes("missing")) return "not_collected"

  return fallback
}

function launchHistoryTone(status: LaunchReadinessHistoryStatus): LaunchReadinessHistoryTone {
  if (status === "passed" || status === "ready") return "good"
  if (status === "blocked" || status === "failed") return "blocked"
  if (status === "owner_run" || status === "needs_operator_input" || status === "not_collected") return "warn"
  return "neutral"
}

function proofGeneratedAt(packet: GeneratedProofPacket | null) {
  if (!packet) return "not_collected"
  return readStringPath(packet.payload, ["generatedAt"]) ?? packet.updatedAt
}

function blockedLabelsFromRows(packet: GeneratedProofPacket | null): string[] {
  const rows = packet ? readRecordPath(packet.payload, ["readiness"])?.rows : null
  if (!Array.isArray(rows)) return []

  return rows
    .filter((row): row is Record<string, unknown> => isRecord(row))
    .filter((row) => row.status === "blocked")
    .map((row) => (typeof row.label === "string" ? row.label : null))
    .filter((label): label is string => Boolean(label))
}

function latestPath(packet: GeneratedProofPacket | null) {
  return packet?.path ?? "not_collected"
}

function buildLaunchHistoryRow({
  label,
  surface,
  status,
  packet,
  attemptCount,
  blockers,
  passSignal,
  failSignal,
  nextAction,
  linkedTask,
  sourceKind,
}: Omit<LaunchReadinessHistoryRow, "tone" | "latestProofPath" | "latestGeneratedAt"> & {
  packet: GeneratedProofPacket | null
}): LaunchReadinessHistoryRow {
  return {
    surface,
    label,
    status,
    tone: launchHistoryTone(status),
    latestProofPath: latestPath(packet),
    latestGeneratedAt: proofGeneratedAt(packet),
    attemptCount,
    blockers,
    passSignal,
    failSignal,
    nextAction,
    linkedTask,
    sourceKind,
  }
}

export async function buildLaunchReadinessHistoryContract({
  loopState,
  recentEvidence = [],
}: {
  loopState: LoopState
  recentEvidence?: AdminEvidenceRow[]
}): Promise<LaunchReadinessHistoryContract> {
  const [launchProofs, authProofs, workTargetProofs, historyChecks] = await Promise.all([
    readJsonEvidencePackets(["launch-proof"]),
    readJsonEvidencePackets(["auth-proof"]),
    readJsonEvidencePackets(["work-proof-target-readiness"]),
    readJsonEvidencePackets(["launch-readiness-history-check"]),
  ])

  const latestLaunch = launchProofs[0] ?? null
  const latestAuth = authProofs[0] ?? null
  const latestWorkTarget = workTargetProofs[0] ?? null
  const latestHistoryCheck = historyChecks[0] ?? null
  const launchProofSummary = latestLaunch ? readRecordPath(latestLaunch.payload, ["proofSummary"]) : null
  const authProofSummary = latestAuth ? readRecordPath(latestAuth.payload, ["proofSummary"]) : null
  const workCanRun = latestWorkTarget ? readBooleanPath(latestWorkTarget.payload, ["canRunWork009"]) : false
  const deploymentMarkerPresent = latestLaunch
    ? readBooleanPath(latestLaunch.payload, ["readiness", "checks", "deploymentMarkerPresent"])
    : false
  const launchBlockers =
    latestLaunch ? readStringArrayPath(latestLaunch.payload, ["proofSummary", "blockedLabels"]) : []
  const authBlockers =
    latestAuth ? readStringArrayPath(latestAuth.payload, ["proofSummary", "blockedLabels"]) : []
  const workBlockers = latestWorkTarget ? readStringArrayPath(latestWorkTarget.payload, ["missing"]) : []

  const rows: LaunchReadinessHistoryRow[] = [
    buildLaunchHistoryRow({
      surface: "launch",
      label: "Launch proof",
      status: normalizeLaunchHistoryStatus(
        readStringPath(launchProofSummary ?? {}, ["overallStatus"]) ??
          readStringPath(latestLaunch?.payload ?? {}, ["readiness", "overallStatus"]),
        latestLaunch ? "unknown" : "not_collected"
      ),
      packet: latestLaunch,
      attemptCount: launchProofs.length,
      blockers: launchBlockers.length > 0 ? launchBlockers : blockedLabelsFromRows(latestLaunch),
      passSignal: "overallStatus is ready or canClaimL1 is true with required launch prerequisites present.",
      failSignal: "overallStatus is blocked, canClaimL1 is false, or missing labels include Supabase public env.",
      nextAction:
        readStringArrayPath(latestLaunch?.payload ?? {}, ["nextActions"])[0] ??
        "Run pnpm launch:proof after configuring launch environment inputs.",
      linkedTask: "AUTH-005",
      sourceKind: "generated_proof",
    }),
    buildLaunchHistoryRow({
      surface: "auth",
      label: "Auth session proof",
      status: normalizeLaunchHistoryStatus(
        readStringPath(authProofSummary ?? {}, ["overallStatus"]),
        latestAuth ? "unknown" : "not_collected"
      ),
      packet: latestAuth,
      attemptCount: authProofs.length,
      blockers: authBlockers,
      passSignal: "canRunAuth005 is true and sanitized /auth/status evidence is signed-in, Profile-mapped, and owner-scoped.",
      failSignal: "canRunAuth005 is false, auth status evidence is missing, or Profile mapping fails.",
      nextAction:
        readStringPath(authProofSummary ?? {}, ["nextAction"]) ??
        "Collect signed-in /auth/status evidence, then rerun pnpm auth:proof.",
      linkedTask: "AUTH-005",
      sourceKind: "generated_proof",
    }),
    buildLaunchHistoryRow({
      surface: "work",
      label: "Work proof target",
      status: workCanRun
        ? "ready"
        : normalizeLaunchHistoryStatus(
            readStringPath(latestWorkTarget?.payload ?? {}, ["status"]),
            latestWorkTarget ? "unknown" : "not_collected"
          ),
      packet: latestWorkTarget,
      attemptCount: workTargetProofs.length,
      blockers: workBlockers,
      passSignal: "canRunWork009 is true with an approved local/disposable target and write confirmations.",
      failSignal: "canRunWork009 is false, target is missing/unsafe, or write confirmations are absent.",
      nextAction:
        readStringArrayPath(latestWorkTarget?.payload ?? {}, ["nextActions"])[0] ??
        "Provide an explicit local/disposable WORK_PROOF_DATABASE_URL and confirmations before WORK-009.",
      linkedTask: "WORK-009",
      sourceKind: "generated_proof",
    }),
    buildLaunchHistoryRow({
      surface: "deployment",
      label: "Deployment marker",
      status: deploymentMarkerPresent ? "ready" : latestLaunch ? "blocked" : "not_collected",
      packet: latestLaunch,
      attemptCount: launchProofs.length,
      blockers: deploymentMarkerPresent ? [] : ["Deployment marker"],
      passSignal: "Deployment marker exists and launch proof no longer blocks on local-only prerequisites.",
      failSignal: "VERCEL_ENV or equivalent deployment marker is missing, or auth/Work proof remains absent.",
      nextAction:
        "Collect deployment marker proof only after auth/session and Work proof are meaningful.",
      linkedTask: "DEPLOY-002",
      sourceKind: "runtime_boundary",
    }),
    buildLaunchHistoryRow({
      surface: "owner-ui",
      label: "Owner interface review",
      status: "owner_run",
      packet: null,
      attemptCount: 0,
      blockers: ["Owner visual review"],
      passSignal:
        "Owner confirms each page supports scan, select, draft/proposal action, records/audit, and settings/boundary review.",
      failSignal: "A module still feels placeholder-only, text overflows, or a primary actor action is missing.",
      nextAction: "Run the owner UI review manually; do not spend extra loops collecting adjacent evidence.",
      linkedTask: "OWNER-UI-REVIEW",
      sourceKind: "owner_handoff",
    }),
    buildLaunchHistoryRow({
      surface: "admin-ops",
      label: "Launch readiness history",
      status: latestHistoryCheck
        ? normalizeLaunchHistoryStatus(readStringPath(latestHistoryCheck.payload, ["status"]), "ready")
        : "ready",
      packet: latestHistoryCheck,
      attemptCount: Math.max(historyChecks.length, 1),
      blockers: [],
      passSignal: "ADMIN-OPS-001 contract/checker exists and protected admin/settings render normalized no-secret history.",
      failSignal: "Contract markers, page integration, no-secret boundary, or proof packet parsing regresses.",
      nextAction: "Run pnpm launch:history:check after changes to admin readiness history.",
      linkedTask: "ADMIN-OPS-001",
      sourceKind: "contract_check",
    }),
  ]

  const readyCount = rows.filter((row) => row.status === "ready" || row.status === "passed").length
  const blockedCount = rows.filter((row) => row.tone === "blocked").length
  const ownerRunCount = rows.filter((row) => row.status === "owner_run").length
  const latestProofCount = rows.filter((row) => row.latestProofPath !== "not_collected").length
  const primaryBlockedRow = rows.find((row) => row.tone === "blocked")
  const primaryWarnRow = rows.find((row) => row.tone === "warn")

  return {
    id: "ADMIN-OPS-001",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    source: LAUNCH_READINESS_HISTORY_SOURCE,
    summary: {
      surfaceCount: LAUNCH_READINESS_HISTORY_REQUIRED_SURFACES.length,
      readyCount,
      blockedCount,
      ownerRunCount,
      latestProofCount,
      launchLevel: loopState.launchLevels?.current ?? "unknown",
      primaryBlocker:
        primaryBlockedRow?.blockers[0] ??
        primaryWarnRow?.blockers[0] ??
        "No current generated blocker in launch readiness history.",
      nextTask:
        loopState.loopProgress?.nextRecommendedTask ??
        "AUTH-005 if auth evidence appears; WORK-009 if proof target appears; otherwise next fifth-loop review.",
    },
    evidenceSource: {
      proofDirectory: LAUNCH_READINESS_HISTORY_SOURCE.proofDirectory,
      latestReportPaths: recentEvidence.slice(0, 3).map((row) => row.path),
    },
    prohibitedExposure: LAUNCH_READINESS_HISTORY_PROHIBITED_EXPOSURE,
    rows,
  }
}

export async function getLaunchReadinessHistoryContract(): Promise<LaunchReadinessHistoryContract> {
  const [loopState, recentEvidence] = await Promise.all([readLoopState(), readRecentEvidence()])

  return buildLaunchReadinessHistoryContract({
    loopState,
    recentEvidence,
  })
}

function toAuthBoundaryProofPayload(value: unknown): AuthBoundaryProofPayload {
  if (!isRecord(value)) return {}
  return value as AuthBoundaryProofPayload
}

async function readLatestAuthBoundaryProof(): Promise<LatestAuthBoundaryProof | null> {
  try {
    const reportDir = path.join(process.cwd(), REPORT_DIR)
    const names = (await readdir(reportDir)).filter(
      (name) => name.endsWith(".json") && name.includes("auth-boundary-proof")
    )

    const candidates = await Promise.all(
      names.map(async (name) => {
        const absolutePath = path.join(reportDir, name)
        const fileStat = await stat(absolutePath)

        return {
          name,
          absolutePath,
          mtime: fileStat.mtime,
          mtimeMs: fileStat.mtimeMs,
        }
      })
    )

    const latest = candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
    if (!latest) return null
    const contents = await readFile(latest.absolutePath, "utf8")

    return {
      path: `${REPORT_DIR}/${latest.name}`,
      updatedAt: latest.mtime.toISOString(),
      payload: toAuthBoundaryProofPayload(JSON.parse(contents)),
    }
  } catch {
    return null
  }
}

function envRow({
  area,
  envNames,
  requiredFor,
  nextAction,
}: {
  area: string
  envNames: string[]
  requiredFor: string
  nextAction: string
}): AdminReadinessRow {
  const present = envNames.some((name) => Boolean(process.env[name]))

  return {
    area,
    status: present ? "present" : "missing",
    signal: `${envNames.join(" or ")} for ${requiredFor}`,
    nextAction: present ? "No secret value is displayed here." : nextAction,
    tone: present ? "good" : "blocked",
  }
}

function levelTone(level: string): AdminReadinessTone {
  if (level.startsWith("L0")) return "warn"
  if (level.startsWith("L1")) return "neutral"
  return "good"
}

function statusTone(status: AuthResolutionStatus): AdminReadinessTone {
  if (status === "authenticated") return "good"
  if (status === "supabase_config_missing") return "blocked"
  return "warn"
}

function authBoundaryTone(status: AuthBoundaryProofStatus): AdminReadinessTone {
  if (status === "ready") return "good"
  if (status === "blocked") return "blocked"
  if (status === "warn") return "warn"
  return "neutral"
}

function boolStatus(value: boolean, readyLabel: string, blockedLabel = "blocked") {
  return value ? readyLabel : blockedLabel
}

function buildOwnerAuthBoundaryContract(latestProof: LatestAuthBoundaryProof | null): OwnerAuthBoundaryContract {
  const requestedAuthMode = getRequestedAuthMode()
  const effectiveAuthMode = getAuthRuntimeMode()
  const runtime = {
    requestedAuthMode,
    effectiveAuthMode,
    nodeEnvClass: process.env.NODE_ENV === "production" ? "production" : "non_production_or_unset",
    devUserEmailSource: process.env.PERSONAL_OS_DEV_USER_EMAIL ? "custom_env" : "default_contract",
    supabasePublicUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabasePublishableOrAnonKeyPresent: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  } satisfies OwnerAuthBoundaryContract["runtime"]
  const proofSummary = latestProof?.payload.proofSummary
  const supabasePublicEnvReady =
    runtime.supabasePublicUrlPresent && runtime.supabasePublishableOrAnonKeyPresent
  const overallStatus = proofSummary?.overallStatus ?? "unknown"
  const boundaryStatus = proofSummary?.boundaryStatus ?? "unknown"
  const canUseLocalDemo =
    proofSummary?.canUseLocalDemo ?? (runtime.effectiveAuthMode === "mock" && runtime.nodeEnvClass !== "production")
  const canCollectSignedInAuthProof =
    proofSummary?.canCollectSignedInAuthProof ??
    (runtime.effectiveAuthMode === "supabase" && supabasePublicEnvReady)
  const canRunAuth005 = proofSummary?.canRunAuth005 ?? false
  const nextAction =
    proofSummary?.nextAction ??
    (canCollectSignedInAuthProof
      ? "Collect sanitized signed-in /auth/status JSON and run pnpm auth:proof."
      : "Configure Supabase public env, then collect signed-in /auth/status evidence.")

  return {
    id: "AUTH-MATURITY-002",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    source: {
      command: AUTH_BOUNDARY_COMMAND,
      latestProofPath: latestProof?.path ?? "not_collected",
      architectureDoc: AUTH_BOUNDARY_DOC,
      proofScript: AUTH_BOUNDARY_SCRIPT,
    },
    runtime,
    proof: {
      latestGeneratedAt: latestProof?.payload.generatedAt ?? latestProof?.updatedAt ?? "not_collected",
      overallStatus,
      boundaryStatus,
      canUseLocalDemo,
      canCollectSignedInAuthProof,
      canRunAuth005,
      nextAction,
    },
    prohibitedExposure: [
      "Supabase URLs",
      "Supabase publishable or anon keys",
      "database URLs or hosts",
      "cookies or tokens",
      "raw auth claims",
      "provider payloads",
      "profile IDs",
      "actual profile email values",
    ],
    rows: [
      {
        area: "Latest auth boundary proof",
        status: latestProof ? overallStatus : "not collected",
        signal: latestProof
          ? `Latest no-secret proof is ${latestProof.path}; boundary status is ${boundaryStatus}.`
          : "No auth-boundary proof JSON was found in the generated loop evidence directory.",
        nextAction: latestProof ? nextAction : `Run ${AUTH_BOUNDARY_COMMAND} before claiming boundary evidence.`,
        tone: latestProof ? authBoundaryTone(overallStatus) : "warn",
      },
      {
        area: "Seeded demo and mock auth boundary",
        status: boundaryStatus,
        signal:
          boundaryStatus === "ready"
            ? "Seeded demo, explicit development mock mode, and production mock guard are coherent without showing identity values."
            : "The demo/mock boundary is not proven ready by the latest auth-boundary artifact.",
        nextAction:
          boundaryStatus === "ready"
            ? "Keep local demo use separate from real owner Supabase proof."
            : `Review ${AUTH_BOUNDARY_DOC} and rerun ${AUTH_BOUNDARY_COMMAND}.`,
        tone: authBoundaryTone(boundaryStatus),
      },
      {
        area: "Current auth runtime mode",
        status: runtime.effectiveAuthMode === "mock" ? "local demo only" : "supabase runtime",
        signal: `Requested mode is ${runtime.requestedAuthMode}; effective mode is ${runtime.effectiveAuthMode}; env class is ${runtime.nodeEnvClass}.`,
        nextAction:
          runtime.effectiveAuthMode === "mock"
            ? "Use mock mode only for local/disposable UI rehearsal."
            : "Continue toward signed-in Supabase owner proof.",
        tone: runtime.effectiveAuthMode === "mock" ? "warn" : "neutral",
      },
      {
        area: "Supabase owner proof preconditions",
        status: boolStatus(canCollectSignedInAuthProof, "ready for signed-in proof"),
        signal: `Public URL present: ${runtime.supabasePublicUrlPresent ? "yes" : "no"}; publishable key present: ${
          runtime.supabasePublishableOrAnonKeyPresent ? "yes" : "no"
        }; no values are displayed.`,
        nextAction: canCollectSignedInAuthProof
          ? "Collect sanitized signed-in /auth/status evidence."
          : "Configure Supabase public env in the intended launch target.",
        tone: canCollectSignedInAuthProof ? "good" : "blocked",
      },
      {
        area: "AUTH-005 handoff",
        status: boolStatus(canRunAuth005, "ready"),
        signal: "AUTH-005 still requires launch proof, auth proof, signed-in /auth/status evidence, and owner-scoped Work smoke.",
        nextAction: canRunAuth005
          ? "Run AUTH-005 with the sanitized proof packet."
          : "Do not claim real owner login until auth:proof reports canRunAuth005=true.",
        tone: canRunAuth005 ? "good" : "blocked",
      },
    ],
  }
}

export async function getOwnerAuthBoundaryContract(): Promise<OwnerAuthBoundaryContract> {
  const latestProof = await readLatestAuthBoundaryProof()
  return buildOwnerAuthBoundaryContract(latestProof)
}

export function buildOperatingSurfaceMaturityContract(): OperatingSurfaceMaturityContract {
  const rows: OperatingSurfaceMaturityRow[] = [
    {
      module: "Work",
      surfaceState: "db_backed",
      mode: "seed demo plus DB-backed service path",
      dbState: "Operational Prisma models and owner-scoped services; full refresh proof still needs WORK-009.",
      agentWorkspace: "No owner-run agent operation surface yet.",
      recordsAudit: "Work records are real; persisted readiness/audit events are not implemented.",
      settingsBoundary: "Protected owner shell plus owner/demo auth boundary.",
      apiCli: "No owner operation API/CLI contract yet.",
      nextTask: "WORK-009",
      risk: "Medium: safe proof DB target and write confirmations are required.",
      tone: "warn",
    },
    {
      module: "Research",
      surfaceState: "mock_or_shell",
      mode: "UI-complete mock/state surface",
      dbState: "No reviewed persistence model for research objects.",
      agentWorkspace: "Research assistance is not a bounded module agent workspace yet.",
      recordsAudit: "No persisted research record audit trail.",
      settingsBoundary: "Protected shell only.",
      apiCli: "No API/CLI operation contract.",
      nextTask: "SURFACE-MATURITY-003",
      risk: "Medium: schema and actor workflow still need a narrow task split.",
      tone: "warn",
    },
    {
      module: "AI Input",
      surfaceState: "formal_readiness",
      mode: "formal readiness plus mock kill-switch",
      dbState:
        "DATTR-024A/B/C/D/E are complete as formal DTO, schema review, proof-target boundary, proposal-action contract, and connector boundary; persistence remains blocked.",
      agentWorkspace:
        "AI Input workbench is visible; proposal-action and connector-boundary commands are contracted, but runtime server actions and connector runtime still need proof/authz/audit approval.",
      recordsAudit: "Source Workflow maps to ai-input.source-workflow audit refs, but persisted audit rows are not implemented.",
      settingsBoundary: "Protected shell exposes formal-mode and proof-readiness boundary.",
      apiCli: "No owner operation API/CLI contract.",
      nextTask: "DATTR-024",
      risk: "Medium: reachable DB proof, migration approval, authz, audit storage, and connector runtime approval are still required before persistence.",
      tone: "warn",
    },
    {
      module: "Workflow",
      surfaceState: "mock_or_shell",
      mode: "workflow concept and proposal surface",
      dbState: "Partial/proposal only.",
      agentWorkspace: "Agent/workflow routing concepts exist; runtime operation queue is not live.",
      recordsAudit: "No persisted run/event trail.",
      settingsBoundary: "Protected shell only.",
      apiCli: "No dry-run operation contract yet.",
      nextTask: "AGENT-OPS-001",
      risk: "High: agent writes and routing require NANDA gate and approval policy.",
      tone: "blocked",
    },
    {
      module: "Life",
      surfaceState: "mock_or_shell",
      mode: "FOPS shell",
      dbState: "No DB-backed life context persistence.",
      agentWorkspace: "No bounded Life agent workspace.",
      recordsAudit: "No persisted private-life audit trail.",
      settingsBoundary: "Protected shell; high-risk final writes require approval.",
      apiCli: "No API/CLI operation contract.",
      nextTask: "REALDATA-001",
      risk: "High: private life context must remain proposal-only before explicit approval.",
      tone: "blocked",
    },
    {
      module: "Finance",
      surfaceState: "mock_or_shell",
      mode: "FOPS shell and high-risk stub",
      dbState: "No DB-backed financial records.",
      agentWorkspace: "No bounded Finance agent workspace.",
      recordsAudit: "No persisted finance audit trail.",
      settingsBoundary: "Protected shell; financial writes require human approval.",
      apiCli: "No API/CLI operation contract.",
      nextTask: "REALDATA-001",
      risk: "High: finance remains draft/review only.",
      tone: "blocked",
    },
    {
      module: "Chamber",
      surfaceState: "mock_or_shell",
      mode: "CRM proposal/shell",
      dbState: "No approved chamber CRM persistence.",
      agentWorkspace: "No bounded relationship agent workspace.",
      recordsAudit: "No persisted interaction audit trail.",
      settingsBoundary: "Protected shell only.",
      apiCli: "No API/CLI operation contract.",
      nextTask: "REALDATA-001",
      risk: "Medium: relationship data needs schema, source, and visibility policy.",
      tone: "warn",
    },
    {
      module: "Company",
      surfaceState: "mock_or_shell",
      mode: "strategy shell and high-risk stub",
      dbState: "No DB-backed company strategy records.",
      agentWorkspace: "No bounded Company agent workspace.",
      recordsAudit: "No persisted strategy audit trail.",
      settingsBoundary: "Protected shell; strategy writes require approval.",
      apiCli: "No API/CLI operation contract.",
      nextTask: "REALDATA-001",
      risk: "High: company strategy must remain private and proposal-only.",
      tone: "blocked",
    },
    {
      module: "Client Portal",
      surfaceState: "gated",
      mode: "fail-closed public route plus gated DB BFF",
      dbState: "Token route has gated DB loader; token lifecycle and smoke proof are incomplete.",
      agentWorkspace: "No client-facing agent workspace.",
      recordsAudit: "Client-visible audit/lifecycle records are not persisted.",
      settingsBoundary: "Token-only public route and protected readiness controls.",
      apiCli: "No client-share API/CLI contract.",
      nextTask: "CLIENT-005",
      risk: "High: public output remains approval-gated.",
      tone: "blocked",
    },
    {
      module: "Agent Team OS",
      surfaceState: "formal_readiness",
      mode: "generated AgentFacts-lite manifests plus protected readiness",
      dbState: "Generated manifests only; no external registry persistence.",
      agentWorkspace: "Protected readiness surface exists; operation console is not live.",
      recordsAudit: "Evidence reports exist; persisted agent run audit is not implemented.",
      settingsBoundary: "Protected owner/admin visibility; external registration blocked.",
      apiCli: "No owner-only dry-run operation contract yet.",
      nextTask: "AGENT-OPS-001",
      risk: "High: external registration requires endpoint, auth, trust, rollback, and human approval.",
      tone: "blocked",
    },
  ]

  return {
    id: "SURFACE-MATURITY-002",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    source: {
      researchDoc: "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
      maturityTarget: "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
      acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
      backlogTask: "SURFACE-MATURITY-002",
    },
    summary: {
      moduleCount: rows.length,
      dbBackedCount: rows.filter((row) => row.surfaceState === "db_backed").length,
      formalReadinessCount: rows.filter((row) => row.surfaceState === "formal_readiness").length,
      mockOrShellCount: rows.filter((row) => row.surfaceState === "mock_or_shell").length,
      highRiskCount: rows.filter((row) => row.risk.startsWith("High")).length,
      apiCliReadyCount: rows.filter((row) => row.apiCli.toLowerCase().includes("ready")).length,
      nextTask: "AUTH-005 if env/session appears; WORK-009 if proof DB is approved; otherwise DATTR-024 remains blocked by persistence prerequisites.",
      blockedBy: ["AUTH-005", "WORK-009", "DATTR-024", "AGENT-OPS-001"],
    },
    prohibitedExposure: [
      "raw private records",
      "profile IDs",
      "database URLs or hosts",
      "Supabase URLs or keys",
      "cookies or tokens",
      "raw auth claims",
      "raw generated report payloads",
      "external registry writes",
      "agent provider secrets",
    ],
    rows,
  }
}

function backendOperationTone(row: BackendOperationCatalogRow): AdminReadinessTone {
  if (row.currentState === "blocked") return "blocked"
  if (
    row.currentState === "approval_required" ||
    row.currentState === "dry_run_only" ||
    row.currentState === "owner_run"
  ) {
    return "warn"
  }

  return "good"
}

export function buildBackendOperationCatalogSurfaceContract(): BackendOperationCatalogSurfaceContract {
  const rows: BackendOperationCatalogSurfaceRow[] = BACKEND_OPERATION_CATALOG.rows.map((row) => ({
    ...row,
    tone: backendOperationTone(row),
    safetySummary: [
      `DB write: ${row.writesDatabase ? "yes" : "no"}`,
      `Public output: ${row.exposesPublicOutput ? "yes" : "no"}`,
      `Provider mutation: ${row.mutatesExternalProvider ? "yes" : "no"}`,
      `Human approval: ${row.requiresHumanApproval ? "yes" : "no"}`,
    ].join(" · "),
  }))
  const readyLikeCount = rows.filter((row) =>
    ["ready", "contract_ready", "protected_dry_run_ready"].includes(row.currentState)
  ).length
  const ownerRunCount = rows.filter((row) => row.currentState === "owner_run").length
  const dryRunOnlyCount = rows.filter((row) => row.currentState === "dry_run_only").length
  const approvalRequiredCount = rows.filter((row) => row.currentState === "approval_required").length
  const blockedCount = rows.filter((row) => row.currentState === "blocked").length

  return {
    id: "BACKEND-OPS-002",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    source: {
      sourceContract: BACKEND_OPERATION_CATALOG.id,
      contractFile: "src/lib/contracts/backend-operation-catalog.contract.ts",
      acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
      backlogTask: "BACKEND-OPS-002",
      checkerCommand: BACKEND_OPERATION_CATALOG.source.checkerCommand,
      referencePattern:
        "Protected resource index/table surface with no command execution, no raw payloads, and explicit stop conditions.",
    },
    pageRequirementUnderstanding: {
      score: 86,
      level: "High",
      requiredResearchRounds: 3,
      completedResearchRounds: 3,
      selectedPattern:
        "Admin renders the catalog as a dense resource table; settings renders a compact owner-control summary.",
      rejectedPatterns: [
        "Public OpenAPI export before auth/scope/public-safety approval.",
        "Clickable web UI command execution for pnpm proof commands.",
        "Client-side catalog state or hidden localStorage persistence.",
      ],
    },
    summary: {
      operationCount: rows.length,
      readyLikeCount,
      ownerRunCount,
      dryRunOnlyCount,
      approvalRequiredCount,
      blockedCount,
      highRiskCount: rows.filter((row) => row.risk === "HIGH" || row.risk === "CRITICAL").length,
      routeHandlerCount: BACKEND_OPERATION_CATALOG.summary.routeHandlerCount,
      serverActionCount: BACKEND_OPERATION_CATALOG.summary.serverActionCount,
      serviceLoaderCount: BACKEND_OPERATION_CATALOG.summary.serviceLoaderCount,
      cliCheckCommandCount: BACKEND_OPERATION_CATALOG.summary.cliCheckCommandCount,
      agentDryRunCount: BACKEND_OPERATION_CATALOG.summary.agentDryRunCount,
      ownerRunProofCommandCount: BACKEND_OPERATION_CATALOG.summary.ownerRunProofCommandCount,
      publicOpenApiExported: false,
      publicRouteAdded: false,
      externalRegistrationEnabled: false,
      nextTask:
        "AUTH-005 if Supabase env/session evidence appears; WORK-009 if a safe proof target appears; otherwise run the next RES-001/RES-002 shortest-path review.",
    },
    ownerActions: [
      "Inspect blocked auth/session and Work proof rows before claiming launch level.",
      "Run owner-proof commands only in the terminal with explicit env prerequisites; the UI does not execute shell commands.",
      "Keep external registration disabled until auth, endpoint, trust, rollback, deployment, public-safety, and owner approval exist.",
    ],
    prohibitedExposure: [...BACKEND_OPERATION_CATALOG.prohibitedExposure],
    rows,
  }
}

function workProofStatusTone({
  family,
  status,
}: {
  family: WorkProofEvidenceSurfaceFamily
  status: string
}): AdminReadinessTone {
  if (status === "passed" || status === "ready_for_source_path_review") return "good"
  if (family === "overall" && status === "missing_work_proof_evidence") return "blocked"
  if (status.includes("missing") || status.includes("unavailable") || status.includes("blocked")) return "blocked"
  return "warn"
}

function workProofLatestOverallStatus(contract: WorkProofLatestEvidenceContract) {
  const latestPath = contract.latest.latestOverallPacketPath
  if (latestPath === "not_collected") return "missing_work_proof_evidence"
  if (latestPath === contract.latest.latestTargetReadinessPath) return contract.latest.targetStatus
  if (latestPath === contract.latest.latestDockerPath) return contract.latest.dockerStatus
  if (latestPath === contract.latest.latestLocalPath) return contract.latest.localStatus
  if (latestPath === contract.latest.latestWorkProofRunPath) return contract.latest.workProofRunStatus
  if (latestPath === contract.latest.latestSourceSmokePath) return contract.latest.sourceSmokeStatus
  return "unknown_work_proof_packet_status"
}

function workProofEvidenceRow({
  family,
  label,
  status,
  path,
  signal,
  nextAction,
}: {
  family: WorkProofEvidenceSurfaceFamily
  label: string
  status: string
  path: string
  signal: string
  nextAction: string
}): WorkProofEvidenceSurfaceRow {
  return {
    family,
    label,
    status,
    path,
    signal,
    nextAction,
    tone: workProofStatusTone({ family, status }),
  }
}

export async function buildWorkProofEvidenceSurfaceContract(): Promise<WorkProofEvidenceSurfaceContract> {
  const { contract } = await resolveWorkProofEvidence()
  const latestOverallStatus = workProofLatestOverallStatus(contract)
  const sharedNextAction = contract.latest.nextOwnerAction
  const rows: WorkProofEvidenceSurfaceRow[] = [
    workProofEvidenceRow({
      family: "overall",
      label: "Latest Work proof evidence",
      status: latestOverallStatus,
      path: contract.latest.latestOverallPacketPath,
      signal: `Freshness ${contract.latest.freshness}; age ${
        contract.latest.latestAgeMinutes === null ? "unknown" : `${contract.latest.latestAgeMinutes} minutes`
      }; WORK-009 ready: ${contract.latest.canRunWork009 ? "yes" : "no"}.`,
      nextAction: sharedNextAction,
    }),
    workProofEvidenceRow({
      family: "target-readiness",
      label: "Work proof target readiness",
      status: contract.latest.targetStatus,
      path: contract.latest.latestTargetReadinessPath,
      signal: `canRunWork009=${contract.latest.canRunWork009 ? "true" : "false"}.`,
      nextAction: contract.latest.canRunWork009
        ? "Run WORK-009 from the terminal with the approved proof target and confirmations."
        : sharedNextAction,
    }),
    workProofEvidenceRow({
      family: "docker-disposable",
      label: "Docker disposable Work proof",
      status: contract.latest.dockerStatus,
      path: contract.latest.latestDockerPath,
      signal: `canRunDockerProof=${contract.latest.canRunDockerProof ? "true" : "false"}.`,
      nextAction: contract.latest.canRunDockerProof
        ? "Run the Docker disposable proof path from the terminal, then rerun WORK-009."
        : "Start Docker or use a local/disposable proof DB target before retrying WORK-009.",
    }),
    workProofEvidenceRow({
      family: "local-disposable",
      label: "Local disposable Work proof",
      status: contract.latest.localStatus,
      path: contract.latest.latestLocalPath,
      signal: `canRunLocalProof=${contract.latest.canRunLocalProof ? "true" : "false"}.`,
      nextAction: contract.latest.canRunLocalProof
        ? "Run the local disposable proof helper from the terminal, then rerun WORK-009."
        : "Provide an explicit local proof-marker PostgreSQL target before using the local helper.",
    }),
    workProofEvidenceRow({
      family: "work-proof-run",
      label: "Work proof run packet",
      status: contract.latest.workProofRunStatus,
      path: contract.latest.latestWorkProofRunPath,
      signal: `workProofPassed=${contract.latest.workProofPassed ? "true" : "false"}.`,
      nextAction: contract.latest.workProofPassed
        ? "Review cleanup evidence, then proceed toward WORK-007 and deployment proof."
        : "Do not claim Work persistence until a passing proof-run packet exists.",
    }),
    workProofEvidenceRow({
      family: "source-smoke",
      label: "Work source/static smoke",
      status: contract.latest.sourceSmokeStatus,
      path: contract.latest.latestSourceSmokePath,
      signal: `sourceStaticReady=${contract.latest.sourceStaticReady ? "true" : "false"}.`,
      nextAction: "Use source/static readiness as regression evidence only; it is not DB persistence proof.",
    }),
  ]
  const blockedLikeCount = rows.filter((row) => row.tone === "blocked").length

  return {
    id: "ADMIN-OPS-003-WORK-PROOF-EVIDENCE-SURFACE",
    status: "read_only_active",
    generatedAt: contract.generatedAt,
    sharedBy: ["admin", "settings"],
    source: {
      sourceContract: contract.id,
      resolver: "resolveWorkProofEvidence",
      checkerCommand: "pnpm work:proof-evidence:check",
      acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
      backlogTask: "ADMIN-OPS-003-WORK-PROOF-EVIDENCE-SURFACE",
      nextJsDocs: [
        "node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md",
        "node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md",
        "node_modules/next/dist/docs/01-app/02-guides/data-security.md",
        "node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md",
      ],
    },
    pageRequirementUnderstanding: {
      score: 93,
      level: "High",
      requiredResearchRounds: 3,
      completedResearchRounds: 3,
      selectedPattern:
        "Server-only Work proof resolver feeds one protected admin table and one compact settings summary with relative paths, statuses, readiness booleans, and next owner action.",
      rejectedPatterns: [
        "Render raw generated JSON packet bodies in the web UI.",
        "Add a public evidence API route or downloadable proof endpoint.",
        "Execute pnpm proof commands from admin/settings controls.",
        "Treat source/static smoke or owner-run instructions as WORK-009 or launch-level proof.",
      ],
    },
    summary: {
      rowCount: rows.length,
      freshness: contract.latest.freshness,
      latestOverallPacketPath: contract.latest.latestOverallPacketPath,
      latestOverallStatus,
      latestAgeMinutes: contract.latest.latestAgeMinutes,
      canRunWork009: contract.latest.canRunWork009,
      canRunDockerProof: contract.latest.canRunDockerProof,
      canRunLocalProof: contract.latest.canRunLocalProof,
      workProofPassed: contract.latest.workProofPassed,
      sourceStaticReady: contract.latest.sourceStaticReady,
      blockedLikeCount,
      nextOwnerAction: contract.latest.nextOwnerAction,
      nextTask: contract.latest.canRunWork009 ? "WORK-009" : "AUTH-005 or WORK-009 proof preemption; otherwise loop 132 RES-001/RES-002 review.",
      launchLevelUpgradeClaimed: false,
      work009Claimed: false,
    },
    safety: {
      ...contract.safety,
      rendersRawPacketBody: false,
      uiExecutesCommands: false,
      launchLevelUpgradeClaimed: false,
      work009Claimed: false,
      prohibitedExposure: [...WORK_PROOF_EVIDENCE_PROHIBITED_EXPOSURE],
    },
    rows,
  }
}

export async function buildAIInputSourceWorkflowOpsReadinessContract({
  canRunAuth005 = false,
}: {
  canRunAuth005?: boolean
} = {}): Promise<AIInputSourceWorkflowOpsReadinessContract> {
  const proofBootstrap = await buildAIInputSourceWorkflowProofBootstrapContract()
  const aiInputProofTargetProvided = Boolean(process.env.AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL)
  const aiInputProofWritesConfirmed =
    process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES === "1" &&
    process.env.PERSONAL_OS_AI_INPUT_PROOF_CONFIRM === "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
  const workProofTargetProvided = Boolean(process.env.WORK_PROOF_DATABASE_URL)
  const workProofWritesConfirmed =
    process.env.PERSONAL_OS_WORK_PROOF_ALLOW_WRITES === "1" &&
    process.env.PERSONAL_OS_WORK_PROOF_CONFIRM === "I_UNDERSTAND_THIS_WRITES_TEST_DATA"

  const rows: AIInputSourceWorkflowOpsReadinessRow[] = [
    {
      area: "DATTR-024A formal read DTO",
      state: "complete",
      status: "complete",
      signal:
        "Formal AI Input mode has a server-only source workflow DTO and explicit unavailable/empty state.",
      nextAction: "Keep formal mode free of hidden mock SourceConnection, SourceAsset, workflow, or proposal rows.",
      boundary: "No runtime DB read, DB write, connector runtime, provider read, or public output was added.",
      tone: "good",
    },
    {
      area: "DATTR-024B schema review packet",
      state: "complete",
      status: "complete",
      signal:
        "SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, ModuleWriteIntent, and OperatingAuditEvent are reviewed as proposal-only schema objects.",
      nextAction: "Use SCH-003 as the migration-review guard before any Prisma schema edit or migration apply.",
      boundary: "No create-only migration or valuable database migration may be claimed from this surface.",
      tone: "good",
    },
    {
      area: "DATTR-024C proof target boundary",
      state: "ready_boundary",
      status: "boundary ready",
      signal:
        "ACC-006 defines disposable/local target rules, write confirmations, cleanup, no-secret output, RLS/authz limits, and transaction behavior.",
      nextAction:
        "Keep future proof writes behind AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL and explicit write confirmations.",
      boundary: "Default DATABASE_URL, provider data, public output, and module final writes remain rejected.",
      tone: "good",
    },
    {
      area: "AI Input proof execution preconditions",
      state: aiInputProofTargetProvided && aiInputProofWritesConfirmed ? "ready_boundary" : "dry_run_only",
      status: aiInputProofTargetProvided && aiInputProofWritesConfirmed ? "target signaled" : "dry-run only",
      signal: `Dedicated proof target present: ${aiInputProofTargetProvided ? "yes" : "no"}; write confirmations present: ${
        aiInputProofWritesConfirmed ? "yes" : "no"
      }; no target value is displayed.`,
      nextAction:
        aiInputProofTargetProvided && aiInputProofWritesConfirmed
          ? "Design or run only an approved proof runner against the dedicated target."
          : "Supply a dedicated local/disposable target and confirmations before any future proof runner can write.",
      boundary: "This contract is read-only and cannot execute the proof runner.",
      tone: "warn",
    },
    {
      area: "AUTH-005 owner session proof",
      state: canRunAuth005 ? "ready_boundary" : "blocked",
      status: canRunAuth005 ? "ready" : "blocked",
      signal:
        "Real owner use still depends on Supabase public env, signed-in /auth/status evidence, Profile mapping, and owner-scoped Work smoke.",
      nextAction: canRunAuth005
        ? "Run AUTH-005 before claiming real owner launch readiness."
        : "Do not claim real owner login until auth:proof reports canRunAuth005=true.",
      boundary: "No cookies, tokens, raw auth claims, Supabase values, profile IDs, or provider payloads are exposed here.",
      tone: canRunAuth005 ? "warn" : "blocked",
    },
    {
      area: "WORK-009 disposable Work proof",
      state: workProofTargetProvided && workProofWritesConfirmed ? "ready_boundary" : "dry_run_only",
      status: workProofTargetProvided && workProofWritesConfirmed ? "target signaled" : "dry-run only",
      signal: `Work proof target present: ${workProofTargetProvided ? "yes" : "no"}; write confirmations present: ${
        workProofWritesConfirmed ? "yes" : "no"
      }; no target value is displayed.`,
      nextAction:
        workProofTargetProvided && workProofWritesConfirmed
          ? "Run WORK-009 before adjacent persistence expansion."
          : "Keep Work proof in dry-run until a disposable target and confirmations exist.",
      boundary: "No database URL, host, proof rows, or owner identifiers are exposed from this status.",
      tone: "warn",
    },
    {
      area: "DATTR-024D-CONTRACT proposal actions",
      state: "complete",
      status: "complete",
      signal:
        "Owner-reviewed proposal command ids, lifecycle states, approval levels, audit refs, rollback expectations, and stop conditions are now contracted for DataUnitProposal and ModuleWriteIntent.",
      nextAction:
        "Use the proposal-action contract as the gate before any future server action or proposal persistence.",
      boundary:
        "No route handler, server action, schema edit, migration, DB read/write, connector runtime, public output, module final write, external collaboration, or external registration is added.",
      tone: "good",
    },
    {
      area: "DATTR-024E-CONTRACT connector boundary",
      state: "complete",
      status: "complete",
      signal:
        "Connector consent, scope, pause/resume/revoke, provider-event verification, replay protection, secret separation, retention/deletion, audit refs, and stop conditions are now contracted.",
      nextAction:
        "Use the connector-boundary contract as the gate before OAuth/webhook/polling/provider runtime or source ingestion.",
      boundary: "No connector runtime, provider read, raw adapter payload, or source body may be surfaced.",
      tone: "good",
    },
    {
      area: "AIINPUT-OPS-002 source control matrix",
      state: "complete",
      status: "complete",
      signal:
        "Formal AI Input mode now has a protected source-control matrix for input mode, risk, status, next action, missing permissions, and connector/runtime boundary per source.",
      nextAction:
        "Use the matrix as the UI contract before future SourceConnection persistence or connector runtime work.",
      boundary:
        "No OAuth runtime, webhook runtime, polling runtime, provider API call, file ingestion, Supabase read/write, public output, or external registration is added.",
      ownerRunCommand: "pnpm ai-input:source-control:check",
      tone: "good",
    },
    {
      area: "DATTR-024H-MIGRATION-DRAFT create-only draft",
      state: "complete",
      status: "complete",
      signal:
        "Review-only Prisma schema and SQL draft exist for SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, ModuleWriteIntent, and SourceNamingProfile.",
      nextAction:
        "Keep migration apply in Manual Ops until proof target, identity strategy, RLS, audit storage, and owner approval pass.",
      boundary:
        "No deployable prisma/migrations entry, seed change, schema apply, DB read, DB write, or persisted audit row is added.",
      ownerRunCommand: "pnpm ai-input:migration-draft:check",
      tone: "good",
    },
    {
      area: "DATTR-024I-PROOF-RUNNER dry-run runner",
      state: "dry_run_only",
      status: "dry-run only",
      signal:
        "Proof runner can classify a target and emit no-secret packets, but writes remain rejected without AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL and explicit write confirmations.",
      nextAction:
        "Owner may run dry-run locally; write-mode remains Manual Ops and must use a disposable target only.",
      boundary:
        "No default DATABASE_URL write, migration apply, valuable DB connection, provider read, or runtime side effect is triggered by this surface.",
      ownerRunCommand: "pnpm ai-input:proof-runner:check && pnpm ai-input:proof -- --json",
      tone: "warn",
    },
    {
      area: "DATTR-024N local proof bootstrap",
      state: proofBootstrap.summary.canRunChildProof ? "ready_boundary" : "dry_run_only",
      status: proofBootstrap.summary.packetStatus,
      signal: `DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER latest Source Workflow proof evidence: ${proofBootstrap.latestEvidence.latest.latestPacketPath}; freshness: ${proofBootstrap.latestEvidence.latest.freshness}; modified: ${proofBootstrap.latestEvidence.latest.latestModifiedAt ?? "missing"}; checker: ${proofBootstrap.summary.checkerStatus}; target provided: ${proofBootstrap.summary.targetProvided ? "yes" : "no"}; host class: ${proofBootstrap.summary.hostClass}; missing: ${proofBootstrap.summary.missingCount}.`,
      nextAction:
        proofBootstrap.latestEvidence.latest.nextOwnerAction ??
        proofBootstrap.ownerActions[0] ??
        "Run pnpm ai-input:proof-local after selecting an explicit local/disposable proof target.",
      boundary:
        "Protected UI resolves the latest whitelisted no-secret proof evidence before showing packet path/status, target classification, missing prerequisites, and child command; target URL, host, raw packet body, credentials, and row IDs remain hidden.",
      ownerRunCommand:
        "pnpm ai-input:proof-evidence:check && pnpm ai-input:proof-local:check && pnpm ai-input:proof-local -- --json",
      tone: proofBootstrap.summary.canRunChildProof ? "warn" : "blocked",
    },
    {
      area: "DATTR-024Q proof target handoff",
      state: proofBootstrap.proofTargetHandoff.missingPrerequisites.length === 0 ? "ready_boundary" : "dry_run_only",
      status: proofBootstrap.proofTargetHandoff.status,
      signal: `Owner handoff exposes ${proofBootstrap.proofTargetHandoff.envVarNames.length} env var names, ${
        proofBootstrap.proofTargetHandoff.proofCommands.length
      } proof commands, ${proofBootstrap.proofTargetHandoff.evidenceTargets.length} evidence targets, ${
        proofBootstrap.proofTargetHandoff.passSignals.length
      } pass signals, and ${
        proofBootstrap.proofTargetHandoff.failSignals.length
      } fail signals; target values and raw packets remain hidden.`,
      nextAction: proofBootstrap.proofTargetHandoff.ownerAction,
      boundary:
        "Handoff is protected read-only Manual Ops guidance: no UI shell execution, DB connection/write, migration apply, connector/provider runtime, public output, external agent DB access, or external registration.",
      ownerRunCommand:
        "pnpm ai-input:proof-evidence:check && pnpm ai-input:proof-local:check && pnpm ai-input:proof-local -- --json",
      tone: proofBootstrap.proofTargetHandoff.missingPrerequisites.length === 0 ? "warn" : "blocked",
    },
    {
      area: "DATTR-024J-SERVICE-AUTHZ-RUNTIME boundary",
      state: "ready_boundary",
      status: "boundary ready",
      signal:
        "Server-only service runtime requires requireUser(), maps Source Workflow operation contracts, redacts owner profile id, and keeps runtimeDbReadEnabled/runtimeDbWriteEnabled false.",
      nextAction:
        "Use this boundary before adding any BFF loader, route handler, server action, or persisted Source Workflow read/write path.",
      boundary:
        "No Prisma import, DB connection, provider call, route handler, server action, public output, or connector runtime exists.",
      ownerRunCommand: "pnpm ai-input:service-runtime:check",
      tone: "good",
    },
    {
      area: "DATTR-024K-RLS-AUDIT-STORAGE approval gate",
      state: "human_approval_required",
      status: "approval required",
      signal:
        "RLS identity strategy, default-deny policies, persisted audit storage shape, append-only integrity, redaction, and cross-owner proof cases are documented.",
      nextAction:
        "Select identity strategy and proof cases before applying RLS policies or enabling persisted audit storage.",
      boundary:
        "identityStrategySelected=false, rlsPolicyApplyAllowed=false, auditStorageRuntimeAllowed=false, databaseReadAllowed=false, databaseWriteAllowed=false.",
      ownerRunCommand: "pnpm ai-input:rls-audit-storage:check",
      tone: "warn",
    },
    {
      area: "DATTR-024L-CONNECTOR-RUNTIME approval gate",
      state: "human_approval_required",
      status: "approval required",
      signal:
        "Connector inventory, OAuth consent/PKCE, secret storage, webhook signature/replay, polling, redaction, mapping, rollback, and NANDA boundary are ready for review only.",
      nextAction:
        "Keep runtimeApprovalSelected=false until owner approval, proof target, RLS/audit, service authorization, rollback, and observability are accepted.",
      boundary:
        "connectorRuntimeAllowed=false, oauthRuntimeAllowed=false, webhookRuntimeAllowed=false, pollingRuntimeAllowed=false, providerApiRuntimeAllowed=false, secretWriteAllowed=false.",
      ownerRunCommand: "pnpm ai-input:connector-runtime:check",
      tone: "warn",
    },
    {
      area: "Full DATTR-024 persistence",
      state: "blocked",
      status: "blocked",
      signal:
        "No approved migration apply, selected identity strategy, RLS/browser proof, write-confirmed proof target, connector runtime approval, or DB-backed BFF exists yet.",
      nextAction:
        "Proceed only after approved proof, migration apply, authz, audit storage, connector runtime, and owner evidence gates.",
      boundary: "No Prisma schema change, seed change, DB read/write, public output, high-risk final write, or external agent DB access.",
      ownerRunCommand: "pnpm ai-input:ops-surface:check",
      tone: "blocked",
    },
    {
      area: "NANDA / external registration",
      state: "blocked",
      status: "externalRegisterable false",
      signal:
        "AI Input source workflow is protected-owner visible and internal/proposal-only; no public endpoint or external registry write exists.",
      nextAction: "Keep external registration blocked until endpoint, auth scopes, trust, observability, rollback, and human approval exist.",
      boundary: "External agents never receive direct database access.",
      tone: "blocked",
    },
  ]

  return {
    id: "AIINPUT-OPS-003",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    source: {
      formalReadDto: "DATTR-024A / src/lib/services/ai-input-readiness.service.ts",
      splitContract: "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
      schemaReview: "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
      proofTarget: "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
      connectorBoundary: "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
      sourceControlMatrix: "AIINPUT-OPS-002 / src/lib/services/ai-input-readiness.service.ts",
      migrationDraft: "DATTR-024H-MIGRATION-DRAFT / prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only",
      proofRunner: "DATTR-024I-PROOF-RUNNER / scripts/ai-input-source-workflow-proof-runner.mjs",
      localProofBootstrap:
        "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP / scripts/ai-input-source-workflow-local-proof-bootstrap.mjs",
      serviceRuntime: "DATTR-024J-SERVICE-AUTHZ-RUNTIME / src/lib/services/ai-input-source-workflow.service.ts",
      rlsAuditStorage: "DATTR-024K-RLS-AUDIT-STORAGE / src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
      connectorRuntimeApproval:
        "DATTR-024L-CONNECTOR-RUNTIME / src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts",
      opsSurface: "AIINPUT-OPS-003 / protected AI Input, admin, and settings Source Workflow gate surface",
      proofTargetHandoff:
        "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE / proofBootstrap.proofTargetHandoff",
      researchReport: "docs/06_audits-and-reports/RPT-009_loop-63-research-gap-review.md",
      acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    },
    summary: {
      rowCount: rows.length,
      completeCount: rows.filter((row) => row.state === "complete").length,
      readyBoundaryCount: rows.filter((row) => row.state === "ready_boundary").length,
      dryRunOnlyCount: rows.filter((row) => row.state === "dry_run_only").length,
      blockedCount: rows.filter((row) => row.state === "blocked").length,
      humanApprovalRequiredCount: rows.filter((row) => row.state === "human_approval_required").length,
      proofTargetStatus:
        aiInputProofTargetProvided && aiInputProofWritesConfirmed ? "target signaled" : "dry-run only",
      localProofPacketStatus: proofBootstrap.summary.packetStatus,
      localProofCheckerStatus: proofBootstrap.summary.checkerStatus,
      latestLocalProofPacketPath: proofBootstrap.source.latestPacketPath,
      proofTargetHandoffStatus: proofBootstrap.proofTargetHandoff.status,
      proofTargetHandoffMissingCount: proofBootstrap.proofTargetHandoff.missingPrerequisites.length,
      proofTargetHandoffEvidenceTarget:
        proofBootstrap.proofTargetHandoff.evidenceTargets[0] ?? proofBootstrap.source.latestPacketPath,
      nextTask:
        "Owner/operator can now follow DATTR-024Q proof target handoff; run AUTH-005 or WORK-009 when prerequisites appear.",
    },
    requiredObjects: AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS,
    prohibitedExposure: [
      "Supabase URLs or keys",
      "database URLs or hosts",
      "cookies or tokens",
      "raw auth claims",
      "profile IDs",
      "row IDs",
      "provider payloads",
      "raw adapter payloads",
      "source file bodies",
      "private source material",
      "raw generated report payloads",
      "external registry writes",
    ],
    proofBootstrap,
    rows,
  }
}

export function buildScenarioJourneyContract(): ScenarioJourneyContract {
  const rows: ScenarioJourneyRow[] = [
    {
      scenario: "Owner signs in and starts real work",
      actor: "Owner",
      entrySurface: "Frontstage -> login -> protected dashboard",
      currentExperience:
        "Public root, login entry, protected shell, auth status endpoint, and owner/demo boundary proof exist.",
      missingExperience:
        "Real Supabase session to Profile mapping is still not proven, so the owner cannot claim production-ready personal use.",
      nextAction: "Collect signed-in /auth/status evidence and run AUTH-005.",
      linkedTask: "AUTH-005",
      tone: "blocked",
      state: "blocked",
    },
    {
      scenario: "Daily command start",
      actor: "Owner",
      entrySurface: "Dashboard / admin / settings",
      currentExperience:
        "Admin and settings show launch state, auth boundary, module maturity, agent readiness, and recent evidence.",
      missingExperience:
        "There is no opinionated daily operating queue that merges Work, AI Input, Research, Life, Finance, Chamber, and Company priorities.",
      nextAction: "Create a dashboard-first scenario surface after real-data matrix identifies the first cross-module objects.",
      linkedTask: "REALDATA-001",
      tone: "warn",
      state: "partial",
    },
    {
      scenario: "Operate a Work project end to end",
      actor: "Owner / WorkAgent",
      entrySurface: "Work resource index and project detail",
      currentExperience:
        "Work has DB-backed services, server actions, project detail, and a Work-first resource-index contract.",
      missingExperience:
        "Refresh proof against an approved DB target is still missing; records/audit and agent proposal queues are not persisted.",
      nextAction: "Run the disposable Work proof harness, then mature Work records and agent proposal surfaces.",
      linkedTask: "WORK-009",
      tone: "warn",
      state: "partial",
    },
    {
      scenario: "Capture source material and let AI triage it",
      actor: "Owner / AI Input Agent",
      entrySurface: "AI Input workbench",
      currentExperience:
        "AI Input has formal readiness, mock kill-switch behavior, source/workflow workbench UI, and clear persistence gaps.",
      missingExperience:
        "SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, and ModuleWriteIntent persistence are not implemented.",
      nextAction: "Split DATTR-024 into migration-safe BFF/service/schema slices after REALDATA-001.",
      linkedTask: "DATTR-024",
      tone: "warn",
      state: "partial",
    },
    {
      scenario: "Turn research sources into writing or decisions",
      actor: "Owner / ResearchAgent",
      entrySurface: "Research",
      currentExperience:
        "Research has a mature-looking UI and writing surfaces but still relies on mock/state data.",
      missingExperience:
        "Research objects, sources, citation provenance, and ResearchAgent proposal queues are not DB-backed.",
      nextAction: "Map Research data objects, BFF read model, and first write boundary in REALDATA-001.",
      linkedTask: "REALDATA-001",
      tone: "blocked",
      state: "blocked",
    },
    {
      scenario: "Share a client-safe project view",
      actor: "Owner / Client",
      entrySurface: "Client Portal",
      currentExperience:
        "Public route fails closed, token route is gated, and protected readiness explains token/storage/audit gaps.",
      missingExperience:
        "Token rotate/revoke, visibility audit, storage URLs, and real DB smoke are incomplete.",
      nextAction: "Implement token lifecycle only after schema/action approval and safe DB proof target.",
      linkedTask: "CLIENT-005",
      tone: "blocked",
      state: "blocked",
    },
    {
      scenario: "Ask an agent to prepare work through a command",
      actor: "Owner / Agent Team OS",
      entrySurface: "Agent operation CLI / protected readiness",
      currentExperience:
        "`pnpm agent:op` provides owner-only dry-run operation proof from generated AgentFacts-lite manifests.",
      missingExperience:
        "No protected API route, operation inbox, approval queue, persisted agent run audit, or bounded write path exists.",
      nextAction: "Create approval queue and operation inbox only after audit/event contract is reviewed.",
      linkedTask: "AUDIT-OPS-001",
      tone: "warn",
      state: "partial",
    },
    {
      scenario: "Run finance, life, or company strategy safely",
      actor: "Owner / High-risk module agents",
      entrySurface: "Finance / Life / Company",
      currentExperience:
        "High-risk module shells exist and clearly block silent final writes.",
      missingExperience:
        "Draft/proposal data models, approval flows, and private audit trails are not implemented.",
      nextAction: "Use REALDATA-001 to split draft-only, owner-only, approval-first data paths.",
      linkedTask: "REALDATA-001",
      tone: "blocked",
      state: "blocked",
    },
    {
      scenario: "Manage chamber relationships and follow-ups",
      actor: "Owner / ChamberAgent",
      entrySurface: "Chamber",
      currentExperience:
        "Chamber has an operating shell and CRM proposal direction.",
      missingExperience:
        "Contacts, interactions, opportunities, follow-up queue, and relationship context are not DB-backed.",
      nextAction: "Map Chamber CRM object model and first BFF slice in REALDATA-001.",
      linkedTask: "REALDATA-001",
      tone: "warn",
      state: "partial",
    },
    {
      scenario: "Operate the system as an admin",
      actor: "Owner / Operator",
      entrySurface: "Admin",
      currentExperience:
        "Admin shows blockers, loop state, auth boundary, surface maturity, resource-index contract, agent readiness, and evidence links.",
      missingExperience:
        "Admin actions are still read-only; persisted operator actions and audit records are not implemented.",
      nextAction: "Define append-only operating audit event schema and BFF contract.",
      linkedTask: "AUDIT-OPS-001",
      tone: "warn",
      state: "partial",
    },
  ]

  return {
    id: "SCENARIO-001",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    source: {
      situationPrd: "docs/01_product-requirements/PRD-005_situation-driven-prd.md",
      maturityResearch: "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
      operatingSurfaceResearch: "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
      resourceIndexContract: "docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md",
    },
    summary: {
      scenarioCount: rows.length,
      usableCount: rows.filter((row) => row.state === "usable").length,
      partialCount: rows.filter((row) => row.state === "partial").length,
      blockedCount: rows.filter((row) => row.state === "blocked").length,
      nextTask: "REALDATA-001",
      primaryExperienceGap:
        "The product has readiness and contracts, but it still needs per-scenario real data objects and end-to-end owner journeys.",
    },
    rows,
  }
}

export function buildAdminAuditBffContract({
  authStatus,
  hasSupabaseConfig,
  permissionSnapshot,
  recentEvidenceCount = 0,
  loopNextRecommendedTask = "unknown",
}: {
  authStatus: AuthResolutionStatus
  hasSupabaseConfig: boolean
  permissionSnapshot: ModulePermissionSnapshot
  recentEvidenceCount?: number
  loopNextRecommendedTask?: string
}): AdminAuditBffContract {
  return {
    id: "ADMIN-002",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    evidenceSource: {
      path: REPORT_DIR,
      recentCount: recentEvidenceCount,
    },
    persistence: {
      current: "not_persisted",
      futureGate: "Schema, append-only audit semantics, authorization policy, and retention rules must be reviewed before persisted audit records are added.",
    },
    prohibitedWrites: [
      "user management",
      "permission writes",
      "production environment mutation",
      "deployment API writes",
      "connector sync",
      "database migration or seed",
      "persisted audit records",
    ],
    rows: [
      {
        area: "Auth and profile readiness",
        source: "`resolveCurrentUser()` and `/auth/status`",
        safeExposure: "Auth mode, readiness status, mapped email when available, and owner-scoped Work count only.",
        writeBoundary: "No profile provisioning, session mutation, raw claims, cookies, tokens, or internal profile IDs.",
        nextGate: hasSupabaseConfig
          ? "Run AUTH-005 with a real Supabase browser session."
          : "Configure Supabase public env before real-session smoke.",
        tone: statusTone(authStatus),
      },
      {
        area: "Module permission readiness",
        source: "`ModulePermissionSnapshot` from role defaults plus `UserModulePermission` row overlays.",
        safeExposure: `${permissionSnapshot.enabledModules.length} enabled modules, ${permissionSnapshot.disabledModules.length} hidden modules, ${permissionSnapshot.dbPermissionRows} DB rows, ${permissionSnapshot.unknownModuleRows} unknown rows.`,
        writeBoundary: "No module permission writes; browser overrides remain rehearsal-only and are not authorization.",
        nextGate: permissionSnapshot.unknownModuleRows > 0
          ? "Review unknown module keys before relying on persisted rows."
          : "Approve role policy and audit semantics before permission write actions.",
        tone: permissionSnapshot.unknownModuleRows > 0 ? "warn" : "good",
      },
      {
        area: "Launch evidence readiness",
        source: "`loop-state.json`, generated loop reports, and `pnpm launch:check --json` evidence.",
        safeExposure: `${recentEvidenceCount} recent report references, next recommended task ${loopNextRecommendedTask}, env presence only.`,
        writeBoundary: "No raw env values, secrets, database URLs, hostnames, generated report payloads, or deployment mutations.",
        nextGate: "Keep evidence read-only until append-only readiness records are designed.",
        tone: "neutral",
      },
      {
        area: "Admin and settings surfaces",
        source: "Protected Server Components under the dashboard shell.",
        safeExposure: "Shared read-only contract rows, launch blockers, profile status, module snapshot counts, and write boundaries.",
        writeBoundary: "No admin mutation, user-management action, connector sync, permission update, migration, or seed.",
        nextGate: "Only add actions after service-layer authorization and audit events are approved.",
        tone: "good",
      },
      {
        area: "Future persisted audit",
        source: "Not implemented in this slice.",
        safeExposure: "Contract-only planning surface; no audit table is written.",
        writeBoundary: "Persisted audit records require reviewed schema, retention, tamper-resistance expectations, and access policy.",
        nextGate: "Split a schema proposal or append-only audit implementation task after loop 15 launch review.",
        tone: "warn",
      },
    ],
  }
}

export function buildOwnerEvidenceConsoleContract({
  ownerAuthBoundaryContract,
  loopState,
}: {
  ownerAuthBoundaryContract: OwnerAuthBoundaryContract
  loopState: LoopState
}): OwnerEvidenceConsoleContract {
  const supabasePublicEnvReady =
    ownerAuthBoundaryContract.runtime.supabasePublicUrlPresent &&
    ownerAuthBoundaryContract.runtime.supabasePublishableOrAnonKeyPresent
  const workProofTargetReady =
    Boolean(process.env.WORK_PROOF_DATABASE_URL) &&
    process.env.PERSONAL_OS_WORK_PROOF_ALLOW_WRITES === "1" &&
    process.env.PERSONAL_OS_WORK_PROOF_CONFIRM === "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
  const aiInputProofTargetReady =
    Boolean(process.env.AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL) &&
    process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES === "1" &&
    process.env.PERSONAL_OS_AI_INPUT_PROOF_CONFIRM === "I_UNDERSTAND_THIS_WRITES_TEST_DATA"

  const rows: OwnerEvidenceConsoleRow[] = [
    {
      id: "launch-proof",
      priority: 1,
      surface: "Launch",
      status: supabasePublicEnvReady ? "owner-run ready" : "blocked by env",
      ownerAction: supabasePublicEnvReady
        ? "Run launch proof and inspect the generated packet before claiming L1."
        : "Add Supabase public env in the intended launch environment, then rerun launch proof.",
      command:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-launch-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-launch-proof.json",
      passSignal: "overallStatus is ready or canClaimL1 is true with no missing Supabase public env.",
      failSignal: "overallStatus remains blocked or missing labels include Supabase public URL/key.",
      linkedTask: "AUTH-005",
      blocker: supabasePublicEnvReady ? "signed-in auth evidence" : "Supabase public env",
      tone: supabasePublicEnvReady ? "warn" : "blocked",
    },
    {
      id: "auth-status-proof",
      priority: 2,
      surface: "Auth",
      status: ownerAuthBoundaryContract.proof.canRunAuth005 ? "ready" : "blocked",
      ownerAction: ownerAuthBoundaryContract.proof.canRunAuth005
        ? "Run AUTH-005 with signed-in /auth/status evidence."
        : "Sign in, open /auth/status, save sanitized evidence, then rerun auth proof.",
      command:
        "pnpm auth:proof -- --status-url http://localhost:3000/auth/status --out docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      passSignal: "canRunAuth005 is true and auth status evidence is signed-in, Profile-mapped, and owner-scoped.",
      failSignal: "canRunAuth005 is false, auth status evidence is missing, or Profile mapping fails.",
      linkedTask: "AUTH-005",
      blocker: ownerAuthBoundaryContract.proof.canRunAuth005
        ? "owner smoke execution"
        : "signed-in /auth/status evidence",
      tone: ownerAuthBoundaryContract.proof.canRunAuth005 ? "good" : "blocked",
    },
    {
      id: "work-refresh-proof",
      priority: 3,
      surface: "Work",
      status: workProofTargetReady ? "ready" : "dry-run only",
      ownerAction: workProofTargetReady
        ? "Run the disposable Work proof and inspect cleanup plus refresh markers."
        : "Provide only an approved local/disposable proof target and confirmations before run mode.",
      command:
        "pnpm work:proof -- --json --out docs/2_agent-input/generated/agent-loop/reports/owner-work-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-work-proof.json",
      passSignal: "Proof-only Work project/task/note/deliverable rows are created, read after reconnect, and cleaned up.",
      failSignal: "Mode is dry_run, no proof DB target exists, confirmations are absent, or cleanup fails.",
      linkedTask: "WORK-009",
      blocker: workProofTargetReady ? "manual run" : "approved disposable/local proof DB target",
      tone: workProofTargetReady ? "warn" : "blocked",
    },
    {
      id: "interface-owner-review",
      priority: 4,
      surface: "Interface",
      status: "owner-run",
      ownerAction:
        "Open the four prototype module surfaces and mark obvious missing controls before more proof-only loops.",
      command: "pnpm dev, then review /finance, /chamber, /company, and /life in the browser.",
      evidenceTarget: "owner visual notes or screenshots",
      passSignal: "Each page supports scan, select, draft/proposal-only action, records/audit, and settings/boundary review.",
      failSignal: "A module still feels placeholder-only, text overflows, or a primary actor action is missing.",
      linkedTask: "OWNER-UI-REVIEW",
      blocker: "owner visual review",
      tone: "warn",
    },
    {
      id: "ai-input-proof-target",
      priority: 5,
      surface: "AI Input",
      status: aiInputProofTargetReady ? "target signaled" : "blocked by proof target",
      ownerAction: aiInputProofTargetReady
        ? "Design the approved Source Workflow proof run as a separate persistence slice."
        : "Do not run full DATTR-024 until proof target, migration, authz, audit storage, and connector runtime approvals exist.",
      command:
        "pnpm ai-input:split:check -- --out docs/2_agent-input/generated/agent-loop/reports/owner-ai-input-split-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-ai-input-split-proof.json",
      passSignal: "DATTR-024A/B/C/D/E remain ready and nextRunnableSlice remains DATTR-024.",
      failSignal: "Any source workflow boundary check fails or the next slice regresses to a completed subtask.",
      linkedTask: "DATTR-024",
      blocker: aiInputProofTargetReady ? "migration/authz/audit review" : "approved AI Input proof target",
      tone: aiInputProofTargetReady ? "warn" : "blocked",
    },
    {
      id: "deployment-marker-proof",
      priority: 6,
      surface: "Deployment",
      status: process.env.VERCEL_ENV ? "deployment signaled" : "not deployed",
      ownerAction:
        "Collect deployment marker proof only after auth/session and Work proof are meaningful.",
      command:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
      passSignal: "Deployment marker exists and launch proof no longer blocks on local-only prerequisites.",
      failSignal: "VERCEL_ENV or equivalent deployment marker is missing, or auth/Work proof remains absent.",
      linkedTask: "DEPLOY-002",
      blocker: process.env.VERCEL_ENV ? "auth and Work proof" : "deployment marker",
      tone: "warn",
    },
  ]

  const blockedCount = rows.filter((row) => row.tone === "blocked").length
  const ownerRunCount = rows.filter((row) => row.status.includes("owner-run")).length
  const readyCount = rows.filter((row) => row.status === "ready" || row.status.includes("ready")).length
  const primaryOwnerAction =
    rows.find((row) => row.tone === "blocked")?.ownerAction ??
    rows.find((row) => row.tone === "warn")?.ownerAction ??
    "Inspect the generated owner evidence rows before claiming launch readiness."

  return {
    id: "OWNER-EVIDENCE-001",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["dashboard", "admin", "settings"],
    source: {
      maturityResearch: "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
      operatingSurfaceResearch: "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
      launchProofChecklist: "docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md",
      authProofChecklist: "docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md",
      workProofChecklist: "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md",
      loop68ResearchReport: "docs/06_audits-and-reports/RPT-011_loop-68-research-gap-review.md",
    },
    summary: {
      rowCount: rows.length,
      blockedCount,
      ownerRunCount,
      readyCount,
      primaryOwnerAction,
      nextTask:
        loopState.loopProgress?.nextRecommendedTask ??
        "AUTH-005 if auth evidence appears; WORK-009 if proof DB appears; otherwise shortest non-persistence maturity slice.",
    },
    prohibitedExposure: [
      "Supabase URLs or keys",
      "database URLs or hosts",
      "cookies or tokens",
      "raw auth claims",
      "provider payloads",
      "profile IDs",
      "row IDs",
      "raw generated report payload bodies",
      "production DB mutation",
      "public client output expansion",
      "external agent registration",
    ],
    rows,
  }
}

export async function getOwnerEvidenceConsoleContract(): Promise<OwnerEvidenceConsoleContract> {
  const [ownerAuthBoundaryContract, loopState] = await Promise.all([
    getOwnerAuthBoundaryContract(),
    readLoopState(),
  ])

  return buildOwnerEvidenceConsoleContract({
    ownerAuthBoundaryContract,
    loopState,
  })
}

function operatorActionCounts(
  rows: readonly LaunchOperatorAction[],
  state: LaunchOperatorAction["state"]
) {
  return rows.filter((row) => row.state === state).length
}

export function buildLaunchOperatorActionRegistryContract({
  ownerAuthBoundaryContract,
  ownerEvidenceConsoleContract,
  launchReadinessHistoryContract,
}: {
  ownerAuthBoundaryContract: OwnerAuthBoundaryContract
  ownerEvidenceConsoleContract: OwnerEvidenceConsoleContract
  launchReadinessHistoryContract: LaunchReadinessHistoryContract
}): LaunchOperatorActionRegistryContract {
  const supabasePublicEnvReady =
    ownerAuthBoundaryContract.runtime.supabasePublicUrlPresent &&
    ownerAuthBoundaryContract.runtime.supabasePublishableOrAnonKeyPresent
  const workProofTargetReady =
    Boolean(process.env.WORK_PROOF_DATABASE_URL) &&
    process.env.PERSONAL_OS_WORK_PROOF_ALLOW_WRITES === "1" &&
    process.env.PERSONAL_OS_WORK_PROOF_CONFIRM === "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
  const aiInputProofTargetReady =
    Boolean(process.env.AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL) &&
    process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES === "1" &&
    process.env.PERSONAL_OS_AI_INPUT_PROOF_CONFIRM === "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
  const deploymentMarkerPresent = Boolean(process.env.VERCEL_ENV)

  const rows: LaunchOperatorAction[] = [
    {
      id: "launch.proof",
      priority: 1,
      area: "Launch",
      label: "Run no-secret launch proof",
      actor: "Owner / Operator",
      surface: "cli",
      state: supabasePublicEnvReady ? "owner_run" : "blocked",
      mode: "owner_run",
      command:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-launch-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-launch-proof.json",
      passSignal: "overallStatus is ready or canClaimL1 is true with required launch prerequisites present.",
      failSignal: "overallStatus remains blocked or missing labels include Supabase public URL/key.",
      blocker: supabasePublicEnvReady ? "signed-in auth and Work proof evidence" : "Supabase public env",
      nextAction: supabasePublicEnvReady
        ? "Run the launch proof after auth/session and Work proof evidence are collected."
        : "Add Supabase public env before claiming any online launch level.",
      linkedTasks: ["AUTH-005", "DEPLOY-002"],
      risk: "medium",
      writesDatabase: false,
      mutatesExternalProvider: false,
      exposesPublicOutput: false,
      requiresHumanApproval: false,
      noSecretBoundary: "Proof packet may show presence booleans and labels only; it must not render URLs, keys, hosts, or raw payloads.",
    },
    {
      id: "auth.session-proof",
      priority: 2,
      area: "Auth",
      label: "Verify signed-in Supabase Profile mapping",
      actor: "Owner",
      surface: "cli",
      state: ownerAuthBoundaryContract.proof.canRunAuth005 ? "ready" : "blocked",
      mode: "owner_run",
      command:
        "pnpm auth:proof -- --status-url http://localhost:3000/auth/status --out docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      passSignal: "canRunAuth005 is true and sanitized /auth/status evidence is signed-in, Profile-mapped, and owner-scoped.",
      failSignal: "canRunAuth005 is false, auth status evidence is missing, or Profile mapping fails.",
      blocker: ownerAuthBoundaryContract.proof.canRunAuth005
        ? "owner smoke execution"
        : "signed-in /auth/status evidence",
      nextAction: ownerAuthBoundaryContract.proof.nextAction,
      linkedTasks: ["AUTH-005"],
      risk: "medium",
      writesDatabase: false,
      mutatesExternalProvider: false,
      exposesPublicOutput: false,
      requiresHumanApproval: false,
      noSecretBoundary: "The proof may include sanitized status labels only; cookies, tokens, raw claims, profile IDs, and email values remain excluded.",
    },
    {
      id: "work.target-readiness",
      priority: 3,
      area: "Work",
      label: "Check approved Work proof target",
      actor: "Owner / Operator",
      surface: "cli",
      state: workProofTargetReady ? "ready" : "dry_run_only",
      mode: workProofTargetReady ? "owner_run" : "dry_run",
      command:
        "pnpm work:proof-target:check -- --out docs/2_agent-input/generated/agent-loop/reports/owner-work-proof-target-readiness.json",
      evidenceTarget:
        "docs/2_agent-input/generated/agent-loop/reports/owner-work-proof-target-readiness.json",
      passSignal: "canRunWork009 is true with an approved local/disposable target and write confirmations.",
      failSignal: "Target is missing/unsafe, write confirmations are absent, or target classification is ambiguous.",
      blocker: workProofTargetReady ? "manual WORK-009 run" : "approved disposable/local proof DB target",
      nextAction: workProofTargetReady
        ? "Run WORK-009 against only the approved disposable/local target."
        : "Use owner-run Docker proof or provide an explicit local/disposable target before run mode.",
      linkedTasks: ["WORK-009", "WORK-012"],
      risk: "high",
      writesDatabase: workProofTargetReady,
      mutatesExternalProvider: false,
      exposesPublicOutput: false,
      requiresHumanApproval: !workProofTargetReady,
      noSecretBoundary: "The readiness check must never print database URLs, hosts, passwords, row IDs, or raw DB values.",
    },
    {
      id: "work.docker-disposable",
      priority: 4,
      area: "Work",
      label: "Run Docker disposable Work proof",
      actor: "Owner / Operator",
      surface: "cli",
      state: "owner_run",
      mode: "owner_run",
      command:
        "pnpm work:proof:docker-disposable -- --run --setup --out docs/2_agent-input/generated/agent-loop/reports/owner-work-docker-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-work-docker-proof.json",
      passSignal: "Docker proof creates a marked local database, child Work proof reports status=passed, and cleanup passes.",
      failSignal: "Docker daemon is unavailable, child proof does not pass, setup fails, or cleanup fails.",
      blocker: "Docker daemon and owner-run inspection",
      nextAction:
        "Start Docker locally and run this command if Work proof target evidence is still absent; inspect child proof before claiming WORK-009.",
      linkedTasks: ["WORK-012", "WORK-009"],
      risk: "high",
      writesDatabase: true,
      mutatesExternalProvider: false,
      exposesPublicOutput: false,
      requiresHumanApproval: true,
      noSecretBoundary: "The wrapper may expose local disposable database names only; valuable or remote targets must be refused.",
    },
    {
      id: "deploy.marker-proof",
      priority: 5,
      area: "Deployment",
      label: "Collect deployment marker proof",
      actor: "Owner / Operator",
      surface: "cli",
      state: deploymentMarkerPresent ? "owner_run" : "blocked",
      mode: "owner_run",
      command:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
      passSignal: "Deployment marker exists and launch proof no longer blocks on local-only prerequisites.",
      failSignal: "VERCEL_ENV or equivalent deployment marker is missing, or auth/Work proof remains absent.",
      blocker: deploymentMarkerPresent ? "auth and Work proof" : "deployment marker",
      nextAction:
        "Collect deployment marker proof only after auth/session and Work proof are meaningful.",
      linkedTasks: ["DEPLOY-002"],
      risk: "medium",
      writesDatabase: false,
      mutatesExternalProvider: false,
      exposesPublicOutput: false,
      requiresHumanApproval: false,
      noSecretBoundary: "Deployment proof records marker presence only and must not print provider credentials or env values.",
    },
    {
      id: "owner.ui-review",
      priority: 6,
      area: "Interface",
      label: "Run owner UI review",
      actor: "Owner",
      surface: "dashboard",
      state: "owner_run",
      mode: "owner_run",
      command: "pnpm dev, then review /dashboard, /admin, /settings, /work, and module pages in the browser.",
      evidenceTarget: "owner visual notes or screenshots",
      passSignal: "Each page supports scan, select, draft/proposal action, records/audit, and settings/boundary review.",
      failSignal: "A module still feels placeholder-only, text overflows, or a primary actor action is missing.",
      blocker: "owner visual review",
      nextAction: "Run one owner browser pass; if it is acceptable, keep loops focused on auth/Work/deploy proof or high-risk approvals.",
      linkedTasks: ["OWNER-UI-REVIEW"],
      risk: "low",
      writesDatabase: false,
      mutatesExternalProvider: false,
      exposesPublicOutput: false,
      requiresHumanApproval: false,
      noSecretBoundary: "Owner review should use UI screenshots or notes only; do not attach raw proof packets or private data dumps.",
    },
    {
      id: "client.token-lifecycle-approval",
      priority: 7,
      area: "Client Portal",
      label: "Approve token lifecycle action boundary",
      actor: "Owner / Admin",
      surface: "settings",
      state: "approval_required",
      mode: "approval_required",
      command: "Review CLIENT-005 schema/action boundary before token rotate/revoke implementation.",
      evidenceTarget: "approved CLIENT-005 action boundary and future audit proof",
      passSignal: "Owner approves token rotate/revoke BFF actions, audit behavior, storage policy, and public fail-closed smoke criteria.",
      failSignal: "Schema, auth, public output, audit, or production DB mutation boundary remains unclear.",
      blocker: "high-risk public output and token lifecycle approval",
      nextAction: "Stop before token writes until CLIENT-005 has explicit approval or a disposable proof path.",
      linkedTasks: ["CLIENT-005", "CLIENT-007"],
      risk: "high",
      writesDatabase: true,
      mutatesExternalProvider: false,
      exposesPublicOutput: true,
      requiresHumanApproval: true,
      noSecretBoundary: "No client share tokens, token hashes, public URLs, private deliverables, or internal IDs may render in the registry.",
    },
    {
      id: "ai-input.persistence-approval",
      priority: 8,
      area: "AI Input",
      label: "Approve source workflow persistence proof",
      actor: "Owner / Admin",
      surface: "admin",
      state: aiInputProofTargetReady ? "approval_required" : "blocked",
      mode: "approval_required",
      command: "pnpm ai-input:split:check -- --out docs/2_agent-input/generated/agent-loop/reports/owner-ai-input-split-proof.json",
      evidenceTarget: "approved disposable AI Input proof target plus migration/authz/audit review",
      passSignal: "DATTR-024A/B/C/D/E are ready and owner approves persistence proof against a disposable target.",
      failSignal: "Proof target, migration, authz, audit, connector runtime, or cleanup boundary remains absent.",
      blocker: aiInputProofTargetReady ? "migration/authz/audit review" : "approved AI Input proof target",
      nextAction: "Keep AI Input proposal-only until proof target, migration, authz, audit, and connector runtime approvals exist.",
      linkedTasks: ["DATTR-024", "DATTR-024D-CONTRACT", "DATTR-024E"],
      risk: "high",
      writesDatabase: true,
      mutatesExternalProvider: true,
      exposesPublicOutput: false,
      requiresHumanApproval: true,
      noSecretBoundary: "Connector payloads, provider credentials, raw source assets, and module write payloads stay outside this registry.",
    },
    {
      id: "agent.external-registration-approval",
      priority: 9,
      area: "Agent Team OS",
      label: "Approve external agent registration",
      actor: "Owner / Admin",
      surface: "admin",
      state: "approval_required",
      mode: "approval_required",
      command: "Review ARC-028 and AgentFacts-lite manifests before any external registration work.",
      evidenceTarget: "human-approved endpoint, auth, scopes, trust, rollback, and external registration plan",
      passSignal: "All affected agents have endpoint, auth, permission, trust, observability, rollback, and owner approval evidence.",
      failSignal: "Any endpoint, auth, trust, permission, public safety, rollback, or human approval gate is missing.",
      blocker: "external agent collaboration remains HUMAN_APPROVAL_REQUIRED",
      nextAction: "Keep externalRegisterable=false and route external collaboration through scoped context packages only.",
      linkedTasks: ["AGENT-013", "ARC-028"],
      risk: "high",
      writesDatabase: false,
      mutatesExternalProvider: true,
      exposesPublicOutput: true,
      requiresHumanApproval: true,
      noSecretBoundary: "External agents never receive database access, private context, tokens, cookies, or raw internal records.",
    },
  ]

  const readyCount = operatorActionCounts(rows, "ready")
  const ownerRunCount = operatorActionCounts(rows, "owner_run")
  const dryRunOnlyCount = operatorActionCounts(rows, "dry_run_only")
  const approvalRequiredCount = operatorActionCounts(rows, "approval_required")
  const blockedCount = operatorActionCounts(rows, "blocked")
  const highRiskCount = rows.filter((row) => row.risk === "high").length
  const primaryBlockedRow = rows.find((row) => row.state === "blocked")
  const nextTask =
    ownerAuthBoundaryContract.proof.canRunAuth005
      ? "AUTH-005"
      : workProofTargetReady
        ? "WORK-009"
        : ownerEvidenceConsoleContract.summary.nextTask || launchReadinessHistoryContract.summary.nextTask

  return {
    id: "ADMIN-OPS-002",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["admin", "settings"],
    source: LAUNCH_OPERATOR_ACTION_REGISTRY_SOURCE,
    summary: {
      actionCount: rows.length,
      readyCount,
      ownerRunCount,
      dryRunOnlyCount,
      approvalRequiredCount,
      blockedCount,
      highRiskCount,
      primaryBlocker: primaryBlockedRow?.blocker ?? "No blocked operator action in the registry.",
      nextTask,
    },
    requiredActionIds: LAUNCH_OPERATOR_ACTION_REQUIRED_IDS,
    prohibitedExposure: LAUNCH_OPERATOR_ACTION_PROHIBITED_EXPOSURE,
    rows,
  }
}

export async function getLaunchOperatorActionRegistryContract(): Promise<LaunchOperatorActionRegistryContract> {
  const [ownerAuthBoundaryContract, ownerEvidenceConsoleContract, launchReadinessHistoryContract] =
    await Promise.all([
      getOwnerAuthBoundaryContract(),
      getOwnerEvidenceConsoleContract(),
      getLaunchReadinessHistoryContract(),
    ])

  return buildLaunchOperatorActionRegistryContract({
    ownerAuthBoundaryContract,
    ownerEvidenceConsoleContract,
    launchReadinessHistoryContract,
  })
}

export async function getAdminLaunchConsole(): Promise<AdminLaunchConsole> {
  const [auth, loopState, recentEvidence, ownerAuthBoundaryContract] = await Promise.all([
    resolveCurrentUser(),
    readLoopState(),
    readRecentEvidence(),
    getOwnerAuthBoundaryContract(),
  ])

  const [projectCount, permissionSnapshot] = auth.user
    ? await Promise.all([
        getProjectCountForProfile(auth.user.id),
        getModulePermissionSnapshotForProfile({
          profileId: auth.user.id,
          role: auth.user.role,
        }),
      ])
    : [null, getUnauthenticatedModulePermissionSnapshot()]
  const agentProtocolContract = await buildAgentProtocolReadinessContract()
  const currentLevel = loopState.launchLevels?.current ?? "unknown"
  const targetNextLevel = loopState.launchLevels?.targetNext ?? "unknown"
  const currentLoop = loopState.loopProgress?.currentLoop?.toString() ?? "unknown"
  const completedLoops = loopState.loopProgress?.completedLoops?.toString() ?? "unknown"
  const nextLoop = loopState.loopProgress?.nextLoopNumber?.toString() ?? "unknown"
  const authTone = statusTone(auth.status)
  const clientPortalContract = buildClientPortalReadinessContract()
  const operatingSurfaceMaturityContract = buildOperatingSurfaceMaturityContract()
  const backendOperationCatalogSurfaceContract = buildBackendOperationCatalogSurfaceContract()
  const scenarioJourneyContract = buildScenarioJourneyContract()
  const workProofEvidenceSurfaceContract = await buildWorkProofEvidenceSurfaceContract()
  const ownerEvidenceConsoleContract = buildOwnerEvidenceConsoleContract({
    ownerAuthBoundaryContract,
    loopState,
  })
  const launchReadinessHistoryContract = await buildLaunchReadinessHistoryContract({
    loopState,
    recentEvidence,
  })
  const launchOperatorActionRegistryContract = buildLaunchOperatorActionRegistryContract({
    ownerAuthBoundaryContract,
    ownerEvidenceConsoleContract,
    launchReadinessHistoryContract,
  })
  const aiInputSourceWorkflowOpsReadinessContract = await buildAIInputSourceWorkflowOpsReadinessContract({
    canRunAuth005: ownerAuthBoundaryContract.proof.canRunAuth005,
  })
  const auditContract = buildAdminAuditBffContract({
    authStatus: auth.status,
    hasSupabaseConfig: auth.hasSupabaseConfig,
    permissionSnapshot,
    recentEvidenceCount: recentEvidence.length,
    loopNextRecommendedTask: loopState.loopProgress?.nextRecommendedTask,
  })

  const moduleRows: AdminReadinessRow[] = [
    {
      area: "Protected app shell",
      status: "ready",
      signal: "Dashboard routes use Proxy and server layout checks before rendering.",
      nextAction: "Keep adding owner/admin surfaces behind the same route boundary.",
      tone: "good",
    },
    {
      area: "Auth readiness",
      status: authStatusLabels[auth.status],
      signal: auth.hasSupabaseConfig
        ? "Supabase public env exists; real browser session still needs proof."
        : "Supabase public env is missing, so AUTH-005 remains blocked.",
      nextAction: auth.hasSupabaseConfig
        ? "Run AUTH-005 with a real Supabase session."
        : "Configure NEXT_PUBLIC_SUPABASE_URL and publishable key.",
      tone: authTone,
    },
    {
      area: "Owner/demo auth boundary",
      status: ownerAuthBoundaryContract.proof.boundaryStatus,
      signal: `Latest ${AUTH_BOUNDARY_COMMAND} proof status is ${ownerAuthBoundaryContract.proof.overallStatus}; AUTH-005 ready: ${
        ownerAuthBoundaryContract.proof.canRunAuth005 ? "yes" : "no"
      }.`,
      nextAction: ownerAuthBoundaryContract.proof.nextAction,
      tone: ownerAuthBoundaryContract.proof.canRunAuth005
        ? "good"
        : authBoundaryTone(ownerAuthBoundaryContract.proof.overallStatus),
    },
    {
      area: "Launch readiness history",
      status: `${launchReadinessHistoryContract.summary.surfaceCount} surfaces tracked`,
      signal: `${launchReadinessHistoryContract.summary.readyCount} ready, ${launchReadinessHistoryContract.summary.blockedCount} blocked, ${launchReadinessHistoryContract.summary.latestProofCount} latest proof refs.`,
      nextAction: launchReadinessHistoryContract.summary.nextTask,
      tone: launchReadinessHistoryContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      area: "Operator action registry",
      status: `${launchOperatorActionRegistryContract.summary.actionCount} actions tracked`,
      signal: `${launchOperatorActionRegistryContract.summary.readyCount} ready, ${launchOperatorActionRegistryContract.summary.ownerRunCount} owner-run, ${launchOperatorActionRegistryContract.summary.approvalRequiredCount} approval-required, ${launchOperatorActionRegistryContract.summary.blockedCount} blocked.`,
      nextAction: launchOperatorActionRegistryContract.summary.nextTask,
      tone: launchOperatorActionRegistryContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      area: "Backend operation catalog",
      status: `${backendOperationCatalogSurfaceContract.summary.operationCount} operations tracked`,
      signal: `${backendOperationCatalogSurfaceContract.summary.readyLikeCount} ready-like, ${backendOperationCatalogSurfaceContract.summary.ownerRunCount} owner-run, ${backendOperationCatalogSurfaceContract.summary.approvalRequiredCount} approval-required, ${backendOperationCatalogSurfaceContract.summary.blockedCount} blocked.`,
      nextAction: backendOperationCatalogSurfaceContract.summary.nextTask,
      tone: backendOperationCatalogSurfaceContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      area: "Work proof evidence",
      status: `${workProofEvidenceSurfaceContract.summary.freshness} evidence`,
      signal: `Latest Work proof evidence is ${workProofEvidenceSurfaceContract.summary.latestOverallStatus}; WORK-009 ready: ${
        workProofEvidenceSurfaceContract.summary.canRunWork009 ? "yes" : "no"
      }; source smoke ready: ${workProofEvidenceSurfaceContract.summary.sourceStaticReady ? "yes" : "no"}.`,
      nextAction: workProofEvidenceSurfaceContract.summary.nextOwnerAction,
      tone: workProofEvidenceSurfaceContract.summary.workProofPassed
        ? "good"
        : workProofEvidenceSurfaceContract.summary.blockedLikeCount > 0
          ? "warn"
          : "neutral",
    },
    {
      area: "Operating surface maturity",
      status: `${operatingSurfaceMaturityContract.summary.moduleCount} modules tracked`,
      signal: `${operatingSurfaceMaturityContract.summary.dbBackedCount} DB-backed, ${operatingSurfaceMaturityContract.summary.formalReadinessCount} formal-readiness, ${operatingSurfaceMaturityContract.summary.mockOrShellCount} mock/shell, ${operatingSurfaceMaturityContract.summary.highRiskCount} high-risk.`,
      nextAction: operatingSurfaceMaturityContract.summary.nextTask,
      tone: operatingSurfaceMaturityContract.summary.highRiskCount > 0 ? "warn" : "good",
    },
    {
      area: "Scenario journey maturity",
      status: `${scenarioJourneyContract.summary.scenarioCount} scenarios tracked`,
      signal: `${scenarioJourneyContract.summary.partialCount} partial journeys, ${scenarioJourneyContract.summary.blockedCount} blocked journeys; ${scenarioJourneyContract.summary.primaryExperienceGap}`,
      nextAction: scenarioJourneyContract.summary.nextTask,
      tone: scenarioJourneyContract.summary.blockedCount > 0 ? "warn" : "good",
    },
    {
      area: "Work data",
      status: projectCount === null ? "awaiting authenticated profile" : `${projectCount} owner projects`,
      signal: "Work is the only DB-backed operational module.",
      nextAction: "Complete online Work smoke when DB/session connectivity is available.",
      tone: projectCount === null ? "warn" : "good",
    },
    {
      area: "Owner settings",
      status: "protected shell ready",
      signal: "Settings exposes auth readiness, server module snapshot, and browser-only rehearsal controls.",
      nextAction: "Add permission write actions only after audit and authorization contract approval.",
      tone: "good",
    },
    {
      area: "Module permissions",
      status: permissionSourceLabels[permissionSnapshot.source],
      signal: `${permissionSnapshot.enabledModules.length} enabled modules, ${permissionSnapshot.disabledModules.length} hidden modules, ${permissionSnapshot.dbPermissionRows} DB rows.`,
      nextAction: permissionSnapshot.unknownModuleRows > 0
        ? "Review unknown module keys before relying on persisted permission rows."
        : "Use this snapshot for UI defaults; keep service-layer authorization on protected data.",
      tone: permissionSnapshot.unknownModuleRows > 0 ? "warn" : "good",
    },
    {
      area: "Admin console",
      status: "read-only shell ready",
      signal: "This page mirrors launch state, evidence, env presence, and module risk.",
      nextAction: "Add persisted audit/readiness records only after the BFF contract is approved.",
      tone: "good",
    },
    {
      area: "Frontstage",
      status: "public-safe entry ready",
      signal: "Root now exposes a static owner entry with protected owner links and token-only Client Portal guidance.",
      nextAction: "Keep root free of private records, mock tokens, env values, and generated report payloads.",
      tone: "good",
    },
    {
      area: "Client Portal",
      status: clientPortalContract.currentGate.behavior.replace(/_/g, " "),
      signal: "Public token route has a server-only DB-backed loader plus a token lifecycle/readiness contract.",
      nextAction: "Finish token schema, rotation, revoke, audit, storage review, and real DB smoke before client links are launched.",
      tone: clientPortalContract.rows.some((row) => row.tone === "blocked") ? "warn" : "good",
    },
    {
      area: "Agent protocol registry",
      status: agentProtocolContract.status.replace(/_/g, " "),
      signal: `${agentProtocolContract.summary.manifestCount}/${agentProtocolContract.summary.sourceAgentCount} manifests visible to protected owner/admin surfaces.`,
      nextAction: "Keep external registration blocked until endpoint, auth, scopes, trust evidence, rollback, and human approval exist.",
      tone: agentProtocolContract.summary.validationErrorCount > 0 ? "blocked" : "good",
    },
    {
      area: "AI Input persistence",
      status: aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetStatus,
      signal: `${aiInputSourceWorkflowOpsReadinessContract.summary.completeCount} complete boundaries, ${aiInputSourceWorkflowOpsReadinessContract.summary.dryRunOnlyCount} dry-run-only gates, ${aiInputSourceWorkflowOpsReadinessContract.summary.blockedCount} blocked gates.`,
      nextAction: aiInputSourceWorkflowOpsReadinessContract.summary.nextTask,
      tone: "warn",
    },
  ]

  const environmentRows: AdminReadinessRow[] = [
    envRow({
      area: "Supabase project URL",
      envNames: ["NEXT_PUBLIC_SUPABASE_URL"],
      requiredFor: "real auth sessions",
      nextAction: "Add the Supabase project URL to the launch environment.",
    }),
    envRow({
      area: "Supabase publishable key",
      envNames: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      requiredFor: "browser and server Supabase clients",
      nextAction: "Add the publishable key; legacy anon key remains a fallback only.",
    }),
    envRow({
      area: "Database URL",
      envNames: ["DATABASE_URL"],
      requiredFor: "Prisma-backed Work runtime",
      nextAction: "Provide a reachable Supabase or disposable PostgreSQL URL.",
    }),
    envRow({
      area: "Development mock mode",
      envNames: ["PERSONAL_OS_AUTH_MODE"],
      requiredFor: "explicit local-only owner smoke",
      nextAction: "Set PERSONAL_OS_AUTH_MODE=mock only for deliberate local development.",
    }),
    envRow({
      area: "Deployment marker",
      envNames: ["VERCEL_ENV"],
      requiredFor: "online launch environment classification",
      nextAction: "Deploy to a managed environment before final launch review.",
    }),
  ]

  const launchBlockers: AdminReadinessRow[] = [
    {
      area: "AUTH-005",
      status: ownerAuthBoundaryContract.proof.canRunAuth005 ? "ready to rerun" : "blocked",
      signal: "Real Supabase session to Profile mapping is not proven in this environment.",
      nextAction: ownerAuthBoundaryContract.proof.nextAction,
      tone: ownerAuthBoundaryContract.proof.canRunAuth005 ? "warn" : "blocked",
    },
    {
      area: "WORK-007",
      status: "blocked",
      signal: "Online Work persistence proof is still blocked by DB/session connectivity.",
      nextAction: "Use reachable Supabase or a disposable PostgreSQL target for full Work CRUD smoke.",
      tone: "blocked",
    },
    {
      area: "FRONTSTAGE-001",
      status: "done",
      signal: "Public root has a safe owner entry and protected links.",
      nextAction: "Keep root free of private records, mock tokens, env values, and generated report payloads.",
      tone: "good",
    },
    {
      area: "CLIENT-001/002/003",
      status: "containment active",
      signal: "Public client route no longer serves mock/private data, has a gated DB-backed loader, and now exposes a protected readiness contract.",
      nextAction: "Do not share client links until token lifecycle, audit, storage, and real DB smoke gates are complete.",
      tone: clientPortalContract.rows.some((row) => row.tone === "blocked") ? "warn" : "good",
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    auth: {
      mode: auth.mode,
      status: auth.status,
      email: auth.user?.email ?? auth.verifiedEmail ?? "Unavailable",
      hasSupabaseConfig: Boolean(getSupabasePublicConfig()),
    },
    loop: {
      automationId: loopState.automation?.id ?? "unknown",
      cadence: loopState.automation?.cadence ?? "unknown",
      currentLevel,
      targetNextLevel,
      currentLoop: `${currentLoop} / ${loopState.goal?.targetLoops ?? 30}`,
      nextLoop,
      nextRecommendedTask: loopState.loopProgress?.nextRecommendedTask ?? "unknown",
      lastCompletedTask: loopState.loopProgress?.lastCompletedTask ?? "unknown",
      lastCompletedReport: loopState.loopProgress?.lastCompletedReport ?? "unknown",
    },
    summaryItems: [
      {
        label: "Launch level",
        value: currentLevel,
        detail: `Next target: ${targetNextLevel}`,
        tone: levelTone(currentLevel),
      },
      {
        label: "Loop progress",
        value: `${completedLoops} completed`,
        detail: `Next loop ${nextLoop}: ${loopState.loopProgress?.nextRecommendedTask ?? "unknown"}`,
        tone: "neutral",
      },
      {
        label: "Auth readiness",
        value: authStatusLabels[auth.status],
        detail: auth.mode === "mock" ? "Development mock runtime" : "Supabase SSR runtime",
        tone: authTone,
      },
      {
        label: "Owner boundary",
        value: ownerAuthBoundaryContract.proof.boundaryStatus,
        detail: `AUTH-005 ready: ${ownerAuthBoundaryContract.proof.canRunAuth005 ? "yes" : "no"}`,
        tone: ownerAuthBoundaryContract.proof.canRunAuth005
          ? "good"
          : authBoundaryTone(ownerAuthBoundaryContract.proof.overallStatus),
      },
      {
        label: "Readiness history",
        value: `${launchReadinessHistoryContract.summary.readyCount}/${launchReadinessHistoryContract.summary.surfaceCount} ready`,
        detail: `${launchReadinessHistoryContract.summary.blockedCount} blocked; ${launchReadinessHistoryContract.summary.primaryBlocker}.`,
        tone: launchReadinessHistoryContract.summary.blockedCount > 0 ? "warn" : "good",
      },
      {
        label: "Operator actions",
        value: `${launchOperatorActionRegistryContract.summary.actionCount} tracked`,
        detail: `${launchOperatorActionRegistryContract.summary.ownerRunCount} owner-run; ${launchOperatorActionRegistryContract.summary.approvalRequiredCount} approvals.`,
        tone: launchOperatorActionRegistryContract.summary.blockedCount > 0 ? "warn" : "good",
      },
      {
        label: "Backend ops",
        value: `${backendOperationCatalogSurfaceContract.summary.operationCount} operations`,
        detail: `${backendOperationCatalogSurfaceContract.summary.blockedCount} blocked; external registration disabled.`,
        tone: backendOperationCatalogSurfaceContract.summary.blockedCount > 0 ? "warn" : "good",
      },
      {
        label: "Work proof evidence",
        value: workProofEvidenceSurfaceContract.summary.freshness,
        detail: `WORK-009 ready: ${workProofEvidenceSurfaceContract.summary.canRunWork009 ? "yes" : "no"}; latest ${workProofEvidenceSurfaceContract.summary.latestOverallStatus}.`,
        tone: workProofEvidenceSurfaceContract.summary.workProofPassed
          ? "good"
          : workProofEvidenceSurfaceContract.summary.blockedLikeCount > 0
            ? "warn"
            : "neutral",
      },
      {
        label: "Surface maturity",
        value: `${operatingSurfaceMaturityContract.summary.dbBackedCount}/${operatingSurfaceMaturityContract.summary.moduleCount} DB-backed`,
        detail: `${operatingSurfaceMaturityContract.summary.apiCliReadyCount} API/CLI-ready; next ${operatingSurfaceMaturityContract.summary.blockedBy[0]}.`,
        tone: operatingSurfaceMaturityContract.summary.highRiskCount > 0 ? "warn" : "good",
      },
      {
        label: "Scenarios",
        value: `${scenarioJourneyContract.summary.partialCount} partial`,
        detail: `${scenarioJourneyContract.summary.blockedCount} blocked; next ${scenarioJourneyContract.summary.nextTask}.`,
        tone: scenarioJourneyContract.summary.blockedCount > 0 ? "warn" : "good",
      },
      {
        label: "AI Input source",
        value: `${aiInputSourceWorkflowOpsReadinessContract.summary.completeCount} complete`,
        detail: `${aiInputSourceWorkflowOpsReadinessContract.summary.blockedCount} blocked; next ${aiInputSourceWorkflowOpsReadinessContract.summary.nextTask}.`,
        tone: aiInputSourceWorkflowOpsReadinessContract.summary.blockedCount > 0 ? "warn" : "good",
      },
      {
        label: "Work data",
        value: projectCount === null ? "No owner session" : `${projectCount} projects`,
        detail: "Owner-scoped count only; no cross-user data exposed.",
        tone: projectCount === null ? "warn" : "good",
      },
      {
        label: "Module permissions",
        value: permissionSourceLabels[permissionSnapshot.source],
        detail: `${permissionSnapshot.enabledModules.length} enabled; ${permissionSnapshot.dbPermissionRows} persisted rows.`,
        tone: permissionSnapshot.unknownModuleRows > 0 ? "warn" : "good",
      },
    ],
    moduleRows,
    environmentRows,
    launchBlockers,
    ownerAuthBoundaryContract,
    scenarioJourneyContract,
    operatingSurfaceMaturityContract,
    ownerEvidenceConsoleContract,
    launchReadinessHistoryContract,
    launchOperatorActionRegistryContract,
    backendOperationCatalogSurfaceContract,
    workProofEvidenceSurfaceContract,
    aiInputSourceWorkflowOpsReadinessContract,
    auditContract,
    clientPortalContract,
    agentProtocolContract,
    recentEvidence,
  }
}

export async function getAdminLaunchOverview(): Promise<AdminLaunchOverview> {
  const [auth, loopState, ownerAuthBoundaryContract] = await Promise.all([
    resolveCurrentUser(),
    readLoopState(),
    getOwnerAuthBoundaryContract(),
  ])

  const [projectCount, permissionSnapshot] = auth.user
    ? await Promise.all([
        getProjectCountForProfile(auth.user.id),
        getModulePermissionSnapshotForProfile({
          profileId: auth.user.id,
          role: auth.user.role,
        }),
      ])
    : [null, getUnauthenticatedModulePermissionSnapshot()]

  const currentLevel = loopState.launchLevels?.current ?? "unknown"
  const targetNextLevel = loopState.launchLevels?.targetNext ?? "unknown"
  const currentLoop = loopState.loopProgress?.currentLoop?.toString() ?? "unknown"
  const completedLoops = loopState.loopProgress?.completedLoops?.toString() ?? "unknown"
  const nextLoop = loopState.loopProgress?.nextLoopNumber?.toString() ?? "unknown"
  const authTone = statusTone(auth.status)

  return {
    generatedAt: new Date().toISOString(),
    loop: {
      automationId: loopState.automation?.id ?? "unknown",
      cadence: loopState.automation?.cadence ?? "unknown",
      currentLevel,
      targetNextLevel,
      currentLoop: `${currentLoop} / ${loopState.goal?.targetLoops ?? 30}`,
      nextLoop,
      nextRecommendedTask: loopState.loopProgress?.nextRecommendedTask ?? "unknown",
      lastCompletedTask: loopState.loopProgress?.lastCompletedTask ?? "unknown",
      lastCompletedReport: loopState.loopProgress?.lastCompletedReport ?? "unknown",
    },
    summaryItems: [
      {
        label: "Launch level",
        value: currentLevel,
        detail: `Next target: ${targetNextLevel}`,
        tone: levelTone(currentLevel),
      },
      {
        label: "Loop progress",
        value: `${completedLoops} completed`,
        detail: `Next loop ${nextLoop}: ${loopState.loopProgress?.nextRecommendedTask ?? "unknown"}`,
        tone: "neutral",
      },
      {
        label: "Auth readiness",
        value: authStatusLabels[auth.status],
        detail: auth.mode === "mock" ? "Development mock runtime" : "Supabase SSR runtime",
        tone: authTone,
      },
      {
        label: "Owner boundary",
        value: ownerAuthBoundaryContract.proof.boundaryStatus,
        detail: `AUTH-005 ready: ${ownerAuthBoundaryContract.proof.canRunAuth005 ? "yes" : "no"}`,
        tone: ownerAuthBoundaryContract.proof.canRunAuth005
          ? "good"
          : authBoundaryTone(ownerAuthBoundaryContract.proof.overallStatus),
      },
      {
        label: "Work data",
        value: projectCount === null ? "No owner session" : `${projectCount} projects`,
        detail: "Owner-scoped count only; no cross-user data exposed.",
        tone: projectCount === null ? "warn" : "good",
      },
      {
        label: "Module permissions",
        value: permissionSourceLabels[permissionSnapshot.source],
        detail: `${permissionSnapshot.enabledModules.length} enabled; ${permissionSnapshot.dbPermissionRows} persisted rows.`,
        tone: permissionSnapshot.unknownModuleRows > 0 ? "warn" : "good",
      },
      {
        label: "Overview loader",
        value: "lightweight",
        detail: "Full evidence contracts are loaded only on /admin/detail.",
        tone: "good",
      },
      {
        label: "Full details",
        value: "available",
        detail: "Open /admin/detail for protected operator evidence and readiness tables.",
        tone: "neutral",
      },
    ],
    launchBlockers: [
      {
        area: "AUTH-005",
        status: ownerAuthBoundaryContract.proof.canRunAuth005 ? "ready to rerun" : "blocked",
        signal: "Real Supabase session to Profile mapping is not proven in this environment.",
        nextAction: ownerAuthBoundaryContract.proof.nextAction,
        tone: ownerAuthBoundaryContract.proof.canRunAuth005 ? "warn" : "blocked",
      },
      {
        area: "WORK-007/WORK-009",
        status: "blocked",
        signal: "Work persistence proof still needs owner/operator proof target evidence.",
        nextAction: "Use reachable Supabase or a disposable PostgreSQL target for full Work smoke.",
        tone: "blocked",
      },
      {
        area: "DEPLOY-002",
        status: "downstream",
        signal: "Private online deployment proof remains downstream of auth and Work evidence.",
        nextAction: "Do not claim online launch from local route performance evidence.",
        tone: "warn",
      },
      {
        area: "ADMIN-006",
        status: "overview optimized",
        signal: "The admin overview uses a lightweight read-only loader; full evidence remains protected on /admin/detail.",
        nextAction: "Use /admin/detail for deep launch evidence and operator readiness review.",
        tone: "good",
      },
    ],
  }
}

export async function getAdminOwnerEvidenceSection(): Promise<AdminOwnerEvidenceSection> {
  const [overview, ownerEvidenceConsoleContract] = await Promise.all([
    getAdminLaunchOverview(),
    getOwnerEvidenceConsoleContract(),
  ])

  return {
    ...overview,
    ownerEvidenceConsoleContract,
  }
}

function findScenario(rows: ScenarioJourneyRow[], scenario: string) {
  return rows.find((row) => row.scenario === scenario)
}

export async function getDailyCommandCenter(): Promise<DailyCommandCenterContract> {
  const consoleState = await getAdminLaunchConsole()
  const scenarioRows = consoleState.scenarioJourneyContract.rows
  const ownerSignInScenario = findScenario(scenarioRows, "Owner signs in and starts real work")
  const dailyStartScenario = findScenario(scenarioRows, "Daily command start")
  const workScenario = findScenario(scenarioRows, "Operate a Work project end to end")
  const aiInputScenario = findScenario(scenarioRows, "Capture source material and let AI triage it")
  const agentCommandScenario = findScenario(scenarioRows, "Ask an agent to prepare work through a command")
  const adminScenario = findScenario(scenarioRows, "Operate the system as an admin")

  const actions: DailyCommandCenterAction[] = [
    {
      id: "auth-owner-proof",
      lane: "proof",
      title: "Prove real owner sign-in",
      status: consoleState.ownerAuthBoundaryContract.proof.canRunAuth005 ? "ready to run" : "blocked",
      actor: ownerSignInScenario?.actor ?? "Owner",
      href: "/auth/status",
      hrefLabel: "Auth status",
      sourceScenario: ownerSignInScenario?.scenario ?? "Owner signs in and starts real work",
      linkedTask: "AUTH-005",
      signal: "Real Supabase session to Profile mapping is still the first launch proof gate.",
      nextAction: consoleState.ownerAuthBoundaryContract.proof.nextAction,
      boundary: "No cookies, tokens, raw claims, provider payloads, profile IDs, or Supabase env values are exposed.",
      tone: consoleState.ownerAuthBoundaryContract.proof.canRunAuth005 ? "warn" : "blocked",
    },
    {
      id: "work-refresh-proof",
      lane: "operate",
      title: "Run the Work refresh proof when a disposable DB target exists",
      status: "target needed",
      actor: workScenario?.actor ?? "Owner / WorkAgent",
      href: "/work",
      hrefLabel: "Work",
      sourceScenario: workScenario?.scenario ?? "Operate a Work project end to end",
      linkedTask: "WORK-009",
      signal: "Work is the only operational DB-backed module, but its refresh proof is still dry-run-only locally.",
      nextAction: workScenario?.nextAction ?? "Run the disposable Work proof harness against an approved local/disposable target.",
      boundary: "No production DB mutation; proof writes require explicit disposable-target confirmation and cleanup.",
      tone: "warn",
    },
    {
      id: "ai-input-capture",
      lane: "capture",
      title: "Capture and triage source material through the formal AI Input surface",
      status: "formal",
      actor: aiInputScenario?.actor ?? "Owner / AI Input Agent",
      href: "/ai-input",
      hrefLabel: "AI Input",
      sourceScenario: aiInputScenario?.scenario ?? "Capture source material and let AI triage it",
      linkedTask: "DATTR-024",
      signal: "AI Input has a formal-mode workbench and clear persistence gaps, but SourceWorkflow objects are not DB-backed yet.",
      nextAction: aiInputScenario?.nextAction ?? "Split persistence into schema, BFF, and service slices after the real-data matrix.",
      boundary: "Mock and readiness state must remain labelled; no connector sync, fetch, OCR, transcription, or hidden persistence.",
      tone: "warn",
    },
    {
      id: "agent-command-readiness",
      lane: "agent",
      title: "Prepare agent commands through owner-only dry-run boundaries",
      status: "internal only",
      actor: agentCommandScenario?.actor ?? "Owner / Agent Team OS",
      href: "/admin",
      hrefLabel: "Admin",
      sourceScenario: agentCommandScenario?.scenario ?? "Ask an agent to prepare work through a command",
      linkedTask: "AUDIT-OPS-001",
      signal: "`pnpm agent:op` is dry-run only; protected API, operation inbox, approval queue, and persisted run audit are not live.",
      nextAction: agentCommandScenario?.nextAction ?? "Define audit/event contract before any approval queue or bounded write path.",
      boundary: "Internal protected readiness only; externalRegisterable remains false and external agent access is blocked.",
      tone: consoleState.agentProtocolContract.summary.validationErrorCount > 0 ? "blocked" : "warn",
    },
    {
      id: "admin-evidence-review",
      lane: "admin",
      title: "Review launch blockers and latest evidence",
      status: consoleState.loop.currentLevel,
      actor: adminScenario?.actor ?? "Owner / Operator",
      href: "/admin",
      hrefLabel: "Admin",
      sourceScenario: adminScenario?.scenario ?? "Operate the system as an admin",
      linkedTask: "AUDIT-OPS-001",
      signal: `${consoleState.loop.currentLoop} is complete/readable; next loop ${consoleState.loop.nextLoop} is routed by proof availability.`,
      nextAction: consoleState.loop.nextRecommendedTask,
      boundary: "Admin remains read-only; no user management, permission writes, deployment mutation, audit persistence, migration, or seed.",
      tone: consoleState.loop.currentLevel.startsWith("L0") ? "warn" : "good",
    },
    {
      id: "real-data-migration",
      lane: "real_data",
      title: "Convert scenario gaps into one real-data path at a time",
      status: "matrix gate",
      actor: dailyStartScenario?.actor ?? "Owner",
      href: "/settings",
      hrefLabel: "Settings",
      sourceScenario: dailyStartScenario?.scenario ?? "Daily command start",
      linkedTask: "REALDATA-001",
      signal: consoleState.scenarioJourneyContract.summary.primaryExperienceGap,
      nextAction: dailyStartScenario?.nextAction ?? "Map the first cross-module real-data objects before expanding runtime writes.",
      boundary: "High-risk Life, Finance, Company, Client Portal, and public-output paths stay proposal-only until approval gates exist.",
      tone: "warn",
    },
  ]

  const blockedCount = actions.filter((action) => action.tone === "blocked").length
  const warningCount = actions.filter((action) => action.tone === "warn").length

  return {
    id: "SCENARIO-002",
    status: "read_only_active",
    generatedAt: new Date().toISOString(),
    sharedBy: ["dashboard"],
    source: {
      scenarioContract: "SCENARIO-001",
      maturityResearch: "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
      operatingSurfaceResearch: "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
      acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    },
    summary: {
      actionCount: actions.length,
      blockedCount,
      warningCount,
      launchLevel: consoleState.loop.currentLevel,
      nextLoop: consoleState.loop.nextLoop,
      nextRecommendedTask: consoleState.loop.nextRecommendedTask,
      primaryAction: consoleState.ownerAuthBoundaryContract.proof.canRunAuth005
        ? "Run AUTH-005 with signed-in auth evidence, then prove Work owner scope."
        : "Use the protected daily queue to advance runtime scenarios while auth and Work proof targets remain absent.",
    },
    prohibitedWrites: [
      "Prisma schema changes",
      "database migrations or seeds",
      "DB writes",
      "public output expansion",
      "token lifecycle writes",
      "high-risk module final writes",
      "autonomous agent writes",
      "external agent registration",
      "raw generated report rendering",
      "provider or environment secret exposure",
    ],
    ownerEvidenceConsoleContract: consoleState.ownerEvidenceConsoleContract,
    actions,
  }
}
