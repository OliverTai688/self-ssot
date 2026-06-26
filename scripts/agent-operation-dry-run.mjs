#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const DEFAULT_OUT = "docs/2_agent-input/generated/agent-loop/agent-operations/latest-agent-operation-dry-run.json"
const MANIFEST_PATH =
  "docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json"
const INDEX_PATH = "docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json"

const OPERATION_CATALOG = [
  {
    id: "agent.ops.describe-contract",
    version: "0.1.0",
    label: "Describe owner-only agent operation contract",
    ownerAgent: "WorkflowAgent",
    targetModule: "agent-team-os",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-generated-agent-evidence",
    scopes: ["agent:operation:read", "agent:manifest:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      agentLabel: "optional string",
      targetModule: "optional string",
    },
    outputContract: {
      operationContract: "UI/API/CLI-aligned operation contract",
      safetyBoundary: "No-write, no-secret, no-public-endpoint boundary",
      auditRefs: "Generated evidence refs and future audit event shape",
      nextReview: "Recommended next implementation or approval gate",
    },
    cli: "pnpm agent:op -- --operation agent.ops.describe-contract --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: [
      "protected /admin Agent Protocol readiness surface",
      "protected /settings Agent Protocol readiness surface",
    ],
    auditRefs: [
      "docs/2_agent-input/generated/agent-loop/reports/",
      "future append-only operating audit event",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
      "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
      "docs/05_execution-plans/PLN-060_task-backlog.md",
    ],
    blockedActions: [
      "runtime agent execution",
      "autonomous write",
      "public endpoint exposure",
      "external registry write",
      "direct database access by external agents",
      "high-risk module final write",
    ],
  },
  {
    id: "work.proof.preflight",
    version: "0.1.0",
    label: "Plan Work proof preflight",
    ownerAgent: "WorkAgent",
    targetModule: "work",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-proof-metadata",
    scopes: ["work:proof:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      proofTarget: "optional local/disposable target label; never a URL",
      requestedChecks: "optional string array",
    },
    outputContract: {
      preflightPlan: "Planned Work proof checks",
      safetyBoundary: "No DB writes unless WORK-009 run-mode confirmations exist",
      nextReview: "WORK-009 or blocker analysis",
    },
    cli: "pnpm agent:op -- --operation work.proof.preflight --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected Work Agent workspace", "protected /admin launch proof surface"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future Work proof audit event"],
    sourceRefs: [
      "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md",
      "scripts/work-refresh-proof.mjs",
    ],
    blockedActions: [
      "DB write without WORK-009 confirmations",
      "valuable database mutation",
      "browser write smoke without approval",
    ],
  },
  {
    id: "research.workspace.plan",
    version: "0.1.0",
    label: "Plan Research workspace synthesis",
    ownerAgent: "ResearchAgent",
    targetModule: "research",
    riskLevel: "LOW",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-local-prototype-state",
    scopes: ["research:workspace:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "source clustering plan, issue synthesis outline, and writing next-step proposal",
      safetyBoundary: "No source mutation, external publication, or external collaboration packet",
      nextReview: "Research workspace UI/BFF maturity",
    },
    cli: "pnpm agent:op -- --operation research.workspace.plan --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /research agent workspace"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future agent.operation audit event"],
    sourceRefs: [
      "docs/01_product-requirements/PRD-005_situation-driven-prd.md",
      "docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md",
    ],
    blockedActions: [
      "publish research output",
      "mutate source records",
      "send external collaboration packets",
    ],
  },
  {
    id: "ai-input.source-workflow.review",
    version: "0.1.0",
    label: "Review AI Input source workflow readiness",
    ownerAgent: "IngestionAgent",
    targetModule: "ai-input",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "repo-docs-and-source-workflow-readiness",
    scopes: ["ai-input:source-workflow:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "connector boundary review, proposal action checklist, and proof target readiness notes",
      safetyBoundary: "No connector runtime, provider payload read, or source workflow DB write",
      nextReview: "DATTR-024 proof/write approval gates",
    },
    cli: "pnpm agent:op -- --operation ai-input.source-workflow.review --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /ai-input formal source workflow agent panel"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future ai-input.source-workflow audit event"],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
      "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
    ],
    blockedActions: [
      "connector OAuth or webhook runtime",
      "source workflow DB write",
      "provider payload read",
      "external agent context package",
    ],
  },
  {
    id: "workflow.queue.plan",
    version: "0.1.0",
    label: "Plan Workflow queue and automation boundary",
    ownerAgent: "WorkflowAgent",
    targetModule: "workflow",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "repo-docs-and-workflow-prototype-state",
    scopes: ["workflow:queue:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "automation sequence proposal, task routing notes, and approval lane checklist",
      safetyBoundary: "No autonomous workflow execution or provider mutation",
      nextReview: "AGENT-011 internal task/message bus contract",
    },
    cli: "pnpm agent:op -- --operation workflow.queue.plan --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /workflow agent workspace"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future workflow audit event"],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-023_agent-team-os-operating-contract.md",
      "docs/06_audits-and-reports/RPT-011_loop-68-research-gap-review.md",
    ],
    blockedActions: [
      "autonomous workflow execution",
      "schedule/provider mutation",
      "cross-module final write",
    ],
  },
  {
    id: "life.routine.propose",
    version: "0.1.0",
    label: "Propose Life routine next action",
    ownerAgent: "LifeAgent",
    targetModule: "life",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-life-context",
    scopes: ["life:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "routine proposal, habit review notes, and manual approval checklist",
      safetyBoundary: "No life final write, provider mutation, or external sharing",
      nextReview: "Owner-reviewed Life proposal UI",
    },
    cli: "pnpm agent:op -- --operation life.routine.propose --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /life agent proposals tab"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future high-risk proposal audit event"],
    sourceRefs: [
      "docs/07_research-and-design/RES-003_interface-completion-operating-surface-research.md",
      "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md",
    ],
    blockedActions: ["health or life data final write", "external sharing", "calendar/provider mutation"],
  },
  {
    id: "finance.review-draft",
    version: "0.1.0",
    label: "Review Finance draft and risk boundary",
    ownerAgent: "FinanceAgent",
    targetModule: "finance",
    riskLevel: "CRITICAL",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-finance-context",
    scopes: ["finance:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "finance draft review, risk note, and manual approval checklist",
      safetyBoundary: "No financial final write, transaction, provider mutation, or external sharing",
      nextReview: "Owner-reviewed Finance proposal UI",
    },
    cli: "pnpm agent:op -- --operation finance.review-draft --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /finance agent proposals tab"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future high-risk proposal audit event"],
    sourceRefs: [
      "docs/05_execution-plans/PLN-026_finance-draft-only-mvp.md",
      "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md",
    ],
    blockedActions: ["financial final write", "transaction", "external sharing", "provider mutation"],
  },
  {
    id: "chamber.relationship.plan",
    version: "0.1.0",
    label: "Plan Chamber relationship follow-up",
    ownerAgent: "ChamberAgent",
    targetModule: "chamber",
    riskLevel: "MEDIUM",
    approvalLevel: "AUTO_PROPOSE",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-relationship-context",
    scopes: ["chamber:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "follow-up proposal, relationship context checklist, and manual send boundary",
      safetyBoundary: "No message send, contact publication, or external CRM sync",
      nextReview: "Owner-reviewed Chamber proposal UI",
    },
    cli: "pnpm agent:op -- --operation chamber.relationship.plan --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /chamber agent proposals tab"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future chamber proposal audit event"],
    sourceRefs: [
      "docs/05_execution-plans/PLN-027_chamber-crm-mvp.md",
      "docs/07_research-and-design/RES-003_interface-completion-operating-surface-research.md",
    ],
    blockedActions: ["send message", "publish contact detail", "external CRM sync"],
  },
  {
    id: "company.strategy.review",
    version: "0.1.0",
    label: "Review Company strategy proposal",
    ownerAgent: "CompanyAgent",
    targetModule: "company",
    riskLevel: "HIGH",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "local-prototype-and-owner-reviewed-company-context",
    scopes: ["company:proposal:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "strategy option review, decision risk note, and manual approval checklist",
      safetyBoundary: "No strategy final write, public commitment, or external sharing",
      nextReview: "Owner-reviewed Company proposal UI",
    },
    cli: "pnpm agent:op -- --operation company.strategy.review --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /company agent proposals tab"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future high-risk proposal audit event"],
    sourceRefs: [
      "docs/05_execution-plans/PLN-028_company-strategy-mvp.md",
      "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md",
    ],
    blockedActions: ["company strategy final write", "public commitment", "external sharing"],
  },
  {
    id: "client-portal.visibility.preflight",
    version: "0.1.0",
    label: "Preflight Client Portal visibility boundary",
    ownerAgent: "ClientPortalAgent",
    targetModule: "client-portal",
    riskLevel: "CRITICAL",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    dataVisibilityLevel: "public-output-boundary-metadata-only",
    scopes: ["client-portal:visibility:read", "agent:operation:read"],
    allowedModes: ["dry_run"],
    inputContract: {
      operationId: "string",
      requestedChecks: "optional string array",
    },
    outputContract: {
      proposalOutputs: "visibility checklist, public output risk note, and token-gate review",
      safetyBoundary: "No public output expansion, token mutation, or client-visible data change",
      nextReview: "Client Portal approval package",
    },
    cli: "pnpm agent:op -- --operation client-portal.visibility.preflight --json",
    futureProtectedApi: "POST /api/agent-operations/dry-run",
    uiSurfaceRefs: ["protected /admin client portal readiness panel"],
    auditRefs: ["docs/2_agent-input/generated/agent-loop/reports/", "future public-output audit event"],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md",
      "docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md",
    ],
    blockedActions: [
      "public output expansion",
      "token lifecycle mutation",
      "client-visible data change",
    ],
  },
]

function parseArgs(argv) {
  const args = {
    operation: "agent.ops.describe-contract",
    agent: null,
    targetModule: null,
    out: DEFAULT_OUT,
    json: false,
    list: false,
    help: false,
  }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--operation") {
      args.operation = readValue(filteredArgs, index, "--operation")
      index += 1
    } else if (arg === "--agent") {
      args.agent = readValue(filteredArgs, index, "--agent")
      index += 1
    } else if (arg === "--target-module") {
      args.targetModule = readValue(filteredArgs, index, "--target-module")
      index += 1
    } else if (arg === "--out") {
      args.out = readValue(filteredArgs, index, "--out")
      index += 1
    } else if (arg === "--json") {
      args.json = true
    } else if (arg === "--list") {
      args.list = true
    } else if (arg === "--run" || arg === "--execute") {
      throw new Error(`${arg} is not supported. Agent operations are dry-run only in AGENT-OPS-001.`)
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function readValue(args, index, label) {
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${label} requires a value`)
  }
  return value
}

function printHelp() {
  console.log("Run a no-write Personal OS agent operation dry-run")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm agent:op")
  console.log("  pnpm agent:op -- --json")
  console.log("  pnpm agent:op -- --list")
  console.log("  pnpm agent:op -- --operation work.proof.preflight --json")
  console.log(
    "  pnpm agent:op -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
  )
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), "utf8"))
}

function findOperation(operationId) {
  return OPERATION_CATALOG.find((operation) => operation.id === operationId)
}

function summarizeCatalog() {
  return OPERATION_CATALOG.map((operation) => ({
    id: operation.id,
    label: operation.label,
    ownerAgent: operation.ownerAgent,
    targetModule: operation.targetModule,
    riskLevel: operation.riskLevel,
    approvalLevel: operation.approvalLevel,
    allowedModes: operation.allowedModes,
  }))
}

function buildDryRun(args) {
  const registry = readJson(MANIFEST_PATH)
  const index = readJson(INDEX_PATH)
  const operation = findOperation(args.operation)

  if (!operation) {
    throw new Error(`Unknown operation: ${args.operation}`)
  }

  const effectiveAgent = args.agent ?? operation.ownerAgent
  const effectiveTargetModule = args.targetModule ?? operation.targetModule
  const manifest = registry.manifests.find((item) => item.label === effectiveAgent)

  if (!manifest) {
    throw new Error(`Agent is not in the internal AgentFacts-lite registry: ${effectiveAgent}`)
  }

  const agentMatchesOperation = effectiveAgent === operation.ownerAgent
  const targetMatchesOperation = effectiveTargetModule === operation.targetModule
  const externalRegisterable = manifest.registry?.externalRegisterable === true
  const internalDiscoverable = manifest.registry?.internalDiscoverable === true
  const operationReady = agentMatchesOperation && targetMatchesOperation && internalDiscoverable && !externalRegisterable

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm agent:op",
    mode: "dry_run",
    status: operationReady ? "ready_for_owner_dry_run" : "blocked",
    selectedOperation: {
      ...operation,
      requestedAgent: effectiveAgent,
      requestedTargetModule: effectiveTargetModule,
    },
    agentManifestSnapshot: {
      id: manifest.id,
      agent_name: manifest.agent_name,
      label: manifest.label,
      lifecycleStatus: manifest.lifecycle?.status,
      protocols: manifest.protocols,
      approvalLevel: manifest.trust?.approvalLevel,
      dataVisibilityLevel: manifest.trust?.dataVisibilityLevel,
      internalDiscoverable,
      externalRegisterable,
      registrationStatus: manifest.registry?.registrationStatus,
      endpointCounts: {
        internal: manifest.endpoints?.internal?.length ?? 0,
        external: manifest.endpoints?.external?.length ?? 0,
      },
    },
    registrySnapshot: {
      sourceOfTruth: index.sourceOfTruth,
      manifestFile: index.manifestFile,
      manifestCount: index.coverage?.manifestCount ?? registry.manifests.length,
      internalDiscoverable: index.registryState?.internalDiscoverable === true,
      externalRegisterable: index.registryState?.externalRegisterable === true,
      registrationStatus: index.registryState?.registrationStatus,
      runtimeEndpoint: index.registryState?.runtimeEndpoint,
      publicDirectory: index.registryState?.publicDirectory,
    },
    safety: {
      writesPerformed: false,
      databaseAccessed: false,
      environmentRead: false,
      publicEndpointCreated: false,
      externalRegistryWrite: false,
      externalRegisterableAfterRun: false,
      rawSecretsIncluded: false,
      blockedIfRunRequested: true,
      reasons: [
        "AGENT-OPS-001 is owner-only dry-run CLI proof.",
        "The command reads generated AgentFacts-lite files only.",
        "No environment variables, cookies, tokens, database URLs, provider payloads, or private records are read.",
        "The CLI creates no public endpoint, DB write, migration, seed, or external registration. Protected HTTP dry-run is handled separately by AGENT-014.",
      ],
    },
    validation: {
      agentMatchesOperation,
      targetMatchesOperation,
      internalDiscoverable,
      externalRegisterableBlocked: !externalRegisterable,
      allowedModeIsDryRunOnly:
        operation.allowedModes.length === 1 && operation.allowedModes.includes("dry_run"),
    },
    nextReview: operationReady
      ? "Use this contract as the UI/API/CLI alignment base before any owner command center or approval-write slice."
      : "Review requested agent/target module against the operation catalog before expanding runtime behavior.",
  }
}

function printHuman(result) {
  if (Array.isArray(result)) {
    console.log("Agent operation catalog")
    for (const operation of result) {
      console.log(`- ${operation.id} (${operation.ownerAgent}, ${operation.targetModule})`)
    }
    return
  }

  console.log("Agent operation dry-run")
  console.log(`Status: ${result.status}`)
  console.log(`Operation: ${result.selectedOperation.id}`)
  console.log(`Agent: ${result.agentManifestSnapshot.label}`)
  console.log(`Mode: ${result.mode}`)
  console.log(`Writes performed: ${result.safety.writesPerformed}`)
  console.log(`External registration: ${result.safety.externalRegistryWrite ? "attempted" : "not_attempted"}`)
}

function writeProof(outPath, proof) {
  const absolutePath = resolve(process.cwd(), outPath)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(proof, null, 2)}\n`)
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const result = args.list ? summarizeCatalog() : buildDryRun(args)

  if (!args.list) {
    writeProof(args.out, result)
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result)
    if (!args.list) {
      console.log(`Proof written: ${args.out}`)
    }
  }

  if (!args.list && result.status !== "ready_for_owner_dry_run") {
    process.exitCode = 1
  }
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
