#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-adapter-runtime.contract.ts"
const SERVICE_PATH = "src/lib/services/research-owner-read-dto.service.ts"
const READINESS_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
const QUERY_PLAN_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-query-plan.contract.ts"
const AUTHZ_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-adapter-authz.contract.ts"
const MOCK_HARNESS_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-adapter-mock-harness.contract.ts"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const SELECTED_FAMILY = "issues"
const TASK_ID = "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE"
const NEXT_TASK_ID =
  "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF"

const REQUIRED_CONTRACT_MARKERS = [
  "RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE",
  "RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY",
  "RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SELECTED_FAMILY",
  "RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_ENABLED_RUNTIME_READ_FAMILIES",
  TASK_ID,
  "proof_gated_adapter_skeleton_no_runtime_db_read",
  "ready_for_first_research_owner_read_runtime_adapter_slice_gate",
  "proof_gated_disabled_until_auth_profile_and_proof_target",
  'selectedFamily: "issues"',
  "selectedFamilyCount: 1",
  "enabledRuntimeReadFamilies",
  "consumesBff005QueryPlan: true",
  "consumesBff006LoaderBoundary: true",
  "consumesBff007AuthzDecision: true",
  "consumesBff008MockHarness: true",
  "ResearchThread",
  "ResearchThread.ownerId equals requireUser().profileId",
  "contract_eligible_after_service_authz",
  "requireUser().profileId",
  "authorized_rows_or_explicit_unavailable_state",
  "proofGatedAdapterSkeleton: true",
  "runtimeAdapterExecutionAllowed: false",
  "realAdapterExecutionAllowed: false",
  "adapterExecutionAllowed: false",
  "runtimeRequireUserCallInThisSlice: false",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
  "publicOutputEnabled: false",
  "externalCollaborationEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
  "launchLevelUpgradeClaimed: false",
  "runtimeDbReadAllowed: false",
  "runtimeDbWriteAllowed: false",
  "schemaMigrationAllowed: false",
  "migrationApplyAllowed: false",
  "seedChangeAllowed: false",
  "routeHandlerAllowed: false",
  "serverActionWriteAllowed: false",
  "connectorRuntimeAllowed: false",
  "providerRuntimeAllowed: false",
  "publicOutputAllowed: false",
  "hiddenMockToFormalClaimAllowed: false",
  "protected_owner_visible_proposal_only",
  "finalWritesRequireHumanApproval: true",
  NEXT_TASK_ID,
]

const REQUIRED_QUERY_PLAN_MARKERS = [
  "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
  'id: "issues"',
  "ResearchThread",
  "ownerScopePredicate",
  "selectedFields",
  "runtimeDbReadEnabled: false",
]

const REQUIRED_AUTHZ_MARKERS = [
  "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
  '\"issues\": {',
  "contract_eligible_after_service_authz",
  "ownerScopeProofPath",
  "ResearchThread.ownerId equals requireUser().profileId",
  "adapterExecutionAllowed: false",
  "runtimeDbReadEnabled: false",
]

const REQUIRED_MOCK_MARKERS = [
  "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
  "fixture-research-issue-owner-scoped",
  "fixture_adapter_exercised_no_db",
  "mockOnlyAdapterHarness: true",
  "runtimeAdapterExecutionAllowed: false",
  "runtimeDbReadEnabled: false",
]

const REQUIRED_SERVICE_MARKERS = [
  "RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY",
  "ResearchOwnerReadRuntimeAdapterGate",
  "runtimeAdapterGate",
  TASK_ID,
  "proof_gated_adapter_skeleton_no_runtime_db_read",
  "runtimeDbReadEnabled: RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_SUMMARY.runtimeDbReadEnabled",
  "adapterExecutionAllowed:",
  "Use RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE as the first runtime adapter gate",
]

const REQUIRED_PAGE_MARKERS = [
  "First runtime adapter gate",
  TASK_ID,
  "data-runtime-adapter-gate-mode",
  "proof_gated_adapter_skeleton_no_runtime_db_read",
  "data-runtime-adapter-selected-family",
  "ownerReadSurface.runtimeAdapterGate.selectedFamily",
  "ownerReadSurface.runtimeAdapterGate.ownerScopeProofPath",
  "ownerReadSurface.runtimeAdapterGate.selectedFieldBoundary",
  "ownerReadSurface.runtimeAdapterGate.nextSafeAction",
  "adapterExecutionAllowed:",
  "runtimeDbReadEnabled:",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-009 Research Owner Read First Runtime Adapter Slice Acceptance",
      CONTRACT_PATH,
      "scripts/check-research-owner-read-adapter-runtime.mjs",
      "pnpm research:read-adapter-runtime:check",
      "selected family: issues",
      "proof-gated runtime adapter skeleton",
      "runtime DB reads disabled",
      NEXT_TASK_ID,
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      TASK_ID,
      CONTRACT_PATH,
      "scripts/check-research-owner-read-adapter-runtime.mjs",
      "pnpm research:read-adapter-runtime:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 161",
      TASK_ID,
      "selected family `issues`",
      "pnpm research:read-adapter-runtime:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      TASK_ID,
      NEXT_TASK_ID,
      "research:read-adapter-runtime:check",
    ],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      TASK_ID,
      "Research owner read first runtime adapter slice",
      "pnpm research:read-adapter-runtime:check",
      "selected family `issues`",
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-adapter-runtime:check": "node scripts/check-research-owner-read-adapter-runtime.mjs"',
    ],
  },
]

const FORBIDDEN_CONTRACT_PATTERNS = [
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
  { label: "runtime adapter execution enabled", pattern: /runtimeAdapterExecutionAllowed:\s*true/ },
  { label: "real adapter execution enabled", pattern: /realAdapterExecutionAllowed:\s*true/ },
  { label: "adapter execution enabled", pattern: /adapterExecutionAllowed:\s*true/ },
  { label: "runtime DB read enabled", pattern: /runtimeDbReadEnabled:\s*true/ },
  { label: "runtime DB write enabled", pattern: /runtimeDbWriteEnabled:\s*true/ },
  { label: "runtime DB read allowed", pattern: /runtimeDbReadAllowed:\s*true/ },
  { label: "runtime DB write allowed", pattern: /runtimeDbWriteAllowed:\s*true/ },
  { label: "route handler enabled", pattern: /routeHandlerEnabled:\s*true/ },
  { label: "server action write enabled", pattern: /serverActionWriteEnabled:\s*true/ },
  { label: "schema migration allowed", pattern: /schemaMigrationAllowed:\s*true/ },
  { label: "migration apply allowed", pattern: /migrationApplyAllowed:\s*true/ },
  { label: "seed change allowed", pattern: /seedChangeAllowed:\s*true/ },
  { label: "public output allowed", pattern: /publicOutputAllowed:\s*true/ },
  { label: "external collaboration allowed", pattern: /externalCollaborationAllowed:\s*true/ },
  { label: "external agent database access allowed", pattern: /externalAgentDatabaseAccessAllowed:\s*true/ },
  { label: "agent final write allowed", pattern: /agentFinalWriteAllowed:\s*true/ },
  { label: "external registerable true flag", pattern: /externalRegisterable:\s*true/ },
  { label: "hidden mock formal claim", pattern: /hiddenMockToFormalClaimAllowed:\s*true/ },
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
    contract: await readText(CONTRACT_PATH),
    service: await readText(SERVICE_PATH),
    readinessPage: await readText(READINESS_PAGE_PATH),
    queryPlan: await readText(QUERY_PLAN_CONTRACT_PATH),
    authz: await readText(AUTHZ_CONTRACT_PATH),
    mockHarness: await readText(MOCK_HARNESS_CONTRACT_PATH),
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
    ...missingMarkers(sources.contract, REQUIRED_CONTRACT_MARKERS).map(
      (marker) => `contract missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.queryPlan, REQUIRED_QUERY_PLAN_MARKERS).map(
      (marker) => `query plan missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.authz, REQUIRED_AUTHZ_MARKERS).map(
      (marker) => `authz contract missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.mockHarness, REQUIRED_MOCK_MARKERS).map(
      (marker) => `mock harness missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.service, REQUIRED_SERVICE_MARKERS).map(
      (marker) => `service missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.readinessPage, REQUIRED_PAGE_MARKERS).map(
      (marker) => `readiness page missing marker: ${marker}`,
    ),
    ...forbiddenMatches(sources.contract, FORBIDDEN_CONTRACT_PATTERNS).map(
      (label) => `contract has forbidden pattern: ${label}`,
    ),
    ...docResults.flatMap((doc) =>
      doc.missingMarkers.map((marker) => `${doc.path} missing marker: ${marker}`),
    ),
  ]

  const selectedFamilyIntegrity =
    sources.contract.includes('selectedFamily: "issues"') &&
    sources.contract.includes("selectedFamilyCount: 1") &&
    sources.contract.includes("[] as const satisfies readonly ResearchOwnerReadDtoFamilyId[]") &&
    !sources.contract.includes('selectedFamily: "sources"') &&
    !sources.contract.includes('selectedFamily: "concepts"') &&
    !sources.contract.includes('selectedFamily: "writing-projects"') &&
    !sources.contract.includes('selectedFamily: "writing-sections"')

  if (!selectedFamilyIntegrity) {
    failures.push("selected family integrity failed")
  }

  const result = {
    status: failures.length === 0 ? "ready_for_first_research_owner_read_runtime_adapter_slice_gate" : "failed",
    taskId: TASK_ID,
    selectedFamily: SELECTED_FAMILY,
    runtimeDbReadEnabled: false,
    adapterExecutionAllowed: false,
    adapterExecutionDecision: "proof_gated_disabled_until_auth_profile_and_proof_target",
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
    console.log(`${TASK_ID}: PASS (${SELECTED_FAMILY}, proof-gated no runtime DB read)`)
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
