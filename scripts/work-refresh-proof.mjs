#!/usr/bin/env node

import crypto from "node:crypto"
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { config } from "dotenv"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const { Pool } = pg

config({ path: ".env.local", quiet: true })
config({ path: ".env", quiet: true })

const CONFIRMATION_TEXT = "I_UNDERSTAND_THIS_WRITES_TEST_DATA"
const DEFAULT_OUT = "docs/2_agent-input/generated/agent-loop/work-refresh-proof/latest-work-refresh-proof.json"

function parseArgs(argv) {
  const args = {
    run: false,
    setup: false,
    json: false,
    useDatabaseUrl: false,
    out: null,
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

  if (args.setup && !args.run) {
    throw new Error("--setup requires --run so setup cannot happen by accident")
  }

  return args
}

function printHelp() {
  console.log("Run the Personal OS disposable Work refresh proof")
  console.log("")
  console.log("Dry-run preflight:")
  console.log("  pnpm work:proof")
  console.log("  pnpm work:proof -- --json")
  console.log("")
  console.log("Execute against a disposable/local database:")
  console.log("  WORK_PROOF_DATABASE_URL=postgresql://... \\")
  console.log("  PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1 \\")
  console.log(`  PERSONAL_OS_WORK_PROOF_CONFIRM=${CONFIRMATION_TEXT} \\`)
  console.log("  pnpm work:proof -- --run --out docs/2_agent-input/generated/agent-loop/reports/<proof>.json")
  console.log("")
  console.log("Optional disposable setup before running:")
  console.log("  pnpm work:proof -- --run --setup")
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
    const isLocal = localHosts.has(hostname)

    return {
      provided: true,
      source: target.source,
      parseable: true,
      hostClass: isLocal ? "local" : "remote",
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

function writeSafety(args, targetInfo) {
  const reasons = []
  const writesRequested = args.run
  const hasAllowWrites = process.env.PERSONAL_OS_WORK_PROOF_ALLOW_WRITES === "1"
  const hasConfirmation = process.env.PERSONAL_OS_WORK_PROOF_CONFIRM === CONFIRMATION_TEXT
  const hasRemoteOverride = process.env.PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE === "1"
  const targetProvided = targetInfo.provided
  const targetParseable = targetInfo.parseable
  const targetIsLocal = targetInfo.hostClass === "local"
  const remoteTargetAllowed =
    targetInfo.hostClass === "remote" &&
    targetInfo.source === "WORK_PROOF_DATABASE_URL" &&
    hasRemoteOverride
  const safeTarget = targetIsLocal || remoteTargetAllowed

  if (!writesRequested) reasons.push("No --run flag was provided; dry-run only.")
  if (!targetProvided) reasons.push("No proof database URL was provided.")
  if (targetProvided && !targetParseable) reasons.push("The selected proof database URL is not parseable.")
  if (!hasAllowWrites) reasons.push("PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1 is missing.")
  if (!hasConfirmation) reasons.push(`PERSONAL_OS_WORK_PROOF_CONFIRM=${CONFIRMATION_TEXT} is missing.`)
  if (!safeTarget) {
    reasons.push("Target is not local, or remote disposable override is not explicitly enabled.")
  }

  const writesAllowed =
    writesRequested &&
    targetProvided &&
    targetParseable &&
    hasAllowWrites &&
    hasConfirmation &&
    safeTarget

  return {
    writesRequested,
    writesAllowed,
    reasons,
    requiredForRun: [
      "WORK_PROOF_DATABASE_URL or --use-database-url",
      "PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1",
      `PERSONAL_OS_WORK_PROOF_CONFIRM=${CONFIRMATION_TEXT}`,
      "local DB host, or WORK_PROOF_DATABASE_URL plus PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE=1",
    ],
  }
}

function createClient(connectionString) {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  return { prisma, pool }
}

async function closeClient(client) {
  await client.prisma.$disconnect()
  await client.pool.end()
}

function makeMarker() {
  const suffix = crypto.randomUUID().slice(0, 8)
  return `WORK-008-${new Date().toISOString().replace(/[:.]/g, "-")}-${suffix}`
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function runSetup(connectionString) {
  const result = spawnSync("pnpm", ["db:deploy"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
      DIRECT_DATABASE_URL: connectionString,
    },
  })

  if (result.error) throw result.error

  if (result.status !== 0) {
    throw new Error(`pnpm db:deploy failed with exit code ${result.status}`)
  }

  return {
    command: "pnpm db:deploy",
    status: "passed",
  }
}

async function writeProofRecords(connectionString, marker) {
  const client = createClient(connectionString)
  const profileEmail = `work-proof-${marker.toLowerCase()}@example.invalid`

  try {
    const profile = await client.prisma.profile.create({
      data: {
        email: profileEmail,
        fullName: "Work Proof Owner",
        role: "OWNER",
      },
    })

    const project = await client.prisma.project.create({
      data: {
        ownerId: profile.id,
        name: `${marker} Project`,
        clientName: "Disposable Work Proof",
        description: "Proof-only record created by scripts/work-refresh-proof.mjs.",
        status: "ACTIVE",
        phase: "EXECUTION",
        health: "WATCH",
        visibility: "INTERNAL_ONLY",
        tasksDone: 99,
        tasksTotal: 99,
      },
    })

    const task = await client.prisma.projectTask.create({
      data: {
        projectId: project.id,
        title: `${marker} Task`,
        body: "Created as TODO, then toggled to DONE for refresh proof.",
        status: "TODO",
        visibility: "INTERNAL_ONLY",
        priority: 2,
        source: "MANUAL",
      },
    })

    await client.prisma.projectTask.update({
      where: { id: task.id },
      data: {
        status: "DONE",
        completedAt: new Date(),
      },
    })

    const note = await client.prisma.projectNote.create({
      data: {
        projectId: project.id,
        title: `${marker} Note`,
        body: "Created unpinned, then pinned for refresh proof.",
        source: "INTERNAL",
        visibility: "INTERNAL_ONLY",
        origin: "MANUAL",
        isPinned: false,
      },
    })

    await client.prisma.projectNote.update({
      where: { id: note.id },
      data: { isPinned: true },
    })

    const deliverable = await client.prisma.projectDeliverable.create({
      data: {
        projectId: project.id,
        nodeType: "FILE",
        title: `${marker} Deliverable`,
        description: "Created as draft/internal, then delivered/client-visible for refresh proof.",
        status: "DRAFT",
        visibility: "INTERNAL_ONLY",
      },
    })

    await client.prisma.projectDeliverable.update({
      where: { id: deliverable.id },
      data: {
        status: "DELIVERED",
        visibility: "CLIENT_VISIBLE",
        deliveredAt: new Date(),
      },
    })

    return {
      profileEmail,
      marker,
      writeCounts: {
        profiles: 1,
        projects: 1,
        tasks: 1,
        notes: 1,
        deliverables: 1,
      },
    }
  } catch (error) {
    await client.prisma.profile.deleteMany({ where: { email: profileEmail } }).catch(() => null)
    throw error
  } finally {
    await closeClient(client)
  }
}

async function readAndVerifyRefresh(connectionString, marker) {
  const client = createClient(connectionString)

  try {
    const project = await client.prisma.project.findFirst({
      where: { name: `${marker} Project` },
      include: {
        tasks: true,
        notes: true,
        deliverables: true,
      },
    })

    assert(project, "Proof project was not found after reconnect.")

    const doneTasks = project.tasks.filter((task) => task.status === "DONE")
    const pinnedNotes = project.notes.filter((note) => note.isPinned)
    const deliveredFiles = project.deliverables.filter(
      (deliverable) =>
        deliverable.nodeType === "FILE" &&
        deliverable.status === "DELIVERED" &&
        deliverable.visibility === "CLIENT_VISIBLE"
    )

    assert(project.tasks.length === 1, "Expected exactly one proof task.")
    assert(doneTasks.length === 1, "Expected the proof task to refresh as DONE.")
    assert(project.notes.length === 1, "Expected exactly one proof note.")
    assert(pinnedNotes.length === 1, "Expected the proof note to refresh as pinned.")
    assert(project.deliverables.length === 1, "Expected exactly one proof deliverable.")
    assert(deliveredFiles.length === 1, "Expected the proof deliverable to refresh as delivered/client-visible.")

    return {
      refreshed: true,
      derivedProgress: {
        tasksDone: doneTasks.length,
        tasksTotal: project.tasks.length,
      },
      markersFound: {
        project: true,
        doneTask: true,
        pinnedNote: true,
        deliveredClientVisibleFile: true,
      },
    }
  } finally {
    await closeClient(client)
  }
}

async function cleanupProofRecords(connectionString, profileEmail, marker) {
  const client = createClient(connectionString)

  try {
    await client.prisma.profile.deleteMany({
      where: { email: profileEmail },
    })

    const remaining = {
      profiles: await client.prisma.profile.count({ where: { email: profileEmail } }),
      projects: await client.prisma.project.count({ where: { name: `${marker} Project` } }),
      tasks: await client.prisma.projectTask.count({ where: { title: `${marker} Task` } }),
      notes: await client.prisma.projectNote.count({ where: { title: `${marker} Note` } }),
      deliverables: await client.prisma.projectDeliverable.count({ where: { title: `${marker} Deliverable` } }),
    }

    assert(
      Object.values(remaining).every((count) => count === 0),
      "Cleanup left proof records behind."
    )

    return {
      cleanup: "passed",
      remaining,
    }
  } finally {
    await closeClient(client)
  }
}

async function runProof(target, args) {
  const marker = makeMarker()
  const setup = args.setup ? await runSetup(target.value) : null
  const written = await writeProofRecords(target.value, marker)

  try {
    const refresh = await readAndVerifyRefresh(target.value, marker)
    const cleanup = await cleanupProofRecords(target.value, written.profileEmail, marker)

    return {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      mode: "run",
      status: "passed",
      secretPolicy: {
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
      target: {
        source: target.source,
      },
      setup,
      marker,
      writeCounts: written.writeCounts,
      refresh,
      cleanup,
    }
  } catch (error) {
    await cleanupProofRecords(target.value, written.profileEmail, marker).catch(() => null)
    throw error
  }
}

function buildPreflight(args, target, targetInfo, safety) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: args.run ? "blocked_run_preflight" : "dry_run",
    status: args.run && !safety.writesAllowed ? "blocked" : "ready_for_review",
    target: {
      provided: targetInfo.provided,
      source: target.source,
      parseable: targetInfo.parseable,
      hostClass: targetInfo.hostClass,
      databaseNameHasProofMarker: targetInfo.databaseNameHasProofMarker,
    },
    safety,
    plannedProof: {
      createsProofOnlyProfile: true,
      createsProofOnlyProject: true,
      createsTaskThenReadsDoneAfterReconnect: true,
      createsNoteThenReadsPinnedAfterReconnect: true,
      createsDeliverableThenReadsDeliveredClientVisibleAfterReconnect: true,
      verifiesDerivedProgressFromTaskRows: true,
      deletesProofOnlyProfileAndCascadedRecords: true,
      doesNotPrintDatabaseUrlOrHost: true,
    },
  }
}

function writeOut(path, payload) {
  const outPath = resolve(process.cwd(), path)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`)
}

function printHuman(payload) {
  console.log("Personal OS Work refresh proof")
  console.log(`Mode: ${payload.mode}`)
  console.log(`Status: ${payload.status}`)
  console.log(`Generated at: ${payload.generatedAt}`)
  console.log("")

  if (payload.mode === "run") {
    console.log("Proof result:")
    console.log(`- marker: ${payload.marker}`)
    console.log(`- derived progress: ${payload.refresh.derivedProgress.tasksDone}/${payload.refresh.derivedProgress.tasksTotal}`)
    console.log(`- cleanup: ${payload.cleanup.cleanup}`)
    return
  }

  console.log("Target:")
  console.log(`- source: ${payload.target.source}`)
  console.log(`- provided: ${payload.target.provided}`)
  console.log(`- parseable: ${payload.target.parseable}`)
  console.log(`- host class: ${payload.target.hostClass}`)
  console.log("")
  console.log("Safety:")
  console.log(`- writes requested: ${payload.safety.writesRequested}`)
  console.log(`- writes allowed: ${payload.safety.writesAllowed}`)

  for (const reason of payload.safety.reasons) {
    console.log(`- ${reason}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const target = selectedTarget(args)
  const targetInfo = classifyTarget(target)
  const safety = writeSafety(args, targetInfo)

  let payload

  if (args.run) {
    if (!safety.writesAllowed) {
      payload = buildPreflight(args, target, targetInfo, safety)
      process.exitCode = 1
    } else {
      payload = await runProof(target, args)
    }
  } else {
    payload = buildPreflight(args, target, targetInfo, safety)
  }

  if (args.out || payload.mode === "run") {
    writeOut(args.out ?? DEFAULT_OUT, payload)
  }

  if (args.json) {
    console.log(JSON.stringify(payload, null, 2))
  } else {
    printHuman(payload)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
