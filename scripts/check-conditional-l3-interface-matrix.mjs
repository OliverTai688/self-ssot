#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/conditional-l3-interface-matrix.contract.ts"
const PACKAGE_JSON = "package.json"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_DOC = "tasks.md"
const RESEARCH_DOC = "docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md"
const INTERFACE_SMOKE_SCRIPT = "scripts/check-interface-operability.mjs"

const ROUTE_FILES = {
  frontstage: "src/app/page.tsx",
  login: "src/app/(auth)/login/page.tsx",
  dashboard: "src/app/(dashboard)/dashboard/page.tsx",
  settings: "src/app/(dashboard)/settings/page.tsx",
  admin: "src/app/(dashboard)/admin/page.tsx",
  work: "src/app/(dashboard)/work/page.tsx",
  research: "src/app/(dashboard)/research/page.tsx",
  "ai-input": "src/app/(dashboard)/ai-input/page.tsx",
  workflow: "src/app/(dashboard)/workflow/page.tsx",
  life: "src/app/(dashboard)/life/page.tsx",
  finance: "src/app/(dashboard)/finance/page.tsx",
  chamber: "src/app/(dashboard)/chamber/page.tsx",
  company: "src/app/(dashboard)/company/page.tsx",
  "client-portal": "src/app/client/[token]/page.tsx",
  agents: "src/app/(dashboard)/agents/page.tsx",
}

const REQUIRED_SURFACE_IDS = Object.keys(ROUTE_FILES)

const REQUIRED_CONTRACT_MARKERS = [
  "CONDITIONAL_L3_INTERFACE_MATRIX",
  "CONDITIONAL_L3_INTERFACE_MATRIX_SUMMARY",
  "CONDITIONAL_L3_REQUIRED_SURFACE_IDS",
  "L3-UI-001",
  "C1_INTERFACE_MATRIX_READY",
  "L0_LOCAL_PROTOTYPE",
  "M1_MANUAL_OPS_READY",
  "AUTH-005",
  "WORK-009",
  "WORK-007",
  "DEPLOY-002",
  "identityMode",
  "primaryAction",
  "resourceOrWorkbench",
  "commandPath",
  "detailOrInspection",
  "agentWorkspace",
  "recordsOrReadiness",
  "settingsOrBoundaries",
  "stateLabel",
  "mobileDesktop",
  "noSecretBoundary",
  "externalRegisterable: false",
  "directDatabaseAccessByExternalAgents: false",
  "publicOutputExpanded: false",
  "routeHandlerAdded: false",
  "serverActionAdded: false",
  "schemaChanged: false",
  "readsDatabase: false",
  "writesDatabase: false",
  "providerCallAdded: false",
  "autonomousExecutionEnabled: false",
]

const REQUIRED_DOC_MARKERS = [
  "L3-UI-001",
  "Conditional L3 interface completeness",
  "C1_INTERFACE_MATRIX_READY",
  "pnpm l3:interface:check",
  "CONDITIONAL_L3_INTERFACE_MATRIX",
  "L3-SCENARIO-001",
  "L3-ARCH-001",
]

const VIEWFRAME_FIELDS = [
  "identityMode",
  "primaryAction",
  "resourceOrWorkbench",
  "commandPath",
  "detailOrInspection",
  "agentWorkspace",
  "recordsOrReadiness",
  "settingsOrBoundaries",
  "stateLabel",
  "mobileDesktop",
  "noSecretBoundary",
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
]

const FORBIDDEN_SECRET_LIKE_PATTERNS = [
  { label: "database connection URL", pattern: /postgres(?:ql)?:\/\/[^"'\s]+/i },
  { label: "JWT-like token", pattern: /eyJ[A-Za-z0-9_-]{20,}/ },
  { label: "service role key marker", pattern: /service[-_ ]?role[-_ ]?key\s*[:=]/i },
  { label: "raw cookie marker", pattern: /\bcookie\s*[:=]\s*["'][^"']{12,}/i },
]

function parseArgs(argv) {
  const args = {
    json: false,
    out: null,
    help: false,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
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

  return args
}

function printHelp() {
  console.log("Validate the Personal OS conditional L3 interface matrix")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm l3:interface:check")
  console.log("  pnpm l3:interface:check -- --json")
  console.log(
    "  pnpm l3:interface:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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
    if (!contents.includes(marker)) {
      addIssue(errors, code, `Missing required marker: ${marker}`, path)
    }
  }
}

function validateForbiddenPatterns(contents, patterns, errors, path) {
  for (const item of patterns) {
    const match = contents.match(item.pattern)
    if (match) {
      addIssue(errors, "FORBIDDEN_MARKER", `Contains ${item.label}.`, path, lineFor(contents, match[0]))
    }
  }
}

function validateSurfaceCoverage(contractSource, errors) {
  for (const surfaceId of REQUIRED_SURFACE_IDS) {
    const occurrenceCount = contractSource.split(`"${surfaceId}"`).length - 1
    if (occurrenceCount < 2) {
      addIssue(
        errors,
        "SURFACE_ID_MISSING",
        `Surface id must appear in required ids and matrix rows: ${surfaceId}`,
        CONTRACT_PATH,
        lineFor(contractSource, surfaceId)
      )
    }
  }
}

function validateViewframeCoverage(contractSource, errors) {
  const sharedMobileSecretSpreadCount = (contractSource.match(/\.\.\.READY_MOBILE_SECRET/g) ?? []).length
  for (const field of VIEWFRAME_FIELDS) {
    const count = (contractSource.match(new RegExp(`${field}:`, "g")) ?? []).length
    const effectiveCount =
      field === "mobileDesktop" || field === "noSecretBoundary" ? count + sharedMobileSecretSpreadCount : count
    if (effectiveCount < REQUIRED_SURFACE_IDS.length) {
      addIssue(
        errors,
        "VIEWFRAME_FIELD_INCOMPLETE",
        `Expected at least ${REQUIRED_SURFACE_IDS.length} ${field} entries, found ${effectiveCount}.`,
        CONTRACT_PATH,
        lineFor(contractSource, field)
      )
    }
  }
}

function validateCriticalGapCoverage(contractSource, errors) {
  const emptyCriticalGapRows = (contractSource.match(/missingCriticalForConditionalL3:\s*\[\]/g) ?? []).length
  if (emptyCriticalGapRows < REQUIRED_SURFACE_IDS.length) {
    addIssue(
      errors,
      "CRITICAL_GAP_FIELD_INCOMPLETE",
      `Expected each surface to state no critical conditional L3 interface gap; found ${emptyCriticalGapRows}.`,
      CONTRACT_PATH
    )
  }
}

function validatePackageScript(packageJsonSource, errors) {
  validateMarkers(
    packageJsonSource,
    ["l3:interface:check", "check-conditional-l3-interface-matrix.mjs"],
    errors,
    PACKAGE_JSON,
    "PACKAGE_SCRIPT_MISSING"
  )
}

async function validateRouteFiles(errors) {
  for (const [surfaceId, routeFile] of Object.entries(ROUTE_FILES)) {
    const source = await readOptional(routeFile)
    if (source === null) {
      addIssue(errors, "ROUTE_FILE_MISSING", `Missing route file for ${surfaceId}: ${routeFile}`, routeFile)
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
    interfaceSmoke: await readOptional(INTERFACE_SMOKE_SCRIPT),
  }
  const docsSource = Object.entries(docs)
    .map(([key, value]) => `# ${key}\n${value ?? ""}`)
    .join("\n")

  for (const [label, value] of Object.entries(docs)) {
    if (value === null) {
      addIssue(errors, "SUPPORT_FILE_MISSING", `Required support file is missing: ${label}`, label)
    }
  }

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, errors, CONTRACT_PATH)
  validateSurfaceCoverage(contractSource, errors)
  validateViewframeCoverage(contractSource, errors)
  validateCriticalGapCoverage(contractSource, errors)
  validateForbiddenPatterns(contractSource, FORBIDDEN_CONTRACT_PATTERNS, errors, CONTRACT_PATH)
  validateForbiddenPatterns(contractSource, FORBIDDEN_SECRET_LIKE_PATTERNS, errors, CONTRACT_PATH)
  validatePackageScript(packageJsonSource, errors)
  validateMarkers(docsSource, REQUIRED_DOC_MARKERS, errors, "docs/task memory", "DOC_MARKER_MISSING")
  await validateRouteFiles(errors)

  if (!contractSource.includes("manual_ops")) {
    warnings.push({
      code: "MANUAL_OPS_STATE_ABSENT",
      message: "Matrix should preserve at least one Manual Ops state while formal proof remains owner-run.",
      path: CONTRACT_PATH,
    })
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm l3:interface:check",
    taskId: "L3-UI-001",
    status: errors.length === 0 ? "conditional_l3_interface_matrix_ready" : "blocked",
    conditionalProductMaturity: errors.length === 0 ? "C1_INTERFACE_MATRIX_READY" : "C0_RESEARCH_READY",
    formalLaunchLevelUnchanged: "L0_LOCAL_PROTOTYPE",
    surfaceCoverage: {
      requiredSurfaceCount: REQUIRED_SURFACE_IDS.length,
      requiredSurfaceIds: REQUIRED_SURFACE_IDS,
      routeFiles: ROUTE_FILES,
      viewframeFields: VIEWFRAME_FIELDS,
      criticalGapRowsEmpty: (contractSource.match(/missingCriticalForConditionalL3:\s*\[\]/g) ?? []).length,
    },
    blockersThatRemainManualOps: ["AUTH-005", "WORK-009", "WORK-007", "DEPLOY-002"],
    checks: {
      requiredContractMarkers: REQUIRED_CONTRACT_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      surfaceCoverage: REQUIRED_SURFACE_IDS.map((surfaceId) => ({
        surfaceId,
        present: contractSource.includes(`surfaceId: "${surfaceId}"`),
        routeFile: ROUTE_FILES[surfaceId],
      })),
      viewframeCoverage: VIEWFRAME_FIELDS.map((field) => ({
        field,
        count: (contractSource.match(new RegExp(`${field}:`, "g")) ?? []).length,
        sharedSpreadCount:
          field === "mobileDesktop" || field === "noSecretBoundary"
            ? (contractSource.match(/\.\.\.READY_MOBILE_SECRET/g) ?? []).length
            : 0,
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
    await mkdir(dirname(repoPath(args.out)), { recursive: true })
    await writeFile(repoPath(args.out), `${JSON.stringify(proof, null, 2)}\n`, "utf8")
  }

  if (args.json || args.out) {
    console.log(JSON.stringify(proof, null, 2))
  } else if (proof.status === "conditional_l3_interface_matrix_ready") {
    console.log(
      `L3-UI-001 conditional interface matrix ready: ${proof.surfaceCoverage.requiredSurfaceCount} surfaces checked; formal launch remains ${proof.formalLaunchLevelUnchanged}.`
    )
  } else {
    console.error(`L3-UI-001 conditional interface matrix blocked: ${proof.errors.length} issue(s).`)
    for (const error of proof.errors) {
      const location = error.line ? `${error.path}:${error.line}` : error.path
      console.error(`- [${error.code}] ${location} ${error.message}`)
    }
  }

  if (proof.errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
