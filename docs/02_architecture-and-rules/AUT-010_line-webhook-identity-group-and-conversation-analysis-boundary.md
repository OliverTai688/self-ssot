# LINE webhook、身分綁定、群組綁定與對話分析的授權邊界

**Document ID:** AUT-010
**Date:** 2026-10-12
**Status:** OWNER-APPROVED（2026-10-13）—— Owner 核准本文件 §2–§9 的邊界，§5 的揭露文字與 §8 的保留期限照提案原文。§1 的六項方向已於 2026-10-12 確認。核准的是「可以依此實作」：正式環境變數、migration 套用到正式庫、webhook URL 填入 LINE 後台、模型供應商指定，仍各自需要 Owner 的操作或指示（§12）
**Source:** [RES-036](../07_research-and-design/RES-036_signal-inbox-line-binding-and-two-tier-signal-research.md)、[RES-033](../07_research-and-design/RES-033_project-workspace-five-resource-integration-research.md) §5 與 OD-H、[PLN-024](../05_execution-plans/PLN-024_messaging-source-adapter-contract.md)、[AUT-007](AUT-007_ai-input-source-workflow-connector-runtime-approval.md)、[AUT-008](AUT-008_team-membership-project-role-invitation-and-ai-feedback-boundary.md)、[ARC-028](ARC-028_nanda-agent-protocol-alignment.md)

本文件處理 `AGENTS.md` §11 的四個高風險面：Auth／Permission（公開 webhook、LINE 身分）、Public output（bot 在客戶群發話、推播）、External agent collaboration（對話送模型供應商）、以及客戶對話這類個資的保存。

## 1. 已確認的方向

| # | 決定 | 來源 |
|---|---|---|
| D1 | 推播與訊息來源只用 LINE；發送端留 `NotificationChannel` 介面 | Owner 2026-10-12 |
| D2 | 授權 LINE 導入：一條公開 webhook、bot 可進客戶群（關閉 RES-033 OD-H） | Owner 2026-10-12 |
| D3 | bot 在群組綁定時說一句揭露，之後沉默 | Owner 2026-10-12 |
| D4 | AI 分析只能由人主動選取一段對話發起；送出前先去識別化並經人確認 | Owner 2026-10-12 |
| D5 | 一個專案對多個群組；一個群組只對一個專案 | Owner 2026-10-12 |
| D6 | 成員 LINE 帳號用一次性代碼＋網站確認綁定 | Owner 2026-10-12 |

D2 授權的是「可以做」，不是「已上線」：正式環境變數、migration 套用、webhook URL 填入 LINE 後台，仍各自是 Owner 的操作。

## 2. Webhook 邊界

系統第二條無登入狀態的公開 route。提案路徑 `POST /api/line/webhook`。

```text
LINE Platform
  → 讀 raw body（不先 parse）
  → 以 channel secret 計算 HMAC-SHA256，與 x-line-signature 做常數時間比對
  → 不符：回 200、丟棄、記一筆 boundary 事件（不記 body）
  → 相符：每個 event 以 webhookEventId 去重後寫入 LineWebhookEvent
  → 立即回 200
  → 之後由背景處理讀收件匣（身分、群組、鏡射、媒體）
```

- 這條 route 不讀 cookie、不呼叫 `requireUser()`；它的身分證明只有簽章。簽章不過就什麼都不做。
- 處理與回應分離：先落地再回 200，避免 LINE 重送風暴；處理失敗可從收件匣重放。
- 回應永遠是空的 200 或 4xx，不回任何內部狀態、錯誤訊息或是否認得這個群。
- `LINE_CHANNEL_SECRET` 與 `LINE_CHANNEL_ACCESS_TOKEN` 只在伺服器，不進 DTO、log、稽核或 client bundle。
- webhook 內容一律視為不可信輸入：文字只當資料存、渲染時跳脫；不依訊息內容執行任何動作（唯一例外是 §3 的綁定代碼比對，且比對結果仍需網站端確認）。
- 重送（`deliveryContext.isRedelivery`）與重複 id 不得產生第二列訊息；`ProjectChatMessage` 既有的 `(channelId, externalRef)` 唯一鍵是第二道保險。

## 3. LINE 身分

| 類別 | 建立方式 | 權限 |
|---|---|---|
| 成員帳號 | 本人在設定頁發起、傳代碼給 bot、**回到網站確認「是我」** | 收個人推播；群內發言歸到其席位；可認領群組（另需專案管理權限） |
| 外部聯絡人 | bot 在**已綁定**的群裡第一次看到該 userId 時自動建立 | 只被辨識；永不推播；不對應任何登入身分 |

- 代碼：伺服器產生、至少 40 bit 熵、只存雜湊、10 分鐘有效、單次使用、每個 LINE 帳號每小時嘗試上限 5 次。
- 代碼只能在一對一聊天室使用；出現在群組裡的代碼一律忽略（避免在客戶面前綁定，也避免旁人撿走）。
- 網站確認是成立條件：webhook 收到正確代碼只把綁定推進到「待確認」，並把該 LINE 帳號的顯示名稱與頭像顯示給**發起代碼的那個已登入成員**。本人未確認，綁定不存在。
- 一個 lineUserId 只能綁一個成員；一個成員同時只有一個有效的 LINE 帳號。改綁要先解除。
- `unfollow`（封鎖）→ 標記推播失效並顯示在設定頁；不刪綁定。
- 解除連結：本人隨時可做；之後該帳號在群裡的發言退回外部聯絡人的呈現方式，歷史訊息的作者欄位不回溯改寫。
- 公司管理者看得到「誰已連結」，看不到他人的 lineUserId 原值，也不能代替他人綁定。

## 4. 群組

- bot 被邀進群（`join`）→ 建 `LineGroup`，狀態未認領。**未認領期間不保存任何訊息內文、附件或發話者**，只累計訊息數與最後活動時間。
- 未認領超過 72 小時 → bot 自動退群並標記已退出。
- 認領條件（伺服器端全部檢查）：操作者對目標專案有管理權限；操作者自己的 LINE 帳號已連結；該群裡至少出現過一位已連結成員（邀請者或發話者）。
- 一個群同時只有一筆有效綁定（資料庫層以條件式唯一索引保證，不靠應用程式檢查）。
- 綁定之後才開始鏡射；綁定前的訊息不回補（平台不提供，未認領期間也沒存）。
- 解除綁定：停止寫入、歷史保留唯讀、可選擇讓 bot 退群。被移出群（`leave`）視同停止寫入並在專案設定顯示。
- `LINE_MIRROR` 頻道一律唯讀：站內不回傳訊息到 LINE。

## 5. 對外輸出

系統對 LINE 的發話只有以下三種，其他一律不存在：

| 輸出 | 對象 | 內容限制 |
|---|---|---|
| 綁定確認、測試推播 | 成員本人，一對一 | 固定文字 |
| 個人推播（每日摘要、逾期提醒） | 已連結且未封鎖的成員，一對一 | 確定訊號可帶標題；**潛在訊號只帶數量，不帶原話**；不含金額、薪資、他人私人空間的內容 |
| 群組揭露 | 剛完成綁定的群組，**每群一次** | 下方那一句，不加其他內容 |

揭露文字（Owner 2026-10-13 核准，照原文）：

> 大家好，我是圓展的專案助理。本群組的對話會同步到圓展的專案工作區，供專案成員查閱。

- 揭露在認領當下以一次性 push 送出（用掉「群人數」則額度）；額度不足時延到該群下一則訊息以 reply 補發，期間專案設定標示「揭露尚未送出」。
- 除了這一句，bot 不在任何群組發話：不回覆、不提醒、不貼摘要、不回應 @。
- 不對未綁定的 LINE 帳號、外部聯絡人或群組做任何 push。

## 6. 資料可見性

- 鏡射進來的訊息屬於專案；可見範圍沿用專案能力解析（`project-capability.service.ts`，deny-by-default）。沒有該專案讀取權的席位看不到頻道、訊息、附件，也看不到由它產生的潛在訊號。
- 訊號頁右欄的群組清單只列操作者有權的專案底下的群；未認領群組只給公司 OWNER／ADMIN 與有專案管理權限的人看，且只有群名、人數、時間。
- LINE 內容不進 Client Portal、不進任何公開 route、不進對外分享連結。
- 附件走既有的專案硬碟與下載授權（查到引用列才簽網址），不另開路徑。

## 7. AI 對話分析邊界

沒有自動、排程或背景的 AI 分析。每一次送出都對應一筆由人按下確認的紀錄。

```text
人選取（專案、群組、區間、可排除個別訊息）
  → 伺服器以規則去識別化，產生草稿（訊息 id ＋ 遮蔽決定）
  → 人並排檢視原文與送出版本，補遮蔽、還原或排除
  → 人按下確認（記錄確認人、時間、內容雜湊）
  → 伺服器依「訊息 id ＋ 遮蔽決定」重組送出內容，雜湊須與確認時相同
  → 單次請求送模型供應商（無工具、無資料庫存取、固定系統提示、固定輸出格式）
  → 驗證輸出格式 → 以伺服器端代號對照表還原 → 寫成潛在訊號
```

必守條件：

1. **送出內容由伺服器重組**，不採用瀏覽器上傳的文字。雜湊不符即中止。
2. 去識別化只用規則與字典，在本系統內執行；不得呼叫任何外部服務來做遮蔽。
3. 代號對照表（代號 ↔ 真實身分）只存在伺服器，不送出、不進 DTO。
4. 圖片、影音、語音、檔案內容與檔名不送出。
5. 確認之後任何遮蔽變動都使確認失效。
6. 誰能發起與確認：對該專案有管理權限的人。發起人與確認人可以是同一人，兩者都記錄。
7. 每次上限 500 則、區間 31 天。
8. 模型輸出是不可信資料：格式不符整批丟棄；文字渲染時跳脫；結果只能成為**潛在**訊號，採納與否仍由人決定。
9. 介面不得使用「已完全去識別化」這類保證用語；用「已遮蔽 N 處，請確認」。規則抓不到字典外的名字，這是已知限制，人工確認就是為此存在。
10. 供應商必須符合：輸入不用於訓練、保留期限有明文。**供應商與模型由 Owner 在 S3b 開工前指定並補進本節**；未指定前這條路徑不得啟用。

規則式的潛在訊號（「外部提問逾時未回」「@ 到已連結成員」）在系統內執行、不外送，不在本節限制內。

## 8. 保留與刪除（Owner 2026-10-13 核准）

| 資料 | 保留 |
|---|---|
| `LineWebhookEvent` 原始事件 | 處理成功後 30 天清除；簽章失敗的不存 body |
| 未認領群組 | 不存內文；退群後 30 天清除群組列 |
| 鏡射訊息與附件 | 隨專案；解除綁定後保留唯讀；專案刪除時一併刪除（既有 cascade） |
| 一次性代碼 | 到期或使用後 24 小時清除 |
| `ConversationAnalysisRun` 的送出內容（已遮蔽）與代號對照 | 180 天後清除內容與對照，保留中繼資料（誰、何時、範圍、數量、雜湊） |
| `DeidTerm` 工作區遮蔽詞 | 隨工作區，可由管理者逐筆刪除 |
| 外部聯絡人 | 所屬群組全部解除且訊息已刪除後清除 |

`unsend`（對方收回訊息）：該則訊息內文與附件清除，保留一列「訊息已收回」；由它產生且尚未採納的潛在訊號一併作廢。

## 9. 稽核事件

以下動作寫入既有稽核軌跡，不含訊息內文與 token：成員綁定成立／解除、群組認領／解除／bot 被移出、揭露送出（群、時間、用掉幾則）、推播額度達 80% 與用盡、對話分析的發起／確認／送出／結果（含則數、遮蔽數、雜湊、供應商與模型）、潛在訊號的採納／併入／忽略（含原因）、遮蔽詞新增與刪除、簽章驗證失敗次數（彙總）。

## 10. NANDA Agent Protocol Gate

這項工作新增一個 AI 能力（對話判讀）。依 ARC-028 §5：

1. 新增一個 agent 能力，不改既有 agent。
2. 分類：**internal runtime**。不是 governance-only，也不是 external-registerable。
3. `externalRegisterable: false`。沒有對外 endpoint、不被外部 agent 呼叫、不接受跨組織協作。
4. 與外部的唯一接觸是 §7 的單次模型請求，送出的是經人確認的去識別化 scoped context package，符合 `AGENTS.md` §11「外部只拿 scoped context、輸出是待審提案」。

AgentFacts-lite 草案（S3b 實作時寫入 `internal-agent-manifests.agentfacts-lite.json`）：

```json
{
  "id": "personal-os:conversation-signal-analyst",
  "agent_name": "urn:agent:personal-os:ConversationSignalAnalyst",
  "label": "ConversationSignalAnalyst",
  "description": "Reads a human-selected, de-identified, human-confirmed slice of a project chat and proposes candidate signals.",
  "version": "0.1.0",
  "provider": { "name": "Personal OS", "url": null },
  "lifecycle": {
    "status": "planned-internal-runtime",
    "ownerModule": "company-operating/signal",
    "sourceOfTruth": "docs/02_architecture-and-rules/AUT-010_line-webhook-identity-group-and-conversation-analysis-boundary.md"
  },
  "endpoints": { "internal": [], "external": [] },
  "protocols": ["internal"],
  "capabilities": [
    {
      "id": "propose-signal-candidates",
      "description": "Return candidate signals (kind, message indexes, summary, suggested due date, confidence) for a confirmed de-identified conversation slice.",
      "riskLevel": "HIGH",
      "requiresHumanApproval": true,
      "allowedTargetModules": ["company-operating/signal"]
    }
  ],
  "skills": [],
  "auth": { "methods": ["server-session"], "requiredScopes": ["project:manage"] },
  "trust": {
    "approvalLevel": "HUMAN_APPROVAL_REQUIRED",
    "dataVisibilityLevel": "de-identified-project-chat-slice",
    "boundaryPolicy": "docs/02_architecture-and-rules/AUT-010_line-webhook-identity-group-and-conversation-analysis-boundary.md",
    "attestations": []
  },
  "observability": { "evidenceReports": [], "lastVerification": null, "telemetryClaims": [] },
  "registry": {
    "internalDiscoverable": true,
    "externalRegisterable": false,
    "registrationStatus": "not-registered",
    "registryTargets": []
  }
}
```

未採用：MCP／A2A 對外暴露這個能力（沒有需求，且會讓外部 agent 接觸客戶對話）；讓模型以工具讀取聊天室（等於繞過去識別化與人工確認）。

## 11. 驗收用的負向測試

實作各段時必須有對應的自動化檢查：

| 段 | 必須失敗的情境 |
|---|---|
| S1 | 簽章錯誤或缺少的請求不寫入任何列；同一 `webhookEventId` 重送只處理一次；過期、用過或錯誤的代碼不產生綁定；代碼正確但網站未確認時推播名單不含此人；在群組裡傳代碼無效；已封鎖的成員不被推播 |
| S2 | 未認領群組的訊息內文不落地；沒有專案管理權限或自己未連結者無法認領；同一群第二筆有效綁定被資料庫拒絕；無專案讀取權的席位讀不到頻道與訊息；對 `LINE_MIRROR` 頻道的寫入被拒絕；揭露每群只送一次 |
| S3a | 潛在訊號不計入逾期、不擋收工、不進側欄徽章；忽略未填原因被拒絕；收回的訊息使未採納的潛在訊號作廢 |
| S3b | 沒有確認紀錄時送不出去；確認後改動遮蔽使確認失效；瀏覽器竄改送出文字無效（雜湊不符中止）；送出內容不含任何已遮蔽的原字串與代號對照；模型輸出格式不符時不產生任何潛在訊號；無專案管理權限者無法發起 |

## 12. 待 Owner

1. ~~核准本文件（§2–§4、§6、§7、§9 的邊界）。~~ 2026-10-13 核准。
2. ~~核准或改寫 §5 的揭露文字。~~ 2026-10-13 照原文核准。
3. ~~核准或調整 §8 的保留期限。~~ 2026-10-13 照提案核准。
4. S3b 開工前指定模型供應商與模型。
5. 本人操作：在 LINE Developers 建立 provider 與 Messaging API channel；開啟「允許加入群組」；填入 webhook URL；把 channel secret 與 access token 放進正式環境變數。若日後要加 LINE Login，必須建在同一個 provider 底下（userId 以 provider 為範圍，channel 建立後不能搬）。

## 14. S1a 實作紀錄（2026-10-13，`LINESIG-S1a`）

依本文件 §2、§3、§5、§8、§9 實作 webhook 收件匣與成員綁定。與條文的對應，以及實作時定下來的細節：

| 條文 | 實作 |
|---|---|
| §2 路徑 | `POST /api/line/webhook`（`src/app/api/line/webhook/route.ts`）。不讀 cookie、不呼叫 `requireUser()`；只匯出 POST |
| §2 簽章 | `verifyLineSignature`：對 `request.text()` 的原始字串做 HMAC-SHA256、Base64、常數時間比對。期望值以 `openssl` 另外算出來對照 |
| §2 不符即丟棄 | 回空的 200、不寫任何列；只留一行不含內容的 log。沒有設定密鑰的環境同樣什麼都不收 |
| §2 先落地再回應 | 簽章通過的事件寫入 `line_webhook_events` 後回 200；處理放在 `after()`。落地失敗回空的 500 讓 LINE 重送 |
| §2 去重 | `webhook_event_id` 唯一鍵＋`skipDuplicates`；處理前逐列認領（`claimed_at`），兩個請求同時處理也只做一次 |
| §2 不可信輸入 | 落地前去內容：訊息內文不存；一對一聊天室裡長得像代碼的字串在落地前就換成雜湊 |
| §3 代碼 | `YZ-XXXX-XXXX`，32 個字 × 8 碼＝40 bit；以 channel secret 為金鑰的 HMAC 存雜湊；10 分鐘、單次使用；每個 LINE 帳號每小時錯 5 次後不受理 |
| §3 群組裡的代碼無效 | 群組事件不產生代碼雜湊，等於沒看到 |
| §3 網站確認 | webhook 只能把綁定推進到 `pending`（10 分鐘）；`confirm` 只作用在呼叫者自己的席位。BFF 沒有任何欄位能指定「替誰」 |
| §3 一對一關係 | `line_identities` 的兩個唯一鍵：`(workspace, actor_key)` 與 `(workspace, line_user_id)` |
| §3 封鎖 | `unfollow` → `push_enabled = false`；`follow` 恢復。不刪綁定 |
| §3 管理者可見範圍 | 負責人的回應多一個 `team`（誰連了、推播是否有效）。任何回應都不含 `line_user_id` |
| §5 對外輸出 | 只有固定文字：代碼已收到／無效／次數過多／衝突（reply，免費）、已連結與測試推播（push，各 1 則）。`listPushRecipients()` 是唯一產生收件人的地方 |
| §8 保留 | 處理完 30 天的事件、到期或使用後 24 小時的代碼，在每次處理收件匣時順手清除 |
| §9 稽核 | 連結成立與解除各寫一列 `operating_command_logs`（entity「LINE 連結」），不含 userId |

與條文不同或條文沒寫到的地方：

1. **「已連結」不是用 reply 送的。** 確認發生在網站上，當下沒有 replyToken（與 §5 群組揭露是同一個原因）。改用一則 push，用掉 1 則額度。
2. **共用帳號不能綁定。** `canSwitchActor` 的席位不代表任何一個人，產生代碼會被拒絕。
3. **S1 不碰群組。** bot 被拉進群（`join`）就立刻離開；群組訊息只留一列不含內容的事件。§4 的未認領流程等 S2。開通時「允許加入群組」可以先不開。
4. **LINE 沒有提供名稱時**（個人資料 API 失敗）確認畫面會明說無法核對，不顯示空白讓人直接按。
5. **每日摘要與逾期提醒尚未實作**（`LINESIG-S1b`）：確定訊號目前在瀏覽器裡推導，伺服器端要先有同一份規則才排得了程。這一段只有測試推播。

新增環境變數（只在伺服器）：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`。兩者缺一，webhook 不收、綁定動作回 `line_not_configured`。

Migration `20261013090000_line_identity_and_webhook_inbox`：三張新表，純新增，不改、不讀既有的表，無回填。回復為 `DROP TABLE` 三張表。

實作前要確認的三點，現況：replyToken 的有效時間未從官方頁面取得明文（實作在收到事件後立即使用，不依賴它）；另外兩點屬於 S2。

## 13. 來源

- [LINE Developers：Receive messages (webhook)](https://developers.line.biz/en/docs/messaging-api/receiving-messages/)
- [LINE Developers：Group chats and multi-person chats](https://developers.line.biz/en/docs/messaging-api/group-chats/)
- [LINE Developers：Get user IDs](https://developers.line.biz/en/docs/messaging-api/getting-user-ids/)
- [LINE Developers：Messaging API pricing](https://developers.line.biz/en/docs/messaging-api/pricing/)
- 本機：`prisma/schema.prisma`（`ProjectChatChannel`／`ProjectChatMessage`）、`src/lib/services/project-capability.service.ts`、`docs/2_agent-input/generated/agent-loop/agent-registry/internal-agent-manifests.agentfacts-lite.json`

實作前要再對官方文件確認的三點：replyToken 的有效時間；群組訊息事件在什麼條件下不帶 `source.userId`；群組成員個人資料 API 對未加好友成員是否可用。本文件的規則已按最保守的情況撰寫。
