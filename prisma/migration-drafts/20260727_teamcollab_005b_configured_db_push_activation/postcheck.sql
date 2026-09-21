-- TEAMCOLLAB-005B2 configured activation postcheck.
-- Aggregate/schema-only output; no email, content, token, URL, or private payload.

BEGIN TRANSACTION READ ONLY;

SELECT
  (SELECT COUNT(*) FROM "profiles") AS profile_count,
  (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'PERSONAL' AND "status" = 'ACTIVE') AS active_personal_count,
  (SELECT COUNT(*) FROM "workspace_memberships" WHERE "role" = 'OWNER' AND "status" = 'ACTIVE') AS active_owner_membership_count,
  (SELECT COUNT(*) FROM "projects" WHERE "workspace_id" IS NULL) AS null_workspace_project_count,
  (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'TEAM') AS team_count,
  (SELECT COUNT(*) FROM "collaboration_invitations") AS invitation_count,
  (SELECT COUNT(*) FROM "project_access_grants") AS grant_count,
  (SELECT COUNT(*) FROM "project_feedback") AS feedback_count,
  (SELECT COUNT(*) FROM "project_feedback_versions") AS feedback_version_count,
  (SELECT COUNT(*) FROM "project_memory_candidates") AS memory_candidate_count,
  (SELECT COUNT(*) FROM "operating_audit_events") AS audit_event_count;

SELECT "migration_name", "finished_at" IS NOT NULL AS finished,
       "rolled_back_at" IS NOT NULL AS rolled_back, "applied_steps_count"
FROM "_prisma_migrations"
WHERE "migration_name" IN (
  '20260727150000_team_workspace_collaboration',
  '20260727170000_team_workspace_creation_audit'
)
ORDER BY "migration_name";

SELECT conrelid::regclass::text AS table_name, conname, convalidated,
       pg_get_constraintdef(oid, TRUE) AS definition
FROM pg_constraint
WHERE conname IN (
  'collaboration_invitations_project_pair_check',
  'project_feedback_current_version_positive_check',
  'project_feedback_versions_version_positive_check',
  'project_memory_candidates_feedback_version_positive_check',
  'operating_audit_events_workspace_created_only_check',
  'operating_audit_events_request_ref_hash_check',
  'operating_audit_events_no_secret_metadata_check'
)
ORDER BY conname;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'workspaces_active_personal_creator_unique',
    'operating_audit_events_actor_action_request_unique'
  )
ORDER BY indexname;

SELECT trigger_row.tgname, trigger_row.tgenabled,
       pg_get_triggerdef(trigger_row.oid, TRUE) AS definition
FROM pg_trigger trigger_row
WHERE trigger_row.tgrelid = 'public.operating_audit_events'::regclass
  AND trigger_row.tgname = 'operating_audit_events_append_only'
  AND NOT trigger_row.tgisinternal;

COMMIT;

