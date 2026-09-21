-- TEAMCOLLAB-005A configured-target drift preflight.
-- READ ONLY. This packet reports structure and aggregate evidence only.
-- It intentionally selects no email, name, slug, token, feedback, or project content.

BEGIN TRANSACTION READ ONLY;

-- Expected relation presence. Null regclass values are a hard stop for repair.
SELECT expected.object_name,
       to_regclass('public.' || expected.object_name) IS NOT NULL AS is_present
FROM (VALUES
  ('_prisma_migrations'),
  ('profiles'),
  ('projects'),
  ('workspaces'),
  ('workspace_memberships'),
  ('collaboration_invitations'),
  ('project_access_grants'),
  ('project_feedback'),
  ('project_feedback_versions'),
  ('project_memory_candidates')
) AS expected(object_name)
ORDER BY expected.object_name;

-- Target migration-ledger evidence. This query never changes migration history.
SELECT "migration_name",
       "finished_at" IS NOT NULL AS finished,
       "rolled_back_at" IS NOT NULL AS rolled_back,
       "applied_steps_count"
FROM "_prisma_migrations"
WHERE "migration_name" IN (
  '20260602155517_baseline_initial_schema',
  '20260722084811_add_file_media_assets',
  '20260727150000_team_workspace_collaboration'
)
ORDER BY "migration_name";

-- Expected additive columns and their actual types/nullability.
WITH expected("table_name", "column_name") AS (
  VALUES
    ('profiles', 'auth_user_id'),
    ('projects', 'workspace_id'),
    ('projects', 'access_mode'),
    ('workspaces', 'id'),
    ('workspaces', 'type'),
    ('workspaces', 'status'),
    ('workspaces', 'created_by_profile_id'),
    ('workspace_memberships', 'workspace_id'),
    ('workspace_memberships', 'profile_id'),
    ('workspace_memberships', 'role'),
    ('workspace_memberships', 'status')
)
SELECT expected."table_name",
       expected."column_name",
       columns."column_name" IS NOT NULL AS is_present,
       columns."data_type",
       columns."udt_name",
       columns."is_nullable"
FROM expected
LEFT JOIN information_schema.columns AS columns
  ON columns.table_schema = 'public'
 AND columns.table_name = expected."table_name"
 AND columns.column_name = expected."column_name"
ORDER BY expected."table_name", expected."column_name";

-- Enum shape evidence without row data.
SELECT types.typname AS enum_name,
       string_agg(enums.enumlabel, ',' ORDER BY enums.enumsortorder) AS enum_values
FROM pg_type AS types
JOIN pg_enum AS enums ON enums.enumtypid = types.oid
WHERE types.typname IN (
  'workspace_type',
  'workspace_status',
  'workspace_member_role',
  'workspace_membership_status',
  'project_access_mode',
  'project_access_role'
)
GROUP BY types.typname
ORDER BY types.typname;

-- Expected index evidence. Index definitions contain schema only, never row values.
WITH expected("indexname") AS (
  VALUES
    ('profiles_auth_user_id_key'),
    ('workspaces_slug_key'),
    ('workspaces_active_personal_creator_unique'),
    ('workspaces_status_type_idx'),
    ('workspace_memberships_workspace_profile_unique'),
    ('workspace_memberships_profile_status_idx'),
    ('collaboration_invitations_token_digest_key'),
    ('collaboration_invitations_workspace_email_status_idx'),
    ('collaboration_invitations_expiry_status_idx'),
    ('project_access_grants_project_membership_unique'),
    ('project_access_grants_membership_role_status_idx'),
    ('project_feedback_workspace_project_status_idx'),
    ('project_feedback_author_created_idx'),
    ('project_feedback_versions_feedback_version_unique'),
    ('project_memory_candidates_workspace_project_status_idx'),
    ('project_memory_candidates_feedback_version_idx'),
    ('projects_workspace_status_idx')
)
SELECT expected."indexname",
       indexes.indexname IS NOT NULL AS is_present,
       indexes.indexdef
FROM expected
LEFT JOIN pg_indexes AS indexes
  ON indexes.schemaname = 'public'
 AND indexes.indexname = expected."indexname"
ORDER BY expected."indexname";

-- Expected foreign-key/check constraint evidence.
WITH expected("table_name", "constraint_name") AS (
  VALUES
    ('workspaces', 'workspaces_created_by_profile_id_fkey'),
    ('workspace_memberships', 'workspace_memberships_workspace_id_fkey'),
    ('workspace_memberships', 'workspace_memberships_profile_id_fkey'),
    ('projects', 'projects_workspace_id_fkey'),
    ('collaboration_invitations', 'collaboration_invitations_project_pair_check'),
    ('project_feedback', 'project_feedback_current_version_positive_check'),
    ('project_feedback_versions', 'project_feedback_versions_version_positive_check'),
    ('project_memory_candidates', 'project_memory_candidates_feedback_version_positive_check'),
    ('project_memory_candidates', 'project_memory_candidates_feedback_id_feedback_version_fkey')
)
SELECT expected."table_name",
       expected."constraint_name",
       constraints.constraint_name IS NOT NULL AS is_present,
       constraints.constraint_type
FROM expected
LEFT JOIN information_schema.table_constraints AS constraints
  ON constraints.constraint_schema = 'public'
 AND constraints.table_name = expected."table_name"
 AND constraints.constraint_name = expected."constraint_name"
ORDER BY expected."table_name", expected."constraint_name";

-- Aggregate-only row-count evidence.
SELECT
  (SELECT COUNT(*) FROM "profiles") AS profile_count,
  (SELECT COUNT(*) FROM "projects") AS project_count,
  (SELECT COUNT(*) FROM "workspaces") AS workspace_count,
  (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'PERSONAL') AS personal_workspace_count,
  (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'TEAM') AS team_workspace_count,
  (SELECT COUNT(*) FROM "workspace_memberships") AS membership_count,
  (SELECT COUNT(*) FROM "collaboration_invitations") AS invitation_count,
  (SELECT COUNT(*) FROM "project_access_grants") AS grant_count,
  (SELECT COUNT(*) FROM "project_feedback") AS feedback_count,
  (SELECT COUNT(*) FROM "project_feedback_versions") AS feedback_version_count,
  (SELECT COUNT(*) FROM "project_memory_candidates") AS memory_candidate_count;

-- Aggregate-only drift evidence used to decide whether repair is applicable.
SELECT
  (
    SELECT COUNT(*)
    FROM "profiles" AS profile
    WHERE NOT EXISTS (
      SELECT 1
      FROM "workspaces" AS workspace
      WHERE workspace."created_by_profile_id" = profile."id"
        AND workspace."type" = 'PERSONAL'
        AND workspace."status" = 'ACTIVE'
    )
  ) AS profiles_missing_active_personal_workspace,
  (
    SELECT COUNT(*)
    FROM "workspaces" AS workspace
    WHERE workspace."type" = 'PERSONAL'
      AND workspace."status" = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1
        FROM "workspace_memberships" AS membership
        WHERE membership."workspace_id" = workspace."id"
          AND membership."profile_id" = workspace."created_by_profile_id"
          AND membership."role" = 'OWNER'
          AND membership."status" = 'ACTIVE'
      )
  ) AS personal_workspaces_missing_active_creator_owner,
  (
    SELECT COUNT(*)
    FROM (
      SELECT workspace."created_by_profile_id"
      FROM "workspaces" AS workspace
      WHERE workspace."type" = 'PERSONAL'
        AND workspace."status" = 'ACTIVE'
      GROUP BY workspace."created_by_profile_id"
      HAVING COUNT(*) > 1
    ) AS duplicate_personal_creators
  ) AS profiles_with_multiple_active_personal_workspaces,
  (SELECT COUNT(*) FROM "projects" WHERE "workspace_id" IS NULL) AS null_workspace_projects;

COMMIT;
