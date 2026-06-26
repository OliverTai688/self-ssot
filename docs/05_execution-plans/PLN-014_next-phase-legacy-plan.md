# Personal OS — 下一階段開發計畫
## 從高保真原型走向真實後端與全模組覆蓋

**專案名稱：** Personal OS (個人結構化管理系統)  
**文件版本：** v1.0  
**更新日期：** 2026-05-20  
**關聯文件：** `A_ai_prd.md` (核心需求) · `C_ai_workspace_dev_plan.md` (AI 原生規劃) · `D_sync_structure_plan.md` (同步機制)

---

## 1. 核心現狀審查（已完成開發盤點）

目前系統已建立了極具質感的前端 Layout 基礎，並利用 **React Context & Memory Mock** 實現了 Phase 1（核心骨架與工作管理）的高保真互動。以下為目前已開發功能與相關檔案清單：

### 1.1 全域架構與 UI 系統
*   **全域持久 AI 面板 (`AiContextPanel`)**
    *   實作於 `src/components/ai/ai-context-panel.tsx`。
    *   具備**跨頁面狀態持久化**（展開/收合狀態記錄於 `localStorage`）。
    *   **脈絡感知能力**：能自動偵測使用者目前路由（工作詳情、AI 輸入、首頁等），在對話框上方顯示感知狀態。
    *   **跳轉建議卡片 (`AiNavSuggestion`)**：AI 回覆中可嵌入結構化的跳轉卡片，支援點擊直接切換頁面或 Tab。
*   **高質感 UI 系統**
    *   採用 `Base UI (@base-ui/react)` 設計核心 Dialog、Tabs，並搭配 Tailwind CSS 實現極具現代感的深淺色模式切换。
    *   首頁實作了 **早安簡報 (`MorningBriefCard`)**，以卡片形式提供 AI 重點提示，並支援重新整理/重新分析模擬。

### 1.2 工作管理模組 (Work Module)
已完成 PRD 中 Phase 2 的主要前端功能：
*   **專案指揮中心 (`/work`)**
    *   支援按專案狀態（進行中、暫停、完成、封存）進行過濾與排序（按更新時間、截止時間、名稱）。
    *   **今日焦點 (`ProjectFocusCard`)**：自動提取健康度為 "risk" 或 "watch" 且進行中的專案置頂，醒目顯示「下一個明確行動」。
    *   支援模擬新增專案 Dialog。
*   **專案三維詳情頁 (`/work/[projectId]`)**
    *   **✦ 脈搏 Tab**：呈現 AI 對專案進度、阻礙、待釐清問題的綜合分析。提供「生成客戶更新」功能，引導使用者審核後複製客戶安全報告（Human-in-the-loop 原則）。
    *   **工作 Tab**：展示原始數據證據層。
        *   `TaskList`：折疊展示手動、AI 建議與客戶要求的任務，支援 Checked 前端狀態切換。
        *   `NoteTimeline`：以精美時間軸展現會議記錄、LINE 對話、Email 摘要與內部思考，支援 Pin 置頂。
        *   `DeliverableTree`：樹狀展示對外交付物狀態（Draft -> Delivered -> Approved）。
    *   **客戶 Tab**：顯示分享設定，管理專案客戶可見邊界，展示客戶安全版更新草稿。
*   **客戶安全隔離公開頁 (`/client/[token]`)**
    *   實作於 `src/app/client/[token]/page.tsx`。
    *   **無需登入權限**。輸入唯一 Token 後即可查看，且**底層嚴格過濾資料**，僅呈現標記為 `client_visible` 的任務與已交付物，完全遮蔽任何內部思考、內部任務及 AI 脈搏推理過程。

### 1.3 AI 輸入工作台 (AI Input Workspace)
*   **多源資料擷取與 Triage 審閱 (`/ai-input`, `/inbox`)**
    *   支援模擬 **LINE 對話同步** 與 **Google Drive 文件匯入**。
    *   **同步範圍選擇器 (`SyncScopePicker`)**：實作於 `src/components/ai/sync-structure-panel.tsx`。可以 Tree 狀展開 Google Drive 資料夾，或清單式勾選 LINE 群組/私聊，計算預估同步的 Tokens / 訊息數，進行選擇性同步。
    *   **AI 智能分流卡片 (`TriageProposalCard`)**：模擬 AI 對捕獲內容的自動分類（推薦關聯專案、提取意圖、產生對應 Action 及 Tags）。使用者點擊 Approve 後轉化為實際的 UnitRecord，或歸入專案筆記。
    *   支援 ChatGPT JSON Export 歷史對話匯入解析、圖片 OCR 及語音 STT 模擬。

---

## 2. 需求缺口分析（待開發清單）

對照核心技術需求書 (`A_ai_prd.md`)，目前系統的缺口主要集中於「**尚未開發的獨立業務模組**」與「**底層持久化與 API 路由基礎建設**」：

### 2.1 尚未開發的獨立業務模組 (Placeholder Page Only)
1.  **商會 CRM 模組 (`chamber`)**
    *   *現狀：*僅有 placeholder。
    *   *缺口：*聯絡人名冊與詳情頁面；聯絡人關係網路圖（Relation Graph，標記雙向關係類型）；商機漏斗看板（Kanban 拖曳，狀態：探索 -> 談判 -> 成交/流失）；引薦 DM 範本庫。
2.  **學術研究模組 (`research`)**
    *   *現狀：*僅有 placeholder。
    *   *缺口：*研究主軸管理（與工作專案的關聯說明）；研究想法庫（Concept / Hypothesis）、文獻與材料庫；發表平台管理（Venue Deadlines & Status）；研究者與論文庫；研究里程碑與轉化輸出管理。
3.  **財務管理模組 (`finance`)**
    *   *現狀：*僅有 placeholder。
    *   *缺口：*記帳功能，須嚴格區分「內帳 (internal)」與「外帳 (external)」；收支分類管理並關聯特定專案；月度/季度收支摘要圖表（折線/圓餅圖）；CSV 資料匯出功能。
4.  **公司管理模組 (`company`)**
    *   *現狀：*僅有 placeholder。
    *   *缺口：*公司核心定位文件編輯器（願景、戰略、節奏、方向），支援 Markdown 與置頂 Pin；公司治理軸線與工作專案的映射管理。
5.  **生活管理模組 (`life`)**
    *   *現狀：*僅有 placeholder。
    *   *缺口：*生活事項循環清單（重視健康、身體護理、習慣、雜務，具備週期屬性）；重要回憶牆（Memory Wall），支援 Pin、附件照片及關聯對象。

### 2.2 持久化與安全性缺口 (Database & API)
1.  **資料庫與持久化**
    *   *缺口：*完全沒有 Supabase PostgreSQL 資料表、Migrations 與觸發器。
    *   *缺口：*目前所有狀態變更（任務 checked、新增專案、歸檔筆記）僅存於 React Context 記憶體中，重整網頁即消失。
2.  **帳號認證與 RLS 安全策略**
    *   *缺口：*尚未實作登入、註冊與密碼找回頁面。
    *   *缺口：*Supabase Auth 未設定。PostgreSQL 未配置 Row Level Security (RLS) 策略，無法真正限制 `owner` / `partner` / `client` 的資料邊界。
3.  **後端 API 路由與真實 AI 接入**
    *   *缺口：*無 Next.js App Router API Route Handlers。
    *   *缺口：*對話面板及 Ingesting 分類器皆使用預設 mock 延遲回覆，未接入真實 OpenAI API / Vercel AI SDK。

---

## 3. 下一階段開發路線圖規劃（二選一）

為了順利推進專案，我們需要決定下一階段的側重點。這裡提供兩種開發路線供選擇：

### 【路線 A】後端持久化優先 (推薦：打穩地基)
*   **核心思維**：先將已實現的「工作管理」與「AI 輸入」串聯至真實資料庫，完成登入流程與 RLS。後續開發其他模組時，直接寫入 Supabase，避免二次重構。
*   **預估時程**：3 週。
*   **適合情境**：專案已準備進入真實測試、需要實際記錄個人資料、或者希望儘快串接真實 OpenAI API。

### 【路線 B】業務模組補完優先 (快速驗證全模組 UX)
*   **核心思維**：繼續在前端用高保真 Mock 資料將商會 CRM、學術研究、財務、公司、生活等 5 個 placeholder 頁面全部補齊，使整個「Personal OS」在本地擁有 100% 完整的使用者體驗流，最後再一次性移轉至 Supabase。
*   **預估時程**：2.5 週。
*   **適合情境**：需要向合作夥伴或客戶展示完整的 Personal OS 概念原型，或仍在調整其餘 5 個模組的欄位結構與 AI 感知模式。

---

## 4. 具體開發計畫 - 路線 A：後端持久化優先 (實施步驟)

若選擇路線 A，下一階段的開發重點與細節規劃如下：

### 階段 4.1：Supabase 基礎建設與認證流程 (1 週)
本階段目標是讓用戶能夠安全登入，並在資料庫建立基礎表結構。

#### 1. 建立 Supabase Schema 與 Migrations
在本地建立 `supabase/migrations/` 目錄，規劃基礎表結構：
*   `profiles`：儲存使用者角色 (`owner`, `partner`, `client`)。
*   `tags`：全域標記。
*   `projects` & `project_tasks` & `project_notes` & `project_deliverables`：工作模組實體表。

#### 2. 設定 Row Level Security (RLS) 政策
*   **Owner 擁有全權**：
    ```sql
    CREATE POLICY "Owners manage their own data" ON projects
      FOR ALL USING (auth.uid() = owner_id);
    ```
*   **Client 驗證安全通道**：建立一個 Postgres Function，允許通過路徑中的 `client_token` 讀取 `visibility = 'client_shared'` 且關聯的 `client_visible` 任務與交付物。

#### 3. 實作登入與授權頁面
*   新建 `src/app/(auth)/login/page.tsx`，支援密碼登入與 Magic Link 發送。
*   實作 `middleware.ts` 進行路由守衛，若無 Session 則重導向至 `/login`。

---

### 階段 4.2：現有 Work / Ingestion 模組資料庫對接 (1 週)
將原本存放在 React Memory 中的資料操作全部替換為 Server Actions 或 API Route Handlers。

#### 1. 實作 API Route Handlers 與服務層
*   `GET/POST /api/projects`：專案增改。
*   `PATCH /api/tasks/[id]`：切換任務完成狀態。
*   `POST /api/ingestion/triage`：當用戶 Approve AI 分流提案時，伺服器端將 `CaptureCandidate` 寫入資料庫並自動關聯至對應專案的 `project_notes` 或 `project_tasks`。

#### 2. 重構 Context 狀態管理
*   修改 `IngestionContext.tsx`，將初始 mock 資料載入改為實時從 `/api/ingestion` 拉取，使資料庫變更在重新整理頁面後依然保留。

---

### 階段 4.3：真實接入 OpenAI API & Vercel AI SDK (1 週)
結束 Mock 擬真對話，讓持久 AI 面板與 Ingesting Triage 具備真正的語意處理與行動能力。

#### 1. 設定 `route.ts` 進行 OpenAI Streaming 回應
*   使用 Vercel AI SDK 的 `streamText`，接入 `gpt-4o` 或 `claude-3-5-sonnet`。
*   利用 System Prompt 注入當前路由感知到的 Context。例如：使用者在專案 A 的 Work Tab 時，自動將專案 A 的所有 Task、Note 內容以 Context 形式餵給 LLM。

#### 2. 實作 Function Calling (AI Actions)
允許 AI 在對話中主動提出並執行以下工具方法（須使用者確認）：
*   `create_task(title, priority)`
*   `summarize_notes_to_client_update()`
*   `link_project_to_company_axis()`

---

## 5. 具體開發計畫 - 路線 B：業務模組補完優先 (實施步驟)

若選擇路線 B，我們將專注於完善其餘 5 個 Placeholder 頁面的高保真前端與 mock 設計：

### 階段 5.1：商會 CRM 與公司管理模組開發 (1 週)
#### 1. 商會 CRM (`/chamber`)
*   **聯絡人列表與詳情 (`/chamber/[contactId]`)**：
    *   實作搜尋與來源篩選（例如：商會成員、外部引薦、合作夥伴）。
    *   **雙向關係圖 (Relation Network)**：利用 Canvas 或 CSS Grid 視覺化聯絡人間的連結（如：引薦人、潛在合作夥伴），並標明「我在關係中的定位」。
*   **商機漏斗看板 (`/chamber/opportunities`)**：
    *   實作看板視角 (Kanban)，可拖曳商機卡片（探索 -> 談判 -> 成交/失敗）。
*   **DM 範本庫 (`/chamber/dm-templates`)**：
    *   提供引薦範本，支援一鍵複製與關鍵字變數替換。

#### 2. 公司管理模組 (`/company`)
*   實作公司四大核心概念文件（願景、策略、節奏、方向）的 Markdown 閱讀與編輯頁面，支援 Pin 置頂。
*   提供「專案與公司主軸關聯」設定面板，展示每項工作專案對應到公司哪一個核心方向。

---

### 階段 5.2：學術研究與生活管理模組開發 (1 週)
#### 1. 學術研究 (`/research`)
*   **研究主軸詳情頁 (`/research/[threadId]`)**：
    *   多 Tab 結構設計：
        *   **想法 Tab**：紀錄學術靈感 (Concept / Hypothesis)。
        *   **文獻 Tab**：追蹤讀過的論文、網頁與工具，支援 URL 模擬抓取摘要。
        *   **里程碑 Tab**：學術推進時間節點（撰寫中 -> 投稿中 -> 已發表）。
    *   **相關研究者資料庫 (`/research/researchers`)**：記錄同領域研究者的學術機構、研究方向與關聯論文。

#### 2. 生活管理 (`/life`)
*   **生活事項循環看板 (`/life`)**：
    *   依類別（健康、個人護理、習慣、雜務）分區展示循環待辦，強調「週期屬性」與「上次完成時間」，並非傳統一對一 Task。
*   **記憶牆 (`/life/memories`)**：
    *   以動態瀑布流或時間軸呈現重要回憶，支援上傳照片模擬、標記特定聯絡人與 Pin 精選。

---

### 階段 5.3：財務管理模組開發 (0.5 週)
#### 1. 內外帳明細與記帳表單 (`/finance`)
*   實作記帳表單，支援一鍵切換「內帳 (Internal)」與「外帳 (External)」。
*   提供專案關聯下拉選單，讓每筆收支可綁定特定工作專案以精算專案利潤率。

#### 2. 收支分析圖表與匯出
*   整合 `recharts` 庫，設計「月度收支趨勢折線圖」與「支出分類比例圓餅圖」。
*   提供「CSV 匯出模擬」按鈕，觸發前端檔案下載。

---

## 6. 資料庫模型 (Types) 擴充預覽

為了讓下一階段的資料架構更加嚴謹，在此預先設計 CRM、Research 及 Finance 模組的核心型別 (`src/types/...`)：

```typescript
// ─── 商會 CRM 模組型別 ───────────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  source: string;              // chamber | referral | event
  isShared: boolean;           // true = 夥伴共同可見
  notes?: string;              // 關係洞察（私人筆記）
  createdAt: string;
}

export interface ContactRelation {
  id: string;
  contactAId: string;
  contactBId: string;
  relationType: "partner" | "collab" | "referral" | "friend";
  myRole?: string;             // 我在此關係中扮演的角色
  notes?: string;
}

// ─── 學術研究模組型別 ───────────────────────────────────────────────
export interface ResearchThread {
  id: string;
  title: string;
  description?: string;
  status: "exploring" | "active" | "writing" | "published";
  workLinkage?: string;        // 與實際工作專案的關聯說明
  createdAt: string;
}

export interface ResearchMaterial {
  id: string;
  threadId: string;
  title: string;
  url?: string;
  body?: string;               // 摘錄內容
  type: "paper" | "book" | "article" | "tool";
}

// ─── 財務管理模組型別 ───────────────────────────────────────────────
export interface FinanceRecord {
  id: string;
  type: "income" | "expense";
  ledger: "internal" | "external"; // 內帳 / 外帳
  category: string;                // 薪資、外包、授權費、伺服器...
  amount: number;
  currency: string;                // TWD | USD
  projectId?: string;              // 關聯工作專案
  occurredAt: string;              // 記帳日期
  description?: string;
}
```

---

## 7. 決策與下一步行動建議

> [!IMPORTANT]
> **我們目前站在從前端 Mock 邁向完整系統的十字路口。**
> *   如果您希望**儘快將系統投入真實生活使用**，並體驗真實 AI 面板的聰明回覆，建議選擇 **【路線 A：後端持久化優先】**。
> *   如果您希望**優先把所有版圖拼湊完整**，在本地向他人展示一個無瑕疵、無延遲的 Personal OS 全模組演示，建議選擇 **【路線 B：業務模組補完優先】**。

請告知您偏好哪一條路線，我們將立即針對該路線生成詳細的實作任務清單 (`task.md`) 並開始執行！
