#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const BOOTSTRAP_PATH = path.join(ROOT, "scripts/ai-input-source-workflow-local-proof-bootstrap.mjs")
const CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-local-proof-bootstrap.mjs")
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json")
const ACC_006_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md")
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md")
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md")
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md")
const TASKS_PATH = path.join(ROOT, "tasks.md")
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md")
const PROOF_RUNNER_PATH = path.join(ROOT, "scripts/ai-input-source-workflow-proof-runner.mjs")
const PROOF_RUNNER_CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-proof-runner.mjs")
const CUTOVER_CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-formal-cutover-readiness.contract.ts",
)
const CUTOVER_CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-formal-cutover-readiness.mjs")

const REQUIRED_BOOTSTRAP_MARKERS = [
  "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP",
  "AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE",
  "I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  "--use-database-url",
  "doesNotUseDatabaseUrlSilently",
  "doesNotApplyMigration",
  "doesNotPromoteMigrationDraft",
  "doesNotWriteDatabaseByDefault",
  "doesNotSetGlobalEnv",
  "injectsConfirmationOnlyIntoChildProcess",
  "pnpm ai-input:proof -- --run --json",
  "databaseConnectionAllowedByBootstrap: false",
  "connectorRuntimeAllowed: false",
  "providerApiRuntimeAllowed: false",
  "publicOutputAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
  "database URLs",
  "database hosts",
  "database passwords",
  "tokens",
  "profile IDs",
  "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI",
]

const REQUIRED_DOC_MARKERS = [
  "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP",
  "scripts/ai-input-source-workflow-local-proof-bootstrap.mjs",
  "scripts/check-ai-input-source-workflow-local-proof-bootstrap.mjs",
  "pnpm ai-input:proof-local",
  "pnpm ai-input:proof-local:check",
  "AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  "externalRegisterable=false",
  "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI",
]

const FORBIDDEN_BOOTSTRAP_PATTERNS = [
  "new PrismaClient",
  "PrismaPg",
  "new Pool",
  "CREATE DATABASE",
  "prisma migrate",
  "db:deploy",
  "db:migrate",
  "db:push",
  "fetch(",
  "createServerClient",
  "createClient(",
  "cookies(",
  "headers(",
]

function parseArgs(argv) {
  const args = { json: false, out: null }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--out") {
      args.out = filteredArgs[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm ai-input:proof-local:check [--json] [--out <path>]")
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null
}

function relative(filePath) {
  return path.relative(ROOT, filePath)
}

function missingMarkers(text, markers) {
  return markers.filter((marker) => !text.includes(marker))
}

function pushMissingMarkers({ errors, label, text, markers, filePath }) {
  const missing = missingMarkers(text, markers)
  if (missing.length > 0) {
    errors.push(`${label} is missing markers: ${missing.join(", ")} (${relative(filePath)})`)
  }
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const warnings = []
const evidence = {}

const bootstrapText = readText(BOOTSTRAP_PATH)
const checkerText = readText(CHECKER_PATH)
const packageJsonText = readText(PACKAGE_JSON_PATH)
const acc006Text = readText(ACC_006_PATH)
const acc002Text = readText(ACC_002_PATH)
const backlogText = readText(BACKLOG_PATH)
const sprintText = readText(SPRINT_PATH)
const tasksText = readText(TASKS_PATH)
const completedLogText = readText(COMPLETED_LOG_PATH)
const proofRunnerText = readText(PROOF_RUNNER_PATH)
const proofRunnerCheckerText = readText(PROOF_RUNNER_CHECKER_PATH)
const cutoverContractText = readText(CUTOVER_CONTRACT_PATH)
const cutoverCheckerText = readText(CUTOVER_CHECKER_PATH)

for (const [label, text, filePath] of [
  ["bootstrap helper", bootstrapText, BOOTSTRAP_PATH],
  ["bootstrap checker", checkerText, CHECKER_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["ACC-006", acc006Text, ACC_006_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
  ["DATTR-024I runner", proofRunnerText, PROOF_RUNNER_PATH],
  ["DATTR-024I checker", proofRunnerCheckerText, PROOF_RUNNER_CHECKER_PATH],
  ["DATTR-024M contract", cutoverContractText, CUTOVER_CONTRACT_PATH],
  ["DATTR-024M checker", cutoverCheckerText, CUTOVER_CHECKER_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${label}: ${relative(filePath)}`)
  }
}

if (bootstrapText !== null) {
  pushMissingMarkers({
    errors,
    label: "Bootstrap helper",
    text: bootstrapText,
    markers: REQUIRED_BOOTSTRAP_MARKERS,
    filePath: BOOTSTRAP_PATH,
  })

  for (const pattern of FORBIDDEN_BOOTSTRAP_PATTERNS) {
    if (bootstrapText.includes(pattern)) {
      errors.push(`Bootstrap helper contains forbidden runtime pattern "${pattern}".`)
    }
  }

  if (/process\.env\.[A-Z0-9_]+\s*=(?!=)/.test(bootstrapText)) {
    errors.push("Bootstrap helper appears to mutate process.env directly.")
  }

  evidence.bootstrap = {
    path: relative(BOOTSTRAP_PATH),
    dryRunFirst: bootstrapText.includes("mode: \"dry_run\""),
    childOnlyEnvInjection: bootstrapText.includes("environmentInjectedIntoChildOnly"),
    noGlobalEnvMutation: bootstrapText.includes("doesNotSetGlobalEnv"),
    externalRegisterable: false,
  }
}

if (checkerText !== null) {
  pushMissingMarkers({
    errors,
    label: "Bootstrap checker",
    text: checkerText,
    markers: [
      "REQUIRED_BOOTSTRAP_MARKERS",
      "REQUIRED_DOC_MARKERS",
      "FORBIDDEN_BOOTSTRAP_PATTERNS",
      "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP",
    ],
    filePath: CHECKER_PATH,
  })
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText)
  if (
    packageJson.scripts?.["ai-input:proof-local"] !==
    "node scripts/ai-input-source-workflow-local-proof-bootstrap.mjs"
  ) {
    errors.push("package.json is missing ai-input:proof-local script.")
  }
  if (
    packageJson.scripts?.["ai-input:proof-local:check"] !==
    "node scripts/check-ai-input-source-workflow-local-proof-bootstrap.mjs"
  ) {
    errors.push("package.json is missing ai-input:proof-local:check script.")
  }
}

if (acc006Text !== null) {
  pushMissingMarkers({
    errors,
    label: "ACC-006",
    text: acc006Text,
    markers: [
      "DATTR-024I-PROOF-RUNNER",
      "pnpm ai-input:proof",
      "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
      "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
    ],
    filePath: ACC_006_PATH,
  })
}

if (proofRunnerText !== null) {
  pushMissingMarkers({
    errors,
    label: "DATTR-024I runner",
    text: proofRunnerText,
    markers: [
      "DATTR-024I-PROOF-RUNNER",
      "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
      "blocked_before_db_writes_by_dattr024i_boundary",
      "doesNotConnectToDatabase: true",
      "doesNotApplyMigration: true",
      "doesNotWriteDatabase: true",
      "externalRegisterable: false",
    ],
    filePath: PROOF_RUNNER_PATH,
  })
}

if (proofRunnerCheckerText !== null) {
  pushMissingMarkers({
    errors,
    label: "DATTR-024I checker",
    text: proofRunnerCheckerText,
    markers: ["DATTR-024I-PROOF-RUNNER", "REQUIRED_RUNNER_MARKERS", "pnpm ai-input:proof"],
    filePath: PROOF_RUNNER_CHECKER_PATH,
  })
}

if (cutoverContractText !== null) {
  pushMissingMarkers({
    errors,
    label: "DATTR-024M contract",
    text: cutoverContractText,
    markers: [
      "DATTR-024M-CUTOVER-READINESS",
      "proofTargetWriteConfirmed: false",
      "migrationApplyAllowed: false",
      "databaseConnectionAllowed: false",
      "externalRegisterable: false",
    ],
    filePath: CUTOVER_CONTRACT_PATH,
  })
}

if (cutoverCheckerText !== null) {
  pushMissingMarkers({
    errors,
    label: "DATTR-024M checker",
    text: cutoverCheckerText,
    markers: ["DATTR-024M-CUTOVER-READINESS", "pnpm ai-input:cutover-readiness:check"],
    filePath: CUTOVER_CHECKER_PATH,
  })
}

for (const [label, text, filePath, markers] of [
  ["ACC-002", acc002Text, ACC_002_PATH, REQUIRED_DOC_MARKERS],
  ["PLN-060", backlogText, BACKLOG_PATH, REQUIRED_DOC_MARKERS],
  ["PLN-061", sprintText, SPRINT_PATH, REQUIRED_DOC_MARKERS],
  ["tasks.md", tasksText, TASKS_PATH, REQUIRED_DOC_MARKERS],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH, REQUIRED_DOC_MARKERS],
]) {
  if (text === null) continue
  pushMissingMarkers({ errors, label, text, markers, filePath })
}

const result = {
  id: "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP",
  status: errors.length === 0 ? "ready_for_owner_run_source_workflow_proof_bootstrap" : "failed",
  checkedAt: new Date().toISOString(),
  nextRunnableSlice: "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI",
  safetyGuards: {
    dryRunFirst: true,
    databaseUrlFallbackRequiresExplicitFlag: true,
    dbConnectionAllowedByChecker: false,
    migrationApplyAllowed: false,
    migrationPromotionAllowed: false,
    runtimeWriteAllowedByBootstrap: false,
    connectorRuntimeAllowed: false,
    providerApiRuntimeAllowed: false,
    publicOutputAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  evidence,
  errors,
  warnings,
}

if (args.out) {
  const outPath = path.resolve(ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else if (errors.length === 0) {
  console.log(`AI Input Source Workflow local proof bootstrap check passed: ${result.status}`)
} else {
  console.error(`AI Input Source Workflow local proof bootstrap check failed with ${errors.length} error(s):`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
}

process.exit(errors.length === 0 ? 0 : 1)
