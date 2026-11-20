-- AI 團隊模組：助理、共享對話、提案（RES-038 · JAI-S4）。
--
-- 純新增欄位，全部有預設值或可為空：既有對話維持「日誌助理、只有建立者看得到」，不需回填。
--
-- 回復：
--   ALTER TABLE "operating_ai_messages" DROP COLUMN "proposals", DROP COLUMN "author_key", DROP COLUMN "author_id";
--   ALTER TABLE "operating_ai_sessions" DROP COLUMN "shared_by_id", DROP COLUMN "shared_at", DROP COLUMN "agent";

-- AlterTable
ALTER TABLE "operating_ai_sessions" ADD COLUMN "agent" TEXT NOT NULL DEFAULT 'journal',
ADD COLUMN "shared_at" TIMESTAMP(3),
ADD COLUMN "shared_by_id" UUID;

-- AlterTable
ALTER TABLE "operating_ai_messages" ADD COLUMN "author_id" UUID,
ADD COLUMN "author_key" TEXT,
ADD COLUMN "proposals" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "operating_ai_sessions_shared_idx" ON "operating_ai_sessions"("workspace_id", "shared_at");
