# Agent Loop Evidence Report

## Task

- Task ID: `PROJUI-002`
- Title: 單一專案路徑 —— 狀態可點＋留理由、狀態紀錄、範本初始化、行內新增、工作清單、任務負責人落地
- Date: 2026-10-09
- Agent: Claude（Owner-directed，`UI-088` Revision Mode，Owner 委託 AI 依情境決策）

## Source Docs Read

- `AGENTS.md`（§5 模組需求缺口、§7 需求理解分數、§9 資料規則、§12／§12.1）
- `RES-034`、`PLN-075`、`ARC-042`（寫入契約）、`INTEGRATION-DECISION`
- 程式：`pm-plan.source.js`（全文）、`pm-shell.source.js`、`pm-overview.source.js`、`pm-chat.source.js`、`pm-meeting.source.js`、`pm-primitives.source.js`、`operating-commands.service.ts`（`applyIssue`、`applyChatChannel`、`applyChatMessage`、`APPLY_PRIORITY`）、`operating-store.service.ts`、`prisma/schema.prisma`（`ProjectTask`、`ProjectChatMessage`、`ProjectChatOrigin`）、`scripts/check-project-module-ui.mts`

## Scope

- In scope：見 `RES-035` §3 的採用欄。
- Out of scope：總表列上直接改狀態、凍結原型的看板／表格／日曆、會議／檔案／財務的版面、期款收款狀態、複製專案結構。

## Research / Reference Basis

- 需求理解 83（High）→ 三輪，全文在 `RES-035`。
- 截圖分析與 9×3 版提案：`docs/2_agent-input/generated/project-module-proposals/round2-single-project/index.html`。
- 本輪沒有新的外部來源；互動樣式沿用 `RES-034` 已引用的 Linear／Asana 專案模型與 NN/g 空白狀態準則。

## Findings

1. 專案模組裡六種狀態（專案、期、階段、里程碑、任務、審核結果）沒有一種可以在顯示它的地方直接改；只有審核退回會留理由。
2. **任務負責人沒有落地**：讀取回傳 `owner: ""`、寫入不存、`ProjectTask` 沒有欄位。重新整理後 `editable()` 退回預設席位，只有 yz 改得動任務。
3. `ProjectChatOrigin.SYSTEM` 與 `messageType`／`meta` 已存在且寫入路徑支援，但沒有任何程式使用。
4. `APPLY_PRIORITY` 沒有排 `chatChannels`，同一筆命令裡建頻道又寫訊息時順序只靠 diff 的原始順序。

## Implementation

| 檔案 | 變更 |
|---|---|
| `pm-status.source.js`（新，480 行） | `PM_ST` 六種狀態＋負責人的設定表；`pmStatusChip`／`pmTaskChip`／`pmOwnerBtn`；小視窗（開、選、Enter、Esc、必填檢查、不可選的原因）；`pmStatusApply`（單一寫入點）；`pmStatusRecord`／`pmStatusLog`／`pmStatusLine`；`pmQuickInput`／`pmQuickKey`；`PM_TEMPLATES`／`pmInitForm`；`PMV.work` |
| `pm-status.css`（新） | 狀態籤、小視窗（760px 以下改貼底）、狀態紀錄、行內新增、工作清單；全部走 token |
| `pm-plan.source.js` | 四層的狀態籤改可點；勾選框、菱形、完成這個階段、送審／通過／退回改走 `pmStatusApply`；行內新增；工具列五顆收成兩顆；空白狀態改推範本 |
| `pm-shell.source.js` | 計劃子視圖：工作（新）、看板 · 表格 · 日曆（原本的） |
| `pm-overview.source.js` | 狀態紀錄區塊；時間流把狀態變更列為獨立事件、不併入「對話 N 則」 |
| `pm-chat.source.js` | 狀態訊息畫成系統列，不帶頭像、不能刪 |
| `pm-index.source.js` | 標題列狀態可點；設定清單「分期」改為「用範本初始化」 |
| `pm-meeting.source.js` | 沒有結論時那一格可點，直接開會議表單 |
| `operating-commands.service.ts` | `applyIssue` 寫 `ownerKey`／`startedOn`；`APPLY_PRIORITY.chatChannels = 15` |
| `operating-store.service.ts` | 任務列回 `owner`／`started` |
| `prisma/schema.prisma`、`prisma/migrations/20261009090000_project_task_owner/` | `project_tasks` 加 `owner_key TEXT`、`started_on DATE`（可為 NULL、無回填） |
| `scripts/check-project-module-ui.mts` | 新增 31 條：行內新增、狀態往前／往回、理由必填、狀態紀錄、換負責人、階段阻擋、專案結案、工作清單、範本、Lily 權限 |
| `scripts/check-operating-command-fields.mjs`、`scripts/generate-yuanzhan-v5.mjs` | 欄位契約與 generator 清單 |

### Migration 影響

純新增兩個可為 NULL 的欄位，無回填、無索引、不鎖表以外的操作。既有任務的負責人維持空值（未指派），未指派的任務任何人可認領。
回復：`ALTER TABLE project_tasks DROP COLUMN owner_key, DROP COLUMN started_on;`。部署由 `vercel.json` 的 `prisma migrate deploy` 套用。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `node scripts/generate-yuanzhan-v5.mjs`、`node --check runtime.js` | 660 handler templates；通過 |
| `pnpm exec tsc --noEmit --pretty false` | exit 0 |
| `pnpm project:ui:check` | **122/122** |
| `ops:commands:check`／欄位契約／migration coverage／prisma structure／`db:validate` | 42 PASS／364 PASS／通過／通過／通過 |
| audit-trail／decision-reply／day-state／cashflow-faces／contract-cashflow／persistence／yuanzhan-v5 | 33/33／36/36／34/34／72/72／48/48／通過／通過 |
| `pnpm build`（環境變數指向本機測試庫） | exit 0 |
| 拋棄式本機 Postgres 16：`ops:proof:migrate` | 全串套用成功，含 `20261009090000_project_task_owner` |
| 同一個資料庫：`ops:roundtrip` | 35 checks PASS |
| 瀏覽器（負責人席位，database 模式，mock 登入） | 建立專案 → 設定清單開範本表單 → 建立 1 期／5 階段／9 里程碑 → 行內連加兩件任務（游標留在原格）→ 待辦→進行中（附理由）→ 勾選完成 → 拉回進行中（未寫理由被擋，寫了放行）→ 換負責人為 Lily → 里程碑已達成 → 專案 商機→進行中 |
| 查庫 | `project_tasks.owner_key = lily`、`started_on = 2026-10-09`；`project_chat_channels` 1 列 MAIN；`project_chat_messages` 5 列 `SYSTEM／status`，內文含理由；`operating_command_logs.detail` =「狀態 商機 → 進行中｜已簽約」 |
| 重新整理 | 專案狀態、任務狀態與負責人、狀態紀錄 5 筆、對話 5 則系統訊息全部讀回 |
| 瀏覽器（Lily 席位） | 完成掛在自己名下的任務（附理由）；宇星的任務勾不掉並出現既有的權限提示；新增一件任務。查庫三列任務的 `owner_key` 與狀態相符 |
| 375px | 小視窗 left 0／right 375／bottom 812（貼底），無橫向捲軸 |
| 預覽 console | 只有重啟伺服器造成的 HMR websocket 錯誤 |

未驗證：
- 沒有在正式庫上操作；正式庫的 migration 由部署套用。
- 淺色主題沒有目視確認。
- `ops:journal-space:check` 8/9：失敗的那一條（切回來之後回顧頁列得出每一天）在未含本輪改動的 `main` 87ea548ce7 上同樣失敗。
- `check-operating-runtime.ts`、`check-operating-canvas.ts` 在 Node 24 無法執行（`PROJMOD-007`）。

## NANDA Alignment

不適用。

## Risks

- 狀態變更多的那一天，主頻道會多出相同數量的系統訊息。
- 既有任務的負責人是空的，直到有人指定；空的任務任何人可改。
- 階段的「重新開啟」會把結束日延後一週，這是預設值，不是使用者選的；效果列會說出日期。
- 部署瞬間仍開著舊分頁的人看不到狀態訊息的專屬樣式（會被畫成一般訊息），重新整理後正常。

## Next Decision

Owner 於正式站驗收。候選後續：總表列上直接改狀態、看板檢視的狀態、`PROJIMP-B` 檔案搬遷。
