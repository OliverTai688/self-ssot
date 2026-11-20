# Agent Loop Evidence Report

## Task

`JAI-S4` 與 AI 團隊模組（`UI-088`，`RES-038`）。Owner 2026-11-20：「開始開發 JAI-S4，並且我希望 AI 是左邊的其中一個模組，雖然現在只能問日誌，但之後還有金流、專案會形成公司的 AI team。」

## Source Docs Read

`RES-037`（D1–D6、§13–§15）、`PLN-060` JAI 段、`REF-003` UI-088 列與修訂、`ARC-028`；程式：`runtime.js` 的 `WB`／`renderRail`／`nav`／`render`、`operating-canvas.source.js`（模組插入慣例）、`operating-converge.source.js`（`opRedirect`）、`agenda-object.source.js`（`agCreate`）、既有 `journal-ai.source.js`、`operating-ai.service.ts`。

## Scope

- Owner 四題（AskUserQuestion）：分享後同事可接著問；提案＝議題與任務；搜尋加速表延後；拿掉日誌分頁。
- 新增：`RES-038`、migration `20261120090000_ai_team_share_proposals`、share／proposals 兩條路由。
- 修改：schema、`operating-ai.service.ts`（可見性、分享、每人歷史、提案、助理）、`corpus.ts`／`corpus-loader.ts`（席位、company-only）、`tools.ts`（`propose_item`）、`runner.ts`（提案、系統提示）、sessions 路由（`agent`）、`journal-ai.source.js`／`.css`、生成物、檢查腳本、文件。
- 已部署（2026-11-20，`76ad8f9f3e`；Vercel Production success；正式 DB migration `20261120090000_ai_team_share_proposals` 已套用，`migrate status` up to date；未登入探測 sessions／share／proposals／usage 401、cron 503）。

## Strategic Review

更真的事：AI 有了自己在左側的家，也有放第二、第三位助理的位置（AI 團隊分頁、`agent` 欄位）；對話可以變成公司共用的工作脈絡；AI 能把「要追的事」草擬成真的議題或任務，但仍然要人按。

## Research / Reference Basis

- 本地慣例：模組以 `WB.splice` 插入（同「營運」）、`VIEWS.ai` 註冊；提案建立重用 `agCreate`，產物與手動 `!任務` 相同。
- Claude API 規則：preserved thinking 綁在產生它的對話與帳號、歷史只能追加 → 共享時每個人只原樣重送自己的幾輪，別人的以文字呈現。
- 選定與否決見 `RES-038` §4、§5：否決「工具直接建立」（AI 寫入）、否決提案專案工作（`issues`，留給專案助理）、否決共享後仍使用提問者私人資料（會讓私人資料出現在共享答案裡）。

## NANDA / Agent Protocol Alignment

`journal-assistant.agentfacts-lite.json` → 0.4.0：sourceOfTruth 改 `RES-038`、標示所屬 AI 團隊、endpoints 加 share／proposals、skills 加 `propose_item`、新 capability `draft-agenda-or-task`（`requiresHumanApproval: true`）、auth 加「建立者或已分享」、trust 註明共享對話只用公司資料。仍 `externalRegisterable: false`；外部 agent 加入團隊不在範圍。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `pnpm ops:journal-ai:check` | 48/48（新增 P1–P5 提案） |
| `verify-asset-object`／`verify-object-index`／`verify-obj-refs`／`verify-agenda-object` | 73/73、19/19、44/44、126/126 |
| `tsc`、eslint、generate、`pnpm build` | 0、0、PASS（785）、PASS |
| Migration | 手寫 SQL 與 `prisma migrate diff` 輸出一致；拋棄式 DB 全部套用 |
| 未開放助理 | `agent: cashflow` → 「這位助理還沒開放。」 |
| 提案 | 「建立任務：寄出修正後報價」→ `[('task','寄出修正後報價','yz','pending')]` |
| 分享 | 預覽列出 `line:2026-11-12:yz:p1`（私人日誌）；未確認 → 拒絕；確認 → `shared: true`；稽核「分享給公司（建立者確認過 1 項私人資料）/ medium」 |
| 共享後 | 同一題（私人備忘）引用變成 `[]`：company-only 生效 |
| Lily | 清單只有這個共享對話（`isOwner: false`）；讀得到 6 則；改名／刪除／取消分享／預覽 404；接著問 → 引用 `line:2026-11-11:lily:c1`、`line:2026-11-10:yz:b1`、任務物件，`authorKey: lily`；她的私人行在對話內 0 筆 |
| 每人歷史（匯出 `historyFor` 以臨時腳本印出，腳本已刪） | yz：自己三輪原樣＋「（lily 問）…」；Lily：「（yz 問）…」三輪＋自己原樣 |
| 瀏覽器（yz） | 左側 AI 模組、日誌分頁剩今天／回顧／物件索引；任務卡改負責人 Lily、到期 11/25 →「建立任務」→ 今天日誌誕生任務卡（Lily、11/25、內文含補充）；DB `AGENDA-JRNL-000001-20261120` owner=lily，提案 `accepted rid=… by=yz`；AI 團隊表三列（修正文字溢出） |
| 瀏覽器（Lily） | 「同事分享的」群組、標頭「共享 · 戴宇星 建立」、提問者標示、無分享按鈕、已建立任務可見、右欄說明共享規則 |

`.claude/launch.json` 暫加設定已還原；dev server 與 Postgres 已停止；未寫入 R2。

## Remaining Risks

1. **真模型未驗**：提案的欄位品質、共享歷史中「別人問的只有文字」對回答品質的影響，都要等 `ANTHROPIC_API_KEY`。
2. **建立者分享前確認的是「用過的私人資料」**，答案文字本身可能已經引述那些內容；取消分享後同事就看不到，但他們已經看過。
3. **建立任務會跳到日誌**：人按「建立」後畫面切到今天的日誌（與手動建立一致），要回 AI 模組需再點左側。
4. **AI 團隊表的「讀得到／會做的事」是畫面上的說明文字**，金流、專案助理實作時要與實際工具同步。
5. Migration 會在合併部署時由 Vercel 的 `migrate deploy` 套用（純新增欄位，有預設值）。

## Final Status

`JAI-S4` DONE，已部署（2026-11-20，`76ad8f9f3e`；Vercel Production success；正式 DB migration `20261120090000_ai_team_share_proposals` 已套用，`migrate status` up to date；未登入探測 sessions／share／proposals／usage 401、cron 503）。下一步：Owner 設定 `ANTHROPIC_API_KEY` 以真模型驗收提案；之後的金流助理需先決定可讀帳本（RES-038 §7）。
