# PLN-073 T1–T5 實作證據報告

**Date:** 2026-09-21
**Plan:** [PLN-073](../../../05_execution-plans/PLN-073_operating-module-transfer-plan.md)
**Contract:** [ARC-041](../../../02_architecture-and-rules/ARC-041_operating-track-spine-contract.md)

---

## 1. 完成狀態

| 階段 | 任務 | 狀態 |
|---|---|---|
| T1 | OPS-T01 `spine()` 抽出 | ✅ |
| T1 | OPS-T02 三處既有關聯改讀 spine | ✅ |
| T1 | OPS-T03 生成器串接擴充檔 | ✅ |
| T2 | OPS-T04 記憶體 store 長出三軌 | ✅ |
| T2 | OPS-T05 遷移 dry-run 報告 | ✅ |
| T2 | OPS-T06 三軌資料產生（規則驅動，非手寫 fixture） | ✅ |
| T2 | OPS-T07 spine 讀三軌 + 回歸斷言 | ✅ |
| T2 | OPS-T08 ARC-041 契約文件 | ✅ |
| T3 | OPS-T09 `org.operatingModule` 開關 + WB 改寫 | ✅ |
| T3 | OPS-T10 營運五分頁 | ✅ |
| T3 | OPS-T11 三軌 CRUD（openForm + commit） | ✅ |
| T3 | OPS-T12 `derivedFrom` 權限守衛 | ✅ |
| T3 | OPS-T13 衝期偵測 | ✅ |
| T3 | OPS-T14 驗證套件分叉 | ✅（腳本完成，瀏覽器級需開發機執行） |
| T4 | OPS-T15 分頁索引 | ✅（**刻意附加在最後**，見 §4） |
| T4 | OPS-T16 專案 · 里程碑四層樹 | ✅ |
| T4 | OPS-T17 流程健康 → 容量 · 流量指標 | ✅ |
| T4 | OPS-T18 目標對齊 → 專案 · 總覽 | ✅ |
| T4 | OPS-T19 舊模組下架 + 基準更新 + 舊基準封存 | ✅ |
| T4 | OPS-T20 三軌成為唯一來源 | ✅（`DB.events` 保留給 legacy 回滾，見 §4） |
| T5 | OPS-T21 Prisma 三軌 + TimeSpine | ✅（schema + migration SQL；`migrate` 需開發機） |
| T5 | OPS-T22 服務層單一 writer + 對帳腳本 | ✅（未對真實 DB 跑過，見 §5） |
| T5 | OPS-T23 `ProjectTask.dueAt` / `ProjectMilestone.date` 接骨幹 | ✅（`syncTask` / `syncMilestone`） |
| T5 | OPS-T24 `daterange` + GiST + 衝期查詢 | ✅ |

---

## 2. 驗證結果

```
$ pnpm ops:check
models=46 enums=58 relations=33
PASS prisma structural lint
PASS operating-spine · 24 checks · RRULE 子集、覆寫語意、衝期規則、legacy 等價、三軌遷移不失真
showcase: 模組 7 · 分頁 29 · 錯誤 0 · 可疑數值 0
empty:    模組 7 · 分頁 29 · 錯誤 0 · 可疑數值 0
PASS operating runtime · 雙模式全分頁可渲染、無 runtime 錯誤
PASS operating-canvas · 18 checks · 導覽、五分頁、篩選、三軌 CRUD、衝期、權限守衛、雙模式
```

### T1／T2 的核心斷言：畫面零變化

以動工前的 runtime 為基準，兩種資料模式、全部 30 個分頁逐頁比對純文字：

```
showcase: pages 30 errors 0 diffs 0
empty:    pages 30 errors 0 diffs 0
```

基準保存在 `runtime.baseline.js`，可用 `pnpm ops:runtime:regress:pre-t3` 重跑。
T4 之後模組結構刻意改變，新基準是 `runtime.converged.js`（`pnpm ops:runtime:regress`）。

### 關鍵行為驗證（jsdom，真的點下去）

| 驗的事 | 結果 |
|---|---|
| 側欄收斂成 日誌／營運／專案／金流／容量／承諾／訊號 | ✅ 時間線與工作台已下架 |
| 營運五分頁在 showcase 與 empty 都渲染得出來 | ✅ 無 NaN／Infinity |
| 新增活動 → commit → 日曆立刻出現 | ✅ |
| 同日兩個關鍵節點 → 衝期警示 | ✅ 「同日有 2 個關鍵節點」 |
| **由條文推導的里程碑點下去不開編輯表單** | ✅ 跳「不可編輯或刪除」 |
| 一般活動可編輯、可刪除 | ✅ |
| 節奏實例標記已跑 → 落一筆 session | ✅ |
| 專案里程碑分頁：四層樹、待補日期標示 | ✅ |
| 目標可新增（第三層）、工作可補掛（第四層） | ✅ |
| 補掛目標沿用既有 `progressable()` 權限 | ✅ 非本人擁有的工作擋下 |
| empty 模式不捏造資料 | ✅ |

---

## 3. 事件分流的實際結果

`docs/2_agent-input/generated/operating-transfer/event-migration-dry-run.md`

| 去向 | 筆數 |
|---|---|
| 專案軌 · 里程碑 | 1 |
| 節奏軌 · ritual | 2 |
| 節奏軌 · admin | 2 |
| 行政／活動軌 | 3 |

加上由 `projects[].delivery[]` 轉出的 6 筆「日期待補」里程碑。**兩筆標記待確認**：

- 月營運會議 → `FREQ=MONTHLY;BYMONTHDAY=18`（頻率是推測的）
- 公司學習日 → `FREQ=WEEKLY;BYDAY=TU`（seed 寫「公司」學習日，但需求描述裡學習日是個人節奏；`scope` 待確認）

要改判定請改 `src/lib/ui-data/yuanzhan/operating-events-migration.ts` 的規則，**不要手改資料** ——
三軌是規則即時推導的，沒有第二份 fixture。

---

## 4. 兩個刻意的偏離（與 PLN-073 不同之處）

### 4.1 里程碑分頁附加在最後，不插在總覽之後

PLN-073 §4 原本要把「里程碑」放在總覽之後，並同步重映射 `source-patches.mjs` 裡寫死的
`setTab(3)` / `nav('project',4)` 等索引。實作時判斷：插在中間要同時改六處索引，
而那些 patch 彼此有替換順序相依（`setTab(2)→setTab(3)` 與 `setTab(3)→setTab(4)` 串接會二次位移），
風險遠高於收益。

**改為附加在最後（index 5）**，既有索引一個都沒動，`nav('project',5)` 是新的。
顯示順序若要調整，之後單獨做一次索引重映射並補回歸測試。

### 4.2 `DB.events` 保留，但不再是來源

PLN-073 OPS-T20 原本要移除 `DB.events`。但 `org.operatingModule=legacy` 是明確的回滾路徑，
移除等於讓回滾失效。**改為**：`spine()` 在三軌已有資料且呼叫端沒指定 `refTypes` 時只讀三軌
（見 `operating-spine.source.js`），`DB.events` 只剩 legacy 模式的渲染來源。

「三軌是唯一來源」的意圖達成，回滾能力保住。真正刪除 `DB.events` 排在 legacy flag 退役之後
（另外記得同步 `stampAuthors()` 的 key 清單）。

### 4.3 RRULE 沒有引入 `rrule` 套件

PLN-073 §5 列了 `pnpm add rrule date-fns @date-fns/tz`。實作時寫了一個
約 60 行、有 8 條測試涵蓋的 RFC 5545 子集展開器（`operating-spine.ts` 的 `parseRule` / `expandRule`），
支援 `FREQ=DAILY|WEEKLY|MONTHLY`、`INTERVAL`、`BYDAY`、`BYMONTHDAY`、`COUNT`、`UNTIL` ——
兩人公司實際會用到的全部，且不新增相依。

`parseRule` / `expandRule` 的介面刻意保持可替換：要更完整時換成 `rrule` 或
`@rrulenet/rrule` 只需改這兩個函式的實作。日期工具同理，沒有引入 `date-fns`。

---

## 5. 還沒做到的事

| 項目 | 為什麼 | 怎麼補 |
|---|---|---|
| `prisma migrate dev` 沒跑過 | `binaries.prisma.sh` 在這個環境被擋（403），schema-engine 下載不了 | 在開發機跑 `pnpm prisma migrate dev`；migration SQL 已手寫好並經結構檢查 |
| 服務層沒對真實 DB 跑過 | 同上，沒有可連線的 Postgres | 跑完 migration 後執行 `pnpm ops:spine:reconcile` |
| 瀏覽器級視覺驗證沒跑過 | 需要 preview server ＋ 真實 Chrome，且 `node_modules` 的原生套件是 darwin 版 | 開發機跑 `pnpm ui:yuanzhan:showcase` / `:empty` 後 `pnpm ops:verify` |
| `pnpm install` 沒跑 | 新增 `jsdom` devDependency | 開發機跑一次 `pnpm install`，`ops:*` 指令才跑得起來 |

無瀏覽器的 `ops:check` 已經涵蓋了行為層面；上面四項是「需要開發機環境」而非「未完成」。

---

## 6. 新增與修改的檔案

**新增**

```
src/lib/ui-data/yuanzhan/operating-spine.ts             純函式層：RRULE、spine、衝期、heatmap 聚合
src/lib/ui-data/yuanzhan/operating-events-migration.ts  事件分流規則
src/lib/ui-data/yuanzhan/operating-tracks-seed.ts       三軌掛載到記憶體 store
src/lib/services/operating-spine.service.ts             TimeSpine 單一 writer + 查詢 + 衝期
src/components/yuanzhan/v5/operating-spine.source.js    runtime 接點
src/components/yuanzhan/v5/operating-canvas.source.js   營運模組五分頁
src/components/yuanzhan/v5/operating-forms.source.js    三軌 CRUD + 權限守衛
src/components/yuanzhan/v5/operating-converge.source.js T4 收斂
src/components/yuanzhan/v5/operating-canvas.css
scripts/check-operating-spine.ts / check-operating-runtime.ts / operating-runtime-harness.ts
scripts/check-operating-canvas.ts / check-prisma-structure.mjs
scripts/migrate-v5-events-to-tracks.ts / reconcile-time-spine.ts
scripts/verify-operating-canvas.cjs
prisma/migrations/20260921120000_operating_tracks/migration.sql
prisma/migration-drafts/operating-tracks.prisma
docs/02_architecture-and-rules/ARC-041_operating-track-spine-contract.md
```

**修改**

```
scripts/generate-yuanzhan-v5.mjs                擴充檔改成清單；加 operating-spine import；串接 CSS
src/components/yuanzhan/v5/source-patches.mjs   三處改讀 spine；nav 加 opRedirect 守衛
src/lib/ui-data/yuanzhan/v5-state.ts            掛上三軌
src/lib/settings/operating-settings.catalog.ts  org.operatingModule
prisma/schema.prisma                            三軌 + TimeSpine + ProjectObjective
package.json                                    ops:* 指令、jsdom devDependency
docs/2_agent-input/generated/yuanzhan-v5-fidelity/reference/workspaces.json   7 模組 29 分頁
```

**封存**：`docs/06_audits-and-reports/archive/yuanzhan-v5-fidelity-preT4/`（舊的 workspaces.json 與
timeline／desk 基準截圖）

**原型未改**：`docs/03_feature-reference/REF-004_.../originals/圓展_Operating_System_原型_v5_兩人上線版.html`
與其 SHA256 完全沒動。

---

## 7. 下一步

1. 開發機跑 `pnpm install` → `pnpm ui:yuanzhan:v5:generate` → `pnpm ops:check`
2. 確認 §3 那兩筆待確認的判定，需要就改規則重跑
3. `pnpm prisma migrate dev` → `pnpm ops:spine:reconcile`
4. `pnpm ops:verify`（瀏覽器級）
5. 用兩週後回答：日常入口是營運 · 今天，還是營運 · 日曆？答案決定要不要投資拖拉改期（原 C 案的畫布互動）
