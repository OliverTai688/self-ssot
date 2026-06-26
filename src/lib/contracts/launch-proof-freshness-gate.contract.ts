export type LaunchProofFreshnessFamily =
  | "launch"
  | "auth"
  | "workTarget"
  | "preemption"
  | "ownerPlan"

export type LaunchProofFreshnessStatus =
  | "ready_for_fresh_proof_routing"
  | "proof_refresh_required"
  | "failed"

export type LaunchProofFreshnessRequirement = {
  family: LaunchProofFreshnessFamily
  evidenceLabel: string
  filePattern: string
  requiredForLoop: "current_loop"
  refreshCommand: string
  passSignal: string
  stopCondition: string
}

export type LaunchProofFreshnessGateContract = {
  id: "ENV-004-LAUNCH-PROOF-FRESHNESS-GATE"
  command: "pnpm launch:freshness:check"
  mode: "static_no_secret_freshness_gate"
  requiredOrder: readonly LaunchProofFreshnessFamily[]
  requirements: readonly LaunchProofFreshnessRequirement[]
  prohibitedExposure: readonly string[]
  blockedClaims: readonly string[]
}

export const LAUNCH_PROOF_FRESHNESS_GATE_COMMAND = "pnpm launch:freshness:check" as const

export const LAUNCH_PROOF_FRESHNESS_REQUIRED_ORDER = [
  "launch",
  "auth",
  "workTarget",
  "preemption",
  "ownerPlan",
] as const satisfies readonly LaunchProofFreshnessFamily[]

export const LAUNCH_PROOF_FRESHNESS_PROHIBITED_EXPOSURE = [
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw auth claims",
  "raw provider payloads",
  "profile IDs",
  "actual profile email values",
  "raw generated packet bodies",
] as const

export const LAUNCH_PROOF_FRESHNESS_BLOCKED_CLAIMS = [
  "AUTH-005 success",
  "WORK-009 success",
  "WORK-007 success",
  "DEPLOY-002 success",
  "L1 launch upgrade",
  "L3 launch upgrade",
  "L4 launch upgrade",
] as const

export const LAUNCH_PROOF_FRESHNESS_GATE_CONTRACT: LaunchProofFreshnessGateContract = {
  id: "ENV-004-LAUNCH-PROOF-FRESHNESS-GATE",
  command: LAUNCH_PROOF_FRESHNESS_GATE_COMMAND,
  mode: "static_no_secret_freshness_gate",
  requiredOrder: LAUNCH_PROOF_FRESHNESS_REQUIRED_ORDER,
  prohibitedExposure: LAUNCH_PROOF_FRESHNESS_PROHIBITED_EXPOSURE,
  blockedClaims: LAUNCH_PROOF_FRESHNESS_BLOCKED_CLAIMS,
  requirements: [
    {
      family: "launch",
      evidenceLabel: "latest launch proof packet",
      filePattern: "launch-proof.json",
      requiredForLoop: "current_loop",
      refreshCommand:
        "pnpm launch:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-launch-proof.json",
      passSignal: "A current-loop launch-proof.json packet exists and is parseable.",
      stopCondition: "Do not paste Supabase values, deployment secrets, or provider payloads into evidence.",
    },
    {
      family: "auth",
      evidenceLabel: "latest auth proof packet",
      filePattern: "auth-proof.json",
      requiredForLoop: "current_loop",
      refreshCommand:
        "pnpm auth:proof -- --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-auth-proof.json",
      passSignal: "A current-loop auth-proof.json packet exists and is parseable.",
      stopCondition: "Do not include cookies, tokens, raw claims, provider payloads, or actual email values.",
    },
    {
      family: "workTarget",
      evidenceLabel: "latest Work proof target readiness packet",
      filePattern: "work-proof-target-readiness.json",
      requiredForLoop: "current_loop",
      refreshCommand:
        "pnpm work:proof-target:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-work-proof-target-readiness.json",
      passSignal: "A current-loop work-proof-target-readiness.json packet exists and is parseable.",
      stopCondition: "Do not use a valuable production or client database as a proof target.",
    },
    {
      family: "preemption",
      evidenceLabel: "latest launch proof preemption router packet",
      filePattern: "launch-preemption-router.json",
      requiredForLoop: "current_loop",
      refreshCommand:
        "pnpm launch:preempt:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-launch-preemption-router.json",
      passSignal: "A current-loop launch-preemption-router.json packet exists after launch/auth/Work target refresh.",
      stopCondition: "Do not route from stale launch/auth/Work target packets.",
    },
    {
      family: "ownerPlan",
      evidenceLabel: "latest launch owner proof plan packet",
      filePattern: "launch-owner-proof-plan.json",
      requiredForLoop: "current_loop",
      refreshCommand:
        "pnpm launch:owner-plan:check -- --json --out docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-<loop>-20260623-launch-owner-proof-plan.json",
      passSignal: "A current-loop launch-owner-proof-plan.json packet exists after the current-loop preemption router packet.",
      stopCondition: "Do not compile owner action plans from older router packets.",
    },
  ],
}
