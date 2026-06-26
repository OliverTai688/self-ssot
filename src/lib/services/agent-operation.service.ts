import "server-only"

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import {
  AGENT_OPERATION_API_CONTRACT,
  AGENT_OPERATION_API_OPERATIONS,
  type AgentOperationApiOperation,
} from "@/lib/contracts/agent-operation-api.contract"

const MANIFEST_PATH =
  "docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json"
const INDEX_PATH = "docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json"
const MANIFEST_FILE = resolve(process.cwd(), MANIFEST_PATH)
const INDEX_FILE = resolve(process.cwd(), INDEX_PATH)

const sensitiveKeyPattern =
  /cookie|token|secret|service.?role|database.?url|database.?host|profile.?id|auth.?claim|provider.?payload|session|supabase|private.?record/i
const sensitiveValuePattern =
  /DATABASE_URL|DIRECT_DATABASE_URL|SUPABASE_|service.?role|refresh.?token|access.?token|set-cookie|bearer\s+/i

type AgentRegistryManifest = {
  id?: string
  agent_name?: string
  label?: string
  lifecycle?: {
    status?: string
  }
  protocols?: string[]
  endpoints?: {
    internal?: unknown[]
    external?: unknown[]
  }
  trust?: {
    approvalLevel?: string
    dataVisibilityLevel?: string
  }
  registry?: {
    internalDiscoverable?: boolean
    externalRegisterable?: boolean
    registrationStatus?: string
  }
}

type AgentRegistry = {
  manifests?: AgentRegistryManifest[]
}

type AgentRegistryIndex = {
  sourceOfTruth?: string
  manifestFile?: string
  coverage?: {
    manifestCount?: number
  }
  registryState?: {
    internalDiscoverable?: boolean
    externalRegisterable?: boolean
    registrationStatus?: string
    runtimeEndpoint?: string | null
    publicDirectory?: boolean
  }
}

type AgentOperationPayload = {
  operationId: string
  mode: "dry_run"
  agentLabel?: string
  targetModule?: string
  requestedChecks: string[]
  clientRequestId?: string
}

type AgentOperationErrorBody = {
  error: string
  code:
    | "invalid_operation_or_input"
    | "registry_unavailable"
  allowedOperations?: string[]
  nextAction: string
}

export type AgentOperationDryRunProof = {
  schemaVersion: 1
  generatedAt: string
  request: {
    endpoint: typeof AGENT_OPERATION_API_CONTRACT.endpoint.path
    method: typeof AGENT_OPERATION_API_CONTRACT.endpoint.method
    clientRequestId: string | null
  }
  mode: "dry_run"
  status: "ready_for_owner_dry_run"
  selectedOperation: AgentOperationApiOperation & {
    requestedAgent: string
    requestedTargetModule: string
    requestedChecks: string[]
  }
  agentManifestSnapshot: {
    id: string | null
    agent_name: string | null
    label: string
    lifecycleStatus: string | null
    protocols: string[]
    approvalLevel: string | null
    dataVisibilityLevel: string | null
    internalDiscoverable: boolean
    externalRegisterable: boolean
    registrationStatus: string | null
    endpointCounts: {
      internal: number
      external: number
    }
  }
  registrySnapshot: {
    sourceOfTruth: string | null
    manifestFile: string | null
    manifestCount: number
    internalDiscoverable: boolean
    externalRegisterable: boolean
    registrationStatus: string | null
    runtimeEndpoint: string | null
    publicDirectory: boolean
  }
  safety: {
    internalHttpEndpointUsed: true
    publicEndpointCreated: false
    writesPerformed: false
    databaseAccessed: false
    providerCalled: false
    environmentRead: false
    externalRegistryWrite: false
    externalRegisterableAfterRun: false
    externalAgentDatabaseAccess: false
    autonomousExecution: false
    highRiskFinalWrite: false
    rawSecretsIncluded: false
    auditPersisted: false
    blockedIfRunRequested: true
    reasons: string[]
  }
  validation: {
    agentMatchesOperation: true
    targetMatchesOperation: true
    internalDiscoverable: true
    externalRegisterableBlocked: true
    allowedModeIsDryRunOnly: true
  }
  nextReview: string
}

export type AgentOperationDryRunResult =
  | {
      ok: true
      status: 200
      body: AgentOperationDryRunProof
    }
  | {
      ok: false
      status: 400 | 503
      body: AgentOperationErrorBody
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function findSensitiveInput(value: unknown, path = "body"): string | null {
  if (typeof value === "string") {
    return sensitiveValuePattern.test(value) ? path : null
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findSensitiveInput(item, `${path}[${index}]`)
      if (found) return found
    }
    return null
  }

  if (!isRecord(value)) return null

  for (const [key, nestedValue] of Object.entries(value)) {
    if (sensitiveKeyPattern.test(key)) {
      return `${path}.${key}`
    }

    const found = findSensitiveInput(nestedValue, `${path}.${key}`)
    if (found) return found
  }

  return null
}

function createInvalidInput(
  error: string,
  nextAction = "Send operationId, mode: dry_run, and optional safe labels only."
): AgentOperationDryRunResult {
  return {
    ok: false,
    status: 400,
    body: {
      error,
      code: "invalid_operation_or_input",
      allowedOperations: AGENT_OPERATION_API_OPERATIONS.map((operation) => operation.id),
      nextAction,
    },
  }
}

function parsePayload(input: unknown): AgentOperationPayload | AgentOperationDryRunResult {
  if (!isRecord(input)) {
    return createInvalidInput("Request body must be a JSON object.")
  }

  const sensitivePath = findSensitiveInput(input)
  if (sensitivePath) {
    return createInvalidInput(`Request contains a forbidden private or secret-like field at ${sensitivePath}.`)
  }

  if (typeof input.operationId !== "string" || input.operationId.length > 120) {
    return createInvalidInput("operationId is required and must be a short string.")
  }

  if (input.mode !== "dry_run") {
    return createInvalidInput("Only mode: dry_run is accepted.")
  }

  if (input.agentLabel !== undefined && (typeof input.agentLabel !== "string" || input.agentLabel.length > 120)) {
    return createInvalidInput("agentLabel must be a short string when provided.")
  }

  if (
    input.targetModule !== undefined &&
    (typeof input.targetModule !== "string" || input.targetModule.length > 120)
  ) {
    return createInvalidInput("targetModule must be a short string when provided.")
  }

  if (input.clientRequestId !== undefined && (typeof input.clientRequestId !== "string" || input.clientRequestId.length > 120)) {
    return createInvalidInput("clientRequestId must be a short string when provided.")
  }

  if (input.requestedChecks !== undefined) {
    if (!isStringArray(input.requestedChecks)) {
      return createInvalidInput("requestedChecks must be an array of short strings when provided.")
    }

    if (input.requestedChecks.length > 20 || input.requestedChecks.some((item) => item.length > 80)) {
      return createInvalidInput("requestedChecks can include at most 20 short labels.")
    }
  }

  return {
    operationId: input.operationId,
    mode: "dry_run",
    agentLabel: input.agentLabel,
    targetModule: input.targetModule,
    requestedChecks: input.requestedChecks ?? [],
    clientRequestId: input.clientRequestId,
  }
}

function findOperation(operationId: string) {
  return AGENT_OPERATION_API_OPERATIONS.find((operation) => operation.id === operationId)
}

async function readRegistryFiles() {
  const [registryText, indexText] = await Promise.all([
    readFile(MANIFEST_FILE, "utf8"),
    readFile(INDEX_FILE, "utf8"),
  ])

  return {
    registry: JSON.parse(registryText) as AgentRegistry,
    index: JSON.parse(indexText) as AgentRegistryIndex,
  }
}

function registryUnavailable(error: string): AgentOperationDryRunResult {
  return {
    ok: false,
    status: 503,
    body: {
      error,
      code: "registry_unavailable",
      nextAction: "Run pnpm agent:registry:check and verify the generated internal AgentFacts-lite registry files.",
    },
  }
}

export async function buildAgentOperationDryRun(input: unknown): Promise<AgentOperationDryRunResult> {
  const payload = parsePayload(input)
  if ("ok" in payload) return payload

  const operation = findOperation(payload.operationId)
  if (!operation) {
    return createInvalidInput(`Unknown operation: ${payload.operationId}`)
  }

  const effectiveAgent = payload.agentLabel ?? operation.ownerAgent
  const effectiveTargetModule = payload.targetModule ?? operation.targetModule

  if (effectiveAgent !== operation.ownerAgent) {
    return createInvalidInput("agentLabel must match the operation owner agent.")
  }

  if (effectiveTargetModule !== operation.targetModule) {
    return createInvalidInput("targetModule must match the operation target module.")
  }

  let registry: AgentRegistry
  let index: AgentRegistryIndex
  try {
    const files = await readRegistryFiles()
    registry = files.registry
    index = files.index
  } catch {
    return registryUnavailable("Internal AgentFacts-lite registry files are unavailable.")
  }

  const manifest = registry.manifests?.find((item) => item.label === effectiveAgent)
  if (!manifest?.label) {
    return registryUnavailable(`Agent is not in the internal AgentFacts-lite registry: ${effectiveAgent}`)
  }

  const internalDiscoverable = manifest.registry?.internalDiscoverable === true
  const externalRegisterable = manifest.registry?.externalRegisterable === true
  if (!internalDiscoverable || externalRegisterable) {
    return registryUnavailable("Agent registry trust boundary is not ready for protected dry-run.")
  }

  const allowedModeIsDryRunOnly =
    operation.allowedModes.length === 1 && operation.allowedModes.includes("dry_run")
  if (!allowedModeIsDryRunOnly) {
    return registryUnavailable("Agent operation is not dry-run-only.")
  }

  return {
    ok: true,
    status: 200,
    body: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      request: {
        endpoint: AGENT_OPERATION_API_CONTRACT.endpoint.path,
        method: AGENT_OPERATION_API_CONTRACT.endpoint.method,
        clientRequestId: payload.clientRequestId ?? null,
      },
      mode: "dry_run",
      status: "ready_for_owner_dry_run",
      selectedOperation: {
        ...operation,
        requestedAgent: effectiveAgent,
        requestedTargetModule: effectiveTargetModule,
        requestedChecks: payload.requestedChecks,
      },
      agentManifestSnapshot: {
        id: manifest.id ?? null,
        agent_name: manifest.agent_name ?? null,
        label: manifest.label,
        lifecycleStatus: manifest.lifecycle?.status ?? null,
        protocols: manifest.protocols ?? [],
        approvalLevel: manifest.trust?.approvalLevel ?? null,
        dataVisibilityLevel: manifest.trust?.dataVisibilityLevel ?? null,
        internalDiscoverable,
        externalRegisterable,
        registrationStatus: manifest.registry?.registrationStatus ?? null,
        endpointCounts: {
          internal: manifest.endpoints?.internal?.length ?? 0,
          external: manifest.endpoints?.external?.length ?? 0,
        },
      },
      registrySnapshot: {
        sourceOfTruth: index.sourceOfTruth ?? null,
        manifestFile: index.manifestFile ?? null,
        manifestCount: index.coverage?.manifestCount ?? registry.manifests?.length ?? 0,
        internalDiscoverable: index.registryState?.internalDiscoverable === true,
        externalRegisterable: index.registryState?.externalRegisterable === true,
        registrationStatus: index.registryState?.registrationStatus ?? null,
        runtimeEndpoint: index.registryState?.runtimeEndpoint ?? null,
        publicDirectory: index.registryState?.publicDirectory === true,
      },
      safety: {
        internalHttpEndpointUsed: true,
        publicEndpointCreated: false,
        writesPerformed: false,
        databaseAccessed: false,
        providerCalled: false,
        environmentRead: false,
        externalRegistryWrite: false,
        externalRegisterableAfterRun: false,
        externalAgentDatabaseAccess: false,
        autonomousExecution: false,
        highRiskFinalWrite: false,
        rawSecretsIncluded: false,
        auditPersisted: false,
        blockedIfRunRequested: true,
        reasons: [
          "This HTTP entrypoint is protected owner-only dry-run.",
          "The route reads generated AgentFacts-lite registry files only.",
          "No provider calls, database writes, autonomous execution, external registration, or external agent database access occur.",
          "Runtime audit persistence remains future work until the append-only audit store is approved.",
        ],
      },
      validation: {
        agentMatchesOperation: true,
        targetMatchesOperation: true,
        internalDiscoverable: true,
        externalRegisterableBlocked: true,
        allowedModeIsDryRunOnly: true,
      },
      nextReview:
        "Use this protected route for owner-only dry-run UI/API alignment. External adapter work remains blocked until auth scopes, trust, rollback, deployment proof, and explicit approval exist.",
    },
  }
}
