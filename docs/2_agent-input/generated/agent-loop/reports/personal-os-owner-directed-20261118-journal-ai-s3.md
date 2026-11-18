# Agent Loop Evidence Report

## Task

`JAI-S3` 日誌 AI：日誌選取多行／物件「問 AI」入口、答案存進日誌、用量與每月上限的顯示、稽核列、長對話 compaction、30 天清除（`UI-088`，`RES-037` §15）。Owner 2026-11-18：「開始做 JAI-S3」。

## Source Docs Read

`RES-037` §9（D3、D5、D6）、§13、§14；`PLN-060` JAI 段；`block-select.source.js`（整行選取、`msPaint`、mousedown 清除）、`obj-names.source.js`（`objPeek`）、`extensions.source.js`（`currentJournal`、`canWriteJournal`）、`operating-persistence.source.js`（render 後 1.5 秒自動保存）、`operating-audit-log.service.ts`（稽核軌跡讀 `operating_command_logs`）、`line-identity.service.ts`（稽核列寫法）、`proxy.ts`、`vercel.json`；SDK 型別 `BetaCompact20260112Edit`／`BetaContextManagementConfig`。

## Scope

- 新增：`/api/company/operating/ai/usage`、`/api/cron/journal-ai-purge`、`scripts/purge-journal-ai.ts`。
- 修改：`tools.ts`（日誌行釘選）、`operating-ai.service.ts`（行釘選驗證、用量、稽核、compaction 觸發、清除）、`runner.ts`（compaction 參數）、`journal-ai.source.js`／`.css`（選取浮鈕、彈窗按鈕、行膠囊、存進日誌、用量）、`vercel.json`（crons）、`package.json`（`ops:ai:purge`）、檢查腳本、生成物、文件。
- 無 schema 變更、無 migration。未合併、未部署。

## Strategic Review

更真的事：問 AI 不必先複製貼上——在日誌裡選幾行、或點一個物件就能問；答案能回到日誌成為紀錄；花費與送出的資料量在畫面與稽核都看得到；刪除的對話真的會在 30 天後消失。

## Research / Reference Basis

- 本地慣例：包住既有函式（`msPaint`、`objPeek`）而不是改它們的檔，與 `astInsert`／`mentionHits` 的覆寫慣例一致；稽核沿用 LINE 綁定寫 `operating_command_logs` 的方式。
- 選定：選取浮鈕用 `pointerdown`（block-select 的 capture `mousedown` 會先清掉選取）；compaction 只在長對話送出；清除用 Vercel Cron＋`CRON_SECRET`、未設定時 503。
- 否決：右鍵選單（行動裝置與既有選取模型都不合）；稽核記問題文字（違反 D3）；每次都帶 compaction beta（短對話沒有好處，只多一個會壞的參數）；清除路由不驗密鑰或以登入驗證（Cron 沒有登入身分）。

## NANDA / Agent Protocol Alignment

`journal-assistant.agentfacts-lite.json` 升 0.3.0：endpoints 加 usage 與 cron、attestations 與 telemetry 加稽核列。AI 本身仍無寫入工具；「存進今天的日誌」是人按的動作、走一般自動保存。`externalRegisterable: false`。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `pnpm ops:journal-ai:check` | 43/43（新增 L1–L3 日誌行釘選） |
| `tsc`、eslint（變更檔）、generate、`pnpm build` | 0、0、PASS（778）、PASS（含 `/api/company/operating/ai/usage`、`/api/cron/journal-ai-purge`） |
| cron 無授權／錯授權（`CRON_SECRET` 已設） | 401／401 |
| cron 正確授權 | `{"due":1,"deleted":1}`：31 天前軟刪除的對話刪掉，訊息 cascade（孤兒 0），5 天前的保留 |
| 行釘選 API | 合法行解析進 `sentRefs`（`line:2026-11-10:yz:b1`）；`bad pin` 被丟 |
| 稽核列 | `yz | 日誌 AI | 對話 f91ec065 | 回答 · 送出日誌 6 行、物件 0 個、檔案 1 份、約 577 字 · US$0.0000 · mock` —— 第一版漏算釘選的資料，已修正為釘選＋工具讀取一起算 |
| 用量 API | `spentUsd 1.23 / capUsd 150`、`mineAnswers`、負責人看得到 `bySeat` |
| 瀏覽器：日誌 11/10 選取兩行 | 浮出「問 AI」；真實點擊後切到「問 AI」、新對話、兩行帶入；送出後泡泡顯示兩個行膠囊 |
| 存進今天的日誌 | 寫進 11/18、第一行閃一下；DB 4 個區塊；重新整理後仍在；含物件引用的答案存進後，物件成為行上的引用膠囊 |
| 物件彈窗 | 出現「問 AI／移除引用／開啟」；按下帶著 PDF 開新對話 |
| 只帶物件、空白按 Enter（真實按鍵） | 送出預設問題「這是什麼？重點是什麼？」 |

`.claude/launch.json` 暫加設定已還原；dev server 與 Postgres 已停止。本段沒有寫入 R2。

## Remaining Risks

1. **Compaction 未實測**：沒有金鑰；參數形狀依 SDK 型別。只有長對話才會帶，出錯時影響的是超過 12 萬 token 的對話。
2. **清除需要 `CRON_SECRET`**：沒設定前清除不會跑（刻意的 fail-closed），軟刪除的對話會一直留著。
3. **選取浮鈕只在桌機**：block-select 是滑鼠拖曳選取，手機上沒有多行選取，所以手機沒有這個入口（物件彈窗的入口手機可用）。
4. **問 AI 後輸入框不一定自動取得焦點**（`objPeekClose` 與 render 的時序），點一下即可；不影響功能。
5. 存進日誌的答案是引言段落，沒有保留清單層次。

## Final Status

`JAI-S3` DONE，2026-11-18 推上正式站（`23f1945cee`，部署成功、無 migration；AI 路由與用量未登入 401；清除路由回 503 `not_configured`）。下一步：Owner 設定 `CRON_SECRET` 與 `ANTHROPIC_API_KEY`；`JAI-S4`（搜尋衍生表、分享對話、提案型工具）待 Owner 決定是否需要。
