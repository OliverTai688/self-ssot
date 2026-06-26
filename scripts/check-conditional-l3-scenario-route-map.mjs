#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/conditional-l3-scenario-route-map.contract.ts"
const PACKAGE_JSON = "package.json"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_DOC = "tasks.md"
const RESEARCH_DOC = "docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md"
const INTERFACE_CONTRACT = "src/lib/contracts/conditional-l3-interface-matrix.contract.ts"
const ADMIN_READINESS_SERVICE = "src/lib/services/admin-readiness.service.ts"

const ROUTE_FILES = {
  "owner-access": ["src/app/page.tsx", "src/app/(auth)/login/page.tsx", "src/app/auth/status/route.ts"],
  "daily-command": ["src/app/(dashboard)/dashboard/page.tsx"],
  "work-operation": ["src/app/(dashboard)/work/page.tsx", "src/app/actions/work.ts"],
  "source-to-work": ["src/app/(dashboard)/ai-input/page.tsx"],
  "research-to-decision": ["src/app/(dashboard)/research/page.tsx"],
  "chamber-opportunity": ["src/app/(dashboard)/chamber/page.tsx"],
  "high-risk-review": [
    "src/app/(dashboard)/finance/page.tsx",
    "src/app/(dashboard)/life/page.tsx",
    "src/app/(dashboard)/company/page.tsx",
  ],
  "agent-command": ["src/app/(dashboard)/agents/page.tsx"],
  "admin-manual-ops": ["src/app/(dashboard)/admin/page.tsx", "src/app/(dashboard)/settings/page.tsx"],
}

const REQUIRED_ROUTE_IDS = Object.keys(ROUTE_FILES)

const REQUIRED_CONTRACT_MARKERS = [
  "CONDITIONAL_L3_SCENARIO_ROUTE_MAP",
  "CONDITIONAL_L3_SCENARIO_ROUTE_MAP_SUMMARY",
  "CONDITIONAL_L3_REQUIRED_SCENARIO_ROUTE_IDS",
  "L3-SCENARIO-001",
  "C2_SCENARIO_ROUTES_READY",
  "C1_INTERFACE_MATRIX_READY",
  "L0_LOCAL_PROTOTYPE",
  "M1_MANUAL_OPS_READY",
  "AUTH-005",
  "WORK-009",
  "WORK-007",
  "DEPLOY-002",
  "trigger",
  "actor",
  "entrySurface",
  "dataSource",
  "actionPath",
  "agentProposal",
  "output",
  "auditProof",
  "nextTask",
  "manualOps",
  "missingCriticalForC2",
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
  "L3-SCENARIO-001",
  "Conditional L3 scenario",
  "C2_SCENARIO_ROUTES_READY",
  "pnpm l3:scenario:check",
  "CONDITIONAL_L3_SCENARIO_ROUTE_MAP",
  "L3-ARCH-001",
]

const REQUIRED_FIELD_NAMES = [
  "trigger",
  "actor",
  "entrySurface",
  "dataSource",
  "actionPath",
  "agentProposal",
  "output",
  "auditProof",
  "nextTask",
  "manualOps",
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
  { label: "database write true marker", pattern: /\bwritesDatabase\s*:\s*true\b/ },
  { label: "public output true marker", pattern: /\bpublicOutputExpanded\s*:\s*true\b/ },
  { label: "high-risk final write true marker", pattern: /\bhighRiskFinalWriteEnabled\s*:\s*true\b/ },
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
  console.log("Validate the Personal OS conditional L3 scenario route map")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm l3:scenario:check")
  console.log("  pnpm l3:scenario:check -- --json")
  console.log(
    "  pnpm l3:scenario:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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

function validateRouteCoverage(contractSource, errors) {
  for (const routeId of REQUIRED_ROUTE_IDS) {
    const occurrenceCount = contractSource.split(`"${routeId}"`).length - 1
    if (occurrenceCount < 2) {
      addIssue(
        errors,
        "SCENARIO_ROUTE_ID_MISSING",
        `Scenario route id must appear in required ids and route map rows: ${routeId}`,
        CONTRACT_PATH,
        lineFor(contractSource, routeId)
      )
    }
  }
}

function validateFieldCoverage(contractSource, errors) {
  for (const field of REQUIRED_FIELD_NAMES) {
    const count = (contractSource.match(new RegExp(`${field}:`, "g")) ?? []).length
    if (count < REQUIRED_ROUTE_IDS.length) {
      addIssue(
        errors,
        "SCENARIO_FIELD_INCOMPLETE",
        `Expected at least ${REQUIRED_ROUTE_IDS.length} ${field} entries, found ${count}.`,
        CONTRACT_PATH,
        lineFor(contractSource, field)
      )
    }
  }
}

function validateCriticalGapCoverage(contractSource, errors) {
  const emptyCriticalGapRows = (contractSource.match(/missingCriticalForC2:\s*\[\]/g) ?? []).length
  if (emptyCriticalGapRows < REQUIRED_ROUTE_IDS.length) {
    addIssue(
      errors,
      "CRITICAL_GAP_FIELD_INCOMPLETE",
      `Expected each scenario route to state no critical C2 gap; found ${emptyCriticalGapRows}.`,
      CONTRACT_PATH
    )
  }
}

function validatePackageScript(packageJsonSource, errors) {
  validateMarkers(
    packageJsonSource,
    ["l3:scenario:check", "check-conditional-l3-scenario-route-map.mjs"],
    errors,
    PACKAGE_JSON,
    "PACKAGE_SCRIPT_MISSING"
  )
}

async function validateRouteFiles(errors) {
  for (const [routeId, files] of Object.entries(ROUTE_FILES)) {
    for (const routeFile of files) {
      const source = await readOptional(routeFile)
      if (source === null) {
        addIssue(errors, "ROUTE_FILE_MISSING", `Missing source file for ${routeId}: ${routeFile}`, routeFile)
      }
    }
  }
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
    research: await readOptional(RESEARCH_DOC),
    interfaceContract: await readOptional(INTERFACE_CONTRACT),
    adminReadinessService: await readOptional(ADMIN_READINESS_SERVICE),
  }
  const docsSource = Object.entries(docs)
    .map(([key, value]) => `# ${key}\n${value ?? ""}`)
    .join("\n")

  for (const [label, value] of Object.entries(docs)) {
    if (value === null) addIssue(errors, "SUPPORT_FILE_MISSING", `Required support file is missing: ${label}`, label)
  }

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, errors, CONTRACT_PATH)
  validateRouteCoverage(contractSource, errors)
  validateFieldCoverage(contractSource, errors)
  validateCriticalGapCoverage(contractSource, errors)
  validateForbiddenPatterns(contractSource, FORBIDDEN_CONTRACT_PATTERNS, errors, CONTRACT_PATH)
  validateForbiddenPatterns(contractSource, FORBIDDEN_SECRET_LIKE_PATTERNS, errors, CONTRACT_PATH)
  validatePackageScript(packageJsonSource, errors)
  validateMarkers(docsSource, REQUIRED_DOC_MARKERS, errors, "docs/task memory", "DOC_MARKER_MISSING")
  await validateRouteFiles(errors)

  if (!contractSource.includes("owner_evidence_required") || !contractSource.includes("human_approval_required")) {
    warnings.push({
      code: "MANUAL_OPS_OR_APPROVAL_STATE_LOW_COVERAGE",
      message: "Scenario map should preserve owner evidence and human approval states while proof remains Manual Ops.",
      path: CONTRACT_PATH,
    })
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm l3:scenario:check",
    taskId: "L3-SCENARIO-001",
    status: errors.length === 0 ? "conditional_l3_scenario_routes_ready" : "blocked",
    conditionalProductMaturity: errors.length === 0 ? "C2_SCENARIO_ROUTES_READY" : "C1_INTERFACE_MATRIX_READY",
    formalLaunchLevelUnchanged: "L0_LOCAL_PROTOTYPE",
    prerequisiteConditionalProductMaturity: "C1_INTERFACE_MATRIX_READY",
    scenarioCoverage: {
      requiredRouteCount: REQUIRED_ROUTE_IDS.length,
      requiredRouteIds: REQUIRED_ROUTE_IDS,
      routeFiles: ROUTE_FILES,
      requiredFieldNames: REQUIRED_FIELD_NAMES,
      criticalGapRowsEmpty: (contractSource.match(/missingCriticalForC2:\s*\[\]/g) ?? []).length,
    },
    blockersThatRemainManualOps: ["AUTH-005", "WORK-009", "WORK-007", "DEPLOY-002"],
    checks: {
      requiredContractMarkers: REQUIRED_CONTRACT_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      routeCoverage: REQUIRED_ROUTE_IDS.map((routeId) => ({
        routeId,
        present: contractSource.includes(`routeId: "${routeId}"`),
        sourceFiles: ROUTE_FILES[routeId],
      })),
      fieldCoverage: REQUIRED_FIELD_NAMES.map((field) => ({
        field,
        count: (contractSource.match(new RegExp(`${field}:`, "g")) ?? []).length,
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
    console.log(`Conditional L3 scenario route map: ${proof.status}`)
    console.log(`Conditional product maturity: ${proof.conditionalProductMaturity}`)
    console.log(`Formal launch level unchanged: ${proof.formalLaunchLevelUnchanged}`)
    console.log(`Required routes: ${proof.scenarioCoverage.requiredRouteCount}`)
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
