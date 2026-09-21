# 營運模組整合實作計畫（B 模型 × C 介面）

**Document ID:** `PLN-072`
**Date:** 2026-09-21
**Status:** DRAFT — 待宇星確認後拆 backlog
**Primary task:** `OPS-001`（待建）
**原型:** `operating-canvas-prototype.html`（repo root，可操作：CRUD／拖拉改期／衝期偵測／heatmap／甘特／看板／跨模組連動）
**提案來源:** `operating-module-unification-proposals.html`、`claude/operating-module-unification-proposals.md`

---

## 1. 決定

採用**提案 B 的資料模型 × 提案 C 的操作介面**。

| 面向 | 決定 |
|---|---|
| 最上層架構 | 三個類別：**專案**、**日常節奏**、**行政／活動** |
| 資料模型 | 三軌各有專屬 schema（不共用寬表），由 `time_spine` 串成跨類別視圖 |
| 主操作面 | 兩個模組頁：**日曆模組**（畫布式）與**專案模組**（深度管理），共用 inspector 與同一份資料 |
| 現有模組去向 | 工作台 → 併入日曆模組的「今天」切面；時間線 → 升級為日曆模組；專案 → 保留並擴充為四層 |

不採用提案 A 的單一 `node` 寬表：`rrule` 只有節奏用、`end_at` 只有專案用、四層結構要靠 `parent_id` 自參照，一年內必然二次重構。

---

## 2. 關鍵設計決定（含取捨理由）

### 2.1 重複規則：只存規則，不預先展開

節奏（standup／1:1／回顧／學習日）的未來實例**不寫進資料庫**，查詢時依 RRULE 即時展開。

- 理由：預先產生實例會在規則變更時留下孤兒列，且「未來 N 週」的界線永遠是任意的。thoughtbot 對 Postgres 重複事件的結論相同 —— 讓規則保持單一事實來源，展開交給查詢期（[thoughtbot](https://thoughtbot.com/blog/recurring-events-and-postgresql)）。
- **例外（重要）**：一旦某一次實例被「標記已跑／跳過／改期／寫紀錄／上傳錄音」，就在 `RhythmSession` 落一筆實體列。這等同 iCalendar 的 `RECURRENCE-ID` 覆寫模式 —— 用 `(rhythmId, occurrenceDate)` 當覆寫鍵，比維護 `EXDATE` 字串乾淨，也避開 Google Calendar API 不更新 EXDATE 的那類坑（[Nylas](https://www.nylas.com/blog/calendar-events-rrules/)）。
- 語意：`session` 不存在 且 日期 < 今天 → **missed（紅色斷層）**；`session.state = skip` → 有意識跳過（灰）；`= moved` → 本體移除、在 `movedTo` 補一個實例。

### 2.2 時區：節奏用 `DATE` 與 local-time，不用 `timestamptz`

「每週五 13:00 學習日」是**當地時間語意**，不是 UTC 瞬間。夏令時間／時區調整時，Nylas 那篇點出的「午餐永遠是 12:30」原則同樣適用。

- `Rhythm.dtstart` 存 `DATE` + `timeOfDay TEXT('13:00')` + `timezone TEXT('Asia/Taipei')`
- 展開在該時區內進行，需要絕對時刻（例如推播提醒）時才轉 UTC
- 專案里程碑、任務到期日同樣是「天」粒度 → `DATE`
- 只有活動（`Occasion`）有實際起訖時刻時才用 `timestamptz`

### 2.3 `time_spine` 只索引「已具體化」的東西

這是這份計畫與原提案 B 的一個修正，也是最重要的一個。

原提案讓三軌都同步寫進骨幹，於是「節奏的未來實例」變成必須預先產生才能進骨幹 —— 直接和 2.1 衝突。修正後的分工是：

```
time_spine 存：  里程碑、有到期日的任務、活動的每一天、已落地的 session 覆寫
查詢期合併：      節奏的未來／未覆寫實例（由 RRULE 即時展開）
```

`getSpine(from, to, filters)` 的回傳 = `SELECT ... FROM time_spine WHERE on_date BETWEEN ...` **∪** `expandRhythms(from, to)`。兩邊都是小資料量（兩人、每月數十筆），在 service 層合併完全夠快，也徹底消掉「骨幹漏同步」這個提案 B 最大的風險面。

骨幹的寫入責任集中在 **service 層單一 writer**（不用 DB trigger）：

- 理由：trigger 寫衍生表在 Prisma migration 下難以版本控管與測試，而本專案已有 service-layer authorization 慣例，把骨幹寫入收在同一層更一致。
- 防漂移：`scripts/reconcile-time-spine.ts` 每晚（或每次部署後）重算並 diff，有差異就報 `RPT`。

### 2.4 衝期偵測：查詢，不是資料庫約束

Postgres 的 `EXCLUDE USING gist` 可以從根本禁止重疊（[Simple Talk](https://www.red-gate.com/simple-talk/databases/postgresql/overlapping-ranges-in-subsets-in-postgresql/)），但我們要的是**警示**而非禁止 —— 品牌日定稿與品牌日發表同一天是合法的，只是不聰明。

所以：用 `daterange` + GiST 索引做重疊查詢，在存檔與拖拉當下跑，回傳警示與建議動作。

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE INDEX time_spine_range_idx ON time_spine
  USING gist (workspace_id, daterange(on_date, on_date, '[]'));
```

衝期規則（可設定，先寫死三條）：

1. 同日出現 ≥2 個 `weight >= 3` 的關鍵節點（里程碑／★活動）
2. 同日 ≥4 件未完成的專案工作（兩人一天吃不下）
3. 里程碑落在跨日活動（旅遊）的區間內

### 2.5 日曆 UI：自建網格，不用 scheduler 函式庫

調查過 FullCalendar、react-big-calendar、Schedule-X、MUI X Scheduler、DHTMLX、Bryntum（[LogRocket](https://blog.logrocket.com/best-react-scheduler-component-libraries/)）。結論是不採用：

- 我們需要的三件事 —— **三軌泳道**、**16 週 heatmap**、**專案甘特** —— 沒有一個函式庫同時給；FullCalendar 的 resource/timeline 在 premium，Schedule-X v4 把拖拉與 resize 移到 premium。
- 月曆網格本身是一個 7×6 的 CSS grid，自建成本低於學習與 override 函式庫樣式的成本，且 v5 已有自己的 design token 與暗色系。
- 原型（`operating-canvas-prototype.html`）已經用純 CSS grid + 原生 HTML5 DnD 把月曆／週泳道／heatmap／甘特全部做出來，可直接移植。

採用的套件：

| 用途 | 套件 | 備註 |
|---|---|---|
| 重複規則 | `rrule`（2.6.4） | 生態最廣；若遇 bug 可平移到 `@rrulenet/rrule`（維護中的相容 fork，2026-06 仍在發版），API 幾乎相同 |
| 日期運算 | `date-fns` + `@date-fns/tz` | 專案目前**沒有**任何日期函式庫，需新增 |
| 拖拉 | `@dnd-kit/core` | 比原生 HTML5 DnD 好控制鍵盤與觸控；原型用原生是為了單檔可跑 |
| 動畫 | `framer-motion` | 已安裝 12.38 |

---

## 3. 資料模型（Prisma 7.8）

```prisma
// ───────────── 軌道 1 · 專案 ─────────────
model Project {
  id          String   @id @default(cuid())
  workspaceId String
  title       String
  client      String?
  startOn     DateTime @db.Date
  dueOn       DateTime @db.Date
  state       ProjectState @default(planned)   // planned | active | closed
  budget      Int      @default(0)
  milestones  Milestone[]
  occasions   Occasion[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([workspaceId, state])
}

model Milestone {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title     String
  dueOn     DateTime @db.Date
  accept    String?                            // 驗收方式
  state     MilestoneState @default(open)      // open | done | dropped
  objectives Objective[]
  @@index([projectId, dueOn])
}

model Objective {                               // ← 新增層：里程碑的「怎樣才算做到」
  id          String @id @default(cuid())
  milestoneId String
  milestone   Milestone @relation(fields: [milestoneId], references: [id], onDelete: Cascade)
  title       String
  tasks       Task[]
  @@index([milestoneId])
}

model Task {                                    // ← 由現有 Issue 遷移
  id          String   @id @default(cuid())
  objectiveId String?
  objective   Objective? @relation(fields: [objectiveId], references: [id], onDelete: SetNull)
  projectId   String                            // 反正規化，方便跨專案查詢
  title       String
  state       TaskState @default(todo)          // todo | doing | review | done
  size        TaskSize  @default(M)             // S | M | L
  ownerId     String
  startedAt   DateTime?
  dueOn       DateTime? @db.Date                // 有值才進日曆
  doneAt      DateTime?
  @@index([projectId, state])
  @@index([dueOn])
}

// ───────────── 軌道 2 · 日常節奏 ─────────────
model Rhythm {
  id          String   @id @default(cuid())
  workspaceId String
  title       String
  scope       RhythmScope                       // company | personal
  ownerIds    String[]
  rrule       String                            // RFC 5545，例 FREQ=WEEKLY;INTERVAL=2;BYDAY=TU
  dtstart     DateTime @db.Date
  until       DateTime? @db.Date
  timeOfDay   String?                           // "14:00"
  timezone    String   @default("Asia/Taipei")
  expectMedia String[]                          // note | audio | photo | doc
  active      Boolean  @default(true)
  sessions    RhythmSession[]
  @@index([workspaceId, scope, active])
}

model RhythmSession {                           // 只有「發生過事情」的實例才有列
  id             String   @id @default(cuid())
  rhythmId       String
  rhythm         Rhythm   @relation(fields: [rhythmId], references: [id], onDelete: Cascade)
  occurrenceDate DateTime @db.Date              // 規則算出的原始日期（= RECURRENCE-ID）
  state          SessionState                   // done | skip | moved
  movedTo        DateTime? @db.Date
  note           String?                        // 質性紀錄
  mediaItems     MediaItem[]
  spawnedTaskIds String[]                       // 從這次長出的行動
  recordedBy     String?
  recordedAt     DateTime @default(now())
  @@unique([rhythmId, occurrenceDate])          // ← 覆寫鍵
  @@index([rhythmId, occurrenceDate])
}

// ───────────── 軌道 3 · 行政／活動 ─────────────
model Occasion {
  id          String   @id @default(cuid())
  workspaceId String
  title       String
  category    OccasionCategory                  // company_event | client_meeting | travel | birthday | visit | admin
  onDate      DateTime @db.Date
  endOn       DateTime? @db.Date                // 跨日
  startsAt    DateTime?                         // 有明確時刻才填
  endsAt      DateTime?
  place       String?
  actorIds    String[]
  externalGuests String?
  star        Boolean  @default(false)
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  prep        Json     @default("[]")           // [{t, done, dueOn?, taskId?}]
  recap       String?
  mediaItems  MediaItem[]
  @@index([workspaceId, onDate])
  @@index([projectId])
}

model MediaItem {
  id          String  @id @default(cuid())
  kind        MediaKind                         // audio | photo | doc
  url         String                            // R2（沿用 SCH-005）
  filename    String
  bytes       Int
  transcript  String?                           // 錄音自動轉寫
  sessionId   String?
  session     RhythmSession? @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  occasionId  String?
  occasion    Occasion?      @relation(fields: [occasionId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
}

// ───────────── 骨幹（衍生索引，單一 writer 維護） ─────────────
model TimeSpine {
  id          String   @id @default(cuid())
  workspaceId String
  onDate      DateTime @db.Date
  track       SpineTrack                        // project | rhythm | occasion
  refTable    String
  refId       String
  title       String
  actorIds    String[]
  weight      Int      @default(1)              // 佔用強度，餵 heatmap 與衝期規則
  state       SpineState                        // planned | done | missed | late
  star        Boolean  @default(false)
  projectId   String?
  @@unique([refTable, refId, onDate])
  @@index([workspaceId, onDate])
  @@index([workspaceId, track, onDate])
}
```

**遷移對照**

| 現況 | 之後 |
|---|---|
| `events`（`layer` = 專案／日常／行政） | `layer=專案` → 對應 `Milestone`／`Task.dueOn`；`layer=日常` → 逐筆檢視是否為重複 → 建 `Rhythm`；`layer=行政` → `Occasion` |
| `issues` | `Task`（加 `objectiveId`，可為 null，之後再補掛） |
| `event.star` | `Occasion.star` / `Milestone`（里程碑天生是關鍵節點） |
| `event.link`（連結專案） | `Occasion.projectId` |
| 工作台「過去／現在／未來」 | `getSpine()` 的三段查詢，不再是獨立資料 |

遷移腳本寫在 `scripts/migrate-events-to-tracks.ts`，**先跑 dry-run 輸出分類報告給宇星確認**再實際寫入（哪些 `layer=日常` 的事件要升級成 Rhythm 是人工判斷）。

---

## 4. 服務層 API

```ts
// src/services/operating/spine.ts
export async function getSpine(
  ws: string,
  range: { from: string; to: string },       // 'YYYY-MM-DD'
  filters?: { tracks?: SpineTrack[]; projectIds?: string[]; scopes?: RhythmScope[]; actorIds?: string[] }
): Promise<SpineItem[]>
// = DB 查 time_spine ∪ expandRhythms(range)（2.3）

export async function detectConflicts(ws: string, range): Promise<Record<string, Conflict[]>>
```

```ts
// src/services/operating/rhythm.ts
export function expandRhythms(rhythms: Rhythm[], sessions: RhythmSession[], range): SpineItem[]
export async function recordSession(input: { rhythmId; occurrenceDate; state; note?; movedTo? })
```

Server Actions（`src/app/actions/operating/*.ts`），全部經 service-layer authorization：

| Action | 骨幹副作用 |
|---|---|
| `createMilestone` / `updateMilestone` / `deleteMilestone` | upsert / delete spine(`milestone`) |
| `createTask` / `updateTask`（含看板換狀態、改到期日） | 有 `dueOn` 才 upsert spine(`task`) |
| `createRhythm` / `updateRhythm` / `archiveRhythm` | 不寫骨幹（查詢期展開） |
| `recordSession`（標已跑／跳過／改期／寫紀錄） | upsert spine(`rhythm` override) |
| `createOccasion` / `updateOccasion` / `deleteOccasion` | 每一天一列 spine(`occasion`) |
| `rescheduleSpineItem(refType, refId, fromDate, toDate)` | 拖拉改期的單一入口，內部分派到上面各自的 update |

**快取與樂觀更新**（Next 16 / React 19）

- 讀取以 `cacheTag('spine:'+ws+':'+month)` 標記
- mutation 結束呼叫 **`updateTag`**（Next 16 新增，read-your-own-writes，立即失效）而非 `revalidateTag`（stale-while-revalidate）—— 拖拉改期必須立刻看到正確位置
- 拖拉當下用 `useOptimistic` 先移動卡片；action 失敗自動 rollback 並 toast
- **Undo**：`rescheduleSpineItem` 回傳 inverse payload，前端壓入 session-scoped undo stack，`⌘Z` 觸發反向 action（原型已驗證這個互動的必要性 —— 拖拉即改期沒有 undo 會讓人不敢用）

---

## 5. 介面結構

```
/operating                      ← 日曆模組（C 畫布）
  左：軌道篩選（專案清單／公司·個人節奏／活動類型）＋ 對象 ＋ 疊加層
  中：月曆 | 週泳道 | 熱力 | 甘特 | 清單
  右：Inspector（所有 CRUD）
/operating/projects/[id]        ← 專案模組（同樣三欄）
  中：里程碑·目標·任務 | 工作流看板 | 時程甘特 | 關鍵時間
  右：同一個 Inspector 元件
```

Inspector 是**同一個元件**，依 `selection.type` 切換表單（`milestone` / `task` / `objective` / `session` / `rhythm` / `occasion` / `project` / `newPick`）。兩個模組共用它，是「兩頁但一套操作肌肉記憶」的關鍵。

互動規格（原型已全部實作可參考）：

| 操作 | 行為 |
|---|---|
| 點日曆空白格的 `＋` | Inspector 開「要新增什麼」三選一，日期已帶入 |
| 點任一項目 | Inspector 切成該筆的編輯表單 |
| 拖拉到別天 | 改期 + 即時重跑衝期檢查 + toast + 可 undo |
| 雙擊節奏實例 | 一鍵標「已跑／跳過」 |
| 看板拖卡片 | 換 `Task.state`，完成時日曆該筆轉 ✓ |
| 點 heatmap 格子 | 右欄展開該週實例；點專案格跳到專案模組 |
| Inspector 的「在專案模組開啟」 | 跨模組導覽，保留 selection |

---

## 6. 分期

### P0 · 模型就位、單一營運入口（2–3 週）

| Task | 內容 | 完成條件 |
|---|---|---|
| OPS-001 | Prisma schema（§3 全部模型）+ migration | `prisma migrate dev` 通過，seed 可跑 |
| OPS-002 | `expandRhythms` + `getSpine` + unit tests | 每週／雙週／每月規則、`skip`／`moved` 覆寫、跨月邊界的測試全綠 |
| OPS-003 | 事件遷移腳本 dry-run 報告 | 產出分類清單交宇星確認；不實際寫入 |
| OPS-004 | `/operating` 月曆 + 清單 + 軌道篩選（唯讀） | 現有資料完整呈現在日曆上，三軌顏色正確 |
| OPS-005 | Inspector + 三軌 CRUD（含 `recordSession`） | 建立／修改／刪除後日曆即時更新；權限經 service 層 |
| OPS-006 | 衝期偵測（§2.4 三條規則）+ GiST 索引 | 品牌日定稿 vs 品牌日發表的案例被正確警示 |

**P0 驗收**：`layer` 退役、節奏有履行狀態、所有既有時間線事件都能在新日曆上找到且可編輯。

### P1 · 三軌深度（3–4 週）

| Task | 內容 |
|---|---|
| OPS-007 | 專案模組四層樹（里程碑→目標→任務）＋ 工作流看板 |
| OPS-008 | 專案甘特（含連結活動的紫條）＋ 關鍵時間頁 |
| OPS-009 | 節奏 session 的質性紀錄與錄音上傳（沿用 SCH-005 R2）＋ 自動轉寫接訊號模組 |
| OPS-010 | 活動的事前準備清單（可轉成 Task）＋ 事後回顧＋回顧牆 |
| OPS-011 | 16 週 heatmap（節奏履行率／專案投入／活動佔用） |
| OPS-012 | 工作台改寫成 `/operating` 的「今天」切面，舊路由 301 |

**P1 驗收**：heatmap 的紅格能指出真實斷層；1:1 的錄音可在日誌用 `#` 召喚；活動素材進 Evidence Repo。

### P2 · 畫布互動（2–3 週，視 P0/P1 使用情況再決定）

| Task | 內容 |
|---|---|
| OPS-013 | `@dnd-kit` 拖拉改期 + `useOptimistic` + undo stack |
| OPS-014 | 週泳道視圖 + 跨日活動的疊放演算法 |
| OPS-015 | 小螢幕：左軌道與 inspector 可收合（<1180px） |
| OPS-016 | Google Calendar 單向推送（只推與我有關，沿用 timeline-participants 決定） |

**P2 停止條件**：若 P0/P1 跑滿一個月後，使用紀錄顯示日常入口仍是「今天」切面而非日曆，**P2 降級為只做 OPS-013 與 OPS-015**，不做泳道與雙向同步。

---

## 7. 風險與對策

| 風險 | 對策 |
|---|---|
| 骨幹與來源漂移 | 單一 writer（§2.3）＋ 每晚 `reconcile-time-spine.ts` diff 報告 |
| RRULE 邊界 bug（每月 31 號、跨年、DST） | `expandRhythms` 的單元測試先寫；日期一律 `DATE` + 當地時區展開（§2.2）；`rrule` 出問題可平移 `@rrulenet/rrule` |
| 拖拉誤操作動到客戶交期 | undo stack 為 P2 的**第一項**，不是最後一項；里程碑改期額外跳確認 |
| 遷移把不是節奏的事件誤判成節奏 | OPS-003 只產報告不寫入，人工確認 |
| 四層結構初期兩層是空的 | `Task.objectiveId` 可為 null，允許任務直接掛專案，之後再補掛 |
| 兩人規模下過度設計 | P0 只做模型＋單一入口；側欄維持一項「營運」，P1 才展開成三軌 |

---

## 8. 需要新增的相依

```
pnpm add rrule date-fns @date-fns/tz @dnd-kit/core @dnd-kit/sortable
```

（專案目前沒有任何日期或重複規則函式庫。`framer-motion` 已有。）

---

## 9. 後續文件

本計畫確認後應拆出：

- `ARC-041` 三軌與 time_spine 的資料契約（骨幹寫入責任、查詢期合併規則）
- `SCH-008` 營運模組 schema 提案（§3 的正式版本，含遷移步驟）
- `ACC-009` 營運模組驗收清單（P0/P1/P2 各期的可執行檢查項）
- `PLN-060` backlog 新增 OPS-001..016 列

---

## 參考

- [Recurring Events and PostgreSQL — thoughtbot](https://thoughtbot.com/blog/recurring-events-and-postgresql)
- [The Deceptively Complex World of Calendar Events and RRULEs — Nylas](https://www.nylas.com/blog/calendar-events-rrules/)
- [PostgreSQL Range Overlap Queries: GiST Indexes, EXCLUDE Constraints — Simple Talk](https://www.red-gate.com/simple-talk/databases/postgresql/overlapping-ranges-in-subsets-in-postgresql/)
- [Best React scheduler component libraries — LogRocket](https://blog.logrocket.com/best-react-scheduler-component-libraries/)
- [rrule (jkbrzt/rrule)](https://github.com/jkbrzt/rrule) / [@rrulenet/rrule（維護中的相容 fork）](https://github.com/rrulenet/rrule)
- Next.js 16 `updateTag` / `revalidateTag`：`node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`
