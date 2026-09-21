> 2026-09-13 D10 已切換至指定 v5 的忠實介面；現行操作、模式與維護步驟請見 [v5 預覽指南](v5-preview-guide.md)。下列保留前一版的交付歷史。

# 圓展 UI 工作台：預覽與操作

日期：2026-09-13。工作面：UI-088 `/company/operating`。本頁是本機介面預覽指南，原型 HTML 仍存於 originals／integration-v2。

## 開啟兩種模式

在 repo 根目錄，各開一個 terminal：

```bash
pnpm ui:yuanzhan:showcase
pnpm ui:yuanzhan:empty
```

- [展示資料](http://127.0.0.1:3011/company/operating)：連貫的專案、日誌、財務、承諾與歷史樣本。
- [全空白資料](http://127.0.0.1:3012/company/operating)：所有業務紀錄為空，可從第一篇日誌與第一個專案開始。

這兩個 helper 在暫存資料夾開獨立 Next 預覽，不搶原本開發伺服器的 lock。helper 使用既有 explicit mock-auth 路徑讀取示例 Profile；預設為 repo 已有測試身分，必要時設定 `PERSONAL_OS_UI_PREVIEW_PROFILE_EMAIL` 指向已存在的示例 Profile。它不建立使用者、不改 `.env.local`、不寫業務 DB。若 Profile/DB 無法讀取，頁面沿用登入保護，不繞過登入。

隔離預覽只複製本次 UI route，返回原工作空間／個人其他模組的連結應在正常 app 使用。正常 app 由 `PERSONAL_OS_UI_DATA_MODE=showcase|empty pnpm dev` 啟動，使用現有登入，從側欄「圓展工作台」進入。未設定模式預設 empty，其他字串顯示配置錯誤。

## 操作路徑

| 想做的事 | 操作 |
|---|---|
| 寫工作日誌 | 開始書寫 → 文字／Standup；正文輸入即更新。`/` 選 Todo/Issue/Decision/Expense；`@` 引用物件 |
| 直接加入工作／附件 | 日誌下方加入工作元件、記錄支出或加入本機文件；同一 ID 會出現在其他工作面 |
| 和 Lily 協作 | 預覽成員切 Lily → 作者選全部；他人正文唯讀、負責工作可改進度，其餘透過留言 |
| 保留私人紀錄 | 切個人空間書寫；其他成員及公司搜尋看不到私人紀錄 |
| 推進專案 | 專案 → 總覽／工作／對話／Evidence／財務；工作可標記 Issue、Todo、Decision |
| 安排時間 | 三層時間線新增事件／星標／編輯；有截止日工作直接投影同一 ID；承諾事件保留來源與變更理由 |
| 整理文件 | 文件庫選取本機檔案或建立文字文件 → 新版本、分類、標籤與反向引用 |
| 整理 Evidence | 先有專案 → 建 Repo → 選文件版本與資料夾路徑 → README → 建固定快照；修改原文件不改舊快照 |
| 編輯帳本 | 直接改儲存格；Enter 儲存、Tab 移動；貼入多列 TSV，排序／篩選／批次標記；支出正數、收入負數 |
| 用公式 | B 數量、C 單價、D 金額；例如 `=B1*C1`、`=SUM(D1:D3)`；列號固定，不是排序後的視覺行號 |
| 對憑證與帳 | 帳目詳情附多份文件，憑證庫反向回帳目；銀行分頁配對或記差異，詳情可解除配對 |
| 報帳／人事／預算 | 三個獨立分頁；報帳單本機預覽、人事本薪＋獎金試算、專案分類預算對比 |
| 檢查容量 | 每人成員／週配置 → Size 流量與 P50/P85 → 至少4週8筆同類完成樣本才顯示粗估 |
| 核對承諾 | 內／外承諾 → 左文件、右目標與數據 → 新增月度確認 log；可安排來源事件 |
| 找資料／回復操作 | `⌘K`／搜尋按鈕、訊號與修改紀錄、右上復原；抽屜 Escape 關閉 |

私人、團隊日誌與留言草稿依空間和作者分開。重整會回模式起始資料，請勿用本預覽保存需要留存的真實紀錄。

## 可重跑檢查

```bash
pnpm ui:yuanzhan:check
pnpm ui:yuanzhan:verify
pnpm exec tsc --noEmit --pretty false
pnpm ui:yuanzhan:build
# 若 Google font 下載斷線，先開一次 empty 預覽，再用本機字型快取驗證：
pnpm ui:yuanzhan:build --cached-fonts
```

Browser scripts 預設讀 Codex bundled Playwright 與本機 Chrome；在別台電腦可用 `PLAYWRIGHT_MODULE` 和 `CHROME_PATH` 指定相應路徑。程式只在本機操作，不發外部通知。build helper 使用拋棄式 source snapshot 與不可連線的 DB URL，不改原 `.next`；cached-fonts 僅在 build process 使用 Next font 測試 adapter 讀取已下載的實際字型檔。

結果與截圖位於 `docs/2_agent-input/generated/yuanzhan-ui-runtime/`。驗收範圍見 [ACC-008](../../08_acceptance-and-qa/ACC-008_yuanzhan-ui-dual-mode-acceptance.md)。

## 本期限制

- 這是 UI-memory；同一預覽內切換成員可即時看到更新，不支援不同瀏覽器同步、永久保存或正式多人權限證明。
- Excel 公式為基本子集，不支援跨檔案／完整 Excel 函數。人事沒有法定扣繳、核准或付款引擎。
- 每份本機檔案上限 5 MB；沒有 OCR、雲端上傳、Git 儲存或密碼學封存。報帳沒有公開提交連結。
- 手機可日常協作；財務大表格局部橫向捲動，Evidence 深度整理以桌機為主。
- composition-event 檢查不是實體中文輸入法／iOS 全機種認證。正式 auth、DB、部署與 Gate A/B/C 仍維持原狀。
