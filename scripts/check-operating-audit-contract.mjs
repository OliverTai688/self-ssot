#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/operating-audit-event.contract.ts"
const ARCHITECTURE_DOC = "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const ADMIN_AUDIT_DOC = "docs/02_architecture-and-rules/ARC-026_admin-settings-audit-bff.md"
const REAL_DATA_DOC = "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md"
const AGENT_OP_DOC = "docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md"

const REQUIRED_MODULE_KEYS = [
  "work",
  "research",
  "ai-input",
  "workflow",
  "life",
  "finance",
  "chamber",
  "company",
  "client-portal",
  "agent-team-os",
  "auth",
  "admin",
  "settings",
  "deployment",
]

const REQUIRED_MARKERS = [
  "OPERATING_AUDIT_EVENT_FIELDS",
  "OPERATING_AUDIT_EVENT_FAMILIES",
  "OPERATING_AUDIT_BFF_CONTRACT",
  "OPERATING_AUDIT_CONTRACT_SUMMARY",
  "appendOnlyRequired: true",
  "schemaWriteAllowed: false",
  "runtimeWriteAllowed: false",
  "publicOutputExpansion: false",
  "previousEventHash",
  "eventHash",
  "redactionVersion",
  "retentionClass",
  "AUTH-005",
  "WORK-009",
  "DATTR-024-SPLIT",
  "CLIENT-005",
  "AGENT-OPS-001",
  "DEPLOY-002",
]

const REQUIRED_FAMILY_KEYS = [
  "auth.session",
  "work.mutation",
  "ai-input.source-workflow",
  "agent.operation",
  "client-portal.public-access",
  "high-risk.proposal",
  "admin.operator",
]

const REQUIRED_FIELD_NAMES = [
  "actorType",
  "actorRef",
  "moduleKey",
  "action",
  "targetType",
  "targetRef",
  "result",
  "riskLevel",
  "approvalLevel",
  "humanApprovalRequired",
  "sourceKind",
  "sourceRef",
  "agentRef",
  "operationId",
  "proposalRef",
  "proofRef",
  "metadata",
  "redactionVersion",
  "retentionClass",
  "previousEventHash",
  "eventHash",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged provider env marker", pattern: /\bSUPABASE_/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
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
  console.log("Validate the Personal OS operating audit event contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm audit:ops:check")
  console.log("  pnpm audit:ops:check -- --json")
  console.log(
    "  pnpm audit:ops:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
  )
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

function addIssue(list, code, message, path, line = null) {
  list.push({ code, message, path, line })
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8")
}

async function exists(relativePath) {
  try {
    await readText(relativePath)
    return true
  } catch {
    return false
  }
}

function validateRequiredMarkers(contents, errors) {
  for (const marker of REQUIRED_MARKERS) {
    if (!contents.includes(marker)) {
      addIssue(
        errors,
        "REQUIRED_MARKER_MISSING",
        `Contract source is missing required marker: ${marker}`,
        CONTRACT_PATH
      )
    }
  }
}

function validateModuleCoverage(contents, errors) {
  for (const moduleKey of REQUIRED_MODULE_KEYS) {
    if (!contents.includes(`"${moduleKey}"`)) {
      addIssue(
        errors,
        "MODULE_KEY_MISSING",
        `Contract source is missing module or surface key: ${moduleKey}`,
        CONTRACT_PATH
      )
    }
  }
}

function validateFamilyCoverage(contents, errors) {
  for (const familyKey of REQUIRED_FAMILY_KEYS) {
    if (!contents.includes(`familyKey: "${familyKey}"`)) {
      addIssue(
        errors,
        "EVENT_FAMILY_MISSING",
        `Contract source is missing event family: ${familyKey}`,
        CONTRACT_PATH
      )
    }
  }
}

function validateFieldCoverage(contents, errors) {
  for (const fieldName of REQUIRED_FIELD_NAMES) {
    if (!contents.includes(`name: "${fieldName}"`)) {
      addIssue(
        errors,
        "EVENT_FIELD_MISSING",
        `Contract source is missing event field: ${fieldName}`,
        CONTRACT_PATH
      )
    }
  }
}

function validateCoverageDensity(contents, errors) {
  const actionCount = (contents.match(/actions:/g) ?? []).length
  const stopCount = (contents.match(/stopCondition:/g) ?? []).length
  const sourceCount = (contents.match(/sourceRefs:/g) ?? []).length
  const retentionCount = (contents.match(/retentionClass:/g) ?? []).length

  for (const item of [
    ["event-family action lists", actionCount, REQUIRED_FAMILY_KEYS.length],
    ["event-family stop conditions", stopCount, REQUIRED_FAMILY_KEYS.length],
    ["event-family source references", sourceCount, REQUIRED_FAMILY_KEYS.length],
    ["retention declarations", retentionCount, REQUIRED_FAMILY_KEYS.length],
  ]) {
    const [label, count, minimum] = item
    if (count < minimum) {
      addIssue(
        errors,
        "AUDIT_CONTRACT_COVERAGE_INCOMPLETE",
        `Expected at least ${minimum} ${label}, found ${count}.`,
        CONTRACT_PATH
      )
    }
  }
}

function validateForbiddenMarkers(contents, errors) {
  for (const item of FORBIDDEN_CONTRACT_PATTERNS) {
    const match = contents.match(item.pattern)
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_RUNTIME_MARKER",
        `Contract source contains ${item.label}.`,
        CONTRACT_PATH,
        lineFor(contents, match[0])
      )
    }
  }
}

async function validateReferencedDocs(errors) {
  const docs = [
    ARCHITECTURE_DOC,
    ACCEPTANCE_DOC,
    BACKLOG_DOC,
    ADMIN_AUDIT_DOC,
    REAL_DATA_DOC,
    AGENT_OP_DOC,
  ]

  for (const relativePath of docs) {
    if (!(await exists(relativePath))) {
      addIssue(errors, "REFERENCED_DOC_MISSING", `Referenced document is missing: ${relativePath}`, relativePath)
    }
  }
}

async function buildProof() {
  const errors = []
  const contractSource = await readText(CONTRACT_PATH)

  validateRequiredMarkers(contractSource, errors)
  validateModuleCoverage(contractSource, errors)
  validateFamilyCoverage(contractSource, errors)
  validateFieldCoverage(contractSource, errors)
  validateCoverageDensity(contractSource, errors)
  validateForbiddenMarkers(contractSource, errors)
  await validateReferencedDocs(errors)

  const proof = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm audit:ops:check",
    taskId: "AUDIT-OPS-001",
    status: errors.length === 0 ? "ready_for_schema_review" : "blocked",
    contract: {
      path: CONTRACT_PATH,
      architectureDoc: ARCHITECTURE_DOC,
      acceptanceDoc: ACCEPTANCE_DOC,
      backlogDoc: BACKLOG_DOC,
      adminAuditDoc: ADMIN_AUDIT_DOC,
      realDataDoc: REAL_DATA_DOC,
      agentOperationDoc: AGENT_OP_DOC,
      fieldCount: REQUIRED_FIELD_NAMES.length,
      familyCount: REQUIRED_FAMILY_KEYS.length,
      appendOnlyRequired: contractSource.includes("appendOnlyRequired: true"),
      noSchemaWrites: contractSource.includes("schemaWriteAllowed: false"),
      noRuntimeWrites: contractSource.includes("runtimeWriteAllowed: false"),
      noPublicOutputExpansion: contractSource.includes("publicOutputExpansion: false"),
      hasRedactionPolicy: contractSource.includes("redactionVersion"),
      hasRetentionPolicy: contractSource.includes("retentionClass"),
      hasTamperEvidenceFields:
        contractSource.includes("previousEventHash") && contractSource.includes("eventHash"),
    },
    checks: {
      requiredMarkers: REQUIRED_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      moduleCoverage: REQUIRED_MODULE_KEYS.map((moduleKey) => ({
        moduleKey,
        present: contractSource.includes(`"${moduleKey}"`),
      })),
      familyCoverage: REQUIRED_FAMILY_KEYS.map((familyKey) => ({
        familyKey,
        present: contractSource.includes(`familyKey: "${familyKey}"`),
      })),
      fieldCoverage: REQUIRED_FIELD_NAMES.map((fieldName) => ({
        fieldName,
        present: contractSource.includes(`name: "${fieldName}"`),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(contractSource),
      })),
      referencedDocs: {
        architectureDoc: await exists(ARCHITECTURE_DOC),
        acceptanceDoc: await exists(ACCEPTANCE_DOC),
        backlogDoc: await exists(BACKLOG_DOC),
        adminAuditDoc: await exists(ADMIN_AUDIT_DOC),
        realDataDoc: await exists(REAL_DATA_DOC),
        agentOperationDoc: await exists(AGENT_OP_DOC),
      },
    },
    errors,
    safety: {
      readsEnv: false,
      readsDatabase: false,
      callsProvider: false,
      callsNetwork: false,
      writesDatabase: false,
      mutatesSchema: false,
      expandsPublicOutput: false,
      exposesPublicRoute: false,
      enablesExternalAgents: false,
    },
  }

  return proof
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
    console.log(`Operating audit contract: ${proof.status}`)
    console.log(`Event fields covered: ${proof.contract.fieldCount}`)
    console.log(`Event families covered: ${proof.contract.familyCount}`)
    console.log(`Contract path: ${proof.contract.path}`)
    if (proof.errors.length > 0) {
      console.log("Errors:")
      for (const error of proof.errors) {
        console.log(`- ${error.code}: ${error.message}`)
      }
    }
    if (args.out) {
      console.log(`Proof written: ${args.out}`)
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
