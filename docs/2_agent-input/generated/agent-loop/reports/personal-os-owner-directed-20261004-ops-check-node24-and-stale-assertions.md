# 證據報告：`ops:check` 在 Node 24 跑得完且全綠

2026-10-04 · repo `self-stucture-v1` · Owner 指派

## Task

- Task ID：`PROJMOD-007`（`PLN-060` Phase 23）
- 完成條件：`pnpm ops:check` 在本機（tsx 4.22.4 ＋ Node v24.13.0）一次跑完且全綠
- 類別：驗證基礎設施。只動檢查腳本；沒有 runtime、schema、種子資料或 UI 變更，也沒有對資料庫做任何寫入。

## 發現（與任務描述不同的地方）

1. **有 top-level await 的只有兩支，不是六支。** `check-operating-runtime.ts` 與 `check-operating-canvas.ts`。
   `check-journal-day-state`／`check-reply-jump`／`check-cashflow-faces`／`check-contract-cashflow` 早就是 `async main()`，
   改動前在這台機器上就能直接用 tsx 跑。
2. **`check-operating-canvas` 不只一處失敗。** 斷言是依序丟例外的，第一個（抽屜）擋住了後面三個：

   | 斷言 | 原因 | 來源 |
   |---|---|---|
   | 「新增…」應該開啟抽屜 | 表單搬到 `#formModalWrap`（`form-modal.source.js`） | 既有 |
   | 同日有 2 個關鍵節點 | 示範資料新增 `M03 內部驗收`（2026-09-28），與 `柏翰案驗收到期` 同日，再加一個變 3 個 | `d21b8c51a1`（PROJMOD-S3） |
   | 專案應該有「里程碑」分頁 | 外殼改成六分頁，里程碑降為「計劃」的子視圖 | `d21b8c51a1` |
   | 專案總覽有「目標對齊」 | 新總覽不再呼叫舊的 `opGoalAlign()`，只在數字列留「對齊目標」 | `d21b8c51a1` |

   以 `git show 20adb0c7d2:…/runtime.js` 確認：`M03 內部驗收` 在 `20adb0c7d2` 出現 0 次、在 `d21b8c51a1` 出現 2 次。
3. **`check-reply-jump` 是檢查錯，runtime 對。** fixture 的請求日是「今天的前一天」，斷言卻寫死 `9/24`
   （檢查寫於 2026-09-25）。runtime 印出 `↩ Lily 10/3 · L1`，正是 2026-10-04 的昨天。

## Changes

| 檔案 | 內容 |
|---|---|
| `scripts/check-operating-runtime.ts` | 主體包進 `async main()`；邏輯不變 |
| `scripts/check-operating-canvas.ts` | 主體包進 `async main()`；表單斷言改看 `#formModalWrap.on` 與 `#fmFoot`；兩條「不該開表單」的斷言同時要求抽屜也沒開；衝期改比「新增前後差一個」並要求警示同時列出原里程碑與新活動；專案分頁對齊六分頁外殼，新增 `openProjectMilestones()` 走「計劃 → 里程碑 · 目標」 |
| `scripts/check-reply-jump.ts` | `9/24` 改為由 `YDAY` 推出的短日期（與 `rqShortDay` 同格式） |

選定：統一成 `async main()`（六支裡四支已經是這個寫法，`package.json` 不必動）。
否決：改名 `.mts` —— 要動九條 `ops:*` 指令，而且會讓同一組腳本出現兩種寫法。
否決：為了讓「2 個關鍵節點」成立而去搬示範資料的里程碑日期 —— 那是改產品展示內容去遷就檢查。

## Verification

- `pnpm ops:check` → exit 0。spine 24、commands 42、fields 356、migration coverage PASS、runtime 雙模式 7 模組 26 分頁 0 錯誤、
  day-state 34/34、canvas 18 checks、reply-jump 22/22、cashflow-faces 72/72、contract-cashflow 48/48、persistence PASS。
- `pnpm exec tsc --noEmit --pretty false` → 0 errors。
- 沒有執行任何 prisma migrate／db push；沒有重新產生 `runtime.js`（沒有動任何 source）。

## Risks / 待 Owner

- **舊總覽的「目標對齊」面板走不到了**（同目標的案子、進度條、警示）。檢查現在驗的是新總覽的「對齊目標」一列。
  要不要把面板補回專案總覽，是產品決定，本輪沒有動。
- 示範資料在 2026-09-28 天生就有一則衝期警示（`M03 內部驗收` × `柏翰案驗收到期`）。是否刻意，待確認。
- `ops:runtime:regress`（不在 `ops:check` 內）對 `runtime.converged.js` 基準仍報差異；基準早於金流三面與專案外殼，本輪未處理。

## Next

`PROJMOD-S4`（Owner 整合測試）不受影響。若 Owner 要補回目標對齊面板，開一條 `PROJMOD-008`。
