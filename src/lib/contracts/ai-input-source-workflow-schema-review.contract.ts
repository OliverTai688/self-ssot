export type AIInputSourceWorkflowSchemaObjectId =
  | "SourceConnection"
  | "SourceAsset"
  | "AIWorkflowRun"
  | "AIWorkItem"
  | "DataUnitProposal"
  | "ModuleWriteIntent"
  | "OperatingAuditEvent";

export type AIInputSourceWorkflowSchemaReviewStatus =
  | "reviewed_proposal_only"
  | "requires_create_only_migration_review"
  | "requires_disposable_db_proof"
  | "human_approval_required";

export type AIInputSourceWorkflowSchemaReviewObject = {
  readonly id: AIInputSourceWorkflowSchemaObjectId;
  readonly tableNameProposal: string;
  readonly status: AIInputSourceWorkflowSchemaReviewStatus;
  readonly purpose: string;
  readonly ownerScope: string;
  readonly authBoundary: string;
  readonly retentionBoundary: string;
  readonly redactionBoundary: string;
  readonly auditEvents: readonly string[];
  readonly recommendedIndexes: readonly string[];
  readonly dependencies: readonly string[];
  readonly proofNeed: string;
  readonly stopConditions: readonly string[];
};

export const AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_OBJECTS = [
  {
    id: "SourceConnection",
    tableNameProposal: "source_connections",
    status: "reviewed_proposal_only",
    purpose:
      "Owner-scoped source endpoint, consent, connector type, and sync policy record for AI Input intake.",
    ownerScope:
      "Must carry ownerProfileId and never expose provider credentials or raw secrets in UI-visible contracts.",
    authBoundary:
      "All read/write paths require requireUser() plus service-layer authorization before connector metadata is returned.",
    retentionBoundary:
      "Retention class must be explicit per connection; revocation stops future sync and schedules cleanup work.",
    redactionBoundary:
      "Secret material stays outside normal rows; use secretRef/providerRef only and keep redactionVersion on exported views.",
    auditEvents: [
      "ai-input.source-workflow.connection.reviewed",
      "ai-input.source-workflow.connection.blocked",
    ],
    recommendedIndexes: [
      "ownerProfileId",
      "ownerProfileId + sourceType",
      "ownerProfileId + status",
    ],
    dependencies: ["Profile"],
    proofNeed:
      "Create-only migration review must prove no provider secret is stored in regular JSON payload fields.",
    stopConditions: [
      "No Prisma schema edit or migration apply in DATTR-024B.",
      "No connector runtime or external provider call in DATTR-024B.",
    ],
  },
  {
    id: "SourceAsset",
    tableNameProposal: "source_assets",
    status: "reviewed_proposal_only",
    purpose:
      "Canonical owner-scoped source object registry for files, URLs, notes, records, and imported raw items.",
    ownerScope:
      "Must carry ownerProfileId and optional sourceConnectionId; cross-module links remain derived proposals until approved.",
    authBoundary:
      "All asset loaders require requireUser(), ownerProfileId scoping, and module-specific service-layer authorization.",
    retentionBoundary:
      "SourceAsset must include retentionClass, sourceState, and deletion/revocation markers before DB-backed intake.",
    redactionBoundary:
      "UI view models return snippets, checksums, source IDs, and metadata, not raw private payload by default.",
    auditEvents: [
      "ai-input.source-workflow.asset.reviewed",
      "ai-input.source-workflow.asset.blocked",
    ],
    recommendedIndexes: [
      "ownerProfileId",
      "ownerProfileId + sourceState",
      "sourceConnectionId",
      "contentHash",
    ],
    dependencies: ["Profile", "SourceConnection"],
    proofNeed:
      "Disposable proof target must show owner-scoped asset insert/read/delete with raw payload withheld from normal UI contracts.",
    stopConditions: [
      "No runtime DB read/write in DATTR-024B.",
      "No public output route may expose SourceAsset data before client visibility rules exist.",
    ],
  },
  {
    id: "AIWorkflowRun",
    tableNameProposal: "ai_workflow_runs",
    status: "reviewed_proposal_only",
    purpose:
      "Bounded workflow execution envelope for source intake, extraction, normalization, proposal creation, and review.",
    ownerScope:
      "Must carry ownerProfileId, initiatedByActorId, and sourceAsset/sourceConnection references when applicable.",
    authBoundary:
      "Run creation requires requireUser() and service-layer authorization; agent-triggered runs remain internal runtime only.",
    retentionBoundary:
      "Run logs use bounded retention and preserve source IDs, model/provider refs, and proof refs without raw prompt sprawl.",
    redactionBoundary:
      "Prompt, output, and error summaries need redactionVersion and sensitive fragment withholding in owner-visible views.",
    auditEvents: [
      "ai-input.source-workflow.run.reviewed",
      "ai-input.source-workflow.run.blocked",
    ],
    recommendedIndexes: [
      "ownerProfileId",
      "ownerProfileId + status",
      "sourceAssetId",
      "createdAt",
    ],
    dependencies: ["Profile", "SourceAsset", "SourceConnection"],
    proofNeed:
      "Disposable proof target must keep interactive transactions short and keep workflow state transitions auditable.",
    stopConditions: [
      "No long-running transaction design accepted without retry/timeout policy.",
      "No autonomous final module write from an AIWorkflowRun.",
    ],
  },
  {
    id: "AIWorkItem",
    tableNameProposal: "ai_work_items",
    status: "reviewed_proposal_only",
    purpose:
      "Queueable unit of AI workflow work with bounded input, output refs, retry state, and review status.",
    ownerScope:
      "Must carry ownerProfileId and parent AIWorkflowRun relation; work item visibility follows the parent run.",
    authBoundary:
      "Owner/admin views use service-layer authorization; worker adapters receive scoped context packages, not database access.",
    retentionBoundary:
      "Work item payloads must separate durable metadata from expiring raw inputs and intermediate outputs.",
    redactionBoundary:
      "Worker output summaries must be redacted before owner-visible review surfaces and audit evidence files.",
    auditEvents: [
      "ai-input.source-workflow.work-item.reviewed",
      "ai-input.source-workflow.work-item.blocked",
    ],
    recommendedIndexes: [
      "ownerProfileId",
      "aiWorkflowRunId",
      "status + priority",
      "nextAttemptAt",
    ],
    dependencies: ["Profile", "AIWorkflowRun"],
    proofNeed:
      "Proof must demonstrate retry/claim boundaries without creating external agent database access.",
    stopConditions: [
      "No external agent direct DB access.",
      "No unbounded retries, payload growth, or invisible background writes.",
    ],
  },
  {
    id: "DataUnitProposal",
    tableNameProposal: "data_unit_proposals",
    status: "reviewed_proposal_only",
    purpose:
      "Human-reviewable normalized proposal produced from source evidence before it becomes a module write intent.",
    ownerScope:
      "Must carry ownerProfileId, sourceAssetId, and provenance refs so proposal ownership and source lineage remain inspectable.",
    authBoundary:
      "Proposal review requires requireUser(), ownerProfileId scoping, and target module permission checks before promotion.",
    retentionBoundary:
      "Rejected proposals retain minimal reason/provenance while expiring raw extracted payload according to retentionClass.",
    redactionBoundary:
      "Proposal view models expose field-level confidence, source evidence IDs, and redactionVersion before user approval.",
    auditEvents: [
      "ai-input.source-workflow.proposal.reviewed",
      "ai-input.source-workflow.proposal.blocked",
    ],
    recommendedIndexes: [
      "ownerProfileId",
      "sourceAssetId",
      "targetModule + status",
      "createdAt",
    ],
    dependencies: ["Profile", "SourceAsset", "AIWorkflowRun", "AIWorkItem"],
    proofNeed:
      "Proof must show proposal-only behavior: no target module row is changed until explicit owner approval exists.",
    stopConditions: [
      "No hidden persistence of accepted-looking demo data.",
      "No final writes into high-risk modules.",
    ],
  },
  {
    id: "ModuleWriteIntent",
    tableNameProposal: "module_write_intents",
    status: "reviewed_proposal_only",
    purpose:
      "Explicit approval-bound envelope for converting a reviewed DataUnitProposal into a target module write.",
    ownerScope:
      "Must carry ownerProfileId, approverActorId when approved, targetModule, targetRecordRef, and source proposal lineage.",
    authBoundary:
      "Promotion requires requireUser(), target module service-layer authorization, and high-risk human approval where required.",
    retentionBoundary:
      "Intent rows preserve decision state, rollback refs, and proof refs even when raw proposal payload expires.",
    redactionBoundary:
      "Public/client-visible outputs require an explicit clientVisible decision and redacted payload review before exposure.",
    auditEvents: [
      "ai-input.source-workflow.write-intent.reviewed",
      "ai-input.source-workflow.write-intent.blocked",
    ],
    recommendedIndexes: [
      "ownerProfileId",
      "dataUnitProposalId",
      "targetModule + status",
      "approvedAt",
    ],
    dependencies: ["Profile", "DataUnitProposal", "OperatingAuditEvent"],
    proofNeed:
      "Proof must show proposal-to-intent transition without executing final module writes in this slice.",
    stopConditions: [
      "Finance, Life, Client Portal, Company Strategy, Auth/Permission, public output, and external collaboration writes require human approval.",
      "externalRegisterable: false remains mandatory for agent-related write paths.",
    ],
  },
  {
    id: "OperatingAuditEvent",
    tableNameProposal: "operating_audit_events",
    status: "reviewed_proposal_only",
    purpose:
      "Append-only operating evidence envelope for source workflow review, block, proof, approval, rejection, and rollback events.",
    ownerScope:
      "Must carry ownerProfileId where an owner context exists and use subject refs for SourceAsset, proposal, and write intent lineage.",
    authBoundary:
      "Audit writes happen inside approved services; reads are owner/admin scoped and sensitive payloads are redacted.",
    retentionBoundary:
      "Event retention class, hash/checksum, and proof artifact refs must be explicit before DB-backed audit storage.",
    redactionBoundary:
      "Audit payload summaries cannot include provider secrets, raw private source data, or unredacted model prompts.",
    auditEvents: [
      "ai-input.source-workflow.audit.reviewed",
      "ai-input.source-workflow.audit.blocked",
    ],
    recommendedIndexes: [
      "ownerProfileId",
      "eventFamily + action",
      "subjectType + subjectId",
      "createdAt",
    ],
    dependencies: ["Profile"],
    proofNeed:
      "Proof must align with DBS-006 append-only semantics and avoid editable evidence records.",
    stopConditions: [
      "No audit event expansion without redaction and retention rules.",
      "No public audit payload exposure.",
    ],
  },
] as const satisfies readonly AIInputSourceWorkflowSchemaReviewObject[];

export const AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_MIGRATION_PLAN = {
  id: "DATTR-024B",
  status: "reviewed_proposal_only",
  schemaDocument: "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  sourceArchitecture: [
    "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
    "docs/02_architecture-and-rules/DBS-002_source-workflow-schema-contract.md",
    "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
    "docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md",
    "docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md",
  ],
  stages: [
    {
      id: "DATTR-024B.review",
      result:
        "Produce schema review packet, object matrix, safety gates, and machine-checkable no-write proof.",
      allowed: ["contract file", "formal SCH doc", "static checker", "acceptance/backlog updates"],
      forbidden: ["Prisma schema edit", "migration apply", "runtime DB read/write", "connector runtime"],
    },
    {
      id: "DATTR-024C.proof-target",
      result:
        "Prepare disposable proof database target boundary, write confirmations, cleanup criteria, and rollback checklist.",
      allowed: ["proof target checklist", "create-only migration review draft", "static guardrails"],
      forbidden: ["valuable database write", "provider sync", "public output expansion"],
    },
    {
      id: "DATTR-024D.owner-review",
      result:
        "Owner reviews generated proposal and approves or rejects module write intent shape.",
      allowed: ["review UI/BFF proposal", "audit event proposal", "manual approval evidence"],
      forbidden: ["silent module final write", "high-risk module write without approval"],
    },
  ],
  officialReferences: [
    "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
    "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
    "https://supabase.com/docs/guides/database/postgres/row-level-security",
    "https://supabase.com/docs/guides/database/vault",
    "https://www.postgresql.org/docs/current/ddl-constraints.html",
  ],
} as const;

export const AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_SUMMARY = {
  id: "DATTR-024B",
  status: "reviewed_proposal_only",
  launchLevelDelta:
    "Turns AI Input Source Workflow from broad schema intent into a reviewed, object-level, no-write implementation boundary.",
  requiredObjects: AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_OBJECTS.map((object) => object.id),
  nextRunnableSlice: "DATTR-024C",
  nandaAlignment:
    "Internal runtime/proposal-only agent workflow; externalRegisterable: false until endpoint, auth, trust, permission, rollback, observability, and human approval gates are complete.",
  safetyGuards: {
    schemaWriteAllowed: false,
    migrationApplyAllowed: false,
    runtimeReadAllowed: false,
    runtimeWriteAllowed: false,
    connectorRuntimeAllowed: false,
    publicOutputExpansionAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
  },
  requiredRuntimeGatesBeforeDBBackedSlice: [
    "ownerProfileId on all owner-scoped source workflow rows",
    "requireUser() at every BFF/server action entry",
    "service-layer authorization before every source, proposal, or write-intent read/write",
    "retentionClass and redactionVersion on view-model-visible source/proposal/audit payloads",
    "ai-input.source-workflow OperatingAuditEvent family for review, blocked, approved, rejected, proof, and rollback events",
    "create-only migration review before any migration apply",
    "disposable proof database target plus explicit write confirmations before test data writes",
  ],
} as const;
