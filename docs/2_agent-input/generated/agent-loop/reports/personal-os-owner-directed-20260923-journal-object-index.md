# Agent Loop Evidence Report

## Task

- Task ID: `YZUI-012`
- Title: 日誌「標籤流」改為「物件索引」— 以物件帳本為準的 resource index
- Date: 2026-09-23
- Agent: Claude (Cowork, owner-directed)

## Source Docs Read

- `AGENTS.md`（§7 Page Requirement Understanding Score Gate、§12.1 icons/colors/generated-runtime、§11 高風險模組、§14）
- `docs/07_research-and-design/RES-002_saas-os-operating-surface-maturity-research.md`
- `docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md`
- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`
- `docs/07_research-and-design/RES-018_dual-naming-model-human-display-name-and-iso9001-style-ai-reference-code-research.md`
- `docs/07_research-and-design/RES-009`、`RES-016`（記錄／檔案庫分頁對照）
- `docs/03_feature-reference/REF-003_ui-screen-registry.md`（UI-088、GD-001、Revision Mode）
- 程式碼：`src/components/yuanzhan/v5/runtime.js:4316-4361`、`template-objects.source.js`、`journal-cockpit.source.js`、`source-patches.mjs`、`scripts/generate-yuanzhan-v5.mjs`

## Scope

- In scope：UI-088 日誌第三分頁的索引資料層與渲染；三筆 source patch；doc_object 參考碼格式；無瀏覽器的驗收測試腳本。
- Out of scope：DB 持久化、服務層授權、公開輸出、任何寫入或批次動作、舊 id 回填、其他模組索引。

## Strategic Review

- Current launch level / target：UI-088 `COMPLETED` / `PROTOTYPE`，本次為 Revision Mode，不變更 launch level。
- Last-three-loop delta：前三輪為日誌相關修復（icon 表缺 key、主題崩潰、元件容器 min-height、doc_object section 編輯器）。
- Repetition check：前一輪是提案類產出（v1 三選一）。依 Anti-Repetition Rule，本輪必須是 runtime implementation slice 或驗證 harness —— 本輪兩者都做了，不是再寫一份提案。
- Current strongest blocker（本頁面）：索引以日誌區塊為資料來源，導致物件在日誌行被刪後消失、段落內召喚的物件查不到，且三個月尺度沒有任何收斂手段。
- Acceptance mapping：`journal-tagstream-object-index-proposals.html` 的 11 條驗收；RES-002 resource index 條款；ARC-030 契約十項。
- Expected delta：product capability delta（可搜尋／可篩選／可回溯的物件索引）＋ proof delta（新增無瀏覽器驗收 harness）。

## Research / Reference Basis

- Page requirement understanding score：研究前 **62/100**；研究後 **94/100**。
- Understanding level：研究前 Medium（60–79）→ 規定 **4 輪**研究優化。
- Completed rounds and lenses：
  1. 本地 PRD／程式碼契合（RES-002 / ARC-030 / ARC-012 / REF-003）
  2. 對照產品與外部研究（個人資訊找回文獻 + NN/g 篩選 + SaaS data table patterns）
  3. 資料／BFF 邊界（RES-018 參考碼、v5 記憶體資料層、反向索引成本）
  4. 風險／權限／驗收邊界（高風險模組、批次寫入禁令、Revision Mode、驗收切分）
- External sources：
  - Teevan, Alvarado, Ackerman, Karger, *The Perfect Search Engine Is Not Enough: A Study of Orienteering Behavior in Directed Search*, CHI 2004 — 已知目標時仍只有 39% 的搜尋使用關鍵字；人沿著關聯來源逐步導航，且需要 context 才能確認目標。
  - *Searching Personal Collections*（arXiv 2412.12330，回顧 Dumais 2003 "Stuff I've Seen"、Ringel 2003、Allen 1989、Mackenzie 2019、Whittaker 2011）— 使用者偏好依日期而非相關度排序；時間地標可量化改善找回；人回憶內容勝於回憶形式描述；純時間排序隨目標變舊而失效；手動歸檔投報率低。
  - NN/g, *Defining Helpful Filter Categories and Values* / *Filters vs. Facets* — 篩選值要可預期、無術語、依使用者優先序。
  - SaaS Data Table UI Patterns — 識別欄最左、sticky 表頭、列動作直接露出、參考／稽核用分頁。
- Selected implementation pattern：以物件帳本為 SSOT 的 resource index；日誌降級為「來源」欄並帶時間地標；型別 facet + 內文搜尋 + 月份分組 + 分頁；名稱旁常駐 RES-018 參考碼；表格／時間軸雙檢視。
- Rejected alternatives：只做搜尋框；相關度排序；手動標籤／資料夾；卡片牆式 records；自訂密度控制（全域 `S.compact` 已存在）；索引上的批次操作；以自動標題當物件身分；為標籤流另立 UI ID。
- Task shape created：`YZUI-012`（PLN-060／PLN-061／tasks.md）。

## NANDA / Agent Protocol Alignment

- Applies?：否。本次不建立、修改、路由、評估、暴露或註冊任何 AI agent capability；無 AgentFacts-lite 欄位變動；`externalRegisterable` 不受影響。

## Changes

- 新檔：
  - `src/components/yuanzhan/v5/object-index.source.js`（索引資料層、反向索引、facet／搜尋／排序／分組／分頁、表格與時間軸渲染、分頁改名接線）
  - `src/components/yuanzhan/v5/object-index.css`（全部走主題 token，無硬編碼 hex）
  - `scripts/verify-object-index.mjs`（無瀏覽器的驗收測試 harness）
  - `journal-tagstream-object-index-proposals.html`（repo root，研究與介面提案 v2）
- 修改：
  - `src/components/yuanzhan/v5/source-patches.mjs` — 三筆窄 `rep()`：icon 表補 `search`/`x`/`sort`；`objJump` 補 `doc_object`/`doc` → `openDocPage()`；`replaceWithObj` 兩個分支寫入 `obj.bornAt`。
  - `src/components/yuanzhan/v5/template-objects.source.js` — 新增 `docObjectRefCode()`，`createDocObject` 改用 RES-018 格式 `{TYPE}-JRNL-{SEQ:6}-{YYYYMMDD}`（舊 id 不回填；legacy 遷移路徑的確定性 id 保持不變）。
  - `scripts/generate-yuanzhan-v5.mjs` — EXTENSIONS 併入 `object-index`（置於 `template-objects` 之後）；styles 併入 `object-index.css`。
  - 重新產生 `runtime.js`／`styles.ts`／`v5-seed.js`（未手改生成檔）。
- Behavior changed：
  - 日誌第三分頁由「標籤流／召喚紀錄」改為「物件索引」（Owner 於本次明確核可改名）。
  - 索引以 `DB.docObjects` 與各帳本為準，不再掃日誌區塊決定存在與否；日誌行刪除後物件仍列出並標示來源已刪。
  - 反向索引同時掃各元件 `sec.blocks`，段落內召喚的物件可被索引並回溯到所屬文件。
  - 新增：名稱與內文搜尋（標亮片段）、型別 facet（帶數量）、「僅日誌誕生」過濾、三種排序、月份分組、25 筆分頁、表格／時間軸雙檢視、參考碼複製、回到來源行（`rq-flash` 閃爍定位）。
- Docs changed：`PLN-060`、`PLN-061`、`RPT-007`、`tasks.md`、本報告。

## Verification

| Command | Result | Notes |
|---|---|---|
| `node --check src/components/yuanzhan/v5/object-index.source.js` | PASS | — |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS | Compiled 363 handler templates（前為 331 量級，新增本頁 handler） |
| `node --check src/components/yuanzhan/v5/runtime.js` | PASS | — |
| `npx tsc --noEmit --pretty false` | PASS | 0 errors |
| `npx eslint src/components/yuanzhan/v5/ scripts/verify-object-index.mjs scripts/generate-yuanzhan-v5.mjs` | PASS | 0 errors，847 warnings |
| `npx eslint src/components/yuanzhan/v5/runtime.js` | PASS | 0 errors，739 warnings（基準 637；+102 為本頁 inline-handler 函式與 `event`/`element` 未使用參數，同既有樣式） |
| `node scripts/verify-object-index.mjs` | PASS | **19/19**，涵蓋驗收 1、3、4、5、6、7、8 |
| `grep -nE "#[0-9a-fA-F]{3,8}" object-index.css \| grep -v "var(--"` | PASS | 無 var() fallback 以外的硬編碼色 |
| icon key 靜態檢查（`search`/`x`/`sort` 在 `I` 表） | PASS | 驗收 10 的靜態部分 |
| `node scripts/verify-yuanzhan-v5.cjs` | NOT_RUN | 需 playwright；開發機與雲端沙箱皆無，見下方 fallback |

### Manual Blocker Fallback

`verify-yuanzhan-v5.cjs` 需要真瀏覽器，本機 `MODULE_NOT_FOUND: playwright`，沙箱亦缺 linux/arm64 `@next/swc` 跑不了 `next dev`。
依 AGENTS.md Manual Blocker Fallback，採用**最強的安全替代**：新增 `scripts/verify-object-index.mjs`，
把 `object-index.source.js` 的純資料層放進最小樁環境實際執行，逐條對應驗收清單。這是可重跑的 harness，不是一次性檢查。

## Evidence

- `node scripts/verify-object-index.mjs` → `19/19 passed`。關鍵斷言：
  - doc_object 顯示真實名稱與人話型別（`會議紀錄 / 會議紀錄：Q4 通路合約條款與分潤`），無任何列落到「已刪除」。
  - 日誌行被刪的物件仍在索引且 `src === null`（畫面顯示「來源日誌那一行已刪除」）。
  - 元件段落內召喚的 issue 被索引到，`src.docId` 指向所屬會議紀錄。
  - 只出現在第三段內文的詞（`終止條款`、`供應商`）可被搜到，片段產出 `<mark>終止條款</mark>`。
  - 有 `bornAt` 的物件帶時刻；無 `bornAt` 的舊物件 `born===0`，畫面退回日期，不偽造時刻。
  - facet 數量 = 套用該型別後的列數；排序鍵單調遞減；表格／時間軸／空狀態皆可渲染且 `<tr>` 開閉平衡。
- Screenshots / browser checks：NONE（見 Remaining Risks）。
- DB checks：N/A（無 schema 變更，資料仍為記憶體）。
- Product capability delta：日誌產出的物件從「只能捲動的召喚流水帳」變成可搜尋、可篩選、可依月份定位、可回溯來源的索引；孤兒物件不再消失。
- Proof delta：新增可重跑的無瀏覽器驗收 harness（7/11 條驗收自動化）。
- Blocker delta：playwright 缺席的阻擋首次有了具體替代路徑，可被其他 v5 頁面沿用。

## Remaining Risks

- **驗收 2、9、11 未經真瀏覽器確認**：兩條跳轉路徑（開物件 ↗／回到來源行 ⤵ 的 `rq-flash` 定位）、四主題可讀性、390px 版面。必須由 Owner 在本機 `npm run dev` 操作確認；在那之前本頁不宣稱驗證通過。
- **反向索引成本**：每次渲染重掃全部日誌與所有 `sec.blocks`。三個月量級可接受；明顯變慢時改為建立／刪除時增量維護 `DB.objIndex`。
- **參考碼回填**：舊 doc_object id 維持原樣。RES-018 規定參考碼永不重生成，回填等於重寫歷史引用 —— 需 Owner 決定才可動。
- **`docObjectName()` 仍會隨內容重算標題**：本次以「名稱旁常駐參考碼」緩解，未改動自動命名行為本身。
- **lint warnings +102**：全部屬既有樣式（僅由 inline handler 字串引用的函式），非新問題。

## Final Status

- Status: `DONE — implementation; owner-run browser evidence pending`
- Recommended next task: Owner 在本機跑一次 `npm run dev` 完成驗收 2／9／11；若通過，下一個候選是把 `ARC-030` 契約形狀套到第二個模組索引（避免各頁各自發明），或依 `YZLIVE-005` 開始日誌／物件的持久化。
