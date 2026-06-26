import type { Confidence, EntityType } from "@/types/ai"

// ─── Source Connection ────────────────────────────────────────────────────────

export type SourceProvider =
  | "manual"
  | "line"
  | "telegram"
  | "google_drive"
  | "google_docs"
  | "google_calendar"
  | "google_contacts"
  | "google_sheets"
  | "gmail"
  | "local_file"
  | "local_repo"
  | "markdown_repo"
  | "url"
  | "web_page"
  | "rss"
  | "atom"
  | "github"
  | "clipboard"
  | "browser_capture"
  | "camera"
  | "microphone"
  | "screen_capture"
  | "api"
  | "webhook"
  | "client_portal"
  | "external_ai"
  | "other"

export type SourceConnectionStatus =
  | "connected"
  | "disconnected"
  | "mock"
  | "needs_setup"
  | "planned"
  | "paused"
  | "error"
  | "revoked"

export type SourceAuthMode =
  | "none"
  | "manual"
  | "oauth"
  | "api_key"
  | "webhook_secret"
  | "bot_token"
  | "service_account"
  | "browser_permission"
  | "local_permission"

export type SourceSyncMode =
  | "manual"
  | "scheduled"
  | "polling"
  | "webhook"
  | "source_event"
  | "one_time_import"

export type SourceScopeStatus = "draft" | "active" | "paused" | "revoked"

export interface SourceConnectionScope {
  id?: string
  label?: string
  status?: SourceScopeStatus
  providerObjectType?: string
  providerObjectId?: string
  rawScope?: Record<string, unknown>
  defaultModuleKey?: string
  includeAttachments?: boolean
  includeDeletedEvents?: boolean
  includeInMorningBrief?: boolean
  createdAt?: string
  updatedAt?: string
}

export type SourceConsentStatus =
  | "not_required"
  | "required"
  | "granted"
  | "expired"
  | "revoked"
  | "needs_review"

export interface SourceConnectionConsent {
  status: SourceConsentStatus
  grantedAt?: string
  expiresAt?: string
  revokedAt?: string
  grantedBy?: string
  scopeVersion?: string
  approvedScopes?: string[]
}

export type SourceConnectionHealthStatus =
  | "healthy"
  | "idle"
  | "running"
  | "stale"
  | "needs_review"
  | "rate_limited"
  | "permission_error"
  | "failed"
  | "unknown"

export interface SourceConnectionHealth {
  status: SourceConnectionHealthStatus
  lastCheckedAt?: string
  lastErrorAt?: string
  lastErrorSummary?: string
  nextRetryAt?: string
}

export interface SourceConnection {
  id: string
  provider: SourceProvider
  displayName: string
  status: SourceConnectionStatus
  authMode?: SourceAuthMode
  syncMode?: SourceSyncMode
  externalAccountId?: string | null
  accountLabel?: string | null
  scopes?: SourceConnectionScope[]
  consent?: SourceConnectionConsent
  health?: SourceConnectionHealth
  defaultModuleKey?: string | null
  riskLevel?: SourceRiskLevel
  lastSyncedAt: string | null
  syncCursor: string | null
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

export type InputAdapterSourceKind =
  | "manual_text"
  | "file"
  | "folder"
  | "document"
  | "message"
  | "conversation"
  | "email_thread"
  | "email_message"
  | "calendar_event"
  | "contact_profile"
  | "link"
  | "web_page"
  | "feed_item"
  | "media"
  | "dataset"
  | "api_response"
  | "webhook_event"
  | "external_agent_output"

export type InputAdapterCapabilityKey =
  | "manual_import"
  | "preview"
  | "polling_sync"
  | "webhook_receive"
  | "incremental_sync"
  | "attachment_fetch"
  | "deletion_event"
  | "external_delete_detection"
  | "url_fetch_candidate"
  | "html_snapshot_candidate"
  | "media_capture"
  | "message_threading"
  | "conversation_grouping"
  | "contact_identity"
  | "calendar_recurrence"
  | "file_revision"
  | "label_metadata"

export interface InputAdapterManifest {
  key: string
  provider: SourceProvider
  displayName: string
  version: string
  sourceKinds: InputAdapterSourceKind[]
  authModes: SourceAuthMode[]
  syncModes: SourceSyncMode[]
  capabilities: InputAdapterCapabilityKey[]
  requiredScopes?: string[]
  optionalScopes?: string[]
  defaultRiskLevel?: SourceRiskLevel
  supportsAttachments?: boolean
  supportsDeletionEvents?: boolean
  supportsIncrementalSync?: boolean
  supportsPreview?: boolean
}

export type AdapterLifecycleStage =
  | "discover"
  | "connect"
  | "authorize"
  | "preview"
  | "import_selected"
  | "normalize"
  | "propose"
  | "sync"
  | "pause"
  | "resume"
  | "revoke"

export type InputAdapterRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_review_needed"
  | "failed"
  | "cancelled"

export type SourceRetryPolicy =
  | "manual_only"
  | "retry_once"
  | "exponential_backoff"
  | "provider_scheduled"

export interface InputAdapterRun {
  id: string
  sourceConnectionId?: string
  adapterKey: string
  lifecycleStage: AdapterLifecycleStage
  status: InputAdapterRunStatus
  triggerType?: AIWorkflowTriggerType
  startedAt?: string
  completedAt?: string
  syncCursorBefore?: string | null
  syncCursorAfter?: string | null
  retryPolicy?: SourceRetryPolicy
  errorSummary?: string
  aiWorkflowRunId?: string
  createdBy?: AIWorkflowActor
  metadata?: Record<string, unknown>
}

export interface SourceSyncCursor {
  id: string
  sourceConnectionId: string
  provider: SourceProvider
  cursorType:
    | "message_id"
    | "event_id"
    | "update_id"
    | "history_id"
    | "change_token"
    | "revision_id"
    | "feed_item"
    | "timestamp"
    | "content_hash"
    | "commit_ref"
    | "other"
  cursorValue: string
  advancedAt: string
  adapterRunId?: string
}

export interface SourceDedupeKey {
  id: string
  sourceConnectionId?: string
  provider: SourceProvider
  dedupeKey: string
  strategy: string
  externalId?: string
  contentHash?: string
  createdAt: string
}

export interface SourceIdentityRef {
  provider: SourceProvider
  providerObjectType: string
  providerObjectId?: string
  providerParentId?: string
  providerRevisionId?: string
  providerUrl?: string
  occurredAt?: string
  timezone?: string
  raw?: Record<string, unknown>
}

export type SourceDeletionEventType =
  | "unsent"
  | "deleted"
  | "trashed"
  | "archived"
  | "permission_removed"
  | "revoked"
  | "unavailable"

export interface SourceDeletionEvent {
  id: string
  sourceConnectionId?: string
  sourceAssetId?: string
  rawSourceItemId?: string
  eventType: SourceDeletionEventType
  provider: SourceProvider
  providerEventId?: string
  occurredAt: string
  detectedAt: string
  reason?: string
  metadata?: Record<string, unknown>
}

export type SourceAttachmentRelation =
  | "message_attachment"
  | "email_attachment"
  | "calendar_link"
  | "document_link"
  | "url_snapshot"
  | "derived_transcript"
  | "derived_summary"
  | "derived_coding"
  | "other"

export interface SourceAttachmentRef {
  id: string
  parentSourceAssetId?: string
  parentRawSourceItemId?: string
  relation: SourceAttachmentRelation
  provider: SourceProvider
  providerAttachmentId?: string
  originalName?: string
  mimeType?: string
  sizeBytes?: number
  url?: string
  expiresAt?: string
  contentHash?: string
  metadata?: Record<string, unknown>
}

export interface InputAdapterOutput {
  id: string
  adapterRunId: string
  rawSourceItemIds?: string[]
  sourceAssetIds?: string[]
  attachmentRefs?: SourceAttachmentRef[]
  deletionEventIds?: string[]
  dedupeKeys?: SourceDedupeKey[]
  needsReview?: boolean
  reviewReason?: string
  metadata?: Record<string, unknown>
}

// ─── Raw Source Item ──────────────────────────────────────────────────────────

export type RawSourceType =
  | "manual_message"
  | "line_message"
  | "gmail_email"
  | "google_doc"
  | "markdown_document"
  | "image"
  | "audio"
  | "receipt"
  | "url"
  | "file"

export type ProcessingStatus = "unprocessed" | "processing" | "processed" | "failed"

export type AIStatus = "not_started" | "proposed" | "confirmed" | "dismissed"

export type PrivacyLevel = "private" | "shareable" | "public_safe"

export interface RawSourceItem {
  id: string
  sourceConnectionId: string
  sourceType: RawSourceType
  externalId: string | null
  sourceIdentity?: SourceIdentityRef
  dedupeKey?: string | null
  inputAdapterRunId?: string | null
  title: string | null
  rawText: string | null
  previewText: string | null
  mediaUrl: string | null
  mimeType: string | null
  authorName: string | null
  senderId: string | null
  conversationId: string | null
  capturedAt: string
  importedAt: string
  processingStatus: ProcessingStatus
  aiStatus: AIStatus
  contentHash: string | null
  deletionEventId?: string | null
  attachmentRefs?: SourceAttachmentRef[]
  metadata: Record<string, string | number | boolean>
  privacyLevel: PrivacyLevel
}

// ─── Resource Tree ────────────────────────────────────────────────────────────

export type ResourceNodeType = "folder" | "link" | "file"

export interface ResourceNode {
  id: string
  parentId: string | null
  type: ResourceNodeType
  title: string
  url?: string
  rawSourceItemId?: string
  createdAt: string
}

// ─── Normalized Content ───────────────────────────────────────────────────────

export type NormalizedContentType =
  | "message_text"
  | "document_text"
  | "document_chunk"
  | "transcript"
  | "image_summary"
  | "receipt_extraction"
  | "url_excerpt"

export interface NormalizedContent {
  id: string
  rawSourceItemId: string
  contentType: NormalizedContentType
  text: string
  orderIndex: number
  heading: string | null
  tokenEstimate: number
  metadata: Record<string, string | number | boolean>
  createdAt: string
}

// ─── Evidence ─────────────────────────────────────────────────────────────────

export interface Evidence {
  id: string
  rawSourceItemId: string
  normalizedContentId: string
  excerpt: string
  reasonUsed: string
  createdAt: string
}

// ─── AI Triage Proposal ───────────────────────────────────────────────────────

export type AITriageType =
  | "triage"
  | "project_context"
  | "research_mapping"
  | "finance_draft"
  | "life_care"
  | "memory_capture"

export type ProposalStatus = "pending" | "confirmed" | "edited" | "dismissed" | "deferred"

export interface AITriageProposal {
  id: string
  rawSourceItemIds: string[]
  evidenceIds: string[]
  aiType: AITriageType
  detectedType: string
  extractedEntities: string[]
  suggestedEntityType: EntityType | null
  suggestedEntityId: string | null
  suggestedPlacement: string | null
  summary: string
  recommendation: string
  reasoning: string
  confidence: Confidence
  status: ProposalStatus
  createdAt: string
}

// ─── User Decision ────────────────────────────────────────────────────────────

export type DecisionType = "confirm" | "edit" | "dismiss" | "defer"

export interface UserDecision {
  id: string
  proposalId: string
  decisionType: DecisionType
  editedSummary: string | null
  editedRecommendation: string | null
  createdAt: string
}

// ─── Derived helpers ──────────────────────────────────────────────────────────

export interface RawSourceItemWithDerived extends RawSourceItem {
  normalizedCount: number
  proposalCount: number
}

// ─── Single Source Recognition Layer Proposal ───────────────────────────────

export type SourceFormatDetector =
  | "browser"
  | "server_mime"
  | "file_signature"
  | "magic_bytes"
  | "apache_tika"
  | "content_sniffing"
  | "ai_guess"

export interface SourceFormatDetection {
  id: string
  sourceAssetId: string
  declaredMimeType?: string
  detectedMimeType?: string
  fileExtension?: string
  fileSignature?: string
  detector: SourceFormatDetector
  confidence: number
  mismatchDetected: boolean
  warning?: string
  createdAt: string
}

export interface SourceDescriptiveMetadata {
  id: string
  sourceAssetId: string
  title?: string
  creator?: string[]
  contributor?: string[]
  publisher?: string
  createdDate?: string
  modifiedDate?: string
  capturedDate?: string
  language?: string
  description?: string
  subjectTags?: string[]
  rights?: string
  license?: string
  identifier?: string
  relatedIdentifiers?: string[]
  sourceCitation?: string
  createdAt: string
  updatedAt: string
}

export type SourceProvenanceEventType =
  | "created"
  | "imported"
  | "uploaded"
  | "fetched"
  | "snapshotted"
  | "extracted"
  | "transcribed"
  | "classified"
  | "renamed_internal"
  | "linked"
  | "unlinked"
  | "archived"
  | "deleted_external_detected"

export type SourceProvenanceActorType =
  | "user"
  | "system"
  | "ai"
  | "external_provider"

export interface SourceProvenanceEvent {
  id: string
  sourceAssetId: string
  eventType: SourceProvenanceEventType
  actorType: SourceProvenanceActorType
  actorId?: string
  sourceProvider?: string
  method?: string
  inputAssetIds?: string[]
  outputAssetIds?: string[]
  timestamp: string
  metadata?: Record<string, unknown>
}

export type SourceEvidenceSelectorType =
  | "text_quote"
  | "text_position"
  | "page_range"
  | "time_range"
  | "bounding_box"
  | "json_pointer"
  | "spreadsheet_range"
  | "dom_selector"
  | "heading_path"

export interface SourceEvidenceSelector {
  id: string
  sourceAssetId: string
  snapshotId?: string
  selectorType: SourceEvidenceSelectorType
  exactText?: string
  prefix?: string
  suffix?: string
  startOffset?: number
  endOffset?: number
  pageNumber?: number
  startPage?: number
  endPage?: number
  startTimeMs?: number
  endTimeMs?: number
  boundingBox?: Record<string, unknown>
  jsonPointer?: string
  sheetName?: string
  cellRange?: string
  domSelector?: string
  headingPath?: string[]
  contentHash?: string
  createdAt: string
}

export type SourceAuthorityLevel =
  | "primary_source"
  | "derived_source"
  | "third_party_source"
  | "ai_generated"
  | "user_note"
  | "unknown"

export type SourceReliabilityLevel = "high" | "medium" | "low" | "unknown"
export type SourceFreshnessState = "current" | "stale" | "unknown"
export type SourceCompletenessState = "complete" | "partial" | "fragment" | "unknown"
export type SourceVerificationState = "unverified" | "system_verified" | "user_verified" | "conflicted"

export interface SourceQualityProfile {
  id: string
  sourceAssetId: string
  authorityLevel: SourceAuthorityLevel
  reliability: SourceReliabilityLevel
  freshness: SourceFreshnessState
  completeness: SourceCompletenessState
  verificationState: SourceVerificationState
  riskNotes?: string
  confidence?: number
  createdAt: string
  updatedAt: string
}

export type UrlSafetyStatus = "safe_to_fetch" | "manual_review_required" | "blocked"
export type UrlScheme = "http" | "https" | "file" | "ftp" | "other"
export type RobotsPolicyStatus = "allowed" | "disallowed" | "unknown" | "not_checked"

export interface UrlSafetyCheck {
  id: string
  sourceAssetId: string
  rawUrl: string
  normalizedUrl?: string
  scheme: UrlScheme
  isPrivateIp?: boolean
  isLocalhost?: boolean
  hasCredentialsInUrl?: boolean
  redirectCount?: number
  finalUrl?: string
  robotsPolicyStatus?: RobotsPolicyStatus
  safetyStatus: UrlSafetyStatus
  reason?: string
  checkedAt: string
}

export type MediaPrivacyAction =
  | "keep"
  | "strip_sensitive"
  | "strip_all"
  | "manual_review"

export interface MediaMetadataProfile {
  id: string
  sourceAssetId: string
  hasExif?: boolean
  hasGpsLocation?: boolean
  hasDeviceInfo?: boolean
  hasC2paManifest?: boolean
  c2paVerified?: boolean
  aiGeneratedSignal?: boolean
  privacyAction: MediaPrivacyAction
  extractedAt: string
}

export interface SourceFairProfile {
  id: string
  sourceAssetId: string
  findable: boolean
  accessible: boolean
  interoperable: boolean
  reusable: boolean
  hasPersistentId: boolean
  hasDescriptiveMetadata: boolean
  hasLicenseOrRights: boolean
  hasProvenance: boolean
  hasMachineReadableFormat: boolean
  createdAt: string
  updatedAt: string
}

// ─── Composite Data Unit Layer Proposal ─────────────────────────────────────

export type DataUnitKind =
  | "interview"
  | "case_record"
  | "meeting_record"
  | "research_packet"
  | "learning_record"
  | "client_packet"
  | "life_story_record"
  | "work_packet"
  | "generic_bundle"

export type DataUnitStatus = "draft" | "ready" | "in_review" | "active" | "archived"

export type DataUnitAssetRole =
  | "participant_profile"
  | "consent_document"
  | "raw_audio"
  | "raw_video"
  | "transcript"
  | "source_document"
  | "researcher_note"
  | "ai_summary"
  | "ai_coding"
  | "memo"
  | "attachment"
  | "reference"
  | "context_material"
  | "meeting_note"
  | "life_story"
  | "questionnaire_result"
  | "observation_note"

export type DataUnitAssetMembershipStatus =
  | "selected"
  | "user_selected"
  | "ai_selected"
  | "auto_selected"
  | "candidate"
  | "suggested"
  | "excluded"
  | "removed"

export type DataUnitSlotRequirement =
  | "required_by_policy"
  | "recommended"
  | "optional"
  | "not_needed"

export type DataUnitSlotStatus = "filled" | "missing" | "not_needed" | "partially_filled"

export type SourceNamingStatus =
  | "original_only"
  | "ai_suggested"
  | "ai_applied"
  | "user_confirmed"
  | "user_overridden"
  | "conflicted"

export type NamingSignalType =
  | "original_filename"
  | "filename_pattern"
  | "file_extension"
  | "mime_type"
  | "frontmatter_metadata"
  | "folder_path"
  | "import_batch"
  | "content_signature"
  | "ai_semantic_guess"
  | "user_override"

export type AIAutoActionLevel =
  | "suggest_only"
  | "auto_name"
  | "auto_group_draft"
  | "auto_select_low_risk"
  | "require_confirmation"

export interface SourceNamingProfile {
  id: string
  sourceAssetId: string
  originalName: string
  canonicalName?: string
  displayName?: string
  aliasNames?: string[]
  namingStatus: SourceNamingStatus
  inferredUnitCode?: string
  inferredUnitKind?: DataUnitKind
  inferredAssetRole?: DataUnitAssetRole
  confidence?: number
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  confirmedBy?: string
}

export interface NamingInferenceSignal {
  id: string
  sourceAssetId: string
  signalType: NamingSignalType
  matchedValue?: string
  proposedCanonicalName?: string
  proposedUnitCode?: string
  proposedUnitKind?: DataUnitKind
  proposedAssetRole?: DataUnitAssetRole
  confidence: number
  explanation?: string
  createdAt: string
}

export type SourceRenameSuggestionStatus =
  | "pending"
  | "applied_internal"
  | "applied_external"
  | "rejected"
  | "overridden"

export type SourceRenameSuggestionActor = "ai" | "system" | "user"

export interface SourceRenameSuggestion {
  id: string
  sourceAssetId: string
  originalName: string
  suggestedCanonicalName: string
  reason?: string
  confidence: number
  status: SourceRenameSuggestionStatus
  createdBy: SourceRenameSuggestionActor
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface DataUnit {
  id: string
  kind: DataUnitKind
  code: string
  title: string
  description?: string
  status: DataUnitStatus
  templateId?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  primaryModule?: string
  privacyLevel?: string
  riskLevel?: string
  provenanceNote?: string
}

export interface DataUnitTemplate {
  id: string
  kind: DataUnitKind
  name: string
  description?: string
  slots: DataUnitTemplateSlot[]
  createdAt: string
  updatedAt: string
}

export interface DataUnitTemplateSlot {
  id: string
  templateId: string
  role: DataUnitAssetRole
  label: string
  requirement: DataUnitSlotRequirement
  description?: string
  order?: number
  allowMultiple?: boolean
}

export interface DataUnitSlotState {
  id: string
  dataUnitId: string
  role: DataUnitAssetRole
  requirement: DataUnitSlotRequirement
  status: DataUnitSlotStatus
  note?: string
  updatedAt: string
  updatedBy?: string
}

export type DataUnitProposalStatus =
  | "draft"
  | "suggested"
  | "accepted"
  | "partially_accepted"
  | "rejected"

export type DataUnitProposalActor = "system" | "ai" | "user"

export interface DataUnitProposal {
  id: string
  proposedKind: DataUnitKind
  proposedTitle?: string
  proposedDataUnitCode?: string
  status: DataUnitProposalStatus
  createdBy: DataUnitProposalActor
  confidence?: number
  createdAt: string
  explanation?: string
}

export type DataUnitProposalAssetMembershipStatus = "suggested" | "candidate" | "excluded"

export interface DataUnitProposalAsset {
  id: string
  proposalId: string
  sourceAssetId: string
  proposedRole: DataUnitAssetRole
  confidence: number
  signalIds?: string[]
  membershipStatus: DataUnitProposalAssetMembershipStatus
  explanation?: string
}

export type DataUnitAssetLinkSuggestedBy = "user" | "ai" | "system"

export interface DataUnitAssetLink {
  id: string
  dataUnitId: string
  sourceAssetId: string
  role: DataUnitAssetRole
  membershipStatus: DataUnitAssetMembershipStatus
  titleOverride?: string
  order?: number
  isPrimary?: boolean
  includeInAIContext?: boolean
  includeInEmbedding?: boolean
  includeInExport?: boolean
  addedAt?: string
  addedBy?: string
  removedAt?: string
  removedBy?: string
  suggestedBy?: DataUnitAssetLinkSuggestedBy
  confidence?: number
  reason?: string
  note?: string
}

export type DataUnitModuleRelation =
  | "imported_to_module"
  | "used_as_evidence"
  | "created_from_module"
  | "annotated_in_module"

export interface DataUnitModuleLink {
  id: string
  dataUnitId: string
  moduleKey: string
  moduleRecordId?: string
  relation: DataUnitModuleRelation
  createdAt: string
}

export type DataUnitAnnotationKind =
  | "researcher_note"
  | "ai_summary"
  | "coding"
  | "interpretation"
  | "question"
  | "memo"
  | "decision"
  | "module_note"

export interface DataUnitAnnotation {
  id: string
  dataUnitId: string
  sourceAssetId?: string
  sourceAssetSnapshotId?: string
  kind: DataUnitAnnotationKind
  content: string
  createdAt: string
  createdBy?: string
  visibility?: string
  evidenceRefs?: string[]
}

// ─── AI Source Workflow Operating Layer Proposal ────────────────────────────

export type AIWorkflowType =
  | "source_environment_setup"
  | "source_intake"
  | "source_recognition"
  | "source_organization"
  | "source_correction"
  | "data_unit_proposal"
  | "module_write_proposal"
  | "morning_brief_generation"

export type AIWorkflowTriggerType =
  | "manual"
  | "scheduled"
  | "source_event"
  | "conversation_mention"
  | "morning_brief_followup"
  | "system_retry"

export type AIWorkflowRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_review_needed"
  | "failed"
  | "cancelled"

export type AIWorkflowActor = "user" | "ai" | "system"
export type SourceRiskLevel = "low" | "medium" | "high" | "critical"

export interface AIWorkflowRun {
  id: string
  workflowType: AIWorkflowType
  triggerType: AIWorkflowTriggerType
  status: AIWorkflowRunStatus
  title: string
  summary?: string
  sourceAssetIds?: string[]
  dataUnitIds?: string[]
  dataUnitProposalIds?: string[]
  moduleWriteIntentIds?: string[]
  morningBriefItemIds?: string[]
  startedAt?: string
  completedAt?: string
  createdBy: AIWorkflowActor
  riskLevel?: SourceRiskLevel
  requiresReview?: boolean
  reviewReason?: string
  parentRunId?: string
  correctionOfRunId?: string
  metadata?: Record<string, unknown>
}

export type AIWorkflowStepType =
  | "source_intake"
  | "format_detection"
  | "metadata_extraction"
  | "quality_risk_review"
  | "naming_inference"
  | "grouping_inference"
  | "data_unit_proposal"
  | "anomaly_detection"
  | "morning_brief_reporting"
  | "conversation_correction"
  | "module_write_intent_proposal"

export type AIWorkflowStepStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_with_review_needed"
  | "failed"
  | "skipped"

export interface AIWorkflowStep {
  id: string
  workflowRunId: string
  stepType: AIWorkflowStepType
  status: AIWorkflowStepStatus
  title: string
  summary?: string
  order?: number
  startedAt?: string
  completedAt?: string
  errorSummary?: string
  metadata?: Record<string, unknown>
}

export type AIWorkItemType =
  | "naming_suggestion"
  | "classification_suggestion"
  | "data_unit_proposal"
  | "risk_alert"
  | "missing_context"
  | "module_routing_question"
  | "source_quality_warning"
  | "correction_request"
  | "morning_brief_alert"

export type AIWorkItemStatus =
  | "open"
  | "accepted"
  | "edited"
  | "rejected"
  | "ignored"
  | "resolved"

export type AIWorkItemTargetType =
  | "source_asset"
  | "source_workflow_run"
  | "data_unit"
  | "data_unit_proposal"
  | "module_write_intent"
  | "morning_brief_item"

export interface AIWorkItem {
  id: string
  workflowRunId: string
  itemType: AIWorkItemType
  status: AIWorkItemStatus
  title: string
  description?: string
  aiExplanation?: string
  targetType: AIWorkItemTargetType
  targetId: string
  suggestedActions?: string[]
  createdAt: string
  resolvedAt?: string
}

export type AIMentionTargetType =
  | "source_asset"
  | "data_unit"
  | "data_unit_proposal"
  | "ai_workflow_run"
  | "ai_work_item"
  | "morning_brief_item"
  | "module_record"

export type AIMentionIntent =
  | "supplement_context"
  | "correct_classification"
  | "rerun_workflow"
  | "create_data_unit_proposal"
  | "update_data_unit_proposal"
  | "propose_module_write"
  | "resolve_work_item"
  | "ask_for_explanation"

export interface AIMentionTarget {
  id: string
  targetType: AIMentionTargetType
  targetId: string
  displayLabel: string
  moduleKey?: string
  sourceAssetId?: string
  workflowRunId?: string
  riskLevel?: SourceRiskLevel
  createdAt: string
}

export interface AIConversationCorrection {
  id: string
  sourceMentionTargetIds: string[]
  interpretedIntent: AIMentionIntent
  instruction: string
  createdBy: AIWorkflowActor
  createdAt: string
  correctionRunId?: string
  supersededWorkflowRunIds?: string[]
  metadata?: Record<string, unknown>
}

export type SourceWorkflowCadence =
  | "manual"
  | "hourly"
  | "daily"
  | "weekly"
  | "source_event"

export interface SourceWorkflowConfig {
  id: string
  sourceConnectionId: string
  displayName: string
  cadence: SourceWorkflowCadence
  defaultModuleKey?: string
  sourceScope?: string
  includeInMorningBrief?: boolean
  riskLevel: SourceRiskLevel
  anomalyConditions?: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface MorningBriefWorkflowLink {
  id: string
  morningBriefItemId: string
  workflowRunId: string
  workItemIds?: string[]
  relation:
    | "generated_from_run"
    | "reports_anomaly"
    | "requires_followup"
    | "correction_target"
  createdAt: string
}
