# Agent Loop Evidence Report

## Task

- Task ID: `PROJUI-001`
- Title: 專案區域介面重做 —— 專案總表、專案標題列、下一步與設定清單
- Date: 2026-10-07
- Agent: Claude（Owner-directed，`UI-088` Revision Mode）

## Source Docs Read

- `AGENTS.md`（§7 需求理解分數、§12 UI 規則、§12.1 圖示與色彩）
- `docs/05_execution-plans/PLN-075_project-module-five-resource-staged-build-plan.md`、`PLN-076_workspace-project-import-plan.md`
- 程式：`pm-shell.source.js`、`pm-overview.source.js`、`pm-primitives.source.js`、`pm-shell.css`、`pm-primitives.css`、`runtime.js`（`projPicker`、`formProject`、`render`、`nav`、`renderRail`、`nid`）、`operating-store.service.ts`、`operating-commands.service.ts`、`scripts/generate-yuanzhan-v5.mjs`、`scripts/check-project-module-ui.mts`、`scripts/operating-runtime-harness.ts`

## Scope

- In scope：專案總表、專案標題列、總覽的下一步與設定清單、四個專案欄位的讀寫、既有 UI 檢查的更新。
- Out of scope：計劃／檔案／會議／對話四個版面、生命週期顯示（`PROJMOD-006`）、交付標準持久化（`PROJMOD-005`）、總表的看板與時間軸檢視。

## Research / Reference Basis

- 需求理解分數 84（High）→ 三輪研究，全文在 `docs/07_research-and-design/RES-034_project-area-index-and-header-research.md`。
- 外部來源：
  - Linear Docs · Projects — https://linear.app/docs/projects
  - Linear Changelog · Project views — https://linear.app/changelog/2023-05-25-project-views
  - Asana · 6 tips to use portfolios — https://asana.com/resources/tips-for-portfolios
  - NN/g · Designing Empty States in Complex Applications — https://www.nngroup.com/articles/empty-state-interface-design/
- 選定：先總表再專案、依狀態分組、每列帶一句人寫的下一步、空白狀態收成一張設定清單。
- 否決：看板、左側常駐專案清單、時間軸首頁、顯示 `lifecycleStage`、沿用 `pmTable`（理由見 `RES-034` §4）。

## Implementation

| 檔案 | 變更 |
|---|---|
| `src/components/yuanzhan/v5/pm-index.source.js`（新） | `PMV.index`、`pmOpen`／`pmList`、`pmProjectHead`、`pmSwitcher`、`pmBriefForm`、`pmBrief`、`pmSetup` |
| `src/components/yuanzhan/v5/pm-index.css`（新） | 總表、標題列、下一步、設定清單；全部走 token，760px 以下收成單欄 |
| `pm-shell.source.js` | `VIEWS.project` 在 `S.pmList` 時畫總表；`pmHead` 改用標題列；rail 的 capture 監聽分辨進入方式；總表時分頁列只有「所有專案」 |
| `pm-overview.source.js` | 最上方加下一步；剛建好的專案只回下一步＋設定清單；重點數字列拿掉「狀態」 |
| `operating-store.service.ts` | 專案列多回 `no`／`tier`／`next`／`desc` |
| `operating-commands.service.ts` | `applyProject` 在列帶著 `next`／`tier`／`desc` 鍵時寫回 `nextAction`／`priorityTier`／`description` |
| `scripts/generate-yuanzhan-v5.mjs` | EXTENSIONS 與 CSS 串接加入 `pm-index` |
| `scripts/check-operating-command-fields.mjs` | `Project` 的欄位契約加四欄 |
| `scripts/check-project-module-ui.mts` | 改寫 5 條舊斷言、新增 12 條 |
| `.claude/launch.json`（未追蹤） | 加一組 `operating-local-db-3010`：3000 埠被另一個工作階段的開發伺服器佔用 |

沒有動 `runtime.js`／`styles.ts` 以外的生成物手寫內容；兩者皆由 generator 重新產生。沒有 schema 變更。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `node scripts/generate-yuanzhan-v5.mjs` | 647 handler templates，成功 |
| `node --check src/components/yuanzhan/v5/runtime.js` | 通過 |
| `pnpm exec tsc --noEmit --pretty false` | exit 0 |
| `pnpm project:ui:check` | **91/91**（改動前 79/79；中途 74/79 的 5 條是舊設計的斷言，已改寫） |
| `pnpm ops:commands:check` | 42 checks PASS |
| `node scripts/check-operating-command-fields.mjs` | 360 checks PASS |
| `node scripts/check-operating-persistence.mjs` | all checks passed |
| `tsx scripts/check-decision-reply.ts`／`check-journal-space-switch.ts`／`check-yuanzhan-v5.ts` | 36/36、9/9、PASS |
| 預覽 `yuanzhan-showcase`（示範資料） | 側欄進專案 → 總表 4 列、分頁列「所有專案」 |
| 預覽 `operating-local-db-3010`（mock 登入、database 模式、對正式庫） | 總表 11／15 列，依狀態分組；進「大考中心」→ 標題列、下一步、設定清單 4 項（1 項已完成）；財務分頁仍帶標題列、沒有舊按鈕列；375px 無橫向捲軸；console 無錯誤；`/api/company/operating/commands` 全程只有 GET |
| 新檔的色值與 emoji 掃描 | 沒有 `var()` fallback 以外的 hex，沒有 emoji |

未驗證：
- 淺色主題沒有目視確認（在預覽裡切 `data-theme` 沒有換色，沒有再追；樣式全部走 token）。
- 沒有在正式站的工作台上實際存過下一步。
- 寫入管線以 jsdom 檢查驗證（送出的列帶 `next`／`tier`／`desc`）。

追加（Owner 同日指示 commit 並部署）：`pnpm build` exit 0；`01`、`03`、`07`、`12` 的下一步由匯入腳本寫入（只寫原本是空的那一格，補欄位 4，重跑 0 變更）。
- `check-operating-runtime.ts`、`check-operating-canvas.ts` 在 Node 24 因 top-level await 無法執行，是既有問題（`PROJMOD-007`）。

## NANDA Alignment

不適用。

## Risks

- 正式站目前是舊程式：部署前，資料庫回傳的四個新欄位會被舊前端忽略，不影響運作；部署後舊分頁送來的列沒有這些鍵，伺服器不會清空它們。
- 從側欄進專案的落點變了（總表而不是上次看的專案）。深連結不變。
- 總表的「階段」欄目前每一列都是「未分期」，因為還沒有任何專案分期。

## Next Decision

Owner 部署後驗收。之後可選：在總表列上直接編輯下一步、其餘四個 pm-* 版面的字級、`PROJIMP-B` 檔案搬遷。
