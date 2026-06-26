#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  contract: "src/lib/contracts/owner-access-readiness.contract.ts",
  login: "src/app/(auth)/login/page.tsx",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const REQUIRED_ROW_IDS = [
  "supabase-login",
  "dev-mock-login",
  "protected-next-path",
  "proof-handoff",
]

const CONTRACT_MARKERS = [
  "OwnerAccessReadinessContract",
  "AUTH-007",
  "OWNER_ACCESS_READINESS_REQUIRED_IDS",
  "OWNER_ACCESS_READINESS_PROHIBITED_EXPOSURE",
  "actual profile email values",
  "buildOwnerAccessReadinessContract",
  "PERSONAL_OS_AUTH_MODE=mock",
  "/auth/status?proof=1",
]

const LOGIN_MARKERS = [
  "Owner access readiness",
  "ownerAccessReadinessContract",
  "buildOwnerAccessReadinessContract",
  "getReadinessBadgeLabel",
  "hasSupabaseConfig",
  "Magic link",
]

const DOC_MARKERS = [
  "AUTH-007",
  "owner access readiness",
  "pnpm owner:access:check",
  "AUTH-005",
  "WORK-009",
  "public-safe",
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
      console.log("Usage: pnpm owner:access:check [--json] [--out <path>]")
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
    /https:\/\/[a-z0-9-]+\.supabase\.co/i,
    /sb_publishable_[A-Za-z0-9_-]{10,}/,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]

  const matches = forbiddenPatterns.filter((pattern) => pattern.test(text))
  if (matches.length > 0) {
    errors.push(`${label} appears to contain a forbidden secret-like literal.`)
  }
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))

validateMarkers({ label: FILES.contract, text: texts.contract, markers: CONTRACT_MARKERS, errors })
validateMarkers({ label: FILES.login, text: texts.login, markers: LOGIN_MARKERS, errors })
validateMarkers({
  label: "acceptance/backlog/sprint/completed/tasks docs",
  text: [texts.acceptance, texts.backlog, texts.sprint, texts.completedLog, texts.tasks].filter(Boolean).join("\n"),
  markers: DOC_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.packageJson,
  text: texts.packageJson,
  markers: ["owner:access:check", "check-owner-access-readiness.mjs"],
  errors,
})

for (const id of REQUIRED_ROW_IDS) {
  if (!texts.contract?.includes(id)) {
    errors.push(`Required owner access row id ${id} is missing from the contract.`)
  }
}

for (const key of ["contract", "login", "packageJson"]) {
  scanForbiddenLiterals({ label: FILES[key], text: texts[key], errors })
}

const payload = {
  id: "AUTH-007",
  status: errors.length === 0 ? "ready_for_owner_access_readiness_use" : "failed",
  generatedAt: new Date().toISOString(),
  requiredRowIds: REQUIRED_ROW_IDS,
  summary: {
    surface: "login",
    publicSafe: true,
    writesDatabase: false,
    mutatesProvider: false,
    routeHandlerAdded: false,
    docsChecked: ["acceptance", "backlog", "sprint", "completedLog", "tasks"],
  },
  files: FILES,
  errors,
  secretPolicy: {
    printsSecrets: false,
    forbidden: [
      "Supabase URLs or keys",
      "database URLs or hosts",
      "cookies or tokens",
      "raw auth claims",
      "raw provider payloads",
      "profile IDs",
      "actual profile email values",
      "private Work rows",
    ],
  },
  nextAction:
    errors.length === 0
      ? "Use /login as the owner access readiness surface, then run AUTH-005 or WORK-009 only when their proof prerequisites appear."
      : "Fix missing markers or no-secret boundary regressions before relying on the login readiness surface.",
}

if (args.out) {
  const outPath = path.join(ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(payload, null, 2))
} else {
  console.log(`AUTH-007 owner access readiness: ${payload.status}`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
}

process.exit(errors.length === 0 ? 0 : 1)
