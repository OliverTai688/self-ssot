# AI Workspace 階段開發計畫

> **定位**：不是「比較弱的 ChatGPT」，而是「Personal OS 原生 AI 工作台」。
> ChatGPT 負責深度思考，Personal OS 負責記錄、治理、沉澱與生成長期敘事。

---

## 1. 核心定位差異

| 比較維度 | ChatGPT 官方 | Personal OS AI Workspace |
|---|---|---|
| 目標 | 通用 AI 對話工作台 | 個人資料沉澱與決策系統 |
| 記憶粒度 | Project Memory（有限） | Workspace → Sprint → UnitRecord → Evidence |
| 輸入處理 | 泛用 | 結構化 Capture → 分類 → 審閱 → 轉換 |
| 輸出重點 | 回答問題 | 生成報告、行為單元、長期敘事 |
| 工具呼叫 | 官方工具（搜尋、程式碼） | Personal OS Actions（createUnitRecord、searchSprint…） |

---

## 2. 輸入屬性分類

### 2.1 訂閱屬性 (Subscription)
持續性、背景同步的外部資訊流。

| 來源 | 處理方式 | 輸出 |
|---|---|---|
| LINE | Notify Webhook → 摘要 | CaptureCandidate |
| Google Doc | OAuth 拉取 → 結構化提取 | UnitRecord Draft |
| Web RSS | 定期爬取 → 主題摘要 | Research Note |

### 2.2 類型屬性 (Type)
使用者主動上傳或建立的單次輸入。

| 類型 | 處理方式 | 輸出 |
|---|---|---|
| 圖片 | OCR + 摘要 | CaptureCandidate |
| 語音 | STT 逐字稿 + 重點提取 | CaptureCandidate |
| Markdown | 即時解析 + 結構建議 | UnitRecord Draft |
| AI 對話紀錄 | Export 匯入 + 決策提取 | Evidence / UnitRecord |

---

## 3. 階段開發藍圖

### Phase 1：Capture Layer（現階段目標）
**目標**：建立最輕量的 Capture 工作流，讓所有輸入有地方落地。

**不做什麼**：不重做通用 ChatGPT，不接真實 API，不做語音/圖片處理。

| 功能 | 說明 | 優先度 |
|---|---|---|
| ChatGPT Export 匯入 | 解析官方 `conversations.json`，批次建立 CaptureCandidate | P0 |
| Capture Inbox UI | 類 ChatGPT 對話介面，顯示 AI Triage 建議卡片 | P0 |
| 模擬訂閱匯入 | LINE / GoogleDoc / RSS 的模擬資料注入 | P0 |
| 模擬類型匯入 | 圖片 / 語音 / Markdown 的模擬資料注入 | P0 |
| AI 分類建議 | Workspace、Project、Intent、Tags 自動提案 | P1 |
| 人工審核確認 | 使用者確認後才轉成 UnitRecord | P1 |
| 置信度顯示 | 低信心自動要求人工介入 | P2 |
| 原始資料保留 | 不破壞原始輸入，可回溯 | P1 |

**完成判斷**：使用者能從介面將任一模擬來源的資料審閱並轉入資料庫。

---

### Phase 2：結構化 AI Chat（近期）
**目標**：/chat 不是泛用聊天，而是有模式的結構化工作台。

**模式定義**：

| 模式 | 觸發時機 | AI 行為 |
|---|---|---|
| Capture Mode | 快速記錄想法 | 提取 intent、建議 tags |
| Reflection Mode | 整理當下狀態 | 識別情緒脈絡、提問釐清 |
| Project Mode | 討論特定 Sprint/專案 | 根據 Project 脈絡回應 |
| Research Mode | 閱讀文獻、分析資料 | 結構化摘要、Evidence 建議 |
| Report Mode | 生成週報、季度回顧 | 從 UnitRecord/Evidence 彙整敘事 |

**核心功能**：

| 功能 | 說明 | 難度 |
|---|---|---|
| 模式切換 UI | 對話框上方的模式選擇器 | 低 |
| 澄清式對話 | 語意不明時 AI 主動詢問 | 中 |
| 拖放上傳 | 直接拖文件到對話框 | 中 |
| 證據標註 | AI 建議卡片中標示觸發關鍵字 | 中 |
| Streaming 回應 | 逐字顯示，降低等待感 | 中 |
| 對話歷史搜尋 | 在過去對話中找內容 | 中 |
| 確認後建立 UnitRecord | 對話中直接 approve 轉換 | 高 |

---

### Phase 3：API 工具能力（中期）
**目標**：讓 AI 真正能呼叫 Personal OS 的動作，不只是回答。

**優先接入的 OpenAI Responses API 能力**：

```
reasoning.effort         → 調整推理深度
web_search              → 取得外部最新資訊
file_search             → 搜尋已上傳的向量資料庫
structured_outputs      → 確保輸出格式一致
function_calling        → 呼叫 Personal OS Actions
previous_response_id    → 多輪狀態管理
```

**Personal OS Function Tools**（AI 可呼叫）：

| Function | 說明 |
|---|---|
| `createCapture(content, source, tags)` | 建立 CaptureCandidate |
| `createUnitRecordDraft(...)` | 建立待審 UnitRecord |
| `searchWorkspace(query)` | 搜尋 Workspace 脈絡 |
| `searchSprint(sprintId)` | 查詢 Sprint 狀態 |
| `searchEvidence(query)` | 搜尋 Evidence 庫 |
| `generateReportDraft(period)` | 生成報告草稿 |
| `linkEntities(sourceId, targetId)` | 建立跨實體連結 |

**工具權限確認**：涉及寫入操作一律需 human-in-the-loop 確認，不能靜默執行。

---

### Phase 4：官方級體驗補完（長期）
**目標**：在 Phase 1-3 穩定後，逐步補上官方功能。

**補充優先序**（依對 Personal OS 的價值排序）：

| 模組 | 功能項目 | 優先 | 備註 |
|---|---|---|---|
| 檔案系統 | PDF/DOCX/CSV 解析、chunking、embedding | 高 | Phase 3 後接入 |
| 語音/Record | 上傳音檔 → STT → 摘要 → CaptureCandidate | 高 | 先做非即時版本 |
| Connector | LINE Webhook、Google Drive OAuth | 高 | 先做讀取，不做寫入 |
| Obsidian 同步 | Vault 目錄掃描 → Markdown 解析 → UnitRecord | 高 | 適合你的工作流 |
| 記憶系統 | User Profile Memory、Workspace 隔離 | 中 | 建立前先定義 schema |
| 資料分析 | CSV/Excel 分析、圖表生成 | 中 | 需 sandbox 安全設計 |
| Canvas 編輯器 | Markdown 協作編輯 + AI 局部修改 | 低 | 成本高，晚期再考慮 |
| 即時語音 | Realtime API、低延遲雙向語音 | 低 | 非核心，最後補 |

---

## 4. 模組優先矩陣

根據「對 Personal OS 的核心價值」vs「實作難度」：

```
高價值、低難度（立即做）
  ├── Capture Inbox UI
  ├── ChatGPT Export 匯入
  ├── 模式切換（Capture/Reflection/Project）
  └── structured_outputs 接入

高價值、中難度（Phase 2-3 主力）
  ├── Function Calling → Personal OS Actions
  ├── 澄清式對話
  ├── 對話 → UnitRecord 轉換流程
  ├── 檔案解析 + 向量搜尋
  └── 批次審閱確認

高價值、高難度（Phase 4 謹慎規劃）
  ├── 連結器（LINE / Google Drive）
  ├── 記憶系統 + Workspace 隔離
  └── 語音 → CaptureCandidate 流程

低價值（不做或最後做）
  ├── Canvas 協作編輯器
  ├── 即時語音對話
  └── Python sandbox 資料分析
```

---

## 5. 安全與治理原則

不論哪個 Phase，以下原則全程適用：

1. **Human-in-the-loop 強制**：所有寫入 Personal OS 的動作，必須有使用者確認步驟。
2. **API Key 隔離**：LLM API key 絕不暴露在前端；全部走 Server Action 或 API Route。
3. **原始資料不可覆蓋**：任何 AI 改寫前，原始輸入必須完整保存。
4. **Permission Gate**：Connector（LINE/Gmail/Drive）採最小權限讀取，不授權寫入。
5. **Prompt Injection 防護**：用戶上傳的文件內容不直接插入 system prompt，須先 sanitize。
6. **成本控制**：每次 AI 呼叫估算 token 用量，異常用量觸發警示。

---

## 6. 技術棧建議

| 層級 | 選擇 | 理由 |
|---|---|---|
| LLM API | OpenAI Responses API | reasoning、tools、file_search 整合度最高 |
| Streaming | `ai` SDK (Vercel) | Next.js 原生整合，支援 useChat |
| 向量搜尋 | OpenAI File Search / pgvector | 先用 File Search，後期遷移 pgvector |
| 檔案解析 | LangChain Document Loaders | PDF/DOCX/CSV 統一介面 |
| 音訊轉錄 | OpenAI Whisper API | 精準度高，支援中文 |
| 資料庫 | Supabase (已有) | 延續現有架構，勿重建 |

---

## 7. 參考文件

- [B_ai_input.md](./B_ai_input.md) — AI 匯入頁功能規格與 Phase 1 進度
- [A_ai_prd.md](./A_ai_prd.md) — AI 模組 PRD
- [A_ai_situation_prd.md](./A_ai_situation_prd.md) — AI 情境 PRD
