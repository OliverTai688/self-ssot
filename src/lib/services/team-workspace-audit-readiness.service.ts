import "server-only"

import { Prisma } from "@prisma/client"

export const TEAMCOLLAB_AUDIT_CATALOG_CONSTRAINT =
  "operating_audit_events_teamcollab_action_catalog_check" as const

const TEAMCOLLAB_AUDIT_CATALOG_DEFINITION =
  "CHECK (actor_ref IS NOT NULL AND request_ref IS NOT NULL AND module_key = 'work'::text AND target_ref IS NOT NULL AND risk_level = 'HIGH'::text AND human_approval_required = true AND source_kind = 'server_action'::text AND retention_class = 'high_risk_7_year_review_required'::text AND (actor_type = 'owner'::text AND action = 'workspace.created'::text AND target_type = 'workspace'::text AND result = 'success'::text AND approval_level = 'owner_review'::text AND redaction_version = 'teamcollab-005b-v1'::text OR actor_type = 'profile'::text AND target_type = 'workspace_invitation'::text AND approval_level = 'workspace_manager'::text AND redaction_version = 'teamcollab-006-v1'::text AND (action = 'workspace.member.invited'::text AND result = 'success'::text OR action = 'workspace.invitation.accepted'::text AND (result = ANY (ARRAY['success'::text, 'blocked'::text])) OR action = 'workspace.invitation.revoked'::text AND result = 'success'::text OR action = 'workspace.invitation.expired'::text AND result = 'blocked'::text)))" as const

export type TeamCollaborationAuditScope =
  | "workspace.created"
  | "workspace.invitation"

type AuditCatalogClient = Pick<Prisma.TransactionClient, "$queryRaw">

type AuditCatalogRow = {
  tableReady: boolean
  appendOnlyTriggerReady: boolean
  legacyWorkspaceCreatedConstraintReady: boolean
  teamCollaborationCatalogConstraintReady: boolean
  legacyConstraintAbsent: boolean
  requestRefConstraintReady: boolean
  noSecretConstraintReady: boolean
  idempotencyIndexReady: boolean
}

/**
 * Runtime fail-closed gate for the exact, migration-reviewed TEAMCOLLAB audit
 * catalog. The migration checker owns the full constraint-definition proof;
 * runtime additionally requires its exact stable name and validated state.
 * The legacy workspace-only constraint remains accepted solely for the
 * workspace.created command until the follow-on catalog migration is applied.
 */
export async function isTeamCollaborationAuditStorageReady(
  client: AuditCatalogClient,
  scope: TeamCollaborationAuditScope,
): Promise<boolean> {
  const rows = await client.$queryRaw<AuditCatalogRow[]>(Prisma.sql`
    SELECT
      to_regclass('operating_audit_events') IS NOT NULL AS "tableReady",
      EXISTS (
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
      ) AS "appendOnlyTriggerReady",
      EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
          AND constraint_row.conname = 'operating_audit_events_workspace_created_only_check'
          AND constraint_row.contype = 'c'
          AND constraint_row.convalidated
          AND pg_get_constraintdef(constraint_row.oid, TRUE) =
            'CHECK (actor_type = ''owner''::text AND actor_ref IS NOT NULL AND request_ref IS NOT NULL AND module_key = ''work''::text AND action = ''workspace.created''::text AND target_type = ''workspace''::text AND target_ref IS NOT NULL AND result = ''success''::text AND risk_level = ''HIGH''::text AND approval_level = ''owner_review''::text AND human_approval_required = true AND source_kind = ''server_action''::text AND redaction_version = ''teamcollab-005b-v1''::text AND retention_class = ''high_risk_7_year_review_required''::text)'
      ) AS "legacyWorkspaceCreatedConstraintReady",
      EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
          AND constraint_row.conname = ${TEAMCOLLAB_AUDIT_CATALOG_CONSTRAINT}
          AND constraint_row.contype = 'c'
          AND constraint_row.convalidated
          AND pg_get_constraintdef(constraint_row.oid, TRUE) = ${TEAMCOLLAB_AUDIT_CATALOG_DEFINITION}
      ) AS "teamCollaborationCatalogConstraintReady",
      NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
          AND constraint_row.conname = 'operating_audit_events_workspace_created_only_check'
      ) AS "legacyConstraintAbsent",
      EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
          AND constraint_row.conname = 'operating_audit_events_request_ref_hash_check'
          AND constraint_row.contype = 'c'
          AND constraint_row.convalidated
          AND pg_get_constraintdef(constraint_row.oid, TRUE) =
            'CHECK (request_ref ~ ''^[0-9a-f]{64}$''::text)'
      ) AS "requestRefConstraintReady",
      EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = to_regclass('operating_audit_events')
          AND constraint_row.conname = 'operating_audit_events_no_secret_metadata_check'
          AND constraint_row.contype = 'c'
          AND constraint_row.convalidated
          AND pg_get_constraintdef(constraint_row.oid, TRUE) =
            'CHECK (metadata = ''{}''::jsonb)'
      ) AS "noSecretConstraintReady",
      EXISTS (
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
      ) AS "idempotencyIndexReady"
  `)
  const row = rows[0]

  if (
    !row?.tableReady ||
    !row.appendOnlyTriggerReady ||
    !row.requestRefConstraintReady ||
    !row.noSecretConstraintReady ||
    !row.idempotencyIndexReady
  ) {
    return false
  }

  if (scope === "workspace.invitation") {
    return Boolean(
      row.teamCollaborationCatalogConstraintReady && row.legacyConstraintAbsent,
    )
  }

  return Boolean(
    row.legacyWorkspaceCreatedConstraintReady ||
      (row.teamCollaborationCatalogConstraintReady && row.legacyConstraintAbsent),
  )
}
