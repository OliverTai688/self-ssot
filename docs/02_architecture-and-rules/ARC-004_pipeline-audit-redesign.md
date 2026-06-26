# 四段管線稽核與重設計方向

> 撰寫日期：2026-05-09  
> 對應介面：AI Intake Center（`/inbox`）  
> 對應程式：`src/app/(dashboard)/inbox/page.tsx`、`src/lib/context/ingestion-context.tsx`、`src/components/ai/triage-proposal-card.tsx`

---

## 一、現況稽核：四段管線逐段檢視

### Stage 1 — 原始來源（Raw）

**資料模型**：`RawSourceItem`  
**主要欄位**：`sourceType`、`rawText`、`previewText`、`processingStatus`、`aiStatus`、`privacyLevel`

**現況描述**  
- 支援 7 種輸入類型：`manual_message`、`line_message`、`google_doc`、`markdown_document`、`image`、`audio`、`receipt`、`url`
- 每筆資料進入時立刻被標記 `processingStatus: "unprocessed"` 或直接跳至 `"processed"`（mock 流程中幾乎所有資料都是直接 `processed`）
- `aiStatus` 欄位存在但目前僅作為下游狀態反射，未在這個 tab 有明顯視覺呈現

**結構性問題**
1. **狀態轉換不透明**：`processingStatus` 的 `"processing"` 狀態只在 `runMockAnalysis` 的 800ms timeout 中短暫存在，使用者無法感知「原始 → 標準化」這個步驟的存在
2. **URL 類型是孤島**：`rsi-7`（URL 類型）是唯一真正的 `unprocessed` 狀態示範，但在 UI 上的 `SourceItemCard` 中呈現方式與其他類型沒有明顯差異
3. **privacyLevel 未作用**：型別定義了 `private / shareable / public_safe` 但 UI 未顯示，也未影響 AI 分析權限
4. **metadata 是黑盒**：`metadata: Record<string, string | number | boolean>` 儲存了 `lineGroupName`、`driveFileName`、`wordCount` 等有用資訊，但只有少部分在 `TriageProposalCard` 的標頭區顯示

---

### Stage 2 — 標準化（Normalized）

**資料模型**：`NormalizedContent`  
**主要欄位**：`contentType`、`text`、`heading`、`orderIndex`、`tokenEstimate`

**現況描述**  
- 支援 7 種標準化輸出類型：`message_text`、`document_text`、`document_chunk`、`transcript`、`image_summary`、`receipt_extraction`、`url_excerpt`
- Google Doc 會產生多個 `document_chunk`（含 `heading` 與 `orderIndex`），其他來源通常產生 1 個 normalized record
- `ProcessingTab` 顯示每個 item 的段落數量與 token 估計值

**結構性問題**
1. **標準化品質不均**：手動輸入(`addManualCapture`)直接把 raw text 複製為 normalized text，等於沒有標準化；Google Doc 才有真正的分段與標題萃取
2. **image_summary 是 mock 值**：圖片上傳後的 normalized text 是硬編碼字串，不反映真實 OCR 流程
3. **NormalizedContent 未被 AI 分析充分利用**：`makeProposal()` 只使用 raw text 做 keyword matching，沒有使用 normalized chunk 的 `heading` 或 `orderIndex`，這意味著 chunking 結構對 AI 決策完全沒有作用
4. **receipt_extraction 有結構**：`nc-7`（文具王收據）的 text 是格式化的結構化文字，但後續的 proposal 只把它當作一般字串處理，結構優勢未被利用

**當前標準化能力矩陣**

| 來源類型 | 實際標準化行為 | AI 利用程度 |
|---------|--------------|------------|
| manual_message | raw text 直接複製 | keyword match |
| line_message | raw text 直接複製 | keyword match |
| google_doc | 3 chunks + heading | 只用 previewText |
| markdown_document | 2 chunks + heading | 只用 previewText |
| audio | transcript 字串 | keyword match |
| image | image_summary 字串 | keyword match |
| receipt | key-value 文字 | keyword match |

---

### Stage 3 — AI 審閱（Review）

**資料模型**：`AITriageProposal`  
**主要欄位**：`aiType`、`confidence`、`summary`、`recommendation`、`reasoning`、`suggestedPlacement`、`extractedEntities`

**現況描述**  
- 目前有 6 種 `aiType`：`triage`、`project_context`、`research_mapping`、`finance_draft`、`life_care`、`memory_capture`
- AI 判斷邏輯：`KEYWORD_RULES` 表格（keyword → aiType），first-match 原則
- 置信度邏輯：`aiType === "triage"` → low；keyword 命中數 ≥ 2 → high；其他 → medium
- 每張卡片呈現：分類標籤 + 置信度 bar + 摘要 + extracted entities + 建議放置位置 + 推薦行動 + 可展開的「AI 判斷依據」和「原文依據」
- 批次確認：高置信度 > 1 筆時出現 "全部確認" 按鈕

**結構性問題**
1. **卡片是靜態報告，不是對話**：目前的 `TriageProposalCard` 是一份「AI 寫給使用者的報告」，使用者只能接受/拒絕，沒有辦法反問、補充脈絡、或讓 AI 調整觀點
2. **缺乏 before/after 感知**：卡片只呈現 AI 的當前建議，沒有呈現「這件事現在的狀態是什麼（before）」與「確認後會變成什麼（after）」，使用者很難評估決策的影響
3. **議題性薄弱**：summary 是一段描述文字，而非一個「議題」——沒有標題、沒有優先級、沒有預計行動時間、沒有和現有結構的對應關係
4. **recommendation 是通用模板**：`RECOMMENDATION_MAP` 對每個 aiType 都是同一句話，沒有根據具體內容客製化
5. **缺乏反覆討論的機制**：使用者「編輯」後只能修改 summary 文字，不能展開對話讓 AI 重新分析

---

### Stage 4 — 已確認（Confirmed）

**資料模型**：`UserDecision` + 更新後的 `AITriageProposal.status`  
**主要欄位**：`decisionType`（confirm/edit/dismiss/defer）、`editedSummary`

**現況描述**
- `ConfirmedTab` 顯示 status 為 `confirmed`、`edited`、`dismissed` 的 proposals（用同一個 `TriageProposalCard` 但 opacity 降低）
- `UserDecision` 記錄每筆決策，但目前沒有任何 UI 顯示這個 table 的內容
- `resolveProposal` 同時更新 proposal status 和 linked raw items 的 `aiStatus`

**結構性問題**
1. **確認 ≠ 儲存**：「已確認」的資料並沒有真正寫入任何模組（工作/研究/財務等），這個 tab 只是「決策過了」的暫存區，缺乏下游連結
2. **dismissed 跟 confirmed 混在一起**：已確認和已略過都顯示在同一個 tab，沒有區分，容易讓使用者誤認已略過的項目也是有效資料
3. **UserDecision 的 `editedRecommendation` 永遠是 null**：型別定義了這個欄位，但 `resolveProposal` 從未寫入，等同無效欄位
4. **缺乏 SSOT 反寫機制**：確認後沒有任何機制通知對應的工作/研究/生活模組，系統的各模組之間仍然是孤島

---

## 二、優化方向分析

### 優化 A：AI 審閱 → 議題卡片 + 同事對話模式

**問題核心**：現有的 `TriageProposalCard` 是「AI 寫給你的報告」，而你希望它變成「AI 同事指著介面跟你說事情」。

**設計方向**：

```
┌─────────────────────────────────────────────────────┐
│ [議題標題]  Lisa Q2 Dashboard — Banner 修改請求       │
│ 狀態：設計任務等待確認   優先級：🔴 高   來源：LINE   │
├─────────────────────────────────────────────────────┤
│ BEFORE                    AFTER (若確認)              │
│ Lisa 還沒有官方的          → 新增設計任務「Banner     │
│ Banner 規格要求            調整 1200×628 + 配色」     │
│                            → 歸屬：工作 > Lisa Q2   │
├─────────────────────────────────────────────────────┤
│ 💬 AI 同事說：                                       │
│ 「這個 Lisa 的訊息我看起來是 Facebook Banner          │
│  的修改請求，1200×628 是 FB 的標準尺寸。背景太暗      │
│  那個我猜是指上週給的那版。你要直接確認今天回她        │
│  預計時間嗎，還是先跟我說一下這個任務的 deadline？」   │
│                                                     │
│ [你的回覆輸入框]                            [送出] │
├─────────────────────────────────────────────────────┤
│ ✓ 確認      ✏ 編輯      ⏱ 稍後      ✗ 略過        │
└─────────────────────────────────────────────────────┘
```

**關鍵差異**：
- `summary` 升格為**議題標題**（類似 ClickUp task name），有優先級和預計影響
- 明確呈現 **before state**（現在的狀況）和 **after state**（確認後的變化）
- AI 說話的語氣從「報告」變成「同事的口語說明」，並且**提問**而不只是建議
- 附帶對話輸入框，讓使用者可以補充脈絡或反問

**型別擴充需求**：
```typescript
interface AITriageProposal {
  // 新增
  issueTitle: string              // 議題標題（簡短，類 ClickUp task）
  beforeState: string             // 確認前的現況描述
  afterState: string              // 確認後的預期變化
  colloqComment: string           // AI 同事式的口語說明（帶提問）
  priority: "high" | "medium" | "low"
  // 現有的 summary 可以保留為「詳細描述」
}
```

---

### 優化 B：標準化 → 確保所有輸入都達到「AI 可用」品質

**問題核心**：手動輸入和 LINE 訊息沒有真正被標準化，直接 pass-through，降低了 AI 分析的品質基準。

**設計方向**：每種輸入類型都應該有對應的標準化策略，輸出必須包含：
1. 純文字內容（可送給 AI 做 embedding 和 reasoning）
2. 結構化 metadata（用於 filter 和 routing）
3. 語義標籤（用於跨資料洞察）

**當前 gap 和補救方案**：

| 輸入類型 | 目前問題 | 補救策略 |
|---------|---------|---------|
| manual_message | raw = normalized | 加入意圖偵測（是問題/行動/觀察/感受？）|
| line_message | raw = normalized | 加入傳送者關係脈絡、對話類型標記 |
| google_doc | 分塊但 AI 只看 preview | 讓 proposal 使用所有 chunks 做摘要 |
| markdown | 分塊但 AI 只看 preview | 同上 |
| receipt | 結構化文字但 AI 只 keyword match | 加入金額/商家/日期的結構化萃取 |
| audio | 轉錄文字直接用 | 加入情感色調、時間段標記 |

**核心原則**：  
標準化的輸出不只是「清理過的文字」，而是「讓 AI 和人類都能一眼看懂這筆資料的結構化描述」。標準化好的資料，是 AI 對話的共同語言基礎。

---

### 優化 C：共同目標區域 + 多層次視角討論

**問題核心**：AI 作為「同事」，應該和你有共同的使命和目標脈絡，這樣它的分析才不只是通用建議，而是針對你的狀況的洞察。

**設計概念**：

```
Personal OS 的共同目標脈絡（Mission Context）
├── 個人使命（由使用者定義，全域可見）
│   例：「建立高效個人知識系統，聚焦研究與商業兩線並行」
├── 當前季度重點（每季更新）
│   例：「Q2 完成 ESG 研究初稿、Allen NGO 提案、Lisa 三個專案交付」
└── 活躍專案列表（自動從工作模組同步）
    例：Lisa Q2、Allen NGO、nuva藍、CBAM 研究
```

**每個 AI 審閱議題的多層次分析**：

```
層次 1：一般情況分析（通用視角）
→「這是一個客戶的具體設計修改請求，通常應在 24 小時內回覆。」

層次 2：使命視角分析（個人脈絡視角）
→「根據你目前 Q2 三個交付目標，Lisa 的 Banner 改動屬於現有客戶維護，
  優先級低於 Allen NGO 的新提案截止（5/12）。建議先確認修改時間，
  但今天的焦點放在 Allen 財務數據。」

層次 3：模式洞察（跨時間視角，需要足夠資料量）
→「過去兩週 Lisa 已有 3 次設計修改需求，這個客戶的 spec 變動頻率
  偏高，可能需要更明確的設計確認流程。」
```

**實作路徑**：
- `MissionContext` 型別：儲存個人使命、季度目標、活躍專案
- AI 審閱時注入 context，讓每個 proposal 的 `reasoning` 有層次感
- 對話過程（user-AI 來回）儲存為新的 `NormalizedContent`，contentType 為 `"ai_dialogue"`，回寫到對應 rawSourceItem 或建立新的來源記錄

---

### 優化 D：對話即輸入，討論變成 SSOT 材料

**問題核心**：你和 AI 同事的討論本身是有價值的材料，應該被記錄下來並成為系統的一部分。

**資料流向**：

```
[使用者輸入] → Stage 1 RawSourceItem (sourceType: "manual_message")
     ↓
[AI 生成議題卡片] → Stage 3 AITriageProposal
     ↓
[使用者回覆] → 新的 NormalizedContent (contentType: "ai_dialogue")
              同時更新 proposal 的 colloqComment 歷程
     ↓
[使用者確認] → Stage 4 + 反寫到對應模組 (work/research/life...)
              + 整個對話記錄附著在 SSOT 記錄上
```

**對話記錄型別**：
```typescript
interface AIDialogueEntry {
  id: string
  proposalId: string
  rawSourceItemId: string
  speaker: "user" | "ai"
  content: string
  timestamp: string
  // 對話完成後，這些 entries 打包成 NormalizedContent
  // contentType: "ai_dialogue"
}
```

**為什麼這對標準化層有意義**：  
AI 對話中可能出現使用者補充的脈絡（「這個 Lisa 是新客戶，我跟她只合作兩個月」），這些補充比原始訊息更有語義價值，應該進入 NormalizedContent 而不是消失在 chat history 中。

---

## 三、優先執行順序建議

| 優先級 | 項目 | 說明 |
|--------|------|------|
| P0 | AI 審閱 → issueTitle + before/after | 視覺影響最大，立即改變「報告感」→「議題感」 |
| P0 | AI 審閱 → colloqComment（口語說明）| 讓 AI 有「同事」的感覺，不需新型別，在現有 reasoning 改寫即可 |
| P1 | 對話輸入框（inline chat in card） | 讓使用者可以回覆 AI，這是最關鍵的互動升級 |
| P1 | MissionContext 基本型別定義 | 先定義資料結構，暫時 mock，不需 UI |
| P2 | 標準化策略分層 | 補齊 manual/line 的 intent detection |
| P2 | 對話記錄 → NormalizedContent 反寫 | 讓討論過程變成可用材料 |
| P3 | 多層次視角分析（層次 2、3）| 需要足夠的 context data 才有意義 |

---

## 五、議題歸檔 → 完整證據單位（Closed Issue as Evidence Package）

### 核心概念

議題從「開啟」到「關閉」是一個完整的生命週期。**關閉議題**不等於「確認 proposal」，而是一個主動的收尾動作——使用者決定這件事已經討論到可以收攏的程度，這時 AI 應該自動產生一份**議題歸檔報告**，把整個過程打包成系統中一個完整、可查、可引用的**證據單位（Evidence Package）**。

這個概念改變了「已確認」的定義：

- 舊版：confirm = 「我同意 AI 的分類」，proposal status 改為 `confirmed`
- 新版：close = 「這件事討論完畢」，產生 `IssueArchive`，成為 SSOT 的一個節點

---

### 議題生命週期

```
[原始輸入] → [AI 開啟議題] → [使用者與 AI 對話討論]
                                        ↓
                              使用者決定：這件事可以關閉了
                                        ↓
                         AI 生成議題歸檔報告（IssueArchiveReport）
                                        ↓
                         打包為完整證據單位（ClosedIssuePackage）
                                        ↓
                         寫入 SSOT（對應模組：工作/研究/生活/財務...）
```

議題的可能關閉方式：

- **resolved（已解決）**：討論出明確行動，已採取或已安排
- **parked（暫擱）**：目前沒有行動，但保留討論記錄供未來參考
- **dismissed（略過）**：判斷此事不需進一步處理

---

### AI 歸檔報告的結構

當使用者關閉議題時，AI 根據以下材料自動生成報告：

```
IssueArchiveReport
├── 議題標題（issue_title）          原議題標題
├── 開啟時間 / 關閉時間
├── 關閉方式（resolved / parked / dismissed）
├── 原始材料摘要（source_summary）   原始輸入的重點
├── 討論摘要（dialogue_summary）     AI 整理整個討論過程中的關鍵轉折
│   例：「使用者補充了 Lisa 是新客戶的脈絡，
│        因此最終決定今天回覆修改時間，
│        但不優先於 Allen NGO 的截止日。」
├── 最終決策（final_decision）       最後達成的結論是什麼
├── 行動項目（action_items[]）       若有，列出具體行動（含負責人、預計時間）
├── 關鍵實體（key_entities[]）       討論過程中識別出的人/事/物/日期
└── SSOT 放置位置（ssot_placement）  這份歸檔應該掛在哪個節點下
```

---

### 完整證據單位的資料模型

```typescript
// 議題中的單一對話記錄
interface AIDialogueEntry {
  id: string
  proposalId: string
  speaker: "user" | "ai"
  content: string
  timestamp: string
  attachedRawSourceItemIds?: string[]  // 若討論中引用了額外材料
}

// AI 自動生成的歸檔報告
interface IssueArchiveReport {
  id: string
  sourceSummary: string        // 原始輸入的重點
  dialogueSummary: string      // AI 整理的討論精華
  finalDecision: string        // 最終達成的結論
  actionItems: ActionItem[]    // 行動項目
  keyEntities: string[]        // 識別出的關鍵實體
  ssotPlacement: string        // 建議的 SSOT 放置位置
  generatedAt: string
}

interface ActionItem {
  description: string
  assignee: string | null      // 可以是使用者本人或其他人
  dueDate: string | null
  status: "pending" | "done"
}

// 完整證據單位（最終的 SSOT 原子單位）
interface ClosedIssuePackage {
  id: string
  proposalId: string                    // 對應的原始 AITriageProposal
  rawSourceItemIds: string[]            // 原始材料
  normalizedContentIds: string[]        // 標準化內容
  evidenceIds: string[]                 // 原始證據
  dialogueEntries: AIDialogueEntry[]    // 討論過程
  archiveReport: IssueArchiveReport     // AI 歸檔報告
  closingType: "resolved" | "parked" | "dismissed"
  closedAt: string
  // 關閉後，這整個 package 可以被其他議題引用
  // 也可以被 AI 在未來的分析中作為「歷史案例」參考
}
```

---

### 為什麼這改變了「已確認」tab 的定位

| 面向 | 舊的「已確認」 | 新的「議題歸檔」 |
| --- | --- | --- |
| 資料單位 | 一個 proposal（狀態改變） | 一個 ClosedIssuePackage（新記錄產生） |
| 包含什麼 | proposal 的原始資料 | 原始材料 + 討論 + AI 報告 |
| 可查性 | 只看到 proposal 的欄位 | 完整的思考過程和決策理由 |
| 對未來的作用 | 無 | AI 未來分析時可引用為「你之前處理過類似情況」 |
| 與 SSOT 的關係 | 無直接連結 | 直接掛載在對應的 SSOT 節點 |

---

### 歸檔報告對 SSOT 的作用

關閉後的 `ClosedIssuePackage` 會成為對應 SSOT 節點的**附件記錄**：

```text
工作 > Lisa Q2 Dashboard
├── 設計任務：Banner 調整 1200×628       ← 從行動項目來的
└── 附件：[議題歸檔] 2026-05-09 Banner 修改請求討論  ← ClosedIssuePackage
    ├── 原始 LINE 訊息（Lisa）
    ├── 討論摘要：補充了 Lisa 是新客戶的背景
    └── 決策：今天回覆時間，不影響 Allen NGO 截止日優先級
```

這讓 SSOT 節點不只有「最終狀態」，還有「為什麼是這個狀態」的完整脈絡。

---

## 四、現有型別的保留與擴充策略

現有的型別設計（`RawSourceItem`、`NormalizedContent`、`Evidence`、`AITriageProposal`、`UserDecision`）整體健康，核心結構不需要打掉重來。

**擴充而非替換**：
- `AITriageProposal` 加欄位：`issueTitle`、`beforeState`、`afterState`、`colloqComment`、`priority`
- 新增型別：`MissionContext`、`AIDialogueEntry`
- `NormalizedContentType` 加值：`"ai_dialogue"`
- `RawSourceType` 加值：`"ai_conversation"`（讓整段對話可以成為一個來源）

**不需要改動**：
- `UserDecision` 的決策記錄邏輯
- `IngestionContext` 的 pipeline action 結構
- Evidence 的溯源機制（這個設計很好）
