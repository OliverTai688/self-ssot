# 提案 C：雙欄資源樹（Resource Tree）

- 日期：2026-10-03
- 階段：`PLN-075` S1 三提案之一（A 分頁延伸 ／ B 時間流主軸 ／ **C 雙欄資源樹**）
- 原型：`project-module-proposal-C-resourcetree.html`（repo 根，單一自包含檔案，直接用瀏覽器開）
- 依據：`PLN-075`（OD-A～OD-H 定案）、`RES-033`（X1／X2／X3 裁決）、
  `DESIGN_project-five-resource-architecture.md`（D-C／D-D／D-E）、
  `MIG_workspace-inventory-and-migration-plan.md`（§1.5 de-facto 慣例、§2.3 資料模型）
- 狀態：**提案。本輪未改任何 runtime 程式碼。**

---

## 0. 一句話

**左側一棵以 `parentId` 為骨幹的統一資源樹，右側內容區。**
雲端硬碟資料夾與會議資料夾是同一棵樹的不同 `kind`；收件匣是樹上一個真的資料夾；
Owner 現有的 `[共用]`／`YYYYMMDD_Mnn_`／會議四件套慣例一比一照搬進系統。

這是三案裡最貼近 Owner 原話「有一個雲端硬碟的介面讓我可以整理專案資料」的一案，
也是唯一真正解決需求②（多層資料夾 CRUD、分散上傳先入某一資料夾等待整理）
與需求⑤（資料夾＝會議、屬性跟著資料夾）的形狀。

---

## 1. 統一樹的節點型別與 `kind` / `role` 設計

### 1.1 左欄分三段，而不是一段

這是 C 最重要的版面決定。一棵樹不代表一段清單：

| 段 | 內容 | 符號 | 它是什麼 |
|---|---|---|---|
| **掛載點** | 專案聊天室、里程碑規劃、LINE 群導入（停用） | `●`／`◆`／`▣` | **不是資料夾**。點下去右欄換成另一種版面 |
| **檔案** | 收件匣 ＋ 整棵 `ProjectFolder` 樹 | `▸` 資料夾圖示 | 真的 `parentId` 樹，CRUD 都發生在這裡 |
| **視圖** | 會議（時間序）、客戶可見的全部、敏感與可見性、內容重複組 | `⊙` | **同一棵樹的篩選**，不是第四個儲存體 |

三段的符號系統刻意不同。使用者不需要讀文件就看得出「這一列點下去是換資料夾，那一列點下去是換版面」。

### 1.2 節點型別

```
t = 'mount'   掛載點（聊天室／規劃／LINE）—— 不進 ProjectFolder 表
t = 'folder'  ProjectFolder，kind 決定行為與右欄版面
t = 'file'    OperatingAsset（folderId 指向所在資料夾）—— 樹上不畫，在右欄
t = 'view'    查詢條件，不落表
```

**樹上只畫資料夾，檔案一律在右欄。** 理由：51 個資料夾可以全部一次撈完並畫在左欄，
202 個檔案不行；而且混畫之後「拖放目標」與「導覽目標」會變成同一類視覺元素，拖錯的機率大增。

### 1.3 `ProjectFolderKind`

沿用 `DESIGN` §5.2 的 enum，並補上 Owner 既有慣例對應的幾個值：

| kind | 語意 | Owner 現場對應 | 規則 |
|---|---|---|---|
| `ROOT` | 硬碟根 | 專案資料夾本身 | 每專案恰好一個，`isSystem` |
| `INBOX` | 收件匣 | （新增，現場沒有） | 每專案恰好一個，`isSystem`，不可改名／刪除／搬移 |
| `GENERIC` | 一般資料夾 | `專案啟動［正式資料］`、`會議`、`資料區` | 預設 |
| `PROPOSAL` | 提案 | `開案前` | — |
| `CONTRACT` | 合約 | 回簽的需求書／報價單 | **禁止**被設為 `client_visible` |
| `MILESTONE` | 里程碑交付 | `20260411_M04_網站資源一版` | 可被 `ProjectMilestone.folderId` 綁定 |
| `MEETING` | 一場會議 | `20260717 第一次需求對談` | 1:1 側表 `ProjectMeeting` |
| `SHARED` | 共用（對客戶） | `[共用] 官網專案＿共好玟化 X 圓展`、`…共用資料夾` | `visibility = client_visible` |
| `INTERNAL` | 內部不得提供客戶 | `(僅內部)`、`證書們（如果有想放網站上）` | **禁止** `client_visible` |
| `REVISION` | 修改需求 | `修改需求`、`第二次修改需求` | 二期入口；可綁 `ProjectPhaseCycle` |
| `MATERIAL` | 素材 | `網站素材庫`、`圓展商城資料區域` | — |
| `FINANCE` | 財務 | `專案財務.xlsx` 所在層 | 預設 `internal` |
| `CHAT_DROP` | 聊天室附件落點 | （新增） | `isSystem`；P0 可先不建，附件直接落 `INBOX` |
| `LINE_DROP` | LINE 媒體落點 | （新增，停用） | 本階段只是灰階佔位 |

> `role` 與 `kind` 是同一件事的兩個名字。`MIG` §2.3 的 `role: String`（字串）與 `DESIGN` §5.2 的
> `ProjectFolderKind`（enum）必須二選一。**建議採 enum**：`check-migration-coverage.mjs` 會逐 enum 比對，
> enum 讓「哪些 kind 禁止 client_visible」這條規則在 schema 層就看得見；
> 代價是新增一種資料夾要 migration，而 `CUSTOM`／`GENERIC` 已經涵蓋 99% 的新需求。

### 1.4 可見性是三級，不是兩級

原型右欄每一列檔案都說得出它屬於哪一級（約束#5）：

| 級 | 徽章 | 判定來源 | 例 |
|---|---|---|---|
| 0 | `◉ 客戶可見` | 所在資料夾 `visibility = client_visible` | `[共用]/01.確認文案/*.docx` |
| 1 | `🔒 內部 · 禁對客戶` | `sens ≥ 1`，或所在資料夾 kind ∈ {CONTRACT, INTERNAL} | 身分證正反面、回簽合約、報價單、`證書們/` 40+ 份第三方證照、逐字稿 |
| 2 | `⛔ 最高敏感 · 不建索引` | 逐檔標記 | `05/商城專案資訊.docx`（明文帳號密碼） |

第三級不是潔癖：`MIG` §4.5 已經指出，若那份 docx 建了 `extractedText`，
**任何有席位的人搜「密碼」就看得到**。所以「不建全文索引」必須是一個可以掛在單一檔案上的旗標，
而不是靠資料夾權限。

**可見性的來源是資料夾，不是逐檔打勾。** 逐檔打勾遲早會漏一個。
原型裡把一個 `sens ≥ 1` 的檔案拖進共用資料夾時，搬移會成功但可見性維持 `internal`，並說明原因 ——
這就是「資料夾的 `visibility` 是授權的來源，不是標籤」的具體行為。

---

## 2. 聊天室與里程碑規劃這兩個非檔案資源怎麼安身

這是 C 必須正面回答的問題。答案是：**它們是掛載點（mount），不是資料夾；但各自在檔案樹裡有一個真實落點。**

### 2.1 為什麼不是資料夾

| 若硬塞成資料夾 | 會發生什麼 |
|---|---|
| 聊天室 = 一個 `kind=CHAT` 的資料夾 | 它沒有 `children`。要表達「訊息」就得在 `ProjectFolder` 上加 `messages`，或讓訊息假裝成檔案。這正是 `DESIGN` D-C 選項 C 被否決的同一條理由：**99% 的資料夾不需要那些欄位** |
| 里程碑規劃 = 一個 `kind=PLAN` 的資料夾 | 它底下是 `期 → 階段 → 里程碑 → 任務`，一棵語意完全不同的樹。兩棵樹共用一張表，`parentId` 就有兩種意思，任何一支遞迴查詢都要先問「這是哪一種樹」 |

### 2.2 為什麼仍然在同一棵樹的畫面裡

因為 Owner 要的是「一個地方看完這個專案」。把聊天室丟到另一個分頁，
使用者就得在「看檔案」與「看對話」之間切換 —— 而這兩件事在現場是同一件事的兩面
（`01` 的分期付款是在 LINE 上談定的，不在任何文件裡）。

### 2.3 兩個接點，都是連結不是包含

**聊天室 → 收件匣。**
貼在聊天室的附件沒有指定資料夾，所以走和其他三道門（拖放／⌘V／手機拍照）**完全一樣**的路徑：
`folderId = INBOX`、`filedAt = null`、`origin = 'chat'`。
不另造一條聊天上傳路由（`PLN-064` Stage 4 明文禁止為某個入口另寫一套上傳）。
日後要分流，才在根層加 `CHAT_DROP` 系統資料夾 —— **P0 不需要**。

**里程碑 → 交付夾。**
`ProjectMilestone.folderId?`（可空）讓 `20260411_M04_網站資源一版/` 成為 M04 的交付夾。
綁定是**連結不是包含**：資料夾仍在 `專案啟動［正式資料］` 底下，只是在樹上多一個 `M04` 徽章，
在規劃版面多一條 `⟶ 交付夾` 的跳轉。

為什麼不是包含：同一個資料夾可能同時是「M04 的交付」與「對客戶共用的那一份」的來源；
包含關係只能有一個父親，連結可以有很多條。而 Owner 的現場資料正好就是這個樣子
（6 組 12 檔在共用夾與里程碑夾各一份）。

### 2.4 LINE 的位置

`LINE 群導入` 也是掛載點，但**停用狀態**：灰階、不可選、沒有任何開關。
點它只會換到一個說明版面。另外在每個專案根層放一個灰階的 `LINE 群媒體（未啟用）`
資料夾節點（`kind = LINE_DROP`），它現在只是佔位 ——
等 P2 真的接上時，LINE 媒體落進它，而不是另造一棵樹。

這是「一棵樹」最實際的回報：**第四道門加進來時，移動／改名／預覽／授權／孤兒清理一行都不用重寫。**

---

## 3. 收件匣與整理流程（約束#3）

### 3.1 它是真資料夾

`kind = 'INBOX'`、`isSystem = true`、每專案恰好一個、不可改名／刪除／搬移。
**不是另一個分頁、不是 `folderId IS NULL` 的虛擬視圖、不是 `filingState` 旗標。**

採 A 案的三個理由（`DESIGN` D-E 已論證，此處只記結論）：
每個 asset 永遠恰好屬於一個 `folderId` → listing 查詢只有一種形狀、麵包屑永遠畫得出來、
拖放目標天然存在。「待整理 N」＝ `count(folderId = inboxId)`。

### 3.2 四道門一個落點

| 門 | 落點 | `filedAt` |
|---|---|---|
| 桌機拖放到硬碟某一層的「上傳」 | 該資料夾 | `now()` |
| 手機拍照／相簿／檔案（欄頭「附件」） | `INBOX` | `null` |
| ⌘V 貼上截圖 | `INBOX` | `null`（自動命名 `截圖 MM-DD HH:mm.png`） |
| 聊天室貼附件、會議錄音直傳、未來的 LINE 媒體 | `INBOX` | `null` |

### 3.3 整理 = 一次 `UPDATE folderId`

原型走得完整條流程：

1. 按左下「↑ 上傳到收件匣」→ 收件匣多一列，徽章從「待整理 3」變「待整理 4」。
2. 在收件匣勾選檔案 → 出現「搬移到…」工具列 → 對話框列出整棵樹 → 選目標 → 搬移。
3. 或直接把右欄的檔案列**拖到左欄任一資料夾**（HTML5 drag/drop，已實作；拖放不成立時仍有選單）。
4. 或用「建議歸檔」：依 Owner 的檔名慣例推測目標（`修改需求`→REVISION、`YYYYMMDD_Mnn_`→里程碑交付、
   `報價／提案`→PROPOSAL、影像→MATERIAL），但**一律要人按下「採用」才生效**。

每一次搬移的 toast 都明說同一件事：
> 只更新 `folderId`，R2 的 `objectKey` 一個字都沒變。

這不是文案，是 `MIG` §2.2 那個決定（key 不含路徑與檔名）換來的回報，值得在介面上一直提醒 ——
否則使用者會以為「整理」是昂貴的操作而不敢動。

### 3.4 它要取代的是什麼

v5 現況的 Evidence Repo 是一個**扁平的 7 格固定目錄**
（`01_contract/ 02_discovery/ 03_delivery/ 04_evidence/ 05_finance/ 06_retro/` ＋ 兩個根檔），
加不了第八格、改不了名字、放不進第二層，而且它底下的「檔案」其實是寫死的字串。
Owner 現場最深 5 層、51 個資料夾、名字是 `[共用] 官網專案＿共好玟化 X 圓展` 這種 ——
**7 格裝不下，也不該硬裝。**

---

## 4. 會議資料夾的屬性呈現（約束#4）

### 4.1 資料形狀

一場會議 ＝ 一個 `kind = MEETING` 的 `ProjectFolder` ＋ 一張以 `folderId` 為主鍵的 1:1 側表。

依 OD-D 定案：**擴充 `Occasion` ＋ `folderId?`，不另開 `ProjectMeeting`。**
語意是「資料夾 ←→ `Occasion` 1:1 連結」，而不是「資料夾就是會議」。
落差在於：補記一場沒排進日曆的會議，也會生出一列 `Occasion`。
這個落差可以接受（`Occasion.category = CLIENT_MEETING` 本來就涵蓋它），
且換來「行事曆那一側、`TimeSpine`、`workbenchRef`、`OperatingMedia.occasionId` 四個既有依賴不用改」。

`Occasion` 需要補的欄位：`folderId?`、「注意事項」（`cautions`）、`actionItems Json`。
`actorIds[] / externalGuests / recap / prep` 已存在，直接用。

### 4.2 右欄版面：屬性與材料同時在同一個畫面

選取一個會議資料夾，右欄是三塊，不需捲動就看得到前兩塊：

**① 會議屬性框**（Owner 要的「小框框」），六格，前四格是硬性要求：

| 屬性 | 來源欄位 | 空值行為 |
|---|---|---|
| 參與者 | `actorIds[]`（內部頭像膠囊）＋ `externalGuests`（外部，橘色膠囊） | 顯示「—」 |
| 產生時間 | `heldAt`（排序鍵） | 顯示「—」 |
| 結論 | `recap` | 顯示「—」 |
| 注意事項 | `cautions`（新增） | 顯示「—」 |
| 地點 | `place` | 顯示「—」 |
| 形式 | `modality` 線上／實體／混合 | 預設實體 |

**每一格空著都顯示「—」而不是隱藏那一列** —— 否則使用者不知道這裡可以填。
每一格 inline 可編輯，沿用 `claude/table-inline-edit-and-filing-preview-implemented.md` 已落地的
`tcCell`／`tcReg` 註冊制（新增一種 `kind: 'meeting'` 的註冊，不掃描所有表格）。

**② 會議待辦** —— `actionItems`，每一條可一鍵升級成 `ProjectTask`（三條升級路徑之一）；
底部兩顆按鈕：「結論 → 決議（`OperatingDecision`）」、「連結到行事曆 `Occasion`」。

**③ 夾內材料** —— 就是一般的檔案表（同 drive，`folderId` 固定），
但表頭多一條**四件套完整度**：`✓錄音 · ✓逐字稿 · ✓完整紀錄 · ✓摘要`。

### 4.3 為什麼四件套是提示而不是強制結構

`10.AI SSOT 會計與工商登記` 是整份 `0_工作區` 裡**唯一真的做出四件套的一場會議**
（還多一份決策分析，共五件）。其餘專案的會議檔是散的，
例如 `08` 只有一支 75.8 MiB 的 mp3，連結論都還沒有。

如果把四件套做成固定的四個子資料夾，`08` 那場會議就會有三個空資料夾 ——
而使用者會為了「填滿」去搬一些不該搬的東西進去。
所以四件套是**完整度提示**（`four` 標記），不是結構：散的與成套的用同一種形狀表達，
不需要先補齊才能入系統。

### 4.4 會議區是視圖，不是第二個儲存體

左欄第三段的「會議（時間序）」＝ `kind = 'MEETING' ORDER BY heldAt DESC`。
會議夾可以被搬到樹上任何地方（例如整理到「二期／交付」底下），它仍然會出現在這個時間序裡。
這正是「兩棵樹」方案做不到的：跨樹移動只能靠複製或軟連結，兩者都讓「這個檔在哪裡」出現兩個答案。

---

## 5. 期／階段／里程碑／任務（約束#2）

### 5.1 四層，不退化成平面 enum

`期 (ProjectPhaseCycle) → 階段 (ProjectPhaseNode) → 里程碑 (ProjectMilestone) → 任務 (ProjectTask)`，
中間可選 `目標 (ProjectObjective)`。

原型在**兩個地方**畫出「期」：專案根節點的總覽（期 ribbon，第一眼就看得到），
以及「里程碑規劃」掛載點的完整版。

`01.共好玟化` 的實際形狀：

```
期 1（一期）   提案 ✓ → 接案（合約）✓ → 執行（一期）✓ → 驗收（一期）● 進行中
期 2（官網第二版，待啟動）  追加合約 → 執行（二期）→ 驗收（二期）→ 結案
```

`03.幸福文齡` 的期 2 已經在執行中，而且**追加合約那一格標紅**（二期報價與金額只找到一期規格書）——
這就是「期」這一層的實際價值：沒有它，「二期沒有合約」這件事在畫面上看不出來。

### 5.2 加三期是插一列，不是 migration

`ProjectPhaseCycle{ordinal: 3}` ＋ 一次 `UPDATE` 把 `CLOSING` 移過去。
同一期內 `執行→驗收→執行→驗收` 也表達得出來（`stageKind` 不唯一，唯一鍵是 `[phaseCycleId, ordinal]`）。

「現在走到哪」**是推導的、不是存的**：最小的未完成 `(cycle.ordinal, stage.ordinal)`。

### 5.3 任務分兩種

`TODO` 與 `審核`，用兩種 chip 色票（`--surface-3` vs `--info-bg`）。
審核任務帶 `reviewState`，階段的 `gateRequiresReview` 為真且有未通過的審核時，
`setStageStatus` 會拒絕並回傳阻擋清單。

原型裡 `01` 的 M08 掛著一條審核任務：
「第一期之二與第二期是否已收款（xlsx 狀態欄空白 ≠ 未收）」—— 這是 M3，不可猜。

### 5.4 範本是起點不是枷鎖

M05–M09 在原型裡標「範本預填」與「日期待補」。
範本（`PHASE_CYCLE_TEMPLATES`）是 code constant 不是資料表 ——
範本是產品知識，不是使用者資料；放進表就得為它寫 CRUD、授權與種子。

---

## 6. 與 v5 版面語言差異的解法

**這是 C 最大的弱點，三道解法，全部落在原型裡。**

### 6.1 第一道：雙欄只在專案的「資源」這一分頁內生效

v5 的其他六個模組（日誌／營運／金流／容量／承諾／訊號）**一行都不改**。
專案模組本身仍然是分頁式：

```
總覽 ｜ 資源 ｜ 財務 ｜ 設定
```

`對話`／`Evidence Repo`／`里程碑` 三個既有分頁**收斂進「資源」**（它們本來就是同一批資料的三個切面），
`總覽` 與 `財務` 維持單欄。所以使用者在工作台裡看到雙欄的時機只有一個，
而且是他主動點進「資源」的那一刻 —— 不是打開專案就被迫面對一個 IDE。

> 與 `ARC-038` 不衝突：`ARC-038` 規範的是模組層五分頁，本提案新增的是專案層子導覽。

### 6.2 第二道：左欄隨時可收起，退回單欄

`⌘B` 或左欄頂的按鈕 → 左欄收起，麵包屑接手導覽（麵包屑每一節都可點，回到任一層）。
窄螢幕（< 960px）自動變成抽屜，由 topbar 左側的 ☰ 開啟，點外面關閉。
**390px 下不橫向滾動**：chips、分頁列、階段帶各自局部捲動，表格在卡片內捲動。

### 6.3 第三道：視覺語彙一個都沒新增

| 面向 | 做法 |
|---|---|
| 色票 | `:root` 的 token 名稱與值逐一取自 `src/lib/theme/company-theme.ts` 的 `V5_PALETTES`（BLACK／WHITE）。原型沒有任何一個 v5 沒有的色值 |
| 字級 | 11–12.5px 為主、次級 10–10.5px、等寬 `--mono`（`"SF Mono", ui-monospace, …`）。與 `styles.ts` 的分布一致（12.5px 出現 74 次、12px 62 次、11.5px 61 次） |
| 圓角 | 4／5／6／7／8px，`styles.ts` 的既有級距 |
| 樹的列高與縮排 | 26px／每階 14px，對齊 `deliverable-tree.tsx` 的 `py-1.5` ＋ 16px/depth |
| 圖示 | 沿用 v5 icon 表既有的 key（`folder`／`file`／`image`／`audio`／`video`／`paperclip`／`download`／`lock`），沒有新增 |
| 卡片 | `.card` ＝ `--surface` ＋ 1px `--border` ＋ 8px 圓角 ＋ 細線分隔的表頭，與現有 Evidence Repo／里程碑卡片同形 |

**實際的視覺結果**：左欄看起來像 v5 把既有的 `deliverable-tree` 從卡片裡搬到側邊，
而不是像 VS Code。它仍然是深色、高密度、小字、卡片化的同一家人。

### 6.4 誠實的殘留差異

即使做了這三道，C 仍然是整個 v5 裡**唯一有持久側欄的畫面**。
使用者在「專案 → 資源」與其他模組之間切換時，會感覺到版面重心從上方分頁移到左側。
這個差異消不掉，只能縮小到「一個分頁內」。

**取捨的理由**：Owner 的現場資料是 51 個資料夾、最深 5 層。
分頁式（A）在第三層以後就得靠麵包屑，而麵包屑看不到兄弟節點；
時間流（B）在整理階層時更彆扭。**多層整理這件事，側欄是對的形狀。**

---

## 7. 七條硬性約束對照表

| # | 約束 | C 的落點 | 證據（原型內） |
|---|---|---|---|
| 1 | 不得新增與 v5 衝突的視覺語言 | token 逐一取自 `V5_PALETTES`；字級／圓角／列高沿用 `styles.ts` 與 `deliverable-tree.tsx`；icon 用既有 key | `<style>` 的 `:root` 區塊；§6.3 對照表 |
| 2 | 必須畫出「期」這一層 | 兩處：根節點總覽的期 ribbon ＋「里程碑規劃」掛載點。`01` 兩期、`03` 二期執行中。階段帶可重複 `執行→驗收` | `renderPlan()` / `cycRibbon()`；`PLAN` 資料 |
| 3 | 收件匣必須是真資料夾 | `kind='INBOX'`、`isSystem`、在樹上、帶「待整理 N」。完整走完「進收件匣 → 整理」三種方式（勾選搬移／拖放／建議歸檔） | `renderInbox()` / `doMove()` / `openMoveDialog()` |
| 4 | 會議資料夾顯示四個屬性且屬性跟著資料夾 | 六格屬性框（參與者／產生時間／結論／注意事項 ＋ 地點／形式），1:1 側表；右欄同時顯示屬性與夾內材料，含四件套完整度 | `renderMeeting()`；`10` 的 `20260717 第一次需求對談` |
| 5 | 標示 internal、不可對客戶可見 | 三級徽章逐列顯示；資料夾 `visibility` 是授權來源；`INTERNAL`/`CONTRACT` 禁 `client_visible`；最高敏感不建索引；獨立的「敏感與可見性」視圖 | `visBadge()` / `renderViewSens()`；`05/商城專案資訊.docx` |
| 6 | 呈現 Owner 已有的 de-facto 慣例 | 樹裡全部是真實名稱：`[共用] 官網專案＿共好玟化 X 圓展`、`開案前`、`專案啟動［正式資料］`、`20260411_M04_網站資源一版`、`修改需求`、`(僅內部)` 語意的 `INTERNAL`、會議四件套 | `NODES` 資料；`renderViewDup()` 的 6 組重複 |
| 7 | LINE 僅以停用狀態的入口呈現 | 掛載點灰階不可選；右欄只說明「技術上拿不回歷史訊息」與 OD-H，**沒有任何啟用按鈕**；樹上留一個灰階 `LINE_DROP` 佔位 | `renderLine()`；驗證腳本逐一檢查 `<button>` 不含「啟用／連結」 |

**驗證**：以 jsdom 載入原型跑過 69 條斷言（含三條流程的端到端操作），**69 PASS / 0 FAIL**，
全程無 JS 錯誤，檔案內 0 個外部請求。腳本見本文件 §10。

---

## 8. 取捨與風險

### 8.1 取捨

| 取 | 捨 |
|---|---|
| 多層資料夾 CRUD 最直覺；拖放整理最順手 | 與 v5 其他模組的版面語言差異最大（§6.4 承認殘留） |
| Owner 的資料夾慣例可一比一照搬，搬遷當天不改變結構 → 對帳對得起來 | 系統裡會先出現一批「不標準」的資料夾名（`[共用] 官網專案＿共好玟化 X 圓展`）。重整是第二步、由使用者按，不是匯入時自動做 |
| 一棵樹 → 移動／改名／預覽／授權／孤兒清理只有一份實作 | 會議屬性要走 1:1 側表，多一次 join；非檔案資源（聊天／規劃）要額外解釋為什麼不是資料夾 |
| 收件匣是真資料夾 → listing 查詢只有一種形狀 | 每個專案多一列系統資料夾（51 → 51 + 專案數） |
| 左欄可收起 | 收起後失去「看得到兄弟節點」這個最大優勢，等於退回 A 案的體驗 |

### 8.2 風險

| 風險 | 說明 | 緩解 |
|---|---|---|
| **側欄在手機上幾乎不可用** | 390px 下左欄是抽屜，每次導覽都要開關一次。而 Owner 的四道門有一道是手機拍照 | 手機上預設**不進樹**，直接進收件匣；整理在桌機做。原型的窄螢幕預設就是單欄 ＋ ☰ |
| **深層樹的效能** | 51 個資料夾一次撈完沒問題；一年後若長到數千，整棵樹一次載入會慢 | `path` 具體化路徑已在設計裡（`'/<rootId>/<id>/'`），子樹查詢 `startsWith`；真的大起來時改成逐層載入，資料模型不用動 |
| **搬移資料夾的子樹更新** | `moveProjectFolder` 要一次 `$executeRaw` 更新整個子樹的 `path`／`depth`，且要拒絕搬到自己的子樹 | 原型只做檔案搬移與資料夾 CRUD，**資料夾搬移留 P1**。比對 `path.startsWith` 是唯一的防護 |
| **`refCode` 永不重生成** | 匯入時建錯資料夾名字還能改（改名不動 bytes），但建錯**專案**名字就回不去了 | 乾跑人工確認那一步是唯一防線（`MIG` 階段 2） |
| **重複檔讓人想按「去重」** | 6 組 12 檔內容完全相同，介面上一定會有人想清理 | 原型的「內容重複組」視圖**沒有去重按鈕**，只說明為什麼刻意並存 |
| **第二條寫入路徑** | OD-B 已承擔：v5 工作台轉真持久化 → 必須沿用 `ARC-042` 的 `commit()` 與 `opEnqueue` | 見 §9 |

### 8.3 本提案刻意不做

- 資料夾搬移（只做檔案搬移）、軟刪與還原、版本歷史
- 縮圖與預覽（P1 已有 `asset-object` 的圖片燈箱／PDF iframe 可複用）
- 全文搜尋、Office 抽文字、音訊轉錄
- LINE（OD-H）、multipart 續傳、影音 TTL

---

## 9. 實作成本評估

### 9.1 先說機制：為什麼成本不能只看「畫面有多少」

v5 的 runtime 是由 `*.source.js` ＋ `source-patches.mjs` 經 `generate-yuanzhan-v5.mjs`
組出 `runtime.js`／`styles.ts`／`v5-seed.js`。三件事決定成本：

1. **`commit()` 是唯一寫入入口（`ARC-042`）。** 工作台側的狀態變更一律走 diff 佇列。
2. **但檔案不進 diff 佇列。** `claude/journal-asset-object-p1-implemented.md` 已經定下這條：
   assets 那一列由路由寫、前端只讀，因為 diff 佇列以「資料小、可 `structuredClone`」為前提。
   **專案硬碟必須照抄這個分界**：資料夾樹的 CRUD 可以走 `commit()`（小、可 clone），
   檔案的上傳／finalize／下載授權走 route handler。
3. **少動凍結原型一分，generator 就少一分爆掉的機會。** P1 的實作記錄寫得很清楚：
   原估五筆 `rep()` patch，實際零筆 —— 用 `const base = X; X = function(...)` 覆寫慣例接管即可。

### 9.2 會動到的檔案（粗估）

| 檔案 | 性質 | 改動 | 粗估 |
|---|---|---|---|
| `src/components/yuanzhan/v5/project-drive.source.js` | **新檔** | 樹渲染／選取／展開／CRUD／搬移／右欄七種版面 | 1200–1600 行 |
| `src/components/yuanzhan/v5/project-drive.css` | **新檔** | 樹列、屬性框、期 ribbon；token 全沿用 | 300–400 行 |
| `src/components/yuanzhan/v5/project-meeting.source.js` | **新檔** | 會議屬性框 ＋ 四件套完整度 ＋ 三條升級路徑 | 350–500 行 |
| `src/components/yuanzhan/v5/extensions.source.js` | 修改 | 專案分頁從六個收斂成四個；`資源` 分頁掛上雙欄容器 | 窄改，80–150 行 |
| `src/components/yuanzhan/v5/table-cells.source.js` | 修改 | 新增 `tcReg('meeting', …)`、`tcReg('folder', …)`（改名） | 60–100 行 |
| `src/components/yuanzhan/v5/asset-object.source.js` | 修改 | `mentionHits` 加 `folderId` 路徑到比對字串；物件索引 facet 加 `folder` | 40–80 行 |
| `src/components/yuanzhan/v5/object-index.source.js` | 修改 | `OI_LEDGERS` 加 `folder` 帳本（唯讀） | 40 行 |
| `src/components/yuanzhan/v5/styles.ts` | **生成檔** | 由 generator 重新產生，不手改 | — |
| `src/components/yuanzhan/v5/source-patches.mjs` | 修改 | **目標：0 筆。** 若分頁列的收斂必須動凍結原型，最多 1–2 筆窄 `rep()` | 0–2 筆 |
| `scripts/generate-yuanzhan-v5.mjs` | 修改 | EXTENSIONS 加三個新檔 | 3 行 |
| `prisma/schema.prisma` ＋ migration ① | 修改 | `ProjectFolder`、`ProjectFolderKind`；`OperatingAsset` 加 `projectId`/`folderId`/`filedAt`/`derivatives` | 全部 additive |
| `prisma/schema.prisma` ＋ migration ② | 修改 | `ProjectPhaseCycle`、`Occasion.folderId`/`cautions`/`actionItems`、`ProjectTask.kind`/審核欄位、`ProjectMilestone.folderId` | 全部 additive |
| `src/lib/services/project-drive.service.ts` | **新檔** | 樹查詢、CRUD、搬移、授權 | 400–600 行 |
| `src/app/actions/project-drive.ts` | **新檔** | 9 個 Server Action（`DESIGN` §5.3） | 200–300 行 |
| `src/app/api/projects/[projectId]/drive/uploads/route.ts` | **新檔** | 逐段鏡像既有 `uploads/route.ts` 的三動詞形狀 | 250–350 行 |
| `scripts/verify-project-drive.mjs` | **新檔** | 併入 `ops:check` | 300–400 行 |

### 9.3 分段與相對成本

| 段 | 內容 | 相對成本 | 風險 |
|---|---|---|---|
| S2 / P0 | migration ①、`createProjectForProfile` 補 `workspaceId`、capability resolver、drive 三動詞、驗證腳本 | **中**。全部 additive、無 UI | 低。`phaseCycleId` 必須可空，否則 v5 的 `phases` 寫入當場壞掉 |
| S3 / P1-a | 樹的渲染與 CRUD、收件匣、檔案表、搬移 | **高**（最大一塊） | 中。遞迴樹本身不難，難的是「拖放不要誤觸既有的區塊排序」—— P1 的 asset 四道門已經踩過一次（先判 `dataTransfer` 有沒有檔案） |
| S3 / P1-b | 會議屬性框 ＋ 四件套 ＋ 升級路徑 | 中 | 低。`Occasion` 既有欄位覆蓋約 70% |
| S3 / P1-c | migration ②、期／階段／里程碑／任務版面 | 中 | 中。甘特用 CSS grid 自建（Schedule-X v4 拖拉已移到 premium） |
| S4 | 瀏覽器實測與驗收報告 | 低 | — |

### 9.4 三個已知會卡住的點

1. **`prisma generate` 跑不起來**（`binaries.prisma.sh` 403，組織 egress 政策）。
   P0／P1 的 asset 實作都遇過，`tsc` 會報一批同根因錯誤。
   對策同前兩輪：以暫時 `.d.ts` 探針證明「除此之外沒有別的型別錯誤」，探針不入庫。
2. **icon 表缺 key 會靜默畫空 `<svg>`**（已踩過兩次）。
   本提案要補的 key：`folder-open`／`inbox`／`meeting`／`shared`／`lock`／`move`／`diamond`。
3. **handler 內插的顆粒度就是參數的顆粒度**。
   `tcEdit('${a}','${b}','${c}')` 必須各自內插，拼成一整串會被編成單一參數、函式靜默 return、
   畫面毫無反應也不報錯。樹的 `onclick="drvOpen('${id}')"` 全部適用。

---

## 10. 原型與驗證

**檔案**：`project-module-proposal-C-resourcetree.html`（repo 根）
單一自包含 HTML，原生 HTML/CSS/JS，無 build、無 CDN、**0 個外部請求**，狀態只在記憶體。

**可以實際操作的**：
- 切換 6 個真實專案（`01`／`03`／`05`／`08`／`10`／`12`）
- 樹的展開收合與選取；左欄收起（`⌘B`）；深色／亮色佈景切換
- **流程①** 新增資料夾（樹上或右欄工具列）→ 自動進入改名狀態；同層同名會被擋
- **流程②** 重新命名（樹上 ✎ 或右欄按鈕）；系統資料夾（ROOT／INBOX）拒絕改名
- **流程③** 把收件匣的檔案搬到某個資料夾：勾選 →「搬移到…」對話框 ／ 直接拖到左欄 ／ 採用「建議歸檔」
- 上傳到收件匣（模擬 ⌘V 截圖自動命名）、新增會議資料夾
- 七種右欄版面：專案根／收件匣／一般資料夾／會議／聊天室／規劃／LINE 說明
- 四個視圖：會議時間序／客戶可見／敏感與可見性／內容重複組

**驗證結果**（jsdom，`node $HOME/verify-c.cjs`）：**69 PASS / 0 FAIL**，全程無 JS 錯誤。
涵蓋：三條流程端到端、七條硬性約束逐條、四個視圖可開、佈景切換、左欄收合。

**未驗證**（與 `RES-033 §11` 記錄的同一個環境限制）：
本環境的瀏覽器分頁無法開啟本機 `file://`，容器的 Playwright 對 `file:`／`localhost` 皆被阻擋，
因此**沒有做瀏覽器視覺實測**。jsdom 不做版面計算，所以
「1440×900 好看、390px 不橫向滾動、四主題下可讀」這三件事**仍待 Owner 在本機開檔確認**。
原型已針對這三點設計（局部捲動、抽屜式左欄、token 化色值），但未經實測。

---

## 11. 停止條件

- 若實作需要把 assets 納入 `ARC-042` 的 diff 佇列，或需要新增批次寫入／刪除動作（`ARC-030 §8`），
  **停下回報 Owner**。
- 若 `source-patches.mjs` 需要超過 2 筆 `rep()`，停下重新評估是否能改用覆寫慣例。
- 本提案**未更新** `PLN-060`／`PLN-061`／`RPT-007` —— S1 的整合決策未做、Owner 未批准，
  寫進 backlog 會固化尚未選定的方向。
