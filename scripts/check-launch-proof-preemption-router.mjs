#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const REPORT_DIR = "docs/2_agent-input/generated/agent-loop/reports"
const TASK_ID = "LAUNCH-ROUTER-001-PROOF-PREEMPTION-ROUTER"

const FILES = {
  contract: "src/lib/contracts/launch-proof-preemption-router.contract.ts",
  script: "scripts/check-launch-proof-preemption-router.mjs",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const LATEST_PATTERNS = {
  launch: /launch-proof\.json$/,
  auth: /auth-proof\.json$/,
  workTarget: /work-proof-target-readiness\.json$/,
  workEvidence: /work-proof-evidence-check\.json$/,
  manualOps: /manual-ops-gate\.json$/,
}

const CONTRACT_MARKERS = [
  "LaunchProofPreemptionRouterContract",
  "LAUNCH_PROOF_PREEMPTION_ROUTER_CONTRACT",
  "LAUNCH-ROUTER-001-PROOF-PREEMPTION-ROUTER",
  "pnpm launch:preempt:check",
  "AUTH-005",
  "WORK-009",
  "DEPLOY-002",
  "RES-001-RESEARCH-REVIEW",
  "raw generated report payload bodies",
]

const DOC_MARKERS = [
  "LAUNCH-ROUTER-001-PROOF-PREEMPTION-ROUTER",
  "proof preemption router",
  "pnpm launch:preempt:check",
  "AUTH-005",
  "WORK-009",
  "DEPLOY-002",
]

function parseArgs(argv) {
  const args = { json: false, out: null }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--out") {
      const value = filtered[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm launch:preempt:check [--json] [--out <path>]")
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

function scanForbiddenLiterals({ label, text, errors }) {
  if (!text) return

  const forbiddenPatterns = [
    /postgres(?:ql)?:\/\/[^"'\s]+/i,
    /supabase\.co\/auth\/v1/i,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]

  const matches = forbiddenPatterns.filter((pattern) => pattern.test(text))
  if (matches.length > 0) {
    errors.push(`${label} appears to contain a forbidden secret-like literal.`)
  }
}

function listReportFiles() {
  const absoluteDir = path.join(ROOT, REPORT_DIR)
  if (!fs.existsSync(absoluteDir)) return []

  return fs
    .readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const absolutePath = path.join(absoluteDir, name)
      const stat = fs.statSync(absolutePath)
      return {
        name,
        path: `${REPORT_DIR}/${name}`,
        absolutePath,
        mtimeMs: stat.mtimeMs,
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
}

function parseJson(file, errors) {
  if (!file) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(file.absolutePath, "utf8"))
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      errors.push(`${file.path} is not a JSON object.`)
      return null
    }
    return parsed
  } catch (error) {
    errors.push(`${file.path} is not parseable JSON: ${error.message}`)
    return null
  }
}

function latestByPattern(files, pattern) {
  return files.find((file) => pattern.test(file.name)) ?? null
}

function proofSecretSafe(payload) {
  return payload?.secretPolicy?.printsSecrets === false || payload?.safety?.printsSecrets === false
}

function authCandidate(authProof) {
  const summary = authProof?.proofSummary
  const ready = summary?.canRunAuth005 === true
  const blocked = Array.isArray(summary?.blockedLabels) ? summary.blockedLabels : []
  return {
    id: "AUTH-005",
    label: "Real Supabase owner session/Profile proof",
    state: ready ? "ready_to_run" : "blocked_by_owner_input",
    ready,
    blockerLabels: blocked,
    evidenceSignal: ready ? "proofSummary.canRunAuth005=true" : blocked.join(", ") || "auth proof missing",
    nextAction: ready
      ? "Run AUTH-005 real Supabase user to Profile mapping and Work owner smoke test."
      : "Configure Supabase public env and provide sanitized signed-in /auth/status evidence.",
  }
}

function workCandidate(workTarget, workEvidence) {
  const targetReady = workTarget?.canRunWork009 === true
  const evidenceReady = workEvidence?.evidence?.latest?.overall?.canRunWork009 === true
  const ready = targetReady || evidenceReady
  const missing = Array.isArray(workTarget?.missing) ? workTarget.missing : []
  return {
    id: "WORK-009",
    label: "Disposable Work refresh proof",
    state: ready ? "ready_to_run" : "blocked_by_owner_input",
    ready,
    blockerLabels: missing,
    evidenceSignal: ready ? "canRunWork009=true" : missing.join(", ") || "Work proof target missing",
    nextAction: ready
      ? "Run pnpm work:proof -- --run against the approved proof target."
      : "Provide WORK_PROOF_DATABASE_URL plus explicit Work proof write confirmations.",
  }
}

function deployCandidate(launchProof, auth, work) {
  const deploymentMarkerPresent = launchProof?.readiness?.checks?.deploymentMarkerPresent === true
  const ready = auth.ready && work.ready && deploymentMarkerPresent
  const blocked = []
  if (!auth.ready) blocked.push("AUTH-005 not ready")
  if (!work.ready) blocked.push("WORK-009 not ready")
  if (!deploymentMarkerPresent) blocked.push("deployment marker missing")

  return {
    id: "DEPLOY-002",
    label: "Deployment marker and private route proof",
    state: ready ? "ready_to_run" : "blocked_downstream",
    ready,
    blockerLabels: blocked,
    evidenceSignal: ready ? "auth/work/deployment proof gates ready" : blocked.join(", "),
    nextAction: ready
      ? "Run deployment/private-route proof."
      : "Wait until AUTH-005 and Work proof are ready, then run launch proof in the deployed environment.",
  }
}

function fallbackCandidate() {
  return {
    id: "RES-001-RESEARCH-REVIEW",
    label: "Research-to-task fallback",
    state: "fallback_research",
    ready: true,
    blockerLabels: [],
    evidenceSignal: "proof preemption not available",
    nextAction:
      "Run the due RES-001/RES-002 research-to-task gap review and create one implementation-ready artifact.",
  }
}

function chooseRecommendation(candidates) {
  const auth = candidates.find((candidate) => candidate.id === "AUTH-005")
  const work = candidates.find((candidate) => candidate.id === "WORK-009")
  const deploy = candidates.find((candidate) => candidate.id === "DEPLOY-002")

  if (auth?.ready) return auth
  if (work?.ready) return work
  if (deploy?.ready) return deploy
  return candidates.find((candidate) => candidate.id === "RES-001-RESEARCH-REVIEW")
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const warnings = []
const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))

validateMarkers({ label: FILES.contract, text: texts.contract, markers: CONTRACT_MARKERS, errors })
validateMarkers({ label: FILES.script, text: texts.script, markers: [TASK_ID, "latestByPattern"], errors })
validateMarkers({
  label: "acceptance/backlog/sprint/completed/tasks docs",
  text: [texts.acceptance, texts.backlog, texts.sprint, texts.completedLog, texts.tasks].filter(Boolean).join("\n"),
  markers: DOC_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.packageJson,
  text: texts.packageJson,
  markers: ["launch:preempt:check", "check-launch-proof-preemption-router.mjs"],
  errors,
})

for (const key of ["contract", "script", "packageJson"]) {
  scanForbiddenLiterals({ label: FILES[key], text: texts[key], errors })
}

const reportFiles = listReportFiles()
const latest = Object.fromEntries(
  Object.entries(LATEST_PATTERNS).map(([key, pattern]) => [key, latestByPattern(reportFiles, pattern)])
)
const packets = Object.fromEntries(Object.entries(latest).map(([key, file]) => [key, parseJson(file, errors)]))

for (const key of ["launch", "auth", "workTarget"]) {
  if (!latest[key]) warnings.push(`No latest ${key} proof packet found in ${REPORT_DIR}.`)
}

for (const key of ["launch", "auth", "workTarget", "workEvidence", "manualOps"]) {
  if (packets[key] && !proofSecretSafe(packets[key])) {
    warnings.push(`${latest[key]?.path ?? key} does not expose an explicit no-secret policy marker.`)
  }
}

const auth = authCandidate(packets.auth)
const work = workCandidate(packets.workTarget, packets.workEvidence)
const deploy = deployCandidate(packets.launch, auth, work)
const fallback = fallbackCandidate()
const candidates = [auth, work, deploy, fallback]
const recommendation = chooseRecommendation(candidates)
const proofPreemptionReady = ["AUTH-005", "WORK-009", "DEPLOY-002"].includes(recommendation.id)

const payload = {
  id: TASK_ID,
  status: errors.length === 0 ? "ready_for_proof_preemption_routing" : "failed",
  generatedAt: new Date().toISOString(),
  mode: "static_no_secret_latest_proof_router",
  latestEvidence: Object.fromEntries(
    Object.entries(latest).map(([key, file]) => [
      key,
      file
        ? {
            path: file.path,
            modifiedMs: file.mtimeMs,
          }
        : null,
    ])
  ),
  recommendation: {
    nextTask: recommendation.id,
    label: recommendation.label,
    state: recommendation.state,
    proofPreemptionReady,
    nextAction: recommendation.nextAction,
  },
  candidates,
  manualOps: {
    latestStatus: packets.manualOps?.status ?? packets.manualOps?.summary?.status ?? "unknown",
    formalLaunchUnchanged: true,
  },
  safety: {
    scansWhitelistedReportsDirectoryOnly: true,
    executesCommands: false,
    connectsToDatabase: false,
    writesDatabase: false,
    mutatesAuthProvider: false,
    mutatesDeploymentProvider: false,
    printsSecrets: false,
    exposesRawPacketBodies: false,
    launchLevelUpgradeClaimed: false,
  },
  blockedClaims: [
    "AUTH-005 success",
    "WORK-009 success",
    "WORK-007 success",
    "DEPLOY-002 success",
    "L1 launch upgrade",
    "L3 launch upgrade",
    "L4 launch upgrade",
  ],
  errors,
  warnings,
}

if (args.out) {
  const outPath = path.join(ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(payload, null, 2))
} else {
  console.log(`Launch proof preemption router: ${payload.status}`)
  console.log(`Next task: ${payload.recommendation.nextTask}`)
  console.log(`State: ${payload.recommendation.state}`)
}

if (errors.length > 0) {
  process.exitCode = 1
}
