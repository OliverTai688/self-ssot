# Owner-directed 2026-09-25 — 金流三面（收單／帳務／洞察）

## 任務

- Task：`YZUI-023` 金流模組依 RES-032 重構為三面 × 三分頁，並落地收件匣、憑證檔案（R2）、月結鎖帳。
- 來源：Owner 看過 `cashflow-three-faces-prototype.html`（八個情境的可操作原型與評分卡）後指示「完全採用提案，照片可以存在 Cloudflare R2，開始實作」。
- 研究：`docs/07_research-and-design/RES-032_cashflow-module-intake-ledger-insight-layering-research.md`。
- Owner 決策（2026-09-25，採原型建議）：
  1. 完整三面重構，不只插分組小標。
  2. 第一個投遞管道是上傳（含手機拍照），檔案存 R2；外部報帳 token 連結另期。
  3. 月結鎖帳：可加註、可補憑證；金額、日期、歸屬、類別、摘要、代收付唯讀；解鎖要填原因並留紀錄。

## 產品能力變化

| 面 | 分頁 | 之前 | 之後 |
|---|---|---|---|
| 收單（每天 · 全員） | 收件匣 | 沒有這一頁 | 拍照／選檔／拖放 → 補金額與歸屬 → 送出；成員的單據自動成為代墊報帳；負責人在這裡核准 |
| | 我的報帳 | 「報帳」分頁；承諾「發布外部 token 連結」但未實作 | 狀態步驟條；移除未實作的承諾，改寫明「尚未開放」 |
| | 憑證庫 | 帳本的 segmented 切換，憑證只是字串標籤 | 獨立分頁，顯示真實檔案縮圖（R2 預簽下載）；缺憑證可直接點名稱上傳 |
| 帳務（每週 · 記帳） | 帳本 | 寫死 `2026-09`、只有「缺憑證」一種狀態 | 期間切換、五種篩選、③④⑤ 生命週期狀態、上方「待歸帳」條（選類別即入帳）、空狀態不畫表頭 |
| | 對帳 | 空資料仍畫全 0 調節表；逐筆手動 | 建議配對（金額相同、日期差 ≤3 日，附理由）、確認全部、找配對、解除、CSV 匯入（單欄金額或支出／存入兩欄、民國年）、空狀態 |
| | 月結 | 不存在 | 四項檢查＋「前往」；全過才能鎖；頁內確認；解鎖要原因；月結紀錄 |
| 洞察（每月 · 決策） | 公司 | Runway `6.8`、應收未收 `88000` 寫死 | 淨額／收入／支出由帳本計算且可下鑽；Runway 與應收未收誠實顯示「尚未設定」；支出構成與近月淨額 |
| | 專案 | 瀑布圖寫死 `PRJ-2026-004` | 專案切換（成員只見自己參與的）＋瀑布＋預算 vs 實際 |
| | 人事 | （已由 extensions 改讀 `DB.payroll`） | 沿用 |

行為修正：核准代墊原本會自動以「公司層級／場地」寫進帳本，現在改為進入「待歸帳」，由記帳者選類別與歸屬後入帳。

## 架構與資料

- 新增 extension `src/components/yuanzhan/v5/cashflow-faces.source.js`＋`cashflow-faces.css`（掛在 generator 的 EXTENSIONS 最後）。凍結原型未動；三個 `S.tab` 判斷在 `extensions.source.js` 改為 `cfKey()`。
- 舊索引相容：`opRedirect` 包一層，把 `nav('money', 0..5)` 轉到新位置（0 依角色落點）。訊號、指令面板、其他模組的既有連結全部繼續有效。
- 生命週期 ③④⑤ **推導不存**：已勾稽＝有銀行明細的 `m` 指向該交易；已結帳＝該月 `periods.st==='closed'`。
- Prisma（僅新增，migration `20260925090000_operating_cashflow_intake_and_periods`）：
  - `OperatingIntakeItem`（`operating_intake_items`）：金額可為 null（缺金額不假裝是 0）、`file` Json 只存 R2 參照、`reimbRef`、`postedRef`。
  - `OperatingPeriod`（`operating_periods`）：`(workspace_id, period)` 唯一；`checklist`、`log` Json。
  - `OperatingTransaction.attachments` Json default `[]`。**偏離 RES-032 §6**：沒有把 `vouchers String[]` 改成 `Json[]`——那需要改寫每一列；種類標籤與檔案本來就能並存。
  - 回滾：drop 兩張表與一欄，既有資料不受影響。
- 寫入管線：`intake`、`periods` 加入 `PERSISTED`／`WRITE_ENABLED`／`HIGH_RISK_COLLECTIONS`；新增 `period_closed`、`forbidden` 兩個拒絕碼，使用者看到的是「哪個月、為什麼」，不是「請重試」。
- 伺服器端守衛（`operating-commands.service.ts`）：
  - 已結帳月份的交易：比對**資料庫現值**，只允許改備註、憑證標籤、附件；刪除與移入／移出已結帳月份都擋。銀行明細同樣擋（勾稽狀態是月結檢查的一部分）。
  - 月結與解鎖只有負責人（`seat.actor === 'yz'`）；解鎖必須帶原因；月結紀錄不能刪。
  - 收件：成員只能以自己的名義交件、只能改自己的；歸帳（posted）只有負責人。
  - 報帳：成員不能把狀態推到「已核／已付」（先前沒有這道檢查）。
  - 附件只收 `operating/` 前綴的 R2 key；data URL 不會進資料庫。
- 讀取：成員只讀得到自己交的收件（伺服器端過濾，不是只靠前端遮）。
- R2：沿用既有 `/api/company/operating/uploads`（伺服器產生 key、5 MB、png/jpg/webp/pdf、上傳 15 分鐘／下載 5 分鐘預簽）。prototype 模式維持 data URL、不發網路請求。

## 驗證

| 指令 | 結果 |
|---|---|
| `pnpm db:validate` | PASS |
| `pnpm db:generate` | PASS（Prisma Client 7.8.0） |
| `pnpm exec tsc --noEmit --pretty false` | 0 errors |
| `node scripts/generate-yuanzhan-v5.mjs` | PASS（445 handler templates） |
| `node scripts/check-prisma-structure.mjs` | PASS（69 models） |
| `tsx scripts/check-operating-commands.ts` | 34 PASS |
| `node scripts/check-operating-command-fields.mjs` | 302 PASS（新增兩個 model、`attachments`、`OperatingPeriod` 複合鍵） |
| `node scripts/check-migration-coverage.mjs` | PASS（69 tables） |
| `check-operating-runtime.ts`（以 `.mts` 執行） | PASS：showcase／empty 兩模式 7 模組 26 分頁，0 錯誤、0 NaN |
| `check-operating-canvas.ts`（以 `.mts` 執行） | 18 PASS |
| `check-journal-day-state.ts` | 27/27 PASS |
| `check-reply-jump.ts` | 22/22 PASS |
| **`scripts/check-cashflow-faces.ts`（本輪新增）** | **43/43 PASS** |
| Playwright 截圖（本機隔離預覽 showcase，1440 與 390 寬） | 帳本、對帳、月結、收件匣、洞察、手機收件匣；console 0 錯誤 |

`check-cashflow-faces.ts` 走 database 模式載入路徑並實際點擊：角色落點、舊索引轉址、成員補齊（缺資料會說還差什麼、選歸屬不清掉已輸入金額）、拍照上傳存成 R2 參照、核准不產生交易、待歸帳 → 選類別入帳、生命週期狀態、建議配對、CSV 匯入（含逗號與引號、支出／存入兩欄）、月結檢查擋鎖、頁內確認、鎖後抽屜與加註表單、無原因不能解鎖、洞察不顯示寫死數字、KPI 下鑽、成員邊界。

已知的環境問題（非本輪造成、未修）：`pnpm ops:check` 中的 `check-operating-runtime.ts` 與 `check-operating-canvas.ts` 在目前的 `tsx` 會被當成 CJS 轉譯而拒絕 top-level await；複製成 `.mts` 執行則通過。兩支腳本本輪未改動。

## 未驗證／需要 Owner 執行

- **資料庫 migration 尚未套用**。正式或共用資料庫需要 Owner 執行 `pnpm db:deploy`（`20260925090000_operating_cashflow_intake_and_periods`）。未套用前，database 模式寫入 `intake`／`periods` 會失敗，讀取會因查不到表而整個 store 失敗——**部署前必須先 migrate**。
- R2 的實際上傳沒有在真的 bucket 驗證（測試以假的預簽網址代替）。Owner 本機：`/company/operating` → 金流 → 收單 → 拍照，確認縮圖出現、重整後仍在、憑證庫與交易抽屜看得到。
- 四個主題（white／orange／black／brand）只截了 black。

## 風險

- 一個命令裡多筆變更不在同一個 DB transaction（既有設計）：例如歸帳同時建立交易與更新收件，若第二筆被拒，第一筆已寫入。本輪的月結守衛讓這種情況更可能發生在已結帳月份，但前端已先擋同樣條件。
- 捨棄的收件不會刪 R2 物件（孤兒檔案），需要之後的清理工作。
- 成員看得到自己參與專案的交易（契約 §9.6 既有規則），但帳務面顯示邊界說明；成員若從交易抽屜等其他入口仍可檢視，這是既有行為，沒有收緊。
- 另一個 session 在同一個工作樹同時開發（日誌通知），並已把 `operating-commands.service.ts`、`operating-store.service.ts` 暫存進它的 index；兩邊的變更會混在同一個 commit，除非分開提交。

## NANDA Agent Protocol Gate

不適用：本輪未新增、修改或暴露任何 AI agent 能力。

## 下一步

- `YZUI-024` 對帳規則與批次歸帳（P2）
- `YZUI-025` 現金帳戶與 Runway（`OperatingAccount`）
- `YZUI-026` 應收未收（`dueDate`／`settledDate`）
- `YZUI-027` 外部報帳連結（對外輸出，`HUMAN_APPROVAL_REQUIRED`）
- `YZUI-028` 會計師交付包
