export type AIInputSourceWorkflowConnectorRuntimeApprovalGateId =
  | "provider-inventory-data-classification"
  | "oauth-consent-scope-pkce-review"
  | "secret-storage-vault-env-review"
  | "webhook-signature-raw-body-review"
  | "webhook-replay-idempotency-review"
  | "polling-rate-limit-cursor-review"
  | "adapter-payload-redaction-review"
  | "source-workflow-mapping-review"
  | "service-authz-rls-audit-dependency"
  | "proof-target-dry-run-first-review"
  | "owner-human-approval-rollback-review"
  | "external-agent-nanda-boundary-review";

export type AIInputSourceWorkflowConnectorRuntimeApprovalProviderId =
  | "manual"
  | "local_file"
  | "url"
  | "rss"
  | "google_drive"
  | "google_docs"
  | "gmail"
  | "line"
  | "telegram"
  | "github_markdown";

export type AIInputSourceWorkflowConnectorRuntimeApprovalArea =
  | "provider-inventory"
  | "oauth"
  | "secrets"
  | "webhook"
  | "polling"
  | "adapter"
  | "source-workflow"
  | "authz-rls-audit"
  | "proof"
  | "approval-rollback"
  | "agent-boundary";

export type AIInputSourceWorkflowConnectorRuntimeApprovalStatus =
  | "approval_review_ready"
  | "blocked_until_human_approval"
  | "blocked_until_identity_audit_proof"
  | "blocked_until_provider_runtime_design";

export type AIInputSourceWorkflowConnectorRuntimeApprovalGate = {
  readonly id: AIInputSourceWorkflowConnectorRuntimeApprovalGateId;
  readonly taskId: "DATTR-024L-CONNECTOR-RUNTIME";
  readonly area: AIInputSourceWorkflowConnectorRuntimeApprovalArea;
  readonly status: AIInputSourceWorkflowConnectorRuntimeApprovalStatus;
  readonly riskLevel: "MEDIUM" | "HIGH" | "CRITICAL";
  readonly label: string;
  readonly selectedPattern: string;
  readonly rejectedAlternatives: readonly string[];
  readonly requiredEvidence: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly acceptanceGate: string;
  readonly verification: readonly string[];
  readonly stopCondition: string;
  readonly humanApprovalRequired: boolean;
  readonly runtimeApprovalSelected: false;
  readonly connectorRuntimeAllowed: false;
  readonly routeHandlerAdded: false;
  readonly oauthRuntimeAllowed: false;
  readonly webhookRuntimeAllowed: false;
  readonly pollingRuntimeAllowed: false;
  readonly providerApiRuntimeAllowed: false;
  readonly fileIngestionAllowed: false;
  readonly ocrTranscriptionAllowed: false;
  readonly rawAdapterPayloadExposureAllowed: false;
  readonly secretWriteAllowed: false;
  readonly schemaMigrationAllowed: false;
  readonly migrationApplyAllowed: false;
  readonly databaseReadAllowed: false;
  readonly databaseWriteAllowed: false;
  readonly publicOutputAllowed: false;
  readonly moduleFinalWriteAllowed: false;
  readonly externalAgentDatabaseAccessAllowed: false;
  readonly externalRegisterable: false;
};

const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_LOCAL_REFS = [
  "AGENTS.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts",
  "src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts",
  "src/lib/services/ai-input-source-workflow.service.ts",
  "src/lib/contracts/operating-audit-storage-review.contract.ts",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_OFFICIAL_REFS = [
  "https://www.rfc-editor.org/rfc/rfc9700.html",
  "https://www.rfc-editor.org/rfc/rfc7636",
  "https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries",
  "https://docs.stripe.com/webhooks/signature",
  "https://supabase.com/docs/guides/database/vault",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_REQUIRED_GATE_IDS = [
  "provider-inventory-data-classification",
  "oauth-consent-scope-pkce-review",
  "secret-storage-vault-env-review",
  "webhook-signature-raw-body-review",
  "webhook-replay-idempotency-review",
  "polling-rate-limit-cursor-review",
  "adapter-payload-redaction-review",
  "source-workflow-mapping-review",
  "service-authz-rls-audit-dependency",
  "proof-target-dry-run-first-review",
  "owner-human-approval-rollback-review",
  "external-agent-nanda-boundary-review",
] as const satisfies readonly AIInputSourceWorkflowConnectorRuntimeApprovalGateId[];

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_PROVIDER_FAMILIES = [
  {
    id: "manual",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "MEDIUM",
    requiredApproval: ["explicit owner submission", "no background clipboard or filesystem capture"],
    blockedRuntime: ["silent capture", "background scan"],
  },
  {
    id: "local_file",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "HIGH",
    requiredApproval: ["owner-selected file", "MIME/size policy", "metadata privacy review"],
    blockedRuntime: ["raw binary DB storage", "OCR/transcription without opt-in"],
  },
  {
    id: "url",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "HIGH",
    requiredApproval: ["safe URL policy", "SSRF block list", "robots/TOS review"],
    blockedRuntime: ["unbounded crawl", "private IP fetch", "credential-bearing URL ingestion"],
  },
  {
    id: "rss",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "MEDIUM",
    requiredApproval: ["feed allowlist", "poll interval", "item dedupe key"],
    blockedRuntime: ["unbounded polling", "full-content fetch without policy"],
  },
  {
    id: "google_drive",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "HIGH",
    requiredApproval: ["read-only scope", "file/folder allowlist", "token storage review"],
    blockedRuntime: ["drive-wide sync", "credential storage in SourceConnection rows"],
  },
  {
    id: "google_docs",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "HIGH",
    requiredApproval: ["document id allowlist", "export format", "revision policy"],
    blockedRuntime: ["silent document export", "raw document body in public output"],
  },
  {
    id: "gmail",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "CRITICAL",
    requiredApproval: ["mail scope minimization", "label/query limit", "attachment opt-in"],
    blockedRuntime: ["mailbox-wide sync", "message body indexing without review"],
  },
  {
    id: "line",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "CRITICAL",
    requiredApproval: ["chat/group scope", "raw body signature verification", "membership visibility policy"],
    blockedRuntime: ["unverified webhook body", "third-party group capture without review"],
  },
  {
    id: "telegram",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "CRITICAL",
    requiredApproval: ["chat scope", "update cursor", "attachment opt-in"],
    blockedRuntime: ["unbounded update sweep", "unverified private chat ingestion"],
  },
  {
    id: "github_markdown",
    runtimeActivationState: "approval_required_no_runtime",
    riskLevel: "HIGH",
    requiredApproval: ["repo/path/glob allowlist", "read-only permission", "secret scanning exclusion"],
    blockedRuntime: ["private repo crawl", "secret-bearing file output"],
  },
] as const satisfies readonly {
  readonly id: AIInputSourceWorkflowConnectorRuntimeApprovalProviderId;
  readonly runtimeActivationState: "approval_required_no_runtime";
  readonly riskLevel: "MEDIUM" | "HIGH" | "CRITICAL";
  readonly requiredApproval: readonly string[];
  readonly blockedRuntime: readonly string[];
}[];

const CONNECTOR_RUNTIME_APPROVAL_STOP_CONDITIONS = [
  "No route handler in DATTR-024L-CONNECTOR-RUNTIME.",
  "No OAuth callback in DATTR-024L-CONNECTOR-RUNTIME.",
  "No webhook endpoint in DATTR-024L-CONNECTOR-RUNTIME.",
  "No polling job in DATTR-024L-CONNECTOR-RUNTIME.",
  "No provider API call in DATTR-024L-CONNECTOR-RUNTIME.",
  "No file ingestion in DATTR-024L-CONNECTOR-RUNTIME.",
  "No OCR or transcription in DATTR-024L-CONNECTOR-RUNTIME.",
  "No raw adapter payload exposure in DATTR-024L-CONNECTOR-RUNTIME.",
  "No secret write in DATTR-024L-CONNECTOR-RUNTIME.",
  "No Prisma schema edit in DATTR-024L-CONNECTOR-RUNTIME.",
  "No migration apply in DATTR-024L-CONNECTOR-RUNTIME.",
  "No DB read/write in DATTR-024L-CONNECTOR-RUNTIME.",
  "No public output expansion in DATTR-024L-CONNECTOR-RUNTIME.",
  "No module final write in DATTR-024L-CONNECTOR-RUNTIME.",
  "No external agent database access in DATTR-024L-CONNECTOR-RUNTIME.",
  "externalRegisterable=false.",
] as const;

const CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS = [
  ...AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_LOCAL_REFS,
  ...AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_OFFICIAL_REFS,
] as const;

const CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS = {
  runtimeApprovalSelected: false,
  connectorRuntimeAllowed: false,
  routeHandlerAdded: false,
  oauthRuntimeAllowed: false,
  webhookRuntimeAllowed: false,
  pollingRuntimeAllowed: false,
  providerApiRuntimeAllowed: false,
  fileIngestionAllowed: false,
  ocrTranscriptionAllowed: false,
  rawAdapterPayloadExposureAllowed: false,
  secretWriteAllowed: false,
  schemaMigrationAllowed: false,
  migrationApplyAllowed: false,
  databaseReadAllowed: false,
  databaseWriteAllowed: false,
  publicOutputAllowed: false,
  moduleFinalWriteAllowed: false,
  externalAgentDatabaseAccessAllowed: false,
  externalRegisterable: false,
} as const;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_GATES = [
  {
    id: "provider-inventory-data-classification",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "provider-inventory",
    status: "approval_review_ready",
    riskLevel: "HIGH",
    label: "Review every provider family before activation",
    selectedPattern:
      "Connector runtime approval is provider-by-provider with data classification, scope, retention, source mapping, and blocked-runtime notes.",
    rejectedAlternatives: ["A single global connector enable flag.", "Provider-wide default sync.", "Runtime activation from UI labels alone."],
    requiredEvidence: ["Provider family row exists.", "Data class, default risk, minimum scope, and blocked runtime are owner-reviewable."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Future connector activation must name exactly one provider family and pass its approval row before runtime.",
    verification: ["pnpm ai-input:connector-runtime:check", "pnpm ai-input:connector-boundary:check"],
    stopCondition: "Stop before runtime if the provider family is not classified.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "oauth-consent-scope-pkce-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "oauth",
    status: "blocked_until_provider_runtime_design",
    riskLevel: "CRITICAL",
    label: "Approve OAuth scope, redirect, state, and PKCE before OAuth runtime",
    selectedPattern:
      "Future OAuth connectors must use narrow scopes, exact redirect review, CSRF/state binding, PKCE where applicable, consent versioning, revoke/pause controls, and no token exposure.",
    rejectedAlternatives: ["Implicit grant default.", "Provider-wide broad scopes.", "Open redirect or wildcard callback assumptions.", "Token storage in SourceConnection rows."],
    requiredEvidence: ["Provider OAuth scope proposal.", "Redirect URI review.", "State/CSRF and PKCE decision.", "Revoke and token rotation plan."],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_LOCAL_REFS,
      "https://www.rfc-editor.org/rfc/rfc9700.html",
      "https://www.rfc-editor.org/rfc/rfc7636",
    ],
    acceptanceGate:
      "OAuth runtime can start only after the selected provider has reviewed consent, redirect, PKCE/state, token storage, revoke, and rollback evidence.",
    verification: ["pnpm ai-input:connector-runtime:check"],
    stopCondition: "Stop before OAuth callback or provider token exchange.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "secret-storage-vault-env-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "secrets",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Keep connector secrets outside Source Workflow rows and UI DTOs",
    selectedPattern:
      "OAuth tokens, refresh tokens, webhook secrets, signing secrets, service keys, and provider credentials stay behind backend env or reviewed Supabase Vault-style references.",
    rejectedAlternatives: ["Store raw secrets in SourceConnection.", "Expose secret material in readiness DTOs.", "Print token-bearing proof output."],
    requiredEvidence: ["Secret storage location review.", "Secret reference naming policy.", "Rotation/revoke plan.", "No-secret proof output check."],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_LOCAL_REFS,
      "https://supabase.com/docs/guides/database/vault",
    ],
    acceptanceGate:
      "Connector runtime cannot write a secret until the storage mechanism, access path, redaction, and rotation/revoke behavior are reviewed.",
    verification: ["pnpm ai-input:connector-runtime:check", "pnpm ai-input:rls-audit-storage:check"],
    stopCondition: "Stop before any secret write or env/Vault integration code.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "webhook-signature-raw-body-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "webhook",
    status: "blocked_until_provider_runtime_design",
    riskLevel: "CRITICAL",
    label: "Verify webhook raw body signatures before trust or parsing",
    selectedPattern:
      "Future webhook handlers must preserve raw body, verify provider signature/timestamp using a reviewed secret, and reject before trusting payload fields.",
    rejectedAlternatives: ["Parse JSON before signature verification.", "Trust provider id in request body.", "Accept unsigned webhook delivery."],
    requiredEvidence: ["Provider signature header mapping.", "Raw body handling design.", "Timestamp tolerance.", "Rejected delivery audit shape."],
    sourceRefs: [
      ...AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_LOCAL_REFS,
      "https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries",
      "https://docs.stripe.com/webhooks/signature",
    ],
    acceptanceGate:
      "Webhook runtime requires provider-specific raw-body signature verification and rejected-event audit before any endpoint is added.",
    verification: ["pnpm ai-input:connector-runtime:check"],
    stopCondition: "Stop before adding a webhook endpoint.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "webhook-replay-idempotency-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "webhook",
    status: "blocked_until_identity_audit_proof",
    riskLevel: "CRITICAL",
    label: "Require replay protection, delivery memory, and idempotency",
    selectedPattern:
      "Future provider events require delivery id, event timestamp, tolerance window, idempotency key, dedupe memory, and append-only audit refs before side effects.",
    rejectedAlternatives: ["Process duplicate events twice.", "Use provider timestamp without tolerance.", "Let unrecognized event types create SourceAsset rows."],
    requiredEvidence: ["Delivery id schema or storage review.", "Replay rejection proof.", "Idempotency proof.", "Unknown event rejection audit."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Provider events cannot produce SourceAsset or workflow side effects until replay and idempotency proof exists.",
    verification: ["pnpm ai-input:connector-runtime:check", "pnpm audit:storage-review:check"],
    stopCondition: "Stop before event side effects or provider-event DB writes.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "polling-rate-limit-cursor-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "polling",
    status: "blocked_until_provider_runtime_design",
    riskLevel: "HIGH",
    label: "Review polling schedules, cursors, rate limits, and backoff",
    selectedPattern:
      "Polling providers require owner-visible cadence, cursor/dedupe keys, retry/backoff behavior, rate-limit handling, and pause/revoke kill switches before scheduling.",
    rejectedAlternatives: ["Unbounded background sync.", "Provider-wide sweep.", "Retry storm after provider errors."],
    requiredEvidence: ["Polling interval proposal.", "Cursor and dedupe policy.", "Rate-limit/backoff plan.", "Pause/revoke proof."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Polling runtime cannot start until schedule, cursor, dedupe, backoff, and owner pause/revoke controls are reviewed.",
    verification: ["pnpm ai-input:connector-runtime:check"],
    stopCondition: "Stop before adding a scheduler, cron, or polling job.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "adapter-payload-redaction-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "adapter",
    status: "approval_review_ready",
    riskLevel: "HIGH",
    label: "Redact provider payloads before storage, DTOs, and proof output",
    selectedPattern:
      "Adapter output must become a UI-safe, source-ref-bearing view model; raw provider payloads, tokens, cookies, database URLs, private source bodies, and profile IDs stay out of DTOs and proof packets.",
    rejectedAlternatives: ["Persist raw provider JSON.", "Render raw provider payload in admin.", "Use proof packets as payload archives."],
    requiredEvidence: ["Adapter mapper contract.", "Redaction list.", "Proof packet no-secret scan.", "Private source body handling policy."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Adapter runtime cannot expose or persist raw provider payloads without a redacted mapper and audit/source refs.",
    verification: ["pnpm ai-input:connector-runtime:check", "pnpm ai-input:service-runtime:check"],
    stopCondition: "Stop before raw adapter payload handling.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "source-workflow-mapping-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "source-workflow",
    status: "approval_review_ready",
    riskLevel: "HIGH",
    label: "Map connector output into Source Workflow objects before runtime",
    selectedPattern:
      "Future connector output maps through SourceConnection, SourceAsset, AIWorkflowRun, AIWorkItem, DataUnitProposal, ModuleWriteIntent, providerEventRef, proofRef, and OperatingAuditEvent refs.",
    rejectedAlternatives: ["Write directly into module SSOT records.", "Skip SourceAsset identity.", "Drop provider event and proof refs."],
    requiredEvidence: ["SourceConnection mapping.", "SourceAsset identity mapping.", "OperatingAuditEvent action mapping.", "ModuleWriteIntent proposal-only boundary."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Connector runtime cannot write final module records and must preserve source/proof/audit lineage through Source Workflow objects.",
    verification: ["pnpm ai-input:connector-runtime:check", "pnpm ai-input:service-runtime:check"],
    stopCondition: "Stop before final module writes or lineage-free persistence.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "service-authz-rls-audit-dependency",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "authz-rls-audit",
    status: "blocked_until_identity_audit_proof",
    riskLevel: "CRITICAL",
    label: "Require service authz, selected RLS identity, and audit storage before DB runtime",
    selectedPattern:
      "Connector runtime depends on requireUser(), service-layer authorization, selected RLS identity strategy, policy apply review, and persisted audit storage or explicit disposable-only deferral.",
    rejectedAlternatives: ["Let connector jobs bypass service authorization.", "Treat UI shell auth as database isolation.", "Use connector runtime before audit storage."],
    requiredEvidence: ["DATTR-024J service boundary proof.", "DATTR-024K identity strategy decision.", "Audit storage proof or approved disposable-only deferral."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Any DB-backed connector runtime waits for Source Workflow authz, RLS, and audit storage gates.",
    verification: ["pnpm ai-input:service-runtime:check", "pnpm ai-input:rls-audit-storage:check", "pnpm audit:storage-review:check"],
    stopCondition: "Stop before DB reads/writes or provider event persistence.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "proof-target-dry-run-first-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "proof",
    status: "blocked_until_human_approval",
    riskLevel: "HIGH",
    label: "Require dry-run-first connector proof and explicit safe target",
    selectedPattern:
      "Connector proof must emit no-secret dry-run packets first, require explicit owner-approved target and confirmations for writes, and never run against valuable databases by default.",
    rejectedAlternatives: ["Use production DB as first proof.", "Print provider payloads in proof output.", "Treat static contract success as write proof."],
    requiredEvidence: ["No-secret dry-run packet.", "Approved proof target.", "Write confirmation phrase.", "Cleanup/rollback expectation."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Future runtime proof starts in dry-run and can write only to approved disposable targets with confirmations.",
    verification: ["pnpm ai-input:proof", "pnpm ai-input:connector-runtime:check"],
    stopCondition: "Stop before connector proof writes or remote provider reads.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "owner-human-approval-rollback-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "approval-rollback",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Require explicit owner approval, rollback, pause, revoke, and kill switch",
    selectedPattern:
      "Activation requires owner approval per provider, pause/revoke controls, rollback plan, retention/delete path, and a kill switch before any background sync.",
    rejectedAlternatives: ["Auto-enable after code merge.", "Hide revoke controls.", "Run background jobs without rollback."],
    requiredEvidence: ["Human approval record.", "Pause/revoke path.", "Rollback plan.", "Retention/delete expectation.", "Kill switch control."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "Connector runtime remains disabled until human approval and rollback controls exist for the selected provider.",
    verification: ["pnpm ai-input:connector-runtime:check", "pnpm launch:actions:check"],
    stopCondition: "Stop before connector activation.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
  {
    id: "external-agent-nanda-boundary-review",
    taskId: "DATTR-024L-CONNECTOR-RUNTIME",
    area: "agent-boundary",
    status: "blocked_until_human_approval",
    riskLevel: "CRITICAL",
    label: "Keep connector agents internal and non-registerable",
    selectedPattern:
      "Connector capability remains protected-owner/internal; external agents receive no direct DB access, no provider credentials, and no public registration until endpoint/auth/trust/rollback/public-safety approval exists.",
    rejectedAlternatives: ["External agent direct DB access.", "Public connector endpoint before launch proof.", "NANDA/A2A/MCP registration without human approval."],
    requiredEvidence: ["ARC-028 gate answer.", "External registration approval package if ever needed.", "No direct database access proof.", "Human approval record."],
    sourceRefs: CONNECTOR_RUNTIME_APPROVAL_SHARED_REFS,
    acceptanceGate:
      "External agent connector collaboration remains HUMAN_APPROVAL_REQUIRED and externalRegisterable=false.",
    verification: ["pnpm ai-input:connector-runtime:check", "pnpm agent:registry:check"],
    stopCondition: "Stop before external registration or direct external-agent DB/provider access.",
    humanApprovalRequired: true,
    ...CONNECTOR_RUNTIME_APPROVAL_SHARED_FLAGS,
  },
] as const satisfies readonly AIInputSourceWorkflowConnectorRuntimeApprovalGate[];

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_STOP_CONDITIONS =
  CONNECTOR_RUNTIME_APPROVAL_STOP_CONDITIONS;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_SUMMARY = {
  taskId: "DATTR-024L-CONNECTOR-RUNTIME",
  status: "ready_for_connector_runtime_approval_review",
  mode: "connector_runtime_approval_only_no_activation",
  providerFamilyCount: AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_PROVIDER_FAMILIES.length,
  gateCount: AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_RUNTIME_APPROVAL_GATES.length,
  runtimeApprovalSelected: false,
  connectorRuntimeAllowed: false,
  oauthRuntimeAllowed: false,
  webhookRuntimeAllowed: false,
  pollingRuntimeAllowed: false,
  providerApiRuntimeAllowed: false,
  secretWriteAllowed: false,
  databaseReadAllowed: false,
  databaseWriteAllowed: false,
  publicOutputAllowed: false,
  externalAgentDatabaseAccessAllowed: false,
  externalRegisterable: false,
  nextTask: "AIINPUT-OPS-003",
} as const;
