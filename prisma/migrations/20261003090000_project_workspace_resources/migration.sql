-- 專案工作區五大資源：資料層地基（PLN-075 S2 · Migration ①＋②）
--
-- Owner 決策（PLN-075 §S0）在這份 SQL 裡的落點：
--   OD-D 會議＝擴充 occasions 加 folder_id（1:1）＋ cautions，**不另開 project_meetings**
--   OD-E operating_assets 是專案檔案唯一的家；file_assets / media_assets 一個字都不動
--   OD-F 聊天室新建「一列一訊息」的 project_chat_messages；operating_threads 完全保留
--
-- 全部 additive：沒有 DROP、沒有改必填、沒有改型別、沒有回填 UPDATE。
-- 每一張新表與每一個新 enum 都有明確的 CREATE —— scripts/check-migration-coverage.mjs
-- 逐一比對 schema 與 migration 歷史，少一個就 FAIL（它存在的理由是四張表曾經只活在
-- 正式資料庫裡、migration 一行都沒有，直到第一次對乾淨資料庫重播才炸）。
--
-- 回滾：DROP 新表、DROP 新 enum、DROP 新欄位即可；既有資料不受影響
-- （新欄位在回滾前全部是 NULL 或剛寫下的預設值）。

-- ─── 新 enum ────────────────────────────────────────────────────────────────

-- 資料夾用途。enum 而非字串 role：讓「哪些 kind 禁止對客戶可見」在 schema 層看得見。
CREATE TYPE "project_folder_kind" AS ENUM (
    'ROOT', 'INBOX', 'GENERIC', 'PROPOSAL', 'CONTRACT', 'MILESTONE', 'MEETING',
    'SHARED', 'INTERNAL', 'REVISION', 'MATERIAL', 'FINANCE', 'CHAT_DROP', 'LINE_DROP'
);

-- 三級，不是兩級。第三級（不建全文索引）是 `05/商城專案資訊.docx` 明文密碼所必需：
-- 資料夾權限擋不住全文搜尋，所以它必須是自己的一級。
CREATE TYPE "project_folder_visibility" AS ENUM (
    'CLIENT_VISIBLE', 'INTERNAL_ONLY', 'RESTRICTED_NO_INDEX'
);

-- 五格流程。既有的 project_phase（DISCOVERY…）是另一套詞彙，不動它。
CREATE TYPE "project_stage_kind" AS ENUM (
    'PROPOSAL', 'CONTRACT', 'EXECUTION', 'ACCEPTANCE', 'CLOSING', 'CUSTOM'
);

CREATE TYPE "project_lifecycle_stage" AS ENUM (
    'PROPOSING', 'CONTRACTED', 'EXECUTING', 'ACCEPTANCE', 'CLOSED'
);

CREATE TYPE "project_phase_cycle_status" AS ENUM (
    'PLANNED', 'ACTIVE', 'ACCEPTED', 'CLOSED', 'CANCELLED'
);

CREATE TYPE "project_task_kind" AS ENUM ('TODO', 'REVIEW');

CREATE TYPE "project_review_state" AS ENUM (
    'PENDING', 'IN_REVIEW', 'PASSED', 'CHANGES_REQUESTED', 'WAIVED'
);

CREATE TYPE "project_chat_channel_kind" AS ENUM ('MAIN', 'TOPIC', 'LINE_MIRROR', 'CLIENT');

CREATE TYPE "project_chat_origin" AS ENUM ('APP', 'LINE', 'LINE_IMPORT', 'SYSTEM');

-- ─── 新表①：資料夾樹 ────────────────────────────────────────────────────────
--
-- 為什麼每個專案一定要有一列 ROOT：Postgres 的 UNIQUE 視 NULL 為互異，所以
-- UNIQUE(parent_id, name_normalized) 擋不住兩個 parent_id IS NULL 的同名資料夾。
-- 有了真的根之後，其餘資料夾的 parent_id 一律非空，同層同名才真的被擋下來。
--
-- workspace_id 是 NOT NULL：夾內檔案（operating_assets.workspace_id NOT NULL）
-- 必須與資料夾同一個工作區。projects.workspace_id 可空，所以服務層在啟用硬碟前
-- 先跑 ensureProjectWorkspace() 把它補上 —— 那是具名步驟，不是隱性副作用。
CREATE TABLE "project_folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "parent_id" UUID,
    "kind" "project_folder_kind" NOT NULL DEFAULT 'GENERIC',
    -- 對客戶 deny-by-default
    "visibility" "project_folder_visibility" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "name" TEXT NOT NULL,
    -- 小寫 + NFC 正規化，只為同層唯一性；顯示一律用 name
    "name_normalized" TEXT NOT NULL,
    -- 具體化路徑 '/<rootId>/<id>/'。不用 ltree：Prisma 沒有該型別。
    "path" TEXT NOT NULL DEFAULT '/',
    "depth" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    -- ROOT / INBOX / CHAT_DROP：不可改名、不可刪除、不可搬移
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "space" TEXT NOT NULL DEFAULT 'team',
    "created_by_profile_id" UUID,
    "note" TEXT,
    -- 只軟刪：資料夾被里程碑交付夾或會議引用過就不能真的消失
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_folders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_folders_sibling_name_unique" ON "project_folders"("parent_id", "name_normalized");
CREATE INDEX "project_folders_project_kind_idx" ON "project_folders"("project_id", "kind");
CREATE INDEX "project_folders_project_path_idx" ON "project_folders"("project_id", "path");
CREATE INDEX "project_folders_ref_idx" ON "project_folders"("workspace_id", "workbench_ref");

ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- RESTRICT 而不是 CASCADE：刪掉一層不該默默帶走整棵子樹的 bytes 參照。
ALTER TABLE "project_folders" ADD CONSTRAINT "project_folders_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "project_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 新表②：期 ─────────────────────────────────────────────────────────────
--
-- 「期」不是 project_phase_nodes 上的一個整數欄位：二期帶著自己的合約、預算與起訖，
-- 那是一個實體。加三期＝插一列，不需要 migration、不需要改 enum。
CREATE TABLE "project_phase_cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "workspace_id" UUID,
    "workbench_ref" TEXT,
    "ordinal" INTEGER NOT NULL,
    "title" TEXT,
    "contract_id" UUID,
    -- 可空而不是 DEFAULT 0：「還沒編預算」與「預算是 0」不是同一件事
    "budget_amount" INTEGER,
    "start_on" DATE,
    "end_on" DATE,
    "status" "project_phase_cycle_status" NOT NULL DEFAULT 'PLANNED',
    "note" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_phase_cycles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_phase_cycles_project_ordinal_unique" ON "project_phase_cycles"("project_id", "ordinal");
CREATE INDEX "project_phase_cycles_project_status_idx" ON "project_phase_cycles"("project_id", "status");
CREATE INDEX "project_phase_cycles_ref_idx" ON "project_phase_cycles"("workspace_id", "workbench_ref");

ALTER TABLE "project_phase_cycles" ADD CONSTRAINT "project_phase_cycles_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_phase_cycles" ADD CONSTRAINT "project_phase_cycles_contract_id_fkey"
    FOREIGN KEY ("contract_id") REFERENCES "operating_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 新表③④⑤：聊天室（一列一訊息）────────────────────────────────────────
--
-- 為什麼需要頻道這一層：每個綁定的 LINE 群要成為同一個閱讀器裡的一個頻道
-- （kind = LINE_MIRROR），才能與站內訊息共用同一種訊息形狀、同一個附件管線、
-- 同一套權限。沒有頻道層，LINE 就得另造一套訊息表。
CREATE TABLE "project_chat_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "workspace_id" UUID,
    "workbench_ref" TEXT,
    "kind" "project_chat_channel_kind" NOT NULL DEFAULT 'TOPIC',
    "name" TEXT NOT NULL,
    "topic" TEXT,
    -- LINE_MIRROR 一律 true：站內不回傳訊息到 LINE
    "is_read_only" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    -- 衍生計數，由服務層單一 writer 維護（與 time_spine 同模式）
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    -- 附件落點（kind = CHAT_DROP 的資料夾）。NULL = 附件直接落 INBOX
    "drop_folder_id" UUID,
    "created_by_profile_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_chat_channels_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_chat_channels_project_kind_idx" ON "project_chat_channels"("project_id", "kind", "is_archived");
CREATE INDEX "project_chat_channels_ref_idx" ON "project_chat_channels"("workspace_id", "workbench_ref");

ALTER TABLE "project_chat_channels" ADD CONSTRAINT "project_chat_channels_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 一列一訊息。為什麼不是 operating_threads.messages JSON：JSON 陣列代表每送一則
-- 訊息重寫整列（兩人同時講話互相覆蓋），而且每則訊息沒有自己的 id ——
-- 無法回覆特定訊息、無法掛附件外鍵、無法被 @ 引用、無法建索引搜尋。
-- 欄位形狀抄 operating_comments：雙身分（author_profile_id + author_key）、軟刪。
CREATE TABLE "project_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" UUID NOT NULL,
    -- 去正規化：讓「這個專案所有訊息」與授權檢查不必 join
    "project_id" UUID NOT NULL,
    "workspace_id" UUID,
    "workbench_ref" TEXT,
    "author_profile_id" UUID,
    "author_key" TEXT,
    "author_external_ref" TEXT,
    "author_display_name" TEXT,
    "origin" "project_chat_origin" NOT NULL DEFAULT 'APP',
    -- LINE 的 messageId，或匯入檔的 sha256(時間|作者|內容)。去重用。
    "external_ref" TEXT,
    "body" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "is_placeholder" BOOLEAN NOT NULL DEFAULT false,
    "is_historical" BOOLEAN NOT NULL DEFAULT false,
    "reply_to_id" UUID,
    "mentions" JSONB NOT NULL DEFAULT '[]',
    "meta" JSONB NOT NULL DEFAULT '{}',
    -- 真正發生的時刻（LINE timestamp／匯出檔的時間），與 created_at 可能不同天
    "sent_at" TIMESTAMP(3) NOT NULL,
    "edited_at" TIMESTAMP(3),
    -- 軟刪：訊息被回覆或引用過就不能真的消失
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_chat_messages_channel_external_unique" ON "project_chat_messages"("channel_id", "external_ref");
CREATE INDEX "project_chat_messages_channel_time_idx" ON "project_chat_messages"("channel_id", "sent_at");
CREATE INDEX "project_chat_messages_project_time_idx" ON "project_chat_messages"("project_id", "sent_at");
CREATE INDEX "project_chat_messages_reply_idx" ON "project_chat_messages"("reply_to_id");
CREATE INDEX "project_chat_messages_ref_idx" ON "project_chat_messages"("workspace_id", "workbench_ref");

ALTER TABLE "project_chat_messages" ADD CONSTRAINT "project_chat_messages_channel_id_fkey"
    FOREIGN KEY ("channel_id") REFERENCES "project_chat_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_chat_messages" ADD CONSTRAINT "project_chat_messages_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_chat_messages" ADD CONSTRAINT "project_chat_messages_reply_to_id_fkey"
    FOREIGN KEY ("reply_to_id") REFERENCES "project_chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 訊息 ↔ 檔案。為什麼不是 asset_ids TEXT[]：反向查詢（「這個檔案在哪些訊息被提到」）
-- 是物件索引與檔案抽屜都要的功能，而陣列包含查詢需要 GIN 索引，Prisma 宣告不了。
CREATE TABLE "project_chat_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    -- operating_assets.id。刻意不加外鍵，與 operating_assets 整張表的慣例一致
    -- （bytes 在 R2，刪除該由孤兒清理處理，不是由 FK）。
    "asset_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_chat_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_chat_attachments_unique" ON "project_chat_attachments"("message_id", "asset_id");
CREATE INDEX "project_chat_attachments_asset_idx" ON "project_chat_attachments"("asset_id");

ALTER TABLE "project_chat_attachments" ADD CONSTRAINT "project_chat_attachments_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "project_chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 擴充既有表（全部可空或帶預設）──────────────────────────────────────────

-- projects：生命週期四欄。
-- 既有列會拿到 'PROPOSING' —— 那對一個正在執行的專案是錯的。S3 需要一次回填
-- （由 operating_project_profiles.deal_stage 與 projects.phase 推導）才能把這一欄
-- 當權威讀。這份 migration 刻意不做那個 UPDATE：additive 的保證比方便更重要。
-- operating_project_profiles.operating_status（獎金閘門③）與 project_deal_stage
-- （金流推演）原狀保留、一個字都不改。
ALTER TABLE "projects" ADD COLUMN "lifecycle_stage" "project_lifecycle_stage" NOT NULL DEFAULT 'PROPOSING';
ALTER TABLE "projects" ADD COLUMN "phase_round" INTEGER;
-- `0_工作區` 的兩位數編號。不是鍵：`09` 被用過兩次（編號會回收），它只是找回舊案子的線索。
ALTER TABLE "projects" ADD COLUMN "legacy_folder_no" TEXT;
ALTER TABLE "projects" ADD COLUMN "priority_tier" INTEGER;

CREATE INDEX "projects_workspace_lifecycle_idx" ON "projects"("workspace_id", "lifecycle_stage");

-- project_tasks：TODO 與審核是同一張表的兩種 kind。
-- 兩張表的話「這個里程碑還剩幾件事」必須 UNION 兩個來源，於是會有兩個答案。
ALTER TABLE "project_tasks" ADD COLUMN "kind" "project_task_kind" NOT NULL DEFAULT 'TODO';
-- Profile.id；對不到人時留空，身分仍由 reviewer_key 保住（抄 operating_comments 的雙身分）。
-- 刻意不加外鍵，與 operating_day_logs.actor_id 一致。
ALTER TABLE "project_tasks" ADD COLUMN "reviewer_id" UUID;
ALTER TABLE "project_tasks" ADD COLUMN "reviewer_key" TEXT;
ALTER TABLE "project_tasks" ADD COLUMN "review_result" "project_review_state";
ALTER TABLE "project_tasks" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "project_tasks" ADD COLUMN "review_note" TEXT;
-- 直接掛里程碑：「里程碑底下的 TODO」不該被迫先發明一個目標（objective 仍然存在）。
ALTER TABLE "project_tasks" ADD COLUMN "milestone_id" UUID;

CREATE INDEX "project_tasks_project_kind_status_idx" ON "project_tasks"("project_id", "kind", "status");
CREATE INDEX "project_tasks_milestone_kind_idx" ON "project_tasks"("milestone_id", "kind");

ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_milestone_id_fkey"
    FOREIGN KEY ("milestone_id") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- project_phase_nodes：階段歸屬到期。
-- phase_cycle_id **必須可空**：v5 工作台的 `phases` 集合會繼續寫入沒有期的階段列，
-- 設成 NOT NULL 會讓既有寫入路徑當場壞掉（PLN-075 §S2「不可觸碰」）。
ALTER TABLE "project_phase_nodes" ADD COLUMN "phase_cycle_id" UUID;
-- 期內順序。stage_kind 可以重複（一期內「執行→驗收→執行→驗收」），
-- 所以階段在期內的身分是 ordinal 而不是 stage_kind。
ALTER TABLE "project_phase_nodes" ADD COLUMN "ordinal" INTEGER;
ALTER TABLE "project_phase_nodes" ADD COLUMN "stage_kind" "project_stage_kind";

CREATE INDEX "project_phase_nodes_cycle_ordinal_idx" ON "project_phase_nodes"("phase_cycle_id", "ordinal");

ALTER TABLE "project_phase_nodes" ADD CONSTRAINT "project_phase_nodes_phase_cycle_id_fkey"
    FOREIGN KEY ("phase_cycle_id") REFERENCES "project_phase_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- project_milestones：交付夾。是**連結**不是包含 —— 刪掉里程碑不該動到檔案。
ALTER TABLE "project_milestones" ADD COLUMN "folder_id" UUID;

CREATE INDEX "project_milestones_folder_idx" ON "project_milestones"("folder_id");

ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_folder_id_fkey"
    FOREIGN KEY ("folder_id") REFERENCES "project_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- occasions：會議資料夾 1:1（OD-D，不另開 project_meetings）＋ 注意事項。
-- cautions 與既有 recap 是兩件不同的事：recap 是這場會議產出了什麼（結論），
-- cautions 是下一次要先知道的前提（注意事項）。
ALTER TABLE "occasions" ADD COLUMN "folder_id" UUID;
ALTER TABLE "occasions" ADD COLUMN "cautions" TEXT;

-- UNIQUE 而不是普通索引：語意是「資料夾 ←→ 會議 1:1 連結」。
CREATE UNIQUE INDEX "occasions_folder_id_key" ON "occasions"("folder_id");

ALTER TABLE "occasions" ADD CONSTRAINT "occasions_folder_id_fkey"
    FOREIGN KEY ("folder_id") REFERENCES "project_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- operating_assets：專案雲端硬碟四欄（OD-E：這張表是專案檔案唯一的家）。
-- file_assets / media_assets 不動不遷。
ALTER TABLE "operating_assets" ADD COLUMN "project_id" UUID;
-- 搬移只改 folder_id，object_key 永不變動 —— 這是把資料夾放在 DB 而不是 key 裡的回報。
ALTER TABLE "operating_assets" ADD COLUMN "folder_id" UUID;
-- 被整理出收件匣的時刻。NULL = 待整理。另外存而不是只看 folder_id：
-- 使用者把檔案又移回收件匣之後，「整理過沒有」這個問題仍然答得出來。
ALTER TABLE "operating_assets" ADD COLUMN "filed_at" TIMESTAMP(3);
ALTER TABLE "operating_assets" ADD COLUMN "derivatives" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "operating_assets_project_folder_idx" ON "operating_assets"("project_id", "folder_id", "status");
CREATE INDEX "operating_assets_project_filed_idx" ON "operating_assets"("project_id", "filed_at");

-- project_id / folder_id 刻意不加外鍵，與這張表既有的 workspace_id 一致：
-- bytes 在 R2，專案被刪除時 CASCADE 會留下沒有任何一列指得到的 bytes，
-- 而 RESTRICT 會讓專案永遠刪不掉。孤兒清理（pnpm ops:assets:cleanup）才是對的工具。
