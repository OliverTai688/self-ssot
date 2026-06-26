export type AIInputFormalReadinessTone = "good" | "warn" | "blocked" | "neutral"

export type AIInputSourceControlInputMode =
  | "manual"
  | "polling"
  | "webhook"
  | "event"
  | "scheduled"
  | "one_time"

export type AIInputSourceControlRiskLevel = "low" | "medium" | "high" | "variable"

export type AIInputSourceControlConnectionStatus =
  | "connected"
  | "needs_setup"
  | "planned"
  | "paused"
  | "error"

export type AIInputSourceControlSyncStatus =
  | "completed"
  | "review"
  | "idle"
  | "running"
  | "not_configured"
  | "failed"

export type AIInputFormalReadinessRow = {
  area: string
  status: string
  signal: string
  safeExposure: string
  nextGate: string
  tone: AIInputFormalReadinessTone
}

export type AIInputSourceWorkflowReadState =
  | "not_persisted"
  | "schema_review_required"
  | "proof_target_required"
  | "blocked_by_design"

export type AIInputSourceWorkflowReadModelKind =
  | "source_connection"
  | "source_asset"
  | "ai_workflow_run"
  | "ai_work_item"
  | "data_unit_proposal"
  | "module_write_intent"

export type AIInputSourceWorkflowReadModel = {
  kind: AIInputSourceWorkflowReadModelKind
  label: string
  statusLabel: string
  state: AIInputSourceWorkflowReadState
  count: number | null
  description: string
  emptyState: string
  nextGate: string
  auditRefs: string[]
  sourceRefs: string[]
  tone: AIInputFormalReadinessTone
}

export type AIInputSourceWorkflowReadContract = {
  id: "DATTR-024A"
  status: "formal_read_contract_active"
  generatedAt: string
  mode: "protected_read_empty_or_unavailable"
  bffBoundary: {
    loader: string
    auth: string
    authorization: string
    mapper: string
    persistence: string
  }
  summary: {
    totalObjects: number
    persistedObjects: 0
    emptyOrUnavailableObjects: number
    hiddenMockFallback: false
  }
  auditFamily: "ai-input.source-workflow"
  models: AIInputSourceWorkflowReadModel[]
  prohibitedFallbacks: string[]
  nextRunnableTask: "DATTR-024B"
}

export type AIInputSourceWorkflowGateState =
  | "complete"
  | "ready_boundary"
  | "dry_run_only"
  | "human_approval_required"
  | "blocked"

export type AIInputSourceWorkflowGateMatrixRow = {
  id:
	    | "DATTR-024H-MIGRATION-DRAFT"
	    | "DATTR-024I-PROOF-RUNNER"
	    | "DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP"
	    | "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE"
	    | "DATTR-024J-SERVICE-AUTHZ-RUNTIME"
	    | "DATTR-024K-RLS-AUDIT-STORAGE"
	    | "DATTR-024L-CONNECTOR-RUNTIME"
	    | "DATTR-024-FORMAL-CUTOVER"
  gateLabel: string
  state: AIInputSourceWorkflowGateState
  statusLabel: string
  signal: string
  ownerRunCommand: string
  allowedNow: string
  blockedRuntime: string
  nextAction: string
  boundary: string
  tone: AIInputFormalReadinessTone
}

export type AIInputSourceWorkflowGateMatrixContract = {
  id: "AIINPUT-OPS-003"
  status: "protected_source_workflow_gate_surface_active"
  generatedAt: string
  mode: "protected_read_no_db_no_connector_runtime"
  sharedBy: Array<"ai-input" | "admin" | "settings">
  source: {
    migrationDraft: string
    proofRunner: string
    localProofBootstrap: string
    serviceRuntime: string
    rlsAuditStorage: string
    connectorRuntimeApproval: string
    acceptanceDoc: string
  }
  summary: {
    rowCount: number
    completeCount: number
    readyBoundaryCount: number
    dryRunOnlyCount: number
    humanApprovalRequiredCount: number
    blockedCount: number
    nextTask: string
  }
  boundaryFlags: {
    databaseReadAllowed: false
    databaseWriteAllowed: false
    connectorRuntimeAllowed: false
    oauthRuntimeAllowed: false
    webhookRuntimeAllowed: false
    pollingRuntimeAllowed: false
    providerApiRuntimeAllowed: false
    secretWriteAllowed: false
    publicOutputAllowed: false
    externalRegisterable: false
  }
	  prohibitedRuntime: string[]
	  rows: AIInputSourceWorkflowGateMatrixRow[]
	}

export type AIInputSourceWorkflowProofTargetHandoffStep = {
  label: string
  detail: string
  status: "ready" | "missing" | "blocked" | "manual"
  tone: AIInputFormalReadinessTone
}

export type AIInputSourceWorkflowProofTargetHandoffContract = {
  id: "DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE"
  status: "protected_proof_target_handoff_active"
  mode: "protected_read_no_secret_owner_handoff"
  ownerAction: string
  proofCommands: string[]
  evidenceTargets: string[]
  passSignals: string[]
  failSignals: string[]
  missingPrerequisites: string[]
  envVarNames: string[]
  stopConditions: string[]
  steps: AIInputSourceWorkflowProofTargetHandoffStep[]
  safety: {
    executesCommands: false
    databaseConnectionAllowed: false
    databaseWriteAllowed: false
    migrationApplyAllowed: false
    connectorRuntimeAllowed: false
    providerApiRuntimeAllowed: false
    publicOutputAllowed: false
    revealsTargetUrl: false
    revealsHost: false
    revealsSecrets: false
    returnsRawPacketBody: false
    externalAgentDatabaseAccessAllowed: false
    externalRegisterable: false
  }
}

export type AIInputSourceWorkflowProofBootstrapContract = {
	  id: "DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI"
	  status: "protected_proof_packet_surface_active"
  generatedAt: string
  mode: "protected_read_no_secret_packet_summary"
  sharedBy: Array<"ai-input" | "admin" | "settings">
  source: {
    bootstrapCommand: string
    checkerCommand: string
    latestPacketPath: string
    latestCheckerPacketPath: string
    helperScript: string
    checkerScript: string
    acceptanceDoc: string
  }
  summary: {
    packetStatus: string
    checkerStatus: string
    targetProvided: boolean
    hostClass: string
    canRunChildProof: boolean
    missingCount: number
    warningCount: number
    nextTask: string
  }
  target: {
    source: string
    provided: boolean
    parseable: boolean
    protocolAllowed: boolean
    hostClass: string
    databaseNameHasProofMarker: boolean
    databaseNameLooksValuable: boolean
    remoteOverrideAccepted: boolean
    targetUrlRedacted: boolean
    hostRedacted: boolean
  }
  plannedChildProcess: {
    command: string
    proofOut: string
    runnableNow: boolean
    writesOnlyInsideChildProcess: boolean
    injectedEnvKeys: string[]
  }
  safety: {
    doesNotUseDatabaseUrlSilently: boolean
    doesNotApplyMigration: boolean
    doesNotPromoteMigrationDraft: boolean
    doesNotWriteDatabaseByDefault: boolean
    databaseConnectionAllowedByBootstrap: false
    connectorRuntimeAllowed: false
    providerApiRuntimeAllowed: false
    publicOutputAllowed: false
    externalAgentDatabaseAccessAllowed: false
    externalRegisterable: false
    printsSecrets: false
    excludedValues: string[]
  }
  missing: string[]
  warnings: string[]
	  ownerActions: string[]
	  prohibitedExposure: string[]
	  latestEvidence: AIInputSourceWorkflowLatestProofEvidenceContract
	  proofTargetHandoff: AIInputSourceWorkflowProofTargetHandoffContract
	}

export type AIInputSourceWorkflowProofEvidenceFamily =
  | "bootstrap"
  | "bootstrap-check"
  | "ops-surface-check"
  | "proof-runner"

export type AIInputSourceWorkflowProofEvidenceLatestFamily =
  | AIInputSourceWorkflowProofEvidenceFamily
  | "none"

export type AIInputSourceWorkflowProofEvidenceFreshness = "fresh" | "stale" | "missing"

export type AIInputSourceWorkflowLatestProofEvidenceContract = {
  id: "DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER"
  status: "latest_proof_evidence_resolver_ready" | "missing_source_workflow_proof_evidence"
  generatedAt: string
  mode: "server_only_no_secret_latest_evidence"
  freshnessWindowMinutes: number
  source: {
    allowedDirectories: string[]
    allowedPatterns: Array<{
      family: AIInputSourceWorkflowProofEvidenceFamily
      directory: string
      pattern: string
      label: string
    }>
  }
  latest: {
    evidenceFamily: AIInputSourceWorkflowProofEvidenceLatestFamily
    latestPacketPath: string
    latestCheckerPacketPath: string
    latestRunnerPacketPath: string
    packetStatus: string
    checkerStatus: string
    runnerStatus: string
    latestModifiedAt: string | null
    latestAgeMinutes: number | null
    freshness: AIInputSourceWorkflowProofEvidenceFreshness
    missing: boolean
    stale: boolean
    nextOwnerAction: string
  }
  safety: {
    scansWhitelistedDirectoriesOnly: true
    returnsRawPacketBody: false
    executesCommands: false
    databaseConnectionAllowed: false
    databaseWriteAllowed: false
    migrationApplyAllowed: false
    connectorRuntimeAllowed: false
    providerApiRuntimeAllowed: false
    publicOutputAllowed: false
    externalAgentDatabaseAccessAllowed: false
    externalRegisterable: false
    prohibitedExposure: string[]
  }
}

export type AIInputSourceControlMatrixRow = {
  id: string
  source: string
  provider: string
  connectorType: string
  connectionStatus: AIInputSourceControlConnectionStatus
  syncStatus: AIInputSourceControlSyncStatus
  inputMode: AIInputSourceControlInputMode
  inputModeLabel: string
  riskLevel: AIInputSourceControlRiskLevel
  riskLabel: string
  scope: string
  cadence: string
  defaultModule: string
  lastSync: string
  nextSync: string
  reviewRule: string
  nextAction: string
  missingPermissions: string | null
  boundary: string
  auditRefs: string[]
  tone: AIInputFormalReadinessTone
}

export type AIInputSourceControlMatrixContract = {
  id: "AIINPUT-OPS-002"
  status: "formal_source_control_matrix_active"
  generatedAt: string
  mode: "protected_read_no_connector_runtime"
  source: {
    acceptanceDoc: string
    splitContract: string
    connectorBoundary: string
    proposalActionContract: string
  }
  summary: {
    rowCount: number
    connectedCount: number
    plannedCount: number
    needsSetupCount: number
    highRiskCount: number
    missingPermissionCount: number
    nextTask: string
  }
  prohibitedRuntime: string[]
  rows: AIInputSourceControlMatrixRow[]
}

export type AIInputFormalReadinessContract = {
  id: "DATTR-025"
  status: "readiness_contract_active"
  generatedAt: string
  mode: "formal_bff_contract"
  supabase: {
    publicConfig: "configured" | "missing"
  }
  persistence: {
    current: "not_persisted"
    futureGate: string
  }
  counts: {
    sourceConnections: number | null
    sourceAssets: number | null
    aiWorkflowRuns: number | null
    aiWorkItems: number | null
    dataUnitProposals: number | null
    moduleWriteIntents: number | null
  }
  prohibitedRuntime: string[]
  rows: AIInputFormalReadinessRow[]
  sourceWorkflow: AIInputSourceWorkflowReadContract
  sourceControlMatrix: AIInputSourceControlMatrixContract
  sourceWorkflowGateMatrix: AIInputSourceWorkflowGateMatrixContract
  sourceWorkflowProofBootstrap: AIInputSourceWorkflowProofBootstrapContract
}
