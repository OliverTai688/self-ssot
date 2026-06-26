import "server-only"

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"

export type AgentProtocolReadinessTone = "good" | "warn" | "blocked" | "neutral"

export type AgentProtocolReadinessRow = {
  area: string
  status: string
  signal: string
  nextGate: string
  tone: AgentProtocolReadinessTone
}

export type AgentProtocolMissingField = {
  field: string
  agentCount: number
  reason: string
}

export type AgentProtocolReadinessContract = {
  id: "AGENT-007"
  status: "protected_read_only_active" | "registry_validation_unavailable"
  generatedAt: string
  visibility: {
    surfaces: Array<"admin" | "settings">
    protectedOnly: true
    publicDirectory: false
    publicEndpointCreated: false
    externalRegistryWrite: false
  }
  files: {
    manifestFile: string
    indexFile: string
    latestValidationReport: string | null
  }
  summary: {
    sourceAgentCount: number
    manifestCount: number
    internalDiscoverableCount: number
    externalRegisterableCount: number
    runtimeEndpointCount: number
    validationErrorCount: number
    validationWarningCount: number
    highOrCriticalCapabilityCount: number
    highOrCriticalCapabilitiesGatedCount: number
    humanApprovalRequiredAgents: number
    autoProposeAgents: number
    externalRegistrationStatus: "blocked_by_policy" | "unknown"
  }
  missingRegistrationReadinessFields: AgentProtocolMissingField[]
  rows: AgentProtocolReadinessRow[]
  prohibitedThisSlice: string[]
  nextTaskCandidates: string[]
}

type AgentCapability = {
  riskLevel?: unknown
  requiresHumanApproval?: unknown
}

type AgentManifest = {
  label?: unknown
  lifecycle?: {
    ownerModule?: unknown
    status?: unknown
  }
  endpoints?: {
    internal?: unknown
    external?: unknown
  }
  capabilities?: unknown
  auth?: {
    methods?: unknown
    requiredScopes?: unknown
  }
  trust?: {
    approvalLevel?: unknown
    attestations?: unknown
  }
  observability?: {
    telemetryClaims?: unknown
  }
  registry?: {
    internalDiscoverable?: unknown
    externalRegisterable?: unknown
    registrationStatus?: unknown
    registryTargets?: unknown
  }
}

type ManifestRegistry = {
  manifests?: unknown
}

type ManifestIndex = {
  coverage?: {
    sourceAgentCount?: unknown
    manifestCount?: unknown
  }
  registryState?: {
    externalRegisterable?: unknown
    registrationStatus?: unknown
    runtimeEndpoint?: unknown
    publicDirectory?: unknown
  }
}

type ValidationReport = {
  status?: unknown
  files?: {
    manifestFile?: unknown
    indexFile?: unknown
  }
  summary?: {
    sourceAgentCount?: unknown
    manifestCount?: unknown
    internalDiscoverableCount?: unknown
    externalRegisterableCount?: unknown
    runtimeEndpointCount?: unknown
    highOrCriticalCapabilityCount?: unknown
    highOrCriticalCapabilitiesGatedCount?: unknown
  }
  validation?: {
    errors?: unknown
    warnings?: unknown
  }
  externalRegistration?: {
    status?: unknown
    missingRegistrationReadinessFields?: unknown
    blockers?: unknown
  }
}

const MANIFEST_FILE =
  "docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json"
const INDEX_FILE = "docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json"
const REPORT_DIR = "docs/2_agent-input/generated/agent-loop/reports"
const REPO_ROOT = process.cwd()
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs",
  "2_agent-input",
  "generated",
  "agent-loop",
  "agent-registry",
  "internal-agent-manifests.agentfacts-lite.json"
)
const INDEX_PATH = path.join(
  REPO_ROOT,
  "docs",
  "2_agent-input",
  "generated",
  "agent-loop",
  "agent-registry",
  "manifest-index.json"
)
const REPORT_DIR_PATH = path.join(
  REPO_ROOT,
  "docs",
  "2_agent-input",
  "generated",
  "agent-loop",
  "reports"
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asRecordArray<T extends Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter(isRecord) as T[] : []
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback = "unknown") {
  return typeof value === "string" && value.trim() ? value : fallback
}

function toneForValidation(errorCount: number, warningCount: number): AgentProtocolReadinessTone {
  if (errorCount > 0) return "blocked"
  if (warningCount > 0) return "warn"
  return "good"
}

async function readJson<T>(absolutePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(absolutePath, "utf8")) as T
  } catch {
    return null
  }
}

async function readLatestValidationReport(): Promise<{
  path: string | null
  report: ValidationReport | null
}> {
  try {
    const names = (await readdir(REPORT_DIR_PATH)).filter((name) =>
      name.endsWith("agent-registry-check.json")
    )

    const reports = await Promise.all(
      names.map(async (name) => {
        const relativePath = `${REPORT_DIR}/${name}`
        const absolutePath = path.join(REPORT_DIR_PATH, name)
        const fileStat = await stat(absolutePath)
        return { absolutePath, relativePath, mtimeMs: fileStat.mtimeMs }
      })
    )

    const latest = reports.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]
    if (!latest) return { path: null, report: null }

    return {
      path: latest.relativePath,
      report: await readJson<ValidationReport>(latest.absolutePath),
    }
  } catch {
    return { path: null, report: null }
  }
}

function countEndpoints(manifests: AgentManifest[]) {
  return manifests.reduce(
    (total, manifest) =>
      total + asArray(manifest.endpoints?.internal).length + asArray(manifest.endpoints?.external).length,
    0
  )
}

function countAuthMethods(manifests: AgentManifest[]) {
  return manifests.reduce(
    (total, manifest) =>
      total + asArray(manifest.auth?.methods).length + asArray(manifest.auth?.requiredScopes).length,
    0
  )
}

function countRegistryTargets(manifests: AgentManifest[]) {
  return manifests.reduce(
    (total, manifest) => total + asArray(manifest.registry?.registryTargets).length,
    0
  )
}

function getCapabilities(manifests: AgentManifest[]) {
  return manifests.flatMap((manifest) =>
    asRecordArray<AgentCapability & Record<string, unknown>>(manifest.capabilities)
  )
}

function buildMissingFields(manifests: AgentManifest[], validationReport: ValidationReport | null) {
  const fromReport = validationReport?.externalRegistration?.missingRegistrationReadinessFields
  if (Array.isArray(fromReport)) {
    return fromReport
      .filter(isRecord)
      .map((item) => ({
        field: asString(item.field),
        agentCount: asNumber(item.agentCount),
        reason: asString(item.reason),
      }))
  }

  return [
    {
      field: "endpoints.external",
      agentCount: manifests.filter((manifest) => asArray(manifest.endpoints?.external).length === 0).length,
      reason: "No reviewed runtime public endpoint has been created.",
    },
    {
      field: "auth.methods",
      agentCount: manifests.filter((manifest) => asArray(manifest.auth?.methods).length === 0).length,
      reason: "No runtime auth method has been approved for agent registry access.",
    },
    {
      field: "auth.requiredScopes",
      agentCount: manifests.filter((manifest) => asArray(manifest.auth?.requiredScopes).length === 0).length,
      reason: "No owner/admin scopes have been defined for runtime agent discovery.",
    },
    {
      field: "trust.attestations",
      agentCount: manifests.filter((manifest) => asArray(manifest.trust?.attestations).length === 0).length,
      reason: "No external trust attestations or verification statements exist.",
    },
    {
      field: "registry.registryTargets",
      agentCount: manifests.filter((manifest) => asArray(manifest.registry?.registryTargets).length === 0).length,
      reason: "No external registry target has human approval.",
    },
  ]
}

function buildUnavailableContract(): AgentProtocolReadinessContract {
  return {
    id: "AGENT-007",
    status: "registry_validation_unavailable",
    generatedAt: new Date().toISOString(),
    visibility: {
      surfaces: ["admin", "settings"],
      protectedOnly: true,
      publicDirectory: false,
      publicEndpointCreated: false,
      externalRegistryWrite: false,
    },
    files: {
      manifestFile: MANIFEST_FILE,
      indexFile: INDEX_FILE,
      latestValidationReport: null,
    },
    summary: {
      sourceAgentCount: 0,
      manifestCount: 0,
      internalDiscoverableCount: 0,
      externalRegisterableCount: 0,
      runtimeEndpointCount: 0,
      validationErrorCount: 1,
      validationWarningCount: 0,
      highOrCriticalCapabilityCount: 0,
      highOrCriticalCapabilitiesGatedCount: 0,
      humanApprovalRequiredAgents: 0,
      autoProposeAgents: 0,
      externalRegistrationStatus: "unknown",
    },
    missingRegistrationReadinessFields: [],
    rows: [
      {
        area: "Registry evidence",
        status: "unavailable",
        signal: "Generated AgentFacts-lite manifest or validation evidence could not be read.",
        nextGate: "Run pnpm agent:registry:check and keep generated registry files in the workspace.",
        tone: "blocked",
      },
    ],
    prohibitedThisSlice: [
      "public agent directory",
      "runtime agent endpoint",
      "external registry write",
      "database schema change or migration",
      "provider or secret access",
      "autonomous high-risk action",
    ],
    nextTaskCandidates: [
      "AGENT-006 rerun validation if generated evidence is missing",
      "LOOP-030 launch-level review",
    ],
  }
}

export async function buildAgentProtocolReadinessContract(): Promise<AgentProtocolReadinessContract> {
  const [manifestRegistry, manifestIndex, latestValidation] = await Promise.all([
    readJson<ManifestRegistry>(MANIFEST_PATH),
    readJson<ManifestIndex>(INDEX_PATH),
    readLatestValidationReport(),
  ])

  if (!manifestRegistry || !manifestIndex) {
    return buildUnavailableContract()
  }

  const manifests = asRecordArray<AgentManifest & Record<string, unknown>>(manifestRegistry.manifests)
  const validationReport = latestValidation.report
  const capabilities = getCapabilities(manifests)
  const highOrCriticalCapabilities = capabilities.filter((capability) =>
    ["HIGH", "CRITICAL"].includes(asString(capability.riskLevel, ""))
  )
  const highOrCriticalCapabilitiesGated = highOrCriticalCapabilities.filter(
    (capability) => capability.requiresHumanApproval === true
  )
  const validationErrors = asArray(validationReport?.validation?.errors)
  const validationWarnings = asArray(validationReport?.validation?.warnings)
  const sourceAgentCount =
    asNumber(validationReport?.summary?.sourceAgentCount) ||
    asNumber(manifestIndex.coverage?.sourceAgentCount) ||
    manifests.length
  const manifestCount =
    asNumber(validationReport?.summary?.manifestCount) ||
    asNumber(manifestIndex.coverage?.manifestCount) ||
    manifests.length
  const internalDiscoverableCount =
    asNumber(validationReport?.summary?.internalDiscoverableCount) ||
    manifests.filter((manifest) => manifest.registry?.internalDiscoverable === true).length
  const externalRegisterableCount =
    asNumber(validationReport?.summary?.externalRegisterableCount) ||
    manifests.filter((manifest) => manifest.registry?.externalRegisterable === true).length
  const runtimeEndpointCount =
    asNumber(validationReport?.summary?.runtimeEndpointCount) || countEndpoints(manifests)
  const humanApprovalRequiredAgents = manifests.filter(
    (manifest) => manifest.trust?.approvalLevel === "HUMAN_APPROVAL_REQUIRED"
  ).length
  const autoProposeAgents = manifests.filter(
    (manifest) => manifest.trust?.approvalLevel === "AUTO_PROPOSE"
  ).length
  const externalRegistrationStatus =
    validationReport?.externalRegistration?.status === "blocked_by_policy" ? "blocked_by_policy" : "unknown"
  const missingFields = buildMissingFields(manifests, validationReport)
  const validationTone = toneForValidation(validationErrors.length, validationWarnings.length)

  const rows: AgentProtocolReadinessRow[] = [
    {
      area: "Manifest coverage",
      status: manifestCount === sourceAgentCount && manifestCount > 0 ? "complete" : "incomplete",
      signal: `${manifestCount}/${sourceAgentCount} internal agents have generated AgentFacts-lite manifests.`,
      nextGate: "Keep ARC-020, manifest inventory, and validation proof aligned whenever an internal agent changes.",
      tone: manifestCount === sourceAgentCount && manifestCount > 0 ? "good" : "blocked",
    },
    {
      area: "Validation proof",
      status: asString(validationReport?.status, "missing"),
      signal: `${validationErrors.length} validation errors and ${validationWarnings.length} warnings from the latest registry check.`,
      nextGate: "Run pnpm agent:registry:check after every manifest or trust-boundary change.",
      tone: validationTone,
    },
    {
      area: "Trust boundary",
      status: `${highOrCriticalCapabilitiesGated.length}/${highOrCriticalCapabilities.length} high-risk gates`,
      signal: `${humanApprovalRequiredAgents} agents require human approval; ${autoProposeAgents} remain proposal-only.`,
      nextGate: "Do not allow high-risk final writes, public output, auth/permission changes, or external collaboration without human approval.",
      tone:
        highOrCriticalCapabilitiesGated.length === highOrCriticalCapabilities.length ? "good" : "blocked",
    },
    {
      area: "Runtime endpoint and auth",
      status: runtimeEndpointCount === 0 && countAuthMethods(manifests) === 0 ? "not exposed" : "review required",
      signal: `${runtimeEndpointCount} runtime endpoints and ${countAuthMethods(manifests)} runtime auth/scope entries are declared.`,
      nextGate: "Endpoint, auth method, and owner/admin scope review are required before any runtime registry access.",
      tone: runtimeEndpointCount === 0 && countAuthMethods(manifests) === 0 ? "good" : "blocked",
    },
    {
      area: "External registration",
      status: externalRegistrationStatus,
      signal: `${externalRegisterableCount} externally registerable agents; ${countRegistryTargets(manifests)} registry targets declared.`,
      nextGate: "External registration requires endpoint review, auth review, trust evidence, rollback plan, and explicit human approval.",
      tone: externalRegisterableCount === 0 ? "good" : "blocked",
    },
    {
      area: "Protected visibility",
      status: "admin/settings only",
      signal: "The readiness contract is rendered inside protected dashboard routes and does not create a public directory or endpoint.",
      nextGate: "Keep this read-only until a reviewed adapter and registration approval workflow exist.",
      tone: "good",
    },
  ]

  return {
    id: "AGENT-007",
    status: validationErrors.length === 0 ? "protected_read_only_active" : "registry_validation_unavailable",
    generatedAt: new Date().toISOString(),
    visibility: {
      surfaces: ["admin", "settings"],
      protectedOnly: true,
      publicDirectory: false,
      publicEndpointCreated: false,
      externalRegistryWrite: false,
    },
    files: {
      manifestFile: MANIFEST_FILE,
      indexFile: INDEX_FILE,
      latestValidationReport: latestValidation.path,
    },
    summary: {
      sourceAgentCount,
      manifestCount,
      internalDiscoverableCount,
      externalRegisterableCount,
      runtimeEndpointCount,
      validationErrorCount: validationErrors.length,
      validationWarningCount: validationWarnings.length,
      highOrCriticalCapabilityCount: highOrCriticalCapabilities.length,
      highOrCriticalCapabilitiesGatedCount: highOrCriticalCapabilitiesGated.length,
      humanApprovalRequiredAgents,
      autoProposeAgents,
      externalRegistrationStatus,
    },
    missingRegistrationReadinessFields: missingFields,
    rows,
    prohibitedThisSlice: [
      "public agent directory",
      "runtime agent endpoint",
      "external registry write",
      "database schema change or migration",
      "provider or secret access",
      "autonomous high-risk action",
      "direct external-agent access to private context",
    ],
    nextTaskCandidates: [
      "LOOP-030 launch-level review and post-30 convergence decision",
      "AGENT-008 NANDA Index adapter and registration approval workflow proposal",
      "AUTH-005 real Supabase session/Profile proof if env/session evidence appears",
      "WORK-009 disposable Work proof run if a safe target appears",
    ],
  }
}
