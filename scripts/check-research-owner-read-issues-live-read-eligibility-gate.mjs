#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const TASK_ID =
  "RESEARCH-BFF-016-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-ELIGIBILITY-GATE"
const PREVIOUS_TASK_ID =
  "RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI"
const CONTRACT_TASK_ID =
  "RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT"
const SELECTED_FIELD_TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"
const SERVICE_AUTHZ_TASK_ID =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"
const NEXT_TASK_ID =
  "RESEARCH-BFF-017-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-OWNER-APPROVAL-PACKET"

const REPORTS_DIR = "docs/2_agent-input/generated/agent-loop/reports"
const RUNNER_PATH = "scripts/run-research-owner-read-issues-live-read-proof-runner.mjs"
const DRY_RUN_CHECKER_PATH =
  "scripts/check-research-owner-read-issues-live-read-proof-runner-dry-run-cli.mjs"
const ELIGIBILITY_CHECKER_PATH =
  "scripts/check-research-owner-read-issues-live-read-eligibility-gate.mjs"
const CONTRACT_CHECKER_PATH =
  "scripts/check-research-owner-read-issues-live-read-proof-runner.mjs"
const SELECTED_FIELD_CHECKER_PATH =
  "scripts/check-research-owner-read-issues-selected-field-runtime-adapter.mjs"
const SERVICE_AUTHZ_CHECKER_PATH =
  "scripts/check-research-owner-read-issues-service-authz-runtime.mjs"
const PACKAGE_JSON = "package.json"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"

const RUNNER_COMMAND = "pnpm research:read-issues-live-read-proof-runner:run"
const CHECK_COMMAND = "pnpm research:read-issues-live-read-eligibility:check"
const ALLOW_LIVE_READ_FLAG = "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ"
const CONFIRMATION_ENV = "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM"
const CONFIRMATION_PHRASE = "I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA"
const PROOF_TARGET_ENV = "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET"

const REQUIRED_PACKET_MARKERS = {
  taskId: PREVIOUS_TASK_ID,
  status: "dry_run_ready_no_live_research_read",
  mode: "owner_run_no_secret_dry_run_cli",
  selectedFamily: "issues",
  selectedModel: "ResearchThread",
  ownerIdentitySource: "requireUser().profileId",
  ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId",
  mapperFunction: "mapAuthorizedResearchIssueRowsToDtos",
  mapperOutputBoundary: "ui_safe_research_issue_read_dto",
}

const REQUIRED_SCRIPT_MARKERS = [
  TASK_ID,
  PREVIOUS_TASK_ID,
  CONTRACT_TASK_ID,
  SELECTED_FIELD_TASK_ID,
  SERVICE_AUTHZ_TASK_ID,
  NEXT_TASK_ID,
  "eligible_for_separate_owner_approved_live_read_selection",
  "manual_ops_required_owner_evidence_missing",
  "blocked_by_contract_or_safety_gap",
  "liveReadExecutionAllowed: false",
  "runtimeDbReadEnabled: false",
  "runtimePrismaReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
  "launchLevelUpgradeClaimed: false",
  "doesNotConnectToDatabase: true",
  "doesNotReadResearchData: true",
  "doesNotWriteDatabase: true",
  "printsSecrets: false",
]

const REQUIRED_DOC_MARKERS = [
  TASK_ID,
  ELIGIBILITY_CHECKER_PATH,
  CHECK_COMMAND,
  PREVIOUS_TASK_ID,
  "eligible_for_separate_owner_approved_live_read_selection",
  "manual_ops_required_owner_evidence_missing",
  "liveReadExecutionAllowed: false",
  "runtimePrismaReadEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  NEXT_TASK_ID,
]

const FORBIDDEN_SCRIPT_PATTERNS = [
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
  { label: "runtime Prisma read enabled", pattern: /runtimePrismaReadEnabled:\s*true/ },
  { label: "runtime DB write enabled", pattern: /runtimeDbWriteEnabled:\s*true/ },
  { label: "external agent DB access enabled", pattern: /externalAgentDatabaseAccessAllowed:\s*true/ },
  { label: "external registration enabled", pattern: /externalRegisterable:\s*true/ },
  { label: "launch claim enabled", pattern: /launchLevelUpgradeClaimed:\s*true/ },
]

function parseArgs(argv) {
  const args = {
    json: false,
    out: null,
    packet: null,
    help: false,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
      continue
    }

    if (arg === "--out") {
      args.out = requiredValue(filteredArgs, index, "--out")
      index += 1
      continue
    }

    if (arg === "--packet") {
      args.packet = requiredValue(filteredArgs, index, "--packet")
      index += 1
      continue
    }

    if (arg === "--help" || arg === "-h") {
      args.help = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
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
  console.log("Check whether Research issues live-read proof may be selected.")
  console.log("")
  console.log("Usage:")
  console.log(`  ${CHECK_COMMAND}`)
  console.log(`  ${CHECK_COMMAND} -- --json`)
  console.log(`  ${CHECK_COMMAND} -- --packet docs/2_agent-input/generated/agent-loop/reports/<dry-run>.json`)
  console.log("")
  console.log("This gate never connects to a database and never executes a live Research read.")
}

function readText(path) {
  const absolutePath = resolve(process.cwd(), path)
  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : null
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"))
}

function writeJson(path, payload) {
  const absolutePath = resolve(process.cwd(), path)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`)
}

function latestDryRunPacketPath() {
  const reportsPath = resolve(process.cwd(), REPORTS_DIR)
  if (!existsSync(reportsPath)) return null

  const candidates = readdirSync(reportsPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .filter((fileName) => fileName.includes("research-issues-live-read-proof-runner-dry-run"))
    .filter((fileName) => !fileName.includes("dry-run-check"))
    .filter((fileName) => !fileName.includes("contract-check"))
    .map((fileName) => {
      const absolutePath = join(reportsPath, fileName)
      return {
        path: join(REPORTS_DIR, fileName),
        mtimeMs: statSync(absolutePath).mtimeMs,
      }
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)

  return candidates[0]?.path ?? null
}

function missingMarkers(text, markers) {
  return markers.filter((marker) => !text.includes(marker))
}

function forbiddenMatches(text, patterns) {
  return patterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

function validatePacket(packet) {
  const failures = []

  for (const [key, expected] of Object.entries(REQUIRED_PACKET_MARKERS)) {
    if (packet?.[key] !== expected) failures.push(`${key} expected ${expected}`)
  }

  const dependencies = packet?.dependencies ?? {}
  for (const key of ["bff014", "bff013", "bff012"]) {
    if (dependencies[key]?.markerReady !== true) {
      failures.push(`${key} dependency markerReady is not true`)
    }
  }

  const safety = packet?.safety ?? {}
  const falseFlags = [
    "liveReadExecutionAllowed",
    "runtimeDbReadEnabled",
    "runtimeDbWriteEnabled",
    "runtimePrismaReadEnabled",
    "adapterExecutionAllowed",
    "routeHandlerEnabled",
    "serverActionWriteEnabled",
    "publicOutputEnabled",
    "externalCollaborationEnabled",
    "externalAgentDatabaseAccessAllowed",
    "agentFinalWriteAllowed",
    "externalRegisterable",
    "launchLevelUpgradeClaimed",
  ]
  for (const flag of falseFlags) {
    if (packet?.[flag] !== false) failures.push(`${flag} must remain false`)
  }

  const trueSafetyFlags = [
    "doesNotConnectToDatabase",
    "doesNotReadResearchData",
    "doesNotWriteDatabase",
    "printsSecrets",
  ]
  for (const flag of trueSafetyFlags) {
    if (flag === "printsSecrets") {
      if (safety[flag] !== false) failures.push("printsSecrets must remain false")
    } else if (safety[flag] !== true) {
      failures.push(`${flag} must remain true`)
    }
  }

  return failures
}

function buildEligibility(packet) {
  const inputs = packet?.ownerRunInputs ?? {}
  const allowLiveReadAccepted = inputs.allowLiveRead?.accepted === true
  const confirmationAccepted = inputs.confirmation?.accepted === true
  const proofTargetReady = inputs.proofTarget?.proofTargetReady === true
  const authProofReady = inputs.authProof?.canRunAuth005 === true
  const dependenciesReady = ["bff014", "bff013", "bff012"].every(
    (key) => packet?.dependencies?.[key]?.markerReady === true,
  )
  const dryRunFutureEligible = packet?.futureLiveReadEligible === true

  const criteria = [
    {
      id: "dry-run-packet",
      label: "BFF-015 dry-run packet",
      passed: packet?.status === "dry_run_ready_no_live_research_read",
      requiredForEligibility: true,
      manualOps: false,
      signal: packet?.status ?? "missing",
    },
    {
      id: "dependency-chain",
      label: "BFF-014/BFF-013/BFF-012 chain",
      passed: dependenciesReady,
      requiredForEligibility: true,
      manualOps: false,
      signal: dependenciesReady ? "dependency markers ready" : "dependency marker gap",
    },
    {
      id: "allow-live-read",
      label: `${ALLOW_LIVE_READ_FLAG}=1`,
      passed: allowLiveReadAccepted,
      requiredForEligibility: true,
      manualOps: true,
      signal: allowLiveReadAccepted ? "accepted" : "missing_or_not_accepted",
    },
    {
      id: "owner-confirmation",
      label: `${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE}`,
      passed: confirmationAccepted,
      requiredForEligibility: true,
      manualOps: true,
      signal: confirmationAccepted ? "accepted" : "missing_or_not_accepted",
    },
    {
      id: "proof-target",
      label: PROOF_TARGET_ENV,
      passed: proofTargetReady,
      requiredForEligibility: true,
      manualOps: true,
      signal: inputs.proofTarget?.classification ?? "missing",
    },
    {
      id: "auth-proof",
      label: "AUTH-005 sanitized owner/Profile proof",
      passed: authProofReady,
      requiredForEligibility: true,
      manualOps: true,
      signal: authProofReady
        ? "canRunAuth005=true"
        : inputs.authProof?.nextAction ?? "auth proof missing",
    },
    {
      id: "dry-run-future-eligible",
      label: "BFF-015 futureLiveReadEligible",
      passed: dryRunFutureEligible,
      requiredForEligibility: true,
      manualOps: false,
      signal: dryRunFutureEligible ? "true" : "false",
    },
  ]

  const missing = criteria.filter((criterion) => !criterion.passed)
  const ownerEvidenceMissing = missing.filter((criterion) => criterion.manualOps)
  const eligible = missing.length === 0
  const status = eligible
    ? "eligible_for_separate_owner_approved_live_read_selection"
    : ownerEvidenceMissing.length > 0
      ? "manual_ops_required_owner_evidence_missing"
      : "blocked_by_contract_or_safety_gap"

  return {
    status,
    eligible,
    ownerEvidenceMissing: ownerEvidenceMissing.length > 0,
    criteria,
    missing: missing.map((criterion) => criterion.label),
  }
}

function verifyLocalArtifacts() {
  const errors = []
  const warnings = []
  const evidence = {}

  const scriptText = readText(ELIGIBILITY_CHECKER_PATH)
  if (scriptText === null) {
    errors.push(`Missing eligibility checker: ${ELIGIBILITY_CHECKER_PATH}`)
  } else {
    const missingScriptMarkers = missingMarkers(scriptText, REQUIRED_SCRIPT_MARKERS)
    if (missingScriptMarkers.length > 0) {
      errors.push(`Eligibility checker missing markers: ${missingScriptMarkers.join(", ")}`)
    }

    const forbidden = forbiddenMatches(scriptText, FORBIDDEN_SCRIPT_PATTERNS)
    if (forbidden.length > 0) {
      errors.push(`Eligibility checker contains forbidden runtime patterns: ${forbidden.join(", ")}`)
    }

    evidence.checker = {
      path: ELIGIBILITY_CHECKER_PATH,
      noDbConnection: scriptText.includes("doesNotConnectToDatabase: true"),
      noResearchRead: scriptText.includes("doesNotReadResearchData: true"),
      noSecretPacket: scriptText.includes("printsSecrets: false"),
    }
  }

  const packageText = readText(PACKAGE_JSON)
  if (packageText === null) {
    errors.push(`Missing ${PACKAGE_JSON}`)
  } else {
    const packageJson = JSON.parse(packageText)
    if (
      packageJson.scripts?.["research:read-issues-live-read-eligibility:check"] !==
      "node scripts/check-research-owner-read-issues-live-read-eligibility-gate.mjs"
    ) {
      errors.push("package.json missing research:read-issues-live-read-eligibility:check script.")
    }
  }

  for (const path of [
    RUNNER_PATH,
    DRY_RUN_CHECKER_PATH,
    CONTRACT_CHECKER_PATH,
    SELECTED_FIELD_CHECKER_PATH,
    SERVICE_AUTHZ_CHECKER_PATH,
  ]) {
    if (readText(path) === null) errors.push(`Missing dependency checker/script: ${path}`)
  }

  for (const [label, path] of [
    ["ACC-002", ACC_002_DOC],
    ["PLN-060", BACKLOG_DOC],
    ["PLN-061", SPRINT_DOC],
    ["tasks.md", TASKS_DOC],
    ["RPT-007", COMPLETED_LOG],
  ]) {
    const text = readText(path)
    if (text === null) {
      errors.push(`Missing ${label}: ${path}`)
      continue
    }

    const missing = missingMarkers(text, REQUIRED_DOC_MARKERS)
    if (missing.length > 0) {
      errors.push(`${label} missing BFF-016 markers: ${missing.join(", ")}`)
    }
  }

  return { errors, warnings, evidence }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const selectedPacketPath = args.packet ?? latestDryRunPacketPath()
  const errors = []
  const warnings = []
  let packet = null

  if (!selectedPacketPath) {
    errors.push(`No ${PREVIOUS_TASK_ID} dry-run packet found in ${REPORTS_DIR}.`)
  } else {
    try {
      packet = readJson(selectedPacketPath)
      errors.push(...validatePacket(packet))
    } catch {
      errors.push(`Dry-run packet is not readable JSON: ${selectedPacketPath}`)
    }
  }

  const artifactCheck = verifyLocalArtifacts()
  errors.push(...artifactCheck.errors)
  warnings.push(...artifactCheck.warnings)

  const eligibility =
    packet && errors.length === 0
      ? buildEligibility(packet)
      : {
          status: "blocked_by_contract_or_safety_gap",
          eligible: false,
          ownerEvidenceMissing: false,
          criteria: [],
          missing: [],
        }

  const status = errors.length > 0 ? "failed" : eligibility.status

  const result = {
    schemaVersion: 1,
    taskId: TASK_ID,
    previousTaskId: PREVIOUS_TASK_ID,
    status,
    checkedAt: new Date().toISOString(),
    selectedPacketPath,
    nextRunnableSlice: eligibility.eligible
      ? NEXT_TASK_ID
      : eligibility.ownerEvidenceMissing
        ? "MANUAL-OPS-RESEARCH-OWNER-EVIDENCE-HANDOFF"
        : TASK_ID,
    eligibility,
    launchLevelUpgradeClaimed: false,
    liveReadExecutionAllowed: false,
    runtimeDbReadEnabled: false,
    runtimeDbWriteEnabled: false,
    runtimePrismaReadEnabled: false,
    adapterExecutionAllowed: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
    publicOutputEnabled: false,
    externalCollaborationEnabled: false,
    externalAgentDatabaseAccessAllowed: false,
    agentFinalWriteAllowed: false,
    externalRegisterable: false,
    safety: {
      doesNotConnectToDatabase: true,
      doesNotReadResearchData: true,
      doesNotWriteDatabase: true,
      doesNotFetchNetwork: true,
      printsSecrets: false,
      noRouteHandlerOrServerAction: true,
      separateLiveReadTaskRequired: true,
    },
    ownerRunHandoff: {
      command: `${RUNNER_COMMAND} -- --json --out docs/2_agent-input/generated/agent-loop/reports/owner-research-issues-read-dry-run.json`,
      requiredEnv: [
        `${ALLOW_LIVE_READ_FLAG}=1`,
        `${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE}`,
        `${PROOF_TARGET_ENV}=local_or_disposable_or_owner_approved`,
        "AUTH-005 sanitized owner/Profile evidence",
      ],
      passSignal:
        "This gate may return eligible_for_separate_owner_approved_live_read_selection, but liveReadExecutionAllowed remains false until a later explicitly selected task.",
    },
    evidence: {
      ...artifactCheck.evidence,
      packetSummary: packet
        ? {
            status: packet.status,
            ownerRunReady: packet.ownerRunReady === true,
            futureLiveReadEligible: packet.futureLiveReadEligible === true,
            authProofCanRunAuth005:
              packet.ownerRunInputs?.authProof?.canRunAuth005 === true,
          }
        : null,
    },
    errors,
    warnings,
  }

  if (args.out) writeJson(args.out, result)

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (errors.length > 0) {
    console.error(JSON.stringify(result, null, 2))
  }

  process.exit(errors.length === 0 ? 0 : 1)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
