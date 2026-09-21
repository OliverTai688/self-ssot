#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  types: "src/types/ai-input-source-connection-catalog.ts",
  contract: "src/lib/contracts/ai-input-source-connection-catalog.contract.ts",
  service: "src/lib/services/ai-input-source-connection-catalog.service.ts",
  page: "src/app/(dashboard)/ai-input/page.tsx",
  client: "src/app/(dashboard)/ai-input/ai-input-client.tsx",
  wizard: "src/components/ai/source-connections/source-connection-wizard.tsx",
  packageJson: "package.json",
}

const REQUIRED_PROVIDERS = [
  "line",
  "google_drive",
  "rss",
  "gmail",
  "github",
  "telegram",
]

const REQUIRED_STEPS = [
  "provider",
  "account",
  "scope",
  "sync_analysis",
  "governance",
  "review",
]

const FORBIDDEN_RUNTIME_PATTERNS = [
  { label: "server action directive", pattern: /["']use server["']/ },
  { label: "route handler export", pattern: /\bexport\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/ },
  { label: "network fetch", pattern: /\bfetch\s*\(/ },
  { label: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { label: "WebSocket", pattern: /\bWebSocket\b/ },
  { label: "EventSource", pattern: /\bEventSource\b/ },
  { label: "sendBeacon", pattern: /\bnavigator\.sendBeacon\b/ },
  { label: "localStorage", pattern: /\blocalStorage\b/ },
  { label: "sessionStorage", pattern: /\bsessionStorage\b/ },
  { label: "indexedDB", pattern: /\bindexedDB\b/ },
  { label: "cookie access", pattern: /\bdocument\.cookie\b|\bcookies\s*\(/ },
  { label: "request header access", pattern: /\bheaders\s*\(/ },
  { label: "environment access", pattern: /\bprocess\.env\b/ },
  { label: "Prisma client", pattern: /\bPrismaClient\b|@prisma\/client/ },
  { label: "Prisma or DB import", pattern: /@\/lib\/(?:db|prisma)(?:[/'"]|$)/ },
  { label: "database call", pattern: /\b(?:prisma|db)\.[A-Za-z_$][\w$]*\s*\(/ },
  { label: "Supabase client", pattern: /@supabase\/|\bcreateBrowserClient\b|\bcreateServerClient\b/ },
  { label: "provider SDK", pattern: /\bgoogleapis\b|@octokit\/|@line\/|node-telegram-bot-api/ },
  {
    label: "raw secret/token field",
    pattern:
      /\b(?:accessToken|refreshToken|clientSecret|botToken|webhookSecret|credentialRef|secretRef|oauthCode)\b/,
  },
  { label: "public output enabled", pattern: /\bpublicOutput(?:Allowed|Enabled)\s*:\s*true\b/ },
  { label: "external registration enabled", pattern: /\bexternalRegisterable\s*:\s*true\b/ },
]

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function quotedToken(token) {
  return new RegExp(`["']${token}["']`)
}

const contents = Object.fromEntries(
  Object.entries(FILES).map(([key, relativePath]) => [key, read(relativePath)])
)
const errors = []

function addError(fileKey, message) {
  errors.push(`${FILES[fileKey]}: ${message}`)
}

function requireFile(fileKey) {
  if (contents[fileKey] === null) {
    addError(fileKey, "file is missing")
  }
}

function requirePattern(fileKey, label, pattern) {
  const text = contents[fileKey]
  if (text !== null && !pattern.test(text)) {
    addError(fileKey, `missing ${label}`)
  }
}

for (const fileKey of Object.keys(FILES)) requireFile(fileKey)

if (contents.types !== null) {
  for (const typeName of [
    "AIInputSourceConnectionCatalogDTO",
    "AIInputSourceConnectionProviderId",
    "AIInputSourceConnectionStepId",
    "AIInputSourceConnectionProviderAccountManifestDTO",
    "AIInputSourceConnectionScopeManifestDTO",
    "AIInputSourceConnectionStepManifestDTO",
    "AIInputSourceConnectionRuntimeFlagsDTO",
    "AIInputSourceConnectionProviderManifestDTO",
    "AIInputSourceConnectionProviderAccountDTO",
    "AIInputSourceConnectionScopeDTO",
    "AIInputSourceConnectionOperationId",
    "AIInputSourceConnectionSummaryDTO",
    "AIInputSourceConnectionListDTO",
    "AIInputSourceConnectionDetailDTO",
    "AIInputSourceConnectionSetupSessionDTO",
    "AIInputSourceConnectionScopePreviewDTO",
    "AIInputSourceConnectionTestResultDTO",
    "AIInputSourceConnectionDependentSummaryDTO",
  ]) {
    if (!contents.types.includes(typeName)) {
      addError("types", `missing typed catalog surface: ${typeName}`)
    }
  }

  requirePattern(
    "types",
    "ready/unavailable catalog statuses",
    /provider_manifest_catalog_ready[\s\S]*provider_manifest_catalog_unavailable|provider_manifest_catalog_unavailable[\s\S]*provider_manifest_catalog_ready/
  )
  requirePattern("types", "protected no-runtime mode", /protected_static_no_secret_no_connector_runtime/)
  requirePattern("types", "explicit no-secret DTO marker", /secret\w*(?:Redacted|Included)|noSecrets?/i)
  requirePattern("types", "typed operation catalog", /\boperationCatalog\b|\boperations\b/)
  requirePattern("types", "typed duplicate fingerprint", /\b(?:duplicate|scope)Fingerprint\w*\b/i)
  requirePattern("types", "typed account impact preview", /\bimpactPreview\w*\b/i)
  requirePattern("types", "typed audit references", /\bauditRefs\b/)
  requirePattern("types", "typed authorization audit boundary", /\bauthorizationAudit\b/)
  requirePattern("types", "typed stop conditions", /\bstopConditions\b/)
  requirePattern("types", "UI-safe/redacted DTO boundary", /uiSafe\w*\s*:\s*true|redacted\w*\s*:\s*true/i)

  if (quotedToken("google_docs").test(contents.types)) {
    addError("types", "includes forbidden standalone google_docs provider id")
  }
}

if (contents.contract !== null) {
  requirePattern(
    "contract",
    "provider manifest catalog export",
    /\bAI_INPUT_SOURCE_CONNECTION_PROVIDER_MANIFESTS\b/
  )
  requirePattern(
    "contract",
    "manifest validator export",
    /\bvalidateAIInputSourceConnectionProviderManifests\b/
  )

  for (const provider of REQUIRED_PROVIDERS) {
    if (!quotedToken(provider).test(contents.contract)) {
      addError("contract", `missing provider manifest: ${provider}`)
    }
  }
  for (const step of REQUIRED_STEPS) {
    if (!quotedToken(step).test(contents.contract)) {
      addError("contract", `missing canonical step: ${step}`)
    }
  }

  requirePattern("contract", "unknown-input validation", /\bunknown\b/)
  requirePattern("contract", "missing manifest rejection", /missing|required|length|provider_manifest_validation_failed/i)
  requirePattern("contract", "duplicate provider rejection", /duplicate/i)
  requirePattern("contract", "step-order validation", /step\w*(?:Order|Ids)|REQUIRED_STEPS|CANONICAL_STEPS/i)
  requirePattern("contract", "runtime disabled manifest boundary", /runtime[\s\S]{0,500}false/)
  requirePattern(
    "contract",
    "external registration disabled",
    /externalRegistrationEnabled\s*:\s*false|externalRegisterable\s*:\s*false/
  )
  for (const errorCode of [
    "manifest_catalog_missing",
    "manifest_provider_count_invalid",
    "manifest_provider_duplicate",
    "manifest_runtime_must_fail_closed",
    "manifest_step_count_invalid",
    "manifest_step_boundary_invalid",
    "standalone_google_docs_forbidden",
  ]) {
    if (!contents.contract.includes(errorCode)) {
      addError("contract", `missing fail-closed validator error code: ${errorCode}`)
    }
  }
}

if (contents.service !== null) {
  requirePattern("service", "server-only boundary", /import\s+["']server-only["']/)
  requirePattern("service", "requireUser import", /\brequireUser\b/)
  requirePattern("service", "direct protected loader auth", /await\s+requireUser\s*\(\s*\)/)
  requirePattern("service", "catalog loader", /\bloadAIInputSourceConnectionCatalog\b/)
  requirePattern(
    "service",
    "manifest validation",
    /\bvalidateAIInputSourceConnectionProviderManifests\b/
  )
  requirePattern("service", "ready status", /provider_manifest_catalog_ready/)
  requirePattern("service", "unavailable status", /provider_manifest_catalog_unavailable/)
  requirePattern("service", "validation-failure reason", /provider_manifest_validation_failed/)
  requirePattern("service", "protected no-runtime mode", /protected_static_no_secret_no_connector_runtime/)
  requirePattern("service", "owner authorization marker", /ownerScope[\s\S]{0,350}authenticated\s*:\s*true/)
  requirePattern("service", "owner identity redaction", /identityRedacted\s*:\s*true/)
  requirePattern("service", "protected owner visibility", /visibility\s*:\s*["']protected_owner_only["']/)
  requirePattern("service", "fail-closed empty providers", /providers\s*:\s*\[\]/)
  requirePattern(
    "service",
    "fail-closed empty account instances",
    /accountInstances[\s\S]{0,350}items\s*:\s*\[\]/
  )
  requirePattern(
    "service",
    "fail-closed empty scope instances",
    /scopeInstances[\s\S]{0,350}items\s*:\s*\[\]/
  )
  requirePattern("service", "operation catalog DTO", /\boperationCatalog\b|\boperations\b/)
  for (const operation of [
    "list_provider_manifests",
    "list_provider_accounts",
    "create_setup_draft",
    "preview_source_scope",
    "test_source_connection_draft",
    "preview_account_revoke_impact",
    "activate_source_connection",
  ]) {
    if (!quotedToken(operation).test(contents.service)) {
      addError("service", `missing operation catalog entry: ${operation}`)
    }
  }
  requirePattern("service", "duplicate fingerprint DTO", /\b(?:duplicate|scope)Fingerprint\w*\b/i)
  requirePattern("service", "server-generated fingerprint strategy", /server_generated_hash_only/)
  requirePattern("service", "no client-native provider id", /nativeProviderIdAcceptedFromClient\s*:\s*false/)
  requirePattern("service", "no exposed native provider id", /nativeProviderIdExposed\s*:\s*false/)
  requirePattern("service", "no exposed fingerprint", /fingerprintExposed\s*:\s*false/)
  requirePattern("service", "impact preview DTO", /\bimpactPreview\w*\b/i)
  requirePattern("service", "impact preview unavailable without persistence", /unavailable_no_persistence/)
  requirePattern("service", "revoke blocked", /revokeAllowedNow\s*:\s*false/)
  requirePattern("service", "owner revoke confirmation", /ownerConfirmationRequired\s*:\s*true/)
  requirePattern("service", "audit reference DTO", /\bauditRefs\b/)
  requirePattern("service", "authorization audit DTO", /\bauthorizationAudit\b/)
  requirePattern("service", "service authorization requirement", /serviceAuthorizationRequired\s*:\s*true/)
  requirePattern("service", "owner scope requirement", /ownerScopeRequired\s*:\s*true/)
  requirePattern("service", "client owner-id rejection", /clientSuppliedOwnerIdAllowed\s*:\s*false/)
  requirePattern("service", "stop-condition DTO", /\bstopConditions\b/)
  requirePattern("service", "external registration disabled", /externalRegisterable\s*:\s*false/)
  requirePattern(
    "service",
    "redacted unavailable connection list",
    /connectionList[\s\S]{0,350}state\s*:\s*["']unavailable_no_persistence["'][\s\S]{0,250}items\s*:\s*\[\][\s\S]{0,250}uiSafeDtoOnly\s*:\s*true/
  )
  requirePattern(
    "service",
    "unavailable connection detail",
    /connectionDetail[\s\S]{0,200}state\s*:\s*["']unavailable_no_persistence["'][\s\S]{0,120}item\s*:\s*null/
  )
  requirePattern(
    "service",
    "blocked setup session",
    /setupSession[\s\S]{0,350}status\s*:\s*["']unavailable_no_server_action["'][\s\S]{0,300}createAllowedNow\s*:\s*false/
  )
  requirePattern(
    "service",
    "blocked scope preview",
    /scopePreview[\s\S]{0,450}status\s*:\s*["']unavailable_no_provider_runtime["'][\s\S]{0,400}previewAllowedNow\s*:\s*false/
  )
  requirePattern(
    "service",
    "blocked no-execution connection test",
    /connectionTest[\s\S]{0,500}providerCallExecuted\s*:\s*false[\s\S]{0,300}databaseWriteExecuted\s*:\s*false[\s\S]{0,300}moduleWriteExecuted\s*:\s*false[\s\S]{0,300}testAllowedNow\s*:\s*false/
  )
  requirePattern("service", "no exposed DTO secrets", /secretFieldsExposed\s*:\s*false/)
  requirePattern("service", "no raw provider DTO payload", /rawProviderPayloadExposed\s*:\s*false/)
  requirePattern("service", "no native provider DTO ids", /nativeProviderIds?Exposed\s*:\s*false/)
}

if (contents.page !== null) {
  requirePattern(
    "page",
    "server catalog loader import",
    /\bloadAIInputSourceConnectionCatalog\b/
  )
  requirePattern(
    "page",
    "server catalog load",
    /loadAIInputSourceConnectionCatalog\s*\(/
  )
  requirePattern(
    "page",
    "Server Component to client DTO transfer",
    /<AIInputClient\b[^>]*\bsourceConnectionCatalog=\{sourceConnectionCatalog\}/
  )
}

if (contents.client !== null) {
  requirePattern("client", "catalog prop type", /sourceConnectionCatalog\s*:\s*AIInputSourceConnectionCatalogDTO/)
  requirePattern("client", "catalog prop destructuring", /\bsourceConnectionCatalog\b/)
  requirePattern(
    "client",
    "client to wizard catalog transfer",
    /<SourceConnectionWizard[\s\S]{0,700}\bcatalog=\{sourceConnectionCatalog\}/
  )
  requirePattern("client", "formal mode guard", /\bisMockDataEnabled\b/)
  requirePattern(
    "client",
    "fail-closed wizard open guard",
    /open=\{\s*isMockDataEnabled\s*&&/
  )
}

if (contents.wizard !== null) {
  requirePattern("wizard", "typed catalog import", /\bAIInputSourceConnectionCatalogDTO\b/)
  requirePattern("wizard", "catalog prop", /\bcatalog\??\s*:\s*AIInputSourceConnectionCatalogDTO/)
  requirePattern("wizard", "ready status gate", /provider_manifest_catalog_ready/)
  requirePattern("wizard", "manifest unavailable state", /manifest_unavailable/)
  requirePattern("wizard", "manifest validation", /\bvalidate\w*ProviderManifests\b|\bvalidateAIInputSourceConnectionProviderManifests\b/)
  requirePattern("wizard", "manifest status", /\bmanifestStatus\b/)
  requirePattern(
    "wizard",
    "unavailable provider rejection",
    /manifest_unavailable[\s\S]{0,180}providers\s*:\s*\[\]/
  )
}

for (const fileKey of ["types", "contract", "service", "page", "client", "wizard"]) {
  const text = contents[fileKey]
  if (text === null) continue
  for (const { label, pattern } of FORBIDDEN_RUNTIME_PATTERNS) {
    if (pattern.test(text)) {
      addError(fileKey, `contains forbidden ${label}`)
    }
  }
}

if (contents.packageJson !== null) {
  requirePattern(
    "packageJson",
    "ai-input:connection-manifest:check script",
    /"ai-input:connection-manifest:check"\s*:\s*"node scripts\/check-ai-input-connection-manifest-bff\.mjs"/
  )
}

const result = {
  id: "AIINPUT-CONN-004",
  status: errors.length === 0 ? "provider_manifest_bff_contract_ready" : "failed",
  files: FILES,
  providers: REQUIRED_PROVIDERS,
  steps: REQUIRED_STEPS,
  boundary: "protected_static_no_secret_no_connector_runtime",
  errors,
}

console.log(`AI Input connection manifest BFF: ${result.status}`)
console.log(`Providers: ${REQUIRED_PROVIDERS.join(", ")}`)
console.log(`Steps: ${REQUIRED_STEPS.join(" -> ")}`)

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
