# Acceptance Criteria

## YZUI-023 — 金流三面（2026-09-25，IMPLEMENTED／OWNER_RUN_PENDING）

依 [RES-032](../07_research-and-design/RES-032_cashflow-module-intake-ledger-insight-layering-research.md) 與 Owner 2026-09-25 決策。自動化驗收：`scripts/check-cashflow-faces.ts`（43 項）。

- [x] 金流為三面 × 三分頁；面切換器顯示節奏（每天 · 全員／每週 · 記帳／每月 · 決策）；負責人預設帳務 · 帳本、成員預設收單 · 收件匣；舊分頁索引導到對應新位置。
- [x] 成員從收件匣交件不需要選類別；缺資料時列上直接寫出缺什麼，送出時說還差什麼。
- [x] 照片／PDF 存 R2（伺服器產生 key、5 MB、png/jpg/webp/pdf），資料庫只存參照；prototype 模式不發網路請求。
- [x] 核准代墊不產生交易；進入帳本「待歸帳」，由負責人選類別後入帳。
- [x] 帳本有期間切換、篩選與 ③已入帳／④已勾稽／⑤已結帳 狀態；沒有交易時不畫表頭。
- [x] 對帳有建議配對（附理由）、CSV 匯入；沒有銀行明細時不畫全 0 調節表。
- [x] 月結檢查未全過不能鎖；鎖定在頁內確認；鎖後編輯改為加註；解鎖必須填原因並留在紀錄。伺服器同樣拒絕已結帳月份的金額／日期／歸屬變更（`period_closed`）。
- [x] 洞察不顯示沒有資料來源的數字（Runway、應收未收顯示「尚未設定」）；KPI 可下鑽到帳本。
- [x] 成員進帳務面看到邊界說明與「回到收件匣」，不是空表格；成員只讀得到自己的收件（伺服器過濾）。
- [ ] Owner-run：`pnpm db:deploy` 套用 `20260925090000_operating_cashflow_intake_and_periods`。
- [ ] Owner-run：真 R2 bucket 上傳／重整後仍在；四主題與 390px 目視。

## YZLIVE — 帳號與正式使用（2026-09-15，PROPOSED／NOT_RUN）

依 [PLN-071](../05_execution-plans/PLN-071_yuanzhan-account-and-private-launch-plan.md) 第 8 節及 [AUT-009](../02_architecture-and-rules/AUT-009_yuanzhan-email-otp-account-boundary.md)：三帳號實際收六碼登入、無 Magic Link／Google／固定碼正式替代入口；UID 與本人資料對應；公司管理採 active membership；私人日誌／附件／搜尋隔離；本人資料與公司協作跨重整持久化；停用／session 撤銷／最後 owner 負測試；SMTP／HTTPS／backup restore／部署回退及跨三帳號驗收。當前只有規劃與文件查核完成，上述 runtime 測試均 NOT_RUN，原型驗證不替代正式上線證據。

## YZUI — 圓展 UI 雙資料模式驗收（2026-09-13）

本次完成 `YZUI-001..010` 的 UI-memory 階段。UI 階段以 [PRD-006](../01_product-requirements/PRD-006_yuanzhan-team-ui-phase.md)、[ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md) 與 [ACC-008](ACC-008_yuanzhan-ui-dual-mode-acceptance.md) 為準；UI-088 的 12 情境雙模式已通過，正式服務授權與持久化不在本期 claim。

- 同一組 UI／CRUD 以 server env `PERSONAL_OS_UI_DATA_MODE=showcase|empty` 決定初始資料，不受示範帳號或舊 localStorage 開關覆蓋；未設定時採空白，非法值明確失敗。env reader 與 memory adapter 已實作。
- `showcase` 有跨日誌、任務、專案、時間線、文件及財務的合成關聯案例；`empty` 所有業務集合為空，單一業務物件為 null，搜尋、統計與隱藏視圖均不殘留範例。
- 空白模式可從第一筆新增、編輯、引用、刪除，最後一筆刪除後恢復可操作空白狀態；無資料不可顯示虛構洞察或預測。
- 個人資料只對自己呈現；公司普通工作預設成員可見，可篩選作者，受限專案與人事資料有獨立範圍。UI 模擬不得被當成真實多使用者權限證明。
- 所有新操作保持 UI 記憶體模式，同一 ID 跨視圖更新，重新整理重置；不得呼叫正式業務寫入或套用原型的示範資料到 DB。
- 12 個情境均須依 ACC-008 在兩種模式驗證，包含桌機／手機、空白／錯誤／載入／無權限及第一筆到跨頁操作。完整模組範圍不得以只有靜態占位頁宣稱完成。

上述 UI 驗收不取代既有 auth、持久化、財務正確性或正式上線驗收，也不改變其狀態。

## OWNEROS-UI-006 Simplified Agent Command Center Acceptance

- `/agents` includes the `OWNEROS-UI-006-AGENTS-SURFACE` marker.
- The first viewport states one primary job: `Agent Command Center` for `Choose a dry-run operation, inspect proof, prepare proposal, and keep audit boundaries visible.`
- `/agents` keeps the current protected owner-only and NANDA-safe state honest with visible `Protected owner only`, `dry_run only`, `proposal only`, and `externalRegisterable=false` language.
- `/agents` includes the required simplified slots: identity/mode strip, attention header, command bar, operation selection resource index, detail pane, proposal-review pane, protected dry-run proof panel, records/audit, settings/boundary, and module-readiness drilldown.
- The primary workflow stays one path: choose a bounded operation, write an owner instruction, create a local proposal packet, or run one protected same-origin dry-run proof.
- The AGENT-016 module readiness matrix remains available as a drilldown and continues to show module, operation id, owner agent, internal bus/group, CLI dry-run command, protected HTTP payload, risk/approval, blocked writes, audit readiness, write-blocked state, and external registration denial.
- `scripts/check-agent-command-center.mjs` is exposed as `pnpm agent:command-center:check` and validates simplified runtime markers, existing command-center/page/service/type markers, one allowed client dry-run fetch, required AGENT-010/011/014/015/016 operation ids, and forbidden runtime side-effect patterns.
- `OWNEROS-UI-006` is implementation-first/proof-light per owner instruction: static checker proof is required now; browser smoke may be owner-run or deferred to a later proof loop.
- This pass adds no execute mode, route handler, Server Action, Prisma schema, migration, database write, provider call, public output expansion, external collaboration runtime, external agent database access, external registration, Gmail send, or Gate/launch-level claim.

## OWNEROS-UI-005 Company-First Simplified Module Acceptance

- `/company` includes the `OWNEROS-UI-005-COMPANY-SURFACE` marker.
- The first viewport states one primary job: `Company Operating Desk` for `Separate private thinking, formal knowledge, policies, contracts, and Company AI proposals.`
- `/company` keeps its current high-risk prototype path honest with visible `High-risk strategy module`, `Prototype state`, and `Formal knowledge pending` state language.
- `/company` includes the required module slots: identity/mode strip, command bar, `Company Lanes` resource index, `Company Readiness` detail pane, `Company AI Proposal` proposal-review surface, `Records / Audit`, `Settings / Boundary`, and Manual Ops handoff.
- Company lanes separate `Owner private thinking`, `Formal shared knowledge`, Policy, and Contract objects so private strategy cannot silently become formal Company-readable truth.
- Company handoff language names `AUTH-005`, `COMPANY-BFF`, and `DEPLOY-002` without claiming live owner-read proof or launch-level progress.
- Company boundary language remains fail-closed: `No public output`, `No Company publication runtime`, `No high-risk write`, `No external agent DB access`, and `externalRegisterable=false` are visible or statically enforced.
- `scripts/check-owneros-company-simplified-surface.mjs` is exposed as `pnpm company:simplified:check` and validates runtime markers, docs/task markers, package script registration, and forbidden runtime side-effect patterns.
- `OWNEROS-UI-005` is now implemented at Work/Research/Company runtime UI/checker scope; browser smoke remains deferred by owner instruction.
- This pass adds no route handler, Server Action, Prisma schema, migration, live Company DB read, database write, provider call, public output expansion, Company publication runtime, high-risk write, external runtime, external agent database access, external registration, Gmail send, or Gate/launch-level claim.

## OWNEROS-UI-005 Research-First Simplified Module Acceptance

- `/research` includes the `OWNEROS-UI-005-RESEARCH-SURFACE` marker.
- The first viewport states one primary job: `Research Operating Desk` for `Organize sources, questions, evidence, outputs, and Research AI proposals.`
- `/research` keeps its current prototype/localStorage/mock data path honest with visible `Prototype state` and `Formal persistence pending` state language.
- `/research` includes the required module slots: identity/mode strip, command bar, `Research Queue` resource index, `Research Readiness` detail pane, `Research AI Proposal` proposal-review surface, `Records / Audit`, `Settings / Boundary`, and Manual Ops handoff.
- Research handoff language names `AUTH-005`, `RESEARCH-BFF`, and `DEPLOY-002` without claiming live owner-read proof or launch-level progress.
- Research boundary language remains fail-closed: `No public output`, `No Company publication`, `No high-risk write`, `No external agent DB access`, and `externalRegisterable=false` are visible or statically enforced.
- `scripts/check-owneros-research-simplified-surface.mjs` is exposed as `pnpm research:simplified:check` and validates runtime markers, docs/task markers, package script registration, and forbidden runtime side-effect patterns.
- `OWNEROS-UI-005` was partial after the Work-first and Research-first passes; the later Company pass completes the Work/Research/Company runtime UI/checker scope.
- This pass adds no route handler, Server Action, Prisma schema, migration, live Research DB read, database write, provider call, public output expansion, Company publication runtime, high-risk write, external runtime, external agent database access, external registration, Gmail send, or Gate/launch-level claim.

## OWNEROS-UI-005 Work-First Simplified Module Acceptance

- `/work` includes the `OWNEROS-UI-005-WORK-SURFACE` marker.
- The first viewport states one primary job: `Work Operating Desk` for `Open projects, tasks, client boundaries, and Work AI proposals.`
- `/work` preserves the protected Server Component loader with `requireUser`, `getWorkspaceProjectIndexForProfile`, `getTeamWorkspaceCreateReadinessForProfile`, and `getTeamWorkspaceInvitationIndexForProfile`; Client Components receive only UI-safe DTOs.
- `/work` includes the required module slots: identity/mode strip, command bar, `Project Queue` resource index, `Project Readiness` detail pane, `Work AI Proposal` proposal-review surface, `Records / Audit`, `Settings / Boundary`, and Manual Ops handoff.
- Work state language is honest: `DB-backed owner path` and `Formal proof pending` are visible, team writes remain gated, and Manual Ops still names `AUTH-005`, `WORK-009`, and `DEPLOY-002`.
- Work boundary language remains fail-closed: `No public output`, `No Company publication`, `No high-risk write`, `No external agent DB access`, and `externalRegisterable=false` are visible or statically enforced.
- `scripts/check-owneros-work-simplified-surface.mjs` is exposed as `pnpm work:simplified:check` and validates runtime markers, loader markers, docs/task markers, and forbidden runtime side-effect patterns.
- `OWNEROS-UI-005` was partial after this Work-first pass; the later Research and Company passes complete the Work/Research/Company runtime UI/checker scope.
- This pass adds no route handler, Server Action, Prisma schema, migration, provider call, public output expansion, Company publication runtime, high-risk write, external runtime, external agent database access, external registration, Gmail send, or Gate/launch-level claim.

## OWNEROS-UI-004 Simplified Admin Control Plane Acceptance

- `/admin` includes the `OWNEROS-UI-004-ADMIN-SURFACE` marker.
- The first viewport exposes one admin/operator job: `Admin Control Plane` with `Inspect launch blockers, audit proof, system readiness, and Manual Ops`.
- The command bar includes `Blockers`, `Proof`, `System`, `Audit`, and `Manual Ops`.
- The page renders required operating slots: identity/mode strip, attention header, command bar, operator queue resource index, system-readiness detail pane, records/audit, proof handoff, and Manual Ops handoff.
- The admin control plane includes indexed rows for `Blocker Queue`, `Proof Queue`, `System Readiness`, and `Audit / Records`.
- The default `/admin` route keeps the existing lightweight overview loader path through `getAdminLaunchOverview()` while full evidence remains available through `/admin/detail` and `getAdminLaunchConsole()`.
- The proof handoff keeps `AUTH-005`, `WORK-009`, and `DEPLOY-002` explicit without claiming Gate A/B/C achievement.
- `scripts/check-owneros-admin-simplified-surface.mjs` is exposed as `pnpm admin:simplified:check` and validates runtime markers, docs/task markers, loader markers, and forbidden runtime side-effect patterns.
- `OWNEROS-UI-004` is implementation-first/proof-light per owner instruction: static checker and TypeScript proof are required now; browser smoke may be owner-run or deferred to a later proof loop.
- `OWNEROS-UI-004` adds no admin mutation, route handler, Server Action, Prisma schema, migration, database write, environment edit, deployment API write, provider runtime, public output expansion, external runtime, external agent database access, external registration, Gmail send, or Gate/launch-level claim; `externalRegisterable=false` remains visible.

## OWNEROS-UI-003 Simplified Settings Control Plane Acceptance

- `/settings` includes the `OWNEROS-UI-003-SETTINGS-SURFACE` marker.
- The first viewport exposes one primary owner settings job: `Settings Control Plane` with `Control identity, workspace, sources, modules, agents, env, and Manual Ops`.
- The command bar includes `Identity`, `Workspace`, `Sources`, `Modules`, `Agents`, and `Manual Ops`.
- The page renders required operating slots: identity/mode strip, attention header, command bar, settings resource index, detail/boundary pane, records/audit, and Manual Ops handoff.
- The settings control plane includes identity/profile, owner/member workspace, source connections, module permissions, agent boundaries, and environment/manual-ops rows.
- The page keeps the existing protected Server Component loader and BFF contracts: `resolveCurrentUser()`, module permission snapshot loading, owner evidence console, source workflow readiness, agent protocol readiness, owner auth boundary, and `buildAdminAuditBffContract()`.
- `scripts/check-owneros-settings-simplified-surface.mjs` is exposed as `pnpm settings:simplified:check` and validates runtime markers, docs/task markers, loader markers, and forbidden runtime side-effect patterns.
- `OWNEROS-UI-003` is implementation-first/proof-light per owner instruction: static checker and TypeScript proof are required now; browser smoke may be owner-run or deferred to a later proof loop.
- `OWNEROS-UI-003` adds no route handler, Server Action, Prisma schema, migration, permission write, retention deletion/export runtime, environment mutation, provider call, public output expansion, external runtime, external agent database access, external registration, or Gate/launch-level claim; `externalRegisterable=false` remains visible.

## OWNEROS-AIINPUT-UI-001 Simplified AI Input Work Desktop Acceptance

- `/ai-input` includes the `OWNEROS-AIINPUT-UI-001-SURFACE` marker.
- The first viewport exposes one primary owner job: `AI Work Desktop` with `Capture, review, route`.
- The command bar includes `Capture`, `Review`, `Sources`, `Context`, and `Manual Ops`.
- The page renders required operating slots: identity/mode strip, attention header, command bar, source/conversation index, proposal detail pane, agent proposal pane, settings/boundaries, records/audit, and Manual Ops handoff.
- The page keeps the existing protected Server Component loader and BFF contracts: `buildAIInputFormalReadinessContract()` and `loadAIInputSourceConnectionCatalog()` pass serializable DTOs into `AIInputClient`.
- `scripts/check-owneros-ai-input-simplified-surface.mjs` is exposed as `pnpm ai-input:simplified:check` and validates runtime markers, docs/task markers, page loader markers, and forbidden runtime side-effect patterns.
- `OWNEROS-AIINPUT-UI-001` is implementation-first/proof-light per owner instruction: static checker and TypeScript proof are required now; browser smoke may be owner-run or deferred to a later proof loop.
- `OWNEROS-AIINPUT-UI-001` adds no route handler, Server Action, Prisma schema, migration, database write, provider call, OAuth/webhook/polling runtime, public output expansion, external runtime, external agent database access, external registration, or Gate/launch-level claim; `externalRegisterable=false` remains visible.

## LOOP-219 Launch-Level Review And Next-Phase Routing Acceptance

- `docs/06_audits-and-reports/RPT-063_loop-219-launch-level-review-and-next-phase-routing.md` exists and is indexed by `MAN-001`.
- Loop 219 generates current-loop no-secret launch, auth, Work proof target, Manual Ops, preemption, owner-plan, freshness, Gate A incomplete, and launch-level review JSON packets under `docs/2_agent-input/generated/agent-loop/reports/`.
- The review keeps formal launch at `L0_LOCAL_PROTOTYPE`, conditional Manual Ops at `M1_MANUAL_OPS_READY`, and conditional product maturity at `C3_ARCHITECTURE_GATE_READY`.
- Gate A/B/C remain `NOT_ACHIEVED`; Gate A Gmail remains `NOT_TRIGGERED`.
- The review records no-upgrade reasons for missing Gate A A1-A8 runtime/owner/deployed evidence, missing signed-in owner auth proof, missing Work proof target confirmations, and missing deployment marker proof.
- The next implementation route is `OWNEROS-AIINPUT-UI-001` unless signed-in owner `/auth/status?proof=1` evidence appears and preempts with `AUTH-005`.
- The review adds no runtime source change, route handler, Server Action, Prisma schema, migration, database read/write, provider call, Gmail send, public output, external runtime, external agent database access, external registration, or launch-level claim.

## OWNEROS-BFF-001 Core Surface BFF View Model Acceptance

- `docs/02_architecture-and-rules/ARC-037_owneros-core-surface-bff-view-model-contract.md` exists and is indexed by `MAN-001`.
- `src/lib/contracts/owneros-core-surface-bff.contract.ts` exports `OWNEROS_CORE_SURFACE_BFF_CONTRACT_ID`, `OWNEROS_CORE_SURFACE_UI_CONTRACT_ID`, `OWNEROS_CORE_SURFACE_BFF_SURFACES`, `OWNEROS_CORE_SURFACE_COMPONENTS`, `OWNEROS_CORE_SURFACE_BFF_INVARIANTS`, and runtime-disabled safety flags.
- `scripts/check-owneros-core-surface-bff-contract.mjs` is exposed as `pnpm owneros:surface-bff:check` and validates the formal doc, contract, package script, backlog, sprint, completed log, tasks memory, index entry, source refs, shared surfaces, shared component vocabulary, BFF invariants, and forbidden runtime side-effect patterns.
- The contract covers `/dashboard`, `/ai-input`, `/settings`, and `/admin`, including their current loader refs, UI-safe view model names, required operating slots, state labels, command groups, audit/boundary refs, next runtime tasks, and stop conditions.
- `OWNEROS-UI-003` remains the settings runtime task, but its shared layout/component and BFF prerequisites are now defined by `OWNEROS-BFF-001`.
- The shared component contract defines `OwnerOsSurfaceFrame`, `OwnerOsCommandBar`, `OwnerOsResourceIndex`, `OwnerOsDetailPane`, `OwnerOsAgentProposalPane`, `OwnerOsRecordsAudit`, and `OwnerOsBoundaryPanel`.
- The BFF invariant is `Server Component page -> protected loader -> requireUser() or resolveCurrentUser() -> service authorization -> domain service -> mapper/view model -> serializable Client Component props`.
- `OWNEROS-BFF-001` maps to Gate A A2/A8, Gate B B1/B2/B4, and Gate C C2/C3/C5 as a prerequisite only; it does not claim Gate A/B/C achievement.
- `OWNEROS-BFF-001` adds no route handler, Server Action, Prisma schema, migration, database read/write, provider call, public output expansion, external runtime, external agent database access, external registration, or launch-level claim; `externalRegisterable: false` remains true for this slice.

## OWNEROS-UI-002 Simplified Owner Dashboard Acceptance

- `/dashboard` includes the `OWNEROS-UI-002-DASHBOARD-SURFACE` marker.
- The first viewport exposes one primary owner job: `Choose the next owner action`.
- The dashboard command bar includes `AI Work Desktop`, Work, Inbox, Settings, and Admin, with `AI Work Desktop` as the primary entry.
- The dashboard renders required operating slots: identity/mode strip, attention header, command bar, resource index, detail/proposal pane, records/audit timeline, and Manual Ops handoff.
- The page keeps the existing protected Server Component loader and `getDailyCommandCenter()` contract; it does not import dirty `/ai-input` runtime components.
- `scripts/check-owner-dashboard-simplified-surface.mjs` is exposed as `pnpm dashboard:simplified:check` and validates dashboard markers, docs/task markers, and forbidden runtime side-effect patterns.
- `OWNEROS-UI-002` adds no route handler, Server Action, Prisma schema, migration, database write, provider call, public output expansion, external runtime, external agent database access, external registration, or Gate/launch-level claim.

## OWNEROS-UI-001 Simplified SaaS Operating Surface Pattern Acceptance

- `docs/02_architecture-and-rules/ARC-036_simplified-saas-operating-surface-design-pattern.md` exists and is indexed by `MAN-001`.
- `src/lib/contracts/simplified-saas-operating-surface.contract.ts` exports `SIMPLIFIED_SAAS_OPERATING_SURFACE_CONTRACT_ID`, `SIMPLIFIED_SAAS_SURFACE_RULES`, `SIMPLIFIED_SAAS_SURFACE_TARGETS`, `SIMPLIFIED_SAAS_SOURCE_REFS`, `SIMPLIFIED_SAAS_COPY_BUDGET`, and runtime-disabled safety flags.
- `scripts/check-simplified-saas-operating-surface.mjs` is exposed as `pnpm ui:simplified-saas:check` and validates the formal doc, contract, package script, backlog, sprint, completed log, tasks memory, index entry, source refs, and forbidden runtime markers.
- The pattern covers one primary job, command bar, resource index, detail/proposal pane, records/audit, settings/boundaries, concise copy budget, honest real/demo/mock/formal-readiness/DB-backed/unavailable/Manual Ops state language, and blocked UI patterns.
- The pattern maps to Gate A owner-private operability, Gate B member/team surface consistency, and Gate C `C5_CORE_JOURNEY_UI_HARDENING` without claiming any Gate achievement.
- Follow-up rows `OWNEROS-UI-002..006` exist for `/dashboard` plus AI Work Desktop entry, `/settings`, `/admin`, Work/Research/Company/module pages, and `/agents`.
- `OWNEROS-UI-001` adds no route handler, Server Action, Prisma schema, migration, database read/write, provider call, public output expansion, external runtime, external agent database access, external registration, or launch-level claim.

## AIINPUT-CONN-004 Typed Provider Manifest And Protected BFF Acceptance

- `AIInputSourceConnectionCatalogDTO` separates provider manifests, account instances, scope instances, redacted connection list/detail, setup session, scope preview, connection test, duplicate fingerprint, revoke impact, authorization/audit metadata, runtime flags, NANDA posture, validation, and stop conditions.
- LINE, Google Drive, RSS, Gmail, GitHub, and Telegram each expose the same ordered provider/account/scope/sync-analysis/governance/review state machine with typed provider-specific account and scope metadata.
- Google Docs is not a provider id. Google Drive explicitly carries Docs/Sheets/Slides file-subtype provenance.
- `loadAIInputSourceConnectionCatalog()` is server-only, directly calls `requireUser()`, returns no Profile id/email/provider subject/native scope id/raw payload/secret, and passes only a UI-safe DTO through `/ai-input` Server Component to the Client Component and wizard.
- The operation catalog allows only protected static manifest reads. Account list, setup draft persistence, scope preview/discovery, provider test, revoke-impact read, and activation are explicitly blocked with audit refs and reasons.
- Duplicate identity is a server-generated hash-only future contract. Client-native provider ids, the fingerprint value, and raw provider identifiers are not accepted or exposed.
- Missing, duplicate, incomplete, out-of-order, runtime-enabled, standalone-Google-Docs, or otherwise invalid manifests fail closed to `provider_manifest_catalog_unavailable` with zero providers/accounts/scopes and no client mock fallback in formal mode.
- The wizard consumes the server DTO, drives provider and step behavior from validated manifests, and renders an unavailable state instead of provider choices when the catalog fails validation.
- OAuth, secret storage, callbacks, webhooks, polling, provider API calls, route handlers, Server Actions, Prisma/DB reads or writes, module final writes, public output, external-agent DB access, and external registration remain false; `externalRegisterable` remains `false`.
- `pnpm ai-input:connection-manifest:check` validates DTO coverage, providers, steps, auth handoff, operation/fingerprint/impact/audit/stop boundaries, malformed-manifest behavior, Server-to-client-to-wizard wiring, and forbidden runtime imports/patterns.

## AIINPUT-CONN-003 Multistep And Multi-Account Prototype Acceptance

- `/ai-input` mock mode exposes `新增連線`; formal mode exposes only a disabled/unavailable action and immediately closes/resets any mock wizard state.
- The accessible Dialog implements six ordered steps: provider, account, scope, sync/analysis, routing/governance, and review/create.
- Provider choices are LINE, Google Drive, RSS, Gmail, GitHub, and Telegram. Google Docs is not a provider choice; Docs/Sheets/Slides remain Drive folder file subtypes/provenance.
- Provider branches expose the correct prototype topology: Google accounts, GitHub App installations, LINE Official Accounts, Telegram bots, Gmail privacy/restricted-scope warning, and RSS without an account step or real URL fetch.
- Multiple redacted accounts show independent auth health and dependent connection counts; one account can serve multiple independently managed connection drafts.
- Selecting multiple Drive folders creates one in-memory draft per folder. Exact provider/account/scope duplicates are blocked while different provider-native scopes remain selectable.
- Account management includes inline dependency and revoke/reauthorize impact preview; it does not mutate credentials or delete provenance.
- Review displays provider, redacted account, scope count, sync/analysis, routing, risk, approval, retention, PII, Morning Brief, subfolder, and attachment choices before mock creation.
- Creation returns only `draft` / `Mock drafts only`, updates current-page mock rows, never claims authorization/activation, and disappears after reload.
- Formal connection details never clone or derive policy fields from `connectorsState` mock rows.
- `pnpm ai-input:connection-wizard:check` verifies steps, providers, Dialog/ARIA, Drive naming, duplicate/impact states, formal fail-closed integration, and forbidden network/DB/secret/localStorage patterns.
- No OAuth callback, route handler, Server Action, provider SDK/API call, token/secret input, webhook, polling, localStorage/sessionStorage, Prisma/DB read/write, schema/migration, public output, final module write, external agent access, or external registration is added; `externalRegisterable` remains `false`.

## AIINPUT-CONN-001 External Source Connection Research Acceptance

- `RES-027_external-source-connection-multistep-and-multi-account-management-research.md` exists and is indexed by `MAN-001`.
- The source setup catalog presents **Google Drive folder** connections; it does not present Google Docs as a separate new-connection provider. Native Google Docs/Sheets/Slides remain file subtypes with Drive file identity and provenance.
- The domain separates provider accounts and credential health from independently manageable source-connection scopes and sync health.
- The target model supports multiple authorized accounts per provider and multiple scoped connections per account; public RSS remains a credentialless per-feed connection.
- First-time `新增連線` uses a provider-aware six-step modal covering provider, account/authorization, scope, sync/analysis, routing/risk/retention, and review/test/create.
- Existing-connection management and provider-account management are separate from setup; reconnect/revoke shows impact across dependent connections before an account-level change.
- LINE, Google Drive, RSS, Gmail, GitHub, and Telegram each have explicit setup, scope, incremental-sync/webhook, permission, risk, and stop conditions.
- Proposed BFF operations require `requireUser()`, owner-scoped service authorization, validation, idempotency, redacted DTOs, secret references, audit events, and provider-specific approval before runtime activation.
- `AIINPUT-CONN-002..011` provide executable staged scope, acceptance, likely files/surfaces, verification, risks, and stop conditions.
- `AIINPUT-CONN-001` adds no runtime UI, OAuth callback, webhook, polling, provider call, database/schema mutation, secret write, public output, final module write, external collaboration, or external registration; `externalRegisterable` remains `false`.

## v0.1 Operational Acceptance

- DB contract is documented and migration strategy is clear.
- Work project create persists after reload.
- Work task add/toggle persists after reload.
- Work note add/pin persists after reload.
- Work deliverable add persists after reload.
- Work project progress is derived from actual task rows and does not drift after task mutations.
- Client Portal reads DB by token and filters client-visible data.
- Auth/permission risks are documented and reviewed.
- AGENTS.md and Codex skills support repeated closed-loop development.
- Task backlog, sprint file, and completed log are maintained.

## EVENTOPS-021 Human-AI Event Operating Model Research Acceptance

- `docs/07_research-and-design/RES-011_human-ai-event-operating-model-research.md` exists because `RES-010` is already assigned.
- `RES-011` is indexed in `docs/00_manual-and-index/MAN-001_document-index.md`.
- The document clearly separates confirmed owner decisions from research recommendations.
- The document clearly separates UI model, domain model, and runtime/execution model.
- The document distinguishes `AnalysisEvent`, `AgentRun`, `InboxItem`, `Thread`, `Conversation`, `ActionPlan`, and `ExecutionRun`; it must not collapse all status into one object.
- The document includes domain responsibilities, main fields, relationships, immutable record/current projection/mutable/event-only rules for the requested objects.
- The document defines ResourceVersion/ResourceDiff strategy, last successfully analyzed version, expected version, conflict detection, reanalysis policy, and restore reference rules.
- The document defines manual/cron/condition triggers, debounce/batch, duplicate suppression, timezone, pause/resume, missed/concurrent policy, cost budget, model selection, input scope, and diff scope.
- The document defines Event Report Markdown front matter/body and explicitly states Markdown is not the sole source of truth.
- The document defines Inbox/Thread, multi-agent invitation, shared context manifest, data exclusion list, Life default-deny, Research-to-Work sharing, and least-privilege invited-agent rules.
- The document defines ActionPlan/ActionStep/RACI, keeping one Accountable per step and keeping Orchestrator distinct from business Accountable.
- The document defines L0-L3 risk policy and maps owner-confirmed automation rules into an initial matrix without relying only on action type.
- The document defines failure/retry/recovery boundaries, including timeout-as-unknown, idempotency, optimistic concurrency, transactional outbox, DLQ, saga, compensation, manual recovery, incident report, trace/span, and checkpoint resume.
- The document distinguishes ActivityRecord, AuditEvent, Trace/Span, MemoryCandidate, AgentMemory, and ContextChangeEvent; it must not auto-promote raw history into memory.
- The document includes the required diagrams/tables: end-to-end operating loop, domain/ER diagram, Analysis Event state machine, Agent Run state machine, Action Plan/Execution state machine, multi-agent invitation sequence, cross-module RACI example, permission/risk matrix, failure/recovery matrix, UI surface map, event report example, and first vertical slice sequence.
- The document designs the Research document version update -> Work draft project first vertical slice and lists the requested happy path and failure/variation cases.
- `PLN-060` contains non-conflicting follow-up rows `EVENTOPS-021..040`; `EVENTOPS-021` is marked DONE and no existing `EVENTOPS-001..020` rows are overwritten.
- Verification records marker scans, targeted whitespace/diff checks, and loop-state JSON parse for the docs-only artifact.
- `EVENTOPS-021` does not modify runtime code, formal database schema, migrations, route handlers, server actions, existing UI, provider calls, public output, autonomous final writes, external agent DB access, external collaboration, or external registration.

## Work Module Acceptance

- No Work data write bypasses server actions/services.
- Project ownership is checked before project-scoped reads/writes.
- UI handles validation and action failure.
- Client-visible data is explicitly marked.
- Internal notes never appear in public output by default.

## TEAMCOLLAB-001/002 Team Workspace Collaboration Research And Contract Acceptance

- `RES-026` exists and records the owner's current shared-team direction.
- It explicitly supersedes only the one-Profile/one-Tenant/no-sharing product decision in `RES-020` while preserving `RES-020` as the current-runtime isolation audit.
- Requirement understanding is scored 89/100 High and three same-issue research rounds cover local code/PRD fit, comparable product patterns, and auth/persistence/AI safety.
- One Profile may have one personal workspace and multiple team memberships.
- Workspace roles (`OWNER`, `ADMIN`, `MEMBER`, `GUEST`) remain separate from project roles (`VIEWER`, `COMMENTER`, `EDITOR`, `MANAGER`) and existing global `UserRole`.
- Active members see workspace-visible projects through server-authorized inheritance; guests require explicit project grants.
- A personal project transfer is stable-ID, audited, manager-only, relation-preserving, and does not expand Client Portal visibility.
- Email invitations are application records with token digests, expiry/revoke states, exact authenticated-email acceptance, idempotency, and trusted-server-only provider delivery.
- Collaborator feedback is attributed, versioned, auditable, withdrawable, and project scoped.
- AI may retrieve authorized project feedback and create evidence-linked summaries/actions/`MemoryCandidate` proposals; automatic provider fine-tuning, global memory, final Work writes, cross-workspace reuse, and external-agent access remain disabled.
- `SCH-006`, `AUT-008`, and `PLN-066` exist; `SCH-004` is marked superseded and must not be implemented.
- `PLN-060` contains executable `TEAMCOLLAB-001..010` tasks with scope, acceptance, likely files, verification, risks, and stop conditions.
- NANDA gate keeps WorkAgent internal/protected and `externalRegisterable: false`.
- `TEAMCOLLAB-001/002` do not edit Prisma schema, apply migrations, create memberships, send invitations, transfer projects, create feedback, call AI providers, expand public output, or change launch level.

## TEAMCOLLAB-003 Workspace And Project Capability Resolver Acceptance

- `src/lib/contracts/team-workspace-capability.contract.ts` is server-only, pure, deny-by-default, and contains no Prisma/database/provider/network/request-state/runtime write.
- Active identity, active workspace, and matching active membership are common prerequisites; suspended/left/removed memberships cannot use owner/admin status or stale direct grants.
- Workspace `OWNER`/`ADMIN` resolves project `MANAGER`; an active exact direct grant overrides inherited access; only `MEMBER` inherits the configured role on `WORKSPACE_VISIBLE`; `GUEST` never inherits; `PRIVATE` requires owner/admin or a direct grant.
- Runtime-invalid roles/status/access modes, blank identifiers, malformed grants, guessed cross-workspace IDs, missing membership, and inactive resources fail closed without throwing.
- Workspace and project capability maps are exact and separate. `feedback.update_own` requires a later author check; `project.transfer` requires a later target workspace owner/admin check; project `MANAGER` alone cannot manage workspace policy.
- Redacted BFF decision DTOs hide internal identifiers and mismatch diagnostics behind safe availability codes.
- BFF operation policies cover workspace selection/index, project creation, member/invitation/policy/audit, target transfer receipt, project reads/writes/access, feedback own-update/moderation, transfer, and feedback-memory review.
- All 13 `AUT-008` negative rows have explicit resolver fixture, BFF policy, or declared follow-up-boundary coverage; invitation and AI lifecycle declarations do not claim runtime proof.
- `pnpm teamcollab:capability:check` executes 20 built-in and 25 extended fixtures, exact role maps, immutability/determinism, BFF redaction/transfer conditions, NANDA `externalRegisterable: false`, and forbidden side-effect scans.
- No Prisma/schema/migration/seed, service, route, Server Action, UI, provider invitation, project transfer write, feedback persistence, AI runtime, public output, Client Portal visibility change, RLS claim, external agent, or launch-level upgrade is added.

## TEAMCOLLAB-004 Additive Schema And Disposable Migration Proof Acceptance

- `prisma/schema.prisma` contains Workspace, membership, invitation, project grant, feedback/version, and memory-candidate models; `Profile.authUserId` and `Project.workspaceId` remain nullable during cutover, while legacy `Project.ownerId` remains intact.
- Project grant state is persisted as `ACTIVE`/`INACTIVE`, and a memory candidate must reference an existing `(feedbackId, version)` pair.
- The reviewed SQL lives under `prisma/migration-drafts`, never under `prisma/migrations`; static checks reject destructive SQL, RLS claims, Client Portal column mutation, and unrelated timeline DDL.
- Backfill creates one active personal workspace/owner membership per Profile, assigns every legacy Project to its owner's personal workspace, yields zero orphan Projects, and preserves legacy Project identity/owner/visibility/client-token values.
- `prisma/seed.ts` upserts the demo personal workspace/membership and assigns all seeded Work projects; two consecutive seed passes keep stable entity counts.
- `scripts/team-workspace-disposable-proof.ts` defaults to no-write dry-run, accepts no target URL, fingerprints only a self-created loopback cluster, overrides inherited DB URLs for child commands, applies the review draft in one transaction, and removes its owned temp cluster in `finally`.
- Persisted two-workspace context plus the `TEAMCOLLAB-003` resolver proves cross-workspace read and write denial; denied writes do not mutate the target row. This is app-layer contract proof, not an RLS or privileged Prisma isolation claim.
- `pnpm teamcollab:migration-draft:check`, dry-run proof, explicit disposable run, `pnpm db:validate`, `pnpm db:generate`, capability checker, TypeScript, build, and diff checks pass.
- No live/Supabase migration, Auth cutover, invitation delivery, team read/write runtime, UI workspace switcher, public output, RLS policy, AI provider call, automatic memory promotion, external agent access, or launch upgrade is included.

## TEAMCOLLAB-005 Protected Workspace Project Index Acceptance

- `/work` is a request-time Server Component that calls `requireUser()` and the server-only `getWorkspaceProjectIndexForProfile()` BFF directly; the query-string workspace ID is only a preference, never authorization.
- `WorkspaceProjectIndexDto` returns client-safe workspace choices, selection state, read-only capability snapshots, and `Omit<Project, "clientToken">` project rows without membership IDs, invitation tokens, emails, Prisma models, or nonserializable values.
- Only active memberships in active workspaces become choices. Every project row is re-evaluated through the `TEAMCOLLAB-003` project resolver and returned only when `project.read` is allowed.
- Owner/admin, member workspace inheritance, guest direct-grant, private project, inactive resource, and cross-workspace rules remain the exact `AUT-008`/resolver rules; UI state cannot expand them.
- Invalid or stale workspace selection safely falls back to an already authorized workspace, displays a non-disclosing notice, and does not reveal or load the guessed workspace's projects.
- Auth Profile lookup explicitly selects only `id`, `email`, and `role`, so an unmigrated database does not fail on the pending `auth_user_id` column before workspace compatibility can be resolved.
- Missing collaboration tables (`P2021`) or exactly zero memberships use an explicitly labelled legacy exact-owner personal-project compatibility path. Other database failures return `unavailable` with no mock fallback; existing-but-invalid membership rows fail closed.
- The Work UI shows personal/team tabs, type, role, member count, visible-project count, selected state, loading, empty/filter-empty, unavailable, and not-found-or-forbidden states.
- TEAM project cards are read-only `<article>` surfaces with `detailHref: null`, even when the legacy `ownerId` matches. The existing exact-owner detail route is reachable only for PERSONAL exact-owner projects.
- `AddProjectDialog` remains available only in the explicitly labelled legacy personal compatibility path; TEAMCOLLAB-005 adds no team creation, invitation, transfer, grant, feedback, memory, RLS, public, provider, or AI write runtime.
- `pnpm teamcollab:project-index:check` passes 24/24; `pnpm teamcollab:capability:check` passes 45 fixtures; targeted lint, Prisma validation/generation, TypeScript, production build, disposable browser route smoke, invalid-selection fallback, and console-error checks pass.

## TEAMCOLLAB-005A Migration Reconciliation Acceptance

- Read-only target evidence records collaboration tables outside Prisma migration history, zero workspaces/memberships, 10/10 Projects with null workspace scope, and a missing active-PERSONAL partial unique index without exposing database URLs, emails, tokens, or record bodies.
- The canonical SQL is the reviewed `TEAMCOLLAB-004` executable body under `prisma/migrations/20260727150000_team_workspace_collaboration/`; its header keeps configured/valuable apply approval-gated.
- `preflight.sql` is read-only and inventories required relations, columns, enums, indexes, migration ledger, aggregate counts, and repair applicability.
- `repair.sql` is one advisory-locked transaction that writes only missing PERSONAL workspaces, matching creator ACTIVE OWNER memberships, null Project workspace scope, and the partial unique index; hard postconditions roll back on duplicate, orphan, index, non-target-row, or ledger mismatch.
- Clean-history and drift-shaped self-created loopback PostgreSQL paths both produce exactly one active PERSONAL/OWNER membership per Profile, zero orphan Projects, the unique PERSONAL index, stable Project ID/owner/visibility/clientToken snapshots, and zero TEAM/invitation/grant/feedback/version/memory rows.
- The proof accepts no database URL, ignores inherited DB env, fingerprints its owned cluster/data directory, requires three explicit write/apply/confirmation gates, and removes the cluster/temp directory.
- `pnpm teamcollab:migration-reconcile:check`, explicit disposable proof, old draft checker compatibility, Prisma validate/generate, TypeScript, build, and diff checks pass.
- Configured/live repair, migration-ledger resolution, TEAM creation, invitation, transfer, feedback, AI memory, RLS, public output, and launch upgrade are not performed by 005A.

## TEAMCOLLAB-005B1 Audit-Backed Create-Team Acceptance

- `/work` loads create-team readiness on the server. The control is enabled only for a DB-confirmed platform `OWNER` with exactly one active creator PERSONAL workspace, exactly one matching ACTIVE OWNER membership, zero owner Projects with null workspace scope, and exact audit-storage readiness.
- The Server Action reruns `requireUser()`, validates a 2–80 character control-character-free name and UUID idempotency key, delegates to the service, returns only safe state, and revalidates `/work` after success.
- The service defensively validates input again, never treats browser state or workspace membership alone as platform eligibility, and re-queries all authorization/data prerequisites inside the write transaction.
- TEAM workspace, creator ACTIVE OWNER membership, and `workspace.created` event commit atomically. Forced audit failure leaves all three counts unchanged.
- The audit request reference is a profile/action/key-bound SHA-256 digest; metadata is exactly `{}`; sensitive refs remain null; UPDATE and DELETE fail with SQLSTATE `55000`.
- Exact trigger/function, three CHECK definitions, and the unconditional three-key unique index are required. Missing, disabled, partial, or same-name weakened artifacts make both readiness and command fail closed with zero writes.
- Sequential and concurrent same-key submissions return the same workspace with exactly one fresh result, one replay, and no duplicate rows. Reusing the key with a different name conflicts.
- The dialog creates one UUID per logical open attempt, locks close/submit while pending, selects the returned workspace, and explicitly states that it does not invite, transfer, grant, write feedback, or enable AI memory.
- `pnpm teamcollab:create-team:check` passes 31/31. The three-gate self-created loopback proof passes eligible/distinct/concurrent/invalid/denial/drift/rollback/redaction/append-only/no-scope cases and removes its cluster/temp root.
- Configured/live migration, PERSONAL repair, migration-ledger resolution, and signed-in create-team browser activation are not claimed by 005B1; those are `TEAMCOLLAB-005B2`.

## TEAMCOLLAB-005B2 Configured Activation Acceptance

- Status: configured schema/data activation passed on 2026-07-27; signed-in owner create/select/audit interaction proof remains `REVIEW_REQUIRED`.
- A restorable backup and explicit target-named owner approval exist.
- `MIG-005` preflight/repair/postconditions and separately reviewed migration-history reconciliation pass before the audit migration is applied.
- `MIG-006` exact constraints, trigger/function, and unique index pass on the target. The owner-triggered `db push` occurred before activation; `MIG-007` then restored db-push-omitted invariants and reconciled history without reset or blind deploy.
- Signed-in `/work` shows the enabled create control, creates/selects one named test team, preserves personal project visibility and Client Portal fields, and yields exactly one redacted `workspace.created` row.
- Any mismatch stops the activation and routes to a forward fix; invitation/provider/transfer/feedback/AI scope remains off.

## TEAMCOLLAB-006 Existing-Profile Invitation Lifecycle Acceptance

- Status: runtime and configured audit-catalog activation passed on 2026-07-27; signed-in two-Profile browser interaction remains `REVIEW_REQUIRED`.
- OWNER/ADMIN may create or revoke invitations from a selected active TEAM; only an active OWNER may grant workspace OWNER. Global `UserRole`, client state, stale selection, and guessed IDs never authorize the write.
- Invitee Email is NFKC-normalized, trimmed, lowercased, bounded to 254 characters, and must resolve to an existing Profile before creation. Acceptance also requires the authenticated verified Email to match exactly.
- A fresh invitation returns its raw 256-bit token only once as `/work?invitation=<token>`; Prisma persists only the SHA-256 digest. Replays never recover or re-display the secret.
- Reinvite atomically revokes and audits prior PENDING tokens for the same workspace/Email. ACTIVE membership blocks a new usable invite; inactive membership routes to explicit management.
- Optional `projectId` and `projectRole` are paired, checked against the invited workspace, and may create only one explicit `VIEWER`/`COMMENTER`/`EDITOR`/`MANAGER` grant. GUEST receives no inherited project access.
- Wrong Email, expiry, revoked/reused tokens, OWNER escalation, inactive membership, invalid workspace/project, and same-name weakened audit storage fail closed. Auditable denials persist without leaking Email/token material.
- Audit metadata is exactly `{}`, request refs are SHA-256, only the reviewed event catalog is accepted, and UPDATE/DELETE fail with SQLSTATE `55000`.
- `/work` provides members/invitations state, project/role selection, pending revoke, manual-link copy/mail draft, explicit `尚未寄出`, and an exact-email acceptance card. No localStorage/mock authorization is used.
- `pnpm teamcollab:invitation:check` passes 27/27; create-team regression passes 32/32; the actual-service disposable PostgreSQL proof passes all lifecycle/security cases and removes its owned cluster/temp root.
- `MIG-008` rollback rehearsal, configured deploy, postcheck, migration status, and schema diff pass while TEAM/invitation/audit counts remain zero.
- Automatic provider delivery, Auth/Profile provisioning, member suspend/remove, project transfer, feedback/AI memory, public routes, RLS claims, and external agents are not accepted by this slice.

## TEAMCOLLAB Runtime Acceptance Target

- Workspace/project authorization is derived from `requireUser()` plus active membership/grants, never client state or global `UserRole`.
- A user in two teams can switch between them and cannot read/write the other team's ungranted projects by guessed IDs.
- Viewer/commenter/editor/manager capability boundaries pass positive and negative tests.
- Wrong-email, expired, revoked, reused, and suspended invitation/member paths fail closed.
- Team project transfer preserves project ID, tasks, notes, deliverables, files/media relations, feedback authorship, and audit.
- Feedback deletion/withdrawal excludes future AI retrieval and invalidates or reviews derived memory.
- App-layer authorization is proven independently; RLS is claimed only after JWT-aware disposable two-workspace proof.
- Production migration, real provider invitations, Auth/permission cutover, public/client feedback, automatic durable memory, provider fine-tuning, and external agents remain human-approval-gated.

## Auth Runtime Acceptance

- Development mock auth only works outside production when `PERSONAL_OS_AUTH_MODE=mock` is explicitly set.
- Development mock auth resolves an exact configured profile email and never falls back to the first profile.
- Supabase SSR helpers exist for browser, server, and Proxy use.
- Server auth uses verified Supabase claims for identity lookup rather than trusting client-provided user IDs.
- Protected dashboard routes redirect unauthenticated requests to `/login?next=...`.
- Dashboard layout performs a server-side user check before rendering the application shell.
- `/login` is outside the protected dashboard shell and remains publicly reachable.
- Login sends a Supabase magic link only to existing Supabase users; it does not auto-create new users.
- `/auth/callback` exchanges Supabase auth codes for cookie-backed sessions.
- Login redirects normalize `next` paths and block external/open redirects.
- Server actions still call `requireUser()` and service-layer authorization remains the data boundary.
- `/auth/status` is request-time dynamic and returns `Cache-Control: private, no-store`.
- `/auth/status` returns 401 for missing Supabase config or missing session, and 403 when a verified Supabase email does not map to a `Profile`.
- `/auth/status` returns only safe authenticated DTO fields: auth mode, public config state, profile email/role, and owner-scoped Work project count.
- `/auth/status` does not expose Supabase tokens, cookies, raw claims, raw provider payloads, internal profile IDs, or cross-user Work data.

## AUTH-007 Owner Access Readiness Acceptance

- `/login` renders a public-safe owner access readiness surface next to the magic-link form.
- The readiness surface is backed by `OwnerAccessReadinessContract` and covers Supabase magic link, explicit local dev mock, protected next path, and owner-run proof handoff rows.
- Supabase login is visibly blocked when public Supabase env is missing and enabled only when the public config exists.
- Explicit dev mock is labeled as development-only and requires `PERSONAL_OS_AUTH_MODE=mock`; it is not presented as private online launch proof.
- The protected next path is normalized before display and must remain an internal application path.
- The proof handoff points to `pnpm auth:proof`, `pnpm launch:proof`, `AUTH-005`, and `WORK-009` without collecting browser/session evidence inside the page.
- The page and `pnpm owner:access:check` do not expose Supabase URLs/keys, database URLs/hosts, cookies, tokens, raw auth claims, provider payloads, profile IDs, actual profile email values, or private Work rows.
- `AUTH-007` does not add auth provider mutation, session mutation, user provisioning, DB reads/writes, route handlers, server actions, schema changes, migrations, seed changes, public private-data output, or production env mutation.

## AUTH-006 Supabase Session Proof Acceptance

- `scripts/collect-auth-session-proof.mjs` exists and is exposed as `pnpm auth:proof`.
- `pnpm auth:proof` runs `pnpm launch:check --json` and writes a no-secret proof packet.
- The proof packet can optionally include sanitized `/auth/status` evidence from either `--status-url` or `--status-json`, but never both at once.
- `--status-url` accepts only `http(s)` URLs whose path is exactly `/auth/status`.
- The proof packet does not print Supabase URLs, publishable keys, anon keys, database URLs, database hosts, cookies, tokens, raw auth claims, raw provider payloads, profile IDs, or actual profile email values.
- Auth status evidence records only safe launch signals: authenticated boolean, auth mode, Supabase public config label, auth status label, profile email presence, profile role, owner-scoped Work project count, owner scope, HTTP status, and next action.
- `proofSummary.canRunAuth005` is true only when Supabase public env is ready, effective auth mode is `supabase`, `/auth/status` reports authenticated Supabase/Profile mapping, and owner-scoped Work project count is present.
- `docs/08_acceptance-and-qa/ACC-005_supabase-session-proof-checklist.md` documents command usage, proof packet contract, passing criteria, secret policy, and relationship to `AUTH-005`.
- `AUTH-006` does not mutate auth provider state, environment variables, database rows, sessions, cookies, profile rows, Work records, schema, migrations, seed data, or deployment settings.

## AUTH-009 Signed-In Auth Status Sanitized Capture Acceptance

- `/auth/status` gains a signed-in proof capture mode such as `?proof=1` that returns a redacted owner evidence DTO from the same server-side auth/Profile/Work boundary.
- The redacted proof DTO must use `profile.emailPresent: true` or equivalent instead of returning the raw profile email value.
- `pnpm auth:proof -- --status-json <file>` accepts the redacted proof DTO as valid status evidence while continuing to accept the existing raw private `/auth/status` payload.
- `pnpm auth:proof` still reports `proofSummary.canRunAuth005=true` only when Supabase public env is ready, effective auth mode is `supabase`, the status evidence is authenticated, Profile mapping is present, and owner-scoped Work project count is present.
- Login, settings, or admin owner-run handoff text points the owner to the redacted proof capture mode before saving evidence.
- The implementation must not accept or print cookies, tokens, raw claims, provider payloads, Auth UIDs, Profile ids, DB URLs, Supabase URLs/keys, service-role keys, raw email values, or cross-user Work data in generated reports.
- The implementation must not auto-create Profile rows, mutate auth provider state, write database rows, change schema/migrations, expand public output, claim `AUTH-005`, claim `WORK-009`, claim `DEPLOY-002`, or upgrade formal launch level.

## AUTH-010 Email Six-Digit OTP Login Acceptance

- `/login` presents Email six-digit verification as a primary passwordless path and keeps the existing Magic Link path available.
- The send-code Server Action validates the email, calls `signInWithOtp`, and keeps `shouldCreateUser: false` so unknown email addresses are never auto-provisioned.
- A successful send-code request returns the user to `/login` with the normalized protected `next` path, entered email, and the six-digit verification form visible.
- The OTP input uses numeric input mode, `one-time-code` autocomplete, and exactly six digits; the Server Action repeats the six-digit validation instead of trusting HTML constraints.
- The verification Server Action calls `verifyOtp({ email, token, type: "email" })` through the cookie-backed Supabase SSR server client and redirects only through `normalizeNextPath()`.
- Invalid, expired, malformed, missing-env, and provider-request failure states remain on the public-safe login surface with no raw provider payload, token, cookie, claim, Auth UID, Profile id, Supabase key, or database detail.
- Request and verification logs may include provider error code/status/name but must not include the submitted email address or OTP value.
- The hosted Supabase `Magic Link or OTP` email template includes `{{ .Token }}` so a six-digit code is delivered; retaining `{{ .ConfirmationURL }}` preserves the existing Magic Link alternative.
- A valid Supabase session without a matching Personal OS `Profile` continues to fail closed through the existing dashboard/Profile mapping boundary.
- `pnpm auth:email-otp:check`, `pnpm owner:access:check`, TypeScript, build, and login-route/browser smoke pass. A real inbox receipt and successful OTP login remain required before claiming provider-level end-to-end proof.
- `AUTH-010` does not add a service-role key, user provisioning, Profile provisioning, Prisma imports, application DB writes, schema changes, migrations, public private-data output, permission bypass, or launch-level upgrade.

## AUTH-011 Local Development Fixed OTP Acceptance

- `/login` on localhost can show a local-code path with the default six-digit code `123456`.
- The local-code path is disabled in `NODE_ENV=production`.
- By default, the fixed code is accepted only for localhost / `127.0.0.1` / `::1`; any non-local development use requires explicit `PERSONAL_OS_DEV_OTP_ENABLED=1`.
- The fixed-code Server Action sets only an httpOnly, same-site, short-lived development cookie containing the submitted email.
- If browser form state drops the submitted email, the fixed-code path may fall back to `PERSONAL_OS_DEV_USER_EMAIL` or the first email in `PERSONAL_OS_TEAM_PROFILES`, still only under the localhost/non-production fixed-code guard.
- Protected dashboard navigation still reaches `requireUser()`, and `resolveCurrentUser()` must map the cookie email to an existing `Profile`; missing Profile remains fail-closed as `mock_profile_missing`.
- `src/proxy.ts` may let the dev OTP cookie pass only so the dashboard layout can perform the existing server-side Profile check.
- Sign-out deletes the local dev OTP cookie.
- `pnpm auth:email-otp:check` validates the fixed-code guard, proxy pass-through, Profile mapping boundary, and production denial markers.
- `AUTH-011` does not create Supabase Auth users, Supabase sessions, Personal OS Profile rows, Prisma writes, service-role calls, public output, permission bypass, real-session proof, or launch-level upgrade.

## AUTH-012 Google OAuth Allowlisted Sign-In Acceptance

- `/login` shows a "使用 Google 登入" button that is disabled whenever Supabase public env is not configured, matching the existing OTP/magic-link disabled state.
- `/auth/google` (Route Handler) calls `supabase.auth.signInWithOAuth({ provider: "google" })` through the cookie-backed SSR client only; it never uses a service-role key.
- `/auth/callback` checks `user.app_metadata.provider`/`providers` for `"google"` before applying any Google-specific gate; a magic-link/OTP session is never re-checked against the Google allowlist.
- A Google sign-in whose verified email is not in `PERSONAL_OS_TEAM_PROFILES` is signed out (`scope: "local"`) and redirected to `/login?status=google_not_allowed`; no Profile is created for it.
- A Google sign-in whose verified email is in `PERSONAL_OS_TEAM_PROFILES` reaches `next` and, on first login only, gets a `Profile` created with that entry's role; an existing Profile's role/name is never overwritten by this path.
- `src/lib/auth/team-profiles.ts` is the single parser for `PERSONAL_OS_TEAM_PROFILES`, shared by `scripts/provision-team-profiles.ts` and the runtime allowlist so the two never drift.
- `pnpm exec tsc --noEmit --pretty false` and `pnpm db:validate` pass; no Prisma schema or migration changes were introduced by this task.
- Google Cloud Console OAuth client creation/consent screen and the Supabase Dashboard Google-provider toggle remain manual, owner-run steps; this acceptance item does not claim they are complete.

## AUTH-013 Demo Account Login Acceptance

- The demo login form on `/login` renders only when `isDemoLoginConfigured()` is true (both `PERSONAL_OS_DEMO_LOGIN_EMAIL` and a six-digit `PERSONAL_OS_DEMO_LOGIN_CODE` are set); email/token inputs are empty by default, never pre-filled or embedded in the rendered page.
- `verifyEmailOtp` accepts the demo email+code pair in every environment (not gated by `NODE_ENV` or host, unlike the dev-otp bridge) and sets a dedicated `personal_os_demo_email` cookie distinct from the dev-otp cookie; `src/lib/auth/dev-otp.ts`'s production/localhost guard is not modified by this task.
- `src/proxy.ts` lets the demo cookie reach protected routes in every environment; `resolveDemoLoginCurrentUser()` re-validates the cookie's email against the live `PERSONAL_OS_DEMO_LOGIN_EMAIL` value on every request, so unsetting either demo env var immediately invalidates existing demo cookies without a separate revocation step.
- `signOut` clears both the dev-otp and demo cookies.
- The demo account resolves to a real `Profile` (seeded via `prisma/seed.ts`, `DEMO_PROFILE_EMAIL = "test@yzedtech.com"`) that owns the existing seeded Work demo dataset; every other module continues to scope by `requireUser().profileId`, so no other account can see this data and the demo account cannot see anyone else's.
- `pnpm exec tsc --noEmit --pretty false`, `pnpm exec eslint` on touched files, and `pnpm db:validate` pass; no Prisma schema/migration change was introduced.

**Same-day follow-up — prototype module isolation:**

- Only the account whose email equals the current `PERSONAL_OS_DEMO_LOGIN_EMAIL` sees illustrative/example content in Research, AI Input, Workflow, Life, Finance, Chamber, and Company; every other signed-in account (Google-allowlisted or otherwise) sees a genuinely empty state for that content, computed server-side once in `src/app/(dashboard)/layout.tsx` and threaded down via `DemoAccountProvider`/`allowMockSeed`/`defaultEnabled` props — never a client-side-only check that could be bypassed by editing localStorage.
- Research's 17 localStorage-backed lists are namespaced by the signed-in email (`scopeId`), so two different real accounts sharing one browser cannot read or overwrite each other's prototype edits; a value the account already saved always wins over the seed, regardless of account.
- `pnpm build` (full production build) passes after this change, confirming every dashboard route and the new provider wiring compile and generate correctly.
- Explicitly out of scope / residual gaps, not claimed as closed: `Life`'s single-object `MonthlyPlan` template (not list-shaped, so not gated); `src/components/research/pub-timeline.tsx`, `idea-inbox.tsx`, and `src/lib/services/mock-ai.service.ts`'s direct `src/lib/mock/work` imports (a project picker and AI prompt context, not a top-level display); and full DB-backed persistence for these modules (this pass only changes which existing client-side illustrative content renders for which account — it does not add real multi-user CRUD/storage to any of these modules).

## AUTH-002 Module Permission Source Acceptance

- `src/lib/services/module-permission.service.ts` is server-only and returns a UI-safe `ModulePermissionSnapshot`.
- The snapshot starts from the authenticated profile role defaults and overlays persisted `UserModulePermission` rows by `moduleKey` / `isEnabled`.
- Unknown persisted module keys are counted and ignored instead of being passed to Client Components as active permissions.
- Dashboard layout initializes `ModulePermissionsProvider` from the server snapshot after auth resolves.
- Settings displays the server source, DB row count, unknown row count, enabled count, hidden count, and browser override state.
- Browser role/module controls are labeled as rehearsal overrides and can reset to the server snapshot.
- Admin readiness reports the same permission source and row counts.
- Client Components still receive only module keys, counts, role, and source labels; they do not import Prisma clients, provider secrets, raw auth claims, or raw permission rows.
- `AUTH-002` does not add module permission writes, audit persistence, Prisma schema changes, migrations, seed changes, production DB mutations, or high-risk module final writes.
- Module visibility controls are not treated as service-layer authorization for protected data.

## SETTINGS-001 Owner Settings Acceptance

- `/settings` is a protected dashboard route and appears in the sidebar outside module permission filtering.
- Unauthenticated `/settings` requests preserve `/settings` through `/login?next=...`.
- Settings uses server-side auth/profile readiness data from `resolveCurrentUser()` and never reads provider secrets or raw claims in a Client Component.
- Owner profile status shows email, role, auth runtime, profile mapping state, and owner-scoped Work project count only.
- `/auth/status` is linked as a JSON readiness handoff without exposing tokens, cookies, raw claims, or internal profile IDs.
- Role and module access starts from the server `ModulePermissionSnapshot`; browser overrides are explicitly rehearsal controls and not a security boundary.
- Mock/formal mode controls remain a client-side readiness display boundary, not DB persistence or authorization.
- Source connection rows are read-only placeholders; no OAuth, webhook, scheduled sync, connector runtime, Prisma migration, or external source read is added.
- Write boundaries explicitly state that profile edits, DB-backed permission writes, connector OAuth, and source sync are not implemented in this page.

## ADMIN-001 Operator Console Acceptance

- `/admin` is a protected dashboard route and appears in the sidebar outside module permission filtering.
- Unauthenticated `/admin` requests preserve `/admin` through `/login?next=...`.
- Admin readiness data is loaded server-side and does not expose provider secrets, raw cookies, raw Supabase claims, raw env values, or internal profile IDs.
- The console shows launch level, loop progress, next recommended task, auth readiness, owner-scoped Work count when available, module readiness, environment variable presence, current blockers, and recent evidence report paths.
- Environment rows show only present/missing status and required purpose; secret values are never rendered.
- Recent evidence is read from generated loop reports and remains informational; it does not create a public docs route.
- Admin actions are read-only in this slice: no user management, admin mutation, deployment API write, production env editing, connector sync, DB migration, seed, or audit persistence is added.
- Future persisted audit/readiness records require an explicit BFF contract before implementation.

## ADMIN-002 Admin/Settings Audit BFF Contract Acceptance

- `src/lib/services/admin-readiness.service.ts` is server-only and exports a UI-safe `AdminAuditBffContract`.
- `/admin` renders the full shared read-only contract for auth/profile readiness, module permission readiness, launch evidence, admin/settings surfaces, and future persisted audit gates.
- `/settings` renders the same contract as an owner-facing settings summary so settings and admin boundaries do not drift.
- The contract exposes only safe readiness signals: auth status, Supabase public config presence, module permission counts/source, evidence report references/counts, next task labels, and write-boundary text.
- The contract does not expose Supabase URLs/keys, database URLs, hostnames, cookies, tokens, raw claims, raw provider payloads, raw env values, raw permission rows, internal profile IDs, or report bodies.
- `ADMIN-002` does not add user management, permission write actions, admin mutations, deployment API writes, production env editing, connector sync, audit persistence, Prisma schema changes, migrations, seed changes, or production DB mutations.
- Future persisted audit/readiness records require reviewed schema, append-only semantics, retention rules, and service-layer authorization.

## ADMIN-003 Admin Overview Detail Stability Acceptance

- Loop 178 implementation: protected `/admin` defaults to an overview mode and exposes the full operator detail tables at `/admin?detail=all`.
- The overview mode keeps launch blockers, loop state, and admin write boundary visible in the first operator path.
- The full-detail mode preserves the existing deep launch/operator/readiness tables without deleting protected admin evidence.
- The page uses the Next.js 16 async `searchParams` page prop to select overview versus full-detail mode server-side.
- Browser smoke for the correct repo target `http://localhost:3100/admin` has no console warnings/errors, includes full-detail links, and renders overview mode with a bounded table count.
- `ADMIN-003` does not add user management, permission write actions, admin mutations, deployment API writes, production env editing, connector sync, audit persistence, Prisma schema changes, migrations, seed changes, public output expansion, or production DB mutations.
- `ADMIN-003` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from route stability evidence.

## ADMIN-004 Admin Detail Child Route Performance Split Acceptance

- Loop 181 implementation: protected `/admin` keeps the bounded overview, while `/admin/detail` renders the full launch console detail sections through the same protected dashboard shell.
- `/admin` remains the fast protected operator overview and preserves launch blockers, loop state, full-detail navigation, and admin write boundary in the first viewport.
- Deep readiness/evidence/detail content is moved to a dedicated admin detail route or equivalent child route instead of expanding the overview page payload.
- The route split preserves all existing protected admin evidence and does not delete Manual Ops, launch, auth, Work, deployment, agent, or readiness sections.
- The implementation uses Next.js 16 App Router patterns from local `node_modules/next/dist/docs/` before runtime code is changed.
- `pnpm route:identity:check --profile admin-overview` verifies the Personal OS admin overview route before local route proof is trusted.
- `pnpm route:identity:check --profile admin-detail` verifies the Personal OS admin detail child route and the `Full launch console detail` marker.
- Verification includes TypeScript, route identity, overview/detail route smoke, and a bounded payload/table/chunk comparison where feasible.
- `ADMIN-004` does not add user management, permission write actions, admin mutations, deployment API writes, production env editing, connector sync, audit persistence, Prisma schema changes, migrations, seed changes, public output expansion, or production DB mutations.
- `ADMIN-004` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from route split evidence.

## ADMIN-005 Admin Readiness Loader Cold-Start Dedup Acceptance

- Loop 182 implementation: protected admin auth/profile, module-permission, and owner project-count loaders use request-scoped server memoization so layout and admin console reads do not repeat within one server render request.
- The admin readiness loader reduces repeated protected-profile, module-permission, and owned-project-count reads during first `/admin` and `/admin/detail` requests.
- The overview/detail route split remains intact: `/admin` stays bounded and `/admin/detail` keeps the full launch console detail sections.
- The change must stay server-only and read-only: no admin writes, permission writes, auth provider mutation, DB schema/migration, seed, deployment mutation, public output, or launch-level claim.
- Verification should compare cold and warm route logs or route smoke timings where feasible, plus `pnpm exec tsc --noEmit --pretty false`, `pnpm route:identity:check --profile admin-overview`, and `pnpm route:identity:check --profile admin-detail`.
- `ADMIN-005` does not add user management, permission write actions, admin mutations, deployment API writes, production env editing, connector sync, audit persistence, Prisma schema changes, migrations, seed changes, public output expansion, or production DB mutations.
- `ADMIN-005` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from route performance evidence.

## ADMIN-006 Admin Overview Lightweight Loader Split Acceptance

- Loop 184 implementation: `src/lib/services/admin-readiness.service.ts` exports `AdminLaunchOverview` and `getAdminLaunchOverview()`, and `/admin` uses that overview-specific loader unless full-detail mode is explicitly requested.
- `/admin` uses an overview-specific read-only BFF loader instead of building the full `AdminLaunchConsole` before deciding overview/detail mode.
- The overview contract returns only the data needed for the first admin operator surface: generated timestamp, summary items, launch blockers, loop state, owner/auth/settings links, and full-detail navigation state.
- `/admin/detail` keeps the full protected launch console evidence route and preserves all existing detail sections.
- Warm proof: `/admin` passes route identity at about 135KB / 1 table with the `Overview loader` marker and no full-detail marker; `/admin/detail` passes at about 821KB / 39 tables with the full-detail marker and no overview-loader marker.
- Warm single-route server log proof: `/admin` logs one profile query, one module-permission query, one project-count query, and about 1.3s application code; `/admin/detail` preserves full evidence at about 4.2s application code.
- The split must stay server-only and protected: Client Components must not import Prisma, provider secrets, raw adapter payloads, or full admin service internals.
- Verification should include `pnpm exec tsc --noEmit --pretty false`, `pnpm route:identity:check --profile admin-overview`, `pnpm route:identity:check --profile admin-detail`, payload marker smoke for both routes, server log comparison proving overview skips detail-only contract work, and `git diff --check`.
- `ADMIN-006` does not add user management, permission write actions, admin mutations, deployment API writes, production env editing, connector sync, audit persistence, Prisma schema changes, migrations, seed changes, public output expansion, external registration, or production DB mutations.
- `ADMIN-006` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from route performance evidence.

## ADMIN-007 Admin Detail Loading And Section Index Acceptance

- Loop 186 research creates this task from the protected `/admin/detail` route maturity gap after `ADMIN-006`.
- Loop 187 implementation adds `src/app/(dashboard)/admin/detail/loading.tsx`, wraps `/admin/detail` in an explicit Suspense boundary, and adds `AdminDetailSectionIndex` plus stable section anchors for the major evidence families.
- `/admin/detail` adds a lightweight `loading.tsx` route fallback that shows no-secret operator context while the full evidence page streams.
- `/admin/detail` adds a first-viewport section index or equivalent route-state navigation with anchors for the major evidence families: launch operator actions, backend operation catalog, owner evidence, launch history, Work proof, scenario maturity, system/module readiness, operating surface maturity, AI Input readiness, owner auth boundary, agent protocol, environment/recent evidence, Client Portal, audit contract, and admin write boundary.
- The section index must preserve the existing full `AdminLaunchConsole` evidence route and must not remove Manual Ops, launch, auth, Work, deployment, agent, module, audit, or readiness evidence.
- `/admin` remains on the lightweight overview loader; `ADMIN-007` must not regress the `Overview loader` marker or force `/admin` back onto the full detail contract.
- Loop 187 proof: `pnpm exec tsc --noEmit --pretty false`, source marker smoke, `pnpm route:identity:check --profile admin-overview`, `pnpm route:identity:check --profile admin-detail`, and `git diff --check` pass under explicit mock auth for route UI proof only.
- Remaining performance risk: `/admin/detail` still carries the full evidence route at about 875174 bytes and warm `application-code` about 4.1s, so a later `ADMIN-008` section-loader or section-route split review is required before claiming the detail route is lightweight.
- The route remains protected, server-first, read-only, and no-secret: no Client Component may import Prisma, provider secrets, database clients, raw adapter payloads, raw env values, or full generated proof bodies.
- Verification should include local Next.js 16 `loading.tsx`, `page.tsx`, and instant-navigation docs review, `pnpm exec tsc --noEmit --pretty false`, `pnpm route:identity:check --profile admin-detail`, source or route marker smoke for the loading fallback and section index, optional `/admin/detail` payload/table smoke, JSON parse, and `git diff --check`.
- `ADMIN-007` does not add user management, permission write actions, admin mutations, deployment API writes, production env editing, connector sync, route handlers, public output expansion, audit persistence, Prisma schema changes, migrations, seed changes, external registration, or production DB mutations.
- `ADMIN-007` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from route-state or loading evidence.

## ADMIN-008 Admin Detail Section Loader Split Gap Review Acceptance

- Loop 188 research reviews why `/admin/detail` remains heavy after `ADMIN-007`, using local admin route/service code, loop 187 route proof, `RES-002`, `ACC-002`, and local Next.js 16 loading/page/streaming/parallel-route docs.
- The review scores the page issue before implementation. Loop 188 score: 94/100 High.
- The review completes three same-issue research lenses: local code/evidence, framework route/streaming behavior, and risk/verification boundaries.
- The selected strategy must reduce default route work rather than only adding loading, anchors, or client-hidden panels.
- The selected strategy must preserve protected full-evidence access through an explicit fallback during staged migration.
- The review must create an executable implementation task with scope, files likely affected, acceptance, verification, risks, and stop conditions.
- `ADMIN-008` does not add runtime route changes, user management, permission write actions, admin mutations, route handlers, public API expansion, deployment API writes, production env editing, connector sync, audit persistence, Prisma schema changes, migrations, seed changes, external registration, or production DB mutations.
- `ADMIN-008` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from research or route evidence.

## ADMIN-009 Admin Detail Section Route Split First Pass Acceptance

- `/admin/detail` defaults to a protected section-index shell and must not build or render the full `AdminLaunchConsole()` evidence path by default.
- `/admin/detail` keeps first-viewport operator context, section navigation, and admin write boundary visible.
- `/admin/detail/owner-evidence` or the selected first section route loads only the owner-evidence family through a whitelisted section-specific server loader.
- The first section route shows `AUTH-005`, `WORK-009`, deployment proof, owner-run commands, blockers, pass/fail signals, and no-secret evidence handoff without exposing raw proof bodies or secrets.
- `/admin` remains on the lightweight overview loader and must keep the overview route identity marker.
- An explicit full-detail fallback path remains available for audit continuity while the section split is staged.
- The section slug is whitelisted. Unknown slugs must fail closed with a protected unavailable state or `notFound()`, not dynamic arbitrary contract lookup.
- Client Components must not import Prisma, provider secrets, database clients, raw adapter payloads, raw env values, or full generated proof bodies.
- Verification should include local Next.js 16 route/page/loading/streaming docs review, `pnpm exec tsc --noEmit --pretty false`, source marker smoke, `pnpm route:identity:check` for admin overview plus detail shell plus owner-evidence section, payload/table comparison proving shell no longer renders the 39-table full route, JSON parse, and `git diff --check`.
- `ADMIN-009` does not add user management, permission write actions, admin mutations, route handlers, public API expansion, deployment API writes, production env editing, connector sync, audit persistence, Prisma schema changes, migrations, seed changes, external registration, or production DB mutations.
- `ADMIN-009` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from route split evidence.

## DEPLOY-003 Vercel Build Memory And Command Pinning Acceptance

- Vercel production build uses the repo-pinned `buildCommand` and `installCommand` from `vercel.json` instead of relying only on mutable project UI defaults.
- Install skips package scripts with `pnpm install --frozen-lockfile --ignore-scripts` so Prisma generation is not run silently during install.
- Build explicitly runs `pnpm prisma generate && pnpm build`.
- `pnpm build` uses `next build --webpack`, while `build:turbopack` remains available as an explicit local comparison path.
- `next.config.ts` enables Webpack build worker and Webpack memory optimizations for lower-memory production builds.
- Local proof must include `pnpm exec tsc --noEmit --pretty false`, `pnpm prisma generate && pnpm build`, `vercel.json` JSON parse, and `git diff --check`.
- The Vercel build repair may remove an OOM/build-command blocker, but it does not by itself claim `DEPLOY-002`; deployment marker proof and route smoke in the intended online environment remain owner/operator evidence.
- `DEPLOY-003` does not mutate Vercel environment variables, auth provider state, database rows, Prisma schema/migrations, seed data, public output, protected route permissions, external agent registration, or launch level.
- `DEPLOY-003` must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4 from local build proof or git push evidence.

## ENV-005 Local Route Identity Smoke Acceptance

- Loop 179 implementation: `scripts/check-local-route-identity.mjs` exists and is exposed as `pnpm route:identity:check`.
- The default profile checks `http://localhost:3100/admin` for Personal OS admin overview markers before route, auth, admin, or Work proof output is interpreted.
- The checker supports explicit `--url`, `--profile`, repeated `--require`, repeated `--forbid`, `--timeout-ms`, `--json`, and `--out` arguments.
- The checker treats wrong-local-app markers from the prior port-3000 confusion as route identity mismatch and returns a non-zero exit code.
- The checker does not follow redirects by default, does not send cookies, and does not print raw HTML, headers, cookies, tokens, Supabase URLs/keys, database URLs/hosts, raw auth claims, provider payloads, Profile ids, Auth UIDs, or generated report bodies.
- The checker writes only no-secret route identity facts: safe URL label, HTTP status, marker booleans, response body byte length, safety flags, blocked launch claims, and next action.
- `ENV-005` does not mutate environment variables, auth provider state, sessions, database rows, migrations, seed data, deployments, admin state, public output, Client Portal runtime behavior, or launch level.
- Passing route identity smoke is a prerequisite-quality signal only; it must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, L1, L3, or L4.

## SURFACE-MATURITY-002 Operating Surface Maturity Acceptance

- `src/lib/services/admin-readiness.service.ts` is server-only and exports a UI-safe `OperatingSurfaceMaturityContract`.
- `/admin` renders the full shared operating maturity table for module mode, DB state, agent workspace readiness, records/audit readiness, settings/boundaries, API/CLI state, risk, and next task.
- `/settings` renders an owner-facing summary of the same contract so member settings and admin maturity signals do not drift.
- The contract covers Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.
- The contract exposes only safe readiness labels, counts, next task ids, risk text, and no-secret boundary text.
- The contract does not expose raw private records, profile IDs, database URLs or hosts, Supabase URLs or keys, cookies, tokens, raw auth claims, raw generated report payloads, external registry writes, or agent provider secrets.
- Agent Team OS and agent API/CLI readiness remain protected-only and internal; external registration stays blocked unless endpoint, auth, scopes, trust, rollback, and human approval are complete.
- `SURFACE-MATURITY-002` does not add persisted audit events, owner operation API/CLI runtime, DB writes, schema changes, migrations, seed changes, public output expansion, admin mutations, or external agent registration.

## SURFACE-MATURITY-003 Shared Module Resource Index BFF Contract Acceptance

- `docs/02_architecture-and-rules/ARC-030_module-resource-index-bff-contract.md` exists as the canonical shared module resource index BFF contract.
- `src/lib/contracts/module-resource-index.contract.ts` exports `MODULE_RESOURCE_INDEX_CONTRACTS` and covers Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.
- Work has the first concrete contract for search, filters, sorts, columns, cursor pagination, multi-selection, row actions, bulk proposal actions, detail drawer payloads, empty/loading/error/blocked states, and audit refs.
- Other modules have prototype or blocked contract mappings that name the next task and write boundary without pretending the module is DB-backed.
- High-risk modules keep write actions blocked or human-approval-required before Life, Finance, Company, Client Portal, auth/permission, public output, or external collaboration writes.
- Client Portal remains token-gated/fail-closed and must not reuse protected owner index payloads for public output.
- `scripts/check-module-resource-index-contract.mjs` exists and is exposed as `pnpm module:index:check`.
- `pnpm module:index:check` writes a no-secret proof packet and validates required module keys, required resource-index markers, referenced docs, and absence of runtime/env/provider/database/network markers in the contract source.
- The contract does not import Prisma, database clients, provider clients, server request helpers, raw adapter payloads, private identifiers, or secrets.
- `SURFACE-MATURITY-003` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, admin mutations, token lifecycle writes, or external agent registration.

## RESEARCH-OPS-001 Research Formal Readiness BFF Acceptance

- `src/lib/contracts/research-formal-readiness.contract.ts` exists as the canonical server-only Research formal readiness/read contract before any Research migration or runtime write expansion.
- The contract names Research resource families such as issues, sources, concepts, writing projects, questions, events, people, links, graph, agent proposals, and records/readiness.
- The contract explicitly reports the current state split: `useResearch()` localStorage/mock UI state, partial thread-first Prisma Research models, existing unsafe-for-formal server actions, and the unresolved `ResearchIssue` versus `ResearchThread` model boundary.
- The contract defines the future BFF path as `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> UI-safe DTO -> Client Component interaction`.
- The contract marks write actions, schema migration, graph/link promotion, AI agent final writes, public output, and external collaboration as blocked until model reconciliation, owner-scoped authorization, audit policy, and explicit approval exist.
- `scripts/check-research-formal-readiness.mjs` exists and is exposed as `pnpm research:readiness:check`.
- `pnpm research:readiness:check` verifies the contract, docs/task-memory markers, no forbidden runtime imports, no hidden mock-to-formal claim, no migration/apply/write enablement, and no launch-level claim.
- The first `RESEARCH-OPS-001` implementation does not add route handlers, server actions, Prisma schema changes, migration drafts/applies, seed changes, DB reads, DB writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, or external registration.

## RESEARCH-OPS-002 Research Formal Readiness Surface Acceptance

- A protected owner Research, admin, or settings surface renders the `RESEARCH-OPS-001` contract summary without requiring a database connection or owner-run proof target; the first accepted path is `/research/readiness`.
- The surface shows resource-family readiness for issues, sources, concepts, writing projects, questions, events, people, links, graph, agent proposals, and records/readiness.
- The surface makes the current state split visible: localStorage/mock UI state, partial thread-first Prisma Research models, unsafe-for-formal server actions, and unresolved `ResearchIssue` versus `ResearchThread` model boundary.
- The surface shows the future BFF path as `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> UI-safe DTO -> Client Component interaction`.
- The surface labels blocked writes, schema migration, graph/link promotion, AI agent final writes, public output, and external collaboration as blocked until model reconciliation, owner-scoped authorization, audit policy, and explicit approval exist.
- `src/lib/services/research-formal-readiness.service.ts` builds a UI-safe view model from the contract only, and the Research hub links to `/research/readiness`.
- `pnpm research:readiness:check` verifies the protected surface, hub entry, contract markers, no forbidden runtime imports, no hidden mock-to-formal claim, no migration/apply/write enablement, and no launch-level claim.
- The surface does not add route handlers, server actions, Prisma schema changes, migration drafts/applies, seed changes, DB reads, DB writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or a launch-level claim.

## RESEARCH-MODEL-001 Research Issue Thread Reconciliation Acceptance

- A formal Research model reconciliation artifact updates or supersedes the stale `DBS-003` statement that Prisma has no Research tables and explicitly describes the current partial thread-first Prisma state.
- `src/lib/contracts/research-model-reconciliation.contract.ts` exists as the machine-checkable model reconciliation contract for `RESEARCH-MODEL-001`.
- The artifact maps `ResearchIssue`, `ResearchThread`, questions, sources, concepts, ideas, writing projects, writing sections, feedback runs, events, people, links, graph projection, records/audit, and Research agent proposals into a canonical transition model.
- Current `ResearchThread`, `ResearchSource`, `ResearchConcept`, `ResearchWritingProject`, `ResearchWritingSection`, `AIFeedbackRun`, `ResearchDigest`, `ResearchEvent`, and `AcademicPerson` tables are treated as transitional or partial until the canonical model decision is recorded.
- The future formal read path remains `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> UI-safe DTO -> Client Component interaction`.
- Existing Research server actions that accept caller-supplied `ownerId` or `threadId` are marked unsafe for formal use until service-layer owner authorization replaces or wraps them.
- Typed research links remain blocked from runtime persistence until the canonical link model, provenance metadata, audit refs, and owner-scoped authorization are defined.
- Research agent proposals remain protected-owner visible and proposal-only; final writes, public output, external collaboration, direct external agent DB access, and external registration remain blocked.
- `scripts/check-research-model-reconciliation.mjs` exists and is exposed as `pnpm research:model:check`.
- `pnpm research:model:check` verifies the contract, current Prisma model markers, Research type markers, unsafe action markers, `DBS-003`, `DBS-005`, task memory, acceptance criteria, package script, false safety markers, no forbidden runtime imports, no migration/write/public-output enablement, and no launch-level claim.
- The task does not add Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-001 Research Owner-Scoped Read DTO Contract Acceptance

- `src/lib/contracts/research-owner-read-dto.contract.ts` exists as the contract-only owner-scoped Research read DTO boundary before any runtime Research DB read expansion.
- The contract defines the future read path as `Server Component loader -> requireUser() -> Research service authorization -> Prisma or approved adapter -> mapper -> UI-safe DTO -> Client Component interaction`.
- The contract defines read DTO families for Research issues, sources, concepts, writing projects, writing sections, events, people, typed links, graph projections, readiness evidence, and Research agent proposals.
- The contract states that owner identity is derived from `requireUser()` and must not be accepted from the client; no caller-supplied `ownerId` is allowed.
- The contract blocks direct `threadId`-only access until the Research service proves ownership through the authorized owner profile.
- The contract blocks raw Prisma model payloads, database clients, provider secrets, env values, request cookies/headers, raw adapter payloads, and private IDs from Client Components.
- The contract defines empty/readiness states for no Research rows, model-ready but read-unavailable, partial transitional data, and formal-read-disabled states.
- Research agent proposal DTOs remain protected-owner visible and proposal-only; final writes, public output, external collaboration, direct external agent DB access, and external registration remain blocked.
- `scripts/check-research-owner-read-dto.mjs` exists and is exposed as `pnpm research:read-dto:check`.
- `pnpm research:read-dto:check` verifies required contract markers, docs/task-memory markers, no forbidden runtime imports, false safety markers, no hidden mock-to-formal claim, no migration/write/public-output enablement, and no launch-level claim.
- The task does not add Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-002 Research Owner Read DTO Service Surface Acceptance

- `src/lib/services/research-owner-read-dto.service.ts` exists as a server-only service surface skeleton that consumes `RESEARCH_OWNER_READ_DTO_CONTRACT` and `RESEARCH_OWNER_READ_DTO_SUMMARY`.
- The service surface exposes `buildResearchOwnerReadDtoSurface()` and `RESEARCH_OWNER_READ_DTO_SERVICE_SURFACE` for protected owner UI use.
- `/research/readiness` renders an `Owner read DTO service skeleton` section with the `RESEARCH-BFF-002-RESEARCH-OWNER-READ-DTO-SERVICE-SURFACE` task id, owner identity source, service mode, protected route, read family rows, authorization rows, and empty/readiness state rows.
- `/research` links to `/research/readiness` and names the Owner read DTO skeleton in the Research formal readiness entry.
- Owner identity remains reserved for the future server path through `requireUser()`; this slice does not run runtime auth, accept caller-supplied `ownerId`, or permit direct `threadId`-only access.
- The surface names the UI-safe DTO boundary and keeps runtime Research DB read/write, route handlers, server action writes, public output, external collaboration, external registration, and launch-level claims disabled.
- Research agent proposals remain protected-owner visible and proposal-only; no runtime agent capability, final write, public output, or external registration is enabled.
- `pnpm research:read-dto:check` now verifies contract, service, readiness page, Research hub markers, docs/task-memory markers, no forbidden runtime imports, false safety markers, no hidden mock-to-formal claim, no migration/write/public-output enablement, and no launch-level claim.
- The task does not add Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-003 Research Owner Read DTO Authorization Skeleton Acceptance

- `src/lib/services/research-owner-read-dto.service.ts` exposes `RESEARCH-BFF-003-RESEARCH-OWNER-READ-DTO-AUTHZ-SKELETON` through `buildResearchOwnerReadDtoSurface()` while preserving the BFF-001 contract and BFF-002 service surface markers.
- The authorization skeleton is `requireUser()`-shaped but does not call runtime auth in this slice; it records owner identity source, service authorization mode, permission decisions, direct `threadId` access refusal, caller-supplied `ownerId` refusal, and adapter-before-authz denial.
- `/research/readiness` renders an `Owner read authorization skeleton` section with authorization stages, denied patterns, unavailable states, and permission decision rows for owner-scoped Research reads, direct `threadId` reads, and Research agent proposal reads.
- The skeleton keeps service authorization required before any adapter read and keeps mapper output limited to authorized rows plus UI-safe DTO and unavailable/readiness states.
- Research agent proposal reads remain protected-owner visible and proposal-only; final writes, public output, external collaboration, direct external agent DB access, and external registration remain blocked.
- `pnpm research:read-dto:check` verifies BFF-001 contract markers, BFF-002 service/page/hub markers, BFF-003 authorization skeleton/page markers, docs/task-memory markers, no forbidden runtime imports, false safety markers, no hidden mock-to-formal claim, no migration/write/public-output enablement, and no launch-level claim.
- The task does not add Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-004 Research Owner Read DTO Mapper Empty-State Response Acceptance

- `src/lib/services/research-owner-read-dto.service.ts` exposes `RESEARCH-BFF-004-RESEARCH-OWNER-READ-DTO-MAPPER-EMPTY-STATE` through `buildResearchOwnerReadDtoSurface()` while preserving the BFF-001 contract, BFF-002 service surface, and BFF-003 authorization skeleton markers.
- The mapper response skeleton is `mapper_empty_state_skeleton_no_runtime_db_read` and defines `authorized_rows_or_explicit_unavailable_state -> ui_safe_research_owner_read_response_dto`.
- The mapper response skeleton maps authorized-empty, model-ready-unavailable, partial-transitional-unavailable, formal-read-disabled, and proposal-only Research owner-read states into stable response DTO rows without runtime adapter reads.
- `/research/readiness` renders an `Owner read DTO mapper and empty-state response` section with the BFF-004 task id, mapper mode, UI-safe output, explicit no-mock-fallback policy, response state rows, and per-family mapper response rows.
- Formal owner-read responses do not silently fall back to mock/local data. Empty, unavailable, partial, disabled, and proposal-only states must be explicit protected UI states until service authorization and adapter reads are proven.
- Research agent proposal reads remain protected-owner visible and proposal-only; final writes, public output, external collaboration, direct external agent DB access, and external registration remain blocked.
- `pnpm research:read-dto:check` verifies BFF-001 contract markers, BFF-002 service/page/hub markers, BFF-003 authorization skeleton/page markers, BFF-004 mapper/empty-state response markers, docs/task-memory markers, no forbidden runtime imports, false safety markers, no hidden mock-to-formal claim, no migration/write/public-output enablement, and no launch-level claim.
- The task does not add Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-005 Research Owner Read Query Plan Contract Acceptance

- `src/lib/contracts/research-owner-read-query-plan.contract.ts` defines `RESEARCH-BFF-005-RESEARCH-OWNER-READ-QUERY-PLAN-CONTRACT` as a no-runtime query-plan contract before any Prisma adapter read is enabled.
- The contract maps all 11 Research owner-read DTO families to transitional model candidates or explicit unavailable states, owner-scope predicate requirements, minimal select/relation boundaries, mapper input states, unavailable/empty states, and audit refs.
- The contract preserves the BFF path: `Server Component loader -> requireUser() -> Research service authorization -> approved adapter -> owner-scoped query -> mapper -> UI-safe DTO`.
- Current unsafe action patterns are named as rejected patterns, including caller-supplied `ownerId`, direct `threadId` reads, global event/person reads treated as formal owner data, and raw Prisma payload passthrough.
- Research agent proposal query-plan rows remain protected-owner visible and proposal-only; final writes, public output, external collaboration, direct external agent DB access, and external registration remain blocked.
- `scripts/check-research-owner-read-query-plan.mjs` exists and is exposed as `pnpm research:read-query-plan:check`.
- `pnpm research:read-query-plan:check` verifies BFF-005 contract markers, all 11 family rows, owner-scope and selected-field boundaries, no forbidden runtime imports, false safety markers, no hidden mock-to-formal claim, no migration/write/public-output enablement, and no launch-level claim.
- The task does not add Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-006 Research Owner Read Service Loader Skeleton Acceptance

- `src/lib/services/research-owner-read-dto.service.ts` consumes `RESEARCH_OWNER_READ_QUERY_PLAN_CONTRACT` and exposes `RESEARCH-BFF-006-RESEARCH-OWNER-READ-SERVICE-LOADER-SKELETON` through `buildResearchOwnerReadDtoSurface()` while preserving BFF-001 through BFF-005 markers.
- The service exposes `queryPlanLoaderSkeleton` and `queryPlanLoaderRows` for all 11 Research owner-read DTO families with adapter kind, runtime state, owner-scope predicate, selected-field boundary, unavailable state, rejected unsafe patterns, audit ref, and next safe loader action.
- `/research/readiness` renders an `Owner read query-plan service loader skeleton` section with the BFF-005 contract id, the BFF-006 service-loader task id, loader path, adapter execution disabled state, and a table for Adapter kind, Owner-scope predicate, Selected-field boundary, Rejected unsafe patterns, and Next safe loader action.
- The loader skeleton keeps `adapterExecutionAllowed: false`, `runtimeDbReadEnabled: false`, `runtimeDbWriteEnabled: false`, `routeHandlerEnabled: false`, `serverActionWriteEnabled: false`, `publicOutputEnabled: false`, and `externalRegisterable: false`.
- `scripts/check-research-owner-read-query-plan.mjs` verifies the BFF-005 contract plus BFF-006 service/page markers, and `scripts/check-research-owner-read-dto.mjs` verifies the loader remains part of the protected owner-read DTO surface.
- `pnpm research:read-query-plan:check` and `pnpm research:read-dto:check` must both pass before a future adapter implementation is selected.
- Research agent proposal rows remain protected-owner visible and proposal-only; final writes, public output, external collaboration, direct external agent DB access, and external registration remain blocked.
- The task does not add Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-007 Research Owner Read Adapter Authz Contract Acceptance

- `src/lib/contracts/research-owner-read-adapter-authz.contract.ts` exists and defines `RESEARCH-BFF-007-RESEARCH-OWNER-READ-ADAPTER-AUTHZ-CONTRACT` as a no-runtime adapter execution authorization contract before any Research Prisma adapter read is enabled.
- The contract consumes or references BFF-005 query-plan rows and BFF-006 service-loader boundaries, then records one adapter authz decision for all 11 Research owner-read DTO families.
- Each family row records adapter execution eligibility, required owner identity source, owner-scope proof path, denied unsafe patterns, selected-field boundary, mapper input boundary, unavailable/proposal-only state, audit ref, and next implementation condition.
- Owner identity must be derived from `requireUser()` only. Caller-supplied `ownerId`, direct `threadId`-only reads, adapter execution before service authorization, and raw Prisma payload passthrough remain rejected patterns.
- Families with direct or relation-based owner scope, such as threads/sources/concepts/writing/digests, may be marked contract-eligible but still keep runtime DB reads disabled in this task.
- Events and people remain blocked until an owner-scope relation or privacy split is approved. Typed links and graph projections remain derived/unavailable until link provenance, persistence, and audit rules exist. Research agent proposals remain protected-owner visible and proposal-only.
- `scripts/check-research-owner-read-adapter-authz.mjs` exists and is exposed as `pnpm research:read-adapter-authz:check`.
- `pnpm research:read-adapter-authz:check` verifies the BFF-007 contract markers, all 11 family rows, no forbidden runtime imports, no enabled runtime reads/writes, docs/task-memory markers, and no hidden mock-to-formal or launch-level claim.
- `pnpm research:read-query-plan:check`, `pnpm research:read-dto:check`, `pnpm research:model:check`, and `pnpm research:readiness:check` remain passing alongside the new checker.
- The task does not add Prisma client imports, Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-008 Research Owner Read Adapter Mock Harness Acceptance

- `src/lib/contracts/research-owner-read-adapter-mock-harness.contract.ts` exists and defines `RESEARCH-BFF-008-RESEARCH-OWNER-READ-ADAPTER-MOCK-HARNESS` as a fixture-only adapter harness before any Research Prisma adapter read is enabled.
- The harness consumes `BFF-007 authz decisions` from `RESEARCH_OWNER_READ_ADAPTER_AUTHZ_DECISIONS` and records one harness row plus one safe fixture row for all 11 Research owner-read DTO families.
- Contract-eligible families can exercise the `fixture-only adapter` with no DB connection, no Prisma client import, no route handler, no server action, and no runtime table read.
- Events, people, typed links, graph projections, readiness evidence, and agent proposals remain non-executable: blocked/derived/generated/proposal-only families never execute adapters and return only marker/proposal metadata.
- The harness keeps `realAdapterExecutionAllowed`, `runtimeAdapterExecutionAllowed`, `runtimeDbReadEnabled`, `runtimeDbWriteEnabled`, `routeHandlerEnabled`, `serverActionWriteEnabled`, `publicOutputEnabled`, `externalCollaborationEnabled`, `externalAgentDatabaseAccessAllowed`, `agentFinalWriteAllowed`, `externalRegisterable`, and `launchLevelUpgradeClaimed` false.
- Research agent proposal rows remain protected-owner visible, proposal-only, non-registerable, and require human approval before any final write or external sharing.
- `scripts/check-research-owner-read-adapter-mock-harness.mjs` exists and is exposed as `pnpm research:read-adapter-mock:check`.
- `pnpm research:read-adapter-mock:check` verifies the BFF-008 contract markers, BFF-007 dependency, all 11 family fixtures, executable versus non-executable family split, no forbidden runtime imports, docs/task-memory markers, and no hidden mock-to-formal or launch-level claim.
- `pnpm research:read-adapter-authz:check`, `pnpm research:read-query-plan:check`, `pnpm research:read-dto:check`, `pnpm research:model:check`, and `pnpm research:readiness:check` remain passing alongside the new checker.
- The task does not add Prisma client imports, Prisma schema changes, migrations, migration applies, seed changes, route handlers, server actions, runtime DB reads/writes, connector/provider runtime, public output expansion, high-risk final writes, external agent database access, external registration, or launch-level claims.

## RESEARCH-BFF-009 Research Owner Read First Runtime Adapter Slice Acceptance

- `RESEARCH-BFF-009-RESEARCH-OWNER-READ-FIRST-RUNTIME-ADAPTER-SLICE` selects exactly one first owner-scoped Research read family, with `issues` or `sources` preferred only after inspecting the current model, service, mapper, and query-plan contract at implementation time.
- Loop 161 selected family: issues, because `ResearchThread.ownerId equals requireUser().profileId` is the direct owner-scope proof path and is safer than starting with child relations or blocked/global families.
- `src/lib/contracts/research-owner-read-adapter-runtime.contract.ts` exists and defines the selected family, `proof-gated runtime adapter skeleton`, BFF-005/BFF-007/BFF-008 consumption, selected fields, owner proof path, stop conditions, and disabled runtime execution.
- Protected `/research/readiness` surfaces the first runtime adapter gate from `src/lib/services/research-owner-read-dto.service.ts`, including selected family, owner proof path, selected-field boundary, `adapterExecutionAllowed: false`, and `runtimeDbReadEnabled: false`.
- The slice must consume `RESEARCH-BFF-008`, `RESEARCH-BFF-007`, `RESEARCH-BFF-006`, and `RESEARCH-BFF-005` outputs instead of inventing a new owner-read path.
- Owner identity must come from the existing protected service boundary and `requireUser()`/Profile mapping. Caller-supplied `ownerId`, direct `threadId`-only reads, raw Prisma payload passthrough, and adapter execution before service authorization remain rejected.
- If runtime DB reads are not safe because owner/Profile proof, service authorization, proof target, selected-field redaction, or owner approval is incomplete, the task must stop at a proof-gated adapter skeleton and checker that proves runtime execution remains disabled.
- If a runtime read is enabled, it must remain server-only, owner-scoped, selected-field-only, mapper-mediated, UI-safe, read-only, and protected-owner visible. It must not add route handlers, server action writes, broad family rollout, public output, external collaboration, Research agent final writes, external agent database access, or external registration.
- The implementation must add or update a task-specific checker, expected as `pnpm research:read-adapter-runtime:check` or an equivalent narrowly named command, to verify family selection, prerequisite contracts, authz boundary, selected fields, mapper boundary, no forbidden imports in Client Components, and no hidden launch-level claim.
- `scripts/check-research-owner-read-adapter-runtime.mjs` exists and is exposed as `pnpm research:read-adapter-runtime:check`.
- `pnpm research:read-adapter-mock:check`, `pnpm research:read-adapter-authz:check`, `pnpm research:read-query-plan:check`, `pnpm research:read-dto:check`, `pnpm research:model:check`, and `pnpm research:readiness:check` must remain passing alongside the new checker or documented stop condition.
- The task must update generated evidence, backlog/sprint/task memory, and completed log with the exact decision: runtime adapter enabled for one family, or proof-gated skeleton only.
- Follow-up implementation task: `RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF`.

## RESEARCH-BFF-010 Research Owner Read Issues Adapter Interface And Mapper Proof Acceptance

- `src/lib/services/research-owner-read-issues-adapter.service.ts` exists and defines `RESEARCH-BFF-010-RESEARCH-OWNER-READ-ISSUES-ADAPTER-INTERFACE-AND-MAPPER-PROOF` as the selected `issues` adapter interface and mapper proof behind the BFF-009 gate.
- The service remains `server-only`, uses `issues_adapter_interface_mapper_proof_no_runtime_db_read`, and defines `ResearchOwnerReadIssueAuthorizedRow`, `ResearchOwnerReadIssueReadDto`, `mapAuthorizedResearchIssueRowToDto`, `mapAuthorizedResearchIssueRowsToDtos`, and `RESEARCH_OWNER_READ_ISSUES_ADAPTER_PROOF`.
- The mapper accepts only authorized selected-field rows or explicit unavailable state, maps to `ui_safe_research_issue_read_dto`, and keeps blocked fields such as `ownerId`, raw Prisma model payloads, caller-supplied owner IDs, direct `threadId`-only access, private source bodies, and unselected relations out of the DTO.
- Protected `/research/readiness` surfaces the issues adapter interface and mapper proof with future adapter signature, mapper input/output boundary, proof row to DTO count, blocked fields, proof DTO audit ref, and disabled runtime flags.
- `runtimeDbReadEnabled`, `runtimeDbWriteEnabled`, `adapterExecutionAllowed`, `routeHandlerEnabled`, `serverActionWriteEnabled`, `publicOutputEnabled`, `externalCollaborationEnabled`, `externalAgentDatabaseAccessAllowed`, `agentFinalWriteAllowed`, `externalRegisterable`, and `launchLevelUpgradeClaimed` remain false.
- `scripts/check-research-owner-read-issues-adapter.mjs` exists and is exposed as `pnpm research:read-issues-adapter:check`.
- `pnpm research:read-issues-adapter:check`, `pnpm research:read-adapter-runtime:check`, `pnpm research:read-adapter-mock:check`, `pnpm research:read-adapter-authz:check`, `pnpm research:read-query-plan:check`, `pnpm research:read-dto:check`, `pnpm research:model:check`, and `pnpm research:readiness:check` must remain passing.
- The next cadence task is `LOOP-163-RESEARCH-POST-ISSUES-ADAPTER-GAP-REVIEW` unless `AUTH-005` or `WORK-009` proof prerequisites appear.

## RESEARCH-BFF-011 Research Owner Read Issues Runtime Readiness Gate Acceptance

- `src/lib/contracts/research-owner-read-issues-runtime-readiness.contract.ts` exists and defines `RESEARCH-BFF-011-RESEARCH-OWNER-READ-ISSUES-RUNTIME-READINESS-GATE` as the runtime-readiness preflight gate after BFF-010 and before any Research issues Prisma runtime read.
- The gate mode is `issues_runtime_readiness_preflight_no_runtime_db_read`.
- The contract remains `server-only` or contract-only and records the future BFF path: Server Component loader, `requireUser()`, Research service authorization, owner-scoped selected-field adapter, mapper, UI-safe DTO, and Client Component interaction.
- The gate records `requireUser().profileId` as the only owner identity source, `ResearchThread.ownerId equals requireUser().profileId` as the owner predicate, selected scalar fields, `_count` relation counts, stable sort, default limit, mapper input/output boundaries, explicit unavailable fallback, audit refs, and stop conditions.
- Runtime flags stay false: `runtimeDbReadEnabled`, `runtimeDbWriteEnabled`, `adapterExecutionAllowed`, `routeHandlerEnabled`, `serverActionWriteEnabled`, `publicOutputEnabled`, `externalCollaborationEnabled`, `externalAgentDatabaseAccessAllowed`, `agentFinalWriteAllowed`, `externalRegisterable`, and `launchLevelUpgradeClaimed`.
- Protected `/research/readiness` surfaces the runtime-readiness gate as a preflight state, not as successful runtime persistence.
- `scripts/check-research-owner-read-issues-runtime-readiness.mjs` exists and is exposed as `pnpm research:read-issues-runtime-readiness:check`.
- The checker verifies BFF-010/BFF-009 dependencies, selected-field and owner-predicate markers, disabled runtime flags, no forbidden runtime imports or route/action expansion, docs/task-memory markers, and next routing.
- Existing Research checks remain passing: `pnpm research:read-issues-adapter:check`, `pnpm research:read-adapter-runtime:check`, `pnpm research:read-adapter-mock:check`, `pnpm research:read-adapter-authz:check`, `pnpm research:read-query-plan:check`, `pnpm research:read-dto:check`, `pnpm research:model:check`, and `pnpm research:readiness:check`.
- The task does not add Prisma runtime reads, DB connections, schema/migration changes, seed changes, route handlers, server actions, public output, external collaboration, Research agent final writes, external agent database access, external registration, or launch-level claims.
- Follow-up routing is `LOOP-165-LAUNCH-LEVEL-REVIEW` unless `AUTH-005` or `WORK-009` prerequisites appear; after the review, the next no-proof Research slice is `RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF`.

## RESEARCH-BFF-012 Research Owner Read Issues Service Authz Runtime Proof Acceptance

- `src/lib/services/research-owner-read-issues-runtime-readiness.service.ts` exists and defines `RESEARCH-BFF-012-RESEARCH-OWNER-READ-ISSUES-SERVICE-AUTHZ-RUNTIME-PROOF` as the protected server runtime proof after BFF-011 and before any Research issues Prisma read.
- The service mode is `issues_service_authz_runtime_proof_no_research_db_read`.
- The service calls `requireUser()` in the protected runtime path and returns a no-secret UI-safe preflight packet with `ownerAuthenticated`, `ownerProfileIdPresent`, `ownerProfileIdRedacted: true`, selected family/model, disabled adapter flags, and disabled Research runtime read flags.
- The proof explicitly records `runtimeRequireUserCallInThisSlice: true`, `ownerIdentitySource: requireUser().profileId`, `callerSuppliedOwnerIdAllowed: false`, `directThreadIdOnlyAccessAllowed: false`, `authProfileLookupMayOccur: true`, and `runtimeDbReadScope: research_owner_read_adapter_only`.
- The auth/Profile lookup boundary is explicit: `requireUser()` may resolve the authenticated Profile through the existing auth service, but BFF-012 performs no Research owner-read adapter query and does not expose Profile id, email, role, raw claims, cookies, tokens, or Prisma rows.
- Protected `/research/readiness` surfaces the issues service-authz runtime proof with status, identity source, redaction state, service authz mode, DB read scope, auth lookup boundary, row-level decisions, and `adapterExecutionAllowed: false` plus `runtimeDbReadEnabled: false`.
- Runtime flags stay false: `runtimeDbReadEnabled`, `runtimeDbWriteEnabled`, `runtimePrismaReadEnabled`, `adapterExecutionAllowed`, `routeHandlerEnabled`, `serverActionWriteEnabled`, `publicOutputEnabled`, `externalCollaborationEnabled`, `externalAgentDatabaseAccessAllowed`, `agentFinalWriteAllowed`, `externalRegisterable`, and `launchLevelUpgradeClaimed`.
- `scripts/check-research-owner-read-issues-service-authz-runtime.mjs` exists and is exposed as `pnpm research:read-issues-service-authz-runtime:check`.
- The checker verifies the runtime service, protected readiness page, BFF-011 dependency, no-secret owner preflight packet, disabled Research read/write flags, docs/task-memory markers, and no Prisma/db/provider/route/action/public/external expansion in the BFF-012 service.
- Existing Research chain checks remain passing: `pnpm research:read-issues-runtime-readiness:check`, `pnpm research:read-issues-adapter:check`, `pnpm research:read-adapter-runtime:check`, `pnpm research:read-adapter-mock:check`, `pnpm research:read-adapter-authz:check`, `pnpm research:read-query-plan:check`, `pnpm research:read-dto:check`, `pnpm research:model:check`, and `pnpm research:readiness:check`.
- The task does not add Research Prisma runtime reads, Research DB writes, schema/migration changes, seed changes, route handlers, server actions, public output, external collaboration, Research agent final writes, external agent database access, external registration, or launch-level claims.
- Follow-up routing is `RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF` unless `AUTH-005` or `WORK-009` prerequisites appear first.

## RESEARCH-BFF-013 Research Owner Read Issues Selected Field Runtime Adapter Proof Acceptance

- `src/lib/services/research-owner-read-issues-selected-field-runtime-adapter.service.ts` exists and defines `RESEARCH-BFF-013-RESEARCH-OWNER-READ-ISSUES-SELECTED-FIELD-RUNTIME-ADAPTER-PROOF` as the disabled selected-field runtime adapter proof gate after BFF-012 and before any live Research issues Prisma read.
- The service mode is `selected_field_runtime_adapter_proof_gate_no_live_research_read`.
- The proof consumes BFF-012 service-authz preflight status, BFF-011 runtime-readiness shape, BFF-010 mapper proof, and BFF-009 selected family decision.
- The proof records `serviceAuthzPreflightReady`, `ownerIdentitySource: requireUser().profileId`, `ownerScopePredicate: ResearchThread.ownerId equals requireUser().profileId`, selected scalar fields, `_count` relation keys for sources, concepts, and writingProjects, stable sort, default limit, `plannedPrismaOperation: prisma.researchThread.findMany`, `plannedWhere: where: { ownerId: ownerProfileId }`, and mapper handoff to `mapAuthorizedResearchIssueRowsToDtos`.
- Runtime flags stay false: `proofTargetReady: false`, `livePrismaReadAllowed: false`, `runtimeDbReadEnabled: false`, `runtimeDbWriteEnabled: false`, `runtimePrismaReadEnabled: false`, `adapterExecutionAllowed: false`, `routeHandlerEnabled: false`, `serverActionWriteEnabled: false`, `publicOutputEnabled: false`, `externalCollaborationEnabled: false`, `externalAgentDatabaseAccessAllowed: false`, `agentFinalWriteAllowed: false`, `externalRegisterable: false`, and `launchLevelUpgradeClaimed: false`.
- Protected `/research/readiness` surfaces the selected-field runtime adapter proof with task id, status, planned operation, owner predicate, selected scalar fields, relation counts, mapper handoff, owner-run criteria, row-level proof signals, disabled live-read flags, and unavailable fallback.
- `scripts/check-research-owner-read-issues-selected-field-runtime-adapter.mjs` exists and is exposed as `pnpm research:read-issues-selected-field-runtime-adapter:check`.
- The checker verifies the BFF-013 service, protected readiness page, BFF-012/BFF-011/BFF-010/BFF-009 chain markers, docs/task memory, package script, selected fields, relation counts, mapper handoff, no-secret owner-run criteria, and no Prisma/db/provider/route/action/public/external expansion in the BFF-013 service.
- Existing Research chain checks remain passing: `pnpm research:read-issues-service-authz-runtime:check`, `pnpm research:read-issues-runtime-readiness:check`, `pnpm research:read-issues-adapter:check`, `pnpm research:read-adapter-runtime:check`, `pnpm research:read-dto:check`, and `pnpm research:readiness:check`.
- The task does not add live Research Prisma reads, Research DB writes, schema/migration changes, seed changes, route handlers, server actions, public output, external collaboration, Research agent final writes, external agent database access, external registration, or launch-level claims.
- Follow-up routing is `LOOP-168-RESEARCH-POST-SELECTED-FIELD-ADAPTER-GAP-REVIEW` unless `AUTH-005` or `WORK-009` prerequisites appear first.

## RESEARCH-BFF-014 Research Owner Read Issues Live Read Proof Runner Contract Acceptance

- `RESEARCH-BFF-014-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-CONTRACT` defines a dry-run-first, no-secret proof-runner contract before the first owner-scoped live Research issues Prisma read.
- `src/lib/services/research-owner-read-issues-live-read-proof-runner.service.ts` exists and defines `live_read_proof_runner_contract_dry_run_no_live_research_read` without importing Prisma, db clients, provider clients, route helpers, cookies, headers, or environment values.
- The proof runner must consume BFF-013 selected-field proof, BFF-012 service-authz runtime proof, BFF-011 runtime-readiness shape, BFF-010 mapper proof, and BFF-009 selected-family decision.
- The runner records `ownerIdentitySource: requireUser().profileId`, `ownerScopePredicate: ResearchThread.ownerId equals requireUser().profileId`, proof target classification, selected scalar fields, `_count` relation keys, stable sort, default limit, mapper handoff to `mapAuthorizedResearchIssueRowsToDtos`, and UI-safe DTO output.
- Dry-run mode must be the default and must keep live Research Prisma reads disabled.
- Any future live-read proof path must require an explicit allow flag such as `PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ=1`, an explicit confirmation phrase such as `PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM=I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA`, and either `AUTH-005` evidence or explicit development mock auth owner identity proof.
- Any future live-read proof path must classify a safe owner-approved target through `PERSONAL_OS_RESEARCH_READ_PROOF_TARGET`; the BFF-014 contract records `proofTargetReady: false` and `ownerRunReady: false` until that evidence exists.
- The proof runner must refuse valuable or ambiguous production targets unless owner approval and target classification are explicit.
- Generated proof must not print Supabase URLs/keys, database URLs/hosts, cookies, tokens, raw claims, Profile ids, actual owner email values, raw Prisma rows, source bodies, or private Research content.
- Runtime/public/agent flags stay false unless a future explicitly selected task changes them with approval: `liveReadExecutionAllowed: false`, Research writes, route handlers, server actions, public output, external collaboration, `externalAgentDatabaseAccessAllowed: false`, Research agent final writes, external registration, and launch-level upgrade claims.
- Protected `/research/readiness` surfaces the proof-runner readiness state with task id, dry-run/live-read status, missing prerequisites, owner-run command template, required inputs, owner-run criteria, pass/fail signals, and stop conditions.
- `scripts/check-research-owner-read-issues-live-read-proof-runner.mjs` exists and is exposed as `pnpm research:read-issues-live-read-proof-runner:check`.
- The checker verifies the BFF-014 service, DTO wire-up, protected readiness page, BFF-013/BFF-012 chain markers, docs/task memory, package script, explicit owner-run inputs, disabled public/external/write/registration flags, and no Prisma/db/provider/route/action/env expansion in the BFF-014 service.
- Follow-up routing is `LOOP-170-LAUNCH-LEVEL-REVIEW` unless `AUTH-005` or `WORK-009` prerequisites appear first.
- Verification must include the new checker, BFF-013/BFF-012/BFF-011/BFF-010/BFF-009 chain checks, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse, and `git diff --check`.

## RESEARCH-BFF-015 Research Owner Read Issues Live Read Proof Runner Dry-Run CLI Acceptance

- `RESEARCH-BFF-015-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-PROOF-RUNNER-DRY-RUN-CLI` adds an owner-run no-secret CLI runner after the BFF-014 contract and before any live Research issues Prisma read.
- `scripts/run-research-owner-read-issues-live-read-proof-runner.mjs` exists and is exposed as `pnpm research:read-issues-live-read-proof-runner:run`.
- `scripts/check-research-owner-read-issues-live-read-proof-runner-dry-run-cli.mjs` exists and is exposed as `pnpm research:read-issues-live-read-proof-runner:dry-run:check`.
- The dry-run packet includes the selected task id, BFF-014/BFF-013/BFF-012 dependency status, selected family `issues`, selected model `ResearchThread`, owner identity source `requireUser().profileId`, owner scope predicate, selected scalar fields, `_count` relation keys, mapper output boundary, and next safe action.
- The runner classifies `PERSONAL_OS_RESEARCH_READ_PROOF_ALLOW_LIVE_READ=1`, `PERSONAL_OS_RESEARCH_READ_PROOF_CONFIRM=I_UNDERSTAND_THIS_READS_OWNER_RESEARCH_DATA`, `PERSONAL_OS_RESEARCH_READ_PROOF_TARGET`, and auth proof availability as booleans or safe categories only; it does not print raw values.
- The runner emits `dry_run_ready_no_live_research_read` when dependency markers are ready, writes optional no-secret JSON with `--json --out`, and keeps missing owner-run prerequisites visible as pass/fail rows.
- Generated proof must not print Supabase URLs/keys, database URLs/hosts, cookies, tokens, raw claims, Profile ids, actual owner email values, raw Prisma rows, source bodies, or private Research content.
- BFF-015 remains dry-run only: `liveReadExecutionAllowed: false`, `runtimePrismaReadEnabled: false`, `runtimeDbWriteEnabled: false`, route handlers, server actions, public output, external collaboration, `externalAgentDatabaseAccessAllowed: false`, Research agent final writes, external registration, and launch-level upgrade claims stay disabled.
- Verification includes `node --check` for the new scripts, `pnpm research:read-issues-live-read-proof-runner:run -- --json --out ...`, `pnpm research:read-issues-live-read-proof-runner:dry-run:check`, BFF-014/BFF-013/BFF-012 chain checks, JSON parse, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, and `git diff --check`.
- Stop before importing Prisma/db clients into the dry-run runner, connecting to a database, executing live Research reads, adding schema/migration/seed changes, expanding HTTP/API surfaces, or treating dry-run evidence as a formal launch proof.
- Follow-up routing is `RESEARCH-BFF-016-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-ELIGIBILITY-GATE` unless `AUTH-005` or `WORK-009` prerequisites appear first.

## RESEARCH-BFF-016 Research Owner Read Issues Live Read Eligibility Gate Acceptance

- `RESEARCH-BFF-016-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-ELIGIBILITY-GATE` combines BFF-015 dry-run packet evidence, BFF-014/BFF-013/BFF-012 chain status, sanitized auth proof availability, proof target classification, explicit allow flag, and owner confirmation into a machine-checkable decision before any live Research read is selected.
- `scripts/check-research-owner-read-issues-live-read-eligibility-gate.mjs` exists and is exposed as `pnpm research:read-issues-live-read-eligibility:check`.
- The gate remains no-live-read and does not import Prisma/db clients, connect to a database, expose route handlers/server actions, or claim formal launch readiness.
- The gate returns `eligible_for_separate_owner_approved_live_read_selection` only when AUTH-005-style owner/Profile proof, safe target classification, explicit allow flag, confirmation phrase, selected-field markers, mapper boundary, and no-secret packet rules are all present.
- The gate returns `manual_ops_required_owner_evidence_missing` when owner-run evidence is absent, and it preserves `liveReadExecutionAllowed: false`, `runtimePrismaReadEnabled: false`, `externalAgentDatabaseAccessAllowed: false`, and `externalRegisterable: false`.
- Verification includes `node --check`, BFF-015 dry-run packet parse, BFF-015 dry-run checker, BFF-014/BFF-013/BFF-012 checks, auth proof packet parse, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, and `git diff --check`.
- Follow-up routing is `RESEARCH-BFF-017-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-OWNER-APPROVAL-PACKET` if the gate is eligible, otherwise owner-run Manual Ops evidence remains the handoff.

## RESEARCH-BFF-017 Research Owner Read Issues Live Read Owner Approval Packet Acceptance

- `RESEARCH-BFF-017-RESEARCH-OWNER-READ-ISSUES-LIVE-READ-OWNER-APPROVAL-PACKET` should create the final owner approval packet for a future live Research issues read after BFF-016 returns `eligible_for_separate_owner_approved_live_read_selection`.
- The packet must still keep `liveReadExecutionAllowed: false` until a separate explicitly selected live-read task is approved.
- The packet must include selected fields, owner scope, target classification, sanitized auth evidence reference, rollback/stop criteria, no-secret policy, and human approval text.
- The packet must not import Prisma/db clients, connect to a database, execute live reads/writes, add routes/actions, expose public output, enable external collaboration, allow external agent database access, or claim launch-level upgrade.

## INTERFACE-001 Operable Module Interface Acceptance

- `ModuleOperatingShell` provides a shared five-surface module UI: overview, operation, Agent proposals, records/audit, and settings/boundaries.
- Finance, Chamber, Company, and Life each pass module-specific records, Agent proposals, audit rows, settings, overview copy, high-risk notes where applicable, and privacy boundaries.
- The shared shell supports search, status filtering, metrics, selected record details, operation queue selection, local draft creation, local Agent proposal approve/reject, and local settings toggles.
- Life preserves the existing `FitnessDashboard` inside the completed operating surface.
- Main module pages do not depend on placeholder-only copy such as "not enabled", "connect later", or "coming soon" to explain core functionality.
- Prototype interactions are explicitly marked as local UI state and do not pretend to be DB-backed.
- High-risk module actions for Finance, Life, Company, public output, external sharing, and external Agent collaboration remain locked or proposal-only.
- Client Components do not import Prisma clients, database clients, provider secrets, server request helpers, raw adapter payloads, or private identifiers.
- `INTERFACE-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, public output expansion, high-risk final writes, external collaboration, external agent database access, or external registration.

## INTERFACE-002 Interface Operability Smoke Acceptance

- `scripts/check-interface-operability.mjs` exists and is exposed as `pnpm interface:smoke:check`.
- The smoke harness verifies source files for frontstage, login, dashboard, settings, admin, agents, AI Input, Work, Research, Workflow, Finance, Chamber, Company, Life, and token-only Client Portal containment.
- The harness verifies `ModuleOperatingShell` still exposes overview, operation, Agent proposals, records/audit, and settings/boundaries surfaces.
- The harness verifies Finance, Chamber, Company, and Life still use `ModuleOperatingShell`, `ModuleGuard`, module-specific records, Agent proposals, audit rows, settings rows, and privacy/high-risk boundaries where applicable.
- The harness rejects placeholder regressions in the interface-first modules such as "coming soon", "not enabled", "connect later", "尚未啟用", and "稍後連接".
- The harness checks that interface-first module pages and the shared shell do not import Prisma, database clients, Supabase clients, server request helpers, or `process.env`.
- When `.next/server/app-paths-manifest.json` exists, the harness verifies the primary route graph from the latest build contains all required owner, module, agent, and Client Portal routes.
- `INTERFACE-002` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, public output expansion, token lifecycle writes, high-risk final writes, external collaboration, external agent database access, or external registration.

## SCENARIO-001 Scenario Journey Maturity Acceptance

- `src/lib/services/admin-readiness.service.ts` is server-only and exports a UI-safe `ScenarioJourneyContract`.
- `/admin` renders the full shared scenario journey table with scenario, actor, entry surface, current experience, missing experience, linked task, next action, and state.
- `/settings` renders an owner-facing scenario journey summary so member settings and admin scenario signals do not drift.
- The contract covers owner sign-in, daily command start, Work, AI Input, Research, Client Portal, agent command, high-risk module operation, Chamber relationship management, and admin operation scenarios.
- The contract converts scenario gaps into executable next tasks, with `SCENARIO-002` or `AUDIT-OPS-001` as the next no-proof fallback when auth/session and Work proof prerequisites remain absent.
- The contract exposes only safe readiness labels, scenario descriptions, task ids, next actions, and no-secret gap text.
- The contract does not expose raw private records, profile IDs, database URLs or hosts, Supabase URLs or keys, cookies, tokens, raw auth claims, raw generated report payloads, external registry writes, or agent provider secrets.
- Agent-related scenarios remain protected-only and internal; external registration stays blocked unless endpoint, auth, scopes, trust, rollback, public-safety review, and human approval are complete.
- `SCENARIO-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, admin mutations, high-risk module final writes, token lifecycle writes, or external agent registration.

## SCENARIO-002 Daily Command Center Runtime Slice Acceptance

- Loop 56 implementation: `/dashboard` now renders a protected Server Component backed by server-only `DailyCommandCenterContract` from `src/lib/services/admin-readiness.service.ts`.
- `/dashboard` provides a protected daily command surface that helps the owner choose the next useful action across Work, AI Input, agent command, admin proof, and blocked real-data paths.
- The surface uses server-loaded or static UI-safe contracts only; Client Components must not import Prisma clients, provider secrets, raw auth claims, raw generated report bodies, or adapter payloads.
- The first viewport shows the primary operating focus, not a marketing hero or decorative dashboard.
- Every action points to an existing protected route, proof command handoff, or proposal-only next task; unavailable actions must state the blocker.
- The slice may reuse `SCENARIO-001`, `DBS-005`, and `ARC-030` contracts, but it must not pretend mock/proposal data is DB-backed.
- Agent-related command rows remain internal/protected and dry-run/proposal-only unless endpoint, auth scopes, audit, trust, rollback, and human approval exist.
- `SCENARIO-002` does not add Prisma schema changes, migrations, seed changes, DB writes, public output expansion, token lifecycle writes, high-risk module final writes, autonomous agent writes, or external agent registration.

## OWNER-EVIDENCE-001 Owner evidence console Acceptance

- `src/lib/services/admin-readiness.service.ts` exports a server-only `OwnerEvidenceConsoleContract` and `OwnerEvidenceConsoleRow`.
- `/dashboard` renders a protected first-pass Owner evidence console that highlights the top owner-run proof checks.
- `/admin` renders the full Owner evidence console table with check, owner action, command/evidence target, pass signal, fail signal, blocker, and linked task.
- `/settings` renders an owner-control summary of the same contract so member settings and admin proof routing do not drift.
- Rows include `AUTH-005`, `WORK-009`, `OWNER-UI-REVIEW`, `DATTR-024`, and `DEPLOY-002`.
- Each row includes an exact owner command or review action, generated evidence target, pass/fail signal, blocker, and owner-safe status.
- `scripts/check-owner-evidence-console.mjs` exists and is exposed as `pnpm owner:evidence:check`.
- The console preserves no-secret boundaries: no Supabase URLs or keys, database URLs or hosts, cookies or tokens, raw auth claims, provider payloads, profile IDs, row IDs, raw generated report payload bodies, public client output expansion, production DB mutation, or external agent registration.
- `OWNER-EVIDENCE-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, high-risk module final writes, autonomous agent writes, persisted audit events, exports, or external agent registration.

## ADMIN-OPS-001 Launch Readiness History Contract Acceptance

- Loop 84 implementation: protected `/admin` and `/settings` now render the shared no-secret launch readiness history contract from `src/lib/services/admin-readiness.service.ts`.
- `src/lib/contracts/launch-readiness-history.contract.ts` exports a no-secret `LaunchReadinessHistoryContract` and row types for launch, auth, Work, deployment, owner-run UI, and admin/operator readiness history.
- `scripts/check-launch-readiness-history.mjs` exists and is exposed as `pnpm launch:history:check`.
- The contract reads generated proof packets and report references from `docs/2_agent-input/generated/agent-loop/reports/`, normalizes status per surface, and references relative paths only.
- The protected admin/settings integration shows latest status, historical attempts, blocker labels, next actions, and source proof paths without rendering raw JSON bodies or raw markdown report bodies.
- The checker validates that launch/auth/Work proof packets parse, required fields exist, blocked/ready/pass/fail states are classified, and no forbidden secret markers are exposed.
- `ADMIN-OPS-001` must not claim `L1` or `WORK-009` success from blocked proof packets, dry-run packets, or owner-run instructions.
- `ADMIN-OPS-001` does not add route handlers beyond existing protected surfaces, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, high-risk module final writes, autonomous agent writes, persisted audit events, exports, deployment provider mutations, or external agent registration.

## ADMIN-OPS-002 Launch Operator Action Registry Acceptance

- Loop 87 implementation: protected `/admin` and `/settings` now render the shared no-secret launch operator action registry from `src/lib/services/admin-readiness.service.ts`.
- `src/lib/contracts/launch-operator-action-registry.contract.ts` exports `LaunchOperatorActionRegistryContract`, `LaunchOperatorAction`, required action IDs, source references, and prohibited exposure rules.
- `scripts/check-launch-operator-action-registry.mjs` exists and is exposed as `pnpm launch:actions:check`.
- The registry covers launch proof, `AUTH-005`, `WORK-009`, `WORK-012` Docker disposable proof, deployment marker proof, owner UI review, `CLIENT-005` token lifecycle approval, `DATTR-024` AI Input persistence approval, and `AGENT-013` external registration approval.
- Every row shows actor, surface, state, mode, command or review action, evidence target, pass signal, fail signal, blocker, next action, linked task IDs, risk, DB write flag, external provider mutation flag, public-output flag, human approval flag, and no-secret boundary.
- State labels must distinguish `ready`, `owner_run`, `dry_run_only`, `approval_required`, `blocked`, and `unavailable`; high-risk approval rows must not appear as ready.
- `/admin` renders the full action table; `/settings` renders an owner-control summary so member/owner settings and admin operations do not drift.
- The checker validates required action IDs, page integration markers, package script exposure, docs/task records, and no-secret literal scans.
- `ADMIN-OPS-002` must not run shell commands from the web UI, add public route handlers, create server actions, edit Prisma schema, run migrations, seed data, write DB rows, mutate deployment providers, rotate/revoke client tokens, expand public output, execute connector runtimes, persist audit records, or register external agents.
- External agent registration remains `externalRegisterable=false` / `HUMAN_APPROVAL_REQUIRED` until endpoint, auth, trust, permission, public-safety, rollback, and owner approval evidence exist.

## WORK-014 Latest Work Proof Evidence Resolver Acceptance

- Loop 129 implementation: `WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER` adds a server-only no-secret latest Work proof evidence resolver in `src/lib/services/work-proof-evidence.service.ts`.
- `src/lib/contracts/work-proof-evidence.contract.ts` exports `WorkProofLatestEvidenceContract`, evidence family types, whitelisted generated proof directories, and prohibited exposure labels.
- `scripts/check-work-proof-evidence.mjs` exists and is exposed as `pnpm work:proof-evidence:check`.
- The resolver scans only whitelisted generated evidence directories and filename patterns for target-readiness, Docker disposable, local disposable, Work proof run, and source/static smoke packets.
- The contract reports latest relative packet paths, normalized statuses, freshness, stale/missing state, `canRunWork009`, Docker/local proof readiness flags, static source readiness, and next owner action without returning raw packet bodies.
- `WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER` must not execute shell commands, connect to DB, write DB rows, apply migrations, expose Supabase/database URLs or hosts, render raw auth/profile/project/task/note/deliverable IDs, expand public output, allow external agent database access, or register external agents.
- `WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER` must not claim `WORK-009`, `WORK-007`, `AUTH-005`, `DEPLOY-002`, `L1`, `L3`, or `L4` success from blocked, dry-run, stale, or owner-run packets.

## ADMIN-OPS-003 Work Proof Evidence Surface Acceptance

- Loop 131 implementation: protected `/admin` and `/settings` now render `ADMIN-OPS-003-WORK-PROOF-EVIDENCE-SURFACE` from `src/lib/services/admin-readiness.service.ts`.
- The surface uses `resolveWorkProofEvidence()` and the `WORK-014-LATEST-PROOF-EVIDENCE-RESOLVER` contract as its only Work proof evidence source.
- Protected `/admin` renders a full Work proof evidence table for overall latest evidence, target readiness, Docker disposable proof, local disposable proof, Work proof run, and Work source/static smoke.
- Protected `/settings` renders a compact owner-control summary with latest status, packet path, freshness, `canRunWork009`, and next owner action.
- The surface records the page requirement understanding score as `93/100` High and records three same-issue research optimization rounds before runtime UI edits.
- The UI may show relative generated evidence paths, normalized statuses, readiness booleans, freshness, and next owner/operator actions.
- The UI must not render raw generated JSON packet bodies, run shell commands, connect to DB, write DB rows, apply migrations, expose Supabase/database URLs or hosts, expose cookies/tokens/raw claims/private row IDs, mutate environment/provider/deployment state, expand public output, or register external agents.
- The UI must not claim `WORK-009`, `WORK-007`, `AUTH-005`, `DEPLOY-002`, `L1`, `L3`, or `L4` success unless the required proof packets exist.
- `scripts/check-work-proof-evidence.mjs` validates the protected admin/settings integration markers in addition to the underlying resolver.

## LAUNCH-ROUTER-001 Proof Preemption Router Acceptance

- Loop 132 implementation: `LAUNCH-ROUTER-001-PROOF-PREEMPTION-ROUTER` adds a no-secret latest-proof router contract in `src/lib/contracts/launch-proof-preemption-router.contract.ts`.
- `scripts/check-launch-proof-preemption-router.mjs` is exposed as `pnpm launch:preempt:check`.
- The router reads only whitelisted generated reports under `docs/2_agent-input/generated/agent-loop/reports` and selects the next candidate in this order: `AUTH-005`, `WORK-009`, `DEPLOY-002`, then `RES-001-RESEARCH-REVIEW`.
- `AUTH-005` may preempt only when latest auth proof reports `proofSummary.canRunAuth005=true`.
- `WORK-009` may preempt only when latest Work target/readiness evidence reports `canRunWork009=true`.
- `DEPLOY-002` may preempt only after auth and Work proof gates are ready and deployment marker evidence is present.
- If proof preemption is unavailable, the router must return `RES-001-RESEARCH-REVIEW` or another explicitly documented implementation fallback instead of rerunning adjacent evidence loops.
- The router may return relative generated evidence paths, candidate states, blocker labels, next actions, and no-secret safety flags.
- The router must not execute proof commands, fetch `/auth/status`, connect to DB, write DB rows, apply migrations, mutate auth/provider/deployment state, expose Supabase/database URLs or hosts, expose cookies/tokens/raw claims/private row IDs, render raw generated packet bodies, expand public output, or register external agents.
- The router must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, `L1`, `L3`, or `L4` success from blocked, stale, owner-run, or missing proof packets.

## ENV-003 Launch Owner Proof Plan Acceptance

- Loop 133 implementation: `ENV-003-LAUNCH-OWNER-PROOF-PLAN` adds a no-secret owner proof plan contract in `src/lib/contracts/launch-owner-proof-plan.contract.ts`.
- `scripts/check-launch-owner-proof-plan.mjs` is exposed as `pnpm launch:owner-plan:check`.
- The checker reads only whitelisted generated reports under `docs/2_agent-input/generated/agent-loop/reports`: latest launch proof, auth proof, Work proof target readiness, launch preemption router, and Manual Ops gate packets.
- The plan must produce stable steps for Supabase public env, signed-in `/auth/status` evidence, Work proof target readiness, disposable Work proof run, deployment marker proof, and next-loop routing.
- Every step must include owner action, command, generated evidence target, pass signal, blocker labels, and stop condition.
- The plan may show relative generated evidence paths, command templates, env var names, safe blocker labels, current readiness booleans, router recommendation, and no-secret safety flags.
- The plan must not execute proof commands, fetch `/auth/status`, connect to DB, write DB rows, apply migrations, mutate environment variables, mutate auth/provider/deployment state, expose Supabase/database URLs or hosts, expose cookies/tokens/raw claims/private row IDs, render raw generated packet bodies, expand public output, or register external agents.
- The plan must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, `L1`, `L3`, or `L4` success from blocked, stale, owner-run, or missing proof packets.

## ENV-004 Launch Proof Freshness Gate Acceptance

- Loop 134 implementation: `ENV-004-LAUNCH-PROOF-FRESHNESS-GATE` adds a no-secret proof freshness contract in `src/lib/contracts/launch-proof-freshness-gate.contract.ts`.
- `scripts/check-launch-proof-freshness-gate.mjs` is exposed as `pnpm launch:freshness:check`.
- The checker reads only generated JSON report filenames and parseable top-level statuses under `docs/2_agent-input/generated/agent-loop/reports`; it must not render raw generated packet bodies.
- The checker must identify the target loop from `loop-state.json` or `--loop` and verify current-loop packets for launch proof, auth proof, Work proof target readiness, launch preemption routing, and owner proof plan.
- The checker must return `proof_refresh_required` when launch/auth/Work target packets are older than the target loop, when preemption is older than the target loop, when owner-plan is older than the target loop, or when owner-plan was generated before the current-loop preemption packet.
- The checker must output ordered refresh commands in this order: `pnpm launch:proof`, `pnpm auth:proof`, `pnpm work:proof-target:check`, `pnpm launch:preempt:check`, then `pnpm launch:owner-plan:check`.
- The checker may show relative generated evidence paths, loop numbers, packet statuses, safe blocker labels, command templates, and no-secret safety flags.
- The checker must not execute proof commands, fetch `/auth/status`, connect to DB, write DB rows, apply migrations, mutate environment variables, mutate auth/provider/deployment state, expose Supabase/database URLs or hosts, expose cookies/tokens/raw claims/private row IDs, expand public output, or register external agents.
- The checker must not claim `AUTH-005`, `WORK-009`, `WORK-007`, `DEPLOY-002`, `L1`, `L3`, or `L4` success from blocked, stale, owner-run, or missing proof packets.
- Launch readiness history must match exact proof-family filenames for `*-launch-proof.json`, `*-auth-proof.json`, and `*-work-proof-target-readiness.json`; it must not classify meta packets such as `launch-proof-freshness-gate.json` as formal launch proof.

## WORK-015 Work Detail Adjunct Mock Boundary Acceptance

- `WORK-015-WORK-DETAIL-ADJUNCT-MOCK-GATE` must inspect the Work detail AI pulse/timeline adjunct mock data path before runtime edits.
- Formal Work CRUD state must remain visually primary and must not imply adjunct AI pulse/timeline mock data is persisted Work proof.
- The implementation may label, gate, demote, or replace adjunct mock areas with explicit prototype/unavailable state, while preserving the protected Work detail actor journey.
- Loop 136 implementation adds explicit `WORK-015-ADJUNCT-MOCK-GATE` and `WORK-015-FORMAL-CRUD-ONLY` UI boundary markers, and formal Work notes do not consume the adjunct mock AI timeline prop.
- The task must not add DB writes, schema changes, migrations, provider calls, public output, high-risk final writes, or launch-level claims.
- Verification should include `pnpm work:source:check`, `pnpm interface:smoke:check`, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse where applicable, and `git diff --check`.

## WORK-016 Work Detail Client Draft Proposal Gate Acceptance

- `WORK-016-WORK-DETAIL-CLIENT-DRAFT-PROPOSAL-GATE` must inspect the Work detail Client tab, Client Portal BFF/public-output docs, and existing source checker before runtime edits.
- The protected Work detail Client tab must show a visible Client Portal publish gate that separates protected owner review from token-only public Client Portal output.
- A copyable Client Portal share link is available in protected Work detail only when `project.visibility === "client_shared"` and a token exists.
- When a token exists but the project remains internal, protected Work detail must show an internal-mode boundary instead of a copyable public-style share control.
- AI-generated client update content from `publicOutput` must be labeled as proposal-only human-review draft and must not imply automatic publication to `/client/[token]`.
- The Work source smoke checker must verify the Client Portal publish gate, internal-mode share gate, and proposal-only client draft markers.
- `WORK-016` must not add route handlers, server actions, token lifecycle writes, schema changes, migrations, DB writes, public output expansion, storage/file URL rendering, provider calls, external registration, or launch-level claims.
- Verification should include `node --check scripts/check-work-db-source-smoke.mjs`, `pnpm work:source:check`, `pnpm interface:smoke:check`, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse where applicable, and `git diff --check`.

## WORK-017 Work Detail Client Share Review Checklist Acceptance

- `WORK-017-WORK-DETAIL-CLIENT-PUBLISH-REVIEW-CHECKLIST` must inspect `RPT-038`, the existing Work detail Client tab, Client Portal BFF/public-output docs, and the Work source checker before runtime edits.
- The protected Work detail Client tab must show a visible owner pre-share checklist before or near share actions.
- Checklist rows must distinguish pass, warning, and blocked states for project visibility, token presence, client-visible task/deliverable counts, AI client draft proposal state, public-output boundary, and next safe owner action.
- The checklist must not imply that AI `publicOutput` drafts are published; AI client update content remains proposal-only human-review material.
- The copyable Client Portal share link remains available only when `project.visibility === "client_shared"` and a token exists.
- Internal-mode projects with a token must keep the internal-mode boundary instead of rendering a public-style share entrance.
- The Work source smoke checker must verify the `WORK-017` checklist marker and the continued `WORK-016` share/draft gates.
- `WORK-017` must not add route handlers, server actions, token lifecycle writes, schema changes, migrations, DB writes, public output expansion, storage/file URL rendering, provider calls, external agent access, external registration, or launch-level claims.
- Verification should include `node --check scripts/check-work-db-source-smoke.mjs`, `pnpm work:source:check`, `pnpm interface:smoke:check`, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, JSON parse where applicable, and `git diff --check`.
- Loop 139 implementation: protected Work detail Client tab renders `WORK-017-CLIENT-SHARE-REVIEW-CHECKLIST` with marker rows for visibility, token, client-visible records, AI draft proposal state, and next safe action. `scripts/check-work-db-source-smoke.mjs` verifies the new marker and keeps `WORK-016` share/draft gates required.

## BACKEND-OPS-001 Backend Operation Catalog Acceptance

- Loop 94 implementation: `src/lib/contracts/backend-operation-catalog.contract.ts`, `scripts/check-backend-operation-catalog.mjs`, and `pnpm backend:ops:check` provide the first protected/no-secret catalog slice.
- `src/lib/contracts/backend-operation-catalog.contract.ts` exports a no-secret `BackendOperationCatalogContract`.
- The catalog covers operation kinds distinctly: route handler, server action, service loader, CLI/check command, agent dry-run operation, owner-run proof command, proposal-only operation, and blocked high-risk operation.
- Required rows include launch proof, auth proof, Work target readiness, Work Docker proof, Work server actions, Client Portal gated loader, protected agent dry-run API, module resource index checker, real-data matrix checker, launch operator action checker, and external registration approval blocker.
- Every row records operation id, module, owner surface, endpoint/action/command label, current state, auth boundary, DTO/data boundary, audit need, idempotency or retry stance, risk, verification command, linked task, and stop condition.
- High-risk modules and public-output operations must remain `blocked` or `approval_required` unless their explicit approval gates are complete.
- External agent registration remains `externalRegisterable=false` and `HUMAN_APPROVAL_REQUIRED`.
- `scripts/check-backend-operation-catalog.mjs` exists and is exposed as `pnpm backend:ops:check`.
- The checker validates required operation ids, package script exposure, docs/task records, no-secret exclusions, and absence of forbidden secret-like literals.
- If integrated into protected `/admin` or `/settings`, the UI renders summaries and safe labels only; it must not render raw request/response payloads, generated proof bodies, private row ids, env values, database URLs, cookies, tokens, or provider secrets.
- `BACKEND-OPS-001` does not add public OpenAPI output, new route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, deployment provider mutations, public output expansion, high-risk final writes, autonomous agent execution, external agent database access, or external registration.

## BACKEND-OPS-002 Protected Backend Operation Catalog Surface Acceptance

- Loop 96 implementation: `src/lib/services/admin-readiness.service.ts`, protected `/admin`, protected `/settings`, and `scripts/check-backend-operation-catalog.mjs` now provide the protected/no-secret admin/settings surface.
- Protected `/admin` and `/settings` render a no-secret summary of `BACKEND_OPERATION_CATALOG`.
- `/admin` may show operation counts, operation kinds, high-risk blockers, auth/data/audit/idempotency boundary summaries, verification commands, and next owner/operator actions.
- `/settings` may show a compact owner-control summary with current backend operation readiness, blocked proof prerequisites, and external registration disabled.
- The UI must distinguish route handler, server action, service loader, CLI/check command, agent dry-run operation, owner-run proof command, proposal-only operation, and blocked high-risk operation kinds.
- High-risk or public-output rows must remain visibly `blocked` or `approval_required`.
- External agent registration remains `externalRegisterable=false` and `HUMAN_APPROVAL_REQUIRED`.
- Page-level requirement understanding is high at 86/100 in `RPT-020`; loop 96 completed 3 same-issue research optimization rounds before runtime UI edits and records the selected/rejected patterns in the evidence report and `BACKEND-OPS-002` surface contract.
- Verification must include `pnpm backend:ops:check`, `pnpm launch:actions:check`, `pnpm owner:evidence:check`, `pnpm exec tsc --noEmit --pretty false`, `pnpm db:validate`, JSON parse where new proof packets are written, and `git diff --check`.
- `BACKEND-OPS-002` must not add public OpenAPI output, route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, provider calls, shell command execution, public output expansion, high-risk final writes, autonomous agent execution, external agent database access, or external registration.

## REALDATA-001 Per-Module Real-Data Migration Matrix Acceptance

- `docs/02_architecture-and-rules/DBS-005_per-module-real-data-migration-matrix.md` exists as the canonical per-module mock/demo/formal/DB to real-data migration matrix.
- `src/lib/contracts/module-real-data-matrix.contract.ts` exports `REAL_DATA_MIGRATION_MATRIX` and `REAL_DATA_MIGRATION_MATRIX_SUMMARY`.
- The matrix covers Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.
- Every module row names current state, current source, next data object, BFF route/action or service boundary, authz boundary, audit need, acceptance proof, stop condition, next task, risk, public exposure, and human-approval need.
- Work remains the proof-first DB-backed path through `WORK-009` and `WORK-007`.
- High-risk modules keep final writes blocked or human-approval-required before Life, Finance, Company, Client Portal, public output, external collaboration, or agent final writes.
- Client Portal remains token-gated/fail-closed and the matrix does not expand public payloads.
- Agent Team OS remains protected/internal; external registration remains blocked until endpoint, auth, trust, rollback, and human approval exist.
- `scripts/check-module-real-data-matrix.mjs` exists and is exposed as `pnpm module:realdata:check`.
- `pnpm module:realdata:check` writes a no-secret proof packet and validates required module keys, required matrix markers, referenced docs, coverage density, and absence of runtime/env/provider/database/network markers in the contract source.
- `REALDATA-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, admin mutations, connector runtime, high-risk module final writes, autonomous agent writes, or external agent registration.

## AUDIT-OPS-001 Operating Audit Event Contract Acceptance

- `docs/02_architecture-and-rules/DBS-006_operating-audit-event-schema-contract.md` exists as the canonical cross-module append-only operating audit event schema and BFF contract proposal.
- `src/lib/contracts/operating-audit-event.contract.ts` exports `OPERATING_AUDIT_EVENT_FIELDS`, `OPERATING_AUDIT_EVENT_FAMILIES`, `OPERATING_AUDIT_BFF_CONTRACT`, and `OPERATING_AUDIT_CONTRACT_SUMMARY`.
- The contract covers Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, Agent Team OS, Auth, Admin, Settings, and Deployment operating surfaces.
- Event fields cover actor, action, target, result, risk, approval, source, agent, proposal, proof, redaction, retention, and future tamper-evidence fields.
- Event families cover auth/session proof, Work mutations/proof, AI Input source workflow/proposals, agent operations, Client Portal public access/token lifecycle, high-risk module proposals, and admin/operator evidence.
- The future BFF read surface is protected owner/admin only and allows only redacted list/detail DTOs with filters for time range, actor type, module, action, result, risk, approval, and source kind.
- DTOs must not expose raw provider claims, internal profile identifiers, cookies, session secrets, token verifier values, database connection strings or hostnames, raw network/browser values, private report bodies, raw adapter payloads, private source material, or public Client Portal token secrets.
- `scripts/check-operating-audit-contract.mjs` exists and is exposed as `pnpm audit:ops:check`.
- `pnpm audit:ops:check` writes a no-secret proof packet and validates required fields, event families, module/surface coverage, referenced docs, no-write boundaries, redaction, retention, tamper-evidence markers, and absence of runtime/env/provider/database/network markers in the contract source.
- `AUDIT-OPS-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, admin mutations, high-risk module final writes, autonomous agent writes, exports, or external agent registration.

## AUDIT-OPS-002 Operating Audit Readiness Catalog Acceptance

- `src/lib/contracts/operating-audit-readiness-catalog.contract.ts` exports `OPERATING_AUDIT_READINESS_CATALOG`, `OPERATING_AUDIT_READINESS_REQUIRED_EVENT_FAMILIES`, and `OPERATING_AUDIT_READINESS_CONTRACT`.
- The operating audit readiness catalog maps 13 backend operation catalog rows and 10 per-module agent command rows to future `AUDIT-OPS-001` event families.
- The mapped event families include `auth.session`, `work.mutation`, `ai-input.source-workflow`, `agent.operation`, `client-portal.public-access`, `high-risk.proposal`, and `admin.operator`.
- Each row names operation id, operation surface, label, target module, owner surface, current runtime state, event family, related event families, event actions, expected results, source kind, risk, approval level, verification command, source refs, and stop condition.
- Every row keeps `runtimeAuditWriteAllowed=false`, `schemaMigrationAllowed=false`, `publicOutputAllowedByThisTask=false`, `directDatabaseAccessByExternalAgents=false`, and `externalRegisterable=false`.
- High-risk rows keep human approval boundaries for AI Input source workflow, Life, Finance, Company, Client Portal, external registration, and Agent Team OS external readiness.
- `scripts/check-operating-audit-readiness-catalog.mjs` exists and is exposed as `pnpm audit:readiness:check`.
- `pnpm audit:readiness:check` writes a no-secret proof packet and validates required operation ids, required event families, package/docs markers, referenced support sources, row-level no-write guards, no-secret markers, no route/server-action expansion, no runtime imports, no public-output expansion, and no external registration.
- `AUDIT-OPS-002` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, admin mutations, high-risk final writes, autonomous agent execution, external agent database access, persisted audit rows, exports, or external registration.

## AUDIT-OPS-003 Operating Audit Event Envelope Builder Acceptance

- A server-only operating audit event envelope builder creates redacted draft event envelopes from the `AUDIT-OPS-002` operation-to-family mapping before any persisted audit writer exists.
- The builder accepts only safe operation ids, actor/source/target/result/risk/approval values, relative proof refs, safe labels, and redacted metadata.
- The builder rejects or redacts raw provider claims, cookies, tokens, Supabase keys, database URLs, database hosts, raw network addresses, raw browser strings, raw adapter payloads, private report bodies, public Client Portal token secrets, private source material, row bodies, and external agent database context.
- Generated draft envelopes include the `AUDIT-OPS-001` fields needed for future persistence: actor type, module/action, target type, result, risk, approval, source kind/ref, agent/operation ref, proposal/proof refs, redaction version, retention class, and future integrity placeholders.
- `scripts/check-operating-audit-event-builder.mjs` exists and is exposed as `pnpm audit:event-builder:check`.
- `pnpm audit:event-builder:check` validates builder contract markers, all required event families, representative backend and agent operation drafts, no-secret redaction, no DB/provider/env/network/runtime imports, no route/server-action additions, no Prisma schema changes, and no external registration.
- `AUDIT-OPS-003` must remain server-only, pure/no-write, and non-persistent. It must not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, admin mutations, high-risk final writes, autonomous agent execution, external agent database access, persisted audit rows, exports, or external registration.

## AUDIT-OPS-004 Operating Audit Storage Review Acceptance

- `src/lib/contracts/operating-audit-storage-review.contract.ts` exports `OPERATING_AUDIT_STORAGE_REVIEW_REQUIRED_IDS`, `OPERATING_AUDIT_STORAGE_REVIEW_ITEMS`, and `OPERATING_AUDIT_STORAGE_REVIEW_CONTRACT`.
- The operating audit storage review contract covers model review, index review, service-layer authorization, append-only writer boundary, redacted read DTOs, retention/export/purge policy, hash-chain/integrity review, disposable proof target, migration stop conditions, and Manual Ops upgrade boundary.
- Each review item includes id, area, status, label, required decision, selected pattern, rejected alternatives, source refs, acceptance gate, verification, stop condition, risk, human-approval need, and no-write/no-route/no-public/no-external-registration guards.
- The contract references local audit artifacts plus official/primary sources for secure logging, Prisma migrations, Supabase RLS, and PostgreSQL row security.
- `scripts/check-operating-audit-storage-review.mjs` exists and is exposed as `pnpm audit:storage-review:check`.
- `pnpm audit:storage-review:check` validates required review ids, support docs, package markers, storage review coverage, no-secret scans, no runtime imports, no route/server-action expansion, no Prisma/DB/provider/network calls, no public-output expansion, no persisted audit rows, and no external registration.
- `AUDIT-OPS-004` keeps formal launch level unchanged: `M1_MANUAL_OPS_READY` may remain conditional, but no L1/L3/L4 claim is valid until owner/operator evidence exists.
- `AUDIT-OPS-004` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, token lifecycle writes, admin mutations, high-risk final writes, autonomous agent execution, external agent database access, persisted audit rows, exports, provider calls, network calls, or external registration.

## MANUAL-OPS-001 Conditional Manual Ops Launch Gate Acceptance

- `pnpm launch:manual-ops` creates a no-secret Manual Ops proof packet that explains why formal launch level cannot upgrade yet.
- The packet includes formal launch level, conditional Manual Ops level, no-upgrade reasons, source check status, and one row per owner/operator action.
- When all remaining blockers are manual evidence tasks, the packet may report `M1_MANUAL_OPS_READY` while keeping formal `launchLevels.current` below `L1`.
- Manual Ops rows must include command, evidence target, pass/fail signal, risk, write flag, approval flag, and secret policy.
- `M1_MANUAL_OPS_READY` must not claim `AUTH-005`, `WORK-007`, `WORK-009`, `DEPLOY-002`, `L1`, `L3`, or `L4`.
- The checker must not print Supabase URLs/keys, database URLs/hosts, cookies, tokens, raw claims, profile IDs, row IDs, client tokens, provider payloads, Docker socket paths, or external registry credentials.

## L3-CONDITIONAL-001 Conditional L3 Viewframe Research Acceptance

- `docs/07_research-and-design/RES-005_conditional-l3-interface-scenario-architecture-gap-research.md` exists and is indexed in `MAN-001`.
- `RES-005` defines interface, scenario, and architecture viewframes for conditional L3 product maturity.
- `RES-005` records local source review, external reference review, page-understanding score, three research optimization rounds, selected patterns, rejected alternatives, and executable task shapes.
- Conditional product maturity must stay separate from formal launch level. Formal `launchLevels.current` remains below L1 until `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence exists.
- Conditional maturity labels such as `C0_RESEARCH_READY`, `C1_INTERFACE_MATRIX_READY`, `C2_SCENARIO_ROUTES_READY`, `C3_ARCHITECTURE_GATE_READY`, and `C-L3_CONDITIONAL_FULL_EXPERIENCE` must not claim formal L1/L3/L4.
- `L3-UI-001`, `L3-SCENARIO-001`, and `L3-ARCH-001` are represented as executable backlog rows with scope, acceptance, verification, risks, and stop conditions.
- Manual setup blockers remain Manual Ops rows and may guide next owner actions without blocking product-maturity work.
- `L3-CONDITIONAL-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, public output expansion, high-risk final writes, autonomous execution, external agent database access, provider calls, deployment mutation, or external registration.

## L3-UI-001 Conditional L3 Interface Completeness Matrix Acceptance

- `src/lib/contracts/conditional-l3-interface-matrix.contract.ts` exports `CONDITIONAL_L3_INTERFACE_MATRIX`, `CONDITIONAL_L3_REQUIRED_SURFACE_IDS`, and `CONDITIONAL_L3_INTERFACE_MATRIX_SUMMARY`.
- `CONDITIONAL_L3_INTERFACE_MATRIX` covers frontstage, login, dashboard, settings, admin, Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agents.
- Every surface row records route, actor, surface kind, current mode, data state, protected boundary, primary job, current strength, source refs, next task, and `missingCriticalForConditionalL3`.
- Every surface row is assessed against the interface viewframe: identity/mode, primary action, resource or workbench, command path, detail or inspection, agent workspace, records or readiness, settings or boundaries, state label, mobile/desktop operability, and no-secret boundary.
- `C1_INTERFACE_MATRIX_READY` is only conditional product maturity. Formal `launchLevels.current` remains `L0_LOCAL_PROTOTYPE` until `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence exists.
- `scripts/check-conditional-l3-interface-matrix.mjs` exists and is exposed as `pnpm l3:interface:check`.
- `pnpm l3:interface:check` validates required surface ids, route source files, viewframe field density, package/docs markers, critical-gap rows, no-secret/static boundaries, and the continuing Manual Ops blockers.
- `pnpm interface:smoke:check` remains the baseline route/source operability proof and should be run with the L3 interface checker before claiming C1.
- `L3-UI-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, provider calls, public output expansion, high-risk final writes, autonomous execution, external agent database access, or external registration.

## L3-SCENARIO-001 Conditional L3 Scenario Route Map Acceptance

- `src/lib/contracts/conditional-l3-scenario-route-map.contract.ts` exports `CONDITIONAL_L3_SCENARIO_ROUTE_MAP`, `CONDITIONAL_L3_REQUIRED_SCENARIO_ROUTE_IDS`, and `CONDITIONAL_L3_SCENARIO_ROUTE_MAP_SUMMARY`.
- `CONDITIONAL_L3_SCENARIO_ROUTE_MAP` covers owner access, daily command, Work operation, source-to-Work, research-to-decision, chamber opportunity, high-risk review, agent command, and admin/manual-ops scenario routes.
- Every scenario route records trigger, actor, entry surface, data source, action path, agent proposal path, output, audit/proof path, next task, Manual Ops handoff, source refs, and `missingCriticalForC2`.
- `C2_SCENARIO_ROUTES_READY` is only conditional product maturity. Formal `launchLevels.current` remains `L0_LOCAL_PROTOTYPE` until `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence exists.
- `scripts/check-conditional-l3-scenario-route-map.mjs` exists and is exposed as `pnpm l3:scenario:check`.
- `pnpm l3:scenario:check` validates required route ids, source route files, route field density, docs/task markers, critical-gap rows, no-secret/static boundaries, and the continuing Manual Ops blockers.
- `pnpm owner:evidence:check`, `pnpm launch:actions:check`, and `pnpm l3:interface:check` remain supporting proofs before relying on the scenario map for C2.
- `L3-SCENARIO-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, provider calls, public output expansion, high-risk final writes, autonomous execution, external agent database access, or external registration.

## L3-ARCH-001 Conditional L3 Architecture Claim Gate Acceptance

- `src/lib/contracts/conditional-l3-architecture-claim-gate.contract.ts` exports `CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE`, `CONDITIONAL_L3_REQUIRED_ARCHITECTURE_GATE_IDS`, and `CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE_SUMMARY`.
- `CONDITIONAL_L3_ARCHITECTURE_CLAIM_GATE` covers interface viewframe, scenario route map, formal launch proof, Manual Ops handoff, BFF/API/CLI boundary, auth/permission boundary, persistence boundary, audit/observability boundary, agent protocol boundary, public output boundary, deployment boundary, and owner review boundary.
- Every architecture gate row records architecture boundary, current evidence, C3 requirement, conditional C3 blocker state, formal launch blocker state, conditional full-experience blocker state, Manual Ops handoff, next task, source refs, and static safety flags.
- `C3_ARCHITECTURE_GATE_READY` is only conditional product maturity. Formal `launchLevels.current` remains `L0_LOCAL_PROTOTYPE` until `AUTH-005`, `WORK-009` or `WORK-007`, and `DEPLOY-002` evidence exists.
- `C-L3_CONDITIONAL_FULL_EXPERIENCE` remains blocked by owner visual/operability review until the owner checks the protected app surfaces directly.
- `scripts/check-conditional-l3-architecture-claim-gate.mjs` exists and is exposed as `pnpm l3:architecture:check`.
- `pnpm l3:architecture:check` validates required architecture gate ids, claim-separation fields, docs/task markers, no-secret/static boundaries, formal launch claim blockers, and the owner-review gate before C-L3.
- `pnpm launch:manual-ops`, `pnpm l3:interface:check`, and `pnpm l3:scenario:check` remain supporting proofs before relying on the architecture gate for C3.
- `L3-ARCH-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, provider calls, public output expansion, formal launch level mutation, high-risk final writes, autonomous execution, external agent database access, or external registration.

## L3 Conditional Product Maturity Follow-Up Acceptance

- `L3-UI-001` must use existing surfaces and `pnpm interface:smoke:check` as its baseline before adding any protected matrix/checker.
- `L3-SCENARIO-001` must map core scenario routes as trigger, actor, entry, data source, action, agent proposal, output, audit/proof, next task, and Manual Ops state.
- `L3-ARCH-001` must make formal launch level, conditional Manual Ops level, and conditional product maturity level machine-checkable without upgrading formal launch claims.
- Follow-up tasks must stop before high-risk final writes, public private-data output, schema/migration apply, provider mutation, autonomous agent execution, external agent database access, or external registration unless explicit human approval and proof prerequisites exist.

## DATTR-024-SPLIT AI Input Source Workflow BFF Split Acceptance

- `docs/02_architecture-and-rules/ARC-031_ai-input-source-workflow-bff-split-contract.md` exists as the canonical split contract before full AI Input source workflow persistence.
- `src/lib/contracts/ai-input-source-workflow-split.contract.ts` exports `AI_INPUT_SOURCE_WORKFLOW_SPLIT_CONTRACT`, `AI_INPUT_SOURCE_WORKFLOW_SPLIT_SLICES`, and `AI_INPUT_SOURCE_WORKFLOW_SPLIT_SUMMARY`.
- The split covers `DATTR-024A` protected read DTO, `DATTR-024B` schema review, `DATTR-024C` disposable proof target, `DATTR-024D` owner-reviewed proposal actions, `DATTR-024E` connector consent/revoke/provider-event boundary, and `DATTR-024F` service authorization/BFF operation boundary.
- Required future objects are named before persistence: `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- The BFF contract requires a Server Component loader, `requireUser()`, service-layer authorization, UI-safe mappers, and explicit formal-mode unavailable/empty state before any real persistence.
- Formal mode must not fall back to hidden mock source connectors, hidden mock workflow rows, fake source records, fake provider state, fake proposal records, or fake persisted writes.
- All future source workflow reads, proof runs, proposal decisions, and connector consent changes map to `AUDIT-OPS-001`, especially the `ai-input.source-workflow` event family.
- Agent-related source workflow capabilities remain protected-owner visible or internal proposal-only; `externalRegisterable` stays false and external agents receive no direct data-store access.
- `scripts/check-ai-input-source-workflow-split.mjs` exists and is exposed as `pnpm ai-input:split:check`.
- `pnpm ai-input:split:check` writes a no-secret proof packet and validates split markers, required objects, official source references, audit mapping, stop conditions, referenced docs, and absence of runtime/env/provider/database/network markers in the contract source.
- `DATTR-024-SPLIT` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, public output expansion, high-risk module final writes, autonomous agent writes, exports, or external agent registration.

## DATTR-024A AI Input Source Workflow Formal Read DTO Acceptance

- `src/types/ai-input-readiness.ts` defines a `DATTR-024A` `AIInputSourceWorkflowReadContract` nested under the formal readiness contract.
- `src/lib/services/ai-input-readiness.service.ts` returns a server-only `sourceWorkflow` DTO with six formal read-model objects: `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `DataUnitProposal`, and `ModuleWriteIntent`.
- The DTO exposes protected empty/unavailable state, BFF boundary text, `hiddenMockFallback: false`, `ai-input.source-workflow` audit family, and `DATTR-024B` as the next runnable schema-review slice.
- `/ai-input` formal mode renders the source workflow read model in the sync settings surface and workflow console instead of hidden mock connector rows, hidden mock workflow rows, fake source records, fake provider consent state, or fake proposal records.
- `pnpm ai-input:split:check` validates both the split contract and the DATTR-024A service/client markers and reports `DATTR-024B` as the next runnable slice after DATTR-024A passes.
- `DATTR-024A` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, public output expansion, high-risk module final writes, autonomous agent writes, exports, or external agent registration.

## DATTR-024B AI Input Source Workflow Schema Review Packet Acceptance

- `docs/02_architecture-and-rules/SCH-003_ai-input-source-workflow-schema-review.md` exists as the canonical proposal-only schema review packet before any AI Input Source Workflow migration.
- `src/lib/contracts/ai-input-source-workflow-schema-review.contract.ts` exports `AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_OBJECTS`, `AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_MIGRATION_PLAN`, and `AI_INPUT_SOURCE_WORKFLOW_SCHEMA_REVIEW_SUMMARY`.
- The schema review names and reconciles seven required objects: `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- Each object names proposed table scope, `ownerProfileId` ownership, `requireUser()` and service-layer authorization boundaries, retention/redaction needs, `ai-input.source-workflow` audit mapping, recommended indexes, dependencies, proof needs, and stop conditions.
- The packet preserves official-source-informed migration and proof rules for Prisma create-only review, production migration deploy behavior, transaction duration, Supabase RLS, Supabase Vault/secret separation, and PostgreSQL FK/index planning.
- `scripts/check-ai-input-source-workflow-schema-review.mjs` exists and is exposed as `pnpm ai-input:schema-review:check`.
- `pnpm ai-input:schema-review:check` validates the seven required objects, official source references, safety guards, acceptance/backlog markers, no applied Prisma models during the original `DATTR-024B` slice, and later recognizes the `DATTR-024H-MIGRATION-DRAFT` materialization as an intentional follow-up instead of a schema-review regression.
- `DATTR-024B` does not edit Prisma schema, create or apply migrations, add route handlers, add server actions, seed data, read or write the database, run connector runtime, expose public output, enable high-risk module final writes, grant external agent database access, or make any agent surface externally registerable.

## DATTR-024C AI Input Source Workflow Proof Target Boundary Acceptance

- `docs/08_acceptance-and-qa/ACC-006_ai-input-source-workflow-proof-target.md` exists as the canonical disposable/local proof target boundary before any AI Input Source Workflow proof writes.
- `src/lib/contracts/ai-input-source-workflow-proof-target.contract.ts` exports `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_OBJECTS`, `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_ENV`, `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_REQUIREMENTS`, `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SEQUENCE`, and `AI_INPUT_SOURCE_WORKFLOW_PROOF_TARGET_SUMMARY`.
- The proof target contract names all seven required objects: `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- The contract defines target classification, write confirmations, migration boundary, data isolation, cleanup/rollback, audit proof, no-secret output, RLS/authz, transaction behavior, and stop conditions.
- Future proof writes require `AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL`, `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1`, `PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA`, safe local/disposable target classification, and explicit remote disposable approval when remote.
- The proof packet must not print database URLs, database hosts, credentials, Supabase keys, cookies, tokens, raw claims, profile IDs, row IDs, provider payloads, raw adapter payloads, source file bodies, private source material, or user data.
- `scripts/check-ai-input-source-workflow-proof-target.mjs` exists and is exposed as `pnpm ai-input:proof-target:check`.
- `pnpm ai-input:proof-target:check` validates `ACC-006`, the proof target contract, `ARC-031`, `SCH-003`, this acceptance section, `PLN-060`, `package.json`, required official references, required objects, and no-write safety markers.
- `DATTR-024C` does not edit Prisma schema, create or apply migrations, add route handlers, add server actions, seed data, read or write the database, run connector runtime, read provider data, expose public output, enable high-risk module final writes, grant external agent database access, or make any agent surface externally registerable.

## AIINPUT-OPS-001 Protected Source Workflow Proof-Readiness Surface Acceptance

- Protected `/admin` and `/settings` expose an owner/admin-only AI Input Source Workflow readiness surface or section based on server-only, no-secret DTOs.
- `src/lib/services/admin-readiness.service.ts` exports a shared `AIInputSourceWorkflowOpsReadinessContract` with row-level state, status, signal, next action, boundary, required objects, prohibited exposure, and summary counts.
- `/admin` renders the contract as a table, and `/settings` renders the same contract as owner-control cards.
- The surface shows `DATTR-024A`, `DATTR-024B`, and `DATTR-024C` as complete boundaries and shows `AIINPUT-OPS-001`, `DATTR-024D-CONTRACT`, `DATTR-024E`, full `DATTR-024`, `AUTH-005`, `WORK-009`, proof target, migration review, RLS/authz, audit, and public-output gates honestly.
- The surface distinguishes ready boundary, dry-run-only, blocked, and human-approval-required states.
- The surface does not expose Supabase URLs or keys, database URLs or hosts, cookies, tokens, raw auth claims, profile IDs, row IDs, provider payloads, raw adapter payloads, source bodies, private source material, or raw generated report payloads.
- `AIINPUT-OPS-001` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, provider reads, public output expansion, high-risk module final writes, autonomous agent writes, external agent database access, or external registration.

## DATTR-024D-CONTRACT Proposal Action Contract Acceptance

- `src/lib/contracts/ai-input-source-workflow-proposal-action.contract.ts` defines owner-reviewed proposal action command ids, lifecycle states, approval levels, audit refs, rollback/undo expectations, and high-risk stop conditions for `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent` before any runtime server action exists.
- `scripts/check-ai-input-source-workflow-proposal-action.mjs` exists and is exposed as `pnpm ai-input:proposal-action:check`.
- Required command ids include `ai-input.proposal.review`, `ai-input.proposal.request_changes`, `ai-input.proposal.approve_for_write_intent`, `ai-input.proposal.reject`, `ai-input.proposal.archive`, `ai-input.write-intent.review`, `ai-input.write-intent.approve_draft`, `ai-input.write-intent.request_changes`, `ai-input.write-intent.reject`, and `ai-input.write-intent.cancel`.
- Required lifecycle states include drafted by agent, needs owner review, changes requested, approved for write intent, write-intent draft, approved for manual apply, rejected, archived, superseded, and blocked high risk.
- Approval levels distinguish `AUTO_PROPOSE_ONLY`, `OWNER_REVIEW_REQUIRED`, `HUMAN_APPROVAL_REQUIRED`, `BLOCKED_UNTIL_PROOF_TARGET`, and `BLOCKED_HIGH_RISK`.
- Proposal actions remain owner-reviewed and proposal-first; module final writes are blocked by human approval and module-specific risk policy.
- The contract maps proposal actions to the `ai-input.source-workflow` audit family without claiming persisted audit events before schema/runtime approval.
- The contract preserves no-secret output and keeps `externalRegisterable: false`.
- The follow-up `DATTR-024E-CONTRACT` connector boundary is complete; the next source-workflow runtime step is full `DATTR-024`, still blocked by proof target, migration, service authorization, RLS/audit storage, and connector runtime approvals.
- `DATTR-024D-CONTRACT` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024E-CONTRACT Connector Boundary Acceptance

- `src/lib/contracts/ai-input-source-workflow-connector-boundary.contract.ts` defines connector consent, scope, pause/resume/revoke, provider event verification, replay protection, secret separation, retention/deletion handling, audit refs, and stop conditions before any connector runtime.
- `scripts/check-ai-input-source-workflow-connector-boundary.mjs` exists and is exposed as `pnpm ai-input:connector-boundary:check`.
- Required provider families include manual, local file, URL, RSS, Google Drive, Google Docs, Gmail, LINE, Telegram, and GitHub Markdown.
- Required command ids include `ai-input.connector.scope.review`, `ai-input.connector.consent.grant`, `ai-input.connector.pause`, `ai-input.connector.resume`, `ai-input.connector.revoke`, `ai-input.provider-event.receive`, `ai-input.provider-event.verify`, `ai-input.provider-event.reject_replay`, `ai-input.provider-event.block`, and `ai-input.connector.retention.delete_request`.
- The connector boundary keeps route handlers, OAuth/webhooks, polling, provider API calls, file ingestion, OCR, transcription, raw adapter payload exposure, public output, high-risk module final writes, external collaboration, external agent database access, and external registration blocked until explicit approval.
- `pnpm ai-input:connector-boundary:check` writes a no-secret proof packet and validates provider coverage, consent states, commands, provider-event verification, replay protection, secret separation, retention/deletion handling, audit refs, official references, package script, task memory, and no-runtime guards.
- The acceptance artifact is machine-checkable before runtime implementation and preserves `externalRegisterable: false`.

## AIINPUT-OPS-002 Source Control Matrix Acceptance

- `/ai-input` formal mode exposes `AIINPUT-OPS-002` as a server-only source control matrix through `AIInputSourceControlMatrixContract`.
- The contract status is `formal_source_control_matrix_active` and mode is `protected_read_no_connector_runtime`.
- Matrix rows show source, provider, input mode, risk, connection status, next action, missing permissions, boundary, and audit refs without relying on mock connector rows.
- Required input modes include manual, polling, webhook, event, scheduled, and one-time.
- Required source rows cover manual import, LINE, Google Drive folder, RSS, Gmail, GitHub/Markdown, and Telegram. Google Docs remains a Drive file subtype/provenance value rather than a separate new-connection row.
- Protected admin/settings AI Input readiness includes an `AIINPUT-OPS-002 source control matrix` row so operations memory and page UI do not drift.
- `scripts/check-ai-input-source-control-matrix.mjs` exists and is exposed as `pnpm ai-input:source-control:check`.
- `pnpm ai-input:source-control:check` validates the type contract, server-only readiness service, `/ai-input` page usage, protected admin/settings readiness markers, package script, task memory, and no-runtime guards.
- `AIINPUT-OPS-002` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, OAuth runtime, webhook runtime, polling runtime, provider API calls, file ingestion, OCR, transcription, raw adapter payload exposure, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## AIINPUT-CAPTURE-001 Quick Capture Multimodal Research Acceptance

- `docs/07_research-and-design/RES-008_ai-input-quick-capture-multimodal-extension-research.md` exists and is indexed in `MAN-001`.
- The research uses the owner's screenshot-backed centered quick-capture modal as the local UI problem statement and records why the modal is not the primary long-term pattern.
- The selected pattern defines a collapsible capture dock/side sheet with collapsed rail, compact composer, expanded review, conversation processing, proposal review, and mobile bottom-sheet states.
- The selected contract is `CaptureEnvelope`, covering text, image, audio, file, URL, clipboard, page-selection, and screenshot payloads across web dock, PWA share target, Chrome side panel/context menu, and standalone app adapters.
- The research maps `CaptureEnvelope` into the existing AI Input Source Workflow path rather than creating a separate classifier pipeline.
- The research defines future BFF operations for draft creation, payload attachment, envelope submission, conversation retrieval, classification, proposal conversion, and discard/delete behavior.
- The extension/app path explicitly gates Chrome side panel, context menus, active-tab/user-gesture scripting, extension storage, PWA share target, and standalone app capture behind the same protected BFF and no-secret rules.
- The NANDA gate maps the future capability to IngestionAgent `multimodal-capture-envelope-classification`, keeps `externalRegisterable=false`, and creates follow-up row `AIINPUT-CAPTURE-006` for AgentFacts-lite manifest remediation.
- Backlog follow-ups `AIINPUT-CAPTURE-002..006` exist for the CaptureEnvelope contract, dock UI mock, real local preview inputs, platform adapter contract, and manifest update.
- `AIINPUT-CAPTURE-001` does not add runtime UI, route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, Supabase Storage writes, OCR, transcription, provider calls, extension runtime, extension auth token storage, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024F-CONTRACT Service Authorization Acceptance

- `src/lib/contracts/ai-input-source-workflow-service-authz.contract.ts` exports `AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OBJECTS`, `AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_REQUIRED_OPERATION_IDS`, `AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_OPERATIONS`, `AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_LAYERS`, `AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_STOP_CONDITIONS`, and `AI_INPUT_SOURCE_WORKFLOW_SERVICE_AUTHZ_SUMMARY`.
- The contract covers `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- The contract defines operation boundaries for list/detail, source connection review, source asset review, workflow run review, work item review, naming profile review, proposal review, write intent review, connector consent review, proof target review, and audit lineage review.
- Every operation states `requireUser()`, `ownerProfileId`, service-layer authorization, UI-safe input/output DTO rules, audit family/actions, approval level, runtime stage, agent boundary, next task, and stop conditions.
- `scripts/check-ai-input-source-workflow-service-authz.mjs` exists and is exposed as `pnpm ai-input:service-authz:check`.
- The checker validates this contract, `ARC-031`, this acceptance section, backlog/sprint/task memory markers, `DBS-006`, `ACC-006`, `ARC-028`, package script exposure, official source references, safety guards, and no runtime-only contract imports or database/provider/network usage.
- `DataUnitProposal` and `ModuleWriteIntent` remain proposal-only until target module authorization, proof refs, rollback refs, and owner/human approval pass.
- `DATTR-024F-CONTRACT` does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, provider data reads, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024G-CONTRACT Persistence Sequence Acceptance

- `docs/06_audits-and-reports/RPT-024_loop-109-dattr-024-persistence-gap-review.md` records the RES-001/RES-002 persistence sequence gap review before full `DATTR-024`.
- `src/lib/contracts/ai-input-source-workflow-persistence-sequence.contract.ts` exports `AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_REQUIRED_GATE_IDS`, `AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_GATES`, `AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_SOURCE_REFS`, and `AI_INPUT_SOURCE_WORKFLOW_PERSISTENCE_SEQUENCE_SUMMARY`.
- The sequence covers proof target readiness, create-only migration draft, service authorization runtime, RLS policy review, audit storage proof, proof-runner, connector runtime approval, and formal-mode cutover.
- The selected next executable task is `DATTR-024H-MIGRATION-DRAFT`; it may draft reviewable schema/migration artifacts in a future loop but must not apply migrations or write a valuable DB without approval.
- `scripts/check-ai-input-source-workflow-persistence-sequence.mjs` exists and is exposed as `pnpm ai-input:persistence-sequence:check`.
- The checker validates the contract, `RPT-024`, this acceptance section, backlog/sprint/task memory markers, official source refs, no-runtime guards, no-secret/static boundaries, and `externalRegisterable=false`.
- `DATTR-024G-CONTRACT` keeps `externalRegisterable=false` and does not add route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads, DB writes, connector runtime, provider data reads, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024H-MIGRATION-DRAFT Source Workflow Create-Only Draft Acceptance

- `docs/02_architecture-and-rules/MIG-003_ai-input-source-workflow-create-only-migration-draft.md` exists as the formal migration draft decision.
- `prisma/schema.prisma` defines Source Workflow enums and models for `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, and `ModuleWriteIntent`.
- The schema includes owner-scoped `ownerId` relations, retention/redaction fields, proof/audit/rollback refs, proposal/write-intent status and approval fields, and secret/provider references without storing provider tokens or raw credentials.
- The draft does not add a persisted `OperatingAuditEvent` model; persisted audit storage remains gated by `AUDIT-OPS-004` and future `DATTR-024K-RLS-AUDIT-STORAGE`.
- `prisma/migration-drafts/20260623_dattr_024h_source_workflow_create_only/migration.sql` exists as review-only SQL outside `prisma/migrations`; it must not be treated as a deployable Prisma migration.
- The SQL draft is create-only: enum creation, table creation, indexes, foreign keys, and fail-closed `ENABLE ROW LEVEL SECURITY` statements only. No RLS policies, seed data, DML, connector runtime, provider calls, public output, or final module writes are added.
- `scripts/check-ai-input-source-workflow-migration-draft.mjs` exists and is exposed as `pnpm ai-input:migration-draft:check`.
- `pnpm ai-input:migration-draft:check` validates schema models/enums, draft SQL/README, `MIG-003`, package script exposure, task memory markers, no deployable `prisma/migrations` draft, no destructive/DML SQL, and `externalRegisterable=false`.
- The selected next executable task is `DATTR-024I-PROOF-RUNNER`, a dry-run-first proof runner that must still refuse unsafe targets and not write until `ACC-006` proof target inputs are supplied.
- `DATTR-024H-MIGRATION-DRAFT` does not apply migrations, write any database, add route handlers, server actions, seed data, connector runtime, provider data reads, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024I-PROOF-RUNNER Source Workflow Dry-Run Runner Acceptance

- `scripts/ai-input-source-workflow-proof-runner.mjs` exists and is exposed as `pnpm ai-input:proof`.
- `scripts/check-ai-input-source-workflow-proof-runner.mjs` exists and is exposed as `pnpm ai-input:proof-runner:check`.
- The runner defaults to dry-run, reads only `AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL` for target classification, and never silently falls back to `DATABASE_URL`.
- The runner classifies target readiness without printing database URLs, hosts, credentials, Supabase keys, tokens, cookies, raw claims, profile IDs, row IDs, provider payloads, source bodies, private source material, or target module final payloads.
- `--run` remains a gate check in this slice: proof writes still require `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1`, `PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA`, a safe local/disposable target, and `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_REMOTE=1` only for an approved disposable remote target.
- The runner names the required proof objects: `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- Current loop 112 behavior remains no-write: `writesExecuted=false`, `doesNotConnectToDatabase=true`, `doesNotApplyMigration=true`, `doesNotWriteDatabase=true`, and `externalRegisterable=false`.
- `pnpm ai-input:proof-runner:check` validates the runner, package scripts, `ARC-031`, `MIG-003`, `ACC-006`, this acceptance section, backlog/sprint/task memory markers, no-write guards, no-secret boundaries, and next slice marker `DATTR-024J-SERVICE-AUTHZ-RUNTIME`.
- The selected next executable task is `DATTR-024J-SERVICE-AUTHZ-RUNTIME`, which must implement protected service authorization/read-write boundaries before any Source Workflow persistence runtime.
- `DATTR-024I-PROOF-RUNNER` does not apply migrations, connect to any database, write any database, add route handlers, server actions, seed data, connector runtime, provider data reads, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024J-SERVICE-AUTHZ-RUNTIME Source Workflow Service Boundary Acceptance

- `src/lib/services/ai-input-source-workflow.service.ts` exists as a server-only Source Workflow service boundary.
- `src/types/ai-input-source-workflow.ts` defines UI-safe runtime DTOs for owner scope, persistence state, required objects, operations, safety, summary, stop conditions, and next gates.
- `scripts/check-ai-input-source-workflow-service-runtime.mjs` exists and is exposed as `pnpm ai-input:service-runtime:check`.
- The service calls `requireUser()` before returning the contract and redacts owner/profile material with `ownerProfileIdRedacted: true`, `emailRedacted: true`, and `roleRedacted: true`.
- Current runtime mode is `service_authz_runtime_no_db_read`; the contract explicitly keeps `runtimeDbReadEnabled=false`, `runtimeDbWriteEnabled=false`, `migrationApplyAllowed=false`, `connectorRuntimeAllowed=false`, `publicOutputAllowed=false`, `moduleFinalWriteAllowed=false`, `externalAgentDatabaseAccessAllowed=false`, and `externalRegisterable=false`.
- The runtime maps `DATTR-024F-CONTRACT` operation ids into UI-safe states and keeps the required object set visible: `SourceConnection`, `SourceAsset`, `AIWorkflowRun`, `AIWorkItem`, `SourceNamingProfile`, `DataUnitProposal`, `ModuleWriteIntent`, and `OperatingAuditEvent`.
- `DataUnitProposal` and `ModuleWriteIntent` remain proposal-only until owner approval, target module authorization, rollback refs, and persisted audit proof exist.
- The checker validates the service, DTOs, package script, `ARC-031`, this acceptance section, backlog/sprint/task memory, completed log, no-secret exclusions, no-DB/no-provider/no-public-output guards, and next slice marker `DATTR-024K-RLS-AUDIT-STORAGE`.
- The selected next executable task is `DATTR-024K-RLS-AUDIT-STORAGE`, which must review RLS policies and persisted audit storage before any Source Workflow DB read/write runtime.
- `DATTR-024J-SERVICE-AUTHZ-RUNTIME` does not import Prisma or DB clients, read env secrets, connect to any database, write any database, apply migrations, add route handlers, add server actions, seed data, connector runtime, provider data reads, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024K-RLS-AUDIT-STORAGE Source Workflow RLS And Audit Acceptance

- `docs/02_architecture-and-rules/AUT-006_ai-input-source-workflow-rls-audit-storage.md` exists as the formal Source Workflow RLS/audit storage review gate.
- `src/lib/contracts/ai-input-source-workflow-rls-audit-storage.contract.ts` defines `DATTR-024K-RLS-AUDIT-STORAGE`, required gate ids, required tables, identity strategies, source refs, stop conditions, and summary state.
- `scripts/check-ai-input-source-workflow-rls-audit-storage.mjs` exists and is exposed as `pnpm ai-input:rls-audit-storage:check`.
- The gate records `identityStrategySelected=false`, `rlsPolicyApplyAllowed=false`, `auditStorageRuntimeAllowed=false`, `databaseReadAllowed=false`, `databaseWriteAllowed=false`, and `externalRegisterable=false`.
- The identity review rejects assuming `auth.uid() = owner_id` until `Profile` has a stable Supabase Auth user id mapping or a trusted server transaction claim design is approved.
- Required tables are `source_connections`, `source_assets`, `ai_workflow_runs`, `ai_work_items`, `source_naming_profiles`, `data_unit_proposals`, `module_write_intents`, and future `operating_audit_events`.
- The DATTR-024H draft remains fail-closed: RLS is enabled for draft Source Workflow tables, but policy SQL apply remains blocked until identity strategy and proof cases are accepted.
- Persisted audit storage remains blocked until append-only behavior, redacted read DTOs, retention/export/purge, integrity refs, and no-secret evidence are approved.
- Secret separation remains mandatory: Source Workflow rows may keep `secret_ref` and `provider_account_ref`, but not provider tokens, webhook secrets, signing secrets, refresh tokens, service-role keys, database URLs, raw provider payloads, or private source bodies.
- The selected next implementation blocker is `DATTR-024L-CONNECTOR-RUNTIME`, but loop 115 must first run the required fifth-loop launch-level review.
- `DATTR-024K-RLS-AUDIT-STORAGE` does not apply migrations, apply RLS policies, connect to any database, read or write any database rows, create persisted audit rows, add route handlers, add server actions, seed data, connector runtime, provider data reads, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## DATTR-024L-CONNECTOR-RUNTIME Source Workflow Connector Runtime Approval Acceptance

- `docs/02_architecture-and-rules/AUT-007_ai-input-source-workflow-connector-runtime-approval.md` exists as the canonical connector runtime approval gate before OAuth, webhook, polling, provider API, secret write, DB read/write, or external registration activation.
- `src/lib/contracts/ai-input-source-workflow-connector-runtime-approval.contract.ts` defines `DATTR-024L-CONNECTOR-RUNTIME`, required gate ids, provider families, official source refs, stop conditions, and summary state.
- `scripts/check-ai-input-source-workflow-connector-runtime-approval.mjs` is exposed as `pnpm ai-input:connector-runtime:check` and reports `ready_for_connector_runtime_approval_review` in `connector_runtime_approval_only_no_activation` mode.
- The gate records `runtimeApprovalSelected=false`, `connectorRuntimeAllowed=false`, `oauthRuntimeAllowed=false`, `webhookRuntimeAllowed=false`, `pollingRuntimeAllowed=false`, `providerApiRuntimeAllowed=false`, `secretWriteAllowed=false`, `databaseReadAllowed=false`, `databaseWriteAllowed=false`, and `externalRegisterable=false`.
- Provider approval rows cover manual, local file, URL, RSS, Google Drive, Google Docs, Gmail, LINE, Telegram, and GitHub Markdown.
- Approval gates cover provider inventory/data classification, OAuth consent scope and PKCE, secret storage/Vault or backend env review, webhook raw-body signature verification, replay/idempotency, polling rate-limit/cursor/backoff, adapter payload redaction, Source Workflow mapping, service authz/RLS/audit dependency, dry-run-first proof target, owner/human approval/rollback, and external-agent/NANDA boundary.
- Future runtime must preserve `SourceConnection`, `SourceAsset`, `OperatingAuditEvent`, `providerEventRef`, `proofRef`, `requireUser()`, service-layer authorization, selected RLS identity strategy, audit storage, and no-secret DTO/proof behavior before provider events can create side effects.
- The selected next anti-repeat implementation slice is `AIINPUT-OPS-003` unless `AUTH-005` or `WORK-009` proof prerequisites appear.
- `DATTR-024L-CONNECTOR-RUNTIME` does not add route handlers, OAuth callbacks, webhook endpoints, polling jobs, provider API calls, file ingestion, OCR/transcription, raw adapter payload handling, secret writes, schema/migration apply, DB reads/writes, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## AIINPUT-OPS-003 Source Workflow Gate Surface Acceptance

- `src/types/ai-input-readiness.ts` defines `AIInputSourceWorkflowGateMatrixContract` with id `AIINPUT-OPS-003`, status `protected_source_workflow_gate_surface_active`, mode `protected_read_no_db_no_connector_runtime`, and `sourceWorkflowGateMatrix` on the formal AI Input readiness contract.
- `src/lib/services/ai-input-readiness.service.ts` builds Source Workflow H/I/J/K/L, local proof bootstrap, and formal-cutover rows covering `DATTR-024H-MIGRATION-DRAFT`, `DATTR-024I-PROOF-RUNNER`, `DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP`, `DATTR-024J-SERVICE-AUTHZ-RUNTIME`, `DATTR-024K-RLS-AUDIT-STORAGE`, `DATTR-024L-CONNECTOR-RUNTIME`, allowed operations, blocked runtime behavior, owner-run proof commands, next actions, and no-secret boundaries.
- Protected `/ai-input` formal mode renders the gate matrix alongside the formal read model and source-control matrix so the owner can see migration draft, proof runner, service authz runtime, RLS/audit, connector approval, and cutover state without hidden mock fallback.
- Protected `/admin` and `/settings` render the shared `AIInputSourceWorkflowOpsReadinessContract` as `AIINPUT-OPS-003`, including human-approval counts, local proof packet status/path summary, and `ownerRunCommand` rows for `pnpm ai-input:migration-draft:check`, `pnpm ai-input:proof-runner:check`, `pnpm ai-input:proof-local`, `pnpm ai-input:service-runtime:check`, `pnpm ai-input:rls-audit-storage:check`, `pnpm ai-input:connector-runtime:check`, and `pnpm ai-input:ops-surface:check`.
- `scripts/check-ai-input-source-workflow-ops-surface.mjs` is exposed as `pnpm ai-input:ops-surface:check` and reports `protected_source_workflow_gate_surface_ready` when AI Input/admin/settings/docs/task memory all contain the required protected surface markers.
- The gate records `databaseReadAllowed=false`, `databaseWriteAllowed=false`, `connectorRuntimeAllowed=false`, `oauthRuntimeAllowed=false`, `webhookRuntimeAllowed=false`, `pollingRuntimeAllowed=false`, `providerApiRuntimeAllowed=false`, `secretWriteAllowed=false`, `publicOutputAllowed=false`, and `externalRegisterable=false`.
- The selected next loop is `LOOP-118` for the required `RES-001`/`RES-002` research cadence unless `AUTH-005` or `WORK-009` proof prerequisites appear first.
- `AIINPUT-OPS-003` does not add route handlers, server actions, Prisma clients, schema/migration apply, seed changes, DB reads/writes, OAuth callbacks, webhook endpoints, polling jobs, provider API calls, file ingestion, OCR/transcription, secret writes, raw adapter payload exposure, public output expansion, high-risk module final writes, external collaboration, external agent database access, or external registration.

## LOOP-118 Source Workflow Post-L Gap Review Acceptance

- `docs/06_audits-and-reports/RPT-027_loop-118-source-workflow-post-l-gap-review.md` exists and records the required `RES-001`/`RES-002` Source Workflow post-L gap review after `DATTR-024L-CONNECTOR-RUNTIME` and `AIINPUT-OPS-003`.
- The review refreshes launch/auth/Work/AI Input/agent proof signals and confirms `AUTH-005` and `WORK-009` cannot preempt while Supabase public env, signed-in `/auth/status` evidence, Work proof target, and Work write confirmations are absent.
- The review cites current primary sources for Supabase RLS, Prisma migrate deploy, Next authentication, and Next data security.
- The review converts the highest remaining no-proof Source Workflow gap into `DATTR-024M-CUTOVER-READINESS`.
- `LOOP-118` does not claim a launch-level upgrade, run migration apply, connect to a DB, write rows, activate connector runtime, create public endpoints, expose secrets, allow external agent DB access, or register external agents.

## DATTR-024M-CUTOVER-READINESS Source Workflow Formal Cutover Readiness Acceptance

- `src/lib/contracts/ai-input-source-workflow-formal-cutover-readiness.contract.ts` defines `DATTR-024M-CUTOVER-READINESS` as a no-runtime promotion gate for full `DATTR-024`.
- The contract enumerates ordered promotion prerequisites for proof target/write confirmations, migration review and deployable migration promotion, migration apply strategy, selected identity strategy, RLS policy apply approval, persisted audit storage runtime approval, service DB read/write enablement, connector runtime activation, rollback/manual recovery, owner approval, public-output boundary, and NANDA/external-registration boundary.
- `scripts/check-ai-input-source-workflow-formal-cutover-readiness.mjs` is exposed as `pnpm ai-input:cutover-readiness:check` and validates the contract, package script, `RPT-027`, `ACC-002`, backlog/sprint/task memory, completed log, and completed H/I/J/K/L prerequisites.
- The checker reports `ready_for_formal_cutover_readiness_review` in `cutover_readiness_only_no_runtime` mode.
- The checker output records `proofTargetWriteConfirmed=false`, `deployableMigrationPromotionAllowed=false`, `migrationApplyAllowed=false`, `databaseConnectionAllowed=false`, `identityStrategySelected=false`, `rlsPolicyApplyAllowed=false`, `auditStorageRuntimeAllowed=false`, `serviceDatabaseReadAllowed=false`, `serviceDatabaseWriteAllowed=false`, `connectorRuntimeActivationAllowed=false`, `publicOutputAllowed=false`, and `externalRegisterable=false`.
- The checker must report all runtime side effects disabled by default: migration apply, DB connection, DB read/write, RLS policy apply, persisted audit write, route/server-action runtime, OAuth/webhook/polling/provider runtime, secret write, public output, module final write, external agent DB access, external collaboration, and external registration.
- The selected follow-up after DATTR-024M should remain proof-driven: run `AUTH-005` or `WORK-009` when prerequisites appear; otherwise continue shortest-path Source Workflow cutover proof or Manual Ops unblock work.
- `DATTR-024M-CUTOVER-READINESS` does not create/apply Prisma migrations, connect to databases, read/write rows, enable RLS policies, persist audit rows, add route handlers, add server actions, activate connectors, call providers, write secrets, expand public output, write high-risk modules, expose external collaboration, allow external agent DB access, or register agents externally.

## LOOP-120 Launch-Level Review Acceptance

- `docs/06_audits-and-reports/RPT-028_loop-120-launch-level-review.md` exists and records the required fifth-loop launch-level review after `DATTR-024M-CUTOVER-READINESS`.
- The review refreshes `launch:proof`, `auth:proof`, Work proof target readiness, Manual Ops, Docker disposable Work proof, conditional L3 interface/scenario/architecture checks, Agent registry/API/command-center checks, Source Workflow cutover readiness, interface smoke, operator actions, launch history, Prisma validation, and TypeScript validation.
- The review keeps formal launch at `L0_LOCAL_PROTOTYPE`, Manual Ops at `M1_MANUAL_OPS_READY`, and conditional product maturity at `C3_ARCHITECTURE_GATE_READY`.
- The review scores top gaps by actor impact, severity, and leverage, and records the last-five-loop anti-repeat decision.
- The selected next implementation slice is `DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP` unless `AUTH-005` or `WORK-009` prerequisites appear first.
- `LOOP-120` does not claim `L1`, `L3`, `L4`, or `C-L3_CONDITIONAL_FULL_EXPERIENCE`, and does not add route handlers, server actions, schema/migration apply, DB reads/writes, provider runtime, public output, high-risk final writes, external collaboration, external agent DB access, or external registration.

## DATTR-024N-SOURCE-WORKFLOW-LOCAL-PROOF-BOOTSTRAP Acceptance

- Add a dry-run-first local/disposable Source Workflow proof bootstrap helper that prepares the owner/operator to run `pnpm ai-input:proof` against an explicit local/disposable target.
- `scripts/ai-input-source-workflow-local-proof-bootstrap.mjs` must be exposed as `pnpm ai-input:proof-local`, and `scripts/check-ai-input-source-workflow-local-proof-bootstrap.mjs` must be exposed as `pnpm ai-input:proof-local:check`.
- The helper refuses missing, remote, valuable-looking, or no-proof-marker targets unless explicit remote disposable override and write confirmations are present.
- Supported owner/operator inputs are `--target-url`, `AI_INPUT_SOURCE_WORKFLOW_LOCAL_TARGET_URL`, `AI_INPUT_SOURCE_WORKFLOW_PROOF_DATABASE_URL`, and explicit `--use-database-url`; write-run readiness requires `PERSONAL_OS_AI_INPUT_PROOF_ALLOW_WRITES=1` and `PERSONAL_OS_AI_INPUT_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA`.
- The helper must not silently reuse `DATABASE_URL`, apply migrations, promote migration drafts, write DB rows, connect to a valuable DB, set environment variables globally, print secrets, expose hostnames/passwords/tokens/profile IDs, activate connectors, call providers, add public output, or register agents externally.
- The helper should emit a no-secret JSON proof packet with target classification, missing prerequisites, planned child command, injected child-only confirmations, and next owner actions.
- The checker/package script must validate the helper, no-secret exclusions, package script, `ACC-006`, `DATTR-024I`, `DATTR-024M`, backlog/current sprint/task memory, and `externalRegisterable=false`.
- The selected follow-up is `DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI`, a protected owner-visible proof packet surface, unless `AUTH-005` or `WORK-009` proof prerequisites appear first.
- Verification should include `node --check`, the new package check, `pnpm ai-input:proof-runner:check`, `pnpm ai-input:cutover-readiness:check`, JSON parse, `pnpm db:validate`, `pnpm exec tsc --noEmit --pretty false`, and `git diff --check`.

## DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI Acceptance

- `src/lib/services/ai-input-source-workflow-proof-bootstrap-readiness.service.ts` is server-only and reads the latest DATTR-024N bootstrap/check JSON packets into a UI-safe `AIInputSourceWorkflowProofBootstrapContract`.
- `src/types/ai-input-readiness.ts` defines `AIInputSourceWorkflowProofBootstrapContract` with id `DATTR-024O-SOURCE-WORKFLOW-PROOF-PACKET-UI`, status `protected_proof_packet_surface_active`, mode `protected_read_no_secret_packet_summary`, and whitelisted fields for packet status, checker status, target classification, missing prerequisites, owner actions, child command, and safety flags.
- Protected `/ai-input` formal mode renders the Source Workflow proof packet panel alongside the formal read model and gate matrix, including `pnpm ai-input:proof-local -- --json`, latest packet path/status, child command, missing prerequisites, target classification labels, Manual Ops ownership, and no-secret safety flags.
- Protected `/admin` and `/settings` surface the same shared proof packet status/path/checker state through `AIInputSourceWorkflowOpsReadinessContract` so operator and owner settings views do not drift.
- The proof packet surface must render only whitelisted fields. It must not render raw packet bodies, database URLs, database hosts, usernames, passwords, Supabase keys, tokens, cookies, raw auth claims, profile IDs, row IDs, provider payloads, source file bodies, private source material, target module final payloads, or environment variable values.
- The UI must not execute `pnpm ai-input:proof-local`, spawn shell commands, connect to a database, apply or promote migrations, write proof rows, activate connectors, call providers, expand public output, enable external agent database access, or register agents externally.
- `scripts/check-ai-input-source-workflow-ops-surface.mjs` / `pnpm ai-input:ops-surface:check` validates the proof packet service, AI Input/admin/settings markers, DATTR-024N gate row, DATTR-024O contract marker, package commands, and no-runtime flags.
- Verification should include `pnpm ai-input:proof-local:check`, `pnpm ai-input:ops-surface:check`, `pnpm ai-input:cutover-readiness:check`, `pnpm exec tsc --noEmit --pretty false`, `pnpm db:validate`, and `git diff --check`.

## LOOP-123 Source Workflow Proof UI Gap Review Acceptance

- `docs/06_audits-and-reports/RPT-029_loop-123-source-workflow-proof-ui-gap-review.md` exists and records the required `RES-001`/`RES-002` research-to-task review after `DATTR-024O`.
- The review confirms formal launch remains `L0_LOCAL_PROTOTYPE`, Manual Ops remains `M1_MANUAL_OPS_READY`, and conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- The review reassesses protected AI Input/admin/settings Source Workflow proof UI, owner-run evidence handoff, backend/BFF proof packet source, AI/agent protocol boundary, and formal launch blockers.
- The review identifies the key gap: the current protected Source Workflow proof UI reads fixed historical loop-121 packet paths instead of resolving the latest owner-run no-secret proof evidence.
- The review converts the gap into `DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER`.
- `LOOP-123` does not claim formal L1/L3/L4, run DB writes, apply migrations, activate connectors, expose public output, register external agents, or repeat adjacent `DATTR-024O` UI evidence.

## DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER Acceptance

- Add a server-only latest Source Workflow proof evidence resolver that scans only approved generated evidence directories and explicit filename patterns for no-secret Source Workflow bootstrap, checker, and proof-runner packets.
- The resolver returns a UI-safe evidence DTO with latest packet path, checker path where available, evidence family, packet status, checker status, modified time, age/freshness, missing/stale state, and next owner action.
- `DATTR-024O` proof-bootstrap readiness should use the resolver instead of fixed loop-specific packet paths so protected `/ai-input`, `/admin`, and `/settings` can reflect future owner-run evidence.
- The resolver must not render or return raw packet bodies, database URLs, database hosts, usernames, passwords, Supabase keys, tokens, cookies, raw auth claims, profile IDs, row IDs, provider payloads, source file bodies, private source material, target module final payloads, or environment variable values.
- The resolver and checker must not execute shell commands, connect to a database, apply/promote migrations, write proof rows, activate connectors, call providers, expand public output, enable external agent database access, or register agents externally.
- Add `pnpm ai-input:proof-evidence:check` or equivalent verification that validates whitelisted paths/patterns, no-secret exclusions, latest evidence selection, stale/missing classification, docs/task markers, and `externalRegisterable=false`.
- Verification should include `pnpm ai-input:proof-evidence:check`, `pnpm ai-input:ops-surface:check`, `pnpm ai-input:proof-local:check`, `pnpm ai-input:cutover-readiness:check`, `pnpm exec tsc --noEmit --pretty false`, `pnpm db:validate`, JSON parse, and `git diff --check`.
- Loop 124 completes `DATTR-024P-SOURCE-WORKFLOW-LATEST-PROOF-EVIDENCE-RESOLVER`: `src/lib/services/ai-input-source-workflow-proof-evidence.service.ts` resolves latest Source Workflow proof evidence from whitelisted no-secret generated packets, `src/lib/services/ai-input-source-workflow-proof-bootstrap-readiness.service.ts` exposes it as `latestEvidence`, protected `/ai-input`, `/admin`, and `/settings` display freshness/next owner action, and `pnpm ai-input:proof-evidence:check` validates the resolver without DB, command execution, connector runtime, public output, external agent DB access, or external registration.

## LOOP-126 Source Workflow Manual Ops Convergence Gap Review Acceptance

- `docs/06_audits-and-reports/RPT-031_loop-126-source-workflow-manual-ops-gap-review.md` exists and records the required `RES-001` / `RES-002` research-to-task review after loop 125.
- The review confirms formal launch remains `L0_LOCAL_PROTOTYPE`, Manual Ops remains `M1_MANUAL_OPS_READY`, and conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`.
- The review scores `DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE` at High understanding and completes three same-issue research rounds before routing implementation.
- The review reassesses protected Source Workflow proof target handoff, Manual Ops owner actions, AI Input/admin/settings surfaces, backend/BFF proof packet source, auth/Work/deploy blockers, and NANDA boundary.
- The review converts the gap into `DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE` with scope, likely files, acceptance criteria, verification, risks, and stop conditions.
- `LOOP-126` does not claim L1/L3/L4, run proof commands from the UI, connect to DB, apply/promote migrations, write proof rows, activate connectors, call providers, expand public output, allow external agent DB access, or register agents externally.

## DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE Acceptance

- Add a protected no-secret Source Workflow proof target handoff that turns latest proof evidence and local proof bootstrap missing inputs into owner-operable next actions.
- Protected `/ai-input`, `/admin`, and `/settings` expose the same handoff contract or a shared readiness contract consumed by those surfaces.
- The handoff lists exact owner actions, env var names only, proof commands, generated evidence output paths, pass/fail signals, current missing prerequisites, and stop conditions.
- The handoff uses the latest Source Workflow proof evidence resolver and local proof bootstrap state instead of fixed historical packet paths.
- The handoff distinguishes owner-run proof from runtime execution and must not claim launch-level progress until owner/operator evidence exists.
- The handoff must not execute shell commands, connect to a database, apply/promote migrations, write proof rows, activate connectors, call providers, reveal target URLs, hostnames, credentials, Supabase keys, tokens, cookies, raw auth claims, profile IDs, row IDs, raw packet bodies, private source payloads, target module final payloads, or environment variable values.
- The handoff must not add public output, external agent database access, external collaboration, external registration, route handler writes, server action writes, Prisma schema changes, migration apply, connector runtime, provider runtime, or high-risk final writes.
- Verification should include `pnpm ai-input:proof-evidence:check`, `pnpm ai-input:proof-local:check`, `pnpm ai-input:ops-surface:check`, `pnpm ai-input:cutover-readiness:check`, `pnpm interface:smoke:check`, `pnpm exec tsc --noEmit --pretty false`, `pnpm db:validate`, JSON parse, and `git diff --check`.
- Loop 127 completes `DATTR-024Q-SOURCE-WORKFLOW-PROOF-TARGET-HANDOFF-SURFACE`: `AIInputSourceWorkflowProofBootstrapContract` now includes `proofTargetHandoff`, protected `/ai-input` renders owner action, env var names only, proof commands, evidence targets, pass/fail signals, missing prerequisites, and stop conditions, and protected `/admin` plus `/settings` surface the same status through `AIInputSourceWorkflowOpsReadinessContract`. `pnpm ai-input:ops-surface:check` validates the DATTR-024Q gate row and UI/admin/settings markers while keeping proof execution, DB connection/write, migration apply, connector/provider runtime, public output, external agent DB access, and external registration disabled.

## FRONTSTAGE-001 Public Entry Acceptance

- `/` returns a public-safe static page instead of a blind redirect or scaffold template.
- The first viewport identifies `Personal OS` and gives owner entry points to AI Input, owner settings, and admin through `/login?next=...`.
- Protected owner links do not point directly to private routes from the public page and should avoid background prefetch of protected dashboard routes.
- `/` does not import Prisma, DB services, admin readiness services, mock Work data, client portal mock data, provider secrets, raw env values, Supabase sessions, cookies, raw claims, or adapter payloads.
- `/` does not render private project names, tasks, notes, deliverables, source material, life/finance/company strategy data, internal IDs, mock client tokens, or generated report contents.
- Client Portal is described as token-only; the root page must not expose a sample `/client/[token]` link.
- `/auth/status` may be linked only as a safe readiness JSON endpoint that does not expose tokens, cookies, raw claims, profile IDs, or cross-user Work data.
- Desktop and mobile layouts should not horizontally overflow.

## CLIENT-002 Client Portal Mock Containment Acceptance

- `/client/[token]` no longer imports, reads, or renders `mockProjectsFull`, `mockTasks`, or `mockDeliverables`.
- Any current public client token path fails closed with a safe unavailable/invalid-token boundary until DB-backed token validation exists.
- The route does not render private project names, client names, task titles, deliverable labels, internal notes, source material, mock client tokens, or token-derived project content.
- The response should be request-time, no-store, and noindex so unavailable public client URLs are not treated as launch content.
- `CLIENT-002` does not create token rotation, revoke actions, share-link persistence, Prisma schema changes, migration, seed changes, or public data writes.
- `CLIENT-001` now owns the gated DB-backed loader and public DTO contract; `CLIENT-002` remains the mock containment baseline.

## CLIENT-001 Gated DB-Backed Client Portal Acceptance

- `src/lib/services/client-portal.service.ts` is server-only and returns a UI-safe `ClientPortalView` DTO.
- `/client/[token]` calls `connection()` before runtime env/service reads, remains dynamic, and keeps noindex metadata.
- The DB-backed path is disabled unless `PERSONAL_OS_ENABLE_CLIENT_PORTAL_DB=1`.
- Token format is validated before DB lookup.
- The query matches `Project.clientToken` and `Project.visibility = CLIENT_VISIBLE`.
- Duplicate or missing token matches fail closed instead of selecting an arbitrary row.
- Tasks and deliverables are filtered to `visibility = CLIENT_VISIBLE` inside the DB query.
- Notes are excluded by default and not queried in this slice.
- Public output excludes internal IDs, `clientToken`, owner/profile IDs, raw Prisma rows, internal records, and file URLs.
- DB errors, disabled state, invalid tokens, and no-match states all render the safe unavailable/not-found boundary.
- `CLIENT-001` does not add token rotation, revoke actions, audit persistence, Prisma schema changes, migrations, seed changes, public storage review, or public write actions.

## CLIENT-003 Client Portal Readiness Contract Acceptance

- `src/lib/services/client-portal-readiness.service.ts` is server-only and returns a UI-safe `ClientPortalReadinessContract`.
- The contract is rendered only inside protected `/admin` and `/settings` surfaces, not inside public `/client/[token]`.
- `/admin` shows the full launch-hardening table for the Client Portal public rendering gate, token lookup guard, token storage model, rotation/revoke lifecycle, access audit trail, storage/file URL boundary, public DTO boundary, and unavailable-state behavior.
- `/settings` shows an owner-facing summary of the same contract so Client Portal readiness does not drift from the admin view.
- The contract exposes only safe signals: whether the explicit DB-backed rendering gate is enabled, whether the route currently fails closed, schema readiness booleans, prohibited write categories, and follow-up task labels.
- The contract does not expose real client tokens, project IDs, owner/profile IDs, raw Prisma rows, storage/file URLs, DB URLs, hostnames, cookies, provider payloads, env values, or secrets.
- `CLIENT-003` adds no token rotation action, revoke action, public write action, storage/file URL rendering, Prisma schema change, migration, seed change, production DB mutation, or mock fallback.
- `CLIENT-004` completed the token schema/hashing proposal and `CLIENT-006` completed the public storage/file URL policy review. `CLIENT-005` and `CLIENT-007` remain follow-up gates for owner token lifecycle actions with audit and real DB token smoke.

## CLIENT-004 Client Portal Token Schema Contract Acceptance

- `docs/02_architecture-and-rules/DBS-004_client-portal-token-schema-contract.md` exists as the canonical proposal for Client Portal token storage.
- The proposal defines selector/verifier public token shape, high-entropy verifier generation, HMAC digest storage, hash key id, token status, revoked/rotated/last-accessed metadata, access audit relation, uniqueness/index behavior, migration impact, and backfill strategy.
- Protected admin/settings readiness can report token schema/hash/audit strategy as reviewed while still labeling implementation as proposal-only and no schema change.
- `ARC-025` points to `DBS-004` and keeps `/client/[token]` fail-closed by default.
- `CLIENT-004` does not add token generate/rotate/revoke actions, public writes, public storage/file URL rendering, Prisma schema changes, migrations, seed changes, production DB mutation, raw token logging, or public output expansion.
- `CLIENT-005` remains blocked until the schema/migration/action boundary is approved and a safe DB target is available.

## CLIENT-006 Client Portal Public Storage Policy Acceptance

- `docs/02_architecture-and-rules/AUT-004_client-portal-public-storage-policy.md` exists as the canonical Client Portal storage/file URL policy.
- The policy defines private-bucket defaults, server-side signed URL BFF access, short TTL expectations, no-store response behavior, revocation/cache limitations, storage metadata, file safety requirements, audit requirements, and rejected leak paths.
- Protected admin/settings readiness can report public storage policy as reviewed while still labeling implementation as proposal-only and no file URL rendering.
- Public `/client/[token]` source still excludes `fileUrl`, raw storage URLs, provider signed URLs, bucket names, object keys, and storage secrets.
- `CLIENT-006` does not add signed URL runtime, storage bucket changes, upload runtime, public file links, Prisma schema changes, migrations, seed changes, production DB mutation, or public output expansion.
- `CLIENT-005` and `CLIENT-007` remain gated by approved token lifecycle/schema actions, safe DB reachability, and real public-route smoke.

## HARDEN-001 Route State Hardening Acceptance

- `src/components/layout/route-state-panel.tsx` provides one reusable no-secret status surface for loading, error, not-found, and unavailable states.
- Protected dashboard routes have segment-level `loading.tsx`, `error.tsx`, and `not-found.tsx` states that match the operating dashboard style.
- Protected route error states do not render exception messages, stack traces, env values, cookies, provider payloads, profile IDs, private records, or raw DB identifiers.
- Protected unauthenticated routes continue to redirect to `/login?next=...` before the private shell renders.
- Public root unmatched routes render a noindex 404 that does not query private module records or expose Work, source, Client Portal token, env, or provider details.
- Public `/client/[token]` renders consistent no-secret unavailable/error UI and keeps the required `No mock output` marker.
- Public `/client/[token]` remains fail-closed as 404/no-store/noindex when the DB/token/visibility gates are unavailable.
- Public `/client/[token]` deliberately does not use a segment `loading.tsx`, because segment loading can stream a `200` response before a later `notFound()`; 404 status preservation has priority over a public-token loading state.
- `HARDEN-001` does not add schema changes, migrations, seed changes, token lifecycle writes, public output expansion, production DB mutation, deployment provider writes, or broad visual redesign.

## ENV-001 Launch Environment Readiness Acceptance

- `pnpm launch:check` reports Supabase public env presence, runtime DB URL presence/parseability, migration DB URL presence/parseability, selected DB host DNS reachability, effective auth mode, deployment marker presence, and next operator actions.
- `pnpm launch:check` must not print Supabase URLs, publishable keys, anon keys, database URLs, database hosts, cookies, tokens, raw claims, profile IDs, or secret values.
- `pnpm launch:check --json` returns machine-readable readiness status for evidence reports.
- `pnpm launch:check:strict` exits nonzero when a blocking launch prerequisite is missing.
- `ENV-001_launch-environment-readiness.md` documents the L1 gate and the operator runbook for unblocking `AUTH-005` and `WORK-007`.
- `ENV-001` does not run migrations, seed data, production DB writes, deployment provider writes, auth provider writes, or any command that mutates a valuable environment.

## DEPLOY-001 Launch Proof Package Acceptance

- `pnpm launch:proof` writes a no-secret JSON proof packet using `pnpm launch:check --json` as its source command.
- The proof packet includes `proofSummary.overallStatus`, blocked labels, warn labels, `canRunAuth005`, `canRunWork007`, `canClaimL1`, expected strict exit code, and loop-review guidance.
- The proof packet does not print Supabase URLs, publishable keys, anon keys, database URLs, database hosts, cookies, tokens, raw auth claims, profile IDs, provider payloads, or secret values.
- `docs/08_acceptance-and-qa/ACC-003_launch-proof-checklist.md` defines the proof packet contract, L1 gate, deployment checklist, and operator runbook.
- `docs/02_architecture-and-rules/ENV-001_launch-environment-readiness.md` points operators to `pnpm launch:proof` and `ACC-003`.
- Local blocked proof must be treated as valid evidence: `pnpm launch:check:strict` may exit nonzero until launch prerequisites are configured.
- `DEPLOY-001` does not deploy, mutate environment variables, run migrations, seed data, write production DB records, call deployment provider APIs, expand public output, or change auth behavior.

## ENV-002 Launch Environment Unblock Handoff Acceptance

- `docs/04_playbook/PBK-001_launch-env-unblock-handoff.md` exists as the canonical no-secret operator handoff.
- The playbook defines the current repeated blockers: Supabase public env, signed-in `/auth/status` evidence, safe Work proof DB target, and deployment marker.
- The playbook gives exact command sequences for `pnpm launch:proof`, `pnpm auth:proof`, `pnpm work:proof`, and safe Vercel environment-variable verification.
- The playbook explains pass/fail interpretation for `canRunAuth005`, `canProceedToWork007`, `canRunWork007`, `canClaimL1`, Work proof dry-run, and Work proof run mode.
- The playbook routes the next task to `AUTH-005`, `WORK-009`, `WORK-007`, or `AGENT-005` based on evidence state.
- The playbook includes stop rules for production DB migrations, seeds, service-role keys, public Client Portal output, automatic profile creation, and valuable DB writes.
- `ENV-002` does not mutate environment variables, auth provider state, sessions, database rows, migrations, seed data, deployments, public output, or Client Portal runtime behavior.

## AGENT-005 AgentFacts-Lite Manifest Inventory Acceptance

- `docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json` exists and includes one AgentFacts-lite manifest for every internal agent in `ARC-020_internal-agents.md`.
- `docs/2_agent-input/generated/agent-loop/agent-registry/manifest-index.json` records source count, manifest count, missing agents, registry state, and the next validation task.
- Each manifest includes identity, provider, lifecycle, endpoints, protocols, capabilities, skills, auth, trust, observability, and registry status fields.
- Every agent is marked `lifecycle.status = governance-only`, `registry.internalDiscoverable = true`, `registry.externalRegisterable = false`, and `registry.registrationStatus = not-registered`.
- Each capability declares risk level, human approval requirement, and allowed target modules.
- High-risk modules and surfaces keep `HUMAN_APPROVAL_REQUIRED` or capability-level approval for final writes, public output, auth/permission changes, Client Portal exposure, Finance, Life, Company Strategy, and external collaboration.
- Manifest observability uses placeholders only; it does not invent telemetry metrics, uptime, certifications, audits, endpoints, or external registrations.
- `AGENT-005` does not create runtime agent UI, public agent directory, external NANDA Index registration, external collaboration runtime, schema changes, migrations, seed data, DB writes, provider writes, secrets, tokens, cookies, database URLs, private records, or public output.

## AGENT-006 AgentFacts-Lite Validation Acceptance

- `pnpm agent:registry:check` validates the generated AgentFacts-lite manifest file and manifest index without requiring network, DB, auth provider, deployment, or secret access.
- The check validates coverage against `docs/02_architecture-and-rules/ARC-020_internal-agents.md`, required root fields, required manifest fields, local source references, capability risk gates, high-risk owner approval gates, no-secret markers, index coverage, and internal-only registry state.
- The check reports `ready_for_internal_use` only when generated manifests cover all source agents, contain no duplicate ids/labels/URNs, keep all high/critical capabilities human-gated, and keep external registration disabled.
- The check reports external registration as `blocked_by_policy` and lists missing registration-readiness fields such as runtime endpoints, auth methods, required scopes, trust attestations, telemetry claims, and registry targets.
- The check must not claim public AgentFacts compliance, external NANDA Index registration, runtime agent availability, uptime, telemetry, certifications, public endpoints, schema changes, provider writes, DB writes, secrets, tokens, cookies, database URLs, profile IDs, private records, or public output.

## AGENT-007 Protected Agent Protocol Readiness Surface Acceptance

- `src/lib/services/agent-protocol-readiness.service.ts` is server-only and reads generated AgentFacts-lite manifests, the manifest index, and latest registry validation proof as a UI-safe readiness contract.
- Protected `/admin` renders manifest coverage, validation proof, trust boundary state, runtime endpoint/auth absence, external registration state, protected visibility, missing registration-readiness fields, and next task candidates.
- Protected `/settings` renders the same readiness contract as owner-visible read-only settings context.
- `pnpm agent:registry:check` recognizes that the protected readiness surface exists while continuing to report external registration as `blocked_by_policy` until runtime endpoint, auth/scopes, trust evidence, registry targets, and human approval exist.
- AGENT-007 does not create a public agent directory, runtime agent endpoint, route handler, external NANDA Index registration, external collaboration runtime, schema change, migration, seed, DB write, provider write, secret access, token/cookie handling, telemetry/certification claim, autonomous action, or public output.

## AGENT-008 Agent Collaboration And External Protocol Gap Research Acceptance

- `docs/07_research-and-design/RES-004_agent-collaboration-nanda-gap-research.md` exists and answers the owner questions about module-specific agents, CLI/API step operation, single-agent commands, group-agent commands, agent-to-agent conversation, and NANDA/A2A/MCP external collaboration.
- The research inspects local `ARC-028`, `ARC-029`, generated AgentFacts-lite manifests, and `pnpm agent:op` current dry-run capability before proposing new runtime surfaces.
- The research records primary or official source links for NANDA/AgentFacts, A2A, and MCP when protocol behavior informs the plan.
- `PLN-060_task-backlog.md`, `PLN-061_current-sprint.md`, `tasks.md`, and loop state route the next no-proof user-directed agent-collaboration work to `AGENT-009` after `AUTH-005` and `WORK-009` preemption checks.
- Follow-up rows exist for protected agent operation API dry-run, per-module agent workspace command catalog, internal multi-agent task/message bus, owner AI command center, and external adapter approval package.
- AGENT-008 does not create a runtime endpoint, protected API route, public route, public agent directory, external NANDA Index registration, A2A publication, MCP registry/server exposure, external collaboration runtime, schema change, migration, seed, DB read/write, provider call, secret access, token/cookie handling, telemetry/certification claim, autonomous action, or public output.
- External registration remains `blocked_by_policy`, every manifest remains `externalRegisterable: false`, and direct DB access by external agents remains blocked.

## AGENT-009 Protected Agent Operation API Contract Acceptance

- `src/lib/contracts/agent-operation-api.contract.ts` exists as the machine-readable protected API/BFF contract for `POST /api/agent-operations/dry-run`.
- `pnpm agent:api:check` exists and can verify the contract, shared service, and route state.
- The contract mirrors the `pnpm agent:op` dry-run operation catalog; AGENT-010 expands the shared catalog from the initial two operations to 10 per-module operations.
- The contract declares request fields, forbidden input fields, response shapes, `requireUser()` and owner/admin authorization flow, generated AgentFacts-lite registry lookup, no-store responses, and future append-only audit mapping.
- AGENT-009 originally stayed contract-only until explicit mock-owner approval or `AUTH-005` proof. AGENT-014 now records the explicit owner-directed internal route implementation.
- AGENT-009 does not create a public route, public agent directory, external NANDA Index registration, A2A publication, MCP registry/server exposure, provider calls, schema changes, migrations, seeds, DB writes, secret reads, autonomous execution, high-risk final writes, external agent database access, or public output.
- External registration remains `blocked_by_policy`, every manifest remains `externalRegisterable: false`, and the next protocol slice is `AGENT-010` per-module agent workspace command catalog unless `AUTH-005` or `WORK-009` can preempt.

## AGENT-014 Protected Agent Operation HTTP Route Acceptance

- `src/app/api/agent-operations/dry-run/route.ts` exists as an internal protected route for `POST /api/agent-operations/dry-run`.
- The route is request-time dynamic, uses Node runtime, calls `requireUser()`, and allows only `OWNER` role before building a dry-run proof.
- The route accepts only JSON with `operationId` and `mode: "dry_run"` plus safe optional labels; invalid JSON, non-dry-run modes, mismatched agent/target overrides, secret-like keys, or secret-like values fail closed.
- `src/lib/services/agent-operation.service.ts` is server-only and builds the same operation proof shape from generated internal AgentFacts-lite registry files without reading private records.
- Responses use `Cache-Control: private, no-store, max-age=0` and expose only UI-safe DTO fields: operation, manifest readiness snapshot, registry readiness snapshot, safety flags, validation flags, and next review text.
- `pnpm agent:api:check` reports `protected_route_ready`, verifies the route/service/contract markers, and confirms the route remains internal, owner-only, dry-run-only, no-write, no-provider, no-external-registry, and no-autonomous-execution.
- AGENT-014 does not create an external/public endpoint, public agent directory, external NANDA Index registration, A2A publication, MCP registry/server exposure, provider call, Prisma schema change, migration, seed, DB write, persisted audit event, high-risk final write, external agent database access, or public output.
- External collaboration remains `HUMAN_APPROVAL_REQUIRED`; every manifest remains `externalRegisterable: false`.

## AGENT-010 Per-Module Agent Workspace Command Catalog Acceptance

- `src/lib/contracts/module-agent-command-catalog.contract.ts` exists as the shared command catalog for module agent workspaces.
- The catalog covers exactly 10 module keys: Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.
- Each command declares a stable operation id, module key, owner agent, target module, risk level, approval level, allowed `dry_run` mode, scopes, proposal outputs, blocked writes, source references, UI entry surface, protected HTTP dry-run payload, and CLI dry-run command.
- `MODULE_AGENT_OPERATION_API_OPERATIONS` maps the command catalog into `AgentOperationApiOperation` rows, and `src/lib/contracts/agent-operation-api.contract.ts` imports that shared source instead of maintaining a separate operation list.
- `scripts/agent-operation-dry-run.mjs` lists and dry-runs the same 10 operation ids through `pnpm agent:op -- --list` and `pnpm agent:op -- --operation <operation-id> --json`.
- `pnpm agent:commands:check` reports `ready_for_module_agent_workspace_use` only when catalog coverage, CLI parity, API contract sourcing, referenced docs, and forbidden runtime markers pass.
- High-risk modules remain proposal-only: Finance, Life, Company, Client Portal, AI Input source workflow, public output, auth/permission, and external collaboration keep human approval where required.
- AGENT-010 does not create a new route handler, external/public endpoint, public agent directory, external NANDA Index registration, A2A publication, MCP registry/server exposure, provider call, Prisma schema change, migration, seed, DB write, persisted audit event, autonomous execution, high-risk final write, external agent database access, or public output.
- External collaboration remains `HUMAN_APPROVAL_REQUIRED`; every manifest remains `externalRegisterable: false`, and `AGENT-011` should define the internal multi-agent task/message bus before any group-agent runtime.

## AGENT-011 Internal Multi-Agent Task Message Bus Acceptance

- `docs/02_architecture-and-rules/ARC-032_internal-multi-agent-task-message-bus-contract.md` exists as the architecture source for the internal multi-agent task/message bus.
- `src/lib/contracts/agent-task-message-bus.contract.ts` exists as the machine-readable internal bus contract.
- The implementation contract defines task/thread, participant, message, message part, proposal output, lifecycle, approval, redaction, retention, and audit mapping shapes before any live group-agent UI.
- The contract maps internal participants to generated AgentFacts-lite labels and maps allowed operations to the 10 `AGENT-010` command ids.
- The task lifecycle allows proposal/dry-run states such as `draft`, `submitted`, `working`, `input_required`, `proposal_ready`, `approved_for_manual_action`, `rejected`, `blocked`, and `completed_no_write`; it does not allow autonomous execution or final-write states.
- High-risk modules and public-output surfaces remain approval-required and write-blocked.
- `pnpm agent:bus:check` verifies contract markers, catalog operation alignment, AgentFacts-lite label alignment, high-risk gates, external participant runtime disabled state, required docs, and forbidden runtime markers.
- AGENT-011 does not create a live group chat, route handler, server action, public endpoint, external agent runtime, NANDA Index registration, A2A publication, MCP registry/server exposure, provider call, Prisma schema change, migration, seed, DB read/write, persisted audit event, autonomous execution, high-risk final write, external agent database access, or public output.
- `AGENT-012` owner AI command center may use this bus only after the contract and checker pass, and it must remain protected owner-only and proposal-first.

## AGENT-012 Owner AI Command Center Acceptance

- Protected `/agents` exists inside the dashboard shell, checks the current user role, and exposes an owner-facing AI command center entry from the sidebar only for OWNER-role accounts.
- `src/lib/services/agent-command-center.service.ts` is server-only and builds `OwnerAgentCommandCenterContract` from the `AGENT-010` module command catalog and the `AGENT-011` internal task/message bus.
- The command center covers 10 bounded module operations, single-agent mode, group-agent mode, four internal groups, proposal outputs, blocked actions, participants, risk level, approval level, lifecycle state, CLI dry-run command, and protected HTTP dry-run parity.
- The UI lets the owner choose a single agent or an internal group, select a bounded command, draft an instruction, create a local proposal packet, and inspect participants, approval/write boundaries, dry-run parity, and safety state.
- Proposal packet creation is local UI state only. It does not call the protected dry-run HTTP route, create a server action, persist a task/thread, call a provider, read/write DB rows, expose a public route, or enable external agent runtime.
- The safety contract keeps `protectedOwnerOnly`, `proposalOnly`, `writeBlocked`, and `externalRegisterable: false`; high-risk modules remain human-approval-gated.
- Loop 77 evidence for `pnpm agent:command-center:check` reported `protected_owner_command_center_ready` when route/page/client/service/sidebar/package markers passed, operation ids aligned with AGENT-010/AGENT-011, referenced docs existed, and forbidden runtime markers remained absent; `AGENT-015` extends this checker to validate the protected dry-run proof panel.

## AGENT-015 Protected Command Center Dry-Run Proof Panel Acceptance

- Protected `/agents` lets an OWNER-role user run the currently selected command through same-origin `POST /api/agent-operations/dry-run` with `mode: "dry_run"`.
- The UI keeps local proposal packet state distinct from server dry-run proof state.
- The proof panel renders UI-safe fields from `AgentOperationDryRunProof`, including operation id, status, validation flags, safety flags, registry readiness, and next review action.
- Unauthenticated, unauthorized, invalid JSON, non-dry-run, mismatched override, or validation-failure responses render as no-secret UI error states.
- The route remains the existing internal protected route from `AGENT-014`; no external/public endpoint is added.
- `scripts/check-agent-command-center.mjs` and `pnpm agent:command-center:check` report `protected_owner_dry_run_proof_panel_ready` only when route/client/service/package markers, one allowed same-origin dry-run fetch, and no forbidden server/network/runtime markers pass without requiring a live external session.
- `AGENT-015` does not add execute mode, route handlers beyond the existing protected dry-run route, server actions, Prisma schema changes, migrations, seed data, DB reads, DB writes, provider calls, public output, persisted audit events, high-risk final writes, autonomous execution, external agent database access, public AgentFacts/Agent Card output, or external registration.
- External collaboration remains `HUMAN_APPROVAL_REQUIRED`; every manifest remains `externalRegisterable: false`.

## AGENT-016 Per-Module Agent Operation Readiness Matrix Acceptance

- Protected `/agents` exposes a per-module readiness matrix derived from the existing `AGENT-010` command catalog, `AGENT-011` bus contract, `AGENT-014` protected dry-run route, and `AGENT-015` command center proof panel.
- The matrix covers exactly 10 module keys: Work, Research, AI Input, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.
- Each row shows operation id, owner agent, target module, risk level, approval level, CLI dry-run command, protected HTTP dry-run payload, internal bus/group route, proposal outputs, blocked writes, audit readiness, and external registration state.
- High-risk modules preserve `HUMAN_APPROVAL_REQUIRED` or equivalent owner approval flags and make final writes/public-output/external sharing unavailable.
- CLI, API, bus, and command center operation ids remain aligned with the shared catalog.
- External registration remains `externalRegisterable=false`; no public AgentFacts, Agent Card, MCP, A2A, NANDA Index registration, external collaboration runtime, or external agent DB access is added.
- `pnpm agent:command-center:check` verifies matrix markers, 10-module coverage, CLI/API/bus parity, high-risk approval markers, no execute mode, no DB/provider writes, no public endpoint expansion, and no external registration.
- `AGENT-016` must complete the page requirement understanding score gate before runtime UI edits. The first implementation pass should stop before route handlers, server actions, Prisma schema changes, migrations, seed changes, DB reads/writes, provider calls, persisted audit events, high-risk final writes, autonomous execution, public output expansion, or external registration.
- Loop 98 completed this acceptance slice. Page requirement understanding scored `88/100` (High) and completed 3 same-issue research rounds: local PRD/code/Next fit, SaaS/OS matrix pattern, and NANDA/AgentFacts/MCP/A2A risk boundary. `OwnerAgentCommandCenterContract` now reports `AGENT-016`, version `0.3.0`, status `protected_owner_module_readiness_matrix_ready`, and 10 `moduleReadinessRows` derived from the existing command catalog and bus contract.
- Loop 98 evidence for `pnpm agent:command-center:check` reported `protected_owner_module_readiness_matrix_ready`. The checker now validates matrix markers, 10 operation ids, 4 internal groups, one allowed same-origin dry-run fetch, no server network calls, no DB/provider/env reads in the command center, and `externalRegisterable: false`.

## AGENT-OPS-001 Owner-Only Agent Operation Dry-Run Acceptance

- `docs/02_architecture-and-rules/ARC-029_agent-operation-dry-run-contract.md` exists as the canonical owner-only operation contract.
- `scripts/agent-operation-dry-run.mjs` exists and is exposed as `pnpm agent:op`.
- `pnpm agent:op` reads generated AgentFacts-lite registry files only and writes a no-secret dry-run proof packet.
- The operation catalog declares stable operation ids, owner agent, target module, risk level, approval level, data visibility, scopes, input contract, output contract, CLI command, future protected API shape, UI surface refs, audit refs, source refs, and blocked actions.
- `pnpm agent:op -- --list` lists the operation catalog without writing proof output.
- `pnpm agent:op -- --json --out <path>` writes JSON with `status = ready_for_owner_dry_run` for valid dry-run operations.
- `--run` and `--execute` are not supported and must not perform side effects.
- The script does not read environment variables, cookies, tokens, raw auth claims, provider payloads, database URLs, database hosts, profile IDs, or private records.
- The script does not call Prisma, Supabase, AI providers, deployment providers, or external registries.
- AGENT-OPS-001 does not create a public route, protected API route, runtime agent endpoint, public agent directory, external NANDA Index registration, external collaboration runtime, schema change, migration, seed, DB write, provider write, telemetry/certification claim, autonomous action, or public output.
- External registration remains `blocked_by_policy`, every manifest remains `externalRegisterable: false`, and direct DB access by external agents remains blocked.

## WORK-001 Action/Service Boundary Acceptance

- `src/app/actions/work.ts` is the canonical public Work server action surface.
- `src/lib/services/project.service.ts` owns Work Prisma reads/writes and authorization checks.
- `src/lib/actions/work.ts` does not directly import Prisma or `db`.
- Mutation actions call `requireUser()` and delegate resource checks to the service layer.
- Actions return UI-safe view models through `work.mapper.ts` or `ActionResult<void>`.
- Work UI wiring remains scoped to follow-up tasks.

## WORK-002 Project Create Acceptance

- `AddProjectDialog` calls the canonical `createProject(input)` server action.
- Manual create preserves the existing `name` and optional `clientName` fields.
- AI-preview create submits editable `previewName`, `previewClient`, and `previewDue` fields.
- Submit buttons show a pending state and prevent duplicate submits.
- Successful create closes/resets the dialog and refreshes `/work`.
- Failed create keeps the dialog open and shows an error without silently losing form data.
- Client Component code does not import Prisma model types.
- Project creation persists in the DB and appears in the `/work` route output after refresh.
- Full browser click-through can be repeated during `WORK-007`.

## WORK-003 Task CRUD Acceptance

- `TaskList` calls canonical task actions from `src/app/actions/work.ts`.
- Task add uses `addProjectTask(projectId, input)`.
- Task toggle uses `toggleProjectTaskComplete(taskId)`.
- Add and toggle actions call `requireUser()` and service-layer project/resource checks.
- Task action inputs remain UI-safe and do not expose Prisma model types to Client Components.
- Add task shows a pending state, prevents duplicate submit, and keeps the sheet open on failure.
- Toggle completion shows a pending state, prevents duplicate toggle, and rolls back on failure.
- Successful task changes refresh `/work/[projectId]`.
- Task add/toggle persist in the DB and appear in the project detail route output after refresh.
- `updateProjectTask` and `deleteProjectTask` contracts remain available, but UI wiring can wait until edit/delete controls exist.
- Project progress consistency is handled by `WORK-006`.

## WORK-004 Note CRUD Acceptance

- `NoteTimeline` calls canonical note actions from `src/app/actions/work.ts`.
- Note add uses `addProjectNote(projectId, input)`.
- Note pin/unpin uses `toggleProjectNotePin(noteId)`.
- Add and pin actions call `requireUser()` and service-layer project/resource checks.
- Note action inputs remain UI-safe and do not expose Prisma model types to Client Components.
- Add note shows a pending state, prevents duplicate submit, and keeps the dialog open on failure.
- Pin/unpin shows a pending state, prevents duplicate toggles, and rolls back on failure.
- Successful note changes refresh `/work/[projectId]`.
- Note add/pin persist in the DB and appear in the project detail route output after refresh.
- New notes created from `AddNoteDialog` remain internal-only in WORK-004.
- Research-linked notes that are projected into the timeline but are not Work DB note records remain read-only for pin mutation.
- `updateProjectNote` and `deleteProjectNote` contracts remain available, but UI wiring can wait until edit/delete controls exist.
- Notes do not appear in `/client/[token]`; future public note exposure requires explicit human approval and ClientPortalAgent/AuthPermissionAgent review.

## WORK-005 Deliverable CRUD Acceptance

- `DeliverableTree` calls canonical deliverable actions from `src/app/actions/work.ts`.
- Deliverable create uses `createProjectDeliverable(projectId, input)`.
- File status update uses `updateProjectDeliverable(deliverableId, { status })`.
- File visibility toggle uses `updateProjectDeliverableVisibility(deliverableId, visibility)`.
- Create/status/visibility actions call `requireUser()` and service-layer project/resource checks.
- Deliverable action inputs remain UI-safe and do not expose Prisma model types to Client Components.
- Add deliverable shows a pending state, prevents duplicate submit, and keeps the dialog open on failure.
- Status/visibility updates show a pending state, prevent duplicate updates, and roll back on failure.
- Successful deliverable changes refresh `/work/[projectId]`.
- Deliverable create/status/visibility persist in the DB and appear in the project detail route output after refresh.
- Deliverables remain internal by default unless explicitly marked `client_visible`.
- WORK-005 does not expose any deliverables through `/client/[token]`; future Client Portal DB behavior must filter only `client_visible` deliverables and receive ClientPortalAgent/AuthPermissionAgent review.
- `updateProjectDeliverable` and `deleteProjectDeliverable` contracts remain available, but broad metadata edit/delete UI wiring can wait until matching controls exist.

## WORK-006 Project Progress Acceptance

- Project progress uses Strategy A: derived progress from actual `ProjectTask` rows at read time.
- `/work` project list view models derive `tasksDone` and `tasksTotal` from task status rows.
- `/work/[projectId]` detail view models derive `tasksDone` and `tasksTotal` from included task rows.
- `tasksDone` counts only tasks with DB status `DONE`.
- `tasksTotal` counts actual task rows for the project.
- Existing `Project.tasksDone` and `Project.tasksTotal` DB columns remain untouched but are not the runtime source of truth when task rows are available.
- Task mutation functions do not need to maintain snapshot counters transactionally.
- Adding a TODO task increases `tasksTotal` after refresh/read.
- Toggling a task to DONE increases `tasksDone` after refresh/read.
- New projects with zero tasks show safe `0/0` progress.
- Client Components continue to receive UI-safe `Project` view models and do not import Prisma model types.

## WORK-008 Disposable Work Refresh Proof Harness Acceptance

- `scripts/work-refresh-proof.mjs` exists and is exposed as `pnpm work:proof`.
- `pnpm work:proof` defaults to dry-run mode and performs no database writes.
- Run mode requires explicit write confirmation through `--run`, `PERSONAL_OS_WORK_PROOF_ALLOW_WRITES=1`, and `PERSONAL_OS_WORK_PROOF_CONFIRM=I_UNDERSTAND_THIS_WRITES_TEST_DATA`.
- The preferred target is `WORK_PROOF_DATABASE_URL`; using `DATABASE_URL` requires an explicit `--use-database-url` flag.
- Remote proof targets require `WORK_PROOF_DATABASE_URL` plus `PERSONAL_OS_WORK_PROOF_ALLOW_REMOTE=1`.
- The proof creates proof-only profile/project/task/note/deliverable records, reconnects with a new Prisma client, verifies the records refreshed, verifies derived task progress from task rows, then cleans up proof records.
- The proof output does not print database URLs, database hosts, profile IDs, project IDs, task IDs, note IDs, deliverable IDs, cookies, tokens, raw claims, provider payloads, or secret values.
- `docs/08_acceptance-and-qa/ACC-004_work-refresh-proof-harness.md` documents setup, run, cleanup, expected markers, and the relationship between `WORK-008` and final `WORK-007`.
- `WORK-008` does not apply migrations, seed data, or write to any database unless the operator explicitly targets a disposable/local DB and sets the required confirmation variables.

## Agent Team OS Acceptance

- Internal agents are documented.
- Boundary policy exists.
- Skill registry matches actual skill folders.
- Future external collaboration is documented as adapter-only.
- No full runtime agent marketplace is built in early phases.

## DB Contract Acceptance

- Prisma schema is treated as canonical for v0.1.
- Supabase migration drift is documented.
- Seed flow is reviewed.
- Enum casing strategy is explicit.
- RLS vs app-layer authorization assumptions are explicit.

## DB-006 Fresh Bootstrap Acceptance

- Verification uses a disposable local PostgreSQL database only.
- Baseline Prisma migration applies cleanly from an empty database.
- Seed runs successfully twice in the same database.
- Demo row counts remain stable after the second seed run.
- Expected seed footprint is documented before Work CRUD starts.
- `pnpm build` result is recorded.
- No remote Supabase or production database is modified.

## Data Operations Layer Acceptance

- `DATA-001` defines the interface/data/governance plan without runtime or schema changes.
- `DATA-002` produces a reviewed persistence contract before adding data operations models.
- `DATA-003` remains UI-only/mock unless a separate persistence task is approved.
- Write intents, approvals, lineage, and source metadata are preserved in any future persistence design.
- High-risk modules continue to require human approval before final writes or public/external exposure.
- External agent collaboration remains a future adapter concept, not a required dependency for v0.1.

## Source Asset / Document Attribute Layer Acceptance

- `DATTR-001` defines the source asset contract without runtime or schema changes.
- The contract covers Google Docs, Drive files, Markdown, HTML/web pages, PDF/DOCX/plain text, images, video, audio, links/bookmarks, LINE/Telegram messages, spreadsheet/CSV, JSON/API responses, presentations/slides, calendar events, contact/profile pages, and AI conversation exports.
- URL/bookmark records are treated as locators; fetched HTML/web pages are treated as content assets with canonical URL, fetched time, snapshot, and content hash.
- Link-to-HTML sync keeps both records: the captured `LINK` asset preserves original URL and capture context, while the fetched `WEB_PAGE` asset preserves requested/final/canonical URL, content type, HTTP status, fetched time, content hash, and snapshot version.
- Static HTML fetching is audited through `SourceFetchRun`; public fetches respect robots.txt policy, and authenticated/private/paywalled links require explicit source connection and approval.
- `assetKind`, `format`, `mimeType`, storage mode, external IDs, local paths, URL, revision, and content hash identify the source.
- `interpretationKind`, `workflowState`, review state, module hint, risk level, and visibility describe how Personal OS currently uses the source.
- Media and structured-data extraction preserves evidence addressing: image region/bounding box, audio/video timecode, document page/heading/offset, HTML selector/heading/offset, spreadsheet range, and JSON pointer.
- `SourceActionItem` does not replace `ProjectTask`; Work task creation must go through `ModuleWriteIntent`, `requireUser()`, and Work service authorization.
- LINE / Telegram source intake preserves provider IDs, conversation/chat IDs, message IDs, event/update IDs, sender metadata, timestamp, signature or dedupe status, attachments, source URLs, privacy scope, and deletion/unsend events.
- Messaging attachments become linked source assets instead of being flattened into message text.
- High-risk source assets, client-visible outputs, finance/life/company strategy data, and external agent sharing require explicit human approval before final write or public exposure.
- `DATTR-002` must produce schema proposal and migration impact before adding any Prisma models.
- `DATTR-009` must list source types, input mechanisms, SourceAsset mappings, identity metadata, extraction paths, risks, and missing input concerns before runtime connectors.
- `DATTR-010` must define a shared adapter lifecycle for connect, preview, import, normalize, propose, sync, pause, and revoke.
- `DATTR-011` must be completed before implementing link fetchers, messaging webhooks, clipboard background reads, media capture, or large-file storage.

## Composite Data Unit Layer Acceptance

- `DATTR-013` defines `SourceAsset` as atomic source identity, `DataUnit` as editable composite grouping, and module record as final domain data.
- `SourceAsset pool` allows assets to remain ungrouped, suggested, candidate, selected, excluded, removed, or reused across multiple DataUnits.
- `SourceNamingProfile` preserves `originalName` forever and treats `canonicalName` as internal semantic naming, not external file rename.
- Universal naming convention supports full and simplified formats such as `INT-2026-001__transcript__王小明訪談.md` and `INT-2026-001_transcript.md`.
- SourceAsset type and DataUnit role are separate dimensions.
- Role and grouping inference signals preserve signal type, matched value, proposed unit code/kind/role, confidence, explanation, and timestamp.
- AI auto action levels and confidence thresholds are documented.
- High-risk records require user confirmation even when AI confidence is high.
- `DataUnitProposal` is not final; accepted or partially accepted proposals create formal DataUnits and selected links only.
- `DataUnitTemplate` slots are suggestions and policy hints, not actual selected assets.
- `DataUnitAssetLink` stores role, membership status, provenance, include flags, order, and selection reason.
- Membership statuses are defined: `selected`, `user_selected`, `ai_selected`, `auto_selected`, `candidate`, `suggested`, `excluded`, `removed`.
- `DataUnitAnnotation` supports researcher notes, AI summaries, coding, interpretations, questions, memos, decisions, and module notes without polluting raw SourceAssets.
- AI summaries and AI coding are draft annotations or evidence aids, not final research conclusions.
- Parent-child provenance for audio, transcript, AI summary, and AI coding is preserved through links, extraction refs, annotations, or future derived-asset relations.
- DataUnit Composer behavior is documented, including accept/reject naming, merge/split proposals, slot state, excluded assets, and import to Research.
- DataUnit does not bypass `ModuleWriteIntent`, `requireUser()`, or module service authorization.
- `DATTR-017` must translate this layer into schema proposal and migration impact before any Prisma migration.

## AI Source Workflow Operating Layer Acceptance

- `DATTR-015` defines AI Input as an AI Source Workflow Console, not only an import page or data management UI.
- Source workflow flow is documented: environment setup, trigger, recognition, organization, naming/metadata/quality/risk, DataUnit proposal, organizing result, anomaly detection, morning brief reporting, conversation correction, and correction run.
- Source Environment Workflow is defined for source-specific handling rules such as sync frequency, source scope, default module, risk level, morning brief inclusion, and anomaly conditions.
- Source Organizing Workflow is defined for manual imports, scheduled sync, source events, conversation mentions, morning brief follow-ups, and system retries.
- Source Correction Workflow is defined for user corrections in AI conversation and preserves original results instead of overwriting provenance.
- `AIWorkflowRun` is defined as the observable run record for source and AI workflows.
- `AIWorkflowStep` is defined as step-level audit trail inside one run.
- `AIWorkItem` is defined as the user-facing review card for naming suggestions, classification suggestions, DataUnit proposals, risk alerts, missing context, module routing questions, source quality warnings, correction requests, and morning brief alerts.
- Morning brief is defined as anomaly and summary reporting layer for workflow uncertainty, high-risk fragments, important opportunities, failures, required decisions, important new source summaries, and source workflow anomalies.
- `@` mention targets include `SourceAsset`, `DataUnit`, `DataUnitProposal`, `AIWorkflowRun`, `AIWorkItem`, `MorningBriefItem`, and `ModuleRecord`.
- Mention intent classification is documented: supplement context, correct classification, rerun workflow, create/update DataUnit proposal, propose module write, resolve work item, or ask for explanation.
- AI Import Workbench tabs are documented: 今日 Workflow, 需要確認, 來源環境, 整理結果, 工作紀錄.
- UI guidance says the default display should be status summary, needs-confirmation cards, and recent logs, not a full workflow graph.
- High-risk source workflow outputs require review before public/client-visible, finance, life, company strategy, or auth/permission writes.
- Workflow outputs do not directly write module SSOT records and must go through `ModuleWriteIntent` and module service authorization.
- DATTR-015 is architecture/type-proposal only; no runtime workflow persistence, connector, URL fetch, OCR/transcription, Prisma schema change, migration, or module SSOT write is added.
- `DATTR-016` implements the UI-only/mock workbench prototype task.
- The previous Composite Data Unit schema proposal is shifted to `DATTR-017` so the schema can include SourceAsset, Single Source Recognition, Composite DataUnit, AIWorkflowRun, and AIWorkItem together.

## DATTR-016 AI Import Workbench UI Acceptance

- `/ai-input` remains an AI conversation-first page.
- A right-side AI 工作台 / Source Workflow Console is available on wide desktop viewports.
- The workbench is UI-only/mock and clearly marked as mock.
- Workbench summary shows today's workflow count, completed count, and review count.
- Workbench tabs exist and are clickable: 今日 Workflow, 需要確認, 來源環境, 整理結果, 工作紀錄.
- 今日 Workflow shows source workflow run cards with mentionable run IDs.
- 需要確認 shows review cards for classification uncertainty and high-risk source fragments.
- 來源環境 shows source handling rules such as cadence, default module, risk, and morning brief behavior.
- 整理結果 shows DataUnitProposal, naming, context, or organizing result summaries.
- 工作紀錄 shows a concise workflow event log.
- Existing AI input conversation, quick import buttons, @mention picker, and triage proposal flow remain available.
- No real connector runtime, scheduled sync, URL fetch, OCR/transcription, workflow persistence, Prisma schema change, migration, or module SSOT write is added.
- Typecheck, targeted eslint, Prisma validate/generate, and browser MVP checks are recorded.

## DATTR-018 AI Input Mobile Workbench Acceptance

- `/ai-input` remains conversation-first on mobile and desktop.
- Full three-column layout appears only on wide desktop viewports.
- Below `xl`, the AI Input page exposes a compact mobile/tablet control area instead of fixed sidebars.
- The mobile control area includes a collapsible `對話與來源` section.
- The mobile control area includes a collapsible `AI 工作台` section.
- Conversation groups such as `一般對話` and `專案` can collapse and expand.
- Workbench content sections can collapse and expand.
- Workbench tabs remain clickable on mobile/tablet: 今日 Workflow, 需要確認, 來源環境, 整理結果, 工作紀錄.
- Existing AI conversation, quick import buttons, @mention picker, and triage proposal flow remain available.
- No real connector runtime, scheduled sync, URL fetch, OCR/transcription, workflow persistence, Prisma schema change, migration, or module SSOT write is added.
- Typecheck, targeted eslint, and in-app browser mobile interaction checks are recorded.

## DATTR-019 AI Input Cowork Source Panel Acceptance

- `/ai-input` preserves an immediate AI cowork entry; users do not need to configure a source tree before starting a conversation.
- The conversation/source area is separated into three views: `共作`, `來源`, and `結構`.
- `共作` shows a direct start action, cowork starter cards, and past conversation groups.
- `來源` shows selected conversational source context, source pool counts, and quick source context choices.
- `結構` shows lower-level source structure controls without making them the default first interaction.
- Desktop keeps the cowork/source panel visible beside the conversation on wide viewports.
- Mobile/tablet keeps the same three source views inside the collapsible `對話與來源` section.
- Selecting a cowork starter should set up a useful prompt and move the user toward source context without sending data automatically.
- Source context chips remain removable and are treated as conversation context, not module writes.
- No real connector runtime, scheduled sync, URL fetch, OCR/transcription, workflow persistence, Prisma schema change, migration, or module SSOT write is added.
- Typecheck, targeted eslint, and in-app browser tab/collapse checks are recorded.

## DATTR-021 AI Input Source IA Clarification Acceptance

- `/ai-input` uses subpage-style navigation instead of showing every source/workflow surface at once.
- The subpage labels are clear: `AI 對話`, `參考脈絡`, `同步設定`, and `AI 工作台`.
- `AI 對話` remains the default entry and preserves immediate AI coworking.
- `參考脈絡` only manages sources referenced by the current AI conversation.
- `參考脈絡` clearly states that selected sources do not sync, archive, write module data, or become final module records.
- `同步設定` only manages how sources enter the system, such as LINE / Drive / Resource scope.
- `同步設定` clearly states that it is not used to choose current conversation references.
- `AI 工作台` uses table-style workflow rows rather than nested cards.
- The page avoids rendering separate desktop sidebars and mobile accordions for the same concepts.
- No real connector runtime, scheduled sync, URL fetch, OCR/transcription, workflow persistence, Prisma schema change, migration, or module SSOT write is added.
- Typecheck and targeted eslint are recorded; browser automation may be skipped only if the browser tool is unavailable.

## DATTR-022 AI Input Sync Connector Status Acceptance

- `同步設定` first presents external connector and sync status, not a source folder/resource tree.
- The page shows multiple source categories such as LINE, Google Drive folders, RSS, Telegram, Gmail, GitHub/Markdown, and manual import. Google Docs/Sheets/Slides appear as Drive file subtypes, not separate connection providers.
- Each row shows connector state such as connected, needs setup, planned, paused, or error.
- Each row shows sync state such as completed, needs review, idle, running, not configured, or failed.
- Each row shows source scope, sync cadence, last sync, next sync, default module hint, risk level, and review condition.
- The page still states that it is UI-only/mock and does not run real connectors, scheduled sync, DB writes, or module SSOT writes.
- The page distinguishes connector/sync settings from current-conversation `參考脈絡`.
- Source review policy is visible so high-risk, ambiguous, or low-quality sources become AI work items instead of direct module writes.
- The UI avoids nested card-heavy layout and uses compact operational tables.
- The AI 對話 landing heading has visible breathing room below the top navigation.
- No Prisma schema change, migration, connector runtime, URL fetch, OCR/transcription, workflow persistence, or module write is added.
- Typecheck, targeted eslint, and whitespace check are recorded.

## DATTR-010 SourceConnection / InputAdapter Contract Acceptance

- `docs/architecture/source_connection_input_adapter_contract.md` exists.
- The contract defines `InputAdapter` as the provider-facing intake boundary and `SourceConnection` as the user-owned configured source scope.
- Provider families include manual, local file, local/repo Markdown, URL/web page, RSS/Atom, LINE, Telegram, Gmail, Google Drive, Google Docs, Calendar, Contacts, GitHub, clipboard, browser capture, media capture, API/webhook, client portal, and external AI outputs.
- Adapter manifests declare provider, version, source kinds, auth modes, sync modes, capabilities, scopes, default risk, attachment support, deletion-event support, incremental sync, and preview support.
- Source scopes distinguish provider accounts from selected folders, chats, feeds, labels, repo paths, calendars, contacts, URLs, and file surfaces.
- Consent state records granted, expired, revoked, needs-review, and not-required states.
- Adapter lifecycle is standardized: discover, connect, authorize, preview, import_selected, normalize, propose, sync, pause, resume, and revoke.
- Sync cursor strategy is documented for LINE, Telegram, Gmail, Drive/Docs, RSS/Atom, GitHub, Calendar, Contacts, local/repo files, and URL/web snapshots.
- Dedupe priority and provider-specific dedupe key examples are documented.
- Deletion, unsend, archive, permission removal, unavailable, and revocation events are preserved as provenance/tombstone signals instead of silent deletion.
- Attachment graph rules keep message/email/event/document/link/derived artifacts as linked source candidates instead of flattening them into message text.
- BFF-visible loaders/actions are defined for adapter manifests, source connections, preview, scope updates, pause/resume/revoke, sync runs, run history, preview import, and review flow.
- Client Components must not call external providers directly or receive provider secrets/tokens.
- Adapter runs can relate to `AIWorkflowRun` and produce `AIWorkItem` review cards.
- Adapter outputs may create source/proposal intents, but do not write final module SSOT records.
- DATTR-011 remains required before URL fetching, webhooks, clipboard capture, media capture, large-file storage, or production connector runtime.
- `src/types/ingestion.ts` includes proposal-only adapter types without changing runtime behavior.
- No Prisma schema change, migration, connector runtime, Supabase write, URL fetch, webhook route, OCR/transcription, storage, scheduler, or module SSOT write is added.

## FOPS-001 Frontend Operating Surface Acceptance

- `docs/architecture/frontend_operating_surface.md` exists.
- `docs/dev/D-PLAN-011-frontend-operating-surface-plan.md` exists.
- `AGENTS.md` UIUX rules include clear operating surfaces, primary attention, module Agent workspace, records/audit, and anti-card-heavy guidance.
- The common module pattern is documented: overview/attention, agent workspace, records/audit, settings/boundaries, and domain-specific subpages.
- Page attention rules are documented so each page exposes the primary 1-3 things needing attention in the first viewport.
- Module Agent workspace rules are documented as bounded review/proposal surfaces, not toy chatbot panels.
- Records/audit subpage rules prefer filterable tables, timelines, and drilldowns over decorative activity cards.
- Module-specific structure blueprint covers Dashboard, AI Input/Ingestion, Inbox, Work, Research, Workflow, Life, Finance, Chamber, Company, Client Portal, and Agent Team OS.
- Frontend boundary rules distinguish conversation context, sync settings, review items, final module records, audit history, public data, and agent boundaries.
- FOPS task batch is created with `FOPS-001` through `FOPS-008`.
- `docs/agents/task_routing.md` routes `FOPS-*` tasks to UIUXAgent with ProductManagerAgent/module-owner support.
- The task is planning-only and does not add runtime routes, database models, migrations, connector runtime, module writes, or autonomous agents.

## DATTR-017 Source Workflow Schema Proposal Acceptance

- `docs/dev/source_workflow_schema_proposal.md` exists.
- The proposal maps SourceAsset, Single Source Recognition, Composite DataUnit, AI Source Workflow, and ModuleWriteIntent into persistence model groups.
- Current Prisma conventions are preserved: UUIDs via `gen_random_uuid()`, uppercase enum values, snake_case DB mapping, and owner-scoped rows through `Profile`.
- Proposed tables include SourceConnection, RawSourceItem, SourceAsset, SourceAssetSnapshot, SourceAssetLink, AssetAttributeSet, AssetExtraction, NormalizedContent, recognition profiles, SourceNamingProfile, DataUnit tables, AIWorkflowRun, AIWorkflowStep, AIWorkItem, and ModuleWriteIntent.
- Index and uniqueness recommendations are documented.
- Migration is split into staged Migration A-D instead of one large production migration.
- Seed and fixture strategy is conservative and does not backfill mock AI Input data automatically.
- DATTR-024 BFF loader/action surface is outlined.
- Security and governance rules are documented, including high-risk review and no direct module SSOT writes.
- Open questions before migration are recorded.
- No Prisma schema change, migration, connector runtime, Supabase write, or module SSOT write is added.

## DATTR-023 Mock Data Kill Switch And Supabase Readiness Acceptance

- `/ai-input` exposes a visible, persistent toggle for mock data mode.
- The dashboard shell exposes a compact mock/formal mode toggle so the switch is available outside `/ai-input`.
- Mock mode remains available for demo/prototype work and is clearly labeled.
- Formal mode turns off mock source pool rows, mock connector rows, mock workflow rows, mock quick imports, and mock AI workbench data.
- Formal mode keeps the AI cowork conversation entry usable, but mock-only source write actions are blocked.
- Formal mode communicates that AI Input SourceAsset / AIWorkflowRun / AIWorkItem persistence still requires a Supabase-backed BFF.
- The ingestion provider does not create new mock `RawSourceItem`, `NormalizedContent`, `Evidence`, `AITriageProposal`, resource nodes, or mock sync selections while formal mode is active.
- The toggle does not silently migrate, seed, delete, or overwrite any Supabase data.
- The implementation does not add Prisma schema changes, migrations, real connectors, URL fetching, OCR/transcription, workflow persistence, or module SSOT writes.
- A readiness report identifies which modules are DB-backed and which still require Supabase persistence before formal use.
- Follow-up `DATTR-024` is created for Supabase-backed AI Input source workflow persistence.
- Typecheck, Prisma validation, targeted eslint, and whitespace check are recorded.

## DATTR-025 AI Input Formal BFF Readiness Acceptance

- `/ai-input/page.tsx` is a Server Component wrapper and `/ai-input/ai-input-client.tsx` owns interactive client state.
- `src/lib/services/ai-input-readiness.service.ts` is server-only and returns a UI-safe `AIInputFormalReadinessContract`.
- The contract exposes only safe readiness signals: contract id/status, Supabase public config presence as configured/missing, not-persisted counts, safe exposure text, next gates, and prohibited runtime behavior.
- The contract does not expose Supabase URLs/keys, database URLs, hostnames, cookies, tokens, raw claims, provider payloads, OAuth scopes, external account ids, raw source payloads, evidence excerpts, normalized content, external message bodies, document contents, file URLs, Prisma rows, or generated report bodies.
- Formal mode renders the readiness contract in `同步設定` and `AI 工作台` instead of showing mock connector/workflow rows.
- Mock mode remains available for demo/prototype work and keeps existing mock workflow tables.
- Formal mode keeps AI cowork conversation usable while source writes stay blocked until `DATTR-024`.
- `DATTR-025` does not add Prisma schema changes, migration apply, Supabase writes, connector runtime, URL fetching, webhooks, polling, OCR/transcription jobs, provider secret handling, public output expansion, module SSOT writes, or mock fallback in formal mode.
- Verification records typecheck, Prisma validation, build, protected route smoke, launch readiness state, and whitespace/diff checks.

## Single Source Recognition Layer Acceptance

- `DATTR-014` defines Single Source Recognition between `SourceAsset` and `SourceNamingProfile` / `DataUnitProposal`.
- `SourceAsset` is atomic identity; `AssetAttributeSet` is current Personal OS interpretation/workflow state.
- File extension and declared MIME type are treated as weak signals, not source truth.
- `SourceFormatDetection` compares declared MIME, detected MIME, extension, signature, magic bytes, server/browser MIME, content sniffing, and AI guess when applicable.
- Mismatched format signals preserve confidence and warning metadata.
- `SourceDescriptiveMetadata` captures title, creator, contributor, publisher, dates, language, description, tags, rights, license, identifiers, related identifiers, and source citation.
- Descriptive metadata supports search, citation, Research usage, AI retrieval, and DataUnit grouping.
- `SourceProvenanceEvent` records how a source entered and changed, including imported, uploaded, fetched, snapshotted, extracted, transcribed, classified, renamed internally, linked, unlinked, archived, and external deletion detected.
- Parent-child provenance is recorded through events and refs, not only `parentAssetId`.
- `SourceEvidenceSelector` supports text quote, text position, page range, time range, bounding box, JSON pointer, spreadsheet range, DOM selector, and heading path.
- AI and Research should be able to cite relevant fragments, not only entire sources.
- `SourceQualityProfile` distinguishes primary source, derived source, third-party source, AI-generated source, user note, and unknown.
- Quality profile includes reliability, freshness, completeness, verification state, risk notes, and confidence.
- `UrlSafetyCheck` happens before URL fetch or `WEB_PAGE` snapshot creation.
- `LINK` and fetched `WEB_PAGE` are separate assets; requested, final, and canonical URL are preserved separately.
- Localhost, private IP, credential-bearing, token-bearing, private, authenticated, or paywalled URLs require block or manual review by default.
- `MediaMetadataProfile` covers EXIF, GPS, device info, C2PA/content credential signal, AI-generated signal, and privacy action.
- Media with GPS/sensitive metadata should require review or stripping.
- `SourceFairProfile` records whether a source is findable, accessible, interoperable, reusable, persistent, described, licensed, provenanced, and machine-readable.
- Single Source Recognition prepares safer AI-assisted naming and Composite DataUnit grouping.
- Single Source Recognition supports Research evidence and citation but does not write module SSOT records.
- `DATTR-017` must translate DATTR-013, DATTR-014, and DATTR-015 into schema proposal and migration impact before any Prisma migration.

## MODLIB-001 Module-Scoped File/Media Library Contract Acceptance

- `ARC-012` §5A defines a module-scoped File Library and Media Library subpage for seven owner-decided modules: `work`, `research`, `chamber`, `finance`, `life`, `company`, `self` (`RES-016` §0A).
- `ai-input`, `inbox`, `dashboard`, and `workflow` are explicitly out of scope for a second, module-scoped library surface.
- AI Input (`/ai-input` 檔案庫/媒體庫) remains the only upload/ingestion entry point; a module's own library subpage never exposes an upload affordance.
- Classification is modeled as `LibraryAssetModuleLink` rows (many rows per asset, each row a single `moduleKey`), not a raw array field on the asset, to stay consistent with this repo's singular-`targetModule` contract convention.
- Low-risk modules (`work`, `research`, `chamber`, `self`) may show AI-suggested classification directly with an "AI 分類" badge; high-risk modules (`finance`, `life`, `company`) require owner confirmation before a classification appears in that module's library subpage.
- Module-scoped library subpages reuse `FileLibraryPage`/`MediaLibraryPage` via a `mode: "full" | "module_readonly"` prop rather than a bespoke per-module component; `module_readonly` hides upload and all mutating actions, keeping only reference/open/view-info/view-versions/view-references plus `download`/`export`.

## R2STORE-009 Formal File/Media Library Read Acceptance

- Protected dashboard loading reads `FileAsset` and `MediaAsset` through an owner-scoped server-only service and passes only serializable UI DTOs into the shared Client provider.
- Mock and Formal assets and classification links use separate stores. Formal mode never renders `mockFileAssets`, `mockMediaAssets`, or mock classification links.
- A valid owner-scoped query returning zero rows is a usable formal empty state with a first-upload action; it is not replaced by demo rows.
- A failed formal DB read renders an explicit unavailable state with `hiddenMockFallback: true`; it does not silently render mock data.
- Successful formal uploads use the persisted database asset ID/object key in the immediate UI and are reconstructed from the same Postgres row after reload.
- Mock mode does not trigger real R2/Postgres upload writes; the owner must switch to Formal mode before uploading.
- Client Components do not import Prisma, the database client, R2 credentials, or server environment values.
- This acceptance does not add or approve schema migration, public/Client Portal file exposure, cross-owner reads, or external agent access.
- `pnpm library:formal:check`, targeted ESLint, TypeScript, DB validation, production build, and authenticated browser toggle/upload/reload/download are the verification path.

## AIINPUT-CONN-005 Source Connection Persistence Boundary Review Acceptance

- A formal schema/auth/audit review separates provider accounts, credential references, source connections, versioned scopes, policies, cursors, run evidence, and operating audit events before any persistence runtime is enabled.
- Owner/workspace authorization, cross-owner denial, duplicate identity, account reuse, connection revoke impact, retention, cascade behavior, and redacted read DTO boundaries are explicit and testable.
- Legacy `GOOGLE_DOCS` source values are inventoried and mapped reversibly to Google Drive folder connections while retaining Docs/Sheets/Slides subtype and provenance; destructive enum/value removal is not accepted in this task.
- Credentials remain server-only opaque references. Browser token input/storage, provider discovery, OAuth callbacks, webhooks, polling, provider API calls, activation, and configured database writes remain disabled.
- The task produces formal `SCH`/`AUT`/`MIG` proposal artifacts and an executable static checker. It stops before Prisma edits, deployable migrations, migration or RLS apply, provider runtime, public/module final writes, and external registration.

## INTERFACE-003 Interface Checker Drift Acceptance

- `ModuleOperatingShell` continues to require the core overview, operation, agent, records, and settings tabs and may include the optional module library tab.
- `pnpm interface:smoke:check` validates semantic required-tab coverage rather than the obsolete exact five-tab TypeScript union string.
- The checker continues to reject missing core tabs, missing route/safety markers, forbidden database/provider imports, placeholder regressions, or weakened Client Portal containment.
- This task changes the QA harness only; it does not redesign a page, change runtime tab behavior, write data, or make a launch-level claim.

## OWNEROS-001 Product Contraction Documentation Acceptance

- `RPT-062` contains exactly the requested three primary chapters: main/supporting scenarios, scenario-system development status, and remaining gaps before every company member can use the product.
- The v1 main spine is durable conversation/source → structured authorized context → module AI collaboration → Inbox text intervention → documents/tasks → daily/weekly diary → reviewed Rule/Skill candidate → governed team/company reuse.
- V1 includes unified AI chat, AI Input/file library, Inbox, Work, Research, Company, Personal/Team Workspaces, internal AI Public Space, diaries/skills, Google sign-in, LINE, Google Drive and Gmail.
- Finance, Life and Chamber are contracted to collapsed mock/unavailable surfaces; Client Portal is deferred and disabled.
- Personal Private, Team Project, Company Internal, C-level, and future External Client visibility levels are explicit; implementation is blocked before unresolved high-risk decisions.
- Current code evidence distinguishes ready base, partial, mock-only, missing and decision/proof-blocked states without upgrading formal launch level.
- `PLN-067` and `PLN-060` Phase 21 contain implementation-ready `OWNEROS-001..007` scope, dependencies, acceptance, verification, risk and stop conditions.
- NANDA alignment keeps all proposed v1 agents internal/protected and `externalRegisterable: false`; no external agent database access is approved.
- Documentation verification and evidence report pass; no runtime, schema, migration, OAuth/provider, database, deployment, public output, or launch behavior changes.

## OWNEROS-GATE-001 Aggregate Gate Checker Acceptance

Status: `DONE`.

Acceptance:

- `pnpm gate:a:check`, `pnpm gate:b:check`, and `pnpm gate:c:check` emit no-secret JSON packets for Gate A, Gate B, and Gate C.
- Each packet includes Gate id/status, target environment, auth mode, tested commit, deployed commit, freshness, mock fallback use, runtime evidence, owner evidence, individual checks, blocker IDs, report path, report SHA-256, and safety flags.
- The normal commands exit 0 only when all required checks for the selected Gate are current and PASS.
- static/docs/readiness evidence alone cannot pass any Gate.
- Missing, mock, static, proposal-only, conditional, stale, manual-review, single-happy-path, commit-mismatched, no-runtime, no-owner, no-negative, no-report, and no-SHA evidence all fail closed.
- `--allow-incomplete` may be used only to write current blocked proof packets for loop evidence; it does not achieve a Gate.
- Gate checker creation does not trigger Gmail, DB/provider mutation, deployment, public output, launch-level upgrade, or external registration.

Verification:

- `node --check scripts/check-owner-ai-work-desktop-gates.mjs`
- `pnpm gate:a:check -- --allow-incomplete --out <path>`
- `pnpm gate:b:check -- --allow-incomplete --out <path>`
- `pnpm gate:c:check -- --allow-incomplete --out <path>`
- `pnpm gate:a:check` should remain blocked until all Gate A runtime/owner evidence exists.
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## OWNEROS-002A Durable Chat ContextPackage Contract Acceptance

Status: `DONE`.

Acceptance:

- `ARC-035_owner-ai-work-desktop-chat-context-package-contract.md` records the `OWNEROS-002A` research-to-task gate, 88/100 understanding score, three research rounds, selected and rejected patterns, BFF contract, source types, visibility levels, audit/memory rules, NANDA posture, and next staged tasks.
- `src/lib/contracts/owner-ai-work-desktop-chat-context.contract.ts` defines conversation, message, context package, context reference, resolution check, manifest, source type, visibility, authz, retention, runtime flag, stop-condition, and acceptance-row contracts.
- `pnpm owner:chat-context:check` validates the contract/doc/backlog/sprint/tasks/acceptance/index/package markers, required `requireUser()`/workspace/source/redaction/cross-owner checks, source types, visibility levels, runtime-disabled flags, and forbidden side-effect patterns.
- Runtime flags remain fail-closed: no route handler, Server Action, Prisma schema, migration, DB read/write, provider call, email, public output, external runtime, external registration, or external agent database access.
- Gate A remains `NOT_ACHIEVED` until a fresh DB-backed, owner-signed-in, deployed/no-mock, negative-auth, provider-boundary, browser/runtime evidence packet exists.

Verification:

- `node --check scripts/check-owner-ai-work-desktop-chat-context.mjs`
- `pnpm owner:chat-context:check`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm db:validate`
- `git diff --check`

## OWNEROS-002B OwnerConversation Runtime Contract Acceptance

Status: `DONE`.

Acceptance:

- `RPT-064_loop-227-short-launch-review-and-owner-conversation-routing.md` records the short launch review and confirms formal launch remains `L0_LOCAL_PROTOTYPE`, Manual Ops remains `M1_MANUAL_OPS_READY`, conditional product maturity remains `C3_ARCHITECTURE_GATE_READY`, and Gate A/B/C remain `NOT_ACHIEVED`.
- `src/lib/contracts/owner-ai-work-desktop-conversation-runtime.contract.ts` defines the OwnerConversation BFF/runtime contract for `A2_DURABLE_AUTHORIZED_CHAT_CONTEXT` and `A5_INBOX_FREE_TEXT_RETURN_PATH`, including conversation thread, message, context package, context reference, and Inbox return path DTOs.
- The contract keeps the first runtime scope as Personal Private and requires `requireUser()`, profile/workspace membership, source ownership/grant checks, redaction, Inbox origin return-path checks, audit event preparation, and cross-owner denial.
- `pnpm owner:conversation-runtime:check` validates contract/doc/backlog/sprint/tasks/acceptance/completed-log/package markers, required surfaces, authz checks, runtime-disabled flags, and forbidden side-effect patterns.
- Runtime flags remain fail-closed: no route handler, Server Action, schema/migration, DB read/write, provider call, Inbox reply runtime, email, public output, external runtime, external registration, or external agent database access.
- Gate A remains NOT_ACHIEVED until a fresh DB-backed, owner-signed-in, deployed/no-mock, negative-auth, provider-boundary, Inbox round-trip, browser/runtime evidence packet exists.
- NANDA posture stays internal BFF contract only with `externalRegisterable: false`.

Verification:

- `node --check scripts/check-owner-ai-work-desktop-conversation-runtime.mjs`
- `pnpm owner:conversation-runtime:check`
- `pnpm owner:chat-context:check`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## OWNEROS-AUTO-001 Ten-Minute Gate Automation Acceptance

- Existing automation id `personal-os-20m-aggressive-launch-loop` is updated, not duplicated; it remains a heartbeat on the same Codex task, is `PAUSED` during preflight, and retains `FREQ=MINUTELY;INTERVAL=10` for a later explicit resume.
- Normal scheduled loops run only from the dedicated clean release worktree/branch recorded in the Gate prompt/state, verify checkpoint ancestry, and stop on unexpected dirty overlap.
- `REF-003` is the only Screen ID source; a UI slice requires an owner-named UI ID plus an approved `saas-ui-refactor-director` proposal, and full rule explanations stay in the web manual/Admin rather than product pages.
- Every wakeup reads root `AGENTS.md` plus the authoritative Gate prompt/state and selects one narrow slice for the earliest incomplete Gate.
- A run lease prevents overlapping 10-minute executions; a dirty-path/hash inventory prevents accidental overwrite of existing work.
- At most three bounded independent sub-agents may handle explorer/research, trust/architecture, QA/verification, or one disjoint worker role; the primary agent owns shared state, integration, evidence, Gate decisions, and Gmail send.
- Requirement gaps trigger the repository Research-To-Task and page-understanding gates before runtime expansion.
- Gate A, B, and C are binary/all-of and require current runtime/negative evidence; mock, static, proposal-only, conditional, stale, or isolated happy-path proof cannot achieve a Gate.
- Aggregate `pnpm gate:a:check`, `gate:b:check`, and `gate:c:check` proof checkers are required before the corresponding Gate may achieve; `OWNEROS-GATE-001` owns their implementation and does not itself achieve a Gate.
- Gate state starts with A/B/C `NOT_ACHIEVED`; automation setup does not change launch level or delivery Gate status.
- Gmail was previously connected and MIME Markdown attachments were supported; because verification is stale, it must be reverified immediately before any allowed send.
- Gate A first achievement creates human Markdown plus machine JSON proof, same-commit/environment evidence, SHA-256 and deterministic notification id; it reconciles Sent mail before sending and only the primary agent may send.
- The Gate A email must include the Markdown report as an attachment. Attachment/provider failure remains retryable and cannot silently degrade to body-only or be reported as sent.
- Setup sends no email. The automation is authorized for exactly the Gate A completion notification and no other external email.
- `RPT-062 §3.5` product decisions are resolved by OD-01 through OD-04. Production DB/provider/deployment/public/high-risk actions and new ambiguities outside those decisions remain stop conditions; three consecutive no-progress owner-input blocks pause the automation instead of generating repeated adjacent documentation.
- Gate B requires the Owner plus every active company member and at least one invited non-owner; the current named pilot is the Owner plus one marketing partner.
- Gate C enforces 180 active days followed by indefinite database/R2 archive, database soft archive for product deletion, and no terminal purge without explicit Owner authorization.
- All agent work remains internal/protected, `externalRegisterable: false`, with no external agent database access.

## OWNEROS-AUTO-003 Gate Loop Activation Acceptance

- Product Owner explicitly authorizes resume after `OWNEROS-AUTO-002` passes.
- The existing automation is updated in place to `ACTIVE`; no duplicate is created and the cadence remains 10 minutes.
- Release worktree path, branch, checkpoint ancestry, clean state, and dependency runtime all pass.
- Gmail profile is freshly reverified without sending a message; the Gate A email remains `NOT_TRIGGERED` and is reverified again immediately before the eventual exactly-once attachment send.
- Repository loop state, Gate activation state, app automation status, and TOML status agree on `ACTIVE`.
- Initial run lease is `IDLE`; Gate A/B/C remain `NOT_ACHIEVED`; Active UI remains `NONE`.
- `pnpm gate:activation:check` passes and records an internal-only lifecycle/observability artifact.
- No deployment, migration, DB/provider write, test email, public output, terminal purge, external agent database access, external registration, or Gate claim occurs during activation.


### 圓展 UI-088 D10 指定 v5 修訂

當前 UI renderer、30 子頁與雙模式驗收見 [ACC-008](ACC-008_yuanzhan-ui-dual-mode-acceptance.md) 的 YZUI-011 追加條件。v5 視覺與操作驗證不沿用前版九工作面瀏覽器結果，也不升級正式 DB/auth/launch 狀態。
