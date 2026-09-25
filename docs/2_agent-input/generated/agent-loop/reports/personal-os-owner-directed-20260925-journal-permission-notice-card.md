# 日誌權限一致化 · 只通知的 @ · 通知匣 · 狀態卡片重新設計

- 日期：2026-09-25
- 觸發：負責人直接指派（四項介面問題，附截圖）
- 範圍：v5 營運工作台（`src/components/yuanzhan/v5/`）＋ 請求寫入契約

## 一、對方的 Standup 可以被我改掉

**現象**　雙人駕駛艙裡，對方日誌的每一行只能點開留言，但對方 Standup 卡片裡的字可以直接編輯，
而且改的是對方那一份、不是副本。同一頁上兩種規則。

**成因**　`canWriteJournal()` 看的是 `journalAuthor`，而駕駛艙把 `journalAuthor` 固定成自己
（`journal-cockpit.source.js`：`if(journalAuthor!==DB.me){…journalAuthor=DB.me}`）。
文件型物件的段落走 `renderDocSectionBodyInner()`，它沒有再問一次「這份物件是誰的」，
於是 `docKey/docInput/docClick` 這一套主日誌引擎原封不動地接上了對方的 `sec.blocks`。

**修法**　`template-objects.source.js` 新增 `docWritable(doc)`（個人空間恆真；團隊空間看 `doc.author`），
擋在 `renderDocSectionBodyInner()` —— 三個進入點（日誌行內卡片、議題卡、獨立頁面）都必經這裡，
而 `renderDocObjectCard` 會被 `agenda-object` 覆寫，擋在卡片那一層會被繞過。
不可寫時改用駕駛艙右欄那一套唯讀行（`jcPeerBlock`），點任一行展開行內留言串 —— 與讀對方日誌完全同一個操作。
同時：卡片列出現「唯讀 · 可留言」標記；獨立頁面的標題不再 contenteditable、隱藏「刪除物件」；
`deleteDocObject()` 加作者判斷；`focusin` 設定 `BLKS_OVERRIDE` 前再確認一次（第二道）。

## 二、資料流／稽核軌跡打開時，左邊四個元件還亮著

**成因**　`.jc-date{z-index:55}`（`journal-cockpit.css`）。抽屜遮罩 `.scrim` 是 40、抽屜本身 50，
所以日期列的 ‹ › 📅 回到今天 四顆按鈕整排浮在遮罩之上，看起來還亮著、還能按。
55 這個值當初是為了讓月曆彈出層蓋過頁面內容，但 `.topbar` 只有 30，不需要到 55。

**修法**　改成 35：仍高過頁面內容與 topbar，低於遮罩。

## 三、@ 只是想讓對方看到

**修法**　`replies.source.js` 的請求表多一種 `kind:'notice'`：

- `rqAskHits(q, mode)` 現在給三個選項。`@人名` 的預設（↵）是「只是讓他看到（不用回覆）」，
  `?@人名` 的預設仍是「請回覆（一般）」，`⇧↵` 兩者都是決策卡。
- `rqNotify()` 建立通知；**不**掛 `b.req`，所以同一行可以通知多人、之後仍可改成請求。
- `rqState()` 最上游回傳 `'notice'`、`rqPending()` 排除之 —— 逾期橫幅、回覆追蹤、收工檢查、
  每分鐘的提醒節奏全部自動不理它，下游三十幾處不用各自判斷。
- 行內多一顆最安靜的標籤「@ 已通知 Lily（· 已讀）」。

**通知匣**（新檔 `notifications.source.js` / `notifications.css`）　頂欄鈴鐺 + 未讀徽章，
抽屜收四類：有人 @ 我、有人請我回覆／做決定、我的請求有人回了、有人在我的日誌留言。
徽章只數背後有 `seenAt` 可保存的前兩類；留言沒有逐人已讀欄位，列出來但不計數 ——
比造一個重整就歸零的紅點誠實。打開即標已讀，但先記下當下的未讀集合，這一次瀏覽仍看得出哪幾則是新的。

**密度切換 icon** 自頂欄移除（⌘K 的「切換密度」與設定頁的 `ui.density` 保留）。

**連帶修掉的既有缺陷**　`seenAt` / `firstReplyAt` / `resolvedAt` / `choice` / `deferReason` / `via`
從來沒有進過 `operating_requests.payload`。重整之後每一筆請求都會回到「沒人讀過、沒人回過」，
24 小時的紅色提醒重新開始跑。通知匣的未讀數依賴 `seenAt`，所以這次一併補上讀寫兩側。

## 四、卡片左邊圓角的顏色很醜

**成因**　`.rq-card.today` / `.warn` 用 `box-shadow:inset 3px 0`。inset 陰影會被卡片的 `border-radius`
一起裁掉，色帶到上下兩端跟著圓角收成月牙 —— 左上、左下各缺一角。
`.rq-card.late` 又改用 2px 外框，於是同一排卡片裡逾期那張比別張寬 1px，列表邊緣是歪的。

**修法**　一套重音系統：色帶獨立成 `::before` 的短膠囊（`left:7px; top/bottom:11px; width:3px; border-radius:999px`），
離卡片邊與上下都有內距，完全不碰圓角；狀態只換 `--rq-tone` 一個變數，邊框一律 1px，不再位移。
同成因的三處一併換掉：`.rq-in-line`（收到的請求）、`.eb.rq-line`（日誌行內高亮）、
`.eb-doc-card.ag-card`（議題卡的 `border-left`，在圓角卡上會被切成斜角）。
套用範圍＝所有 `.rq-card`：回覆追蹤、今日議題、議題物件 L2、訊號頁看板、通知匣。

## 驗證

| 檢查 | 結果 |
|---|---|
| `ui:yuanzhan:v5:generate` | 389 handler templates 編譯通過 |
| `check-operating-runtime`（jsdom 雙模式全分頁） | 模組 7 · 分頁 29 · 錯誤 0 · 可疑數值 0 |
| `check-operating-spine` | 24 checks PASS |
| `check-operating-commands` | 34 checks PASS |
| `check-operating-command-fields` | 302 checks PASS |
| `check-migration-coverage` | 69 tables / 58 enums PASS |
| `check-prisma-structure` | PASS |
| `check-journal-day-state` | 27/27 PASS |
| `check-reply-jump` | 22/22 PASS |
| `check-operating-canvas` | 18 checks PASS |
| `tsc --noEmit` | 0 errors |
| `eslint`（改動檔） | 0 errors（既有 warning 不變） |
| 針對性 jsdom 功能檢查（17 項） | 全數 PASS，runtime errors 0 |

針對性檢查涵蓋：頂欄有鈴鐺／已無密度 icon、未讀徽章計數、對方 Standup 不可編輯且標唯讀、
對方段落可點開留言、我的 Standup 仍可編輯、通知抽屜列出提及者與「只通知」標記、讀過後徽章歸零。

視覺證據：`docs/2_agent-input/generated/operating-transfer/ui-preview-journal-light.html`
（以及 `-dark`、`-notice-drawer`）—— jsdom 掛載後的真實 markup ＋ `styles.ts`，`:host` 改寫成 `.v5-root` 以便直接在瀏覽器開啟。
**這幾個是一次性的驗證產物，看過就可以刪。**

## 尚未驗證

`verify-yuanzhan-v5` / `ops:verify`（真實 Chrome 截圖比對）與 `ops:doc-cycles:check`（需本機 DB）
在此環境跑不動：專案的 `node_modules` 是 darwin-arm64，而這次的 shell 是 Linux。請在開發機上補跑
`npm run ops:check && npm run ui:yuanzhan:verify`。

## 風險

- 通知與請求共用 `operating_requests`（以 `kind` 區分）。好處是不動 schema、立刻跟著保存；
  代價是日後若通知要有自己的欄位（例如逐則靜音），得再拆一張表。
- `rqNoticesOn(b)` 每次渲染對每一行掃一次 `DB.requests`。兩人規模下可忽略；
  請求數上千時要改成 render 期間建索引。
