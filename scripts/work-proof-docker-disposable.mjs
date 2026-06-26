#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const DEFAULT_OUT =
  "docs/2_agent-input/generated/agent-loop/work-refresh-proof/latest-docker-disposable-bootstrap.json"
const DEFAULT_HELPER_OUT =
  "docs/2_agent-input/generated/agent-loop/work-refresh-proof/latest-docker-disposable-local-bootstrap.json"
const DEFAULT_PROOF_OUT =
  "docs/2_agent-input/generated/agent-loop/work-refresh-proof/latest-docker-disposable-work-proof.json"
const DEFAULT_IMAGE = "postgres:16-alpine"
const DEFAULT_CONTAINER_NAME = "personal-os-work-proof-postgres"
const DEFAULT_DATABASE_NAME = "personal_os_work_proof"
const DEFAULT_USER = "postgres"
const DEFAULT_PASSWORD = "personal_os_work_proof_password"
const DEFAULT_PORT = "15432"
const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
const PROOF_MARKER_RE = /personal[_-]?os[_-]?work[_-]?proof|work[_-]?proof|disposable|scratch|tmp/i
const VALUABLE_NAME_RE = /prod|production|primary|main|launch|supabase|live|real|owner/i

function parseArgs(argv) {
  const args = {
    run: false,
    setup: false,
    json: false,
    keepContainer: false,
    image: DEFAULT_IMAGE,
    containerName: DEFAULT_CONTAINER_NAME,
    databaseName: DEFAULT_DATABASE_NAME,
    user: DEFAULT_USER,
    password: DEFAULT_PASSWORD,
    port: DEFAULT_PORT,
    out: DEFAULT_OUT,
    helperOut: DEFAULT_HELPER_OUT,
    proofOut: DEFAULT_PROOF_OUT,
    targetUrl: null,
    help: false,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--run") {
      args.run = true
    } else if (arg === "--setup") {
      args.setup = true
    } else if (arg === "--json") {
      args.json = true
    } else if (arg === "--keep-container") {
      args.keepContainer = true
    } else if (arg === "--image") {
      args.image = requiredValue(filteredArgs, index, "--image")
      index += 1
    } else if (arg === "--container-name") {
      args.containerName = requiredValue(filteredArgs, index, "--container-name")
      index += 1
    } else if (arg === "--database-name") {
      args.databaseName = requiredValue(filteredArgs, index, "--database-name")
      index += 1
    } else if (arg === "--user") {
      args.user = requiredValue(filteredArgs, index, "--user")
      index += 1
    } else if (arg === "--password") {
      args.password = requiredValue(filteredArgs, index, "--password")
      index += 1
    } else if (arg === "--port") {
      args.port = requiredValue(filteredArgs, index, "--port")
      index += 1
    } else if (arg === "--out") {
      args.out = requiredValue(filteredArgs, index, "--out")
      index += 1
    } else if (arg === "--helper-out") {
      args.helperOut = requiredValue(filteredArgs, index, "--helper-out")
      index += 1
    } else if (arg === "--proof-out") {
      args.proofOut = requiredValue(filteredArgs, index, "--proof-out")
      index += 1
    } else if (arg === "--target-url") {
      args.targetUrl = requiredValue(filteredArgs, index, "--target-url")
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (args.setup && !args.run) {
    throw new Error("--setup requires --run so migrations cannot happen during dry-run")
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
  console.log("Bootstrap a local Docker PostgreSQL target and run the disposable Work proof harness")
  console.log("")
  console.log("Dry-run readiness and Docker daemon probe, no DB writes:")
  console.log("  pnpm work:proof:docker-disposable")
  console.log("  pnpm work:proof:docker-disposable -- --json")
  console.log("")
  console.log("Run against a Docker-created local disposable PostgreSQL target:")
  console.log("  pnpm work:proof:docker-disposable -- --run --setup")
  console.log("")
  console.log("Optional output packets:")
  console.log("  --out docs/2_agent-input/generated/agent-loop/reports/<docker-bootstrap>.json")
  console.log("  --helper-out docs/2_agent-input/generated/agent-loop/reports/<local-helper>.json")
  console.log("  --proof-out docs/2_agent-input/generated/agent-loop/reports/<work-proof>.json")
  console.log("")
  console.log("This helper does not accept external target URLs. Use work:proof:local-disposable for existing local targets.")
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...options,
  })
}

function probeDocker() {
  const version = run("docker", ["--version"])

  if (version.error) {
    return {
      cliAvailable: false,
      daemonAvailable: false,
      errorCategory: version.error.code === "ENOENT" ? "docker_cli_missing" : "docker_cli_unavailable",
      versionChecked: false,
      daemonChecked: false,
    }
  }

  const info = run("docker", ["info", "--format", "{{.ServerVersion}}"])

  return {
    cliAvailable: version.status === 0,
    daemonAvailable: info.status === 0,
    errorCategory: info.status === 0 ? null : "docker_daemon_unavailable",
    versionChecked: true,
    daemonChecked: true,
  }
}

function classifyExternalTarget(targetUrl) {
  if (!targetUrl) {
    return {
      provided: false,
      parseable: false,
      hostClass: "none",
      protocolAllowed: false,
    }
  }

  try {
    const url = new URL(targetUrl)
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"])
    return {
      provided: true,
      parseable: true,
      hostClass: localHosts.has(url.hostname.toLowerCase()) ? "local" : "remote",
      protocolAllowed: url.protocol === "postgres:" || url.protocol === "postgresql:",
    }
  } catch {
    return {
      provided: true,
      parseable: false,
      hostClass: "unknown",
      protocolAllowed: false,
    }
  }
}

function buildSafety(args, externalTarget) {
  const missing = []
  const warnings = []
  const databaseNameValid = /^[a-z][a-z0-9_]{0,62}$/.test(args.databaseName)
  const databaseNameHasProofMarker = PROOF_MARKER_RE.test(args.databaseName)
  const databaseNameLooksValuable = VALUABLE_NAME_RE.test(args.databaseName) && !databaseNameHasProofMarker
  const containerNameHasProofMarker = PROOF_MARKER_RE.test(args.containerName)
  const portValid = /^[1-9][0-9]{1,4}$/.test(String(args.port)) && Number(args.port) <= 65535

  if (externalTarget.provided) {
    missing.push("This Docker helper refuses --target-url. Use pnpm work:proof:local-disposable for existing local targets.")
  }
  if (!databaseNameValid) missing.push("Docker proof database name must match /^[a-z][a-z0-9_]{0,62}$/.")
  if (!databaseNameHasProofMarker) missing.push("Docker proof database name must contain a Work proof/disposable marker.")
  if (databaseNameLooksValuable) missing.push("Docker proof database name looks valuable or production-like.")
  if (!containerNameHasProofMarker) warnings.push("Docker container name should contain a Work proof/disposable marker.")
  if (!portValid) missing.push("Docker host port must be a valid TCP port.")

  return {
    targetSafe: missing.length === 0,
    databaseNameValid,
    databaseNameHasProofMarker,
    databaseNameLooksValuable,
    containerNameHasProofMarker,
    portValid,
    missing,
    warnings,
    createsOnlyLocalDockerTarget: true,
    refusesExternalTargetUrls: true,
    doesNotUseDatabaseUrlSilently: true,
    requiresProofMarker: true,
    injectsConfirmationOnlyIntoChildProcess: true,
  }
}

function publicDocker(args, docker) {
  return {
    cliAvailable: docker.cliAvailable,
    daemonAvailable: docker.daemonAvailable,
    errorCategory: docker.errorCategory,
    imageSource: args.image === DEFAULT_IMAGE ? "default_postgres_16_alpine" : "custom_image_redacted",
    imageWasCustomized: args.image !== DEFAULT_IMAGE,
    containerNameHasProofMarker: PROOF_MARKER_RE.test(args.containerName),
    requestedPort: String(args.port),
  }
}

function publicTarget(args, externalTarget, safety) {
  return {
    inputKind: externalTarget.provided ? "refused_external_target_url" : "docker_local_container",
    hostClass: externalTarget.provided ? externalTarget.hostClass : "local",
    externalTargetProvided: externalTarget.provided,
    externalTargetParseable: externalTarget.parseable,
    externalTargetProtocolAllowed: externalTarget.protocolAllowed,
    databaseNameHasProofMarker: safety.databaseNameHasProofMarker,
    databaseNameLooksValuable: safety.databaseNameLooksValuable,
    targetUrlRedacted: true,
    hostRedacted: true,
  }
}

function publicSafety(safety) {
  return {
    targetSafe: safety.targetSafe,
    missing: safety.missing,
    warnings: safety.warnings,
    createsOnlyLocalDockerTarget: safety.createsOnlyLocalDockerTarget,
    refusesExternalTargetUrls: safety.refusesExternalTargetUrls,
    doesNotUseDatabaseUrlSilently: safety.doesNotUseDatabaseUrlSilently,
    requiresProofMarker: safety.requiresProofMarker,
    injectsConfirmationOnlyIntoChildProcess: safety.injectsConfirmationOnlyIntoChildProcess,
    printsSecrets: false,
    excludedValues: [
      "database URLs",
      "database hosts",
      "database passwords",
      "Docker socket paths",
      "profile IDs",
      "project IDs",
      "task IDs",
      "note IDs",
      "deliverable IDs",
      "tokens",
      "cookies",
      "raw Docker stderr",
    ],
  }
}

function buildReadinessPayload(args, docker, externalTarget, safety) {
  const canRunDockerProof = safety.targetSafe && docker.cliAvailable && docker.daemonAvailable
  let status = "ready_for_docker_disposable_run"

  if (!safety.targetSafe) {
    status = "blocked"
  } else if (!docker.cliAvailable) {
    status = "docker_cli_missing"
  } else if (!docker.daemonAvailable) {
    status = "docker_daemon_unavailable"
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "WORK-012",
    mode: "dry_run",
    status,
    canRunDockerProof,
    docker: publicDocker(args, docker),
    target: publicTarget(args, externalTarget, safety),
    plannedChildProcess: {
      command: args.setup
        ? "pnpm work:proof:local-disposable -- --run --setup"
        : "pnpm work:proof:local-disposable -- --run",
      setup: args.setup,
      helperOut: args.helperOut,
      proofOut: args.proofOut,
      writesOnlyInsideChildProcess: true,
      confirmationTextInjectedIntoChildOnly: true,
    },
    safety: publicSafety(safety),
    nextActions: nextActionsForStatus(status),
  }
}

function nextActionsForStatus(status) {
  if (status === "ready_for_docker_disposable_run") {
    return [
      "Run pnpm work:proof:docker-disposable -- --run --setup with the same output paths.",
      "Inspect the child proof packet for status=passed and cleanup.cleanup=passed before claiming WORK-009 evidence.",
    ]
  }

  if (status === "docker_daemon_unavailable") {
    return [
      "Start Docker Desktop or the local Docker daemon.",
      "Rerun pnpm work:proof:docker-disposable -- --run --setup after the daemon is reachable.",
      "Do not retry WORK-009 against a valuable or remote database.",
    ]
  }

  if (status === "docker_cli_missing") {
    return [
      "Install or expose the Docker CLI, or use pnpm work:proof:local-disposable with an existing local proof database.",
      "Do not retry WORK-009 against a valuable or remote database.",
    ]
  }

  return [
    "Use this helper without --target-url so it can create its own local Docker target.",
    "Keep the database name proof-marked and non-valuable.",
    "Use pnpm work:proof:local-disposable only for existing local disposable targets.",
  ]
}

function buildBlockedRunPayload(args, docker, externalTarget, safety) {
  const base = buildReadinessPayload(args, docker, externalTarget, safety)
  process.exitCode = 1
  return {
    ...base,
    mode: "blocked_run_preflight",
    canRunDockerProof: false,
    childProof: {
      started: false,
      command: base.plannedChildProcess.command,
      helperOut: args.helperOut,
      proofOut: args.proofOut,
      exitCode: null,
      outputCapturedButNotEmbedded: true,
    },
  }
}

function containerExists(args) {
  const result = run("docker", [
    "ps",
    "-a",
    "--filter",
    `name=^/${args.containerName}$`,
    "--format",
    "{{.Names}}",
  ])
  return result.status === 0 && result.stdout.trim().split("\n").includes(args.containerName)
}

function startContainer(args, existed) {
  if (existed) {
    return run("docker", ["start", args.containerName])
  }

  return run("docker", [
    "run",
    "--name",
    args.containerName,
    "-e",
    `POSTGRES_USER=${args.user}`,
    "-e",
    `POSTGRES_PASSWORD=${args.password}`,
    "-e",
    `POSTGRES_DB=${args.databaseName}`,
    "-p",
    `127.0.0.1:${args.port}:5432`,
    "-d",
    args.image,
  ])
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))
}

async function waitForPostgres(args) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const result = run("docker", [
      "exec",
      args.containerName,
      "pg_isready",
      "-U",
      args.user,
      "-d",
      args.databaseName,
    ])
    if (result.status === 0) return { ready: true, attempts: attempt }
    await wait(1000)
  }

  return { ready: false, attempts: 30 }
}

function stopAndRemoveContainer(args, existedBeforeRun) {
  if (args.keepContainer || existedBeforeRun) {
    return {
      attempted: false,
      removed: false,
      keptByRequest: args.keepContainer,
      skippedBecausePreExisting: existedBeforeRun,
    }
  }

  const result = run("docker", ["rm", "-f", args.containerName])
  return {
    attempted: true,
    removed: result.status === 0,
    exitCode: result.status,
  }
}

function buildTargetUrl(args) {
  const url = new URL("postgresql://127.0.0.1")
  url.username = args.user
  url.password = args.password
  url.port = String(args.port)
  url.pathname = `/${args.databaseName}`
  return url.toString()
}

function runLocalDisposableHelper(args, targetUrl) {
  const commandArgs = [
    "work:proof:local-disposable",
    "--",
    "--run",
    "--out",
    args.helperOut,
    "--proof-out",
    args.proofOut,
  ]
  if (args.setup) commandArgs.splice(3, 0, "--setup")

  return run("pnpm", commandArgs, {
    env: {
      ...process.env,
      WORK_PROOF_LOCAL_TARGET_URL: targetUrl,
      PERSONAL_OS_WORK_PROOF_ALLOW_WRITES: "1",
      PERSONAL_OS_WORK_PROOF_CONFIRM: CONFIRMATION_TEXT,
    },
  })
}

function publicFailure(category, name = "Error") {
  return {
    category,
    name,
    messageRedacted: true,
    printsSecrets: false,
    excludedValues: [
      "database URLs",
      "database hosts",
      "database passwords",
      "Docker socket paths",
      "raw Docker stderr",
    ],
  }
}

async function buildRunPayload(args, docker, externalTarget, safety) {
  if (!safety.targetSafe || !docker.cliAvailable || !docker.daemonAvailable) {
    return buildBlockedRunPayload(args, docker, externalTarget, safety)
  }

  const existedBeforeRun = containerExists(args)
  const start = startContainer(args, existedBeforeRun)

  if (start.status !== 0 || start.error) {
    const cleanup = stopAndRemoveContainer(args, existedBeforeRun)
    process.exitCode = 1
    return {
      ...buildReadinessPayload(args, docker, externalTarget, safety),
      mode: "run",
      status: "failed",
      canRunDockerProof: false,
      dockerLifecycle: {
        existedBeforeRun,
        startAttempted: true,
        startExitCode: start.status,
        postgresReady: false,
        cleanup,
      },
      childProof: {
        started: false,
        command: "pnpm work:proof:local-disposable -- --run",
        helperOut: args.helperOut,
        proofOut: args.proofOut,
        exitCode: null,
        outputCapturedButNotEmbedded: true,
      },
      failure: publicFailure("docker_container_start_failed", start.error?.name),
    }
  }

  const ready = await waitForPostgres(args)

  if (!ready.ready) {
    const cleanup = stopAndRemoveContainer(args, existedBeforeRun)
    process.exitCode = 1
    return {
      ...buildReadinessPayload(args, docker, externalTarget, safety),
      mode: "run",
      status: "failed",
      canRunDockerProof: false,
      dockerLifecycle: {
        existedBeforeRun,
        startAttempted: true,
        startExitCode: start.status,
        postgresReady: false,
        readinessAttempts: ready.attempts,
        cleanup,
      },
      childProof: {
        started: false,
        command: "pnpm work:proof:local-disposable -- --run",
        helperOut: args.helperOut,
        proofOut: args.proofOut,
        exitCode: null,
        outputCapturedButNotEmbedded: true,
      },
      failure: publicFailure("docker_postgres_not_ready"),
    }
  }

  const child = runLocalDisposableHelper(args, buildTargetUrl(args))
  const cleanup = stopAndRemoveContainer(args, existedBeforeRun)
  if (child.error) process.exitCode = 1
  if (child.status !== 0) process.exitCode = child.status ?? 1

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "WORK-012",
    mode: "run",
    status: child.status === 0 ? "passed" : "failed",
    canRunDockerProof: child.status === 0,
    docker: publicDocker(args, docker),
    target: publicTarget(args, externalTarget, safety),
    dockerLifecycle: {
      existedBeforeRun,
      startAttempted: true,
      startExitCode: start.status,
      postgresReady: true,
      readinessAttempts: ready.attempts,
      cleanup,
    },
    childProof: {
      started: true,
      command: args.setup
        ? "pnpm work:proof:local-disposable -- --run --setup"
        : "pnpm work:proof:local-disposable -- --run",
      helperOut: args.helperOut,
      proofOut: args.proofOut,
      exitCode: child.status,
      outputCapturedButNotEmbedded: true,
    },
    safety: publicSafety(safety),
    nextActions:
      child.status === 0
        ? [
            "Inspect the child Work proof packet for status=passed and cleanup.cleanup=passed.",
            "Use that child proof as WORK-009 evidence only if it reports a passing run.",
          ]
        : [
            "Inspect the local helper and child proof packets for schema, migration, or proof errors.",
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
  console.log("Personal OS Docker disposable Work proof bootstrap")
  console.log(`Mode: ${payload.mode}`)
  console.log(`Status: ${payload.status}`)
  console.log(`Can run Docker proof: ${payload.canRunDockerProof}`)
  console.log(`Generated at: ${payload.generatedAt}`)
  console.log("")
  console.log("Docker:")
  console.log(`- CLI available: ${payload.docker.cliAvailable}`)
  console.log(`- daemon available: ${payload.docker.daemonAvailable}`)
  console.log(`- image source: ${payload.docker.imageSource}`)
  console.log("")
  console.log("Target:")
  console.log(`- input kind: ${payload.target.inputKind}`)
  console.log(`- host class: ${payload.target.hostClass}`)
  console.log(`- database name has proof marker: ${payload.target.databaseNameHasProofMarker}`)
  console.log(`- database name looks valuable: ${payload.target.databaseNameLooksValuable}`)
  console.log("")
  console.log("Safety:")
  console.log(`- target safe: ${payload.safety.targetSafe}`)
  console.log(`- prints secrets: ${payload.safety.printsSecrets}`)

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

  const docker = probeDocker()
  const externalTarget = classifyExternalTarget(args.targetUrl)
  const safety = buildSafety(args, externalTarget)
  const payload = args.run
    ? await buildRunPayload(args, docker, externalTarget, safety)
    : buildReadinessPayload(args, docker, externalTarget, safety)

  if (!args.run && !safety.targetSafe) process.exitCode = 1
  writeOut(args.out, payload)

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(payload)
  }
}

main().catch((error) => {
  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    taskId: "WORK-012",
    mode: "failed_before_readiness",
    status: "failed",
    canRunDockerProof: false,
    failure: publicFailure("docker_disposable_helper_failed", error instanceof Error ? error.name : "Error"),
  }
  writeOut(DEFAULT_OUT, payload)
  console.error("Docker disposable Work proof helper failed before readiness output; details were redacted.")
  process.exitCode = 1
})
