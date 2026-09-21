# v5 忠實介面預覽與維護

目前 `/company/operating` 採用使用者 D10 指定的 **圓展 Operating System v5 兩人上線版**。原版 8 個工作区與 30 個分頁、深色 tokens、78px 導覽列、48px 頂列、圖表、大綱、抽屜與彈窗已移植。不是先前中性風格的九頁工作台。

## 開啟

- [展示模式](http://127.0.0.1:3011/company/operating)
- [空白模式](http://127.0.0.1:3012/company/operating)

```sh
pnpm ui:yuanzhan:showcase
pnpm ui:yuanzhan:empty
```

兩者分別在暫存目錄建立隔離 Next 預覽，既有 mock-auth Profile 只讀。預覽需要原環境已有可用 Profile。一般專案以原登入流程進入 `/company/operating`；用 server env `PERSONAL_OS_UI_DATA_MODE=showcase|empty` 選初始資料。未設定為 empty；其他值報錯。沒有用網址或 localStorage 覆寫資料模式。

## 操作

- 原版 8 工作區：日誌、時間線、工作台、專案、金流、容量、承諾、訊號。
- 點左下「圓展／個人」或頂列品牌切換空間。私人日誌只顯示本人；公司日誌右侧日期區可選宇星／Lily。右上切換的是示例成員視角。
- 工作日誌輸入即共享於同一工作台 store。用 `#` 召喚 Standup／工作／交易／決策，用 `@` 引用既有物件，Tab 縮排；本人寫正文、其他成員留言。
- 專案工作有清單／看板／表格／日曆；所有視圖連到同一工作。點明細開抽屜，Esc 返回。專案「對話」可輸入、附檔及填五欄 Close 卡。
- 金流帳本雙擊摘要／類別／金額直接編輯，或聚焦儲存格按 Enter。右上「表格操作」可貼上、篩選、排序與批次改類別。B＝數量、C＝單價、D＝金額；固定列號不隨排序移動。算術／SUM／AVERAGE／MIN／MAX 為本期公式範圍；收入正、支出負，沿用 v5。未知函數／循環／無效參照會阻止存檔。
- 對帳維持內帳／發票／銀行三欄，新增銀行資料後可配對或解除。已有配對的金額先解除才能更動。薪資由管理者操作本機試算，成員只讀本人。
- 左下文件庫支援本機文字、PNG／JPG／WebP、PDF，單檔 5 MB；上傳新版本後舊版本仍可讀。憑證附件可返回原交易。
- Evidence 加入文件庫檔案時選固定版本。README／驗收／成本／回顧／交付標準全過後才可輸入版本號凍結；再開新版本不改舊快照。僅輸入規劃檔名不當作已有驗收檔案。
- 容量按本人調整且合計 100%；出勤另行逐日填寫至分鐘並由本人確認。任務開始／完成時間不推導出勤工時。
- 承諾可新增來源文件、條文、承諾及月度 log；log 記錄作者。條文來源事件以理由記已履行／已協議變更，保留原事件。

## 可重跑驗證

最新結果：21 組主要＋18 組細節操作通過；showcase／empty 共 60 子頁，另以原版 30 子頁與一個完整抽屜對照。完整 app source snapshot 建置、typecheck 與 targeted lint 通過。[本次證據報告](../../2_agent-input/generated/agent-loop/reports/personal-os-owner-directed-20260913-yuanzhan-v5-fidelity.md)。

```sh
pnpm ui:yuanzhan:check
pnpm ui:yuanzhan:verify
pnpm ui:yuanzhan:v5:compare
pnpm exec tsc --noEmit --pretty false
pnpm ui:yuanzhan:build --cached-fonts
```

[原版／實作截圖、契約與結果](../../2_agent-input/generated/yuanzhan-v5-fidelity/)保留在 repo。比圖以 1440×1000 工作面為範圍；新空間切換、作者選擇、檔案及公式控制為既定需求的附加入口。像素相似度是檢查資料，不是取代操作驗收。

## 本期邊界

- 全部業務資料只在本頁記憶體；重新整理回到 env 指定的初始狀態。尚未實現不同瀏覽器間同步、資料持久化、正式財務／薪酬／法律紀錄或防竄改稽核。
- v5 的公司、合約、金額、固定日期與圖表歷史是提供原型中的展示內容，不是已驗證的正式制度。保留其視覺與情境，不據此執行付款、寄信、Telegram、AI 或外部報帳發布。
- 角色切換是 UI 權限模擬；真實 service authorization、資料庫遷移、部署、公開輸出和 monorepo 重整未納入。
- 手機支援日常日誌、工作、對話與查找。大表格／Evidence 以桌機為主要環境；表格可橫向捲動。
- 原版日曆展示固定 2026 年 9 月；清單仍可建立其他日期事件。未接外部行事曆。
- 隔離預覽只複製此工作台路由，私人研究／生活等舊模組連結需從完整原專案開啟。

## 維護位置

`src/components/yuanzhan/v5/desktop.tsx` 管理 React 生命週期；`runtime.js` 是生成的隔離工作台。可維護的修訂在 `source-patches.mjs`、`extensions.source.js`、`runtime-prelude.source.js`、`additions.css`。修改後執行：

```sh
pnpm ui:yuanzhan:v5:generate
```

生成器讀取 REF-004 原檔，將 220 個 handler 模板編譯為閉包事件；無 iframe、無 runtime eval／Function、無 inline script／event attribute。原始 HTML 不修改。`v5-state.ts`／`v5-seed.js` 是本期序列化 UI 契約與資料工廠。前版 normalized records 與元件保留為先前實作，沒有同時掛載或雙寫。
