# Agent Loop Evidence Report

## Task

- Task ID: OWNER-DIRECTED-20260925-FORM-MODAL
- Title: v5 工作台表單一律改為置中彈跳視窗；右側抽屜留給檢視詳情
- Date: 2026-09-25
- Agent: Claude Opus 5 (owner-directed, not a scheduled loop)

## Owner Direction

「我發現現在各種表單填寫都是預設右邊 drawer 出現填寫，我想要統一改成 pop up 彈跳視窗填寫。」

範圍由 Owner 當場確認：

- In scope：v5 操作台表單引擎（`openForm()` 的所有入口）。
- Out of scope：純檢視詳情的抽屜（交易明細、文件詳情、議題詳情、通知、檔案庫）維持右側抽屜；
  React 端的 `task-sheet.tsx`、`team-collaboration-sheet.tsx` 本次不動。

## Diagnosis

v5 原型把表單引擎掛在抽屜上：

```js
function openForm(cfg){ FORM = cfg; openDrawer('form','x',cfg.replace) }
DRAWERS.form = () => ({ ..., body: formBody(), foot: '儲存 / 取消 / 刪除' })
function saveForm(){ ...; if(!c.keepOpen) closeDrawer() }
```

於是「看一筆紀錄」與「填一張表」共用同一個面：從詳情按編輯，詳情就被表單取代；
存檔後 `closeDrawer()` 把整個抽屜關掉，使用者回不到原本的脈絡。
`runtime.js` 有 47 個 `openForm(` 入口，全部由這一個函式決定表單開在哪裡。

## Change

新增團隊自有的擴充層 `src/components/yuanzhan/v5/form-modal.source.js` + `form-modal.css`，
在 `scripts/generate-yuanzhan-v5.mjs` 的 EXTENSIONS 末位載入。沒有動凍結原型、
沒有第二套表單邏輯（驗證、connective effects、commit/undo、`opGuard`/`editable` 權限守衛全部沿用）。

| 行為 | 改前 | 改後 |
|---|---|---|
| 表單容器 | 右側抽屜 `#drawer` | 置中視窗 `#formModalWrap`（z-index 56） |
| 從詳情按編輯 | 詳情被表單取代 | 表單疊在詳情上，脈絡保留 |
| 存檔 | `closeDrawer()` 連詳情一起關 | 只關表單，並重繪背後的詳情 |
| 刪除 | `closeDrawer()` 關表單 | `closeDrawer` 包裝後兩層一起關（紀錄已不存在） |
| Esc | 關抽屜 | document capture 攔截，只關表單那一層 |
| 破壞性確認 | `#modalWrap`（62） | 不變，仍疊在表單視窗之上 |
| 手機 | 全寬抽屜 | 貼底 bottom sheet；表單開啟時 toast 移到頂端，不遮主要動作 |

narrow patches（皆為團隊自有檔案，非凍結原型）：

- `extensions.source.js`：tab trap 加入 `#formModalWrap.on`；`formTxn` 的
  `!$('#drawer.on')` 守衛改為 `!formModalOpen()`。
- `scripts/verify-yuanzhan-v5.cjs` / `-details.cjs`：`save()` helper 改點 `#fmFoot`／等 `#formModalWrap` 收起；
  週配置表單欄位選擇器 `#drBody` → `#fmBody`；新增一組驗收斷言（表單在視窗、詳情留在背後、Esc 只收一層）。

## Verification

```
node scripts/generate-yuanzhan-v5.mjs      → Compiled 450 handler templates（無錯）
npx tsc --noEmit --pretty false            → 0 errors
npx eslint （兩個 source 檔）               → 0 errors（既有 unused 警告不變）
```

`pnpm ui:yuanzhan:verify` 無法在本次工作環境執行（node_modules 為 darwin 二進位，
工作 shell 為 linux/aarch64）。改以等價的 Chromium + Playwright 探針，直接掛載
本次生成的 `runtime.js` + `styles.ts`（`mountV5` 於 Shadow DOM），18 項全數通過、零 runtime error：

1. 新增工作 → 表單開在置中視窗，抽屜保持關閉
2. 儲存鈕位於 `#fmFoot`，欄位渲染於 `#fmBody`
3. 必填驗證仍擋下存檔（`#fErr` on、視窗不關）
4. 存檔關閉視窗、紀錄落到工作面
5. 詳情仍開在右側抽屜
6. 從詳情按編輯 → 視窗與抽屜同時存在
7. Esc 只關表單視窗，抽屜留著
8. 再按 Esc 才關抽屜
9. 從詳情編輯後存檔 → 抽屜留著並顯示更新後內容
10. 刪除確認 modal 疊在表單視窗之上
11. 確認刪除後兩層都收掉、紀錄自工作面移除
12. `formTxn` 擴充欄位（數量／單價）正確渲染於視窗
13. 公式交易 `=-20*3` 經視窗存檔，帳本得到 −60
14. 點背景關閉表單
15. `opNew` 的 `keepOpen` 選擇器在同一層換成「新增里程碑」，不閃回抽屜
16. 串接後的里程碑表單存檔並關閉
17. 手機 390×844：bottom sheet，footer 不被 toast 遮住
18. 全程 pageerror / console.error 皆為 0

Owner-run 補證（本機 macOS）：

```bash
pnpm ui:yuanzhan:v5:generate
pnpm ui:yuanzhan:verify      # 兩支 Playwright fidelity 腳本已同步更新
pnpm ui:yuanzhan:showcase    # http://127.0.0.1:3011/company/operating 目視
```

## Risks / Remaining

- React 端 `task-sheet.tsx`、`team-collaboration-sheet.tsx` 仍是右側 Sheet；
  若要全站一致需另一輪（Owner 已明確排除在本次範圍外）。
- `cfg.replace` 在視窗模式下不再具意義（原為抽屜堆疊語意），保留欄位但不讀取。
- 本次未更新 `PRD-*` 與 `ACC-002`：互動容器變更屬 UI 一致性，不改任何驗收條件；
  若要正式登錄，建議在 `REF-003_ui-screen-registry.md` 的營運工作台列補一行容器註記。

## Next

- 若 Owner 要全站一致：把 `task-sheet.tsx` 換成 `Dialog`，`team-collaboration-sheet.tsx` 評估是否屬「長內容面板」而保留抽屜。
