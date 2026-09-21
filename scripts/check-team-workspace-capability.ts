import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

import {
  TEAM_PROJECT_CAPABILITIES_BY_ROLE,
  TEAM_WORKSPACE_CAPABILITIES_BY_ROLE,
  TEAM_WORKSPACE_CAPABILITY_CONTRACT,
  TEAM_WORKSPACE_CAPABILITY_FIXTURES,
  TEAMCOLLAB_AUT_008_NEGATIVE_COVERAGE,
  TEAMCOLLAB_BFF_OPERATION_POLICIES,
  checkTeamWorkspaceCapabilityFixtures,
  resolveTeamProjectCapabilities,
  toTeamProjectCapabilityDecisionDto,
  type TeamProjectAccessRole,
  type TeamProjectCapabilityInput,
  type TeamProjectDenialReason,
  type TeamWorkspaceRole,
} from "../src/lib/contracts/team-workspace-capability.contract"

const CONTRACT_PATH = "src/lib/contracts/team-workspace-capability.contract.ts"

const EXPECTED_PROJECT_CAPABILITIES = {
  VIEWER: ["project.read"],
  COMMENTER: ["project.read", "feedback.create", "feedback.update_own"],
  EDITOR: [
    "project.read",
    "feedback.create",
    "feedback.update_own",
    "project.content.write",
  ],
  MANAGER: [
    "project.read",
    "feedback.create",
    "feedback.update_own",
    "feedback.moderate",
    "project.content.write",
    "project.access.manage",
    "project.transfer",
    "project.feedback_memory.review",
  ],
} as const

const EXPECTED_WORKSPACE_CAPABILITIES = {
  OWNER: [
    "workspace.read",
    "workspace.projects.list",
    "workspace.projects.create",
    "workspace.members.read",
    "workspace.members.invite",
    "workspace.members.manage",
    "workspace.policy.manage",
    "workspace.audit.read",
    "workspace.project.receive_transfer",
    "workspace.owner_policy.manage",
  ],
  ADMIN: [
    "workspace.read",
    "workspace.projects.list",
    "workspace.projects.create",
    "workspace.members.read",
    "workspace.members.invite",
    "workspace.members.manage",
    "workspace.policy.manage",
    "workspace.audit.read",
    "workspace.project.receive_transfer",
  ],
  MEMBER: ["workspace.read", "workspace.projects.list"],
  GUEST: ["workspace.read"],
} as const

type AdditionalFixture = {
  id: string
  input: TeamProjectCapabilityInput
  allowed: boolean
  projectRole?: TeamProjectAccessRole
  denialReason?: TeamProjectDenialReason
}

const ACTIVE_WORKSPACE = {
  id: "workspace-alpha",
  status: "ACTIVE",
  defaultProjectRole: "VIEWER",
} as const

const ACTIVE_PROJECT = {
  id: "project-alpha",
  workspaceId: ACTIVE_WORKSPACE.id,
  status: "ACTIVE",
  accessMode: "WORKSPACE_VISIBLE",
} as const

function membership(role: TeamWorkspaceRole) {
  return {
    id: `membership-${role.toLowerCase()}`,
    workspaceId: ACTIVE_WORKSPACE.id,
    profileId: "profile-alpha",
    role,
    status: "ACTIVE" as const,
  }
}

function inputFor(
  role: TeamWorkspaceRole,
  overrides: Partial<TeamProjectCapabilityInput> = {},
): TeamProjectCapabilityInput {
  return {
    identity: { profileId: "profile-alpha" },
    workspace: ACTIVE_WORKSPACE,
    membership: membership(role),
    project: ACTIVE_PROJECT,
    directGrant: null,
    ...overrides,
  }
}

function directGrant(role: TeamProjectAccessRole, memberRole: TeamWorkspaceRole = "MEMBER") {
  return {
    projectId: ACTIVE_PROJECT.id,
    workspaceId: ACTIVE_WORKSPACE.id,
    membershipId: membership(memberRole).id,
    role,
    status: "ACTIVE" as const,
  }
}

const ADDITIONAL_FIXTURES: readonly AdditionalFixture[] = [
  {
    id: "identity-missing",
    input: inputFor("MEMBER", { identity: null }),
    allowed: false,
    denialReason: "identity_missing",
  },
  {
    id: "identity-empty",
    input: inputFor("MEMBER", { identity: { profileId: " " } }),
    allowed: false,
    denialReason: "identity_invalid",
  },
  {
    id: "workspace-missing",
    input: inputFor("MEMBER", { workspace: null }),
    allowed: false,
    denialReason: "workspace_missing",
  },
  {
    id: "project-missing",
    input: inputFor("MEMBER", { project: null }),
    allowed: false,
    denialReason: "project_missing",
  },
  {
    id: "workspace-archived",
    input: inputFor("OWNER", {
      workspace: { ...ACTIVE_WORKSPACE, status: "ARCHIVED" },
    }),
    allowed: false,
    denialReason: "workspace_inactive",
  },
  ...(["SUSPENDED", "LEFT", "REMOVED"] as const).map((status) => ({
    id: `membership-${status.toLowerCase()}`,
    input: inputFor("OWNER", {
      membership: { ...membership("OWNER"), status },
      directGrant: directGrant("MANAGER", "OWNER"),
    }),
    allowed: false as const,
    denialReason: "membership_inactive" as const,
  })),
  ...(["VIEWER", "COMMENTER", "EDITOR", "MANAGER"] as const).map((role) => ({
    id: `member-inherits-${role.toLowerCase()}`,
    input: inputFor("MEMBER", {
      workspace: { ...ACTIVE_WORKSPACE, defaultProjectRole: role },
    }),
    allowed: true as const,
    projectRole: role,
  })),
  ...(["VIEWER", "COMMENTER", "EDITOR", "MANAGER"] as const).map((role) => ({
    id: `guest-direct-${role.toLowerCase()}`,
    input: inputFor("GUEST", { directGrant: directGrant(role, "GUEST") }),
    allowed: true as const,
    projectRole: role,
  })),
  {
    id: "grant-other-project",
    input: inputFor("MEMBER", {
      directGrant: { ...directGrant("MANAGER"), projectId: "project-other" },
    }),
    allowed: false,
    denialReason: "direct_grant_project_mismatch",
  },
  {
    id: "grant-other-workspace",
    input: inputFor("MEMBER", {
      directGrant: { ...directGrant("MANAGER"), workspaceId: "workspace-other" },
    }),
    allowed: false,
    denialReason: "direct_grant_workspace_mismatch",
  },
  {
    id: "grant-without-membership",
    input: inputFor("MEMBER", { membership: null, directGrant: directGrant("MANAGER") }),
    allowed: false,
    denialReason: "membership_missing",
  },
  {
    id: "unknown-workspace-status",
    input: inputFor("MEMBER", {
      workspace: {
        ...ACTIVE_WORKSPACE,
        status: "UNKNOWN" as never,
      },
    }),
    allowed: false,
    denialReason: "workspace_status_invalid",
  },
  {
    id: "unknown-membership-status",
    input: inputFor("MEMBER", {
      membership: {
        ...membership("MEMBER"),
        status: "UNKNOWN" as never,
      },
    }),
    allowed: false,
    denialReason: "membership_status_invalid",
  },
  {
    id: "global-partner-is-not-workspace-role",
    input: inputFor("MEMBER", {
      membership: { ...membership("MEMBER"), role: "PARTNER" as TeamWorkspaceRole },
    }),
    allowed: false,
    denialReason: "membership_role_invalid",
  },
  {
    id: "owner-is-not-project-role",
    input: inputFor("MEMBER", {
      directGrant: { ...directGrant("VIEWER"), role: "OWNER" as TeamProjectAccessRole },
    }),
    allowed: false,
    denialReason: "direct_grant_role_invalid",
  },
  {
    id: "unknown-project-access-mode",
    input: inputFor("MEMBER", {
      project: {
        ...ACTIVE_PROJECT,
        accessMode: "UNKNOWN" as never,
      },
    }),
    allowed: false,
    denialReason: "project_access_mode_invalid",
  },
  {
    id: "unknown-workspace-default-role",
    input: inputFor("MEMBER", {
      workspace: {
        ...ACTIVE_WORKSPACE,
        defaultProjectRole: "UNKNOWN" as TeamProjectAccessRole,
      },
    }),
    allowed: false,
    denialReason: "workspace_default_role_invalid",
  },
]

const FORBIDDEN_SOURCE_PATTERNS = [
  ["Prisma import", /@prisma\/client/],
  ["Prisma client", /\bPrismaClient\b/],
  ["database client import", /from\s+["']@\/lib\/db["']/],
  ["database client call", /\bdb\./],
  ["transaction call", /\$transaction/],
  ["environment read", /\bprocess\.env\b/],
  ["database URL", /\bDATABASE_URL\b/],
  ["privileged provider env", /\bSUPABASE_/],
  ["network call", /\bfetch\s*\(/],
  ["provider client call", /\bcreateClient\s*\(/],
  ["cookie read", /\bcookies\s*\(/],
  ["header read", /\bheaders\s*\(/],
  ["route request", /\bNextRequest\b/],
  ["route response", /\bNextResponse\b/],
  ["server action", /["']use server["']/],
  ["route handler export", /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/],
  ["route revalidation", /\brevalidatePath\s*\(/],
  ["OpenAI runtime", /\bOpenAI\b/],
  ["Anthropic runtime", /\bAnthropic\b/],
  ["random-dependent decision", /\bMath\.random\s*\(/],
  ["time-dependent decision", /\bDate\.now\s*\(/],
  ["external registration enabled", /externalRegisterable\s*:\s*true/],
] as const

function unique<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length
}

async function main() {
  const fixtureFailures = checkTeamWorkspaceCapabilityFixtures()
  assert.deepEqual(fixtureFailures, [], JSON.stringify(fixtureFailures, null, 2))

  assert.deepEqual(TEAM_PROJECT_CAPABILITIES_BY_ROLE, EXPECTED_PROJECT_CAPABILITIES)
  assert.deepEqual(TEAM_WORKSPACE_CAPABILITIES_BY_ROLE, EXPECTED_WORKSPACE_CAPABILITIES)

  for (const capabilities of Object.values(TEAM_PROJECT_CAPABILITIES_BY_ROLE)) {
    assert.equal(unique(capabilities), true, "Project capability arrays must not contain duplicates.")
  }
  for (const capabilities of Object.values(TEAM_WORKSPACE_CAPABILITIES_BY_ROLE)) {
    assert.equal(unique(capabilities), true, "Workspace capability arrays must not contain duplicates.")
  }

  for (const fixture of ADDITIONAL_FIXTURES) {
    const before = structuredClone(fixture.input)
    let resolution: ReturnType<typeof resolveTeamProjectCapabilities>
    assert.doesNotThrow(() => {
      resolution = resolveTeamProjectCapabilities(fixture.input)
    }, `${fixture.id} must fail closed without throwing.`)
    assert.equal(resolution!.allowed, fixture.allowed, fixture.id)
    if (fixture.projectRole !== undefined) {
      assert.equal(resolution!.projectRole, fixture.projectRole, fixture.id)
    }
    if (fixture.denialReason !== undefined) {
      assert.equal(resolution!.denialReason, fixture.denialReason, fixture.id)
    }
    assert.deepEqual(fixture.input, before, `${fixture.id} mutated its input.`)
    assert.deepEqual(
      resolveTeamProjectCapabilities(fixture.input),
      resolution!,
      `${fixture.id} must be deterministic.`,
    )
    if (!resolution!.allowed) {
      assert.equal(resolution!.projectRole, null, fixture.id)
      assert.equal(resolution!.accessSource, "none", fixture.id)
      assert.deepEqual(resolution!.capabilities, [], fixture.id)
    }
  }

  const builtInFixtureIds = TEAM_WORKSPACE_CAPABILITY_FIXTURES.map((fixture) => fixture.id)
  const additionalFixtureIds = ADDITIONAL_FIXTURES.map((fixture) => fixture.id)
  assert.equal(unique(builtInFixtureIds), true, "Built-in fixture IDs must be unique.")
  assert.equal(unique(additionalFixtureIds), true, "Additional fixture IDs must be unique.")

  assert.equal(TEAMCOLLAB_AUT_008_NEGATIVE_COVERAGE.length, 13)
  assert.equal(
    unique(TEAMCOLLAB_AUT_008_NEGATIVE_COVERAGE.map((row) => row.scenarioId)),
    true,
    "AUT-008 scenario IDs must be unique.",
  )
  assert.equal(
    TEAMCOLLAB_AUT_008_NEGATIVE_COVERAGE.every((row) => row.runtimeProofClaimed === false),
    true,
    "Contract coverage must not claim runtime proof.",
  )
  assert.equal(
    new Set(TEAMCOLLAB_AUT_008_NEGATIVE_COVERAGE.map((row) => row.proofKind)).size,
    3,
    "Resolver, BFF policy, and follow-up boundary coverage must all be explicit.",
  )

  assert.equal(
    unique(TEAMCOLLAB_BFF_OPERATION_POLICIES.map((policy) => policy.operationId)),
    true,
    "BFF operation policy IDs must be unique.",
  )
  const transferPolicy = TEAMCOLLAB_BFF_OPERATION_POLICIES.find(
    (policy) => policy.operationId === "project.transfer",
  )
  assert.ok(transferPolicy)
  assert.equal(transferPolicy.requiredProjectCapability, "project.transfer")
  assert.equal(
    transferPolicy.additionalChecks.includes(
      "target resolver requires workspace.project.receive_transfer",
    ),
    true,
  )
  assert.equal(
    transferPolicy.additionalChecks.includes(
      "must preserve Client Portal visibility and token",
    ),
    true,
  )

  const deniedResolution = resolveTeamProjectCapabilities(
    inputFor("MEMBER", { project: { ...ACTIVE_PROJECT, workspaceId: "workspace-secret" } }),
  )
  const deniedDto = toTeamProjectCapabilityDecisionDto(deniedResolution)
  assert.deepEqual(deniedDto, {
    decision: "DENY",
    workspaceRole: null,
    projectRole: null,
    accessSource: "none",
    capabilities: [],
    code: "not_found_or_forbidden",
  })
  assert.equal(JSON.stringify(deniedDto).includes("workspace-secret"), false)

  assert.equal(
    Object.values(TEAM_WORKSPACE_CAPABILITY_CONTRACT.safety).every((value) => value === false),
    true,
    "All TEAMCOLLAB-003 runtime/write/launch safety flags must remain false.",
  )
  assert.equal(TEAM_WORKSPACE_CAPABILITY_CONTRACT.nandaBoundary.externalRegisterable, false)

  const contractSource = await readFile(CONTRACT_PATH, "utf8")
  for (const [label, pattern] of FORBIDDEN_SOURCE_PATTERNS) {
    assert.equal(pattern.test(contractSource), false, `Forbidden contract marker: ${label}.`)
  }

  console.log("[PASS] TEAMCOLLAB-003 workspace/project capability contract")
  console.log(`- ${TEAM_WORKSPACE_CAPABILITY_FIXTURES.length} built-in fixtures passed`)
  console.log(`- ${ADDITIONAL_FIXTURES.length} extended fixtures passed`)
  console.log("- Exact workspace/project role maps passed")
  console.log("- 13/13 AUT-008 negative scenarios have explicit contract/follow-up coverage")
  console.log("- BFF DTO redaction, transfer conditions, immutability, and determinism passed")
  console.log("- Forbidden runtime/DB/provider/public/agent side-effect scan passed")
}

main().catch((error) => {
  console.error("[FAIL] TEAMCOLLAB-003 capability check")
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exit(1)
})
