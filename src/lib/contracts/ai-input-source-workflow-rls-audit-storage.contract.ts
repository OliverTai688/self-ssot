export type AIInputSourceWorkflowRlsAuditStorageGateId =
  | "identity-strategy-review"
  | "rls-default-deny-review"
  | "owner-select-policy-review"
  | "owner-write-check-review"
  | "proposal-approval-policy-review"
  | "operating-audit-storage-model-review"
  | "audit-append-only-integrity-review"
  | "audit-read-redaction-review"
  | "secret-separation-vault-review"
  | "proof-matrix-cross-owner-review"
  | "migration-apply-boundary-review"
  | "external-agent-database-boundary-review";

export type AIInputSourceWorkflowRlsAuditStorageArea =
  | "identity"
  | "row-level-security"
  | "proposal-approval"
  | "operating-audit"
  | "secret-separation"
  | "proof"
  | "migration"
  | "agent-boundary";

export type AIInputSourceWorkflowRlsAuditStorageStatus =
  | "review_ready"
  | "blocked_until_identity_strategy"
  | "blocked_until_audit_storage_schema"
  | "human_approval_required";

export type AIInputSourceWorkflowRlsAuditStorageRisk = "MEDIUM" | "HIGH" | "CRITICAL";

export type AIInputSourceWorkflowRlsAuditStorageTable =
  | "source_connections"
  | "source_assets"
  | "ai_workflow_runs"
  | "ai_work_items"
  | "source_naming_profiles"
  | "data_unit_proposals"
  | "module_write_intents"
  | "operating_audit_events";

export type AIInputSourceWorkflowRlsAuditStorageIdentityStrategy =
  | "supabase-auth-user-id-mapping"
  | "trusted-server-transaction-claim";

export type AIInputSourceWorkflowRlsAuditStorageGate = {
  readonly id: AIInputSourceWorkflowRlsAuditStorageGateId;
  readonly taskId: "DATTR-024K-RLS-AUDIT-STORAGE";
  readonly area: AIInputSourceWorkflowRlsAuditStorageArea;
  readonly status: AIInputSourceWorkflowRlsAuditStorageStatus;
  readonly riskLevel: AIInputSourceWorkflowRlsAuditStorageRisk;
  readonly label: string;
  readonly selectedPattern: string;
  readonly rejectedAlternatives: readonly string[];
  readonly requiredEvidence: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly acceptanceGate: string;
  readonly verification: readonly string[];
  readonly stopCondition: string;
  readonly humanApprovalRequired: boolean;
  readonly schemaMigrationAllowed: false;
  readonly rlsPolicyApplyAllowed: false;
  readonly auditStorageRuntimeAllowed: false;
  readonly databaseReadAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly routeHandlerAdded: false;
  readonly serverActionAdded: false;
  readonly connectorRuntimeAllowed: false;
  readonly providerDataAllowed: false;
  readonly publicOutputAllowed: false;
  readonly moduleFinalWriteAllowed: false;
  readonly externalAgentDatabaseAccessAllowed: false;
  readonly externalRegisterable: false;
};

const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS = [
  "AGENTS.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "src/lib/contracts/operating-audit-storage-review.contract.ts",
  "src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts",
  "src/lib/services/ai-input-source-workflow.service.ts",
  "prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql",
] as const;

const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_OFFICIAL_REFS = [
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://supabase.com/docs/guides/database/secure-data",
  "https://supabase.com/docs/guides/database/vault",
  "https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv",
  "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
  "https://www.postgresql.org/docs/current/sql-createpolicy.html",
] as const;

const RLS_AUDIT_STORAGE_STOP_CONDITIONS = [
  "No route handler in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No server action in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No Prisma schema edit in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No migration create/apply in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No seed change in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No DB read/write in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No RLS policy apply in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No persisted audit row creation in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No connector runtime in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No provider data read in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No public output expansion in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No module final write in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No external collaboration in DATTR-024K-RLS-AUDIT-STORAGE.",
  "No external agent database access in DATTR-024K-RLS-AUDIT-STORAGE.",
  "externalRegisterable=false.",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_REQUIRED_GATE_IDS = [
  "identity-strategy-review",
  "rls-default-deny-review",
  "owner-select-policy-review",
  "owner-write-check-review",
  "proposal-approval-policy-review",
  "operating-audit-storage-model-review",
  "audit-append-only-integrity-review",
  "audit-read-redaction-review",
  "secret-separation-vault-review",
  "proof-matrix-cross-owner-review",
  "migration-apply-boundary-review",
  "external-agent-database-boundary-review",
] as const satisfies readonly AIInputSourceWorkflowRlsAuditStorageGateId[];

export const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_REQUIRED_TABLES = [
  "source_connections",
  "source_assets",
  "ai_workflow_runs",
  "ai_work_items",
  "source_naming_profiles",
  "data_unit_proposals",
  "module_write_intents",
  "operating_audit_events",
] as const satisfies readonly AIInputSourceWorkflowRlsAuditStorageTable[];

export const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_IDENTITY_STRATEGIES = [
  {
    id: "supabase-auth-user-id-mapping",
    status: "review_candidate",
    selectedWhen:
      "Profile stores a stable Supabase Auth user id and every Source Workflow owner_id can be checked against that mapping.",
    rejectedUntil:
      "AUTH-005/Profile mapping proof exists; current Profile model is email-based and cannot assume auth.uid() equals owner_id.",
  },
  {
    id: "trusted-server-transaction-claim",
    status: "review_candidate",
    selectedWhen:
      "Trusted server services set an owner/profile claim inside a transaction before Source Workflow queries, and policies read only that scoped claim.",
    rejectedUntil:
      "A transaction-scoped claim setter, dedicated database role, Prisma transaction pattern, and rollback behavior are reviewed.",
  },
] as const satisfies readonly {
  readonly id: AIInputSourceWorkflowRlsAuditStorageIdentityStrategy;
  readonly status: "review_candidate";
  readonly selectedWhen: string;
  readonly rejectedUntil: string;
}[];

export const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_GATES = [
  {
    id: "identity-strategy-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "identity",
    status: "blocked_until_identity_strategy",
    riskLevel: "CRITICAL",
    label: "Choose the RLS identity strategy before policy apply",
    selectedPattern:
      "Do not apply Source Workflow RLS policies until the repo chooses either Supabase Auth user-id mapping or a trusted server transaction claim strategy.",
    rejectedAlternatives: [
      "Assume auth.uid() equals Profile.id while Profile is currently email-mapped.",
      "Assume Prisma direct database connections automatically carry Supabase JWT claims.",
      "Use service-role or table-owner access as proof that owner-scoped RLS works.",
    ],
    requiredEvidence: [
      "AUTH-005/Profile mapping proof or a formal transaction-claim design exists.",
      "Cross-owner denial is provable in a disposable target before formal cutover.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_OFFICIAL_REFS,
    ],
    acceptanceGate:
      "A future RLS policy apply task must name the selected identity strategy and prove owner claim propagation before DB runtime.",
    verification: ["pnpm ai-input:rls-audit-storage:check", "pnpm auth:boundary"],
    stopCondition:
      "Stop before RLS policy SQL if owner identity cannot be resolved at the database policy layer.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "rls-default-deny-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "row-level-security",
    status: "review_ready",
    riskLevel: "HIGH",
    label: "Keep Source Workflow tables fail-closed by default",
    selectedPattern:
      "Retain the DATTR-024H review-only SQL stance: RLS enabled without policies remains fail-closed until reviewed policy SQL and proof cases exist.",
    rejectedAlternatives: [
      "Disable RLS to make early proof writes easier.",
      "Create broad permissive policies for all authenticated users.",
      "Treat UI route protection as equivalent to database row isolation.",
    ],
    requiredEvidence: [
      "The migration draft enables row level security on every Source Workflow draft table.",
      "Future policy SQL names the table, command, role, USING expression, and WITH CHECK expression where writes are allowed.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "https://supabase.com/docs/guides/database/postgres/row-level-security",
      "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
      "https://www.postgresql.org/docs/current/sql-createpolicy.html",
    ],
    acceptanceGate:
      "No Source Workflow DB runtime can start until default-deny and policy-specific behavior are documented and testable.",
    verification: ["pnpm ai-input:migration-draft:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before migration apply if any Source Workflow table is not covered by default-deny RLS review.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "owner-select-policy-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "row-level-security",
    status: "blocked_until_identity_strategy",
    riskLevel: "CRITICAL",
    label: "Review owner-scoped SELECT policies",
    selectedPattern:
      "SELECT policies must be owner-scoped, role-scoped, index-aware, and paired with service-layer authorization and UI-safe DTO mapping.",
    rejectedAlternatives: [
      "Return raw Prisma rows to Client Components.",
      "Expose source rows through public or external-agent endpoints.",
      "Use RLS as a query filter instead of also filtering by owner in service code.",
    ],
    requiredEvidence: [
      "Each Source Workflow table has an owner_id or documented parent-owner relation.",
      "Policies use authenticated roles only and performance-aware owner filters.",
      "Service code still filters by owner/profile instead of relying only on RLS.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv",
      "https://www.postgresql.org/docs/current/sql-createpolicy.html",
    ],
    acceptanceGate:
      "Future proof must show same-owner read succeeds and cross-owner read denies or returns empty safely.",
    verification: ["pnpm ai-input:service-runtime:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before DB-backed list/detail loaders if owner-scoped SELECT semantics are not testable.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "owner-write-check-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "row-level-security",
    status: "blocked_until_identity_strategy",
    riskLevel: "CRITICAL",
    label: "Review owner-scoped INSERT/UPDATE checks",
    selectedPattern:
      "Any future write policy must use WITH CHECK semantics so new or changed rows cannot cross owner scope.",
    rejectedAlternatives: [
      "Allow writes based only on client-submitted owner_id.",
      "Allow update policies without verifying the new row still belongs to the owner.",
      "Allow delete policies before retention and audit deletion semantics are approved.",
    ],
    requiredEvidence: [
      "Future proposal/write-intent actions derive owner scope from requireUser(), not client input.",
      "Future policy proof includes insert, update, and rejected cross-owner mutation cases.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "https://www.postgresql.org/docs/current/sql-createpolicy.html",
    ],
    acceptanceGate:
      "Future write runtime remains proposal-only until owner WRITE CHECK behavior and audit envelopes pass proof.",
    verification: ["pnpm ai-input:proposal-action:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before proposal/write-intent DB writes if WITH CHECK behavior is not designed and tested.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "proposal-approval-policy-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "proposal-approval",
    status: "review_ready",
    riskLevel: "HIGH",
    label: "Keep proposal approvals separate from final module writes",
    selectedPattern:
      "DataUnitProposal and ModuleWriteIntent policies may support owner-reviewed proposal state changes later, but final module writes remain outside this slice.",
    rejectedAlternatives: [
      "Let AI Input proposals write final Work, Finance, Life, Company, or Client Portal records directly.",
      "Let external agents approve write intents.",
    ],
    requiredEvidence: [
      "Approval level remains explicit on write-intent rows.",
      "Target module authorization, rollback refs, and audit refs exist before final writes.",
    ],
    sourceRefs: AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
    acceptanceGate:
      "Proposal approval may only advance to manual apply until module-specific authorization and persisted audit storage are approved.",
    verification: ["pnpm ai-input:proposal-action:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before high-risk module final writes from Source Workflow output.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "operating-audit-storage-model-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "operating-audit",
    status: "blocked_until_audit_storage_schema",
    riskLevel: "HIGH",
    label: "Review persisted OperatingAuditEvent storage before Source Workflow DB runtime",
    selectedPattern:
      "Use AUDIT-OPS-004 as the storage base; Source Workflow runtime can use audit_ref/proof_ref now and only create persisted audit rows after audit schema/storage proof passes.",
    rejectedAlternatives: [
      "Persist Source Workflow writes without an audit storage model.",
      "Store raw proof packet bodies or private source material in audit metadata.",
      "Treat application logs as the product audit source of truth.",
    ],
    requiredEvidence: [
      "Persisted audit model fields, indexes, redaction, retention, integrity, export, purge, and rollback are reviewed.",
      "Source Workflow operations map to ai-input.source-workflow audit family actions.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
    ],
    acceptanceGate:
      "Future Source Workflow DB writes require either persisted audit storage proof or an explicit disposable-proof-only deferral.",
    verification: ["pnpm audit:storage-review:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before DB write runtime if audit storage remains ambiguous or would store raw sensitive data.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "audit-append-only-integrity-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "operating-audit",
    status: "review_ready",
    riskLevel: "HIGH",
    label: "Require append-only audit semantics and integrity refs",
    selectedPattern:
      "Audit storage should be append-only with event hash or previous-event hash semantics before it is trusted for launch proof.",
    rejectedAlternatives: [
      "Allow ordinary update/delete audit mutations.",
      "Let source workflow cleanup delete audit history.",
      "Skip integrity refs for proof-only rows and later treat them as launch evidence.",
    ],
    requiredEvidence: [
      "Append-only writer contract exists before persisted audit writes.",
      "Retention/export/purge policy defines how audit evidence can be redacted without silent erasure.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "src/lib/services/operating-audit-event-builder.ts",
    ],
    acceptanceGate:
      "Audit storage can support launch claims only after append-only and integrity behavior are proven.",
    verification: ["pnpm audit:event-builder:check", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before persisted audit writes if append-only or integrity semantics would be guessed.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "audit-read-redaction-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "operating-audit",
    status: "review_ready",
    riskLevel: "HIGH",
    label: "Require protected audit read DTOs and redaction",
    selectedPattern:
      "Audit list/detail reads must stay behind requireUser() and module/admin authorization, returning only redacted DTOs.",
    rejectedAlternatives: [
      "Render raw audit metadata JSON in admin/settings.",
      "Expose audit rows through public Client Portal routes.",
      "Include raw source bodies, provider payloads, tokens, cookies, database URLs, profile IDs, or row IDs in audit DTOs.",
    ],
    requiredEvidence: [
      "Allowed audit read fields, filters, pagination, redactionVersion, and no-secret exclusions are listed before UI/API cutover.",
      "Source Workflow audit_lineage.review operation remains owner/admin protected.",
    ],
    sourceRefs: AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
    acceptanceGate:
      "Future protected admin/settings audit storage surfaces must use redacted DTOs only.",
    verification: ["pnpm audit:ops:check", "pnpm ai-input:service-runtime:check"],
    stopCondition:
      "Stop before audit read UI/API if raw metadata is required to make the view useful.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "secret-separation-vault-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "secret-separation",
    status: "human_approval_required",
    riskLevel: "CRITICAL",
    label: "Keep provider secrets outside Source Workflow rows",
    selectedPattern:
      "Source Workflow rows may store secret_ref/provider_account_ref only; OAuth tokens, webhook secrets, signing secrets, refresh tokens, and provider credentials require a separately approved secret store such as Supabase Vault or backend env.",
    rejectedAlternatives: [
      "Persist provider tokens in source_connections metadata.",
      "Expose service-role or secret keys to frontend code.",
      "Let provider secrets appear in audit/proof packets.",
    ],
    requiredEvidence: [
      "Secret storage decision exists before connector runtime.",
      "No UI-safe DTO or audit event exposes raw secret material.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "https://supabase.com/docs/guides/database/vault",
      "https://supabase.com/docs/guides/database/secure-data",
    ],
    acceptanceGate:
      "Connector runtime remains blocked until secret storage, rotation, revocation, and audit behavior are approved.",
    verification: ["pnpm ai-input:connector-boundary:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before connector runtime or provider data reads if secret separation is not approved.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "proof-matrix-cross-owner-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "proof",
    status: "review_ready",
    riskLevel: "HIGH",
    label: "Define same-owner and cross-owner RLS/audit proof cases",
    selectedPattern:
      "A future disposable proof must cover same-owner read/write, cross-owner deny, proposal-only write-intent, audit envelope creation, cleanup, and no-secret output.",
    rejectedAlternatives: [
      "Use one happy-path insert/read as full RLS proof.",
      "Skip cross-owner denial because the app currently has one owner.",
      "Claim launch level from dry-run-only proof packets.",
    ],
    requiredEvidence: [
      "Proof runner names the identity strategy and policy state under test.",
      "Proof output includes pass/fail for same-owner, cross-owner, audit, cleanup, and no-secret checks.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "scripts/ai-input-source-workflow-proof-runner.mjs",
    ],
    acceptanceGate:
      "DATTR-024 proof can only advance after the cross-owner RLS/audit matrix has a disposable/local target and explicit write confirmations.",
    verification: ["pnpm ai-input:proof", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before claiming RLS/audit proof from owner-delegated or partial evidence.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "migration-apply-boundary-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "migration",
    status: "human_approval_required",
    riskLevel: "CRITICAL",
    label: "Keep migration and policy apply human-approved",
    selectedPattern:
      "DATTR-024H SQL remains outside prisma/migrations; future apply requires human review, safe target classification, and explicit policy/audit proof plan.",
    rejectedAlternatives: [
      "Copy the draft into prisma/migrations automatically.",
      "Apply policies to a valuable database from an agent heartbeat.",
      "Use a blocked local proof as evidence that production apply is safe.",
    ],
    requiredEvidence: [
      "Human approval names the target, migration hash, policy plan, rollback plan, and proof command.",
      "No deployable migration is introduced by this review gate.",
    ],
    sourceRefs: AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
    acceptanceGate:
      "Migration and policy apply remain Manual Ops until explicit target and approval evidence exist.",
    verification: ["pnpm ai-input:migration-draft:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before migration apply, policy apply, or production DB mutation.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  {
    id: "external-agent-database-boundary-review",
    taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
    area: "agent-boundary",
    status: "review_ready",
    riskLevel: "CRITICAL",
    label: "Block external agent direct database access",
    selectedPattern:
      "External agents can only receive scoped context packages and proposal outputs after approval; no external agent gets direct database credentials or table access.",
    rejectedAlternatives: [
      "Register Source Workflow agents externally before endpoint/auth/trust review.",
      "Let external agents query Source Workflow or audit tables directly.",
      "Treat RLS as sufficient for cross-organization external collaboration.",
    ],
    requiredEvidence: [
      "NANDA posture remains protected-owner/internal with externalRegisterable=false.",
      "Future external adapter approval package explicitly excludes direct DB access.",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
      "docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md",
    ],
    acceptanceGate:
      "External registration remains blocked until endpoint, auth, scopes, trust, rollback, public-safety review, and human approval exist.",
    verification: ["pnpm agent:registry:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition:
      "Stop before external collaboration or registration work touches Source Workflow persisted data.",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    rlsPolicyApplyAllowed: false,
    auditStorageRuntimeAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
] as const satisfies readonly AIInputSourceWorkflowRlsAuditStorageGate[];

export const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_SOURCE_REFS = [
  ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_LOCAL_REFS,
  ...AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_OFFICIAL_REFS,
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_STOP_CONDITIONS =
  RLS_AUDIT_STORAGE_STOP_CONDITIONS;

export const AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_SUMMARY = {
  taskId: "DATTR-024K-RLS-AUDIT-STORAGE",
  status: "ready_for_rls_audit_storage_review",
  mode: "rls_audit_storage_review_only_no_runtime",
  gateCount: AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_GATES.length,
  requiredTableCount: AI_INPUT_SOURCE_WORKFLOW_RLS_AUDIT_STORAGE_REQUIRED_TABLES.length,
  identityStrategySelected: false,
  rlsPolicyApplyAllowed: false,
  auditStorageRuntimeAllowed: false,
  schemaMigrationAllowed: false,
  databaseReadAllowed: false,
  databaseWriteAllowed: false,
  routeHandlerAdded: false,
  serverActionAdded: false,
  connectorRuntimeAllowed: false,
  providerDataAllowed: false,
  publicOutputAllowed: false,
  moduleFinalWriteAllowed: false,
  externalAgentDatabaseAccessAllowed: false,
  externalRegisterable: false,
  formalLaunchLevelUnchanged: true,
  conditionalManualOpsUnchanged: true,
  conditionalProductMaturityUnchanged: true,
  selectedNextImplementationTask: "DATTR-024L-CONNECTOR-RUNTIME",
  rationale:
    "DATTR-024K closes the RLS/audit-storage review gate without applying policy SQL, creating audit rows, or enabling DB runtime. Full DATTR-024 still requires approved identity strategy, migration apply, disposable proof, connector runtime approval, and formal-mode cutover.",
  nandaPosture:
    "AI Input Source Workflow remains protected-owner/internal only; external agents never receive direct database access and externalRegisterable=false.",
} as const;
