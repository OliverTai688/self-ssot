-- 讀取路徑（PLN-074 M5）與留言／請求持久化
--
-- 主鍵是由工作台業務 id（PRJ-2026-004）推導的 UUIDv5，而那是單向的：
-- 寫得進去、讀不回來。workbench_ref 補上反查，關聯（issue.p、milestone.projectId）
-- 才接得回去。不加索引的話每次載入都要全表掃。
--
-- 全部新增欄位與新增表，無破壞性。既有列的 workbench_ref 為 NULL：
-- 它們是在這個欄位存在之前寫入的，讀取端會略過（見 operating-store.service）。

-- ─── 反查欄位 ──────────────────────────────────────────────────────────────
ALTER TABLE "occasions" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "rhythms" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "project_phase_nodes" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "project_milestones" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "project_objectives" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "project_tasks" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_project_profiles" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_goals" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_decisions" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_documents" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_commitments" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_threads" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_transactions" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_reimbursements" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_bank_entries" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_evidence_repos" ADD COLUMN "workbench_ref" TEXT;

CREATE INDEX "occasions_workbench_ref_idx" ON "occasions"("workspace_id", "workbench_ref");
CREATE INDEX "rhythms_workbench_ref_idx" ON "rhythms"("workspace_id", "workbench_ref");
CREATE INDEX "operating_goals_workbench_ref_idx" ON "operating_goals"("workspace_id", "workbench_ref");
CREATE INDEX "operating_decisions_workbench_ref_idx" ON "operating_decisions"("workspace_id", "workbench_ref");
CREATE INDEX "operating_documents_workbench_ref_idx" ON "operating_documents"("workspace_id", "workbench_ref");
CREATE INDEX "operating_commitments_workbench_ref_idx" ON "operating_commitments"("workspace_id", "workbench_ref");
CREATE INDEX "operating_threads_workbench_ref_idx" ON "operating_threads"("workspace_id", "workbench_ref");
CREATE INDEX "operating_transactions_workbench_ref_idx" ON "operating_transactions"("workspace_id", "workbench_ref");
CREATE INDEX "operating_reimbursements_workbench_ref_idx" ON "operating_reimbursements"("workspace_id", "workbench_ref");
CREATE INDEX "operating_bank_entries_workbench_ref_idx" ON "operating_bank_entries"("workspace_id", "workbench_ref");

-- ─── 留言：三種共用一張表 ──────────────────────────────────────────────────
-- author_id 放寬為可空：席位對不到 Profile 時，作者身分仍由 author_key 保住，
-- 整筆留言因此存得進來，而不是整個失敗。
ALTER TABLE "operating_comments" ALTER COLUMN "author_id" DROP NOT NULL;
ALTER TABLE "operating_comments" ADD COLUMN "author_key" TEXT;
ALTER TABLE "operating_comments" ADD COLUMN "workbench_ref" TEXT;
ALTER TABLE "operating_comments" ADD COLUMN "meta" JSONB NOT NULL DEFAULT '{}';

-- ─── 請求（日誌回覆流）────────────────────────────────────────────────────
CREATE TABLE "operating_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "from_key" TEXT,
    "to_key" TEXT,
    "on_date" DATE,
    "block_id" TEXT,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'ask',
    "sent_at" TIMESTAMP(3),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_requests_workspace_date_idx" ON "operating_requests"("workspace_id", "on_date");
