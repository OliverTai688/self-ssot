#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/conditional-l3-architecture-claim-gate.contract.ts"
const PACKAGE_JSON = "package.json"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_DOC = "tasks.md"
const LOOP_STATE = "docs/2_agent-input/generated/agent-loop/loop-state.json"
const STRATEGY_DOC = "docs/2_agent-input/generated/agent-loop/development-strategy.md"
const RESEARCH_DOC = "docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md"
const INTERFACE_CONTRACT = "src/lib/contracts/conditional-l3-interface-matrix.contract.ts"
const SCENARIO_CONTRACT = "src/lib/contracts/conditional-l3-scenario-route-map.contract.ts"
const MANUAL_OPS_SCRIPT = "scripts/check-manual-ops-launch-gate.mjs"

const REQUIRED_GATE_IDS = [
  "interface-viewframe",
  "scenario-route-map",
  "formal-launch-proof",
  "manual-ops-handoff",
  "bff-api-cli-boundary",
  "auth-permission-boundary",
  "persistence-boundary",
  "audit-observability-boundary",
  "agent-protocol-boundary",
  "public-output-boundary",
  "deployment-boundary",
  "owner-review-boundary",
]

const SUPPORT_FILES = {
  interfaceContract: INTERFACE_CONTRACT,
  scenarioContract: SCENARIO_CONTRACT,
  manualOpsScript: MANUAL_OPS_SCRIPT,
  backendOperationCatalog: "src/lib/contracts/backend-operation-catalog.contract.ts",
  moduleRealDataMatrix: "src/lib/contracts/module-real-data-matrix.contract.ts",
  operatingAuditStorageReview: "src/lib/contracts/operating-audit-storage-review.contract.ts",
  agentOperationApi: "src/lib/contracts/agent-operation-api.contract.ts",
  agentTaskMessageBus: "src/lib/contracts/agent-task-message-bus.contract.ts",
  adminReadinessService: "src/lib/services/admin-readiness.service.ts",
}

const REQUIRED_CONTRACT_MARKERS = [
  "CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE",
  "CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE_SUMMARY",
  "CONDITIONAL_L3_REQUIRED_ARCHITECTURE_GATE_IDS",
  "L3-ARCH-001",
  "C3_ARCHITECTURE_GATE_READY",
  "C2_SCENARIO_ROUTES_READY",
  "C-L3_CONDITIONAL_FULL_EXPERIENCE",
  "L0_LOCAL_PROTOTYPE",
  "M1_MANUAL_OPS_READY",
  "AUTH-005",
  "WORK-009",
  "WORK-007",
  "DEPLOY-002",
  "OWNER-UI-REVIEW",
  "formalLaunchClaimsAllowed: false",
  "formalLaunchLevelUnchanged",
  "formalLaunchLevelMutated: false",
  "blocksFormalLaunchClaim",
  "blocksConditionalC3",
  "blocksConditionalFullExperience",
  "ownerReviewRequiredBeforeConditionalFullExperience: true",
  "routeHandlerAdded: false",
  "serverActionAdded: false",
  "schemaChanged: false",
  "readsDatabase: false",
  "writesDatabase: false",
  "providerCallAdded: false",
  "publicOutputExpanded: false",
  "highRiskFinalWriteEnabled: false",
  "autonomousExecutionEnabled: false",
  "directDatabaseAccessByExternalAgents: false",
  "externalRegisterable: false",
]

const REQUIRED_DOC_MARKERS = [
  "L3-ARCH-001",
  "Conditional L3 architecture",
  "C3_ARCHITECTURE_GATE_READY",
  "pnpm l3:architecture:check",
  "CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE",
  "C-L3_CONDITIONAL_FULL_EXPERIENCE",
  "OWNER-UI-REVIEW",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client import marker", pattern: /from\s+["'][^"']*(?:db|database|prisma)[^"']*["']/i },
  { label: "runtime env read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "filesystem import marker", pattern: /from\s+["']node:fs/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "route handler export marker", pattern: /export\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/ },
  { label: "server action directive", pattern: /["']use server["']/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_[A-Z0-9_]+\b/ },
  { label: "external registerable true marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "direct database access true marker", pattern: /\bdirectDatabaseAccessByExternalAgents\s*:\s*true\b/ },
  { label: "public output expansion true marker", pattern: /\bpublicOutputExpanded\s*:\s*true\b/ },
  { label: "database write true marker", pattern: /\bwritesDatabase\s*:\s*true\b/ },
  { label: "schema changed true marker", pattern: /\bschemaChanged\s*:\s*true\b/ },
  { label: "formal launch mutation true marker", pattern: /\bformalLaunchLevelMutated\s*:\s*true\b/ },
  { label: "formal launch claims allowed true marker", pattern: /\bformalLaunchClaimsAllowed\s*:\s*true\b/ },
]

const FORBIDDEN_SECRET_LIKE_PATTERNS = [
  { label: "database connection URL", pattern: /postgres(?:ql)?:\/\/[^"'\s]+/i },
  { label: "JWT-like token", pattern: /eyJ[A-Za-z0-9_-]{20,}/ },
  { label: "service role key marker", pattern: /service[-_ ]?role[-_ ]?key\s*[:=]/i },
  { label: "raw cookie marker", pattern: /\bcookie\s*[:=]\s*["'][^"']{12,}/i },
]

function parseArgs(argv) {
  const args = { json: false, out: null, help: false }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) throw new Error("--out requires a file path")
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
  console.log("Validate the Personal OS conditional L3 architecture claim gate")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm l3:architecture:check")
  console.log("  pnpm l3:architecture:check -- --json")
  console.log(
    "  pnpm l3:architecture:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
  )
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8")
}

async function readOptional(relativePath) {
  try {
    return await readText(relativePath)
  } catch {
    return null
  }
}

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

function addIssue(list, code, message, path, line = null) {
  list.push({ code, message, path, line })
}

function validateMarkers(contents, markers, errors, path, code = "REQUIRED_MARKER_MISSING") {
  for (const marker of markers) {
    if (!contents.includes(marker)) addIssue(errors, code, `Missing required marker: ${marker}`, path)
  }
}

function validateForbiddenPatterns(contents, patterns, errors, path) {
  for (const item of patterns) {
    const match = contents.match(item.pattern)
    if (match) addIssue(errors, "FORBIDDEN_MARKER", `Contains ${item.label}.`, path, lineFor(contents, match[0]))
  }
}

function validateGateCoverage(contractSource, errors) {
  for (const gateId of REQUIRED_GATE_IDS) {
    const occurrenceCount = contractSource.split(`"${gateId}"`).length - 1
    if (occurrenceCount < 2) {
      addIssue(
        errors,
        "ARCHITECTURE_GATE_ID_MISSING",
        `Architecture gate id must appear in required ids and gate rows: ${gateId}`,
        CONTRACT_PATH,
        lineFor(contractSource, gateId)
      )
    }
  }
}

function validateBooleanCoverage(contractSource, errors) {
  const requiredRowBooleans = [
    "requiredForConditionalC3",
    "blocksConditionalC3",
    "blocksFormalLaunchClaim",
    "blocksConditionalFullExperience",
  ]

  for (const field of requiredRowBooleans) {
    const count = (contractSource.match(new RegExp(`${field}:`, "g")) ?? []).length
    if (count < REQUIRED_GATE_IDS.length) {
      addIssue(
        errors,
        "ARCHITECTURE_GATE_FIELD_INCOMPLETE",
        `Expected at least ${REQUIRED_GATE_IDS.length} ${field} entries, found ${count}.`,
        CONTRACT_PATH,
        lineFor(contractSource, field)
      )
    }
  }
}

function validateClaimSeparation(contractSource, errors) {
  const c3Blockers = (contractSource.match(/blocksConditionalC3:\s*true/g) ?? []).length
  if (c3Blockers > 0) {
    addIssue(
      errors,
      "CONDITIONAL_C3_BLOCKED",
      "The claim gate must not mark any required gate as blocking C3 after Manual Ops handoff exists.",
      CONTRACT_PATH
    )
  }

  const formalBlockers = (contractSource.match(/blocksFormalLaunchClaim:\s*true/g) ?? []).length
  if (formalBlockers < 4) {
    addIssue(
      errors,
      "FORMAL_BLOCKER_COVERAGE_TOO_LOW",
      `Expected at least 4 formal launch blockers, found ${formalBlockers}.`,
      CONTRACT_PATH
    )
  }

  const fullExperienceBlockers = (contractSource.match(/blocksConditionalFullExperience:\s*true/g) ?? []).length
  if (fullExperienceBlockers < 1) {
    addIssue(
      errors,
      "OWNER_REVIEW_GATE_MISSING",
      "The gate must require owner review before C-L3 conditional full experience.",
      CONTRACT_PATH
    )
  }
}

function validatePackageScript(packageJsonSource, errors) {
  validateMarkers(
    packageJsonSource,
    ["l3:architecture:check", "check-conditional-l3-architecture-claim-gate.mjs"],
    errors,
    PACKAGE_JSON,
    "PACKAGE_SCRIPT_MISSING"
  )
}

async function buildProof() {
  const errors = []
  const warnings = []

  const contractSource = await readText(CONTRACT_PATH)
  const packageJsonSource = await readText(PACKAGE_JSON)
  const docs = {
    acceptance: await readOptional(ACCEPTANCE_DOC),
    backlog: await readOptional(BACKLOG_DOC),
    sprint: await readOptional(SPRINT_DOC),
    completedLog: await readOptional(COMPLETED_LOG),
    tasks: await readOptional(TASKS_DOC),
    loopState: await readOptional(LOOP_STATE),
    strategy: await readOptional(STRATEGY_DOC),
    research: await readOptional(RESEARCH_DOC),
    ...Object.fromEntries(
      await Promise.all(
        Object.entries(SUPPORT_FILES).map(async ([key, file]) => [key, await readOptional(file)])
      )
    ),
  }

  const docsSource = Object.entries(docs)
    .map(([key, value]) => `# ${key}\n${value ?? ""}`)
    .join("\n")

  for (const [label, value] of Object.entries(docs)) {
    if (value === null) addIssue(errors, "SUPPORT_FILE_MISSING", `Required support file is missing: ${label}`, label)
  }

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, errors, CONTRACT_PATH)
  validateGateCoverage(contractSource, errors)
  validateBooleanCoverage(contractSource, errors)
  validateClaimSeparation(contractSource, errors)
  validateForbiddenPatterns(contractSource, FORBIDDEN_CONTRACT_PATTERNS, errors, CONTRACT_PATH)
  validateForbiddenPatterns(contractSource, FORBIDDEN_SECRET_LIKE_PATTERNS, errors, CONTRACT_PATH)
  validatePackageScript(packageJsonSource, errors)
  validateMarkers(docsSource, REQUIRED_DOC_MARKERS, errors, "docs/task memory", "DOC_MARKER_MISSING")

  if (!contractSource.includes("owner_evidence_required") || !contractSource.includes("operator_setup_required")) {
    warnings.push({
      code: "MANUAL_OPS_STATE_LOW_COVERAGE",
      message: "Architecture claim gate should keep owner evidence and operator setup states visible.",
      path: CONTRACT_PATH,
    })
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm l3:architecture:check",
    taskId: "L3-ARCH-001",
    status: errors.length === 0 ? "conditional_l3_architecture_gate_ready" : "blocked",
    conditionalProductMaturity: errors.length === 0 ? "C3_ARCHITECTURE_GATE_READY" : "C2_SCENARIO_ROUTES_READY",
    formalLaunchLevelUnchanged: "L0_LOCAL_PROTOTYPE",
    prerequisiteConditionalProductMaturity: "C2_SCENARIO_ROUTES_READY",
    conditionalManualOpsLevel: "M1_MANUAL_OPS_READY",
    nextConditionalProductMaturityCandidate: "C-L3_CONDITIONAL_FULL_EXPERIENCE",
    nextConditionalProductMaturityBlockedBy: ["OWNER-UI-REVIEW"],
    formalLaunchClaimsAllowed: false,
    formalLaunchClaimBlockers: ["AUTH-005", "WORK-009", "WORK-007", "DEPLOY-002"],
    architectureCoverage: {
      requiredGateCount: REQUIRED_GATE_IDS.length,
      requiredGateIds: REQUIRED_GATE_IDS,
      gatesBlockingConditionalC3: (contractSource.match(/blocksConditionalC3:\s*true/g) ?? []).length,
      gatesBlockingFormalLaunchClaim: (contractSource.match(/blocksFormalLaunchClaim:\s*true/g) ?? []).length,
      gatesBlockingConditionalFullExperience: (contractSource.match(/blocksConditionalFullExperience:\s*true/g) ?? [])
        .length,
    },
    checks: {
      requiredContractMarkers: REQUIRED_CONTRACT_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      gateCoverage: REQUIRED_GATE_IDS.map((gateId) => ({
        gateId,
        present: contractSource.includes(`gateId: "${gateId}"`),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(contractSource),
      })),
      docs: Object.fromEntries(Object.entries(docs).map(([key, value]) => [key, value !== null])),
    },
    safety: {
      readsEnv: false,
      readsDatabase: false,
      writesDatabase: false,
      mutatesSchema: false,
      callsProvider: false,
      callsNetwork: false,
      addsRouteHandler: false,
      addsServerAction: false,
      expandsPublicOutput: false,
      mutatesFormalLaunchLevel: false,
      enablesHighRiskFinalWrite: false,
      enablesAutonomousExecution: false,
      directDatabaseAccessByExternalAgents: false,
      externalRegisterable: false,
    },
    errors,
    warnings,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const proof = await buildProof()

  if (args.out) {
    const outputPath = repoPath(args.out)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else {
    console.log(`Conditional L3 architecture claim gate: ${proof.status}`)
    console.log(`Conditional product maturity: ${proof.conditionalProductMaturity}`)
    console.log(`Formal launch level unchanged: ${proof.formalLaunchLevelUnchanged}`)
    console.log(`Formal launch claims allowed: ${proof.formalLaunchClaimsAllowed}`)
    console.log(`Required architecture gates: ${proof.architectureCoverage.requiredGateCount}`)
    if (args.out) console.log(`Proof written: ${args.out}`)
  }

  if (proof.errors.length > 0) {
    for (const error of proof.errors) {
      console.error(`- [${error.code}] ${error.message} (${error.path}${error.line ? `:${error.line}` : ""})`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
