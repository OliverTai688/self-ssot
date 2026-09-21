export const OWNEROS_CORE_SURFACE_BFF_CONTRACT_ID = "OWNEROS-BFF-001" as const

export const OWNEROS_CORE_SURFACE_UI_CONTRACT_ID = "OWNEROS-UI-003" as const

export const OWNEROS_CORE_SURFACE_BFF_STATUS = "contract_ready_no_runtime" as const

export const OWNEROS_CORE_SURFACE_BFF_VERSION = "0.1.0" as const

export type OwnerOsCoreSurfaceId = "dashboard" | "ai-input" | "settings" | "admin"

export type OwnerOsCoreSurfaceRoute = "/dashboard" | "/ai-input" | "/settings" | "/admin"

export type OwnerOsCoreSurfaceSlot =
  | "identity-mode-strip"
  | "attention-header"
  | "command-bar"
  | "resource-index"
  | "detail-pane"
  | "agent-proposal-pane"
  | "records-audit-timeline"
  | "settings-boundaries"
  | "empty-loading-error"
  | "manual-ops-handoff"

export type OwnerOsCoreSurfaceState =
  | "real"
  | "formal-readiness"
  | "db-backed-read"
  | "mock"
  | "unavailable"
  | "manual-ops-required"

export type OwnerOsCoreSurfaceLoaderStage =
  | "server-component-loader"
  | "protected-service-loader"
  | "domain-service"
  | "ui-safe-dto"
  | "client-component"

export type OwnerOsCoreSurfaceInvariant =
  | "server-component-loader"
  | "require-user-or-resolve-current-user"
  | "service-authorization"
  | "ui-safe-dto"
  | "client-boundary-serializable"
  | "manual-ops-proof-handoff"
  | "no-secret-raw-provider"

export type OwnerOsCoreSurfaceComponentName =
  | "OwnerOsSurfaceFrame"
  | "OwnerOsCommandBar"
  | "OwnerOsResourceIndex"
  | "OwnerOsDetailPane"
  | "OwnerOsAgentProposalPane"
  | "OwnerOsRecordsAudit"
  | "OwnerOsBoundaryPanel"

export type OwnerOsCoreSurfaceRuntimeFlags = {
  routeHandlerCreated: false
  serverActionCreated: false
  schemaMigrationIncluded: false
  databaseRead: false
  databaseWrite: false
  providerCall: false
  publicOutputExpanded: false
  externalAgentDatabaseAccess: false
  externalRegisterable: false
}

export type OwnerOsCoreSurfaceComponentContract = {
  name: OwnerOsCoreSurfaceComponentName
  purpose: string
  requiredSlots: readonly OwnerOsCoreSurfaceSlot[]
  bffInputRule: string
  rejectedPattern: string
}

export type OwnerOsCoreSurfaceViewModelContract = {
  surfaceId: OwnerOsCoreSurfaceId
  route: OwnerOsCoreSurfaceRoute
  ownerosUiTask: string
  primaryActor: "owner" | "owner-or-admin"
  primaryJob: string
  layoutPattern: "split-workbench" | "index-detail"
  currentLoaderRefs: readonly string[]
  viewModelNames: readonly string[]
  bffStages: readonly OwnerOsCoreSurfaceLoaderStage[]
  requiredSlots: readonly OwnerOsCoreSurfaceSlot[]
  requiredStates: readonly OwnerOsCoreSurfaceState[]
  commandBarFirstActions: readonly string[]
  auditAndBoundaryRefs: readonly string[]
  nextRuntimeTask: string
  stopConditions: readonly string[]
}

export type OwnerOsCoreSurfaceBffContract = {
  id: typeof OWNEROS_CORE_SURFACE_BFF_CONTRACT_ID
  uiContractId: typeof OWNEROS_CORE_SURFACE_UI_CONTRACT_ID
  version: typeof OWNEROS_CORE_SURFACE_BFF_VERSION
  status: typeof OWNEROS_CORE_SURFACE_BFF_STATUS
  architectureDoc: "docs/02_architecture-and-rules/ARC-037_owneros-core-surface-bff-view-model-contract.md"
  acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
  checkerCommand: "pnpm owneros:surface-bff:check"
  sourceRefs: readonly {
    label: string
    url: string
    selectedUse: string
  }[]
  invariants: readonly OwnerOsCoreSurfaceInvariant[]
  components: readonly OwnerOsCoreSurfaceComponentContract[]
  surfaces: readonly OwnerOsCoreSurfaceViewModelContract[]
  runtimeFlags: OwnerOsCoreSurfaceRuntimeFlags
  gateMapping: {
    gateA: string
    gateB: string
    gateC: string
    gateAchieved: false
  }
}

export const OWNEROS_CORE_SURFACE_SOURCE_REFS = [
  {
    label: "Shopify app index table composition",
    url: "https://shopify.dev/docs/api/app-home/patterns/compositions/index-table",
    selectedUse: "Use resource-index structure for owner/admin records that need scan, filter, compare, select, and act.",
  },
  {
    label: "Shopify Polaris common actions",
    url: "https://polaris.shopify.com/patterns/common-actions",
    selectedUse: "Keep primary commands close to the active object and move secondary actions into predictable surfaces.",
  },
  {
    label: "Atlassian navigation system layout",
    url: "https://atlassian.design/components/navigation-system/layout/",
    selectedUse: "Keep page identity, navigation, content, and contextual actions as stable regions across surfaces.",
  },
  {
    label: "IBM Carbon data table usage",
    url: "https://carbondesignsystem.com/components/data-table/usage/",
    selectedUse: "Use dense tabular operating areas for evidence, audit, settings, and readiness queues.",
  },
  {
    label: "GitLab Pajamas design system",
    url: "https://design.gitlab.com/",
    selectedUse: "Use one system vocabulary rather than inventing page-specific controls for each module.",
  },
] as const

export const OWNEROS_CORE_SURFACE_BFF_INVARIANTS = [
  "server-component-loader",
  "require-user-or-resolve-current-user",
  "service-authorization",
  "ui-safe-dto",
  "client-boundary-serializable",
  "manual-ops-proof-handoff",
  "no-secret-raw-provider",
] as const satisfies readonly OwnerOsCoreSurfaceInvariant[]

export const OWNEROS_CORE_SURFACE_COMPONENTS = [
  {
    name: "OwnerOsSurfaceFrame",
    purpose: "Defines the common first viewport: actor/mode, primary job, state badges, and Manual Ops proof handoff.",
    requiredSlots: ["identity-mode-strip", "attention-header", "manual-ops-handoff"],
    bffInputRule: "Receives only UI-safe surface metadata from a Server Component loader.",
    rejectedPattern: "Page-specific hero copy, nested cards, or hidden mock/formal state.",
  },
  {
    name: "OwnerOsCommandBar",
    purpose: "Renders the primary create, import, review, approve, sync, export, or dry-run command set.",
    requiredSlots: ["command-bar"],
    bffInputRule: "Commands are DTO policies with label, href/action intent, disabled reason, audit ref, and stop condition.",
    rejectedPattern: "Buttons whose write/auth/provider/public-output implications are not explicit.",
  },
  {
    name: "OwnerOsResourceIndex",
    purpose: "Shows searchable, filterable, sortable resources, queues, blockers, settings groups, or proof rows.",
    requiredSlots: ["resource-index", "empty-loading-error"],
    bffInputRule: "Rows are mapped view models, not Prisma models or provider payloads.",
    rejectedPattern: "Unsortable card groups for operational records that need comparison or audit.",
  },
  {
    name: "OwnerOsDetailPane",
    purpose: "Shows the selected object's summary, status, next owner decision, and exact route/action handoff.",
    requiredSlots: ["detail-pane"],
    bffInputRule: "Detail payloads include redacted fields, capability decisions, state reason, and source refs.",
    rejectedPattern: "Raw service payloads or long explanatory panels before the next action.",
  },
  {
    name: "OwnerOsAgentProposalPane",
    purpose: "Shows AI scope, context, proposal, allowed operation, blocked write, and review requirement.",
    requiredSlots: ["agent-proposal-pane", "settings-boundaries"],
    bffInputRule: "Agent proposal DTOs must include trust state, source ids, audit ref, and `externalRegisterable: false` posture.",
    rejectedPattern: "Toy chat widgets, autonomous write claims, or direct external-agent data access.",
  },
  {
    name: "OwnerOsRecordsAudit",
    purpose: "Shows evidence, audit, proof, retry, retention, and rollback rows as an operating history.",
    requiredSlots: ["records-audit-timeline"],
    bffInputRule: "Audit rows expose no secrets and link only to allowed local/generated evidence paths.",
    rejectedPattern: "Trust-affecting actions without record, source, or proof visibility.",
  },
  {
    name: "OwnerOsBoundaryPanel",
    purpose: "Shows auth, permission, source, retention, provider, public-output, and Manual Ops boundaries.",
    requiredSlots: ["settings-boundaries", "manual-ops-handoff"],
    bffInputRule: "Boundary DTOs separate current capability from future unavailable or approval-gated behavior.",
    rejectedPattern: "Optimistic labels that make mock, unavailable, manual, or approval-gated features look live.",
  },
] as const satisfies readonly OwnerOsCoreSurfaceComponentContract[]

export const OWNEROS_CORE_SURFACE_BFF_SURFACES = [
  {
    surfaceId: "dashboard",
    route: "/dashboard",
    ownerosUiTask: "OWNEROS-UI-002",
    primaryActor: "owner",
    primaryJob: "Choose the next owner action across AI Work Desktop, Work, Inbox, Settings, Admin, and proof.",
    layoutPattern: "split-workbench",
    currentLoaderRefs: ["getDailyCommandCenter"],
    viewModelNames: ["DailyCommandCenterContract"],
    bffStages: ["server-component-loader", "protected-service-loader", "domain-service", "ui-safe-dto", "client-component"],
    requiredSlots: [
      "identity-mode-strip",
      "attention-header",
      "command-bar",
      "resource-index",
      "detail-pane",
      "agent-proposal-pane",
      "records-audit-timeline",
      "manual-ops-handoff",
    ],
    requiredStates: ["real", "formal-readiness", "manual-ops-required"],
    commandBarFirstActions: ["AI Work Desktop", "Work", "Inbox", "Settings", "Admin"],
    auditAndBoundaryRefs: ["owner evidence console", "Gate A proof handoff", "Manual Ops"],
    nextRuntimeTask: "DONE_OWNEROS-UI-002",
    stopConditions: [
      "No dashboard runtime expansion until the active owner surface stays protected.",
      "No public output, provider call, schema migration, or external agent registration from the dashboard entry.",
    ],
  },
  {
    surfaceId: "ai-input",
    route: "/ai-input",
    ownerosUiTask: "OWNEROS-AIINPUT-UI-001",
    primaryActor: "owner",
    primaryJob: "Capture source material or conversation input into authorized context and reviewable proposals.",
    layoutPattern: "split-workbench",
    currentLoaderRefs: ["buildAIInputFormalReadinessContract", "loadAIInputSourceConnectionCatalog", "requireUser"],
    viewModelNames: ["AIInputFormalReadinessContract", "AIInputSourceConnectionCatalogDTO"],
    bffStages: ["server-component-loader", "protected-service-loader", "domain-service", "ui-safe-dto", "client-component"],
    requiredSlots: [
      "identity-mode-strip",
      "attention-header",
      "command-bar",
      "resource-index",
      "detail-pane",
      "agent-proposal-pane",
      "records-audit-timeline",
      "settings-boundaries",
      "manual-ops-handoff",
    ],
    requiredStates: ["formal-readiness", "db-backed-read", "mock", "unavailable", "manual-ops-required"],
    commandBarFirstActions: ["New input", "Attach source", "Review proposal", "Open settings"],
    auditAndBoundaryRefs: ["source connection catalog", "authorized ContextPackage", "NANDA internal-only posture"],
    nextRuntimeTask: "OWNEROS-AIINPUT-UI-001",
    stopConditions: [
      "Stop before provider OAuth, webhook, polling, secret write, or source activation.",
      "Stop before direct AI final write, public output, external collaboration runtime, or external agent database access.",
    ],
  },
  {
    surfaceId: "settings",
    route: "/settings",
    ownerosUiTask: "OWNEROS-UI-003",
    primaryActor: "owner",
    primaryJob: "Control owner identity, workspace, source, module, agent, environment, retention, and Manual Ops boundaries.",
    layoutPattern: "index-detail",
    currentLoaderRefs: [
      "resolveCurrentUser",
      "getModulePermissionSnapshotForProfile",
      "getUnauthenticatedModulePermissionSnapshot",
      "buildAdminAuditBffContract",
    ],
    viewModelNames: ["AuthResolution", "ModulePermissionSnapshot", "AdminAuditBffContract"],
    bffStages: ["server-component-loader", "protected-service-loader", "domain-service", "ui-safe-dto", "client-component"],
    requiredSlots: [
      "identity-mode-strip",
      "attention-header",
      "resource-index",
      "detail-pane",
      "records-audit-timeline",
      "settings-boundaries",
      "manual-ops-handoff",
    ],
    requiredStates: ["real", "formal-readiness", "unavailable", "manual-ops-required"],
    commandBarFirstActions: ["Profile", "Workspace", "Sources", "Modules", "Agents", "Manual Ops"],
    auditAndBoundaryRefs: ["auth boundary", "module permission snapshot", "retention/export stop condition"],
    nextRuntimeTask: "OWNEROS-UI-003",
    stopConditions: [
      "Stop before permission writes, retention deletion/export runtime, provider activation, env mutation, or secret exposure.",
      "Owner/member profile changes require explicit auth and audit boundaries before writes.",
    ],
  },
  {
    surfaceId: "admin",
    route: "/admin",
    ownerosUiTask: "OWNEROS-UI-004",
    primaryActor: "owner-or-admin",
    primaryJob: "Inspect operator queues, launch blockers, audit proof, system readiness, and Manual Ops handoffs.",
    layoutPattern: "index-detail",
    currentLoaderRefs: ["getAdminLaunchOverview", "getAdminLaunchConsole", "buildAdminAuditBffContract"],
    viewModelNames: ["AdminLaunchOverview", "AdminLaunchConsole", "AdminAuditBffContract"],
    bffStages: ["server-component-loader", "protected-service-loader", "domain-service", "ui-safe-dto", "client-component"],
    requiredSlots: [
      "identity-mode-strip",
      "attention-header",
      "command-bar",
      "resource-index",
      "detail-pane",
      "records-audit-timeline",
      "settings-boundaries",
      "manual-ops-handoff",
    ],
    requiredStates: ["formal-readiness", "manual-ops-required", "unavailable"],
    commandBarFirstActions: ["Blockers", "Evidence", "Audit", "System readiness", "Manual Ops"],
    auditAndBoundaryRefs: ["launch proof", "operator action registry", "admin write boundary"],
    nextRuntimeTask: "OWNEROS-UI-004",
    stopConditions: [
      "No admin mutation, deployment API write, configured DB write, migration apply, launch-level claim, or env edit.",
      "Admin operator controls stay read-only until service-layer authorization and audit persistence are selected.",
    ],
  },
] as const satisfies readonly OwnerOsCoreSurfaceViewModelContract[]

export const OWNEROS_CORE_SURFACE_RUNTIME_FLAGS = {
  routeHandlerCreated: false,
  serverActionCreated: false,
  schemaMigrationIncluded: false,
  databaseRead: false,
  databaseWrite: false,
  providerCall: false,
  publicOutputExpanded: false,
  externalAgentDatabaseAccess: false,
  externalRegisterable: false,
} as const satisfies OwnerOsCoreSurfaceRuntimeFlags

export const OWNEROS_CORE_SURFACE_BFF_CONTRACT = {
  id: OWNEROS_CORE_SURFACE_BFF_CONTRACT_ID,
  uiContractId: OWNEROS_CORE_SURFACE_UI_CONTRACT_ID,
  version: OWNEROS_CORE_SURFACE_BFF_VERSION,
  status: OWNEROS_CORE_SURFACE_BFF_STATUS,
  architectureDoc: "docs/02_architecture-and-rules/ARC-037_owneros-core-surface-bff-view-model-contract.md",
  acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  checkerCommand: "pnpm owneros:surface-bff:check",
  sourceRefs: OWNEROS_CORE_SURFACE_SOURCE_REFS,
  invariants: OWNEROS_CORE_SURFACE_BFF_INVARIANTS,
  components: OWNEROS_CORE_SURFACE_COMPONENTS,
  surfaces: OWNEROS_CORE_SURFACE_BFF_SURFACES,
  runtimeFlags: OWNEROS_CORE_SURFACE_RUNTIME_FLAGS,
  gateMapping: {
    gateA: "A2/A8 prerequisite for owner-private AI Work Desktop usability and authorized context boundaries.",
    gateB: "B1/B2/B4 prerequisite for future member/team surfaces without permission drift.",
    gateC: "C2/C3/C5 prerequisite for operator, audit, failure, and UI hardening.",
    gateAchieved: false,
  },
} as const satisfies OwnerOsCoreSurfaceBffContract
