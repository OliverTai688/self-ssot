/**
 * 訊號頁（兩層訊號、對話分析、來源與推播）的無瀏覽器回歸檢查（RES-036 · LINESIG-UI）。
 *
 *   pnpm ops:signal:check
 *
 * 四段：
 *   A. 兩種資料模式下四個分頁都畫得出來；舊的 Telegram 預覽與規則說明頁不在了
 *   B. 潛在訊號不產生義務：不計徽章、不進逾期、忽略必須選原因
 *   C. 對話分析：遮蔽、還原、排除、確認失效、上限、送出是關著的
 *   D. database 模式的寫入契約：貼上、判讀、確認都不送出任何東西；
 *      採納送出一件任務＋一則留言，併入只送一則留言
 *   E. 我的 LINE（LINESIG-S1）：代碼 → 等確認 → 已連結 → 解除；狀態只讀伺服器
 */
import { mountAll } from './operating-runtime-harness'

let pass = 0
let fail = 0
function check(label: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined || ok ? '' : '   → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))}`)
}
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))
const text = (el: Element | null | undefined) => (el?.textContent || '').replace(/\s+/g, ' ').trim()

function tools(root: HTMLElement) {
  const win = root.ownerDocument.defaultView as unknown as { Event: typeof Event }
  const all = (sel: string, from: ParentNode = root) => Array.from(from.querySelectorAll(sel)) as HTMLElement[]
  const one = (sel: string, from: ParentNode = root) => from.querySelector(sel) as HTMLElement | null
  const byText = (sel: string, needle: string, from: ParentNode = root) => all(sel, from).find((el) => text(el).includes(needle))
  const click = async (el: HTMLElement | null | undefined) => {
    if (!el) throw new Error('找不到要點的元素')
    el.click()
    await tick(5)
  }
  const fire = async (el: HTMLElement | null | undefined, type: 'input' | 'change', value: string) => {
    if (!el) throw new Error('找不到要輸入的元素')
    ;(el as HTMLInputElement).value = value
    el.dispatchEvent(new win.Event(type, { bubbles: true }))
    await tick(5)
  }
  const tab = async (name: string) => click(byText('#tabs .tab', name))
  const badge = () => text(one('.bdg', all('.rail-i').find((b) => text(b).includes('訊號'))!))
  const paste = async (raw: string) => {
    await tab('對話分析')
    await fire(one('#sgRaw'), 'input', raw)
    await click(byText('.btn', '讀取這段對話'))
  }
  const cand = (needle: string) => all('.sg-cand').find((c) => text(c).includes(needle))
  return { all, one, byText, click, fire, tab, badge, paste, cand }
}

const EXPORT = `[LINE] 柏翰客戶群的聊天記錄
2026/10/09（五）
09:00\t王志明\t請問教育訓練可以改到下週嗎？
09:10\t戴宇星\t可以，週五前把結案問卷初稿給您
2026/10/12（一）
09:14\t王志明\t報價單可以分兩期付嗎？聯絡陳小姐 0912-345-678
09:15\t王志明\t[檔案] 簽回的需求書.pdf
09:16\t王志明\t[貼圖]
09:30\t林代書\t發票抬頭是否要改`

/* ------------------------------------------------------------------ */
/* A. 四個分頁                                                         */
/* ------------------------------------------------------------------ */
for (const mode of ['showcase', 'empty'] as const) {
  const r = await mountAll(mode)
  const pages = r.pages.filter((p) => p.wb === '訊號')
  check(`${mode} · 四個分頁`, pages.map((p) => p.tabName).join('/') === '待處理/對話分析/已處理/來源與推播', pages.map((p) => p.tabName).join('/'))
  check(`${mode} · 每一頁都有內容`, pages.every((p) => p.len > 20), pages.map((p) => p.len).join(','))
  check(`${mode} · 沒有 Telegram 預覽、沒有規則說明頁`, pages.every((p) => !/Telegram|Agent 規則|偵測規則|Handbook 04/.test(p.text)))
  check(`${mode} · 來源標示 LINE 尚未開通`, /LINE 官方帳號\s*尚未開通/.test(pages[0].text) && /尚未開通/.test(pages[3].text))
  check(`${mode} · 推播預覽標明尚未啟用，潛在訊號只推數量`, /尚未啟用/.test(pages[3].text) && /只推數量/.test(pages[3].text))
  if (mode === 'showcase') {
    check('showcase · 待處理看得到示範的潛在訊號', /潛在訊號 · 待你確認/.test(pages[0].text) && /規則判讀/.test(pages[0].text))
    check('showcase · 確定訊號每一列標出來源', /(任務|日誌|討論串|承諾|金流|出勤)\s*標記已處理/.test(pages[0].text))
  } else {
    check('empty · 沒有潛在訊號時整段不畫', !/潛在訊號 · 待你確認/.test(pages[0].text))
    check('empty · 沒有「載入示範對話」', !/載入示範對話/.test(pages[1].text))
    check('empty · 對話分析說明貼上的內容不上傳', /不會上傳、不會保存/.test(pages[1].text))
  }
  check(`${mode} · 全程沒有 runtime 錯誤`, r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* B. 潛在訊號不產生義務                                               */
/* ------------------------------------------------------------------ */
{
  const r = await mountAll('showcase')
  const t = tools(r.root)
  r.workbench.navigate('signal', 0)
  await tick(10)
  const before = t.badge()
  const n = t.all('.sg-cand').length
  check('徽章 · 有潛在訊號', n >= 2, String(n))
  check('收工 · 逾期區只列回覆追蹤的請求，沒有潛在訊號', !t.one('#rqLate .sg-cand') && !/潛在/.test(text(t.one('#rqLate'))))

  // 忽略：點了只會打開原因，不會直接消失。
  const first = t.all('.sg-cand')[0]
  await t.click(t.byText('.btn', '忽略', first))
  check('忽略 · 沒選原因之前還在待確認', t.all('.sg-cand').length === n && /為什麼忽略/.test(text(t.all('.sg-cand')[0])))
  await t.click(t.byText('.btn', '取消', t.all('.sg-cand')[0]))
  check('忽略 · 取消後原封不動', t.all('.sg-cand').length === n && !/為什麼忽略/.test(text(t.one('#sgMaybe'))))
  await t.click(t.byText('.btn', '忽略', t.all('.sg-cand')[0]))
  await t.click(t.byText('.sg-form .btn', '判讀錯誤'))
  check('忽略 · 選了原因才離開', t.all('.sg-cand').length === n - 1)

  await t.click(t.byText('.btn', '稍後', t.all('.sg-cand')[0]))
  check('稍後 · 收起來並留一顆「稍後再看」', t.all('.sg-cand').length === n - 2 && /稍後再看的 1 則/.test(text(t.one('#sgMaybe'))))
  await t.click(t.byText('.btn', '稍後再看的'))
  check('稍後 · 點了放回來', t.all('.sg-cand').length === n - 1)
  check('徽章 · 分流潛在訊號前後數字不變', t.badge() === before, before + ' → ' + t.badge())

  await t.tab('已處理')
  const row = t.byText('tbody tr', '判讀錯誤')
  check('已處理 · 忽略的那一則連同原因留在紀錄', !!row && /忽略/.test(text(row)))
  await t.click(t.byText('.btn', '放回待確認', row!))
  await t.tab('待處理')
  check('已處理 · 忽略的可以放回待確認', t.all('.sg-cand').length === n)

  // 全部忽略也要原因。
  await t.click(t.byText('#sgMaybe .btn', '全部忽略'))
  check('全部忽略 · 一樣先問原因', t.all('.sg-cand').length === n && /為什麼都忽略/.test(text(t.one('#sgMaybe'))))
  await t.click(t.byText('#sgMaybe > .sg-form .btn', '與專案無關'))
  check('全部忽略 · 選了原因後整段收起', !t.one('#sgMaybe'))
  check('徽章 · 全部忽略後數字仍不變', t.badge() === before, before + ' → ' + t.badge())
  check('B · 全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* C. 對話分析                                                         */
/* ------------------------------------------------------------------ */
{
  const r = await mountAll('showcase')
  const t = tools(r.root)
  r.workbench.navigate('signal', 1)
  await tick(10)
  await t.paste('這不是對話')
  check('讀取 · 看不出格式時不進下一步', !!t.one('#sgRaw') && !t.one('.sg-pair'))
  await t.paste(EXPORT)
  check('讀取 · 標題、發話者與並排檢視', /柏翰客戶群/.test(text(t.one('.panel-h'))) && t.all('.sg-sp').length === 3 && !!t.one('.sg-pair'))
  const sides = t.all('.sg-sp select').map((s) => (s as HTMLSelectElement).value)
  check('讀取 · 站內成員自動標成我方，其餘先當客戶', sides.join() === 'client,us,client', sides.join())

  const sent = () => t.all('.sg-sent').map(text).join('\n')
  check('遮蔽 · 送出版本沒有發話者本名與電話', !/王志明|戴宇星|林代書|0912/.test(sent()) && /〔電話〕/.test(sent()), sent())
  check('遮蔽 · 原文欄仍是原文', /0912-345-678/.test(t.all('.sg-orig').map(text).join('\n')))
  check('遮蔽 · 貼圖不送出', /貼圖與系統訊息不送出/.test(sent()))
  check('遮蔽 · 檔案只留佔位、檔名不送', /〔檔案〕/.test(sent()) && !/需求書/.test(sent()))
  check('遮蔽 · 用語是「已遮蔽 N 處，請確認」，不宣稱已去識別化', /已遮蔽 \d+ 處，請確認/.test(text(r.root)) && !/已去識別化|已完全/.test(text(r.root)))
  check('疑似人名 · 標出來但不遮', /疑似人名 1 個還沒處理/.test(text(t.one('.sg-suspects'))) && /陳小姐/.test(sent()))
  check('疑似人名 · 還沒決定之前不能確認', (t.byText('.sg-confirm .btn', '確認') as HTMLButtonElement).disabled)
  await t.click(t.one('.sg-suspects .sg-keep'))
  check('疑似人名 · 標成不是人名：提示消失、內容不變、可以確認', !t.one('.sg-suspects') && /陳小姐/.test(sent()) && !t.one('.sg-sent .sg-sus') && !(t.byText('.sg-confirm .btn', '確認') as HTMLButtonElement).disabled)
  await t.click(t.byText('.btn', '換一段對話'))
  await t.paste(EXPORT)
  await t.click(t.one('.sg-suspects .sg-sus'))
  check('疑似人名 · 點一下就遮住，提示消失', !/陳小姐/.test(sent()) && !t.one('.sg-suspects') && t.all('.sg-term').length === 1)

  await t.fire(t.one('#sgPick'), 'input', '柏')
  await t.click(t.byText('.sg-sum .btn', '遮蔽'))
  check('補遮蔽 · 只有一個字不收', t.all('.sg-term').length === 1)

  const confirm = () => t.byText('.sg-confirm .btn', '確認') as HTMLButtonElement
  check('確認 · 還沒確認時按鈕可按', !confirm().disabled && /已檢查，確認這一份/.test(text(confirm())))
  await t.click(confirm())
  check('確認 · 記下誰在什麼時候確認、指紋', confirm().disabled && /確認了這一份（指紋 [0-9a-f]{8}）/.test(text(t.one('.sg-confirm'))))
  check('送出 · 這一版是關著的，沒有送出按鈕', /送出 AI 分析尚未開放/.test(text(t.one('.sg-locked'))) && !t.byText('.btn', '送出'))

  await t.click(t.one('.sg-sent .sg-mk'))
  check('確認失效 · 還原一處遮蔽後要重新確認', !confirm().disabled && /要重新確認/.test(text(t.one('.sg-confirm'))))
  await t.click(t.one('.sg-sent .sg-mk.off'))
  check('確認失效 · 改回原樣，指紋相同，確認回來', confirm().disabled)
  await t.click(t.one('.sg-orig .sg-x'))
  check('確認失效 · 排除一則後要重新確認', !confirm().disabled && /已排除，不送出/.test(sent()))
  await t.click(t.byText('.sg-orig .sg-x', '放回'))
  const amount = t.one('.sg-check input') as HTMLInputElement
  amount.checked = false
  await t.fire(amount, 'change', 'on')
  check('確認失效 · 切換金額不影響沒有金額的對話', confirm().disabled)

  await t.click(t.byText('.btn', '用規則找出潛在訊號'))
  check('規則判讀 · 回報找到幾則', /找到 4 則，在待處理/.test(text(t.one('.sg-bar'))), text(t.one('.sg-bar')))
  check('分析紀錄 · 確認與判讀各一筆', t.all('.sg-scroll tbody tr').length === 2)
  await t.tab('待處理')
  check('規則判讀 · 待處理多出提問、承諾、交付物', !!t.cand('聯絡陳小姐') && !!t.cand('簽回的需求書') && !!t.cand('發票抬頭是否要改') && !!t.cand('週五前把結案問卷初稿給您'))
  check('規則判讀 · 已經被我方回過的提問不列', !t.cand('教育訓練'))
  await t.tab('對話分析')
  await t.click(t.byText('.btn', '用規則找出潛在訊號'))
  await t.tab('待處理')
  check('規則判讀 · 同一段再判讀一次不重複', t.all('.sg-cand').filter((c) => text(c).includes('聯絡陳小姐')).length === 1)

  // 上限
  await t.tab('對話分析')
  await t.click(t.byText('.btn', '換一段對話'))
  await t.paste('2026/10/12\n' + Array.from({ length: 501 }, (_, i) => `09:00\t王志明\t第 ${i} 則`).join('\n'))
  check('上限 · 超過 500 則時擋下，不畫並排', /單次上限 500 則/.test(text(t.one('.sg-warn'))) && !t.one('.sg-pair') && (t.byText('.btn', '用規則找出潛在訊號') as HTMLButtonElement).disabled)
  check('C · 全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* D. database 模式的寫入契約                                          */
/* ------------------------------------------------------------------ */
{
  type Change = { collection: string; id: string; op: string; after?: Record<string, unknown> }
  const sent: Change[][] = []
  const bodies: string[] = []
  let version = 5
  const g = globalThis as unknown as Record<string, unknown>
  const realFetch = g.fetch
  g.fetch = async (_url: unknown, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST' && init.body) {
      bodies.push(init.body)
      const body = JSON.parse(init.body) as { commands: Array<{ clientRef: string; changes: Change[] }> }
      body.commands.forEach((c) => sent.push(c.changes))
      version += 1
      return { ok: true, status: 200, json: async () => ({ version, applied: body.commands.map((c) => c.clientRef), rejected: [] }) }
    }
    return { ok: true, status: 200, json: async () => ({ version }) }
  }
  const base = { client: '', goal: '', type: '', rate: 0, cap: 0, budget: 0, repo: '—', delivery: [] }
  const r = await mountAll('empty', undefined, (state) => {
    state.dataSource = 'database'
    const data = state.data as Record<string, unknown>
    data.projects = [{ ...base, id: 'PRJ-S-1', t: '柏翰 · Google Workspace 導入', owner: 'yz', status: '進行中', start: '2026-09-01' }]
    data.issues = [{ id: 'ISS-S-1', t: '結案問卷', p: 'PRJ-S-1', owner: 'yz', size: 'M', st: 'Doing', created: '2026-10-01', started: '', done: '', blocker: '', exp: '', ev: 0, pri: 3, due: '', rel: [], cf: {}, sub: [], objectiveId: '', kind: 'TODO', msId: '', reviewer: '', reviewResult: '', reviewNote: '', reviewedAt: 0 }]
  })
  const t = tools(r.root)
  const flush = async () => { await tick(80) }
  r.workbench.navigate('signal', 0)
  await tick(20)
  check('database · 一開始沒有潛在訊號、沒有示範資料', !t.one('#sgMaybe') && !t.one('.sg-cand'))

  await t.paste(EXPORT)
  check('database · 從群組名稱認出專案', (t.byText('.sg-fields label', '歸到哪個專案')?.querySelector('select') as HTMLSelectElement)?.value === 'PRJ-S-1')
  await t.click(t.byText('.btn', '用規則找出潛在訊號'))
  await t.click(t.one('.sg-suspects .sg-sus'))
  await t.click(t.byText('.sg-confirm .btn', '確認'))
  await flush()
  check('database · 確認成立', /確認了這一份/.test(text(t.one('.sg-confirm'))))
  check('database · 貼上、判讀、確認都不送出任何東西', sent.length === 0 && bodies.length === 0, String(sent.length))

  await t.tab('待處理')
  // 採納
  const q = t.cand('報價單可以分兩期付嗎')
  await t.click(t.byText('.btn', '採納', q!))
  const form = t.cand('報價單可以分兩期付嗎')!
  const title = form.querySelector('.sg-fields input[type=text]') as HTMLInputElement
  check('採納 · 帶出任務名稱、專案、負責人與期限', /^回覆王志明：/.test(title.value) && (form.querySelectorAll('select')[0] as HTMLSelectElement).value === 'PRJ-S-1' && (form.querySelectorAll('select')[1] as HTMLSelectElement).value === 'yz' && /^\d{4}-\d{2}-\d{2}$/.test((form.querySelector('input[type=date]') as HTMLInputElement).value), title.value)
  await t.fire(title, 'input', '')
  await t.click(t.byText('.btn', '確定採納', form))
  await flush()
  check('採納 · 任務名稱空白時不建立', sent.length === 0 && !!t.cand('報價單可以分兩期付嗎'))
  await t.fire(t.cand('報價單可以分兩期付嗎')!.querySelector('.sg-fields input[type=text]') as HTMLInputElement, 'input', '回覆王志明：報價單分期')
  await t.fire(t.cand('報價單可以分兩期付嗎')!.querySelector('input[type=date]') as HTMLInputElement, 'change', '2026-10-14')
  await t.click(t.byText('.btn', '確定採納', t.cand('報價單可以分兩期付嗎')!))
  await flush()
  const adopt = sent[sent.length - 1] || []
  const task = adopt.find((c) => c.collection === 'issues')
  const note = adopt.find((c) => c.collection === 'objectComments')
  check('採納 · 送出一件任務', sent.length === 1 && task?.op === 'create' && task.after?.t === '回覆王志明：報價單分期' && task.after?.p === 'PRJ-S-1' && task.after?.owner === 'yz' && task.after?.due === '2026-10-14' && task.after?.st === 'Todo', JSON.stringify(task?.after))
  check('採納 · LINE 原話掛在那件任務的留言上', note?.op === 'create' && note.after?.parent === task?.id && /來自 LINE〈柏翰客戶群〉王志明 10\/12 09:14：「報價單可以分兩期付嗎/.test(String(note.after?.x)), JSON.stringify(note?.after))
  check('採納 · 只動到任務與留言兩個集合', adopt.every((c) => ['issues', 'objectComments'].includes(c.collection)), adopt.map((c) => c.collection).join())
  check('採納 · 那一則離開待確認', !t.cand('報價單可以分兩期付嗎') && t.all('.sg-cand').length === 3)

  // 併入
  const d = t.cand('簽回的需求書')
  await t.click(t.byText('.btn', '併入既有', d!))
  await t.click(t.byText('.btn', '併入', t.one('.sg-cand .sg-form')!))
  await flush()
  check('併入 · 沒選任務時不送出', sent.length === 1 && !!t.cand('簽回的需求書'))
  await t.fire(t.all('.sg-cand .sg-form select')[1], 'change', 'ISS-S-1')
  await t.click(t.byText('.btn', '併入', t.one('.sg-cand .sg-form')!))
  await flush()
  const merge = sent[sent.length - 1] || []
  check('併入 · 只送一則留言，不產生第二件任務', sent.length === 2 && merge.length === 1 && merge[0].collection === 'objectComments' && merge[0].after?.parent === 'ISS-S-1' && /簽回的需求書/.test(String(merge[0].after?.x)), JSON.stringify(merge))

  // 沒被採納的那一則，內容不曾離開瀏覽器。
  check('database · 沒採納的對話內容沒有出現在任何一次送出裡', !bodies.some((b) => /發票抬頭|教育訓練|結案問卷初稿/.test(b)))
  await t.tab('已處理')
  check('已處理 · 採納與併入各一筆，連到任務', !!t.byText('tbody tr', '回覆王志明：報價單分期') && !!t.byText('tbody tr', '結案問卷'))
  check('D · 全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
  g.fetch = realFetch
}

/* ------------------------------------------------------------------ */
/* E. 我的 LINE（狀態由伺服器給，這裡用假的 BFF）                      */
/* ------------------------------------------------------------------ */
{
  type Me = { state: string; codeExpiresAt: string | null; pendingExpiresAt: string | null; displayName: string | null; pictureUrl: string | null; pushEnabled: boolean; linkedAt: string | null }
  const me = (over: Partial<Me>): Me => ({ state: 'none', codeExpiresAt: null, pendingExpiresAt: null, displayName: null, pictureUrl: null, pushEnabled: false, linkedAt: null, ...over })
  const soon = new Date(Date.now() + 9 * 60000).toISOString()
  let server: Record<string, unknown> = { configured: true, lastWebhookAt: new Date().toISOString(), bot: { basicId: '@yzbot', displayName: '圓展 OS' }, canBind: true, me: me({}), team: [{ actor: 'yz', state: 'none', pushEnabled: false }, { actor: 'lily', state: 'none', pushEnabled: false }], quota: null }
  const posts: string[] = []
  const gets: string[] = []
  const g = globalThis as unknown as Record<string, unknown>
  const realFetch = g.fetch
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
  g.fetch = async (url: unknown, init?: { method?: string; body?: string }) => {
    if (!String(url).startsWith('/api/company/line')) return ok({ version: 1 })
    if (init?.method !== 'POST') { gets.push(String(url)); return ok(server) }
    const { action } = JSON.parse(init.body || '{}') as { action: string }
    posts.push(action)
    if (action === 'code') { server = { ...server, me: me({ state: 'code', codeExpiresAt: soon }) }; return ok({ code: 'YZ-ABCD-EFGH', expiresAt: soon, status: server }) }
    if (action === 'confirm') { server = { ...server, me: me({ state: 'linked', displayName: '王小明', pushEnabled: true, linkedAt: new Date().toISOString() }) }; return ok({ notified: true, status: server }) }
    if (action === 'test') return ok({ status: { ...server, quota: { used: 47, limit: 200 } } })
    if (action === 'unlink' || action === 'reject') { server = { ...server, me: me({}) }; return ok({ status: server }) }
    return { ok: false, status: 400, json: async () => ({ error: '不認得的動作。' }) }
  }
  const r = await mountAll('empty', undefined, (state) => { state.dataSource = 'database' })
  const t = tools(r.root)
  const panelOf = (title: string) => t.all('.panel').find((p) => text(p.querySelector('.panel-h h3')) === title)
  r.workbench.navigate('signal', 3)
  await tick(40)
  check('LINE · 讀伺服器狀態；用量只在這一頁問一次', gets.length === 2 && gets.filter((u) => /quota=1/.test(u)).length === 1, gets.join())
  check('LINE · 四個步驟都打勾、顯示已連線', t.all('.sg-ck.ok').length === 4 && /已連線/.test(text(panelOf('LINE 官方帳號'))))
  check('LINE · 未連結時只有一顆「連結我的 LINE」', /未連結/.test(text(panelOf('我的 LINE'))) && !!t.byText('.btn', '連結我的 LINE') && !t.one('.sg-code'))
  check('LINE · 負責人看得到誰連了', /戴宇星\s*未連結/.test(text(panelOf('成員'))) && /Lily\s*未連結/.test(text(panelOf('成員'))), text(panelOf('成員')))

  await t.click(t.byText('.btn', '連結我的 LINE'))
  await tick(20)
  check('LINE · 產生代碼：顯示代碼、官方帳號 ID 與有效時間', posts.join() === 'code' && text(t.one('.sg-code')) === 'YZ-ABCD-EFGH' && /@yzbot/.test(text(panelOf('我的 LINE'))) && /前有效/.test(text(panelOf('我的 LINE'))) && /等待代碼/.test(text(panelOf('我的 LINE'))))
  check('LINE · 提醒不要在群組裡傳', /群組裡的代碼無效/.test(text(panelOf('我的 LINE'))))

  // 代碼被傳給官方帳號：伺服器進到等待確認，畫面靠輪詢跟上。
  server = { ...server, me: me({ state: 'pending', displayName: '王小明', pictureUrl: 'https://profile.line-scdn.net/x', pendingExpiresAt: soon, pushEnabled: true }) }
  await tick(3300)
  check('LINE · 等待確認：顯示 LINE 的名字，問「這是你嗎」', /這是你的 LINE 帳號嗎/.test(text(panelOf('我的 LINE'))) && /王小明/.test(text(panelOf('我的 LINE'))) && !t.one('.sg-code') && !!t.one('.sg-pic'))
  check('LINE · 還沒按確認之前不顯示已連結', !/已連結/.test(text(panelOf('我的 LINE'))) && posts.join() === 'code')

  await t.click(t.byText('.btn', '是我，完成連結'))
  await tick(20)
  check('LINE · 按「是我」才連結', posts.join() === 'code,confirm' && /已連結/.test(text(panelOf('我的 LINE'))) && /正常/.test(text(panelOf('我的 LINE'))) && !!t.byText('.btn', '傳一則測試推播'))
  const polls = gets.length
  await tick(3300)
  check('LINE · 連結後不再輪詢', gets.length === polls, `${polls} → ${gets.length}`)

  await t.click(t.byText('.btn', '傳一則測試推播'))
  await tick(20)
  check('LINE · 測試推播送出後帶回本月用量', posts.at(-1) === 'test' && /本月已用 47／200 則/.test(text(panelOf('推播預覽'))))

  await t.click(t.byText('.btn', '解除連結'))
  check('LINE · 解除連結先問一次，不直接送', posts.at(-1) === 'test' && !!t.byText('.btn', '確定解除'))
  await t.click(t.byText('.btn', '取消', panelOf('我的 LINE')))
  check('LINE · 取消後維持連結', posts.at(-1) === 'test' && !t.byText('.btn', '確定解除') && /已連結/.test(text(panelOf('我的 LINE'))))
  await t.click(t.byText('.btn', '解除連結'))
  await t.click(t.byText('.btn', '確定解除'))
  await tick(20)
  check('LINE · 確定後才解除，回到未連結', posts.at(-1) === 'unlink' && !!t.byText('.btn', '連結我的 LINE'))

  server = { ...server, me: me({ state: 'linked', displayName: '王小明', pushEnabled: false, linkedAt: new Date().toISOString() }) }
  r.workbench.navigate('signal', 1)
  await tick(10)
  ;(g.Date as unknown as { now: () => number }).now = ((real) => () => real() + 120000)(Date.now.bind(Date))
  r.workbench.navigate('signal', 3)
  await tick(40)
  check('LINE · 封鎖官方帳號：顯示推播失效，沒有測試推播', /推播失效/.test(text(panelOf('我的 LINE'))) && /解除封鎖就會恢復/.test(text(panelOf('我的 LINE'))) && !t.byText('.btn', '傳一則測試推播'))
  r.workbench.navigate('signal', 0)
  await tick(20)
  check('LINE · 待處理頁的來源欄跟著顯示', /我的 LINE\s*推播失效/.test(text(panelOf('來源'))), text(panelOf('來源')))

  check('LINE · 畫面與請求裡沒有 LINE userId、密鑰', !/U[0-9a-f]{32}|channel secret：|access token：/i.test(text(r.root)))
  check('E · 全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()

  // 共用帳號、未設定密鑰
  server = { configured: true, lastWebhookAt: null, bot: null, canBind: false, me: me({}), team: [], quota: null }
  const r2 = await mountAll('empty', undefined, (state) => { state.dataSource = 'database' })
  const t2 = tools(r2.root)
  r2.workbench.navigate('signal', 3)
  await tick(40)
  check('LINE · 共用帳號：沒有連結按鈕', /共用帳號/.test(text(r2.root)) && !t2.byText('.btn', '連結我的 LINE'))
  check('LINE · webhook 還沒驗證：第四步沒打勾、顯示尚未開通', t2.all('.sg-ck.ok').length === 3 && /尚未開通/.test(text(r2.root)))
  r2.workbench.destroy()
  server = { configured: false, lastWebhookAt: null, bot: null, canBind: true, me: me({}), team: [], quota: null }
  const r3 = await mountAll('empty', undefined, (state) => { state.dataSource = 'database' })
  const t3 = tools(r3.root)
  r3.workbench.navigate('signal', 3)
  await tick(40)
  check('LINE · 密鑰未設定：沒有連結按鈕，說明等誰', !t3.byText('.btn', '連結我的 LINE') && t3.all('.sg-ck.ok').length === 2 && /等 Owner 本人操作/.test(text(r3.root)))
  r3.workbench.destroy()
  g.fetch = realFetch
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
