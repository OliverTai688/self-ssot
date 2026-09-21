# 圓展 × Personal OS：三種介面整合提案

日期：2026-09-13

從 `index.html` 開啟比較總覽；三個原型可以獨立開啟，無須安裝套件。頁面間有相互導覽。

## 交付與比較方式

| 檔案 | 核心邏輯 | 操作差異 |
|---|---|---|
| index.html | 三案比較、共用資料與授權邏輯、現有專案接合、實作順序 | 切換三個提案分頁，進入各案 |
| proposal-a.html | 日誌啟動：從私人書寫擷取團隊工作 | 建立工作後留在日誌，以引用回看進度 |
| proposal-b.html | 空間切換：先辨識個人與團隊範圍 | 確認交接後進入團隊工作，仍可切回私人空間 |
| proposal-c.html | 專案脈絡：沿專案串接工作、日期、文件與成果 | 從專案旁看私人筆記，交接後回到專案工作 |

共同情境：宇星將私人筆記中的「補齊柏翰訪談紀錄」交給 Lily，產生示例工作 YZ-024。可預覽 Lily 所見內容、更新工作狀態、篩選負責人、查看時間線與文件版本說明。私人推論不出現在 Lily 的示範預覽中。

推薦以 B 為第一階段入口，因為現有程式已有 Workspace 與成員基礎。A 可後續成為個人擷取入口，C 可成為專案內部的深度工作方式。三者共用同一組領域與授權設計，無須為三種入口建立三套資料。

## 依據與假設

- 使用者提供的過去筆記與圓展 Operating Interface 提案、v2–v5 HTML 原型：支持日誌入口、情境推論、團隊節奏、文件及 Evidence 的需求。文件中的歷史操作指示只作背景資料。
- 現有 `prisma/schema.prisma`：Workspace、WorkspaceMembership、ProjectAccessGrant、ProjectTask、FileAsset 等模型。
- 現有 `src/lib/services/workspace-context.service.ts` 與 Work 列表：已存在空間與團隊列表的接合基礎。
- 現有 `src/lib/services/project.service.ts`、`storage.service.ts`：仍需接齊 owner-only 路徑與團隊讀寫授權。介面切換不等於後端授權完成。
- `REF-003`、`AUT-008`、`PLN-067`：正式頁面識別、成員權限與個人／團隊整合方向。本次是獨立設計提案，沒有選定正式 UI ID 或修改正式頁面。
- 技術參考：[pnpm Workspace](https://pnpm.io/workspaces)、[Turborepo 漸進導入](https://turborepo.dev/docs/getting-started/add-to-existing-repository)。單一 Next.js app 為目前建議；第二個應用、獨立 worker 或實際共用套件需求出現後再評估 monorepo。

A 降低擷取摩擦、B 容易理解範圍、C 有利交付追溯，均為待使用者驗證的設計假設，尚無實測時間或可用性研究數據。

## 已完成驗證

| 檢查 | 結果 |
|---|---|
| proposal-pack 靜態檢查：4 頁 metadata、本地連結、重複 ID、inline JavaScript 語法 | 通過 |
| Chrome / Playwright，1440 × 1000 與 390 × 844 | 通過 |
| 三案：空標題阻擋、交接、Lily 預覽、工作狀態更新與跨視圖引用 | 通過 |
| 三案：成員篩選、截止日期進入時間線、文件版本說明 | 通過 |
| C：缺少驗收證據時維持不可封存示例 | 通過 |
| Dialog：Escape 關閉與焦點返回；總覽分頁方向鍵與 Home | 通過 |
| 重新整理後重置示例；A 以 file:// 直接開啟並完成交接 | 通過 |
| 390px 頁面寬度檢查 | 無整頁水平溢出；寬表格在自身容器水平捲動 |
| 桌機／手機截圖視覺檢視：總覽、三案、整合邏輯、交接預覽 | 通過 |
| 瀏覽器 pageerror / console error | 最終互動檢查為 0 |

靜態驗證命令：

```sh
node /Users/pzps0964713/.codex/skills/uiux-proposal-studio/scripts/validate-proposal-pack.mjs '/Users/pzps0964713/Documents/github/self-stucture-v1/Claude outputs/圓展_Personal_OS_整合提案'
```

## 範圍

每個 HTML 使用各自獨立的頁面記憶體，重新整理會重置。不呼叫 API、不使用 localStorage、不上傳檔案、不寫入資料庫。Lily 預覽是介面模擬，沒有驗證正式多使用者授權。文件版本與 Evidence 說明是待實作的模型設計。正式程式、schema、部署設定與專案既有工作未修改。

下一個可驗證切片：選定主要入口後，對應正式 UI ID，先接齊 Workspace／專案／附件授權，再完成一筆私人筆記轉團隊工作的持久化流程；以宇星與 Lily 兩個實際身分驗證相同工作與私人資料邊界。
