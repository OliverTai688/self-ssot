# Personal OS — 第一階段開發計劃

**目標：前端頁面模擬（Frontend Simulation）**

**文件版本：** v1.0
**建立日期：** 2026-05-05
**技術棧：** Next.js 16.2.4 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts

---

## 目錄

1. [第一階段定義與邊界](#1-第一階段定義與邊界)
2. [技術基礎注意事項（Next.js 16）](#2-技術基礎注意事項nextjs-16)
3. [整體路由架構](#3-整體路由架構)
4. [App Shell（外殼與導覽）](#4-app-shell外殼與導覽)
5. [Mock 資料層設計](#5-mock-資料層設計)
6. [頁面清單與 UI 規格](#6-頁面清單與-ui-規格)
   - 6.1 認證頁面
   - 6.2 Dashboard 首頁
   - 6.3 Inbox（快速捕捉）
   - 6.4 工作管理
   - 6.5 商會 CRM
   - 6.6 公司管理
   - 6.7 財務管理
   - 6.8 學術研究
   - 6.9 生活管理
   - 6.10 客戶公開頁面
   - 6.11 Settings / Admin 頁面
7. [共用元件清單](#7-共用元件清單)
8. [開發優先順序與週程安排](#8-開發優先順序與週程安排)
9. [完成標準（Definition of Done）](#9-完成標準definition-of-done)

---

## 1. 第一階段定義與邊界

### 1.1 目標

以 **Mock 靜態資料** 驅動所有頁面，完整呈現系統所有模組的 UI、欄位、按鈕與操作流程，不連接真實後端或 Supabase。

重點是讓每個頁面**「看起來真實、操作得起來」**，為後續後端整合建立明確的 UI 合約。

### 1.2 第一階段包含

| 項目 | 說明 |
|------|------|
| App Shell | Sidebar 導覽、Header、麵包屑、主題切換 |
| 全部 6 個功能模組 | 工作、商會、公司、財務、研究、生活 |
| Inbox 快速捕捉 | Cmd+K 浮動輸入、Inbox 整理頁 |
| Admin / Settings | 所有設定頁面含完整欄位與按鈕 |
| 客戶公開頁面 | 無需登入的對外交付頁面模擬 |
| 認證頁面 | Login、Signup（UI only） |

### 1.3 第一階段**不包含**

- 真實資料庫讀寫（Supabase）
- 認證邏輯（Auth Session）
- API Route 整合
- 檔案上傳到 R2 / Storage
- LINE Bot、Whisper、OCR 整合
- PWA / 推播

---

## 2. 技術基礎注意事項（Next.js 16）

> 依 AGENTS.md 指示，開發前須確認 `node_modules/next/dist/docs/` 文件，以下為關鍵差異重點。

### 2.1 Breaking Changes（vs Next.js 14）

| 項目 | 說明 |
|------|------|
| **async params / searchParams** | Page / Layout 的 `params` 與 `searchParams` 已完全非同步，必須加 `await`。 |
| **Turbopack 為預設** | `next dev` 自動使用 Turbopack；自訂 webpack config 將導致 build 失敗，需改用 `--webpack` 旗標或遷移至 Turbopack config。 |
| **`default.js` 必填** | Parallel Routes 的每個 slot 現在必須提供 `default.js`。 |
| **移除 AMP** | AMP 完全移除。 |
| **移除 `next lint`** | 使用 ESLint CLI 直接執行（現有 `eslint.config.mjs` 即正確設定）。 |
| **移除 `serverRuntimeConfig` / `publicRuntimeConfig`** | 改用環境變數（`process.env`）。 |
| **Image 元件** | 本機圖片含 query string 需額外 config；`minimumCacheTTL` 預設從 60s 升至 4 小時。 |

### 2.2 App Router 寫法規範

```typescript
// ✅ Next.js 16 正確寫法：params 必須 await
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  // ...
}

// ❌ 不能直接解構（會 TypeScript error）
export default async function ProjectPage({ params: { projectId } }) {}
```

### 2.3 元件策略

- **預設 Server Component**：Layout、靜態頁面、資料顯示
- **`'use client'` 只在需要時加**：useState、事件處理、瀏覽器 API
- Sidebar 狀態（展開/收合）→ Client Component
- 表格排序、Filter → Client Component
- 靜態卡片、統計數字 → Server Component（Phase 1 可先全用 Client，後續優化）

---

## 3. 整體路由架構

```
src/app/
├── page.tsx                              # → redirect to /dashboard
├── (auth)/
│   ├── layout.tsx                        # 置中卡片 layout（無 Sidebar）
│   ├── login/page.tsx
│   └── signup/page.tsx
│
├── (dashboard)/
│   ├── layout.tsx                        # Sidebar + Header 共用 layout
│   ├── page.tsx                          # Dashboard 首頁（每日概覽）
│   │
│   ├── inbox/
│   │   └── page.tsx                      # Inbox 整理頁
│   │
│   ├── work/
│   │   ├── page.tsx                      # 專案總覽
│   │   └── [projectId]/
│   │       └── page.tsx                  # 單一專案詳情
│   │
│   ├── chamber/
│   │   ├── page.tsx                      # 聯絡人列表
│   │   ├── [contactId]/
│   │   │   └── page.tsx                  # 聯絡人詳情
│   │   ├── opportunities/
│   │   │   └── page.tsx                  # 商機看板
│   │   └── dm-templates/
│   │       └── page.tsx                  # DM 範本庫
│   │
│   ├── company/
│   │   ├── page.tsx                      # 公司主頁（文件總覽）
│   │   └── [docId]/
│   │       └── page.tsx                  # 文件編輯頁
│   │
│   ├── finance/
│   │   ├── page.tsx                      # 財務總覽（圖表）
│   │   └── records/
│   │       └── page.tsx                  # 財務紀錄列表
│   │
│   ├── research/
│   │   ├── page.tsx                      # 研究主軸總覽
│   │   ├── [threadId]/
│   │   │   └── page.tsx                  # 研究主軸詳情
│   │   └── researchers/
│   │       └── page.tsx                  # 研究者資料庫
│   │
│   ├── life/
│   │   ├── page.tsx                      # 生活事項看板
│   │   └── memories/
│   │       └── page.tsx                  # 回憶牆
│   │
│   └── settings/
│       ├── layout.tsx                    # Settings 子導覽 layout
│       ├── page.tsx                      # → redirect to /settings/profile
│       ├── profile/page.tsx              # 個人資料
│       ├── integrations/page.tsx         # 整合設定
│       ├── storage/page.tsx              # 儲存設定
│       ├── notifications/page.tsx        # 通知設定
│       ├── partners/page.tsx             # 夥伴管理
│       └── export/page.tsx              # 資料匯出
│
└── client/
    └── [token]/
        └── page.tsx                      # 客戶公開頁面（無需登入）
```

---

## 4. App Shell（外殼與導覽）

### 4.1 Sidebar 結構

使用 shadcn/ui `Sidebar` 元件（v0.9+ 加入），支援 collapsible + mobile sheet。

```
[Logo / Personal OS]
─────────────────────
▶ Dashboard
─────────────────────
工作
  ↳ 專案總覽
學術研究
  ↳ 研究主軸
  ↳ 研究者資料庫
商會 CRM
  ↳ 聯絡人
  ↳ 商機看板
  ↳ DM 範本
公司管理
財務管理
  ↳ 財務總覽
  ↳ 紀錄列表
生活管理
  ↳ 生活事項
  ↳ 回憶牆
─────────────────────
Inbox [badge: 5]
─────────────────────
設定
使用者頭像 / 暗黑模式切換
```

### 4.2 Header（頂部）

- 麵包屑導覽（Breadcrumb）
- Cmd+K 快速捕捉按鈕
- 通知鈴（Bell icon，Phase 1 靜態）
- 使用者選單

### 4.3 Cmd+K 快速捕捉

- 全域鍵盤快捷鍵：`Cmd+K`（Mac）/ `Ctrl+K`（Win）
- 浮動 Modal Dialog：文字輸入 → 送出後顯示「已加入 Inbox」toast
- 支援選擇目標模組（工作 / 研究 / 生活 / 商會）
- Phase 1：送出後更新 Inbox 的 mock 資料計數

---

## 5. Mock 資料層設計

### 5.1 目錄結構

```
src/lib/mock/
├── index.ts              # 統一 re-export
├── mock-projects.ts
├── mock-contacts.ts
├── mock-opportunities.ts
├── mock-dm-templates.ts
├── mock-company-docs.ts
├── mock-finance.ts
├── mock-research.ts
├── mock-researchers.ts
├── mock-life.ts
├── mock-memories.ts
└── mock-inbox.ts
```

### 5.2 型別來源

Phase 1 直接在 `src/types/` 建立與 PRD 資料庫設計對應的 TypeScript interface，無需生成 Supabase types。後端整合時直接替換成 `supabase gen types` 產生的型別。

```typescript
// src/types/work.ts 範例
export interface Project {
  id: string
  name: string
  description?: string
  client_name?: string
  status: 'active' | 'paused' | 'completed' | 'archived'
  visibility: 'internal' | 'client_shared'
  client_token?: string
  started_at?: string  // ISO date
  due_at?: string
  created_at: string
  updated_at: string
}
```

### 5.3 Mock 資料原則

- 每個模組準備 **5–10 筆** 具代表性的假資料（不同狀態、不同欄位填充程度）
- 所有 Mock 資料以 `const` 陣列匯出，不用任何 state management
- 表單送出後只顯示 Toast 通知，不真正寫入（Phase 1）
- 列表支援前端 filter / sort（對 mock 資料操作）

---

## 6. 頁面清單與 UI 規格

### 6.1 認證頁面

#### `/login`

| 元素 | 說明 |
|------|------|
| Logo + 系統名稱 | Personal OS |
| Email 輸入框 | |
| 密碼輸入框 | 含顯示/隱藏切換 |
| 登入按鈕 | Primary，填滿 |
| Magic Link 登入 | 次要按鈕 |
| Google 登入 | OAuth 按鈕（Phase 1 disabled 含 tooltip） |
| 「前往 Signup」連結 | |

#### `/signup`

| 元素 | 說明 |
|------|------|
| 全名輸入 | |
| Email 輸入 | |
| 密碼 + 確認密碼 | |
| 建立帳號按鈕 | |
| 「已有帳號？登入」 | |

---

### 6.2 Dashboard 首頁（`/dashboard`）

**目的：** 每天打開系統的第一個視圖，快速掌握今日狀態。

#### 版面結構

```
[上方] 歡迎標題 + 今日日期
[統計列] 4 個 StatCard：
  - 進行中專案數
  - 本週到期任務數
  - 待處理 Inbox 數
  - 近期生活事項提醒數

[左欄 - 65%]
  - 今日到期任務（工作 + 研究里程碑）
    → 每筆含：專案名稱、任務名稱、狀態 Badge、到期日
    → 操作：標記完成（checkbox）、跳轉專案

  - 最近更新的專案（最多 5 筆）
    → ProjectCard：名稱、客戶、狀態、最後更新、進度 bar

[右欄 - 35%]
  - 生活事項提醒（近 7 天到期）
    → 每筆含：事項名稱、類別 Badge、距今天數
  - 快速新增（Quick Add）
    → 4 個 icon button：新增任務、新增想法、新增聯絡人、新增紀錄
```

---

### 6.3 Inbox（`/inbox`）

**目的：** 所有快速捕捉的內容在這裡被整理分流。

#### 版面結構

```
[Header] Inbox [count badge]  右側：「全部標記已處理」按鈕
[Filter bar] 狀態篩選：全部 / 未分類 / 已歸檔
[列表] 每筆 Inbox Item：
  ├── 來源圖示（LINE / Email / 手動 / 語音）
  ├── 內容摘要（最多 2 行）
  ├── 預測模組 Badge（工作 / 研究 / 商會 / 生活）
  ├── 時間戳
  └── 操作列：
      [歸入模組 ▾] [標記之後再說] [刪除]
      歸入模組下拉選單：工作 / 研究 / 商會 / 生活 / 公司 / 財務
```

---

### 6.4 工作管理

#### `/work` — 專案總覽

```
[PageHeader] 工作專案
  操作按鈕：[+ 新增專案]  [看板 / 列表 切換]

[篩選列] 狀態：全部 / 進行中 / 暫停 / 完成 / 封存
         排序：最近更新 / 到期日 / 名稱

[看板模式] 4 欄：進行中 / 暫停 / 完成 / 封存
  每張 ProjectCard 含：
  - 客戶名稱（Badge）
  - 專案名稱（粗體）
  - 狀態 Badge
  - 任務進度 bar（已完成 / 總計）
  - 到期日（紅色若過期）
  - 「客戶分享」icon（若 visibility = client_shared）
  - 操作：[進入] [更多 ▾ → 暫停/封存/刪除]

[列表模式] TanStack Table：
  欄位：名稱 / 客戶 / 狀態 / 任務進度 / 到期日 / 建立日 / 操作

[新增專案 Dialog]
  欄位：名稱* / 客戶名稱 / 說明 / 起始日 / 預計完成日 / 可見性（內部/客戶分享）
  按鈕：[取消] [建立專案]
```

#### `/work/[projectId]` — 專案詳情

```
[PageHeader] 專案名稱  [客戶 Badge]
  操作按鈕：[編輯] [產生客戶分享連結] [封存] [更多 ▾]

[Tab 列] 任務 | 紀錄 | 交付物 | 附件

────── Tab：任務 ──────
[+ 新增任務]  [篩選：全部/待辦/進行/完成/阻塞]
任務列表（可拖拉重排）：
  ├── Checkbox（點擊標記完成）
  ├── 任務名稱
  ├── 狀態 Badge（todo/in_progress/done/blocked）
  ├── 優先度（高🔴/中🟡/低🟢）
  ├── 可見性（Internal / 客戶可見 Eye icon）
  ├── 到期日
  └── 操作：[編輯] [刪除]

新增/編輯任務 Sheet（右側滑出）：
  欄位：標題* / 說明（Markdown） / 狀態 / 優先度 / 可見性 / 到期日

────── Tab：紀錄 ──────
[+ 新增紀錄]
紀錄列表（時間序）：
  ├── 來源 Badge（LINE / Email / 會議 / 內部）
  ├── 標題 + 內容（Markdown 渲染）
  ├── 固定 Pin icon
  ├── 時間戳
  └── 操作：[編輯] [Pin/Unpin] [刪除]

新增紀錄 Dialog：
  欄位：標題 / 來源 / 內容（Textarea Markdown）/ Pin

────── Tab：交付物 ──────
[+ 新增交付物]
表格欄位：名稱 / 說明 / 狀態（draft/delivered/approved）/ 交付日 / 操作

────── Tab：附件 ──────
[上傳附件 按鈕]（Phase 1：disabled + tooltip「後端整合後啟用」）
附件列表：檔名 / 大小 / 上傳時間 / 操作（下載/刪除）
```

---

### 6.5 商會 CRM

#### `/chamber` — 聯絡人列表

```
[PageHeader] 商會 CRM
  操作按鈕：[+ 新增聯絡人]  [匯入名片]（Phase 1 disabled）

[搜尋 + 篩選列]
  搜尋框（姓名/公司/Email）/ 來源篩選 / 共用狀態篩選

[資料表] TanStack Table：
  欄位：頭像 / 姓名 / 公司 / 職稱 / 來源 Badge / 共用 icon / 最後互動 / 操作

每列操作：[查看詳情] [快速引薦 DM] [更多 ▾]

[新增聯絡人 Dialog]
  欄位：姓名* / 公司 / 職稱 / Email / 電話 / 來源 / 備注（私人洞察）/ 是否共用
```

#### `/chamber/[contactId]` — 聯絡人詳情

```
[Left Sidebar - 30%]
  頭像（佔位圖）+ 姓名（大字）+ 職稱
  標籤：公司 / Email / 電話 / 來源
  [編輯資料] 按鈕
  [引薦 DM] 按鈕（開啟範本選擇）

[Main - 70%]
  Tab：關係圖 | 互動紀錄 | 關聯商機 | 私人洞察

  ────── Tab：關係圖 ──────
  此聯絡人與其他人的關係列表：
    ├── 關係對象（另一聯絡人卡片）
    ├── 關係類型 Badge（夥伴/潛在合作/引薦...）
    ├── 我的角色
    └── 備注
  [+ 新增關係] 按鈕

  ────── Tab：互動紀錄 ──────
  時間軸形式：見面/訊息/引薦/會議
  [+ 記錄互動]

  ────── Tab：關聯商機 ──────
  此聯絡人的所有商機（引用商機看板資料）
  [+ 新增商機]

  ────── Tab：私人洞察 ──────
  私人備注 Markdown 編輯器（owner only）
```

#### `/chamber/opportunities` — 商機看板

```
[PageHeader] 商機看板
  按鈕：[+ 新增商機]

[Kanban Board] 4 欄：
  探索中 | 洽談中 | 已成交 | 已失去

  每張商機卡：
  ├── 標題
  ├── 聯絡人（頭像 + 姓名）
  ├── 金額（若有）
  ├── 共用 icon（夥伴可見）
  └── 快速操作：[移至下一階段] [更多 ▾]

  拖拉功能（Phase 1 可先用按鈕操作替代）

[新增商機 Dialog]
  欄位：標題* / 聯絡人（Select）/ 說明 / 金額 / 預計成交日 / 共用給夥伴
```

#### `/chamber/dm-templates` — DM 範本庫

```
[PageHeader] DM 範本
  按鈕：[+ 新增範本]

[範本列表] Grid 2欄：
  每張範本卡：
  ├── 標題 + 適用情境說明
  ├── 範本內容預覽（截斷）
  ├── 共用 Badge（若 is_shared）
  └── 操作：[複製文字] [編輯] [刪除]

[新增/編輯範本 Dialog]
  欄位：標題* / 適用情境說明 / 範本內容（Textarea，支援 {姓名} 變數提示）/ 是否共用給夥伴

[引薦 DM 生成器 Dialog]（從聯絡人頁進入）
  - 選擇引薦對象 A、對象 B
  - 選擇範本
  - 系統自動填入雙方姓名、公司
  - [複製文字] 按鈕
```

---

### 6.6 公司管理（`/company`）

```
[PageHeader] 公司管理
  按鈕：[+ 新增文件]

[Pin 置頂區] 最多 3 份置頂文件卡片：
  每張：類型 Badge（願景/策略/節奏/方向）/ 標題 / 最後更新 / [查看/編輯]

[全部文件列表] 依類型分組或表格：
  欄位：類型 / 標題 / 建立日 / 最後更新 / Pin 狀態 / 操作

[新增文件 Dialog]
  欄位：類型（Select：vision/strategy/rhythm/direction/other）/ 標題* / 是否置頂

[文件詳情頁 `/company/[docId]`]
  [PageHeader] 文件標題  [編輯] [Pin/Unpin] [刪除]
  Markdown 渲染區（Phase 1：靜態顯示）
  未來加：Markdown 編輯器（@uiw/react-md-editor 或 textarea）
```

---

### 6.7 財務管理

#### `/finance` — 財務總覽

```
[StatCard 列] 4 張：
  本月收入 | 本月支出 | 本月淨額 | 年度累積淨額

[Tab] 圖表 | 紀錄列表

────── Tab：圖表 ──────
[篩選列] 期間：本月 / 上季 / 本年  帳類：全部 / 內帳 / 外帳

[BarChart] Recharts：月度收支趨勢（月份 x 軸，金額 y 軸，收入/支出雙 bar）
[PieChart] Recharts：支出分類佔比（小圓餅圖）
[LineChart] Recharts：現金流趨勢（累積淨額）

────── Tab：紀錄列表 ──────
（與 /finance/records 相同，見下）
```

#### `/finance/records` — 財務紀錄

```
[PageHeader] 財務紀錄
  按鈕：[+ 新增紀錄]  [匯出 CSV]（Phase 1：下載假 CSV）

[篩選列]
  日期範圍 / 類型（收入/支出）/ 帳類（內帳/外帳）/ 類別 / 關聯專案

[TanStack Table] 欄位：
  日期 / 類型 Badge / 帳類 Badge / 類別 / 說明 / 金額 / 關聯專案 / 操作

[新增/編輯紀錄 Dialog]
  欄位：
  - 類型* （收入 / 支出）
  - 帳類* （內帳 / 外帳）
  - 金額*（數字 + 幣別，預設 TWD）
  - 日期*
  - 類別（Select 含預設選項：餐費/交通/軟體/薪資/客戶收款/...）
  - 說明
  - 關聯專案（Select，可選）
  - 附件收據（Phase 1：disabled + tooltip）
  按鈕：[取消] [儲存]
```

---

### 6.8 學術研究

#### `/research` — 研究主軸總覽

```
[PageHeader] 學術研究
  按鈕：[+ 新增研究主軸]

[StatCard 列] 3 張：進行中主軸數 / 近期截止 CFP 數 / 待完成里程碑數

[研究主軸 Grid] 2欄卡片：
  每張卡：
  ├── 主軸標題（大字）
  ├── 狀態 Badge（exploring/active/writing/published/paused）
  ├── 說明摘要（2行）
  ├── 與工作連結 icon（若有 work_linkage）
  ├── 里程碑進度 bar（done / total）
  ├── 最近截止 CFP（若有）
  └── [進入主軸] [更多 ▾]

[新增研究主軸 Dialog]
  欄位：標題* / 說明 / 狀態 / 與工作的連結說明
```

#### `/research/[threadId]` — 研究主軸詳情

```
[PageHeader] 主軸標題  [狀態 Badge]
  按鈕：[編輯主軸] [更多 ▾]

[Tab 列] 想法 | 材料 | 研究者 | 發表目標 | 里程碑 | 輸出

────── Tab：想法 ──────
[+ 新增想法]
卡片列表（Masonry or 時間序）：
  ├── 想法類型 Badge（概念/假設/問題/工作轉化）
  ├── 標題 + 內容
  └── 操作：[編輯] [刪除]

新增想法 Dialog：類型 / 標題* / 內容（Textarea）

────── Tab：材料 ──────
[+ 新增材料]
表格：類型 Badge（論文/書/文章/資料/工具）/ 標題 / URL / 說明摘要 / 操作

新增材料 Dialog：類型 / 標題* / URL / 說明摘要

────── Tab：研究者 ──────
[+ 新增關聯研究者]
卡片列表：研究者姓名 / 機構 / 研究領域 / 與我研究的關聯說明
點擊跳轉到研究者資料庫詳情

────── Tab：發表目標 ──────
[+ 新增發表目標]
表格：場地名稱 / 類型（研討會/期刊/平台）/ 截止日 / 狀態 Badge / 備注 / 操作

新增發表目標 Dialog：
  場地名稱* / 類型 / 截止日 / 狀態（考慮中/已投稿/錄取/拒絕）/ 備注

────── Tab：里程碑 ──────
[+ 新增里程碑]
時間軸 + 列表：
  每項：標題 / 交付項目說明 / 到期日 / 狀態 Checkbox + Badge
  操作：[編輯] [標記完成]

────── Tab：輸出 ──────
[+ 新增輸出]
卡片：類型 Badge（簡報/海報/摘要/學習路徑/部落格）/ 標題 / 內容預覽
操作：[編輯] [設為公開] [分享連結]（Phase 1 disabled）
```

#### `/research/researchers` — 研究者資料庫

```
[PageHeader] 研究者資料庫
  按鈕：[+ 新增研究者]

[搜尋列] 搜尋名稱/機構/領域

[TanStack Table]
  欄位：姓名 / 機構 / 研究領域 / 論文數 / 關聯主軸 / 個人頁連結 / 操作

新增研究者 Dialog：
  姓名* / 機構 / 研究領域 / ORCID（選填）/ 個人頁 URL / 與我研究的關聯說明
```

---

### 6.9 生活管理

#### `/life` — 生活事項

```
[PageHeader] 生活管理
  按鈕：[+ 新增事項]

[類別看板] 橫向 scroll 或 Tab 分區：
  健康 | 身體照顧 | 習慣 | 雜務

  每個類別區塊：
  [類別標題] [該類別事項數]
  事項卡片列表：
    ├── 事項名稱（粗體）
    ├── 週期 Badge（一次/每週/每月/自訂）
    ├── 距下次到期（「3 天後」「已過期」）
    ├── 最後完成日
    └── 操作：[標記完成今天] [暫停] [編輯] [刪除]

[新增/編輯事項 Dialog]
  欄位：
  - 名稱*
  - 說明
  - 類別* （健康/身體照顧/習慣/雜務）
  - 週期（一次/每週/每月/自訂）
  - 下次到期日
  按鈕：[取消] [儲存]
```

#### `/life/memories` — 回憶牆

```
[PageHeader] 回憶
  按鈕：[+ 新增回憶]  [篩選]

[篩選列] 類型（個人/朋友/禮物/里程碑）/ 對象人名 / 年份

[回憶 Masonry Grid]
  每張回憶卡：
  ├── 類型 Badge + Pin icon（若置頂）
  ├── 標題（粗體）
  ├── 日期（年月日）
  ├── 對象（若有）
  ├── 內容摘要
  ├── 附件圖片縮圖（Phase 1：佔位圖）
  └── 操作：[查看完整] [Pin/Unpin] [編輯] [刪除]

[新增回憶 Dialog]
  欄位：標題* / 類型 / 發生日期 / 對象姓名 / 內容（Textarea）/ 是否置頂
  附件（Phase 1 disabled）
```

---

### 6.10 客戶公開頁面（`/client/[token]`）

**無需登入，模擬客戶視角。**

```
[極簡 Header] Logo + 專案名稱 + 客戶名稱（無 Sidebar）

[專案摘要] 說明 / 起訖日期 / 目前狀態

[Tab] 任務進度 | 交付物

────── Tab：任務進度 ──────
僅顯示 visibility = 'client_visible' 的任務
列表：任務名稱 / 狀態 Badge / 到期日

────── Tab：交付物 ──────
列表：交付物名稱 / 說明 / 狀態 Badge（draft/delivered/approved）/ 交付日
操作：[下載]（Phase 1：disabled）

[Footer] 「由 Personal OS 提供技術支援」
```

---

### 6.11 Settings / Admin 頁面

Settings 使用獨立的子導覽 layout（左側二層選單或頂部 Tab），不共用 Dashboard Sidebar。

#### 設定頁總覽（`/settings`）

→ 自動 redirect 到 `/settings/profile`

#### `/settings/profile` — 個人資料

| 區塊 | 欄位/按鈕 | 說明 |
|------|-----------|------|
| 頭像 | 上傳頭像（disabled Phase 1）/ 佔位圓形 | |
| 基本資料 | 全名* / Email（只讀）| |
| 密碼變更 | 現有密碼 / 新密碼 / 確認新密碼 | |
| 時區設定 | Select 選單（Asia/Taipei 預設）| |
| 語言 | Select（繁中/英文）| Phase 1 靜態 |
| 危險區 | [刪除帳號] 紅色按鈕（需二次確認 Dialog）| |

**按鈕**：[儲存變更]（每個區塊各一）

---

#### `/settings/integrations` — 整合設定

每個整合以 **SectionCard** 呈現，含狀態 Badge（已連線 / 未連線 / 設定中）。

**A. LINE Bot**

| 欄位 | 說明 |
|------|------|
| 狀態 Badge | 已連線 / 未連線 |
| Channel Access Token | 密碼型輸入（顯示/隱藏切換）|
| Webhook URL | 系統自動產生（只讀 + 複製按鈕）|
| 群組設定 | 列表：群組名稱 / 觸發模式（全訊息/僅 @Bot）/ 目標模組 |
| | [+ 新增群組] 按鈕 |
| Bot 指令說明 | 摺疊區塊，列出 `/work` `/research` `/life` `/contact` |
| 按鈕 | [儲存設定] [測試連線] [斷開連線]（若已連線）|

**B. Google Calendar**

| 欄位 | 說明 |
|------|------|
| 狀態 Badge | 已授權 / 未授權 |
| 授權按鈕 | [連結 Google 帳號]（Phase 1：點擊顯示 toast「後端整合後啟用」）|
| 行事曆選擇 | Multi-Select：選擇要同步的行事曆（已授權後顯示）|
| Webhook 刷新頻率 | Select：即時 / 每小時 / 手動 |
| 比對規則 | 說明文字：「事件標題中包含客戶名稱時自動關聯專案」|
| 按鈕 | [儲存] [手動同步] [撤銷授權]（已授權才顯示）|

**C. Google Drive / Docs**

| 欄位 | 說明 |
|------|------|
| 狀態 Badge | |
| 授權按鈕 | [連結 Google Drive]（同上 Phase 1 disabled）|
| 同步文件列表 | 已納管的 Google Docs 列表：標題 / 最後同步時間 / [移除] |
| | [+ 新增 Google Doc] 按鈕（輸入 URL）|
| 同步頻率 | Select：每日 / 手動 |
| 按鈕 | [儲存] [立即同步]|

**D. Email Forward**

| 欄位 | 說明 |
|------|------|
| 專屬 Inbox Email | 系統產生的 email address（只讀 + 複製按鈕）|
| | 格式：`inbox@{user-id}.personal-os.app` |
| 附件 OCR | Toggle：自動 OCR 附件 PDF |
| 寄件者比對 | Toggle：自動比對寄件者與聯絡人 |
| 使用說明 | 摺疊區塊：如何在 Gmail 設定轉寄規則 |

**E. arXiv / 學術資料**

| 欄位 | 說明 |
|------|------|
| 關鍵字追蹤 | Tag Input：輸入關鍵字，系統定期查詢新論文 |
| 自動抓取 | Toggle：開啟後每週自動帶入新論文到研究主軸 |
| OpenAlex 整合 | Badge：公開 API（無需授權）|
| DOI / Crossref | Badge：公開 API（無需授權）|

---

#### `/settings/storage` — 儲存設定

**A. Cloudflare R2**

| 欄位 | 說明 |
|------|------|
| Account ID | Text Input（密碼型）|
| Access Key ID | Text Input（密碼型）|
| Secret Access Key | Text Input（密碼型）|
| Bucket 名稱列表 | 3 個 Input：私有 bucket / 公開 bucket / 備份 bucket |
| 自訂端點 | Text Input（選填）|
| 狀態 | [測試連線] 按鈕 → Toast 顯示連線結果（Phase 1 模擬）|
| 按鈕 | [儲存設定] |

**B. OCR 設定**

| 欄位 | 說明 |
|------|------|
| OCR 提供者 | Radio：Google Vision API / Tesseract（本機）/ 關閉 |
| Google Vision API Key | 若選 Google Vision：Text Input（密碼型）|
| 高敏感資料 | Toggle：「醫療/財務文件不送外部 OCR API」|

**C. Cloudflare Stream（影片）**

| 欄位 | 說明 |
|------|------|
| Account ID | Text Input |
| API Token | Text Input（密碼型）|
| Customer Subdomain | Text Input（用於播放 URL）|
| 按鈕 | [儲存設定] [測試連線] |

**D. 儲存用量**

| 區塊 | 說明 |
|------|------|
| Supabase Storage | 進度條：已用 / 上限（模擬數字）|
| Cloudflare R2 | 文字顯示（Phase 1 靜態）|
| Cloudflare Stream | 文字顯示（Phase 1 靜態）|
| 按鈕 | [查看詳細用量]（disabled Phase 1）|

---

#### `/settings/notifications` — 通知設定

**A. LINE Notify**

| 欄位 | 說明 |
|------|------|
| 狀態 Badge | |
| LINE Notify Token | Text Input（密碼型）|
| 通知類型 | Checkbox 列表：任務到期 / 生活事項提醒 / CFP 截止 / Inbox 累積提醒 |
| 提前提醒時間 | Select：當天 / 1天前 / 3天前 / 7天前 |
| 按鈕 | [儲存] [測試通知]（傳送一則測試訊息）|

**B. Email Digest**

| 欄位 | 說明 |
|------|------|
| 啟用 | Toggle |
| 頻率 | Radio：每日 / 每週一 |
| 發送時間 | Time Picker（預設 08:00）|
| 包含內容 | Checkbox：今日任務 / 本週里程碑 / 生活提醒 / Inbox 統計 |
| 按鈕 | [儲存] [立即發送測試 Digest]（Phase 1 disabled）|

**C. PWA Push**

| 欄位 | 說明 |
|------|------|
| 啟用 | Toggle（Phase 1：點擊顯示「需要瀏覽器通知權限」提示）|
| 通知安靜時段 | Time Range：從 22:00 到 08:00（不通知）|

---

#### `/settings/partners` — 夥伴管理

```
[PageHeader] 夥伴管理
  說明文字：「夥伴可存取商會共用模組中被授權的資料。」

[邀請夥伴區塊]
  欄位：Email*
  按鈕：[發送邀請]（Phase 1：Toast 顯示「已模擬發送邀請」）

[現有夥伴列表] TanStack Table：
  欄位：頭像 / 姓名 / Email / 狀態 Badge（已接受/待接受）/ 加入日 / 操作

操作欄 Dropdown：
  [查看可存取資料範圍]
  [移除夥伴]（二次確認 Dialog）

[共用範圍設定]
  說明：哪些資料型別夥伴可看
  Checkbox 列表：
  ✅ 商機（is_shared = true）
  ✅ 聯絡人（is_shared = true）
  ✅ DM 範本（is_shared = true）
  ❌ 私人關係洞察（永遠隱藏）
  ❌ 內帳財務資料（永遠隱藏）
  按鈕：[儲存範圍設定]
```

---

#### `/settings/export` — 資料匯出

```
[PageHeader] 資料匯出
  說明：「你的資料屬於你。任何時候都可以完整匯出。」

[全量匯出]
  說明：包含所有模組的 JSON/CSV 資料 + 附件清單 + Schema
  格式說明區塊（摺疊）：data.json / attachments/ 目錄說明 / schema.sql
  按鈕：[匯出全部資料]（大型 Primary 按鈕）
  → Phase 1：Toast 顯示「已將匯出任務加入佇列（後端整合後啟用）」

[模組個別匯出] 表格：
  | 模組 | 格式 | 操作 |
  | 工作專案 | JSON + CSV | [匯出] |
  | 商會聯絡人 | JSON + vCard | [匯出] |
  | 財務紀錄 | CSV | [匯出] |
  | 研究主軸 | JSON + BibTeX | [匯出] |
  | 生活事項 | JSON | [匯出] |
  | 所有附件清單 | CSV（含 URL）| [匯出] |

[影片下載連結]
  說明：Cloudflare Stream 影片提供 30 天有效下載連結
  按鈕：[產生影片下載清單]（Phase 1 disabled）

[帳號資料刪除]
  說明文字：「Hard Delete 將永久清除所有資料，符合 GDPR 要求。」
  按鈕：[申請永久刪除帳號]（紅色，開啟三步驟確認 Dialog）
```

---

## 7. 共用元件清單

### 7.1 已有（`src/components/ui/`）

- Button、Badge、Card、Checkbox、Dialog、Dropdown Menu
- Form、Input、Label、Select、Separator、Sheet、Tabs
- Table、Textarea、Tooltip、Empty State、Stat Card、Section Card

### 7.2 需新增

**Layout 元件（`src/components/layout/`）**

| 元件 | 說明 |
|------|------|
| `app-sidebar.tsx` | shadcn Sidebar 主元件，含各模組導覽項目 |
| `app-header.tsx` | 麵包屑 + Cmd+K + 通知 + 用戶選單 |
| `settings-nav.tsx` | Settings 子導覽（垂直 Tab 列）|
| `quick-capture-modal.tsx` | Cmd+K 浮動輸入框 |

**模組元件（`src/components/modules/`）**

```
work/
  project-card.tsx        # 看板卡片
  project-list-row.tsx    # 列表列
  task-item.tsx           # 任務列項
  deliverable-item.tsx    # 交付物列項

chamber/
  contact-card.tsx        # 聯絡人小卡
  opportunity-card.tsx    # 商機看板卡
  dm-template-card.tsx    # DM 範本卡

finance/
  finance-chart.tsx       # Recharts 包裝元件
  record-row.tsx          # 財務紀錄列

research/
  thread-card.tsx         # 研究主軸卡
  milestone-item.tsx      # 里程碑時間軸項

life/
  life-item-card.tsx      # 生活事項卡
  memory-card.tsx         # 回憶卡
```

**表格包裝（`src/components/tables/`）**

- `data-table-shell.tsx` 已有，確認支援排序 / 篩選 / 分頁

**通用 UI**

| 元件 | 說明 |
|------|------|
| `kanban-board.tsx` | 通用 Kanban（商機看板、可能用於工作）|
| `markdown-renderer.tsx` | 靜態 Markdown HTML 渲染 |
| `status-badge.tsx` | 依 status string 自動選色的 Badge |
| `copy-button.tsx` | 複製文字到剪貼簿 + icon 切換 |
| `confirm-dialog.tsx` | 通用二次確認對話框 |

---

## 8. 開發優先順序與週程安排

### 第 1 週：骨架 + Dashboard + Inbox

| 任務 | 說明 |
|------|------|
| 1-1 | 建立完整路由結構（所有 page.tsx 空殼）|
| 1-2 | `app-sidebar.tsx` + `app-header.tsx` + Dashboard layout |
| 1-3 | Mock 資料層建立（所有模組 mock files + TypeScript types）|
| 1-4 | Dashboard 首頁（StatCard + 今日任務 + 最近專案 + 生活提醒）|
| 1-5 | Inbox 頁面（列表 + 歸類操作）|
| 1-6 | Cmd+K Quick Capture Modal |

### 第 2 週：工作 + 研究 + 商會

| 任務 | 說明 |
|------|------|
| 2-1 | 工作模組：`/work`（看板 + 列表）+ 新增 Dialog |
| 2-2 | 工作模組：`/work/[projectId]`（4 Tabs 完整）|
| 2-3 | 研究模組：`/research`（主軸總覽）+ 新增 Dialog |
| 2-4 | 研究模組：`/research/[threadId]`（6 Tabs 完整）|
| 2-5 | 研究模組：`/research/researchers` |
| 2-6 | 商會 CRM：`/chamber`（聯絡人列表）|
| 2-7 | 商會 CRM：`/chamber/[contactId]`（聯絡人詳情 4 Tabs）|
| 2-8 | 商會 CRM：`/chamber/opportunities`（商機看板）|
| 2-9 | 商會 CRM：`/chamber/dm-templates` + DM 生成器 |

### 第 3 週：財務 + 公司 + 生活 + Settings + Client

| 任務 | 說明 |
|------|------|
| 3-1 | 財務：`/finance`（圖表 Dashboard）|
| 3-2 | 財務：`/finance/records`（紀錄列表 + Dialog）|
| 3-3 | 公司：`/company` + `/company/[docId]` |
| 3-4 | 生活：`/life`（類別看板）|
| 3-5 | 生活：`/life/memories`（回憶牆）|
| 3-6 | Settings layout + `/settings/profile` |
| 3-7 | Settings：`/settings/integrations`（4 個整合區塊）|
| 3-8 | Settings：`/settings/storage` |
| 3-9 | Settings：`/settings/notifications` |
| 3-10 | Settings：`/settings/partners` |
| 3-11 | Settings：`/settings/export` |
| 3-12 | 客戶公開頁面：`/client/[token]`（極簡對外視圖）|
| 3-13 | 認證頁面：`/login` + `/signup` |

---

## 9. 完成標準（Definition of Done）

Phase 1 全部頁面通過以下標準才算完成：

### UI 完整性

- [ ] 所有列表頁：有資料顯示、有空狀態（Empty State）
- [ ] 所有 Dialog / Sheet：欄位完整、取消按鈕可關閉、送出按鈕顯示 Toast
- [ ] 所有操作按鈕：可點擊、有視覺反饋（或 disabled 含 Tooltip 說明原因）
- [ ] Cmd+K 可在任意頁面觸發

### Admin / Settings 完整性

- [ ] 每個設定頁面有完整欄位與按鈕
- [ ] Phase 1 disabled 的功能：有 Tooltip 說明「後端整合後啟用」
- [ ] 所有「測試連線」「儲存設定」按鈕有 Toast 反饋

### 響應式

- [ ] 桌面（1280px+）：Sidebar 展開
- [ ] 平板（768px–1279px）：Sidebar 可收合
- [ ] 手機（390px+）：Sidebar 收起為底部 Drawer 或 Sheet

### 程式碼品質

- [ ] TypeScript 無 `any`，所有 mock 資料有明確型別
- [ ] 所有 dynamic route page 使用 `await params`（Next.js 16 規範）
- [ ] 沒有 console error / warning
- [ ] 暗黑模式正常顯示

---

## 附錄：Settings 欄位速查表（Button & Field Matrix）

| 頁面 | 主要按鈕 | 主要欄位 |
|------|---------|---------|
| profile | 儲存變更、刪除帳號 | 全名、Email（RO）、密碼、時區、語言 |
| integrations/LINE | 儲存、測試連線、斷開 | Token、Webhook URL（RO）、群組列表 |
| integrations/Calendar | 連結帳號、儲存、手動同步、撤銷 | 行事曆選擇、刷新頻率 |
| integrations/Drive | 連結帳號、儲存、立即同步 | Doc 列表、同步頻率 |
| integrations/Email | 複製 inbox address | 附件 OCR Toggle、比對 Toggle |
| integrations/arXiv | 儲存 | 關鍵字 Tags、自動抓取 Toggle |
| storage/R2 | 儲存、測試連線 | Account ID、Access Key、Secret Key、3×Bucket名 |
| storage/OCR | 儲存 | 提供者 Radio、API Key、高敏感 Toggle |
| storage/Stream | 儲存、測試連線 | Account ID、API Token、Subdomain |
| notifications/LINE | 儲存、測試通知 | Notify Token、通知類型 Checkbox、提前時間 |
| notifications/Email | 儲存 | 啟用 Toggle、頻率 Radio、時間、包含內容 Checkbox |
| notifications/PWA | 儲存 | 啟用 Toggle、安靜時段 |
| partners | 發送邀請、儲存範圍 | 邀請 Email、共用範圍 Checkbox |
| export | 匯出全部、各模組匯出、永久刪除 | 格式說明（靜態顯示）|

---

*本計劃專注於前端視覺與互動模擬，後端整合將在 Phase 2 開始逐模組銜接。*
*文件與系統同步更新，以實際完成進度為準。*
