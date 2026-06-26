#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts",
)
const AUT_007_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md",
)
const ARC_031_PATH = path.join(ROOT, "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md")
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md")
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md")
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md")
const TASKS_PATH = path.join(ROOT, "tasks.md")
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md")
const MAN_001_PATH = path.join(ROOT, "docs/00_manual-and-index/MAN-001_document-index.md")
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json")
const CONNECTOR_BOUNDARY_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
)
const RLS_AUDIT_CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
)
const SERVICE_RUNTIME_PATH = path.join(ROOT, "src/lib/services/ai-input-source-workflow.service.ts")
const AUDIT_STORAGE_REVIEW_PATH = path.join(ROOT, "src/lib/contracts/operating-audit-storage-review.contract.ts")

const REQUIRED_GATE_IDS = [
  "provider-inventory-data-classification",
  "oauth-consent-scope-pkce-review",
  "secret-storage-vault-env-review",
  "webhook-signature-raw-body-review",
  "webhook-replay-idempotency-review",
  "polling-rate-limit-cursor-review",
  "adapter-payload-redaction-review",
  "source-workflow-mapping-review",
  "service-authz-rls-audit-dependency",
  "proof-target-dry-run-first-review",
  "owner-human-approval-rollback-review",
  "external-agent-nanda-boundary-review",
]

const REQUIRED_PROVIDERS = [
  "manual",
  "local_file",
  "url",
  "rss",
  "google_drive",
  "google_docs",
  "gmail",
  "line",
  "telegram",
  "github_markdown",
]

const REQUIRED_CONTRACT_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_GATES",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_PROVIDER_FAMILIES",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_REQUIRED_GATE_IDS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_OFFICIAL_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_STOP_CONDITIONS",
  "AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_SUMMARY",
  "DATTR-024L-CONNECTOR-RUNTIME",
  "ready_for_connector_runtime_approval_review",
  "connector_runtime_approval_only_no_activation",
  "requireUser()",
  "service-layer authorization",
  "SourceConnection",
  "SourceAsset",
  "OperatingAuditEvent",
  "providerEventRef",
  "proofRef",
  "PKCE",
  "raw body",
  "signature",
  "replay",
  "idempotency",
  "Supabase Vault",
  "runtimeApprovalSelected: false",
  "connectorRuntimeAllowed: false",
  "routeHandlerAdded: false",
  "oauthRuntimeAllowed: false",
  "webhookRuntimeAllowed: false",
  "pollingRuntimeAllowed: false",
  "providerApiRuntimeAllowed: false",
  "fileIngestionAllowed: false",
  "ocrTranscriptionAllowed: false",
  "rawAdapterPayloadExposureAllowed: false",
  "secretWriteAllowed: false",
  "schemaMigrationAllowed: false",
  "migrationApplyAllowed: false",
  "databaseReadAllowed: false",
  "databaseWriteAllowed: false",
  "publicOutputAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
  "AIINPUT-OPS-003",
]

const REQUIRED_SOURCE_REFS = [
  "https://www.rfc-editor.org/rfc/rfc9700.html",
  "https://www.rfc-editor.org/rfc/rfc7636",
  "https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries",
  "https://docs.stripe.com/webhooks/signature",
  "https://supabase.com/docs/guides/database/vault",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md",
  "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
  "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
  "src/lib/services/ai-input-source-workflow.service.ts",
]

const REQUIRED_DOC_MARKERS = [
  "DATTR-024L-CONNECTOR-RUNTIME",
  "docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md",
  "src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts",
  "scripts/check-ai-input-source-workflow-connector-runtime-approval.mjs",
  "pnpm ai-input:connector-runtime:check",
  "runtimeApprovalSelected=false",
  "connectorRuntimeAllowed=false",
  "oauthRuntimeAllowed=false",
  "webhookRuntimeAllowed=false",
  "pollingRuntimeAllowed=false",
  "providerApiRuntimeAllowed=false",
  "secretWriteAllowed=false",
  "databaseReadAllowed=false",
  "databaseWriteAllowed=false",
  "externalRegisterable=false",
  "AIINPUT-OPS-003",
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  "new PrismaClient",
  "PrismaPg",
  "new Pool",
  "process.env.",
  "fetch(",
  "createServerClient",
  "createClient(",
  "spawnSync(",
  "execSync(",
  "$transaction(",
  "revalidatePath(",
  "cookies(",
  "headers(",
  "\"use server\"",
  "\"use client\"",
  "import ",
  "from \"",
  "from '",
]

function parseArgs(argv) {
  const args = { json: false, out: null }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]
    if (arg === "--json") {
      args.json = true
      continue
    }
    if (arg === "--out") {
      args.out = filteredArgs[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: pnpm ai-input:connector-runtime:check [--json] [--out <path>]")
      process.exit(0)
    }
  }

  return args
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null
}

function relative(filePath) {
  return path.relative(ROOT, filePath)
}

function validateMarkers({ text, markers, label, filePath, errors }) {
  const missing = markers.filter((marker) => !text.includes(marker))
  if (missing.length > 0) {
    errors.push(`${label} is missing markers: ${missing.join(", ")} (${relative(filePath)})`)
  }
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const warnings = []
const evidence = {}

const contractText = readText(CONTRACT_PATH)
const aut007Text = readText(AUT_007_PATH)
const arc031Text = readText(ARC_031_PATH)
const acc002Text = readText(ACC_002_PATH)
const backlogText = readText(BACKLOG_PATH)
const sprintText = readText(SPRINT_PATH)
const tasksText = readText(TASKS_PATH)
const completedLogText = readText(COMPLETED_LOG_PATH)
const man001Text = readText(MAN_001_PATH)
const packageJsonText = readText(PACKAGE_JSON_PATH)
const connectorBoundaryText = readText(CONNECTOR_BOUNDARY_PATH)
const rlsAuditContractText = readText(RLS_AUDIT_CONTRACT_PATH)
const serviceRuntimeText = readText(SERVICE_RUNTIME_PATH)
const auditStorageReviewText = readText(AUDIT_STORAGE_REVIEW_PATH)

for (const [name, text, filePath] of [
  ["connector runtime approval contract", contractText, CONTRACT_PATH],
  ["AUT-007", aut007Text, AUT_007_PATH],
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
  ["MAN-001", man001Text, MAN_001_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["DATTR-024E connector boundary", connectorBoundaryText, CONNECTOR_BOUNDARY_PATH],
  ["DATTR-024K RLS/audit contract", rlsAuditContractText, RLS_AUDIT_CONTRACT_PATH],
  ["DATTR-024J service runtime", serviceRuntimeText, SERVICE_RUNTIME_PATH],
  ["AUDIT-OPS-004 storage review", auditStorageReviewText, AUDIT_STORAGE_REVIEW_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${name}: ${relative(filePath)}`)
  }
}

if (contractText !== null) {
  validateMarkers({
    text: contractText,
    markers: REQUIRED_CONTRACT_MARKERS,
    label: "connector runtime approval contract",
    filePath: CONTRACT_PATH,
    errors,
  })

  const missingGates = REQUIRED_GATE_IDS.filter((gateId) => !contractText.includes(`id: "${gateId}"`))
  if (missingGates.length > 0) {
    errors.push(`Connector runtime approval contract is missing gates: ${missingGates.join(", ")}`)
  }

  const missingProviders = REQUIRED_PROVIDERS.filter((providerId) => !contractText.includes(`id: "${providerId}"`))
  if (missingProviders.length > 0) {
    errors.push(`Connector runtime approval contract is missing providers: ${missingProviders.join(", ")}`)
  }

  const missingSourceRefs = REQUIRED_SOURCE_REFS.filter((ref) => !contractText.includes(ref))
  if (missingSourceRefs.length > 0) {
    errors.push(`Connector runtime approval contract is missing source refs: ${missingSourceRefs.join(", ")}`)
  }

  const forbidden = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern))
  if (forbidden.length > 0) {
    errors.push(`Connector runtime approval contract contains forbidden runtime markers: ${forbidden.join(", ")}`)
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText)
  const script = packageJson.scripts?.["ai-input:connector-runtime:check"]
  if (script !== "node scripts/check-ai-input-source-workflow-connector-runtime-approval.mjs") {
    errors.push("package.json must expose ai-input:connector-runtime:check")
  }
}

if (connectorBoundaryText !== null) {
  validateMarkers({
    text: connectorBoundaryText,
    markers: [
      "DATTR-024E-CONTRACT",
      "oauthRuntimeAllowed: false",
      "webhookRuntimeAllowed: false",
      "pollingRuntimeAllowed: false",
      "providerApiCallAllowed: false",
      "externalRegisterable: false",
    ],
    label: "DATTR-024E connector boundary",
    filePath: CONNECTOR_BOUNDARY_PATH,
    errors,
  })
}

if (rlsAuditContractText !== null) {
  validateMarkers({
    text: rlsAuditContractText,
    markers: [
      "DATTR-024K-RLS-AUDIT-STORAGE",
      "identityStrategySelected: false",
      "rlsPolicyApplyAllowed: false",
      "auditStorageRuntimeAllowed: false",
      "databaseReadAllowed: false",
      "databaseWriteAllowed: false",
      "externalRegisterable: false",
    ],
    label: "DATTR-024K RLS/audit contract",
    filePath: RLS_AUDIT_CONTRACT_PATH,
    errors,
  })
}

if (serviceRuntimeText !== null) {
  validateMarkers({
    text: serviceRuntimeText,
    markers: ["requireUser()", "runtimeDbReadEnabled: false", "runtimeDbWriteEnabled: false"],
    label: "DATTR-024J service runtime",
    filePath: SERVICE_RUNTIME_PATH,
    errors,
  })
}

if (auditStorageReviewText !== null) {
  validateMarkers({
    text: auditStorageReviewText,
    markers: ["AUDIT-OPS-004", "append-only", "retention", "integrity", "externalRegisterable: false"],
    label: "AUDIT-OPS-004 storage review",
    filePath: AUDIT_STORAGE_REVIEW_PATH,
    errors,
  })
}

for (const [name, text, filePath] of [
  ["AUT-007", aut007Text, AUT_007_PATH],
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
]) {
  if (text !== null) {
    validateMarkers({
      text,
      markers: REQUIRED_DOC_MARKERS,
      label: name,
      filePath,
      errors,
    })
  }
}

if (man001Text !== null) {
  validateMarkers({
    text: man001Text,
    markers: [
      "AUT-007_ai-input-source-workflow-connector-runtime-approval.md",
      "AI Input Source Workflow connector runtime approval",
    ],
    label: "MAN-001",
    filePath: MAN_001_PATH,
    errors,
  })
}

evidence.status = errors.length === 0 ? "ready_for_connector_runtime_approval_review" : "failed"
evidence.taskId = "DATTR-024L-CONNECTOR-RUNTIME"
evidence.mode = "connector_runtime_approval_only_no_activation"
evidence.gateCount = REQUIRED_GATE_IDS.length
evidence.providerFamilyCount = REQUIRED_PROVIDERS.length
evidence.runtimeApprovalSelected = false
evidence.connectorRuntimeAllowed = false
evidence.oauthRuntimeAllowed = false
evidence.webhookRuntimeAllowed = false
evidence.pollingRuntimeAllowed = false
evidence.providerApiRuntimeAllowed = false
evidence.secretWriteAllowed = false
evidence.databaseReadAllowed = false
evidence.databaseWriteAllowed = false
evidence.externalRegisterable = false
evidence.nextTask = "AIINPUT-OPS-003"
evidence.warnings = warnings
evidence.errors = errors

if (args.out) {
  const outPath = path.resolve(ROOT, args.out)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(evidence, null, 2))
} else if (errors.length > 0) {
  console.error(`AI Input Source Workflow connector runtime approval check failed with ${errors.length} error(s):`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
} else {
  console.log(
    [
      "AI Input Source Workflow connector runtime approval check passed.",
      `status=${evidence.status}`,
      `taskId=${evidence.taskId}`,
      `mode=${evidence.mode}`,
      `gateCount=${evidence.gateCount}`,
      `providerFamilyCount=${evidence.providerFamilyCount}`,
      `nextTask=${evidence.nextTask}`,
      "runtimeApprovalSelected=false",
      "connectorRuntimeAllowed=false",
      "oauthRuntimeAllowed=false",
      "webhookRuntimeAllowed=false",
      "pollingRuntimeAllowed=false",
      "providerApiRuntimeAllowed=false",
      "secretWriteAllowed=false",
      "databaseReadAllowed=false",
      "databaseWriteAllowed=false",
      "externalRegisterable=false",
    ].join(" "),
  )
}

process.exit(errors.length === 0 ? 0 : 1)
