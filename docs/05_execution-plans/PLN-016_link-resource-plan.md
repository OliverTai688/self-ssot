# Link 資源整理模組開發計劃 — AI Input 增強

**文件版本：** v1.0  
**建立日期：** 2026-05-12  
**參考文件：** `work_module_plan.md` · `phase1_ai_native_plan.md`

---

## 1. 目標 (Goal)
在 AI Input 介面中新增「Link 資源整理」功能，讓使用者能快速擷取、管理並分類多個網頁資源（URLs）。系統將自動提取網頁 metadata，並透過 AI 進行分流建議（Triage）。

## 2. 核心功能 (Core Features)

### 2.1 URL 與檔案的 Tree 結構管理
- **樹狀結構 (Tree View)**：不再僅是清單，而是採用與「交付項目」模組一致的樹狀結構進行管理。
- **資料夾支援 (Folder Support)**：支援建立資料夾，將相關的連結或檔案進行邏輯分組。
- **一致的 UI 模式**：沿用 `DeliverableTree` 的節點設計，包含摺疊、展開、新增子項目等功能。
- **即時預覽與編輯**：在樹狀節點中直接預覽 Metadata，並支援更名或移動位置。

### 2.2 AI 分流整合 (Triage Integration)
- **批量處理**：可針對整個資料夾或多選節點進行 AI Triage。
- **結構化提取**：AI 將根據資料夾的脈絡（Context）優化分類建議。
- **溯源與證據**：樹狀結構的層級關係也將作為 AI 分析的參考背景。

## 3. UI/UX 設計

### 3.1 互動流程
1. 使用者點擊「連結」按鈕。
2. 開啟一個精緻的 Dialog 或在輸入框上方顯示 Link Input。
3. 使用者貼上連結，系統顯示「擷取中...」動畫。
4. 擷取完成後顯示資源卡片。
5. 使用者確認後，這些資源會伴隨對話訊息送出，並觸發 AI 審閱流程。

### 3.2 視覺設計規範
- 使用玻璃擬態 (Glassmorphism) 的資源預覽卡片。
- 微交互動畫：連結載入時的 Pulse 效果。
- 支援 Dark Mode。

## 4. 技術實作

### 4.1 資料模型擴充 (`src/types/ingestion.ts`)
- 確保 `RawSourceType` 支援 `url`。
- 擴充 `RawSourceItem` 欄位以儲存網頁 Metadata。

### 4.2 Pipeline 動作 (`IngestionProvider`)
- 新增 `addUrlCapture(urls: string[])` 函數。
- 模擬網頁內容提取流程（Phase 1 使用 Mock 延遲載入）。

### 4.3 檔案變動清單

| 檔案 | 說明 |
|------|------|
| `src/app/(dashboard)/ai-input/page.tsx` | 新增「連結」匯入按鈕與互動邏輯 |
| `src/lib/context/ingestion-context.tsx` | 新增 `addUrlCapture` 邏輯與狀態管理 |
| `src/components/ai/link-resource-card.tsx` | [NEW] 網頁資源預覽卡片元件 |
| `src/components/ai/add-link-dialog.tsx` | [NEW] 連結輸入對話框 |

## 5. 完成標準
- [ ] 可在 AI Input 介面看到「連結」按鈕。
- [ ] 點擊後可輸入 URL 並看到模擬的擷取預覽。
- [ ] 送出後 AI 會正確產生該連結的「審閱建議」。
- [ ] UI 符合系統整體的 premium 質感。
