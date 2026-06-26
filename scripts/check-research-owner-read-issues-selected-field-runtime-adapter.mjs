#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const SERVICE_PATH =
  "src/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service.ts"
const SERVICE_AUTHZ_PATH =
  "src/lib/services/research-owner-read-issues-runtime-readiness.service.ts"
const DTO_SERVICE_PATH = "src/lib/services/research-owner-read-dto.service.ts"
const READINESS_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
const RUNTIME_READINESS_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-issues-runtime-readiness.contract.ts"
const ISSUES_ADAPTER_PATH =
  "src/lib/services/research-owner-read-issues-adapter.service.ts"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"
const PREVIOUS_TASK_ID =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"
const BFF_011_TASK_ID =
  "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE"
const BFF_010_TASK_ID =
  "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF"
const BFF_009_TASK_ID =
  "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE"
const NEXT_TASK_ID = "LOOP-168-RESEARCH-POST-SELECTED-FIELD-ADAPTER-GAP-REVIEW"

const REQUIRED_SERVICE_MARKERS = [
  "import \"server-only\"",
  "buildResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof",
  "ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof",
  TASK_ID,
  PREVIOUS_TASK_ID,
  BFF_011_TASK_ID,
  BFF_010_TASK_ID,
  BFF_009_TASK_ID,
  NEXT_TASK_ID,
  "selected_field_runtime_adapter_proof_gate_no_live_research_read",
  "selected_field_runtime_adapter_proof_gate_ready_no_live_research_read",
  "blocked_until_service_authz_and_proof_target",
  "serviceAuthzPreflightReady",
  "ownerIdentitySource: \"requireUser().profileId\"",
  "ResearchThread.ownerId equals requireUser().profileId",
  "callerSuppliedOwnerIdAllowed: false",
  "directThreadIdOnlyAccessAllowed: false",
  "selectedScalarFields",
  "relationCountKeys",
  "relationCountSelection",
  "stableSort",
  "defaultLimit",
  "plannedPrismaOperation",
  "prisma.researchThread.findMany",
  "plannedWhere",
  "where: { ownerId: ownerProfileId }",
  "plannedSelectShape",
  "mapAuthorizedResearchIssueRowsToDtos",
  "authorized_rows_or_explicit_unavailable_state",
  "ui_safe_research_issue_read_dto",
  "proofTargetReady: false",
  "livePrismaReadAllowed: false",
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
  "ownerRunCriteria",
  "Return explicit unavailable Research issues output",
]

const REQUIRED_DTO_SERVICE_MARKERS = [
  "buildResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof",
  "ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof",
  "ResearchOwnerReadIssuesServiceAuthzRuntimeProof",
  "issuesSelectedFieldRuntimeAdapterProof",
  TASK_ID,
  "_count relation keys",
]

const REQUIRED_PAGE_MARKERS = [
  TASK_ID,
  "ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterTone",
  "ownerReadIssuesSelectedFieldRuntimeAdapterTaskId",
  "issuesSelectedFieldRuntimeAdapterProof",
  "Issues selected-field runtime adapter proof",
  "data-issues-selected-field-runtime-adapter-mode",
  "data-issues-selected-field-runtime-adapter-task",
  "data-live-prisma-read-allowed",
  "data-proof-target-ready",
  "issuesSelectedFieldRuntimeAdapterProof.plannedPrismaOperation",
  "issuesSelectedFieldRuntimeAdapterProof.plannedWhere",
  "issuesSelectedFieldRuntimeAdapterProof.selectedScalarFields.map",
  "issuesSelectedFieldRuntimeAdapterProof.relationCountKeys.map",
  "issuesSelectedFieldRuntimeAdapterProof.ownerRunCriteria.map",
  "issuesSelectedFieldRuntimeAdapterProof.rows.map",
  "serviceAuthzPreflightReady:",
  "livePrismaReadAllowed:",
  "proofTargetReady:",
  "adapterExecutionAllowed:",
]

const REQUIRED_RUNTIME_READINESS_MARKERS = [
  BFF_011_TASK_ID,
  "selectScalarFields",
  "relationCountKeys",
  "prisma.researchThread.findMany",
  "where: { ownerId: ownerProfileId }",
  "ResearchThread.ownerId equals requireUser().profileId",
  "runtimeDbReadEnabled: false",
  "adapterExecutionAllowed: false",
]

const REQUIRED_ISSUES_ADAPTER_MARKERS = [
  BFF_010_TASK_ID,
  "mapAuthorizedResearchIssueRowsToDtos",
  "ui_safe_research_issue_read_dto",
  "blockedFields",
  "runtimeDbReadEnabled: false",
  "adapterExecutionAllowed: false",
]

const REQUIRED_SERVICE_AUTHZ_MARKERS = [
  PREVIOUS_TASK_ID,
  "buildResearchOwnerReadIssuesServiceAuthzRuntimeProof",
  "service_authz_runtime_proof_ready_no_research_db_read",
  "runtimeRequireUserCallInThisSlice: true",
  "ownerIdentitySource: \"requireUser().profileId\"",
  "runtimeDbReadEnabled: false",
  "adapterExecutionAllowed: false",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-013 Research Owner Read Issues Selected Field Runtime Adapter Proof Acceptance",
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-selected-field-runtime-adapter.mjs",
      "pnpm research:read-issues-selected-field-runtime-adapter:check",
      "selected_field_runtime_adapter_proof_gate_no_live_research_read",
      "serviceAuthzPreflightReady",
      "livePrismaReadAllowed: false",
      "proofTargetReady: false",
      NEXT_TASK_ID,
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      TASK_ID,
      "DONE",
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-selected-field-runtime-adapter.mjs",
      "pnpm research:read-issues-selected-field-runtime-adapter:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 167",
      TASK_ID,
      "selected-field runtime adapter proof",
      "pnpm research:read-issues-selected-field-runtime-adapter:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      TASK_ID,
      "DONE",
      "research:read-issues-selected-field-runtime-adapter:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      TASK_ID,
      "Research owner read issues selected-field runtime adapter proof",
      "pnpm research:read-issues-selected-field-runtime-adapter:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-issues-selected-field-runtime-adapter:check": "node scripts/check-research-owner-read-issues-selected-field-runtime-adapter.mjs"',
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
  { label: "provider client call", pattern: /\bcreateClient\s*\(/ },
  { label: "network call", pattern: /\bfetch\s*\(/ },
  { label: "cookie read", pattern: /\bcookies\s*\(/ },
  { label: "header read", pattern: /\bheaders\s*\(/ },
  { label: "route handler request", pattern: /\bNextRequest\b/ },
  { label: "route handler response", pattern: /\bNextResponse\b/ },
  { label: "server action", pattern: /["']use server["']/ },
  { label: "proof target ready", pattern: /proofTargetReady:\s*true/ },
  { label: "live Prisma read allowed", pattern: /livePrismaReadAllowed:\s*true/ },
  { label: "runtime DB read enabled", pattern: /runtimeDbReadEnabled:\s*true/ },
  { label: "runtime DB write enabled", pattern: /runtimeDbWriteEnabled:\s*true/ },
  { label: "runtime Prisma read enabled", pattern: /runtimePrismaReadEnabled:\s*true/ },
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
    serviceAuthz: await readText(SERVICE_AUTHZ_PATH),
    dtoService: await readText(DTO_SERVICE_PATH),
    readinessPage: await readText(READINESS_PAGE_PATH),
    runtimeReadiness: await readText(RUNTIME_READINESS_CONTRACT_PATH),
    issuesAdapter: await readText(ISSUES_ADAPTER_PATH),
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
      (marker) => `selected-field adapter service missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.dtoService, REQUIRED_DTO_SERVICE_MARKERS).map(
      (marker) => `owner-read DTO service missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.readinessPage, REQUIRED_PAGE_MARKERS).map(
      (marker) => `readiness page missing marker: ${marker}`,
    ),
    ...missingMarkers(
      sources.runtimeReadiness,
      REQUIRED_RUNTIME_READINESS_MARKERS,
    ).map((marker) => `runtime-readiness contract missing marker: ${marker}`),
    ...missingMarkers(sources.issuesAdapter, REQUIRED_ISSUES_ADAPTER_MARKERS).map(
      (marker) => `issues adapter proof missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.serviceAuthz, REQUIRED_SERVICE_AUTHZ_MARKERS).map(
      (marker) => `service-authz runtime proof missing marker: ${marker}`,
    ),
    ...forbiddenMatches(sources.service, FORBIDDEN_SERVICE_PATTERNS).map(
      (label) => `selected-field adapter service has forbidden pattern: ${label}`,
    ),
    ...docResults.flatMap((doc) =>
      doc.missingMarkers.map((marker) => `${doc.path} missing marker: ${marker}`),
    ),
  ]

  const result = {
    status:
      failures.length === 0
        ? "ready_for_issues_selected_field_runtime_adapter_proof_gate"
        : "failed",
    taskId: TASK_ID,
    previousTask: PREVIOUS_TASK_ID,
    selectedFamily: "issues",
    selectedModel: "ResearchThread",
    ownerIdentitySource: "requireUser().profileId",
    ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId",
    plannedPrismaOperation: "prisma.researchThread.findMany",
    plannedWhere: "where: { ownerId: ownerProfileId }",
    mapperFunction: "mapAuthorizedResearchIssueRowsToDtos",
    serviceAuthzPreflightRequired: true,
    proofTargetReady: false,
    livePrismaReadAllowed: false,
    runtimeDbReadEnabled: false,
    runtimePrismaReadEnabled: false,
    adapterExecutionAllowed: false,
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
    console.log(`${TASK_ID}: PASS (issues selected-field runtime adapter proof gate)`)
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
