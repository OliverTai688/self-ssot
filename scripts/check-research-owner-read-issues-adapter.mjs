#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const SERVICE_PATH = "src/lib/services/research-owner-read-issues-adapter.service.ts"
const OWNER_READ_DTO_SERVICE_PATH = "src/lib/services/research-owner-read-dto.service.ts"
const READINESS_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
const RUNTIME_GATE_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-adapter-runtime.contract.ts"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const TASK_ID = "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF"
const NEXT_TASK_ID = "LOOP-163-RESEARCH-POST-ISSUES-ADAPTER-GAP-REVIEW"

const REQUIRED_SERVICE_MARKERS = [
  "server-only",
  TASK_ID,
  "ResearchOwnerReadIssueAuthorizedRow",
  "ResearchOwnerReadIssueReadDto",
  "ResearchOwnerReadIssuesAdapterProof",
  "RESEARCH_OWNER_READ_ISSUES_PROOF_ROW",
  "RESEARCH_OWNER_READ_ISSUES_ADAPTER_PROOF",
  "buildResearchOwnerReadIssuesAdapterProof",
  "mapAuthorizedResearchIssueRowToDto",
  "mapAuthorizedResearchIssueRowsToDtos",
  "issues_adapter_interface_mapper_proof_no_runtime_db_read",
  "ready_for_issues_adapter_interface_and_mapper_proof",
  "ResearchThread",
  "loadResearchIssuesForOwner({ ownerProfileId }) -> Promise<ResearchIssueReadDtoResponse>",
  "authorized_rows_or_explicit_unavailable_state",
  "ui_safe_research_issue_read_dto",
  "model-ready-read-unavailable",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "adapterExecutionAllowed: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
  "publicOutputEnabled: false",
  "externalCollaborationEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
  "launchLevelUpgradeClaimed: false",
  "protected_owner_visible_proposal_only",
  "finalWritesRequireHumanApproval: true",
  NEXT_TASK_ID,
]

const REQUIRED_DTO_SERVICE_MARKERS = [
  "buildResearchOwnerReadIssuesAdapterProof",
  "ResearchOwnerReadIssuesAdapterProof",
  "issuesAdapterProof",
  TASK_ID,
  "Use RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF as the issues adapter interface and mapper proof",
]

const REQUIRED_PAGE_MARKERS = [
  "Issues adapter interface and mapper proof",
  TASK_ID,
  "data-issues-adapter-proof-mode",
  "issues_adapter_interface_mapper_proof_no_runtime_db_read",
  "ownerReadSurface.issuesAdapterProof.futureAdapterSignature",
  "ownerReadSurface.issuesAdapterProof.mapperInputBoundary",
  "ownerReadSurface.issuesAdapterProof.mapperOutputBoundary",
  "ownerReadSurface.issuesAdapterProof.proofDtos",
  "ownerReadSurface.issuesAdapterProof.blockedFields",
  "adapterExecutionAllowed:",
  "runtimeDbReadEnabled:",
]

const REQUIRED_RUNTIME_GATE_MARKERS = [
  "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
  'selectedFamily: "issues"',
  "runtimeDbReadEnabled: false",
  "adapterExecutionAllowed: false",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-010 Research Owner Read Issues Adapter Interface And Mapper Proof Acceptance",
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-adapter.mjs",
      "pnpm research:read-issues-adapter:check",
      "issues_adapter_interface_mapper_proof_no_runtime_db_read",
      "ui_safe_research_issue_read_dto",
      NEXT_TASK_ID,
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      TASK_ID,
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-adapter.mjs",
      "pnpm research:read-issues-adapter:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 162",
      TASK_ID,
      "issues adapter interface",
      "pnpm research:read-issues-adapter:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      TASK_ID,
      NEXT_TASK_ID,
      "research:read-issues-adapter:check",
    ],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      TASK_ID,
      "Research owner read issues adapter interface and mapper proof",
      "pnpm research:read-issues-adapter:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-issues-adapter:check": "node scripts/check-research-owner-read-issues-adapter.mjs"',
    ],
  },
]

const FORBIDDEN_SERVICE_PATTERNS = [
  { label: "Prisma client import", pattern: /@prisma\/client/ },
  { label: "database client import", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "database client call", pattern: /\bdb\./ },
  { label: "environment read", pattern: /\bprocess\.env\b/ },
  { label: "provider client call", pattern: /\bcreateClient\s*\(/ },
  { label: "network call", pattern: /\bfetch\s*\(/ },
  { label: "database URL marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged provider env marker", pattern: /\bSUPABASE_/ },
  { label: "cookie read", pattern: /\bcookies\s*\(/ },
  { label: "header read", pattern: /\bheaders\s*\(/ },
  { label: "route handler request", pattern: /\bNextRequest\b/ },
  { label: "route handler response", pattern: /\bNextResponse\b/ },
  { label: "server action", pattern: /["']use server["']/ },
  { label: "runtime DB read enabled", pattern: /runtimeDbReadEnabled:\s*true/ },
  { label: "runtime DB write enabled", pattern: /runtimeDbWriteEnabled:\s*true/ },
  { label: "adapter execution enabled", pattern: /adapterExecutionAllowed:\s*true/ },
  { label: "route handler enabled", pattern: /routeHandlerEnabled:\s*true/ },
  { label: "server action write enabled", pattern: /serverActionWriteEnabled:\s*true/ },
  { label: "public output enabled", pattern: /publicOutputEnabled:\s*true/ },
  { label: "external collaboration enabled", pattern: /externalCollaborationEnabled:\s*true/ },
  {
    label: "external agent database access enabled",
    pattern: /externalAgentDatabaseAccessAllowed:\s*true/,
  },
  { label: "agent final write enabled", pattern: /agentFinalWriteAllowed:\s*true/ },
  { label: "external registerable", pattern: /externalRegisterable:\s*true/ },
  { label: "launch upgrade claimed", pattern: /launchLevelUpgradeClaimed:\s*true/ },
]

function parseArgs(argv) {
  const args = { json: false, out: null }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]
    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      args.out = filteredArgs[index + 1] ?? null
      index += 1
    } else if (arg.startsWith("--out=")) {
      args.out = arg.slice("--out=".length)
    }
  }

  return args
}

async function readText(path) {
  return readFile(resolve(process.cwd(), path), "utf8")
}

function missingMarkers(text, markers) {
  return markers.filter((marker) => !text.includes(marker))
}

function forbiddenMatches(text, patterns) {
  return patterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label)
}

async function writeJson(path, payload) {
  const outputPath = resolve(process.cwd(), path)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const sources = {
    service: await readText(SERVICE_PATH),
    dtoService: await readText(OWNER_READ_DTO_SERVICE_PATH),
    readinessPage: await readText(READINESS_PAGE_PATH),
    runtimeGate: await readText(RUNTIME_GATE_CONTRACT_PATH),
  }

  const docResults = []
  for (const doc of REQUIRED_DOCS) {
    const text = await readText(doc.path)
    docResults.push({
      path: doc.path,
      missingMarkers: missingMarkers(text, doc.markers),
    })
  }

  const failures = [
    ...missingMarkers(sources.service, REQUIRED_SERVICE_MARKERS).map(
      (marker) => `issues adapter service missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.dtoService, REQUIRED_DTO_SERVICE_MARKERS).map(
      (marker) => `owner-read DTO service missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.readinessPage, REQUIRED_PAGE_MARKERS).map(
      (marker) => `readiness page missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.runtimeGate, REQUIRED_RUNTIME_GATE_MARKERS).map(
      (marker) => `runtime gate contract missing marker: ${marker}`,
    ),
    ...forbiddenMatches(sources.service, FORBIDDEN_SERVICE_PATTERNS).map(
      (label) => `issues adapter service has forbidden pattern: ${label}`,
    ),
    ...docResults.flatMap((doc) =>
      doc.missingMarkers.map((marker) => `${doc.path} missing marker: ${marker}`),
    ),
  ]

  const result = {
    status:
      failures.length === 0
        ? "ready_for_issues_adapter_interface_and_mapper_proof"
        : "failed",
    taskId: TASK_ID,
    selectedFamily: "issues",
    runtimeDbReadEnabled: false,
    adapterExecutionAllowed: false,
    mapperOutputBoundary: "ui_safe_research_issue_read_dto",
    nextRecommendedTask: NEXT_TASK_ID,
    docs: docResults,
    failures,
  }

  if (args.out) {
    await writeJson(args.out, result)
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (failures.length === 0) {
    console.log(`${TASK_ID}: PASS (issues adapter interface and mapper proof)`)
  } else {
    console.error(`${TASK_ID}: FAIL`)
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
  }

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
