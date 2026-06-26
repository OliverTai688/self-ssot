#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const SERVICE_PATH =
  "src/lib/services/research-owner-read-issues-runtime-readiness.service.ts"
const READINESS_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
const OWNER_READ_DTO_SERVICE_PATH =
  "src/lib/services/research-owner-read-dto.service.ts"
const RUNTIME_READINESS_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-issues-runtime-readiness.contract.ts"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const TASK_ID =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"
const PREVIOUS_TASK_ID =
  "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE"
const NEXT_TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"

const REQUIRED_SERVICE_MARKERS = [
  "import \"server-only\"",
  "buildResearchOwnerReadIssuesServiceAuthzRuntimeProof",
  "requireUser()",
  "await requireUser()",
  TASK_ID,
  PREVIOUS_TASK_ID,
  "issues_service_authz_runtime_proof_no_research_db_read",
  "service_authz_runtime_proof_ready_no_research_db_read",
  "service_authz_runtime_blocked_by_auth",
  "runtime_require_user_owner_scope_preflight_no_research_db_read",
  "runtimeRequireUserCallInThisSlice: true",
  "ownerIdentitySource: \"requireUser().profileId\"",
  "ownerProfileIdRedacted: true",
  "emailRedacted: true",
  "roleRedacted: true",
  "callerSuppliedOwnerIdAllowed: false",
  "directThreadIdOnlyAccessAllowed: false",
  "authProfileLookupMayOccur: true",
  "runtimeDbReadEnabled: false",
  "runtimeDbReadScope: \"research_owner_read_adapter_only\"",
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
  "uiSafePacket",
  "ResearchThread.ownerId equals requireUser().profileId",
  "ui_safe_research_issue_read_dto",
  "Stop before Research DB read/write",
  NEXT_TASK_ID,
]

const REQUIRED_PAGE_MARKERS = [
  TASK_ID,
  "buildResearchOwnerReadIssuesServiceAuthzRuntimeProof",
  "ownerReadIssuesServiceAuthzRuntimeTaskId",
  "Issues service-authz runtime proof",
  "data-issues-service-authz-runtime-mode",
  "data-issues-service-authz-runtime-task",
  "data-owner-profile-id-redacted",
  "issuesServiceAuthzRuntimeProof.status",
  "issuesServiceAuthzRuntimeProof.ownerIdentitySource",
  "issuesServiceAuthzRuntimeProof.ownerProfileIdRedacted",
  "issuesServiceAuthzRuntimeProof.runtimeDbReadScope",
  "issuesServiceAuthzRuntimeProof.rows.map",
  "adapterExecutionAllowed:",
  "runtimeDbReadEnabled:",
]

const REQUIRED_DTO_SERVICE_MARKERS = [
  TASK_ID,
  "no-secret owner preflight packet",
]

const REQUIRED_RUNTIME_READINESS_MARKERS = [
  PREVIOUS_TASK_ID,
  TASK_ID,
  "requireUser().profileId",
  "ResearchThread.ownerId equals requireUser().profileId",
  "runtimeDbReadEnabled: false",
  "adapterExecutionAllowed: false",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-012 Research Owner Read Issues Service Authz Runtime Proof Acceptance",
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-service-authz-runtime.mjs",
      "pnpm research:read-issues-service-authz-runtime:check",
      "issues_service_authz_runtime_proof_no_research_db_read",
      "runtimeDbReadScope: research_owner_read_adapter_only",
      NEXT_TASK_ID,
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      TASK_ID,
      "DONE",
      SERVICE_PATH,
      "scripts/check-research-owner-read-issues-service-authz-runtime.mjs",
      "pnpm research:read-issues-service-authz-runtime:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 166",
      TASK_ID,
      "issues service-authz runtime proof",
      "pnpm research:read-issues-service-authz-runtime:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      TASK_ID,
      "DONE",
      "research:read-issues-service-authz-runtime:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      TASK_ID,
      "Research owner read issues service authz runtime proof",
      "pnpm research:read-issues-service-authz-runtime:check",
      NEXT_TASK_ID,
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-issues-service-authz-runtime:check": "node scripts/check-research-owner-read-issues-service-authz-runtime.mjs"',
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
  { label: "runtime Research DB read enabled", pattern: /runtimeDbReadEnabled:\s*true/ },
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
    readinessPage: await readText(READINESS_PAGE_PATH),
    dtoService: await readText(OWNER_READ_DTO_SERVICE_PATH),
    runtimeReadinessContract: await readText(RUNTIME_READINESS_CONTRACT_PATH),
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
      (marker) => `service authz runtime proof missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.readinessPage, REQUIRED_PAGE_MARKERS).map(
      (marker) => `readiness page missing marker: ${marker}`,
    ),
    ...missingMarkers(sources.dtoService, REQUIRED_DTO_SERVICE_MARKERS).map(
      (marker) => `owner-read DTO service missing marker: ${marker}`,
    ),
    ...missingMarkers(
      sources.runtimeReadinessContract,
      REQUIRED_RUNTIME_READINESS_MARKERS,
    ).map((marker) => `runtime-readiness contract missing marker: ${marker}`),
    ...forbiddenMatches(sources.service, FORBIDDEN_SERVICE_PATTERNS).map(
      (label) => `service authz runtime proof has forbidden pattern: ${label}`,
    ),
    ...docResults.flatMap((doc) =>
      doc.missingMarkers.map((marker) => `${doc.path} missing marker: ${marker}`),
    ),
  ]

  const result = {
    status:
      failures.length === 0
        ? "ready_for_issues_service_authz_runtime_proof"
        : "failed",
    taskId: TASK_ID,
    previousTask: PREVIOUS_TASK_ID,
    selectedFamily: "issues",
    selectedModel: "ResearchThread",
    ownerIdentitySource: "requireUser().profileId",
    serviceAuthorizationMode:
      "runtime_require_user_owner_scope_preflight_no_research_db_read",
    runtimeRequireUserCallInThisSlice: true,
    runtimeDbReadEnabled: false,
    runtimeDbReadScope: "research_owner_read_adapter_only",
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
    console.log(`${TASK_ID}: PASS (issues service-authz runtime proof)`)
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
