-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- RequiredExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('OWNER', 'PARTNER', 'CLIENT');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('EXPLORING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "visibility_type" AS ENUM ('INTERNAL_ONLY', 'CLIENT_VISIBLE');

-- CreateEnum
CREATE TYPE "deliverable_status" AS ENUM ('DRAFT', 'DELIVERED', 'APPROVED');

-- CreateEnum
CREATE TYPE "research_thread_status" AS ENUM ('EXPLORING', 'ACTIVE', 'WRITING', 'PUBLISHED', 'PAUSED');

-- CreateEnum
CREATE TYPE "research_source_type" AS ENUM ('PAPER', 'BOOK', 'ARTICLE', 'CONFERENCE_RECORD', 'WORKSHOP_RECORD', 'MEETING_RECORD', 'AUDIO_TRANSCRIPT', 'INSTITUTION_REPORT', 'DATASET', 'WEBSITE', 'PERSONAL_NOTE');

-- CreateEnum
CREATE TYPE "source_reliability" AS ENUM ('PRIMARY', 'SECONDARY', 'INFORMAL', 'PERSONAL_OBSERVATION');

-- CreateEnum
CREATE TYPE "writing_project_type" AS ENUM ('PAPER', 'CONFERENCE_PAPER', 'PROPOSAL', 'ESSAY', 'POSTER', 'PRESENTATION');

-- CreateEnum
CREATE TYPE "writing_project_status" AS ENUM ('IDEA', 'OUTLINE', 'DRAFTING', 'REVIEWING', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "review_perspective" AS ENUM ('METHOD_REVIEWER', 'THEORY_REVIEWER', 'DOMAIN_EXPERT', 'CRITICAL_REVIEWER', 'FRIENDLY_MENTOR', 'CONFERENCE_CHAIR', 'JOURNAL_EDITOR');

-- CreateEnum
CREATE TYPE "event_type" AS ENUM ('CONFERENCE', 'WORKSHOP', 'SEMINAR', 'SUMMER_SCHOOL', 'WEBINAR');

-- CreateEnum
CREATE TYPE "participation_mode" AS ENUM ('SUBMIT_PAPER', 'SUBMIT_POSTER', 'ATTEND', 'ASK_QUESTION', 'NETWORKING');

-- CreateEnum
CREATE TYPE "project_phase" AS ENUM ('DISCOVERY', 'PLANNING', 'EXECUTION', 'REVIEW', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "project_health" AS ENUM ('GOOD', 'WATCH', 'RISK');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "task_source" AS ENUM ('MANUAL', 'AI_SUGGESTED', 'TRIAGE', 'CLIENT_REQUEST');

-- CreateEnum
CREATE TYPE "note_source" AS ENUM ('LINE', 'EMAIL', 'MEETING', 'INTERNAL');

-- CreateEnum
CREATE TYPE "note_origin" AS ENUM ('AI', 'MANUAL');

-- CreateEnum
CREATE TYPE "deliverable_node_type" AS ENUM ('FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "agent_message_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'CLIENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_module_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "module_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_module_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "client_name" TEXT,
    "description" TEXT,
    "status" "project_status" NOT NULL DEFAULT 'ACTIVE',
    "phase" "project_phase" NOT NULL DEFAULT 'PLANNING',
    "health" "project_health" NOT NULL DEFAULT 'GOOD',
    "visibility" "visibility_type" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "client_token" TEXT,
    "started_at" TIMESTAMP(3),
    "due_at" TIMESTAMP(3),
    "next_action" TEXT,
    "company_axis" TEXT,
    "tasks_done" INTEGER NOT NULL DEFAULT 0,
    "tasks_total" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" "task_status" NOT NULL DEFAULT 'TODO',
    "visibility" "visibility_type" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "source" "task_source" NOT NULL DEFAULT 'MANUAL',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "source" "note_source" NOT NULL DEFAULT 'INTERNAL',
    "visibility" "visibility_type" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "origin" "note_origin" NOT NULL DEFAULT 'MANUAL',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_deliverables" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "parent_id" UUID,
    "node_type" "deliverable_node_type" NOT NULL DEFAULT 'FILE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "deliverable_status" NOT NULL DEFAULT 'DRAFT',
    "visibility" "visibility_type" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "delivered_at" TIMESTAMP(3),
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "research_thread_status" NOT NULL DEFAULT 'EXPLORING',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disciplines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "method_type" TEXT,
    "main_research_question" TEXT,
    "work_linkage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source_type" "research_source_type" NOT NULL DEFAULT 'PAPER',
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "year" INTEGER,
    "doi" TEXT,
    "url" TEXT,
    "institution" TEXT,
    "region" TEXT,
    "country" TEXT,
    "language" TEXT NOT NULL DEFAULT 'zh-TW',
    "abstract" TEXT,
    "summary" TEXT,
    "original_text" TEXT,
    "file_url" TEXT,
    "reliability" "source_reliability" NOT NULL DEFAULT 'PRIMARY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_concepts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "definition" TEXT,
    "related_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competing_definitions" JSONB DEFAULT '[]',
    "my_current_understanding" TEXT,
    "ai_clarification" TEXT,
    "confusion_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_writing_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "writing_type" "writing_project_type" NOT NULL DEFAULT 'PAPER',
    "status" "writing_project_status" NOT NULL DEFAULT 'IDEA',
    "target_venue_id" UUID,
    "research_question" TEXT,
    "thesis_statement" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_writing_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_writing_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "section_order" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "linked_source_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_notes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "research_writing_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "writing_project_id" UUID,
    "source_id" UUID,
    "input_type" TEXT,
    "perspective" "review_perspective" NOT NULL DEFAULT 'FRIENDLY_MENTOR',
    "summary" TEXT NOT NULL,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action_items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_digests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "schedule_type" TEXT,
    "title" TEXT NOT NULL,
    "new_sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "key_findings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "open_questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommended_readings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "writing_suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "research_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "event_type" "event_type" NOT NULL DEFAULT 'CONFERENCE',
    "field" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "country" TEXT,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "submission_deadline" TIMESTAMP(3),
    "registration_deadline" TIMESTAMP(3),
    "url" TEXT,
    "cfp_text" TEXT,
    "related_thread_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fit_score" INTEGER,
    "ai_fit_reason" TEXT,
    "suggested_participation_mode" "participation_mode" NOT NULL DEFAULT 'ATTEND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "from_agent" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "conditions" TEXT,
    "to_agent" TEXT NOT NULL,
    "target_intent" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'broadcast',
    "delay_seconds" INTEGER NOT NULL DEFAULT 0,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trace_id" UUID NOT NULL,
    "parent_message_id" UUID,
    "from_agent" TEXT NOT NULL,
    "to_agent" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "agent_message_status" NOT NULL DEFAULT 'PENDING',
    "rule_id" UUID,
    "summary" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_people" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "academic_role" TEXT,
    "affiliation" TEXT,
    "country" TEXT,
    "profile_url" TEXT,
    "research_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "important_works" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "related_events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "background_summary" TEXT,
    "relevance_to_my_research" TEXT,
    "conversation_angles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_module_permissions_profile_id_module_key_key" ON "user_module_permissions"("profile_id", "module_key");

-- AddForeignKey
ALTER TABLE "user_module_permissions" ADD CONSTRAINT "user_module_permissions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_deliverables" ADD CONSTRAINT "project_deliverables_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_deliverables" ADD CONSTRAINT "project_deliverables_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "project_deliverables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_threads" ADD CONSTRAINT "research_threads_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_sources" ADD CONSTRAINT "research_sources_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "research_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_concepts" ADD CONSTRAINT "research_concepts_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "research_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_writing_projects" ADD CONSTRAINT "research_writing_projects_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "research_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_writing_sections" ADD CONSTRAINT "research_writing_sections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "research_writing_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback_runs" ADD CONSTRAINT "ai_feedback_runs_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "research_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback_runs" ADD CONSTRAINT "ai_feedback_runs_writing_project_id_fkey" FOREIGN KEY ("writing_project_id") REFERENCES "research_writing_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback_runs" ADD CONSTRAINT "ai_feedback_runs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "research_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_digests" ADD CONSTRAINT "research_digests_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "research_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "agent_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "workflow_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
