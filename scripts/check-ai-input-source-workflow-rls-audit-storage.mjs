#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const CONTRACT_PATH = path.join(ROOT, "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts")
const AUT_006_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md",
)
const ARC_031_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
)
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md")
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md")
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md")
const TASKS_PATH = path.join(ROOT, "tasks.md")
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md")
const MAN_001_PATH = path.join(ROOT, "docs/00_manual-and-index/MAN-001_document-index.md")
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json")
const MIGRATION_DRAFT_PATH = path.join(
  ROOT,
  "prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql",
)
const SERVICE_RUNTIME_PATH = path.join(ROOT, "src/lib/services/ai-input-source-workflow.service.ts")
const AUDIT_STORAGE_REVIEW_PATH = path.join(ROOT, "src/lib/contracts/operating-audit-storage-review.contract.ts")

const REQUIRED_GATE_IDS = [
  "identity-strategy-review",
  "rls-default-deny-review",
  "owner-select-policy-review",
  "owner-write-check-review",
  "proposal-approval-policy-review",
  "operating-audit-storage-model-review",
  "audit-append-only-integrity-review",
  "audit-read-redaction-review",
  "secret-separation-vault-review",
  "proof-matrix-cross-owner-review",
  "migration-apply-boundary-review",
  "external-agent-database-boundary-review",
]

const REQUIRED_TABLES = [
  "source_connections",
  "source_assets",
  "ai_workflow_runs",
  "ai_work_items",
  "source_naming_profiles",
  "data_unit_proposals",
  "module_write_intents",
  "operating_audit_events",
]

const REQUIRED_CONTRACT_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_REQUIRED_GATE_IDS",
  "AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_REQUIRED_TABLES",
  "AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_IDENTITY_STRATEGIES",
  "AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_GATES",
  "AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_SOURCE_REFS",
  "AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_SUMMARY",
  "DATTR-024K-RLS-AUDIT-STORAGE",
  "ready_for_rls_audit_storage_review",
  "rls_audit_storage_review_only_no_runtime",
  "supabase-auth-user-id-mapping",
  "trusted-server-transaction-claim",
  "auth.uid()",
  "Profile.id",
  "owner_id",
  "WITH CHECK",
  "default-deny",
  "append-only",
  "Supabase Vault",
  "identityStrategySelected: false",
  "rlsPolicyApplyAllowed: false",
  "auditStorageRuntimeAllowed: false",
  "schemaMigrationAllowed: false",
  "databaseReadAllowed: false",
  "databaseWriteAllowed: false",
  "routeHandlerAdded: false",
  "serverActionAdded: false",
  "connectorRuntimeAllowed: false",
  "providerDataAllowed: false",
  "publicOutputAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
  "DATTR-024L-CONNECTOR-RUNTIME",
]

const REQUIRED_SOURCE_REFS = [
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://supabase.com/docs/guides/database/secure-data",
  "https://supabase.com/docs/guides/database/vault",
  "https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv",
  "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
  "https://www.postgresql.org/docs/current/sql-createpolicy.html",
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "src/lib/contracts/operating-audit-storage-review.contract.ts",
  "src/lib/services/ai-input-source-workflow.service.ts",
]

const REQUIRED_DOC_MARKERS = [
  "DATTR-024K-RLS-AUDIT-STORAGE",
  "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
  "docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md",
  "scripts/check-ai-input-source-workflow-rls-audit-storage.mjs",
  "pnpm ai-input:rls-audit-storage:check",
  "identityStrategySelected=false",
  "rlsPolicyApplyAllowed=false",
  "auditStorageRuntimeAllowed=false",
  "externalRegisterable=false",
  "DATTR-024L-CONNECTOR-RUNTIME",
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
      console.log("Usage: pnpm ai-input:rls-audit-storage:check [--json] [--out <path>]")
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
const aut006Text = readText(AUT_006_PATH)
const arc031Text = readText(ARC_031_PATH)
const acc002Text = readText(ACC_002_PATH)
const backlogText = readText(BACKLOG_PATH)
const sprintText = readText(SPRINT_PATH)
const tasksText = readText(TASKS_PATH)
const completedLogText = readText(COMPLETED_LOG_PATH)
const man001Text = readText(MAN_001_PATH)
const packageJsonText = readText(PACKAGE_JSON_PATH)
const migrationDraftText = readText(MIGRATION_DRAFT_PATH)
const serviceRuntimeText = readText(SERVICE_RUNTIME_PATH)
const auditStorageReviewText = readText(AUDIT_STORAGE_REVIEW_PATH)

for (const [name, text, filePath] of [
  ["RLS/audit storage contract", contractText, CONTRACT_PATH],
  ["AUT-006", aut006Text, AUT_006_PATH],
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
  ["MAN-001", man001Text, MAN_001_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["DATTR-024H migration draft", migrationDraftText, MIGRATION_DRAFT_PATH],
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
    label: "RLS/audit storage contract",
    filePath: CONTRACT_PATH,
    errors,
  })

  const missingGates = REQUIRED_GATE_IDS.filter((gateId) => !contractText.includes(`id: "${gateId}"`))
  if (missingGates.length > 0) {
    errors.push(`RLS/audit storage contract is missing gates: ${missingGates.join(", ")}`)
  }

  const missingTables = REQUIRED_TABLES.filter((tableName) => !contractText.includes(`"${tableName}"`))
  if (missingTables.length > 0) {
    errors.push(`RLS/audit storage contract is missing tables: ${missingTables.join(", ")}`)
  }

  const missingSourceRefs = REQUIRED_SOURCE_REFS.filter((ref) => !contractText.includes(ref))
  if (missingSourceRefs.length > 0) {
    errors.push(`RLS/audit storage contract is missing source refs: ${missingSourceRefs.join(", ")}`)
  }

  const forbidden = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern))
  if (forbidden.length > 0) {
    errors.push(`RLS/audit storage contract contains forbidden runtime markers: ${forbidden.join(", ")}`)
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText)
  const script = packageJson.scripts?.["ai-input:rls-audit-storage:check"]
  if (script !== "node scripts/check-ai-input-source-workflow-rls-audit-storage.mjs") {
    errors.push("package.json must expose ai-input:rls-audit-storage:check")
  }
}

if (migrationDraftText !== null) {
  const missingRlsTables = REQUIRED_TABLES.filter((tableName) => {
    if (tableName === "operating_audit_events") {
      return false
    }
    return !migrationDraftText.includes(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`)
  })
  if (missingRlsTables.length > 0) {
    errors.push(`Migration draft is missing ENABLE ROW LEVEL SECURITY for: ${missingRlsTables.join(", ")}`)
  }
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
  ["AUT-006", aut006Text, AUT_006_PATH],
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
      "AUT-006_ai-input-source-workflow-rls-audit-storage.md",
      "AI Input Source Workflow RLS identity strategy",
    ],
    label: "MAN-001",
    filePath: MAN_001_PATH,
    errors,
  })
}

evidence.status = errors.length === 0 ? "ready_for_rls_audit_storage_review" : "failed"
evidence.taskId = "DATTR-024K-RLS-AUDIT-STORAGE"
evidence.mode = "rls_audit_storage_review_only_no_runtime"
evidence.gateCount = REQUIRED_GATE_IDS.length
evidence.requiredTableCount = REQUIRED_TABLES.length
evidence.identityStrategySelected = false
evidence.rlsPolicyApplyAllowed = false
evidence.auditStorageRuntimeAllowed = false
evidence.databaseReadAllowed = false
evidence.databaseWriteAllowed = false
evidence.externalRegisterable = false
evidence.nextTask = "DATTR-024L-CONNECTOR-RUNTIME"
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
  console.error(`AI Input Source Workflow RLS/audit storage check failed with ${errors.length} error(s):`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
} else {
  console.log(
    [
      "AI Input Source Workflow RLS/audit storage check passed.",
      `status=${evidence.status}`,
      `taskId=${evidence.taskId}`,
      `mode=${evidence.mode}`,
      `gateCount=${evidence.gateCount}`,
      `requiredTableCount=${evidence.requiredTableCount}`,
      `nextTask=${evidence.nextTask}`,
      "identityStrategySelected=false",
      "rlsPolicyApplyAllowed=false",
      "auditStorageRuntimeAllowed=false",
      "externalRegisterable=false",
    ].join(" "),
  )
}

process.exit(errors.length === 0 ? 0 : 1)
