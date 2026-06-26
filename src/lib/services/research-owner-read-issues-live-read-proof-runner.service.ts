import "server-only"

import {
  RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_TASK_ID,
  type ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof,
} from "@/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service"

export const RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_TASK_ID =
  "RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT"

export const RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_MODE =
  "live_read_proof_runner_contract_dry_run_no_live_research_read"

const RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_NEXT_TASK_ID =
  "LOOP-170-LAUNCH-LEVEL-REVIEW"

const RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_DEPENDENCY_TASK_IDS =
  [
    "RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF",
    "RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF",
    "RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE",
    "RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF",
    "RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE",
  ] as const

const ALLOW_LIVE_READ_FLAG = "PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ"
const CONFIRMATION_ENV = "PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM"
const CONFIRMATION_PHRASE = "I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA"
const PROOF_TARGET_ENV = "PERSONAL_OS_RESEARCH_READ_PROOF_TARGET"

export type ResearchOwnerReadIssuesLiveReadProofRunnerStatus =
  | "live_read_proof_runner_contract_ready_dry_run_only"
  | "blocked_until_selected_field_gate_and_owner_run_prerequisites"

export type ResearchOwnerReadIssuesLiveReadProofRunnerTone =
  | "good"
  | "warn"
  | "blocked"
  | "neutral"

export type ResearchOwnerReadIssuesLiveReadProofRunnerRow = {
  id: string
  label: string
  readinessSignal: string
  passCriteria: string
  blockedPattern: string
  tone: ResearchOwnerReadIssuesLiveReadProofRunnerTone
}

export type ResearchOwnerReadIssuesLiveReadProofRunnerRequiredInput = {
  id: string
  label: string
  inputName: string
  requiredValue: string
  currentState: "not_collected_in_contract"
  requiredForLiveRead: true
  safeToPrintValue: false
}

export type ResearchOwnerReadIssuesLiveReadProofRunnerContract = {
  taskId: typeof RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_TASK_ID
  status: ResearchOwnerReadIssuesLiveReadProofRunnerStatus
  mode: typeof RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_MODE
  generatedAt: string
  selectedFamily: "issues"
  selectedModel: "ResearchThread"
  dependsOn: {
    bff013TaskId: typeof RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_TASK_ID
    bff012TaskId: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["dependsOn"]["bff012TaskId"]
    bff011TaskId: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["dependsOn"]["bff011TaskId"]
    bff010TaskId: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["dependsOn"]["bff010TaskId"]
    bff009TaskId: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["dependsOn"]["bff009TaskId"]
  }
  dependencyTaskIds: typeof RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_DEPENDENCY_TASK_IDS
  protectedRoute: "/research/readiness"
  ownerRunCommand: "pnpm research:read-issues-live-read-proof-runner:check"
  ownerRunCommandTemplate: readonly string[]
  dryRunDefault: true
  proofRunnerKind: "owner_run_no_secret_static_contract"
  ownerIdentitySource: "requireUser().profileId"
  ownerScopePredicate: "ResearchThread.ownerId equals requireUser().profileId"
  proofTargetClassification: "missing_owner_approved_target"
  proofTargetEnvName: typeof PROOF_TARGET_ENV
  proofTargetReady: false
  ownerRunReady: false
  allowLiveReadFlagName: typeof ALLOW_LIVE_READ_FLAG
  allowLiveReadRequiredValue: "1"
  allowLiveReadFlagCollected: false
  confirmationEnvName: typeof CONFIRMATION_ENV
  confirmationPhrase: typeof CONFIRMATION_PHRASE
  confirmationCollected: false
  serviceAuthzPreflightReady: boolean
  selectedFieldProofReady: boolean
  authPrerequisites: readonly string[]
  selectedScalarFields: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["selectedScalarFields"]
  relationCountKeys: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["relationCountKeys"]
  plannedPrismaOperation: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["plannedPrismaOperation"]
  plannedWhere: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["plannedWhere"]
  mapperFunction: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["mapperFunction"]
  mapperOutputBoundary: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof["mapperOutputBoundary"]
  liveReadExecutionAllowed: false
  dryRunOnly: true
  runtimeDbReadEnabled: false
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
  requiredInputs: readonly ResearchOwnerReadIssuesLiveReadProofRunnerRequiredInput[]
  ownerRunCriteria: readonly string[]
  rows: readonly ResearchOwnerReadIssuesLiveReadProofRunnerRow[]
  rejectedAlternatives: readonly string[]
  stopConditions: readonly string[]
  sourceRefs: readonly string[]
  nextSafeAction: string
  tone: ResearchOwnerReadIssuesLiveReadProofRunnerTone
}

const AUTH_PREREQUISITES = [
  "AUTH-005 signed-in Supabase/Profile proof, or explicit development mock auth owner identity proof.",
  "Protected server path resolves requireUser().profileId for the intended owner Profile.",
  "The proof packet never prints Supabase URLs, keys, cookies, tokens, raw claims, Profile ids, actual owner email values, database URLs, raw Prisma rows, source bodies, or private Research content.",
] as const

const OWNER_RUN_CRITERIA = [
  `${ALLOW_LIVE_READ_FLAG}=1 must be explicitly present before a future live-read proof can run.`,
  `${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE} must be explicitly present before a future live-read proof can run.`,
  `${PROOF_TARGET_ENV} must classify a local, disposable, or owner-approved Research proof target; this contract does not collect or print its value.`,
  "The selected-field proof must remain limited to scalar DTO fields plus _count keys for sources, concepts, and writingProjects.",
  "The mapper must remain mapAuthorizedResearchIssueRowsToDtos and return only ui_safe_research_issue_read_dto output.",
  "If any prerequisite is missing, return dry-run readiness output only and keep liveReadExecutionAllowed=false.",
] as const

const REJECTED_ALTERNATIVES = [
  "Enable a live ResearchThread Prisma read from the proof-runner contract.",
  "Use a production-like Research dataset without explicit owner approval and target classification.",
  "Read all Research families instead of the selected issues family.",
  "Expose the live-read proof through a route handler, server action, public endpoint, external agent, or external registry.",
] as const

const STOP_CONDITIONS = [
  "Stop before importing Prisma client, db clients, provider clients, cookies, headers, or environment variables in this contract service.",
  "Stop before Research DB read/write, schema migration, migration apply, seed change, route handler, server action, public output, or launch-level claim.",
  "Stop before external collaboration, Research agent final write, external agent database access, or external registration.",
  "Stop if owner identity, proof target classification, allow flag, confirmation phrase, selected-field shape, mapper output, or no-secret evidence becomes ambiguous.",
] as const

const SOURCE_REFS = [
  "docs/06_audits-and-reports/RPT-051_loop-168-research-post-selected-field-adapter-gap-review.md",
  "node_modules/next/dist/docs/01-app/02-guides/data-security.md",
  "node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md",
  "https://www.prisma.io/docs/orm/prisma-client/queries/select-fields",
  "https://supabase.com/docs/guides/auth/server-side/nextjs",
  "docs/02_architecture-and-rules/DBS-003_research-db-model-decision.md",
  "docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md",
  "docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md",
  "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
] as const

function buildRequiredInputs(): ResearchOwnerReadIssuesLiveReadProofRunnerRequiredInput[] {
  return [
    {
      id: "allow-live-read-flag",
      label: "Explicit live-read allow flag",
      inputName: ALLOW_LIVE_READ_FLAG,
      requiredValue: "1",
      currentState: "not_collected_in_contract",
      requiredForLiveRead: true,
      safeToPrintValue: false,
    },
    {
      id: "owner-confirmation-phrase",
      label: "Owner confirmation phrase",
      inputName: CONFIRMATION_ENV,
      requiredValue: CONFIRMATION_PHRASE,
      currentState: "not_collected_in_contract",
      requiredForLiveRead: true,
      safeToPrintValue: false,
    },
    {
      id: "proof-target-classification",
      label: "Owner-approved proof target",
      inputName: PROOF_TARGET_ENV,
      requiredValue: "local_or_disposable_or_owner_approved",
      currentState: "not_collected_in_contract",
      requiredForLiveRead: true,
      safeToPrintValue: false,
    },
  ]
}

function buildRows({
  selectedFieldProofReady,
  serviceAuthzPreflightReady,
}: {
  selectedFieldProofReady: boolean
  serviceAuthzPreflightReady: boolean
}): ResearchOwnerReadIssuesLiveReadProofRunnerRow[] {
  return [
    {
      id: "selected-field-proof",
      label: "Selected-field proof",
      readinessSignal: selectedFieldProofReady
        ? "BFF-013 selected-field proof gate is ready, but live read remains disabled."
        : "BFF-013 is not ready; keep proof runner dry-run only.",
      passCriteria: "BFF-013 passes while livePrismaReadAllowed remains false.",
      blockedPattern: "Live read before selected-field proof gate",
      tone: selectedFieldProofReady ? "good" : "blocked",
    },
    {
      id: "service-authz-preflight",
      label: "Service authz preflight",
      readinessSignal: serviceAuthzPreflightReady
        ? "BFF-012 resolved requireUser() in the protected server path."
        : "BFF-012 owner preflight is absent in this environment.",
      passCriteria: "Owner identity comes only from requireUser().profileId.",
      blockedPattern: "caller-supplied ownerId",
      tone: serviceAuthzPreflightReady ? "good" : "blocked",
    },
    {
      id: "owner-run-inputs",
      label: "Owner-run inputs",
      readinessSignal: "Allow flag, confirmation phrase, and proof target are required but not collected by this contract service.",
      passCriteria: "Future live proof must explicitly collect and validate all required owner-run inputs.",
      blockedPattern: "Implicit live read from default env or valuable dataset",
      tone: "blocked",
    },
    {
      id: "dry-run-default",
      label: "Dry-run default",
      readinessSignal: "liveReadExecutionAllowed=false and dryRunOnly=true.",
      passCriteria: "The proof runner reports readiness without connecting to the database.",
      blockedPattern: "Accidental Prisma read during readiness check",
      tone: "good",
    },
    {
      id: "public-agent-boundary",
      label: "Public and agent boundary",
      readinessSignal: "publicOutputEnabled=false, externalAgentDatabaseAccessAllowed=false, externalRegisterable=false.",
      passCriteria: "Owner-read proof stays protected-owner visible and non-registerable.",
      blockedPattern: "External agent or public route reads private Research data",
      tone: "good",
    },
  ]
}

export function buildResearchOwnerReadIssuesLiveReadProofRunnerContract(
  selectedFieldProof: ResearchOwnerReadIssuesSelectedFieldRuntimeAdapterProof,
): ResearchOwnerReadIssuesLiveReadProofRunnerContract {
  const selectedFieldProofReady =
    selectedFieldProof.status ===
    "selected_field_runtime_adapter_proof_gate_ready_no_live_research_read"
  const serviceAuthzPreflightReady = selectedFieldProof.serviceAuthzPreflightReady

  return {
    taskId: RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_TASK_ID,
    status: selectedFieldProofReady
      ? "live_read_proof_runner_contract_ready_dry_run_only"
      : "blocked_until_selected_field_gate_and_owner_run_prerequisites",
    mode: RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_MODE,
    generatedAt: new Date().toISOString(),
    selectedFamily: selectedFieldProof.selectedFamily,
    selectedModel: selectedFieldProof.selectedModel,
    dependsOn: {
      bff013TaskId: RESEARCH_OWNER_READ_ISSUES_SELECTED_FIELD_RUNTIME_ADAPTER_TASK_ID,
      bff012TaskId: selectedFieldProof.dependsOn.bff012TaskId,
      bff011TaskId: selectedFieldProof.dependsOn.bff011TaskId,
      bff010TaskId: selectedFieldProof.dependsOn.bff010TaskId,
      bff009TaskId: selectedFieldProof.dependsOn.bff009TaskId,
    },
    dependencyTaskIds:
      RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_DEPENDENCY_TASK_IDS,
    protectedRoute: "/research/readiness",
    ownerRunCommand: "pnpm research:read-issues-live-read-proof-runner:check",
    ownerRunCommandTemplate: [
      `${ALLOW_LIVE_READ_FLAG}=1`,
      `${CONFIRMATION_ENV}=${CONFIRMATION_PHRASE}`,
      `${PROOF_TARGET_ENV}=local_or_disposable_or_owner_approved`,
      "pnpm research:read-issues-live-read-proof-runner:check",
    ],
    dryRunDefault: true,
    proofRunnerKind: "owner_run_no_secret_static_contract",
    ownerIdentitySource: selectedFieldProof.ownerIdentitySource,
    ownerScopePredicate: selectedFieldProof.ownerScopePredicate,
    proofTargetClassification: "missing_owner_approved_target",
    proofTargetEnvName: PROOF_TARGET_ENV,
    proofTargetReady: false,
    ownerRunReady: false,
    allowLiveReadFlagName: ALLOW_LIVE_READ_FLAG,
    allowLiveReadRequiredValue: "1",
    allowLiveReadFlagCollected: false,
    confirmationEnvName: CONFIRMATION_ENV,
    confirmationPhrase: CONFIRMATION_PHRASE,
    confirmationCollected: false,
    serviceAuthzPreflightReady,
    selectedFieldProofReady,
    authPrerequisites: AUTH_PREREQUISITES,
    selectedScalarFields: selectedFieldProof.selectedScalarFields,
    relationCountKeys: selectedFieldProof.relationCountKeys,
    plannedPrismaOperation: selectedFieldProof.plannedPrismaOperation,
    plannedWhere: selectedFieldProof.plannedWhere,
    mapperFunction: selectedFieldProof.mapperFunction,
    mapperOutputBoundary: selectedFieldProof.mapperOutputBoundary,
    liveReadExecutionAllowed: false,
    dryRunOnly: true,
    runtimeDbReadEnabled: false,
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
    requiredInputs: buildRequiredInputs(),
    ownerRunCriteria: OWNER_RUN_CRITERIA,
    rows: buildRows({ selectedFieldProofReady, serviceAuthzPreflightReady }),
    rejectedAlternatives: REJECTED_ALTERNATIVES,
    stopConditions: STOP_CONDITIONS,
    sourceRefs: SOURCE_REFS,
    nextSafeAction: selectedFieldProofReady
      ? `Implement the owner-run proof runner in dry-run mode only, then let ${RESEARCH_OWNER_READ_ISSUES_LIVE_READ_PROOF_RUNNER_NEXT_TASK_ID} re-evaluate launch level before any live read is selected.`
      : "Keep the proof runner blocked until the selected-field adapter proof gate is ready.",
    tone: selectedFieldProofReady ? "warn" : "blocked",
  }
}
