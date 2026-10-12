# Agent Loop Evidence Report

## Task

- Task ID: `AGENDA-PAGE-001`
- Title: 議題頁討論送不出去；手機上貼上再按 Enter，那一行不見
- Date: 2026-10-12
- Agent: Claude（Owner 直接指示，附截圖）

## Source Docs Read

- `AGENTS.md`（§12.1 v5 workbench 生成規則、§13、§14）
- `docs/05_execution-plans/PLN-061_current-sprint.md`、`PLN-060_task-backlog.md`
- `docs/08_acceptance-and-qa/ACC-002_module-acceptance-criteria.md`
- 最近三份報告：`…20261009-single-project-status-crud.md`、`…20261009-journal-doing-sticker.md`、`…20261007-audit-trail-persist.md`

## Scope

- In scope：議題頁（抽屜）上的討論、到期日、延期、指派在該頁上看得到結果；日誌與物件段落的游標讀寫在 WebKit 上可用。
- Out of scope：伺服器、schema、權限（都沒有動）；建立任務之後游標沒有回到下一行（既有行為，Chromium 與 WebKit 相同，另列）。

## Strategic Review

- 性質：Owner 回報的兩個使用中缺陷，直接修；`UI-088` Revision Mode，未新增 UI ID。
- 與前三輪不重複（專案狀態、貼紙、稽核）；這一輪是 runtime 修正加兩支驗證。
- 會更真的事：在議題頁按送出看得到那一則；iPhone 上能正常換行、貼上、叫出選單。

## Research / Reference Basis

兩個回報是兩個不同的根因。

**一、議題頁按「送出」沒反應。** 本機 showcase 重現：按下之後背後的日誌卡片已經是「討論 · 1」，眼前的議題頁仍是「討論 · 0」，
輸入框的字也還在。資料有寫進去（`agSay` 的 `commit()` 正常），伺服器端也接受（`applyDocObject` 不分作者）。
問題在重畫範圍：`commit()` → `render()` 只重畫 `#inner`，獨立頁面只補段落正文（`repaintDocPageBody` 換 `.doc-page-workspace`），
欄位（`.ag-fields`）與討論（`.ag-thread.page`）都在它外面。同一個原因讓到期日、延期、指派在議題頁上也停在舊的。
另外回焦點用的 `root.querySelector('[data-ag-input]')` 會先找到背後卡片的輸入框。

**二、手機貼上再按 Enter。** Chromium 重現不出來，改用 Playwright 的 WebKit（iPhone 上所有瀏覽器的引擎）實測修正前的版本：

| 動作 | 修正前在 WebKit 上的結果 |
|---|---|
| 點一行之後讀游標 | `document.getSelection()` 回的位置退到 shadow host 外面（`DIV@1 inShadow=false`）；`getComposedRanges()` 才是真的（`#text@17`） |
| 行尾按 Enter | `caretOff()` 得 0，整行被推到下一行，原地留一個空行 |
| 換行之後 | `setCaret()` 的 `removeAllRanges()` + `addRange()` 把游標丟掉（`rangeCount 0`、`type None`），接著打字沒有反應 |
| 貼上 | 「游標不在這一行裡」，`preventDefault()` 之後直接 return，整段被吃掉 |
| 打 `!`／`#`／`@`／`/` | `checkTrigger()` 拿到的游標前文字是空的，選單不會開 |

最小重現（獨立頁面，一個 shadow root 兩個 contenteditable）確認：`addRange()` 對 shadow 內的 range 不作用；
`setBaseAndExtent()`、`collapse()` 有作用；`getComposedRanges({ shadowRoots })` 與舊簽名 `getComposedRanges(root)` 都回得出真位置。

- 選定做法：`runtime-prelude.source.js` 的 `selection()` 在沒有 `shadowRoot.getSelection` 的引擎上回一個同介面的包裝 ——
  讀走 `getComposedRanges()`、寫走 `setBaseAndExtent()`。引擎用到的只有五個成員（`rangeCount`／`getRangeAt`／`removeAllRanges`／`addRange`／`toString`），
  `caretOff`、`setCaret`、`caretRect`、貼上處理一行都不用改。Chromium 走原本的路，行為不變。
- 沒選的做法：(a) 逐一改 `caretOff`／`setCaret`／貼上 —— 要動凍結原型的三處與一支 extension，而且下一個用 `selection()` 的人會再踩一次；
  (b) 貼上改用 `execCommand('insertText')` —— 只解貼上，Enter 與選單仍然壞；(c) 議題頁每次 `render()` 都整頁重畫 ——
  會打斷正在寫的標題、段落與日期輸入。
- 議題頁改成局部重畫：`agRepaintPageState()` 只換欄位列與討論區；欄位逐列換，正在輸入日期的那一列跳過
  （`<input type="date">` 用鍵盤逐段輸入時每湊成合法日期就觸發一次 `change`）。指派會改變整頁的稱呼（議題↔任務），走既有的整頁重畫。

外部依據：WHATWG／W3C Selection API 的 `getComposedRanges()`（Safari 17 起）；實際行為以本機 WebKit 實測為準，見上表。

## NANDA / Agent Protocol Alignment

- Applies?：否。沒有動任何 agent 能力。

## Changes

- Files changed:
  - `src/components/yuanzhan/v5/runtime-prelude.source.js` —— `selection()` 的 WebKit 路徑（`composedRange`／`composedSelection`）。
  - `src/components/yuanzhan/v5/agenda-object.source.js` —— `agPageOpen`、`agRepaintPageState`、`agFieldsHtml`；
    `agSay`／`agAttach`／`agSetDue`／`agCarryTo` 之後局部重畫，`agSetOwner` 之後整頁重畫；回焦點回到使用者正在用的那個輸入框。
  - `src/components/yuanzhan/v5/runtime.js` —— 由 `node scripts/generate-yuanzhan-v5.mjs` 重新生成（`styles.ts`、seed 無差異）。
  - `scripts/check-agenda-page.mts`（新）、`scripts/verify-journal-engines.mjs`（新）、`package.json`（兩支 script）。
- Behavior changed:
  - 議題頁：送出／Enter 之後那一則出現在這一頁，輸入框清空、游標留著、狀態跟著變；改到期日、延期、附檔、指派都即時反映。
  - WebKit（iPhone／iPad、桌面 Safari）：Enter 在游標處換行、換行後可以繼續打、貼上有作用、Backspace 刪一個字、行內選單會開。
- Docs changed: `PLN-060`、`PLN-061`、`RPT-007`、`ACC-002`、本報告。

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm ops:agenda-page:check` | 21/21 | 對修正前的 runtime 10/21（議題頁上的 11 條全失敗） |
| `pnpm ops:engines:verify` | 4 組全過，每組 13 條，連跑 3 次 | webkit／chromium × 桌面／手機尺寸（iPhone 14、Pixel 7 模擬）；Playwright 1.60 的 WebKit |
| 同一支腳本對修正前的版本 | webkit·手機：第一步就卡住（`!` 選單不開）；chromium·桌面：議題頁 7 條失敗 | 修正前後各跑一次作對照 |
| `pnpm ops:stickers:check` | 50/50 | 無回歸 |
| `pnpm ops:links:check` | 24/24 | 無回歸 |
| `pnpm exec eslint`（兩支新腳本） | 0 | |
| `pnpm exec tsc --noEmit` | 5 個錯誤，全在 `operating-*.service.ts` | 與未含本輪改動的 `main`（2d4260e867）逐一相同：本機共用的 Prisma client 沒有重新生成（`detail`／`ownerKey`／`startedOn`）。本輪沒有動任何 `.ts` 服務 |
| `pnpm ops:reply-jump:check` | 21/22 | 失敗的那一條在 `main` 上同樣失敗，已列在 `PROJMOD-007` |
| `pnpm ops:runtime:check` | 跑不起來 | tsx 在 Node 24 不支援該腳本的 top-level await，既有問題（`PROJMOD-007`） |
| `pnpm build` | 沒有跑 | 改動只在已由 dev server 編譯並實測過的生成 JS 與兩支腳本 |

## Evidence

- 本機 showcase（prototype 模式，不寫任何資料）在 Chromium 以真實點擊重現並確認修正：按送出後議題頁顯示「討論 · 1」、狀態「進行中」、輸入框清空且有焦點。
- WebKit 修正前後的游標狀態見上表；修正後 `Enter`、貼上、`Backspace` 都以真實游標位置為準。
- DB checks：無。沒有碰資料庫；這一輪沒有對正式站做任何操作。
- Product capability delta：議題頁可以當成討論的地方用；日誌在 iPhone 上可以寫。
- Proof delta：第一支在真實 WebKit 上跑的檢查（`ops:engines:verify`）。jsdom 檢查不在 Shadow DOM 裡跑、也沒有真的游標，這一類問題它們全綠。

## Remaining Risks

- 沒有在實體 iPhone 上測。Playwright 的 WebKit 與 iOS Safari 同一個引擎，但螢幕鍵盤、注音組字、長按選單的「貼上」只有實機才有 ——
  Owner 在手機上試一次：點一行 → 貼上 → 按換行 → 繼續打字。
- Safari 17 之前（iOS 16 以下）沒有 `getComposedRanges()`，維持原本的行為（仍然是壞的）。
- 對方在別的裝置留的討論，要等這一頁下次重畫才會出現（原本就是這樣；`render()` 不重畫議題頁的討論區）。
- 建立任務之後游標沒有回到卡片下面那一行，要再點一下（兩個引擎都一樣，既有行為，未處理）。
- `ops:engines:verify` 需要先起 showcase 預覽並下載過 Playwright 的瀏覽器，沒有接進 `ops:check`。

## Final Status

- Status: DONE（Owner 手機實測待跑）
- Recommended next task: `PROJMOD-007`（讓 `ops:check` 在 Node 24 一次跑完），並把 `ops:engines:verify` 接進去。
