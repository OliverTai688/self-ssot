#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const REPORT_DIR = "docs/2_agent-input/generated/agent-loop/reports"

const FILES = {
  contract: "src/lib/contracts/launch-readiness-history.contract.ts",
  service: "src/lib/services/admin-readiness.service.ts",
  admin: "src/app/(dashboard)/admin/page.tsx",
  settings: "src/app/(dashboard)/settings/page.tsx",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const CONTRACT_MARKERS = [
  "LaunchReadinessHistoryContract",
  "LaunchReadinessHistoryRow",
  "LaunchReadinessHistorySurface",
  "ADMIN-OPS-001",
  "launchProofCommand",
  "authProofCommand",
  "workProofTargetCommand",
  "historyCheckCommand",
  "raw generated report payload bodies",
]

const SERVICE_MARKERS = [
  "buildLaunchReadinessHistoryContract",
  "getLaunchReadinessHistoryContract",
  "launchReadinessHistoryContract",
  "launch-proof",
  "auth-proof",
  "work-proof-target-readiness",
  "launch-readiness-history-check",
  "ADMIN-OPS-001",
  "raw generated report payload bodies",
]

const ADMIN_MARKERS = [
  "Launch readiness history",
  "LaunchReadinessHistoryTable",
  "launchReadinessHistoryContract",
  "primaryBlocker",
]

const SETTINGS_MARKERS = [
  "Launch readiness history",
  "launchReadinessHistoryContract",
  "Readiness history",
  "primaryBlocker",
]

const DOC_MARKERS = [
  "ADMIN-OPS-001",
  "launch readiness history",
  "pnpm launch:history:check",
  "AUTH-005",
  "WORK-009",
  "DEPLOY-002",
]

const REQUIRED_PROOFS = {
  launch: "launch-proof",
  auth: "auth-proof",
  work: "work-proof-target-readiness",
}

function reportNameMatchesMarker(name, marker) {
  if (marker === "launch-proof") return /(^|-)launch-proof\.json$/.test(name)
  if (marker === "auth-proof") return /(^|-)auth-proof\.json$/.test(name)
  if (marker === "work-proof-target-readiness") return /(^|-)work-proof-target-readiness\.json$/.test(name)
  return name.includes(marker)
}

function parseArgs(argv) {
  const args = { out: null, json: false }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--out") {
      args.out = filtered[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm launch:history:check [--json] [--out <path>]")
      process.exit(0)
    }
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

function parseJsonFile(file, errors) {
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

function proofSecretPolicyOk(payload) {
  const secretPolicy = payload.secretPolicy
  const safety = payload.safety

  if (secretPolicy && typeof secretPolicy === "object" && secretPolicy.printsSecrets === false) {
    return true
  }

  if (safety && typeof safety === "object" && safety.printsSecrets === false) {
    return true
  }

  return false
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

const args = parseArgs(process.argv.slice(2))
const errors = []
const contents = Object.fromEntries(
  Object.entries(FILES).map(([key, filePath]) => [key, read(filePath)])
)

validateMarkers({
  label: FILES.contract,
  text: contents.contract,
  markers: CONTRACT_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.service,
  text: contents.service,
  markers: SERVICE_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.admin,
  text: contents.admin,
  markers: ADMIN_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.settings,
  text: contents.settings,
  markers: SETTINGS_MARKERS,
  errors,
})

for (const key of ["acceptance", "backlog", "sprint", "completedLog", "tasks"]) {
  validateMarkers({
    label: FILES[key],
    text: contents[key],
    markers: DOC_MARKERS,
    errors,
  })
}

validateMarkers({
  label: FILES.packageJson,
  text: contents.packageJson,
  markers: ['"launch:history:check": "node scripts/check-launch-readiness-history.mjs"'],
  errors,
})

for (const [key, text] of Object.entries(contents).filter(([key]) =>
  ["contract", "service", "admin", "settings"].includes(key)
)) {
  scanForbiddenLiterals({ label: FILES[key], text, errors })
}

const reportFiles = listReportFiles()
const latestProofs = Object.fromEntries(
  Object.entries(REQUIRED_PROOFS).map(([surface, marker]) => {
    const file = reportFiles.find((candidate) => reportNameMatchesMarker(candidate.name, marker)) ?? null
    if (!file) {
      errors.push(`Latest ${surface} proof packet with marker ${marker} was not found.`)
      return [surface, null]
    }

    const payload = parseJsonFile(file, errors)
    if (payload && !proofSecretPolicyOk(payload)) {
      errors.push(`${file.path} does not explicitly declare printsSecrets=false.`)
    }

    return [
      surface,
      {
        path: file.path,
        generatedAt: payload?.generatedAt ?? "unknown",
        status: payload?.proofSummary?.overallStatus ?? payload?.status ?? payload?.readiness?.overallStatus ?? "unknown",
      },
    ]
  })
)

const result = {
  id: "ADMIN-OPS-001",
  status: errors.length === 0 ? "ready_for_launch_readiness_history_use" : "failed",
  checkedAt: new Date().toISOString(),
  files: FILES,
  checkedSurfaces: ["launch", "auth", "work", "deployment", "owner-ui", "admin-ops"],
  latestProofs,
  noSecretBoundary: [
    "Supabase URLs or keys",
    "database URLs or hosts",
    "cookies or tokens",
    "raw auth claims",
    "provider payloads",
    "profile IDs",
    "row IDs",
    "raw generated report payload bodies",
  ],
  errors,
}

if (args.out) {
  const outputPath = path.resolve(ROOT, args.out)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log(`Launch readiness history contract: ${result.status}`)
  console.log(`Checked surfaces: ${result.checkedSurfaces.join(", ")}`)
  if (args.out) console.log(`Proof written: ${args.out}`)
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
