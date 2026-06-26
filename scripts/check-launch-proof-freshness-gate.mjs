#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const REPORT_DIR = "docs/2_agent-input/generated/agent-loop/reports"
const LOOP_STATE_FILE = "docs/2_agent-input/generated/agent-loop/loop-state.json"
const TASK_ID = "ENV-004-LAUNCH-PROOF-FRESHNESS-GATE"

const FILES = {
  contract: "src/lib/contracts/launch-proof-freshness-gate.contract.ts",
  script: "scripts/check-launch-proof-freshness-gate.mjs",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const REQUIREMENTS = [
  {
    family: "launch",
    evidenceLabel: "latest launch proof packet",
    pattern: /launch-proof\.json$/,
    command:
      "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-launch-proof.json",
    passSignal: "current-loop launch-proof.json exists and is parseable",
    stopCondition: "do not paste Supabase values, deployment secrets, or provider payloads into evidence",
  },
  {
    family: "auth",
    evidenceLabel: "latest auth proof packet",
    pattern: /auth-proof\.json$/,
    command:
      "pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-auth-proof.json",
    passSignal: "current-loop auth-proof.json exists and is parseable",
    stopCondition: "do not include cookies, tokens, raw claims, provider payloads, or actual email values",
  },
  {
    family: "workTarget",
    evidenceLabel: "latest Work proof target readiness packet",
    pattern: /work-proof-target-readiness\.json$/,
    command:
      "pnpm work:proof-target:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-work-proof-target-readiness.json",
    passSignal: "current-loop work-proof-target-readiness.json exists and is parseable",
    stopCondition: "do not use valuable production or client data as the proof target",
  },
  {
    family: "preemption",
    evidenceLabel: "latest launch proof preemption router packet",
    pattern: /launch-preemption-router\.json$/,
    command:
      "pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-launch-preemption-router.json",
    passSignal: "current-loop launch-preemption-router.json exists after launch/auth/Work target refresh",
    stopCondition: "do not route from stale launch/auth/Work target packets",
  },
  {
    family: "ownerPlan",
    evidenceLabel: "latest launch owner proof plan packet",
    pattern: /launch-owner-proof-plan\.json$/,
    command:
      "pnpm launch:owner-plan:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-launch-owner-proof-plan.json",
    passSignal: "current-loop launch-owner-proof-plan.json exists after current-loop preemption",
    stopCondition: "do not compile owner action plans from older router packets",
  },
]

const CONTRACT_MARKERS = [
  "LaunchProofFreshnessGateContract",
  "LAUNCH_PROOF_FRESHNESS_GATE_CONTRACT",
  TASK_ID,
  "pnpm launch:freshness:check",
  ...REQUIREMENTS.map((requirement) => requirement.family),
  "raw generated packet bodies",
]

const DOC_MARKERS = [
  TASK_ID,
  "proof freshness",
  "pnpm launch:freshness:check",
  "AUTH-005",
  "WORK-009",
  "DEPLOY-002",
]

function parseArgs(argv) {
  const args = { json: false, out: null, loop: null }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--out") {
      const value = filtered[index + 1]
      if (!value || value.startsWith("--")) throw new Error("--out requires a file path")
      args.out = value
      index += 1
      continue
    }
    if (arg === "--loop") {
      const value = Number.parseInt(filtered[index + 1] ?? "", 10)
      if (!Number.isInteger(value) || value < 1) throw new Error("--loop requires a positive integer")
      args.loop = value
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm launch:freshness:check [--json] [--out <path>] [--loop <number>]")
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function read(filePath) {
  const absolutePath = path.join(ROOT, filePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function parseJsonText(text, label, errors) {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null
  } catch (error) {
    errors.push(`${label} is not parseable JSON: ${error.message}`)
    return null
  }
}

function validateMarkers({ label, text, markers, errors }) {
  if (text === null) {
    errors.push(`${label} is missing.`)
    return
  }

  const missing = markers.filter((marker) => !text.includes(marker))
  if (missing.length > 0) errors.push(`${label} missing markers: ${missing.join(", ")}`)
}

function scanForbiddenLiterals({ label, text, errors }) {
  if (!text) return

  const forbiddenPatterns = [
    /postgres(?:ql)?:\/\/[^<"'\s]+/i,
    /sb_(?:secret|publishable)_[A-Za-z0-9_-]+/,
    /eyJ[A-Za-z0-9_-]{20,}/,
  ]

  const matches = forbiddenPatterns.filter((pattern) => pattern.test(text))
  if (matches.length > 0) errors.push(`${label} appears to contain a forbidden secret-like literal.`)
}

function listReportFiles() {
  const absoluteDir = path.join(ROOT, REPORT_DIR)
  if (!fs.existsSync(absoluteDir)) return []

  return fs
    .readdirSync(absoluteDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const absolutePath = path.join(absoluteDir, name)
      const stat = fs.statSync(absolutePath)
      return {
        name,
        path: `${REPORT_DIR}/${name}`,
        absolutePath,
        mtimeMs: stat.mtimeMs,
        loop: loopFromFileName(name),
      }
    })
    .sort((a, b) => {
      if ((b.loop ?? -1) !== (a.loop ?? -1)) return (b.loop ?? -1) - (a.loop ?? -1)
      return b.mtimeMs - a.mtimeMs
    })
}

function loopFromFileName(name) {
  const match = name.match(/personal-os-loop-(\d+)-/)
  if (!match) return null
  const value = Number.parseInt(match[1], 10)
  return Number.isInteger(value) ? value : null
}

function latestByPattern(files, pattern) {
  return files.find((file) => pattern.test(file.name)) ?? null
}

function parseReportJson(file, errors) {
  if (!file) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(file.absolutePath, "utf8"))
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null
  } catch (error) {
    errors.push(`${file.path} is not parseable JSON: ${error.message}`)
    return null
  }
}

function targetLoopFromState(explicitLoop, errors) {
  if (explicitLoop) return explicitLoop

  const loopState = parseJsonText(read(LOOP_STATE_FILE), LOOP_STATE_FILE, errors)
  const nextLoopNumber = loopState?.loopProgress?.nextLoopNumber
  if (Number.isInteger(nextLoopNumber) && nextLoopNumber > 0) return nextLoopNumber

  const currentLoop = loopState?.loopProgress?.currentLoop
  if (Number.isInteger(currentLoop) && currentLoop >= 0) return currentLoop + 1

  errors.push("Unable to determine target loop from loop-state.json.")
  return null
}

function commandForLoop(command, targetLoop) {
  return command.replace("<loop>", String(targetLoop))
}

function buildRows({ files, targetLoop, errors }) {
  return REQUIREMENTS.map((requirement) => {
    const file = latestByPattern(files, requirement.pattern)
    const payload = parseReportJson(file, errors)
    const latestLoop = file?.loop ?? null
    const missing = !file
    const stale = missing || latestLoop !== targetLoop

    return {
      family: requirement.family,
      evidenceLabel: requirement.evidenceLabel,
      latestPath: file?.path ?? null,
      latestLoop,
      requiredLoop: targetLoop,
      stale,
      currentLoopPacketFound: latestLoop === targetLoop,
      payloadStatus: typeof payload?.status === "string" ? payload.status : null,
      payloadRecommendation:
        typeof payload?.recommendation?.nextTask === "string" ? payload.recommendation.nextTask : null,
      refreshCommand: commandForLoop(requirement.command, targetLoop),
      passSignal: requirement.passSignal,
      stopCondition: requirement.stopCondition,
    }
  })
}

function validateCurrentLoopOrder(rows, errors) {
  const currentRows = rows.filter((row) => row.currentLoopPacketFound && row.latestPath)
  const currentLoopsAreMissing = currentRows.length !== REQUIREMENTS.length
  if (currentLoopsAreMissing) return []

  const orderIssues = []
  const byFamily = new Map(rows.map((row) => [row.family, row]))
  const preemption = byFamily.get("preemption")
  const ownerPlan = byFamily.get("ownerPlan")
  if (preemption?.latestPath && ownerPlan?.latestPath) {
    const preemptionStat = fs.statSync(path.join(ROOT, preemption.latestPath))
    const ownerPlanStat = fs.statSync(path.join(ROOT, ownerPlan.latestPath))
    if (ownerPlanStat.mtimeMs < preemptionStat.mtimeMs) {
      orderIssues.push("ownerPlan packet is older than the current-loop preemption router packet.")
    }
  }

  if (orderIssues.length > 0) errors.push(...orderIssues)
  return orderIssues
}

function buildResult(args) {
  const errors = []
  const targetLoop = targetLoopFromState(args.loop, errors)

  const contract = read(FILES.contract)
  const script = read(FILES.script)
  const acceptance = read(FILES.acceptance)
  const backlog = read(FILES.backlog)
  const sprint = read(FILES.sprint)
  const completedLog = read(FILES.completedLog)
  const tasks = read(FILES.tasks)
  const packageJson = read(FILES.packageJson)

  validateMarkers({ label: FILES.contract, text: contract, markers: CONTRACT_MARKERS, errors })
  validateMarkers({ label: FILES.script, text: script, markers: CONTRACT_MARKERS, errors })
  validateMarkers({ label: FILES.acceptance, text: acceptance, markers: DOC_MARKERS, errors })
  validateMarkers({ label: FILES.backlog, text: backlog, markers: DOC_MARKERS, errors })
  validateMarkers({ label: FILES.sprint, text: sprint, markers: DOC_MARKERS, errors })
  validateMarkers({ label: FILES.completedLog, text: completedLog, markers: DOC_MARKERS, errors })
  validateMarkers({ label: FILES.tasks, text: tasks, markers: DOC_MARKERS, errors })
  validateMarkers({
    label: FILES.packageJson,
    text: packageJson,
    markers: ["launch:freshness:check", "check-launch-proof-freshness-gate.mjs"],
    errors,
  })

  Object.entries({ contract, script }).forEach(([label, text]) => {
    scanForbiddenLiterals({ label, text, errors })
  })

  const files = listReportFiles()
  const rows = targetLoop ? buildRows({ files, targetLoop, errors }) : []
  const orderIssues = validateCurrentLoopOrder(rows, errors)
  const staleFamilies = rows.filter((row) => row.stale).map((row) => row.family)
  const proofRefreshRequired = staleFamilies.length > 0 || orderIssues.length > 0

  return {
    id: TASK_ID,
    status: errors.some((error) => error.includes("missing markers") || error.includes("is missing."))
      ? "failed"
      : proofRefreshRequired
        ? "proof_refresh_required"
        : "ready_for_fresh_proof_routing",
    generatedAt: new Date().toISOString(),
    command: "pnpm launch:freshness:check",
    mode: "static_no_secret_freshness_gate",
    targetLoop,
    proofRefreshRequired,
    staleFamilies,
    orderIssues,
    latestEvidence: rows,
    orderedRefreshCommands: rows.map((row) => ({
      family: row.family,
      command: row.refreshCommand,
      passSignal: row.passSignal,
      stopCondition: row.stopCondition,
    })),
    safety: {
      executesProofCommands: false,
      fetchesAuthStatus: false,
      connectsToDatabase: false,
      writesDatabase: false,
      mutatesEnvironment: false,
      mutatesAuthProvider: false,
      mutatesDeployment: false,
      exposesRawPacketBodies: false,
      exposesSecrets: false,
      claimsLaunchUpgrade: false,
    },
    blockedClaims: [
      "AUTH-005 success",
      "WORK-009 success",
      "WORK-007 success",
      "DEPLOY-002 success",
      "L1 launch upgrade",
      "L3 launch upgrade",
      "L4 launch upgrade",
    ],
    errors,
  }
}

function writeOutput(outPath, result) {
  const absolutePath = path.join(ROOT, outPath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, `${JSON.stringify(result, null, 2)}\n`)
}

function printHuman(result) {
  console.log(`${result.id}: ${result.status}`)
  console.log(`Target loop: ${result.targetLoop ?? "unknown"}`)
  console.log(`Proof refresh required: ${result.proofRefreshRequired ? "yes" : "no"}`)
  if (result.staleFamilies.length > 0) console.log(`Stale families: ${result.staleFamilies.join(", ")}`)
  for (const row of result.latestEvidence) {
    console.log(`- ${row.family}: loop ${row.latestLoop ?? "missing"} -> ${row.latestPath ?? "missing"}`)
  }
  if (result.errors.length > 0) {
    console.log("Errors:")
    result.errors.forEach((error) => console.log(`- ${error}`))
  }
}

try {
  const args = parseArgs(process.argv.slice(2))
  const result = buildResult(args)
  if (args.out) writeOutput(args.out, result)
  if (args.json) console.log(JSON.stringify(result, null, 2))
  else printHuman(result)
  process.exit(result.status === "failed" ? 1 : 0)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
