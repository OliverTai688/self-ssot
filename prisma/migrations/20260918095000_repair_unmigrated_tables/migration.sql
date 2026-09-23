-- 補上四張從未被 migration 建立的表（PLN-074 M7）
--
-- project_phase_nodes、project_milestones、skills、agent_commands 存在於正式資料庫，
-- 但 migration 歷史裡沒有任何一行建立它們 —— 它們是某次 prisma db push 直接推上去的。
-- 後果是這份歷史在乾淨資料庫上重播不起來：20260921120000_operating_tracks 會在
-- ALTER TABLE "project_milestones" 那一行失敗（42P01 relation does not exist）。
--
-- 這不只是測試環境的不便。無法從 migration 重建資料庫，等於沒有可驗證的災難復原路徑。
--
-- 時間戳刻意排在 operating_tracks 之前：乾淨資料庫上它會先跑，讓後面的 ALTER 有對象。
-- 全部使用 IF NOT EXISTS，所以在已經有這些表的正式資料庫上是 no-op。
--
-- 這裡建立的是「operating_tracks 之前」的形狀：acceptance / derived_from / remind 由
-- operating_tracks 補上，workbench_ref 與 date 的可空由 20260923180000 補上。
-- 照抄現況會讓後面的 ALTER 重複加欄位而失敗。

-- ─── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE "project_phase_node_status" AS ENUM ('UPCOMING', 'ACTIVE', 'DONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "project_milestone_status" AS ENUM ('UPCOMING', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "skill_scope" AS ENUM ('GLOBAL', 'WORKSPACE', 'PERSONAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "skill_status" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "agent_command_type" AS ENUM ('SINGLE_AGENT', 'TEAM_GROUP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 專案階段與里程碑 ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "project_phase_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "phase" "project_phase" NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "project_phase_node_status" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_phase_nodes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_phase_nodes_project_start_idx" ON "project_phase_nodes"("project_id", "start_date");

DO $$ BEGIN
    ALTER TABLE "project_phase_nodes" ADD CONSTRAINT "project_phase_nodes_project_id_fkey"
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "project_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phase_node_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "project_milestone_status" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_milestones_phase_node_date_idx" ON "project_milestones"("phase_node_id", "date");

DO $$ BEGIN
    ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_phase_node_id_fkey"
        FOREIGN KEY ("phase_node_id") REFERENCES "project_phase_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Skills ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT NOT NULL,
    "scope" "skill_scope" NOT NULL DEFAULT 'WORKSPACE',
    "status" "skill_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "skills_workspace_status_idx" ON "skills"("workspace_id", "status");

DO $$ BEGIN
    ALTER TABLE "skills" ADD CONSTRAINT "skills_workspace_id_fkey"
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "skills" ADD CONSTRAINT "skills_created_by_profile_id_fkey"
        FOREIGN KEY ("created_by_profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Agent commands ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "agent_commands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "agent_instruction_label" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "owner_agent" TEXT NOT NULL,
    "target_module" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "approval_level" TEXT NOT NULL,
    "data_visibility_level" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowed_modes" TEXT[] DEFAULT ARRAY['dry_run']::TEXT[],
    "ui_entry_surface" TEXT NOT NULL,
    "proposal_outputs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agent_proposal_outputs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blocked_writes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agent_blocked_writes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_refs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prompt_template" TEXT,
    "stages" JSONB NOT NULL DEFAULT '[]',
    "command_type" "agent_command_type" NOT NULL DEFAULT 'SINGLE_AGENT',
    "participant_agents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "write_blocked" BOOLEAN NOT NULL DEFAULT true,
    "external_registerable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_commands_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "agent_commands_operation_id_key" ON "agent_commands"("operation_id");
CREATE INDEX IF NOT EXISTS "agent_commands_module_key_command_type_idx" ON "agent_commands"("module_key", "command_type");
