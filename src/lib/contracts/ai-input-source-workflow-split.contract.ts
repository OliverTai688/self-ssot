export type AIInputSourceWorkflowSliceId =
  | "DATTR-024A"
  | "DATTR-024B"
  | "DATTR-024C"
  | "DATTR-024D"
  | "DATTR-024E"

export type AIInputSourceWorkflowObject =
  | "SourceConnection"
  | "SourceAsset"
  | "AIWorkflowRun"
  | "AIWorkItem"
  | "DataUnitProposal"
  | "ModuleWriteIntent"
  | "OperatingAuditEvent"

export type AIInputSourceWorkflowSliceMode =
  | "protected_read_contract"
  | "schema_review_packet"
  | "disposable_proof_target"
  | "proposal_action_contract"
  | "connector_boundary_review"

export type AIInputSourceWorkflowRisk = "MEDIUM" | "HIGH" | "CRITICAL"

export type AIInputSourceWorkflowSplitSlice = {
  id: AIInputSourceWorkflowSliceId
  parentTask: "DATTR-024-SPLIT"
  title: string
  mode: AIInputSourceWorkflowSliceMode
  risk: AIInputSourceWorkflowRisk
  status: "ready_next" | "done" | "requires_review" | "blocked_external" | "blocked_human_approval"
  scope: readonly string[]
  acceptanceCriteria: readonly string[]
  filesLikelyAffected: readonly string[]
  verification: readonly string[]
  auditMapping: readonly string[]
  stopConditions: readonly string[]
  sourceRefs: readonly string[]
  schemaWriteAllowed: false
  runtimeWriteAllowed: false
  connectorRuntimeAllowed: false
  publicOutputExpansion: false
  moduleFinalWriteAllowed: false
  externalAgentAccessAllowed: false
}

export type AIInputSourceWorkflowBffContract = {
  id: "DATTR-024-SPLIT"
  moduleKey: "ai-input"
  surface: "protected_owner_ai_input"
  actor: "owner"
  maturityTarget: "formal_mode_real_empty_or_unavailable_state_before_persistence"
  loaderBoundary: readonly string[]
  actionBoundary: readonly string[]
  mapperBoundary: readonly string[]
  auditBoundary: readonly string[]
  formalModeBoundary: readonly string[]
  highRiskBoundary: readonly string[]
  officialSourceRefs: readonly string[]
  schemaWriteAllowed: false
  runtimeWriteAllowed: false
  connectorRuntimeAllowed: false
  publicOutputExpansion: false
  moduleFinalWriteAllowed: false
  externalAgentAccessAllowed: false
}

const STATIC_SPLIT_GUARDS = {
  parentTask: "DATTR-024-SPLIT",
  schemaWriteAllowed: false,
  runtimeWriteAllowed: false,
  connectorRuntimeAllowed: false,
  publicOutputExpansion: false,
  moduleFinalWriteAllowed: false,
  externalAgentAccessAllowed: false,
} as const

const LOCAL_SOURCE_REFS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md",
  "docs/02_architecture-and-rules/ARC-027_ai-input-formal-readiness-bff.md",
  "docs/02_architecture-and-rules/DBS-002_source-workflow-schema-contract.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
  "docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md",
  "docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md",
  "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  "docs/05_execution-plans/PLN-060_task-backlog.md",
] as const

const OFFICIAL_SOURCE_REFS = [
  "https://nextjs.org/docs/app/getting-started/fetching-data",
  "https://nextjs.org/docs/app/getting-started/mutating-data",
  "https://nextjs.org/docs/app/guides/forms",
  "https://nextjs.org/docs/app/api-reference/file-conventions/route",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/more/best-practices",
] as const

const AI_INPUT_SOURCE_WORKFLOW_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
] as const satisfies readonly AIInputSourceWorkflowObject[]

export const AI_INPUT_SOURCE_WORKFLOW_SPLIT_CONTRACT: AIInputSourceWorkflowBffContract = {
  id: "DATTR-024-SPLIT",
  moduleKey: "ai-input",
  surface: "protected_owner_ai_input",
  actor: "owner",
  maturityTarget: "formal_mode_real_empty_or_unavailable_state_before_persistence",
  loaderBoundary: [
    "Use a Server Component loader for initial protected AI Input formal state.",
    "Call requireUser() before reading source workflow state.",
    "Apply service-layer authorization before owner-scoped source objects are loaded.",
    "Return UI-safe DTOs only; raw adapter payloads and private source content stay server-side.",
    "When persistence is unavailable, return explicit unavailable or empty state instead of mock rows.",
  ],
  actionBoundary: [
    "Server Actions are reserved for owner-reviewed proposal actions after schema review.",
    "Validate submitted form fields server-side before any future mutation.",
    "Create proposal records before module write intents; final module writes remain blocked.",
    "Do not add route handlers for provider events until connector consent, verification, and audit are approved.",
  ],
  mapperBoundary: [
    "Map SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, and ModuleWriteIntent into compact UI view models.",
    "Hide provider tokens, private object identifiers, raw source payloads, network metadata, and generated internal evidence bodies.",
    "Keep proposal state separate from final Work, Research, Life, Finance, Chamber, Company, and Client Portal records.",
  ],
  auditBoundary: [
    "Map read/proposal/decision events to AUDIT-OPS-001 family ai-input.source-workflow.",
    "Use OperatingAuditEvent as the future append-only audit target before persisted source workflow writes.",
    "Record source evidence references, proposal lifecycle, connector consent changes, and write-intent decisions.",
    "Keep audit DTOs protected owner/admin only with redacted metadata.",
  ],
  formalModeBoundary: [
    "Formal mode must never resurrect hidden mock connector or workflow rows.",
    "Unavailable state is acceptable before reviewed persistence; fake real data is not.",
    "Mock mode can remain a visible prototype control, but it must not be the formal-mode fallback.",
  ],
  highRiskBoundary: [
    "No schema migration, persistence write, connector runtime, external sync, public output, or high-risk module final write is allowed in DATTR-024-SPLIT.",
    "Life, Finance, Company, public output, auth/permission, and external agent collaboration writes require human approval.",
    "External agents receive scoped context packages only and never direct data-store access.",
  ],
  officialSourceRefs: OFFICIAL_SOURCE_REFS,
  ...STATIC_SPLIT_GUARDS,
}

export const AI_INPUT_SOURCE_WORKFLOW_SPLIT_SLICES = [
  {
    id: "DATTR-024A",
    title: "Protected AI Input source workflow read DTO and empty-state contract",
    mode: "protected_read_contract",
    risk: "HIGH",
    status: "ready_next",
    scope: [
      "Extend the formal AI Input readiness/read contract to include source workflow view-model shape.",
      "Represent future SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, and ModuleWriteIntent state as real unavailable or empty DTOs.",
      "Keep Client Components dependent on DTOs, not persistence models or adapter payloads.",
    ],
    acceptanceCriteria: [
      "Protected formal mode can show a source workflow read surface without mock connector/workflow rows.",
      "The loader contract names requireUser and service-layer authorization as mandatory before future real reads.",
      "No schema change, write action, connector runtime, public output, or module final write is introduced.",
    ],
    filesLikelyAffected: [
      "src/lib/services/ai-input-readiness.service.ts",
      "src/types/ai-input-readiness.ts",
      "src/app/(dashboard)/ai-input/ai-input-client.tsx",
      "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    ],
    verification: [
      "pnpm ai-input:split:check",
      "pnpm exec tsc --noEmit --pretty false",
      "pnpm db:validate",
      "git diff --check",
    ],
    auditMapping: [
      "AUDIT-OPS-001 ai-input.source-workflow read.blocked",
      "AUDIT-OPS-001 ai-input.source-workflow read.unavailable",
    ],
    stopConditions: [
      "Stop before adding persistence reads if source workflow schema is not reviewed.",
      "Stop before adding any hidden mock fallback to formal mode.",
    ],
    sourceRefs: LOCAL_SOURCE_REFS,
    ...STATIC_SPLIT_GUARDS,
  },
  {
    id: "DATTR-024B",
    title: "Source workflow schema review packet and migration boundary",
    mode: "schema_review_packet",
    risk: "HIGH",
    status: "done",
    scope: [
      "Reconcile DBS-002 object names with the current Prisma schema and DBS-006 audit target.",
      "Define indexes, ownership fields, retention flags, consent fields, and audit references for review.",
      "Keep migration output proposal-only until human review and safe proof target are present.",
    ],
    acceptanceCriteria: [
      "Schema review names SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, ModuleWriteIntent, and OperatingAuditEvent boundaries.",
      "Review distinguishes seed fixtures from runtime mock data.",
      "Production migration path uses reviewed migration files and deploy-only behavior.",
    ],
    filesLikelyAffected: [
      "docs/02_architecture-and-rules/DBS-002_source-workflow-schema-contract.md",
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
      "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
      "src/lib/contracts/ai-input-source-workflow-schema-review.contract.ts",
      "scripts/check-ai-input-source-workflow-schema-review.mjs",
    ],
    verification: [
      "pnpm ai-input:schema-review:check",
      "pnpm ai-input:split:check",
      "pnpm db:validate",
      "git diff --check",
    ],
    auditMapping: [
      "AUDIT-OPS-001 admin.operator schema.reviewed",
      "AUDIT-OPS-001 ai-input.source-workflow schema.blocked",
    ],
    stopConditions: [
      "Stop before migration when RLS, owner scope, retention, and audit relations are not reviewed.",
      "Stop before production migration without committed migration review.",
    ],
    sourceRefs: LOCAL_SOURCE_REFS,
    ...STATIC_SPLIT_GUARDS,
  },
  {
    id: "DATTR-024C",
    title: "Disposable AI Input persistence proof target",
    mode: "disposable_proof_target",
    risk: "HIGH",
    status: "done",
    scope: [
      "Define a local or disposable target for proof-only source workflow persistence checks.",
      "Run only against explicit safe-target confirmation and cleanup requirements.",
      "Prove formal empty/read/write-proposal lifecycle without valuable production data.",
    ],
    acceptanceCriteria: [
      "Proof target is local/disposable or explicitly approved, and writes are proof-only.",
      "Proof records clean up or are clearly isolated as disposable evidence.",
      "No production, valuable, or public Client Portal data is touched.",
    ],
    filesLikelyAffected: [
      "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
      "src/lib/contracts/ai-input-source-workflow-proof-target.contract.ts",
      "scripts/check-ai-input-source-workflow-proof-target.mjs",
      "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
      "docs/2_agent-input/generated/agent-loop/reports/",
    ],
    verification: [
      "pnpm ai-input:proof-target:check",
      "pnpm ai-input:split:check",
      "pnpm db:validate",
    ],
    auditMapping: [
      "AUDIT-OPS-001 ai-input.source-workflow proof.started",
      "AUDIT-OPS-001 ai-input.source-workflow proof.cleaned_up",
    ],
    stopConditions: [
      "Stop when the target is not clearly disposable or approved.",
      "Stop when write confirmations are absent.",
    ],
    sourceRefs: LOCAL_SOURCE_REFS,
    ...STATIC_SPLIT_GUARDS,
  },
  {
    id: "DATTR-024D",
    title: "Owner-reviewed proposal action contract and audit mapping",
    mode: "proposal_action_contract",
    risk: "CRITICAL",
    status: "done",
    scope: [
      "Define owner-reviewed proposal command ids, lifecycle states, approval levels, audit refs, rollback expectations, and stop conditions.",
      "Keep DataUnitProposal and ModuleWriteIntent proposal actions contract-only before runtime Server Actions.",
      "Attach source refs, proposal refs, write-intent refs, and audit refs to every future proposal decision.",
    ],
    acceptanceCriteria: [
      "Every future proposal action validates input, calls requireUser, checks service authorization, and maps to audit refs.",
      "High-risk module proposals require explicit human approval before final writes.",
      "The contract never writes final Life, Finance, Company, Client Portal, public output, or external collaboration records.",
    ],
    filesLikelyAffected: [
      "src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts",
      "scripts/check-ai-input-source-workflow-proposal-action.mjs",
      "package.json",
      "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
      "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    ],
    verification: [
      "pnpm ai-input:proposal-action:check",
      "pnpm ai-input:split:check",
      "pnpm exec tsc --noEmit --pretty false",
      "git diff --check",
    ],
    auditMapping: [
      "AUDIT-OPS-001 ai-input.source-workflow proposal.created",
      "AUDIT-OPS-001 ai-input.source-workflow proposal.approved",
      "AUDIT-OPS-001 ai-input.source-workflow proposal.rejected",
    ],
    stopConditions: [
      "Stop before route handlers, server actions, Prisma schema edits, migrations, seed changes, DB reads, or DB writes.",
      "Stop before connector runtime, provider reads, public output, high-risk module mutations, external collaboration, or external registration.",
    ],
    sourceRefs: LOCAL_SOURCE_REFS,
    ...STATIC_SPLIT_GUARDS,
  },
  {
    id: "DATTR-024E",
    title: "Connector runtime consent, revoke, and event boundary",
    mode: "connector_boundary_review",
    risk: "CRITICAL",
    status: "done",
    scope: [
      "Define the consent, scope, pause/resume/revoke, provider event, replay, and retry policy before real connector runtime.",
      "Keep manual import and explicit owner selection ahead of broad automatic sync.",
      "Treat provider events as untrusted inputs until verified and audited.",
    ],
    acceptanceCriteria: [
      "Connector scopes, consent, pause/resume/revoke, retention, and audit lifecycle are documented before implementation.",
      "Provider event route handlers remain absent until verification, auth, replay protection, and audit storage are approved.",
      "External agents remain internal/proposal-only and do not receive direct data-store access.",
    ],
    filesLikelyAffected: [
      "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
      "scripts/check-ai-input-source-workflow-connector-boundary.mjs",
      "package.json",
      "docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md",
      "docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md",
      "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
      "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    ],
    verification: [
      "pnpm ai-input:connector-boundary:check",
      "pnpm ai-input:split:check",
      "pnpm audit:ops:check",
      "pnpm exec tsc --noEmit --pretty false",
      "git diff --check",
    ],
    auditMapping: [
      "AUDIT-OPS-001 ai-input.source-workflow connector.consent_changed",
      "AUDIT-OPS-001 ai-input.source-workflow connector.revoked",
      "AUDIT-OPS-001 ai-input.source-workflow provider_event.blocked",
    ],
    stopConditions: [
      "Stop before OAuth, webhook, polling, provider API calls, or file ingestion runtime.",
      "Stop before external agent collaboration or public sharing.",
    ],
    sourceRefs: LOCAL_SOURCE_REFS,
    ...STATIC_SPLIT_GUARDS,
  },
] as const satisfies readonly AIInputSourceWorkflowSplitSlice[]

export const AI_INPUT_SOURCE_WORKFLOW_SPLIT_SUMMARY = {
  id: "DATTR-024-SPLIT",
  sourceParentTask: "DATTR-024",
  status: "ready_for_bff_split_use",
  objects: AI_INPUT_SOURCE_WORKFLOW_OBJECTS,
  nextRunnableSlice: "DATTR-024",
  blockedUntilProofOrApproval: ["AUTH-005", "WORK-009", "DATTR-024C-RUN", "DATTR-024"],
  officialSourceRefs: OFFICIAL_SOURCE_REFS,
  localSourceRefs: LOCAL_SOURCE_REFS,
  nandaPosture: {
    affectedCapability: "AI Input internal source workflow proposals",
    internalRuntimeAllowed: true,
    protectedOwnerVisible: true,
    externalRegisterable: false,
    directDataStoreAccessForExternalAgents: false,
  },
  ...STATIC_SPLIT_GUARDS,
} as const
