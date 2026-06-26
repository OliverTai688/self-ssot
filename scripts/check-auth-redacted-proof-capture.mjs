#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  authStatusRoute: "src/app/auth/status/route.ts",
  authProofScript: "scripts/collect-auth-session-proof.mjs",
  ownerAccessContract: "src/lib/contracts/owner-access-readiness.contract.ts",
  ownerAccessCheck: "scripts/check-owner-access-readiness.mjs",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  packageJson: "package.json",
}

const ROUTE_MARKERS = [
  "isRedactedProofRequest",
  "proofMode: \"redacted\"",
  "emailPresent: true",
  "email: auth.user.email",
]

const PROOF_SCRIPT_MARKERS = [
  "redactedEmailPresent",
  "payload?.profile?.emailPresent === true",
  "/auth/status?proof=1",
  "Recollect /auth/status?proof=1",
]

const HANDOFF_MARKERS = [
  "/auth/status?proof=1",
  "actual profile email values",
  "pnpm auth:proof",
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
      console.log("Usage: pnpm auth:redacted-proof:check [--json] [--out <path>]")
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

function scanSecretLikeLiterals({ label, text, errors }) {
  if (!text) return

  const forbiddenPatterns = [
    /postgres(?:ql)?:\/\/[^"'\s]+/i,
    /https:\/\/[a-z0-9-]+\.supabase\.co/i,
    /sb_(?:publishable|secret)_[A-Za-z0-9_-]{10,}/,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]

  if (forbiddenPatterns.some((pattern) => pattern.test(text))) {
    errors.push(`${label} appears to contain a forbidden secret-like literal.`)
  }
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))

validateMarkers({
  label: FILES.authStatusRoute,
  text: texts.authStatusRoute,
  markers: ROUTE_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.authProofScript,
  text: texts.authProofScript,
  markers: PROOF_SCRIPT_MARKERS,
  errors,
})
validateMarkers({
  label: "owner access handoff docs",
  text: [texts.ownerAccessContract, texts.ownerAccessCheck, texts.acceptance, texts.backlog]
    .filter(Boolean)
    .join("\n"),
  markers: HANDOFF_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.packageJson,
  text: texts.packageJson,
  markers: ["auth:redacted-proof:check", "check-auth-redacted-proof-capture.mjs"],
  errors,
})

for (const key of ["authStatusRoute", "authProofScript", "ownerAccessContract", "ownerAccessCheck", "packageJson"]) {
  scanSecretLikeLiterals({ label: FILES[key], text: texts[key], errors })
}

const payload = {
  id: "AUTH-009",
  status: errors.length === 0 ? "ready_for_redacted_auth_proof_capture" : "failed",
  generatedAt: new Date().toISOString(),
  summary: {
    routeSupportsRedactedProofMode: texts.authStatusRoute?.includes("proofMode: \"redacted\"") === true,
    routeUsesEmailPresenceFlag: texts.authStatusRoute?.includes("emailPresent: true") === true,
    proofScriptAcceptsEmailPresenceFlag:
      texts.authProofScript?.includes("payload?.profile?.emailPresent === true") === true,
    ownerHandoffUsesRedactedStatusUrl:
      [texts.ownerAccessContract, texts.ownerAccessCheck].filter(Boolean).join("\n").includes("/auth/status?proof=1"),
    publicSafe: true,
    writesDatabase: false,
    mutatesProvider: false,
    readsCookiesOrTokens: false,
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
      "actual profile email values in generated proof packets",
      "private Work rows",
    ],
  },
  nextAction:
    errors.length === 0
      ? "Use /auth/status?proof=1 from a signed-in browser session, then run pnpm auth:proof with the saved redacted JSON."
      : "Fix missing markers before relying on redacted auth proof capture.",
}

if (args.out) {
  const outPath = path.join(ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(payload, null, 2))
} else if (errors.length === 0) {
  console.log("AUTH-009 redacted auth proof capture check passed.")
} else {
  console.error("AUTH-009 redacted auth proof capture check failed:")
  errors.forEach((error) => console.error(`- ${error}`))
}

process.exit(errors.length === 0 ? 0 : 1)
