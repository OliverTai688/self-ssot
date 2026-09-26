-- 今日脈絡：把「掛在哪一天」與「真的何時寫的」分開（方案 2）
--
-- 脈絡列原本只有 on_date（在看哪一天的日誌）與 at_time（補記當下的時鐘）。
-- 明天回到今天的日誌補一筆，那一列會掛在今天、卻帶著明天的 HH:MM，
-- 而畫面又只用 at_time 排序 —— 假的時刻就這樣插進當天的時間軸中間，看不出來。
--
-- occurred_at 記真正發生的時刻。與 on_date 不同天即為補記，畫面分區顯示。
-- 可空而不給預設：分得出「沒有記錄過」與「真的在那一刻」。
ALTER TABLE "operating_day_logs" ADD COLUMN "occurred_at" TIMESTAMP(3);

-- 舊列回填：created_at 一直都是真實寫入時刻，只是從來沒被讀回工作台。
-- upsert 的 update 路徑不動 created_at，所以它沒有被後來的重送覆寫過。
UPDATE "operating_day_logs" SET "occurred_at" = "created_at" WHERE "occurred_at" IS NULL;
