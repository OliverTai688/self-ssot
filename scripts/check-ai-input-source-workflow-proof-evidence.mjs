#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  types: "src/types/ai-input-readiness.ts",
  proofEvidenceService: "src/lib/services/ai-input-source-workflow-proof-evidence.service.ts",
  proofBootstrapService: "src/lib/services/ai-input-source-workflow-proof-bootstrap-readiness.service.ts",
  aiInputClient: "src/app/(dashboard)/ai-input/ai-input-client.tsx",
  opsSurfaceChecker: "scripts/check-ai-input-source-workflow-ops-surface.mjs",
  packageJson: "package.json",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
}

const REPORTS_DIRECTORY = "docs/2_agent-input/generated/agent-loop/reports"
const PROOF_RUNNER_DIRECTORY = "docs/2_agent-input/generated/agent-loop/ai-input-source-workflow-proof"

const EVIDENCE_RULES = [
  {
    family: "bootstrap",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-local-proof-bootstrap\.json$/,
  },
  {
    family: "bootstrap-check",
    directory: REPORTS_DIRECTORY,
    pattern:
      /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-(local-proof-bootstrap-check|proof-local-check)\.json$/,
  },
  {
    family: "ops-surface-check",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-proof-packet-ui-check\.json$/,
  },
  {
    family: "proof-runner",
    directory: PROOF_RUNNER_DIRECTORY,
    pattern: /^latest-local-proof-runner\.json$/,
  },
  {
    family: "proof-runner",
    directory: REPORTS_DIRECTORY,
    pattern: /^personal-os-loop-\d+-\d{8}-ai-input-source-workflow-proof-runner.*\.json$/,
  },
]

const PROOF_EVIDENCE_SERVICE_MARKERS = [
  "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_EVIDENCE_ALLOWED_PATTERNS",
  "REPORTS_DIRECTORY",
  "PROOF_RUNNER_DIRECTORY",
  "server_only_no_secret_latest_evidence",
  "scansWhitelistedDirectoriesOnly: true",
  "returnsRawPacketBody: false",
  "executesCommands: false",
  "databaseConnectionAllowed: false",
  "databaseWriteAllowed: false",
  "migrationApplyAllowed: false",
  "connectorRuntimeAllowed: false",
  "providerApiRuntimeAllowed: false",
  "publicOutputAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
  "getAIInputSourceWorkflowProofEvidenceAllowedPatterns",
  "resolveAIInputSourceWorkflowProofEvidence",
  "buildAIInputSourceWorkflowLatestProofEvidenceContract",
]

const TYPES_MARKERS = [
  "AIInputSourceWorkflowLatestProofEvidenceContract",
  "AIInputSourceWorkflowProofEvidenceFamily",
  "AIInputSourceWorkflowProofEvidenceFreshness",
  "latestEvidence: AIInputSourceWorkflowLatestProofEvidenceContract",
  'id: "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER"',
  'mode: "server_only_no_secret_latest_evidence"',
  "scansWhitelistedDirectoriesOnly: true",
  "returnsRawPacketBody: false",
  "externalRegisterable: false",
]

const PROOF_BOOTSTRAP_SERVICE_MARKERS = [
  "resolveAIInputSourceWorkflowProofEvidence",
  "proofEvidence.latestBootstrapPacket",
  "proofEvidence.latestCheckerPacket",
  "proofEvidence.contract.latest.latestPacketPath",
  "proofEvidence.contract.latest.latestCheckerPacketPath",
  "latestEvidence: proofEvidence.contract",
  "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
]

const PROOF_BOOTSTRAP_FORBIDDEN_MARKERS = [
  "SOURCE_WORKFLOW_LOCAL_PROOF_BOOTSTRAP_PACKET_PATH",
  "SOURCE_WORKFLOW_LOCAL_PROOF_BOOTSTRAP_CHECK_PATH",
]

const DOC_MARKERS = [
  "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
  "pnpm ai-input:proof-evidence:check",
  "latest Source Workflow proof evidence",
  "externalRegisterable=false",
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
      console.log("Usage: pnpm ai-input:proof-evidence:check [--json] [--out <path>]")
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
    errors.push(`${label} contains forbidden markers: ${present.join(", ")}`)
  }
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

      try {
        const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"))
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.status === "string") status = parsed.status
          if (typeof parsed.taskId === "string") taskId = parsed.taskId
          else if (typeof parsed.id === "string") taskId = parsed.id
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
      })
    }
  }

  return packets.sort((a, b) => b.modifiedMs - a.modifiedMs)
}

function latestPacket(packets, family) {
  return packets.find((packet) => packet.family === family) ?? null
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const contents = Object.fromEntries(
  Object.entries(FILES).map(([key, filePath]) => [key, read(filePath)]),
)

validateMarkers({
  label: FILES.proofEvidenceService,
  text: contents.proofEvidenceService,
  markers: PROOF_EVIDENCE_SERVICE_MARKERS,
  errors,
})
validateMarkers({ label: FILES.types, text: contents.types, markers: TYPES_MARKERS, errors })
validateMarkers({
  label: FILES.proofBootstrapService,
  text: contents.proofBootstrapService,
  markers: PROOF_BOOTSTRAP_SERVICE_MARKERS,
  errors,
})
validateForbiddenMarkers({
  label: FILES.proofBootstrapService,
  text: contents.proofBootstrapService,
  markers: PROOF_BOOTSTRAP_FORBIDDEN_MARKERS,
  errors,
})

for (const pattern of FORBIDDEN_RUNTIME_PATTERNS) {
  if (contents.proofEvidenceService?.includes(pattern)) {
    errors.push(`${FILES.proofEvidenceService} contains forbidden runtime pattern "${pattern}".`)
  }
}

validateMarkers({
  label: FILES.aiInputClient,
  text: contents.aiInputClient,
  markers: ["latestEvidence", "Evidence freshness"],
  errors,
})
validateMarkers({
  label: FILES.opsSurfaceChecker,
  text: contents.opsSurfaceChecker,
  markers: ["DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER", "pnpm ai-input:proof-evidence:check"],
  errors,
})

for (const key of ["acceptance", "backlog", "sprint", "completedLog", "tasks"]) {
  validateMarkers({ label: FILES[key], text: contents[key], markers: DOC_MARKERS, errors })
}

if (contents.packageJson === null) {
  errors.push(`${FILES.packageJson} is missing.`)
} else {
  const packageJson = JSON.parse(contents.packageJson)
  if (
    packageJson.scripts?.["ai-input:proof-evidence:check"] !==
    "node scripts/check-ai-input-source-workflow-proof-evidence.mjs"
  ) {
    errors.push("package.json must expose ai-input:proof-evidence:check")
  }
}

const packets = collectEvidencePackets()
const latestBootstrapPacket = latestPacket(packets, "bootstrap")
const latestCheckerPacket = latestPacket(packets, "bootstrap-check") ?? latestPacket(packets, "ops-surface-check")
const latestRunnerPacket = latestPacket(packets, "proof-runner")

if (!latestBootstrapPacket) {
  errors.push("No whitelisted Source Workflow bootstrap proof evidence packet was found.")
}
if (!latestCheckerPacket) {
  errors.push("No whitelisted Source Workflow checker evidence packet was found.")
}

const result = {
  id: "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
  status: errors.length === 0 ? "latest_proof_evidence_resolver_ready" : "failed",
  checkedAt: new Date().toISOString(),
  evidence: {
    latestBootstrapPacket,
    latestCheckerPacket,
    latestRunnerPacket,
    candidateCount: packets.length,
    allowedDirectories: [REPORTS_DIRECTORY, PROOF_RUNNER_DIRECTORY],
    allowedFamilies: [...new Set(EVIDENCE_RULES.map((rule) => rule.family))],
  },
  safetyGuards: {
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
  },
  nextTask: "LOOP-125",
  errors,
}

if (args.out) {
  const outputPath = path.resolve(ROOT, args.out)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else if (errors.length > 0) {
  console.error(`AI Input Source Workflow proof evidence check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
} else {
  console.log("AI Input Source Workflow proof evidence check passed.")
  console.log(`status=${result.status}`)
  console.log(`latestBootstrapPacket=${latestBootstrapPacket.path}`)
  console.log(`latestCheckerPacket=${latestCheckerPacket.path}`)
  console.log(`latestRunnerPacket=${latestRunnerPacket?.path ?? "not_collected"}`)
  console.log(`nextTask=${result.nextTask}`)
}

if (errors.length > 0) process.exit(1)
