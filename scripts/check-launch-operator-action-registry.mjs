#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  contract: "src/lib/contracts/launch-operator-action-registry.contract.ts",
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

const REQUIRED_ACTION_IDS = [
  "launch.proof",
  "auth.session-proof",
  "work.target-readiness",
  "work.docker-disposable",
  "deploy.marker-proof",
  "owner.ui-review",
  "client.token-lifecycle-approval",
  "ai-input.persistence-approval",
  "agent.external-registration-approval",
]

const CONTRACT_MARKERS = [
  "LaunchOperatorActionRegistryContract",
  "LaunchOperatorAction",
  "ADMIN-OPS-002",
  "LAUNCH_OPERATOR_ACTION_REQUIRED_IDS",
  "LAUNCH_OPERATOR_ACTION_PROHIBITED_EXPOSURE",
  "client share tokens",
  "external registry writes",
]

const SERVICE_MARKERS = [
  "buildLaunchOperatorActionRegistryContract",
  "getLaunchOperatorActionRegistryContract",
  "launchOperatorActionRegistryContract",
  "AUTH-005",
  "WORK-009",
  "WORK-012",
  "CLIENT-005",
  "DATTR-024",
  "externalRegisterable=false",
]

const ADMIN_MARKERS = [
  "Launch operator actions",
  "LaunchOperatorActionRegistryTable",
  "launchOperatorActionRegistryContract",
  "primaryBlocker",
]

const SETTINGS_MARKERS = [
  "Launch operator actions",
  "launchOperatorActionRegistryContract",
  "Operator actions",
  "primaryBlocker",
]

const DOC_MARKERS = [
  "ADMIN-OPS-002",
  "launch operator action registry",
  "pnpm launch:actions:check",
  "AUTH-005",
  "WORK-009",
  "CLIENT-005",
  "DATTR-024",
  "AGENT-013",
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
      args.out = filtered[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm launch:actions:check [--json] [--out <path>]")
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
const warnings = []
const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))

validateMarkers({ label: FILES.contract, text: texts.contract, markers: CONTRACT_MARKERS, errors })
validateMarkers({ label: FILES.service, text: texts.service, markers: SERVICE_MARKERS, errors })
validateMarkers({ label: FILES.admin, text: texts.admin, markers: ADMIN_MARKERS, errors })
validateMarkers({ label: FILES.settings, text: texts.settings, markers: SETTINGS_MARKERS, errors })
validateMarkers({
  label: "acceptance/backlog/sprint/completed/tasks docs",
  text: [texts.acceptance, texts.backlog, texts.sprint, texts.completedLog, texts.tasks].filter(Boolean).join("\n"),
  markers: DOC_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.packageJson,
  text: texts.packageJson,
  markers: ["launch:actions:check", "check-launch-operator-action-registry.mjs"],
  errors,
})

for (const id of REQUIRED_ACTION_IDS) {
  if (!texts.contract?.includes(id) || !texts.service?.includes(id)) {
    errors.push(`Required action id ${id} is missing from contract or service.`)
  }
}

if (texts.service?.includes("externalRegisterable: true")) {
  errors.push("Service must not mark external agents as registerable.")
}

if (texts.service?.includes("route.ts") || texts.admin?.includes("route.ts") || texts.settings?.includes("route.ts")) {
  warnings.push("Route marker found in scanned text; confirm no public route handler was added for ADMIN-OPS-002.")
}

for (const key of ["contract", "service", "admin", "settings", "packageJson"]) {
  const text = texts[key]
  scanForbiddenLiterals({ label: FILES[key], text, errors })
}

const payload = {
  id: "ADMIN-OPS-002",
  status: errors.length === 0 ? "ready_for_operator_action_registry_use" : "failed",
  generatedAt: new Date().toISOString(),
  requiredActionIds: REQUIRED_ACTION_IDS,
  summary: {
    actionCount: REQUIRED_ACTION_IDS.length,
    docsChecked: ["acceptance", "backlog", "sprint", "completedLog", "tasks"],
    surfaces: ["admin", "settings"],
    noSecretBoundaryChecked: true,
    publicRouteAdded: false,
  },
  files: FILES,
  errors,
  warnings,
  secretPolicy: {
    printsSecrets: false,
    forbidden: [
      "Supabase URLs or keys",
      "database URLs or hosts",
      "cookies or tokens",
      "raw auth claims",
      "provider payloads",
      "profile IDs",
      "row IDs",
      "client share tokens",
      "external registry writes",
    ],
  },
  nextAction:
    errors.length === 0
      ? "Use protected admin/settings launch operator actions for owner-run evidence, dry-run checks, and approval-required blockers."
      : "Fix missing markers or no-secret boundary regressions before relying on the registry.",
}

if (args.out) {
  const outPath = path.join(ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(payload, null, 2))
} else {
  console.log(`ADMIN-OPS-002 launch operator action registry: ${payload.status}`)
  console.log(`Actions: ${payload.summary.actionCount}`)
  console.log(`Surfaces: ${payload.summary.surfaces.join(", ")}`)
  if (warnings.length > 0) {
    console.log("Warnings:")
    for (const warning of warnings) console.log(`- ${warning}`)
  }
  if (errors.length > 0) {
    console.error("Errors:")
    for (const error of errors) console.error(`- ${error}`)
  }
}

process.exit(errors.length === 0 ? 0 : 1)
