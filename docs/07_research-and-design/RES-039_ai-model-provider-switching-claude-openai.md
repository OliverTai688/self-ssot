# RES-039 AI 團隊的模型供應者：Claude 與 OpenAI 自由切換（JAI-S5）

- 日期：2026-11-24
- 觸發：Owner：「幫我接上 API，我想要接 OpenAI API」→「我希望之後可以 OpenAI 或是 Claude 可以自由切換選擇」
- 畫面：`UI-088` 圓展營運工作台 · AI 模組（輸入框下方的模型選單）
- 前置：[`RES-037`](RES-037_journal-ai-assistant-multi-session-research.md)（D1 原本只用 Claude）、[`RES-038`](RES-038_ai-team-module-sharing-and-proposals.md)
- 狀態：已實作並部署（2026-11-24，`1801cdae30`；見 §8）

---

## 1. 一句話

伺服器可以同時接上 Claude 與 OpenAI。每個對話自己選模型，建立者隨時可以換，下一則起生效；同一個對話可以前一則用 GPT、下一則用 Claude，歷史接得上，每一則答案標出是哪個模型回答的。D1「只用 Claude」改為「Claude 與 OpenAI 都可用，由人選」。

---

## 2. 外部依據（2026-11-24 查證）

| 項目 | 依據 | 採用 |
|---|---|---|
| 模型 | [Models](https://developers.openai.com/api/docs/models)：GPT-6.2 Astra（旗艦）、GPT-6.2 Sol（均衡）；1.05M context、128K 輸出、函式工具、圖片 | 選單放 Astra 與 Sol；只接上 OpenAI 時預設 **Sol**（價格與 Opus 5.5 同級以下，月上限 US$150 守得住） |
| 價格 | [Pricing](https://developers.openai.com/api/docs/pricing)：Astra $8／$0.40（快取）／$40；Sol $2／$0.10／$10；快取寫入 1.25× | 進 `models.ts` 價目表；用量依 `usage.input_tokens_details.cached_tokens`／`cache_write_tokens` 拆開計價 |
| API | [Function calling](https://developers.openai.com/api/docs/guides/function-calling)：GPT-6 系列的工具呼叫只能走 **Responses API** | 用 `client.responses.stream`（`openai` SDK 7.x） |
| 推理延續 | [Reasoning](https://developers.openai.com/api/docs/guides/reasoning)：`store:false` 時推理項目帶 `encrypted_content`；有工具呼叫時推理項目**必須**連同 function_call 一起送回、順序不變 | 推理項目原樣存進我們的資料庫、原樣送回；不在 OpenAI 留存對話 |
| 檔案 | [File inputs](https://developers.openai.com/api/docs/guides/file-inputs.md)：`input_file`（`filename`＋`file_data` data URL）、`input_image`（`image_url` data URL）；`function_call_output.output` 可為陣列 | 附件（D4 每次 base64）照舊；工具讀到的檔案以陣列回傳 |
| 系統提示 | [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching.md)：GPT-6.2 起頂層 `instructions` 每次以未快取價計 | 系統提示放在 input 第一則 `developer` 訊息，吃得到自動快取 |
| 工具 schema | strict：全部欄位 required、`additionalProperties:false`、可空用型別陣列 | 既有 Claude strict schema 原樣可用，不需第二份 |

---

## 3. 架構：一種存法、兩家都送得出去

```
資料庫（operating_ai_messages.content）＝ Claude Messages 的形狀（S1 起就是，舊對話不用搬）
   │
   ├─ 送 Claude：toAnthropicMessages() 拿掉 OpenAI 專屬的東西
   └─ 送 OpenAI：toOpenAIInput()      thinking 拿掉、tool_use→function_call、tool_result→function_call_output、
                                       image→input_image、PDF→input_file、文字檔→input_text、compaction→摘要文字
OpenAI 的回答 → fromOpenAIOutput() → 同一種形狀＋原始項目：
   推理項目          { type:"openai_item", item }（含加密內容）
   訊息／工具呼叫    text／tool_use 上的 `_oa`＝原始項目，送回 OpenAI 時經 SDK `toResponseInputItem` 正規化後重送
```

- 兩家的工具呼叫 id（`toolu_…`、`call_…`）都只有英數、底線、連字號，互相當 id 用都合法，所以換家後 tool_use／tool_result 仍然配對。
- 換家時「對方的私人推理」不送：OpenAI 讀不了 Claude 的 thinking，Claude 讀不了 OpenAI 的加密推理。看得到的文字、工具呼叫與結果都在。
- 每人各自的歷史（RES-038 §4 `historyFor`）不變：轉換發生在送出那一刻，在 `hydrate`（檔案記號換成內容、重新查權限）之後。

**供應者的決定**（`models.ts` `resolveRunProvider`）

| 伺服器的金鑰 | 這個對話的模型 | 這一輪 |
|---|---|---|
| 一家都沒有（或 `JOURNAL_AI_PROVIDER=mock`） | 任何 | 示範模式（mock，不花錢） |
| 有那一家 | 那一家的模型 | 那一家 |
| 沒有那一家 | 那一家的模型 | **擋下**：「X 目前沒有接上，請在上方換一個模型」（不偷偷改用別家） |

新對話的預設模型：`JOURNAL_AI_MODEL`（那一家要接上）→ Claude Opus 5.5 → GPT-6.2 Sol。

---

## 4. 畫面

- 輸入框下方那一列（@ 引用、檔案旁邊）多一個模型選單，依 Claude／OpenAI 分組，只列伺服器接上的模型。
- 新對話：選了就用在建立的那一刻。既有對話：建立者換了，下一則起生效，跳出「下一則起改用 …」。
- 共享對話的同事：看得到用的是哪個模型，不能換（與改名、分享同一條權限）。
- 每一則答案的「複製」旁標出回答的模型；示範模式仍顯示「示範模式」。
- 一家都沒接上：選單位置顯示「示範模式」。
- AI 團隊分頁的狀態寫成「運作中（Claude、OpenAI）」。

---

## 5. 選定與否決

- **選定**：單一存法＋送出時轉換。舊對話不搬資料、沒有 migration；中途換家接得上；驗收腳本可以直接測轉換。
- 否決「每家各存一份歷史」：換家就斷，而且兩份要同步。
- 否決「換模型＝開新對話」：Owner 要的是「自由切換」。
- 否決「沒接上就自動改用另一家」：使用者以為在用 A 其實在用 B，花費與資料流向都不對。
- 否決用 OpenAI 的伺服器端對話狀態（`store:true`、`previous_response_id`）：對話內容會留在 OpenAI；D3、D6（我們刪除、30 天清除）就管不到那一份。
- 否決 Chat Completions：GPT-6 系列的工具呼叫只能走 Responses API。
- 暫不做：OpenAI 的 PDF 頁碼引用（沒有對應 Claude `page_location` 的原生引用；PDF 仍可讀，引用落在 `⟦asset:…⟧` 檔案層級）；OpenAI 端的長對話壓縮（1.05M context，先不需要）。

---

## 6. 資料與隱私

- 送到 OpenAI 的內容與送到 Claude 的相同：只有提問者看得到的語料（共享對話只有公司資料）、提問者看得到的附件。
- `store:false`：OpenAI 不保存對話狀態；推理以加密內容存在我們的資料庫，隨對話刪除與 30 天清除一起消失。
- 金鑰只在伺服器環境變數（`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`），畫面與 API 只回傳「接上了哪幾家」。
- 稽核列（`operating_command_logs`）的 detail 已帶模型名稱；用量的 `usage.provider` 記是哪一家。

---

## 7. 停止條件

- 任何讓外部 agent 讀我們資料、或把對話留在供應者那邊（`store:true`）的需求 → 回 Owner。
- 第三家供應者：沿用同一個轉換層（新增一組 `toXInput`／`fromXOutput`），不改存法。

---

## 8. 驗收

見 `ACC-002`「Claude／OpenAI 切換（JAI-S5）」一節；機檢 `pnpm ops:journal-ai:check` M1–M18。
