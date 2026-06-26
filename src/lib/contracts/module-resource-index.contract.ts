export type ResourceIndexModuleKey =
  | "work"
  | "research"
  | "ai-input"
  | "workflow"
  | "life"
  | "finance"
  | "chamber"
  | "company"
  | "client-portal"
  | "agent-team-os"

export type ResourceIndexReadiness =
  | "work_first_contract_ready"
  | "prototype_contract_ready"
  | "high_risk_contract_only"
  | "public_fail_closed_contract"
  | "internal_readiness_contract"

export type ResourceIndexTone = "good" | "warn" | "blocked" | "neutral"

export type ResourceIndexColumn = {
  key: string
  label: string
  valueType: "text" | "status" | "date" | "count" | "progress" | "risk" | "owner"
  priority: "primary" | "secondary" | "meta"
  sortable: boolean
  visibleByDefault: boolean
}

export type ResourceIndexFilter = {
  key: string
  label: string
  valueType: "single_select" | "multi_select" | "date_range" | "boolean" | "text"
  options: readonly string[]
  defaultValue?: string
}

export type ResourceIndexSort = {
  key: string
  label: string
  direction: "asc" | "desc"
  default?: boolean
}

export type ResourceIndexPagination = {
  defaultPageSize: number
  pageSizeOptions: readonly number[]
  mode: "cursor" | "offset" | "static"
}

export type ResourceIndexSelection = {
  mode: "none" | "single" | "multiple"
  stableRowId: string
  selectionSummary: string
}

export type ResourceIndexAction = {
  id: string
  label: string
  intent: "navigate" | "open_detail" | "dry_run" | "proposal" | "unavailable"
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  approval: "AUTO_READ" | "AUTO_PROPOSE" | "HUMAN_APPROVAL_REQUIRED" | "BLOCKED"
  auditEvent: string
}

export type ResourceIndexBulkAction = ResourceIndexAction & {
  requiresSelection: true
  maxSelectionCount: number
}

export type ResourceIndexDetailPanel = {
  mode: "drawer" | "split_pane" | "route"
  titleField: string
  summaryFields: readonly string[]
  sections: readonly string[]
  safePayloadOnly: true
}

export type ResourceIndexEmptyState = {
  state: "empty" | "loading" | "error" | "blocked"
  label: string
  nextAction: string
  tone: ResourceIndexTone
}

export type ResourceIndexAuditRef = {
  event: string
  source: "future_operating_audit" | "generated_loop_evidence" | "module_service_log"
  persistence: "not_persisted" | "proposal_only" | "future_append_only"
}

export type ModuleResourceIndexContract = {
  id: "SURFACE-MATURITY-003"
  version: "0.1.0"
  moduleKey: ResourceIndexModuleKey
  moduleLabel: string
  readiness: ResourceIndexReadiness
  status: "contract_ready" | "contract_only_blocked" | "prototype_mapped"
  nextTask: string
  source: {
    architectureDoc: string
    researchDoc: string
    operatingSurfaceDoc: string
    acceptanceDoc: string
  }
  authBoundary: {
    read: string
    write: string
    publicExposure: "blocked" | "token_gated" | "protected_owner_only"
  }
  dataBoundary: {
    rowPayload: "ui_safe_view_model_only"
    noClientDatabaseImports: true
    noAdapterSecrets: true
    noSecretFields: readonly string[]
    rawPayloadsExcluded: readonly string[]
  }
  search: {
    enabled: boolean
    fields: readonly string[]
    placeholder: string
  }
  filters: readonly ResourceIndexFilter[]
  sorts: readonly ResourceIndexSort[]
  columns: readonly ResourceIndexColumn[]
  pagination: ResourceIndexPagination
  selection: ResourceIndexSelection
  rowActions: readonly ResourceIndexAction[]
  bulkActions: readonly ResourceIndexBulkAction[]
  detailPanel: ResourceIndexDetailPanel
  emptyStates: readonly ResourceIndexEmptyState[]
  auditRefs: readonly ResourceIndexAuditRef[]
  rejectedAlternatives: readonly string[]
}

const SHARED_SOURCE = {
  architectureDoc: "docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md",
  researchDoc: "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  operatingSurfaceDoc: "docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md",
  acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
} as const

const SHARED_NO_SECRET_FIELDS = [
  "provider values",
  "session values",
  "private identifiers",
  "raw claims",
  "raw adapter payloads",
  "private record bodies outside the selected module scope",
] as const

const SHARED_EMPTY_STATES = [
  {
    state: "empty",
    label: "No resources match the current scope.",
    nextAction: "Show the formal empty state and the next safe create or import action.",
    tone: "neutral",
  },
  {
    state: "loading",
    label: "Resource index is loading.",
    nextAction: "Keep layout dimensions stable and avoid mock fallback in formal mode.",
    tone: "neutral",
  },
  {
    state: "error",
    label: "Resource index cannot load.",
    nextAction: "Show a no-secret retry path and evidence handoff.",
    tone: "warn",
  },
  {
    state: "blocked",
    label: "Resource index is blocked by auth, permission, data, or risk gates.",
    nextAction: "Explain the blocker and route to the next executable task.",
    tone: "blocked",
  },
] as const satisfies readonly ResourceIndexEmptyState[]

const WORK_RESOURCE_INDEX_CONTRACT = {
  id: "SURFACE-MATURITY-003",
  version: "0.1.0",
  moduleKey: "work",
  moduleLabel: "Work",
  readiness: "work_first_contract_ready",
  status: "contract_ready",
  nextTask: "WORK-009",
  source: SHARED_SOURCE,
  authBoundary: {
    read: "requireUser() followed by owner-scoped Work service reads",
    write: "server action plus service-layer ownership checks; no bulk writes in this contract slice",
    publicExposure: "protected_owner_only",
  },
  dataBoundary: {
    rowPayload: "ui_safe_view_model_only",
    noClientDatabaseImports: true,
    noAdapterSecrets: true,
    noSecretFields: SHARED_NO_SECRET_FIELDS,
    rawPayloadsExcluded: [
      "raw project rows",
      "owner/profile identifiers",
      "client share tokens",
      "internal note bodies in index rows",
      "file storage locations",
    ],
  },
  search: {
    enabled: true,
    fields: ["projectName", "clientName", "description", "phase", "status"],
    placeholder: "Search projects, clients, phases, or status",
  },
  filters: [
    {
      key: "status",
      label: "Status",
      valueType: "multi_select",
      options: ["active", "paused", "done", "archived"],
    },
    {
      key: "health",
      label: "Health",
      valueType: "multi_select",
      options: ["green", "yellow", "red", "unknown"],
    },
    {
      key: "visibility",
      label: "Visibility",
      valueType: "multi_select",
      options: ["internal", "client_visible", "private"],
    },
    {
      key: "due",
      label: "Due date",
      valueType: "date_range",
      options: [],
    },
  ],
  sorts: [
    { key: "updatedAt", label: "Recently updated", direction: "desc", default: true },
    { key: "dueAt", label: "Due soon", direction: "asc" },
    { key: "progress", label: "Progress", direction: "desc" },
    { key: "name", label: "Name", direction: "asc" },
  ],
  columns: [
    {
      key: "name",
      label: "Project",
      valueType: "text",
      priority: "primary",
      sortable: true,
      visibleByDefault: true,
    },
    {
      key: "clientName",
      label: "Client",
      valueType: "text",
      priority: "secondary",
      sortable: true,
      visibleByDefault: true,
    },
    {
      key: "status",
      label: "Status",
      valueType: "status",
      priority: "secondary",
      sortable: true,
      visibleByDefault: true,
    },
    {
      key: "progress",
      label: "Progress",
      valueType: "progress",
      priority: "secondary",
      sortable: true,
      visibleByDefault: true,
    },
    {
      key: "openItems",
      label: "Open items",
      valueType: "count",
      priority: "meta",
      sortable: true,
      visibleByDefault: true,
    },
    {
      key: "updatedAt",
      label: "Updated",
      valueType: "date",
      priority: "meta",
      sortable: true,
      visibleByDefault: true,
    },
  ],
  pagination: {
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50],
    mode: "cursor",
  },
  selection: {
    mode: "multiple",
    stableRowId: "projectId",
    selectionSummary: "Selected Work projects",
  },
  rowActions: [
    {
      id: "work.project.open",
      label: "Open project",
      intent: "navigate",
      risk: "LOW",
      approval: "AUTO_READ",
      auditEvent: "work.project.opened",
    },
    {
      id: "work.project.detail",
      label: "Open detail drawer",
      intent: "open_detail",
      risk: "LOW",
      approval: "AUTO_READ",
      auditEvent: "work.project.detail_opened",
    },
    {
      id: "work.project.agent-review",
      label: "Ask WorkAgent for review",
      intent: "dry_run",
      risk: "MEDIUM",
      approval: "AUTO_PROPOSE",
      auditEvent: "work.agent.review_requested",
    },
  ],
  bulkActions: [
    {
      id: "work.projects.export-index",
      label: "Export selected index",
      intent: "proposal",
      risk: "MEDIUM",
      approval: "AUTO_PROPOSE",
      auditEvent: "work.projects.export_proposed",
      requiresSelection: true,
      maxSelectionCount: 50,
    },
    {
      id: "work.projects.bulk-update",
      label: "Bulk update proposal",
      intent: "unavailable",
      risk: "HIGH",
      approval: "HUMAN_APPROVAL_REQUIRED",
      auditEvent: "work.projects.bulk_update_blocked",
      requiresSelection: true,
      maxSelectionCount: 25,
    },
  ],
  detailPanel: {
    mode: "drawer",
    titleField: "name",
    summaryFields: ["clientName", "status", "health", "progress", "dueAt"],
    sections: ["attention", "tasks", "notes-summary", "deliverables", "agent-proposals", "audit-refs"],
    safePayloadOnly: true,
  },
  emptyStates: SHARED_EMPTY_STATES,
  auditRefs: [
    {
      event: "work.project.opened",
      source: "future_operating_audit",
      persistence: "future_append_only",
    },
    {
      event: "work.agent.review_requested",
      source: "generated_loop_evidence",
      persistence: "proposal_only",
    },
  ],
  rejectedAlternatives: [
    "Client-side resource assembly from raw rows",
    "Direct database imports in client components",
    "Bulk write actions before audit and approval policy",
    "Public or token route reuse of protected owner index payloads",
  ],
} as const satisfies ModuleResourceIndexContract

const PROTOTYPE_MODULE_INDEX_CONTRACTS = [
  {
    moduleKey: "research",
    moduleLabel: "Research",
    readiness: "prototype_contract_ready",
    status: "prototype_mapped",
    nextTask: "REALDATA-001",
    searchFields: ["researchObject", "source", "tag", "citation"],
    primaryColumns: ["Object", "Source count", "Citation state", "Updated"],
    blockedWrite: "Research writes need SourceAsset/DataUnit BFF and citation provenance review.",
  },
  {
    moduleKey: "ai-input",
    moduleLabel: "AI Input",
    readiness: "prototype_contract_ready",
    status: "prototype_mapped",
    nextTask: "DATTR-024",
    searchFields: ["source", "workflow", "workItem", "adapter"],
    primaryColumns: ["Source", "Workflow", "Formal state", "Review need"],
    blockedWrite: "Formal persistence needs schema and service authorization before source workflow writes.",
  },
  {
    moduleKey: "workflow",
    moduleLabel: "Workflow",
    readiness: "prototype_contract_ready",
    status: "prototype_mapped",
    nextTask: "REALDATA-001",
    searchFields: ["run", "rule", "agent", "status"],
    primaryColumns: ["Run", "Rule", "Status", "Last event"],
    blockedWrite: "Workflow operation writes need run model, rollback, and audit contract.",
  },
  {
    moduleKey: "life",
    moduleLabel: "Life",
    readiness: "high_risk_contract_only",
    status: "contract_only_blocked",
    nextTask: "REALDATA-001",
    searchFields: ["private signal", "check-in", "reflection"],
    primaryColumns: ["Private record", "Signal", "Risk", "Updated"],
    blockedWrite: "Life is privacy-first; final writes require explicit human approval and privacy policy.",
  },
  {
    moduleKey: "finance",
    moduleLabel: "Finance",
    readiness: "high_risk_contract_only",
    status: "contract_only_blocked",
    nextTask: "REALDATA-001",
    searchFields: ["draft", "account label", "period", "risk"],
    primaryColumns: ["Draft", "Period", "Approval", "Risk"],
    blockedWrite: "Finance remains draft/proposal-only until audit, approval, and rollback exist.",
  },
  {
    moduleKey: "chamber",
    moduleLabel: "Chamber",
    readiness: "prototype_contract_ready",
    status: "prototype_mapped",
    nextTask: "REALDATA-001",
    searchFields: ["contact", "relationship", "opportunity", "follow-up"],
    primaryColumns: ["Contact", "Relationship", "Next follow-up", "Opportunity"],
    blockedWrite: "Chamber CRM writes need contact/interactions BFF and visibility boundaries.",
  },
  {
    moduleKey: "company",
    moduleLabel: "Company",
    readiness: "high_risk_contract_only",
    status: "contract_only_blocked",
    nextTask: "REALDATA-001",
    searchFields: ["initiative", "decision", "principle", "risk"],
    primaryColumns: ["Initiative", "Decision state", "Owner", "Risk"],
    blockedWrite: "Company strategy final writes require human approval and decision audit.",
  },
  {
    moduleKey: "client-portal",
    moduleLabel: "Client Portal",
    readiness: "public_fail_closed_contract",
    status: "contract_only_blocked",
    nextTask: "CLIENT-007",
    searchFields: ["client visible project", "deliverable", "token state"],
    primaryColumns: ["Project", "Visibility", "Token state", "Last access"],
    blockedWrite: "Public token lifecycle and public smoke require safe DB target plus explicit output boundary.",
  },
  {
    moduleKey: "agent-team-os",
    moduleLabel: "Agent Team OS",
    readiness: "internal_readiness_contract",
    status: "prototype_mapped",
    nextTask: "AUDIT-OPS-001",
    searchFields: ["agent", "capability", "operation", "registry state"],
    primaryColumns: ["Agent", "Capability", "Approval", "Registry"],
    blockedWrite: "Agent operations stay dry-run/internal until auth, audit, and approval gates exist.",
  },
] as const

function buildPrototypeContract(
  input: (typeof PROTOTYPE_MODULE_INDEX_CONTRACTS)[number]
): ModuleResourceIndexContract {
  const highRisk =
    input.readiness === "high_risk_contract_only" || input.moduleKey === "client-portal"

  return {
    id: "SURFACE-MATURITY-003",
    version: "0.1.0",
    moduleKey: input.moduleKey,
    moduleLabel: input.moduleLabel,
    readiness: input.readiness,
    status: input.status,
    nextTask: input.nextTask,
    source: SHARED_SOURCE,
    authBoundary: {
      read:
        input.moduleKey === "client-portal"
          ? "token-gated public BFF only when explicitly enabled; protected owner view otherwise"
          : "protected owner/admin read boundary",
      write: input.blockedWrite,
      publicExposure: input.moduleKey === "client-portal" ? "token_gated" : "protected_owner_only",
    },
    dataBoundary: {
      rowPayload: "ui_safe_view_model_only",
      noClientDatabaseImports: true,
      noAdapterSecrets: true,
      noSecretFields: SHARED_NO_SECRET_FIELDS,
      rawPayloadsExcluded: [
        "raw records",
        "private identifiers",
        "provider payloads",
        "internal-only notes",
        "unreviewed generated content",
      ],
    },
    search: {
      enabled: true,
      fields: input.searchFields,
      placeholder: `Search ${input.moduleLabel} resources`,
    },
    filters: [
      {
        key: "mode",
        label: "Mode",
        valueType: "multi_select",
        options: ["real", "demo", "mock", "formal", "blocked"],
      },
      {
        key: "risk",
        label: "Risk",
        valueType: "multi_select",
        options: ["low", "medium", "high", "critical"],
      },
    ],
    sorts: [
      { key: "updatedAt", label: "Recently updated", direction: "desc", default: true },
      { key: "attentionRank", label: "Attention", direction: "asc" },
    ],
    columns: input.primaryColumns.map((label, index) => ({
      key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      label,
      valueType: index === 0 ? "text" : highRisk ? "risk" : "status",
      priority: index === 0 ? "primary" : "secondary",
      sortable: true,
      visibleByDefault: true,
    })),
    pagination: {
      defaultPageSize: 25,
      pageSizeOptions: [10, 25, 50],
      mode: "cursor",
    },
    selection: {
      mode: highRisk ? "single" : "multiple",
      stableRowId: `${input.moduleKey}ResourceId`,
      selectionSummary: `Selected ${input.moduleLabel} resources`,
    },
    rowActions: [
      {
        id: `${input.moduleKey}.resource.open`,
        label: "Open detail",
        intent: "open_detail",
        risk: highRisk ? "MEDIUM" : "LOW",
        approval: "AUTO_READ",
        auditEvent: `${input.moduleKey}.resource.opened`,
      },
      {
        id: `${input.moduleKey}.agent.review`,
        label: "Request agent review",
        intent: "dry_run",
        risk: highRisk ? "HIGH" : "MEDIUM",
        approval: highRisk ? "HUMAN_APPROVAL_REQUIRED" : "AUTO_PROPOSE",
        auditEvent: `${input.moduleKey}.agent.review_requested`,
      },
    ],
    bulkActions: [
      {
        id: `${input.moduleKey}.resources.bulk-proposal`,
        label: "Bulk proposal",
        intent: highRisk ? "unavailable" : "proposal",
        risk: highRisk ? "HIGH" : "MEDIUM",
        approval: highRisk ? "HUMAN_APPROVAL_REQUIRED" : "AUTO_PROPOSE",
        auditEvent: `${input.moduleKey}.resources.bulk_proposal`,
        requiresSelection: true,
        maxSelectionCount: highRisk ? 1 : 50,
      },
    ],
    detailPanel: {
      mode: "drawer",
      titleField: input.primaryColumns[0],
      summaryFields: input.primaryColumns,
      sections: ["attention", "detail", "agent-proposals", "records-readiness", "settings-boundary"],
      safePayloadOnly: true,
    },
    emptyStates: SHARED_EMPTY_STATES,
    auditRefs: [
      {
        event: `${input.moduleKey}.resource.opened`,
        source: "future_operating_audit",
        persistence: "future_append_only",
      },
      {
        event: `${input.moduleKey}.agent.review_requested`,
        source: "generated_loop_evidence",
        persistence: "proposal_only",
      },
    ],
    rejectedAlternatives: [
      "Unbounded module-specific list shapes",
      "Client-side persistence as the source of truth",
      "High-risk writes before audit and approval boundaries",
      "Public reuse of protected owner payloads",
    ],
  }
}

export const MODULE_RESOURCE_INDEX_MODULE_KEYS = [
  "work",
  "research",
  "ai-input",
  "workflow",
  "life",
  "finance",
  "chamber",
  "company",
  "client-portal",
  "agent-team-os",
] as const satisfies readonly ResourceIndexModuleKey[]

export const MODULE_RESOURCE_INDEX_CONTRACTS = [
  WORK_RESOURCE_INDEX_CONTRACT,
  ...PROTOTYPE_MODULE_INDEX_CONTRACTS.map(buildPrototypeContract),
] as const satisfies readonly ModuleResourceIndexContract[]

export const MODULE_RESOURCE_INDEX_CONTRACT_SUMMARY = {
  id: "SURFACE-MATURITY-003",
  status: "ready_for_contract_use",
  moduleCount: MODULE_RESOURCE_INDEX_CONTRACTS.length,
  workFirst: true,
  schemaWrites: false,
  moduleWrites: false,
  publicOutputExpansion: false,
  nextTaskWhenProofStillBlocked: "REALDATA-001",
} as const
