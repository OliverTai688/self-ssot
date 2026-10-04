# 專案區域五大資源架構設計

**類型**：設計與可行性評估（非實作）
**日期**：2026-10-02
**作者**：Subagent B（專案五大資源架構設計）
**狀態**：PROPOSED — 待 Owner 拍板，見 §16
**位置**：`docs/2_agent-input/generated/project-workspace-design/`（依 `AGENTS.md` §4，非正式文件庫，不給正式文件編號）

---

## 0. 這份文件回答什麼

Owner 的需求：專案區域要有五種資源 ——
① 每個專案獨立聊天室；② 多層資料夾的專案雲端硬碟（含「分散上傳先進某個資料夾等待整理」）；
③ 專案工作區（工作階段／里程碑／關鍵時間／TODO 與審核任務）；④ LINE 群導入（一專案綁多群，文字與圖片進來當專案資料）；
⑤ 會議資料區（時間序、一資料夾一場會議、資料夾自帶會議屬性）。

而其中最難的是**期（二期／三期）**：`提案 → 接案 → 執行 → 驗收 → 結案`，但 `執行 → 驗收` 會重複。

本文件把這五件事收斂成**可機械式實作**的資料模型、Server Action 介面、路由、權限與分期計畫，並明確標出與既有架構決定衝突、需 Owner 拍板的地方。

**本文件不寫任何 runtime 程式碼。**

---

## 1. 已讀清單

### 1.1 Repo 根與規則
| 檔案 | 取得的約束 |
|---|---|
| `AGENTS.md`（487 行） | BFF-first 管線、§9 資料規則、§10 授權（`requireUser()` + `assertCanAccessProject()`）、§11 高風險模組需人工核准、§12.1 Lucide-only／theme token-only、§13 驗證指令、§14 文件更新規則 |
| `CLAUDE.md` | 僅 `@AGENTS.md` |
| `prisma/schema.prisma`（2431 行，全讀模型清單＋相關模型逐一細讀） | 見 §2.1 |
| `package.json` | 無 `rrule`／`date-fns`／`@dnd-kit`；有 `@aws-sdk/client-s3`、`@aws-sdk/s3-request-presigner`、`zod@4`、`@tanstack/react-table`、`@tiptap/*`、`recharts`、`lucide-react` |
| `prisma/migrations/`（18 個） | 命名慣例 `YYYYMMDDHHMMSS_snake_case`；最新 `20260928120000_operating_assets` |
| `scripts/check-migration-coverage.mjs` | **schema 裡每張表／每個 enum 都必須有一個 migration 的 `CREATE TABLE` / `CREATE TYPE` 建立它**，否則 `pnpm ops:check` FAIL |
| `scripts/check-prisma-structure.mjs` | 反向關聯必須成對、`@relation("name")` 必須剛好出現兩次、`fields:`／`@@index`／`@@unique` 引用的欄位必須存在 |

### 1.2 正式架構文件
`ARC-001_data-flow-and-storage`（§12.1 R2 無 RLS，私有 bucket + 後端代理簽網址）、
`ARC-018_work-module-contract`、
`ARC-030_module-resource-index-bff-contract`（模組清單面的統一契約形狀）、
`ARC-033_tenant-owner-isolation-invariant`（**每次讀寫都要 `ownerId` 範圍化，角色不得繞過**；未來協作必須由 server-only、deny-by-default 的 membership/capability resolver 取代，而非放寬現行檢查）、
`ARC-038_module-shell-tab-standardization`（模組級固定五分頁；Work 尚未遷移到 `ModuleOperatingShell`）、
`ARC-040_yuanzhan-ui-data-mode-contract`（渲染空日誌不自動建立資料）、
`ARC-041_operating-track-spine-contract`（三軌 + `TimeSpine` 只索引已具體化的東西）、
`ARC-042_operating-workbench-persistence-contract`（`commit()` 單一寫入邊界、`RowChange` diff 佇列、高風險集合閘門、**bytes 永不進佇列**）、
`AUT-004_client-portal-public-storage-policy`（私有 bucket、短 TTL、signed URL 不落地）、
`SCH-005_cloudflare-r2-storage-schema-proposal`（`FileAsset`／`MediaAsset` 欄位形狀、拒絕 public bucket、拒絕把 signed URL 存進 Postgres）、
`SCH-008_operating-workbench-collection-schema`（§3 決定 C：**專案的營運專屬欄位放 1:1 側表，主鍵即 projectId**）。

### 1.3 Project 文件（`claude/*`）
`journal-asset-upload-r2-proposals`（R2 四道門五段管線、`OperatingAsset` 欄位理由、**D1–D5 五個待決**、否決清單）、
`journal-asset-object-p0-implemented`／`p1-implemented`、
`object-index-implementation`（物件索引、`refCode`、反向索引、icon 表缺 key 會靜默畫空 svg）、
`agenda-object-implementation`、
`operating-module-implementation-decision`（B 模型 × C 介面、節奏只存規則、spine 只索引已具體化者、衝期用查詢不用約束）、
`operating-module-unification-proposals`、`operating-module-T1-T5-implemented`、
`doc-object-section-editor-decision`、`timeline-participants-sync-decision`、
`cashflow-contract-implemented`、`nested-card-decoupling-research`、`form-container-modal-decision`、`company-theme-implementation`。

### 1.4 程式碼
`src/app/(dashboard)/work/page.tsx`、`work-client.tsx`、`[projectId]/page.tsx`、`[projectId]/project-detail-client.tsx`（1005 行）、
`src/app/(operating)/company/operating/page.tsx`、
`src/lib/services/project.service.ts`（415 行，授權基準）、`auth.service.ts`、`operating-assets.service.ts`（315 行）、`operating-commands.service.ts`（1457 行）、`operating-store.service.ts`、`storage.service.ts`、`library-asset-index.service.ts`、
`src/app/actions/work.ts`、`src/app/actions/storage.ts`、
`src/app/api/company/operating/uploads/route.ts`（214 行）、`commands/route.ts`、`store/route.ts`、
`src/lib/storage/{r2-client,presigned-url,object-key,object-head}.ts`、
`src/lib/ui-data/yuanzhan/operating-commands.ts`、`operating-assets.ts`、
`src/lib/contracts/ai-input-source-connection-catalog.contract.ts`（LINE manifest：`availability: "mock_setup_only"`、`runtime: DISABLED`）、
`src/components/layout/module-operating-shell.tsx`、`src/components/work/deliverable/deliverable-tree.tsx`。

### 1.5 外部一手來源（LINE 平台限制）
- [LINE Notify 將於 2025-03-31 終止服務（LINE 官方公告）](https://developers.line.biz/en/news/2024/10/07/line-notify-will-be-discontinued/)
- [Receive messages (webhook) — LINE Messaging API 官方文件](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)：原文明載 **“There is no API available to get the text again after receiving the webhook.”** 與 **“Content that users send is automatically deleted after a certain period of time.”**
- [Group chats and multi-person chats — LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/group-chats/)：列出「取得群組成員 user ID」「取得群組成員 profile」為可用操作，但未在該頁說明認證／付費帳號條件（見 §8.2 的誠實結論）。

---

## 2. 現況盤點：可複用的基礎

### 2.1 相關 Prisma 模型清冊

| 模型 | 範圍鍵 | 與五大資源的關係 | 可複用程度 |
|---|---|---|---|
| `Profile` | 自身 | 身分 | 直接用 |
| `Project` | `ownerId`（必填）、`workspaceId`（**可空**） | 五大資源的父 | 直接用；`workspaceId` 可空是 §4.3 的關鍵問題 |
| `Workspace` / `WorkspaceMembership` / `ProjectAccessGrant` / `CollaborationInvitation` | `workspaceId` | 多人協作與授權 | **已建模但 runtime 未接**；§9 的 capability resolver 要接上它 |
| `ProjectTask` | `projectId` | 資源③ TODO | 直接擴充（已有 `operatingStatus`／`expectation`／`evidenceCount`／`relations`／`subtasks`） |
| `ProjectNote` | `projectId` | 可能被聊天室取代 | 不動；`NoteSource` 已有 `LINE`／`MEETING` 值（語意線索） |
| `ProjectDeliverable` | `projectId` | **repo 內唯一的資料夾樹**（`nodeType FOLDER/FILE` + `parentId` 自關聯） | 不複用為雲端硬碟（見 §5.1），但 `deliverable-tree.tsx` 的 UI 遞迴樹可複用 |
| `ProjectPhaseNode` | `projectId` | 資源③「階段」 | **擴充**（見 §6） |
| `ProjectMilestone` | `phaseNodeId` | 資源③「里程碑」（已有 `date` 可空、`acceptance`、`bonusAmount`） | 幾乎不用改 |
| `ProjectObjective` | `milestoneId` | 資源③「怎樣算做到」 | 不改 |
| `FileAsset` / `MediaAsset` | `ownerId` | 檔案資產（舊） | **不用於專案硬碟**（見 §4.4） |
| `OperatingAsset` | `workspaceId` | 檔案資產（新，R2 正式管線） | **資源②④⑤ 的檔案本體一律走這張** |
| `OperatingLibraryFile` | `workspaceId` | 公司文件庫（`versions[]` 內嵌 objectKey） | 不動 |
| `OperatingDocObject` | `workspaceId` | 結構化文件物件（會議紀錄已是其 `kind` 之一） | **資源⑤ 的會議 memo 直接用它** |
| `OperatingThread` | `workspaceId` + `projectId?` | 註解已寫「專案聊天室」，`messages Json` | **不作為正式聊天室**（見 §4.2） |
| `OperatingJournalEntry` | `workspaceId` + `authorId` + `onDate`（唯一） | 書寫式日誌 | **不作為聊天室**（見 §4.2） |
| `OperatingComment` | `workspaceId` + `targetType/targetRef` | 留言（journal/line/object 三合一，含 `parentId` 與軟刪） | **聊天訊息的欄位形狀直接抄它** |
| `Occasion` | `workspaceId` + `projectId?` | 行政／活動，已有 `OccasionCategory.CLIENT_MEETING`、`actorIds[]`、`externalGuests`、`recap` | **資源⑤ 的「行事曆那一側」，用 optional link 接起來** |
| `OperatingMedia` | `sessionId?` / `occasionId?` | 節奏與活動的素材（`url` 直接存字串） | 不複用（它存 url 而非 objectKey，是前一代） |
| `OperatingContract` / `OperatingContractTerm` | `workspaceId` + `projectId?` | **「期」常常就是一份合約** | 資源③ 的 `ProjectPhaseCycle.contractId` 指向它 |
| `OperatingProjectProfile` | PK = `projectId` | 營運專屬欄位（`operatingStatus`、`dealStage`、`stageEnteredAt`、`bonusRatePct`） | **不可被新階段模型取代**（獎金閘門③讀它，見 §15 衝突 4） |
| `SourceConnection` | `ownerId` | 外部來源連線，已有 `provider: LINE`、`secretRef`、`providerAccountRef`、`status`、`lastSyncAt` | **資源④ 的憑證殼直接用它**（不另造憑證表） |
| `SourceAsset` | `ownerId` | 外部來源素材，`status` 已有 `INBOX` | 不複用（它是 AI Input 的 ingestion 模型，非 bytes 的家；`SCH-005` §5 已明確拒絕混用） |
| `TimeSpine` | `workspaceId` | 三軌扁平索引（`SpineTrack: PROJECT/RHYTHM/OCCASION`） | 里程碑／會議的日曆呈現可掛上去 |
| `OperatingCommandLog` | `workspaceId` + `clientRefHash`（唯一） | 工作台命令稽核＋冪等 | 新模組不用它（新模組走 Server Action，見 §4.1） |
| `OperatingAuditEvent` | — | 高風險稽核目錄，CHECK constraint 只允許具名動作 | 不塞一般動作（`OperatingCommandLog` 的註解已記取此教訓） |

**關鍵結論：repo 裡沒有任何「專案範圍的多層資料夾」、沒有「一列一訊息的聊天」、沒有「期」這一層、沒有任何 LINE runtime。**
但 **R2 上傳／finalize／下載授權管線、檔案資產表、里程碑/任務四層骨架、workspace 協作授權模型、文件物件、物件索引參考碼** 全部已經存在且可用。

### 2.2 兩套資產系統並存（必須知道的事實）

| | `FileAsset` / `MediaAsset` | `OperatingAsset` |
|---|---|---|
| 範圍 | `ownerId`（Profile） | `workspaceId` |
| 寫入邊界 | Server Action `src/app/actions/storage.ts` | Route handler `/api/company/operating/uploads` |
| 服務 | `storage.service.ts` | `operating-assets.service.ts` |
| objectKey | `owner/{ownerId}/{uuid}/{safeName}` | `operating/{workspaceId}/asset/{yyyy-mm}/{uuid}{ext}` |
| finalize（HeadObject 核對） | **沒有** | 有（`finalizeAsset()`，大小對不上即 `failed`） |
| 參考碼／可被 `@` 引用 | 沒有 | 有（`refCode`，`AST-JRNL-000124-20260928`） |
| multipart 續傳 | 沒有 | 欄位已留（`uploadId`），實作在 P2 |
| 下載授權 | `getFileAssetForProfile` 查 ownerId | `resolveDownloadGrant()` 查 DB 列 + space/authorKey |
| 軟刪 | `deletedAt` | `deletedAt` |

`claude/journal-asset-upload-r2-proposals.md` 的 **D2** 已經把這件事標成「**最大的架構變更**」，建議「合併但分兩步」，並明言「並存會讓『@ 得到日誌的檔、@ 不到文件庫的檔』變成長期怪異行為」。本設計選 `OperatingAsset` 作為專案檔案的唯一家（§4.4），理由與代價見該節。

### 2.3 R2 現況：**已完整接通，不是部分接通**

- `src/lib/storage/r2-client.ts`：`S3Client`，`region: "auto"`，endpoint `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`。
- `presigned-url.ts`：`createUploadUrl`（PUT，TTL **900s**）、`createDownloadUrl`（GET，TTL **300s**）。TTL 常數就寫在這支檔案裡。
- `object-head.ts`：`headObject()`（回 `{bytes, etag, contentType}`，404 回 `null` 而非丟例外）、`deleteObject()`。
- `.env.example` 已列 `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`（註解掉）。
- `package.json` 有 `storage:r2:smoke-test`、`ops:assets:check`、`ops:assets:object:check`、`ops:assets:cleanup`（孤兒清理）。
- `claude/journal-asset-upload-r2-proposals.md` 記載 `R2STORE-000` 已 DONE（帳號／bucket／憑證已有）。

→ **資源②④⑤ 不需要新建任何儲存基礎設施，只需要新增「資料夾」這一層與專案範圍的授權。**

### 2.4 既有 Server Action / Service 模式（新模組必須一字不差地跟隨）

```txt
Client Component
  → import { xxx } from "@/app/actions/<domain>"        ← "use server" 檔案
  → zod schema .parse(input)                            ← 每個 action 自己的 Schema 常數
  → const user = await requireUser()                    ← src/lib/services/auth.service.ts
  → service function(user.id, ...)                      ← src/lib/services/<domain>.service.ts，檔頭 import "server-only"
      → await assertCanAccessProject(profileId, projectId)   ← 丟 UnauthorizedError / NotFoundError
      → db.<model>.<op>()                                    ← Prisma
  → mapper（src/lib/mappers/*.mapper.ts）轉成 view model
  → revalidatePath(`/work/${projectId}`)
  → return { success: true, data } | { success: false, error }   ← ActionResult<T>
```

實證（`src/app/actions/work.ts`）：
```ts
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
```
錯誤翻譯集中在 action 檔內的 `toErrorMessage(error)`（`src/app/actions/storage.ts`）或逐 action 的 try/catch（`work.ts`）。
**Route handler 只在 Server Action 做不到時才用**：預簽網址（需要回傳 R2 URL 給瀏覽器直傳）、公開 webhook、Shadow DOM 工作台。這正是 `/api/company/operating/uploads` 與 `/api/company/settings` 存在的理由。

### 2.5 現有 Work 專案介面

`src/app/(dashboard)/work/[projectId]/page.tsx` 是 Server Component：`getProjectById()` → 四個 mock adapter（`getProjectPulse`／`getPublicOutputs`／`getPulseSourceMeta`／`getProjectTimeline`，全在 `mock-ai.service.ts`）→ 一個 1005 行的 `ProjectDetailClient`，內含 `Tabs`（任務／筆記／交付物）＋兩個醒目的邊界卡（`data-work-boundary="WORK-015-ADJUNCT-MOCK-GATE"` 與 `WORK-015-FORMAL-CRUD-ONLY"`）。
→ 五大資源**不能**塞進這 1005 行。要走 `layout.tsx` + 子路由（§12）。

### 2.6 與 v5 Shadow-DOM 工作台的邊界（最重要的一條）

`/company/operating` 是從凍結原型 HTML 編譯出來的 Shadow-DOM 工作台（`AGENTS.md` §12.1：`runtime.js`／`styles.ts` 禁止手改）。它的寫入走 `commit()` → 結構化 diff → `POST /api/company/operating/commands`（`ARC-042`）。

**本設計的五大資源一律不走那條管線。** 理由：
1. `ARC-042` §9 明文列前提「`DB` 可 `structuredClone`」並在 `claude/journal-asset-upload-r2-proposals.md` 收斂成硬規則「**bytes 永不進 `ARC-042` 的 diff 佇列**」。
2. 聊天訊息是高頻 append，整包快照 diff 會把成本變成 O(訊息數)。
3. 專案區域在 `(dashboard)` 路由群，用得到 Server Action；工作台在 Shadow DOM 用不到。

代價：系統裡會有**兩條寫入路徑**（工作台 commands API ＋ 專案區 Server Action）。這是必須記錄並讓 Owner 知道的分裂（§15 衝突 2）。收斂方向：長期讓工作台的 `projects`／`phases`／`milestones` 集合改讀專案區的服務，而不是反向。

---

## 3. 階層與命名的最終定義

在寫任何模型之前先把詞定死，否則五個資源會各用一套詞。

| 中文 | 英文 / 模型 | 定義（一句話） | 數量級 |
|---|---|---|---|
| **期** | `ProjectPhaseCycle` | 一個**交付週期**，通常對應一份合約（一期／二期／三期） | 一專案 1–5 |
| **階段** | `ProjectPhaseNode`（既有，擴充） | 期底下的流程格：提案／接案／執行／驗收／結案，**帶起訖日期** | 一期 3–5 |
| **里程碑** | `ProjectMilestone`（既有） | 階段底下「要交付什麼」，帶可空日期與 `acceptance` | 一階段 0–8 |
| **目標** | `ProjectObjective`（既有） | 里程碑底下「怎樣才算做到」，選用的中間層 | 一里程碑 0–5 |
| **任務** | `ProjectTask`（既有，擴充） | 實際要做的事；分 **TODO** 與 **審核**兩種 | 一里程碑 0–30 |

> 為什麼不是扁平 enum：Owner 的序列 `執行 → 驗收 → 執行 → 驗收` 在扁平 enum 下無法表達「這是第幾次執行」，而「第幾次」正是人要問的問題（二期的預算、二期的合約、二期的驗收條件都不同）。見 §6.1 的完整論證。

---

## 4. 五個跨資源的基礎決定（統一 vs 分裂）

### 4.1 D-A：寫入邊界 —— Server Action（不是 commands API）

**決定**：五大資源的所有寫入走 `src/app/actions/project-*.ts` 的 Server Action；只有「預簽上傳／finalize／下載授權」「LINE webhook」「LINE 補抓 drain」四件事走 Route handler。

| 選項 | 評估 |
|---|---|
| A. Server Action + 少量 route handler（**採用**） | 跟隨 `AGENTS.md` §6 的 BFF 管線與 `src/app/actions/work.ts` 的既有形狀；型別端到端；`revalidatePath` 可用 |
| B. 全部走 `/api/company/operating/commands` 的 diff 佇列 | 否決：`ARC-042` 的快照 diff 以「資料小、可 structuredClone」為前提；聊天與檔案違反兩者 |
| C. 全部走新的 REST route | 否決：失去 Server Action 的型別與 `revalidatePath`，且與 `work.ts` 既有模式不一致 |

### 4.2 D-B：專案聊天室 —— 新模型，不是 Journal/Thread 的切面

**決定**：新增 `ProjectChatChannel` + `ProjectChatMessage`（**一列一訊息**）。

| 候選 | 為什麼不行 / 可以 |
|---|---|
| 複用 `OperatingJournalEntry` | **否決**。它的唯一鍵是 `@@unique([workspaceId, authorId, onDate])` —— 一人一天只能有一列。聊天是一天數十則、兩人並行。要塞進 `blocks Json` 就等於「每送一則訊息重寫整天那一列」，兩人同時講話會互相覆蓋。 |
| 複用 `OperatingThread`（註解已寫「專案聊天室」） | **否決作為正式聊天室**。`messages Json @default("[]")` 同樣是整包重寫；每則訊息沒有自己的 id，所以無法回覆特定訊息、無法掛附件外鍵、無法被 `@` 引用、無法建索引搜尋。而且它在 `WRITE_ENABLED_COLLECTIONS` 裡由工作台 diff 佇列驅動，整個陣列會隨每次 commit 被送上伺服器。**保留它**當工作台的輕量討論串，P2 再評估收斂。 |
| 新 `ProjectChatMessage`（**採用**） | 一列一訊息＝有 id（可回覆、可 `@`、可掛附件、可軟刪、可全文搜尋）。欄位形狀直接抄 `OperatingComment`（`authorId?` + `authorKey?` 雙身分、`parentId`、`meta Json`、`deletedAt` 軟刪）—— 那張表的註解已經說明了為什麼要這樣：「留言被引用過就不能真的消失」。 |

**為什麼需要 `ProjectChatChannel` 這一層**：因為資源④。每個綁定的 LINE 群要變成同一個閱讀器裡的一個頻道（`kind = LINE_MIRROR`），才能讓 LINE 訊息與站內訊息共用同一種訊息形狀、同一個附件管線、同一套權限。沒有頻道層，LINE 就得另造一套訊息表 —— 那會讓「專案資料的其中一種」這個需求裂成兩套 UI。

### 4.3 D-C：**一棵資料夾樹**，型別掛在資料夾上

**決定**：`ProjectFolder` 一棵樹，用 `kind` 區分用途；會議屬性放**以 `folderId` 為主鍵的 1:1 側表** `ProjectMeeting`。

| 選項 | 論證 |
|---|---|
| A. 一棵樹 + `kind` + 1:1 側表（**採用**） | ① 上傳／移動／改名／預覽／授權／孤兒清理只有一份實作。② 一場會議的錄音，使用者事後想歸到 `專案資料/交付/二期` 底下時，是一次 `UPDATE folderId`，不是跨樹複製。③ **1:1 側表以父表主鍵當主鍵**是 repo 自己定過的模式 —— `SCH-008` §3 決定 C 的 `OperatingProjectProfile { projectId String @id }`，註解寫「1:1 共用主鍵，沒有第二個 id 要對齊」。會議屬性因此不污染通用資料夾模型：`ProjectFolder` 沒有多出任何會議欄位。④ 「會議資料區」只是同一棵樹的一個**視圖**（`kind = MEETING ORDER BY heldAt DESC`），不是第二個儲存體。 |
| B. 兩棵樹（`ProjectFolder` + `ProjectMeetingFolder`） | 否決。移動／改名／授權／預覽／縮圖／孤兒清理全部要寫兩遍；而且跨樹移動只能靠複製或一條軟連結，兩者都讓「這個檔在哪裡」出現兩個答案。 |
| C. 一棵樹 + 把會議欄位（參與者／結論／注意事項）直接加到 `ProjectFolder` | 否決。99% 的資料夾那六個欄位是 NULL；而且下一種帶屬性的資料夾（例如「驗收包」）又要再加六欄。1:1 側表是可擴充的版本：加一張 `ProjectAcceptancePack { folderId @id, ... }` 不動主表。 |

### 4.4 D-D：檔案本體一律 `OperatingAsset`（擴充），不新增第四張資產表

**決定**：`OperatingAsset` 增 `projectId?`、`folderId?`、`filedAt?`，`origin` 增值 `project_drive` / `meeting` / `line`。

| 選項 | 論證 |
|---|---|
| A. 擴充 `OperatingAsset`（**採用**） | 它是最新也最正確的一張：有 finalize（HeadObject 核對大小／ETag）、有永不重生成的 `refCode`、有 `status` 狀態機、有 multipart 欄位、有 `space`/`authorKey` 的下載授權、有孤兒清理腳本。方向也與 `claude/journal-asset-upload-r2-proposals.md` 的 **D2「合併但分兩步」**一致 —— 本設計是**加第四道門**（`origin: project_drive`），不是遷移既有三道門，所以不觸發 D2 的高風險部分。附帶好處：專案檔案自動進得了既有物件索引與 `@` 引用（`mentionHits()`／`objHtml()`／`objJump()` 已有 `asset` 分支）。 |
| B. 新 `ProjectAsset` 表 | 否決。等於把 D2 警告的「三個家」變成四個家；finalize／授權／孤兒清理／參考碼要再寫一遍；而且「@ 得到日誌的檔、@ 不到專案的檔」正是 D2 說的長期怪異行為。 |
| C. 擴充 `FileAsset`/`MediaAsset` | 否決。它們沒有 finalize、沒有參考碼、沒有 multipart 欄位、是 `ownerId` 範圍而非 `workspaceId`，且 `SCH-005` 本身把它們定位為 library 資產。要補到 `OperatingAsset` 的水準等於重寫一次。 |

**必須處理的連帶問題（D-D2）**：`OperatingAsset.workspaceId` 是 **NOT NULL**，但 `Project.workspaceId` 是 **可空**（`createProjectForProfile()` 不設它）。
→ **啟用專案雲端硬碟時，服務層先確保 `project.workspaceId` 非空**：若為空，綁定到呼叫者所屬的 workspace（沒有就建一個 `type: PERSONAL` 的），並寫入 `Project.workspaceId`。這是 P0 的一個具名步驟（`ensureProjectWorkspace(profileId, projectId)`），不是隱性副作用。
替代方案（否決）：把 `OperatingAsset.workspaceId` 改成可空並加 `ownerProfileId` —— 會讓既有 `where: { workspaceId }` 的查詢全部需要重新檢視授權語意，風險遠大於收益。

### 4.5 D-E：收件匣是**真資料夾**，不是虛擬視圖也不是旗標

**決定**：每個專案的硬碟根下有一個 `isSystem = true, kind = INBOX` 的真資料夾；`OperatingAsset.filedAt` 記錄「被整理出收件匣的時刻」。

| 選項 | 論證 |
|---|---|
A. 真資料夾 + `filedAt`（**採用**） | 每個 asset **永遠**恰好屬於一個 `folderId`：listing 查詢只有一種形狀、麵包屑永遠畫得出來、拖放目標天然存在。「待整理 N」= `count(folderId = inboxId)`。`filedAt` 另外存，讓「整理過沒有」這個問題在使用者把檔案又移回收件匣之後仍然答得出來。
B. 虛擬視圖（`folderId IS NULL` 當收件匣） | 否決。每一條 listing 查詢、每一個麵包屑、每一次拖放都要為 NULL 開一條分支；而 UI 最後還是得畫一個假節點叫「收件匣」—— 那就不如讓它是真的。
C. 只用狀態旗標 `filingState` | 否決。旗標與 `folderId` 會各自是一個真相，兩者不一致時（移進某資料夾卻忘了改旗標）看起來像 bug 其實是設計問題。

**「分散上傳先進某一資料夾」的具體語意**：
- 任何不指定 `folderId` 的上傳（日誌拖放、聊天室貼附件、LINE 媒體、會議錄音直傳、手機拍照）→ `folderId = 該專案的 INBOX`，`filedAt = null`。
- 指定了資料夾的上傳（在雲端硬碟某層按「上傳」）→ 直接落在該資料夾，`filedAt = now()`。
- 「整理」= `moveProjectAssets({ assetIds, toFolderId })`：驗證同專案、驗證目標資料夾可寫、更新 `folderId` 與 `filedAt`，寫一筆稽核。
- **移動不動 R2**：`objectKey` 完全不變（§5.4）。這是把資料夾放在 DB 而非 key 裡最大的回報。

---

## 5. 資源②：專案雲端硬碟（先寫它，因為④⑤都依賴它）

### 5.1 可複用的現有基礎

| 要素 | 既有檔案 / 模型 | 複用方式 |
|---|---|---|
| R2 client | `src/lib/storage/r2-client.ts` | 直接用 |
| 預簽上傳／下載 | `src/lib/storage/presigned-url.ts` | 直接用；影音 TTL 見 §5.5 |
| finalize 核對 | `src/lib/storage/object-head.ts` `headObject()` | 直接用 |
| 檔案資產表 | `OperatingAsset` | 擴充三欄（§5.2） |
| 上傳路由形狀 | `src/app/api/company/operating/uploads/route.ts`（POST 預簽 / PATCH finalize / GET 下載，`resolveActor()` 入口檢查、`noStoreHeaders`、`errorResponse(status, code, msg)`） | **逐段鏡像**成 `/api/projects/[projectId]/drive/uploads/route.ts` |
| 白名單與分級上限 | `src/lib/ui-data/yuanzhan/operating-assets.ts` `classifyAsset()`、`buildAssetObjectKey()`、`canSeatReadAsset()`、`formatAssetRefCode()` | 直接用；`classifyAsset` 需為專案情境放寬副檔名與上限（Owner 決策 D1） |
| 參考碼續號 | `operating-assets.service.ts` `nextRefSeq()` + `ref_code` UNIQUE 重試 | 直接用（新 origin 代號 `PRJ`／`MTG`／`LINE`） |
| 孤兒清理 | `listStaleUploadingAssets()` + `scripts/cleanup-orphan-assets.ts`（`pnpm ops:assets:cleanup`） | 直接用（它不綁 origin） |
| 遞迴樹 UI | `src/components/work/deliverable/deliverable-tree.tsx`（`FolderNode`/`buildTree`/lucide `Folder`/`FolderOpen`/`File`） | 當 P0 樹狀側欄的骨架；**不複用其資料模型** |
| 表格／篩選／抽屜 UI | `src/components/ai/file-library/*`（13 個元件：list/row/detail-drawer/search-and-filters/active-filter-chips/version-history/references-panel/…） | 檔案列表、詳細抽屜、篩選 chips 幾乎可照搬 |

### 5.2 資料模型

**新增** `ProjectFolder`、**新增** enum `ProjectFolderKind`、**擴充** `OperatingAsset`。

```prisma
/// 專案雲端硬碟的資料夾。一棵樹、一個型別欄位；會議屬性在 ProjectMeeting 側表（決定 D-C）。
///
/// 為什麼每個專案一定有一個 isRoot 列：Postgres 的 UNIQUE 視 NULL 為互異，
/// 所以 @@unique([projectId, parentId, nameNormalized]) 擋不住兩個同名的根層資料夾。
/// 給每個專案一個真的根（parentId = null，且只有它 isRoot）之後，其餘資料夾的
/// parentId 一律非空，同層同名就由 @@unique([parentId, nameNormalized]) 真的擋下來。
enum ProjectFolderKind {
  /// 一般資料夾
  GENERIC
  /// 收件匣。每個專案恰好一個，isSystem = true，不可改名、不可刪除（決定 D-E）
  INBOX
  /// 一個資料夾＝一場會議。屬性在 ProjectMeeting（決定 D-C）
  MEETING
  /// LINE 群導入的媒體落點。每個綁定一個
  LINE_IMPORT
  /// 硬碟根。每個專案恰好一個
  ROOT

  @@map("project_folder_kind")
}

model ProjectFolder {
  id          String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId   String            @map("project_id") @db.Uuid
  project     Project           @relation("ProjectFolders", fields: [projectId], references: [id], onDelete: Cascade)
  parentId    String?           @map("parent_id") @db.Uuid
  parent      ProjectFolder?    @relation("ProjectFolderTree", fields: [parentId], references: [id], onDelete: Restrict)
  children    ProjectFolder[]   @relation("ProjectFolderTree")

  kind        ProjectFolderKind @default(GENERIC)
  name        String
  /// 小寫 + NFC 正規化後的名字，只用來做同層唯一性。顯示一律用 name。
  nameNormalized String         @map("name_normalized")

  /// 具體化路徑：'/<rootId>/<id>/'。子樹查詢 startsWith，搬移時一次 UPDATE ... WHERE path LIKE 'old%'。
  /// 不用 ltree：Prisma 沒有該型別，得整張表退回 Unsupported() 與 raw query。
  path        String
  depth       Int               @default(0)
  sortOrder   Int               @default(0) @map("sort_order")

  /// 系統資料夾（ROOT / INBOX）不可改名、不可刪除、不可搬移
  isSystem    Boolean           @default(false) @map("is_system")
  /// team = 專案成員可見；personal = 只有建立者可見（與 OperatingAsset.space 同語意）
  space       String            @default("team")
  createdByProfileId String?    @map("created_by_profile_id") @db.Uuid
  createdBy   Profile?          @relation("ProjectFolderCreatedBy", fields: [createdByProfileId], references: [id], onDelete: SetNull)

  note        String?
  deletedAt   DateTime?         @map("deleted_at")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  assets      OperatingAsset[]  @relation("ProjectFolderAssets")
  meeting     ProjectMeeting?   @relation("ProjectMeetingFolder")
  lineBindings ProjectLineBinding[] @relation("ProjectLineBindingFolder")

  @@unique([parentId, nameNormalized], map: "project_folders_sibling_name_unique")
  @@index([projectId, kind], map: "project_folders_project_kind_idx")
  @@index([projectId, path], map: "project_folders_project_path_idx")
  @@map("project_folders")
}
```

`OperatingAsset` 的擴充（**只加欄位與索引，不改任何既有欄位語意**）：

```prisma
model OperatingAsset {
  // …既有 22 欄不動…

  /// 專案範圍的檔案才有值。授權從這裡走 assertCanAccessProject，而不是只看 workspaceId。
  projectId   String?        @map("project_id") @db.Uuid
  project     Project?       @relation("ProjectAssets", fields: [projectId], references: [id], onDelete: Cascade)

  /// 雲端硬碟的位置。永遠有值（不指定就是該專案的 INBOX，決定 D-E）。
  /// 搬移只改這一欄，objectKey 不動。
  folderId    String?        @map("folder_id") @db.Uuid
  folder      ProjectFolder? @relation("ProjectFolderAssets", fields: [folderId], references: [id], onDelete: Restrict)

  /// 被整理出收件匣的時刻。null = 還在待整理狀態。
  filedAt     DateTime?      @map("filed_at")

  /// { "thumb480": "operating/{ws}/derived/{assetId}/thumb-480.webp", "poster": "…" }
  /// 形狀還在演進（縮圖尺寸、影片 poster、PDF 首頁），先整包存（與 relations/customFields 同理由）。
  derivatives Json           @default("{}")

  /// origin 既有值 journal | library | cashflow，新增 project_drive | meeting | line | chat
  // origin 欄位本身不動，只擴充允許值（它是 String，不是 enum）

  chatAttachments ProjectChatAttachment[] @relation("ChatAttachmentAsset")
  lineEvents      LineInboundEvent[]      @relation("LineInboundEventAsset")

  @@index([projectId, folderId, status], map: "operating_assets_project_folder_idx")
  @@index([projectId, filedAt], map: "operating_assets_project_filed_idx")
  // …既有四個索引不動…
}
```

> `origin` 是 `String @default("journal")` 而不是 enum —— 擴充允許值不需要 migration，只需改 `/api/.../uploads` 的 `ORIGINS` 白名單與 `src/lib/ui-data/yuanzhan/operating-assets.ts` 的 `AssetOrigin` 型別。這是既有設計留下的彈性，用它。

### 5.3 API / Server Action 介面

檔案：`src/app/actions/project-drive.ts`（`"use server"`）、`src/lib/services/project-drive.service.ts`（`import "server-only"`）。

| Action | 輸入 | 輸出 | 備註 |
|---|---|---|---|
| `getProjectDriveTree(projectId)` | `{ projectId: uuid }` | `ActionResult<DriveTreeNode[]>` | 整棵樹（扁平列 + parentId），二人份量級一次撈完 |
| `getProjectFolderContents(input)` | `{ projectId, folderId?, search?, kind?, sort?, cursor? }` | `ActionResult<{ folder, breadcrumb[], subfolders[], assets[], nextCursor? }>` | `folderId` 省略＝ROOT |
| `createProjectFolder(input)` | `{ projectId, parentId, name, kind?, space? }` | `ActionResult<DriveFolder>` | `kind` 預設 GENERIC；`MEETING` 走 §7 的專用 action |
| `renameProjectFolder(input)` | `{ folderId, name }` | `ActionResult<DriveFolder>` | `isSystem` → 拒絕 |
| `moveProjectFolder(input)` | `{ folderId, toParentId }` | `ActionResult<{ movedCount }>` | 拒絕搬到自己的子樹（比對 `path.startsWith`）；一次 `$executeRaw` 更新子樹 path/depth |
| `deleteProjectFolder(input)` | `{ folderId, mode: "soft" }` | `ActionResult<{ assetCount }>` | 只軟刪；非空資料夾要求先確認；`isSystem` → 拒絕 |
| `moveProjectAssets(input)` | `{ projectId, assetIds[], toFolderId }` | `ActionResult<{ movedCount, filedCount }>` | **整理動作**。不動 R2 |
| `renameProjectAsset(input)` | `{ assetId, displayName }` | `ActionResult<DriveAsset>` | `refCode` 不變（`RES-018`：參考碼永不重生成） |
| `deleteProjectAssets(input)` | `{ projectId, assetIds[] }` | `ActionResult<{ count }>` | 軟刪（`deletedAt`）；硬刪＋R2 刪除排 P2 |
| `getProjectDriveStats(projectId)` | `{ projectId }` | `ActionResult<{ totalBytes, assetCount, inboxCount, byKind }>` | 硬碟頁頭部 |

Route handler（必須是 route，因為要回 R2 URL 給瀏覽器直傳）：

```txt
POST   /api/projects/[projectId]/drive/uploads
       body { name, contentType, bytes, folderId?, origin?, space? }
       → classifyAsset() 閘門 → ensureProjectWorkspace() → createPendingProjectAsset()
       → 200 { assetId, refCode, kind, objectKey, uploadUrl, multipart, folderId }

PATCH  /api/projects/[projectId]/drive/uploads
       body { assetId, outcome?: "failed" }
       → finalizeAsset()（HeadObject 核對大小／ETag）
       → 200 { status, assetId, refCode, sizeBytes } | 422 { code: "missing" | "size_mismatch" }

GET    /api/projects/[projectId]/drive/uploads?assetId=…
       → resolveProjectDownloadGrant() → createDownloadUrl()
       → 200 { downloadUrl, expiresInSeconds }

POST   /api/projects/[projectId]/drive/multipart        （P2）
       body { assetId, action: "create" | "sign-part" | "complete" | "abort", partNumber?, parts? }
```

> `GET` 用 `assetId` 而非 `key`：既有營運路由收 `?key=`，然後在 `resolveDownloadGrant()` 裡反查是誰的。專案這一側一開始就用 id，省掉一次反查，也不讓 objectKey 出現在前端 URL 裡。

### 5.4 R2 儲存策略

| 題目 | 決定 | 理由 |
|---|---|---|
| key 命名 | **沿用既有** `operating/{workspaceId}/asset/{yyyy-mm}/{uuid}{ext}` | 已經含 `workspaceId`（`ARC-033` 租戶隔離）；由伺服器產生，不採用前端送來的路徑（既有註解） |
| key 要不要含 projectId / folder 路徑 | **不含** | R2 沒有原子 rename：改 key 等於 CopyObject + DeleteObject，一次搬 500 個檔＝1000 次 Class A 操作，而且 R2 對**同一個 key 每秒 1 次寫入**的限制會讓批次搬移需要退避。資料夾在 DB 的回報就是「搬移是 0 bytes」 |
| folder tree vs flat keys | **DB 有樹、R2 全平** | 同上 |
| signed URL | 一律即時產生、**永不落地**（`AUT-004`、`SCH-005` §5） | 既有 `presigned-url.ts` 已如此 |
| 下載 TTL | 一般 300s（不動）；`kind in (audio, video)` → **3600s**（Owner 決策 D3 選項 A） | `<video>` 靠 HTTP Range 續讀，播到第 8 分鐘再拉資料時 300s 的網址已過期 → 403，播放器只顯示「無法播放」 |
| 大檔 | 門檻 **64 MB**：以下單次 PUT；以上 multipart（8 MB/段、並行 3）。`CreateMultipartUpload`／`CompleteMultipartUpload` 在 S3 API 是 POST，**R2 預簽只支援 GET/HEAD/PUT/DELETE**，所以這兩步必須留在伺服器用憑證呼叫，只有 `UploadPart`（PUT）可預簽下放 | 與 `claude/journal-asset-upload-r2-proposals.md` 一致；順便讓瀏覽器拿不到開新 upload 的權限 |
| 縮圖／預覽 | 衍生物 key `operating/{workspaceId}/derived/{assetId}/{variant}.{ext}`，索引在 `derivatives Json`。P1 只做：圖片原圖 CSS 縮放＋燈箱、PDF `<iframe>`。P2 做影音播放器。P3 做 docx/xlsx/pptx 前端解析（mammoth / SheetJS / JSZip）並順便抽文字進 `extractedText` | 伺服器 LibreOffice 轉 PDF 在 Vercel serverless 跑不動（已否決） |
| 刪除 | 軟刪（`deletedAt`）＋ 30 天後硬刪排程；P0 只做軟刪與欄位 | Owner 決策 D5 |
| 掃毒 | `scanStatus` 維持 `NOT_REQUIRED`。**這是已知且接受的風險**，開放客戶（`R2STORE-007`）之前必補 | 既有決定，原樣繼承 |

### 5.5 UI 路由與版面

```txt
/work/[projectId]/drive                     ← 硬碟根
/work/[projectId]/drive?folder=<folderId>   ← 某一層（用 query 而非 catch-all，見下）
```
> 用 `?folder=<id>` 而非 `/drive/[...path]`：路徑段會把資料夾改名變成網址失效，而 id 不會。麵包屑從 `path` 欄位算出來給人看。

版面（桌機 ≥1024px，三欄；390px 收成單欄 + 抽屜）：
- **左**：樹狀側欄（複用 `deliverable-tree.tsx` 的 `FolderNode` 遞迴形狀）。頂端固定三項：`📥 收件匣 (N)`、`🗓 會議`（`kind=MEETING` 的虛擬聚合視圖）、`🟢 LINE`（`kind=LINE_IMPORT`）。其下是使用者自建的樹。
- **中**：檔案表（`@tanstack/react-table`，與 `src/components/ai/file-library/file-asset-list.tsx` 同形狀）。欄位：縮圖／名稱＋`refCode` 徽章／kind／大小／上傳者／時間／狀態。支援多選 + 拖放到左樹（P2 才上 `@dnd-kit`，P1 用「移動到…」選單）。
- **右**：詳細抽屜（複用 `file-detail-drawer.tsx`）：預覽、`refCode`（可複製）、來源（哪則聊天／哪場會議／哪個 LINE 群／哪一天日誌）、反向引用清單。
- **頂**：麵包屑 + 搜尋 + 篩選 chips（`active-filter-chips.tsx`）+「上傳」+「新資料夾」。
- **收件匣的第一視線**：進 `/drive` 時若 `inboxCount > 0`，預設選中收件匣並在表頭顯示「N 個檔案待整理」+「全部移動到…」。符合 `AGENTS.md` §12「第一個 viewport 要讓主要注意區明顯」。

---

## 6. 資源③：專案工作區（期／階段／里程碑／任務）

### 6.1 期模型：為什麼需要新的一層

Owner 的序列：
```
一期： 提案 → 接案（合約）→ 執行 → 驗收 → 結案
二期： 提案 → 接案（合約）→ 執行 → 驗收 → 執行 → 驗收 → 結案
```

| 選項 | 能不能表達二期 | 代價 |
|---|---|---|
| A. 扁平 enum（`Project.phase` 現況） | **不能**。一個專案只有一個當前 phase，歷史不留，更沒有「第幾次執行」 | — |
| B. 扁平階段序列 + `sortOrder`（一張 `ProjectStage` 表，`kind` enum + 順序號） | **能排出順序，但答不出「這是二期的執行」**。要問「二期花了多少錢」必須靠人去數「第 5、6 個格子屬於二期」。而二期通常有自己的追加合約與預算 —— 那是一個實體，不是一段區間 | 省一張表，但把語意推給使用者與查詢端 |
| C. **兩層：期（`ProjectPhaseCycle`）→ 階段（`ProjectPhaseNode`）**（**採用**） | **能**。`期.ordinal = 2` 之下再有 `執行` 與 `驗收` 兩個階段；「二期」有自己的 `contractId`、`budgetAmount`、`plannedStart/End`、`status` | 多一張表、多一層 UI |

**為什麼「期」值得一張表而不只是一個整數欄位**：repo 裡已經有 `OperatingContract.projectId` —— 二期在現實中幾乎總是**一份新的（或追加的）合約**。期因此天然帶著合約、預算、起訖、驗收條件。把它做成整數欄位意味著這些東西得散在別處再靠 `cycleNo` 串回來。

**為什麼不是「期底下直接是里程碑」（砍掉階段層）**：Owner 要的是「每個階段的關鍵時間來追蹤節奏」。階段是**流程格**（提案／接案／執行／驗收／結案），里程碑是**交付物**。合併之後「提案」會變成一個沒有交付物的假里程碑，而「二期第三個交付物」會失去它屬於哪個流程格的資訊。而且 `ProjectPhaseNode`（含 NOT NULL 的 `startDate`/`endDate`）與 `ProjectMilestone`（`date` 可空）**已經存在且語意正確** —— 這一層不是新發明，是已經在那裡的東西。

### 6.2 資料模型

**新增** `ProjectPhaseCycle`、**新增** enum `ProjectStageKind`、`ProjectPhaseCycleStatus`、`ProjectTaskKind`、`ProjectReviewState`；**擴充** `ProjectPhaseNode` 與 `ProjectTask`。

```prisma
/// 「期」：一個交付週期，通常對應一份合約（一期／二期／三期）。
///
/// 為什麼不是 ProjectPhaseNode 上的一個整數欄位：二期帶著自己的合約、預算與起訖，
/// 那是一個實體。做成整數欄位的話，這些東西會散在別處，再靠 cycleNo 串回來。
enum ProjectPhaseCycleStatus {
  PLANNED
  ACTIVE
  ACCEPTED
  CLOSED
  CANCELLED

  @@map("project_phase_cycle_status")
}

model ProjectPhaseCycle {
  id          String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId   String                  @map("project_id") @db.Uuid
  project     Project                 @relation("ProjectPhaseCycles", fields: [projectId], references: [id], onDelete: Cascade)

  /// 1, 2, 3 …。顯示成「一期」「二期」。
  ordinal     Int
  /// 使用者可覆寫的標籤（'二期：南區擴充'）。空＝依 ordinal 自動顯示。
  label       String?

  /// 這一期依據哪份合約。可空：提案階段還沒有合約。
  contractId  String?                 @map("contract_id") @db.Uuid
  contract    OperatingContract?      @relation("ContractPhaseCycles", fields: [contractId], references: [id], onDelete: SetNull)

  budgetAmount Int                    @default(0) @map("budget_amount")
  plannedStartOn DateTime?            @map("planned_start_on") @db.Date
  plannedEndOn   DateTime?            @map("planned_end_on") @db.Date
  actualStartOn  DateTime?            @map("actual_start_on") @db.Date
  actualEndOn    DateTime?            @map("actual_end_on") @db.Date

  status      ProjectPhaseCycleStatus @default(PLANNED)
  note        String?
  deletedAt   DateTime?               @map("deleted_at")
  createdAt   DateTime                @default(now()) @map("created_at")
  updatedAt   DateTime                @updatedAt @map("updated_at")

  stages      ProjectPhaseNode[]      @relation("PhaseCycleStages")

  @@unique([projectId, ordinal], map: "project_phase_cycles_project_ordinal_unique")
  @@index([projectId, status], map: "project_phase_cycles_project_status_idx")
  @@map("project_phase_cycles")
}

/// 階段的種類。既有的 ProjectPhase enum（DISCOVERY/PLANNING/EXECUTION/REVIEW/MAINTENANCE）
/// 是另一套詞彙，仍被 Project.phase 與 v5 工作台的 phases 集合使用，不動它。
enum ProjectStageKind {
  PROPOSAL     // 提案
  CONTRACT     // 接案（合約）
  EXECUTION    // 執行
  ACCEPTANCE   // 驗收
  CLOSING      // 結案
  CUSTOM       // 使用者自訂的流程格

  @@map("project_stage_kind")
}
```

`ProjectPhaseNode` 的擴充（**全部可空或帶預設，既有列不受影響**）：

```prisma
model ProjectPhaseNode {
  // …既有欄位全部不動（projectId / phase / label / workbenchRef / startDate / endDate / status / …）…

  /// 這個階段屬於哪一期。
  /// 必須可空：v5 工作台的 `phases` 集合（WRITE_ENABLED_COLLECTIONS）會繼續
  /// 建立沒有期的階段列；設成必填會讓既有寫入路徑當場壞掉。
  phaseCycleId String?           @map("phase_cycle_id") @db.Uuid
  phaseCycle   ProjectPhaseCycle? @relation("PhaseCycleStages", fields: [phaseCycleId], references: [id], onDelete: SetNull)

  /// 期內順序（1,2,3…）。與 phaseCycleId 一起構成階段在期內的身分。
  ordinal      Int?

  /// 五格流程的種類。既有 `phase`（ProjectPhase enum）保留為粗分類／工作台相容欄位。
  stageKind    ProjectStageKind? @map("stage_kind")

  /// 關鍵時間：既有 startDate/endDate 是計畫；這兩欄是實際。
  actualStartOn DateTime?        @map("actual_start_on") @db.Date
  actualEndOn   DateTime?        @map("actual_end_on") @db.Date

  /// 這個階段的閘門：要全部審核任務通過才能標 DONE。
  gateRequiresReview Boolean     @default(false) @map("gate_requires_review")
  /// 「做完長什麼樣」—— 階段層級的驗收判準（與 ProjectTask.expectation 同精神）
  exitCriteria String?           @map("exit_criteria")

  tasks        ProjectTask[]     @relation("StageTasks")

  @@unique([phaseCycleId, ordinal], map: "project_phase_nodes_cycle_ordinal_unique")
  @@index([phaseCycleId, stageKind], map: "project_phase_nodes_cycle_kind_idx")
  // …既有索引不動…
}
```

`ProjectTask` 的擴充：

```prisma
/// TODO 與審核是同一張表的兩種 kind，不是兩張表。
/// 兩張表的話，里程碑達成率必須 UNION 兩個來源，而「這個里程碑還剩幾件事」
/// 就會有兩個答案。
enum ProjectTaskKind {
  TODO
  REVIEW

  @@map("project_task_kind")
}

enum ProjectReviewState {
  PENDING
  IN_REVIEW
  PASSED
  CHANGES_REQUESTED
  WAIVED

  @@map("project_review_state")
}

model ProjectTask {
  // …既有欄位全部不動…

  kind             ProjectTaskKind     @default(TODO)

  /// 直接掛在哪個里程碑。objectiveId 仍然存在（更細的分組），但不是必要的中間層：
  /// 「里程碑底下的 TODO」不應該被迫先發明一個目標。
  /// 不變量（服務層強制、腳本可驗）：objectiveId 有值時，milestoneId 必須等於
  /// objective.milestoneId。這是刻意的去正規化，換「這個里程碑的任務」一次查詢查完。
  milestoneId      String?             @map("milestone_id") @db.Uuid
  milestone        ProjectMilestone?   @relation("MilestoneTasks", fields: [milestoneId], references: [id], onDelete: SetNull)

  /// 階段層級的任務（不屬於任何里程碑的流程待辦，例如「寄出提案簡報」）
  phaseNodeId      String?             @map("phase_node_id") @db.Uuid
  phaseNode        ProjectPhaseNode?   @relation("StageTasks", fields: [phaseNodeId], references: [id], onDelete: SetNull)

  /// kind = REVIEW 才有意義
  reviewState      ProjectReviewState? @map("review_state")
  reviewerProfileId String?            @map("reviewer_profile_id") @db.Uuid
  reviewer         Profile?            @relation("TaskReviewer", fields: [reviewerProfileId], references: [id], onDelete: SetNull)
  /// 席位字串（yz / lily）。對不到 Profile 時身分仍保得住（抄 OperatingComment 的雙身分設計）
  reviewerKey      String?             @map("reviewer_key")
  reviewedAt       DateTime?           @map("reviewed_at")
  reviewNote       String?             @map("review_note")
  /// [{ id, text, ok }] 審核清單。形狀仍在演進，與既有 subtasks 同理由先整包存。
  reviewChecklist  Json                @default("[]") @map("review_checklist")

  @@index([milestoneId, kind, status], map: "project_tasks_milestone_kind_idx")
  @@index([phaseNodeId, kind], map: "project_tasks_phase_node_idx")
  @@index([projectId, kind, status], map: "project_tasks_project_kind_status_idx")
}
```

`ProjectMilestone` 需要的反向關聯（唯一的必要改動）：
```prisma
model ProjectMilestone {
  // …既有全部不動…
  tasks ProjectTask[] @relation("MilestoneTasks")
}
```

### 6.3 二期／三期怎麼序列化（具體）

專案 `PRJ-2026-004`，二期：

| `ProjectPhaseCycle` | `ProjectPhaseNode` | | | |
|---|---|---|---|---|
| ordinal / label / contractId | ordinal | stageKind | label | startDate → endDate |
| **1**（一期）／`CT-2026-011` | 1 | `PROPOSAL` | 提案 | 2026-01-05 → 2026-01-31 |
| | 2 | `CONTRACT` | 接案（合約） | 2026-02-01 → 2026-02-14 |
| | 3 | `EXECUTION` | 執行（一期） | 2026-02-15 → 2026-05-31 |
| | 4 | `ACCEPTANCE` | 驗收（一期） | 2026-06-01 → 2026-06-20 |
| **2**（二期：南區擴充）／`CT-2026-029` | 1 | `CONTRACT` | 追加合約（二期） | 2026-06-21 → 2026-07-05 |
| | 2 | `EXECUTION` | 執行（二期） | 2026-07-06 → 2026-10-31 |
| | 3 | `ACCEPTANCE` | 驗收（二期） | 2026-11-01 → 2026-11-20 |
| | 4 | `CLOSING` | 結案 | 2026-11-21 → 2026-11-30 |

三期只是再加一列 `ProjectPhaseCycle { ordinal: 3 }`，把 `CLOSING` 從期 2 移到期 3 —— 一次 `UPDATE project_phase_nodes SET phase_cycle_id = <cycle3>, ordinal = 4`。**不需要 migration，不需要改 enum。** 這是選 C 相對選 B 最具體的好處：「加一期」是插一列，而不是重排一整串 `sortOrder`。

「一期裡執行→驗收→執行→驗收」（同一份合約內的兩輪）也表達得出來：期 1 底下 `ordinal 3=EXECUTION, 4=ACCEPTANCE, 5=EXECUTION, 6=ACCEPTANCE`。`stageKind` 不唯一是允許的 —— 唯一鍵是 `[phaseCycleId, ordinal]`。

**「現在走到哪」是推導的，不是存的**：`currentStage = 該專案最小的 (cycle.ordinal, stage.ordinal) 且 stage.status != DONE`。
理由：存一個 `currentStageId` 會與各階段的 `status` 構成兩個真相；而 `OperatingProjectProfile.stageEnteredAt` 的註解已經記過同一個教訓（「舊的做法是直接覆寫狀態字串，歷史不留」）。

### 6.4 範本（code constant，不是表）

`src/lib/ui-data/project-phase-templates.ts`：
```ts
export const PHASE_CYCLE_TEMPLATES = {
  firstCycle:  ["PROPOSAL", "CONTRACT", "EXECUTION", "ACCEPTANCE"],
  nextCycle:   ["CONTRACT", "EXECUTION", "ACCEPTANCE"],
  closing:     ["CLOSING"],
} as const
```
不做成資料表：範本是產品知識，不是使用者資料；放進表就得為它寫 CRUD、授權與種子。使用者仍可在建立後自由增刪階段。

### 6.5 Server Action 介面

`src/app/actions/project-workspace.ts` / `src/lib/services/project-phase.service.ts`

| Action | 輸入 | 輸出 |
|---|---|---|
| `getProjectPlan(projectId)` | `{ projectId }` | `ActionResult<{ cycles: [{ …, stages: [{ …, milestones: [{ …, objectives, tasks }] }] }], currentStage }>` |
| `createPhaseCycle(input)` | `{ projectId, label?, template: "firstCycle"\|"nextCycle"\|"blank", contractId?, plannedStartOn?, plannedEndOn?, budgetAmount? }` | `ActionResult<PhaseCycle>`（依範本一併建階段） |
| `updatePhaseCycle` / `deletePhaseCycle` | `{ cycleId, … }` / `{ cycleId }` | `ActionResult<…>`（刪除只軟刪，且底下有已完成階段時要求確認） |
| `reorderPhaseCycles` | `{ projectId, orderedCycleIds[] }` | `ActionResult<void>` |
| `createPhaseStage(input)` | `{ cycleId, stageKind, label, startDate, endDate, ordinal?, exitCriteria?, gateRequiresReview? }` | `ActionResult<PhaseStage>` |
| `updatePhaseStage` / `deletePhaseStage` / `reorderPhaseStages` | — | — |
| `moveStageToCycle` | `{ stageId, toCycleId, ordinal }` | `ActionResult<PhaseStage>`（「把結案移到三期」） |
| `setStageStatus` | `{ stageId, status }` | `ActionResult<PhaseStage>`；`gateRequiresReview && 有未通過的 REVIEW 任務` → 拒絕並回傳阻擋清單 |
| `createMilestone` / `updateMilestone` / `deleteMilestone` | `{ stageId \| milestoneId, title, date?, acceptance?, bonusAmount? }` | `ActionResult<Milestone>` |
| `createProjectWorkItem(input)` | `{ projectId, kind: "TODO"\|"REVIEW", title, milestoneId?, objectiveId?, phaseNodeId?, dueAt?, expectation?, reviewerKey?, reviewChecklist? }` | `ActionResult<Task>` |
| `updateProjectWorkItem` / `deleteProjectWorkItem` | — | — |
| `submitForReview` | `{ taskId }` | `ActionResult<Task>`（`reviewState: IN_REVIEW`） |
| `recordReviewDecision` | `{ taskId, decision: "PASSED"\|"CHANGES_REQUESTED"\|"WAIVED", note?, checklist? }` | `ActionResult<Task>`；寫 `reviewedAt` 與 `reviewerProfileId` |
| `getProjectRhythmHealth(projectId)` | `{ projectId }` | `ActionResult<{ stagesLate[], milestonesUndated[], reviewsBlocking[], daysToNextKeyDate }>` |

### 6.6 UI 路由與版面

```txt
/work/[projectId]/plan                    ← 期／階段甘特 + 當前階段卡
/work/[projectId]/plan?cycle=<id>         ← 聚焦某一期
/work/[projectId]/plan/[stageId]          ← 階段詳情（里程碑 + 任務）
```
- **頂部 rhythm bar**：一條橫向時間軸，每一期一個色帶，期內階段是段落，`actualEndOn > endDate` 的段落標紅。這就是「追蹤節奏」的第一視線。右側三個數字：`距下一個關鍵時間 N 天`／`逾期階段 N`／`阻擋中的審核 N`。
- **中段**：當前階段卡（階段名／起訖／`exitCriteria`／里程碑進度／阻擋審核清單）。
- **下段**：期的手風琴。展開＝階段列，階段展開＝里程碑列，里程碑展開＝任務列（TODO 與 審核分兩個 chip 群，審核任務帶 `reviewState` 色票）。
- 甘特用 CSS grid 自建（`claude/operating-module-implementation-decision.md` 已查明 Schedule-X v4 把拖拉移到 premium、FullCalendar timeline 是 premium）。P0 不做拖拉；P2 才上 `@dnd-kit/core`。

---

## 7. 資源⑤：會議資料

### 7.1 可複用的現有基礎

| 要素 | 既有 | 複用方式 |
|---|---|---|
| 一資料夾一場會議 | `ProjectFolder{ kind: MEETING }` | §5.2 |
| 會議材料檔案 | `OperatingAsset{ folderId, origin: "meeting" }` | §5.2 |
| 會議紀錄／memo | **`OperatingDocObject`**（`kind` 已含會議紀錄類型，`payload { secs: [{title, blocks}] }`，物件索引已支援） | `ProjectMeeting.minutesDocObjectId` 指向它 |
| 行事曆那一側 | **`Occasion`**（`OccasionCategory.CLIENT_MEETING` 已存在、`actorIds String[] @db.Uuid`、`externalGuests String?`、`prep Json`、`recap String?`、`projectId?`） | `ProjectMeeting.occasionId` optional link；參與者欄位形狀照抄 |
| 會議結論升級成決議 | **`OperatingDecision`**（`projectId?`、`decidedOn`） | `promoteMeetingConclusion()` 產生一列 |
| 時間序呈現 | `TimeSpine`（`SpineTrack.OCCASION`） | 經 `Occasion` 自動進骨幹，不新增 track |
| 音訊轉錄 | `OperatingAsset.transcript` / `durationSec` 欄位已存在 | P3 填值 |

### 7.2 資料模型：屬性跟著資料夾，但不污染資料夾

```prisma
/// 一場會議 = 一個 kind=MEETING 的 ProjectFolder + 這張側表。
///
/// 為什麼主鍵就是 folderId：這是 SCH-008 §3 決定 C 的同一條原則
/// （OperatingProjectProfile { projectId @id }，註解寫「1:1 共用主鍵，沒有第二個 id 要對齊」）。
/// 會議的六個屬性因此不出現在 ProjectFolder 上 —— 99% 的資料夾不是會議。
/// 下一種帶屬性的資料夾（驗收包、客戶交付包）再加一張側表，主表不動。
model ProjectMeeting {
  folderId    String        @id @map("folder_id") @db.Uuid
  folder      ProjectFolder @relation("ProjectMeetingFolder", fields: [folderId], references: [id], onDelete: Cascade)
  projectId   String        @map("project_id") @db.Uuid
  project     Project       @relation("ProjectMeetings", fields: [projectId], references: [id], onDelete: Cascade)

  title       String
  /// 會議「產生時間」。時間序排序鍵。
  heldAt      DateTime      @map("held_at")
  heldOn      DateTime      @map("held_on") @db.Date
  endsAt      DateTime?     @map("ends_at")
  place       String?
  /// online | onsite | hybrid
  modality    String        @default("onsite")

  /// 內部參與者（Profile.id）。欄位形狀照抄 Occasion.actorIds —— 同一個概念不該有兩種表示。
  participantProfileIds String[] @map("participant_profile_ids") @db.Uuid
  /// 席位字串（yz / lily）。Profile 還對不到人時身分仍保得住。
  participantKeys       String[] @map("participant_keys")
  /// 外部參與者自由文字（客戶、廠商）。照抄 Occasion.externalGuests。
  externalGuests        String?  @map("external_guests")

  /// 會議小結論
  summary     String?
  /// 注意事項 / 待留意的風險
  cautions    String?
  /// [{ id, text, taskId? }] 會議產出的待辦；升級成 ProjectTask 後回填 taskId
  actionItems Json          @default("[]") @map("action_items")

  /// 會議紀錄文件物件（複用 OperatingDocObject，不另造一種 memo）
  minutesDocObjectId String? @map("minutes_doc_object_id") @db.Uuid
  minutesDocObject   OperatingDocObject? @relation("MeetingMinutes", fields: [minutesDocObjectId], references: [id], onDelete: SetNull)

  /// 行事曆那一側。可空：補記一場沒排進日曆的會議不該被迫先建一個 Occasion。
  occasionId  String?       @map("occasion_id") @db.Uuid
  occasion    Occasion?     @relation("OccasionMeeting", fields: [occasionId], references: [id], onDelete: SetNull)

  /// 掛在哪一期／哪一個階段（選用）。讓「二期驗收會議」查得出來。
  phaseCycleId String?      @map("phase_cycle_id") @db.Uuid
  phaseNodeId  String?      @map("phase_node_id") @db.Uuid

  deletedAt   DateTime?     @map("deleted_at")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  @@index([projectId, heldAt], map: "project_meetings_project_held_idx")
  @@index([occasionId], map: "project_meetings_occasion_idx")
  @@map("project_meetings")
}
```
`Occasion` 與 `OperatingDocObject` 各需加一個反向關聯欄位（`meeting ProjectMeeting?`、`meetings ProjectMeeting[]`），否則 `scripts/check-prisma-structure.mjs` 會 FAIL。

> **為什麼參與者是陣列而不是 join 表**：`Occasion.actorIds String[] @db.Uuid` 已經在生產中用這個形狀表示同一件事。再開一張 `ProjectMeetingParticipant` 會讓「誰參加了什麼」有兩種查法。代價是查不到「這個人參加過哪些會議」的索引（Postgres 需要 GIN，Prisma 宣告不了）—— 二人公司的量級下用 `participantProfileIds: { has: id }` 全表掃可接受，真的變慢時再補 join 表（屆時陣列降級成快取）。

### 7.3 Server Action 介面

`src/app/actions/project-meeting.ts` / `src/lib/services/project-meeting.service.ts`

| Action | 輸入 | 輸出 |
|---|---|---|
| `listProjectMeetings(input)` | `{ projectId, from?, to?, phaseCycleId?, cursor? }` | `ActionResult<{ meetings: MeetingCard[], nextCursor? }>`（`ORDER BY heldAt DESC`） |
| `createProjectMeeting(input)` | `{ projectId, title, heldAt, endsAt?, place?, modality?, participantProfileIds?, participantKeys?, externalGuests?, parentFolderId?, occasionId?, phaseNodeId? }` | `ActionResult<Meeting>` —— **一次交易內**建 `ProjectFolder{kind: MEETING}` 與 `ProjectMeeting` |
| `updateProjectMeetingAttributes(input)` | `{ folderId, …任一屬性 }` | `ActionResult<Meeting>` |
| `deleteProjectMeeting(input)` | `{ folderId, mode: "soft" }` | `ActionResult<void>`（資料夾與側表一起軟刪；檔案保留在物件索引並標「來源已刪除」，與既有物件索引行為一致） |
| `attachMeetingMinutes(input)` | `{ folderId, docObjectId? }` | `ActionResult<Meeting>`；`docObjectId` 省略＝新建一個 `OperatingDocObject{ kind: 會議紀錄 }` |
| `promoteMeetingConclusion(input)` | `{ folderId, title, body? , decidedOn? }` | `ActionResult<{ decisionId }>` → 建一列 `OperatingDecision` |
| `promoteMeetingActionItem(input)` | `{ folderId, itemId, milestoneId?, assigneeKey?, dueAt? }` | `ActionResult<{ taskId }>` → 建 `ProjectTask`，回填 `actionItems[].taskId` |
| `linkMeetingToOccasion(input)` | `{ folderId, occasionId }` | `ActionResult<Meeting>` |

上傳一律走 §5.3 的 drive 路由，`folderId` 給會議資料夾、`origin = "meeting"`。**不另造一條會議上傳路由**（`PLN-064` Stage 4 明文禁止為某個入口另寫一套上傳路由）。

### 7.4 UI 路由與版面

```txt
/work/[projectId]/meetings                ← 時間序清單
/work/[projectId]/meetings/[folderId]     ← 一場會議
```
- **清單**：時間軸（月份分組，複用物件索引已實作的「月份列掛當天日誌標題作時間地標」手法）。每一列是一張卡：日期大字／標題／`modality` 圖示／參與者頭像堆／材料數量（🎙2 📄3 🖼5）／`summary` 一行截斷。右上「新增會議」。
- **單場頁**：左側是**屬性框**（Owner 要的「小框框」）—— 參與者、產生時間、地點、小結論、注意事項，每一欄 inline 可編輯（複用 `claude/table-inline-edit-and-filing-preview-implemented.md` 已落地的 inline edit 模式）。右側是材料清單（同 drive 的檔案表，folder 固定）＋會議紀錄文件物件的嵌入區塊。底部是 action items（可一鍵升級成任務）。
- 屬性框的每一格都要能空著 —— 一場剛發生的會議只有錄音和時間，結論是後補的。空值顯示「—」而不是隱藏那一列（否則使用者不知道可以填）。

---

## 8. 資源④：LINE 群導入

### 8.1 誠實的平台結論（先說不可能的）

| 需求 | 可行性 | 一手依據 |
|---|---|---|
| 讀取**加入前**的群組歷史訊息 | **技術上不可能** | LINE 官方文件：webhook 收到之後 **“There is no API available to get the text again after receiving the webhook.”** 更沒有任何列出歷史訊息的 API。Bot 只在被人**拉進群之後**才收得到該群的 `message` 事件 |
| LINE Notify 推播／接收 | **已終止** | LINE 官方公告：LINE Notify 於 **2025-03-31** 終止服務 |
| 加入後的文字訊息 | **可行** | Messaging API webhook `message` 事件（`source.type = "group"`，`source.groupId`） |
| 加入後的圖片／影片／音訊／檔案 | **可行但有時限** | `GET /v2/bot/message/{messageId}/content`；官方文件明載 **“Content that users send is automatically deleted after a certain period of time.”** 未給具體數字 → **必須在收到 webhook 後盡快抓取**，不能排到隔天 |
| 取得群組成員名單與顯示名稱 | **不保證** | 官方文件把「取得群組成員 user ID」「取得群組成員 profile」列為可用操作，但**未在該頁說明認證／付費官方帳號的條件**。實務上非認證帳號常拿不到完整名單。→ **設計必須容忍「只有 userId、沒有顯示名稱」**，不能把參與者名單當成一定拿得到 |
| 貼圖／位置／通話記錄 | 可收到事件，但沒有可用的內容 | 存成 `messageType` + 占位文字 |
| 把 bot 拉進群 | **只有人能做**，且群內其他成員會看到 bot 加入 | 這是隱私面必須對 Owner 說明的事（§15 爭議 E） |

**唯一的歷史補救：匯入 LINE App 的「傳送聊天記錄」匯出檔（.txt）。**
- 匯出檔是**純文字**。圖片、影片、貼圖、檔案在匯出檔裡是 `[照片]`／`[貼圖]`／`[檔案]` 之類的占位字串，**沒有任何 bytes**。所以「加入 bot 之前的圖片永遠拿不回來」。
- 格式（需在實作時以真實匯出檔校正）：日期標頭行 `2026/09/28(週一)`，之後每行 `HH:MM\t顯示名稱\t訊息內容`，多行訊息的續行沒有前置時間。解析器必須處理續行、系統訊息行、以及不同語系的日期標頭。

**對 Owner 的一句話結論**：
> 「LINE 群導入」只能是**兩半**：**向後**（把 bot 拉進群之後的文字＋媒體，自動且完整）＋**向前**（匯入 .txt 匯出檔補歷史，只有文字）。沒有任何技術能補回加入前的圖片。

### 8.2 候選方案比較

| 方案 | 可行 | 取得範圍 | 評估 |
|---|---|---|---|
| A. **Messaging API（官方帳號 bot 進群）＋ webhook**（**採用，向後**） | 是 | 加入後的文字＋媒體（媒體需即時抓） | 唯一能自動持續導入的路；需要公開 webhook route（高風險，§15 爭議 E） |
| B. LINE Notify | **否** | — | 2025-03-31 已終止服務 |
| C. **匯出檔 .txt 匯入**（**採用，向前**） | 是 | 歷史文字（無媒體） | 使用者手動操作一次；是唯一的歷史來源 |
| D. LINE Login + 使用者授權讀取聊天 | **否** | — | LINE 沒有讓第三方讀取使用者聊天內容的 API |
| E. 跑一個非官方 client（逆向協定） | 否決 | — | 違反 LINE 服務條款，帳號會被封；也不可能通過 `AGENTS.md` §11 的高風險核准 |

### 8.3 資料模型

複用 `SourceConnection`（已有 `provider: LINE`、`secretRef`、`providerAccountRef`、`status`、`lastSyncAt`）當**官方帳號憑證殼**，不另造憑證表。
`secretRef` 存的是**引用**，不是秘密 —— 真正的 channel secret / access token 留在環境變數（`LINE_CHANNEL_SECRET__<ref>`、`LINE_CHANNEL_TOKEN__<ref>`），與 `SourceConnection.secretRef` 既有語意一致（`AUT-001` 的 EXCLUDED_SECRET_FIELDS 已把 `channel secret`／`bot token` 列為不得外曝欄位）。

```prisma
enum LineSourceType {
  GROUP
  ROOM
  USER

  @@map("line_source_type")
}

enum LineBindingStatus {
  /// 已建立綁定，但還沒收到該群的任何事件（bot 可能還沒被拉進群）
  AWAITING_JOIN
  ACTIVE
  PAUSED
  /// 收到 leave 事件：bot 被踢出群
  REVOKED

  @@map("line_binding_status")
}

/// 一個專案 ↔ 一個 LINE 聊天室的綁定。一專案可綁多個（需求④）。
model ProjectLineBinding {
  id          String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId   String            @map("project_id") @db.Uuid
  project     Project           @relation("ProjectLineBindings", fields: [projectId], references: [id], onDelete: Cascade)

  /// 官方帳號憑證殼（provider = LINE）。真正的 secret 在環境變數，這裡只有 secretRef。
  sourceConnectionId String     @map("source_connection_id") @db.Uuid
  sourceConnection   SourceConnection @relation("LineBindings", fields: [sourceConnectionId], references: [id], onDelete: Restrict)

  sourceType  LineSourceType    @default(GROUP) @map("source_type")
  /// LINE 的 groupId / roomId / userId。不是給人看的，顯示用 displayName。
  lineSourceId String           @map("line_source_id")
  /// 使用者自己取的名字（'XX 建案群'）。LINE 不保證給得到群組名稱。
  displayName String

  /// 訊息鏡射到哪個頻道。一個綁定一個頻道（決定 D-B）。
  chatChannelId String          @map("chat_channel_id") @db.Uuid
  chatChannel   ProjectChatChannel @relation("LineChannelBinding", fields: [chatChannelId], references: [id], onDelete: Restrict)

  /// 媒體落到哪個資料夾（kind = LINE_IMPORT）。null = 落收件匣。
  mediaFolderId String?         @map("media_folder_id") @db.Uuid
  mediaFolder   ProjectFolder?  @relation("ProjectLineBindingFolder", fields: [mediaFolderId], references: [id], onDelete: SetNull)

  status      LineBindingStatus @default(AWAITING_JOIN)
  /// 要不要抓媒體 bytes（關掉只存文字與占位，省 R2 費用）
  ingestMedia Boolean           @default(true) @map("ingest_media")
  /// 綁定建立時刻。早於此的訊息一律不存在（平台限制，UI 要明說）
  boundAt     DateTime          @default(now()) @map("bound_at")
  boundByProfileId String?      @map("bound_by_profile_id") @db.Uuid
  firstEventAt DateTime?        @map("first_event_at")
  lastEventAt  DateTime?        @map("last_event_at")
  messageCount Int              @default(0) @map("message_count")
  deletedAt   DateTime?         @map("deleted_at")
  createdAt   DateTime          @default(now()) @map("created_at")
  updatedAt   DateTime          @updatedAt @map("updated_at")

  events      LineInboundEvent[]   @relation("LineBindingEvents")
  imports     LineTranscriptImport[] @relation("LineBindingImports")

  @@unique([projectId, lineSourceId], map: "project_line_bindings_project_source_unique")
  @@index([lineSourceId, status], map: "project_line_bindings_source_status_idx")
  @@map("project_line_bindings")
}

/// webhook 的原始落地表。先存原始事件並回 200，媒體抓取另外做。
///
/// 為什麼要這張而不是直接寫 ProjectChatMessage：LINE 期待 webhook 很快回 200，
/// 而抓媒體 bytes 可能要幾秒到幾十秒。原始事件先落地，重試才有依據；
/// 媒體抓失敗時那一則訊息仍然在，只是標 media_failed 並可重試。
enum LineEventProcessState {
  RECEIVED
  MATERIALIZED
  MEDIA_PENDING
  MEDIA_FAILED
  /// 沒有對應的綁定（未綁定的群把 bot 拉進去）→ 不materialize，留著供人決定
  UNBOUND
  IGNORED

  @@map("line_event_process_state")
}

model LineInboundEvent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  /// LINE 每個事件都帶 webhookEventId。重送同一個事件不會產生第二列。
  webhookEventId String @unique @map("webhook_event_id")
  bindingId   String?  @map("binding_id") @db.Uuid
  binding     ProjectLineBinding? @relation("LineBindingEvents", fields: [bindingId], references: [id], onDelete: SetNull)

  /// 哪個官方帳號收到的（route 的 channelKey）
  channelKey  String   @map("channel_key")
  sourceType  LineSourceType @map("source_type")
  lineSourceId String  @map("line_source_id")
  lineUserId  String?  @map("line_user_id")
  /// message | join | leave | memberJoined | memberLeft | postback | …
  eventType   String   @map("event_type")
  /// text | image | video | audio | file | sticker | location
  messageType String?  @map("message_type")
  lineMessageId String? @map("line_message_id")
  /// LINE 的 timestamp（毫秒）轉成的時刻
  sentAt      DateTime @map("sent_at")

  /// 原始 payload。查帳與重放的唯一依據。已去識別化不適用——這就是原始資料。
  rawPayload  Json     @map("raw_payload")

  processState LineEventProcessState @default(RECEIVED) @map("process_state")
  processError String? @map("process_error")
  retryCount  Int      @default(0) @map("retry_count")

  /// materialize 出來的訊息與媒體
  chatMessageId String? @map("chat_message_id") @db.Uuid
  assetId     String?  @map("asset_id") @db.Uuid
  asset       OperatingAsset? @relation("LineInboundEventAsset", fields: [assetId], references: [id], onDelete: SetNull)

  receivedAt  DateTime @default(now()) @map("received_at")

  @@unique([channelKey, lineMessageId], map: "line_inbound_events_message_unique")
  @@index([processState, receivedAt], map: "line_inbound_events_state_time_idx")
  @@index([bindingId, sentAt], map: "line_inbound_events_binding_time_idx")
  @@map("line_inbound_events")
}

/// 歷史匯入（.txt 匯出檔）。只有文字，沒有媒體 —— 這是平台限制，不是實作偷懶。
model LineTranscriptImport {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId   String   @map("project_id") @db.Uuid
  project     Project  @relation("ProjectLineImports", fields: [projectId], references: [id], onDelete: Cascade)
  bindingId   String?  @map("binding_id") @db.Uuid
  binding     ProjectLineBinding? @relation("LineBindingImports", fields: [bindingId], references: [id], onDelete: SetNull)
  /// 上傳的 .txt 本身也是一個 asset（原始憑證留著，解析結果可重算）
  sourceAssetId String @map("source_asset_id") @db.Uuid
  chatChannelId String @map("chat_channel_id") @db.Uuid

  /// pending | parsing | ready | failed
  status      String   @default("pending")
  parsedCount Int      @default(0) @map("parsed_count")
  /// 與 bot 已導入的訊息重複而略過的筆數
  dedupedCount Int     @default(0) @map("deduped_count")
  /// 占位（[照片] 等）而沒有 bytes 的筆數 —— UI 要把這個數字顯示出來
  placeholderCount Int @default(0) @map("placeholder_count")
  failedReason String? @map("failed_reason")
  /// 匯出檔涵蓋的時間範圍
  coverageFrom DateTime? @map("coverage_from")
  coverageTo   DateTime? @map("coverage_to")
  importedByProfileId String? @map("imported_by_profile_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([projectId, createdAt], map: "line_transcript_imports_project_time_idx")
  @@map("line_transcript_imports")
}
```
`SourceConnection` 需加反向關聯 `lineBindings ProjectLineBinding[] @relation("LineBindings")`。

### 8.4 導入管線

```txt
① LINE Platform
   → POST /api/line/webhook/[channelKey]          ← 公開 route，無 requireUser()
   → 驗 x-line-signature = Base64(HMAC-SHA256(channelSecret, rawBody))   ← 不符即 401，不記錄內容
   → 逐事件 upsert LineInboundEvent（webhookEventId 唯一 → 重送冪等）
   → 立刻回 200（LINE 期待快速回應）
   → after() / drain：materializeLineEvents()
       → 找 binding（channelKey + lineSourceId）；找不到 → processState = UNBOUND，停在這裡
       → 建 ProjectChatMessage{ channelId, origin: LINE, externalRef: lineMessageId, authorExternalRef: lineUserId, sentAt }
       → messageType in (image,video,audio,file) 且 binding.ingestMedia
           → GET /v2/bot/message/{messageId}/content（**盡快，內容會被 LINE 自動刪除**）
           → createPendingAsset({ projectId, folderId: binding.mediaFolderId ?? INBOX, origin: "line", kind, … })
           → PUT 到 R2（伺服器端串流，不經瀏覽器）→ finalize（HeadObject）
           → ProjectChatAttachment{ messageId, assetId }
       → processState = MATERIALIZED / MEDIA_FAILED

② GET/POST /api/line/ingest/drain                 ← cron（token 保護），撈 MEDIA_FAILED 與 RECEIVED 重試
   退避：retryCount 1,2,3 → 1m / 10m / 1h；>3 停手並在 UI 標示「媒體已過期，無法取回」

③ importLineTranscript() Server Action            ← 歷史補救
   上傳 .txt → asset → 解析 → 逐則建 ProjectChatMessage{ origin: LINE_IMPORT, isHistorical: true,
     externalRef: sha256(sentAt|author|text) }
   去重：同頻道已有 externalRef 相同的列 → dedupedCount++，不插入
   占位行（[照片]/[貼圖]/[檔案]）→ 仍建訊息、標 placeholder、placeholderCount++
```

**去重的兩道**：① bot 路徑用 LINE 的 `lineMessageId`（平台唯一）；② 匯入路徑用 `sha256(時間|作者|內容)`。兩者都寫進 `ProjectChatMessage.externalRef`，並以 `@@unique([channelId, externalRef])` 擋重。bot 與匯入檔重疊的時段因此只會留一份（先到的那份勝；bot 版本有媒體所以通常先到且更完整 —— 匯入時以 externalRef 比對，發現已存在就只累加 `dedupedCount`）。

### 8.5 Server Action 介面

`src/app/actions/project-line.ts` / `src/lib/services/project-line-ingest.service.ts`

| Action | 輸入 | 輸出 |
|---|---|---|
| `listProjectLineBindings(projectId)` | `{ projectId }` | `ActionResult<LineBindingCard[]>`（含 `status`、`messageCount`、`lastEventAt`、`boundAt`） |
| `createProjectLineBinding(input)` | `{ projectId, sourceConnectionId, displayName, sourceType?, ingestMedia? }` | `ActionResult<{ binding, pairingHint }>` —— **不收 `lineSourceId`**，因為人拿不到 groupId |
| `claimPendingLineSource(input)` | `{ bindingId, pendingEventId }` | `ActionResult<LineBinding>` —— 把一筆 `UNBOUND` 事件的 `lineSourceId` 認領給這個綁定（配對流程，見下） |
| `listPendingLineSources()` | — | `ActionResult<PendingSource[]>`（`processState = UNBOUND` 的事件依 `lineSourceId` 聚合，顯示最近幾則文字摘要給人辨認是哪個群） |
| `updateProjectLineBinding` / `pauseProjectLineBinding` / `deleteProjectLineBinding` | `{ bindingId, … }` | `ActionResult<…>`（刪除只軟刪；已導入的訊息不刪） |
| `importLineTranscript(input)` | `{ projectId, bindingId?, chatChannelId, sourceAssetId }` | `ActionResult<LineTranscriptImport>` |
| `getLineIngestHealth(projectId)` | `{ projectId }` | `ActionResult<{ bindings[], mediaFailedCount, unboundCount, lastEventAt }>` |

**配對流程（因為人拿不到 groupId）**：
1. 使用者在 `/work/[id]/settings/line` 按「新增 LINE 群」→ 建一個 `AWAITING_JOIN` 綁定，畫面顯示：「把官方帳號 `@xxxx` 加入你要綁的 LINE 群，然後在群裡隨便講一句話」。
2. Bot 收到那個群的第一則訊息，但沒有綁定 → `processState = UNBOUND`。
3. 畫面出現「偵測到新的 LINE 聊天室（最近訊息：『收到』）→ 綁到『XX 建案群』？」→ `claimPendingLineSource()`。
4. 這是 groupId 永遠不出現在 UI 上的做法（既有 LINE manifest 的 `nativeIdentifierExposed: false` 就是這個意思）。

### 8.6 UI 顯示什麼

- `/work/[projectId]/chat` 的頻道清單中，LINE 頻道帶綠色 LINE 徽章與「唯讀」標記（**站內不能回傳訊息到 LINE** —— P1 不做；要做就是 push message API，另一個題目與另一個 Owner 決策）。
- 頻道頂端常駐一條說明：「這個頻道從 `2026-10-02` 開始導入。LINE 平台不提供加入前的訊息。」 —— 這句話必須常駐，不是一次性提示。
- 匯入的歷史訊息在時間軸上以一條分隔線與不同底色區分，占位訊息顯示「[照片]（匯出檔不含圖片）」。
- 媒體抓取失敗的訊息顯示「媒體已過期，LINE 不再提供」並**不給重試按鈕**（超過重試上限後重試只會再失敗一次，給按鈕是騙人）。
- `/work/[projectId]/settings/line`：綁定清單、每個綁定的 `status`／訊息數／最後事件時間、`ingestMedia` 開關、媒體落點資料夾、歷史匯入入口與歷次匯入紀錄（含 `placeholderCount`）。

---

## 9. 資源①：專案聊天室（完整）

### 9.1 資料模型

```prisma
enum ProjectChatChannelKind {
  /// 專案主頻道，建立專案時自動建一個
  MAIN
  /// 主題討論
  TOPIC
  /// LINE 群鏡射（唯讀）
  LINE_MIRROR
  /// 客戶可見（未來 Client Portal 用；P0 不開）
  CLIENT

  @@map("project_chat_channel_kind")
}

model ProjectChatChannel {
  id          String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId   String                 @map("project_id") @db.Uuid
  project     Project                @relation("ProjectChatChannels", fields: [projectId], references: [id], onDelete: Cascade)
  kind        ProjectChatChannelKind @default(TOPIC)
  name        String
  topic       String?
  /// LINE_MIRROR 一律 true：站內不回傳訊息到 LINE（P1 範圍外）
  isReadOnly  Boolean                @default(false) @map("is_read_only")
  isArchived  Boolean                @default(false) @map("is_archived")
  sortOrder   Int                    @default(0) @map("sort_order")
  /// 衍生計數，由 service 單一 writer 維護（與 TimeSpine 同模式）
  messageCount Int                   @default(0) @map("message_count")
  lastMessageAt DateTime?            @map("last_message_at")
  createdByProfileId String?         @map("created_by_profile_id") @db.Uuid
  deletedAt   DateTime?              @map("deleted_at")
  createdAt   DateTime               @default(now()) @map("created_at")
  updatedAt   DateTime               @updatedAt @map("updated_at")

  messages    ProjectChatMessage[]   @relation("ChannelMessages")
  reads       ProjectChatRead[]      @relation("ChannelReads")
  lineBinding ProjectLineBinding?    @relation("LineChannelBinding")

  @@index([projectId, kind, isArchived], map: "project_chat_channels_project_kind_idx")
  @@map("project_chat_channels")
}

enum ProjectChatOrigin {
  /// 站內送出
  APP
  /// LINE bot 即時導入
  LINE
  /// LINE 匯出檔匯入的歷史
  LINE_IMPORT
  /// 系統訊息（有人加入、階段完成、里程碑達成）
  SYSTEM

  @@map("project_chat_origin")
}

/// 一列一訊息。
///
/// 為什麼不是 OperatingThread.messages Json：Json 陣列代表每送一則訊息重寫整列，
/// 兩人同時講話會互相覆蓋；而且每則訊息沒有自己的 id，就無法回覆特定訊息、
/// 無法掛附件外鍵、無法被 @ 引用、無法建索引搜尋。
/// 欄位形狀抄 OperatingComment：authorId + authorKey 雙身分（停用成員時保留歷史作者）、
/// parentId（回覆）、meta Json、deletedAt 軟刪（被引用過就不能真的消失）。
model ProjectChatMessage {
  id          String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId   String             @map("channel_id") @db.Uuid
  channel     ProjectChatChannel @relation("ChannelMessages", fields: [channelId], references: [id], onDelete: Cascade)
  /// 去正規化，讓「這個專案所有訊息」與授權檢查不必 join
  projectId   String             @map("project_id") @db.Uuid
  project     Project            @relation("ProjectChatMessages", fields: [projectId], references: [id], onDelete: Cascade)

  /// Profile.id。不設外鍵以外的強制：對不到人時留空，身分仍由 authorKey / authorExternalRef 保住
  authorProfileId String?        @map("author_profile_id") @db.Uuid
  author      Profile?           @relation("ChatMessageAuthor", fields: [authorProfileId], references: [id], onDelete: SetNull)
  /// 席位字串（yz / lily）
  authorKey   String?            @map("author_key")
  /// LINE userId 或匯出檔裡的顯示名稱 —— 對不到站內身分的外部作者
  authorExternalRef String?      @map("author_external_ref")
  authorDisplayName String?      @map("author_display_name")

  origin      ProjectChatOrigin  @default(APP)
  /// 外部唯一鍵：LINE 的 messageId，或匯入檔的 sha256(時間|作者|內容)。去重用。
  externalRef String?            @map("external_ref")

  body        String
  /// 原始型別線索：text | image | video | audio | file | sticker | location | system
  messageType String             @default("text") @map("message_type")
  /// 匯出檔的占位訊息（[照片]）—— 有訊息但永遠沒有 bytes
  isPlaceholder Boolean          @default(false) @map("is_placeholder")
  /// 匯入的歷史（UI 以分隔線與底色區分）
  isHistorical Boolean           @default(false) @map("is_historical")

  parentId    String?            @map("parent_id") @db.Uuid
  parent      ProjectChatMessage? @relation("ChatMessageReplies", fields: [parentId], references: [id], onDelete: SetNull)
  replies     ProjectChatMessage[] @relation("ChatMessageReplies")

  /// @ 到的人（Profile.id）與引用到的物件 refCode。形狀仍在演進，先整包存。
  mentions    Json               @default("[]")
  /// { lineQuotedMessageId, lineStickerId, importLineNo, … } 來源細節
  meta        Json               @default("{}")

  /// 真正發生的時刻（LINE 的 timestamp / 匯出檔的時間），與 createdAt 可能不同
  sentAt      DateTime           @map("sent_at")
  editedAt    DateTime?          @map("edited_at")
  deletedAt   DateTime?          @map("deleted_at")
  createdAt   DateTime           @default(now()) @map("created_at")

  attachments ProjectChatAttachment[] @relation("MessageAttachments")

  @@unique([channelId, externalRef], map: "project_chat_messages_channel_external_unique")
  @@index([channelId, sentAt], map: "project_chat_messages_channel_time_idx")
  @@index([projectId, sentAt], map: "project_chat_messages_project_time_idx")
  @@index([parentId], map: "project_chat_messages_parent_idx")
  @@map("project_chat_messages")
}

/// 訊息 ↔ 檔案的多對多。
///
/// 為什麼不是 assetIds String[]：反向查詢（「這個檔案在哪些訊息被提到」）是物件索引
/// 與檔案詳細抽屜都要的功能，而 Postgres 的陣列包含查詢需要 GIN 索引，Prisma 宣告不了。
model ProjectChatAttachment {
  id        String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  messageId String             @map("message_id") @db.Uuid
  message   ProjectChatMessage @relation("MessageAttachments", fields: [messageId], references: [id], onDelete: Cascade)
  assetId   String             @map("asset_id") @db.Uuid
  asset     OperatingAsset     @relation("ChatAttachmentAsset", fields: [assetId], references: [id], onDelete: Cascade)
  sortOrder Int                @default(0) @map("sort_order")
  createdAt DateTime           @default(now()) @map("created_at")

  @@unique([messageId, assetId], map: "project_chat_attachments_unique")
  @@index([assetId], map: "project_chat_attachments_asset_idx")
  @@map("project_chat_attachments")
}

/// 已讀位置。一人一頻道一列。
model ProjectChatRead {
  id            String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  channelId     String             @map("channel_id") @db.Uuid
  channel       ProjectChatChannel @relation("ChannelReads", fields: [channelId], references: [id], onDelete: Cascade)
  profileId     String             @map("profile_id") @db.Uuid
  profile       Profile            @relation("ChatReads", fields: [profileId], references: [id], onDelete: Cascade)
  lastReadAt    DateTime           @map("last_read_at")
  lastReadMessageId String?        @map("last_read_message_id") @db.Uuid
  updatedAt     DateTime           @updatedAt @map("updated_at")

  @@unique([channelId, profileId], map: "project_chat_reads_channel_profile_unique")
  @@map("project_chat_reads")
}
```

### 9.2 Server Action 介面

`src/app/actions/project-chat.ts` / `src/lib/services/project-chat.service.ts`

| Action | 輸入 | 輸出 |
|---|---|---|
| `getProjectChannels(projectId)` | `{ projectId }` | `ActionResult<ChannelCard[]>`（含未讀數 = `count(sentAt > lastReadAt)`） |
| `getChannelMessages(input)` | `{ channelId, before?, after?, limit? }` | `ActionResult<{ messages: ChatMessageVM[], hasMore, oldestSentAt }>` 游標分頁（`sentAt` + `id`） |
| `sendChatMessage(input)` | `{ channelId, body, parentId?, assetIds?, mentions? }` | `ActionResult<ChatMessageVM>`；`channel.isReadOnly` → 拒絕 |
| `editChatMessage` / `deleteChatMessage` | `{ messageId, body? }` | `ActionResult<…>`；刪除只寫 `deletedAt` |
| `createChatChannel` / `renameChatChannel` / `archiveChatChannel` | — | — |
| `markChannelRead(input)` | `{ channelId, lastReadMessageId }` | `ActionResult<void>` |
| `searchProjectMessages(input)` | `{ projectId, q, channelId?, from?, to?, origin? }` | `ActionResult<{ hits: [{ messageId, channelId, snippet, sentAt }] }>` |
| `promoteMessageToTask(input)` | `{ messageId, milestoneId?, title?, dueAt? }` | `ActionResult<{ taskId }>` |
| `fileChatAttachment(input)` | `{ messageId, assetId, toFolderId }` | `ActionResult<void>`（把聊天裡的檔案從收件匣整理進硬碟） |

附件上傳走 §5.3 的 drive 路由，`origin = "chat"`、`folderId` 省略（→ 收件匣）。**這就是 Owner 說的「分散上傳的所有資料也會先入雲端的某一資料夾等待整理」在聊天室這一側的具體落實。**

### 9.3 即時性

P0/P1：**不接 Realtime。** 讀取靠（a）發送後樂觀更新、（b）`visibilitychange` 回到分頁時 refetch、（c）開啟中的頻道每 15 秒輪詢 `getChannelMessages({ after: lastSentAt })`。
依據：`ARC-042` §6 已經為工作台定過同一個順序 ——「先 BFF refetch／`visibilitychange` focus refresh／輪詢，證明不夠用之後才接 Realtime」。
P2：Supabase Realtime（`postgres_changes` on `project_chat_messages`）—— 需要 RLS 或一條 server-side 廣播，兩者都要 Owner 決策（§16 爭議 F）。

### 9.4 UI 路由與版面

```txt
/work/[projectId]/chat                     ← 預設 MAIN 頻道
/work/[projectId]/chat?channel=<id>
```
- 左：頻道清單（MAIN 置頂 → TOPIC → LINE_MIRROR 群組，LINE 的帶綠徽章），底部「新頻道」。
- 中：訊息流（日期分隔、回覆折疊兩層就收起、附件縮圖格、`@` 引用的物件卡複用既有 `objHtml()` 的視覺語彙）。底部輸入框：文字 + 貼上/拖放附件 + `@` 選單（複用 `mentionHits()` 的資料來源，現在包含專案檔案）。
- 右（可收）：該頻道的附件清單（一鍵「整理到硬碟」）。
- 390px：單欄 + 頻道改成頂部下拉。

---

## 10. 共用的權限模型

### 10.1 現況與問題

`assertCanAccessProject(profileId, projectId)` 目前是 `project.ownerId !== profileId → throw`。
`ARC-033` 的 2026-07-27 前向相容註記已經寫明方向：「未來協作必須由 **server-only、deny-by-default 的 membership/capability resolver** 取代現行檢查」，且「全域 `OWNER|PARTNER|CLIENT` 角色不得成為專案存取授權」。

五大資源一次帶來 9 張新表與 4 種新動作（上傳、搬移、綁定 LINE、審核），逐表自己寫檢查必然漂移。

### 10.2 決定：單一 capability resolver

新檔 `src/lib/services/project-capability.service.ts`（`import "server-only"`）：

```ts
export type ProjectCapability = {
  projectId: string
  workspaceId: string | null
  role: "OWNER" | "MANAGER" | "EDITOR" | "COMMENTER" | "VIEWER"
  canRead: boolean
  canComment: boolean        // 聊天室發言
  canWrite: boolean          // 資料夾／里程碑／任務 CRUD
  canUploadAsset: boolean
  canDeleteAsset: boolean
  canManagePlan: boolean     // 期／階段的增刪與重排
  canReview: boolean         // 審核任務的裁決
  canBindLine: boolean       // 高風險：外部資料導入
  canManageMembers: boolean
}

/** deny-by-default。找不到路徑就回 null，呼叫端一律當成 NotFoundError。 */
export async function resolveProjectCapability(
  profileId: string, projectId: string
): Promise<ProjectCapability | null>

/** 既有 assertCanAccessProject 的替代；缺少指定能力就丟 UnauthorizedError。 */
export async function assertProjectCapability(
  profileId: string, projectId: string, need: keyof ProjectCapability
): Promise<ProjectCapability>
```

解析順序（**全部 server-only，無任何角色繞過**）：
1. `project.ownerId === profileId` → `role: OWNER`，全部 true。**這保留了 `ARC-033` 現行的精確比對語意。**
2. 否則：`project.workspaceId` 非空 → 查 `WorkspaceMembership{ workspaceId, profileId, status: ACTIVE }`；再查 `ProjectAccessGrant{ projectId, membershipId, status: ACTIVE }` → 用 `ProjectAccessRole`（`VIEWER|COMMENTER|EDITOR|MANAGER`）映射能力表。
3. 都沒有 → `null`。
4. `canBindLine` **只給 OWNER**（外部資料導入屬 `AGENTS.md` §11 的外部協作 ＋ 公開路由，不下放）。
5. `space: "personal"` 的資料夾與資產，額外比對 `authorKey`／`createdByProfileId`（沿用 `canSeatReadAsset()` 的既有規則）。

能力映射表：

| 能力 | OWNER | MANAGER | EDITOR | COMMENTER | VIEWER |
|---|---|---|---|---|---|
| canRead | ✔ | ✔ | ✔ | ✔ | ✔ |
| canComment | ✔ | ✔ | ✔ | ✔ | ✘ |
| canWrite | ✔ | ✔ | ✔ | ✘ | ✘ |
| canUploadAsset | ✔ | ✔ | ✔ | ✘ | ✘ |
| canDeleteAsset | ✔ | ✔ | ✘ | ✘ | ✘ |
| canManagePlan | ✔ | ✔ | ✘ | ✘ | ✘ |
| canReview | ✔ | ✔ | ✘ | ✘ | ✘ |
| canBindLine | ✔ | ✘ | ✘ | ✘ | ✘ |
| canManageMembers | ✔ | ✘ | ✘ | ✘ | ✘ |

### 10.3 公開 webhook 的授權例外

`/api/line/webhook/[channelKey]` 是**無 `requireUser()` 的公開寫入路徑**。目前系統只有一個這樣的路徑（Client Portal 的 token route，`ARC-033` 明文列為例外）。新增一個必須：
- 以 `x-line-signature` 的 HMAC-SHA256 驗證**取代** `requireUser()`，驗不過即 401 且**不落地任何內容**；
- `channelKey` 只是路由鍵，真正的 channel secret 由環境變數解析，不可由請求指定；
- 寫入範圍嚴格限制在 `LineInboundEvent`（一張表、只 insert）；materialize 到其他表由伺服器自己的 drain 流程做，不在請求上下文；
- 找不到綁定時 `processState = UNBOUND` 並**停住**，不自動建立專案、頻道或資料夾（`ARC-040`：讀／收不自動建資料）；
- 速率限制與 payload 大小上限；
- 必須在 `AUT-*` 新增一份政策文件並取得 Owner 核准（`AGENTS.md` §11「Public output」「External agent collaboration」）。

---

## 11. 新增 / 擴充 schema 總覽

| 項目 | 新增 or 擴充 | 表 / enum |
|---|---|---|
| 資料夾 | **新增** | `project_folders` / enum `project_folder_kind` |
| 會議 | **新增** | `project_meetings` |
| 期 | **新增** | `project_phase_cycles` / enum `project_phase_cycle_status` |
| 階段種類 | **新增 enum** | `project_stage_kind` |
| 任務種類與審核 | **新增 enum** | `project_task_kind`、`project_review_state` |
| 聊天 | **新增** | `project_chat_channels`、`project_chat_messages`、`project_chat_attachments`、`project_chat_reads` / enum `project_chat_channel_kind`、`project_chat_origin` |
| LINE | **新增** | `project_line_bindings`、`line_inbound_events`、`line_transcript_imports` / enum `line_source_type`、`line_binding_status`、`line_event_process_state` |
| 資產 | **擴充** | `operating_assets` + `project_id`、`folder_id`、`filed_at`、`derivatives` + 2 索引 |
| 階段 | **擴充** | `project_phase_nodes` + `phase_cycle_id`、`ordinal`、`stage_kind`、`actual_start_on`、`actual_end_on`、`gate_requires_review`、`exit_criteria` + 1 unique + 1 索引 |
| 任務 | **擴充** | `project_tasks` + `kind`、`milestone_id`、`phase_node_id`、`review_state`、`reviewer_profile_id`、`reviewer_key`、`reviewed_at`、`review_note`、`review_checklist` + 3 索引 |
| 反向關聯（僅為滿足 `check-prisma-structure.mjs`） | **擴充** | `Project`（7 個 `[]`）、`Profile`（4 個）、`ProjectMilestone`（1）、`Occasion`（1）、`OperatingDocObject`（1）、`OperatingContract`（1）、`SourceConnection`（1） |

**合計新表 11 張、新 enum 9 個、擴充 3 張既有表。全部為 additive：無欄位刪除、無型別變更、無既有欄位改必填。**

Migration 必須逐張寫 `CREATE TABLE` 與逐個 `CREATE TYPE`（`scripts/check-migration-coverage.mjs` 會逐表逐 enum 比對；曾經有四張表只存在於正式庫而 migration 一行都沒有，對乾淨資料庫重播就炸）。

---

## 12. UI 路由與版面總覽

```txt
src/app/(dashboard)/work/[projectId]/
├─ layout.tsx                    ← 新增：載一次 project + capability，渲染專案資源導覽條
├─ page.tsx                      ← 既有總覽（不動）
├─ chat/page.tsx                 ← 資源① 聊天室
├─ drive/page.tsx                ← 資源② 雲端硬碟
├─ plan/page.tsx                 ← 資源③ 工作區（期／階段甘特）
├─ plan/[stageId]/page.tsx       ← 階段詳情
├─ meetings/page.tsx             ← 資源⑤ 會議時間軸
├─ meetings/[folderId]/page.tsx  ← 單場會議
└─ settings/line/page.tsx        ← 資源④ LINE 綁定
```

導覽條六項：`總覽 ｜ 聊天室 ｜ 資料 ｜ 工作區 ｜ 會議 ｜ 設定`。

**與 `ARC-038` 不衝突**：`ARC-038` 規範的是**模組層**五分頁（`專案 / 檔案媒體 / {module}AI / 紀錄 / 邊界`），實作在 `ModuleOperatingShell`，而 Work 模組目前還是 bespoke page 尚未遷移。本文件新增的是**專案層**子導覽，位於模組五分頁的「專案」之下。`layout.tsx` 要在註解裡寫明這一點，避免未來有人以為 Work 可以有六個模組分頁。

共用元件（新增在 `src/components/work/`）：
```txt
src/components/work/
├─ project-resource-nav.tsx        ← 六項導覽條
├─ chat/{channel-list,message-list,message-composer,message-item,attachment-grid}.tsx
├─ drive/{folder-tree,asset-table,asset-detail-drawer,upload-dropzone,move-to-dialog,inbox-banner}.tsx
├─ plan/{cycle-accordion,stage-gantt,rhythm-bar,stage-card,milestone-row,work-item-row,review-panel}.tsx
├─ meeting/{meeting-timeline,meeting-card,meeting-attribute-box,meeting-material-list}.tsx
└─ line/{binding-list,binding-wizard,pending-source-picker,transcript-import-dialog}.tsx
```
`AGENTS.md` §12.1 硬規則：icon 一律 `lucide-react`，顏色一律 theme token（不得出現 hex 或固定 Tailwind 色階）。提交前 grep `#[0-9a-fA-F]{3,8}`。

---

## 13. 分期實作計畫

### P0 —— 契約與硬碟骨架（可驗證，無炫目 UI）

**範圍**
1. `project-capability.service.ts`（§10.2），`assertCanAccessProject()` 保留但標記為 deprecated，新程式一律用新 resolver。
2. Migration ①：`project_folders` + enum、`operating_assets` 四欄 + 兩索引、`project_chat_*` 四表 + 兩 enum。
3. `ensureProjectWorkspace()`、`ensureProjectDriveRoot()`（建 ROOT + INBOX 兩個 system folder；**只在使用者第一次開硬碟或第一次上傳時建**，不在渲染時建 —— `ARC-040`）。
4. `project-drive.service.ts` 全部純函式部分 + `/api/projects/[projectId]/drive/uploads` 三個動詞（POST/PATCH/GET）。
5. `classifyAsset()` 擴充（專案情境的副檔名白名單與分級上限，依 Owner 的 D1）。
6. `project-chat.service.ts` + `sendChatMessage` / `getChannelMessages` / `markChannelRead`。
7. 孤兒清理：確認既有 `scripts/cleanup-orphan-assets.ts` 涵蓋新 origin（它掃 `status: uploading`，不綁 origin，應該直接適用 —— 要實測）。
8. 驗收 harness `scripts/verify-project-drive.mjs`（純函式：path 計算、子樹搬移的 path 重寫、同層同名衝突、收件匣語意、capability 映射表、objectKey 格式）。

**檔案**
新增：`prisma/migrations/<ts>_project_drive_and_chat/migration.sql`、
`src/lib/services/project-capability.service.ts`、`project-drive.service.ts`、`project-chat.service.ts`、
`src/app/actions/project-drive.ts`、`project-chat.ts`、
`src/app/api/projects/[projectId]/drive/uploads/route.ts`、
`src/lib/mappers/project-drive.mapper.ts`、`project-chat.mapper.ts`、
`src/types/project-drive.ts`、`project-chat.ts`、
`scripts/verify-project-drive.mjs`。
修改：`prisma/schema.prisma`、`src/lib/ui-data/yuanzhan/operating-assets.ts`（`AssetOrigin` + `classifyAsset`）、`package.json`（`drive:check` script）。

**驗收**
- `pnpm exec tsc --noEmit --pretty false` 0 errors；`pnpm db:validate && pnpm db:generate` PASS；`pnpm ops:check` PASS（含 `check-migration-coverage`、`check-prisma-structure`）。
- `node scripts/verify-project-drive.mjs` 全綠。
- 同層建兩個同名資料夾 → 第二次被 unique 擋下且回人看得懂的錯誤。
- 把資料夾搬進自己的子樹 → 拒絕。
- 搬移 50 個檔案 → `objectKey` 一個都沒變（SQL 比對 before/after）。
- 以另一個 Profile 呼叫任何 action → `NotFoundError`，且**不洩漏專案是否存在**。
- 不指定 folderId 的上傳 → 落在 INBOX 且 `filedAt IS NULL`。
- finalize 大小對不上 → `status = failed`，不變 ready。

**風險**：`ensureProjectWorkspace()` 會改既有 `Project.workspaceId`（從 null 變有值）。必須先在一次性腳本裡 dry-run 列出會被改到的專案數，並讓 Owner 看過。

### P1 —— 工作區（期模型）＋ 會議區＋硬碟與聊天 UI

**範圍**
1. Migration ②：`project_phase_cycles`、`project_meetings`、enum ×4、`project_phase_nodes` 與 `project_tasks` 的擴充欄位。
2. `project-phase.service.ts`（含 `currentStage` 推導、階段閘門、`moveStageToCycle`）、`project-meeting.service.ts`。
3. `src/app/actions/project-workspace.ts`、`project-meeting.ts`。
4. UI：`layout.tsx` + `project-resource-nav.tsx`；`/drive`、`/chat`、`/plan`、`/meetings` 四頁完整版面（§5.5／§6.6／§7.4／§9.4）。
5. 預覽：圖片燈箱、PDF `<iframe>`（手機 Safari fallback 成新分頁），其餘只下載。
6. `promoteMessageToTask`、`promoteMeetingActionItem`、`promoteMeetingConclusion` 三條升級路徑。
7. `scripts/verify-project-plan.mjs`：二期／三期序列化、`currentStage` 推導、階段閘門擋得住未通過的審核、`milestoneId`/`objectiveId` 不變量。

**驗收**
- 建一個專案 → 套 `firstCycle` 範本 → 新增二期 → 把結案移到二期 → 再新增三期並把結案移過去：全程不需要 migration，且 `[cycleId, ordinal]` 唯一鍵從未衝突。
- 階段 `gateRequiresReview = true` 且有一個 `reviewState != PASSED` 的審核任務 → `setStageStatus(DONE)` 被拒且回傳阻擋清單。
- 一場會議：建資料夾＋側表在同一交易；屬性框六格全空也能存；上傳三個檔案進該資料夾；掛一份 `OperatingDocObject` 會議紀錄；把一條結論升級成 `OperatingDecision`。
- 刪除會議資料夾 → 檔案仍在物件索引並標「來源已刪除」。
- 四主題（white/orange/black/brand）可讀、390px 不爆版、無硬編碼 hex、icon 全在 lucide。

### P2 —— LINE 導入 ＋ 大檔 ＋ 即時

**範圍（需要 Owner 先核准 §16 爭議 E）**
1. Migration ③：`project_line_bindings`、`line_inbound_events`、`line_transcript_imports` + enum ×3。
2. `AUT-0xx` 公開 webhook 政策文件（新正式文件，`AGENTS.md` §14）。
3. `/api/line/webhook/[channelKey]`（簽章驗證、冪等落地、快速 200）、`/api/line/ingest/drain`（cron）。
4. `project-line-ingest.service.ts`（materialize、媒體抓取、退避重試）、`line-transcript-parser.ts`（純函式，可單測）。
5. `/work/[projectId]/settings/line` 與配對流程（§8.5）。
6. multipart 續傳（`/drive/multipart`）、影音 TTL 3600s、`<audio>`/`<video>`、`durationSec` 寫回。
7. 拖放搬移（`@dnd-kit/core`）、縮圖產生（`derivatives`）。
8. 聊天即時（Supabase Realtime 或輪詢升級，依 §16 爭議 F）。
9. `scripts/verify-line-ingest.mjs`：簽章驗證、冪等（同 `webhookEventId` 兩次只一列）、匯出檔解析（含續行、占位、locale 日期標頭）、bot 與匯入檔的去重。

**驗收**
- 同一個 `webhookEventId` 送兩次 → `line_inbound_events` 只有一列、`project_chat_messages` 只有一則。
- 簽章錯誤 → 401 且 DB 完全沒有新列。
- 未綁定的群把 bot 拉進去 → `UNBOUND`，不自動建任何專案/頻道/資料夾，並在 `listPendingLineSources()` 出現。
- 綁定後傳一張圖 → R2 有一份 bytes、`operating_assets` 一列 `origin = line` 落在該綁定的 `mediaFolderId`、聊天出現帶縮圖的訊息。
- 媒體抓取失敗 4 次 → 顯示「媒體已過期」且**不提供重試按鈕**。
- 匯入一份與 bot 時段重疊的 .txt → 重疊訊息 `dedupedCount` 增加而不重複出現；占位訊息顯示「（匯出檔不含圖片）」。
- 500 MB 影片中斷網路後續傳成功，`contentHash` 與 HeadObject 相符。

### P3（不在本次規劃承諾範圍，列出以便 Owner 決定優先序）
docx/xlsx/pptx 前端解析進 `extractedText`、全文搜尋（`pg_trgm` 或 `tsvector`）、音訊轉錄、`OperatingThread` 收斂到 `ProjectChatMessage`、Client Portal 開放部分資料夾、硬刪排程。

---

## 14. 驗證指令（依 `AGENTS.md` §13）

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate && pnpm db:generate
pnpm ops:prisma:check            # check-prisma-structure.mjs（反向關聯／relation 成對／欄位引用）
pnpm ops:migrations:check        # check-migration-coverage.mjs（每表每 enum 都要有 CREATE）
pnpm ops:check                   # 既有營運全套（含上述兩項）
node scripts/verify-project-drive.mjs      # P0 新增
node scripts/verify-project-plan.mjs       # P1 新增
node scripts/verify-line-ingest.mjs        # P2 新增
pnpm lint
pnpm build                       # Supabase 連不到時用本機／一次性 DB
```
**雲端驗不到、必須 Owner 本機跑的**：真實 R2 round trip、拖放／貼上／手機上傳三選一、影片續傳、四主題對比、390px、LINE bot 進群與真實 webhook。**在那之前不宣稱驗證完成**（`AGENTS.md` Owner-Run Evidence Handoff）。

---

## 15. 與既有架構決定的衝突（必須記錄）

| # | 衝突 | 本設計的處置 |
|---|---|---|
| 1 | `claude/journal-asset-upload-r2-proposals.md` **D2** 把「檔案一個家」標為「最大的架構變更」，建議 P4 才合併文件庫與金流 | 本設計**不遷移**既有三道門，只在 `OperatingAsset` 上**加第四道門**（`origin: project_drive/meeting/line/chat`）。方向與 D2 一致，但把「專案檔案」提前到 P0。**需 Owner 確認可以提前。** |
| 2 | `ARC-042` 定 `commit()` 為工作台的唯一寫入邊界 | 專案五大資源走 Server Action，形成**第二條寫入路徑**。`ARC-042` 本身沒有禁止這件事（它規範的是工作台），但系統因此有兩套寫入與兩套稽核（`OperatingCommandLog` vs. 無）。**建議 P1 一併補 `ProjectActivityLog` 或複用 `OperatingCommandLog`，Owner 決定。** |
| 3 | `OperatingThread` 的註解已經寫「專案聊天室」，且在 `WRITE_ENABLED_COLLECTIONS` 內 | 本設計另建 `ProjectChatMessage`，`OperatingThread` 保留為工作台的輕量討論串。兩個「聊天」概念並存。**收斂排 P3，Owner 決定是否要收斂。** |
| 4 | `OperatingProjectProfile.operatingStatus`／`dealStage`／`stageEnteredAt` 是對外四狀態＋對內子階段，**獎金結算閘門③「內部驗收（14 日）」讀 `operatingStatus`** | 新階段模型**不取代它們**。`ProjectPhaseCycle`/`ProjectStageKind` 是「期與流程格」，`dealStage` 是「對外四格」。兩者可由服務層單向推導（階段 → dealStage 建議值），但**不自動覆寫**。把 `operatingStatus` 收進新模型會讓獎金閘門失效。 |
| 5 | `ProjectPhaseNode.phase`（`ProjectPhase` enum）由 v5 工作台的 `phases` 集合寫入 | 新增 `stageKind` 為**可空**新欄位，`phase` 不動也不改語意。工作台繼續寫沒有 `phaseCycleId` 的階段列。讀取端（`getProjectPlan`）要容忍 `phaseCycleId IS NULL` 的孤兒階段，歸到一個虛擬的「未分期」群。 |
| 6 | `ARC-033` 租戶隔離不變量：現行 runtime 是精確 `ownerId === profileId` | `resolveProjectCapability()` **保留** owner 精確比對為第一條規則，再加上 `ARC-033` 自己指定的 membership/grant 路徑。這是該文件 2026-07-27 註記要求的方向，不是放寬。仍需「`SCH-006` backfill、dual-read proof、跨 workspace 負向測試」才能把舊檢查退役。 |
| 7 | LINE webhook 是系統**第二條**無認證公開寫入路徑（第一條是 Client Portal token） | 列為 P2 的前置：須新增 `AUT-*` 政策文件並取得 Owner 核准（`AGENTS.md` §11：Public output / External agent collaboration 為 HUMAN_APPROVAL_REQUIRED）。 |
| 8 | `src/lib/contracts/ai-input-source-connection-catalog.contract.ts` 把 LINE 標為 `availability: "mock_setup_only"`、`runtime: DISABLED` | P2 要把 LINE 轉成真 runtime，等於改動那份契約的 availability。必須同步更新該契約與 `AUT-007_ai-input-source-workflow-connector-runtime-approval.md`，並跑 `pnpm ai-input:connector-runtime:check`。 |
| 9 | `ARC-038` 模組五分頁 | 本設計新增的是**專案層**六項子導覽，不是第六個模組分頁。要在 `layout.tsx` 註解寫明。 |

---

## 16. 須 Owner 拍板的爭議點

| # | 議題 | 選項 | 建議 |
|---|---|---|---|
| **A** | 專案檔案要不要直接長在 `OperatingAsset`（提前觸碰 D2 的「一個家」方向） | ① 擴充 `OperatingAsset`（本文件建議）② 新開 `ProjectAsset` 表，P3 再合併 | **①**。②等於四個家，而 D2 自己說並存會變長期怪異行為 |
| **B** | 開啟專案硬碟時自動把 `Project.workspaceId` 從 null 綁定到一個 workspace | ① 自動綁定（必要時建 PERSONAL workspace）② 要求使用者先手動選 workspace ③ 讓 `OperatingAsset.workspaceId` 可空 | **①**，但先用 dry-run 腳本列出會被改到的專案清單給 Owner 看。③風險最大（既有查詢的授權語意全要重審） |
| **C** | 聊天室是新模型還是收斂 `OperatingThread` | ① 新 `ProjectChatMessage`，`OperatingThread` 保留（本文件建議）② 新模型 + P1 就把 `OperatingThread` 遷移過來 ③ 把 `OperatingThread.messages` 正規化就好 | **①**。②在 P1 塞進一次資料遷移會拖慢；③等於為了省一張表而把高頻 append 留在 Json 陣列 |
| **D** | 各 kind 的單檔上限（`claude/journal-asset-upload-r2-proposals.md` 的 **D1** 仍未決） | 保守：圖片 25 MB／文件 50 MB／音訊 200 MB／影片 500 MB | **保守值**。放寬容易，收緊會讓既有檔案變成違規資料。R2 出口免費但儲存與 Class A 操作要錢，建議 P2 上線後看一個月帳單再調 |
| **E** | **LINE 導入是否授權**：需要一條無認證的公開 webhook route，且 bot 會以可見的方式出現在客戶的 LINE 群裡 | ① 授權，先做一個群試 ② 只做匯出檔匯入（不開公開路由，不進客戶群） ③ 不做 | **①，但限定一個群、ingestMedia 先關、並先寫 `AUT-*` 政策文件**。②完全避開公開路由風險但只能補歷史文字，無法持續導入 |
| **F** | 聊天即時性 | ① 輪詢 + focus refresh（P0/P1）② P2 接 Supabase Realtime ③ 永遠輪詢 | **① → ②**，與 `ARC-042` §6 已定的順序一致（「證明不夠用之後才接 Realtime」） |
| **G** | 影音播放網址策略（**D3** 仍未決） | A 延長 TTL 到 1 小時 B 播放器自動換網址 C 自家 Range proxy | **A**。C 授權最乾淨但吃掉 R2 出口免費的優勢 |
| **H** | 任務直接掛里程碑（`ProjectTask.milestoneId` 去正規化） | ① 加可空 `milestoneId`，服務層強制與 `objectiveId` 一致（本文件建議）② 強制每個任務都要有 `objectiveId`，必要時自動建一個「預設」目標 | **①**。②會讓「怎樣才算做到」清單出現一列假資料 |
| **I** | 專案區的寫入要不要稽核，寫哪裡 | ① 新 `ProjectActivityLog` ② 複用 `OperatingCommandLog`（它是 workspace 範圍且有冪等鍵） ③ P0 不做，P1 補 | **③ → ①**。`OperatingAuditEvent` 不能用（CHECK constraint 只允許具名高風險動作） |
| **J** | 會議參與者用陣列還是 join 表 | ① 陣列（照抄 `Occasion.actorIds`）② join 表 | **①**。二人量級下 `has:` 全表掃可接受，真的變慢時再補 join 表 |

---

## 17. 已知限制與停止條件

**停止條件（出現任一項就停下回報，不自行擴大範圍）**
- 需要改動 `ARC-042` 的 diff 佇列形狀或 `runtime.js`／`styles.ts`（生成檔）。
- 需要修改 `OperatingAsset` 任何**既有**欄位的型別或必填性。
- 需要讓 `OperatingProjectProfile.operatingStatus` 或 `dealStage` 由新階段模型覆寫。
- LINE webhook 的政策文件未核准前就寫 route handler。
- `ensureProjectWorkspace()` 的 dry-run 顯示會影響到非預期的專案。
- 發現需要新增批次寫入／批次刪除動作而 `ARC-030` §8 未涵蓋。

**本文件的驗證侷限**：本文件是設計，未執行任何程式碼。所有 Prisma 片段未經 `prisma validate`；所有檔案路徑來自實際 `find`/`cat`，但新檔路徑是提議而非既存。LINE 的「群組成員名單是否需要認證帳號」一項，官方文件該頁未說明，**必須在接線時以真實帳號實測**，不可當成已知事實。
