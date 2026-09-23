-- 文件庫與文件物件（PLN-074 M6）
--
-- 檔案 bytes 不進資料庫也不進 JSON：走 R2，這裡只留 object_key。
-- 之前 bytes 是以 base64 data URL 留在記憶體裡，重整即失，而且一旦接上持久化
-- 會把整個 base64 塞進 diff 送上伺服器 —— 那是必須在接線之前先解決的事。

CREATE TABLE "operating_library_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'material',
    "tags" TEXT NOT NULL DEFAULT '',
    "space" TEXT NOT NULL DEFAULT 'team',
    "author_key" TEXT,
    "versions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_library_files_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_library_files_workspace_space_idx" ON "operating_library_files"("workspace_id", "space");
CREATE INDEX "operating_library_files_ref_idx" ON "operating_library_files"("workspace_id", "workbench_ref");

CREATE TABLE "operating_doc_objects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "workbench_ref" TEXT,
    "kind" TEXT NOT NULL,
    "sub_kind" TEXT,
    "title" TEXT NOT NULL,
    "title_auto" BOOLEAN NOT NULL DEFAULT true,
    "on_date" DATE,
    "author_key" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "operating_doc_objects_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "operating_doc_objects_workspace_date_idx" ON "operating_doc_objects"("workspace_id", "on_date");
CREATE INDEX "operating_doc_objects_ref_idx" ON "operating_doc_objects"("workspace_id", "workbench_ref");
