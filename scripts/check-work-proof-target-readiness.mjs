#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { config } from "dotenv"

const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
const DEFAULT_OUT =
  "docs/2_agent-input/generated/agent-loop/work-refresh-proof/latest-work-proof-target-readiness.json"

config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

function parseArgs(argv) {
  const args = {
    json: false,
    useDatabaseUrl: false,
    out: null,
    help: false,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--use-database-url") {
      args.useDatabaseUrl = true
    } else if (arg === "--out") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log("Check whether the Work refresh proof target is ready for WORK-009")
  console.log("")
  console.log("Readiness check, with no DB connection and no DB writes:")
  console.log("  pnpm work:proof-target:check")
  console.log("  pnpm work:proof-target:check -- --json")
  console.log("")
  console.log("Optional output packet:")
  console.log(`  pnpm work:proof-target:check -- --out ${DEFAULT_OUT}`)
  console.log("")
  console.log("Optional local DATABASE_URL fallback:")
  console.log("  pnpm work:proof-target:check -- --use-database-url")
}

function selectedTarget(args) {
  if (process.env.WORK_PROOF_DATABASE_URL) {
    return {
      provided: true,
      source: "WORK_PROOF_DATABASE_URL",
      value: process.env.WORK_PROOF_DATABASE_URL,
    }
  }

  if (args.useDatabaseUrl && process.env.DATABASE_URL) {
    return {
      provided: true,
      source: "DATABASE_URL",
      value: process.env.DATABASE_URL,
    }
  }

  return {
    provided: false,
    source: args.useDatabaseUrl ? "DATABASE_URL" : "WORK_PROOF_DATABASE_URL",
    value: null,
  }
}

function classifyTarget(target) {
  if (!target.provided) {
    return {
      provided: false,
      source: target.source,
      parseable: false,
      hostClass: "missing",
      databaseNameHasProofMarker: false,
    }
  }

  try {
    const url = new URL(target.value)
    const hostname = url.hostname.toLowerCase()
    const databaseName = url.pathname.replace(/^\//, "")
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
    const hostClass = localHosts.has(hostname) ? "local" : "remote"

    return {
      provided: true,
      source: target.source,
      parseable: true,
      hostClass,
      databaseNameHasProofMarker: /work[_-]?proof|disposable|scratch|test|local|tmp/i.test(databaseName),
    }
  } catch {
    return {
      provided: true,
      source: target.source,
      parseable: false,
      hostClass: "unknown",
      databaseNameHasProofMarker: false,
    }
  }
}

function buildReadiness(args) {
  const target = selectedTarget(args)
  const targetInfo = classifyTarget(target)
  const hasAllowWrites = process.env.PERSONAL_OS_WORK_PROOF_ALLOW_WRITES === "1"
  const hasConfirmation = process.env.PERSONAL_OS_WORK_PROOF_CONFIRM === CONFIRMATION_TEXT
  const hasRemoteOverride = process.env.PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE === "1"
  const targetIsLocal = targetInfo.hostClass === "local"
  const remoteTargetAllowed =
    targetInfo.hostClass === "remote" &&
    targetInfo.source === "WORK_PROOF_DATABASE_URL" &&
    hasRemoteOverride
  const targetAllowed = targetIsLocal || remoteTargetAllowed
  const missing = []
  const warnings = []

  if (!targetInfo.provided) missing.push("WORK_PROOF_DATABASE_URL is not set.")
  if (targetInfo.provided && !targetInfo.parseable) missing.push("Selected proof database URL is not parseable.")
  if (!targetAllowed) {
    missing.push(
      "Selected target must be local, or a remote disposable WORK_PROOF_DATABASE_URL must set PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE=1."
    )
  }
  if (!hasAllowWrites) missing.push("PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1 is missing.")
  if (!hasConfirmation) missing.push(`PERSONAL_OS_WORK_PROOF_CONFIRM=${CONFIRMATION_TEXT} is missing.`)

  if (targetInfo.source === "DATABASE_URL") {
    warnings.push("DATABASE_URL fallback was selected; prefer WORK_PROOF_DATABASE_URL for disposable Work proof runs.")
  }
  if (remoteTargetAllowed && !targetInfo.databaseNameHasProofMarker) {
    warnings.push(
      "Remote override is present, but the database name does not contain a disposable/proof marker; confirm the target is not valuable before WORK-009."
    )
  }

  const canRunWork009 = missing.length === 0
  const nextActions = canRunWork009
    ? [
        "Run WORK-009 with pnpm work:proof -- --run --json --out docs/2_agent-input/generated/agent-loop/reports/<work-proof>.json.",
        "Inspect the generated proof packet for status=passed, refresh markers, and cleanup.cleanup=passed.",
      ]
    : [
        "Provide an explicit local/disposable WORK_PROOF_DATABASE_URL or rerun with --use-database-url only for a local disposable DATABASE_URL.",
        "Set PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1.",
        `Set PERSONAL_OS_WORK_PROOF_CONFIRM=${CONFIRMATION_TEXT}.`,
        "For a remote disposable proof DB, set PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE=1 only after confirming it is not a valuable launch database.",
      ]

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "WORK-010",
    mode: "readiness_check",
    status: canRunWork009 ? "ready_for_work_009" : "needs_operator_input",
    canRunWork009,
    target: {
      provided: targetInfo.provided,
      source: targetInfo.source,
      parseable: targetInfo.parseable,
      hostClass: targetInfo.hostClass,
      databaseNameHasProofMarker: targetInfo.databaseNameHasProofMarker,
    },
    confirmations: {
      allowWrites: hasAllowWrites,
      confirmationAccepted: hasConfirmation,
      remoteOverride: hasRemoteOverride,
    },
    missing,
    warnings,
    nextActions,
    safety: {
      doesNotConnectToDatabase: true,
      doesNotWriteDatabase: true,
      printsSecrets: false,
      excludedValues: [
        "database URLs",
        "database hosts",
        "profile IDs",
        "project IDs",
        "task IDs",
        "note IDs",
        "deliverable IDs",
        "tokens",
        "cookies",
      ],
    },
  }
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(payload) {
  console.log("Personal OS Work proof target readiness")
  console.log(`Mode: ${payload.mode}`)
  console.log(`Status: ${payload.status}`)
  console.log(`Can run WORK-009: ${payload.canRunWork009}`)
  console.log(`Generated at: ${payload.generatedAt}`)
  console.log("")
  console.log("Target:")
  console.log(`- source: ${payload.target.source}`)
  console.log(`- provided: ${payload.target.provided}`)
  console.log(`- parseable: ${payload.target.parseable}`)
  console.log(`- host class: ${payload.target.hostClass}`)
  console.log(`- database name has proof marker: ${payload.target.databaseNameHasProofMarker}`)
  console.log("")
  console.log("Confirmations:")
  console.log(`- allow writes: ${payload.confirmations.allowWrites}`)
  console.log(`- confirmation accepted: ${payload.confirmations.confirmationAccepted}`)
  console.log(`- remote override: ${payload.confirmations.remoteOverride}`)

  if (payload.missing.length > 0) {
    console.log("")
    console.log("Missing:")
    for (const item of payload.missing) console.log(`- ${item}`)
  }

  if (payload.warnings.length > 0) {
    console.log("")
    console.log("Warnings:")
    for (const item of payload.warnings) console.log(`- ${item}`)
  }

  console.log("")
  console.log("Next actions:")
  for (const item of payload.nextActions) console.log(`- ${item}`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const payload = buildReadiness(args)
  if (args.out) writeOut(args.out, payload)
  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(payload)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
