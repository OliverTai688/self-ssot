# 營運工作台集合 → Prisma 落差盤點與 schema 提案

**Document ID:** `SCH-008`
**Date:** 2026-09-23
**Status:** PROPOSED — 尚未取得 migration 授權
**Primary task:** `YZLIVE-005`（第一階段）、`YZLIVE-007`／`YZLIVE-008`（帳務與 Evidence）
**Required:** [ARC-042](ARC-042_operating-workbench-persistence-contract.md)（寫入邊界）、[ARC-041](ARC-041_operating-track-spine-contract.md)（三軌）、[PLN-071 §3](../05_execution-plans/PLN-071_yuanzhan-account-and-private-launch-plan.md)（可重用與缺口）

---

## 1. 為什麼需要這份盤點

`PLN-071` §3 把整個工作台的資料狀態概括成一行：「當前 v5 刷新重置；檔案 bytes 留在記憶體」。那是正確的，但無法據以開工——不知道哪些集合已經有表、哪些沒有、哪些**看起來有但形狀不合**。

這份文件逐一比對 `src/lib/ui-data/yuanzhan/v5-seed.js` 的記憶體集合與 `prisma/schema.prisma` 的 46 個 model。

結論先講：**三軌與專案骨架已經有表，日常協作資料有一半沒有，帳務全部沒有。**

---

## 2. 落差表

| 記憶體集合 | 內容 | 現有 model | 落差 |
|---|---|---|---|
| `people` / `me` | 兩位席位與顯示名 | `Profile`、`WorkspaceMembership` | 有表。席位目前由 `YUANZHAN_SEATS`／`DEFAULT_SEATS` 決定，非 DB。`YZLIVE-003` 處理 |
| `phases` | 專案階段（區間） | `ProjectPhaseNode` | **形狀相符** |
| `milestones` | 里程碑（時間點） | `ProjectMilestone` | **形狀相符** |
| `objectives` | 判準 | `ProjectObjective` | **形狀相符** |
| `rhythms` / `sessions` | 週期與場次 | `Rhythm`、`RhythmSession` | **形狀相符** |
| `occasions` | 一次性場合 | `Occasion` | **形狀相符** |
| — | 時間索引 | `TimeSpine` | 衍生表，由 `operating-spine.service.ts` 同步，不由 commit 直寫 |
| `audit` | 稽核 | `OperatingAuditEvent` | **形狀相符**，含 hash chain 與 redaction |
| `projects` | 專案 | `Project` | **形狀衝突，見 §3** |
| `issues` | 工作項 | `ProjectTask` | 部分。缺 `size`／`blocker`／`exp`／`ev`／`rel[]`／`cf{}`／`sub[]` |
| `projects[].delivery[]` | 交付標準 | `ProjectDeliverable` | 大致相符，待核對欄位 |
| `repos` / `files` | Evidence 檔案與版本 | `FileAsset`、`MediaAsset`、`OperatingMedia` | 部分。缺版本凍結與 README 語意（`YZLIVE-008`） |
| `goals` | 年度／季目標 | — | **缺** |
| `journal` | 書寫式日誌 | `ProjectNote` 不適用 | **缺** |
| `threads` | 聊天室 | — | **缺** |
| `lineComments` / `journalComments` / `objectComments` | 三種留言 | — | **缺**，且三者可合併 |
| `decisions` | 決議 | — | **缺** |
| `docs` / `docObjects` | 文件與文件物件 | — | **缺** |
| `commitments` + 履行 log | 內外部承諾 | — | **缺**，高風險（§5） |
| `txns` / `cash` | 交易與現金 | — | **缺**，高風險 |
| `reimb` | 報帳核銷 | — | **缺**，高風險 |
| `bank` / `payroll` | 銀行與薪酬 | — | **缺**，高風險 |
| `capacity` / `timesheet` / `weekly` | 容量、出勤、週統計 | — | **缺**（`YZLIVE-008`） |
| `signals` | 訊號 | — | **缺** |
| `history` / `changelog` | 前端操作歷史 | `OperatingAuditEvent` | **不建表**。`changelog` 是 undo 用的前端暫存（上限 60 筆），稽核走既有表 |
| `today` / `seq` | 參考日與序號 | — | **不建表**。runtime 內部狀態 |

分母 24 個 seed 集合 + runtime 追加的集合。**形狀相符可直接接線的有 7 個**，其餘需要新表或欄位擴充。

---

## 3. 最重要的一個決定：`Project` 撞名

`prisma/schema.prisma:534` 的 `Project` 是 **Personal OS Work 模組**的專案：掛在 `Workspace` 下，有 `ProjectAccessGrant`、`ProjectFeedback`、`ProjectMemoryCandidate`、`ProjectTask` 等關聯。

工作台的 `projects` 是**圓展的營運專案**：`client`、`goal`、`type`、`rate`（獎金率）、`cap`（上限）、`budget`、`repo`（Evidence 版本）、`status`（商機／進行中／驗收中）。

兩者名字相同、語意不同。三個選項：

| 選項 | 作法 | 代價 |
|---|---|---|
| **A. 擴充既有 `Project`** | 加 `client`／`goal`／`bonusRate`／`bonusCap`／`budget`／`operatingStatus` 等欄位，用 `Workspace.type=TEAM` 區分 | Work 模組的 `Project` 多出一批永遠為 null 的欄位；兩個模組的狀態機混在同一欄 |
| **B. 新建 `OperatingProject`** | 獨立表，與 `Project` 以 optional 關聯連結 | 兩張專案表，跨模組查詢要 join；`ProjectMilestone` 等三軌表目前掛在 `Project` 上，需改掛或雙掛 |
| **C. 共用 `Project`＋側表 `OperatingProjectProfile`** | 核心欄位（id／名稱／workspace／狀態）共用，營運專屬欄位放 1:1 側表 | 多一次 join；但三軌關聯不動，Work 模組零影響 |

**建議 C。** 理由是三軌（`ProjectPhaseNode`／`ProjectMilestone`／`ProjectObjective`）已經掛在 `Project` 上而且形狀正確——那是 `PLN-073` T1–T5 花了整個 loop 做出來的成果。選 B 等於把它們重做一次。選 A 會讓 Work 模組承擔營運模組的欄位。

這一項需要 owner 決定，不應由實作者自行選定。**停止條件：未取得此決定前不進行 migration。**

---

## 4. 第一階段建議範圍（YZLIVE-005）

`PLN-071` 把 YZLIVE-005 定義為「私人／公司日誌、專案、任務、留言、事件、附件」。對應到本表，第一階段需要：

**接線既有表（零 migration）**

`ProjectPhaseNode`、`ProjectMilestone`、`ProjectObjective`、`Rhythm`、`RhythmSession`、`Occasion`、`OperatingAuditEvent`

**新表（建議一次 migration）**

```prisma
model OperatingJournalEntry {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String   @map("workspace_id") @db.Uuid
  authorId    String   @map("author_id") @db.Uuid
  onDate      DateTime @map("on_date") @db.Date
  /// typed block 陣列，形狀由 UI 契約定義而非 schema
  blocks      Json     @default("[]")
  visibility  String   @default("company")   // company | private
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([workspaceId, onDate], map: "operating_journal_workspace_date_idx")
  @@index([authorId, onDate], map: "operating_journal_author_date_idx")
  @@map("operating_journal_entries")
}

model OperatingComment {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String   @map("workspace_id") @db.Uuid
  authorId    String   @map("author_id") @db.Uuid
  /// 三種留言合一：'journal' | 'line' | 'object'
  targetType  String   @map("target_type")
  targetRef   String   @map("target_ref")
  parentId    String?  @map("parent_id") @db.Uuid
  body        String
  createdAt   DateTime @default(now()) @map("created_at")
  deletedAt   DateTime? @map("deleted_at")

  @@index([workspaceId, targetType, targetRef], map: "operating_comments_target_idx")
  @@map("operating_comments")
}

model OperatingGoal {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String   @map("workspace_id") @db.Uuid
  title       String
  period      String
  progressPct Int      @default(0) @map("progress_pct")
  warning     String?
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([workspaceId], map: "operating_goals_workspace_idx")
  @@map("operating_goals")
}
```

`blocks Json` 是刻意的：日誌的 typed block 形狀仍在演進，早期固定成關聯表會讓每次 UI 調整都變成 migration。等 block 種類穩定再正規化。這是**已知的技術債，不是疏忽**——換來第一階段不必為了 schema 完美而延後上線。

`issues` 的欄位擴充（`size`／`blocker`／`exp`／`rel[]`／`cf{}`／`sub[]`）建議同批處理：前三個是純量欄位，後三個同樣先用 `Json`。

---

## 5. 不在第一階段的範圍

`txns`／`cash`／`reimb`／`bank`／`payroll`／`commitments` 全部延後至 `YZLIVE-007`。

理由不是工作量，是 `PLN-071` YZLIVE-007 的停止條件：「不直接沿用原型薪資／法規／付款示例；專門權限、試算規則、對帳／核准／audit，規則確認後才開正式寫入。」

原型裡的獎金率、上限、薪酬級距是**合成示例**，不是圓展的實際契約條款。把它們 migrate 成正式表，等於把示例數字變成帳務事實。`ARC-042` §7 的閘門就是為了在表建好之前先把寫入擋住。

`capacity`／`timesheet`／`weekly`／`signals` 延後至 `YZLIVE-008`，理由是它們多半是**衍生值**——由 issues 與 sessions 算出來的。先把來源持久化，衍生值再決定要落表還是即時計算。

---

## 6. 租戶與授權

所有新表一律帶 `workspaceId`，與既有 `Rhythm`／`Occasion`／`TimeSpine` 一致。沒有 `workspaceId` 的營運表不應通過審查。

讀寫一律經 service 層授權（`AGENTS.md` §9／§10），不在 route handler 內直接查 Prisma。`visibility='private'` 的日誌只有作者可讀，即使同 workspace——這是契約 §18 在 schema 上的落點。

---

## 7. Migration 影響註記

| 項目 | 評估 |
|---|---|
| 破壞性 | 無。全部是新增表與新增欄位，不改既有欄位型別 |
| 資料回填 | 無。首次進入 `database` 模式就是空白，不從 fixture 回填（`ARC-042` §8） |
| 回滾 | 新表可直接 drop；`Project` 側表方案（§3 選項 C）回滾不影響 Work 模組 |
| 需人工審查 | 是。`AGENTS.md` §9「Prisma schema 變更需 migration 影響註記與人工審查」 |

---

## 8. 待 owner 決定

1. **§3 的 A／B／C**——專案模型的歸併方式。未決定前不 migration。
2. 日誌 `visibility` 的預設值：公司可見還是私人？原型的「公司直接輸入」暗示前者，但與「私人資料隔離」的敘述張力需澄清。
3. `goals` 是圓展層級還是個人層級？seed 的 `G1/G2/G3` 看起來是公司目標，但 Personal OS 也有目標語意。
