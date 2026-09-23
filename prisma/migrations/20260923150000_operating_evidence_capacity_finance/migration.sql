-- Evidence／承諾／容量（M3）與帳務（M4）—— SCH-008 · PLN-074
--
-- 帳務表存的是使用者自己輸入的數字。database 模式不載入任何 fixture，
-- 所以原型裡的合成費率與金額不會進到這些表 —— 這正是 SCH-008 §5 要避免的事。
-- 獎金公式、稅務與薪資級距仍不在系統裡；工作台是在前端試算。
--
-- 全部新增，無破壞性；回滾等同 DROP 這些表。

-- ─── M3：文件與承諾 ────────────────────────────────────────────────────────
CREATE TABLE "operating_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clauses" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_documents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_documents_workspace_idx" ON "operating_documents"("workspace_id");

CREATE TABLE "operating_commitments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "document_ref" TEXT,
    "clause_ref" TEXT,
    "direction" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "owner_key" TEXT,
    "status" TEXT NOT NULL,
    "cadence" TEXT,
    "logs" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_commitments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_commitments_workspace_status_idx" ON "operating_commitments"("workspace_id", "status");

-- ─── M3：聊天室與 Evidence ─────────────────────────────────────────────────
CREATE TABLE "operating_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "project_id" UUID,
    "title" TEXT NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "close_note" JSONB,
    "files" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_threads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_threads_workspace_project_idx" ON "operating_threads"("workspace_id", "project_id");

CREATE TABLE "operating_evidence_repos" (
    "project_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v0.1',
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "readme" TEXT,
    "versions" JSONB NOT NULL DEFAULT '[]',
    "tree" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_evidence_repos_pkey" PRIMARY KEY ("project_id")
);
CREATE INDEX "operating_evidence_repos_workspace_idx" ON "operating_evidence_repos"("workspace_id");

-- ─── M3：容量與出勤 ────────────────────────────────────────────────────────
-- 以席位字串（yz / lily）為鍵而不是 Profile uuid：Profile 還沒建立時也要能存。
CREATE TABLE "operating_capacity_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "actor_key" TEXT NOT NULL,
    "allocations" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_capacity_plans_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "operating_capacity_actor_key" ON "operating_capacity_plans"("workspace_id", "actor_key");

CREATE TABLE "operating_timesheets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "actor_key" TEXT NOT NULL,
    "weeks" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_timesheets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "operating_timesheet_actor_key" ON "operating_timesheets"("workspace_id", "actor_key");

-- ─── M4：帳務 ──────────────────────────────────────────────────────────────
CREATE TABLE "operating_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "on_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "project_ref" TEXT,
    "category" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "formula" TEXT,
    "pass_through" BOOLEAN NOT NULL DEFAULT false,
    "vouchers" TEXT[],
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_transactions_workspace_date_idx" ON "operating_transactions"("workspace_id", "on_date");

CREATE TABLE "operating_reimbursements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "actor_key" TEXT,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT '待送',
    "on_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_reimbursements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_reimbursements_workspace_status_idx" ON "operating_reimbursements"("workspace_id", "status");

-- matched_ref 不設外鍵：對不上的那幾筆正是對帳要看的東西。
CREATE TABLE "operating_bank_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "on_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "matched_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operating_bank_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_bank_entries_workspace_date_idx" ON "operating_bank_entries"("workspace_id", "on_date");

-- 薪資「試算草稿」：不是發放紀錄，不產生任何應付義務。
CREATE TABLE "operating_payroll_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "actor_key" TEXT NOT NULL,
    "base_amount" INTEGER NOT NULL DEFAULT 0,
    "overtime" INTEGER NOT NULL DEFAULT 0,
    "milestone" INTEGER NOT NULL DEFAULT 0,
    "separate" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_payroll_drafts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "operating_payroll_actor_key" ON "operating_payroll_drafts"("workspace_id", "actor_key");

-- ─── 里程碑允許「日期待補」──────────────────────────────────────────────────
-- 工作台一直允許先立下要交付什麼、日期之後再說（delivery[] 轉來的里程碑）。
-- 逼一個假日期進來會讓它們出現在日曆上。放寬約束不影響既有列。
ALTER TABLE "project_milestones" ALTER COLUMN "date" DROP NOT NULL;
