# Agent Loop Evidence Report

## Task

- Task ID: `LINESIG-S0`（核准紀錄）＋ `LINESIG-S1a`
- Title: Owner 核准 AUT-010；LINE webhook 收件匣與成員綁定
- Date: 2026-10-13
- Agent: Claude（Owner-directed；Owner 訊息：「核准 AUT-010，揭露文字與保留期限照你提的」）

## Source Docs Read

- `AGENTS.md`（§6 BFF-first、§9 資料規則、§10 授權、§11 高風險、§13）
- `AUT-010` 全文、`RES-036` §3／§4／§9、`PLN-060` LINESIG 區段
- 程式：`src/proxy.ts`、`src/lib/auth/redirect.ts`、`src/lib/auth/yuanzhan-actor.ts`、`src/lib/services/auth.service.ts`、`operating-commands.service.ts`（workspace 建立、稽核列）、`operating-audit-log.service.ts`、`/api/company/operating/{commands,audit}/route.ts`、`src/lib/db.ts`、`scripts/check-operating-roundtrip.ts`、`scripts/operating-proof-migrate.mjs`、`operating-persistence.source.js`（`OP_LIVE`）
- Next.js 16 文件：`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`、`…/03-file-conventions/route.md`（Webhooks：`request.text()`）

## Scope

- In scope：核准寫回文件；公開 webhook（驗簽、去重、落地、處理）；成員綁定（代碼、等待確認、確認、不是我、解除）；封鎖偵測；測試推播；狀態 BFF；「來源與推播」的我的 LINE；migration。
- Out of scope：每日摘要與逾期提醒（`LINESIG-S1b`）、群組（S2）、潛在訊號落地（S3a）、AI 送出（S3b）。沒有推 `main`、沒有碰正式庫、沒有設定任何正式環境變數。

## Strategic Review

- 卡點由「AUT-010 待核准」變成「Owner 開通 channel 並設定密鑰」。webhook URL 必須先存在才填得進 LINE 後台，所以 route 要先做。
- 這一輪是 runtime ＋ schema ＋ 本機資料庫證明，不是文件輪。
- 之後多出來的能力：成員能把自己的 LINE 連到席位，系統有了一份可信的推播名單。

## Research / Reference Basis

- 需求理解 88（High）→ 三輪：① 本機授權與 BFF 寫法 ② LINE 官方的簽章與重送規則 ③ 驗收切分（哪些能在沒有真 channel 時證明）。
- 外部來源：
  - [LINE Developers：Verify webhook signature](https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/) —— HMAC-SHA256、channel secret 為金鑰、輸入是收到的原始 body、驗簽前不得改動資料、UTF-8。編碼為 Base64（頁面以 `openssl base64` 示範）。
  - [LINE Developers：Receive messages (webhook)](https://developers.line.biz/en/docs/messaging-api/receiving-messages/) —— 非 2xx 會重送；同一事件可能送達多次，以 `webhookEventId` 辨識；建議非同步處理；重送的事件只有 `deliveryContext.isRedelivery` 不同。
- 官方頁面沒有取得明文的：replyToken 的有效時間（參考文件索引頁不含細節）。實作在收到事件後立即使用，不依賴這個數字。
- 選定：一個席位一列的 `line_identities`（兩個普通唯一鍵）；代碼在落地前換成雜湊；處理放 `after()` 並逐列認領。
- 捨棄：
  - 條件式唯一索引（Prisma schema 表達不了，會讓 `migrate diff` 永遠有差異）→ 改為一席位一列、解除時把 userId 清成 NULL。
  - 簽章不過回 4xx（LINE 文件說「以錯誤結束」）→ 維持 `AUT-010` §2 核准的空 200：不讓外部從回應分辨簽章對不對。
  - 把原始事件整包存下來再處理 → 代碼原值與訊息內文會落地，違反 §3「只存雜湊」。
  - LINE API base URL 做成環境變數以便測試 → 等於多一個能把 access token 導到別處的設定。測試改用注入假的 `LineApi`。
  - 為 QR 新增套件 → 顯示官方帳號 ID 與加好友連結。

## Findings

1. `AUT-010` §4.1 寫的「bot 用 replyToken 回已連結」做不到：確認在網站上，當下沒有 replyToken。改用 push（1 則）。
2. 共用帳號（`canSwitchActor`）若能綁定，等於能替負責人綁 LINE。擋掉。
3. 個人資料 API 失敗時，確認畫面沒有名字可核對。加了明確的警示文字。
4. `prisma migrate diff`（migration 歷史 → schema）在新表上沒有差異，但回報兩個既有差異：`project_tasks(objective_id)` 與 `rhythms(workspace_id, workbench_ref)` 的索引存在於 migration、不在 schema。與本輪無關，未處理。
5. LINE 官方帳號預設開著「自動回應訊息」與「加入好友的歡迎訊息」。不關的話，成員傳代碼時會多收到一則罐頭回覆。這是 LINE 後台的設定，寫進給 Owner 的步驟。

## Implementation

| 檔案 | 內容 |
|---|---|
| `src/lib/line/line-webhook-contract.ts`（新） | 純函式：驗簽、代碼產生／正規化／雜湊、信封解析、事件去內容、bot 的固定文字 |
| `src/lib/line/line-api.ts`（新） | `LineApi` 介面與實作：reply、push、個人資料、官方帳號資訊、額度、離開群組。失敗只回 false／null，log 不含 userId |
| `src/lib/services/line-identity.service.ts`（新） | `receiveLineWebhook`、`processLineInbox`、`getLineStatus`、`createBindCode`、`confirmBinding`、`rejectBinding`、`unlinkLine`、`sendTestPush`、`listPushRecipients` |
| `src/app/api/line/webhook/route.ts`（新） | 公開 POST；`request.text()`；空回應；`after()` 處理 |
| `src/app/api/company/line/route.ts`（新） | `requireUser()` ＋ 席位 ＋ database 模式；GET 狀態、POST 五個動作 |
| `prisma/schema.prisma`、`prisma/migrations/20261013090000_line_identity_and_webhook_inbox/` | `LineIdentity`、`LineBindCode`、`LineWebhookEvent` |
| `signal-inbox.source.js`／`.css`、`runtime.js`、`styles.ts` | 我的 LINE 四個狀態、成員連結狀態、開通步驟依伺服器狀態、輪詢（716 handler templates） |
| `scripts/check-line-contract.mts`、`scripts/check-line-identity.ts`（新）、`scripts/check-signal-inbox.mts` | 機檢；`package.json` 新增 `ops:line:check`、`ops:line:proof` |

### Migration 影響

三張新表，純新增。不改、不讀任何既有的表，沒有外鍵指向既有的表，沒有回填，不鎖既有的表。
回復：`DROP TABLE "line_webhook_events", "line_bind_codes", "line_identities";`
部署時由 `vercel.json` 的 `prisma migrate deploy` 套用 —— 也就是推上 `main` 的那一刻。

### 授權邊界的變動

- 新增一條無登入的公開 route。它寫入的只有 `line_webhook_events`（簽章通過時），以及經由代碼比對間接把 `line_identities` 推進到 `pending`。
- `src/proxy.ts` 沒有改。`/api/line/webhook` 不在受保護的前綴裡，proxy 不會把它導去登入頁。
- 既有的 route、`requireUser()`、席位解析都沒有改。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `pnpm db:validate`、`pnpm db:generate` | 通過 |
| `ops:prisma:check`、`ops:migrations:check` | PASS；82 tables／68 enums 全由 migration 建立 |
| 拋棄式本機 Postgres 16：`pnpm ops:proof:migrate` | 全串套用成功，含 `20261013090000_line_identity_and_webhook_inbox` |
| `prisma migrate diff`（該資料庫 → schema） | 新的三張表無差異（另有兩個既有差異，見 Findings 4） |
| `pnpm ops:line:check` | **26/26**（簽章期望值由 `openssl` 另外算出） |
| `pnpm ops:line:proof`（同一個資料庫） | **42/42** |
| `pnpm ops:roundtrip`（同一個資料庫） | 35 checks PASS |
| `pnpm ops:signal:check` | 畫面 **94/94**、規則 30/30、去識別化 40/40 |
| `project:ui:check`／`ops:commands:check`／`ops:fields:check`／`ops:persistence:check`／`ops:audit-trail:check` | 122/122／42 PASS／364 PASS／通過／33/33 |
| `pnpm exec tsc --noEmit --pretty false` | exit 0 |
| `pnpm build`（資料庫變數指向本機測試庫） | exit 0；`/api/line/webhook` 與 `/api/company/line` 皆為動態 route |
| `ops:line:proof` 不帶三個環境變數 | 拒絕執行 |

`AUT-010` §11 S1 的六條，在 `ops:line:proof` 裡各自對應：

| 必須失敗的情境 | 檢查 |
|---|---|
| 簽章錯誤或缺少的請求不寫入任何列 | 事件數為 0；系統沒有對任何人說話 |
| 同一 `webhookEventId` 重送只處理一次 | 重送 `stored = 0`；回覆次數只多 1 |
| 過期、用過或錯誤的代碼不產生綁定 | 三種各一條 |
| 代碼正確但網站未確認時推播名單不含此人 | `listPushRecipients()` 為空 |
| 在群組裡傳代碼無效 | `group_ignored`；代碼仍未使用 |
| 已封鎖的成員不被推播 | 名單為空；測試推播被擋且沒有呼叫 LINE |

真實瀏覽器端到端（worktree 的 dev server、mock 登入、資料庫指向本機測試庫、**假的** channel secret 與 token）：

| 動作 | 結果 |
|---|---|
| 未簽章、錯簽章的 POST | 200 空回應；資料庫沒有對應的列 |
| 簽章正確的空事件（LINE 後台的 Verify） | 200；一列 `verify`；畫面第四步打勾、顯示已連線 |
| GET `/api/line/webhook` | 405 |
| 按「連結我的 LINE」 | 顯示 `YZ-XXXX-XXXX` 與有效時間 |
| 把代碼以群組事件送進 webhook | 畫面仍在等待代碼；該列 `group_ignored`、payload 沒有內文 |
| 把代碼（小寫）以一對一事件送進 webhook | 幾秒內畫面變成「等你確認」；該列 payload 只有 `codeHash` |
| 按「是我，完成連結」 | 已連結、推播正常、連結時間；稽核一列「成員 LINE 帳號連結成立」 |
| 送 `unfollow` 後重新整理 | 推播失效、說明如何恢復、沒有測試推播按鈕 |

未驗證：

- **沒有接真的 LINE channel。** reply、push、個人資料、官方帳號資訊、額度、離開群組六個呼叫只用假的實作驗過時機與內容；端到端那一次用的是假 token，LINE 回 401，畫面因此顯示「LINE 沒有提供名稱」。
- 沒有推 `main`、沒有在正式庫套用 migration、沒有在正式站操作。
- Vercel 上 `after()` 的實際行為沒有實測（本機 dev server 上有執行）。若它沒跑完，事件留在收件匣，下一個 webhook 進來時會一起處理。

## NANDA Alignment

不適用。LINE 官方帳號是固定文字的通知管道，不是 agent：沒有模型、沒有工具、不依訊息內容採取行動（唯一例外是代碼比對，且結果仍需人在網站確認）。`externalRegisterable` 不變。

## Risks

- 公開 route 會被掃描。未簽章的請求只花一次 HMAC 與一行 log；單次請求上限 1MB。沒有做速率限制。
- 代碼外流：別人可以先一步把代碼傳給官方帳號，但成立與否取決於本人在網站看到的名字與頭像。名字拿不到時這道檢查變弱，畫面有警示。
- `after()` 若在平台上被提前中止，綁定會延遲到下一個 webhook 才推進；不會遺失。
- 每次確認與測試推播各用掉 1 則額度。
- 官方帳號的自動回應若沒關，成員傳代碼會收到兩則訊息（LINE 的罐頭回覆與系統的回覆）。

## Next Decision

Owner 決定是否推上正式站。推送的效果：正式庫新增三張表；`/api/line/webhook` 上線（未設定密鑰前不收任何東西）；訊號頁「來源與推播」第三、四步顯示等待設定。

推上去之後，只有 Owner 能做的事：

1. LINE Developers：在同一個 provider 底下建立 Messaging API channel。
2. Vercel 正式環境變數：`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`（長期 token），然後重新部署。
3. LINE 後台 Messaging API 分頁：Webhook URL 填 `https://www.person.yzedtech.com/api/line/webhook`，開啟 Use webhook，按 Verify。
4. LINE Official Account Manager：關閉「自動回應訊息」與「加入好友的歡迎訊息」。「允許加入群組」先不要開。
5. 回到訊號頁「來源與推播」：四個步驟都打勾後，按「連結我的 LINE」。

通過的訊號：第四步顯示「最近一次收到」的時間；連結後按測試推播，手機收到一則。

之後的實作：`LINESIG-S1b`（每日摘要推播）。
