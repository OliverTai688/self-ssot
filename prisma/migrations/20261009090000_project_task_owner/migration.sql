-- 任務的負責人與開始日（RES-035 · PROJUI-002）。
--
-- 工作台的任務一直有負責人，但這兩個值從來沒有落地：重新整理後 owner 是空字串，
-- 前端的「可不可以改」於是退回預設席位，只有 yz 勾得掉任務。
-- 純新增、可為 NULL、沒有回填：既有的列維持「未指派」，由使用者在工作台指定。
ALTER TABLE "project_tasks"
  ADD COLUMN "owner_key" TEXT,
  ADD COLUMN "started_on" DATE;
