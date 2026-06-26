#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-formal-cutover-readiness.contract.ts",
)
const RPT_027_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-027_loop-118-source-workflow-post-l-gap-review.md")
const ACC_002_PATH = path.join(ROOT, "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md")
const BACKLOG_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-060_task-backlog.md")
const SPRINT_PATH = path.join(ROOT, "docs/05_execution-plans/PLN-061_current-sprint.md")
const TASKS_PATH = path.join(ROOT, "tasks.md")
const COMPLETED_LOG_PATH = path.join(ROOT, "docs/06_audits-and-reports/RPT-007_completed-log.md")
const PACKAGE_JSON_PATH = path.join(ROOT, "package.json")
const MIG_003_PATH = path.join(ROOT, "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md")
const MIGRATION_DRAFT_CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-migration-draft.mjs")
const PROOF_RUNNER_PATH = path.join(ROOT, "scripts/ai-input-source-workflow-proof-runner.mjs")
const PROOF_RUNNER_CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-proof-runner.mjs")
const SERVICE_RUNTIME_PATH = path.join(ROOT, "src/lib/services/ai-input-source-workflow.service.ts")
const SERVICE_RUNTIME_CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-service-runtime.mjs")
const RLS_AUDIT_CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
)
const RLS_AUDIT_CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-rls-audit-storage.mjs")
const CONNECTOR_RUNTIME_CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts",
)
const CONNECTOR_RUNTIME_CHECKER_PATH = path.join(
  ROOT,
  "scripts/check-ai-input-source-workflow-connector-runtime-approval.mjs",
)
const OPS_SURFACE_CHECKER_PATH = path.join(ROOT, "scripts/check-ai-input-source-workflow-ops-surface.mjs")
const PERSISTENCE_SEQUENCE_CONTRACT_PATH = path.join(
  ROOT,
  "src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts",
)

const REQUIRED_GATE_IDS = [
  "proof-target-write-confirmation",
  "migration-review-deployable-promotion",
  "migration-apply-strategy-approval",
  "identity-strategy-selection",
  "rls-policy-apply-approval",
  "persisted-audit-storage-runtime-approval",
  "service-db-runtime-enable-review",
  "connector-runtime-activation-review",
  "rollback-manual-recovery-approval",
  "owner-cutover-approval-record",
  "public-output-boundary-review",
  "nanda-external-registration-boundary",
]

const REQUIRED_DEPENDENCY_TASK_IDS = [
  "DATTR-024H-MIGRATION-DRAFT",
  "DATTR-024I-PROOF-RUNNER",
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  "DATTR-024K-RLS-AUDIT-STORAGE",
  "DATTR-024L-CONNECTOR-RUNTIME",
  "AIINPUT-OPS-003",
  "LOOP-118",
]

const REQUIRED_CONTRACT_MARKERS = [
  "AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_READINESS_GATES",
  "AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_REQUIRED_GATE_IDS",
  "AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS",
  "AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_STOP_CONDITIONS",
  "AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_DEPENDENCY_TASK_IDS",
  "AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_READINESS_SUMMARY",
  "DATTR-024M-CUTOVER-READINESS",
  "ready_for_formal_cutover_readiness_review",
  "cutover_readiness_only_no_runtime",
  "proofTargetWriteConfirmed: false",
  "deployableMigrationPromotionAllowed: false",
  "migrationApplyAllowed: false",
  "databaseConnectionAllowed: false",
  "identityStrategySelected: false",
  "rlsPolicyApplyAllowed: false",
  "auditStorageRuntimeAllowed: false",
  "serviceDatabaseReadAllowed: false",
  "serviceDatabaseWriteAllowed: false",
  "routeHandlerAllowed: false",
  "serverActionAllowed: false",
  "connectorRuntimeActivationAllowed: false",
  "oauthRuntimeAllowed: false",
  "webhookRuntimeAllowed: false",
  "pollingRuntimeAllowed: false",
  "providerApiRuntimeAllowed: false",
  "secretWriteAllowed: false",
  "publicOutputAllowed: false",
  "moduleFinalWriteAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "externalCollaborationAllowed: false",
  "rollbackPlanApproved: false",
  "ownerApprovalRecorded: false",
  "externalRegisterable: false",
  "L0_LOCAL_PROTOTYPE",
  "M1_MANUAL_OPS_READY",
  "C3_ARCHITECTURE_GATE_READY",
  "LOOP-120",
]

const REQUIRED_SOURCE_REFS = [
  "docs/06_audits-and-reports/RPT-027_loop-118-source-workflow-post-l-gap-review.md",
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
  "docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md",
  "docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts",
  "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
  "src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts",
  "src/lib/services/ai-input-source-workflow.service.ts",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate",
  "https://nextjs.org/docs/app/guides/authentication",
  "https://nextjs.org/docs/app/guides/data-security",
]

const REQUIRED_DOC_MARKERS = [
  "DATTR-024M-CUTOVER-READINESS",
  "src/lib/contracts/ai-input-source-workflow-formal-cutover-readiness.contract.ts",
  "scripts/check-ai-input-source-workflow-formal-cutover-readiness.mjs",
  "pnpm ai-input:cutover-readiness:check",
  "ready_for_formal_cutover_readiness_review",
  "cutover_readiness_only_no_runtime",
  "proofTargetWriteConfirmed=false",
  "deployableMigrationPromotionAllowed=false",
  "migrationApplyAllowed=false",
  "databaseConnectionAllowed=false",
  "identityStrategySelected=false",
  "rlsPolicyApplyAllowed=false",
  "auditStorageRuntimeAllowed=false",
  "serviceDatabaseReadAllowed=false",
  "serviceDatabaseWriteAllowed=false",
  "connectorRuntimeActivationAllowed=false",
  "publicOutputAllowed=false",
  "externalRegisterable=false",
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
      console.log("Usage: pnpm ai-input:cutover-readiness:check [--json] [--out <path>]")
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
const rpt027Text = readText(RPT_027_PATH)
const acc002Text = readText(ACC_002_PATH)
const backlogText = readText(BACKLOG_PATH)
const sprintText = readText(SPRINT_PATH)
const tasksText = readText(TASKS_PATH)
const completedLogText = readText(COMPLETED_LOG_PATH)
const packageJsonText = readText(PACKAGE_JSON_PATH)
const mig003Text = readText(MIG_003_PATH)
const migrationDraftCheckerText = readText(MIGRATION_DRAFT_CHECKER_PATH)
const proofRunnerText = readText(PROOF_RUNNER_PATH)
const proofRunnerCheckerText = readText(PROOF_RUNNER_CHECKER_PATH)
const serviceRuntimeText = readText(SERVICE_RUNTIME_PATH)
const serviceRuntimeCheckerText = readText(SERVICE_RUNTIME_CHECKER_PATH)
const rlsAuditContractText = readText(RLS_AUDIT_CONTRACT_PATH)
const rlsAuditCheckerText = readText(RLS_AUDIT_CHECKER_PATH)
const connectorRuntimeContractText = readText(CONNECTOR_RUNTIME_CONTRACT_PATH)
const connectorRuntimeCheckerText = readText(CONNECTOR_RUNTIME_CHECKER_PATH)
const opsSurfaceCheckerText = readText(OPS_SURFACE_CHECKER_PATH)
const persistenceSequenceContractText = readText(PERSISTENCE_SEQUENCE_CONTRACT_PATH)

for (const [name, text, filePath] of [
  ["formal cutover readiness contract", contractText, CONTRACT_PATH],
  ["RPT-027", rpt027Text, RPT_027_PATH],
  ["ACC-002", acc002Text, ACC_002_PATH],
  ["PLN-060", backlogText, BACKLOG_PATH],
  ["PLN-061", sprintText, SPRINT_PATH],
  ["tasks.md", tasksText, TASKS_PATH],
  ["RPT-007", completedLogText, COMPLETED_LOG_PATH],
  ["package.json", packageJsonText, PACKAGE_JSON_PATH],
  ["MIG-003", mig003Text, MIG_003_PATH],
  ["DATTR-024H checker", migrationDraftCheckerText, MIGRATION_DRAFT_CHECKER_PATH],
  ["DATTR-024I runner", proofRunnerText, PROOF_RUNNER_PATH],
  ["DATTR-024I checker", proofRunnerCheckerText, PROOF_RUNNER_CHECKER_PATH],
  ["DATTR-024J service", serviceRuntimeText, SERVICE_RUNTIME_PATH],
  ["DATTR-024J checker", serviceRuntimeCheckerText, SERVICE_RUNTIME_CHECKER_PATH],
  ["DATTR-024K RLS/audit contract", rlsAuditContractText, RLS_AUDIT_CONTRACT_PATH],
  ["DATTR-024K checker", rlsAuditCheckerText, RLS_AUDIT_CHECKER_PATH],
  ["DATTR-024L connector contract", connectorRuntimeContractText, CONNECTOR_RUNTIME_CONTRACT_PATH],
  ["DATTR-024L checker", connectorRuntimeCheckerText, CONNECTOR_RUNTIME_CHECKER_PATH],
  ["AIINPUT-OPS-003 checker", opsSurfaceCheckerText, OPS_SURFACE_CHECKER_PATH],
  ["DATTR-024G persistence sequence contract", persistenceSequenceContractText, PERSISTENCE_SEQUENCE_CONTRACT_PATH],
]) {
  if (text === null) {
    errors.push(`Missing ${name}: ${relative(filePath)}`)
  }
}

if (contractText !== null) {
  validateMarkers({
    text: contractText,
    markers: REQUIRED_CONTRACT_MARKERS,
    label: "formal cutover readiness contract",
    filePath: CONTRACT_PATH,
    errors,
  })

  const missingGates = REQUIRED_GATE_IDS.filter((gateId) => !contractText.includes(`id: "${gateId}"`))
  if (missingGates.length > 0) {
    errors.push(`Formal cutover readiness contract is missing gates: ${missingGates.join(", ")}`)
  }

  const missingDependencies = REQUIRED_DEPENDENCY_TASK_IDS.filter((taskId) => !contractText.includes(taskId))
  if (missingDependencies.length > 0) {
    errors.push(`Formal cutover readiness contract is missing dependency task ids: ${missingDependencies.join(", ")}`)
  }

  const missingSourceRefs = REQUIRED_SOURCE_REFS.filter((ref) => !contractText.includes(ref))
  if (missingSourceRefs.length > 0) {
    errors.push(`Formal cutover readiness contract is missing source refs: ${missingSourceRefs.join(", ")}`)
  }

  const forbidden = FORBIDDEN_CONTRACT_PATTERNS.filter((pattern) => contractText.includes(pattern))
  if (forbidden.length > 0) {
    errors.push(`Formal cutover readiness contract contains forbidden runtime markers: ${forbidden.join(", ")}`)
  }
}

if (packageJsonText !== null) {
  const packageJson = JSON.parse(packageJsonText)
  const script = packageJson.scripts?.["ai-input:cutover-readiness:check"]
  if (script !== "node scripts/check-ai-input-source-workflow-formal-cutover-readiness.mjs") {
    errors.push("package.json must expose ai-input:cutover-readiness:check")
  }
}

if (rpt027Text !== null) {
  validateMarkers({
    text: rpt027Text,
    markers: [
      "DATTR-024M-CUTOVER-READINESS",
      "Supabase Row Level Security",
      "Prisma Migrate deploy",
      "Next.js authentication",
      "Next.js data security",
    ],
    label: "RPT-027",
    filePath: RPT_027_PATH,
    errors,
  })
}

for (const [name, text, filePath] of [
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

if (mig003Text !== null && migrationDraftCheckerText !== null) {
  validateMarkers({
    text: `${mig003Text}\n${migrationDraftCheckerText}`,
    markers: [
      "DATTR-024H-MIGRATION-DRAFT",
      "ready_for_migration_draft_review",
      "migrationApplyAllowed: false",
      "externalRegisterable: false",
    ],
    label: "DATTR-024H migration draft prerequisite",
    filePath: MIG_003_PATH,
    errors,
  })
}

if (proofRunnerText !== null && proofRunnerCheckerText !== null) {
  validateMarkers({
    text: `${proofRunnerText}\n${proofRunnerCheckerText}`,
    markers: [
      "DATTR-024I-PROOF-RUNNER",
      "writesExecuted",
      "doesNotConnectToDatabase",
      "doesNotApplyMigration",
      "doesNotWriteDatabase",
      "externalRegisterable",
    ],
    label: "DATTR-024I proof runner prerequisite",
    filePath: PROOF_RUNNER_PATH,
    errors,
  })
}

if (serviceRuntimeText !== null && serviceRuntimeCheckerText !== null) {
  validateMarkers({
    text: `${serviceRuntimeText}\n${serviceRuntimeCheckerText}`,
    markers: [
      "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
      "requireUser()",
      "runtimeDbReadEnabled: false",
      "runtimeDbWriteEnabled: false",
      "externalRegisterable: false",
    ],
    label: "DATTR-024J service runtime prerequisite",
    filePath: SERVICE_RUNTIME_PATH,
    errors,
  })
}

if (rlsAuditContractText !== null && rlsAuditCheckerText !== null) {
  validateMarkers({
    text: `${rlsAuditContractText}\n${rlsAuditCheckerText}`,
    markers: [
      "DATTR-024K-RLS-AUDIT-STORAGE",
      "identityStrategySelected: false",
      "rlsPolicyApplyAllowed: false",
      "auditStorageRuntimeAllowed: false",
      "databaseReadAllowed: false",
      "databaseWriteAllowed: false",
      "externalRegisterable: false",
    ],
    label: "DATTR-024K RLS/audit prerequisite",
    filePath: RLS_AUDIT_CONTRACT_PATH,
    errors,
  })
}

if (connectorRuntimeContractText !== null && connectorRuntimeCheckerText !== null) {
  validateMarkers({
    text: `${connectorRuntimeContractText}\n${connectorRuntimeCheckerText}`,
    markers: [
      "DATTR-024L-CONNECTOR-RUNTIME",
      "runtimeApprovalSelected: false",
      "connectorRuntimeAllowed: false",
      "oauthRuntimeAllowed: false",
      "webhookRuntimeAllowed: false",
      "pollingRuntimeAllowed: false",
      "providerApiRuntimeAllowed: false",
      "secretWriteAllowed: false",
      "databaseReadAllowed: false",
      "databaseWriteAllowed: false",
      "externalRegisterable: false",
    ],
    label: "DATTR-024L connector runtime prerequisite",
    filePath: CONNECTOR_RUNTIME_CONTRACT_PATH,
    errors,
  })
}

if (opsSurfaceCheckerText !== null) {
  validateMarkers({
    text: opsSurfaceCheckerText,
    markers: ["AIINPUT-OPS-003", "protected_source_workflow_gate_surface_ready"],
    label: "AIINPUT-OPS-003 checker prerequisite",
    filePath: OPS_SURFACE_CHECKER_PATH,
    errors,
  })
}

if (persistenceSequenceContractText !== null) {
  validateMarkers({
    text: persistenceSequenceContractText,
    markers: ["DATTR-024G-CONTRACT", "formal-mode-cutover", "externalRegisterable: false"],
    label: "DATTR-024G persistence sequence prerequisite",
    filePath: PERSISTENCE_SEQUENCE_CONTRACT_PATH,
    errors,
  })
}

evidence.status = errors.length === 0 ? "ready_for_formal_cutover_readiness_review" : "failed"
evidence.taskId = "DATTR-024M-CUTOVER-READINESS"
evidence.mode = "cutover_readiness_only_no_runtime"
evidence.gateCount = REQUIRED_GATE_IDS.length
evidence.dependencyTaskIds = REQUIRED_DEPENDENCY_TASK_IDS
evidence.proofTargetWriteConfirmed = false
evidence.deployableMigrationPromotionAllowed = false
evidence.migrationApplyAllowed = false
evidence.databaseConnectionAllowed = false
evidence.identityStrategySelected = false
evidence.rlsPolicyApplyAllowed = false
evidence.auditStorageRuntimeAllowed = false
evidence.serviceDatabaseReadAllowed = false
evidence.serviceDatabaseWriteAllowed = false
evidence.routeHandlerAllowed = false
evidence.serverActionAllowed = false
evidence.connectorRuntimeActivationAllowed = false
evidence.oauthRuntimeAllowed = false
evidence.webhookRuntimeAllowed = false
evidence.pollingRuntimeAllowed = false
evidence.providerApiRuntimeAllowed = false
evidence.secretWriteAllowed = false
evidence.publicOutputAllowed = false
evidence.moduleFinalWriteAllowed = false
evidence.externalAgentDatabaseAccessAllowed = false
evidence.externalCollaborationAllowed = false
evidence.rollbackPlanApproved = false
evidence.ownerApprovalRecorded = false
evidence.externalRegisterable = false
evidence.nextTask = "LOOP-120"
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
  console.error(`AI Input Source Workflow formal cutover readiness check failed with ${errors.length} error(s):`)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
} else {
  console.log(
    [
      "AI Input Source Workflow formal cutover readiness check passed.",
      `status=${evidence.status}`,
      `taskId=${evidence.taskId}`,
      `mode=${evidence.mode}`,
      `gateCount=${evidence.gateCount}`,
      `nextTask=${evidence.nextTask}`,
      "proofTargetWriteConfirmed=false",
      "deployableMigrationPromotionAllowed=false",
      "migrationApplyAllowed=false",
      "databaseConnectionAllowed=false",
      "identityStrategySelected=false",
      "rlsPolicyApplyAllowed=false",
      "auditStorageRuntimeAllowed=false",
      "serviceDatabaseReadAllowed=false",
      "serviceDatabaseWriteAllowed=false",
      "connectorRuntimeActivationAllowed=false",
      "publicOutputAllowed=false",
      "externalRegisterable=false",
    ].join(" "),
  )
}

process.exit(errors.length === 0 ? 0 : 1)
