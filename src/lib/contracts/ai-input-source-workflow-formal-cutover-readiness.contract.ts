export type AIInputSourceWorkflowFormalCutoverGateId =
  | "proof-target-write-confirmation"
  | "migration-review-deployable-promotion"
  | "migration-apply-strategy-approval"
  | "identity-strategy-selection"
  | "rls-policy-apply-approval"
  | "persisted-audit-storage-runtime-approval"
  | "service-db-runtime-enable-review"
  | "connector-runtime-activation-review"
  | "rollback-manual-recovery-approval"
  | "owner-cutover-approval-record"
  | "public-output-boundary-review"
  | "nanda-external-registration-boundary";

export type AIInputSourceWorkflowFormalCutoverArea =
  | "proof-target"
  | "migration"
  | "identity"
  | "rls"
  | "audit-storage"
  | "service-runtime"
  | "connector-runtime"
  | "rollback"
  | "owner-approval"
  | "public-output"
  | "agent-protocol";

export type AIInputSourceWorkflowFormalCutoverStatus =
  | "ready_for_formal_cutover_readiness_review"
  | "blocked_until_owner_proof"
  | "blocked_until_human_approval"
  | "blocked_until_runtime_proof";

export type AIInputSourceWorkflowFormalCutoverRuntimeGuards = {
  readonly proofTargetWriteConfirmed: false;
  readonly deployableMigrationPromotionAllowed: false;
  readonly migrationApplyAllowed: false;
  readonly databaseConnectionAllowed: false;
  readonly identityStrategySelected: false;
  readonly rlsPolicyApplyAllowed: false;
  readonly auditStorageRuntimeAllowed: false;
  readonly serviceDatabaseReadAllowed: false;
  readonly serviceDatabaseWriteAllowed: false;
  readonly routeHandlerAllowed: false;
  readonly serverActionAllowed: false;
  readonly connectorRuntimeActivationAllowed: false;
  readonly oauthRuntimeAllowed: false;
  readonly webhookRuntimeAllowed: false;
  readonly pollingRuntimeAllowed: false;
  readonly providerApiRuntimeAllowed: false;
  readonly secretWriteAllowed: false;
  readonly publicOutputAllowed: false;
  readonly moduleFinalWriteAllowed: false;
  readonly externalAgentDatabaseAccessAllowed: false;
  readonly externalCollaborationAllowed: false;
  readonly rollbackPlanApproved: false;
  readonly ownerApprovalRecorded: false;
  readonly externalRegisterable: false;
};

export type AIInputSourceWorkflowFormalCutoverGate = AIInputSourceWorkflowFormalCutoverRuntimeGuards & {
  readonly id: AIInputSourceWorkflowFormalCutoverGateId;
  readonly taskId: "DATTR-024M-CUTOVER-READINESS";
  readonly sequence: number;
  readonly area: AIInputSourceWorkflowFormalCutoverArea;
  readonly status: AIInputSourceWorkflowFormalCutoverStatus;
  readonly riskLevel: "HIGH" | "CRITICAL";
  readonly label: string;
  readonly prerequisiteTaskIds: readonly string[];
  readonly currentEvidence: readonly string[];
  readonly requiredEvidence: readonly string[];
  readonly selectedPattern: string;
  readonly rejectedAlternatives: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly verification: readonly string[];
  readonly stopCondition: string;
  readonly humanApprovalRequired: boolean;
};

const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_LOCAL_REFS = [
  "AGENTS.md",
  "docs/06_audits-and-reports/RPT-027_loop-118-source-workflow-post-l-gap-review.md",
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
  "docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md",
  "docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts",
  "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
  "src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts",
  "src/lib/services/ai-input-source-workflow.service.ts",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_OFFICIAL_REFS = [
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate",
  "https://nextjs.org/docs/app/guides/authentication",
  "https://nextjs.org/docs/app/guides/data-security",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_REQUIRED_GATE_IDS = [
  "proof-target-write-confirmation",
  "migration-review-deployable-promotion",
  "migration-apply-strategy-approval",
  "identity-strategy-selection",
  "rls-policy-apply-approval",
  "persisted-audit-storage-runtime-approval",
  "service-db-runtime-enable-review",
  "connector-runtime-activation-review",
  "rollback-manual-recovery-approval",
  "owner-cutover-approval-record",
  "public-output-boundary-review",
  "nanda-external-registration-boundary",
] as const satisfies readonly AIInputSourceWorkflowFormalCutoverGateId[];

export const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS = {
  proofTargetWriteConfirmed: false,
  deployableMigrationPromotionAllowed: false,
  migrationApplyAllowed: false,
  databaseConnectionAllowed: false,
  identityStrategySelected: false,
  rlsPolicyApplyAllowed: false,
  auditStorageRuntimeAllowed: false,
  serviceDatabaseReadAllowed: false,
  serviceDatabaseWriteAllowed: false,
  routeHandlerAllowed: false,
  serverActionAllowed: false,
  connectorRuntimeActivationAllowed: false,
  oauthRuntimeAllowed: false,
  webhookRuntimeAllowed: false,
  pollingRuntimeAllowed: false,
  providerApiRuntimeAllowed: false,
  secretWriteAllowed: false,
  publicOutputAllowed: false,
  moduleFinalWriteAllowed: false,
  externalAgentDatabaseAccessAllowed: false,
  externalCollaborationAllowed: false,
  rollbackPlanApproved: false,
  ownerApprovalRecorded: false,
  externalRegisterable: false,
} as const satisfies AIInputSourceWorkflowFormalCutoverRuntimeGuards;

export const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_STOP_CONDITIONS = [
  "No Prisma migration promotion in DATTR-024M-CUTOVER-READINESS.",
  "No migration apply in DATTR-024M-CUTOVER-READINESS.",
  "No database connection in DATTR-024M-CUTOVER-READINESS.",
  "No database read or write in DATTR-024M-CUTOVER-READINESS.",
  "No RLS policy apply in DATTR-024M-CUTOVER-READINESS.",
  "No persisted audit write in DATTR-024M-CUTOVER-READINESS.",
  "No route handler in DATTR-024M-CUTOVER-READINESS.",
  "No server action in DATTR-024M-CUTOVER-READINESS.",
  "No OAuth, webhook, polling, provider API, or connector activation in DATTR-024M-CUTOVER-READINESS.",
  "No secret write in DATTR-024M-CUTOVER-READINESS.",
  "No public output expansion in DATTR-024M-CUTOVER-READINESS.",
  "No high-risk module final write in DATTR-024M-CUTOVER-READINESS.",
  "No external agent database access in DATTR-024M-CUTOVER-READINESS.",
  "No external collaboration in DATTR-024M-CUTOVER-READINESS.",
  "externalRegisterable=false.",
] as const;

const FORMAL_CUTOVER_SHARED_REFS = [
  ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_LOCAL_REFS,
  ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_OFFICIAL_REFS,
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_DEPENDENCY_TASK_IDS = [
  "DATTR-024H-MIGRATION-DRAFT",
  "DATTR-024I-PROOF-RUNNER",
  "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  "DATTR-024K-RLS-AUDIT-STORAGE",
  "DATTR-024L-CONNECTOR-RUNTIME",
  "AIINPUT-OPS-003",
  "LOOP-118",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_READINESS_GATES = [
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "proof-target-write-confirmation",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 1,
    area: "proof-target",
    status: "blocked_until_owner_proof",
    riskLevel: "CRITICAL",
    label: "Confirm explicit Source Workflow proof target and write permissions",
    prerequisiteTaskIds: ["DATTR-024I-PROOF-RUNNER"],
    currentEvidence: [
      "DATTR-024I-PROOF-RUNNER exists and defaults to dry-run/no-write behavior.",
      "WORK_PROOF_DATABASE_URL and Source Workflow write confirmations are absent.",
    ],
    requiredEvidence: [
      "Operator provides an approved local or disposable Source Workflow proof target.",
      "Operator sets write confirmation flags and reviews the no-secret proof packet.",
    ],
    selectedPattern:
      "Keep proof target writes disabled until the owner supplies an explicit target and acknowledgements.",
    rejectedAlternatives: [
      "Treat an application DATABASE_URL as an approved proof target.",
      "Infer write permission from local environment presence.",
      "Run proof writes against Supabase without owner confirmation.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm ai-input:proof -- --json", "pnpm work:proof-target:check"],
    stopCondition: "Stop before DB writes when proof target or write acknowledgements are missing.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "migration-review-deployable-promotion",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 2,
    area: "migration",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Promote the reviewed migration draft only after approval",
    prerequisiteTaskIds: ["DATTR-024H-MIGRATION-DRAFT"],
    currentEvidence: [
      "MIG-003 and the draft SQL exist outside prisma/migrations.",
      "No deployable Prisma migration has been created for Source Workflow.",
    ],
    requiredEvidence: [
      "Human review accepts model names, indexes, relations, and RLS enablement shape.",
      "A follow-up task intentionally promotes the draft to a deployable migration.",
    ],
    selectedPattern:
      "Separate review-only SQL from deployable migration creation so cutover cannot happen accidentally.",
    rejectedAlternatives: [
      "Move the draft into prisma/migrations during readiness review.",
      "Use prisma db push as a production shortcut.",
      "Skip migration review because schema.prisma compiles.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm ai-input:migration-draft:check", "pnpm db:validate"],
    stopCondition: "Stop before migration promotion unless migration review is explicit.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "migration-apply-strategy-approval",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 3,
    area: "migration",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Approve the migration apply path and rollback window",
    prerequisiteTaskIds: ["DATTR-024H-MIGRATION-DRAFT"],
    currentEvidence: [
      "Prisma validate passes for the schema shape.",
      "No migration apply command is approved for Source Workflow.",
    ],
    requiredEvidence: [
      "Owner chooses disposable, staging, or production apply target.",
      "Rollback/manual recovery step is named before migration apply.",
    ],
    selectedPattern:
      "Use a reviewed migrate deploy/apply sequence only after target, backup, rollback, and verification are named.",
    rejectedAlternatives: [
      "Apply migrations from a heartbeat loop without target classification.",
      "Use production apply as proof collection.",
      "Treat local validation as migration apply evidence.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm db:validate", "pnpm db:generate"],
    stopCondition: "Stop before migration apply unless target and rollback are approved.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "identity-strategy-selection",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 4,
    area: "identity",
    status: "blocked_until_runtime_proof",
    riskLevel: "CRITICAL",
    label: "Select the owner identity strategy for RLS and service authorization",
    prerequisiteTaskIds: ["DATTR-024K-RLS-AUDIT-STORAGE", "AUTH-005"],
    currentEvidence: [
      "AUT-006 lists Supabase auth user-id mapping and trusted transaction claim candidates.",
      "AUTH-005/Profile mapping proof is still absent.",
    ],
    requiredEvidence: [
      "Selected identity strategy is recorded before RLS policy apply.",
      "Cross-owner denial can be proven in a disposable target.",
    ],
    selectedPattern:
      "Block Source Workflow DB runtime until owner identity can be enforced at both service and database policy layers.",
    rejectedAlternatives: [
      "Assume auth.uid() equals Profile.id while current Profile mapping is email-based.",
      "Use service-role bypass as owner-scope proof.",
      "Rely only on UI filtering for Source Workflow ownership.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm auth:proof", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition: "Stop before RLS policy apply or DB read/write if identity strategy is not selected.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "rls-policy-apply-approval",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 5,
    area: "rls",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Approve Source Workflow RLS policy SQL and proof matrix",
    prerequisiteTaskIds: ["DATTR-024K-RLS-AUDIT-STORAGE"],
    currentEvidence: [
      "AUT-006 defines fail-closed policy review and cross-owner proof expectations.",
      "No RLS policy SQL apply is approved.",
    ],
    requiredEvidence: [
      "Policy SQL uses the selected identity strategy.",
      "Owner allow and cross-owner deny cases pass in disposable proof.",
    ],
    selectedPattern:
      "Apply RLS policies only after identity, proof target, owner/cross-owner cases, and fallback behavior are known.",
    rejectedAlternatives: [
      "Create broad authenticated-user policies.",
      "Disable RLS during early cutover.",
      "Treat table owner/service-role access as RLS proof.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm ai-input:rls-audit-storage:check"],
    stopCondition: "Stop before RLS policy apply until policy proof cases are approved.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "persisted-audit-storage-runtime-approval",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 6,
    area: "audit-storage",
    status: "blocked_until_human_approval",
    riskLevel: "HIGH",
    label: "Approve append-only persisted audit storage runtime",
    prerequisiteTaskIds: ["DATTR-024K-RLS-AUDIT-STORAGE", "AUDIT-OPS-004"],
    currentEvidence: [
      "Audit storage review exists as no-write contract evidence.",
      "No OperatingAuditEvent persisted writer is approved for Source Workflow.",
    ],
    requiredEvidence: [
      "Append-only write path, redacted reads, retention/export/purge, and integrity refs are accepted.",
      "No-secret audit proof packet is available for the proof target.",
    ],
    selectedPattern:
      "Cutover requires persisted audit rows to be safe before Source Workflow writes become available.",
    rejectedAlternatives: [
      "Use console logs as audit evidence.",
      "Write raw provider payloads or source bodies into audit events.",
      "Allow module final writes without audit refs.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm audit:storage-review:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition: "Stop before persisted audit writes until audit storage runtime is approved.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "service-db-runtime-enable-review",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 7,
    area: "service-runtime",
    status: "blocked_until_runtime_proof",
    riskLevel: "CRITICAL",
    label: "Enable service DB read/write only after authz and RLS proof",
    prerequisiteTaskIds: ["DATTR-024J-SERVICE-AUTHZ-RUNTIME", "DATTR-024K-RLS-AUDIT-STORAGE"],
    currentEvidence: [
      "DATTR-024J service runtime calls requireUser() but intentionally reports no DB read/write.",
      "DATTR-024K blocks runtime DB access until identity and RLS/audit proof exist.",
    ],
    requiredEvidence: [
      "Service methods use UI-safe DTOs, selected identity strategy, RLS-compatible queries, and audit refs.",
      "Disposable proof covers create/read/update/proposal states and cross-owner denial.",
    ],
    selectedPattern:
      "Promote service methods to DB runtime only after owner-scoped authorization and database policy proof agree.",
    rejectedAlternatives: [
      "Let Client Components receive Prisma clients or raw database payloads.",
      "Turn on DB reads before RLS policy proof.",
      "Allow writes without proposal/audit/rollback refs.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm ai-input:service-runtime:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition: "Stop before service DB read/write enablement until authz and RLS proof pass.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "connector-runtime-activation-review",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 8,
    area: "connector-runtime",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Activate connectors only after provider, secret, webhook, polling, and adapter approval",
    prerequisiteTaskIds: ["DATTR-024L-CONNECTOR-RUNTIME"],
    currentEvidence: [
      "AUT-007 and DATTR-024L enumerate provider runtime approval gates.",
      "runtimeApprovalSelected=false and connectorRuntimeAllowed=false remain the only safe default.",
    ],
    requiredEvidence: [
      "Provider family, scopes, secrets, webhook signature/replay, polling cursor, adapter redaction, and rollback are approved.",
      "Connector events create only scoped Source Workflow proposals until owner approval.",
    ],
    selectedPattern:
      "Keep provider integration dormant until every connector family passes the approval gate.",
    rejectedAlternatives: [
      "Add OAuth callbacks, webhooks, or polling jobs during formal readiness review.",
      "Store provider secrets in Source Workflow rows.",
      "Let external agents call provider APIs through Personal OS context.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm ai-input:connector-runtime:check"],
    stopCondition: "Stop before connector activation unless provider-specific approval exists.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "rollback-manual-recovery-approval",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 9,
    area: "rollback",
    status: "blocked_until_human_approval",
    riskLevel: "HIGH",
    label: "Approve rollback and manual recovery before formal cutover",
    prerequisiteTaskIds: ["DATTR-024H-MIGRATION-DRAFT", "DATTR-024I-PROOF-RUNNER"],
    currentEvidence: [
      "Manual Ops status can record owner/operator blockers without formal launch upgrade.",
      "No Source Workflow rollback runbook has been approved for runtime writes.",
    ],
    requiredEvidence: [
      "Migration rollback/manual recovery steps are recorded.",
      "Service and connector runtime can be disabled without losing audit/proof context.",
    ],
    selectedPattern:
      "Treat rollback as a launch gate, not a post-failure note.",
    rejectedAlternatives: [
      "Rely on git revert for database or provider side effects.",
      "Keep connector runtime enabled while recovery steps are unclear.",
      "Claim cutover readiness without manual recovery ownership.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm launch:manual-ops", "pnpm ai-input:cutover-readiness:check"],
    stopCondition: "Stop before formal cutover if rollback or manual recovery is not approved.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "owner-cutover-approval-record",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 10,
    area: "owner-approval",
    status: "blocked_until_owner_proof",
    riskLevel: "CRITICAL",
    label: "Record explicit owner approval for formal Source Workflow cutover",
    prerequisiteTaskIds: ["AUTH-005", "WORK-009", "DEPLOY-002"],
    currentEvidence: [
      "Formal launch remains L0 because auth/session, Work proof, and deployment evidence are absent.",
      "Manual Ops can track owner/operator proof work without claiming formal L1/L3.",
    ],
    requiredEvidence: [
      "Owner confirms target environment, migration/apply plan, DB write plan, and rollback plan.",
      "Cutover approval links to auth/session, Work proof, deployment, and Source Workflow proof packets.",
    ],
    selectedPattern:
      "Require explicit owner cutover approval after proof evidence exists and before enabling runtime writes.",
    rejectedAlternatives: [
      "Let heartbeat automation approve high-risk runtime activation.",
      "Use conditional product maturity as formal launch proof.",
      "Treat Manual Ops M1 as permission to write production Source Workflow data.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm launch:proof", "pnpm auth:proof", "pnpm work:proof-target:check"],
    stopCondition: "Stop before formal cutover until owner approval and proof packet links exist.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "public-output-boundary-review",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 11,
    area: "public-output",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Review public-output boundaries before Source Workflow data leaves protected surfaces",
    prerequisiteTaskIds: ["DATTR-024J-SERVICE-AUTHZ-RUNTIME", "DATTR-024L-CONNECTOR-RUNTIME"],
    currentEvidence: [
      "Client Portal is fail-closed and token-only.",
      "Source Workflow provider/source/private context is not public output.",
    ],
    requiredEvidence: [
      "Public output allows only explicitly client-visible artifacts.",
      "Source/private/provider payloads remain redacted unless owner approves a scoped export.",
    ],
    selectedPattern:
      "Keep Source Workflow outputs protected-owner only until a public-safe DTO/export review exists.",
    rejectedAlternatives: [
      "Expose source assets or AI work items directly through Client Portal.",
      "Let provider-originated content become public output by default.",
      "Mix internal audit/proof metadata into client-visible responses.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm ai-input:service-runtime:check", "pnpm launch:proof"],
    stopCondition: "Stop before any public output expansion unless client-visible scope is approved.",
    humanApprovalRequired: true,
  },
  {
    ...AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
    id: "nanda-external-registration-boundary",
    taskId: "DATTR-024M-CUTOVER-READINESS",
    sequence: 12,
    area: "agent-protocol",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Keep NANDA/external collaboration disabled until trust, auth, scopes, and rollback are complete",
    prerequisiteTaskIds: ["DATTR-024L-CONNECTOR-RUNTIME", "AGENT-013"],
    currentEvidence: [
      "Source Workflow and connector capabilities are protected-owner/internal only.",
      "externalRegisterable=false remains mandatory for Source Workflow agents and connectors.",
    ],
    requiredEvidence: [
      "Endpoint, auth, scopes, trust evidence, observability, rollback, and human approval exist.",
      "External agents receive scoped context packages only and never direct database access.",
    ],
    selectedPattern:
      "Preserve NANDA-inspired manifest readiness while refusing external registration until the full approval stack exists.",
    rejectedAlternatives: [
      "Register Source Workflow agents externally before auth/session and deployment proof.",
      "Allow external agents to read the database directly.",
      "Treat internal dry-run HTTP as external collaboration readiness.",
    ],
    sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
    verification: ["pnpm agent:registry:check", "pnpm agent:api:check"],
    stopCondition: "Stop before external registration or collaboration until human approval and trust proof exist.",
    humanApprovalRequired: true,
  },
] as const satisfies readonly AIInputSourceWorkflowFormalCutoverGate[];

export const AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_READINESS_SUMMARY = {
  taskId: "DATTR-024M-CUTOVER-READINESS",
  status: "ready_for_formal_cutover_readiness_review",
  mode: "cutover_readiness_only_no_runtime",
  currentFormalLaunchLevel: "L0_LOCAL_PROTOTYPE",
  conditionalManualOps: "M1_MANUAL_OPS_READY",
  conditionalProductMaturity: "C3_ARCHITECTURE_GATE_READY",
  dependencyTaskIds: AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_DEPENDENCY_TASK_IDS,
  requiredGateIds: AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_REQUIRED_GATE_IDS,
  runtimeGuards: AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_RUNTIME_GUARDS,
  sourceRefs: FORMAL_CUTOVER_SHARED_REFS,
  stopConditions: AI_INPUT_SOURCE_WORKFLOW_FORMAL_CUTOVER_STOP_CONDITIONS,
  nextTask: "LOOP-120",
  nextTaskReason:
    "Loop 120 is the next required fifth-loop launch-level review unless AUTH-005 or WORK-009 proof prerequisites appear first.",
  proofDrivenFollowUp:
    "Run AUTH-005 or WORK-009 when prerequisites appear; otherwise continue shortest-path Source Workflow cutover proof or Manual Ops unblock work.",
  agentProtocolBoundary: {
    affectedCapability: "AI Input Source Workflow formal cutover and connector-backed agent assistance",
    visibility: "protected-owner-internal-only",
    directDatabaseAccessForExternalAgents: false,
    externalRegisterable: false,
  },
} as const;
