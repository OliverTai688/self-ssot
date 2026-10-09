# 證據報告：日誌貼紙 —— `/doing` 進行中與「正在做的事」

2026-10-09 · repo `self-stucture-v1` · Owner 指派（對話中直接提出）

## Task

- Task ID：`JRNL-STK-002`（接續 `JRNL-STK-001`）
- 作用畫面：`UI-088`（`/company/operating` · 日誌）Revision Mode；未新增 UI ID
- Owner 原話：「貼圖的部分請幫我設計一個進行中的貼紙，並且加上去」；看過之後追加：「增加正在做的事，推上main」

## Strategic Review

`JRNL-STK-001` 留下的擴充點就是為了這件事：貼紙表加一列、圖放進 `public/stickers/`。
這一輪是使用者可見的行為（多一張可以貼的貼紙），不是文件或證據類工作。

## 設計

| 面向 | 決定 |
|---|---|
| 圖 | `public/stickers/doing.svg`：藍色圓章、三顆跳動的白點、與完成章同一圈縫線和同一顆亮點。1:1、透明背景、自帶白邊、1 KB。 |
| 跟完成章怎麼分 | 三樣都不同，不靠顏色單獨辨識：輪廓（圓 vs 花形）、顏色（藍 vs 朱紅）、圖樣（三點 vs 勾）。藍色對應工作台裡「Doing」既有的顏色。 |
| 怎麼貼 | `/doing` 按 ↵ 或空白；`/進行中`、`/wip` 也認得。打到 `/d` 時選單會同時列出完成與進行中。 |
| 做完之後 | 一行一張貼紙：在同一行打 `/done`，進行中直接換成完成章，不必先撕掉。 |
| 記錄 | 進行中**不計入**「完成的小事」與物件卡片的件數；換成完成章之後才計入。 |
| 正在做的事 | 右側駕駛艙在「完成的小事」上面多一區，列出兩個人還貼著進行中的行（含物件裡的行），點一下跳到那一行。看「今天」時，前幾天還沒做完的也一起帶過來並標出是哪一天，點了會翻到那一天；換成完成章或撕掉貼紙就離開清單。回頭翻某一天時只列那一天頁面上的。 |

三個草稿（A：進度環加小點、B：三顆大點加縫線、C：只有粗進度環）在 20–100px、黑白兩種底上並排比過，
選 B：20px 時 A 的點糊掉、C 讀起來像「載入中」的系統圖示而不是貼紙。

否決：沿用花形只換顏色（色弱時兩張分不出來）；「正在做的事」只列當天頁面上的行（隔天就從清單消失，但事情並沒有做完）；
替帶過來的清單設天數上限（會無聲地藏掉還沒做完的事 —— 要它離開清單，就把它做完或撕掉）。

## NANDA / Agent Protocol Alignment

不適用。

## Changes

| 檔案 | 改動 |
|---|---|
| `public/stickers/doing.svg`（新） | 進行中貼紙 |
| `src/components/yuanzhan/v5/journal-stickers.source.js` | 貼紙表多一列；重複貼同一張的提示改成不分貼紙的說法；「正在做的事」那一區（跨日帶過來、同一張物件只算一次）；跳到別天的行 |
| `src/components/yuanzhan/v5/runtime.js` | 重新生成 |
| `scripts/check-journal-stickers.mts` | 多 12 項：`/d` 列出兩張、`/doing` 貼上、不計入完成、同行 `/done` 換掉、換掉後才計入、`/進行中`；正在做的事列出與離開、昨天的帶到今天並標日期、昨天完成的不帶過來、點一列翻到那一天、翻到昨天只列當天 |

沒有 schema 變更、沒有後端改動、沒有新的樣式。

## Verification

| 指令 | 結果 |
|---|---|
| `node scripts/generate-yuanzhan-v5.mjs` | PASS，652 handlers |
| `pnpm exec tsc --noEmit --pretty false` | 0 errors |
| `pnpm build` | exit 0 |
| `pnpm ops:stickers:check` | 50/50 |
| `check-journal-day-state`／`check-decision-reply`／`check-link-object` | 34/34、36/36、24/24 |
| `verify-agenda-object`／`verify-journal-review`／`verify-object-index`／`verify-asset-object` | 103/103、34/34、19/19、73/73 |
| `check-project-module-ui` | 91/91 |
| 瀏覽器（本機 showcase，1440×900，真實鍵盤輸入，黑色主題） | Standup 的一行打 ` /d` → 選單列出完成與進行中；打完 `/doing ` 貼上藍色進行中；另一行 `/done` 並排看得出差別；卡片件數與右側清單只算完成的那一行；在進行中那一行打 ` /done ` → 換成完成章，件數變 2；右側「正在做的事 1」列出貼著進行中的那一行，下面是「完成的小事 1」 |

在獨立 worktree（由 `origin/main` 開出）裡實作與驗證。

既有、與本輪無關的失敗（未處理）：`check-journal-space-switch` 8/9 ——「切回來之後，回顧頁還列得出自己寫過的每一天」，
換回 `origin/main` 的 `runtime.js` 跑，同一項一樣失敗（fixture 的 2026-09-24 已經落在回顧的預設範圍之外）。

## Remaining Risks

- 沒有在正式站、也沒有用注音輸入法試過 `/進行中`。
- 白、橘、品牌三個主題沒有在工作台裡目視確認（圖在白底與黑底的並排比較圖上看過）。
- 打 `/d` 再按 ↵ 選到的是排第一的「完成」；要進行中得多打到 `/doi` 或按一次 ↓。
- 「正在做的事」沒有天數上限：很久以前貼了進行中又忘掉的行會一直留在今天的清單上，直到換成完成章或撕掉。
- 跨日帶過來與點一列翻到那一天，只有機檢（jsdom）驗過；瀏覽器實測用的 showcase 資料只有一天。

## Next

- Owner 在正式站驗收。
