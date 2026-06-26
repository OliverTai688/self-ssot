#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/module-real-data-matrix.contract.ts"
const ARCHITECTURE_DOC = "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const RESOURCE_INDEX_DOC = "docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md"

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
]

const REQUIRED_MARKERS = [
  "REAL_DATA_MIGRATION_MATRIX",
  "REAL_DATA_MIGRATION_MATRIX_SUMMARY",
  "currentStage",
  "currentSources",
  "nextDataObjects",
  "bffRouteOrAction",
  "authzBoundary",
  "auditNeed",
  "acceptanceProof",
  "stopCondition",
  "schemaWriteAllowed: false",
  "runtimeWriteAllowed: false",
  "AUTH-005",
  "WORK-009",
  "AUDIT-OPS-001",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "database URL marker", pattern: /\bDATABASE_URL\b/ },
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
  console.log("Validate the Personal OS per-module real-data migration matrix")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm module:realdata:check")
  console.log("  pnpm module:realdata:check -- --json")
  console.log(
    "  pnpm module:realdata:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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
    if (!contents.includes(`moduleKey: "${moduleKey}"`)) {
      addIssue(
        errors,
        "MODULE_KEY_MISSING",
        `Contract source is missing matrix row for module key: ${moduleKey}`,
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

function validateCoverageDensity(contents, errors) {
  const bffCount = (contents.match(/bffRouteOrAction:/g) ?? []).length
  const authzCount = (contents.match(/authzBoundary:/g) ?? []).length
  const auditCount = (contents.match(/auditNeed:/g) ?? []).length
  const stopCount = (contents.match(/stopCondition:/g) ?? []).length

  for (const item of [
    ["BFF contracts", bffCount],
    ["authz boundaries", authzCount],
    ["audit needs", auditCount],
    ["stop conditions", stopCount],
  ]) {
    const [label, count] = item
    if (count < REQUIRED_MODULE_KEYS.length) {
      addIssue(
        errors,
        "MATRIX_FIELD_COVERAGE_INCOMPLETE",
        `Expected at least ${REQUIRED_MODULE_KEYS.length} ${label}, found ${count}.`,
        CONTRACT_PATH
      )
    }
  }
}

async function validateReferencedDocs(errors) {
  for (const relativePath of [ARCHITECTURE_DOC, ACCEPTANCE_DOC, BACKLOG_DOC, RESOURCE_INDEX_DOC]) {
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
  validateCoverageDensity(contractSource, errors)
  validateForbiddenMarkers(contractSource, errors)
  await validateReferencedDocs(errors)

  const proof = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm module:realdata:check",
    taskId: "REALDATA-001",
    status: errors.length === 0 ? "ready_for_research_to_task_use" : "blocked",
    contract: {
      path: CONTRACT_PATH,
      architectureDoc: ARCHITECTURE_DOC,
      acceptanceDoc: ACCEPTANCE_DOC,
      backlogDoc: BACKLOG_DOC,
      resourceIndexDoc: RESOURCE_INDEX_DOC,
      moduleCount: REQUIRED_MODULE_KEYS.length,
      noSchemaWrites: contractSource.includes("schemaWriteAllowed: false"),
      noRuntimeWrites: contractSource.includes("runtimeWriteAllowed: false"),
      noPublicOutputExpansion: contractSource.includes("publicOutputExpansion: false"),
      nextNoProofFallback: contractSource.includes("AUDIT-OPS-001") ? "AUDIT-OPS-001" : null,
    },
    checks: {
      requiredMarkers: REQUIRED_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      moduleCoverage: REQUIRED_MODULE_KEYS.map((moduleKey) => ({
        moduleKey,
        present: contractSource.includes(`moduleKey: "${moduleKey}"`),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(contractSource),
      })),
      referencedDocs: {
        architectureDoc: await exists(ARCHITECTURE_DOC),
        acceptanceDoc: await exists(ACCEPTANCE_DOC),
        backlogDoc: await exists(BACKLOG_DOC),
        resourceIndexDoc: await exists(RESOURCE_INDEX_DOC),
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
    console.log(`Module real-data migration matrix: ${proof.status}`)
    console.log(`Modules covered: ${proof.contract.moduleCount}`)
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
