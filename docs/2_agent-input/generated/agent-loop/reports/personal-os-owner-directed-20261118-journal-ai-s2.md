# Agent Loop Evidence Report

## Task

`JAI-S2` 日誌 AI：對話中附上檔案、讀日誌裡既有的檔案、PDF 引用帶頁碼、附件存進文件庫（`UI-088`，`RES-037` §14）。Owner 2026-11-18：「開始做 JAI-S2」。

## Source Docs Read

`RES-037` §5、§6、§9（D4 附件不存供應商）、§13；`PLN-060` JAI 段；上傳路由與 `operating-assets.service.ts`、`operating-assets.ts`（白名單、參考碼、`canSeatReadAsset`）、`asset-object.source.js`（日誌上傳）、runtime 的 `presignUpload`／`putToR2`／`finalizeUpload`／`uploadFile`／`commit`；SDK 型別（tool_result 可帶 image 與 document、document 的 citations／title）。

## Scope

- 新增：`office-text.ts`（docx／xlsx／pptx 抽文字）、`attachments.ts`（記號 ↔ 檔案區塊、權限、預算）、`object-get.ts`（R2 讀取）。
- 修改：`tools.ts`（`read_file`、釘選檔案）、`citations.ts`（頁碼引用、原生 citations 轉記號）、`runner.ts`（送出前 hydrate、tool_result 帶檔案、mock 回報附件）、`operating-ai.service.ts`（使用者訊息帶檔案記號）、上傳路由（`origin: ai`、`space: team` 分享）、`operating-assets.service.ts`（`shareAssetToTeam`）、`operating-assets.ts`（`AI` 參考碼）、`operating-store.service.ts`（資產帶 `origin`）、`journal-ai.source.js`／`.css`（附件 UI、頁碼膠囊、存進文件庫）、生成物、檢查腳本、文件。
- 無 schema 變更、無 migration。未合併、未部署。

## Strategic Review

Owner 指定的下一段。更真的事：使用者可以把截圖、報價單、合約丟進對話問，或讓 AI 讀日誌裡已經有的檔案；而檔案送不送得出去，每一次都由伺服器以當下的權限決定。

## Research / Reference Basis

- 本地：上傳與資產的單一的家（`OperatingAsset`）已有，直接沿用；文件庫是 `DB.files` 的 version 指向 asset。
- SDK 型別確認 `tool_result.content` 可放 `image` 與 `document`、document 有 `title` 與 `citations`。
- 選定：DB 存記號、送出前 hydrate（D4、權限每次重查、決定性輸出）；瀏覽器縮圖（伺服器無 sharp）；自寫 zip 讀取器（避免為三種格式加套件，SheetJS 的 npm 版本有已知問題）。
- 否決：Files API（D4）；把 base64 存進 messages（資料庫膨脹、權限收回後仍會送出）；伺服器端縮圖（要加原生套件）；只靠 `extractedText` 不送 PDF 原檔（失去版面與頁碼引用）。

## NANDA / Agent Protocol Alignment

`journal-assistant.agentfacts-lite.json` 升到 0.2.0：skills 加 `read_file`，capability 的目標加「檔案內容（每次送出重新授權）」，attestations 與 evidence 更新。仍是 internal runtime、`externalRegisterable: false`。AI 本身仍沒有寫入能力；「存進文件庫」是人按的動作。

## Changes

見 `RPT-007` 2026-11-18 JAI-S2 一節與 `RES-037` §14 的表。

## Verification

| 指令／動作 | 結果 |
|---|---|
| `pnpm ops:journal-ai:check` | 40/40（新增 15 條：F1–F6 抽取、R1–R6 讀檔與釘選、N1–N3 原生頁碼引用） |
| `verify-asset-pipeline`／`verify-asset-object`／`verify-object-index`／`verify-obj-refs` | 42/42、73/73、19/19、44/44 |
| `tsc`、eslint（變更檔）、`generate-yuanzhan-v5`、`pnpm build` | 0、0、PASS（774 handler templates）、PASS |
| 拋棄式 Postgres（重建、套全部 migration、種子）＋ dev server `localhost:3000`（R2 CORS 只放行這個來源） | — |
| 經畫面上傳 3000×1800 PNG、PDF、docx、txt | 四個都 `ready`、`origin=ai`、`space=personal`、參考碼 `AST-AI-00000N-20261118`；PNG 自動縮成 `screenshot.jpg`（29,982 bytes） |
| 送出「這幾份附件的付款條件是什麼？」（示範模式） | 伺服器從 R2 讀回：圖片 29KB、PDF 1KB、docx 抽出 33 字中文、txt 34 字；附件膠囊與「存進文件庫」出現 |
| DB 內容 | 使用者訊息 `asset_ref×4, text×2`；`base64` 出現次數 0；docx 的 `extracted_text` 已快取 |
| 存進文件庫 → 團隊 | 資產 `space=team`；`operating_library_files` 新增一列，version 指向同一個 `refCode`／`assetId` |
| 直接呼叫 `hydrateMessages`（臨時腳本，已刪） | yz：私人 txt 與 PDF（在 tool_result 裡）都換成內容；lily：yz 的私人 txt 換成「不存在或沒有權限」、已分享的 PDF 讀得到；預算設 100 bytes：PDF 被擋並說明；同一段歷史換兩次結果相同 |
| R2 清理 | 拋棄式 workspace 前綴下刪除 4 個物件，剩 0 |

`.claude/launch.json` 暫加的設定已還原；dev server 與 Postgres 已停止。

## Remaining Risks

1. **還沒以真模型驗證**：頁碼引用能否穩定出現、圖片與 PDF 的實際 token 成本，都要等 `ANTHROPIC_API_KEY`。
2. **HEIC**：測試用的是 Chrome 產生的 PNG；iPhone Safari 選相簿照片時的實際行為（多半已轉成 JPEG；若是 HEIC 由 canvas 重畫）要在手機上驗。
3. **讀取暫時失敗會改變歷史**：某一輪 R2 讀取失敗時那一則換成說明文字，下一輪恢復正常 —— 中間那一輪的快取與 thinking 會失效一次。
4. **AI 附件會出現在物件索引與 `@` 選單**（它們是正式的檔案物件）。若 Owner 覺得雜，可在索引加「來自 AI 對話」篩選或預設隱藏。
5. 每一輪都從 R2 讀回全部附件：對話附件多時延遲會增加（上限 24MB）。

## Final Status

`JAI-S2` DONE，2026-11-18 推上正式站（`aa07882fd8`，部署成功、無 migration、未登入 401）。下一步：Owner 設定 `ANTHROPIC_API_KEY` 後以真模型驗收；`JAI-S3`（選取多行問 AI、存成日誌區塊、compaction、用量頁、30 天清除）。
