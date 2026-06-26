export type OwnerAccessReadinessId =
  | "supabase-login"
  | "dev-mock-login"
  | "protected-next-path"
  | "proof-handoff";

export type OwnerAccessReadinessState = "ready" | "blocked" | "dev_only" | "owner_run";

export type OwnerAccessReadinessRow = {
  readonly id: OwnerAccessReadinessId;
  readonly label: string;
  readonly state: OwnerAccessReadinessState;
  readonly status: string;
  readonly signal: string;
  readonly nextAction: string;
  readonly command: string;
  readonly passSignal: string;
  readonly failSignal: string;
  readonly publicSafe: boolean;
  readonly writesDatabase: boolean;
  readonly exposesSecrets: boolean;
};

export type OwnerAccessReadinessInput = {
  readonly hasSupabaseConfig: boolean;
  readonly isMockAuthEnabled: boolean;
  readonly requestedNextPath: string;
};

export type OwnerAccessReadinessContract = {
  readonly id: "AUTH-007";
  readonly status: "public_safe_read_only";
  readonly generatedAt: string;
  readonly surface: "login";
  readonly source: typeof OWNER_ACCESS_READINESS_SOURCE;
  readonly summary: {
    readonly rowCount: number;
    readonly readyCount: number;
    readonly blockedCount: number;
    readonly ownerRunCount: number;
    readonly primaryPath: "supabase" | "explicit_dev_mock";
    readonly nextProtectedPath: string;
    readonly primaryBlocker: string;
  };
  readonly requiredRowIds: typeof OWNER_ACCESS_READINESS_REQUIRED_IDS;
  readonly prohibitedExposure: typeof OWNER_ACCESS_READINESS_PROHIBITED_EXPOSURE;
  readonly rows: readonly OwnerAccessReadinessRow[];
};

export const OWNER_ACCESS_READINESS_REQUIRED_IDS = [
  "supabase-login",
  "dev-mock-login",
  "protected-next-path",
  "proof-handoff",
] as const satisfies readonly OwnerAccessReadinessId[];

export const OWNER_ACCESS_READINESS_SOURCE = {
  acceptanceTask: "AUTH-007",
  launchBlockers: ["AUTH-005", "WORK-009", "DEPLOY-002"],
  authProofCommand: "pnpm auth:proof",
  launchProofCommand: "pnpm launch:proof",
  ownerAccessCheckCommand: "pnpm owner:access:check",
  referenceDocs: [
    "docs/02_architecture-and-rules/AUT-002_auth-runtime-strategy.md",
    "docs/02_architecture-and-rules/AUT-005_owner-demo-account-boundary.md",
    "docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md",
    "docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md",
  ],
} as const;

export const OWNER_ACCESS_READINESS_PROHIBITED_EXPOSURE = [
  "Supabase URLs or keys",
  "database URLs or hosts",
  "cookies or tokens",
  "raw auth claims",
  "raw provider payloads",
  "profile IDs",
  "actual profile email values",
  "private Work rows",
] as const;

function createReadinessRow(row: OwnerAccessReadinessRow): OwnerAccessReadinessRow {
  return row;
}

export function buildOwnerAccessReadinessContract({
  hasSupabaseConfig,
  isMockAuthEnabled,
  requestedNextPath,
}: OwnerAccessReadinessInput): OwnerAccessReadinessContract {
  const rows = [
    createReadinessRow({
      id: "supabase-login",
      label: "Supabase magic link",
      state: hasSupabaseConfig ? "ready" : "blocked",
      status: hasSupabaseConfig ? "Public env present" : "Missing public env",
      signal: hasSupabaseConfig
        ? "Magic link request is enabled for existing Supabase users."
        : "Magic link request is disabled until public Supabase env is present.",
      nextAction: hasSupabaseConfig
        ? "Send a magic link, sign in, then open /auth/status?proof=1 and save the redacted JSON."
        : "Set public Supabase env, restart the app, then retry the login path.",
      command: "open http://localhost:3000/auth/status?proof=1",
      passSignal: "Signed-in /auth/status maps to an existing Profile and can unlock AUTH-005.",
      failSignal: "Missing env, missing session, or unmapped Profile keeps AUTH-005 blocked.",
      publicSafe: true,
      writesDatabase: false,
      exposesSecrets: false,
    }),
    createReadinessRow({
      id: "dev-mock-login",
      label: "Local dev mock",
      state: isMockAuthEnabled ? "ready" : "dev_only",
      status: isMockAuthEnabled ? "Explicit mock mode active" : "Explicit mock mode off",
      signal: isMockAuthEnabled
        ? "Protected owner pages can load through the seeded development profile."
        : "Local mock access is available only when explicitly enabled outside production.",
      nextAction: isMockAuthEnabled
        ? "Open the protected path and review the interface locally."
        : "For local interface review, start dev with explicit mock auth variables.",
      command: "PERSONAL_OS_AUTH_MODE=mock PERSONAL_OS_DEV_USER_EMAIL=<seeded-demo-email> pnpm dev",
      passSignal: "Protected pages load locally without using a real Supabase session.",
      failSignal: "Production, missing seed profile, or disabled mock mode keeps routes protected.",
      publicSafe: true,
      writesDatabase: false,
      exposesSecrets: false,
    }),
    createReadinessRow({
      id: "protected-next-path",
      label: "Protected next path",
      state: "ready",
      status: requestedNextPath,
      signal: "The redirect target is normalized to an internal application path.",
      nextAction: "After auth succeeds, continue into the requested protected surface.",
      command: `open ${requestedNextPath}`,
      passSignal: "External redirects are rejected and the dashboard shell remains protected.",
      failSignal: "Unexpected redirect target means normalizeNextPath must be reviewed.",
      publicSafe: true,
      writesDatabase: false,
      exposesSecrets: false,
    }),
    createReadinessRow({
      id: "proof-handoff",
      label: "Launch proof handoff",
      state: "owner_run",
      status: "Owner-run evidence",
      signal: "Remaining auth/session evidence is best collected from a signed-in browser session.",
      nextAction: "Validate the saved /auth/status?proof=1 JSON with auth proof once the browser session exists.",
      command:
        "pnpm auth:proof -- --status-json docs/2_agent-input/generated/agent-loop/reports/<signed-in-auth-status-proof>.json --out docs/2_agent-input/generated/agent-loop/reports/owner-auth-proof.json",
      passSignal: "Auth proof reports canRunAuth005=true from redacted signed-in evidence.",
      failSignal: "Missing env/session, unmapped Profile, or missing Work owner count keeps AUTH-005 blocked.",
      publicSafe: true,
      writesDatabase: false,
      exposesSecrets: false,
    }),
  ] as const satisfies readonly OwnerAccessReadinessRow[];

  const blockedCount = rows.filter((row) => row.state === "blocked").length;
  const readyCount = rows.filter((row) => row.state === "ready").length;
  const ownerRunCount = rows.filter((row) => row.state === "owner_run").length;

  return {
    id: "AUTH-007",
    status: "public_safe_read_only",
    generatedAt: new Date().toISOString(),
    surface: "login",
    source: OWNER_ACCESS_READINESS_SOURCE,
    summary: {
      rowCount: rows.length,
      readyCount,
      blockedCount,
      ownerRunCount,
      primaryPath: hasSupabaseConfig ? "supabase" : "explicit_dev_mock",
      nextProtectedPath: requestedNextPath,
      primaryBlocker: hasSupabaseConfig
        ? "Signed-in /auth/status evidence is still required before AUTH-005."
        : "Supabase public env is missing, so signed-in owner proof cannot be collected yet.",
    },
    requiredRowIds: OWNER_ACCESS_READINESS_REQUIRED_IDS,
    prohibitedExposure: OWNER_ACCESS_READINESS_PROHIBITED_EXPOSURE,
    rows,
  };
}
