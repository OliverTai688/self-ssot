# 營運工作台上線缺口：分層盤點與開發策略

**Document ID:** `RES-031`
**Date:** 2026-09-23
**Status:** ACTIVE
**Required:** [ARC-042](../02_architecture-and-rules/ARC-042_operating-workbench-persistence-contract.md)、[SCH-008](../02_architecture-and-rules/SCH-008_operating-workbench-collection-schema.md)、[PLN-074](../05_execution-plans/PLN-074_operating-workbench-persistence-implementation-plan.md)、[PLN-071](../05_execution-plans/PLN-071_yuanzhan-account-and-private-launch-plan.md)

---

## 1. 為什麼要分層

M0–M6 之後，「還有什麼沒做」這個問題已經無法用一張清單回答——剩下的東西不在同一個平面上。有些是**資料會不會壞**，有些是**我們怎麼知道它沒壞**，有些是**誰能進來**，有些是**上線之後怎麼活著**。混在一起排優先序，結果一定是挑最容易的做。

分層之後優先序自己會浮出來：**下層沒站穩，上層做再多都是假的。**

| 層 | 問的問題 | 現況 |
|---|---|---|
| L1 資料正確性 | 寫進去的東西讀得回來嗎、會不會被蓋掉 | 大致成立，有三處已知破口 |
| L2 驗證能力 | 我們**怎麼知道** L1 成立 | 最弱的一層 |
| L3 身分與權限 | 誰能進來、誰看得到什麼 | 過渡方案，可用但不完整 |
| L4 運維 | 壞掉的時候看得見嗎、回得去嗎 | 幾乎空白 |
| L5 產品完整度 | 功能有沒有缺角 | 有明確清單，但不擋上線 |

---

## 2. L2 是目前最弱的一層

到 M6 為止，所有驗證都停在**契約層**（diff 正確、集合宣告一致）與 **schema 層**（欄位名存在、可空性正確）。

沒有任何一條測試真的把一筆紀錄寫進資料庫再讀出來比對。而那正是最容易壞的一段：寫入端與讀取端是**兩份分開的欄位對應**，任一邊改了名字，TypeScript 不會抱怨，畫面只會安靜地少一塊。

### 研究：外界怎麼做

Prisma 官方的整合測試指引主張用 Docker Compose 起一個隔離的資料庫，流程是「起容器 → `prisma migrate deploy` → 跑測試 → 銷毀容器」，並明確要求對**專用測試環境**而非正式或開發資料庫執行，建議用獨立的 `.env.test` 讓「誤連正式庫」在結構上就很難發生。清資料的方式上，官方示範 `deleteMany`，並指出複雜 schema 下它「不太擴展」，建議改用 `TRUNCATE`。[Integration testing with Prisma](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)

Testcontainers 與 Docker Compose 的取捨是這個領域的常見爭論：前者讓測試自己管理容器生命週期、隔離性更好，後者設定簡單、本機與 CI 一致。[Testcontainers vs Docker Compose](https://qaskills.sh/compare/testcontainers-vs-docker-compose)

### 這個 repo 的選擇

**先做「可拋棄目標 + 手動起庫」，不引入 Testcontainers。** 理由是本地限制而非偏好：`binaries.prisma.sh` 在 Cowork VM 與雲端容器都回 403，Prisma engine 兩邊都下載不了，所以測試無論如何都只能在開發機跑。在那個前提下，Testcontainers 多出來的容器編排沒有換到任何隔離性——開發機本來就能起一個本機 Postgres。

已實作：`scripts/check-operating-roundtrip.ts`（`pnpm ops:roundtrip`）。護欄沿用既有 `work-refresh-proof` 的形狀：三個環境變數同時到齊才執行、只接受本機主機、目標等於 `DATABASE_URL` 時直接拒絕。

覆蓋：建立 → 讀回比對 → 冪等重送 → 刪除 → 讀回確認消失，以及金額正負號、日期、列舉標籤反向對應這些最容易在往返中變形的欄位。

### L2 還缺的

| 缺口 | 影響 |
|---|---|
| CI 沒有跑整合測試 | 目前全靠人記得執行 |
| 沒有瀏覽器層的端對端測試 | 「打字 → 重整 → 還在」這條路只有人工驗收 |
| 沒有兩個席位並行的測試 | 合併邏輯只有單機推理，沒有實證 |

---

## 3. L1 的三處已知破口

| 破口 | 說明 | 嚴重度 |
|---|---|---|
| Evidence 凍結快照 | `r.snapshots` 仍在記憶體。凍結是契約行為（驗收通過的固定版本），重整就消失 | 高——它假裝有法律效力 |
| 交易 ↔ 檔案關聯 | `t.fileIds` 沒進 schema。憑證檔案存了，但哪張憑證屬於哪筆交易沒存 | 中 |
| `weekly` / `cash` / `history` / `signals` | 前三個是衍生值可重算，`signals` 形狀未定 | 低 |

前兩項都屬於「**存了一半**」——比完全沒存更危險，因為畫面看起來是完整的。

---

## 4. L3 身分：OTP 的研究結論

使用者要求 OTP 不得影響 Google 登入。研究確認這個約束**天然成立**：

Supabase 對**同一個已驗證 email** 會自動連結身分，結果是**一個 user、一個 user id**，而不是兩個帳號。自動連結的前提是 email 已驗證；未驗證的身分在連結發生時會被移除，這是為了防止 pre-account takeover。[Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

OTP 本身與 Magic Link 共用實作，差別只在信件內容：要送六碼而不是連結，得改 Magic Link 範本讓它帶 `{{ .Token }}`。預設有效期 1 小時、同信箱 60 秒才能再要一次，兩者皆可調。[Passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless)

### 因此改了什麼

`requestEmailOtp` 原本用 `shouldCreateUser: false` 當閘門——那擋的是「Auth user 不存在的人」，不是「不在名單上的人」，等於 email 這條路繞過了 `PERSONAL_OS_TEAM_PROFILES`。現在：

- 寄碼前先過**同一份名單**；不在名單上**回報與成功相同的訊息**但不寄任何東西，否則這個表單會變成帳號存在與否的查詢工具
- 名單上的人 `shouldCreateUser: true`——名單本身就是閘門，名單上的人即使從未用 Google 登入也要能收到碼
- 驗證成功後再過一次名單並建立／綁定 Profile，用的是 `/auth/callback` 同一個函式

Google 那條路一行未動。

### L3 還缺的

| 缺口 | 說明 |
|---|---|
| SMTP 與信件範本 | 純設定。Supabase 內建寄信有每小時 2 封上限，不足以日常使用 |
| 成員管理介面 | 新增／停用／改角色仍要改環境變數並重新部署 |
| 最後一位 owner 保護 | 尚未實作 |
| 登出其他裝置 | 尚未實作 |

---

## 5. L4 運維：目前幾乎空白

這一層之前沒有被盤點過，但它決定「上線之後壞掉時會怎樣」。

| 缺口 | 現況 | 後果 |
|---|---|---|
| 錯誤可見性 | 寫入失敗只有前端徽章與 server log | 夥伴看到「未保存」，我們不會知道 |
| 備份與還原 | 沒有驗證過還原流程 | 資料損壞時只能靠 Supabase 預設 |
| Migration 回滾 | 只有前滾，沒演練過回滾 | 壞掉的 migration 要即時想辦法 |
| 部署回退 | Vercel 有 instant rollback，但沒演練 | 同上 |
| `prisma generate` 進不了這個環境 | 每次加 model 都要人工跑 | 開發摩擦，非正確性問題 |

**建議先做錯誤可見性**——其餘幾項在兩人規模下可以接受「出事再說」，但「不知道出事了」不行。

---

## 6. 建議順序

不是依重要性排，是依「**錯了多久才會發現**」排。

1. **L2 整合測試進 CI**（已寫好，接上即可）——現在每一次改動都是靠人記得驗
2. **L4 錯誤可見性**——寫入失敗目前只有當事人看得到
3. **L1 Evidence 凍結快照**——它假裝有法律效力而實際沒有
4. **L1 交易↔檔案關聯**——存了一半
5. **L3 SMTP 與信件範本**——OTP 程式已就緒，卡在設定
6. **L3 成員管理介面**——改名單還要重新部署
7. **L5 其餘功能缺角**——不擋上線

---

## 7. 停止條件

- SMTP provider 的成本與網域權限未確認前，不執行寄信設定
- 成員停用／角色變更牽涉權限邊界，實作前需確認「停用一個人之後他的歷史紀錄與私人空間怎麼處理」
- 整合測試不得對正式資料庫執行；`ops:roundtrip` 的護欄不得為了方便而放寬
