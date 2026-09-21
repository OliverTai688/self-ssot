export const SIMPLIFIED_SAAS_OPERATING_SURFACE_CONTRACT_ID = "OWNEROS-UI-001" as const

export const SIMPLIFIED_SAAS_OPERATING_SURFACE_STATUS = "contract_ready_no_runtime" as const

export const SIMPLIFIED_SAAS_OPERATING_SURFACE_VERSION = "0.1.0" as const

export type SimplifiedSaasSurfaceFamily =
  | "frontstage"
  | "auth"
  | "owner-dashboard"
  | "owner-settings"
  | "admin-operator"
  | "ai-work-desktop"
  | "module"
  | "team-member"
  | "agent-command"
  | "public-token"

export type SimplifiedSaasSurfaceSlot =
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

export type SimplifiedSaasSurfaceState =
  | "real"
  | "seed-demo"
  | "mock"
  | "formal-readiness"
  | "db-backed-read"
  | "db-backed-write-draft"
  | "unavailable"
  | "manual-ops-required"

export type SimplifiedSaasCopyBudget = {
  headerTitleMaxWords: number
  headerSubtitleMaxWords: number
  sectionIntroMaxWords: number
  rowLabelMaxWords: number
  emptyStateMaxWords: number
}

export type SimplifiedSaasSurfaceRule = {
  id: string
  title: string
  rule: string
  requiredSlots: readonly SimplifiedSaasSurfaceSlot[]
  rejectedPattern: string
  gateMapping: readonly string[]
}

export type SimplifiedSaasSurfaceTarget = {
  family: SimplifiedSaasSurfaceFamily
  routeOrSurface: string
  primaryJob: string
  defaultLayout: "single-column-console" | "index-detail" | "split-workbench" | "token-fail-closed"
  requiredStateBadges: readonly SimplifiedSaasSurfaceState[]
  minimumSlots: readonly SimplifiedSaasSurfaceSlot[]
  nextApplicationTask: string
}

export type SimplifiedSaasSourceRef = {
  label: string
  url: string
  selectedUse: string
}

export type SimplifiedSaasOperatingSurfaceContract = {
  id: typeof SIMPLIFIED_SAAS_OPERATING_SURFACE_CONTRACT_ID
  version: typeof SIMPLIFIED_SAAS_OPERATING_SURFACE_VERSION
  status: typeof SIMPLIFIED_SAAS_OPERATING_SURFACE_STATUS
  architectureDoc: "docs/02_architecture-and-rules/ARC-036_simplified-saas-operating-surface-design-pattern.md"
  acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md"
  checkerCommand: "pnpm ui:simplified-saas:check"
  copyBudget: SimplifiedSaasCopyBudget
  rules: readonly SimplifiedSaasSurfaceRule[]
  targets: readonly SimplifiedSaasSurfaceTarget[]
  sourceRefs: readonly SimplifiedSaasSourceRef[]
  runtimeFlags: {
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
  blockedPatterns: readonly string[]
}

export const SIMPLIFIED_SAAS_SOURCE_REFS = [
  {
    label: "Shopify app index table composition",
    url: "https://shopify.dev/docs/api/app-home/patterns/compositions/index-table",
    selectedUse: "Use resource indexes, filters, sorting, and row actions as the default admin/work surface.",
  },
  {
    label: "Shopify Polaris common actions",
    url: "https://polaris.shopify.com/patterns/common-actions",
    selectedUse: "Keep primary actions near the object and move secondary actions into predictable menus.",
  },
  {
    label: "Atlassian navigation system layout",
    url: "https://atlassian.design/components/navigation-system/layout/",
    selectedUse: "Separate navigation, page identity, content, and contextual action areas.",
  },
  {
    label: "IBM Carbon data table usage",
    url: "https://carbondesignsystem.com/components/data-table/usage/",
    selectedUse: "Prefer dense, accessible tables for scanning, comparison, selection, and bulk action.",
  },
  {
    label: "GitLab Pajamas design system",
    url: "https://design.gitlab.com/",
    selectedUse: "Use a shared design system vocabulary instead of page-specific invention.",
  },
] as const satisfies readonly SimplifiedSaasSourceRef[]

export const SIMPLIFIED_SAAS_COPY_BUDGET = {
  headerTitleMaxWords: 7,
  headerSubtitleMaxWords: 18,
  sectionIntroMaxWords: 24,
  rowLabelMaxWords: 6,
  emptyStateMaxWords: 22,
} as const satisfies SimplifiedSaasCopyBudget

export const SIMPLIFIED_SAAS_SURFACE_RULES = [
  {
    id: "one-primary-job",
    title: "One Primary Job Per Surface",
    rule: "The first viewport names the actor, mode, and one primary job before any secondary detail.",
    requiredSlots: ["identity-mode-strip", "attention-header", "command-bar"],
    rejectedPattern: "Marketing hero, long explainer, or dashboard grid before the actual task.",
    gateMapping: ["Gate A A8", "Gate C C5"],
  },
  {
    id: "index-detail-default",
    title: "Index Detail Default",
    rule: "Operational resources default to an index plus detail pane with stable search, filter, sort, selection, and row actions.",
    requiredSlots: ["resource-index", "detail-pane", "empty-loading-error"],
    rejectedPattern: "Many isolated cards that cannot be scanned, sorted, selected, or audited.",
    gateMapping: ["Gate A A4", "Gate B B2", "Gate C C5"],
  },
  {
    id: "command-bar-before-copy",
    title: "Command Bar Before Copy",
    rule: "Create, import, review, approve, sync, export, and dry-run actions appear as commands near the relevant resource.",
    requiredSlots: ["command-bar", "manual-ops-handoff"],
    rejectedPattern: "Explanatory paragraphs that describe actions without offering the action or exact handoff.",
    gateMapping: ["Gate A A5", "Gate B B1", "Gate C C2"],
  },
  {
    id: "agent-as-proposal-workspace",
    title: "Agent As Proposal Workspace",
    rule: "Agent areas show scope, context, proposal, allowed operation, blocked write, proof, and next owner decision.",
    requiredSlots: ["agent-proposal-pane", "records-audit-timeline", "settings-boundaries"],
    rejectedPattern: "Toy chatbot panels or agent copy that does not expose capability, trust, or audit boundary.",
    gateMapping: ["Gate A A2", "Gate A A6", "Gate B B4", "Gate C C4"],
  },
  {
    id: "honest-state-language",
    title: "Honest State Language",
    rule: "Every page states real, demo, mock, formal-readiness, DB-backed, unavailable, or Manual Ops state without visual ambiguity.",
    requiredSlots: ["identity-mode-strip", "empty-loading-error", "settings-boundaries"],
    rejectedPattern: "Mock data styled like production data or unavailable features hidden behind vague optimistic copy.",
    gateMapping: ["Gate A A8", "Gate C C5"],
  },
  {
    id: "audit-and-settings-last-mile",
    title: "Audit And Settings Last Mile",
    rule: "Actions that affect trust must have an audit/proof row and an adjacent settings or boundary explanation.",
    requiredSlots: ["records-audit-timeline", "settings-boundaries"],
    rejectedPattern: "Standalone buttons without source, authorization, retention, or rollback visibility.",
    gateMapping: ["Gate B B3", "Gate C C1", "Gate C C3"],
  },
] as const satisfies readonly SimplifiedSaasSurfaceRule[]

export const SIMPLIFIED_SAAS_SURFACE_TARGETS = [
  {
    family: "frontstage",
    routeOrSurface: "/",
    primaryJob: "Route the owner to sign in and keep public/private boundaries obvious.",
    defaultLayout: "single-column-console",
    requiredStateBadges: ["unavailable", "manual-ops-required"],
    minimumSlots: ["identity-mode-strip", "attention-header", "command-bar", "empty-loading-error"],
    nextApplicationTask: "OWNEROS-UI-002",
  },
  {
    family: "auth",
    routeOrSurface: "/login",
    primaryJob: "Let the owner complete or diagnose Google/Supabase sign-in.",
    defaultLayout: "single-column-console",
    requiredStateBadges: ["real", "manual-ops-required"],
    minimumSlots: ["identity-mode-strip", "command-bar", "manual-ops-handoff", "empty-loading-error"],
    nextApplicationTask: "AUTH-005",
  },
  {
    family: "owner-dashboard",
    routeOrSurface: "/dashboard",
    primaryJob: "Choose the next owner action across chat, Work, Inbox, sources, and proof.",
    defaultLayout: "split-workbench",
    requiredStateBadges: ["real", "formal-readiness", "manual-ops-required"],
    minimumSlots: ["identity-mode-strip", "attention-header", "command-bar", "resource-index", "detail-pane"],
    nextApplicationTask: "OWNEROS-UI-002",
  },
  {
    family: "owner-settings",
    routeOrSurface: "/settings",
    primaryJob: "Control identity, workspace, source, module, agent, and retention boundaries.",
    defaultLayout: "index-detail",
    requiredStateBadges: ["real", "formal-readiness", "unavailable"],
    minimumSlots: ["identity-mode-strip", "resource-index", "detail-pane", "settings-boundaries", "records-audit-timeline"],
    nextApplicationTask: "OWNEROS-UI-003",
  },
  {
    family: "admin-operator",
    routeOrSurface: "/admin",
    primaryJob: "Inspect launch blockers, evidence, operations, and manual proof handoffs.",
    defaultLayout: "index-detail",
    requiredStateBadges: ["formal-readiness", "manual-ops-required"],
    minimumSlots: ["identity-mode-strip", "attention-header", "resource-index", "detail-pane", "records-audit-timeline"],
    nextApplicationTask: "OWNEROS-UI-004",
  },
  {
    family: "ai-work-desktop",
    routeOrSurface: "/ai-input plus future unified chat",
    primaryJob: "Capture a source or conversation and turn it into authorized context and proposals.",
    defaultLayout: "split-workbench",
    requiredStateBadges: ["formal-readiness", "db-backed-write-draft", "manual-ops-required"],
    minimumSlots: ["identity-mode-strip", "command-bar", "resource-index", "detail-pane", "agent-proposal-pane"],
    nextApplicationTask: "OWNEROS-002B",
  },
  {
    family: "module",
    routeOrSurface: "/work, /research, /company, /workflow, /life, /finance, /chamber",
    primaryJob: "Operate one module through resources, agent proposals, records, and boundaries.",
    defaultLayout: "index-detail",
    requiredStateBadges: ["mock", "formal-readiness", "db-backed-read", "unavailable"],
    minimumSlots: ["identity-mode-strip", "command-bar", "resource-index", "detail-pane", "agent-proposal-pane", "records-audit-timeline"],
    nextApplicationTask: "OWNEROS-UI-005",
  },
  {
    family: "agent-command",
    routeOrSurface: "/agents",
    primaryJob: "Run owner-only dry-run commands and inspect proposal/audit boundaries.",
    defaultLayout: "split-workbench",
    requiredStateBadges: ["formal-readiness", "unavailable"],
    minimumSlots: ["identity-mode-strip", "command-bar", "agent-proposal-pane", "records-audit-timeline", "settings-boundaries"],
    nextApplicationTask: "OWNEROS-UI-006",
  },
  {
    family: "public-token",
    routeOrSurface: "/client/[token]",
    primaryJob: "Fail closed unless an authorized token can show client-visible records.",
    defaultLayout: "token-fail-closed",
    requiredStateBadges: ["unavailable", "db-backed-read"],
    minimumSlots: ["identity-mode-strip", "empty-loading-error", "records-audit-timeline"],
    nextApplicationTask: "CLIENT-007",
  },
] as const satisfies readonly SimplifiedSaasSurfaceTarget[]

export const SIMPLIFIED_SAAS_BLOCKED_PATTERNS = [
  "large protected-app hero sections",
  "decorative cards before commandable resources",
  "nested cards",
  "page-specific vocabulary for the same action",
  "mock data without an obvious mock state badge",
  "agent chat without scope, capability, blocked writes, and proof",
  "admin evidence walls without index/detail routing",
  "settings pages that mix current state with future promises",
  "buttons without auth, risk, or audit boundary",
] as const

export const SIMPLIFIED_SAAS_OPERATING_SURFACE_CONTRACT = {
  id: SIMPLIFIED_SAAS_OPERATING_SURFACE_CONTRACT_ID,
  version: SIMPLIFIED_SAAS_OPERATING_SURFACE_VERSION,
  status: SIMPLIFIED_SAAS_OPERATING_SURFACE_STATUS,
  architectureDoc: "docs/02_architecture-and-rules/ARC-036_simplified-saas-operating-surface-design-pattern.md",
  acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  checkerCommand: "pnpm ui:simplified-saas:check",
  copyBudget: SIMPLIFIED_SAAS_COPY_BUDGET,
  rules: SIMPLIFIED_SAAS_SURFACE_RULES,
  targets: SIMPLIFIED_SAAS_SURFACE_TARGETS,
  sourceRefs: SIMPLIFIED_SAAS_SOURCE_REFS,
  runtimeFlags: {
    routeHandlerCreated: false,
    serverActionCreated: false,
    schemaMigrationIncluded: false,
    databaseRead: false,
    databaseWrite: false,
    providerCall: false,
    publicOutputExpanded: false,
    externalAgentDatabaseAccess: false,
    externalRegisterable: false,
  },
  blockedPatterns: SIMPLIFIED_SAAS_BLOCKED_PATTERNS,
} as const satisfies SimplifiedSaasOperatingSurfaceContract
