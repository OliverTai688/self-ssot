# Agent Loop Evidence Report

## Task

- Task ID: OWNER-DIRECTED-20260928-01（owner 直接指派，PLN-060 未列，依 AGENTS.md §5.5 窄建）
- Title: 負責人自行送出的收件也要留下報帳單，讓「我的報帳」看得到
- Date: 2026-09-28
- Agent: Claude Opus 5

## Source Docs Read

- `AGENTS.md`（§5 閉環、§6 BFF、§12.1 v5 產生規則、§13 驗證）
- `src/components/yuanzhan/v5/cashflow-faces.source.js`
- `src/components/yuanzhan/v5/runtime.js`（base `advReimb`、`RSTEPS`）
- `src/lib/services/operating-commands.service.ts`（`applyReimbursement`、`applyIntakeItem`）
- `src/lib/ui-data/yuanzhan/v5-seed.js`

## Scope

- In scope：`cfSubmit()` 送出時的報帳單建立規則。
- Out of scope：intake 表單新增「是否代墊」欄位（原方案 3）；既有資料回填；付款方式/銀行帳戶模型。

## Strategic Review

- 現象：owner 在收單「已送出」看到 2 筆，但「我的報帳」是空的。
- 根因：`cfSubmit()` 內 `const r = isOwner() ? null : {...}` —— owner 送出時**刻意不建 RMB**，
  intake 直接轉 `unfiled`。而 `cfMineView()` 讀的是 `DB.reimb`，因此永遠空白。
  收件匣那兩筆顯示的「已核准 · 待歸帳」是 `cfSentStatus()` 找不到報帳單時的 fallback 分支。
- 產品矛盾：`cfMineView()` 的空狀態文案寫「自己代墊的費用，從收件匣交出來就會出現在這裡」，
  對 owner 恆為假；且 owner 真的自掏腰包時，沒有任何地方追得到這筆錢有沒有付給自己。
- 這一圈的 delta：使用者可見的 actor journey（owner 的代墊追蹤）從不存在變成存在。

## Research / Reference Basis

- Page requirement understanding score：84（actor 清楚 18／PRD 與程式證據 17／資料邊界 18／互動 13／風險 12／驗收 6）
- Understanding level：High → 需 3 輪同議題研究，已完成：
  1. 本地程式碼 fit：追 `cfSubmit → DB.reimb → cfMineView`，確認是分支邏輯而非資料遺失。
  2. 狀態機邊界：核對 `RSTEPS`、覆寫版 `advReimb`、base `advReimb` 的自動建 TXN 分支，
     確認 owner 從「已核」推進到「已付」會走 base 且**不會**重複產生交易。
  3. 權限／持久化邊界：`applyReimbursement()` 只擋非 owner 寫入 `已核／已付`，
     owner 以 `已核` 建單為伺服器端允許路徑，不需要改 service 或 schema。
- Selected pattern：送出一律建 RMB，狀態由身分決定（owner `已核`，成員 `已送`），
  等於把「自我核准」視為隱含完成，而不是多出一個要自己按的按鈕。
- Rejected alternatives：
  - 只改 owner 的空狀態文案：不解決 owner 代墊無法追蹤付款。
  - 由「是否代墊」決定是否建單：最貼近實務，但要動 intake 表單、欄位與持久化，
    超出本次指派範圍；已記為後續任務。
  - 讓 owner 的單也走 `已送` 再自我核准：製造自我核准噪音，`待你核准` 會出現自己的單。

## NANDA / Agent Protocol Alignment

- Applies?：否。未觸及 agent 能力、manifest、路由或註冊。

## Changes

- Files changed：
  - `src/components/yuanzhan/v5/cashflow-faces.source.js`（`cfSubmit`）
  - `src/components/yuanzhan/v5/runtime.js`、`styles.ts`、seed（由產生器覆寫，未手改）
- Behavior changed：
  - 送出收件一律建立報帳單；owner 直接落在 `已核`，成員維持 `已送`。
  - owner 的送出結果／toast 文案改為「已送出 → 帳本的待歸帳／同時記進報帳，等付款」。
  - owner 現在可在「報帳」表對自己的單按「標記已付」，收件匣狀態隨之變為「已付款」。
- Docs changed：本報告、`RPT-007_completed-log.md`。

## Verification

| Command | Result | Notes |
|---|---|---|
| `node scripts/generate-yuanzhan-v5.mjs` | PASS | `Compiled 523 handler templates…`，無 patch 失效 |
| `npx tsc --noEmit` | PASS | exit 0，無輸出 |
| `node /tmp/verify-reimb.mjs`（狀態機靜態模擬） | PASS | 15/15 斷言 |

## Evidence

狀態機模擬照抄 `cfReimbOf` / `cfUnfiled` / `cfApprovals` / `cfMineView` / `cfSentStatus` 判斷式：

- OWNER 送出：我的報帳 1 筆、狀態 `已核`（進度第 3 格）、`待你核准` 0 筆（無自我核准噪音）、
  帳本待歸帳 1 筆（與改動前一致）、收件匣顯示「已核准 · 待歸帳」；
  入帳後「已入帳」；標記已付後「已付款」；
  `RSTEPS[indexOf('已核')+1] !== '已核'` 為真 → 走 base `advReimb`，不會重複自動建 TXN。
- MEMBER 送出：我的報帳 1 筆、狀態 `已送`、`待你核准` 1 筆、核准前不可歸帳（0 筆）、
  核准後可歸帳（1 筆）—— 成員路徑完全未變。

- Product capability delta：owner 的代墊費用第一次有可追蹤的付款狀態。
- Proof delta：新增報帳狀態機的靜態斷言（先前無）。
- Blocker delta：無。

## Remaining Risks

- **既有資料不會回填**：owner 先前送出的 2 筆 intake 沒有 `reimb`，仍不會出現在「我的報帳」。
  本次刻意不做自動回填（屬高風險資料寫入，AGENTS.md 要求停下確認）。需要時應做一次性遷移。
- **未區分「公司付」與「自己墊」**：目前 owner 的每一筆送出都視為報帳，
  `cfMineView()` 的「未付清」合計會把公司卡直接付掉的支出也算進去。
  正解是原方案 3（送出時問是否代墊），已列為後續任務。
- 未做瀏覽器實機走查；本輪為型別安全 + 狀態機靜態證明。owner 可在
  `/company/operating → 金流 → 收單` 送出一筆新收件，確認「我的報帳」出現該筆且停在「已核」。

## Final Status

- Status: DONE（型別與狀態機已驗證，實機走查待 owner 確認）
- Recommended next task: 於 intake 送出流程加入「公司付／自己先墊」選擇，
  只有代墊才建報帳單，並修正「未付清」合計語意（原方案 3）。
