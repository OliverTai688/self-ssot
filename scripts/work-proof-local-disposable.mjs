#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { config } from "dotenv"
import pg from "pg"

const { Client } = pg

const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
const DEFAULT_OUT =
  "docs/2_agent-input/generated/agent-loop/work-refresh-proof/latest-local-disposable-bootstrap.json"
const DEFAULT_PROOF_OUT =
  "docs/2_agent-input/generated/agent-loop/work-refresh-proof/latest-local-disposable-work-proof.json"
const DEFAULT_DATABASE_NAME = "personal_os_work_proof"
const PROOF_MARKER_RE = /personal[_-]?os[_-]?work[_-]?proof|work[_-]?proof|disposable|scratch|tmp/i
const VALUABLE_NAME_RE = /prod|production|primary|main|launch|supabase|live|real|owner/i

config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

function parseArgs(argv) {
  const args = {
    run: false,
    dryRun: false,
    json: false,
    setup: false,
    createDatabase: false,
    useDatabaseUrl: false,
    targetUrl: null,
    adminUrl: null,
    databaseName: null,
    out: DEFAULT_OUT,
    proofOut: DEFAULT_PROOF_OUT,
    help: false,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--run") {
      args.run = true
    } else if (arg === "--dry-run") {
      args.dryRun = true
    } else if (arg === "--json") {
      args.json = true
    } else if (arg === "--setup") {
      args.setup = true
    } else if (arg === "--create-database") {
      args.createDatabase = true
    } else if (arg === "--use-database-url") {
      args.useDatabaseUrl = true
    } else if (arg === "--target-url") {
      args.targetUrl = requiredValue(filteredArgs, index, "--target-url")
      index += 1
    } else if (arg === "--admin-url") {
      args.adminUrl = requiredValue(filteredArgs, index, "--admin-url")
      index += 1
    } else if (arg === "--database-name") {
      args.databaseName = requiredValue(filteredArgs, index, "--database-name")
      index += 1
    } else if (arg === "--out") {
      args.out = requiredValue(filteredArgs, index, "--out")
      index += 1
    } else if (arg === "--proof-out") {
      args.proofOut = requiredValue(filteredArgs, index, "--proof-out")
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (args.run && args.dryRun) {
    throw new Error("--run and --dry-run cannot be used together")
  }

  if (args.createDatabase && !args.run) {
    throw new Error("--create-database requires --run")
  }

  return args
}

function requiredValue(args, index, flag) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function printHelp() {
  console.log("Bootstrap a local disposable Work proof target and run the existing WORK-009 harness safely")
  console.log("")
  console.log("Dry-run readiness, no DB connection and no DB writes:")
  console.log("  pnpm work:proof:local-disposable")
  console.log("  pnpm work:proof:local-disposable -- --json")
  console.log("")
  console.log("Run against an existing local disposable target:")
  console.log("  pnpm work:proof:local-disposable -- --run --target-url postgresql://localhost:5432/personal_os_work_proof")
  console.log("")
  console.log("Create a local disposable database from a local admin URL, then run proof with migrations:")
  console.log("  pnpm work:proof:local-disposable -- --run --create-database --admin-url postgresql://localhost:5432/postgres --setup")
  console.log("")
  console.log("Optional env inputs:")
  console.log("  WORK_PROOF_LOCAL_TARGET_URL")
  console.log("  WORK_PROOF_LOCAL_ADMIN_DATABASE_URL")
  console.log("  WORK_PROOF_LOCAL_DATABASE_NAME")
  console.log("")
  console.log("This helper never silently uses DATABASE_URL. Use --use-database-url only for an explicit local disposable target.")
}

function selectedInput(args) {
  const explicitTarget =
    args.targetUrl ?? process.env.WORK_PROOF_LOCAL_TARGET_URL ?? process.env.WORK_PROOF_DATABASE_URL ?? null
  const explicitAdmin = args.adminUrl ?? process.env.WORK_PROOF_LOCAL_ADMIN_DATABASE_URL ?? null
  const databaseName = args.databaseName ?? process.env.WORK_PROOF_LOCAL_DATABASE_NAME ?? DEFAULT_DATABASE_NAME

  if (explicitTarget) {
    return {
      kind: "existing_target",
      source: args.targetUrl
        ? "--target-url"
        : process.env.WORK_PROOF_LOCAL_TARGET_URL
          ? "WORK_PROOF_LOCAL_TARGET_URL"
          : "WORK_PROOF_DATABASE_URL",
      targetUrl: explicitTarget,
      adminUrl: null,
      databaseName,
    }
  }

  if (args.useDatabaseUrl && process.env.DATABASE_URL) {
    return {
      kind: "database_url_fallback",
      source: "DATABASE_URL",
      targetUrl: process.env.DATABASE_URL,
      adminUrl: null,
      databaseName,
    }
  }

  if (explicitAdmin) {
    return {
      kind: "admin_create_or_identify",
      source: args.adminUrl ? "--admin-url" : "WORK_PROOF_LOCAL_ADMIN_DATABASE_URL",
      targetUrl: buildTargetUrl(explicitAdmin, databaseName),
      adminUrl: explicitAdmin,
      databaseName,
    }
  }

  return {
    kind: "missing",
    source: "none",
    targetUrl: null,
    adminUrl: null,
    databaseName,
  }
}

function buildTargetUrl(adminUrl, databaseName) {
  try {
    const url = new URL(adminUrl)
    url.pathname = `/${databaseName}`
    return url.toString()
  } catch {
    return null
  }
}

function parseTarget(value, source) {
  if (!value) {
    return {
      provided: false,
      source,
      parseable: false,
      protocolAllowed: false,
      hostClass: "missing",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
    }
  }

  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    const databaseName = url.pathname.replace(/^\//, "")
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
    const hostClass = localHosts.has(hostname) ? "local" : "remote"
    const protocolAllowed = url.protocol === "postgresql:" || url.protocol === "postgres:"
    const databaseNameHasProofMarker = PROOF_MARKER_RE.test(databaseName)
    const databaseNameLooksValuable = VALUABLE_NAME_RE.test(databaseName) && !databaseNameHasProofMarker

    return {
      provided: true,
      source,
      parseable: true,
      protocolAllowed,
      hostClass,
      databaseNameHasProofMarker,
      databaseNameLooksValuable,
    }
  } catch {
    return {
      provided: true,
      source,
      parseable: false,
      protocolAllowed: false,
      hostClass: "unknown",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
    }
  }
}

function validateDatabaseName(databaseName) {
  return /^[a-z][a-z0-9_]{0,62}$/.test(databaseName)
}

function buildSafety(args, input, targetInfo) {
  const missing = []
  const warnings = []
  const targetSafe =
    targetInfo.provided &&
    targetInfo.parseable &&
    targetInfo.protocolAllowed &&
    targetInfo.hostClass === "local" &&
    targetInfo.databaseNameHasProofMarker &&
    !targetInfo.databaseNameLooksValuable
  const databaseNameValid = validateDatabaseName(input.databaseName)

  if (!targetInfo.provided) missing.push("No local disposable target URL or local admin URL was provided.")
  if (targetInfo.provided && !targetInfo.parseable) missing.push("Selected target URL is not parseable.")
  if (targetInfo.provided && !targetInfo.protocolAllowed) missing.push("Selected target must use postgres:// or postgresql://.")
  if (targetInfo.provided && targetInfo.hostClass !== "local") missing.push("Selected target must be local: localhost, 127.0.0.1, or ::1.")
  if (targetInfo.provided && !targetInfo.databaseNameHasProofMarker) {
    missing.push("Selected target database name must contain a Work proof/disposable marker.")
  }
  if (targetInfo.databaseNameLooksValuable) {
    missing.push("Selected target database name looks valuable or production-like.")
  }
  if (input.kind === "admin_create_or_identify" && !databaseNameValid) {
    missing.push("Target database name must match /^[a-z][a-z0-9_]{0,62}$/ before CREATE DATABASE is allowed.")
  }
  if (input.kind === "database_url_fallback") {
    warnings.push("DATABASE_URL fallback was explicitly selected; this helper still requires local host and a proof-marker database name.")
  }
  if (args.run && input.kind === "admin_create_or_identify" && !args.createDatabase) {
    warnings.push("A local admin URL was provided, but --create-database was not set; the helper will not create a target.")
  }
  if (args.createDatabase && !args.setup) {
    warnings.push("--create-database will pass --setup to the WORK-009 harness so the new disposable DB receives migrations.")
  }

  return {
    targetSafe,
    databaseNameValid,
    missing,
    warnings,
    doesNotUseDatabaseUrlSilently: !(!args.useDatabaseUrl && input.source === "DATABASE_URL"),
    doesNotAllowRemoteTargets: true,
    requiresProofMarker: true,
    injectsConfirmationOnlyIntoChildProcess: true,
  }
}

function buildReadinessPayload(args, input, targetInfo, safety) {
  const canRunLocalProof = safety.targetSafe && safety.databaseNameValid
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "WORK-011",
    mode: "dry_run",
    status: canRunLocalProof ? "ready_for_local_disposable_run" : "needs_local_target",
    canRunLocalProof,
    target: publicTarget(input, targetInfo),
    databaseCreation: {
      available: input.kind === "admin_create_or_identify",
      requested: args.createDatabase,
      performed: false,
    },
    safety: publicSafety(safety),
    plannedChildProcess: {
      command: "pnpm work:proof -- --run --json",
      setup: args.setup || args.createDatabase,
      proofOut: args.proofOut,
      writesOnlyInsideChildProcess: true,
    },
    nextActions: canRunLocalProof
      ? [
          "Run pnpm work:proof:local-disposable -- --run with the same local disposable target.",
          "Add --setup when the target is empty or newly created.",
          "Inspect the generated child proof packet for status=passed and cleanup.cleanup=passed.",
        ]
      : [
          "Provide --target-url or WORK_PROOF_LOCAL_TARGET_URL pointing to a local disposable PostgreSQL database whose name contains personal_os_work_proof or work_proof.",
          "Or provide --admin-url / WORK_PROOF_LOCAL_ADMIN_DATABASE_URL and run with --run --create-database --setup to create a local proof database.",
          "Do not use DATABASE_URL unless you pass --use-database-url and it is explicitly local, disposable, and proof-marked.",
        ],
  }
}

function publicTarget(input, targetInfo) {
  return {
    inputKind: input.kind,
    source: input.source,
    provided: targetInfo.provided,
    parseable: targetInfo.parseable,
    protocolAllowed: targetInfo.protocolAllowed,
    hostClass: targetInfo.hostClass,
    databaseNameHasProofMarker: targetInfo.databaseNameHasProofMarker,
    databaseNameLooksValuable: targetInfo.databaseNameLooksValuable,
  }
}

function publicSafety(safety) {
  return {
    targetSafe: safety.targetSafe,
    missing: safety.missing,
    warnings: safety.warnings,
    doesNotUseDatabaseUrlSilently: safety.doesNotUseDatabaseUrlSilently,
    doesNotAllowRemoteTargets: safety.doesNotAllowRemoteTargets,
    requiresProofMarker: safety.requiresProofMarker,
    injectsConfirmationOnlyIntoChildProcess: safety.injectsConfirmationOnlyIntoChildProcess,
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
  }
}

function publicError(error, input) {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : null
  const name = error instanceof Error && error.name ? error.name : "Error"

  let category = "local_disposable_proof_failed"
  if (input.kind === "admin_create_or_identify") {
    category = "local_admin_database_unreachable_or_rejected"
  } else if (input.kind === "existing_target" || input.kind === "database_url_fallback") {
    category = "local_proof_target_unreachable_or_rejected"
  }

  return {
    category,
    name,
    code,
    messageRedacted: true,
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
      "raw error messages that may contain connection details",
    ],
  }
}

function buildRunFailurePayload(args, input, targetInfo, safety, error) {
  const base = buildReadinessPayload(args, input, targetInfo, safety)
  return {
    ...base,
    mode: "run",
    status: "failed",
    canRunLocalProof: false,
    databaseCreation: {
      ...base.databaseCreation,
      requested: args.createDatabase,
      performed: false,
      alreadyExisted: false,
    },
    childProof: {
      command: args.setup || args.createDatabase ? "pnpm work:proof -- --setup --run --json" : "pnpm work:proof -- --run --json",
      exitCode: null,
      proofOut: args.proofOut,
      outputCapturedButNotEmbedded: true,
      started: false,
    },
    failure: publicError(error, input),
    nextActions: [
      "Inspect whether a local PostgreSQL server is running and accepts a local admin connection.",
      "Rerun with --run --create-database --admin-url pointing to a local disposable admin database, or provide --target-url for an existing local proof-marker database.",
      "Do not retry against a valuable or remote database.",
    ],
  }
}

function quoteIdentifier(name) {
  return `"${name.replace(/"/g, '""')}"`
}

async function ensureDatabase(adminUrl, databaseName) {
  const client = new Client({ connectionString: adminUrl })
  await client.connect()

  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1 LIMIT 1", [databaseName])
    if (existing.rowCount > 0) {
      return { performed: false, alreadyExisted: true }
    }

    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`)
    return { performed: true, alreadyExisted: false }
  } finally {
    await client.end()
  }
}

function runHarness(targetUrl, args) {
  const commandArgs = ["work:proof", "--", "--run", "--json", "--out", args.proofOut]
  if (args.setup || args.createDatabase) commandArgs.splice(3, 0, "--setup")

  const childEnv = {
    ...process.env,
    WORK_PROOF_DATABASE_URL: targetUrl,
    PERSONAL_OS_WORK_PROOF_ALLOW_WRITES: "1",
    PERSONAL_OS_WORK_PROOF_CONFIRM: CONFIRMATION_TEXT,
  }
  delete childEnv.PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE

  return spawnSync("pnpm", commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: childEnv,
  })
}

async function buildRunPayload(args, input, targetInfo, safety) {
  if (!safety.targetSafe || !safety.databaseNameValid) {
    process.exitCode = 1
    return {
      ...buildReadinessPayload(args, input, targetInfo, safety),
      mode: "blocked_run_preflight",
      status: "blocked",
      canRunLocalProof: false,
    }
  }

  const databaseCreation = {
    available: input.kind === "admin_create_or_identify",
    requested: args.createDatabase,
    performed: false,
    alreadyExisted: false,
  }

  if (args.createDatabase) {
    if (!input.adminUrl) {
      throw new Error("--create-database requires a local --admin-url or WORK_PROOF_LOCAL_ADMIN_DATABASE_URL")
    }
    const result = await ensureDatabase(input.adminUrl, input.databaseName)
    databaseCreation.performed = result.performed
    databaseCreation.alreadyExisted = result.alreadyExisted
  }

  const child = runHarness(input.targetUrl, args)
  if (child.error) throw child.error
  if (child.status !== 0) process.exitCode = child.status ?? 1

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "WORK-011",
    mode: "run",
    status: child.status === 0 ? "passed" : "failed",
    canRunLocalProof: child.status === 0,
    target: publicTarget(input, targetInfo),
    databaseCreation,
    childProof: {
      command: args.setup || args.createDatabase ? "pnpm work:proof -- --setup --run --json" : "pnpm work:proof -- --run --json",
      exitCode: child.status,
      proofOut: args.proofOut,
      outputCapturedButNotEmbedded: true,
    },
    safety: publicSafety(safety),
    nextActions:
      child.status === 0
        ? [
            "Inspect the child proof packet for status=passed, refresh markers, and cleanup.cleanup=passed.",
            "Use the child proof packet as WORK-009 evidence only if it reports status=passed.",
          ]
        : [
            "Inspect the child proof packet or rerun with a disposable local database after resolving schema/connectivity errors.",
            "Do not retry against a valuable or remote database.",
          ],
  }
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(payload) {
  console.log("Personal OS local disposable Work proof bootstrap")
  console.log(`Mode: ${payload.mode}`)
  console.log(`Status: ${payload.status}`)
  console.log(`Can run local proof: ${payload.canRunLocalProof}`)
  console.log(`Generated at: ${payload.generatedAt}`)
  console.log("")
  console.log("Target:")
  console.log(`- source: ${payload.target.source}`)
  console.log(`- input kind: ${payload.target.inputKind}`)
  console.log(`- provided: ${payload.target.provided}`)
  console.log(`- parseable: ${payload.target.parseable}`)
  console.log(`- host class: ${payload.target.hostClass}`)
  console.log(`- proof marker: ${payload.target.databaseNameHasProofMarker}`)
  console.log(`- valuable-looking name: ${payload.target.databaseNameLooksValuable}`)
  console.log("")
  console.log("Safety:")
  console.log(`- target safe: ${payload.safety.targetSafe}`)
  console.log(`- prints secrets: ${payload.safety.printsSecrets}`)
  console.log(`- uses DATABASE_URL silently: ${!payload.safety.doesNotUseDatabaseUrlSilently}`)

  if (payload.safety.missing.length > 0) {
    console.log("")
    console.log("Missing:")
    for (const item of payload.safety.missing) console.log(`- ${item}`)
  }

  if (payload.safety.warnings.length > 0) {
    console.log("")
    console.log("Warnings:")
    for (const item of payload.safety.warnings) console.log(`- ${item}`)
  }

  console.log("")
  console.log("Next actions:")
  for (const item of payload.nextActions) console.log(`- ${item}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const input = selectedInput(args)
  const targetInfo = parseTarget(input.targetUrl, input.source)
  const safety = buildSafety(args, input, targetInfo)

  let payload
  try {
    payload = args.run
      ? await buildRunPayload(args, input, targetInfo, safety)
      : buildReadinessPayload(args, input, targetInfo, safety)
  } catch (error) {
    process.exitCode = 1
    payload = buildRunFailurePayload(args, input, targetInfo, safety, error)
  }

  writeOut(args.out, payload)

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(payload)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
