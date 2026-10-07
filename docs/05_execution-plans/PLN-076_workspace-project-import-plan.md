# PLN-076 `0_工作區` 真實專案匯入計劃

- 日期：2026-10-07
- 依據：[`MIG_workspace-inventory-and-migration-plan.md`](../2_agent-input/generated/project-migration-plan/MIG_workspace-inventory-and-migration-plan.md)（2026-10-02 盤點）、[`PLN-075`](PLN-075_project-module-five-resource-staged-build-plan.md)（把真實遷移移出、待 S4 驗收後另立本計劃）
- 狀態：**階段 A 完成（2026-10-07 已寫入正式庫並在工作台確認）**；階段 B、C 未開始
- 來源資料夾：`/Users/pzps0964713/Downloads/0_工作區`（與 10/02 盤點的 `Documents/2_yzedtech/0_工作區` 逐檔比對相同：202 個檔，路徑與大小全同）

---

## 1. Owner 決策（2026-10-07）

| 項目 | Owner 的回答 | 落點 |
|---|---|---|
| PLN-075 S4 驗收 | 通過 | 本計劃的前置條件解除 |
| 資料夾 `- N` 後綴 | 主觀認為這個專案的重要程度 | 原樣存進 `Project.priorityTier`，不解讀成階段。Owner 同日確認：**數字愈大愈重要** |
| `02.CRM平台` | 還在。文齡不是直接客戶，是可以協助找到購買客戶的人 | 建成專案，狀態「商機」 |
| `05/商城專案資訊.docx`（含帳號密碼） | 不要上傳，留在本機 | 階段 B 的排除清單 |
| `06. 演藝經紀` | 放到封存。原因：客戶說近期先不考慮 AI 導入 | 建成專案，狀態「已結案」、`lifecycleStage: CLOSED`，原因寫進說明 |
| `11` 的與會者誰需要系統帳號 | Owner 表示看不懂問題 | **採預設：都不開帳號**，四位只以姓名出現在客戶欄。日後要邀人進系統再另外處理 |
| `10` 與 `11` 是否同一客戶群 | 是 | 維持兩個專案，各自的說明互相註明 |

逐案現況（Owner 原話整理）：

| 資料夾 | 現況 |
|---|---|
| 00 | 第一批招生還沒開始，SBIR 還沒送審 |
| 01 | 第一期款已收，現在是第二期 |
| 02 | 還在（見上） |
| 03 | 第二期先留空，Owner 自己填 |
| 05 | 已申請，尚未成交第一筆買賣，需要規劃推進 |
| 06 | 對方說暫時不需要，進入 CLOSED |
| 07 | 目前不用；轉成申請 SIIR，主要看各種補助申請，或專心跟品牌顧問做實際的商業合作 |
| 08 | 預計明年 40 萬，尚未啟動 |
| 09 | 對方還沒選方案，需要追蹤 |
| 10 | 近期正在整理會計需求 |
| 11 | 沒問題，持續追蹤 |
| 12 | 已提案，看對方有沒有想要製作 |

## 2. 與 10/02 盤點建議不同的地方

盤點當時建議建 16 個專案（`00`、`05`、`06`、`08` 各拆成兩個）。Owner 的回覆是一個資料夾一個答案，所以本計劃**一個資料夾一個專案、不拆**：共 15 個專案（12 個現行資料夾 ＋ 3 個封存）。編號一旦指派就不重來，先不拆比先拆安全 —— 之後要拆，在工作台新增一個專案即可。

`20260818股東會議` 與 `研究發表線` 不是專案，本階段不建，留到階段 B 決定落點。

## 3. 資料庫現況（2026-10-07 唯讀查詢）

圓展工作區（slug `yzedtech`）已有 4 個 Owner 手動建的專案，對應 `01`、`03`、`07`、`12`。它們的 `lifecycle_stage` 都還是預設的 `PROPOSING`、`legacy_folder_no` 是空的，專案資料夾 0 個，掛在專案上的檔案 0 個。

## 4. 階段

| 階段 | 內容 | 狀態 | Owner 介入 |
|---|---|---|---|
| **A** | 只建專案：新建 11 個、替既有 4 個補上生命週期／第幾期／資料夾序號／重要度 | ✅ 完成（2026-10-07 Owner 同意後寫入） | 已完成 |
| **B** | 資料夾樹與檔案搬進專案硬碟（R2）。需要先做匯入路徑的白名單放寬（`odt`／`odp`／`doc`／`svg`）、排除清單、對帳報告 | 未開始 | 階段 A 在工作台上看過沒問題之後另行啟動 |
| **C** | 合約、期款、里程碑（`01` 的第二期、`03` 的第二期由 Owner 填） | 未開始 | Owner 主導 |

### 階段 A 的做法

- 對應表：[`projects.json`](../2_agent-input/generated/project-migration-plan/projects.json)。要改名稱、客戶、狀態，改這份檔再重跑乾跑。
- 腳本：`scripts/import-workspace-projects.mjs`，預設乾跑。
- 乾跑計畫：[`import-dry-run-20261007.md`](../2_agent-input/generated/project-migration-plan/import-dry-run-20261007.md)。
- 寫入結果：[`import-applied-20261007.md`](../2_agent-input/generated/project-migration-plan/import-applied-20261007.md)。新建 11、補欄位 4；寫入後重跑回報「已存在 11、不需變更 4」；本機工作台（database 模式）專案分頁 15 個專案全部出現。

寫出來的列必須與工作台自己建的一模一樣：

1. 主鍵用與寫入管線相同的 UUIDv5 規則從工作台編號推導，之後在工作台編輯這些專案時會落在同一列。腳本用資料庫裡既有的專案驗這條規則，對不上就中止。
2. `operating_project_profiles.workbench_ref` 一定寫，否則讀取路徑會把那一列丟掉。
3. 專案類型一律「未確認」（契約 §8.3 要 Owner 在啟動前確認），獎金率、上限、預算維持 0。
4. `access_mode` 維持資料庫預設，與現有 4 個專案相同。
5. 既有 4 個專案只補四個欄位，名稱、客戶、狀態一個字都不動。Owner 同日追加：把他交代的現況寫成這 4 個專案的下一步；腳本只在資料庫那一格是空的時候才寫，已寫入。

新專案的編號是 `PRJ-ws2610-001` 到 `-011`。不用資料夾的 `00`–`12` 當編號，因為它會被回收（`09` 用過兩次）；資料夾序號另存在 `legacy_folder_no`。

### 執行與回復

```bash
node scripts/import-workspace-projects.mjs --self-test
node scripts/import-workspace-projects.mjs
PERSONAL_OS_IMPORT_CONFIRM=I_UNDERSTAND_THIS_CREATES_PROJECTS node scripts/import-workspace-projects.mjs --apply
```

全部寫入在一個交易裡，數量與計畫不符就整批回滾。可重跑，第二次只會回報「已存在」。

回復（只在這 11 個專案還沒被掛上任務、合約、資料夾之前安全；`operating_project_profiles` 會跟著 cascade）：

```sql
delete from projects
 where id in (select project_id from operating_project_profiles where workbench_ref like 'PRJ-ws2610-%');
```

## 5. 這一輪順帶修掉的事

工作台專案表單的第四個狀態選項是「已結案」，但寫入管線的對照表只認「已完成」與「暫停」，所以在工作台把專案改成「已結案」會被存成 `EXPLORING`（等同商機）。已在 `operating-commands.service.ts` 的 `PROJECT_STATUS_MAP` 補上「已結案」。匯入的 4 個封存專案靠這一列才不會在第一次編輯時被改回商機。

## 6. 已知限制

- 工作台目前不讀 `lifecycle_stage`、`priority_tier`、`legacy_folder_no`、`description`、`next_action`。匯入後在工作台上看得到的是名稱、客戶、狀態；這些欄位先存著，等 `PROJMOD-006` 讓總覽讀生命週期時才會顯示。
- 4 個已結案的專案會出現在工作台的專案切換器裡。不想要的話，在對應表把那一列標 `"import": false`。
- 現有專案名稱「共好玟化 SEG官網」疑為「ESG」的筆誤；本計劃不改既有名稱，請 Owner 自行在工作台修正。

## 7. Owner 尚未回覆、先採預設的兩件事

- `01` 的「第二期」存成專案第 2 期（`phase_round = 2`）。若指的是同一份合約的第二期款，應改回 1。
- `11` 的四位與會者都不開系統帳號。

## 8. 停止條件

- 乾跑出現任何「阻斷」項目。
- 階段 B 需要改 `ARC-042` 的寫入佇列形狀，或新增批次寫入／刪除動作。
- 任何檔案要標成對客戶可見。
