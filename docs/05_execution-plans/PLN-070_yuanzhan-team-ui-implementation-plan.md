# 圓展團隊 UI 階段開發計畫

**Document ID:** `PLN-070`  
**Date:** 2026-09-13  
**Status:** UI_PHASE_COMPLETE — D10 v5 忠實移植完成；39 操作群組雙模式通過；正式多人／持久化另分期  
**Primary task:** `YZUI-011` D10 v5 fidelity revision, UI-088；YZUI-002..010 為前版歷史  
**Required:** [PRD-006](../01_product-requirements/PRD-006_yuanzhan-team-ui-phase.md)、[ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md)、[REF-004](../03_feature-reference/REF-004_yuanzhan-operating-interface-sources.md)、[RES-029](../07_research-and-design/RES-029_yuanzhan-ui-phase-and-data-mode-research.md)、[ACC-008](../08_acceptance-and-qa/ACC-008_yuanzhan-ui-dual-mode-acceptance.md)

## 1. 執行方向

本階段先把界面、情境與記憶體互動做完整。UI 改善可以在尚未完成正式 DB／auth／deployment proof 時前進；本階段不把兩人真實登入同步當作完成條件，也不因此宣稱正式 launch 提升。

單一 app、雙空間、不同模組；公司工作日誌是主要輸入。使用原型中的書寫、大綱、表格、時間線與抽屜互動。所有納入頁面使用 env 決定 `showcase / empty`，不能只有 showcase 有完整功能。

YZUI-001 完成來源與文件；依 D09 接續完成 YZUI-002..010。UI-088 使用同一份元件與資料契約，雙模式與桌機／手機均已操作驗證。

## 2. 交付順序與範圍

| Task | 狀態 | 目的與交付 | 依賴／完成條件 |
|---|---|---|---|
| YZUI-001 | DONE — docs/source baseline | 來源 byte-copy、情境／決定、PRD／ARC／REF／RES／PLN／ACC、索引與 backlog | source hash／新文件連結／HTML 導覽驗證通過 |
| YZUI-002 | DONE — UI| env reader、showcase／empty factories、UI-safe DTO、UI-memory commands、provider isolation | 單一 env 來源；empty 真空、showcase 一致；不改 auth／DB；必要 contract tests |
| YZUI-003 | DONE — UI| 雙空間 UI 殼、公司工作日誌、Standup、大綱／型別／引用、作者視角與草稿 | YZUI-002；REF-003 對應；雙模式實際建立／修改／刪除及上下文保持 |
| YZUI-004 | DONE — UI| 專案總覽、層級對話、工作／決策與跨頁引用 | 同頁研究與 UI 對應；兩種模式從第一個專案到待辦／討論 |
| YZUI-005 | DONE — UI| 今日一頁、三層時間線、CRUD、星標、提醒與搜尋 | YZUI-003/004；日期／目標／工作相同 ID、empty 無虛構計劃 |
| YZUI-006 | DONE — UI| 公司文件庫、版本、來源／反向連結、Evidence 樹與 README／封存模擬 | YZUI-004；固定版本不漂移，缺件分支，empty 可開始整理 |
| YZUI-007 | DONE — UI| 財務帳本、憑證、圖表／文字、對帳、報帳／人事／預算 UI | 公司與私人財務分區；示例核准／付款不呼叫服務；雙模式 |
| YZUI-008 | DONE — UI| 內／外承諾、文件與數據對照、月回顧 log | 文件與時間線引用；empty 不自動填入合約條文 |
| YZUI-009 | DONE — UI| 週容量、工作 Size／WIP／流量、樣本不足與預測 UI | 工作時間欄位已有契約；出勤分開；可演示樣本與不足狀態 |
| YZUI-010 | DONE — UI | 整體雙模式桌機／手機／鍵盤驗收與回歸 | YZ-S01–12、ACC-008；保留可重跑步驟與待修問題 |

各情境理解評分與三輪研究記於 RES-030；不是僅用 RES-029 免除其他頁面研究。以下 Scope／Risks 保留作為實作約束與後續維護依據。

## 3. 第一個實作：YZUI-002

### Scope

- 建立 server-only `PERSONAL_OS_UI_DATA_MODE` resolver，合法值 showcase／empty，unset→empty，invalid→configuration error。
- UI DTO 和空集合 factory；資料展示 factory 使用 synthetic fixtures、穩定引用、固定 referenceDate。
- 選定 UI-phase provider／記憶體 command 邊界。與 legacy localStorage、isDemoAccount、formal library store 分開。
- 可先完成非頁面 contract／factory，再交由 YZUI-003 接入選定頁面。模式切換完成狀態需分別記錄「resolver 完成」與「畫面已接線」，不可混稱。

### 實作檔案

- `src/lib/config/ui-data-mode.ts`：server reader。
- `src/types/yuanzhan-ui.ts`：序列化 DTO。
- `src/lib/ui-data/yuanzhan/fixtures.ts`、`mode.ts`、`commands.ts`：factory／純記憶體行為。
- `src/lib/context/yuanzhan-ui-context.tsx`：專用 provider；命名可依 repo 接合修正。
- `.env.example`：已註明 UI-088 專用模式。
- `scripts/check-yuanzhan-ui.ts`：值解析、scope／mode 汙染與引用完整性。

### Verification

mode parser 覆蓋 unset／showcase／empty／invalid。empty 遍歷所有業務集合為空、單件為 null；showcase 引用可解析。預設 factory 不讀 DB、不呼叫 provider。Client 不匯入 server config／Prisma。Typecheck 與相關 lint；若進入 Next 頁面再依範圍 build／雙模式 browser。

### Risks / stop conditions

若需修改登入、真實角色、現有 DB action、跨 tenant 服務、production env 或高風險資料寫入，拆為後續任務。不得為通過 empty 驗收刪 DB、清使用者 localStorage 或關掉既有 auth。對大量 dirty 檔案的整併需先確認重疊內容。

## 4. 工作日誌 UI 切片：YZUI-003

- Actor：宇星／Lily 的公司工作視角；trigger 為進入圓展開始一天。
- Primary action：書寫即時更新工作紀錄；明確賦型建立相關工作。
- 最小 journey：空白日誌 → 插入 Standup → 寫一段 → 建立 Todo／Issue → 選範圍與負責人 → 讀到同一物件 → 更新 → 回日誌；切換私人／公司保留各自草稿。
- UI 手感：v4/v5 的大綱與模板；v3 的 CRUD；整合 v2 的空間切換。一般文字可獨立保存，不強迫每行變任務。
- 涉及檔案：新的 company journal components／types／provider，現有 `app-sidebar.tsx`、`app-header.tsx`、`workspace-context.tsx` 僅在必要接合時動；正式 route path 在 REF-003 對應步驟確定。
- Acceptance：滿／空兩種模式同一組元件；鍵盤與縮排可用、抽屜返回焦點、必填錯誤／空白／受限物件、作者篩選與引用更新；無業務 server mutation。
- 已有研究：RES-029 三輪只涵蓋此首段；編輯器選型與實際 route 對應在開工前補齊。

## 5. Screen ID 與既有頁面接合

| 工作面 | 已存在可關聯的 Screen ID（不是新選定 Active UI） | 接合規則 |
|---|---|---|
| 今日一頁 | UI-010 `/dashboard` | 確認個人／公司 scope 與本次需改的主面 |
| 專案總覽／詳情 | UI-020、UI-021 | 使用 preview adapter 時不得落到真實 Work action |
| 公司知識／承諾 | UI-050 `/company` | 公司 workspace 外層與既有 Company 模組分開理解 |
| 私人日誌 | UI-060 `/self` | 先保留必要隔離與入口，避免順帶重做所有私人功能 |
| 私人財務 | UI-062 `/finance` | 不視為公司財務既有授權；公司新工作面另對應 |
| 公司工作日誌／時間線／文件／Evidence／容量等 | UI-088 `/company/operating` | 已在 REF-003 登錄，整階段授權依 D09 |

2026-09-13 使用者批准整階段自主實作，已將工作台登錄為 UI-088 `/company/operating`。既定範圍內選型／客製／驗證可持續進行，行為或範圍改變才詢問。

## 6. 雙模式開發節奏

每完成一個 slice：showcase 正常／例外操作 → empty 從第一筆開始 → 刪最後一筆 → 檢查 role／workspace／mode 分區 → 桌機與手機 → 記錄 actual coverage。設計與資料 factory 共用，禁止一份展示頁與另一份空狀態頁分叉。

完成的 UI 可在工作階段內儲存記憶體狀態；重整重置。真實跨瀏覽器協作、資料庫持久化與對外服務在後續階段驗收。

## 7. 交付紀錄

每個 task 更新 canonical backlog／sprint／tasks／ACC-002／RPT-007 及獨立 evidence。普通本地主動文件整理不更改 heartbeat cadence、Gate prompt、release worktree 或正式 launch claim。來源包不是 public deployment 資產。

## 8. D09 owner 決定與前版選型（2026-09-13）

D10 已取代下方視覺與 runtime 選型：現行採 v5 原始 CSS／標記及 React DOM adapter；操作與維護見 [v5 指南](../03_feature-reference/REF-004_yuanzhan-operating-interface/v5-preview-guide.md)。

以 REF-004/decisions.md D09 為準：直接即時共享公司日誌；作者改正文、負責人改進度、同事留言；財務保留基本公式；原型版面＋既有產品視覺；手機優先日常協作；每個完整情境驗證後繼續。

實作模組放 `src/components/yuanzhan/` 與 `src/lib/ui-data/yuanzhan/`。選用現有 shadcn/Base UI 的 Button／Sheet／Dialog／Input；Tiptap OSS 處理中文輸入、清單縮排、撤銷；React Aria 處理數值／日期的鍵盤與 locale；Magic UI 按需評估，不為裝飾增加依賴。持續保留原正式頁面與 auth，不改寫既有業務服務。

## 9. 前版交付與下一個邊界（D10 驗證見下節）

- 17 組純契約、31 組雙模式情境、12 組鍵盤／檔案／草稿／主題邊界檢查通過。完整 app source snapshot 的 Next production build 以已快取字型通過；直接 Google 字型下載曾 ECONNRESET，不把它寫成網路驗證成功。
- UI-088 含全部九個主工作面與 YZ-S01..12；採 server-only env、單一 memory records、作者／負責人／留言規則。
- [預覽指南](../03_feature-reference/REF-004_yuanzhan-operating-interface/ui-preview-guide.md)包含操作路徑、兩個本機埠號及重跑命令；ACC-008 列實際覆蓋與限制。
- 下一階段建議先定正式兩人成員／workspace／BFF 持久化與服務授權，再接真實同步。此項不在本次 UI-only 授權中自動開工；現有正式 launch blockers 保留原狀。


## YZUI-011 — v5 指定介面忠實實作

DONE — UI-only；D10 owner-approved，UI-088。依 RES-030 三輪研究移植原始 8 工作區／30 分頁、完整操作與抽屜；保留雙空間、作者權限、公式和 showcase/empty。驗收為原版逐頁視覺對照＋兩模式 CRUD／鍵盤／手機；不變更正式 auth、DB、通知或部署。

[驗證報告](../2_agent-input/generated/agent-loop/reports/personal-os-owner-directed-20260913-yuanzhan-v5-fidelity.md)：21 組主要操作＋18 組細節操作、60 個雙模式分頁、31 個原版比對區域、factory／typecheck／lint／完整建置通過。正式多人與持久化另期。
