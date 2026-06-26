# 個人結構化管理系統 — 技術需求書

**專案名稱：** Personal OS（個人作業系統）

**技術棧：** Next.js 14 (App Router) + Supabase

**文件版本：** v1.0

**最後更新：** 2026-05-05

---

## 目錄

1. [專案概述](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#1-%E5%B0%88%E6%A1%88%E6%A6%82%E8%BF%B0)
2. [技術架構](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#2-%E6%8A%80%E8%A1%93%E6%9E%B6%E6%A7%8B)
3. [資料庫設計（Supabase）](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#3-%E8%B3%87%E6%96%99%E5%BA%AB%E8%A8%AD%E8%A8%88supabase)
4. [模組需求](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#4-%E6%A8%A1%E7%B5%84%E9%9C%80%E6%B1%82)
   * 4.1 工作管理
   * 4.2 商會 CRM
   * 4.3 公司管理
   * 4.4 財務管理
   * 4.5 學術研究
   * 4.6 生活管理
5. [認證與權限](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#5-%E8%AA%8D%E8%AD%89%E8%88%87%E6%AC%8A%E9%99%90)
6. [前端頁面規劃（Next.js）](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#6-%E5%89%8D%E7%AB%AF%E9%A0%81%E9%9D%A2%E8%A6%8F%E5%8A%83nextjs)
7. [API 路由設計](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#7-api-%E8%B7%AF%E7%94%B1%E8%A8%AD%E8%A8%88)
8. [非功能性需求](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#8-%E9%9D%9E%E5%8A%9F%E8%83%BD%E6%80%A7%E9%9C%80%E6%B1%82)
9. [開發階段規劃](https://claude.ai/chat/2e6652f6-9aad-4cbb-8e2f-571287bc7c3f#9-%E9%96%8B%E7%99%BC%E9%9A%8E%E6%AE%B5%E8%A6%8F%E5%8A%83)

---

## 1. 專案概述

### 1.1 目標

建構一個跨工作、學術與個人生活的整合式個人管理系統，主要目標為：

* 降低在不同角色（工作者、研究者、個人）之間切換的認知負荷
* 集中管理專案進度、交付物、關係、研究與生活事項
* 支援內部（私人）與外部（對客戶/夥伴公開）兩種資訊層次
* 保存重要想法、資料、關係脈絡與個人回憶

### 1.2 使用者角色

| 角色        | 說明                                         |
| ----------- | -------------------------------------------- |
| `owner`   | 系統唯一擁有者（即本人），擁有全部讀寫權限   |
| `partner` | 商會夥伴，僅能讀寫商會共用模組中被授權的部分 |
| `client`  | 客戶，僅能讀取特定專案的公開交付內容         |

---

## 2. 技術架構

### 2.1 技術棧概覽

```
前端：Next.js 14 (App Router, TypeScript, Tailwind CSS)
後端：Next.js Route Handlers + Supabase Edge Functions
資料庫：Supabase (PostgreSQL)
認證：Supabase Auth (Email / Magic Link / Google OAuth)
儲存：Supabase Storage（附件、文件、圖片）
即時功能：Supabase Realtime（商會共用模組）
部署：Vercel（前端）+ Supabase Cloud（後端）
```

### 2.2 專案目錄結構

```
/
├── app/
│   ├── (auth)/                  # 登入、註冊頁面
│   ├── (dashboard)/             # 主要功能模組（需登入）
│   │   ├── work/                # 工作管理
│   │   ├── chamber/             # 商會 CRM
│   │   ├── company/             # 公司管理
│   │   ├── finance/             # 財務管理
│   │   ├── research/            # 學術研究
│   │   └── life/                # 生活管理
│   ├── client/[token]/          # 客戶公開頁面（無需登入）
│   └── api/                     # Route Handlers
├── components/
│   ├── ui/                      # 共用元件
│   └── modules/                 # 各模組元件
├── lib/
│   ├── supabase/                # Supabase client / server helpers
│   └── utils/                   # 工具函式
└── supabase/
    ├── migrations/              # 資料庫 Migration 檔
    └── functions/               # Edge Functions
```

---

## 3. 資料庫設計（Supabase）

> 所有資料表預設啟用  **Row Level Security (RLS)** ，確保資料存取安全。

### 3.1 共用基礎表

#### `profiles`（使用者資料）

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'owner',  -- owner | partner | client
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tags`（跨模組標籤）

```sql
CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT,
  module     TEXT,  -- work | research | life | company | chamber | finance
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `attachments`（附件，對應 Supabase Storage）

```sql
CREATE TABLE attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id),
  entity_type  TEXT NOT NULL,   -- project | research | contact | task | ...
  entity_id    UUID NOT NULL,
  file_name    TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.2 工作管理模組

#### `projects`（專案）

```sql
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  client_name  TEXT,
  status       TEXT DEFAULT 'active',  -- active | paused | completed | archived
  visibility   TEXT DEFAULT 'internal', -- internal | client_shared
  client_token TEXT UNIQUE,  -- 供客戶存取的唯一 token（visibility = client_shared 時產生）
  started_at   DATE,
  due_at       DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `project_tasks`（專案待辦）

```sql
CREATE TABLE project_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID REFERENCES projects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT,
  status       TEXT DEFAULT 'todo',  -- todo | in_progress | done | blocked
  visibility   TEXT DEFAULT 'internal',  -- internal | client_visible
  priority     INTEGER DEFAULT 2,   -- 1=高, 2=中, 3=低
  due_at       DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `project_notes`（內部思考與工作紀錄）

```sql
CREATE TABLE project_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title      TEXT,
  body       TEXT,          -- Markdown 格式
  source     TEXT,          -- line | email | meeting | internal
  is_pinned  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `project_deliverables`（對外交付物）

```sql
CREATE TABLE project_deliverables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'draft',  -- draft | delivered | approved
  delivered_at DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.3 商會 CRM 模組

#### `contacts`（聯絡人）

```sql
CREATE TABLE contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  company      TEXT,
  title        TEXT,
  email        TEXT,
  phone        TEXT,
  source       TEXT,          -- chamber | referral | event | ...
  is_shared    BOOLEAN DEFAULT FALSE,  -- TRUE = 夥伴可見
  notes        TEXT,          -- 內部關係洞察（私人）
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `contact_relations`（關係圖：誰和誰有連結）

```sql
CREATE TABLE contact_relations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_a_id   UUID REFERENCES contacts(id) ON DELETE CASCADE,
  contact_b_id   UUID REFERENCES contacts(id) ON DELETE CASCADE,
  relation_type  TEXT,   -- partner | potential_collab | referral | ...
  my_role        TEXT,   -- 我在這段關係中的角色
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

#### `opportunities`（合作機會追蹤）

```sql
CREATE TABLE opportunities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id),
  contact_id   UUID REFERENCES contacts(id),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'exploring', -- exploring | negotiating | closed_won | closed_lost
  is_shared    BOOLEAN DEFAULT FALSE,    -- 夥伴可見
  amount       NUMERIC,
  closed_at    DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `dm_templates`（引薦 DM 範本）

```sql
CREATE TABLE dm_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES profiles(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  context     TEXT,          -- 適用情境說明
  is_shared   BOOLEAN DEFAULT FALSE,  -- 夥伴可編輯
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.4 公司管理模組

#### `company_docs`（公司核心概念文件）

```sql
CREATE TABLE company_docs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID REFERENCES profiles(id),
  type       TEXT,  -- vision | strategy | rhythm | direction | other
  title      TEXT NOT NULL,
  body       TEXT,  -- Markdown
  is_pinned  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.5 財務管理模組

#### `finance_records`（財務紀錄）

```sql
CREATE TABLE finance_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id),
  type         TEXT NOT NULL,  -- income | expense
  ledger       TEXT DEFAULT 'internal',  -- internal（內帳）| external（外帳）
  category     TEXT,
  amount       NUMERIC NOT NULL,
  currency     TEXT DEFAULT 'TWD',
  description  TEXT,
  project_id   UUID REFERENCES projects(id),  -- 可關聯專案
  occurred_at  DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.6 學術研究模組

#### `research_threads`（研究主軸）

```sql
CREATE TABLE research_threads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'exploring', -- exploring | active | writing | published | paused
  work_linkage TEXT,  -- 與工作連結的說明
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `research_ideas`（研究想法）

```sql
CREATE TABLE research_ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID REFERENCES research_threads(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  idea_type   TEXT,  -- concept | hypothesis | question | work_transfer
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `research_materials`（研究材料）

```sql
CREATE TABLE research_materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID REFERENCES research_threads(id),
  title       TEXT NOT NULL,
  url         TEXT,
  body        TEXT,
  type        TEXT,  -- paper | book | article | data | tool
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### `researchers`（相關研究者）

```sql
CREATE TABLE researchers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id),
  name         TEXT NOT NULL,
  affiliation  TEXT,
  research_area TEXT,
  profile_url  TEXT,
  relation_note TEXT,   -- 與我研究方向的關聯說明
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `researcher_papers`（研究者論文）

```sql
CREATE TABLE researcher_papers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id UUID REFERENCES researchers(id) ON DELETE CASCADE,
  thread_id     UUID REFERENCES research_threads(id),
  title         TEXT NOT NULL,
  published_at  DATE,
  url           TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### `publication_targets`（發表平台管理）

```sql
CREATE TABLE publication_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID REFERENCES research_threads(id),
  venue_name   TEXT NOT NULL,
  venue_type   TEXT,   -- conference | journal | platform | public
  deadline     DATE,
  status       TEXT DEFAULT 'considering',  -- considering | submitted | accepted | rejected
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `research_milestones`（研究節奏與里程碑）

```sql
CREATE TABLE research_milestones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID REFERENCES research_threads(id),
  title        TEXT NOT NULL,
  deliverable  TEXT,
  due_at       DATE,
  status       TEXT DEFAULT 'todo',  -- todo | in_progress | done
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `research_outputs`（轉化輸出）

```sql
CREATE TABLE research_outputs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID REFERENCES research_threads(id),
  type        TEXT,   -- slide | poster | summary | learning_path | blog
  title       TEXT NOT NULL,
  body        TEXT,
  is_public   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.7 生活管理模組

#### `life_items`（生活事項）

```sql
CREATE TABLE life_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT,  -- health | body_care | habit | finance | errand
  status       TEXT DEFAULT 'active',  -- active | snoozed | done
  recurrence   TEXT,   -- once | weekly | monthly | custom
  next_due_at  DATE,
  last_done_at DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

#### `memories`（回憶與重要片段）

```sql
CREATE TABLE memories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  body         TEXT,
  type         TEXT DEFAULT 'personal',  -- personal | friend | gift | milestone
  related_to   TEXT,    -- 關係對象姓名或標記
  occurred_at  DATE,
  is_pinned    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. 模組需求

### 4.1 工作管理

**功能需求：**

* 建立、編輯、封存專案，可標記客戶名稱、狀態、起訖日期
* 每個專案可切換「內部」或「客戶共用」視角
* 客戶共用模式下，自動產生唯一分享 token，生成公開頁面 `/client/[token]`
* 待辦事項支援優先度、到期日、狀態追蹤
* 工作紀錄支援多來源（LINE、Email、會議、內部思考）
* 交付物管理（草稿 → 已交付 → 已確認）
* 支援附件上傳（PDF、圖片、文件）

**頁面需求：**

* 專案總覽（看板或列表切換）
* 單一專案詳情（含任務、紀錄、交付物 Tab）
* 客戶公開頁面（無需登入，含 token 驗證）

---

### 4.2 商會 CRM

**功能需求：**

* 聯絡人管理（個人可見 / 夥伴可見 切換）
* 關係圖：記錄兩人之間的關係類型與我的角色
* 合作機會追蹤（商機漏斗：探索 → 洽談 → 成交/失敗）
* DM 範本共同建立（owner 可設為「夥伴可見並共同編輯」）
* 夥伴協作：partner 角色使用者可讀寫被授權的商機與 DM

**頁面需求：**

* 聯絡人列表（支援搜尋、篩選來源）
* 聯絡人詳情（含關係圖、關聯商機）
* 商機看板（Kanban 依狀態排列）
* DM 範本庫

---

### 4.3 公司管理

**功能需求：**

* 建立公司核心文件（願景、策略、節奏、當前方向）
* 文件支援 Markdown 撰寫與 Pin 置頂
* 關聯工作專案，了解哪些專案對應公司哪條主軸

**頁面需求：**

* 公司主頁（Pin 置頂文件 + 最新動態）
* 文件編輯頁

---

### 4.4 財務管理

**功能需求：**

* 分內帳（internal）與外帳（external）登記
* 收入 / 支出分類登記
* 可關聯至特定專案
* 月度 / 季度收支摘要圖表
* CSV 匯出

**頁面需求：**

* 財務總覽（圖表：收支趨勢、分類佔比）
* 財務紀錄列表（可篩選帳類、時間、類別）
* 新增/編輯紀錄表單

---

### 4.5 學術研究

**功能需求：**

* 多研究主軸管理，每個主軸獨立追蹤
* 每個主軸可記錄：想法、材料、相關研究者 & 論文、發表目標、里程碑、轉化輸出
* 研究主軸與工作模組的連結說明
* 發表目標管理（研討會 / 期刊 / 平台，含截止日）
* 研究者資料庫：記錄誰在做類似研究、他們的論文
* 里程碑進度追蹤（待辦 → 進行中 → 完成）
* 轉化輸出管理：簡報、海報、摘要、學習路徑等

**頁面需求：**

* 研究主軸總覽
* 單一研究主軸詳情（多 Tab：想法 / 材料 / 研究者 / 發表目標 / 里程碑 / 輸出）
* 研究者資料庫頁面

---

### 4.6 生活管理

**功能需求：**

* 生活事項管理（非傳統待辦，強調週期性與身體照顧）
* 支援週期性事項（週、月、自訂）與下次提醒日期
* 標記最後完成日期
* 回憶與重要片段記錄（支援對象、日期、Pin 置頂）
* 回憶支援附件（照片）

**頁面需求：**

* 生活事項看板（依類別分區：健康、身體照顧、習慣、雜務）
* 回憶牆（依時間或關係對象瀏覽）

---

## 5. 認證與權限

### 5.1 認證方式

使用 Supabase Auth，支援：

* Email + Password
* Magic Link（無密碼登入）
* Google OAuth（選配）

### 5.2 RLS 政策設計原則

```sql
-- 範例：projects 表的 RLS
-- owner 可讀寫自己的專案
CREATE POLICY "owner_all" ON projects
  FOR ALL USING (auth.uid() = owner_id);

-- client 可透過 token 讀取公開專案
CREATE POLICY "client_read" ON projects
  FOR SELECT USING (
    visibility = 'client_shared'
    AND client_token = current_setting('app.client_token', TRUE)
  );
```

### 5.3 客戶公開頁面設計

* 路徑：`/client/[token]`
* Next.js Server Component 於 server side 驗證 token
* 不需要 Supabase Auth session
* 僅讀取 `visibility = 'client_shared'` 的專案資料及其 `client_visible` 任務與交付物

### 5.4 商會夥伴權限

* partner 角色透過邀請 email 建立帳號
* RLS 依 `is_shared = TRUE` 控制 partner 可讀寫的資料範圍

---

## 6. 前端頁面規劃（Next.js）

### 6.1 路由架構

```
app/
├── page.tsx                        # 首頁 / 重導向至 dashboard
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (dashboard)/
│   ├── layout.tsx                  # 含側邊導覽列
│   ├── page.tsx                    # Dashboard 首頁（每日概覽）
│   ├── work/
│   │   ├── page.tsx                # 專案總覽
│   │   └── [projectId]/page.tsx    # 單一專案詳情
│   ├── chamber/
│   │   ├── page.tsx                # 聯絡人列表
│   │   ├── [contactId]/page.tsx    # 聯絡人詳情
│   │   ├── opportunities/page.tsx  # 商機看板
│   │   └── dm-templates/page.tsx   # DM 範本庫
│   ├── company/page.tsx
│   ├── finance/page.tsx
│   ├── research/
│   │   ├── page.tsx                # 研究主軸總覽
│   │   ├── [threadId]/page.tsx     # 研究主軸詳情
│   │   └── researchers/page.tsx    # 研究者資料庫
│   └── life/
│       ├── page.tsx                # 生活事項
│       └── memories/page.tsx       # 回憶牆
└── client/
    └── [token]/page.tsx            # 客戶公開頁面（無需登入）
```

### 6.2 Dashboard 首頁（每日概覽）

應顯示：

* 今日到期任務（工作 + 研究里程碑）
* 生活事項提醒（近期到期）
* 最近更新的專案
* 快速新增入口（任務、紀錄、想法）

---

## 7. API 路由設計

採用 Next.js Route Handlers，搭配 Supabase Server Client（`createServerClient`）。

### 7.1 工作模組

| Method | 路徑                         | 說明                         |
| ------ | ---------------------------- | ---------------------------- |
| GET    | `/api/projects`            | 取得所有專案                 |
| POST   | `/api/projects`            | 新增專案                     |
| GET    | `/api/projects/[id]`       | 取得單一專案（含任務、紀錄） |
| PATCH  | `/api/projects/[id]`       | 更新專案                     |
| DELETE | `/api/projects/[id]`       | 刪除/封存專案                |
| POST   | `/api/projects/[id]/share` | 產生客戶分享 token           |
| GET    | `/api/client/[token]`      | 取得客戶公開專案資料         |

### 7.2 商會 CRM

| Method    | 路徑                             | 說明            |
| --------- | -------------------------------- | --------------- |
| GET       | `/api/contacts`                | 聯絡人列表      |
| POST      | `/api/contacts`                | 新增聯絡人      |
| GET/PATCH | `/api/contacts/[id]`           | 取得/更新聯絡人 |
| POST      | `/api/contacts/[id]/relations` | 新增關係連結    |
| GET/POST  | `/api/opportunities`           | 商機列表/新增   |
| PATCH     | `/api/opportunities/[id]`      | 更新商機狀態    |

### 7.3 財務

| Method | 路徑                     | 說明                     |
| ------ | ------------------------ | ------------------------ |
| GET    | `/api/finance/records` | 財務紀錄列表（支援篩選） |
| POST   | `/api/finance/records` | 新增紀錄                 |
| GET    | `/api/finance/summary` | 收支摘要（月/季）        |
| GET    | `/api/finance/export`  | CSV 匯出                 |

### 7.4 研究

| Method    | 路徑                                      | 說明              |
| --------- | ----------------------------------------- | ----------------- |
| GET/POST  | `/api/research/threads`                 | 研究主軸列表/新增 |
| GET/PATCH | `/api/research/threads/[id]`            | 研究主軸詳情/更新 |
| POST      | `/api/research/threads/[id]/milestones` | 新增里程碑        |
| GET/POST  | `/api/research/researchers`             | 研究者資料庫      |

---

## 8. 非功能性需求

### 8.1 效能

* 首頁 Dashboard 應於 1.5 秒內完成 LCP
* 列表頁使用分頁（每頁 20 筆）搭配 Infinite Scroll 或 Pagination
* 大量資料查詢使用 Supabase 索引優化

### 8.2 安全性

* 所有資料表啟用 RLS
* API Route 驗證 Supabase Session Token
* 客戶公開頁面使用 HMAC signed token，設定有效期（可選）
* 環境變數敏感資訊不得提交至版本控制

### 8.3 離線與資料韌性

* 本期不實作 PWA 離線功能，但頁面應有 Loading Skeleton 避免閃爍
* Supabase Realtime 僅用於商會協作模組，其餘模組使用一般 fetch

### 8.4 響應式設計

* 支援桌面（1280px+）與手機（390px+）
* Dashboard 側邊欄在手機上收合為底部導航或 Drawer

### 8.5 可維護性

* 使用 TypeScript 並為所有 Supabase 資料表生成型別（`supabase gen types`）
* 資料庫變更透過 Migration 檔管理（`supabase db diff`）

---

## 9. 開發階段規劃

### Phase 1 — 核心骨架（2 週）

* Supabase 專案建立、Auth 設定、基礎 RLS
* Next.js 路由架構、Layout、認證流程
* Dashboard 首頁框架
* 資料庫 Migration：profiles, tags, attachments

### Phase 2 — 工作管理（2 週）

* 專案 CRUD + 任務管理
* 工作紀錄與交付物
* 客戶公開頁面（token 機制）

### Phase 3 — 研究管理（2 週）

* 研究主軸 + 想法 + 材料
* 里程碑追蹤
* 研究者資料庫 + 發表目標

### Phase 4 — 商會 CRM（1.5 週）

* 聯絡人 + 關係圖
* 商機看板
* DM 範本（含夥伴共用）

### Phase 5 — 財務 + 公司 + 生活（2 週）

* 財務紀錄 + 圖表 + CSV 匯出
* 公司核心文件
* 生活事項 + 回憶牆

### Phase 6 — 整合與優化（1 週）

* Dashboard 每日概覽整合各模組資料
* 效能優化、RLS 全面審查
* 手機響應式調整

---

*本需求書為初版，可依實際開發進度與使用回饋持續更新。*
