# RES-037 日誌 AI：多對話、上傳圖文、問日誌裡的任何東西

- 日期：2026-11-05
- 觸發：Owner：「公司日誌要有一個 AI 模組，像 Claude 一樣可以建立多個對話、上傳圖片與文字互動，然後可以問日誌裡任何物件、檔案、文字。」
- 畫面：`UI-088` 圓展營運工作台 · 日誌，新增第四個分頁「AI」（同一個畫面，不另立 UI ID，比照 `LINK-001` 與物件索引的處理）
- 狀態：**Owner 已採納（2026-11-16，§9 六題全部照建議）**。`JAI-S1` 已實作並於 2026-11-18 推上正式站（`b46c9ca390`），見 §13。正式環境還沒有 `ANTHROPIC_API_KEY`，在那之前日誌 AI 以示範模式運作（真的查、但不呼叫模型）
- 前置：[`RES-018`](RES-018_dual-naming-model-human-display-name-and-iso9001-style-ai-reference-code-research.md)（參考碼不變）、[`RES-036`](RES-036_signal-inbox-line-binding-and-two-tier-signal-research.md) §6.4（「人主動發起才送 AI」）、[`ARC-028`](../02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md)（AgentFacts-lite）、`AGENTS.md` §11（AI 對高風險模組只能提案）

---

## 1. 一句話設計

**一個只讀、以你的權限為邊界的日誌助理：** 左邊是對話清單，中間是對話，右邊是「這個對話看過哪些資料」。助理自己去搜日誌、物件和檔案，答案裡的每一句依據都是一顆可點的名稱膠囊，點了回到那一行、那個物件、那份 PDF 的那一頁。

三條不能讓步的線：

1. **AI 看得到的 ＝ 你看得到的。** 搜尋工具在伺服器上用你的席位執行，沿用 `loadOperatingStore(workspaceId, viewerProfileId)` 與 `canSeatReadAsset()` 的可見性規則。別人的私人日誌、私人文件不會進到模型。
2. **只讀。** 第一版沒有任何寫入工具。要把答案放回日誌，是你按「存成日誌區塊」，走既有的 commands 端點，不是 AI 自己寫。
3. **引用必須是真的。** 答案裡的引用只能指向這一輪工具實際回傳過的參考碼；伺服器逐一驗證，對不上的引用直接拿掉並標示。

---

## 2. 現況（讀程式碼得到的）

| 項目 | 現況 | 出處 |
|---|---|---|
| 日誌 | 每人每天一筆，`blocks` 是 typed block JSON；`visibility` = company／private | `OperatingJournalEntry` |
| 物件 | 文件物件（會議紀錄、訪談稿…）、工作、金流、專案、決策、事件、連結、檔案；物件索引已把它們攤成一張表，含「回到誕生那一行」的反向索引 | `OperatingDocObject`、`object-index.source.js` `OI_LEDGERS` |
| 檔案 | 單一的家 `OperatingAsset`：bytes 在 R2、`refCode` 永不重生、`extractedText` 欄位已預留（P3 才有值）、`space` 決定可見性 | `operating-assets.service.ts` |
| 上傳 | R2 presigned + finalize 用 HeadObject 驗證，已有 `/api/company/operating/uploads` | `src/lib/storage/*` |
| 引用 UI | 名稱膠囊（點了彈出物件）、`@` 選單、`#` 召喚都已經存在 | commits `98816f81`、`78eff880` |
| 權限 | 伺服器端以席位（`seatKeys`）判斷；`loadOperatingStore` 已依 viewer 過濾私人資料 | `operating-store.service.ts:93` |
| AI | 只有 `ai-input` 用 Groq／Gemini 的 raw fetch，沒有 Anthropic SDK、沒有對話持久化、沒有工具呼叫 | `src/app/(dashboard)/ai-input/actions.ts` |
| 部署 | Vercel，`buildCommand` 會跑 `migrate deploy`；route 有 `maxDuration` 慣例 | `vercel.json`、`api/line/webhook/route.ts` |

結論：**資料面（物件有家、參考碼、可見性、上傳）都已經備好**。缺的是「對話」這個資源本身，以及一層把既有資料變成工具的薄層。

---

## 3. 畫面設計

### 3.1 位置與入口

| 入口 | 行為 |
|---|---|
| 日誌第四分頁「AI」 | 完整三欄工作區（下圖） |
| 日誌選取多行 → 浮動工具列「問 AI」 | 開一個新對話，選取的行以「釘選上下文」帶入 |
| 物件膠囊彈窗、物件索引每一列 → 「問 AI」 | 同上，帶入的是該物件 |
| 對話中 `@` | 沿用既有 `@` 選單，把物件／檔案釘進這一則訊息 |

### 3.2 桌機 1440（三欄）

```txt
┌ 對話 240px ─────────┬ 對話內容 ──────────────────────────────┬ 這個對話看過的資料 300px ┐
│ [+ 新對話]   [搜尋]  │  ▸ 搜尋日誌「報價」· 6 行   ▸ 讀了 2 個物件 │ 釘選的上下文              │
│ 釘選                 │                                           │  ▢ 10/20 會議紀錄         │
│  · Q4 報價追蹤       │  10/20 會議決定報價改分兩期付款〔10/20 日誌 │ 本次讀過                  │
│ 今天                 │  · 第 3 行〕，第二期在驗收後 30 天        │  日誌 3 天 · 物件 4 · 檔案 1│
│  · 這週沒結案的議題  │  〔AST-JRNL-000124 報價單.pdf · p.2〕。    │  ▸ 10/20 第 3 行  ↗ ⤵    │
│ 本週                 │                                           │  ▸ DEC-0031 分期決議 ↗    │
│  · 廠商合約比較      │  [複製] [重新產生] [存成日誌區塊]          │  ▸ 報價單.pdf p.2  ↗      │
│ 更早 ▾               │ ┌───────────────────────────────────────┐ │                           │
│                      │ │ 問日誌裡的任何事…   @物件  📎  範圍:全部 │ │ 送出了什麼                │
│ (封存的對話)         │ │                               [送出 ↵] │ │  本對話 12 筆 · 約 18k 字  │
└──────────────────────┴─┴───────────────────────────────────────┴─┴───────────────────────────┘
```

- **對話清單**：釘選／今天／本週／更早四組；滑過出現「改名、釘選、封存、刪除」。標題由第一則訊息自動命名，改過就停（比照 `OperatingDocObject.titleAuto`）。
- **步驟列**：AI 每呼叫一次工具，就在答案上方長出一顆收合的步驟（搜尋了什麼、找到幾筆）。等待時看得到它在做什麼，不是一個轉圈。
- **引用膠囊**：沿用日誌現有的名稱膠囊元件。日誌行膠囊有兩個目的地（開啟 ↗ ／回到那一行 ⤵），與物件索引一致。
- **右欄「送出了什麼」**：這個對話總共把哪些資料送到模型、多少字。這是信任介面，不是裝飾 —— 使用者要能回答「我剛剛把薪資表送出去了嗎？」。
- **輸入框**：Enter 送出、Shift+Enter 換行（與 `cfbba671` 修過的行為一致）；貼上或拖入圖片直接變附件；`範圍` 晶片可收窄到「只看我的」「某專案」「日期區間」；送出中按鈕變「停止」。
- **答案動作**：複製、重新產生、存成日誌區塊（插入今天日誌，成為一個帶引用的引言區塊；這是人按的寫入）。

### 3.3 手機 375

對話清單變成左側抽屜，右欄變成底部 sheet（「看過 7 項資料」一條，點開才展開）。附件用系統相簿／檔案選擇器。iPhone 的串流要注意 §6.5。

### 3.4 空狀態

不放說明文字（`AGENTS.md` §15：產品頁不放規則說明）。放三顆依當下資料產生的起手問題，例如「這週還沒結案的議題有哪些？」「10/20 會議決議了什麼？」「最近一筆超過 5 萬的支出是什麼？」——題目從物件帳本即時挑，不是寫死。

---

## 4. 助理怎麼找到答案：工具優先，不先做向量庫

### 4.1 選定做法：Agentic search（模型自己呼叫搜尋工具）

公司日誌的量是兩三個人、每天幾十行、幾百個物件 —— 小、而且全部有結構。這個規模下，讓模型自己下多次關鍵字搜尋、再讀全文，比切塊做向量檢索更準，也不用維護 embedding 管線（Anthropic 不提供 embedding，要再接一家）。

| 工具 | 輸入 | 回傳 | 可見性 |
|---|---|---|---|
| `search_journal` | 關鍵字、日期區間、作者、空間 | 命中的行：日期、作者、blockId、片段、參考碼 | 只含 viewer 讀得到的日誌 |
| `read_journal_day` | 日期、作者 | 那一天的全文（區塊攤平成文字，保留 blockId） | 同上 |
| `search_objects` | 關鍵字、物件型別 | 物件索引的列：參考碼、型別、名稱、誕生日、片段 | 依各帳本既有規則 |
| `get_object` | 參考碼 | 物件全文、狀態、留言與回覆、誕生那一行 | 同上 |
| `read_file` | 檔案參考碼、頁碼範圍 | 文字檔 → 文字；PDF → document 區塊（開 citations）；圖片 → image 區塊 | `canSeatReadAsset()` |
| `list_activity` | 日期區間 | 今日脈絡（`OperatingDayLog`）的事件列 | 依 workspace |

全部是 `strict: true` 的 JSON Schema，伺服器端驗證後才執行；每次執行把讀到的參考碼記進這一則訊息的 `sentRefs`（§5）。

### 4.2 搜尋怎麼實作

- **S1：** 每一輪對話開始時，用 `loadOperatingStore()` 取 viewer 可見的資料，在記憶體建一個攤平索引（日誌行、物件、檔案的 `extractedText`），同一輪的多次工具呼叫共用。中文用子字串比對，不靠 Postgres 全文檢索（它不會斷中文詞）。資料量小，這樣最快上線，而且可見性與畫面上看到的**是同一份計算**，不可能漂移。
- **S4（量變大才做）：** 衍生表 `operating_search_docs`，由單一 writer 維護（比照 `operating-spine.service.ts` 的模式），加 `pg_trgm` 索引。

### 4.3 明確釘選的上下文

`@` 釘選的物件、從日誌選取帶入的行、上傳的附件，**不用等模型去搜** —— 伺服器在送出前就解析、檢查權限、直接放進該則使用者訊息。這等同 Claude 的「專案知識」，但範圍是這一則訊息。

### 4.4 引用

模型被要求用 `⟦參考碼⟧` 標記依據（例如 `⟦JRNL-20261020-yz#b3⟧`、`⟦AST-JRNL-000124#p2⟧`）。伺服器在串流結束時：

1. 把每個標記對照這一輪工具回傳過的參考碼集合；
2. 對得上 → 轉成膠囊資料（型別、名稱、目的地）；
3. 對不上 → 移除並在該處標「未驗證的引用」。

PDF 另外開啟 API 原生 citations（`page_location`），讓「p.2」是模型真的引用的頁，而不是它自己寫的數字。

> 否決：只靠原生 citations。原生 citations 針對 document 區塊；日誌行與物件是我們自己的結構化資料，用既有參考碼系統（RES-018）表達最自然，也能直接重用膠囊元件。

---

## 5. 資料模型（草案，§9 回覆後才建 migration）

```prisma
/// 一個 AI 對話。預設只有建立者讀得到（D3）。
model OperatingAiSession {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId   String    @map("workspace_id") @db.Uuid
  ownerId       String    @map("owner_id") @db.Uuid      // Profile.id，不設外鍵（同 journal 慣例）
  ownerKey      String    @map("owner_key")             // 席位字串
  title         String    @default("新對話")
  titleAuto     Boolean   @default(true) @map("title_auto")
  pinnedAt      DateTime? @map("pinned_at")
  archivedAt    DateTime? @map("archived_at")
  /// { spaces, projectId, from, to } —— 範圍晶片的預設值
  scope         Json      @default("{}")
  model         String                                   // 建立當下的模型，換模型不改舊對話
  lastMessageAt DateTime? @map("last_message_at")
  deletedAt     DateTime? @map("deleted_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@index([workspaceId, ownerId, lastMessageAt], map: "operating_ai_sessions_owner_idx")
  @@map("operating_ai_sessions")
}

/// 一則訊息。content 原樣存 API 的 content blocks（含 thinking、tool_use、tool_result），
/// 因為新模型的 preserved thinking 要求歷史只能追加、不能改寫。
model OperatingAiMessage {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId   String   @map("session_id") @db.Uuid
  seq         Int
  role        String                                     // user | assistant
  content     Json
  /// 使用者附件與釘選：[{ kind: asset|object|journalLine, ref }]
  pins        Json     @default("[]")
  /// 驗證過的引用：[{ token, ref, type, label, target }]
  citations   Json     @default("[]")
  /// 這一則送到模型的參考碼與字數 —— 右欄「送出了什麼」的來源
  sentRefs    Json     @default("[]") @map("sent_refs")
  /// streaming | done | stopped | error | refused
  status      String   @default("done")
  /// { input, output, cacheRead, cacheWrite, costMicroUsd, model }
  usage       Json     @default("{}")
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([sessionId, seq], map: "operating_ai_messages_seq_key")
  @@map("operating_ai_messages")
}
```

聊天上傳的檔案**不另開表**：直接走 `OperatingAsset`，`origin = 'ai'`、`space = 'personal'`。好處是它立刻有參考碼、能被 `@`、能在答案裡被引用；按「存進文件庫」只改 `space` 與 `origin`，不搬 bytes。

若 D4 選 Files API，再加一張 `OperatingAiProviderFile { assetId, contentHash, providerFileId, createdAt }`，同一份檔案（同 hash）只上傳一次，對話刪除時一併刪遠端檔案。

---

## 6. BFF 與執行流程

### 6.1 路由

| 方法 | 路徑 | 用途 |
|---|---|---|
| GET／POST | `/api/company/operating/ai/sessions` | 列出（分組、分頁）／建立 |
| PATCH／DELETE | `/api/company/operating/ai/sessions/[id]` | 改名、釘選、封存／軟刪除 |
| GET | `/api/company/operating/ai/sessions/[id]/messages` | 讀歷史（含 `status = streaming` 的未完成訊息） |
| POST | `/api/company/operating/ai/sessions/[id]/messages` | 送出一則，回傳 SSE 串流 |
| POST | `/api/company/operating/ai/sessions/[id]/stop` | 停止進行中的回答 |
| （沿用） | `/api/company/operating/uploads` | 附件上傳，多帶 `origin: 'ai'` |

每條路由：`requireUser()` → 席位解析 → 對話擁有者檢查 → 才做事。Client Component 只拿 view model，不碰 Prisma 或 provider 回傳的原始物件。

### 6.2 一輪對話

```txt
POST messages
 ├ 驗證、寫入 user 訊息（seq n）、寫入 assistant 佔位（seq n+1, status=streaming）
 ├ 解析 pins → 權限檢查 → 組成 content（文字＋image＋document 區塊）
 ├ 取 viewer 可見資料，建本輪記憶體索引
 └ 工具迴圈（Anthropic TS SDK, messages.stream）
     ├ text delta      → SSE `delta`
     ├ tool_use        → 執行工具 → SSE `step`（搜尋了什麼、幾筆）→ 記 sentRefs
     ├ 每次迴圈結束     → 把累積的 content 寫回 assistant 訊息（斷線也不遺失）
     └ 結束            → 引用驗證 → 寫 citations、usage、status=done → SSE `done`
```

### 6.3 模型呼叫的設定

| 項目 | 設定 | 為什麼 |
|---|---|---|
| SDK | `@anthropic-ai/sdk`（新增依賴），伺服器端 only | 不沿用 ai-input 的 raw fetch |
| 模型 | 預設 `claude-opus-5-5`，可由設定改；寫入 `session.model` | D5 |
| effort | 明確設 `medium`（Opus 5.5 預設也是 medium，但寫死避免預設變動） | 問答型工作不需要更高 |
| thinking | 不送（Opus 5.5 永遠 adaptive）；不顯示思考內容 | 步驟列已經提供進度 |
| 串流 | `messages.stream()`；client tools 設 `eager_input_streaming` 並自行驗證 | 長回答不逾時 |
| max_tokens | 16000 | 問答足夠；不壓太低以免截斷 |
| 快取 | top-level `cache_control`；system 與 tools 固定不變、日期放在 user 訊息 | 同一對話後續輪次的歷史幾乎都命中快取 |
| 長對話 | compaction beta（超過門檻才觸發）；回傳的 content 原樣存回 | 不自己做摘要 |
| 拒答 | 開 server-side fallback `"default"`；`stop_reason = refusal` 顯示為狀態而不是錯誤 | 新模型的必要處理 |
| 伺服器工具 | **不開** web search／web fetch／code execution | 見 §7.2 |
| `maxDuration` | 300（部署前確認 Vercel 方案上限） | 多次工具呼叫可能超過 60 秒 |

### 6.4 斷線與背景分頁

伺服器不因 client 斷線而中止（除非按停止）；每次迴圈都把進度寫回 DB。前端回到分頁時，若最後一則是 `streaming`，改用輪詢 `GET messages` 直到 `done`。這與 `ecab3d2e` 修過的「背景分頁舊資料覆蓋」是同一類問題，必須一開始就設計進去。

### 6.5 iPhone

Safari 在收到 1024 bytes 前會緩衝串流（Next.js 16 文件 `01-app/02-guides/streaming.md` 已註明）。SSE 開頭先送一段 ≥1KB 的註解行，並加 `X-Accel-Buffering: no`、`Cache-Control: no-transform`。驗收用 WebKit（見既有 WebKit 測試做法）。

### 6.6 開發與無金鑰模式

沒有 `ANTHROPIC_API_KEY` 時，伺服器改用確定性的 mock 回應器：真的跑工具（所以搜尋與權限可測），但答案是把工具結果組成固定格式的文字並附引用。畫面清楚標示「示範模式」。這讓 S1 可以在拋棄式 DB 上完整驗收，不必先付費。

---

## 7. 風險與邊界

### 7.1 對外送資料（最大的決定）

使用者問一句「這季花最多的是什麼」，助理就會把金流資料送到模型供應商。這是 `AGENTS.md` §11 高風險模組的**讀取**，不是寫入，但仍是資料出境。所以：

- 送出的每一筆都記在 `sentRefs`，右欄看得到、Admin 稽核查得到；
- 預設排除哪些帳本由 D2 決定（建議：薪資、銀行對帳預設排除）；
- 對話預設私人（D3）。

### 7.2 Prompt injection

日誌裡會有貼進來的客戶訊息、上傳的 PDF —— 都是不可信輸入。防線不是靠提示詞，而是靠**能力**：

- 工具全部只讀、全部以 viewer 權限執行 → 被誘導最多只會答錯，不會讀到 viewer 看不到的東西；
- 不開 web fetch／web search → 沒有把資料夾帶進網址送出去的管道；
- 沒有寫入工具 → 不會被誘導改資料；
- 答案中的連結只渲染為站內膠囊，外部網址顯示為純文字。

### 7.3 成本

以 Opus 5.5（$4／$20 每百萬 token）估：一輪問答約 20–30k 輸入（多數為快取命中）、1k 輸出，約 US$0.05–0.12。兩人每天各 20 輪，約每月 US$60–150。設定頁提供每月上限；達上限後只能讀舊對話。Sonnet 5.5 約半價（D5）。

### 7.4 停止條件

- 任何寫入工具、跨 workspace 讀取、分享對話給公司以外的人 → 停，回 Owner。
- 若 Owner 要求送出前去識別化（比照 RES-036 D4），本設計改為「送出前預覽」模式，S1 範圍需重估。

---

## 8. NANDA Agent Protocol Gate（ARC-028）

| 欄位 | 值 |
|---|---|
| id | `personal-os:journal-assistant` |
| 定位 | **internal runtime、protected-owner visible**；`externalRegisterable: false` |
| provider | Anthropic（D1）；模型記在每個 session |
| lifecycle | `proposal` → S1 後 `prototype` |
| endpoints | 僅 internal：§6.1 路由；無 external |
| protocols | `internal`；不暴露 MCP／A2A |
| capabilities／skills | 六個只讀工具（§4.1）；無寫入 |
| auth | `requireUser()` ＋ 席位 ＋ 對話擁有者；工具沿用物件可見性 |
| trust | 只讀、viewer-scoped、無網路工具、引用驗證 |
| observability | 每則訊息的 `sentRefs`、`usage`、`status`；Admin 稽核可查 |

S1 交付時把這份 manifest 加入既有 AgentFacts-lite 清單並通過驗證腳本。

---

## 9. 需要 Owner 決定的六題

| # | 問題 | 建議 | 影響 |
|---|---|---|---|
| D1 | 模型供應商 | **Anthropic Claude**：原生支援圖片、PDF、citations、工具呼叫與快取，這個功能需要的全都有 | 是否新增 `ANTHROPIC_API_KEY` 到正式環境（只有 Owner 能做） |
| D2 | 哪些資料可以送給模型 | 日誌、物件、檔案、專案、決策都可以；**薪資與銀行對帳預設排除**，設定頁可開 | 工具的資料來源白名單 |
| D3 | 對話誰看得到 | **只有建立者**；之後再做「分享給公司」 | schema 不需改，只是權限檢查 |
| D4 | 附件怎麼送 | **每次送 base64 ＋ 快取**（檔案不留在供應商）；量大再換 Files API | 是否需要 `OperatingAiProviderFile` 與遠端刪除 |
| D5 | 模型與每月上限 | Opus 5.5、effort medium、每月上限 US$150；或 Sonnet 5.5 約半價 | 設定頁欄位 |
| D6 | 對話保留多久 | **保留到使用者刪除**；刪除為軟刪除，30 天後清除 | 清理排程 |

---

## 10. 分段實作

| 段 | 範圍 | 使用者看得到的差別 | 驗證 |
|---|---|---|---|
| **JAI-S1** | schema ＋ migration、對話 CRUD、SSE 串流、五個日誌／物件工具、`@` 釘選、引用驗證、無金鑰 mock 模式、AI 分頁三欄介面 | 可以開多個對話，問日誌與物件，答案有可點的依據 | `tsc`、`db:validate`、拋棄式 DB 跑 mock 模式全流程；權限測試：A 的私人日誌 B 問不到；`pnpm build`；Playwright 1440／375 |
| **JAI-S2** | 聊天上傳（圖片、PDF、文字、docx／xlsx 抽文字）、`read_file` 工具、PDF 原生 citations、「存進文件庫」 | 可以丟圖或檔案進來問，也能問日誌裡既有的檔案 | 上傳 → 問 → 引用到頁；私人檔案權限測試；WebKit 貼圖 |
| **JAI-S3** | 選取多行／物件「問 AI」入口、「存成日誌區塊」、compaction、用量與每月上限、Admin 稽核列 | 從任何地方一鍵開問；答案能回寫日誌 | 存回的區塊帶引用；上限到達時的狀態 |
| **JAI-S4** | 衍生搜尋表＋`pg_trgm`；分享對話給公司；（選）提案型工具：草擬工作／決策，人按確認才寫 | 資料變多仍然快；團隊共用好的對話 | 對帳腳本；提案不經確認不寫入 |

---

## 11. 研究回合紀錄（Page Requirement Understanding Score Gate）

初始分數 **72／100（Medium）**：actor 16、PRD／本地證據 15、資料／BFF 14、UI 參照 12、風險 9、驗收 6 → 跑四回合。

| 回合 | 視角 | 結論 | 選定 | 否決 |
|---|---|---|---|---|
| 1 | 本地 PRD／程式碼 | 物件、檔案、參考碼、可見性、上傳都已有單一的家；缺的只有對話資源 | 掛在日誌分頁、重用膠囊與 `@` 選單、檔案走 `OperatingAsset` | 另開獨立 AI 模組頁（與日誌的物件脈絡脫節） |
| 2 | 參照產品（Claude.ai 對話與專案、ChatGPT 對話、Notion AI Q&A、Glean） | 多對話清單＋時間分組是共通做法；企業知識問答的信任感來自「可點回原文的引用」與「沿用原權限」 | 三欄＋右欄資料透明；引用回到原行 | 只有聊天泡泡、沒有來源面板（Notion 早期做法，使用者無法判斷答案出處） |
| 3 | 資料／BFF／API | 小語料下 agentic search 比向量檢索準且免維運；preserved thinking 要求歷史原樣追加 | 工具優先、`content` 原樣存 JSON、每輪寫回 DB | 先建 embedding 管線；只存文字版歷史 |
| 4 | 風險／權限／對外輸出 | 注入防線要靠能力而不是提示詞；資料出境需要 Owner 決定與可稽核 | 只讀工具、無網路工具、`sentRefs`、六題 Owner 決定 | 開 web fetch（可被注入當外洩管道）；預設分享對話 |

四回合後分數 **84**；未達 90 的部分是 D1–D6 尚未回覆。

---

## 12. 參考

- Anthropic 文件：[Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)、[Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)、[Vision](https://platform.claude.com/docs/en/build-with-claude/vision)、[PDF support](https://platform.claude.com/docs/en/build-with-claude/pdf-support)、[Citations](https://platform.claude.com/docs/en/build-with-claude/citations)、[Files API](https://platform.claude.com/docs/en/build-with-claude/files)、[Compaction](https://platform.claude.com/docs/en/build-with-claude/compaction)
- Next.js 16 本機文件：`node_modules/next/dist/docs/01-app/02-guides/streaming.md`（Route Handler 串流、Safari 1KB 緩衝、反向代理緩衝）
- 本地：`prisma/schema.prisma`（`OperatingJournalEntry`、`OperatingAsset`、`OperatingDocObject`）、`src/lib/services/operating-store.service.ts`、`src/lib/services/operating-assets.service.ts`、`src/components/yuanzhan/v5/object-index.source.js`

---

## 13. Owner 決定與 JAI-S1 實作紀錄（2026-11-16）

Owner 回覆「Use them, start S1」：D1–D6 全部照 §9 的建議。

| # | 決定 | 落在哪裡 |
|---|---|---|
| D1 | Anthropic Claude | `@anthropic-ai/sdk`；`runner.ts`。金鑰由 Owner 放進正式環境 |
| D2 | 薪資、銀行對帳不送 | `corpus-loader.ts` 根本不載入 payroll／bank（也不載入報帳、收件匣） |
| D3 | 對話只有建立者看得到 | 所有查詢都帶 `(id, workspaceId, ownerId)`；別人一律 404 |
| D4 | 附件每次直接送、不存供應商 | S1 沒有聊天上傳（S2）；不使用 Files API |
| D5 | Opus 5.5、effort medium、月上限 US$150 | `JOURNAL_AI_MODEL`、`JOURNAL_AI_MONTHLY_CAP_USD`；達上限回 429 |
| D6 | 軟刪除、30 天後清除 | `deletedAt`；清除排程在 S3 |

與設計不同之處：

- 引用格式定為 `⟦line:<day>:<author>:<blockId>⟧` 與 `⟦<ty>:<rid>⟧`。允許集合是「這個對話任何一輪讀過的」，不只這一輪 —— 後續追問引用前一輪讀過的資料是正常的。
- 一則 assistant 訊息存「整輪」的 API 訊息（assistant 與 tool_result 交錯），另存 `text` 欄給畫面。歷史只追加。
- 停止：同一台伺服器直接中止；跨執行個體靠 `status = stopping`，迴圈每次呼叫模型前讀。超過 10 分鐘仍在 streaming 的視為中斷，不再擋新提問。
- 沒有金鑰時是示範模式（`JOURNAL_AI_PROVIDER` 可強制）：真的跑工具、權限、引用驗證，答案由工具結果組成，畫面標「示範模式」。

證據：`docs/2_agent-input/generated/agent-loop/reports/personal-os-owner-directed-20261116-journal-ai-s1.md`

