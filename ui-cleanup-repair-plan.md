# 小字英文資訊清除與頁面精簡修復計畫

**日期：** 2026-08-24
**依據：** `ui-audit-and-fixes.md`（既有稽核報告）＋ Owner 本次追加指示（保持頁面簡潔、只留真的能用的功能、規劃中功能只留一個字、拿掉所有示範資料與三種小字）
**狀態：** 待審閱／待排入 `PLN-060`／`PLN-061`（依 `AGENTS.md` §14，本檔先以獨立檔案交付，避免與正在跑的 10 分鐘 Codex 迴圈搶編輯同一份大檔案）

## 1. 目標

把目前散落在各頁面的「開發用小字英文資訊」徹底清掉，並收斂成三條可長期遵守的規則：

1. 頁面上只出現使用者**現在真的能操作**的功能；不能用的功能不要用一整段說明文字或狀態牆去解釋「為什麼還不能用」。
2. 規劃中、尚未開發的功能，只用**一個詞**的極簡標示帶過（例如「規劃中」），不附說明句、不附任務代號、不附時間表。
3. 移除所有示範／範例資料與其切換開關，畫面上不再出現「示範資料」「Demo」之類的模式提示。

## 2. 四類「小字英文」問題與現況證據

在既有的 `ui-audit-and-fixes.md` 之外，本次直接查了目前程式碼，確認以下四類問題目前的實際落點：

| 類別 | 說明 | 目前程式碼證據 |
|---|---|---|
| A. 治理／權限旗標外洩 | `externalRegisterable`、`L0_LOCAL_PROTOTYPE`、`launchLevels`、任務代號（`OWNEROS-002B`、`AUTH-005`）等內部狀態被直接印成畫面文字或徽章 | `src/lib/owneros/control-plane-pages.ts`、`src/app/(dashboard)/admin/ai-governance/ai-governance-panel.tsx`、`src/app/(dashboard)/agents/agent-command-center-client.tsx`、`src/app/(dashboard)/admin/detail/[section]/owner-evidence-client.tsx` 等十餘個 `contracts`/`services` 檔案定義的欄位，目前仍會被對應頁面讀出顯示 |
| B. 開發環境細節外洩 | 環境變數字串（如 `PERSONAL_OS_AUTH_MODE=mock`）、指令片段、readiness JSON 曾出現在 `/login`、`/` 首頁 | `ui-audit-and-fixes.md` §3.12 記錄已修，但屬於同一套 `research-formal-readiness.contract.ts`／`admin-readiness.service.ts` 資料來源，其他頁面（`/admin`、`/agents`）仍在讀同一批 readiness 欄位 |
| C. 重複標題／未分層長文字 | 頁面標題與元件自帶標題疊兩層、任務代號夾在長段落裡沒有截斷 | `ui-audit-and-fixes.md` §6 已列出根因與修復方式（改用共用 `AppHeader`／`DetailDrawer`），但 §6 提醒「新頁面加入時容易忘記拿掉元件自帶標題」，需要建立檢查機制而非修一次就結束 |
| D.（本次新增）示範資料模式全站曝光 | 「示範資料 / 正式模式」切換與提示文字，出現在側欄 footer、`/settings`、`/ai-input` | `src/lib/context/mock-data-mode-context.tsx`（提供者）、`src/components/layout/app-sidebar.tsx:51`、`src/app/(dashboard)/settings/settings-client.tsx:180-361`、`src/app/(dashboard)/ai-input/ai-input-client.tsx:784` |

另外用 `Badge` 元件的頁面共 13 個檔案（`research` 三個子頁、`settings` 三個子頁、`admin`、`agents`、`dashboard`、`work` 兩個子頁、`ai-input`），這是徽章牆最容易復發的位置，修復時要逐一檢查而不是只看首屏截圖。

## 3. 修復原則（對應 Owner 三點指示）

### 3.1 只留真的能用的功能

- 逐一盤點每個頁面上的按鈕／連結／分頁，凡是點下去只會出現「尚未實作」「即將推出」說明卡、或導到一個空狀態頁的，判定為「未完成功能」。
- 未完成功能**從主要操作區移除**，不要用 disabled 按鈕＋懸浮說明的方式假裝存在；如果一定要讓使用者知道「以後會有」，改走 3.2 的單字標示規則，而不是保留完整 UI 骨架。

### 3.2 規劃中功能的呈現規範

- 建立一個共用的極簡標籤元件（例如 `<PlannedTag />`），只輸出**一個詞**，預設「規劃中」，不帶說明句、不帶連結、不帶任務代號。
- 這個標籤取代目前散落的：「即將推出」＋一段說明（`ai-input-client.tsx`）、"Coming soon"／`Draft TODO #128` 這類半成品文字（`audit-panel.tsx`）、以及所有 governance badge 牆（第 2 節 A 類）。
- 若某功能背後其實有一整組 research/contract 文件（如 `RES-028` 的多代理協作、資料夾庫），這些文件保留在 `docs/` 供開發追蹤即可，**不需要**把文件裡的內部代號、階段名稱同步搬到使用者畫面上。

### 3.3 移除所有示範資料

- 拿掉 `MockDataModeProvider`／`useMockDataMode` 這一整套「示範 vs 正式」使用者可切換的機制，改成純粹的環境變數（例如 `.env` 的 `SEED_DEMO_DATA`），只在本機開發時由開發者自己控制，畫面上完全不出現切換開關或狀態提示。
- 受影響的三個曝光點要同時處理：
  - `src/components/layout/app-sidebar.tsx`：拿掉 footer 的示範/正式 badge 與切換按鈕。
  - `src/app/(dashboard)/settings/settings-client.tsx`：拿掉「示範資料可見／正式模式已啟用」整組卡片與說明文字（約 179-361 行一帶）。
  - `src/app/(dashboard)/ai-input/ai-input-client.tsx`：拿掉「示範資料模式」pill 提示（784 行起的邏輯）。
- 資料層面：頁面在沒有真實資料時，改成標準空狀態（一句「尚未有資料」＋一個建立/連結按鈕），而不是自動填入示範資料再靠標籤提醒使用者「這是假的」。

## 4. 逐頁待辦（延續 `ui-audit-and-fixes.md` 的頁面清單，標註本輪新增項目）

| 頁面 | 既有稽核狀態 | 本輪新增待辦 |
|---|---|---|
| `/`、`/login` | 已完成（readiness 卡、指令片段已拿掉） | 確認登入頁不再引用 `research-formal-readiness.contract.ts` 的任何欄位；補做一次瀏覽器截圖迴歸檢查 |
| `/dashboard` | 已完成 | 拿掉 `today-client.tsx` 內殘留的英文技術句（如「Core AI is proposal-only...」雙語句只保留中文，或改極簡標籤）；確認無示範資料痕跡 |
| `/ai-input` | 已完成＋追加 `AIWORKDESK-0xx` 五點回饋待辦 | 移除示範資料模式 pill（784 行起）；未完成的「多代理協作」「資料夾庫」等功能改用單字「規劃中」標籤，取代現有描述句 |
| `/settings` | 已完成排版 bug | 整組示範/正式模式切換卡片直接移除（不只是精簡文案） |
| `/admin` | 已完成長文字截斷 | 檢查 `ai-governance-panel.tsx`、`owner-evidence-client.tsx` 是否還會印出 `externalRegisterable`、任務代號等欄位；管理頁允許保留技術細節，但要收進 `DetailDrawer`，不能平鋪 |
| `/research` | 已完成排版與治理說明移除 | 三個子頁（`[threadId]`、`issues/[issueId]`、`writing/[writingProjectId]`）目前仍在用 `Badge`，逐一檢查是否有殘留狀態徽章牆 |
| `/inbox` | 已完成 | 無新增，維持現狀 |
| `/work` | 已完成 | `work-client.tsx`、`[projectId]/project-detail-client.tsx` 的 `Badge` 使用逐一檢查，避免與 tab 內容重複的徽章復發 |
| `/company` | 已完成 | 無新增，維持現狀（未在 Badge 清單中） |
| `/agents` | 已完成 | `agent-command-center-client.tsx` 的 12 個徽章雖已收進彈窗，需確認彈窗內文字沒有裸露任務代號／`launchLevels` 這類值，且不能只是「摺起來」而是真的判斷是否為使用者需要的資訊 |
| `/workflow` | 已接近目標 | 暫不需大改，但比照 3.2 規則把任何「即將推出」規則卡改成單字標籤 |
| `/settings/roles`、`/settings/members` | 未在前次稽核逐頁列出 | 這兩個新分頁也用了 `Badge`，需要納入本輪檢查範圍，確認沒有把角色/權限的內部代號直接印出 |

## 5. 執行順序建議

1. **先拆共用機制**：移除 `MockDataModeProvider` 整條鏈路（provider、hook、三個曝光點），這一步做完可以讓後續每頁檢查不用再考慮「示範資料」這個變數。
2. **建立 `<PlannedTag />` 共用元件**：一個詞、無說明句、無連結，取代所有「即將推出」「Coming soon」「Draft TODO」等描述性殘留。
3. **逐頁掃 `Badge` 使用**：以第 2 節列出的 13 個檔案為清單，每個檔案確認徽章內容是否為「使用者需要的狀態」（例如審核中／已完成這種操作性狀態可保留）還是「內部治理旗標」（一律移除或收進 `DetailDrawer`）。
4. **回歸驗證**：比照既有稽核報告的作法，用 Claude in Chrome 在 `localhost:3000` 逐頁截圖比對，確認首屏不再出現示範資料提示、規劃中功能只剩單字標籤、無裸露的任務代號或環境變數字串。

## 6. 驗收標準

- 全站搜尋 `externalRegisterable`、`L0_LOCAL_PROTOTYPE`、`PERSONAL_OS_AUTH_MODE`、`OWNEROS-`、`AUTH-00` 等字串，任何使用者可見頁面（非 `/admin` 的收合彈窗內）都不應該出現這些字面值。
- 全站搜尋「示範資料」「Demo」「MockDataMode」，UI 檔案中不應再有對應的顯示邏輯（後端 seed script 除外）。
- 每個「規劃中」功能只呈現一個詞，點擊或懸浮都不會跳出額外說明句或任務代號。
- 用瀏覽器實際登入走過 11 個路由（含 `/settings/roles`、`/settings/members`），首屏截圖確認無殘留徽章牆、無重複標題、無未截斷長文字。

## 7. 後續整合建議

依 `AGENTS.md` §14，任務變更需要同步更新 `PLN-060_task-backlog.md`、`PLN-061_current-sprint.md`、`RPT-007_completed-log.md`。由於本檔是在既有稽核之外的追加範圍，建議下一輪撿起本項目時，把第 4 節逐頁待辦轉成正式任務代號（例如延用 `AIWORKDESK-0xx` 系列或另開 `UICLEAN-0xx`），再寫入上述三份追蹤文件，避免與目前跑著的 10 分鐘 Codex 迴圈手動編輯同一份大檔案衝突。
