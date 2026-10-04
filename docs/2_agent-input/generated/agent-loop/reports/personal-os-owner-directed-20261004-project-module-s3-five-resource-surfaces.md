# S3 證據報告：專案模組五大資源版面與讀寫接線

2026-10-04 · repo `self-stucture-v1` · Owner 指派（`PLN-075` S3／S4，接續 `HANDOFF_project-module-S3`）

驗收報告（給 Owner 做整合測試）：`docs/06_audits-and-reports/RPT-068_project-module-five-resource-acceptance-report.md`

## Task

- Task ID：`PROJMOD-S3`（`PLN-060` Phase 23）
- Title：專案模組六分頁外殼 ＋ 總覽／計劃／檔案／會議／對話五個版面 ＋ 讀寫接線
- 作用畫面：`UI-088`（`/company/operating`）Revision Mode；Owner 於 2026-10-03 批准 `INTEGRATION-DECISION`，未新增 UI ID

## Strategic Review

- 目前目標：`PLN-075` 的 S3 出口（四個版面可操作、三條升級路徑成立）與 S4 驗收報告。
- 前三份報告（2026-10-03 的 data-layer／capability-p0-fix／drive-service-routes／flat-primitives）都是契約與地基，沒有任何使用者看得到的畫面變化。依 Anti-Repetition Rule，這一輪必須是 runtime 與使用者可見的操作面。
- 阻擋下一個里程碑的東西：新集合「寫得進去、讀不回來」（見下）。
- 這一輪之後更真的事：專案模組有五個可操作的資源面，而且重整後資料還在。

## Source Docs Read

`AGENTS.md` §12／§12.1／§15、`PLN-075`、`INTEGRATION-DECISION.md`、`ARC-043`、`ARC-042`（透過 `operating-commands.ts` 與 service 的註解）、`RES-033`、交接文件 `HANDOFF_project-module-S3_1.md`。

交接文件附帶的 `draft-pm/` 草稿在本機找不到，所以依 §3 的規格直接寫（交接文件明言規格是權威、草稿不是）。

## Research / Reference Basis

- Page requirement understanding score：**86／100（High）** —— 角色與工作 18、PRD／本地證據 19（Owner 已批准的整合決策）、資料／BFF 16（寫入契約已定，讀取端缺）、互動模式 13（三份可點擊原型）、風險邊界 12、驗收 8。
- 三輪研究（同一個頁面問題的三個鏡頭）：
  1. 本地程式碼：`operating-converge.source.js` 的「覆寫 `VIEWS.project`」慣例、`cashflow-faces.source.js` 的分頁重組與 `opRedirect` 包覆、`form-modal.source.js` 的覆蓋層慣例。
  2. 資料／BFF 邊界：逐一核對 `operating-commands.service.ts` 的處理器與 `operating-store.service.ts` 的讀取，找到讀取端缺口與變更順序問題。
  3. 風險與驗收切分：正式庫不可手動 migrate、R2 不可實際上傳，所以寫入契約用攔截 fetch 的方式驗，而不是連資料庫。
- 選定的做法：外殼最後載入並包住 `VIEWS.project`；view 只回傳 HTML 字串；模組內導覽用 `pmGo`／`pmJump`，舊 index 只在 `opRedirect` 轉一次。
- 否決的做法：
  - 改 `runtime.js` 的 `WB` 定義或加 `source-patches.mjs` 的 `rep()` —— 那是整個 v5 最脆弱的地方。
  - 資料夾 CRUD 走 `drive` route —— 那會讓 prototype 模式無法操作，而且違反「單一寫入入口」。
  - 給階段加狀態欄 —— 需要新 migration；改由起訖日與里程碑達成推導。
  - 為四件套加分類欄位 —— 同上；改依檔案類型與檔名判斷。

## NANDA / Agent Protocol Alignment

不適用。這一輪沒有建立、修改或暴露任何 AI agent 能力。LINE 導入（唯一會開公開 webhook 的東西）依 OD-H 不做，只有一個停用的入口。

## Changes

### 新增

| 檔案 | 內容 |
|---|---|
| `src/components/yuanzhan/v5/pm-shell.source.js`／`pm-shell.css` | 外殼、分頁重組、舊 index 重導、回返脈絡、共用資料存取、prototype 示範資料 |
| `src/components/yuanzhan/v5/pm-overview.source.js` | 總覽：數字列、期階梯、跨資源待辦、五大資源入口、時間流 |
| `src/components/yuanzhan/v5/pm-plan.source.js` | 計劃：期／階段／里程碑／任務；審核任務的送審／通過／退回 |
| `src/components/yuanzhan/v5/pm-drive.source.js` | 檔案：資源樹、資料夾 CRUD、上傳、歸檔、下載 |
| `src/components/yuanzhan/v5/pm-meeting.source.js` | 會議：四屬性、四件套、待辦→任務、結論→決議 |
| `src/components/yuanzhan/v5/pm-chat.source.js` | 對話：頻道、一列一訊息、附件進收件匣、訊息→任務 |
| `scripts/check-project-module-ui.mts` | `pnpm project:ui:check`，74 項 |
| `docs/06_audits-and-reports/RPT-068_…acceptance-report.md` | S4 驗收報告 |
| `docs/2_agent-input/generated/project-module-acceptance/*.jpg` | 9 張瀏覽器截圖 |

### 修改

| 檔案 | 改動 | 理由 |
|---|---|---|
| `src/lib/services/operating-store.service.ts` | 讀回 `folders`／`phaseCycles`／`chatChannels`／`chatMessages`，以及 `issues`／`phases`／`milestones`／`occasions`／`assets` 的新欄位 | **寫入接了、讀取沒接**：重整後資料全部消失 |
| `src/lib/services/operating-commands.service.ts` | `applyOccasion`（projectId／folderId／guests／cautions）、`applyPhase`（期／ordinal／stageKind）、`applyMilestone`（status／folderId）、`applyIssue`（objectiveId）；`orderByDependency`；`resolveWorkbenchRowId`；ROOT／INBOX 重複防護；搬移的子樹重寫；可見性不得比上層寬 | 新欄位沒寫入；一次 commit 內的順序不是依賴順序；伺服器自建的資料夾沒有業務 id |
| `src/app/api/company/operating/drive/route.ts`、`drive/uploads/route.ts` | `projectId`／`folderId`／`parentId` 接受工作台的業務 id | 工作台手上沒有主鍵 |
| `src/lib/mappers/work.mapper.ts` | mapper 輸入型別不要求 `Project` 的四個新欄位 | 兩個型別錯誤會擋住 Vercel build |
| `scripts/generate-yuanzhan-v5.mjs` | `EXTENSIONS` 加六個檔（`pm-shell` 最後）；styles 串接加 `pm-shell.css` | 不註冊就不會進 `runtime.js` |
| `scripts/check-nested-card.mjs` | `STRICT_FILES` 加七個新檔 | 新檔零容忍 |
| `scripts/operating-runtime-harness.ts` | `mountAll` 多一個可選的 `prepare`（掛載前改寫初始狀態） | 讓檢查腳本能用 database 模式掛載 |
| `package.json` | `project:ui:check` | — |
| `runtime.js`／`styles.ts` | generator 產物 | 不手改 |

`source-patches.mjs`、`company-theme.ts`、`prisma/schema.prisma`、migration：**本輪沒有動**。

## Verification

| 指令 | 結果 |
|---|---|
| `pnpm db:generate` | PASS |
| `pnpm exec tsc --noEmit --pretty false` | 0 errors |
| `pnpm build` | exit 0 |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS，626 handlers |
| `node scripts/check-nested-card.mjs` | PASS，新檔 0 違規，基線 143 不變 |
| `pnpm project:ui:check` | 74/74 |
| `node scripts/check-prisma-structure.mjs prisma/schema.prisma` | PASS |
| `tsx scripts/check-operating-spine.ts` | PASS 24 |
| `tsx scripts/check-operating-commands.ts` | PASS 42 |
| `node scripts/check-operating-command-fields.mjs` | PASS 356 |
| `node scripts/check-migration-coverage.mjs` | PASS |
| `check-operating-runtime`（經 `.mts` 副本） | PASS，雙模式 26 分頁 0 錯誤 |
| `check-journal-day-state`／`check-cashflow-faces`／`check-contract-cashflow`（同上） | 34/34、72/72、48/48 |
| `node scripts/check-operating-persistence.mjs` | PASS |
| `node scripts/verify-project-drive.mjs` | 140/140 |
| `check-operating-canvas`、`check-reply-jump` | **FAIL，但在未改動的 HEAD 上一樣失敗**（以 `git worktree` 驗證） |
| 瀏覽器（本機 showcase，1440×900 與 390×844，黑／白佈景） | 六個分頁可操作、0 page error、無橫向溢出 |

`ops:check` 這條鏈在本機無法直接跑完：六支 tsx 腳本用 top-level await，tsx 4.22 ＋ Node 24 把 `.ts` 編成 CJS。這與本輪改動無關；用暫時的 `.mts` 副本逐支跑過。

沒有驗的：真實 R2 上傳／歸檔／下載（交接文件禁止）、對正式資料庫的寫入。

## Acceptance Mapping

- `PLN-075` S3 出口條件：四個版面可操作 ✓；三條升級路徑（訊息→任務、會議待辦→任務、結論→決議）✓。
- `PLN-075` §S1 七條硬性約束：期是真的一層 ✓；收件匣是真資料夾 ✓；會議四屬性跟著資料夾 ✓；內部／客戶可見有標示 ✓；Owner 的資料夾慣例是預設樹 ✓；LINE 僅停用入口 ✓；沒有新的視覺語言 ✓。
- `PLN-075` §S1.5：巢狀卡 0、寫死 hex 0、emoji／字面 svg 0、沒有手改產物 ✓。
- `ACC-002`：新增「專案模組五大資源」一節。

## Remaining Risks

1. 第一次真實上傳才是第一次端到端（`RPT-068` §6.2-1）。
2. 上傳需要專案綁定公司 workspace ＋ Owner 的 ACTIVE membership（`RPT-068` §7-1）。
3. 任務負責人、會議時間、交付標準三個既有欄位沒有被保存（`RPT-068` §6.3）。
4. 10 分鐘心跳自動化仍是 ACTIVE；本輪動了 `MAN-001`、`PLN-060`、`PLN-061`、`RPT-007`、`REF-003`、`ACC-002` 六個 tracked 文件，若被還原要重補。

## Next Task

Owner 依 `RPT-068` §8 做整合測試。通過之後的候選：`ProjectTask` 負責人持久化 → `lifecycleStage` 回填 → `0_工作區` 遷移計劃（另立 PLN）。
