-- LINE 成員綁定與 webhook 收件匣（AUT-010 §2／§3 · LINESIG-S1）。
--
-- 三張新表，純新增：不改、不讀任何既有的表，沒有回填。
--   line_identities       LINE 帳號 ↔ 成員席位。一個席位一列；兩個唯一鍵保證
--                         一個席位同時只有一個 LINE 帳號、一個 LINE 帳號只屬於一個席位。
--   line_bind_codes       一次性綁定代碼，只存雜湊。
--   line_webhook_events   簽章通過的事件。payload 不含訊息內文與代碼原值。
--
-- 回復：DROP TABLE "line_webhook_events", "line_bind_codes", "line_identities";

-- CreateTable
CREATE TABLE "line_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "actor_key" TEXT NOT NULL,
    "profile_id" UUID,
    "line_user_id" TEXT,
    "display_name" TEXT,
    "picture_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "pending_expires_at" TIMESTAMP(3),
    "linked_at" TIMESTAMP(3),
    "unlinked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "line_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_bind_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "actor_key" TEXT NOT NULL,
    "profile_id" UUID,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_bind_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "source_type" TEXT,
    "line_user_id" TEXT,
    "group_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "is_redelivery" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "outcome" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimed_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "line_identities_actor_key" ON "line_identities"("workspace_id", "actor_key");

-- CreateIndex
CREATE UNIQUE INDEX "line_identities_line_user_key" ON "line_identities"("workspace_id", "line_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "line_bind_codes_code_hash_key" ON "line_bind_codes"("code_hash");

-- CreateIndex
CREATE INDEX "line_bind_codes_actor_idx" ON "line_bind_codes"("workspace_id", "actor_key", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "line_webhook_events_event_id_key" ON "line_webhook_events"("webhook_event_id");

-- CreateIndex
CREATE INDEX "line_webhook_events_pending_idx" ON "line_webhook_events"("processed_at", "received_at");

-- CreateIndex
CREATE INDEX "line_webhook_events_attempt_idx" ON "line_webhook_events"("line_user_id", "outcome", "received_at");
