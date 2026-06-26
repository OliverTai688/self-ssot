export type LaunchOperatorActionId =
  | "launch.proof"
  | "auth.session-proof"
  | "work.target-readiness"
  | "work.docker-disposable"
  | "deploy.marker-proof"
  | "owner.ui-review"
  | "client.token-lifecycle-approval"
  | "ai-input.persistence-approval"
  | "agent.external-registration-approval";

export type LaunchOperatorActionState =
  | "ready"
  | "owner_run"
  | "dry_run_only"
  | "approval_required"
  | "blocked"
  | "unavailable";

export type LaunchOperatorActionMode =
  | "read_only"
  | "dry_run"
  | "owner_run"
  | "approval_required"
  | "blocked";

export type LaunchOperatorActionRisk = "low" | "medium" | "high";

export type LaunchOperatorAction = {
  readonly id: LaunchOperatorActionId;
  readonly priority: number;
  readonly area: string;
  readonly label: string;
  readonly actor: string;
  readonly surface: "admin" | "settings" | "dashboard" | "cli" | "external";
  readonly state: LaunchOperatorActionState;
  readonly mode: LaunchOperatorActionMode;
  readonly command: string;
  readonly evidenceTarget: string;
  readonly passSignal: string;
  readonly failSignal: string;
  readonly blocker: string;
  readonly nextAction: string;
  readonly linkedTasks: readonly string[];
  readonly risk: LaunchOperatorActionRisk;
  readonly writesDatabase: boolean;
  readonly mutatesExternalProvider: boolean;
  readonly exposesPublicOutput: boolean;
  readonly requiresHumanApproval: boolean;
  readonly noSecretBoundary: string;
};

export type LaunchOperatorActionRegistryContract = {
  readonly id: "ADMIN-OPS-002";
  readonly status: "read_only_active";
  readonly generatedAt: string;
  readonly sharedBy: readonly ["admin", "settings"];
  readonly source: typeof LAUNCH_OPERATOR_ACTION_REGISTRY_SOURCE;
  readonly summary: {
    readonly actionCount: number;
    readonly readyCount: number;
    readonly ownerRunCount: number;
    readonly dryRunOnlyCount: number;
    readonly approvalRequiredCount: number;
    readonly blockedCount: number;
    readonly highRiskCount: number;
    readonly primaryBlocker: string;
    readonly nextTask: string;
  };
  readonly requiredActionIds: typeof LAUNCH_OPERATOR_ACTION_REQUIRED_IDS;
  readonly prohibitedExposure: typeof LAUNCH_OPERATOR_ACTION_PROHIBITED_EXPOSURE;
  readonly rows: readonly LaunchOperatorAction[];
};

export const LAUNCH_OPERATOR_ACTION_REQUIRED_IDS = [
  "launch.proof",
  "auth.session-proof",
  "work.target-readiness",
  "work.docker-disposable",
  "deploy.marker-proof",
  "owner.ui-review",
  "client.token-lifecycle-approval",
  "ai-input.persistence-approval",
  "agent.external-registration-approval",
] as const satisfies readonly LaunchOperatorActionId[];

export const LAUNCH_OPERATOR_ACTION_REGISTRY_SOURCE = {
  acceptanceTask: "ADMIN-OPS-002",
  launchProofCommand: "pnpm launch:proof",
  authProofCommand: "pnpm auth:proof",
  workProofTargetCommand: "pnpm work:proof-target:check",
  dockerWorkProofCommand: "pnpm work:proof:docker-disposable",
  operatorActionCheckCommand: "pnpm launch:actions:check",
  referenceDocs: [
    "docs/07_research-and-design/RES-001_next-thirty-loop-maturity-research.md",
    "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    "docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-84-20260622-launch-readiness-history.md",
    "docs/2_agent-input/generated/agent-loop/reports/personal-os-loop-86-20260622-work-proof-docker-disposable.md",
  ],
} as const;

export const LAUNCH_OPERATOR_ACTION_PROHIBITED_EXPOSURE = [
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw auth claims",
  "provider payloads",
  "profile IDs",
  "row IDs",
  "raw generated report payload bodies",
  "deployment provider credentials",
  "client share tokens",
  "external registry writes",
] as const;
