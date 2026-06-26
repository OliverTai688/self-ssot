export type AIInputSourceWorkflowConnectorProviderId =
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

export type AIInputSourceWorkflowConnectorBoundaryArea =
  | "consent-scope"
  | "pause-resume-revoke"
  | "provider-event-verification"
  | "replay-protection"
  | "secret-separation"
  | "retention-deletion"
  | "audit-refs"
  | "runtime-stop-conditions";

export type AIInputSourceWorkflowConnectorConsentState =
  | "not_connected"
  | "drafted_scope"
  | "owner_consented"
  | "paused_by_owner"
  | "resume_requested"
  | "revoke_requested"
  | "revoked"
  | "blocked_security_review"
  | "blocked_provider_event"
  | "retention_delete_requested";

export type AIInputSourceWorkflowConnectorCommandId =
  | "ai-input.connector.scope.review"
  | "ai-input.connector.consent.grant"
  | "ai-input.connector.pause"
  | "ai-input.connector.resume"
  | "ai-input.connector.revoke"
  | "ai-input.provider-event.receive"
  | "ai-input.provider-event.verify"
  | "ai-input.provider-event.reject_replay"
  | "ai-input.provider-event.block"
  | "ai-input.connector.retention.delete_request";

export type AIInputSourceWorkflowConnectorBoundaryRequirement = {
  readonly area: AIInputSourceWorkflowConnectorBoundaryArea;
  readonly status: "boundary_ready_no_runtime";
  readonly requirement: string;
  readonly acceptance: readonly string[];
  readonly rejects: readonly string[];
};

export type AIInputSourceWorkflowConnectorCommand = {
  readonly id: AIInputSourceWorkflowConnectorCommandId;
  readonly label: string;
  readonly fromStates: readonly AIInputSourceWorkflowConnectorConsentState[];
  readonly toState: AIInputSourceWorkflowConnectorConsentState;
  readonly auditAction: string;
  readonly ownerApproval: "OWNER_REVIEW_REQUIRED" | "HUMAN_APPROVAL_REQUIRED" | "BLOCKED_UNTIL_RUNTIME_REVIEW";
  readonly runtimeAllowedInContract: false;
  readonly validation: readonly string[];
  readonly stopConditions: readonly string[];
};

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_PROVIDERS = [
  {
    id: "manual",
    connectorClass: "explicit_owner_capture",
    defaultRisk: "MEDIUM",
    minimumScope: ["single owner-confirmed text/file/link item"],
    blockedRuntime: ["background clipboard reads", "silent file scanning"],
  },
  {
    id: "local_file",
    connectorClass: "owner_selected_file",
    defaultRisk: "HIGH",
    minimumScope: ["owner-selected file", "allowed MIME type", "size limit"],
    blockedRuntime: ["raw binary DB storage", "OCR/transcription without explicit opt-in"],
  },
  {
    id: "url",
    connectorClass: "owner_selected_locator",
    defaultRisk: "HIGH",
    minimumScope: ["owner-submitted URL", "safe scheme", "fetch policy review"],
    blockedRuntime: ["SSRF-prone fetch", "robots/TOS bypass", "unbounded crawl"],
  },
  {
    id: "rss",
    connectorClass: "feed_candidate",
    defaultRisk: "MEDIUM",
    minimumScope: ["feed URL", "item limit", "dedupe key"],
    blockedRuntime: ["unbounded polling", "full-content fetch without policy"],
  },
  {
    id: "google_drive",
    connectorClass: "oauth_file_scope",
    defaultRisk: "HIGH",
    minimumScope: ["specific folder or file ids", "revision policy", "read-only scope"],
    blockedRuntime: ["broad drive-wide sync", "credential storage in source rows"],
  },
  {
    id: "google_docs",
    connectorClass: "oauth_document_scope",
    defaultRisk: "HIGH",
    minimumScope: ["specific document ids", "export format", "revision policy"],
    blockedRuntime: ["silent document export", "raw document body in public output"],
  },
  {
    id: "gmail",
    connectorClass: "oauth_mail_scope",
    defaultRisk: "CRITICAL",
    minimumScope: ["label/query scope", "thread mode", "attachment opt-in"],
    blockedRuntime: ["mailbox-wide sync", "message body indexing without review"],
  },
  {
    id: "line",
    connectorClass: "messaging_event_scope",
    defaultRisk: "CRITICAL",
    minimumScope: ["selected chat/group", "member visibility policy", "signature verification"],
    blockedRuntime: ["unverified webhook body", "third-party group capture without active membership"],
  },
  {
    id: "telegram",
    connectorClass: "messaging_event_scope",
    defaultRisk: "CRITICAL",
    minimumScope: ["selected chat", "update id cursor", "attachment opt-in"],
    blockedRuntime: ["unverified update ingestion", "background chat sweep"],
  },
  {
    id: "github_markdown",
    connectorClass: "repo_document_scope",
    defaultRisk: "HIGH",
    minimumScope: ["repo/path/glob", "branch or commit ref", "read-only permission"],
    blockedRuntime: ["private repo crawl without owner scope", "secret-bearing file output"],
  },
] as const satisfies readonly {
  readonly id: AIInputSourceWorkflowConnectorProviderId;
  readonly connectorClass: string;
  readonly defaultRisk: "MEDIUM" | "HIGH" | "CRITICAL";
  readonly minimumScope: readonly string[];
  readonly blockedRuntime: readonly string[];
}[];

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_CONSENT_STATES = [
  {
    id: "not_connected",
    ownerVisible: true,
    terminal: false,
    meaning: "No connector consent exists; formal mode must show unavailable or setup-required state.",
    allowedNext: ["drafted_scope", "blocked_security_review"],
  },
  {
    id: "drafted_scope",
    ownerVisible: true,
    terminal: false,
    meaning: "A scope proposal exists, but the owner has not granted connector access.",
    allowedNext: ["owner_consented", "not_connected", "blocked_security_review"],
  },
  {
    id: "owner_consented",
    ownerVisible: true,
    terminal: false,
    meaning: "The owner approved a bounded scope; DATTR-024E-CONTRACT still performs no runtime OAuth or sync.",
    allowedNext: ["paused_by_owner", "revoke_requested", "blocked_provider_event"],
  },
  {
    id: "paused_by_owner",
    ownerVisible: true,
    terminal: false,
    meaning: "Scheduled or polling activity must stop until the owner resumes the connection.",
    allowedNext: ["resume_requested", "revoke_requested"],
  },
  {
    id: "resume_requested",
    ownerVisible: true,
    terminal: false,
    meaning: "The owner asked to resume, but runtime revalidation and audit storage are still required.",
    allowedNext: ["owner_consented", "blocked_security_review"],
  },
  {
    id: "revoke_requested",
    ownerVisible: true,
    terminal: false,
    meaning: "The owner asked to revoke source access; future runtime must stop sync before deleting or retaining data.",
    allowedNext: ["revoked", "retention_delete_requested"],
  },
  {
    id: "revoked",
    ownerVisible: true,
    terminal: true,
    meaning: "Provider access is revoked and future reads are blocked; existing assets follow retention rules.",
    allowedNext: [],
  },
  {
    id: "blocked_security_review",
    ownerVisible: true,
    terminal: false,
    meaning: "Connector setup is blocked until scope, secrets, event verification, retention, or public-output risk is reviewed.",
    allowedNext: ["drafted_scope", "not_connected"],
  },
  {
    id: "blocked_provider_event",
    ownerVisible: true,
    terminal: false,
    meaning: "A provider event was received but cannot be trusted, verified, replay-checked, or audited yet.",
    allowedNext: ["owner_consented", "revoke_requested"],
  },
  {
    id: "retention_delete_requested",
    ownerVisible: true,
    terminal: false,
    meaning: "Deletion or purge has been requested and must be audited before any source records are removed.",
    allowedNext: ["revoked"],
  },
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_REQUIREMENTS = [
  {
    area: "consent-scope",
    status: "boundary_ready_no_runtime",
    requirement:
      "Every connector must define provider, owner-approved scope, consent version, source identity refs, and default retention before runtime.",
    acceptance: [
      "Scope is provider-specific and reviewable by the owner.",
      "Broad mailbox, drive, chat, repo, or web crawl scope is rejected unless explicitly reviewed.",
      "Formal mode can show setup-required state without fake connector data.",
    ],
    rejects: ["implicit background ingestion", "shadow capture", "provider-wide default sync"],
  },
  {
    area: "pause-resume-revoke",
    status: "boundary_ready_no_runtime",
    requirement:
      "Pause, resume, revoke, and retention-delete requests must be explicit owner-reviewed commands before connector runtime.",
    acceptance: [
      "Revocation stops future reads before retention or deletion actions run.",
      "Resume requires scope and token freshness revalidation.",
      "Deletion is separate from revocation and follows retention/audit policy.",
    ],
    rejects: ["silent resume", "delete-on-revoke without review", "sync after revoked state"],
  },
  {
    area: "provider-event-verification",
    status: "boundary_ready_no_runtime",
    requirement:
      "Provider events and webhooks are untrusted until raw-body signature, timestamp/window, provider identity, and event type are verified.",
    acceptance: [
      "Webhook route handlers remain absent in DATTR-024E-CONTRACT.",
      "Future handlers must verify signatures before deserializing or trusting payloads.",
      "Unrecognized event types are blocked and audited, not processed.",
    ],
    rejects: ["unsigned provider events", "JSON parse before signature plan", "unbounded event type handling"],
  },
  {
    area: "replay-protection",
    status: "boundary_ready_no_runtime",
    requirement:
      "Future provider events require delivery id, timestamp tolerance, idempotency key, dedupe key, and processed-event memory before side effects.",
    acceptance: [
      "Duplicate delivery ids are rejected or treated as idempotent.",
      "Stale timestamps are rejected according to provider tolerance.",
      "Retry and dead-letter behavior is auditable.",
    ],
    rejects: ["blind retry side effects", "no delivery id storage", "accepting stale events"],
  },
  {
    area: "secret-separation",
    status: "boundary_ready_no_runtime",
    requirement:
      "OAuth tokens, webhook secrets, signing secrets, refresh tokens, and provider credentials must stay outside source workflow rows.",
    acceptance: [
      "SourceConnection stores secretRef or providerRef, not raw credentials.",
      "Secret rotation and revocation are audit-referenced.",
      "No secret, token, cookie, raw auth claim, DB URL, or provider payload appears in UI DTOs or proof packets.",
    ],
    rejects: ["credential fields in raw source rows", "secrets in generated evidence", "client-visible provider tokens"],
  },
  {
    area: "retention-deletion",
    status: "boundary_ready_no_runtime",
    requirement:
      "Revoked, deleted, unsent, archived, or externally removed source objects must map to reviewable retention and deletion states.",
    acceptance: [
      "Provider deletion signals create deletion-review work, not silent data loss.",
      "Raw payload expiry, normalized content retention, proposal retention, and lineage retention are separated.",
      "High-risk source assets require explicit purge/review policy.",
    ],
    rejects: ["silent source deletion", "retaining revoked raw payload forever", "public/client exposure after revoke"],
  },
  {
    area: "audit-refs",
    status: "boundary_ready_no_runtime",
    requirement:
      "Connector state changes and provider-event decisions map to the ai-input.source-workflow audit family before runtime.",
    acceptance: [
      "Consent, pause, resume, revoke, provider-event verified, provider-event blocked, replay rejected, and retention delete are named audit actions.",
      "Audit refs are redacted and protected owner/admin only.",
      "No persisted audit claim is made until OperatingAuditEvent schema/runtime exists.",
    ],
    rejects: ["unlogged connector state change", "public audit payload", "provider secret in audit metadata"],
  },
  {
    area: "runtime-stop-conditions",
    status: "boundary_ready_no_runtime",
    requirement:
      "DATTR-024E-CONTRACT stops before connector runtime, provider reads, raw payload handling, public output, or external registration.",
    acceptance: [
      "routeHandlerAllowedInDattr024eContract: false",
      "oauthRuntimeAllowed: false",
      "webhookRuntimeAllowed: false",
      "pollingRuntimeAllowed: false",
      "providerApiCallAllowed: false",
      "fileIngestionAllowed: false",
      "ocrTranscriptionAllowed: false",
      "rawAdapterPayloadExposureAllowed: false",
      "externalRegisterable: false",
    ],
    rejects: ["OAuth callback implementation", "webhook endpoint implementation", "provider API reads", "external agent database access"],
  },
] as const satisfies readonly AIInputSourceWorkflowConnectorBoundaryRequirement[];

const CONNECTOR_BOUNDARY_STOP_CONDITIONS = [
  "No route handler in DATTR-024E-CONTRACT.",
  "No OAuth callback in DATTR-024E-CONTRACT.",
  "No webhook endpoint in DATTR-024E-CONTRACT.",
  "No polling job in DATTR-024E-CONTRACT.",
  "No provider API call in DATTR-024E-CONTRACT.",
  "No file ingestion in DATTR-024E-CONTRACT.",
  "No OCR or transcription in DATTR-024E-CONTRACT.",
  "No raw adapter payload exposure in DATTR-024E-CONTRACT.",
  "No Prisma schema edit in DATTR-024E-CONTRACT.",
  "No migration apply in DATTR-024E-CONTRACT.",
  "No DB read/write in DATTR-024E-CONTRACT.",
  "No public output expansion in DATTR-024E-CONTRACT.",
  "No module final write in DATTR-024E-CONTRACT.",
  "No external collaboration in DATTR-024E-CONTRACT.",
  "No external agent database access in DATTR-024E-CONTRACT.",
  "externalRegisterable: false.",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_COMMANDS = [
  {
    id: "ai-input.connector.scope.review",
    label: "Review connector scope",
    fromStates: ["not_connected", "blocked_security_review"],
    toState: "drafted_scope",
    auditAction: "connector.scope_reviewed",
    ownerApproval: "OWNER_REVIEW_REQUIRED",
    runtimeAllowedInContract: false,
    validation: [
      "Provider, source kind, owner-visible scope, minimum permission, retention class, and blocked broad-scope behavior are required.",
      "Future runtime must call requireUser() and service-layer authorization before loading or changing SourceConnection.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.connector.consent.grant",
    label: "Grant connector consent",
    fromStates: ["drafted_scope"],
    toState: "owner_consented",
    auditAction: "connector.consent_granted",
    ownerApproval: "HUMAN_APPROVAL_REQUIRED",
    runtimeAllowedInContract: false,
    validation: [
      "Consent version, approved scopes, provider account label, token storage strategy, and revoke path are mandatory.",
      "DATTR-024E-CONTRACT records the boundary only and cannot call OAuth or store provider credentials.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.connector.pause",
    label: "Pause connector",
    fromStates: ["owner_consented", "resume_requested"],
    toState: "paused_by_owner",
    auditAction: "connector.paused",
    ownerApproval: "OWNER_REVIEW_REQUIRED",
    runtimeAllowedInContract: false,
    validation: [
      "Pause must stop scheduled or polling activity before future runtime resumes.",
      "In-flight provider events must finish as blocked or idempotent, not hidden side effects.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.connector.resume",
    label: "Resume connector",
    fromStates: ["paused_by_owner"],
    toState: "resume_requested",
    auditAction: "connector.resumed",
    ownerApproval: "OWNER_REVIEW_REQUIRED",
    runtimeAllowedInContract: false,
    validation: [
      "Resume requires token freshness, scope version, retention status, and replay cursor review.",
      "Future runtime must not resume revoked or deletion-requested connections.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.connector.revoke",
    label: "Revoke connector",
    fromStates: ["owner_consented", "paused_by_owner", "resume_requested", "blocked_provider_event"],
    toState: "revoke_requested",
    auditAction: "connector.revoked",
    ownerApproval: "HUMAN_APPROVAL_REQUIRED",
    runtimeAllowedInContract: false,
    validation: [
      "Future runtime must revoke or invalidate provider credentials where provider support exists.",
      "Existing SourceAsset and proposal retention follow policy and are not silently deleted.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.provider-event.receive",
    label: "Receive provider event candidate",
    fromStates: ["owner_consented"],
    toState: "blocked_provider_event",
    auditAction: "provider_event.received",
    ownerApproval: "BLOCKED_UNTIL_RUNTIME_REVIEW",
    runtimeAllowedInContract: false,
    validation: [
      "Future route handler must preserve raw body for signature verification before parsing.",
      "Provider, event type, delivery id, timestamp, and idempotency key are required before side effects.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.provider-event.verify",
    label: "Verify provider event",
    fromStates: ["blocked_provider_event"],
    toState: "owner_consented",
    auditAction: "provider_event.verified",
    ownerApproval: "BLOCKED_UNTIL_RUNTIME_REVIEW",
    runtimeAllowedInContract: false,
    validation: [
      "Future verification must validate signature, timestamp/window, provider account, scope, and event type allowlist.",
      "Verified events still create SourceAsset or proposal candidates only after persistence/audit runtime is approved.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.provider-event.reject_replay",
    label: "Reject replayed provider event",
    fromStates: ["blocked_provider_event", "owner_consented"],
    toState: "blocked_provider_event",
    auditAction: "provider_event.replay_rejected",
    ownerApproval: "BLOCKED_UNTIL_RUNTIME_REVIEW",
    runtimeAllowedInContract: false,
    validation: [
      "Future runtime must compare delivery id, event id, timestamp, cursor, and idempotency key before side effects.",
      "Replay rejection is auditable and does not leak raw provider payload.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.provider-event.block",
    label: "Block untrusted provider event",
    fromStates: ["blocked_provider_event", "owner_consented"],
    toState: "blocked_provider_event",
    auditAction: "provider_event.blocked",
    ownerApproval: "BLOCKED_UNTIL_RUNTIME_REVIEW",
    runtimeAllowedInContract: false,
    validation: [
      "Unverified signature, stale timestamp, disallowed event type, revoked connection, or broad scope mismatch blocks the event.",
      "Blocked event output contains status labels only, not raw provider body.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
  {
    id: "ai-input.connector.retention.delete_request",
    label: "Request connector retention deletion",
    fromStates: ["revoke_requested", "revoked", "paused_by_owner"],
    toState: "retention_delete_requested",
    auditAction: "retention.delete_requested",
    ownerApproval: "HUMAN_APPROVAL_REQUIRED",
    runtimeAllowedInContract: false,
    validation: [
      "Deletion request must identify retention class, source object family, audit refs, and blocked public exposure.",
      "Permanent lineage and ModuleWriteIntent audit trails are annotated or redacted rather than silently destroyed.",
    ],
    stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
  },
] as const satisfies readonly AIInputSourceWorkflowConnectorCommand[];

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_AUDIT_REFS = {
  family: "ai-input.source-workflow",
  actions: [
    "connector.scope_reviewed",
    "connector.consent_granted",
    "connector.paused",
    "connector.resumed",
    "connector.revoked",
    "connector.consent_changed",
    "provider_event.received",
    "provider_event.verified",
    "provider_event.blocked",
    "provider_event.replay_rejected",
    "retention.delete_requested",
  ],
  futureSubjectRefs: [
    "sourceConnectionRef",
    "sourceAssetRef",
    "providerEventRef",
    "consentVersionRef",
    "retentionPolicyRef",
    "proofRef",
  ],
} as const;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_OFFICIAL_REFS = [
  "https://datatracker.ietf.org/doc/html/rfc7009",
  "https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries",
  "https://docs.stripe.com/webhooks",
  "https://docs.stripe.com/webhooks/signature",
  "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_SUMMARY = {
  id: "DATTR-024E-CONTRACT",
  status: "boundary_ready_no_runtime",
  requiredProviders: AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_PROVIDERS.map((provider) => provider.id),
  requiredRequirementAreas: AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_REQUIREMENTS.map(
    (requirement) => requirement.area,
  ),
  requiredCommandIds: AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_COMMANDS.map((command) => command.id),
  auditRefs: AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_AUDIT_REFS,
  sourceDocs: [
    "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
    "docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md",
    "docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md",
    "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  ],
  officialRefs: AI_INPUT_SOURCE_WORKFLOW_CONNECTOR_BOUNDARY_OFFICIAL_REFS,
  nandaPosture: {
    affectedCapability: "AI Input connector-assisted source workflow intake",
    protectedOwnerVisible: true,
    internalRuntimeAllowedAfterApproval: true,
    externalRegisterable: false,
    directDataStoreAccessForExternalAgents: false,
  },
  safetyGuards: {
    routeHandlerAllowedInDattr024eContract: false,
    oauthRuntimeAllowed: false,
    webhookRuntimeAllowed: false,
    pollingRuntimeAllowed: false,
    providerApiCallAllowed: false,
    fileIngestionAllowed: false,
    ocrTranscriptionAllowed: false,
    rawAdapterPayloadExposureAllowed: false,
    schemaWriteAllowed: false,
    migrationApplyAllowed: false,
    runtimeReadAllowed: false,
    runtimeWriteAllowed: false,
    publicOutputAllowed: false,
    moduleFinalWriteAllowed: false,
    externalCollaborationAllowed: false,
    externalAgentDatabaseAccessAllowed: false,
    externalRegisterable: false,
  },
  nextRecommendedTask:
    "AUTH-005 or WORK-009 if proof prerequisites appear; otherwise full DATTR-024 remains blocked until migration, authz, audit storage, and approved connector runtime are ready.",
  stopConditions: CONNECTOR_BOUNDARY_STOP_CONDITIONS,
} as const;
