export type OperatingAuditStorageReviewArea =
  | "schema"
  | "authorization"
  | "writer"
  | "read-dto"
  | "retention"
  | "integrity"
  | "proof-target"
  | "migration"
  | "manual-ops"

export type OperatingAuditStorageReviewStatus =
  | "proposal_ready"
  | "review_required"
  | "blocked_until_proof_target"

export type OperatingAuditStorageReviewRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type OperatingAuditStorageReviewItem = {
  readonly id: string
  readonly area: OperatingAuditStorageReviewArea
  readonly status: OperatingAuditStorageReviewStatus
  readonly label: string
  readonly requiredDecision: string
  readonly selectedPattern: string
  readonly rejectedAlternatives: readonly string[]
  readonly sourceRefs: readonly string[]
  readonly acceptanceGate: string
  readonly verification: readonly string[]
  readonly stopCondition: string
  readonly riskLevel: OperatingAuditStorageReviewRisk
  readonly humanApprovalRequired: boolean
  readonly schemaMigrationAllowed: false
  readonly runtimeWriteAllowed: false
  readonly databaseReadAllowed: false
  readonly databaseWriteAllowed: false
  readonly routeHandlerAdded: false
  readonly serverActionAdded: false
  readonly publicOutputAllowed: false
  readonly externalRegisterable: false
  readonly persistedAuditRowsCreated: false
}

export type OperatingAuditStorageReviewContract = {
  readonly id: "AUDIT-OPS-004"
  readonly version: "0.1.0"
  readonly status: "ready_for_storage_review_packet"
  readonly visibility: "protected_owner_admin_only"
  readonly sourceBasis: readonly string[]
  readonly requiredReviewIds: readonly string[]
  readonly items: readonly OperatingAuditStorageReviewItem[]
  readonly summary: {
    readonly itemCount: number
    readonly proposalReadyCount: number
    readonly reviewRequiredCount: number
    readonly blockedUntilProofTargetCount: number
    readonly highRiskCount: number
    readonly humanApprovalRequiredCount: number
    readonly runtimeAuditStorageImplemented: false
    readonly schemaMigrationImplemented: false
    readonly routeHandlerAdded: false
    readonly serverActionAdded: false
    readonly databaseReadPerformed: false
    readonly databaseWriteAdded: false
    readonly publicOutputAdded: false
    readonly externalRegistrationEnabled: false
    readonly directDatabaseAccessByExternalAgents: false
    readonly persistedAuditRowsCreated: false
    readonly externalRegisterable: false
    readonly nextTask: string
  }
}

export const OPERATING_AUDIT_STORAGE_REVIEW_REQUIRED_IDS = [
  "audit.schema.model-review",
  "audit.schema.index-review",
  "audit.authz.service-boundary",
  "audit.writer.append-only-boundary",
  "audit.dto.redaction-boundary",
  "audit.retention.export-purge-policy",
  "audit.integrity.hash-chain-review",
  "audit.proof-target.disposable-plan",
  "audit.migration.stop-conditions",
  "audit.manual-ops.upgrade-boundary",
] as const

export const OPERATING_AUDIT_STORAGE_REVIEW_ITEMS = [
  {
    id: "audit.schema.model-review",
    area: "schema",
    status: "review_required",
    label: "OperatingAuditEvent model review",
    requiredDecision:
      "Review the future OperatingAuditEvent Prisma model fields against AUDIT-OPS-001 and AUDIT-OPS-003 before editing schema.prisma.",
    selectedPattern:
      "Use explicit typed columns for actor/action/target/result/source/risk/approval/retention/integrity, plus a redacted metadata JSON field.",
    rejectedAlternatives: [
      "Persist one generic JSON blob only.",
      "Persist raw proof packet bodies.",
      "Use provider or database statement logs as the product audit source of truth.",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
      "src/lib/contracts/operating-audit-event.contract.ts",
      "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
    ],
    acceptanceGate:
      "A future SCH/MIG packet names every persisted field, pii policy, nullability, index, retention class, and rollback behavior before migration apply.",
    verification: ["pnpm audit:ops:check", "pnpm audit:event-builder:check", "pnpm db:validate"],
    stopCondition:
      "Stop before schema edits if field ownership, redaction, retention, or rollback behavior is unclear.",
    riskLevel: "HIGH",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.schema.index-review",
    area: "schema",
    status: "review_required",
    label: "Audit query index review",
    requiredDecision:
      "Select indexes for owner/admin filters without optimizing for unapproved public export or cross-user browsing.",
    selectedPattern:
      "Prefer narrow indexes for occurredAt, moduleKey, actorType, result, riskLevel, approvalLevel, sourceKind, and operationId.",
    rejectedAlternatives: [
      "Add broad indexes for raw metadata search.",
      "Expose audit search before protected read DTO authorization exists.",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
      "https://www.postgresql.org/docs/current/sql-createindex.html",
    ],
    acceptanceGate:
      "Future migration review documents index purpose, query owner, expected filters, write impact, and rollback cost.",
    verification: ["pnpm db:validate", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before index migration if query surfaces or retention limits are not reviewed.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.authz.service-boundary",
    area: "authorization",
    status: "review_required",
    label: "Service-layer authorization boundary",
    requiredDecision:
      "Define who can write audit events and who can read redacted owner/admin audit DTOs before runtime storage exists.",
    selectedPattern:
      "Keep writes inside trusted server-side service boundaries and reads behind requireUser plus owner/admin authorization.",
    rejectedAlternatives: [
      "Let Client Components write audit rows.",
      "Let external agents access the database directly.",
      "Expose public audit exports.",
    ],
    sourceRefs: [
      "AGENTS.md",
      "docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md",
      "https://supabase.com/docs/guides/database/postgres/row-level-security",
      "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
    ],
    acceptanceGate:
      "Future service contract names write callers, read roles, redacted DTO fields, RLS expectations, and owner/admin route guards.",
    verification: ["pnpm auth:boundary", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before runtime reads or writes if requireUser, module authz, owner/admin scope, or RLS stance is unclear.",
    riskLevel: "CRITICAL",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.writer.append-only-boundary",
    area: "writer",
    status: "review_required",
    label: "Append-only writer boundary",
    requiredDecision:
      "Choose append-only create semantics, failure handling, idempotency, and rollback policy before writing persisted audit rows.",
    selectedPattern:
      "Use a dedicated server-only writer that accepts AUDIT-OPS-003 draft envelopes and creates immutable records after validation.",
    rejectedAlternatives: [
      "Allow update/delete audit mutations from ordinary module actions.",
      "Mix audit writes into Client Components.",
      "Silently swallow audit write failures for high-risk operations.",
    ],
    sourceRefs: [
      "src/lib/services/operating-audit-event-builder.ts",
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
      "https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/",
    ],
    acceptanceGate:
      "Future writer contract defines create-only API, idempotency key, failure result, transaction boundary, and blocked update/delete paths.",
    verification: ["pnpm audit:event-builder:check", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before runtime writer if append-only, idempotency, or failure policy would be guessed.",
    riskLevel: "HIGH",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.dto.redaction-boundary",
    area: "read-dto",
    status: "proposal_ready",
    label: "Protected read DTO and redaction boundary",
    requiredDecision:
      "Define owner/admin audit list and detail DTOs that never expose raw claims, tokens, database URLs, raw report bodies, or private source material.",
    selectedPattern:
      "Use redacted list/detail DTOs with filter fields from AUDIT-OPS-001 and metadata summaries only.",
    rejectedAlternatives: [
      "Render raw audit metadata JSON in admin.",
      "Render raw proof packet body text.",
      "Expose audit rows through public routes.",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/ARC-026_admin-settings-audit-bff.md",
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
      "src/lib/services/operating-audit-event-builder.ts",
    ],
    acceptanceGate:
      "Future read DTO contract lists allowed fields, filters, redaction version, pagination, and no-secret exclusions.",
    verification: ["pnpm audit:ops:check", "pnpm launch:history:check"],
    stopCondition:
      "Stop before admin/settings audit UI reads if raw metadata or proof body rendering is needed to make the UI work.",
    riskLevel: "HIGH",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.retention.export-purge-policy",
    area: "retention",
    status: "review_required",
    label: "Retention, export, and purge policy",
    requiredDecision:
      "Review how standard, security, and high-risk audit rows age, export, and purge before persisted storage exists.",
    selectedPattern:
      "Use retention classes from AUDIT-OPS-001 and keep export/purge behind owner/admin review with no public route.",
    rejectedAlternatives: [
      "Keep all audit records forever by default.",
      "Allow public audit export.",
      "Purge high-risk audit records without human review.",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
      "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
    ],
    acceptanceGate:
      "Future retention policy names retention class behavior, export approval, purge review, and proof packet expectations.",
    verification: ["pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before persisted storage if retention or export behavior is omitted.",
    riskLevel: "HIGH",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.integrity.hash-chain-review",
    area: "integrity",
    status: "review_required",
    label: "Tamper-evidence and hash-chain review",
    requiredDecision:
      "Decide whether v0.1 persisted audit stores previousEventHash and eventHash immediately or reserves nullable placeholders until a reviewed integrity pass.",
    selectedPattern:
      "Keep AUDIT-OPS-003 placeholders and require a review before claiming tamper-evidence.",
    rejectedAlternatives: [
      "Claim immutable or tamper-proof audit without hash verification.",
      "Hash raw sensitive payloads.",
      "Use non-deterministic metadata as the canonical integrity input.",
    ],
    sourceRefs: [
      "src/lib/services/operating-audit-event-builder.ts",
      "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
      "https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/",
    ],
    acceptanceGate:
      "Future integrity review names canonical hash input, redaction order, chain scope, backfill strategy, and verification command.",
    verification: ["pnpm audit:event-builder:check", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before claiming tamper-evidence if hash scope or verification is not implemented.",
    riskLevel: "HIGH",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.proof-target.disposable-plan",
    area: "proof-target",
    status: "blocked_until_proof_target",
    label: "Disposable audit storage proof target",
    requiredDecision:
      "Choose an approved local or disposable database proof target before running any audit storage migration or writer proof.",
    selectedPattern:
      "Reuse the Work proof safety model: dry-run first, explicit target, proof marker, write confirmations, cleanup verification, and no valuable database fallback.",
    rejectedAlternatives: [
      "Use the current default database target implicitly.",
      "Run proof writes against a valuable or production database.",
      "Skip cleanup evidence.",
    ],
    sourceRefs: [
      "docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md",
      "scripts/check-work-proof-target-readiness.mjs",
      "scripts/work-proof-local-disposable.mjs",
    ],
    acceptanceGate:
      "Future audit proof runner refuses missing, remote, valuable-looking, or unconfirmed targets and writes a no-secret proof packet.",
    verification: ["pnpm work:proof-target:check", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before any migration or writer proof if proof target and confirmations are missing.",
    riskLevel: "CRITICAL",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.migration.stop-conditions",
    area: "migration",
    status: "review_required",
    label: "Migration stop conditions",
    requiredDecision:
      "Document exactly when a future Prisma migration can be generated, reviewed, applied, or refused.",
    selectedPattern:
      "Use a formal SCH/MIG review before any schema edit, then apply migrations only through approved non-valuable targets and CI/deploy paths.",
    rejectedAlternatives: [
      "Run migration apply from an ambiguous local shell.",
      "Use db push as the audit migration path.",
      "Apply migration before service authorization and proof target are approved.",
    ],
    sourceRefs: [
      "docs/02_architecture-and-rules/MIG-001_database-migration-strategy.md",
      "https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate",
      "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
    ],
    acceptanceGate:
      "Future migration task records generated SQL, review owner, target class, rollback, and proof command before any apply.",
    verification: ["pnpm db:validate", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before migration apply if target class, SQL review, rollback, or authz proof is missing.",
    riskLevel: "CRITICAL",
    humanApprovalRequired: true,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
  {
    id: "audit.manual-ops.upgrade-boundary",
    area: "manual-ops",
    status: "proposal_ready",
    label: "Manual Ops to formal level boundary",
    requiredDecision:
      "Keep Manual Ops evidence separate from formal launch-level upgrade until owner-run auth, Work, deployment, and storage proof packets exist.",
    selectedPattern:
      "Use M1 as conditional operator readiness and keep formal launchLevels.current at L0 until evidence is collected.",
    rejectedAlternatives: [
      "Upgrade formal L1 from static audit contracts.",
      "Treat owner-run commands as passed before the owner runs them.",
      "Claim persisted audit storage from a review packet.",
    ],
    sourceRefs: [
      "docs/08_acceptance-and-qa/ACC-007_manual-ops-conditional-launch-gate.md",
      "docs/2_agent-input/generated/agent-loop/reports/personal-os-manual-ops-001-20260622-conditional-launch-gate.md",
      "docs/2_agent-input/generated/agent-loop/loop-state.json",
    ],
    acceptanceGate:
      "Loop state may report M1 Manual Ops but must not upgrade formal L1/L3/L4 until owner/operator evidence exists.",
    verification: ["pnpm launch:manual-ops", "pnpm audit:storage-review:check"],
    stopCondition:
      "Stop before launch-level upgrade if delegated owner evidence has not been run or supplied.",
    riskLevel: "MEDIUM",
    humanApprovalRequired: false,
    schemaMigrationAllowed: false,
    runtimeWriteAllowed: false,
    databaseReadAllowed: false,
    databaseWriteAllowed: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    publicOutputAllowed: false,
    externalRegisterable: false,
    persistedAuditRowsCreated: false,
  },
] as const satisfies readonly OperatingAuditStorageReviewItem[]

const proposalReadyCount = OPERATING_AUDIT_STORAGE_REVIEW_ITEMS.filter(
  (item) => item.status === "proposal_ready"
).length

const reviewRequiredCount = OPERATING_AUDIT_STORAGE_REVIEW_ITEMS.filter(
  (item) => item.status === "review_required"
).length

const blockedUntilProofTargetCount = OPERATING_AUDIT_STORAGE_REVIEW_ITEMS.filter(
  (item) => item.status === "blocked_until_proof_target"
).length

export const OPERATING_AUDIT_STORAGE_REVIEW_CONTRACT = {
  id: "AUDIT-OPS-004",
  version: "0.1.0",
  status: "ready_for_storage_review_packet",
  visibility: "protected_owner_admin_only",
  sourceBasis: [
    "AUDIT-OPS-001",
    "AUDIT-OPS-002",
    "AUDIT-OPS-003",
    "MANUAL-OPS-001",
    "OWASP Logging Cheat Sheet",
    "Prisma Migrate deploy docs",
    "Supabase/Postgres RLS docs",
  ],
  requiredReviewIds: OPERATING_AUDIT_STORAGE_REVIEW_REQUIRED_IDS,
  items: OPERATING_AUDIT_STORAGE_REVIEW_ITEMS,
  summary: {
    itemCount: OPERATING_AUDIT_STORAGE_REVIEW_ITEMS.length,
    proposalReadyCount,
    reviewRequiredCount,
    blockedUntilProofTargetCount,
    highRiskCount: OPERATING_AUDIT_STORAGE_REVIEW_ITEMS.filter(
      (item) => item.riskLevel === "HIGH" || item.riskLevel === "CRITICAL"
    ).length,
    humanApprovalRequiredCount: OPERATING_AUDIT_STORAGE_REVIEW_ITEMS.filter(
      (item) => item.humanApprovalRequired
    ).length,
    runtimeAuditStorageImplemented: false,
    schemaMigrationImplemented: false,
    routeHandlerAdded: false,
    serverActionAdded: false,
    databaseReadPerformed: false,
    databaseWriteAdded: false,
    publicOutputAdded: false,
    externalRegistrationEnabled: false,
    directDatabaseAccessByExternalAgents: false,
    persistedAuditRowsCreated: false,
    externalRegisterable: false,
    nextTask:
      "Create a reviewed SCH/MIG packet for OperatingAuditEvent persistence only after proof target, authorization, retention, DTO, and migration stop conditions are approved.",
  },
} as const satisfies OperatingAuditStorageReviewContract
