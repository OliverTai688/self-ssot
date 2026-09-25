# RES-032 金流模組介面分層研究：收單層 / 帳務層 / 決策層

| 項目 | 內容 |
|---|---|
| 文件類型 | RES（研究與設計） |
| 日期 | 2026-09-24 |
| 範圍 | 圓展 Operating System v5 · `money` 模組（金流）六個分頁的資訊架構 |
| 程式碼證據 | `src/components/yuanzhan/v5/runtime.js`（`VIEWS.money`、`reconView`、`formTxn`、`can`）、`prisma/schema.prisma`（`OperatingTransaction` / `OperatingReimbursement` / `OperatingBankEntry` / `OperatingPayrollDraft`） |
| 觸發 | 使用者觀察：金流介面應分為「員工日常上傳資料的區域」與「純金流報表操作區域」，再分化成專案預算、毛利等角度 |

---

## 0. 一句話結論

**目前的金流模組把「收單」「記帳」「解讀」三件事壓在同一個平面上，用六個並列分頁呈現；但這三件事的使用頻率是「每天／每週／每月」，使用者是「同事／記帳者／決策者」，資料狀態是「未定／已定／已封存」。**

分頁並列的代價已經在畫面上顯現：六個分頁在空狀態下看起來一模一樣、`對帳` 在沒有任何資料時仍完整渲染一張全為 0 的銀行往來調節表、`洞察` 的 Runway 與應收未收是寫死的字面值。這些不是個別 bug，是「沒有分層」的症狀 —— 因為沒有層，每一頁都得自己假裝是完整的。

建議改為 **三面制**：`收單 → 帳務 → 洞察`，各自帶三個次分頁，角色決定預設落點。

---

## 1. 現況盤點

### 1.1 介面現況

`money` 模組（`runtime.js:663-667`）宣告 `rule: '主操作面：試算表格'`，六個平行分頁：

| # | 分頁 | 主體 | 實作位置 | 實際性質 |
|---|---|---|---|---|
| 0 | 帳本 | 交易內帳表格 ↔ 憑證庫（segmented 切換） | `runtime.js:4874-4924` | 記帳 + 收單混合 |
| 1 | 洞察 | 4 張 KPI + 可分配毛利瀑布圖 + 預算 bullet | `runtime.js:4925-4945` | 解讀 |
| 2 | 對帳 | 三欄（內帳／發票／銀行）+ 差異清單 + 銀行往來調節表 | `reconView()` `runtime.js:5341-5392` | 記帳 |
| 3 | 報帳 | 待送 → 已送 → 已核 → 已付 狀態機 | `runtime.js:4946-4966` | 收單 |
| 4 | 人事 | 薪資試算 + 獎金結算閘門（§13.1 五項） | `runtime.js:4967-4986` | 解讀 |
| 5 | 專案預算 | 預算 vs 實際 bullet + 逐案明細表 | `runtime.js:4987-5002` | 解讀 |

換句話說：**六個分頁裡，收單 1.5 個、記帳 1.5 個、解讀 3 個，但它們在導覽上完全等權。**

### 1.2 資料模型現況

`prisma/schema.prisma` 的帳務區塊（§ 帳務 SCH-008 §5）已落地四張表：

- `OperatingTransaction` — `onDate`、`title`、`projectRef`、`category`、`amount`（整數、支出為負）、`formula`（保留使用者算式原文）、`passThrough`、`vouchers String[]`、`note`
- `OperatingReimbursement` — `actorKey`、`amount`、`status`（待送／已核／已付）
- `OperatingBankEntry` — `onDate`、`amount`、`matchedRef`（刻意不做外鍵，註解說明「對不上的那幾筆正是對帳要看的東西」——這個決定是對的）
- `OperatingPayrollDraft` — `baseAmount` / `overtime` / `milestone`，註解明確標示「這張表保存的是那份試算，不是薪資發放紀錄」

**模型層的分層意識比介面層強。** schema 註解已經分清「試算 ≠ 發放」「對帳結果 ≠ 外鍵」，但介面沒有把這個分界顯示出來。

### 1.3 跨模組既有連線（已經是對的）

- 日誌打 `#` 可召喚交易（`runtime.js:4025-4045`），`effects` 明寫「建立交易，家在帳本」
- 訊號模組第 ⑥ 條：缺原始憑證 → `nav('money', 0)`；第 ⑦ 條：出勤未確認 → `nav('capacity', 3)`（`runtime.js:551-555`）
- 報帳推進到「已核」→ 自動在帳本產生對應支出並帶入憑證（`runtime.js:2283`）
- 對帳「補入帳」→ 把銀行那筆寫進內帳並要求補憑證（`adoptBank()` `runtime.js:5394-5445`）
- 每個表單都有 `effects` 陣列，預告這次寫入會影響哪些畫面 —— 這是整個系統最好的設計，要保留並擴大

### 1.4 權限現況

`can(k, ctx)`（`runtime.js:438-464`）是全系統唯一的可見性判斷，對非負責人：`cash` false、`allProjects` false、`otherPayroll` false、`audit` false、`projectFinance`/`budget` 限自己的專案。`reconView()` 第一行直接對非負責人回傳 permbar（§18）。

`MASK()` 的設計哲學寫在註解裡：「不是把選單藏起來，而是把『不可見』明白標出來」。**這個原則是對的，但目前的後果是：員工進入金流模組看到的是一片鎖頭。**

---

## 2. 核心診斷

### 2.1 三種節奏被壓成一個平面

| 層 | 節奏 | 一次互動長度 | 資料狀態 | 錯了怎麼辦 |
|---|---|---|---|---|
| 收單 | 每天，幾十秒 | 拍一張、填三格 | 未定、可改、可丟 | 直接改 |
| 帳務 | 每週／每月，半小時 | 逐筆歸類、勾稽 | 逐步定案 | 需留痕 |
| 洞察 | 每月／每季，看一眼做決定 | 掃視 + 下鑽 | 唯讀、已封存 | 不該能改 |

六個等權分頁讓「幾十秒的事」和「半小時的事」在同一個 tab bar 上競爭。實務結果是兩邊都不好：想快速丟一張收據的人要進入一個以試算表格為主操作面的畫面；想專心對帳的人被 KPI 與獎金閘門分心。

### 2.2 員工的動線被切成三段，而且大半看不到

一位非負責人同事（Lily）在系統裡真正要做的日常動作只有三件：

1. 補憑證 → 金流 · 帳本 · 點列開抽屜（但帳本是負責人的主操作面）
2. 送報帳 → 金流 · 報帳（在一個大半被 §18 遮蔽的模組裡）
3. 確認出勤 → **容量 · 出勤紀錄**（完全不同的模組）

**三件同性質的事分散在兩個模組、三個分頁。** 訊號模組雖然把第 ⑥⑦ 條撿起來了，但訊號是全系統通用收件匣，不是金流的收單入口，而且它只提醒、不承載動作。

這正是使用者的觀察成立的地方：**收單需要自己的區域，而且這個區域的第一使用者不是負責人。**

### 2.3 最深的結構問題：一筆錢的五種身分被壓成一列

`OperatingTransaction` 一列同時代表：

1. **發生**（經濟事件何時成立）
2. **收付**（現金何時進出）
3. **證明**（憑證是否附隨）
4. **歸屬**（哪個專案、是否代收代付）
5. **確定性**（是估的、待確認的，還是已結帳的）

現況把 1 和 2 合併成單一 `onDate`，把 5 完全省略。後果直接可見：

- `應收未收` 只能寫死成 `const recv = 88000;`（`runtime.js:4927`），因為系統裡沒有「已開票未收款」這個狀態
- `Runway` 寫死為字面值 `6.8`（`runtime.js:4933`），因為沒有現金帳戶實體
- 沒有任何期間鎖定概念：`editable()`（`runtime.js:6297`）只判斷作者是不是自己，**上個月已對完帳的交易仍可自由改動**
- 期間硬編碼：`reconView()` 的 `const month = '2026-09'`、帳本加總的 `t.d >= '2026-09-01'`

這不是要立刻導入完整權責發生制。是要承認「一筆錢會經過好幾個狀態」，並讓介面顯示它現在在哪一格。

### 2.4 已知的介面缺陷（從截圖與程式碼交叉確認）

| 現象 | 證據 | 判讀 |
|---|---|---|
| 帳本空狀態仍渲染表頭 + 「9 月淨額 0」footer | 截圖 1；`runtime.js:4881-4901` | 空狀態未攔截，看起來像壞掉的表格 |
| 對帳空狀態完整渲染全為 0 的銀行往來調節表 | 截圖 3；`reconView()` 無空狀態分支 | 五行 0 是純噪音，且誤導為「已對平」 |
| 洞察 4 張 KPI 全為「—／尚無資料」 | 截圖 2；`runtime.js:6579` | 已有空狀態，但與其他分頁不一致 |
| 「9 月淨額」同時出現在帳本 footer 與洞察 KPI | 截圖 1 + 2 | 同一數字兩處計算，各自維護 |
| 瀑布圖硬編碼單一專案 | `vWaterfall('PRJ-2026-004')` `runtime.js:4943` | 洞察無法切換專案 |
| 人事薪資列硬編碼 30,000 / 1,846 / 5,000 | `runtime.js:4977-4979` | 與該頁 guide 文案「這頁沒有一個數字是人工填的」直接矛盾 |
| 報帳 hint 承諾「發布報帳連結會產生外部 token 頁」 | `runtime.js:4965` vs `runtime.js:2179`「尚未發布外部連結」 | 介面承諾未實作的能力 |
| 憑證只是字串 | `addVoucher(id, kind)` 只 `push(kind)`；`runtime.js:2003` | 憑證庫顯示的是標籤不是檔案，`OperatingLibraryFile` 的 R2 `objectKey` 未被憑證使用 |
| 新增銀行明細只能逐筆手填 | `formBank()` `runtime.js:6945` | 無 CSV／銀行匯出檔匯入 |

---

## 3. 外部研究：業界怎麼分這條線

### 3.1 通用語言：系統分層

產品界把這條線叫做 **system of engagement（互動層）vs system of record（紀錄層）**。互動層的價值在流程效率、容易被替換；紀錄層的價值隨資料累積而增加、遷移成本高，要求資料完整性與安全性（[Preetam Nath](https://www.preetamnath.com/blog/system-of-record-vs-engagement)、[Tulip](https://tulip.co/blog/system-of-record-vs-system-of-engagement/)）。ServiceNow 更進一步主張：ERP 是紀錄層，互動層要另外建，因為兩者的設計目標互相牴觸（[ServiceNow](https://www.servicenow.com/community/workflow-data-fabric-blog/erp-is-your-system-of-record-now-build-the-engagement-layer-to/ba-p/3520995)）。

對應到金流模組：**收單是互動層（快、容錯、任何人都能用），帳本是紀錄層（慢、嚴謹、留痕），洞察是第三層 system of insight（唯讀、可下鑽）。**

### 3.2 收單層：Ramp 的做法

Ramp 的收據自動化（[ramp.com/receipt-automation](https://ramp.com/receipt-automation)）值得整段抄的設計：

- **投遞管道多元且不需登入**：簡訊拍照、Email 轉寄、Slack、瀏覽器外掛
- **四步流水線**：Capture → Extraction（OCR 抽 merchant/date/amount/line items）→ Matching & Coding（自動配對交易 + 指派科目）→ Sync（同步到會計系統）
- **政策由管理者設定門檻**：金額門檻、商家類別、政策別決定是否強制附憑證
- **結帳前的例外管理**：財務端即時看到缺憑證清單並通知持卡人 —— 缺件是**結帳前的待辦**，不是結帳後的錯誤

關鍵洞見：**Ramp 的收單層對員工幾乎不是一個「頁面」，而是一個投遞口。** 對兩人公司，這個結論更強烈 —— 收單面應該只有一個 drop zone 加一個待辦清單。

### 3.3 帳務層：Xero 的對帳模型

Xero 的對帳（[Numeric 整理](https://www.numeric.io/blog/how-to-reconcile-in-xero)、[Xero Central](https://central.xero.com/0/article/Reconcile-your-bank-account)）把每一筆銀行明細當作一個必須被處理的工作項，提供四種動作：

| 動作 | 語意 | 目前系統有嗎 |
|---|---|---|
| **Match** | 系統建議配對，確認即可 | ✗（`matchedRef` 存在但無建議配對邏輯） |
| **Find & Match** | 搜尋正確單據，支援一筆入帳對多張發票 | ✗ |
| **Create** | 沒有對應單據，就地建立（Who／What／Why 三格） | ✓ 即 `adoptBank()`，設計一致 |
| **Transfer** | 自有帳戶間轉帳 | ✗（沒有帳戶實體） |
| **Discuss** | 留言問同事這筆怎麼歸 | ✗ |

另兩個高價值機制：

- **Bank rules**：把重複出現的明細寫成條件規則，之後自動建議 —— 對「每月 Vercel / Supabase / OpenAI 月費」這種固定支出直接省掉重複勞動
- **Cash coding**：多選相同性質的明細，一次填 Description / Account / Tax Rate 批次套用
- **Reconciliation Summary**：對完之後出一張報告確認沒有遺漏項

目前系統的 `reconView()` 已經做對了最難的一半（三欄對照 + 差異清單 + 調節表四類調節項目），缺的是**建議配對、規則、批次、期間結論**。

### 3.4 月結層：Numeric / FloQast

月結軟體的共同形態是**檢核清單 + 負責人 + 狀態 + 截止日**（[Numeric](https://www.numeric.io/blog/financial-close-software)、[FloQast](https://www.floqast.com/blog/month-end-close-checklist)）。它們把「這個月結完了沒」從一個感覺變成一個可勾選、可稽核的物件。

對兩人公司不需要完整 close management，但需要最小版本：**一個月結卡片，五個勾選項，勾滿之後鎖定該期間。**

### 3.5 決策層：專案毛利

Productive 的做法（[productive.io](https://productive.io/blog/project-profitability/)）把專案財務拆成三個視角而不是一張表：

1. **Budgeting tab** — 預算燒掉多少、剩多少
2. **Profitability tab** — 毛利（不含管銷）；開啟管銷分攤後才看淨利
3. **Custom reporting** — 依日期／專案／客戶分組

且明確區分：**billable vs non-billable、direct cost vs overhead、pass-through cost 走採購單另計**。

這與圓展的契約條款結構高度吻合：`passThrough` 欄位的註解已寫明「代收代付：不計入可分配毛利」，瀑布圖的 foot 文案也已解釋「獎金乘在可分配毛利上，不是乘在收入上 —— 契約 §9、§10」。**概念是對的，缺的是讓它適用於全部專案而非硬編碼一個。**

### 3.6 台灣法遵的硬約束

- **會計憑證保存 5 年、帳簿保存 10 年**（商業會計法 §38、稅捐稽徵機關管理營利事業會計帳簿憑證辦法 §26/§27；[財政部稅務入口網](https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/national/profit-seeking-enterprise-income-tax/imputation-credit-account/GA8Rb37)）。得報經核准以電子方式保存，但年限不變。
- **電子發票有官方 API 規格**（[財政部電子發票應用 API 規格](https://www.einvoice.nat.gov.tw/static/ptl/ein_upload/attachments/1693297176294_0.pdf)、[法規](https://law-out.mof.gov.tw/LawContent.aspx?id=GL010122)），實務上多透過加值中心串接。

對介面的三個直接影響：

1. 憑證必須是**檔案**而非標籤，且需要保存期限標示（`OperatingLibraryFile` 的 R2 `objectKey` 已具備條件）
2. 帳本每一列即傳票，憑證必須附隨 —— 現行 guide 文案已正確陳述此規則，實作需跟上
3. 發票匯入是收單層未來的第四個投遞管道，架構上要預留

### 3.7 可移植的五個模式

| 模式 | 來源 | 移植成本 | 對圓展的價值 |
|---|---|---|---|
| 投遞口 ≠ 帳本 | Ramp | 中 | 高 —— 直接解決員工動線 |
| 每筆銀行明細＝一個待處理工作項 + 四種動作 | Xero | 低（已有一半） | 高 |
| Bank rules（重複支出規則化） | Xero | 低 | 中高 —— 雲端月費場景 |
| 月結檢核清單 + 期間鎖定 | FloQast/Numeric | 低 | 高 —— 補上缺失的「確定性」維度 |
| 毛利三視角分離（預算／毛利／自訂） | Productive | 已有雛形 | 中 |

---

## 4. 缺口清單

嚴重度：**S1** 阻擋日常使用 ｜ **S2** 造成錯誤理解或重複勞動 ｜ **S3** 體驗與完整度

### 收單層（目前最薄）

| # | 缺口 | 嚴重度 | 證據 |
|---|---|---|---|
| I-1 | 沒有「投遞口」—— 沒有拖放／拍照／email 進件，唯一入口是完整交易表單 | S1 | `formTxn()` `runtime.js:1876-1945` 要求日期／類別／摘要／金額／歸屬／代收付六格 |
| I-2 | 憑證是字串不是檔案 | S1 | `addVoucher(id, kind)` `runtime.js:2003` |
| I-3 | 員工日常三件事分散在兩模組三分頁 | S1 | 帳本抽屜 / 報帳 tab / 容量·出勤紀錄 |
| I-4 | 沒有「待歸帳」暫存狀態，進件即必須成為正式交易 | S1 | 資料模型無 intake 實體 |
| I-5 | 報帳外部 token 頁在文案中承諾、未實作 | S2 | `runtime.js:4965` vs `2179` |
| I-6 | 員工無個人金流收件匣，只能靠全系統訊號 | S2 | `buildSignals()` ⑥⑦ |
| I-7 | 無 OCR／金額自動帶入 | S3 | — |

### 帳務層

| # | 缺口 | 嚴重度 | 證據 |
|---|---|---|---|
| L-1 | 無期間概念（無月份切換、無鎖帳），上月已對帳交易仍可改 | S1 | `editable()` `runtime.js:6297`；`month='2026-09'` 硬編碼 |
| L-2 | 對帳無建議配對，`matchedRef` 全靠手動 | S2 | `reconView()` |
| L-3 | 無 bank rules，重複月費每次重填 | S2 | — |
| L-4 | 無批次編碼（cash coding） | S2 | — |
| L-5 | 銀行明細只能逐筆手填，無 CSV 匯入 | S2 | `formBank()` `runtime.js:6945` |
| L-6 | 對帳空狀態渲染全 0 調節表 | S2 | 截圖 3 |
| L-7 | 帳本空狀態渲染空表頭 + 0 footer | S2 | 截圖 1 |
| L-8 | 帳本無搜尋／篩選／期間切換／分頁 | S2 | `runtime.js:4881` 直接 map 全量 |
| L-9 | 無月結檢核清單與結論快照 | S2 | — |
| L-10 | 無帳戶實體（現金水位無資料來源） | S2 | `DB.cash` 無對應 model |
| L-11 | 無交付會計師的匯出包 | S3 | — |
| L-12 | 無憑證保存年限標示（5 年／10 年） | S3 | 法遵需求 |

### 決策層

| # | 缺口 | 嚴重度 | 證據 |
|---|---|---|---|
| A-1 | Runway 與應收未收為硬編碼字面值 | S1 | `runtime.js:4927`、`4933` |
| A-2 | 無應收／應付實體，權責與現金混同 | S1 | `OperatingTransaction` 無 dueDate／狀態／對象 |
| A-3 | 瀑布圖硬編碼單一專案，無切換器 | S2 | `runtime.js:4943` |
| A-4 | 人事薪資列硬編碼，與該頁文案矛盾 | S2 | `runtime.js:4977` |
| A-5 | 「9 月淨額」兩處各自計算 | S3 | 帳本 footer + 洞察 KPI |
| A-6 | KPI 無法下鑽回帳本篩選結果 | S2 | — |
| A-7 | 無客戶／對象維度（統編僅存在備註 placeholder） | S3 | `formTxn` note `ph:'統編、對象、用途'` |
| A-8 | 無稅務欄位（營業稅、扣繳） | S3 | `amount` 註解「未稅金額」 |

---

## 5. 提議架構：金流三面

### 5.1 導覽結構

把六個等權分頁改成 **三面 × 三分頁**，模組標題列加一組 segmented control 作為「面」的切換器，次分頁維持現有 tab bar：

```
金流 「這筆錢是什麼、對得起來嗎」

┌ 面切換器（segmented）────────────────────────────┐
│  收單          帳務          洞察                 │
│  每天 · 全員   每週 · 記帳    每月 · 決策          │
└──────────────────────────────────────────────────┘

收單  →  收件匣 ｜ 我的報帳 ｜ 憑證庫
帳務  →  帳本   ｜ 對帳     ｜ 月結
洞察  →  公司   ｜ 專案     ｜ 人事
```

三個設計判斷：

1. **面的切換器要顯示節奏與對象**（「每天 · 全員」），因為這正是三層的差異所在，使用者需要知道自己走進了哪一種時間尺度。
2. **角色決定預設落點**：負責人進 `帳務 · 帳本`，非負責人進 `收單 · 收件匣`。不是權限藏起來，是預設值不同 —— 與 `MASK()` 的既有哲學一致。
3. **不新增模組**。金流仍是一個模組，導覽總量從 6 降到 3 + 3。

> 若要更小的改動，退而求其次是保留單層 tab bar 但插入分組分隔線與小標（收單／帳務／洞察）。效果較弱，但一天可完成。

### 5.2 一筆錢的生命週期

這是整份提案的骨幹。目前一筆交易一出生就是最終狀態；改為五格：

```
   ① 進件            ② 待歸帳           ③ 已入帳          ④ 已勾稽          ⑤ 已結帳
   intake            unfiled           posted            reconciled        closed
   ─────────         ─────────         ─────────         ─────────         ─────────
   收據/檔案         有金額但缺          完整交易          與銀行明細         期間鎖定
   任何人可建         歸屬或類別         在帳本可見         配對成立          唯讀
   可刪               可補可丟           可改留痕          可解除            需開帳才能改

   ↑ 收單面            ↑ 收單面 + 帳務面   ↑ 帳務面          ↑ 帳務面          ↑ 洞察面
```

配套原則：

- **收單面只能把東西推到 ②**，不能直接產生 ③。員工不需要懂類別與專案歸屬。
- **帳務面負責 ② → ③ → ④**，是歸類與勾稽的工作台。
- **洞察面只讀 ④⑤**；③ 的數字可顯示但要標示「尚未勾稽」。
- 現有的 `effects` 預告機制沿用，並補上「這次動作把這筆推到哪一格」。

### 5.3 面 A：收單（每天 · 全員）

設計目標：**一位同事在手機上花 30 秒把東西交出去。**

**A-1 收件匣**（預設頁）

單欄清單，只有「我的」東西，每列一個動作：

```
┌────────────────────────────────────────────────────┐
│  拖放收據到這裡，或 [拍照] [選檔案] [貼上]           │
│  也可以 email 到 receipts@…（P1）                   │
└────────────────────────────────────────────────────┘

待處理 3
  ⬛ 09/22  高鐵票 NT$1,490      待補：歸屬專案     [補齊]
  ⬛ 09/20  影印費 收據.jpg       待填：金額         [補齊]
  ⬛ 09/18  客戶餐敘 NT$2,400     已送出 · 等待核准   [查看]

需要你確認 2
  ⬛ 09 月第 3 週 出勤紀錄尚未確認                    [確認]
  ⬛ 09/15 雲端月費 缺原始憑證                        [上傳]
```

- 把訊號 ⑥⑦ 與報帳待辦**收斂進同一個清單**（訊號模組仍保留全系統視角，兩者共用同一資料源）
- 「需要你確認」區塊直接跨模組承載 `容量 · 出勤紀錄` 的確認動作，員工不必切模組
- 每列只有一個主要動作按鈕

**A-2 我的報帳**

現有報帳狀態機（待送 → 已送 → 已核 → 已付）移到這裡，非負責人只看到自己的。`發布報帳連結` 的承諾文案在實作前先移除或改為「規劃中」。

**A-3 憑證庫**

從帳本的 segmented 切換移出來，成為收單面的獨立頁。理由：上傳與瀏覽憑證是收單行為，逐列查帳是帳務行為。現有「表格 ↔ 憑證庫雙向可達」的設計保留 —— 從帳務面的帳本點列仍可跳到對應憑證。

### 5.4 面 B：帳務（每週 · 記帳者）

設計目標：**把差異變成一份可處理的清單**（這句話已經寫在現有 `reconView()` 的 guide 裡，非常好，要擴大到整個面）。

**B-1 帳本**

- 頂部加 **期間切換器**（月份 + 「未鎖定／已鎖定」狀態晶片），取代硬編碼 `2026-09`
- 表格上方加 **篩選列**：專案 / 類別 / 憑證狀態 / 金額區間 / 全文搜尋
- 左側加 **待歸帳抽屜**：收單面推過來的 ② 狀態項目，拖進表格即完成歸帳
- 表格列狀態用色彩編碼 ②③④⑤，取代現有僅「缺憑證」一種警示
- 空狀態不渲染表頭，改為單一引導卡片（見 5.6）

**B-2 對帳**

保留三欄對照與調節表（這部分設計品質已經很高），補上 Xero 的四動作模型：

| 新增 | 說明 |
|---|---|
| 建議配對 | 金額 ±0 且日期 ±3 日內自動標為「建議」，一鍵確認 |
| 尋找配對 | 搜尋內帳，支援一筆銀行入帳對多筆內帳 |
| 規則 | 「凡摘要含 Vercel 且金額 < 5,000 → 類別＝工具、歸屬＝公司層級」 |
| 批次歸類 | 多選 + 一次填類別／歸屬 |
| 匯入 | CSV／銀行匯出檔，取代逐筆 `formBank()` |

「補入帳」（`adoptBank`）已等同 Xero 的 Create，保留。

**B-3 月結**（新增）

一張卡片、五個勾選項、一個鎖定按鈕：

```
2026 年 9 月結帳
  ☑ 所有交易已歸屬（專案或公司層級）        12/12
  ☑ 所有交易附原始憑證                       12/12
  ☐ 銀行明細全數勾稽                          9/12  →  前往對帳
  ☐ 報帳全數推進到「已付」                     2/3
  ☐ 出勤紀錄全員確認                          1/2

  [ 鎖定 9 月 ]   鎖定後需解鎖才能修改該期間交易，解鎖會留痕
```

鎖定後 `editable()` 需同時判斷期間狀態，而非僅作者。這補上了 §2.3 缺失的第五個維度。

### 5.5 面 C：洞察（每月 · 決策者）

現有三個分析分頁本質上是**三個不同的切片角度**，保留但正名：

**C-1 公司**：現有洞察分頁。四張 KPI 改為真實計算 —— 淨額來自帳本（單一計算來源）、現金水位與 Runway 需要先補帳戶實體、應收未收需要先補應收實體。**在資料來源存在之前，這兩張卡片應顯示「尚未設定現金帳戶 [設定]」而不是硬編碼數字。**

**C-2 專案**：合併現有「專案預算」與瀑布圖。頂部加專案切換器（取代硬編碼 `PRJ-2026-004`），下方維持「預算 vs 實際 bullet + 逐案明細」。既有的 foot 文案（獎金乘在可分配毛利而非收入上、代收代付依 §9.3 分列）是全系統最好的質化說明，保留並套用到每個專案。

**C-3 人事**：薪資與獎金試算 + 獎金結算閘門。**硬編碼的薪資列必須改為讀 `OperatingPayrollDraft`**，否則該頁 guide「這頁沒有一個數字是人工填的」為假陳述。

三個切片的共同規則：**每一個數字都要能下鑽**。點 KPI → 帶篩選條件跳到帳務 · 帳本。這是 progressive disclosure 的標準做法（[UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)），也讓洞察面不必自己解釋數字怎麼來的。

### 5.6 空狀態

目前六個分頁的空狀態行為不一致（洞察有、帳本沒有、對帳完全沒有）。統一規則：

**沒有資料時不渲染結構**（不畫空表頭、不畫全 0 調節表），改為單一卡片，包含三件事：這一頁是什麼、第一筆資料從哪來、一個主要動作。

| 面 | 空狀態文案方向 | 主要動作 |
|---|---|---|
| 收單 · 收件匣 | 「把收據丟進來就好，分類是之後的事」 | 拖放區本身 |
| 帳務 · 帳本 | 「帳本的每一列就是一張傳票」 | 新增交易 / 從待歸帳挑一筆 |
| 帳務 · 對帳 | 「三本帳永遠不會自己相等 —— 先匯入銀行明細」 | 匯入銀行明細 |
| 帳務 · 月結 | 「本月尚無可結帳項目」 | 前往帳本 |
| 洞察 · 各頁 | 「建立交易後計算」（現有文案已可用） | 新增交易 |

### 5.7 權限矩陣

`can()` 新增三個 key，並讓面的可見性由它決定：

| key | 負責人 | 非負責人 | 說明 |
|---|---|---|---|
| `intake` | ✓ | ✓ | 收單面全開 —— 新增 |
| `ledger` | ✓ | ✗ | 帳務面（帳本／對帳／月結）—— 新增 |
| `closePeriod` | ✓ | ✗ | 鎖帳／解鎖 —— 新增 |
| `cash` | ✓ | ✗ | 維持 |
| `projectFinance` | ✓ | 限自己專案 | 維持（§9.6） |
| `otherPayroll` | ✓ | ✗ | 維持（§18） |

非負責人切到帳務面時，維持現有 permbar 明示邊界的做法，不隱藏 tab。

---

## 6. 資料模型增補

| 動作 | 對象 | 內容 |
|---|---|---|
| 新增 | `OperatingIntakeItem` | `id` / `workspaceId` / `actorKey` / `kind`（receipt·invoice·note） / `fileRef`（R2 objectKey） / `amount?` / `onDate?` / `status`（intake·unfiled·posted·discarded） / `postedTxnId?` / `createdAt` |
| 新增 | `OperatingPeriod` | `workspaceId` / `period`（YYYY-MM） / `status`（open·closed） / `checklist Json` / `closedBy` / `closedAt` —— 月結與鎖帳 |
| 新增 | `OperatingAccount` | `workspaceId` / `name` / `kind`（bank·cash·card） / `openingBalance` —— 讓現金水位與 Runway 有來源；`OperatingBankEntry` 加 `accountId` |
| 新增 | `OperatingBankRule` | `workspaceId` / `matchField` / `matchValue` / `setCategory` / `setProjectRef` / `enabled` |
| 擴充 | `OperatingTransaction` | `+ status`（posted·reconciled·closed）、`+ dueDate?`、`+ settledDate?`、`+ counterparty?`（對象／統編）、`+ periodKey` |
| 擴充 | `OperatingTransaction.vouchers` | `String[]` → `Json[]`，每筆 `{ kind, fileRef, uploadedBy, at }`，指向 R2 而非僅標籤 |
| 擴充 | `OperatingReimbursement` | `+ publicToken?` / `+ tokenExpiresAt?`（外部報帳連結實作前保留欄位） |

`dueDate` / `settledDate` 分離是拆開「發生」與「收付」的最小手段，應收未收因此可被計算而非寫死。

---

## 7. 分期路線圖

### P0 — 讓介面誠實（約 1 週，無新資料表）

目標：**不新增任何能力，先讓畫面不說謊、不製造噪音。**

| 項目 | 對應缺口 | 驗收 |
|---|---|---|
| 三面導覽切換器 + 角色預設落點 | §2.1 §2.2 | 非負責人登入後落在收單面，導覽頂層從 6 項降為 3 項 |
| 六個分頁統一空狀態，移除空表頭與全 0 調節表 | L-6 L-7 | 無資料時任何分頁都不渲染表格骨架或 0 值調節項 |
| 移除／改寫硬編碼數字 | A-1 A-3 A-4 | Runway、應收未收、薪資列在無資料來源時顯示「尚未設定 [設定]」；瀑布圖加專案切換器 |
| 移除未實作的能力承諾文案 | I-5 | 報帳 hint 不再宣稱外部 token 頁存在 |
| 淨額單一計算來源 | A-5 | 帳本 footer 與洞察 KPI 讀同一函式 |
| 帳本期間切換器（讀取用，尚無鎖定） | L-1 部分 | 可切月份，加總隨之改變，不再硬編碼 `2026-09` |

### P1 — 建立收單層與期間（約 3 週）

| 項目 | 對應缺口 | 驗收 |
|---|---|---|
| `OperatingIntakeItem` + 收件匣 + 拖放上傳（R2） | I-1 I-2 I-4 | 非負責人可上傳收據並產生 ② 狀態項目，不觸及帳本 |
| 憑證改為檔案（含保存年限標示） | I-2 L-12 | 憑證庫顯示縮圖／檔名，點擊可開啟；卡片標示「應保存至 YYYY」 |
| 收件匣收斂訊號 ⑥⑦ 與報帳待辦 | I-3 I-6 | 員工在單一頁完成補憑證、送報帳、確認出勤三件事 |
| 帳本待歸帳抽屜（② → ③） | I-4 | 可從抽屜把進件補完歸屬後推入帳本 |
| `OperatingPeriod` + 月結檢核清單 + 鎖帳 | L-1 L-9 | 鎖定後該期間交易唯讀，解鎖留痕於審計紀錄 |
| 銀行明細 CSV 匯入 | L-5 | 一次匯入 N 筆，重複偵測 |
| 帳本篩選與搜尋 | L-8 | 專案／類別／憑證狀態／金額／全文 |

### P2 — 讓帳務層省力、讓洞察層可信（約 4 週）

| 項目 | 對應缺口 | 驗收 |
|---|---|---|
| 對帳建議配對（金額 ±0、日期 ±3 日） | L-2 | 建議配對正確率可量測，一鍵確認 |
| `OperatingBankRule` 規則引擎 | L-3 | 雲端月費類重複支出自動建議類別與歸屬 |
| 批次歸類 | L-4 | 多選後一次套用類別／歸屬 |
| `OperatingAccount` + 真實現金水位與 Runway | A-1 L-10 | KPI 有資料來源，可追溯到帳戶 |
| `dueDate`/`settledDate` + 應收未收計算 | A-2 | 應收未收為計算值，可下鑽到逾期清單 |
| 人事頁改讀 `OperatingPayrollDraft` | A-4 | 頁面文案與實作一致 |
| KPI 下鑽 | A-6 | 點任一 KPI 帶篩選跳到帳務 · 帳本 |
| 會計師交付包匯出 | L-11 | 單一期間的交易 CSV + 憑證 zip |

### 明確排除（本輪不做）

- 完整權責發生制與複式分錄 —— 兩人公司的成本遠高於收益
- 電子發票 API 直連 —— 架構預留 `counterparty` 與 `fileRef`，但串接留待有開票需求時
- OCR 自動抽取（I-7）—— 等收單量體出現再評估
- 稅務計算（A-8）—— 交由記帳業者，系統只保存 `amount`（未稅）與憑證

---

## 8. 風險

| 風險 | 影響 | 緩解 |
|---|---|---|
| 三面切換器讓使用者多一層點擊 | 負責人日常操作變慢 | 記住上次落點；`⌘K` 命令面板直達次分頁（系統已有搜尋列） |
| 收單層引入「待歸帳」狀態，可能變成沒人清的垃圾桶 | 帳本與實際脫節 | 月結檢核清單第一項即「無待歸帳項目」；超過 14 天的項目進訊號 |
| 期間鎖定影響現有 `editable()` 所有呼叫點 | 迴歸風險 | 鎖定判斷集中在單一函式，比照 `can()` 的單一判斷點設計 |
| 憑證改為檔案後 R2 成本與保存年限（5 年） | 儲存成本 | 已有 `OperatingLibraryFile` 的 R2 路徑可複用；只存 objectKey |
| 建議配對誤判造成錯誤勾稽 | 帳務正確性 | 一律停在「建議」狀態需人工確認，比照系統既有原則「Agent 只發訊號，判斷與決定仍然屬於人」 |

---

## 9. 需要你決定的三件事

1. **面的切換器 vs 分組分隔線**：完整三面重構（較佳、約一週）還是先在現有 tab bar 插入分組小標（一天、效果較弱）？
2. **收單面的第一個投遞管道**：先做拖放上傳，還是先做外部報帳 token 連結？前者服務內部同事，後者服務外部協作者（外包、接案者）。
3. **月結鎖帳的嚴格度**：鎖定後完全唯讀（需解鎖留痕），還是允許加註但不允許改金額？前者嚴謹、後者實務上較少摩擦。

---

## 參考來源

- [System of Record vs System of Engagement — Preetam Nath](https://www.preetamnath.com/blog/system-of-record-vs-engagement)
- [System of Record vs. System of Engagement — Tulip](https://tulip.co/blog/system-of-record-vs-system-of-engagement/)
- [ERP Is Your System of Record. Now Build the Engagement Layer to Match. — ServiceNow](https://www.servicenow.com/community/workflow-data-fabric-blog/erp-is-your-system-of-record-now-build-the-engagement-layer-to/ba-p/3520995)
- [Receipt automation, built in. — Ramp](https://ramp.com/receipt-automation)
- [What Is an Accounting Workflow? — Ramp](https://ramp.com/blog/accounting-workflow)
- [Xero Reconciliation Simplified — Numeric](https://www.numeric.io/blog/how-to-reconcile-in-xero)
- [Reconcile your bank account — Xero Central](https://central.xero.com/0/article/Reconcile-your-bank-account)
- [Find transactions to match to bank statement lines — Xero Central](https://central.xero.com/0/article/Reconcile-a-bank-statement-line-using-Find-Match)
- [Financial Close Software: 15 Best Tools — Numeric](https://www.numeric.io/blog/financial-close-software)
- [Ultimate Month-End Close Checklist — FloQast](https://www.floqast.com/blog/month-end-close-checklist)
- [Project Profitability: How to Calculate It — Productive](https://productive.io/blog/project-profitability/)
- [Calculating Project Profitability — Scoro](https://www.scoro.com/blog/project-profitability/)
- [What Is Progressive Disclosure in UX? — UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)
- [Dashboard Design Principles: The Definitive Guide — UXPin](https://www.uxpin.com/studio/blog/dashboard-design-principles/)
- [營利事業帳簿及會計憑證應該保存多久？ — 財政部稅務入口網](https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/national/profit-seeking-enterprise-income-tax/imputation-credit-account/GA8Rb37)
- [電子發票應用程式介面使用規範 — 財政部主管法規共用系統](https://law-out.mof.gov.tw/LawContent.aspx?id=GL010122)
- [電子發票應用 API 規格 v1.9 — 財政部財政資訊中心](https://www.einvoice.nat.gov.tw/static/ptl/ein_upload/attachments/1693297176294_0.pdf)
