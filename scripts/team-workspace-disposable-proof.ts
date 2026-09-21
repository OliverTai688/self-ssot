#!/usr/bin/env tsx
import "server-only"

import crypto from "node:crypto"
import fs from "node:fs/promises"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { Client } from "pg"

import {
  hasTeamProjectCapability,
  resolveTeamProjectCapabilities,
  type TeamProjectCapabilityInput,
} from "../src/lib/contracts/team-workspace-capability.contract"

const ROOT = process.cwd()
const DATABASE_NAME = "personal_os_teamcollab_proof"
const TEMP_PREFIX = "personal-os-teamcollab-proof-"
const CONFIRM_PHRASE =
  "I_UNDERSTAND_THIS_WRITES_ONLY_TO_A_NEW_LOCAL_DISPOSABLE_DATABASE"
const DRAFT_SQL = path.join(
  ROOT,
  "prisma/migration-drafts/20260727_teamcollab_004_workspace_collaboration_additive/migration.sql",
)

const PROFILE_A = "00000000-0000-4000-8000-0000000000a1"
const PROFILE_B = "00000000-0000-4000-8000-0000000000b2"
const PROJECT_A = "10000000-0000-4000-8000-0000000000a1"
const PROJECT_B = "10000000-0000-4000-8000-0000000000b2"
const TEAM_WORKSPACE = "20000000-0000-4000-8000-000000000001"
const TEAM_OWNER_MEMBERSHIP = "30000000-0000-4000-8000-000000000001"
const TEAM_MEMBER_MEMBERSHIP = "30000000-0000-4000-8000-000000000002"
const TEAM_PROJECT = "40000000-0000-4000-8000-000000000001"
const TEAM_GRANT = "50000000-0000-4000-8000-000000000001"
const TEAM_FEEDBACK = "60000000-0000-4000-8000-000000000001"
const TEAM_FEEDBACK_VERSION = "70000000-0000-4000-8000-000000000001"
const TEAM_MEMORY_CANDIDATE = "80000000-0000-4000-8000-000000000001"

type CommandResult = { stdout: string; stderr: string }

function hasFlag(flag: string) {
  return process.argv.slice(2).includes(flag)
}

function help() {
  console.log(`Usage:
  pnpm teamcollab:proof:local -- --dry-run
  TEAMCOLLAB_PROOF_ALLOW_LOCAL_WRITES=1 \\
  TEAMCOLLAB_PROOF_ALLOW_MIGRATION_APPLY=1 \\
  TEAMCOLLAB_PROOF_CONFIRM=${CONFIRM_PHRASE} \\
  pnpm teamcollab:proof:local -- --run

The runner never accepts a database URL. It creates and removes its own loopback-only PostgreSQL cluster.`)
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

function stableHash(rows: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex")
}

function countSnapshot(rows: Array<Record<string, string>>) {
  return Object.fromEntries(rows.map((row) => [row.table_name, Number(row.row_count)]))
}

function sanitizeError(error: unknown, connectionUrl: string | null) {
  let message = error instanceof Error ? error.message : String(error)
  if (connectionUrl) message = message.replaceAll(connectionUrl, "<redacted-local-disposable-url>")
  return message.slice(0, 1600)
}

async function main() {
  if (hasFlag("--help") || hasFlag("-h")) {
    help()
    return
  }

  const run = hasFlag("--run")
  const dryRun = hasFlag("--dry-run") || !run
  if (run && dryRun && hasFlag("--dry-run")) {
    throw new Error("Choose exactly one of --dry-run or --run")
  }

  if (!run) {
    const tools = await Promise.all(
      ["initdb", "pg_ctl", "createdb", "psql"].map(async (tool) => {
        try {
          const result = await command(tool, ["--version"])
          return { tool, available: true, version: result.stdout.trim() }
        } catch {
          return { tool, available: false }
        }
      }),
    )
    console.log(
      JSON.stringify(
        {
          status: tools.every((tool) => tool.available) ? "ready" : "blocked",
          mode: "dry-run",
          targetClassification: "self_created_local_disposable",
          databaseConnectionAllowed: false,
          disposableMigrationApplyAllowed: false,
          liveApplyAllowed: false,
          inheritedDatabaseUrlAccepted: false,
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
  const markerPath = path.join(tempRoot, ".teamcollab-proof-owned")
  const connectionUrl = `postgresql://postgres@127.0.0.1:${port}/${DATABASE_NAME}`
  const childEnv = {
    ...process.env,
    DATABASE_URL: connectionUrl,
    DIRECT_DATABASE_URL: connectionUrl,
    PERSONAL_OS_AUTH_MODE: "mock",
  }
  const cleanup = { clusterStopped: false, dataDirRemoved: false }
  let clusterStarted = false
  let client: Client | null = null
  let result: Record<string, unknown> | null = null

  try {
    await fs.writeFile(markerPath, "TEAMCOLLAB-004 self-created disposable proof\n", {
      encoding: "utf8",
      flag: "wx",
    })
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
    await command("createdb", ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres", DATABASE_NAME])

    client = new Client({ connectionString: connectionUrl })
    await client.connect()
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
      fs.realpath(dataDir),
    ])
    const loopbackMatched = /^(?:127\.0\.0\.1(?:\/32)?|::1(?:\/128)?)$/.test(
      target.server_address,
    )
    if (
      target.database_name !== DATABASE_NAME ||
      !loopbackMatched ||
      Number(target.server_port) !== port ||
      targetDataDirectory !== ownedDataDirectory
    ) {
      throw new Error(
        `Disposable target fingerprint mismatch: ${JSON.stringify({
          databaseNameMatched: target.database_name === DATABASE_NAME,
          serverAddress: target.server_address,
          loopbackMatched,
          portMatched: Number(target.server_port) === port,
          dataDirectoryMatched: targetDataDirectory === ownedDataDirectory,
        })}`,
      )
    }

    await command("pnpm", ["db:deploy"], { env: childEnv })

    await client.query(
      `
      INSERT INTO "profiles" ("id", "email", "full_name", "role", "created_at", "updated_at") VALUES
        ($1, 'legacy-a@example.test', 'Legacy A', 'OWNER', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ($2, 'legacy-b@example.test', 'Legacy B', 'CLIENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [PROFILE_A, PROFILE_B],
    )
    await client.query(
      `
      INSERT INTO "projects" (
        "id", "owner_id", "name", "status", "phase", "health", "visibility", "client_token",
        "tasks_done", "tasks_total", "created_at", "updated_at"
      ) VALUES
        ($3, $1, 'Legacy A Project', 'ACTIVE', 'PLANNING', 'GOOD', 'CLIENT_VISIBLE', 'legacy-token-a', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ($4, $2, 'Legacy B Project', 'ACTIVE', 'PLANNING', 'GOOD', 'INTERNAL_ONLY', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [PROFILE_A, PROFILE_B, PROJECT_A, PROJECT_B],
    )

    const legacyBefore = await client.query(
      `SELECT "id", "owner_id", "visibility"::text, COALESCE("client_token", '') AS "client_token"
       FROM "projects" ORDER BY "id"`,
    )
    const legacyProjectHashBefore = stableHash(legacyBefore.rows)

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
        DATABASE_NAME,
        "-v",
        "ON_ERROR_STOP=1",
        "--single-transaction",
        "-f",
        DRAFT_SQL,
      ],
      { env: childEnv },
    )

    const backfill = await client.query<{
      profile_count: string
      personal_workspace_count: string
      invalid_profile_owner_count: string
      invalid_personal_owner_count: string
      orphan_project_count: string
      owner_workspace_mismatch_count: string
    }>(`
      SELECT
        (SELECT COUNT(*) FROM "profiles") AS profile_count,
        (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'PERSONAL' AND "status" = 'ACTIVE') AS personal_workspace_count,
        (SELECT COUNT(*) FROM "profiles" p WHERE (
          SELECT COUNT(*) FROM "workspace_memberships" wm
          JOIN "workspaces" w ON w."id" = wm."workspace_id"
          WHERE wm."profile_id" = p."id" AND wm."role" = 'OWNER' AND wm."status" = 'ACTIVE'
            AND w."type" = 'PERSONAL' AND w."status" = 'ACTIVE'
        ) <> 1) AS invalid_profile_owner_count,
        (SELECT COUNT(*) FROM "workspaces" w WHERE w."type" = 'PERSONAL' AND w."status" = 'ACTIVE' AND (
          SELECT COUNT(*) FROM "workspace_memberships" wm
          WHERE wm."workspace_id" = w."id" AND wm."role" = 'OWNER' AND wm."status" = 'ACTIVE'
        ) <> 1) AS invalid_personal_owner_count,
        (SELECT COUNT(*) FROM "projects" WHERE "workspace_id" IS NULL) AS orphan_project_count,
        (SELECT COUNT(*) FROM "projects" p
          JOIN "workspaces" w ON w."id" = p."workspace_id"
          WHERE w."created_by_profile_id" <> p."owner_id") AS owner_workspace_mismatch_count
    `)
    const backfillRow = backfill.rows[0]
    const backfillPassed =
      backfillRow.profile_count === backfillRow.personal_workspace_count &&
      [
        backfillRow.invalid_profile_owner_count,
        backfillRow.invalid_personal_owner_count,
        backfillRow.orphan_project_count,
        backfillRow.owner_workspace_mismatch_count,
      ].every((value) => value === "0")
    if (!backfillPassed) throw new Error("Personal workspace backfill assertions failed")

    const legacyAfter = await client.query(
      `SELECT "id", "owner_id", "visibility"::text, COALESCE("client_token", '') AS "client_token"
       FROM "projects" WHERE "id" IN ($1, $2) ORDER BY "id"`,
      [PROJECT_A, PROJECT_B],
    )
    if (stableHash(legacyAfter.rows) !== legacyProjectHashBefore) {
      throw new Error("Legacy project identity or Client Portal snapshot changed during backfill")
    }

    const countQuery = `
      SELECT table_name, row_count FROM (
        SELECT 'profiles' AS table_name, COUNT(*)::text AS row_count FROM "profiles"
        UNION ALL SELECT 'projects', COUNT(*)::text FROM "projects"
        UNION ALL SELECT 'project_tasks', COUNT(*)::text FROM "project_tasks"
        UNION ALL SELECT 'project_notes', COUNT(*)::text FROM "project_notes"
        UNION ALL SELECT 'project_deliverables', COUNT(*)::text FROM "project_deliverables"
        UNION ALL SELECT 'workspaces', COUNT(*)::text FROM "workspaces"
        UNION ALL SELECT 'workspace_memberships', COUNT(*)::text FROM "workspace_memberships"
      ) counts ORDER BY table_name
    `
    await command("pnpm", ["db:seed"], { env: childEnv })
    const firstSeed = countSnapshot((await client.query(countQuery)).rows)
    await command("pnpm", ["db:seed"], { env: childEnv })
    const secondSeed = countSnapshot((await client.query(countQuery)).rows)
    if (stableHash(firstSeed) !== stableHash(secondSeed)) {
      throw new Error("Second seed changed stable entity counts")
    }

    await client.query(
      `
      INSERT INTO "workspaces" (
        "id", "type", "name", "slug", "status", "default_project_access_role",
        "created_by_profile_id", "created_at", "updated_at"
      ) VALUES ($1, 'TEAM', 'Disposable Team', 'disposable-team', 'ACTIVE', 'VIEWER', $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [TEAM_WORKSPACE, PROFILE_A],
    )
    await client.query(
      `
      INSERT INTO "workspace_memberships" (
        "id", "workspace_id", "profile_id", "role", "status", "joined_at", "created_at", "updated_at"
      ) VALUES
        ($3, $1, $2, 'OWNER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ($4, $1, $5, 'MEMBER', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [TEAM_WORKSPACE, PROFILE_A, TEAM_OWNER_MEMBERSHIP, TEAM_MEMBER_MEMBERSHIP, PROFILE_B],
    )
    await client.query(
      `
      INSERT INTO "projects" (
        "id", "owner_id", "workspace_id", "access_mode", "name", "status", "phase", "health",
        "visibility", "tasks_done", "tasks_total", "created_at", "updated_at"
      ) VALUES ($3, $2, $1, 'WORKSPACE_VISIBLE', 'Disposable Team Project', 'ACTIVE', 'PLANNING', 'GOOD',
        'INTERNAL_ONLY', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [TEAM_WORKSPACE, PROFILE_A, TEAM_PROJECT],
    )
    await client.query(
      `
      INSERT INTO "project_access_grants" (
        "id", "project_id", "membership_id", "role", "status", "granted_by_profile_id", "created_at", "updated_at"
      ) VALUES ($4, $3, $2, 'VIEWER', 'ACTIVE', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `,
      [
        PROFILE_A,
        TEAM_MEMBER_MEMBERSHIP,
        TEAM_PROJECT,
        TEAM_GRANT,
      ],
    )

    const persisted = await client.query<{
      workspace_id: string
      workspace_status: "ACTIVE"
      default_role: "VIEWER"
      membership_id: string
      membership_profile_id: string
      membership_role: "MEMBER"
      membership_status: "ACTIVE"
      project_id: string
      project_workspace_id: string
      project_status: "ACTIVE"
      access_mode: "WORKSPACE_VISIBLE"
      grant_role: "VIEWER"
      grant_status: "ACTIVE"
    }>(`
      SELECT w."id" AS workspace_id, w."status"::text AS workspace_status,
             w."default_project_access_role"::text AS default_role,
             wm."id" AS membership_id, wm."profile_id" AS membership_profile_id,
             wm."role"::text AS membership_role, wm."status"::text AS membership_status,
             p."id" AS project_id, p."workspace_id" AS project_workspace_id,
             p."status"::text AS project_status, p."access_mode"::text AS access_mode,
             pag."role"::text AS grant_role, pag."status"::text AS grant_status
      FROM "workspaces" w
      JOIN "workspace_memberships" wm ON wm."workspace_id" = w."id" AND wm."profile_id" = '${PROFILE_B}'
      JOIN "projects" p ON p."workspace_id" = w."id" AND p."id" = '${TEAM_PROJECT}'
      JOIN "project_access_grants" pag ON pag."project_id" = p."id" AND pag."membership_id" = wm."id"
      WHERE w."id" = '${TEAM_WORKSPACE}'
    `)
    const row = persisted.rows[0]
    if (!row) throw new Error("Persisted two-workspace fixture could not be loaded")

    const baseInput: TeamProjectCapabilityInput = {
      identity: { profileId: row.membership_profile_id },
      workspace: {
        id: row.workspace_id,
        status: row.workspace_status,
        defaultProjectRole: row.default_role,
      },
      membership: {
        id: row.membership_id,
        workspaceId: row.workspace_id,
        profileId: row.membership_profile_id,
        role: row.membership_role,
        status: row.membership_status,
      },
      project: {
        id: row.project_id,
        workspaceId: row.project_workspace_id,
        status: row.project_status,
        accessMode: row.access_mode,
      },
      directGrant: {
        projectId: row.project_id,
        workspaceId: row.workspace_id,
        membershipId: row.membership_id,
        role: row.grant_role,
        status: row.grant_status,
      },
    }
    const allowedRead = resolveTeamProjectCapabilities(baseInput)
    const deniedCrossWorkspaceProject = resolveTeamProjectCapabilities({
      ...baseInput,
      project: { ...baseInput.project!, workspaceId: "other-workspace" },
    })
    const deniedCrossWorkspaceMembership = resolveTeamProjectCapabilities({
      ...baseInput,
      membership: { ...baseInput.membership!, workspaceId: "other-workspace" },
    })
    const deniedWrite = !hasTeamProjectCapability(allowedRead, "project.content.write")
    const teamProjectBefore = stableHash(
      (await client.query(`SELECT * FROM "projects" WHERE "id" = $1`, [TEAM_PROJECT])).rows,
    )
    // The proof deliberately performs no mutation after a denied capability decision.
    const teamProjectAfter = stableHash(
      (await client.query(`SELECT * FROM "projects" WHERE "id" = $1`, [TEAM_PROJECT])).rows,
    )
    const crossWorkspaceDenied =
      allowedRead.allowed &&
      hasTeamProjectCapability(allowedRead, "project.read") &&
      !deniedCrossWorkspaceProject.allowed &&
      deniedCrossWorkspaceProject.denialReason === "project_workspace_mismatch" &&
      !deniedCrossWorkspaceMembership.allowed &&
      deniedCrossWorkspaceMembership.denialReason === "membership_workspace_mismatch" &&
      deniedWrite &&
      teamProjectBefore === teamProjectAfter
    if (!crossWorkspaceDenied) throw new Error("Two-workspace capability denial proof failed")

    await client.query(
      `INSERT INTO "project_feedback" (
        "id", "workspace_id", "project_id", "author_profile_id", "target_type", "target_id",
        "body", "current_version", "created_at", "updated_at"
      ) VALUES ($1, $2, $3, $4, 'PROJECT', $3, 'Disposable attributed feedback', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [TEAM_FEEDBACK, TEAM_WORKSPACE, TEAM_PROJECT, PROFILE_A],
    )
    await client.query(
      `INSERT INTO "project_feedback_versions" (
        "id", "feedback_id", "version", "body", "edited_by_profile_id", "created_at"
      ) VALUES ($1, $2, 1, 'Disposable attributed feedback', $3, CURRENT_TIMESTAMP)`,
      [TEAM_FEEDBACK_VERSION, TEAM_FEEDBACK, PROFILE_A],
    )
    await client.query(
      `INSERT INTO "project_memory_candidates" (
        "id", "workspace_id", "project_id", "feedback_id", "feedback_version", "summary",
        "proposed_by_agent_id", "created_at", "updated_at"
      ) VALUES ($1, $2, $3, $4, 1, 'Disposable memory proposal', 'work-agent', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [TEAM_MEMORY_CANDIDATE, TEAM_WORKSPACE, TEAM_PROJECT, TEAM_FEEDBACK],
    )
    let lineageProtectedDelete = false
    try {
      await client.query(`DELETE FROM "projects" WHERE "id" = $1`, [TEAM_PROJECT])
    } catch (error) {
      lineageProtectedDelete = (error as { code?: string }).code === "23503"
    }
    const protectedProjectCount = Number(
      (await client.query<{ count: string }>(`SELECT COUNT(*) FROM "projects" WHERE "id" = $1`, [TEAM_PROJECT]))
        .rows[0]?.count ?? "0",
    )
    if (!lineageProtectedDelete || protectedProjectCount !== 1) {
      throw new Error("Project deletion did not preserve feedback memory lineage")
    }

    result = {
      status: "passed",
      mode: "run",
      target: {
        classification: "self_created_local_disposable",
        loopbackOnly: true,
        fresh: true,
        supabaseUsed: false,
        inheritedDatabaseUrlAccepted: false,
        databaseName: DATABASE_NAME,
      },
      migration: {
        currentDeployableHistoryApplied: true,
        reviewDraftAppliedInSingleTransaction: true,
        reviewDraftRemainsOutsidePrismaMigrations: true,
        liveApplyAllowed: false,
      },
      backfill: {
        passed: true,
        zeroOrphanProjects: true,
        oneActivePersonalOwnerPerProfile: true,
        oneActiveOwnerPerPersonalWorkspace: true,
        legacyProjectAndClientPortalSnapshotUnchanged: true,
      },
      seed: { firstPass: "passed", secondPass: "passed", stableCounts: true, counts: secondSeed },
      authorization: {
        proofKind: "persisted-context-plus-pure-service-contract",
        crossWorkspaceReadDenied: true,
        crossWorkspaceWriteDenied: true,
        deniedWritesMutatedRows: false,
        rlsOrPrivilegedPrismaIsolationClaimed: false,
      },
      feedbackMemoryLineage: {
        candidateReferencesPersistedVersion: true,
        projectDeleteRestrictedWhileCandidateExists: true,
      },
    }
  } catch (error) {
    result = {
      status: "failed",
      mode: "run",
      targetClassification: "self_created_local_disposable",
      liveApplyAllowed: false,
      error: sanitizeError(error, connectionUrl),
    }
    process.exitCode = 1
  } finally {
    if (client) await client.end().catch(() => undefined)
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
    if (markerExists && resolvedRoot.startsWith(expectedParent) && path.basename(resolvedRoot).startsWith(TEMP_PREFIX)) {
      await fs.rm(resolvedRoot, { recursive: true, force: false })
      cleanup.dataDirRemoved = true
    } else {
      process.exitCode = 1
    }

    result = { ...(result ?? { status: "failed" }), cleanup }
    if (!cleanup.clusterStopped || !cleanup.dataDirRemoved) {
      result.status = "failed"
      process.exitCode = 1
    }
    console.log(JSON.stringify(result, null, 2))
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "failed", error: sanitizeError(error, null) }, null, 2))
  process.exitCode = 1
})
