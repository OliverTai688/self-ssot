# 圓展 UI 階段實作研究與逐情境契約

**Document ID:** RES-030  
**Date:** 2026-09-13  
**Scope:** UI-088；YZUI-002..010；使用者明確批准自主完成。

## 最新決定與共同邊界

依 REF-004/decisions.md D09：公司日誌直接即時共享；正文作者編輯、負責人改進度、同事留言；財務含基本公式；原型版面＋既有產品視覺。所有資料留在單一 UI-memory store、重整重置，不宣稱跨瀏覽器即時同步。UI-088 經原本 auth resolver 保護，獨立 route group 不繼承正式 library loader；頁面只有合成資料，驗證真實 auth 時不寫 DB。

本次原型檢查範圍：v5 的 WB 導覽、renderRail/nav、formIssue/setIssueStatus、formTxn/addVoucher、formEvent/toggleStar、Evidence、配置與 forecast；v4 的書寫式大綱；v2 整合原型的空間切換。現有元件包括 Base UI Button/Dialog、TanStack DataTableShell；現有表格只有 core row model，未包含試算功能。

## 頁面理解與三輪收斂

每列是同一情境的三輪：R1 在地情境／原型；R2 元件與資料／權限；R3 驗收與例外。分數依 Actor20、local20、data20、interaction15、risk15、acceptance10。

| 情境／任務 | 理解分數 | R1：保留與補齊 | R2：採用／拒絕 | R3：可執行驗收 |
|---|---|---|---|---|
| 工作日誌 YZUI-003 | 19+19+18+14+14+9=93 | v4 大綱＋v5 模板，更新即時可見；作者／範圍於輸入前決定 | Tiptap OSS JSON、IME、list indent、history；拒絕自行攔截 composition 當 Enter 發布。來源 refs 以穩定 ID 保存 | 建空白第一篇、連續輸入、Standup、引用工作、角色切換、私人隔離、undo、手機 |
| 專案與對話 YZUI-004 | 19+19+18+13+14+9=92 | 總覽→工作／對話→物件詳情；聊天室支援 parent thread 與附件 | 單一 normalized record store；只共享引用，不複製待辦；正文作者／狀態負責人／留言成員 | 首個專案與任務、進度跨視圖、子對話、受限專案、空查詢、引用刪除受阻 |
| 今日與時間線 YZUI-005 | 19+18+18+14+14+9=92 | 過去／今天／未來三段，專案／日常／行政與星號 | 日期由 UI 固定參考日與真實新增時鐘區分；不把沒有數據當已完成 | 首筆事件、日期篩選、星標與修改、逾期連結、目標 CRUD、無資料時無假計畫 |
| 文件與 Evidence YZUI-006 | 19+19+18+13+13+9=91 | 公司索引、版本、來源／反向引用；樹狀路徑與 README | 本地檔案明示記憶體，文字／image／PDF 安全預覽；Evidence 複製固定版本文字快照，拒絕公開上傳或活引用漂移 | 首份文件與第二版、雙向引用、README、版本固定、缺件阻止封存、修改來源不改快照 |
| 金流／報帳／人事／預算 YZUI-007 | 18+19+18+13+13+9=90 | 帳本、憑證、洞察、對帳、報帳、人事、預算分頁；基本公式納入 | 既有 tokens/table/Input；受限算術 parser，不 eval；明列 B 數量/C 單價/D 金額與穩定列號。私人 Finance 分開 | 直接編輯、TSV貼上、排序／篩選、批次、公式／循環／除零、憑證反向、對帳差異、人事唯讀角色 |
| 承諾 YZUI-008 | 19+19+18+13+14+9=92 | 內外承諾文件與數據左右對照、月度 log | 手動確認記錄包含作者／日期／數值；任務狀態和人工確認分開，不用推測代替履行證據 | 首筆承諾、來源、月度新增 log、缺文件、達標／未達標、時間線回到原物件 |
| 容量 YZUI-009 | 19+18+18+13+14+9=91 | 週配置→Size/WIP→Throughput/Cycle Time→預測；出勤不由任務歷時替代 | 指標由可見已完成工作推導；P50/P85 nearest rank，至少涵蓋4週＋8筆同 Size 完成樣本後才顯示粗略情境估算，非交期保證 | 每人每週100%、超配提示、無樣本—、工作更新後重算、分位數與樣本量、無假工時 |

## UI-safe contract 與任務執行形狀

使用 `OperatingRecord` discriminant `kind`、穩定 id、space／author／visibility／projectId 建立單一真相。所有業務紀錄統一在 `records[]`，activity[]／dismissedSignals[] 分開；這是 ARC-040 原集合規劃的 normalized 實作，empty 三者皆為空。可見性 selector 套到列表、搜尋、統計、引用及子留言。修改 command 再檢查 actor／kind／scope，避免只靠 disabled UI。

資料模式先執行 YZUI-002：server-only reader＋純 parser＋fixtures＋commands。之後按 PLN-070 順序完成對應 components，逐情境驗證後繼續，不把所有頁面的骨架視為交付。檔案位於 `src/types/yuanzhan-ui.ts`、`src/lib/ui-data/yuanzhan/*`、`src/lib/context/yuanzhan-ui-context.tsx`、`src/components/yuanzhan/*`、`src/app/(operating)/company/operating/*`。

停止條件：需要正式業務 persistence、權限政策擴張、公開連結／付款／部署，或與已批准產品行為不同；本輪只 UI-memory。大量既有 dirty 內容以新 namespace 隔離，少量接合檔案另保留 pre-edit snapshot，不還原其他變更。

## 參考來源與選型

- [Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs)：Client editor 配合 immediatelyRender:false，避免 SSR mismatch。
- [Tiptap StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit)：headings/lists/undo 等編輯行為。
- [React Aria DateField](https://react-aria.adobe.com/DateField)：日期 locale／鍵盤；NumberField 同產品化封裝。
- [shadcn](https://ui.shadcn.com/docs)：重用本 repo 的 Base UI 版本，避免換掉既有基礎系統。
- [Magic UI 安裝](https://magicui.design/docs/installation)：可按需加入；目前密集工作面不因裝飾而新增效果。
- 本地 Next guides：route-groups、server-and-client-components、environment-variables；未假設 NEXT_PUBLIC 會即時變動。

NANDA gate：本階段不實作 agent capability 或外部 MCP runtime；externalRegisterable 不變。套件安裝是開發依賴，不等於產品外部 agent 授權。

## 驗證收斂補充

- v2 原型明確區分承諾來源事件與普通安排：前者保留來源，只能附理由記已履行／已協議變更；已落為 commitmentId、禁止刪除與 log 操作。未接自動讀合約或發通知。
- Task due 以同一 ID 投影到時間線，star 更新原記錄而不修改原建立日期；今日過去段依前一週與完成日期呈現。
- 管理者對帳使用獨立 command，不取得修改他人正文的能力。已配對金額須先解除再改。其他管理例外見 ARC-040。
- Comments 採明確 submit button；草稿以空間／作者／父物件分區。Theme hook 必須使用 repo 自建 provider，不能誤用 next-themes 的 context。
- 公式用單次評估快取與總步數上限，避免重複參照導致指數時間；真實收入／支出則仍是後續正式帳務模型議題。

## YZUI-011：v5 忠實度修訂（D10）

理解分數 96 = Actor20 + local20 + data18 + interaction15 + risk14 + acceptance9。三輪已完成：

1. **來源／版面**：逐一檢查 v5 4040 行來源；8 個主區、30 子頁，78px rail、48px topbar、深色 tokens、原生字型、g21 主從欄、大綱區塊、drawer、modal、command menu、SVG 圖表。擷取同尺寸原始 30 頁為視覺基準。選用原版標記與 CSS；拒絕中性卡片重新設計。
2. **React／UI 契約**：React Client Component 管理獨立 DOM 工作台生命週期與 Shadow DOM 樣式作用域，server loader 傳序列化的 v5 DTO。來源 handler 於開發時轉成閉包事件，移除 inline script、全域狀態及 eval；UI-memory 不觸及既有 BFF/DB。選用隔離移植，避免逐頁重寫遺漏原版互動；拒絕 iframe 及直接執行 HTML script。同一 v5 store 驅動所有視圖；前版 records renderer 保留作歷史實作，不同時掛載或雙寫。
3. **接受／例外**：對照 30 個頁籤與關鍵抽屜的截圖、幾何、樣式；空資料不能產生假專案／工時／現金／日誌，新增後各分頁可操作。補齊原型未完成的作者／私人空間、表格公式、空值與鍵盤焦點；修改限於既定需求與原型錯誤。原 HTML 的示例規則與 Agent 說明不代表啟用外部服務。

實作：`src/components/yuanzhan/v5/`、`src/lib/ui-data/yuanzhan/v5-*`、route loader、移植生成器與專用驗證。停止條件同 D09：正式 auth/schema/public/provider 或產品擴張；未觸發。正式 launch 保持 L0，先前最近三份報告為 UI runtime、UI docs、gate activation；本次直接消除 owner 指出的介面不符合，不重複 proposal-only 工作。

來源：[React 外部元件整合](https://react.dev/reference/react/useEffect#controlling-a-non-react-widget)、[Shadow DOM 作用域](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)、本機 Next `use-client.md`。v5 原始檔及其 hash 以 REF-004 為準。
