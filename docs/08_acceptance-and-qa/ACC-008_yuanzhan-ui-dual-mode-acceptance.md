# 圓展 UI 階段：展示與空白模式驗收

**Document ID:** `ACC-008`  
**Date:** 2026-09-13  
**Status:** UI_PHASE_COMPLETE — D10 v5；21 主要＋18 細節操作群組；UI-only  
**Applies to:** [PRD-006](../01_product-requirements/PRD-006_yuanzhan-team-ui-phase.md)、[ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md)、[PLN-070](../05_execution-plans/PLN-070_yuanzhan-team-ui-implementation-plan.md)

## 1. 不混用的完成等級

- DOCS_BASELINE：來源、需求、契約、task 與驗收可查找且相互一致。YZUI-001 只完成此層。
- UI_MODE_ADAPTER：mode reader、factory 與 isolation tests 通過；尚需註明哪些頁已接線。
- UI_SLICE_COMPLETE：一個實際工作面兩模式都完成操作、可見範圍與 responsive 驗證。
- UI_PHASE_COMPLETE：所有情境與共同要求完成。
- 不在本表宣告：正式多人上線、權限後端證明、DB 持久化、付款、provider activation 或 Gate A/B/C。

## 2. 模式啟動（UI-088 已接線）

```bash
PERSONAL_OS_UI_DATA_MODE=showcase pnpm dev
# 停止 server，再以相同使用者啟動：
PERSONAL_OS_UI_DATA_MODE=empty pnpm dev
```

工作面 route：`/company/operating`，UI-088。也可依預覽指南並行開啟隔離的 3011／3012。兩個 process 不同時搶相同 port。舊 localStorage 開關設 true／false 均不得改變 env 結果。未設定 UI-phase mode 預設 empty；無效字串產生 config error。

## 3. 共用驗收

| ID | 條件 | Pass evidence |
|---|---|---|
| YZ-ACC-01 | 唯一 mode 來源 | server enum 與 UI-safe mode 一致；SSR／hydration 無瞬間種子切換；localStorage、query、cookie 無 override |
| YZ-ACC-02 | empty 真空 | 所有業務集合空／單件 null；無預填日誌、示例檔案、隱藏抽屜資料、chart series、通知與活動 |
| YZ-ACC-03 | showcase 連貫 | fixture ID 無孤兒引用；作者、專案、日期、金流與 Evidence 有一致來源；長文字／例外足夠 |
| YZ-ACC-04 | 相同操作能力 | 兩種模式共用元件；empty 可新增第一筆、修改、刪除最後一筆，能走依賴導引 |
| YZ-ACC-05 | 同一物件 | 日誌／專案／時間線引用同一 ID；狀態更新全部一致，重複送出不新增雙份 |
| YZ-ACC-06 | 空間與作者 | 個人紀錄只呈現本人；公司按可見範圍；切換日誌與未送出留言不交叉，作者和負責人可不同 |
| YZ-ACC-07 | 範圍一致 | 搜尋、backlink、附件、摘要、計數與列表採同一 selector；不透露受限紀錄標題 |
| YZ-ACC-08 | UI-only side effects | 記憶體 commands 不呼叫 DB mutation、R2、郵件、付款、AI provider；auth 原有請求另辨識，不偽稱全站零網路 |
| YZ-ACC-09 | 重整與切換 | 重整回該模式起始資料；同一 session 模組切換保留狀態；mode／session 改變不帶入舊資料 |
| YZ-ACC-10 | 操作狀態 | initial empty／filtered no-results／loading／error／forbidden／missing-source 明確；錯誤不補示例 |
| YZ-ACC-11 | 視覺與鍵盤 | 1440px 桌機與 390px 手機無整頁溢出；表格可局部捲動；Tab、Enter、Escape、focus return 可用；重要狀態非只靠顏色 |
| YZ-ACC-12 | 敘事與注意力 | 主工作面清楚、主要動作可辨、無治理文字牆；抽屜關閉回原篩選與捲動位置 |

測試 fixture selector 與模擬角色不等於正式授權安全測試。真正 service-layer isolation 在後續 DB-backed 階段另驗收。

## 4. 每個情境的空／滿矩陣

| 情境 | Showcase 預期 | Empty 預期 | Runtime status |
|---|---|---|---|
| YZ-S01 工作日誌 | 多日雙作者、Standup／文字／引用；編輯與元件賦型 | 空白編輯區；可插入無內容模板並寫第一筆 | PASS — UI-only |
| YZ-S02 今日一頁 | 過去／現在／未來與目標／阻礙相連 | 無假計劃、無假 WIP；可開始寫日誌／設目標 | PASS — UI-only |
| YZ-S03 專案／對話／工作 | 多專案、階層對話、附件、跨處建立及更新 | 無專案／訊息；先建立專案與第一個工作，依賴合理 | PASS — UI-only |
| YZ-S04 時間線 | 三層、星標、來源承諾、CRUD／履行分支 | 空軸保留日期框架；新增第一事件；不自動種發薪提醒 | PASS — UI-only |
| YZ-S05 文件 | 分類／搜尋／版本與多來源引用 | 無縮圖／原檔／歷史，提供本機示例檔案選取入口 | PASS — UI-only |
| YZ-S06 Evidence | 樹／README／凍結版本／缺件 | 先選／建專案，再開始空 Repo；缺件不能假封存 | PASS — UI-only |
| YZ-S07 帳本與對帳 | 表格、多憑證、圖表文字、匹配／差異 | 無交易／憑證／餘額假設，第一筆新增；指標為尚無資料 | PASS — UI-only |
| YZ-S08 報帳／人事／預算 | 多狀態與可追溯試算、受限欄位 | 無預填薪酬／預算；可建立草稿，公開連結只預覽 | PASS — UI-only |
| YZ-S09 容量 | 兩人配置、各 Size／狀態、樣本分布 | 無預設配置、無週期／預測；明確樣本不足 | PASS — UI-only |
| YZ-S10 承諾 | 內／外文件條文、觀測數據、手動 log | 無文件／承諾／虛構履行；可建第一筆並附來源 | PASS — UI-only |
| YZ-S11 空間切換 | 個人／公司模組與受限範圍清楚 | 相同殼與新增入口；不因切換自動補資料 | PASS — UI-only |
| YZ-S12 搜尋／信號／追溯 | 可直達物件、缺件／超期與示例變更 | 索引、信號、活動空白；只有真實本次 UI 操作產生模擬紀錄 | PASS — UI-only |

## 5. 空白模式的連續驗收腳本

1. 開啟 empty，確認公司所有業務集合為空，搜尋沒有示例結果。
2. 在工作日誌輸入普通紀錄；插入 Standup 並填一個欄位。
3. 建立第一個專案；由工作日誌建立待辦並指派可見的示例成員。
4. 去專案更新狀態、再回日誌／時間線核對同一 ID。
5. 加一筆本機示例附件並從兩個入口引用，檢查無複製物件。
6. 切到個人空間新增私人紀錄，再回公司確認互不混入；未送出留言保持分區。
7. 刪除最後一筆可刪業務紀錄，回到有操作入口的 empty state。
8. 重整，回到全空白起始資料；沒有 localStorage／DB 遺留。

## 6. Showcase 驗收腳本

1. 相同登入／路由，以 showcase 重啟；所有工作面具足夠資料支持預定操作。
2. 檢查兩角色、不同專案與公司日常；受限例外不透過搜尋或附件流出。
3. 從日誌修改 → 專案 → 時間線 → 文件 → Evidence 沿同一物件脈絡驗證。
4. 帳本與憑證互跳；對帳差異、待補材料、未核准、樣本不足均有可操作分支。
5. 查看 chart 來源與文字說明；沒有將示例試算標為已付款／真實獎金或正式 audit。
6. 模式改成 empty 重啟後，所有上述示例資料與衍生值消失，導航與新增能力保留。

## 7. 紀錄格式

每個 task 的 evidence 要記 mode、route／UI ID、fixtureVersion、viewport、實際操作、console/pageerror、network/business-call 檢查、截圖位置、未測情境與重跑命令。沒有執行的項目維持 NOT_RUN。

來源歸檔證據仍獨立保存；下面是後續 UI-runtime 實作的實際驗證，不混用兩種證據。

## 8. 2026-09-13 前版實際證據（D09 歷史）

- `scripts/check-yuanzhan-ui.ts`：17 組 PASS，含合法模式／empty 真空、圖引用、私人／受限／薪資、作者／負責人、不可刪承諾事件、日期、公式與容量。
- `scripts/verify-yuanzhan-ui.cjs`：31 組 PASS，兩模式各走完日誌→專案→工作→時間線→文件／Evidence→財務→承諾／容量／目標與搜尋；空白模式另查所有財務子分頁無隱藏資料。
- `scripts/verify-yuanzhan-ui-edges.cjs`：12 組 PASS，兩模式各驗最後筆刪除／復原、草稿跨頁與作者分區、鍵盤焦點、composition-event、slash Issue、PNG 真正解碼、不支援檔案拒絕、明暗與手機選單／搜尋，另驗證篩選後帳本合計。
- 1440×1000 與 390×844；檢查 document 及 main surface 無橫向溢出，財務 table 在自身容器捲動。31 組 run 的 pageerror = 0、業務 POST/PUT/PATCH/DELETE = 0。
- 全域 `pnpm exec tsc --noEmit --pretty false`、本次檔案 eslint PASS；完整 app production build 使用已快取字型 PASS。Google 下載原命令曾 ECONNRESET，字型網路可用性沒有獲得證明。
- 未登入請求實際 production build 回 307 至登入且無 fixture；原有 auth resolver／protected prefix 另以來源與 build 查核；loading/error route 檔案與 invalid-mode parser 有靜態／契約證據。沒有把真實多使用者服務授權、DB／provider 故障、真實 IME 或全手機機種測試列成 browser PASS。

[結果與截圖資料夾](../2_agent-input/generated/yuanzhan-ui-runtime/)包含 browser-results.json、edge-results.json、contract-results.log、build-cached-fonts-final.log、typecheck.log、lint.log。[操作與限制](../03_feature-reference/REF-004_yuanzhan-operating-interface/ui-preview-guide.md)與 [ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md)定義本期邊界。UI 狀態規則是可操作模擬，正式 auth、同步、核銷、薪酬與不可變封存另期驗收。


## YZUI-011 / D10 v5 忠實度追加驗收

原始 v5 的 8 主區／30 子頁是視覺基準；逐頁 1440×1000 原檔與實作截圖、頂列 48px／rail 78px／相同 tokens、工作面像素比對。保留已批准空間、作者、公式、文件與空白入口的差异，不以像素分數掩蓋操作缺口。

驗證指令改為 `pnpm ui:yuanzhan:verify`（v5 主要與細節情境）。內容涵蓋兩模式 60 子頁、日誌即時共享與私人隔離、原版召喚與組字、專案四種視圖、對話結案、事件、公式／貼上、檔案版本、Evidence 凍結／新版本、三方對帳、承諾、容量／出勤、薪酬角色與手機。另跑 v5 factory/公式契約、全域 typecheck、lint、完整 build；原前版瀏覽器結果只屬歷史證據。當前成果位於 `docs/2_agent-input/generated/yuanzhan-v5-fidelity/`。正式 auth/persistence/deployment gate 不變。

實際結果：主要 21 群組與細節 18 群組 PASS，兩模式各 30 個分頁；0 pageerror／console error，主要情境 0 業務 mutation request。另驗 1280×720 長抽屜捲動、Lily → Issue → 宇星日誌唯讀反向連結；390×844 日誌／對話無整頁橫向溢出。30 工作面＋完整 Issue 抽屜共 31 個對照區域，24 個區域像素差為零，其餘 RGB 差≤30 的像素占比最低 99.00%；新增入口及行為修正明列，不宣稱整頁逐像素相同。

`pnpm ui:yuanzhan:check`、`pnpm exec tsc --noEmit --pretty false`、targeted eslint、`pnpm ui:yuanzhan:build --cached-fonts` 全數 PASS。build 使用完整 source snapshot／本地快取字型，不證明正式環境、外部字型服務、真實輸入法或跨瀏覽器同步。詳見 [YZUI-011 報告](../2_agent-input/generated/agent-loop/reports/personal-os-owner-directed-20260913-yuanzhan-v5-fidelity.md)。
