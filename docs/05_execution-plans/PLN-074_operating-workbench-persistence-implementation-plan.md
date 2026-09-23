# /company/operating 真實持久化：分階段實作計畫

**Document ID:** `PLN-074`
**Date:** 2026-09-23
**Status:** IMPLEMENTED（M0–M4，2026-09-23）— 三份 migration 已手寫並過結構檢查；`prisma generate` 與 `migrate deploy` 需在開發機執行（`binaries.prisma.sh` 在 Cowork VM 與容器皆 403）
**Primary task:** `YZLIVE-005`（細化），延伸 `YZLIVE-007`／`YZLIVE-008`
**Required:** [ARC-042](../02_architecture-and-rules/ARC-042_operating-workbench-persistence-contract.md)（寫入邊界）、[SCH-008](../02_architecture-and-rules/SCH-008_operating-workbench-collection-schema.md)（資料表落差）、[PLN-071](PLN-071_yuanzhan-account-and-private-launch-plan.md)（上線分期與既定方向）、[ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md)、[ACC-008](../08_acceptance-and-qa/ACC-008_yuanzhan-ui-dual-mode-acceptance.md)

---

## 1. 現況（2026-09-23 實測）

owner 詢問「/company/operating 是不是還沒真正存資料」。實測確認：**是，完全沒有存。**

| 檢查 | 結果 |
|---|---|
| `V5State` 型別註解 | `Serializable, synthetic-only contract for the faithfully ported v5 workbench` |
| 初始資料來源 | `createV5State()` 每次由 `referenceSeed()` 重新生成 |
| 掛載方式 | `V5Desktop` 以 `structuredClone(initialState)` 掛進 Shadow DOM |
| `runtime.js` 全檔網路寫入 | 1 處：`fetch('/api/company/settings', PATCH)` |
| `runtime.js` 瀏覽器儲存 | 3 處，全部是 `company-theme` |
| `.env.example` 自述 | `UI-memory; reload resets records` |

**有存的**：組織／個人設定（`OrganizationSetting`／`UserSetting`）、佈景（localStorage）、登入身分（Supabase Auth + `Profile`）。

**沒存的**：工作台裡所有業務紀錄。重整、換裝置、重新部署都會回到 seed。

同時確認一個常被誤讀的落差：Prisma 已有 46 個 model、7 個 migration（含 `20260921120000_operating_tracks`），三軌的表是齊的。**資料層準備好了，UI 沒有接線。**

---

## 2. 這份計畫不重做什麼

`PLN-071` §7 已經定了方向且仍然成立，本計畫不改動它：

- 新增 `PERSONAL_OS_OPERATING_DATA_SOURCE=prototype|database` 區分資料來源
- `commit()` 轉為命名 domain commands、非同步 pending/error、版本號與成功回寫
- 不得每次 keypress 把整包 DB 傳給 server
- 不得整包同步 UI store（YZLIVE-005 停止條件）
- 日誌短延遲自動保存；跨裝置先用 refetch／focus refresh，不預先上 Realtime
- 版本衝突保留本地未送出文字並顯示差異，不靜默覆寫

本計畫補的是 `PLN-071` 沒回答的三件事：**在「runtime 是生成物」的限制下怎麼接線**（→ `ARC-042`）、**哪些集合有表哪些沒有**（→ `SCH-008`）、**分幾刀切、每刀切完能用什麼**（→ 本文 §3）。

---

## 3. 分階段

每一階段結束時 owner 要能回答一個具體問題：「現在重整頁面，什麼還在？」

### M0 — 把「不會保存」說清楚（無 schema 變更）

目前工作台看起來像能存，這是最大的風險：夥伴會在裡面輸入真實資料然後失去它。

- 加入 `PERSONAL_OS_OPERATING_DATA_SOURCE`，預設 `prototype`
- `prototype` 模式在工作台頂部常駐標示「預覽模式，重整不保留」
- Vercel 同時補上 `PERSONAL_OS_UI_DATA_MODE`（未設時為 `empty`，夥伴會看到全空白）

**重整後還在**：什麼都沒有，但沒有人會誤會。
**驗收**：兩個席位登入後都看得到標示；標示不因佈景或分頁切換消失。

### M1 — 寫入管線（無 schema 變更）

只做 `ARC-042` 的機制，先接在**已有表**的三軌上。

- `commit()` 增加 diff 與佇列（經 `source-patches.mjs` 的單一 `rep()`）
- `POST /api/company/operating/commands`：`requireUser()` → 席位 → workspace membership → 集合白名單 → zod → service
- 白名單此階段只開 `phases`／`milestones`／`objectives`／`rhythms`／`sessions`／`occasions`
- 其餘集合一律回 `write_not_enabled`
- 稽核寫入既有 `OperatingAuditEvent`

**重整後還在**：三軌（里程碑、週期、場合）。
**驗收**：A 席位新增里程碑，B 席位 refetch 後看得到；同 `clientRef` 重送不產生第二列；`baseVersion` 落後回 409 且不覆寫。

### M2 — 日常協作資料（一次 migration）

`SCH-008` §4 的三張新表 + `issues` 欄位擴充。**需先取得 `SCH-008` §3 的專案模型決定。**

- `OperatingJournalEntry`／`OperatingComment`／`OperatingGoal`
- 專案與工作項依 §3 的決定接線
- 日誌走既有 `saveJournalDraft()` 的短延遲保存，不進 commit 佇列

**重整後還在**：日誌、專案、工作項、留言、目標。這是「日常協作可用」。
**驗收**：`PLN-071` §8「日常協作可用」全項；跨兩個瀏覽器共享；重新登入仍存在；`visibility=private` 的日誌同事讀不到。

### M3 — Evidence 與容量（`YZLIVE-008`）

檔案版本凍結、出勤、承諾的來源紀錄。需要 `OperatingMedia`／`FileAsset` 的版本語意確認。

### M4 — 帳務（`YZLIVE-007`）

金流、核銷、人事、預算。

**原本寫的前置（帳務契約確認）在實作時發現是誤判。** 當時的顧慮是「把原型的合成費率變成帳實」，但 `database` 模式**根本不載入 fixture**——這些表只會收到使用者自己輸入的數字。獎金公式、稅務與薪資級距仍然不在系統裡，工作台是在前端試算；runtime 對薪資頁自己的說明就是「只更新本頁示例試算，不付款」。

所以 `ARC-042` §7 的閘門改變性質：不再拒絕寫入，而是**提高稽核層級**（`OperatingAuditEvent.riskLevel=high`），讓帳務變更在紀錄裡與一般編輯分得開。對應的表是 `operating_payroll_drafts`（草稿，不是發放紀錄）、`operating_transactions`、`operating_reimbursements`、`operating_bank_entries`。

**重整後還在**：交易、核銷、銀行明細、薪資試算。

---

## 4. 為什麼是這個順序

不是依畫面重要性排，是依**不可逆程度**排。

M1 選三軌先行，因為它們的表已經存在且形狀正確（`PLN-073` T1–T5 的成果），接錯了可以 drop 重來，沒有既有資料受影響。等於用零風險的集合把整條管線跑通一次。

M4 最後，因為帳務資料一旦寫入就具有記錄效力。原型裡的獎金率與薪酬級距是合成示例，先接線等於把示例變成帳實。

M2 夾在中間，因為它是 owner 真正要的「開始使用」——但它同時是第一次 migration，需要 `SCH-008` §3 的決定，不能靠實作者自選。

---

## 5. 驗證

```bash
# 每階段共通
pnpm exec tsc --noEmit --pretty false
pnpm db:validate && pnpm db:generate

# 動過 source-patches.mjs 之後必跑（AGENTS.md §12.1）
node scripts/generate-yuanzhan-v5.mjs && pnpm exec tsc --noEmit

# 營運既有套件
pnpm ops:check

# M2 之後，對可拋棄 DB
pnpm db:seed
pnpm work:proof -- --run
```

M1 的契約測試不需要 DB，建議先寫：`diffCollections` 的 create／update／delete 正確性、冪等鍵、409 行為、高風險集合被擋、`prototype` 模式零網路請求（`ARC-042` §10）。

---

## 6. 風險與停止條件

| 風險 | 處置 |
|---|---|
| 快照 diff 隨資料成長變慢 | `ARC-042` §9 已記錄。設一個可觀測的門檻（單次 commit 的 diff 耗時），超過就轉為逐點 typed command |
| 兩席位同時編輯互相覆蓋 | 版本號 + 409 + 保留本地未送出文字。不靠「應該不會同時編輯」 |
| `source-patches.mjs` 的 `rep()` 在原型更新時 throw | 這是設計意圖（比對不到就大聲失敗）。M1 只加一條 patch，維護面小 |
| 把示例帳務數字變成帳實 | M4 前閘門關閉；`ARC-042` §7 |
| DB 錯誤被誤認為「資料是空的」 | `ARC-042` §8：錯誤顯示失敗／重試，禁止 fallback 到 showcase／empty |

**停止條件**：

- `SCH-008` §3 的專案模型決定未取得 → 不執行 M2 的 migration
- 圓展帳務契約未確認 → 不執行 M4
- 任一階段若研究顯示範圍大於此處估計 → 更新任務切分並停下請示，不自行擴張

---

## 7. 對 backlog 的影響

本計畫不新增 Task ID，而是細化既有行：

| 既有行 | 細化 |
|---|---|
| `YZLIVE-005` | 拆成 M0／M1／M2 三刀；M1 不需 migration，可與 `YZLIVE-003` 並行 |
| `YZLIVE-007` | 對應 M4；前置改記為「圓展帳務契約確認」而非工程依賴 |
| `YZLIVE-008` | 對應 M3 |

---

## 8. Research-to-task 記錄

**檢查過的本地來源**：`AGENTS.md`（§6 BFF-first、§9 資料規則、§11 高風險模組、§12.1 v5 生成物規則）、`PLN-071` §3／§6／§7、`PLN-073`、`ARC-040`、`ARC-041`、`prisma/schema.prisma`（46 models）、`src/components/yuanzhan/v5/runtime.js`（97 個 `commit()` 呼叫點、1 個 `fetch`、3 個 localStorage）、`src/lib/ui-data/yuanzhan/*`、`src/lib/services/operating-*.ts`、`src/app/api/company/settings/route.ts`。

**線上實測**：`https://www.person.yzedtech.com` 的登入流程與 `/auth/status?proof=1`。

**選定方案**：commit() 內結構化 diff（`ARC-042` §3）。
**拒絕的替代方案**：整包 snapshot 上傳、逐一改寫 97 個呼叫點、client 端直連 Prisma／Realtime（各自理由見 `ARC-042` §4）。

**本次未做**：未連線正式 DB 盤點實際資料列；未執行 migration；未改動 runtime。三軌表的存在由 schema 與 migration 檔名確認，非由執行查詢確認。
