#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const REPORT_DIR = "docs/2_agent-input/generated/agent-loop/reports"
const TASK_ID = "ENV-003-LAUNCH-OWNER-PROOF-PLAN"

const FILES = {
  contract: "src/lib/contracts/launch-owner-proof-plan.contract.ts",
  script: "scripts/check-launch-owner-proof-plan.mjs",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const LATEST_PATTERNS = {
  launch: /launch-proof\.json$/,
  auth: /auth-proof\.json$/,
  workTarget: /work-proof-target-readiness\.json$/,
  preemption: /launch-preemption-router\.json$/,
  manualOps: /manual-ops-gate\.json$/,
}

const REQUIRED_STEP_IDS = [
  "supabase_public_env",
  "signed_in_auth_status",
  "work_proof_target",
  "work_proof_run",
  "deployment_marker",
  "next_loop_routing",
]

const CONTRACT_MARKERS = [
  "LaunchOwnerProofPlanContract",
  "LAUNCH_OWNER_PROOF_PLAN_CONTRACT",
  TASK_ID,
  "pnpm launch:owner-plan:check",
  ...REQUIRED_STEP_IDS,
  "raw generated report payload bodies",
]

const DOC_MARKERS = [
  TASK_ID,
  "owner proof plan",
  "pnpm launch:owner-plan:check",
  "AUTH-005",
  "WORK-009",
  "DEPLOY-002",
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
      const value = filtered[index + 1]
      if (!value || value.startsWith("--")) throw new Error("--out requires a file path")
      args.out = value
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm launch:owner-plan:check [--json] [--out <path>]")
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
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
}

function latestByPattern(files, pattern) {
  return files.find((file) => pattern.test(file.name)) ?? null
}

function parseJson(file, errors) {
  if (!file) return null
  try {
    const parsed = JSON.parse(fs.readFileSync(file.absolutePath, "utf8"))
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null
  } catch (error) {
    errors.push(`${file.path} is not parseable JSON: ${error.message}`)
    return null
  }
}

function arrayValue(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : []
}

function stateFromReady(ready, blocked = "manual_owner_action") {
  return ready ? "ready" : blocked
}

function buildSteps({ launchProof, authProof, workTarget, preemption }) {
  const launchBlocked = arrayValue(launchProof?.proofSummary?.blockedLabels)
  const authBlocked = arrayValue(authProof?.proofSummary?.blockedLabels)
  const workMissing = arrayValue(workTarget?.missing)
  const routerRecommendation = preemption?.recommendation?.nextTask ?? "unknown"

  const supabasePublicEnvReady =
    launchProof?.proofSummary?.canRunAuth005 === true ||
    (!launchBlocked.includes("Supabase public URL") && !launchBlocked.includes("Supabase publishable key"))
  const authStatusReady = authProof?.proofSummary?.canRunAuth005 === true
  const workTargetReady = workTarget?.canRunWork009 === true
  const deployReady = launchProof?.proofSummary?.canClaimL1 === true

  return [
    {
      id: "supabase_public_env",
      title: "Configure Supabase public env",
      state: stateFromReady(supabasePublicEnvReady),
      blockerLabels: launchBlocked.filter((label) =>
        ["Supabase public URL", "Supabase publishable key"].includes(label)
      ),
      ownerAction: supabasePublicEnvReady
        ? "Supabase public env appears ready in the latest launch proof."
        : "Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the intended target.",
      command:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-proof.json",
      evidenceTarget: "latest launch-proof.json",
      passSignal: "proofSummary.blockedLabels excludes Supabase public URL and Supabase publishable key.",
      stopCondition: "Do not paste Supabase values into repo docs, generated reports, or chat.",
    },
    {
      id: "signed_in_auth_status",
      title: "Collect signed-in auth status",
      state: stateFromReady(authStatusReady),
      blockerLabels: authBlocked,
      ownerAction: authStatusReady
        ? "AUTH-005 can run from the latest auth proof."
        : "Sign in through /login, open /auth/status, save sanitized JSON, then validate it.",
      command:
        "pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/<auth-status>.json --out docs/2_agent-input/generated/agent-loop/reports/<target>-auth-proof.json",
      evidenceTarget: "latest auth-proof.json",
      passSignal: "proofSummary.canRunAuth005=true.",
      stopCondition: "Do not include cookies, tokens, raw claims, provider payloads, profile IDs, or actual email values.",
    },
    {
      id: "work_proof_target",
      title: "Prepare disposable Work proof target",
      state: stateFromReady(workTargetReady),
      blockerLabels: workMissing,
      ownerAction: workTargetReady
        ? "WORK-009 can run from the latest Work proof target packet."
        : "Choose a local/disposable proof database and set only the required proof env vars.",
      command:
        "pnpm work:proof-target:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/<target>-work-proof-target-readiness.json",
      evidenceTarget: "latest work-proof-target-readiness.json",
      passSignal: "canRunWork009=true.",
      stopCondition: "Do not use valuable production or client data as the proof target.",
    },
    {
      id: "work_proof_run",
      title: "Run disposable Work proof",
      state: workTargetReady ? "manual_owner_action" : "blocked_downstream",
      blockerLabels: workTargetReady ? [] : ["Work proof target not ready"],
      ownerAction: workTargetReady
        ? "Run the Work proof with the approved target and inspect cleanup."
        : "Wait until work_proof_target reports canRunWork009=true.",
      command:
        "pnpm work:proof -- --run --json --out docs/2_agent-input/generated/agent-loop/reports/<target>-work-proof.json",
      evidenceTarget: "latest work proof run packet",
      passSignal: "status=passed and cleanup.cleanup=passed.",
      stopCondition: "Stop if the target is not disposable, write confirmations are absent, or cleanup fails.",
    },
    {
      id: "deployment_marker",
      title: "Prove deployment context",
      state: stateFromReady(deployReady),
      blockerLabels: deployReady ? [] : ["Deployment marker"],
      ownerAction: deployReady
        ? "Deployment marker and launch gates appear ready in the latest launch proof."
        : "Run launch proof in the intended deployed or Vercel env-run target.",
      command:
        "vercel env run -e preview -- pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-proof.json",
      evidenceTarget: "deployed launch-proof.json",
      passSignal: "proofSummary.canClaimL1=true in the intended environment.",
      stopCondition: "Local-only launch proof must not claim final online launch.",
    },
    {
      id: "next_loop_routing",
      title: "Route the next loop",
      state: "ready",
      blockerLabels: [],
      ownerAction: `Latest router recommendation: ${routerRecommendation}.`,
      command:
        "pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-preemption-router.json",
      evidenceTarget: "latest launch-preemption-router.json",
      passSignal: "recommendation.nextTask is AUTH-005, WORK-009, DEPLOY-002, or RES-001-RESEARCH-REVIEW.",
      stopCondition: "Do not claim launch upgrades from fallback routing.",
    },
  ]
}

function buildPlan({ latest, parsed, errors }) {
  for (const key of ["launch", "auth", "workTarget", "preemption"]) {
    if (!latest[key]) errors.push(`latest ${key} proof packet is missing.`)
  }

  const steps = buildSteps({
    launchProof: parsed.launch,
    authProof: parsed.auth,
    workTarget: parsed.workTarget,
    preemption: parsed.preemption,
  })

  const readyProofTasks = []
  if (parsed.auth?.proofSummary?.canRunAuth005 === true) readyProofTasks.push("AUTH-005")
  if (parsed.workTarget?.canRunWork009 === true) readyProofTasks.push("WORK-009")
  if (parsed.launch?.proofSummary?.canClaimL1 === true) readyProofTasks.push("DEPLOY-002")

  return {
    id: TASK_ID,
    status: errors.length === 0 ? "ready_for_owner_proof_plan" : "failed",
    generatedAt: new Date().toISOString(),
    mode: "static_no_secret_owner_run_plan",
    latestEvidence: Object.fromEntries(
      Object.entries(latest).map(([key, file]) => [
        key,
        file
          ? {
              path: file.path,
              modifiedMs: file.mtimeMs,
            }
          : null,
      ])
    ),
    routerRecommendation: parsed.preemption?.recommendation ?? null,
    readyProofTasks,
    nextOwnerAction:
      readyProofTasks.length > 0
        ? `Run ${readyProofTasks[0]} proof next.`
        : "Run the owner proof plan steps that are blocked or manual_owner_action, then rerun pnpm launch:preempt:check.",
    steps,
    safety: {
      scansWhitelistedReportsDirectoryOnly: true,
      executesCommands: false,
      connectsToDatabase: false,
      writesDatabase: false,
      mutatesEnvironment: false,
      mutatesAuthProvider: false,
      mutatesDeploymentProvider: false,
      printsSecrets: false,
      exposesRawPacketBodies: false,
      launchLevelUpgradeClaimed: false,
    },
    prohibitedExposure: [
      "Supabase URLs or keys",
      "database URLs or hosts",
      "cookies or tokens",
      "raw auth claims",
      "raw provider payloads",
      "profile IDs",
      "actual profile email values",
      "raw generated report payload bodies",
    ],
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

const args = parseArgs(process.argv.slice(2))
const errors = []
const texts = Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, read(file)]))

validateMarkers({ label: FILES.contract, text: texts.contract, markers: CONTRACT_MARKERS, errors })
validateMarkers({ label: FILES.script, text: texts.script, markers: [TASK_ID, "buildSteps"], errors })
validateMarkers({
  label: "acceptance/backlog/sprint/completed/tasks docs",
  text: [texts.acceptance, texts.backlog, texts.sprint, texts.completedLog, texts.tasks].filter(Boolean).join("\n"),
  markers: DOC_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.packageJson,
  text: texts.packageJson,
  markers: ["launch:owner-plan:check", "check-launch-owner-proof-plan.mjs"],
  errors,
})

for (const key of ["contract", "script", "packageJson"]) {
  scanForbiddenLiterals({ label: FILES[key], text: texts[key], errors })
}

const reportFiles = listReportFiles()
const latest = Object.fromEntries(
  Object.entries(LATEST_PATTERNS).map(([key, pattern]) => [key, latestByPattern(reportFiles, pattern)])
)
const parsed = Object.fromEntries(Object.entries(latest).map(([key, file]) => [key, parseJson(file, errors)]))
const plan = buildPlan({ latest, parsed, errors })

if (args.out) {
  const outputPath = path.resolve(ROOT, args.out)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(plan, null, 2))
} else {
  console.log(`Launch owner proof plan: ${plan.status}`)
  console.log(`Next owner action: ${plan.nextOwnerAction}`)
  console.log(`Steps: ${plan.steps.length}`)
  if (args.out) console.log(`Proof written: ${args.out}`)
}

if (plan.errors.length > 0) {
  for (const error of plan.errors) console.error(`- ${error}`)
  process.exit(1)
}
