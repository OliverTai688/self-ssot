# Agent Loop Evidence Report

## Task

- Task ID: `PROJIMP-A`
- Title: `0_工作區` 專案匯入階段 A —— 對應表、匯入腳本與乾跑
- Date: 2026-10-07
- Agent: Claude（Owner-directed）

## Source Docs Read

- `AGENTS.md`
- `docs/2_agent-input/generated/project-migration-plan/MIG_workspace-inventory-and-migration-plan.md`（全文）
- `docs/05_execution-plans/PLN-075_project-module-five-resource-staged-build-plan.md`
- `docs/06_audits-and-reports/RPT-068_project-module-five-resource-acceptance-report.md`（遷移相關段落）
- `docs/05_execution-plans/PLN-060_task-backlog.md` Phase 23、`PLN-061_current-sprint.md`
- 程式：`prisma/schema.prisma`（`Project`、`OperatingProjectProfile`、`ProjectFolder`）、`src/lib/services/operating-commands.service.ts`（`rowUuid`、`applyProject`、`PROJECT_STATUS_MAP`）、`src/lib/services/operating-store.service.ts`（專案讀取）、`src/components/yuanzhan/v5/runtime.js`（`nid`、專案表單）、`scripts/backfill-project-lifecycle-stage.mjs`

## Scope

- In scope：確認 10/02 盤點之後做到哪；依 Owner 2026-10-07 回覆建立對應表；寫匯入腳本並對正式庫**唯讀**乾跑；修正「已結案」狀態對照。
- Out of scope：實際寫入資料庫（待 Owner 同意）；資料夾樹與檔案（階段 B）；合約、期款、里程碑（階段 C）；任何產品畫面。

## Strategic Review

- 這是 Owner 直接指定的工作，不是心跳自動化選題。
- 卡點：`PLN-075` 把真實遷移移到「S4 驗收後另立 PLN」，那份 PLN 從未建立，所以 10/02 的盤點一直停在文件。
- 本輪讓它更真的地方：有一份經 Owner 回覆校正過的對應表、一支對正式庫驗過主鍵規則的腳本、一份可以直接審的乾跑計畫。

## Findings

1. **來源資料夾沒變。** `Downloads/0_工作區` 與 10/02 盤點的 `Documents/2_yzedtech/0_工作區` 逐檔比對：202 個檔，路徑與位元組全同。
2. **資料庫現況（唯讀查詢）。** 圓展工作區 4 個專案，皆為 Owner 9/24–10/1 手動建立，對應 `01`、`03`、`07`、`12`；`lifecycle_stage` 全為預設 `PROPOSING`，`legacy_folder_no`／`priority_tier` 為空；`project_folders` 0 列；掛在專案上的 `operating_assets` 0 列；`workspace_memberships` 在該工作區 0 列（席位由環境變數決定）。
3. **工作台實際讀寫的專案欄位** 只有名稱、客戶、目標、類型、負責席位、狀態、獎金率、上限、預算、Evidence Repo、起始日。`lifecycle_stage`、`priority_tier`、`legacy_folder_no`、`description`、`next_action` 不在讀取路徑上。
4. **既有缺陷。** 專案表單的狀態選項是 `商機／進行中／驗收中／已結案`，`PROJECT_STATUS_MAP` 只有 `已完成` 與 `暫停`，「已結案」落到 fallback 被存成 `EXPLORING`／`DISCOVERY`。

## Implementation

- `docs/2_agent-input/generated/project-migration-plan/projects.json` —— 對應表，15 個專案（新建 11、既有 4）＋ 2 個不建成專案的資料夾。
- `scripts/import-workspace-projects.mjs` —— 預設乾跑；`--apply` 需要 `PERSONAL_OS_IMPORT_CONFIRM`；單一交易；寫入數量與計畫不符就回滾；新專案 `ON CONFLICT DO NOTHING`，既有專案的 UPDATE 帶舊值做樂觀檢查。
- `src/lib/services/operating-commands.service.ts` —— `PROJECT_STATUS_MAP` 補「已結案 → COMPLETED／MAINTENANCE」。
- `prisma/schema.prisma` —— 只改 `priorityTier` 的說明註解（原註解寫「1＝最高」，與 Owner 的定義不符）。沒有欄位變更、沒有 migration。
- `docs/05_execution-plans/PLN-076_workspace-project-import-plan.md` —— 新計劃。

### 選定與否決的做法

- **選定：獨立腳本直接寫 `projects` 與 `operating_project_profiles`，但主鍵與欄位照寫入管線的規則。** 一次性初始化，需要寫工作台不寫的四個欄位。
- 否決：透過 `/api/company/operating/commands` 送命令。那條路寫不到 `lifecycle_stage` 等四欄，而且需要登入 session。
- 否決：用資料夾序號 `00`–`12` 當編號。`09` 被用過兩次。
- 否決：照 10/02 建議把 `00`、`05`、`06`、`08` 各拆成兩個專案。Owner 的回覆是一個資料夾一個答案；編號不可重來，先不拆。
- 否決：同一輪把資料夾樹與檔案一起搬。檔案搬遷另需白名單放寬、排除清單與對帳，失敗模式不同。

## Verification

| 指令 | 結果 |
|---|---|
| `node scripts/import-workspace-projects.mjs --self-test` | 12/12 通過。含：以兩個既有專案的主鍵驗 UUIDv5 規則、UUID namespace 與服務原始碼相同、四個狀態對照與 `PROJECT_STATUS_MAP` 相同、四個狀態就是表單選項、對應表靜態檢查、三條負面案例 |
| `node scripts/import-workspace-projects.mjs --report …/import-dry-run-20261007.md` | 唯讀交易；新建 11、補欄位 4、不需變更 0、已存在 0、阻斷 0；沒有發出任何寫入 |
| `pnpm exec tsc --noEmit --pretty false` | exit 0 |
| `pnpm db:validate` | 通過 |
| `pnpm ops:commands:check` | 42 checks PASS |
| `node scripts/check-operating-command-fields.mjs` | 356 checks PASS |
| `node scripts/check-operating-persistence.mjs` | all checks passed |

### 寫入（Owner 2026-10-07 同意後）

| 步驟 | 結果 |
|---|---|
| 寫入前再跑一次乾跑 | 新建 11、補欄位 4、阻斷 0（與第一次相同） |
| `PERSONAL_OS_IMPORT_CONFIRM=… node scripts/import-workspace-projects.mjs --apply` | `applied：新建 11 個專案，補欄位 4 個專案` |
| 寫入後重跑乾跑 | 新建 0、補欄位 0、不需變更 4、已存在 11 |
| 唯讀讀回 | 圓展工作區 15 個專案；新專案與既有專案同一位擁有者；4 個已結案的 `status = COMPLETED`、`lifecycle_stage = CLOSED`；全庫 `workspace_id` 為空的專案 0 個 |
| 本機工作台（`operating-local-db`：mock 登入、database 模式、對正式庫）專案分頁 | 15 個專案名稱全部出現在專案切換列；點開「演藝經紀營運 AI」顯示狀態「已結案」；console 無錯誤；瀏覽期間 `/api/company/operating/commands` 只有 GET，沒有送出寫入命令 |

未驗證：沒有在工作台實際編輯過匯入的專案（那會寫入正式庫）。「編輯後落在同一列」目前的依據是主鍵規則的自測與既有專案的主鍵比對。

## NANDA Alignment

不適用：未觸及 AI agent 能力、路由、註冊或外部協作。

## Risks

- 編號寫入後不可重來。對應表的名稱與客戶可以事後在工作台改，但 `PRJ-ws2610-NNN` 與主鍵固定。
- 「已結案」對照的修正尚未部署。部署前在正式站編輯那 4 個已結案專案，會被舊程式存回 `EXPLORING`。
- Owner 尚未回覆：`01` 的「第二期」被解讀成 `phaseRound = 2`、`EXECUTING`；若 Owner 指的是同一份合約的第二期款而非專案第二期，`phaseRound` 應改回 1。
- 4 個已結案專案會出現在工作台專案切換器，目前沒有隱藏已結案的篩選。

## Next Decision

階段 A 完成。下一步是 `PROJIMP-B`（資料夾樹與檔案），由 Owner 決定何時啟動。
