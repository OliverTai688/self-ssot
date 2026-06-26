#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const SERVICE_PATH = "src/lib/services/agent-command-center.service.ts"
const TYPE_PATH = "src/types/agent-command-center.ts"
const PAGE_PATH = "src/app/(dashboard)/agents/page.tsx"
const CLIENT_PATH = "src/app/(dashboard)/agents/agent-command-center-client.tsx"
const SIDEBAR_PATH = "src/components/layout/app-sidebar.tsx"
const PACKAGE_PATH = "package.json"
const CATALOG_PATH = "src/lib/contracts/module-agent-command-catalog.contract.ts"
const BUS_PATH = "src/lib/contracts/agent-task-message-bus.contract.ts"
const ARC_028_DOC = "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md"
const ARC_032_DOC = "docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md"
const RES_004_DOC = "docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"

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

const REQUIRED_GROUPS = [
  "launch-proof-squad",
  "source-workflow-squad",
  "high-risk-review-board",
  "relationship-growth-cell",
]

const SERVICE_MARKERS = [
  "import \"server-only\"",
  "buildOwnerAgentCommandCenterContract",
  "AGENT_TASK_MESSAGE_BUS_CONTRACT",
  "AGENT_BUS_OPERATION_BINDINGS",
  "AGENT_BUS_TASK_TEMPLATES",
  "MODULE_AGENT_COMMAND_CATALOG",
  "protected_owner_module_readiness_matrix_ready",
  "moduleReadinessRows",
  "protected_owner_module_readiness_ready",
  "proposalOnly: true",
  "protectedOwnerOnly: true",
  "protectedDryRunRouteAvailable: true",
  "dryRunProofPanelReady: true",
  "moduleReadinessMatrixReady: true",
  "publicEndpointCreated: false",
  "routeHandlerCreated: false",
  "serverActionCreated: false",
  "databaseRead: false",
  "databaseWrite: false",
  "providerCall: false",
  "externalRuntimeEnabled: false",
  "externalRegistryWrite: false",
  "autonomousExecution: false",
  "highRiskFinalWrite: false",
  "externalAgentDatabaseAccess: false",
  "externalRegisterable: false",
]

const TYPE_MARKERS = [
  "OwnerAgentCommandCenterContract",
  "AgentCommandCenterMode",
  "AgentCommandCenterGroup",
  "AgentCommandCenterCommandRow",
  "AgentCommandCenterModuleReadinessRow",
  "AgentCommandCenterDryRunProof",
  "AgentCommandCenterDryRunError",
  "moduleReadinessRows",
  "moduleReadinessMatrixReady: true",
  "proposalOnly: true",
  "protectedDryRunRouteAvailable: true",
  "dryRunProofPanelReady: true",
  "externalRegisterable: false",
]

const PAGE_MARKERS = [
  "dynamic = \"force-dynamic\"",
  "getCurrentUser",
  "role !== \"OWNER\"",
  "buildOwnerAgentCommandCenterContract",
  "AgentCommandCenterClient",
  "AI 指令中心",
]

const CLIENT_MARKERS = [
  "\"use client\"",
  "Create proposal packet",
  "LocalProposalPacket",
  "proposal_ready",
  "proposal only",
  "write blocked",
  "external false",
  "No provider call, no DB write, no external runtime.",
  "Run protected dry-run",
  "Protected dry-run proof",
  "fetch(selectedCommand.httpDryRun.path",
  "clientRequestId",
  "agent-command-center-proof-panel",
  "Module operation readiness",
  "contract.moduleReadinessRows",
  "contract.summary.moduleReadinessCount",
  "row.cliDryRunCommand",
  "row.httpDryRun.path",
  "row.internalBus.groupLabel",
  "row.audit.eventFamily",
  "row.externalRegisterable",
  "selectedGroup",
]

const FORBIDDEN_RUNTIME_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "database URL env marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged Supabase env marker", pattern: /\bSUPABASE_/ },
  { label: "server action marker", pattern: /["']use server["']/ },
  { label: "form action marker", pattern: /\bformAction\b/ },
  { label: "external registration enabled marker", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
  { label: "execute mode branch", pattern: /mode\s*===\s*["']execute["']|mode\s*===\s*["']run["']/i },
]

const FORBIDDEN_SERVER_NETWORK_PATTERN = /\bfetch\s*\(/

const REQUIRED_ALLOWED_CLIENT_FETCH_MARKERS = [
  "fetch(selectedCommand.httpDryRun.path",
  "method: \"POST\"",
  "credentials: \"same-origin\"",
  "cache: \"no-store\"",
  "\"Content-Type\": \"application/json\"",
  "operationId: selectedCommand.httpDryRun.operationId",
  "mode: selectedCommand.httpDryRun.mode",
  "targetModule: selectedCommand.httpDryRun.targetModule",
  "requestedChecks: [\"agent-command-center-proof-panel\", mode]",
  "clientRequestId",
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
  console.log("Validate the Personal OS owner AI command center proposal surface")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm agent:command-center:check")
  console.log("  pnpm agent:command-center:check -- --json")
  console.log(
    "  pnpm agent:command-center:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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

function validateMarkers(source, markers, path, errors, code = "REQUIRED_MARKER_MISSING") {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      addIssue(errors, code, `${path} is missing required marker: ${marker}`, path)
    }
  }
}

function validateForbidden(source, patterns, path, errors) {
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
  const serviceSource = await readText(SERVICE_PATH)
  const typeSource = await readText(TYPE_PATH)
  const pageSource = await readText(PAGE_PATH)
  const clientSource = await readText(CLIENT_PATH)
  const sidebarSource = await readText(SIDEBAR_PATH)
  const packageSource = await readText(PACKAGE_PATH)
  const catalogSource = await readText(CATALOG_PATH)
  const busSource = await readText(BUS_PATH)

  validateMarkers(serviceSource, SERVICE_MARKERS, SERVICE_PATH, errors)
  validateMarkers(typeSource, TYPE_MARKERS, TYPE_PATH, errors)
  validateMarkers(pageSource, PAGE_MARKERS, PAGE_PATH, errors)
  validateMarkers(clientSource, CLIENT_MARKERS, CLIENT_PATH, errors)
  validateMarkers(serviceSource, REQUIRED_OPERATION_IDS, SERVICE_PATH, errors, "COMMAND_CENTER_OPERATION_MISSING")
  validateMarkers(catalogSource, REQUIRED_OPERATION_IDS, CATALOG_PATH, errors, "CATALOG_OPERATION_MISSING")
  validateMarkers(busSource, REQUIRED_OPERATION_IDS, BUS_PATH, errors, "BUS_OPERATION_MISSING")
  validateMarkers(serviceSource, REQUIRED_GROUPS, SERVICE_PATH, errors, "COMMAND_CENTER_GROUP_MISSING")

  for (const source of [
    [serviceSource, SERVICE_PATH],
    [pageSource, PAGE_PATH],
    [clientSource, CLIENT_PATH],
  ]) {
    validateForbidden(source[0], FORBIDDEN_RUNTIME_PATTERNS, source[1], errors)
  }

  for (const [path, source] of [
    [SERVICE_PATH, serviceSource],
    [PAGE_PATH, pageSource],
  ]) {
    const match = source.match(FORBIDDEN_SERVER_NETWORK_PATTERN)
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_SERVER_NETWORK_CALL",
        `${path} must not call fetch; only the client proof panel may call the protected dry-run route.`,
        path,
        lineFor(source, match[0])
      )
    }
  }

  const clientFetchCount = (clientSource.match(/\bfetch\s*\(/g) ?? []).length
  if (clientFetchCount !== 1) {
    addIssue(
      errors,
      "CLIENT_FETCH_BOUNDARY_INVALID",
      `${CLIENT_PATH} must contain exactly one same-origin protected dry-run fetch; found ${clientFetchCount}.`,
      CLIENT_PATH
    )
  }

  for (const marker of REQUIRED_ALLOWED_CLIENT_FETCH_MARKERS) {
    if (!clientSource.includes(marker)) {
      addIssue(
        errors,
        "CLIENT_DRY_RUN_FETCH_MARKER_MISSING",
        `${CLIENT_PATH} is missing protected dry-run fetch marker: ${marker}`,
        CLIENT_PATH
      )
    }
  }

  if (/\bhttps?:\/\//.test(clientSource)) {
    addIssue(
      errors,
      "CLIENT_EXTERNAL_URL_FORBIDDEN",
      `${CLIENT_PATH} must not include absolute external URLs in the dry-run proof panel.`,
      CLIENT_PATH
    )
  }

  if (!sidebarSource.includes("href: \"/agents\"") || !sidebarSource.includes("AI 指令")) {
    addIssue(errors, "SIDEBAR_ENTRY_MISSING", "Sidebar must expose the protected /agents entry.", SIDEBAR_PATH)
  }

  if (!packageSource.includes("\"agent:command-center:check\"")) {
    addIssue(errors, "PACKAGE_SCRIPT_MISSING", "package.json must define agent:command-center:check.", PACKAGE_PATH)
  }

  for (const relativePath of [ARC_028_DOC, ARC_032_DOC, RES_004_DOC, ACCEPTANCE_DOC, BACKLOG_DOC]) {
    if (!(await exists(relativePath))) {
      addIssue(errors, "REFERENCED_DOC_MISSING", `Referenced document is missing: ${relativePath}`, relativePath)
    }
  }

  if (!catalogSource.includes("MODULE_AGENT_COMMAND_CATALOG")) {
    addIssue(errors, "CATALOG_SOURCE_MISSING", "Command center must be backed by AGENT-010 catalog.", CATALOG_PATH)
  }

  if (!busSource.includes("AGENT_TASK_MESSAGE_BUS_CONTRACT")) {
    addIssue(errors, "BUS_SOURCE_MISSING", "Command center must be backed by AGENT-011 bus.", BUS_PATH)
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm agent:command-center:check",
    taskId: "AGENT-016",
    status: errors.length === 0 ? "protected_owner_module_readiness_matrix_ready" : "blocked",
    surface: {
      route: "/agents",
      page: PAGE_PATH,
      client: CLIENT_PATH,
      service: SERVICE_PATH,
      sourceCatalog: CATALOG_PATH,
      sourceBus: BUS_PATH,
      operationCount: REQUIRED_OPERATION_IDS.length,
      moduleReadinessCount: REQUIRED_OPERATION_IDS.length,
      groupCount: REQUIRED_GROUPS.length,
      modes: ["single_agent", "group_agent"],
    },
    checks: {
      operations: REQUIRED_OPERATION_IDS.map((operationId) => ({
        operationId,
        inCommandCenter: serviceSource.includes(operationId),
        inCatalog: catalogSource.includes(operationId),
        inBus: busSource.includes(operationId),
      })),
      groups: REQUIRED_GROUPS.map((groupId) => ({
        groupId,
        inCommandCenter: serviceSource.includes(groupId),
      })),
      sidebarEntry: sidebarSource.includes("href: \"/agents\""),
      packageScript: packageSource.includes("\"agent:command-center:check\""),
      requiredMarkers: {
        service: SERVICE_MARKERS.map((marker) => ({ marker, present: serviceSource.includes(marker) })),
        page: PAGE_MARKERS.map((marker) => ({ marker, present: pageSource.includes(marker) })),
        client: CLIENT_MARKERS.map((marker) => ({ marker, present: clientSource.includes(marker) })),
      },
      forbiddenRuntimeMarkers: FORBIDDEN_RUNTIME_PATTERNS.flatMap((item) =>
        [
          [SERVICE_PATH, serviceSource],
          [PAGE_PATH, pageSource],
          [CLIENT_PATH, clientSource],
        ].map(([path, source]) => ({
          path,
          label: item.label,
          present: item.pattern.test(source),
        }))
      ),
      clientFetchBoundary: {
        allowedFetchCount: 1,
        actualFetchCount: clientFetchCount,
        requiredMarkers: REQUIRED_ALLOWED_CLIENT_FETCH_MARKERS.map((marker) => ({
          marker,
          present: clientSource.includes(marker),
        })),
        externalAbsoluteUrlPresent: /\bhttps?:\/\//.test(clientSource),
      },
    },
    safety: {
      protectedOwnerOnly: true,
      proposalOnly: true,
      protectedDryRunRouteAvailable: true,
      dryRunProofPanelReady: true,
      moduleReadinessMatrixReady: true,
      publicEndpointCreated: false,
      routeHandlerCreated: false,
      serverActionCreated: false,
      databaseRead: false,
      databaseWrite: false,
      providerCall: false,
      externalRuntimeEnabled: false,
      externalRegistryWrite: false,
      autonomousExecution: false,
      highRiskFinalWrite: false,
      persistedAuditNow: false,
      externalAgentDatabaseAccess: false,
      externalRegisterable: false,
    },
    nextActions: [
      "Run AUTH-005 if owner auth proof appears, or WORK-009 if a safe proof target appears.",
      "Do not add live external agent runtime until AGENT-013 approval gates are satisfied.",
      "Persist command threads only after audit storage, authorization, and owner approval rules are selected.",
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
  console.log("Owner AI command center")
  console.log(`Status: ${proof.status}`)
  console.log(`Route: ${proof.surface.route}`)
  console.log(`Operations: ${proof.surface.operationCount}`)
  console.log(`Groups: ${proof.surface.groupCount}`)
  console.log(`Errors: ${proof.errors.length}`)

  for (const error of proof.errors) {
    const location = error.line ? `${error.path}:${error.line}` : error.path
    console.log(`- [${error.code}] ${location} ${error.message}`)
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
  }

  if (proof.errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
