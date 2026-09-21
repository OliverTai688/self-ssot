-- TEAMCOLLAB-006 follow-on migration.
-- Expands the append-only OperatingAuditEvent catalog only for the reviewed
-- workspace invitation lifecycle. It does not create invitations, members,
-- provider users, or email delivery side effects.

DO $$
DECLARE
  existing_definition TEXT;
BEGIN
  SELECT pg_get_constraintdef(constraint_row.oid, TRUE)
  INTO existing_definition
  FROM pg_constraint constraint_row
  WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
    AND constraint_row.conname = 'operating_audit_events_workspace_created_only_check'
    AND constraint_row.contype = 'c'
    AND constraint_row.convalidated;

  IF existing_definition IS DISTINCT FROM
    'CHECK (actor_type = ''owner''::text AND actor_ref IS NOT NULL AND request_ref IS NOT NULL AND module_key = ''work''::text AND action = ''workspace.created''::text AND target_type = ''workspace''::text AND target_ref IS NOT NULL AND result = ''success''::text AND risk_level = ''HIGH''::text AND approval_level = ''owner_review''::text AND human_approval_required = true AND source_kind = ''server_action''::text AND redaction_version = ''teamcollab-005b-v1''::text AND retention_class = ''high_risk_7_year_review_required''::text)' THEN
    RAISE EXCEPTION
      'TEAMCOLLAB-006 requires the exact validated TEAMCOLLAB-005B audit catalog before expansion';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
      AND constraint_row.conname = 'operating_audit_events_request_ref_hash_check'
      AND constraint_row.contype = 'c'
      AND constraint_row.convalidated
      AND pg_get_constraintdef(constraint_row.oid, TRUE) =
        'CHECK (request_ref ~ ''^[0-9a-f]{64}$''::text)'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
      AND constraint_row.conname = 'operating_audit_events_no_secret_metadata_check'
      AND constraint_row.contype = 'c'
      AND constraint_row.convalidated
      AND pg_get_constraintdef(constraint_row.oid, TRUE) =
        'CHECK (metadata = ''{}''::jsonb)'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-006 requires exact request hash and no-secret metadata constraints';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger trigger_row
    JOIN pg_class table_row ON table_row.oid = trigger_row.tgrelid
    JOIN pg_namespace namespace_row ON namespace_row.oid = table_row.relnamespace
    JOIN pg_proc trigger_function ON trigger_function.oid = trigger_row.tgfoid
    JOIN pg_language trigger_language ON trigger_language.oid = trigger_function.prolang
    WHERE namespace_row.nspname = current_schema()
      AND table_row.relname = 'operating_audit_events'
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
    RAISE EXCEPTION 'TEAMCOLLAB-006 requires the exact enabled append-only trigger/function';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index index_row
    JOIN pg_class index_class ON index_class.oid = index_row.indexrelid
    WHERE index_row.indrelid = to_regclass('operating_audit_events')
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
    RAISE EXCEPTION 'TEAMCOLLAB-006 requires the exact audit idempotency unique index';
  END IF;
END;
$$;

ALTER TABLE "operating_audit_events"
  DROP CONSTRAINT "operating_audit_events_workspace_created_only_check";

ALTER TABLE "operating_audit_events"
  ADD CONSTRAINT "operating_audit_events_teamcollab_action_catalog_check"
  CHECK (
    "actor_ref" IS NOT NULL
    AND "request_ref" IS NOT NULL
    AND "module_key" = 'work'
    AND "target_ref" IS NOT NULL
    AND "risk_level" = 'HIGH'
    AND "human_approval_required" = TRUE
    AND "source_kind" = 'server_action'
    AND "retention_class" = 'high_risk_7_year_review_required'
    AND (
      (
        "actor_type" = 'owner'
        AND "action" = 'workspace.created'
        AND "target_type" = 'workspace'
        AND "result" = 'success'
        AND "approval_level" = 'owner_review'
        AND "redaction_version" = 'teamcollab-005b-v1'
      )
      OR
      (
        "actor_type" = 'profile'
        AND "target_type" = 'workspace_invitation'
        AND "approval_level" = 'workspace_manager'
        AND "redaction_version" = 'teamcollab-006-v1'
        AND (
          ("action" = 'workspace.member.invited' AND "result" = 'success')
          OR ("action" = 'workspace.invitation.accepted' AND "result" IN ('success', 'blocked'))
          OR ("action" = 'workspace.invitation.revoked' AND "result" = 'success')
          OR ("action" = 'workspace.invitation.expired' AND "result" = 'blocked')
        )
      )
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
      AND constraint_row.conname = 'operating_audit_events_teamcollab_action_catalog_check'
      AND constraint_row.contype = 'c'
      AND constraint_row.convalidated
      AND pg_get_constraintdef(constraint_row.oid, TRUE) LIKE '%workspace.created%'
      AND pg_get_constraintdef(constraint_row.oid, TRUE) LIKE '%workspace.member.invited%'
      AND pg_get_constraintdef(constraint_row.oid, TRUE) LIKE '%workspace.invitation.accepted%'
      AND pg_get_constraintdef(constraint_row.oid, TRUE) LIKE '%workspace.invitation.revoked%'
      AND pg_get_constraintdef(constraint_row.oid, TRUE) LIKE '%workspace.invitation.expired%'
      AND pg_get_constraintdef(constraint_row.oid, TRUE) LIKE '%teamcollab-006-v1%'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-006 audit catalog constraint verification failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
      AND constraint_row.conname = 'operating_audit_events_request_ref_hash_check'
      AND constraint_row.contype = 'c'
      AND constraint_row.convalidated
      AND pg_get_constraintdef(constraint_row.oid, TRUE) =
        'CHECK (request_ref ~ ''^[0-9a-f]{64}$''::text)'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_row
    WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
      AND constraint_row.conname = 'operating_audit_events_no_secret_metadata_check'
      AND constraint_row.contype = 'c'
      AND constraint_row.convalidated
      AND pg_get_constraintdef(constraint_row.oid, TRUE) =
        'CHECK (metadata = ''{}''::jsonb)'
  ) THEN
    RAISE EXCEPTION 'TEAMCOLLAB-006 requires the existing request hash and no-secret metadata constraints';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger trigger_row
    JOIN pg_class table_row ON table_row.oid = trigger_row.tgrelid
    JOIN pg_namespace namespace_row ON namespace_row.oid = table_row.relnamespace
    JOIN pg_proc trigger_function ON trigger_function.oid = trigger_row.tgfoid
    JOIN pg_language trigger_language ON trigger_language.oid = trigger_function.prolang
    WHERE namespace_row.nspname = current_schema()
      AND table_row.relname = 'operating_audit_events'
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
    RAISE EXCEPTION 'TEAMCOLLAB-006 requires the exact enabled append-only trigger and prevent_operating_audit_event_mutation function';
  END IF;
END;
$$;
