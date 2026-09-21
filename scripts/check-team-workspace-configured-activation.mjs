#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const hardeningPath = path.join(
  root,
  "prisma/migration-drafts/20260727_teamcollab_005b_configured_db_push_activation/hardening.sql",
)
const postcheckPath = path.join(
  root,
  "prisma/migration-drafts/20260727_teamcollab_005b_configured_db_push_activation/postcheck.sql",
)

const checks = []
const add = (id, ok, note) => checks.push({ id, ok: Boolean(ok), note })
const read = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "")
const hardening = read(hardeningPath)
const postcheck = read(postcheckPath)
const stripComments = (value) => value.replace(/--.*$/gm, "")

add("file.hardening", hardening.length > 0, "configured db-push hardening exists")
add("file.postcheck", postcheck.length > 0, "aggregate/schema postcheck exists")
add(
  "hardening.transaction-lock",
  /BEGIN;/.test(hardening) &&
    /pg_advisory_xact_lock\s*\(\s*hashtext\('teamcollab-005b2-configured-db-push-hardening'\)\s*\)/.test(
      hardening,
    ) &&
    /COMMIT;/.test(hardening),
  "one advisory-locked transaction",
)
add(
  "hardening.empty-feature-gate",
  [
    "collaboration_invitations",
    "project_feedback",
    "project_feedback_versions",
    "project_memory_candidates",
    "operating_audit_events",
  ].every((name) => hardening.includes(`EXISTS (SELECT 1 FROM \"${name}\")`)),
  "refuses to harden non-empty constrained feature tables",
)
add(
  "hardening.collaboration-checks",
  [
    "collaboration_invitations_project_pair_check",
    "project_feedback_current_version_positive_check",
    "project_feedback_versions_version_positive_check",
    "project_memory_candidates_feedback_version_positive_check",
  ].every((name) => hardening.includes(name)),
  "restores four Prisma-unrepresentable collaboration CHECKs",
)
add(
  "hardening.audit-checks",
  [
    "operating_audit_events_workspace_created_only_check",
    "operating_audit_events_request_ref_hash_check",
    "operating_audit_events_no_secret_metadata_check",
  ].every((name) => hardening.includes(name)),
  "restores exact no-secret audit CHECKs",
)
add(
  "hardening.append-only",
  /prevent_operating_audit_event_mutation/.test(hardening) &&
    /operating_audit_events_append_only/.test(hardening) &&
    /ERRCODE\s*=\s*'55000'/.test(hardening) &&
    /BEFORE UPDATE OR DELETE/.test(hardening),
  "append-only function and trigger use SQLSTATE 55000",
)
add(
  "hardening.exact-index-guards",
  /workspaces_active_personal_creator_unique/.test(hardening) &&
    /operating_audit_events_actor_action_request_unique/.test(hardening) &&
    /indnkeyatts = 3/.test(hardening) &&
    /indpred IS NULL/.test(hardening),
  "partial PERSONAL and exact audit idempotency indexes are verified",
)
const hardeningCode = stripComments(hardening)
add(
  "hardening.no-feature-data-write",
  !/\bINSERT\s+INTO\b|\bUPDATE\s+\"?[a-z_]+\"?\s+SET\b|\bDELETE\s+FROM\b|\bTRUNCATE\b/i.test(
    hardeningCode,
  ),
  "hardening changes invariants only, not feature rows",
)
const postcheckCode = stripComments(postcheck)
add(
  "postcheck.read-only",
  /BEGIN TRANSACTION READ ONLY;/.test(postcheck) &&
    !/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bALTER\b|\bCREATE\b|\bDROP\b|\bTRUNCATE\b/i.test(
      postcheckCode,
    ),
  "postcheck is aggregate/schema read-only SQL",
)
add(
  "postcheck.activation-evidence",
  [
    "active_personal_count",
    "active_owner_membership_count",
    "null_workspace_project_count",
    "audit_event_count",
    "20260727150000_team_workspace_collaboration",
    "20260727170000_team_workspace_creation_audit",
  ].every((marker) => postcheck.includes(marker)),
  "postcheck covers data, audit, and ledger activation state",
)
add(
  "postcheck.no-secret-output",
  !/\bemail\b|\btoken\b|\bbody\b|\bname\b|\bslug\b|DATABASE_URL|DIRECT_DATABASE_URL/i.test(
    postcheckCode,
  ),
  "postcheck emits no private content or connection target",
)

const failed = checks.filter((check) => !check.ok)
for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.note}`)
}
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length > 0) process.exitCode = 1

