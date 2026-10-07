# 證據報告：日誌貼紙 —— `/done` 完成章

2026-10-07 · repo `self-stucture-v1` · Owner 指派（對話中直接提出，並指示「設計提案、實作、推上 main」）

## Task

- Task ID：`JRNL-STK-001`
- 作用畫面：`UI-088`（`/company/operating` · 日誌）Revision Mode；Owner 於本輪直接要求，未新增 UI ID
- Owner 原話：「我希望日誌中當我打 /done 就可以換成一個小小很可愛的完成貼圖印章蓋上去，幫我製作符合格式的圖片，然後完成這個功能。
  "/" 用來召喚貼紙主要就是裝飾標註用，物件也會記錄包含 /done 的那一行，用來看小事情有多少被完成。」

## Strategic Review

前兩輪（`PROJIMP-A`、`PROJUI-001`）是資料匯入與專案區域的介面重做，都是使用者可見的行為；
這一輪是 Owner 每天在寫的日誌上的新互動，同樣是 runtime 行為，沒有連續的文件／證據類工作。

## 設計提案

**一句話**：`/` 是日誌的第五個行內入口。`#` 建立物件、`@` 引用或通知、`?@` 請回覆、`!` 標議題，都會產生一個要追蹤的東西；
`/` 不會 —— 它只是往這一行貼一張貼紙。第一張是 `/done` 完成章。

| 面向 | 決定 |
|---|---|
| 怎麼蓋 | 在任何一行打 `/done`：選單出現「完成」，按 ↵（或 Tab、點一下）就蓋；或打完 `/done` 再按一下空白，直接蓋，不等選單。`/完成` 也認得。全形 `／` 同樣有效。 |
| 蓋在哪 | 緊跟在那一行最後一個字後面、微微傾斜、壓住一點行尾。`/done` 這幾個字從文字裡拿掉。日誌的行、物件段落（Standup、任務、會議紀錄…）裡的行都可以。 |
| 不會誤觸 | `/` 前面必須是行首或空白：網址（`https://…/done`）、日期（`10/7`）、路徑都不會觸發；不是貼紙名字的 `/docs` 也不會。程式碼區塊不觸發。 |
| 撕掉 | 點一下自己行上的章就撕掉；⌘Z 也可以復原。別人的章只是一張圖，點不掉。 |
| 記錄 | 蓋了章、而且有寫字的那一行算一件「完成的小事」：右側駕駛艙多一區列出這一天兩個人完成的小事（點一下跳到那一行）；物件卡片的標題列顯示這張物件裡蓋了幾個章，滑過去看是哪幾行。 |
| 資料 | 章記在那一行自己身上：`b.stk = { k:'done', at, by }`。行本來就是整包 JSON 的 blocks，跟著日誌／物件原本的自動保存走。**沒有 schema 變更、沒有新集合、沒有後端改動。** 計數不另外存，每次從 blocks 現算。 |
| 圖 | `public/stickers/done.svg`：朱紅花形章＋白勾＋一顆亮點，自帶白色 die-cut 邊。1:1、透明背景、2 KB，20px 仍認得出來，黑白兩種底都看得出輪廓。 |
| 之後加貼紙 | 圖放進 `public/stickers/`，在 `journal-stickers.source.js` 的 `STICKERS` 加一列。只有 `done` 計入完成，其餘純裝飾。 |

## Research / Reference Basis

- Page requirement understanding score：**88／100（High）** → 三輪。行為、觸發字、記錄的用途 Owner 都講了；
  扣分在「物件也會記錄」可以有兩種讀法（物件裡的行也能蓋、或物件要彙整），這一輪兩者都做。
- 三輪（同一個問題的三個鏡頭）：
  1. **本地程式碼**：`#`／`@`／`?@`／`!` 都掛在同一張召喚選單上（`checkTrigger` → `openSummon` → `applySummon`），
     `replies.source.js` 示範了怎麼加一種新模式；行尾的標籤（`.rq-pills`）是放在 `.eb` 裡、`.eb-tx` 外面。
  2. **資料／BFF 邊界**：日誌一天一列、`blocks` 是 JSON（`applyJournal` 原樣存），物件段落的 blocks 存在
     `operating_doc_objects` 的 payload 裡 —— 區塊上多一個欄位不需要動伺服器。
  3. **風險與驗收**：書寫區是 `contenteditable` 純文字，靠 `innerText` 同步回資料；中文輸入法組字中不能重畫；
     物件段落的書寫區長在日誌的 `#doc` 裡，事件會冒泡。
- 選定的做法：
  - 章放在那一行書寫區的**外面**（同一個 `.eb` 裡、`.eb-tx` 後面的一顆按鈕），不碰 `contenteditable`。
  - 沿用召喚選單，新增 `stk` 模式；另外加「名字＋空白」的直接路徑，因為蓋章是高頻的小動作。
  - 章是區塊的一個欄位，不是新物件：它不需要參考碼、不進物件索引、不能被 `@`。
- 否決的做法：
  - 把章做成書寫區裡的行內 `<img contenteditable="false">` —— 游標位移的計算假設純文字，而且使用者會不小心把它刪掉。
  - 把完成的小事存成獨立集合（一件一列）—— 行被改寫、刪除、搬移時要同步兩處；從 blocks 現算永遠是對的。
  - 把 `/done` 等同待辦打勾（轉成 `todo` 區塊並勾起來）—— 待辦是事前寫下的承諾，完成章是事後回頭蓋的，Owner 要的是後者。
  - 用 emoji（✅）或既有的 lucide 勾 —— Owner 要的是「貼圖印章」，而且 `AGENTS.md` §12.1 不允許 emoji 當圖示。
  - 圖的顏色跟主題 token 走（內嵌 SVG＋`currentColor`）—— 它是貼上去的圖不是介面圖示；改成自帶白邊，四個主題共用一張。

## NANDA / Agent Protocol Alignment

不適用。沒有 AI agent 能力的建立、修改或暴露。

## Changes

| 檔案 | 改動 |
|---|---|
| `public/stickers/done.svg`（新） | 完成章 |
| `src/components/yuanzhan/v5/journal-stickers.source.js`（新） | 貼紙表、`/` 觸發、蓋章／撕掉、行上的章、完成的小事（日誌與物件一路走到底）、駕駛艙那一區、物件卡片的計數 |
| `src/components/yuanzhan/v5/journal-stickers.css`（新） | 擺放、蓋下去的動態（尊重 `prefers-reduced-motion`）、計數；顏色只用 token |
| `journal-cockpit.source.js` | 對方那一欄的行畫出章；右側多「完成的小事」 |
| `journal-review.source.js` | 回顧裡的行畫出章 |
| `template-objects.source.js`、`agenda-object.source.js` | 物件卡片標題列與獨立頁面顯示完成件數；空行提示加上「/ 貼紙」 |
| `template-objects.source.js` | **順帶修掉既有問題**：物件段落裡的按鍵／輸入／點擊被處理兩遍（見下） |
| `source-patches.mjs` | 空行提示加上「/ 貼紙」 |
| `scripts/generate-yuanzhan-v5.mjs` | 註冊 `journal-stickers` 與它的 CSS（排在 `replies` 之前，包的是最裡層的 `ebHtml`） |
| `scripts/start-yuanzhan-ui-preview.mjs` | 預覽也複製 `public/`，貼紙圖才讀得到 |
| `scripts/check-journal-stickers.mts`（新）、`package.json` | `pnpm ops:stickers:check`，38 項 |
| `scripts/verify-agenda-object.mjs`、`scripts/verify-journal-review.mjs` | 補上新的跨檔函式樁；`verify-journal-review` 原本就因為少 `lkHas` 的樁而跑不起來，一起補 |

沒有 schema 變更、沒有 migration、沒有後端改動、沒有新增色彩 token。

### 順帶修掉：物件段落裡的事件被處理兩遍

寫回歸檢查時發現，段落裡蓋的章存下去之後 `/done` 幾個字又跑回來。成因不在貼紙：物件段落的書寫區
（`.doc[data-doc-sec]`）長在日誌的 `#doc` 裡，兩層掛的是同一組 handler，事件冒泡之後同一支函式跑兩遍。
這在正式站上本來就看得到 —— 本機 showcase、真實瀏覽器，在 Standup 的一行行尾按 Enter：

```
之前：["介面收斂草稿完成", "", "BNI 一對一輸入 5 筆", ""]     ← 原本那一行上面多一個空行
之後：["介面收斂草稿完成", "BNI 一對一輸入 5 筆", ""]
```

同一個成因也讓段落裡 `#`／`@` 選單的 ↑↓ 一次跳兩格。改法是一個事件只處理一次（`docOnce`，`WeakSet` 記已處理的事件）；
先到的是裡層，那時 `blks()` 指著的正是該段落的 blocks。

## Verification

| 指令 | 結果 |
|---|---|
| `node scripts/generate-yuanzhan-v5.mjs` | PASS，649 handlers |
| `pnpm exec tsc --noEmit --pretty false` | 0 errors |
| `pnpm build` | exit 0 |
| `pnpm ops:stickers:check`（新） | 38/38 |
| `check-journal-day-state` | 34/34 |
| `check-journal-space-switch` | 9/9 |
| `check-decision-reply` | 36/36 |
| `check-link-object` | 24/24 |
| `verify-agenda-object` | 103/103 |
| `verify-object-index` | 19/19 |
| `verify-journal-review` | 34/34（補樁之後才跑得起來） |
| `verify-asset-object` | 73/73 |
| `check-operating-persistence`、`check-operating-command-fields` | PASS、360 PASS |
| `check-project-module-ui` | 91/91 |
| `eslint`（本輪動到的腳本） | 0 errors |
| 瀏覽器（本機 showcase，1440×900，真實鍵盤輸入） | Standup 段落裡打 ` /done` → 選單出現貼紙與 `/done` → ↵ 蓋上；日誌的行打 ` /done ` 直接蓋上；卡片標題列出現計數 1；右側「完成的小事」2 件；點章撕掉、計數與清單跟著少；黑、白兩個主題都看得清楚；`/stickers/done.svg` 200 |

`ops:stickers:check` 涵蓋：選單與 ↵、空白直接蓋、四種不該誤觸的斜線、`/d` → `/dx` 選單收掉、重複蓋章不重寫時間、
空白行不計入、撕掉、database 模式下章跟著 `journal`／`docObjects` 送出、讀回來在對方那一欄與物件段落都畫得出來、
物件段落行尾 Enter 只拆一次。

既有、與本輪無關的失敗（未處理）：
- `check-operating-runtime.ts`、`check-operating-canvas.ts`：Node 24 的 top-level await 轉譯錯誤（`PROJMOD-007`）。
- `check-reply-jump.ts` 21/22：「來源連結標的是發問那一天與行號」——換回 `HEAD` 的 `runtime.js` 跑，同一項一樣失敗。

## Remaining Risks

- **沒有在正式站、也沒有用真的注音輸入法試過。** 組字期間不觸發（沿用既有的 IME 守衛），`/完成` 走的是組字結束那一條路；
  機檢與瀏覽器實測用的都是英數輸入。
- 橘色與品牌兩個主題沒有目視確認（圖是自帶白邊的同一張，黑、白已看過）。
- 一行一張貼紙。在蓋了章的行**行首**按 Backspace 併到上一行，那個章會跟著被併掉的那一行消失（⌘Z 可復原）。
- 「完成的小事」依**那一行在哪一天的日誌上**歸屬，不是依蓋章的時刻：昨天寫的行今天才蓋章，算在昨天那一頁
  （滑過去看得到實際蓋章的日期時間）。
- 復原（⌘Z）的快照只涵蓋日誌本身的行；物件段落裡的章要撕掉得用點的（既有限制，段落裡的文字也一樣）。
- 另一個席位要重新整理或回到前景，才看得到對方剛蓋的章（既有的同步節奏）。

## Next

- Owner 在正式站驗收：打 `/done`、用注音打 `/完成`、看右側「完成的小事」與 Standup 卡片上的計數。
- 之後若要看跨日的完成數（一週蓋了幾個章），可以接到「回顧」分頁；資料已經在 blocks 上，不需要回填。
