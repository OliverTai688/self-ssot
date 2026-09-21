# YZLIVE-001 — 圓展帳號管理與六碼登入上線規劃

## Task / Scope

2026-09-15，Codex owner-directed planning。使用者要求規劃 `/company/operating` 的登入、個人帳號管理與上線；指定 Company Admin、戴宇星、Lily 三帳號，後續明確要求寄六碼 OTP，不使用 Magic Link。

完成 [PLN-071](../../../../05_execution-plans/PLN-071_yuanzhan-account-and-private-launch-plan.md) 與 [AUT-009](../../../../02_architecture-and-rules/AUT-009_yuanzhan-email-otp-account-boundary.md)。具體定義介面、角色／身份、BFF、寄信設定、持久化／試用階段、負測試和後續任務。不是登入功能已交付、不是帳號已建立或正式上線。

## Strategic Review / Sources Read

- 重新讀取 AGENTS.md；檢查 MAN-000／001／002、PRD-001／005、ACC-001、ARC-028、RES-001／002／005、PLN-060／061／063、active development strategy／loop-state 的目前目標與相關 auth／member／launch 章節。PRD-004 在工作樹仍是既有刪除，未還原。
- 最近三份完成報告：20260913 v5-fidelity、ui-runtime、ui-docs。前兩次是實際 UI 與操作增量；本次按 owner 新要求把原型下一階段的登入／成員／正式資料缺口转成可執行計畫，並非重複 UI 清單。
- 當前 launch state 仍 L0_LOCAL_PROTOTYPE；本次未改正式 Gate／automation／loop-state。使用者要求的「上線使用」不能只用登入畫面或上次 39 群組 prototype 測試代替。
- 直接依據：PRD-006、ARC-040、AUT-002／008、REF-003／004 與 D09／D10、PLN-070、ACC-008、schema、auth actions／service／proxy／Google route／callback、v5 route、workspace services、settings members／roles panels、provision-team-profiles script。
- 閱讀 saas-ui-refactor-director，限 review／proposal；UI-002 是既有登入，UI-088 是公司入口；新的 account/admin 子面板尚未更動 UI Registry 狀態或新建 Screen ID。Next 本機 `01-app/02-guides/authentication.md` 提供 authentication／session／authorization 分層。

## Findings / Research-to-task

1. 六碼 `requestEmailOtp` 與 `verifyEmailOtp` 已有；`requestPasswordlessEmail` 的 method 差異目前主要是文案與跳轉，不會替 Supabase 修改信件模板。因此必須核對 provider SMTP／模板，不能說現有程式一定寄六碼。
2. `/login` 同時有 Google、Magic Link、開發固定碼與正式示範碼路徑。最新要求收斂為真實 Email OTP，包含 action／server identity 與 provider 切換，不能只藏前端按鈕。
3. `PERSONAL_OS_TEAM_PROFILES` 的 allowlist 原本主要在 Google callback 生效；普通 OTP 的 `shouldCreateUser:false` 不等於三人名單、active membership 或停用政策。
4. Prisma 有唯一 `Profile.authUserId`，但 auth resolver 目前主要以 email 找 Profile；規劃採明列的 UID 核對與一次性 backfill。Profile 全域 OWNER 不可当公司 admin。
5. 公司 workbench 仍 `createV5State(mode)`，登入人只決定 component key，尚未成為真實 actor DTO。成員管理頁仍使用本機 `useLocalEntities`，不是正式 account management。
6. `workspace-settings.service.ts` 目前只檢查 membership 存在，尚未加 active status／公司狀態／管理能力；讀取也包含全部 Profile。新 BFF 必須重做必要 gate／redaction，不能直接接舊清單。
7. 管理權待確認：已提出簡短問題，Company Admin 是否唯一管理者，或戴宇星也具公司管理權。沒有收到答案即不作正式授權；文件暫用 Company Admin OWNER、兩個個人 MEMBER 作提案，明列待確認。

理解分數與各輪決策在 PLN-071 第 9 節：登入 92（三輪）、我的帳號 87（三輪）、公司管理 75（四輪）。皆由現有 code／原型、官方 provider 行為、身份與 BFF、驗收／風險形成具體 task shape。公司角色待定不阻礙規劃或登入独立工作，但不進入角色最終寫入。

選擇：保留 v5，右上加入本人帳號與公司管理；Supabase OTP＋自訂 SMTP；既有 Profile／Workspace／Membership 的 server BFF；分期接 DB。拒絕：自製固定碼、僅換登入文案、Google fallback、localStorage 成員清單作權限、company admin 讀他人私人資料、整包 v5 JSON 持久化、只完成登入就宣稱全營運上線。

## External References (2026-09-15)

- [Supabase Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)：六碼、Token 模板、signInWithOtp/verifyOtp、shouldCreateUser 限制。
- [Supabase Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)：正式寄信需要合適 SMTP、寄件網域與投遞驗收；未假設內建測試寄信可供三人日常使用。
- [Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)：provider 對寄信／重寄／驗碼的限制；app 前端倒數不等於 server 限流。
- [Sessions](https://supabase.com/docs/guides/auth/sessions)／[Sign out](https://supabase.com/docs/reference/javascript/auth-signout)：撤銷 refresh token 與既發 access JWT 的差異，立即拒絕新業務请求需要 server 狀態查核。
- [Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)：缺少身份時的受控 server provisioning，不將密鑰放 client；不寄 Magic Link 邀請。

本次未查正式 provider 設定、Auth Users、DB 內容、SMTP key、帳單或部署網域。來源是公開官方文件與本地程式碼，不把 provider 設定寫成已完成。

## Deliverables / NANDA

- 新增 PLN-071／AUT-009；新增 D11；PRD-006／AUT-002／MAN-001／ACC-002 的當前方向與提案狀態更新。
- Backlog／sprint／tasks：YZLIVE-001 DONE（planning）；002–008 PROPOSED，具範圍、依賴、檔案、驗證、風險／停止條件。下一候選是 OTP-only UI＋auth 邊界切片。
- NANDA：沒有新增 agent capability、MCP／A2A、registry 或外部資料存取；externalRegisterable 與既有 agent 規則不變。Company Admin 是人類帳號角色，非新增 AI 管理 agent。

## Verification

| Command / check | Result | Scope |
|---|---|---|
| `python3` 本次文件相對連結／唯一 ID／YZLIVE task 引用查核 | 見 `account-plan-verification.json` | 新計畫與契約、decision／canonical 更新；已知舊刪除文檔引用不算新缺漏 |
| scoped `git diff --check` | 見 `account-plan-verification.json` | 本次更新的既有 docs／tasks；沒有用全 repo dirty diff 當作此次內容 |
| auth／schema／runtime source reads | READ_ONLY | 靜態程式現況，不是正式登入或權限證明 |
| tsc／build／DB／實際 OTP／browser UI | NOT_RUN | 沒有 runtime 修改；未寄送 email 或執行高風險環境操作 |

## Final Status / Remaining Decisions

DONE — planning package。正式程式、schema、env、帳號、SMTP、DB、部署、automation 未變；沒有 stage／commit／push。

待落定：戴宇星額外公司權限、正式 origin／部署目標、現有 SMTP／寄件網域及三個 Auth UID／Profile／membership 實際狀態。方案本身已具體化，下一步先完成 OTP-only 與正式身份／會員契約，然後接帳號管理與持久化，最後再驗三人試用；不把單一 auth 成功視為完整正式營運。
