# PLN-069 SaaS UI Convergence Completion Report

**Document ID:** `RPT-065`  
**Date:** 2026-08-23  
**Status:** Superseded by `RPT-066`; marker cleanup completed, Simplified SaaS UX not accepted  
**Related plan:** `docs/05_execution-plans/PLN-069_saas-ui-convergence-schedule-and-governance-report.md`  
**Launch claim:** Gate A/B/C remain unclaimed. Formal launch remains separate.

---

## Completion Decision

Correction on 2026-08-24: this report over-claimed UI-L4 completion. It remains useful as a marker-cleanup and route/API inventory report, but it is not sufficient as a Simplified SaaS UX acceptance report.

What was actually completed:

- Chinese-first shell and route expansion work were advanced.
- English fallback remains available through the language setting.
- Normal owner-facing pages were checked for a limited set of engineering/task/proof markers.
- Admin/proof routes retain technical evidence where operator diagnosis needs it.
- RBAC and AI governance have dedicated settings/admin surfaces.
- Core AI actions remain closed-loop: proposal first, owner review required, no public output, no external registration, no autonomous high-risk write.

What was not completed:

- A true visual/browser review for cognitive load, text density, card density, first-viewport focus, and beginner comprehension.
- A user-accepted Simplified SaaS design.
- A full authenticated browser traversal with screenshots and visual scoring.

Use `RPT-066_simplified-saas-ui-handoff-report.md` as the current source of truth for UI continuation. Gate A/B/C still require their own runtime, auth, persistence, negative authorization, deployed/no-demo, and owner proof evidence.

## Research Basis

The UI convergence direction used local PRD/architecture/acceptance context plus current external reference patterns:

| Lens | Applied Rule | Reference |
|---|---|---|
| Simplified SaaS UX | Use progressive disclosure, one primary job per page, and keep diagnostics out of normal workflows. | [Nielsen Norman Group progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) |
| Component acceleration | Use composable UI primitives, icons, command bars, tables, sheets, and form states instead of bespoke page experiments. | [shadcn/ui](https://ui.shadcn.com/), [Lucide](https://lucide.dev/), [Motion](https://motion.dev/) |
| AI SaaS interface | Keep chat, tool states, reasoning/proposal output, and human review visible without enabling hidden writes. | [Vercel AI SDK UI docs](https://ai-sdk.dev/docs/ai-sdk-ui/overview) |
| SSOT | Treat each module as an operating surface over owned sources instead of a decorative dashboard. | [Atlassian single source of truth](https://www.atlassian.com/agile/project-management/single-source-of-truth) |
| Multi-agent governance | Agents need identity, capability metadata, trust, observability, and registration boundaries before external collaboration. | [MIT NANDA](https://nanda.media.mit.edu/), [Project NANDA](https://projectnanda.org/), [AgentFacts format](https://github.com/projnanda/agentfacts-format) |

---

## 第一章節、PersonalOS 介紹與產品功能說明

PersonalOS 是一個 owner-first 的個人作業系統。它不是一般專案管理工具，而是把工作、研究、來源匯入、AI 協作、公司策略、權限、稽核與系統準備度放在同一個受保護 SaaS 操作台中。

核心產品原則：

- `SSOT`: 每個模組都要有清楚的資料來源、狀態、下一步與審核邊界。
- `AI coworker`: AI 可以整理、建議、產生提案，但正式寫入、公開輸出、外部協作與高風險操作必須受 owner 審核。
- `BFF-first`: UI 只看 view model；資料、權限、provider、DB 與 audit 透過 server action、route handler、service 層與 mapper 收斂。
- `Fail-closed`: 不確定、未授權、未配置、未驗證的能力預設關閉，並引導到 settings/admin 或 manual setup。

目前主要頁面功能：

| 頁面 | 產品用途 | UI-L4 狀態 |
|---|---|---|
| `/dashboard` | `今日`。彙整模組摘要、AI 後續行動、owner comment 與回到 AI 工作桌/收件匣的操作。 | 已收斂為每日決策入口 |
| `/ai-input` | AI 工作桌。捕捉、對話、引用來源、檢視提案、確認來源流程與設定邊界。 | 已收斂為 Gate A 核心工作桌介面 |
| `/inbox` | 收件匣。承接來源、回覆路徑與待處理訊息。 | 已納入簡化 SaaS shell |
| `/work` | 工作模組。專案、任務、交付物、客戶邊界、Work AI 提案。 | 已移除一般頁面的 proof/task 外漏 |
| `/research` | 研究模組。來源、問題、證據、輸出、研究 AI 提案。 | 已改為研究工作台 |
| `/company` | 公司模組。私人思考、正式知識、政策、合約與公司 AI 提案分流。 | 已改為公司策略工作台 |
| `/agents` | AI 指令中心。owner-only dry-run、提案封包、CLI/API 對齊與模組 agent readiness。 | 已移除一般頁面的工程任務 ID |
| `/workflow` | 自動化模組。流程、觸發、狀態與可審核的自動化草稿。 | 已納入簡化 shell |
| `/settings` | 設定控制台。語言、成員、角色、AI sharing、owner/profile/env/manual setup。 | 已建立控制面 |
| `/admin` | 管理控制台。RBAC、AI governance、audit、system readiness、launch evidence。 | 保留 operator/proof 資訊 |

本次完成的關鍵介面修正：

- 把 `/dashboard` 正式命名為 `今日`。
- 把一般頁面的 `Mock data`, `Mock 開`, `Manual Ops`, `Gate A`, `externalRegisterable=false`, `AUTH-*`, `WORK-*`, `DEPLOY-*`, `OWNEROS-*`, `DATTR-*` 等內部語言收斂成產品語言。
- 將 AI governance 狀態改為 `對外登錄關閉`, `不呼叫 provider`, `不寫入資料庫`, `不公開輸出` 等人類可讀邊界。
- 讓 settings/admin 成為 RBAC 與 AI 治理的控制面，而不是把 proof/任務編號放在日常工作頁。
- `/ai-input` provider server action 現在先通過 `requireUser()`，未登入或 provider 不可用時維持本機 fallback，不觸發 DB 寫入。

---

## 第二章節、RBAC 視角分類

RBAC 目前採用「產品頁先收斂、正式權限寫入後續硬化」策略。UI 已經有角色、成員與 AI sharing 控制面，但不是所有 legacy action 都已達到正式多用戶安全等級。

### 2-1 路徑盤點與說明

| 分類 | 路徑 | 角色視角 | 說明 |
|---|---|---|---|
| Public | `/` | 訪客 | 首頁/入口。不可暴露私人資料。 |
| Auth | `/login` | 訪客/owner | 登入頁，支援 passwordless 與本機開發 OTP。 |
| Auth callback | `/auth/callback` | Supabase callback | 交換 Supabase session 後回到受保護頁。 |
| Token public | `/client/[token]` | 外部 client token | Client Portal fail-closed 路徑，只能顯示明確 client-visible 的內容。 |
| Owner daily | `/dashboard` | OWNER, authorized member future | 今日摘要、owner comment、Core AI 提案草稿。 |
| Owner AI desk | `/ai-input` | OWNER first | 私人 AI 工作桌，Gate A 核心介面。 |
| Inbox | `/inbox` | OWNER first | 收件與回覆路徑。後續要與 durable owner chat 綁定。 |
| Work | `/work`, `/work/[projectId]` | OWNER, future team roles | 目前是最成熟 DB-backed 模組，應由 service authorization 保護 project scope。 |
| Research | `/research`, `/research/*` | OWNER first, future shared research roles | 研究表面已收斂，但 legacy research actions 仍需要 BFF/RBAC 硬化。 |
| Company | `/company` | OWNER / future MANAGER | 高風險策略模組，正式知識與私人思考要分流。 |
| Workflow | `/workflow` | OWNER / operator future | 自動化設定與提案表面。正式執行需另行批准。 |
| Agents | `/agents` | OWNER / admin-operator | AI 指令中心。dry-run/proposal only，不允許外部登錄或 DB 直連。 |
| Settings hub | `/settings` | OWNER | 身份、工作區、來源、模組、agent、env/manual setup 控制台。 |
| Language | `/settings/language` | OWNER | 本機語言偏好，保留 Profile BFF 持久化空間。 |
| Members | `/settings/members` | OWNER / MANAGER future | 成員與邀請檢視面。正式邀請寫入由 team workspace actions 控制。 |
| Roles | `/settings/roles` | OWNER | RBAC role matrix 與 effective permission 說明。 |
| AI sharing | `/settings/ai-sharing` | OWNER | 各模組向 Core AI 分享的政策面。 |
| Admin hub | `/admin` | OWNER / admin-operator | Proof、launch blockers、system readiness、operator view。可以顯示 task IDs。 |
| Admin RBAC | `/admin/rbac` | OWNER / admin-operator | RBAC 檢查與 denial/audit read model。 |
| Admin AI governance | `/admin/ai-governance` | OWNER / admin-operator | AgentFacts-lite、capability risk、external registration off。 |
| Admin audit | `/admin/audit` | OWNER / admin-operator | 稽核與事件檢視。 |
| Admin readiness | `/admin/system-readiness` | OWNER / admin-operator | auth/env/deploy/provider/manual setup readiness。 |
| Admin detail | `/admin/detail/*` | OWNER / admin-operator | 深層 proof/debug 路徑，可保留工程證據語言。 |

建議角色模型：

| 角色 | 典型能力 | 必要限制 |
|---|---|---|
| OWNER | 所有私人資料、設定、AI sharing、admin/proof、團隊建立與高風險批准。 | 高風險寫入仍需明確確認與 audit。 |
| MANAGER | 團隊/工作模組管理、成員邀請、部分 admin read。 | 不可讀 owner private AI context，不能批准 external registration。 |
| EDITOR | 受邀專案內編輯任務、交付物與研究/工作內容。 | 不可改 RBAC、env、provider、AI governance。 |
| VIEWER | 讀取授權專案或 client-visible 資料。 | 不可寫入，不可讀 private context。 |
| GUEST / CLIENT | token 或邀請限定視角。 | 只看明確授權的輸出。 |

### 2-2 API 盤點與說明

目前 runtime/API 入口分成 Route Handlers、Server Actions、服務層與 legacy actions。

| API/Action | 檔案 | Auth/RBAC 狀態 | 用途與說明 |
|---|---|---|---|
| `GET /auth/callback` | `src/app/auth/callback/route.ts` | Supabase callback | 交換 magic link code 並導回 next path。 |
| `GET /auth/status` | `src/app/auth/status/route.ts` | `resolveCurrentUser()` | 回傳登入狀態、Profile 角色與 owner-scoped Work count，可用 `proof=redacted`。 |
| `POST /api/agent-operations/dry-run` | `src/app/api/agent-operations/dry-run/route.ts` | `requireUser()`, OWNER only | 受保護 agent dry-run API。只產生 dry-run/proposal proof，不執行外部 agent runtime。 |
| `requestMagicLink`, `requestEmailOtp`, `verifyEmailOtp`, `signOut` | `src/app/actions/auth.ts` | Supabase + dev OTP guard | 登入與登出 server actions。 |
| `getAIResponse` | `src/app/(dashboard)/ai-input/actions.ts` | `requireUser()` added | AI 工作桌 provider action。可呼叫 Groq/Gemini，無 DB 寫入，UI 有本機 fallback。 |
| `createTodayProposalDraft` | `src/app/(dashboard)/dashboard/actions.ts` | `requireUser()` | 今日 owner comment 轉成本機審核提案草稿。無 provider call、無 DB 寫入。 |
| Work CRUD actions | `src/app/actions/work.ts` | `requireUser()` + project service checks | 專案、任務、筆記、交付物 CRUD；目前是最成熟 DB-backed module。 |
| Storage actions | `src/app/actions/storage.ts` | `requireUser()` + storage service checks | 檔案/媒體 upload/download URL 申請。 |
| Team workspace action | `src/app/actions/team-workspace.ts` | `requireUser()` + command service | 建立 team workspace，含 idempotency 與 audit readiness guard。 |
| Team invitation actions | `src/app/actions/team-workspace-invitation.ts` | `requireUser()` / `resolveCurrentUser()` + service | 建立、撤銷、接受團隊邀請。 |
| Research legacy actions | `src/lib/actions/research-*.ts` | Not fully BFF-hardened | 研究 thread/source/event/writing actions 仍直接以 ids/ownerId 操作 DB。下一階段需改成 requireUser + service authorization。 |

API 盤點結論：

- Owner-facing SaaS UI 已完成 PLN-069 的產品語言與 route structure 收斂。
- Work、Team workspace、Storage、Auth、Agent dry-run、Today proposal 已符合比較接近的 BFF/service 邊界。
- Research legacy server actions 是下一個最明確的 RBAC/BFF 風險，不應在 Gate B/C 前保留目前型態。
- Public/client route 必須繼續 fail-closed，只能輸出 client-visible/token-authorized data。

---

## 第三章節、接續要開發的目標與項目、建議

### 3.1 下一階段主目標

下一階段不要再做大量頁面裝飾。最短路徑是把 UI-L4 的正確結構接到 Gate A/B/C 的真實能力：

1. `OWNEROS-002C`: Conversation, Message, ContextPackage, InboxReturnPath schema/migration draft。只做 migration draft 和 impact notes，不 apply production DB。
2. `OWNEROS-002D`: Protected owner conversation loader/service。要有 `requireUser()`, service authorization, negative auth fixture。
3. `OWNEROS-004A`: `/inbox` free-text return path 綁定 durable owner conversation DTO。
4. `RESEARCH-BFF-HARDENING`: 把 `src/lib/actions/research-*.ts` 移到 BFF/service authorization 模式。
5. `RBAC-PERSIST-001`: 將 settings/admin RBAC inspection matrix 轉為 service-backed DTO。
6. `AIGOV-PERSIST-001`: 將 AI sharing/capability registry 轉為 service-backed DTO，保留 `externalRegisterable=false`。
7. `GATEA-PROOF-001`: owner auth、durable chat reload、Inbox return path、provider boundary、no-public-output、deployed route proof。

### 3.2 實作與議題研究演算法

後續 AI loop 使用這個演算法：

1. 選最早未完成 Gate 的最短閉環切片。
2. 先判斷切片屬性：`UI`, `BFF`, `RBAC`, `AI governance`, `persistence`, `external integration`, `manual setup`。
3. 若是純 UI 小切片，先實作，累積到有判斷價值時再 browser audit。
4. 若涉及 auth/RBAC/provider/DB/public output/external agent，先做 issue research，再產生任務，不直接擴 runtime。
5. 每次實作只允許一個新事實成立，例如「能讀 owner conversation DTO」或「Research action 經 requireUser」。
6. 所有一般頁面只用產品語言；工程 ID、proof、raw capability flags 只在 admin/docs。
7. AI 只產生 proposal/draft/dry-run，除非 owner 明確批准，否則不做高風險寫入、不公開、不 external-register。
8. 完成後更新 docs/backlog/report，但不讓文件工作取代 runtime 能力。

### 3.3 建議優先順序

| Priority | 項目 | 為什麼重要 |
|---|---|---|
| P0 | Durable owner chat + Inbox return path | 這是 Gate A 最核心的「可回來繼續工作」能力。 |
| P0 | Research legacy actions BFF hardening | 目前是 RBAC/API 最明確的 launch 風險。 |
| P1 | RBAC effective permissions service DTO | 讓 settings/admin 不只是 UI shell，而能展示真實授權狀態。 |
| P1 | AI governance service DTO | 讓 Core AI sharing、capability risk、approval state 可稽核。 |
| P1 | Audit storage for proposal drafts | 今日 comment、AI 工作桌提案、Inbox return path 都需要 audit envelope。 |
| P2 | Source connector provider wizard browser sweep | 等來源連線成為主線時再補深層 provider path 視覺巡檢。 |
| P2 | Production auth/deploy proof | 這是 formal launch level，而不是 UI-L4 的完成條件。 |

### 3.4 Human Review Request

Owner 請以產品感受審核這三件事：

1. `/dashboard` 是否已像「今日」而不是任務清單。
2. `/ai-input` 是否已像可工作的 AI 桌面，而不是 proof/debug 面板。
3. `/settings` 與 `/admin` 的分工是否清楚：settings 是操作設定，admin 是治理、稽核與系統準備度。

通過這個 human review 後，下一輪應直接推 `OWNEROS-002C` 或 `OWNEROS-002D`，不要再回到大面積 UI polish。

## Verification

Targeted verification completed:

```bash
pnpm exec tsc --noEmit --pretty false
git diff --check -- src/lib/i18n/product-copy.ts src/app/(dashboard)/dashboard/today-client.tsx src/app/(dashboard)/settings/settings-client.tsx src/app/(dashboard)/ai-input/ai-input-client.tsx src/app/(dashboard)/ai-input/actions.ts src/app/(dashboard)/work/work-client.tsx src/app/(dashboard)/research/page.tsx src/app/(dashboard)/company/page.tsx src/app/(dashboard)/agents/agent-command-center-client.tsx src/app/(dashboard)/settings/settings-hub-client.tsx src/app/(dashboard)/settings/page.tsx src/lib/contracts/module-agent-command-catalog.contract.ts src/lib/owneros/control-plane-pages.ts
```

Browser audit checked normal owner-facing routes:

```txt
/dashboard
/ai-input
/inbox
/work
/research
/company
/agents
/workflow
/settings
/settings/language
/settings/members
/settings/roles
/settings/ai-sharing
```

Result: no browser-visible `Gate A`, `externalRegisterable=false`, `AUTH-*`, `WORK-*`, `DEPLOY-*`, `Manual Ops`, `Mock data`, `Mock 開`, `OWNEROS-*`, or `DATTR-*` markers on normal owner-facing pages. Admin/proof routes intentionally keep operator evidence.
