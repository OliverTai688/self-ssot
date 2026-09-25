-- 金流三面：收件匣、月結、憑證檔案（RES-032 · Owner 決策 2026-09-25）
--
-- 全部是新增：兩張新表，加一個有預設值的欄位。既有列不需要搬資料，
-- 回滾就是 drop 這兩張表與這一欄。
--
-- operating_transactions.vouchers（種類標籤）不改型別。檔案另存在 attachments，
-- 因為把 text[] 改成 jsonb[] 需要改寫每一列，而標籤與檔案本來就可以並存。

ALTER TABLE "operating_transactions" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "operating_intake_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "actor_key" TEXT,
    "title" TEXT NOT NULL,
    "amount" INTEGER,
    "on_date" DATE,
    "project_ref" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "file" JSONB,
    "reimb_ref" TEXT,
    "posted_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_intake_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operating_intake_items_workspace_status_idx" ON "operating_intake_items"("workspace_id", "status");
CREATE INDEX "operating_intake_items_ref_idx" ON "operating_intake_items"("workspace_id", "workbench_ref");

CREATE TABLE "operating_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "log" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operating_periods_workspace_period_key" ON "operating_periods"("workspace_id", "period");
