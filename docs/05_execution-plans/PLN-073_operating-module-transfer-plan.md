# 時間線／工作台／專案 → 營運 × 專案：轉移開發計畫

**Document ID:** `PLN-073`
**Date:** 2026-09-21
**Status:** IMPLEMENTED（T1–T5，2026-09-21）— 證據見 [T1–T5 報告](../2_agent-input/generated/operating-transfer/T1-T5-evidence-report.md)；兩處刻意偏離見報告 §4，四項待開發機執行見 §5
**Primary task:** `OPS-T01`（待建）
**Required:** [PLN-072](PLN-072_operating-module-unification-implementation-plan.md)（B×C 模型與方向）、[ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md)（資料模式契約）、[ACC-008](../08_acceptance-and-qa/ACC-008_yuanzhan-ui-dual-mode-acceptance.md)（雙模式驗收）、[PLN-070](PLN-070_yuanzhan-team-ui-implementation-plan.md)（v5 忠實移植脈絡）
**視覺說明:** `operating-transfer-proposal.html`
**可操作原型:** `operating-canvas-prototype.html`

---

## 1. 這份計畫解決什麼

`PLN-072` 決定了要蓋什麼（B 模型 × C 介面）。這份決定**怎麼從現在的程式碼走過去**：現有的 `timeline` / `desk` / `project` 三個 v5 模組如何被 `operating` + `project` 兩個模組取代，而且過程中任何一週都能回滾。

工序由三個結構性前提決定，不是由畫面決定：

| 前提 | 事實 | 對工序的約束 |
|---|---|---|
| runtime 是生成的 | `scripts/generate-yuanzhan-v5.mjs` 從 owner 原型 HTML 編譯，SHA256 釘在檔頭 | 新功能只能是第 6 個 `*.source.js` 擴充檔；行為修正走 `source-patches.mjs`（比對不到會 throw） |
| fidelity gate 綁著舊模組清單 | `scripts/verify-yuanzhan-v5.cjs` 依 `reference/workspaces.json` 走訪 8 模組 30 分頁並比對截圖 | 合併模組前必須先把驗證套件分叉，否則 CI 長期紅 |
| 兩個資料面互不相通 | v5 是記憶體 store；Prisma 有 `Project/ProjectTask/ProjectPhaseNode/ProjectMilestone`，但沒有 events/rhythm/occasion | UI 層先走（不碰 schema），DB 層後走 |

---

## 2. 對 PLN-072 的兩處修正

讀過現況後，`PLN-072` 的 schema 需要兩處修正：

### 2.1 專案階層多一層 `Phase`

`PLN-072` 假設 `Project → Milestone → Objective → Task`。但 Prisma 已有 `ProjectPhaseNode`（`phase` / `startDate` / `endDate` / `status`），且 `ProjectMilestone` 是掛在它底下的。

**決定：保留 Phase。** `Phase` 是一段時間（甘特的長條），`Milestone` 是一個時間點（甘特的菱形），兩者語意不重疊。最終階層：

```
Project → Phase → Milestone → Objective → Task
         (區間)   (時間點)     (判準)      (工作)
```

UI 上 `Phase` 可以先不暴露（預設一個 `EXECUTION` phase 承接所有里程碑），等專案數量上來再開。

### 2.2 `Rhythm` 需要 `kind`，三軌需要 `derivedFrom`

現有 `DB.events` 的 8 筆資料逼出兩個缺口：

```prisma
model Rhythm {
  // ...
  kind        RhythmKind    // ritual | admin   ← 新增
  scope       RhythmScope   // company | personal（只有 ritual 有意義）
  derivedFrom String?       // '契約 §13.2' / '法定'  ← 新增
  remind      String        // 前 1 日 / 前 7/3/1 日   ← 新增
}
```

- `kind=ritual`：standup／1:1／回顧／學習日 → 進履行率 heatmap
- `kind=admin`：發薪日／勞健保／報稅 → 只進日曆與提醒，**不算履行率**（沒繳勞健保不是「節奏斷層」）

`derivedFrom` 與 `remind` 三軌（Milestone / Rhythm / Occasion）都要有 —— 現在這兩個欄位只在 `events` 上，遷移後那 5 筆帶 `derived` 的資料會散到三個軌道。

---

## 3. 檔案層級變更清單

### 3.1 新增

| 檔案 | 內容 | 階段 |
|---|---|---|
| `src/components/yuanzhan/v5/operating-spine.source.js` | `spine(from,to,filters)`、`expandRhythms()`、`detectConflicts()`、`trackOf()` | T1–T2 |
| `src/components/yuanzhan/v5/operating-canvas.source.js` | `WB[]` 改寫、`VIEWS.operating`、五個分頁渲染、inspector 綁定 | T3 |
| `src/components/yuanzhan/v5/operating-canvas.css` | 月曆格／泳道／甘特／heatmap 的樣式（沿用原型） | T3 |
| `src/components/yuanzhan/v5/operating-forms.source.js` | `formMilestone` / `formObjective` / `formRhythm` / `formSession` / `formOccasion`（全部用既有 `openForm` + `commit`） | T3 |
| `scripts/migrate-v5-events-to-tracks.mjs` | 事件分流腳本，`--dry-run` 產報告 / `--write` 寫入 seed | T2 |
| `scripts/verify-operating-canvas.cjs` | 新模組的 fidelity 與雙模式驗證 | T3 |
| `docs/02_architecture-and-rules/ARC-041_operating-track-spine-contract.md` | 三軌與 spine 的資料契約 | T2 |
| `docs/08_acceptance-and-qa/ACC-009_operating-module-acceptance.md` | 驗收清單 | T3 |

### 3.2 修改

| 檔案 | 改什麼 | 階段 | 風險 |
|---|---|---|---|
| `scripts/generate-yuanzhan-v5.mjs` | 把 3 個新擴充檔加進 init 前的串接（第 ~40 行的 `readFileSync` 串） | T1 | 低 |
| `src/lib/ui-data/yuanzhan/v5-seed.js` | 新增 `rhythms` / `sessions` / `occasions` / `phases` / `milestones` / `objectives` 六個集合 | T2 | 低 |
| `src/lib/ui-data/yuanzhan/v5-state.ts` | `empty` 模式清空新集合（已有的 `Array.isArray` 迴圈會自動涵蓋，但要加測試確認） | T2 | 低 |
| `src/lib/settings/operating-settings.catalog.ts` | 新增 `org.operatingModule`（canvas / legacy） | T3 | 低 |
| `src/components/yuanzhan/v5/source-patches.mjs` | **專案分頁索引**：`setTab(3)` → `setTab(4)`、`nav('project',4)` → `nav('project',5)` 等 | T4 | **高** |
| `src/components/yuanzhan/v5/styles.ts` 的生成串接 | 加入 `operating-canvas.css` | T3 | 低 |
| `docs/2_agent-input/generated/yuanzhan-v5-fidelity/reference/workspaces.json` | 更新為 7 模組（**只在 T4 最後**） | T4 | 中 |
| `prisma/schema.prisma` | 新增 5 個 model | T5 | 中 |

### 3.3 不動

- `docs/03_feature-reference/REF-004_.../originals/圓展_Operating_System_原型_v5_兩人上線版.html` —— **絕對不改**。改了所有既有 patch 會一次失效。
- `src/components/yuanzhan/v5/runtime.js` —— generated，不手改。
- 其他 5 個既有擴充檔 —— 不動，避免衝突。

---

## 4. 任務拆解

### T1 · 抽出 spine（3–4 天 / 畫面零變化）

| Task | 內容 | 完成條件 |
|---|---|---|
| OPS-T01 | 建 `operating-spine.source.js`，實作 `spine(from,to,filters)`，資料來源仍是 `DB.events` / `DB.issues` | 單元層級：對 showcase seed 呼叫 `spine('2026-09-01','2026-09-30')` 回傳筆數與手算一致 |
| OPS-T02 | `VIEWS.timeline` 的清單、`calendarView()`、專案總覽「本專案的關鍵時間」panel（`runtime.js:4689`）三處改讀 `spine()` | `pnpm ui:yuanzhan:verify` 全綠；30 張截圖與基準逐張一致 |
| OPS-T03 | `generate-yuanzhan-v5.mjs` 串接新擴充檔 + `pnpm ui:yuanzhan:v5:generate` 重生 | generate 無 throw；`ui:yuanzhan:check` 通過 |

**T1 驗收**：畫面完全沒變，但三個模組已經讀同一個函式。這是整個計畫風險最低、價值最高的一步。

### T2 · 記憶體 store 長出三軌（1 週 / 畫面零變化）

| Task | 內容 | 完成條件 |
|---|---|---|
| OPS-T04 | `v5-seed.js` 新增六個集合（先空著）；`v5-state.ts` 的 empty 清空路徑加測試 | showcase / empty 兩模式都能啟動，無 console error |
| OPS-T05 | `migrate-v5-events-to-tracks.mjs --dry-run`，輸出分流報告到 `docs/2_agent-input/generated/operating-transfer/` | 報告涵蓋全部 8 筆，每筆標明判定、理由、帶過去的欄位；**交宇星確認後才進下一步** |
| OPS-T06 | 確認後 `--write`：三軌資料寫入 seed，**原 `DB.events` 保留不刪** | 兩份資料並存；legacy 模式仍讀得到原 events |
| OPS-T07 | `spine()` 改讀三軌（含 RRULE 展開、session 覆寫、跨日活動展開） | **回歸斷言**：新 `spine()` 對同一區間的輸出，與 T1 版本在「日期／標題／連結專案」三欄上一致 |
| OPS-T08 | `ARC-041` 三軌與 spine 契約文件 | 文件涵蓋：誰寫 spine、RRULE 展開規則、覆寫語意、衝期規則 |

**T2 驗收**：舊三個模組畫面不變，但底下已經是三軌資料。`delivery[]` 轉成的里程碑因為沒有日期，**不會**出現在日曆上（刻意）。

### T3 · 新增營運模組，與舊模組並存（1.5 週）

| Task | 內容 | 完成條件 |
|---|---|---|
| OPS-T09 | `org.operatingModule` 設定欄位；`operating-canvas.source.js` 依 flag 改寫 `WB[]` | 設定切 legacy → 舊模組回到原位、新模組消失，重新整理即生效 |
| OPS-T10 | `VIEWS.operating` 五個分頁：今天／日曆／熱力／甘特／清單 | 五個分頁在 showcase 與 empty 都能渲染，無 NaN／Infinity；empty 走 `emptyPanel()` |
| OPS-T11 | `operating-forms.source.js`：三軌 CRUD，**一律走既有 `openForm()` + `commit()`** | 新增／修改／刪除後 toast 顯示「連動 N 處」，且既有 undo 可用 |
| OPS-T12 | **權限守衛搬移**：`derivedFrom` 的不可編輯／不可刪規則複製到三軌 | 回歸測試：由條文推導的里程碑與行政節奏，**刪除鍵不存在**，編輯會 `deny()` |
| OPS-T13 | 衝期偵測（同日 ≥2 個關鍵節點 / 同日 ≥4 件未完成工作 / 里程碑落在跨日活動內） | 品牌日定稿 vs 品牌日發表的案例被正確警示並給出建議動作 |
| OPS-T14 | `verify-operating-canvas.cjs` + 建立新基準截圖；CI 上 `verify-yuanzhan-v5` 改跑 legacy 模式 | 兩套驗證同時綠 |

**T3 驗收**：新舊並存，讀同一份資料，切換零成本。宇星可以用兩週後再決定要不要收掉舊的。

### T4 · 收斂（1.5 週）

| Task | 內容 | 完成條件 |
|---|---|---|
| OPS-T15 | **先改分頁索引**：`source-patches.mjs` 裡所有 `setTab(n)` / `nav('project',n)` 對應到新的 6 分頁 | generate 不 throw；專案模組所有跨頁連結點下去到正確分頁（逐一點過） |
| OPS-T16 | 專案新增「里程碑」分頁（四層樹：Phase 收合 → Milestone → Objective → Task） | 可在樹上新增／編輯／刪除四層；任務可拖拉補掛到 Objective |
| OPS-T17 | 「流程健康」的 `vAging` / `vCFD` / `vScatter` 搬到容量 · 流量指標 | 容量模組該分頁同時有原本的圖與搬過來的三張，無重複 |
| OPS-T18 | 「目標對齊」搬到專案 · 總覽頂部 | 目標 → 專案 → 工作的向下追溯可用 |
| OPS-T19 | 舊模組移出 `WB[]`；更新 `reference/workspaces.json` 與基準截圖；舊基準封存到 `docs/06_audits-and-reports/` | 7 模組 × 分頁數的新基準建立；`RPT` 記錄封存位置 |
| OPS-T20 | 移除 `DB.events`（三軌已是唯一來源）；legacy flag 改為只保留一個 release 週期後移除 | 全文搜尋 `DB.events` 無殘留呼叫 |

**T4 驗收**：側欄 7 項；舊的兩個模組不再出現；fidelity 新基準建立。

### T5 · 落 Postgres（另一條路線，時程另計）

| Task | 內容 |
|---|---|
| OPS-T21 | Prisma 新增 `Rhythm` / `RhythmSession` / `Occasion` / `Objective` / `TimeSpine`；`ProjectMilestone` 維持掛 `ProjectPhaseNode` |
| OPS-T22 | 服務層單一 writer 維護 `TimeSpine`（不用 DB trigger）；`scripts/reconcile-time-spine.ts` 每晚對帳 |
| OPS-T23 | `ProjectTask.dueAt` / `ProjectMilestone.date` 先接真實資料（這兩個欄位已存在，成本最低） |
| OPS-T24 | `daterange` + GiST 索引 + 衝期查詢（見 `PLN-072` §2.4） |

**T5 觸發條件**：T4 完成後的第一個三迴圈研究複查，必須明確回答「要不要接 DB」；不設死期，但設檢查點。

---

## 5. 相依套件

T3 才需要：

```
pnpm add rrule date-fns @date-fns/tz
```

`@dnd-kit` **暫不加** —— v5 runtime 不是 React 樹，拖拉用原生 HTML5 DnD（原型已驗證可行）。等 T5 之後若把營運模組改寫成 React 元件再評估。

專案目前沒有任何日期或重複規則函式庫；`framer-motion` 12.38 已有。

---

## 6. 風險與停止條件

| 風險 | 機率 | 對策 |
|---|---|---|
| 專案分頁索引寫死（`source-patches.mjs`） | 高 | T4 的第一個動作；patch 比對不到會 throw，不會靜默出錯，但要預期第一次 generate 會紅 |
| 權限守衛沒跟著搬（`derived` 事件變成可刪） | 高 | OPS-T12 專門處理；寫成回歸測試而非人工檢查 |
| fidelity gate 長期紅燈 | 中 | OPS-T14 先分叉，再做 T4 |
| RRULE 判定錯誤 | 中 | OPS-T05 只產報告不寫入；8 筆人工看得完 |
| empty 模式破功 | 中 | 每個新分頁都要 `emptyPanel()`；verify 兩模式都跑 |
| 兩個資料面長期分裂 | 中 | T5 設檢查點而非死期 |

**停止條件**：

- T2 的回歸斷言（新舊 `spine()` 輸出一致）若無法通過，**不進 T3** —— 表示三軌模型漏掉了舊資料的某個語意。
- T3 並存兩週後，若宇星仍主要使用舊的時間線／工作台，**暫停 T4**，先做一輪使用訪談，釐清是介面問題還是資料問題。

---

## 7. 時程總覽

| 階段 | 工作天 | 畫面變化 | 可回滾 |
|---|---|---|---|
| T1 抽 spine | 3–4 天 | 無 | git revert 單檔 |
| T2 三軌 store | 5 天 | 無 | 舊 events 並存未刪 |
| T3 營運模組並存 | 7–8 天 | 新增一個模組 | 設定切 legacy |
| T4 收斂 | 7–8 天 | 側欄 8→7 | flag 保留一個 release 週期 |
| **小計** | **約 5 週** | | |
| T5 落 DB | 另計 | 無（使用者無感） | — |

---

## 8. 後續文件

- `ARC-041` 三軌與 spine 契約（T2 產出）
- `ACC-009` 營運模組驗收清單（T3 產出）
- `SCH-008` 營運模組 schema 提案（T5 產出，含 §2 的兩處修正）
- `PLN-060` 新增 OPS-T01..T24 backlog 列
- `RPT` 舊 fidelity 基準封存紀錄（T4 產出）
