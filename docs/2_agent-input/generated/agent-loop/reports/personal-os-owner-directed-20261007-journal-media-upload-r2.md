# 證據報告：日誌召喚上傳圖片／影片／音訊（Cloudflare R2）—— 修好入口、卡片內播放、真實往返驗證

2026-10-07 · repo `self-stucture-v1` · Owner 指派（對話中直接提出）

## Task

- Task ID：`ASSET-006`（`PLN-060` 單列，接續 `ASSET-001..005`）
- 作用畫面：`UI-088`（`/company/operating` · 日誌）Revision Mode；Owner 於本輪直接要求，未新增 UI ID
- Owner 原話：「實作公司日誌的召喚上傳圖片/影片/音訊的介面與功能部分，然後存在 cloudflare R2，實作後推到正式網站讓我驗收」

## Strategic Review

`ASSET-005`（2026-09-28）已經做過四道門、卡片與 `@` 引用，但那一輪的報告自己寫明「瀏覽器驗收，沙箱做不到」。
正式資料庫的 `operating_assets` 在本輪開始時是 **0 列** —— 上線九天，沒有任何一個檔案成功傳上去過。
所以這一輪不是加功能，是把一個從來沒有真的動過的功能做到會動，並留下第一份真實往返的證據。

需求理解分數：High（actor 與工作明確、契約與表都已存在、R2 與授權邊界在 `ASSET-001..003` 定過）。
研究基礎沿用 `journal-asset-upload-proposals.html` 與 P0／P1 兩份報告；本輪的三個檢視角度是
既有程式與資料（為什麼 0 列）、R2 實際行為（CORS、Range、簽名）、瀏覽器實測。

## 為什麼從來沒有成功過

1. **選檔視窗是壞的。** `astOpenPicker()` 以 `openModal({ title, sub, body })` 呼叫，而 `openModal` 收的是
   四個位置參數。畫面上是標題 `[object Object]`、內文空白、頁尾一顆 `undefined`，沒有任何按鈕。
   `#` 附件與欄頭「附件」兩道門都開到這個視窗 —— 手機唯一可靠的入口整個不能用。
   當時的 harness 把 `openModal` 換成只數次數的樁，所以「有呼叫到」就算通過。
2. **重試必定失敗。** 重試會另建一列、拿到新的 key，卻把檔案傳到舊 key，再拿新的那一列去核對 → 找不到檔案。
   而且日誌那一行存的是舊參考碼，舊列已被標成 `failed`，重新整理後卡片變成「檔案已刪除」。
3. **每傳一個檔案多一列孤兒。** `astUpload()` 開頭又要了一次預簽，伺服器因此多建一列永遠停在 `uploading` 的資料。
4. **影片與音訊在日誌裡看不到也播不了。** 雙欄日誌把物件收成一顆膠囊（`.jc … .eb-obj`），卡片主體與下面那一列被藏掉；
   影音只能點進抽屜才播，傳到一半或失敗的檔案連進度與「重試」都看不到。
5. **下載會把人帶離工作台。** 預簽網址與工作台不同源，`<a download>` 對它無效，瀏覽器直接在同一個分頁把檔案打開。
6. **沒有型別的檔案會被 R2 拒絕。** Content-Type 簽進網址，而手機錄的 `.mov`、部分系統的 `.m4a`／`.wav`
   `file.type` 是空字串，簽的與送的對不上。

R2 本身沒有問題：以預簽網址送 preflight 探測，正式站的來源 `https://www.person.yzedtech.com`
（以及 `https://person.yzedtech.com`、`http://localhost:3000`）的 `PUT`／`GET`／`HEAD` 都放行
（允許標頭 `content-type`），既有物件的 Range 讀取回 206。

## Changes

**前端** `src/components/yuanzhan/v5/asset-object.source.js`、`asset-object.css`

- 選檔視窗改用正確的 `openModal(標題, 說明, 內文, 頁尾)`，攤開 圖片／影片／音訊／其他檔案；
  觸控裝置多「拍照」「錄影」（`capture`）。
- `#` 召喚多三項：`#image` 圖片、`#video` 影片、`#audio` 音訊，選了直接開系統選檔視窗；`#asset` 附件保留。
- 影片與音訊卡片內直接播放（原生控制項）；圖片是縮圖。這三種與「上傳中／失敗」是整張卡片，其餘檔案維持膠囊。
- 播放器節點跨 `render()` 保留：整頁重畫後在同一個 task 接回去，正在播的影片不會被旁邊的操作切斷。
- 短效網址快取 4 分鐘（伺服器簽 5 分鐘），縮圖不再每次重畫就重新下載；
  播放途中網址過期會自動換一張、從原位置接著播；格式瀏覽器解不開時說得出來並給下載。
- 這一頁剛傳的檔案用本機那一份預覽與播放（blob），不必為了看自己剛選的檔再下載一次。
- 上傳只要一次預簽；可取消；重試沿用同一列與同一個參考碼。百分比數字跟著進度條更新。
- 下載改走附件簽名。

**伺服器**

- `src/app/api/company/operating/uploads/route.ts`：`POST` 接受 `retryOf`（重新開放同一列的上傳）；
  回傳簽進網址的 `contentType`；`GET ?download=1` 簽成附件，檔名取資產列上的 `displayName`，不收前端送來的。
- `src/lib/services/operating-assets.service.ts`：`reopenAssetUpload()`；`DownloadGrant` 帶回 `displayName`。
- `src/lib/storage/presigned-url.ts`：`createDownloadUrl()` 可帶 `downloadName`（RFC 5987，中文檔名）。
- `src/lib/ui-data/yuanzhan/operating-assets.ts`：`resolveAssetContentType()`（副檔名 → Content-Type）。

`runtime.js`／`styles.ts` 由 `node scripts/generate-yuanzhan-v5.mjs` 重新生成，未手改；未動 `source-patches.mjs`。
**沒有 schema 變更，沒有 migration。** 授權邊界不變：下載仍由 `resolveDownloadGrant()` 查資料庫後才簽。

## Verification

### 真實往返（本機 `localhost:3000`、database 模式、正式 R2 bucket）

以開發用的 mock 登入（`test@yzedtech.com`）開啟工作台，在瀏覽器裡產生三個檔案拖進日誌：

| 檔案 | 結果 |
|---|---|
| PNG 15.7 KB | `POST` 200 → 瀏覽器直傳 R2 → `PATCH` 200 `ready`，`sizeBytes` 與 R2 回報一致 |
| WebM 5.8 KB | 同上；卡片內播放，`duration` 1.03 s、`videoWidth` 640 |
| WAV 32 KB（`file.type` 為空） | 伺服器補成 `audio/wav`，上傳與 finalize 通過 |

- 每個檔案**一次** `POST`、一次 `PATCH`；資料庫正好四列（含下面那一筆），沒有孤兒列。
- **重新整理後讀回**：`@` 選單列得出三個檔案；嵌入後圖片、影片、音訊都從 `r2.cloudflarestorage.com` 的短效網址載入並可播放。
- **取消與重試**：6 MB 的 WAV 傳到一半取消 → 卡片顯示「已取消上傳」→ 重試 → `ready`，參考碼不變（`AST-JRNL-000004-…`）。
- **不中斷播放**：影片播放中觸發整頁重畫，同一個節點、仍在播放、時間繼續前進；按播放器不會打開抽屜。
- **抽屜**：大圖與播放器正常，註明存放在 Cloudflare R2。
- **下載**：`Content-Disposition: attachment; filename*=UTF-8''…`（中文檔名），Range 回 206。
- **授權**：不存在的 key 回 `not_found`，`../etc/passwd` 回「無效的檔案位置」。
- **手機寬度 375**：選檔視窗六種選法不溢出、影片卡片寬度 265／375，頁面沒有橫向捲動。

測試期間以頁面內的 fetch 攔截擋下 `commands` 寫入，確認**沒有任何日誌列、命令紀錄寫進正式資料庫**（事後查詢為 0）。
留下的四列測試資產已軟刪除（`deleted_at`）；對應的四個 R2 物件（共 6.3 MB，檔名皆為「上傳驗證-…-可刪」）仍在 bucket。

### 機檢

| 檢查 | 結果 |
|---|---|
| `pnpm ops:assets:object:check` | 73/73（原 51，新增 22；拿修正前的模組跑會在選檔視窗那一條失敗） |
| `pnpm ops:assets:check` | 42/42 |
| `pnpm ops:journal-space:check` | 9/9 |
| `pnpm ops:day-state:check` | 34/34 |
| `pnpm ops:links:check` | 24/24 |
| `pnpm project:ui:check` | 79/79（專案硬碟沿用 `astPut`，簽名相容） |
| `node scripts/verify-object-index.mjs` | 19/19 |
| `pnpm exec tsc --noEmit --pretty false` | 0 errors |
| `pnpm build` | exit 0 |

## NANDA / Agent Protocol Alignment

不適用：未觸及 AI agent 能力、路由或註冊。

## Remaining Risks

- **正式站尚未由 Owner 驗收**：本輪的真實往返在本機對正式 R2 bucket 完成，CORS 也探測過正式網域放行；
  部署後 `https://www.person.yzedtech.com/api/company/operating/uploads` 未登入回 401（路由已上線、有守門）。
  但沒有登入正式站實際操作，正式站的 R2 環境變數是否齊全只能由那裡的第一次上傳確認。
- **大檔沒有分段上傳**：超過 64 MB 仍是單次 PUT，掉線就整份重來（R2 單次上限 5 GiB，不是不能傳，是不能續傳）。
- **個人空間**：在 database 模式下日誌文字不保存（`JRNL-INC-001`），所以在個人空間上傳的檔案會存成私人物件、
  進物件索引，但日誌那一行重新整理後不在。
- **HEIC 與部分 `.mov`（HEVC）**：收得進來，Chrome 可能顯示或播放不了；卡片會說明並提供下載。
- **掃毒仍未接**（`ASSET-001` 既有的已知風險，兩人內部使用）。
- 既有的 `@` 引用提交會連帶送出一筆 `txns/update`（`stampAuthors` 的副作用）——本輪看到、未處理。

## Next

Owner 於正式站驗收：`#` 輸入「圖片／影片／音訊」各傳一個、重新整理後確認仍在並可播放、手機用「附件 → 拍照／錄影」。
下一列建議：大檔分段上傳（`ASSET-007`）。
