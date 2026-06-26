export type AIInputSourceWorkflowProposalActionObjectId =
  | "DataUnitProposal"
  | "ModuleWriteIntent"
  | "OperatingAuditEvent";

export type AIInputSourceWorkflowProposalActionCommandId =
  | "ai-input.proposal.review"
  | "ai-input.proposal.request_changes"
  | "ai-input.proposal.approve_for_write_intent"
  | "ai-input.proposal.reject"
  | "ai-input.proposal.archive"
  | "ai-input.write-intent.review"
  | "ai-input.write-intent.approve_draft"
  | "ai-input.write-intent.request_changes"
  | "ai-input.write-intent.reject"
  | "ai-input.write-intent.cancel";

export type AIInputSourceWorkflowProposalActionStateId =
  | "drafted_by_agent"
  | "needs_owner_review"
  | "changes_requested"
  | "approved_for_write_intent"
  | "write_intent_draft"
  | "approved_for_manual_apply"
  | "rejected"
  | "archived"
  | "superseded"
  | "blocked_high_risk";

export type AIInputSourceWorkflowProposalActionApprovalLevel =
  | "AUTO_PROPOSE_ONLY"
  | "OWNER_REVIEW_REQUIRED"
  | "HUMAN_APPROVAL_REQUIRED"
  | "BLOCKED_UNTIL_PROOF_TARGET"
  | "BLOCKED_HIGH_RISK";

export type AIInputSourceWorkflowProposalActionCommand = {
  readonly id: AIInputSourceWorkflowProposalActionCommandId;
  readonly label: string;
  readonly targetObject: AIInputSourceWorkflowProposalActionObjectId;
  readonly fromStates: readonly AIInputSourceWorkflowProposalActionStateId[];
  readonly toState: AIInputSourceWorkflowProposalActionStateId;
  readonly approvalLevel: AIInputSourceWorkflowProposalActionApprovalLevel;
  readonly auditAction: string;
  readonly validation: readonly string[];
  readonly rollback: readonly string[];
  readonly stopConditions: readonly string[];
};

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_OBJECTS = [
  "DataUnitProposal",
  "ModuleWriteIntent",
  "OperatingAuditEvent",
] as const satisfies readonly AIInputSourceWorkflowProposalActionObjectId[];

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_STATES = [
  {
    id: "drafted_by_agent",
    ownerVisible: false,
    terminal: false,
    meaning:
      "A bounded internal AI workflow drafted a DataUnitProposal but it is not yet owner-reviewable.",
    allowedNext: ["needs_owner_review", "blocked_high_risk"],
  },
  {
    id: "needs_owner_review",
    ownerVisible: true,
    terminal: false,
    meaning:
      "The proposal is visible to the owner with source refs, confidence, target module, and redaction status.",
    allowedNext: ["changes_requested", "approved_for_write_intent", "rejected", "archived"],
  },
  {
    id: "changes_requested",
    ownerVisible: true,
    terminal: false,
    meaning:
      "The owner asked for revision; the proposal remains proposal-only and no target module row changes.",
    allowedNext: ["needs_owner_review", "rejected", "archived"],
  },
  {
    id: "approved_for_write_intent",
    ownerVisible: true,
    terminal: false,
    meaning:
      "The owner approved a DataUnitProposal to become a ModuleWriteIntent draft, not a final module write.",
    allowedNext: ["write_intent_draft", "superseded"],
  },
  {
    id: "write_intent_draft",
    ownerVisible: true,
    terminal: false,
    meaning:
      "A ModuleWriteIntent draft exists and waits for module-specific authorization and risk review.",
    allowedNext: ["approved_for_manual_apply", "changes_requested", "rejected", "blocked_high_risk"],
  },
  {
    id: "approved_for_manual_apply",
    ownerVisible: true,
    terminal: true,
    meaning:
      "The owner approved manual application in a future slice; DATTR-024D-CONTRACT still performs no final write.",
    allowedNext: [],
  },
  {
    id: "rejected",
    ownerVisible: true,
    terminal: true,
    meaning:
      "The proposal or write intent is rejected; only minimal provenance and reason refs may be retained.",
    allowedNext: [],
  },
  {
    id: "archived",
    ownerVisible: true,
    terminal: true,
    meaning:
      "The proposal is archived without target module side effects.",
    allowedNext: [],
  },
  {
    id: "superseded",
    ownerVisible: true,
    terminal: true,
    meaning:
      "A newer proposal or write intent replaces this one; lineage remains audit-visible.",
    allowedNext: [],
  },
  {
    id: "blocked_high_risk",
    ownerVisible: true,
    terminal: false,
    meaning:
      "The proposal targets a high-risk module or public/external action and requires explicit human approval.",
    allowedNext: ["rejected", "archived"],
  },
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_APPROVAL_LEVELS = [
  {
    id: "AUTO_PROPOSE_ONLY",
    description:
      "AI workflows may draft proposal candidates only; they cannot approve, persist final records, publish, or register externally.",
  },
  {
    id: "OWNER_REVIEW_REQUIRED",
    description:
      "The owner must review source refs, target module, confidence, redaction, and audit refs before promotion.",
  },
  {
    id: "HUMAN_APPROVAL_REQUIRED",
    description:
      "Life, Finance, Company, Client Portal, auth/permission, public output, and external collaboration require explicit human approval before any final write.",
  },
  {
    id: "BLOCKED_UNTIL_PROOF_TARGET",
    description:
      "Runtime proposal writes require approved proof target, authz boundary, audit storage, and rollback evidence.",
  },
  {
    id: "BLOCKED_HIGH_RISK",
    description:
      "High-risk proposals stop before final writes until product, security, and owner approval are complete.",
  },
] as const;

const PROPOSAL_ACTION_STOP_CONDITIONS = [
  "No route handler in DATTR-024D-CONTRACT.",
  "No server action in DATTR-024D-CONTRACT.",
  "No Prisma schema edit in DATTR-024D-CONTRACT.",
  "No migration apply in DATTR-024D-CONTRACT.",
  "No seed change in DATTR-024D-CONTRACT.",
  "No DB read/write in DATTR-024D-CONTRACT.",
  "No connector runtime in DATTR-024D-CONTRACT.",
  "No provider data read in DATTR-024D-CONTRACT.",
  "No public output expansion in DATTR-024D-CONTRACT.",
  "No module final write in DATTR-024D-CONTRACT.",
  "No external collaboration in DATTR-024D-CONTRACT.",
  "No external agent database access in DATTR-024D-CONTRACT.",
  "externalRegisterable: false.",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_COMMANDS = [
  {
    id: "ai-input.proposal.review",
    label: "Review source workflow proposal",
    targetObject: "DataUnitProposal",
    fromStates: ["drafted_by_agent", "needs_owner_review"],
    toState: "needs_owner_review",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "proposal.reviewed",
    validation: [
      "Future runtime entry must call requireUser() before loading proposal details.",
      "Future runtime entry must enforce service-layer authorization by ownerProfileId and target module.",
      "Proposal view must include source refs, target module, confidence summary, redactionVersion, and no raw private payload.",
    ],
    rollback: [
      "Review is reversible by leaving the proposal in needs_owner_review.",
      "No target module rollback is needed because no final module write occurs.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.proposal.request_changes",
    label: "Request proposal changes",
    targetObject: "DataUnitProposal",
    fromStates: ["needs_owner_review"],
    toState: "changes_requested",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "proposal.changes_requested",
    validation: [
      "Change reason is required and must be redacted before owner/admin audit display.",
      "Source refs stay attached so the revised proposal remains traceable.",
    ],
    rollback: [
      "Owner can return the proposal to needs_owner_review in a future approved action.",
      "No target module row exists to undo.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.proposal.approve_for_write_intent",
    label: "Approve proposal for write-intent draft",
    targetObject: "DataUnitProposal",
    fromStates: ["needs_owner_review"],
    toState: "approved_for_write_intent",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "proposal.approved",
    validation: [
      "Future action must validate targetModule, sourceAsset refs, proposal checksum, redactionVersion, and owner decision timestamp.",
      "Promotion creates or enables a ModuleWriteIntent draft only after proof target, authz, and audit storage are approved.",
      "High-risk target modules move to blocked_high_risk instead of final writes.",
    ],
    rollback: [
      "Supersede the proposal or reject the generated ModuleWriteIntent draft.",
      "No final module write is performed in this contract.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.proposal.reject",
    label: "Reject proposal",
    targetObject: "DataUnitProposal",
    fromStates: ["needs_owner_review", "changes_requested", "blocked_high_risk"],
    toState: "rejected",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "proposal.rejected",
    validation: [
      "Reject reason is optional but must never include provider secrets, raw source bodies, cookies, tokens, or private payload.",
      "Rejected proposal keeps minimal provenance and reason refs according to retentionClass.",
    ],
    rollback: [
      "A rejected proposal is terminal; future reconsideration requires a new proposal with lineage.",
      "No target module row exists to undo.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.proposal.archive",
    label: "Archive proposal",
    targetObject: "DataUnitProposal",
    fromStates: ["needs_owner_review", "changes_requested", "blocked_high_risk"],
    toState: "archived",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "proposal.archived",
    validation: [
      "Archive action preserves source refs and audit refs while removing the proposal from active owner queues.",
      "Archive action cannot be used as a silent approval path.",
    ],
    rollback: [
      "A future reviewed restore command must create a new active proposal version.",
      "No final module row exists to undo.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.write-intent.review",
    label: "Review module write-intent draft",
    targetObject: "ModuleWriteIntent",
    fromStates: ["write_intent_draft"],
    toState: "write_intent_draft",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "write_intent.reviewed",
    validation: [
      "Future runtime entry must call requireUser() and target-module service authorization before showing write-intent detail.",
      "Write-intent view must include target module, target record ref, proposal lineage, rollback refs, risk level, and approval level.",
    ],
    rollback: [
      "Review leaves the write intent in draft state.",
      "No target module row changes in DATTR-024D-CONTRACT.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.write-intent.approve_draft",
    label: "Approve write-intent draft for manual apply",
    targetObject: "ModuleWriteIntent",
    fromStates: ["write_intent_draft"],
    toState: "approved_for_manual_apply",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    auditAction: "write_intent.approved_draft",
    validation: [
      "Approval requires target-module authorization, proof refs, rollback refs, and high-risk policy review.",
      "Client Portal, public output, auth/permission, external collaboration, Finance, Life, and Company stay blocked until explicit human approval.",
    ],
    rollback: [
      "Approved manual apply still does not write the target module in this contract.",
      "A future apply slice must define exact rollback refs before changing target records.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.write-intent.request_changes",
    label: "Request write-intent changes",
    targetObject: "ModuleWriteIntent",
    fromStates: ["write_intent_draft"],
    toState: "changes_requested",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "write_intent.changes_requested",
    validation: [
      "Change request must preserve proposal lineage and target module risk classification.",
      "No target module mutation can be hidden behind a revision request.",
    ],
    rollback: [
      "Owner can reject the write intent or create a revised draft in a future approved action.",
      "No final module row exists to undo.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.write-intent.reject",
    label: "Reject write-intent draft",
    targetObject: "ModuleWriteIntent",
    fromStates: ["write_intent_draft", "blocked_high_risk", "changes_requested"],
    toState: "rejected",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "write_intent.rejected",
    validation: [
      "Rejected write intent retains proposal lineage, owner decision ref, and redacted reason.",
      "Rejected write intent must not mutate Work, Research, Life, Finance, Chamber, Company, or Client Portal records.",
    ],
    rollback: [
      "A rejected write intent is terminal; reconsideration requires a new write intent with lineage.",
      "No final module row exists to undo.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
  {
    id: "ai-input.write-intent.cancel",
    label: "Cancel write-intent draft",
    targetObject: "ModuleWriteIntent",
    fromStates: ["write_intent_draft", "changes_requested", "blocked_high_risk"],
    toState: "archived",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    auditAction: "write_intent.cancelled",
    validation: [
      "Cancel action removes the write intent from active queues without approving target module changes.",
      "Cancel action must keep audit refs and source lineage available to protected owner/admin views.",
    ],
    rollback: [
      "Future restore must create a new draft version instead of mutating the cancelled record in place.",
      "No target module row exists to undo.",
    ],
    stopConditions: PROPOSAL_ACTION_STOP_CONDITIONS,
  },
] as const satisfies readonly AIInputSourceWorkflowProposalActionCommand[];

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_AUDIT_REFS = [
  {
    family: "ai-input.source-workflow",
    action: "proposal.reviewed",
    targetObject: "DataUnitProposal",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    retention: "decision_metadata_plus_source_refs",
    redaction: "No provider secrets, raw source bodies, cookies, tokens, raw claims, profile IDs, row IDs, or private payload.",
  },
  {
    family: "ai-input.source-workflow",
    action: "proposal.changes_requested",
    targetObject: "DataUnitProposal",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    retention: "redacted_reason_plus_source_refs",
    redaction: "No raw prompt, source body, or provider payload in owner/admin audit DTOs.",
  },
  {
    family: "ai-input.source-workflow",
    action: "proposal.approved",
    targetObject: "DataUnitProposal",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    retention: "proposal_checksum_plus_write_intent_ref",
    redaction: "No target module final payload is persisted by this contract.",
  },
  {
    family: "ai-input.source-workflow",
    action: "proposal.rejected",
    targetObject: "DataUnitProposal",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    retention: "minimal_rejection_reason_plus_provenance",
    redaction: "Rejected payload bodies expire by retentionClass.",
  },
  {
    family: "ai-input.source-workflow",
    action: "write_intent.reviewed",
    targetObject: "ModuleWriteIntent",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    retention: "intent_summary_plus_rollback_refs",
    redaction: "No final target record body is exposed.",
  },
  {
    family: "ai-input.source-workflow",
    action: "write_intent.approved_draft",
    targetObject: "ModuleWriteIntent",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    retention: "approval_ref_plus_manual_apply_gate",
    redaction: "Approved draft is not a final module write.",
  },
  {
    family: "ai-input.source-workflow",
    action: "write_intent.rejected",
    targetObject: "ModuleWriteIntent",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    retention: "redacted_rejection_reason_plus_lineage",
    redaction: "No high-risk module final payload is retained.",
  },
  {
    family: "ai-input.source-workflow",
    action: "write_intent.cancelled",
    targetObject: "ModuleWriteIntent",
    approvalLevel: "OWNER_REVIEW_REQUIRED",
    retention: "cancel_ref_plus_lineage",
    redaction: "No target module row is changed.",
  },
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_ROLLBACK = {
  id: "DATTR-024D-CONTRACT",
  expectation:
    "Every future proposal action is reversible through proposal/write-intent lifecycle state, supersede refs, rejection, archive, or future manual-apply rollback refs before any final module write exists.",
  requiredRefs: [
    "sourceAssetRef",
    "dataUnitProposalRef",
    "moduleWriteIntentRef",
    "proposalChecksum",
    "decisionActorRef",
    "decisionAuditRef",
    "rollbackPlanRef",
    "proofRef",
  ],
  rejectedShortcuts: [
    "Overwriting proposals without lineage.",
    "Approving final module writes from proposal approval.",
    "Publishing public/client-visible output from a proposal decision.",
    "Letting an external agent apply database writes.",
  ],
} as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_HIGH_RISK_POLICY = [
  {
    target: "finance",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    policy: "Draft-only until explicit owner approval and rollback refs exist.",
  },
  {
    target: "life",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    policy: "Private-life context stays proposal-only before final writes.",
  },
  {
    target: "company",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    policy: "Company strategy writes require confidentiality review.",
  },
  {
    target: "client-portal",
    approvalLevel: "HUMAN_APPROVAL_REQUIRED",
    policy: "Client-visible output requires explicit clientVisible review and public-output safety gates.",
  },
  {
    target: "public-output",
    approvalLevel: "BLOCKED_HIGH_RISK",
    policy: "No public output expansion in DATTR-024D-CONTRACT.",
  },
  {
    target: "auth-permission",
    approvalLevel: "BLOCKED_HIGH_RISK",
    policy: "Auth and permission changes remain outside AI Input proposal actions.",
  },
  {
    target: "external-collaboration",
    approvalLevel: "BLOCKED_HIGH_RISK",
    policy: "External collaboration and external registration require human approval.",
  },
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_STOP_CONDITIONS =
  PROPOSAL_ACTION_STOP_CONDITIONS;

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_SOURCE_REFS = [
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md",
  "docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md",
  "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/06_audits-and-reports/RPT-009_loop-63-research-gap-review.md",
  "docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-64-20260621-ai-input-source-workflow-ops-readiness.md",
  "docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-65-20260621-launch-level-review.md",
  "https://nextjs.org/docs/app/getting-started/mutating-data",
  "https://nextjs.org/docs/app/guides/forms",
  "https://supabase.com/docs/guides/database/postgres/row-level-security",
  "https://www.prisma.io/docs/orm/prisma-client/queries/transactions",
] as const;

export const AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_SUMMARY = {
  id: "DATTR-024D-CONTRACT",
  sourceSplitSlice: "DATTR-024D",
  status: "ready_for_proposal_action_contract_use",
  commandCount: AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_COMMANDS.length,
  stateCount: AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_STATES.length,
  approvalLevelCount: AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_APPROVAL_LEVELS.length,
  auditRefCount: AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_AUDIT_REFS.length,
  targetObjects: AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_OBJECTS,
  completedFollowUpSlice: "DATTR-024E-CONTRACT",
  nextRunnableSlice: "DATTR-024",
  nandaAlignment: {
    affectedCapability: "AI Input internal source workflow proposal review",
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
    serverActionAllowedInDattr024dContract: false,
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
  sourceRefs: AI_INPUT_SOURCE_WORKFLOW_PROPOSAL_ACTION_SOURCE_REFS,
} as const;
