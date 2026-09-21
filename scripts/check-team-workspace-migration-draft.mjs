#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const schemaPath = path.join(root, "prisma/schema.prisma")
const draftDir = path.join(
  root,
  "prisma/migration-drafts/20260727_teamcollab_004_workspace_collaboration_additive",
)
const sqlPath = path.join(draftDir, "migration.sql")
const readmePath = path.join(draftDir, "README.md")
const migrationsDir = path.join(root, "prisma/migrations")
const approvedCanonicalMigration = "20260727150000_team_workspace_collaboration"

const read = (filePath) => fs.readFileSync(filePath, "utf8")
const errors = []

for (const filePath of [schemaPath, sqlPath, readmePath]) {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${path.relative(root, filePath)}`)
  }
}

const schema = fs.existsSync(schemaPath) ? read(schemaPath) : ""
const sql = fs.existsSync(sqlPath) ? read(sqlPath) : ""
const readme = fs.existsSync(readmePath) ? read(readmePath) : ""

const requiredModels = [
  "Workspace",
  "WorkspaceMembership",
  "CollaborationInvitation",
  "ProjectAccessGrant",
  "ProjectFeedback",
  "ProjectFeedbackVersion",
  "ProjectMemoryCandidate",
]
const requiredEnums = [
  "WorkspaceType",
  "WorkspaceStatus",
  "WorkspaceMemberRole",
  "WorkspaceMembershipStatus",
  "ProjectAccessMode",
  "ProjectAccessRole",
  "ProjectAccessGrantStatus",
  "CollaborationInvitationStatus",
  "ProjectFeedbackTargetType",
  "ProjectFeedbackStatus",
  "ProjectMemoryCandidateStatus",
]
const requiredSql = [
  "TEAMCOLLAB-004-MIGRATION-DRAFT",
  "intentionally outside prisma/migrations",
  'CREATE TABLE "workspaces"',
  'CREATE TABLE "workspace_memberships"',
  'CREATE TABLE "collaboration_invitations"',
  'CREATE TABLE "project_access_grants"',
  'CREATE TABLE "project_feedback"',
  'CREATE TABLE "project_feedback_versions"',
  'CREATE TABLE "project_memory_candidates"',
  'ADD COLUMN "auth_user_id" UUID',
  'ADD COLUMN "workspace_id" UUID',
  'WHERE p."workspace_id" IS NULL',
  'ON CONFLICT ("workspace_id", "profile_id") DO UPDATE',
  'workspaces_active_personal_creator_unique',
  'project_memory_candidates_feedback_id_feedback_version_fkey',
  "No RLS policies",
]

for (const model of requiredModels) {
  if (!schema.includes(`model ${model} {`)) errors.push(`Schema is missing model ${model}`)
}
for (const item of requiredEnums) {
  if (!schema.includes(`enum ${item} {`)) errors.push(`Schema is missing enum ${item}`)
}
for (const marker of requiredSql) {
  if (!sql.includes(marker)) errors.push(`Draft SQL is missing marker: ${marker}`)
}

const forbiddenSql = [
  [/^\s*DROP\b/im, "DROP"],
  [/^\s*TRUNCATE\b/im, "TRUNCATE"],
  [/^\s*DELETE\b/im, "DELETE"],
  [/^\s*CREATE\s+POLICY\b/im, "CREATE POLICY"],
  [/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i, "ENABLE ROW LEVEL SECURITY"],
  [/project_phase_nodes|project_milestones/i, "unrelated project timeline DDL"],
  [/client_token|visibility_type/i, "Client Portal column mutation"],
]
for (const [pattern, label] of forbiddenSql) {
  if (pattern.test(sql)) errors.push(`Draft SQL contains forbidden ${label}`)
}

if (!schema.includes("authUserId String?")) {
  errors.push("Profile.authUserId must remain nullable during transition")
}
if (!schema.includes("workspaceId String?")) {
  errors.push("Project.workspaceId must remain nullable during transition")
}
if (!schema.includes("references: [feedbackId, version]")) {
  errors.push("Memory candidate must resolve a persisted feedback version")
}
if (!readme.includes("review-only") || !readme.includes("outside `prisma/migrations`")) {
  errors.push("Draft README is missing nondeployable review-only boundary")
}

if (fs.existsSync(migrationsDir)) {
  const deployableHits = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => /teamcollab|workspace_collaboration/i.test(name))
  const unexpectedDeployableHits = deployableHits.filter(
    (name) => name !== approvedCanonicalMigration,
  )
  if (unexpectedDeployableHits.length > 0) {
    errors.push(
      `Unexpected TEAMCOLLAB migration under prisma/migrations: ${unexpectedDeployableHits.join(", ")}`,
    )
  }
}

const result = {
  status: errors.length === 0 ? "passed" : "failed",
  draftPath: path.relative(root, sqlPath),
  deployableMigrationCreated: fs.existsSync(
    path.join(migrationsDir, approvedCanonicalMigration, "migration.sql"),
  ),
  approvedCanonicalMigration,
  liveApplyAuthorized: false,
  requiredModels: requiredModels.length,
  requiredEnums: requiredEnums.length,
  errors,
}

console.log(JSON.stringify(result, null, 2))
process.exitCode = errors.length === 0 ? 0 : 1
