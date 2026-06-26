#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SERVICE_PATH = path.join(ROOT, "src/lib/services/ai-input-source-workflow.service.ts")
const TYPES_PATH = path.join(ROOT, "src/types/ai-input-source-workflow.ts")
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json")
const ARC_031_PATH = path.join(
  ROOT,
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
)
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md")
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md")
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md")
const TASKS_PATH = path.join(ROOT, "tasks.md")
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md")

const REQUIRED_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "SourceNamingProfile",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
]

const REQUIRED_OPERATION_IDS = [
  "ai-input.source-workflow.list",
  "ai-input.source-workflow.detail",
  "ai-input.source-connection.review",
  "ai-input.source-asset.review",
  "ai-input.workflow-run.review",
  "ai-input.work-item.review",
  "ai-input.naming-profile.review",
  "ai-input.data-unit-proposal.review",
  "ai-input.module-write-intent.review",
  "ai-input.connector-consent.review",
  "ai-input.proof-target.review",
  "ai-input.audit-lineage.review",
]

const REQUIRED_SERVICE_MARKERS = [
  "import \"server-only\"",
  "requireUser()",
  "getAIInputSourceWorkflowServiceRuntimeContract",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_REQUIRED_OPERATION_IDS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OPERATIONS",
  "AI_INPUT_SOURCE_WORKFLOW_SERVICE_RUNTIME_SUMMARY",
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  "service_authz_runtime_no_db_read",
  "ownerProfileIdRedacted: true",
  "emailRedacted: true",
  "roleRedacted: true",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "migrationApplyAllowed: false",
  "connectorRuntimeAllowed: false",
  "publicOutputAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalRegisterable: false",
  "hiddenMockFallbackAllowed: false",
  "DATTR-024K-RLS-AUDIT-STORAGE",
  "ai-input.source-workflow",
]

const REQUIRED_TYPE_MARKERS = [
  "AIInputSourceWorkflowServiceRuntimeContract",
  "AIInputSourceWorkflowServiceRuntimeOwnerScope",
  "AIInputSourceWorkflowServiceRuntimePersistence",
  "AIInputSourceWorkflowServiceRuntimeObject",
  "AIInputSourceWorkflowServiceRuntimeOperation",
  "AIInputSourceWorkflowServiceRuntimeSafety",
  "AIInputSourceWorkflowServiceRuntimeSummary",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "externalRegisterable: false",
  "nextTask: \"DATTR-024K-RLS-AUDIT-STORAGE\"",
]

const REQUIRED_DOC_MARKERS = [
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  "src/lib/services/ai-input-source-workflow.service.ts",
  "src/types/ai-input-source-workflow.ts",
  "scripts/check-ai-input-source-workflow-service-runtime.mjs",
  "pnpm ai-input:service-runtime:check",
  "requireUser()",
  "ownerProfileIdRedacted: true",
  "service_authz_runtime_no_db_read",
  "runtimeDbReadEnabled=false",
  "runtimeDbWriteEnabled=false",
  "externalRegisterable=false",
  "DATTR-024K-RLS-AUDIT-STORAGE",
]

const FORBIDDEN_SERVICE_PATTERNS = [
  "@/lib/db",
  "@prisma/client",
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
  "redirect(",
]

function parseArgs(argv) {
  const args = {
    json: false,
    out: null,
  }
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
      console.log("Usage: pnpm ai-input:service-runtime:check [--json] [--out <path>]")
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

const serviceText = readText(SERVICE_PATH)
const typesText = readText(TYPES_PATH)
const packageJsonText = readText(PACKAGE_JSON_PATH)
const arc031Text = readText(ARC_031_PATH)
const acc002Text = readText(ACC_002_PATH)
const backlogText = readText(BACKLOG_PATH)
const sprintText = readText(SPRINT_PATH)
const tasksText = readText(TASKS_PATH)
const completedLogText = readText(COMPLETED_LOG_PATH)

for (const [name, text, filePath] of [
  ["service runtime", serviceText, SERVICE_PATH],
  ["service runtime types", typesText, TYPES_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["ARC-031", arc031Text, ARC_031_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${name}: ${relative(filePath)}`)
  }
}

if (serviceText !== null) {
  validateMarkers({
    text: serviceText,
    markers: REQUIRED_SERVICE_MARKERS,
    label: "Service runtime",
    filePath: SERVICE_PATH,
    errors,
  })

  const missingObjects = REQUIRED_OBJECTS.filter((objectId) => !serviceText.includes(objectId))
  if (missingObjects.length > 0) {
    errors.push(`Service runtime is missing required objects: ${missingObjects.join(", ")}`)
  }

  const forbidden = FORBIDDEN_SERVICE_PATTERNS.filter((pattern) => serviceText.includes(pattern))
  if (forbidden.length > 0) {
    errors.push(`Service runtime includes forbidden runtime patterns: ${forbidden.join(", ")}`)
  }
}

if (typesText !== null) {
  validateMarkers({
    text: typesText,
    markers: REQUIRED_TYPE_MARKERS,
    label: "Service runtime types",
    filePath: TYPES_PATH,
    errors,
  })
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText)
  const script = packageJson.scripts?.["ai-input:service-runtime:check"]
  if (script !== "node scripts/check-ai-input-source-workflow-service-runtime.mjs") {
    errors.push("package.json must expose ai-input:service-runtime:check")
  }
}

for (const [name, text, filePath] of [
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

evidence.status = errors.length === 0 ? "ready_for_rls_audit_storage" : "failed"
evidence.taskId = "DATTR-024J-SERVICE-AUTHZ-RUNTIME"
evidence.mode = "service_authz_runtime_no_db_read"
evidence.protectedByRequireUser = serviceText?.includes("requireUser()") === true
evidence.runtimeDbReadEnabled = false
evidence.runtimeDbWriteEnabled = false
evidence.externalRegisterable = false
evidence.objectCount = REQUIRED_OBJECTS.length
evidence.operationCount = REQUIRED_OPERATION_IDS.length
evidence.nextTask = "DATTR-024K-RLS-AUDIT-STORAGE"
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
  console.error(`AI Input Source Workflow service runtime check failed with ${errors.length} error(s):`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
} else {
  console.log(
    [
      "AI Input Source Workflow service runtime check passed.",
      `status=${evidence.status}`,
      `taskId=${evidence.taskId}`,
      `mode=${evidence.mode}`,
      `operationCount=${evidence.operationCount}`,
      `objectCount=${evidence.objectCount}`,
      `nextTask=${evidence.nextTask}`,
      "externalRegisterable=false",
    ].join(" "),
  )
}

process.exit(errors.length === 0 ? 0 : 1)
