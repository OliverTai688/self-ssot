#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/operating-audit-storage-review.contract.ts"
const EVENT_CONTRACT_PATH = "src/lib/contracts/operating-audit-event.contract.ts"
const BUILDER_PATH = "src/lib/services/operating-audit-event-builder.ts"
const ARCHITECTURE_DOC = "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_DOC = "tasks.md"
const PACKAGE_JSON = "package.json"

const REQUIRED_REVIEW_IDS = [
  "audit.schema.model-review",
  "audit.schema.index-review",
  "audit.authz.service-boundary",
  "audit.writer.append-only-boundary",
  "audit.dto.redaction-boundary",
  "audit.retention.export-purge-policy",
  "audit.integrity.hash-chain-review",
  "audit.proof-target.disposable-plan",
  "audit.migration.stop-conditions",
  "audit.manual-ops.upgrade-boundary",
]

const REQUIRED_CONTRACT_MARKERS = [
  "AUDIT-OPS-004",
  "OperatingAuditStorageReviewContract",
  "OPERATING_AUDIT_STORAGE_REVIEW_REQUIRED_IDS",
  "OPERATING_AUDIT_STORAGE_REVIEW_ITEMS",
  "OPERATING_AUDIT_STORAGE_REVIEW_CONTRACT",
  "ready_for_storage_review_packet",
  "protected_owner_admin_only",
  "schemaMigrationAllowed: false",
  "runtimeWriteAllowed: false",
  "databaseReadAllowed: false",
  "databaseWriteAllowed: false",
  "routeHandlerAdded: false",
  "serverActionAdded: false",
  "publicOutputAllowed: false",
  "externalRegisterable: false",
  "persistedAuditRowsCreated: false",
  "runtimeAuditStorageImplemented: false",
  "schemaMigrationImplemented: false",
  "databaseReadPerformed: false",
  "databaseWriteAdded: false",
  "publicOutputAdded: false",
  "externalRegistrationEnabled: false",
  "directDatabaseAccessByExternalAgents: false",
  "OWASP Logging Cheat Sheet",
  "Prisma Migrate deploy docs",
  "Supabase/Postgres RLS docs",
]

const REQUIRED_DOC_MARKERS = [
  "AUDIT-OPS-004",
  "operating audit storage review",
  "pnpm audit:storage-review:check",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client import marker", pattern: /from\s+["'][^"']*(?:db|database|prisma)[^"']*["']/i },
  { label: "runtime env read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "server action directive", pattern: /["']use server["']/ },
  { label: "route handler export", pattern: /export\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/ },
  { label: "database URL env marker", pattern: /\b(?:DIRECT_)?DATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_[A-Z0-9_]+\b/ },
  { label: "schema migration enabled marker", pattern: /\bschemaMigrationAllowed\s*:\s*true\b/ },
  { label: "runtime write enabled marker", pattern: /\bruntimeWriteAllowed\s*:\s*true\b/ },
  { label: "database read enabled marker", pattern: /\bdatabaseReadAllowed\s*:\s*true\b/ },
  { label: "database write enabled marker", pattern: /\bdatabaseWriteAllowed\s*:\s*true\b/ },
  { label: "route handler enabled marker", pattern: /\brouteHandlerAdded\s*:\s*true\b/ },
  { label: "server action enabled marker", pattern: /\bserverActionAdded\s*:\s*true\b/ },
  { label: "public output enabled marker", pattern: /\bpublicOutputAllowed\s*:\s*true\b/ },
  { label: "external registerable true marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "persisted audit rows marker", pattern: /\bpersistedAuditRowsCreated\s*:\s*true\b/ },
]

const FORBIDDEN_SECRET_LIKE_PATTERNS = [
  { label: "database connection URL", pattern: /postgres(?:ql)?:\/\/[^"'\s]+/i },
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
  console.log("Validate the Personal OS operating audit storage review contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm audit:storage-review:check")
  console.log("  pnpm audit:storage-review:check -- --json")
  console.log(
    "  pnpm audit:storage-review:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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

function validateSecretLikePatterns(contents, errors, path) {
  for (const item of FORBIDDEN_SECRET_LIKE_PATTERNS) {
    const match = contents.match(item.pattern)
    if (match) {
      addIssue(errors, "SECRET_LIKE_LITERAL", `Contains ${item.label}.`, path, lineFor(contents, match[0]))
    }
  }
}

function validateRequiredIds(contractSource, errors) {
  for (const reviewId of REQUIRED_REVIEW_IDS) {
    if (!contractSource.includes(`"${reviewId}"`)) {
      addIssue(errors, "REVIEW_ID_MISSING", `Missing required review id: ${reviewId}`, CONTRACT_PATH)
    }
  }
}

function validateItemCoverage(contractSource, errors) {
  const itemCount = (contractSource.match(/id: "audit\./g) ?? []).length
  const stopCount = (contractSource.match(/stopCondition:/g) ?? []).length
  const sourceCount = (contractSource.match(/sourceRefs:/g) ?? []).length
  const gateCount = (contractSource.match(/acceptanceGate:/g) ?? []).length
  const falseGuardCount = (contractSource.match(/externalRegisterable: false/g) ?? []).length

  for (const item of [
    ["review items", itemCount, REQUIRED_REVIEW_IDS.length],
    ["stop conditions", stopCount, REQUIRED_REVIEW_IDS.length],
    ["source references", sourceCount, REQUIRED_REVIEW_IDS.length],
    ["acceptance gates", gateCount, REQUIRED_REVIEW_IDS.length],
    ["external registration guards", falseGuardCount, REQUIRED_REVIEW_IDS.length],
  ]) {
    const [label, count, minimum] = item
    if (count < minimum) {
      addIssue(errors, "REVIEW_COVERAGE_INCOMPLETE", `Expected at least ${minimum} ${label}, found ${count}.`, CONTRACT_PATH)
    }
  }
}

function validatePackageScript(packageJsonSource, errors) {
  validateMarkers(
    packageJsonSource,
    ["audit:storage-review:check", "check-operating-audit-storage-review.mjs"],
    errors,
    PACKAGE_JSON
  )
}

async function buildProof() {
  const errors = []
  const warnings = []

  const contractSource = await readText(CONTRACT_PATH)
  const eventContractSource = await readText(EVENT_CONTRACT_PATH)
  const builderSource = await readText(BUILDER_PATH)
  const packageJsonSource = await readText(PACKAGE_JSON)
  const supportSources = {
    architectureDoc: await readOptional(ARCHITECTURE_DOC),
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

  const docsSource = Object.values(supportSources).filter(Boolean).join("\n")

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, errors, CONTRACT_PATH)
  validateMarkers(docsSource, REQUIRED_DOC_MARKERS, errors, "docs/task memory", "DOC_MARKER_MISSING")
  validatePackageScript(packageJsonSource, errors)
  validateRequiredIds(contractSource, errors)
  validateItemCoverage(contractSource, errors)
  validateForbiddenPatterns(contractSource, FORBIDDEN_CONTRACT_PATTERNS, errors, CONTRACT_PATH)
  validateSecretLikePatterns(contractSource, errors, CONTRACT_PATH)

  for (const marker of ["previousEventHash", "eventHash", "redactionVersion", "retentionClass"]) {
    if (!eventContractSource.includes(marker) || !builderSource.includes(marker)) {
      addIssue(errors, "AUDIT_BASELINE_MARKER_MISSING", `Missing baseline marker: ${marker}`, CONTRACT_PATH)
    }
  }

  if (contractSource.includes("blocked_until_proof_target")) {
    warnings.push({
      code: "PROOF_TARGET_STILL_REQUIRED",
      message: "At least one storage-review item is intentionally blocked until an approved disposable proof target exists.",
      path: CONTRACT_PATH,
    })
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm audit:storage-review:check",
    taskId: "AUDIT-OPS-004",
    status: errors.length === 0 ? "ready_for_operating_audit_storage_review" : "blocked",
    contract: {
      contractPath: CONTRACT_PATH,
      eventContractPath: EVENT_CONTRACT_PATH,
      builderPath: BUILDER_PATH,
      acceptanceDoc: ACCEPTANCE_DOC,
      backlogDoc: BACKLOG_DOC,
      requiredReviewIds: REQUIRED_REVIEW_IDS,
      runtimeAuditStorageImplemented: false,
      schemaMigrationImplemented: false,
      routeHandlerAdded: false,
      serverActionAdded: false,
      databaseReadPerformed: false,
      databaseWriteAdded: false,
      publicOutputAdded: false,
      externalRegistrationEnabled: false,
      directDatabaseAccessByExternalAgents: false,
      persistedAuditRowsCreated: false,
      externalRegisterable: false,
    },
    checks: {
      requiredMarkers: REQUIRED_CONTRACT_MARKERS.length,
      requiredReviewIds: REQUIRED_REVIEW_IDS.map((reviewId) => ({
        reviewId,
        present: contractSource.includes(`"${reviewId}"`),
      })),
      supportSourcesChecked: Object.keys(supportSources),
      packageScriptChecked: true,
      docsChecked: true,
      noSecretScan: true,
      noRuntimeImportScan: true,
      noRouteOrServerActionScan: true,
      noPrismaOrDbScan: true,
      noProviderOrNetworkScan: true,
      noExternalRegistrationScan: true,
    },
    safety: {
      printsSecrets: false,
      readsRuntimeEnv: false,
      connectsToDatabase: false,
      readsDatabase: false,
      writesDatabase: false,
      mutatesSchema: false,
      addsRouteHandler: false,
      addsServerAction: false,
      addsPublicOutput: false,
      mutatesProvider: false,
      callsNetwork: false,
      externalRegistryWrite: false,
      directDatabaseAccessByExternalAgents: false,
      persistedAuditRowsCreated: false,
    },
    errors,
    warnings,
    nextAction:
      errors.length === 0
        ? "Use AUDIT-OPS-004 as the manual/proof gate before any persisted OperatingAuditEvent schema, migration, writer, or admin read path."
        : "Fix the storage review contract, docs, package script, or no-write safety markers before audit storage review can gate persistence.",
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
    console.log(`AUDIT-OPS-004 operating audit storage review: ${proof.status}`)
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
