export type ConditionalL3ScenarioRouteId =
  | "owner-access"
  | "daily-command"
  | "work-operation"
  | "source-to-work"
  | "research-to-decision"
  | "chamber-opportunity"
  | "high-risk-review"
  | "agent-command"
  | "admin-manual-ops"

export type ConditionalL3ScenarioMode =
  | "formal_proof_blocked"
  | "protected_read_only"
  | "db_backed_proof_blocked"
  | "formal_readiness"
  | "ui_proposal_only"
  | "manual_ops_ready"

export type ConditionalL3ManualOpsState =
  | "not_required"
  | "owner_evidence_required"
  | "operator_setup_required"
  | "human_approval_required"

export type ConditionalL3ScenarioSafety = {
  routeHandlerAdded: false
  serverActionAdded: false
  schemaChanged: false
  readsDatabase: false
  writesDatabase: false
  providerCallAdded: false
  publicOutputExpanded: false
  highRiskFinalWriteEnabled: false
  autonomousExecutionEnabled: false
  directDatabaseAccessByExternalAgents: false
  externalRegisterable: false
}

export type ConditionalL3ManualOpsHandoff = {
  state: ConditionalL3ManualOpsState
  blocker: string
  commandOrReview: string
  evidenceTarget: string
  passSignal: string
}

export type ConditionalL3AgentProposalPath = {
  surface: string
  mode: "none" | "readiness_only" | "dry_run" | "proposal_only" | "human_review_required"
  allowedOutput: string
  blockedOutput: string
  registryState: "not_applicable" | "internal_only_external_blocked"
}

export type ConditionalL3AuditProofPath = {
  currentProof: string
  futureAuditFamily: string
  ownerHandoff: string
  noSecretBoundary: string
}

export type ConditionalL3ScenarioRoute = {
  taskId: "L3-SCENARIO-001"
  routeId: ConditionalL3ScenarioRouteId
  label: string
  currentMode: ConditionalL3ScenarioMode
  trigger: string
  actor: string
  entrySurface: string
  dataSource: string
  actionPath: string
  agentProposal: ConditionalL3AgentProposalPath
  output: string
  auditProof: ConditionalL3AuditProofPath
  nextTask: string
  manualOps: ConditionalL3ManualOpsHandoff
  scenarioStrength: string
  missingCriticalForC2: readonly string[]
  sourceRefs: readonly string[]
  safety: ConditionalL3ScenarioSafety
}

const STATIC_SCENARIO_SAFETY = {
  routeHandlerAdded: false,
  serverActionAdded: false,
  schemaChanged: false,
  readsDatabase: false,
  writesDatabase: false,
  providerCallAdded: false,
  publicOutputExpanded: false,
  highRiskFinalWriteEnabled: false,
  autonomousExecutionEnabled: false,
  directDatabaseAccessByExternalAgents: false,
  externalRegisterable: false,
} as const satisfies ConditionalL3ScenarioSafety

const L3_SCENARIO_SHARED_REFS = [
  "docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md",
  "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  "src/lib/contracts/conditional-l3-interface-matrix.contract.ts",
] as const

export const CONDITIONAL_L3_REQUIRED_SCENARIO_ROUTE_IDS = [
  "owner-access",
  "daily-command",
  "work-operation",
  "source-to-work",
  "research-to-decision",
  "chamber-opportunity",
  "high-risk-review",
  "agent-command",
  "admin-manual-ops",
] as const satisfies readonly ConditionalL3ScenarioRouteId[]

export const CONDITIONAL_L3_SCENARIO_ROUTE_MAP = [
  {
    taskId: "L3-SCENARIO-001",
    routeId: "owner-access",
    label: "Owner access",
    currentMode: "formal_proof_blocked",
    trigger: "Owner opens the public root or is redirected from a protected route.",
    actor: "Owner",
    entrySurface: "/ -> /login -> /auth/status -> /dashboard",
    dataSource: "Owner access readiness, auth proof packet, launch proof packet, and profile mapping status.",
    actionPath:
      "Start Supabase access when public config exists, or explicitly use local mock mode for development rehearsal.",
    agentProposal: {
      surface: "none before owner access",
      mode: "none",
      allowedOutput: "No agent proposal is available before the owner reaches protected routes.",
      blockedOutput: "No public agent command, external registration, or private data package is exposed.",
      registryState: "not_applicable",
    },
    output: "A protected dashboard session or an owner-run AUTH-005 proof packet with pass/fail signals.",
    auditProof: {
      currentProof: "pnpm auth:proof and pnpm launch:proof packets.",
      futureAuditFamily: "auth.session",
      ownerHandoff: "Owner must provide signed-in /auth/status evidence before formal L1.",
      noSecretBoundary: "No cookies, tokens, raw claims, Supabase values, or profile IDs are exposed.",
    },
    nextTask: "AUTH-005",
    manualOps: {
      state: "owner_evidence_required",
      blocker: "Supabase public env and signed-in /auth/status evidence are missing.",
      commandOrReview: "pnpm auth:proof -- --status-json <sanitized-auth-status.json>",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      passSignal: "proofSummary.canRunAuth005 is true.",
    },
    scenarioStrength: "The access path is visible and protected, while the real-session proof remains honest.",
    missingCriticalForC2: [],
    sourceRefs: [...L3_SCENARIO_SHARED_REFS, "src/app/(auth)/login/page.tsx", "src/app/auth/status/route.ts"],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "daily-command",
    label: "Daily command",
    currentMode: "protected_read_only",
    trigger: "Owner starts the day or returns after context switching.",
    actor: "Owner",
    entrySurface: "/dashboard",
    dataSource: "DailyCommandCenterContract, ScenarioJourneyContract, OwnerEvidenceConsoleContract, and loop state.",
    actionPath: "Choose the next concrete action across auth proof, Work proof, AI Input, agents, admin, or real-data gates.",
    agentProposal: {
      surface: "/agents handoff from dashboard action queue",
      mode: "readiness_only",
      allowedOutput: "Point the owner to dry-run agent commands and proposal-only work.",
      blockedOutput: "No autonomous execution or hidden write path is enabled from the daily queue.",
      registryState: "internal_only_external_blocked",
    },
    output: "One owner-visible next action with blocker, route, linked task, and boundary text.",
    auditProof: {
      currentProof: "pnpm owner:evidence:check and protected dashboard source checks.",
      futureAuditFamily: "admin.operator",
      ownerHandoff: "Owner can inspect /dashboard directly; formal launch remains proof-gated.",
      noSecretBoundary: "No raw proof bodies, private IDs, database URLs, or provider payloads are shown.",
    },
    nextTask: "L3-ARCH-001",
    manualOps: {
      state: "not_required",
      blocker: "No extra setup is needed to inspect the protected local scenario queue.",
      commandOrReview: "Open /dashboard in the local app after auth/mock access.",
      evidenceTarget: "Owner visual review notes.",
      passSignal: "Dashboard action rows route to existing proof, module, agent, or admin surfaces.",
    },
    scenarioStrength: "The daily route already ties protected UI to owner action selection.",
    missingCriticalForC2: [],
    sourceRefs: [...L3_SCENARIO_SHARED_REFS, "src/app/(dashboard)/dashboard/page.tsx"],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "work-operation",
    label: "Work operation",
    currentMode: "db_backed_proof_blocked",
    trigger: "Owner needs to capture or review a project, task, note, deliverable, or client-safe status.",
    actor: "Owner / WorkAgent",
    entrySurface: "/work -> /work/[projectId]",
    dataSource: "Work server actions, project service, Prisma Work models, and Work proof target readiness.",
    actionPath:
      "Use the Work list/detail surface for project operation, then run proof only against an approved disposable target.",
    agentProposal: {
      surface: "/agents and Work agent proposal surfaces",
      mode: "proposal_only",
      allowedOutput: "Draft Work suggestions or dry-run operation summaries for owner review.",
      blockedOutput: "No agent final write, external agent DB access, or public client expansion is enabled.",
      registryState: "internal_only_external_blocked",
    },
    output: "Owner-owned Work state in the protected app, plus WORK-009 proof packet when a safe target exists.",
    auditProof: {
      currentProof: "pnpm work:proof-target:check, pnpm work:proof:docker-disposable, and Work source smoke checks.",
      futureAuditFamily: "work.mutation",
      ownerHandoff: "Owner/operator must provide a safe local, Docker, or disposable proof DB target.",
      noSecretBoundary: "No database URL, host, row ID, or valuable data detail is printed by proof helpers.",
    },
    nextTask: "WORK-009",
    manualOps: {
      state: "operator_setup_required",
      blocker: "Safe Work proof target and write confirmations are missing.",
      commandOrReview: "pnpm work:proof-target:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-work-proof-target.json",
      passSignal: "status is ready_for_work_009.",
    },
    scenarioStrength: "Work is the strongest DB-backed operating module and has a safe proof path.",
    missingCriticalForC2: [],
    sourceRefs: [
      ...L3_SCENARIO_SHARED_REFS,
      "src/app/(dashboard)/work/page.tsx",
      "src/app/actions/work.ts",
      "src/lib/services/project.service.ts",
    ],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "source-to-work",
    label: "Source to Work",
    currentMode: "formal_readiness",
    trigger: "Owner captures source material that may become a Work task, research object, or module write intent.",
    actor: "Owner / AI Input Agent",
    entrySurface: "/ai-input -> /dashboard action queue -> Work or review boundary",
    dataSource:
      "AI Input formal readiness, source workflow split contracts, source control matrix, and proposal-action boundary.",
    actionPath: "Capture or triage source material, then keep proposed ModuleWriteIntent output under owner review.",
    agentProposal: {
      surface: "AI Input workbench",
      mode: "proposal_only",
      allowedOutput: "Source classification, data-unit proposal, and Work write-intent proposal for owner review.",
      blockedOutput: "No connector runtime, provider sync, OCR/transcription, DB persistence, or module final write.",
      registryState: "internal_only_external_blocked",
    },
    output: "Formal readiness or proposal packet, not a hidden persisted source workflow row.",
    auditProof: {
      currentProof: "pnpm ai-input:split:check and pnpm ai-input:source-control:check.",
      futureAuditFamily: "ai-input.source-workflow",
      ownerHandoff: "Persistence requires DATTR-024 approval, migration review, audit storage, and proof target.",
      noSecretBoundary: "No connector tokens, provider payloads, private source records, or external fetch output.",
    },
    nextTask: "DATTR-024",
    manualOps: {
      state: "human_approval_required",
      blocker: "AI Input persistence and connector runtime require migration, audit, and connector approval.",
      commandOrReview: "pnpm ai-input:split:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-ai-input-split-proof.json",
      passSignal: "Split contract remains ready and no hidden mock fallback appears in formal mode.",
    },
    scenarioStrength: "Source workflow can be rehearsed as formal readiness without unsafe persistence.",
    missingCriticalForC2: [],
    sourceRefs: [...L3_SCENARIO_SHARED_REFS, "src/app/(dashboard)/ai-input/page.tsx"],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "research-to-decision",
    label: "Research to decision",
    currentMode: "ui_proposal_only",
    trigger: "Owner finds a research idea, source, event, person, or writing direction that should drive a decision.",
    actor: "Owner / ResearchAgent",
    entrySurface: "/research -> Work or Company proposal boundary",
    dataSource: "Research UI state, research PRD, real-data migration matrix, and future Research BFF contract.",
    actionPath: "Inspect research object context, decide whether it becomes writing, Work, or strategy input.",
    agentProposal: {
      surface: "future ResearchAgent workspace",
      mode: "proposal_only",
      allowedOutput: "Decision draft, citation summary, Work handoff proposal, or strategy proposal.",
      blockedOutput: "No Research DB write or Company final strategy write without reviewed schema and approval.",
      registryState: "internal_only_external_blocked",
    },
    output: "A protected decision/proposal route that names the missing real-data slice.",
    auditProof: {
      currentProof: "pnpm module:realdata:check maps Research to BFF/auth/audit stop conditions.",
      futureAuditFamily: "research.proposal",
      ownerHandoff: "Owner review decides whether Research becomes Work or Company input.",
      noSecretBoundary: "No raw private research source, citation payload, or strategy data is made public.",
    },
    nextTask: "REALDATA-001",
    manualOps: {
      state: "human_approval_required",
      blocker: "Research persistence and Company handoff need reviewed data model and approval boundary.",
      commandOrReview: "pnpm module:realdata:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-realdata-proof.json",
      passSignal: "Research row keeps BFF/auth/audit/stop-condition mapping explicit.",
    },
    scenarioStrength: "The route captures the PRD-level research-to-work/company transformation without unsafe writes.",
    missingCriticalForC2: [],
    sourceRefs: [...L3_SCENARIO_SHARED_REFS, "src/app/(dashboard)/research/page.tsx"],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "chamber-opportunity",
    label: "Chamber opportunity",
    currentMode: "ui_proposal_only",
    trigger: "Owner meets a chamber contact, finds a warm introduction, or needs to follow up on an opportunity.",
    actor: "Owner / ChamberAgent",
    entrySurface: "/chamber -> Work or client action handoff",
    dataSource: "Chamber operating shell, CRM proposal docs, and real-data migration matrix.",
    actionPath: "Track contact/opportunity context, prepare introduction or follow-up, and route client/work actions.",
    agentProposal: {
      surface: "Chamber agent proposal panel",
      mode: "proposal_only",
      allowedOutput: "Draft introduction, follow-up, or opportunity summary for owner review.",
      blockedOutput: "No shared partner write, public output, or CRM final write without authz/audit approval.",
      registryState: "internal_only_external_blocked",
    },
    output: "Relationship opportunity proposal with next Work/client handoff, still protected owner-only.",
    auditProof: {
      currentProof: "pnpm module:realdata:check and interface smoke coverage for Chamber shell.",
      futureAuditFamily: "chamber.relationship",
      ownerHandoff: "Owner approves any shared relationship note or external introduction.",
      noSecretBoundary: "Private relationship insight does not appear in public output.",
    },
    nextTask: "REALDATA-001",
    manualOps: {
      state: "human_approval_required",
      blocker: "Chamber CRM persistence and shared partner visibility require authz and approval design.",
      commandOrReview: "Owner review of Chamber proposal-only route.",
      evidenceTarget: "Owner UI review notes.",
      passSignal: "Chamber route separates private insight, shared note, and Work/client handoff.",
    },
    scenarioStrength: "The relationship route preserves the PRD warm-introduction job while blocking unsafe sharing.",
    missingCriticalForC2: [],
    sourceRefs: [...L3_SCENARIO_SHARED_REFS, "src/app/(dashboard)/chamber/page.tsx"],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "high-risk-review",
    label: "High-risk review",
    currentMode: "ui_proposal_only",
    trigger: "Owner needs to handle finance, life, company strategy, public output, or auth/permission-sensitive work.",
    actor: "Owner / high-risk module agents",
    entrySurface: "/finance, /life, /company, /client/[token], /settings, or /admin",
    dataSource: "High-risk module shells, Manual Ops gate, real-data matrix, audit storage review, and approval policy.",
    actionPath: "Review proposal-only output, then stop before final write or public exposure until approval and proof exist.",
    agentProposal: {
      surface: "module agent proposal areas",
      mode: "human_review_required",
      allowedOutput: "Draft, summary, checklist, or proposed write intent.",
      blockedOutput: "No final finance/life/company/client/auth/public/external-agent write.",
      registryState: "internal_only_external_blocked",
    },
    output: "Human-reviewed proposal or explicit blocked state.",
    auditProof: {
      currentProof: "pnpm audit:storage-review:check and pnpm launch:manual-ops.",
      futureAuditFamily: "high-risk.proposal",
      ownerHandoff: "Human approval is required before any final write or public output expansion.",
      noSecretBoundary: "No client tokens, finance details, health details, company strategy, or auth secrets are exposed.",
    },
    nextTask: "L3-ARCH-001",
    manualOps: {
      state: "human_approval_required",
      blocker: "High-risk final writes require explicit owner approval, authz, audit, and proof target.",
      commandOrReview: "Owner approval review before selecting any high-risk write task.",
      evidenceTarget: "Future approval packet.",
      passSignal: "Approval packet names scope, rollback, audit, and proof target.",
    },
    scenarioStrength: "The route makes high-risk work usable as proposals without pretending writes are safe.",
    missingCriticalForC2: [],
    sourceRefs: [
      ...L3_SCENARIO_SHARED_REFS,
      "src/app/(dashboard)/finance/page.tsx",
      "src/app/(dashboard)/life/page.tsx",
      "src/app/(dashboard)/company/page.tsx",
    ],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "agent-command",
    label: "Agent command",
    currentMode: "protected_read_only",
    trigger: "Owner wants to instruct one agent or a group of agents to prepare work.",
    actor: "Owner / Agent Team OS",
    entrySurface: "/agents -> protected dry-run API -> CLI/check evidence",
    dataSource: "Agent command catalog, protected agent operation API, command center, and internal bus contracts.",
    actionPath: "Select a dry-run command, inspect validation/safety output, and route proposals for owner review.",
    agentProposal: {
      surface: "/agents command center",
      mode: "dry_run",
      allowedOutput: "Dry-run payload, validation result, proposal text, and next-review recommendation.",
      blockedOutput: "No execute mode, DB write, provider call, public endpoint, or external registration.",
      registryState: "internal_only_external_blocked",
    },
    output: "Protected no-secret dry-run proof and proposal boundary.",
    auditProof: {
      currentProof: "pnpm agent:command-center:check, pnpm agent:api:check, pnpm agent:commands:check, and pnpm agent:bus:check.",
      futureAuditFamily: "agent.operation",
      ownerHandoff: "Owner approves any proposal before a module write task is selected.",
      noSecretBoundary: "No provider secret, private DB row, external registry write, or raw context package is exposed.",
    },
    nextTask: "AGENT-013",
    manualOps: {
      state: "human_approval_required",
      blocker: "External agent collaboration remains blocked until endpoint, auth, scopes, trust, rollback, and approval pass.",
      commandOrReview: "pnpm agent:command-center:check",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-agent-command-center.json",
      passSignal: "status is protected_owner_module_readiness_matrix_ready.",
    },
    scenarioStrength: "The owner can command agents internally while external collaboration remains safely disabled.",
    missingCriticalForC2: [],
    sourceRefs: [
      ...L3_SCENARIO_SHARED_REFS,
      "src/app/(dashboard)/agents/page.tsx",
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    ],
    safety: STATIC_SCENARIO_SAFETY,
  },
  {
    taskId: "L3-SCENARIO-001",
    routeId: "admin-manual-ops",
    label: "Admin and Manual Ops",
    currentMode: "manual_ops_ready",
    trigger: "Owner/operator needs to know why the launch level cannot upgrade and what to run next.",
    actor: "Owner / Operator",
    entrySurface: "/admin or /settings -> launch history/actions/backend/audit/manual ops rows",
    dataSource: "Launch proof, Manual Ops gate, owner evidence console, launch actions, backend ops, and audit review gates.",
    actionPath: "Inspect blockers, choose the exact owner-run proof or conditional L3 follow-up, then keep formal claims honest.",
    agentProposal: {
      surface: "admin/settings readiness and agent evidence rows",
      mode: "readiness_only",
      allowedOutput: "Recommended next task, proof command, blocker classification, and approval requirement.",
      blockedOutput: "No web UI shell command execution, deployment mutation, DB mutation, or external registry write.",
      registryState: "internal_only_external_blocked",
    },
    output: "Manual Ops row or next loop route that does not claim formal L1/L3/L4.",
    auditProof: {
      currentProof: "pnpm launch:manual-ops, pnpm launch:history:check, pnpm launch:actions:check, and pnpm backend:ops:check.",
      futureAuditFamily: "admin.operator",
      ownerHandoff: "Owner/operator runs the exact proof command and inspects generated output.",
      noSecretBoundary: "No raw generated proof bodies, env values, tokens, database URLs, or provider payloads are rendered.",
    },
    nextTask: "L3-ARCH-001",
    manualOps: {
      state: "owner_evidence_required",
      blocker: "Formal launch proof still depends on auth, Work, Docker/local proof, and deployment marker evidence.",
      commandOrReview: "pnpm launch:manual-ops",
      evidenceTarget: "docs/2_agent-input/generated/agent-loop/reports/owner-manual-ops-gate.json",
      passSignal: "status is manual_ops_ready and formalLaunchLevel remains L0 until proof exists.",
    },
    scenarioStrength: "Admin/settings now route proof and product maturity without mixing Manual Ops with formal launch claims.",
    missingCriticalForC2: [],
    sourceRefs: [
      ...L3_SCENARIO_SHARED_REFS,
      "src/app/(dashboard)/admin/page.tsx",
      "src/app/(dashboard)/settings/page.tsx",
    ],
    safety: STATIC_SCENARIO_SAFETY,
  },
] as const satisfies readonly ConditionalL3ScenarioRoute[]

export const CONDITIONAL_L3_SCENARIO_ROUTE_MAP_SUMMARY = {
  taskId: "L3-SCENARIO-001",
  status: "C2_SCENARIO_ROUTES_READY",
  formalLaunchLevelUnchanged: "L0_LOCAL_PROTOTYPE",
  prerequisiteConditionalProductMaturity: "C1_INTERFACE_MATRIX_READY",
  conditionalManualOpsLevel: "M1_MANUAL_OPS_READY",
  routeCount: CONDITIONAL_L3_SCENARIO_ROUTE_MAP.length,
  requiredRouteCount: CONDITIONAL_L3_REQUIRED_SCENARIO_ROUTE_IDS.length,
  missingCriticalRouteCount: CONDITIONAL_L3_SCENARIO_ROUTE_MAP.filter(
    (row) => row.missingCriticalForC2.length > 0
  ).length,
  ownerEvidenceRequiredCount: CONDITIONAL_L3_SCENARIO_ROUTE_MAP.filter(
    (row) => row.manualOps.state === "owner_evidence_required"
  ).length,
  humanApprovalRequiredCount: CONDITIONAL_L3_SCENARIO_ROUTE_MAP.filter(
    (row) => row.manualOps.state === "human_approval_required"
  ).length,
  requiredFormalLaunchEvidence: ["AUTH-005", "WORK-009", "WORK-007", "DEPLOY-002"] as const,
  noSecretBoundary: true,
  publicOutputExpanded: false,
  routeHandlerAdded: false,
  serverActionAdded: false,
  schemaChanged: false,
  readsDatabase: false,
  writesDatabase: false,
  providerCallAdded: false,
  highRiskFinalWriteEnabled: false,
  autonomousExecutionEnabled: false,
  directDatabaseAccessByExternalAgents: false,
  externalRegisterable: false,
  nextTasks: ["L3-ARCH-001", "AUTH-005", "WORK-009", "DEPLOY-002"] as const,
  sourceBasis: [
    "RES-005 scenario layer viewframe",
    "RES-001 three-loop scenario-lens research cadence",
    "RES-002 SaaS/OS scenario operating surface standard",
    "SCENARIO-001 and SCENARIO-002 protected scenario surfaces",
    "Manual Ops owner-run evidence handoff",
  ] as const,
} as const
