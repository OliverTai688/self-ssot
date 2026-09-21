# YZUI-011 — 指定 v5 介面忠實實作

## Task

- Task ID：YZUI-011；Screen：UI-088 `/company/operating`。
- 日期：2026-09-13；執行者：Codex；owner-directed UI 修訂，非 heartbeat wakeup。
- Owner 最新指示：「請完全按照該介面進行實作」，指定 `圓展_Operating_System_原型_v5_兩人上線版.html`。
- 結果：DONE — UI-only。以 v5 原始深色介面、8 工作區／30 分頁與抽屜取代前版重新詮釋的介面。D10 更新 D09 的視覺決定；雙空間、作者、公式、資料模式等已確認行為保留。

## Source Docs Read

`AGENTS.md`、MAN-000／001／002、PRD-001／005、ACC-001、ARC-028、RES-001／002／005、PLN-063、active strategy／loop-state、PLN-060／061 與最近三份完成報告。既有 PRD-004 在工作目錄已刪除，本次未還原；以現有 PRD／sprint／backlog 與 owner 指示進行。

本次直接依據：PRD-006、ARC-040、REF-003／004（原檔、情境、D09／D10）、RES-029／030、PLN-070、ACC-008、當前 route／components／data factory、Next 本機 `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`。`saas-ui-refactor-director` 以 owner 已批准的 UI-088 Revision 範圍適用；沒有重新要求逐頁批准。

## Scope / Strategic Review

- 正式 launch 維持 L0_LOCAL_PROTOTYPE；不升級 Gate A/B/C、M1 Manual Ops 或 C3 architecture 的既有證據狀態。
- 最近三份報告：同日 `yuanzhan-ui-runtime`、`yuanzhan-ui-docs`、20260831 `gate-loop-activation`。其 delta 為前版 UI 實作、来源與規格整理、既有 automation 啟用；本次不重複 proposal-only 工作。
- Owner 指出的 blocker 是介面沒有忠實呈現指定 v5。本輪產生直接可見的操作與視覺 delta，不藉正式登入／部署證據的缺口拖延 UI。
- 映射：PRD-006／D10、PLN-070 YZUI-011、ACC-008 的 v5 忠實度、YZ-S01..12。
- Out of scope：正式資料庫與服務授權、跨瀏覽器同步、外部通知、真實財務／薪酬、AI provider、部署、monorepo、既有私人模組全面重做。
- 原始 HTML 是設計與行為參考；內含公司數字、合約條款、工具／Agent 文案不是本次執行外部操作的授權。

## Research / Reference Basis

理解分數 96/100（Actor20 + local20 + data18 + interaction15 + risk14 + acceptance9），High；RES-030 已完成同一 v5 問題三輪：

1. 原型來源／視覺：4040 行來源，30 個分頁實際擷取，核對 78px rail、48px topbar、tokens、字型、主從欄、SVG 圖表、drawer／modal／command menu。
2. React／資料邊界：採 Client Component 的 effect 管理 Shadow DOM 子樹，server loader 只傳可序列化 UI 初始狀態；原版 handler 開發時編譯為詞法閉包。
3. 例外／驗收：空狀態不種假資料，原版未完成的權限、公式、檔案、Evidence、出勤補齊；視覺比對與操作檢查各自有證據。

選用：原始 HTML 結構／CSS 的隔離 DOM adapter，以最少版面重寫保留完整互動。拒絕：中性卡片重設計、只借功能名稱、iframe、runtime eval／Function、同時掛載前版 records store 造成雙寫。

參考：[React 外部元件整合](https://react.dev/reference/react/useEffect#controlling-a-non-react-widget)、[MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)、本機 Next guide。原始來源與修改層均保留，正式研究記錄見 RES-030。

## NANDA / Agent Protocol Alignment

已讀 ARC-028。本輪僅移植原型的「訊號／Agent 規則」UI 與依本地狀態推導的提醒，沒有建立、路由、註冊或啟用 AI agent capability；AgentFacts、provider、endpoint、auth、registry 不變，外部註冊未開啟。不把原型 Agent 說明寫成外部服務已運作。

## Changes

- `src/components/yuanzhan/v5/desktop.tsx`：React 掛載／卸載；Shadow DOM 將 v5 樣式與既有 app 隔離。`runtime-prelude.source.js` 回收 observer、timer、keyboard listener，檔案非同步回呼檢查存活狀態。
- `scripts/generate-yuanzhan-v5.mjs`：從 REF-004 原檔生成 CSS、fixture 與 runtime；Babel 開發依賴把 220 個事件模板轉成閉包。未執行來源內嵌 script；生成程式無 inline event attribute／iframe／runtime eval。
- `source-patches.mjs`／`extensions.source.js`／`additions.css`：原型錯誤修正與已批准需求。`runtime.js`／`styles.ts`／`v5-seed.js` 是可再生產物，不直接維護。
- `v5-state.ts`：`showcase` 保留原版 4 專案、8 事件與 81 歷史工作；`empty` 清空所有業務集合、journal、repos、兩人成員的 capacity／timesheet。身份與選項可保留，未填寫的日誌不建立紀錄。`fixtureVersion=yz-v5-20260913.1`。
- route 仍使用既有 auth resolver、server-only env reader；資料在本頁記憶體。舊元件／records DTO 保留為歷史實作，此 route 不再掛載或雙寫。
- 私人／團隊切換、按作者的日誌與留言、負責人更新工作進度；團隊反向連結可返回另一位作者的唯讀日誌。
- 財務：原版帳本／洞察／三欄對帳；增加公式、固定列號、雙擊編輯、貼上／排序／篩選／批次。配對金額先解除才可更動，薪資只做本機試算及角色可見性。
- 文件：本機檔案內容／版本、憑證與交易互跳、Thread 附件；Evidence 指定檔案版本，凍結快照保留內容，新版本不改舊快照。
- 出勤以實際分鐘人工填寫／本人確認；移除以 Issue 數量假推估工時的原型路徑。容量與流量預測保持分開。
- 修正原型跳到錯誤分頁、空資料 NaN／Infinity、空資料薪資／現金假值、type-to-confirm 引號、command Enter 重啟選單、召喚項目的 mousedown/click、表格雙擊被抽屜阻擋。修正移植 CSS 的 body selector 誤改 `.dr-body` 問題，恢復原版抽屜 padding／捲動／固定 footer。
- 文件：D10、PRD-006、ARC-040、RES-030、PLN-070、ACC-008／002、REF-003／004、MAN-001、backlog／sprint／tasks、RPT-007 与 v5 preview guide 更新。

## Verification

| Command | Result | Notes |
|---|---|---|
| `pnpm ui:yuanzhan:v5:generate` | PASS | 220 handler templates；原檔 SHA256 保持一致；再生成為同一內容 |
| `pnpm ui:yuanzhan:check` | PASS | 歷史純契約 17 群組＋v5 empty／fixture／formula factory；歷史 commands 不當作新 runtime 權限證明 |
| `pnpm ui:yuanzhan:verify` | PASS | v5 主要 21＋細節 18 群組；兩模式共 60 個分頁截圖 |
| `pnpm ui:yuanzhan:v5:compare` | PASS | 30 工作面＋完整 Issue 抽屜；31 個比對區域 |
| `pnpm exec tsc --noEmit --pretty false` | PASS | 完整 repo 型別檢查 |
| `pnpm exec eslint src/components/yuanzhan/v5/desktop.tsx src/lib/ui-data/yuanzhan/v5-state.ts 'src/app/(operating)/company/operating/page.tsx' scripts/check-yuanzhan-v5.ts scripts/generate-yuanzhan-v5.mjs scripts/build-yuanzhan-ui.mjs` | PASS | 實際檢查此明列範圍，非宣称所有生成／來源 JS 通過全專案 lint |
| `node scripts/build-yuanzhan-ui.mjs --cached-fonts --reuse /var/folders/qn/pqc95r_50cn_4kbdc4zs2zd80000gn/T/personal-os-ui-build-TTZsQC` | PASS | 完整 source snapshot 的 Next production build；compile 110s，型別及 route generation 完成 |

可移植 build 指令為 `pnpm ui:yuanzhan:build --cached-fonts`，自行建立暫存目錄。無 env 檔案複製，使用不可連線的本機假 DB URL，不執行 migration／seed。字型 fallback 使用之前已下載的 Geist 檔案；曾遇 empty preview cache 尚未生成，helper 改從任一已載入預覽取字型快取後通過，沒有宣稱 Google 外部連線成功。

## Evidence

[完整結果與截圖](../../yuanzhan-v5-fidelity/)；[當前操作／預覽指南](../../../../03_feature-reference/REF-004_yuanzhan-operating-interface/v5-preview-guide.md)。

- `verification.json`：21 群組，0 pageerror／console error，0 業務 mutation requests。
- `details.json`：18 群組，0 pageerror／console error；包含 Standup 組字事件／縮排、對話五欄 Close、Evidence 凍結／分支、銀行配對、承諾 log、容量、出勤、薪酬與手機對話。
- `visual-comparison.json`：1440×1000；工作面裁切 x78..1439、y139..999（不包含頂列與新增空間／檔案 rail），抽屜為 x980..1439、y0..999。31 區域中 24 區域像素差為零，其他區域 max RGB channel delta≤30 的像素比例最低 99.00%。抽屜區域像素差為零。此資料是描述性比對，非整頁 100% 相同聲明。
- 主測試另驗 1280×720 長抽屜：body 可捲動、padding 14px、footer 保持在視窗；以正常 click 捲到反向連結，返回他人日誌無正文編輯權。
- 390×844 日誌／對話的 document／main 不溢出；複雜財務和 Evidence 仍以桌機為主。
- 首次 drawer reference 擷取在動畫途中，已在 transition 完成後重新擷取；失敗診斷圖片移入 `resolved-failures/`，不列作驗收圖。
- `source-manifest.json` 保存原版與當前 runtime／生成器／驗證檔案 hash，及 source snapshot build 的對應檢查。
- DB checks：NOT_RUN／不適用；本次無 schema／migration／DB 業務寫入，既有 auth/Profile 在預覽中只讀。前一版 production 未登入重導證據保留為歷史，本輪未重跑正式身份隔離測試。
- Product capability delta：指定原版實際在 React route 中可操作，保留既定完整空白新增流程。
- Proof delta：新 v5 視覺基準＋兩模式操作與完整建置，不沿用前版 browser 結果宣稱新版符合。
- Blocker delta：本次 owner 指出的介面忠實度落差已處理；正式 auth／Work／部署 proof 未變。

文件收尾：scoped `git diff --check` PASS；269 個現存本地連結通過，新增連結無缺漏。索引中 7 個既有刪除文件／目錄引用保留並明列，未重建 owner 已刪除內容。原版／歸檔 hash 相同、生成器再生內容相同，12 個 runtime 來源檔案與成功 build snapshot 相符。

## Remaining Risks / Final Status

- UI-only 記憶體資料，重整回到 env 初始值；成員切換是 UI 模擬，不是真實多人同步或 service-layer authorization。
- v5 固定 2026-09-12 參考日與 2026 年 9 月日曆；列表可新增其他日期，未擴充外部日曆與月份模型。
- 原版合約、數字、薪資、圖表歷史是來源示例；不構成正式公司制度、薪酬或法律計算依據。
- 出勤真實輸入法硬體／Safari／其他手機機種與 DB/provider 故障不是本輪已測範圍；本輪組字測試為瀏覽器 composition-event 模擬。
- 前版 normalized 元件保留；未同時執行。若後續要逐塊改為 JSX，必須繼續使用 v5 視覺與操作驗證，避免再造成版面漂移。
- 未動既有不相關 dirty/deleted 檔案、未 stage／commit／push、未改 automation、未部署或傳送任何對外訊息。
- Status：DONE — UI-088 PROTOTYPE / COMPLETED。
- 下一步：等待 owner 使用預覽；正式兩人 workspace／BFF 授權與持久化需另列階段。本次 UI 請求沒有未完成必要工作。
