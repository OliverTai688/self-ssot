# Agent Loop Evidence Report

## Task

`JAI-S5`：AI 團隊的模型供應者，Claude 與 OpenAI 自由切換（`UI-088`，`RES-039`）。Owner 2026-11-24：「幫我接上 API，我想要接 OpenAI API」「我希望之後可以 OpenAI 或是 Claude 可以自由切換選擇」。

## Source Docs Read

`RES-037`（D1、D3、D4、D5）、`RES-038`、`ARC-028`、`PLN-060` JAI 段、`REF-003` UI-088；程式：`runner.ts`、`attachments.ts`、`tools.ts`、`citations.ts`、`operating-ai.service.ts`、sessions 路由、`journal-ai.source.js`；`openai` SDK 型別（`responses.d.ts`、`ResponseStream`、`ResponseInputItems`）。

## Scope

- 新增：`src/lib/ai/journal-ai/models.ts`（模型目錄、價目、供應者決定）、`convert.ts`（單一存法 ↔ 兩家格式）、`RES-039`、依賴 `openai`。
- 修改：`runner.ts`（OpenAI Responses 迴圈、共用工具執行、Claude 端剝除 OpenAI 項目）、`operating-ai.service.ts`（模型選擇與驗證、沒接上時擋下、用量回傳可選模型、每則答案的模型）、sessions 兩條路由（`model`）、`journal-ai.source.js`／`.css`（模型選單、答案標示、AI 團隊狀態）、生成物、檢查腳本、文件、manifest。
- 沒有 migration（`operating_ai_sessions.model` 早已存在）。未合併、未部署。

## Strategic Review

更真的事：AI 團隊不再綁一家供應者；Owner 可以只設 OpenAI 金鑰就讓 AI 真的回答，也可以兩家都設、每個對話自己挑。歷史存法沒變，所以舊對話直接可換。

## Research / Reference Basis

- OpenAI 官方：[Models](https://developers.openai.com/api/docs/models)、[Pricing](https://developers.openai.com/api/docs/pricing)、[Function calling](https://developers.openai.com/api/docs/guides/function-calling)、[Reasoning](https://developers.openai.com/api/docs/guides/reasoning)、[File inputs](https://developers.openai.com/api/docs/guides/file-inputs.md)、[Streaming](https://developers.openai.com/api/docs/guides/streaming-responses)、[Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching.md)、[Changelog](https://developers.openai.com/api/docs/changelog)。
- 重點：GPT-6 系列的工具呼叫只走 Responses API；`store:false` 時推理項目帶加密內容，有工具呼叫時必須依序送回；GPT-6.2 的頂層 `instructions` 不吃快取 → 系統提示放第一則 developer 訊息；`function_call_output.output` 可為陣列（圖片／檔案）。
- 沒能從文件確認、以 SDK 型別與實測補足：串流事件名稱（`response.output_text.delta`、`response.completed`，SDK `responses.stream().finalResponse()`）、拒答形狀（輸出訊息內容 `type: "refusal"`）。
- 選定與否決見 `RES-039` §5（否決：每家各存一份歷史、換模型＝開新對話、沒接上自動換家、`store:true`／`previous_response_id`、Chat Completions）。

## NANDA / Agent Protocol Alignment

`journal-assistant.agentfacts-lite.json` → 0.5.0：`provider` 改為「依對話選 Claude 或 OpenAI」，列出四個模型、預設規則、`store:false`、不跨家自動 fallback；sourceOfTruth 改 `RES-039`；attestation 加本機假端點證明。能力、權限、工具、可見性不變；仍 `externalRegisterable: false`。送到 OpenAI 的資料範圍與送到 Claude 相同（提問者看得到的、共享對話只有公司資料）。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `pnpm ops:journal-ai:check` | 66/66（新增 M1–M18：供應者決定、預設模型、選單、價目、工具轉換、Claude→OpenAI 轉換順序、tool_use／tool_result 配對、圖片／PDF／文字檔、頁碼引用、OpenAI 輸出解析、經 SDK 正規化重送推理、錯誤結果、換回 Claude 不帶 OpenAI 內容、空訊息、拒答、壓縮摘要） |
| `verify-asset-object`／`verify-object-index`／`verify-obj-refs`／`verify-agenda-object` | 73/73、19/19、44/44、126/126 |
| `tsc`、eslint（AI 相關目錄）、generate、`pnpm build` | 0、0 錯（既有 `triage.ts` 1 警告）、PASS（786）、PASS |
| 本機假端點（`OPENAI_BASE_URL`／`ANTHROPIC_BASE_URL` 指向 scratchpad 的假伺服器，兩家 SDK 真的串流）＋拋棄式 DB | `usage`：兩家都接上、四個模型、預設 Opus；不存在的模型 → 409「沒有這個模型」 |
| 同一個對話換三次 | GPT-6.2 Sol → Claude Opus 5.5 → GPT-6.2 Astra，三則 `done`、工具步驟、引用 `line:2026-11-12:yz:p1` 驗證通過、各自 `modelLabel` |
| 送出的請求（假端點記錄） | OpenAI：`store:false`、`include: reasoning.encrypted_content`、effort medium、7 個 strict 工具、第一項 developer；第二輪依序帶回 `reasoning(ENC-1)`→`function_call`→`function_call_output`；換回 OpenAI 時 Claude 的 `toolu_…` 轉成 function_call、自己先前的推理全部帶回。Claude：訊息只有 text／tool_use／tool_result，不含 `ENC`、`_oa`、`openai_item`，`call_…` id 照常配對 |
| 用量 | Sol US$0.0026、Opus US$0.00872、Astra US$0.0104（依模型價目與快取拆分） |
| 瀏覽器 | AI 模組輸入框下方的選單分 Claude／OpenAI 兩組；畫面上選 Claude Sonnet 5.5 後送出 → 第四則標「Claude Sonnet 5.5」；手機寬度（375）選單不溢出 |

`.claude/launch.json` 暫加設定已還原；dev server、假端點、Postgres 已停止；沒有呼叫真正的模型服務，沒有寫入 R2 或正式 DB。

## Remaining Risks

1. **真 OpenAI 未驗**：沒有 `OPENAI_API_KEY`。假端點驗的是我們這邊（SDK 串流、轉換、存法）；GPT-6.2 對 PDF 的讀取品質、`function_call_output` 陣列實際被接受、引用格式遵守度，要設金鑰後驗（ACC-002 兩個未勾項目）。
2. **OpenAI 沒有 PDF 頁碼引用**：PDF 讀得到，引用落在檔案層級 `⟦asset:…⟧`。
3. **換家會丟掉對方的私人推理**：文字、工具呼叫與結果都在，回答品質應接得上，但前幾輪的思路不會延續。
4. **OpenAI 端沒有長對話壓縮**：1.05M context 足夠目前用量；Claude 壓縮過的對話換到 OpenAI 時只送摘要之後的部分。
5. **Astra 價格是 Opus 的兩倍**：月上限 US$150 共用，選單上已標「最貴」。

## Final Status

`JAI-S5` DONE（分支 `claude/journal-ai`，未合併、未部署、無 migration）。下一步：Owner 在 Vercel 設 `OPENAI_API_KEY`，合併部署後以真模型驗收。
