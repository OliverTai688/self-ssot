#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const BUS_CONTRACT_PATH = "src/lib/contracts/agent-task-message-bus.contract.ts"
const COMMAND_CATALOG_PATH = "src/lib/contracts/module-agent-command-catalog.contract.ts"
const AGENT_MANIFESTS_PATH =
  "docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json"
const ARC_028_DOC = "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md"
const ARC_032_DOC = "docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md"
const DBS_006_DOC = "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md"
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

const REQUIRED_LIFECYCLE_STATES = [
  "draft",
  "submitted",
  "working",
  "input_required",
  "proposal_ready",
  "approved_for_manual_action",
  "rejected",
  "blocked",
  "completed_no_write",
]

const REQUIRED_PARTICIPANT_KIND_POLICIES = [
  "owner",
  "internal_agent",
  "system",
  "external_agent_placeholder",
  "external_agent_runtime",
]

const HIGH_RISK_OPERATION_IDS = [
  "ai-input.source-workflow.review",
  "life.routine.propose",
  "finance.review-draft",
  "company.strategy.review",
  "client-portal.visibility.preflight",
]

const REQUIRED_MARKERS = [
  "AGENT_TASK_MESSAGE_BUS_CONTRACT",
  "AGENT_BUS_LIFECYCLE_STATES",
  "AGENT_BUS_FORBIDDEN_LIFECYCLE_STATES",
  "AGENT_BUS_REQUIRED_OPERATION_IDS",
  "AGENT_BUS_HIGH_RISK_OPERATION_IDS",
  "AGENT_BUS_PARTICIPANT_KIND_POLICIES",
  "AGENT_BUS_INTERNAL_AGENT_LABELS",
  "AGENT_BUS_OPERATION_BINDINGS",
  "AGENT_BUS_TASK_TEMPLATES",
  "AGENT_BUS_MESSAGE_TEMPLATE",
  "AGENT_BUS_PROPOSAL_POLICIES",
  "AGENT_BUS_AUDIT_MAPPINGS",
  "AGENT_TASK_MESSAGE_BUS_CONTRACT_SUMMARY",
  "ready_for_internal_agent_bus_contract_use",
  "MODULE_AGENT_COMMAND_CATALOG",
  "externalRegisterable: false",
  "allowedNow: false",
  "writeBlocked: true",
  "approvalRequired",
  "eventFamily: \"agent.operation\"",
  "sourceKind: \"internal_agent_bus\"",
  "publicEndpointCreated: false",
  "routeHandlerCreated: false",
  "serverActionCreated: false",
  "databaseWrite: false",
  "providerCall: false",
  "externalRegistryWrite: false",
  "autonomousExecution: false",
  "externalAgentDatabaseAccess: false",
]

const FORBIDDEN_BUS_PATTERNS = [
  { label: "Prisma client marker", pattern: /\bPrismaClient\b/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\b/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
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
  console.log("Validate the Personal OS internal multi-agent task/message bus contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm agent:bus:check")
  console.log("  pnpm agent:bus:check -- --json")
  console.log("  pnpm agent:bus:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
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

function validateRequiredMarkers(source, markers, path, errors, code = "REQUIRED_MARKER_MISSING") {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      addIssue(errors, code, `${path} is missing required marker: ${marker}`, path)
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

async function readManifestLabels(errors) {
  try {
    const registry = JSON.parse(await readText(AGENT_MANIFESTS_PATH))
    if (!Array.isArray(registry.manifests)) {
      addIssue(errors, "MANIFESTS_NOT_ARRAY", "AgentFacts-lite registry manifests must be an array.", AGENT_MANIFESTS_PATH)
      return []
    }

    return registry.manifests
      .map((manifest) => manifest?.label)
      .filter((label) => typeof label === "string" && label.length > 0)
  } catch (error) {
    addIssue(
      errors,
      "MANIFESTS_UNREADABLE",
      `Unable to parse AgentFacts-lite manifests: ${error instanceof Error ? error.message : String(error)}`,
      AGENT_MANIFESTS_PATH
    )
    return []
  }
}

async function buildProof() {
  const errors = []
  const busSource = await readText(BUS_CONTRACT_PATH)
  const catalogSource = await readText(COMMAND_CATALOG_PATH)
  const manifestLabels = await readManifestLabels(errors)

  validateRequiredMarkers(busSource, REQUIRED_MARKERS, BUS_CONTRACT_PATH, errors)
  validateRequiredMarkers(busSource, REQUIRED_LIFECYCLE_STATES, BUS_CONTRACT_PATH, errors, "LIFECYCLE_STATE_MISSING")
  validateRequiredMarkers(
    busSource,
    REQUIRED_PARTICIPANT_KIND_POLICIES,
    BUS_CONTRACT_PATH,
    errors,
    "PARTICIPANT_KIND_POLICY_MISSING"
  )
  validateRequiredMarkers(busSource, REQUIRED_OPERATION_IDS, BUS_CONTRACT_PATH, errors, "BUS_OPERATION_MISSING")
  validateRequiredMarkers(catalogSource, REQUIRED_OPERATION_IDS, COMMAND_CATALOG_PATH, errors, "CATALOG_OPERATION_MISSING")
  validateForbiddenMarkers(busSource, FORBIDDEN_BUS_PATTERNS, BUS_CONTRACT_PATH, errors)

  for (const label of manifestLabels) {
    if (!busSource.includes(`"${label}"`)) {
      addIssue(
        errors,
        "AGENTFACTS_LABEL_MISSING",
        `Bus contract does not list generated AgentFacts-lite label: ${label}`,
        BUS_CONTRACT_PATH
      )
    }
  }

  for (const operationId of HIGH_RISK_OPERATION_IDS) {
    if (!busSource.includes(operationId)) {
      addIssue(
        errors,
        "HIGH_RISK_OPERATION_POLICY_MISSING",
        `Bus contract must create policy coverage for high-risk operation: ${operationId}`,
        BUS_CONTRACT_PATH
      )
    }
  }

  if (!busSource.includes('participantKind: "external_agent_runtime"') || !busSource.includes("allowedNow: false")) {
    addIssue(
      errors,
      "EXTERNAL_RUNTIME_NOT_DISABLED",
      "Bus contract must keep external_agent_runtime disabled with allowedNow: false.",
      BUS_CONTRACT_PATH
    )
  }

  if (busSource.includes('kind: "external_agent_runtime"')) {
    addIssue(
      errors,
      "EXTERNAL_RUNTIME_PARTICIPANT_PRESENT",
      "Bus participants must not include an active external_agent_runtime participant.",
      BUS_CONTRACT_PATH,
      lineFor(busSource, 'kind: "external_agent_runtime"')
    )
  }

  for (const relativePath of [ARC_028_DOC, ARC_032_DOC, DBS_006_DOC, RES_004_DOC, ACCEPTANCE_DOC, BACKLOG_DOC]) {
    if (!(await exists(relativePath))) {
      addIssue(errors, "REFERENCED_DOC_MISSING", `Referenced document is missing: ${relativePath}`, relativePath)
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm agent:bus:check",
    taskId: "AGENT-011",
    status: errors.length === 0 ? "ready_for_internal_agent_bus_contract_use" : "blocked",
    contract: {
      path: BUS_CONTRACT_PATH,
      sourceArchitecture: ARC_032_DOC,
      operationCount: REQUIRED_OPERATION_IDS.length,
      lifecycleStateCount: REQUIRED_LIFECYCLE_STATES.length,
      participantKindPolicyCount: REQUIRED_PARTICIPANT_KIND_POLICIES.length,
      manifestLabelCount: manifestLabels.length,
      highRiskOperationCount: HIGH_RISK_OPERATION_IDS.length,
      externalRuntimeEnabled: false,
      externalRegisterable: false,
    },
    checks: {
      lifecycleStates: REQUIRED_LIFECYCLE_STATES.map((state) => ({
        state,
        present: busSource.includes(state),
      })),
      participantKindPolicies: REQUIRED_PARTICIPANT_KIND_POLICIES.map((participantKind) => ({
        participantKind,
        present: busSource.includes(participantKind),
      })),
      operationIds: REQUIRED_OPERATION_IDS.map((operationId) => ({
        operationId,
        inBusContract: busSource.includes(operationId),
        inCommandCatalog: catalogSource.includes(operationId),
      })),
      generatedAgentFactsLabels: manifestLabels.map((label) => ({
        label,
        inBusContract: busSource.includes(`"${label}"`),
      })),
      highRiskOperationPolicies: HIGH_RISK_OPERATION_IDS.map((operationId) => ({
        operationId,
        inBusContract: busSource.includes(operationId),
        policyWriteBlocked: busSource.includes("writeBlocked: true"),
        policyApprovalRequired: busSource.includes("approvalRequired"),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_BUS_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(busSource),
      })),
      referencedDocs: {
        arc028: await exists(ARC_028_DOC),
        arc032: await exists(ARC_032_DOC),
        dbs006: await exists(DBS_006_DOC),
        res004: await exists(RES_004_DOC),
        acceptance: await exists(ACCEPTANCE_DOC),
        backlog: await exists(BACKLOG_DOC),
      },
    },
    safety: {
      publicEndpointCreated: false,
      routeHandlerCreated: false,
      serverActionCreated: false,
      databaseRead: false,
      databaseWrite: false,
      providerCall: false,
      externalRuntimeEnabled: false,
      externalRegistryWrite: false,
      externalRegisterable: false,
      autonomousExecution: false,
      highRiskFinalWrite: false,
      persistedAuditNow: false,
      externalAgentDatabaseAccess: false,
    },
    nextActions: [
      "Use AGENT-012 to build the protected owner AI command center only after this checker passes.",
      "Keep AGENT-013 external adapter work disabled until auth/session, endpoint scopes, trust, deployment proof, rollback, public-safety review, and human approval exist.",
      "Do not persist bus rows until schema, service authorization, audit storage, and proof target approvals are complete.",
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
  console.log("Agent task/message bus contract")
  console.log(`Status: ${proof.status}`)
  console.log(`Operations: ${proof.contract.operationCount}`)
  console.log(`Lifecycle states: ${proof.contract.lifecycleStateCount}`)
  console.log(`AgentFacts-lite labels: ${proof.contract.manifestLabelCount}`)
  console.log(`External runtime enabled: ${proof.contract.externalRuntimeEnabled}`)
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
