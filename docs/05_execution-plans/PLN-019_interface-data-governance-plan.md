# Interface / Data / Governance 三層資料作業開發計畫

**文件版本：** v1.0
**建立日期：** 2026-06-03
**文件層級：** Development plan / architecture-facing plan
**狀態：** Planning only，尚未要求 runtime schema 或 product code change
**對應需求：** 多來源 input/output、跨模組資料流、AI conversation 資料化、資料生成與轉化治理

---

## 1. 核心判斷

Personal OS 目前已經有三個重要基礎：

1. `AI Input` / `Inbox` 已經有 `RawSourceItem`、`NormalizedContent`、`Evidence`、`AITriageProposal`、`UserDecision` 這組 mock pipeline。
2. Work 已經是第一個 DB-backed operational target，Research / Workflow / Life 等模組仍部分停留在 mock 或 local state。
3. Agent Team OS 已經被定義為治理層，但 ingestion、AI conversation、module write、operation habit 還沒有形成同一套可查詢的資料治理記錄。

這次的新需求不應被做成「又新增一個匯入頁」或「每個模組各自處理自己的 AI 對話」。更好的方向是建立一個跨模組的 **資料作業層（Data Operations Layer）**，用三層分工承接所有來源、轉換、模組寫入、AI 討論與治理紀錄：

| Layer | 中文定位 | 主要問題 |
|---|---|---|
| Interface | 可視化操作掌握 | 使用者要看得懂資料在哪裡、正在被怎麼處理、會寫到哪個模組、哪些輸出會對外。 |
| Data | 資料流與邊界 | 系統要分清楚 raw source、normalized content、AI conversation、module record、generated output、public output。 |
| Governance | 生成與轉化紀錄 | 系統要保存資料產生順序、來源、轉化步驟、人工決策、agent 判斷、操作習慣，讓這些也成為未來 agent 可用的情境資料。 |

關鍵原則：**模組擁有自己的 SSOT，Ingestion / Workflow / Agent Team OS 擁有跨模組流動與治理記錄。**

---

## 2. 目前專案融合點

### 2.1 主要既有文件

本計畫承接下列文件，不替代它們：

- `docs/product/P-PRD-002-next-stage-development-plan.md`
- `docs/architecture/A-ARCH-001-data-flow-and-storage.md`
- `docs/architecture/A-ARCH-004-pipeline-audit-redesign.md`
- `docs/architecture/agent_team_os.md`
- `docs/dev/D-PLAN-009-ai-input-development-plan.md`
- `docs/tasks/task_backlog.md`

技術棧以目前專案規則與 `P-PRD-002` 為準：Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Prisma 7.8、PostgreSQL。早期 PRD 仍提到 Next.js 14 / Supabase 的部分，應視為歷史脈絡，不作為本計畫的 runtime implementation 依據。

### 2.2 既有程式概念

目前 `src/types/ingestion.ts` 已有可保留的核心型別：

- `SourceConnection`
- `RawSourceItem`
- `NormalizedContent`
- `Evidence`
- `AITriageProposal`
- `UserDecision`

目前 `prisma/schema.prisma` 已有相鄰模型：

- Work SSOT：`Project`、`ProjectTask`、`ProjectNote`、`ProjectDeliverable`
- Research SSOT：`ResearchThread`、`ResearchSource`、`ResearchConcept`、`AIFeedbackRun`
- Workflow / agent-adjacent：`WorkflowRule`、`AgentMessage`

因此本計畫採取 **extend, not replace**：

- 保留現有 ingestion pipeline 概念。
- 將 AI conversation 視為一種 source / normalized content / governance event。
- 將 confirmed proposal 往下游模組寫入前，先變成可審計的 `ModuleWriteIntent`。
- 將每次 AI 生成、人工確認、模組反寫、公開輸出都連到同一條 `traceId` / lineage。

---

## 3. 三層目標架構

### 3.1 Interface Layer：可視化操作掌握

Interface layer 的任務不是把所有資料塞在同一頁，而是讓使用者能在 60 秒內回答：

- 這筆資料從哪裡來？
- 現在在哪一個處理階段？
- AI 用了哪些 evidence 判斷？
- 使用者曾經怎麼回覆或修正 AI？
- 確認後會寫到哪個模組、哪個實體？
- 這個結果會不會對外、會不會需要人工批准？
- 這個處理過程未來能不能被 agent 當成情境理解？

建議介面區塊：

| UI 區塊 | 功能 | 近期落地策略 |
|---|---|---|
| Source Control Panel | 管理 LINE、Gmail、Google Docs、URL、file、manual、AI conversation 等來源與同步範圍 | 接在既有 `AI Input` / sync scope mock，先顯示來源、隱私、選取狀態 |
| Flow Board | 顯示 Raw → Normalized → Issue/Proposal → Decision → Module Write → Output | 先在 `/ai-input` 或 `/inbox` 做 mock timeline，不新增大型路由 |
| Module I/O Map | 顯示各模組目前可接收與可輸出的資料類型 | 文件化後做 read-only debug view |
| AI Conversation Workspace | 讓 AI triage card 支援對話、補充脈絡、修改建議 | 延伸 `A-ARCH-004` 的 issue card / colleague mode |
| Evidence Package Viewer | 展開某個議題的原始材料、normalized chunks、AI reasoning、user decision | 先支援 mock data，後續接 DB |
| Approval Queue | 高風險資料與 public/client-visible output 的人工審核佇列 | Finance / Life / Client Portal / Company Strategy 先只做 proposal，不自動寫 final |
| Operation Analytics Panel | 顯示資料產生順序、常用來源、常被聚焦的屬性、反覆延後或修正的類型 | 先定義資料契約，晚於 persistence |
| Agent Context Preview | 顯示未來 agent 會拿到哪些 scoped context package | 先做 governance 文件與 debug view |

介面設計要沿用現有 dashboard shell、sidebar、header 與 dense operational style。這是操作中樞，不是 landing page。

### 3.2 Data Layer：資料流與資料區分

Data layer 應用「資料區域」而不是只用模組分類。模組分類回答「這最後屬於哪裡」，資料區域回答「這目前是什麼狀態」。

| Data Zone | 說明 | 範例 |
|---|---|---|
| External Source | 系統外來源本體或來源引用 | LINE message、Gmail thread、Google Doc、URL、local file、AI conversation export |
| Raw Intake | 進入 Personal OS 的原始材料 | `RawSourceItem`、attachment metadata、raw text、source timestamp |
| Source Asset Registry | 來源資產身分與屬性層 | Google Doc、Markdown、HTML、PDF、DOCX、image、video、audio、URL、LINE/Telegram message、CSV、JSON、calendar event、actionable source |
| Normalized Content | 給人與 AI 共同閱讀的標準化內容 | transcript、OCR、document chunk、receipt extraction、AI dialogue summary |
| Evidence | AI 或使用者判斷引用的片段 | excerpt、reasonUsed、normalizedContentId |
| Issue / Proposal Workspace | 尚未成為模組 SSOT 的討論與決策空間 | `AITriageProposal`、issue card、conversation thread |
| Module Write Intent | 準備寫入模組但尚未 final commit 的意圖 | create work task、attach research source、create finance draft |
| Module SSOT | 各模組自己的正式資料 | Work project task/note、Research source、Finance draft |
| Output / Publication | 對外或對內產出的摘要、報告、client portal 內容 | client-visible deliverable、PDF report、agent context package |
| Governance Ledger | 生成、轉換、審核、操作習慣記錄 | transformation run、lineage edge、approval decision、operation event |

每一筆跨區流動都應有可追蹤的 `traceId`。每一筆正式模組記錄若由 AI 或 ingestion 產生，都應能回查：

- 原始來源 IDs
- normalized content IDs
- evidence IDs
- proposal / issue IDs
- AI conversation entries
- user decisions
- transformation runs
- final write intent
- module record link

### 3.3 Governance Layer：生成、轉化與操作習慣也要資料化

Governance layer 的目標是把「資料如何變成資料」保存下來。這不是單純 audit log，而是未來 agent 理解使用者工作方式的重要上下文。

需要保存的治理資料：

| Governance Data | 說明 | 對 agent 的價值 |
|---|---|---|
| Production Sequence | 資料從來源到模組的時間順序與處理路徑 | 理解哪些來源先影響哪些決策，避免只看 final state |
| Transformation Run | 哪個 agent / workflow / prompt / rule 對哪些 input 產生哪些 output | 可追蹤 AI 生成責任與重跑條件 |
| Evidence Linkage | AI 判斷引用了哪些原文片段與 normalized chunk | 避免摘要失真，支援 citation |
| User Decision | 使用者 confirm/edit/dismiss/defer 與修改內容 | 學會使用者的判斷邊界 |
| Approval Decision | 高風險或對外輸出的批准、拒絕、理由 | 保護 Finance / Life / Client Portal / Company Strategy |
| Attribute Focus Signal | AI 或使用者在討論中特別關注的屬性 | 例如 deadline、client-visible、source reliability、priority、privacy |
| Operation Event | 使用者的操作習慣與流程摩擦 | 常用來源、常延後項、常改 AI 哪些建議 |
| Context Package | 提供給 agent 的 scoped context bundle | 讓 agent 拿到有邊界、有來源、有摘要的上下文 |

重要邊界：

- Operation habit 可以分析，但必須 owner-first，不應變成隱形監控。
- 高風險模組的 final write 與 public/client-visible output 必須 human approval。
- External agent 不可直接讀 DB，只能接收 scoped context packages。
- Agent 看到的治理資料要遵守 module-level authorization 與 privacy level。

---

## 4. 建議資料模型方向

本節是 schema proposal，不是立即 migration 指令。所有 DB 變更都應等 DB-006 完成、並由 DBAgent / AuthPermissionAgent review 後再進行。

### 4.1 保留並擴充既有 ingestion 模型

| 現有概念 | 建議持久化或擴充方向 |
|---|---|
| `SourceConnection` | 持久化來源連線、同步 scope、provider、status、lastSyncedAt、syncCursor |
| `RawSourceItem` | 持久化 raw intake；加入 `ownerProfileId`、`dataZone`、`moduleHint`、`riskLevel`、`traceId` |
| `NormalizedContent` | 加入 `contentType: "ai_dialogue"`、`normalizerVersion`、`language`、`qualityScore` |
| `Evidence` | 保留 excerpt 與 reason；加入 `startOffset`、`endOffset`、`confidence`、`citedByProposalId` |
| `AITriageProposal` | 加入 `issueTitle`、`beforeState`、`afterState`、`priority`、`riskLevel`、`requiresApproval` |
| `UserDecision` | 補齊 `editedRecommendation`、`decisionReason`、`decidedByProfileId` |

### 4.2 新增跨層治理模型提案

| Model | 用途 | 主要欄位 |
|---|---|---|
| `AIConversationThread` | AI conversation 也成為可引用資料來源 | `id`, `ownerProfileId`, `moduleKey`, `relatedEntityType`, `relatedEntityId`, `title`, `status`, `traceId` |
| `AIDialogueEntry` | 保存 user / ai 來回、補充脈絡、引用材料 | `id`, `threadId`, `speaker`, `content`, `referencedSourceItemIds`, `referencedEvidenceIds`, `createdAt` |
| `IssueArchive` | 關閉議題後的完整證據包 | `id`, `proposalId`, `closingType`, `sourceSummary`, `dialogueSummary`, `finalDecision`, `ssotPlacement`, `closedAt` |
| `TransformationRun` | 每次 AI / workflow / rule 轉換紀錄 | `id`, `traceId`, `runType`, `agentKey`, `inputRefs`, `outputRefs`, `promptVersion`, `modelName`, `status`, `startedAt`, `completedAt` |
| `DataLineageEdge` | 任意資料節點之間的有向關係 | `id`, `traceId`, `fromType`, `fromId`, `toType`, `toId`, `relationType`, `createdAt` |
| `ModuleWriteIntent` | 人工確認前的模組寫入草稿 | `id`, `proposalId`, `targetModuleKey`, `targetEntityType`, `payload`, `riskLevel`, `approvalStatus`, `createdAt` |
| `ModuleRecordLink` | ingestion / issue / output 與 module SSOT 的連結 | `id`, `sourceType`, `sourceId`, `moduleKey`, `entityType`, `entityId`, `linkReason`, `createdAt` |
| `GovernanceApproval` | 高風險資料、對外輸出、final write 的批准紀錄 | `id`, `targetType`, `targetId`, `approvalStatus`, `reason`, `approvedByProfileId`, `createdAt` |
| `OperationEvent` | 介面操作與工作習慣事件 | `id`, `profileId`, `eventType`, `targetType`, `targetId`, `moduleKey`, `metadata`, `createdAt` |
| `AttributeFocusSignal` | AI / user 在處理資料時關注的屬性 | `id`, `traceId`, `sourceType`, `sourceId`, `attributeKey`, `attributeValue`, `weight`, `createdAt` |

### 4.3 Source Asset / Document Attribute Layer

參考 `docs/architecture/document_attribute_layer.md`，文件、媒體、連結與資料集需要比一般 raw source 多一層屬性層。原因是同一份 source asset 可能同時是：

- 一般知識文件：Google Doc、Markdown、PDF、DOCX、研究來源、PRD、會議紀錄。
- 可執行文件：像 TickTick list / Kanban / timeline 那樣，帶有 `todo`、`doing`、`done`、due date、priority、section、assignee 等任務屬性。
- 混合文件：例如一份 Google Doc 需求書，前半是 PRD，後半可抽出 Work tasks。
- 媒體證據：圖片可 OCR / caption，影片可 transcript / scene summary，音源可 speaker transcript。
- Web/link 來源：URL 是 locator，HTML page 是可 snapshot 的內容來源；兩者需要分開保存。
- Link-to-HTML sync：captured link 保留原始 URL，fetched static HTML 另存為 `WEB_PAGE` asset，並用 fetch run 保存 requested/final/canonical URL、HTTP status、content type、robots policy、content hash。
- 通訊來源：LINE、Telegram 等 message / chat / channel event 需要保存 provider event/update id、conversation id、message id、sender metadata、timestamp、signature/dedupe 狀態與附件。
- 結構化資料：CSV、spreadsheet、JSON、API response 可抽出欄位、range、schema 與 evidence path。

因此不要把「文件/媒體/連結」直接等同於 Work task，也不要只當作純文字附件。建議新增一個 Source Asset / Document Attribute Layer：

```txt
RawSourceItem
  -> SourceAsset
  -> AssetAttributeSet
  -> SourceAssetSnapshot / AssetExtraction
  -> NormalizedContent / Evidence
  -> ModuleWriteIntent
```

建議資料模型方向：

| Model | 用途 | 注意 |
|---|---|---|
| `SourceAsset` | source asset registry row，保存來源、格式、MIME、external id、repo path、URL、content hash | Google Doc / HTML / image / video / audio / Markdown / LINE / Telegram / uploaded file 共用 |
| `AssetAttributeSet` | Personal OS 對該 asset 的目前解讀 | `REFERENCE`, `ACTIONABLE`, `EVIDENCE`, `DELIVERABLE`, `MIXED`; `INBOX`, `TODO`, `DOING`, `DONE` |
| `SourceActionItem` | 從 asset 抽出或附著在 asset 上的 task/checklist/action item | 不直接取代 `ProjectTask`；需經 `ModuleWriteIntent` 寫入 Work |
| `AssetExtraction` | OCR、transcript、caption、HTML readability、link preview、CSV/JSON path 等抽取結果 | 轉成 `NormalizedContent` / `Evidence` 前的可審計中間層 |
| `SourceAssetSnapshot` | 外部或本地 asset 的可審計 snapshot | 保存 revision、plain text / markdown / transcript snapshot、metadata hash |
| `SourceAssetLink` | asset 與 Work/Research/Agent/Client records 的連結 | 避免複製來源內容到每個模組 |
| `SourceFetchRun` | link 抓取 static HTML 的審計紀錄 | 不覆蓋 link；建立 linked `WEB_PAGE` snapshot |
| `SourceMessageEvent` | LINE / Telegram 等 provider message event | 保存 signature/dedupe、provider ids、chat scope、raw payload snapshot |

早期策略：

- 不立即新增 DB migration。
- 先在 `/ai-input` 或 `/inbox` 做 UI-only/mock asset badges。
- `src/types/ingestion.ts` 可先新增 TypeScript proposal 或 mock-only view model。
- 真正 Prisma schema 由 `DATTR-002` 產出 migration impact analysis 後再決定。
- 可執行 source item 若要建立 Work task，必須經 `ModuleWriteIntent` 與 Work service，不可繞過 `requireUser()` / `assertCanAccessProject()`。
- HTML/web page 需要保留 original URL、canonical URL、fetchedAt、content hash；動態頁面應可保存 rendered snapshot 或 readable text snapshot。
- Link-to-HTML 第一階段只抓 static HTML，不跑 JS rendering；public fetch 應尊重 robots.txt，private/auth/paywalled link 需要 explicit source connection 與 approval。
- LINE webhook 必須驗證 signature；Telegram intake 必須用 update/message id 去重；message attachments 應建立 linked source assets。
- 影音 evidence 必須保存 timecode；圖片 evidence 優先保存 bounding box 或 region hint；CSV/JSON evidence 保存 range / JSON pointer。

### 4.4 與 `AgentMessage` / `WorkflowRule` 的關係

`AgentMessage` 已經可作為 workflow/agent dispatch 的 runtime message table，但不應承擔所有 ingestion lineage。建議分工：

| 模型 | 責任 |
|---|---|
| `WorkflowRule` | 定義自動化 routing rule |
| `AgentMessage` | 記錄 agent-to-agent / workflow dispatch message |
| `TransformationRun` | 記錄某次 AI 或 rule 如何把 input 轉成 output |
| `DataLineageEdge` | 記錄資料節點之間的 lineage |
| `ModuleWriteIntent` | 記錄即將寫入模組的 proposal payload |
| `GovernanceApproval` | 記錄批准 / 拒絕與原因 |

這樣可以避免 `AgentMessage.payload` 變成無限制 JSON 黑盒，也能讓資料分析查得到「哪些轉換最常發生、哪些常被使用者修正」。

---

## 5. 模組 I/O 契約

每個模組仍然保留自己的資料主權。跨模組資料作業層只負責來源、轉換、意圖、lineage、治理，不直接繞過 module service。

| Module | 可接收 input | 可產生 output | Governance 注意 |
|---|---|---|---|
| Work | client request、meeting note、LINE/Gmail、manual idea、AI issue archive | task、note、deliverable、client update、project pulse | client-visible 必須明確標記；內部 notes 不可外洩 |
| Research | paper、URL、Google Doc、AI conversation、work insight | source、concept、writing feedback、digest、research output | 必須保留 source id、citation、reliability |
| Ingestion | all sources | normalized content、evidence、proposal、write intent | 不寫 final high-risk data，只產生 proposal |
| Workflow | confirmed proposal、write intent、schedule event | agent message、automation event、dispatch result | 不可繞過 module permissions |
| Life | health note、reflection、memory、voice memo | life event、care reminder、memory package | privacy-first；final write 需低干擾、可撤回 |
| Finance | receipt、invoice、CSV、expense note | finance draft、classification proposal、report draft | AI 不可 finalize transaction；需 human approval |
| Chamber | contact note、meeting note、LINE group context、intro idea | contact update、opportunity、DM draft | 私人關係洞察與 shared note 分開 |
| Company | strategy note、project reflection、market input | strategy memo、company axis、decision package | Company Strategy 屬高風險資料 |
| Client Portal | Work deliverable、client-visible status、approved report | public/client-facing page | 只讀 explicitly client-visible data |
| Agent Team OS | instructions、skills、boundary decisions、operation patterns | scoped context package、agent audit summary | repo file / DB snapshot 不可靜默同步 |

---

## 6. 目標資料流

### 6.1 標準流

```text
External Source
  ↓ capture
RawSourceItem / Attachment
  ↓ normalize
NormalizedContent
  ↓ cite
Evidence
  ↓ propose
AITriageProposal / Issue Card
  ↓ discuss
AIConversationThread + AIDialogueEntry
  ↓ close
IssueArchive
  ↓ prepare
ModuleWriteIntent
  ↓ approve if needed
GovernanceApproval
  ↓ commit through module service
Module SSOT record
  ↓ link
ModuleRecordLink + DataLineageEdge
  ↓ output if approved
OutputPackage / Client-visible / Report / AgentContextPackage
```

### 6.2 AI conversation 作為資料

AI conversation 不只是聊天 UI 的暫存資料。它可能包含：

- 使用者補充的客戶背景。
- AI 追問後得到的分類邊界。
- 使用者修正 AI 判斷的原因。
- 最後決策為什麼要做或不做。
- 未來 agent 應該知道的偏好與操作模式。

因此 AI conversation 應同時被保存為：

1. `AIConversationThread` / `AIDialogueEntry`
2. `NormalizedContent(contentType = "ai_dialogue")`
3. `Evidence` 的可引用材料
4. `IssueArchive.dialogueSummary`
5. `OperationEvent` / `AttributeFocusSignal` 的分析來源

---

## 7. Operation Habit 與資料分析

這一層是本需求最重要的差異點：系統不只保存「資料內容」，也保存「資料如何被產生、排序、轉化、修正」。

### 7.1 可分析訊號

| Signal | 範例 | 可產生洞察 |
|---|---|---|
| Source sequence | Gmail → AI proposal → user edit → Work note | 哪些來源最常變成正式工作資料 |
| Time to decision | proposal pending 3 天才確認 | 哪類資料讓使用者猶豫 |
| Edit pattern | AI 建議 priority 常被從 high 改成 medium | AI priority prompt 需要調整 |
| Deferral pattern | Finance drafts 常被 defer | 可能需要更清楚的 approval UI |
| Attribute focus | 使用者討論中常問 deadline / client visibility | Agent 未來應優先帶出這些欄位 |
| Module routing pattern | memory_capture 常被改到 Life 而不是 Chamber | routing rule 需要修正 |
| Public output friction | client-visible items 常需要二次審核 | Client Portal boundary 需要更明顯 |

### 7.2 原則

- 先存事件，再做聚合；不要一開始就過度假設 analytics 維度。
- Operation events 應可被關閉或降級，避免讓生活/健康資料變成壓力來源。
- Agent 使用 operation pattern 時，應優先使用 aggregate summary，不應無限制讀 raw interaction history。
- 對高風險模組，operation habit 只能輔助建議，不可直接導向 final write。

---

## 8. 開發階段

### Phase A - Plan / Contract（本文件）

**目標：** 定義 interface/data/governance 三層，對齊既有 PRD、architecture、ingestion、workflow、agent docs。

**完成標準：**

- 本文件建立。
- Backlog 有對應任務與 follow-up。
- 不改 runtime code。
- 不改 DB schema。

### Phase B - Visual Lineage Prototype（UI-only / mock）

**目標：** 在既有 `/ai-input` 或 `/inbox` 中讓使用者看懂資料處理路徑。

**建議工作：**

- 在 proposal card 加入 data zone badge。
- 顯示 Raw → Normalized → Evidence → Proposal → Decision 的 compact timeline。
- 顯示 privacy / risk / suggested module。
- 將 AI conversation entry mock 成 `NormalizedContent(contentType = "ai_dialogue")`。
- 將 confirm/edit/dismiss/defer 與 `UserDecision` 可視化。

**限制：**

- 仍用 mock / React state。
- 不做 DB migration。
- 不新增大型 dashboard route。

### Phase C - Persistence Contract（DB proposal）

**目標：** 在 DB-006 之後，提出 ingestion + governance persistence schema 的 migration impact analysis。

**建議工作：**

- 決定哪些 existing TS types 先進 Prisma schema。
- 設計 `TransformationRun`、`DataLineageEdge`、`ModuleWriteIntent`、`ModuleRecordLink`、`GovernanceApproval` 的最小欄位。
- 設計 indexes：`traceId`、`ownerProfileId`、`moduleKey/entityType/entityId`、`createdAt`。
- 設計 seed / fixture strategy。
- 設計 auth / service boundary。

**限制：**

- 不在未審核前直接改 schema。
- 不碰 production / remote DB。
- 不讓 JSON payload 成為不可查詢的唯一真相。

### Phase D - Work First Module Write Loop

**目標：** 先把 confirmed Work proposal 寫入 Work module，形成第一條可審計閉環。

**建議工作：**

- `AITriageProposal(project_context)` → `ModuleWriteIntent(targetModuleKey = "work")`
- 人工確認後透過 Work service 建立 `ProjectTask` 或 `ProjectNote`
- 建立 `ModuleRecordLink`
- 建立 `DataLineageEdge`
- 保留 evidence package 連到 Work record

**限制：**

- 必須等 `WORK-001` action/service surface 收斂。
- 不可繞過 `requireUser()` / project ownership check。
- Client-visible output 仍需 explicit approval。

### Phase E - Governance Analytics / Agent Context

**目標：** 讓治理記錄成為 agent 可用的情境，而不是只是 audit trail。

**建議工作：**

- 建立 operation event aggregation。
- 建立 attribute focus summary。
- 建立 `AgentContextPackage` 的文件與 debug preview。
- 讓 agent proposal 可以引用歷史 decision pattern，但顯示來源與信心。

**限制：**

- 不讓 agent 自動使用高風險資料做 final write。
- External agent 僅能收到 scoped package。

### Phase F - Expand Sources / Modules

**目標：** 在 Work loop 穩定後，逐步擴展 Research、Finance draft、Life care、Chamber relationship、Company strategy。

**建議順序：**

1. Research source / concept linking，因為 citation 與 evidence 概念最成熟。
2. Finance draft-only，因為高風險但可用 approval queue 保護。
3. Life care / memory，重點是 privacy-first 與低干擾。
4. Chamber / Company，先文件化 boundary，再做 MVP。

---

## 9. Backlog 建議

| Task id | Title | Status | Notes |
|---|---|---|---|
| DATA-001 | Define interface/data/governance development plan | DONE | 本文件。 |
| DATA-002 | Propose cross-source data operations persistence contract | TODO | 對應 Phase C，需 DB-006 後再做。 |
| DATA-003 | Add visual lineage prototype to AI Input / Inbox | TODO | 對應 Phase B，UI-only / mock。 |
| DATA-004 | Define governance event and operation habit analytics contract | TODO | 對應 Phase E，先文件與 schema proposal。 |
| DATA-005 | Implement Work-first module write intent loop | TODO | 對應 Phase D，依賴 WORK-001 / WORK-002。 |

既有任務連動：

- `INGEST-001` 應吸收 DATA-002 的 raw/proposal/evidence persistence contract。
- `INGEST-002` 應吸收 DATA-004 的 WorkflowRule / AgentMessage / TransformationRun 分工。
- `AGENT-002` 應吸收 AgentContextPackage 與 approval policy 的 schema impact。
- `WORK-001` / `WORK-002` 是 DATA-005 的前置條件。

---

## 10. 停止條件與風險

遇到以下情況應停止並要求使用者方向：

- 需要修改 Prisma schema，但 migration impact 尚未文件化。
- 需要決定 AI conversation 是否能保存私人或敏感內容。
- 需要讓 Finance / Life / Client Portal / Company Strategy 產生 final write。
- 需要將 internal notes 或 governance history 對外輸出。
- 需要 external agent 接收資料。
- 需要新增真實來源連線並處理 OAuth / webhook / token。
- 需要改變 auth、module permission 或 public route 邊界。

主要風險：

- 過早建立太多模型，導致 DB contract 不穩。
- 把所有 governance 都塞進 JSON payload，未來無法分析。
- 把 AI conversation 當 chat history，而不是可引用資料。
- 讓 module write 繞過服務層，破壞 authorization。
- 將 operation habit 分析做得太隱形，造成使用者不信任。

---

## 11. 推薦下一步

短期仍建議維持 current sprint 的 `DB-006` 作為下一個工程任務，因為 schema/migration/seed bootstrap 未驗證前，不應新增 ingestion/governance persistence migration。

本文件完成後，下一個最小產品步驟建議是：

1. 做 `DATA-003`：在現有 mock UI 加上 visual lineage 和 data zone badge。
2. 做 `DATA-002`：等 DB-006 完成後，提出 persistence contract。
3. 做 `WORK-001` / `WORK-002`：讓 Work write path 穩定，之後才能接 `DATA-005`。

這樣的順序能讓使用者先「看得懂資料流」，再「保存資料流」，最後才「讓資料流真正寫入模組」。
