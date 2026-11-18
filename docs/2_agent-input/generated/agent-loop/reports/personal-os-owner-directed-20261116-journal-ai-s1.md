# Agent Loop Evidence Report

## Task

`JAI-S1` 日誌 AI：多對話、以提問者權限查日誌／物件／檔案、可點的引用（`UI-088` 日誌第四分頁，`RES-037`）。

Owner 2026-11-16 指示：「Use them, start S1」——`RES-037` §9 六題全部照建議（D1–D6），並開始 S1。

## Source Docs Read

`AGENTS.md`、`RES-037`、`RES-036` §6.4（人主動發起才送 AI）、`RES-018`（參考碼）、`ARC-028`（AgentFacts-lite）、`REF-003` UI-088 列、`PLN-060`／`PLN-061`、`ACC-002` 最近兩段、`RPT-007` 開頭、Next.js 16 本機文件 `01-app/02-guides/streaming.md`（Route Handler 串流、Safari 1KB 緩衝）、`03-api-reference/04-functions/after.md`、Claude API skill（TypeScript：streaming manual loop、tool use、fallbacks、caching、refusal）。

## Scope

- 新增：schema 兩表與 migration、`src/lib/ai/journal-ai/*`（corpus／tools／citations 純函式，corpus-loader／runner 伺服器端）、`operating-ai.service.ts`、`operating-ai-route.ts`、四條路由、`journal-ai.source.js`／`.css`、`scripts/check-journal-ai.mts`、AgentFacts-lite manifest。
- 修改：`scripts/generate-yuanzhan-v5.mjs`（加入兩個檔）、生成物 `runtime.js`／`styles.ts`、`package.json`（`@anthropic-ai/sdk`、`ops:journal-ai:check`）、文件（RES-037 §13、PLN-060、PLN-061、RPT-007、ACC-002、MAN-001）。
- 不做：聊天上傳與讀檔（S2）、選取多行問 AI、存成日誌區塊、30 天清除排程（S3）、搜尋衍生表（S4）。
- 未合併、未部署、未碰正式資料庫。工作在 worktree `self-stucture-v1-journal-ai`、分支 `claude/journal-ai`。

## Strategic Review

- 目標：Owner 直接指定的產品能力（日誌 AI），不是 heartbeat 迴圈選題。
- 這一輪之後更真的事：提問者可以在日誌裡開多個對話問任何事，答案的依據點得回原行／原物件，而且 AI 看到的範圍被伺服器限定在提問者自己看得到的資料。
- 不是重複的文件或 readiness 工作：這是 runtime 實作＋拋棄式 DB 證明。

## Research / Reference Basis

- 研究與設計在 `RES-037`（2026-11-05，四回合，分數 72→84）。這一輪沒有新的外部研究；API 形狀以 Claude API skill（2026-11 版）為準：Opus 5.5 不可關 thinking、forced tool_choice 會 400、`fallbacks: "default"` 需 `server-side-fallback-2026-07-01`、歷史只能追加、client tools 開 `eager_input_streaming` 時執行前要自己驗參數。
- 選定：manual streaming loop（要在每次工具後寫回 DB、要能跨執行個體停止，Tool Runner 的 hook 不夠直接）。
- 否決：Tool Runner（同上）；向量檢索（語料小、Anthropic 無 embedding）；只用 API 原生 citations（日誌行與物件不是 document 區塊，已有參考碼系統）；開 web fetch（可被注入當外洩管道）。

## NANDA / Agent Protocol Alignment

- 新的 runtime agent `personal-os:journal-assistant`，**protected-owner visible、internal runtime**，`externalRegisterable: false`。
- Manifest：`docs/2_agent-input/generated/agent-loop/agent-registry/journal-assistant.agentfacts-lite.json`（identity、provider、lifecycle `prototype`、四條 internal endpoints、protocols `internal`、capability 一項、skills 五個工具、auth、trust `READ_ONLY` 與 blockedActions、observability、registry）。
- 刻意不放進 `internal-agent-manifests.agentfacts-lite.json`：那份與 `check-agent-registry.mjs` 只收 ARC-020 的 governance-only agent，放進去會讓驗證失敗。
- 外部註冊、跨組織協作：不在範圍，仍為 `HUMAN_APPROVAL_REQUIRED`。

## Changes

| 區塊 | 內容 |
|---|---|
| 資料 | `operating_ai_sessions`（owner、標題、自動命名、釘選、封存、模型、軟刪除）、`operating_ai_messages`（seq、role、content 原樣、text、pins、citations、sentRefs、steps、status、usage、error）。純新增。 |
| 權限 | 對話：每個查詢帶 `(id, workspaceId, ownerId)`。資料：物件來自 `loadOperatingStore(workspaceId, viewerProfileId)`，日誌另查同一條件（company 或作者本人）。payroll／bank／報帳／收件匣不載入。 |
| 工具 | `search_journal`、`read_journal_day`、`search_objects`、`get_object`、`list_activity`。strict schema、執行前 zod 再驗、單一結果上限 24k 字。 |
| 引用 | `⟦line:day:author:blockId⟧`／`⟦ty:rid⟧`；允許集合＝這個對話任何一輪讀過的＋釘選的；對不上的換 `⟦?⟧`。 |
| 模型 | `client.beta.messages.stream`、Opus 5.5、effort medium、`cache_control` 自動快取、`fallbacks: "default"`、最多 8 次工具迴圈、截斷的 tool_use 不進歷史、refusal 狀態化。 |
| 路由 | sessions GET/POST、[id] PATCH/DELETE、messages GET/POST(SSE)、stop POST。SSE 開頭墊 2KB；`after()` 讓斷線後跑完。 |
| 安全閥 | 同對話同時一則（409）、10 分鐘以上的 streaming 視為中斷、月上限（`JOURNAL_AI_MONTHLY_CAP_USD`，預設 150，429）。 |
| 示範模式 | 無金鑰或 `JOURNAL_AI_PROVIDER=mock`：真的跑工具＋權限＋引用驗證，不呼叫模型。 |
| 畫面 | 日誌第四分頁「問 AI」三欄；物件引用用既有膠囊與 `objPeek`；行引用跳回並閃；`@` 釘選用既有 `or*`；串流只換 `#jaLive`；手機抽屜與 sheet。只用 `svg()` 圖示與 `var(--token, fallback)` 顏色。 |

## Verification

| 指令／動作 | 結果 |
|---|---|
| `pnpm ops:journal-ai:check` | 25/25 PASS（第一次 24/25：C6 測試本身寫錯——那一行確實被搜尋讀過，改測沒讀過的 cite 後通過） |
| `pnpm exec tsc --noEmit` | 0 errors |
| `pnpm exec eslint`（新增檔） | 0 |
| `pnpm db:validate`／`db:generate` | PASS |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS（765 handler templates） |
| `pnpm build`（環境變數指向拋棄式 DB） | PASS |
| 拋棄式 Postgres 16（本機 5546）`pnpm ops:proof:migrate` | 全部 migration 套用成功；`prisma migrate diff` 對新表 0 差異（其他既有索引差異與本輪無關） |
| 種子 | 兩席位 yz／lily，各一份公司與私人日誌、會議紀錄、決策、團隊檔案、lily 私人檔案 |
| yz 問「柏翰的報價怎麼付款？」＋釘選決策 | 讀到自己的私人行與 lily 的公司行；沒有 lily 的私人日誌與私人檔案；7 個引用全部驗證通過 |
| yz 搜 `LILY_SECRET 薪資單` 並直接釘選 lily 私人檔 | 0 筆；DB 內 content 含私人字串的列數 0 |
| lily 對 yz 對話：列表／讀／送／改名／刪除／停止 | 0 筆、404×5；yz 對話標題未變 |
| lily 搜 yz 的私人備忘 | 未洩漏（唯一命中是 lily 自己的私人行） |
| 忙碌、停止、逾時、月上限、空問題 | 409、`stopping`、解鎖並標中斷、429、400 |
| 瀏覽器（lily，1440×900） | 輸入框 Enter 送出、串流、物件膠囊、行引用跳回 11/11 並閃、`@分期` 釘選與送出、右欄列出送出的資料 |
| 瀏覽器（375×812） | 清單抽屜、看過的資料按鈕、無水平捲動；修掉載入中閃現起手問題、縮短 placeholder |

`.claude/launch.json` 驗證時暫時加兩筆設定，結束後已還原；兩個 dev server 已停止。

## Evidence

- 截圖：桌機三欄、手機空狀態（本次工作階段瀏覽器面板）。
- 拋棄式 DB 位於 scratchpad，未入庫。

## Remaining Risks

1. **還沒有用真的模型跑過。** 正式環境沒有 `ANTHROPIC_API_KEY`；示範模式驗了工具、權限、引用、串流與存檔，但模型是否穩定照 `⟦cite⟧` 格式引用、effort medium 的品質與延遲，要在 Owner 設定金鑰後實測（ACC-002 未勾的兩條）。
2. **Vercel 執行時間。** `maxDuration = 300` 需方案支援；不支援時長問題會在中途被切，訊息會在 10 分鐘後被標為中斷。
3. **成本估算是上限估法。** fallback 改由別的模型回答時仍以 Opus 5.5 價格計。月上限依此計算。
4. **每輪載入整份 store。** 與畫面的 store GET 同量級；資料變大時改 S4 的衍生搜尋表。
5. **既有小瑕疵（非本輪引入）**：`@` 選單的候選列對決策會顯示「· undefined」（`orList` 的 `h.ds`），回覆與議題討論同樣如此。

## Final Status

`JAI-S1` DONE（分支 `claude/journal-ai`，未合併、未部署）。下一步：Owner 決定合併與部署、設定 `ANTHROPIC_API_KEY`；之後 `JAI-S2`（聊天上傳、`read_file`、PDF 原生 citations）。
