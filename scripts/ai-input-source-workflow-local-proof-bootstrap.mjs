#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { config } from "dotenv"

const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
const DEFAULT_OUT =
  "docs/2_agent-input/generated/agent-loop/ai-input-source-workflow-proof/latest-local-proof-bootstrap.json"
const DEFAULT_CHILD_PROOF_OUT =
  "docs/2_agent-input/generated/agent-loop/ai-input-source-workflow-proof/latest-local-proof-runner.json"
const PROOF_MARKER_RE =
  /ai[_-]?input[_-]?proof|source[_-]?workflow[_-]?proof|personal[_-]?os[_-]?ai[_-]?input[_-]?proof|disposable|scratch|test|local|tmp/i
const VALUABLE_NAME_RE = /prod|production|primary|main|launch|supabase|live|real|owner|personal[_-]?os/i

config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

function parseArgs(argv) {
  const args = {
    run: false,
    dryRun: false,
    json: false,
    useDatabaseUrl: false,
    targetUrl: null,
    out: DEFAULT_OUT,
    proofOut: DEFAULT_CHILD_PROOF_OUT,
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
    } else if (arg === "--use-database-url") {
      args.useDatabaseUrl = true
    } else if (arg === "--target-url") {
      args.targetUrl = requiredValue(filteredArgs, index, "--target-url")
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
  console.log("Bootstrap an owner-run AI Input Source Workflow proof safely.")
  console.log("")
  console.log("Dry-run readiness, no DB connection and no DB writes:")
  console.log("  pnpm ai-input:proof-local")
  console.log("  pnpm ai-input:proof-local -- --json")
  console.log("")
  console.log("Run the existing dry-run-first proof runner as a child process:")
  console.log("  pnpm ai-input:proof-local -- --run --target-url postgresql://localhost:5432/personal_os_ai_input_proof")
  console.log("")
  console.log("Optional env inputs:")
  console.log("  AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL")
  console.log("  AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL")
  console.log("  PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1")
  console.log(`  PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=${CONFIRMATION_TEXT}`)
  console.log("  PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1 only for approved disposable remote targets")
  console.log("")
  console.log("This helper never silently uses DATABASE_URL. Use --use-database-url only for an explicit disposable proof target.")
}

function selectedInput(args) {
  const explicitTarget =
    args.targetUrl ??
    process.env.AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL ??
    process.env.AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL ??
    null

  if (explicitTarget) {
    return {
      kind: "explicit_target",
      source: args.targetUrl
        ? "--target-url"
        : process.env.AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL
          ? "AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL"
          : "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
      targetUrl: explicitTarget,
    }
  }

  if (args.useDatabaseUrl && process.env.DATABASE_URL) {
    return {
      kind: "database_url_explicit_fallback",
      source: "DATABASE_URL",
      targetUrl: process.env.DATABASE_URL,
    }
  }

  return {
    kind: "missing",
    source: "none",
    targetUrl: null,
  }
}

function classifyTarget(input) {
  if (!input.targetUrl) {
    return {
      provided: false,
      source: input.source,
      parseable: false,
      protocolAllowed: false,
      hostClass: "missing",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
      remoteOverrideAccepted: false,
      targetUrlRedacted: true,
      hostRedacted: true,
    }
  }

  try {
    const url = new URL(input.targetUrl)
    const hostname = url.hostname.toLowerCase()
    const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""))
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
    const hostClass = localHosts.has(hostname) ? "local" : "remote"
    const protocolAllowed = url.protocol === "postgres:" || url.protocol === "postgresql:"
    const databaseNameHasProofMarker = PROOF_MARKER_RE.test(databaseName)
    const databaseNameLooksValuable = VALUABLE_NAME_RE.test(databaseName) && !databaseNameHasProofMarker
    const remoteOverrideAccepted =
      hostClass === "remote" &&
      process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE === "1" &&
      process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES === "1" &&
      process.env.PERSONAL_OS_AI_INPUT_PROOF_CONFIRM === CONFIRMATION_TEXT

    return {
      provided: true,
      source: input.source,
      parseable: true,
      protocolAllowed,
      hostClass,
      databaseNameHasProofMarker,
      databaseNameLooksValuable,
      remoteOverrideAccepted,
      targetUrlRedacted: true,
      hostRedacted: true,
    }
  } catch {
    return {
      provided: true,
      source: input.source,
      parseable: false,
      protocolAllowed: false,
      hostClass: "unknown",
      databaseNameHasProofMarker: false,
      databaseNameLooksValuable: false,
      remoteOverrideAccepted: false,
      targetUrlRedacted: true,
      hostRedacted: true,
    }
  }
}

function buildSafety(args, input, targetInfo) {
  const missing = []
  const warnings = []
  const hasAllowWrites = process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES === "1"
  const hasConfirmation = process.env.PERSONAL_OS_AI_INPUT_PROOF_CONFIRM === CONFIRMATION_TEXT
  const isLocalTarget = targetInfo.hostClass === "local"
  const isApprovedRemote = targetInfo.hostClass === "remote" && targetInfo.remoteOverrideAccepted
  const targetSafe =
    targetInfo.provided &&
    targetInfo.parseable &&
    targetInfo.protocolAllowed &&
    (isLocalTarget || isApprovedRemote) &&
    targetInfo.databaseNameHasProofMarker &&
    !targetInfo.databaseNameLooksValuable

  if (!targetInfo.provided) {
    missing.push("No explicit Source Workflow proof target URL was provided.")
  }
  if (targetInfo.provided && !targetInfo.parseable) {
    missing.push("Selected proof target URL is not parseable.")
  }
  if (targetInfo.provided && !targetInfo.protocolAllowed) {
    missing.push("Selected proof target must use postgres:// or postgresql://.")
  }
  if (targetInfo.provided && targetInfo.hostClass === "remote" && !targetInfo.remoteOverrideAccepted) {
    missing.push(
      "Remote proof targets require PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1 plus write confirmations and must be disposable.",
    )
  }
  if (targetInfo.provided && targetInfo.hostClass !== "local" && targetInfo.hostClass !== "remote") {
    missing.push("Selected proof target host could not be classified as local or remote.")
  }
  if (targetInfo.provided && !targetInfo.databaseNameHasProofMarker) {
    missing.push("Selected proof database name must contain an AI Input/source workflow disposable marker.")
  }
  if (targetInfo.databaseNameLooksValuable) {
    missing.push("Selected proof database name looks valuable or production-like.")
  }
  if (args.run && !hasAllowWrites) {
    missing.push("PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1 is missing for child proof run.")
  }
  if (args.run && !hasConfirmation) {
    missing.push(`PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=${CONFIRMATION_TEXT} is missing for child proof run.`)
  }
  if (input.kind === "database_url_explicit_fallback") {
    warnings.push("DATABASE_URL fallback was explicitly selected; it still must be disposable and proof-marked.")
  }
  if (targetInfo.hostClass === "remote" && targetInfo.remoteOverrideAccepted) {
    warnings.push("Remote disposable override is present; confirm this is not a valuable launch database.")
  }

  return {
    targetSafe,
    hasAllowWrites,
    hasConfirmation,
    canRunChildProof: targetSafe && hasAllowWrites && hasConfirmation,
    missing,
    warnings,
    doesNotUseDatabaseUrlSilently: !(!args.useDatabaseUrl && input.source === "DATABASE_URL"),
    doesNotApplyMigration: true,
    doesNotPromoteMigrationDraft: true,
    doesNotWriteDatabaseByDefault: true,
    doesNotConnectToValuableDatabase: true,
    doesNotSetGlobalEnv: true,
    injectsConfirmationOnlyIntoChildProcess: true,
  }
}

function publicTarget(input, targetInfo) {
  return {
    inputKind: input.kind,
    source: targetInfo.source,
    provided: targetInfo.provided,
    parseable: targetInfo.parseable,
    protocolAllowed: targetInfo.protocolAllowed,
    hostClass: targetInfo.hostClass,
    databaseNameHasProofMarker: targetInfo.databaseNameHasProofMarker,
    databaseNameLooksValuable: targetInfo.databaseNameLooksValuable,
    remoteOverrideAccepted: targetInfo.remoteOverrideAccepted,
    targetUrlRedacted: targetInfo.targetUrlRedacted,
    hostRedacted: targetInfo.hostRedacted,
  }
}

function publicSafety(safety) {
  return {
    targetSafe: safety.targetSafe,
    canRunChildProof: safety.canRunChildProof,
    missing: safety.missing,
    warnings: safety.warnings,
    doesNotUseDatabaseUrlSilently: safety.doesNotUseDatabaseUrlSilently,
    doesNotApplyMigration: safety.doesNotApplyMigration,
    doesNotPromoteMigrationDraft: safety.doesNotPromoteMigrationDraft,
    doesNotWriteDatabaseByDefault: safety.doesNotWriteDatabaseByDefault,
    doesNotConnectToValuableDatabase: safety.doesNotConnectToValuableDatabase,
    doesNotSetGlobalEnv: safety.doesNotSetGlobalEnv,
    databaseConnectionAllowedByBootstrap: false,
    migrationApplyAllowed: false,
    runtimeWriteAllowedByBootstrap: false,
    connectorRuntimeAllowed: false,
    providerApiRuntimeAllowed: false,
    publicOutputAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
    injectsConfirmationOnlyIntoChildProcess: safety.injectsConfirmationOnlyIntoChildProcess,
    printsSecrets: false,
    excludedValues: [
      "database URLs",
      "database hosts",
      "database usernames",
      "database passwords",
      "Supabase keys",
      "tokens",
      "cookies",
      "raw auth claims",
      "profile IDs",
      "row IDs",
      "provider payloads",
      "source file bodies",
      "private source material",
      "target module final payloads",
    ],
  }
}

function plannedChildProcess(args, safety) {
  return {
    command: "pnpm ai-input:proof -- --run --json",
    proofOut: args.proofOut,
    runnableNow: safety.canRunChildProof,
    writesOnlyInsideChildProcess: true,
    environmentInjectedIntoChildOnly: {
      AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL: "redacted",
      PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES: safety.hasAllowWrites ? "1" : "missing",
      PERSONAL_OS_AI_INPUT_PROOF_CONFIRM: safety.hasConfirmation ? CONFIRMATION_TEXT : "missing",
      PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE:
        process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE === "1" ? "1" : "not_injected_unless_present",
    },
  }
}

function statusFor(args, targetInfo, safety) {
  if (!targetInfo.provided) return "needs_operator_input"
  if (!safety.targetSafe) return "refused"
  if (!safety.hasAllowWrites || !safety.hasConfirmation) return "ready_for_owner_confirmation"
  return args.run ? "ready_to_run_child_proof" : "ready_for_child_proof_run"
}

function buildReadinessPayload(args, input, targetInfo, safety) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP",
    mode: "dry_run",
    status: statusFor(args, targetInfo, safety),
    target: publicTarget(input, targetInfo),
    safety: publicSafety(safety),
    plannedChildProcess: plannedChildProcess(args, safety),
    writesExecuted: false,
    nextActions: safety.canRunChildProof
      ? [
          "Run pnpm ai-input:proof-local -- --run with the same explicit disposable target.",
          "Inspect the child proof packet; DATTR-024I still stops before database connection and writes.",
          "Do not claim Source Workflow DB persistence until a later approved runtime proof writes and cleans up rows.",
        ]
      : [
          "Provide --target-url or AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL pointing to a local/disposable proof database.",
          "Use --use-database-url only when DATABASE_URL is explicitly disposable and proof-marked.",
          "Set PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1 only for an approved proof run.",
          `Set PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=${CONFIRMATION_TEXT}.`,
          "For remote disposable targets, set PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1 only after confirming the target is not valuable.",
        ],
    sourceRefs: [
      "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
      "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
      "scripts/ai-input-source-workflow-proof-runner.mjs",
      "src/lib/contracts/ai-input-source-workflow-formal-cutover-readiness.contract.ts",
    ],
    nextTask: "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI",
    agentProtocol: {
      posture: "protected-owner/internal proof tooling only",
      externalAgentDatabaseAccessAllowed: false,
      externalRegisterable: false,
    },
  }
}

function runChildProof(input, args) {
  const commandArgs = ["ai-input:proof", "--", "--run", "--json", "--out", args.proofOut]
  const childEnv = {
    ...process.env,
    AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL: input.targetUrl,
    PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES: "1",
    PERSONAL_OS_AI_INPUT_PROOF_CONFIRM: CONFIRMATION_TEXT,
  }

  if (process.env.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE !== "1") {
    delete childEnv.PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE
  }

  return spawnSync("pnpm", commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: childEnv,
  })
}

function buildRunPayload(args, input, targetInfo, safety) {
  const base = buildReadinessPayload(args, input, targetInfo, safety)
  if (!safety.canRunChildProof) {
    process.exitCode = 1
    return {
      ...base,
      mode: "blocked_run_preflight",
      status: "blocked",
      childProof: {
        command: "pnpm ai-input:proof -- --run --json",
        exitCode: null,
        proofOut: args.proofOut,
        outputCapturedButNotEmbedded: true,
        started: false,
      },
    }
  }

  const child = runChildProof(input, args)
  if (child.error) {
    process.exitCode = 1
    return {
      ...base,
      mode: "run",
      status: "failed",
      childProof: {
        command: "pnpm ai-input:proof -- --run --json",
        exitCode: null,
        proofOut: args.proofOut,
        outputCapturedButNotEmbedded: true,
        started: false,
        errorName: child.error.name,
        errorMessageRedacted: true,
      },
    }
  }
  if (child.status !== 0) {
    process.exitCode = child.status ?? 1
  }

  return {
    ...base,
    mode: "run",
    status: child.status === 0 ? "child_proof_runner_completed" : "child_proof_runner_failed",
    childProof: {
      command: "pnpm ai-input:proof -- --run --json",
      exitCode: child.status,
      proofOut: args.proofOut,
      outputCapturedButNotEmbedded: true,
      started: true,
    },
  }
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(payload) {
  console.log("Personal OS AI Input Source Workflow local proof bootstrap")
  console.log(`Mode: ${payload.mode}`)
  console.log(`Status: ${payload.status}`)
  console.log(`Can run child proof: ${payload.safety.canRunChildProof}`)
  console.log(`Target source: ${payload.target.source}`)
  console.log(`Host class: ${payload.target.hostClass}`)
  console.log(`Generated at: ${payload.generatedAt}`)
  if (payload.safety.missing.length > 0) {
    console.log("Missing:")
    for (const item of payload.safety.missing) console.log(`- ${item}`)
  }
  if (payload.safety.warnings.length > 0) {
    console.log("Warnings:")
    for (const item of payload.safety.warnings) console.log(`- ${item}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const input = selectedInput(args)
  const targetInfo = classifyTarget(input)
  const safety = buildSafety(args, input, targetInfo)
  const payload = args.run
    ? buildRunPayload(args, input, targetInfo, safety)
    : buildReadinessPayload(args, input, targetInfo, safety)

  if (args.out) {
    writeOut(args.out, payload)
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(payload)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
