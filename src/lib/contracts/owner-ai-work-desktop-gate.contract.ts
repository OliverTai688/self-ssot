export const OWNER_AI_WORK_DESKTOP_GATE_CONTRACT_ID = "OWNEROS-GATE-001" as const

export const OWNER_AI_WORK_DESKTOP_GATE_KEYS = ["gateA", "gateB", "gateC"] as const

export type OwnerAIWorkDesktopGateKey = (typeof OWNER_AI_WORK_DESKTOP_GATE_KEYS)[number]

export type OwnerAIWorkDesktopGateStatus = "ACHIEVED" | "NOT_ACHIEVED"

export type OwnerAIWorkDesktopCheckStatus = "PASS" | "BLOCKED" | "FAIL"

export type OwnerAIWorkDesktopEvidenceKind =
  | "runtime"
  | "owner_runtime"
  | "negative_runtime"
  | "deployed_runtime"
  | "mock"
  | "static"
  | "proposal_only"
  | "conditional"
  | "stale"
  | "manual_review_only"
  | "single_happy_path_only"
  | "legacy_string"
  | "unknown"

export type OwnerAIWorkDesktopCriterionId =
  | "A1_REAL_GOOGLE_OWNER_AUTH"
  | "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT"
  | "A3_R2_FILE_LIBRARY_MULTI_CONTEXT"
  | "A4_WORK_RESEARCH_COMPANY_REAL_OWNER_PATHS"
  | "A5_INBOX_FREE_TEXT_RETURN_PATH"
  | "A6_AGENT_DIARY_AND_SKILL_CANDIDATE"
  | "A7_LINE_DRIVE_GMAIL_OWNER_PROOF"
  | "A8_PRIVATE_DEPLOYED_NO_MOCK_CORE_PROOF"
  | "B1_INVITED_MEMBER_ONBOARDING_AND_OFFBOARDING"
  | "B2_SHARED_WORK_ROLE_ENFORCEMENT"
  | "B3_VISIBILITY_AND_CLEVEL_NEGATIVE_PROOF"
  | "B4_INTERNAL_AI_PUBLIC_SPACE"
  | "B5_AUTHORIZED_MEMBER_AGENT_SUMMARIES"
  | "B6_OWNER_PLUS_ALL_ACTIVE_MEMBERS_MIN_ONE_NON_OWNER_PILOT"
  | "C1_MIGRATION_AND_RECOVERY"
  | "C2_OPERATIONS_AND_PROVIDER_FAILURE"
  | "C3_AUDIT_RETENTION_REVOCATION"
  | "C4_ADVERSARIAL_ISOLATION"
  | "C5_CORE_JOURNEY_UI_HARDENING"
  | "C6_PILOT_FINDINGS_CLOSED"

export type OwnerAIWorkDesktopEvidenceRecord = {
  criterionId: OwnerAIWorkDesktopCriterionId
  status: OwnerAIWorkDesktopCheckStatus
  kind: OwnerAIWorkDesktopEvidenceKind
  recordedAt: string
  expiresAt?: string | null
  testedCommit?: string | null
  deployedCommit?: string | null
  runtimeEvidence: boolean
  ownerEvidence: boolean
  negativeEvidence: boolean
  mockFallbackUsed: boolean
  reportPath: string
  reportSha256: string
}

export type OwnerAIWorkDesktopProofPacket = {
  id: typeof OWNER_AI_WORK_DESKTOP_GATE_CONTRACT_ID
  generatedAt: string
  gate: {
    key: OwnerAIWorkDesktopGateKey
    id: string
    status: OwnerAIWorkDesktopGateStatus
  }
  targetEnvironment: string
  authMode: string
  testedCommit: string | null
  deployedCommit: string | null
  freshness: {
    status: "fresh" | "blocked" | "unknown"
    maxAgeHours: number
    staleCriterionIds: string[]
  }
  mockFallbackUsed: boolean
  runtimeEvidencePresent: boolean
  ownerEvidencePresent: boolean
  individualChecks: Array<{
    id: OwnerAIWorkDesktopCriterionId | string
    status: OwnerAIWorkDesktopCheckStatus
    evidenceKind: OwnerAIWorkDesktopEvidenceKind
    blockingIds: string[]
    reportPath: string | null
    reportSha256: string | null
  }>
  blockingIds: string[]
  reportPath: string | null
  reportSha256: string | null
  safety: typeof OWNER_AI_WORK_DESKTOP_GATE_SAFETY
}

export const OWNER_AI_WORK_DESKTOP_GATE_CRITERIA = {
  gateA: [
    "A1_REAL_GOOGLE_OWNER_AUTH",
    "A2_DURABLE_AUTHORIZED_CHAT_CONTEXT",
    "A3_R2_FILE_LIBRARY_MULTI_CONTEXT",
    "A4_WORK_RESEARCH_COMPANY_REAL_OWNER_PATHS",
    "A5_INBOX_FREE_TEXT_RETURN_PATH",
    "A6_AGENT_DIARY_AND_SKILL_CANDIDATE",
    "A7_LINE_DRIVE_GMAIL_OWNER_PROOF",
    "A8_PRIVATE_DEPLOYED_NO_MOCK_CORE_PROOF",
  ],
  gateB: [
    "B1_INVITED_MEMBER_ONBOARDING_AND_OFFBOARDING",
    "B2_SHARED_WORK_ROLE_ENFORCEMENT",
    "B3_VISIBILITY_AND_CLEVEL_NEGATIVE_PROOF",
    "B4_INTERNAL_AI_PUBLIC_SPACE",
    "B5_AUTHORIZED_MEMBER_AGENT_SUMMARIES",
    "B6_OWNER_PLUS_ALL_ACTIVE_MEMBERS_MIN_ONE_NON_OWNER_PILOT",
  ],
  gateC: [
    "C1_MIGRATION_AND_RECOVERY",
    "C2_OPERATIONS_AND_PROVIDER_FAILURE",
    "C3_AUDIT_RETENTION_REVOCATION",
    "C4_ADVERSARIAL_ISOLATION",
    "C5_CORE_JOURNEY_UI_HARDENING",
    "C6_PILOT_FINDINGS_CLOSED",
  ],
} as const

export const OWNER_AI_WORK_DESKTOP_GATE_IDS = {
  gateA: "OWNER_PRIVATE_AI_WORK_DESKTOP_READY",
  gateB: "COMPANY_TEAM_PILOT_READY",
  gateC: "HARDENED_INTERNAL_ROLLOUT_READY",
} as const

export const OWNER_AI_WORK_DESKTOP_PROHIBITED_EVIDENCE_KINDS = [
  "mock",
  "static",
  "proposal_only",
  "conditional",
  "stale",
  "manual_review_only",
  "single_happy_path_only",
] as const

export const OWNER_AI_WORK_DESKTOP_REQUIRED_PROOF_FIELDS = [
  "gate.id",
  "gate.status",
  "targetEnvironment",
  "authMode",
  "testedCommit",
  "deployedCommit",
  "freshness",
  "mockFallbackUsed",
  "runtimeEvidencePresent",
  "ownerEvidencePresent",
  "individualChecks",
  "blockingIds",
  "reportPath",
  "reportSha256",
] as const

export const OWNER_AI_WORK_DESKTOP_GATE_SAFETY = {
  printsSecrets: false,
  mutatesDatabase: false,
  mutatesProvider: false,
  sendsEmail: false,
  publicOutputEnabled: false,
  externalAgentDatabaseAccess: false,
  externalRegisterable: false,
} as const
