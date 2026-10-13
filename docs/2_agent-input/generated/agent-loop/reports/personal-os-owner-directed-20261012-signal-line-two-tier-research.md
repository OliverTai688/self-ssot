# Agent Loop Evidence Report

## Task

- Task ID: LINESIG-S0（研究與契約；Owner 直接指示）
- Title: 訊號工作台 LINE 整合 —— 管道、綁定、兩層訊號、對話分析邊界
- Date: 2026-10-12
- Agent: Claude

## Source Docs Read

- `AGENTS.md`
- `docs/07_research-and-design/RES-033_project-workspace-five-resource-integration-research.md`（§5、OD-H）
- `docs/05_execution-plans/PLN-024_messaging-source-adapter-contract.md`
- `docs/02_architecture-and-rules/AUT-009_yuanzhan-email-otp-account-boundary.md`（格式）
- `docs/02_architecture-and-rules/ARC-028_nanda-agent-protocol-alignment.md`（§4、§5）
- `docs/05_execution-plans/PLN-060_task-backlog.md`、`PLN-061_current-sprint.md`

## Scope

- In scope: 訊號頁提案；Telegram／LINE 管道決策；LINE 成員與群組綁定流程；確定訊號與潛在訊號的處理；Owner 六項決定的落地；授權邊界文件；待辦列。
- Out of scope: 任何程式、schema、migration、環境變數、LINE 後台設定、對外發話。

## Strategic Review

- 觸發：Owner 以訊號頁截圖直接指示，非排程 loop。
- 被推動的項目：RES-033 OD-H（LINE 導入授權）由待決轉為已授權；訊號頁的推播由預覽卡轉為有實作路徑。
- 這一輪之後更為真的事：管道、綁定方式、群組對應、AI 分析的四道關卡都有 Owner 決定與書面邊界；S1 只差 `AUT-010` 核准與 channel 開通。
- 重複性檢查：本輪是研究與契約。下一輪必須是 S1 的 runtime 實作，或（S0 未過時）S3b 去識別化純函式與黃金檔測試，不再產文件。

## Research / Reference Basis

- Local code: `src/components/yuanzhan/v5/runtime.js`（`buildSignals`、`VIEWS.signal`）、`replies.source.js`、`notifications.source.js`、`pm-chat.source.js`、`pm-overview.source.js`、`prisma/schema.prisma`（`ProjectChatChannel`、`ProjectChatMessage`、`SourceProvider`）、`src/app/api`（確認無 Telegram／LINE route）。
- External（官方）:
  - https://developers.line.biz/en/docs/messaging-api/group-chats/
  - https://developers.line.biz/en/docs/messaging-api/receiving-messages/
  - https://developers.line.biz/en/docs/messaging-api/linking-accounts/
  - https://developers.line.biz/en/docs/messaging-api/getting-user-ids/
  - https://developers.line.biz/en/tips/2026/04/09/user-id-linking/
  - https://developers.line.biz/en/docs/messaging-api/pricing/
  - https://tw.linebiz.com/column/LINEOA-2026-Price-Plan/
  - https://tw.linebiz.com/faq/oa-price/message-price-list/
- Page requirement understanding score: 初次提案 72（中）；Owner 回覆六題後 88（高）。
  - Actor／job 18、PRD／本機證據 17、資料／BFF 16、互動與參考樣式 13、風險與邊界 14、驗收 10。
- 研究輪次與視角：① 本機程式與 schema 現況 ② LINE 平台限制與計費（官方文件）③ 資料與授權邊界（未認領不存內文、伺服器重組送出內容）④ 風險與對外輸出（揭露、推播內容、提示注入）⑤ 驗收拆分（`AUT-010` §11 各段負向測試）。

## Selected Pattern / Rejected Alternatives

- 採用：LINE 單一管道；代碼＋網站確認的成員綁定；網站認領群組；一專案多群、一群一專案；潛在訊號須人採納才生效；AI 分析為人選取 → 規則去識別化 → 人確認 → 伺服器重組送出。
- 捨棄：Telegram 推播＋LINE 只收；push 進群組；群內指令為主流程；一群多專案；LINE 訊息直接成為確定訊號；自動或排程 AI 分析；以外部 AI 做去識別化；採用瀏覽器上傳的確認稿。理由見 `RES-036` §10。

## Correction Made This Loop

初版 `RES-036` 寫「綁定揭露用 replyToken 發」。認領發生在網站，當下沒有可用的 replyToken，該寫法不可實作。已改為一次性 push（成本＝群人數），並在 `RES-036` §5.3 與 `AUT-010` §5 註明。

## NANDA Alignment

- 新增一個內部 runtime 能力 `ConversationSignalAnalyst`；`externalRegisterable: false`。
- 產出：`AUT-010` §10 的 AgentFacts-lite 草案與信任邊界（S3b 實作時寫入 manifest 並跑驗證腳本）。
- 未採用 MCP／A2A 對外暴露，也不給模型任何工具。

## Artifacts

- 新增 `docs/07_research-and-design/RES-036_signal-inbox-line-binding-and-two-tier-signal-research.md`
- 新增 `docs/02_architecture-and-rules/AUT-010_line-webhook-identity-group-and-conversation-analysis-boundary.md`
- 更新 `PLN-060`（LINESIG-S0..S4）、`PLN-061`、`tasks.md`、`RPT-007`、`MAN-001`、`RES-033`（OD-H 註記）

## Verification

- 無程式或 schema 變更，未執行 `tsc`／`build`／`db:*`。
- 文件內的本機事實均由讀檔確認；LINE 行為以官方頁面為據。

## Unverified / Risks

- replyToken 的確切有效時間、群組事件何時不帶 `source.userId`、群組成員個人資料 API 對未加好友者是否可用 —— 三點未取得官方明文，設計已按最保守情況處理，實作前須再確認。
- 規則式去識別化抓不到字典外的名字；人工確認是唯一的補救，介面不得宣稱完全去識別化。
- 推播額度（輕用量 200 則／月）對兩人足夠，成員數或群組揭露次數增加後需重估。

## Next Decision

- Owner：核准 `AUT-010`（含揭露文字、保留期限）、開通 LINE channel、S3b 前指定模型供應商。
- 核准後：`LINESIG-S1`。未核准期間可做：`LINESIG-S3b` 的去識別化純函式與黃金檔測試（不需 LINE 連線、不需 migration）。
