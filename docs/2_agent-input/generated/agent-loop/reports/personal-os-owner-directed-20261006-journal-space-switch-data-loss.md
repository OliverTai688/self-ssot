# 證據報告：切到個人空間會刪掉整本圓展日誌（正式站事故、修正與復原）

2026-10-06 · repo `self-stucture-v1` · Owner 指派（對話中直接提出）

## Task

- Task ID：`JRNL-INC-001`（`PLN-060` 單列）
- 作用畫面：`UI-088`（`/company/operating` · 日誌）Revision Mode；事故修正，未新增 UI ID
- Owner 原話：「檢查一下為什麼昨日的日誌文字資料不見了」→ 查明後：「都幫我修復然後避免之後這樣發生」

## Strategic Review

正式站資料遺失，優先於任何進行中的工作。這一輪不是新功能：它關掉一條會刪資料的路徑、補上伺服器防線、
把被刪的列補回來，並留下一支會在修正前失敗的回歸檢查。

## 事故經過（正式資料庫唯讀查詢）

| 時間（台北） | 紀錄 |
|---|---|
| 10/05 10:54 | Lily 建立 10/05 日誌並召喚 Standup；之後的打字都存進 Standup 物件（`operating_doc_objects`） |
| 10/05 11:16–11:38 | 兩個席位在那份 Standup 的三行上留言 |
| 10/06 00:21:13 | Lily 重新整理後按「開始一天」 |
| 10/06 00:21:30 | `operating_command_logs`：`lily / update / 日誌 / 自動保存 / collections=[journal] / change_count=5` |

之後 `operating_journal_entries` 裡 Lily 的列歸零（09/24、09/30、10/01、10/02、10/05 五天）。
她的 6 個文件物件（5 份 Standup、1 份會議）與 7 則行內留言都完整。

## 根因

`DB.journal` 不是欄位，是 getter（`extensions.source.js`）：依「目前在哪個空間、正在看誰」回傳不同的本子。
自動保存（`operating-persistence.source.js` 的 `opTouch` → `opEnqueue`）直接拿 `DB` 去 `snapshotCollections`，
所以切到個人空間（那一本是空的）之後 1.5 秒，比對結果是「基準線的五天全部不見」→ 五筆 `journal:delete`，
伺服器的 `applyJournal` 照單 `deleteMany`。

離線重現（jsdom + 假 fetch，不碰資料庫）送出的命令與正式站那一筆紀錄逐欄相同：
`op=update ent=日誌 label=自動保存`，內含五筆 `journal:<day>:delete`。

不是 10/04 連結物件那次改動造成的；這條路徑從日誌接上寫入管線（PLN-074 M2）就存在。
回顧頁跳到對方那一天（`jrGoto`）是同一類問題，事故前沒有出事只是因為日誌駕駛艙重繪時順手把
`journalAuthor` 拉回自己。

## Changes

- `src/components/yuanzhan/v5/operating-persistence.source.js`
  - 比對與合併用的日誌固定是「登入者自己在圓展空間的那一本」（`opOwnJournal()`／`opSnap()`／`opRead()`／`opWrite()`），
    席位在載入時記下（`OP_SEAT`），不跟著畫面的空間、正在看誰、或切換視角走。
  - `opEnqueue()`：有內容的一天被比對成整天刪除時攔下不送，其餘變更照常；狀態徽章持續顯示到重新整理。
  - `opMergeRemote()`：人在個人空間時不再把伺服器的團隊日誌併進私人那一本。
- `src/lib/services/operating-commands.service.ts`
  - `assertJournalDeletesAreEmpty()`：套用命令前先檢查，有內容（有字的行或嵌入物件）的一天拒絕刪除，
    回 `forbidden` 與可讀的訊息。舊版分頁照樣送也刪不掉。
- `src/components/yuanzhan/v5/extensions.source.js`
  - database 模式下個人空間的日誌文字沒有保存的地方（資料表是一人一天一筆）；切過去時以提示與標題列說明
    「文字尚未接上保存，重新整理後不保留」。修正前這些字會被當成當天的公司日誌存進去。
- `src/components/yuanzhan/v5/runtime.js`：由 `node scripts/generate-yuanzhan-v5.mjs` 重新生成。
- `scripts/check-journal-space-switch.ts`（`pnpm ops:journal-space:check`，並加入 `pnpm ops:check`）。
- `scripts/restore-journal-object-shells.ts`（`pnpm ops:restore-journal-shells`，預設 dry run）。

沒有 schema 變更，沒有 migration。

## 資料復原（Owner 於對話中同意後執行）

`pnpm ops:restore-journal-shells -- --author lily --apply`：替 Lily 補回 5 列日誌，依建立順序嵌回 6 個物件，
已存在的 10/06 那一列跳過未動。重跑一次全部跳過（可重入）。

複驗（唯讀）：用 `loadOperatingStore()` 以兩個席位各讀一次並掛進修正後的 runtime ——
Lily 自己的日誌 6 天、宇星看到對方 6 天；回顧頁看得到 10/05 Standup 的內文，沒有「已刪除」字樣，runtime 0 錯誤，
掛載期間 0 筆寫入。

**救不回來的部分**：直接打在日誌上、不在物件裡的字只存在被刪掉的列裡。命令紀錄不存變更內容，
無法判斷有多少；10/02 有兩則留言指向的行（`blk22_i9q`、`blk21_xrh`）已不在任何物件裡。
若 Supabase 有 10/06 00:21 之前的備份或 PITR，可以從 `operating_journal_entries` 取回原列。

## Verification

| 檢查 | 結果 |
|---|---|
| `pnpm ops:journal-space:check` | 9/9（修正前的程式：6/9，切到個人空間送出五筆 delete、切回來又重送五筆 create） |
| `pnpm ops:day-state:check` | 34/34 |
| `pnpm ops:persistence:check` | all checks passed |
| `pnpm ops:commands:check` | exit 0 |
| `pnpm ops:links:check` | 24/24 |
| `pnpm ops:assets:object:check` | 51/51 |
| `pnpm exec tsc --noEmit --pretty false` | 0 errors |
| `pnpm build` | exit 0 |

修正前就失敗、與本輪無關（以還原後的程式對照過）：`pnpm ops:runtime:check`（腳本本身的 top-level await
在 cjs 轉譯下不成立）、`pnpm ops:reply-jump:check` 21/22（一條與當天日期有關的斷言）。

伺服器端的 `assertJournalDeletesAreEmpty()` 沒有自動化測試：它需要資料庫，而這個 repo 沒有可拋棄的測試庫可用，
也不該拿正式庫寫測試列。以型別檢查與程式審閱為準。

## NANDA / Agent Protocol Alignment

不適用：未觸及 AI agent 能力、路由或註冊。

## Remaining Risks

- **修正尚未上線**：正式站在部署之前仍是舊程式，切到個人空間仍會刪資料（包括剛補回來的列）。
  部署後伺服器防線對舊版分頁同樣有效。
- 個人空間的日誌文字在 database 模式不保存，只是現在會說出來。要真的保存需要 schema 決定
  （`operating_journal_entries` 的唯一鍵是一人一天一筆，放不下同一天的私人那一本），屬 `HUMAN_APPROVAL_REQUIRED`。
- 命令紀錄不存變更內容，這次能定位是靠 `change_count` 與重現；遇到「更新時內容被改短」這類事故會查不出來。
- 日誌列沒有軟刪除或版本，被覆寫或刪除後只能靠資料庫備份。

## Next

建議的下一列：日誌列的軟刪除／前一版保留，或在命令紀錄裡留下日誌變更的前後摘要 —— 讓下一次不必靠推理還原。
