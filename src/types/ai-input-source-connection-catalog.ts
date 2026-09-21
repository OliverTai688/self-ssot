export type AIInputSourceConnectionProviderId =
  | "line"
  | "google_drive"
  | "rss"
  | "gmail"
  | "github"
  | "telegram"

export type AIInputSourceConnectionStepId =
  | "provider"
  | "account"
  | "scope"
  | "sync_analysis"
  | "governance"
  | "review"

export type AIInputSourceConnectionRiskLevel = "low" | "medium" | "high"

export type AIInputSourceConnectionProviderAccountManifestDTO = {
  mode: "provider_account" | "app_installation" | "bot_or_channel" | "credentialless"
  authPattern: "oauth_authorization_code" | "github_app_installation" | "bot_or_channel_secret" | "public_url"
  requiresProviderAccount: boolean
  supportsMultipleAccounts: boolean
  allowsAccountReuse: boolean
  identityLabel: string
  visibleFields: readonly ["display_label", "authorization_status", "dependent_connection_count"]
  secretFieldsExcluded: readonly string[]
}

export type AIInputSourceConnectionScopeKind =
  | "line_group"
  | "drive_folder"
  | "rss_feed"
  | "gmail_query"
  | "github_repository"
  | "telegram_chat"

export type AIInputSourceConnectionScopeManifestDTO = {
  kind: AIInputSourceConnectionScopeKind
  label: string
  selectionMode: "mock_picker" | "validated_url_input"
  supportsMultipleScopes: boolean
  allowsSeveralConnectionsPerAccount: boolean
  includeSubfoldersAvailable: boolean
  includeAttachmentsAvailable: boolean
  nativeIdentifierExposed: false
  fileSubtypeProvenance: readonly string[]
}

export type AIInputSourceConnectionStepManifestDTO = {
  id: AIInputSourceConnectionStepId
  ordinal: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  description: string
  inputKind:
    | "provider_choice"
    | "account_choice"
    | "scope_choice"
    | "sync_analysis_policy"
    | "governance_policy"
    | "review_summary"
  requiresProviderAccount: boolean
  runtimeActionAllowed: false
}

export type AIInputSourceConnectionRuntimeFlagsDTO = {
  oauthEnabled: false
  secretStorageEnabled: false
  callbackEnabled: false
  webhookEnabled: false
  pollingEnabled: false
  providerApiCallEnabled: false
  databaseReadEnabled: false
  databaseWriteEnabled: false
  routeHandlerEnabled: false
  serverActionEnabled: false
  moduleFinalWriteEnabled: false
  publicOutputEnabled: false
  externalAgentDatabaseAccessEnabled: false
  externalRegistrationEnabled: false
}

export type AIInputSourceConnectionProviderManifestDTO = {
  provider: AIInputSourceConnectionProviderId
  label: string
  category: "messaging" | "cloud_files" | "feed" | "email" | "repository"
  availability: "mock_setup_only"
  account: AIInputSourceConnectionProviderAccountManifestDTO
  scope: AIInputSourceConnectionScopeManifestDTO
  steps: readonly AIInputSourceConnectionStepManifestDTO[]
  defaultRiskLevel: AIInputSourceConnectionRiskLevel
  docsAsDriveFileSubtype: boolean
  runtime: AIInputSourceConnectionRuntimeFlagsDTO
}

export type AIInputSourceConnectionProviderAccountDTO = {
  id: string
  provider: AIInputSourceConnectionProviderId
  displayLabel: string
  authorizationStatus: "connected" | "reauthorization_required" | "revoked" | "unavailable"
  dependentConnectionCount: number
  uiSafeOpaqueId: true
}

export type AIInputSourceConnectionScopeDTO = {
  id: string
  provider: AIInputSourceConnectionProviderId
  providerAccountId: string | null
  displayLabel: string
  kind: AIInputSourceConnectionScopeKind
  lifecycleStatus: "draft" | "unavailable"
  uiSafeOpaqueId: true
}

export type AIInputSourceConnectionSummaryDTO = {
  id: string
  uiSafeOpaqueId: true
  nativeProviderIdExposed: false
  secretFieldsExposed: false
  provider: AIInputSourceConnectionProviderId
  displayName: string
  accountLabel: string
  scopeLabel: string
  lifecycleStatus: "draft" | "active" | "paused" | "unavailable"
  authorizationStatus: "connected" | "reauthorization_required" | "revoked" | "unavailable"
  syncHealth: "healthy" | "stale" | "failed" | "unknown"
}

export type AIInputSourceConnectionListDTO = {
  state: "unavailable_no_persistence"
  items: readonly AIInputSourceConnectionSummaryDTO[]
  uiSafeDtoOnly: true
  nativeProviderIdsExposed: false
  rawProviderPayloadExposed: false
  secretFieldsExposed: false
}

export type AIInputSourceConnectionDetailDTO = {
  uiSafeDtoOnly: true
  secretFieldsExposed: false
  summary: AIInputSourceConnectionSummaryDTO
  policy: {
    syncMode: "manual" | "scheduled" | "provider_event"
    targetModule: "work" | "research" | "chamber" | "inbox"
    riskLevel: AIInputSourceConnectionRiskLevel
    approvalRule: "always_review" | "risk_based"
    retentionDays: number
  }
  provenance: {
    nativeProviderIdsExposed: false
    rawProviderPayloadExposed: false
    fileSubtypeLabels: readonly string[]
  }
}

export type AIInputSourceConnectionSetupSessionDTO = {
  status: "unavailable_no_server_action"
  sessionOpaqueId: null
  provider: null
  currentStep: null
  expiresAt: null
  createAllowedNow: false
  uiSafeDtoOnly: true
  nativeProviderIdsExposed: false
  secretFieldsExposed: false
}

export type AIInputSourceConnectionScopePreviewDTO = {
  status: "unavailable_no_provider_runtime"
  provider: null
  scopeKind: null
  eligibleItemCount: null
  redactedItems: readonly []
  warnings: readonly string[]
  nativeProviderIdsExposed: false
  rawProviderPayloadExposed: false
  secretFieldsExposed: false
  uiSafeDtoOnly: true
  previewAllowedNow: false
}

export type AIInputSourceConnectionTestResultDTO = {
  status: "unavailable_no_provider_runtime"
  connectionOpaqueId: null
  passed: null
  checks: readonly []
  providerCallExecuted: false
  databaseWriteExecuted: false
  moduleWriteExecuted: false
  nativeProviderIdsExposed: false
  rawProviderPayloadExposed: false
  secretFieldsExposed: false
  uiSafeDtoOnly: true
  testAllowedNow: false
}

export type AIInputSourceConnectionDependentSummaryDTO = {
  connectionOpaqueId: string
  displayName: string
  lifecycleStatus: "draft" | "active" | "paused" | "unavailable"
  nativeProviderIdExposed: false
}

export type AIInputSourceConnectionCatalogValidationDTO = {
  status: "valid" | "invalid"
  errorCodes: readonly string[]
}

export type AIInputSourceConnectionOperationId =
  | "list_provider_manifests"
  | "list_provider_accounts"
  | "create_setup_draft"
  | "preview_source_scope"
  | "test_source_connection_draft"
  | "preview_account_revoke_impact"
  | "activate_source_connection"

export type AIInputSourceConnectionOperationDTO = {
  id: AIInputSourceConnectionOperationId
  state: "allowed_static_read" | "blocked_no_runtime"
  allowedNow: boolean
  transport: "server_component_loader" | "not_implemented"
  authBoundary: "requireUser()"
  serviceAuthorizationRequired: true
  ownerScopeRequired: true
  uiSafeDtoOnly: true
  auditRefs: readonly string[]
  blockedReason: string | null
}

export type AIInputSourceConnectionDuplicateFingerprintContractDTO = {
  status: "contract_only"
  strategy: "server_generated_hash_only"
  inputBoundary: readonly ["provider", "provider_account_opaque_id", "normalized_scope_server_side"]
  nativeProviderIdAcceptedFromClient: false
  nativeProviderIdExposed: false
  fingerprintExposed: false
  outputBoundary: "duplicate_match_boolean_and_redacted_connection_summary_only"
  availableNow: false
}

export type AIInputSourceConnectionImpactPreviewDTO = {
  status: "unavailable_no_persistence"
  providerAccountOpaqueId: null
  dependentConnections: readonly AIInputSourceConnectionDependentSummaryDTO[]
  affectedConnectionCount: 0
  revokeAllowedNow: false
  ownerConfirmationRequired: true
  nativeProviderIdsExposed: false
}

export type AIInputSourceConnectionCatalogDTO = {
  id: "AIINPUT-CONN-004"
  status: "provider_manifest_catalog_ready" | "provider_manifest_catalog_unavailable"
  mode: "protected_static_no_secret_no_connector_runtime"
  generatedAt: string
  ownerScope: {
    authenticated: true
    source: "requireUser()"
    identityRedacted: true
    visibility: "protected_owner_only"
  }
  providers: readonly AIInputSourceConnectionProviderManifestDTO[]
  accountInstances: {
    state: "unavailable_no_persistence"
    items: readonly AIInputSourceConnectionProviderAccountDTO[]
  }
  scopeInstances: {
    state: "unavailable_no_provider_discovery"
    items: readonly AIInputSourceConnectionScopeDTO[]
  }
  connectionList: AIInputSourceConnectionListDTO
  connectionDetail: {
    state: "unavailable_no_persistence"
    item: AIInputSourceConnectionDetailDTO | null
    uiSafeDtoOnly: true
    nativeProviderIdsExposed: false
    rawProviderPayloadExposed: false
    secretFieldsExposed: false
  }
  setupSession: AIInputSourceConnectionSetupSessionDTO
  scopePreview: AIInputSourceConnectionScopePreviewDTO
  connectionTest: AIInputSourceConnectionTestResultDTO
  operations: readonly AIInputSourceConnectionOperationDTO[]
  duplicateFingerprint: AIInputSourceConnectionDuplicateFingerprintContractDTO
  impactPreview: AIInputSourceConnectionImpactPreviewDTO
  authorizationAudit: {
    authBoundary: "requireUser()"
    serviceAuthorizationRequired: true
    ownerScopeSource: "authenticated_profile"
    clientSuppliedOwnerIdAllowed: false
    auditFamily: "ai-input.source-connection"
    auditRefs: readonly string[]
  }
  runtime: AIInputSourceConnectionRuntimeFlagsDTO
  nanda: {
    capabilityId: "source-connection-draft-management"
    lifecycle: "protected_owner_visible_contract_only"
    protocols: readonly ["internal"]
    internalRuntimeEnabled: false
    externalRegisterable: false
    registrationStatus: "not_registered"
  }
  validation: AIInputSourceConnectionCatalogValidationDTO
  unavailableReason: "provider_manifest_validation_failed" | null
  summary: {
    providerCount: number
    stepCount: number
    accountInstanceCount: number
    scopeInstanceCount: number
    protectedByRequireUser: true
    uiSafeDtoOnly: true
    noSecretFields: true
    noConnectorRuntime: true
    nextTask: "AIINPUT-CONN-005"
  }
  sourceRefs: readonly string[]
  stopConditions: readonly string[]
}
