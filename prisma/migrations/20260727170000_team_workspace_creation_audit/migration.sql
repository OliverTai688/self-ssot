-- TEAMCOLLAB-005B follow-on migration.
-- Adds the first persisted DBS-006 OperatingAuditEvent vertical slice.
-- Applying this migration to any configured or valuable database remains a
-- separate target-specific, owner-approved operation and is not performed here.

CREATE TABLE "operating_audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" TEXT NOT NULL,
    "actor_ref" TEXT,
    "actor_display" TEXT,
    "session_ref" TEXT,
    "request_ref" TEXT,
    "ip_address_hash" TEXT,
    "user_agent_hash" TEXT,
    "module_key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_ref" TEXT,
    "target_display" TEXT,
    "result" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "approval_level" TEXT NOT NULL,
    "human_approval_required" BOOLEAN NOT NULL,
    "source_kind" TEXT NOT NULL,
    "source_ref" TEXT,
    "agent_ref" TEXT,
    "operation_id" TEXT,
    "proposal_ref" TEXT,
    "proof_ref" TEXT,
    "before_ref" TEXT,
    "after_ref" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "redaction_version" TEXT NOT NULL,
    "retention_class" TEXT NOT NULL,
    "previous_event_hash" TEXT,
    "event_hash" TEXT,

    CONSTRAINT "operating_audit_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operating_audit_events_workspace_created_only_check"
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
      ),
    CONSTRAINT "operating_audit_events_request_ref_hash_check"
      CHECK ("request_ref" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "operating_audit_events_no_secret_metadata_check"
      CHECK ("metadata" = '{}'::jsonb)
);

CREATE UNIQUE INDEX "operating_audit_events_actor_action_request_unique"
  ON "operating_audit_events"("actor_ref", "action", "request_ref");

CREATE INDEX "operating_audit_events_module_occurred_idx"
  ON "operating_audit_events"("module_key", "occurred_at");
CREATE INDEX "operating_audit_events_actor_occurred_idx"
  ON "operating_audit_events"("actor_type", "occurred_at");
CREATE INDEX "operating_audit_events_action_occurred_idx"
  ON "operating_audit_events"("action", "occurred_at");
CREATE INDEX "operating_audit_events_result_risk_occurred_idx"
  ON "operating_audit_events"("result", "risk_level", "occurred_at");
CREATE INDEX "operating_audit_events_target_occurred_idx"
  ON "operating_audit_events"("target_type", "target_ref", "occurred_at");
CREATE INDEX "operating_audit_events_operation_occurred_idx"
  ON "operating_audit_events"("operation_id", "occurred_at");

CREATE FUNCTION "prevent_operating_audit_event_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'operating_audit_events is append-only'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER "operating_audit_events_append_only"
BEFORE UPDATE OR DELETE ON "operating_audit_events"
FOR EACH ROW
EXECUTE FUNCTION "prevent_operating_audit_event_mutation"();
