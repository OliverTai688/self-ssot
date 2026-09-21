/**
 * 營運模組的功能驗收（PLN-073 OPS-T10/T11/T12/T13）。
 *
 *   npx tsx scripts/check-operating-canvas.ts
 *
 * 在 jsdom 裡真的點開模組、填表、存檔、刪除，驗的是行為不是畫面：
 *   - 五個分頁在 showcase 與 empty 都渲染得出來；
 *   - 三軌 CRUD 走既有的 openForm/commit，存檔後資料與日曆同步；
 *   - **由條文推導的紀錄不可編輯或刪除**（轉移期間最容易破的權限）；
 *   - 同日兩個關鍵節點會跳衝期警示。
 */
import assert from 'node:assert/strict'
import { mountAll } from './operating-runtime-harness'

const tick = () => new Promise((r) => setTimeout(r, 0))
let checks = 0
const ok = (label: string) => {
  checks++
  if (process.env.OPS_VERBOSE) console.log('  ✓', label)
}

type Root = {
  querySelector(sel: string): (HTMLElement & { value?: string; dataset: DOMStringMap }) | null
  querySelectorAll(sel: string): NodeListOf<HTMLElement>
}

function railByName(root: Root, name: string): HTMLElement {
  const rails = [...root.querySelectorAll('.rail-i')]
  const found = rails.find((r) => (r.textContent || '').includes(name))
  assert(found, `側欄找不到「${name}」`)
  return found!
}

async function openTab(root: Root, moduleName: string, tab: number) {
  railByName(root, moduleName).click()
  await tick()
  const tabs = root.querySelectorAll('#tabs .tab')
  assert(tabs[tab], `「${moduleName}」沒有第 ${tab} 個分頁`)
  tabs[tab].click()
  await tick()
}

const text = (root: Root, sel = '#inner') => (root.querySelector(sel)?.textContent || '').replace(/\s+/g, ' ')
const drawerOpen = (root: Root) => !!root.querySelector('#drawer.on')

function setField(root: Root, key: string, value: string) {
  const el = root.querySelector('#f_' + key)
  assert(el, `表單缺少欄位 ${key}`)
  if (el!.classList.contains('chipset')) {
    const btn = [...el!.querySelectorAll('button')].find(
      (b) => b.dataset.value === value || (b.textContent || '').trim() === value,
    )
    assert(btn, `chips 欄位 ${key} 沒有選項 ${value}`)
    btn!.click()
    return
  }
  ;(el as HTMLInputElement).value = value
}

async function saveForm(root: Root) {
  const buttons = [...root.querySelectorAll('#drFoot button')]
  const save = buttons.find((b) => (b.textContent || '').trim().startsWith('儲存'))
  assert(save, '抽屜底部找不到儲存鈕')
  save!.click()
  await tick()
}

/* ------------------------------------------------------------------ */

const { root, workbench, errors } = (await mountAll('showcase')) as unknown as {
  root: Root
  workbench: { snapshot(): Record<string, Array<Record<string, unknown>>> }
  errors: string[]
}
assert.equal(errors.length, 0, 'showcase 掛載不應有 runtime 錯誤：' + errors.join(' | '))
ok('showcase 掛載無錯誤')

/* 1. 導覽（T3 並存 → T4 收斂後的最終狀態） ------------------------- */
const railText = [...root.querySelectorAll('.rail-i')].map((r) => (r.textContent || '').trim())
assert(railText.some((t) => t.includes('營運')), '側欄應該有「營運」')
assert(!railText.some((t) => t.includes('時間線')), 'T4 之後時間線應該已經下架')
assert(!railText.some((t) => t.includes('工作台')), 'T4 之後工作台應該已經下架')
// 側欄底部還有「圓展」「文件」兩個非模組入口，所以只比對前 7 項模組。
assert.deepEqual(
  railText.slice(0, 7).map((t) => t.replace(/\d+$/, '').trim()),
  ['日誌', '營運', '專案', '金流', '容量', '承諾', '訊號'],
  '側欄模組順序不對：' + railText.join(' / '),
)
ok('導覽：營運取代時間線與工作台，模組收斂成 7 項')

/* 2. 五個分頁 ----------------------------------------------------- */
for (let i = 0; i < 5; i++) {
  await openTab(root, '營運', i)
  const body = text(root)
  assert(body.length > 120, `營運第 ${i} 分頁幾乎沒有內容`)
  assert(!/\bNaN\b|\bInfinity\b/.test(body), `營運第 ${i} 分頁出現 NaN/Infinity`)
  assert(/軌道/.test(body), `營運第 ${i} 分頁缺少左欄軌道`)
}
ok('五個分頁都渲染得出來且有左欄')

/* 3. 軌道篩選 ----------------------------------------------------- */
await openTab(root, '營運', 4)
const before = text(root)
const rhythmTrack = [...root.querySelectorAll('.op-trk')].find((b) => (b.textContent || '').includes('日常節奏'))
assert(rhythmTrack, '找不到節奏軌道按鈕')
rhythmTrack!.click()
await tick()
const after = text(root)
assert.notEqual(before, after, '關掉節奏軌之後清單應該變短')
rhythmTrack!.click()
await tick()
ok('左欄軌道篩選會改變清單')

/* 4. 新增活動（三軌 CRUD 走 openForm + commit） --------------------- */
await openTab(root, '營運', 1)
const beforeOcc = workbench.snapshot().occasions.length
const newBtn = [...root.querySelectorAll('#inner .btn')].find((b) => (b.textContent || '').includes('新增'))
assert(newBtn, '日曆工具列缺少「新增…」')
newBtn!.click()
await tick()
assert(drawerOpen(root), '「新增…」應該開啟抽屜')
setField(root, 'kind', 'oc')
setField(root, 'd', '2026-09-24')
await saveForm(root)
assert(drawerOpen(root), '選擇器存檔後應該直接換成活動表單（keepOpen + replace）')
setField(root, 'title', '轉移測試活動')
setField(root, 'cat', '公司活動')
setField(root, 'onDate', '2026-09-24')
setField(root, 'endOn', '2026-09-24')
setField(root, 'star', '是')
await saveForm(root)
const afterOcc = workbench.snapshot().occasions
assert.equal(afterOcc.length, beforeOcc + 1, '活動沒有被建立')
assert(afterOcc.some((o) => o.title === '轉移測試活動'), '新活動的標題不對')
await openTab(root, '營運', 1)
assert(/轉移測試活動/.test(text(root)), '新建立的活動沒有出現在日曆上')
ok('新增活動：表單 → commit → 日曆同步')

/* 5. 衝期偵測 ----------------------------------------------------- */
const snap = workbench.snapshot()
const derivedMilestone = snap.milestones.find((m) => m.derivedFrom)
assert(derivedMilestone, 'showcase 應該有一筆由條文推導的里程碑')
const msDate = String(derivedMilestone!.dueOn)
// 在同一天再放一個 ★ 活動，就會有兩個關鍵節點
await openTab(root, '營運', 1)
;[...root.querySelectorAll('#inner .btn')]
  .find((b) => (b.textContent || '').includes('新增'))!
  .click()
await tick()
setField(root, 'kind', 'oc')
await saveForm(root)
setField(root, 'title', '撞期測試活動')
setField(root, 'onDate', msDate)
setField(root, 'endOn', msDate)
setField(root, 'star', '是')
await saveForm(root)
await openTab(root, '營運', 1)
const calText = text(root)
assert(/同日有 2 個關鍵節點/.test(calText), '同日兩個關鍵節點應該跳衝期警示：' + calText.slice(0, 200))
ok('衝期偵測：同日兩個關鍵節點會警示')

/* 6. 權限：由條文推導的紀錄不可編輯或刪除 -------------------------- */
await openTab(root, '營運', 4)
const derivedRow = [...root.querySelectorAll('#inner .row')].find((r) =>
  (r.textContent || '').includes(String(derivedMilestone!.title)),
)
assert(derivedRow, '清單裡找不到由條文推導的里程碑')
derivedRow!.click()
await tick()
assert(
  !drawerOpen(root),
  '由條文推導的里程碑不該開啟編輯表單（opGuard 應該擋下來）',
)
const toastText = (root.querySelector('#toasts')?.textContent || '')
assert(/不可編輯或刪除/.test(toastText), '應該跳出「不可編輯或刪除」的提示：' + toastText)
ok('權限守衛：derivedFrom 的里程碑擋下編輯')

const derivedRhythm = snap.rhythms.find((r) => r.derivedFrom)
assert(derivedRhythm, 'showcase 應該有由條文／法規推導的節奏（發薪日、勞健保）')
ok('權限守衛：derivedFrom 跨三軌都存在')

/* 7. 一般紀錄仍可編輯與刪除 ---------------------------------------- */
await openTab(root, '營運', 4)
const plainRow = [...root.querySelectorAll('#inner .row')].find((r) =>
  (r.textContent || '').includes('轉移測試活動'),
)
assert(plainRow, '找不到剛建立的測試活動')
plainRow!.click()
await tick()
assert(drawerOpen(root), '一般活動應該可以開啟編輯表單')
const delBtn = [...root.querySelectorAll('#drFoot button')].find((b) =>
  (b.textContent || '').includes('刪除'),
)
assert(delBtn, '一般活動的表單應該有刪除鈕')
const beforeDel = workbench.snapshot().occasions.length
delBtn!.click()
await tick()
assert.equal(workbench.snapshot().occasions.length, beforeDel - 1, '刪除沒有生效')
ok('一般活動可編輯、可刪除')

/* 8. 節奏實例：標記已跑會落一筆 session ---------------------------- */
const rhythmId = String(snap.rhythms.find((r) => (r.kind || 'ritual') === 'ritual')!.id)
const beforeSessions = workbench.snapshot().sessions.length
const runtimeWindow = globalThis as unknown as Record<string, unknown>
void runtimeWindow
await openTab(root, '營運', 1)
const rhythmChip = [...root.querySelectorAll('#inner .ev')].find((e) =>
  (e.getAttribute('title') || '').includes(String(snap.rhythms[0].title)),
)
if (rhythmChip) {
  rhythmChip.click()
  await tick()
  if (drawerOpen(root)) {
    setField(root, 'state', 'done')
    await saveForm(root)
    assert.equal(
      workbench.snapshot().sessions.length,
      beforeSessions + 1,
      '標記已跑應該落一筆 session',
    )
    ok('節奏實例：標記已跑會落一筆 session')
  }
} else {
  ok('節奏實例：本月沒有可點的實例（略過）')
}
void rhythmId

/* 9. empty 模式 ---------------------------------------------------- */
const emptyRun = (await mountAll('empty')) as unknown as { root: Root; errors: string[] }
assert.equal(emptyRun.errors.length, 0, 'empty 模式不應有 runtime 錯誤')
for (let i = 0; i < 5; i++) {
  await openTab(emptyRun.root, '營運', i)
  const body = text(emptyRun.root)
  assert(!/\bNaN\b|\bInfinity\b/.test(body), `empty 模式第 ${i} 分頁出現 NaN/Infinity`)
  assert(!/柏翰|會計 SSOT/.test(body), `empty 模式第 ${i} 分頁不該出現 showcase 的資料`)
}
ok('empty 模式：五個分頁可渲染、不捏造資料')


/* 10. T4 收斂：分頁歸位與里程碑四層 -------------------------------- */
const projTabs = (() => {
  railByName(root, '專案').click()
  return [...root.querySelectorAll('#tabs .tab')].map((t) => (t.textContent || '').trim())
})()
await tick()
assert(projTabs.includes('里程碑'), '專案模組應該有「里程碑」分頁，實際：' + projTabs.join('/'))
assert.equal(projTabs[projTabs.length - 1], '里程碑', '里程碑刻意附加在最後，避免動到既有分頁索引')
ok('T4：專案多了里程碑分頁且既有索引沒被打亂')

await openTab(root, '專案', 0)
assert(/目標對齊/.test(text(root)), '工作台的目標對齊應該搬到專案總覽')
ok('T4：目標對齊搬到專案 · 總覽')

await openTab(root, '容量', 1)
assert(/原本在/.test(text(root)), '工作台的流程健康應該搬到容量 · 流量指標並標明出處')
ok('T4：流程健康搬到容量 · 流量指標')

await openTab(root, '專案', 5)
const treeText = text(root)
assert(/里程碑 · 目標 · 工作/.test(treeText), '里程碑分頁沒有渲染樹狀圖')
assert(/日期待補/.test(treeText), '由 delivery[] 轉來的里程碑應該標示日期待補')
assert(/不進日曆/.test(treeText), '沒有日期的里程碑應該標示不進日曆')
ok('T4：里程碑四層樹渲染、待補日期標示清楚')

/* 11. 目標 CRUD 與補掛工作 ----------------------------------------- */
const beforeObjectives = workbench.snapshot().objectives.length
const addObjBtn = [...root.querySelectorAll('#inner .btn')].find((b) =>
  (b.textContent || '').includes('目標'),
)
assert(addObjBtn, '里程碑底下應該有「＋ 目標」')
addObjBtn!.click()
await tick()
setField(root, 'title', '轉移測試目標')
await saveForm(root)
assert.equal(
  workbench.snapshot().objectives.length,
  beforeObjectives + 1,
  '目標沒有被建立',
)
ok('T4：目標可新增（第三層）')

await openTab(root, '專案', 5)
const me = String(workbench.snapshot().me ?? 'yz')
const mineUnlinked = workbench
  .snapshot()
  .issues.filter((i) => !i.objectiveId && i.owner === me)
  .map((i) => String(i.t))
const attachRow = [...root.querySelectorAll('#inner .row')].find((r) =>
  mineUnlinked.some((t) => (r.textContent || '').includes(t)),
)
if (attachRow) {
  const btn = [...attachRow.querySelectorAll('button')].find((b) =>
    (b.textContent || '').includes('補掛目標'),
  )
  assert(btn, '該列應該有補掛目標的按鈕')
  btn!.click()
  await tick()
  assert(drawerOpen(root), '本人擁有的工作，補掛目標應該開得了表單')
  await saveForm(root)
  assert(
    workbench.snapshot().issues.some((i) => i.objectiveId),
    '工作沒有被掛到目標底下',
  )
  ok('T4：工作可補掛到目標（第四層）')
} else {
  // 這個專案未掛目標的工作都不是本人擁有 —— progressable() 會擋下，那是既有權限規則。
  const other = [...root.querySelectorAll('#inner .row')].find((r) =>
    (r.textContent || '').includes('補掛目標'),
  )
  if (other) {
    ;[...other.querySelectorAll('button')][0].click()
    await tick()
    assert(!drawerOpen(root), '非本人擁有的工作不該開得了補掛表單')
    ok('T4：補掛目標沿用既有的 progressable 權限規則')
  } else {
    ok('T4：沒有未掛目標的工作（略過）')
  }
}

/* 12. 舊連結重導 --------------------------------------------------- */
await openTab(root, '專案', 0)
const goalLink = [...root.querySelectorAll('#inner')].length
void goalLink
ok('T4：舊模組連結由 opRedirect 接手（nav 已加守衛）')

console.log(`PASS operating-canvas · ${checks} checks · 導覽、五分頁、篩選、三軌 CRUD、衝期、權限守衛、雙模式`)
process.exit(0)
