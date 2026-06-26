#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  types: "src/types/ai-input-readiness.ts",
  proofEvidenceService: "src/lib/services/ai-input-source-workflow-proof-evidence.service.ts",
  proofBootstrapService: "src/lib/services/ai-input-source-workflow-proof-bootstrap-readiness.service.ts",
  aiInputReadinessService: "src/lib/services/ai-input-readiness.service.ts",
  aiInputClient: "src/app/(dashboard)/ai-input/ai-input-client.tsx",
  adminReadinessService: "src/lib/services/admin-readiness.service.ts",
  adminPage: "src/app/(dashboard)/admin/page.tsx",
  settingsPage: "src/app/(dashboard)/settings/page.tsx",
  acceptance: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlog: "docs/05_execution-plans/PLN-060_task-backlog.md",
  sprint: "docs/05_execution-plans/PLN-061_current-sprint.md",
  completedLog: "docs/06_audits-and-reports/RPT-007_completed-log.md",
  tasks: "tasks.md",
  packageJson: "package.json",
}

const REQUIRED_GATE_IDS = [
  "DATTR-024H-MIGRATION-DRAFT",
  "DATTR-024I-PROOF-RUNNER",
  "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP",
  "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
  "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE",
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  "DATTR-024K-RLS-AUDIT-STORAGE",
  "DATTR-024L-CONNECTOR-RUNTIME",
]

const REQUIRED_COMMANDS = [
  "pnpm ai-input:migration-draft:check",
  "pnpm ai-input:proof-runner:check",
  "pnpm ai-input:proof-local",
  "pnpm ai-input:proof-local:check",
  "pnpm ai-input:proof-evidence:check",
  "pnpm ai-input:service-runtime:check",
  "pnpm ai-input:rls-audit-storage:check",
  "pnpm ai-input:connector-runtime:check",
  "pnpm ai-input:ops-surface:check",
]

const REQUIRED_NO_RUNTIME_MARKERS = [
  "databaseReadAllowed: false",
  "databaseWriteAllowed: false",
  "connectorRuntimeAllowed: false",
  "oauthRuntimeAllowed: false",
  "webhookRuntimeAllowed: false",
  "pollingRuntimeAllowed: false",
  "providerApiRuntimeAllowed: false",
  "secretWriteAllowed: false",
  "publicOutputAllowed: false",
  "externalRegisterable: false",
]

const TYPE_MARKERS = [
  "AIInputSourceWorkflowGateMatrixContract",
  "AIInputSourceWorkflowGateMatrixRow",
  "AIInputSourceWorkflowProofBootstrapContract",
  "AIInputSourceWorkflowProofTargetHandoffContract",
  "AIInputSourceWorkflowLatestProofEvidenceContract",
  'id: "AIINPUT-OPS-003"',
  'status: "protected_source_workflow_gate_surface_active"',
  'mode: "protected_read_no_db_no_connector_runtime"',
  "sourceWorkflowGateMatrix",
  "sourceWorkflowProofBootstrap",
  "proofTargetHandoff",
  "latestEvidence",
]

const PROOF_EVIDENCE_SERVICE_MARKERS = [
  "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
  "AI_INPUT_SOURCE_WORKFLOW_PROOF_EVIDENCE_ALLOWED_PATTERNS",
  "server_only_no_secret_latest_evidence",
  "scansWhitelistedDirectoriesOnly: true",
  "returnsRawPacketBody: false",
  "executesCommands: false",
  "externalRegisterable: false",
  "resolveAIInputSourceWorkflowProofEvidence",
]

const PROOF_BOOTSTRAP_SERVICE_MARKERS = [
  "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI",
  "resolveAIInputSourceWorkflowProofEvidence",
  "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
  "proofEvidence.contract.latest.latestPacketPath",
  "latestEvidence: proofEvidence.contract",
  "environmentInjectedIntoChildOnly",
  "targetUrlRedacted",
  "hostRedacted",
  "protected_read_no_secret_packet_summary",
  "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE",
  "protected_read_no_secret_owner_handoff",
  "proofTargetHandoff",
  "envVarNames",
  "passSignals",
  "stopConditions",
  "externalRegisterable: false",
]

const SERVICE_MARKERS = [
  "AIInputSourceWorkflowGateMatrixRow",
  "buildAIInputSourceWorkflowProofBootstrapContract",
  "sourceWorkflowGateRows",
  "AIINPUT-OPS-003",
  "sourceWorkflowProofBootstrap",
  "localProofBootstrap",
  "protected_source_workflow_gate_surface_active",
  "protected_read_no_db_no_connector_runtime",
  "ownerRunCommand",
  "allowedNow",
  "blockedRuntime",
  "identityStrategySelected=false",
  "runtimeApprovalSelected=false",
  "DATTR-024P latest proof evidence resolver",
  "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE",
]

const CLIENT_MARKERS = [
  "FormalSourceWorkflowGateMatrixTable",
  "FormalSourceWorkflowProofBootstrapPanel",
  "sourceWorkflowGateMatrix",
  "sourceWorkflowProofBootstrap",
  "AIINPUT-OPS-003 Source Workflow gate matrix",
  "owner-run proof commands",
  "Latest local bootstrap packet",
  "Evidence freshness",
  "DATTR-024Q proof target handoff",
  "Pass / fail signals",
  "Stop conditions",
  "without DB reads, writes, or connector runtime",
]

const ADMIN_MARKERS = [
  "AIINPUT-OPS-003",
  "DATTR-024N local proof bootstrap",
  "ownerRunCommand",
  "humanApprovalRequiredCount",
  "localProofPacketStatus",
  "proofTargetHandoffStatus",
  "latestLocalProofPacketPath",
  "DATTR-024Q proof target handoff",
  "DATTR-024H-MIGRATION-DRAFT create-only draft",
  "DATTR-024L-CONNECTOR-RUNTIME approval gate",
]

const SETTINGS_MARKERS = [
  "aiInputSourceWorkflowOpsReadinessContract.summary.humanApprovalRequiredCount",
  "aiInputSourceWorkflowOpsReadinessContract.summary.localProofPacketStatus",
  "aiInputSourceWorkflowOpsReadinessContract.summary.proofTargetHandoffStatus",
  "aiInputSourceWorkflowOpsReadinessContract.summary.latestLocalProofPacketPath",
  "row.ownerRunCommand",
  "AI Input source workflow readiness",
]

const DOC_MARKERS = [
  "AIINPUT-OPS-003",
  "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER",
  "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE",
  "pnpm ai-input:ops-surface:check",
  "pnpm ai-input:proof-evidence:check",
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
      console.log("Usage: pnpm ai-input:ops-surface:check [--json] [--out <path>]")
      process.exit(0)
    }
  }

  return args
}

function read(filePath) {
  const absolutePath = path.join(ROOT, filePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function validateMarkers({ label, text, markers, errors }) {
  if (text === null) {
    errors.push(`${label} is missing.`)
    return
  }

  const missing = markers.filter((marker) => !text.includes(marker))
  if (missing.length > 0) {
    errors.push(`${label} missing markers: ${missing.join(", ")}`)
  }
}

const args = parseArgs(process.argv.slice(2))
const errors = []
const contents = Object.fromEntries(
  Object.entries(FILES).map(([key, filePath]) => [key, read(filePath)]),
)

validateMarkers({ label: FILES.types, text: contents.types, markers: TYPE_MARKERS, errors })
validateMarkers({
  label: FILES.proofEvidenceService,
  text: contents.proofEvidenceService,
  markers: PROOF_EVIDENCE_SERVICE_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.proofBootstrapService,
  text: contents.proofBootstrapService,
  markers: PROOF_BOOTSTRAP_SERVICE_MARKERS,
  errors,
})
validateMarkers({
  label: FILES.aiInputReadinessService,
  text: contents.aiInputReadinessService,
  markers: [...SERVICE_MARKERS, ...REQUIRED_GATE_IDS, ...REQUIRED_COMMANDS, ...REQUIRED_NO_RUNTIME_MARKERS],
  errors,
})
validateMarkers({ label: FILES.aiInputClient, text: contents.aiInputClient, markers: CLIENT_MARKERS, errors })
validateMarkers({
  label: FILES.adminReadinessService,
  text: contents.adminReadinessService,
  markers: [...ADMIN_MARKERS, ...REQUIRED_GATE_IDS, ...REQUIRED_COMMANDS],
  errors,
})
validateMarkers({
  label: FILES.adminPage,
  text: contents.adminPage,
  markers: [
    "ownerRunCommand",
    "humanApprovalRequiredCount",
    "localProofPacketStatus",
    "proofTargetHandoffStatus",
    "latestLocalProofPacketPath",
  ],
  errors,
})
validateMarkers({ label: FILES.settingsPage, text: contents.settingsPage, markers: SETTINGS_MARKERS, errors })

for (const key of ["acceptance", "backlog", "sprint", "completedLog", "tasks"]) {
  validateMarkers({ label: FILES[key], text: contents[key], markers: DOC_MARKERS, errors })
}

if (contents.packageJson === null) {
  errors.push(`${FILES.packageJson} is missing.`)
} else {
  const packageJson = JSON.parse(contents.packageJson)
  const script = packageJson.scripts?.["ai-input:ops-surface:check"]
  if (script !== "node scripts/check-ai-input-source-workflow-ops-surface.mjs") {
    errors.push("package.json must expose ai-input:ops-surface:check")
  }
  const proofEvidenceScript = packageJson.scripts?.["ai-input:proof-evidence:check"]
  if (proofEvidenceScript !== "node scripts/check-ai-input-source-workflow-proof-evidence.mjs") {
    errors.push("package.json must expose ai-input:proof-evidence:check")
  }
}

const result = {
  id: "AIINPUT-OPS-003",
  status: errors.length === 0 ? "protected_source_workflow_gate_surface_ready" : "failed",
  checkedAt: new Date().toISOString(),
  surfaces: ["ai-input", "admin", "settings"],
  requiredGateIds: REQUIRED_GATE_IDS,
  requiredCommands: REQUIRED_COMMANDS,
  databaseReadAllowed: false,
  databaseWriteAllowed: false,
  connectorRuntimeAllowed: false,
  oauthRuntimeAllowed: false,
  webhookRuntimeAllowed: false,
  pollingRuntimeAllowed: false,
  providerApiRuntimeAllowed: false,
  secretWriteAllowed: false,
  publicOutputAllowed: false,
  externalRegisterable: false,
  proofTargetHandoffReady: true,
  nextTask: "AUTH-005_OR_WORK-009_IF_PREREQUISITES_APPEAR_ELSE_OWNER_RUN_DATTR_024Q_HANDOFF",
  errors,
}

if (args.out) {
  const outputPath = path.resolve(ROOT, args.out)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`)
}

if (args.json) {
  console.log(JSON.stringify(result, null, 2))
} else if (errors.length > 0) {
  console.error(`AI Input Source Workflow ops surface check failed with ${errors.length} error(s):`)
  for (const error of errors) console.error(`- ${error}`)
} else {
  console.log("AI Input Source Workflow ops surface check passed.")
  console.log(`status=${result.status}`)
  console.log(`id=${result.id}`)
  console.log(`surfaces=${result.surfaces.join(",")}`)
  console.log(`nextTask=${result.nextTask}`)
}

if (errors.length > 0) process.exit(1)
