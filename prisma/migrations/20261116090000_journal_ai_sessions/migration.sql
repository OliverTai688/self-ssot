-- 日誌 AI 的對話與訊息（RES-037 · JAI-S1）。
--
-- 兩張新表，純新增：不改、不讀任何既有的表，沒有回填。
--   operating_ai_sessions   一個對話。只有建立者讀得到（D3）；軟刪除（D6）。
--   operating_ai_messages   一則訊息。content 原樣存 API 的 content blocks（歷史只追加）。
--
-- 回復：DROP TABLE "operating_ai_messages", "operating_ai_sessions";
-- CreateTable
CREATE TABLE "operating_ai_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "owner_key" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '新對話',
    "title_auto" BOOLEAN NOT NULL DEFAULT true,
    "pinned_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "model" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_ai_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_ai_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "pins" JSONB NOT NULL DEFAULT '[]',
    "citations" JSONB NOT NULL DEFAULT '[]',
    "sent_refs" JSONB NOT NULL DEFAULT '[]',
    "text" TEXT NOT NULL DEFAULT '',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'done',
    "usage" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operating_ai_sessions_owner_idx" ON "operating_ai_sessions"("workspace_id", "owner_id", "last_message_at");

-- CreateIndex
CREATE INDEX "operating_ai_messages_created_idx" ON "operating_ai_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "operating_ai_messages_seq_key" ON "operating_ai_messages"("session_id", "seq");

-- AddForeignKey
ALTER TABLE "operating_ai_messages" ADD CONSTRAINT "operating_ai_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "operating_ai_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

