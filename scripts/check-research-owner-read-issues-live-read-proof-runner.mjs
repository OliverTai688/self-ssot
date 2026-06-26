#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const SERVICE_PATH =
  "src/lib/services/research-owner-read-issues-live-read-proof-runner.service.ts"
const SELECTED_FIELD_SERVICE_PATH =
  "src/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service.ts"
const SERVICE_AUTHZ_PATH =
  "src/lib/services/research-owner-read-issues-runtime-readiness.service.ts"
const DTO_SERVICE_PATH = "src/lib/services/research-owner-read-dto.service.ts"
const READINESS_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const TASK_ID =
  "RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT"
const PREVIOUS_TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"
const BFF_012_TASK_ID =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"
const BFF_011_TASK_ID =
  "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE"
const BFF_010_TASK_ID =
  "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF"
const BFF_009_TASK_ID =
  "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE"
const NEXT_TASK_ID = "LOOP-170-LAUNCH-LEVEL-REVIEW"
const CHECK_COMMAND = "pnpm research:read-issues-live-read-proof-runner:check"

const REQUIRED_SERVICE_MARKERS = [
  "import \"server-only\"",
  "buildResearchOwnerReadIssuesLiveReadProofRunnerContract",
  "ResearchOwnerReadIssuesLiveReadProofRunnerContract",
  TASK_ID,
  PREVIOUS_TASK_ID,
  BFF_012_TASK_ID,
  BFF_011_TASK_ID,
  BFF_010_TASK_ID,
  BFF_009_TASK_ID,
  NEXT_TASK_ID,
  "live_read_proof_runner_contract_dry_run_no_live_research_read",
  "live_read_proof_runner_contract_ready_dry_run_only",
  "blocked_until_selected_field_gate_and_owner_run_prerequisites",
  "ownerRunCommand: \"pnpm research:read-issues-live-read-proof-runner:check\"",
  "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ",
  "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM",
  "I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA",
  "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET",
  "ownerIdentitySource",
  "ResearchThread.ownerId equals requireUser().profileId",
  "proofTargetClassification: \"missing_owner_approved_target\"",
  "proofTargetReady: false",
  "ownerRunReady: false",
  "allowLiveReadFlagCollected: false",
  "confirmationCollected: false",
  "liveReadExecutionAllowed: false",
  "dryRunOnly: true",
  "dryRunDefault: true",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "runtimePrismaReadEnabled: false",
  "adapterExecutionAllowed: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
  "publicOutputEnabled: false",
  "externalCollaborationEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
  "launchLevelUpgradeClaimed: false",
  "requiredInputs",
  "ownerRunCriteria",
  "sourceRefs",
]

const REQUIRED_DTO_SERVICE_MARKERS = [
  "buildResearchOwnerReadIssuesLiveReadProofRunnerContract",
  "ResearchOwnerReadIssuesLiveReadProofRunnerContract",
  "issuesLiveReadProofRunnerContract",
  TASK_ID,
]

const REQUIRED_PAGE_MARKERS = [
  TASK_ID,
  "ResearchOwnerReadIssuesLiveReadProofRunnerTone",
  "ownerReadIssuesLiveReadProofRunnerTaskId",
  "issuesLiveReadProofRunnerContract",
  "Issues live-read proof runner contract",
  "data-issues-live-read-proof-runner-mode",
  "data-issues-live-read-proof-runner-task",
  "data-live-read-execution-allowed",
  "data-owner-run-ready",
  "ownerRunCommandTemplate.map",
  "requiredInputs.map",
  "ownerRunCriteria.map",
  "rows.map",
  "liveReadExecutionAllowed:",
  "dryRunOnly:",
  "proofTargetReady:",
  "ownerRunReady:",
]

const REQUIRED_SELECTED_FIELD_MARKERS = [
  PREVIOUS_TASK_ID,
  "selected_field_runtime_adapter_proof_gate_no_live_research_read",
  "selectedScalarFields",
  "relationCountKeys",
  "mapAuthorizedResearchIssueRowsToDtos",
  "livePrismaReadAllowed: false",
  "adapterExecutionAllowed: false",
]

const REQUIRED_SERVICE_AUTHZ_MARKERS = [
  BFF_012_TASK_ID,
  "buildResearchOwnerReadIssuesServiceAuthzRuntimeProof",
  "runtimeRequireUserCallInThisSlice: true",
  "ownerIdentitySource: \"requireUser().profileId\"",
  "runtimeDbReadEnabled: false",
  "adapterExecutionAllowed: false",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-014 Research Owner Read Issues Live Read Proof Runner Contract Acceptance",
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-live-read-proof-runner.mjs",
      CHECK_COMMAND,
      "live_read_proof_runner_contract_dry_run_no_live_research_read",
      "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ",
      "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM",
      "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET",
      "liveReadExecutionAllowed: false",
      "externalAgentDatabaseAccessAllowed: false",
      NEXT_TASK_ID,
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      TASK_ID,
      "DONE",
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-live-read-proof-runner.mjs",
      CHECK_COMMAND,
      NEXT_TASK_ID,
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 169",
      TASK_ID,
      "live-read proof-runner contract",
      CHECK_COMMAND,
      NEXT_TASK_ID,
    ],
  },
  {
    path: TASKS_DOC,
    markers: [TASK_ID, "DONE", CHECK_COMMAND, NEXT_TASK_ID],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      TASK_ID,
      "Research owner read issues live-read proof-runner contract",
      CHECK_COMMAND,
      NEXT_TASK_ID,
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-issues-live-read-proof-runner:check": "node scripts/check-research-owner-read-issues-live-read-proof-runner.mjs"',
    ],
  },
]

const FORBIDDEN_SERVICE_PATTERNS = [
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "database client call", pattern: /\bdb\./ },
  { label: "Prisma research findMany call", pattern: /\.researchThread\.findMany\s*\(/ },
  { label: "new Prisma client", pattern: /new\s+PrismaClient/ },
  { label: "environment read", pattern: /\bprocess\.env\b/ },
  { label: "network call", pattern: /\bfetch\s*\(/ },
  { label: "cookie read", pattern: /\bcookies\s*\(/ },
  { label: "header read", pattern: /\bheaders\s*\(/ },
  { label: "route handler request", pattern: /\bNextRequest\b/ },
  { label: "route handler response", pattern: /\bNextResponse\b/ },
  { label: "server action", pattern: /["']use server["']/ },
  { label: "live read enabled", pattern: /liveReadExecutionAllowed:\s*true/ },
  { label: "runtime DB read enabled", pattern: /runtimeDbReadEnabled:\s*true/ },
  { label: "runtime DB write enabled", pattern: /runtimeDbWriteEnabled:\s*true/ },
  { label: "runtime Prisma read enabled", pattern: /runtimePrismaReadEnabled:\s*true/ },
  { label: "adapter execution enabled", pattern: /adapterExecutionAllowed:\s*true/ },
  { label: "route handler enabled", pattern: /routeHandlerEnabled:\s*true/ },
  { label: "server action write enabled", pattern: /serverActionWriteEnabled:\s*true/ },
  { label: "public output enabled", pattern: /publicOutputEnabled:\s*true/ },
  { label: "external collaboration enabled", pattern: /externalCollaborationEnabled:\s*true/ },
  {
    label: "external agent DB access enabled",
    pattern: /externalAgentDatabaseAccessAllowed:\s*true/,
  },
  { label: "agent final write enabled", pattern: /agentFinalWriteAllowed:\s*true/ },
  { label: "external registration enabled", pattern: /externalRegisterable:\s*true/ },
  { label: "launch level claim enabled", pattern: /launchLevelUpgradeClaimed:\s*true/ },
]

function parseArgs(argv) {
  const args = { json: false, out: undefined }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === "--json") {
      args.json = true
      continue
    }

    if (arg === "--out") {
      args.out = argv[index + 1]
      index += 1
    }
  }

  return args
}

async function readWorkspaceFile(path) {
  return readFile(resolve(process.cwd(), path), "utf8")
}

function assertIncludes({ content, path, markers, failures }) {
  for (const marker of markers) {
    if (!content.includes(marker)) {
      failures.push(`${path} missing marker: ${marker}`)
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const failures = []
  const service = await readWorkspaceFile(SERVICE_PATH)
  const selectedFieldService = await readWorkspaceFile(SELECTED_FIELD_SERVICE_PATH)
  const serviceAuthz = await readWorkspaceFile(SERVICE_AUTHZ_PATH)
  const dtoService = await readWorkspaceFile(DTO_SERVICE_PATH)
  const readinessPage = await readWorkspaceFile(READINESS_PAGE_PATH)

  assertIncludes({
    content: service,
    path: SERVICE_PATH,
    markers: REQUIRED_SERVICE_MARKERS,
    failures,
  })
  assertIncludes({
    content: selectedFieldService,
    path: SELECTED_FIELD_SERVICE_PATH,
    markers: REQUIRED_SELECTED_FIELD_MARKERS,
    failures,
  })
  assertIncludes({
    content: serviceAuthz,
    path: SERVICE_AUTHZ_PATH,
    markers: REQUIRED_SERVICE_AUTHZ_MARKERS,
    failures,
  })
  assertIncludes({
    content: dtoService,
    path: DTO_SERVICE_PATH,
    markers: REQUIRED_DTO_SERVICE_MARKERS,
    failures,
  })
  assertIncludes({
    content: readinessPage,
    path: READINESS_PAGE_PATH,
    markers: REQUIRED_PAGE_MARKERS,
    failures,
  })

  for (const { label, pattern } of FORBIDDEN_SERVICE_PATTERNS) {
    if (pattern.test(service)) {
      failures.push(`${SERVICE_PATH} contains forbidden pattern: ${label}`)
    }
  }

  for (const doc of REQUIRED_DOCS) {
    const content = await readWorkspaceFile(doc.path)
    assertIncludes({ content, path: doc.path, markers: doc.markers, failures })
  }

  const result = {
    status:
      failures.length === 0
        ? "ready_for_issues_live_read_proof_runner_contract"
        : "issues_live_read_proof_runner_contract_failed",
    taskId: TASK_ID,
    previousTaskId: PREVIOUS_TASK_ID,
    ownerRunCommand: CHECK_COMMAND,
    dryRunOnly: true,
    liveReadExecutionAllowed: false,
    proofTargetReady: false,
    ownerRunReady: false,
    nextRecommendedTask: NEXT_TASK_ID,
    docs: REQUIRED_DOCS.map((doc) => doc.path),
    failures,
  }

  if (args.out) {
    const outPath = resolve(process.cwd(), args.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (failures.length === 0) {
    console.log(
      "Research owner read issues live-read proof-runner contract check passed."
    )
  } else {
    console.error(
      [
        "Research owner read issues live-read proof-runner contract check failed:",
        ...failures.map((failure) => `- ${failure}`),
      ].join("\n")
    )
  }

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
