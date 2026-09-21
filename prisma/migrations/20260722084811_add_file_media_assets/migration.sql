-- CreateEnum
CREATE TYPE "source_provider" AS ENUM ('MANUAL', 'LOCAL_FILE', 'URL', 'RSS', 'GOOGLE_DRIVE', 'GOOGLE_DOCS', 'GMAIL', 'LINE', 'TELEGRAM', 'GITHUB_MARKDOWN');

-- CreateEnum
CREATE TYPE "source_connection_status" AS ENUM ('SETUP_REQUIRED', 'ACTIVE', 'PAUSED', 'REVOKED', 'ERROR', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "source_asset_kind" AS ENUM ('DOCUMENT', 'MESSAGE', 'URL', 'FILE', 'NOTE', 'DATASET', 'THREAD', 'RECORD');

-- CreateEnum
CREATE TYPE "source_asset_status" AS ENUM ('INBOX', 'REVIEWING', 'READY', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "ai_workflow_run_status" AS ENUM ('QUEUED', 'RUNNING', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ai_work_item_kind" AS ENUM ('RECOGNITION', 'EXTRACTION', 'ORGANIZATION', 'CORRECTION', 'PROPOSAL', 'WRITE_INTENT', 'AUDIT_REVIEW');

-- CreateEnum
CREATE TYPE "ai_work_item_status" AS ENUM ('TODO', 'IN_PROGRESS', 'NEEDS_REVIEW', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "source_proposal_status" AS ENUM ('DRAFT', 'OWNER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED_FOR_WRITE_INTENT', 'REJECTED', 'ARCHIVED', 'SUPERSEDED', 'BLOCKED_HIGH_RISK');

-- CreateEnum
CREATE TYPE "module_write_intent_status" AS ENUM ('DRAFT', 'OWNER_REVIEW', 'APPROVED_FOR_MANUAL_APPLY', 'APPLIED_MANUALLY', 'REJECTED', 'CANCELLED', 'BLOCKED_HIGH_RISK');

-- CreateEnum
CREATE TYPE "source_approval_level" AS ENUM ('AUTO_PROPOSE_ONLY', 'OWNER_REVIEW_REQUIRED', 'HUMAN_APPROVAL_REQUIRED', 'BLOCKED_UNTIL_PROOF_TARGET', 'BLOCKED_HIGH_RISK');

-- CreateEnum
CREATE TYPE "source_retention_class" AS ENUM ('EPHEMERAL', 'STANDARD', 'SENSITIVE', 'DELETE_REQUESTED', 'LEGAL_HOLD');

-- CreateEnum
CREATE TYPE "storage_provider" AS ENUM ('CLOUDFLARE_R2', 'SUPABASE_STORAGE');

-- CreateEnum
CREATE TYPE "file_scan_status" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "library_asset_visibility" AS ENUM ('PRIVATE', 'CLIENT_VISIBLE');

-- AlterTable
ALTER TABLE "academic_people" ADD COLUMN     "owner_id" UUID;

-- CreateTable
CREATE TABLE "file_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "storage_provider" "storage_provider" NOT NULL DEFAULT 'CLOUDFLARE_R2',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "content_hash" TEXT,
    "scan_status" "file_scan_status" NOT NULL DEFAULT 'NOT_REQUIRED',
    "visibility" "library_asset_visibility" NOT NULL DEFAULT 'PRIVATE',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "storage_provider" "storage_provider" NOT NULL DEFAULT 'CLOUDFLARE_R2',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "content_hash" TEXT,
    "scan_status" "file_scan_status" NOT NULL DEFAULT 'NOT_REQUIRED',
    "visibility" "library_asset_visibility" NOT NULL DEFAULT 'PRIVATE',
    "duration_seconds" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "provider" "source_provider" NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" "source_connection_status" NOT NULL DEFAULT 'SETUP_REQUIRED',
    "input_mode" TEXT,
    "scope_summary" TEXT,
    "secret_ref" TEXT,
    "provider_account_ref" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "next_sync_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "retention_class" "source_retention_class" NOT NULL DEFAULT 'STANDARD',
    "redaction_version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "source_connection_id" UUID,
    "external_ref" TEXT,
    "kind" "source_asset_kind" NOT NULL DEFAULT 'DOCUMENT',
    "status" "source_asset_status" NOT NULL DEFAULT 'INBOX',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "source_uri_hash" TEXT,
    "content_hash" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh-TW',
    "captured_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "retention_class" "source_retention_class" NOT NULL DEFAULT 'STANDARD',
    "redaction_version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_workflow_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "source_connection_id" UUID,
    "source_asset_id" UUID,
    "status" "ai_workflow_run_status" NOT NULL DEFAULT 'QUEUED',
    "run_type" TEXT NOT NULL,
    "trigger" TEXT,
    "initiated_by" TEXT,
    "prompt_summary" TEXT,
    "output_summary" TEXT,
    "proof_ref" TEXT,
    "audit_ref" TEXT,
    "redaction_version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_work_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "workflow_run_id" UUID NOT NULL,
    "source_asset_id" UUID,
    "kind" "ai_work_item_kind" NOT NULL DEFAULT 'RECOGNITION',
    "status" "ai_work_item_status" NOT NULL DEFAULT 'TODO',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "assigned_agent" TEXT,
    "review_required" BOOLEAN NOT NULL DEFAULT true,
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "redaction_version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_naming_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "module_key" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pattern" JSONB NOT NULL DEFAULT '{}',
    "examples" JSONB NOT NULL DEFAULT '[]',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_naming_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_unit_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "source_asset_id" UUID,
    "workflow_run_id" UUID,
    "work_item_id" UUID,
    "naming_profile_id" UUID,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "target_module" TEXT NOT NULL,
    "status" "source_proposal_status" NOT NULL DEFAULT 'DRAFT',
    "confidence" INTEGER,
    "proposal_payload" JSONB NOT NULL DEFAULT '{}',
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "reviewer_note" TEXT,
    "proof_ref" TEXT,
    "audit_ref" TEXT,
    "rollback_ref" TEXT,
    "retention_class" "source_retention_class" NOT NULL DEFAULT 'STANDARD',
    "redaction_version" INTEGER NOT NULL DEFAULT 1,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_unit_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_write_intents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "data_unit_proposal_id" UUID,
    "workflow_run_id" UUID,
    "work_item_id" UUID,
    "target_module" TEXT NOT NULL,
    "target_record_kind" TEXT,
    "target_record_id" TEXT,
    "status" "module_write_intent_status" NOT NULL DEFAULT 'DRAFT',
    "approval_level" "source_approval_level" NOT NULL DEFAULT 'OWNER_REVIEW_REQUIRED',
    "intent_payload" JSONB NOT NULL DEFAULT '{}',
    "diff_summary" TEXT,
    "approved_by_profile_id" UUID,
    "proof_ref" TEXT,
    "audit_ref" TEXT,
    "rollback_ref" TEXT,
    "retention_class" "source_retention_class" NOT NULL DEFAULT 'STANDARD',
    "redaction_version" INTEGER NOT NULL DEFAULT 1,
    "approved_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_write_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_assets_owner_idx" ON "file_assets"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_object_key_unique" ON "file_assets"("bucket", "object_key");

-- CreateIndex
CREATE INDEX "media_assets_owner_idx" ON "media_assets"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_object_key_unique" ON "media_assets"("bucket", "object_key");

-- CreateIndex
CREATE INDEX "source_connections_owner_id_status_idx" ON "source_connections"("owner_id", "status");

-- CreateIndex
CREATE INDEX "source_connections_owner_id_provider_status_idx" ON "source_connections"("owner_id", "provider", "status");

-- CreateIndex
CREATE INDEX "source_connections_owner_id_updated_at_idx" ON "source_connections"("owner_id", "updated_at");

-- CreateIndex
CREATE INDEX "source_assets_owner_id_status_idx" ON "source_assets"("owner_id", "status");

-- CreateIndex
CREATE INDEX "source_assets_owner_id_kind_status_idx" ON "source_assets"("owner_id", "kind", "status");

-- CreateIndex
CREATE INDEX "source_assets_source_connection_id_status_idx" ON "source_assets"("source_connection_id", "status");

-- CreateIndex
CREATE INDEX "source_assets_owner_id_updated_at_idx" ON "source_assets"("owner_id", "updated_at");

-- CreateIndex
CREATE INDEX "ai_workflow_runs_owner_id_status_idx" ON "ai_workflow_runs"("owner_id", "status");

-- CreateIndex
CREATE INDEX "ai_workflow_runs_owner_id_run_type_status_idx" ON "ai_workflow_runs"("owner_id", "run_type", "status");

-- CreateIndex
CREATE INDEX "ai_workflow_runs_source_connection_id_idx" ON "ai_workflow_runs"("source_connection_id");

-- CreateIndex
CREATE INDEX "ai_workflow_runs_source_asset_id_idx" ON "ai_workflow_runs"("source_asset_id");

-- CreateIndex
CREATE INDEX "ai_workflow_runs_owner_id_created_at_idx" ON "ai_workflow_runs"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_work_items_owner_id_status_idx" ON "ai_work_items"("owner_id", "status");

-- CreateIndex
CREATE INDEX "ai_work_items_workflow_run_id_status_idx" ON "ai_work_items"("workflow_run_id", "status");

-- CreateIndex
CREATE INDEX "ai_work_items_source_asset_id_idx" ON "ai_work_items"("source_asset_id");

-- CreateIndex
CREATE INDEX "ai_work_items_owner_id_created_at_idx" ON "ai_work_items"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "source_naming_profiles_owner_id_module_key_is_default_idx" ON "source_naming_profiles"("owner_id", "module_key", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "source_naming_profiles_owner_id_name_key" ON "source_naming_profiles"("owner_id", "name");

-- CreateIndex
CREATE INDEX "data_unit_proposals_owner_id_status_idx" ON "data_unit_proposals"("owner_id", "status");

-- CreateIndex
CREATE INDEX "data_unit_proposals_target_module_status_idx" ON "data_unit_proposals"("target_module", "status");

-- CreateIndex
CREATE INDEX "data_unit_proposals_source_asset_id_idx" ON "data_unit_proposals"("source_asset_id");

-- CreateIndex
CREATE INDEX "data_unit_proposals_workflow_run_id_idx" ON "data_unit_proposals"("workflow_run_id");

-- CreateIndex
CREATE INDEX "data_unit_proposals_work_item_id_idx" ON "data_unit_proposals"("work_item_id");

-- CreateIndex
CREATE INDEX "module_write_intents_owner_id_status_idx" ON "module_write_intents"("owner_id", "status");

-- CreateIndex
CREATE INDEX "module_write_intents_target_module_status_idx" ON "module_write_intents"("target_module", "status");

-- CreateIndex
CREATE INDEX "module_write_intents_data_unit_proposal_id_idx" ON "module_write_intents"("data_unit_proposal_id");

-- CreateIndex
CREATE INDEX "module_write_intents_workflow_run_id_idx" ON "module_write_intents"("workflow_run_id");

-- CreateIndex
CREATE INDEX "module_write_intents_work_item_id_idx" ON "module_write_intents"("work_item_id");

-- CreateIndex
CREATE INDEX "module_write_intents_approved_by_profile_id_idx" ON "module_write_intents"("approved_by_profile_id");

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_connections" ADD CONSTRAINT "source_connections_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_assets" ADD CONSTRAINT "source_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_assets" ADD CONSTRAINT "source_assets_source_connection_id_fkey" FOREIGN KEY ("source_connection_id") REFERENCES "source_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_workflow_runs" ADD CONSTRAINT "ai_workflow_runs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_workflow_runs" ADD CONSTRAINT "ai_workflow_runs_source_connection_id_fkey" FOREIGN KEY ("source_connection_id") REFERENCES "source_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_workflow_runs" ADD CONSTRAINT "ai_workflow_runs_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "source_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_work_items" ADD CONSTRAINT "ai_work_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_work_items" ADD CONSTRAINT "ai_work_items_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "ai_workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_work_items" ADD CONSTRAINT "ai_work_items_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "source_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_naming_profiles" ADD CONSTRAINT "source_naming_profiles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_unit_proposals" ADD CONSTRAINT "data_unit_proposals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_unit_proposals" ADD CONSTRAINT "data_unit_proposals_source_asset_id_fkey" FOREIGN KEY ("source_asset_id") REFERENCES "source_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_unit_proposals" ADD CONSTRAINT "data_unit_proposals_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "ai_workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_unit_proposals" ADD CONSTRAINT "data_unit_proposals_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "ai_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_unit_proposals" ADD CONSTRAINT "data_unit_proposals_naming_profile_id_fkey" FOREIGN KEY ("naming_profile_id") REFERENCES "source_naming_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_write_intents" ADD CONSTRAINT "module_write_intents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_write_intents" ADD CONSTRAINT "module_write_intents_data_unit_proposal_id_fkey" FOREIGN KEY ("data_unit_proposal_id") REFERENCES "data_unit_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_write_intents" ADD CONSTRAINT "module_write_intents_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "ai_workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_write_intents" ADD CONSTRAINT "module_write_intents_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "ai_work_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_write_intents" ADD CONSTRAINT "module_write_intents_approved_by_profile_id_fkey" FOREIGN KEY ("approved_by_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_people" ADD CONSTRAINT "academic_people_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
