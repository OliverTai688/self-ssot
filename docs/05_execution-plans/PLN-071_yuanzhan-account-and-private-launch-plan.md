# 圓展帳號管理與正式使用規劃

**Document ID:** PLN-071  
**Date:** 2026-09-15  
**Task:** YZLIVE-001 — 規劃完成；實作與上線尚未執行  
**Status:** PROPOSED；六碼登入已確認，額外公司管理權限待確認  
**關聯：** [PRD-006](../01_product-requirements/PRD-006_yuanzhan-team-ui-phase.md)、[AUT-009](../02_architecture-and-rules/AUT-009_yuanzhan-email-otp-account-boundary.md)、[AUT-008](../02_architecture-and-rules/AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md)、[ARC-040](../02_architecture-and-rules/ARC-040_yuanzhan-ui-data-mode-contract.md)、[UI Registry](../03_feature-reference/REF-003_ui-screen-registry.md)。

## 1. 本次目標與已確認決定

讓三個指定帳號透過信箱六碼驗證登入，從 `/company/operating` 管理自己的帳號，並讓 Company Admin 管理圓展成員；分期接上真正保存與共享的工作資料，最後完成三帳號的正式網域驗收。

使用者已明確指定：所有帳號皆為「輸入信箱 → 收六碼 → 回登入頁驗證」。不使用 Magic Link 或 Google 登入。Supabase 可以继续作為 OTP 驗證後端，登入體驗不出現 Supabase 品牌、連結登入或固定示範碼。

本次要求是規劃；以下待開發功能與權限是具體提案，不表示已改正式 auth、已建帳號、已寄信或已部署。原 v5 UI 與雙模式驗證仍有效，正式資料階段另有驗收。

## 2. 三個帳號與兩層管理

| 帳號 | 顯示名稱 | 私人空間 | 圓展權限提案 |
|---|---|---|---|
| team.yzedtech@gmail.com | Company Admin | 只管理該帳號自己的資料 | 公司擁有者；產品標籤 Company Admin；技術上 TEAM membership OWNER，作為不可移除的最後管理者 |
| taioliver688@gmail.com | 戴宇星 | 私人日誌與「我的帳號」皆由本人管理 | 先提案 MEMBER；是否另給公司 ADMIN 已詢問，尚未確認 |
| lilyzuo405@gmail.com | Lily | 私人日誌與「我的帳號」皆由本人管理 | MEMBER；自己的工作日誌、受指派工作進度與團隊留言 |

「個人 admin」以產品名稱 **我的帳號** 呈現，意思是管理自己的資料與登入，不是所有人都取得整間公司的管理權。既有 `Profile.role=OWNER` 是舊版個人／模組角色；不能用它推論公司 OWNER/ADMIN。沿用既有 WorkspaceMembership 的角色與狀態。

公司管理者可管理公司成員、工作空間設定及管理操作紀錄；不能因此讀取他人的私人日誌或冒用另一人的身分。日誌正文由作者編輯；任務負責人可改進度；其他成員留言。財務／人事資料和核准能力分開授權，待資料階段確認，不因「帳號管理」自動授予付款或改薪資能力。

Company Admin 是獨立登入身分，不設「切換成戴宇星／Lily」的正式後門；日常操作依實際登入帳號留作者。登入紀錄只能證明使用哪個帳號，無法證明共用信箱背後的自然人。

## 3. 目前可重用與缺口

| 項目 | 程式碼可確認的现況 | 上線前要補的部分 |
|---|---|---|
| 六碼登入 | `requestEmailOtp`／`verifyEmailOtp` 已存在，後者驗六位數字並呼叫 `verifyOtp(type:email)` | 統一入口、SMTP 與只含 Token 的信件、限流、登入前後帳號政策、實際收信驗證 |
| 登入方式 | `/login` 同時含 Google、Magic Link、開發固定碼與示範碼 | 正式登入收斂為 OTP；不能只隱藏按鈕，server action／provider／舊登入路徑一併納入切換 |
| 帳號允許清單 | `PERSONAL_OS_TEAM_PROFILES` 目前主要用於 Google callback／Profile 建立 | OTP 發送、驗證、後續 session／停用各層一致檢查；不能只靠 `shouldCreateUser:false` |
| 身份綁定 | schema 已有唯一 `Profile.authUserId`；目前主要以 session email 找 Profile | 一次性核對既有 Auth UID，改由已驗證 UID 綁定；email 是登入地址，不是可由使用者任改的主鍵 |
| 公司工作台 | route 只確認有登入，然後 `createV5State(mode)`；v5 仍是二人合成 actor 與記憶體 | 真實 active workspace/member 檢查、實際登入人 DTO、第三個管理帳號、移除正式版 actor 切換 |
| 成員管理 | `/settings/members`／roles 使用 `useLocalEntities`，其中角色名稱也與 TEAM schema 不一致 | 用正式公司 membership BFF；不能把 localStorage 清單當正式成員 |
| Workspace | 已有 PERSONAL/TEAM、memberships、invitation／project services | 重用核心模型，補管理者變更／停用／恢復、最後 owner 保護、狀態檢查與稽核 |
| 日誌／財務等 | 当前 v5 刷新重置；檔案 bytes 留在記憶體 | 各領域正式資料契約、服務授權、DB／私有儲存；禁止直接存整包 v5 DB JSON |

本次未連線盤點正式 Auth Users、寄信 provider 或正式 DB；不根據舊完成報告宣稱三帳號現在皆可登入。

## 4. 介面結合：保留 v5 工作台

登入沿用 UI-002 `/login`；工作台入口沿用 UI-088，不把頁面改成另一套卡片儀表板。新增面板先作 UI-088 子操作；若之後獨立為 route，再由 REF-003 登錄 Screen ID。現有 `/admin` 是系統操作／診斷，不能直接等同圓展公司管理。

```text
圓展登入
  信箱 → 寄送驗證碼 → 六碼輸入 → 回到原目的頁

/company/operating
  原 v5 的 8 工作區／30 分頁
  右上：真實登入姓名／頭像
    我的帳號
      基本資料：姓名、頭像、唯讀登入信箱
      登入與安全：Email 六碼驗證、最近登入、目前登入、登出／登出其他裝置
    公司管理（具公司權限才出現）
      成員與權限：表格 → 點成員 → 詳情／變更角色／停用或恢復
      公司設定：名稱、登入後預設進入位置
      操作紀錄：誰、何時、對哪個成員、做了什麼、成功或失敗
    切換個人／圓展空間
    登出
```

- 登入：一個信箱欄位與主按鈕；下一步一個可貼上六位數字的輸入框（可視覺分格，保留單一語意輸入與 `one-time-code`）；保留前導零。顯示更換信箱、倒數、重寄、過期／錯誤狀態。允許手机鍵盤與貼上。
- 我的帳號：儲存姓名／頭像有 pending／已儲存／失敗，重整與其他裝置一致。登入信箱先唯讀；變更信箱需重新驗證舊／新信箱與唯一身份衝突檢查，列後續功能，不做任意字串編輯。
- 公司管理：主操作是成員表格，側抽屜顯示權限與狀態。初始三筆是經正式帳號核對的資料；尚未首次驗證顯示「尚未登入」，不虛稱「已寄邀請」。停用說明影響公司存取，保留歷史作者，不能刪除其私人空間。
- 權限變更：顯示具體 before/after、目標與理由；成功後由 server 重讀。最後一位 owner 不可停用／降級；不得靠隱藏按鈕代替 API 拒絕。
- 其他裝置：首版提供「登出其他裝置」及目前登入摘要。完整逐裝置名稱／位置／單裝置撤銷列後續；不要虛構裝置清單或地理位置。

## 5. 正式登入與寄信方案

沿用 Supabase Auth Email OTP。官方文件確認 OTP 是信箱六碼登入，但 `signInWithOtp` 預設信件仍可能是 Magic Link，因此需改該郵件模板，用 `{{ .Token }}` 呈現驗證碼，不放 `ConfirmationURL`／TokenHash 登入連結。[Email OTP 文件](https://supabase.com/docs/guides/auth/auth-email-passwordless)

建議設定：六碼、10 分鐘有效、同信箱重寄間隔至少 60 秒。10 分鐘是本計畫建議值，需與 provider 實際配置一致；目前服務預設值及其他確認流程的共用到期設定需一併盤點。伺服器對 email／IP 限流，前端倒數只是提示；依目前 provider 限制設上限，不把客戶端限制當防護。[限流文件](https://supabase.com/docs/guides/auth/rate-limits)

正式使用需配置自訂 SMTP 與經驗證的寄件網域。Supabase 內建寄信只適合測試，文件目前列有收件對象限制與每小時 2 封限制，不足以作為三帳號日常登入的可靠基礎。先重用已驗證可用的公司寄信服務；若沒有，另選支援 SMTP 的 provider 與寄件地址，成本／網域權限在設定前確認。[SMTP 文件](https://supabase.com/docs/guides/auth/auth-smtp)

寄件範本（設計稿，尚未套用）：

```html
<h2>圓展登入驗證碼</h2>
<p>請回到圓展登入頁，輸入以下六位數字：</p>
<p style="font-size:28px;letter-spacing:6px">{{ .Token }}</p>
<p>驗證碼於 10 分鐘後失效。若不是你提出登入要求，請忽略這封信。</p>
```

三個人都從同一頁自行要求 OTP。初始化不寄 Magic Link，也不為了建立帳號自動送邀請信。先查現有 Auth Users／Profile／UID，重用已有身份；缺少的帳號以受控管理流程預建，再首次 OTP 驗證。`profiles:provision-team` 目前只寫 Profile，不會建立完整登入身分，不能單獨視為已完成。詳見 AUT-009。

## 6. 分期交付與執行任務

先完成「帳號可用」，再完成「日常協作可用」，最後推進「完整營運資料」。每段明確驗收，不能把登入成功寫成八個工作區都已正式上線。

| Task | 交付與範圍 | 依賴／狀態 | 主要檔案／驗證／停止條件 |
|---|---|---|---|
| YZLIVE-001 | 本計畫、身份／角色契約、官方研究、驗收與上線步驟 | DONE — planning only | PLN-071／AUT-009／backlog／ACC；文件連結與來源驗證 |
| YZLIVE-002 | 單一 Email 六碼登入 UI、OTP request／verify、失敗／重寄、固定碼與 OAuth 路徑隔離 | PROPOSED；最先實作 | `/login`、`actions/auth.ts`、auth service／proxy；真假 OTP／重放／非允許帳號／舊入口負測試；provider 變更先完成可審配置清單 |
| YZLIVE-003 | 三個 Auth UID↔Profile 核對、公司與私人 memberships、DB service 授權與停用／撤銷契約 | PROPOSED；002；公司角色確認 | schema／auth／workspace services；一次性 dry-run、不重建已有身份、不直接改全域 OWNER；身份衝突停止並列出處置 |
| YZLIVE-004 | v5 真實姓名／我的帳號／公司管理；姓名頭像保存、成員角色／停用／恢復、管理 audit | PROPOSED；003 | UI-088 子面板、BFF／action、private file adapter；本人／同事／管理者矩陣，重整持久化，非法 ID 與最後 owner 保護 |
| YZLIVE-005 | 日常工作資料第一階段：私人／公司日誌、專案、任務、留言、事件、附件 | PROPOSED；003 | 新 journal／comment／event domain，重用 Work／private storage；跨兩瀏覽器共享、衝突處理、重新登入仍存在；不得整包同步 UI store |
| YZLIVE-006 | 三帳號小規模正式試用：寄信設定、正式 origin、DB／儲存／日誌監控、備份還原、部署／回退與實際驗收 | PROPOSED；002–005 | 各人從信箱收碼登入／分享／隔離／停用負測試；真實寄信／部署／migration 於具體變更包完成後進入正式執行 |
| YZLIVE-007 | 金流／核銷／人事／预算的正式帳務契約與持久化 | PROPOSED；日常試用後 | 不直接沿用原型薪資／法規／付款示例；專門權限、試算規則、對帳／核准／audit，規則確認後才開正式寫入 |
| YZLIVE-008 | Evidence 持久版本／凍結、容量／出勤、內外承諾正式資料與驗收 | PROPOSED；005；相關契約 | 模型／檔案 snapshot／分鐘出勤／來源 log；版本不可漂移、無假預測／假履行；與財務的成本引用需 007 |

所有 PROPOSED 行代表具體的後續範圍，尚未取得本次「規劃」之外的實作／正式環境變更授權。現有 UI 自主開發授權不被擴張為財務最終寫入或生產遷移。正式角色確認不阻止先準備登入與 DTO 的獨立工作。

## 7. 資料模式與部署切換

保留 `PERSONAL_OS_UI_DATA_MODE=showcase|empty` 作 UI 展示／空白驗證。另提案 `PERSONAL_OS_OPERATING_DATA_SOURCE=prototype|database` 明確選資料來源，避免把 empty 誤稱正式 DB 模式。

- prototype：沿用雙模式與記憶體操作，只作隔離預覽；不能讓三個正式帳號誤以為已保存。
- database：server 取得實際登入人與 active workspace，讀 DB；首次無資料是真的空白。UI_DATA_MODE 不得注入 fixture；資料庫錯誤顯示失敗／重試，不能 fallback 到展示／空白而掩蓋錯誤。
- 正式發佈逐域檢查：已接 DB 的功能才顯示可保存；未完成的金流／Evidence 等功能保留原 v5 外形但標示預覽／未啟用或阻止正式寫入。這是建議的分期方式，不能把 M2 的可用范围包裝為完整營運上線。
- 目前 `commit()`／drawer callbacks 為同步 memory 操作。轉正式版需命名 domain commands、非同步 pending/error、版本號與成功回寫；不能每次 keypress 把整包 DB 傳給 server。
- 日誌建議短延遲自動保存，UI 顯示保存狀態；跨裝置更新先用已授權 BFF refetch／輪詢、頁面 focus refresh，必要時再接 Realtime。版本衝突保留本地未送出文字並顯示差異，不靜默覆寫同一作者另一裝置。

## 8. 上線驗收與操作清單

### 帳號可用

- 三封實際郵件各包含六碼，沒有可點即登入連結；輸入後各自回 `/company/operating`。
- 正確／錯誤／過期／重放／重寄／更換信箱／限流／寄送失敗有明確結果。非允許信箱不得建立 Profile、membership 或成功登入；對外回應不洩漏名單。
- 真實身分與日誌作者一致；右上不再可任意冒用另一角色。管理員與兩成員各有正確權限。
- 我的帳號姓名與頭像可跨重整保存；登出與登出其他裝置有效。Supabase refresh token 撤銷不等於既發 access JWT 立即失效，需 server session／會員狀態再檢查，不能只看畫面登出了就宣稱權限立即撤銷。[Session 文件](https://supabase.com/docs/guides/auth/sessions)

### 日常協作可用

- 宇星寫公司日誌，Lily 在另一個獨立登入的瀏覽器可看到／留言，不能改宇星正文。
- 私人日誌、私人附件與搜尋，對 Company Admin／另一成員皆不可見；伺服器回應本身不包含受限內容。
- 重整、重新登入、換裝置仍保留已保存資料；附件可重新取得，不能只靠本頁記憶體。
- 管理者暫停成員的公司會員資格後，其舊 session 對公司讀寫被拒絕；本人私人空間仍保留。最後 owner 保護與同時操作的 race case 通過。
- 正式 HTTPS 網域、字型／SMTP／DB／私有儲存、三帳號權限、備份與恢復、錯誤日誌均有實際證據；部屬回退不把已有正式資料恢復為 fixture。

### 上線前需要的外部設定

1. 確認正式網址及 preview／production 環境，不假設本機 `.env.local` 已同步部署。
2. 確認寄件服務、可驗證的寄件網域／地址，配置 SMTP 與 DNS；密鑰放 provider／deployment secret settings，不貼進 docs 或聊天。
3. 核對三帳號的 Auth／Profile／membership 與角色，先產生去敏 dry-run。
4. 關閉正式固定碼／demo 身份 fallback；依已確認 OTP-only 決定處理 Google provider／舊 magic entry，檢查同 Supabase project 的其他 app 是否受影響。
5. 批准並套用已測過的 migration／設定／部署變更包；以三個獨立瀏覽器或 profile 作實際收碼与隔離測試。登入與資料驗收分開記錄。

本次規劃完成上述可執行清單，不啟動寄信／新增雲端帳號／migration／部署，也沒有請使用者提供密鑰。正式網址、SMTP 現況與戴宇星額外公司權限是尚需落定的項目。

## 9. Research-to-task 記錄

| 畫面／問題 | 理解分數 | 輪次與結果 |
|---|---|---|
| UI-002 六碼登入 | 92：20+20+18+14+12+8 | 3 輪：現有 request/verify 與所有入口盤點 → 官方 OTP／SMTP／重寄機制 → 名單／UID／失敗／停用與實際收信驗收。選既有 Supabase OTP，拒絕自製固定碼與僅改按鈕文案 |
| UI-088 我的帳號 | 87：20+18+17+13+11+8 | 3 輪：v5 頂列與私人空間情境 → 既有 Profile/authUserId／signOut lifecycle → 自身 DTO、信箱唯讀、撤銷與負測試。選原版抽屜／分頁，拒絕導向全域 /admin |
| UI-088 公司管理 | 75：17+18+14+12+7+7 | 4 輪：現有 settings local store → AUT-008／Workspace roles與公司/私人角色分離 → 身份／最後owner／停用與歷史作者 → 三帳號能力矩陣與未定戴宇星管理權限。選正式 membership BFF，拒絕 Profile OWNER=公司admin／任意 impersonation。該產品選擇未答覆前不實作角色最終寫入 |

新帳號管理涉及 auth／member settings／persistence 的需求缺口，已升級成 AUT-009 與本計畫及後續任務；沒有直接擴張 runtime。詳細檢查命令、來源與已知限制見本次 evidence report。
