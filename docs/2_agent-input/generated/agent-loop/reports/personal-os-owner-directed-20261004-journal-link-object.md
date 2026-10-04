# 證據報告：日誌連結物件（可點、貼上變元件、可存成物件）

2026-10-04 · repo `self-stucture-v1` · Owner 指派（對話中直接提出）

## Task

- Task ID：`LINK-001`（`PLN-060` Phase 23 之後的單列）
- 作用畫面：`UI-088`（`/company/operating` · 日誌）Revision Mode；Owner 於本輪直接要求，未新增 UI ID
- Owner 原話：「日誌可以有 linkable，連結貼上可以變成一個連結元件，也可以作為物件儲存」

## Strategic Review

前一輪（`PROJMOD-S3`）是 runtime 與使用者可見的操作面；這一輪是 Owner 在驗收途中提出的日誌缺口，
同樣是使用者可見的行為。沒有連續的文件／證據類工作。

## Research / Reference Basis

- Page requirement understanding score：**84／100（High）**。Owner 附了截圖（一行文字後面接一串 Google Drive 網址），
  三個要求都是具體行為；資料邊界清楚（沿用物件機制）；扣分在「貼上要多積極」沒有明說。
- 三輪（同一個問題的三個鏡頭）：
  1. 本地程式碼：檔案物件（`asset-object.source.js`）怎麼成為「可以被 @ 的物件」——`mentionHits`／`objHtml`／`objJump`／
     `SUMMON`／`OI_LEDGERS` 五個接點；書寫區是 `contenteditable` 的純文字，靠 `innerText` 同步回資料。
  2. 資料邊界：連結需要的欄位（標題、作者、誕生日、一包 JSON）`operating_doc_objects` 都有，不需要新表。
  3. 風險：`javascript:`／`data:` 網址、代抓網頁標題的 SSRF、在 `contenteditable` 裡放行內元素會打壞游標。
- 選定的做法：
  - 可點的連結放在那一行書寫區的**外面**（同一個 `.eb` 裡、換到下一列的 `<a>`），不碰 `contenteditable`。
  - 只有「空行上貼一個網址」會直接變卡片；有字的行照常貼成文字，底下出現連結與「存成物件」。
  - 連結物件是獨立的 `links` 集合，伺服器存進 `operating_doc_objects`（`kind = 'link'`），讀取端依 kind 分開。
- 否決的做法：
  - 在書寫區裡把網址包成行內 `<a contenteditable="false">` —— 游標位移的計算假設一個文字節點，會壞。
  - 每次貼上都變卡片 —— 句子會被拆成兩段。
  - 伺服器代抓網頁標題 —— 對任意網址發請求是 SSRF；改為依網域給預設名稱，可以自己改。
  - 新開一張 `operating_links` 表 —— 為了一個網址多一次正式庫 migration 不划算。

## NANDA / Agent Protocol Alignment

不適用。沒有 AI agent 能力的建立、修改或暴露。

## Changes

| 檔案 | 改動 |
|---|---|
| `src/components/yuanzhan/v5/link-object.source.js`（新） | 網址辨識、空行貼上→卡片、行內連結與「存成物件」、卡片／抽屜／表單、`@` 引用、`#` 召喚、物件索引 |
| `src/components/yuanzhan/v5/link-object.css`（新） | 樣式，零寫死色值 |
| `journal-cockpit.source.js`、`journal-review.source.js` | 唯讀的行（對方的日誌、回顧）也有可點的連結 |
| `src/lib/ui-data/yuanzhan/operating-commands.ts` | `links` 加入可比對與可寫入的集合 |
| `src/lib/services/operating-commands.service.ts` | `applyLinkObject`：只收 http／https，存進 `operating_doc_objects` |
| `src/lib/services/operating-store.service.ts` | 依 kind 把連結與文件物件分開讀回；私人的只有作者讀得到 |
| `scripts/generate-yuanzhan-v5.mjs` | 註冊 `link-object` 與它的 CSS |
| `scripts/check-link-object.mts`（新） | `pnpm ops:links:check`，24 項 |
| `scripts/verify-asset-object.mjs` | 一條過時的斷言（要求 `asset-object` 排在擴充清單最後）改成只看有沒有被列入 |

沒有 schema 變更、沒有 migration、沒有新增圖示或色彩 token、沒有動 `source-patches.mjs`。

## Verification

| 指令 | 結果 |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm build` | exit 0 |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS，636 handlers |
| `pnpm ops:links:check` | 24/24 |
| `pnpm project:ui:check` | 74/74（無回歸） |
| `check-operating-runtime`（`.mts` 副本） | PASS，雙模式全分頁 0 錯誤 |
| `check-journal-day-state`（同上） | 34/34 |
| `check-operating-commands` | 42 PASS |
| `check-operating-command-fields` | 356 PASS |
| `verify-asset-object` | 51/51 |
| `check-nested-card` | PASS，基線 143 不變 |
| 瀏覽器（本機 showcase） | 空行貼上 Google Drive 網址 → 卡片「Google Drive 資料夾」；行內 YouTube 網址 → 底下出現可點的連結，游標留在原行 |

截圖：`docs/2_agent-input/generated/project-module-acceptance/10-journal-link-object.jpg`

## Remaining Risks

- 標題是依網域猜的（Google Drive／文件／試算表／簡報／表單、YouTube、GitHub、Figma、Notion、Meet），其餘是「網域 · 最後一段路徑」。不會去抓對方網頁的真正標題。
- 既有日誌裡已經打好的網址不會自動變成物件；它們底下會出現可點的連結，要存成物件得自己按一次。
- 行內連結是在那一行重畫時才出現；打字當下靠 `input` 事件即時補上，組字（注音）中不會更新，選字完成後才出現。
- 連結物件與文件物件共用一張表。另外兩支維運腳本（`check-doc-object-cycles.ts`、`move-operating-journal-day.ts`）
  會讀到 kind = 'link' 的列；它們只處理 `payload.secs`，連結沒有那一欄，所以不受影響，但沒有實際對正式資料跑過。
