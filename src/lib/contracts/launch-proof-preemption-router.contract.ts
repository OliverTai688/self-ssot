export type LaunchProofPreemptionCandidateId =
  | "AUTH-005"
  | "WORK-009"
  | "DEPLOY-002"
  | "RES-001-RESEARCH-REVIEW";

export type LaunchProofPreemptionState =
  | "ready_to_run"
  | "blocked_by_owner_input"
  | "blocked_downstream"
  | "fallback_research";

export type LaunchProofPreemptionCandidate = {
  readonly id: LaunchProofPreemptionCandidateId;
  readonly label: string;
  readonly state: LaunchProofPreemptionState;
  readonly evidenceSource: string;
  readonly readySignal: string;
  readonly blockedSignal: string;
  readonly nextAction: string;
  readonly ownerInputRequired: readonly string[];
  readonly safetyBoundary: string;
};

export type LaunchProofPreemptionRouterContract = {
  readonly id: "LAUNCH-ROUTER-001-PROOF-PREEMPTION-ROUTER";
  readonly status: "static_no_secret_router_contract";
  readonly purpose: string;
  readonly command: typeof LAUNCH_PROOF_PREEMPTION_ROUTER_COMMAND;
  readonly sourceEvidence: typeof LAUNCH_PROOF_PREEMPTION_ROUTER_SOURCE_EVIDENCE;
  readonly decisionOrder: readonly LaunchProofPreemptionCandidateId[];
  readonly candidates: readonly LaunchProofPreemptionCandidate[];
  readonly prohibitedExposure: typeof LAUNCH_PROOF_PREEMPTION_ROUTER_PROHIBITED_EXPOSURE;
  readonly blockedClaims: typeof LAUNCH_PROOF_PREEMPTION_ROUTER_BLOCKED_CLAIMS;
};

export const LAUNCH_PROOF_PREEMPTION_ROUTER_COMMAND =
  "pnpm launch:preempt:check" as const;

export const LAUNCH_PROOF_PREEMPTION_ROUTER_SOURCE_EVIDENCE = {
  reportsDirectory: "docs/2_agent-input/generated/agent-loop/reports",
  launchProofPattern: "*-launch-proof.json",
  authProofPattern: "*-auth-proof.json",
  workTargetReadinessPattern: "*-work-proof-target-readiness.json",
  workEvidencePattern: "*-work-proof-evidence-check.json",
  manualOpsPattern: "*-manual-ops-gate.json",
  sourceCommands: [
    "pnpm launch:proof",
    "pnpm auth:proof",
    "pnpm work:proof-target:check",
    "pnpm work:proof-evidence:check",
    "pnpm launch:manual-ops",
  ],
} as const;

export const LAUNCH_PROOF_PREEMPTION_ROUTER_PROHIBITED_EXPOSURE = [
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw auth claims",
  "raw provider payloads",
  "profile IDs",
  "row IDs",
  "raw generated report payload bodies",
  "deployment provider credentials",
  "external registry writes",
] as const;

export const LAUNCH_PROOF_PREEMPTION_ROUTER_BLOCKED_CLAIMS = [
  "AUTH-005 success",
  "WORK-009 success",
  "WORK-007 success",
  "DEPLOY-002 success",
  "L1 launch upgrade",
  "L3 launch upgrade",
  "L4 launch upgrade",
] as const;

export const LAUNCH_PROOF_PREEMPTION_ROUTER_CONTRACT = {
  id: "LAUNCH-ROUTER-001-PROOF-PREEMPTION-ROUTER",
  status: "static_no_secret_router_contract",
  purpose:
    "Read latest generated launch/auth/Work/Manual Ops proof packets and select the next proof-preemption task without rerunning browser, provider, DB, deployment, or write operations.",
  command: LAUNCH_PROOF_PREEMPTION_ROUTER_COMMAND,
  sourceEvidence: LAUNCH_PROOF_PREEMPTION_ROUTER_SOURCE_EVIDENCE,
  decisionOrder: ["AUTH-005", "WORK-009", "DEPLOY-002", "RES-001-RESEARCH-REVIEW"],
  candidates: [
    {
      id: "AUTH-005",
      label: "Real Supabase owner session/Profile proof",
      state: "blocked_by_owner_input",
      evidenceSource: "latest auth proof packet",
      readySignal: "proofSummary.canRunAuth005=true",
      blockedSignal: "Supabase public env or signed-in /auth/status evidence missing",
      nextAction:
        "Run pnpm auth:proof with sanitized signed-in /auth/status JSON after Supabase public env is configured.",
      ownerInputRequired: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "signed-in /auth/status sanitized JSON evidence",
      ],
      safetyBoundary: "No auth provider mutation, cookie/token capture, raw claims, or profile IDs.",
    },
    {
      id: "WORK-009",
      label: "Disposable Work refresh proof",
      state: "blocked_by_owner_input",
      evidenceSource: "latest Work proof target readiness or Work proof evidence packet",
      readySignal: "canRunWork009=true",
      blockedSignal: "Proof DB target or explicit write confirmations missing",
      nextAction:
        "Provide a safe proof target and run pnpm work:proof-target:check before pnpm work:proof -- --run.",
      ownerInputRequired: [
        "WORK_PROOF_DATABASE_URL",
        "PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1",
        "PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA",
      ],
      safetyBoundary: "No DB connection or write during router checks; remote proof targets require explicit approval.",
    },
    {
      id: "DEPLOY-002",
      label: "Deployment marker and private route proof",
      state: "blocked_downstream",
      evidenceSource: "latest launch proof packet",
      readySignal: "auth and Work proof gates are ready, then deployment marker proof can be evaluated",
      blockedSignal: "Deployment proof remains downstream of AUTH-005 and WORK-009/WORK-007",
      nextAction:
        "Run launch proof in the deployed environment after auth/session and Work proof evidence exist.",
      ownerInputRequired: ["VERCEL_ENV or equivalent deployment marker evidence"],
      safetyBoundary: "No deployment provider mutation, env write, or public route expansion.",
    },
    {
      id: "RES-001-RESEARCH-REVIEW",
      label: "Research-to-task fallback",
      state: "fallback_research",
      evidenceSource: "latest proof router decision",
      readySignal: "AUTH-005, WORK-009, and DEPLOY-002 are not ready to preempt",
      blockedSignal: "Owner/operator inputs are still absent",
      nextAction:
        "Run the due RES-001/RES-002 review and select a non-adjacent implementation or proof-router slice.",
      ownerInputRequired: [],
      safetyBoundary: "No launch-level upgrade claim; research must produce an executable artifact.",
    },
  ],
  prohibitedExposure: LAUNCH_PROOF_PREEMPTION_ROUTER_PROHIBITED_EXPOSURE,
  blockedClaims: LAUNCH_PROOF_PREEMPTION_ROUTER_BLOCKED_CLAIMS,
} as const satisfies LaunchProofPreemptionRouterContract;
