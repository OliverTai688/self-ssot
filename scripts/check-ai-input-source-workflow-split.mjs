#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/ai-input-source-workflow-split.contract.ts"
const READINESS_SERVICE_PATH = "src/lib/services/ai-input-readiness.service.ts"
const AI_INPUT_CLIENT_PATH = "src/app/(dashboard)/ai-input/ai-input-client.tsx"
const ARCHITECTURE_DOC = "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md"
const SCHEMA_REVIEW_CONTRACT_PATH = "src/lib/contracts/ai-input-source-workflow-schema-review.contract.ts"
const SCHEMA_REVIEW_DOC = "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md"
const PROOF_TARGET_CONTRACT_PATH = "src/lib/contracts/ai-input-source-workflow-proof-target.contract.ts"
const PROOF_TARGET_DOC = "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md"
const PROPOSAL_ACTION_CONTRACT_PATH =
  "src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts"
const CONNECTOR_BOUNDARY_CONTRACT_PATH =
  "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts"
const ACCEPTANCE_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const AUDIT_DOC = "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md"
const REAL_DATA_DOC = "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md"
const READINESS_DOC = "docs/02_architecture-and-rules/ARC-027_ai-input-formal-readiness-bff.md"
const SCHEMA_DOC = "docs/02_architecture-and-rules/DBS-002_source-workflow-schema-contract.md"
const SECURITY_DOC = "docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md"
const ADAPTER_DOC = "docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md"

const REQUIRED_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_SPLIT_CONTRACT",
  "AI_INPUT_SOURCE_WORKFLOW_SPLIT_SLICES",
  "AI_INPUT_SOURCE_WORKFLOW_SPLIT_SUMMARY",
  "schemaWriteAllowed: false",
  "runtimeWriteAllowed: false",
  "connectorRuntimeAllowed: false",
  "publicOutputExpansion: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentAccessAllowed: false",
  "DATTR-024-SPLIT",
  "DATTR-024A",
  "DATTR-024B",
  "DATTR-024C",
  "DATTR-024D",
  "DATTR-024E",
  "AUDIT-OPS-001",
  "DBS-006",
  "requireUser",
  "service-layer authorization",
  "externalRegisterable: false",
]

const REQUIRED_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
]

const REQUIRED_SLICE_MODES = [
  "protected_read_contract",
  "schema_review_packet",
  "disposable_proof_target",
  "proposal_action_contract",
  "connector_boundary_review",
]

const DATTR_024A_SERVICE_MARKERS = [
  "sourceWorkflow",
  "DATTR-024A",
  "formal_read_contract_active",
  "protected_read_empty_or_unavailable",
  "requireUser() before future persisted reads",
  "service-layer authorization",
  "UI-safe DTO mapper",
  "no DB reads or writes in this slice",
  "hiddenMockFallback: false",
  "ai-input.source-workflow",
  "DATTR-024B",
]

const DATTR_024A_CLIENT_MARKERS = [
  "formalReadiness.sourceWorkflow",
  "FormalSourceWorkflowReadModelTable",
  "Source Workflow formal read model",
  "hidden mock fallback",
  "Count",
]

const DATTR_024B_SCHEMA_REVIEW_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_OBJECTS",
  "AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_MIGRATION_PLAN",
  "AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_SUMMARY",
  "schemaWriteAllowed: false",
  "migrationApplyAllowed: false",
  "runtimeReadAllowed: false",
  "runtimeWriteAllowed: false",
  "connectorRuntimeAllowed: false",
  "publicOutputExpansionAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "nextRunnableSlice: \"DATTR-024C\"",
]

const DATTR_024C_PROOF_TARGET_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_ENV",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_REQUIREMENTS",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SEQUENCE",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SUMMARY",
  "DATTR-024C",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1",
  "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  "writesAllowedByDefault: false",
  "runtimeReadAllowedInDattr024c: false",
  "runtimeWriteAllowedInDattr024c: false",
  "migrationApplyAllowed: false",
  "externalRegisterable: false",
]

const DATTR_024D_PROPOSAL_ACTION_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_OBJECTS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_STATES",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_APPROVAL_LEVELS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_COMMANDS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_AUDIT_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_ROLLBACK",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_STOP_CONDITIONS",
  "AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_SUMMARY",
  "DATTR-024D-CONTRACT",
  "DATTR-024E-CONTRACT",
  "ai-input.proposal.review",
  "ai-input.proposal.approve_for_write_intent",
  "ai-input.write-intent.approve_draft",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
  "requireUser()",
  "service-layer authorization",
  "ai-input.source-workflow",
  "externalRegisterable: false",
  "runtimeWriteAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
]

const DATTR_024E_CONNECTOR_BOUNDARY_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_PROVIDERS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_CONSENT_STATES",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_REQUIREMENTS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_COMMANDS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_AUDIT_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_SUMMARY",
  "DATTR-024E-CONTRACT",
  "boundary_ready_no_runtime",
  "consent-scope",
  "pause-resume-revoke",
  "provider-event-verification",
  "replay-protection",
  "secret-separation",
  "retention-deletion",
  "ai-input.connector.consent.grant",
  "ai-input.connector.revoke",
  "ai-input.provider-event.verify",
  "ai-input.provider-event.reject_replay",
  "ai-input.connector.retention.delete_request",
  "ai-input.source-workflow",
  "routeHandlerAllowedInDattr024eContract: false",
  "oauthRuntimeAllowed: false",
  "webhookRuntimeAllowed: false",
  "pollingRuntimeAllowed: false",
  "providerApiCallAllowed: false",
  "fileIngestionAllowed: false",
  "rawAdapterPayloadExposureAllowed: false",
  "runtimeWriteAllowed: false",
  "externalRegisterable: false",
]

const REQUIRED_OFFICIAL_REFS = [
  "https://nextjs.org/docs/app/getting-started/fetching-data",
  "https://nextjs.org/docs/app/getting-started/mutating-data",
  "https://nextjs.org/docs/app/guides/forms",
  "https://nextjs.org/docs/app/api-reference/file-conventions/route",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/more/best-practices",
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
  console.log("Validate the AI Input Source Workflow BFF split contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm ai-input:split:check")
  console.log("  pnpm ai-input:split:check -- --json")
  console.log(
    "  pnpm ai-input:split:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
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

function validateObjects(contents, errors) {
  for (const objectName of REQUIRED_OBJECTS) {
    if (!contents.includes(objectName)) {
      addIssue(
        errors,
        "SOURCE_WORKFLOW_OBJECT_MISSING",
        `Contract source is missing source workflow object: ${objectName}`,
        CONTRACT_PATH
      )
    }
  }
}

function validateSliceModes(contents, errors) {
  for (const mode of REQUIRED_SLICE_MODES) {
    if (!contents.includes(mode)) {
      addIssue(errors, "SLICE_MODE_MISSING", `Contract source is missing slice mode: ${mode}`, CONTRACT_PATH)
    }
  }
}

function validateOfficialRefs(contents, errors) {
  for (const ref of REQUIRED_OFFICIAL_REFS) {
    if (!contents.includes(ref)) {
      addIssue(
        errors,
        "OFFICIAL_REFERENCE_MISSING",
        `Contract source is missing official reference: ${ref}`,
        CONTRACT_PATH
      )
    }
  }
}

function validateCoverageDensity(contents, errors) {
  const sliceCount = (contents.match(/id: "DATTR-024[A-E]"/g) ?? []).length
  const stopCount = (contents.match(/stopConditions:/g) ?? []).length
  const auditCount = (contents.match(/auditMapping:/g) ?? []).length
  const verificationCount = (contents.match(/verification:/g) ?? []).length

  for (const item of [
    ["split slices", sliceCount, 5],
    ["slice stop conditions", stopCount, 5],
    ["audit mapping lists", auditCount, 5],
    ["verification lists", verificationCount, 5],
  ]) {
    const [label, count, minimum] = item
    if (count < minimum) {
      addIssue(
        errors,
        "SPLIT_CONTRACT_COVERAGE_INCOMPLETE",
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

function validateDattr024AImplementation(readinessSource, clientSource, errors) {
  const serviceMissingMarkers = []
  const clientMissingMarkers = []

  for (const marker of DATTR_024A_SERVICE_MARKERS) {
    if (!readinessSource.includes(marker)) {
      serviceMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024A_SERVICE_MARKER_MISSING",
        `Readiness service is missing DATTR-024A marker: ${marker}`,
        READINESS_SERVICE_PATH
      )
    }
  }

  for (const marker of REQUIRED_OBJECTS.filter((objectName) => objectName !== "OperatingAuditEvent")) {
    if (!readinessSource.includes(marker)) {
      serviceMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024A_READ_MODEL_OBJECT_MISSING",
        `Readiness service is missing DATTR-024A source workflow object: ${marker}`,
        READINESS_SERVICE_PATH
      )
    }
  }

  for (const marker of DATTR_024A_CLIENT_MARKERS) {
    if (!clientSource.includes(marker)) {
      clientMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024A_CLIENT_MARKER_MISSING",
        `AI Input client is missing DATTR-024A marker: ${marker}`,
        AI_INPUT_CLIENT_PATH
      )
    }
  }

  return {
    id: "DATTR-024A",
    status: serviceMissingMarkers.length === 0 && clientMissingMarkers.length === 0 ? "ready_for_read_contract_use" : "blocked",
    servicePath: READINESS_SERVICE_PATH,
    clientPath: AI_INPUT_CLIENT_PATH,
    requiredObjects: REQUIRED_OBJECTS.filter((objectName) => objectName !== "OperatingAuditEvent"),
    serviceMissingMarkers,
    clientMissingMarkers,
  }
}

async function validateDattr024BSchemaReview(errors) {
  const contractMissingMarkers = []
  const docMissingMarkers = []

  let schemaReviewContract = ""
  let schemaReviewDoc = ""

  try {
    schemaReviewContract = await readText(SCHEMA_REVIEW_CONTRACT_PATH)
  } catch {
    addIssue(
      errors,
      "DATTR_024B_SCHEMA_REVIEW_CONTRACT_MISSING",
      `Schema review contract is missing: ${SCHEMA_REVIEW_CONTRACT_PATH}`,
      SCHEMA_REVIEW_CONTRACT_PATH
    )
  }

  try {
    schemaReviewDoc = await readText(SCHEMA_REVIEW_DOC)
  } catch {
    addIssue(
      errors,
      "DATTR_024B_SCHEMA_REVIEW_DOC_MISSING",
      `Schema review doc is missing: ${SCHEMA_REVIEW_DOC}`,
      SCHEMA_REVIEW_DOC
    )
  }

  for (const marker of DATTR_024B_SCHEMA_REVIEW_MARKERS) {
    if (!schemaReviewContract.includes(marker)) {
      contractMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024B_SCHEMA_REVIEW_MARKER_MISSING",
        `Schema review contract is missing DATTR-024B marker: ${marker}`,
        SCHEMA_REVIEW_CONTRACT_PATH
      )
    }
  }

  for (const objectName of REQUIRED_OBJECTS) {
    if (!schemaReviewContract.includes(`id: "${objectName}"`)) {
      contractMissingMarkers.push(objectName)
      addIssue(
        errors,
        "DATTR_024B_SCHEMA_REVIEW_OBJECT_MISSING",
        `Schema review contract is missing object: ${objectName}`,
        SCHEMA_REVIEW_CONTRACT_PATH
      )
    }
    if (!schemaReviewDoc.includes(objectName)) {
      docMissingMarkers.push(objectName)
      addIssue(
        errors,
        "DATTR_024B_SCHEMA_REVIEW_DOC_OBJECT_MISSING",
        `Schema review doc is missing object: ${objectName}`,
        SCHEMA_REVIEW_DOC
      )
    }
  }

  for (const marker of ["DATTR-024B", "DATTR-024C", "Proposal-only", "No migration apply", "No runtime DB read/write"]) {
    if (!schemaReviewDoc.includes(marker)) {
      docMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024B_SCHEMA_REVIEW_DOC_MARKER_MISSING",
        `Schema review doc is missing marker: ${marker}`,
        SCHEMA_REVIEW_DOC
      )
    }
  }

  return {
    id: "DATTR-024B",
    status:
      contractMissingMarkers.length === 0 && docMissingMarkers.length === 0
        ? "ready_for_schema_review_packet_use"
        : "blocked",
    contractPath: SCHEMA_REVIEW_CONTRACT_PATH,
    docPath: SCHEMA_REVIEW_DOC,
    requiredObjects: REQUIRED_OBJECTS,
    contractMissingMarkers,
    docMissingMarkers,
  }
}

async function validateDattr024CProofTarget(errors) {
  const contractMissingMarkers = []
  const docMissingMarkers = []

  let proofTargetContract = ""
  let proofTargetDoc = ""

  try {
    proofTargetContract = await readText(PROOF_TARGET_CONTRACT_PATH)
  } catch {
    addIssue(
      errors,
      "DATTR_024C_PROOF_TARGET_CONTRACT_MISSING",
      `Proof target contract is missing: ${PROOF_TARGET_CONTRACT_PATH}`,
      PROOF_TARGET_CONTRACT_PATH
    )
  }

  try {
    proofTargetDoc = await readText(PROOF_TARGET_DOC)
  } catch {
    addIssue(
      errors,
      "DATTR_024C_PROOF_TARGET_DOC_MISSING",
      `Proof target doc is missing: ${PROOF_TARGET_DOC}`,
      PROOF_TARGET_DOC
    )
  }

  for (const marker of DATTR_024C_PROOF_TARGET_MARKERS) {
    if (!proofTargetContract.includes(marker)) {
      contractMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024C_PROOF_TARGET_MARKER_MISSING",
        `Proof target contract is missing DATTR-024C marker: ${marker}`,
        PROOF_TARGET_CONTRACT_PATH
      )
    }
  }

  for (const objectName of REQUIRED_OBJECTS) {
    if (!proofTargetContract.includes(`"${objectName}"`)) {
      contractMissingMarkers.push(objectName)
      addIssue(
        errors,
        "DATTR_024C_PROOF_TARGET_OBJECT_MISSING",
        `Proof target contract is missing object: ${objectName}`,
        PROOF_TARGET_CONTRACT_PATH
      )
    }
    if (!proofTargetDoc.includes(objectName)) {
      docMissingMarkers.push(objectName)
      addIssue(
        errors,
        "DATTR_024C_PROOF_TARGET_DOC_OBJECT_MISSING",
        `Proof target doc is missing object: ${objectName}`,
        PROOF_TARGET_DOC
      )
    }
  }

  for (const marker of [
    "DATTR-024C",
    "No runtime DB read/write in DATTR-024C",
    "No migration apply in DATTR-024C",
    "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
    "pnpm ai-input:proof-target:check",
  ]) {
    if (!proofTargetDoc.includes(marker)) {
      docMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024C_PROOF_TARGET_DOC_MARKER_MISSING",
        `Proof target doc is missing marker: ${marker}`,
        PROOF_TARGET_DOC
      )
    }
  }

  return {
    id: "DATTR-024C",
    status:
      contractMissingMarkers.length === 0 && docMissingMarkers.length === 0
        ? "ready_for_proof_target_boundary_use"
        : "blocked",
    contractPath: PROOF_TARGET_CONTRACT_PATH,
    docPath: PROOF_TARGET_DOC,
    requiredObjects: REQUIRED_OBJECTS,
    contractMissingMarkers,
    docMissingMarkers,
  }
}

async function validateDattr024DProposalAction(errors) {
  const contractMissingMarkers = []
  let proposalActionContract = ""

  try {
    proposalActionContract = await readText(PROPOSAL_ACTION_CONTRACT_PATH)
  } catch {
    addIssue(
      errors,
      "DATTR_024D_PROPOSAL_ACTION_CONTRACT_MISSING",
      `Proposal action contract is missing: ${PROPOSAL_ACTION_CONTRACT_PATH}`,
      PROPOSAL_ACTION_CONTRACT_PATH
    )
  }

  for (const marker of DATTR_024D_PROPOSAL_ACTION_MARKERS) {
    if (!proposalActionContract.includes(marker)) {
      contractMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024D_PROPOSAL_ACTION_MARKER_MISSING",
        `Proposal action contract is missing DATTR-024D marker: ${marker}`,
        PROPOSAL_ACTION_CONTRACT_PATH
      )
    }
  }

  return {
    id: "DATTR-024D",
    status:
      contractMissingMarkers.length === 0
        ? "ready_for_proposal_action_contract_use"
        : "blocked",
    contractPath: PROPOSAL_ACTION_CONTRACT_PATH,
    contractMissingMarkers,
  }
}

async function validateDattr024EConnectorBoundary(errors) {
  const contractMissingMarkers = []
  let connectorBoundaryContract = ""

  try {
    connectorBoundaryContract = await readText(CONNECTOR_BOUNDARY_CONTRACT_PATH)
  } catch {
    addIssue(
      errors,
      "DATTR_024E_CONNECTOR_BOUNDARY_CONTRACT_MISSING",
      `Connector boundary contract is missing: ${CONNECTOR_BOUNDARY_CONTRACT_PATH}`,
      CONNECTOR_BOUNDARY_CONTRACT_PATH
    )
  }

  for (const marker of DATTR_024E_CONNECTOR_BOUNDARY_MARKERS) {
    if (!connectorBoundaryContract.includes(marker)) {
      contractMissingMarkers.push(marker)
      addIssue(
        errors,
        "DATTR_024E_CONNECTOR_BOUNDARY_MARKER_MISSING",
        `Connector boundary contract is missing DATTR-024E marker: ${marker}`,
        CONNECTOR_BOUNDARY_CONTRACT_PATH
      )
    }
  }

  return {
    id: "DATTR-024E",
    status:
      contractMissingMarkers.length === 0
        ? "ready_for_connector_boundary_contract_use"
        : "blocked",
    contractPath: CONNECTOR_BOUNDARY_CONTRACT_PATH,
    contractMissingMarkers,
  }
}

async function validateReferencedDocs(errors) {
  const docs = [
    ARCHITECTURE_DOC,
    SCHEMA_REVIEW_DOC,
    PROOF_TARGET_DOC,
    ACCEPTANCE_DOC,
    BACKLOG_DOC,
    AUDIT_DOC,
    REAL_DATA_DOC,
    READINESS_DOC,
    SCHEMA_DOC,
    SECURITY_DOC,
    ADAPTER_DOC,
  ]

  for (const doc of docs) {
    if (!(await exists(doc))) {
      addIssue(errors, "REFERENCE_DOC_MISSING", `Referenced document is missing: ${doc}`, doc)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const errors = []
  const warnings = []
  const contractSource = await readText(CONTRACT_PATH)
  const readinessSource = await readText(READINESS_SERVICE_PATH)
  const clientSource = await readText(AI_INPUT_CLIENT_PATH)

  validateRequiredMarkers(contractSource, errors)
  validateObjects(contractSource, errors)
  validateSliceModes(contractSource, errors)
  validateOfficialRefs(contractSource, errors)
  validateCoverageDensity(contractSource, errors)
  validateForbiddenMarkers(contractSource, errors)
  const dattr024AImplementation = validateDattr024AImplementation(readinessSource, clientSource, errors)
  const dattr024BSchemaReview = await validateDattr024BSchemaReview(errors)
  const dattr024CProofTarget = await validateDattr024CProofTarget(errors)
  const dattr024DProposalAction = await validateDattr024DProposalAction(errors)
  const dattr024EConnectorBoundary = await validateDattr024EConnectorBoundary(errors)
  await validateReferencedDocs(errors)

  const status = errors.length === 0 ? "ready_for_bff_split_use" : "blocked"
  const nextRunnableSlice =
    dattr024AImplementation.status !== "ready_for_read_contract_use"
      ? "DATTR-024A"
      : dattr024BSchemaReview.status !== "ready_for_schema_review_packet_use"
        ? "DATTR-024B"
        : dattr024CProofTarget.status !== "ready_for_proof_target_boundary_use"
          ? "DATTR-024C"
          : dattr024DProposalAction.status !== "ready_for_proposal_action_contract_use"
            ? "DATTR-024D"
            : dattr024EConnectorBoundary.status !== "ready_for_connector_boundary_contract_use"
              ? "DATTR-024E"
              : "DATTR-024"
  const proof = {
    id: "DATTR-024-SPLIT",
    status,
    checkedAt: new Date().toISOString(),
    contractPath: CONTRACT_PATH,
    architectureDoc: ARCHITECTURE_DOC,
    acceptanceDoc: ACCEPTANCE_DOC,
    splitSlices: REQUIRED_MARKERS.filter((marker) => /^DATTR-024[A-E]$/.test(marker)),
    requiredObjects: REQUIRED_OBJECTS,
    officialSourceRefs: REQUIRED_OFFICIAL_REFS,
    implementedSlices: [
      dattr024AImplementation,
      dattr024BSchemaReview,
      dattr024CProofTarget,
      dattr024DProposalAction,
      dattr024EConnectorBoundary,
    ],
    safetyGuards: {
      schemaWriteAllowed: false,
      runtimeWriteAllowed: false,
      connectorRuntimeAllowed: false,
      publicOutputExpansion: false,
      moduleFinalWriteAllowed: false,
      externalAgentAccessAllowed: false,
    },
    nextRunnableSlice,
    blockedTasks: ["AUTH-005", "WORK-009", "DATTR-024", "DATTR-024C"],
    errors,
    warnings,
  }

  if (args.out) {
    const outPath = repoPath(args.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8")
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else {
    console.log(`AI Input Source Workflow split contract: ${status}`)
    console.log(`Contract: ${CONTRACT_PATH}`)
    console.log(`Architecture: ${ARCHITECTURE_DOC}`)
    console.log(`Next runnable slice: ${proof.nextRunnableSlice}`)
    console.log(`Objects: ${REQUIRED_OBJECTS.length}`)
    console.log(`DATTR-024A implementation: ${dattr024AImplementation.status}`)
    console.log(`DATTR-024B schema review: ${dattr024BSchemaReview.status}`)
    console.log(`DATTR-024C proof target: ${dattr024CProofTarget.status}`)
    console.log(`DATTR-024D proposal action: ${dattr024DProposalAction.status}`)
    console.log(`DATTR-024E connector boundary: ${dattr024EConnectorBoundary.status}`)

    if (args.out) {
      console.log(`Proof written: ${args.out}`)
    }

    if (warnings.length > 0) {
      console.log("")
      console.log("Warnings:")
      for (const warning of warnings) {
        console.log(`- ${warning.code}: ${warning.message}`)
      }
    }

    if (errors.length > 0) {
      console.log("")
      console.log("Errors:")
      for (const error of errors) {
        const suffix = error.line ? ` (${error.path}:${error.line})` : ` (${error.path})`
        console.log(`- ${error.code}: ${error.message}${suffix}`)
      }
    }
  }

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
