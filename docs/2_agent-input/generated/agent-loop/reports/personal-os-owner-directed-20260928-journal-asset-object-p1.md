# 日誌檔案物件 P1：四道門、卡片、`@` 引用（2026-09-28）

接續同日的 P0 契約層（`personal-os-owner-directed-20260928-journal-asset-object-p0.md`）。
Owner 指示「繼續實作」。P1 是 `ASSET-005`。

**`UI-088` Revision Mode 的核可**：日誌新增上傳入口屬行為變更，依 `REF-003:202` 需
Product Owner 點頭。Owner 於本輪以「繼續實作」明確指示，視為該閘門通過；未新增任何 UI ID。

## 一件事先講：不需要動 `source-patches.mjs`

提案原本估計要五筆窄 `rep()` 去改凍結原型。實際做下來一筆都不用：

- **icon 表**是 `const I = {...}`，擴充檔直接 `I.image ??= '...'` 就好 —— `svg()` 是
  `I[k]` 在呼叫當下查表，不是啟動時快照。
- **`objHtml`／`mentionHits`／`objJump`／`summonObject`** 都是函式宣告，
  用 repo 既有的覆寫慣例（`const astBaseX = X; X = function(...)`）接管，
  與 `replies.source.js` 接管 `applySummon` 是同一個做法。
- **`SUMMON`** 是陣列，`SUMMON[1].items.push(...)` 即可，與 `agenda-object` 註冊議題一樣。

少動凍結原型一分，`generate-yuanzhan-v5.mjs` 之後就少一分因為原型文字位移而整包爆掉的機會。

## 四道門

全部收斂到一個 `assetIntake(files, blockId)`。一次可以進來多個檔案，
**每個檔案各自一列物件、各自一張卡片** —— 一張卡片塞三個檔案的話，`@` 就引用不到其中某一個。

| 門 | 裝置 | 實作 |
|---|---|---|
| 拖放到某一行 | 桌機 | 覆寫 `dragOver`／`dropBlk`，先判 `dataTransfer` 有沒有檔案。有就走上傳並 `stopPropagation()`，沒有就原樣交還給既有的區塊排序 —— 兩者共用同一組事件，不先分流就會打架。 |
| 貼上 ⌘V | 桌機 | **capture 階段**監聽。runtime 既有的 paste 監聽會 `preventDefault()` 並插入剪貼簿純文字；剪貼簿裡是圖片時那是空字串，插一個空節點雖然無害，但仍會送出 `input` 事件把那一行標成已修改。在它之前攔下來比較乾淨。 |
| `#` 召喚 → 附件 | 兩者 | `SUMMON[1].items.push({k:'asset'})` + 覆寫 `summonObject`。不發明新語法：使用者已經知道 `#` 會生出東西。 |
| 日誌欄頭「附件」按鈕 | 手機為主 | 手機沒有拖放、⌘V 不好按、`#` 要切輸入法。按了跳三選一：拍照（`capture="environment"`）／相簿（`accept="image/*,video/*"`）／檔案。系統選單由瀏覽器叫出來，我們不自己畫 —— 自己畫的一定比系統的難用。 |

## 上傳的順序

1. **前端閘門**：`classifyAsset()`。這不是另寫一份 —— generator 的 import 行多加一條
   `@/lib/ui-data/yuanzhan/operating-assets`，前端與伺服器呼叫的是**同一個函式**，
   所以擋下來的理由是同一個字串。harness 有一條直接斷言這件事。
2. **預簽**（POST）→ 伺服器建列、回參考碼。
3. **列先進 `DB.assets`、卡片先畫出來**，網路才開始跑。使用者不必盯著空白等，
   而且上傳到一半關掉分頁時，畫面上那張卡片說得出它是哪一個檔案。
4. **XHR PUT**，不是 fetch —— fetch 沒有上傳進度事件。假的進度條比沒有進度條更糟：
   它會在 99% 卡住，而使用者不知道那是不是當掉了。進度只改進度條**那一個節點**
   （`[data-ast-prog]`），不 `render()`，否則每個 tick 都會把游標從正在打字的那一行踢走。
5. **finalize**（PATCH）→ `ready`。

失敗的檔案**留在日誌上**並帶「重試」或「重新選擇檔案」，不默默消失 ——
那一行的上下文就是它為什麼被上傳。重試換一個新的 objectKey（R2 對同一個 key 的寫入
限制是每秒一次，而且半份舊 bytes 留在原地會讓 finalize 的大小比對失去意義），
**參考碼不變**（`RES-018`）。

## 卡片與預覽

骨架沿用 `.eb-obj`（chip + 標題 + 參考碼 + 一列 `.pf`），只換主體 —— 所以同一張卡在日誌、
在文件物件段落、在物件索引時間軸長得一樣。三態：uploading（百分比＋進度條）／
failed（紅底、原因、兩個出口）／ready。

預覽照提案第七節分級，P1 只做：**圖片**卡片縮圖與抽屜大圖、**PDF** 抽屜 iframe、
**音訊／影片**抽屜原生播放器，其餘是圖示與下載。
縮圖先畫骨架、圖真的解碼完才淡入（`.ast-hold.ready`）—— 直接給一個還沒有 src 的
`<img>` 會先閃一次破圖，這是 `cashflow-faces` 已經踩過並修好的坑，沿用同一個做法。

**影音目前仍是 5 分鐘 TTL**，長影片會播到一半 403（提案 D3，排 P2）。

## `@` 引用

`mentionHits` 覆寫：附加 `DB.assets` 裡 **`status === 'ready'`** 的檔案，
並過濾掉別人的 `space:'personal'`。傳到一半的東西不該被別人引用；
別人的私人檔更不該出現在我的選單裡。

引用走既有的 `replaceWithObj` —— 所以隔天在另一行 `@` 同一個檔，
引用的是同一個 id、同一份 bytes，R2 不會多存一份。

## 物件索引

`OI_LEDGERS` 加一個 `asset` 帳本，型別 facet 自動多一格（`Object.keys` 驅動）。
順帶把帳本契約加了兩個選用欄位 `nameOf`／`bodyOf`：檔案的顯示名稱在 `.name` 不在 `.t`，
而且搜尋語料未來要含 `extractedText`（P3）。既有五個帳本不受影響。

## 讀回

`operating-store.service.ts` 讀 `operating_assets`，**只讀 `ready`**，
可見性沿用文件庫那條 `OR: [{space:'team'}, {authorKey: in viewerSeatKeys}]`。
傳到一半與失敗的不送進工作台 —— 讀回來只會變成一張永遠 62% 的殭屍卡片。

工作台側的 id 用 `refCode`（`workbenchRef` 在建列時就寫成同一個值），
一份檔案一個身分。

**assets 不進 `ARC-042` 的 diff 佇列**：那一列由路由寫，前端只讀。
日誌區塊照舊走佇列，所以「哪一行引用了哪個檔」是持久化的。

## 檔案

**新增**
- `src/components/yuanzhan/v5/asset-object.source.js`（562 行）
- `src/components/yuanzhan/v5/asset-object.css`
- `scripts/verify-asset-object.mjs`

**修改**
- `src/components/yuanzhan/v5/object-index.source.js` — asset 帳本、`nameOf`／`bodyOf`
- `src/components/yuanzhan/v5/journal-cockpit.source.js` — 欄頭「附件」按鈕
- `src/lib/services/operating-store.service.ts` — 讀回 assets
- `src/lib/services/operating-assets.service.ts` — `workbenchRef` 預設為 `refCode`
- `scripts/generate-yuanzhan-v5.mjs` — 併入擴充、CSS 與契約 import
- `package.json` — `ops:assets:object:check`
- 重新產生 `runtime.js`／`styles.ts`／`v5-seed.js`（未手改生成檔）

**未修改**：`source-patches.mjs`（見上）。

## 驗證結果

| 檢查 | 結果 |
|---|---|
| `node scripts/verify-asset-object.mjs` | **51/51 PASS**（本輪新增） |
| `node scripts/verify-asset-pipeline.mjs` | 42/42 PASS（P0，無回歸） |
| `node scripts/verify-object-index.mjs` | 19/19 PASS（無回歸） |
| `node scripts/verify-agenda-object.mjs` | 99/99 PASS（無回歸） |
| `node scripts/check-operating-command-fields.mjs` | 356 PASS |
| `check-prisma-structure` / `check-migration-coverage` / `check-operating-persistence` | 全 PASS |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS（545 handler templates，前 523） |
| `node --check runtime.js` | PASS |
| 生成檔 inline handler 數 | **0** |
| `npx eslint`（新增兩檔） | 0 errors、5 warnings（皆為 `onclick=` 字串引用的函式，與 `oiOpen`／`oiJump` 同一個既有樣式） |
| `npx tsc --noEmit --pretty false` | **213 errors，全部同一根因**，見下 |

harness 實際斷言的內容：四道門的分流（拖檔案不進區塊排序、拖區塊不被上傳搶走）／
區塊插入四種情形（空行就地換、有字接下面、多檔依序、無錨點附加）／卡片三態與檔名跳脫／
`objHtml`／`objJump`／`summonObject` 對其他型別原樣交還／`@` 只收 ready 且過濾別人的私人檔／
被引用次數含跨日與文件段落／**前端擋下來的字串與契約回傳的字串逐字相等**／
一批裡有壞檔時好的照上／CSS 無硬編碼色與手機斷點／生成檔 0 inline handler。

### 那 213 個 tsc 錯誤

`prisma generate` 仍跑不起來（`binaries.prisma.sh` 403）。P0 時是 12 個，
這次 `operating-store.service.ts` 的 `Promise.all` 多了一個回傳 `never` 的元素，
tuple 推導整串塌掉，於是同一個根因連鎖成 204 個。

以只宣告 `PrismaClient.operatingAsset` 的暫時 `.d.ts` 探針重跑：**0 errors**。
探針已刪除、未入庫。**Owner 在本機跑一次 `pnpm db:generate` 之後全部消失。**

## 還沒做 / 待 Owner

1. **`pnpm db:generate`** 與 **`pnpm db:deploy`**（同 P0，仍未套用 migration）。
2. **瀏覽器驗收**，沙箱做不到，全部要 Owner 在本機 `npm run dev` 走一次：
   - 拖放一張圖到某一行 → 該行下方出現 uploading 卡片，進度會動
   - ⌘V 貼上截圖 → 自動命名為 `截圖 MM-DD HH:mm.png`
   - `#` 打「附件」找得到；日誌欄頭「附件」按鈕在 390px 下可用且不爆版
   - 拖放檔案時不會誤觸區塊排序
   - 隔一天在另一行 `@` 同一個檔 → 同一個 id，R2 不產生第二份
   - 刪掉日誌那一行 → 檔案仍在物件索引
   - 四主題（white／orange／black／brand）下卡片、進度條、失敗態皆可讀
3. **D2 仍待決**（文件庫與金流是否收斂到同一張表）。在那之前會有
   「`@` 得到日誌的檔、`@` 不到文件庫的檔」這個已知的不一致。
4. **D3 影音 TTL**：目前 5 分鐘，長影片會播到一半 403。排 P2。

## 風險

- **`DB.assets` 只在上傳當下由前端 push，不進 diff 佇列。** 另一個席位同時上傳的檔案
  要等重新載入 store 才看得到。兩人工作台可接受；真的需要即時，走既有的 store 重讀。
- **重試依賴記憶體裡的 `File` 物件**。頁面重整後那個物件就沒了，卡片改成
  「重新選擇檔案」而不是假裝還能續傳。
- **停止條件**：若 P2 的 multipart 需要把 assets 納入 diff 佇列，或需要新增批次刪除，停下回報。
