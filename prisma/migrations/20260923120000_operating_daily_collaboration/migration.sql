-- 營運工作台的日常協作資料（SCH-008 §4 · PLN-074 M2 · YZLIVE-005）
--
-- Project 由 Work 模組擁有；營運專屬欄位放 1:1 側表（SCH-008 §3 決定 C，
-- Prisma 稱為 multi-table inheritance）。側表以 project_id 為主鍵兼外鍵，
-- 所以沒有第二個 id 需要與父表對齊。
--
-- 全部是新增表與新增欄位，沒有改動既有欄位型別，因此不具破壞性：
-- 回滾等同 DROP 這些表與 DROP 這些欄位，Work 模組不受影響。
-- 不回填任何資料 —— 首次進入 database 模式就是真的空白（ARC-042 §8）。

-- ─── 目標 ──────────────────────────────────────────────────────────────────
CREATE TABLE "operating_goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "progress_pct" INTEGER NOT NULL DEFAULT 0,
    "warning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_goals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_goals_workspace_idx" ON "operating_goals"("workspace_id");

-- ─── 專案側表 ──────────────────────────────────────────────────────────────
CREATE TABLE "operating_project_profiles" (
    "project_id" UUID NOT NULL,
    "client" TEXT,
    "goal_id" UUID,
    "engagement_type" TEXT,
    "operating_status" TEXT NOT NULL DEFAULT '商機',
    "bonus_rate_pct" INTEGER NOT NULL DEFAULT 0,
    "bonus_cap_pct" INTEGER NOT NULL DEFAULT 0,
    "budget_amount" INTEGER NOT NULL DEFAULT 0,
    "evidence_repo_tag" TEXT,
    "started_on" DATE,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_project_profiles_pkey" PRIMARY KEY ("project_id")
);
CREATE INDEX "operating_project_profiles_goal_idx" ON "operating_project_profiles"("goal_id");
ALTER TABLE "operating_project_profiles" ADD CONSTRAINT "operating_project_profiles_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operating_project_profiles" ADD CONSTRAINT "operating_project_profiles_goal_id_fkey"
    FOREIGN KEY ("goal_id") REFERENCES "operating_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 工作項的營運欄位 ───────────────────────────────────────────────────────
-- task_status 沒有 REVIEW；把 Review 併進 IN_PROGRESS 會讓工作台顯示的狀態
-- 在往返之後改變，所以原始字串另存一欄，列舉維持 Work 模組的粗分類。
ALTER TABLE "project_tasks" ADD COLUMN "operating_status" TEXT;
ALTER TABLE "project_tasks" ADD COLUMN "size_class" TEXT;
ALTER TABLE "project_tasks" ADD COLUMN "blocker" TEXT;
ALTER TABLE "project_tasks" ADD COLUMN "expectation" TEXT;
ALTER TABLE "project_tasks" ADD COLUMN "evidence_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "project_tasks" ADD COLUMN "relations" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "project_tasks" ADD COLUMN "custom_fields" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "project_tasks" ADD COLUMN "subtasks" JSONB NOT NULL DEFAULT '[]';

-- ─── 日誌 ──────────────────────────────────────────────────────────────────
-- author_id 不設外鍵，與 rhythm_sessions.recorded_by_id 一致：停用成員時保留歷史作者。
CREATE TABLE "operating_journal_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "on_date" DATE NOT NULL,
    "title" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "visibility" TEXT NOT NULL DEFAULT 'company',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_journal_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "operating_journal_author_day_key" ON "operating_journal_entries"("workspace_id", "author_id", "on_date");
CREATE INDEX "operating_journal_workspace_date_idx" ON "operating_journal_entries"("workspace_id", "on_date");

-- ─── 留言 ──────────────────────────────────────────────────────────────────
CREATE TABLE "operating_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_ref" TEXT NOT NULL,
    "parent_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "operating_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_comments_target_idx" ON "operating_comments"("workspace_id", "target_type", "target_ref");
CREATE INDEX "operating_comments_parent_idx" ON "operating_comments"("parent_id");

-- ─── 決議 ──────────────────────────────────────────────────────────────────
CREATE TABLE "operating_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "author_id" UUID,
    "project_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "decided_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_decisions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_decisions_workspace_date_idx" ON "operating_decisions"("workspace_id", "decided_on");
