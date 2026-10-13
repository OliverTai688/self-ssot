# Agent Loop Evidence Report

## Task

- Task ID: `LINESIG-UI`
- Title: 訊號頁介面先行 —— 兩層訊號、潛在訊號分流、對話分析工作區、來源與推播
- Date: 2026-10-13
- Agent: Claude（Owner-directed，`UI-088` Revision Mode；Owner 指示「提案三版本 HTML、AI 選定然後實作」）

## Source Docs Read

- `AGENTS.md`（§5 模組需求缺口、§6 BFF、§7 需求理解分數、§11 高風險、§12／§12.1、§15 產品頁不放規則手冊）
- `RES-036`、`AUT-010`、`RES-033` §5、`PLN-060` LINESIG 區段、`REF-003` UI-088
- 上一輪報告：`personal-os-owner-directed-20261012-signal-line-two-tier-research.md`、`…20261009-single-project-status-crud.md`、`…20261009-journal-doing-sticker.md`
- 程式：`runtime.js`（`buildSignals`、`VIEWS.signal`、`commit`、`nid`）、`replies.source.js`（`rqBoard`、`rqLate`、`rqBlockers`、徽章）、`pm-status.source.js`（行內新增任務的列形狀）、`extensions.source.js`（`objectComments`）、`operating-commands.ts`（`identifyRow`、`WRITE_ENABLED_COLLECTIONS`）、`operating-commands.service.ts`（`applyIssue`、`applyComment`）、`scripts/generate-yuanzhan-v5.mjs`、`scripts/check-project-module-ui.mts`

## Scope

- In scope：訊號頁四個分頁的介面；確定訊號的來源標記與篩選；潛在訊號的四個分流動作；對話分析工作區的前三關；本機規則判讀；LINE 尚未開通的狀態呈現。
- Out of scope：webhook、LINE 身分與群組綁定、推播、任何 migration、AI 送出、設定頁的「我的 LINE」、專案設定的群組清單、專案聊天室的 LINE 頻道。全部在 `AUT-010` 核准之後。

## Strategic Review

- 上一輪是研究與契約（無程式）。Owner 明說介面沒有動。這一輪必須是看得到的介面與可執行的行為，不能再是文件。
- 卡點 `LINESIG-S0`（Owner 核准 `AUT-010`、開通 channel）沒有解除，也不該由這一輪繞過。所以範圍限定在不需要伺服器、schema、對外連線的部分。
- 這一輪之後多出來的能力：把一段 LINE 對話貼進來，就能找出沒人回的提問、說出口的期限與對方傳來的檔案，並變成任務；也能在送出前看到去識別化後的每一個字。

## Research / Reference Basis

- 需求理解 86（High）→ 三輪，全文在 `RES-036` §13。
- 三版提案與選定：`docs/2_agent-input/generated/signal-proposals/round1-signal-inbox/index.html`。
- 本輪沒有新的外部來源；LINE 平台事實沿用 `RES-036` §12。
- 選定：單頁往下接、卡片就地展開、一頁四關並排、開通步驟清單。
- 捨棄：三欄收件匣、子分頁、一次一張、表格批次、精靈、行內切換、四張卡片、停用的表單。理由在提案頁與 `RES-036` §13.1。

## Findings

1. 請求表的發問者必須是站內成員，所以「採納成回覆追蹤卡、以 LINE 訊息時間起算」在沒有 schema 變更下做不到。改為採納成任務。
2. 日誌的寫入有草稿與基準線比對，從別的模組程式化插入一行風險高。因此也沒有採納成今日議題。
3. 「？」不一定在句尾：客戶常常問完接著講匯款資訊。規則一開始只認句尾問號，示範對話裡最重要的一則因此沒被抓到。已改，並補一條測試。
4. 確認時若還有疑似人名沒處理，等於把規則唯一說得出「我不確定」的地方略過。改為必須逐一決定才可確認。
5. `ops:reply-jump:check`（21/22）與 `ops:journal-space:check`（8/9）各有一條既有失敗，在未含本輪改動的主 checkout 上相同。

## Implementation

| 檔案 | 變更 |
|---|---|
| `src/components/yuanzhan/v5/signal-inbox.source.js`（新） | 分頁改名；`SG` 分頁記憶體；`sgLine()` 連線狀態單一出處；確定訊號列與篩選；潛在訊號卡與四個動作；採納／併入走 `commit()`；對話讀入、區間、發話者歸邊、字典；並排檢視；疑似人名；確認指紋；本機規則判讀；分析紀錄；來源與推播 |
| `src/components/yuanzhan/v5/signal-inbox.css`（新） | 全部走 token，`var(--x, fallback)`；760px 以下並排改堆疊 |
| `src/lib/ui-data/yuanzhan/conversation-deid.ts`（上一輪寫好、本輪納入） | 規則去識別化、指紋、洩漏檢查、日期切片、LINE 匯出檔解析 |
| `src/lib/ui-data/yuanzhan/conversation-signals.ts`（新） | `detectCandidates`、`resolveDeadline`：提問未回、承諾與期限、交付物 |
| `scripts/generate-yuanzhan-v5.mjs` | 匯入兩個純函式模組；`signal-inbox` 加進 extension 與 CSS 清單 |
| `src/components/yuanzhan/v5/runtime.js`、`styles.ts` | 重新生成（712 handler templates） |
| `scripts/check-signal-inbox.mts`、`scripts/check-conversation-signals.mts`（新）、`scripts/verify-conversation-deid.mjs` | 機檢；`package.json` 新增 `ops:signal:check` |

沒有動：`src/app`、`src/lib/services`、`prisma/`、環境變數。沒有新增 API route。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `node scripts/generate-yuanzhan-v5.mjs`、`node --check runtime.js` | 712 handler templates；通過 |
| `pnpm exec tsc --noEmit --pretty false` | exit 0 |
| `pnpm ops:signal:check` | 畫面 **73/73**、規則判讀 **30/30**、去識別化 **40/40** |
| `pnpm project:ui:check` | 122/122 |
| `ops:commands:check`／`ops:fields:check`／`ops:persistence:check` | 42 PASS／364 PASS／通過 |
| day-state／decision-reply／audit-trail／cashflow／contract／stickers／agenda-page／links | 34/34／36/36／33/33／72/72／48/48／50/50／21/21／24/24 |
| `pnpm ui:yuanzhan:check` | PASS |
| `pnpm build`（資料庫變數指向本機不存在的測試庫，避免碰正式庫） | exit 0 |
| Playwright · showcase 預覽 · 1440px | 四個分頁、採納展開、載入示範對話、決定疑似人名、確認；無頁面錯誤；無元素超出視窗 |
| 同上 · 375px | 並排改上下堆疊；`scrollWidth` 375 |
| 同上 · 淺色主題 | 版面相同，顏色跟著主題 |
| Playwright · 選 `.txt` 檔 | 讀入、標題與列數正確 |
| Playwright · 在原文欄選取「阿豪」 | 帶進補遮蔽欄；按遮蔽後送出版本為 `〔人名1〕` |
| 新檔案的色碼與 emoji 掃描 | 色碼只出現在 `var()` 的 fallback；沒有 emoji |

`check-signal-inbox.mts` 驗的負向情境（對應 `AUT-010` §11 的 S3a／S3b 中不需要伺服器的部分）：
潛在訊號分流前後徽章不變、逾期區沒有潛在訊號；忽略與全部忽略沒選原因不會消失；
確認後還原一處或排除一則 → 要重新確認，改回原樣確認回來；疑似人名未決定不能確認；
超過 500 則擋下；沒有送出按鈕；database 模式下貼上、判讀、確認的送出次數為 0，
沒被採納的句子不出現在任何一次送出的內容裡。

未驗證：

- 沒有在真實資料庫上做採納的來回。伺服器程式未變；採納送出的是既有的 `issues` 與 `objectComments` 兩種列，形狀以攔截命令核對，欄位由 `ops:fields:check` 對 schema 核對。
- 沒有在正式站上操作。
- `check-operating-runtime.ts`、`check-operating-canvas.ts` 在 Node 24 無法執行（`PROJMOD-007`，既有）。

## NANDA Alignment

不適用。這一輪沒有新增、啟用或對外暴露任何 agent 能力：規則判讀與去識別化是本機純函式，AI 送出是關著的。對話分析 agent 的 manifest 仍依 `AUT-010` §10 留待 `LINESIG-S3b`，`externalRegisterable` 維持 `false`。

## Risks

- 潛在訊號、處理紀錄、分析紀錄、補上的遮蔽詞只在分頁記憶體。使用者分流到一半重新整理會全部不見；畫面在潛在訊號區與分析紀錄都寫了「只留在這個分頁」。
- 採納後，LINE 原話（可能含電話、姓名）會寫進任務留言並保存。這是使用者的主動行為，與自己把那句話打進留言相同，但它不經過去識別化。
- 規則判讀會漏（沒有問號也沒有疑問詞的請求）也會多抓（客套問句）。信心標示與「忽略：判讀錯誤」是目前的出口。
- 字典會自動把所有專案名與客戶名當成遮蔽詞；專案名很短或很常見時會過度遮蔽，可逐處點擊還原。
- 部署瞬間仍開著舊分頁的人看到的是舊分頁名稱，重新整理後正常。

## Next Decision

Owner 於正式站驗收訊號頁。`LINESIG-S0` 不變：核准 `AUT-010`、揭露文字、保留期限，並在 LINE Developers 開通 channel；之後才是 `LINESIG-S1`。
不需要等 Owner 的候選：總表列上直接改狀態（`RES-035` 的後續）、`PROJIMP-B` 檔案搬遷。
