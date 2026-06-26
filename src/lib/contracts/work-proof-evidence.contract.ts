export type WorkProofEvidenceFamily =
  | "target-readiness"
  | "docker-disposable"
  | "local-disposable"
  | "work-proof-run"
  | "source-smoke"

export type WorkProofEvidenceFreshness = "fresh" | "stale" | "missing"

export type WorkProofEvidenceAllowedPattern = {
  readonly family: WorkProofEvidenceFamily
  readonly directory: string
  readonly pattern: string
  readonly label: string
}

export type WorkProofLatestEvidenceContract = {
  readonly id: "WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER"
  readonly status: "latest_work_proof_evidence_resolver_ready" | "missing_work_proof_evidence"
  readonly generatedAt: string
  readonly mode: "server_only_no_secret_work_evidence"
  readonly freshnessWindowMinutes: number
  readonly source: {
    readonly allowedDirectories: readonly string[]
    readonly allowedPatterns: readonly WorkProofEvidenceAllowedPattern[]
  }
  readonly latest: {
    readonly latestOverallPacketPath: string
    readonly latestTargetReadinessPath: string
    readonly latestDockerPath: string
    readonly latestLocalPath: string
    readonly latestWorkProofRunPath: string
    readonly latestSourceSmokePath: string
    readonly targetStatus: string
    readonly dockerStatus: string
    readonly localStatus: string
    readonly workProofRunStatus: string
    readonly sourceSmokeStatus: string
    readonly latestModifiedAt: string | null
    readonly latestAgeMinutes: number | null
    readonly freshness: WorkProofEvidenceFreshness
    readonly missing: boolean
    readonly stale: boolean
    readonly canRunWork009: boolean
    readonly canRunDockerProof: boolean
    readonly canRunLocalProof: boolean
    readonly workProofPassed: boolean
    readonly sourceStaticReady: boolean
    readonly nextOwnerAction: string
  }
  readonly safety: {
    readonly scansWhitelistedDirectoriesOnly: true
    readonly returnsRawPacketBody: false
    readonly executesCommands: false
    readonly databaseConnectionAllowed: false
    readonly databaseWriteAllowed: false
    readonly migrationApplyAllowed: false
    readonly publicOutputAllowed: false
    readonly externalAgentDatabaseAccessAllowed: false
    readonly printsSecrets: false
    readonly prohibitedExposure: readonly string[]
  }
}

export const WORK_PROOF_EVIDENCE_REPORTS_DIRECTORY =
  "docs/2_agent-input/generated/agent-loop/reports"

export const WORK_PROOF_EVIDENCE_REFRESH_DIRECTORY =
  "docs/2_agent-input/generated/agent-loop/work-refresh-proof"

export const WORK_PROOF_EVIDENCE_PROHIBITED_EXPOSURE = [
  "database URLs or hosts",
  "database passwords",
  "Supabase URLs or keys",
  "cookies or tokens",
  "raw auth claims",
  "profile IDs",
  "project IDs",
  "task IDs",
  "note IDs",
  "deliverable IDs",
  "raw generated report payload bodies",
  "Docker socket paths",
  "external registry credentials",
] as const
