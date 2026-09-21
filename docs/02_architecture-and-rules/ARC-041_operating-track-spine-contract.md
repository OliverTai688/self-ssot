# 三軌與 time_spine 資料契約

**Document ID:** `ARC-041`
**Date:** 2026-09-21
**Status:** IMPLEMENTED（T1–T2）— UI-memory 層；Postgres 層見 T5
**Required:** [PLN-072](../05_execution-plans/PLN-072_operating-module-unification-implementation-plan.md)、[PLN-073](../05_execution-plans/PLN-073_operating-module-transfer-plan.md)、[ARC-040](ARC-040_yuanzhan-ui-data-mode-contract.md)

---

## 1. 三軌

營運資料分成三個本質不同的軌道。分軌的判準是**時間的形狀**，不是主題。

| 軌道 | 時間形狀 | 型別 | 存放 |
|---|---|---|---|
| 專案 | 區間 + 時間點 | `Phase`（區間）→ `Milestone`（時間點）→ `Objective`（判準）→ `Task`（工作） | `DB.phases` / `DB.milestones` / `DB.objectives` / `DB.issues` |
| 日常節奏 | 重複規則 + 每次實例 | `Rhythm`（規則）→ `RhythmSession`（實例覆寫） | `DB.rhythms` / `DB.sessions` |
| 行政／活動 | 一次性時間點或短區間 | `Occasion` + media | `DB.occasions` |

型別定義在 `src/lib/ui-data/yuanzhan/operating-spine.ts`，為純 TypeScript、無框架相依，v5 runtime 與 node 測試腳本共用。

### 1.1 `Rhythm.kind` —— 為什麼需要這個欄位

showcase 的 8 筆事件裡，「發薪日」與「勞健保繳費」是**週期性的，但不是節奏**：沒有人參加、不需要質性紀錄，而且**沒繳勞健保不是「節奏斷層」，是違法**。把它們算進履行率會讓 heatmap 說謊。

- `kind: 'ritual'` —— standup／1:1／回顧／學習日。過去實例若沒有 session → `state='missed'`（heatmap 紅格），計入履行率。
- `kind: 'admin'` —— 發薪／勞健保／報稅／對帳。過去實例若沒有 session → `state='late'`（逾期，不是斷層），**不計入履行率**，heatmap 走「行政佔用」那一列。

### 1.2 `derivedFrom` 跨三軌

v5 原本只有 `event.derived`（例如 `契約 §13.2`、`法定`），且 `formEvent()` 有硬規則：由條文推導的事件**不可編輯或刪除**，只能標已履行。

showcase 的 8 筆事件裡有 5 筆帶 `derived`，遷移後散到三個軌道。因此 `Milestone` / `Rhythm` / `Occasion` **三者都必須有 `derivedFrom` 與 `remind`**，而且三軌的表單與刪除入口都要沿用同一套 `editable()` 守衛。

> 這是轉移期間權限最容易破的一處：本來刪不掉的合約事件，如果新軌道忘了守衛就變成可刪。`scripts/check-operating-spine.ts` 有一條斷言專門盯這件事。

---

## 2. `time_spine`

### 2.1 它索引什麼、不索引什麼

```
time_spine 索引：  里程碑、有到期日的任務、活動的每一天、已落地的 session 覆寫
查詢期合併：        節奏的未來／未覆寫實例（由 RRULE 即時展開）
```

**節奏的未來實例不預存。** 預先產生實例會在規則變更時留下孤兒列，而且「未來 N 週」的界線永遠是任意的。規則保持單一事實來源，展開交給查詢期。

**一旦某次實例「發生了事情」才落地。** 被標記已跑／跳過／改期，或寫了紀錄、上傳了錄音，才寫一筆 `RhythmSession`。覆寫鍵是 `(rhythmId, occurrenceDate)`，等同 iCalendar 的 `RECURRENCE-ID` 模式 —— 比維護 `EXDATE` 字串乾淨。

### 2.2 狀態語意

| `state` | 意義 | 來源 |
|---|---|---|
| `planned` | 尚未發生 | 日期 ≥ 今天，或 session 不存在且日期在未來 |
| `done` | 已完成／已履行 | `session.state='done'`、`milestone.state='done'`、`task.st='Done'` |
| `skipped` | 有意識地跳過 | `session.state='skip'` |
| `missed` | **該跑但沒跑**（節奏斷層） | `kind='ritual'` 且日期 < 今天且沒有 session |
| `late` | 逾期 | 日期 < 今天且未完成；`kind='admin'` 的過去實例也是這個 |

`missed` 是 heatmap 紅格的唯一來源。沒有 `RhythmSession` 這張表，紅格畫不出來。

### 2.3 `moved` 的展開規則

`session.state='moved'` 且有 `movedTo` 時：

1. 原始 `occurrenceDate` **不**產生 spine item（本體移走）；
2. 在 `movedTo` 產生一筆，標題加「（改期）」，`key` 仍用原始 `occurrenceDate`，這樣選取狀態與覆寫鍵保持穩定。

### 2.4 `weight`

佔用強度，餵 heatmap 與衝期規則：

| 來源 | weight |
|---|---|
| 里程碑 | 3 |
| ★ 活動 | 5 |
| 一般活動 | 2 |
| `kind='admin'` 節奏 | 2 |
| `kind='ritual'` 節奏 | 1 |
| 任務 | 1 |

---

## 3. 誰可以寫 spine

**UI-memory 階段（T1–T4）**：`buildSpine()` 是純推導函式，沒有實體 spine 表，因此沒有「寫入」問題 —— 改三軌的來源資料即可，下次查詢自然反映。

**Postgres 階段（T5）**：`TimeSpine` 是衍生索引表，由**服務層單一 writer** 維護，不用 DB trigger。理由是 trigger 寫衍生表在 Prisma migration 下難以版本控管與測試，而本專案已有 service-layer authorization 慣例。防漂移靠 `scripts/reconcile-time-spine.ts` 定期重算並 diff。

---

## 4. 新舊隔離（T2–T4 並存期）

`DB.events` 在 T4 之前保留不刪。為了不重複計算：

- **legacy 模組**（時間線／工作台）只讀 `refTypes: ['event']`；
- **新的營運模組**只讀 `TRACK_REF_TYPES = ['milestone','task','session','occasion']`。

兩邊互不可見，所以並存期間任一邊的畫面都不會因為另一邊而改變。T4 移除 `DB.events` 時，`buildSpine` 的 legacy 段自然停用。

---

## 5. 資料模式（承 ARC-040）

三軌由 `attachOperatingTracks()` 在 `createV5State()` 取得 seed **之後、清空迴圈之前**掛上，因此：

- `showcase`：三軌由 `operating-events-migration` 的規則從 `DB.events` 與 `projects[].delivery[]` 即時推導，**沒有另一份手寫 fixture**，規則改了資料就跟著改。
- `empty`：既有的「清空所有陣列」迴圈會一併清掉三軌，`buildSpine()` 回空陣列，不自動生成任何資料。

`v5-seed.js` 是 `scripts/generate-yuanzhan-v5.mjs` 的產物，**不得手改**（下次 generate 會覆蓋）。三軌因此刻意不寫進那個檔。

---

## 6. 驗證

| 檢查 | 指令 | 守什麼 |
|---|---|---|
| 純函式層 | `pnpm ops:spine:check` | RRULE 子集、覆寫語意、衝期規則、legacy 等價、三軌遷移不失真、`derivedFrom` 跨軌保留 |
| runtime 回歸 | `pnpm ops:runtime:regress` | 兩種資料模式、全部模組分頁，與基準 runtime 逐頁純文字一致 |
| 視覺保真 | `pnpm ui:yuanzhan:verify` | 截圖比對（需開發機的 Chrome 與 dev server） |

基準 runtime 放在 `docs/2_agent-input/generated/operating-transfer/runtime.baseline.js`，是 T1 動工前的產物。
