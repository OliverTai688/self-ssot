-- 日誌右欄的兩人共用狀態（PLN-074 M7）
--
-- 「今日脈絡」與「今日議題」原本只活在頁面記憶體裡：重新整理就回到空白，
-- 而日誌 block 上的 `today` 參照還指著一個已經不存在的議題，
-- 於是已完成的標籤也跟著不見。這兩張表把它們接到與其他集合同一條寫入管線上。
--
-- 兩張表都是「一筆一列」而不是「一天一列」：一天一列的話，兩個席位同一天
-- 各寫一筆就會互相覆蓋整天的內容。

CREATE TABLE "operating_day_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "on_date" DATE NOT NULL,
    "actor_id" UUID,
    "actor_key" TEXT,
    "at_time" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'act',
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operating_day_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operating_day_logs_workspace_date_idx" ON "operating_day_logs"("workspace_id", "on_date");
CREATE INDEX "operating_day_logs_ref_idx" ON "operating_day_logs"("workspace_id", "workbench_ref");

CREATE TABLE "operating_today_issues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "author_id" UUID,
    "author_key" TEXT,
    "on_date" DATE NOT NULL,
    "block_id" TEXT,
    "text" TEXT NOT NULL,
    "flagged_at" TIMESTAMP(3),
    "done_at" TIMESTAMP(3),
    "deferred" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_today_issues_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operating_today_issues_workspace_date_idx" ON "operating_today_issues"("workspace_id", "on_date");
CREATE INDEX "operating_today_issues_ref_idx" ON "operating_today_issues"("workspace_id", "workbench_ref");
