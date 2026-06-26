#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CATALOG_PATH = "src/lib/contracts/module-agent-command-catalog.contract.ts"
const API_CONTRACT_PATH = "src/lib/contracts/agent-operation-api.contract.ts"
const CLI_SCRIPT_PATH = "scripts/agent-operation-dry-run.mjs"
const ARC_028_DOC = "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md"
const ARC_029_DOC = "docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md"
const RES_004_DOC = "docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"

const REQUIRED_MODULES = [
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

const REQUIRED_OPERATION_IDS = [
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

const REQUIRED_MARKERS = [
  "MODULE_AGENT_COMMAND_CATALOG",
  "MODULE_AGENT_OPERATION_API_OPERATIONS",
  "MODULE_AGENT_COMMAND_CATALOG_SUMMARY",
  "ready_for_module_agent_workspace_use",
  "allowedModes: [\"dry_run\"]",
  "proposalOutputs",
  "blockedWrites",
  "uiEntrySurface",
  "httpDryRunPayload",
  "cliDryRunCommand",
  "externalRegisterable: false",
]

const FORBIDDEN_CATALOG_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "execute mode branch", pattern: /mode\s*===\s*["']execute["']|mode\s*===\s*["']run["']/i },
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
  console.log("Validate the Personal OS per-module agent command catalog")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm agent:commands:check")
  console.log("  pnpm agent:commands:check -- --json")
  console.log(
    "  pnpm agent:commands:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
  )
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
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

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

function addIssue(list, code, message, path, line = null) {
  list.push({ code, message, path, line })
}

function validateRequiredText(source, required, path, errors, code) {
  for (const item of required) {
    if (!source.includes(item)) {
      addIssue(errors, code, `${path} is missing required marker: ${item}`, path)
    }
  }
}

function validateForbiddenText(source, patterns, path, errors) {
  for (const item of patterns) {
    const match = source.match(item.pattern)
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_RUNTIME_MARKER",
        `${path} contains ${item.label}.`,
        path,
        lineFor(source, match[0])
      )
    }
  }
}

async function buildProof() {
  const errors = []
  const catalogSource = await readText(CATALOG_PATH)
  const apiSource = await readText(API_CONTRACT_PATH)
  const cliSource = await readText(CLI_SCRIPT_PATH)

  validateRequiredText(catalogSource, REQUIRED_MARKERS, CATALOG_PATH, errors, "REQUIRED_MARKER_MISSING")
  validateRequiredText(
    catalogSource,
    REQUIRED_MODULES.map((moduleKey) => `moduleKey: "${moduleKey}"`),
    CATALOG_PATH,
    errors,
    "MODULE_MISSING"
  )
  validateRequiredText(catalogSource, REQUIRED_OPERATION_IDS, CATALOG_PATH, errors, "CATALOG_OPERATION_MISSING")
  validateRequiredText(
    apiSource,
    ["MODULE_AGENT_OPERATION_API_OPERATIONS", "AGENT_OPERATION_API_OPERATIONS"],
    API_CONTRACT_PATH,
    errors,
    "API_OPERATION_SOURCE_MISSING"
  )
  validateRequiredText(cliSource, REQUIRED_OPERATION_IDS, CLI_SCRIPT_PATH, errors, "CLI_OPERATION_MISSING")
  validateForbiddenText(catalogSource, FORBIDDEN_CATALOG_PATTERNS, CATALOG_PATH, errors)

  for (const relativePath of [ARC_028_DOC, ARC_029_DOC, RES_004_DOC, ACCEPTANCE_DOC, BACKLOG_DOC]) {
    if (!(await exists(relativePath))) {
      addIssue(errors, "REFERENCED_DOC_MISSING", `Referenced document is missing: ${relativePath}`, relativePath)
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm agent:commands:check",
    taskId: "AGENT-010",
    status: errors.length === 0 ? "ready_for_module_agent_workspace_use" : "blocked",
    catalog: {
      path: CATALOG_PATH,
      moduleCount: REQUIRED_MODULES.length,
      operationCount: REQUIRED_OPERATION_IDS.length,
      allowedMode: "dry_run",
      externalRegisterable: false,
      httpRoute: "/api/agent-operations/dry-run",
      cliCommand: "pnpm agent:op -- --operation <operation-id> --json",
    },
    checks: {
      modules: REQUIRED_MODULES.map((moduleKey) => ({
        moduleKey,
        present: catalogSource.includes(`moduleKey: "${moduleKey}"`),
      })),
      operationIds: REQUIRED_OPERATION_IDS.map((operationId) => ({
        operationId,
        inCatalog: catalogSource.includes(operationId),
        apiImportsCatalog: apiSource.includes("MODULE_AGENT_OPERATION_API_OPERATIONS"),
        inCliDryRun: cliSource.includes(operationId),
      })),
      requiredMarkers: REQUIRED_MARKERS.map((marker) => ({
        marker,
        present: catalogSource.includes(marker),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CATALOG_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(catalogSource),
      })),
      referencedDocs: {
        arc028: await exists(ARC_028_DOC),
        arc029: await exists(ARC_029_DOC),
        res004: await exists(RES_004_DOC),
        acceptance: await exists(ACCEPTANCE_DOC),
        backlog: await exists(BACKLOG_DOC),
      },
    },
    safety: {
      publicEndpointCreated: false,
      databaseWrite: false,
      providerCall: false,
      externalRegistryWrite: false,
      externalRegisterable: false,
      autonomousExecution: false,
      externalAgentDatabaseAccess: false,
      highRiskFinalWrite: false,
    },
    nextActions: [
      "Use AGENT-011 to define the internal multi-agent task/message bus before group-agent runtime.",
      "Use AGENT-012 to bind this catalog into an owner command center UI.",
      "Keep AGENT-013 external adapter work disabled until human approval and launch gates are complete.",
    ],
    errors,
  }
}

async function writeProof(outPath, proof) {
  const absolutePath = repoPath(outPath)
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${JSON.stringify(proof, null, 2)}\n`)
}

function printSummary(proof) {
  console.log("Module agent command catalog")
  console.log(`Status: ${proof.status}`)
  console.log(`Modules: ${proof.catalog.moduleCount}`)
  console.log(`Operations: ${proof.catalog.operationCount}`)
  console.log(`HTTP route: ${proof.catalog.httpRoute}`)
  console.log(`Errors: ${proof.errors.length}`)

  if (proof.errors.length > 0) {
    console.log("")
    console.log("Errors:")
    for (const error of proof.errors) {
      const suffix = error.line ? `:${error.line}` : ""
      console.log(`- ${error.code} ${error.path}${suffix} ${error.message}`)
    }
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
    await writeProof(args.out, proof)
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else {
    printSummary(proof)
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
