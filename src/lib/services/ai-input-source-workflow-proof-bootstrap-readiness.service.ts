import "server-only"

import type {
  AIInputSourceWorkflowProofBootstrapContract,
  AIInputSourceWorkflowProofTargetHandoffContract,
} from "@/types/ai-input-readiness"
import { resolveAIInputSourceWorkflowProofEvidence } from "@/lib/services/ai-input-source-workflow-proof-evidence.service"

const SOURCE_WORKFLOW_PROOF_TARGET_HANDOFF_ENV_VAR_NAMES = [
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE",
]

const SOURCE_WORKFLOW_LOCAL_PROOF_BOOTSTRAP_PROHIBITED_EXPOSURE = [
  "database URLs",
  "database hosts",
  "database usernames",
  "database passwords",
  "Supabase keys",
  "tokens",
  "cookies",
  "raw auth claims",
  "profile IDs",
  "row IDs",
  "provider payloads",
  "source file bodies",
  "private source material",
  "target module final payloads",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readRecordPath(record: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  let current: Record<string, unknown> | null = record

  for (const key of keys) {
    if (!current) return null
    const nextValue: unknown = current[key]
    current = isRecord(nextValue) ? nextValue : null
  }

  return current
}

function readStringPath(record: Record<string, unknown>, keys: string[], fallback: string) {
  const lastKey = keys.at(-1)
  if (!lastKey) return fallback

  const parent = keys.length === 1 ? record : readRecordPath(record, keys.slice(0, -1))
  const value = parent?.[lastKey]

  return typeof value === "string" ? value : fallback
}

function readBooleanPath(record: Record<string, unknown>, keys: string[], fallback = false) {
  const lastKey = keys.at(-1)
  if (!lastKey) return fallback

  const parent = keys.length === 1 ? record : readRecordPath(record, keys.slice(0, -1))
  const value = parent?.[lastKey]

  return typeof value === "boolean" ? value : fallback
}

function readStringArrayPath(record: Record<string, unknown>, keys: string[]) {
  const lastKey = keys.at(-1)
  if (!lastKey) return []

  const parent = keys.length === 1 ? record : readRecordPath(record, keys.slice(0, -1))
  const value = parent?.[lastKey]

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

export async function buildAIInputSourceWorkflowProofBootstrapContract({
  generatedAt = new Date().toISOString(),
  sharedBy = ["ai-input", "admin", "settings"],
}: {
  generatedAt?: string
  sharedBy?: Array<"ai-input" | "admin" | "settings">
} = {}): Promise<AIInputSourceWorkflowProofBootstrapContract> {
  const proofEvidence = await resolveAIInputSourceWorkflowProofEvidence({ generatedAt })
  const bootstrapPacket = proofEvidence.latestBootstrapPacket
  const checkerPacket = proofEvidence.latestCheckerPacket
  const payload = bootstrapPacket?.payload ?? {}
  const target = readRecordPath(payload, ["target"]) ?? {}
  const plannedChildProcess = readRecordPath(payload, ["plannedChildProcess"]) ?? {}
  const injectedEnv = readRecordPath(payload, ["plannedChildProcess", "environmentInjectedIntoChildOnly"]) ?? {}
  const missing = readStringArrayPath(payload, ["safety", "missing"])
  const warnings = readStringArrayPath(payload, ["safety", "warnings"])
  const ownerActions = readStringArrayPath(payload, ["nextActions"])
  const packetStatus = bootstrapPacket ? readStringPath(payload, ["status"], "unknown_packet_status") : "missing_packet"
  const checkerStatus = checkerPacket
    ? readStringPath(checkerPacket.payload, ["status"], "unknown_checker_status")
    : "missing_checker_packet"
  const runnableNow = readBooleanPath(payload, ["plannedChildProcess", "runnableNow"])
  const packetNextTask = readStringPath(
    payload,
    ["nextTask"],
    "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER"
  )
  const proofOut = readStringPath(
    plannedChildProcess,
    ["proofOut"],
    "docs/2_agent-input/generated/agent-loop/ai-input-source-workflow-proof/latest-local-proof-runner.json"
  )
  const targetProvided = readBooleanPath(target, ["provided"])
  const hostClass = readStringPath(target, ["hostClass"], "missing")
  const latestPacketPath = proofEvidence.contract.latest.latestPacketPath
  const latestCheckerPacketPath = proofEvidence.contract.latest.latestCheckerPacketPath
  const latestRunnerPacketPath = proofEvidence.contract.latest.latestRunnerPacketPath
  const effectiveOwnerActions =
    ownerActions.length > 0
      ? ownerActions
      : [
          "Run pnpm ai-input:proof-local -- --json after supplying an explicit local/disposable proof target.",
          "Keep write confirmations out of the global environment until the target is approved.",
        ]
  const handoffMissingPrerequisites =
    missing.length > 0
      ? missing
      : [
          ...(bootstrapPacket ? [] : ["No latest local proof bootstrap packet has been collected."]),
          ...(targetProvided ? [] : ["Explicit local/disposable Source Workflow proof target is missing."]),
          ...(runnableNow ? [] : ["Write confirmations are not ready for child proof execution."]),
        ]
  const proofTargetHandoff: AIInputSourceWorkflowProofTargetHandoffContract = {
    id: "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE",
    status: "protected_proof_target_handoff_active",
    mode: "protected_read_no_secret_owner_handoff",
    ownerAction: effectiveOwnerActions[0],
    proofCommands: [
      "pnpm ai-input:proof-evidence:check",
      "pnpm ai-input:proof-local:check",
      "pnpm ai-input:proof-local -- --json",
      "pnpm ai-input:proof -- --run --json",
    ],
    evidenceTargets: Array.from(
      new Set([
        latestPacketPath,
        latestCheckerPacketPath,
        latestRunnerPacketPath,
        proofOut,
      ])
    ),
    passSignals: [
      "pnpm ai-input:proof-local:check reports ready_for_owner_run_source_workflow_proof_bootstrap.",
      "planned child proof runnable now is yes after an explicit local/disposable target and write confirmations.",
      `proof runner packet is written to ${proofOut}.`,
      "externalRegisterable remains false.",
    ],
    failSignals: [
      "missing explicit local/disposable proof target",
      "missing write confirmations",
      "target lacks proof marker or looks valuable",
      "latest Source Workflow proof evidence is missing or stale",
    ],
    missingPrerequisites: handoffMissingPrerequisites,
    envVarNames: SOURCE_WORKFLOW_PROOF_TARGET_HANDOFF_ENV_VAR_NAMES,
    stopConditions: [
      "Do not paste or display target URL, host, username, password, Supabase key, token, cookie, profile ID, row ID, or raw proof packet body.",
      "Stop before DB connection, DB write, migration apply, migration promotion, connector runtime, provider API runtime, public output, external agent database access, or external registration.",
      "Treat remote targets as Manual Ops only unless they are explicitly disposable and owner-approved.",
    ],
    steps: [
      {
        label: "Select target",
        detail: targetProvided
          ? `Latest packet classifies a ${hostClass} target without revealing URL or host.`
          : "Provide only an explicit local/disposable proof target through an approved env var or CLI input.",
        status: targetProvided ? "ready" : "missing",
        tone: targetProvided ? "good" : "blocked",
      },
      {
        label: "Confirm write gate",
        detail: runnableNow
          ? "Write confirmations are scoped to the planned child proof process."
          : "Keep write confirmations off until the target is approved; the UI only lists env var names.",
        status: runnableNow ? "ready" : "missing",
        tone: runnableNow ? "warn" : "blocked",
      },
      {
        label: "Run bootstrap checks",
        detail: "Run proof-evidence and proof-local checks before any owner-run proof command.",
        status: bootstrapPacket && checkerPacket ? "ready" : "manual",
        tone: bootstrapPacket && checkerPacket ? "good" : "warn",
      },
      {
        label: "Inspect evidence",
        detail: `Latest evidence freshness is ${proofEvidence.contract.latest.freshness}; latest packet is ${latestPacketPath}.`,
        status: proofEvidence.contract.latest.missing
          ? "missing"
          : proofEvidence.contract.latest.stale
            ? "manual"
            : "ready",
        tone: proofEvidence.contract.latest.missing
          ? "blocked"
          : proofEvidence.contract.latest.stale
            ? "warn"
            : "good",
      },
      {
        label: "Keep runtime closed",
        detail: "The protected handoff does not execute commands, connect to DB, activate connectors, or register agents.",
        status: "ready",
        tone: "good",
      },
    ],
    safety: {
      executesCommands: false,
      databaseConnectionAllowed: false,
      databaseWriteAllowed: false,
      migrationApplyAllowed: false,
      connectorRuntimeAllowed: false,
      providerApiRuntimeAllowed: false,
      publicOutputAllowed: false,
      revealsTargetUrl: false,
      revealsHost: false,
      revealsSecrets: false,
      returnsRawPacketBody: false,
      externalAgentDatabaseAccessAllowed: false,
      externalRegisterable: false,
    },
  }

  return {
    id: "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI",
    status: "protected_proof_packet_surface_active",
    generatedAt,
    mode: "protected_read_no_secret_packet_summary",
    sharedBy,
    source: {
      bootstrapCommand: "pnpm ai-input:proof-local -- --json",
      checkerCommand: "pnpm ai-input:proof-local:check",
      latestPacketPath: proofEvidence.contract.latest.latestPacketPath,
      latestCheckerPacketPath: proofEvidence.contract.latest.latestCheckerPacketPath,
      helperScript: "scripts/ai-input-source-workflow-local-proof-bootstrap.mjs",
      checkerScript: "scripts/check-ai-input-source-workflow-local-proof-bootstrap.mjs",
      acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    },
    summary: {
      packetStatus,
      checkerStatus,
      targetProvided,
      hostClass,
      canRunChildProof: runnableNow,
      missingCount: missing.length,
      warningCount: warnings.length,
      nextTask:
        packetNextTask === "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI"
          ? "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER"
          : packetNextTask,
    },
    target: {
      source: readStringPath(target, ["source"], "none"),
      provided: targetProvided,
      parseable: readBooleanPath(target, ["parseable"]),
      protocolAllowed: readBooleanPath(target, ["protocolAllowed"]),
      hostClass: readStringPath(target, ["hostClass"], "missing"),
      databaseNameHasProofMarker: readBooleanPath(target, ["databaseNameHasProofMarker"]),
      databaseNameLooksValuable: readBooleanPath(target, ["databaseNameLooksValuable"]),
      remoteOverrideAccepted: readBooleanPath(target, ["remoteOverrideAccepted"]),
      targetUrlRedacted: readBooleanPath(target, ["targetUrlRedacted"], true),
      hostRedacted: readBooleanPath(target, ["hostRedacted"], true),
    },
    plannedChildProcess: {
      command: readStringPath(plannedChildProcess, ["command"], "pnpm ai-input:proof -- --run --json"),
      proofOut,
      runnableNow,
      writesOnlyInsideChildProcess: readBooleanPath(plannedChildProcess, ["writesOnlyInsideChildProcess"]),
      injectedEnvKeys: Object.keys(injectedEnv).sort(),
    },
    safety: {
      doesNotUseDatabaseUrlSilently: readBooleanPath(payload, ["safety", "doesNotUseDatabaseUrlSilently"]),
      doesNotApplyMigration: readBooleanPath(payload, ["safety", "doesNotApplyMigration"]),
      doesNotPromoteMigrationDraft: readBooleanPath(payload, ["safety", "doesNotPromoteMigrationDraft"]),
      doesNotWriteDatabaseByDefault: readBooleanPath(payload, ["safety", "doesNotWriteDatabaseByDefault"]),
      databaseConnectionAllowedByBootstrap: false,
      connectorRuntimeAllowed: false,
      providerApiRuntimeAllowed: false,
      publicOutputAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      externalRegisterable: false,
      printsSecrets: false,
      excludedValues:
        readStringArrayPath(payload, ["safety", "excludedValues"]).length > 0
          ? readStringArrayPath(payload, ["safety", "excludedValues"])
          : SOURCE_WORKFLOW_LOCAL_PROOF_BOOTSTRAP_PROHIBITED_EXPOSURE,
    },
    missing,
    warnings,
    ownerActions: effectiveOwnerActions,
    prohibitedExposure: SOURCE_WORKFLOW_LOCAL_PROOF_BOOTSTRAP_PROHIBITED_EXPOSURE,
    latestEvidence: proofEvidence.contract,
    proofTargetHandoff,
  }
}
