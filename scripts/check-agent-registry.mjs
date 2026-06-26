#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const SOURCE_PATH = "docs/02_architecture-and-rules/ARC-020_internal-agents.md"
const BOUNDARY_POLICY_PATH = "docs/02_architecture-and-rules/ARC-019_agent-boundary-policy.md"
const MANIFEST_PATH =
  "docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json"
const INDEX_PATH = "docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json"
const AGENT_PROTOCOL_SERVICE_PATH = "src/lib/services/agent-protocol-readiness.service.ts"
const ADMIN_SURFACE_PATH = "src/app/(dashboard)/admin/page.tsx"
const SETTINGS_SURFACE_PATH = "src/app/(dashboard)/settings/page.tsx"

const REQUIRED_ROOT_FIELDS = [
  "schema",
  "version",
  "generatedAt",
  "sourceBasis",
  "safetyPolicy",
  "manifests",
]

const REQUIRED_MANIFEST_FIELDS = [
  "id",
  "agent_name",
  "label",
  "description",
  "version",
  "provider",
  "lifecycle",
  "endpoints",
  "protocols",
  "capabilities",
  "skills",
  "auth",
  "trust",
  "observability",
  "registry",
]

const RISK_LEVELS = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
const APPROVAL_LEVELS = new Set([
  "AUTO_READ",
  "AUTO_PROPOSE",
  "HUMAN_APPROVAL_REQUIRED",
  "BLOCKED",
])
const HIGH_RISK_OWNER_MODULES = new Set([
  "auth-permission",
  "client-portal",
  "life",
  "finance",
  "company",
  "chamber",
])

const SECRET_PATTERNS = [
  {
    label: "database URL environment name",
    pattern: /\b(?:DATABASE_URL|DIRECT_DATABASE_URL|WORK_PROOF_DATABASE_URL)\b/i,
  },
  {
    label: "Supabase privileged environment name",
    pattern: /\bSUPABASE_(?:SERVICE_ROLE|SECRET|JWT|ACCESS|REFRESH|PRIVATE)/i,
  },
  { label: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  { label: "cookie marker", pattern: /\b(?:auth-token|cookie|set-cookie)\b/i },
  { label: "raw profile identifier marker", pattern: /\b(?:profileId|profile_id)\b/i },
]

function parseArgs(argv) {
  const args = { json: false, out: null, help: false }
  const filteredArgs = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filteredArgs.length; index += 1) {
    const arg = filteredArgs[index]

    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      const value = filteredArgs[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log("Validate Personal OS internal AgentFacts-lite registry")
  console.log("")
  console.log("Usage:")
  console.log("  pnpm agent:registry:check")
  console.log("  pnpm agent:registry:check -- --json")
  console.log(
    "  pnpm agent:registry:check -- --out docs/2_agent-input/generated/agent-loop/reports/<file>.json"
  )
}

function repoPath(relativePath) {
  return resolve(process.cwd(), relativePath)
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(repoPath(relativePath), "utf8"))
}

async function fileExists(relativePath) {
  try {
    await access(repoPath(relativePath))
    return true
  } catch {
    return false
  }
}

async function fileContains(relativePath, pattern) {
  try {
    const contents = await readFile(repoPath(relativePath), "utf8")
    return contents.includes(pattern)
  } catch {
    return false
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function addIssue(list, code, message, path = null) {
  list.push({ code, message, path })
}

function uniqueValues(values) {
  return [...new Set(values)]
}

function duplicateValues(values) {
  const seen = new Set()
  const duplicates = new Set()

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  }

  return [...duplicates]
}

function sameMembers(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value))
}

function collectSourceAgents(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^\|\s*([A-Za-z][A-Za-z0-9]+Agent)\s*\|/))
    .filter(Boolean)
    .map((match) => match[1])
}

async function validateReferencedFile(relativePath, errors, context) {
  if (!isNonEmptyString(relativePath)) {
    addIssue(errors, "MISSING_FILE_REFERENCE", `${context} must reference a local file.`, context)
    return
  }

  if (!(await fileExists(relativePath))) {
    addIssue(errors, "REFERENCED_FILE_MISSING", `${context} does not exist: ${relativePath}`, context)
  }
}

function validateRoot(registry, errors) {
  if (!isRecord(registry)) {
    addIssue(errors, "ROOT_NOT_OBJECT", "Agent registry root must be an object.")
    return
  }

  for (const field of REQUIRED_ROOT_FIELDS) {
    if (!(field in registry)) {
      addIssue(errors, "ROOT_FIELD_MISSING", `Root field is missing: ${field}`, field)
    }
  }

  if (registry.schema !== "personal-os-agentfacts-lite") {
    addIssue(errors, "ROOT_SCHEMA_INVALID", "Root schema must be personal-os-agentfacts-lite.", "schema")
  }

  if (registry.version !== 1) {
    addIssue(errors, "ROOT_VERSION_INVALID", "Root version must be 1.", "version")
  }

  if (!isNonEmptyString(registry.generatedAt) || Number.isNaN(Date.parse(registry.generatedAt))) {
    addIssue(errors, "ROOT_GENERATED_AT_INVALID", "generatedAt must be a parseable timestamp.", "generatedAt")
  }

  if (!Array.isArray(registry.manifests)) {
    addIssue(errors, "MANIFESTS_NOT_ARRAY", "manifests must be an array.", "manifests")
  }

  const safety = registry.safetyPolicy
  if (!isRecord(safety)) {
    addIssue(errors, "SAFETY_POLICY_MISSING", "safetyPolicy must be an object.", "safetyPolicy")
    return
  }

  const expectedSafety = {
    runtimeStatus: "generated-internal-inventory-only",
    secretsIncluded: false,
    publicEndpointCreated: false,
    databaseSchemaChanged: false,
    externalRegistryWrite: false,
    externalRegisterableDefault: false,
  }

  for (const [key, value] of Object.entries(expectedSafety)) {
    if (safety[key] !== value) {
      addIssue(errors, "SAFETY_POLICY_INVALID", `safetyPolicy.${key} must be ${value}.`, `safetyPolicy.${key}`)
    }
  }
}

async function validateSourceBasis(registry, errors) {
  const sourceBasis = registry.sourceBasis
  if (!isRecord(sourceBasis)) {
    addIssue(errors, "SOURCE_BASIS_MISSING", "sourceBasis must be an object.", "sourceBasis")
    return
  }

  if (!Array.isArray(sourceBasis.local) || sourceBasis.local.length === 0) {
    addIssue(errors, "SOURCE_BASIS_LOCAL_MISSING", "sourceBasis.local must list local source files.", "sourceBasis.local")
  } else {
    for (const file of sourceBasis.local) {
      await validateReferencedFile(file, errors, `sourceBasis.local:${file}`)
    }

    if (!sourceBasis.local.includes(SOURCE_PATH)) {
      addIssue(errors, "SOURCE_OF_TRUTH_NOT_LISTED", `${SOURCE_PATH} must be in sourceBasis.local.`, "sourceBasis.local")
    }
  }

  if (!Array.isArray(sourceBasis.external) || sourceBasis.external.length === 0) {
    addIssue(
      errors,
      "SOURCE_BASIS_EXTERNAL_MISSING",
      "sourceBasis.external should record the NANDA and AgentFacts references used.",
      "sourceBasis.external"
    )
  }
}

async function validateManifest(manifest, index, sourceAgents, errors, warnings) {
  const path = `manifests[${index}]`

  if (!isRecord(manifest)) {
    addIssue(errors, "MANIFEST_NOT_OBJECT", "Each manifest must be an object.", path)
    return
  }

  for (const field of REQUIRED_MANIFEST_FIELDS) {
    if (!(field in manifest)) {
      addIssue(errors, "MANIFEST_FIELD_MISSING", `${manifest.label ?? path} is missing ${field}.`, `${path}.${field}`)
    }
  }

  if (!isNonEmptyString(manifest.id) || !manifest.id.startsWith("personal-os:")) {
    addIssue(errors, "MANIFEST_ID_INVALID", `${path}.id must be a personal-os id.`, `${path}.id`)
  }

  if (!isNonEmptyString(manifest.agent_name) || !manifest.agent_name.startsWith("urn:agent:personal-os:")) {
    addIssue(errors, "MANIFEST_AGENT_NAME_INVALID", `${path}.agent_name must be a personal-os agent URN.`, `${path}.agent_name`)
  }

  if (!isNonEmptyString(manifest.label) || !sourceAgents.includes(manifest.label)) {
    addIssue(errors, "MANIFEST_LABEL_NOT_IN_SOURCE", `${path}.label is not listed in ${SOURCE_PATH}.`, `${path}.label`)
  }

  if (!isNonEmptyString(manifest.description)) {
    addIssue(errors, "MANIFEST_DESCRIPTION_MISSING", `${manifest.label ?? path} needs a description.`, `${path}.description`)
  }

  if (!isNonEmptyString(manifest.version)) {
    addIssue(errors, "MANIFEST_VERSION_MISSING", `${manifest.label ?? path} needs a version.`, `${path}.version`)
  }

  if (!isRecord(manifest.provider) || !isNonEmptyString(manifest.provider.name) || !("url" in manifest.provider)) {
    addIssue(errors, "PROVIDER_INVALID", `${manifest.label ?? path} provider must include name and url key.`, `${path}.provider`)
  }

  if (!isRecord(manifest.lifecycle)) {
    addIssue(errors, "LIFECYCLE_INVALID", `${manifest.label ?? path} lifecycle must be an object.`, `${path}.lifecycle`)
  } else {
    if (manifest.lifecycle.status !== "governance-only") {
      addIssue(errors, "LIFECYCLE_STATUS_INVALID", `${manifest.label} must remain governance-only.`, `${path}.lifecycle.status`)
    }
    if (!isNonEmptyString(manifest.lifecycle.ownerModule)) {
      addIssue(errors, "OWNER_MODULE_MISSING", `${manifest.label} needs lifecycle.ownerModule.`, `${path}.lifecycle.ownerModule`)
    }
    if (manifest.lifecycle.sourceOfTruth !== SOURCE_PATH) {
      addIssue(errors, "SOURCE_OF_TRUTH_INVALID", `${manifest.label} must point sourceOfTruth at ${SOURCE_PATH}.`, `${path}.lifecycle.sourceOfTruth`)
    }
  }

  if (
    !isRecord(manifest.endpoints) ||
    !Array.isArray(manifest.endpoints.internal) ||
    !Array.isArray(manifest.endpoints.external)
  ) {
    addIssue(errors, "ENDPOINTS_INVALID", `${manifest.label ?? path} endpoints must include internal and external arrays.`, `${path}.endpoints`)
  } else {
    if (manifest.endpoints.internal.length > 0 || manifest.endpoints.external.length > 0) {
      addIssue(errors, "ENDPOINTS_MUST_STAY_EMPTY", `${manifest.label} cannot expose endpoints before AGENT-007 review.`, `${path}.endpoints`)
    }
  }

  if (!Array.isArray(manifest.protocols) || manifest.protocols.length === 0) {
    addIssue(errors, "PROTOCOLS_MISSING", `${manifest.label ?? path} must list protocols.`, `${path}.protocols`)
  }

  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    addIssue(errors, "CAPABILITIES_MISSING", `${manifest.label ?? path} must list capabilities.`, `${path}.capabilities`)
  } else {
    for (const [capabilityIndex, capability] of manifest.capabilities.entries()) {
      const capabilityPath = `${path}.capabilities[${capabilityIndex}]`
      if (!isRecord(capability)) {
        addIssue(errors, "CAPABILITY_NOT_OBJECT", `${manifest.label} capability must be an object.`, capabilityPath)
        continue
      }

      if (!isNonEmptyString(capability.id)) {
        addIssue(errors, "CAPABILITY_ID_MISSING", `${manifest.label} capability needs id.`, `${capabilityPath}.id`)
      }
      if (!isNonEmptyString(capability.description)) {
        addIssue(errors, "CAPABILITY_DESCRIPTION_MISSING", `${manifest.label} capability needs description.`, `${capabilityPath}.description`)
      }
      if (!RISK_LEVELS.has(capability.riskLevel)) {
        addIssue(errors, "CAPABILITY_RISK_INVALID", `${manifest.label} capability riskLevel is invalid.`, `${capabilityPath}.riskLevel`)
      }
      if (typeof capability.requiresHumanApproval !== "boolean") {
        addIssue(errors, "CAPABILITY_APPROVAL_FLAG_INVALID", `${manifest.label} capability needs requiresHumanApproval boolean.`, `${capabilityPath}.requiresHumanApproval`)
      }
      if (!Array.isArray(capability.allowedTargetModules) || capability.allowedTargetModules.length === 0) {
        addIssue(errors, "CAPABILITY_TARGETS_MISSING", `${manifest.label} capability needs allowedTargetModules.`, `${capabilityPath}.allowedTargetModules`)
      }
      if (["HIGH", "CRITICAL"].includes(capability.riskLevel) && capability.requiresHumanApproval !== true) {
        addIssue(errors, "HIGH_RISK_CAPABILITY_UNGATED", `${manifest.label} high-risk capability must require human approval.`, capabilityPath)
      }
    }
  }

  if (!Array.isArray(manifest.skills) || manifest.skills.length === 0) {
    addIssue(errors, "SKILLS_MISSING", `${manifest.label ?? path} must list related skills.`, `${path}.skills`)
  } else {
    for (const [skillIndex, skill] of manifest.skills.entries()) {
      const skillPath = `${path}.skills[${skillIndex}]`
      if (!isRecord(skill) || !isNonEmptyString(skill.id) || !isNonEmptyString(skill.source)) {
        addIssue(errors, "SKILL_INVALID", `${manifest.label} skill entries need id and source.`, skillPath)
      } else {
        await validateReferencedFile(skill.source, errors, skillPath)
      }
    }
  }

  if (!isRecord(manifest.auth) || !Array.isArray(manifest.auth.methods) || !Array.isArray(manifest.auth.requiredScopes)) {
    addIssue(errors, "AUTH_INVALID", `${manifest.label ?? path} auth must include methods and requiredScopes arrays.`, `${path}.auth`)
  } else if (manifest.auth.methods.length > 0 || manifest.auth.requiredScopes.length > 0) {
    addIssue(errors, "AUTH_MUST_STAY_EMPTY", `${manifest.label} cannot claim runtime auth methods or scopes yet.`, `${path}.auth`)
  }

  if (!isRecord(manifest.trust)) {
    addIssue(errors, "TRUST_INVALID", `${manifest.label ?? path} trust must be an object.`, `${path}.trust`)
  } else {
    if (!APPROVAL_LEVELS.has(manifest.trust.approvalLevel)) {
      addIssue(errors, "TRUST_APPROVAL_INVALID", `${manifest.label} approvalLevel is invalid.`, `${path}.trust.approvalLevel`)
    }
    if (!isNonEmptyString(manifest.trust.dataVisibilityLevel)) {
      addIssue(errors, "TRUST_VISIBILITY_MISSING", `${manifest.label} needs dataVisibilityLevel.`, `${path}.trust.dataVisibilityLevel`)
    }
    if (manifest.trust.boundaryPolicy !== BOUNDARY_POLICY_PATH) {
      addIssue(errors, "TRUST_BOUNDARY_INVALID", `${manifest.label} must point at ${BOUNDARY_POLICY_PATH}.`, `${path}.trust.boundaryPolicy`)
    }
    if (!Array.isArray(manifest.trust.blockedActions) || manifest.trust.blockedActions.length === 0) {
      addIssue(errors, "TRUST_BLOCKED_ACTIONS_MISSING", `${manifest.label} needs blockedActions.`, `${path}.trust.blockedActions`)
    }
    if (!Array.isArray(manifest.trust.attestations) || manifest.trust.attestations.length > 0) {
      addIssue(errors, "TRUST_ATTESTATIONS_INVALID", `${manifest.label} cannot claim attestations yet.`, `${path}.trust.attestations`)
    }
    if (
      HIGH_RISK_OWNER_MODULES.has(manifest.lifecycle?.ownerModule) &&
      manifest.trust.approvalLevel !== "HUMAN_APPROVAL_REQUIRED"
    ) {
      addIssue(errors, "HIGH_RISK_OWNER_UNGATED", `${manifest.label} high-risk owner module requires human approval.`, `${path}.trust.approvalLevel`)
    }
  }

  if (!isRecord(manifest.observability)) {
    addIssue(errors, "OBSERVABILITY_INVALID", `${manifest.label ?? path} observability must be an object.`, `${path}.observability`)
  } else {
    if (!Array.isArray(manifest.observability.evidenceReports)) {
      addIssue(errors, "OBSERVABILITY_REPORTS_INVALID", `${manifest.label} needs evidenceReports array.`, `${path}.observability.evidenceReports`)
    }
    if (!("lastVerification" in manifest.observability)) {
      addIssue(errors, "OBSERVABILITY_LAST_VERIFICATION_MISSING", `${manifest.label} needs lastVerification key.`, `${path}.observability.lastVerification`)
    }
    if (!Array.isArray(manifest.observability.telemetryClaims) || manifest.observability.telemetryClaims.length > 0) {
      addIssue(errors, "OBSERVABILITY_TELEMETRY_INVALID", `${manifest.label} cannot claim telemetry yet.`, `${path}.observability.telemetryClaims`)
    }
  }

  if (!isRecord(manifest.registry)) {
    addIssue(errors, "REGISTRY_INVALID", `${manifest.label ?? path} registry must be an object.`, `${path}.registry`)
  } else {
    if (manifest.registry.internalDiscoverable !== true) {
      addIssue(errors, "REGISTRY_INTERNAL_DISCOVERABLE_INVALID", `${manifest.label} must be internalDiscoverable.`, `${path}.registry.internalDiscoverable`)
    }
    if (manifest.registry.externalRegisterable !== false) {
      addIssue(errors, "REGISTRY_EXTERNAL_REGISTERABLE_INVALID", `${manifest.label} must not be externalRegisterable.`, `${path}.registry.externalRegisterable`)
    }
    if (manifest.registry.registrationStatus !== "not-registered") {
      addIssue(errors, "REGISTRY_STATUS_INVALID", `${manifest.label} must remain not-registered.`, `${path}.registry.registrationStatus`)
    }
    if (!Array.isArray(manifest.registry.registryTargets) || manifest.registry.registryTargets.length > 0) {
      addIssue(errors, "REGISTRY_TARGETS_INVALID", `${manifest.label} cannot include registryTargets yet.`, `${path}.registry.registryTargets`)
    }
  }

  if (manifest.trust?.approvalLevel === "AUTO_READ") {
    addIssue(warnings, "AUTO_READ_REVIEW", `${manifest.label} uses AUTO_READ; verify this remains intentionally read-only.`, `${path}.trust.approvalLevel`)
  }
}

function validateCoverage(manifests, sourceAgents, errors) {
  const labels = manifests.map((manifest) => manifest.label).filter(Boolean)
  const ids = manifests.map((manifest) => manifest.id).filter(Boolean)
  const urns = manifests.map((manifest) => manifest.agent_name).filter(Boolean)
  const duplicateLabels = duplicateValues(labels)
  const duplicateIds = duplicateValues(ids)
  const duplicateUrns = duplicateValues(urns)
  const missingAgents = sourceAgents.filter((agent) => !labels.includes(agent))
  const extraAgents = labels.filter((label) => !sourceAgents.includes(label))

  if (duplicateLabels.length > 0) {
    addIssue(errors, "DUPLICATE_LABELS", `Duplicate labels: ${duplicateLabels.join(", ")}`, "manifests")
  }
  if (duplicateIds.length > 0) {
    addIssue(errors, "DUPLICATE_IDS", `Duplicate ids: ${duplicateIds.join(", ")}`, "manifests")
  }
  if (duplicateUrns.length > 0) {
    addIssue(errors, "DUPLICATE_AGENT_NAMES", `Duplicate agent_name values: ${duplicateUrns.join(", ")}`, "manifests")
  }
  if (missingAgents.length > 0) {
    addIssue(errors, "MISSING_SOURCE_AGENTS", `Missing manifests: ${missingAgents.join(", ")}`, "manifests")
  }
  if (extraAgents.length > 0) {
    addIssue(errors, "EXTRA_MANIFEST_AGENTS", `Manifest labels not in source: ${extraAgents.join(", ")}`, "manifests")
  }
}

function validateIndex(index, manifests, sourceAgents, errors) {
  if (!isRecord(index)) {
    addIssue(errors, "INDEX_NOT_OBJECT", "Manifest index must be an object.", INDEX_PATH)
    return
  }

  if (index.schema !== "personal-os-agentfacts-lite-index") {
    addIssue(errors, "INDEX_SCHEMA_INVALID", "Manifest index schema is invalid.", "index.schema")
  }
  if (index.version !== 1) {
    addIssue(errors, "INDEX_VERSION_INVALID", "Manifest index version must be 1.", "index.version")
  }
  if (index.sourceOfTruth !== SOURCE_PATH) {
    addIssue(errors, "INDEX_SOURCE_INVALID", `Manifest index sourceOfTruth must be ${SOURCE_PATH}.`, "index.sourceOfTruth")
  }
  if (index.manifestFile !== MANIFEST_PATH) {
    addIssue(errors, "INDEX_MANIFEST_FILE_INVALID", `Manifest index manifestFile must be ${MANIFEST_PATH}.`, "index.manifestFile")
  }

  const labels = manifests.map((manifest) => manifest.label).filter(Boolean)
  const coverage = index.coverage
  if (!isRecord(coverage)) {
    addIssue(errors, "INDEX_COVERAGE_MISSING", "Manifest index needs coverage object.", "index.coverage")
  } else {
    if (coverage.sourceAgentCount !== sourceAgents.length) {
      addIssue(errors, "INDEX_SOURCE_COUNT_INVALID", "Index sourceAgentCount does not match ARC-020.", "index.coverage.sourceAgentCount")
    }
    if (coverage.manifestCount !== manifests.length) {
      addIssue(errors, "INDEX_MANIFEST_COUNT_INVALID", "Index manifestCount does not match manifests.", "index.coverage.manifestCount")
    }
    if (!Array.isArray(coverage.missingAgents) || coverage.missingAgents.length > 0) {
      addIssue(errors, "INDEX_MISSING_AGENTS_INVALID", "Index missingAgents must be an empty array.", "index.coverage.missingAgents")
    }
  }

  if (!Array.isArray(index.agents) || !sameMembers(index.agents, labels) || !sameMembers(index.agents, sourceAgents)) {
    addIssue(errors, "INDEX_AGENTS_INVALID", "Index agents must cover exactly ARC-020 manifest labels.", "index.agents")
  }

  const registryState = index.registryState
  if (!isRecord(registryState)) {
    addIssue(errors, "INDEX_REGISTRY_STATE_MISSING", "Manifest index needs registryState object.", "index.registryState")
  } else {
    if (registryState.internalDiscoverable !== true) {
      addIssue(errors, "INDEX_INTERNAL_DISCOVERABLE_INVALID", "Index must be internalDiscoverable.", "index.registryState.internalDiscoverable")
    }
    if (registryState.externalRegisterable !== false) {
      addIssue(errors, "INDEX_EXTERNAL_REGISTERABLE_INVALID", "Index must not be externalRegisterable.", "index.registryState.externalRegisterable")
    }
    if (registryState.registrationStatus !== "not-registered") {
      addIssue(errors, "INDEX_REGISTRATION_STATUS_INVALID", "Index must remain not-registered.", "index.registryState.registrationStatus")
    }
    if (registryState.runtimeEndpoint !== null) {
      addIssue(errors, "INDEX_RUNTIME_ENDPOINT_INVALID", "Index runtimeEndpoint must stay null before AGENT-007.", "index.registryState.runtimeEndpoint")
    }
    if (registryState.publicDirectory !== false) {
      addIssue(errors, "INDEX_PUBLIC_DIRECTORY_INVALID", "Index publicDirectory must stay false.", "index.registryState.publicDirectory")
    }
  }
}

function validateNoSecretMarkers(registryText, errors) {
  for (const { label, pattern } of SECRET_PATTERNS) {
    if (pattern.test(registryText)) {
      addIssue(errors, "SECRET_MARKER_FOUND", `Registry JSON contains a ${label}.`, MANIFEST_PATH)
    }
  }
}

function buildRegistrationReadiness(manifests, protectedSurfaceReady) {
  const blockers = [
    "No runtime endpoint exists for agent discovery.",
    "No runtime auth/scopes exist for agent discovery.",
    "No human approval exists for external registry write.",
  ]

  if (!protectedSurfaceReady) {
    blockers.unshift("AGENT-007 protected owner/admin read-only readiness surface is not implemented.")
  }

  return {
    canRegisterExternally: false,
    status: "blocked_by_policy",
    protectedReadinessSurfaceReady: protectedSurfaceReady,
    missingRegistrationReadinessFields: [
      {
        field: "endpoints.external",
        agentCount: manifests.filter((manifest) => manifest.endpoints?.external?.length === 0).length,
        reason: "No reviewed runtime public endpoint has been created.",
      },
      {
        field: "auth.methods",
        agentCount: manifests.filter((manifest) => manifest.auth?.methods?.length === 0).length,
        reason: "No runtime auth method has been approved for agent registry access.",
      },
      {
        field: "auth.requiredScopes",
        agentCount: manifests.filter((manifest) => manifest.auth?.requiredScopes?.length === 0).length,
        reason: "No owner/admin scopes have been defined for runtime agent discovery.",
      },
      {
        field: "trust.attestations",
        agentCount: manifests.filter((manifest) => manifest.trust?.attestations?.length === 0).length,
        reason: "No external trust attestations or verification statements exist.",
      },
      {
        field: "observability.telemetryClaims",
        agentCount: manifests.filter((manifest) => manifest.observability?.telemetryClaims?.length === 0).length,
        reason: "No runtime telemetry, uptime, or quality metrics have been measured.",
      },
      {
        field: "registry.registryTargets",
        agentCount: manifests.filter((manifest) => manifest.registry?.registryTargets?.length === 0).length,
        reason: "No external registry target has human approval.",
      },
    ],
    blockers,
  }
}

function summarize(manifests, sourceAgents) {
  const capabilities = manifests.flatMap((manifest) => manifest.capabilities ?? [])
  const highRiskCapabilities = capabilities.filter((capability) =>
    ["HIGH", "CRITICAL"].includes(capability.riskLevel)
  )

  return {
    sourceAgentCount: sourceAgents.length,
    manifestCount: manifests.length,
    uniqueLabels: uniqueValues(manifests.map((manifest) => manifest.label).filter(Boolean)).length,
    internalDiscoverableCount: manifests.filter((manifest) => manifest.registry?.internalDiscoverable === true).length,
    externalRegisterableCount: manifests.filter((manifest) => manifest.registry?.externalRegisterable === true).length,
    runtimeEndpointCount: manifests.reduce(
      (total, manifest) => total + (manifest.endpoints?.internal?.length ?? 0) + (manifest.endpoints?.external?.length ?? 0),
      0
    ),
    highOrCriticalCapabilityCount: highRiskCapabilities.length,
    highOrCriticalCapabilitiesGatedCount: highRiskCapabilities.filter(
      (capability) => capability.requiresHumanApproval === true
    ).length,
  }
}

function printHuman(result) {
  console.log("Agent registry readiness")
  console.log(`Internal status: ${result.status}`)
  console.log(`External registration: ${result.externalRegistration.status}`)
  console.log(`Generated at: ${result.generatedAt}`)
  console.log("")
  console.log(`Source agents: ${result.summary.sourceAgentCount}`)
  console.log(`Manifests: ${result.summary.manifestCount}`)
  console.log(`Internal discoverable: ${result.summary.internalDiscoverableCount}`)
  console.log(`External registerable: ${result.summary.externalRegisterableCount}`)
  console.log(`Runtime endpoints: ${result.summary.runtimeEndpointCount}`)
  console.log(`High-risk capability gates: ${result.summary.highOrCriticalCapabilitiesGatedCount}/${result.summary.highOrCriticalCapabilityCount}`)
  console.log(`Validation errors: ${result.validation.errors.length}`)
  console.log(`Validation warnings: ${result.validation.warnings.length}`)
  console.log("")

  if (result.validation.errors.length > 0) {
    console.log("Errors:")
    for (const error of result.validation.errors) {
      console.log(`- ${error.code}: ${error.message}`)
    }
    console.log("")
  }

  console.log("External registration blockers:")
  for (const blocker of result.externalRegistration.blockers) {
    console.log(`- ${blocker}`)
  }
  console.log("")
  console.log("Next actions:")
  for (const action of result.nextActions) {
    console.log(`- ${action}`)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    return
  }

  const errors = []
  const warnings = []
  const sourceMarkdown = await readFile(repoPath(SOURCE_PATH), "utf8")
  const sourceAgents = collectSourceAgents(sourceMarkdown)
  const registryText = await readFile(repoPath(MANIFEST_PATH), "utf8")
  const registry = JSON.parse(registryText)
  const index = await readJson(INDEX_PATH)

  validateRoot(registry, errors)
  await validateSourceBasis(registry, errors)
  validateNoSecretMarkers(registryText, errors)

  const manifests = Array.isArray(registry.manifests) ? registry.manifests : []

  for (const [manifestIndex, manifest] of manifests.entries()) {
    await validateManifest(manifest, manifestIndex, sourceAgents, errors, warnings)
  }

  validateCoverage(manifests, sourceAgents, errors)
  validateIndex(index, manifests, sourceAgents, errors)

  await validateReferencedFile(BOUNDARY_POLICY_PATH, errors, "boundaryPolicy")
  const protectedSurfaceReady =
    (await fileExists(AGENT_PROTOCOL_SERVICE_PATH)) &&
    (await fileContains(ADMIN_SURFACE_PATH, "agentProtocolContract")) &&
    (await fileContains(SETTINGS_SURFACE_PATH, "agentProtocolContract"))

  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: errors.length === 0 ? "ready_for_internal_use" : "failed",
    files: {
      sourceOfTruth: SOURCE_PATH,
      manifestFile: MANIFEST_PATH,
      indexFile: INDEX_PATH,
    },
    sourceBasis: {
      local: registry.sourceBasis?.local ?? [],
      external: registry.sourceBasis?.external ?? [],
    },
    summary: summarize(manifests, sourceAgents),
    validation: {
      errors,
      warnings,
    },
    externalRegistration: buildRegistrationReadiness(manifests, protectedSurfaceReady),
    nextActions: [
      protectedSurfaceReady
        ? "Keep AGENT-007 protected readiness read-only while runtime endpoint/auth/scope work remains absent."
        : "Implement AGENT-007 as a protected owner/admin read-only readiness surface.",
      "Keep registry output internal-only until runtime auth, scopes, endpoints, trust attestations, and human approval exist.",
      "Run pnpm agent:registry:check in future loops after editing agent manifests.",
    ],
  }

  if (args.out) {
    const outPath = repoPath(args.out)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`)
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    printHuman(result)
  }

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
