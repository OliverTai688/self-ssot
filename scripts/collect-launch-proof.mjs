#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const DEFAULT_OUT = "docs/2_agent-input/generated/agent-loop/launch-proof/latest-launch-proof.json"

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--out") {
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
  console.log("Collect no-secret Personal OS launch proof")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm launch:proof")
  console.log("  pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
}

function runReadinessCheck() {
  const result = spawnSync(process.execPath, ["scripts/check-launch-readiness.mjs", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`launch readiness check failed with exit code ${result.status}`)
  }

  try {
    return JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`launch readiness check did not return valid JSON: ${error.message}`)
  }
}

function buildProof(readiness) {
  const blockedRows = readiness.rows.filter((row) => row.status === "blocked")
  const warnRows = readiness.rows.filter((row) => row.status === "warn")
  const blockedLabels = blockedRows.map((row) => row.label)

  const canRunAuth005 =
    readiness.checks.supabasePublicUrlPresent &&
    readiness.checks.supabasePublishableOrAnonKeyPresent &&
    readiness.checks.effectiveAuthMode === "supabase"

  const canRunWork007 =
    readiness.checks.databaseUrlPresent &&
    readiness.checks.databaseUrlParseable &&
    readiness.checks.databaseHostResolves

  const canClaimL1 =
    readiness.overallStatus === "ready" &&
    readiness.checks.deploymentMarkerPresent &&
    canRunAuth005 &&
    canRunWork007

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceCommand: "pnpm launch:check --json",
    secretPolicy: {
      printsSecrets: false,
      excludedValues: [
        "Supabase URLs",
        "Supabase publishable or anon keys",
        "database URLs",
        "database hosts",
        "cookies",
        "tokens",
        "raw auth claims",
        "profile IDs",
      ],
    },
    readiness,
    proofSummary: {
      overallStatus: readiness.overallStatus,
      blockedLabels,
      warnLabels: warnRows.map((row) => row.label),
      canRunAuth005,
      canRunWork007,
      canClaimL1,
      expectedStrictExitCode: readiness.overallStatus === "blocked" ? 1 : 0,
      loop20ReviewInput:
        readiness.overallStatus === "ready"
          ? "Review can evaluate AUTH-005 and WORK-007 proof readiness."
          : "Review should keep launch level below L1 and prioritize remaining blocked labels.",
    },
    nextActions: readiness.nextActions,
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const readiness = runReadinessCheck()
  const proof = buildProof(readiness)
  const outPath = resolve(process.cwd(), args.out)

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(proof, null, 2)}\n`)

  console.log(`Launch proof written: ${args.out}`)
  console.log(`Overall: ${proof.proofSummary.overallStatus}`)
  console.log(`Blocked: ${proof.proofSummary.blockedLabels.join(", ") || "none"}`)
  console.log(`Expected strict exit code: ${proof.proofSummary.expectedStrictExitCode}`)
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
