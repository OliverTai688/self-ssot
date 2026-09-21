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
const DATABASE_NAME = "personal_os_teamcollab_create_proof"
const TEMP_PREFIX = "personal-os-teamcollab-create-"
const OWNERSHIP_MARKER = ".teamcollab-create-proof-owned"
const CONFIRM_PHRASE =
  "I_UNDERSTAND_THIS_WRITES_ONLY_TO_A_NEW_LOCAL_DISPOSABLE_DATABASE"
const MIGRATIONS_PATH = path.join(ROOT, "prisma/migrations")
const SCHEMA_PATH = path.join(ROOT, "prisma/schema.prisma")

const ELIGIBLE_PROFILE = "00000000-0000-4000-8000-0000000000a1"
const NON_OWNER_PROFILE = "00000000-0000-4000-8000-0000000000b2"
const MISSING_PERSONAL_PROFILE = "00000000-0000-4000-8000-0000000000c3"
const UNSCOPED_PROJECT_PROFILE = "00000000-0000-4000-8000-0000000000d4"
const ELIGIBLE_PERSONAL = "10000000-0000-4000-8000-0000000000a1"
const NON_OWNER_PERSONAL = "10000000-0000-4000-8000-0000000000b2"
const UNSCOPED_PERSONAL = "10000000-0000-4000-8000-0000000000d4"
const UNSCOPED_PROJECT = "20000000-0000-4000-8000-0000000000d4"
const SUCCESS_KEY = "30000000-0000-4000-8000-0000000000a1"
const CONCURRENT_KEY = "30000000-0000-4000-8000-0000000000a2"
const SECOND_SUCCESS_KEY = "30000000-0000-4000-8000-0000000000a3"
const NON_OWNER_KEY = "30000000-0000-4000-8000-0000000000b2"
const MISSING_PERSONAL_KEY = "30000000-0000-4000-8000-0000000000c3"
const UNSCOPED_PROJECT_KEY = "30000000-0000-4000-8000-0000000000d4"
const ROLLBACK_KEY = "30000000-0000-4000-8000-0000000000e5"

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

type WorkspaceCreateResult = {
  workspaceId?: string
  id?: string
  workspace?: { id?: string }
  idempotentReplay?: boolean
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
  pnpm teamcollab:create-team:proof -- --dry-run
  TEAMCOLLAB_PROOF_ALLOW_LOCAL_WRITES=1 \\
  TEAMCOLLAB_PROOF_ALLOW_MIGRATION_APPLY=1 \\
  TEAMCOLLAB_PROOF_CONFIRM=${CONFIRM_PHRASE} \\
  pnpm teamcollab:create-team:proof -- --run

The proof accepts no database URL. It creates one database in a self-created,
loopback-only PostgreSQL cluster under a marked temporary directory, fingerprints
that target, runs the actual service, and removes the cluster.`)
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
      const port = address.port
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

function connectionUrl(port: number) {
  return `postgresql://postgres@127.0.0.1:${port}/${DATABASE_NAME}`
}

function stableHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex")
}

function expectedRequestRef(profileId: string, idempotencyKey: string) {
  return stableHash(
    `teamcollab-005b\u0000${profileId}\u0000workspace.created\u0000${idempotencyKey}`,
  )
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

function sanitizeError(error: unknown, localUrls: string[]) {
  let message = error instanceof Error ? error.message : String(error)
  for (const url of localUrls) {
    message = message.replaceAll(url, "<redacted-local-disposable-url>")
  }
  return message.slice(0, 2000)
}

async function assertTargetFingerprint(
  client: Client,
  expectedPort: number,
  expectedDataDirectory: string,
) {
  const fingerprint = await client.query<{
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
  const target = fingerprint.rows[0]
  const [targetDataDirectory, ownedDataDirectory] = await Promise.all([
    fs.realpath(target.data_directory),
    fs.realpath(expectedDataDirectory),
  ])
  const checks = {
    databaseNameMatched: target.database_name === DATABASE_NAME,
    loopbackMatched: /^(?:127\.0\.0\.1(?:\/32)?|::1(?:\/128)?)$/.test(
      target.server_address,
    ),
    portMatched: Number(target.server_port) === expectedPort,
    dataDirectoryMatched: targetDataDirectory === ownedDataDirectory,
  }
  if (!Object.values(checks).every(Boolean)) {
    throw new Error(`Disposable target fingerprint mismatch: ${JSON.stringify(checks)}`)
  }
  return checks
}

async function writeTemporaryPrismaConfig(
  configPath: string,
  schemaPath: string,
  migrationsPath: string,
  url: string,
) {
  const prismaConfigModule = await fs.realpath(path.join(ROOT, "node_modules/prisma/config.js"))
  const source = `import { defineConfig } from ${JSON.stringify(pathToFileURL(prismaConfigModule).href)}

export default defineConfig({
  schema: ${JSON.stringify(schemaPath)},
  migrations: { path: ${JSON.stringify(migrationsPath)} },
  datasource: { url: ${JSON.stringify(url)} },
})
`
  await fs.writeFile(configPath, source, { encoding: "utf8", flag: "wx" })
}

async function deployMigrations(configPath: string, childEnv: NodeJS.ProcessEnv) {
  await command(
    "pnpm",
    ["exec", "prisma", "migrate", "deploy", "--config", configPath],
    { env: childEnv },
  )
}

async function insertFixtures(client: Client) {
  await client.query(
    `
    INSERT INTO "profiles" ("id", "email", "full_name", "role", "created_at", "updated_at") VALUES
      ($1, 'eligible@example.test', 'Eligible Owner', 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, 'non-owner@example.test', 'Non Owner', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($3, 'missing-personal@example.test', 'Missing Personal', 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($4, 'unscoped@example.test', 'Unscoped Project', 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [ELIGIBLE_PROFILE, NON_OWNER_PROFILE, MISSING_PERSONAL_PROFILE, UNSCOPED_PROJECT_PROFILE],
  )
  await client.query(
    `
    INSERT INTO "workspaces" (
      "id", "type", "name", "slug", "status", "default_project_access_role",
      "ai_feedback_memory_enabled", "created_by_profile_id", "created_at", "updated_at"
    ) VALUES
      ($1, 'PERSONAL', 'Eligible Personal', 'eligible-personal', 'ACTIVE', 'VIEWER', FALSE, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, 'PERSONAL', 'Non Owner Personal', 'non-owner-personal', 'ACTIVE', 'VIEWER', FALSE, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($3, 'PERSONAL', 'Unscoped Personal', 'unscoped-personal', 'ACTIVE', 'VIEWER', FALSE, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      ELIGIBLE_PERSONAL,
      NON_OWNER_PERSONAL,
      UNSCOPED_PERSONAL,
      ELIGIBLE_PROFILE,
      NON_OWNER_PROFILE,
      UNSCOPED_PROJECT_PROFILE,
    ],
  )
  await client.query(
    `
    INSERT INTO "workspace_memberships" (
      "workspace_id", "profile_id", "role", "status", "joined_at", "created_at", "updated_at"
    ) VALUES
      ($1, $4, 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, $5, 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($3, $6, 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [
      ELIGIBLE_PERSONAL,
      NON_OWNER_PERSONAL,
      UNSCOPED_PERSONAL,
      ELIGIBLE_PROFILE,
      NON_OWNER_PROFILE,
      UNSCOPED_PROJECT_PROFILE,
    ],
  )
  await client.query(
    `
    INSERT INTO "projects" (
      "id", "owner_id", "workspace_id", "name", "status", "phase", "health",
      "visibility", "access_mode", "tasks_done", "tasks_total", "created_at", "updated_at"
    ) VALUES
      ($1, $2, NULL, 'Legacy Unscoped Project', 'ACTIVE', 'PLANNING', 'GOOD',
       'INTERNAL_ONLY', 'PRIVATE', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [UNSCOPED_PROJECT, UNSCOPED_PROJECT_PROFILE],
  )
}

function workspaceIdFrom(result: WorkspaceCreateResult) {
  const workspaceId = result.workspaceId ?? result.id ?? result.workspace?.id
  if (!workspaceId || typeof workspaceId !== "string") {
    throw new Error("Service success result omitted a workspace id")
  }
  return workspaceId
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
    const actualCode = errorCode(error)
    if (!actualCode.toLowerCase().includes(expectedCode.toLowerCase())) {
      throw new Error(`${label} returned an unexpected safe code: ${actualCode}`)
    }
    return { label, code: actualCode }
  }
  throw new Error(`${label} unexpectedly created a TEAM workspace`)
}

async function countWriteSet(client: Client) {
  const result = await client.query<{
    teams: string
    team_memberships: string
    audits: string
    invitations: string
    grants: string
    feedback: string
    feedback_versions: string
    memory_candidates: string
  }>(`
    SELECT
      (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'TEAM') AS teams,
      (SELECT COUNT(*) FROM "workspace_memberships" wm
       JOIN "workspaces" w ON w."id" = wm."workspace_id"
       WHERE w."type" = 'TEAM') AS team_memberships,
      (SELECT COUNT(*) FROM "operating_audit_events") AS audits,
      (SELECT COUNT(*) FROM "collaboration_invitations") AS invitations,
      (SELECT COUNT(*) FROM "project_access_grants") AS grants,
      (SELECT COUNT(*) FROM "project_feedback") AS feedback,
      (SELECT COUNT(*) FROM "project_feedback_versions") AS feedback_versions,
      (SELECT COUNT(*) FROM "project_memory_candidates") AS memory_candidates
  `)
  return Object.fromEntries(
    Object.entries(result.rows[0]).map(([key, value]) => [key, Number(value)]),
  ) as Record<keyof (typeof result.rows)[number], number>
}

function assertEqualWriteSet(
  before: Record<string, number>,
  after: Record<string, number>,
  label: string,
) {
  const changed = Object.keys(before).filter((key) => before[key] !== after[key])
  if (changed.length > 0) {
    throw new Error(`${label} changed persisted rows: ${changed.join(", ")}`)
  }
}

async function assertSuccessfulWriteSet(
  client: Client,
  workspaceId: string,
  expectedName: string,
  rawKey: string,
) {
  const workspace = await client.query<{
    id: string
    name: string
    type: string
    status: string
    created_by_profile_id: string
    ai_feedback_memory_enabled: boolean
    role: string
    membership_status: string
  }>(
    `
    SELECT w."id"::text, w."name", w."type"::text, w."status"::text,
           w."created_by_profile_id"::text, w."ai_feedback_memory_enabled",
           wm."role"::text, wm."status"::text AS membership_status
    FROM "workspaces" w
    JOIN "workspace_memberships" wm
      ON wm."workspace_id" = w."id" AND wm."profile_id" = $2
    WHERE w."id" = $1
    `,
    [workspaceId, ELIGIBLE_PROFILE],
  )
  const row = workspace.rows[0]
  if (
    !row ||
    row.name !== expectedName ||
    row.type !== "TEAM" ||
    row.status !== "ACTIVE" ||
    row.created_by_profile_id !== ELIGIBLE_PROFILE ||
    row.ai_feedback_memory_enabled !== false ||
    row.role !== "OWNER" ||
    row.membership_status !== "ACTIVE"
  ) {
    throw new Error("Eligible create did not persist the exact TEAM + active OWNER write set")
  }

  const audit = await client.query<Record<string, unknown>>(
    `SELECT * FROM "operating_audit_events" WHERE "target_ref" = $1`,
    [workspaceId],
  )
  const event = audit.rows[0]
  const expectedHashedRequestRef = expectedRequestRef(ELIGIBLE_PROFILE, rawKey)
  const exact =
    audit.rowCount === 1 &&
    event.actor_type === "owner" &&
    event.actor_ref === ELIGIBLE_PROFILE &&
    event.request_ref === expectedHashedRequestRef &&
    event.request_ref !== rawKey &&
    event.module_key === "work" &&
    event.action === "workspace.created" &&
    event.target_type === "workspace" &&
    event.target_ref === workspaceId &&
    event.result === "success" &&
    event.risk_level === "HIGH" &&
    event.approval_level === "owner_review" &&
    event.human_approval_required === true &&
    event.source_kind === "server_action" &&
    event.redaction_version === "teamcollab-005b-v1" &&
    event.retention_class === "high_risk_7_year_review_required" &&
    JSON.stringify(event.metadata) === "{}"
  const redactedFields = [
    "actor_display",
    "session_ref",
    "ip_address_hash",
    "user_agent_hash",
    "source_ref",
    "agent_ref",
    "operation_id",
    "proposal_ref",
    "proof_ref",
    "before_ref",
    "after_ref",
  ]
  const noSecret = redactedFields.every((field) => event[field] === null)
  const serialized = JSON.stringify(event)
  const noFixtureSecrets = ![
    "eligible@example.test",
    "Eligible Owner",
    expectedName,
    rawKey,
  ].some((secret) => serialized.includes(secret))
  if (!exact || !noSecret || !noFixtureSecrets) {
    throw new Error("workspace.created audit failed exact-shape or no-secret assertions")
  }
  return {
    requestRefIsSha256: true,
    metadataEmpty: true,
    sensitiveRefsNull: true,
  }
}

async function assertAppendOnly(client: Client, workspaceId: string) {
  const attempts: Array<{ operation: "update" | "delete"; sql: string }> = [
    {
      operation: "update",
      sql: `UPDATE "operating_audit_events" SET "target_display" = 'mutated' WHERE "target_ref" = $1`,
    },
    {
      operation: "delete",
      sql: `DELETE FROM "operating_audit_events" WHERE "target_ref" = $1`,
    },
  ]
  const evidence = []
  for (const attempt of attempts) {
    try {
      await client.query(attempt.sql, [workspaceId])
      throw new Error(`${attempt.operation} unexpectedly mutated append-only audit`)
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : ""
      if (code !== "55000") throw error
      evidence.push({ operation: attempt.operation, sqlstate: code })
    }
  }
  const remaining = await client.query(
    `SELECT COUNT(*)::int AS count FROM "operating_audit_events" WHERE "target_ref" = $1`,
    [workspaceId],
  )
  if (remaining.rows[0]?.count !== 1) {
    throw new Error("Append-only audit row was not preserved")
  }
  return evidence
}

async function assertAuditCatalogDriftFailClosed(
  client: Client,
  getReadiness: (profileId: string) => Promise<{ available: boolean; code: string }>,
  createTeamWorkspaceForProfile: (
    profileId: string,
    input: { name: string; idempotencyKey: string },
  ) => Promise<WorkspaceCreateResult>,
) {
  const driftCases = [
    {
      id: "append_only_trigger",
      drop: `DROP TRIGGER "operating_audit_events_append_only" ON "operating_audit_events"`,
      restore: `
        CREATE TRIGGER "operating_audit_events_append_only"
        BEFORE UPDATE OR DELETE ON "operating_audit_events"
        FOR EACH ROW EXECUTE FUNCTION "prevent_operating_audit_event_mutation"()
      `,
    },
    {
      id: "workspace_created_check",
      drop: `ALTER TABLE "operating_audit_events" DROP CONSTRAINT "operating_audit_events_workspace_created_only_check"`,
      restore: `
        ALTER TABLE "operating_audit_events"
        ADD CONSTRAINT "operating_audit_events_workspace_created_only_check"
        CHECK (
          "actor_type" = 'owner'
          AND "actor_ref" IS NOT NULL
          AND "request_ref" IS NOT NULL
          AND "module_key" = 'work'
          AND "action" = 'workspace.created'
          AND "target_type" = 'workspace'
          AND "target_ref" IS NOT NULL
          AND "result" = 'success'
          AND "risk_level" = 'HIGH'
          AND "approval_level" = 'owner_review'
          AND "human_approval_required" = TRUE
          AND "source_kind" = 'server_action'
          AND "redaction_version" = 'teamcollab-005b-v1'
          AND "retention_class" = 'high_risk_7_year_review_required'
        )
      `,
    },
    {
      id: "request_ref_hash_check",
      drop: `ALTER TABLE "operating_audit_events" DROP CONSTRAINT "operating_audit_events_request_ref_hash_check"`,
      restore: `
        ALTER TABLE "operating_audit_events"
        ADD CONSTRAINT "operating_audit_events_request_ref_hash_check"
        CHECK ("request_ref" ~ '^[0-9a-f]{64}$')
      `,
    },
    {
      id: "no_secret_metadata_check",
      drop: `ALTER TABLE "operating_audit_events" DROP CONSTRAINT "operating_audit_events_no_secret_metadata_check"`,
      restore: `
        ALTER TABLE "operating_audit_events"
        ADD CONSTRAINT "operating_audit_events_no_secret_metadata_check"
        CHECK ("metadata" = '{}'::jsonb)
      `,
    },
    {
      id: "actor_action_request_unique_index",
      drop: `DROP INDEX "operating_audit_events_actor_action_request_unique"`,
      restore: `
        CREATE UNIQUE INDEX "operating_audit_events_actor_action_request_unique"
        ON "operating_audit_events"("actor_ref", "action", "request_ref")
      `,
    },
    {
      id: "same_name_weakened_append_only_function",
      drop: `
        CREATE OR REPLACE FUNCTION "prevent_operating_audit_event_mutation"()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
          RETURN OLD;
        END;
        $$
      `,
      restore: `
        CREATE OR REPLACE FUNCTION "prevent_operating_audit_event_mutation"()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
          RAISE EXCEPTION 'operating_audit_events is append-only'
            USING ERRCODE = '55000';
        END;
        $$
      `,
    },
    {
      id: "same_name_weakened_workspace_created_check",
      drop: `
        ALTER TABLE "operating_audit_events"
          DROP CONSTRAINT "operating_audit_events_workspace_created_only_check";
        ALTER TABLE "operating_audit_events"
          ADD CONSTRAINT "operating_audit_events_workspace_created_only_check"
          CHECK ("actor_type" = 'owner')
      `,
      restore: `
        ALTER TABLE "operating_audit_events"
          DROP CONSTRAINT "operating_audit_events_workspace_created_only_check";
        ALTER TABLE "operating_audit_events"
        ADD CONSTRAINT "operating_audit_events_workspace_created_only_check"
        CHECK (
          "actor_type" = 'owner'
          AND "actor_ref" IS NOT NULL
          AND "request_ref" IS NOT NULL
          AND "module_key" = 'work'
          AND "action" = 'workspace.created'
          AND "target_type" = 'workspace'
          AND "target_ref" IS NOT NULL
          AND "result" = 'success'
          AND "risk_level" = 'HIGH'
          AND "approval_level" = 'owner_review'
          AND "human_approval_required" = TRUE
          AND "source_kind" = 'server_action'
          AND "redaction_version" = 'teamcollab-005b-v1'
          AND "retention_class" = 'high_risk_7_year_review_required'
        )
      `,
    },
    {
      id: "same_name_weakened_request_ref_check",
      drop: `
        ALTER TABLE "operating_audit_events"
          DROP CONSTRAINT "operating_audit_events_request_ref_hash_check";
        ALTER TABLE "operating_audit_events"
          ADD CONSTRAINT "operating_audit_events_request_ref_hash_check"
          CHECK ("request_ref" IS NOT NULL)
      `,
      restore: `
        ALTER TABLE "operating_audit_events"
          DROP CONSTRAINT "operating_audit_events_request_ref_hash_check";
        ALTER TABLE "operating_audit_events"
          ADD CONSTRAINT "operating_audit_events_request_ref_hash_check"
          CHECK ("request_ref" ~ '^[0-9a-f]{64}$')
      `,
    },
    {
      id: "same_name_weakened_no_secret_check",
      drop: `
        ALTER TABLE "operating_audit_events"
          DROP CONSTRAINT "operating_audit_events_no_secret_metadata_check";
        ALTER TABLE "operating_audit_events"
          ADD CONSTRAINT "operating_audit_events_no_secret_metadata_check"
          CHECK (jsonb_typeof("metadata") = 'object')
      `,
      restore: `
        ALTER TABLE "operating_audit_events"
          DROP CONSTRAINT "operating_audit_events_no_secret_metadata_check";
        ALTER TABLE "operating_audit_events"
          ADD CONSTRAINT "operating_audit_events_no_secret_metadata_check"
          CHECK ("metadata" = '{}'::jsonb)
      `,
    },
    {
      id: "same_name_weakened_partial_unique_index",
      drop: `
        DROP INDEX "operating_audit_events_actor_action_request_unique";
        CREATE UNIQUE INDEX "operating_audit_events_actor_action_request_unique"
          ON "operating_audit_events"("actor_ref", "action", "request_ref")
          WHERE "request_ref" IS NOT NULL
      `,
      restore: `
        DROP INDEX "operating_audit_events_actor_action_request_unique";
        CREATE UNIQUE INDEX "operating_audit_events_actor_action_request_unique"
          ON "operating_audit_events"("actor_ref", "action", "request_ref")
      `,
    },
  ] as const

  const evidence = []
  for (const driftCase of driftCases) {
    const baseline = await countWriteSet(client)
    await client.query(driftCase.drop)
    try {
      const readiness = await getReadiness(ELIGIBLE_PROFILE)
      if (readiness.available || readiness.code !== "audit_storage_unavailable") {
        throw new Error(
          `${driftCase.id} drift did not fail closed in readiness: ${JSON.stringify(readiness)}`,
        )
      }
      const commandDenial = await expectDenied(
        `audit_storage_unavailable_${driftCase.id}`,
        "audit_storage_unavailable",
        () =>
          createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
            name: `Drift Denied ${driftCase.id}`,
            idempotencyKey: crypto.randomUUID(),
          }),
      )
      assertEqualWriteSet(
        baseline,
        await countWriteSet(client),
        `${driftCase.id} drift denial`,
      )
      evidence.push({
        artifact: driftCase.id,
        readinessCode: readiness.code,
        commandCode: commandDenial.code,
        writes: 0,
      })
    } finally {
      await client.query(driftCase.restore)
    }

    const restored = await getReadiness(ELIGIBLE_PROFILE)
    if (!restored.available || restored.code !== "ready") {
      const triggerCatalog = await client.query(`
        SELECT pg_get_triggerdef(trigger_row.oid, TRUE) AS trigger_definition,
               btrim(regexp_replace(trigger_function.prosrc, '\\s+', ' ', 'g')) AS function_body,
               trigger_language.lanname AS function_language,
               trigger_function.prorettype::regtype::text AS function_return_type
        FROM pg_trigger trigger_row
        JOIN pg_class table_row ON table_row.oid = trigger_row.tgrelid
        JOIN pg_proc trigger_function ON trigger_function.oid = trigger_row.tgfoid
        JOIN pg_language trigger_language ON trigger_language.oid = trigger_function.prolang
        WHERE table_row.relname = 'operating_audit_events'
          AND trigger_row.tgname = 'operating_audit_events_append_only'
      `)
      const constraintCatalog = await client.query(`
        SELECT conname, pg_get_constraintdef(oid, TRUE) AS definition
        FROM pg_constraint
        WHERE conrelid = to_regclass('operating_audit_events')
          AND contype = 'c'
        ORDER BY conname
      `)
      const indexCatalog = await client.query(`
        SELECT index_row.indisunique, index_row.indisvalid, index_row.indisready,
               index_row.indnkeyatts, index_row.indnatts,
               index_row.indpred IS NULL AS no_predicate,
               index_row.indexprs IS NULL AS no_expressions,
               pg_get_indexdef(index_row.indexrelid, 1, TRUE) AS key_1,
               pg_get_indexdef(index_row.indexrelid, 2, TRUE) AS key_2,
               pg_get_indexdef(index_row.indexrelid, 3, TRUE) AS key_3
        FROM pg_index index_row
        JOIN pg_class index_class ON index_class.oid = index_row.indexrelid
        WHERE index_class.relname = 'operating_audit_events_actor_action_request_unique'
      `)
      throw new Error(
        `${driftCase.id} restoration did not restore readiness: ${JSON.stringify({ restored, trigger: triggerCatalog.rows, constraints: constraintCatalog.rows, index: indexCatalog.rows })}`,
      )
    }
  }
  return evidence
}

async function main() {
  const mode = parseMode()
  if (mode === "help") {
    help()
    return
  }

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
          task: "TEAMCOLLAB-005B",
          targetClassification: "self_created_local_disposable",
          databaseConnectionAllowed: false,
          disposableMigrationApplyAllowed: false,
          configuredDatabaseAccessAllowed: false,
          databaseUrlArgumentAccepted: false,
          inheritedDatabaseEnvironmentIgnored: true,
          plannedCases: [
            "eligible_transactional_create",
            "idempotent_replay",
            "concurrent_same_idempotency_submission",
            "direct_service_invalid_name_and_uuid",
            "platform_owner_denial",
            "personal_workspace_required",
            "owner_projects_unscoped",
            "db_push_like_audit_catalog_drift_fail_closed",
            "audit_failure_rollback",
            "no_secret_audit",
            "append_only_sqlstate_55000",
            "no_invite_grant_feedback_or_memory_side_effects",
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
    throw new Error(
      "Disposable write gates are incomplete. Run --help for the exact local-only confirmation.",
    )
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
  const localUrl = connectionUrl(port)
  const childEnv = scrubDatabaseEnvironment()
  const cleanup = { clusterStopped: false, tempRootRemoved: false }
  let clusterStarted = false
  let client: Client | null = null
  let disposeAppDatabase: (() => Promise<void>) | null = null
  let result: Record<string, unknown> | null = null

  try {
    await fs.writeFile(markerPath, "TEAMCOLLAB-005B self-created disposable proof\n", {
      encoding: "utf8",
      flag: "wx",
    })
    await fs.cp(MIGRATIONS_PATH, isolatedMigrations, {
      recursive: true,
      errorOnExist: true,
    })
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
    await deployMigrations(prismaConfig, childEnv)
    await insertFixtures(client)

    replaceProcessDatabaseEnvironment(localUrl)
    process.env.PERSONAL_OS_ALLOW_DATABASE_POOL_DISPOSAL =
      "self_created_disposable"
    const service = await import("../src/lib/services/team-workspace-command.service")
    const dbModule = await import("../src/lib/db")
    disposeAppDatabase = dbModule.disposeDatabaseConnections
    const createTeamWorkspaceForProfile = service.createTeamWorkspaceForProfile as (
      profileId: string,
      input: { name: string; idempotencyKey: string },
    ) => Promise<WorkspaceCreateResult>
    if (typeof createTeamWorkspaceForProfile !== "function") {
      throw new Error("createTeamWorkspaceForProfile service export is unavailable")
    }
    const getTeamWorkspaceCreateReadinessForProfile =
      service.getTeamWorkspaceCreateReadinessForProfile as (
        profileId: string,
      ) => Promise<{ available: boolean; code: string }>
    if (typeof getTeamWorkspaceCreateReadinessForProfile !== "function") {
      throw new Error("getTeamWorkspaceCreateReadinessForProfile service export is unavailable")
    }

    const invalidInputBaseline = await countWriteSet(client)
    const directInvalidInputs = [
      await expectDenied("direct_invalid_name", "unavailable", () =>
        createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
          name: " ",
          idempotencyKey: crypto.randomUUID(),
        }),
      ),
      await expectDenied("direct_invalid_uuid", "unavailable", () =>
        createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
          name: "Direct Invalid UUID",
          idempotencyKey: "not-a-uuid",
        }),
      ),
    ]
    assertEqualWriteSet(
      invalidInputBaseline,
      await countWriteSet(client),
      "Direct invalid service inputs",
    )

    const auditCatalogDriftFailClosed = await assertAuditCatalogDriftFailClosed(
      client,
      getTeamWorkspaceCreateReadinessForProfile,
      createTeamWorkspaceForProfile,
    )

    const first = await createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
      name: "Proof Team Alpha",
      idempotencyKey: SUCCESS_KEY,
    })
    const firstWorkspaceId = workspaceIdFrom(first)
    const noSecretAudit = await assertSuccessfulWriteSet(
      client,
      firstWorkspaceId,
      "Proof Team Alpha",
      SUCCESS_KEY,
    )
    const afterFirst = await countWriteSet(client)
    if (afterFirst.teams !== 1 || afterFirst.team_memberships !== 1 || afterFirst.audits !== 1) {
      throw new Error("Eligible create did not add exactly one TEAM, OWNER membership, and audit")
    }

    const replay = await createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
      name: "Proof Team Alpha",
      idempotencyKey: SUCCESS_KEY,
    })
    const replayWorkspaceId = workspaceIdFrom(replay)
    const afterReplay = await countWriteSet(client)
    if (replayWorkspaceId !== firstWorkspaceId) {
      throw new Error("Idempotent replay returned a different workspace")
    }
    assertEqualWriteSet(afterFirst, afterReplay, "Idempotent replay")

    const beforeConcurrent = await countWriteSet(client)
    const concurrentResults = await Promise.all([
      createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
        name: "Proof Concurrent Team",
        idempotencyKey: CONCURRENT_KEY,
      }),
      createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
        name: "Proof Concurrent Team",
        idempotencyKey: CONCURRENT_KEY,
      }),
    ])
    const concurrentWorkspaceIds = concurrentResults.map(workspaceIdFrom)
    const afterConcurrent = await countWriteSet(client)
    if (
      new Set(concurrentWorkspaceIds).size !== 1 ||
      concurrentResults.filter((entry) => entry.idempotentReplay).length !== 1 ||
      afterConcurrent.teams !== beforeConcurrent.teams + 1 ||
      afterConcurrent.team_memberships !== beforeConcurrent.team_memberships + 1 ||
      afterConcurrent.audits !== beforeConcurrent.audits + 1
    ) {
      throw new Error(
        "Concurrent same-idempotency submissions did not converge on one transactional write set",
      )
    }

    const second = await createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
      name: "Proof Team Beta",
      idempotencyKey: SECOND_SUCCESS_KEY,
    })
    const secondWorkspaceId = workspaceIdFrom(second)
    if (secondWorkspaceId === firstWorkspaceId) {
      throw new Error("A distinct idempotency key did not create a distinct TEAM")
    }
    const afterSecond = await countWriteSet(client)
    if (afterSecond.teams !== 3 || afterSecond.team_memberships !== 3 || afterSecond.audits !== 3) {
      throw new Error("Distinct eligible create did not add one transactional write set")
    }

    const denialBaseline = await countWriteSet(client)
    const denials = [
      await expectDenied("not_platform_owner", "not_platform_owner", () =>
        createTeamWorkspaceForProfile(NON_OWNER_PROFILE, {
          name: "Denied Non Owner",
          idempotencyKey: NON_OWNER_KEY,
        }),
      ),
      await expectDenied("personal_workspace_required", "personal_workspace_required", () =>
        createTeamWorkspaceForProfile(MISSING_PERSONAL_PROFILE, {
          name: "Denied Missing Personal",
          idempotencyKey: MISSING_PERSONAL_KEY,
        }),
      ),
      await expectDenied("owner_projects_unscoped", "owner_projects_unscoped", () =>
        createTeamWorkspaceForProfile(UNSCOPED_PROJECT_PROFILE, {
          name: "Denied Unscoped",
          idempotencyKey: UNSCOPED_PROJECT_KEY,
        }),
      ),
    ]
    assertEqualWriteSet(denialBaseline, await countWriteSet(client), "Denied cases")

    await client.query(`
      CREATE FUNCTION "teamcollab_create_force_audit_failure"()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced TEAMCOLLAB-005B rollback proof';
      END;
      $$;
      CREATE TRIGGER "teamcollab_create_force_audit_failure"
      BEFORE INSERT ON "operating_audit_events"
      FOR EACH ROW EXECUTE FUNCTION "teamcollab_create_force_audit_failure"();
    `)
    const rollbackBaseline = await countWriteSet(client)
    let rollbackRejected = false
    try {
      await createTeamWorkspaceForProfile(ELIGIBLE_PROFILE, {
        name: "Proof Rollback Team",
        idempotencyKey: ROLLBACK_KEY,
      })
    } catch {
      rollbackRejected = true
    }
    await client.query(`
      DROP TRIGGER "teamcollab_create_force_audit_failure" ON "operating_audit_events";
      DROP FUNCTION "teamcollab_create_force_audit_failure"();
    `)
    if (!rollbackRejected) throw new Error("Forced audit failure did not reject the service call")
    assertEqualWriteSet(rollbackBaseline, await countWriteSet(client), "Audit rollback")

    const appendOnly = await assertAppendOnly(client, firstWorkspaceId)
    const finalWriteSet = await countWriteSet(client)
    const noScopeExpansion =
      finalWriteSet.invitations === 0 &&
      finalWriteSet.grants === 0 &&
      finalWriteSet.feedback === 0 &&
      finalWriteSet.feedback_versions === 0 &&
      finalWriteSet.memory_candidates === 0
    if (!noScopeExpansion) {
      throw new Error("Create-team slice wrote invite/grant/feedback/version/memory rows")
    }

    result = {
      status: "passed",
      mode,
      task: "TEAMCOLLAB-005B",
      targetClassification: "self_created_local_disposable",
      configuredDatabaseAccessAllowed: false,
      databaseUrlArgumentAccepted: false,
      inheritedDatabaseEnvironmentIgnored: true,
      safety: {
        gatesSatisfied: true,
        loopbackOnly: true,
        selfCreatedCluster: true,
        markedTemporaryRoot: true,
        fingerprint,
      },
      cases: {
        eligibleTransactionalCreate: true,
        idempotentReplay: { sameWorkspaceId: true, duplicateRows: 0 },
        concurrentSameIdempotency: {
          sameWorkspaceId: true,
          freshResults: 1,
          replayResults: 1,
          duplicateRows: 0,
        },
        directInvalidInputs,
        distinctRequestCreatesDistinctTeam: true,
        denials,
        auditCatalogDriftFailClosed,
        auditFailureRollback: true,
        noSecretAudit,
        appendOnly,
        noScopeExpansion,
      },
      finalWriteSet,
    }
  } catch (error) {
    result = {
      status: "failed",
      mode,
      task: "TEAMCOLLAB-005B",
      targetClassification: "self_created_local_disposable",
      configuredDatabaseAccessAllowed: false,
      databaseUrlArgumentAccepted: false,
      error: sanitizeError(error, [localUrl]),
    }
    process.exitCode = 1
  } finally {
    if (disposeAppDatabase) await disposeAppDatabase().catch(() => undefined)
    if (client) await client.end().catch(() => undefined)
    if (clusterStarted) {
      try {
        await command("pg_ctl", ["-D", dataDir, "-m", "fast", "-w", "stop"])
        cleanup.clusterStopped = true
      } catch {
        process.exitCode = 1
      }
    }

    const resolvedRoot = path.resolve(tempRoot)
    const expectedParent = path.resolve(os.tmpdir()) + path.sep
    const markerExists = await fs.access(markerPath).then(
      () => true,
      () => false,
    )
    if (
      markerExists &&
      resolvedRoot.startsWith(expectedParent) &&
      path.basename(resolvedRoot).startsWith(TEMP_PREFIX)
    ) {
      try {
        await fs.rm(resolvedRoot, { recursive: true, force: false })
        cleanup.tempRootRemoved = true
      } catch {
        process.exitCode = 1
      }
    } else {
      process.exitCode = 1
    }

    result = { ...(result ?? { status: "failed" }), cleanup }
    if (!cleanup.clusterStopped || !cleanup.tempRootRemoved) {
      result.status = "failed"
      process.exitCode = 1
    }
    console.log(JSON.stringify(result, null, 2))
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify({ status: "failed", error: sanitizeError(error, []) }, null, 2),
  )
  process.exitCode = 1
})
