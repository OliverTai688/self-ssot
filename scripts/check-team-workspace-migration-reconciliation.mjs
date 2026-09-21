#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

const FILES = {
  reviewedDraft:
    "prisma/migration-drafts/20260727_teamcollab_004_workspace_collaboration_additive/migration.sql",
  canonical:
    "prisma/migrations/20260727150000_team_workspace_collaboration/migration.sql",
  preflight:
    "prisma/migration-drafts/20260727_teamcollab_005a_configured_drift_repair/preflight.sql",
  repair:
    "prisma/migration-drafts/20260727_teamcollab_005a_configured_drift_repair/repair.sql",
  createTeamService: "src/lib/services/team-workspace-command.service.ts",
  createTeamAction: "src/app/actions/team-workspace.ts",
  createTeamDialog: "src/components/work/workspace/create-team-workspace-dialog.tsx",
}

const CANONICAL_MIGRATION_DIR = "20260727150000_team_workspace_collaboration"
const REPAIR_PACKET_DIR = "20260727_teamcollab_005a_configured_drift_repair"

function parseArgs(argv) {
  const args = { json: false, out: null, help: false }
  const filtered = argv.filter((arg) => arg !== "--")

  for (let index = 0; index < filtered.length; index += 1) {
    const arg = filtered[index]
    if (arg === "--json") {
      args.json = true
    } else if (arg === "--out") {
      const value = filtered[index + 1]
      if (!value || value.startsWith("--")) {
        throw new Error("--out requires a file path")
      }
      args.out = value
      index += 1
    } else if (arg === "--help" || arg === "-h") {
      args.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log("Check the TEAMCOLLAB canonical migration and configured-drift repair packet")
  console.log("")
  console.log("Usage:")
  console.log("  node scripts/check-team-workspace-migration-reconciliation.mjs")
  console.log("  node scripts/check-team-workspace-migration-reconciliation.mjs --json")
  console.log("  node scripts/check-team-workspace-migration-reconciliation.mjs --out <path>")
}

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir)
  if (!fs.existsSync(absoluteDir)) return []

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name)
    return entry.isDirectory() ? listFiles(relativePath) : [relativePath]
  })
}

function normalizeSqlBytes(text) {
  return text.replace(/\r\n?/g, "\n").replace(/\n*$/, "\n")
}

function withoutLeadingSqlComments(text) {
  const lines = normalizeSqlBytes(text).split("\n")
  while (lines.length > 0 && (lines[0].trim() === "" || lines[0].trim().startsWith("--"))) {
    lines.shift()
  }
  return lines.join("\n")
}

function stripSqlComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
}

function all(text, patterns) {
  return text !== null && patterns.every((pattern) => pattern.test(text))
}

function matchingLabels(text, entries) {
  if (text === null) return entries.map(({ label }) => label)
  return entries.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
}

function extractMutationTables(sql, keyword) {
  if (!sql) return []
  const clean = stripSqlComments(sql)
  const expression =
    keyword === "insert"
      ? /\bINSERT\s+INTO\s+"?([a-z_][a-z0-9_]*)"?/gi
      : keyword === "update"
        ? /^\s*UPDATE\s+"?([a-z_][a-z0-9_]*)"?/gim
        : /^\s*DELETE\s+FROM\s+"?([a-z_][a-z0-9_]*)"?/gim

  return [...clean.matchAll(expression)].map((match) => match[1].toLowerCase())
}

function extractStatement(sql, startPattern, endPattern) {
  if (!sql) return ""
  const start = sql.search(startPattern)
  if (start < 0) return ""
  const tail = sql.slice(start)
  const end = tail.search(endPattern)
  return end < 0 ? tail : tail.slice(0, end)
}

function normalizeOutputPath(outPath) {
  const resolved = path.resolve(ROOT, outPath)
  const relative = path.relative(ROOT, resolved)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--out must stay inside the repository")
  }
  return resolved
}

function buildResult() {
  const texts = Object.fromEntries(
    Object.entries(FILES).map(([key, relativePath]) => [key, read(relativePath)]),
  )
  const checks = []

  function check(id, label, files, passed, evidence) {
    checks.push({ id, label, files, passed, evidence })
  }

  for (const [key, relativePath] of Object.entries(FILES)) {
    check(
      `file.${key}`,
      `${relativePath} exists`,
      [relativePath],
      texts[key] !== null,
      texts[key] === null ? "missing" : "readable",
    )
  }

  const migrationDirs = fs.existsSync(path.join(ROOT, "prisma/migrations"))
    ? fs
        .readdirSync(path.join(ROOT, "prisma/migrations"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : []
  const collaborationMigrationDirs = migrationDirs.filter((name) => {
    const migrationSql = read(`prisma/migrations/${name}/migration.sql`)
    return all(migrationSql, [
      /CREATE TABLE ["']workspaces["']/,
      /CREATE TABLE ["']workspace_memberships["']/,
      /CREATE TABLE ["']collaboration_invitations["']/,
      /CREATE TABLE ["']project_access_grants["']/,
      /CREATE TABLE ["']project_feedback["']/,
      /CREATE TABLE ["']project_memory_candidates["']/,
    ])
  })

  check(
    "canonical.exact-location",
    "Exactly one canonical TEAMCOLLAB migration uses the approved directory name",
    [FILES.canonical],
    collaborationMigrationDirs.length === 1 &&
      collaborationMigrationDirs[0] === CANONICAL_MIGRATION_DIR,
    collaborationMigrationDirs.length === 0
      ? "no TEAMCOLLAB migration found under prisma/migrations"
      : collaborationMigrationDirs.join(", "),
  )

  const repairPacketFiles = listFiles(`prisma/migration-drafts/${REPAIR_PACKET_DIR}`).sort()
  const expectedRepairFiles = [FILES.preflight, FILES.repair].sort()
  check(
    "repair.exact-packet-shape",
    "Configured-drift repair packet contains only preflight.sql and repair.sql",
    expectedRepairFiles,
    repairPacketFiles.length === expectedRepairFiles.length &&
      repairPacketFiles.every((file, index) => file === expectedRepairFiles[index]),
    repairPacketFiles.length === 0 ? "repair packet missing" : repairPacketFiles.join(", "),
  )

  const canonicalMatchesDraft =
    texts.reviewedDraft !== null &&
    texts.canonical !== null &&
    withoutLeadingSqlComments(texts.reviewedDraft) === withoutLeadingSqlComments(texts.canonical)
  check(
    "canonical.reviewed-byte-match",
    "Canonical executable SQL byte-matches the TEAMCOLLAB-004 reviewed SQL after header/newline normalization",
    [FILES.reviewedDraft, FILES.canonical],
    canonicalMatchesDraft,
    canonicalMatchesDraft ? "normalized executable SQL is identical" : "normalized executable SQL differs or a file is missing",
  )

  check(
    "canonical.deployable-approval-header",
    "Canonical header names the deployable artifact while retaining target-specific approval and preflight gates",
    [FILES.canonical],
    all(texts.canonical, [
      /TEAMCOLLAB-005A\s+canonical\s+additive\s+workspace\s+collaboration\s+migration/i,
      /Deployable\s+migration\s+artifact/i,
      /target-specific\s+preflight/i,
      /reviewed\s+apply\s+approval/i,
    ]),
    "requires canonical/deployable identity plus preflight and reviewed-apply approval wording",
  )

  const canonicalForbidden = matchingLabels(texts.canonical, [
    { label: "RESET", pattern: /^\s*RESET\b/im },
    { label: "DROP", pattern: /^\s*DROP\b/im },
    { label: "TRUNCATE", pattern: /^\s*TRUNCATE\b/im },
    { label: "DELETE", pattern: /^\s*DELETE\b/im },
    { label: "migration ledger mutation", pattern: /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE)\s+"?_prisma_migrations"?/i },
  ])
  check(
    "canonical.no-destructive-or-ledger-mutation",
    "Canonical migration contains no reset/drop/truncate/delete or Prisma migration-ledger mutation",
    [FILES.canonical],
    texts.canonical !== null && canonicalForbidden.length === 0,
    canonicalForbidden.length === 0 ? "no forbidden canonical statements" : canonicalForbidden.join(", "),
  )

  check(
    "preflight.read-only-inventory",
    "Preflight is a read-only transaction covering relations, columns, indexes, migration history, and row-state counts",
    [FILES.preflight],
    all(texts.preflight, [
      /BEGIN\s+TRANSACTION\s+READ\s+ONLY/i,
      /to_regclass\s*\(/i,
      /information_schema\.columns/i,
      /pg_indexes/i,
      /_prisma_migrations/i,
      /\bprofiles\b/i,
      /\bworkspaces\b/i,
      /\bworkspace_memberships\b/i,
      /\bprojects\b/i,
      /profiles_missing_active_personal_workspace/i,
      /personal_workspaces_missing_active_creator_owner/i,
      /profiles_with_multiple_active_personal_workspaces/i,
      /null_workspace_projects/i,
      /(?:COMMIT|ROLLBACK)/i,
    ]),
    "requires explicit read-only begin, catalog/ledger inventory, aggregate/null-scope checks, and transaction close",
  )

  const preflightClean = texts.preflight === null ? null : stripSqlComments(texts.preflight)
  const preflightForbidden = matchingLabels(preflightClean, [
    { label: "INSERT", pattern: /\bINSERT\s+INTO\b/i },
    { label: "UPDATE", pattern: /^\s*UPDATE\b/im },
    { label: "DELETE", pattern: /\bDELETE\s+FROM\b/i },
    { label: "MERGE", pattern: /\bMERGE\s+INTO\b/i },
    { label: "ALTER", pattern: /\bALTER\s+(?:TABLE|TYPE)\b/i },
    { label: "CREATE", pattern: /\bCREATE\s+(?:TABLE|TYPE|INDEX)\b/i },
    { label: "RESET", pattern: /^\s*RESET\b/im },
    { label: "DROP", pattern: /^\s*DROP\b/im },
    { label: "TRUNCATE", pattern: /^\s*TRUNCATE\b/im },
  ])
  check(
    "preflight.no-writes-or-ddl",
    "Preflight cannot mutate data, DDL, or the Prisma migration ledger",
    [FILES.preflight],
    preflightClean !== null && preflightForbidden.length === 0,
    preflightForbidden.length === 0 ? "read-only SQL only" : preflightForbidden.join(", "),
  )

  check(
    "repair.transaction-and-lock",
    "Repair runs in one explicit transaction under an advisory transaction lock",
    [FILES.repair],
    all(texts.repair, [
      /^\s*BEGIN\s*;/im,
      /pg_advisory_xact_lock\s*\(/i,
      /\bCOMMIT\s*;/i,
    ]),
    "requires BEGIN, pg_advisory_xact_lock, and COMMIT",
  )

  const repairInserts = extractMutationTables(texts.repair, "insert")
  const repairUpdates = extractMutationTables(texts.repair, "update")
  const repairDeletes = extractMutationTables(texts.repair, "delete")
  const allowedInsertTables = new Set(["workspaces", "workspace_memberships"])
  const allowedUpdateTables = new Set(["projects"])
  const disallowedInsertTables = repairInserts.filter((table) => !allowedInsertTables.has(table))
  const disallowedUpdateTables = repairUpdates.filter((table) => !allowedUpdateTables.has(table))

  check(
    "repair.exact-mutation-tables",
    "Repair mutates only PERSONAL workspaces, OWNER memberships, and null-workspace projects",
    [FILES.repair],
    repairInserts.includes("workspaces") &&
      repairInserts.includes("workspace_memberships") &&
      repairUpdates.includes("projects") &&
      disallowedInsertTables.length === 0 &&
      disallowedUpdateTables.length === 0 &&
      repairDeletes.length === 0,
    `insert=${repairInserts.join(",") || "none"}; update=${repairUpdates.join(",") || "none"}; delete=${repairDeletes.join(",") || "none"}`,
  )

  const workspaceInsert = extractStatement(
    texts.repair,
    /INSERT\s+INTO\s+"?workspaces"?/i,
    /;/,
  )
  const membershipInsert = extractStatement(
    texts.repair,
    /INSERT\s+INTO\s+"?workspace_memberships"?/i,
    /;/,
  )
  const projectUpdate = extractStatement(
    texts.repair,
    /UPDATE\s+"?projects"?/i,
    /;/,
  )

  check(
    "repair.personal-workspace-only",
    "Workspace backfill creates only missing active PERSONAL workspaces for the configured Profile scope",
    [FILES.repair],
    all(workspaceInsert, [
      /'PERSONAL'(?:\s*::\s*"?workspace_type"?)?/i,
      /created_by_profile_id/i,
      /FROM\s+"?profiles"?/i,
      /NOT\s+EXISTS/i,
    ]) && !/'TEAM'(?:\s*::\s*"?workspace_type"?)?/i.test(stripSqlComments(workspaceInsert)),
    "requires PERSONAL/ACTIVE scoped insert with creator predicate and no TEAM value",
  )

  check(
    "repair.owner-membership-only",
    "Membership repair is an idempotent active OWNER upsert for the matching personal workspace",
    [FILES.repair],
    all(membershipInsert, [
      /'OWNER'(?:\s*::\s*"?workspace_member_role"?)?/i,
      /'ACTIVE'(?:\s*::\s*"?workspace_membership_status"?)?/i,
      /ON\s+CONFLICT\s*\(\s*"?workspace_id"?\s*,\s*"?profile_id"?\s*\)\s+DO\s+UPDATE/i,
      /"?role"?\s*=\s*'OWNER'/i,
      /"?status"?\s*=\s*'ACTIVE'/i,
    ]),
    "requires OWNER/ACTIVE insert and repair-on-conflict only",
  )

  check(
    "repair.null-project-backfill-only",
    "Project repair changes only workspace_id for null-workspace projects matched to their legacy owner",
    [FILES.repair],
    all(projectUpdate, [
      /UPDATE\s+"?projects"?/i,
      /SET\s+"?workspace_id"?\s*=/i,
      /"?workspace_id"?\s+IS\s+NULL/i,
      /created_by_profile_id/i,
      /"?owner_id"?/i,
      /'PERSONAL'/i,
      /'ACTIVE'/i,
    ]) && !/SET[\s\S]*?(?:client_token|visibility|owner_id)\s*=/i.test(projectUpdate),
    "requires owner-matched null-only workspace_id update with no owner/client visibility mutation",
  )

  check(
    "repair.partial-personal-uniqueness",
    "Repair recreates the reviewed active-personal-workspace partial unique index",
    [FILES.repair],
    all(texts.repair, [
      /CREATE\s+UNIQUE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+"?workspaces_active_personal_creator_unique"?/i,
      /ON\s+"?workspaces"?\s*\(\s*"?created_by_profile_id"?\s*\)/i,
      /WHERE\s+"?type"?\s*=\s*'PERSONAL'\s+AND\s+"?status"?\s*=\s*'ACTIVE'/i,
    ]),
    "requires the exact reviewed partial uniqueness predicate",
  )

  const repairClean = texts.repair === null ? null : stripSqlComments(texts.repair)
  const repairForbidden = matchingLabels(repairClean, [
    { label: "RESET", pattern: /^\s*RESET\b/im },
    { label: "DROP", pattern: /^\s*DROP\b/im },
    { label: "TRUNCATE", pattern: /^\s*TRUNCATE\b/im },
    { label: "DELETE", pattern: /^\s*DELETE\s+FROM\b/im },
    { label: "invitation insert", pattern: /INSERT\s+INTO\s+"?collaboration_invitations"?/i },
    { label: "project grant insert", pattern: /INSERT\s+INTO\s+"?project_access_grants"?/i },
    { label: "feedback insert", pattern: /INSERT\s+INTO\s+"?project_feedback(?:_versions)?"?/i },
    { label: "memory insert", pattern: /INSERT\s+INTO\s+"?project_memory_candidates"?/i },
    { label: "migration ledger mutation", pattern: /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE)\s+"?_prisma_migrations"?/i },
    { label: "unreviewed table/enum creation", pattern: /CREATE\s+(?:TABLE|TYPE)\b/i },
  ])
  check(
    "repair.no-scope-expansion-or-destructive-sql",
    "Repair adds no destructive SQL, TEAM/invite/grant/feedback/memory writes, ledger mutation, or unreviewed schema objects",
    [FILES.repair],
    repairClean !== null && repairForbidden.length === 0,
    repairForbidden.length === 0 ? "repair remains inside exact backfill scope" : repairForbidden.join(", "),
  )

  check(
    "repair.non-target-and-ledger-snapshots",
    "Repair snapshots and post-checks TEAM/collaboration rows plus the Prisma migration ledger",
    [FILES.repair],
    all(texts.repair, [
      /set_config\s*\(\s*'teamcollab_005a\.team_count'/i,
      /set_config\s*\(\s*'teamcollab_005a\.invitation_count'/i,
      /set_config\s*\(\s*'teamcollab_005a\.grant_count'/i,
      /set_config\s*\(\s*'teamcollab_005a\.feedback_count'/i,
      /set_config\s*\(\s*'teamcollab_005a\.feedback_version_count'/i,
      /set_config\s*\(\s*'teamcollab_005a\.memory_candidate_count'/i,
      /set_config\s*\(\s*'teamcollab_005a\.migration_ledger_count'/i,
      /current_setting\s*\(\s*'teamcollab_005a\.team_count'\s*\)/i,
      /current_setting\s*\(\s*'teamcollab_005a\.migration_ledger_count'\s*\)/i,
      /out-of-scope collaboration row count changed/i,
      /migration ledger changed/i,
    ]),
    "requires before/after invariants for TEAM, invitation, grant, feedback/version, memory-candidate, and ledger counts",
  )

  const postconditionExceptionCount = texts.repair
    ? (stripSqlComments(texts.repair).match(/RAISE\s+EXCEPTION/gi) ?? []).length
    : 0
  check(
    "repair.fail-closed-postconditions",
    "Repair fails closed on orphan, personal-workspace, OWNER-membership, and null-project postconditions",
    [FILES.repair],
    postconditionExceptionCount >= 3 &&
      all(texts.repair, [
        /RAISE\s+EXCEPTION/i,
        /workspace_id[\s\S]{0,360}IS\s+NULL/i,
        /created_by_profile_id/i,
        /'PERSONAL'/i,
        /'OWNER'/i,
        /'ACTIVE'/i,
      ]),
    `${postconditionExceptionCount} RAISE EXCEPTION guard(s) found`,
  )

  const createTeamRuntimeFiles = [
    FILES.createTeamService,
    FILES.createTeamAction,
    FILES.createTeamDialog,
  ]
  const createTeamRuntimeText = createTeamRuntimeFiles
    .map((file) => read(file) ?? "")
    .join("\n")
  check(
    "runtime.create-team-b1-present",
    "TEAMCOLLAB-005B1 server-only service, authenticated action, and readiness-gated UI are present",
    createTeamRuntimeFiles,
    all(texts.createTeamService, [
      /import\s+["']server-only["']/,
      /createTeamWorkspaceForProfile\s*\(/,
      /db\.\$transaction\s*\(/,
      /isOperatingAuditStorageReady\s*\(/,
    ]) &&
      all(texts.createTeamAction, [
        /^\s*["']use server["']/m,
        /requireUser\s*\(\s*\)/,
        /createTeamWorkspaceForProfile\s*\(/,
      ]) &&
      all(texts.createTeamDialog, [
        /createTeamWorkspace/,
        /readiness\.available/,
        /idempotencyKey/,
      ]),
    "requires the exact 005B1 service/action/dialog slice",
  )

  check(
    "runtime.no-configured-database-mutation",
    "Create-team runtime never selects, migrates, repairs, or mutates a configured database target",
    createTeamRuntimeFiles,
    !/(?:DATABASE_URL|DIRECT_DATABASE_URL|POSTGRES_URL|SUPABASE_DB_URL|prisma\s+migrate|migrate\s+deploy|migration-drafts|preflight\.sql|repair\.sql)/i.test(
      createTeamRuntimeText,
    ),
    "database targeting and migration repair remain outside runtime input/service/UI",
  )

  const failures = checks.filter((entry) => !entry.passed)

  return {
    id: "TEAMCOLLAB-005A-MIGRATION-RECONCILIATION",
    status: failures.length === 0 ? "pass" : "fail",
    summary: {
      passed: checks.length - failures.length,
      failed: failures.length,
      total: checks.length,
    },
    paths: {
      reviewedDraft: FILES.reviewedDraft,
      canonicalMigration: FILES.canonical,
      configuredDriftPreflight: FILES.preflight,
      configuredDriftRepair: FILES.repair,
    },
    safety: {
      canonicalMatchesReviewedDraft: canonicalMatchesDraft,
      preflightReadOnly: preflightClean !== null && preflightForbidden.length === 0,
      repairScopeRestricted:
        repairClean !== null &&
        repairForbidden.length === 0 &&
        disallowedInsertTables.length === 0 &&
        disallowedUpdateTables.length === 0,
      prismaMigrationLedgerMutationAllowed: false,
      destructiveSqlAllowed: false,
      teamInvitationFeedbackMemoryWritesAllowed: false,
      createTeamRuntimeRequired: true,
      configuredDatabaseMutationAllowed: false,
      liveApplyPerformed: false,
    },
    checks,
    failures: failures.map(({ id, label, evidence }) => ({ id, label, evidence })),
  }
}

function printHuman(result) {
  const prefix = result.status === "pass" ? "[PASS]" : "[FAIL]"
  console.log(`${prefix} TEAMCOLLAB migration reconciliation`)
  console.log(`- ${result.summary.passed}/${result.summary.total} checks passed`)

  for (const check of result.checks) {
    console.log(`- [${check.passed ? "PASS" : "FAIL"}] ${check.id}: ${check.label}`)
    if (!check.passed) console.log(`  ${check.evidence}`)
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  const result = buildResult()
  const json = `${JSON.stringify(result, null, 2)}\n`

  if (args.out) {
    const outPath = normalizeOutputPath(args.out)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, json, "utf8")
  }

  if (args.json) console.log(json.trimEnd())
  else printHuman(result)

  if (result.status !== "pass") process.exitCode = 1
}

try {
  main()
} catch (error) {
  console.error("[FAIL] TEAMCOLLAB migration reconciliation checker")
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
}
