# 圓展 Email 六碼 OTP 與帳號／公司管理邊界

**Document ID:** AUT-009  
**Date:** 2026-09-15  
**Status:** PROPOSED contract；登入方式為 owner-confirmed，尚未 runtime cutover  
**Source:** [PLN-071](../05_execution-plans/PLN-071_yuanzhan-account-and-private-launch-plan.md)、[AUT-002](AUT-002_auth-runtime-strategy.md)、[AUT-008](AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md)、D11。

## 1. 已确认與提案

已確認三帳號及 Email 六碼登入。OTP-only 取代這三帳號的舊 Google／Magic Link 登入方向，不把既有設定存在視為使用者要繼續保留。未確認戴宇星是否額外取得公司管理權；預設提案由 Company Admin 持有 TEAM OWNER，個人帳號為 MEMBER。

角色命名沿用 AUT-008：Profile.role（個人／模組）、WorkspaceMembership.role（公司治理）、ProjectAccessGrant.role（專案能力）不能混為同一個 admin。公司成員停用不刪除私人身份／資料。公司管理者不取得私人內容或冒用會員的能力。

## 2. 登入契約

```text
信箱 + 原目的頁
  → server normalize/validate、帳號允許政策、跨實例限流
  → Supabase signInWithOtp(email, shouldCreateUser:false)
  → 自訂 SMTP 寄只含六碼的模板
  → server verifyOtp(email, token, type:email)
  → 已驗證 Auth UID → Profile.authUserId → 應用登入政策
  → 原目的頁；company 讀寫再驗 active workspace/membership/capability
```

- email 採同一 canonical normalization；前端不可選 role、ownerId 或任意 Profile。原目的頁只接受經 normalize 的同站路徑，驗證碼不得放 query string／log／analytics。
- OTP 發送成功僅表示 provider 接受要求；UI 不宣稱已送達。未知／不允許／停用帳號回應不公開帳號存在性。可用文案：「若此信箱可使用圓展，將收到驗證碼。」
- 六碼保留前導零，格式驗證與 rate limit 在 server；建議有效 10 分鐘、重寄至少 60 秒。實際 provider 配置與 UI 相符；跨實例計數不能放在單一 Node 記憶體。provider 的直接端點亦配置限流；不能靠 app gateway 當作唯一防護。
- 不存明文 OTP、不自製碼、不使用固定 fallback。OTP／session token／SMTP secret／provider key 不進 DTO 或稽核。
- `shouldCreateUser:false` 只限制自動建立 Auth user；不是三人名單、公司會員或停用政策。驗證後及後續讀寫都需重新確認本 app 的允許狀態。
- 正式公司工作台必須拒絕 mock／固定 demo cookie 身份。保留原型回歸只限隔離 preview。舊 Google route／Magic Link action 及 provider 的啟用狀態需在 cutover 同步檢查，不能只去掉 UI 按鈕。
- OTP 與 Magic Link 在 Supabase 共享郵件機制，因此此處 OTP-only 的產品定義為只寄碼、不提供登入連結、不暴露 TokenHash，不宣称底層 provider 的 token 能力已改造。[官方 OTP 行為](https://supabase.com/docs/guides/auth/auth-email-passwordless)

## 3. 初始三帳號的身份建立

1. 在正式執行前產生 dry-run：核對既有 Auth user email／UID、Profile id／authUserId、PERSONAL／TEAM membership。資料只限三個指定地址，不輸出 tokens，不掃描私人內容。
2. 既有 Auth user 一律重用 UID；Profile 已綁不同 UID、重複 canonical email、來源不明的 owner 或既有 membership 衝突，列為阻塞，不自動覆寫。
3. 缺少 Auth user 才使用 server/operator 的受控建立流程，不能從普通登入 endpoint 自動建任意帳號；不寄 `inviteUserByEmail` 的連結邀請。`auth.admin.createUser` 僅 server 可用。若預建流程使用 `email_confirm:true`，這只是一個受控 provisioning 狀態，app 的首次本人驗證紀錄必須來自成功 OTP，不能顯示為已收信驗證。[Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
4. 以唯一 `Profile.authUserId` 寫入身份對應；後續 principal 採驗證過的 UID，不能讓使用者輸入 email 就綁定或替換現有身份。已有 email-only 個人資料需做明列的一次性對應與影響分析。
5. 建立或重用每人的 PERSONAL workspace；建立或重用唯一指定圓展 TEAM workspace，以穩定 id／slug 指定，不拿名稱相似當同一家公司。初始化 membership 是 idempotent、transactional，不重種原型業務資料。
6. 初始名單使用 env／受控 provisioning 輸入；後續若公司管理者可新增其他成員，正式允許名單需明確轉入 DB membership／account policy，避免 admin UI 改了 DB 但舊 env 持續否決登入。初始三人與未來邀請分開驗收，不能默默雙來源授權。

目前 schema 有 `authUserId` 與 membership status，可重用；Profile 缺少全域停用／會話撤銷所需狀態。後續可新增有限 AccountAccess／SessionAuthorization metadata，但須先定 schema／migration／負測試，這份文件不直接變更 schema。

## 4. Server BFF 契約（提案）

| 操作 | Principal／資料範圍 | 回傳與限制 |
|---|---|---|
| requestLoginCode | 未登入；canonical email；允許名單＋限流 | accepted/generic failure、可重試時間；不回角色、會員列表、OTP |
| verifyLoginCode | provider 驗碼；唯一 UID；active account policy | 建 session 後安全 redirect；登入失敗不留下可用的 partial application session |
| getMyAccount | 當前 verified UID | 自己的姓名／email／avatar、驗證時間與安全摘要；無密鑰或其他人資料 |
| updateMyProfile | profileId 永遠來自 server identity | 姓名、已驗證為本人私有資產的 avatarFileId；email/role/authUserId 不在可改 allowlist |
| signOutCurrent／Others | 當前本人 session | 清理自身狀態／撤銷相應 session；server 保留需要的去敏稽核 |
| getCompanyMembers | active COMPANY OWNER/ADMIN | 該公司的必要姓名／email／role／status／首次登入狀態與 canActions；不回私人日誌、薪資或原始 Auth UID |
| changeMemberRole | active COMPANY OWNER；管理權限依已選政策 | expectedVersion／target membership／reason；最後 owner 保護；交易內 recheck；不可改全域 Profile.role |
| suspend／restoreMember | active COMPANY OWNER/ADMIN；目標同公司 | 只改公司會員狀態；保留作者；目前 session 下次公司請求即被拒絕；OWNER 目標採更嚴格政策 |
| getCompanyAudit | active COMPANY OWNER/ADMIN | 限該公司管理事件，有限分頁與必要欄位；不當成全站 audit 查詢入口 |
| getOperatingBootstrap | verified UID＋active workspace membership | 真實 actor、space、capabilities、已授權資料來源；不把整包三人 fixture 傳給正式 client |

每個 query/action 都在 service 層檢查，更新需在 transaction 內再次確認。UI 的角色、隱藏按鈕、cookie 的 selected workspace 都不是權限證據。既有 `workspace-settings.service.ts` 雖有 membership 存在檢查，但未核對 ACTIVE status／公司狀態且一次載全部 Profile；正式管理功能需補 redacted selects 和 active/capability gate，不能直接串上舊 DTO。

## 5. Session／離職與復原

Company membership suspension 與應用登入停用分開：前者只剝奪公司存取，後者須獨立的帳號／平台治理範圍，不由普通公司管理者刪私人 OS。

登出其他裝置可沿用 provider `scope:others`；但既發 JWT 的即時失效不能只靠這個呼叫。對本 app 的正式操作檢查 `session_id` 的可用性／server session authorization 與當前 account/membership 狀態。可採 provider 的有效 session 查核或可稽核的應用 session allow-record，選型時測量與驗證；不直接暴露 auth schema／refresh token 給 UI。不保證能抹除別人先前已讀到的畫面，限制是禁止撤銷後的新請求。[Session 文件](https://supabase.com/docs/guides/auth/sessions)

至少一位 active owner 不可被同時降級／停用。管理帳號失去信箱存取時，走經核對身份的 operator 恢復程序；不提供通用固定碼或任意改 email 的後門。

稽核包含 actor、公司／會員目標、before/after role/status、時間、結果、reason、request id；登入 audit 只保留必要安全 metadata，不放 OTP、token、Cookie、完整 provider payload 或私人正文。全站 IP／裝置長期保留政策另定。

## 6. 必要負向驗收

- 三人用真實各自 OTP 成功；錯碼／過期／重放失敗；寄信／驗碼限流可重試。
- 非允許信箱／尚未有效 provisioning／被停用 app identity 不取得正式能力；不因 Auth user 存在就放行。
- 前端改 profileId、workspaceId、member role、v5 DB.me 或 localStorage 不改 server identity。
- 一般成員直接呼叫成員清單／變更角色 API 被拒絕；前全域 OWNER 不能自動變公司管理者。
- Company Admin 讀另一人的私人日誌／附件／搜尋被拒絕，server 不先載入整包再靠 client 過濾。
- 停用公司會員後舊 session 的公司讀寫失敗，但本人私人資料仍在；恢復需合法管理者。
- 最後 owner 降級／停用及同時兩筆管理請求不造成零 owner。
- 登出其他 session 後該 session 新請求失敗；即使舊 access token 未到期也不能接受；如果未實作此檢查，介面不得宣稱即時撤銷。
- 三人既有 Auth UID／Profile／PERSONAL 資料不被重建覆蓋；所有 migration 先在可拋棄 DB 驗證且有 backfill／rollback 計畫。

## 7. 非本次實作與引用

這是上線方案及候選契約，未寫生產 auth／DB／provider／deployment。流程不新增 AI、MCP、A2A 或外部 agent 能力，NANDA registry／externalRegisterable 不變。

相關來源：PLN-071 引用的 Supabase OTP／SMTP／Rate Limits；Next 本地 authentication guide 的 Authentication／Session／Authorization 分層；AUT-008 的身份與會員分離、service-layer transaction recheck、既有 Workspace 模型。拒絕方案為固定驗證碼、僅前端身分切換、直接保存整包 prototype DB、company admin 繼承私人資料所有權。
