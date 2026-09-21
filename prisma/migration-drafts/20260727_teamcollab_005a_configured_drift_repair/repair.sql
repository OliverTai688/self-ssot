-- TEAMCOLLAB-005A configured-target personal-workspace repair.
-- REVIEW ONLY. Do not run without reviewing preflight.sql for the exact target.
-- Scope: PERSONAL workspace, creator OWNER membership, caller-owned null-project scope,
-- and the missing active-personal partial unique index. No collaboration feature rows.

BEGIN;

-- Serialize this one reviewed repair across operator sessions.
SELECT pg_advisory_xact_lock(hashtext('teamcollab-005a-configured-drift-repair'));

-- Refuse to guess when the additive schema shape is incomplete or contradictory.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NULL
     OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.projects') IS NULL
     OR to_regclass('public.workspaces') IS NULL
     OR to_regclass('public.workspace_memberships') IS NULL
     OR to_regclass('public.collaboration_invitations') IS NULL
     OR to_regclass('public.project_access_grants') IS NULL
     OR to_regclass('public.project_feedback') IS NULL
     OR to_regclass('public.project_feedback_versions') IS NULL
     OR to_regclass('public.project_memory_candidates') IS NULL THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair blocked: required relation is missing';
  END IF;

  IF to_regtype('public.workspace_type') IS NULL
     OR to_regtype('public.workspace_status') IS NULL
     OR to_regtype('public.workspace_member_role') IS NULL
     OR to_regtype('public.workspace_membership_status') IS NULL
     OR to_regtype('public.project_access_role') IS NULL THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair blocked: required enum is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'workspace_id'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair blocked: projects.workspace_id is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'workspace_memberships_workspace_profile_unique'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair blocked: membership upsert index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_workspace_id_fkey'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair blocked: project workspace foreign key is missing';
  END IF;

  IF EXISTS (
    SELECT workspace."created_by_profile_id"
    FROM "workspaces" AS workspace
    WHERE workspace."type" = 'PERSONAL'
      AND workspace."status" = 'ACTIVE'
    GROUP BY workspace."created_by_profile_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair blocked: duplicate active PERSONAL workspaces exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "profiles" AS profile
    JOIN "workspaces" AS workspace
      ON workspace."slug" = 'personal-' || REPLACE(profile."id"::text, '-', '')
    WHERE workspace."created_by_profile_id" <> profile."id"
       OR workspace."type" <> 'PERSONAL'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair blocked: deterministic personal slug collision';
  END IF;
END
$$;

-- Snapshot non-target resources and the Prisma ledger for hard no-expansion checks.
SELECT set_config(
  'teamcollab_005a.team_count',
  (SELECT COUNT(*)::text FROM "workspaces" WHERE "type" = 'TEAM'),
  true
);
SELECT set_config(
  'teamcollab_005a.invitation_count',
  (SELECT COUNT(*)::text FROM "collaboration_invitations"),
  true
);
SELECT set_config(
  'teamcollab_005a.grant_count',
  (SELECT COUNT(*)::text FROM "project_access_grants"),
  true
);
SELECT set_config(
  'teamcollab_005a.feedback_count',
  (SELECT COUNT(*)::text FROM "project_feedback"),
  true
);
SELECT set_config(
  'teamcollab_005a.feedback_version_count',
  (SELECT COUNT(*)::text FROM "project_feedback_versions"),
  true
);
SELECT set_config(
  'teamcollab_005a.memory_candidate_count',
  (SELECT COUNT(*)::text FROM "project_memory_candidates"),
  true
);
SELECT set_config(
  'teamcollab_005a.migration_ledger_count',
  (SELECT COUNT(*)::text FROM "_prisma_migrations"),
  true
);

-- Idempotently create or reactivate exactly the deterministic PERSONAL workspace.
INSERT INTO "workspaces" (
  "id",
  "type",
  "name",
  "slug",
  "status",
  "default_project_access_role",
  "ai_feedback_memory_enabled",
  "created_by_profile_id",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'PERSONAL'::"workspace_type",
  COALESCE(NULLIF(BTRIM(profile."full_name"), ''), profile."email") || '''s workspace',
  'personal-' || REPLACE(profile."id"::text, '-', ''),
  'ACTIVE'::"workspace_status",
  'VIEWER'::"project_access_role",
  false,
  profile."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "profiles" AS profile
WHERE NOT EXISTS (
  SELECT 1
  FROM "workspaces" AS workspace
  WHERE workspace."created_by_profile_id" = profile."id"
    AND workspace."type" = 'PERSONAL'
    AND workspace."status" = 'ACTIVE'
)
ON CONFLICT ("slug") DO UPDATE
SET "status" = 'ACTIVE',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "workspaces"."created_by_profile_id" = EXCLUDED."created_by_profile_id"
  AND "workspaces"."type" = 'PERSONAL';

-- Idempotently make the PERSONAL workspace creator its active OWNER.
INSERT INTO "workspace_memberships" (
  "id",
  "workspace_id",
  "profile_id",
  "role",
  "status",
  "joined_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  workspace."id",
  profile."id",
  'OWNER'::"workspace_member_role",
  'ACTIVE'::"workspace_membership_status",
  profile."created_at",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "profiles" AS profile
JOIN "workspaces" AS workspace
  ON workspace."created_by_profile_id" = profile."id"
 AND workspace."type" = 'PERSONAL'
 AND workspace."status" = 'ACTIVE'
ON CONFLICT ("workspace_id", "profile_id") DO UPDATE
SET "role" = 'OWNER',
    "status" = 'ACTIVE',
    "joined_at" = COALESCE("workspace_memberships"."joined_at", EXCLUDED."joined_at"),
    "suspended_at" = NULL,
    "updated_at" = CURRENT_TIMESTAMP;

-- Backfill only legacy projects that are still null and belong to the creator Profile.
UPDATE "projects" AS project
SET "workspace_id" = workspace."id"
FROM "workspaces" AS workspace
WHERE project."workspace_id" IS NULL
  AND workspace."created_by_profile_id" = project."owner_id"
  AND workspace."type" = 'PERSONAL'
  AND workspace."status" = 'ACTIVE';

-- Restore the missing database-only invariant after data is repaired.
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_active_personal_creator_unique"
  ON "workspaces"("created_by_profile_id")
  WHERE "type" = 'PERSONAL' AND "status" = 'ACTIVE';

-- Hard postconditions: any mismatch aborts and rolls back the entire repair.
DO $$
BEGIN
  IF EXISTS (
    SELECT profile."id"
    FROM "profiles" AS profile
    LEFT JOIN "workspaces" AS workspace
      ON workspace."created_by_profile_id" = profile."id"
     AND workspace."type" = 'PERSONAL'
     AND workspace."status" = 'ACTIVE'
    GROUP BY profile."id"
    HAVING COUNT(workspace."id") <> 1
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair failed: expected one active PERSONAL workspace per Profile';
  END IF;

  IF EXISTS (
    SELECT workspace."id"
    FROM "workspaces" AS workspace
    LEFT JOIN "workspace_memberships" AS membership
      ON membership."workspace_id" = workspace."id"
    WHERE workspace."type" = 'PERSONAL'
      AND workspace."status" = 'ACTIVE'
    GROUP BY workspace."id", workspace."created_by_profile_id"
    HAVING COUNT(*) FILTER (
      WHERE membership."profile_id" = workspace."created_by_profile_id"
        AND membership."role" = 'OWNER'
        AND membership."status" = 'ACTIVE'
    ) <> 1
       OR COUNT(*) FILTER (WHERE membership."status" = 'ACTIVE') <> 1
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair failed: PERSONAL workspace membership invariant';
  END IF;

  IF EXISTS (SELECT 1 FROM "projects" WHERE "workspace_id" IS NULL) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair failed: null project workspace remains';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS index_class
    JOIN pg_namespace AS namespace
      ON namespace.oid = index_class.relnamespace
    JOIN pg_index AS index_meta
      ON index_meta.indexrelid = index_class.oid
    WHERE namespace.nspname = 'public'
      AND index_class.relname = 'workspaces_active_personal_creator_unique'
      AND index_meta.indisunique
      AND pg_get_indexdef(index_meta.indexrelid, 1, true) = 'created_by_profile_id'
      AND pg_get_expr(index_meta.indpred, index_meta.indrelid) LIKE '%PERSONAL%'
      AND pg_get_expr(index_meta.indpred, index_meta.indrelid) LIKE '%ACTIVE%'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair failed: active-personal unique partial index shape is invalid';
  END IF;

  IF (SELECT COUNT(*) FROM "workspaces" WHERE "type" = 'TEAM')::text
       <> current_setting('teamcollab_005a.team_count')
     OR (SELECT COUNT(*) FROM "collaboration_invitations")::text
       <> current_setting('teamcollab_005a.invitation_count')
     OR (SELECT COUNT(*) FROM "project_access_grants")::text
       <> current_setting('teamcollab_005a.grant_count')
     OR (SELECT COUNT(*) FROM "project_feedback")::text
       <> current_setting('teamcollab_005a.feedback_count')
     OR (SELECT COUNT(*) FROM "project_feedback_versions")::text
       <> current_setting('teamcollab_005a.feedback_version_count')
     OR (SELECT COUNT(*) FROM "project_memory_candidates")::text
       <> current_setting('teamcollab_005a.memory_candidate_count') THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair failed: out-of-scope collaboration row count changed';
  END IF;

  IF (SELECT COUNT(*) FROM "_prisma_migrations")::text
       <> current_setting('teamcollab_005a.migration_ledger_count') THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005A repair failed: migration ledger changed';
  END IF;
END
$$;

COMMIT;
