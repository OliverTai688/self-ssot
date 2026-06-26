export type AIInputSourceWorkflowProofTargetArea =
  | "target-selection"
  | "write-confirmation"
  | "migration-boundary"
  | "data-isolation"
  | "cleanup-rollback"
  | "audit-proof"
  | "secret-redaction"
  | "rls-authz"
  | "transaction-behavior"
  | "stop-condition";

export type AIInputSourceWorkflowProofTargetRequirement = {
  readonly area: AIInputSourceWorkflowProofTargetArea;
  readonly status: "boundary_ready_no_write";
  readonly requirement: string;
  readonly acceptance: readonly string[];
  readonly rejects: readonly string[];
};

export const AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_ENV = {
  targetUrl: "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL",
  allowWrites: "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1",
  confirmation: "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
  allowRemoteDisposable: "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1",
  safeDatabaseNamePattern:
    "ai[_-]?input[_-]?proof|source[_-]?workflow[_-]?proof|disposable|scratch|test|local|tmp",
} as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_REQUIREMENTS = [
  {
    area: "target-selection",
    status: "boundary_ready_no_write",
    requirement:
      "Future AI Input proof writes must use a dedicated local or explicitly approved disposable target, not the normal launch database by accident.",
    acceptance: [
      "Target URL source is AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL.",
      "Local hosts are localhost, 127.0.0.1, or ::1.",
      "Remote targets require PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1 and a disposable/test database-name marker.",
      "The proof packet must never print database URL, database host, credentials, cookies, tokens, profile IDs, or source payload bodies.",
    ],
    rejects: [
      "Implicit DATABASE_URL writes.",
      "Unmarked remote target writes.",
      "Valuable Supabase project writes without explicit human approval.",
    ],
  },
  {
    area: "write-confirmation",
    status: "boundary_ready_no_write",
    requirement:
      "A future proof runner must stay dry-run-only unless the operator supplies an explicit run flag and two write confirmations.",
    acceptance: [
      "--run is required before any future proof write.",
      "PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1 is required.",
      "PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA is required.",
      "Dry-run output is valid setup evidence but not persistence proof.",
    ],
    rejects: [
      "Writes from default command invocation.",
      "Writes from a single env flag.",
      "Writes when target classification is missing or unsafe.",
    ],
  },
  {
    area: "migration-boundary",
    status: "boundary_ready_no_write",
    requirement:
      "DATTR-024C defines proof-target rules only; migration apply remains blocked until a reviewed create-only migration and approved target exist.",
    acceptance: [
      "Prisma create-only migration review is allowed as a future artifact.",
      "No migration apply is part of DATTR-024C.",
      "A future setup step may run pnpm db:deploy only when all proof target gates pass.",
      "Production or valuable database deploy remains human approval required.",
    ],
    rejects: [
      "prisma migrate dev against production.",
      "prisma migrate reset against valuable data.",
      "db push as a persistence shortcut.",
    ],
  },
  {
    area: "data-isolation",
    status: "boundary_ready_no_write",
    requirement:
      "Future proof data must be synthetic, marker-scoped, owner-scoped, and removable without touching real source data.",
    acceptance: [
      "Proof marker prefix is AI-INPUT-SOURCE-WORKFLOW-PROOF.",
      "Synthetic owner email uses example.invalid.",
      "All future source workflow rows are linked to the proof ownerProfileId and proof marker.",
      "No provider payload, real customer file, real message, OAuth token, webhook body, or private source material is used.",
    ],
    rejects: [
      "Real provider sync.",
      "Real file ingestion.",
      "Mock rows that look accepted as production data.",
    ],
  },
  {
    area: "cleanup-rollback",
    status: "boundary_ready_no_write",
    requirement:
      "A future proof run must be reversible and verify cleanup by proof marker before it can count as persistence evidence.",
    acceptance: [
      "Cleanup deletes proof-only rows by marker and ownerProfileId.",
      "Cleanup verifies zero remaining proof rows for SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, ModuleWriteIntent, and OperatingAuditEvent.",
      "Rollback instructions name the marker and target classification, not secret connection details.",
      "Failed proof attempts must still attempt cleanup.",
    ],
    rejects: [
      "Manual cleanup by browsing valuable tables.",
      "Leaving proof rows mixed with real owner data.",
      "Printing internal row IDs in public evidence.",
    ],
  },
  {
    area: "audit-proof",
    status: "boundary_ready_no_write",
    requirement:
      "Future proof evidence must map every proof step to the ai-input.source-workflow audit family without claiming persisted audit until schema exists.",
    acceptance: [
      "Required event family is ai-input.source-workflow.",
      "Required proof actions are proof.target_reviewed, proof.started, proof.records_created, proof.reconnected, proof.cleaned_up, and proof.blocked.",
      "OperatingAuditEvent remains append-only and redacted when implemented.",
      "Audit proof refs point to generated no-secret JSON packets.",
    ],
    rejects: [
      "Editable audit evidence.",
      "Audit payloads containing provider secrets or raw private source bodies.",
      "Public audit exposure.",
    ],
  },
  {
    area: "secret-redaction",
    status: "boundary_ready_no_write",
    requirement:
      "Proof output must be no-secret and no-private-source by construction.",
    acceptance: [
      "Excluded values include database URLs, database hosts, credentials, Supabase keys, cookies, tokens, raw claims, provider payloads, source file bodies, profile IDs, and row IDs.",
      "Allowed output is limited to booleans, status labels, counts, object names, marker presence, and next actions.",
      "No raw adapter payload appears in proof JSON or markdown evidence.",
    ],
    rejects: [
      "Connection strings in reports.",
      "Provider object bodies in reports.",
      "User/private source snippets in proof output.",
    ],
  },
  {
    area: "rls-authz",
    status: "boundary_ready_no_write",
    requirement:
      "Disposable proof can test direct service-layer persistence, but it cannot claim browser/API launch readiness without authz and RLS proof.",
    acceptance: [
      "Future BFF entry points require requireUser().",
      "Source workflow service checks ownerProfileId and module permissions.",
      "RLS policies are required before any Supabase-exposed source workflow API path.",
      "Service keys and bypass-RLS roles are never browser/customer exposed.",
    ],
    rejects: [
      "Claiming AUTH-005 from direct DB proof.",
      "Claiming public-safe output from direct DB proof.",
      "Skipping service-layer authorization because proof target is disposable.",
    ],
  },
  {
    area: "transaction-behavior",
    status: "boundary_ready_no_write",
    requirement:
      "Future proof writes should use short, auditable write sequences and avoid long-running transactions.",
    acceptance: [
      "Create/update/read/cleanup steps are bounded and reconnect before read verification.",
      "Any multi-step transaction has a short timeout and explicit retry plan for write conflicts.",
      "No connector fetch, AI model call, OCR, transcription, webhook handling, or external IO runs inside a DB transaction.",
    ],
    rejects: [
      "Long-running interactive transactions.",
      "Parallel work hidden inside one transaction.",
      "External provider calls inside a transaction.",
    ],
  },
  {
    area: "stop-condition",
    status: "boundary_ready_no_write",
    requirement:
      "DATTR-024C must stop before runtime writes unless all target, migration, authz, audit, and approval gates are satisfied.",
    acceptance: [
      "writesAllowedByDefault: false",
      "migrationApplyAllowed: false",
      "valuableDatabaseAllowed: false",
      "providerDataAllowed: false",
      "publicOutputAllowed: false",
      "moduleFinalWriteAllowed: false",
      "externalAgentDatabaseAccessAllowed: false",
      "externalRegisterable: false",
    ],
    rejects: [
      "High-risk module final writes.",
      "External agent direct database access.",
      "Public output expansion before redacted review.",
    ],
  },
] as const satisfies readonly AIInputSourceWorkflowProofTargetRequirement[];

export const AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SEQUENCE = {
  id: "DATTR-024C",
  status: "boundary_ready_no_write",
  futureDryRunCommand: "pnpm ai-input:proof -- --json",
  futureRunCommand:
    "AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL=postgresql://... PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1 PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA pnpm ai-input:proof -- --run",
  futureSetupCommand:
    "pnpm ai-input:proof -- --run --setup against approved disposable/local target only",
  plannedProofSteps: [
    "classify target without printing URL or host",
    "confirm write flags and confirmation phrase",
    "optionally apply reviewed migrations to disposable target",
    "create proof-only Profile/owner context",
    "create proof-only SourceConnection",
    "create proof-only SourceAsset",
    "create proof-only AIWorkflowRun",
    "create proof-only AIWorkItem",
    "create proof-only DataUnitProposal",
    "create proof-only ModuleWriteIntent as proposal-only",
    "record or propose OperatingAuditEvent proof refs",
    "disconnect and reconnect before read verification",
    "verify proof records by marker and ownerProfileId",
    "delete proof-only records by marker and ownerProfileId",
    "verify cleanup count is zero",
  ],
} as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SUMMARY = {
  id: "DATTR-024C",
  status: "boundary_ready_no_write",
  acceptanceDocument: "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  sourceSchemaReview: "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  requiredObjects: AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS,
  requiredEnv: AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_ENV,
  nextRecommendedTask:
    "AUTH-005 or WORK-009 if proof prerequisites appear; otherwise loop 63 should run the RES-001/RES-002 research-to-task cadence before selecting another no-proof slice.",
  nandaAlignment:
    "AI Input source workflow remains internal runtime/proposal-only and protected-owner visible; externalRegisterable: false.",
  safetyGuards: {
    writesAllowedByDefault: false,
    runtimeReadAllowedInDattr024c: false,
    runtimeWriteAllowedInDattr024c: false,
    migrationApplyAllowed: false,
    valuableDatabaseAllowed: false,
    providerDataAllowed: false,
    connectorRuntimeAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
  },
  officialReferences: [
    "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
    "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
    "https://supabase.com/docs/guides/local-development",
    "https://supabase.com/docs/guides/database/postgres/row-level-security",
    "https://www.postgresql.org/docs/current/ddl-constraints.html",
  ],
} as const;
