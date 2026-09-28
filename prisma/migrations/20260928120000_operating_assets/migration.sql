-- 日誌檔案物件（提案：journal-asset-upload-proposals.html，P0 契約層）
--
-- 這張表要解的不是「還沒有地方存檔案」——R2 的上傳管線在 R2STORE-002/003 就通了，
-- 文件庫也已經把 objectKey 塞在 operating_library_files.versions[] 裡。
-- 要解的是：那樣的檔案沒有自己的 id，所以進不了 mentionHits()、@ 不到、
-- 物件索引也掃不到。檔案只是某張表的一個欄位，不是一個物件。
--
-- 純新增，不改任何既有表，無回填（系統裡還沒有任何 operating_assets 資料）。
-- 回滾：DROP TABLE 即可；一旦 R2 已有對應物件，回滾前要先跑孤兒清理，
-- 否則 bucket 裡會留下沒有任何一列指得到的 bytes。

CREATE TABLE "operating_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    -- RES-018 的四段格式，由伺服器指派一次。UNIQUE 是這裡唯一的防撞機制：
    -- 前端計數器版本（docObjectRefCode）每次重整都從 000001 重來，撞號讓寫入佇列
    -- 卡死並撞出一條渲染無限遞迴（YZUI-020）。序號改由伺服器續號 + 這條 UNIQUE 兜底。
    "ref_code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "content_hash" TEXT,
    -- uploading | ready | failed。預設 uploading：列在**預簽之前**就建好，
    -- 這樣即使使用者關掉分頁，R2 裡的 bytes 也還有一列指得到，不會變成查不清的孤兒。
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "upload_id" TEXT,
    "space" TEXT NOT NULL DEFAULT 'team',
    "author_key" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'journal',
    "born_day" DATE,
    "born_at" TIMESTAMP(3),
    "extracted_text" TEXT,
    "duration_sec" INTEGER,
    "transcript" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operating_assets_ref_code_key" ON "operating_assets"("ref_code");
-- 同一個 key 只能有一列：重試換新 key，所以這條不會擋到正常流程，
-- 但擋得住「同一份 bytes 被兩列各自宣稱擁有」。
CREATE UNIQUE INDEX "operating_assets_object_key_unique" ON "operating_assets"("bucket", "object_key");
-- 孤兒清理掃的是 (workspace, status)；物件索引依誕生日分組。
CREATE INDEX "operating_assets_workspace_status_idx" ON "operating_assets"("workspace_id", "status");
CREATE INDEX "operating_assets_workspace_day_idx" ON "operating_assets"("workspace_id", "born_day");
CREATE INDEX "operating_assets_ref_idx" ON "operating_assets"("workspace_id", "workbench_ref");

-- workspace_id 刻意不加外鍵，與 operating_library_files / operating_doc_objects 一致。
