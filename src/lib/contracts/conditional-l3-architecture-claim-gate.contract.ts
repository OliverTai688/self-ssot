export type ConditionalL3ArchitectureGateId =
  | "interface-viewframe"
  | "scenario-route-map"
  | "formal-launch-proof"
  | "manual-ops-handoff"
  | "bff-api-cli-boundary"
  | "auth-permission-boundary"
  | "persistence-boundary"
  | "audit-observability-boundary"
  | "agent-protocol-boundary"
  | "public-output-boundary"
  | "deployment-boundary"
  | "owner-review-boundary"

export type ConditionalL3ArchitectureGateState =
  | "ready"
  | "manual_ops_ready"
  | "formal_proof_required"
  | "approval_required"
  | "owner_review_required"

export type ConditionalL3ArchitectureManualOpsState =
  | "not_required"
  | "owner_evidence_required"
  | "operator_setup_required"
  | "human_approval_required"
  | "owner_visual_review_required"

export type ConditionalL3ArchitectureSafety = {
  routeHandlerAdded: false
  serverActionAdded: false
  schemaChanged: false
  readsDatabase: false
  writesDatabase: false
  providerCallAdded: false
  publicOutputExpanded: false
  formalLaunchLevelMutated: false
  highRiskFinalWriteEnabled: false
  autonomousExecutionEnabled: false
  directDatabaseAccessByExternalAgents: false
  externalRegisterable: false
}

export type ConditionalL3ArchitectureManualOpsHandoff = {
  state: ConditionalL3ArchitectureManualOpsState
  blocker: string
  commandOrReview: string
  evidenceTarget: string
  passSignal: string
}

export type ConditionalL3ArchitectureClaimGateRow = {
  taskId: "L3-ARCH-001"
  gateId: ConditionalL3ArchitectureGateId
  label: string
  state: ConditionalL3ArchitectureGateState
  architectureBoundary: string
  currentEvidence: readonly string[]
  requiredForConditionalC3: boolean
  blocksConditionalC3: boolean
  blocksFormalLaunchClaim: boolean
  blocksConditionalFullExperience: boolean
  formalLaunchEffect: "no_formal_upgrade" | "formal_upgrade_blocked_until_owner_evidence"
  conditionalProductEffect: "counts_for_c3" | "delegated_manual_ops_for_c3" | "owner_review_before_c_l3"
  manualOps: ConditionalL3ArchitectureManualOpsHandoff
  nextTask: string
  sourceRefs: readonly string[]
  safety: ConditionalL3ArchitectureSafety
}

const STATIC_ARCHITECTURE_SAFETY = {
  routeHandlerAdded: false,
  serverActionAdded: false,
  schemaChanged: false,
  readsDatabase: false,
  writesDatabase: false,
  providerCallAdded: false,
  publicOutputExpanded: false,
  formalLaunchLevelMutated: false,
  highRiskFinalWriteEnabled: false,
  autonomousExecutionEnabled: false,
  directDatabaseAccessByExternalAgents: false,
  externalRegisterable: false,
} as const satisfies ConditionalL3ArchitectureSafety

const L3_ARCH_SHARED_REFS = [
  "docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  "src/lib/contracts/conditional-l3-interface-matrix.contract.ts",
  "src/lib/contracts/conditional-l3-scenario-route-map.contract.ts",
] as const

export const CONDITIONAL_L3_REQUIRED_ARCHITECTURE_GATE_IDS = [
  "interface-viewframe",
  "scenario-route-map",
  "formal-launch-proof",
  "manual-ops-handoff",
  "bff-api-cli-boundary",
  "auth-permission-boundary",
  "persistence-boundary",
  "audit-observability-boundary",
  "agent-protocol-boundary",
  "public-output-boundary",
  "deployment-boundary",
  "owner-review-boundary",
] as const satisfies readonly ConditionalL3ArchitectureGateId[]

export const CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE = [
  {
    taskId: "L3-ARCH-001",
    gateId: "interface-viewframe",
    label: "Conditional interface viewframe",
    state: "ready",
    architectureBoundary: "C1 is a static interface matrix proof over existing route files, not a runtime launch claim.",
    currentEvidence: ["pnpm l3:interface:check", "pnpm interface:smoke:check"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: false,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "no_formal_upgrade",
    conditionalProductEffect: "counts_for_c3",
    manualOps: {
      state: "not_required",
      blocker: "No additional setup is needed for the static interface viewframe gate.",
      commandOrReview: "pnpm l3:interface:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-l3-interface-check.json",
      passSignal: "status is conditional_l3_interface_matrix_ready.",
    },
    nextTask: "L3-SCENARIO-001",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "scripts/check-conditional-l3-interface-matrix.mjs"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "scenario-route-map",
    label: "Conditional scenario route map",
    state: "ready",
    architectureBoundary: "C2 is a trigger-to-proof scenario route map, not browser E2E, persistence, or deployment proof.",
    currentEvidence: ["pnpm l3:scenario:check", "pnpm owner:evidence:check", "pnpm launch:actions:check"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: false,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "no_formal_upgrade",
    conditionalProductEffect: "counts_for_c3",
    manualOps: {
      state: "not_required",
      blocker: "No additional setup is needed for the static scenario route-map gate.",
      commandOrReview: "pnpm l3:scenario:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-l3-scenario-check.json",
      passSignal: "status is conditional_l3_scenario_routes_ready.",
    },
    nextTask: "L3-ARCH-001",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "scripts/check-conditional-l3-scenario-route-map.mjs"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "formal-launch-proof",
    label: "Formal launch proof",
    state: "formal_proof_required",
    architectureBoundary:
      "Formal L1/L3/L4 claims require owner/operator evidence for auth, Work proof, and deployment; conditional C3 cannot mutate launchLevels.current.",
    currentEvidence: ["pnpm launch:proof", "pnpm auth:proof", "pnpm work:proof-target:check"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: true,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "formal_upgrade_blocked_until_owner_evidence",
    conditionalProductEffect: "delegated_manual_ops_for_c3",
    manualOps: {
      state: "owner_evidence_required",
      blocker: "Supabase public env, signed-in /auth/status evidence, safe Work proof target, and deployment marker are absent.",
      commandOrReview: "pnpm launch:manual-ops",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-manual-ops-gate.json",
      passSignal: "status is manual_ops_ready and formalLaunchLevel remains L0 until proof exists.",
    },
    nextTask: "AUTH-005",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "scripts/check-manual-ops-launch-gate.mjs", "scripts/collect-launch-proof.mjs"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "manual-ops-handoff",
    label: "Manual Ops handoff",
    state: "manual_ops_ready",
    architectureBoundary:
      "Manual Ops converts missing owner/operator setup into exact commands and pass/fail signals without upgrading formal launch.",
    currentEvidence: ["pnpm launch:manual-ops", "protected owner evidence console", "protected launch operator actions"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: true,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "formal_upgrade_blocked_until_owner_evidence",
    conditionalProductEffect: "delegated_manual_ops_for_c3",
    manualOps: {
      state: "owner_evidence_required",
      blocker: "Owner/operator evidence is delegated, not assumed.",
      commandOrReview: "pnpm launch:manual-ops",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-manual-ops-gate.json",
      passSignal: "Manual Ops rows include Auth, Work, database/Docker, and deployment handoffs.",
    },
    nextTask: "OWNER-MANUAL-OPS",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "src/lib/services/admin-readiness.service.ts"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "bff-api-cli-boundary",
    label: "BFF, API, and CLI boundary",
    state: "ready",
    architectureBoundary:
      "Visible operations must map to BFF, route/server-action, service, dry-run CLI, or protected HTTP boundaries before writes expand.",
    currentEvidence: ["pnpm backend:ops:check", "pnpm agent:commands:check", "pnpm agent:api:check"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: false,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "no_formal_upgrade",
    conditionalProductEffect: "counts_for_c3",
    manualOps: {
      state: "not_required",
      blocker: "Static operation catalogs and protected dry-run contracts exist.",
      commandOrReview: "pnpm backend:ops:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-backend-ops-check.json",
      passSignal: "status is ready_for_backend_operation_catalog_use.",
    },
    nextTask: "BACKEND-OPS-002",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "src/lib/contracts/backend-operation-catalog.contract.ts"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "auth-permission-boundary",
    label: "Auth and permission boundary",
    state: "formal_proof_required",
    architectureBoundary:
      "Protected routes and service-layer authorization exist, but real Supabase owner Profile mapping proof is still owner-run.",
    currentEvidence: ["pnpm auth:proof", "pnpm auth:boundary", "owner access readiness"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: true,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "formal_upgrade_blocked_until_owner_evidence",
    conditionalProductEffect: "delegated_manual_ops_for_c3",
    manualOps: {
      state: "owner_evidence_required",
      blocker: "Signed-in Supabase /auth/status evidence is missing.",
      commandOrReview:
        "pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/manual-auth-status-YYYYMMDD.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      passSignal: "proofSummary.canRunAuth005=true and proofSummary.canProceedToWork007=true.",
    },
    nextTask: "AUTH-005",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "persistence-boundary",
    label: "Persistence and real-data boundary",
    state: "manual_ops_ready",
    architectureBoundary:
      "Work is DB-backed but proof-blocked; non-Work modules remain mock, formal-readiness, proposal-only, or high-risk-gated until selected real-data slices pass.",
    currentEvidence: ["pnpm work:source:check", "pnpm module:realdata:check", "pnpm work:proof-target:check"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: true,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "formal_upgrade_blocked_until_owner_evidence",
    conditionalProductEffect: "delegated_manual_ops_for_c3",
    manualOps: {
      state: "operator_setup_required",
      blocker: "Safe Work proof target and write confirmations are missing.",
      commandOrReview: "pnpm work:proof-target:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-work-proof-target-readiness.json",
      passSignal: "status is ready_for_work_009 and canRunWork009=true.",
    },
    nextTask: "WORK-009",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "audit-observability-boundary",
    label: "Audit and observability boundary",
    state: "ready",
    architectureBoundary:
      "Audit event shape, event builder, readiness catalog, and storage review gate exist before persisted audit storage expands.",
    currentEvidence: ["pnpm audit:readiness:check", "pnpm audit:event-builder:check", "pnpm audit:storage-review:check"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: false,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "no_formal_upgrade",
    conditionalProductEffect: "counts_for_c3",
    manualOps: {
      state: "not_required",
      blocker: "Audit storage is intentionally review-gated, but architecture readiness is explicit.",
      commandOrReview: "pnpm audit:storage-review:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-audit-storage-review.json",
      passSignal: "status is ready_for_operating_audit_storage_review.",
    },
    nextTask: "AUDIT-OPS-004",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "agent-protocol-boundary",
    label: "Agent protocol and registration boundary",
    state: "approval_required",
    architectureBoundary:
      "Agents are internal/protected-owner, dry-run, or proposal-only. External NANDA/A2A/MCP registration remains disabled until endpoint, auth, scope, trust, rollback, public safety, and approval exist.",
    currentEvidence: ["pnpm agent:registry:check", "pnpm agent:command-center:check", "pnpm agent:bus:check"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: false,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "no_formal_upgrade",
    conditionalProductEffect: "counts_for_c3",
    manualOps: {
      state: "human_approval_required",
      blocker: "External agent sharing and registration need explicit human approval.",
      commandOrReview: "Review AGENT-013 approval package before any external adapter.",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-agent-approval-review.md",
      passSignal: "Human-approved endpoint/auth/scope/trust/rollback/public-safety packet exists.",
    },
    nextTask: "AGENT-013",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "public-output-boundary",
    label: "Public output boundary",
    state: "ready",
    architectureBoundary:
      "Frontstage is public-safe and Client Portal is token-gated/fail-closed; no conditional maturity label expands public private-data output.",
    currentEvidence: ["pnpm interface:smoke:check", "Client Portal fail-closed source boundary"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: false,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "no_formal_upgrade",
    conditionalProductEffect: "counts_for_c3",
    manualOps: {
      state: "not_required",
      blocker: "No new public output is added by the architecture claim gate.",
      commandOrReview: "pnpm interface:smoke:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-interface-smoke.json",
      passSignal: "Interface smoke keeps public/private route boundaries intact.",
    },
    nextTask: "CLIENT-007",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "docs/02_architecture-and-rules/ARC-025_client-portal-public-bff.md"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "deployment-boundary",
    label: "Deployment boundary",
    state: "formal_proof_required",
    architectureBoundary:
      "Deployment proof is downstream of auth/session and Work proof. Conditional C3 cannot claim private online launch without the deployment marker.",
    currentEvidence: ["pnpm launch:proof", "Manual Ops deployment marker row"],
    requiredForConditionalC3: true,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: true,
    blocksConditionalFullExperience: false,
    formalLaunchEffect: "formal_upgrade_blocked_until_owner_evidence",
    conditionalProductEffect: "delegated_manual_ops_for_c3",
    manualOps: {
      state: "operator_setup_required",
      blocker: "Deployment marker proof is missing.",
      commandOrReview:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-deployment-proof.json",
      passSignal: "proofSummary.canClaimL1=true in the intended launch environment.",
    },
    nextTask: "DEPLOY-002",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "docs/02_architecture-and-rules/ENV-001_launch-environment-readiness.md"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
  {
    taskId: "L3-ARCH-001",
    gateId: "owner-review-boundary",
    label: "Owner full-experience review boundary",
    state: "owner_review_required",
    architectureBoundary:
      "C-L3 conditional full experience should wait for owner visual/operability review; that review is delegated because it can be collected in one local run.",
    currentEvidence: ["OWNER-UI-REVIEW", "pnpm l3:architecture:check"],
    requiredForConditionalC3: false,
    blocksConditionalC3: false,
    blocksFormalLaunchClaim: false,
    blocksConditionalFullExperience: true,
    formalLaunchEffect: "no_formal_upgrade",
    conditionalProductEffect: "owner_review_before_c_l3",
    manualOps: {
      state: "owner_visual_review_required",
      blocker: "Owner has not yet confirmed the full protected interface feels operable end-to-end.",
      commandOrReview:
        "Run the local app, review /dashboard, /settings, /admin, /work, /ai-input, /agents, /finance, /chamber, /company, and /life.",
      evidenceTarget: "Owner visual review notes or screenshots.",
      passSignal: "Owner confirms no obvious missing operating control for the conditional full experience claim.",
    },
    nextTask: "OWNER-UI-REVIEW",
    sourceRefs: [...L3_ARCH_SHARED_REFS, "tasks.md"],
    safety: STATIC_ARCHITECTURE_SAFETY,
  },
] as const satisfies readonly ConditionalL3ArchitectureClaimGateRow[]

export const CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE_SUMMARY = {
  taskId: "L3-ARCH-001",
  status: "C3_ARCHITECTURE_GATE_READY",
  formalLaunchLevelUnchanged: "L0_LOCAL_PROTOTYPE",
  prerequisiteConditionalProductMaturity: "C2_SCENARIO_ROUTES_READY",
  conditionalManualOpsLevel: "M1_MANUAL_OPS_READY",
  conditionalProductMaturity: "C3_ARCHITECTURE_GATE_READY",
  nextConditionalProductMaturityCandidate: "C-L3_CONDITIONAL_FULL_EXPERIENCE",
  nextConditionalProductMaturityBlockedBy: ["OWNER-UI-REVIEW"] as const,
  requiredGateCount: CONDITIONAL_L3_REQUIRED_ARCHITECTURE_GATE_IDS.length,
  gateCount: CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE.length,
  blocksConditionalC3Count: CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE.filter((row) => row.blocksConditionalC3).length,
  blocksFormalLaunchClaimCount: CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE.filter((row) => row.blocksFormalLaunchClaim)
    .length,
  blocksConditionalFullExperienceCount: CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE.filter(
    (row) => row.blocksConditionalFullExperience
  ).length,
  formalLaunchClaimsAllowed: false,
  formalLaunchClaimBlockers: ["AUTH-005", "WORK-009", "WORK-007", "DEPLOY-002"] as const,
  ownerReviewRequiredBeforeConditionalFullExperience: true,
  noSecretBoundary: true,
  publicOutputExpanded: false,
  routeHandlerAdded: false,
  serverActionAdded: false,
  schemaChanged: false,
  readsDatabase: false,
  writesDatabase: false,
  providerCallAdded: false,
  formalLaunchLevelMutated: false,
  highRiskFinalWriteEnabled: false,
  autonomousExecutionEnabled: false,
  directDatabaseAccessByExternalAgents: false,
  externalRegisterable: false,
  nextTasks: ["OWNER-UI-REVIEW", "AUTH-005", "WORK-009", "DEPLOY-002"] as const,
  sourceBasis: [
    "RES-005 architecture layer viewframe",
    "RES-002 SaaS/OS BFF/API/CLI and audit operating surface standard",
    "OpenAPI contract-first lifecycle principle",
    "MCP authorization and trust boundary principle",
    "NANDA discovery, verification, coordination, and registration-readiness principle",
    "Manual Ops owner-run evidence handoff",
  ] as const,
} as const
