# 日誌檔案物件 P0：契約層（2026-09-28）

Owner 指示：「日誌可以從電腦或手機上傳圖片、文件（docx, xlsx, pdf, pptx）、音訊、影片，
存到 Cloudflare R2，而且我也可以 @ 他們。」先產出提案
（`journal-asset-upload-proposals.html`，repo root），Owner 指示「開始實作」。
本輪只做 **P0 契約層，無 UI 變化**。

## 為什麼 P0 是這個範圍

盤點之後，這件事已經做完一半：R2 的預簽上傳、瀏覽器直傳、席位檢查在
`R2STORE-002`／`003` 就通了，文件庫也已經把 `objectKey` 存在
`operating_library_files.versions[]` 裡。缺的不是「沒有地方存檔案」，而是三件事：

1. **檔案不是物件** —— 沒有自己的 id 與參考碼，所以進不了 `mentionHits()`、
   `@` 不到、物件索引也掃不到。
2. **白名單擋掉 docx／xlsx／pptx 與所有影音**，上限一律 5 MB。
3. **日誌沒有入口**，手機更沒有。

第 3 件是 UI（P1）。P0 把 1 與 2 的**契約**先立起來，這樣 P1 只要接介面，
不必同時改資料形狀與授權邊界。

## 做了什麼

### 一、新表 `operating_assets`

`prisma/schema.prisma` 新增 `OperatingAsset`；migration
`20260928120000_operating_assets`。**純新增，不改任何既有表，無回填。**
欄位刻意與 `SCH-005` 的 `FileAsset`／`MediaAsset` 對齊，未來若要合併不必改欄位名。

`refCode` 由**伺服器**指派（`AST-JRNL-000124-20260928`，`RES-018` 四段格式）。
這一點是照 `YZUI-020` 自己寫下的結論做的：`docObjectRefCode()` 把計數器放在前端記憶體，
每次重整、每個席位都從 `000001` 重來，撞號讓寫入佇列卡死並撞出一條渲染無限遞迴；
那份修法的「殘留缺口」一節寫著「要根治得把號碼改由伺服器指派」。
檔案物件從第一天就這樣做：續號取既有最大值，`ref_code` 的 UNIQUE 兜底，撞到就重試。
差別在於撞號會**失敗並重試**，而不是靜靜寫進兩列同號資料。

### 二、純契約模組 `src/lib/ui-data/yuanzhan/operating-assets.ts`

沒有 DOM、沒有 Prisma、沒有 `server-only` —— 與 `operating-commands.ts` 同一個理由：
沙箱裡唯一能真的執行的就是不依賴 I/O 的那一層。裡面是：kind 判定與白名單、
分級上限、multipart 門檻、object key 形狀、參考碼、狀態機、可見性判斷、孤兒判準。

前端與伺服器呼叫同一個 `classifyAsset()`，所以前端擋下來的理由與伺服器擋下來的
理由一字不差。前端那一道是為了不白跑一趟網路，伺服器那一道才是真正的那一道。

**分級上限（D1 保守版）**：圖片 25 MB／PDF・文件・試算表・簡報 50 MB／音訊 200 MB／影片 500 MB。
訂成分級而不是一個全域數字：25 MB 的圖是相機原圖，25 MB 的影片是一分鐘。

**multipart 門檻 64 MB**。門檻不是 R2 的能力上限（單次 PUT 吃得到 5 GiB），
而是「重傳一次會不會讓人想砸手機」—— 單次 PUT 沒有中繼點。P0 只立門檻，
multipart 本身排 P2。

**明確拒絕並說得出理由**：`.docm`／`.xlsm`／`.pptm`（巨集）、`.svg`（可內嵌腳本）、
舊版 `.doc`／`.xls`／`.ppt`（無法預覽也無法抽出內容）。使用者拿到的不是
「不支援此格式」，而是知道為什麼 `.docm` 不行而 `.docx` 行。

**舊白名單全數保留**（md｜txt｜csv｜json｜png｜jpe?g｜webp｜pdf），否則文件庫既有上傳會壞。

### 三、上傳路由改三件事

`src/app/api/company/operating/uploads/route.ts`：

- **POST 先建列、再發網址。** 順序是刻意的：先發網址再建列的話，使用者在兩者之間
  關掉分頁，R2 就多一份沒有任何一列指得到的 bytes —— 那是查不清也算不出來的儲存費。
  反過來最壞只是多一列 `uploading`，孤兒清理掃得到。回傳形狀向後相容
  （既有呼叫端只讀 `objectKey`／`uploadUrl`），另外多給 `assetId`／`refCode`／`kind`／`multipart`。
- **新增 PATCH finalize。** 伺服器回頭 `HeadObject` 對大小；對不上就標 `failed`。
  沒有這一步，「ready」的唯一依據就是前端說它傳完了 —— 而截斷的檔案在前端看起來
  與成功一模一樣。順便用 R2 回報的 `ContentType` 覆蓋前端送來的 MIME。
- **GET 改為查資料庫授權後才簽。** 見下。

### 四、補掉一個既有的授權漏洞

**原本的 GET 只檢查 `key` 開頭是不是 `operating/`。**
任何有席位的人拿到 key 就能換到下載網址，包含別人 `space:'personal'` 的私人文件。
這不是本輪新增的程式碼引入的，是既有的；但加入影音之後只會更值錢。

改法：`resolveDownloadGrant()` 成為唯一判定點。新檔案走 `operating_assets` 那一列，
規則與 `loadOperatingStore()` 讀文件庫時的 `OR: [{space:'team'}, {authorKey: in viewerSeatKeys}]`
同一條。舊檔案沒有那一列，所以改為「找得到引用它的那一列，而且那一列你看得到」
才放行，涵蓋三條舊路徑：文件庫版本（space／author 規則）、金流憑證
`OperatingTransaction.attachments`（團隊層級）、收件匣 `OperatingIntakeItem.file`
（成員只讀自己的、負責人讀全部）。**找不到任何引用的 key 一律拒絕**，
而不是像以前那樣放行。

### 五、孤兒清理與 finalize 接線

`scripts/cleanup-orphan-assets.ts`（`pnpm ops:assets:cleanup`，預設 dry run，
`-- --apply` 才動）。判準與 `isOrphanCandidate()` 同一條：`uploading` 且超過 24 小時
沒更新。先 `HeadObject` 問 R2 有沒有 bytes，沒有就只標 `failed`，不發多餘的刪除請求。

這支**必須與 P0 一起上，不能延後**：一列孤兒不痛，累積一年之後就是一筆算不出來、
也刪不掉的儲存費 —— 因為那時已經沒有人知道哪些 key 是垃圾、哪些是真的檔案。

配套：既有的兩條上傳路徑補上 finalize 呼叫，否則它們的列會永遠停在 `uploading`，
24 小時後被清理當成沒傳完的垃圾刪掉 bytes —— 檔案還在畫面上，bytes 卻已經不在。
`extensions.source.js` 的 `uploadFile()`（origin `library`）與
`cashflow-faces.source.js` 的 `cfReadFile()`（origin `cashflow`）各加一段
try/catch：成功呼叫 finalize，失敗回報 `outcome:'failed'`。兩者都是團隊自有檔案，
直接編輯後重新產生，未手改 `runtime.js`。

## 檔案

**新增**
- `src/lib/ui-data/yuanzhan/operating-assets.ts` — 純契約（288 行）
- `src/lib/services/operating-assets.service.ts` — 建列／finalize／下載授權／孤兒查詢
- `src/lib/storage/object-head.ts` — `headObject()`／`deleteObject()`
- `prisma/migrations/20260928120000_operating_assets/migration.sql`
- `scripts/verify-asset-pipeline.mjs` — 無瀏覽器、無 DB 的驗收 harness
- `scripts/cleanup-orphan-assets.ts`

**修改**
- `prisma/schema.prisma` — `OperatingAsset`
- `src/app/api/company/operating/uploads/route.ts` — POST 建列／PATCH finalize／GET 授權
- `src/components/yuanzhan/v5/extensions.source.js` — `presignUpload(file, extra)`、
  新增 `finalizeUpload()`、`uploadFile()` 接線、版本列多存 `assetId`／`refCode`
- `src/components/yuanzhan/v5/cashflow-faces.source.js` — `cfReadFile()` 接線
- `package.json` — `ops:assets:check`、`ops:assets:cleanup`
- 重新產生 `runtime.js`／`styles.ts`／`v5-seed.js`（未手改生成檔）

## 驗證結果

| 檢查 | 結果 |
|---|---|
| `node scripts/verify-asset-pipeline.mjs` | **42/42 PASS**（本輪新增） |
| `node scripts/check-prisma-structure.mjs prisma/schema.prisma` | PASS（models=74 enums=59 relations=35） |
| `node scripts/check-migration-coverage.mjs` | PASS — 74 tables、59 enums、全部由 migration 建立 |
| `node scripts/check-operating-command-fields.mjs` | 356 checks PASS |
| `node scripts/verify-object-index.mjs` | 19/19 PASS（無回歸） |
| `node scripts/verify-agenda-object.mjs` | 99/99 PASS（無回歸） |
| `node scripts/check-operating-persistence.mjs` | PASS（無回歸） |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS（523 handler templates） |
| `npx eslint`（本輪新增的 6 個檔） | **0 errors、0 warnings** |
| `npx eslint`（含兩支修改過的 `.source.js`） | 0 errors、76 warnings（皆為既有的 `no-unused-vars` 樣式） |
| `npx tsc --noEmit --pretty false` | **12 errors，全部同一個根因**，見下 |

### tsc 的 12 個錯誤是什麼

全部是 `Property 'operatingAsset' does not exist on type 'PrismaClient'`（11 個）
與它造成的一個推導失敗。原因是 `prisma generate` 跑不起來：
`binaries.prisma.sh` 在本機 VM 與雲端容器都回 403（組織 egress 政策，
`ui-verify-environment-setup.md` 已記錄過同一件事）。tsc 看到的 PrismaClient
型別因此還是加 model 之前的。

為了證明「除此之外沒有別的型別錯誤」，暫時放了一份只宣告
`PrismaClient.operatingAsset` 的 `.d.ts` 探針重跑 tsc：**0 errors**。探針已刪除，
未入庫。

**Owner 在本機跑一次 `pnpm db:generate` 之後，這 12 個錯誤會全部消失。**
在那之前，schema 欄位的正確性由 `verify-asset-pipeline.mjs` 的第 8 段守著
（解析 `schema.prisma`，比對服務層依賴的 24 個欄位與兩條 UNIQUE 是否存在）——
與 `check-operating-command-fields.mjs` 同一個理由、同一個做法。

## 還沒做、需要 Owner 的三件事

1. **`pnpm db:generate`**（本機）—— 解掉上面 12 個型別錯誤。
2. **`pnpm db:deploy`**（本機）—— 套用 `20260928120000_operating_assets`。
   **本輪刻意沒有套用**：`prisma migrate dev` 會 diff 整份 schema 而不是單一 migration，
   2026-07-22 就因此把 7 張無關的 AI Input 表意外套進線上資料庫
   （`MIG-003` 2026-07-22 addendum）。這次由 Owner 決定時機與方式。
3. **P0 沒有 UI 變化**，所以沒有瀏覽器驗收項；但既有兩條上傳路徑改了，
   Owner 應在本機確認**文件庫上傳**與**金流收件匣拍照上傳**仍然正常，
   且該列狀態變成 `ready`（而不是停在 `uploading`）。

## 仍待決（提案第十節）

D1 分級上限已採保守版落地，**可隨時改一個常數**。D2（文件庫／金流是否收斂到同一張表）
本輪只做「先建表給日誌與新上傳用」，收斂排 P4，**仍需明確點頭**。
D3（影音 TTL）、D4（Office 預覽級別）、D5（刪除語意，欄位已留 `deletedAt`）
在 P2／P3／P4 之前不影響本輪。

## 風險與停止條件

- 沒有動 `ARC-042` 的寫入佇列形狀（assets 不進 `PERSISTED_COLLECTIONS`，
  由路由直接寫）。P1 若需要把 asset 列納入 diff 佇列，那是另一個決定。
- 沒有新增任何批次寫入或刪除動作（`ARC-030 §8`）。孤兒清理是一支需要 `--apply`
  的本機腳本，不是產品介面上的動作。
- `scanStatus` 這一輪沒有接掃毒服務 —— 兩人內部使用，**這是已知且接受的風險**，
  開放客戶（`R2STORE-007`）之前必須補。
