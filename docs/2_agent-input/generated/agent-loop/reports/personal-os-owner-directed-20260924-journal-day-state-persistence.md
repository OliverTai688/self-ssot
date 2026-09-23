# Agent Loop Evidence Report

## Task

- Task ID: YZUI-016
- Title: 日誌右欄「今日脈絡／今日議題」持久化；順帶修掉同一成因的留言、文件庫與日誌作者混淆
- Date: 2026-09-24
- Agent: Claude Opus 5（Owner-directed）

## Source Docs Read

- `AGENTS.md`
- `docs/05_execution-plans/PLN-060_task-backlog.md` / `PLN-061_current-sprint.md`
- `docs/06_audits-and-reports/RPT-007_completed-log.md`
- 既有落地紀錄：`claude/timeline-participants-sync-decision.md`、`claude/journal-reply-flow-decision.md`
- 程式：`operating-commands.ts`（ARC-042 契約）、`operating-commands.service.ts`、`operating-store.service.ts`、`journal-cockpit.source.js`、`replies.source.js`、`extensions.source.js`、`operating-persistence.source.js`、`v5-state.ts`

## Owner 回報

1. 「今日脈絡重新整理會消失」，希望它記錄宇星與 Lily 兩個人的脈絡，並且持續累積。
2. 追加：「今日議題已完成的標籤也會消失」。

## 根因

三件事互相獨立，但在畫面上長得一模一樣（重整後東西不見）：

1. **今日脈絡從來沒有被保存**。`DB.dayLog` / `DB.dayStart` 是純記憶體物件，不在 `PERSISTED_COLLECTIONS` 裡，沒有對應的表，也沒有 applier。今日議題（`DB.todayIssues`）同樣如此 —— 而它的 id 被寫回日誌 block 的 `today` 欄位，block 存得住、議題存不住，於是重整後 block 指著一個不存在的議題，**已完成的標籤就跟著消失**。
2. **有保存的集合，在載入後被清空覆蓋**。`DB.journalComments=[]`、`DB.files=[]`、`DB.objectComments=[]`、`DB.requests=[]`、`DB.lineComments=[]` 都是無條件指派，執行時機在 `const DB = initialState.data` 之後。資料確實寫進資料庫、也確實從 store 讀回來，只是在掛載時被蓋掉。
3. **日誌讀回來時沒有分作者**。寫入是 `(workspace, author, date)` 唯一，讀回來卻只用日期當鍵，同一天兩個人的日誌互相覆蓋，由查詢順序決定誰留下；runtime 又把整包綁進 `journals.team.yz`。Lily 登入時她自己的日誌會落進宇星的欄位、她的編輯區是空的，一打字就等於用空白覆蓋掉她原本那一天。這一條尚未發生（Lily 還沒開始寫），屬於預防性修復。

另外發現並修掉一個潛在的覆蓋：`nid()` 以 `DB.seq` 計數，而 `DB.seq` 每次載入都從 0 重來。集合被讀回來之後，新的 `LC-001` 會與上一次載入的 `LC-001` 推導出同一個 UUID，直接覆蓋舊列。（在集合被清空的舊行為下看不出來，修好第 2 點才會浮現。）

## 實作

- **契約**：`operating-commands.ts` 新增 `dayLogs`、`todayIssues` 兩個集合（PERSISTED + WRITE_ENABLED）。兩者都是「一筆事件一列」而不是「一天一列」——一天一列的話，兩個席位同一天各寫一筆就會互相覆蓋整天的內容。
- **Schema / migration**：`OperatingDayLog`（`operating_day_logs`）、`OperatingTodayIssue`（`operating_today_issues`）；`prisma/migrations/20260924120000_operating_day_log_and_today_issue`。「開始一天」與「收工」不另開表，它們就是同一條時間軸上 `kind='start'` / `kind='close'` 的兩個事件。
- **寫入**：`applyDayLog`、`applyTodayIssue` 兩個 applier 與 `HANDLERS` 登錄。
- **讀回**：`operating-store.service.ts` 讀最近 90 天（`DAY_STATE_WINDOW_DAYS`）；超出視窗的列留在資料庫，不會被當成「已刪除」送上去（比對只發生在本地載到的列之間）。
- **Runtime**：`DB.dayLog`/`DB.dayStart` 換成 `DB.dayLogs` 陣列；`jcStartAt()`、`DB.dayClose` 都改由脈絡列推回來，不再各自存一份狀態。脈絡列不再把人名寫進 `text`，改由 `e.w` 印出來並依席位著色，所以同一條時間軸看得出哪一筆是誰的。
- **順序修正（關鍵）**：`jcLog()` 改到 `jcBaseCommit()` **之後**。`commit()` 是先取快照才 `apply()`，在那之前寫的脈絡列會一起落進基準線，永遠比不出差異、也就永遠不會被送出去。打字路徑（`docInput`）不能 `render()`（游標會被重建掉），改為直接呼叫 `opTouch()` 排一次保存。
- **清空覆蓋**：五個集合改為 `DB.x = DB.x || []`。seed 沒有這幾個鍵，所以 prototype／showcase 模式行為完全不變。
- **日誌分作者**：store 回傳 `journal`（看的人自己的）與 `journalPeer`（對方的，唯讀、不在可寫入集合裡）；`extensions.source.js` 的書架改依 `DB.me` 綁定而不是寫死 `yz`。
- **id**：`source-patches.mjs` 一筆窄 `rep()`，讓 `nid()` 帶上每次載入各自不同的字段（時間＋亂數）。

## Verification

| 檢查 | 結果 |
|---|---|
| `scripts/check-journal-day-state.ts`（本輪新增，已併入 `ops:check`） | **25/25 PASS** |
| `scripts/check-operating-commands.ts` | 30 checks PASS |
| `scripts/check-operating-command-fields.mjs` | 279 checks PASS against `prisma/schema.prisma` |
| `scripts/check-prisma-structure.mjs` | PASS（models=67 enums=58 relations=34） |
| `scripts/check-migration-coverage.mjs` | 67 tables, 58 enums, all created by migrations |
| `scripts/check-operating-runtime.ts` | PASS · 雙模式 7 模組 29 分頁 · 錯誤 0 · 可疑數值 0 |
| `scripts/check-operating-spine.ts` / `check-operating-canvas.ts` | 24 checks PASS / 18 checks PASS |
| `scripts/verify-object-index.mjs`（上一輪的功能，回歸用） | 19/19 PASS |
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 errors |
| generator | 重新產生成功（363 handler templates） |

`check-journal-day-state.ts` 是本輪的主要證據：它把 database 模式的載入路徑整段走一遍（store → `createV5State` → `mountV5` → 畫面文字），斷言脈絡、議題、留言在畫面上真的還在；然後點一次「今日議題」的標籤，攔截送出去的命令批次，斷言新產生的脈絡列與議題完成時刻**確實被送出去**。這個 bug 的形狀型別檢查與契約測試都看不到 —— 資料有存、有讀回來，只是被蓋掉；只有真的掛一次才看得出來。

## NOT_RUN / 待 Owner 執行

- `prisma validate` / `prisma generate` / `prisma migrate deploy`：沙箱的 egress 擋掉 `binaries.prisma.sh`（403），Prisma 引擎下載不到，兩個新 model 因此無法產生 client。型別檢查改以與 schema 逐欄位對齊的暫時性 `declare module` shim 通過，shim 已刪除。**Owner 需在本機執行 `pnpm db:generate`，並對正式資料庫執行 `pnpm db:deploy`**，否則新表不存在、寫入會以 `apply_failed` 被拒。
- `verify-yuanzhan-v5.cjs`：需 playwright（沙箱與既有紀錄皆無），依 Manual Blocker Fallback 以上面的 harness 替代。
- 瀏覽器驗收：重整後右欄仍在、兩人同時操作時對方的脈絡會合併進來、四主題與 390px 可讀 —— 需 Owner 在實機確認。

## 風險與停止條件

- 90 天視窗是讀取側的取捨：更早的脈絡留在資料庫但不會載進瀏覽器，日期選擇器走到更早的日子會看到空的脈絡。要改成「按需求載入某一天」屬於另一塊工作。
- 脈絡列只增不減，沒有編輯或刪除介面。這是刻意的：事件發生過就是發生過。
- 本輪沒有碰高風險模組（Finance／Life／Client Portal／Company Strategy／Auth／公開輸出），沒有外部 agent 存取，NANDA Gate 不適用。
