# v5 扁平操作面 Primitive（脫離 nested card 的實作層）

Date: 2026-10-03

Status: `FOPS-V5-PRIM_IMPLEMENTED`

Purpose：把 `ARC-012_frontend-operating-surface.md` 的五層版面規則，在 **v5 Shadow-DOM 工作台（UI-088）內**落成一組可直接使用的 vanilla primitive，並附一支可機檢的規則檢查器。

本文件是 `ARC-012` 在 v5 內的**實作層**，不是新的設計哲學。設計規則一律以 `ARC-012` §2／§5／§7 與 `AGENTS.md` §12／§12.1 為準；本文件只回答「用什麼零件做、禁止什麼、怎麼機檢」。

Related:

- `docs/02_architecture-and-rules/ARC-012_frontend-operating-surface.md`（目標版面：五層、卡片不是預設結構）
- `docs/05_execution-plans/PLN-075_project-module-five-resource-staged-build-plan.md` §S1.5（Owner 追加的版面約束，本文件的規格來源）
- `AGENTS.md` §12、§12.1（圖示與色彩 token 的硬規定、v5 generator 的運作方式）
- `claude/nested-card-decoupling-research.md`（2026-09-19，被轉化的研究）
- `claude/company-theme-implementation.md`（v5 色值技術債紀錄）

---

## 1. 現實限制：React 元件在 v5 內不能複用

v5 工作台是 **Shadow DOM ＋ vanilla JS**：`scripts/generate-yuanzhan-v5.mjs` 把凍結原型 HTML 轉成 `runtime.js`／`styles.ts`，再由 `desktop.tsx` 整包掛進 React 樹。整個 v5 執行環境裡沒有 React render tree，因此：

| 既有資產 | 能不能用 | 本文件怎麼處理 |
|---|---|---|
| `src/components/owneros/insight-rail.tsx` | ✗ 不能 import | 只移植**形狀**（無框一行數字列）→ `pmRail` |
| `src/components/owneros/detail-drawer.tsx` | ✗ 不能 import | 只移植**互動慣例**（Esc／點外／✕ 三種關閉）→ `pmDrawer` |
| `src/components/yuanzhan/primitives.tsx`（非 v5、無人 import 的死程式碼）的 `RecordRows`／`.yz-row` | ✗ 不能 import | 只移植**扁平列的 shape**（eyebrow／標題／摘要／右側 meta）→ `pmRow` |
| `react-aria-components`／`motion`／`cmdk`／`vaul` | ✗ 全部用不上 | 鍵盤導覽、焦點管理、動畫一律手寫 |

這點在 `claude/nested-card-decoupling-research.md` §1.1 已經指出，`PLN-075` §S1.5 D 再次確認。**不要再提案「在 v5 裡引入 react-aria」**，那條路在這個執行環境不存在；要走 React 元件庫，等於要把 `/company/operating` 整頁換掉，是另一個規模的決定。

## 2. 檔案位置與擴充方式

| 檔案 | 角色 |
|---|---|
| `src/components/yuanzhan/v5/pm-primitives.source.js` | 六個 primitive 的實作（團隊自有檔，可直接編輯，不需 patch） |
| `src/components/yuanzhan/v5/pm-primitives.css` | 對應樣式（同上） |
| `scripts/check-nested-card.mjs` | 機檢（`pnpm ui:nested-card:check`） |
| `docs/2_agent-input/generated/project-module-proposals/pm-primitives-preview.html` | 自包含預覽頁（改造前／改造後並排） |

`pm` = project module。兩個檔都已註冊進 `scripts/generate-yuanzhan-v5.mjs`（`EXTENSIONS` 陣列與 styles 串接）。**改完任何一個檔都必須重跑 `node scripts/generate-yuanzhan-v5.mjs`**，否則 `runtime.js`／`styles.ts` 不會更新。

依 `AGENTS.md` §12.1，`runtime.js`、`styles.ts`、`theme-styles.ts` **絕不手改**。

## 3. 色彩 token

顏色一律 `var(--token, <fallback-hex>)`，token 的單一真相來源是 `src/lib/theme/company-theme.ts` 的 `V5_PALETTES`。本輪新增一個 token：

| token | BLACK | WHITE | 用途 |
|---|---|---|---|
| `--scrim` | `rgba(4, 6, 9, 0.62)` | `rgba(22, 24, 28, 0.42)` | 覆蓋層背幕（抽屜／彈窗）。在此之前每個覆蓋層各自寫死 rgba，淺色佈景下會過黑 |

依 §12.1 的繼承規則：定義在 `BLACK` 與 `WHITE`，`ORANGE` 繼承 `WHITE`、`BRAND` 繼承 `BLACK`，不需另外定義。

其餘需求都用既有 token 涵蓋：`--bg` `--surface` `--surface-2` `--border` `--border-2` `--text` `--text-2` `--text-3` `--pri` `--pri-bg` `--pri-br` `--ok` `--warn` `--danger` `--hover-overlay` `--shadow` `--mono`。焦點外框直接用 `var(--pri)`，不另立 token。

## 4. 六個 Primitive 的 API

全部是「回傳 HTML 字串」的函式（`pmDrawer` 例外，它是命令式的）。互動回呼不能塞進 attribute（generator 會把 attribute 內容當程式碼編譯），所以有互動的 primitive 都吃一個**在同一檢視內穩定的 `opts.id`**，回呼存在 `PM` 登記表裡，markup 只帶 id 與 row key。id 穩定，排序／摺疊狀態才能跨重繪留住。

### 4.1 `pmRail(items, opts)` — 一行數字列（取代統計卡牆）

```js
pmRail([
  { label: '待收尾款', value: 'NT$ 182,000', tone: 'crit', note: '01.共好玟化 已逾期 15 天' },
  { label: '本月已入帳', value: 'NT$ 96,000', tone: 'good' },
])
```

`tone`: `good` / `warn` / `crit`（對應 `--ok` / `--warn` / `--danger`）。`opts.bare` 連底線也不要。
**無外框**：只有一條底部髮絲線。異常值靠語意色站出來，不靠框線。

### 4.2 `pmRow(item, pick)` / `pmRows(items, opts)` — 扁平列（取代清單卡）

```js
pmRows(items, { id: 'todoRows', onPick: (key) => openDetail(key), empty: '目前沒有待辦' })
// item: { key, eyebrow, title, summary, meta: [{ text, tone?, chip?: false }], go?: true }
```

形狀沿用 `.yz-row`：eyebrow 一行、標題、兩行摘要、右側 meta chips。`chip: false` 的 meta 是純文字（人名、日期）。
chip 是 pill（`border-radius: 999px`），屬於 repeated item，不是卡。

### 4.3 `pmTable(cols, rows, opts)` — 可排序／可篩選／鍵盤可導覽（primary surface 首選）

```js
pmTable(
  [{ k: 'kind', label: '資源' },
   { k: 'amt', label: '金額', align: 'num', get: r => fmt(r.amt), sortBy: r => r.amt }],
  rows,
  { id: 'resTable', search: true, searchLabel: '篩選',
    sort: { k: 'd', dir: 'desc' },
    segments: [{ label: '全部' }, { label: '待處理', test: r => PENDING.includes(r.st) }],
    rowKey: r => r.id, onPick: (key, row) => openDetail(key),
    empty: '沒有符合條件的資料', foot: '↑↓ 移動焦點 · Enter 開啟' },
)
```

- `cols[].align`: `num`（右對齊、等寬數字、數值排序）／`mono`。`cols[].sortable: false` 關掉該欄排序。
- 排序：點欄位標題 asc → desc → 取消；`aria-sort` 同步。
- 篩選：`segments` 分段 ＋ `search` 全文（預設掃全部欄位，可用 `searchIn(row)` 指定）。
- 鍵盤：roving tabindex，`↑↓` 移動焦點、`Home`/`End` 跳頭尾、`Enter`／`Space` 觸發 `onPick`。
- 表頭 `position: sticky`；橫向溢位由 `.pm-tscroll` 自己捲，不讓整頁出現橫向捲軸。

### 4.4 `pmTrack(cycles, opts)` — 期／階段水平軌（取代階段卡）

```js
pmTrack([
  { no: 'C3', title: '03.幸福文齡｜二期', meta: '2026-08-01 → 2026-12-20',
    stages: [{ key: 'x1', label: '執行', meta: '4/6 場完成', state: 'now' },
             { key: 'v1', label: '期中驗收', meta: '10/15', state: 'todo' },
             { key: 'x2', label: '執行（下半）', state: 'todo' },
             { key: 'v2', label: '結案驗收', state: 'todo' }] },
], { id: 'track1', onPick: (stageKey, cycleIndex) => {} })
```

`state`: `done` / `now` / `late` / `todo`。支援多期並列，`執行 → 驗收` 可重複任意次。
階段是軌線上的段落（底部 2px 色帶 ＋ 圖示），**沒有外層容器卡**。`onPick` 省略時 stage 渲染成非互動的 `div`，不會留下按不動的按鈕。

### 4.5 `pmTimeline(events, opts)` — 一條線＋節點（取代活動卡牆）

```js
pmTimeline(events, { id: 'tl1', dayLabel: d => [d.slice(5), d.slice(0, 4)], onPick: key => {} })
// event: { key, d: '2026-10-01', time?, title, summary?, tone?, fold?: '同群標籤' }
```

- 日期在左欄、一條左側髮絲線貫穿、節點是線上的小圓點。**容器不是卡**（`ARC-012` §2、`PLN-075` §S1.5 C）。
- 相鄰且 `fold` 值相同的事件（例如「10.AI SSOT 會議四件套」）自動收成一行「N 筆」，點開才展開；單筆不摺疊。
- 摺疊狀態存在 `PM.tl[id].open`，跨重繪保留。

### 4.6 `pmDrawer(cfg)` / `pmDrawerClose()` — 細節抽屜（取代把細節攤平在長卡）

```js
pmDrawer({ crumb: '01.共好玟化 / 合約 / CT-2501', title: '品牌課程設計委託合約',
           sub: '尾款未收 · 逾期 15 天', body: html, actions: html, wide: false })
```

- 三種關閉：`Esc`、點抽屜外、右上 `✕`。關閉後焦點回到觸發元素。
- `z-index: 52` —— 在原型抽屜（50）之上、表單視窗（56）之下，所以 `form-modal` 仍疊在詳情之上，`Esc` 先收最上層。
- 桌面右側滑入、手機底部上推（`max-height: 92dvh`）。
- 內容用 `.pm-sec`（髮絲線分段）與 `.pm-kv`（key/value 清單），**不得在抽屜內再放卡**。

## 5. 禁止事項（違反就是不合格）

1. **巢狀卡上限 = 1。** 任何「border／ring／shadow ＋ radius」的**區塊容器**內，不得再出現同類容器。
   - 豁免一：`position: fixed|absolute` 的覆蓋層（抽屜／彈窗／toast）——那是圖層，不是頁面層級的卡，層級在它內部重新計算。
   - 豁免二：pill（`border-radius` ≥ 24px 或 `999px`）與 `display:inline*` 的 chip/badge——repeated item，`ARC-012` §2 允許。
2. **Primary operation surface 不得是卡片容器。** 標記方式：主操作面元素帶 `data-pm-surface="primary"`，該元素不得同時帶任何 surface 容器類別。
3. **一處寫死 hex 都不准。** 全部 `var(--token, fallback)`；固定 Tailwind 色票（`bg-red-500` …）同樣禁止。
4. **圖示一律 `svg(name, size)`。** 不得 emoji presentation 的圖畫字，不得字面 `<svg>`（資料視覺化的圖表例外，以 `role="img"` 標示）。缺的圖示要加進 `I` 表——`I` 在凍結原型內，依 §12.1 用 `source-patches.mjs` 的 `rep(...)` 追加。
   - 單色字形（`★ ✓ ⚠ → ↵ ⇧`）依 §12.1 算**內容**，不是圖示，不在此限。
5. **絕不手改 `runtime.js`／`styles.ts`／`theme-styles.ts`。**

## 6. 機檢：`scripts/check-nested-card.mjs`

```bash
pnpm ui:nested-card:check            # ratchet 模式（CI 用）
node scripts/check-nested-card.mjs --baseline   # 印出現況，用來更新基線
node scripts/check-nested-card.mjs --strict     # 忽略基線，列出全部現況違規
```

| 規則 | 檢查內容 |
|---|---|
| `R1-nested-css` | 後代選擇器讓 surface 容器包 surface 容器（`.a .b`，兩者皆為卡） |
| `R2-nested-markup` | `.source.js` 的樣板字串裡，DOM 標籤堆疊的卡層級 > 1 |
| `R3-primary-is-card` | `data-pm-surface="primary"` 的元素帶 surface 容器類別 |
| `R4-hex` / `R4-tailwind` | 非 `var(--t, #fb)` fallback 的寫死 hex；固定 Tailwind 色票 |
| `R5-emoji` | emoji presentation 圖畫字（`U+1F300–U+1FAFF`、`U+FE0F`）當圖示 |
| `R6-literal-svg` | `.source.js` 裡的字面 `<svg>`（`role="img"` 的圖表除外） |

「surface 容器類別」不是寫死的名單，是**從全部 v5 CSS（含 generator 產出的 `styles.ts`）推導**出來的：同時具備 `border-radius`（非 pill）與四邊 `border`／`box-shadow`／`outline`，且不是 `position:fixed|absolute`、不是 `display:inline*` 的規則，其選擇器尾段的 class 就算一個。目前推導出 **84 個**。

### 6.1 基線（2026-10-03 實測，共 143 筆）

checker 分兩種待遇，否則它一上線就全紅而無法併入 `ops:check`：

- **`STRICT_FILES`（本契約新建的檔）：必須 0。** `pm-primitives.source.js`／`pm-primitives.css`，以及 2026-10-04 加入的專案模組七個檔（`pm-shell.source.js`、`pm-shell.css`、`pm-overview`／`pm-plan`／`pm-drive`／`pm-meeting`／`pm-chat` 的 `.source.js`），實測 0 筆。
- **`BASELINE`（既有檔）：不得超過記錄下來的數字，只能往下走。** 名單外的檔案一出現違規就是失敗，所以**新檔天生零容忍**。

| 檔案 | 違規 | 性質 |
|---|---|---|
| `v5/styles.ts` | `R1-nested-css` 15、`R4-hex` 65 | generator 產物，源頭在凍結原型，要修得走 `css-token-patches.mjs` |
| `v5/runtime.js` | `R4-hex` 13、`R6-literal-svg` 20 | 同上，走 `source-patches.mjs` |
| `v5/additions.css` | `R1-nested-css` 3 | `.eb ⊃ .eb-doc-card`（文件物件卡） |
| `v5/journal-cockpit.css` | `R1-nested-css` 3、`R4-hex` 2 | |
| `v5/cashflow-faces.css` | `R1-nested-css` 1 | `.cf-vch ⊃ .cf-thumb` |
| `v5/replies.css` | `R4-hex` 6 | `#fff` |
| `v5/operating-canvas.css` | `R4-hex` 1 | |
| `v5/extensions.source.js` | `R4-hex` 8 | 佈景切換器的色塊預覽 |
| `v5/journal-cockpit.source.js` | `R2-nested-markup` 2 | |
| `v5/journal-review.source.js` | `R2-nested-markup` 1 | |
| `v5/replies.source.js` | `R2-nested-markup` 1 | |
| `v5/notifications.source.js` | `R6-literal-svg` 1 | 通知鈴鐺沒走 `svg()` |
| `v5/template-objects.source.js` | `R6-literal-svg` 1 | 摺疊箭頭沒走 `svg()` |

這些是 `claude/company-theme-implementation.md` 已經記錄的存量技術債，**本輪不修**。清償順序建議：先把四支 `.source.js` 的 `R6`／`R2`（團隊自有檔，改動最小）清掉，再處理 `.css` 的 `#fff`，最後才動 patch 檔裡的凍結原型部分。

### 6.2 併入 `ops:check` 的時機

目前 `ui:nested-card:check` 是獨立 script。併入 `package.json` 的 `ops:check` 串鏈之前，建議先確認 `R2-nested-markup` 在新功能上線一輪後沒有誤判——它是唯一需要解析樣板字串的規則，對 `${...}` 的處理雖然做了平衡括號遮罩，但遇到跨多個字串拼接的 markup 會漏掉（偏保守，寧可漏報不誤報）。

## 7. 與 `ARC-012` 的對應

| `ARC-012` §2 的層 | v5 內用什麼 |
|---|---|
| Attention header | 現有的 `wbtitle`／`panel-h` ＋ `pmRail`（把需要注意的數字放進去） |
| Primary operation surface | `pmTable`（首選）／`pmTimeline`／`pmTrack`／`pmRows`。**不得是卡** |
| Context strip | `pmTable` 的 `segments` ＋ `search` 列；或 `pmRail` 的 `bare` 模式 |
| Action rail | 現有 `.btn` 系統；抽屜內用 `pmDrawer` 的 `actions` |
| Records link | `pmRow` 的 `go: true` ＋ `pmDrawer` drilldown |

`ARC-012` §7 的五種 Page Attention Pattern 對應：

- **Queue Page** → `pmRail` ＋ `pmTable`（segments 當 filter tabs）＋ `pmDrawer` ＋ 抽屜 footer 的決策鈕
- **Command Surface** → `pmRail` ＋ 既有 command bar ＋ `pmTable`／`pmRows` ＋ `pmDrawer`
- **Evidence / Research Surface** → `pmTable`（來源選取）＋ `pmRows`（證據列）＋ `pmDrawer`（出處）
- **Workflow Surface** → `pmTable`（runs）＋ `pmRows`（待審）＋ `pmTimeline`（run 細節）
- **Private Reflection Surface** → `pmTimeline` ＋ 既有日誌編輯器

## 8. 可看見的證據

`docs/2_agent-input/generated/project-module-proposals/pm-primitives-preview.html`（自包含、無外部請求）把六個 primitive 用真實專案資料各展示一次，並與「改造前的卡片牆」並排。CSS 與 JS 都是從 `pm-primitives.*` 直接讀出來組成的，不是另一份複製品。

瀏覽器實測（Playwright／Chromium，1440×900 與 390×844、黑與白兩佈景）：

- 兩種寬度 `scrollWidth === clientWidth`，無橫向頁面溢位；表格的橫向捲動由 `.pm-tscroll` 自己吸收。
- 0 page error、0 console error。
- 鍵盤：表格 `↑↓` 移動焦點、`Enter` 開抽屜皆正常；搜尋輸入後焦點留在輸入框、游標在尾端。
- 抽屜三種關閉（`Esc`／點外／`✕`）皆關得掉，關閉後焦點回到觸發元素。
- 時間線同群事件摺疊／展開正常。

## 8.1 第一批使用者：專案模組（2026-10-04）

`PLN-075` S3 的六個檔是這組 primitive 的第一批使用者。各版面用到的零件：

| 版面 | Attention header | Primary operation surface | 其他 |
|---|---|---|---|
| 總覽 | `pmRail` | `pmTimeline`（時間流） | `pmTrack`（期階梯）、`pmRows`（跨資源待辦） |
| 計劃 | `pmRail` | 縮排＋左側髮絲線的四層樹（`.pm-pl`） | 既有表單引擎 `openForm` |
| 檔案 | `pmRail` | `pmTable`（檔案表） | 樹（`.pm-dv-tree`）、`pmRows`（子資料夾）、`pmDrawer`（檔案詳情） |
| 會議 | `pmRail` | 四屬性清單（`.pm-attr`）＋四件套 | 時間序清單 |
| 對話 | — | 訊息列（`.pm-chat-log`） | 頻道清單 |

`pm-shell.css` 多了幾個 primitive 沒有的形狀（樹、四層階層、訊息列、屬性清單）。它們遵守同一組約束：階層靠縮排與單邊髮絲線，不靠外框；唯一有圓角的是 pill 與 inline 的小方塊。

這一輪沒有新增色彩 token，也沒有新增圖示。

## 9. 尚未處理

- `pmTable` 沒有分頁與虛擬捲動；超過數百列需要另外設計。
- `pmTimeline` 只摺疊**相鄰**的同群事件；跨日的同群不會合併。
- `pmDrawer` 是單層，沒有抽屜堆疊（原型的 `S.stack` 另有一套，兩者目前並存但不互通）。
- 既有 38 個 React 頁面的 `SectionCard` 收斂不在本文件範圍——那是 `ARC-012` 在 Next.js 側的工作，與本文件互不相干。
