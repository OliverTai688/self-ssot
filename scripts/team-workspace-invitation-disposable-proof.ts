#!/usr/bin/env tsx

import crypto from "node:crypto"
import fs from "node:fs/promises"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { pathToFileURL } from "node:url"
import { Client } from "pg"

const ROOT = process.cwd()
const DATABASE_NAME = "personal_os_teamcollab_invitation_proof"
const TEMP_PREFIX = "personal-os-teamcollab-invitation-"
const OWNERSHIP_MARKER = ".teamcollab-invitation-proof-owned"
const CONFIRM_PHRASE =
  "I_UNDERSTAND_THIS_WRITES_ONLY_TO_A_NEW_LOCAL_DISPOSABLE_DATABASE"
const MIGRATIONS_PATH = path.join(ROOT, "prisma/migrations")
const SCHEMA_PATH = path.join(ROOT, "prisma/schema.prisma")

const OWNER = "00000000-0000-4000-8000-000000000001"
const ADMIN = "00000000-0000-4000-8000-000000000002"
const MEMBER_GLOBAL_OWNER = "00000000-0000-4000-8000-000000000003"
const RECIPIENT = "00000000-0000-4000-8000-000000000004"
const WRONG_RECIPIENT = "00000000-0000-4000-8000-000000000005"
const EXPIRY_RECIPIENT = "00000000-0000-4000-8000-000000000006"
const REVOKE_RECIPIENT = "00000000-0000-4000-8000-000000000007"
const ACTIVE_RECIPIENT = "00000000-0000-4000-8000-000000000008"
const TEAM_A = "10000000-0000-4000-8000-000000000001"
const TEAM_B = "10000000-0000-4000-8000-000000000002"
const PROJECT_A = "20000000-0000-4000-8000-000000000001"
const PROJECT_B = "20000000-0000-4000-8000-000000000002"

const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
  "DIRECT_DATABASE_URL",
  "SHADOW_DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_URL",
] as const

type CommandResult = { stdout: string; stderr: string }
type ProofMode = "dry-run" | "run"
type InvitationResult = {
  invitation?: { id?: string }
  invitationId?: string
  acceptanceUrl?: string | null
  idempotentReplay?: boolean
  membershipId?: string
  workspaceId?: string
}

function parseMode(): ProofMode | "help" {
  const args = process.argv.slice(2).filter((arg) => arg !== "--")
  const allowed = new Set(["--dry-run", "--run", "--help", "-h"])
  const unknown = args.filter((arg) => !allowed.has(arg))
  if (unknown.length > 0) {
    throw new Error(
      `Unsupported argument count: ${unknown.length}. This proof accepts no database URL or target argument.`,
    )
  }
  if (args.includes("--help") || args.includes("-h")) return "help"
  if (args.includes("--run") && args.includes("--dry-run")) {
    throw new Error("Choose exactly one of --dry-run or --run")
  }
  return args.includes("--run") ? "run" : "dry-run"
}

function help() {
  console.log(`Usage:
  tsx scripts/team-workspace-invitation-disposable-proof.ts --dry-run
  TEAMCOLLAB_PROOF_ALLOW_LOCAL_WRITES=1 \\
  TEAMCOLLAB_PROOF_ALLOW_MIGRATION_APPLY=1 \\
  TEAMCOLLAB_PROOF_CONFIRM=${CONFIRM_PHRASE} \\
  NODE_OPTIONS=--conditions=react-server \\
  tsx scripts/team-workspace-invitation-disposable-proof.ts --run

The proof accepts no database URL. It creates, fingerprints, and removes its
own loopback-only PostgreSQL cluster and executes the actual invitation service.`)
}

async function command(
  executable: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; cwd?: string } = {},
): Promise<CommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? ROOT,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += String(chunk)))
    child.stderr.on("data", (chunk) => (stderr += String(chunk)))
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr })
      reject(new Error(`${executable} exited ${code}: ${stderr || stdout}`))
    })
  })
}

async function freeLoopbackPort() {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a loopback port")))
        return
      }
      server.close((error) =>
        error ? reject(error) : resolve(address.port),
      )
    })
  })
}

function scrubDatabaseEnvironment(source: NodeJS.ProcessEnv = process.env) {
  const result = { ...source }
  for (const key of DATABASE_ENV_KEYS) delete result[key]
  return result
}

function replaceProcessDatabaseEnvironment(localUrl: string) {
  for (const key of DATABASE_ENV_KEYS) delete process.env[key]
  process.env.DATABASE_URL = localUrl
  process.env.DIRECT_DATABASE_URL = localUrl
}

function sanitizeError(error: unknown, localUrl: string) {
  return (error instanceof Error ? error.message : String(error))
    .replaceAll(localUrl, "<redacted-local-disposable-url>")
    .slice(0, 2400)
}

async function writeTemporaryPrismaConfig(
  configPath: string,
  schemaPath: string,
  migrationsPath: string,
  url: string,
) {
  const prismaConfigModule = await fs.realpath(
    path.join(ROOT, "node_modules/prisma/config.js"),
  )
  const source = `import { defineConfig } from ${JSON.stringify(pathToFileURL(prismaConfigModule).href)}

export default defineConfig({
  schema: ${JSON.stringify(schemaPath)},
  migrations: { path: ${JSON.stringify(migrationsPath)} },
  datasource: { url: ${JSON.stringify(url)} },
})
`
  await fs.writeFile(configPath, source, { encoding: "utf8", flag: "wx" })
}

async function assertTargetFingerprint(
  client: Client,
  expectedPort: number,
  expectedDataDirectory: string,
) {
  const result = await client.query<{
    database_name: string
    server_address: string
    server_port: number
    data_directory: string
  }>(`
    SELECT current_database() AS database_name,
           inet_server_addr()::text AS server_address,
           inet_server_port() AS server_port,
           current_setting('data_directory') AS data_directory
  `)
  const row = result.rows[0]
  const [actualDirectory, ownedDirectory] = await Promise.all([
    fs.realpath(row.data_directory),
    fs.realpath(expectedDataDirectory),
  ])
  const checks = {
    databaseNameMatched: row.database_name === DATABASE_NAME,
    loopbackMatched: /^(?:127\.0\.0\.1(?:\/32)?|::1(?:\/128)?)$/.test(
      row.server_address,
    ),
    portMatched: Number(row.server_port) === expectedPort,
    dataDirectoryMatched: actualDirectory === ownedDirectory,
  }
  if (!Object.values(checks).every(Boolean)) {
    throw new Error(`Disposable target fingerprint mismatch: ${JSON.stringify(checks)}`)
  }
  return checks
}

async function insertFixtures(client: Client) {
  await client.query(
    `
    INSERT INTO "profiles" ("id", "email", "full_name", "role", "created_at", "updated_at") VALUES
      ($1, 'owner@example.test', 'Workspace Owner', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, 'admin@example.test', 'Workspace Admin', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($3, 'global-owner-member@example.test', 'Global Owner But Member', 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($4, 'recipient@example.test', 'Recipient', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($5, 'wrong@example.test', 'Wrong Recipient', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($6, 'expiry@example.test', 'Expiry Recipient', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($7, 'revoke@example.test', 'Revoke Recipient', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($8, 'active@example.test', 'Active Recipient', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      OWNER,
      ADMIN,
      MEMBER_GLOBAL_OWNER,
      RECIPIENT,
      WRONG_RECIPIENT,
      EXPIRY_RECIPIENT,
      REVOKE_RECIPIENT,
      ACTIVE_RECIPIENT,
    ],
  )
  await client.query(
    `
    INSERT INTO "workspaces" (
      "id", "type", "name", "slug", "status", "default_project_access_role",
      "ai_feedback_memory_enabled", "created_by_profile_id", "created_at", "updated_at"
    ) VALUES
      ($1, 'TEAM', 'Proof Team A', 'proof-team-a', 'ACTIVE', 'VIEWER', FALSE, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, 'TEAM', 'Proof Team B', 'proof-team-b', 'ACTIVE', 'VIEWER', FALSE, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [TEAM_A, TEAM_B, OWNER],
  )
  await client.query(
    `
    INSERT INTO "workspace_memberships" (
      "workspace_id", "profile_id", "role", "status", "joined_at", "created_at", "updated_at"
    ) VALUES
      ($1, $3, 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($1, $4, 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($1, $5, 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($1, $6, 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, $3, 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [TEAM_A, TEAM_B, OWNER, ADMIN, MEMBER_GLOBAL_OWNER, ACTIVE_RECIPIENT],
  )
  await client.query(
    `
    INSERT INTO "projects" (
      "id", "owner_id", "workspace_id", "name", "status", "phase", "health",
      "visibility", "access_mode", "tasks_done", "tasks_total", "created_at", "updated_at"
    ) VALUES
      ($1, $3, $4, 'Proof Project A', 'ACTIVE', 'PLANNING', 'GOOD', 'INTERNAL_ONLY', 'WORKSPACE_VISIBLE', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, $3, $5, 'Proof Project B', 'ACTIVE', 'PLANNING', 'GOOD', 'INTERNAL_ONLY', 'WORKSPACE_VISIBLE', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [PROJECT_A, PROJECT_B, OWNER, TEAM_A, TEAM_B],
  )
}

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return String(error)
  const candidate = error as { code?: unknown; message?: unknown }
  if (typeof candidate.code === "string") return candidate.code
  return typeof candidate.message === "string" ? candidate.message : "unknown"
}

async function expectDenied(
  label: string,
  expectedCode: string,
  operation: () => Promise<unknown>,
) {
  try {
    await operation()
  } catch (error) {
    const actual = errorCode(error)
    if (!actual.toLowerCase().includes(expectedCode.toLowerCase())) {
      throw new Error(`${label} returned ${actual}; expected ${expectedCode}`)
    }
    return { label, code: actual }
  }
  throw new Error(`${label} unexpectedly succeeded`)
}

function invitationId(result: InvitationResult) {
  const id = result.invitationId ?? result.invitation?.id
  if (!id) throw new Error("Invitation result omitted invitation id")
  return id
}

function tokenFrom(result: InvitationResult) {
  if (!result.acceptanceUrl) throw new Error("Fresh invitation omitted one-time acceptanceUrl")
  const parsed = new URL(result.acceptanceUrl, "http://localhost")
  const token =
    parsed.searchParams.get("token") ?? parsed.searchParams.get("invitation")
  if (!token || token.length < 32) throw new Error("Acceptance URL omitted a strong token")
  return token
}

async function counts(client: Client) {
  const result = await client.query<Record<string, string>>(`
    SELECT
      (SELECT COUNT(*) FROM "workspaces") AS workspaces,
      (SELECT COUNT(*) FROM "projects") AS projects,
      (SELECT COUNT(*) FROM "workspace_memberships") AS memberships,
      (SELECT COUNT(*) FROM "collaboration_invitations") AS invitations,
      (SELECT COUNT(*) FROM "project_access_grants") AS grants,
      (SELECT COUNT(*) FROM "operating_audit_events") AS audits,
      (SELECT COUNT(*) FROM "project_feedback") AS feedback,
      (SELECT COUNT(*) FROM "project_feedback_versions") AS feedback_versions,
      (SELECT COUNT(*) FROM "project_memory_candidates") AS memory_candidates
  `)
  return Object.fromEntries(
    Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)]),
  )
}

async function assertAuditRedaction(client: Client) {
  const result = await client.query<Record<string, unknown>>(
    `SELECT * FROM "operating_audit_events" ORDER BY "occurred_at", "id"`,
  )
  const serialized = JSON.stringify(result.rows)
  const forbidden = [
    "owner@example.test",
    "recipient@example.test",
    "wrong@example.test",
    "expiry@example.test",
    "revoke@example.test",
    "accept?token=",
  ]
  if (forbidden.some((value) => serialized.includes(value))) {
    throw new Error("Invitation audit leaked raw email or token material")
  }
  for (const row of result.rows) {
    if (
      !/^[0-9a-f]{64}$/.test(String(row.request_ref)) ||
      JSON.stringify(row.metadata) !== "{}" ||
      row.redaction_version !== "teamcollab-006-v1" ||
      row.retention_class !== "high_risk_7_year_review_required"
    ) {
      throw new Error("Invitation audit row failed exact redaction shape")
    }
  }
  return { rows: result.rowCount, noEmailOrToken: true, metadataEmpty: true }
}

async function assertAppendOnly(client: Client) {
  const evidence = []
  for (const [operation, sql] of [
    ["update", `UPDATE "operating_audit_events" SET "metadata" = '{}' WHERE TRUE`],
    ["delete", `DELETE FROM "operating_audit_events" WHERE TRUE`],
  ] as const) {
    try {
      await client.query(sql)
      throw new Error(`${operation} unexpectedly mutated append-only audit`)
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : ""
      if (code !== "55000") throw error
      evidence.push({ operation, sqlstate: code })
    }
  }
  return evidence
}

async function assertSameNameAuditCatalogDriftFailsClosed(
  client: Client,
  create: (profileId: string, input: Record<string, unknown>) => Promise<InvitationResult>,
) {
  const catalog = await client.query<{ definition: string }>(`
    SELECT pg_get_constraintdef(oid, TRUE) AS definition
    FROM pg_constraint
    WHERE conrelid = to_regclass('operating_audit_events')
      AND conname = 'operating_audit_events_teamcollab_action_catalog_check'
      AND contype = 'c'
      AND convalidated
  `)
  const definition = catalog.rows[0]?.definition
  if (!definition?.startsWith("CHECK (")) {
    throw new Error("Exact invitation audit catalog constraint is unavailable")
  }
  const before = await counts(client)
  await client.query(`
    ALTER TABLE "operating_audit_events"
      DROP CONSTRAINT "operating_audit_events_teamcollab_action_catalog_check";
    ALTER TABLE "operating_audit_events"
      ADD CONSTRAINT "operating_audit_events_teamcollab_action_catalog_check"
      CHECK ("actor_ref" IS NOT NULL)
  `)
  try {
    await expectDenied("same_name_weakened_audit_catalog", "audit_storage_unavailable", () =>
      create(OWNER, {
        workspaceId: TEAM_A,
        email: "drift@example.test",
        workspaceRole: "MEMBER",
        idempotencyKey: "30000000-0000-4000-8000-0000000000d1",
      }),
    )
    const after = await counts(client)
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      throw new Error("Weakened audit catalog denial changed persisted rows")
    }
  } finally {
    await client.query(`
      ALTER TABLE "operating_audit_events"
        DROP CONSTRAINT "operating_audit_events_teamcollab_action_catalog_check";
      ALTER TABLE "operating_audit_events"
        ADD CONSTRAINT "operating_audit_events_teamcollab_action_catalog_check"
        ${definition}
    `)
  }
  return {
    artifact: "operating_audit_events_teamcollab_action_catalog_check",
    weakenedSameNameDenied: true,
    writes: 0,
  }
}

async function main() {
  const mode = parseMode()
  if (mode === "help") return help()
  if (mode === "dry-run") {
    const tools = await Promise.all(
      ["initdb", "pg_ctl", "createdb", "pnpm"].map(async (tool) => {
        try {
          const result = await command(tool, ["--version"])
          return { tool, available: true, version: (result.stdout || result.stderr).trim() }
        } catch {
          return { tool, available: false }
        }
      }),
    )
    console.log(
      JSON.stringify(
        {
          status: tools.every((tool) => tool.available) ? "ready" : "blocked",
          mode,
          task: "TEAMCOLLAB-006",
          targetClassification: "self_created_local_disposable",
          configuredDatabaseAccessAllowed: false,
          inheritedDatabaseEnvironmentIgnored: true,
          providerCallsAllowed: false,
          plannedCases: [
            "manager_create_digest_only_manual_link",
            "same_key_replay_no_secret_recovery",
            "reinvite_revokes_old_token",
            "old_token_denied_new_token_accepted_once",
            "active_membership_reinvite_denied",
            "wrong_email_audited_denial",
            "expired_revoked_reused_denials",
            "admin_owner_escalation_denied",
            "global_owner_member_invite_denied",
            "cross_workspace_project_denied",
            "guest_no_inherited_access",
            "audit_redaction_and_append_only",
            "zero_feedback_memory_transfer_provider_side_effects",
            "owned_cluster_cleanup",
          ],
          tools,
        },
        null,
        2,
      ),
    )
    return
  }

  if (
    process.env.TEAMCOLLAB_PROOF_ALLOW_LOCAL_WRITES !== "1" ||
    process.env.TEAMCOLLAB_PROOF_ALLOW_MIGRATION_APPLY !== "1" ||
    process.env.TEAMCOLLAB_PROOF_CONFIRM !== CONFIRM_PHRASE
  ) {
    throw new Error("Disposable write gates are incomplete. Run --help for the exact confirmation.")
  }

  const port = await freeLoopbackPort()
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX))
  const dataDir = path.join(tempRoot, "data")
  const logPath = path.join(tempRoot, "postgres.log")
  const markerPath = path.join(tempRoot, OWNERSHIP_MARKER)
  const isolatedPrismaRoot = path.join(tempRoot, "prisma")
  const isolatedMigrations = path.join(isolatedPrismaRoot, "migrations")
  const isolatedSchema = path.join(isolatedPrismaRoot, "schema.prisma")
  const prismaConfig = path.join(tempRoot, "proof.prisma.config.ts")
  const localUrl = `postgresql://postgres@127.0.0.1:${port}/${DATABASE_NAME}`
  const childEnv = scrubDatabaseEnvironment()
  const cleanup = { clusterStopped: false, tempRootRemoved: false }
  let clusterStarted = false
  let client: Client | null = null
  let disposeAppDatabase: (() => Promise<void>) | null = null
  let result: Record<string, unknown> | null = null

  try {
    await fs.writeFile(markerPath, "TEAMCOLLAB-006 self-created disposable proof\n", {
      encoding: "utf8",
      flag: "wx",
    })
    await fs.cp(MIGRATIONS_PATH, isolatedMigrations, { recursive: true, errorOnExist: true })
    await fs.copyFile(SCHEMA_PATH, isolatedSchema)
    await writeTemporaryPrismaConfig(prismaConfig, isolatedSchema, isolatedMigrations, localUrl)
    await command("initdb", [
      "-D",
      dataDir,
      "--auth-local=trust",
      "--auth-host=trust",
      "--username=postgres",
      "--no-locale",
      "--encoding=UTF8",
    ])
    await command("pg_ctl", [
      "-D",
      dataDir,
      "-l",
      logPath,
      "-o",
      `-p ${port} -h 127.0.0.1`,
      "-w",
      "start",
    ])
    clusterStarted = true
    await command("createdb", [
      "-h",
      "127.0.0.1",
      "-p",
      String(port),
      "-U",
      "postgres",
      DATABASE_NAME,
    ])
    client = new Client({ connectionString: localUrl })
    await client.connect()
    const fingerprint = await assertTargetFingerprint(client, port, dataDir)
    await command(
      "pnpm",
      ["exec", "prisma", "migrate", "deploy", "--config", prismaConfig],
      { env: childEnv },
    )
    await insertFixtures(client)

    replaceProcessDatabaseEnvironment(localUrl)
    process.env.PERSONAL_OS_ALLOW_DATABASE_POOL_DISPOSAL = "self_created_disposable"
    const service = await import("../src/lib/services/team-workspace-invitation.service")
    const dbModule = await import("../src/lib/db")
    disposeAppDatabase = dbModule.disposeDatabaseConnections
    const create = service.createTeamWorkspaceInvitationForProfile as unknown as (
      profileId: string,
      input: Record<string, unknown>,
    ) => Promise<InvitationResult>
    const accept = service.acceptTeamWorkspaceInvitationForProfile as (
      profileId: string,
      verifiedEmail: string,
      input: { token: string },
    ) => Promise<InvitationResult>
    const revoke = service.revokeTeamWorkspaceInvitationForProfile as unknown as (
      profileId: string,
      input: Record<string, unknown>,
    ) => Promise<InvitationResult>
    if (![create, accept, revoke].every((value) => typeof value === "function")) {
      throw new Error("Invitation service exports are incomplete")
    }

    const auditCatalogDriftFailClosed =
      await assertSameNameAuditCatalogDriftFailsClosed(client, create)
    const baseline = await counts(client)
    const denials = [
      await expectDenied("global_owner_but_workspace_member", "not_found_or_forbidden", () =>
        create(MEMBER_GLOBAL_OWNER, {
          workspaceId: TEAM_A,
          email: "new-member@example.test",
          workspaceRole: "MEMBER",
          idempotencyKey: crypto.randomUUID(),
        }),
      ),
      await expectDenied("admin_owner_escalation", "owner_invite_requires_owner", () =>
        create(ADMIN, {
          workspaceId: TEAM_A,
          email: "new-owner@example.test",
          workspaceRole: "OWNER",
          idempotencyKey: crypto.randomUUID(),
        }),
      ),
      await expectDenied("cross_workspace_project", "project_scope_invalid", () =>
        create(OWNER, {
          workspaceId: TEAM_A,
          email: "project-guest@example.test",
          workspaceRole: "GUEST",
          projectId: PROJECT_B,
          projectRole: "COMMENTER",
          idempotencyKey: crypto.randomUUID(),
        }),
      ),
      await expectDenied("already_active_member", "already_active_member", () =>
        create(OWNER, {
          workspaceId: TEAM_A,
          email: " ACTIVE@example.test ",
          workspaceRole: "MEMBER",
          idempotencyKey: crypto.randomUUID(),
        }),
      ),
    ]
    const afterDenials = await counts(client)
    if (
      afterDenials.invitations !== baseline.invitations ||
      afterDenials.memberships !== baseline.memberships ||
      afterDenials.grants !== baseline.grants
    ) {
      throw new Error("Pre-create denials changed invitation/member/grant rows")
    }

    const first = await create(OWNER, {
      workspaceId: TEAM_A,
      email: "  RECIPIENT@EXAMPLE.TEST ",
      workspaceRole: "MEMBER",
      projectId: PROJECT_A,
      projectRole: "EDITOR",
      idempotencyKey: "30000000-0000-4000-8000-000000000001",
    })
    const firstId = invitationId(first)
    const firstToken = tokenFrom(first)
    const storedFirst = await client.query<{
      normalized_email: string
      token_digest: string
      status: string
    }>(
      `SELECT "normalized_email", "token_digest", "status"::text
       FROM "collaboration_invitations" WHERE "id" = $1`,
      [firstId],
    )
    const firstRow = storedFirst.rows[0]
    if (
      firstRow.normalized_email !== "recipient@example.test" ||
      firstRow.status !== "PENDING" ||
      firstRow.token_digest === firstToken ||
      firstRow.token_digest !==
        crypto
          .createHash("sha256")
          .update(`teamcollab-006-invitation\u0000${firstToken}`)
          .digest("hex")
    ) {
      throw new Error("Invitation create failed normalization or digest-only storage")
    }

    const replay = await create(OWNER, {
      workspaceId: TEAM_A,
      email: "recipient@example.test",
      workspaceRole: "MEMBER",
      projectId: PROJECT_A,
      projectRole: "EDITOR",
      idempotencyKey: "30000000-0000-4000-8000-000000000001",
    })
    if (!replay.idempotentReplay || replay.acceptanceUrl !== null) {
      throw new Error("Create replay recovered or re-exposed a one-time raw token")
    }

    const second = await create(OWNER, {
      workspaceId: TEAM_A,
      email: "recipient@example.test",
      workspaceRole: "MEMBER",
      projectId: PROJECT_A,
      projectRole: "EDITOR",
      idempotencyKey: "30000000-0000-4000-8000-000000000002",
    })
    const secondToken = tokenFrom(second)
    const rotated = await client.query<{ id: string; status: string }>(
      `SELECT "id"::text, "status"::text FROM "collaboration_invitations"
       WHERE "normalized_email" = 'recipient@example.test' ORDER BY "created_at", "id"`,
    )
    if (
      rotated.rows.length !== 2 ||
      rotated.rows.find((row) => row.id === firstId)?.status !== "REVOKED" ||
      rotated.rows.find((row) => row.id === invitationId(second))?.status !== "PENDING"
    ) {
      throw new Error("Reinvite did not revoke the old PENDING token")
    }
    await expectDenied("old_reinvite_token", "invitation_is_revoked", () =>
      accept(RECIPIENT, "recipient@example.test", { token: firstToken }),
    )
    const beforeWrongEmail = await counts(client)
    await expectDenied("wrong_email", "email_mismatch", () =>
      accept(WRONG_RECIPIENT, "wrong@example.test", { token: secondToken }),
    )
    const afterWrongEmail = await counts(client)
    await expectDenied("wrong_email_replay", "email_mismatch", () =>
      accept(WRONG_RECIPIENT, "wrong@example.test", { token: secondToken }),
    )
    const afterWrongEmailReplay = await counts(client)
    if (
      afterWrongEmail.audits !== beforeWrongEmail.audits + 1 ||
      afterWrongEmailReplay.audits !== afterWrongEmail.audits ||
      afterWrongEmailReplay.memberships !== beforeWrongEmail.memberships ||
      afterWrongEmailReplay.grants !== beforeWrongEmail.grants
    ) {
      throw new Error("Wrong-email replay was not one-audit idempotent")
    }
    const accepted = await accept(RECIPIENT, "recipient@example.test", {
      token: secondToken,
    })
    if (!accepted.membershipId || accepted.workspaceId !== TEAM_A) {
      throw new Error("Exact-email accept omitted active membership result")
    }
    const acceptedReplay = await accept(RECIPIENT, "recipient@example.test", {
      token: secondToken,
    })
    if (!acceptedReplay.idempotentReplay || acceptedReplay.membershipId !== accepted.membershipId) {
      throw new Error("Accepted-token replay did not converge on the existing membership")
    }

    const expired = await create(OWNER, {
      workspaceId: TEAM_A,
      email: "expiry@example.test",
      workspaceRole: "MEMBER",
      idempotencyKey: "30000000-0000-4000-8000-000000000003",
    })
    const expiredToken = tokenFrom(expired)
    await client.query(
      `UPDATE "collaboration_invitations" SET "expires_at" = TIMESTAMP '2000-01-01 00:00:00' WHERE "id" = $1`,
      [invitationId(expired)],
    )
    await expectDenied("expired_token", "invitation_is_expired", () =>
      accept(EXPIRY_RECIPIENT, "expiry@example.test", { token: expiredToken }),
    )
    const expiredStatus = await client.query<{ status: string }>(
      `SELECT "status"::text FROM "collaboration_invitations" WHERE "id" = $1`,
      [invitationId(expired)],
    )
    if (expiredStatus.rows[0]?.status !== "EXPIRED") {
      throw new Error("Expired acceptance did not persist lazy EXPIRED transition")
    }

    const revoked = await create(OWNER, {
      workspaceId: TEAM_A,
      email: "revoke@example.test",
      workspaceRole: "GUEST",
      idempotencyKey: "30000000-0000-4000-8000-000000000004",
    })
    const revokedToken = tokenFrom(revoked)
    const revokeResult = await revoke(OWNER, {
      workspaceId: TEAM_A,
      invitationId: invitationId(revoked),
      idempotencyKey: "30000000-0000-4000-8000-000000000005",
    })
    if (revokeResult.invitationId !== invitationId(revoked)) {
      throw new Error("Revoke returned the wrong invitation")
    }
    const revokeReplay = await revoke(OWNER, {
      workspaceId: TEAM_A,
      invitationId: invitationId(revoked),
      idempotencyKey: "30000000-0000-4000-8000-000000000005",
    })
    if (!revokeReplay.idempotentReplay) {
      throw new Error("Revoke replay did not return an idempotent result")
    }
    await expectDenied("revoked_token", "invitation_is_revoked", () =>
      accept(REVOKE_RECIPIENT, "revoke@example.test", { token: revokedToken }),
    )

    const membership = await client.query<{ role: string; status: string }>(
      `SELECT "role"::text, "status"::text FROM "workspace_memberships"
       WHERE "workspace_id" = $1 AND "profile_id" = $2`,
      [TEAM_A, RECIPIENT],
    )
    const grant = await client.query<{ role: string; status: string }>(
      `SELECT pag."role"::text, pag."status"::text
       FROM "project_access_grants" pag
       JOIN "workspace_memberships" wm ON wm."id" = pag."membership_id"
       WHERE pag."project_id" = $1 AND wm."profile_id" = $2`,
      [PROJECT_A, RECIPIENT],
    )
    if (
      membership.rows[0]?.role !== "MEMBER" ||
      membership.rows[0]?.status !== "ACTIVE" ||
      grant.rows[0]?.role !== "EDITOR" ||
      grant.rows[0]?.status !== "ACTIVE"
    ) {
      throw new Error("Acceptance did not create the exact membership/direct grant")
    }

    const finalCounts = await counts(client)
    if (
      finalCounts.workspaces !== baseline.workspaces ||
      finalCounts.projects !== baseline.projects ||
      finalCounts.feedback !== 0 ||
      finalCounts.feedback_versions !== 0 ||
      finalCounts.memory_candidates !== 0
    ) {
      throw new Error("Invitation proof changed adjacent project/feedback/memory state")
    }
    const auditRedaction = await assertAuditRedaction(client)
    const appendOnly = await assertAppendOnly(client)
    result = {
      status: "passed",
      mode,
      task: "TEAMCOLLAB-006",
      targetClassification: "self_created_local_disposable",
      fingerprint,
      exactEmailAcceptance: true,
      reinviteOldTokenRevoked: true,
      acceptedReplayIdempotent: true,
      wrongEmailReplayIdempotent: true,
      activeMembershipReinviteDenied: true,
      expiryTransitionPersisted: true,
      revokedTokenDenied: true,
      roleEscalationDenied: true,
      crossWorkspaceProjectDenied: true,
      guestInheritedWorkspaceProjects: false,
      digestOnlyPersistence: true,
      providerCallsMade: false,
      configuredDatabaseAccessed: false,
      adjacentWrites: false,
      denials,
      auditRedaction,
      auditCatalogDriftFailClosed,
      appendOnly,
      finalCounts,
    }
  } finally {
    if (disposeAppDatabase) {
      await disposeAppDatabase().catch(() => undefined)
      disposeAppDatabase = null
    }
    if (client) {
      await client.end().catch(() => undefined)
      client = null
    }
    if (clusterStarted) {
      await command("pg_ctl", ["-D", dataDir, "-m", "fast", "-w", "stop"], {
        env: childEnv,
      }).catch(() => undefined)
      clusterStarted = false
      cleanup.clusterStopped = true
    }
    const marker = await fs.readFile(markerPath, "utf8").catch(() => null)
    if (marker?.startsWith("TEAMCOLLAB-006 self-created disposable proof")) {
      await fs.rm(tempRoot, { recursive: true, force: false })
      cleanup.tempRootRemoved = true
    }
  }

  console.log(JSON.stringify({ ...result, cleanup }, null, 2))
  if (!cleanup.clusterStopped || !cleanup.tempRootRemoved) {
    throw new Error("Disposable proof cleanup was incomplete")
  }
}

main().catch((error) => {
  const inherited = process.env.DATABASE_URL ?? ""
  console.error(
    JSON.stringify(
      {
        status: "failed",
        task: "TEAMCOLLAB-006",
        configuredDatabaseAccessed: false,
        error: sanitizeError(error, inherited),
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
})
