import type {
  AIInputSourceConnectionCatalogValidationDTO,
  AIInputSourceConnectionProviderId,
  AIInputSourceConnectionProviderManifestDTO,
  AIInputSourceConnectionRuntimeFlagsDTO,
  AIInputSourceConnectionStepId,
  AIInputSourceConnectionStepManifestDTO,
} from "@/types/ai-input-source-connection-catalog"

export const AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED = {
  oauthEnabled: false,
  secretStorageEnabled: false,
  callbackEnabled: false,
  webhookEnabled: false,
  pollingEnabled: false,
  providerApiCallEnabled: false,
  databaseReadEnabled: false,
  databaseWriteEnabled: false,
  routeHandlerEnabled: false,
  serverActionEnabled: false,
  moduleFinalWriteEnabled: false,
  publicOutputEnabled: false,
  externalAgentDatabaseAccessEnabled: false,
  externalRegistrationEnabled: false,
} as const satisfies AIInputSourceConnectionRuntimeFlagsDTO

const PROVIDER_IDS = [
  "line",
  "google_drive",
  "rss",
  "gmail",
  "github",
  "telegram",
] as const satisfies readonly AIInputSourceConnectionProviderId[]

const STEP_IDS = [
  "provider",
  "account",
  "scope",
  "sync_analysis",
  "governance",
  "review",
] as const satisfies readonly AIInputSourceConnectionStepId[]

const EXPECTED_PROVIDER_SHAPES: Record<
  AIInputSourceConnectionProviderId,
  { category: AIInputSourceConnectionProviderManifestDTO["category"]; scopeKind: AIInputSourceConnectionProviderManifestDTO["scope"]["kind"] }
> = {
  line: { category: "messaging", scopeKind: "line_group" },
  google_drive: { category: "cloud_files", scopeKind: "drive_folder" },
  rss: { category: "feed", scopeKind: "rss_feed" },
  gmail: { category: "email", scopeKind: "gmail_query" },
  github: { category: "repository", scopeKind: "github_repository" },
  telegram: { category: "messaging", scopeKind: "telegram_chat" },
}

const EXPECTED_STEP_INPUTS: Record<
  AIInputSourceConnectionStepId,
  AIInputSourceConnectionStepManifestDTO["inputKind"]
> = {
  provider: "provider_choice",
  account: "account_choice",
  scope: "scope_choice",
  sync_analysis: "sync_analysis_policy",
  governance: "governance_policy",
  review: "review_summary",
}

function buildSteps(requiresProviderAccount: boolean): readonly AIInputSourceConnectionStepManifestDTO[] {
  return [
    {
      id: "provider",
      ordinal: 1,
      label: "選擇來源",
      description: "選擇 provider 類型，不執行外部連線。",
      inputKind: "provider_choice",
      requiresProviderAccount: false,
      runtimeActionAllowed: false,
    },
    {
      id: "account",
      ordinal: 2,
      label: requiresProviderAccount ? "選擇帳號" : "確認無帳號來源",
      description: requiresProviderAccount
        ? "只顯示無 secret 的帳號模型；授權與重新授權仍未開放。"
        : "這個 provider 不需外部帳號，仍需後端 URL 驗證。",
      inputKind: "account_choice",
      requiresProviderAccount,
      runtimeActionAllowed: false,
    },
    {
      id: "scope",
      ordinal: 3,
      label: "選擇來源範圍",
      description: "定義資料夾、feed、query、repository 或 chat 草稿，不進行 provider discovery。",
      inputKind: "scope_choice",
      requiresProviderAccount,
      runtimeActionAllowed: false,
    },
    {
      id: "sync_analysis",
      ordinal: 4,
      label: "同步與分析",
      description: "僅設定草稿政策，不啟用 polling、webhook 或 provider event。",
      inputKind: "sync_analysis_policy",
      requiresProviderAccount,
      runtimeActionAllowed: false,
    },
    {
      id: "governance",
      ordinal: 5,
      label: "路由與治理",
      description: "設定模組、風險、審核、保留與去識別化草稿。",
      inputKind: "governance_policy",
      requiresProviderAccount,
      runtimeActionAllowed: false,
    },
    {
      id: "review",
      ordinal: 6,
      label: "檢查並建立草稿",
      description: "只建立記憶體 mock draft，正式建立、測試與啟用全數禁止。",
      inputKind: "review_summary",
      requiresProviderAccount,
      runtimeActionAllowed: false,
    },
  ]
}

const EXCLUDED_SECRET_FIELDS = [
  "access token",
  "refresh token",
  "authorization code",
  "bot token",
  "channel secret",
  "webhook secret",
  "credential reference",
  "raw provider subject",
] as const

export const AI_INPUT_SOURCE_CONNECTION_PROVIDER_MANIFESTS = [
  {
    provider: "line",
    label: "LINE",
    category: "messaging",
    availability: "mock_setup_only",
    account: {
      mode: "bot_or_channel",
      authPattern: "bot_or_channel_secret",
      requiresProviderAccount: true,
      supportsMultipleAccounts: true,
      allowsAccountReuse: true,
      identityLabel: "LINE Official Account channel",
      visibleFields: ["display_label", "authorization_status", "dependent_connection_count"],
      secretFieldsExcluded: EXCLUDED_SECRET_FIELDS,
    },
    scope: {
      kind: "line_group",
      label: "LINE group or room",
      selectionMode: "mock_picker",
      supportsMultipleScopes: true,
      allowsSeveralConnectionsPerAccount: true,
      includeSubfoldersAvailable: false,
      includeAttachmentsAvailable: true,
      nativeIdentifierExposed: false,
      fileSubtypeProvenance: [],
    },
    steps: buildSteps(true),
    defaultRiskLevel: "medium",
    docsAsDriveFileSubtype: false,
    runtime: AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
  },
  {
    provider: "google_drive",
    label: "Google Drive",
    category: "cloud_files",
    availability: "mock_setup_only",
    account: {
      mode: "provider_account",
      authPattern: "oauth_authorization_code",
      requiresProviderAccount: true,
      supportsMultipleAccounts: true,
      allowsAccountReuse: true,
      identityLabel: "Google account",
      visibleFields: ["display_label", "authorization_status", "dependent_connection_count"],
      secretFieldsExcluded: EXCLUDED_SECRET_FIELDS,
    },
    scope: {
      kind: "drive_folder",
      label: "Google Drive folder",
      selectionMode: "mock_picker",
      supportsMultipleScopes: true,
      allowsSeveralConnectionsPerAccount: true,
      includeSubfoldersAvailable: true,
      includeAttachmentsAvailable: false,
      nativeIdentifierExposed: false,
      fileSubtypeProvenance: ["Google Docs", "Google Sheets", "Google Slides", "PDF", "Office files"],
    },
    steps: buildSteps(true),
    defaultRiskLevel: "medium",
    docsAsDriveFileSubtype: true,
    runtime: AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
  },
  {
    provider: "rss",
    label: "RSS / Atom",
    category: "feed",
    availability: "mock_setup_only",
    account: {
      mode: "credentialless",
      authPattern: "public_url",
      requiresProviderAccount: false,
      supportsMultipleAccounts: false,
      allowsAccountReuse: false,
      identityLabel: "No account required",
      visibleFields: ["display_label", "authorization_status", "dependent_connection_count"],
      secretFieldsExcluded: EXCLUDED_SECRET_FIELDS,
    },
    scope: {
      kind: "rss_feed",
      label: "Validated feed URL",
      selectionMode: "validated_url_input",
      supportsMultipleScopes: true,
      allowsSeveralConnectionsPerAccount: true,
      includeSubfoldersAvailable: false,
      includeAttachmentsAvailable: false,
      nativeIdentifierExposed: false,
      fileSubtypeProvenance: ["RSS", "Atom"],
    },
    steps: buildSteps(false),
    defaultRiskLevel: "low",
    docsAsDriveFileSubtype: false,
    runtime: AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
  },
  {
    provider: "gmail",
    label: "Gmail",
    category: "email",
    availability: "mock_setup_only",
    account: {
      mode: "provider_account",
      authPattern: "oauth_authorization_code",
      requiresProviderAccount: true,
      supportsMultipleAccounts: true,
      allowsAccountReuse: true,
      identityLabel: "Google account",
      visibleFields: ["display_label", "authorization_status", "dependent_connection_count"],
      secretFieldsExcluded: EXCLUDED_SECRET_FIELDS,
    },
    scope: {
      kind: "gmail_query",
      label: "Gmail label and query",
      selectionMode: "mock_picker",
      supportsMultipleScopes: true,
      allowsSeveralConnectionsPerAccount: true,
      includeSubfoldersAvailable: false,
      includeAttachmentsAvailable: true,
      nativeIdentifierExposed: false,
      fileSubtypeProvenance: ["message", "thread", "attachment"],
    },
    steps: buildSteps(true),
    defaultRiskLevel: "high",
    docsAsDriveFileSubtype: false,
    runtime: AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
  },
  {
    provider: "github",
    label: "GitHub",
    category: "repository",
    availability: "mock_setup_only",
    account: {
      mode: "app_installation",
      authPattern: "github_app_installation",
      requiresProviderAccount: true,
      supportsMultipleAccounts: true,
      allowsAccountReuse: true,
      identityLabel: "GitHub App installation",
      visibleFields: ["display_label", "authorization_status", "dependent_connection_count"],
      secretFieldsExcluded: EXCLUDED_SECRET_FIELDS,
    },
    scope: {
      kind: "github_repository",
      label: "Repository, branch, and path glob",
      selectionMode: "mock_picker",
      supportsMultipleScopes: true,
      allowsSeveralConnectionsPerAccount: true,
      includeSubfoldersAvailable: true,
      includeAttachmentsAvailable: false,
      nativeIdentifierExposed: false,
      fileSubtypeProvenance: ["Markdown", "text", "configuration"],
    },
    steps: buildSteps(true),
    defaultRiskLevel: "medium",
    docsAsDriveFileSubtype: false,
    runtime: AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
  },
  {
    provider: "telegram",
    label: "Telegram",
    category: "messaging",
    availability: "mock_setup_only",
    account: {
      mode: "bot_or_channel",
      authPattern: "bot_or_channel_secret",
      requiresProviderAccount: true,
      supportsMultipleAccounts: true,
      allowsAccountReuse: true,
      identityLabel: "Telegram bot",
      visibleFields: ["display_label", "authorization_status", "dependent_connection_count"],
      secretFieldsExcluded: EXCLUDED_SECRET_FIELDS,
    },
    scope: {
      kind: "telegram_chat",
      label: "Telegram group or chat",
      selectionMode: "mock_picker",
      supportsMultipleScopes: true,
      allowsSeveralConnectionsPerAccount: true,
      includeSubfoldersAvailable: false,
      includeAttachmentsAvailable: true,
      nativeIdentifierExposed: false,
      fileSubtypeProvenance: [],
    },
    steps: buildSteps(true),
    defaultRiskLevel: "high",
    docsAsDriveFileSubtype: false,
    runtime: AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
  },
] as const satisfies readonly AIInputSourceConnectionProviderManifestDTO[]

export function validateAIInputSourceConnectionProviderManifests(
  manifests: unknown,
): AIInputSourceConnectionCatalogValidationDTO {
  const errors = new Set<string>()

  if (!Array.isArray(manifests)) {
    return { status: "invalid", errorCodes: ["manifest_catalog_missing"] }
  }

  if (manifests.length !== PROVIDER_IDS.length) errors.add("manifest_provider_count_invalid")

  const seenProviders = new Set<string>()
  for (const manifest of manifests) {
    if (!isRecord(manifest) || typeof manifest.provider !== "string") {
      errors.add("manifest_provider_shape_invalid")
      continue
    }

    if (manifest.provider === "google_docs") errors.add("standalone_google_docs_forbidden")
    if (!PROVIDER_IDS.includes(manifest.provider as AIInputSourceConnectionProviderId)) {
      errors.add("manifest_provider_id_invalid")
      continue
    }
    const providerId = manifest.provider as AIInputSourceConnectionProviderId
    const expectedProvider = EXPECTED_PROVIDER_SHAPES[providerId]
    if (seenProviders.has(manifest.provider)) errors.add("manifest_provider_duplicate")
    seenProviders.add(manifest.provider)

    if (typeof manifest.label !== "string" || manifest.label.length === 0) errors.add("manifest_provider_label_invalid")
    if (manifest.category !== expectedProvider.category) errors.add("manifest_provider_category_invalid")
    if (manifest.availability !== "mock_setup_only") errors.add("manifest_provider_availability_invalid")
    if (!isRiskLevel(manifest.defaultRiskLevel)) errors.add("manifest_provider_risk_invalid")
    if (typeof manifest.docsAsDriveFileSubtype !== "boolean") errors.add("manifest_docs_subtype_flag_invalid")
    if (!isRuntimeDisabled(manifest.runtime)) errors.add("manifest_runtime_must_fail_closed")
    if (!isAccountManifest(manifest.account)) {
      errors.add("manifest_account_boundary_invalid")
    }
    if (!isScopeManifest(manifest.scope) || manifest.scope.kind !== expectedProvider.scopeKind) {
      errors.add("manifest_scope_boundary_invalid")
    }

    const steps = manifest.steps
    if (!Array.isArray(steps) || steps.length !== STEP_IDS.length) {
      errors.add("manifest_step_count_invalid")
    } else {
      const seenSteps = new Set<string>()
      for (const [index, step] of steps.entries()) {
        if (!isRecord(step) || typeof step.id !== "string" || !STEP_IDS.includes(step.id as AIInputSourceConnectionStepId)) {
          errors.add("manifest_step_shape_invalid")
          continue
        }
        if (seenSteps.has(step.id)) errors.add("manifest_step_duplicate")
        seenSteps.add(step.id)
        if (
          step.ordinal !== index + 1 ||
          step.runtimeActionAllowed !== false ||
          step.inputKind !== EXPECTED_STEP_INPUTS[step.id as AIInputSourceConnectionStepId] ||
          typeof step.label !== "string" ||
          typeof step.description !== "string" ||
          typeof step.requiresProviderAccount !== "boolean"
        ) {
          errors.add("manifest_step_boundary_invalid")
        }
      }
      for (const stepId of STEP_IDS) {
        if (!seenSteps.has(stepId)) errors.add(`manifest_step_missing_${stepId}`)
      }
    }

    if (providerId === "google_drive") {
      if (manifest.docsAsDriveFileSubtype !== true) errors.add("drive_file_subtype_provenance_missing")
      if (
        !isRecord(manifest.scope) ||
        !Array.isArray(manifest.scope.fileSubtypeProvenance) ||
        !manifest.scope.fileSubtypeProvenance.includes("Google Docs")
      ) {
        errors.add("drive_docs_provenance_missing")
      }
    } else if (manifest.docsAsDriveFileSubtype !== false) {
      errors.add("non_drive_docs_subtype_flag_invalid")
    }

    if (providerId === "rss" && (!isRecord(manifest.account) || manifest.account.mode !== "credentialless")) {
      errors.add("rss_account_mode_invalid")
    }
  }

  for (const provider of PROVIDER_IDS) {
    if (!seenProviders.has(provider)) errors.add(`manifest_provider_missing_${provider}`)
  }

  return {
    status: errors.size === 0 ? "valid" : "invalid",
    errorCodes: [...errors].sort(),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isRiskLevel(value: unknown): boolean {
  return value === "low" || value === "medium" || value === "high"
}

function isAccountManifest(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const visibleFields = value.visibleFields
  const excluded = value.secretFieldsExcluded
  return (
    ["provider_account", "app_installation", "bot_or_channel", "credentialless"].includes(String(value.mode)) &&
    ["oauth_authorization_code", "github_app_installation", "bot_or_channel_secret", "public_url"].includes(String(value.authPattern)) &&
    typeof value.requiresProviderAccount === "boolean" &&
    typeof value.supportsMultipleAccounts === "boolean" &&
    typeof value.allowsAccountReuse === "boolean" &&
    typeof value.identityLabel === "string" &&
    Array.isArray(visibleFields) &&
    visibleFields.join("|") === "display_label|authorization_status|dependent_connection_count" &&
    Array.isArray(excluded) &&
    excluded.length > 0 &&
    excluded.every((field) => typeof field === "string")
  )
}

function isScopeManifest(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  return (
    typeof value.kind === "string" &&
    typeof value.label === "string" &&
    (value.selectionMode === "mock_picker" || value.selectionMode === "validated_url_input") &&
    typeof value.supportsMultipleScopes === "boolean" &&
    typeof value.allowsSeveralConnectionsPerAccount === "boolean" &&
    typeof value.includeSubfoldersAvailable === "boolean" &&
    typeof value.includeAttachmentsAvailable === "boolean" &&
    value.nativeIdentifierExposed === false &&
    Array.isArray(value.fileSubtypeProvenance) &&
    value.fileSubtypeProvenance.every((label) => typeof label === "string")
  )
}

function isRuntimeDisabled(value: unknown): boolean {
  if (!isRecord(value)) return false
  const expectedKeys = Object.keys(AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED)
  const actualKeys = Object.keys(value)
  return actualKeys.length === expectedKeys.length && expectedKeys.every((key) => value[key] === false)
}
