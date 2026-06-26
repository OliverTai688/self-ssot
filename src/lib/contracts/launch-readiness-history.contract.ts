export type LaunchReadinessHistorySurface =
  | "launch"
  | "auth"
  | "work"
  | "deployment"
  | "owner-ui"
  | "admin-ops";

export type LaunchReadinessHistoryStatus =
  | "passed"
  | "ready"
  | "blocked"
  | "owner_run"
  | "needs_operator_input"
  | "failed"
  | "not_collected"
  | "unknown";

export type LaunchReadinessHistoryTone = "good" | "warn" | "blocked" | "neutral";

export type LaunchReadinessHistorySourceKind =
  | "generated_proof"
  | "owner_handoff"
  | "contract_check"
  | "runtime_boundary";

export type LaunchReadinessHistoryRow = {
  readonly surface: LaunchReadinessHistorySurface;
  readonly label: string;
  readonly status: LaunchReadinessHistoryStatus;
  readonly tone: LaunchReadinessHistoryTone;
  readonly latestProofPath: string;
  readonly latestGeneratedAt: string;
  readonly attemptCount: number;
  readonly blockers: readonly string[];
  readonly passSignal: string;
  readonly failSignal: string;
  readonly nextAction: string;
  readonly linkedTask: string;
  readonly sourceKind: LaunchReadinessHistorySourceKind;
};

export type LaunchReadinessHistoryContract = {
  readonly id: "ADMIN-OPS-001";
  readonly status: "read_only_active";
  readonly generatedAt: string;
  readonly sharedBy: readonly ["admin", "settings"];
  readonly source: typeof LAUNCH_READINESS_HISTORY_SOURCE;
  readonly summary: {
    readonly surfaceCount: number;
    readonly readyCount: number;
    readonly blockedCount: number;
    readonly ownerRunCount: number;
    readonly latestProofCount: number;
    readonly launchLevel: string;
    readonly primaryBlocker: string;
    readonly nextTask: string;
  };
  readonly evidenceSource: {
    readonly proofDirectory: typeof LAUNCH_READINESS_HISTORY_SOURCE.proofDirectory;
    readonly latestReportPaths: readonly string[];
  };
  readonly prohibitedExposure: typeof LAUNCH_READINESS_HISTORY_PROHIBITED_EXPOSURE;
  readonly rows: readonly LaunchReadinessHistoryRow[];
};

export const LAUNCH_READINESS_HISTORY_REQUIRED_SURFACES = [
  "launch",
  "auth",
  "work",
  "deployment",
  "owner-ui",
  "admin-ops",
] as const satisfies readonly LaunchReadinessHistorySurface[];

export const LAUNCH_READINESS_HISTORY_SOURCE = {
  proofDirectory: "docs/2_agent-input/generated/agent-loop/reports",
  launchProofCommand: "pnpm launch:proof",
  authProofCommand: "pnpm auth:proof",
  workProofTargetCommand: "pnpm work:proof-target:check",
  ownerEvidenceCommand: "pnpm owner:evidence:check",
  historyCheckCommand: "pnpm launch:history:check",
  referenceDocs: [
    "docs/06_audits-and-reports/RPT-016_loop-83-research-gap-review.md",
    "docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md",
    "docs/02_architecture-and-rules/ARC-026_admin-settings-audit-bff.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
  ],
} as const;

export const LAUNCH_READINESS_HISTORY_PROHIBITED_EXPOSURE = [
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw auth claims",
  "provider payloads",
  "profile IDs",
  "row IDs",
  "raw generated report payload bodies",
  "deployment provider credentials",
  "external registry writes",
] as const;
