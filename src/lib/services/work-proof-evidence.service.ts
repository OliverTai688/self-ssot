import "server-only"

import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

import {
  WORK_PROOF_EVIDENCE_PROHIBITED_EXPOSURE,
  WORK_PROOF_EVIDENCE_REFRESH_DIRECTORY,
  WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY,
  type WorkProofEvidenceFamily,
  type WorkProofEvidenceFreshness,
  type WorkProofLatestEvidenceContract,
} from "@/lib/contracts/work-proof-evidence.contract"

const DEFAULT_FRESHNESS_WINDOW_MINUTES = 24 * 60

const WORK_PROOF_EVIDENCE_ALLOWED_PATTERNS = [
  {
    family: "target-readiness",
    directory: WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof-target-readiness\.json$/,
    label: "loop Work proof target readiness packet",
  },
  {
    family: "target-readiness",
    directory: WORK_PROOF_EVIDENCE_REFRESH_DIRECTORY,
    pattern: /^latest-work-proof-target-readiness\.json$/,
    label: "latest Work proof target readiness packet",
  },
  {
    family: "docker-disposable",
    directory: WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof-docker-(disposable|dry-run|run|remote-blocked|valuable-blocked)\.json$/,
    label: "loop Docker disposable Work proof packet",
  },
  {
    family: "docker-disposable",
    directory: WORK_PROOF_EVIDENCE_REFRESH_DIRECTORY,
    pattern: /^latest-docker-disposable-(local-bootstrap|work-proof)\.json$/,
    label: "latest Docker disposable Work proof packet",
  },
  {
    family: "local-disposable",
    directory: WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof-local-disposable(?:-[\w-]+)?\.json$/,
    label: "loop local disposable Work proof packet",
  },
  {
    family: "local-disposable",
    directory: WORK_PROOF_EVIDENCE_REFRESH_DIRECTORY,
    pattern: /^latest-local-disposable-(local-bootstrap|work-proof)\.json$/,
    label: "latest local disposable Work proof packet",
  },
  {
    family: "work-proof-run",
    directory: WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof(?:-dry-run)?\.json$/,
    label: "loop Work refresh proof runner packet",
  },
  {
    family: "source-smoke",
    directory: WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-(source-smoke|source-check)\.json$/,
    label: "loop Work source/static smoke packet",
  },
] as const satisfies ReadonlyArray<{
  family: WorkProofEvidenceFamily
  directory: string
  pattern: RegExp
  label: string
}>

type JsonRecord = Record<string, unknown>

export type WorkProofResolvedEvidencePacket = {
  family: WorkProofEvidenceFamily
  filePath: string
  label: string
  payload: JsonRecord
  modifiedAt: string
  modifiedMs: number
  status: string
  taskId: string
}

export type WorkProofResolvedEvidence = {
  contract: WorkProofLatestEvidenceContract
  latestTargetReadinessPacket: WorkProofResolvedEvidencePacket | null
  latestDockerPacket: WorkProofResolvedEvidencePacket | null
  latestLocalPacket: WorkProofResolvedEvidencePacket | null
  latestWorkProofRunPacket: WorkProofResolvedEvidencePacket | null
  latestSourceSmokePacket: WorkProofResolvedEvidencePacket | null
  latestOverallPacket: WorkProofResolvedEvidencePacket | null
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null
}

function readString(record: JsonRecord, key: string, fallback: string) {
  const value = record[key]
  return typeof value === "string" ? value : fallback
}

function readBoolean(record: JsonRecord, key: string) {
  const value = record[key]
  return typeof value === "boolean" ? value : false
}

function readStringArray(record: JsonRecord, key: string) {
  const value = record[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function readProofOverallStatus(record: JsonRecord) {
  const proofSummary = record.proofSummary
  if (isRecord(proofSummary)) {
    return readString(proofSummary, "overallStatus", readString(record, "status", "unknown_packet_status"))
  }

  const readiness = record.readiness
  if (isRecord(readiness)) {
    return readString(readiness, "overallStatus", readString(record, "status", "unknown_packet_status"))
  }

  return readString(record, "status", "unknown_packet_status")
}

function readTaskId(record: JsonRecord) {
  return readString(record, "taskId", readString(record, "id", "unknown_task"))
}

async function readGeneratedJsonPacket({
  directory,
  family,
  fileName,
  label,
}: {
  directory: string
  family: WorkProofEvidenceFamily
  fileName: string
  label: string
}): Promise<WorkProofResolvedEvidencePacket | null> {
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
      status: readProofOverallStatus(parsed),
      taskId: readTaskId(parsed),
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
  family: WorkProofEvidenceFamily
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

    return packets.filter((packet): packet is WorkProofResolvedEvidencePacket => packet !== null)
  } catch {
    return []
  }
}

function pickLatest(packets: WorkProofResolvedEvidencePacket[]) {
  return packets.reduce<WorkProofResolvedEvidencePacket | null>((latest, packet) => {
    if (!latest) return packet
    return packet.modifiedMs > latest.modifiedMs ? packet : latest
  }, null)
}

function getPacketAgeMinutes(packet: WorkProofResolvedEvidencePacket | null, generatedAt: string) {
  if (!packet) return null
  const generatedMs = Number.isFinite(Date.parse(generatedAt)) ? Date.parse(generatedAt) : Date.now()
  return Math.max(0, Math.round((generatedMs - packet.modifiedMs) / 60000))
}

function classifyFreshness(
  packet: WorkProofResolvedEvidencePacket | null,
  generatedAt: string,
  freshnessWindowMinutes: number,
): WorkProofEvidenceFreshness {
  const ageMinutes = getPacketAgeMinutes(packet, generatedAt)
  if (ageMinutes === null) return "missing"
  return ageMinutes <= freshnessWindowMinutes ? "fresh" : "stale"
}

function buildNextOwnerAction({
  targetPacket,
  dockerPacket,
  localPacket,
  workProofRunPacket,
  freshness,
}: {
  targetPacket: WorkProofResolvedEvidencePacket | null
  dockerPacket: WorkProofResolvedEvidencePacket | null
  localPacket: WorkProofResolvedEvidencePacket | null
  workProofRunPacket: WorkProofResolvedEvidencePacket | null
  freshness: WorkProofEvidenceFreshness
}) {
  if (workProofRunPacket?.status === "passed") {
    return "Inspect the latest Work proof packet, confirm cleanup passed, then proceed to WORK-007 or deployment proof."
  }

  if (freshness === "stale") {
    return "Rerun pnpm work:proof-target:check or the owner-approved Docker/local disposable proof path so Work proof evidence is fresh."
  }

  const targetActions = targetPacket ? readStringArray(targetPacket.payload, "nextActions") : []
  if (targetActions[0]) return targetActions[0]

  const dockerActions = dockerPacket ? readStringArray(dockerPacket.payload, "nextActions") : []
  if (dockerActions[0]) return dockerActions[0]

  const localActions = localPacket ? readStringArray(localPacket.payload, "nextActions") : []
  if (localActions[0]) return localActions[0]

  return "Run pnpm work:proof-target:check and provide an explicit local/disposable proof target before WORK-009."
}

export function getWorkProofEvidenceAllowedPatterns() {
  return WORK_PROOF_EVIDENCE_ALLOWED_PATTERNS.map((rule) => ({
    family: rule.family,
    directory: rule.directory,
    pattern: String(rule.pattern),
    label: rule.label,
  }))
}

export async function resolveWorkProofEvidence({
  generatedAt = new Date().toISOString(),
  freshnessWindowMinutes = DEFAULT_FRESHNESS_WINDOW_MINUTES,
}: {
  generatedAt?: string
  freshnessWindowMinutes?: number
} = {}): Promise<WorkProofResolvedEvidence> {
  const allPackets = (await Promise.all(WORK_PROOF_EVIDENCE_ALLOWED_PATTERNS.map(listPatternCandidates))).flat()
  const latestTargetReadinessPacket = pickLatest(
    allPackets.filter((packet) => packet.family === "target-readiness"),
  )
  const latestDockerPacket = pickLatest(allPackets.filter((packet) => packet.family === "docker-disposable"))
  const latestLocalPacket = pickLatest(allPackets.filter((packet) => packet.family === "local-disposable"))
  const latestWorkProofRunPacket = pickLatest(allPackets.filter((packet) => packet.family === "work-proof-run"))
  const latestSourceSmokePacket = pickLatest(allPackets.filter((packet) => packet.family === "source-smoke"))
  const latestOverallPacket = pickLatest(allPackets)
  const freshness = classifyFreshness(latestOverallPacket, generatedAt, freshnessWindowMinutes)
  const latestAgeMinutes = getPacketAgeMinutes(latestOverallPacket, generatedAt)
  const missing = latestOverallPacket === null
  const stale = freshness === "stale"
  const workProofPassed = latestWorkProofRunPacket?.status === "passed"

  const contract: WorkProofLatestEvidenceContract = {
    id: "WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER",
    status: missing ? "missing_work_proof_evidence" : "latest_work_proof_evidence_resolver_ready",
    generatedAt,
    mode: "server_only_no_secret_work_evidence",
    freshnessWindowMinutes,
    source: {
      allowedDirectories: [WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY, WORK_PROOF_EVIDENCE_REFRESH_DIRECTORY],
      allowedPatterns: getWorkProofEvidenceAllowedPatterns(),
    },
    latest: {
      latestOverallPacketPath: latestOverallPacket?.filePath ?? "not_collected",
      latestTargetReadinessPath: latestTargetReadinessPacket?.filePath ?? "not_collected",
      latestDockerPath: latestDockerPacket?.filePath ?? "not_collected",
      latestLocalPath: latestLocalPacket?.filePath ?? "not_collected",
      latestWorkProofRunPath: latestWorkProofRunPacket?.filePath ?? "not_collected",
      latestSourceSmokePath: latestSourceSmokePacket?.filePath ?? "not_collected",
      targetStatus: latestTargetReadinessPacket?.status ?? "missing_target_readiness_packet",
      dockerStatus: latestDockerPacket?.status ?? "missing_docker_packet",
      localStatus: latestLocalPacket?.status ?? "missing_local_packet",
      workProofRunStatus: latestWorkProofRunPacket?.status ?? "missing_work_proof_run_packet",
      sourceSmokeStatus: latestSourceSmokePacket?.status ?? "missing_source_smoke_packet",
      latestModifiedAt: latestOverallPacket?.modifiedAt ?? null,
      latestAgeMinutes,
      freshness,
      missing,
      stale,
      canRunWork009: latestTargetReadinessPacket
        ? readBoolean(latestTargetReadinessPacket.payload, "canRunWork009")
        : false,
      canRunDockerProof: latestDockerPacket ? readBoolean(latestDockerPacket.payload, "canRunDockerProof") : false,
      canRunLocalProof: latestLocalPacket ? readBoolean(latestLocalPacket.payload, "canRunLocalProof") : false,
      workProofPassed,
      sourceStaticReady: latestSourceSmokePacket?.status === "ready_for_source_path_review",
      nextOwnerAction: buildNextOwnerAction({
        targetPacket: latestTargetReadinessPacket,
        dockerPacket: latestDockerPacket,
        localPacket: latestLocalPacket,
        workProofRunPacket: latestWorkProofRunPacket,
        freshness,
      }),
    },
    safety: {
      scansWhitelistedDirectoriesOnly: true,
      returnsRawPacketBody: false,
      executesCommands: false,
      databaseConnectionAllowed: false,
      databaseWriteAllowed: false,
      migrationApplyAllowed: false,
      publicOutputAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      printsSecrets: false,
      prohibitedExposure: WORK_PROOF_EVIDENCE_PROHIBITED_EXPOSURE,
    },
  }

  return {
    contract,
    latestTargetReadinessPacket,
    latestDockerPacket,
    latestLocalPacket,
    latestWorkProofRunPacket,
    latestSourceSmokePacket,
    latestOverallPacket,
  }
}
