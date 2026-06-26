# Personal OS 下一階段開發計畫

**文件版本：** v2.0
**建立日期：** 2026-05-26
**適用範圍：** 目前 `self-stucture-v1` 專案現況
**文件層級：** Primary PRD-level planning document，與 `P-PRD-001-personal-os-technical-prd.md` 同等重要
**核心判斷：** 專案已經不是純前端原型。下一階段應先做「資料庫、權限、Server Actions、Mock UX」的收斂，而不是直接堆更多新模組頁面。

---

## 1. 現況摘要

### 1.1 技術棧

| 類別 | 目前狀態 |
|---|---|
| Framework | Next.js 16.2.4 App Router, React 19 |
| UI | Tailwind CSS 4, Base UI wrapper components, lucide-react, Recharts, React Flow |
| Data | Prisma 7.8.0, PostgreSQL adapter, `pg` Pool |
| DB schema | `prisma/schema.prisma` 已包含 Profile、Work、Research、Workflow、Academic People 等模型 |
| Seed | `prisma/seed.ts` 已能把 Work mock project/task/note/deliverable 寫入 DB |
| Auth | Supabase SSR path and explicit dev mock mode are in place; `AUTH-006` adds `pnpm auth:proof` for no-secret session/Profile proof collection, while real `AUTH-005` session/Profile smoke remains blocked by missing Supabase public env/session |
| State | Work 部分讀 DB，Research/Ingestion/Workflow/Life 大多仍在 React state 或 localStorage |

### 1.2 已完成或接近完成的產品能力

| 模組 | 現況 |
|---|---|
| Frontstage | `/` 已改為 public-safe owner entry，不再盲目導向或顯示 scaffold；只呈現 Personal OS 身分、受保護 owner login 入口、settings/admin 入口、Client Portal token-only 邊界與安全 `/auth/status` handoff |
| Settings / Admin | `/settings` 與 `/admin` 都是 protected dashboard routes；`ADMIN-002` 已加入 shared read-only audit BFF contract，顯示 auth、module permission、loop evidence、write boundary；`AGENT-007` 已加入 protected read-only Agent Protocol readiness contract，顯示 AgentFacts-lite coverage、validation、trust gates、external registration blockers；不新增 user/permission/env/deploy/audit writes 或 public agent directory |
| Dashboard | 早安簡報 UI 已完成，但資料來源仍是 `mockMorningBriefCards` |
| Work | `/work` 與 `/work/[projectId]` 已可從 DB 讀 project、task、note、deliverable；詳情頁有 Pulse、Work、Client 三個 tab |
| Work UI | 任務、紀錄、交付物、客戶分享邊界、Timeline、Pulse metadata 等體驗已相當完整 |
| Client page | `CLIENT-001` gated implementation active：`/client/[token]` 仍預設 fail closed，但已有 server-only DB-backed BFF loader；只有 `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB=1` 且 token/project/task/deliverable visibility checks 通過時才會渲染 client-visible DTO，不再讀 mock data |
| Research | 已從 thread-centered 原型演進成 Research Object Network 的多頁工作台，含 issue、source、writing、event、people、graph |
| Workflow | 已有 Agent registry、rule builder、flow visualizer、audit trail UI 與 workflow engine，但資料仍是 mock |
| Ingestion | 已有多源匯入、keyword triage、proposal、evidence、workflow dispatch 的 mock pipeline |
| Life | 已有 Fitness dashboard 與生活狀態 context，但資料未入 DB |
| Chamber / Finance / Company | 仍是 placeholder 頁面 |
| Module permission | 初始 dashboard/settings/admin 已使用 server-only hybrid `ModulePermissionSnapshot`，由 role defaults 疊加 `UserModulePermission` rows；browser override 仍只是 rehearsal，不是授權 |

### 1.3 資料庫現況

`prisma/schema.prisma` 已建立相當完整的正式模型：

- `Profile`, `UserModulePermission`
- `Project`, `ProjectTask`, `ProjectNote`, `ProjectDeliverable`
- `ResearchThread`, `ResearchSource`, `ResearchConcept`, `ResearchWritingProject`, `ResearchWritingSection`, `AIFeedbackRun`, `ResearchDigest`, `ResearchEvent`, `AcademicPerson`
- `WorkflowRule`, `AgentMessage`

初始盤點時，資料庫層有幾個需要優先修正的風險：

1. `supabase/migrations/20260520000000_init.sql` 與 `prisma/schema.prisma` 已經明顯不同步，仍需 `DB-005` 釐清 legacy/remote reconciliation 策略。
2. `prisma.config.ts` 指向 `prisma/migrations`，此風險已由 `DB-002` 建立 baseline migration、`DB-006` fresh bootstrap verification 收斂。
3. Supabase migration 使用 lowercase enum values，Prisma schema 使用 uppercase enum values。v0.1 已決定 Prisma uppercase canonical，但既有 Supabase DB 仍需人工 reconciliation。
4. Supabase migration 內開了 `uuid-ossp`，但 schema 使用 `gen_random_uuid()`；Prisma baseline 已加入 `pgcrypto`，legacy Supabase SQL 仍是 drift。
5. RLS policy 依賴 `auth.uid()`，但應用目前用 Prisma direct connection 和 mock auth，RLS 不會自然承接使用者身份。

### 1.4 2026-06-03 DB Foundation Update

DB Contract Stabilization 已完成一輪 closed-loop 收斂：

- `DB-001`：Prisma schema / migration strategy 已批准，`prisma/schema.prisma` 是 v0.1 canonical DB source。
- `DB-002`：baseline Prisma migration 已建立於 `prisma/migrations/20260602155517_baseline_initial_schema/migration.sql`。
- `DB-003`：`prisma/seed.ts` 已改成 deterministic UUID + upsert，避免重複建立 Work demo rows。
- `DB-004`：uppercase Prisma enum values 繼續作為 v0.1 canonical enum strategy。
- `DB-006`：已在 disposable local PostgreSQL 驗證 `migrate + seed + seed + build + validate`。

DB-006 驗證後，Work demo seed row counts 穩定為：

| Table | Count |
|---|---:|
| `profiles` | 1 |
| `projects` | 5 |
| `project_tasks` | 17 |
| `project_notes` | 12 |
| `project_deliverables` | 15 |

剩餘 DB 風險集中在 `DB-005`：legacy Supabase SQL migration 仍需確認 archive / reference / remote reconciliation 策略；不可把 baseline migration 直接套到既有遠端資料庫。

---

## 2. 下一階段策略

### 推薦方向：資料流收斂優先

下一階段不要先補 Chamber / Finance / Company 的完整 UI。這些頁面可以排在後面，因為目前最大的風險不是「功能不夠多」，而是：

- DB schema 已經長出來，但 migration 不穩。
- Server Actions 已經存在，但 UI 大多沒有接上。
- Auth、權限、客戶分享頁還沒有真實資料邊界。
- Research UI 的 network model 與 Prisma 的 thread model 尚未完全對齊。
- Ingestion 與 Workflow 已有概念，但沒有持久化 audit trail。

因此下一階段的核心目標是：

1. 建立可信的 DB migration 與 seed 流程。
2. 讓 Work 模組完成真實 CRUD 閉環。
3. 將公開客戶頁改成真實 DB 查詢。
4. 讓 auth / module permission 從 mock 與 localStorage 轉向正式資料。
5. 決定 Research network model 的正式 DB 形狀。
6. 將 Ingestion → Workflow → Module write 串成最小可用 pipeline。
7. 新增 Agent Team OS 作為 AI agent 身份、技能、邊界、審計與未來跨 agent 協作的治理層。
8. 新增 Interface / Data / Governance Data Operations Layer，讓多來源輸入、AI conversation data、lineage、write intent、approval 與 operation habit analytics 有可追蹤的發展路徑。
9. 新增 Source Asset / Document Attribute Layer，讓 Google Doc、Markdown、HTML/web page、Drive file、上傳文件、圖片、影片、音源、連結、LINE/Telegram 訊息、CSV/JSON/API response 與 TickTick-like actionable document 使用同一套來源身分、屬性、snapshot、extraction、task proposal 與 module write intent 契約。
10. 新增 AI Source Workflow Operating Layer，讓每次來源整理都有 run record、review item、早安簡報回報、@mention correction workflow 與可觀察工作台，而不是把 AI 匯入頁做成單純資料管理 UI。

### 2.1 Interface / Data / Governance Data Operations Layer

參考 `docs/dev/D-PLAN-010-interface-data-governance-plan.md`，下一階段新增一條跨模組資料操作層。這不是新的 runtime marketplace，也不是現在就要加很多 DB table；它是讓「使用者與 AI 互動產生的資料」能被看見、追蹤、審核、轉寫到正式模組的產品與資料契約。

核心分層：

| Layer | 責任 |
|---|---|
| Interface | 顯示 raw input、normalized content、evidence、proposal、decision、module write intent、agent context preview |
| Data | 定義 external source、raw intake、normalized content、evidence、proposal workspace、module SSOT、governance ledger |
| Governance | 記錄 transformation run、lineage、approval、user decision、operation event、attribute focus signal、agent context package |

已建立的批次任務編號：

| Task id | Title | Status | 下一步 |
|---|---|---|---|
| `DATA-001` | Define interface/data/governance development plan | DONE | 已產生 D-PLAN-010 |
| `DATA-002` | Propose cross-source data operations persistence contract | TODO | DB-006 已完成，可作為 schema proposal，不直接 migrate |
| `DATA-003` | Add visual lineage prototype to AI Input / Inbox | TODO | 可先做 UI-only/mock，不改 DB |
| `DATA-004` | Define governance event and operation habit analytics contract | TODO | 高風險資料與 approval boundary 需先文件化 |
| `DATA-005` | Implement Work-first module write intent loop | TODO | 等 `WORK-001` / `WORK-002` 穩定後再做 |

### 2.2 Source Asset / Document Attribute Layer

文件、媒體、連結、HTML 與資料集需要比一般 raw source 多一層屬性層。參考 `docs/architecture/document_attribute_layer.md`，下一階段應把「來源身分」與「Personal OS 當前用途」拆開：

| 面向 | 說明 | 範例 |
|---|---|---|
| 來源身分 | source asset 的來源、格式、ID、路徑、MIME、hash、revision | Google Doc `documentId`、Drive `fileId`、repo markdown path、HTML URL、uploaded image/video/audio、CSV、JSON |
| 來源屬性 | Personal OS 現在如何使用它 | reference doc、actionable doc、mixed doc、media evidence、source link、deliverable draft、dataset |
| 執行狀態 | TickTick-like 任務層 | inbox、todo、doing、waiting、done、archived、due date、priority |
| 抽取結果 | 從來源取出的文字、結構或證據 | OCR text、audio transcript、video timecode、HTML readability text、CSV range、JSON pointer |
| 模組連結 | 來源如何進入正式模組 | Work task proposal、Research source、Client-visible deliverable、Agent context package |
| 同步關聯 | locator 與 snapshot / message 與 attachment 的關係 | `LINK` -> fetched `WEB_PAGE`、LINE message -> image/audio/link attachment |

關鍵設計判斷：

- 底層主體應命名為 `SourceAsset`，而不是只做 `DocumentObject`，避免未來排除圖片、影片、音源、HTML、連結與資料集。
- `assetKind` / `format` / `mimeType` 判斷來源是什麼；`interpretationKind` / `workflowState` 判斷 Personal OS 目前怎麼使用它。
- URL 是 locator，HTML/web page 是可 snapshot 的內容來源；bookmark 與 fetched page 應可分開保存並建立關聯。
- Link 後續可以設定為 manual / on-capture / scheduled fetch，抓到的 static HTML 應保存成獨立 `WEB_PAGE` asset，並用 `SourceFetchRun` 記錄 requested URL、final URL、canonical URL、HTTP status、content type、fetchedAt、content hash 與 robots policy。
- 不要把 actionable source item 直接等同 `ProjectTask`。
- 不要把 Google Doc / Markdown / image / video / audio / link 只當 attachment。
- 任務項可先是 `SourceActionItem`，若要寫入 Work，必須經 `ModuleWriteIntent` 與 Work service。
- 外部 Google Doc / Drive file 初期以 external reference + snapshot 為主，不做靜默覆寫。
- Markdown/repo files 可作 local canonical source，但 import/export 必須 explicit and auditable。
- 圖片 evidence 需保存 region/bounding box；影片/音源 evidence 需保存 timecode；HTML evidence 需保存 URL、fetchedAt、selector/heading/offset；CSV/JSON evidence 需保存 range 或 JSON pointer。
- LINE / Telegram 等通訊來源應以 provider adapter 匯入，保存 chat/thread id、message id、event/update id、sender metadata、timestamp、signature/dedupe 狀態；附件和訊息內 URL 需要拆成 linked source assets。

新增任務批次：

| Task id | Title | Status | 下一步 |
|---|---|---|---|
| `DATTR-001` | Define Source Asset / Document Attribute Layer contract | DONE | 已建立 `docs/architecture/document_attribute_layer.md` |
| `DATTR-002` | Propose Source Asset Registry Prisma schema | TODO | 只做 schema proposal 與 migration impact，不立即 migrate |
| `DATTR-003` | Add UI-only Source Asset / Document Attribute prototype to AI Input / Inbox | TODO | 顯示 asset kind、format、Reference / Actionable / Evidence / Mixed、Todo / Doing / Done、risk |
| `DATTR-004` | Map Google Doc / Drive / Markdown source metadata | TODO | 先用 mock adapter；對齊 Drive custom properties / labels 概念 |
| `DATTR-005` | Extend source metadata mapping to image / video / audio / HTML / link / dataset | TODO | 定義 OCR、transcript、caption、thumbnail、HTML readability、link preview、CSV/JSON path contracts |
| `DATTR-006` | Convert actionable source items into Work write intents | TODO | 依賴 `DATA-002` 與 Work service boundary |
| `DATTR-007` | Define link-to-static-HTML snapshot sync contract | TODO | link 與 fetched HTML 雙 asset、fetch audit、robots policy、snapshot versioning |
| `DATTR-008` | Define LINE / Telegram messaging source adapter contract | TODO | webhook/polling、signature/dedupe、conversation/message grouping、attachment source assets |
| `DATTR-009` | Create source input surface inventory and gap analysis | DONE | 已建立 `docs/architecture/source_input_surface_inventory.md` |
| `DATTR-010` | Define SourceConnection / InputAdapter contract | DONE | 已建立 `docs/architecture/source_connection_input_adapter_contract.md`，定義 provider families、scope/consent、sync cursor、dedupe、deletion event、attachment graph、adapter lifecycle 與 BFF surfaces |
| `DATTR-011` | Define source intake security, privacy, and retention policy | TODO | URL fetch SSRF、robots/TOS、clipboard、EXIF、media consent、large files、retention |
| `DATTR-012` | Prototype source control panel input matrix | DONE | UI-only/mock，顯示來源、輸入模式、risk、sync status、next action |
| `DATTR-013` | Establish Composite Data Unit Layer | DONE | SourceAsset pool、naming normalization、AI grouping、DataUnit Composer、Research usage |
| `DATTR-014` | Optimize Single Source Recognition Layer | DONE | format detection、descriptive metadata、provenance、evidence selector、quality profile、URL/media safety |
| `DATTR-015` | Define AI Source Workflow Run Architecture | DONE | AIWorkflowRun、AIWorkItem、workflow workbench、早安簡報 anomaly layer、@mention correction |
| `DATTR-016` | Prototype AI Import Workbench UI | DONE | UI-only/mock，AI 對話 + 今日 Workflow / 需要確認 / 來源環境 / 整理結果 / 工作紀錄 |
| `DATTR-018` | Make AI Input Workbench mobile-usable | DONE | 前端先行，手機/平板可用，可收合對話來源與 AI 工作台 |
| `DATTR-019` | Redesign AI Input cowork/source panel | DONE | 前端先行，將對話來源區改成 `共作 / 來源 / 結構`，保留一進來就能 AI cowork |
| `DATTR-020` | Extend AI Input @mention target mock model | TODO | 前端先行，讓 @mention 可引用 SourceAsset、DataUnitProposal、AIWorkflowRun、AIWorkItem、MorningBriefItem |
| `DATTR-021` | Clarify AI Input reference context vs sync settings | DONE | 前端先行，改成 `AI 對話 / 參考脈絡 / 同步設定 / AI 工作台` subpage IA，工作台改表格 |
| `DATTR-022` | Redesign AI Input sync settings as external connector status | DONE | 前端先行，將同步設定改成多來源外部串接與同步狀態總覽 |
| `DATTR-023` | Add mock data kill switch and Supabase readiness gate | DONE | 前端/安全閘門，加入可隨時關閉 mock data 的切換；正式模式不顯示或建立 mock SourceAsset/workflow |
| `DATTR-024` | Persist AI Input Source Workflow data to Supabase BFF | TODO | 實體功能，將 SourceAsset、SourceConnection、AIWorkflowRun、AIWorkItem 等正式接到 Supabase-backed BFF |
| `DATTR-025` | Add AI Input formal BFF readiness contract | DONE | `DATTR-024` 前的安全橋接：正式模式讀 server-only readiness DTO，顯示 persistence 尚未啟用與禁止的 runtime 行為，不新增 schema/migration/connector/write |
| `AIINPUT-OPS-002` | Surface formal source control matrix | DONE | `DATTR-012` 的 formal-mode follow-up：正式模式顯示 source control matrix、input mode、risk、status、next action、missing permissions、boundary，不執行 connector runtime 或 DB write |
| `DATTR-017` | Define Composite Data Unit schema proposal | DONE | 已建立 `docs/dev/source_workflow_schema_proposal.md`，提出 SourceAsset、Recognition、DataUnit、AIWorkflowRun、AIWorkItem、ModuleWriteIntent schema proposal |

短期順序：`DB-006` 與 `WORK-006` 已完成，`WORK-007` 已因 Supabase DNS/connectivity 暫時 blocked。資料輸入主線已完成 `DATTR-015` workflow architecture、`DATTR-016` 桌面 UI-only/mock workbench、`DATTR-018` 手機/平板可用介面、`DATTR-019` 對話與來源結構重設計、`DATTR-021` subpage IA 釐清、`DATTR-022` 外部串接與同步狀態總覽、`DATTR-023` mock data kill switch / formal-mode readiness gate、`DATTR-017` schema proposal、`DATTR-010` adapter contract、`DATTR-025` formal readiness BFF contract，以及 `AIINPUT-OPS-002` formal source control matrix。後續所有功能先建立前端介面與 BFF-visible contract，再建立實體 persistence / connector / scheduled workflow。若要開始正式使用 AI Input，下一個核心不是更多 mock UI，而是在 `DATTR-025` 與 `AIINPUT-OPS-002` 的 server-only contract 基礎上，審核 DATTR-017 的 migration A-D，最後做 `DATTR-024` 將 SourceAsset、SourceConnection、AIWorkflowRun、AIWorkItem、DataUnitProposal 與 ModuleWriteIntent proposal 接到 Supabase-backed BFF。`DATTR-020` 仍可作為 UI-only 小步，讓 @mention 能引用 mock workflow/source/DataUnit 目標；但不要先實作未審核的 Source Asset Registry runtime persistence、DataUnit runtime persistence、Single Source Recognition runtime persistence、AIWorkflowRun persistence 或真實 connector runtime。

### 2.3 AI Source Workflow Operating Layer

AI 匯入頁不應只是「資料管理頁」或「AI 匯入表單」。新的產品定位是：

```txt
AI Source Workflow Console
```

核心心智模型：

```txt
來源環境設定
  -> 來源觸發
  -> 來源辨識
  -> 來源整理
  -> 命名 / metadata / quality / risk
  -> 資料組合建議
  -> 整理結果
  -> 異常偵測
  -> 早安簡報回報
  -> 使用者透過 AI 對話修正
  -> 再次觸發更新 workflow
```

這一層的目的，是讓來源處理變成「AI 自動整理系統 + 可觀察工作流」，而不是把所有低階 source records 攤在 UI 上。

#### 三種 workflow

| Workflow | 用途 | 範例 | 主要記錄 |
|---|---|---|---|
| Source Environment Workflow | 設定某個來源如何被 AI 處理 | LINE 商會群每日同步、預設商會模組、中風險、進早安簡報 | `SourceWorkflowConfig`, `RiskPolicy`, `MorningBriefRule` |
| Source Organizing Workflow | 每次來源觸發整理時產生 run | LINE 每日同步、Google Doc 更新、RSS 新文章、手動匯入 | `AIWorkflowRun`, `AIWorkflowStep`, `AIWorkItem` |
| Source Correction Workflow | 使用者在 AI 對話中修正 AI 理解 | `@SRC-RUN-2026-00127 先歸到商會，不要轉成工作任務` | correction run、superseded result、review log |

#### 核心資料概念

| Concept | 責任 |
|---|---|
| `AIWorkflowRun` | 一次 AI workflow 的可觀察 run record，記錄 trigger、status、summary、source/dataUnit/moduleWriteIntent refs、risk、review reason、parent/correction relation |
| `AIWorkflowStep` | run 內部的 step audit，例如 format detection、metadata extraction、naming inference、grouping inference、anomaly detection |
| `AIWorkItem` | 使用者實際需要看的 review card，例如 naming suggestion、classification suggestion、risk alert、module routing question |
| `MorningBriefItem` relation | 早安簡報只回報不確定、高風險、重要機會、整理失敗、需要決策或重要新增來源摘要 |
| `AIMentionTarget` | AI 對話中可 `@` 的對象，包含 SourceAsset、DataUnit、DataUnitProposal、AIWorkflowRun、AIWorkItem、MorningBriefItem、ModuleRecord |

#### AI 匯入頁 UI 方向

頁面主區仍是 AI 對話；右側或側邊抽屜是 AI 工作台。工作台分頁：

| Tab | 顯示內容 |
|---|---|
| 今日 Workflow | 今天跑過的 source workflow 狀態摘要 |
| 需要確認 | 只顯示 AI 不確定、高風險、需要決策的 `AIWorkItem` |
| 來源環境 | 顯示來源同步/處理規則，例如頻率、預設模組、risk、是否進早安簡報 |
| 整理結果 | 顯示 DataUnitProposal、命名建議、補充情境、模組 routing proposal |
| 工作紀錄 | 顯示近期 workflow step / event log |

UI 不應預設顯示複雜流程圖。預設應是：

```txt
狀態摘要 + 需要確認 + 最近紀錄
```

詳細 workflow 只在使用者點開時查看。

AI 匯入頁應避免同時攤開太多不同用途的區域。若用途不同，應用 subpage-like 的方式保持畫面乾淨。建議結構：

| Subpage | 目的 | 顯示內容 |
|---|---|---|
| AI 對話 | 立即開始 AI cowork | quick prompt、cowork starter、對話輸入、快速匯入 |
| 參考脈絡 | 把來源當作本次對話背景 | 已選 @context、SourceAsset pool 數量、可加入的 LINE / Drive / Research / Chamber 參考 |
| 同步設定 | 查看與設定外部來源串接和同步狀態 | LINE、Drive、Docs、RSS、Telegram、Gmail、GitHub/Markdown、手動匯入的串接狀態、同步健康度、範圍、頻率、上次/下次同步、風險與確認條件 |
| AI 工作台 | 查看 workflow 狀態與異常 | 今日 workflow、需要確認、來源環境、整理結果、工作紀錄的表格 |

設計原則：

- 使用者先說想做什麼，再逐步加入來源脈絡。
- `參考脈絡` 是 conversation context，不等於 source sync、module write 或 final module record。
- `同步設定` 是 external connector / sync status / source intake scope，不用來選擇這次對話要引用什麼。
- `AI 工作台` 應用表格/清單方式呈現 operational rows，避免 nested card。
- 手機版和桌面版使用同一套 subpage navigation，不需要另一套 mobile-only accordion。

#### 早安簡報的新角色

早安簡報變成「異常與摘要匯報層」。平常不要求使用者介入，只主動報：

- AI 無法確定的事情。
- 風險較高的事情。
- 重要機會。
- 整理失敗或部分完成。
- 需要使用者決策的事情。
- 昨天新增的重要來源摘要。
- 來源 workflow 狀態異常。

使用者可以在 AI 匯入對話中引用早安簡報項目：

```txt
@早安簡報 第 1 點
先歸到商會，並建立合作機會摘要，不要轉成工作任務。
```

系統應觸發 Source Correction Workflow，而不是把這句話當作全新來源。

#### 實作順序

| Task id | Title | Status | Scope |
|---|---|---|---|
| `DATTR-015` | Define AI Source Workflow Run Architecture | DONE | 文件 + type proposal；不新增 runtime persistence |
| `DATTR-016` | Prototype AI Import Workbench UI | DONE | UI-only/mock，建立 conversation + workflow workbench 的操作感 |
| `DATTR-018` | Make AI Input Workbench mobile-usable | DONE | 前端先行，手機/平板可用，可收合 vertical lists |
| `DATTR-019` | Redesign AI Input cowork/source panel | DONE | 前端先行，保留 AI cowork 入口並拆分 `共作 / 來源 / 結構` |
| `DATTR-020` | Extend AI Input @mention target mock model | TODO | 前端先行，讓對話可 mock 引用 workflow run、work item、DataUnit proposal、morning brief item |
| `DATTR-021` | Clarify AI Input reference context vs sync settings | DONE | 前端先行，改成 subpage IA，釐清參考脈絡 vs 同步設定，工作台改表格 |
| `DATTR-022` | Redesign AI Input sync settings as external connector status | DONE | 前端先行，讓同步設定顯示外部 connector 狀態、sync health、scope、cadence、last/next sync、risk、review condition |
| `DATTR-023` | Add mock data kill switch and Supabase readiness gate | DONE | 加入可隨時關閉 mock data 的正式模式；mock source/workflow rows 關閉後不再假裝已有正式資料 |
| `DATTR-024` | Persist AI Input Source Workflow data to Supabase BFF | TODO | 實體功能，等 schema / adapter / security / Supabase connectivity ready 後接 Supabase |
| `DATTR-025` | Add AI Input formal BFF readiness contract | DONE | server-only readiness DTO + Server Component wrapper，正式模式顯示未持久化與禁止行為，不做 schema/migration/connector/write |
| `AIINPUT-OPS-002` | Surface formal source control matrix | DONE | formal source control matrix 顯示 input mode、risk、status、next action、missing permissions、boundary；不做 connector runtime 或 DB write |
| `DATTR-017` | Define Composite Data Unit schema proposal | DONE | schema proposal 已完成，需同時納入 SourceAsset、Recognition、DataUnit、AIWorkflowRun、AIWorkItem |

明確注意：不要現在就做真實 LINE/Telegram/Gmail/Drive connector、scheduled sync、URL fetch、OCR/transcription、AIWorkflowRun Prisma migration、automatic correction write 或 module SSOT 直接寫入。

---

### 2.4 Frontend Operating Surface：前端操作邊界與模組 Agent 工作區

下一個開發大階段應加入 `Frontend Operating Surface` 軌道。這不是一般 UI 美化，而是讓每個模組的操作邊界、Agent 工作區、紀錄/審計與設定/權限清楚拆開。

核心目標：

```txt
每個模組先變成清楚可操作的前端工作面
  -> 再定義 BFF-visible contract
  -> 再建立實體 persistence / workflow / agent runtime
```

每個模組頁面都應優先回答：

```txt
現在這裡最需要注意什麼？
我可以做什麼操作？
Agent 正在建議或等待我確認什麼？
過去發生過什麼、誰批准或拒絕了什麼？
這個模組的資料邊界與可見性在哪裡？
```

共通 subpage pattern：

| Subpage | 目的 | 顯示方式 |
|---|---|---|
| `/{module}` | 模組 overview / attention / command surface | attention header + operation surface |
| `/{module}/agent` | 模組 Agent 工作區 | review queue、proposal table、boundary panel、run log |
| `/{module}/records` | 模組記錄 / audit trail | filterable table + timeline drilldown |
| `/{module}/settings` 或 `/{module}/boundaries` | 權限、可見性、風險、同步規則 | settings table / policy list |
| `/{module}/{domain-subpage}` | 模組專屬工作面 | 依模組使用 table、queue、editor、graph、timeline、kanban |

頁面 attention 原則：

- 第一視窗要能看出 1 到 3 個最重要的待處理事項。
- 不要把重要事情埋在一堆同權重 cards 裡。
- 頁面主要操作面應優先使用 table、queue、split pane、timeline、editor、graph、board、detail drawer。
- 卡片只用於重複項目或輕量摘要，不作為整頁預設結構。
- Records/audit 應使用表格、時間線、filter 與 drilldown，不用裝飾型 activity cards。
- Module Agent 工作區是治理/提案/審核區，不是玩具聊天面板。

模組結構規劃：

| Module | 主要操作面 | Agent 工作區 | Records / Audit | Boundary / Settings |
|---|---|---|---|---|
| Work | project list/detail、tasks、notes、deliverables | WorkAgent proposals, client visibility review | project/task/note/deliverable changes | client sharing, project permission |
| Research | research objects、sources、DataUnits、writing、graph | ResearchAgent source/citation/coding proposals | evidence, citation, writing changes | source sharing, citation policy |
| AI Input / Ingestion | AI conversation、source workflow、sync settings | IngestionAgent review/proposal workspace | source workflow runs, work items | source connection/sync/security |
| Workflow | rules、runs、dispatch | WorkflowAgent rule/risk review | run/audit trail | automation permissions |
| Life | reflection、health/energy context | LifeAgent low-interference suggestions | private reflection timeline | privacy, retention |
| Finance | draft queue、categorization、reports | FinanceAgent draft/review only | finance proposal and approval log | approval policy |
| Chamber | contacts、referrals、meetings、opportunities | ChamberAgent relationship/context proposals | contact/referral/meeting records | relationship privacy |
| Company | strategy、principles、initiatives、decisions | CompanyAgent strategy alignment proposals | decision log | strategy privacy |
| Client Portal | public-facing visible deliverables | internal ClientPortalAgent review only | visibility/share records | token and public data boundary |
| Agent Team OS | agent registry、skills、boundaries | Agent governance surface | agent audit | boundary policies |

新增任務批次：

| Task id | Title | Status | Scope |
|---|---|---|---|
| `FOPS-001` | Define frontend operating surface and module attention model | DONE | 建立前端操作面架構與開發計畫 |
| `FOPS-002` | Audit existing module routes against operating surface model | TODO | 盤點現有 routes，找出 attention、operation、agent、records、settings gap |
| `FOPS-003` | Prototype common module subpage navigation pattern | TODO | UI-only/mock，建立 overview / agent / records / settings pattern |
| `FOPS-004` | Prototype module Agent workspace shell | TODO | UI-only/mock，建立 agent queue、proposal table、boundary panel、run log |
| `FOPS-005` | Prototype module records/audit subpage pattern | TODO | UI-only/mock，建立 records table + timeline drilldown |
| `FOPS-006` | Refactor Work IA toward operation/agent/records boundaries | TODO | UI-first，Work module 作為第一個完整樣板 |
| `FOPS-007` | Refactor Research IA toward evidence/agent/records boundaries | TODO | UI-first，Research 對齊 source / DataUnit / citation |
| `FOPS-008` | Define placeholder module operating surfaces for Finance, Chamber, Company, and Life | TODO | UI-first，placeholder module 先變成清楚可操作殼 |

短期建議：

1. 先做 `FOPS-002` route audit。
2. 再做 `FOPS-003` common module subpage navigation。
3. 之後以 Work 或 AI Input 作為第一個 Agent workspace / Records pattern 樣板。
4. 高風險模組只做 UI boundary，不做 final writes。

---

## 3. Agent Team OS：虛擬團隊與技能治理層

Agent Team OS 是 Personal OS 的新核心架構層。它不是玩具型 chatbot，也不是單純的 prompt collection，而是用來治理 AI-native 個人作業系統裡的內部 agent、技能、規則、權限邊界與長期協作紀錄。

### 3.1 定位

| 層級 | 責任 |
|---|---|
| Workflow | 自動化規則、dispatch、執行狀態、workflow audit trail |
| Agent Team OS | agent 身份、module ownership、AGENTS.md / SKILL.md 版本、capability registry、boundary policy、human approval、外部 agent adapter |
| Module services | Work、Research、Finance 等模組自己的資料讀寫與 service-layer authorization |

Agent Team OS 不直接取代 Workflow。Workflow 是執行引擎，Agent Team OS 是治理與協作契約。

### 3.2 核心目的

- 管理 Personal OS 的虛擬團隊成員。
- 儲存與版本化 AGENTS.md-style rules。
- 儲存與版本化 SKILL.md-style workflows。
- 定義 module-specific agents。
- 定義 agent capabilities、risk level、approval requirement。
- 定義 agent 能讀取、提議、寫入或禁止接觸的模組邊界。
- 記錄 agent-to-agent communication、human approval、rejection 與 final decision。
- 為未來 NANDA / MCP / A2A-style 外部 AI agent collaboration 預留 bounded adapter。
- 允許每個專案或模組有自己的 agent，同時遵守全域治理。

### 3.3 內部 Agent 規劃

| Agent | 模組 / 範圍 | 主要能力 | 邊界 |
|---|---|---|---|
| WorkAgent | Work | 專案摘要、任務建議、client-facing deliverable 草稿、work pulse | 不可未經批准把 internal notes 暴露到 Client Portal |
| ResearchAgent | Research | 研究物件 mapping、source summary、concept linking、writing feedback | 必須保存 source ids 與 citation metadata |
| IngestionAgent | Ingestion | raw input classification、triage proposal、routing | 不可直接寫入 Finance 或 public/client-visible output |
| WorkflowAgent | Workflow | rule execution、dispatch、audit trail、automation status | 不可繞過 module-level permissions |
| LifeAgent | Life | daily reflection、health/energy context、personal observation summary | privacy-first、low-interference |
| FinanceAgent | Finance | finance draft detection、category suggestion、report preparation | 不可 finalize transaction、public report、irreversible financial decision |
| CompanyAgent | Company | strategy context、project alignment、proposal preparation、operating principles | 公司策略屬高風險資料，外部分享需批准 |
| ChamberAgent | Chamber | BNI/chamber relationship、contact context、referral tracking、meeting prep | 不可未授權擴散私人關係脈絡 |
| UIUXAgent | UI / Design | UIUX audit、visual hierarchy、component-level improvement、design iteration | 除非明確要求 redesign，僅做小型可 review 的 UI change |
| DBAgent | Database | Prisma schema review、migration consistency、seed stability、database contract docs | Phase 0 DB Contract Stabilization 必須參與 |
| AuthPermissionAgent | Auth / Permission | route guard、module permission、client visibility、app-layer authorization review | 不可降低權限或跳過 service-layer auth |
| ClientPortalAgent | Client Portal | public token strategy、client-visible boundary、sharing page UX | Client-visible data 需 human approval |

### 3.4 功能區域規劃

未來可新增 `/agents` 管理區，但不應在下一個 sprint 做完整 UI。

| Route | 用途 | 下一階段策略 |
|---|---|---|
| `/agents` | Agent Team OS overview | 先做文件與資料契約 |
| `/agents/registry` | 內部 agent registry | 可做 minimal debug/admin view |
| `/agents/skills` | SKILL.md registry 與 assignment | 先用 repo files 作 canonical source |
| `/agents/instructions` | AGENTS.md-style rules | 先做 import snapshot proposal |
| `/agents/boundaries` | boundary policy / approval matrix | 先文件化 |
| `/agents/audit` | agent message、approval、rejection audit | 先與 Workflow audit 共用或延伸 DB contract |

### 3.5 檔案系統策略

Agent Team OS 需要同時支援 repo-file source 與 DB runtime registry，但早期不要偷偷同步。

| Source | 範例 | 早期策略 |
|---|---|---|
| Repository files | `AGENTS.md`, `.codex/skills/*/SKILL.md`, `docs/agents/*.md`, `docs/dev/agent_team_os_contract.md` | canonical source |
| Database records | `AgentProfile`, `AgentSkill`, `AgentInstructionSet`, `AgentBoundaryPolicy`, `AgentMessage` | imported snapshots + runtime registry |

後續可新增 explicit sync actions：

- `importAgentInstructionsFromRepo()`
- `exportAgentInstructionsToRepo()`
- `importSkillsFromRepo()`
- `exportSkillsToRepo()`

所有 import/export 都必須可審計，不可靜默覆寫 repo files 或 DB records。

### 3.6 Agent Registry / Skill Registry / Boundary Policy / Agent Message

以下是 Prisma schema proposal。下一個 sprint 只需要完成設計與 migration impact analysis，不要急著全量實作。

| Model | 用途 | 主要欄位 |
|---|---|---|
| `AgentProfile` | 內部 agent 身份 | `id`, `key`, `name`, `description`, `moduleKey`, `agentType`, `status`, `ownerProfileId`, `defaultModelProvider`, `defaultModelName`, `createdAt`, `updatedAt` |
| `AgentCapability` | agent 能力宣告與風險 | `id`, `agentId`, `capabilityKey`, `description`, `riskLevel`, `requiresHumanApproval`, `allowedTargetModules`, `createdAt`, `updatedAt` |
| `AgentSkill` | SKILL.md workflow snapshot | `id`, `key`, `name`, `description`, `skillPath`, `skillMarkdown`, `version`, `status`, `createdAt`, `updatedAt` |
| `AgentInstructionSet` | AGENTS.md-style rules snapshot | `id`, `key`, `name`, `scope`, `markdownContent`, `version`, `appliesToModuleKey`, `sourceType`, `sourcePath`, `createdAt`, `updatedAt` |
| `AgentBoundaryPolicy` | agent-to-module / agent-to-agent 邊界 | `id`, `key`, `name`, `description`, `sourceAgentId`, `targetModuleKey`, `targetAgentId`, `allowedActions`, `blockedActions`, `requiresApprovalFor`, `dataVisibilityLevel`, `createdAt`, `updatedAt` |
| `AgentCollaborationRequest` | 內部或外部 agent collaboration request | `id`, `sourceAgentId`, `targetAgentId`, `targetExternalAgentRef`, `requestType`, `status`, `inputSummary`, `outputSummary`, `riskLevel`, `approvalStatus`, `approvedByProfileId`, `createdAt`, `updatedAt` |
| `AgentMessage` | 可延伸既有 `AgentMessage` | `sourceAgentId`, `targetAgentId`, `moduleKey`, `messageType`, `content`, `sourceIds`, `relatedResourceType`, `relatedResourceId`, `approvalStatus`, `createdAt` |
| `ExternalAgentRegistry` | 外部 agent discovery snapshot | `id`, `provider`, `externalAgentKey`, `displayName`, `endpoint`, `protocolType`, `capabilityManifest`, `trustLevel`, `status`, `createdAt`, `updatedAt` |
| `NandaBridgeConfig` | NANDA-like adapter config | `id`, `registryEndpoint`, `localAgentNamespace`, `enabled`, `trustPolicy`, `createdAt`, `updatedAt` |

建議新增 enum：

- Approval level：`AUTO_READ`, `AUTO_PROPOSE`, `HUMAN_APPROVAL_REQUIRED`, `BLOCKED`
- Risk level：`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- 高風險模組：Finance、Client Portal、Life、Company Strategy、Auth / Permission

Migration impact：

- `WorkflowRule` 可以保留現有職責。
- 現有 `AgentMessage` 可先延伸，不急著拆表；若 migration 風險較高，先新增 nullable 欄位與 indexes。
- `AgentProfile` 應先 seed 內部 agents，不與 real AI provider 綁死。
- `AgentSkill` 與 `AgentInstructionSet` 初期只存 repo snapshot，不作為隱形 source of truth。
- 外部 collaboration tables 可先設計，實作延到本地治理穩定後。

### 3.7 External Agent Collaboration / NANDA Bridge

目標是讓 Personal OS 內部 agent 未來能與外部 AI agents 協作，但仍保持嚴格邊界。這應設計成 adapter，不是第一階段硬依賴。

建議 interface：

```ts
interface AgentInteropProvider {
  discoverAgents(): Promise<ExternalAgentManifest[]>
  getAgentManifest(externalAgentId: string): Promise<ExternalAgentManifest>
  sendCollaborationRequest(input: CollaborationRequestInput): Promise<CollaborationResponse>
  verifyCapability(externalAgentId: string, capabilityKey: string): Promise<boolean>
  verifyTrustPolicy(externalAgentId: string, policyKey: string): Promise<boolean>
  revokeAccess(externalAgentId: string): Promise<void>
}
```

Protocol adapters：

- `local-internal`
- `mock-nanda`
- `mcp`
- `a2a`
- `https-webhook`

不可妥協的限制：

- 外部 agent 不可直接存取 DB。
- 外部 agent 只收到 scoped context packages。
- 每次外部 collaboration 都必須建立 `AgentCollaborationRequest`。
- Finance、Life、Client Portal、Company Strategy 對外 sharing 需要 explicit human approval。
- 外部輸出一律視為 proposal，不是 final write。
- 外部輸出必須保留 source metadata 與 risk level。

### 3.8 實作建議

Agent Team OS 應在 Phase 0 DB Contract Stabilization 期間「並行做 contract」，但不應阻塞 Phase 0 的 migration 修復，也不應搶走 Phase 1 Work CRUD 的工期。

建議順序：

1. **Phase 0A 先做文件與 schema proposal**，定義 agent governance contract。
2. **Phase 0B 建立本地 Codex team bootstrap files**，讓 repo 層先有 AGENTS.md / SKILL.md 結構。
3. **Phase 1 繼續做 Work CRUD**，只要求 agent roles 參與 review，不做完整 `/agents` UI。
4. 等 DB contract 與 Work CRUD 穩定後，再做 minimal `/agents/registry` debug view。

明確注意：不要現在就 overbuild full agent marketplace，也不要現在做完整 NANDA integration。先做 local governance、local registry、local skills、auditability。

---

## 4. Phase Plan

## Phase 0A - Agent Team OS Contract

**時間：** 1 到 2 天
**目標：** 定義內部 agents、AGENTS.md、SKILL.md、module boundaries、human approval、未來外部 collaboration 的治理與資料契約。

### 工作項目

- 建立 `docs/dev/agent_team_os_contract.md`。
- 定義 internal agent list 與 module ownership。
- 定義 AGENTS.md、SKILL.md、AgentProfile 的責任邊界。
- 定義 approval levels：
  - `AUTO_READ`
  - `AUTO_PROPOSE`
  - `HUMAN_APPROVAL_REQUIRED`
  - `BLOCKED`
- 定義 risk levels：
  - `LOW`
  - `MEDIUM`
  - `HIGH`
  - `CRITICAL`
- 定義 high-risk modules：
  - Finance
  - Client Portal
  - Life
  - Company Strategy
  - Auth / Permission
- 提出 Prisma schema additions 與 migration impact analysis。
- 明確標註哪些 model 現在只是 proposal，不進 Phase 1 implementation。

### 完成標準

- Agent Team OS contract 文件完成。
- 所有 internal agents、capabilities、boundaries 都有初版表格。
- 已決定 `AgentMessage` 是延伸現有 model 還是新增相鄰 audit model。
- 沒有 runtime behavior change。

---

## Phase 0B - Local Codex Team Bootstrap

**時間：** 1 天
**目標：** 建立初始 repo-level virtual team files，讓本地開發先有可讀、可 review、可版本化的 agent/team/skill 契約。

### 工作項目

- Create or update root `AGENTS.md`。
- Create `.codex/skills/uiux-iteration/SKILL.md`。
- Create `.codex/skills/db-contract-review/SKILL.md`。
- Create `.codex/skills/work-crud-implementation/SKILL.md`。
- Create `.codex/skills/auth-permission-review/SKILL.md`。
- Create `docs/agents/internal_agents.md`。
- Create `docs/agents/boundary_policy.md`。

### 完成標準

- Codex 可以讀 project-level `AGENTS.md`。
- UIUX、DB、Work CRUD、Auth review skills 存在為 reusable skill folders。
- Internal agent roles 與 boundary policy 已文件化。
- 沒有 runtime behavior change。

---

## Phase 0 - DB Contract Stabilization

**時間：** 2 到 3 天
**目標：** 讓 Prisma schema、migration、seed、runtime query 指向同一份真相。

**目前狀態（2026-06-03）：** `DB-001`, `DB-002`, `DB-003`, `DB-004`, `DB-006` 已完成。`DB-005` 仍保留為 legacy Supabase migration strategy review，不阻塞本機 Work CRUD 開發，但會阻塞遠端 DB reconciliation。

### 工作項目

- 建立正式 `prisma/migrations/`，用目前 `prisma/schema.prisma` 生成第一版 migration。
- 決定是否保留 `supabase/migrations/20260520000000_init.sql`：
  - 若保留，需同步到 Prisma schema。
  - 若改以 Prisma migrations 為主，需標註 Supabase migration 為 legacy 或重建。
- 修正 extension：確認 `gen_random_uuid()` 所需 extension。
- 修正 enum casing 策略：Prisma enum value、DB enum value、TypeScript view model 必須一致。
- 檢查 `prisma/seed.ts` 是否能在空 DB 上穩定執行。
- 增加一份資料契約文件：`docs/dev/database_contract.md`，記錄 schema owner、migration owner、enum casing、public token 策略。

### 完成標準

- `pnpm db:migrate` 或等價 migration 流程可從空 DB 建表。
- `pnpm db:seed` 能建立 admin profile 與 Work demo data。
- `/work` 能正常讀取 seed data。
- 沒有 Supabase SQL 與 Prisma schema 互相衝突的未解釋差異。

---

## Phase 1 - Work Module 真實 CRUD 閉環

**時間：** 1 週
**目標：** Work 成為第一個端到端真實資料模組。

**目前狀態（2026-06-21）：** `WORK-001`, `WORK-002`, `WORK-003`, `WORK-004`, `WORK-005`, `WORK-006`, `WORK-008` 已完成。Project create、Task add/toggle、Note add/pin、Deliverable create/status/visibility 均已走 canonical DB-backed Work actions。Project progress 已採用 query-derived strategy，runtime `tasksDone/tasksTotal` 由實際 `ProjectTask` rows 推導，不再信任 seed snapshot 欄位。`WORK-008` 新增 dry-run-first disposable DB proof harness；下一步仍是 `WORK-007` 端到端 browser/manual refresh 驗證。

### 工作項目

| 功能 | 目前 | 下一步 |
|---|---|---|
| Project list | 已讀 DB | 補上 create/update/delete 真正寫 DB |
| AddProjectDialog | 已接 `createProject` server action | update/delete UI 另行拆小任務 |
| TaskList | 已接 `addProjectTask`, `toggleProjectTaskComplete` | edit/delete UI 另行拆小任務；progress 已由 `WORK-006` 改成 query-derived |
| NoteTimeline | 已接 `addProjectNote`, `toggleProjectNotePin` | edit/delete UI 另行拆小任務；notes 預設不進 public page |
| DeliverableTree | 已接 `createProjectDeliverable`, `updateProjectDeliverable`, `updateProjectDeliverableVisibility` | delete / metadata edit UI 另行拆小任務；Client Portal DB filtering 已由 gated `CLIENT-001` 接住，file URL policy 已由 `CLIENT-006` review，runtime 仍排除檔案連結 |
| Project progress | 已由 task rows query derive；`WORK-008` 提供 disposable proof harness | `WORK-007` 驗證 add/toggle 後 browser/manual refresh 顯示一致 |
| AI Pulse | mock adapter | 保留 mock fallback，但把 source meta 對應到 DB ids |

### 建議調整檔案

- `src/components/work/project/add-project-dialog.tsx`
- `src/components/work/task/task-list.tsx`
- `src/components/work/note/note-timeline.tsx`
- `src/components/work/deliverable/deliverable-tree.tsx`
- `src/lib/actions/work.ts`
- `src/app/actions/work.ts`
- `src/lib/services/project.service.ts`

### 設計原則

- UI 可用 optimistic update，但失敗必須 rollback 或重新拉資料。
- 所有寫入都必須經過 `requireUser()` 與 `assertCanAccessProject()`。
- 不要讓 client component 直接知道 Prisma model shape，維持 mapper/view model 邊界。
- `src/app/actions/work.ts` 和 `src/lib/actions/work.ts` 目前職責重疊，需整理成單一 public action surface。

### Agent 參與方式

Phase 1 仍以 Work Module CRUD 為主線，Agent Team OS 只以 review / governance 方式參與，不新增完整 runtime automation。

| Agent | Phase 1 參與點 | 產出 |
|---|---|---|
| DBAgent | review migration、seed、enum casing、Prisma model consistency | DB contract notes、migration risk checklist |
| WorkAgent | review project/task/note/deliverable user flow | Work CRUD acceptance checklist |
| AuthPermissionAgent | review `requireUser()`、`assertCanAccessProject()`、module permission usage | authorization checklist |
| UIUXAgent | review `AddProjectDialog`, `TaskList`, `NoteTimeline`, `DeliverableTree` | small UI improvement proposals |
| ClientPortalAgent | review `/client/[token]` visibility and public token behavior | client data boundary checklist |

所有 agent review 都是 proposal，不直接改高風險資料，也不繞過 service-layer authorization。

### 完成標準

- 新增 project 後重整頁面仍存在。
- 新增 / 完成 task 後重整頁面仍存在。
- 新增 note、pin note 後重整頁面仍存在。
- 新增 deliverable、更新 deliverable status / visibility 後重整頁面仍存在。
- `/work/[projectId]` 的三個 tab 都以 DB 為主資料源。

---

## Phase 2 - Auth、權限與 Client Portal

**時間：** 1 週
**目標：** 把「誰能看什麼」從 mock 變成產品級邊界。

### 工作項目

- 替換 `src/lib/services/auth.service.ts` 的 mock admin。
- 建立登入頁與 dashboard route guard。
- 將 `ModulePermissionsProvider` 從 localStorage 遷移到 `UserModulePermission`。
- 明確選擇權限策略：
  - 短期建議：Prisma direct connection + app-layer authorization。
  - 中期再評估：Supabase client/RPC + RLS。
- 將 `/client/[token]` 改為 server component，直接用 gated BFF service 查詢 DB：
  - DB-backed rendering 必須明確設定 `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB=1`。
  - project 必須有有效 `clientToken` 且 `visibility = CLIENT_VISIBLE`。
  - tasks 只回傳 `visibility = CLIENT_VISIBLE`。
  - deliverables 只回傳 `visibility = CLIENT_VISIBLE`。
  - notes 預設不出現在 public page，除非之後明確開啟 client-visible notes。
- `CLIENT-001` 已完成第一段 gated DB-backed loader 與 public DTO；`CLIENT-002` 的 unavailable/noindex boundary 仍作為 disabled、invalid token、not found、DB unavailable 的 fail-closed fallback。
- `CLIENT-003` 已完成 protected readiness contract，讓 `/admin` 與 `/settings` 明確顯示 token schema/hashing、rotation/revoke、audit、public storage/file URL review、real DB token smoke 尚未完成。
- `CLIENT-004` 已完成 token schema/hashing proposal：`DBS-004` 定義 selector/verifier public token、HMAC digest storage、hash key id、unique/index behavior、revoked/rotated/last-accessed metadata、audit relation、migration impact 與 backfill strategy；runtime 仍未套 migration 或新增 token lifecycle write。
- `CLIENT-006` 已完成 public storage/file URL policy review：`AUT-004` 定義 private bucket、server-side signed URL BFF、短 TTL、no-store、revocation/cache 限制、audit 與 file safety policy；runtime 仍不輸出 file URLs、不新增 signed URL runtime。
- token lifecycle 剩餘安全切片：`CLIENT-005` owner token rotate/revoke BFF actions with audit、`CLIENT-007` real DB token smoke。

### 完成標準

- 未登入不能進 dashboard routes。
- 使用者只能讀取自己的 project。
- module visibility 由 DB 決定。
- `/client/[token]` 不再讀 mock data，並在 gate 開啟後只讀 client-visible DB records。
- Client Portal public sharing 前，admin/settings 必須顯示 token lifecycle/public-readiness gate，且 token schema/hash/audit/storage/smoke 未完成時不可宣稱可公開分享。
- 內部 note、internal task、internal deliverable 不會出現在公開頁。

---

## Phase 3 - Research DB Model 對齊

**時間：** 1 週
**目標：** 讓 Research 的新 UI 與正式 DB model 對齊。

### 現況判斷

Research UI 已經採用 `Research Object Network`：

- `ResearchIssue`
- `ResearchQuestion`
- `ResearchSource`
- `ResearchIdeaV2`
- `ResearchWritingProject`
- `ResearchEvent`
- `AcademicPerson`
- `ResearchLink`

但 Prisma schema 仍偏向 `ResearchThread` 父子模型，缺少或不完全符合：

- `ResearchIssue`
- `ResearchQuestion`
- `ResearchIdeaV2`
- `ResearchLink`
- free-standing source / writing project 的 many-to-many 關聯

### 推薦決策

以目前 UI 和文件方向為準，正式把 DB 推向 network model。不要把 UI 退回 thread-centered，因為現有 Research pages 已經明顯朝 network workspace 發展。

### 工作項目

- 新增或調整 Prisma models：
  - `ResearchIssue`
  - `ResearchQuestion`
  - `ResearchIdea`
  - `ResearchLink`
  - 必要時讓 `ResearchSource`、`ResearchWritingProject` 支援 nullable issue/thread 與 link table。
- 建立 research mapper：DB model → `src/types/research.ts` view model。
- 將 `ResearchProvider` localStorage 資料逐步替換成 server data。
- 先遷移 `/research`, `/research/issues`, `/research/sources`, `/research/writing` 四條主路徑。
- 保留 legacy `/research/[threadId]`，但標註為相容頁或導向 issue detail。

### 完成標準

- Research 首頁統計從 DB 來。
- 新增 issue/source/writing project 後重整頁面仍存在。
- graph page 的 nodes/links 從 DB 來。
- localStorage 只保留 UI preference，不再承擔資料庫角色。

---

## Phase 4 - Ingestion 與 Workflow 持久化

**時間：** 1 週
**目標：** 把 AI Input/Inbox 從 demo pipeline 變成可追蹤、可審核的資料入口。

### 工作項目

- 為 ingestion pipeline 建正式 DB models，至少包含：
  - `SourceConnection`
  - `RawSourceItem`
  - `NormalizedContent`
  - `Evidence`
  - `AITriageProposal`
  - `UserDecision`
  - `ResourceNode`
- 依 `DATTR-015` 的架構，把 AI Input/Inbox 的來源整理改成可觀察 workflow：
  - `AIWorkflowRun` 記錄每次來源整理、辨識、分組、異常與 correction run。
  - `AIWorkItem` 作為需要使用者確認的 review card。
  - Morning Brief 只主動回報不確定、高風險、重要機會、整理失敗或需要決策的項目。
  - AI 對話中的 `@AIWorkflowRun` / `@AIWorkItem` / `@MorningBriefItem` 可觸發 correction workflow。
- 將 `IngestionProvider` 的 mock state 改成 initial server data + server actions。
- `resolveProposal` 寫入 DB，並依 proposal type 寫入目標模組：
  - project context → `ProjectNote` 或 `ProjectTask`
  - research mapping → `ResearchSource` / `ResearchIdea`
  - finance draft → 先進待確認，不自動入帳
  - life care / memory → 先保留 proposal，等 Life DB model 明確後再落地
- 將 `WorkflowRule` 與 `AgentMessage` 從 mock data 改成 DB。
- Ingestion resolve 時建立 `AgentMessage` audit trail。

### 完成標準

- Inbox pending count 來自 DB。
- Approve / reject proposal 後重整仍保留狀態。
- Workflow audit trail 可以看到此次 triage 的 trace。
- 至少 Work 和 Research 兩個 target module 能被 ingestion 寫入。

---

## Phase 5 - AI Service Adapter 與 Morning Brief

**時間：** 3 到 5 天
**目標：** 先建立 AI 服務邊界，不急著把所有 mock 一次換掉。

### 工作項目

- 建立 `AIService` interface：
  - `generateProjectPulse(projectId)`
  - `classifyIngestionItem(rawSourceItemId)`
  - `generateMorningBrief(profileId)`
  - `reviewResearchWriting(writingProjectId, perspective)`
- `mock-ai.service.ts` 改成 mock implementation。
- 新增 real implementation 的 adapter，但用 feature flag 控制。
- Morning brief 改成從 DB aggregation 生成，再由 AI 補 summary。
- 所有 AI 寫入都必須保留：
  - input context snapshot
  - output summary
  - source ids
  - user approval status

### 完成標準

- 關閉 real AI 時，mock fallback 仍可用。
- 開啟 real AI 時，只需替換 service binding，不需要改 UI component。
- AI 產生內容都有 source metadata，可回溯。

---

## Phase 6 - 補齊剩餘業務模組

**時間：** 之後 1 到 2 週
**目標：** 在資料流穩定後，補 Chamber / Finance / Company 的正式 MVP。

### 建議順序

1. Finance：因為 ingestion 已能偵測 finance draft，且財務需要最嚴格的 human approval。
2. Chamber：因為會和 Work、Company、Workflow 有高關聯。
3. Company：作為策略文件與 project/companyAxis 的上層脈絡。

### 不建議現在先做的事

- 不建議立刻做大量高保真 placeholder UI。
- 不建議在 DB contract 未穩前新增一批只存在 localStorage 的模組資料。
- 不建議在 auth 未明確前做 partner/client 權限細節。

---

## 5. 第一個 Sprint 建議

若下一階段只開一個 sprint，建議 sprint goal 如下：

> 讓 Work 模組成為第一個真正可用、可重整、可分享、可追溯的 DB-backed 模組。

### Sprint Backlog

已同步到 `docs/tasks/task_backlog.md` 的核心任務批次：

| Batch | 範圍 | 代表任務 |
|---|---|---|
| `DB-*` | DB contract、migration、seed、fresh bootstrap | `DB-001` 到 `DB-006` |
| `DATA-*` | Interface/Data/Governance Data Operations Layer | `DATA-001` 到 `DATA-005` |
| `DATTR-*` | Source Asset、Single Source Recognition、Composite DataUnit、AI Source Workflow | `DATTR-001` 到 `DATTR-021` |
| `WORK-*` | Work Module DB-backed CRUD and data consistency | `WORK-001` 到 `WORK-007` |
| `AUTH-*` / `CLIENT-*` | Auth, permission, client portal boundary | `AUTH-001`, `AUTH-002`, `CLIENT-001` |

1. 完成 Phase 0A：`docs/dev/agent_team_os_contract.md` 契約草案。
2. 完成 Phase 0B：本地 Codex team bootstrap files。
3. 完成 DB foundation：baseline migration、seed idempotency、fresh bootstrap verification。
4. 整理 `src/app/actions/work.ts` 與 `src/lib/actions/work.ts` 的職責。
5. `DATA-002` 僅作為資料契約提案並行，不做 runtime migration。
6. `AddProjectDialog` 接 `createProject`。
7. `TaskList` 接 `addProjectTask` 和 `toggleTaskComplete`。
8. `NoteTimeline` 接 `addProjectNote`，補 `toggleProjectNotePin`。
9. `DeliverableTree` 接 `createProjectDeliverable`、`updateProjectDeliverable`、`updateProjectDeliverableVisibility`。
10. `WORK-006` 已採用 derived progress，讓 `tasksDone/tasksTotal` 由 task rows 推導。
11. `WORK-007` 驗證 Work persistence、refresh、progress display 端到端一致。
12. `/client/[token]` 改讀 DB。
13. 由 DBAgent、WorkAgent、UIUXAgent、AuthPermissionAgent、ClientPortalAgent 做 checklist review。
14. 跑 `pnpm build` 與基本手動測試。

### Sprint 完成畫面

- 使用者可以建立 project。
- 使用者可以在 project detail 新增 task/note/deliverable。
- 任務完成狀態重整後仍存在。
- 交付物 status / visibility 更新後重整仍存在。
- 客戶分享頁讀真實 DB，且只顯示 client-visible 內容。
- AI Pulse 可以暫時仍是 mock，但必須清楚透過 adapter 隔離。
- Agent Team OS 有契約與本地 skill files，但沒有 overbuilt runtime UI。

---

## 6. 風險清單

| 風險 | 影響 | 緩解方式 |
|---|---|---|
| Prisma schema 與 Supabase migration drift | DB 建不起來或 runtime enum mismatch | Phase 0 先處理，不進新功能 |
| RLS 與 Prisma direct connection 認知落差 | 以為有 RLS，其實沒有套用 app user | 短期明確採 app-layer auth，不假裝 RLS 已生效 |
| UI local state 與 DB actions 同時存在 | 使用者以為已保存，其實只在記憶體 | Phase 1 將 Work 寫入全接 server actions |
| Research network UI 與 thread DB model 不一致 | 後續資料遷移成本增加 | Phase 3 早點定 canonical model |
| Public client page 仍讀 mock | 真實分享不可用且可能誤導 | Phase 2 優先改成 DB query |
| AI 輸出無 source metadata | 無法追蹤與審核 | AIService 寫入必帶 source ids |
| Agent Team OS overbuild | Phase 0/1 被拖延，Work CRUD 無法落地 | Phase 0A/0B 只做 contract、repo skills、review checklist |
| External agent 過早接入 | 資料邊界未定前產生安全風險 | NANDA-like bridge 僅保留 adapter 設計，不做硬依賴 |

---

## 7. 開發守則

- Next.js 16 App Router 下，動態 route params 維持目前 `await params` 模式。
- Server Component 負責初始資料讀取，Client Component 負責互動與 optimistic state。
- DB model 不直接流入 UI，維持 mapper/view model。
- 所有跨使用者資料都必須先經 service-layer authorization。
- AI 可以建議，不能默默寫入高風險資料。Finance、client-visible、public output 都必須 human approval。
- Mock data 可以保留，但只能作為 fallback 或 seed source，不應成為正式 runtime data。
- Agents 可以 suggest、draft、summarize、propose。
- Agents 不可 silently write high-risk data。
- Agents 不可繞過 service-layer authorization。
- Agents 不可未經 human approval 將 private notes、financial data、life data、company strategy 暴露給 external agents。
- Agent communication 必須 auditable。
- AI-generated outputs 基於內部資料時必須保留 source IDs。
- AGENTS.md 與 SKILL.md changes 應版本化且可 review。
- 系統可同時支援 repo-file-based 與 DB-based agent configuration，但不可 hidden sync。
- NANDA-style interoperability 是未來 adapter layer，不是第一個 sprint 的必要依賴。

---

## 8. 驗證清單

每個 phase 至少跑以下檢查：

```bash
pnpm build
pnpm db:seed
```

Work persistence 完成後，手動測試：

1. 建立 project，重整 `/work` 後仍存在。
2. 新增 task，切換完成，重整後狀態仍存在。
3. 新增 note，pin note，重整後狀態仍存在。
4. 新增 deliverable，切換 visibility，公開頁只看到 client-visible。
5. 使用無效 client token 進 `/client/[token]` 會顯示無效頁。

---

## 9. 結論

目前專案已經完成「Personal OS 的產品形狀」與多個高保真工作流，甚至已經開始有正式 Prisma schema 和 server actions。下一階段最重要的不是做更多表面功能，而是把現有功能接到可信的資料層，讓 Work 成為第一個真正可日常使用的模組。

Agent Team OS 應作為新的治理軌道加入，但第一步是契約、邊界、repo skills、審計設計，不是完整 marketplace 或外部 agent 網路。完成 Work 的真實資料閉環後，再推 Research network DB、Ingestion/Workflow 持久化、AI service adapter 與 minimal agent registry，整個系統會從漂亮原型進入可累積個人資料、行動記憶與可治理虛擬團隊的階段。
