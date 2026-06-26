import "server-only"

export type ClientPortalReadinessTone = "good" | "warn" | "blocked" | "neutral"

export type ClientPortalReadinessRow = {
  area: string
  status: string
  signal: string
  launchGate: string
  tone: ClientPortalReadinessTone
}

export type ClientPortalReadinessContract = {
  id: "CLIENT-006"
  status: "public_storage_policy_reviewed"
  generatedAt: string
  publicRoute: "/client/[token]"
  currentGate: {
    env: "PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB"
    enabled: boolean
    behavior: "fail_closed_by_default" | "db_backed_rendering_allowed"
  }
  schemaReadiness: {
    currentTokenStorage: "plain_project_client_token"
    proposedTokenStorage: "selector_verifier_hmac_share_token_table"
    uniqueIndexReviewed: true
    tokenHashingReviewed: true
    auditPersistenceReviewed: true
    implementationStatus: "proposal_only_no_schema_change"
    contractDoc: "docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md"
  }
  storageReadiness: {
    currentPublicDto: "file_urls_excluded"
    policyReviewed: true
    signedUrlStrategyReviewed: true
    implementationStatus: "proposal_only_no_file_url_rendering"
    contractDoc: "docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md"
  }
  prohibitedThisSlice: string[]
  rows: ClientPortalReadinessRow[]
  nextTaskCandidates: string[]
}

function isClientPortalDbGateEnabled() {
  return process.env.PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB === "1"
}

export function buildClientPortalReadinessContract(): ClientPortalReadinessContract {
  const dbGateEnabled = isClientPortalDbGateEnabled()

  return {
    id: "CLIENT-006",
    status: "public_storage_policy_reviewed",
    generatedAt: new Date().toISOString(),
    publicRoute: "/client/[token]",
    currentGate: {
      env: "PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB",
      enabled: dbGateEnabled,
      behavior: dbGateEnabled ? "db_backed_rendering_allowed" : "fail_closed_by_default",
    },
    schemaReadiness: {
      currentTokenStorage: "plain_project_client_token",
      proposedTokenStorage: "selector_verifier_hmac_share_token_table",
      uniqueIndexReviewed: true,
      tokenHashingReviewed: true,
      auditPersistenceReviewed: true,
      implementationStatus: "proposal_only_no_schema_change",
      contractDoc: "docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md",
    },
    storageReadiness: {
      currentPublicDto: "file_urls_excluded",
      policyReviewed: true,
      signedUrlStrategyReviewed: true,
      implementationStatus: "proposal_only_no_file_url_rendering",
      contractDoc: "docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md",
    },
    prohibitedThisSlice: [
      "token rotation action",
      "token revoke action",
      "public write action",
      "public storage or file URL rendering",
      "Prisma schema change or migration",
      "seed change",
      "production database mutation",
      "mock fallback in the public route",
    ],
    rows: [
      {
        area: "Public rendering gate",
        status: dbGateEnabled ? "enabled" : "disabled",
        signal: dbGateEnabled
          ? "The explicit DB-backed Client Portal gate is enabled in this environment."
          : "The explicit DB-backed Client Portal gate is disabled, so the public route remains fail-closed.",
        launchGate: dbGateEnabled
          ? "Run real DB/token smoke before sharing any client link."
          : "Keep disabled until Supabase env, DB connectivity, and token lifecycle review are complete.",
        tone: dbGateEnabled ? "warn" : "good",
      },
      {
        area: "Token lookup guard",
        status: "active",
        signal: "The public BFF validates token shape, queries by token plus CLIENT_VISIBLE project visibility, and fails closed on duplicate matches.",
        launchGate: "Add real DB/token smoke once a reachable DB is available.",
        tone: "good",
      },
      {
        area: "Token storage model",
        status: "proposal reviewed",
        signal: "DBS-004 defines a selector/verifier token, HMAC digest storage, key id, token status, revoke/rotate timestamps, last-access marker, audit relation, and migration/backfill path.",
        launchGate: "Do not implement token writes until the schema/migration target is approved; current runtime still stores nullable Project.clientToken as plain text.",
        tone: "blocked",
      },
      {
        area: "Rotation and revoke lifecycle",
        status: "not implemented",
        signal: "No owner server action exists for generate, rotate, revoke, or inspect share-token state.",
        launchGate: "Implement only behind requireUser(), project ownership checks, confirmation copy, and audit logging.",
        tone: "blocked",
      },
      {
        area: "Access audit trail",
        status: "not persisted",
        signal: "Client Portal reads are not yet recorded in append-only audit records.",
        launchGate: "Design minimal event rows that avoid storing raw tokens, user-agent secrets, or private content.",
        tone: "warn",
      },
      {
        area: "Public storage and file URLs",
        status: "policy reviewed",
        signal:
          "AUT-004 defines private-bucket storage, server-side signed URL BFF, short TTL, no-store response, audit, and no raw storage URL policy. Runtime still excludes file URLs.",
        launchGate:
          "Implement only through a future BFF file route after token/schema/action approval and storage metadata/audit paths are approved.",
        tone: "good",
      },
      {
        area: "Public DTO boundary",
        status: "active",
        signal: "Public output excludes internal IDs, clientToken, owner/profile IDs, notes, file URLs, raw Prisma rows, and mock data.",
        launchGate: "Keep the DTO narrow; any note or file exposure needs explicit public-output approval.",
        tone: "good",
      },
      {
        area: "Unavailable state",
        status: "active",
        signal: "Disabled, invalid, missing, duplicate, and unavailable states render the same safe noindex boundary.",
        launchGate: "Keep failures centralized and non-revealing through future token lifecycle work.",
        tone: "good",
      },
    ],
    nextTaskCandidates: [
      "CLIENT-005 Owner token rotate/revoke BFF actions with audit contract",
      "CLIENT-007 Real DB client-token smoke when env is reachable",
      "WORK-008 Disposable Work refresh proof harness",
      "AUTH-006 Supabase session proof checklist",
    ],
  }
}
