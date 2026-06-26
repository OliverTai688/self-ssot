# Personal OS — 資料流與儲存設計文件

## 環境資料如何流入、儲存、流出系統

**搭配文件：** `requirements_v2.md`（情境驅動式需求書）
**焦點：** 從使用者的實體 / 數位環境出發，設計每個模組的資料 input/output、儲存層分配與整合介面
**最後更新：** 2026-05-05

---

## 目錄

1. [整體資料策略](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#1-%E6%95%B4%E9%AB%94%E8%B3%87%E6%96%99%E7%AD%96%E7%95%A5)
2. [儲存三層的分工原則](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#2-%E5%84%B2%E5%AD%98%E4%B8%89%E5%B1%A4%E7%9A%84%E5%88%86%E5%B7%A5%E5%8E%9F%E5%89%87)
3. [使用者環境資料盤點](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#3-%E4%BD%BF%E7%94%A8%E8%80%85%E7%92%B0%E5%A2%83%E8%B3%87%E6%96%99%E7%9B%A4%E9%BB%9E)
4. [跨模組共用：快速捕捉管道](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#4-%E8%B7%A8%E6%A8%A1%E7%B5%84%E5%85%B1%E7%94%A8%E5%BF%AB%E9%80%9F%E6%8D%95%E6%8D%89%E7%AE%A1%E9%81%93)
5. [模組一：工作管理 — 資料 I/O](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#5-%E6%A8%A1%E7%B5%84%E4%B8%80%E5%B7%A5%E4%BD%9C%E7%AE%A1%E7%90%86--%E8%B3%87%E6%96%99-io)
6. [模組二：商會 CRM — 資料 I/O](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#6-%E6%A8%A1%E7%B5%84%E4%BA%8C%E5%95%86%E6%9C%83-crm--%E8%B3%87%E6%96%99-io)
7. [模組三：公司管理 — 資料 I/O](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#7-%E6%A8%A1%E7%B5%84%E4%B8%89%E5%85%AC%E5%8F%B8%E7%AE%A1%E7%90%86--%E8%B3%87%E6%96%99-io)
8. [模組四：財務管理 — 資料 I/O](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#8-%E6%A8%A1%E7%B5%84%E5%9B%9B%E8%B2%A1%E5%8B%99%E7%AE%A1%E7%90%86--%E8%B3%87%E6%96%99-io)
9. [模組五：學術研究 — 資料 I/O](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#9-%E6%A8%A1%E7%B5%84%E4%BA%94%E5%AD%B8%E8%A1%93%E7%A0%94%E7%A9%B6--%E8%B3%87%E6%96%99-io)
10. [模組六：生活管理 — 資料 I/O](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#10-%E6%A8%A1%E7%B5%84%E5%85%AD%E7%94%9F%E6%B4%BB%E7%AE%A1%E7%90%86--%E8%B3%87%E6%96%99-io)
11. [整合介面總表](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#11-%E6%95%B4%E5%90%88%E4%BB%8B%E9%9D%A2%E7%B8%BD%E8%A1%A8)
12. [權限、隱私與資料主權](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#12-%E6%AC%8A%E9%99%90%E9%9A%B1%E7%A7%81%E8%88%87%E8%B3%87%E6%96%99%E4%B8%BB%E6%AC%8A)
13. [同步、備份、搬移策略](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#13-%E5%90%8C%E6%AD%A5%E5%82%99%E4%BB%BD%E6%90%AC%E7%A7%BB%E7%AD%96%E7%95%A5)

---

## 1. 整體資料策略

### 1.1 三個關鍵原則

**Principle 1：Capture cheap, organize lazy.**
快速捕捉的摩擦力越低越好。資料先進系統再說，分類延後處理。

**Principle 2：Right data, right layer.**
每種資料有最適合它的儲存層。不要把影片塞進 Postgres，也不要把 metadata 散落在物件儲存裡。

**Principle 3：Owner sovereignty.**
所有資料必須能完整匯出。系統是工具，不是牢籠。如果有一天要搬走，能拿走全部。

### 1.2 資料生命週期

每筆資料都會經過五個階段，本文件每個模組都會分析這五階段：

```
[來源 Source] → [捕捉 Capture] → [處理 Process] → [儲存 Store] → [使用 Use]
   實體/數位      手機/電腦/API     OCR/轉錄/整理     三層儲存分配     讀取/分享/匯出
```

---

## 2. 儲存三層的分工原則

### 2.1 三層分工

| 儲存層                        | 適合存放                                                                      | 不適合存放                       | 理由                                                            |
| ----------------------------- | ----------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| **Supabase PostgreSQL** | 結構化欄位、關聯、metadata、短文字筆記 (<10KB)、tag、URL 引用                 | 大檔、二進位資料、影片、超長文   | DB 用來查詢、JOIN、執行 RLS；資料越精簡，效能越好               |
| **Supabase Storage**    | 小檔 (<1MB) 緊耦合資料庫、avatar、縮圖、即時 RLS 控管的私密小檔               | 大型 PDF、影片、對外大量存取的檔 | 與 Auth/RLS 整合最自然，但 egress 較貴                          |
| **Cloudflare R2**       | 大型檔案 (>1MB)、PDF、高解析照片、Markdown 大量內容、結構化文件、對外大量下載 | 影片串流                         | egress 免費、適合對外分享頻繁的檔；與 Supabase 解耦避免單點依賴 |
| **Cloudflare Stream**   | 所有影片（會議錄影、回憶影片、教學片段）                                      | 文件、圖片                       | 自動轉碼、HLS/DASH adaptive streaming、可控播放權限             |

### 2.2 決策樹

```
這是什麼資料？
├── 結構化欄位、關聯、短文字 → Postgres
├── 圖片
│   ├── < 500KB 且僅內部用 → Supabase Storage
│   └── ≥ 500KB 或會被分享 → R2
├── PDF、Markdown 大檔、文件 → R2
├── 影片 → Cloudflare Stream
└── 音檔
    ├── < 30 秒 voice memo → Supabase Storage
    └── ≥ 30 秒（會議錄音、長備忘）→ R2
```

### 2.3 metadata 模型

無論檔案儲存在 R2 還是 Stream， **metadata 永遠存在 Postgres** ：

```
attachments 資料表（簡化示意）
├── id
├── owner_id
├── entity_type      # project | research | memory | finance | ...
├── entity_id
├── storage_provider # supabase | r2 | stream
├── storage_key      # bucket path 或 stream uid
├── public_url       # 對外存取網址（可能為 null）
├── mime_type
├── size_bytes
├── ocr_text         # OCR 後文字（搜尋用）
├── transcript       # 影片/音檔轉錄（搜尋用）
└── created_at
```

這個設計讓使用者能用 SQL 全文搜尋 OCR / 轉錄文字，找到任何模組裡的任何檔案，無論它在哪一層。

---

## 3. 使用者環境資料盤點

### 3.1 實體環境的資料

| 來源               | 類型       | 通常如何被擷取 | 流向                    |
| ------------------ | ---------- | -------------- | ----------------------- |
| 名片               | 紙本       | 手機拍照       | R2 + OCR → 商會 CRM    |
| 收據 / 發票        | 紙本       | 手機拍照       | R2 + OCR → 財務        |
| 白板照片           | 影像       | 手機拍照       | R2 + OCR → 工作 / 研究 |
| 手寫筆記           | 紙本       | 手機拍照       | R2 + OCR → 研究 / 工作 |
| 書籍 / 論文        | 紙本或 PDF | 拍照或上傳     | R2 → 研究              |
| 醫療單據           | 紙本       | 手機拍照       | R2 → 生活（健康紀錄）  |
| 商會聚會的共同合照 | 影像       | 手機拍照       | R2 → 商會 / 回憶       |

### 3.2 數位環境的資料

| 來源                        | 類型           | 介面                   | 流向                         |
| --------------------------- | -------------- | ---------------------- | ---------------------------- |
| LINE 客戶群訊息             | 文字 / 圖片    | LINE Bot / 手動轉發    | DB + R2 → 工作              |
| LINE 商會群                 | 文字 / 圖片    | LINE Bot               | DB + R2 → 商會              |
| LINE 個人朋友對話片段       | 文字 / 圖片    | 手動截圖               | R2 → 生活回憶               |
| Google Calendar             | 結構化事件     | Google API + Webhook   | DB → 工作 / 研究            |
| Google Docs                 | 文件           | Google API（單向讀取） | R2（snapshot）→ 公司 / 研究 |
| Email                       | 文字 / 附件    | IMAP 或手動轉寄        | DB + R2 → 工作 / 商會       |
| 手機照片庫                  | 影像           | iOS / Android Share    | R2 → 生活 / 回憶            |
| 手機影片                    | 影片           | iOS / Android Share    | Cloudflare Stream → 回憶    |
| 語音備忘錄                  | 音檔           | Share + 自動轉錄       | R2 + 轉錄 → 想法暫存區      |
| Markdown 既有筆記           | 文字           | 直接上傳 / Git 同步    | R2 + DB（解析後）            |
| 銀行對帳單 CSV              | 結構化         | 手動匯入               | DB → 財務                   |
| arXiv / Google Scholar 連結 | URL + metadata | 瀏覽器擴充 / 手動貼    | DB → 研究                   |
| 研討會 CFP Email            | 文字           | 手動轉寄               | DB → 研究發表目標           |

### 3.3 觀察：資料分散的真實狀況

* LINE 訊息：有 5+ 個關鍵群組（客戶群、商會群、研究合作群、家人、朋友）
* Email：可能 2–3 個帳號（公司 / 學校 / 個人）
* 手機照片：累積數千張，未分類
* Google Drive：散落各種文件，部分需保留、部分可丟
* 紙本：辦公桌、書包、書架
* 大腦：最危險也最重要的儲存（會丟失）

**系統的角色：** 不是要取代這些既有工具，而是成為「值得保留的內容」的最終棲息地。

---

## 4. 跨模組共用：快速捕捉管道

### 4.1 為什麼需要共用管道

如果每個模組都有自己的捕捉介面，使用者在動作前要先決定「這屬於哪個模組」。這層認知負擔會讓很多想法死在 0–1 那一步。

**設計：所有來源都先進入 Inbox，之後再分流。**

### 4.2 五個捕捉入口

#### 4.2.1 Web 介面 — Cmd+K Quick Capture

```
按下 Cmd+K → 出現浮動輸入框 → 輸入 → Enter
↓
進入 inbox_items 資料表，predict_module 欄位由規則 + 簡單分類器填入
```

#### 4.2.2 行動裝置 — PWA Share Target

註冊 PWA 為 Share Target，使用者在手機任何 App 點擊「分享」時，可選擇 Personal OS：

* 分享文字（從 LINE / 訊息 / 瀏覽器）→ DB inbox
* 分享圖片（從相簿 / 相機）→ R2 + DB metadata
* 分享 URL → DB（自動抓取 og:image / title）
* 分享影片 → Cloudflare Stream + DB metadata

#### 4.2.3 LINE Bot — `@PersonalOS` 觸發

使用者把 Bot 加為好友或加進群組：

* 個人對話：所有訊息進 inbox
* 群組：僅在被 `@` 提及或回覆時擷取訊息
* 支援的指令：
  * `/work` → 分流到工作模組
  * `/research` → 分流到研究
  * `/life` → 分流到生活
  * `/contact` → 建立或更新聯絡人

LINE 圖片：Bot 收到 → 下載 → 上傳 R2 → DB 紀錄

#### 4.2.4 Email Forward — `inbox@user.personal-os.app`

使用者可將郵件轉寄到專屬地址：

* 信件主旨自動成為 inbox 標題
* 內文 + 附件 → R2
* 附件 PDF 自動 OCR
* 寄件者地址自動嘗試比對既有聯絡人（命中則建議連結）

#### 4.2.5 Voice Memo — 短按錄音

PWA 中長按麥克風按鈕錄音：

* 上傳到 R2
* 觸發 Whisper 轉錄
* 轉錄結果入 inbox（保留音檔連結）

### 4.3 Inbox 的整理流程

```
[inbox_items 表]
每筆紀錄：source、content、predicted_module、attachment_refs、status

每天/每週的 5 分鐘整理：
├── 滑動歸檔 → 工作 / 研究 / 商會 / 生活 / 公司 / 財務
├── 標記為「之後再決定」
└── 直接刪除
```

整理本身就是一個獨立頁面，視覺上類似 Email 的 Inbox，但不會逼迫使用者必須處理（沒有未讀數量焦慮）。

---

## 5. 模組一：工作管理 — 資料 I/O

### 5.1 Input Sources（資料從哪裡來）

#### A. LINE 客戶群組

**情境：** 客戶 Lisa 在群組傳了「這個 banner 我覺得太大了」+ 一張截圖

**流入路徑：**

1. Bot 在群組中監聽，使用者用 LINE 將該訊息回覆 Bot 或 `@Bot`
2. Bot 抓取訊息文字 + 圖片 + 發送者 + 時間戳
3. 文字進 `project_notes`，圖片上傳 R2
4. 系統建議「歸入 [Lisa Q2 Dashboard 專案]」（依群組名稱推論）

**儲存位置：**

* 文字 → Postgres
* 圖片 → R2（私密 bucket）

#### B. Google Calendar

**情境：** 使用者在 Google Calendar 建立「2026-05-12 14:00 與 Lisa 討論 dashboard」

**流入路徑：**

1. OAuth 授權後，系統 watch 該行事曆
2. 新事件觸發 webhook
3. 系統嘗試比對標題中的客戶名稱與既有專案
4. 命中則自動關聯至專案的「會議」分頁

**儲存位置：**

* 僅存 metadata（事件 ID、時間、標題）→ Postgres
* 真正的事件留在 Google Calendar（避免雙寫衝突）

#### C. 會議錄影 / 錄音

**情境：** Zoom / Google Meet 錄完會，需要把錄影連結附到專案

**流入路徑：**

1. 透過 PWA Share 上傳影片檔
2. 影片進 Cloudflare Stream（自動轉碼）
3. 觸發轉錄（Stream 內建 captions 或外部 Whisper API）
4. 轉錄文字進 Postgres `attachments.transcript` 欄位（可全文搜尋）

**儲存位置：**

* 影片 → Cloudflare Stream
* 轉錄 → Postgres

#### D. 客戶寄來的 PDF（提案、合約、設計稿）

**流入路徑：**

1. Email forward 或手動上傳
2. 上 R2（依大小分流：< 1MB 可選 Supabase Storage）
3. 觸發 OCR（如果是掃描件）
4. metadata + OCR 文字進 Postgres

#### E. 白板照片

**情境：** 開完會白板上有重要資訊，拍照後要留底

**流入路徑：**

1. 手機相機拍 → PWA Share → 上傳 R2
2. OCR 提取文字
3. 使用者在 Inbox 中將其歸入專案的「會議紀錄」

#### F. 內部 Markdown 筆記

**情境：** 使用者習慣寫 Markdown 思考

**流入路徑：**

* 短筆記 (<10KB) 直接寫在系統內，存 Postgres `project_notes.body`
* 長文件（如完整提案）可上傳 .md 檔到 R2，系統解析後 metadata + 預覽 進 Postgres

### 5.2 Output Destinations（資料如何流出）

#### A. 客戶分享連結（核心對外管道）

**設計：**

* 每個專案有唯一 token，URL 為 `personal-os.app/client/[token]`
* 客戶頁面為 Server Component，直接從 Postgres 讀取被標記 `client_visible` 的內容
* 圖片 / PDF：使用 R2 的 signed URL，有效期 7 天，自動續發
* 影片：使用 Cloudflare Stream signed URL（同樣有效期）

**為什麼用 signed URL 而非 public bucket：**

* 防止連結被外傳濫用
* token 撤銷時，所有 signed URL 立即失效
* 計入存取統計

#### B. PDF 進度報告

**情境：** 月底要給客戶一份正式進度報告

**流出路徑：**

1. 系統依專案內容生成 Markdown（pull 任務、紀錄、交付物）
2. 使用 server-side render 轉 PDF（如 Puppeteer / Playwright）
3. 上傳 R2，產生 signed URL，附在客戶頁面

#### C. Markdown 匯出

**情境：** 使用者想把專案資料整批備份

**流出路徑：**

1. 點擊「匯出此專案」
2. 系統打包：notes（.md）+ tasks（.csv）+ deliverables 連結 + 附件清單
3. 產生 .zip 上傳 R2，提供下載連結

#### D. 提醒通知

* LINE Notify：到期前 24 小時推播
* Email：每日早上的 digest
* PWA Push：手機推播

### 5.3 使用前後的設計重點

**使用前（資料還在使用者環境）：**

* 強調「不需要先整理」就能丟進來
* 多入口：LINE、Email、Share、手動

**使用中（系統內運作）：**

* OCR / 轉錄讓所有非結構化資料變得可搜尋
* 系統建議分流（但不強制）

**使用後（資料離開系統）：**

* 客戶連結是主要管道，不靠 Email 來回寄附件
* 完整匯出能力，避免鎖定

---

## 6. 模組二：商會 CRM — 資料 I/O

### 6.1 Input Sources

#### A. 名片照片（核心入口）

**情境：** 商會聚會收到 5 張名片，當下無法逐個輸入

**流入路徑：**

1. 連續拍照 → 一次性上傳 R2
2. 對每張圖跑 OCR（保留版面結構）
3. 解析欄位：姓名、公司、職稱、Email、電話
4. 建立 `contacts` 草稿，待使用者確認 / 修正
5. 原始名片照片永久保留在 R2（之後可以「再次認得這張臉」）

**儲存位置：**

* 名片圖片 → R2
* 解析欄位 + OCR 文字 → Postgres

#### B. LINE 商會群訊息

**情境：** 商會夥伴在群裡分享某個潛在客戶的資訊

**流入路徑：**

1. Bot 在群組中（已加入）
2. 使用者標記「這條重要」→ Bot 將該訊息存入 `chamber_notes`
3. 系統嘗試比對訊息中提到的人名與既有聯絡人

#### C. LinkedIn / 個人介紹頁

**情境：** 名片背面寫了 LinkedIn URL，或對方傳了個人簡介頁

**流入路徑：**

1. 使用者貼上 URL
2. 後端抓取 og:metadata（標題、描述、頭像）
3. 頭像下載到 R2
4. 文字資訊填入 `contacts` 欄位

**注意：** LinkedIn 反爬嚴格，不做深度抓取，只取公開 metadata。

#### D. 共同合照

**情境：** 與幾位夥伴聚會合照，希望日後能快速回憶當時情境

**流入路徑：**

1. 上傳 R2
2. 在照片中「框出」每個人並關聯到 `contacts.id`
3. 之後在任一聯絡人頁面，可看到「與此人的合照集」

### 6.2 Output Destinations

#### A. 引薦 DM 文本（送到 LINE / Email）

**情境：** 要把 David 引薦給 Allen

**流出路徑：**

1. 從 `dm_templates` 選範本
2. 系統自動填入兩位的姓名、公司、來源情境
3. 一鍵複製到剪貼簿
4. 使用者貼到 LINE 對話

**為什麼不直接透過 LINE Bot 發送：**

* 個人引薦訊息應該由「真人」發出，保留人味
* Bot 自動發送會破壞信任感

#### B. 商機看板共享給夥伴

**情境：** 三位商會夥伴共同經營一條人脈線

**流出路徑：**

* 標記為 `is_shared = true` 的商機，夥伴登入後可見
* Supabase Realtime 即時同步狀態變化
* 私人欄位（如「我覺得這位客戶的真實預算是 X」）夥伴看不到

#### C. 聯絡人卡片匯出 vCard

**情境：** 想把一批商會聯絡人匯入手機通訊錄

**流出路徑：**

* 選取聯絡人 → 匯出 .vcf
* 系統打包文字 vCard + 頭像（base64 內嵌或 R2 連結）

### 6.3 使用前後的設計重點

**使用前：** 名片堆積、LINE 訊息散落 → 系統提供「拍完即進系統」的低摩擦入口

**使用後：** 引薦時不需重新查資料、合照可被回憶觸發、夥伴離開時關係資產仍在

---

## 7. 模組三：公司管理 — 資料 I/O

### 7.1 Input Sources

#### A. Google Docs（既有的策略文件）

**情境：** 使用者過去把公司願景寫在 Google Docs

**流入路徑（採取單向同步）：**

1. OAuth 授權 Drive 讀取
2. 使用者選擇要納管的 Doc
3. 系統定期（每日 / 手動）抓取最新版本
4. 轉成 Markdown 存入 `company_docs`
5. 同時保留原始 Google Doc URL（可一鍵跳轉編輯）

**為什麼單向不雙向：**

* Google Docs 與 Markdown 的格式無法 1:1 對應
* 雙向同步容易導致資料衝突
* 使用者可選：在 Google Docs 編輯（系統定期同步）或在系統內編輯（脫離 Google Docs）

#### B. 直接 Markdown 編輯

**流入路徑：**

* 系統內建 Markdown 編輯器
* 短文件（< 50KB）直接存 Postgres
* 長文件存 R2，Postgres 僅存指標

#### C. 版本歷史

**流入路徑：**

* 每次儲存產生快照
* 快照存 R2（壓縮後容量小）
* 預設保留最近 30 個版本，超過自動歸檔

### 7.2 Output Destinations

#### A. 對外公司簡介 PDF

**情境：** 投資人 / 客戶請使用者寄一份公司介紹

**流出路徑：**

1. 系統依「對外公開」標記的文件，組合成單一 PDF
2. PDF 上 R2，產生有效期連結

#### B. 引用到工作專案

**情境：** 接案時要說明這個案子對應哪條主軸

**流出路徑：**

* 在專案描述中可 `@mention` 公司主軸文件
* 反向：在公司主軸頁面看到「目前有 X 個專案對應此主軸」

### 7.3 使用前後的設計重點

**使用前：** 策略文件散落在 Google Docs / Notion / 大腦

**使用後：** 每次回答「我們公司在做什麼」有一致版本可參考；策略修正有歷史可追溯

---

## 8. 模組四：財務管理 — 資料 I/O

### 8.1 Input Sources

#### A. 發票 / 收據照片

**情境：** 商務午餐後拍了張收據

**流入路徑：**

1. 拍照 → PWA Share → R2
2. OCR 提取：金額、日期、店家
3. 系統建立 `finance_records` 草稿
4. 使用者確認並補：分類、內帳/外帳、關聯專案

**儲存位置：**

* 收據圖 → R2（保留 5 年以上，符合稅務要求）
* 結構化欄位 → Postgres

#### B. 銀行 CSV / 對帳單

**流入路徑：**

1. 使用者下載銀行匯出檔
2. 上傳系統，使用者選擇對帳格式
3. 系統解析後產生草稿，使用者逐筆確認

**為什麼不直接串銀行 API：**

* 台灣銀行 Open API 還在發展中，不穩定
* CSV 匯入可控、明確

#### C. 客戶匯款通知（Email）

**流入路徑：**

1. 銀行通知 Email forward 到 inbox
2. 系統解析金額 + 匯款人
3. 嘗試比對既有客戶 / 專案，建議關聯

### 8.2 Output Destinations

#### A. 月度 / 季度報表 PDF

**流出路徑：**

1. 從 `finance_records` 聚合
2. 生成圖表 + 文字報告
3. PDF 上 R2

#### B. 給會計的 CSV

**流出路徑：**

* 篩選「外帳」+ 指定時段
* 直接下載 CSV，附帶收據圖片連結

#### C. 收據圖片打包下載

**情境：** 報稅季要把該年收據都交給會計

**流出路徑：**

* 系統打包該年所有外帳記錄的收據圖
* 上 R2，產生 zip 連結

### 8.3 使用前後的設計重點

**使用前：** 收據在皮夾、消費記在 Excel、報稅時手忙腳亂

**使用後：** 每筆消費 30 秒入帳；報稅季 5 分鐘匯出；專案毛利可即時查詢

---

## 9. 模組五：學術研究 — 資料 I/O

### 9.1 Input Sources

#### A. arXiv / Google Scholar 論文

**情境：** 讀到一篇相關論文，要納入研究主軸

**流入路徑：**

1. 瀏覽器擴充 / PWA Share / 手動貼 URL
2. 系統抓取論文 metadata（透過 arXiv API / DOI）
3. 自動下載 PDF 到 R2
4. 提取作者列表，建議加入 `researchers` 資料庫
5. 觸發 PDF 文字提取，存入 `attachments.ocr_text`（可全文搜尋）

**儲存位置：**

* 論文 PDF → R2
* BibTeX / metadata → Postgres
* 作者 → Postgres

#### B. 研討會 CFP Email

**流入路徑：**

1. CFP Email forward 到 inbox
2. 系統嘗試解析：venue 名稱、截止日、主題範圍
3. 建立 `publication_targets` 草稿

#### C. 手寫研究筆記照片

**流入路徑：**

1. 拍照 → R2
2. OCR
3. 使用者歸入研究主軸的「想法」或「材料」

#### D. Voice Memo（思考過程）

**情境：** 散步時錄下對某個概念的思考

**流入路徑：**

1. 錄音 → R2
2. Whisper 轉錄 → Postgres `research_ideas.body`
3. 原音檔保留（之後可重聽當時的語氣）

#### E. 既有 Markdown / Obsidian 筆記

**流入路徑：**

1. 上傳 .md 檔（單檔或 .zip）
2. 解析 frontmatter（如有）
3. 內文存 R2，metadata 進 Postgres
4. `[[wikilink]]` 形式的連結保留為「待解析」標記，使用者可手動連結到對應實體

**為什麼不全自動連結：**

* Obsidian 的 wikilink 命名與系統內的命名不一定對齊
* 自動匹配容易出錯，反而難 debug

### 9.2 Output Destinations

#### A. 研究海報 / 簡報

**情境：** 學期末要做研究海報

**流出路徑：**

* 使用者選擇研究主軸 → 從想法、材料、結論中拖拉到海報範本
* 匯出為 PDF / PPTX，上 R2

#### B. 論文草稿

**流出路徑：**

* 累積的研究想法、文獻引用 → 匯出 Markdown 草稿
* BibTeX 文件可獨立匯出（餵給 Overleaf / Word）

#### C. 公開研究分享頁

**情境：** 想做一個公開的研究主題介紹頁，給別人理解自己在做什麼

**流出路徑：**

* 標記 `is_public = true` 的研究輸出
* 產生公開 URL（無需登入）
* 圖片 / PDF 透過 R2 公開 bucket

#### D. 文獻 BibTeX 匯出

* 一鍵匯出該研究主軸所有引用文獻為 .bib

### 9.3 使用前後的設計重點

**使用前：** 論文 PDF 散在 Downloads / Zotero / Mendeley；想法散在 Obsidian / 紙本 / 大腦

**使用後：** 每個研究主軸是一個自足的工作空間；過去三年累積的研究軌跡可隨時回顧

---

## 10. 模組六：生活管理 — 資料 I/O

### 10.1 Input Sources

#### A. 手機照片（核心）

**情境：** 朋友聚會、旅行、日常瞬間

**流入路徑：**

1. PWA Share 多選照片 → R2
2. EXIF 自動提取：拍攝時間、地點（如有）
3. 使用者可選擇歸入哪個回憶 / 建立新回憶
4. 可標記「這張照片裡有誰」（連結 contacts）

**儲存位置：**

* 原始照片 → R2（保留高解析）
* 縮圖 → Supabase Storage（快速載入）
* metadata + 標記 → Postgres

#### B. 手機影片（重要時刻）

**情境：** 朋友婚禮、孩子的某個瞬間、工作坊片段

**流入路徑：**

1. PWA Share → Cloudflare Stream
2. Stream 自動轉碼（多種解析度）
3. 自動截首幀作為縮圖
4. 觸發轉錄（如果有對話）

**為什麼用 Stream 而非 R2：**

* 手機原檔常 50MB+，直接放 R2 觀看時頻寬大
* Stream 的 HLS adaptive 在弱網路也能播
* 對外分享時節省極多 egress 費用

#### C. 醫療記錄

**情境：** 看完醫生拿到處方箋、檢驗報告

**流入路徑：**

1. 拍照 → R2
2. OCR
3. 歸入 `life_items` 的「健康」分類
4. 標記下次回診日期 → 自動加入提醒

**隱私重點：** 醫療資料儲存層必須加密，access log 嚴格

#### D. 與朋友的對話片段

**情境：** 與朋友的某段 LINE 對話特別有意義，想保留

**流入路徑：**

1. 截圖 → PWA Share → R2
2. 歸入「回憶」並標記相關的人

#### E. 重要書信、卡片

**情境：** 收到的卡片、紙條

**流入路徑：**

1. 拍照 → R2
2. OCR 提取文字
3. 歸入「回憶」

### 10.2 Output Destinations

#### A. 朋友禮物頁面（半私密分享）

**情境：** Mark 生日要送的禮物，想做一個專屬於他的回憶頁

**流出路徑：**

1. 篩選與 Mark 相關的回憶、照片、影片
2. 系統生成一個分享頁面
3. 產生 token URL（僅 Mark 可看，可選有效期）
4. 影片用 Stream signed URL（防止外傳）

#### B. 年度回顧 PDF

**情境：** 年底想做一份「這一年我經歷了什麼」

**流出路徑：**

* 從該年度的回憶中抽取
* 系統生成 PDF 排版（含照片）
* 上 R2，使用者下載或印出

#### C. 健康趨勢可視化

**情境：** 想看「過去半年我感冒幾次、看醫生幾次」

**流出路徑：**

* 從 `life_items` 中過濾健康相關
* 視覺化呈現頻率、間隔
* 可搭配下次健檢時與醫生討論

### 10.3 使用前後的設計重點

**使用前：** 照片在相簿無法被搜尋；回憶模糊；身體訊號被忽略

**使用後：** 「我與 Mark 過去一年的相處」可被一鍵調出；生病頻率不再是模糊感受而是數據

---

## 11. 整合介面總表

| 整合對象                      | 介面                | 方向 | 觸發頻率                  | 主要模組               |
| ----------------------------- | ------------------- | ---- | ------------------------- | ---------------------- |
| LINE                          | Bot Messaging API   | 雙向 | 即時（webhook）           | 工作、商會、Inbox      |
| LINE Notify                   | API                 | 出   | 事件觸發                  | 全模組（提醒）         |
| Google Calendar               | OAuth + Watch API   | 入   | webhook + 每小時 fallback | 工作、研究             |
| Google Docs / Drive           | OAuth + Read API    | 入   | 手動 / 每日               | 公司、研究             |
| Email (IMAP)                  | IMAP / Forward 地址 | 入   | 即時                      | 全模組（inbox）        |
| arXiv                         | 公開 API            | 入   | 手動觸發                  | 研究                   |
| DOI / Crossref                | 公開 API            | 入   | 手動觸發                  | 研究                   |
| Whisper API                   | OpenAI API          | 處理 | 上傳音/影片時             | 全模組                 |
| OCR（Tesseract / Vision API） | 後端服務            | 處理 | 上傳圖片時                | 全模組                 |
| Cloudflare R2                 | S3-compatible API   | 雙向 | 任何檔案操作              | 全模組                 |
| Cloudflare Stream             | Stream API          | 雙向 | 影片上傳 / 播放           | 工作（會議錄影）、生活 |
| PWA Share Target              | Web Share API       | 入   | 使用者主動                | 全模組                 |

---

## 12. 權限、隱私與資料主權

### 12.1 三層儲存的權限模型

#### Postgres：透過 RLS

每個資料表有 RLS 政策。例如：

```sql
-- 個人筆記僅 owner 可見
CREATE POLICY "owner_only" ON project_notes
  FOR ALL USING (auth.uid() = owner_id);

-- 對客戶公開的任務
CREATE POLICY "client_visible_tasks" ON project_tasks
  FOR SELECT USING (
    visibility = 'client_visible'
    AND project_id IN (
      SELECT id FROM projects
      WHERE client_token = current_setting('app.client_token', TRUE)
    )
  );
```

#### Supabase Storage：使用 Storage Policies

```sql
-- 私密 bucket：僅 owner 上傳 / 讀取
CREATE POLICY "owner_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'private'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### Cloudflare R2：透過 signed URL + 後端代理

R2 沒有像 Supabase Storage 的 RLS。權限管理方式：

* **不公開 bucket：** 所有 R2 物件預設不開放公網存取
* **後端代理：** 使用者請求檔案時，先由 Next.js API 驗證權限（讀 Postgres 確認可存取），再產生 signed URL 回傳
* **signed URL 有效期：** 短期（15 分鐘）用於私人檔案；中期（7 天）用於客戶連結；公開檔案才直接給長期 URL

#### Cloudflare Stream：使用 Signed Tokens

```
Stream URL: https://customer-{id}.cloudflarestream.com/{video_id}/manifest/video.m3u8?token={signed_jwt}

JWT payload 包含：
- exp（有效期）
- accessRules（IP / 國家 / Referer 限制）
```

每次播放前由後端產生 token，確保即使 URL 外洩也很快失效。

### 12.2 醫療 / 高敏感資料

生活模組中的醫療記錄、財務模組中的銀行資料屬於高敏感範疇：

* 額外加密層：客戶端在上傳前可選擇 AES-256 加密，密鑰僅在使用者瀏覽器
* 不送入任何 OCR / 轉錄第三方 API（改用本地模型或顯式選擇）
* 存取必留 audit log

### 12.3 資料主權

**Owner 主權：** 使用者隨時可：

* 全資料匯出為 .zip（Postgres → JSON / CSV，R2 / Storage / Stream → 原始檔案）
* 自帶 R2 帳號（系統支援使用者自己的 Cloudflare 帳號做儲存後端，讓資料完全掌握）
* 永久刪除：系統提供 hard delete，遵守 GDPR 級別清除

**Partner 與 Client 的限制：**

* Partner 對共享資料只有讀寫權限，沒有匯出全集的權限
* Client 透過 token 看到的只是「投影」，不能匯出原始資料

---

## 13. 同步、備份、搬移策略

### 13.1 備份策略

| 內容                  | 主存放            | 備份位置               | 頻率    |
| --------------------- | ----------------- | ---------------------- | ------- |
| Postgres              | Supabase          | R2（pg_dump 加密上傳） | 每日    |
| 結構化文件、PDF、圖片 | R2                | 跨 region 複製         | R2 自動 |
| 影片                  | Cloudflare Stream | Stream 內建備援        | 自動    |
| 使用者上傳的小檔      | Supabase Storage  | R2 鏡像                | 每週    |

### 13.2 災難恢復

* Postgres 損毀：從最近備份還原（最壞情況丟失 < 24 小時資料）
* R2 不可用：transient 錯誤時系統 cache 短期重試；長期不可用可切換到鏡像 bucket
* Supabase 服務問題：唯讀模式（先讓使用者能看資料），暫停寫入

### 13.3 搬移能力

**搬離本系統的完整路徑：**

```
資料匯出按鈕 → 系統打包：
├── data.json       # 所有 Postgres 資料
├── attachments/    # R2 + Storage 內所有檔案，依模組分資料夾
├── videos/         # Stream 影片下載連結（30 天有效）
├── README.md       # 資料結構說明
└── schema.sql      # 重建用的 SQL（讓使用者可在自己的 Postgres 建立同樣結構）
```

這份匯出檔可以：

* 直接讀取（純檔案）
* 匯入新版本系統
* 匯入第三方工具（Obsidian、Notion、Excel）

**這個能力本身，是系統信任感的核心。** 使用者願意把多年的研究、客戶資料、人生回憶託付給系統，前提是知道有一天可以拿走全部。

---

## 結語：資料是本質

這份系統的價值不在於畫面有多美、功能有多完整，而在於 **它能否成為使用者生活中各種片段資料最終、最可靠的容器** 。

每一個整合介面、每一層儲存選擇、每一條資料流，背後的問題都是同一個：

> 當這個資料離開使用者所在的環境（LINE 對話、紙本名片、手機照片、白板），它要去哪裡？怎麼去？到了之後如何被找到？需要時如何被取出？

這份文件試圖回答這些問題。它不是最終答案，而是一個誠實的起點 — 隨著系統實際被使用，每一條資料流都會有實作上需要修正的細節。

但設計的方向是清晰的：**對使用者環境真正友善，對資料的去處有明確主張，對使用者主權的承諾不打折。**

---

*本文件與 `requirements_v2.md` 互補。需求書描述「系統解決什麼問題」、「對使用者產生什麼影響」；本文件回答「資料如何進入、如何儲存、如何離開」。兩者合起來才構成完整的系統設計依據。*
