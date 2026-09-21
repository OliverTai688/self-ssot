# 圓展 UI 階段資料模式與接合契約

**Document ID:** ARC-040  
**Date:** 2026-09-13  
**Status:** IMPLEMENTED — UI-memory；UI-088 `/company/operating`  
**Product:** [PRD-006](../01_product-requirements/PRD-006_yuanzhan-team-ui-phase.md) · [研究與選型](../07_research-and-design/RES-030_yuanzhan-ui-implementation-rounds.md)

## D10 現行 v5 runtime 契約

2026-09-13 起 `/company/operating` 以 `createV5State(mode) → V5State → V5Desktop → mountV5` 取代下方前版 `OperatingProvider` 路徑。server-only mode／既有 auth resolver 不變。V5State 包含 mode、fixtureVersion、referenceDate、data；data 的 projects/issues/events/txns/docs/commitments/repos/journals/threads/capacity/timesheet/bank 等穩定 ID 在一個記憶體 store 驅動所有視圖。UI 擴充的 files/versions/snapshots、journalBooks/comments/payroll 同樣限此 store。Empty 清空所有業務集合；渲染空日誌不自動建立資料。

React useEffect 掛載並回收 Shadow DOM 工作台；CSS 與查詢侷限根節點。生成器將原型事件模板轉成詞法閉包，取消 inline handler、全域函式、runtime eval 及直接執行來源 script。Observer、timer、keyboard listener 在卸載時回收；檔案非同步回呼檢查生命週期。這是忠實移植的 DOM adapter，不宣稱原版所有節點已改為 JSX。

權限仍是 UI 模擬：日誌本人編輯／團隊留言，任務作者改正文／負責人進度，個人日誌及文件依本人隔離。管理者額外操作為銀行明細與配對、所有專案財務檢視、薪資試算、报帳核准／已付模擬及稽核檢視；不賦予修改他人日誌正文。出勤由本人確認。財務與薪資不呼叫外部業務服務。公式沿用受限 parser；文件固定版本與 Evidence 快照均為記憶體副本。

前版 records DTO、commands、元件保留但此路由不再掛載，不同步雙份狀態；下方為前一實作的歷史細節。現行操作与限制見 [v5 指南](../03_feature-reference/REF-004_yuanzhan-operating-interface/v5-preview-guide.md)。

## 1. 唯一模式來源

```dotenv
PERSONAL_OS_UI_DATA_MODE=showcase
# 或 empty；未設定／空字串預設 empty，其他字串回報配置錯誤。
```

server-only reader 位於 `src/lib/config/ui-data-mode.ts`；純 parser 在 `src/lib/ui-data/yuanzhan/mode.ts`。Client 不讀 env。模式只改初始資料，兩者使用完全相同的元件與記憶體 commands。UI 沒有 query、cookie、localStorage 或普通按鈕的覆寫入口。重啟 process 後新載入頁面才套用模式。

歸檔 HTML 是歷史來源，仍不讀取 env。未遷入的 Work、library、個人財務與既有 auth/demo 模式保留原行為；本變數不清空資料庫，也不影響舊 provider。

## 2. Server → UI 邊界

```text
existing /company protected prefix + page resolveCurrentUser()
 → no identity: redirect to existing login flow
 → dynamic server-only mode reader
 → createOperatingState(mode)
 → serializable OperatingState
 → OperatingProvider
 → visibleRecords / canRead
 → memory commands with edit/assignee checks
 → identical company/personal UI surfaces
```

新頁放在 `(operating)/company/operating`，不繼承 `(dashboard)` 的真實 business/library loader，但沿用 app root 的字型、ThemeProvider 與基本元件。路由 `force-dynamic`。頁面可能進行原有 auth/Profile 讀取；業務資料只由合成 factory 或 empty 起始。UI 不匯入 Prisma、原 Work actions 或 provider adapters，不進行 business DB／R2／郵件／付款／AI 呼叫。

這不是正式服務授權證明：整個展示 DTO 包含合成角色案例，Client 角色切換只驗證 UI selectors。真正多人資料必須在後續 server authorization 與 BFF 層隔離，不能把本 store 原樣當作正式 API。

## 3. 已實作 DTO 與單一狀態

權威型別：`src/types/yuanzhan-ui.ts`。

- `OperatingState`: mode、fixtureVersion、referenceDate、records[]、activity[]、dismissedSignals[]。
- `OperatingRecord`: 穩定 id、kind、space（personal/team）、author、visibility（private/team/project）、projectId／parentId／refs，及各類型的 UI 欄位。
- journal 用 Tiptap JSON／body／tags；task 用 category（Todo/Issue/Decision）、assignee、size、started/completed/due；Expense 接入 transaction。
- 文件保存 immutable versions[]；Evidence 用指定 fileId/versionId/path 與複製文字的 snapshots[]。
- 金額保留原公式字串；列號 ledgerRow 穩定，排序或篩選不變更 B/C/D 引用。
- 承諾事件保留 commitmentId 與履行／協議變更 log，不能以刪除逃避來源。

本實作以 normalized `records[]` 取代最初草案的多份 collection；所有頁面引用同一 ID，沒有第二份待辦或帳目。signals、指標、backlinks、搜尋均從可見 records 衍生，不另種資料。這些 DTO 不等於 Prisma migration 設計。

## 4. Showcase 與 empty

`fixtures.ts` 是兩模式唯一 factory；fixtureVersion `yz-ui-20260913.2`，referenceDate `2026-09-13`。

Showcase 含兩個團隊專案及一個受限專案、兩人日誌、六週完成樣本、三層事件、合成文件、多憑證、已配對與待查帳目、薪資／預算試算、已封存及缺件 Evidence、內外承諾。內容不來自真實合約、銀行帳目或薪酬。函式每次返回獨立物件。

Empty 的 records/activity/dismissedSignals 全為 []，沒有預填工作文字、圖表序列、薪酬、文件或隱藏結果。保留兩名示例角色、導航、欄位、類型選項與建立入口。集合計數可以為 0；缺少資料的金額／週期為 —，預測顯示樣本不足。使用者按下建立後產生的欄位預設不算初始種子資料。

## 5. 操作與保留

公司日誌正文輸入即更新，沒有發布步驟；以模擬成員切換觀察同一 store 的結果。不同瀏覽器／分頁沒有即時同步。私人日誌只呈現本人。

記錄與已輸入日誌在空間／模組切換後保留；未送出留言與待附文件以 `(space, actor, parent editor key)` 存在 session drafts。取消的新增表單不自動建立紀錄。換成員會清除詳情與 undo stack；模擬成員切換不重建公司共用資料。真實登入 session/mode 的 page key 不同則重建 provider。

重整回模式起始資料，不把業務資料寫入 localStorage/IndexedDB。ThemeProvider 的既有 theme localStorage 仍屬視覺設定。commands 檢查作者、可讀範圍、引用、有效日期與數字；有關聯的刪除要求先整理來源。支援最近 30 次操作復原。

## 6. 明列角色操作（僅 UI 模擬）

| 操作 | 作者／負責人／成員 | 管理者宇星額外操作 |
|---|---|---|
| 日誌正文 | 僅作者可編輯 | 不能改 Lily 正文 |
| Task 內容 | 作者改內容；作者或負責人改進度 | 不繞過作者規則 |
| 留言 | 可讀取父物件的成員留言；作者刪自己留言 | 不改他人留言 |
| 專案／文件／Evidence／承諾 | 作者操作；其他可見成員閱讀與留言 | 不代改作者內容 |
| 容量 | 作者編輯自己的配置；團隊可看 | 無隱藏覆寫 |
| 銀行明細／預算／人事試算 | 一般成員無管理寫入；薪資只看自己 | 可建立、修改、刪除相應 UI 記錄；看兩人的薪資 |
| 對帳 | 一般成員唯讀 | 可配對／解除可見帳目；保留原作者、正文，配對金額修改前需解除 |
| 報帳 | 作者填寫、改狀態與附檔；可見成員留言 | 本期狀態只模擬，沒有正式核銷批准或付款權限 |

個人 Finance 與公司帳本不共用 store。本次不更改 ARC-039 或正式 auth 規則。

## 7. 計算與檔案限制

公式支援算術、括號、B/C/D 儲存格、同欄範圍與 SUM/AVERAGE/MIN/MAX；不是完整 Excel。Parser 不使用 eval，缺參照／循環／除零／超出運算上限都有錯誤，依賴結果以單次評估快取。支出填正數、收入填負數，帳本合計為淨支出。

人事為本薪＋獎金的介面試算，不包含法定扣繳或付款。Capacity 由可見任務計算；至少涵蓋 4 週且有 8 筆同 Size 完成記錄才給粗估。P85 是任務歷時分位數，不是里程碑完成機率。

本機檔案每份上限 5 MB，支援文字、Markdown、CSV、JSON、PNG/JPG/WebP/PDF。只留在記憶體，不做 OCR／雲端上傳。Evidence 固定檔案版本與文字快照；二進位來源保留在該檔案版本，沒有 Git、密碼學封存或正式審核。

## 8. 啟動與驗證

一般 app：設定 env 後 `pnpm dev`，開啟 `/company/operating`，使用既有登入。

隔離預覽（保留原 dev server）：

```bash
pnpm ui:yuanzhan:showcase
pnpm ui:yuanzhan:empty
pnpm ui:yuanzhan:check
pnpm ui:yuanzhan:verify
pnpm ui:yuanzhan:build
```

隔離預覽 helper 只複製 UI route 與元件到暫存資料夾，使用既有 explicit mock-auth/Profile 唯讀路徑；可用 PERSONAL_OS_UI_PREVIEW_PROFILE_EMAIL 指定已存在示例 Profile，不會建立使用者。依賴本機可讀取該 Profile。一般 app 不因此開啟 mock auth。

[操作指南](../03_feature-reference/REF-004_yuanzhan-operating-interface/ui-preview-guide.md)記錄埠號、瀏覽器依賴與限制；[ACC-008](../08_acceptance-and-qa/ACC-008_yuanzhan-ui-dual-mode-acceptance.md)提供實際驗證矩陣。Google font 下載若中斷，可在已開啟 empty 預覽後用 `pnpm ui:yuanzhan:build --cached-fonts` 進行隔離建置；該檢查不證明 Google 網路可用。
