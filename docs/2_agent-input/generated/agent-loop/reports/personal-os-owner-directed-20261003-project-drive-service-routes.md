# S2 Wave 2b 證據報告：專案雲端硬碟服務層、route handler 與驗證腳本

- 日期：2026-10-03
- 計劃：`PLN-075` S2 第 4、5 項（整合決策 `INTEGRATION-DECISION.md` §5「檔案」分頁、§6 寫入路徑）
- 前置：Wave 1 的 schema／migration（`reports/personal-os-owner-directed-20261003-project-workspace-data-layer.md`）
- 平行：Wave 2a 的 `project-capability.service.ts`（本輪只 import，未修改）
- 狀態：**完成。唯一待辦是在 macOS 執行 `pnpm db:generate`。**

---

## 1. 改動清單

| 檔案 | 狀態 | 說明 |
|---|---|---|
| `src/lib/services/project-drive.service.ts` | **新增**（1,630 行） | 資料夾樹服務層 ＋ bytes 管線 |
| `src/app/api/company/operating/drive/route.ts` | **新增** | 資料夾樹 BFF，三動詞 |
| `src/app/api/company/operating/drive/uploads/route.ts` | **新增** | bytes BFF，三動詞，與既有 `uploads/route.ts` 同形 |
| `scripts/verify-project-drive.mjs` | **新增** | 140 條離線檢查，不連 DB／不連 R2 |
| `package.json` | 只加一行 | `"ops:drive:verify": "node scripts/verify-project-drive.mjs"` |

**未觸碰**（任務書列為他人所有或唯讀）：`prisma/**`、`project.service.ts`、
`project-capability.service.ts`、`src/lib/ui-data/**`、`operating-commands.service.ts`、
`src/components/**`、`src/lib/storage/**`。

---

## 2. 服務層 API

### 資料夾樹
| 函式 | capability | 說明 |
|---|---|---|
| `listProjectFolderTree(profileId, projectId)` | `drive:read` | 整棵樹、每夾 `fileCount`／`fileCountDeep`、`indexable`、`unfiledCount` |
| `listFolderContents(profileId, folderId)` | `drive:read` | 夾內檔案清單 ＋ 索引政策 |
| `ensureProjectRootAndInbox(projectId, workspaceId)` | 內部 bootstrap | 冪等，advisory lock 保護 |
| `createProjectFolder(profileId, projectId, {parentId,name,kind,visibility,note,space})` | `drive:write` | |
| `renameProjectFolder(profileId, folderId, name)` | `drive:write` | **不動 `path`** |
| `moveProjectFolder(profileId, folderId, newParentId)` | `drive:write` | 一次子樹 UPDATE |
| `setProjectFolderVisibility(profileId, folderId, visibility)` | `drive:write` | 收緊會往下傳 |
| `softDeleteProjectFolder(profileId, folderId)` | `drive:write` | 整個子樹一次 UPDATE |
| `fileAssetIntoFolder(profileId, assetId, folderId)` | `drive:write` | 只改 `folderId`／`filedAt` |
| `writeAssetExtractedText(profileId, assetId, text)` | `drive:write` | 全文索引的唯一入口，過不得索引守門 |

### bytes（沿用既有形狀）
`createProjectDriveUpload` → `finalizeProjectDriveAsset` ／ `failProjectDriveAsset` ／
`resolveProjectDriveDownloadUrl`。全部走 `src/lib/storage/{presigned-url,object-head,r2-client}.ts`，
**沒有另造一套**，也沒有 import 任何會搬／刪／寫 bytes 的 S3 command（verify 有靜態斷言）。

### 純函式區（哨兵 `PROJECT-DRIVE-PURE:BEGIN/END`）
`normalizeFolderName`／`validateFolderName`／`findSiblingNameConflict`／`buildFolderPath`／
`depthForPath`／`isWithinSubtree`／`rewriteSubtreePath`／`strictestAncestorVisibility`／
`inheritVisibility`／`evaluateVisibility`／`resolveIndexingPolicy`／`indexingRefusalReason`／
`planFolderMove`／`planFolderSoftDelete`／`planAssetFiling`／`sanitizeKeyExtension`／
`buildProjectDriveObjectKey`／`isWellFormedProjectDriveKey`／`buildFolderTree`／`ancestorsFromPath`。

這一區刻意不含 import、不碰 `db`，驗證腳本把它**原文抽出來實際執行**
（做法同 `check-operating-persistence.mjs`：不抄第二份邏輯）。哨兵不見了腳本當場失敗，
而不是靜靜少測幾條。

---

## 3. workspaceId 的解析方式（OD-C）

`resolveProjectWorkspaceId(profileId, projectId)`：先讀 `Project.workspaceId`，為空時退回
Wave 2a 的 `resolveOwnerWorkspaceId(profileId)`，仍為空則丟 `no_workspace`。
**不在這裡回填 `Project`** —— 回填是 `project.service.ts` 的 `ensureProjectWorkspace()`（Wave 2a 所有）。

route 層更進一步：前端若送 `workspaceId`（body 或 query）**當場退 400 `workspace_id_not_accepted`**，
而不是靜靜忽略。靜靜忽略會讓呼叫端以為指定成功了，於是在別的地方也照送。
`uploads` route 同理拒絕前端送來的 `objectKey`／`key`（`object_key_not_accepted`）。

---

## 4. 子樹 path 重算（補 Wave 1 落差②）

Wave 1 的 handler 只算自己那一列，搬動帶子樹的資料夾之後子孫的 `path` 留在舊前綴 ——
樹看起來沒事（UI 讀 `parentId`），但任何以 `path` 前綴做的子樹查詢
（可見性繼承、索引政策、批次授權）全部靜靜算錯。

實作為**一條** SQL，在 advisory lock 的交易內：

```sql
UPDATE project_folders
   SET parent_id = CASE WHEN id = $folder THEN $newParent ELSE parent_id END,
       path  = $newPrefix || substr(path, length($oldPrefix) + 1),
       depth = depth + $delta,
       updated_at = now()
 WHERE project_id = $project AND deleted_at IS NULL AND path LIKE $oldPrefix || '%'
```

`parent_id` 用 `CASE` 折進同一句，所以**真的只有一條 UPDATE**，不是「一條加一次 update」。
逐列更新會在半途被任何錯誤切成「一半新前綴、一半舊前綴」，比沒搬成功更糟。
`LIKE` 前綴是 `/uuid/uuid/` 形狀（無 `%`／`_`，不需 escape）；`path` 頭尾都有 `/`，
所以前綴比對不會把 `…0005/` 當成 `…00055/` 的祖先（verify 有這一條）。

軟刪用同一把尺：`SET deleted_at = now() … path LIKE prefix || '%'`。

**怎麼驗的**：`planFolderMove()` 回傳子樹每一列搬完該長的樣子，腳本對它斷言
—— 沒有任何一列留在舊前綴、每一列都以新前綴開頭、最深那一列的 `path` 與 `depth` 精確值、
`depth` 一律由 `path` 重算（不靠 delta 猜）、`rewriteSubtreePath()` 與
SQL 的 `newPrefix || substr(path, n)` 等價、前綴對不上的列原封不動（模擬 `LIKE` 不選它）。
**Prisma 真的跑過那一句 SQL 這件事驗不到**，需要 Owner 在本機以可丟棄 DB 確認。

---

## 5. 可見性三級的守門規則

`evaluateVisibility()` 是建立／改可見性／搬移**共用**的單一判定點，兩條規則：

1. `CONTRACT`／`INTERNAL`／`FINANCE` 永遠不得 `CLIENT_VISIBLE`（schema 註解的執行點）。
2. **不得比最嚴的祖先寬**（rank：`CLIENT_VISIBLE` 0 < `INTERNAL_ONLY` 1 < `RESTRICTED_NO_INDEX` 2）。
   這條涵蓋任務書點名的那一條，並額外擋住 `RESTRICTED_NO_INDEX` 之下冒出 `INTERNAL_ONLY` 這種半放寬。

未指定可見性時子夾**繼承父夾**；沒有父夾時落到最保守的 `INTERNAL_ONLY`。
不認得的等級一律拒絕（deny-by-default）。
搬移走同一條規則：把 `CLIENT_VISIBLE` 的夾搬進 `INTERNAL_ONLY` 底下，效果等同直接放寬，所以同樣拒絕。
收緊的方向則會**往下傳**（同一筆交易把子樹裡比它寬的列拉到同一級），
否則不變量只在寫入時成立，讀取端得每次自己走祖先鏈 —— 漏走一次就是一次外洩。

### `RESTRICTED_NO_INDEX` 做成明確守門，而不是只存一個 enum 值
- `resolveIndexingPolicy({folder, ancestors})` → `{ indexable, blockedBy, reason }`，
  **看整條祖先鏈**。只看自己會漏掉這個形狀：`05/`（`RESTRICTED_NO_INDEX`）底下開一個
  `GENERIC` 子夾，子夾自己是 `INTERNAL_ONLY`，於是 `商城專案資訊.docx` 的明文密碼就進了索引。
- `indexingRefusalReason(policy)` → 可以時回 `null`，不可以時回人看得懂的理由。
- `writeAssetExtractedText()` 是寫 `extractedText` 的**唯一入口**，擋下來時丟
  `ProjectDriveIndexingBlockedError`，**不是安靜地不寫** —— 安靜地不寫會讓下一個人
  以為索引壞了，於是把守門繞過去。
- 歸檔進不得索引的子樹時，`planAssetFiling()` 把**既有**的 `extractedText` 清成 `null`；
  把一個夾改成 `RESTRICTED_NO_INDEX` 時，同一筆交易清掉整個子樹的 `extractedText`。
  「以後不要再抽」不夠：先前抽好的明文已經在那一欄裡了。
- `buildFolderTree()` 在同一次 DFS 把整個敏感子樹標成 `indexable: false`，UI 讀得到。

---

## 6. R2 key 策略與中文檔名

`operating/{workspaceId}/project/{projectId}/{yyyy-mm}/{uuid}{ext}`（`RES-033` §R2 key 策略／`PLN-075`）。

三件事刻意不做：
- **資料夾路徑不進 key**。R2 無 server-side rename，搬一個夾就得複製整個子樹的 bytes；
  位置的真相是 DB 的 `OperatingAsset.folderId`。
- **原檔名不進 key**。`sanitizeKeyExtension()` 只取最後一段副檔名，小寫、濾掉非 `[a-z0-9]`、
  上限 8 字。`商城專案資訊.docx` → `….docx`；`報價單．ＰＮＧ` → 無副檔名（全形被濾乾淨）；
  `REPORT.PDF` → `.pdf`；`../../etc/passwd.png` → `.png`。
  中文／全形在 SigV4 會變成查不出原因的 403，而使用者送來的路徑是目錄穿越最常見的入口。
- **不接受前端送來的 key 或 uuid**。`workspaceId`／`projectId`／`uuid` 都驗 UUID 形狀，不對就丟。
  產出的 key 再過一次 `isWellFormedProjectDriveKey()`（純 ASCII `[A-Za-z0-9/_.-]`、無 `..`、
  無 `//`、≤1024、形狀正則），不合法就丟而不是回一個怪 key。

下載路徑先查「這個 key 屬於哪一列、那一列在不在這個專案」再簽，不只檢查前綴 ——
只檢查前綴等於「有席位就能下載任何檔案」，那個洞在
`claude/journal-asset-upload-r2-proposals.md` 已經記過一次。

**已知取捨**：`refCode` 沿用既有 `AST-{JRNL|LIB|CASH}-…` 格式，專案檔案記成 `library`（`LIB`）。
加一個 `PROJ` token 需要改 `src/lib/ui-data/yuanzhan/operating-assets.ts` 的
`ASSET_REF_CODE_PATTERN`，那個檔不在本 wave 的所有權內，留給後續 wave 決定。

---

## 7. route 的動詞

### `/api/company/operating/drive`（資料夾樹）
| 動詞 | 行為 |
|---|---|
| `GET ?projectId=` | 整棵樹 ＋ 每夾計數 ＋ 待整理數 |
| `GET ?projectId=&folderId=` | 夾內檔案 ＋ 索引政策 |
| `POST {projectId, action:"bootstrap"}` | 冪等建 ROOT ＋ INBOX |
| `POST {projectId, name, parentId?, kind?, visibility?}` | 建資料夾（201） |
| `PATCH {action:"rename"\|"move"\|"visibility"\|"delete"\|"file", …}` | 改名／搬移／改可見性／軟刪／歸檔 |

一個 `PATCH` 五個 `action`，刻意不切成五條路由：它們共用同一套授權、同一套錯誤分類、
同一棵樹的鎖，分開只會讓四份重複。

### `/api/company/operating/drive/uploads`（bytes，與既有 `uploads` 同形）
`POST` 預簽 PUT ＋ 列先建｜`PATCH` finalize（`headObject()` 核對大小，對不上就 `failed`）｜
`GET` 5 分鐘下載網址。

錯誤對映：401 未登入／403 `capability_denied`／404 `project_not_found` 與找不到列／
409 規則衝突（撞名、環、不得放寬、系統夾、不得索引）／400 輸入不合法／422 finalize 核對失敗／
500 其他（訊息不外洩）。`ProjectCapabilityError` 的 `code` 分開對映 404 與 403；
名稱比對是最後一道 fallback，**預設拒絕不是放行**。

---

## 8. 驗證實測輸出

```
$ node --check scripts/verify-project-drive.mjs
（無輸出＝通過）

$ node scripts/verify-project-drive.mjs
…（140 行 ok）
project drive: 140/140 checks passed

$ npm run ops:drive:verify --silent
project drive: 140/140 checks passed

$ ./node_modules/.bin/tsc --noEmit --pretty false 2>&1 | grep -c "error TS"
42

$ ./node_modules/.bin/tsc --noEmit --pretty false 2>&1 | grep "error TS" | sed -E 's/\(.*//' | sort | uniq -c
     15 src/lib/services/operating-commands.service.ts      ← Wave 1 既有基線
     27 src/lib/services/project-drive.service.ts           ← 本輪，全部同一個根因

$ ./node_modules/.bin/eslint <本輪四個檔案>
（無輸出＝0 error 0 warning）
```

### 140 條檢查的分佈
| 區塊 | 條數 | 內容 |
|---|---|---|
| 純函式區自檢 | 2 | 不含 import、不碰 db（哨兵抽取法的前提） |
| 樹的 CRUD 不變式 | 28 | 單根、計數捲起、孤兒可見、同層撞名（同名／大小寫／空白／軟刪／跨層）、NFC 非 NFKC、名稱驗證 6 條、環 2 條、跨專案、系統夾、撞名、noop、無父夾、前綴比對 2 條 |
| 子樹 path 重算 | 12 | 前綴、列數、無列留在舊前綴、全列新前綴、最深列 path／depth、depth 由 path 重算、delta、與 SQL 等價、LIKE 不選到的列、深度上限 |
| 可見性三級 | 14 | 繼承 3 條、放寬拒絕 3 條、收緊允許、三種 kind 禁 client、未知等級、搬移同規則、rank 方向、最嚴祖先 |
| 不建索引守門 | 7 | 自己、祖先、一般夾、理由字串、可索引回 null、整子樹標記、其他夾不受影響 |
| 歸檔只改 DB | 14 | 成立、**r2Operations 為空** 2 條、只寫 folderId/filedAt、objectKey/bucket/sizeBytes/status 不動、白名單、filedAt 不偷讀時鐘、補 projectId、跨專案、未 ready、已刪檔、已刪夾、清抽文字 2 條 |
| 軟刪 | 4 | 系統夾、非空拒絕、整子樹、前綴 |
| R2 key | 21 | 形狀、ASCII、中文不進 key 2 條、全形 2 條、大寫、路徑不進 key 2 條、多個點、無副檔名、sanitize 2 條、假 uuid、壞 workspaceId、isWellFormed 5 條、key 段數 |
| 靜態來源檢查 | 38 | 兩個 route × 7 條（不讀 body/query 的 workspaceId、退 400、requireUser、no-store、capability 404/403 分流、fallback 拒絕）＋ objectKey 拒絕 ＋ 服務層 13 條 capability 守門 ＋ R2 command 禁 import ＋ 沿用三個既有形狀 ＋ 一條子樹 UPDATE 3 條 ＋ 無 Server Action 旁路 ＋ workspaceId 自解析 |

### 未因本輪而退步的既有檢查
```
node scripts/check-prisma-structure.mjs prisma/schema.prisma   → PASS (models=79 enums=68)
node scripts/check-migration-coverage.mjs                      → PASS
node scripts/check-operating-persistence.mjs                   → PASS
node scripts/check-nested-card.mjs                             → PASS（基線 143，本輪 0 新增）
```

---

## 9. tsc 的 27 個錯誤分類

**全部同一個根因：`PrismaClient` 尚未重新產生（Wave 1 已記錄的唯一待辦）。沒有任何真錯。**

| 類別 | 條數 | 樣本 | `pnpm db:generate` 後 |
|---|---|---|---|
| A. 新 delegate 未產生 | 3 | `Property 'projectFolder' does not exist on type 'PrismaClient'`（730, 878, 1189 行） | 消失 |
| B. `OperatingAsset` 的四個新欄位未產生 | 22 | `'projectId' does not exist in type 'OperatingAssetWhereInput'`／`'filedAt' does not exist in type 'OperatingAssetSelect'`／`'folderId'` 不在 `OperatingAssetScalarFieldEnum`（806, 837, 1201, 1230, 1285, 1329, 1453, 1498, 1558, 1580, 1612, 1621 …） | 消失 |
| C. B 的連鎖推導 | 2 | 805 行 `groupBy(by:["folderId"])` 的回傳型別推不出來 → 811 行 `row._count` possibly undefined、`_all` 不存在 | 消失 |
| D. B 的連鎖推導（select 被忽略） | 2 | 1301 行 `missing projectId, folderId`、1629 行 `missing filedAt` —— `select` 的鍵報錯後 TS 退回完整 model 型別 | 消失 |

**capability 服務尚未存在的錯誤：0 條。** Wave 2a 已在 `06:08` 落地
`src/lib/services/project-capability.service.ts`，簽章與契約一致
（`assertProjectCapability`、`resolveOwnerWorkspaceId`、八條 `ProjectCapability`），
本輪只 import 並額外接上它的 `ProjectCapabilityError.code` 分流。

**刻意不用 `as unknown as` 把 A 類錯誤蓋掉**：那會讓這些查詢在 client 產生之後
永遠失去型別檢查。新 delegate 的取用集中在 `folderTable()` 一個點，所以錯誤是
3 條而不是散落幾十條，且 generate 之後整段自動恢復完整型別。

---

## 10. 本輪未做與已知限制

1. **`pnpm db:generate` 必須在 macOS 執行**（Wave 1 同一結論：此 Linux VM 的代理擋下
   `binaries.prisma.sh` 的引擎下載，而 `node_modules` 是 macOS 安裝的，在這裡產生 client
   會覆寫成 linux 二進位檔並弄壞本機 `pnpm dev`）。
2. **未連正式資料庫**：沒有 `prisma migrate dev`／`deploy`／`reset`／`db push`／`db execute`／
   `generate`。**未對 R2 上傳或刪除任何東西。** 未部署、未發信、未對外輸出。
3. `ops:check` 內走 `tsx` 的項目（`check-operating-commands` 等）在此 VM 跑不起來
   （只有 `@esbuild/darwin-arm64`），需在 macOS 補跑。`ops:drive:verify` 是純 node，可直接跑。
4. **`scripts/verify-asset-pipeline.mjs` 目前 41/42（`FAIL 每個 @map 欄名都出現在 migration SQL
   — project_id, folder_id, filed_at`）**。這是 Wave 1 造成的既有狀態（開工前即如此，非本輪）：
   該檢查只比對 asset 那一份 migration，而四個新欄位寫在 Wave 1 的
   `20261003090000_project_workspace_resources`。該腳本不在本 wave 的所有權內，
   修法是讓它同時讀後續 migration。
5. multipart 續傳（>64 MB）本輪未做，沿用 `PLN-064` 的 P2 分期。
6. 這一支**驗不到**：真實 R2 round trip、預簽網址的 403、Prisma 真的跑過那句子樹 UPDATE、
   `(parent_id, name_normalized)` UNIQUE 在併發下的行為、瀏覽器互動。
   需 Owner 在本機操作，**在那之前不宣稱驗證完成**。
7. `ProjectFolder` 的 `(parent_id, name_normalized)` UNIQUE 在 `parent_id IS NULL`
   時擋不住重複（Postgres 視 NULL 互不相等），所以 ROOT 的唯一性靠
   `ensureProjectRootAndInbox()` 的 advisory lock，不是靠 DB 約束。

---

## 11. Owner 可自行跑的檢查

```bash
# 1) 離線契約（這台 Linux VM 已跑過，140/140）
npm run ops:drive:verify

# 2) 型別：generate 之後 42 應降到 0
pnpm db:generate
pnpm exec tsc --noEmit --pretty false | grep -c "error TS"

# 3) 其餘 ops:check（需 macOS 的 tsx／esbuild）
pnpm ops:check
```
