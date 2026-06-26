#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/backend-operation-catalog.contract.ts"
const ADMIN_READINESS_SERVICE = "src/lib/services/admin-readiness.service.ts"
const ADMIN_PAGE = "src/app/(dashboard)/admin/page.tsx"
const SETTINGS_PAGE = "src/app/(dashboard)/settings/page.tsx"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_DOC = "tasks.md"
const FORMAL_REPORT = "docs/06_audits-and-reports/RPT-019_loop-93-research-gap-review.md"
const PACKAGE_JSON = "package.json"

const REQUIRED_OPERATION_IDS = [
  "launch.proof",
  "auth.session-proof",
  "work.target-readiness",
  "work.docker-disposable",
  "work.server-actions",
  "work.source-smoke",
  "client.portal.gated-loader",
  "agent.operations.dry-run-api",
  "module.resource-index-check",
  "module.realdata-check",
  "launch.operator-actions-check",
  "backend.operation-catalog-check",
  "agent.external-registration-approval",
]

const REQUIRED_CONTRACT_MARKERS = [
  "BackendOperationCatalogContract",
  "BackendOperationCatalogRow",
  "BACKEND-OPS-001",
  "BACKEND_OPERATION_REQUIRED_IDS",
  "BACKEND_OPERATION_PROHIBITED_EXPOSURE",
  "BACKEND_OPERATION_CATALOG",
  "route_handler",
  "server_action",
  "service_loader",
  "cli_check_command",
  "agent_dry_run_operation",
  "owner_run_proof_command",
  "proposal_only_operation",
  "blocked_high_risk_operation",
  "authBoundary",
  "dataBoundary",
  "auditNeed",
  "idempotencyOrRetry",
  "stopCondition",
  "publicOpenApiExported: false",
  "publicRouteAdded: false",
  "externalRegistrationEnabled: false",
  "externalRegisterable: false",
]

const REQUIRED_DOC_MARKERS = [
  "BACKEND-OPS-001",
  "BACKEND-OPS-002",
  "backend operation catalog",
  "pnpm backend:ops:check",
  "launch proof",
  "auth proof",
  "Work server actions",
  "Client Portal gated loader",
  "protected agent dry-run API",
  "external registration approval",
]

const REQUIRED_SURFACE_MARKERS = [
  "BackendOperationCatalogSurfaceContract",
  "BackendOperationCatalogSurfaceRow",
  "buildBackendOperationCatalogSurfaceContract",
  "BACKEND-OPS-002",
  "pageRequirementUnderstanding",
  "completedResearchRounds: 3",
  "externalRegistrationEnabled: false",
  "publicOpenApiExported: false",
  "publicRouteAdded: false",
]

const REQUIRED_ADMIN_PAGE_MARKERS = [
  "BackendOperationCatalogSurfaceTable",
  "backendOperationCatalogSurfaceContract",
  "Backend operation catalog",
  "Page understanding gate",
  "Owner actions",
  "No-secret boundary",
]

const REQUIRED_SETTINGS_PAGE_MARKERS = [
  "buildBackendOperationCatalogSurfaceContract",
  "backendOperationCatalogSurfaceContract",
  "Backend operation controls",
  "external registration disabled",
  "Owner control",
  "No-secret exclusions",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client import marker", pattern: /from\s+["'][^"']*(?:db|database|prisma)[^"']*["']/i },
  { label: "runtime env read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_[A-Z0-9_]+\b/ },
  { label: "external registerable true marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "public OpenAPI exported marker", pattern: /\bpublicOpenApiExported\s*:\s*true\b/ },
  { label: "public route added marker", pattern: /\bpublicRouteAdded\s*:\s*true\b/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegistrationEnabled\s*:\s*true\b/ },
]

const FORBIDDEN_UI_EXECUTION_PATTERNS = [
  { label: "child process execution", pattern: /\b(?:exec|execFile|spawn|spawnSync)\s*\(/ },
  { label: "server action directive", pattern: /["']use server["']/ },
  { label: "runtime route handler export", pattern: /export\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/ },
  { label: "external registerable true marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegistrationEnabled\s*:\s*true\b/ },
  { label: "public OpenAPI exported marker", pattern: /\bpublicOpenApiExported\s*:\s*true\b/ },
  { label: "public route added marker", pattern: /\bpublicRouteAdded\s*:\s*true\b/ },
]

const FORBIDDEN_SECRET_LIKE_PATTERNS = [
  { label: "database connection URL", pattern: /postgres(?:ql)?:\/\/[^"'\s]+/i },
  { label: "Supabase auth API URL", pattern: /supabase\.co\/auth\/v1/i },
  { label: "JWT-like token", pattern: /eyJ[A-Za-z0-9_-]{20,}/ },
  { label: "service role key marker", pattern: /service[-_ ]?role[-_ ]?key\s*[:=]/i },
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
  console.log("Validate the Personal OS backend operation catalog contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm backend:ops:check")
  console.log("  pnpm backend:ops:check -- --json")
  console.log(
    "  pnpm backend:ops:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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

function validateOperationCoverage(contractSource, errors) {
  for (const operationId of REQUIRED_OPERATION_IDS) {
    const occurrences = contractSource.split(`"${operationId}"`).length - 1
    if (occurrences < 2) {
      addIssue(
        errors,
        "OPERATION_ID_MISSING",
        `Operation id must appear in required ids and row data: ${operationId}`,
        CONTRACT_PATH,
        lineFor(contractSource, operationId)
      )
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

function validateSecretLikePatterns(contents, errors, path) {
  for (const item of FORBIDDEN_SECRET_LIKE_PATTERNS) {
    const match = contents.match(item.pattern)
    if (match) {
      addIssue(errors, "SECRET_LIKE_LITERAL", `Contains ${item.label}.`, path, lineFor(contents, match[0]))
    }
  }
}

function validatePackageScript(packageJsonSource, errors) {
  validateMarkers(
    packageJsonSource,
    ["backend:ops:check", "check-backend-operation-catalog.mjs"],
    errors,
    PACKAGE_JSON
  )
}

function validateDocs(docsSource, errors) {
  validateMarkers(docsSource, REQUIRED_DOC_MARKERS, errors, "docs/task memory", "DOC_MARKER_MISSING")
}

async function buildProof() {
  const errors = []
  const warnings = []

  const contractSource = await readText(CONTRACT_PATH)
  const serviceSource = await readText(ADMIN_READINESS_SERVICE)
  const adminPageSource = await readText(ADMIN_PAGE)
  const settingsPageSource = await readText(SETTINGS_PAGE)
  const packageJsonSource = await readText(PACKAGE_JSON)
  const docs = {
    acceptance: await readOptional(ACCEPTANCE_DOC),
    backlog: await readOptional(BACKLOG_DOC),
    sprint: await readOptional(SPRINT_DOC),
    completedLog: await readOptional(COMPLETED_LOG),
    tasks: await readOptional(TASKS_DOC),
    formalReport: await readOptional(FORMAL_REPORT),
  }
  const docsSource = Object.entries(docs)
    .map(([key, value]) => `# ${key}\n${value ?? ""}`)
    .join("\n")

  for (const [label, value] of Object.entries(docs)) {
    if (value === null) {
      addIssue(errors, "DOC_MISSING", `Required document is missing: ${label}`, label)
    }
  }

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, errors, CONTRACT_PATH)
  validateMarkers(serviceSource, REQUIRED_SURFACE_MARKERS, errors, ADMIN_READINESS_SERVICE, "SURFACE_MARKER_MISSING")
  validateMarkers(adminPageSource, REQUIRED_ADMIN_PAGE_MARKERS, errors, ADMIN_PAGE, "ADMIN_PAGE_MARKER_MISSING")
  validateMarkers(settingsPageSource, REQUIRED_SETTINGS_PAGE_MARKERS, errors, SETTINGS_PAGE, "SETTINGS_PAGE_MARKER_MISSING")
  validateOperationCoverage(contractSource, errors)
  validateForbiddenPatterns(contractSource, FORBIDDEN_CONTRACT_PATTERNS, errors, CONTRACT_PATH)
  validateForbiddenPatterns(serviceSource, FORBIDDEN_UI_EXECUTION_PATTERNS, errors, ADMIN_READINESS_SERVICE)
  validateForbiddenPatterns(adminPageSource, FORBIDDEN_UI_EXECUTION_PATTERNS, errors, ADMIN_PAGE)
  validateForbiddenPatterns(settingsPageSource, FORBIDDEN_UI_EXECUTION_PATTERNS, errors, SETTINGS_PAGE)
  validateSecretLikePatterns(contractSource, errors, CONTRACT_PATH)
  validateSecretLikePatterns(serviceSource, errors, ADMIN_READINESS_SERVICE)
  validateSecretLikePatterns(adminPageSource, errors, ADMIN_PAGE)
  validateSecretLikePatterns(settingsPageSource, errors, SETTINGS_PAGE)
  validatePackageScript(packageJsonSource, errors)
  validateDocs(docsSource, errors)

  if (!contractSource.includes("writesDatabase: true")) {
    addIssue(
      errors,
      "DB_WRITE_BOUNDARY_MISSING",
      "Catalog must explicitly identify at least one operation with a DB write boundary.",
      CONTRACT_PATH
    )
  }

  if (!contractSource.includes("requiresHumanApproval: true")) {
    addIssue(
      errors,
      "HUMAN_APPROVAL_BOUNDARY_MISSING",
      "Catalog must explicitly identify high-risk operations requiring human approval.",
      CONTRACT_PATH
    )
  }

  if (contractSource.includes("public output expansion") && !contractSource.includes("exposesPublicOutput: true")) {
    warnings.push({
      code: "PUBLIC_OUTPUT_TEXT_PRESENT",
      message:
        "Contract mentions public output expansion; confirm public-output operations remain approval-required or blocked.",
      path: CONTRACT_PATH,
    })
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm backend:ops:check",
    taskId: "BACKEND-OPS-002",
    status: errors.length === 0 ? "ready_for_backend_operation_catalog_use" : "blocked",
    contract: {
      path: CONTRACT_PATH,
      operationCount: REQUIRED_OPERATION_IDS.length,
      requiredOperationIds: REQUIRED_OPERATION_IDS,
      coversRouteHandlers: contractSource.includes("route_handler"),
      coversServerActions: contractSource.includes("server_action"),
      coversServiceLoaders: contractSource.includes("service_loader"),
      coversCliChecks: contractSource.includes("cli_check_command"),
      coversAgentDryRuns: contractSource.includes("agent_dry_run_operation"),
      externalRegisterable: false,
      publicOpenApiExported: false,
      publicRouteAdded: false,
      databaseSchemaChanged: false,
      runtimeRouteAddedByThisTask: false,
      protectedAdminSettingsSurfaceReady: errors.length === 0,
      backendOps002Integrated: true,
    },
    checks: {
      requiredMarkers: REQUIRED_CONTRACT_MARKERS.length,
      requiredSurfaceMarkers: REQUIRED_SURFACE_MARKERS.length,
      requiredAdminPageMarkers: REQUIRED_ADMIN_PAGE_MARKERS.length,
      requiredSettingsPageMarkers: REQUIRED_SETTINGS_PAGE_MARKERS.length,
      requiredOperationIds: REQUIRED_OPERATION_IDS.length,
      packageScriptChecked: true,
      docsChecked: Object.keys(docs),
      noSecretScan: true,
      noRuntimeImportScan: true,
      noUiCommandExecutionScan: true,
      noExternalRegistrationScan: true,
    },
    safety: {
      printsSecrets: false,
      readsRuntimeEnv: false,
      connectsToDatabase: false,
      writesDatabase: false,
      addsPublicOutput: false,
      mutatesProvider: false,
      externalRegistryWrite: false,
      shellCommandExecutionFromUi: false,
      prohibitedExposure: [
        "Supabase URLs or keys",
        "database URLs or hosts",
        "cookies or tokens",
        "raw auth claims",
        "provider payloads",
        "profile IDs",
        "row IDs",
        "raw request bodies",
        "raw response payload bodies",
        "raw generated proof bodies",
        "client share tokens",
        "deployment provider credentials",
        "external registry writes",
      ],
    },
    errors,
    warnings,
    nextAction:
      errors.length === 0
        ? "Use the protected admin/settings catalog surface for owner/operator review; run AUTH-005 or WORK-009 only when proof prerequisites appear."
        : "Fix contract, package, docs, no-secret, or operation coverage regressions before relying on the catalog.",
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
    const outPath = repoPath(args.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(proof, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else {
    console.log(`BACKEND-OPS-002 backend operation catalog surface: ${proof.status}`)
    if (proof.errors.length > 0) {
      for (const error of proof.errors) {
        console.log(`- ${error.code}: ${error.message}`)
      }
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
