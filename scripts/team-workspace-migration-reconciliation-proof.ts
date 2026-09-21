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
const CLEAN_DATABASE = "personal_os_teamcollab_reconcile_clean"
const DRIFT_DATABASE = "personal_os_teamcollab_reconcile_drift"
const TEMP_PREFIX = "personal-os-teamcollab-reconcile-"
const OWNERSHIP_MARKER = ".teamcollab-reconciliation-proof-owned"
const CANONICAL_MIGRATION_NAME = "20260727150000_team_workspace_collaboration"
const CONFIRM_PHRASE =
  "I_UNDERSTAND_THIS_WRITES_ONLY_TO_A_NEW_LOCAL_DISPOSABLE_DATABASE"
const CANONICAL_MIGRATION_PATH = path.join(
  ROOT,
  "prisma/migrations",
  CANONICAL_MIGRATION_NAME,
  "migration.sql",
)
const REVIEW_REPAIR_PATH = path.join(
  ROOT,
  "prisma/migration-drafts/20260727_teamcollab_005a_configured_drift_repair/repair.sql",
)
const MIGRATIONS_PATH = path.join(ROOT, "prisma/migrations")
const SCHEMA_PATH = path.join(ROOT, "prisma/schema.prisma")

const PROFILE_A = "00000000-0000-4000-8000-0000000000a1"
const PROFILE_B = "00000000-0000-4000-8000-0000000000b2"
const PROJECT_A = "10000000-0000-4000-8000-0000000000a1"
const PROJECT_B = "10000000-0000-4000-8000-0000000000b2"

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
type ProjectSnapshotRow = {
  id: string
  owner_id: string
  visibility: string
  client_token: string | null
}

function parseMode(): ProofMode | "help" {
  const args = process.argv.slice(2)
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
  pnpm exec tsx scripts/team-workspace-migration-reconciliation-proof.ts --dry-run
  TEAMCOLLAB_PROOF_ALLOW_LOCAL_WRITES=1 \\
  TEAMCOLLAB_PROOF_ALLOW_MIGRATION_APPLY=1 \\
  TEAMCOLLAB_PROOF_CONFIRM=${CONFIRM_PHRASE} \\
  pnpm exec tsx scripts/team-workspace-migration-reconciliation-proof.ts --run

The proof accepts no database URL. It creates two databases in one self-created,
loopback-only PostgreSQL cluster under a marked temporary directory, then removes it.`)
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

function stableHash(value: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function scrubDatabaseEnvironment() {
  const childEnv = { ...process.env }
  for (const key of DATABASE_ENV_KEYS) delete childEnv[key]
  return childEnv
}

function sanitizeError(error: unknown, localUrls: string[]) {
  let message = error instanceof Error ? error.message : String(error)
  for (const url of localUrls) message = message.replaceAll(url, "<redacted-local-disposable-url>")
  return message.slice(0, 2000)
}

function connectionUrl(databaseName: string, port: number) {
  return `postgresql://postgres@127.0.0.1:${port}/${databaseName}`
}

async function assertTargetFingerprint(
  client: Client,
  expectedDatabase: string,
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
  const loopbackMatched = /^(?:127\.0\.0\.1(?:\/32)?|::1(?:\/128)?)$/.test(
    target.server_address,
  )
  const checks = {
    databaseNameMatched: target.database_name === expectedDatabase,
    loopbackMatched,
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
  return await command(
    "pnpm",
    ["exec", "prisma", "migrate", "deploy", "--config", configPath],
    { env: childEnv },
  )
}

async function insertLegacyFixture(client: Client) {
  await client.query(
    `
    INSERT INTO "profiles" ("id", "email", "full_name", "role", "created_at", "updated_at") VALUES
      ($1, 'reconcile-a@example.test', 'Reconcile A', 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($2, 'reconcile-b@example.test', 'Reconcile B', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [PROFILE_A, PROFILE_B],
  )
  await client.query(
    `
    INSERT INTO "projects" (
      "id", "owner_id", "name", "status", "phase", "health", "visibility", "client_token",
      "tasks_done", "tasks_total", "created_at", "updated_at"
    ) VALUES
      ($3, $1, 'Reconcile Client-visible Project', 'ACTIVE', 'PLANNING', 'GOOD',
       'CLIENT_VISIBLE', 'reconcile-client-token-a', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ($4, $2, 'Reconcile Internal Project', 'ACTIVE', 'PLANNING', 'GOOD',
       'INTERNAL_ONLY', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    [PROFILE_A, PROFILE_B, PROJECT_A, PROJECT_B],
  )
  return await projectSnapshot(client)
}

async function projectSnapshot(client: Client) {
  const snapshot = await client.query<ProjectSnapshotRow>(`
    SELECT "id"::text, "owner_id"::text, "visibility"::text, "client_token"
    FROM "projects"
    ORDER BY "id"
  `)
  return { rows: snapshot.rows, hash: stableHash(snapshot.rows) }
}

function buildExpectedRepairCore(canonicalSql: string) {
  const partialIndex = canonicalSql.match(
    /CREATE UNIQUE INDEX "workspaces_active_personal_creator_unique"[\s\S]*?;\s*/,
  )?.[0]
  const backfill = canonicalSql.match(
    /-- Backfill: one active PERSONAL workspace and OWNER membership per legacy profile\.([\s\S]*?)ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey"/,
  )?.[1]
  if (!partialIndex || !backfill) {
    throw new Error("Could not derive the reviewed drift repair from the canonical TEAMCOLLAB SQL")
  }
  return `${backfill.trim()}\n\n${partialIndex.trim()}\n`
}

function normalizeSql(sql: string) {
  return sql.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim()
}

function assertReviewRepairArtifact(repairSql: string, expectedRepairCore: string) {
  const workspaceInsert = repairSql.indexOf('INSERT INTO "workspaces"')
  const membershipInsert = repairSql.indexOf('INSERT INTO "workspace_memberships"')
  const projectBackfill = repairSql.indexOf('UPDATE "projects"')
  const partialIndex = repairSql.indexOf(
    'CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_active_personal_creator_unique"',
  )
  const ordered =
    workspaceInsert >= 0 &&
    workspaceInsert < membershipInsert &&
    membershipInsert < projectBackfill &&
    projectBackfill < partialIndex
  if (!ordered) {
    throw new Error(
      "Reviewed repair must create/backfill PERSONAL data before creating the partial unique index",
    )
  }
  const normalizedRepair = normalizeSql(repairSql)
  const requiredMarkers = [
    "TEAMCOLLAB-005A configured-target personal-workspace repair",
    "BEGIN;",
    "COMMIT;",
    "pg_advisory_xact_lock",
    "ON CONFLICT",
    'UPDATE "projects"',
    'CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_active_personal_creator_unique"',
    "migration_ledger_count",
  ]
  const missingMarkers = requiredMarkers.filter((marker) => !repairSql.includes(marker))
  const expectedStatements = normalizeSql(expectedRepairCore)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
  const comparableCorePresent = expectedStatements.every((statement) => {
    if (statement.startsWith('CREATE UNIQUE INDEX "workspaces_active_personal_creator_unique"')) {
      return normalizedRepair.includes(
        statement.replace("CREATE UNIQUE INDEX", "CREATE UNIQUE INDEX IF NOT EXISTS"),
      )
    }
    if (statement.startsWith('UPDATE "projects" p')) {
      return normalizedRepair.includes('UPDATE "projects" AS project')
    }
    return normalizedRepair.includes(statement.slice(0, Math.min(statement.length, 80)))
  })
  if (missingMarkers.length > 0 || !comparableCorePresent) {
    throw new Error(
      `Reviewed repair is missing required reconciliation content: ${missingMarkers.join(", ") || "canonical core"}`,
    )
  }
  return { ordered, comparableCorePresent }
}

async function applySqlFile(
  databaseName: string,
  port: number,
  sqlPath: string,
  childEnv: NodeJS.ProcessEnv,
) {
  await command(
    "psql",
    [
      "-X",
      "-h",
      "127.0.0.1",
      "-p",
      String(port),
      "-U",
      "postgres",
      "-d",
      databaseName,
      "-v",
      "ON_ERROR_STOP=1",
      "--single-transaction",
      "-f",
      sqlPath,
    ],
    { env: childEnv },
  )
}

async function applySqlText(client: Client, sql: string) {
  await client.query("BEGIN")
  try {
    await client.query(sql)
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  }
}

async function applyReviewRepair(client: Client, repairSql: string) {
  try {
    await client.query(repairSql)
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  }
}

async function migrationLedger(client: Client) {
  const result = await client.query<{
    migration_name: string
    finished: boolean
    rolled_back: boolean
  }>(`
    SELECT migration_name,
           finished_at IS NOT NULL AS finished,
           rolled_back_at IS NOT NULL AS rolled_back
    FROM "_prisma_migrations"
    ORDER BY started_at, migration_name
  `)
  return result.rows
}

async function assertDriftShape(client: Client, projectHashBefore: string) {
  const shape = await client.query<{
    collaboration_table_count: string
    collaboration_column_count: string
    workspace_count: string
    membership_count: string
    orphan_project_count: string
    partial_index_count: string
    team_count: string
    invitation_count: string
    grant_count: string
    feedback_count: string
    feedback_version_count: string
    memory_count: string
  }>(`
    SELECT
      (SELECT COUNT(*) FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN (
         'workspaces', 'workspace_memberships', 'collaboration_invitations',
         'project_access_grants', 'project_feedback', 'project_feedback_versions',
         'project_memory_candidates'
       )) AS collaboration_table_count,
      (SELECT COUNT(*) FROM information_schema.columns
       WHERE table_schema = 'public' AND (
         (table_name = 'profiles' AND column_name = 'auth_user_id') OR
         (table_name = 'projects' AND column_name IN ('workspace_id', 'access_mode'))
       )) AS collaboration_column_count,
      (SELECT COUNT(*) FROM "workspaces") AS workspace_count,
      (SELECT COUNT(*) FROM "workspace_memberships") AS membership_count,
      (SELECT COUNT(*) FROM "projects" WHERE "workspace_id" IS NULL) AS orphan_project_count,
      (SELECT COUNT(*) FROM pg_indexes
       WHERE schemaname = 'public' AND indexname = 'workspaces_active_personal_creator_unique') AS partial_index_count,
      (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'TEAM') AS team_count,
      (SELECT COUNT(*) FROM "collaboration_invitations") AS invitation_count,
      (SELECT COUNT(*) FROM "project_access_grants") AS grant_count,
      (SELECT COUNT(*) FROM "project_feedback") AS feedback_count,
      (SELECT COUNT(*) FROM "project_feedback_versions") AS feedback_version_count,
      (SELECT COUNT(*) FROM "project_memory_candidates") AS memory_count
  `)
  const row = shape.rows[0]
  const projectSnapshotAfter = await projectSnapshot(client)
  const expected = {
    collaboration_table_count: "7",
    collaboration_column_count: "3",
    workspace_count: "0",
    membership_count: "0",
    orphan_project_count: "2",
    partial_index_count: "0",
    team_count: "0",
    invitation_count: "0",
    grant_count: "0",
    feedback_count: "0",
    feedback_version_count: "0",
    memory_count: "0",
  }
  if (
    Object.entries(expected).some(([key, value]) => row[key as keyof typeof row] !== value) ||
    projectSnapshotAfter.hash !== projectHashBefore
  ) {
    throw new Error("Drift-shaped pre-repair assertions failed")
  }
  return {
    collaborationTablesPresent: Number(row.collaboration_table_count),
    collaborationColumnsPresent: Number(row.collaboration_column_count),
    workspaces: Number(row.workspace_count),
    memberships: Number(row.membership_count),
    orphanProjects: Number(row.orphan_project_count),
    partialIndexPresent: false,
    projectSnapshotStable: true,
  }
}

async function assertReconciledState(
  client: Client,
  projectHashBefore: string,
  expectedCanonicalLedger: boolean,
) {
  const state = await client.query<{
    profile_count: string
    personal_workspace_count: string
    owner_membership_count: string
    invalid_profile_scope_count: string
    orphan_project_count: string
    owner_workspace_mismatch_count: string
    team_count: string
    invitation_count: string
    grant_count: string
    feedback_count: string
    feedback_version_count: string
    memory_count: string
  }>(`
    SELECT
      (SELECT COUNT(*) FROM "profiles") AS profile_count,
      (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'PERSONAL' AND "status" = 'ACTIVE') AS personal_workspace_count,
      (SELECT COUNT(*) FROM "workspace_memberships"
       WHERE "role" = 'OWNER' AND "status" = 'ACTIVE') AS owner_membership_count,
      (SELECT COUNT(*) FROM "profiles" p WHERE (
        SELECT COUNT(*)
        FROM "workspaces" w
        JOIN "workspace_memberships" wm
          ON wm."workspace_id" = w."id"
         AND wm."profile_id" = p."id"
         AND wm."role" = 'OWNER'
         AND wm."status" = 'ACTIVE'
        WHERE w."created_by_profile_id" = p."id"
          AND w."type" = 'PERSONAL'
          AND w."status" = 'ACTIVE'
      ) <> 1) AS invalid_profile_scope_count,
      (SELECT COUNT(*) FROM "projects" WHERE "workspace_id" IS NULL) AS orphan_project_count,
      (SELECT COUNT(*) FROM "projects" p
       JOIN "workspaces" w ON w."id" = p."workspace_id"
       WHERE w."created_by_profile_id" <> p."owner_id"
          OR w."type" <> 'PERSONAL'
          OR w."status" <> 'ACTIVE') AS owner_workspace_mismatch_count,
      (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'TEAM') AS team_count,
      (SELECT COUNT(*) FROM "collaboration_invitations") AS invitation_count,
      (SELECT COUNT(*) FROM "project_access_grants") AS grant_count,
      (SELECT COUNT(*) FROM "project_feedback") AS feedback_count,
      (SELECT COUNT(*) FROM "project_feedback_versions") AS feedback_version_count,
      (SELECT COUNT(*) FROM "project_memory_candidates") AS memory_count
  `)
  const row = state.rows[0]
  const partialIndex = await client.query<{
    is_unique: boolean
    predicate: string | null
  }>(`
    SELECT i.indisunique AS is_unique, pg_get_expr(i.indpred, i.indrelid) AS predicate
    FROM pg_class index_class
    JOIN pg_index i ON i.indexrelid = index_class.oid
    WHERE index_class.relname = 'workspaces_active_personal_creator_unique'
  `)
  const indexRow = partialIndex.rows[0]
  const predicate = indexRow?.predicate ?? ""
  const indexPassed =
    partialIndex.rowCount === 1 &&
    indexRow.is_unique &&
    predicate.includes("PERSONAL") &&
    predicate.includes("ACTIVE")
  const projectSnapshotAfter = await projectSnapshot(client)
  const ledger = await migrationLedger(client)
  const canonicalLedgerPresent = ledger.some(
    (migration) =>
      migration.migration_name === CANONICAL_MIGRATION_NAME &&
      migration.finished &&
      !migration.rolled_back,
  )
  const numericZeroFields = [
    row.invalid_profile_scope_count,
    row.orphan_project_count,
    row.owner_workspace_mismatch_count,
    row.team_count,
    row.invitation_count,
    row.grant_count,
    row.feedback_count,
    row.feedback_version_count,
    row.memory_count,
  ]
  const passed =
    row.profile_count === "2" &&
    row.personal_workspace_count === row.profile_count &&
    row.owner_membership_count === row.profile_count &&
    numericZeroFields.every((value) => value === "0") &&
    indexPassed &&
    projectSnapshotAfter.hash === projectHashBefore &&
    canonicalLedgerPresent === expectedCanonicalLedger
  if (!passed) throw new Error("Reconciled workspace and project invariants failed")

  return {
    profiles: Number(row.profile_count),
    activePersonalWorkspaces: Number(row.personal_workspace_count),
    activePersonalOwnerMemberships: Number(row.owner_membership_count),
    orphanProjects: Number(row.orphan_project_count),
    partialUniqueIndex: {
      present: true,
      unique: indexRow.is_unique,
      predicate,
    },
    projectSnapshotStable: true,
    zeroSideEffectRows: {
      teams: Number(row.team_count),
      invitations: Number(row.invitation_count),
      grants: Number(row.grant_count),
      feedback: Number(row.feedback_count),
      feedbackVersions: Number(row.feedback_version_count),
      memoryCandidates: Number(row.memory_count),
    },
    migrationLedger: ledger,
    canonicalLedgerPresent,
  }
}

async function main() {
  const mode = parseMode()
  if (mode === "help") {
    help()
    return
  }

  const canonicalSql = await fs.readFile(CANONICAL_MIGRATION_PATH, "utf8")
  const repairSql = await fs.readFile(REVIEW_REPAIR_PATH, "utf8")
  const expectedRepairCore = buildExpectedRepairCore(canonicalSql)
  const repairArtifactCheck = assertReviewRepairArtifact(repairSql, expectedRepairCore)
  if (mode === "dry-run") {
    const tools = await Promise.all(
      ["initdb", "pg_ctl", "createdb", "psql", "pnpm"].map(async (tool) => {
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
          targetClassification: "self_created_local_disposable",
          paths: ["clean_canonical_deploy", "drift_review_repair"],
          databaseConnectionAllowed: false,
          disposableMigrationApplyAllowed: false,
          liveApplyAllowed: false,
          databaseUrlArgumentAccepted: false,
          inheritedDatabaseEnvironmentIgnored: true,
          configuredDatabaseAccessAllowed: false,
          canonicalSqlHash: stableHash(canonicalSql),
          repairArtifactSqlHash: stableHash(repairSql),
          expectedRepairCoreHash: stableHash(expectedRepairCore),
          repairArtifactCheck,
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
    throw new Error("Disposable write gates are incomplete. Run --help for the exact local-only confirmation.")
  }

  const port = await freeLoopbackPort()
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX))
  const dataDir = path.join(tempRoot, "data")
  const logPath = path.join(tempRoot, "postgres.log")
  const markerPath = path.join(tempRoot, OWNERSHIP_MARKER)
  const isolatedPrismaRoot = path.join(tempRoot, "canonical-prisma")
  const isolatedMigrations = path.join(isolatedPrismaRoot, "migrations")
  const isolatedSchema = path.join(isolatedPrismaRoot, "schema.prisma")
  const cleanConfig = path.join(tempRoot, "clean.prisma.config.ts")
  const driftConfig = path.join(tempRoot, "drift.prisma.config.ts")
  const cleanUrl = connectionUrl(CLEAN_DATABASE, port)
  const driftUrl = connectionUrl(DRIFT_DATABASE, port)
  const localUrls = [cleanUrl, driftUrl]
  const childEnv = scrubDatabaseEnvironment()
  const cleanup = { clusterStopped: false, tempRootRemoved: false }
  let clusterStarted = false
  let cleanClient: Client | null = null
  let driftClient: Client | null = null
  let result: Record<string, unknown> | null = null

  try {
    await fs.writeFile(
      markerPath,
      "TEAMCOLLAB-005A self-created disposable reconciliation proof\n",
      { encoding: "utf8", flag: "wx" },
    )
    await fs.cp(MIGRATIONS_PATH, isolatedMigrations, { recursive: true, errorOnExist: true })
    await fs.rm(path.join(isolatedMigrations, CANONICAL_MIGRATION_NAME), {
      recursive: true,
      force: false,
    })
    await fs.copyFile(SCHEMA_PATH, isolatedSchema)
    await writeTemporaryPrismaConfig(cleanConfig, isolatedSchema, isolatedMigrations, cleanUrl)
    await writeTemporaryPrismaConfig(driftConfig, isolatedSchema, isolatedMigrations, driftUrl)

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
    for (const databaseName of [CLEAN_DATABASE, DRIFT_DATABASE]) {
      await command("createdb", [
        "-h",
        "127.0.0.1",
        "-p",
        String(port),
        "-U",
        "postgres",
        databaseName,
      ])
    }

    cleanClient = new Client({ connectionString: cleanUrl })
    driftClient = new Client({ connectionString: driftUrl })
    await cleanClient.connect()
    await driftClient.connect()
    const cleanFingerprint = await assertTargetFingerprint(
      cleanClient,
      CLEAN_DATABASE,
      port,
      dataDir,
    )
    const driftFingerprint = await assertTargetFingerprint(
      driftClient,
      DRIFT_DATABASE,
      port,
      dataDir,
    )

    await deployMigrations(cleanConfig, childEnv)
    await deployMigrations(driftConfig, childEnv)
    const cleanBefore = await insertLegacyFixture(cleanClient)
    const driftBefore = await insertLegacyFixture(driftClient)

    const canonicalMigrationDir = path.join(isolatedMigrations, CANONICAL_MIGRATION_NAME)
    await fs.cp(path.dirname(CANONICAL_MIGRATION_PATH), canonicalMigrationDir, {
      recursive: true,
      errorOnExist: true,
    })

    await deployMigrations(cleanConfig, childEnv)
    const cleanEvidence = await assertReconciledState(cleanClient, cleanBefore.hash, true)

    await applySqlFile(DRIFT_DATABASE, port, CANONICAL_MIGRATION_PATH, childEnv)
    await applySqlText(
      driftClient,
      `
      UPDATE "projects" SET "workspace_id" = NULL;
      DELETE FROM "workspaces";
      DROP INDEX "workspaces_active_personal_creator_unique";
      `,
    )
    const driftShape = await assertDriftShape(driftClient, driftBefore.hash)
    await applyReviewRepair(driftClient, repairSql)
    const driftEvidence = await assertReconciledState(driftClient, driftBefore.hash, false)

    result = {
      status: "passed",
      mode,
      targetClassification: "self_created_local_disposable",
      configuredDatabaseAccessAllowed: false,
      liveApplyAllowed: false,
      databaseUrlArgumentAccepted: false,
      inheritedDatabaseEnvironmentIgnored: true,
      canonicalSqlHash: stableHash(canonicalSql),
      repairArtifactSqlHash: stableHash(repairSql),
      expectedRepairCoreHash: stableHash(expectedRepairCore),
      repairArtifactCheck,
      safety: {
        gatesSatisfied: true,
        loopbackOnly: true,
        selfCreatedCluster: true,
        markedTemporaryRoot: true,
        cleanFingerprint,
        driftFingerprint,
      },
      paths: {
        cleanCanonicalDeploy: cleanEvidence,
        driftReviewRepair: {
          beforeRepair: driftShape,
          afterRepair: driftEvidence,
          migrateResolveExecuted: false,
        },
      },
    }
  } catch (error) {
    result = {
      status: "failed",
      mode,
      targetClassification: "self_created_local_disposable",
      configuredDatabaseAccessAllowed: false,
      liveApplyAllowed: false,
      error: sanitizeError(error, localUrls),
    }
    process.exitCode = 1
  } finally {
    if (cleanClient) await cleanClient.end().catch(() => undefined)
    if (driftClient) await driftClient.end().catch(() => undefined)
    if (clusterStarted) {
      try {
        await command("pg_ctl", ["-D", dataDir, "-m", "fast", "-w", "stop"])
        cleanup.clusterStopped = true
      } catch {
        cleanup.clusterStopped = false
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
        cleanup.tempRootRemoved = false
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
  console.error(JSON.stringify({ status: "failed", error: sanitizeError(error, []) }, null, 2))
  process.exitCode = 1
})
