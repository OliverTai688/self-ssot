# 證據報告：稽核軌跡沒有存到（抽屜讀的是記憶體）＋留言被記成動了帳務

2026-10-07 · repo `self-stucture-v1` · Owner 指派（對話中直接提出）

## Task

- Task ID：`AUDIT-TRAIL-001`（`PLN-060` 單列）
- 作用畫面：`UI-088`（`/company/operating` · 稽核軌跡抽屜、設定「稽核軌跡與安全」）Revision Mode；未新增 UI ID
- Owner 原話：「稽核是不是資料也沒有儲存到？」→ 說明之後：「幫我都做，然後 push to main」
- 範圍（Owner 同意的三件）：抽屜改讀伺服器；加欄位存「改了什麼」並補上行內留言的名稱（含 migration）；查 `txns` 夾帶

## Strategic Review

前一輪（`RQ-DEC-001`）修的是「決定沒存到」；這一輪是它的鏡像：**存到了，但介面宣稱的那一份不是存到的那一份**。
契約 §9.6 的獎金明細有爭議時要拿出來的就是稽核軌跡，而它重新整理就清空。這是 runtime 與 BFF 的實作，不是文件工作。

## 現況（正式資料庫唯讀查詢，2026-10-07）

| 問題 | 答案 |
|---|---|
| 決策回覆、行內留言本身 | 有存 |
| 伺服器命令紀錄 `operating_command_logs` | 有存，867 筆（09-23 起），截圖那兩筆都在：`13:13:07Z yz create 行內留言`、`13:13:24Z yz update 決策回覆` |
| 稽核抽屜顯示的內容 | 沒存。`DRAWERS.audit` 讀 `DB.audit`，由 `commit()` 內的 `audit()` 塞進記憶體；全 repo 沒有任何地方讀 `operatingCommandLog`（只有冪等檢查的 `findUnique` 與 `create`） |
| 抽屜上的第二行（「決定：課程…」） | 沒送到伺服器：命令只有 `op / ent / label / changes` |
| 行內留言的名稱 | 24 筆全是空字串 |
| 抽屜上的時間 | `toISOString()` 的 UTC（截圖 13:13 實為台北 21:13） |

867 筆裡 766 筆是「日誌 · 自動保存」。

### 另外發現：非帳務命令夾帶 `txns`

29 筆 `entity` 為行內留言／通知／日誌物件／連結／請求回覆／議題物件／專案的命令，`collections` 含 `txns`
（其中數筆另含 `projects`，`change_count` 7–8），`risk_level = high`。截圖那筆行內留言就是 `{lineComments,txns}`／2／high。
正式庫 `operating_transactions` 只有 3 列，其中 1 列有公式；每次被夾帶的都是 1 列。

## 根因

1. **抽屜**：原型的 `audit()` 只寫記憶體，接上資料庫時（PLN-074 M7）補了寫入（命令紀錄），沒有補讀取。
   設定頁其實寫著「尚未落資料庫」，抽屜頁尾卻寫「不能清空」。
2. **細節與名稱**：`opEnqueue(op, ent, label, before)` 沒有帶 `eff`；`jcSendLine()` 只在日誌的行裡找被留言的那一行，
   寫在文件物件段落（Standup、任務）裡的行找不到，名稱成了空字串。
3. **夾帶**：`commit()` 每次都跑 `stampAuthors()`（補 `author`、`ledgerRow`、`quantity`、`unitPrice`）與
   `recalcLedger()`（替有公式的交易寫 `formulaError: null`、重算 `amt`）。這些是衍生值，伺服器讀回來的列沒有。
   基準線在補齊之前取 → 下一次 commit 把補上的欄位比成變更：
   - 每一頁載入後的第一筆 commit：有公式的那筆交易多了 `formulaError`（啟動時 `stampAuthors()` 跑過，`recalcLedger()` 沒有）
   - 每一次 `opMergeRemote()` 之後的第一筆：全部專案的 `author` 被重蓋（合併後直接 `OP_BASELINE = opSnap()`）
   伺服器收到的是同值重寫（`applyTransaction` 的月結檢查因凍結欄位未變而通過），資料沒有錯，錯的是紀錄。
   `check-decision-reply.ts` 的註解早已描述過這個副作用，上一輪修的是它造成的資料遺失，沒有處理它造成的稽核失真。

## 做了什麼

| 層 | 改動 |
|---|---|
| Schema | `OperatingCommandLog.detail String?`；migration `20261007140000_operating_command_log_detail`（單一 `ADD COLUMN ... TEXT`，可為 NULL） |
| 契約 `operating-commands.ts` | `OperatingCommand.detail?`；`cleanAuditText()`；`OperatingAuditRow`／`OperatingAuditResponse`；`OPERATING_AUDIT_ENDPOINT`、`AUDIT_PAGE_SIZE`、自動保存的辨識常數 |
| 寫入 `operating-commands.service.ts`、`commands/route.ts` | 存 `detail`（壓控制字元、截 280 字，空的存 NULL）；`label` 擋 120 字；`detail` 非字串回 400 |
| 讀取（新）`operating-audit-log.service.ts`、`audit/route.ts` | `GET /api/company/operating/audit?autosave=1&before=<ISO>`：`requireUser` → 席位 → `role === 'owner'` → database 模式；每頁 100、`createdAt` 游標；不回 `clientRefHash`／`actorProfileId` |
| 前端 `operating-persistence.source.js` | `opDetail(eff)`；`opEnqueue` 第五個參數；`opSettle()` 於三處取基準線前呼叫；database 模式的 `DRAWERS.audit`／`openAudit` 改讀伺服器 |
| 前端其他 | `source-patches.mjs`（commit 的那一條 patch 多傳 `opDetail(eff)`）；`journal-cockpit.source.js`（留言名稱找得到物件段落裡的行、細節帶留言內容）；`extensions.source.js`（設定頁說明） |
| 生成物 | `runtime.js`（`node scripts/generate-yuanzhan-v5.mjs`）；`styles.ts` 無變更（沒有新增 CSS，沿用 `.aud`／`.btn`／`.empty` 與既有 token） |

抽屜在 database 模式的行為：每次打開都重取；筆數來自伺服器；時間顯示當地時間；自動保存預設收起並顯示「另有 N 筆」，可展開；
「載入更早的紀錄」；讀取失敗顯示訊息與重試，不退回記憶體那一份；沒有 `detail` 的舊列顯示動作（新增／更新／刪除）。
prototype 模式內容照舊，副標改「僅本頁」，頁尾說明重新整理就清空。

### NANDA / 高風險邊界

不涉及 agent 能力。稽核屬於僅負責人可見的資料（契約 §18）：新 API 只讀、僅負責人、伺服器端判斷；沒有新增任何寫入或刪除途徑。
Migration 為加一個可為 NULL 的欄位，Owner 已在對話中同意；由部署流程的 `prisma migrate deploy` 套用（`vercel.json`）。

## 選定方案與被拒絕的替代方案

- **選定**：讀既有的 `operating_command_logs`，加一欄 `detail`。這張表已經是冪等依據、每筆命令一列、有 workspace／時間索引。
- 拒絕「把 `DB.audit` 整包存進 store」：那是前端自述的紀錄，可被任何一頁覆寫，與「不可刪除」相反。
- 拒絕「寫進 `operating_audit_events`」：CHECK constraint 只收具名高風險動作（schema 註解已記）。
- 拒絕「伺服器存 `detail` 前去標記」：實測會把使用者打的 `<100 萬且 >50 萬` 吃掉。改成前端還原、伺服器不動內容、顯示端 escape。
- 拒絕「從快照裡濾掉衍生欄位」：要維護一份欄位名單，漏一個就回到原狀；`opSettle()` 讓基準線與 commit 後的狀態用同一組函式對齊。
- 拒絕「回頭修正既有 29 筆的 `risk_level`」：稽核紀錄不事後修飾；在 `ARC-042` §7.6 記下這段期間的標記不可靠。
- 拒絕「抽屜顯示帳務標籤」：既有紀錄的高風險標記有 29 筆是假的，顯示出來會誤導；等這段期間過去再說。

## 驗證

| 指令 | 結果 |
|---|---|
| `pnpm ops:audit-trail:check`（新） | 33/33 |
| 同一支對 `git show HEAD:…/runtime.js` | 15/33 —— 送出的命令是 `行內留言〔lineComments,txns〕` 與併回現況後的 `〔projects,lineComments,txns〕`，與正式庫紀錄相同 |
| `pnpm ops:proof:migrate`（拋棄式本機 Postgres 16，127.0.0.1:5544） | 20 支 migration 全串套用；`\d operating_command_logs` 有 `detail text` |
| `pnpm ops:roundtrip`（同上） | 35/35（原 22，新增 13 條：`detail` 往返、無 `detail` 讀回空字串、席位而非 profile id、新到舊、帳務標高風險、不洩漏雜湊、自動保存收起但計數、分頁不重不漏） |
| `ops:decision-reply:check` / `ops:day-state:check` / `ops:journal-space:check` | 36/36、34/34、9/9 |
| `check-cashflow-faces` / `check-contract-cashflow` / `ops:persistence:check` / `ops:fields:check` | 72/72、48/48、全過、358 |
| `pnpm exec tsc --noEmit` / `pnpm db:validate` / `pnpm db:generate` / `eslint`（改動檔） | 0 / valid / ok / 0 |
| `pnpm build` | exit 0，路由表含 `/api/company/operating/audit` |
| 正式庫 `prisma migrate status`（唯讀） | 只有 `20261007140000_operating_command_log_detail` 待套用 |

瀏覽器實測（同一個拋棄式資料庫，`PERSONAL_OS_AUTH_MODE=mock`，1440×900）：

1. 負責人席位：寫一行日誌（自動保存）→ 開抽屜：`0 筆 · 不可刪除`、`另有 1 筆日誌自動保存`。
2. 建專案「稽核實測專案 `<A&B>`」→ **重新整理** → 開抽屜：`1 筆`，`戴宇星｜專案 稽核實測專案 <A&B>｜專案切換器新增一項｜10-07 21:43:42`（當地時間）。
   資料庫列：`create / 專案 / {projects} / 1 / low`，`detail` 有值。
3. 「顯示自動保存」→ 請求帶 `?autosave=1`，3 筆全列出；再開一次抽屜只多一個請求。console 無錯誤。
4. 員工席位（另一個 mock 帳號，seat `lily`）：在負責人那一行留言「收到 `<ok>` & 謝謝」→ 資料庫列
   `lily / create / 行內留言 / 稽核軌跡實測：這一行會觸發自動保存 / 留言掛在 戴宇星 的這一行下方：收到 <ok> & 謝謝 / {lineComments} / 1 / low`
   —— 已有專案存在，沒有被夾帶。
5. 員工席位直接 `fetch('/api/company/operating/audit')` → `403 { code: "owner_only" }`；同一頁 `GET /commands` 為 200。

修正前即存在、與本次無關（`PROJMOD-007` 已列管）：`check-reply-jump` 21/22；`check-operating-runtime`／`check-operating-canvas`
在 Node 24 因 top-level await 無法轉譯，`pnpm ops:check` 因此在中途停下 —— 上表是逐支執行的結果。

沒有對正式資料庫做任何寫入；唯讀查詢四次（紀錄筆數與近況、`txns` 夾帶分佈、交易列數、migrate status）。

## Product capability delta

- 稽核軌跡第一次是真的：重新整理、換裝置都在，看得到兩個席位的操作，沒有清除途徑。
- 每一筆命令從今天起帶著「改了什麼」。
- 高風險標記從今天起只標真的動到帳務的命令。

## 風險與未完成

- **既有 867 筆沒有「改了什麼」**：那句話當時沒有送到伺服器，補不回來。抽屜顯示動作本身。
- **既有 29 筆誤標高風險**：不回頭改。查 2026-10-07 之前的帳務變更時，`collections` 含 `txns` 不代表金額被改。
- **直接呼叫 `audit()` 的三處沒有自己的那一行**：出勤分鐘逐格編輯（有「之前 → 之後」）、檔案上傳／歸檔、連結建立。
  它們的資料變更由帶著它的那筆命令記錄（多半是自動保存），但少了細節。要補的話是把這三處改走 `commit()`，另開一列。
- **部署順序**：建置流程先 `migrate deploy` 再 build。欄位可為 NULL，舊程式碼對新欄位無感；尚未重新整理的舊分頁不送 `detail`，伺服器存 NULL。
- **游標以毫秒為單位**：同一毫秒寫入的兩列若剛好落在分頁邊界會漏掉其中一列。命令是逐筆寫入，實務上不會同毫秒；要嚴格的話改成 `(createdAt, id)` 複合游標。
- **與同時段的其他提交的整合**：推送前 `origin/main` 先進了三個提交（專案匯入、專案總表、`/done` 貼紙）。本提交已 rebase 到
  `4910d2b9bd` 之上；衝突只在 `PLN-060`／`PLN-061`／`RPT-007`／`ACC-002`（兩邊各自新增段落，保留兩邊）。`runtime.js` 重新生成，
  rebase 後重跑：`ops:audit-trail` 33/33、`ops:decision-reply` 36/36、`ops:stickers` 38/38、`check-project-module-ui` 91/91、
  `ops:day-state` 34/34、`ops:journal-space` 9/9、cashflow 72/72＋48/48、`ops:persistence` 全過、`ops:fields` 362、
  `ops:roundtrip` 35/35、`tsc` 0、`pnpm build` exit 0。

## Next decision

建議下一步（擇一）：把出勤分鐘編輯改走 `commit()`，讓薪資相關的「之前 → 之後」進稽核 —— 契約 §9.6 最需要的就是這一種；
或做 `PROJMOD-007`，讓 `pnpm ops:check` 能一次跑完。
