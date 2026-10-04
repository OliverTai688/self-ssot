# UI 現況截圖與缺口盤點 — 公司／營運／專案介面

2026-10-02 · repo `self-stucture-v1` · Subagent A

---

## 0. 本次驗證方式與可信度（先說清楚哪些是看到的、哪些是讀出來的）

**截圖成功。** 76 張，全部是真瀏覽器渲染、`pageerror` 數 0。但不是走 `pnpm dev`，原因與替代路徑如下。

### 0.1 `pnpm dev` 這條路為什麼走不通

在使用者機器（Cowork Linux VM，`aarch64`）上依序撞到四件事：

| # | 錯誤 | 處理 |
|---|---|---|
| 1 | `nohup: failed to run command 'pnpm'` | VM 沒有 pnpm，改用 `./node_modules/.bin/next` |
| 2 | `Failed to load SWC binary for linux/arm64`（`node_modules` 是 macOS 上裝的） | 另裝 `@next/swc-linux-arm64-gnu@16.2.4` 塞進 `next/next-swc-fallback/` |
| 3 | `lightningcss` / `@tailwindcss/oxide` 同樣缺 linux-arm64 native binding | 同法補上 `lightningcss.linux-arm64-gnu.node`、`tailwindcss-oxide.linux-arm64-gnu.node` |
| 4 | **DNS 不通**：`aws-1-ap-southeast-1.pooler.supabase.com: Temporary failure in name resolution` | 無解。VM 的 egress allowlist 不含 Supabase；`cdn.playwright.dev` 也被擋（`403 Connection blocked by network allowlist`），所以 VM 上也裝不了瀏覽器 |

修完 1–3 之後 dev server 確實起得來（`/login` 回 200），但：**(a)** 沒有資料庫，`resolveCurrentUser()` 必然落在 `mock_profile_missing`，`/company/operating` 只會顯示「沒有營運工作台席位」；**(b)** VM 的 `device_bash` 每次呼叫都是獨立 pid namespace，背景 server 在呼叫結束時就被殺掉，跨呼叫無法保持；**(c)** VM 上沒有任何瀏覽器可執行檔。三者任一都讓「dev server + 截圖」這條線斷掉。

`claude/ui-verify-environment-setup.md` 記的那條路（本機 macOS 跑 `start-yuanzhan-ui-preview.mjs` + playwright）在使用者自己的 Mac 上仍然有效，但這個 agent 只能操作 Linux VM 與雲端容器，碰不到 macOS 本機的瀏覽器。

### 0.2 實際採用的路徑：V5 runtime 獨立 harness

`V5Desktop` 其實只做一件事：`mountV5(root, createV5State(...))`（`src/components/yuanzhan/v5/desktop.tsx:19-31`）。runtime 是一支 789 KB 的純 vanilla JS（`src/components/yuanzhan/v5/runtime.js`），不需要 React、不需要 Next、不需要資料庫。所以：

1. 在 VM 上用 esbuild（另裝 linux-arm64 版）把 `runtime.js` + `v5Styles` + `v5ThemeStyles` + `createV5State` bundle 成一支 1.0 MB 的 IIFE：
   `docs/2_agent-input/generated/project-ui-audit/harness/bundle.js`、`harness/index.html`（`?mode=showcase|empty&actor=yz|lily`）
2. 把 harness 搬到雲端容器，用容器內既有的 Chromium 跑 Playwright，viewport **1440×900**（專案分頁另外補 1440×2200 的 `tall-*`）
3. 截圖再寫回 `docs/2_agent-input/generated/project-ui-audit/screenshots/`，並**逐張看過**

**這條路涵蓋的**：`/company/operating` 的全部內部視圖（7 模組 × 全分頁 × showcase/empty/lily 三種狀態）。畫面與正式頁面唯一的差別是少了外層的 `PrototypeDataBanner` 與公司佈景切換（那兩個在 React 那一層，`desktop.tsx:46-58`）。

**這條路不涵蓋的（以下為純程式碼判讀，無截圖）**：`(dashboard)` 群組的所有 Next.js 頁面 —— `/work`、`/work/[projectId]`、`/company`、`/client/[token]`。這些需要 Prisma + Supabase，環境不可及。下表中這些列標註「**（無截圖・程式碼判讀）**」。

---

## 1. 路由全清單與完成度

`find src/app -name "page.tsx"` 共 42 個路由。與公司／營運／專案相關的如下（其餘 research / admin / settings / life / chamber / finance 等不在本次範圍）。

### 1.1 專案相關路由

| 路由 | 檔案位置 | 畫面目的 | 實際渲染內容 | 資料來源 | 完成度 | 具體缺口 |
|---|---|---|---|---|---|---|
| `/work` | `src/app/(dashboard)/work/page.tsx`<br>`work-client.tsx`（36 KB） | 專案索引＋團隊協作 | `AppHeader`＋`InsightRail`（進行中／風險／客戶共享）＋工作區切換＋專案卡清單（狀態篩選・排序）＋焦點專案卡＋團隊協作 Sheet（成員・邀請・撤銷）＋五個 module view：專案／檔案庫／Agent／紀錄／設定 | **真實 DB**：`getWorkspaceProjectIndexForProfile`、`getTeamWorkspaceInvitationIndexForProfile`、`getTeamWorkspaceCreateReadinessForProfile`（`work/page.tsx:86-116`） | 半成品 | 無對話、無里程碑、無檔案樹、無會議；`LibraryModuleView`（`work-client.tsx:211`）只是把 `FileLibraryPage`／`MediaLibraryPage` 以 `mode="module_readonly"` 嵌進來，不能上傳也不能建資料夾 |
| `/work/[projectId]` | `src/app/(dashboard)/work/[projectId]/page.tsx`<br>`project-detail-client.tsx`（39 KB） | 單一專案工作頁 | 5 個 Tab：`pulse`／`work`／`client`／`agent`／`records`（`project-detail-client.tsx:876-892`）。work tab = 任務清單＋筆記時間軸＋交付物樹 | **混合**：`getProjectById`（真 DB，`src/app/actions/work.ts:204`）＋ `getProjectPulse`／`getProjectTimeline`／`getPublicOutputs`／`getPulseSourceMeta`（**全部 mock**，`src/lib/services/mock-ai.service.ts:1-30`，檔頭自承 `TODO: In P2, replace these mock queries`） | 半成品 | **沒有對話、沒有里程碑／階段、沒有 Evidence Repo、沒有會議、沒有檔案上傳**；`agent` 與 `records` tab 是靜態文案 |
| `/company/operating` | `src/app/(operating)/company/operating/page.tsx`（88 行） | 圓展營運工作台（單頁 canvas，內部切換） | 見 §2 | 席位＋設定讀 DB；工作台內容由 `createV5State(mode, seat, settings, dataSource, store)` 決定。`dataSource` 預設 **prototype**（`src/lib/ui-data/yuanzhan/data-source.ts:15`），此時完全記憶體、不保存 | 已完成（UI）／**空殼（持久化）** | 預設不寫資料庫；`desktop.tsx:67-85` 的 `PrototypeDataBanner` 直說「這個工作台目前不保存資料……重新整理、換裝置或重新部署之後都會回到初始狀態」 |
| `/company` | `src/app/(dashboard)/company/page.tsx`（308 行，`"use client"`） | 公司策略 lane | `InsightRail`＋`CompanyThemeSwitcher`＋`DetailDrawer`（目前優先／設定檢查／公司 AI 提案／邊界／稽核）＋「公司 Lane」清單 | **全部是檔案內的 const 陣列**：`exampleCompanyRecords`（:44）、`readinessRows`（:89）、`boundaryRows`（:115）、`exampleAuditRows`（:123）。且 `useIsDemoAccount()` 為 false 時 `companyRecords = []`（:138-141） | **空殼** | 頁內 `readinessRows` 自承「此頁目前是原型操作面，不新增 route handler、Server Action、DB 讀取或寫入」；非 demo 帳號看到的是完全空白的清單 |
| `/client/[token]` | `src/app/client/[token]/page.tsx` | 客戶可見的專案入口 | 唯讀的專案狀態＋交付物＋里程碑卡 | **真實 DB**：`getClientPortalViewByToken`（`src/lib/services/client-portal.service.ts`） | 已完成（唯讀） | 客戶端沒有任何上傳／留言入口；與 `/company/operating` 的專案完全無關聯 |

### 1.2 專案會鏈到的鄰接路由

| 路由 | 檔案 | 狀態 | 與專案的關係 |
|---|---|---|---|
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | 半成品 | owner 總覽 |
| `/ai-input` | `(dashboard)/ai-input/page.tsx` | 半成品（mock 連接器） | **LINE 相關文案都在這裡，且都是假的**（`ai-input-client.tsx:371,430`） |
| `/inbox` | `(dashboard)/inbox/page.tsx` | 半成品 | 與營運工作台的「訊號」收件匣功能重疊 |
| `/finance` | `(dashboard)/finance/page.tsx` | 半成品 | 與營運工作台「金流」模組重疊 |
| `/workflow`、`/agents` | 同上 | 半成品 | 與營運工作台「訊號・Agent 規則」重疊 |
| `/settings/*`（6 頁）、`/admin/*`（7 頁） | 同上 | 半成品 | 與工作台內的設定抽屜重疊 |

---

## 2. `/company/operating` 內部視圖全盤點（有截圖）

這一頁是單一 URL 的 canvas，所有切換都在 Shadow DOM 內。左軌道 7 個模組＋底部 3 個工作區（圓展／文件／介面示例）。

| 模組 | 分頁 | 畫面目的 | 實際渲染內容 | 資料來源 | 完成度 | 截圖 |
|---|---|---|---|---|---|---|
| 日誌 | 今天 | 雙人駕駛艙 | 左欄自己（可編輯 `#doc`）／右欄對方（唯讀）；召喚・引用・附件；今日議題；右側駕駛艙（今日物件・承諾・金流・回覆追蹤・今天誕生的物件・今日脈絡） | `journal`／`dayLogs`／`todayIssues`／`lineComments`／`requests` | 已完成 | `journal-today.png`、`lily-journal-today.png`、`empty-journal-today.png` |
| 日誌 | 回顧 | 往日日誌 | 日期列＋歷史 | 同上 | 已完成 | `journal-review.png` |
| 日誌 | 物件索引 | 全物件表格／時間軸 | 37 物件；facet：Standup 1／1:1 檢核 0／**會議紀錄 0**／回顧 0／研究筆記 0／議題 0／工作 9／金流 12／專案 4／決策 3／事件 8／**檔案 0**；欄位 型別・物件・建立時間・來源日誌・最後更新 | `docObjects`＋各集合 | 已完成 | `journal-object-index.png` |
| 營運 | 今天 | 當日三軌 | 左軌道（專案1／日常節奏4／行政活動3）＋中畫布＋右抽屜 | `rhythms`／`sessions`／`occasions`／`phases`／`milestones` | 已完成 | `operating-today.png` |
| 營運 | 日曆 | 月曆 | 專案（★＝里程碑）／節奏（已跑・虛線未來）／節奏斷層／行政活動；圖例註明「由條文推導，不可編輯或刪除」 | 同上＋`TimeSpine` | 已完成 | `operating-calendar.png` |
| 營運 | 熱力 | 密度視圖 | 週×人熱力 | 同上 | 已完成 | `operating-heatmap.png` |
| 營運 | 甘特 | 專案時程 | W22–W42 條狀圖（3 專案）＋**「日期待補的里程碑」6 筆**，註「填了日期的里程碑才會進 time_spine，也才會出現在日曆上 —— 刻意不猜日期」 | `milestones` | 已完成 | `operating-gantt.png` |
| 營運 | 清單 | 扁平清單 | 三軌合併列表 | 同上 | 已完成 | `operating-list.png` |
| **專案** | **總覽** | 單案駕駛艙 | 目標對齊卡（目標・同目標的案子・本案進行中・里程碑 0/4・3 筆待補日期）／專案切換器（柏翰・AI landoffice SSOT・AI BA SSOT・會計 SSOT）＋新專案＋編輯／進度卡（狀態・OWNER・ISSUE・REPO）／錢卡（未稅收入・成本・可分配毛利・應付獎金）／承諾卡（交付標準）／**本專案的關鍵時間（來自時間線）** | `projects`／`goals`／`milestones`／`commitments`／`txns` | 已完成 | `project-overview.png`、`tall-project-overview.png` |
| **專案** | **工作** | 任務板 | 麵包屑「圓展 Workspace / Q4 目標 / 柏翰 / 工作」＋四種 view（清單・看板・表格・日曆）＋群組／篩選＋`Todo 0 / Doing 0 / Review 0 / Done 3`＋新增工作；註「不填 Estimate，不填 Actual」 | `issues` | 已完成 | `project-work.png`、`tall-project-work.png` |
| **專案** | **對話** | 專案 thread | 左欄 thread 清單（`open 導入設定討論 3 !`）＋`+`；右欄訊息串（Lily/宇星・時間戳）＋**檔案列（群組設定.png / 帳號清單.xlsx / 驗收單.pdf）**＋輸入框（「打 @ 可以提及 LAND-012 這類物件」）＋送出／附檔＋`Close Thread`；提示「Close 時系統會強制要求填五欄，Decision 會進決策帳本、Files 會進 Evidence Repo」 | `threads` | 已完成（原型） | `project-chat.png`、`tall-project-chat.png` |
| **專案** | **Evidence Repo** | 結案資料夾 | 固定目錄樹 `README.md`／`CHANGELOG.md`／`01_contract/`／`02_discovery/`／`03_delivery/`／`04_evidence/`／`05_finance/`／`06_retro/`＋README 內文（可編輯）＋加入檔案；右欄：版本演化（v0.1／v0.5／v0.9 now）、**結案檢查 4/5**、標記 v1.0・凍結、**待歸檔 2 項**（Thread 3 個檔案未歸檔 → 03_delivery；日誌 09/05 交付紀錄 → 04_evidence） | `repos` | 已完成（原型） | `project-evidence-repo.png`、`tall-project-evidence-repo.png` |
| **專案** | **財務** | 單案損益 | 收入・成本・毛利・獎金明細 | `txns`／`projects` | 已完成 | `project-finance.png`、`tall-project-finance.png` |
| **專案** | **里程碑** | 三層階層 | 「里程碑・目標・工作 4 個里程碑」＋新增里程碑；每個里程碑一列（名稱・日期或「日期待補」・契約 §13.2・`0/0`・驗收規則文字）＋`+ 目標`；下方「**尚未掛到目標的工作 3 件**」每列可「補掛目標」；註「遷移時刻意不自動生成假目標來填滿階層」 | `milestones`／`objectives`／`issues` | 已完成 | `project-milestones.png`、`tall-project-milestones.png` |
| 金流 | 收單／帳務（帳本・對帳・月結）／洞察 | 三面金流 | 收單＝每天全員；帳務＝每週記帳（交易內帳表格可行內編輯）；洞察＝每月決策 | `txns`／`intake`／`bank`／`reimb`／`periods` | 已完成 | `cashflow-*.png` |
| 容量 | 週配置／流量指標／預測／出勤紀錄 | 產能 | 每人 Weekly Capacity 百分比條（對照契約 §2.4） | `capacity`／`timesheet` | 已完成 | `capacity-*.png` |
| 承諾 | 內部承諾／外部承諾 | 契約條文→承諾 | 文件清單（勞動契約 v1／Handbook v0.1／職位說明書）＋逐條展開＋「未建立承諾」標記 | `docs`／`commitments` | 已完成 | `commit-*.png` |
| 訊號 | 待處理／已處理／Agent 規則 | 收件匣 | 回覆追蹤（逾期／待我回覆／等對方回覆）＋7 條偵測規則（Issue 逾期、Blocker、Thread 有結論未回寫、Evidence 尚未留下、承諾落後、缺原始憑證、出勤未確認）；註「Handbook 04.4：人保有決定權」 | 衍生自各集合 | 已完成 | `signal-*.png` |
| 工作區 | 文件（抽屜） | 公司文件庫 | 搜尋名稱或標籤／「尚無符合的文件」／`+ 上傳文件`／**「本頁記憶體 · 重整重置」** | `files`（prototype 時記憶體） | 半成品 | `ws-docs.png` |
| 工作區 | 介面示例 | demo | 元件展示 | — | — | （未取得，切換未命中） |

空狀態（`empty-*.png` 共 20 張）全部有正確的 empty panel，例如 `empty-project-overview.png`：「建立第一個專案後，從同一處推進工作、討論與整理 Evidence。＋新專案」（`extensions.source.js:89`）。
員工視角（`lily-*.png` 共 15 張）渲染正常，§18 遮蔽生效。

---

## 3. 五大資源區現況對照

### 3.1 每個專案獨立聊天室

| | 內容 |
|---|---|
| **現況有什麼可複用** | ① **UI 已經存在且完整**：專案·對話分頁（`runtime.js:676` `tabs: ['總覽','工作','對話','Evidence Repo','財務']`，里程碑由 `extensions.source.js` 追加）。左欄多 thread 清單、右欄訊息串、附檔、`Close Thread` 強制填五欄 → Decision 進決策帳本、Files 進 Evidence Repo。見 `tall-project-chat.png`。② **Model 已存在**：`OperatingThread`（`prisma/schema.prisma:1886-1904`）有 `projectId`、`title`、`closed`、`messages Json`、`closeNote Json`、`files String[]`。③ `'threads'` 已在 `WRITE_ENABLED_COLLECTIONS`（`src/lib/ui-data/yuanzhan/operating-commands.ts:107`）。④ 日誌已有成熟的 @ 提及／行內留言／請求回覆追蹤（`lineComments`／`journalComments`／`objectComments`／`requests`）。 |
| **完全缺什麼** | ① `messages` 是一整塊 Json（`[{ w, ts, x }]`），沒有單列 message id → 無法編輯單則、刪除單則、已讀位置、分頁、單則留言、reaction。兩人同時打字會整塊互相覆蓋。② `files String[]` 是字串陣列，**沒有外鍵到 `OperatingAsset`** → 對話裡的檔案進不了物件索引、@ 不到、也不能下載（`tall-project-chat.png` 的三個檔案 chip 是 fixture 字串）。③ 沒有即時傳輸：repo 內沒有 WebSocket／SSE／Realtime 任何一條。④ 沒有未讀計數、沒有通知路由到對話。⑤ **`/work/[projectId]` 完全沒有對話入口** —— 走 Next.js 那一側的人看不到它。 |
| **最接近的現有元件／model** | `OperatingThread` + runtime 對話面板 + `OperatingComment`（`:1780`，已有 `targetType: line/journal/object` 的分型留言） |

### 3.2 雲端硬碟式多層資料夾 CRUD（含上傳待整理收件匣）

| | 內容 |
|---|---|
| **現況有什麼可複用** | ① **上傳管線是真的**：`src/app/api/company/operating/uploads/route.ts` 走 R2 presigned URL（`createUploadUrl`／`createDownloadUrl`），三個動詞 create-pending / finalize / fail，object key 由伺服器決定（`operating/{workspaceId}/asset/{yyyy-mm}/{uuid}{ext}`），ETag 由 HeadObject 寫入，不信任前端。② `OperatingAsset`（`:2244-2288`）設計很完整：`refCode` 全域唯一、`kind`、`space`(team/personal)、`origin`(journal/library/cashflow)、`status`(uploading/ready/failed)、`bornDay`、`extractedText`、`transcript`、`deletedAt`。註解明說「讓一份檔案有唯一的家」。③ `OperatingLibraryFile`（`:2216`）有 `category`／`tags`／`versions[]`。④ `FileAsset`／`MediaAsset`（`:906`／`:928`）＋`FileLibraryPage`／`MediaLibraryPage` 在 Next.js 側已可用。 |
| **完全缺什麼** | ① **沒有任何資料夾 model**。全 schema 2431 行沒有 `parentId` / `folder` / `tree node` 這類結構。② Evidence Repo 的「資料夾」是**寫死的 7 格扁平清單**：`const REPO_DIRS = ['', '01_contract', '02_discovery', '03_delivery', '04_evidence', '05_finance', '06_retro']`（`src/components/yuanzhan/v5/runtime.js:2453`），不能新增、改名、巢狀、移動。`OperatingEvidenceRepo.tree` 是 `[{ f, dir, note, ok }]` 的扁平陣列（`:1906-1925`）。③ 文件庫是 tag 搜尋，不是樹（`ws-docs.png`）。④ **沒有檔案的待整理收件匣**。`OperatingIntakeItem`（`:2032`）只服務金流收單；schema 裡確實有一組通用的 ingestion 模型 `SourceConnection`／`SourceAsset`（`:951`／`:981`，`SourceAssetStatus = INBOX / REVIEWING / READY / REJECTED`），**但營運工作台一行都沒接**。Evidence Repo 右欄那個「待歸檔 2 項」是最接近的概念，但它只處理「已在系統內的物件要搬到哪一格」，不是「剛上傳、還沒分類的檔案」。⑤ 沒有拖拉、批次選取、移動、複製、資料夾權限。⑥ prototype 模式下連上傳都被擋：`uploads/route.ts` 回 `403 source_not_database`「這個環境是預覽模式，檔案不會上傳」。 |
| **最接近的現有元件／model** | `OperatingAsset` + uploads route（檔案本體層已經可用）；`OperatingEvidenceRepo.tree`（最接近的「樹」，但扁平且固定） |

### 3.3 專案工作區：里程碑／階段 + 關鍵時間 + 里程碑底下 TODO／審核任務

| | 內容 |
|---|---|
| **現況有什麼可複用** | ① **這一項完成度最高。** `ProjectPhaseNode`（`:859`，phase/label/startDate/endDate/status）→ `ProjectMilestone`（`:879`，`date` **可為 null＝日期待補**、`acceptance`、`derivedFrom`、`remind`、`bonusAmount`）→ `ProjectObjective`（`:1579`）三層外鍵齊備。② UI 已經把這三層畫出來：專案·里程碑分頁（`tall-project-milestones.png`）＋「尚未掛到目標的工作」補掛機制。③ 關鍵時間：專案總覽有「本專案的關鍵時間（來自時間線）」卡；營運·甘特有「日期待補的里程碑」6 筆待補清單（`operating-gantt.png`）；`TimeSpine`（`:2409`）是三軌匯流的扁平索引，由 `operating-spine.service.ts` 單一 writer 維護。④ 任務狀態已有 `Todo / Doing / Review / Done` 四格（`project-work.png`），`Review` 這一格就是審核的落點。⑤ `'phases'`／`'milestones'`／`'objectives'`／`'issues'` 都在 `WRITE_ENABLED_COLLECTIONS`。 |
| **完全缺什麼** | ① **階段（phase）在 UI 上沒有操作面**。`ProjectPhaseNode` 存在、甘特圖用得到，但專案模組裡沒有任何地方能新增／編輯階段 —— 里程碑分頁直接從里程碑開始。② **審核任務不是一種任務型別，只是一個看板欄位**。沒有審核人欄位、沒有審核結果（通過／退回）、沒有退回理由、沒有審核紀錄。`ProjectMilestone.acceptance` 只是一段自由文字。③ 里程碑底下掛的是「目標」再掛「工作」，而使用者要的是「里程碑→TODO」兩層；目前 `0/0` 的計數要先建目標才動得了。④ **`/work/[projectId]` 完全沒有里程碑／階段**（`project-detail-client.tsx:876-892` 只有 pulse/work/client/agent/records），`ProjectMilestone` 在 Next.js 那一側沒有任何 UI。⑤ 關鍵時間只有「里程碑日期」一種來源，沒有獨立的「關鍵日期／截止日」物件。 |
| **最接近的現有元件／model** | `ProjectPhaseNode` → `ProjectMilestone` → `ProjectObjective` → `issues`，以及 `TimeSpine` |

### 3.4 LINE 群導入（多個 LINE 聊天室綁定到一個專案）

| | 內容 |
|---|---|
| **現況有什麼可複用** | ① `SourceProvider` enum 有 `LINE`（`prisma/schema.prisma:217-230`，與 `GOOGLE_DRIVE`／`GMAIL`／`TELEGRAM` 並列）。② `SourceConnection`（`:951`，含 `status`／`inputMode`／`scopeSummary`／`secretRef`）＋`SourceAsset`（`:981`，`kind` 含 `MESSAGE`／`THREAD`，`status` 含 `INBOX`）是一組可用的通用攝取骨架。③ `AIWorkflowRun`／`AIWorkItem`／`DataUnitProposal`／`ModuleWriteIntent`（`:1015`–`:1183`）是「外部資料 → 提案 → 人工核准 → 寫入模組」的完整管線型別。④ `OperatingAsset` 可以收圖片。 |
| **完全缺什麼** | **幾乎全部。** ① 沒有 webhook：`src/app/api` 只有 5 支 route，沒有任何 `/api/line/*`。② 沒有 channel／group 綁定 model —— 「多個 LINE 群 ↔ 一個專案」這個多對一關聯在 schema 裡不存在。③ 沒有 LINE SDK 依賴（`package.json` 沒有 `@line/*`）。④ 沒有訊息→專案的路由規則、沒有圖片下載管線、沒有去重、沒有成員對應。⑤ `/ai-input` 頁面上那些 LINE 字樣全是**寫死的示範文案**：`ai-input-client.tsx:371`「適合搭配 LINE 群組、聯絡人、會議紀錄」、`:430`「LINE 群組出現私人電話」，以及 `ai-input-readiness.service.ts:123-139` 的 `source: "LINE 商會群組訊息"`、`missingPermissions: "LINE 使用者授權、通訊寫入權限、保留政策確認"`。該 service 自己在 `:576` 寫著 formal 模式下這些 connector 列必須是空的。 |
| **最接近的現有元件／model** | `SourceConnection` + `SourceAsset(INBOX)` + `DataUnitProposal`（型別對，但零實作） |

### 3.5 會議資料區（時間序 / 一資料夾＝一場會議 / 會議屬性 / 多種材料）

| | 內容 |
|---|---|
| **現況有什麼可複用** | ① **`Occasion`（`prisma/schema.prisma:1650-1684`）已經是一個相當完整的會議 model**：`title`、`category`、`onDate`／`endOn`／`startsAt`／`endsAt`、**`place`**、**`actorIds String[]`（內部參與者）**、**`externalGuests`（外部與會者）**、`projectId`（**已經可以掛到專案**）、**`prep Json`（`[{ t, done, dueOn?, taskId? }]` 會前準備）**、**`recap`（結論）**、`derivedFrom`、`remind`、`createdAt`（產生時間）。② **`OperatingMedia`（`:1686-1709`）就是會議材料表**：`kind`／`url`／`filename`／`transcript`，外鍵 `occasionId`（也可掛 `sessionId`）。一場會議可以掛多筆、多種。③ 日曆上已經看得到會議：`operating-calendar.png` 9/18 的「月營運會議」。④ `OperatingDocObject`（`:2290`）註解明寫「日誌裡召喚出來的結構化文件物件（**會議紀錄**、訪談稿之類）」，物件索引也已經有「會議紀錄」這個 facet（`journal-object-index.png`）。⑤ `RhythmSession`（`:1629`）處理週期性會議（1:1、週會）的實例。 |
| **完全缺什麼** | ① **沒有「會議」這個獨立的操作面**。會議只以日曆上一個色塊的形式存在，點不進一個「這場會議的頁面」。沒有時間序的會議清單視圖。② **沒有「一個資料夾＝一場會議」的容器 UI**，也沒有對應的檔案結構 —— `OperatingMedia.url` 是一個裸字串，**不是 `OperatingAsset` 的外鍵**，所以會議材料不走 R2 presigned 管線、不進物件索引、@ 不到、沒有版本。③ **「注意事項」欄位不存在**。`recap`（結論）有，`prep`（會前準備）有，但「注意事項」沒有對應欄位。④ `OperatingDocObject`（會議紀錄）與 `Occasion` **沒有外鍵** —— 會議紀錄和會議是兩個互不相識的物件；物件索引裡「會議紀錄 0 筆」也印證這條路從沒被走過。⑤ `'media'` 不在 `WRITE_ENABLED_COLLECTIONS`（`operating-commands.ts:89-129`）—— 會議材料目前根本不會被保存。 |
| **最接近的現有元件／model** | `Occasion` + `OperatingMedia`（屬性面已覆蓋 ~70%，缺的是檔案容器、時間序視圖、與 asset/docObject 的連結） |

---

## 4. 其他必須標記的問題

### 4.1 導航結構問題

- **「專案」有兩個入口，功能完全不同、資料完全不通。** 側邊欄同時有 `/work`（`app-sidebar.tsx:128`）與 `/company/operating`（`:142`）。前者是 DB 真資料但功能貧乏；後者功能完整但預設不保存。使用者要的五大資源全部落在後者。
- **`/company` 與 `/company/operating` 是兩個不相干的東西**，卻共用一段路徑前綴，而且 `/company`（`:148`）是空殼。
- 營運工作台在 `(operating)` route group，有自己的 layout，**不吃 `(dashboard)/layout.tsx` 的側邊欄** —— 進到工作台之後沒有回 Personal OS 的導航（只有無席位時那頁才有 `/ai-input` 連結）。

### 4.2 資訊架構重複或衝突

| 概念 | 在 `/company/operating` | 在 `(dashboard)` | 衝突 |
|---|---|---|---|
| 收件匣／訊號 | 訊號模組（7 條偵測規則） | `/inbox`、`/workflow` | 兩套 |
| 金流 | 金流模組（收單・帳務・洞察） | `/finance` | 兩套 |
| 檔案庫 | 文件工作區（記憶體） | `/work` → 檔案庫 module view（`FileLibraryPage` module_readonly） | 兩套，互不可見 |
| Agent | 訊號·Agent 規則 | `/agents`、`/work` → Agent module view | 三套 |
| 設定 | 工作台設定抽屜（`operatingSettingsCatalog`） | `/settings/*` 六頁 | 兩套 |
| 專案 | 專案模組（6 分頁） | `/work`、`/work/[projectId]` | 兩套 |

### 4.3 空殼頁面

| 位置 | 證據 |
|---|---|
| `/company` 整頁 | `company/page.tsx:89-113` 的 `readinessRows` 自承「正式資料路徑：尚未接上／此頁目前是原型操作面，不新增 route handler、Server Action、DB 讀取或寫入」 |
| `/work` → Agent module view | `work-client.tsx:260-307`，內容全部來自 `workCopy.agent.cards`（i18n 文案） |
| `/work` → 紀錄 module view | `work-client.tsx:310-343`，分頁按鈕 **`disabled`**（`:319`），列資料來自 `workCopy.records.rows` |
| `/work/[projectId]` → agent / records tab | `project-detail-client.tsx:559`／`:683`，靜態文案 |
| 文件工作區 | 畫面上自己標「本頁記憶體 · 重整重置」（`ws-docs.png`） |

### 4.4 mock 資料殘留

| 位置 | 內容 |
|---|---|
| `src/lib/services/mock-ai.service.ts` | 整支是 mock，被 `/work/[projectId]/page.tsx:17-20` 直接使用（pulseCard / publicOutput / pulseMeta / timeline）。檔頭 `TODO: In P2, replace these mock queries with real queries` |
| `src/lib/mock/ai.ts`、`src/lib/mock/work.ts` | mock 資料源 |
| `src/app/(dashboard)/company/page.tsx:44-130` | 四組 const 陣列假裝成公司資料 |
| `src/lib/services/ai-input-readiness.service.ts:123-139` | 假的 LINE 連接器列 |
| V5 工作台 fixture | `createV5State` 在 `mode='showcase'` 時載入 `referenceSeed()`（`v5-state.ts:88`）；`dataSource` 預設 prototype，所以**正式環境打開就是展示資料**，除非同時設 `PERSONAL_OS_UI_DATA_MODE=empty` 與 `PERSONAL_OS_OPERATING_DATA_SOURCE=database` |

### 4.5 專案與其他模組的斷鏈

| 斷鏈 | 說明 |
|---|---|
| 專案 ↔ 金流 | 營運工作台內部有通（專案·財務讀 `txns`），但 `/work/[projectId]` 完全看不到任何金額 |
| 專案 ↔ 合約 | `OperatingContract`／`OperatingContractTerm`（`:2094`／`:2126`）存在，承諾模組逐條展開條文，但**沒有 `projectId` 外鍵**，專案頁上的「契約 §13.2」是文字標籤不是連結 |
| 專案 ↔ 客戶 | `OperatingProjectProfile.client` 是一個 **String**（`:1714`），沒有 Client model、沒有客戶頁、沒有「這個客戶的所有專案」 |
| 專案 ↔ journal | 工作台內有通（日誌召喚專案物件、物件索引標來源日誌行）；Next.js 側沒有 journal |
| 專案 ↔ Client Portal | `/client/[token]` 讀的是 `Project`／`ProjectDeliverable`／`ProjectMilestone`（Work 模組），**和工作台的專案模組是同一張 Project 表但兩套側欄資料**，工作台的 Evidence Repo／對話／承諾都到不了客戶端 |
| 檔案 ↔ 一切 | `OperatingAsset` 有 `workbenchRef`，但 `OperatingThread.files` 是 `String[]`、`OperatingEvidenceRepo.tree` 是 Json、`OperatingMedia.url` 是字串 —— **三個最需要檔案的地方都沒有接上那張「檔案唯一的家」** |

---

## 5. 最關鍵的 5 個缺口（排序）

### ① 專案有兩套實作，使用者要的五大資源全部落在「預設不保存」的那一套
`/company/operating` 的專案模組已經有對話、Evidence Repo、里程碑三層、財務 —— 這正是需求 1、2、3 的雛形。但 `DEFAULT_OPERATING_DATA_SOURCE = "prototype"`（`data-source.ts:15`），打開就是展示資料、輸入即丟。而 `/work/[projectId]` 雖然寫真資料庫，卻連對話和里程碑都沒有。**任何一項新功能做之前，必須先決定它長在哪一側**，否則會做出第三套。
→ 影響需求 1、2、3、5。

### ② 沒有資料夾 model（`parentId` 在 2431 行 schema 裡一次都沒出現）
需求 2（雲端硬碟式多層資料夾）與需求 5（一個資料夾＝一場會議）都卡死在這一點。現有最接近的 Evidence Repo 是 `runtime.js:2453` 寫死的 7 格扁平目錄。這是純粹的新建工作，沒有可改造的東西。
→ 影響需求 2、5。

### ③ `OperatingThread.messages` 是一整塊 Json，撐不起聊天室
`prisma/schema.prisma:1893` `messages Json @default("[]")`。沒有單則 id 就沒有編輯／刪除／已讀／reaction／分頁，兩人同時寫會整塊覆蓋。而且 `files String[]`（`:1895`）沒接 `OperatingAsset`，對話裡的檔案是死的。要做「每個專案獨立聊天室」，第一步是把 messages 拆成獨立表。
→ 影響需求 1、4（LINE 訊息最終要落在某個 message 表）。

### ④ LINE 整合從 0 開始 —— 現在只有一個 enum 值
`SourceProvider.LINE` 是全 repo 唯一真實的 LINE 痕跡。沒有 webhook route、沒有 SDK、沒有群組綁定表、沒有訊息映射。`/ai-input` 上看到的 LINE 全是假的。而需求 4 要的「多個 LINE 群 → 一個專案」是一張多對一關聯表 + 一條 webhook + 一個訊息落地管線，三樣都要新建。
→ 影響需求 4。

### ⑤ `Occasion` 已經是 70% 的會議 model，卻沒有操作面、也沒接上檔案
`Occasion`（`:1650`）有參與者、外部來賓、地點、起訖時間、`prep[]`、`recap`、`projectId`；`OperatingMedia`（`:1686`）有 `occasionId`。這是五項需求裡**改造成本最低、現成基礎最好**的一項。但現在：會議只是日曆上一個色塊、點不進去；`OperatingMedia.url` 是裸字串不是 asset 外鍵；`'media'` 不在可寫集合裡；「注意事項」沒有欄位；「會議紀錄」docObject 與 Occasion 沒有關聯（物件索引顯示 0 筆）。
→ 影響需求 5；補完之後也順帶補上需求 2 的一部分（會議材料需要檔案容器）。

---

## 附錄 A：截圖索引

全部在 `docs/2_agent-input/generated/project-ui-audit/screenshots/`，1440×900（`tall-*` 為 1440×2200），`pageerror` 0。

| 前綴 | 張數 | 內容 |
|---|---|---|
| （無） | 29 | showcase · 宇星（owner）視角，7 模組全分頁 |
| `tall-project-*` | 6 | 專案 6 分頁的加高版（看得到完整內容） |
| `empty-*` | 20 | empty 模式（空資料庫的真實樣子） |
| `lily-*` | 15 | 員工視角（§18 遮蔽驗證） |
| `ws-docs` | 1 | 公司文件庫抽屜 |

重點張數：`tall-project-overview.png`、`tall-project-chat.png`、`tall-project-evidence-repo.png`、`tall-project-milestones.png`、`tall-project-work.png`、`operating-gantt.png`、`operating-calendar.png`、`journal-object-index.png`、`ws-docs.png`。

## 附錄 B：重現 harness 的步驟

```bash
# 1) 產生 bundle（需要與執行平台相符的 esbuild）
cat > /tmp/entry.ts <<'TS'
import { mountV5 } from '@/components/yuanzhan/v5/runtime'
import { v5Styles } from '@/components/yuanzhan/v5/styles'
import { v5ThemeStyles } from '@/components/yuanzhan/v5/theme-styles'
import { createV5State } from '@/lib/ui-data/yuanzhan/v5-state'
window.__mountHarness = (mode, actor) => {
  const el = document.getElementById('host')
  const shadow = el.shadowRoot ?? el.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = `${v5Styles}\n${v5ThemeStyles}`
  const root = document.createElement('div')
  root.className = 'v5-root'; root.dataset.mode = mode
  shadow.replaceChildren(style, root)
  const seat = { email: 'x@y.z', actor, role: actor === 'yz' ? 'owner' : 'member', canSwitchActor: true }
  mountV5(root, createV5State(mode, seat, null, 'prototype', null))
}
TS
esbuild /tmp/entry.ts --bundle --format=iife --outfile=harness/bundle.js --tsconfig=tsconfig.json

# 2) 靜態伺服 harness/，Playwright 連 http://127.0.0.1:PORT/index.html?mode=showcase&actor=yz
#    點按 Shadow DOM 內的 button（文字比對）即可切模組與分頁
```

不需要資料庫、不需要 Next.js、不需要登入。缺點是少了外層 React 的預覽橫幅與公司佈景切換。
