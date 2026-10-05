# RPT-068 專案模組五大資源：S3 建置結果與 S4 驗收報告

- 日期：2026-10-04
- 依據：`PLN-075`（S3／S4）、`INTEGRATION-DECISION.md`（Owner 已於 2026-10-03 批准）、`ARC-043`
- 作用畫面：`UI-088`（`/company/operating` · 專案模組）
- 狀態：**S3 完成；S4 待 Owner 依 §8 的腳本做整合測試**

這份報告是給 Owner 做整合測試用的。它回答四件事：做了什麼、怎麼知道它是對的、哪些地方還不對、你要怎麼自己驗一次。

---

## 1. 一句話

專案模組現在是六個分頁 —— **總覽／計劃／檔案／會議／對話／財務** —— 四個資源（聊天室、雲端硬碟、專案工作區、會議資料區）都能操作、寫入走既有的 `commit()` 管線、重整後讀得回來。第五個資源（LINE 群導入）依 OD-H 本階段不做，以停用的入口呈現。

## 2. 三案比較與選案理由

三份可點擊原型在 repo 根目錄（`project-module-proposal-A-tabs.html`／`-B-timeflow.html`／`-C-resourcetree.html`）。

| | A 分頁延伸 | B 時間流主軸 | C 雙欄資源樹 |
|---|---|---|---|
| 核心主張 | 沿用 v5 的分頁慣例 | 單欄時間序當主幹 | 左側統一資源樹 |
| 回答得最好的問題 | 專案模組怎麼坐進 v5 | 這個案子到今天發生了什麼 | 多層資料夾與會議資料夾怎麼做 |
| 弱點 | 資源之間的關聯難表達 | 答不好「現在還有什麼沒做完」 | 390px 橫向溢出；v5 唯一有常駐側欄的畫面 |
| 最後用在哪 | **外殼** | **總覽下半** | **檔案、會議兩個分頁內** |

**外殼選 A 是工程證據決定的，不是品味**：`operating-converge.source.js` 已經用「覆寫 `VIEWS.project` ＋ 改 `proj.tabs`」的慣例加過分頁，這條路不需要碰 `source-patches.mjs`（裡面每一個 `rep()` 都是找不到原文就 throw，是整個 v5 最脆弱的地方）。實作結果：**本輪 `source-patches.mjs` 一行都沒動，也沒有新增圖示**。

C 的 390px 溢出在實作時修掉了：樹只在分頁內，760px 以下收到主欄上方。實測六個分頁在 390px 都沒有橫向溢出（§4.3）。

## 3. 做了什麼

### 3.1 分頁與舊連結

| 新分頁 | 內容 | 子視圖 |
|---|---|---|
| 0 總覽 | 一行數字列 → 期階梯 → 跨資源待辦 → 五大資源入口 → 交付標準 → 時間流 | — |
| 1 計劃 | 期 → 階段 → 里程碑 → 任務（TODO／審核任務） | 工作、里程碑 · 目標 |
| 2 檔案 | 資源樹 ＋ 資料夾內容；收件匣是樹上的真資料夾 | Evidence Repo |
| 3 會議 | 時間序 ＋ 四屬性 ＋ 四件套 ＋ 會議待辦 | — |
| 4 對話 | 頻道 ＋ 一列一訊息 | 議題串 |
| 5 財務 | 原樣不動 | — |

「工作」「Evidence Repo」「里程碑」「議題串」沒有被刪掉，降為子視圖。舊 index 的 `nav('project', n)` 照下表落到原本那一面：

| 舊 index | 落點 |
|---|---|
| 0 總覽 | 總覽 |
| 1 工作 | 計劃 › 工作 |
| 2 對話 | 對話 › 議題串 |
| 3 Evidence Repo | 檔案 › Evidence Repo |
| 4 財務 | 財務 |
| 5 里程碑 | 計劃 › 里程碑 · 目標 |

從分頁列按進來一律落在主視圖；跨分頁跳轉會留下一條「回到 ○○」的回返列，`Esc` 可退回，可堆疊。

### 3.2 新增的檔案

| 檔案 | 行數 | 內容 |
|---|---|---|
| `src/components/yuanzhan/v5/pm-shell.source.js` | 487 | 外殼、分頁重組、舊 index 重導、回返脈絡、共用資料存取、prototype 示範資料 |
| `src/components/yuanzhan/v5/pm-overview.source.js` | 214 | 總覽 |
| `src/components/yuanzhan/v5/pm-plan.source.js` | 541 | 計劃：期／階段／里程碑／任務的表單與審核流程 |
| `src/components/yuanzhan/v5/pm-drive.source.js` | 555 | 檔案：樹、資料夾 CRUD、上傳、歸檔、下載 |
| `src/components/yuanzhan/v5/pm-meeting.source.js` | 337 | 會議：四屬性、四件套、待辦、兩條升級路徑 |
| `src/components/yuanzhan/v5/pm-chat.source.js` | 250 | 對話：頻道、訊息、附件、訊息→任務 |
| `src/components/yuanzhan/v5/pm-shell.css` | 200 | 上述版面的樣式 |
| `scripts/check-project-module-ui.mts` | 313 | 無瀏覽器回歸檢查（`pnpm project:ui:check`） |

`runtime.js`／`styles.ts` 由 `node scripts/generate-yuanzhan-v5.mjs` 重新產生（626 個 handler），沒有手改。

### 3.3 交接文件沒提到、但不補就不能上線的五件事

| # | 發現 | 處理 |
|---|---|---|
| 1 | **新集合只接了寫入，沒接讀取**。`operating-store.service.ts` 不讀 `folders`／`phaseCycles`／`chatChannels`／`chatMessages`，寫進去的東西重整後全部消失 —— 這比不保存更糟，因為它看起來保存了 | 補上四個集合的讀取，以及 `issues`／`phases`／`milestones`／`occasions`／`assets` 的新欄位 |
| 2 | **會議、階段、里程碑的新欄位沒有寫入**。`applyOccasion` 不寫 `projectId`／`folderId`／`cautions`；`applyPhase` 不寫期；`applyMilestone` 不寫交付夾 | 三個處理器補齊 |
| 3 | **里程碑的「已達成」從來沒被存過**。`applyMilestone` 不寫 `status`、讀取端不回 `state`，重整後每個里程碑都回到進行中（既有缺口，不是 S2 造成的） | 順手補上，因為計劃分頁的階段狀態靠它推導 |
| 4 | **一次 commit 裡的變更順序不是依賴順序**。集合名單裡 `phases` 排在 `projects` 前、`occasions` 排在 `folders` 前，「建立會議同時建它的資料夾」會因為資料夾還沒寫進來而整筆被拒 | 伺服器套用前依外鍵關係排序（`orderByDependency`） |
| 5 | **兩個型別錯誤會擋住 Vercel build**。S2 給 `Project` 加了四欄之後，`team-workspace.service.ts` 刻意只 select 舊欄位的兩處對不上 mapper 的輸入型別 | mapper 的輸入型別改為不要求那四欄 |

另外兩項強化：資料夾搬移時子孫的 `path`／`depth` 用一條子樹 UPDATE 重寫（交接文件 §5.2 的要求）；子資料夾的可見性在伺服器端不得比上層寬（收緊，不是拒絕）。

## 4. 怎麼知道它是對的

### 4.1 機檢（全部在本機實際跑過）

| 檢查 | 結果 |
|---|---|
| `pnpm exec tsc --noEmit` | **0 errors** |
| `pnpm build`（`next build --webpack`） | **exit 0** |
| `eslint`（改動的 service／route／mapper） | 0 errors（3 個既有的 unused-var 警告） |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS，626 個 handler 編成閉包 |
| `pnpm ui:nested-card:check` | PASS —— **七個新檔 0 違規**；既有基線 143 筆不變 |
| `pnpm project:ui:check`（新增） | **74/74** |
| `check-prisma-structure` | PASS — models=79 enums=68 relations=48 |
| `check-operating-spine` | PASS — 24 checks |
| `check-operating-commands` | PASS — 42 checks |
| `check-operating-command-fields` | PASS — 356 checks |
| `check-migration-coverage` | PASS — 79 tables, 68 enums |
| `check-operating-runtime` | PASS — 雙模式 7 模組 26 分頁，0 錯誤 |
| `check-journal-day-state` | 34/34 |
| `check-cashflow-faces` | 72/72 |
| `check-contract-cashflow` | 48/48 |
| `check-operating-persistence` | PASS |
| `verify-project-drive` | 140/140 |
| `check-operating-canvas` | **FAIL（既有）** —— 見 §6.1 |
| `check-reply-jump` | **21/22（既有）** —— 見 §6.1 |

### 4.2 `pnpm project:ui:check` 涵蓋什麼

| 段落 | 檢查數 | 內容 |
|---|---|---|
| A 六個分頁 | 8 | showcase／empty 兩種模式都有六個分頁、名稱順序正確、0 錯誤、沒有 NaN |
| B 舊 index 重導 | 14 | 六個舊 index 各自落到對的分頁與子視圖，而且那一面有內容 |
| C 主要操作 | 31 | 審核（通過／重新送審／退回必填原因）、分期（續期自動帶執行→驗收→結案）、資料夾（同名擋下／新增／改名／收緊可見性／搬移）、收件匣整理、會議四屬性與四件套、三條升級路徑、對話 |
| D database 模式寫入契約 | 21 | 攔下送往 BFF 的命令，核對八個集合的欄位名、父資料夾排在子資料夾之前、五個階段依序、會議與資料夾同一次 commit |

D 段不連資料庫：它驗的是「工作台送出去的東西長得對不對」。伺服器那一頭「收到之後寫進哪一欄」由 `check-operating-command-fields`（356 項，對 `schema.prisma` 核對）負責。

### 4.3 瀏覽器實測（本機 showcase，`pnpm ui:yuanzhan:showcase`）

截圖在 `docs/2_agent-input/generated/project-module-acceptance/`。

| 截圖 | 內容 |
|---|---|
| `01-overview-desktop.jpg` | 總覽：數字列、期階梯、跨資源待辦 |
| `02-overview-timeflow.jpg` | 總覽下半的時間流 |
| `03-plan-cycles.jpg` | 計劃：一期五階段 |
| `04-plan-review-tasks.jpg` | 計劃：審核任務的送審／通過／退回與退回原因 |
| `05-drive-tree.jpg` | 檔案：資源樹與資料夾內容 |
| `06-meeting-folder.jpg` | 會議：四屬性、四件套 4/4、已轉決議 |
| `07-chat-room.jpg` | 對話：頻道、訊息、停用的 LINE 入口 |
| `08-plan-mobile-390.jpg` | 計劃，390px |
| `09-drive-mobile-390-white-theme.jpg` | 檔案，390px ＋ 白色佈景 |

390×844 逐分頁量測（`document.documentElement.scrollWidth > innerWidth` 與 `#surface` 的 `scrollWidth > clientWidth`）：

| 分頁 | 整頁橫向溢出 | 主欄橫向溢出 |
|---|---|---|
| 總覽／計劃／檔案／會議／對話 | 否 | 否 |
| 財務（既有畫面） | 否 | 否（表格在自己的捲動容器內） |

操作實測（與 §4.2 的 C 段同一組，另外在真瀏覽器裡各走一次）全數通過；全程 0 個 page error。

### 4.4 正式站驗證

**尚未執行**，見 §9。

## 5. 對帳數據

| 項目 | 數字 |
|---|---|
| 新增的 `.source.js`／`.css` | 7 個檔、2,584 行 |
| 新檔中寫死的 hex | **0**（全部是 `var(--token, #fallback)`） |
| 新檔中的 emoji／字面 `<svg>` | **0** |
| 新增的圖示（`I` 表） | 0 —— 全部用既有的 |
| 新增的 `source-patches.mjs` `rep()` | 0 |
| 新增的色彩 token | 0 |
| 新增的資料表／欄位／migration | 0 —— 沿用 S2 的 `20261003090000_project_workspace_resources` |
| nested-card 既有基線 | 143 → 143（沒有變多，也沒有清） |
| 示範資料（僅 prototype 模式） | 15 個資料夾、9 個檔、3 期 12 個階段、3 個里程碑、3 個任務、2 場會議、2 個頻道 4 則訊息 |
| database 模式的示範資料 | **0 列**（有檢查項把關） |

## 6. 已知限制與沒做的事

### 6.1 既有問題（與這次改動無關，在未改動的 HEAD 上一樣失敗）

- **`ops:check` 這條鏈在這台機器上跑不完**：六支檢查腳本用了 top-level await，而 tsx 4.22 ＋ Node 24 把 `.ts` 編成 CJS，那裡不支援。本輪用暫時的 `.mts` 副本實際跑過它們取證；腳本本身沒有修。
- `check-operating-canvas` 斷言「新增…應該開啟抽屜」失敗 —— 表單已經搬到彈跳視窗（`form-modal.source.js`），檢查沒跟著改。
- `check-reply-jump` 21/22 —— 來源連結的日期標示。

> **2026-10-04 更正（`PROJMOD-007`）**：以上三點已修，`pnpm ops:check` 全綠。但本節標題「與這次改動無關」只對一半：
> `check-operating-canvas` 在抽屜那一條之後，還有三條斷言是被這次 S3 弄舊的 —— 衝期警示寫死「2 個關鍵節點」（示範資料新增的 `M03 內部驗收` 與 `柏翰案驗收到期` 同在 2026-09-28）、
> 專案模組的「里程碑」獨立分頁、專案總覽的「目標對齊」面板。前兩條是檢查沒跟上版面；第三條代表舊總覽的「目標對齊」面板在新外殼下已經走不到（新總覽只有一列「對齊目標」），
> 與 §1「沒有刪掉任何既有畫面」不完全一致，留給 Owner 在 S4 判斷要不要補回。另外實際有 top-level await 的只有兩支，不是六支。

### 6.2 這一輪做了但有保留的

| # | 限制 | 影響 |
|---|---|---|
| 1 | **沒有做真實的 R2 上傳、歸檔與下載**（交接文件明文禁止對 R2 實際上傳）。上傳只驗到「工作台送出的請求長得對」與 route 的型別 | **你第一次真的上傳檔案時才是第一次端到端**。§8 步驟 4 是這一段 |
| 2 | 階段的狀態（已完成／進行中／逾期）由**起訖日 ＋ 里程碑達成**推導，階段表沒有狀態欄 | 新建的階段一定要有日期；建一期時會依起訖先排一版。「完成這個階段」是把結束日收在昨天 |
| 3 | 四件套的分類依**檔案類型與檔名**判斷（錄音／逐字稿／完整紀錄／摘要） | 檔名不含這些字的檔會落在「其他」。照你既有的命名慣例就會落對 |
| 4 | 會議待辦與「已轉決議」的標記存在 `occasions.prep`（JSON） | 這一欄原本是「事前準備」，目前沒有別的畫面讀它 |
| 5 | 聊天附件的關聯記在訊息的 `meta.assets`（參考碼），`ProjectChatAttachment` 表沒有寫入 | 附件看得到、點得開；但「這個檔被哪則訊息引用」還不能從檔案那一頭反查 |
| 6 | 聊天訊息一次載回最近 1,500 則（全專案合計） | 更早的留在資料庫裡，畫面上看不到 |
| 7 | `Project.lifecycleStage` 沒有顯示、也沒有回填 | 照交接文件的規定：回填之前不得當權威顯示。總覽的「目前階段」是從期與階段推導的 |
| 8 | 資料夾 CRUD 走 `commit()`；`drive` route 的資料夾動詞（建立／改名／搬移／刪除）沒有被介面使用 | 兩條路的規則已對齊到「同層同名、不得比上層寬、搬移重寫子樹」，但 route 那一條多一層專案 capability 檢查，commit 這一條是席位授權 |
| 9 | 檔案上傳、歸檔、下載走 `drive` route，它需要專案綁定到公司 workspace 且你有 ACTIVE membership | **見 §7 第 1 項** |
| 10 | 大檔沒有分段上傳，一律單次 PUT | `08.大考中心` 那支 75.8 MiB 的錄音應該傳得上去（R2 單次 PUT 上限 5 GiB），但沒有續傳 |

### 6.3 沒碰、原本就有的缺口（建議另排）

- **任務的負責人沒有被保存**：`ProjectTask` 沒有負責人欄位，讀取端固定回空字串。審核任務的**審核人**有存；TODO 的負責人重整後會不見。
- **會議的時間字串（`14:00–15:30`）沒有被保存**，只存日期。
- **專案的交付標準（`delivery`）沒有被保存**，讀取端固定回空陣列。
- `refCode` 仍是 `AST-LIB-…`，沒有 `PROJ` token。
- `MANAGER` 目前等同 `EDITOR`。
- nested-card 既有基線 143 筆。

### 6.4 刻意不做

LINE 導入（OD-H）、`0_工作區` 真實檔案遷移、`FileAsset`／`MediaAsset` 收斂、`OperatingThread` 收斂、全文搜尋、音訊轉錄、Office 抽文字。

## 7. 需要你確認的事

1. **正式庫要有 ACTIVE 的公司 workspace ＋ 你的 ACTIVE membership**。沒有的話，資料夾與計劃照常運作（走席位授權），但**上傳會被拒**，訊息是「這個帳號還沒有營運工作區」。
2. `lifecycleStage` 的回填腳本（`scripts/backfill-project-lifecycle-stage.mjs`）已寫好、預設 dry-run，**尚未執行**。要不要跑由你決定。
3. `ui:nested-card:check` 目前沒有併入 `ops:check`（併了那 143 筆存量會讓每次檢查都紅）。照交接文件的預設先不併。

## 8. 整合測試腳本（照著做，約 15 分鐘）

在 `/company/operating` → 左側「專案」→ 選一個你真的在跑的案子。每一步的「應該看到」沒出現就是有問題。

**步驟 1 · 分頁**
分頁列應該是 `總覽 計劃 檔案 會議 對話 財務`。「財務」點進去跟以前一樣。

**步驟 2 · 計劃：分期與審核**
1. 計劃 → 「建立第一期」→ 起訖填這個案子真實的日期 → 階段選「提案→接案→執行→驗收→結案」→ 儲存。
   應該看到：一期底下五個階段，依今天的日期有的已完成、有的進行中。
2. 在「執行」那一列按「＋ 里程碑」→ 名稱 `M01 測試` → 目標日填下週 → 儲存。
3. 在 `M01 測試` 那一列按「＋ 任務」→ 種類選「審核任務」→ 審核人選自己 → 儲存。
4. 按「送審」→「退回」→ 寫一句原因 → 退回。
   應該看到：那一列出現「已退回」與你寫的原因。
5. 按「重新送審」→「通過」。應該看到「已通過」與今天的日期。
6. **重新整理頁面**。應該看到：期、階段、里程碑、任務與「已通過」都還在。← 這一步驗的是讀取路徑

**步驟 3 · 檔案：資料夾**
1. 檔案 → 「啟用並建立預設資料夾」。
   應該看到：左邊一棵樹，有收件匣、`[共用] 共用資料夾`、開案前、專案啟動［正式資料］、里程碑交付、會議、修改需求、素材、(僅內部)。
2. 點「里程碑交付」→「＋ 資料夾」→ 名稱 `20261004_M01_測試` → 用途「里程碑交付」→ 儲存。
3. 「設定」→ 改名為 `20261004_M01_測試交付` → 儲存。
4. 「搬移」→ 搬到「修改需求」→ 儲存。應該看到上方的位置變成 `專案硬碟 › 修改需求 › …`。
5. **重新整理頁面**。樹應該跟剛才一樣。

**步驟 4 · 檔案：上傳與整理**（這一段是第一次端到端）
1. 點「收件匣」→「上傳」→ 選一個小的 PDF 或圖片。
   應該看到：上方出現上傳進度，完成後收件匣表格多一列，分頁「檔案」旁邊出現數字 1。
   若看到「這個帳號還沒有營運工作區」→ §7 第 1 項。
2. 點那一列 → 右側抽屜 →「整理到別的資料夾」選一個資料夾 →「搬到這裡」。
   應該看到：收件匣變空、分頁上的數字消失、那個資料夾多一個檔。
3. 再點開那個檔 →「下載」。應該開出檔案。

**步驟 5 · 會議**
1. 會議 →「新增會議」→ 填名稱、日期、外部參與者、結論、注意事項 → 儲存。
   應該看到：右側四個屬性（參與者／產生時間／結論／注意事項）與四件套 0/4。
2. 「上傳到這場會議」→ 傳一個檔名含「摘要」的檔。應該看到四件套的「摘要」那一格亮起來。
3. 在「會議待辦」輸入一件事按 Enter →「轉任務」→ 儲存。應該看到「已轉任務」；到計劃 › 工作 找得到它。
4. 在結論旁按「轉成決議」→ 建立決議。應該看到「已轉決議」。

**步驟 6 · 對話**
1. 對話 →「開啟專案聊天室」→ 打一句話按 Enter。
2. 滑到那則訊息上，按旗子圖示 → 儲存。應該看到「已轉任務」。
3. 左邊應該有一個灰色、不能按的「LINE 群導入 · 本階段未開放」。

**步驟 7 · 兩個人**
請 Lily 開同一個專案：她應該看得到你剛建的期、資料夾、會議與訊息；在對話裡回一則，你切回這個分頁時應該同步出現。

**有問題時請給我**：是哪一步、畫面右下角的保存狀態寫什麼（「未保存：…」後面那句話）、以及瀏覽器 console 的紅字。

## 9. 正式站驗證

**尚未執行。** 程式已在本機 commit（`d21b8c51a1`），Owner 於 2026-10-04 同意 push 並由 Vercel 套用 migration，
但執行這次工作的環境不允許代為 push 到 main，所以 push 這一步要由 Owner 自己做：

```bash
git push origin main
```

push 之後 Vercel 的 build 會依序跑 `prisma generate` → `prisma migrate deploy` → `next build`。
`migrate deploy` 會對正式庫套用 `20261003090000_project_workspace_resources`（5 張新表、9 個 enum、
6 張既有表加欄，全部 additive）。migration 先套用、新程式才上線；舊程式不讀新欄位，所以中間不會壞。

部署完成後要驗的三件事（§8 的整合測試腳本涵蓋後兩件）：

1. `/company/operating` 打得開、專案模組是六個分頁、console 沒有紅字 —— 這一項驗的是 migration 有套用成功
   （沒套用的話，讀取路徑會查不到新表，工作台會是空的）。
2. §8 步驟 2、3 的「重新整理頁面」之後資料還在 —— 驗的是讀取路徑。
3. §8 步驟 4 的上傳 —— 驗的是 R2 與專案 capability。

在這三件事由真人或瀏覽器在正式站走過之前，**這份報告的結論只到「本機驗證通過」為止**。
