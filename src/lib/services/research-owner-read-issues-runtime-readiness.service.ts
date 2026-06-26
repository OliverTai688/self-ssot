import "server-only"

import { RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE } from "@/lib/contracts/research-owner-read-issues-runtime-readiness.contract"
import { requireUser } from "@/lib/services/auth.service"

export const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_TASK_ID =
  "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF"

export const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_MODE =
  "issues_service_authz_runtime_proof_no_research_db_read"

const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_PREVIOUS_TASK_ID =
  "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE"

const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_NEXT_TASK_ID =
  "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF"

export type ResearchOwnerReadIssuesServiceAuthzRuntimeStatus =
  | "service_authz_runtime_proof_ready_no_research_db_read"
  | "service_authz_runtime_blocked_by_auth"

export type ResearchOwnerReadIssuesServiceAuthzRuntimeTone =
  | "good"
  | "warn"
  | "blocked"
  | "neutral"

export type ResearchOwnerReadIssuesServiceAuthzRuntimeRow = {
  id: string
  label: string
  signal: string
  decision: string
  blockedPattern: string
  tone: ResearchOwnerReadIssuesServiceAuthzRuntimeTone
}

export type ResearchOwnerReadIssuesServiceAuthzRuntimeProof = {
  taskId: typeof RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_TASK_ID
  status: ResearchOwnerReadIssuesServiceAuthzRuntimeStatus
  mode: typeof RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_MODE
  generatedAt: string
  selectedFamily: "issues"
  selectedModel: "ResearchThread"
  protectedRoute: "/research/readiness"
  runtimeRequireUserCallInThisSlice: true
  ownerIdentitySource: "requireUser().profileId"
  ownerAuthenticated: boolean
  ownerProfileIdPresent: boolean
  ownerProfileIdRedacted: true
  emailRedacted: true
  roleRedacted: true
  callerSuppliedOwnerIdAllowed: false
  directThreadIdOnlyAccessAllowed: false
  authProfileLookupMayOccur: true
  authProfileLookupBoundary: string
  ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId"
  serviceAuthorizationMode: "runtime_require_user_owner_scope_preflight_no_research_db_read"
  mapperInputBoundary: "authorized_rows_or_explicit_unavailable_state"
  mapperOutputBoundary: "ui_safe_research_issue_read_dto"
  runtimeDbReadEnabled: false
  runtimeDbReadScope: "research_owner_read_adapter_only"
  runtimeDbWriteEnabled: false
  runtimePrismaReadEnabled: false
  adapterExecutionAllowed: false
  routeHandlerEnabled: false
  serverActionWriteEnabled: false
  publicOutputEnabled: false
  externalCollaborationEnabled: false
  externalAgentDatabaseAccessAllowed: false
  agentFinalWriteAllowed: false
  externalRegisterable: false
  launchLevelUpgradeClaimed: false
  uiSafePacket: {
    ownerAuthenticated: boolean
    ownerProfileIdPresent: boolean
    ownerProfileIdRedacted: true
    selectedFamily: "issues"
    selectedModel: "ResearchThread"
    adapterExecutionAllowed: false
    runtimeDbReadEnabled: false
    runtimePrismaReadEnabled: false
  }
  rows: ResearchOwnerReadIssuesServiceAuthzRuntimeRow[]
  rejectedAlternatives: readonly string[]
  blockedUntil: readonly string[]
  stopConditions: readonly string[]
  sourceRefs: readonly string[]
  nextSafeAction: string
  tone: ResearchOwnerReadIssuesServiceAuthzRuntimeTone
}

const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_SOURCE_REFS = [
  "node_modules/next/dist/docs/01-app/02-guides/data-security.md",
  "node_modules/next/dist/docs/01-app/02-guides/authentication.md",
  "node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/02_architecture-and-rules/DBS-003_research-formal-read-model-and-bff-contract.md",
  "docs/02_architecture-and-rules/AUT-002_owner-auth-session-contract.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
] as const

const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_REJECTED_ALTERNATIVES = [
  "Enable prisma.researchThread.findMany in the service-authz proof slice.",
  "Accept caller-supplied ownerId or threadId-only access as authority.",
  "Return Profile id, email, role, raw Supabase claims, cookies, or Prisma rows to the Client Component tree.",
  "Expose the proof through a route handler, server action, public endpoint, or external agent registration path.",
] as const

const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_BLOCKED_UNTIL = [
  "AUTH-005 proves Supabase public env plus signed-in /auth/status and Profile mapping.",
  "A safe local/disposable or owner-approved proof target exists for the future selected-field Research read.",
  `${RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_NEXT_TASK_ID} proves selected-field runtime adapter output before any Research Prisma read is enabled.`,
] as const

const RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_STOP_CONDITIONS = [
  "Stop before importing Prisma client, db clients, or provider clients in this service.",
  "Stop before Research DB read/write, schema migration, migration apply, seed change, route handler, or server action.",
  "Stop before public output, external collaboration, Research agent final write, external agent database access, external registration, or launch-level claim.",
  "Stop if owner identity, service authorization, selected-field redaction, or proof target criteria become ambiguous.",
] as const

function buildRows({
  ownerAuthenticated,
  ownerProfileIdPresent,
}: {
  ownerAuthenticated: boolean
  ownerProfileIdPresent: boolean
}): ResearchOwnerReadIssuesServiceAuthzRuntimeRow[] {
  return [
    {
      id: "require-user-runtime-call",
      label: "Runtime owner identity",
      signal: ownerAuthenticated
        ? "requireUser() completed in the protected server path."
        : "requireUser() did not resolve an authenticated owner in this environment.",
      decision: ownerAuthenticated
        ? "Use the authenticated Profile id as the future owner-scope source; keep the value redacted."
        : "Return a blocked UI-safe preflight packet and do not attempt any Research adapter read.",
      blockedPattern: "Client-supplied ownerId or raw auth/Profile payload passthrough",
      tone: ownerAuthenticated ? "good" : "blocked",
    },
    {
      id: "owner-profile-redaction",
      label: "No-secret owner packet",
      signal: ownerProfileIdPresent
        ? "Profile id exists but remains redacted."
        : "No Profile id is present in the blocked auth state.",
      decision: "Expose only booleans and boundary labels to the readiness page.",
      blockedPattern: "Profile id, email, role, cookie, token, or raw claim in UI payload",
      tone: ownerProfileIdPresent ? "good" : "warn",
    },
    {
      id: "research-adapter-still-disabled",
      label: "Research adapter disabled",
      signal: "BFF-012 proves service authz preflight only.",
      decision:
        "Keep runtimeDbReadEnabled, runtimePrismaReadEnabled, and adapterExecutionAllowed false for Research owner-read adapter scope.",
      blockedPattern: "Prisma ResearchThread read in the same proof slice",
      tone: "blocked",
    },
    {
      id: "owner-scope-predicate-preserved",
      label: "Owner-scope predicate",
      signal: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.ownerScopePredicate,
      decision:
        "Future reads must filter ResearchThread rows by requireUser().profileId before mapper output.",
      blockedPattern: "threadId-only lookup before owner-scope proof",
      tone: "neutral",
    },
  ]
}

function buildProof({
  status,
  ownerAuthenticated,
  ownerProfileIdPresent,
}: {
  status: ResearchOwnerReadIssuesServiceAuthzRuntimeStatus
  ownerAuthenticated: boolean
  ownerProfileIdPresent: boolean
}): ResearchOwnerReadIssuesServiceAuthzRuntimeProof {
  return {
    taskId: RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_TASK_ID,
    status,
    mode: RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_RUNTIME_MODE,
    generatedAt: new Date().toISOString(),
    selectedFamily: "issues",
    selectedModel: "ResearchThread",
    protectedRoute: "/research/readiness",
    runtimeRequireUserCallInThisSlice: true,
    ownerIdentitySource: "requireUser().profileId",
    ownerAuthenticated,
    ownerProfileIdPresent,
    ownerProfileIdRedacted: true,
    emailRedacted: true,
    roleRedacted: true,
    callerSuppliedOwnerIdAllowed: false,
    directThreadIdOnlyAccessAllowed: false,
    authProfileLookupMayOccur: true,
    authProfileLookupBoundary:
      "requireUser() may resolve the authenticated Profile through the existing auth service; this proof still performs no Research owner-read adapter query.",
    ownerScopePredicate: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.ownerScopePredicate,
    serviceAuthorizationMode: "runtime_require_user_owner_scope_preflight_no_research_db_read",
    mapperInputBoundary: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.mapperInputBoundary,
    mapperOutputBoundary: RESEARCH_OWNER_READ_ISSUES_RUNTIME_READINESS_GATE.mapperOutputBoundary,
    runtimeDbReadEnabled: false,
    runtimeDbReadScope: "research_owner_read_adapter_only",
    runtimeDbWriteEnabled: false,
    runtimePrismaReadEnabled: false,
    adapterExecutionAllowed: false,
    routeHandlerEnabled: false,
    serverActionWriteEnabled: false,
    publicOutputEnabled: false,
    externalCollaborationEnabled: false,
    externalAgentDatabaseAccessAllowed: false,
    agentFinalWriteAllowed: false,
    externalRegisterable: false,
    launchLevelUpgradeClaimed: false,
    uiSafePacket: {
      ownerAuthenticated,
      ownerProfileIdPresent,
      ownerProfileIdRedacted: true,
      selectedFamily: "issues",
      selectedModel: "ResearchThread",
      adapterExecutionAllowed: false,
      runtimeDbReadEnabled: false,
      runtimePrismaReadEnabled: false,
    },
    rows: buildRows({ ownerAuthenticated, ownerProfileIdPresent }),
    rejectedAlternatives: RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_REJECTED_ALTERNATIVES,
    blockedUntil: RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_BLOCKED_UNTIL,
    stopConditions: RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_STOP_CONDITIONS,
    sourceRefs: RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_SOURCE_REFS,
    nextSafeAction:
      `Implement ${RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_NEXT_TASK_ID} only after this protected requireUser() preflight and a safe proof target are available. Previous gate: ${RESEARCH_OWNER_READ_ISSUES_SERVICE_AUTHZ_PREVIOUS_TASK_ID}.`,
    tone: ownerAuthenticated ? "good" : "blocked",
  }
}

export async function buildResearchOwnerReadIssuesServiceAuthzRuntimeProof(): Promise<ResearchOwnerReadIssuesServiceAuthzRuntimeProof> {
  try {
    const user = await requireUser()

    return buildProof({
      status: "service_authz_runtime_proof_ready_no_research_db_read",
      ownerAuthenticated: true,
      ownerProfileIdPresent: Boolean(user.id),
    })
  } catch {
    return buildProof({
      status: "service_authz_runtime_blocked_by_auth",
      ownerAuthenticated: false,
      ownerProfileIdPresent: false,
    })
  }
}
