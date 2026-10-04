# S2 Wave 2a 證據報告：P0 專案不屬於公司 ＋ 權限解析層

- 日期：2026-10-03
- 計劃：`PLN-075` §S2 第 1、2 項（Owner 已於 2026-10-03 批准 S1 整合決策）
- 範圍：修掉「新建專案掛不上公司」這個 P0，並建立 deny-by-default 的能力解析層
- 狀態：**完成**。tsc 錯誤數維持 Wave 1 基線 15（全部仍是 `PrismaClient` 未重新產生），新增檔案 0 錯誤

---

## 1. P0：`createProjectForProfile()` 從來沒寫 `workspaceId`

### 症狀
`Project.workspaceId` 可空、`accessMode` 預設 `PRIVATE`，而建立專案的服務函式
`data` 裡**一個字都沒提 workspaceId**。結果是每一個新建專案都是
`workspaceId = null` ＋ `accessMode = PRIVATE` 的私人專案 —— 五大資源
（硬碟／聊天／會議／計劃／專案本體）一個都接不上，而且症狀要到使用者
打開專案硬碟時才顯形，中間沒有任何錯誤。

### 修法
`src/lib/services/project.service.ts`

1. **workspaceId 由伺服器端解析**：呼叫 `resolveOwnerWorkspaceId(profileId)`，
   並一併設 `accessMode: "WORKSPACE_VISIBLE"`。
2. **不吃前端參數**，三層防線：
   - `CreateProjectForProfileInput` 沒有 `workspaceId`／`accessMode`／`ownerId` 欄位（型別層）；
   - 新增 `assertNoClientSuppliedScope(input)`，是函式主體的**第一行**，
     發現這三個 key 就丟 `ProjectWorkspaceBindingError("client_supplied_scope")`（執行期層）；
   - 入口 `CreateProjectSchema`（`src/app/actions/work.ts`）本來就不收，checker 釘住（契約層）。
3. **解析不到 workspace 就明確失敗**：丟
   `ProjectWorkspaceBindingError("no_workspace_membership")`，訊息可讀
   （「這個帳號還沒有可用的公司工作區成員資格，無法建立專案⋯」）。
   **不退回建私人專案**，因為那正是這次要修掉的東西。checker 另外驗證
   這個 `throw` 的位置排在 `db.project.create(` **之前**，否則「先建好再抱怨」等於沒擋。

形狀照抄 `src/app/api/company/operating/uploads/route.ts` 的 `resolveActor()`：
> 工作區在這裡才解析，不是從前端送來的：它是授權的範圍本身，
> 讓呼叫端指定等於讓呼叫端自己決定要看哪一個租戶的資料。

### OD-C：開啟專案硬碟時自動綁定
新增 `ensureProjectWorkspaceBinding(profileId, projectId): Promise<string>`，冪等：

| 情況 | 行為 |
|---|---|
| 非擁有者 | `assertCanAccessProject()` 擋下（綁定是擁有者層級動作，不開放給 membership／grant） |
| `workspaceId` 已有值 | 原樣回傳，**一個欄位都不動** |
| `workspaceId IS NULL` | `updateMany({ where: { id, workspaceId: null } })` 寫入，回傳新值 |
| 併發（`count === 0`） | 重讀資料庫現值回傳，**不覆寫**別人剛綁好的結果 |
| 沒有任何 membership | 丟 `no_workspace_membership`，可讀訊息 |

`accessMode` 只在同一次綁定裡從 `PRIVATE` 升為 `WORKSPACE_VISIBLE`。理由寫在程式碼註解裡：
`workspaceId` 是 null 的時候 `PRIVATE` 不帶任何資訊（沒有工作區可以被看見），
所以那不是刻意的隱私設定，而是 P0 留下的未設定狀態。
**已經綁了工作區卻刻意設 `PRIVATE` 的專案不在這條路徑上，不會被動到。**

### 公司 workspace 怎麼解析（OD-A）
公司全名已定案「圓展教育科技有限公司」，但 `resolveOwnerWorkspaceId()`
**不做名稱字串比對** —— 名稱是顯示字串、會被改，拿它當鍵等於把授權綁在可編輯欄位上。
走既有的 `WorkspaceMembership` 關聯：

```
status = ACTIVE ∧ role ∈ {OWNER, ADMIN, MEMBER} ∧ workspace.status = ACTIVE
```

確定性排序（同一個人每次拿到同一個 workspace）：
`WorkspaceType.TEAM` 優先於 `PERSONAL` → membership `OWNER` > `ADMIN` > `MEMBER`
→ `Workspace.createdAt` 早的優先 → `id` 收尾。`GUEST` 不列入：訪客不能當專案的家。

---

## 2. `project-capability.service.ts`：deny-by-default 能力解析層

契約簽章（另一個 agent 的 drive route 直接 import，未改一字）：
`ProjectCapability`（八條）、`assertProjectCapability()`、`resolveProjectCapabilities()`、
`resolveOwnerWorkspaceId()`。

### 決策順序（先到先決定，後面的規則不會再放寬）

| # | 條件 | 結果 |
|---|---|---|
| 1 | `project.ownerId === profileId`（**精確比對，第一條規則**） | 八條全開，直接結束 |
| 2 | 專案沒綁 workspace | 空集合 |
| 3 | 沒有 `status = ACTIVE` 的 `WorkspaceMembership` | 空集合 |
| 4 | 有 `status = ACTIVE` 的 `ProjectAccessGrant` | 用 grant 的角色（明確授權優先，**可以比預設窄**） |
| 5 | 無 grant 且 `accessMode !== WORKSPACE_VISIBLE` | 空集合（成員身分不構成隱含可見性） |
| 6 | 無 grant 且 membership 是 `GUEST` | 空集合（訪客必須有明確 grant） |
| 7 | 無 grant 且 membership 是 `OWNER`／`ADMIN` | 視為 `MANAGER` |
| 8 | 其餘（`MEMBER`） | 用 `Workspace.defaultProjectAccessRole` |
| — | 角色查不到對照表 | 空集合（不是整包放行） |

擁有者那一條**在任何 workspace／membership 查詢之前就結束**，所以
「專案還沒綁公司」或「擁有者不是 workspace 成員」都不會讓既有
`assertCanAccessProject()` 的行為變窄；引入 membership 也沒有讓它變寬。
`Workspace.status !== ACTIVE` 時整個租戶的隱含可見性一併收回。

### 角色 → 能力對照表（唯一的放行來源）

| 角色 | project:read | project:write | drive:read | drive:write | chat:read | chat:write | plan:write | meeting:write |
|---|---|---|---|---|---|---|---|---|
| 專案擁有者 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `MANAGER` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `EDITOR` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `COMMENTER` | ✓ | | ✓ | | ✓ | ✓ | | |
| `VIEWER` | ✓ | | ✓ | | ✓ | | | |
| 無 membership／無 grant | | | | | | | | |

`MANAGER` 與 `EDITOR` 目前能力相同：差別在「能不能再發 grant 給別人」，
那是 `ProjectAccessGrant` 的寫入權，不屬於這八條資源能力，等 S3 的邀請流程再分。

### 錯誤形狀
`ProjectCapabilityError` 帶 `readonly code`，兩個值：
- `project_not_found`（專案不存在）
- `capability_denied`（存在但沒這條能力，訊息含缺哪一條）

`resolveProjectCapabilities()` 在專案不存在時回**空集合**而不丟錯：那是讀取路徑，
用不同錯誤區分「不存在」與「沒權限」等於把專案是否存在洩漏給沒有權限的人。

---

## 3. `scripts/backfill-project-lifecycle-stage.mjs`

Wave 1 的已知落差：`lifecycle_stage` 預設 `PROPOSING`，對進行中的專案是錯的
（`01.共好玟化` 在驗收、`03.幸福文齡` 在執行二期）。

推導只讀既有四個欄位，**一個都不會被寫到**
（`deal_stage`、`operating_status`、`projects.phase`、`projects.status`）。
只寫 `projects.lifecycle_stage`。

| # | rule | 條件 | 結果 |
|---|---|---|---|
| 1 | `closed-by-project-status` | `status ∈ {COMPLETED, ARCHIVED}` | `CLOSED` |
| 2 | `closed-by-deal-stage` | `deal_stage = CLOSED` | `CLOSED` |
| 3 | `acceptance-by-operating-status` | `operating_status` 含「驗收」 | `ACCEPTANCE` |
| 4 | `acceptance-by-phase` | `phase = REVIEW` | `ACCEPTANCE` |
| 5 | `executing-by-operating-status` | `operating_status` 含「進行」 | `EXECUTING` |
| 6 | `executing-by-phase` | `phase ∈ {EXECUTION, MAINTENANCE}` | `EXECUTING` |
| 7 | `contracted-by-deal-stage` | `deal_stage = WON` | `CONTRACTED` |
| 8 | `proposing-by-deal-stage` | `deal_stage ∈ {PROPOSED, CHALLENGEABLE}` | `PROPOSING` |
| 9 | `proposing-by-operating-status` | `operating_status` 含「商機」 | `PROPOSING` |
| 10 | `proposing-fallback` | 其餘 | `PROPOSING` |

刻意的選擇：
- 規則 3／5 用「包含」而非等值：`operating_status` 是自由字串，實際資料有「驗收中」「進行中」這類寫法。
- 規則 5／6 排在 7 之前，所以 `WON` ＋「進行中」得到 `EXECUTING` 而不是停在 `CONTRACTED`
  —— 已接案只是必要條件，執行中是更強的事實。
- 沒有任何規則會推出比既有欄位「更前面」的結論：這支只翻譯既有事實，不做狀態機轉移。

安全邊界：
- **預設 dry-run**。沒有 `--apply` 只印出會改哪些列與前後值，一個 `UPDATE` 都不發。
- `--apply` 另外要求 `PERSONAL_OS_BACKFILL_CONFIRM=I_UNDERSTAND_THIS_WRITES_PROJECT_LIFECYCLE_STAGE`
  （`DATABASE_URL` 平常指向正式 Supabase）。
- 預設只動 `lifecycle_stage = 'PROPOSING'` 的列（未回填的預設值）；人工改對過的列不碰，要全評估才加 `--all`。
- `UPDATE` 的 where 帶 `and lifecycle_stage = <掃描時的值>`，掃描後被別人改過的列會被略過，不蓋掉。
- 推導規則是導出的純函式 ＋ 導出的案例表，checker 直接吃同一組案例，
  所以「規則改了但期望值沒更新」會在 checker 裡爆掉，而不是等到回填當天。

**本輪沒有執行 `--apply`**，也沒有連線任何資料庫。

---

## 4. `scripts/check-project-capability.mjs`

純 node、不連資料庫、不需要產生 Prisma client。輸出慣例照
`scripts/check-operating-persistence.mjs`（`ok  ` / `FAIL` ＋ 末行 `all checks passed` ＋ `exit 1`）。
`package.json` 新增一行：`"project:capability:check": "node scripts/check-project-capability.mjs"`。

守四件事，三件靜態、一件行為：

1. `createProjectForProfile()` 沒有「不設 workspaceId 就建立」的路徑
   （含全 `src/` 掃描：每一處 `db.project.create(` 的 data 都必須帶 `workspaceId`；
   `throw` 必須排在 `create` 之前）。
2. 沒有任何地方從呼叫端參數取 workspaceId 建立專案
   （型別、執行期守門、呼叫端、zod schema、`resolveOwnerWorkspaceId` 不用 name/slug 比對）。
3. **能力解析 deny-by-default —— 行為測試，不是讀程式碼下結論。**
   把 `capabilitiesFromAccessFacts()` 這個純函式從 TS 原始碼取出、剝掉三處型別標註、
   用 `new Function` 實例化（與 `check-operating-persistence.mjs` 實例化 v5 片段同一做法），
   直接餵事實比對集合。三處標註用窄比對，任何一處對不上就整支失敗
   （與 v5 `source-patches.mjs` 的 `rep()` 同一個習慣：寧願吵鬧地壞掉，不要安靜地驗了個空）。
4. `lifecycleStage` 推導對 12 個代表性輸入給出正確的 `stage` ＋ `rule`，
   並驗回填腳本預設 dry-run、`--apply` 需確認字串、只寫 `lifecycle_stage`。

### 這支檢查不是恆真（實測過兩次反向驗證）
| 刻意植入的回歸 | checker 反應 |
|---|---|
| 從 `create` 的 `data` 拿掉 `workspaceId,` ＋ `accessMode` | `FAIL createProjectForProfile 把 workspaceId 寫進 data` ／ `FAIL ⋯設 accessMode` → `2 failing` |
| 把「沒有 membership」改成整包放行八條能力 | `FAIL 沒有 ownership／membership／grant → 空集合` → `1 failing` |
兩次都在驗證後還原，最終狀態 `all checks passed`。

---

## 5. 驗證實測輸出

| 指令 | 結果 |
|---|---|
| `node --check scripts/backfill-project-lifecycle-stage.mjs` | **OK**（無輸出，exit 0） |
| `node --check scripts/check-project-capability.mjs` | **OK**（無輸出，exit 0） |
| `node scripts/check-project-capability.mjs` | **PASS** — 61 項全 `ok`，末行 `project capability: all checks passed` |
| `node scripts/backfill-project-lifecycle-stage.mjs --dry-run --self-test` | **PASS** — `lifecycle derivation self-test: all 12 checks passed` |
| `./node_modules/.bin/tsc --noEmit --pretty false \| grep -c "error TS"` | **15**（＝ Wave 1 基線，未增加）—— 本 Wave 改完時實測 |
| `./node_modules/.bin/tsc --noEmit --pretty false \| grep -v operating-commands.service.ts` | **空**（本 Wave 的檔案 0 錯誤）—— 本 Wave 改完時實測 |
| 同上兩條，在平行 Wave 的 `project-drive.service.ts` 落盤後重跑 | **46 / 35** —— 新增的 31 個全部在**另一個 agent 的** `project-drive.service.ts`，見下 |
| `tsc \| grep -cE "project\.service\.ts\|project-capability\.service\.ts"` | **0** —— 本 Wave 兩個檔案零錯誤 |
| `tsc \| grep -v operating-commands \| grep -v project-drive \| wc -l` | **0** —— 排除兩個 agent 的 stale-client 檔案後完全乾淨 |
| `node scripts/check-operating-persistence.mjs` | **PASS**（回歸確認） |
| `node scripts/check-prisma-structure.mjs prisma/schema.prisma` | **PASS** — `models=79 enums=68 relations=48` |
| `node scripts/check-nested-card.mjs` | **PASS** — 既有基線 143 筆，未增加 |

那 15 個錯誤全部是
`Property 'projectFolder' | 'projectPhaseCycle' | 'projectChatChannel' | 'projectChatMessage' does not exist on type 'PrismaClient'`，
全部落在 `src/lib/services/operating-commands.service.ts:1411–1655`，
是 Wave 1 的已知狀態（PrismaClient 尚未重新產生），本輪未觸碰。

**平行 Wave 的干擾（需記錄）**：本 Wave 的檔案改完並驗過 `15 / 空` 之後，
平行進行的 drive route Wave 把 `src/lib/services/project-drive.service.ts` 寫進工作區，
tsc 總數變成 46。新增的 31 個**全部**落在那個檔案，而且是同一類
「PrismaClient 尚未重新產生」的錯誤（`projectFolder` 不存在、`OperatingAsset` 的
`projectId`／`folderId` 不存在）—— 與 Wave 1 的 15 個同源，不是本 Wave 造成的。
排除 `operating-commands.service.ts` 與 `project-drive.service.ts` 兩個檔案後，
tsc 輸出為 **0 行**；本 Wave 兩個檔案各自為 **0 錯誤**。
在 macOS 執行 `pnpm db:generate` 後，這 46 個應全數消失。

### 沒跑到的檢查
`ops:check` 裡走 `tsx` 的項目（`check-operating-commands`、`check-operating-runtime` 等）
在這個 Linux VM 無法執行：`node_modules` 是 macOS 安裝的，只有
`@esbuild/darwin-arm64`，且代理擋下補裝。需在 macOS 補跑。

---

## 6. 安全邊界
- **未連線任何資料庫**：沒有 `prisma migrate dev`／`deploy`／`reset`／`db push`／`db execute`／`generate`。
- **未執行 `--apply`**：回填腳本只跑了不連 DB 的 `--self-test`。
- 未部署、未發信、未對外輸出、未提交 git。
- 檔案所有權遵守 Wave 切分：只改／新增
  `src/lib/services/project.service.ts`、`src/lib/services/project-capability.service.ts`、
  `scripts/backfill-project-lifecycle-stage.mjs`、`scripts/check-project-capability.mjs`、
  `package.json`（只新增一行 script）、本報告。
  `prisma/**`、`src/lib/ui-data/**`、`operating-commands.service.ts`、`src/components/**`、
  `src/app/api/**`、`src/lib/storage/**` 一字未動。

---

## 7. 已知限制與疑慮（S3 必須處理）

1. **`ensureProjectWorkspaceBinding()` 還沒有任何呼叫端。** 它是 OD-C 的實作，
   但「開啟專案硬碟時自動綁定」這條路徑在 drive route（另一個 agent 的檔案）上。
   在 route 接上它之前，既有的 `workspaceId = null` 專案仍然掛不上公司資源。
2. **`createProjectForProfile()` 現在會對沒有 workspace membership 的帳號丟錯。**
   這是刻意的（任務要求明確失敗），但它改變了 `/work` 建立專案的行為：
   若正式庫裡 Owner 的 Profile 還沒有 ACTIVE 的 workspace membership，
   建立專案會從「成功但掛不上公司」變成「明確失敗」。
   `src/app/actions/work.ts` 的 `createProject()` 會把它包成
   `{ success: false, error: "建立專案失敗" }`（`actionError` 的 fallback），
   **可讀的原因不會傳到畫面上**。那個檔案不在本 Wave 的所有權內，
   建議 S3 讓 `actionError` 認得 `ProjectWorkspaceBindingError.code`。
   → **Owner 需要確認正式庫裡存在一個 ACTIVE 的公司 workspace ＋ Owner 的 ACTIVE membership**，
   否則這個修正會把建立專案從「安靜地壞」變成「明顯地壞」。這是刻意的取捨，但需要被知悉。
3. **`lifecycleStage` 回填尚未實際執行。** dry-run 需要連正式庫，本輪刻意不連。
   Owner 在 macOS 上執行 `node scripts/backfill-project-lifecycle-stage.mjs --dry-run`
   即可看到會改哪些列；確認無誤後才加 `--apply` ＋ 確認字串。
   **在回填完成之前，介面不得把 `lifecycleStage` 當權威顯示**（沿用 Wave 1 的同一條限制）。
4. **`MANAGER` 與 `EDITOR` 能力相同。** 發 grant 的權限還沒進這組能力字串，
   S3 的邀請流程需要時再加一條（例如 `access:grant`），不要改既有八條的語意。
5. **能力層還沒被任何既有路徑採用。** `assertCanAccessProject()` 的七個呼叫點
   仍是擁有者精確比對。這是刻意的：Wave 2a 只建層，不改既有授權行為，
   避免在同一輪裡同時引入新機制與行為變更。S3 逐條遷移時，每一條都要確認
   「新規則對擁有者的結果與舊規則相同」。
