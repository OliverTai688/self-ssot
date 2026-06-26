export type AIInputSourceWorkflowPersistenceSequenceGateId =
  | "proof-target-readiness"
  | "schema-migration-draft"
  | "service-authz-runtime"
  | "rls-policy-review"
  | "audit-storage-proof"
  | "proof-runner"
  | "connector-runtime-approval"
  | "formal-mode-cutover";

export type AIInputSourceWorkflowPersistenceSequenceState =
  | "complete_boundary"
  | "blocked_manual_ops"
  | "ready_for_create_only_task"
  | "blocked_until_prior_gate"
  | "human_approval_required";

export type AIInputSourceWorkflowPersistenceSequenceArea =
  | "proof-target"
  | "schema-migration"
  | "service-authorization"
  | "row-level-security"
  | "operating-audit"
  | "proof-runner"
  | "connector-runtime"
  | "formal-cutover";

export type AIInputSourceWorkflowPersistenceSequenceGate = {
  readonly id: AIInputSourceWorkflowPersistenceSequenceGateId;
  readonly taskId: "DATTR-024G-CONTRACT";
  readonly order: number;
  readonly area: AIInputSourceWorkflowPersistenceSequenceArea;
  readonly title: string;
  readonly currentState: AIInputSourceWorkflowPersistenceSequenceState;
  readonly selectedPattern: string;
  readonly rejectedPatterns: readonly string[];
  readonly requiredEvidence: readonly string[];
  readonly ownerOrAgentAction: string;
  readonly acceptanceGate: string;
  readonly verification: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly stopConditions: readonly string[];
  readonly nextTask:
    | "DATTR-024H-MIGRATION-DRAFT"
    | "DATTR-024I-PROOF-RUNNER"
    | "DATTR-024J-SERVICE-AUTHZ-RUNTIME"
    | "DATTR-024K-RLS-AUDIT-STORAGE"
    | "DATTR-024L-CONNECTOR-RUNTIME"
    | "DATTR-024";
};

const AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS = [
  "No route handler in DATTR-024G-CONTRACT.",
  "No server action in DATTR-024G-CONTRACT.",
  "No Prisma schema edit in DATTR-024G-CONTRACT.",
  "No migration create/apply in DATTR-024G-CONTRACT.",
  "No seed change in DATTR-024G-CONTRACT.",
  "No DB read/write in DATTR-024G-CONTRACT.",
  "No connector runtime in DATTR-024G-CONTRACT.",
  "No provider data read in DATTR-024G-CONTRACT.",
  "No public output expansion in DATTR-024G-CONTRACT.",
  "No module final write in DATTR-024G-CONTRACT.",
  "No external collaboration in DATTR-024G-CONTRACT.",
  "No external agent database access in DATTR-024G-CONTRACT.",
  "externalRegisterable: false.",
] as const;

const AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/06_audits-and-reports/RPT-024_loop-109-dattr-024-persistence-gap-review.md",
] as const;

const AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_OFFICIAL_REFS = [
  "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
  "https://supabase.com/docs/guides/local-development",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://supabase.com/docs/guides/database/vault",
  "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_REQUIRED_GATE_IDS = [
  "proof-target-readiness",
  "schema-migration-draft",
  "service-authz-runtime",
  "rls-policy-review",
  "audit-storage-proof",
  "proof-runner",
  "connector-runtime-approval",
  "formal-mode-cutover",
] as const satisfies readonly AIInputSourceWorkflowPersistenceSequenceGateId[];

export const AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_GATES = [
  {
    id: "proof-target-readiness",
    taskId: "DATTR-024G-CONTRACT",
    order: 1,
    area: "proof-target",
    title: "Confirm a disposable or local Source Workflow proof target before writes",
    currentState: "complete_boundary",
    selectedPattern:
      "Reuse the DATTR-024C proof-target boundary and keep owner/operator proof target evidence as Manual Ops until a safe local/disposable target is supplied.",
    rejectedPatterns: [
      "Run AI Input persistence against the existing Supabase database without a proof marker.",
      "Treat Work proof target readiness as automatically valid for AI Input Source Workflow writes.",
    ],
    requiredEvidence: [
      "pnpm ai-input:proof-target:check reports the boundary contract is valid.",
      "A future proof-runner must refuse missing, remote-looking, valuable-looking, or unconfirmed targets.",
    ],
    ownerOrAgentAction:
      "Owner supplies a disposable/local target only when ready; agents may continue with create-only artifacts that do not connect to the DB.",
    acceptanceGate: "ACC-006 remains the proof-target gate before DATTR-024 proof writes.",
    verification: ["pnpm ai-input:proof-target:check", "pnpm ai-input:persistence-sequence:check"],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
      "https://supabase.com/docs/guides/local-development",
    ],
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024H-MIGRATION-DRAFT",
  },
  {
    id: "schema-migration-draft",
    taskId: "DATTR-024G-CONTRACT",
    order: 2,
    area: "schema-migration",
    title: "Draft the Source Workflow Prisma migration without applying it",
    currentState: "ready_for_create_only_task",
    selectedPattern:
      "Next implementation should create a reviewed schema and create-only migration draft for SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, SourceNamingProfile, DataUnitProposal, and ModuleWriteIntent before runtime services.",
    rejectedPatterns: [
      "Implement service runtime against proposal-only schema docs.",
      "Apply a migration to a valuable database before reviewer acceptance and proof target classification.",
    ],
    requiredEvidence: [
      "DATTR-024H-MIGRATION-DRAFT must update Prisma schema and migration artifacts for Source Workflow objects plus OperatingAuditEvent refs only after inspecting existing models.",
      "The draft must keep migration apply, seed changes, connector runtime, and valuable DB writes blocked.",
    ],
    ownerOrAgentAction:
      "Agent may draft a create-only migration in a future loop; owner/human review remains required before apply.",
    acceptanceGate:
      "Migration draft is accepted only when schema, indexes, ownership fields, retention/redaction fields, audit refs, and rollback notes are reviewable.",
    verification: [
      "pnpm db:validate",
      "pnpm db:generate",
      "pnpm exec tsc --noEmit --pretty false",
      "git diff --check",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
      "https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production",
    ],
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024H-MIGRATION-DRAFT",
  },
  {
    id: "service-authz-runtime",
    taskId: "DATTR-024G-CONTRACT",
    order: 3,
    area: "service-authorization",
    title: "Implement service authorization only after the schema draft exists",
    currentState: "blocked_until_prior_gate",
    selectedPattern:
      "Use DATTR-024F operation ids as the service runtime contract after schema names and ownership fields are concrete.",
    rejectedPatterns: [
      "Build a route handler or server action before schema ownership and RLS decisions are known.",
      "Let Client Components consume Prisma rows, connector payloads, profile IDs, or raw database identifiers.",
    ],
    requiredEvidence: [
      "Future service uses requireUser(), ownerProfileId, service-layer authorization, and UI-safe mappers.",
      "Future service runtime writes remain proposal-only unless proof target, RLS, audit, and approval gates pass.",
    ],
    ownerOrAgentAction:
      "Agent implements protected loader/service slices only after DATTR-024H creates reviewable schema names.",
    acceptanceGate: "DATTR-024F operation contract remains the service authorization acceptance base.",
    verification: [
      "pnpm ai-input:service-authz:check",
      "pnpm audit:event-builder:check",
      "pnpm exec tsc --noEmit --pretty false",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
      "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
    ],
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024J-SERVICE-AUTHZ-RUNTIME",
  },
  {
    id: "rls-policy-review",
    taskId: "DATTR-024G-CONTRACT",
    order: 4,
    area: "row-level-security",
    title: "Review row-level security and ownership policies before valuable DB use",
    currentState: "blocked_until_prior_gate",
    selectedPattern:
      "Design owner-scoped RLS and service authorization together, using application authz as the main boundary and PostgreSQL/Supabase RLS as defense-in-depth for future persisted tables.",
    rejectedPatterns: [
      "Rely only on UI route protection for Source Workflow data.",
      "Expose external agents to direct database policies or direct table access.",
    ],
    requiredEvidence: [
      "Future RLS review names owner columns, service role expectations, policy boundaries, and test cases.",
      "Future proof target checks include cross-owner denial or equivalent static proof where runtime DB is unavailable.",
    ],
    ownerOrAgentAction:
      "Agent writes RLS review artifacts after schema draft; owner approves any production policy apply.",
    acceptanceGate: "RLS proof remains separate from formal launch level until owner/operator evidence exists.",
    verification: ["pnpm db:validate", "pnpm ai-input:persistence-sequence:check"],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
      "https://supabase.com/docs/guides/database/postgres/row-level-security",
      "https://www.postgresql.org/docs/current/ddl-rowsecurity.html",
    ],
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024K-RLS-AUDIT-STORAGE",
  },
  {
    id: "audit-storage-proof",
    taskId: "DATTR-024G-CONTRACT",
    order: 5,
    area: "operating-audit",
    title: "Wire Source Workflow changes to operating audit storage after audit storage is approved",
    currentState: "blocked_until_prior_gate",
    selectedPattern:
      "Use the existing audit event envelope builder for draft events first, then persist audit rows only after AUDIT-OPS storage review and Source Workflow schema gates align.",
    rejectedPatterns: [
      "Persist Source Workflow writes without operating audit refs.",
      "Persist audit rows before retention, redaction, export, purge, and integrity review are accepted.",
    ],
    requiredEvidence: [
      "DATTR-024 writes produce redacted draft audit envelopes before persisted audit storage exists.",
      "Persisted audit storage remains blocked until AUDIT-OPS-004 follow-up approval.",
    ],
    ownerOrAgentAction:
      "Agent can use audit draft builders in future runtime slices; persisted audit rows require a separate storage proof.",
    acceptanceGate: "DBS-006 and AUDIT-OPS-004 remain the audit storage acceptance base.",
    verification: [
      "pnpm audit:event-builder:check",
      "pnpm audit:storage-review:check",
      "pnpm ai-input:persistence-sequence:check",
    ],
    sourceRefs: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024K-RLS-AUDIT-STORAGE",
  },
  {
    id: "proof-runner",
    taskId: "DATTR-024G-CONTRACT",
    order: 6,
    area: "proof-runner",
    title: "Run a dry-run-first Source Workflow proof runner after schema and target gates",
    currentState: "blocked_until_prior_gate",
    selectedPattern:
      "Build a runner that defaults to dry-run, refuses unsafe targets, applies only reviewed migration artifacts to disposable/local targets, inserts synthetic proof rows, verifies owner-scoped reads, and cleans up.",
    rejectedPatterns: [
      "Use production Supabase for first proof writes.",
      "Run proof writes before schema draft and target classification are both accepted.",
    ],
    requiredEvidence: [
      "Future proof-runner emits no-secret JSON and records target classification, migration action, write confirmation, cleanup, and pass/fail signals.",
      "Future proof-runner uses transactions where safe and compensating cleanup where transaction scope cannot cover migration behavior.",
    ],
    ownerOrAgentAction:
      "Agent implements runner only after DATTR-024H; owner supplies target and confirmations when ready.",
    acceptanceGate: "Runner pass remains proof evidence, not formal L1/L3/L4, until auth and deployment evidence also pass.",
    verification: [
      "pnpm ai-input:proof-target:check",
      "pnpm ai-input:schema-review:check",
      "pnpm ai-input:persistence-sequence:check",
    ],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
      ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_OFFICIAL_REFS,
    ],
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024I-PROOF-RUNNER",
  },
  {
    id: "connector-runtime-approval",
    taskId: "DATTR-024G-CONTRACT",
    order: 7,
    area: "connector-runtime",
    title: "Keep provider connector runtime behind consent, secret, and replay gates",
    currentState: "human_approval_required",
    selectedPattern:
      "Treat OAuth, webhook, polling, provider API, file ingestion, OCR, transcription, and raw adapter payload handling as separate connector-runtime approval after storage and proof-runner pass.",
    rejectedPatterns: [
      "Use real provider data as the first persistence proof.",
      "Store provider secrets or raw payloads in Source Workflow tables before Vault/secret separation review.",
    ],
    requiredEvidence: [
      "DATTR-024E connector boundary remains complete and must be expanded only with human approval.",
      "Future connector runtime separates secrets from Source Workflow rows and preserves retention/deletion policy.",
    ],
    ownerOrAgentAction:
      "Owner/human approval required before provider runtime, webhook endpoints, OAuth flows, or secret storage changes.",
    acceptanceGate: "Connector runtime remains out of scope for DATTR-024H/DATTR-024I.",
    verification: ["pnpm ai-input:connector-boundary:check", "pnpm ai-input:persistence-sequence:check"],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
      "https://supabase.com/docs/guides/database/vault",
    ],
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024L-CONNECTOR-RUNTIME",
  },
  {
    id: "formal-mode-cutover",
    taskId: "DATTR-024G-CONTRACT",
    order: 8,
    area: "formal-cutover",
    title: "Cut formal AI Input mode to DB-backed Source Workflow only after proof gates",
    currentState: "blocked_until_prior_gate",
    selectedPattern:
      "Keep formal mode honest with unavailable/empty state until schema, proof-runner, service authz, RLS/audit, and connector boundary gates are satisfied.",
    rejectedPatterns: [
      "Silently re-enable mock Source Workflow data in formal mode.",
      "Claim DATTR-024 complete from contract-only or delegated evidence.",
    ],
    requiredEvidence: [
      "Future UI cutover proves no hidden mock fallback and maps persisted rows through UI-safe DTOs.",
      "Formal launch remains L0 until AUTH-005, WORK-009 or WORK-007, and DEPLOY-002 evidence exists.",
    ],
    ownerOrAgentAction:
      "Agent may implement DB-backed formal read/write slices after proof gates; owner still performs launch evidence checks.",
    acceptanceGate: "DATTR-024 is complete only when persistence, authz, audit, and formal-mode no-mock checks pass.",
    verification: [
      "pnpm ai-input:source-control:check",
      "pnpm ai-input:service-authz:check",
      "pnpm ai-input:persistence-sequence:check",
      "pnpm exec tsc --noEmit --pretty false",
    ],
    sourceRefs: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
    stopConditions: AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
] as const satisfies readonly AIInputSourceWorkflowPersistenceSequenceGate[];

export const AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_SOURCE_REFS = [
  ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_LOCAL_REFS,
  ...AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_OFFICIAL_REFS,
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_SUMMARY = {
  taskId: "DATTR-024G-CONTRACT",
  status: "ready_for_persistence_sequence_use",
  mode: "sequence_gate_only_no_runtime",
  selectedNextImplementationTask: "DATTR-024H-MIGRATION-DRAFT",
  rationale:
    "After DATTR-024A/B/C/D/E/F, the shortest safe path is a create-only schema and migration draft before service runtime, RLS/audit proof, proof-runner writes, connector runtime, or formal DB cutover.",
  formalLaunchLevelUnchanged: true,
  conditionalManualOpsUnchanged: true,
  conditionalProductMaturityUnchanged: true,
  routeHandlerAllowed: false,
  serverActionAllowedInDattr024gContract: false,
  schemaWriteAllowedInDattr024gContract: false,
  migrationCreateAllowedInDattr024gContract: false,
  migrationApplyAllowed: false,
  seedChangeAllowed: false,
  runtimeReadAllowed: false,
  runtimeWriteAllowed: false,
  proofWritesAllowedInDattr024gContract: false,
  connectorRuntimeAllowed: false,
  providerDataAllowed: false,
  publicOutputAllowed: false,
  moduleFinalWriteAllowed: false,
  externalCollaborationAllowed: false,
  externalAgentDatabaseAccessAllowed: false,
  externalRegisterable: false,
  nandaPosture:
    "AI Input Source Workflow remains protected-owner/internal only; no public endpoint, registry submission, external adapter, direct external agent DB access, or external registration is allowed.",
  ownerEvidenceHandoff:
    "Owner can continue to run AUTH-005, WORK-009, OWNER-UI-REVIEW, and DEPLOY-002 checks separately; DATTR-024G does not claim delegated evidence.",
} as const;
