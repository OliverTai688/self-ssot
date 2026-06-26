#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/research-owner-read-query-plan.contract.ts"
const DTO_CONTRACT_PATH = "src/lib/contracts/research-owner-read-dto.contract.ts"
const MODEL_CONTRACT_PATH = "src/lib/contracts/research-model-reconciliation.contract.ts"
const READINESS_CONTRACT_PATH = "src/lib/contracts/research-formal-readiness.contract.ts"
const OWNER_READ_DTO_SERVICE_PATH = "src/lib/services/research-owner-read-dto.service.ts"
const READINESS_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
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

const REQUIRED_TARGET_DTOS = [
  "ResearchIssueReadDto",
  "ResearchSourceReadDto",
  "ResearchConceptReadDto",
  "ResearchWritingProjectReadDto",
  "ResearchWritingSectionReadDto",
  "ResearchEventReadDto",
  "ResearchPersonReadDto",
  "ResearchLinkReadDto",
  "ResearchGraphProjectionDto",
  "ResearchReadinessEvidenceDto",
  "ResearchAgentProposalReadDto",
]

const REQUIRED_MODEL_MARKERS = [
  "ResearchThread",
  "ResearchSource",
  "ResearchConcept",
  "ResearchWritingProject",
  "ResearchWritingSection",
  "ResearchEvent",
  "AcademicPerson",
  "GeneratedEvidence",
  "none",
]

const REQUIRED_CONTRACT_MARKERS = [
  "RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT",
  "RESEARCH_OWNER_READ_QUERY_PLAN_SUMMARY",
  "RESEARCH_OWNER_READ_QUERY_PLAN_BFF_PATH",
  "RESEARCH_OWNER_READ_QUERY_PLAN_ROWS",
  "RESEARCH_OWNER_READ_QUERY_PLAN_FORBIDDEN_PATTERNS",
  "RESEARCH_OWNER_READ_QUERY_PLAN_ADAPTER_STOP_CONDITIONS",
  "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
  "query_plan_contract_only_no_runtime_db_read",
  "ready_for_owner_read_query_plan_contract_use",
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "approved adapter",
  "owner-scoped query",
  "mapper",
  "UI-safe DTO",
  "Client Component interaction",
  "ownerScopePredicate",
  "relationPath",
  "selectedFields",
  "stableSort",
  "defaultLimit",
  "mapperInput",
  "authorized_rows_or_explicit_unavailable_state",
  "auditRef",
  "rejectedUnsafePatterns",
  "no caller-supplied ownerId",
  "no direct threadId-only access",
  "no raw Prisma payload passthrough",
  "blocked_owner_scope_missing",
  "derived_projection_only",
  "generated_evidence_only",
  "proposal_only",
  "global event/person reads treated as formal owner data",
  "source read by threadId without thread ownership authorization",
  "section read by projectId alone",
  "hidden mock-to-formal claim",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
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
  "externalCollaborationAllowed: false",
  "externalAgentDatabaseAccessAllowed: false",
  "agentFinalWriteAllowed: false",
  "externalRegisterable: false",
  "hiddenMockToFormalClaimAllowed: false",
  "launchLevelUpgradeClaimed: false",
  "protected_owner_visible_proposal_only",
  "finalWritesRequireHumanApproval: true",
  "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
]

const REQUIRED_SERVICE_LOADER_MARKERS = [
  "RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT",
  "RESEARCH_OWNER_READ_QUERY_PLAN_SUMMARY",
  "ResearchOwnerReadQueryPlanServiceLoaderSkeleton",
  "ResearchOwnerReadQueryPlanLoaderRow",
  "RESEARCH_OWNER_READ_QUERY_PLAN_SERVICE_LOADER_SKELETON",
  "queryPlanLoaderSkeleton",
  "queryPlanLoaderRows",
  "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
  "owner_read_query_plan_service_loader_skeleton_ready_no_runtime_db_read",
  "query_plan_service_loader_skeleton_no_runtime_db_read",
  "consumesQueryPlanContract: true",
  "serviceAuthorizationRequiredBeforeAdapter: true",
  "mapperRequiresAuthorizedRows: true",
  "selectedFieldBoundaryVisible: true",
  "rejectedUnsafePatternsVisible: true",
  "adapterExecutionAllowed: false",
  "runtimeRequireUserCallInThisSlice: false",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
  "publicOutputEnabled: false",
  "externalRegisterable: false",
  "selectedFieldBoundary",
  "nextSafeLoaderAction",
  "ownerScopePredicate",
  "rejectedUnsafePatterns",
]

const REQUIRED_READINESS_PAGE_MARKERS = [
  "Owner read query-plan service loader skeleton",
  "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
  "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
  "query_plan_service_loader_skeleton_no_runtime_db_read",
  "ownerReadSurface.queryPlanLoaderSkeleton",
  "ownerReadSurface.queryPlanLoaderRows",
  "Adapter kind",
  "Owner-scope predicate",
  "Selected-field boundary",
  "Rejected unsafe patterns",
  "Next safe loader action",
  "adapterExecutionAllowed:",
]

const REQUIRED_DOCS = [
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-005 Research Owner Read Query Plan Contract Acceptance",
      "RESEARCH-BFF-006 Research Owner Read Service Loader Skeleton Acceptance",
      "src/lib/contracts/research-owner-read-query-plan.contract.ts",
      "src/lib/services/research-owner-read-dto.service.ts",
      "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
      "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
      "all 11 Research owner-read DTO families",
      "owner-scope predicate requirements",
      "minimal select/relation boundaries",
      "scripts/check-research-owner-read-query-plan.mjs",
      "pnpm research:read-query-plan:check",
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
      "src/lib/contracts/research-owner-read-query-plan.contract.ts",
      "src/lib/services/research-owner-read-dto.service.ts",
      "scripts/check-research-owner-read-query-plan.mjs",
      "pnpm research:read-query-plan:check",
      "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
    ],
  },
  {
    path: SPRINT_DOC,
    markers: [
      "Loop 154",
      "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
      "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
      "pnpm research:read-query-plan:check",
    ],
  },
  {
    path: TASKS_DOC,
    markers: [
      "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
      "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
      "research:read-query-plan:check",
    ],
  },
  {
    path: COMPLETED_LOG,
    markers: [
      "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
      "Research owner read query plan contract",
      "pnpm research:read-query-plan:check",
    ],
  },
  {
    path: PACKAGE_JSON,
    markers: [
      '"research:read-query-plan:check": "node scripts/check-research-owner-read-query-plan.mjs"',
    ],
  },
]

const REQUIRED_PRIOR_MARKERS = [
  {
    path: DTO_CONTRACT_PATH,
    markers: ["RESEARCH_OWNER_READ_DTO_CONTRACT", "ResearchOwnerReadDtoFamilyId"],
  },
  {
    path: MODEL_CONTRACT_PATH,
    markers: ["RESEARCH-MODEL-001-RESEARCH-ISSUE-THREAD-RECONCILIATION", "ResearchThread"],
  },
  {
    path: READINESS_CONTRACT_PATH,
    markers: ["RESEARCH-OPS-001-RESEARCH-FORMAL-READINESS-BFF", "futureBffPath"],
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
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      args.out = argv[index + 1] ?? null
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
  const target = resolve(process.cwd(), path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify(data, null, 2)}\n`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const errors = []
  const warnings = []

  let contractText = ""
  let serviceText = ""
  let pageText = ""
  try {
    contractText = await readText(CONTRACT_PATH)
  } catch (error) {
    errors.push(`Missing contract file: ${CONTRACT_PATH} (${error.message})`)
  }
  try {
    serviceText = await readText(OWNER_READ_DTO_SERVICE_PATH)
  } catch (error) {
    errors.push(`Missing service file: ${OWNER_READ_DTO_SERVICE_PATH} (${error.message})`)
  }
  try {
    pageText = await readText(READINESS_PAGE_PATH)
  } catch (error) {
    errors.push(`Missing readiness page file: ${READINESS_PAGE_PATH} (${error.message})`)
  }

  if (contractText) {
    const missingContractMarkers = missingMarkers(contractText, REQUIRED_CONTRACT_MARKERS)
    for (const marker of missingContractMarkers) {
      errors.push(`Missing contract marker in ${CONTRACT_PATH}: ${marker}`)
    }

    for (const family of REQUIRED_FAMILIES) {
      if (!contractText.includes(`id: "${family}"`)) {
        errors.push(`Missing query-plan family row: ${family}`)
      }
    }

    for (const dtoName of REQUIRED_TARGET_DTOS) {
      if (!contractText.includes(dtoName)) {
        errors.push(`Missing target DTO marker: ${dtoName}`)
      }
    }

    for (const model of REQUIRED_MODEL_MARKERS) {
      if (!contractText.includes(`"${model}"`)) {
        errors.push(`Missing model candidate marker: ${model}`)
      }
    }

    for (const forbidden of FORBIDDEN_CONTRACT_PATTERNS) {
      if (forbidden.pattern.test(contractText)) {
        errors.push(`Forbidden runtime marker in ${CONTRACT_PATH}: ${forbidden.label}`)
      }
    }

    const rowCount = countOccurrences(contractText, "queryPlanId:")
    if (rowCount < REQUIRED_FAMILIES.length) {
      errors.push(`Expected at least ${REQUIRED_FAMILIES.length} queryPlanId rows, found ${rowCount}.`)
    }

    const ownerScopePredicateCount = countOccurrences(contractText, "ownerScopePredicate:")
    if (ownerScopePredicateCount < REQUIRED_FAMILIES.length) {
      errors.push(
        `Expected at least ${REQUIRED_FAMILIES.length} ownerScopePredicate rows, found ${ownerScopePredicateCount}.`,
      )
    }

    const selectedFieldsCount = countOccurrences(contractText, "selectedFields:")
    if (selectedFieldsCount < REQUIRED_FAMILIES.length) {
      errors.push(
        `Expected at least ${REQUIRED_FAMILIES.length} selectedFields rows, found ${selectedFieldsCount}.`,
      )
    }

    const runtimeDisabledCount = countOccurrences(contractText, "runtimeDbReadEnabled: false")
    if (runtimeDisabledCount < REQUIRED_FAMILIES.length) {
      errors.push(
        `Expected at least ${REQUIRED_FAMILIES.length} runtimeDbReadEnabled false markers, found ${runtimeDisabledCount}.`,
      )
    }
  }

  if (serviceText) {
    for (const marker of missingMarkers(serviceText, REQUIRED_SERVICE_LOADER_MARKERS)) {
      errors.push(`Missing service-loader marker in ${OWNER_READ_DTO_SERVICE_PATH}: ${marker}`)
    }

    for (const forbidden of FORBIDDEN_CONTRACT_PATTERNS) {
      if (forbidden.pattern.test(serviceText)) {
        errors.push(`Forbidden runtime marker in ${OWNER_READ_DTO_SERVICE_PATH}: ${forbidden.label}`)
      }
    }
  }

  if (pageText) {
    for (const marker of missingMarkers(pageText, REQUIRED_READINESS_PAGE_MARKERS)) {
      errors.push(`Missing readiness page marker in ${READINESS_PAGE_PATH}: ${marker}`)
    }

    for (const forbidden of FORBIDDEN_CONTRACT_PATTERNS) {
      if (forbidden.pattern.test(pageText)) {
        errors.push(`Forbidden runtime marker in ${READINESS_PAGE_PATH}: ${forbidden.label}`)
      }
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

  for (const doc of REQUIRED_PRIOR_MARKERS) {
    try {
      const text = await readText(doc.path)
      for (const marker of missingMarkers(text, doc.markers)) {
        errors.push(`Missing prerequisite marker in ${doc.path}: ${marker}`)
      }
    } catch (error) {
      errors.push(`Missing prerequisite file: ${doc.path} (${error.message})`)
    }
  }

  const result = {
    status:
      errors.length === 0
        ? "ready_for_owner_read_query_plan_service_loader_skeleton"
        : "blocked",
    taskId: "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
    contractTaskId: "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
    mode: "query_plan_service_loader_skeleton_no_runtime_db_read",
    contractPath: CONTRACT_PATH,
    servicePath: OWNER_READ_DTO_SERVICE_PATH,
    readinessPagePath: READINESS_PAGE_PATH,
    familyCount: REQUIRED_FAMILIES.length,
    requiredFamilies: REQUIRED_FAMILIES,
    serviceLoader: {
      consumesQueryPlanContract: serviceText.includes("RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT"),
      rowSurfacePresent: serviceText.includes("queryPlanLoaderRows"),
      pageSurfacePresent: pageText.includes("ownerReadSurface.queryPlanLoaderRows"),
      adapterExecutionAllowed: false,
      runtimeDbReadEnabled: false,
    },
    safety: {
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
    nextRecommendedTask: "LOOP-157-RESEARCH-POST-LOADER-GAP-REVIEW",
    errors,
    warnings,
  }

  if (args.out) {
    await writeJson(args.out, result)
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else if (errors.length === 0) {
    console.log("Research owner-read query-plan contract check passed.")
  } else {
    console.error("Research owner-read query-plan contract check failed:")
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
