# Owner-directed：議題任務化與卡片色彩系統（YZUI-029）

日期：2026-09-25 · Task ID `YZUI-029` · UI-088 Revision Mode（未新增 UI ID）
提案：`journal-review-task-final-v2.html`（repo root）
決策：`claude/journal-task-and-card-language-decision.md`（專案文件）

## Owner 指示

1. 回顧的「未閉合承諾」只能看不能動 —— 應該要能新增 Task、指派 Owner、設定 deadline。
2. 卡片「圓角左邊一層橘色」太廉價，要更簡約高級。
   （Owner 後續澄清：不是要改成直角，整體風格維持既有，只優化顏色細節。）

## 產品能力 delta

### 1. 任務＝議題加上一個欄位，不是第四種物件

系統裡已有三處在講「該做的事」：側欄**承諾**模組、專案的 **Phase→Milestone→Objective→Task**、
日誌的**議題物件**。再加一個「日誌 Task」會是第四種。

而議題物件（`!議題`）本來就有 `bornDay`、選填 `due`、`carried[]`、`msgs[]`、附件、結論段與參考碼 ——
**只差一個 `owner`**。

| 判定 | 語意 |
|---|---|
| 無 `owner` | 議題。要討論的事，不進逾期計算 |
| 有 `owner` | 任務。有人被指名，可設到期日，會被算逾期 |

這推翻了 `claude/today-agenda-proposals.md`「議題只加 watcher、要對方回覆仍走請求」的建議。

### 2. 狀態一律推導，不存 `status`

```
done    ← doneAt
issue   ← !owner
over    ← due < today
doing   ← msgs.length > 0
todo    ← 其餘
```

不存 status 欄位，就不會出現「已標完成但到期日還在未來」這種自相矛盾的資料。

### 3. 行內語法

`!任務` 進觸發詞（與既有 `!今天`／`!議題` 同一套手勢，一樣自動吃下縮排子樹），
行內可寫 `@某人` 指派、`~週五` 設到期日，兩者皆選填。

`~` 認得：今天／明天／後天、（本｜下）週X、`YYYY-MM-DD`、`MMDD`。
**認不得的 `@` 與 `~` 原樣留在標題裡**，不默默吃掉使用者寫的字。
只寫月日而且已經過去的視為明年。

### 4. 權限：作者或負責人

`agOwned()` 從「只有作者」放寬為「作者或被指派的負責人」。
既有 `deny()` 的文案本來就寫「僅由作者或指定負責人進行」，這次才名實相符。

`agOpenToday()` 從 `d.author === who` 改為 `agResponsible(d) === who`
（`owner || author`）—— 別人指派給我的任務會進我的右欄與收工檢查。

### 5. 回顧分頁新增任務區塊

回顧原本只有「連續敘事」，可以往下讀但讀不出結論。
任務區塊依**逾期／本週到期／無到期日／已完成**分組，卡住的排在做完的前面；
指標只算有負責人的（議題不進統計）。空狀態給可行動的指示，不是空白表格。

### 6. 卡片色彩：顏色只出現在狀態 pill

原本每張議題卡都掛一條 3px 飽和色柱（`.ag-card::before`，`--rq-warn`）。
兩個問題：清單一長，警示色用在常態上就不再是警示；而且**色柱不分狀態**，逾期與待辦長得一樣。

改為：

- 移除 3px 色柱。狀態只由 pill 表達。
- 四個狀態各有 `--ag-<state>-{bg,br,ink}` 三階 token（over／doing／todo／done）。
- 新增 `--ag-over-tint`：**大面積的洗色比 pill 的底更淡**。
  先前整列直接用 pill 的底色，暗色主題下變成一條紅帶（對 surface 比 1.064，
  而白色主題只有 1.003）。改用 tint 後暗色降到 1.024。
- 到期 pill 改中性色、`agDueLabel()` 不再自己宣告「逾期」——
  原本狀態 pill 與到期 pill 會在同一張卡上各講一次「逾期」。
- 只改 WHITE 與 BLACK；ORANGE 以 `...WHITE`、BRAND 以 `...BLACK` spread 繼承。

## 零 schema 變更

`payload.agenda` 在 Prisma 是 JSON 欄位，且讀寫兩處都是整包 spread
（`operating-store.service.ts:524`、`operating-commands.service.ts:1010`），
不是逐欄位白名單 —— `owner`／`assigner` 自動持久化。
`agState()` 為讀回的舊資料補預設值（payload 無 schema 層驗證，預設集中在這一處）。

## 檔案

**修改**

- `src/components/yuanzhan/v5/agenda-object.source.js` — owner／assigner、狀態推導、`agSetOwner`、
  行內解析（`agParseTask`／`agParseDue`）、指派控制、回顧任務區塊、pill 重寫
- `src/components/yuanzhan/v5/agenda-object.css` — 移除色柱、四狀態三階、回顧清單樣式
- `src/components/yuanzhan/v5/replies.source.js` — 4 處窄修改：`!任務` 進旗標選單與觸發詞、
  `applySummon` 分流、空行提示文案
- `src/lib/theme/company-theme.ts` — WHITE／BLACK 各加 13 個 token
- `src/lib/services/operating-store.service.ts` — 1 行註解（欄位列舉補上 owner／assigner）
- `scripts/verify-agenda-object.mjs` — 50 → 88 條
- 重新產生 `runtime.js`／`styles.ts`／`v5-seed.js`（未手改生成檔）

## 驗證

| 檢查 | 結果 |
|---|---|
| `node scripts/verify-agenda-object.mjs` | **88/88 PASS**（前一輪 50/50） |
| `node scripts/verify-object-index.mjs` | 19/19 PASS（無回歸） |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS（454 handler templates，前一輪 387） |
| `node --check runtime.js` | PASS |
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint`（4 支改動檔） | 0 errors、29 warnings |
| `npx eslint runtime.js` | 0 errors、909 warnings（檔案變大，基準 781） |
| `node scripts/check-prisma-structure.mjs prisma/schema.prisma` | PASS（69 models／58 enums／34 relations） |
| `node scripts/check-operating-command-fields.*` | 302 checks PASS |
| `node scripts/check-migration-coverage.*` | 69 tables／58 enums 全覆蓋 |
| CSS 硬編碼色掃描 | 無（全部在 `var()` fallback 內） |

### 視覺驗證（Manual Blocker Fallback）

`next dev` 在本輪的 shell 跑不起來：node_modules 是 Owner 的 macOS 安裝，
本輪是 linux/arm64，缺 `@next/swc-linux-arm64-*`，
與 `agenda-object-implementation.md` 記錄的環境限制相同。

採最強的安全替代：把**真實的 `agenda-object.css` 與 `company-theme.ts` token 值**
組成隔離頁面，以 Chromium 實際渲染 WHITE 與 BLACK 兩個主題，並量測渲染後的 computed style。

| 量測 | WHITE | BLACK |
|---|---|---|
| 逾期 pill 字/底對比 | 5.20 | 7.66 |
| 進行中 | 6.16 | 6.72 |
| 待辦 | 5.32 | 6.52 |
| 已完成 | 4.65 | 8.67 |
| 逾期列洗色 | `rgb(253,248,246)` | `rgb(29,20,23)` |
| 一般列背景 | 透明 | 透明 |
| `.ag-card::before` | `none`（色柱確實移除） | `none` |

截圖：`assets/agenda-task-white.png`、`assets/agenda-task-black.png`
隔離頁面（可直接開）：`assets/agenda-task-preview-white.html`、`assets/agenda-task-preview-black.html`
（頁面內嵌的是本輪真實的 `agenda-object.css` 與 `company-theme.ts` token 值，不是另寫的樣式。）

空目錄 `tmp-agenda-preview/` 為搬移後殘留；連接資料夾預設不允許刪除，Owner 可自行移除。

## 還沒驗證的（需要 Owner 在本機做）

`npm run dev` → `/company/operating` → 日誌：

1. 行尾 `!任務 @Lily ~週五` → 母行與縮排子項變成任務卡，負責人與到期日正確、標題不殘留 `@` `~`。
2. 議題頁的「負責」欄位可指派／收回；收回後退回議題且不再算逾期。
3. 以 Lily 身分登入，確認被指派的任務出現在她的右欄與收工檢查，而且她動得了。
4. 回顧分頁的任務區塊分組、勾選結案（沒寫結論應被擋下並跳到議題頁）。
5. 四主題（white／orange／black／brand）與 390px 寬度下可讀不溢出。

在這五條通過前，本輪不宣稱視覺驗證完成。

## 風險與待決

- **`!議題` 與 `!任務` 兩個觸發詞並存**：目前是同一型別的兩個入口，差別只在有沒有帶 `@`。
  也可以只留 `!議題`、指派了自動改稱任務 —— 少一個詞要記，但「我要開一個任務」的意圖無法直接表達。
- **逾期任務仍會被收工檢查自動延到明天**（沿用 `agCarryAllOpen`）。
  自動延期會抹掉逾期事實，建議改為逾期任務只列出、不自動延，但這會改變既有收工語意，留給 Owner 決定。
- **指派給對方沒有通知**：目前沒有通知管道，訊號模組是候選落點。
- **`payload.agenda` 仍無 schema 層驗證**：三個新欄位一樣靠 `agState()` 補預設。
- 工作樹在本輪開始前已有 Owner 自己的未提交改動（`prisma/schema.prisma`、
  `operating-store.service.ts` 的 `occurredAt`、`journal-cockpit.source.js` 等），本輪未觸碰。
  期間出現過一次 `occurredAt` 的 tsc 錯誤，稍後自行消失（Prisma client 過期後重新產生），非本輪造成。

## 追記 2026-09-26：Owner 裁決三項待決並已落地

| 待決 | Owner 裁決 | 落地 |
|---|---|---|
| `!議題` 與 `!任務` 是否都保留 | **都保留**。議題各式各樣，可能是要研究或討論，通常只有一個小結；任務比較像是要某某人做某某事在某某時間以前，需要分開 | 兩個觸發詞維持，選單文案改寫成講得出語意差異（「要研究或討論的事」vs「要某人在某時之前完成的事」）。物件仍是同一個型別，差別只在 `owner` |
| 逾期任務是否繼續被收工自動延期 | **採用建議：不自動延** | `agCarryAllOpen()` 跳過 `agTaskState === 'over'` 的項目，回傳 `{carried, stuck}`；收工確認明說「N 件逾期任務沒有延期」；收工清單把逾期標出來且「明天」不再是主要按鈕。手動改期仍可用 —— 不自動延不等於不能延 |
| 指派是否通知對方 | **要，先做站內通知** | `payload.agenda` 加 `assignedAt`／`assignSeenAt`（仍零 schema 變更）。`agAssignNotices()` 提供資料形狀，`notifications.source.js` 併入通知匣、跳轉到議題頁、標記已讀、加 `NT_LABEL.task`。指給自己不通知；結案或收回指派後通知消失 |

驗收擴充到 **99/99 PASS**（D1、D2/D2b/D2c、D3/D3b–D3f、S9 共 11 條新測）。
`generate` 474 handler templates、`node --check` PASS、`verify-object-index` 19/19 無回歸。

設計理由（逾期不自動延）：舊行為把所有未結案項目往後推一天。對還沒到期的議題是對的
（今日議題的語意就是「今天沒動就明天再說」），對已經逾期的任務卻是把證據抹掉 ——
一件週一該交的事被自動延五次之後，看起來永遠只是「明天到期」。

### 本輪未處理

`npx tsc` 出現 2 個 `cashConfig` 錯誤，來自另一份進行中的 `cashflow-contract` 工作
（`v5-state.ts` 已引用但 `V5Data` 型別尚未補上），非本輪造成，未觸碰。
本輪的 regenerate 已正確納入其 `cashflow-contract.source.js`，沒有覆蓋。
