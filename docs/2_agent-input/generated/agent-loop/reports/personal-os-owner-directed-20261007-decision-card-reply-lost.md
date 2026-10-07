# 證據報告：決策卡選了選項卻沒存下來（正式站）＋雙方日誌的決策紀錄

2026-10-07 · repo `self-stucture-v1` · Owner 指派（對話中直接提出）

## Task

- Task ID：`RQ-DEC-001`（`PLN-060` 單列）
- 作用畫面：`UI-088`（`/company/operating` · 日誌）Revision Mode；未新增 UI ID
- Owner 原話：「決策卡我有選項回覆，但是結果沒有被保存，另外應該結果和其他選項都要一起被保存，
  且同時保存在自己和詢問他人的地方，讓雙方都有記錄知道有這個決策」

## Strategic Review

正式站資料沒存到，優先於進行中的工作。兩件事：關掉一條會靜靜吃掉寫入的路徑（不只決策卡），
以及讓決定在問的人與答的人兩邊的日誌上都留得下來。

## 事故經過（正式資料庫唯讀查詢）

| 時間（台北） | `operating_command_logs` |
|---|---|
| 10/07 13:55 | `lily / create / 決策卡 / 他想行銷的東西主要是什麼？ / [requests, docObjects]` |
| 10/07 15:21:19 | `yz / update / 請求回覆 / 他想行銷的東西主要是什麼？ / [projects, txns] / 7` ← 沒有 `requests` |
| 10/07 15:21:22 | `yz / update / 日誌 / 自動保存 / [dayLogs] / 1`（脈絡上的「回覆請求」） |
| 10/07 17:43:47 | `yz / update / 請求回覆 / 同上 / [txns] / 1` ← 第二次，一樣沒有 `requests` |
| 10/07 17:43:49 | `yz / update / 日誌 / 自動保存 / [dayLogs] / 1` |

`operating_requests` 的那一列（`REQ-nednaqub-001`）：`choice: null`、`replies: []`、`firstReplyAt: null`。
兩次選擇都沒有落地；脈絡上卻各留下一句「回覆請求」，所以看起來像「有回覆、結果沒存」。

## 根因

兩段各自看都合理的程式接在一起：

1. `rqReply()`（`replies.source.js`）先改好請求那一列，才呼叫 `commit()`。`commit()` 是「取快照 → apply() → 比對」，
   快照取下來時決定已經在裡面，這一筆命令的前後差異裡沒有它。`rqAck()`、`rqResolve()` 同一個寫法。
2. `opEnqueue()`（`operating-persistence.source.js`）用 commit 傳進來的「之前」當比對起點，排進佇列後把
   滾動基準線設成現況。平常 (1) 不會出事：這一筆沒有差異就不推進基準線，1.5 秒後的自動保存會補上。
   出事的條件是**同一次 commit 另外有別的差異** —— 佇列一推進，先改好的那一列就落進基準線，永遠比不出來。

正式站的「別的差異」來自 `stampAuthors()`：這一頁回到前景時把伺服器現況併回來（`opMergeRemote`），
讀回來的 `projects`／`txns` 沒有 `author`／`ledgerRow`，下一次 commit 順手補上 —— 正是紀錄裡那兩筆
`[projects, txns]`／`[txns]`。兩個人同時在線時，這個條件幾乎每次都成立。

離線重現（jsdom + 假 fetch，不碰資料庫）對舊版 runtime 送出的命令與正式站紀錄相同：
`請求回覆〔txns〕、日誌〔dayLogs〕`。

## 改動

| 檔案 | 內容 |
|---|---|
| `operating-persistence.source.js` | `opEnqueue()` 改從滾動基準線比起：推進基準線與送出差異涵蓋同一段，不會有列掉在中間（這是整類問題的修正，不只請求） |
| `replies.source.js` | `rqReply`／`rqAck`／`rqResolve` 的改動移進 `apply()`；選選項的命令改名「決策回覆」，回覆上記下做決定的那一天；重複選擇會被擋下 |
| `replies.source.js` | 決策紀錄卡 `rqRecord()`：題目、全部選項、選定的那一個、誰問誰決定、時間。問的人那一行下面一張、答的人「做決定那一天」的日誌尾端一張，讀的是同一列請求 |
| `replies.source.js` | `rqFindLine()` 認得寫在文件物件正文裡的行（回報的那一張問句就在 Lily 的任務卡片裡），來源標籤不再印「原行已刪除」 |
| `journal-cockpit.source.js` | 對方欄（唯讀）的行下方與欄尾也掛決策紀錄；今日脈絡把「決策回覆」記成「做出決定」 |
| `notifications.source.js` | 問的人的通知改為「X 做了決定」並帶出選定的選項 |
| `replies.css` | `.rq-rec*`，只用既有 token |
| `scripts/check-decision-reply.ts`（新） | database 模式整段掛起來，照正式站的順序（對方先寫 → 併回 → 選選項）走一遍 |
| `scripts/check-operating-persistence.mjs` | 新增「commit 之前就改好的列也會被送出」 |

沒有 schema 變更；沒有伺服器程式改動（`applyRequest` 與讀取路徑本來就存取 `options`／`choice`／`replies`）。
「結果和其他選項一起保存」的落點是同一列請求：`payload.options`（全部選項）＋`payload.choice`（選定）＋
`payload.replies[]` 裡帶 `choice`／`w`／`at`／`day` 的那一則（誰、何時、哪一天）。

## 選用與否決

- **選用**：單一資料列、兩處顯示。兩邊讀同一列，不會一邊有一邊沒有。
- 否決：選完之後在答的人日誌裡寫入一個真的 block。日誌是逐人逐天的文件，寫進別人觸發的內容會進入
  復原堆疊與排序，而且兩份會各自被改寫而分岔。
- 否決（留作後續）：同時建立一筆 `DB.decisions`（決策物件）。那是另一種物件，有自己的狀態與取代關係；
  要不要自動升級是產品決定，這一輪不替 Owner 決定。
- 否決：只修 `rqReply` 不動 `opEnqueue`。`rqNudge`／`rqDefer`／已讀時間都是「先改、靠自動保存送」，同一個洞還在。

## 驗證

- `npx tsx scripts/check-decision-reply.ts` 36/36；對 HEAD 的舊 runtime（`V5_RUNTIME=…`）在「請求那一列有被送去保存」失敗
- `node scripts/check-operating-persistence.mjs` 全過；對 HEAD 的舊片段（`OP_PERSISTENCE_FRAGMENT=…`）新案例失敗
- `ops:day-state:check` 34/34、`ops:journal-space:check` 9/9、`check-cashflow-faces` 72/72、`check-contract-cashflow` 48/48、
  `check-operating-commands` 42、`check-yuanzhan-v5` PASS、`pnpm exec tsc --noEmit` 0
- 瀏覽器（showcase 預覽，prototype 模式不發任何寫入）：選「B · 華山 2 館」後，自己的欄尾與 Lily 那一行下面各出現一張
  決策紀錄，兩個選項都在、B 標為選定；黑／白主題的顏色都由 token 解析

修正前就存在、與本輪無關的失敗（HEAD 上相同）：
`check-reply-jump` 21/22（「來源連結標的是發問那一天與行號」）；`check-operating-runtime.ts`、`check-operating-canvas.ts`
在 tsx 下因 top-level await 無法轉譯，`pnpm ops:check` 因此在第六步中斷。

## 未做與風險

- **尚未部署**；部署前正式站仍會吃掉選擇。
- 沒有替 Owner 補寫那一筆決定：資料庫裡沒有留下選了哪一個，部署後請在那張卡上重選一次。
- 沒有對正式資料庫做真實往返寫入（會寫進正式資料）；保存路徑的證據是離線重現＋伺服器端既有的欄位契約檢查。
- 併回伺服器現況後，下一次 commit 會把 `projects`／`txns` 重寫一次（`author`／`ledgerRow`）。這一輪之後它不再吃掉別的列，
  但那仍是對帳務集合的多餘寫入，也會讓稽核紀錄標成高風險 —— 另開一項處理。

## Next

Owner 部署並在正式站重選那張決策卡；另開：`stampAuthors` 在合併後的多餘寫入、`ops:check` 中斷的兩支腳本。
