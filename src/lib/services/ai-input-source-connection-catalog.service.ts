import "server-only"

import {
  AI_INPUT_SOURCE_CONNECTION_PROVIDER_MANIFESTS,
  AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
  validateAIInputSourceConnectionProviderManifests,
} from "@/lib/contracts/ai-input-source-connection-catalog.contract"
import { requireUser } from "@/lib/services/auth.service"
import type {
  AIInputSourceConnectionCatalogDTO,
  AIInputSourceConnectionCatalogValidationDTO,
  AIInputSourceConnectionOperationDTO,
  AIInputSourceConnectionProviderManifestDTO,
} from "@/types/ai-input-source-connection-catalog"

const SOURCE_REFS = [
  "docs/07_research-and-design/RES-027_external-source-connection-multistep-and-multi-account-management-research.md",
  "docs/02_architecture-and-rules/ARC-015_source-connection-adapter-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  "docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md",
  "docs/02_architecture-and-rules/AUT-001_source-intake-security-privacy.md",
  "docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md",
] as const

const STOP_CONDITIONS = [
  "Stop before OAuth, authorization callback, PKCE/state handling, token exchange, or secret storage.",
  "Stop before webhook routes, polling jobs, provider API calls, folder/repository/chat discovery, or provider payload reads.",
  "Stop before SourceConnection or ProviderAccount database reads/writes, schema changes, migration apply, or hidden persistence.",
  "Stop before module final writes, public output, external agent database access, or external registration.",
  "Return an unavailable catalog with zero providers when manifest validation fails; never fall back to client mock manifests in formal mode.",
] as const

export async function loadAIInputSourceConnectionCatalog(): Promise<AIInputSourceConnectionCatalogDTO> {
  await requireUser()
  const generatedAt = new Date().toISOString()

  try {
    return buildProtectedCatalog(AI_INPUT_SOURCE_CONNECTION_PROVIDER_MANIFESTS, generatedAt)
  } catch {
    return buildUnavailableCatalog(generatedAt, {
      status: "invalid",
      errorCodes: ["manifest_catalog_build_failed"],
    })
  }
}

function buildProtectedCatalog(
  manifests: unknown,
  generatedAt: string,
): AIInputSourceConnectionCatalogDTO {
  const validation = validateAIInputSourceConnectionProviderManifests(manifests)
  if (validation.status === "invalid") return buildUnavailableCatalog(generatedAt, validation)

  const providers = manifests as readonly AIInputSourceConnectionProviderManifestDTO[]
  return {
    ...buildBaseCatalog(generatedAt, validation, true),
    status: "provider_manifest_catalog_ready",
    providers,
    unavailableReason: null,
    summary: buildSummary(providers),
  }
}

function buildUnavailableCatalog(
  generatedAt: string,
  validation: AIInputSourceConnectionCatalogValidationDTO,
): AIInputSourceConnectionCatalogDTO {
  return {
    ...buildBaseCatalog(generatedAt, validation, false),
    status: "provider_manifest_catalog_unavailable",
    providers: [],
    unavailableReason: "provider_manifest_validation_failed",
    summary: buildSummary([]),
  }
}

function buildBaseCatalog(
  generatedAt: string,
  validation: AIInputSourceConnectionCatalogValidationDTO,
  manifestReadAllowed: boolean,
): Omit<
  AIInputSourceConnectionCatalogDTO,
  "status" | "providers" | "unavailableReason" | "summary"
> {
  return {
    id: "AIINPUT-CONN-004",
    mode: "protected_static_no_secret_no_connector_runtime",
    generatedAt,
    ownerScope: {
      authenticated: true,
      source: "requireUser()",
      identityRedacted: true,
      visibility: "protected_owner_only",
    },
    accountInstances: {
      state: "unavailable_no_persistence",
      items: [],
    },
    scopeInstances: {
      state: "unavailable_no_provider_discovery",
      items: [],
    },
    connectionList: {
      state: "unavailable_no_persistence",
      items: [],
      uiSafeDtoOnly: true,
      nativeProviderIdsExposed: false,
      rawProviderPayloadExposed: false,
      secretFieldsExposed: false,
    },
    connectionDetail: {
      state: "unavailable_no_persistence",
      item: null,
      uiSafeDtoOnly: true,
      nativeProviderIdsExposed: false,
      rawProviderPayloadExposed: false,
      secretFieldsExposed: false,
    },
    setupSession: {
      status: "unavailable_no_server_action",
      sessionOpaqueId: null,
      provider: null,
      currentStep: null,
      expiresAt: null,
      createAllowedNow: false,
      uiSafeDtoOnly: true,
      nativeProviderIdsExposed: false,
      secretFieldsExposed: false,
    },
    scopePreview: {
      status: "unavailable_no_provider_runtime",
      provider: null,
      scopeKind: null,
      eligibleItemCount: null,
      redactedItems: [],
      warnings: ["Provider discovery and preview are disabled in AIINPUT-CONN-004."],
      nativeProviderIdsExposed: false,
      rawProviderPayloadExposed: false,
      secretFieldsExposed: false,
      uiSafeDtoOnly: true,
      previewAllowedNow: false,
    },
    connectionTest: {
      status: "unavailable_no_provider_runtime",
      connectionOpaqueId: null,
      passed: null,
      checks: [],
      providerCallExecuted: false,
      databaseWriteExecuted: false,
      moduleWriteExecuted: false,
      nativeProviderIdsExposed: false,
      rawProviderPayloadExposed: false,
      secretFieldsExposed: false,
      uiSafeDtoOnly: true,
      testAllowedNow: false,
    },
    operations: buildOperationCatalog(manifestReadAllowed),
    duplicateFingerprint: {
      status: "contract_only",
      strategy: "server_generated_hash_only",
      inputBoundary: ["provider", "provider_account_opaque_id", "normalized_scope_server_side"],
      nativeProviderIdAcceptedFromClient: false,
      nativeProviderIdExposed: false,
      fingerprintExposed: false,
      outputBoundary: "duplicate_match_boolean_and_redacted_connection_summary_only",
      availableNow: false,
    },
    impactPreview: {
      status: "unavailable_no_persistence",
      providerAccountOpaqueId: null,
      dependentConnections: [],
      affectedConnectionCount: 0,
      revokeAllowedNow: false,
      ownerConfirmationRequired: true,
      nativeProviderIdsExposed: false,
    },
    authorizationAudit: {
      authBoundary: "requireUser()",
      serviceAuthorizationRequired: true,
      ownerScopeSource: "authenticated_profile",
      clientSuppliedOwnerIdAllowed: false,
      auditFamily: "ai-input.source-connection",
      auditRefs: [
        "ai-input.source-connection.catalog.read",
        "ai-input.source-connection.account.list.blocked",
        "ai-input.source-connection.scope.preview.blocked",
        "ai-input.source-connection.test.blocked",
        "ai-input.source-connection.impact-preview.blocked",
        "ai-input.source-connection.activation.blocked",
      ],
    },
    runtime: AI_INPUT_SOURCE_CONNECTION_RUNTIME_DISABLED,
    nanda: {
      capabilityId: "source-connection-draft-management",
      lifecycle: "protected_owner_visible_contract_only",
      protocols: ["internal"],
      internalRuntimeEnabled: false,
      externalRegisterable: false,
      registrationStatus: "not_registered",
    },
    validation,
    sourceRefs: SOURCE_REFS,
    stopConditions: STOP_CONDITIONS,
  }
}

function buildOperationCatalog(manifestReadAllowed: boolean): readonly AIInputSourceConnectionOperationDTO[] {
  const staticManifestRead: AIInputSourceConnectionOperationDTO = {
    id: "list_provider_manifests",
    state: manifestReadAllowed ? "allowed_static_read" : "blocked_no_runtime",
    allowedNow: manifestReadAllowed,
    transport: manifestReadAllowed ? "server_component_loader" : "not_implemented",
    authBoundary: "requireUser()",
    serviceAuthorizationRequired: true,
    ownerScopeRequired: true,
    uiSafeDtoOnly: true,
    auditRefs: ["ai-input.source-connection.catalog.read"],
    blockedReason: manifestReadAllowed ? null : "Provider manifest validation failed.",
  }

  const blocked = (
    id: Exclude<AIInputSourceConnectionOperationDTO["id"], "list_provider_manifests">,
    blockedReason: string,
    auditRef: string,
  ): AIInputSourceConnectionOperationDTO => ({
    id,
    state: "blocked_no_runtime",
    allowedNow: false,
    transport: "not_implemented",
    authBoundary: "requireUser()",
    serviceAuthorizationRequired: true,
    ownerScopeRequired: true,
    uiSafeDtoOnly: true,
    auditRefs: [auditRef],
    blockedReason,
  })

  return [
    staticManifestRead,
    blocked("list_provider_accounts", "ProviderAccount persistence and owner-scoped mapper are not approved.", "ai-input.source-connection.account.list.blocked"),
    blocked("create_setup_draft", "No Server Action or persistence is enabled; the current wizard is memory-only mock UI.", "ai-input.source-connection.draft.create.blocked"),
    blocked("preview_source_scope", "Provider discovery and native identifiers remain server-runtime blocked.", "ai-input.source-connection.scope.preview.blocked"),
    blocked("test_source_connection_draft", "Provider API calls, credentials, and audit storage are unavailable.", "ai-input.source-connection.test.blocked"),
    blocked("preview_account_revoke_impact", "Dependent connection reads are unavailable until reviewed persistence and authorization exist.", "ai-input.source-connection.impact-preview.blocked"),
    blocked("activate_source_connection", "Connector runtime, audit storage, and human approval gates are incomplete.", "ai-input.source-connection.activation.blocked"),
  ]
}

function buildSummary(
  providers: readonly AIInputSourceConnectionProviderManifestDTO[],
): AIInputSourceConnectionCatalogDTO["summary"] {
  return {
    providerCount: providers.length,
    stepCount: providers.reduce((count, provider) => count + provider.steps.length, 0),
    accountInstanceCount: 0,
    scopeInstanceCount: 0,
    protectedByRequireUser: true,
    uiSafeDtoOnly: true,
    noSecretFields: true,
    noConnectorRuntime: true,
    nextTask: "AIINPUT-CONN-005",
  }
}
