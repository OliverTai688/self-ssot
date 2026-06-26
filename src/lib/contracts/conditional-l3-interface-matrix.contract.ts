export type ConditionalL3SurfaceId =
  | "frontstage"
  | "login"
  | "dashboard"
  | "settings"
  | "admin"
  | "work"
  | "research"
  | "ai-input"
  | "workflow"
  | "life"
  | "finance"
  | "chamber"
  | "company"
  | "client-portal"
  | "agents"

export type ConditionalL3SurfaceKind =
  | "public_safe"
  | "public_auth_entry"
  | "protected_owner_home"
  | "protected_settings"
  | "protected_admin"
  | "protected_module"
  | "token_gated_public"
  | "protected_agent_workspace"

export type ConditionalL3CurrentMode =
  | "public_safe"
  | "auth_entry"
  | "protected_owner"
  | "db_backed_proof_blocked"
  | "ui_complete_mock"
  | "formal_readiness"
  | "fail_closed"
  | "internal_agent_readiness"

export type ConditionalL3DataState =
  | "static_public"
  | "auth_boundary"
  | "db_backed_owner_data"
  | "generated_proof_packets"
  | "mock_state"
  | "formal_contracts"
  | "token_only_fail_closed"
  | "generated_agent_manifests"

export type ConditionalL3ViewframeState =
  | "ready"
  | "prototype"
  | "formal_readiness"
  | "manual_ops"
  | "not_applicable"

export type ConditionalL3ViewframeCheckpoint = {
  state: ConditionalL3ViewframeState
  evidence: string
  gap: string
  nextTask: string
}

export type ConditionalL3InterfaceMatrixRow = {
  taskId: "L3-UI-001"
  surfaceId: ConditionalL3SurfaceId
  label: string
  route: string
  actor: string
  surfaceKind: ConditionalL3SurfaceKind
  currentMode: ConditionalL3CurrentMode
  dataState: ConditionalL3DataState
  primaryJob: string
  protectedBoundary: string
  viewframe: {
    identityMode: ConditionalL3ViewframeCheckpoint
    primaryAction: ConditionalL3ViewframeCheckpoint
    resourceOrWorkbench: ConditionalL3ViewframeCheckpoint
    commandPath: ConditionalL3ViewframeCheckpoint
    detailOrInspection: ConditionalL3ViewframeCheckpoint
    agentWorkspace: ConditionalL3ViewframeCheckpoint
    recordsOrReadiness: ConditionalL3ViewframeCheckpoint
    settingsOrBoundaries: ConditionalL3ViewframeCheckpoint
    stateLabel: ConditionalL3ViewframeCheckpoint
    mobileDesktop: ConditionalL3ViewframeCheckpoint
    noSecretBoundary: ConditionalL3ViewframeCheckpoint
  }
  currentStrength: string
  missingCriticalForConditionalL3: readonly string[]
  nextTask: string
  sourceRefs: readonly string[]
}

const L3_UI_SHARED_REFS = [
  "docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md",
  "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
  "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  "scripts/check-interface-operability.mjs",
] as const

const READY_MOBILE_SECRET = {
  mobileDesktop: {
    state: "ready",
    evidence: "Existing responsive dashboard/module shell is covered by interface smoke source checks.",
    gap: "Browser visual proof remains owner-run evidence.",
    nextTask: "OWNER-UI-REVIEW",
  },
  noSecretBoundary: {
    state: "ready",
    evidence: "No raw secrets, tokens, cookies, database URLs, or provider payloads are surfaced in the UI contract.",
    gap: "Formal launch still needs owner-collected auth, Work, and deployment evidence.",
    nextTask: "AUTH-005",
  },
} as const

export const CONDITIONAL_L3_REQUIRED_SURFACE_IDS = [
  "frontstage",
  "login",
  "dashboard",
  "settings",
  "admin",
  "work",
  "research",
  "ai-input",
  "workflow",
  "life",
  "finance",
  "chamber",
  "company",
  "client-portal",
  "agents",
] as const satisfies readonly ConditionalL3SurfaceId[]

export const CONDITIONAL_L3_INTERFACE_MATRIX = [
  {
    taskId: "L3-UI-001",
    surfaceId: "frontstage",
    label: "Frontstage",
    route: "/",
    actor: "visitor or owner before sign-in",
    surfaceKind: "public_safe",
    currentMode: "public_safe",
    dataState: "static_public",
    primaryJob: "Explain Personal OS value and route the owner to the protected operating system.",
    protectedBoundary: "Public-safe only; no private module data, client data, or proof payloads.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "First viewport identifies Personal OS and keeps the public state clear.",
        gap: "No launch-level proof is implied by marketing copy.",
        nextTask: "L3-SCENARIO-001",
      },
      primaryAction: {
        state: "ready",
        evidence: "Primary route to owner access exists through login/onboarding entry.",
        gap: "Owner-run route proof is still separate.",
        nextTask: "AUTH-005",
      },
      resourceOrWorkbench: {
        state: "not_applicable",
        evidence: "Public frontstage is not the owner workbench.",
        gap: "Protected dashboard carries the resource/workbench role.",
        nextTask: "L3-SCENARIO-001",
      },
      commandPath: {
        state: "ready",
        evidence: "The only safe public command is to enter the owner access path.",
        gap: "No public operations are exposed.",
        nextTask: "AUTH-005",
      },
      detailOrInspection: {
        state: "not_applicable",
        evidence: "Private detail inspection is intentionally absent on public frontstage.",
        gap: "Protected routes must carry private inspection.",
        nextTask: "L3-SCENARIO-001",
      },
      agentWorkspace: {
        state: "not_applicable",
        evidence: "No public agent workspace is exposed.",
        gap: "External agent registration remains disabled.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "not_applicable",
        evidence: "Public page does not render private records or proof history.",
        gap: "Owner proof history stays under protected routes.",
        nextTask: "OWNER-EVIDENCE-001",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Public/private boundary is explicit by routing into auth.",
        gap: "Formal claim still needs auth/session evidence.",
        nextTask: "AUTH-005",
      },
      stateLabel: {
        state: "ready",
        evidence: "Public-safe state is clear.",
        gap: "Does not represent DB readiness.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Clear public entry with no private data exposure.",
    missingCriticalForConditionalL3: [],
    nextTask: "L3-SCENARIO-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/page.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "login",
    label: "Owner Login",
    route: "/login",
    actor: "owner",
    surfaceKind: "public_auth_entry",
    currentMode: "auth_entry",
    dataState: "auth_boundary",
    primaryJob: "Let the owner choose Supabase access or explicit local mock access.",
    protectedBoundary: "Public-safe auth readiness only; no session claims or private IDs are printed.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Owner access readiness names Supabase and explicit dev mock modes.",
        gap: "Signed-in Supabase proof remains owner-run.",
        nextTask: "AUTH-005",
      },
      primaryAction: {
        state: "ready",
        evidence: "Owner can start auth path or local mock rehearsal when explicitly enabled.",
        gap: "Auth provider mutation remains outside the UI.",
        nextTask: "AUTH-005",
      },
      resourceOrWorkbench: {
        state: "not_applicable",
        evidence: "Login is an access boundary, not the operating workbench.",
        gap: "Dashboard carries the post-login workbench.",
        nextTask: "L3-SCENARIO-001",
      },
      commandPath: {
        state: "ready",
        evidence: "Readiness commands and pass/fail signals are surfaced without executing shell commands.",
        gap: "Owner still runs commands locally.",
        nextTask: "OWNER-MANUAL-OPS",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Auth readiness rows expose status, blocker, and next path.",
        gap: "No raw auth claim inspection appears in public UI.",
        nextTask: "AUTH-005",
      },
      agentWorkspace: {
        state: "not_applicable",
        evidence: "No agent operation is available before owner access.",
        gap: "Protected /agents carries agent operations.",
        nextTask: "AGENT-016",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Readiness status is visible as owner-run proof guidance.",
        gap: "No persisted auth audit rows exist yet.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Explicit dev mock and Supabase boundaries are separated.",
        gap: "Formal launch still requires signed-in /auth/status evidence.",
        nextTask: "AUTH-005",
      },
      stateLabel: {
        state: "ready",
        evidence: "Auth entry state is public-safe and not a launch claim.",
        gap: "Formal level stays L0 without owner evidence.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Owner access state is inspectable before private routes are opened.",
    missingCriticalForConditionalL3: [],
    nextTask: "AUTH-005",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(auth)/login/page.tsx", "src/lib/contracts/owner-access-readiness.contract.ts"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "dashboard",
    label: "Owner Dashboard",
    route: "/dashboard",
    actor: "owner",
    surfaceKind: "protected_owner_home",
    currentMode: "protected_owner",
    dataState: "generated_proof_packets",
    primaryJob: "Give the owner a command center for launch evidence, module entry, and next proof actions.",
    protectedBoundary: "Protected owner shell; no raw proof packet bodies or secret values are rendered.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Protected dashboard identifies owner operating state and proof readiness.",
        gap: "Formal session proof still needs owner run.",
        nextTask: "AUTH-005",
      },
      primaryAction: {
        state: "ready",
        evidence: "Owner evidence console shows the next commands and pass/fail signals.",
        gap: "UI does not execute commands.",
        nextTask: "OWNER-EVIDENCE-001",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "Dashboard acts as owner resource index and evidence workbench.",
        gap: "Scenario route map still needs a machine-checkable contract.",
        nextTask: "L3-SCENARIO-001",
      },
      commandPath: {
        state: "ready",
        evidence: "Launch/auth/Work/interface/deploy commands are visible as owner-run steps.",
        gap: "Remaining proof is delegated to manual ops.",
        nextTask: "OWNER-MANUAL-OPS",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Readiness rows expose blocker, target, and pass/fail signal.",
        gap: "No persisted audit detail drawer yet.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "prototype",
        evidence: "Dashboard links into agent readiness rather than embedding agent operations.",
        gap: "Scenario flow should route agent command jobs explicitly.",
        nextTask: "L3-SCENARIO-001",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Launch history and owner evidence summaries are visible through protected surfaces.",
        gap: "Persisted audit storage remains review-only.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Settings/admin handoffs are visible from the owner surface.",
        gap: "Formal launch level remains L0.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Manual Ops and proof-blocked states are differentiated.",
        gap: "Conditional product maturity needs architecture gate next.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Protected owner workbench exposes next actions instead of hiding proof blockers.",
    missingCriticalForConditionalL3: [],
    nextTask: "L3-SCENARIO-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/dashboard/page.tsx", "src/lib/services/admin-readiness.service.ts"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "settings",
    label: "Member Settings",
    route: "/settings",
    actor: "owner",
    surfaceKind: "protected_settings",
    currentMode: "protected_owner",
    dataState: "generated_proof_packets",
    primaryJob: "Review owner settings, auth boundaries, module permissions, and launch controls.",
    protectedBoundary: "Protected owner/admin only; command execution and provider mutation are excluded.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Settings names auth mode, permission source, and operator controls.",
        gap: "Real Supabase session evidence remains owner-run.",
        nextTask: "AUTH-005",
      },
      primaryAction: {
        state: "ready",
        evidence: "Owner can inspect evidence, permission, backend, and source-workflow controls.",
        gap: "No final high-risk writes are enabled.",
        nextTask: "L3-SCENARIO-001",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "Settings aggregates account, module, backend, and AI Input readiness resources.",
        gap: "Architecture gate must make conditional levels machine-checkable.",
        nextTask: "L3-ARCH-001",
      },
      commandPath: {
        state: "ready",
        evidence: "Owner-run commands are listed as terminal actions only.",
        gap: "UI-side execution remains intentionally absent.",
        nextTask: "OWNER-MANUAL-OPS",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Backend operations and readiness rows include detailed boundaries.",
        gap: "Persisted audit details are still future work.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "formal_readiness",
        evidence: "Agent protocol readiness is visible as protected owner/admin status.",
        gap: "External registration is blocked.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Launch history, owner evidence, AI Input readiness, and backend catalog summaries are present.",
        gap: "Manual proof must still be collected by the owner.",
        nextTask: "OWNER-EVIDENCE-001",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Settings is the primary boundary surface.",
        gap: "No provider or DB mutation from settings.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Manual Ops, blocked, ready, and formal-readiness states are labeled.",
        gap: "C1 is conditional, not formal L3.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Member settings already carries owner-control, backend, auth, and readiness boundaries.",
    missingCriticalForConditionalL3: [],
    nextTask: "L3-ARCH-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/settings/page.tsx", "src/lib/services/admin-readiness.service.ts"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "admin",
    label: "Admin",
    route: "/admin",
    actor: "owner as operator",
    surfaceKind: "protected_admin",
    currentMode: "protected_owner",
    dataState: "generated_proof_packets",
    primaryJob: "Operate launch readiness, backend catalog, permissions, and manual proof review.",
    protectedBoundary: "Protected admin view only; no shell command execution, provider mutation, or public output expansion.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Admin identifies operator mode and current readiness level.",
        gap: "Formal launch remains blocked without owner proof.",
        nextTask: "L3-ARCH-001",
      },
      primaryAction: {
        state: "ready",
        evidence: "Admin focuses on launch readiness, backend operations, module permissions, and owner actions.",
        gap: "No direct command execution from UI.",
        nextTask: "OWNER-MANUAL-OPS",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "Backend operation catalog and evidence rows create a dense operator workbench.",
        gap: "Scenario route map can connect these rows to actor journeys.",
        nextTask: "L3-SCENARIO-001",
      },
      commandPath: {
        state: "ready",
        evidence: "Each operation row has verification command and stop condition.",
        gap: "Execution remains terminal/manual.",
        nextTask: "OWNER-MANUAL-OPS",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Operation rows expose auth/data/audit/retry boundaries.",
        gap: "No persisted operator audit read model yet.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "formal_readiness",
        evidence: "Agent protocol and operation readiness are represented in protected admin context.",
        gap: "External registration remains human-approval blocked.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Admin reads generated proof and launch readiness artifacts.",
        gap: "Proof prerequisites are not present.",
        nextTask: "AUTH-005",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Admin page names no-secret, no-execution, and approval boundaries.",
        gap: "Final writes require separate approvals.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Operator statuses separate ready, blocked, manual, and approval-required states.",
        gap: "C1 does not claim L1 or L3.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Admin surface is dense and operator-focused enough for conditional L3 interface review.",
    missingCriticalForConditionalL3: [],
    nextTask: "L3-SCENARIO-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/admin/page.tsx", "src/lib/contracts/backend-operation-catalog.contract.ts"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "work",
    label: "Work",
    route: "/work",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "db_backed_proof_blocked",
    dataState: "db_backed_owner_data",
    primaryJob: "Manage project records, tasks, notes, deliverables, and Work proof readiness.",
    protectedBoundary: "requireUser plus project owner authorization; proof writes need safe target approval.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Work route is protected and identifies DB-backed operating state.",
        gap: "Browser persistence proof still needs safe target.",
        nextTask: "WORK-009",
      },
      primaryAction: {
        state: "ready",
        evidence: "Work supports project and task operations through DB-backed actions.",
        gap: "Refresh persistence proof remains uncollected.",
        nextTask: "WORK-007",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "Project list/detail workbench exists.",
        gap: "Disposable proof target remains absent.",
        nextTask: "WORK-009",
      },
      commandPath: {
        state: "manual_ops",
        evidence: "Work proof commands exist and are listed in owner evidence/manual ops.",
        gap: "Owner must provide approved local/disposable target.",
        nextTask: "WORK-009",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Project detail route supports record inspection.",
        gap: "End-to-end proof is still blocked.",
        nextTask: "WORK-007",
      },
      agentWorkspace: {
        state: "formal_readiness",
        evidence: "WorkAgent operation exists as protected dry-run/proposal command.",
        gap: "No autonomous Work writes.",
        nextTask: "AGENT-016",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Work source smoke and proof-target readiness cover records/proof split.",
        gap: "Persisted audit storage remains review-only.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Project owner authz and proof target stop conditions are documented.",
        gap: "Manual proof target needed.",
        nextTask: "WORK-009",
      },
      stateLabel: {
        state: "ready",
        evidence: "Work is labeled DB-backed but proof-blocked, not mock-complete.",
        gap: "Formal L1/L3 blocked until Work proof passes.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "The strongest runtime module, with honest proof-blocked state.",
    missingCriticalForConditionalL3: [],
    nextTask: "WORK-009",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/work/page.tsx", "src/app/(dashboard)/work/[projectId]/page.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "research",
    label: "Research",
    route: "/research",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "ui_complete_mock",
    dataState: "mock_state",
    primaryJob: "Operate research threads, sources, concepts, graph, people, events, and writing surfaces.",
    protectedBoundary: "Protected shell only; no public research output or hidden persistence.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Research route and nested tabs identify research operating mode.",
        gap: "DB-backed research BFF is future work.",
        nextTask: "RESEARCH-001",
      },
      primaryAction: {
        state: "prototype",
        evidence: "Research workbench supports issue/source/writing exploration in UI.",
        gap: "Actions are mock/state until BFF split.",
        nextTask: "RESEARCH-001",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "Research has resource tabs and detailed thread routes.",
        gap: "Persistence contract is still pending.",
        nextTask: "RESEARCH-001",
      },
      commandPath: {
        state: "prototype",
        evidence: "Research next actions exist as UI operations.",
        gap: "No server-side command path yet.",
        nextTask: "RESEARCH-001",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Thread/source/graph/writing/detail pages support inspection.",
        gap: "No persisted record audit trail.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "formal_readiness",
        evidence: "ResearchAgent operation exists in module agent command catalog.",
        gap: "No external research collaboration.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "prototype",
        evidence: "UI exposes records/readiness enough for owner rehearsal.",
        gap: "DB-backed research record state is not live.",
        nextTask: "RESEARCH-001",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Protected shell and source-output boundaries are documented.",
        gap: "Public research output remains blocked.",
        nextTask: "RESEARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Research is represented as UI-complete mock/state.",
        gap: "Conditional C1 only.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Broad research operating surface is visible even before persistence.",
    missingCriticalForConditionalL3: [],
    nextTask: "RESEARCH-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/research/page.tsx", "src/app/(dashboard)/research/[threadId]/page.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "ai-input",
    label: "AI Input",
    route: "/ai-input",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "formal_readiness",
    dataState: "formal_contracts",
    primaryJob: "Review source workflow, connector boundary, proposal actions, and formal-mode readiness.",
    protectedBoundary: "Protected owner only; connector runtime, provider calls, and final module writes remain disabled.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "AI Input names formal readiness and source workflow modes.",
        gap: "Persistence and connector runtime need approval.",
        nextTask: "DATTR-024C",
      },
      primaryAction: {
        state: "formal_readiness",
        evidence: "Owner can inspect formal source control and proposal-action boundaries.",
        gap: "No connector execution.",
        nextTask: "DATTR-024D",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "Source workflow and sync/control surfaces form the workbench.",
        gap: "Proof target remains absent.",
        nextTask: "DATTR-024C",
      },
      commandPath: {
        state: "formal_readiness",
        evidence: "Split/proof/schema/proposal checks exist as CLI proof commands.",
        gap: "Owner approval required before runtime writes.",
        nextTask: "DATTR-024C",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Formal DTO exposes unavailable/empty/readiness states.",
        gap: "No hidden mock fallback can become final data.",
        nextTask: "DATTR-024A",
      },
      agentWorkspace: {
        state: "formal_readiness",
        evidence: "IngestionAgent source workflow review exists as protected dry-run command.",
        gap: "No autonomous module writes.",
        nextTask: "AGENT-016",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Source workflow audit mapping and proof target contracts exist.",
        gap: "Persisted audit rows and source records are not live.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Connector consent and proposal-action boundaries are explicit.",
        gap: "Provider integration remains approval-gated.",
        nextTask: "DATTR-024E",
      },
      stateLabel: {
        state: "ready",
        evidence: "AI Input is labeled formal readiness, not runtime persistence.",
        gap: "Formal launch unchanged.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Best-developed formal readiness module after Work.",
    missingCriticalForConditionalL3: [],
    nextTask: "DATTR-024C",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/ai-input/page.tsx", "src/lib/services/ai-input-readiness.service.ts"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "workflow",
    label: "Workflow",
    route: "/workflow",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "ui_complete_mock",
    dataState: "mock_state",
    primaryJob: "Plan and inspect workflow rules, queues, dry-run automation, and approval boundaries.",
    protectedBoundary: "Protected shell; no autonomous execution or cross-module final writes.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Workflow route names automation/proposal mode.",
        gap: "Runtime execution remains future approval-gated work.",
        nextTask: "AUDIT-OPS-004",
      },
      primaryAction: {
        state: "prototype",
        evidence: "Workflow UI supports planning and inspection of rules/queues.",
        gap: "No persisted run engine.",
        nextTask: "WORKFLOW-001",
      },
      resourceOrWorkbench: {
        state: "prototype",
        evidence: "Workflow workbench exists as a module surface.",
        gap: "Engine/BFF contract needs future split.",
        nextTask: "WORKFLOW-001",
      },
      commandPath: {
        state: "formal_readiness",
        evidence: "WorkflowAgent operation exists as dry-run/proposal command.",
        gap: "No scheduled trigger execution.",
        nextTask: "AGENT-016",
      },
      detailOrInspection: {
        state: "prototype",
        evidence: "Rules and proposed actions can be inspected in UI.",
        gap: "No persisted run detail trail.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "formal_readiness",
        evidence: "WorkflowAgent queue and automation boundary plan is cataloged.",
        gap: "Autonomous execution blocked.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "prototype",
        evidence: "Readiness/proposal state is visible.",
        gap: "No persisted workflow run audit.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Protected shell plus stop conditions prevent final writes.",
        gap: "Approval gate needs architecture claim check.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Workflow is labeled UI/proposal state.",
        gap: "No formal runtime claim.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Usable workflow concept surface without unsafe execution.",
    missingCriticalForConditionalL3: [],
    nextTask: "WORKFLOW-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/workflow/page.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "life",
    label: "Life",
    route: "/life",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "ui_complete_mock",
    dataState: "mock_state",
    primaryJob: "Review private life context, routines, proposals, records, and high-risk write boundaries.",
    protectedBoundary: "Protected private shell; final private writes and external sharing require approval.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Life route identifies private/high-risk module mode.",
        gap: "No real private persistence yet.",
        nextTask: "LIFE-001",
      },
      primaryAction: {
        state: "prototype",
        evidence: "Life operating surface supports draft/proposal review.",
        gap: "Final writes remain blocked.",
        nextTask: "LIFE-001",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "ModuleOperatingShell provides operation, agent, records, and settings tabs.",
        gap: "No DB-backed private records.",
        nextTask: "LIFE-001",
      },
      commandPath: {
        state: "formal_readiness",
        evidence: "LifeAgent dry-run operation exists in command catalog.",
        gap: "No autonomous private writes.",
        nextTask: "AGENT-016",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Records/proposals can be reviewed in the module shell.",
        gap: "No persisted audit read model.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "ready",
        evidence: "Bounded proposal workspace is present in the module shell.",
        gap: "Agent output stays proposal-only.",
        nextTask: "AGENT-016",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Records and audit rows are visible as prototype state.",
        gap: "Real private audit storage remains approval-gated.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "High-risk and privacy boundaries are visible.",
        gap: "Human approval required before final writes.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Life is labeled mock/private/high-risk.",
        gap: "No real-data claim.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "High-risk private module is operable as bounded proposal UI.",
    missingCriticalForConditionalL3: [],
    nextTask: "LIFE-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/life/page.tsx", "src/components/layout/module-operating-shell.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "finance",
    label: "Finance",
    route: "/finance",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "ui_complete_mock",
    dataState: "mock_state",
    primaryJob: "Review finance records, draft proposals, audit rows, and approval-only final-write boundaries.",
    protectedBoundary: "Protected finance shell; final financial writes require explicit human approval.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Finance route identifies high-risk financial mode.",
        gap: "No DB-backed financial records.",
        nextTask: "FINANCE-001",
      },
      primaryAction: {
        state: "prototype",
        evidence: "Finance operating surface supports review/proposal actions.",
        gap: "No final financial write path.",
        nextTask: "FINANCE-001",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "ModuleOperatingShell exposes finance operation, agent, records, and settings.",
        gap: "Persistence is future work.",
        nextTask: "FINANCE-001",
      },
      commandPath: {
        state: "formal_readiness",
        evidence: "FinanceAgent draft review exists as protected dry-run command.",
        gap: "No autonomous financial action.",
        nextTask: "AGENT-016",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Finance records/proposals/audit rows can be inspected.",
        gap: "No persisted audit rows.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "ready",
        evidence: "Agent proposal workspace is visible and bounded.",
        gap: "Agent cannot finalize financial writes.",
        nextTask: "AGENT-016",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Prototype records and audit rows exist for owner rehearsal.",
        gap: "Real financial data needs schema/proof approval.",
        nextTask: "FINANCE-001",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Human approval and privacy boundaries are visible.",
        gap: "No production final-write permission.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Finance is labeled high-risk/proposal/mock.",
        gap: "Formal launch unchanged.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "High-risk financial surface is reviewable without unsafe writes.",
    missingCriticalForConditionalL3: [],
    nextTask: "FINANCE-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/finance/page.tsx", "src/components/layout/module-operating-shell.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "chamber",
    label: "Chamber",
    route: "/chamber",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "ui_complete_mock",
    dataState: "mock_state",
    primaryJob: "Manage relationship pipeline, follow-up proposals, records, and privacy boundaries.",
    protectedBoundary: "Protected relationship shell; no external messages or CRM sync are sent.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Chamber route identifies CRM/relationship proposal mode.",
        gap: "No persisted relationship source yet.",
        nextTask: "CHAMBER-001",
      },
      primaryAction: {
        state: "prototype",
        evidence: "Chamber supports relationship follow-up planning in UI.",
        gap: "No external communication action.",
        nextTask: "CHAMBER-001",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "ModuleOperatingShell exposes operation, agent, records, and settings.",
        gap: "DB-backed CRM model remains future work.",
        nextTask: "CHAMBER-001",
      },
      commandPath: {
        state: "formal_readiness",
        evidence: "ChamberAgent follow-up plan exists as dry-run command.",
        gap: "No message sending or external CRM sync.",
        nextTask: "AGENT-016",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Relationship records/proposals/audit rows are inspectable.",
        gap: "No persisted CRM audit.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "ready",
        evidence: "Agent workspace is proposal-only.",
        gap: "External collaboration remains blocked.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Prototype records and audit rows exist for owner rehearsal.",
        gap: "Real CRM persistence needs schema and visibility policy.",
        nextTask: "CHAMBER-001",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Privacy and no-send boundaries are visible.",
        gap: "External communication approval remains absent.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Chamber is labeled proposal/mock.",
        gap: "No public or external output claim.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Relationship workflow can be rehearsed without sending anything externally.",
    missingCriticalForConditionalL3: [],
    nextTask: "CHAMBER-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/chamber/page.tsx", "src/components/layout/module-operating-shell.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "company",
    label: "Company",
    route: "/company",
    actor: "owner",
    surfaceKind: "protected_module",
    currentMode: "ui_complete_mock",
    dataState: "mock_state",
    primaryJob: "Review company strategy proposals, records, audit rows, and high-risk strategy boundaries.",
    protectedBoundary: "Protected strategy shell; no public strategy output or final writes.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Company route identifies strategy/high-risk proposal mode.",
        gap: "No DB-backed strategy record yet.",
        nextTask: "COMPANY-001",
      },
      primaryAction: {
        state: "prototype",
        evidence: "Company operating surface supports strategy proposal review.",
        gap: "No final strategy write path.",
        nextTask: "COMPANY-001",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "ModuleOperatingShell exposes operation, agent, records, and settings.",
        gap: "Real company data model remains future work.",
        nextTask: "COMPANY-001",
      },
      commandPath: {
        state: "formal_readiness",
        evidence: "CompanyAgent strategy proposal review exists as dry-run command.",
        gap: "No autonomous strategy change.",
        nextTask: "AGENT-016",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Company records/proposals/audit rows can be inspected.",
        gap: "No persisted strategy audit.",
        nextTask: "AUDIT-OPS-004",
      },
      agentWorkspace: {
        state: "ready",
        evidence: "Agent proposal workspace is visible and bounded.",
        gap: "External strategy sharing remains blocked.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Prototype records and audit rows support rehearsal.",
        gap: "Real-data proof and approval remain needed.",
        nextTask: "COMPANY-001",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "High-risk strategy and privacy boundaries are visible.",
        gap: "Human approval required before final writes.",
        nextTask: "L3-ARCH-001",
      },
      stateLabel: {
        state: "ready",
        evidence: "Company is labeled high-risk/proposal/mock.",
        gap: "No launch upgrade claim.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Strategy surface is operable while final writes stay blocked.",
    missingCriticalForConditionalL3: [],
    nextTask: "COMPANY-001",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/(dashboard)/company/page.tsx", "src/components/layout/module-operating-shell.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "client-portal",
    label: "Client Portal",
    route: "/client/[token]",
    actor: "external client with token",
    surfaceKind: "token_gated_public",
    currentMode: "fail_closed",
    dataState: "token_only_fail_closed",
    primaryJob: "Expose only explicitly client-visible output when a valid token path exists.",
    protectedBoundary: "Token-only public route; fail closed by default and never expose internal notes or private module data.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Client Portal route is token scoped and fail-closed.",
        gap: "Real client-token lifecycle proof remains blocked.",
        nextTask: "CLIENT-007",
      },
      primaryAction: {
        state: "formal_readiness",
        evidence: "Primary safe action is to render only approved client-visible artifacts.",
        gap: "Owner token rotate/revoke actions need approval.",
        nextTask: "CLIENT-005",
      },
      resourceOrWorkbench: {
        state: "not_applicable",
        evidence: "External client route is not an owner workbench.",
        gap: "Protected admin/settings carry token management.",
        nextTask: "CLIENT-005",
      },
      commandPath: {
        state: "not_applicable",
        evidence: "No external client command path is exposed.",
        gap: "Future client actions need separate PRD/auth approval.",
        nextTask: "CLIENT-005",
      },
      detailOrInspection: {
        state: "formal_readiness",
        evidence: "Gated loader can inspect token validity and explicit visibility.",
        gap: "No real token smoke yet.",
        nextTask: "CLIENT-007",
      },
      agentWorkspace: {
        state: "not_applicable",
        evidence: "No external client agent workspace is exposed.",
        gap: "ClientPortalAgent remains protected dry-run only.",
        nextTask: "AGENT-013",
      },
      recordsOrReadiness: {
        state: "formal_readiness",
        evidence: "Fail-closed containment is covered by interface smoke.",
        gap: "Token lifecycle audit storage remains future work.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "Public/private boundary and notFound fail-closed behavior are explicit.",
        gap: "Owner token management actions remain blocked.",
        nextTask: "CLIENT-005",
      },
      stateLabel: {
        state: "ready",
        evidence: "Client Portal state is fail-closed, not launched public portal.",
        gap: "No public launch claim.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Public surface is present but intentionally safe and closed without approved token evidence.",
    missingCriticalForConditionalL3: [],
    nextTask: "CLIENT-005",
    sourceRefs: [...L3_UI_SHARED_REFS, "src/app/client/[token]/page.tsx"],
  },
  {
    taskId: "L3-UI-001",
    surfaceId: "agents",
    label: "Agent Team OS",
    route: "/agents",
    actor: "owner directing one or more internal agents",
    surfaceKind: "protected_agent_workspace",
    currentMode: "internal_agent_readiness",
    dataState: "generated_agent_manifests",
    primaryJob: "Operate protected agent command center, per-module readiness, dry-run API proof, and group instruction paths.",
    protectedBoundary: "Protected owner/admin only; external registration, direct DB access by external agents, and autonomous execution are disabled.",
    viewframe: {
      identityMode: {
        state: "ready",
        evidence: "Agent Team OS identifies internal runtime, provider, protocol, and external registration boundaries.",
        gap: "External registration approval remains blocked.",
        nextTask: "AGENT-013",
      },
      primaryAction: {
        state: "ready",
        evidence: "Owner can draft single-agent or group-agent bounded instructions and dry-run operations.",
        gap: "No execute mode or final writes.",
        nextTask: "AGENT-016",
      },
      resourceOrWorkbench: {
        state: "ready",
        evidence: "Command center, module readiness rows, catalog, and bus form an agent workbench.",
        gap: "Persisted agent run audit is not live.",
        nextTask: "AUDIT-OPS-004",
      },
      commandPath: {
        state: "ready",
        evidence: "CLI and protected HTTP dry-run paths are documented and checked.",
        gap: "External API/registry remains approval-gated.",
        nextTask: "AGENT-013",
      },
      detailOrInspection: {
        state: "ready",
        evidence: "Agent readiness rows expose operation id, payload, risk, approval, and blocked writes.",
        gap: "No external trace exchange.",
        nextTask: "AGENT-013",
      },
      agentWorkspace: {
        state: "ready",
        evidence: "This is the primary protected agent workspace.",
        gap: "Only dry-run/proposal outcomes are allowed.",
        nextTask: "AGENT-016",
      },
      recordsOrReadiness: {
        state: "ready",
        evidence: "Agent readiness, command catalog, bus, API, and proof panel are visible.",
        gap: "Persisted audit and external collaboration remain future work.",
        nextTask: "AUDIT-OPS-004",
      },
      settingsOrBoundaries: {
        state: "ready",
        evidence: "externalRegisterable: false and directDatabaseAccessByExternalAgents: false are explicit.",
        gap: "Human approval required before NANDA/A2A/MCP sharing.",
        nextTask: "AGENT-013",
      },
      stateLabel: {
        state: "ready",
        evidence: "Agent workspace states are labeled protected/internal/dry-run.",
        gap: "No external registration claim.",
        nextTask: "L3-ARCH-001",
      },
      ...READY_MOBILE_SECRET,
    },
    currentStrength: "Agent operation surface is the clearest internal collaboration layer.",
    missingCriticalForConditionalL3: [],
    nextTask: "AGENT-013",
    sourceRefs: [
      ...L3_UI_SHARED_REFS,
      "src/app/(dashboard)/agents/page.tsx",
      "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
    ],
  },
] as const satisfies readonly ConditionalL3InterfaceMatrixRow[]

export const CONDITIONAL_L3_INTERFACE_MATRIX_SUMMARY = {
  taskId: "L3-UI-001",
  status: "C1_INTERFACE_MATRIX_READY",
  formalLaunchLevelUnchanged: "L0_LOCAL_PROTOTYPE",
  conditionalManualOpsLevel: "M1_MANUAL_OPS_READY",
  requiredFormalLaunchEvidence: ["AUTH-005", "WORK-009", "WORK-007", "DEPLOY-002"] as const,
  surfaceCount: CONDITIONAL_L3_INTERFACE_MATRIX.length,
  requiredSurfaceCount: CONDITIONAL_L3_REQUIRED_SURFACE_IDS.length,
  missingCriticalSurfaceCount: CONDITIONAL_L3_INTERFACE_MATRIX.filter(
    (row) => row.missingCriticalForConditionalL3.length > 0
  ).length,
  readyOrAcceptedViewframeStateCount: CONDITIONAL_L3_INTERFACE_MATRIX.reduce((count, row) => {
    const states = Object.values(row.viewframe).map((checkpoint) => checkpoint.state)
    return count + states.filter((state) => state !== "manual_ops").length
  }, 0),
  manualOpsViewframeStateCount: CONDITIONAL_L3_INTERFACE_MATRIX.reduce((count, row) => {
    const states = Object.values(row.viewframe).map((checkpoint) => checkpoint.state)
    return count + states.filter((state) => state === "manual_ops").length
  }, 0),
  noSecretBoundary: true,
  publicOutputExpanded: false,
  routeHandlerAdded: false,
  serverActionAdded: false,
  schemaChanged: false,
  readsDatabase: false,
  writesDatabase: false,
  providerCallAdded: false,
  autonomousExecutionEnabled: false,
  directDatabaseAccessByExternalAgents: false,
  externalRegisterable: false,
  nextTasks: ["L3-SCENARIO-001", "L3-ARCH-001", "AUTH-005", "WORK-009", "DEPLOY-002"] as const,
  sourceBasis: [
    "RES-005 interface layer viewframe",
    "RES-002 SaaS/OS operating surface standard",
    "INTERFACE-002 smoke harness",
    "Manual Ops owner-run evidence handoff",
  ] as const,
} as const
