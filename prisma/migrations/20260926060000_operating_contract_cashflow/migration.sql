-- 合約金流（需求一：專案金流視角）
--
-- 金流原本的六張帳務表全部只記錄「已發生」的錢。Runway 與應收未收因此只能是寫死的
-- 字面值 —— 不是懶，是系統裡根本沒有「承諾了但還沒發生」這個實體。
--
-- 這一次補的就是那個實體：合約 → 期款。期款帶兩個日期，預計收款與實際收款；
-- 兩者的差累積成「這個客戶的付款落差」，推演用它平移未來的期款。
-- 到期日是合約寫的，實際到帳是客戶決定的。

CREATE TYPE "project_deal_stage" AS ENUM ('CHALLENGEABLE', 'PROPOSED', 'WON', 'CLOSED');

CREATE TABLE "operating_contracts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "project_id" UUID NOT NULL,
    "title" TEXT,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "clause_ref" TEXT,
    "signed_on" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_contracts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operating_contracts_workspace_project_idx" ON "operating_contracts"("workspace_id", "project_id");
CREATE INDEX "operating_contracts_ref_idx" ON "operating_contracts"("workspace_id", "workbench_ref");

ALTER TABLE "operating_contracts" ADD CONSTRAINT "operating_contracts_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- amount 是權威，pct_of_total 只是建立當下的輔助值。
-- 回算會讓部分收款、折讓與匯差全部對不上，所以它不參與任何計算。
CREATE TABLE "operating_contract_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "contract_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "pct_of_total" INTEGER,
    "trigger_kind" TEXT NOT NULL DEFAULT 'date',
    "milestone_ref" TEXT,
    "expected_on" DATE NOT NULL,
    "invoiced_on" DATE,
    "settled_on" DATE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txn_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_contract_terms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operating_contract_terms_workspace_expected_idx" ON "operating_contract_terms"("workspace_id", "expected_on");
CREATE INDEX "operating_contract_terms_contract_seq_idx" ON "operating_contract_terms"("contract_id", "seq");
CREATE INDEX "operating_contract_terms_ref_idx" ON "operating_contract_terms"("workspace_id", "workbench_ref");

ALTER TABLE "operating_contract_terms" ADD CONSTRAINT "operating_contract_terms_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "operating_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 只存期初餘額與基準日。之後的水位由已勾稽的交易推導 ——
-- 存一個 balance 欄位就會漂移，而且漂移的方向永遠是樂觀的。
CREATE TABLE "operating_cash_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'bank',
    "opening_balance" INTEGER NOT NULL DEFAULT 0,
    "opening_as_of" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TWD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_cash_accounts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operating_cash_accounts_workspace_idx" ON "operating_cash_accounts"("workspace_id");

-- 門檻與機率存百分比整數，不存浮點數：對帳用的數字不該有浮點誤差。
CREATE TABLE "operating_cash_assumptions" (
    "workspace_id" UUID NOT NULL,
    "monthly_burn" INTEGER NOT NULL DEFAULT 0,
    "runway_green_months" INTEGER NOT NULL DEFAULT 6,
    "runway_amber_months" INTEGER NOT NULL DEFAULT 3,
    "coverage_green_pct" INTEGER NOT NULL DEFAULT 120,
    "coverage_amber_pct" INTEGER NOT NULL DEFAULT 80,
    "overdue_amber_days" INTEGER NOT NULL DEFAULT 14,
    "overdue_red_days" INTEGER NOT NULL DEFAULT 30,
    "prob_challengeable_pct" INTEGER NOT NULL DEFAULT 20,
    "prob_proposed_pct" INTEGER NOT NULL DEFAULT 50,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_cash_assumptions_pkey" PRIMARY KEY ("workspace_id")
);

-- 對外四狀態。operating_status（商機／進行中／驗收中）留著當子階段：
-- 獎金結算閘門③「內部驗收（14 日）」讀的是它，收斂掉那一項就失效。
ALTER TABLE "operating_project_profiles" ADD COLUMN "deal_stage" "project_deal_stage" NOT NULL DEFAULT 'CHALLENGEABLE';
ALTER TABLE "operating_project_profiles" ADD COLUMN "stage_entered_at" DATE;

-- 舊列回填：用既有的中文狀態推回四格，不新增一份 fixture。
UPDATE "operating_project_profiles" SET "deal_stage" = 'WON' WHERE "operating_status" IN ('進行中', '驗收中');
UPDATE "operating_project_profiles" SET "deal_stage" = 'CLOSED' WHERE "operating_status" = '已結案';
UPDATE "operating_project_profiles" SET "stage_entered_at" = COALESCE("started_on", CURRENT_DATE) WHERE "stage_entered_at" IS NULL;

-- RES-032 §2.3 缺的第五個維度：一筆錢的確定性。
-- on_date 是經濟事件何時成立，due_date 是錢何時該進出，settled_date 是真的何時進出。
-- 三件事壓在一個 on_date 上，就是應收未收只能寫死 88000 的原因。
ALTER TABLE "operating_transactions" ADD COLUMN "due_date" DATE;
ALTER TABLE "operating_transactions" ADD COLUMN "settled_date" DATE;
ALTER TABLE "operating_transactions" ADD COLUMN "certainty" TEXT NOT NULL DEFAULT 'actual';
ALTER TABLE "operating_transactions" ADD COLUMN "contract_term_ref" TEXT;

-- P3 里程碑獎金。
-- 在這之前，人事頁的「里程碑」那一格是 payroll 草稿裡手打的數字 ——
-- 而同一頁的說明寫著「這頁沒有一個數字是人工填的」。加上這一欄之後它才是算出來的。
ALTER TABLE "project_milestones" ADD COLUMN "bonus_amount" INTEGER NOT NULL DEFAULT 0;
