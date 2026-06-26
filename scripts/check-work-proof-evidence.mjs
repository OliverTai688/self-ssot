#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const ID = "WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER"
const ADMIN_SURFACE_ID = "ADMIN-OPS-003-WORK-PROOF-EVIDENCE-SURFACE"
const FRESHNESS_WINDOW_MINUTES = 24 * 60

const FILES = {
  contract: "src/lib/contracts/work-proof-evidence.contract.ts",
  service: "src/lib/services/work-proof-evidence.service.ts",
  adminReadinessService: "src/lib/services/admin-readiness.service.ts",
  adminPage: "src/app/(dashboard)/admin/page.tsx",
  settingsPage: "src/app/(dashboard)/settings/page.tsx",
  packageJson: "package.json",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
}

const REPORTS_DIRECTORY = "docs/2_agent-input/generated/agent-loop/reports"
const REFRESH_DIRECTORY = "docs/2_agent-input/generated/agent-loop/work-refresh-proof"

const EVIDENCE_RULES = [
  {
    family: "target-readiness",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof-target-readiness\.json$/,
  },
  {
    family: "target-readiness",
    directory: REFRESH_DIRECTORY,
    pattern: /^latest-work-proof-target-readiness\.json$/,
  },
  {
    family: "docker-disposable",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof-docker-(disposable|dry-run|run|remote-blocked|valuable-blocked)\.json$/,
  },
  {
    family: "docker-disposable",
    directory: REFRESH_DIRECTORY,
    pattern: /^latest-docker-disposable-(local-bootstrap|work-proof)\.json$/,
  },
  {
    family: "local-disposable",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof-local-disposable(?:-[\w-]+)?\.json$/,
  },
  {
    family: "local-disposable",
    directory: REFRESH_DIRECTORY,
    pattern: /^latest-local-disposable-(local-bootstrap|work-proof)\.json$/,
  },
  {
    family: "work-proof-run",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-proof(?:-dry-run)?\.json$/,
  },
  {
    family: "source-smoke",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-work-(source-smoke|source-check)\.json$/,
  },
]

const CONTRACT_MARKERS = [
  "WorkProofLatestEvidenceContract",
  "WorkProofEvidenceFamily",
  "WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY",
  "WORK_PROOF_EVIDENCE_REFRESH_DIRECTORY",
  "WORK_PROOF_EVIDENCE_PROHIBITED_EXPOSURE",
  "server_only_no_secret_work_evidence",
  "WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER",
  "returnsRawPacketBody: false",
  "executesCommands: false",
  "databaseConnectionAllowed: false",
  "databaseWriteAllowed: false",
  "publicOutputAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "printsSecrets: false",
]

const SERVICE_MARKERS = [
  'import "server-only"',
  "WORK_PROOF_EVIDENCE_ALLOWED_PATTERNS",
  "getWorkProofEvidenceAllowedPatterns",
  "resolveWorkProofEvidence",
  "latestTargetReadinessPacket",
  "latestDockerPacket",
  "latestLocalPacket",
  "latestWorkProofRunPacket",
  "latestSourceSmokePacket",
  "canRunWork009",
  "canRunDockerProof",
  "canRunLocalProof",
  "workProofPassed",
  "sourceStaticReady",
  "buildNextOwnerAction",
  "scansWhitelistedDirectoriesOnly: true",
  "returnsRawPacketBody: false",
  "executesCommands: false",
  "databaseConnectionAllowed: false",
  "databaseWriteAllowed: false",
  "migrationApplyAllowed: false",
  "publicOutputAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "printsSecrets: false",
]

const DOC_MARKERS = [
  ID,
  "pnpm work:proof-evidence:check",
  "latest Work proof evidence",
  "server-only no-secret",
  "WORK-009",
]

const ADMIN_SURFACE_SERVICE_MARKERS = [
  ADMIN_SURFACE_ID,
  "WorkProofEvidenceSurfaceContract",
  "WorkProofEvidenceSurfaceRow",
  "buildWorkProofEvidenceSurfaceContract",
  "resolveWorkProofEvidence",
  "pageRequirementUnderstanding",
  "score: 93",
  "requiredResearchRounds: 3",
  "completedResearchRounds: 3",
  "latestOverallPacketPath",
  "latestOverallStatus",
  "canRunWork009",
  "canRunDockerProof",
  "canRunLocalProof",
  "workProofPassed",
  "sourceStaticReady",
  "rendersRawPacketBody: false",
  "uiExecutesCommands: false",
  "launchLevelUpgradeClaimed: false",
  "work009Claimed: false",
]

const ADMIN_PAGE_MARKERS = [
  "WorkProofEvidenceSurfaceTable",
  "Work proof evidence",
  "workProofEvidenceSurfaceContract",
  "latestOverallPacketPath",
  "nextOwnerAction",
  "WORK-009",
  "launch upgrade claimed",
]

const SETTINGS_PAGE_MARKERS = [
  "buildWorkProofEvidenceSurfaceContract",
  "Work proof evidence",
  "workProofEvidenceSurfaceContract",
  "latestOverallStatus",
  "nextOwnerAction",
  "does not run commands",
  "claim WORK-009",
]

const FORBIDDEN_RUNTIME_PATTERNS = [
  "child_process",
  "exec(",
  "spawn(",
  "new PrismaClient",
  "PrismaPg",
  "new Pool",
  "createClient(",
  "createServerClient",
  "fetch(",
  "prisma migrate",
  "db:push",
  "db:deploy",
]

function parseArgs(argv) {
  const args = { json: false, out: null }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--out") {
      args.out = filteredArgs[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm work:proof-evidence:check [--json] [--out <path>]")
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function read(filePath) {
  const absolutePath = path.join(ROOT, filePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function validateMarkers({ label, text, markers, errors }) {
  if (text === null) {
    errors.push(`${label} is missing.`)
    return
  }

  const missing = markers.filter((marker) => !text.includes(marker))
  if (missing.length > 0) {
    errors.push(`${label} missing markers: ${missing.join(", ")}`)
  }
}

function validateForbiddenMarkers({ label, text, markers, errors }) {
  if (text === null) return
  const present = markers.filter((marker) => text.includes(marker))
  if (present.length > 0) {
    errors.push(`${label} contains forbidden runtime markers: ${present.join(", ")}`)
  }
}

function readString(record, key, fallback) {
  const value = record?.[key]
  return typeof value === "string" ? value : fallback
}

function readBoolean(record, key) {
  return record?.[key] === true
}

function readOverallStatus(record) {
  if (record?.proofSummary && typeof record.proofSummary === "object") {
    return readString(record.proofSummary, "overallStatus", readString(record, "status", "unknown_packet_status"))
  }
  if (record?.readiness && typeof record.readiness === "object") {
    return readString(record.readiness, "overallStatus", readString(record, "status", "unknown_packet_status"))
  }
  return readString(record, "status", "unknown_packet_status")
}

function collectEvidencePackets() {
  const packets = []

  for (const rule of EVIDENCE_RULES) {
    const absoluteDirectory = path.join(ROOT, rule.directory)
    if (!fs.existsSync(absoluteDirectory)) continue

    for (const fileName of fs.readdirSync(absoluteDirectory)) {
      if (!rule.pattern.test(fileName)) continue

      const filePath = path.join(rule.directory, fileName)
      const absolutePath = path.join(ROOT, filePath)
      const stats = fs.statSync(absolutePath)
      if (!stats.isFile()) continue

      let status = "unknown_packet_status"
      let taskId = "unknown_task"
      let canRunWork009 = false
      let canRunDockerProof = false
      let canRunLocalProof = false

      try {
        const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"))
        if (parsed && typeof parsed === "object") {
          status = readOverallStatus(parsed)
          taskId = readString(parsed, "taskId", readString(parsed, "id", "unknown_task"))
          canRunWork009 = readBoolean(parsed, "canRunWork009")
          canRunDockerProof = readBoolean(parsed, "canRunDockerProof")
          canRunLocalProof = readBoolean(parsed, "canRunLocalProof")
        }
      } catch {
        status = "unparseable"
      }

      packets.push({
        family: rule.family,
        path: filePath,
        status,
        taskId,
        modifiedAt: stats.mtime.toISOString(),
        modifiedMs: stats.mtimeMs,
        canRunWork009,
        canRunDockerProof,
        canRunLocalProof,
      })
    }
  }

  return packets.sort((a, b) => b.modifiedMs - a.modifiedMs)
}

function latestPacket(packets, family) {
  return packets.find((packet) => packet.family === family) ?? null
}

function getAgeMinutes(packet, generatedAt) {
  if (!packet) return null
  return Math.max(0, Math.round((Date.parse(generatedAt) - packet.modifiedMs) / 60000))
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const errors = []
  const contents = Object.fromEntries(Object.entries(FILES).map(([key, filePath]) => [key, read(filePath)]))

  validateMarkers({ label: FILES.contract, text: contents.contract, markers: CONTRACT_MARKERS, errors })
  validateMarkers({ label: FILES.service, text: contents.service, markers: SERVICE_MARKERS, errors })
  validateForbiddenMarkers({
    label: FILES.service,
    text: contents.service,
    markers: FORBIDDEN_RUNTIME_PATTERNS,
    errors,
  })

  validateMarkers({
    label: FILES.adminReadinessService,
    text: contents.adminReadinessService,
    markers: ADMIN_SURFACE_SERVICE_MARKERS,
    errors,
  })
  validateForbiddenMarkers({
    label: FILES.adminReadinessService,
    text: contents.adminReadinessService,
    markers: FORBIDDEN_RUNTIME_PATTERNS,
    errors,
  })
  validateMarkers({ label: FILES.adminPage, text: contents.adminPage, markers: ADMIN_PAGE_MARKERS, errors })
  validateMarkers({ label: FILES.settingsPage, text: contents.settingsPage, markers: SETTINGS_PAGE_MARKERS, errors })

  validateMarkers({
    label: FILES.packageJson,
    text: contents.packageJson,
    markers: ['"work:proof-evidence:check": "node scripts/check-work-proof-evidence.mjs"'],
    errors,
  })

  for (const docKey of ["acceptance", "backlog", "sprint", "completedLog", "tasks"]) {
    validateMarkers({
      label: FILES[docKey],
      text: contents[docKey],
      markers: DOC_MARKERS,
      errors,
    })
  }

  const generatedAt = new Date().toISOString()
  const packets = collectEvidencePackets()
  const latestOverallPacket = packets[0] ?? null
  const latestAgeMinutes = getAgeMinutes(latestOverallPacket, generatedAt)
  const freshness =
    latestAgeMinutes === null ? "missing" : latestAgeMinutes <= FRESHNESS_WINDOW_MINUTES ? "fresh" : "stale"

  const latest = {
    overall: latestOverallPacket,
    targetReadiness: latestPacket(packets, "target-readiness"),
    dockerDisposable: latestPacket(packets, "docker-disposable"),
    localDisposable: latestPacket(packets, "local-disposable"),
    workProofRun: latestPacket(packets, "work-proof-run"),
    sourceSmoke: latestPacket(packets, "source-smoke"),
    latestAgeMinutes,
    freshness,
  }

  const result = {
    id: ID,
    status: errors.length === 0 ? "ready_for_work_proof_evidence_resolver" : "failed",
    generatedAt,
    mode: "static_no_secret_contract_check",
    evidence: {
      allowedDirectories: [REPORTS_DIRECTORY, REFRESH_DIRECTORY],
      allowedPatternCount: EVIDENCE_RULES.length,
      packetCount: packets.length,
      latest,
    },
    adminOps003: {
      id: ADMIN_SURFACE_ID,
      status: errors.length === 0 ? "protected_admin_settings_surface_ready" : "failed",
      validatesAdminReadinessService: true,
      validatesAdminPage: true,
      validatesSettingsPage: true,
      rendersRawPacketBody: false,
      uiExecutesCommands: false,
      databaseConnectionAllowedBySurface: false,
      databaseWriteAllowedBySurface: false,
      launchLevelUpgradeClaimed: false,
      work009Claimed: false,
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
      launchLevelUpgradeAllowed: false,
      work009ClaimAllowed: false,
    },
    errors,
  }

  if (args.out) {
    const absoluteOut = path.join(ROOT, args.out)
    fs.mkdirSync(path.dirname(absoluteOut), { recursive: true })
    fs.writeFileSync(absoluteOut, `${JSON.stringify(result, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (errors.length > 0) {
    console.error(`${ID} failed:`)
    for (const error of errors) console.error(`- ${error}`)
  } else {
    console.log(`${ID}: ready_for_work_proof_evidence_resolver`)
  }

  process.exit(errors.length === 0 ? 0 : 1)
}

main()
