-- 營運三軌與 time_spine（ARC-041 · PLN-073 T5 · OPS-T21/T24）
-- 專案軌沿用 Project → ProjectPhaseNode → ProjectMilestone，往下補 Objective；
-- 節奏軌與行政／活動軌為新增；time_spine 是衍生索引，由服務層單一 writer 維護。

-- ─── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE "rhythm_kind" AS ENUM ('RITUAL', 'ADMIN');
CREATE TYPE "rhythm_scope" AS ENUM ('COMPANY', 'PERSONAL');
CREATE TYPE "rhythm_session_state" AS ENUM ('DONE', 'SKIP', 'MOVED');
CREATE TYPE "occasion_category" AS ENUM ('COMPANY_EVENT', 'CLIENT_MEETING', 'TRAVEL', 'BIRTHDAY', 'VISIT', 'ADMIN');
CREATE TYPE "operating_media_kind" AS ENUM ('AUDIO', 'PHOTO', 'DOC');
CREATE TYPE "spine_track" AS ENUM ('PROJECT', 'RHYTHM', 'OCCASION');
CREATE TYPE "spine_state" AS ENUM ('PLANNED', 'DONE', 'LATE', 'MISSED', 'SKIPPED');

-- ─── 專案軌：補第三層 Objective，里程碑補驗收與條文來源 ──────────────────────
CREATE TABLE "project_objectives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "milestone_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_objectives_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "project_objectives_milestone_idx" ON "project_objectives"("milestone_id");
ALTER TABLE "project_objectives" ADD CONSTRAINT "project_objectives_milestone_id_fkey"
    FOREIGN KEY ("milestone_id") REFERENCES "project_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_milestones" ADD COLUMN "acceptance" TEXT;
ALTER TABLE "project_milestones" ADD COLUMN "derived_from" TEXT;
ALTER TABLE "project_milestones" ADD COLUMN "remind" TEXT;

-- 工作可以先不掛目標（遷移時刻意不自動生成假目標來填滿階層）
ALTER TABLE "project_tasks" ADD COLUMN "objective_id" UUID;
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_objective_id_fkey"
    FOREIGN KEY ("objective_id") REFERENCES "project_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "project_tasks_objective_idx" ON "project_tasks"("objective_id");

-- ─── 節奏軌 ─────────────────────────────────────────────────────────────────
CREATE TABLE "rhythms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "rhythm_kind" NOT NULL DEFAULT 'RITUAL',
    "scope" "rhythm_scope" NOT NULL DEFAULT 'COMPANY',
    "owner_ids" UUID[],
    "rrule" TEXT NOT NULL,
    "dtstart" DATE NOT NULL,
    "until" DATE,
    "time_of_day" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Taipei',
    "expect_media" TEXT[],
    "derived_from" TEXT,
    "remind" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rhythms_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rhythms_workspace_kind_idx" ON "rhythms"("workspace_id", "kind", "active");
ALTER TABLE "rhythms" ADD CONSTRAINT "rhythms_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 只有「發生了事情」的實例才有列；(rhythm_id, occurrence_date) 就是 RECURRENCE-ID 覆寫鍵
CREATE TABLE "rhythm_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rhythm_id" UUID NOT NULL,
    "occurrence_date" DATE NOT NULL,
    "state" "rhythm_session_state" NOT NULL,
    "moved_to" DATE,
    "note" TEXT,
    "spawned_task_ids" UUID[],
    "recorded_by_id" UUID,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rhythm_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rhythm_sessions_occurrence_key" ON "rhythm_sessions"("rhythm_id", "occurrence_date");
CREATE INDEX "rhythm_sessions_rhythm_date_idx" ON "rhythm_sessions"("rhythm_id", "occurrence_date");
ALTER TABLE "rhythm_sessions" ADD CONSTRAINT "rhythm_sessions_rhythm_id_fkey"
    FOREIGN KEY ("rhythm_id") REFERENCES "rhythms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- 改期必須有目的地，否則展開時會憑空少一筆
ALTER TABLE "rhythm_sessions" ADD CONSTRAINT "rhythm_sessions_moved_requires_target"
    CHECK ("state" <> 'MOVED' OR "moved_to" IS NOT NULL);

-- ─── 行政／活動軌 ───────────────────────────────────────────────────────────
CREATE TABLE "occasions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" "occasion_category" NOT NULL DEFAULT 'COMPANY_EVENT',
    "on_date" DATE NOT NULL,
    "end_on" DATE,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "place" TEXT,
    "actor_ids" UUID[],
    "external_guests" TEXT,
    "star" BOOLEAN NOT NULL DEFAULT false,
    "project_id" UUID,
    "prep" JSONB NOT NULL DEFAULT '[]',
    "recap" TEXT,
    "derived_from" TEXT,
    "remind" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "occasions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "occasions_workspace_date_idx" ON "occasions"("workspace_id", "on_date");
CREATE INDEX "occasions_project_idx" ON "occasions"("project_id");
ALTER TABLE "occasions" ADD CONSTRAINT "occasions_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "occasions" ADD CONSTRAINT "occasions_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "occasions" ADD CONSTRAINT "occasions_end_after_start"
    CHECK ("end_on" IS NULL OR "end_on" >= "on_date");

-- ─── 素材（檔案本體沿用 SCH-005 的 R2）──────────────────────────────────────
CREATE TABLE "operating_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "operating_media_kind" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "transcript" TEXT,
    "session_id" UUID,
    "occasion_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operating_media_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_media_session_idx" ON "operating_media"("session_id");
CREATE INDEX "operating_media_occasion_idx" ON "operating_media"("occasion_id");
ALTER TABLE "operating_media" ADD CONSTRAINT "operating_media_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "rhythm_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operating_media" ADD CONSTRAINT "operating_media_occasion_id_fkey"
    FOREIGN KEY ("occasion_id") REFERENCES "occasions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operating_media" ADD CONSTRAINT "operating_media_single_parent"
    CHECK (("session_id" IS NULL) <> ("occasion_id" IS NULL));

-- ─── time_spine（衍生索引）──────────────────────────────────────────────────
CREATE TABLE "time_spine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "on_date" DATE NOT NULL,
    "track" "spine_track" NOT NULL,
    "ref_table" TEXT NOT NULL,
    "ref_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "actor_ids" UUID[],
    "weight" INTEGER NOT NULL DEFAULT 1,
    "state" "spine_state" NOT NULL DEFAULT 'PLANNED',
    "star" BOOLEAN NOT NULL DEFAULT false,
    "project_id" UUID,
    "derived_from" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "time_spine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "time_spine_ref_key" ON "time_spine"("ref_table", "ref_id", "on_date");
CREATE INDEX "time_spine_workspace_date_idx" ON "time_spine"("workspace_id", "on_date");
CREATE INDEX "time_spine_workspace_track_idx" ON "time_spine"("workspace_id", "track", "on_date");
ALTER TABLE "time_spine" ADD CONSTRAINT "time_spine_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 衝期偵測用的範圍索引（OPS-T24）。
-- 刻意**不用** EXCLUDE 約束：同日兩個關鍵節點是合法的，只是不聰明 ——
-- 我們要的是警示，不是禁止。所以只建索引，判定寫在查詢裡。
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE INDEX "time_spine_range_idx" ON "time_spine"
    USING gist ("workspace_id", daterange("on_date", "on_date", '[]'));
CREATE INDEX "occasions_range_idx" ON "occasions"
    USING gist ("workspace_id", daterange("on_date", COALESCE("end_on", "on_date"), '[]'));
