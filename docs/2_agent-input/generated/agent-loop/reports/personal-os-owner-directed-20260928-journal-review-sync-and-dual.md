# Owner-directed：回顧的同步與多人（YZUI-030）

日期：2026-09-28 · Task ID `YZUI-030` · UI-088 Revision Mode（未新增 UI ID）

## 為什麼現在才做

Owner 最早的問題是「日誌的回顧好像沒有同步也沒有支援多人日誌的回顧」。
當時提案把它列為 P0，但實作時只做了後來延伸出的 P1-a 任務化（`YZUI-029`）——
等於在一個沒修過的底座上加了新東西。Owner 2026-09-28 指出「好像還沒實作完成」，屬實。

## 根因

回顧分頁讀的是 `DB.journal`，而那是一個 getter：

```js
get: () => journals[space][space === 'personal' ? DB.me : journalAuthor]
```

**一次只回傳一個人的日誌。** 所以「不支援多人」不是漏做篩選器，是結構上不可能。
改為直接讀 `journals[space]` 這本總帳，兩個席位一起取。

## 產品能力 delta

### 1. 多人並列

- 日期是兩人的**聯集**，新的在前；期間用日期比對（`>= dadd(TODAY,-N)`），不是取前 N 筆。
- 只留「至少一個人真的寫了」的日子 —— 兩邊都空的那天在雙軌會變成左右各一個空槽，純噪音。
- 每條帶作者頭像與姓名，對方的條目另標「對方」。
- 成員篩選（兩人／個別）。個人空間只有自己，自動不顯示雙軌與成員篩選。

### 2. 雙軌並列

左右各一條軌道、中央共用日期刻度。**同一列必定同一天**，所以「日期標頭和它底下的內容
對不起來」在結構上不可能再發生。對方那天沒寫就畫空槽，而不是留白 ——
兩人制最怕的不是寫太少，是不知道對方停在哪裡。

### 3. 同步狀態（只講真的）

走 `operating-persistence` 的真實狀態：

| 來源 | 顯示 |
|---|---|
| `OP_STATUS` | idle 已同步 / sending 同步中 / error 未保存 / conflict 有衝突 / stale 有新變更 |
| `OP_QUEUE.length` | 待送出 N 筆 |
| `OP_VERSION` | 版本號 |
| `opCheckRemoteVersion()` | 「檢查更新」按鈕 |

**`OP_LIVE` 為假（prototype／showcase）時明說「原型模式 · 沒有連資料庫，這一頁不會同步，
也不會保存」**，不顯示假的「已同步」。這與 `opPaintStatus()` 在非 database 模式直接不畫徽章
是同一個判斷 —— 這一格最容易騙人，所以特別立了一條驗收（3d）。

### 4. 唯讀語意不再自相矛盾

面板標「唯讀」，每一塊右邊卻有「開啟編輯」。改為「到這一天」：切到那天、切到該作者、
回到可編輯的「今天」分頁。回顧本身完全唯讀。

### 5. 空殼日折疊

只有 `#` 沒有內容的那天（截圖裡的 2026-09-25）折疊成一行可點開，不再佔一整塊版面。
只有空白段落的那天則完全不渲染。

## 形狀上的決定

**回顧分頁由 `journal-review` 單一擁有。** agenda-object 原本也包 `VIEWS.journal` 來
前置任務區塊；兩邊都包會疊出兩份。改為 agenda-object 只提供 `agReviewHtml()` 的內容，
掛載由 journal-review 負責，並在 EXTENSIONS 放最後讓它的 wrapper 在最外層。

## 檔案

**新增**

- `src/components/yuanzhan/v5/journal-review.source.js`（202 行）
- `src/components/yuanzhan/v5/journal-review.css`
- `scripts/verify-journal-review.mjs`（34 條）

**修改**

- `agenda-object.source.js` — 移除 `VIEWS.journal` wrapper（改由 journal-review 掛載）
- `scripts/generate-yuanzhan-v5.mjs` — EXTENSIONS 與 styles 各接一支
- `scripts/verify-agenda-object.mjs` — R1／R1b 改為對應新的擁有權
- 重新產生 `runtime.js`／`styles.ts`／`v5-seed.js`

## 驗證

| 檢查 | 結果 |
|---|---|
| `node scripts/verify-journal-review.mjs` | **34/34 PASS**（本輪新增） |
| `node scripts/verify-agenda-object.mjs` | 99/99 PASS（無回歸） |
| `node scripts/verify-object-index.mjs` | 19/19 PASS |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS（535 handler templates） |
| `node --check runtime.js` | PASS |
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint`（新檔） | 0 errors、2 warnings |
| CSS 硬編碼色掃描 | 無 |
| 圖示 key 檢查 | 全部存在（`chevron` 不在表裡，已改用 `chevronRight`） |

`svg()` 對未知 key 會靜默畫出空 `<svg>`（`agenda-object-implementation.md` 記錄過這個坑），
所以本輪把「每個 svg key 都在共用圖示表裡」寫成驗收 S4，而不是靠人眼看。

### 視覺驗證（Manual Blocker Fallback）

`next dev` 在本輪 shell 仍跑不起來（node_modules 是 macOS 安裝，本輪 linux/arm64 缺 SWC）。
以**真實的 `journal-review.css` 與 `company-theme.ts` token 值**組成隔離頁面，
用 Chromium 渲染 WHITE／BLACK 並量測 computed style：

- 雙軌格線 `453px 92px 453px`（表頭與每一列一致）
- 衝突狀態底色 WHITE `rgb(253,248,246)` / BLACK `rgb(29,20,23)`（走 `--ag-over-tint`）
- 空槽存在、桌面與 390px 皆 0 水平溢出、無 console 錯誤

截圖：`assets/jr-preview-white.html`、`assets/jr-preview-black.html`（可直接開）

## 待 Owner 本機驗收

1. `npm run dev` → `/company/operating` → 日誌 → 回顧：兩人的日誌是否都出現、日期對不對。
2. 雙軌檢視左右是否對齊，空槽是否符合「那天真的沒寫」。
3. database 模式下同步列是否反映真實狀態（改點東西看它變 sending／idle、版本號會動）。
4. 「到這一天」是否跳到正確的日期與作者。
5. 四主題（white／orange／black／brand）與 390px。

## 風險與待決

- **雙軌右側文字靠右對齊**：鏡像軌道的視覺對稱，但中文長段落靠右閱讀較吃力。
  若實際用起來不順，改成一律靠左即可（只動 `.jr-lane.r` 兩條規則）。
- **同步列只讀不寫**：「檢查更新」呼叫既有的 `opCheckRemoteVersion()`，
  衝突的並列解決（提案裡的 conflict UI）仍未做 —— 那要動 store 的替換邏輯，不在本輪。
- **presence（對方是否在線）未做**：沒有現成通道，提案裡列在 P1-b，本輪只做到同步狀態。
