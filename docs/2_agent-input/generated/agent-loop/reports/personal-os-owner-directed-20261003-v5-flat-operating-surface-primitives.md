# S2 Wave 1b 證據報告：v5 扁平操作面 primitive ＋ nested-card 機檢

2026-10-03 · repo `self-stucture-v1` · Owner 指派（PLN-075 §S1.5 轉化）

規格文件：`docs/02_architecture-and-rules/ARC-043_v5-flat-operating-surface-primitives.md`

## 1. 做了什麼

把 `claude/nested-card-decoupling-research.md`（2026-09-19，只研究、未動程式碼）轉化成 v5 工作台內**可直接使用的六個 primitive** 與**一支可機檢的規則檢查器**，並做了一頁改造前／改造後並排的預覽。

### 新增檔案

| 檔案 | 行數 | 內容 |
|---|---|---|
| `src/components/yuanzhan/v5/pm-primitives.source.js` | 441 | `pmRail` `pmRow(s)` `pmTable` `pmTrack` `pmTimeline` `pmDrawer` |
| `src/components/yuanzhan/v5/pm-primitives.css` | 183 | 對應樣式，零寫死色值 |
| `scripts/check-nested-card.mjs` | 約 310 | 六條規則 ＋ strict／baseline 兩種待遇 |
| `docs/02_architecture-and-rules/ARC-043_…md` | 238 | 規格文件 |
| `docs/2_agent-input/generated/project-module-proposals/pm-primitives-preview.html` | — | 自包含預覽（64.7 KB，0 外部請求） |

### 修改的共用檔（三處，全部是最小改動）

| 檔案 | 改動 | 理由 |
|---|---|---|
| `scripts/generate-yuanzhan-v5.mjs` | `EXTENSIONS` 加 `'pm-primitives'`；styles 串接加 `pm-primitives.css` | 不註冊的話新檔不會進 `runtime.js`／`styles.ts`，等於沒上線 |
| `src/lib/theme/company-theme.ts` | 新增 `--scrim`（`BLACK` ＋ `WHITE` 各一行），既有值一字未動 | 覆蓋層背幕原本每個地方各自寫死 rgba（`form-modal.css` 的 `rgba(4,6,9,.62)`），淺色佈景下會過黑 |
| `package.json` | 新增一行 `"ui:nested-card:check"` | — |

`source-patches.mjs`（凍結原型的 `I` 圖示表）**沒有動**：六個 primitive 用到的 `check` `dot` `warn` `clock` `x` `search` `sort` `chevronLeft` `chevronRight` 全部已在表內（表中共 56 個字形）。

**沒有碰**：`prisma/**`、`operating-commands.ts`、`src/lib/services/**`、任何既有 `.source.js`／`.css`、`runtime.js`／`styles.ts`／`theme-styles.ts`（後三者由 generator 重新產生）。

## 2. 六個 primitive 與它們取代的卡片牆

對應 `PLN-075` §S1.5 C 的逐項轉化表：

| § | primitive | 取代 | 關鍵作法 |
|---|---|---|---|
| C-1 | `pmRail` | A 的三張並排卡、C 的四張統計卡 | 無外框一行數字列；異常值用 `--danger`／`--warn` 自己站出來，還能掛一行說明 |
| C-2 | `pmRows` | A 的「跨資源待辦」容器卡包內層列 | 拿掉外層卡，卡層級 2 → 0 |
| C-6 | `pmTable` | 各分頁「資料夾／檔案／訊息」清單卡 | 分段 ＋ 全文篩選、點標題排序、roving tabindex 鍵盤導覽 |
| C-4 | `pmTrack` | C 的「期→階段」四方框再包一層卡 | 階段留著（repeated items 允許），外層容器卡拿掉；狀態畫在軌線上 |
| C-5 | `pmTimeline` | B 的 timeline 容器卡 ＋ 事件卡 | 容器只有一條髮絲線；同群事件（會議四件套）摺疊成一行 |
| D | `pmDrawer` | 把細節攤平在長卡 | Esc／點外／✕ 三種關閉；抽屜內只用髮絲線分段 |

## 3. 機檢結果

```
$ pnpm ui:nested-card:check

surface 容器類別：84 個（由 v5 CSS 推導）
新契約檔案（必須 0）：src/components/yuanzhan/v5/pm-primitives.source.js, src/components/yuanzhan/v5/pm-primitives.css -> 0 筆
既有檔案基線總數：143 筆（存量技術債，本輪不修）
本次掃出違規總數：143 筆

nested card: all checks passed
```

### 3.1 現況基線（誠實數字）

研究 §1.1 說「`styles.ts` 約 120 處寫死 hex、`runtime.js`／`extensions.source.js` 另有 28 處」。實測後要修正這個數字：**把 `var(--token, #fallback)` 的 fallback（那是 §12.1 明文要求的寫法）排除之後**，真正的「寫死色值」是：

| 檔案 | 原始 hex 出現次數 | 排除 var fallback 後的真違規 |
|---|---|---|
| `styles.ts` | 530 | **65** |
| `runtime.js` | 20 | **13** |
| `extensions.source.js` | 8 | **8** |
| 其餘團隊自有 css | 435 | **9**（`replies.css` 6、`journal-cockpit.css` 2、`operating-canvas.css` 1） |

全部 143 筆違規分布見 `ARC-043` §6.1。最大宗（`styles.ts` 的 65 ＋ `runtime.js` 的 13）都在 generator 產物，源頭是凍結原型，要修得走 `css-token-patches.mjs`／`source-patches.mjs`，不是手改。

### 3.2 checker 本身驗過會抓到東西

不是恆真的檢查。刻意注入違規後逐條驗證：

| 注入 | 結果 |
|---|---|
| `.pm-fake-card .pm-fake-card2`（兩者皆為卡） | `R1-nested-css` 捕獲 |
| `<div class="eb-doc-card"><div class="rq-card">` | `R2-nested-markup` 捕獲（卡層級 2） |
| `<section class="rq-card" data-pm-surface="primary">` | `R3-primary-is-card` 捕獲 |
| `border:1px solid #ff0000` / `background:#112233` | `R4-hex` 捕獲 2 筆 |
| `📊` | `R5-emoji` 捕獲 |
| 字面 `<svg viewBox=…>`（無 `role="img"`） | `R6-literal-svg` 捕獲 |

退出碼 1，`新契約檔案 -> 4 筆`。移除注入後回到 0 筆、退出碼 0。

另外修掉一個 checker 自身的誤判：原本沒有先剝掉 CSS 註解，導致註解裡提到的 class 名被當成選擇器（`.cf-deck ⊃ .cf-deck`、`.rq-card ⊃ .rq-card` 兩筆自我包覆的假陽性）。修掉後總數從 147 降到 143。

## 4. 瀏覽器實測（親眼看過截圖）

Playwright／Chromium，對 `pm-primitives-preview.html` 開 `file://`。

| 檢查 | 1440×900 | 390×844 |
|---|---|---|
| 橫向溢位 | `scrollWidth 1440 === clientWidth 1440` ✓ | `390 === 390` ✓ |
| page error / console error | 0 / 0 | 0 / 0 |
| 黑佈景可讀 | ✓ | ✓ |
| 白佈景可讀 | ✓ | ✓ |

390px 下唯一超出視窗寬度的元素是 `.pm-t`（表格本體），它在 `.pm-tscroll` 的橫向捲動容器內——這是刻意設計，整頁不出現橫向捲軸。

互動實測（全部在真瀏覽器跑過，不是看程式碼推測）：

| 行為 | 結果 |
|---|---|
| 表格 `↑` `↓` 移動焦點 | ✓（從第一列按兩次 ↓ 後 `activeElement.dataset.k === 'R5'`） |
| 表格 `Enter` 觸發 `onPick` | ✓ 抽屜開啟 |
| 搜尋輸入後焦點 | ✓ 留在 `INPUT`、值為「共好」、列數 10 → 2 |
| 抽屜 `Esc` 關閉 | ✓ |
| 抽屜點外面關閉 | ✓ |
| 抽屜 `✕` 關閉 | ✓ |
| 關閉後焦點回到觸發元素 | ✓（`activeElement` 是 `.pm-row-main`） |
| 時間線同群摺疊／展開 | ✓ |

截圖涵蓋：桌面黑／白全頁、手機黑／白全頁、抽屜（桌面右滑入 ＋ 手機底部上推）、表格排序＋分段篩選後、時間線展開後。

## 5. 驗證指令與實際輸出

| 指令 | 結果 |
|---|---|
| `node --check scripts/check-nested-card.mjs` | 通過（無輸出） |
| `node --check src/components/yuanzhan/v5/pm-primitives.source.js` | 通過 |
| `pnpm ui:nested-card:check`（以 `npm run` 執行） | `nested card: all checks passed`，退出碼 0 |
| `node scripts/generate-yuanzhan-v5.mjs` | `Compiled 556 handler templates into lexical closures; generated runtime + styles + seed.`（註冊前是 545，新增的 11 個是 pm-primitives 的 inline handler） |
| `tsc --noEmit --pretty false` | 1 筆錯誤，在 `src/lib/__prisma_probe.ts`（未追蹤檔，非本輪產出，與 pm-primitives 無關） |
| `ops:canvas:check` | **在本機 Cowork Linux 工作區跑不起來**：`node_modules` 是在 macOS 裝的，只有 `@esbuild/darwin-arm64`，`tsx` 啟動即失敗（`You installed esbuild for another platform than the one you're currently using… needs the "@esbuild/linux-arm64" package`）。工作區無對外網路，無法補裝。 |

### 5.1 關於 `ops:canvas:check`

雖然 `tsx` 跑不動，仍用 `node --experimental-strip-types` ＋ 一支 `@/` 路徑解析 hook 把它跑起來了，結果是：

```
AssertionError [ERR_ASSERTION]: 「新增…」應該開啟抽屜
    at scripts/check-operating-canvas.ts:121
```

為了確認這不是本輪造成的，把 `pm-primitives` 從 generator 的 `EXTENSIONS` 暫時移除、重跑 generator、再跑一次 —— **失敗點與訊息完全相同**。所以這是既有的失敗，與本輪改動無關；之後已把註冊還原並重新產生 `runtime.js`／`styles.ts`。

這條請 Owner 在 macOS 本機用 `pnpm ops:canvas:check` 再確認一次。

## 6. 值得 Owner 知道的事

1. **研究的 hex 數字要修正**：「`styles.ts` 約 120 處寫死 hex」把 `var(--token, #fallback)` 的 fallback 也算進去了。那是 §12.1 **要求**的寫法（token 打錯時降級而不是破圖），不是違規。真正要清的是 65 處。
2. **`--scrim` 是這輪唯一的新 token**。其餘需求既有 token 全部涵蓋，焦點外框直接用 `var(--pri)`，不另立 token。
3. **`I` 圖示表沒有動**。六個 primitive 需要的九個字形都已在表內，所以不需要動 `source-patches.mjs` 這個共用檔。
4. **`R2-nested-markup` 偏保守**。它解析樣板字串的標籤堆疊，對 `${...}` 做了平衡括號遮罩，但跨多個字串拼接出來的 markup 會漏掉。寧可漏報不誤報——併入 `ops:check` 前建議先讓它在新功能上跑一輪。`ARC-043` §6.2 記下了這個條件。
5. **併發**：本輪全程在主工作區，期間有另一個 agent 在改 `agenda-object.source.js`／`template-objects.source.js`／`source-patches.mjs`（資料層）。檔案所有權沒有重疊；但 `runtime.js`／`styles.ts` 是兩邊共用的 generator 產物，我重跑了 generator 三次（最後一次是還原後的正確狀態）。
