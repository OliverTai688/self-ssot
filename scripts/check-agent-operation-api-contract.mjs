#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/agent-operation-api.contract.ts"
const CATALOG_PATH = "src/lib/contracts/module-agent-command-catalog.contract.ts"
const SERVICE_PATH = "src/lib/services/agent-operation.service.ts"
const CLI_SCRIPT_PATH = "scripts/agent-operation-dry-run.mjs"
const ARC_029_DOC = "docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md"
const RES_004_DOC = "docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const ROUTE_PATH = "src/app/api/agent-operations/dry-run/route.ts"

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
  "AGENT_OPERATION_API_CONTRACT",
  "AGENT_OPERATION_API_OPERATIONS",
  "MODULE_AGENT_OPERATION_API_OPERATIONS",
  "AGENT_OPERATION_API_CONTRACT_SUMMARY",
  "protected_dry_run_ready",
  "/api/agent-operations/dry-run",
  "routeHandlerImplemented: true",
  "requireUser()",
  "private_no_store",
  "internalHttpEndpointCreated: true",
  "externalRegisterable: false",
  "publicEndpointCreated: false",
  "databaseWrite: false",
  "providerCall: false",
  "externalRegistryWrite: false",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_/ },
]

const REQUIRED_ROUTE_MARKERS = [
  'runtime = "nodejs"',
  'dynamic = "force-dynamic"',
  "export async function POST",
  "requireUser()",
  'user.role !== "OWNER"',
  "buildAgentOperationDryRun",
  "Cache-Control",
  "private, no-store",
  "NextResponse.json",
]

const REQUIRED_SERVICE_MARKERS = [
  "server-only",
  "buildAgentOperationDryRun",
  "AGENT_OPERATION_API_OPERATIONS",
  "mode: \"dry_run\"",
  "internalHttpEndpointUsed: true",
  "publicEndpointCreated: false",
  "writesPerformed: false",
  "databaseAccessed: false",
  "providerCalled: false",
  "externalRegistryWrite: false",
  "autonomousExecution: false",
  "highRiskFinalWrite: false",
]

const FORBIDDEN_ROUTE_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "external registry marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "execute mode branch", pattern: /mode\s*===\s*["']execute["']|mode\s*===\s*["']run["']/i },
]

const FORBIDDEN_SERVICE_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "external registerable true marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
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
  console.log("Validate the Personal OS protected agent operation API dry-run contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm agent:api:check")
  console.log("  pnpm agent:api:check -- --json")
  console.log(
    "  pnpm agent:api:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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

function validateMarkers(contents, errors) {
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

function validateOperationParity(contractSource, catalogSource, cliSource, errors) {
  if (!contractSource.includes("MODULE_AGENT_OPERATION_API_OPERATIONS")) {
    addIssue(
      errors,
      "API_OPERATION_SOURCE_MISSING",
      "API contract must source operations from MODULE_AGENT_OPERATION_API_OPERATIONS.",
      CONTRACT_PATH
    )
  }

  for (const operationId of REQUIRED_OPERATION_IDS) {
    if (!catalogSource.includes(operationId)) {
      addIssue(
        errors,
        "CATALOG_OPERATION_MISSING",
        `Module command catalog is missing operation id: ${operationId}`,
        CATALOG_PATH
      )
    }
    if (!cliSource.includes(operationId)) {
      addIssue(
        errors,
        "CLI_OPERATION_MISSING",
        `CLI dry-run script is missing operation id: ${operationId}`,
        CLI_SCRIPT_PATH
      )
    }
  }
}

function validateForbiddenRuntimeMarkers(contractSource, errors) {
  for (const item of FORBIDDEN_CONTRACT_PATTERNS) {
    const match = contractSource.match(item.pattern)
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_RUNTIME_MARKER",
        `Contract source contains ${item.label}.`,
        CONTRACT_PATH,
        lineFor(contractSource, match[0])
      )
    }
  }
}

function validateRequiredMarkers(source, markers, path, errors) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      addIssue(errors, "REQUIRED_MARKER_MISSING", `${path} is missing required marker: ${marker}`, path)
    }
  }
}

function validateForbiddenMarkers(source, patterns, path, errors) {
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

async function validateReferencedDocs(errors) {
  for (const relativePath of [ARC_029_DOC, RES_004_DOC, ACCEPTANCE_DOC, BACKLOG_DOC]) {
    if (!(await exists(relativePath))) {
      addIssue(errors, "REFERENCED_DOC_MISSING", `Referenced document is missing: ${relativePath}`, relativePath)
    }
  }
}

async function buildProof() {
  const errors = []
  const contractSource = await readText(CONTRACT_PATH)
  const catalogSource = await readText(CATALOG_PATH)
  const serviceSource = await readText(SERVICE_PATH)
  const cliSource = await readText(CLI_SCRIPT_PATH)
  const routeExists = await exists(ROUTE_PATH)
  const routeSource = routeExists ? await readText(ROUTE_PATH) : ""

  validateMarkers(contractSource, errors)
  validateOperationParity(contractSource, catalogSource, cliSource, errors)
  validateForbiddenRuntimeMarkers(contractSource, errors)
  validateRequiredMarkers(serviceSource, REQUIRED_SERVICE_MARKERS, SERVICE_PATH, errors)
  validateForbiddenMarkers(serviceSource, FORBIDDEN_SERVICE_PATTERNS, SERVICE_PATH, errors)
  await validateReferencedDocs(errors)

  if (!routeExists) {
    addIssue(
      errors,
      "ROUTE_HANDLER_MISSING",
      "Explicit owner direction now expects the internal protected dry-run route handler.",
      ROUTE_PATH
    )
  } else {
    validateRequiredMarkers(routeSource, REQUIRED_ROUTE_MARKERS, ROUTE_PATH, errors)
    validateForbiddenMarkers(routeSource, FORBIDDEN_ROUTE_PATTERNS, ROUTE_PATH, errors)
  }

  const proof = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm agent:api:check",
    taskId: "AGENT-014",
    status: errors.length === 0 ? "protected_route_ready" : "blocked",
    contract: {
      path: CONTRACT_PATH,
      servicePath: SERVICE_PATH,
      routePath: ROUTE_PATH,
      routeHandlerImplemented: routeExists,
      routeHandlerExpectedNow: true,
      endpointPath: "/api/agent-operations/dry-run",
      method: "POST",
      operationCount: REQUIRED_OPERATION_IDS.length,
      allowedMode: "dry_run",
      protectedOwnerOnly: contractSource.includes("protectedOwnerOnly: true"),
      ownerOnlyRoute: routeSource.includes('user.role !== "OWNER"'),
    },
    checks: {
      requiredMarkers: REQUIRED_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      operationParity: REQUIRED_OPERATION_IDS.map((operationId) => ({
        operationId,
        inApiOperationCatalog: catalogSource.includes(operationId),
        inCliDryRun: cliSource.includes(operationId),
      })),
      serviceMarkers: REQUIRED_SERVICE_MARKERS.map((marker) => ({
        marker,
        present: serviceSource.includes(marker),
      })),
      routeMarkers: REQUIRED_ROUTE_MARKERS.map((marker) => ({
        marker,
        present: routeSource.includes(marker),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(contractSource),
      })),
      forbiddenServiceMarkers: FORBIDDEN_SERVICE_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(serviceSource),
      })),
      forbiddenRouteMarkers: FORBIDDEN_ROUTE_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(routeSource),
      })),
      referencedDocs: {
        arc029: await exists(ARC_029_DOC),
        res004: await exists(RES_004_DOC),
        acceptance: await exists(ACCEPTANCE_DOC),
        backlog: await exists(BACKLOG_DOC),
      },
    },
    safety: {
      routeHandlerCreated: routeExists,
      internalHttpEndpointCreated: routeExists,
      publicEndpointCreated: false,
      databaseWrite: false,
      providerCall: false,
      externalRegistryWrite: false,
      externalRegisterable: false,
      autonomousExecution: false,
      externalAgentDatabaseAccess: false,
      highRiskFinalWrite: false,
      reason:
        "The route is protected owner-only dry-run, uses requireUser(), returns no-store DTOs, and does not write to DB/providers/external registries.",
    },
    nextActions: [
      "Bind the protected route into an owner UI only after AGENT-010 defines per-module command semantics.",
      "Keep external/public agent operation endpoints disabled until auth scopes, trust policy, rollback, deployment proof, and human approval exist.",
      "Run pnpm agent:api:check after editing the operation catalog or future route contract.",
    ],
    errors,
  }

  return proof
}

async function writeProof(outPath, proof) {
  const absolutePath = repoPath(outPath)
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${JSON.stringify(proof, null, 2)}\n`)
}

function printSummary(proof) {
  console.log("Agent operation API dry-run contract")
  console.log(`Status: ${proof.status}`)
  console.log(`Route handler implemented: ${proof.contract.routeHandlerImplemented}`)
  console.log(`Endpoint contract: ${proof.contract.method} ${proof.contract.endpointPath}`)
  console.log(`Operations: ${proof.contract.operationCount}`)
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
