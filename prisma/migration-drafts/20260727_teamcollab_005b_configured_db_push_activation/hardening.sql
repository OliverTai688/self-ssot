-- TEAMCOLLAB-005B2 configured db-push hardening.
-- Target shape: Prisma tables/indexes/FKs already exist from `prisma db push`,
-- collaboration/audit feature tables are empty, and MIG-005 data repair passed.
-- Adds only database invariants Prisma cannot represent. It creates no TEAM,
-- invitation, grant, feedback, memory, or audit event rows.

BEGIN;

SELECT pg_advisory_xact_lock(hashtext('teamcollab-005b2-configured-db-push-hardening'));

DO $$
BEGIN
  IF to_regclass('public.collaboration_invitations') IS NULL
     OR to_regclass('public.project_feedback') IS NULL
     OR to_regclass('public.project_feedback_versions') IS NULL
     OR to_regclass('public.project_memory_candidates') IS NULL
     OR to_regclass('public.operating_audit_events') IS NULL THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005B2 hardening blocked: required db-push relation is missing';
  END IF;

  IF EXISTS (SELECT 1 FROM "collaboration_invitations")
     OR EXISTS (SELECT 1 FROM "project_feedback")
     OR EXISTS (SELECT 1 FROM "project_feedback_versions")
     OR EXISTS (SELECT 1 FROM "project_memory_candidates")
     OR EXISTS (SELECT 1 FROM "operating_audit_events") THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005B2 hardening blocked: constrained feature table is not empty';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.collaboration_invitations'::regclass
      AND conname = 'collaboration_invitations_project_pair_check'
  ) THEN
    ALTER TABLE "collaboration_invitations"
      ADD CONSTRAINT "collaboration_invitations_project_pair_check"
      CHECK (
        ("project_id" IS NULL AND "project_role" IS NULL) OR
        ("project_id" IS NOT NULL AND "project_role" IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_feedback'::regclass
      AND conname = 'project_feedback_current_version_positive_check'
  ) THEN
    ALTER TABLE "project_feedback"
      ADD CONSTRAINT "project_feedback_current_version_positive_check"
      CHECK ("current_version" > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_feedback_versions'::regclass
      AND conname = 'project_feedback_versions_version_positive_check'
  ) THEN
    ALTER TABLE "project_feedback_versions"
      ADD CONSTRAINT "project_feedback_versions_version_positive_check"
      CHECK ("version" > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.project_memory_candidates'::regclass
      AND conname = 'project_memory_candidates_feedback_version_positive_check'
  ) THEN
    ALTER TABLE "project_memory_candidates"
      ADD CONSTRAINT "project_memory_candidates_feedback_version_positive_check"
      CHECK ("feedback_version" > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.operating_audit_events'::regclass
      AND conname = 'operating_audit_events_workspace_created_only_check'
  ) THEN
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
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.operating_audit_events'::regclass
      AND conname = 'operating_audit_events_request_ref_hash_check'
  ) THEN
    ALTER TABLE "operating_audit_events"
      ADD CONSTRAINT "operating_audit_events_request_ref_hash_check"
      CHECK ("request_ref" ~ '^[0-9a-f]{64}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.operating_audit_events'::regclass
      AND conname = 'operating_audit_events_no_secret_metadata_check'
  ) THEN
    ALTER TABLE "operating_audit_events"
      ADD CONSTRAINT "operating_audit_events_no_secret_metadata_check"
      CHECK ("metadata" = '{}'::jsonb);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION "prevent_operating_audit_event_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'operating_audit_events is append-only'
    USING ERRCODE = '55000';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.operating_audit_events'::regclass
      AND tgname = 'operating_audit_events_append_only'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER "operating_audit_events_append_only"
    BEFORE UPDATE OR DELETE ON "operating_audit_events"
    FOR EACH ROW
    EXECUTE FUNCTION "prevent_operating_audit_event_mutation"();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index index_row
    JOIN pg_class index_class ON index_class.oid = index_row.indexrelid
    WHERE index_row.indrelid = 'public.workspaces'::regclass
      AND index_class.relname = 'workspaces_active_personal_creator_unique'
      AND index_row.indisunique
      AND index_row.indisvalid
      AND index_row.indisready
      AND index_row.indnkeyatts = 1
      AND index_row.indnatts = 1
      AND index_row.indexprs IS NULL
      AND pg_get_indexdef(index_row.indexrelid, 1, TRUE) = 'created_by_profile_id'
      AND pg_get_expr(index_row.indpred, index_row.indrelid) LIKE '%PERSONAL%'
      AND pg_get_expr(index_row.indpred, index_row.indrelid) LIKE '%ACTIVE%'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005B2 hardening failed: active PERSONAL unique index is not exact';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index index_row
    JOIN pg_class index_class ON index_class.oid = index_row.indexrelid
    WHERE index_row.indrelid = 'public.operating_audit_events'::regclass
      AND index_class.relname = 'operating_audit_events_actor_action_request_unique'
      AND index_row.indisunique
      AND index_row.indisvalid
      AND index_row.indisready
      AND index_row.indnkeyatts = 3
      AND index_row.indnatts = 3
      AND index_row.indpred IS NULL
      AND index_row.indexprs IS NULL
      AND pg_get_indexdef(index_row.indexrelid, 1, TRUE) = 'actor_ref'
      AND pg_get_indexdef(index_row.indexrelid, 2, TRUE) = 'action'
      AND pg_get_indexdef(index_row.indexrelid, 3, TRUE) = 'request_ref'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005B2 hardening failed: audit idempotency index is not exact';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger trigger_row
    JOIN pg_proc trigger_function ON trigger_function.oid = trigger_row.tgfoid
    JOIN pg_language trigger_language ON trigger_language.oid = trigger_function.prolang
    WHERE trigger_row.tgrelid = 'public.operating_audit_events'::regclass
      AND trigger_row.tgname = 'operating_audit_events_append_only'
      AND NOT trigger_row.tgisinternal
      AND trigger_row.tgenabled <> 'D'
      AND pg_get_triggerdef(trigger_row.oid, TRUE) =
        'CREATE TRIGGER operating_audit_events_append_only BEFORE DELETE OR UPDATE ON operating_audit_events FOR EACH ROW EXECUTE FUNCTION prevent_operating_audit_event_mutation()'
      AND trigger_language.lanname = 'plpgsql'
      AND trigger_function.prorettype = 'trigger'::regtype
      AND btrim(regexp_replace(trigger_function.prosrc, '[[:space:]]+', ' ', 'g')) =
        'BEGIN RAISE EXCEPTION ''operating_audit_events is append-only'' USING ERRCODE = ''55000''; END;'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005B2 hardening failed: append-only trigger/function is not exact';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.operating_audit_events'::regclass
      AND conname = 'operating_audit_events_workspace_created_only_check'
      AND contype = 'c' AND convalidated
      AND pg_get_constraintdef(oid, TRUE) =
        'CHECK (actor_type = ''owner''::text AND actor_ref IS NOT NULL AND request_ref IS NOT NULL AND module_key = ''work''::text AND action = ''workspace.created''::text AND target_type = ''workspace''::text AND target_ref IS NOT NULL AND result = ''success''::text AND risk_level = ''HIGH''::text AND approval_level = ''owner_review''::text AND human_approval_required = true AND source_kind = ''server_action''::text AND redaction_version = ''teamcollab-005b-v1''::text AND retention_class = ''high_risk_7_year_review_required''::text)'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.operating_audit_events'::regclass
      AND conname = 'operating_audit_events_request_ref_hash_check'
      AND contype = 'c' AND convalidated
      AND pg_get_constraintdef(oid, TRUE) =
        'CHECK (request_ref ~ ''^[0-9a-f]{64}$''::text)'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.operating_audit_events'::regclass
      AND conname = 'operating_audit_events_no_secret_metadata_check'
      AND contype = 'c' AND convalidated
      AND pg_get_constraintdef(oid, TRUE) =
        'CHECK (metadata = ''{}''::jsonb)'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-005B2 hardening failed: audit CHECK definition is not exact';
  END IF;
END
$$;

COMMIT;

