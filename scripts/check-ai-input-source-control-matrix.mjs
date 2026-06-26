#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  types: "src/types/ai-input-readiness.ts",
  service: "src/lib/services/ai-input-readiness.service.ts",
  client: "src/app/(dashboard)/ai-input/ai-input-client.tsx",
  adminService: "src/lib/services/admin-readiness.service.ts",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const TYPE_MARKERS = [
  "AIInputSourceControlMatrixContract",
  "AIInputSourceControlMatrixRow",
  "AIInputSourceControlInputMode",
  "AIInputSourceControlRiskLevel",
  'id: "AIINPUT-OPS-002"',
  'status: "formal_source_control_matrix_active"',
  'mode: "protected_read_no_connector_runtime"',
  "prohibitedRuntime",
  "sourceControlMatrix",
]

const SERVICE_MARKERS = [
  "AIInputSourceControlMatrixRow",
  "sourceControlRows",
  "formal_source_control_matrix_active",
  "protected_read_no_connector_runtime",
  "Manual import and local files",
  "LINE chamber messages",
  "Google Docs project documents",
  "RSS research feeds",
  "Gmail client threads",
  "GitHub repo and Markdown references",
  "Telegram research discussion",
  "OAuth runtime",
  "webhook runtime",
  "polling runtime",
  "provider API calls",
  "raw adapter payload exposure",
  "external agent registration",
]

const CLIENT_MARKERS = [
  "SourceInputMatrixRow",
  "formalReadiness.sourceControlMatrix",
  "AIINPUT-OPS-002",
  "來源輸入矩陣",
  "protected source-control matrix row",
  "provider 讀取",
  "file ingestion",
  "DB 寫入",
]

const ADMIN_SERVICE_MARKERS = [
  "AIINPUT-OPS-002 source control matrix",
  "sourceControlMatrix",
  "input mode, risk, status, next action, missing permissions",
  "No OAuth runtime, webhook runtime, polling runtime",
]

const DOC_MARKERS = [
  "AIINPUT-OPS-002",
  "source control matrix",
  "formal_source_control_matrix_active",
  "protected_read_no_connector_runtime",
  "pnpm ai-input:source-control:check",
]

const PACKAGE_MARKERS = [
  '"ai-input:source-control:check": "node scripts/check-ai-input-source-control-matrix.mjs"',
]

const REQUIRED_INPUT_MODES = ["manual", "polling", "webhook", "event", "scheduled", "one_time"]
const REQUIRED_RISKS = ["low", "medium", "high", "variable"]

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
      console.log("Usage: pnpm ai-input:source-control:check [--json] [--out <path>]")
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

validateMarkers({ label: FILES.types, text: contents.types, markers: TYPE_MARKERS, errors })
validateMarkers({ label: FILES.service, text: contents.service, markers: SERVICE_MARKERS, errors })
validateMarkers({ label: FILES.client, text: contents.client, markers: CLIENT_MARKERS, errors })
validateMarkers({
  label: FILES.adminService,
  text: contents.adminService,
  markers: ADMIN_SERVICE_MARKERS,
  errors,
})

for (const key of ["acceptance", "backlog", "sprint", "completedLog", "tasks"]) {
  validateMarkers({ label: FILES[key], text: contents[key], markers: DOC_MARKERS, errors })
}

validateMarkers({ label: FILES.packageJson, text: contents.packageJson, markers: PACKAGE_MARKERS, errors })

for (const mode of REQUIRED_INPUT_MODES) {
  if (!contents.service?.includes(`inputMode: "${mode}"`)) {
    errors.push(`${FILES.service} missing required input mode row: ${mode}`)
  }
}

for (const risk of REQUIRED_RISKS) {
  if (!contents.service?.includes(`riskLevel: "${risk}"`)) {
    errors.push(`${FILES.service} missing required risk level row: ${risk}`)
  }
}

const result = {
  id: "AIINPUT-OPS-002",
  status: errors.length === 0 ? "ready_for_source_control_matrix_use" : "failed",
  checkedAt: new Date().toISOString(),
  files: FILES,
  requiredInputModes: REQUIRED_INPUT_MODES,
  requiredRiskLevels: REQUIRED_RISKS,
  runtimeGuards: [
    "OAuth runtime",
    "webhook runtime",
    "polling runtime",
    "provider API calls",
    "file ingestion",
    "raw adapter payload exposure",
    "Supabase reads or writes",
    "module final writes",
    "public output expansion",
    "external agent registration",
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
  console.log(`AI Input source control matrix: ${result.status}`)
  console.log(`Input modes: ${result.requiredInputModes.join(", ")}`)
  if (args.out) console.log(`Proof written: ${args.out}`)
}

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
