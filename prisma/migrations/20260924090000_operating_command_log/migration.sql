-- 營運命令紀錄（PLN-074 M7）
--
-- operating_audit_events 是 teamcollab 的高風險稽核目錄：CHECK constraint 只收
-- workspace.created 這類具名動作，並強制 module_key='work'、risk_level='HIGH'、
-- human_approval_required=true。工作台的一般命令寫不進去。
--
-- 之前為了讓測試通過而整段移除稽核寫入，代價是每一次寫入都無跡可循，
-- 而且冪等保證跟著消失 —— 它原本就是靠那筆稽核列做的。這張表把兩者一起還回來。

CREATE TABLE "operating_command_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "client_ref_hash" TEXT NOT NULL,
    "actor_profile_id" UUID,
    "actor_key" TEXT,
    "op" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "collections" TEXT[],
    "change_count" INTEGER NOT NULL DEFAULT 0,
    "risk_level" TEXT NOT NULL DEFAULT 'low',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operating_command_logs_pkey" PRIMARY KEY ("id")
);

-- 冪等的依據：同一個 workspace 內 clientRef 唯一。
CREATE UNIQUE INDEX "operating_command_log_client_ref_key" ON "operating_command_logs"("workspace_id", "client_ref_hash");
CREATE INDEX "operating_command_log_workspace_time_idx" ON "operating_command_logs"("workspace_id", "created_at");
CREATE INDEX "operating_command_log_risk_idx" ON "operating_command_logs"("workspace_id", "risk_level", "created_at");
