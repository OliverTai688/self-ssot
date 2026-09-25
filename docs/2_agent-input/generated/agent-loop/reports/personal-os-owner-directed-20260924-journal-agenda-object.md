# Agent Loop Evidence Report

## Task

`YZUI-020` — 今日議題升格為第一級物件（提案 B）。Owner 直接指定：「直接採用提案 B，icon 用 lucide-icon，開始實作」。

Owner 原始回報：今日議題「只能標注和完成」「只能單行，不能多行選取變成今日議題」「應該要是有日期」「該議題應該要能展開對話討論上傳文件」。
前一步已產出研究與三案介面提案 `journal-today-agenda-proposals.html`（repo root），Owner 從中選定 B。

UI-088 Revision Mode（`REF-003:202`），Owner 直接指定範圍，未新增 UI ID。

## Source Docs Read

- `AGENTS.md`（§5 迴圈、§7 研究閘、§12.1 lucide／theme token／生成檔規則、§13 驗證、§14 文件更新）
- `docs/05_execution-plans/PLN-060_task-backlog.md`、`PLN-061_current-sprint.md`、`docs/06_audits-and-reports/RPT-007_completed-log.md`
- `claude/today-agenda-proposals.md`（本輪的前置研究）、`claude/object-index-implementation.md`（同類改動的前例）
- 程式碼：`replies.source.js`（今日議題現況）、`template-objects.source.js`（文件物件容器）、`object-index.source.js`（索引與 facet）、`extensions.source.js`（`uploadFile`）、`operating-commands.ts`（保存契約）、`operating-store.service.ts`／`operating-commands.service.ts`（讀回／寫入映射）、`company-theme.ts`（V5_PALETTES token）

## Scope

把「今日議題」從一行上的旗標，升格成走既有物件體系的 `agenda` 型文件物件（L2），同時保留原本的輕量標記（L1）。
不做非連續多行選取（需要在凍結原型的 `.doc` 引擎裡加多選，風險與範圍都超過本輪）。

## Strategic Review

- 目前主要目標：Owner 指定的日誌操作面成熟度（UI-088 Revision Mode）。
- 前三輪：YZUI-016（右欄持久化）、YZUI-019（真實日期）、YZUI-012（物件索引）。都是日誌面的實作，非文件工作，未觸發 Anti-Repetition Rule。
- 本輪推動的是產品能力 delta：今日議題第一次有到期日、討論、附件、結案結構與參考碼。
- 之後更真：今日議題不再是系統裡唯一沒被物件化的標記。

## Research / Reference Basis

七份外部來源，完整比較表在 `journal-today-agenda-proposals.html`。決定實作形狀的四條：

| 來源 | 查到什麼 | 採用的結論 |
|---|---|---|
| [Fellow：Action items v. Talking points v. Bullets](https://help.fellow.ai/en/articles/4105406-action-items-v-talking-points-v-bullets) | talking point 可指派、未完成可帶到下次，但**明確不支援到期日**；action item 才有 | 議題的到期日是**選填**，「帶到明天」是內建行為不是例外處理 |
| [Tana：Supertags](https://outliner.tana.inc/learn/features/supertags) | 「turn a node into a typed object with a template of fields」 | 本系統的召喚＋物件索引就是同一招；議題物件化是補一致性，不是發明新機制 |
| [GitHub：Adding sub-issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues) | 清單項目升格成完整 issue 是**明確動作**，不是自動 | 保留 L1／L2 兩層，`!今天` 不變，升格要按 |
| [37signals：Attach files and post comments on to-dos](https://signalvnoise.com/posts/1230-big-new-basecamp-feature-attach-files-and-post-comments-on-to-dos-and-milestones) | 討論從 messages 搬進 to-do 本身；並開放深連結到單一 to-do | 討論與附件掛在議題上，而不是另外發一個請求；議題要有自己的參考碼 |

其餘三份（Fellow Comments、Notion Comments、Linear Create issues）決定了收合時只顯示計數、以及多行手勢的方向。

**選定的實作形狀：`agenda` 作為 `DOC_METAS` 的一個型別，議題專屬狀態收在 `doc.agenda` 一個物件裡。**

**被否決的替代方案**

1. *把欄位長在 `todayIssues` 上*。否決：`todayIssues` 在 Prisma 是型別化欄位（`blockId`／`text`／`onDate`／`flaggedAt`／`doneAt`／`deferred`），多一個到期日或討論串就要改 schema 與遷移——AGENTS.md §9 列為需人工審查的高風險。`docObjects` 有 `payload` JSON 欄位，同樣的資料塞進去零遷移。
2. *新開一個 `DB.agendas` 集合與新的 `ty`*。否決：要同步改 `objHtml`／`objJump`／物件索引／參考碼四處凍結原型分支，而這四處對 `doc_object` 都已經寫好了。
3. *沿用 `DB.threads` 當討論串*。否決：Thread 的家在專案（`t.p === p.id`），掛在日誌議題上會讓 Thread 的既有信號（「有結論未回寫」）對不上。改為在議題 payload 內放同形狀的 `msgs`，附件仍走 `uploadFile()` 的既有管線。
4. *非連續多行選取*。延後為 `YZUI-021`：預設吃「節點＋子樹」已覆蓋 Owner 截圖上的情境，多選要動凍結原型的區塊引擎。

## NANDA / Agent Protocol Alignment

不適用。本輪沒有建立、修改、路由、評估、揭露或註冊任何 AI agent 能力，也沒有新增 endpoint 或外部可見面。

## Changes

**新增**

- `src/components/yuanzhan/v5/agenda-object.source.js` — 型別註冊（`DOC_METAS.agenda`／`TPL.agenda`／`SUMMON`）、節點＋子樹擷取、到期日／延期／結案、討論與附件、議題卡與議題頁、右欄兩層合併、收工檢查列、命令面板。
- `src/components/yuanzhan/v5/agenda-object.css` — 全走 V5_PALETTES token，無 `var()` fallback 以外的硬編碼色。
- `scripts/verify-agenda-object.mjs` — 無瀏覽器的驗收 harness（50 條）。
- `journal-today-agenda-proposals.html`（repo root）— 研究與三案介面提案。

**修改**

- `replies.source.js`（10 處窄修改）：`!議題` 進 flag 選單與觸發詞；`applySummon` 的 flag 分支分流；右欄今日議題改列兩層；收工檢查納入議題物件並在確認時一起帶到明天；新增 `rqTodayBlock`／`rqTodayText`。
- `source-patches.mjs`（1 筆 `rep`）：圖示表 `I` 補 `flag`／`paperclip`／`send`／`grip`，全部用 lucide 同名字形。
- `scripts/generate-yuanzhan-v5.mjs`：`EXTENSIONS` 併入 `agenda-object`（置於 `template-objects` 之後，才拿得到 `DOC_METAS`／`metaOf`／`ensureSecBlocks`／`renderDocObjectCard`）；styles 併入 `agenda-object.css`。
- `operating-store.service.ts`／`operating-commands.service.ts`：`payload.agenda` 原樣讀回與寫入（各 1 處）。
- 重新產生 `runtime.js`／`styles.ts`／`v5-seed.js`（未手改生成檔）。

**順帶修掉的兩個既有缺陷**

1. 右欄議題文字用的是標記當下的 `t.text` 快照，改寫那一行之後右欄仍顯示舊句子且無提示 → 改讀日誌那一行，原行真的被刪掉才退回快照。
2. `svg()` 對未知 key 靜默畫空 `<svg>`；`flag`（工作項目卡的優先級）與 `grip`（區塊拖曳把手）早就被 runtime 引用卻一直不在 `I` 表裡 → 一併補上。

## Verification

| 檢查 | 結果 |
|---|---|
| `node scripts/verify-agenda-object.mjs` | **50/50 PASS** |
| `node scripts/verify-object-index.mjs` | 19/19 PASS（無回歸） |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS（387 handler templates，前一輪 363） |
| `node --check src/components/yuanzhan/v5/runtime.js` | PASS |
| `npx tsc --noEmit --pretty false` | 0 errors |
| `npx eslint`（新增與修改的 6 支檔案） | 0 errors、31 warnings（皆為既有的 unused-vars 類） |
| `npx eslint src/components/yuanzhan/v5/runtime.js` | 0 errors、781 warnings（基準 739，+42 同既有樣式） |
| `node scripts/check-prisma-structure.mjs` | PASS（models=67 enums=58；本輪無 schema 變更） |
| `node scripts/check-operating-command-fields.mjs` | 279 checks PASS |
| `node scripts/check-migration-coverage.mjs` | 67 tables／58 enums 全由 migration 建立 |
| `agenda-object.css` 硬編碼色掃描 | 無（harness S4） |
| emoji／手寫 `<svg>` 掃描 | 無（harness S5） |

harness 實際斷言的內容（逐條對應驗收清單）：型別註冊讓物件索引 facet 與 `#` 選單自動拿到議題／`!議題` 吃母行＋三個縮排子項並重算縮排／日誌那四行換成一張卡加一個空行、下一行不受影響／空白行不建立議題／提出日與到期日分開且到期日預設未排期／到期標籤分得出今天明天逾期未排期／延期把今天記進 `carried` 而提出日不被覆寫／到期日排到未來就不算今日議題／空白討論不送出、討論帶作者與時間、送出後草稿清掉／附件沿用既有上傳管線／討論串圖示全走 `svg()` 沒有 emoji／沒寫結論不給結案並把人帶去議題頁、有結論才結案、可重新開啟／L1 升格帶上提出日與帶過次數且 L1 同時收掉、來源行不在時明說、別人的議題不能升格／右欄 L2 在前 L1 在後、L1 卡有升格鈕、空狀態同時說明兩種寫法／收工清單列出議題並在確認時一起延到明天且記下帶過次數／議題走自己的卡片與抽屜分支而一般文件物件不受影響／命令面板保留既有項目。

### Manual Blocker Fallback

- `pnpm ops:check` 裡的四支 `tsx` 檢查（spine／commands／runtime／journal-day-state／canvas）在本輪的執行環境跑不起來：`node_modules` 是 Owner 的 macOS（darwin-arm64）安裝，而本輪的 shell 是 linux-arm64 VM，esbuild 的原生檔對不上（`@esbuild/darwin-arm64` present, needs `@esbuild/linux-arm64`）。這是環境不匹配，不是程式問題；Owner 在自己的終端機執行會正常。
  採取的替代：純 `.mjs` 的三支結構檢查全部執行並通過，型別面由 `tsc --noEmit` 0 errors 覆蓋（本輪改動的兩支 service 都在其中），行為面由本輪新增的 50 條 harness 覆蓋。
- `scripts/verify-yuanzhan-v5.cjs` NOT_RUN — 需要 playwright 與兩個本機 dev server（3011／3012）。

## Evidence

- `journal-today-agenda-proposals.html` — 研究、三案與比較。
- `scripts/verify-agenda-object.mjs` — 可重跑的 50 條驗收。
- 本報告的 Verification 表。

## Remaining Risks

- **未經真瀏覽器驗收。** 到期日的 `<input type="date">` 在 Shadow DOM 內的行為、議題卡展開時的版面、四主題（white／orange／black／brand）下的對比、390px 手機寬度，都需要 Owner 在本機確認。在那之前本頁不宣稱驗證完成。
- **升格會改寫日誌。** 母行與子樹會被移進物件內文，日誌那幾行換成一張卡。`commit()` 有 undo，但這是有感的結構變動，Owner 實際用過才知道可不可接受。
- **議題的討論不進物件索引的全文搜尋。** 索引的 `oiDocText` 只讀 `secs`；`payload.agenda.msgs` 不在內。列為 `YZUI-022`。
- **`payload.agenda` 是新的 JSON 形狀。** 沒有 schema 層的驗證，寫壞了要到讀回來才會發現。目前靠 `agState()` 的預設值補齊缺欄位。
- **結案強制要寫結論。** 這是刻意的紀律（沿用 Thread Close 五欄的精神），但也可能讓 Owner 覺得擋路；實際用過再決定要不要放寬。

## Final Status

實作完成，靜態與資料層驗證全過，**launch level 不變**。Owner 端待辦：本機 `npm run dev` 開 `/company/operating` → 日誌，依 `tasks.md` 的四條逐項確認。
