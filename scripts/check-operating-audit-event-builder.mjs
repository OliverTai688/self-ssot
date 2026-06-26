#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const BUILDER_PATH = "src/lib/services/operating-audit-event-builder.ts"
const READINESS_CATALOG_PATH = "src/lib/contracts/operating-audit-readiness-catalog.contract.ts"
const EVENT_CONTRACT_PATH = "src/lib/contracts/operating-audit-event.contract.ts"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const TASKS_DOC = "tasks.md"
const PACKAGE_JSON = "package.json"

const REQUIRED_EVENT_FAMILIES = [
  "auth.session",
  "work.mutation",
  "ai-input.source-workflow",
  "agent.operation",
  "client-portal.public-access",
  "high-risk.proposal",
  "admin.operator",
]

const REQUIRED_OPERATION_IDS = [
  "launch.proof",
  "work.proof.preflight",
  "client-portal.visibility.preflight",
]

const REQUIRED_BUILDER_MARKERS = [
  "AUDIT-OPS-003",
  "import \"server-only\"",
  "buildOperatingAuditEventDraft",
  "buildRepresentativeOperatingAuditDrafts",
  "redactOperatingAuditMetadata",
  "OPERATING_AUDIT_EVENT_BUILDER_CONTRACT",
  "OPERATING_AUDIT_EVENT_BUILDER_SAMPLE_INPUTS",
  "draft_only_not_persisted",
  "redactionVersion",
  "retentionClass",
  "previousEventHash",
  "eventHash",
  "runtimeAuditStorageImplemented: false",
  "schemaMigrationImplemented: false",
  "routeHandlerAdded: false",
  "serverActionAdded: false",
  "databaseReadPerformed: false",
  "databaseWriteAdded: false",
  "providerCalled: false",
  "networkCalled: false",
  "publicOutputAdded: false",
  "externalRegistrationEnabled: false",
  "directDatabaseAccessByExternalAgents: false",
  "persistedAuditRowsCreated: false",
  "externalRegisterable: false",
]

const REQUIRED_DOC_MARKERS = [
  "AUDIT-OPS-003",
  "operating audit event envelope builder",
  "pnpm audit:event-builder:check",
]

const FORBIDDEN_BUILDER_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client import marker", pattern: /from\s+["'][^"']*(?:db|database|prisma)[^"']*["']/i },
  { label: "runtime env read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "server action directive", pattern: /["']use server["']/ },
  { label: "route handler export", pattern: /export\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_[A-Z0-9_]+\b/ },
  { label: "external registerable true marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegistrationEnabled\s*:\s*true\b/ },
  { label: "public output enabled marker", pattern: /\bpublicOutputAdded\s*:\s*true\b/ },
  { label: "database write enabled marker", pattern: /\bdatabaseWriteAdded\s*:\s*true\b/ },
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
  console.log("Validate the Personal OS operating audit event envelope builder")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm audit:event-builder:check")
  console.log("  pnpm audit:event-builder:check -- --json")
  console.log(
    "  pnpm audit:event-builder:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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

function validateOperationSamples(builderSource, errors) {
  for (const operationId of REQUIRED_OPERATION_IDS) {
    if (!builderSource.includes(`operationId: "${operationId}"`)) {
      addIssue(
        errors,
        "REPRESENTATIVE_DRAFT_MISSING",
        `Builder sample inputs must include operation id: ${operationId}`,
        BUILDER_PATH
      )
    }
  }
}

function validatePackageScript(packageJsonSource, errors) {
  validateMarkers(
    packageJsonSource,
    ["audit:event-builder:check", "check-operating-audit-event-builder.mjs"],
    errors,
    PACKAGE_JSON
  )
}

async function buildProof() {
  const errors = []
  const warnings = []

  const builderSource = await readText(BUILDER_PATH)
  const readinessSource = await readText(READINESS_CATALOG_PATH)
  const eventContractSource = await readText(EVENT_CONTRACT_PATH)
  const packageJsonSource = await readText(PACKAGE_JSON)
  const supportSources = {
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

  validateMarkers(builderSource, REQUIRED_BUILDER_MARKERS, errors, BUILDER_PATH)
  validateMarkers(docsSource, REQUIRED_DOC_MARKERS, errors, "docs/task memory", "DOC_MARKER_MISSING")
  validatePackageScript(packageJsonSource, errors)
  validateOperationSamples(builderSource, errors)
  validateForbiddenPatterns(builderSource, FORBIDDEN_BUILDER_PATTERNS, errors, BUILDER_PATH)
  validateSecretLikePatterns(builderSource, errors, BUILDER_PATH)

  for (const familyKey of REQUIRED_EVENT_FAMILIES) {
    if (!readinessSource.includes(`"${familyKey}"`) || !eventContractSource.includes(`familyKey: "${familyKey}"`)) {
      addIssue(errors, "EVENT_FAMILY_MISSING", `Missing required event family: ${familyKey}`, READINESS_CATALOG_PATH)
    }
  }

  if (builderSource.includes("redacted-by-builder")) {
    warnings.push({
      code: "SAMPLE_METADATA_REDACTION_FIXTURE",
      message: "Sample input includes a token-like metadata key to prove redaction stays in the builder boundary.",
      path: BUILDER_PATH,
    })
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm audit:event-builder:check",
    taskId: "AUDIT-OPS-003",
    status: errors.length === 0 ? "ready_for_operating_audit_event_drafts" : "blocked",
    contract: {
      builderPath: BUILDER_PATH,
      readinessCatalogPath: READINESS_CATALOG_PATH,
      eventContractPath: EVENT_CONTRACT_PATH,
      acceptanceDoc: ACCEPTANCE_DOC,
      backlogDoc: BACKLOG_DOC,
      representativeDraftOperationIds: REQUIRED_OPERATION_IDS,
      requiredEventFamilies: REQUIRED_EVENT_FAMILIES,
      runtimeAuditStorageImplemented: false,
      schemaMigrationImplemented: false,
      routeHandlerAdded: false,
      serverActionAdded: false,
      databaseReadPerformed: false,
      databaseWriteAdded: false,
      providerCalled: false,
      networkCalled: false,
      publicOutputAdded: false,
      externalRegistrationEnabled: false,
      directDatabaseAccessByExternalAgents: false,
      persistedAuditRowsCreated: false,
      externalRegisterable: false,
    },
    checks: {
      requiredMarkers: REQUIRED_BUILDER_MARKERS.length,
      representativeDrafts: REQUIRED_OPERATION_IDS.map((operationId) => ({
        operationId,
        present: builderSource.includes(`operationId: "${operationId}"`),
      })),
      eventFamilies: REQUIRED_EVENT_FAMILIES,
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
        ? "Use the draft builder as the final no-write step before a reviewed persisted OperatingAuditEvent schema/storage task."
        : "Fix builder, docs, package script, or safety marker regressions before using audit event drafts.",
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
    console.log(`AUDIT-OPS-003 operating audit event builder: ${proof.status}`)
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
