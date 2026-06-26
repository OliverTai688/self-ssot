#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const CONTRACT_PATH = "src/lib/contracts/research-owner-read-dto.contract.ts"
const MODEL_CONTRACT_PATH = "src/lib/contracts/research-model-reconciliation.contract.ts"
const FORMAL_READINESS_CONTRACT_PATH = "src/lib/contracts/research-formal-readiness.contract.ts"
const OWNER_READ_DTO_SERVICE_PATH = "src/lib/services/research-owner-read-dto.service.ts"
const READINESS_PAGE_PATH = "src/app/(dashboard)/research/readiness/page.tsx"
const RESEARCH_HUB_PAGE_PATH = "src/app/(dashboard)/research/page.tsx"
const AUTH_SERVICE_PATH = "src/lib/services/auth.service.ts"
const PROJECT_SERVICE_PATH = "src/lib/services/project.service.ts"
const DBS_003_DOC = "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md"
const ACC_002_DOC = "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
const BACKLOG_DOC = "docs/05_execution-plans/PLN-060_task-backlog.md"
const SPRINT_DOC = "docs/05_execution-plans/PLN-061_current-sprint.md"
const TASKS_DOC = "tasks.md"
const COMPLETED_LOG = "docs/06_audits-and-reports/RPT-007_completed-log.md"
const PACKAGE_JSON = "package.json"

const REQUIRED_READ_FAMILIES = [
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

const REQUIRED_DTO_NAMES = [
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

const REQUIRED_CONTRACT_MARKERS = [
  "RESEARCH_OWNER_READ_DTO_CONTRACT",
  "RESEARCH_OWNER_READ_DTO_SUMMARY",
  "RESEARCH_OWNER_READ_DTO_BFF_PATH",
  "RESEARCH_OWNER_READ_DTO_FAMILIES",
  "RESEARCH_OWNER_READ_AUTHORIZATION_INVARIANTS",
  "RESEARCH_OWNER_READ_EMPTY_STATES",
  "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
  "contract_only_no_runtime_db_read",
  "ready_for_owner_scoped_research_read_dto_contract_use",
  "protected_owner_research_read",
  "Server Component loader",
  "requireUser()",
  "Research service authorization",
  "Prisma or approved adapter",
  "owner-scoped read query",
  "mapper",
  "UI-safe DTO",
  "Client Component interaction",
  "owner profile id from requireUser(); no caller-supplied ownerId",
  "No source read may use direct threadId-only access without service ownership authorization.",
  "no caller-supplied ownerId",
  "no direct threadId-only access",
  "no raw model payload or private identifier passthrough",
  "empty-no-research-rows",
  "model-ready-read-unavailable",
  "partial-transitional-data",
  "formal-read-disabled",
  "proposal-only-agent-output",
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
  "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE",
]

const REQUIRED_SERVICE_MARKERS = [
  "server-only",
  "RESEARCH_OWNER_READ_DTO_CONTRACT",
  "RESEARCH_OWNER_READ_DTO_SUMMARY",
  "buildResearchOwnerReadDtoSurface",
  "RESEARCH_OWNER_READ_DTO_SERVICE_SURFACE",
  "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE",
  "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON",
  "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE",
  "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
  "RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT",
  "RESEARCH_OWNER_READ_QUERY_PLAN_SUMMARY",
  "service_surface_skeleton_ready_no_runtime_db_read",
  "owner_read_dto_authz_skeleton_ready_no_runtime_db_read",
  "owner_read_dto_mapper_empty_state_skeleton_ready_no_runtime_db_read",
  "owner_read_query_plan_service_loader_skeleton_ready_no_runtime_db_read",
  "protected_surface_skeleton_no_runtime_db_read",
  "require_user_shaped_service_authorization_skeleton",
  "mapper_empty_state_skeleton_no_runtime_db_read",
  "query_plan_service_loader_skeleton_no_runtime_db_read",
  "ownerIdentitySource: \"requireUser()\"",
  "runtimeRequireUserCallInThisSlice: false",
  "callerSuppliedOwnerIdAllowed: false",
  "directThreadIdOnlyAccessAllowed: false",
  "serviceAuthorizationRequiredBeforeAdapter: true",
  "mapperRequiresAuthorizedRows: true",
  "consumesQueryPlanContract: true",
  "selectedFieldBoundaryVisible: true",
  "rejectedUnsafePatternsVisible: true",
  "adapterExecutionAllowed: false",
  "callerSuppliedOwnerIdDecision: \"refused\"",
  "directThreadIdAccessDecision: \"refused_without_owner_scope\"",
  "runtimeDbReadEnabled: false",
  "runtimeDbWriteEnabled: false",
  "routeHandlerEnabled: false",
  "serverActionWriteEnabled: false",
  "publicOutputEnabled: false",
  "externalCollaborationEnabled: false",
  "externalRegisterable: false",
  "launchLevelUpgradeClaimed: false",
  "readFamilyRows",
  "emptyStateRows",
  "authorizationRows",
  "authorizationSkeleton",
  "authorizationSkeletonRows",
  "permissionDecisionRows",
  "mapperResponseSkeleton",
  "mapperResponseRows",
  "responseStateRows",
  "queryPlanLoaderSkeleton",
  "queryPlanLoaderRows",
  "mapperInput: \"authorized_rows_or_explicit_unavailable_state\"",
  "mapperOutput: \"ui_safe_research_owner_read_response_dto\"",
  "emptyStateFallbackPolicy: \"explicit_state_only_no_mock_fallback\"",
  "formalMockFallbackAllowed: false",
  "authorized_empty",
  "model_ready_unavailable",
  "partial_transitional_unavailable",
  "formal_read_disabled",
  "proposal_only",
  "protected_ui_state_only_no_route_response",
  "UI-safe DTO",
  "no caller-supplied ownerId",
  "no direct threadId-only access",
  "direct threadId-only read",
  "protected-owner visible proposal-only",
]

const REQUIRED_READINESS_PAGE_MARKERS = [
  "buildResearchOwnerReadDtoSurface",
  "Owner read DTO service skeleton",
  "Owner read authorization skeleton",
  "Owner read DTO mapper and empty-state response",
  "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE",
  "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON",
  "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE",
  "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
  "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
  "UI-safe DTO boundary",
  "No runtime Research DB read",
  "no caller-supplied ownerId",
  "no direct threadId-only access",
  "requireUser()-shaped service authorization",
  "direct threadId access refusal",
  "serviceAuthorizationRequiredBeforeAdapter",
  "protected-owner visible proposal-only",
  "mapper_empty_state_skeleton_no_runtime_db_read",
  "query_plan_service_loader_skeleton_no_runtime_db_read",
  "ui_safe_research_owner_read_response_dto",
  "explicit_state_only_no_mock_fallback",
  "No mock fallback in formal owner-read responses",
  "Owner read query-plan service loader skeleton",
  "Adapter kind",
  "Owner-scope predicate",
  "Selected-field boundary",
  "Rejected unsafe patterns",
  "Next safe loader action",
  "ownerReadSurface.readFamilyRows",
  "ownerReadSurface.emptyStateRows",
  "ownerReadSurface.authorizationRows",
  "ownerReadSurface.authorizationSkeletonRows",
  "ownerReadSurface.permissionDecisionRows",
  "ownerReadSurface.mapperResponseRows",
  "ownerReadSurface.responseStateRows",
  "ownerReadSurface.queryPlanLoaderRows",
]

const REQUIRED_RESEARCH_HUB_MARKERS = [
  "href=\"/research/readiness\"",
  "Research formal readiness",
  "Owner read DTO skeleton",
]

const REQUIRED_DOCS = [
  {
    path: DBS_003_DOC,
    markers: [
      "RESEARCH_OWNER_READ_DTO_CONTRACT",
      "RESEARCH-BFF-001",
      "owner-scoped Research read DTO contract",
      "No migration is authorized by this decision update",
    ],
  },
  {
    path: ACC_002_DOC,
    markers: [
      "RESEARCH-BFF-001 Research Owner-Scoped Read DTO Contract Acceptance",
      "RESEARCH-BFF-002 Research Owner Read DTO Service Surface Acceptance",
      "RESEARCH-BFF-003 Research Owner Read DTO Authorization Skeleton Acceptance",
      "RESEARCH-BFF-004 Research Owner Read DTO Mapper Empty-State Response Acceptance",
      "RESEARCH-BFF-006 Research Owner Read Service Loader Skeleton Acceptance",
      "src/lib/contracts/research-owner-read-dto.contract.ts",
      "src/lib/services/research-owner-read-dto.service.ts",
      "scripts/check-research-owner-read-dto.mjs",
      "scripts/check-research-owner-read-query-plan.mjs",
      "pnpm research:read-dto:check",
      "pnpm research:read-query-plan:check",
      "no caller-supplied `ownerId`",
      "direct `threadId`-only access",
    ],
  },
  {
    path: BACKLOG_DOC,
    markers: [
      "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
      "src/lib/contracts/research-owner-read-dto.contract.ts",
      "src/lib/services/research-owner-read-dto.service.ts",
      "scripts/check-research-owner-read-dto.mjs",
      "pnpm research:read-dto:check",
      "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE",
      "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON",
      "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE",
      "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
    ],
  },
  {
    path: SPRINT_DOC,
    markers: ["Loop 156", "Loop 152", "Loop 151", "Loop 149", "Loop 148", "RESEARCH-BFF-001", "RESEARCH-BFF-002", "RESEARCH-BFF-003", "RESEARCH-BFF-004", "RESEARCH-BFF-006"],
  },
  {
    path: TASKS_DOC,
    markers: ["RESEARCH-BFF-001", "RESEARCH-BFF-002", "RESEARCH-BFF-003", "RESEARCH-BFF-004", "RESEARCH-BFF-006", "Loop 156", "research:read-dto:check"],
  },
  {
    path: COMPLETED_LOG,
    markers: ["RESEARCH-BFF-001", "RESEARCH-BFF-002", "RESEARCH-BFF-003", "RESEARCH-BFF-004", "RESEARCH-BFF-006", "owner-scoped Research read DTO contract"],
  },
  {
    path: PACKAGE_JSON,
    markers: ['"research:read-dto:check": "node scripts/check-research-owner-read-dto.mjs"'],
  },
]

const FORBIDDEN_CONTRACT_PATTERNS = [
  { label: "Prisma client import marker", pattern: /@prisma\/client/ },
  { label: "database client import marker", pattern: /from\s+["']@\/lib\/db["']/ },
  { label: "database client call marker", pattern: /\bdb\./ },
  { label: "environment read marker", pattern: /\bprocess\.env\b/ },
  { label: "provider client marker", pattern: /\bcreateClient\s*\(/ },
  { label: "network call marker", pattern: /\bfetch\s*\(/ },
  { label: "database URL marker", pattern: /\bDATABASE_URL\b/ },
  { label: "privileged provider env marker", pattern: /\bSUPABASE_/ },
  { label: "request cookie read marker", pattern: /\bcookies\s*\(/ },
  { label: "request header read marker", pattern: /\bheaders\s*\(/ },
  { label: "route handler request marker", pattern: /\bNextRequest\b/ },
  { label: "route handler response marker", pattern: /\bNextResponse\b/ },
  { label: "server action marker", pattern: /["']use server["']/ },
]

const FORBIDDEN_TRUE_MARKERS = [
  "runtimeDbReadAllowed: true",
  "runtimeDbWriteAllowed: true",
  "schemaMigrationAllowed: true",
  "migrationApplyAllowed: true",
  "seedChangeAllowed: true",
  "routeHandlerAllowed: true",
  "serverActionWriteAllowed: true",
  "connectorRuntimeAllowed: true",
  "providerRuntimeAllowed: true",
  "publicOutputAllowed: true",
  "externalCollaborationAllowed: true",
  "externalAgentDatabaseAccessAllowed: true",
  "agentFinalWriteAllowed: true",
  "externalRegisterable: true",
  "hiddenMockToFormalClaimAllowed: true",
  "launchLevelUpgradeClaimed: true",
]

const FORBIDDEN_SERVICE_TRUE_MARKERS = [
  ...FORBIDDEN_TRUE_MARKERS,
  "runtimeDbReadEnabled: true",
  "runtimeDbWriteEnabled: true",
  "routeHandlerEnabled: true",
  "serverActionWriteEnabled: true",
  "publicOutputEnabled: true",
  "externalCollaborationEnabled: true",
]

function parseArgs(argv) {
  const args = { json: false, out: null, help: false }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log("Validate the Personal OS Research owner-scoped read DTO contract")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm research:read-dto:check")
  console.log("  pnpm research:read-dto:check -- --json")
  console.log("  pnpm research:read-dto:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json")
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

async function readText(relativePath) {
  return readFile(repoPath(relativePath), "utf8")
}

async function exists(relativePath) {
  try {
    await readText(relativePath)
    return true
  } catch {
    return false
  }
}

function lineFor(contents, token) {
  const lines = contents.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(token))
  return index === -1 ? null : index + 1
}

function addIssue(list, code, message, path, line = null) {
  list.push({ code, message, path, line })
}

function validateMarkers(contents, markers, path, errors) {
  for (const marker of markers) {
    if (!contents.includes(marker)) {
      addIssue(errors, "REQUIRED_MARKER_MISSING", `Missing marker: ${marker}`, path)
    }
  }
}

function validateReadFamilies(contractSource, errors) {
  for (const family of REQUIRED_READ_FAMILIES) {
    if (!contractSource.includes(`id: "${family}"`)) {
      addIssue(errors, "READ_FAMILY_MISSING", `Missing owner-read DTO family: ${family}`, CONTRACT_PATH)
    }
  }
}

function validateDtoNames(contractSource, errors) {
  for (const dtoName of REQUIRED_DTO_NAMES) {
    if (!contractSource.includes(dtoName)) {
      addIssue(errors, "READ_DTO_NAME_MISSING", `Missing DTO name: ${dtoName}`, CONTRACT_PATH)
    }
  }
}

function validateForbiddenRuntimeMarkers(source, path, errors, trueMarkers = FORBIDDEN_TRUE_MARKERS) {
  for (const item of FORBIDDEN_CONTRACT_PATTERNS) {
    const match = source.match(item.pattern)
    if (match) {
      addIssue(
        errors,
        "FORBIDDEN_RUNTIME_MARKER",
        `Source contains ${item.label}.`,
        path,
        lineFor(source, match[0])
      )
    }
  }

  for (const marker of trueMarkers) {
    if (source.includes(marker)) {
      addIssue(errors, "FORBIDDEN_TRUE_SAFETY_MARKER", `Forbidden true marker: ${marker}`, path)
    }
  }
}

async function validateDocs(errors) {
  for (const doc of REQUIRED_DOCS) {
    if (!(await exists(doc.path))) {
      addIssue(errors, "REFERENCED_DOC_MISSING", `Referenced document is missing: ${doc.path}`, doc.path)
      continue
    }

    const contents = await readText(doc.path)
    validateMarkers(contents, doc.markers, doc.path, errors)
  }
}

function validateSourceBoundaryMarkers(sources, errors) {
  validateMarkers(sources.authService, ["export async function requireUser()"], AUTH_SERVICE_PATH, errors)
  validateMarkers(sources.projectService, ["assertCanAccessProject", "UnauthorizedError"], PROJECT_SERVICE_PATH, errors)
  validateMarkers(
    sources.modelContract,
    [
      "RESEARCH_MODEL_RECONCILIATION_CONTRACT",
      "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
      "futureOwnerScopedBffReadDtoPath",
    ],
    MODEL_CONTRACT_PATH,
    errors
  )
  validateMarkers(
    sources.formalReadinessContract,
    [
      "RESEARCH_FORMAL_READINESS_CONTRACT",
      "Server Component loader",
      "requireUser()",
      "Research service authorization",
      "UI-safe DTO",
    ],
    FORMAL_READINESS_CONTRACT_PATH,
    errors
  )
}

async function buildProof() {
  const errors = []
  const contractSource = await readText(CONTRACT_PATH)
  const sources = {
    authService: await readText(AUTH_SERVICE_PATH),
    projectService: await readText(PROJECT_SERVICE_PATH),
    modelContract: await readText(MODEL_CONTRACT_PATH),
    formalReadinessContract: await readText(FORMAL_READINESS_CONTRACT_PATH),
    ownerReadDtoService: await readText(OWNER_READ_DTO_SERVICE_PATH),
    readinessPage: await readText(READINESS_PAGE_PATH),
    researchHubPage: await readText(RESEARCH_HUB_PAGE_PATH),
  }

  validateMarkers(contractSource, REQUIRED_CONTRACT_MARKERS, CONTRACT_PATH, errors)
  validateReadFamilies(contractSource, errors)
  validateDtoNames(contractSource, errors)
  validateForbiddenRuntimeMarkers(contractSource, CONTRACT_PATH, errors)
  validateMarkers(sources.ownerReadDtoService, REQUIRED_SERVICE_MARKERS, OWNER_READ_DTO_SERVICE_PATH, errors)
  validateForbiddenRuntimeMarkers(
    sources.ownerReadDtoService,
    OWNER_READ_DTO_SERVICE_PATH,
    errors,
    FORBIDDEN_SERVICE_TRUE_MARKERS
  )
  validateMarkers(sources.readinessPage, REQUIRED_READINESS_PAGE_MARKERS, READINESS_PAGE_PATH, errors)
  validateForbiddenRuntimeMarkers(sources.readinessPage, READINESS_PAGE_PATH, errors)
  validateMarkers(sources.researchHubPage, REQUIRED_RESEARCH_HUB_MARKERS, RESEARCH_HUB_PAGE_PATH, errors)
  validateSourceBoundaryMarkers(sources, errors)
  await validateDocs(errors)

  const proof = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    command: "pnpm research:read-dto:check",
    taskId: "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE",
    serviceLoaderTaskId: "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
    authorizationTaskId: "RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON",
    serviceSurfaceTaskId: "RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE",
    contractTaskId: "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT",
    status:
      errors.length === 0
        ? "ready_for_owner_scoped_research_read_dto_mapper_empty_state_response"
        : "blocked",
    contract: {
      path: CONTRACT_PATH,
      mode: "contract_only_no_runtime_db_read",
      readFamilyCount: REQUIRED_READ_FAMILIES.length,
      dtoNameCount: REQUIRED_DTO_NAMES.length,
      futureBffPathPresent:
        contractSource.includes("Server Component loader") &&
        contractSource.includes("requireUser()") &&
        contractSource.includes("Research service authorization") &&
        contractSource.includes("Prisma or approved adapter") &&
        contractSource.includes("owner-scoped read query") &&
        contractSource.includes("mapper") &&
        contractSource.includes("UI-safe DTO") &&
        contractSource.includes("Client Component interaction"),
      ownerIdentityFromRequireUser: contractSource.includes("no caller-supplied ownerId"),
      directThreadOnlyAccessBlocked: contractSource.includes("no direct threadId-only access"),
      emptyStatesPresent: [
        "empty-no-research-rows",
        "model-ready-read-unavailable",
        "partial-transitional-data",
        "formal-read-disabled",
        "proposal-only-agent-output",
      ].every((marker) => contractSource.includes(marker)),
      nandaProposalOnly:
        contractSource.includes("Research agent proposals") &&
        contractSource.includes("protected_owner_visible_proposal_only") &&
        contractSource.includes("externalRegisterable: false"),
    },
    serviceSurface: {
      path: OWNER_READ_DTO_SERVICE_PATH,
      pagePath: READINESS_PAGE_PATH,
      hubPath: RESEARCH_HUB_PAGE_PATH,
      status: sources.ownerReadDtoService.includes(
        "service_surface_skeleton_ready_no_runtime_db_read"
      ),
      mode: sources.ownerReadDtoService.includes("protected_surface_skeleton_no_runtime_db_read"),
      serverOnly: sources.ownerReadDtoService.includes("server-only"),
      consumesContract:
        sources.ownerReadDtoService.includes("RESEARCH_OWNER_READ_DTO_CONTRACT") &&
        sources.ownerReadDtoService.includes("RESEARCH_OWNER_READ_DTO_SUMMARY"),
      ownerIdentityReserved:
        sources.ownerReadDtoService.includes("ownerIdentitySource: \"requireUser()\"") &&
        sources.ownerReadDtoService.includes("runtimeRequireUserCallInThisSlice: false"),
      directRuntimeReadsBlocked:
        sources.ownerReadDtoService.includes("runtimeDbReadEnabled: false") &&
        sources.ownerReadDtoService.includes("runtimeDbWriteEnabled: false"),
      routeAndActionBlocked:
        sources.ownerReadDtoService.includes("routeHandlerEnabled: false") &&
        sources.ownerReadDtoService.includes("serverActionWriteEnabled: false"),
      publicExternalBlocked:
        sources.ownerReadDtoService.includes("publicOutputEnabled: false") &&
        sources.ownerReadDtoService.includes("externalCollaborationEnabled: false") &&
        sources.ownerReadDtoService.includes("externalRegisterable: false"),
      readinessPageVisible:
        sources.readinessPage.includes("Owner read DTO service skeleton") &&
        sources.readinessPage.includes("No runtime Research DB read") &&
        sources.readinessPage.includes("UI-safe DTO boundary"),
      hubEntryVisible:
        sources.researchHubPage.includes("Owner read DTO skeleton") &&
        sources.researchHubPage.includes("href=\"/research/readiness\""),
      readFamilyRowsVisible: sources.readinessPage.includes("ownerReadSurface.readFamilyRows"),
      emptyStateRowsVisible: sources.readinessPage.includes("ownerReadSurface.emptyStateRows"),
      authorizationRowsVisible: sources.readinessPage.includes("ownerReadSurface.authorizationRows"),
    },
    authorizationSkeleton: {
      status: sources.ownerReadDtoService.includes(
        "owner_read_dto_authz_skeleton_ready_no_runtime_db_read"
      ),
      mode: sources.ownerReadDtoService.includes("require_user_shaped_service_authorization_skeleton"),
      ownerIdentityFromRequireUser:
        sources.ownerReadDtoService.includes("ownerIdentitySource: \"requireUser()\"") &&
        sources.ownerReadDtoService.includes("runtimeRequireUserCallInThisSlice: false"),
      serviceAuthorizationRequiredBeforeAdapter:
        sources.ownerReadDtoService.includes("serviceAuthorizationRequiredBeforeAdapter: true") &&
        sources.readinessPage.includes("serviceAuthorizationRequiredBeforeAdapter"),
      mapperRequiresAuthorizedRows: sources.ownerReadDtoService.includes(
        "mapperRequiresAuthorizedRows: true"
      ),
      callerSuppliedOwnerIdRefused:
        sources.ownerReadDtoService.includes("callerSuppliedOwnerIdDecision: \"refused\"") &&
        sources.ownerReadDtoService.includes("caller-supplied ownerId"),
      directThreadIdAccessRefused:
        sources.ownerReadDtoService.includes(
          "directThreadIdAccessDecision: \"refused_without_owner_scope\""
        ) && sources.readinessPage.includes("direct threadId access refusal"),
      stageRowsVisible: sources.readinessPage.includes("ownerReadSurface.authorizationSkeletonRows"),
      permissionDecisionRowsVisible: sources.readinessPage.includes(
        "ownerReadSurface.permissionDecisionRows"
      ),
      runtimeReadsBlocked:
        sources.ownerReadDtoService.includes("runtimeDbReadEnabled: false") &&
        sources.ownerReadDtoService.includes("runtimeDbWriteEnabled: false"),
    },
    mapperResponse: {
      status: sources.ownerReadDtoService.includes(
        "owner_read_dto_mapper_empty_state_skeleton_ready_no_runtime_db_read"
      ),
      mode:
        sources.ownerReadDtoService.includes("mapper_empty_state_skeleton_no_runtime_db_read") &&
        sources.readinessPage.includes("mapper_empty_state_skeleton_no_runtime_db_read"),
      taskVisible:
        sources.ownerReadDtoService.includes(
          "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE"
        ) &&
        sources.readinessPage.includes(
          "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE"
        ),
      mapperInputExplicit: sources.ownerReadDtoService.includes(
        "mapperInput: \"authorized_rows_or_explicit_unavailable_state\""
      ),
      mapperOutputUiSafe:
        sources.ownerReadDtoService.includes(
          "mapperOutput: \"ui_safe_research_owner_read_response_dto\""
        ) && sources.readinessPage.includes("ui_safe_research_owner_read_response_dto"),
      noMockFallback:
        sources.ownerReadDtoService.includes(
          "emptyStateFallbackPolicy: \"explicit_state_only_no_mock_fallback\""
        ) &&
        sources.ownerReadDtoService.includes("formalMockFallbackAllowed: false") &&
        sources.readinessPage.includes("No mock fallback in formal owner-read responses"),
      responseStatesPresent: [
        "authorized_empty",
        "model_ready_unavailable",
        "partial_transitional_unavailable",
        "formal_read_disabled",
        "proposal_only",
      ].every((marker) => sources.ownerReadDtoService.includes(marker)),
      responseRowsVisible: sources.readinessPage.includes("ownerReadSurface.mapperResponseRows"),
      responseStateRowsVisible: sources.readinessPage.includes("ownerReadSurface.responseStateRows"),
      protectedUiOnlyNoRouteResponse: sources.ownerReadDtoService.includes(
        "protected_ui_state_only_no_route_response"
      ),
      runtimeReadsBlocked:
        sources.ownerReadDtoService.includes("runtimeDbReadEnabled: false") &&
        sources.ownerReadDtoService.includes("runtimeDbWriteEnabled: false"),
      routeAndWritesBlocked:
        sources.ownerReadDtoService.includes("routeHandlerEnabled: false") &&
        sources.ownerReadDtoService.includes("serverActionWriteEnabled: false"),
    },
    queryPlanLoader: {
      taskId: "RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON",
      contractTaskId: "RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT",
      status: sources.ownerReadDtoService.includes(
        "owner_read_query_plan_service_loader_skeleton_ready_no_runtime_db_read"
      ),
      mode:
        sources.ownerReadDtoService.includes("query_plan_service_loader_skeleton_no_runtime_db_read") &&
        sources.readinessPage.includes("query_plan_service_loader_skeleton_no_runtime_db_read"),
      consumesQueryPlanContract:
        sources.ownerReadDtoService.includes("RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT") &&
        sources.ownerReadDtoService.includes("RESEARCH_OWNER_READ_QUERY_PLAN_SUMMARY"),
      pageVisible:
        sources.readinessPage.includes("Owner read query-plan service loader skeleton") &&
        sources.readinessPage.includes("ownerReadSurface.queryPlanLoaderRows"),
      adapterExecutionBlocked:
        sources.ownerReadDtoService.includes("adapterExecutionAllowed: false") &&
        sources.readinessPage.includes("adapterExecutionAllowed:"),
      runtimeReadsBlocked:
        sources.ownerReadDtoService.includes("runtimeDbReadEnabled: false") &&
        sources.ownerReadDtoService.includes("runtimeDbWriteEnabled: false"),
    },
    sourceBoundaries: {
      requireUserPresent: sources.authService.includes("export async function requireUser()"),
      projectServiceAuthzPatternPresent:
        sources.projectService.includes("assertCanAccessProject") &&
        sources.projectService.includes("UnauthorizedError"),
      modelContractRefsNextTask: sources.modelContract.includes(
        "RESEARCH-BFF-001-RESEARCH-OWNER-SCOPED-READ-DTO-CONTRACT"
      ),
      formalReadinessPathPresent:
        sources.formalReadinessContract.includes("requireUser()") &&
        sources.formalReadinessContract.includes("Research service authorization") &&
        sources.formalReadinessContract.includes("UI-safe DTO"),
    },
    checks: {
      readFamilies: REQUIRED_READ_FAMILIES.map((family) => ({
        family,
        present: contractSource.includes(`id: "${family}"`),
      })),
      dtoNames: REQUIRED_DTO_NAMES.map((dtoName) => ({
        dtoName,
        present: contractSource.includes(dtoName),
      })),
      requiredMarkers: REQUIRED_CONTRACT_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
      forbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(contractSource),
      })),
      serviceRequiredMarkers: REQUIRED_SERVICE_MARKERS.map((marker) => ({
        marker,
        present: sources.ownerReadDtoService.includes(marker),
      })),
      readinessPageRequiredMarkers: REQUIRED_READINESS_PAGE_MARKERS.map((marker) => ({
        marker,
        present: sources.readinessPage.includes(marker),
      })),
      hubRequiredMarkers: REQUIRED_RESEARCH_HUB_MARKERS.map((marker) => ({
        marker,
        present: sources.researchHubPage.includes(marker),
      })),
      serviceForbiddenRuntimeMarkers: FORBIDDEN_CONTRACT_PATTERNS.map((item) => ({
        label: item.label,
        present: item.pattern.test(sources.ownerReadDtoService),
      })),
      authorizationSkeletonMarkers: [
        "owner_read_dto_authz_skeleton_ready_no_runtime_db_read",
        "require_user_shaped_service_authorization_skeleton",
        "serviceAuthorizationRequiredBeforeAdapter: true",
        "mapperRequiresAuthorizedRows: true",
        "callerSuppliedOwnerIdDecision: \"refused\"",
        "directThreadIdAccessDecision: \"refused_without_owner_scope\"",
        "authorizationSkeletonRows",
        "permissionDecisionRows",
      ].map((marker) => ({
        marker,
        present: sources.ownerReadDtoService.includes(marker),
      })),
      mapperResponseMarkers: [
        "RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE",
        "owner_read_dto_mapper_empty_state_skeleton_ready_no_runtime_db_read",
        "mapper_empty_state_skeleton_no_runtime_db_read",
        "mapperInput: \"authorized_rows_or_explicit_unavailable_state\"",
        "mapperOutput: \"ui_safe_research_owner_read_response_dto\"",
        "emptyStateFallbackPolicy: \"explicit_state_only_no_mock_fallback\"",
        "formalMockFallbackAllowed: false",
        "mapperResponseRows",
        "responseStateRows",
      ].map((marker) => ({
        marker,
        present: sources.ownerReadDtoService.includes(marker),
      })),
      forbiddenTrueMarkers: FORBIDDEN_TRUE_MARKERS.map((marker) => ({
        marker,
        present: contractSource.includes(marker),
      })),
    },
    docs: {
      dbs003: DBS_003_DOC,
      acc002: ACC_002_DOC,
      backlog: BACKLOG_DOC,
      sprint: SPRINT_DOC,
      tasks: TASKS_DOC,
      completedLog: COMPLETED_LOG,
    },
    safety: {
      readsEnv: false,
      connectsToDatabase: false,
      readsDatabase: false,
      writesDatabase: false,
      mutatesSchema: false,
      appliesMigration: false,
      changesSeedData: false,
      addsRouteHandler: false,
      addsServerActionWrite: false,
      callsProvider: false,
      callsNetwork: false,
      expandsPublicOutput: false,
      enablesExternalCollaboration: false,
      externalAgentDatabaseAccessAllowed: false,
      enablesAgentFinalWrites: false,
      externalRegisterable: false,
      hiddenMockToFormalClaimAllowed: false,
      launchLevelUpgradeClaimed: false,
    },
    errors,
  }

  return proof
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const proof = await buildProof()

  if (args.out) {
    const outPath = repoPath(args.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(proof, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(proof, null, 2))
  } else if (proof.errors.length === 0) {
    console.log(
      `Research owner-read DTO mapper/empty-state response ready: ${proof.contract.readFamilyCount} read families, ${proof.contract.dtoNameCount} DTO targets, service/page/hub/authz/mapper markers present, no runtime/read/write markers.`
    )
  } else {
    console.error(`Research owner-read DTO mapper/empty-state response blocked with ${proof.errors.length} issue(s):`)
    for (const error of proof.errors) {
      const location = error.line ? `${error.path}:${error.line}` : error.path
      console.error(`- [${error.code}] ${location} ${error.message}`)
    }
  }

  process.exitCode = proof.errors.length === 0 ? 0 : 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
