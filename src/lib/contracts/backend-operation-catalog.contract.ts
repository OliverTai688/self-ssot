export type BackendOperationId =
  | "launch.proof"
  | "auth.session-proof"
  | "work.target-readiness"
  | "work.docker-disposable"
  | "work.server-actions"
  | "work.source-smoke"
  | "client.portal.gated-loader"
  | "agent.operations.dry-run-api"
  | "module.resource-index-check"
  | "module.realdata-check"
  | "launch.operator-actions-check"
  | "backend.operation-catalog-check"
  | "agent.external-registration-approval"

export type BackendOperationKind =
  | "route_handler"
  | "server_action"
  | "service_loader"
  | "cli_check_command"
  | "agent_dry_run_operation"
  | "owner_run_proof_command"
  | "proposal_only_operation"
  | "blocked_high_risk_operation"

export type BackendOperationModule =
  | "Launch"
  | "Auth"
  | "Work"
  | "Client Portal"
  | "Agent Team OS"
  | "Module Surfaces"
  | "Admin"
  | "Backend"

export type BackendOperationOwnerSurface =
  | "admin"
  | "settings"
  | "dashboard"
  | "agents"
  | "login"
  | "cli"
  | "public-client"
  | "internal"

export type BackendOperationState =
  | "ready"
  | "contract_ready"
  | "protected_dry_run_ready"
  | "owner_run"
  | "dry_run_only"
  | "approval_required"
  | "blocked"

export type BackendOperationRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type BackendOperationCatalogRow = {
  readonly id: BackendOperationId
  readonly module: BackendOperationModule
  readonly ownerSurface: BackendOperationOwnerSurface
  readonly kind: BackendOperationKind
  readonly label: string
  readonly entrypoint: string
  readonly currentState: BackendOperationState
  readonly authBoundary: string
  readonly dataBoundary: string
  readonly auditNeed: string
  readonly idempotencyOrRetry: string
  readonly risk: BackendOperationRisk
  readonly verificationCommand: string
  readonly linkedTasks: readonly string[]
  readonly stopCondition: string
  readonly externalRegisterable: false
  readonly writesDatabase: boolean
  readonly exposesPublicOutput: boolean
  readonly mutatesExternalProvider: boolean
  readonly requiresHumanApproval: boolean
}

export type BackendOperationCatalogContract = {
  readonly id: "BACKEND-OPS-001"
  readonly version: "0.1.0"
  readonly status: "contract_ready"
  readonly visibility: "protected_owner_only"
  readonly generatedByLoop: "LOOP-094"
  readonly source: typeof BACKEND_OPERATION_CATALOG_SOURCE
  readonly requiredOperationIds: typeof BACKEND_OPERATION_REQUIRED_IDS
  readonly prohibitedExposure: typeof BACKEND_OPERATION_PROHIBITED_EXPOSURE
  readonly summary: {
    readonly operationCount: number
    readonly routeHandlerCount: number
    readonly serverActionCount: number
    readonly serviceLoaderCount: number
    readonly cliCheckCommandCount: number
    readonly agentDryRunCount: number
    readonly ownerRunProofCommandCount: number
    readonly proposalOnlyCount: number
    readonly blockedHighRiskCount: number
    readonly highRiskCount: number
    readonly protectedOwnerOnly: true
    readonly publicOpenApiExported: false
    readonly publicRouteAdded: false
    readonly externalRegistrationEnabled: false
    readonly nextTask: string
  }
  readonly rows: readonly BackendOperationCatalogRow[]
}

export const BACKEND_OPERATION_REQUIRED_IDS = [
  "launch.proof",
  "auth.session-proof",
  "work.target-readiness",
  "work.docker-disposable",
  "work.server-actions",
  "work.source-smoke",
  "client.portal.gated-loader",
  "agent.operations.dry-run-api",
  "module.resource-index-check",
  "module.realdata-check",
  "launch.operator-actions-check",
  "backend.operation-catalog-check",
  "agent.external-registration-approval",
] as const satisfies readonly BackendOperationId[]

export const BACKEND_OPERATION_PROHIBITED_EXPOSURE = [
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw auth claims",
  "provider payloads",
  "profile IDs",
  "row IDs",
  "raw request bodies",
  "raw response payload bodies",
  "raw generated proof bodies",
  "client share tokens",
  "deployment provider credentials",
  "external registry writes",
] as const

export const BACKEND_OPERATION_CATALOG_SOURCE = {
  acceptanceTask: "BACKEND-OPS-001",
  formalResearchReport: "docs/06_audits-and-reports/RPT-019_loop-93-research-gap-review.md",
  acceptanceDoc: "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  backlogDoc: "docs/05_execution-plans/PLN-060_task-backlog.md",
  checkerCommand: "pnpm backend:ops:check",
  referenceSources: [
    "OpenAPI Specification 3.1 operation structure: https://spec.openapis.org/oas/v3.1.0.html",
    "Next.js Route Handlers file convention: https://nextjs.org/docs/app/api-reference/file-conventions/route",
    "Stripe idempotent requests: https://docs.stripe.com/api/idempotent_requests",
    "GitHub REST API authentication and endpoint reference pattern: https://docs.github.com/rest",
    "docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md",
  ],
} as const

export const BACKEND_OPERATION_CATALOG = {
  id: "BACKEND-OPS-001",
  version: "0.1.0",
  status: "contract_ready",
  visibility: "protected_owner_only",
  generatedByLoop: "LOOP-094",
  source: BACKEND_OPERATION_CATALOG_SOURCE,
  requiredOperationIds: BACKEND_OPERATION_REQUIRED_IDS,
  prohibitedExposure: BACKEND_OPERATION_PROHIBITED_EXPOSURE,
  summary: {
    operationCount: 13,
    routeHandlerCount: 1,
    serverActionCount: 1,
    serviceLoaderCount: 1,
    cliCheckCommandCount: 6,
    agentDryRunCount: 1,
    ownerRunProofCommandCount: 2,
    proposalOnlyCount: 0,
    blockedHighRiskCount: 1,
    highRiskCount: 2,
    protectedOwnerOnly: true,
    publicOpenApiExported: false,
    publicRouteAdded: false,
    externalRegistrationEnabled: false,
    nextTask:
      "Loop 95 should run the required launch-level review, then route to AUTH-005, WORK-009, or the next shortest backend/API maturity blocker.",
  },
  rows: [
    {
      id: "launch.proof",
      module: "Launch",
      ownerSurface: "cli",
      kind: "cli_check_command",
      label: "Launch proof packet",
      entrypoint: "pnpm launch:proof",
      currentState: "owner_run",
      authBoundary:
        "No session is required to classify local launch readiness; signed-in proof remains delegated to auth.session-proof.",
      dataBoundary:
        "Outputs readiness categories and missing markers only; excludes provider values, env values, secrets, and raw proof bodies.",
      auditNeed:
        "Generated evidence report and future append-only launch proof audit event after audit storage exists.",
      idempotencyOrRetry:
        "Read-only command. Retry is safe after env/session/deployment state changes; do not infer launch level from stale blocked packets.",
      risk: "LOW",
      verificationCommand: "pnpm launch:proof -- --out <no-secret-proof.json>",
      linkedTasks: ["DEPLOY-001", "DEPLOY-002", "LOOP-095"],
      stopCondition:
        "Stop before storing Supabase public values, deployment provider values, cookies, tokens, database URLs, or raw proof packet bodies.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "auth.session-proof",
      module: "Auth",
      ownerSurface: "login",
      kind: "owner_run_proof_command",
      label: "Supabase session and Profile proof",
      entrypoint: "pnpm auth:proof",
      currentState: "blocked",
      authBoundary:
        "Requires owner-provided Supabase public env plus signed-in /auth/status evidence; checker must store only sanitized status.",
      dataBoundary:
        "Accepts sanitized status JSON only; excludes provider payloads, raw claims, cookies, tokens, profile ids, and actual owner email values.",
      auditNeed:
        "Record sanitized proof path and pass/fail only; future auth audit event after persisted audit storage exists.",
      idempotencyOrRetry:
        "Retry is safe after owner signs in or refreshes sanitized status evidence; never replay cookies or provider tokens.",
      risk: "MEDIUM",
      verificationCommand: "pnpm auth:proof -- --out <no-secret-auth-proof.json>",
      linkedTasks: ["AUTH-005", "AUTH-006", "AUTH-007"],
      stopCondition:
        "Stop if signed-in evidence is missing, unsanitized, or contains cookies, tokens, raw claims, profile ids, or provider payloads.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "work.target-readiness",
      module: "Work",
      ownerSurface: "cli",
      kind: "cli_check_command",
      label: "Work proof target readiness",
      entrypoint: "pnpm work:proof-target:check",
      currentState: "dry_run_only",
      authBoundary:
        "No app session required; target must be explicitly local or owner-approved remote disposable before any Work proof writes.",
      dataBoundary:
        "Outputs target class and missing confirmations only; redacts database URLs, hosts, passwords, row ids, and proof records.",
      auditNeed:
        "Generated readiness packet until a future Work proof audit event is approved.",
      idempotencyOrRetry:
        "Read-only preflight. Retry is safe after target and confirmation env values are intentionally supplied.",
      risk: "LOW",
      verificationCommand: "pnpm work:proof-target:check -- --out <readiness.json>",
      linkedTasks: ["WORK-009", "WORK-010"],
      stopCondition:
        "Stop before run mode if target is missing, valuable-looking, remote without approval, or write confirmation is absent.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "work.docker-disposable",
      module: "Work",
      ownerSurface: "cli",
      kind: "owner_run_proof_command",
      label: "Docker disposable Work proof runner",
      entrypoint: "pnpm work:proof:docker-disposable",
      currentState: "owner_run",
      authBoundary:
        "Runs only on an owner-controlled local Docker target and injects Work proof write confirmation into the child process.",
      dataBoundary:
        "Redacts database connection details, Docker internals, proof row ids, and generated Work record bodies.",
      auditNeed:
        "Generated Docker readiness/proof packet now; future Work proof audit event after persisted audit storage exists.",
      idempotencyOrRetry:
        "Dry-run is read-only. Run mode must create or use a proof-marker local database and clean up proof records after retry.",
      risk: "MEDIUM",
      verificationCommand:
        "pnpm work:proof:docker-disposable -- --json --out <docker-proof.json>",
      linkedTasks: ["WORK-009", "WORK-012"],
      stopCondition:
        "Stop if Docker daemon is unavailable, target is external, proof marker is missing, or cleanup cannot be verified.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "work.server-actions",
      module: "Work",
      ownerSurface: "dashboard",
      kind: "server_action",
      label: "Work project/task/note/deliverable server actions",
      entrypoint: "src/app/actions/work.ts",
      currentState: "ready",
      authBoundary:
        "Every action must run requireUser() and owner/project-scoped service authorization before reads or writes.",
      dataBoundary:
        "Server action DTOs stay behind service and mapper boundaries; Client Components receive UI-safe view models only.",
      auditNeed:
        "Future append-only operating audit event for create/update/delete and proof refresh writes.",
      idempotencyOrRetry:
        "Current UI actions are direct user actions. Future retryable writes need client request ids or idempotency keys before automation.",
      risk: "MEDIUM",
      verificationCommand: "pnpm work:source:check",
      linkedTasks: ["WORK-002", "WORK-003", "WORK-004", "WORK-005", "WORK-006", "WORK-013"],
      stopCondition:
        "Stop if actions bypass requireUser(), project owner authorization, mapper boundaries, or write against unapproved targets in proof mode.",
      externalRegisterable: false,
      writesDatabase: true,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "work.source-smoke",
      module: "Work",
      ownerSurface: "cli",
      kind: "cli_check_command",
      label: "Work DB source/static smoke checker",
      entrypoint: "pnpm work:source:check",
      currentState: "ready",
      authBoundary:
        "Static source checker only; verifies auth/service markers without creating a session or touching the database.",
      dataBoundary:
        "Reads source files and docs only; emits marker status without row data, secrets, or generated proof bodies.",
      auditNeed:
        "Generated source proof packet; no persisted audit row until AUDIT-OPS runtime storage exists.",
      idempotencyOrRetry: "Read-only command. Retry is safe after Work source edits.",
      risk: "LOW",
      verificationCommand: "pnpm work:source:check -- --out <work-source.json>",
      linkedTasks: ["WORK-013"],
      stopCondition:
        "Stop if the checker needs runtime imports, database connections, mock fallback claims, or secret-bearing file output.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "client.portal.gated-loader",
      module: "Client Portal",
      ownerSurface: "public-client",
      kind: "service_loader",
      label: "Client Portal token-gated loader",
      entrypoint: "src/lib/services/client-portal.service.ts",
      currentState: "approval_required",
      authBoundary:
        "Public route remains token-gated and fail-closed; DB-backed token lifecycle writes require explicit approval.",
      dataBoundary:
        "Public DTOs must include only client-visible records and exclude internal notes, financials, private ids, token material, and storage secrets.",
      auditNeed:
        "Token access, rotate, revoke, and public view events need append-only audit storage before expansion.",
      idempotencyOrRetry:
        "Read path must stay no-store and fail-closed. Token writes need idempotency and rollback before implementation.",
      risk: "HIGH",
      verificationCommand: "pnpm interface:smoke:check",
      linkedTasks: ["CLIENT-001", "CLIENT-005", "CLIENT-007"],
      stopCondition:
        "Stop before public payload expansion, token rotation/revoke writes, storage URL exposure, or DB token smoke without explicit approval and safe proof.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: true,
      mutatesExternalProvider: false,
      requiresHumanApproval: true,
    },
    {
      id: "agent.operations.dry-run-api",
      module: "Agent Team OS",
      ownerSurface: "agents",
      kind: "agent_dry_run_operation",
      label: "Protected agent operation dry-run API",
      entrypoint: "POST /api/agent-operations/dry-run",
      currentState: "protected_dry_run_ready",
      authBoundary:
        "Route handler must run requireUser(), owner-only authorization, dry-run mode validation, and no-store response handling.",
      dataBoundary:
        "Returns AgentOperationDryRunProof DTO only; no private records, database payloads, provider calls, external registry writes, or execute mode.",
      auditNeed:
        "Future agent.operation append-only audit event after runtime audit storage and trust policy are approved.",
      idempotencyOrRetry:
        "Dry-run is read-only. clientRequestId may label retries but must not become a database id or execute key.",
      risk: "MEDIUM",
      verificationCommand: "pnpm agent:api:check",
      linkedTasks: ["AGENT-009", "AGENT-014", "AGENT-015"],
      stopCondition:
        "Stop before execute mode, public endpoint exposure, provider calls, DB writes, external agent database access, or external registration.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "module.resource-index-check",
      module: "Module Surfaces",
      ownerSurface: "cli",
      kind: "cli_check_command",
      label: "Module resource index contract checker",
      entrypoint: "pnpm module:index:check",
      currentState: "ready",
      authBoundary:
        "Static contract checker only; future runtime resource indexes must stay protected owner-only unless token-gated explicitly.",
      dataBoundary:
        "Reads contract and docs only; verifies UI-safe view-model, no adapter secrets, and raw payload exclusions.",
      auditNeed:
        "Generated contract proof packet; future module index reads may reference operating audit events.",
      idempotencyOrRetry: "Read-only command. Retry is safe after module surface contract edits.",
      risk: "LOW",
      verificationCommand: "pnpm module:index:check",
      linkedTasks: ["SURFACE-MATURITY-003"],
      stopCondition:
        "Stop if a module index contract requires direct Client Component database imports, raw adapter payloads, or public output expansion.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "module.realdata-check",
      module: "Module Surfaces",
      ownerSurface: "cli",
      kind: "cli_check_command",
      label: "Per-module real-data migration matrix checker",
      entrypoint: "pnpm module:realdata:check",
      currentState: "ready",
      authBoundary:
        "Static contract checker only; future real-data loaders/writes must add module authorization before runtime.",
      dataBoundary:
        "Reads matrix contract and docs only; no schema writes, runtime writes, provider calls, or raw module records.",
      auditNeed:
        "Generated real-data proof packet; future module writes need append-only audit storage.",
      idempotencyOrRetry: "Read-only command. Retry is safe after data maturity contract edits.",
      risk: "LOW",
      verificationCommand: "pnpm module:realdata:check",
      linkedTasks: ["REALDATA-001"],
      stopCondition:
        "Stop before schema migration, connector runtime, high-risk final write, public output, or module persistence without approval.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "launch.operator-actions-check",
      module: "Admin",
      ownerSurface: "cli",
      kind: "cli_check_command",
      label: "Launch operator action registry checker",
      entrypoint: "pnpm launch:actions:check",
      currentState: "ready",
      authBoundary:
        "Static checker for protected admin/settings action registry; UI must never execute shell commands.",
      dataBoundary:
        "Verifies action rows and no-secret boundaries only; excludes raw proof bodies, row ids, client tokens, and external registry writes.",
      auditNeed:
        "Generated operator action proof packet; future persisted owner action events need audit storage.",
      idempotencyOrRetry: "Read-only command. Retry is safe after operator action registry edits.",
      risk: "LOW",
      verificationCommand: "pnpm launch:actions:check",
      linkedTasks: ["ADMIN-OPS-002"],
      stopCondition:
        "Stop before command execution from UI, provider mutation, public route creation, token lifecycle write, or external registration.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "backend.operation-catalog-check",
      module: "Backend",
      ownerSurface: "cli",
      kind: "cli_check_command",
      label: "Backend operation catalog checker",
      entrypoint: "pnpm backend:ops:check",
      currentState: "contract_ready",
      authBoundary:
        "Static checker for protected owner/backend operation catalog; no session, route, or provider state is required.",
      dataBoundary:
        "Reads static contract and docs only; never reads runtime env, database clients, request headers, cookies, or private records.",
      auditNeed:
        "Generated backend operation catalog proof packet; future protected admin/settings surface can render summaries only.",
      idempotencyOrRetry: "Read-only command. Retry is safe after backend operation catalog edits.",
      risk: "LOW",
      verificationCommand: "pnpm backend:ops:check",
      linkedTasks: ["BACKEND-OPS-001"],
      stopCondition:
        "Stop if the checker needs runtime imports, public OpenAPI output, secret-bearing strings, DB access, or external registry writes.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: false,
    },
    {
      id: "agent.external-registration-approval",
      module: "Agent Team OS",
      ownerSurface: "admin",
      kind: "blocked_high_risk_operation",
      label: "External agent registration approval blocker",
      entrypoint: "HUMAN_APPROVAL_REQUIRED",
      currentState: "blocked",
      authBoundary:
        "External registration requires explicit human approval after protected endpoint, auth scope, trust, rollback, deployment, and public-safety proof.",
      dataBoundary:
        "No external agent receives direct database access; future scoped context packages must exclude private records and secrets.",
      auditNeed:
        "Registration approval, rollback plan, trust attestation, and external registry write must be auditable before any live action.",
      idempotencyOrRetry:
        "No retry or registration attempt is allowed until approval exists; failed attempts must not be auto-replayed.",
      risk: "CRITICAL",
      verificationCommand: "pnpm agent:api:check",
      linkedTasks: ["AGENT-013", "ARC-028"],
      stopCondition:
        "Stop before public endpoint exposure, external NANDA/A2A/MCP registration, external collaboration runtime, or direct database access.",
      externalRegisterable: false,
      writesDatabase: false,
      exposesPublicOutput: false,
      mutatesExternalProvider: false,
      requiresHumanApproval: true,
    },
  ],
} as const satisfies BackendOperationCatalogContract

