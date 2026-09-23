# 營運工作台持久化契約：commit() 作為唯一寫入邊界

**Document ID:** `ARC-042`
**Date:** 2026-09-23
**Status:** PROPOSED — 尚未取得 runtime 實作授權
**Primary task:** `YZLIVE-005`（[PLN-060](../05_execution-plans/PLN-060_task-backlog.md)）
**Required:** [PLN-071 §7](../05_execution-plans/PLN-071_yuanzhan-account-and-private-launch-plan.md)（資料來源切換與 commit 轉正式版的既定方向）、[ARC-040](ARC-040_yuanzhan-ui-data-mode-contract.md)（雙模式契約）、[ARC-041](ARC-041_operating-track-spine-contract.md)（三軌）、[SCH-008](SCH-008_operating-workbench-collection-schema.md)（缺的資料表）
**實作計畫:** [PLN-074](../05_execution-plans/PLN-074_operating-workbench-persistence-implementation-plan.md)

---

## 1. 這份契約回答哪一個問題

`PLN-071` §7 已經定了方向：「轉正式版需命名 domain commands、非同步 pending/error、版本號與成功回寫；不能每次 keypress 把整包 DB 傳給 server。」

它沒有回答的是**怎麼做到**。因為工作台有一個結構性限制：

> `runtime.js` 是 `scripts/generate-yuanzhan-v5.mjs` 從凍結的原型 HTML 編譯出來的，手改會在下次 generate 時被覆蓋（`AGENTS.md` §12.1）。

而寫入散落在 **97 個 `commit(...)` 呼叫點**，其中約 59 個在凍結原型裡、38 個在團隊自有的 `*.source.js`。逐點改寫意味著要為 59 個位置各寫一條 `source-patches.mjs` 的 `rep()`，每一條都會在原型文字位移時 throw。那不是工程，那是維護債。

這份契約主張：**不要改 97 個點，改 1 個。**

---

## 2. 為什麼 commit() 是對的邊界

`runtime.js:368` 的註解自己就寫明了：

```js
/**
 * commit — 唯一的寫入入口
 * op: 'create' | 'update' | 'delete'
 * ent: 物件種類中文名
 * label: 這一筆的名字
 * apply: 實際改資料的函式，回傳「下游影響」字串陣列
 * undo: 可選，回復用
 */
```

它已經具備持久化需要的四件事：

| 需要 | commit() 已有 |
|---|---|
| 操作語意 | `op`（create/update/delete） |
| 稽核顯示 | `ent` + `label`，已寫進 `DB.changelog` 與 `audit()` |
| 回復 | `undo` callback，toast 上就能按 |
| 統一時機 | `apply()` 之後、`render()` 之前，單一位置 |

缺的只有一件：**machine-readable 的「改了什麼」**。`apply()` 是就地改 `DB`，回傳的是給人看的中文影響字串。

---

## 3. 選定方案：commit 內的結構化 diff

在 `commit()` 內、`apply()` 前後各取一次快照，比對出**被改動的列**，只送那些列。

```js
function commit(op, ent, label, apply, undo) {
  const before = snapshotCollections();      // 只取 PERSISTED_COLLECTIONS
  const eff = apply() || [];
  const changes = diffCollections(before, snapshotCollections());
  // …既有的 stampAuthors / recalcLedger / audit / changelog / render 不動…
  enqueueCommand({ op, ent, label, changes });  // 非同步，不擋 render
  return eff;
}
```

`diffCollections` 產出的是一組具型別的列變更：

```ts
type RowChange = {
  collection: string   // 'issues' | 'projects' | 'commitments' | …（穩定 key）
  id: string           // 'PRJ-2026-004'，原型既有的業務 id
  op: 'create' | 'update' | 'delete'
  after?: unknown      // delete 時省略
}
```

### 為什麼 collection key 而不是 `ent`

`ent` 是中文顯示名（`'Issue'`、`'交易'`、`'承諾事件'`、`'Issue 狀態'`），它會隨文案調整，而且同一個集合有多個寫法（`'事件'` 與 `'承諾事件'` 都寫 `DB.events`）。集合 key 來自 diff 本身，跟文案無關。`ent`/`label` 只留給稽核顯示。

### 這不是「整包同步 UI store」

`PLN-071` YZLIVE-005 的停止條件寫著「不得整包同步 UI store」。這個方案送出的是**單筆 commit 造成的列差異**，通常是 1–3 列；整份 `DB` 只存在於瀏覽器記憶體，從不離開。快照是本地的比對工具，不是傳輸內容。

---

## 4. 被拒絕的三個替代方案

| 方案 | 為什麼不採用 |
|---|---|
| **整包 JSON snapshot 上傳** | `PLN-071` YZLIVE-005 明文禁止。另有三個獨立理由：兩個席位同時編輯會整包互相覆蓋；稽核失去欄位粒度，而契約 §18／§20 要求金流與承諾可追溯；blob 無法用 SQL 查詢，`TimeSpine` 那類衍生索引全部失效。 |
| **逐一改寫 97 個呼叫點成 typed command** | 59 個在凍結原型內，需 59 條 `source-patches.mjs` 的 `rep()`。`AGENTS.md` §12.1 要求每條 patch「narrow and reviewable」，59 條脆弱替換違背該原則。保留為高風險集合的**局部**手段（見 §7）。 |
| **Prisma 直連 client / Supabase Realtime 直寫** | `AGENTS.md` §6 禁止 Client Component 接觸 Prisma、DB client 或 adapter payload。工作台跑在 Shadow DOM，更沒有 server action 可用，只能走 URL。 |

---

## 5. BFF 邊界

工作台在 Shadow DOM 裡，用得到的是網址而不是 server action —— 這與既有的 `/api/company/settings` 同一個理由，沿用同一個形狀。

```txt
commit()
  → enqueueCommand（前端佇列，序列化、可重試）
  → POST /api/company/operating/commands
  → requireUser()
  → resolveYuanzhanSeat(email)            席位；沒有席位 403 no_seat
  → assertWorkspaceMembership(workspaceId) 租戶邊界
  → 每筆 RowChange 逐一：
      collection 白名單 → zod 驗證 → 高風險閘門 → domain service → Prisma
  → OperatingAuditEvent（既有 model，不另造稽核表）
  → 回傳 { version, applied[], rejected[] }
```

### 請求

```ts
POST /api/company/operating/commands
{
  baseVersion: number        // 前端目前持有的版本
  commands: Array<{
    clientRef: string        // 前端生成的 uuid，冪等鍵
    op: 'create' | 'update' | 'delete'
    ent: string              // 稽核顯示用
    label: string            // 稽核顯示用
    changes: RowChange[]
  }>
}
```

### 回應

| 狀況 | 回應 |
|---|---|
| 全部成功 | `200 { version, applied: [clientRef], rejected: [] }` |
| 部分被拒 | `200 { version, applied, rejected: [{ clientRef, code, message }] }` —— 前端對被拒的那筆呼叫 `undo` |
| 版本落後 | `409 { version, rows }` —— 回傳伺服器端該些集合的現況，前端重放或顯示差異 |
| 沒有席位 | `403 { code: 'no_seat' }` |
| 未登入 | `401 { code: 'unauthenticated' }` |
| 高風險未開放 | `403 { code: 'write_not_enabled', collection }` |

`clientRef` 是冪等鍵：重送同一個 `clientRef` 不會產生第二列。這讓「送出中斷線」可以安全重試。

---

## 6. 版本與衝突

單一 `workspace` 一個單調遞增的 `operatingVersion`。每次成功的 command batch +1。

- 前端持有 `baseVersion`，隨每次請求送出。
- 伺服器 `baseVersion !== current` → `409` 並附上現況列。
- 前端收到 409：**保留本地未送出的文字**，顯示差異，讓人決定。不靜默覆寫（`PLN-071` §7）。

兩個席位同時在線是預期狀態，不是邊緣情況。跨裝置更新依 `PLN-071` §7 的順序：先 BFF refetch／`visibilitychange` focus refresh／輪詢，證明不夠用之後才接 Realtime。

日誌類的連續輸入不走 commit 佇列，走既有 `saveJournalDraft()` 的短延遲自動保存，UI 顯示保存狀態。

---

## 7. 高風險集合閘門

`AGENTS.md` §11 列 Finance、Company Strategy 為高風險模組，最終寫入需人工核准。以下集合即使 diff 產生了變更，**預設拒絕寫入**並回 `write_not_enabled`：

`txns`、`cash`、`reimb`、`bank`、`payroll`、`commitments`

它們的正式帳務契約屬於 `YZLIVE-007`／`YZLIVE-008`，在規則確認前工作台保留原本的 v5 外形但標示「預覽／未啟用」（`PLN-071` §7 的逐域檢查）。這幾個集合日後開放時，採 §4 拒絕方案中的「局部 typed command」——它們的寫入點集中且少，值得為稽核粒度付逐點改寫的代價。

---

## 7.5 讀取路徑（M5 補上）

這份契約原本只定義了寫入邊界，而驗收條件是「重整之後還在」——那需要另一半。單向管線的結果是資料真的進了資料庫、工作台卻讀不回來，每次打開都回到 seed。**那比不保存更糟，因為它看起來保存了。**

讀取是寫入的鏡像：`loadOperatingStore(workspaceId, viewerProfileId)` 把各表的列還原成 v5 runtime 認得的 `DB` 形狀，在 `page.tsx` 取代 `referenceSeed()`。

三條規則：

1. **讀取不建立任何東西。** 沒有 workspace 就回空，不 create。打開頁面不該在資料庫留下痕跡（`ARC-040`）。
2. **`database` 模式一律先清空再覆蓋。** 否則資料庫裡沒有的集合會保留 showcase 的假資料，混在真資料旁邊看起來像真的。
3. **讀取失敗不得退回 showcase／empty。** 直接拋出，由 `error.tsx` 顯示。靜默降級會讓人以為資料是空的，而不是讀取失敗了。

### `workbench_ref`：付回去的技術債

§9 記過一條代價：UUIDv5 從業務 id 推導主鍵，「代價是這個對應不可逆」。讀取路徑正是需要反查的地方，所以 16 張表各補一個 `workbench_ref` 欄位。

在欄位存在之前寫入的列 `workbench_ref` 為 NULL，讀取端一律略過——還原不出工作台需要的 id，硬塞進去只會產生指不到東西的關聯。

### 尚未做到的

- **跨裝置合併。** 目前只做到「看得出來」：回到分頁時比對伺服器版本，落後就提示重新整理。完整的 refetch-and-merge 要能在替換整個 store 的同時保住未送出的內容，那是另一個題目。
- **409 之後的差異顯示。** 佇列刻意不清空（丟掉等於替使用者放棄他剛打的字），但目前只告訴他有幾筆未保存，沒有逐筆差異。

---

## 8. 資料來源開關

沿用 `PLN-071` §7 提案的 `PERSONAL_OS_OPERATING_DATA_SOURCE`：

| 值 | 行為 |
|---|---|
| `prototype`（預設） | 現況。記憶體操作，commit 佇列不送出。UI 明示「預覽，不會保存」。 |
| `database` | server 讀實際 workspace 資料；commit 佇列送出。首次無資料就是真的空白。 |

兩條硬規則：

- `PERSONAL_OS_UI_DATA_MODE` 在 `database` 下**不得注入 fixture**。`ARC-040` 的「渲染空日誌不自動建立資料」在這裡的對應是：載入不寫入，只有 `commit()` 寫入。
- 資料庫錯誤顯示失敗／重試，**不得 fallback 到 showcase／empty**。靜默降級會讓人以為資料存了。

---

## 9. 這個契約成立的前提

| 前提 | 現況 | 若不成立 |
|---|---|---|
| 每列有穩定業務 id | 原型使用 `PRJ-2026-004` 這類 id | diff 無法辨識 update 與 delete；需先補 id 生成 |
| `DB` 可 `structuredClone` | 全部是 plain object／array | 需排除不可複製欄位（如檔案 bytes） |
| 快照成本可忽略 | 二人份營運資料，單次 clone 在毫秒級 | 資料成長後改為只快照 `apply()` 可能觸及的集合 |
| 存在 workspace 列 | schema 有 `Workspace`，圓展列待建 | `YZLIVE-003` 的前置 |

第三項是這個方案唯一的長期風險：它用「資料小」換「只改一個函式」。當單一 workspace 的營運資料超過數 MB，就該轉成 §4 的逐點 typed command。這個轉換是漸進的——`RowChange` 的形狀兩邊相同，換的只是產生來源。

---

## 10. 驗證

```bash
pnpm exec tsc --noEmit --pretty false
pnpm db:validate && pnpm db:generate
node scripts/generate-yuanzhan-v5.mjs && pnpm exec tsc --noEmit   # patch 後必跑
pnpm ops:check                                                     # 既有營運套件
```

契約層的驗證重點（實作前可先寫成 contract test，不需 DB）：

- `diffCollections` 對 create／update／delete 各產生正確的 `RowChange`，且未改動的集合不出現在輸出。
- 同一 `clientRef` 送兩次只落一列。
- `baseVersion` 落後回 409，且回應含衝突集合的現況。
- 高風險集合的 `RowChange` 一律回 `write_not_enabled`，不進 domain service。
- `prototype` 模式下佇列不發出任何網路請求。
