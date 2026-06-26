#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-adapter-mock-harness.contract.ts"
const AUTHZ_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-adapter-authz.contract.ts"
const QUERY_PLAN_CONTRACT_PATH =
  "src/lib/contracts/research-owner-read-query-plan.contract.ts"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const REQUIRED_FAMILIES = [
  "issues",
  "sources",
  "concepts",
  "writing-projects",
  "writing-sections",
  "events",
  "people",
  "typed-links",
  "graph-projections",
  "readiness-evidence",
  "agent-proposals",
]

const CONTRACT_ELIGIBLE_FAMILIES = [
  "issues",
  "sources",
  "concepts",
  "writing-projects",
  "writing-sections",
]

const NON_EXECUTABLE_FAMILIES = [
  "events",
  "people",
  "typed-links",
  "graph-projections",
  "readiness-evidence",
  "agent-proposals",
]

const REQUIRED_CONTRACT_MARKERS = [
  "RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_CONTRACT",
  "RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_SUMMARY",
  "RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_ROWS",
  "RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS",
  "RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_FIXTURE_ROWS_BY_FAMILY",
  "RESEARCH_OWNER_READ_ADAPTER_MOCK_HARNESS_OUTCOME_POLICY",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS",
  "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
  "adapter_mock_harness_only_no_runtime_db_read",
  "ready_for_research_owner_read_adapter_mock_harness_use",
  "requiresBff007AuthzDecision: true",
  "fixture_adapter_exercised_no_db",
  "blocked_no_adapter_execution",
  "derived_projection_no_adapter_execution",
  "generated_evidence_metadata_only",
  "proposal_only_no_final_write",
  "fixture_result_returned",
  "not_executed",
  "fixtureAdapterExercised: true",
  "fixtureAdapterExercised: false",
  "mockOnlyAdapterHarness: true",
  "realAdapterExecutionAllowed: false",
  "runtimeAdapterExecutionAllowed: false",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
  "publicOutputEnabled: false",
  "externalCollaborationEnabled: false",
  "externalAgentDatabaseAccessAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
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
  "launchLevelUpgradeClaimed: false",
  "protected_owner_visible_proposal_only",
  "finalWritesRequireHumanApproval: true",
  "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
]

const REQUIRED_AUTHZ_MARKERS = [
  "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS",
  "contract_eligible_after_service_authz",
  "blocked_owner_scope_missing",
  "derived_only",
  "generated_evidence_only",
  "proposal_only_no_final_write",
  "adapterExecutionAllowed: false",
  "runtimeDbReadEnabled: false",
]

const REQUIRED_QUERY_PLAN_MARKERS = [
  "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
  "RESEARCH_OWNER_READ_QUERY_PLAN_ROWS",
  "ownerScopePredicate",
  "selectedFields",
  "runtimeDbReadEnabled: false",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-008 Research Owner Read Adapter Mock Harness Acceptance",
      "src/lib/contracts/research-owner-read-adapter-mock-harness.contract.ts",
      "scripts/check-research-owner-read-adapter-mock-harness.mjs",
      "pnpm research:read-adapter-mock:check",
      "BFF-007 authz decisions",
      "fixture-only adapter",
      "blocked/derived/generated/proposal-only families never execute adapters",
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
      "src/lib/contracts/research-owner-read-adapter-mock-harness.contract.ts",
      "scripts/check-research-owner-read-adapter-mock-harness.mjs",
      "pnpm research:read-adapter-mock:check",
      "LOOP-160-LAUNCH-LEVEL-AND-RESEARCH-REVIEW",
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 159",
      "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
      "pnpm research:read-adapter-mock:check",
      "LOOP-160-LAUNCH-LEVEL-AND-RESEARCH-REVIEW",
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
      "LOOP-160-LAUNCH-LEVEL-AND-RESEARCH-REVIEW",
      "research:read-adapter-mock:check",
    ],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
      "Research owner read adapter mock harness",
      "pnpm research:read-adapter-mock:check",
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-adapter-mock:check": "node scripts/check-research-owner-read-adapter-mock-harness.mjs"',
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
  { label: "real adapter execution enabled", pattern: /realAdapterExecutionAllowed:\s*true/ },
  {
    label: "runtime adapter execution enabled",
    pattern: /runtimeAdapterExecutionAllowed:\s*true/,
  },
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
  {
    label: "external agent database access allowed",
    pattern: /externalAgentDatabaseAccessAllowed:\s*true/,
  },
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

function countOccurrences(text, marker) {
  return text.split(marker).length - 1
}

async function writeJson(path, data) {
  const absolutePath = resolve(process.cwd(), path)
  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${JSON.stringify(data, null, 2)}\n`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const errors = []
  const warnings = []

  let contractText = ""
  let authzText = ""
  let queryPlanText = ""

  try {
    contractText = await readText(CONTRACT_PATH)
  } catch (error) {
    errors.push(`Missing mock harness contract file: ${CONTRACT_PATH} (${error.message})`)
  }

  try {
    authzText = await readText(AUTHZ_CONTRACT_PATH)
  } catch (error) {
    errors.push(`Missing prerequisite authz contract file: ${AUTHZ_CONTRACT_PATH} (${error.message})`)
  }

  try {
    queryPlanText = await readText(QUERY_PLAN_CONTRACT_PATH)
  } catch (error) {
    errors.push(
      `Missing prerequisite query-plan contract file: ${QUERY_PLAN_CONTRACT_PATH} (${error.message})`,
    )
  }

  if (contractText) {
    for (const marker of missingMarkers(contractText, REQUIRED_CONTRACT_MARKERS)) {
      errors.push(`Missing mock harness marker in ${CONTRACT_PATH}: ${marker}`)
    }

    for (const family of REQUIRED_FAMILIES) {
      if (!contractText.includes(`"${family}"`)) {
        errors.push(`Missing mock harness fixture family: ${family}`)
      }
    }

    for (const family of NON_EXECUTABLE_FAMILIES) {
      if (!contractText.includes(family)) {
        errors.push(`Missing non-executable family marker: ${family}`)
      }
    }

    for (const forbidden of FORBIDDEN_CONTRACT_PATTERNS) {
      if (forbidden.pattern.test(contractText)) {
        errors.push(`Forbidden runtime marker in ${CONTRACT_PATH}: ${forbidden.label}`)
      }
    }

    const fixtureStateCount = countOccurrences(contractText, "fixtureState:")
    if (fixtureStateCount < REQUIRED_FAMILIES.length) {
      errors.push(
        `Expected at least ${REQUIRED_FAMILIES.length} fixtureState rows, found ${fixtureStateCount}.`,
      )
    }

    const runtimeDisabledCount = countOccurrences(contractText, "runtimeDbReadEnabled: false")
    if (runtimeDisabledCount < 2) {
      errors.push("Expected repeated runtimeDbReadEnabled false markers in adapter mock harness.")
    }
  }

  if (authzText) {
    for (const marker of missingMarkers(authzText, REQUIRED_AUTHZ_MARKERS)) {
      errors.push(`Missing prerequisite authz marker in ${AUTHZ_CONTRACT_PATH}: ${marker}`)
    }

    for (const family of REQUIRED_FAMILIES) {
      if (!authzText.includes(`"${family}"`)) {
        errors.push(`Missing prerequisite authz family row: ${family}`)
      }
    }
  }

  if (queryPlanText) {
    for (const marker of missingMarkers(queryPlanText, REQUIRED_QUERY_PLAN_MARKERS)) {
      errors.push(`Missing prerequisite query-plan marker in ${QUERY_PLAN_CONTRACT_PATH}: ${marker}`)
    }
  }

  for (const doc of REQUIRED_DOCS) {
    try {
      const text = await readText(doc.path)
      for (const marker of missingMarkers(text, doc.markers)) {
        errors.push(`Missing documentation marker in ${doc.path}: ${marker}`)
      }
    } catch (error) {
      errors.push(`Missing documentation file: ${doc.path} (${error.message})`)
    }
  }

  const result = {
    status:
      errors.length === 0
        ? "ready_for_research_owner_read_adapter_mock_harness_use"
        : "blocked",
    taskId: "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
    nextRecommendedTask:
      "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
    mode: "adapter_mock_harness_only_no_runtime_db_read",
    contractPath: CONTRACT_PATH,
    prerequisiteAuthzContractPath: AUTHZ_CONTRACT_PATH,
    prerequisiteQueryPlanContractPath: QUERY_PLAN_CONTRACT_PATH,
    familyCount: REQUIRED_FAMILIES.length,
    requiredFamilies: REQUIRED_FAMILIES,
    harness: {
      consumesBff007AuthzDecisions: contractText.includes(
        "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS",
      ),
      requiresBff007AuthzDecision: contractText.includes("requiresBff007AuthzDecision: true"),
      fixtureOnlyAdapter: true,
      contractEligibleFamilies: CONTRACT_ELIGIBLE_FAMILIES,
      nonExecutableFamilies: NON_EXECUTABLE_FAMILIES,
      fixtureAdapterExercisedOutcome: "fixture_adapter_exercised_no_db",
      blockedOutcome: "blocked_no_adapter_execution",
      derivedOutcome: "derived_projection_no_adapter_execution",
      generatedOutcome: "generated_evidence_metadata_only",
      proposalOutcome: "proposal_only_no_final_write",
      realAdapterExecutionAllowed: false,
      runtimeDbReadEnabled: false,
    },
    safety: {
      mockOnlyAdapterHarness: true,
      realAdapterExecutionAllowed: false,
      runtimeAdapterExecutionAllowed: false,
      runtimeDbReadAllowed: false,
      runtimeDbWriteAllowed: false,
      schemaMigrationAllowed: false,
      migrationApplyAllowed: false,
      seedChangeAllowed: false,
      routeHandlerAllowed: false,
      serverActionWriteAllowed: false,
      publicOutputAllowed: false,
      externalCollaborationAllowed: false,
      externalAgentDatabaseAccessAllowed: false,
      agentFinalWriteAllowed: false,
      externalRegisterable: false,
      launchLevelUpgradeClaimed: false,
    },
    nandaBoundary: {
      affectedSurface: "Research agent proposals",
      protocolStatus: "protected_owner_visible_proposal_only",
      externalRegisterable: false,
      finalWritesRequireHumanApproval: true,
    },
    errors,
    warnings,
  }

  if (args.out) {
    await writeJson(args.out, result)
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (errors.length === 0) {
    console.log("Research owner-read adapter mock harness check passed.")
  } else {
    console.error("Research owner-read adapter mock harness check failed:")
    for (const error of errors) {
      console.error(`- ${error}`)
    }
  }

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
