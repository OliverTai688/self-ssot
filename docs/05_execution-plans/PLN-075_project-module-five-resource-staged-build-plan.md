# PLN-075 專案模組五大資源分階段建置計劃

- 日期：2026-10-03
- 依據：`RES-033_project-workspace-five-resource-integration-research.md`
- 狀態：**S0–S3 完成（2026-10-04）；S4 驗收報告已交付，待 Owner 整合測試** —— 見 [RPT-068](../06_audits-and-reports/RPT-068_project-module-five-resource-acceptance-report.md)
- 目標：交付一個可靠、可操作、經過三提案並實際建立的高品質專案模組，附 Owner 可驗收的報告

---

## S0 Owner 決策定案（2026-10-03）

| 代號 | 決策 | 結果 | 影響 |
|---|---|---|---|
| **OD-A** | 公司登記全名 | **圓展教育科技有限公司** | 與 codebase 現況一致（圓展 186 次 vs 園展 13 次）→ **不需全域更名**，最大風險解除。`0_工作區` 檔名亦為「圓展」。*殘留事項*：摸摸寵物與 `06` 報價單內文寫「園展」，屬已出門文件的對外文字不一致，列為 Owner 自行處理的營運事項，不阻斷開發。 |
| **OD-B** | 五大資源蓋在哪一側 | **v5 營運工作台轉真持久化** | 功能已現成（專案·總覽/工作/對話/Evidence Repo/財務/里程碑 六分頁）。承擔後果：形成系統第二條寫入路徑 → **必須沿用 `ARC-042` 的 `commit()` 單一寫入入口與 `opEnqueue` diff 佇列，不得另開 Server Action 旁路** |
| **OD-C** | 自動綁定 workspaceId | **同意**（隨 OD-B 一併授權） | 伺服器端解析，不吃前端參數 |
| **OD-D** | 會議建模 | **擴充 `Occasion` ＋ `folderId?`**，不另開 `ProjectMeeting` | 語意為「資料夾 ←→ 會議 1:1 連結」 |
| **OD-E** | 檔案的家 | **`OperatingAsset`** 為專案檔案唯一的家 | `FileAsset`/`MediaAsset` 不動不遷，D2 留 P3 |
| **OD-F** | 聊天室 | 新建一列一訊息模型，`OperatingThread` 保留不動 | 收斂留 P3 |
| **OD-G** | 匯入白名單 | 只對**匯入路徑**放寬到 odt/odp/doc/svg，一般上傳不動 | 救回 14 個檔 |
| **OD-H** | LINE 導入 | **本階段不做**，留 P2，前置為 `AUT-*` 政策文件 | 需無認證公開 webhook，屬 `AGENTS.md` §11 高風險 |
| **三提案** | 決策權 | **AI 產三提案 HTML → AI 做整合決策 → Owner 批准授權 → 才動 runtime** | S1 結束為硬性 checkpoint |

---

## 階段總覽

| 階段 | 名稱 | 出口條件 | Owner 介入 |
|---|---|---|---|
| S0 | 決策定案 | ✅ 完成 | 已完成 |
| S1 | 三提案 ＋ 整合決策 | ✅ 完成，Owner 於 2026-10-03 批准 | 已完成 |
| S2 | P0 骨架 | ✅ 完成（2026-10-03） | 無 |
| S3 | P1 五大資源功能與版面 | ✅ 完成（2026-10-04）：六分頁外殼、總覽／計劃／檔案／會議／對話、三條升級路徑、讀寫接線 | 無 |
| **S4** | **驗收報告** | 報告已交付（`RPT-068`） | **整合測試與檢驗（進行中）** |

`0_工作區` 的真實檔案遷移（原 P1-A）**移出本計劃**，待 S4 驗收通過後另立 PLN —— 理由：遷移不可逆（`refCode` 永不重生成），不應與介面建置同期進行。

---

## S1 三提案（進行中）

三個方向刻意分歧，不是同一設計的三種配色。全部以 v5 既有視覺語彙（`styles.ts`、`theme-styles.ts`）為基礎，皆須涵蓋五大資源與 `期→階段→里程碑→任務` 階層。

| 提案 | 方向 | 核心主張 | 風險 |
|---|---|---|---|
| **A 分頁延伸** | 沿用 v5 現有六分頁慣例，擴充為涵蓋五大資源的分頁組 | 學習成本最低、與既有工作台最一致、改動面最小 | 分頁會變多，資源之間的關聯難表達 |
| **B 時間流主軸** | 單欄時間序為主幹（符合聊天／會議／日誌的時序本質），資源由側抽屜進入 | 與 journal/timeline 既有心智模型一致，「專案發生了什麼」一眼可讀 | 雲端硬碟的層級整理在時間流裡很彆扭 |
| **C 雙欄資源樹** | 左側統一資源樹（硬碟＋會議資料夾同一棵樹）＋ 右側內容區 | 最貼近 Owner 原話的「雲端硬碟介面」，多層 CRUD 最直覺 | 與 v5 其他模組的版面語言差異最大 |

### 硬性約束（三案皆須遵守）
1. 不得新增與 v5 衝突的視覺語言；沿用既有 token 與元件。
2. 必須畫出「期」這一層（二期的 `執行→驗收` 重複），不得退化成平面 enum。
3. 收件匣必須是**真資料夾**（`role='inbox'`），不是另一個分頁。
4. 會議資料夾必須顯示四個屬性（參與者、產生時間、結論、注意事項）且屬性跟著資料夾。
5. 必須標示哪些資料是 internal、不可對客戶可見。
6. 必須呈現 Owner 已有的 de-facto 慣例（`[共用]`、`YYYYMMDD_Mnn_`、會議四件套）。
7. LINE 僅以停用狀態的入口呈現，不得假裝可用。

---

## S2 P0 骨架（待 S1 批准後執行）

1. `createProjectForProfile()` 補 `workspaceId`（伺服器端解析，不吃前端參數）＋ `accessMode: WORKSPACE_VISIBLE`
2. `project-capability.service.ts`：deny-by-default resolver，保留 owner 精確比對為第一條規則，接上既有 `WorkspaceMembership`／`ProjectAccessGrant`
3. Migration ①：folders 樹 ＋ chat 一列一訊息 ＋ `OperatingAsset` 擴充四欄（`projectId`/`folderId`/`filedAt`/`derivatives`）
4. drive uploads route 三動詞，沿用既有 presigned PUT ＋ `headObject()` finalize 形狀
5. `verify-project-drive.mjs` 驗證腳本，併入 `ops:check`

**全部 additive**：無刪欄、無型別變更、無改必填。Migration 須逐表逐 enum 寫 `CREATE`（`scripts/check-migration-coverage.mjs` 會逐一比對）。

### 不可觸碰
- `OperatingProjectProfile.operatingStatus`（獎金閘門③讀它）
- `ProjectDealStage`（金流推演讀它）
- `commit()` 以外的寫入旁路（`ARC-042`）
- `phaseCycleId` 必須可空，否則 v5 的 `phases` 寫入當場壞掉

---

## S3 P1 五大資源功能與版面

Migration ②（`ProjectPhaseCycle`、`Occasion.folderId`、`ProjectTask.kind/審核欄位`）、服務層、四個版面、三條升級路徑（訊息→任務、會議待辦→任務、結論→決議）。

---

## S4 驗收報告

必須包含：三案比較表與選案理由、瀏覽器實測證據（走 `pnpm ui:yuanzhan:showcase`，非 esbuild harness）、`ops:check` 全綠證據、已知限制與未做的事、Owner 整合測試腳本。

---

## 本計劃刻意不做
- LINE 導入（OD-H，留 P2）
- `0_工作區` 真實檔案遷移（另立 PLN）
- `FileAsset`/`MediaAsset` 收斂（D2，留 P3）
- `OperatingThread` 收斂（留 P3）
- 全文搜尋、音訊轉錄、Office 抽文字

---

## S1.5 介面版面約束：脫離 nested card（Owner 追加，2026-10-03）

Owner 追加要求：「介面要研究避免 nested card 的介面設計，這部分請轉化一下」。本節把 `claude/nested-card-decoupling-research.md`（2026-09-19）轉化成本次建置的**硬性約束**，與 §S1 的七條並列。

### A. 先解一個表面衝突

nested-card 研究 §5.1 寫「`yuanzhan/v5/` 的靜態 HTML→生成器管線**不再用於新功能**」，看起來與 OD-B（v5 轉真持久化）相反。**實際上不衝突**，兩者反對的是不同東西：

- 研究反對的是**「照抄設計稿 HTML、再用 generator 轉譯」這個工作流程** —— 它天生產出「一層 div 包一層 div、一層陰影疊一層陰影」。
- 研究**沒有**反對 v5 runtime 本身。

而 `AGENTS.md` §12.1 明文給了合法的擴充路徑：**團隊自有的 `.source.js` 檔可以直接編輯、不需 patch**（已列舉 `extensions.source.js`、`replies.source.js`、`journal-cockpit.source.js`、`timeline-participants.source.js` 及其 CSS）。

→ **結論**：本次新增的五大資源版面，一律**手寫全新的團隊自有 `.source.js` ＋ CSS**，不經過「畫 HTML 原型再 generator 轉譯」那條路。三份提案 HTML 的角色到此為止是**設計決策的載體，不是要被轉譯的素材**。這同時滿足 OD-B 與 nested-card 研究。

### B. 版面必須遵循 ARC-012 五層，卡片不是預設組裝單位

`ARC-012` §2 原文：

```txt
Cards are allowed for repeated items or compact summaries.
Cards must not be the default page structure.
```

五層結構（`ARC-012` §2 表格）：Attention header → Primary operation surface（**table／queue／timeline／editor／tree，不是卡片牆**）→ Context strip → Action rail → Records link。

`AGENTS.md` §12 同向：「Prefer clear operating surfaces over card-heavy information arrangements」「Records and audit pages prefer filterable tables, timelines, and drilldowns over decorative activity cards」。

### C. 三份提案中必須被改掉的具體卡片牆

提案是在這條約束補上之前做的，以下逐項轉化（**實作時以本表為準，不以提案 HTML 為準**）：

| 位置 | 提案現況 | 轉化後 |
|---|---|---|
| A 總覽「進度／錢／資源」三張並排卡 | 卡片牆 | **一行數字列**（`InsightRail` 形狀），無外框 |
| A「跨資源待辦」卡包著數列 | 容器卡 ＋ 內層列 ＝ 兩層 | **扁平列**，拿掉外層卡 |
| C 頂部四張統計卡（生命週期／待整理／敏感·可給客戶／內容重複） | 卡片牆 | 同上，一行數字列 |
| C「期→階段」四個並排方框外再包一層卡 | 兩層 | stage track 本身是 repeated items（允許），**拿掉外層容器卡** |
| B 時間流：timeline 容器卡 ＋ 每則事件卡 | 兩層 | 時間軸節點是 repeated items（允許），**容器不得是卡** |
| 各分頁「資料夾／檔案／訊息」清單 | 卡 | **表格或扁平列**，可篩選、可鍵盤導覽 |

### D. 要先建立的 v5 扁平操作面 primitive

**現實限制**：v5 是 Shadow DOM ＋ vanilla JS，**無法 import React 元件**。既有的 `src/components/owneros/insight-rail.tsx`、`detail-drawer.tsx` 與死程式碼 `src/components/yuanzhan/`（非 v5）的 `RecordRows`／`.yz-row` 扁平列，**只能移植「形狀」，不能複用程式碼**。react-aria／motion／cmdk／vaul 在 v5 內同樣用不上（研究 §1.1 已指出）。

因此 S3 開工前，先在 v5 內建立一組 primitive（新檔，團隊自有）：

| primitive | 用途 | 取代 |
|---|---|---|
| `pm-rail` | 一行數字列（label＋值，無框） | 統計卡牆 |
| `pm-row` | 扁平列：eyebrow／標題／摘要／右側 meta（參考 `.yz-row`） | 清單卡 |
| `pm-table` | 可排序／可篩選表格，鍵盤可導覽 | 資料卡牆 |
| `pm-track` | 期／階段水平軌 | 階段卡 |
| `pm-timeline` | 一條線＋節點（Primer Timeline 形狀） | 活動卡牆 |
| `pm-drawer` | 細節抽屜（`DetailDrawer` 形狀） | 把細節攤平在長卡裡 |

### E. 可機檢的硬規則（寫成 checker，併入 `ops:check`）

1. **禁止巢狀卡**：任何「有 border／ring／shadow ＋ radius」的容器內，不得再出現同類容器。層級上限 = 1。
2. Primary operation surface **不得**是卡片容器。
3. **禁止寫死 hex 與固定色票**（`AGENTS.md` §12.1）：一律 `var(--token, fallback)`，token 定義在 `src/lib/theme/company-theme.ts` 的 `V5_PALETTES`（**單一真相來源**；`theme-styles.ts` 由它自動生成，不要碰）。
   - *現況落差*：三份提案 HTML 分別有 **38／31／28 處寫死 hex**，實作時一處都不得帶進來。
4. **圖示**：v5 內一律 `svg(name, size)`，不得用 emoji 或字面 `<svg>`；缺的圖示加進 `I` 表。
5. **絕不手改** `runtime.js` 與 `styles.ts`（generator 會覆寫）。

### F. UI 治理關卡（`AGENTS.md` §15）

- `/company/operating` 的 Screen ID 是 **`UI-088`**（`REF-003`），目前 `Active UI: UI-088`、狀態 `COMPLETED`。
- §15：「`REF-003` is the only authoritative Screen ID source. A loop may not select or edit a product screen until the Product Owner names one UI ID and approves its proposal.」
- 本次 Owner 已於 2026-10-03 明確授權本計劃，作用畫面即 `UI-088`。**S4 驗收時必須把本次修訂登記回 `REF-003`**，不得讓 registry 與實際畫面脫節。
- §15 另訂「每次至多三個受限子代理，且子代理不得重疊編輯」—— 本計劃的 wave 切分以**檔案所有權互斥**為原則，符合此限制。

### G. 併發風險（需 Owner 知悉）

`AGENTS.md` §15 的 10 分鐘心跳自動化目前狀態為 **ACTIVE**，在獨立的 release worktree（`self-stucture-v1-gate-release`）上運行。昨日寫入 `MAN-001` 的索引列曾被還原，疑與此有關。本計劃全程在主工作區進行，若再次出現非預期還原，應先確認是否與該自動化衝突。
