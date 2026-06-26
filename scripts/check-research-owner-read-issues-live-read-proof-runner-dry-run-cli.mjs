#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const RUNNER_PATH = "scripts/run-research-owner-read-issues-live-read-proof-runner.mjs"
const CHECKER_PATH =
  "scripts/check-research-owner-read-issues-live-read-proof-runner-dry-run-cli.mjs"
const CONTRACT_CHECKER_PATH =
  "scripts/check-research-owner-read-issues-live-read-proof-runner.mjs"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const TASK_ID =
  "RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI"
const CONTRACT_TASK_ID =
  "RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT"
const SELECTED_FIELD_TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"
const SERVICE_AUTHZ_TASK_ID =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"
const NEXT_TASK_ID =
  "RESEARCH-BFF-016-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-ELIGIBILITY-GATE"
const RUN_COMMAND = "pnpm research:read-issues-live-read-proof-runner:run"
const CHECK_COMMAND = "pnpm research:read-issues-live-read-proof-runner:dry-run:check"

const REQUIRED_RUNNER_MARKERS = [
  TASK_ID,
  CONTRACT_TASK_ID,
  SELECTED_FIELD_TASK_ID,
  SERVICE_AUTHZ_TASK_ID,
  "owner_run_no_secret_dry_run_cli",
  "dry_run_ready_no_live_research_read",
  "dry_run_blocked_by_contract_marker_gap",
  "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ",
  "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM",
  "I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA",
  "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET",
  "selectedScalarFields",
  "relationCountKeys",
  "mapAuthorizedResearchIssueRowsToDtos",
  "latestAuthProofSummary",
  "canRunAuth005",
  "valueRedacted: true",
  "hostRedacted: true",
  "rawPacketRedacted: true",
  "liveReadExecutionAllowed: false",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "runtimePrismaReadEnabled: false",
  "adapterExecutionAllowed: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
  "publicOutputEnabled: false",
  "externalCollaborationEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
  "launchLevelUpgradeClaimed: false",
  "doesNotConnectToDatabase: true",
  "doesNotReadResearchData: true",
  "doesNotWriteDatabase: true",
  "doesNotFetchNetwork: true",
  "printsSecrets: false",
  "database URLs",
  "database hosts",
  "raw Prisma rows",
  "private Research content",
]

const REQUIRED_DOC_MARKERS = [
  TASK_ID,
  RUNNER_PATH,
  CHECKER_PATH,
  RUN_COMMAND,
  CHECK_COMMAND,
  "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ=1",
  "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM=I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA",
  "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET",
  "dry_run_ready_no_live_research_read",
  "liveReadExecutionAllowed: false",
  "runtimePrismaReadEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  NEXT_TASK_ID,
]

const FORBIDDEN_RUNNER_PATTERNS = [
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "database client call", pattern: /\bdb\./ },
  { label: "Prisma research findMany call", pattern: /\.researchThread\.findMany\s*\(/ },
  { label: "new Prisma client", pattern: /new\s+PrismaClient/ },
  { label: "network call", pattern: /\bfetch\s*\(/ },
  { label: "cookie read", pattern: /\bcookies\s*\(/ },
  { label: "header read", pattern: /\bheaders\s*\(/ },
  { label: "route handler request", pattern: /\bNextRequest\b/ },
  { label: "route handler response", pattern: /\bNextResponse\b/ },
  { label: "server action", pattern: /["']use server["']/ },
  { label: "live read enabled", pattern: /liveReadExecutionAllowed:\s*true/ },
  { label: "runtime DB read enabled", pattern: /runtimeDbReadEnabled:\s*true/ },
  { label: "runtime DB write enabled", pattern: /runtimeDbWriteEnabled:\s*true/ },
  { label: "runtime Prisma read enabled", pattern: /runtimePrismaReadEnabled:\s*true/ },
  { label: "adapter execution enabled", pattern: /adapterExecutionAllowed:\s*true/ },
  { label: "route handler enabled", pattern: /routeHandlerEnabled:\s*true/ },
  { label: "server action write enabled", pattern: /serverActionWriteEnabled:\s*true/ },
  { label: "public output enabled", pattern: /publicOutputEnabled:\s*true/ },
  { label: "external collaboration enabled", pattern: /externalCollaborationEnabled:\s*true/ },
  { label: "external agent DB access enabled", pattern: /externalAgentDatabaseAccessAllowed:\s*true/ },
  { label: "agent final write enabled", pattern: /agentFinalWriteAllowed:\s*true/ },
  { label: "external registration enabled", pattern: /externalRegisterable:\s*true/ },
  { label: "launch level claim enabled", pattern: /launchLevelUpgradeClaimed:\s*true/ },
]

function parseArgs(argv) {
  const args = { json: false, out: undefined }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--json") {
      args.json = true
      continue
    }

    if (arg === "--out") {
      args.out = argv[index + 1]
      index += 1
      continue
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: ${CHECK_COMMAND} [--json] [--out <path>]`)
      process.exit(0)
    }
  }

  return args
}

async function readWorkspaceFile(path) {
  return readFile(resolve(process.cwd(), path), "utf8")
}

function missingMarkers(text, markers) {
  return markers.filter((marker) => !text.includes(marker))
}

function forbiddenMatches(text, patterns) {
  return patterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

async function writeJson(path, payload) {
  const absolutePath = resolve(process.cwd(), path)
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`)
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const warnings = []
const evidence = {}

const files = await Promise.all(
  [
    ["runner", RUNNER_PATH],
    ["checker", CHECKER_PATH],
    ["contractChecker", CONTRACT_CHECKER_PATH],
    ["packageJson", PACKAGE_JSON],
    ["acc002", ACC_002_DOC],
    ["backlog", BACKLOG_DOC],
    ["sprint", SPRINT_DOC],
    ["tasks", TASKS_DOC],
    ["completedLog", COMPLETED_LOG],
  ].map(async ([label, path]) => {
    try {
      return [label, path, await readWorkspaceFile(path)]
    } catch {
      return [label, path, null]
    }
  }),
)

const byLabel = Object.fromEntries(files.map(([label, path, text]) => [label, { path, text }]))

for (const [label, { path, text }] of Object.entries(byLabel)) {
  if (text === null) {
    errors.push(`Missing ${label}: ${path}`)
  }
}

const runnerText = byLabel.runner.text
if (runnerText !== null) {
  const missingRunnerMarkers = missingMarkers(runnerText, REQUIRED_RUNNER_MARKERS)
  if (missingRunnerMarkers.length > 0) {
    errors.push(`Runner missing markers: ${missingRunnerMarkers.join(", ")}`)
  }

  const forbidden = forbiddenMatches(runnerText, FORBIDDEN_RUNNER_PATTERNS)
  if (forbidden.length > 0) {
    errors.push(`Runner contains forbidden runtime patterns: ${forbidden.join(", ")}`)
  }

  evidence.runner = {
    path: RUNNER_PATH,
    taskId: TASK_ID,
    dryRunDefault: runnerText.includes("dryRun: true"),
    noDbConnection: runnerText.includes("doesNotConnectToDatabase: true"),
    noSecretPacket: runnerText.includes("printsSecrets: false"),
  }
}

if (byLabel.checker.text !== null) {
  const missingCheckerMarkers = missingMarkers(byLabel.checker.text, [
    "REQUIRED_RUNNER_MARKERS",
    "REQUIRED_DOC_MARKERS",
    "FORBIDDEN_RUNNER_PATTERNS",
    TASK_ID,
  ])
  if (missingCheckerMarkers.length > 0) {
    errors.push(`Checker missing self-check markers: ${missingCheckerMarkers.join(", ")}`)
  }
}

if (byLabel.packageJson.text !== null) {
  const packageJson = JSON.parse(byLabel.packageJson.text)
  if (
    packageJson.scripts?.["research:read-issues-live-read-proof-runner:run"] !==
    "node scripts/run-research-owner-read-issues-live-read-proof-runner.mjs"
  ) {
    errors.push("package.json missing research:read-issues-live-read-proof-runner:run script.")
  }
  if (
    packageJson.scripts?.["research:read-issues-live-read-proof-runner:dry-run:check"] !==
    "node scripts/check-research-owner-read-issues-live-read-proof-runner-dry-run-cli.mjs"
  ) {
    errors.push("package.json missing research:read-issues-live-read-proof-runner:dry-run:check script.")
  }
}

for (const [label, path] of [
  ["ACC-002", ACC_002_DOC],
  ["PLN-060", BACKLOG_DOC],
  ["PLN-061", SPRINT_DOC],
  ["tasks.md", TASKS_DOC],
  ["RPT-007", COMPLETED_LOG],
]) {
  const entry = files.find(([, filePath]) => filePath === path)
  const text = entry?.[2] ?? null
  if (text === null) continue

  const missing = missingMarkers(text, REQUIRED_DOC_MARKERS)
  if (missing.length > 0) {
    errors.push(`${label} missing BFF-015 markers: ${missing.join(", ")}`)
  }
}

const result = {
  schemaVersion: 1,
  taskId: TASK_ID,
  status:
    errors.length === 0
      ? "ready_for_research_issues_live_read_proof_runner_dry_run_cli"
      : "failed",
  checkedAt: new Date().toISOString(),
  runCommand: RUN_COMMAND,
  nextRunnableSlice: NEXT_TASK_ID,
  safetyGuards: {
    dryRunOnly: true,
    databaseConnectionAllowed: false,
    liveResearchReadAllowed: false,
    runtimeWriteAllowed: false,
    routeHandlerAllowed: false,
    serverActionAllowed: false,
    publicOutputAllowed: false,
    externalCollaborationAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
    launchLevelUpgradeClaimed: false,
  },
  evidence,
  errors,
  warnings,
}

if (args.out) {
  await writeJson(args.out, result)
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else if (errors.length > 0) {
  console.error(JSON.stringify(result, null, 2))
}

process.exit(errors.length === 0 ? 0 : 1)
