import "server-only"

import { RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE } from "@/lib/contracts/research-owner-read-adapter-runtime.contract"

export type ResearchOwnerReadIssuesRuntimeReadinessTaskId =
  "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE"

export type ResearchOwnerReadIssuesRuntimeReadinessStatus =
  "ready_for_issues_runtime_readiness_preflight_gate"

export type ResearchOwnerReadIssuesRuntimeReadinessMode =
  "issues_runtime_readiness_preflight_no_runtime_db_read"

export type ResearchOwnerReadIssuesRuntimeReadinessCheck = {
  id: string
  label: string
  requiredSignal: string
  blockedPattern: string
  passState: "preflight_ready_only"
  runtimeDbReadEnabled: false
}

export type ResearchOwnerReadIssuesRuntimeReadinessGate = {
  taskId: ResearchOwnerReadIssuesRuntimeReadinessTaskId
  status: ResearchOwnerReadIssuesRuntimeReadinessStatus
  mode: ResearchOwnerReadIssuesRuntimeReadinessMode
  selectedFamily: "issues"
  selectedModel: "ResearchThread"
  dependsOn: {
    bff009TaskId: typeof RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.id
    bff010TaskId: "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF"
  }
  futureBffPath: readonly string[]
  ownerIdentitySource: "requireUser().profileId"
  runtimeRequireUserCallInThisSlice: false
  callerSuppliedOwnerIdAllowed: false
  ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId"
  futureAdapterSignature: "loadResearchIssuesForOwner({ ownerProfileId }) -> Promise<ResearchIssueReadDtoResponse>"
  futurePrismaReadShape: {
    operation: "prisma.researchThread.findMany"
    where: "where: { ownerId: ownerProfileId }"
    selectScalarFields: readonly string[]
    relationCountSelection: {
      _count: {
        select: {
          sources: true
          concepts: true
          writingProjects: true
        }
      }
    }
    stableSort: string
    defaultLimit: number
  }
  relationCountKeys: readonly ["sources", "concepts", "writingProjects"]
  mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state"
  mapperOutputBoundary: "ui_safe_research_issue_read_dto"
  unavailableFallback: {
    state: "model-ready-read-unavailable"
    items: []
    count: 0
    runtimeDbReadEnabled: false
    adapterExecutionAllowed: false
    nextAction: string
  }
  readinessChecks: readonly ResearchOwnerReadIssuesRuntimeReadinessCheck[]
  auditRefs: readonly string[]
  blockedUntil: readonly string[]
  rejectedAlternatives: readonly string[]
  stopConditions: readonly string[]
  safety: {
    runtimeReadinessGateDefined: true
    runtimeDbReadEnabled: false
    runtimeDbWriteEnabled: false
    runtimePrismaReadEnabled: false
    adapterExecutionAllowed: false
    routeHandlerEnabled: false
    serverActionWriteEnabled: false
    publicOutputEnabled: false
    externalCollaborationEnabled: false
    externalAgentDatabaseAccessAllowed: false
    agentFinalWriteAllowed: false
    externalRegisterable: false
    launchLevelUpgradeClaimed: false
  }
  nandaBoundary: {
    affectedSurface: "Research agent proposals"
    runtimeAgentChanged: false
    protocolStatus: "protected_owner_visible_proposal_only"
    externalRegisterable: false
    finalWritesRequireHumanApproval: true
  }
  sourceRefs: readonly string[]
  verification: readonly string[]
  nextTasks: readonly string[]
  nextSafeAction: string
}

export type ResearchOwnerReadIssuesRuntimeReadinessSummary = {
  taskId: ResearchOwnerReadIssuesRuntimeReadinessTaskId
  status: ResearchOwnerReadIssuesRuntimeReadinessStatus
  mode: ResearchOwnerReadIssuesRuntimeReadinessMode
  selectedFamily: "issues"
  ownerIdentitySource: "requireUser().profileId"
  ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId"
  futureOperation: "prisma.researchThread.findMany"
  selectedScalarFieldCount: number
  relationCountKeys: readonly ["sources", "concepts", "writingProjects"]
  stableSort: string
  defaultLimit: number
  runtimeDbReadEnabled: false
  adapterExecutionAllowed: false
  nextSafeAction: string
}

const selectedQueryPlan =
  RESEARCH_OWNER_READ_FIRST_RUNTIME_ADAPTER_GATE.selectedQueryPlan

const selectedScalarFields = selectedQueryPlan.selectedFields.filter(
  (field) => !field.startsWith("_count."),
)

export const RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE: ResearchOwnerReadIssuesRuntimeReadinessGate =
  {
    taskId: "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE",
    status: "ready_for_issues_runtime_readiness_preflight_gate",
    mode: "issues_runtime_readiness_preflight_no_runtime_db_read",
    selectedFamily: "issues",
    selectedModel: "ResearchThread",
    dependsOn: {
      bff009TaskId:
        "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
      bff010TaskId:
        "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF",
    },
    futureBffPath: [
      "Server Component loader",
      "requireUser()",
      "Research service authorization",
      "ResearchThread owner-scoped selected-field adapter",
      "mapAuthorizedResearchIssueRowsToDtos",
      "UI-safe Research issue DTO",
      "Client Component interaction",
    ],
    ownerIdentitySource: "requireUser().profileId",
    runtimeRequireUserCallInThisSlice: false,
    callerSuppliedOwnerIdAllowed: false,
    ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId",
    futureAdapterSignature:
      "loadResearchIssuesForOwner({ ownerProfileId }) -> Promise<ResearchIssueReadDtoResponse>",
    futurePrismaReadShape: {
      operation: "prisma.researchThread.findMany",
      where: "where: { ownerId: ownerProfileId }",
      selectScalarFields: selectedScalarFields,
      relationCountSelection: {
        _count: {
          select: {
            sources: true,
            concepts: true,
            writingProjects: true,
          },
        },
      },
      stableSort: selectedQueryPlan.stableSort,
      defaultLimit: selectedQueryPlan.defaultLimit,
    },
    relationCountKeys: ["sources", "concepts", "writingProjects"],
    mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state",
    mapperOutputBoundary: "ui_safe_research_issue_read_dto",
    unavailableFallback: {
      state: "model-ready-read-unavailable",
      items: [],
      count: 0,
      runtimeDbReadEnabled: false,
      adapterExecutionAllowed: false,
      nextAction:
        "Return an explicit unavailable Research issues response until requireUser(), service authorization, owner scope, selected fields, and proof target are verified.",
    },
    readinessChecks: [
      {
        id: "owner-session-profile",
        label: "Owner session and Profile identity",
        requiredSignal: "requireUser().profileId resolves on the server",
        blockedPattern: "caller-supplied ownerId",
        passState: "preflight_ready_only",
        runtimeDbReadEnabled: false,
      },
      {
        id: "service-authorization",
        label: "Research service authorization",
        requiredSignal: "Service verifies the authenticated owner before adapter reads",
        blockedPattern: "Client route guard as authorization",
        passState: "preflight_ready_only",
        runtimeDbReadEnabled: false,
      },
      {
        id: "owner-scope-predicate",
        label: "Owner predicate",
        requiredSignal: "ResearchThread.ownerId equals requireUser().profileId",
        blockedPattern: "threadId-only lookup before owner scope",
        passState: "preflight_ready_only",
        runtimeDbReadEnabled: false,
      },
      {
        id: "selected-field-read-shape",
        label: "Selected fields and relation counts",
        requiredSignal:
          "Use scalar selected fields plus _count for sources, concepts, and writingProjects only",
        blockedPattern: "raw Prisma payload passthrough",
        passState: "preflight_ready_only",
        runtimeDbReadEnabled: false,
      },
      {
        id: "mapper-handoff",
        label: "Mapper handoff",
        requiredSignal: "mapAuthorizedResearchIssueRowsToDtos returns UI-safe DTOs",
        blockedPattern: "private source body, file URL, or unselected relation payload",
        passState: "preflight_ready_only",
        runtimeDbReadEnabled: false,
      },
      {
        id: "runtime-stop-conditions",
        label: "Runtime stop conditions",
        requiredSignal:
          "No route, action, public output, external collaboration, or launch claim appears",
        blockedPattern: "runtime read success claim before owner-run proof",
        passState: "preflight_ready_only",
        runtimeDbReadEnabled: false,
      },
    ],
    auditRefs: [
      "ACC-002 RESEARCH-BFF-011 Research Owner Read Issues Runtime Readiness Gate Acceptance",
      "RPT-049 loop 163 Research post issues adapter gap review",
      "DBS-003 transitional ResearchThread owner field",
      "ARC-028 NANDA protected-owner proposal-only boundary",
    ],
    blockedUntil: [
      "AUTH-005 proves Supabase public env plus signed-in /auth/status and Profile mapping.",
      "A service-layer requireUser() owner-profile proof can run without caller-supplied ownerId.",
      "A safe local/disposable or owner-approved proof target exists for the future read-only adapter proof.",
      "Checker proves selected-field and relation-count shape before Prisma runtime reads are enabled.",
    ],
    rejectedAlternatives: [
      "Enable prisma.researchThread.findMany in the same slice.",
      "Expose the issues read through a route handler or server action before protected BFF proof.",
      "Accept caller-supplied ownerId or threadId-only access.",
      "Return raw Prisma ResearchThread rows to Client Components.",
      "Treat Research agent proposals as final writes or externally registerable capabilities.",
    ],
    stopConditions: [
      "Stop before importing Prisma client or database clients.",
      "Stop before DB connection, DB read, DB write, schema migration, migration apply, or seed change.",
      "Stop before route handler, server action, public output, external collaboration, Research agent final write, external agent database access, external registration, or launch-level claim.",
      "Stop if owner identity, service authorization, selected-field redaction, or proof target criteria become ambiguous.",
    ],
    safety: {
      runtimeReadinessGateDefined: true,
      runtimeDbReadEnabled: false,
      runtimeDbWriteEnabled: false,
      runtimePrismaReadEnabled: false,
      adapterExecutionAllowed: false,
      routeHandlerEnabled: false,
      serverActionWriteEnabled: false,
      publicOutputEnabled: false,
      externalCollaborationEnabled: false,
      externalAgentDatabaseAccessAllowed: false,
      agentFinalWriteAllowed: false,
      externalRegisterable: false,
      launchLevelUpgradeClaimed: false,
    },
    nandaBoundary: {
      affectedSurface: "Research agent proposals",
      runtimeAgentChanged: false,
      protocolStatus: "protected_owner_visible_proposal_only",
      externalRegisterable: false,
      finalWritesRequireHumanApproval: true,
    },
    sourceRefs: [
      "node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md",
      "node_modules/next/dist/docs/01-app/02-guides/data-security.md",
      "src/lib/services/research-owner-read-issues-adapter.service.ts",
      "src/lib/contracts/research-owner-read-adapter-runtime.contract.ts",
      "src/lib/contracts/research-owner-read-query-plan.contract.ts",
      "prisma/schema.prisma#ResearchThread",
      "src/lib/services/auth.service.ts#requireUser",
    ],
    verification: [
      "node --check scripts/check-research-owner-read-issues-runtime-readiness.mjs",
      "pnpm research:read-issues-runtime-readiness:check",
      "pnpm research:read-issues-adapter:check",
      "pnpm research:read-adapter-runtime:check",
      "pnpm research:read-adapter-mock:check",
      "pnpm research:read-adapter-authz:check",
      "pnpm research:read-query-plan:check",
      "pnpm research:read-dto:check",
      "pnpm research:model:check",
      "pnpm research:readiness:check",
      "pnpm db:validate",
      "pnpm exec tsc --noEmit --pretty false",
    ],
    nextTasks: [
      "LOOP-165-LAUNCH-LEVEL-REVIEW",
      "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF",
      "AUTH-005 when Supabase public env plus signed-in /auth/status evidence appears",
      "WORK-009 when safe proof target plus exact write confirmations appear",
    ],
    nextSafeAction:
      "Run the loop 165 launch-level review next unless AUTH-005 or WORK-009 prerequisites appear; after that, add a server-only service authorization runtime proof before any Prisma issues read.",
  }

export const RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_SUMMARY: ResearchOwnerReadIssuesRuntimeReadinessSummary =
  {
    taskId: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.taskId,
    status: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.status,
    mode: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.mode,
    selectedFamily: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.selectedFamily,
    ownerIdentitySource:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.ownerIdentitySource,
    ownerScopePredicate:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.ownerScopePredicate,
    futureOperation:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.futurePrismaReadShape.operation,
    selectedScalarFieldCount:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.futurePrismaReadShape
        .selectScalarFields.length,
    relationCountKeys:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.relationCountKeys,
    stableSort:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.futurePrismaReadShape
        .stableSort,
    defaultLimit:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.futurePrismaReadShape
        .defaultLimit,
    runtimeDbReadEnabled:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.safety
        .runtimeDbReadEnabled,
    adapterExecutionAllowed:
      RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.safety
        .adapterExecutionAllowed,
    nextSafeAction: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.nextSafeAction,
  }
