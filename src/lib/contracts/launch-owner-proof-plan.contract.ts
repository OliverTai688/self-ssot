export type LaunchOwnerProofPlanStepId =
  | "supabase_public_env"
  | "signed_in_auth_status"
  | "work_proof_target"
  | "work_proof_run"
  | "deployment_marker"
  | "next_loop_routing"

export type LaunchOwnerProofPlanStepState =
  | "ready"
  | "blocked"
  | "blocked_downstream"
  | "manual_owner_action"

export type LaunchOwnerProofPlanStep = {
  id: LaunchOwnerProofPlanStepId
  title: string
  state: LaunchOwnerProofPlanStepState
  blockerLabels: readonly string[]
  ownerAction: string
  command: string
  evidenceTarget: string
  passSignal: string
  stopCondition: string
}

export type LaunchOwnerProofPlanContract = {
  id: "ENV-003-LAUNCH-OWNER-PROOF-PLAN"
  command: "pnpm launch:owner-plan:check"
  mode: "static_no_secret_owner_run_plan"
  sourceEvidence: readonly string[]
  steps: readonly LaunchOwnerProofPlanStep[]
  prohibitedExposure: readonly string[]
  blockedClaims: readonly string[]
}

export const LAUNCH_OWNER_PROOF_PLAN_COMMAND = "pnpm launch:owner-plan:check" as const

export const LAUNCH_OWNER_PROOF_PLAN_SOURCE_EVIDENCE = [
  "latest launch-proof.json",
  "latest auth-proof.json",
  "latest work-proof-target-readiness.json",
  "latest launch-preemption-router.json",
  "latest manual-ops-gate.json",
] as const

export const LAUNCH_OWNER_PROOF_PLAN_PROHIBITED_EXPOSURE = [
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw auth claims",
  "raw provider payloads",
  "profile IDs",
  "actual profile email values",
  "raw generated report payload bodies",
] as const

export const LAUNCH_OWNER_PROOF_PLAN_BLOCKED_CLAIMS = [
  "AUTH-005 success",
  "WORK-009 success",
  "WORK-007 success",
  "DEPLOY-002 success",
  "L1 launch upgrade",
  "L3 launch upgrade",
  "L4 launch upgrade",
] as const

export const LAUNCH_OWNER_PROOF_PLAN_CONTRACT: LaunchOwnerProofPlanContract = {
  id: "ENV-003-LAUNCH-OWNER-PROOF-PLAN",
  command: LAUNCH_OWNER_PROOF_PLAN_COMMAND,
  mode: "static_no_secret_owner_run_plan",
  sourceEvidence: LAUNCH_OWNER_PROOF_PLAN_SOURCE_EVIDENCE,
  prohibitedExposure: LAUNCH_OWNER_PROOF_PLAN_PROHIBITED_EXPOSURE,
  blockedClaims: LAUNCH_OWNER_PROOF_PLAN_BLOCKED_CLAIMS,
  steps: [
    {
      id: "supabase_public_env",
      title: "Configure Supabase public env",
      state: "manual_owner_action",
      blockerLabels: ["Supabase public URL", "Supabase publishable key"],
      ownerAction: "Configure public Supabase env in the intended local, preview, or production target.",
      command:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-proof.json",
      evidenceTarget: "latest launch-proof.json",
      passSignal: "proofSummary.blockedLabels excludes Supabase public URL and Supabase publishable key.",
      stopCondition: "Do not paste Supabase values into repo docs, generated reports, or chat.",
    },
    {
      id: "signed_in_auth_status",
      title: "Collect signed-in auth status",
      state: "manual_owner_action",
      blockerLabels: ["Auth status evidence"],
      ownerAction: "Sign in through /login, open /auth/status, save sanitized JSON, then validate it.",
      command:
        "pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/<auth-status>.json --out docs/2_agent-input/generated/agent-loop/reports/<target>-auth-proof.json",
      evidenceTarget: "latest auth-proof.json",
      passSignal: "proofSummary.canRunAuth005=true.",
      stopCondition: "Do not include cookies, tokens, raw claims, provider payloads, profile IDs, or actual email values.",
    },
    {
      id: "work_proof_target",
      title: "Prepare disposable Work proof target",
      state: "manual_owner_action",
      blockerLabels: ["WORK_PROOF_DATABASE_URL", "Work proof write confirmation"],
      ownerAction: "Choose a local/disposable proof database and set only the required proof env vars.",
      command:
        "pnpm work:proof-target:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/<target>-work-proof-target-readiness.json",
      evidenceTarget: "latest work-proof-target-readiness.json",
      passSignal: "canRunWork009=true.",
      stopCondition: "Do not use valuable production or client data as the proof target.",
    },
    {
      id: "work_proof_run",
      title: "Run disposable Work proof",
      state: "blocked_downstream",
      blockerLabels: ["Work proof target not ready"],
      ownerAction: "Run the Work proof only after target readiness says canRunWork009=true.",
      command:
        "pnpm work:proof -- --run --json --out docs/2_agent-input/generated/agent-loop/reports/<target>-work-proof.json",
      evidenceTarget: "latest work proof run packet",
      passSignal: "status=passed and cleanup.cleanup=passed.",
      stopCondition: "Stop if the target is not disposable, write confirmations are absent, or cleanup fails.",
    },
    {
      id: "deployment_marker",
      title: "Prove deployment context",
      state: "manual_owner_action",
      blockerLabels: ["Deployment marker"],
      ownerAction: "Run launch proof in the intended deployed or Vercel env-run target.",
      command:
        "vercel env run -e preview -- pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-proof.json",
      evidenceTarget: "deployed launch-proof.json",
      passSignal: "proofSummary.canClaimL1=true in the intended environment.",
      stopCondition: "Local-only launch proof must not claim final online launch.",
    },
    {
      id: "next_loop_routing",
      title: "Route the next loop",
      state: "ready",
      blockerLabels: [],
      ownerAction: "Run proof preemption routing after collecting fresh proof packets.",
      command:
        "pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/<target>-launch-preemption-router.json",
      evidenceTarget: "latest launch-preemption-router.json",
      passSignal: "recommendation.nextTask is AUTH-005, WORK-009, DEPLOY-002, or RES-001-RESEARCH-REVIEW.",
      stopCondition: "Do not claim launch upgrades from fallback routing.",
    },
  ],
}
