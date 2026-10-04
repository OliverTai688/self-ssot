# RES-033 專案工作區五大資源整合研究（三子任務合併）

- 日期：2026-10-02
- 觸發：Owner 指定三個獨立子任務（UI 截圖盤點 / 五大資源架構設計 / 真實專案文件 migrate）
- 狀態：研究完成，**待 Owner 拍板後才可寫 runtime 程式碼**
- 來源報告（本文件為三者的合併與衝突裁決，不取代其細節）：
  | 子任務 | 報告 |
  |---|---|
  | A UI 現況 | `docs/2_agent-input/generated/project-ui-audit/UI-AUDIT_project-surface-gap-analysis.md`（＋76 張截圖、可重跑 harness）|
  | B 架構設計 | `docs/2_agent-input/generated/project-workspace-design/DESIGN_project-five-resource-architecture.md`（1528 行）|
  | C 檔案與遷移 | `docs/2_agent-input/generated/project-migration-plan/MIG_workspace-inventory-and-migration-plan.md` ＋ `inventory-raw.md` |

---

## 1. Owner 的需求（原話保留）

專案區域的資源包含五種：①每個專案獨立聊天室 ②雲端硬碟式多層資料夾 CRUD，分散上傳先入某一資料夾等待整理 ③專案工作區：工作階段（里程碑）＋每階段關鍵時間＋里程碑底下 TODO／審核任務 ④LINE 群導入：一個專案綁多個 LINE 聊天室，文字與圖片成為專案資料 ⑤會議資料區：時間序、每個資料夾＝一場會議、資料夾自帶會議屬性（參與者、產生時間、結論、注意事項）、夾內可放多種會議材料。

生命週期：`提案 → 接案（合約）→ 執行（里程碑）→ 驗收 → 結案`，其中 `執行→驗收` 因二期、三期重複。

---

## 2. 三份報告的交集：四個共同結論

### 2.1 專案有兩套實作，而五大需求全部落在「預設不保存」那一套

| 實作 | 路由 | 資料 | 五大需求的現成度 |
|---|---|---|---|
| v5 營運工作台 | `/company/operating`（單頁 canvas、7 模組 24 內部視圖） | `DEFAULT_OPERATING_DATA_SOURCE="prototype"`，畫面自承不保存 | **高**（專案·對話／Evidence Repo／里程碑／財務分頁都畫好了） |
| 正式專案頁 | `/work`、`/work/[projectId]` | 真 Prisma + Supabase | **低**（5 tab，pulse/timeline 走 `mock-ai.service.ts`，無對話、無里程碑） |

→ **這是所有後續工作的前置決策**，不是實作細節。`/company` 亦為空殼（308 行檔案內 const）。

### 2.2 最硬的阻斷點：今天建立的專案不屬於園展

`src/lib/services/project.service.ts:98` 的 `createProjectForProfile()` **完全不寫 `workspaceId`**；`prisma/schema.prisma:538` 的 `Project.workspaceId` 可空、`:540` 的 `accessMode` 預設 `PRIVATE`。而 `OperatingAsset.workspaceId` 是 NOT NULL。

→ 現況：每個新專案都是 `workspaceId=null` 的私人專案，**掛不上任何 workspace-scoped 資源**（檔案、Occasion、資產）。五大資源一個都接不上去。此為 P0-1，先修這個，其餘才有意義。

### 2.3 R2 已經接好，缺的是「資料夾」這個概念

A、B、C 三方獨立確認：`src/lib/storage/{r2-client,presigned-url,object-key,object-head}.ts` 齊備（預簽 PUT 900s／GET 300s、`headObject()` finalize 核對、`deleteObject()`），`OperatingAsset` 有 `refCode`／`kind`／`space`／`origin`／`status`／multipart 欄位，並有 `storage:r2:smoke-test` 與孤兒清理 script。

**真正缺的是三件**：① 沒有通用資料夾樹 ② 匯入白名單吃不下真實檔案 ③ 沒有對帳得起來的匯入器。

> 衝突裁決：子任務 A 稱「全 schema 2431 行沒有 `parentId`」—— **此敘述不正確**，已實測。`parentId` 出現兩次：`prisma/schema.prisma:843`（`ProjectDeliverable`，交付物樹）與 `:1791`（`OperatingComment`，留言串）。但兩者都不是通用檔案資料夾，**A 的結論（需全新建樹）成立，理由需更正**；`ProjectDeliverable` 與 `deliverable-tree.tsx` 可作為遞迴樹的形狀參考。

### 2.4 里程碑是唯一已成熟的一塊，但缺「期」

既有四層：`ProjectPhaseNode`（含 NOT NULL 起訖）→ `ProjectMilestone`（`date` 可空、`acceptance`、`bonusAmount`）→ `ProjectObjective` → `ProjectTask`。UI 已畫出且有「日期待補」機制。

缺的是：**「期」這一層**、階段(phase)的操作面、以及真正的審核語意（現在審核只是看板欄位，無審核人／結果／退回）。

---

## 3. 三份報告的衝突：三項需 Owner 裁決

| # | 衝突 | A 的立場 | B 的立場 | 本文件建議 |
|---|---|---|---|---|
| X1 | **會議資料區怎麼長** | `Occasion` 已覆蓋約 70%（`workspaceId`、`projectId`、`actorIds[]`、`externalGuests`、`place`、起訖、`prep[]`、`recap`、`mediaItems`，見 `schema.prisma:1650`）→ 改造成本最低、CP 值最高 | 新建以 `folderId` 為主鍵的 1:1 側表 `ProjectMeeting`，會議＝`kind=MEETING` 的資料夾 | **A 的路線為主、B 的形狀為輔**：`Occasion` 擴充 `folderId?` 與「注意事項」欄位，不另開 `ProjectMeeting`。理由：`Occasion` 已被工作台 `workbenchRef` 與 `OperatingMedia.occasionId` 依賴，另開一張會造成第二套會議真相。**但這會讓「資料夾＝會議」變成「資料夾 ←→ Occasion 1:1 連結」**，語意上略有落差，需 Owner 確認可接受。 |
| X2 | **檔案的家** | Evidence Repo／Thread／Media 三處都沒接上 `OperatingAsset`，是斷鏈 | 專案檔案直接長在 `OperatingAsset`（加 `projectId`/`folderId`/`filedAt`/`derivatives`） | B 的方案正確，但它**提前觸碰 `claude/journal-asset-upload-r2-proposals.md` 的 D2「檔案一個家還是三個」**（`FileAsset`／`MediaAsset`／`OperatingAsset` 並存）。建議：P0 只擴充 `OperatingAsset`，明確宣告它是專案檔案的唯一家，**另兩張不動也不遷**，D2 留到 P3。 |
| X3 | **階段詞彙** | 工作台用 商機·進行中·驗收中 | 新增 `ProjectLifecycleStage` 當唯一權威（C 亦同此結論） | 採納，但**不可覆寫 `OperatingProjectProfile.operatingStatus`**（獎金閘門③讀它）與 `ProjectDealStage`（金流推演讀它）。新欄位為權威，舊欄位由 `deriveProjectStatus()` 推導。現況三套詞彙（`ProjectStatus`／`ProjectPhase`／`ProjectDealStage`／`operatingStatus`）**沒有一套是 Owner 的五階段**。 |

---

## 4. 期／階段模型（合併後定案建議）

五層，`期 → 階段 → 里程碑 → 目標(選用) → 任務`：

```prisma
model ProjectPhaseCycle {            // 新：「期」
  id         String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId  String  @map("project_id") @db.Uuid
  ordinal    Int                                  // 1=一期 2=二期
  title      String                               // 「一期」「二期（追加）」
  contractId String? @map("contract_id") @db.Uuid // 二期幾乎總是新/追加合約
  budgetAmount Decimal? @db.Decimal(14, 2)
  startOn    DateTime? @db.Date
  endOn      DateTime? @db.Date
  @@unique([projectId, ordinal])
}
// ProjectPhaseNode 擴充（皆可空，不破壞 v5 既有寫入）
//   phaseCycleId String? ; ordinal Int ; stageKind ProjectStageKind
// enum ProjectStageKind { PROPOSAL CONTRACT EXECUTION ACCEPTANCE CLOSING CUSTOM }
// ProjectTask 擴充：kind TaskKind(TODO|REVIEW) + reviewerId/reviewResult/reviewedAt
```

- 二期 ＝ 期1`{提案,接案,執行,驗收}` ＋ 期2`{追加合約,執行,驗收,結案}`。
- 加三期 ＝ 插一列 ＋ 一次 UPDATE 把結案移過去，**不需 migration、不需改 enum**。
- 同一期內 `執行→驗收→執行→驗收` 也表達得出（`stageKind` 不唯一）。
- 「現在走到哪」**推導不存**：最小未 DONE 的 `(cycle.ordinal, stage.ordinal)`。
- `phaseCycleId` **必須可空**，否則 v5 工作台的 `phases` 寫入當場壞掉。

---

## 5. LINE 導入：可行性結論（誠實版）

| 項目 | 結論 |
|---|---|
| 讀取 bot 加入前的歷史訊息 | **技術上不可能。** 官方文件：「There is no API available to get the text again after receiving the webhook.」且無列出歷史的 API。 |
| LINE Notify | **已於 2025-03-31 終止服務**，不是選項。 |
| 可行方案 | **兩半**：向後＝Messaging API（bot 被拉進群後的文字＋媒體，自動完整）；向前＝匯入 LINE App 的 `.txt` 匯出檔補歷史 |
| 匯出檔的限制 | **只有文字**。圖片在匯出檔是 `[照片]` 占位，bytes 永遠拿不回來。 |
| 媒體抓取 | `GET /message/{id}/content` 必須盡快抓（官方：「automatically deleted after a certain period of time」）→ 原始事件先落地回 200，媒體另抓＋退避重試；超限顯示「媒體已過期」且**不給重試按鈕** |
| 群組成員名單 | **不保證拿得到** → 設計必須容忍只有 `userId` |
| groupId 配對 | 人拿不到 → 建 `AWAITING_JOIN` 綁定 → bot 收到未綁定群訊息標 `UNBOUND` → Owner 從摘要認領 |
| 風險 | 需要一條**無認證公開 webhook route**（系統第二條），屬 `AGENTS.md` §11 高風險 → P2 前置是先寫 `AUT-*` 政策文件並取得核准 |

現況程式碼：只有 `SourceProvider.LINE` enum ＋ catalog contract 標 `mock_setup_only / runtime DISABLED`，`/ai-input` 的 LINE 全是寫死文案。**等於從 0 開始。**

---

## 6. 真實資料盤點（C 的實測，可稽核數據見 `inventory-raw.md`）

`0_工作區`：**15 個頂層資料夾、202 檔、51 夾、437,680,944 bytes（417.41 MiB）、最深 5 層**。
docx 58（97.8 MiB）／pdf 48／jpg 49／png 21／mp3 1（**75.8 MiB，最大單檔**）／m4a 2（57.9 MiB）／odt 7・odp 1・doc 2・svg 4・md 4・pptx 2・txt 1・**xlsx 1（整批唯一財務台帳）**。5 個檔佔 54% 容量。

### 六個實測異常（全部會在搬遷第一天爆）

1. **現行白名單拒絕 14 檔（6.9%）**：`.odt`/`.odp`/`.doc` 10 個是 SBIR 官方範本、`.svg` 4 個是客戶 logo 向量原稿。不放寬匯入路徑就直接掉檔。
2. **mp3 75.8 MiB > `MULTIPART_THRESHOLD_BYTES`(64 MiB)**，而 multipart 續傳尚未實作。
3. **內容完全重複 6 組 12 檔**（全在 `01.共好玟化`，「對外共用」與「正式歸檔」兩套並行，**不是誤複製**）。
4. **專案編號會回收**：`09` 同時用於進行中的霽雲燕窩與封存的禾境 → `NN.` 不能當唯一鍵。
5. 9 個大寫 `.PNG`（白名單 key 全小寫）；大量全形 `（）：＿［］`；macOS 檔名 NFD。
6. 只有 1 個 `.DS_Store`，**無 symlink、無 0-byte、無 cloudOnly placeholder** → 不需先 hydrate 雲端檔。

### Owner 已有的 de-facto 慣例（直接當系統預設樹）

`[共用] …／共用資料夾`（6 個專案都有＝對客戶那一層）、`開案前` → `專案啟動［正式資料］`、**`YYYYMMDD_Mnn_<名稱>` ＝ 現成里程碑序列**（`01` 的 M01–M04）、`YYYYMMDD <事件>` ＝ 會議、`(僅內部)`＋內文「不得提供客戶」＝可見性、`修改需求／第二次修改` ＝ 二期入口、**`會議錄音檔／逐字稿／完整紀錄／摘要` 四件套**（`10` 的摘要內文明列這四個路徑，但只有 `10` 真的做出來）、`封存的專案/` ＋檔名寫關閉原因與日期。

`NN.` 前綴是**真實跨文件識別碼**（weekly sync 直接拿「01.共好玟化網站」當議題標題）；`- 5/- 3/-2` 後綴**無任何文件說明** → 推論是投入分級，**建議先存成 `priorityTier` 不解讀**。

### R2 key 策略

`operating/{workspaceId}/project/{projectId}/{yyyy-mm}/{uuid}{ext}`，**路徑與檔名一律不進 key**（R2 無 server-side rename；中文／全形在簽章會變成查不出原因的 403）。`{yyyy-mm}` 取原檔 mtime。原始結構先一比一照建，重整留第二步、**只改 DB `folderId` 不動 bytes**。收件匣＝`role='inbox'` 的真資料夾，不另開表。
工具形式：**先一次性 script**（`--dry-run` ＋幂等鍵、伺服器端直傳避開 900s TTL），後做系統內 wizard。
對帳四條：數量 201、位元組 437,674,796、md5/ETag、抽樣開檔。

### 專案 → 階段對應（15 夾 → 16 專案 ＋ 1 Occasion ＋ 1 研究線）

| 資料夾 | 建議階段 | 客戶 | 證據等級 |
|---|---|---|---|
| 00.未來履歷書 -5 | PROPOSING（建議拆：產品線＋SBIR 申請） | 內部／經濟部 | 文件 |
| 01.共好玟化網站 -3 | **ACCEPTANCE**（已交付、尾款未收）＋二期待啟 | 共好玟化 | **文件**（回簽 PDF＋專案財務.xlsx）|
| 02.CRM平台（SaaS） | PROPOSING／**推論已停滯**（8 個月未動） | 未知 | 推論 |
| 03.幸福文齡網站 -3 | **EXECUTING, phaseRound 2** | 梁文齡／豐盛之翼學院 | 文件 |
| 05.金流商城申請 -5 | (a)**CLOSED**（已通過）(b)進行中（建議拆兩案） | 內部／新屋愛鄉協會 | 文件 |
| 06.演藝經紀營運AI -3 | PROPOSING（S/T 雙軌，建議兩案） | **公司全名未見於任何檔案** | 推論 |
| 07.BNI商會會務自動化 | PROPOSING | BNI（分會未明） | 推論 |
| 08.大考中心AI報告生成 -3 | PROPOSING（另含不相關宣傳影片子夾，建議移出） | 財團法人大學入學考試中心基金會 | 文件 |
| 09.霽雲燕窩品牌行銷 | PROPOSING（報價 0901→0912 兩版） | 霽雲燕窩 | 文件 |
| 10.AI SSOT 會計與工商登記 又帆 | PROPOSING（訪談完成未報價）＝ v5-seed `PRJ-2026-011` | 又帆（會計師） | 文件 |
| 11.律師-會計師-地政士 | PROPOSING（探索） | 黃杰／泓睿／又帆 | 推論 |
| 12.摸摸寵物營運系統 | PROPOSING，**報價有效期 2026-10-30，最急** | 摸摸寵物 | 文件 |
| 20260818股東會議 | **非專案 → Occasion** | 股東 | 文件 |
| 研究發表線 | **非客戶專案 → 研究線** | 內部 | 文件 |
| 封存/04 庭羽攝影 -2 | CLOSED | 庭羽 | 文件 |
| 封存/09 禾境室內設計 -3 | CLOSED/PAUSED（20260912 封存） | 禾境室內設計 | 文件 |
| 封存/永續問卷AI工具 -2 | CLOSED（無內容） | 未知 | 推論 |

### 專案編號

`PRJ-{YYYY}-{SEQ:3}` 當唯一鍵（因 `NN.` 會回收），另存 `legacyFolderNo`，並把它併進 `mentionHits()` 的 `ds` 讓 `@01` 搜得到。

---

## 7. 資安（P0，匯入前必須處理）

**敏感內容僅以路徑標示，未複製進任何報告。**

- **P0 阻斷**：`05. 金流商城申請 - 5/商城專案資訊.docx` 含**明文帳號密碼（兩組）** → 建議不匯入該版本；若保留則**禁止建 `extractedText`**（否則密碼進全文搜尋）。
- **P1（internal、禁 client_visible）**：負責人身分證正反面、稅籍公文、公司登記表、`專案財務.xlsx`、兩份回簽合約、`06` 兩份自標「不得提供客戶」的成本與談判策略文件、各家報價單、`03/證書們/` 40+ 份第三方學歷證照、形象照、三段會議錄音與逐字稿。

---

## 8. Owner 決策包（13 項，不拍板不動 runtime）

### 8.1 必須先答的三題（阻斷 P0）

| 代號 | 問題 | 影響 |
|---|---|---|
| **OD-A** | 公司登記全名是 **園展** 還是 **圓展**？四處實測互不一致：<br>• Owner 本次訊息寫「**園**展教育科技有限公司」<br>• `0_工作區` **所有檔名寫「圓展」**；摸摸寵物報價單內文寫「**園**展」、霽雲燕窩寫「圓展」<br>• **本 codebase 寫「圓展」186 次 vs「園展」13 次**（含 `圓展教育科技`、`圓展營運工作台`、UI 字串、`RES-029/030` 標題）<br>• 已出門的對外報價單因此兩種寫法並存 | **最高優先**。對外文件公司名不一致＝法務風險；且 codebase 已大規模採用「圓展」，若正解是「園展」則需一次全域更名（含 UI 字串與既有 doc 標題）。Workspace 建立前必須定，否則 seed 出錯名字後 `refCode` 不重生成、難回頭 |
| **OD-B** | 五大資源蓋在哪一側？(1) 正式 `/work` 補齊 (2) v5 工作台轉真持久化 (3) 新 `/projects/[id]` 收斂兩者 | 決定後續每一行程式碼的位置 |
| **OD-C** | 是否同意「開啟專案硬碟時自動把 `Project.workspaceId` 由 null 綁定到園展」？ | `OperatingAsset.workspaceId` NOT NULL vs `Project.workspaceId` 可空，這是最硬的連帶問題 |

### 8.2 架構取捨（8 項）

| 代號 | 問題 | 建議 |
|---|---|---|
| OD-D | 會議：擴充 `Occasion` 還是新建 `ProjectMeeting`？（衝突 X1） | 擴充 `Occasion`＋`folderId?` |
| OD-E | 專案檔案是否直接長在 `OperatingAsset`（提前觸碰 D2）？（衝突 X2） | 是，另兩張不動 |
| OD-F | 聊天室是否同時收斂 `OperatingThread`（現為 `messages Json` blob）？ | P0 新建一列一訊息，`OperatingThread` 保留不動，收斂留 P3 |
| OD-G | 各 kind 單檔上限（D1 仍未決）＋ 匯入白名單是否只對匯入路徑放寬到 odt/odp/doc/svg？ | 只對匯入放寬，不動一般上傳 |
| OD-H | **是否授權 LINE 導入**？代價：一條無認證公開 webhook ＋ bot 會出現在客戶群裡 | 需 Owner 明確授權；P2 前置寫 `AUT-*` |
| OD-I | 聊天即時性：先輪詢還是直上 Supabase Realtime？ | 先輪詢 |
| OD-J | 影音 TTL 策略（D3）、會議參與者用陣列還是 join 表 | 陣列（沿用 `actorIds[]`）|
| OD-K | `06` 是否確定要拆兩案、`05` 拆兩案、`00` 拆兩案？ | 待 Owner 確認 |

### 8.3 需 Owner 補的資料（M 系列，建議三張 CSV ＋ 7 題問答）

| 代號 | 缺什麼 | 沒它會壞在哪 |
|---|---|---|
| M1 | 公司登記名稱（同 OD-A） | Workspace 建不起來 |
| M2 | 合約金額·簽約日·期款（8 案金額在 docx 表格未展開） | 合約與期模型空殼 |
| **M3** | **已收款狀態**（`專案財務.xlsx` 狀態欄空白 ≠ 未收） | 猜錯整個現金預測偏移 |
| M4 | 客戶聯絡人（`06` 連公司名都沒有） | 客戶關聯斷鏈 |
| **M5** | **LINE 群對應關係** | schema 完全無此模型，而 `01` 財務表備註明寫「有用LINE訊息談好可以分兩期」→ **合約變更只存在 LINE 裡** |
| M8 | `02` CRM 平台還在不在 | 影響是否建案 |
| M11 | `- N` 後綴語意 | 先存 `priorityTier` 不解讀可繞過 |
| M12 | `05/商城專案資訊.docx` 的憑證處置（同資安 P0） | 密碼外洩 |

交付格式：`projects.csv`（16 列）／`contracts.csv`（一列一期款）／`milestones.csv` ＋ 7 題一次性問答。

---

## 9. 分期（合併 B 的架構分期與 C 的遷移分期）

| 階段 | 內容 | 可驗收 |
|---|---|---|
| **P0-0 決策** | OD-A/B/C 拍板；Owner 1 小時完成 7 題＋一張 CSV；建 private bucket（C 實測匿名 GET 得 403） | 決策紀錄 |
| **P0-1 契約與骨架** | ① `createProjectForProfile` 補 workspaceId（伺服器端解析，照 uploads route 形狀，**不吃前端參數**）＋`accessMode: WORKSPACE_VISIBLE` ② `project-capability.service.ts` deny-by-default resolver（保留 owner 精確比對為第一條規則，接上既有 `WorkspaceMembership`/`ProjectAccessGrant`）③ Migration ①：folders ＋ chat 四表 ＋ `OperatingAsset` 四欄 ④ drive uploads route 三動詞 ⑤ `verify-project-drive.mjs` | 無炫目 UI，全部可驗 |
| **P1-A 遷移** | 乾跑 → **只匯結構不搬 bytes**（可一條 DELETE rollback；`refCode` 永不重生成，人工確認不可跳）→ bytes 分批搬 ＋ 四條對帳（**對帳通過前不要刪本機原檔**；rollback 先刪 object 再刪列） | 對帳報告 |
| **P1-B 功能** | Migration ②（期／會議／任務審核）、plan 與 meeting 服務、`/drive` `/chat` `/plan` `/meetings` 完整版面、圖片燈箱＋PDF iframe、三條升級路徑（訊息→任務、會議待辦→任務、結論→決議）；Owner 填合約／里程碑 CSV | 瀏覽器實測 |
| **P2（需先過 OD-H）** | LINE webhook ＋ drain ＋ 匯出檔解析、multipart 續傳、影音 TTL 3600s、拖放搬移、縮圖、即時 | `AUT-*` 核准後 |
| **P3（未承諾）** | Office 抽文字、全文搜尋、音訊轉錄、`OperatingThread` 收斂、D2 檔案一個家、硬刪排程 | — |

**持續同步刻意不做雙向**（無版本控制則衝突解不了）→ 收件匣為主路徑 ＋ 過渡期單向 `--since` 補傳 ＋ 最後把 `0_工作區` 改名為只讀備份。

新表 11 張、新 enum 9 個、擴充 3 張既有表（實際數量待 OD-D/E/F 拍板後收斂），**全部 additive**（無刪欄、無型別變更、無改必填）。Migration 必須逐表逐 enum 寫 `CREATE`（`scripts/check-migration-coverage.mjs` 會逐一比對）。

---

## 10. 與既有決定的衝突（需逐條確認，詳見 B 報告 §15）

最需注意三條：
1. 新寫入路徑形成**第二條寫入路徑**（Server Action vs `ARC-042` 的 commands diff 佇列）。
2. **不可讓新階段模型覆寫 `OperatingProjectProfile.operatingStatus`**（獎金閘門③讀它）與 `ProjectDealStage`（金流推演讀它）。
3. 需改 LINE catalog contract 的 availability（現為 `mock_setup_only / runtime DISABLED`）。

---

## 11. 尚未驗證 / 本研究的限制

- 子任務 A 的 76 張截圖來自**把 v5 runtime 以 esbuild bundle 成獨立 harness** 後在容器 Chromium 跑 Playwright，**不是跑 `pnpm dev`**。原因：Cowork Linux VM(aarch64) 缺 native binding（已補裝三個）、**Supabase pooler DNS 不通**、`cdn.playwright.dev` 被 allowlist 擋、device_bash 每次呼叫獨立 pid namespace 使背景 server 跨呼叫即死。
- 因此 `/work`、`/work/[projectId]`、`/company`、`/client/[token]` **為純程式碼判讀，未經瀏覽器實測**。
- B 的 Prisma 片段**未經 `prisma validate`**；未執行任何 runtime 程式碼。
- **副作用**：子任務 A 在 `node_modules` 放了三個 linux-arm64 native binding（`@next/swc`、`lightningcss`、`@tailwindcss/oxide`）。macOS 本機無害（不會被載入），下次 `pnpm install` 會清掉。
- 本研究**未更新** `PLN-060_task-backlog.md`／`PLN-061_current-sprint.md`／`RPT-007_completed-log.md` —— 因 OD-A/B/C 未拍板，寫入 backlog 會固化錯誤方向。拍板後補。
