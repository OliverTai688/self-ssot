#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  service: "src/lib/services/admin-readiness.service.ts",
  dashboard: "src/app/(dashboard)/dashboard/page.tsx",
  admin: "src/app/(dashboard)/admin/page.tsx",
  settings: "src/app/(dashboard)/settings/page.tsx",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  loopReview: "docs/06_audits-and-reports/RPT-011_loop-68-research-gap-review.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const SERVICE_MARKERS = [
  "OwnerEvidenceConsoleContract",
  "OwnerEvidenceConsoleRow",
  "OWNER-EVIDENCE-001",
  "buildOwnerEvidenceConsoleContract",
  "getOwnerEvidenceConsoleContract",
  "ownerEvidenceConsoleContract",
  "owner-launch-proof.json",
  "owner-auth-proof.json",
  "owner-work-proof.json",
  "owner-ai-input-split-proof.json",
  "owner-deployment-proof.json",
  "OWNER-UI-REVIEW",
  "AUTH-005",
  "WORK-009",
  "DATTR-024",
  "DEPLOY-002",
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw generated report payload bodies",
]

const PAGE_MARKERS = [
  "Owner evidence console",
  "ownerEvidenceConsoleContract",
  "primaryOwnerAction",
  "prohibitedExposure",
]

const DOC_MARKERS = [
  "OWNER-EVIDENCE-001",
  "Owner evidence console",
  "AUTH-005",
  "WORK-009",
  "OWNER-UI-REVIEW",
  "DATTR-024",
  "DEPLOY-002",
  "pnpm owner:evidence:check",
]

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
      console.log("Usage: pnpm owner:evidence:check [--json] [--out <path>]")
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

const args = parseArgs(process.argv.slice(2))
const errors = []

const contents = Object.fromEntries(
  Object.entries(FILES).map(([key, filePath]) => [key, read(filePath)])
)

validateMarkers({
  label: FILES.service,
  text: contents.service,
  markers: SERVICE_MARKERS,
  errors,
})

for (const key of ["dashboard", "admin", "settings"]) {
  validateMarkers({
    label: FILES[key],
    text: contents[key],
    markers: PAGE_MARKERS,
    errors,
  })
}

for (const key of ["acceptance", "backlog", "sprint", "completedLog", "loopReview", "tasks"]) {
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
  markers: ['"owner:evidence:check": "node scripts/check-owner-evidence-console.mjs"'],
  errors,
})

const result = {
  id: "OWNER-EVIDENCE-001",
  status: errors.length === 0 ? "ready_for_owner_evidence_console_use" : "failed",
  checkedAt: new Date().toISOString(),
  files: FILES,
  checkedRows: ["AUTH-005", "WORK-009", "OWNER-UI-REVIEW", "DATTR-024", "DEPLOY-002"],
  noSecretBoundary: [
    "Supabase URLs or keys",
    "database URLs or hosts",
    "cookies or tokens",
    "raw auth claims",
    "provider payloads",
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
  console.log(`Owner evidence console contract: ${result.status}`)
  console.log(`Checked rows: ${result.checkedRows.join(", ")}`)
  if (args.out) console.log(`Proof written: ${args.out}`)
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
