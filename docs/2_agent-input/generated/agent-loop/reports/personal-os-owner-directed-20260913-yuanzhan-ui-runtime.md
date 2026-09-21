# 圓展全 UI 階段實作與驗證

## Task

- Task ID：YZUI-002..010；UI-088 `/company/operating`。
- Date：2026-09-13。Agent：Codex，owner-directed 手動工作；非 heartbeat wakeup。
- 授權：使用者 D09 明確同意完成整個 UI 階段、自主選擇／安裝元件、客製與驗證，每個情境驗證後繼續；只有產品行為或範圍改變才詢問。

## Source Docs Read

AGENTS.md、MAN-000/001/002、PRD-001/005/006、ACC-001/002/008、ARC-028/040、RES-001/002/005/029/030、PLN-060/061/063/070、development-strategy.md、loop-state.json、REF-003/004、D09 及原始情境筆記、v2/v4/v5 原型。工作樹 PRD-004 已被既有修改刪除，僅讀 HEAD 的歷史內容補背景，沒有還原。Next 16 本機 route-groups、server/client、environment docs 先於編碼讀取。

使用 shadcn、saas-ui-refactor-director、React best practices 與 full-story verification 技能；D09 的整階段批准適用於本 scope，不重複要求逐頁批准。沒有新增自主 agent／MCP 產品能力。

## Scope / Strategic Review

- In scope：單 app 內雙空間、九個工作面、YZ-S01..12、memory commands、公式、附件與版本、兩種 env 模式、手機與鍵盤操作。
- Out of scope：真實業務 DB、migration、正式授權變更、跨瀏覽器同步、部署、付款、公開報帳、外部通知、monorepo 遷移。
- Formal launch 仍 L0_LOCAL_PROTOTYPE；M1_MANUAL_OPS_READY／C3_ARCHITECTURE_GATE_READY 不變。Auth、Work、部署的 owner-run evidence 仍為另一條 acceptance chain。
- 最近三個完成報告：20260913 yuanzhan-ui-docs、20260831 gate-loop-activation、20260831 gate-loop-preflight；另讀 UI registry 報告作畫面映射依據。前序增加文件／預覽原型與治理 proof，尚無公司工作台 runtime。
- 本輪直接新增 actor 可操作能力，沒有再做一輪 proposal-only。對應 PRD-006 全情境／ACC-008；成果為可寫、可引用、可切成員並走完情境的 UI。
- 開工時已有 193 個 tracked dirty paths；採新 namespace，少量共用檔修改前保存 `/tmp/yuanzhan-ui-baseline-20260913`。沒有還原、stage、commit、push 其他變更。

## Research / Reference Basis

逐頁分數 90–93（High），三輪同問題研究：本地情境／原型 → 元件與資料／權限 → 驗收／例外，詳見 [RES-030](../../../../07_research-and-design/RES-030_yuanzhan-ui-implementation-rounds.md)。

採用現有 shadcn/Base UI、Tiptap StarterKit、React Aria；保留現有自建 ThemeProvider/tokens。沒有為裝飾安裝 Magic UI，也沒有引入第二套基礎 Dialog。以一個 normalized records graph 保留引用，拒絕複製每頁自己的任務、假空狀態、從正式 Work action 寫資料與 eval 公式。

Primary sources：

- [Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs)／[StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit)。
- [React Aria DateField](https://react-aria.adobe.com/DateField)。
- [shadcn docs](https://ui.shadcn.com/docs)／[Magic UI installation](https://magicui.design/docs/installation)。
- Next 本機已安裝文件與 font loader 原始碼：server-only env、dynamic route、cached font test adapter。

## NANDA / Agent Protocol Alignment

不適用：未增加、暴露、路由或註冊任何 AI agent capability。AgentFacts／externalRegisterable／registry／trust／provider 狀態未改。UI mock-auth 的既有 Profile 讀取不等於外部 agent 授權。

## Changes

- `src/app/(operating)/company/operating/`：既有身分驗證＋動態模式 loader、loading、error；獨立 route group 避免讀正式 library。
- `src/types/yuanzhan-ui.ts`、`src/lib/config/ui-data-mode.ts`、`src/lib/ui-data/yuanzhan/`、專用 context：純 UI DTO、兩模式 factory、引用／權限預覽 commands、drafts、公式與 flow metrics。
- `src/components/yuanzhan/`：日誌、今日、專案／對話、時間線、文件／Evidence、財務、容量、承諾、訊號、詳情與共用操作。
- 既有 sidebar 只加「圓展工作台」入口；package/lock 加 Tiptap、React Aria 與 internationalized/date；`.env.example` 註明已接線的兩模式；沒有改 `.env.local`。
- 公司日誌即時輸入，沒有發布步驟；作者改正文、assignee 改進度、同事留言；管理者例外明列於 ARC-040。
- 文件／對話／日誌直接附檔；固定版本 Evidence、承諾事件保留理由；工作 due 投影時間線同一 ID。
- 表格保留公式、排序列號不漂移、TSV 批次操作、憑證反向、對帳配對／解除、薪資試算與預算；無正式財務服務呼叫。
- Source archive 17 個檔案保持 byte-identical；更新 PRD/ARC/PLN/ACC/index/backlog/sprint/tasks/registry，新增 RES-030 及預覽指南。

## Verification

| 命令 | 結果 | 證據／邊界 |
|---|---|---|
| `pnpm ui:yuanzhan:check` | PASS，17 組 | 純契約：mode/empty/graph/actor/assignee、日期、公式、對帳與快照 |
| `node scripts/verify-yuanzhan-ui.cjs` | PASS，31 組 | showcase/empty 連續工作情境；pageerror 0，業務 mutation HTTP 0 |
| `node scripts/verify-yuanzhan-ui-edges.cjs` | PASS，12 組 | 草稿、焦點、中文 composition-event、slash、PNG、不支援格式、主題與 mobile |
| `pnpm exec tsc --noEmit --pretty false` | PASS | 整個原工作樹 typecheck |
| `pnpm exec eslint` + 本次新增 runtime 路徑 | PASS | 見 lint.log；不把無關舊檔 lint 當本次通過 |
| `node scripts/build-yuanzhan-ui.mjs` | FONT_NETWORK_BLOCKED | Google 字型多次 ECONNRESET；停止該次隔離 build，沒有改產品字型 |
| `node scripts/build-yuanzhan-ui.mjs --cached-fonts` | PASS | 整個 app source snapshot build；使用已下載實際字型，mock adapter 僅在 build process；全 app 路由含 /company/operating |

最終版與執行環境結果見 [驗證輸出](../../yuanzhan-ui-runtime/)。瀏覽器：headless Chrome，1440×1000／390×844；fixtureVersion yz-ui-20260913.2，referenceDate 2026-09-13。伺服器 3011／3012 在暫存副本，不覆蓋既有 3000 server 或 .next。

## 每個情境的交付

| 情境 | 雙模式操作結果 |
|---|---|
| S01 日誌 | 首篇、即時輸入、Standup、slash Issue、引用工作、作者唯讀、留言 |
| S02 今日 | 過去一週／現在／未來、WIP、目標建立與下鑽 |
| S03 專案／對話／工作 | 首專案、Lily 指派／進度、子對話、直接附件、同 ID 跨頁 |
| S04 時間線 | 普通事件 CRUD／星標；工作 due；承諾事件只能保留履行／變更理由 |
| S05 文件 | 本機文字與 PNG、版本更新、文件引用與反向連結、不支援格式拒絕 |
| S06 Evidence | 首 Repo、檔案版本／路徑／README、缺件禁止封存、舊快照內容不漂移 |
| S07 帳本／憑證／對帳 | 直接編輯、公式與錯誤、排序／篩選／貼上／批次、憑證反向、銀行配對 |
| S08 報帳／人事／預算 | 本機報帳預覽、薪資試算、Lily 薪資可見範圍與管理入口限制、專案預算 |
| S09 容量 | 首配置、同 Size 流量／P50/P85、showcase 樣本與 empty 不足 |
| S10 承諾 | 文件對照、月度人工 log、關聯時間事件與協議變更 |
| S11 空間 | 私人／公司、不同作者、草稿分區與重整回模式起點 |
| S12 搜尋／訊號 | 跨物件搜尋、受限標題不出現在結果、修改紀錄與上下文／焦點返回 |

## Evidence / Deltas

- 可操作 [showcase](http://127.0.0.1:3011/company/operating)／[empty](http://127.0.0.1:3012/company/operating)。原工作台 sidebar 入口也已接上。
- 過程修正：留言明確 submit、日誌附件入口、作者分區未送出留言、假歷史建立日期、時間線 due 引用、費用公式運算限額、ThemeProvider hook、搜尋 finalFocus 與手機隱藏導覽、篩選後帳本合計只涵蓋可見列。
- 已檢視 screenshot 的 journal、today、Evidence、ledger 與 mobile；操作區以書寫／列表／表格為主。表格自行捲動、main/document 不橫向溢出。
- DB：本輪無 migration/seed/business writes。隔離 build 用不可連線的 loopback DB URL；預覽只用既有 auth resolver 的 Profile SELECT。沒有把 DB validation 當此 UI-only 變更的必要業務證明。
- Product delta：九個工作面已可操作；proof delta：雙模式連續 journey 和部署前 compile 證據；formal launch blocker／agent readiness delta：無。

## Remaining Risks

- 合成角色預覽不是正式 tenant／service-layer 安全；不同瀏覽器不共享資料、重整重置。
- 公式僅基本子集；人事／報帳狀態不是法定試算或批准／付款。檔案只留記憶體，每份5 MB；Evidence 沒有 Git／密碼學簽章／正式 audit。
- 本機 Chrome＋composition-event 不等於完整真實 IME、iOS／Android 全機種驗證。loading/error 有 source/build/contract proof，未注入真實 DB/provider 故障。
- cached-fonts 建置不證明 Google 網路下載已恢復；正式部署仍需自己的 env/auth/provider/DB 與字型可用性證據。
- 原有個人模組未重做，隔離 preview 不複製那些路由；正常 app 才可走返回舊頁的連結。

## Final Status

UI_PHASE_COMPLETE。UI-088 的 refactor status COMPLETED、runtime truth PROTOTYPE；不提高正式 launch level。下一個建議是正式公司 workspace／BFF／持久化與多人服務授權，待下一階段目標選定後再實作。
