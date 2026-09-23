# 圓展 × Personal OS：雙空間與工作日誌 v2

日期：2026-09-13

## 本次產品修訂

依使用者回饋：個人空間保留私人日誌；重要的工作入口是圓展空間內、每個人自己的工作日誌。輸入時就決定紀錄類型、專案與可見範圍，工作直接屬於圓展。私人與公司各有模組與資料規則，可各自演化。

初版將私人日誌轉公司設為主要流程，增加了不必要的跨空間操作。本版收斂為 B 空間外層、A 的書寫方式用於公司工作日誌、C 作為專案內部視圖。

- `index.html`：修訂方向、整合邏輯、落地與證據。
- `proposal-b.html`：本次主要互動原型，預設開啟圓展工作日誌。
- `v1-archive/`：完整保留初版總覽、三案與原驗證紀錄。
- 根目錄 `proposal-a.html`、`proposal-c.html`：保留原網址及互動，頁首明確標示為已修訂的初版方案。

## 介面與資料意義

| 概念 | 本版定義 |
|---|---|
| 個人空間 | 私人日誌、個人研究、生活與個人財務 |
| 公司空間 | 成員工作日誌、專案、時間線、文件、Evidence、承諾、公司財務與容量 |
| 我的工作日誌 | 圓展工作資料的作者／日期視角；「我的」不等於屬於私人空間 |
| 輸入類型 | 工作紀錄、決策、待辦、議題；待辦／議題直接建立可追蹤物件 |
| 可見範圍 | 示例為僅自己（工作草稿）、專案成員、圓展成員 |
| 物件引用 | 日誌、專案與時間線引用同一筆工作及狀態 |
| 模組演化 | 共用身分、空間切換、基礎 UI 與底層工具；各領域維持自己的資料契約和規則 |

工作草稿仍為公司工作紀錄。管理員讀取權限、離職後保留、預設可見範圍、修改與刪除歷程需在正式規格中確認；原型沒有把這些假設宣稱為既有能力。

## 依據與接合判斷

- 使用者本次回饋為新版產品方向；舊提案中的歷史指示不作為新操作指令。
- `prisma/schema.prisma` 與 `src/lib/services/workspace-context.service.ts`：已存在 Workspace、WorkspaceMembership 及有效成員空間切換基礎。
- `ARC-039_admin-org-personal-boundary.md`：個人與 Workspace 設定有分層；既有 Finance 屬個人範圍。公司財務需建立獨立契約，不能直接共用私人帳本。
- `REF-003` 仍是正式 UI ID 的來源。本版未選定或修改正式產品頁。
- 先在單一 app 中分出 personal／company 領域是本次架構建議。可獨立開發模組但仍一同部署；實際需要多應用、獨立 worker 或共用套件時再評估 monorepo。
- 技術參考：[pnpm Workspace 官方文件](https://pnpm.io/workspaces)，本次重新查閱。

## 已完成驗證

使用 Chrome／Playwright，桌機 1440 × 1000 與手機 390 × 844。

| 檢查 | 結果 |
|---|---|
| HTML metadata、local links、duplicate IDs、inline JS parse | 通過，4 個根目錄 HTML |
| 總覽分頁、方向鍵與 Home | 通過 |
| 預設位於圓展；直接記錄並建立 YZ-024 | 通過 |
| 工作日誌、專案及時間線引用相同 ID 與最新狀態 | 通過 |
| Lily 可見已指派工作；預覽排除他人的工作草稿與未加入專案 | 通過，僅 UI 模擬 |
| 作者視角篩選：我的／Lily／全部 | 通過 |
| 空內容、未選專案、受派人無法讀取的組合 | 顯示錯誤並阻擋示例建立 |
| 空間切換後有不同選單、紀錄與未送出草稿 | 通過 |
| 私人日誌紀錄不出現在公司畫面 | 通過 |
| 重新整理重置、file:// 直接開啟 | 通過 |
| Dialog Escape 關閉與焦點返回 | 通過 |
| 手機建立待辦、Lily 預覽、空間切換 | 通過 |
| 全頁水平溢出 | 無；寬比較表在自身容器捲動 |
| 桌機與手機截圖視覺檢視 | 已檢視總覽、工作日誌、私人日誌與邏輯頁 |
| browser pageerror／console error | 最終為 0 |

命令：

```sh
node /Users/pzps0964713/.codex/skills/uiux-proposal-studio/scripts/validate-proposal-pack.mjs '/Users/pzps0964713/Documents/github/self-stucture-v1/Claude outputs/圓展_Personal_OS_整合提案'
node /tmp/yz-integration/verify-v2.cjs
```

## 實作邊界

只修改獨立 HTML 提案與本說明。沒有修改正式程式、schema、權限或部署；沒有呼叫 API、使用 localStorage 或寫入資料庫。每個 HTML 的示例狀態獨立，重新整理即重置。公司財務等次要模組只呈現演化範圍，不模擬已完成的後端能力。

下一個可驗證實作切片：將公司工作日誌對應正式 UI ID，定義 workspaceId／authorId／kind／projectId／visibility 與關聯物件的 BFF 契約，再以兩個實際身分驗證建立、授權、資料持久化、去重與引用更新。
