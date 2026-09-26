/**
 * 合約金流（需求一：專案金流視角）的行為檢查。
 *
 *   npx tsx scripts/check-contract-cashflow.ts
 *
 * 走 database 模式的載入路徑（store → createV5State → mountV5），真的去點按鈕。
 * 這支存在的理由，是 check-cashflow-faces L177–178 那兩條：它們擋住寫死的 Runway
 * 與應收未收，但擋不住「有了資料之後算錯」。所以這裡斷言的是有資料之後的那一半：
 *
 *   - 洞察面第 4 個分頁仍然落在「洞察」—— cfFace() 原本是 Math.floor(tab/3)，
 *     第 10 個分頁會無聲掉回「收單」面，而且不會報錯
 *   - 四狀態分欄、每案走到第幾期
 *   - 期款有兩個日期；落差＝實際 − 預計，並回饋成這個客戶的中位數
 *   - 推演從下個月起算（UTC 錨定，不因時區整批位移一天）
 *   - 已接案不打折、已提案照設定的機率加權
 *   - 逾期的期款不進推演，只覆寫期款燈
 *   - 兩顆燈各自有來源；缺一半輸入時顯示「尚未設定」而不是 0
 *   - 成員看不到公司整體資金，但看得到自己案子的期款進度
 *   - 人事頁不再有寫死的 30,000 / 1,846 / 5,000
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'
import { operatingToday } from '../src/lib/ui-data/yuanzhan/v5-state'

const TODAY = operatingToday()
const M = TODAY.slice(0, 7)
const d = (day: number) => `${M}-${String(day).padStart(2, '0')}`
/** 相對今天的日期，讓斷言不會因為跑的那一天而失效。 */
function rel(days: number): string {
  const base = new Date(TODAY + 'T00:00:00Z')
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}
const monthOf = (iso: string) => iso.slice(0, 7)
function monthAhead(n: number): string {
  const base = new Date(TODAY + 'T00:00:00Z')
  base.setUTCDate(1)
  base.setUTCMonth(base.getUTCMonth() + n)
  return base.toISOString().slice(0, 7)
}

let checks = 0
let failed = 0
function check(name: string, condition: boolean, detail = '') {
  checks += 1
  if (condition) {
    console.log(`PASS  ${name}`)
    return
  }
  failed += 1
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
}



let dom: JSDOM
function installGlobals(next: JSDOM) {
  dom = next
  const g = globalThis as unknown as Record<string, unknown>
  g.window = next.window
  g.document = next.window.document
  try {
    Object.defineProperty(g, 'navigator', { value: next.window.navigator, configurable: true })
  } catch {
    /* 某些 node 版本的 navigator 是唯讀 getter */
  }
  const win = next.window as unknown as Record<string, unknown>
  for (const key of ['Node', 'Element', 'HTMLElement', 'CustomEvent', 'Event', 'MutationObserver', 'AbortController', 'AbortSignal', 'CSS', 'DOMParser', 'XMLSerializer', 'File', 'FileReader', 'Blob']) {
    if (win[key]) g[key] = win[key]
  }
  const css = g.CSS as { escape?: (v: string) => string } | undefined
  if (!css || !css.escape) g.CSS = { escape: (v: string) => String(v).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c) }
  g.getComputedStyle = next.window.getComputedStyle
  g.requestAnimationFrame = (fn: () => void) => setTimeout(fn, 0)
  g.cancelAnimationFrame = (id: number) => clearTimeout(id)
  g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
  ;(next.window.Element.prototype as unknown as Record<string, unknown>).scrollIntoView = function () {}
  // jsdom 的 Blob 沒有 text()；瀏覽器有。用 FileReader 補上，runtime 不必為測試改寫。
  const blobProto = next.window.Blob.prototype as unknown as { text?: () => Promise<string> }
  if (!blobProto.text) {
    blobProto.text = function (this: Blob) {
      return new Promise((resolve) => {
        const reader = new next.window.FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.readAsText(this)
      })
    }
  }
  // 上傳：預簽回一個假的 R2 key，PUT 直接成功；寫入管線回版本號。
  g.fetch = (url: string, init?: { method?: string }) => {
    if (String(url).startsWith('/api/company/operating/uploads') && init?.method === 'POST') {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ objectKey: 'operating/2026-09/test.jpg', uploadUrl: 'https://r2.test/put' }) })
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ version: 0, applied: [], rejected: [] }) })
  }
}

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))

const OWNER: YuanzhanSeat = { email: 'taioliver688@gmail.com', actor: 'yz', role: 'owner', canSwitchActor: false }
const MEMBER: YuanzhanSeat = { email: 'lilyzuo405@gmail.com', actor: 'lily', role: 'member', canSwitchActor: false }


async function mount(seat: YuanzhanSeat, store: Record<string, unknown>) {
  installGlobals(new JSDOM('<!doctype html><html><body></body></html>'))
  const { createV5State } = await import('../src/lib/ui-data/yuanzhan/v5-state')
  const mod = await import('../src/components/yuanzhan/v5/runtime.js')
  const mountV5 = mod.mountV5 as (root: unknown, state: unknown) => {
    destroy(): void; navigate(wb: string, tab?: number): void; snapshot(): Record<string, unknown[]>
  }
  const base = { dayLogs: [], todayIssues: [], lineComments: [], journalComments: [], journalPeer: {}, ...store }
  const state = createV5State('empty', seat, null, 'database', base)
  const root = dom.window.document.createElement('div')
  root.className = 'v5-root'
  dom.window.document.body.appendChild(root)
  const wb = mountV5(root, JSON.parse(JSON.stringify(state)))
  await tick()
  const flat = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim()
  const all = (sel: string) => [...root.querySelectorAll(sel)] as HTMLElement[]
  const m = {
    root,
    wb,
    db: () => wb.snapshot(),
    go: async (tab?: number) => { wb.navigate('money', tab); await tick() },
    text: (sel = '#inner') => flat(root.querySelector(sel)),
    face: () => flat(root.querySelector('.cf-face.on b')),
    tab: () => flat(root.querySelector('.cf-subtabs .tab.on')),
    all,
    button: (label: string, scope = '') => all(`${scope} button`).find((b) => flat(b).includes(label)) || null,
    click: async (el: Element | null | undefined) => { (el as HTMLElement | null)?.click(); await tick() },
    toasts: () => flat(root.querySelector('#toasts')),
    /** 找到 runtime 剛建立的 file input，塞一個檔案進去再觸發 change。 */
    feedFile: async (name: string, body: string, type: string) => {
      const input = [...root.querySelectorAll('input[type=file]')].pop() as HTMLInputElement | undefined
      if (!input) return false
      const file = new dom.window.File([body], name, { type })
      Object.defineProperty(input, 'files', { value: [file] })
      input.dispatchEvent(new dom.window.Event('change'))
      await tick(20)
      return true
    },
  }
  return m
}

const CONTRACT = (id: string, p: string, total: number, termsDays = 30) =>
  ({ id, p, total, termsDays, clause: '§9.1', signedOn: rel(-60), st: 'active' })
const TERM = (id: string, c: string, seq: number, amount: number, expectedOn: string, extra: Record<string, unknown> = {}) =>
  ({ id, c, seq, label: `第 ${seq} 期`, amount, pct: null, trigger: 'date', ms: '', expectedOn, invoicedOn: '', settledOn: '', st: 'pending', txn: '', ...extra })
const PROJECT = (id: string, t: string, stage: string, extra: Record<string, unknown> = {}) =>
  ({ id, t, client: t + ' 客戶', goal: 'G1', type: '產品交付型', owner: 'yz', status: stage === 'WON' ? '進行中' : '商機',
     stage, stageAt: rel(-30), rate: 0, cap: 0, budget: 0, repo: '—', start: rel(-30), delivery: [], ...extra })

async function main() {
  /* ── 一、cfFace() 的範圍判斷（這是會靜默壞掉的那一個）───────────────── */
  {
    const m = await mount(OWNER, { projects: [], contracts: [], terms: [], accounts: [], cashConfig: {} })
    await m.go(9)
    check('洞察面的第 4 個分頁仍然落在「洞察」', m.face() === '洞察' && m.tab() === '合約金流', `${m.face()} · ${m.tab()}`)
    await m.go(6)
    check('洞察面第 1 個分頁不受影響', m.face() === '洞察' && m.tab() === '公司', `${m.face()} · ${m.tab()}`)
    check('洞察面渲染四個次分頁', m.all('.cf-subtabs .tab').length === 4, String(m.all('.cf-subtabs .tab').length))
    // navigate() 會過 opRedirect 的舊索引映射（CF_LEGACY），所以這裡用點的。
    await m.click(m.button('帳務', '.cf-faces'))
    await m.click(m.button('月結', '.cf-subtabs'))
    check('帳務面邊界沒有被第 4 個分頁吃掉', m.face() === '帳務' && m.tab() === '月結', `${m.face()} · ${m.tab()}`)
    check('帳務面仍然是三個次分頁', m.all('.cf-subtabs .tab').length === 3, String(m.all('.cf-subtabs .tab').length))
    m.wb.destroy()
  }

  /* ── 二、沒有資料時不推測 ──────────────────────────────────────────── */
  {
    const m = await mount(OWNER, { projects: [], contracts: [], terms: [], accounts: [], cashConfig: {} })
    await m.go(9)
    const t = m.text()
    check('沒有帳戶時帳戶燈寫「尚未設定」，不給 0', t.includes('尚未設定現金帳戶') && !t.includes('0.0個月'), t.slice(0, 120))
    check('沒有期款時不畫堆疊圖骨架', !m.root.querySelector('.cc-chart'))
    check('空狀態給得出第一步', t.includes('建立合約'), t.slice(0, 120))
    m.wb.destroy()
  }

  /* ── 三、四狀態、期數、兩個日期與落差 ──────────────────────────────── */
  {
    const m = await mount(OWNER, {
      projects: [PROJECT('PRJ-A', '甲案', 'WON'), PROJECT('PRJ-B', '乙案', 'PROPOSED'), PROJECT('PRJ-C', '丙案', 'CHALLENGEABLE')],
      contracts: [CONTRACT('CT-A', 'PRJ-A', 300000), CONTRACT('CT-B', 'PRJ-B', 200000)],
      terms: [
        // 甲案：兩期已收，落差 +4 與 +6 → 中位數 +5（3 筆才算自己的，這裡只有 2 筆）
        TERM('TA1', 'CT-A', 1, 90000, rel(-70), { settledOn: rel(-66), st: 'settled' }),
        TERM('TA2', 'CT-A', 2, 120000, rel(-40), { settledOn: rel(-34), st: 'settled' }),
        TERM('TA3', 'CT-A', 3, 90000, rel(40)),
        TERM('TB1', 'CT-B', 1, 100000, rel(35)),
      ],
      accounts: [{ id: 'ACC-1', name: '台新 909', kind: 'bank', opening: 600000, asOf: rel(-30) }],
      cashConfig: { monthlyBurn: 100000, runwayGreen: 6, runwayAmber: 3, coverageGreen: 1.2, coverageAmber: 0.8, overdueAmber: 14, overdueRed: 30, probCHALLENGEABLE: 0.2, probPROPOSED: 0.5 },
      txns: [], bank: [], reimb: [], intake: [], periods: [], payroll: [],
    })
    await m.go(9)
    const cols = m.all('.cc-col').map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim())
    check('四狀態分成四欄', cols.length === 4, String(cols.length))
    check('可挑戰欄標明加權 20%', cols[0].includes('加權 20%'), cols[0].slice(0, 80))
    check('已提案欄標明加權 50%', cols[1].includes('加權 50%'), cols[1].slice(0, 80))
    check('已接案不打折', cols[2].includes('不打折進推演'), cols[2].slice(0, 80))
    check('卡片顯示走到第幾期', cols[2].includes('第 3 / 3 期'), cols[2].slice(0, 120))

    await m.click(m.button('甲案', '.cc-col'))
    const det = m.text()
    check('期款表同時有預計收款與實際收款', det.includes('預計收款') && det.includes('實際收款'), det.slice(0, 120))
    check('落差算得出來（+4 天）', det.includes('+4 天'), det.slice(0, 200))
    check('落差算得出來（+6 天）', det.includes('+6 天'), det.slice(0, 200))
    check('少於 3 筆已收期款時標明是借來的中位數', det.includes('全公司中位數'), det.slice(0, 400))
    m.wb.destroy()
  }

  /* ── 四、推演：起始月、加權、逾期不進去 ───────────────────────────── */
  {
    const m = await mount(OWNER, {
      projects: [PROJECT('PRJ-A', '甲案', 'WON'), PROJECT('PRJ-B', '乙案', 'PROPOSED')],
      contracts: [CONTRACT('CT-A', 'PRJ-A', 300000), CONTRACT('CT-B', 'PRJ-B', 200000)],
      terms: [
        // 三筆已收且落差都是 0，讓平移不干擾金額斷言
        TERM('TA0a', 'CT-A', 1, 10000, rel(-90), { settledOn: rel(-90), st: 'settled' }),
        TERM('TA0b', 'CT-A', 2, 10000, rel(-80), { settledOn: rel(-80), st: 'settled' }),
        TERM('TA0c', 'CT-A', 3, 10000, rel(-70), { settledOn: rel(-70), st: 'settled' }),
        // 未來：已接案 100,000 不打折；已提案 100,000 × 50%
        TERM('TA1', 'CT-A', 4, 100000, rel(40)),
        TERM('TB1', 'CT-B', 1, 100000, rel(45)),
        // 逾期 40 天：不進推演，但要把期款燈壓成紅
        TERM('TA9', 'CT-A', 5, 500000, rel(-40), { invoicedOn: rel(-50), st: 'invoiced' }),
      ],
      // 期初拉到 120 萬：帳戶燈綠、期款燈因逾期紅，才測得到「兩顆燈不同色」那一句。
      accounts: [{ id: 'ACC-1', name: '台新 909', kind: 'bank', opening: 1200000, asOf: rel(-30) }],
      cashConfig: { monthlyBurn: 100000, runwayGreen: 6, runwayAmber: 3, coverageGreen: 1.2, coverageAmber: 0.8, overdueAmber: 14, overdueRed: 30, probCHALLENGEABLE: 0.2, probPROPOSED: 0.5 },
      txns: [], bank: [], reimb: [], intake: [], periods: [], payroll: [],
    })
    await m.go(9)
    await m.click(m.button('表格', '#inner'))
    const rows = m.all('table.tbl tbody tr').map((r) => (r.textContent || '').replace(/\s+/g, ' ').trim())
    check('推演有 6 列', rows.length === 6, String(rows.length))
    check('推演從下個月起算，不含當月', !rows[0].startsWith(String(Number(M.slice(5)))  + ' 月'), rows[0].slice(0, 30))
    const label = Number(monthAhead(1).slice(5)) + ' 月'
    check('第一列就是下個月（UTC 錨定，沒有位移一天）', rows[0].startsWith(label), `${rows[0].slice(0, 20)} vs ${label}`)
    const all = rows.join(' ')
    // 逐格比對：'50,000' 是 '150,000' 的子字串，整列比對會誤判成通過。
    const cellsOf = (i: number) => m.all('table.tbl tbody tr')[i].querySelectorAll('td')
    const cell = (i: number, j: number) => (cellsOf(i)[j]?.textContent || '').replace(/\s+/g, '')
    // 欄序：月 / 已收 / 已開票未收 / 合約未開票 / 加權 / 流入 / 支出 / 淨額 / 餘額 / 可存活
    // 沒有流入的月份「流入」是 0 不是 —，所以要看「合約未開票」那一欄才找得到目標列。
    const hit = [0, 1, 2, 3, 4, 5].find((i) => cell(i, 3) !== '—') ?? 0
    check('已接案的 100,000 不打折進推演（合約未開票欄）', cell(hit, 3) === '100,000', `${cell(hit, 3)} @row${hit}`)
    check('已提案的 100,000 以 50% 進推演（加權欄）', cell(hit, 4) === '50,000', `${cell(hit, 4)} @row${hit}`)
    check('逾期的 500,000 不出現在推演任何一個月', !all.includes('500,000'), all.slice(0, 300))

    const lights = m.all('.cc-light').map((l) => (l.textContent || '').replace(/\s+/g, ' ').trim())
    check('帳戶燈 = 現金 ÷ 每月支出（1,200,000 ÷ 100,000 = 12.0）', lights[0].includes('12.0'), lights[0].slice(0, 120))
    check('帳戶燈把算式寫出來', lights[0].includes('1,200,000') && lights[0].includes('100,000'), lights[0].slice(0, 160))
    check('期款燈因為逾期 40 天被壓成紅燈', lights[1].includes('紅燈') && lights[1].includes('40 天'), lights[1].slice(0, 200))
    check('期款燈說得出是硬門檻壓的', lights[1].includes('硬門檻'), lights[1].slice(0, 200))
    const tones = m.all('.cc-light').map((el) => [...el.classList].filter((c) => c.startsWith('t-')).join(''))
    check('帳戶綠、期款紅', tones[0] === 't-g' && tones[1] === 't-r', tones.join(','))
    check('兩顆燈不同色時給出方向', m.text('.cc-say').includes('收帳線斷了'), m.text('.cc-say').slice(0, 120))

    // 編譯後 onclick 會變成 data-v5-click，wire() 再把它移除；只能用 class 選。
    await m.click(m.root.querySelector('button.cc-light'))
    check('點期款燈進得了催款清單', m.text().includes('催款清單'), m.text().slice(0, 80))
    check('催款清單列出那一筆逾期', m.text().includes('500,000'), m.text().slice(0, 200))
    m.wb.destroy()
  }

  /* ── 五、改支出假設，燈號跟著動（不是寫死的）─────────────────────── */
  {
    const base = {
      projects: [PROJECT('PRJ-A', '甲案', 'WON')],
      contracts: [CONTRACT('CT-A', 'PRJ-A', 300000)],
      terms: [TERM('TA1', 'CT-A', 1, 100000, rel(40))],
      accounts: [{ id: 'ACC-1', name: '台新 909', kind: 'bank', opening: 600000, asOf: rel(-30) }],
      txns: [], bank: [], reimb: [], intake: [], periods: [], payroll: [],
    }
    const cfg = (burn: number) => ({ monthlyBurn: burn, runwayGreen: 6, runwayAmber: 3, coverageGreen: 1.2, coverageAmber: 0.8, overdueAmber: 14, overdueRed: 30, probCHALLENGEABLE: 0.2, probPROPOSED: 0.5 })
    const a = await mount(OWNER, { ...base, cashConfig: cfg(100000) })
    await a.go(9)
    const one = a.text('.cc-light')
    a.wb.destroy()
    const b = await mount(OWNER, { ...base, cashConfig: cfg(200000) })
    await b.go(9)
    const two = b.text('.cc-light')
    check('每月支出改一半，帳戶燈從 6.0 變 3.0', one.includes('6.0') && two.includes('3.0'), `${one.slice(0, 40)} / ${two.slice(0, 40)}`)
    b.wb.destroy()

    const c = await mount(OWNER, { ...base, cashConfig: {} })
    await c.go(9)
    check('有帳戶但沒填支出估值時說「尚未填」，不用預設值假裝算得出來', c.text().includes('尚未填每月支出估值'), c.text().slice(0, 140))
    c.wb.destroy()
  }

  /* ── 六、成員邊界 ─────────────────────────────────────────────────── */
  {
    const m = await mount(MEMBER, {
      projects: [PROJECT('PRJ-A', '甲案', 'WON', { owner: 'lily', members: ['lily'] })],
      contracts: [CONTRACT('CT-A', 'PRJ-A', 300000)],
      terms: [TERM('TA1', 'CT-A', 1, 100000, rel(40))],
      accounts: [{ id: 'ACC-1', name: '台新 909', kind: 'bank', opening: 600000, asOf: rel(-30) }],
      cashConfig: { monthlyBurn: 100000 },
      txns: [], bank: [], reimb: [], intake: [], periods: [], payroll: [],
    })
    await m.go(9)
    const t = m.text()
    check('成員看不到公司整體資金', t.includes('只有負責人看得到'), t.slice(0, 80))
    check('成員看不到推演與兩顆燈', !m.root.querySelector('.cc-chart') && !m.root.querySelector('.cc-light'), '')
    check('成員仍看得到自己案子的期款進度', Boolean(m.root.querySelector('.cc-card')), t.slice(0, 120))
    m.wb.destroy()
  }

  /* ── 七、人事頁不再有寫死的數字（RES-032 A-4）─────────────────────── */
  {
    const m = await mount(OWNER, {
      projects: [PROJECT('PRJ-A', '甲案', 'WON')],
      contracts: [], terms: [], accounts: [], cashConfig: {},
      payroll: [{ who: 'lily', base: 42000, overtime: 0, milestone: 0, separate: false }],
      txns: [], bank: [], reimb: [], intake: [], periods: [],
    })
    await m.go(8)
    const t = m.text()
    check('人事頁讀 DB.payroll 的固定薪', t.includes('42,000'), t.slice(0, 200))
    check('人事頁不再出現寫死的 30,000', !t.includes('30,000'), t.slice(0, 200))
    check('人事頁不再出現寫死的 1,846', !t.includes('1,846'), t.slice(0, 200))
    check('人事頁不再出現寫死的 5,000 里程碑', !t.includes('5,000'), t.slice(0, 200))
    check('獎金閘門改依當前專案推導', t.includes('甲案'), t.slice(0, 260))
    m.wb.destroy()
  }

  /* ── 八、P3：里程碑獎金與多帳戶 ────────────────────────────────────── */
  {
    const m = await mount(OWNER, {
      projects: [PROJECT('PRJ-A', '甲案', 'WON', { owner: 'lily' })],
      milestones: [
        { id: 'MS-1', projectId: 'PRJ-A', phaseId: '', title: '上線', dueOn: rel(-10), state: 'done', accept: '', derivedFrom: '', remind: '', bonus: 8000 },
        { id: 'MS-2', projectId: 'PRJ-A', phaseId: '', title: '成效報告', dueOn: rel(20), state: 'open', accept: '', derivedFrom: '', remind: '', bonus: 5000 },
      ],
      payroll: [{ who: 'lily', base: 42000, overtime: 0, milestone: 99999, separate: false }],
      contracts: [], terms: [],
      accounts: [
        { id: 'ACC-1', name: '台新 909', kind: 'bank', opening: 400000, asOf: rel(-30) },
        { id: 'ACC-2', name: '零用金', kind: 'cash', opening: 200000, asOf: rel(-30) },
      ],
      cashConfig: { monthlyBurn: 100000 },
      txns: [], bank: [], reimb: [], intake: [], periods: [],
    })
    await m.go(8)
    const t = m.text()
    check('里程碑獎金只算已達成的（8,000，不含未達成的 5,000）', t.includes('8,000'), t.slice(0, 220))
    check('有里程碑金額時，薪資草稿裡手填的 99,999 不再被採用', !t.includes('99,999'), t.slice(0, 220))
    check('應付＝42,000 ＋ 8,000', t.includes('50,000'), t.slice(0, 220))
    check('表尾說明獎金是從里程碑算出來的', t.includes('由里程碑算出來'), t.slice(-220))
    check('未達成的里程碑標成不計入', t.includes('未達成 · 不計入'), t.slice(-260))

    await m.go(9)
    check('多帳戶：兩個帳戶都列出來', m.all('.cc-acct').length === 3, String(m.all('.cc-acct').length))
    const lights = m.all('.cc-light').map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
    check('帳戶燈加總所有帳戶的期初（400,000 ＋ 200,000 ÷ 100,000 = 6.0）', lights[0].includes('6.0'), lights[0].slice(0, 140))
    m.wb.destroy()
  }

  console.log(`\n${checks - failed}/${checks} passed`)
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
