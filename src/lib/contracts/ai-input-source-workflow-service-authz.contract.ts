export type AIInputSourceWorkflowServiceAuthzObjectId =
  | "SourceConnection"
  | "SourceAsset"
  | "AIWorkflowRun"
  | "AIWorkItem"
  | "SourceNamingProfile"
  | "DataUnitProposal"
  | "ModuleWriteIntent"
  | "OperatingAuditEvent";

export type AIInputSourceWorkflowServiceAuthzOperationId =
  | "ai-input.source-workflow.list"
  | "ai-input.source-workflow.detail"
  | "ai-input.source-connection.review"
  | "ai-input.source-asset.review"
  | "ai-input.workflow-run.review"
  | "ai-input.work-item.review"
  | "ai-input.naming-profile.review"
  | "ai-input.data-unit-proposal.review"
  | "ai-input.module-write-intent.review"
  | "ai-input.connector-consent.review"
  | "ai-input.proof-target.review"
  | "ai-input.audit-lineage.review";

export type AIInputSourceWorkflowServiceAuthzSurface =
  | "ai-input-formal"
  | "admin-operator"
  | "owner-settings"
  | "agent-team-os";

export type AIInputSourceWorkflowServiceAuthzOperationKind =
  | "server-component-loader-contract"
  | "future-server-action-contract"
  | "proof-cli-contract"
  | "operator-approval-contract";

export type AIInputSourceWorkflowServiceAuthzApproval =
  | "OWNER_REVIEW_REQUIRED"
  | "HUMAN_APPROVAL_REQUIRED"
  | "BLOCKED_UNTIL_PROOF_TARGET"
  | "BLOCKED_UNTIL_MIGRATION_REVIEW"
  | "BLOCKED_HIGH_RISK";

export type AIInputSourceWorkflowServiceAuthzOperation = {
  readonly id: AIInputSourceWorkflowServiceAuthzOperationId;
  readonly taskId: "DATTR-024F-CONTRACT";
  readonly title: string;
  readonly primaryObjects: readonly AIInputSourceWorkflowServiceAuthzObjectId[];
  readonly surface: AIInputSourceWorkflowServiceAuthzSurface;
  readonly operationKind: AIInputSourceWorkflowServiceAuthzOperationKind;
  readonly actor: "owner" | "admin-operator" | "internal-ai-agent" | "proof-runner";
  readonly currentMode: "contract_only_no_runtime";
  readonly bffBoundary: string;
  readonly authBoundary: "requireUser()";
  readonly authorizationChecks: readonly string[];
  readonly inputDtoRules: readonly string[];
  readonly outputDtoRules: readonly string[];
  readonly auditFamily: "ai-input.source-workflow";
  readonly auditActions: readonly string[];
  readonly approval: AIInputSourceWorkflowServiceAuthzApproval;
  readonly runtimeStage: "future_db_read" | "future_proposal_write" | "future_proof_run" | "review_gate";
  readonly agentBoundary: string;
  readonly stopConditions: readonly string[];
  readonly nextTask: "DATTR-024" | "DATTR-024-PROOF" | "MIG-REVIEW-REQUIRED";
};

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OBJECTS = [
  "SourceConnection",
  "SourceAsset",
  "AIWorkflowRun",
  "AIWorkItem",
  "SourceNamingProfile",
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
] as const satisfies readonly AIInputSourceWorkflowServiceAuthzObjectId[];

const SERVICE_AUTHZ_STOP_CONDITIONS = [
  "No route handler in DATTR-024F-CONTRACT.",
  "No server action in DATTR-024F-CONTRACT.",
  "No Prisma schema edit in DATTR-024F-CONTRACT.",
  "No migration apply in DATTR-024F-CONTRACT.",
  "No seed change in DATTR-024F-CONTRACT.",
  "No DB read/write in DATTR-024F-CONTRACT.",
  "No connector runtime in DATTR-024F-CONTRACT.",
  "No provider data read in DATTR-024F-CONTRACT.",
  "No public output expansion in DATTR-024F-CONTRACT.",
  "No module final write in DATTR-024F-CONTRACT.",
  "No external collaboration in DATTR-024F-CONTRACT.",
  "No external agent database access in DATTR-024F-CONTRACT.",
  "externalRegisterable: false.",
] as const;

const OWNER_SCOPED_AUTHZ_CHECKS = [
  "Future runtime entry must call requireUser() before loading source workflow data.",
  "Future service entry must scope by ownerProfileId from the authenticated profile.",
  "Future service entry must reject cross-owner source, proposal, workflow, audit, and write-intent refs.",
  "Future mapper must return UI-safe DTOs only and must never expose raw Prisma rows.",
] as const;

const AGENT_PROPOSAL_AUTHZ_CHECKS = [
  "Internal AI agents receive scoped context packages only.",
  "AI outputs remain proposal-only until owner review and module-specific authorization pass.",
  "External agents never receive direct database access.",
  "externalRegisterable: false.",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_REQUIRED_OPERATION_IDS = [
  "ai-input.source-workflow.list",
  "ai-input.source-workflow.detail",
  "ai-input.source-connection.review",
  "ai-input.source-asset.review",
  "ai-input.workflow-run.review",
  "ai-input.work-item.review",
  "ai-input.naming-profile.review",
  "ai-input.data-unit-proposal.review",
  "ai-input.module-write-intent.review",
  "ai-input.connector-consent.review",
  "ai-input.proof-target.review",
  "ai-input.audit-lineage.review",
] as const satisfies readonly AIInputSourceWorkflowServiceAuthzOperationId[];

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OPERATIONS = [
  {
    id: "ai-input.source-workflow.list",
    taskId: "DATTR-024F-CONTRACT",
    title: "List owner-scoped AI Input source workflow resources",
    primaryObjects: ["SourceConnection", "SourceAsset", "AIWorkflowRun", "AIWorkItem"],
    surface: "ai-input-formal",
    operationKind: "server-component-loader-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future Server Component loader -> requireUser() -> service authz -> UI-safe list DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: OWNER_SCOPED_AUTHZ_CHECKS,
    inputDtoRules: [
      "Accept only filter, status, provider, risk, cursor, and limit params after validation.",
      "Ignore or reject ownerProfileId, profileId, rowId, raw provider id, and cross-owner refs from client input.",
    ],
    outputDtoRules: [
      "Return redacted resource summaries with source refs, status, risk, next action, and audit refs.",
      "Never return raw source bodies, provider payloads, tokens, cookies, profile IDs, row IDs, or database identifiers.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["read.listed", "read.blocked"],
    approval: "BLOCKED_UNTIL_MIGRATION_REVIEW",
    runtimeStage: "future_db_read",
    agentBoundary: "Owner-visible read model only; internal agents may consume scoped summaries later.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.source-workflow.detail",
    taskId: "DATTR-024F-CONTRACT",
    title: "Load one owner-scoped source workflow detail",
    primaryObjects: ["SourceConnection", "SourceAsset", "AIWorkflowRun", "AIWorkItem", "OperatingAuditEvent"],
    surface: "ai-input-formal",
    operationKind: "server-component-loader-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future detail loader -> requireUser() -> owner-scoped service -> redacted detail DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: OWNER_SCOPED_AUTHZ_CHECKS,
    inputDtoRules: [
      "Accept only opaque UI ref ids minted by the service layer in a future runtime slice.",
      "Reject raw database identifiers, profile ids, provider ids, and unsigned external refs.",
    ],
    outputDtoRules: [
      "Return lineage, workflow state, redactionVersion, retentionClass, and audit/proof refs.",
      "Exclude private source bodies unless a future owner-approved viewer contract permits a redacted preview.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["read.detail", "read.blocked"],
    approval: "BLOCKED_UNTIL_MIGRATION_REVIEW",
    runtimeStage: "future_db_read",
    agentBoundary: "Detail output is owner-visible and not externally shareable.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.source-connection.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review source connection readiness and owner scope",
    primaryObjects: ["SourceConnection", "OperatingAuditEvent"],
    surface: "owner-settings",
    operationKind: "operator-approval-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future settings loader -> requireUser() -> source connection service -> readiness DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: [
      ...OWNER_SCOPED_AUTHZ_CHECKS,
      "Future connector consent must match owner, provider, scope, retention policy, and consentVersion.",
    ],
    inputDtoRules: ["Accept provider family and consent draft refs only after validation."],
    outputDtoRules: [
      "Show setup-required, paused, revoked, blocked, or ready state without provider secrets.",
      "Render missing permissions and next owner action, not raw OAuth or webhook material.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["connection.reviewed", "connection.blocked"],
    approval: "OWNER_REVIEW_REQUIRED",
    runtimeStage: "review_gate",
    agentBoundary: "Connector readiness is owner/admin visible; no external agent can activate access.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.source-asset.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review source asset lineage, retention, and redaction",
    primaryObjects: ["SourceAsset", "SourceConnection", "OperatingAuditEvent"],
    surface: "ai-input-formal",
    operationKind: "server-component-loader-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future asset loader -> requireUser() -> owner-scoped source asset service -> redacted DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: OWNER_SCOPED_AUTHZ_CHECKS,
    inputDtoRules: ["Accept sourceAssetRef and view intent only after service-issued ref validation."],
    outputDtoRules: [
      "Show provenance, retentionClass, redactionVersion, extraction status, and proposal links.",
      "Never expose raw binary data, raw provider payloads, file bodies, transcript bodies, or source secrets.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["asset.reviewed", "asset.blocked"],
    approval: "OWNER_REVIEW_REQUIRED",
    runtimeStage: "future_db_read",
    agentBoundary: "Internal agents may later receive redacted excerpts only through scoped context packages.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.workflow-run.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review AI workflow run state and proof refs",
    primaryObjects: ["AIWorkflowRun", "AIWorkItem", "OperatingAuditEvent"],
    surface: "ai-input-formal",
    operationKind: "server-component-loader-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future workflow loader -> requireUser() -> owner-scoped workflow service -> run DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: [
      ...OWNER_SCOPED_AUTHZ_CHECKS,
      "Future workflow service must verify each run belongs to the owner and allowed source scope.",
    ],
    inputDtoRules: ["Accept workflowRunRef and status filters only after validation."],
    outputDtoRules: [
      "Show run state, worker class, source refs, proposal refs, proof refs, and blocked actions.",
      "Do not expose raw prompts, model outputs, provider payloads, or private source bodies.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["workflow_run.reviewed", "workflow_run.blocked"],
    approval: "OWNER_REVIEW_REQUIRED",
    runtimeStage: "future_db_read",
    agentBoundary: "Internal workflow agents remain proposal-only and cannot write final module records.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.work-item.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review AI work item assignment and proposal output",
    primaryObjects: ["AIWorkItem", "AIWorkflowRun", "DataUnitProposal", "OperatingAuditEvent"],
    surface: "agent-team-os",
    operationKind: "server-component-loader-contract",
    actor: "internal-ai-agent",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future agent workspace loader -> requireUser() -> service authz -> redacted work-item DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: [...OWNER_SCOPED_AUTHZ_CHECKS, ...AGENT_PROPOSAL_AUTHZ_CHECKS],
    inputDtoRules: ["Accept workItemRef, runRef, and queue filters only after validation."],
    outputDtoRules: [
      "Show assignment state, allowed agent, proposal output refs, blocked writes, and next owner action.",
      "No raw context package, private record body, prompt, tool secret, or provider output can be exposed.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["work_item.reviewed", "work_item.blocked"],
    approval: "OWNER_REVIEW_REQUIRED",
    runtimeStage: "future_db_read",
    agentBoundary: "Internal agent queue is protected-owner visible and externalRegisterable: false.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.naming-profile.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review source naming profile and duplicate resolution",
    primaryObjects: ["SourceNamingProfile", "SourceAsset", "OperatingAuditEvent"],
    surface: "ai-input-formal",
    operationKind: "future-server-action-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future proposal action -> requireUser() -> owner-scoped naming service -> proposed profile DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: OWNER_SCOPED_AUTHZ_CHECKS,
    inputDtoRules: [
      "Accept owner-entered naming corrections only after validation and redaction.",
      "Require sourceAssetRef, rationale, and conflict state for future persisted corrections.",
    ],
    outputDtoRules: [
      "Return proposed naming profile, conflict summary, decision state, and audit refs.",
      "Keep raw source bodies and private provider metadata out of correction DTOs.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["naming_profile.reviewed", "naming_profile.blocked"],
    approval: "OWNER_REVIEW_REQUIRED",
    runtimeStage: "future_proposal_write",
    agentBoundary: "Agents may suggest naming changes only; owner decides.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.data-unit-proposal.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review DataUnitProposal before write-intent promotion",
    primaryObjects: ["DataUnitProposal", "SourceAsset", "OperatingAuditEvent"],
    surface: "ai-input-formal",
    operationKind: "future-server-action-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future proposal action -> requireUser() -> proposal service authz -> reviewed proposal DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: [...OWNER_SCOPED_AUTHZ_CHECKS, ...AGENT_PROPOSAL_AUTHZ_CHECKS],
    inputDtoRules: [
      "Require proposalRef, owner decision, redactionVersion, target module, and source lineage checksum.",
      "Reject final module payloads and high-risk public/client-visible outputs in this service boundary.",
    ],
    outputDtoRules: [
      "Return proposal state, target module, source refs, confidence summary, and decision audit refs.",
      "Do not return raw prompts, raw source bodies, private notes, provider payloads, or target module final payloads.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["proposal.reviewed", "proposal.blocked"],
    approval: "OWNER_REVIEW_REQUIRED",
    runtimeStage: "future_proposal_write",
    agentBoundary: "Proposal-only; no autonomous final write and externalRegisterable: false.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.module-write-intent.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review ModuleWriteIntent against target module policy",
    primaryObjects: ["ModuleWriteIntent", "DataUnitProposal", "OperatingAuditEvent"],
    surface: "admin-operator",
    operationKind: "future-server-action-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future write-intent action -> requireUser() -> AI Input authz -> target module authz -> draft DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: [
      ...OWNER_SCOPED_AUTHZ_CHECKS,
      "Future action must call target module service authorization before any manual apply state.",
      "High-risk target modules require HUMAN_APPROVAL_REQUIRED and rollback refs.",
    ],
    inputDtoRules: [
      "Require writeIntentRef, targetModule, approval level, rollbackPlanRef, proofRef, and owner decision.",
      "Reject direct final writes to Work, Research, Life, Finance, Chamber, Company, Client Portal, auth, or public output.",
    ],
    outputDtoRules: [
      "Return draft state, target module, approval requirement, rollback refs, and blocked final-write reason.",
      "Never return target private record bodies, financial/private life data, client-visible payloads, or secrets.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["write_intent.reviewed", "write_intent.blocked"],
    approval: "HUMAN_APPROVAL_REQUIRED",
    runtimeStage: "future_proposal_write",
    agentBoundary: "ModuleWriteIntent is manual-apply only until future approved apply contracts exist.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.connector-consent.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review connector consent before runtime activation",
    primaryObjects: ["SourceConnection", "OperatingAuditEvent"],
    surface: "owner-settings",
    operationKind: "operator-approval-contract",
    actor: "owner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future settings action -> requireUser() -> consent service -> audit-ready consent DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: [
      ...OWNER_SCOPED_AUTHZ_CHECKS,
      "Future connector runtime must verify consent scope, provider class, replay protection, and secret separation first.",
    ],
    inputDtoRules: [
      "Require provider, minimum scope, consentVersion, retentionClass, and revoke/delete policy refs.",
      "Reject raw OAuth token, webhook secret, refresh token, provider credential, or broad provider-wide default scope.",
    ],
    outputDtoRules: [
      "Return owner-facing consent state, missing permissions, risk, next action, and audit refs.",
      "No secret, token, cookie, provider payload, or raw adapter payload may appear in any UI DTO.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["connector.consent_reviewed", "connector.blocked"],
    approval: "HUMAN_APPROVAL_REQUIRED",
    runtimeStage: "review_gate",
    agentBoundary: "External collaboration and connector activation require explicit human approval.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024",
  },
  {
    id: "ai-input.proof-target.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review disposable proof target and write confirmation readiness",
    primaryObjects: [
      "SourceConnection",
      "SourceAsset",
      "AIWorkflowRun",
      "AIWorkItem",
      "DataUnitProposal",
      "ModuleWriteIntent",
      "OperatingAuditEvent",
    ],
    surface: "admin-operator",
    operationKind: "proof-cli-contract",
    actor: "proof-runner",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future proof CLI -> explicit proof target classifier -> no-secret proof packet.",
    authBoundary: "requireUser()",
    authorizationChecks: [
      "Future proof runtime must never silently use DATABASE_URL.",
      "Future proof runtime must require explicit disposable/local target and write confirmation flags.",
      "Future proof runtime must clean up all proof-only rows by marker and owner scope.",
    ],
    inputDtoRules: [
      "Require approved proof target, run flag, write allow flag, exact confirmation phrase, and proof marker.",
      "Reject valuable, ambiguous, remote-unapproved, or missing-marker database targets.",
    ],
    outputDtoRules: [
      "Return no-secret readiness/pass/fail proof packet with target class, guard status, row-count summaries, and cleanup status.",
      "Never print database URLs, hosts, credentials, Supabase keys, profile IDs, row IDs, provider payloads, source bodies, cookies, or tokens.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["proof.reviewed", "proof.blocked"],
    approval: "BLOCKED_UNTIL_PROOF_TARGET",
    runtimeStage: "future_proof_run",
    agentBoundary: "Proof runner is local/operator controlled and not an external agent capability.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "DATTR-024-PROOF",
  },
  {
    id: "ai-input.audit-lineage.review",
    taskId: "DATTR-024F-CONTRACT",
    title: "Review audit lineage and append-only storage boundary",
    primaryObjects: ["OperatingAuditEvent", "DataUnitProposal", "ModuleWriteIntent", "AIWorkflowRun"],
    surface: "admin-operator",
    operationKind: "operator-approval-contract",
    actor: "admin-operator",
    currentMode: "contract_only_no_runtime",
    bffBoundary: "Future admin loader -> requireUser() -> audit service authz -> redacted audit-lineage DTO.",
    authBoundary: "requireUser()",
    authorizationChecks: [
      ...OWNER_SCOPED_AUTHZ_CHECKS,
      "Future audit storage must remain append-only and redacted before admin/settings display.",
      "Future audit read model must hide raw payloads, internal ids, secrets, and private record bodies.",
    ],
    inputDtoRules: ["Accept audit family, source ref, proposal ref, proof ref, and time-window filters only after validation."],
    outputDtoRules: [
      "Return redacted action/result/risk/approval/proof refs and retention labels.",
      "Do not expose raw event payloads, hash secrets, database identifiers, profile IDs, provider payloads, or private source data.",
    ],
    auditFamily: "ai-input.source-workflow",
    auditActions: ["audit_lineage.reviewed", "audit_lineage.blocked"],
    approval: "BLOCKED_UNTIL_MIGRATION_REVIEW",
    runtimeStage: "review_gate",
    agentBoundary: "Audit lineage can observe internal agent refs but cannot register external agents.",
    stopConditions: SERVICE_AUTHZ_STOP_CONDITIONS,
    nextTask: "MIG-REVIEW-REQUIRED",
  },
] as const satisfies readonly AIInputSourceWorkflowServiceAuthzOperation[];

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_LAYERS = [
  {
    id: "authenticated-owner",
    boundary: "requireUser()",
    rule: "Resolve the owner profile from the authenticated session before any source workflow service operation.",
    rejects: ["client-supplied ownerProfileId", "raw auth claims in DTOs", "first-profile fallback"],
  },
  {
    id: "owner-scoped-source",
    boundary: "service-layer authorization",
    rule: "Every SourceConnection, SourceAsset, workflow run, work item, proposal, write intent, and audit event is scoped by ownerProfileId.",
    rejects: ["cross-owner refs", "raw Prisma rows in Client Components", "unvalidated external refs"],
  },
  {
    id: "proposal-before-write",
    boundary: "proposal-only lifecycle",
    rule: "AI Input may propose DataUnitProposal and ModuleWriteIntent changes, but final module writes require target module authorization and human approval where high risk.",
    rejects: ["autonomous final writes", "client-visible output from proposals", "high-risk module writes without approval"],
  },
  {
    id: "connector-consent-before-runtime",
    boundary: "connector runtime approval",
    rule: "Provider runtime, OAuth, webhooks, polling, file ingestion, OCR, transcription, and raw adapter payload handling stay blocked until connector consent and proof gates pass.",
    rejects: ["implicit ingestion", "unverified provider events", "provider credentials in source rows"],
  },
  {
    id: "audit-lineage-before-launch-claim",
    boundary: "AUDIT-OPS-004 storage review",
    rule: "Persisted Source Workflow operations must have redacted, append-only, owner-scoped audit lineage before launch claims.",
    rejects: ["editable audit rows", "raw generated report bodies in UI", "launch claims from blocked proof packets"],
  },
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SOURCE_REFS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "https://nextjs.org/docs/app/getting-started/fetching-data",
  "https://nextjs.org/docs/app/getting-started/mutating-data",
  "https://nextjs.org/docs/app/guides/forms",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_STOP_CONDITIONS =
  SERVICE_AUTHZ_STOP_CONDITIONS;

export const AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SUMMARY = {
  id: "DATTR-024F-CONTRACT",
  sourceSplitSlice: "DATTR-024F",
  status: "ready_for_service_authz_contract_use",
  mode: "contract_only_no_runtime",
  operationCount: AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OPERATIONS.length,
  objectCount: AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OBJECTS.length,
  requiredOperationIds: AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_REQUIRED_OPERATION_IDS,
  nextRunnableSlice: "DATTR-024",
  remainingBlockers: [
    "approved proof target run",
    "reviewed migration",
    "service authorization implementation",
    "RLS/audit storage proof",
    "safe Supabase/local/disposable DB connectivity",
    "connector runtime approval",
  ],
  nandaAlignment: {
    affectedCapability: "AI Input internal source workflow service authorization",
    currentPosture: "internal_runtime_proposal_only_and_protected_owner_visible",
    affectedAgentFactsLiteFields: [
      "identity",
      "lifecycle",
      "capabilities",
      "skills",
      "auth",
      "trust",
      "observability",
      "registry status",
    ],
    externalRegisterable: false,
    externalAgentDatabaseAccessAllowed: false,
  },
  safetyGuards: {
    routeHandlerAllowed: false,
    serverActionAllowedInDattr024fContract: false,
    schemaWriteAllowed: false,
    migrationApplyAllowed: false,
    seedChangeAllowed: false,
    runtimeReadAllowed: false,
    runtimeWriteAllowed: false,
    connectorRuntimeAllowed: false,
    providerDataAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalCollaborationAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  sourceRefs: AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SOURCE_REFS,
} as const;
