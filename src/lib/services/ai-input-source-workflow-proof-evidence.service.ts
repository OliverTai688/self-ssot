import "server-only"

import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

import type {
  AIInputSourceWorkflowLatestProofEvidenceContract,
  AIInputSourceWorkflowProofEvidenceFamily,
  AIInputSourceWorkflowProofEvidenceFreshness,
} from "@/types/ai-input-readiness"

const REPORTS_DIRECTORY = "docs/2_agent-input/generated/agent-loop/reports"
const PROOF_RUNNER_DIRECTORY = "docs/2_agent-input/generated/agent-loop/ai-input-source-workflow-proof"
const DEFAULT_FRESHNESS_WINDOW_MINUTES = 24 * 60

const AI_INPUT_SOURCE_WORKFLOW_PROOF_EVIDENCE_ALLOWED_PATTERNS = [
  {
    family: "bootstrap",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-local-proof-bootstrap\.json$/,
    label: "loop local proof bootstrap packet",
  },
  {
    family: "bootstrap-check",
    directory: REPORTS_DIRECTORY,
    pattern:
      /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-(local-proof-bootstrap-check|proof-local-check)\.json$/,
    label: "loop local proof bootstrap checker packet",
  },
  {
    family: "ops-surface-check",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-proof-packet-ui-check\.json$/,
    label: "loop protected proof UI checker packet",
  },
  {
    family: "proof-runner",
    directory: PROOF_RUNNER_DIRECTORY,
    pattern: /^latest-local-proof-runner\.json$/,
    label: "latest local proof-runner packet",
  },
  {
    family: "proof-runner",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-proof-runner.*\.json$/,
    label: "loop proof-runner packet",
  },
] as const satisfies Array<{
  family: AIInputSourceWorkflowProofEvidenceFamily
  directory: string
  pattern: RegExp
  label: string
}>

type JsonRecord = Record<string, unknown>

export type AIInputSourceWorkflowResolvedProofPacket = {
  family: AIInputSourceWorkflowProofEvidenceFamily
  filePath: string
  label: string
  payload: JsonRecord
  modifiedAt: string
  modifiedMs: number
  status: string
  taskId: string
}

export type AIInputSourceWorkflowResolvedProofEvidence = {
  contract: AIInputSourceWorkflowLatestProofEvidenceContract
  latestBootstrapPacket: AIInputSourceWorkflowResolvedProofPacket | null
  latestCheckerPacket: AIInputSourceWorkflowResolvedProofPacket | null
  latestRunnerPacket: AIInputSourceWorkflowResolvedProofPacket | null
  latestOverallPacket: AIInputSourceWorkflowResolvedProofPacket | null
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null
}

function readString(record: JsonRecord, key: string, fallback: string) {
  const value = record[key]
  return typeof value === "string" ? value : fallback
}

function readStringArray(record: JsonRecord, key: string) {
  const value = record[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

async function readGeneratedJsonPacket({
  directory,
  family,
  fileName,
  label,
}: {
  directory: string
  family: AIInputSourceWorkflowProofEvidenceFamily
  fileName: string
  label: string
}): Promise<AIInputSourceWorkflowResolvedProofPacket | null> {
  try {
    const filePath = path.posix.join(directory, fileName)
    const absolutePath = path.join(process.cwd(), filePath)
    const [contents, fileStat] = await Promise.all([
      readFile(absolutePath, "utf8"),
      stat(absolutePath),
    ])
    const parsed = JSON.parse(contents)

    if (!isRecord(parsed)) return null

    return {
      family,
      filePath,
      label,
      payload: parsed,
      modifiedAt: fileStat.mtime.toISOString(),
      modifiedMs: fileStat.mtimeMs,
      status: readString(parsed, "status", "unknown_packet_status"),
      taskId: readString(parsed, "taskId", readString(parsed, "id", "unknown_task")),
    }
  } catch {
    return null
  }
}

async function listPatternCandidates({
  directory,
  family,
  pattern,
  label,
}: {
  directory: string
  family: AIInputSourceWorkflowProofEvidenceFamily
  pattern: RegExp
  label: string
}) {
  try {
    const absoluteDirectory = path.join(process.cwd(), directory)
    const entries = await readdir(absoluteDirectory, { withFileTypes: true })
    const packets = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && pattern.test(entry.name))
        .map((entry) => readGeneratedJsonPacket({ directory, family, fileName: entry.name, label })),
    )

    return packets.filter((packet): packet is AIInputSourceWorkflowResolvedProofPacket => packet !== null)
  } catch {
    return []
  }
}

function pickLatest(packets: AIInputSourceWorkflowResolvedProofPacket[]) {
  return packets.reduce<AIInputSourceWorkflowResolvedProofPacket | null>((latest, packet) => {
    if (!latest) return packet
    return packet.modifiedMs > latest.modifiedMs ? packet : latest
  }, null)
}

function getPacketAgeMinutes(packet: AIInputSourceWorkflowResolvedProofPacket | null, generatedAt: string) {
  if (!packet) return null
  const generatedMs = Number.isFinite(Date.parse(generatedAt)) ? Date.parse(generatedAt) : Date.now()
  return Math.max(0, Math.round((generatedMs - packet.modifiedMs) / 60000))
}

function classifyFreshness(
  packet: AIInputSourceWorkflowResolvedProofPacket | null,
  generatedAt: string,
  freshnessWindowMinutes: number,
): AIInputSourceWorkflowProofEvidenceFreshness {
  const ageMinutes = getPacketAgeMinutes(packet, generatedAt)
  if (ageMinutes === null) return "missing"
  return ageMinutes <= freshnessWindowMinutes ? "fresh" : "stale"
}

function buildNextOwnerAction({
  bootstrapPacket,
  freshness,
}: {
  bootstrapPacket: AIInputSourceWorkflowResolvedProofPacket | null
  freshness: AIInputSourceWorkflowProofEvidenceFreshness
}) {
  if (!bootstrapPacket) {
    return "Run pnpm ai-input:proof-local -- --json after supplying an explicit local/disposable proof target."
  }
  if (freshness === "stale") {
    return "Rerun pnpm ai-input:proof-local -- --json so protected Source Workflow surfaces show fresh owner-run evidence."
  }

  const nextActions = readStringArray(bootstrapPacket.payload, "nextActions")
  return (
    nextActions[0] ??
    "Inspect the latest Source Workflow proof evidence and keep DB writes disabled until a disposable target is approved."
  )
}

export function getAIInputSourceWorkflowProofEvidenceAllowedPatterns() {
  return AI_INPUT_SOURCE_WORKFLOW_PROOF_EVIDENCE_ALLOWED_PATTERNS.map((rule) => ({
    family: rule.family,
    directory: rule.directory,
    pattern: String(rule.pattern),
    label: rule.label,
  }))
}

export async function resolveAIInputSourceWorkflowProofEvidence({
  generatedAt = new Date().toISOString(),
  freshnessWindowMinutes = DEFAULT_FRESHNESS_WINDOW_MINUTES,
}: {
  generatedAt?: string
  freshnessWindowMinutes?: number
} = {}): Promise<AIInputSourceWorkflowResolvedProofEvidence> {
  const allPackets = (
    await Promise.all(AI_INPUT_SOURCE_WORKFLOW_PROOF_EVIDENCE_ALLOWED_PATTERNS.map(listPatternCandidates))
  ).flat()
  const latestBootstrapPacket = pickLatest(allPackets.filter((packet) => packet.family === "bootstrap"))
  const latestBootstrapCheckerPacket = pickLatest(
    allPackets.filter((packet) => packet.family === "bootstrap-check"),
  )
  const latestOpsSurfaceCheckerPacket = pickLatest(
    allPackets.filter((packet) => packet.family === "ops-surface-check"),
  )
  const latestCheckerPacket = latestBootstrapCheckerPacket ?? latestOpsSurfaceCheckerPacket
  const latestRunnerPacket = pickLatest(allPackets.filter((packet) => packet.family === "proof-runner"))
  const latestOverallPacket = pickLatest(allPackets)
  const freshness = classifyFreshness(latestOverallPacket, generatedAt, freshnessWindowMinutes)
  const latestAgeMinutes = getPacketAgeMinutes(latestOverallPacket, generatedAt)
  const missing = latestBootstrapPacket === null
  const stale = freshness === "stale"

  const contract: AIInputSourceWorkflowLatestProofEvidenceContract = {
    id: "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
    status: missing ? "missing_source_workflow_proof_evidence" : "latest_proof_evidence_resolver_ready",
    generatedAt,
    mode: "server_only_no_secret_latest_evidence",
    freshnessWindowMinutes,
    source: {
      allowedDirectories: [REPORTS_DIRECTORY, PROOF_RUNNER_DIRECTORY],
      allowedPatterns: getAIInputSourceWorkflowProofEvidenceAllowedPatterns(),
    },
    latest: {
      evidenceFamily: latestOverallPacket?.family ?? "none",
      latestPacketPath: latestBootstrapPacket?.filePath ?? "not_collected",
      latestCheckerPacketPath: latestCheckerPacket?.filePath ?? "not_collected",
      latestRunnerPacketPath: latestRunnerPacket?.filePath ?? "not_collected",
      packetStatus: latestBootstrapPacket?.status ?? "missing_packet",
      checkerStatus: latestCheckerPacket?.status ?? "missing_checker_packet",
      runnerStatus: latestRunnerPacket?.status ?? "missing_runner_packet",
      latestModifiedAt: latestOverallPacket?.modifiedAt ?? null,
      latestAgeMinutes,
      freshness,
      missing,
      stale,
      nextOwnerAction: buildNextOwnerAction({ bootstrapPacket: latestBootstrapPacket, freshness }),
    },
    safety: {
      scansWhitelistedDirectoriesOnly: true,
      returnsRawPacketBody: false,
      executesCommands: false,
      databaseConnectionAllowed: false,
      databaseWriteAllowed: false,
      migrationApplyAllowed: false,
      connectorRuntimeAllowed: false,
      providerApiRuntimeAllowed: false,
      publicOutputAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      externalRegisterable: false,
      prohibitedExposure: [
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
        "environment variable values",
      ],
    },
  }

  return {
    contract,
    latestBootstrapPacket,
    latestCheckerPacket,
    latestRunnerPacket,
    latestOverallPacket,
  }
}

export async function buildAIInputSourceWorkflowLatestProofEvidenceContract({
  generatedAt = new Date().toISOString(),
}: {
  generatedAt?: string
} = {}) {
  const { contract } = await resolveAIInputSourceWorkflowProofEvidence({ generatedAt })
  return contract
}
