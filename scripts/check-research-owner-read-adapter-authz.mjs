#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/research-owner-read-adapter-authz.contract.ts"
const QUERY_PLAN_CONTRACT_PATH = "src/lib/contracts/research-owner-read-query-plan.contract.ts"
const DTO_CONTRACT_PATH = "src/lib/contracts/research-owner-read-dto.contract.ts"
const OWNER_READ_DTO_SERVICE_PATH = "src/lib/services/research-owner-read-dto.service.ts"
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

const REQUIRED_CONTRACT_MARKERS = [
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_CONTRACT",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_SUMMARY",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_BFF_PATH",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DENIED_PATTERNS",
  "RESEARCH_OWNER_READ_ADAPTER_AUTHZ_STOP_CONDITIONS",
  "RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT",
  "RESEARCH_OWNER_READ_QUERY_PLAN_ROWS",
  "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
  "adapter_authz_contract_only_no_runtime_db_read",
  "ready_for_research_owner_read_adapter_authz_contract_use",
  "requiresBff006LoaderBoundary: true",
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "adapter authz decision",
  "approved adapter execution decision",
  "owner-scoped query plan",
  "mapper",
  "UI-safe DTO",
  "Client Component interaction",
  "adapterAuthzEligibility",
  "requiredOwnerIdentitySource",
  "requireUser().profileId",
  "ownerScopeProofPath",
  "serviceAuthorizationRule",
  "deniedUnsafePatterns",
  "selectedFieldBoundary",
  "mapperInputBoundary",
  "authorized_rows_or_explicit_unavailable_state",
  "nextImplementationCondition",
  "contract_eligible_after_service_authz",
  "blocked_owner_scope_missing",
  "derived_only",
  "generated_evidence_only",
  "proposal_only_no_final_write",
  "adapterExecutionAllowed: false",
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
  "caller-supplied ownerId",
  "direct threadId-only access",
  "adapter execution before service authorization",
  "raw Prisma payload passthrough",
  "global event/person reads treated as formal owner data",
  "Research agent final write",
  "protected_owner_visible_proposal_only",
  "finalWritesRequireHumanApproval: true",
  "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
]

const REQUIRED_QUERY_PLAN_MARKERS = [
  "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
  "RESEARCH_OWNER_READ_QUERY_PLAN_ROWS",
  "RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT",
  "ownerScopePredicate",
  "selectedFields",
  "runtimeDbReadEnabled: false",
]

const REQUIRED_DTO_MARKERS = [
  "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
  "ResearchOwnerReadDtoFamilyId",
  "ResearchOwnerReadinessStateId",
  "no caller-supplied ownerId",
  "no direct threadId-only access",
]

const REQUIRED_SERVICE_MARKERS = [
  "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
  "RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT",
  "queryPlanLoaderSkeleton",
  "queryPlanLoaderRows",
  "adapterExecutionAllowed: false",
  "runtimeDbReadEnabled: false",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-007 Research Owner Read Adapter Authz Contract Acceptance",
      "src/lib/contracts/research-owner-read-adapter-authz.contract.ts",
      "scripts/check-research-owner-read-adapter-authz.mjs",
      "pnpm research:read-adapter-authz:check",
      "all 11 Research owner-read DTO families",
      "adapter execution eligibility",
      "runtime DB reads disabled",
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
      "src/lib/contracts/research-owner-read-adapter-authz.contract.ts",
      "scripts/check-research-owner-read-adapter-authz.mjs",
      "pnpm research:read-adapter-authz:check",
      "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 158",
      "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
      "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
      "pnpm research:read-adapter-authz:check",
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
      "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
      "research:read-adapter-authz:check",
    ],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
      "Research owner read adapter authz contract",
      "pnpm research:read-adapter-authz:check",
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-adapter-authz:check": "node scripts/check-research-owner-read-adapter-authz.mjs"',
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
  let queryPlanText = ""
  let dtoText = ""
  let serviceText = ""

  try {
    contractText = await readText(CONTRACT_PATH)
  } catch (error) {
    errors.push(`Missing contract file: ${CONTRACT_PATH} (${error.message})`)
  }

  try {
    queryPlanText = await readText(QUERY_PLAN_CONTRACT_PATH)
  } catch (error) {
    errors.push(`Missing query-plan contract file: ${QUERY_PLAN_CONTRACT_PATH} (${error.message})`)
  }

  try {
    dtoText = await readText(DTO_CONTRACT_PATH)
  } catch (error) {
    errors.push(`Missing DTO contract file: ${DTO_CONTRACT_PATH} (${error.message})`)
  }

  try {
    serviceText = await readText(OWNER_READ_DTO_SERVICE_PATH)
  } catch (error) {
    errors.push(`Missing owner-read DTO service file: ${OWNER_READ_DTO_SERVICE_PATH} (${error.message})`)
  }

  if (contractText) {
    for (const marker of missingMarkers(contractText, REQUIRED_CONTRACT_MARKERS)) {
      errors.push(`Missing contract marker in ${CONTRACT_PATH}: ${marker}`)
    }

    for (const family of REQUIRED_FAMILIES) {
      if (!contractText.includes(`"${family}"`)) {
        errors.push(`Missing adapter-authz family decision basis: ${family}`)
      }
    }

    for (const forbidden of FORBIDDEN_CONTRACT_PATTERNS) {
      if (forbidden.pattern.test(contractText)) {
        errors.push(`Forbidden runtime marker in ${CONTRACT_PATH}: ${forbidden.label}`)
      }
    }

    const eligibilityCount = countOccurrences(contractText, "adapterAuthzEligibility:")
    if (eligibilityCount < REQUIRED_FAMILIES.length) {
      errors.push(
        `Expected at least ${REQUIRED_FAMILIES.length} adapterAuthzEligibility rows, found ${eligibilityCount}.`,
      )
    }

    const ownerScopeProofCount = countOccurrences(contractText, "ownerScopeProofPath:")
    if (ownerScopeProofCount < REQUIRED_FAMILIES.length) {
      errors.push(
        `Expected at least ${REQUIRED_FAMILIES.length} ownerScopeProofPath rows, found ${ownerScopeProofCount}.`,
      )
    }

    const runtimeDisabledCount = countOccurrences(contractText, "runtimeDbReadEnabled: false")
    if (runtimeDisabledCount < 2) {
      errors.push("Expected repeated runtimeDbReadEnabled false markers in adapter authz contract.")
    }
  }

  if (queryPlanText) {
    for (const marker of missingMarkers(queryPlanText, REQUIRED_QUERY_PLAN_MARKERS)) {
      errors.push(`Missing prerequisite query-plan marker in ${QUERY_PLAN_CONTRACT_PATH}: ${marker}`)
    }

    for (const family of REQUIRED_FAMILIES) {
      if (!queryPlanText.includes(`id: "${family}"`)) {
        errors.push(`Missing prerequisite query-plan family row: ${family}`)
      }
    }
  }

  if (dtoText) {
    for (const marker of missingMarkers(dtoText, REQUIRED_DTO_MARKERS)) {
      errors.push(`Missing prerequisite DTO marker in ${DTO_CONTRACT_PATH}: ${marker}`)
    }
  }

  if (serviceText) {
    for (const marker of missingMarkers(serviceText, REQUIRED_SERVICE_MARKERS)) {
      errors.push(`Missing prerequisite service-loader marker in ${OWNER_READ_DTO_SERVICE_PATH}: ${marker}`)
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
        ? "ready_for_research_owner_read_adapter_authz_contract_use"
        : "blocked",
    taskId: "RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT",
    nextRecommendedTask: "RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS",
    mode: "adapter_authz_contract_only_no_runtime_db_read",
    contractPath: CONTRACT_PATH,
    queryPlanContractPath: QUERY_PLAN_CONTRACT_PATH,
    servicePath: OWNER_READ_DTO_SERVICE_PATH,
    familyCount: REQUIRED_FAMILIES.length,
    requiredFamilies: REQUIRED_FAMILIES,
    adapterAuthz: {
      consumesQueryPlanContract: contractText.includes("RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT"),
      consumesQueryPlanRows: contractText.includes("RESEARCH_OWNER_READ_QUERY_PLAN_ROWS"),
      requiresBff006LoaderBoundary: contractText.includes("requiresBff006LoaderBoundary: true"),
      contractEligibleFamilies: [
        "issues",
        "sources",
        "concepts",
        "writing-projects",
        "writing-sections",
      ],
      blockedOwnerScopeFamilies: ["events", "people"],
      derivedOnlyFamilies: ["typed-links", "graph-projections"],
      generatedEvidenceFamilies: ["readiness-evidence"],
      proposalOnlyFamilies: ["agent-proposals"],
      adapterExecutionAllowed: false,
      runtimeDbReadEnabled: false,
    },
    safety: {
      adapterExecutionAllowed: false,
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
    console.log("Research owner-read adapter authz contract check passed.")
  } else {
    console.error("Research owner-read adapter authz contract check failed:")
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
