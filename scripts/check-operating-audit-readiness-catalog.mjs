#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/operating-audit-readiness-catalog.contract.ts"
const AUDIT_EVENT_CONTRACT = "src/lib/contracts/operating-audit-event.contract.ts"
const BACKEND_OPERATION_CATALOG = "src/lib/contracts/backend-operation-catalog.contract.ts"
const MODULE_AGENT_COMMAND_CATALOG = "src/lib/contracts/module-agent-command-catalog.contract.ts"
const ARCHITECTURE_DOC = "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md"
const NANDA_DOC = "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_DOC = "tasks.md"
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
  "work.proof.preflight",
  "research.workspace.plan",
  "ai-input.source-workflow.review",
  "workflow.queue.plan",
  "life.routine.propose",
  "finance.review-draft",
  "chamber.relationship.plan",
  "company.strategy.review",
  "client-portal.visibility.preflight",
  "agent.ops.describe-contract",
]

const REQUIRED_EVENT_FAMILIES = [
  "auth.session",
  "work.mutation",
  "ai-input.source-workflow",
  "agent.operation",
  "client-portal.public-access",
  "high-risk.proposal",
  "admin.operator",
]

const REQUIRED_MARKERS = [
  "AUDIT-OPS-002",
  "OPERATING_AUDIT_READINESS_CATALOG",
  "OPERATING_AUDIT_READINESS_CONTRACT",
  "OPERATING_AUDIT_READINESS_REQUIRED_EVENT_FAMILIES",
  "backend_operation_catalog",
  "module_agent_command_catalog",
  "runtimeAuditWriteAllowed: false",
  "schemaMigrationAllowed: false",
  "publicOutputAllowedByThisTask: false",
  "directDatabaseAccessByExternalAgents: false",
  "externalRegisterable: false",
  "runtimeAuditStorageImplemented: false",
  "schemaMigrationImplemented: false",
  "routeHandlerAdded: false",
  "serverActionAdded: false",
  "databaseWriteAdded: false",
  "publicOutputAdded: false",
  "externalRegistrationEnabled: false",
  "OpenTelemetry Logs Data Model",
  "OWASP Logging Cheat Sheet",
  "OWASP A09 Logging and Monitoring Failures",
]

const REQUIRED_DOC_MARKERS = [
  "AUDIT-OPS-002",
  "operating audit readiness",
  "pnpm audit:readiness:check",
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
  { label: "server action directive", pattern: /["']use server["']/ },
  { label: "runtime route handler export", pattern: /export\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/ },
  { label: "external registerable true marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegistrationEnabled\s*:\s*true\b/ },
  { label: "public output added marker", pattern: /\bpublicOutputAdded\s*:\s*true\b/ },
  { label: "runtime audit write enabled marker", pattern: /\bruntimeAuditWriteAllowed\s*:\s*true\b/ },
  { label: "schema migration enabled marker", pattern: /\bschemaMigrationAllowed\s*:\s*true\b/ },
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
  console.log("Validate the Personal OS operating audit readiness catalog")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm audit:readiness:check")
  console.log("  pnpm audit:readiness:check -- --json")
  console.log(
    "  pnpm audit:readiness:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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
    if (!contractSource.includes(`operationId: "${operationId}"`)) {
      addIssue(
        errors,
        "OPERATION_ID_MISSING",
        `Readiness catalog is missing operation id: ${operationId}`,
        CONTRACT_PATH,
        lineFor(contractSource, operationId)
      )
    }
  }
}

function validateEventFamilyCoverage(contractSource, errors) {
  for (const familyKey of REQUIRED_EVENT_FAMILIES) {
    if (!contractSource.includes(`"${familyKey}"`)) {
      addIssue(
        errors,
        "EVENT_FAMILY_MISSING",
        `Readiness catalog is missing event family: ${familyKey}`,
        CONTRACT_PATH,
        lineFor(contractSource, familyKey)
      )
    }
  }
}

function validateRowSafetyDensity(contractSource, errors) {
  const rowCount = (contractSource.match(/operationId: "/g) ?? []).length
  const externalFalseCount = (contractSource.match(/externalRegisterable: false/g) ?? []).length
  const auditWriteFalseCount = (contractSource.match(/runtimeAuditWriteAllowed: false/g) ?? []).length
  const schemaFalseCount = (contractSource.match(/schemaMigrationAllowed: false/g) ?? []).length
  const publicFalseCount = (contractSource.match(/publicOutputAllowedByThisTask: false/g) ?? []).length
  const sourceRefsCount = (contractSource.match(/sourceRefs:/g) ?? []).length
  const stopConditionCount = (contractSource.match(/stopCondition:/g) ?? []).length

  if (rowCount !== REQUIRED_OPERATION_IDS.length) {
    addIssue(
      errors,
      "ROW_COUNT_MISMATCH",
      `Expected ${REQUIRED_OPERATION_IDS.length} readiness rows, found ${rowCount}.`,
      CONTRACT_PATH
    )
  }

  for (const item of [
    ["externalRegisterable false guards", externalFalseCount],
    ["runtime audit no-write guards", auditWriteFalseCount],
    ["schema no-migration guards", schemaFalseCount],
    ["public-output no-expansion guards", publicFalseCount],
    ["source reference lists", sourceRefsCount],
    ["stop conditions", stopConditionCount],
  ]) {
    const [label, count] = item
    if (count < REQUIRED_OPERATION_IDS.length) {
      addIssue(
        errors,
        "ROW_SAFETY_GUARD_INCOMPLETE",
        `Expected at least ${REQUIRED_OPERATION_IDS.length} ${label}, found ${count}.`,
        CONTRACT_PATH
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
    ["audit:readiness:check", "check-operating-audit-readiness-catalog.mjs"],
    errors,
    PACKAGE_JSON
  )
}

async function buildProof() {
  const errors = []
  const warnings = []

  const contractSource = await readText(CONTRACT_PATH)
  const packageJsonSource = await readText(PACKAGE_JSON)
  const supportSources = {
    auditEventContract: await readOptional(AUDIT_EVENT_CONTRACT),
    backendOperationCatalog: await readOptional(BACKEND_OPERATION_CATALOG),
    moduleAgentCommandCatalog: await readOptional(MODULE_AGENT_COMMAND_CATALOG),
    architectureDoc: await readOptional(ARCHITECTURE_DOC),
    nandaDoc: await readOptional(NANDA_DOC),
    acceptanceDoc: await readOptional(ACCEPTANCE_DOC),
    backlogDoc: await readOptional(BACKLOG_DOC),
    sprintDoc: await readOptional(SPRINT_DOC),
    completedLog: await readOptional(COMPLETED_LOG),
    tasksDoc: await readOptional(TASKS_DOC),
  }

  for (const [label, value] of Object.entries(supportSources)) {
    if (value === null) {
      addIssue(errors, "SUPPORT_SOURCE_MISSING", `Required support source is missing: ${label}`, label)
    }
  }

  const docsSource = [
    supportSources.architectureDoc,
    supportSources.acceptanceDoc,
    supportSources.backlogDoc,
    supportSources.sprintDoc,
    supportSources.completedLog,
    supportSources.tasksDoc,
  ]
    .filter(Boolean)
    .join("\n")

  validateMarkers(contractSource, REQUIRED_MARKERS, errors, CONTRACT_PATH)
  validateOperationCoverage(contractSource, errors)
  validateEventFamilyCoverage(contractSource, errors)
  validateRowSafetyDensity(contractSource, errors)
  validateForbiddenPatterns(contractSource, FORBIDDEN_CONTRACT_PATTERNS, errors, CONTRACT_PATH)
  validateSecretLikePatterns(contractSource, errors, CONTRACT_PATH)
  validatePackageScript(packageJsonSource, errors)
  validateMarkers(docsSource, REQUIRED_DOC_MARKERS, errors, "docs/task memory", "DOC_MARKER_MISSING")

  if (!contractSource.includes("requiredBackendOperationCount: 13")) {
    addIssue(
      errors,
      "BACKEND_OPERATION_COUNT_MISSING",
      "Readiness contract must pin 13 backend operation rows.",
      CONTRACT_PATH
    )
  }

  if (!contractSource.includes("requiredModuleAgentCommandCount: 10")) {
    addIssue(
      errors,
      "MODULE_AGENT_COMMAND_COUNT_MISSING",
      "Readiness contract must pin 10 module agent command rows.",
      CONTRACT_PATH
    )
  }

  if (contractSource.includes("requiresHumanApproval: false") && contractSource.includes("CRITICAL")) {
    warnings.push({
      code: "CRITICAL_ROWS_REQUIRE_MANUAL_REVIEW_CHECK",
      message: "Critical rows are present; checker relies on row-level human approval markers and static review.",
      path: CONTRACT_PATH,
    })
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm audit:readiness:check",
    taskId: "AUDIT-OPS-002",
    status: errors.length === 0 ? "ready_for_operating_audit_readiness_mapping" : "blocked",
    contract: {
      path: CONTRACT_PATH,
      operationCount: REQUIRED_OPERATION_IDS.length,
      eventFamilyCount: REQUIRED_EVENT_FAMILIES.length,
      requiredBackendOperationCount: 13,
      requiredModuleAgentCommandCount: 10,
      runtimeAuditStorageImplemented: false,
      schemaMigrationImplemented: false,
      routeHandlerAdded: false,
      serverActionAdded: false,
      databaseWriteAdded: false,
      publicOutputAdded: false,
      externalRegistrationEnabled: false,
      directDatabaseAccessByExternalAgents: false,
    },
    checks: {
      requiredMarkers: REQUIRED_MARKERS.length,
      requiredOperationIds: REQUIRED_OPERATION_IDS,
      requiredEventFamilies: REQUIRED_EVENT_FAMILIES,
      supportSourcesChecked: Object.keys(supportSources),
      packageScriptChecked: true,
      docsChecked: true,
      noSecretScan: true,
      noRuntimeImportScan: true,
      noRouteOrServerActionScan: true,
      noExternalRegistrationScan: true,
    },
    safety: {
      printsSecrets: false,
      readsRuntimeEnv: false,
      connectsToDatabase: false,
      writesDatabase: false,
      mutatesSchema: false,
      addsRouteHandler: false,
      addsServerAction: false,
      addsPublicOutput: false,
      mutatesProvider: false,
      externalRegistryWrite: false,
      directDatabaseAccessByExternalAgents: false,
      persistedAuditRowsCreated: false,
    },
    errors,
    warnings,
    nextAction:
      errors.length === 0
        ? "Use this mapping to scope the next persisted audit/storage task; do not write audit rows until schema, auth, retention, and proof target approvals exist."
        : "Fix readiness catalog, docs, package script, or safety marker regressions before using this mapping.",
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
    console.log(`AUDIT-OPS-002 operating audit readiness catalog: ${proof.status}`)
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
