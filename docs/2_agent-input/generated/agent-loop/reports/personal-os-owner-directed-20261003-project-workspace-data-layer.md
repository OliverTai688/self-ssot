# S2 Wave 1 證據報告：專案工作區資料層地基

- 日期：2026-10-03
- 計劃：`PLN-075` S2 / 整合決策 `INTEGRATION-DECISION.md`（Owner 已批准）
- 狀態：**完成，唯一未決項需在 macOS 執行 `pnpm db:generate`**

## 背景：本輪被橋接中斷切成兩段
Wave 1 執行中與使用者電腦的連線中斷約 70 分鐘，當時只有 `prisma/schema.prisma` 落盤，
migration 與集合契約卡在容器裡。連線恢復後以 `device_commit_files` 補齊，
並以 md5 核對 migration 內容一致（`484e4bd871bd87552ec80f12ebb13aa3`）。

## 改動清單
| 檔案 | 改動 |
|---|---|
| `prisma/schema.prisma` | 新增 5 model、9 enum；擴充 6 張既有表 |
| `prisma/migrations/20261003090000_project_workspace_resources/migration.sql` | 手寫，9 `CREATE TYPE` ＋ 5 `CREATE TABLE` ＋ 21 `ADD COLUMN` |
| `src/lib/ui-data/yuanzhan/operating-commands.ts` | 註冊 `folders`／`phaseCycles`／`chatChannels`／`chatMessages` |
| `src/lib/services/operating-commands.service.ts` | 新增 4 個 handler 並掛進 `HANDLERS` |

新 model：`ProjectFolder`、`ProjectPhaseCycle`、`ProjectChatChannel`、`ProjectChatMessage`、`ProjectChatAttachment`
新 enum：`ProjectFolderKind`(14)、`ProjectFolderVisibility`(3 級)、`ProjectStageKind`、`ProjectLifecycleStage`、`ProjectPhaseCycleStatus`、`ProjectTaskKind`、`ProjectReviewState`、`ProjectChatChannelKind`、`ProjectChatOrigin`

擴充欄位全部可空或帶預設，無刪欄、無改必填、無改型別。
**`OperatingProjectProfile.operatingStatus` 與 `ProjectDealStage` 一字未動**（獎金閘門③與金流推演讀它們）。

## Owner 決策落實
- OD-D：會議＝`Occasion` 加 `folderId?` ＋ `cautions?`，**未建 `ProjectMeeting`**
- OD-E：`OperatingAsset` 加 `projectId?`/`folderId?`/`filedAt?`/`derivatives`，**`FileAsset`／`MediaAsset` 零改動**
- OD-F：聊天室一列一訊息，**`OperatingThread` 零改動**
- 資料夾型別用 enum、可見性三級（第三級 `RESTRICTED_NO_INDEX` 為 `05/商城專案資訊.docx` 明文密碼所需）
- 寫入一律 `commit()` ＋ `opEnqueue`（`ARC-042`），**未開 Server Action 旁路**

## 驗證實測輸出
| 指令 | 結果 |
|---|---|
| `node scripts/check-prisma-structure.mjs prisma/schema.prisma` | **PASS** — `models=79 enums=68 relations=48` / `PASS prisma structural lint` |
| `node scripts/check-migration-coverage.mjs` | **PASS** — `migration coverage: 79 tables, 68 enums, all created by migrations` |
| `node scripts/check-operating-command-fields.mjs` | **PASS** — `operating command fields: 356 checks PASS against prisma/schema.prisma` |
| `node scripts/check-operating-persistence.mjs` | **PASS** — `operating persistence: all checks passed` |
| `node scripts/check-nested-card.mjs` | **PASS** — 新契約檔 0 筆；既有基線 143 筆 |
| `./node_modules/.bin/tsc --noEmit` | **15 errors，全部為預期** — 見下 |

### tsc 的 15 個錯誤全部同一類
全部是 `Property 'projectFolder' | 'projectPhaseCycle' | 'projectChatChannel' | 'projectChatMessage' does not exist on type 'PrismaClient'`，
全部落在新 handler（`operating-commands.service.ts:1411–1655`）。沒有任何其他錯誤
→ 代表 handler 除了「client 尚未重新產生」之外型別正確。

**`npx prisma generate` 在此環境跑不起來**：`binaries.prisma.sh ... 403 Forbidden`（代理允許清單擋下 linux-arm64 引擎下載）。
**刻意不強制繞過**：node_modules 是 macOS 安裝的（`schema-engine-darwin-arm64`），
在 Linux VM 產生 client 會覆寫成 linux 二進位檔，反而弄壞使用者本機的 `pnpm dev`。
→ **待辦（僅此一項）**：在 macOS 執行 `pnpm db:generate`，之後 15 個錯誤應全數消失。

## 未跑到的檢查
`ops:commands:check`／`ops:canvas:check` 等走 `tsx` 的項目在此 Linux VM 無法執行：
node_modules 只有 `@esbuild/darwin-arm64`，且代理擋下補裝。需在 macOS 補跑。

## 已知設計落差（S3 必須處理）
1. **`Project.lifecycleStage` 預設 `PROPOSING` 對進行中專案是錯的**。migration 刻意不回填。
   S3 必須補一次由 `deal_stage`／`phase` 推導的回填；**在那之前介面不得把這欄當權威顯示**。
2. **`ProjectFolder.path` 子樹重算**：handler 只算自己那一列，搬動帶子樹的資料夾時子孫 path 留在舊前綴。
   待 S3 的 `moveProjectFolder` 以一次子樹 UPDATE 補齊（`path` 無唯一鍵，不會讓任何列寫不進來）。
3. `ProjectPhaseNode` 用 `@@index([phaseCycleId, ordinal])` 而非設計稿的 `@@unique`，避免既有無期階段列被擋。
4. 額外加了 `ProjectTask.reviewerKey?` 與 `ProjectChatMessage` 雙身分欄位（抄 `OperatingComment`），
   以存住工作台送來的席位字串。任務書只列 `reviewerId?`，這是必要補充，全部可空。

## 安全邊界
全程**未連線正式資料庫**：沒有 `prisma migrate dev`／`deploy`／`reset`／`db push`／`db execute`。
migration 為手寫。未部署、未發信、未對外輸出。
