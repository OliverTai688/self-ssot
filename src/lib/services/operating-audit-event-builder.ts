import "server-only"

import {
  OPERATING_AUDIT_EVENT_FAMILIES,
  type OperatingAuditActorType,
  type OperatingAuditApprovalLevel,
  type OperatingAuditModuleKey,
  type OperatingAuditResult,
  type OperatingAuditRetentionClass,
  type OperatingAuditRisk,
  type OperatingAuditSourceKind,
} from "@/lib/contracts/operating-audit-event.contract"
import {
  OPERATING_AUDIT_READINESS_CATALOG,
  OPERATING_AUDIT_READINESS_REQUIRED_EVENT_FAMILIES,
  type OperatingAuditReadinessCatalogRow,
} from "@/lib/contracts/operating-audit-readiness-catalog.contract"

const REDACTION_VERSION = "AUDIT-OPS-003.redaction.v1"

const MODULE_KEYS = [
  "work",
  "research",
  "ai-input",
  "workflow",
  "life",
  "finance",
  "chamber",
  "company",
  "client-portal",
  "agent-team-os",
  "auth",
  "admin",
  "settings",
  "deployment",
] as const satisfies readonly OperatingAuditModuleKey[]

const RISK_ORDER = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
} as const satisfies Record<OperatingAuditRisk, number>

const APPROVAL_ORDER = {
  none: 0,
  owner_review: 1,
  admin_review: 2,
  human_required: 3,
  external_approval_required: 4,
} as const satisfies Record<OperatingAuditApprovalLevel, number>

const sensitiveKeyPattern =
  /cookie|token|secret|service.?role|database|db.?url|db.?host|profile.?id|auth.?claim|provider.?payload|session|private|raw|adapter.?payload|request.?body|response.?body|row.?body|client.?portal.?token/i

const sensitiveValuePattern =
  /postgres(?:ql)?:\/\/|(?:DIRECT_)?DATABASE.?URL|SUPABASE_|service.?role|refresh.?token|access.?token|set-cookie|bearer\s+|eyJ[A-Za-z0-9_-]{20,}|(?:\d{1,3}\.){3}\d{1,3}/i

export type OperatingAuditEventDraftInput = {
  operationId: string
  actorType?: OperatingAuditActorType
  actorRef?: string | null
  actorDisplay?: string | null
  requestRef?: string | null
  action?: string
  targetType?: string
  targetRef?: string | null
  targetDisplay?: string | null
  result?: OperatingAuditResult
  riskLevel?: OperatingAuditRisk
  approvalLevel?: OperatingAuditApprovalLevel
  sourceKind?: OperatingAuditSourceKind
  sourceRef?: string | null
  agentRef?: string | null
  proposalRef?: string | null
  proofRef?: string | null
  metadata?: Record<string, unknown>
  occurredAt?: string
}

export type OperatingAuditEventDraftEnvelope = {
  taskId: "AUDIT-OPS-003"
  draftId: string
  id: null
  persistenceStatus: "draft_only_not_persisted"
  occurredAt: string
  receivedAt: null
  actorType: OperatingAuditActorType
  actorRef: string | null
  actorDisplay: string | null
  sessionRef: null
  requestRef: string | null
  ipAddressHash: null
  userAgentHash: null
  moduleKey: OperatingAuditModuleKey
  eventFamily: OperatingAuditReadinessCatalogRow["eventFamily"]
  action: string
  targetType: string
  targetRef: string | null
  targetDisplay: string | null
  result: OperatingAuditResult
  riskLevel: OperatingAuditRisk
  approvalLevel: OperatingAuditApprovalLevel
  humanApprovalRequired: boolean
  sourceKind: OperatingAuditSourceKind
  sourceRef: string | null
  agentRef: string | null
  operationId: string
  proposalRef: string | null
  proofRef: string | null
  beforeRef: null
  afterRef: null
  metadata: Record<string, unknown>
  redactionVersion: typeof REDACTION_VERSION
  retentionClass: OperatingAuditRetentionClass
  previousEventHash: null
  eventHash: null
  safety: {
    readonly runtimeAuditStorageImplemented: false
    readonly schemaMigrationImplemented: false
    readonly routeHandlerAdded: false
    readonly serverActionAdded: false
    readonly databaseReadPerformed: false
    readonly databaseWriteAdded: false
    readonly providerCalled: false
    readonly networkCalled: false
    readonly publicOutputAdded: false
    readonly externalRegistrationEnabled: false
    readonly directDatabaseAccessByExternalAgents: false
    readonly persistedAuditRowsCreated: false
    readonly externalRegisterable: false
  }
}

export type OperatingAuditEventBuilderResult =
  | {
      ok: true
      envelope: OperatingAuditEventDraftEnvelope
      redactionReport: {
        redactedMetadataPaths: string[]
        rejectedFields: []
      }
    }
  | {
      ok: false
      errors: string[]
      redactionReport: {
        redactedMetadataPaths: string[]
        rejectedFields: string[]
      }
      rejectedInput: {
        operationId: string | null
      }
    }

type RedactionResult = {
  value: unknown
  paths: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isSafeString(value: string): boolean {
  return value.length <= 240 && !sensitiveValuePattern.test(value)
}

function isSafeRelativeRef(value: string): boolean {
  return (
    isSafeString(value) &&
    !value.includes("://") &&
    !value.startsWith("/") &&
    !value.includes("..") &&
    !value.includes("\\")
  )
}

function nullableSafeString(
  value: string | null | undefined,
  field: string,
  errors: string[],
  allowRelativeRef = false
): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const safe = allowRelativeRef ? isSafeRelativeRef(value) : isSafeString(value)
  if (!safe) {
    errors.push(`${field} must be a short safe label or relative reference without secrets.`)
    return null
  }

  return value
}

function sanitizeMetadata(value: unknown, path = "metadata"): RedactionResult {
  if (value === null || value === undefined) {
    return { value: null, paths: [] }
  }

  if (typeof value === "string") {
    if (sensitiveValuePattern.test(value)) {
      return { value: "[redacted:sensitive-value]", paths: [path] }
    }

    if (value.length > 240) {
      return { value: "[redacted:long-string]", paths: [path] }
    }

    return { value, paths: [] }
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { value, paths: [] }
  }

  if (Array.isArray(value)) {
    const entries = value.slice(0, 10).map((item, index) => sanitizeMetadata(item, `${path}[${index}]`))
    return {
      value: entries.map((entry) => entry.value),
      paths: entries.flatMap((entry) => entry.paths),
    }
  }

  if (!isRecord(value)) {
    return { value: "[redacted:unsupported-value]", paths: [path] }
  }

  const output: Record<string, unknown> = {}
  const paths: string[] = []

  for (const [key, nestedValue] of Object.entries(value).slice(0, 20)) {
    const nextPath = `${path}.${key}`
    if (sensitiveKeyPattern.test(key)) {
      output[key] = "[redacted:sensitive-key]"
      paths.push(nextPath)
      continue
    }

    const nested = sanitizeMetadata(nestedValue, nextPath)
    output[key] = nested.value
    paths.push(...nested.paths)
  }

  return { value: output, paths }
}

export function redactOperatingAuditMetadata(metadata: Record<string, unknown> | undefined): RedactionResult {
  if (!metadata) {
    return { value: {}, paths: [] }
  }

  const result = sanitizeMetadata(metadata)
  return isRecord(result.value) ? result : { value: {}, paths: ["metadata"] }
}

function findCatalogRow(operationId: string): OperatingAuditReadinessCatalogRow | null {
  return OPERATING_AUDIT_READINESS_CATALOG.find((row) => row.operationId === operationId) ?? null
}

function findEventFamily(familyKey: string) {
  return OPERATING_AUDIT_EVENT_FAMILIES.find((family) => family.familyKey === familyKey) ?? null
}

function mapTargetModuleToModuleKey(row: OperatingAuditReadinessCatalogRow): OperatingAuditModuleKey {
  const rawModule = row.targetModule
  const directMatch = MODULE_KEYS.find((moduleKey) => moduleKey === rawModule)
  if (directMatch) return directMatch

  if (rawModule === "launch") return "deployment"
  if (rawModule === "module-surfaces" || rawModule === "backend") return "admin"

  const family = findEventFamily(row.eventFamily)
  return family?.moduleKeys[0] ?? "admin"
}

function defaultTargetType(row: OperatingAuditReadinessCatalogRow): string {
  if (row.operationSurface === "module_agent_command_catalog") return "agent_operation"
  if (row.eventFamily === "auth.session") return "session"
  if (row.eventFamily === "work.mutation") return row.operationId === "work.server-actions" ? "project" : "proof_run"
  if (row.eventFamily === "ai-input.source-workflow") return "source_workflow"
  if (row.eventFamily === "agent.operation") return "agent_operation"
  if (row.eventFamily === "client-portal.public-access") return "public_route"
  if (row.eventFamily === "high-risk.proposal") return "proposal"
  return "evidence_report"
}

function validateOccurrence(value: string | undefined, errors: string[]): string {
  if (!value) return new Date().toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    errors.push("occurredAt must be a valid ISO timestamp.")
    return new Date().toISOString()
  }

  return parsed.toISOString()
}

function selectAction(row: OperatingAuditReadinessCatalogRow, input: OperatingAuditEventDraftInput, errors: string[]) {
  if (!input.action) return row.eventActions[0]

  if (!row.eventActions.includes(input.action)) {
    errors.push(`action must be one of the mapped actions for ${row.operationId}.`)
    return row.eventActions[0]
  }

  return input.action
}

function selectResult(row: OperatingAuditReadinessCatalogRow, input: OperatingAuditEventDraftInput, errors: string[]) {
  if (!input.result) return row.expectedResults[0]

  if (!row.expectedResults.includes(input.result)) {
    errors.push(`result must be one of the mapped results for ${row.operationId}.`)
    return row.expectedResults[0]
  }

  return input.result
}

function selectRisk(row: OperatingAuditReadinessCatalogRow, input: OperatingAuditEventDraftInput, errors: string[]) {
  if (!input.riskLevel) return row.riskLevel

  if (RISK_ORDER[input.riskLevel] < RISK_ORDER[row.riskLevel]) {
    errors.push(`riskLevel cannot be lower than the mapped risk for ${row.operationId}.`)
    return row.riskLevel
  }

  return input.riskLevel
}

function selectApproval(
  row: OperatingAuditReadinessCatalogRow,
  input: OperatingAuditEventDraftInput,
  errors: string[]
) {
  if (!input.approvalLevel) return row.approvalLevel

  if (APPROVAL_ORDER[input.approvalLevel] < APPROVAL_ORDER[row.approvalLevel]) {
    errors.push(`approvalLevel cannot be lower than the mapped approval level for ${row.operationId}.`)
    return row.approvalLevel
  }

  return input.approvalLevel
}

export function buildOperatingAuditEventDraft(input: OperatingAuditEventDraftInput): OperatingAuditEventBuilderResult {
  const errors: string[] = []
  const rejectedFields: string[] = []
  const row = findCatalogRow(input.operationId)

  if (!row) {
    return {
      ok: false,
      errors: [`Unknown operationId: ${input.operationId}`],
      redactionReport: { redactedMetadataPaths: [], rejectedFields: ["operationId"] },
      rejectedInput: { operationId: input.operationId || null },
    }
  }

  const actorRef = nullableSafeString(input.actorRef, "actorRef", errors)
  const actorDisplay = nullableSafeString(input.actorDisplay ?? "owner", "actorDisplay", errors)
  const requestRef = nullableSafeString(input.requestRef, "requestRef", errors)
  const targetRef = nullableSafeString(input.targetRef, "targetRef", errors)
  const targetDisplay = nullableSafeString(input.targetDisplay ?? row.label, "targetDisplay", errors)
  const sourceRef = nullableSafeString(input.sourceRef ?? row.verificationCommand, "sourceRef", errors)
  const agentRef = nullableSafeString(input.agentRef, "agentRef", errors)
  const proposalRef = nullableSafeString(input.proposalRef, "proposalRef", errors, true)
  const proofRef = nullableSafeString(input.proofRef, "proofRef", errors, true)
  const metadata = redactOperatingAuditMetadata(input.metadata)
  const family = findEventFamily(row.eventFamily)

  if (!family) {
    errors.push(`Missing audit event family contract for ${row.eventFamily}.`)
  }

  for (const [field, value] of Object.entries(input)) {
    if (typeof value === "string" && sensitiveValuePattern.test(value)) {
      rejectedFields.push(field)
    }
  }

  if (rejectedFields.length > 0) {
    errors.push("Top-level inputs must not include raw secrets, provider payloads, database URLs, or tokens.")
  }

  const action = selectAction(row, input, errors)
  const result = selectResult(row, input, errors)
  const riskLevel = selectRisk(row, input, errors)
  const approvalLevel = selectApproval(row, input, errors)
  const moduleKey = mapTargetModuleToModuleKey(row)
  const targetType = nullableSafeString(input.targetType ?? defaultTargetType(row), "targetType", errors) ?? defaultTargetType(row)
  const occurredAt = validateOccurrence(input.occurredAt, errors)

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      redactionReport: {
        redactedMetadataPaths: metadata.paths,
        rejectedFields,
      },
      rejectedInput: {
        operationId: input.operationId || null,
      },
    }
  }

  return {
    ok: true,
    envelope: {
      taskId: "AUDIT-OPS-003",
      draftId: `audit-draft:${row.operationId}:${action}:${result}`,
      id: null,
      persistenceStatus: "draft_only_not_persisted",
      occurredAt,
      receivedAt: null,
      actorType: input.actorType ?? "owner",
      actorRef,
      actorDisplay,
      sessionRef: null,
      requestRef,
      ipAddressHash: null,
      userAgentHash: null,
      moduleKey,
      eventFamily: row.eventFamily,
      action,
      targetType,
      targetRef,
      targetDisplay,
      result,
      riskLevel,
      approvalLevel,
      humanApprovalRequired: row.requiresHumanApproval || approvalLevel === "human_required" || approvalLevel === "external_approval_required",
      sourceKind: input.sourceKind ?? row.sourceKind,
      sourceRef,
      agentRef,
      operationId: row.operationId,
      proposalRef,
      proofRef,
      beforeRef: null,
      afterRef: null,
      metadata: {
        operationSurface: row.operationSurface,
        ownerSurface: row.ownerSurface,
        currentRuntimeState: row.currentRuntimeState,
        verificationCommand: row.verificationCommand,
        redactedInput: metadata.value,
      },
      redactionVersion: REDACTION_VERSION,
      retentionClass: family?.retentionClass ?? "standard_180_days",
      previousEventHash: null,
      eventHash: null,
      safety: {
        runtimeAuditStorageImplemented: false,
        schemaMigrationImplemented: false,
        routeHandlerAdded: false,
        serverActionAdded: false,
        databaseReadPerformed: false,
        databaseWriteAdded: false,
        providerCalled: false,
        networkCalled: false,
        publicOutputAdded: false,
        externalRegistrationEnabled: false,
        directDatabaseAccessByExternalAgents: false,
        persistedAuditRowsCreated: false,
        externalRegisterable: false,
      },
    },
    redactionReport: {
      redactedMetadataPaths: metadata.paths,
      rejectedFields: [],
    },
  }
}

export const OPERATING_AUDIT_EVENT_BUILDER_SAMPLE_INPUTS = [
  {
    operationId: "launch.proof",
    result: "blocked",
    proofRef: "docs/2_agent-input/generated/agent-loop/reports/example-launch-proof.json",
    metadata: { reason: "manual ops gate still missing owner evidence" },
  },
  {
    operationId: "work.proof.preflight",
    actorType: "internal_agent",
    agentRef: "WorkAgent",
    result: "dry_run",
    metadata: { proposal: "prepare safe proof target checklist" },
  },
  {
    operationId: "client-portal.visibility.preflight",
    actorType: "internal_agent",
    agentRef: "ClientPortalAgent",
    result: "proposal_created",
    metadata: {
      publicBoundary: "fail-closed visibility review",
      token: "redacted-by-builder",
    },
  },
] as const satisfies readonly OperatingAuditEventDraftInput[]

export function buildRepresentativeOperatingAuditDrafts(): OperatingAuditEventBuilderResult[] {
  return OPERATING_AUDIT_EVENT_BUILDER_SAMPLE_INPUTS.map((input) => buildOperatingAuditEventDraft(input))
}

export const OPERATING_AUDIT_EVENT_BUILDER_CONTRACT = {
  id: "AUDIT-OPS-003",
  version: "0.1.0",
  status: "ready_for_redacted_draft_envelopes",
  visibility: "server_only_internal",
  sourceCatalog: "AUDIT-OPS-002",
  requiredEventFamilies: OPERATING_AUDIT_READINESS_REQUIRED_EVENT_FAMILIES,
  sampleOperationIds: OPERATING_AUDIT_EVENT_BUILDER_SAMPLE_INPUTS.map((input) => input.operationId),
  redactionVersion: REDACTION_VERSION,
  runtimeAuditStorageImplemented: false,
  schemaMigrationImplemented: false,
  routeHandlerAdded: false,
  serverActionAdded: false,
  databaseReadPerformed: false,
  databaseWriteAdded: false,
  providerCalled: false,
  networkCalled: false,
  publicOutputAdded: false,
  externalRegistrationEnabled: false,
  directDatabaseAccessByExternalAgents: false,
  persistedAuditRowsCreated: false,
  externalRegisterable: false,
  nextTask:
    "Review persisted audit schema, retention, hash-chain behavior, authorization, and proof target before any OperatingAuditEvent write path.",
} as const
