/**
 * 金流三面（RES-032）的行為檢查。
 *
 *   npx tsx scripts/check-cashflow-faces.ts
 *
 * 走 database 模式的載入路徑（store → createV5State → mountV5），真的去點按鈕，
 * 斷言使用者講得出來的幾條線：
 *   - 負責人進來在帳務 · 帳本，成員進來在收單 · 收件匣；舊的分頁索引導到對的地方
 *   - 收件匣兩種檢視：成員預設逐筆過單（一次一題），負責人預設一張清單（就地補、可批次）
 *   - 成員交件 → 等核准 → 負責人核准 → 待歸帳 → 歸帳成交易（不再自動寫成「公司層級／場地」）
 *   - 對帳有建議配對、CSV 匯入；月結檢查沒過不能鎖，鎖了以後編輯變成加註，解鎖要原因
 *   - 洞察不顯示沒有來源的數字（Runway、應收未收）
 *   - 成員點進帳務看到的是邊界說明，不是空表格
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'
import { operatingToday } from '../src/lib/ui-data/yuanzhan/v5-state'

const M = operatingToday().slice(0, 7)
const d = (day: number) => `${M}-${String(day).padStart(2, '0')}`

let checks = 0
let failed = 0
function check(name: string, condition: boolean, detail = '') {
  checks += 1
  if (condition) {
    console.log(`PASS  ${name}${detail ? `   → ${detail}` : ''}`)
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
    /** 用 aria-label 找一個就地編輯的格子（可能是值、也可能是琥珀色空格）。 */
    cell: (label: string, scope = '') => all(`${scope} button, ${scope} input, ${scope} select`).find((e) => (e.getAttribute('aria-label') || '').includes(label)) || null,
    /** 點開一個格子、填值、收工。select 用 change，輸入框用 blur。 */
    fill: async (label: string, value: string, scope = '') => {
      const target = all(`${scope} button`).find((e) => (e.getAttribute('aria-label') || '').includes(label))
      if (!target) return false
      target.click()
      await tick()
      const el = root.querySelector('[data-tc-in]') as HTMLInputElement | HTMLSelectElement | null
      if (!el) return false
      el.value = value
      el.dispatchEvent(new dom.window.Event(el.tagName === 'SELECT' ? 'change' : 'blur'))
      await tick()
      return true
    },
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

const txn = (id: string, day: number, t: string, amt: number, extra: Record<string, unknown> = {}) =>
  ({ id, d: d(day), t, p: '公司層級', cat: amt > 0 ? '收入' : '工具', amt, pass: false, v: ['發票'], files: [], note: '', ...extra })
const bank = (id: string, day: number, t: string, amt: number, m = '') => ({ id, d: d(day), t, amt, m })

async function main() {
  // ── 負責人：落點、舊索引、核准 → 歸帳、對帳建議、月結擋下 ─────────────────
  {
    const m = await mount(OWNER, {
      txns: [txn('T1', 2, '客戶首期款', 120000), txn('T2', 5, 'Vercel 月費', -640), txn('T3', 12, '印刷打樣', -4200, { v: [] })],
      bank: [bank('B1', 2, '匯入 首期款', 120000, 'T1'), bank('B2', 5, 'VERCEL INC', -640), bank('B3', 20, '跨行手續費', -30)],
      reimb: [{ id: 'R1', who: 'lily', t: '客戶餐敘', amt: 2400, st: '已送', d: d(18) }],
      intake: [{ id: 'I1', who: 'lily', t: '客戶餐敘', amt: 2400, d: d(18), p: '公司層級', st: 'unfiled', file: null, reimb: 'R1', txn: '' }],
      periods: [],
    })
    await m.go(0)
    check('負責人 · 預設落點是帳務 · 帳本', m.face() === '帳務' && m.tab() === '帳本', `${m.face()} · ${m.tab()}`)
    check('面切換器顯示三個面與節奏', m.text('.cf-faces').includes('每天 · 全員') && m.text('.cf-faces').includes('每月 · 決策'), m.text('.cf-faces'))
    check('等核准的代墊還不在待歸帳', !m.text().includes('待歸帳 1'), m.text('.cf-strip'))
    await m.go(2)
    check('舊索引 2（對帳）導到帳務 · 對帳', m.tab() === '對帳', m.tab())
    await m.go(3)
    check('舊索引 3（報帳）導到收單 · 我的報帳', m.face() === '收單' && m.tab() === '我的報帳', `${m.face()} · ${m.tab()}`)

    await m.click(m.button('收件匣', '.cf-subtabs'))
    check('負責人預設是一張清單，不是逐筆', Boolean(m.root.querySelector('table.cf-grid')) && !m.root.querySelector('.cf-stagewrap'))
    check('狀態是表內的分組列，不是各開一張卡', m.all('.cf-grp').length >= 1 && m.all('.panel').length === 0, `分組 ${m.all('.cf-grp').length} · panel ${m.all('.panel').length}`)
    check('收件匣列出需要核准的代墊', m.text().includes('需要你核准') && m.text().includes('客戶餐敘'), m.text().slice(0, 80))
    // 「核准」要在表格列裡找：篩選鍵「待你核准」也含這兩個字。
    await m.click(m.button('核准', 'table.cf-grid'))
    check('核准後報帳狀態是已核', (m.db().reimb as Array<{ st: string }>)[0].st === '已核')
    check('核准不會自動產生交易', (m.db().txns as unknown[]).length === 3)

    await m.click(m.button('帳務', '.cf-faces'))
    check('面切換回到上次停留的分頁', m.tab() === '對帳', m.tab())
    await m.click(m.button('帳本', '.cf-subtabs'))
    check('帳本上方出現待歸帳', m.text('.cf-strip').includes('待歸帳 1'), m.text('.cf-strip'))
    await m.click(m.button('歸帳', '.cf-strip'))
    check('按歸帳在帳本長出一列預覽，不是一排 chip', Boolean(m.root.querySelector('table.tbl tr.cf-fil')) && !m.root.querySelector('.cf-strip .chipset'))
    check('預覽列的欄位和表頭一一對齊',
      m.all('table.tbl thead th').length === m.all('tr.cf-fil > td').length,
      `${m.all('table.tbl thead th').length} 欄 vs ${m.all('tr.cf-fil > td').length} 格`)
    check('預覽列帶著收件的摘要與金額', m.text('tr.cf-fil').includes('客戶餐敘') && m.text('tr.cf-fil').includes('2,400'), m.text('tr.cf-fil'))
    check('預覽列說自己還沒入帳', m.text('tr.cf-fil').includes('預覽 · 尚未入帳'), m.text('tr.cf-fil'))
    check('缺的欄位標在它該在的那一欄', Boolean(m.cell('類別', 'tr.cf-fil')) && m.text('tr.cf-fil-h').includes('還缺'), m.text('tr.cf-fil-h'))
    check('欄位沒填完不能入帳', (m.button('確認入帳', 'tr.cf-fil') as HTMLButtonElement | null)?.disabled === true)
    check('預覽列還沒寫進帳本', (m.db().txns as unknown[]).length === 3)
    check('預覽不進 changelog', !(m.db().changelog as Array<{ ent: string }>).some((c) => c.ent === '歸帳'))
    check('填類別走的是表格欄位', await m.fill('類別', '場地', 'tr.cf-fil'))
    check('欄位齊了才放行', (m.button('確認入帳', 'tr.cf-fil') as HTMLButtonElement | null)?.disabled === false)
    await m.click(m.button('確認入帳', 'tr.cf-fil'))
    const posted = (m.db().txns as Array<{ t: string; cat: string; amt: number; note: string }>).find((t) => t.t === '客戶餐敘')
    check('確認後才建立交易，類別由記帳者選', posted?.cat === '場地' && posted?.amt === -2400, JSON.stringify(posted))
    check('收件狀態變成已入帳', (m.db().intake as Array<{ st: string }>)[0].st === 'posted')
    check('入帳後預覽列收起來', !m.root.querySelector('tr.cf-fil'))
    check('待歸帳清空後條帶消失', !m.root.querySelector('.cf-strip'))
    check('帳本列有生命週期狀態', m.text('table.tbl').includes('④ 已勾稽') && m.text('table.tbl').includes('③ 已入帳'))

    // ── 就地編輯：表格就是那筆資料的家 ──────────────────────────────
    check('帳本的摘要是可編輯欄，不是死字', Boolean(m.cell('摘要', 'table.tbl')))
    check('改摘要', await m.fill('摘要', 'Vercel 年費', 'table.tbl tr[data-tx="T2"]'))
    check('改完就存進那一筆交易', (m.db().txns as Array<{ id: string; t: string }>).find((t) => t.id === 'T2')?.t === 'Vercel 年費')
    check('就地編輯進 changelog，可以還原', (m.db().changelog as Array<{ ent: string }>)[0].ent === '交易')
    check('屬性欄是選單不是自由輸入', await m.fill('類別', '媒體', 'table.tbl tr[data-tx="T2"]'))
    check('類別存進去了', (m.db().txns as Array<{ id: string; cat: string }>).find((t) => t.id === 'T2')?.cat === '媒體')
    await m.click(m.cell('代收付', 'table.tbl tr[data-tx="T2"]'))
    check('代收付點一下就換一個值', (m.db().txns as Array<{ id: string; pass: boolean }>).find((t) => t.id === 'T2')?.pass === true)

    await m.click(m.button('對帳', '.cf-subtabs'))
    check('對帳給出建議配對與理由', m.text().includes('建議配對') && m.text().includes('金額相同 · 同日'), m.text().slice(0, 120))
    await m.click(m.all('#inner button').find((b) => b.textContent?.trim() === '確認'))
    check('確認建議後銀行明細勾稽', (m.db().bank as Array<{ id: string; m: string }>).find((b) => b.id === 'B2')?.m === 'T2')

    await m.click(m.button('月結', '.cf-subtabs'))
    const lock = m.button('鎖定', '#inner') as HTMLButtonElement | null
    check('檢查沒過時鎖定按鈕不可按', Boolean(lock?.disabled), m.text('.cf-checks'))
    check('未完成的項目各自有「前往」', m.all('.cf-chk .link').length >= 2)

    await m.click(m.button('洞察', '.cf-faces'))
    check('洞察不寫死 Runway', m.text().includes('尚未設定現金帳戶') && !m.text().includes('6.8'), m.text().slice(0, 160))
    check('洞察不寫死應收未收', m.text().includes('交易還沒有到期日') && !m.text().includes('88,000'), '')
    await m.click(m.root.querySelector('.cf-kpi') as HTMLElement)
    check('點 KPI 下鑽到帳本', m.tab() === '帳本', m.tab())
    m.wb.destroy()
  }

  // ── 負責人：CSV 匯入 ───────────────────────────────────────────────
  {
    const m = await mount(OWNER, { txns: [txn('T2', 5, 'Vercel 月費', -640)], bank: [], intake: [], periods: [], reimb: [] })
    await m.go(2)
    check('對帳空狀態不畫全 0 的調節表', m.text().includes('先匯入') && !m.text().includes('調節後正確餘額'), m.text().slice(0, 80))
    await m.click(m.button('匯入銀行明細', '#inner'))
    const fed = await m.feedFile('bank.csv', `日期,摘要,支出,存入\n${d(5).replace(/-/g, '/')},VERCEL INC,640,\n${d(9)},"匯入,客戶",,"12,000"\n`, 'text/csv')
    check('CSV 匯入 · 讀到預覽', fed && (m.text('#modalWrap') || '').includes('新的 2 列'), m.text('#modalWrap').slice(0, 100))
    await m.click(m.button('匯入 2 列', '#modalWrap'))
    const rows = m.db().bank as Array<{ t: string; amt: number }>
    check('CSV 匯入 · 支出與存入欄轉成正負金額', rows.length === 2 && rows.some((r) => r.amt === -640) && rows.some((r) => r.amt === 12000 && r.t === '匯入,客戶'), JSON.stringify(rows))
    check('CSV 匯入後立刻有建議配對', m.text().includes('建議配對'))
    m.wb.destroy()
  }

  // ── 負責人：鎖帳 → 加註 → 解鎖要原因 ───────────────────────────────────
  {
    const m = await mount(OWNER, {
      txns: [txn('T1', 2, '客戶首期款', 120000), txn('T2', 5, 'Vercel 月費', -640)],
      bank: [bank('B1', 2, '匯入 首期款', 120000, 'T1'), bank('B2', 5, 'VERCEL INC', -640, 'T2')],
      intake: [], periods: [], reimb: [],
    })
    await m.go(0)
    await m.click(m.button('月結', '.cf-subtabs'))
    await m.click(m.button('鎖定', '#inner'))
    check('鎖定前在頁面內說明後果', m.text('.cf-confirm').includes('解鎖需要填原因'), m.text('.cf-confirm'))
    await m.click(m.button('確認鎖定', '#inner'))
    const period = (m.db().periods as Array<{ id: string; st: string }>)[0]
    check('鎖定寫入月結紀錄', period?.id === M && period?.st === 'closed', JSON.stringify(period))
    await m.click(m.button('帳本', '.cf-subtabs'))
    check('已結帳月份的交易顯示 ⑤', m.text('table.tbl').includes('⑤ 已結帳'))
    await m.click(m.root.querySelector('tr[data-tx="T2"]') as HTMLElement)
    check('交易抽屜說明能做什麼', m.text('#drawer').includes('可以加註與補憑證'), m.text('#drawer').slice(0, 80))
    await m.click(m.all('#drawer button').find((b) => b.textContent?.includes('加註')))
    // 表單開在哪裡（抽屜或置中視窗）由 form-modal 決定，這裡只斷言開的是加註表單。
    const formText = `${m.text('#formModalWrap')} ${m.text('#drawer')}`
    check('已結帳的編輯改成加註表單', formText.includes('在已結帳的交易上加註'), formText.slice(0, 60))
    await m.click(m.button('月結', '.cf-subtabs'))
    await m.click(m.button('解鎖', '#inner'))
    check('沒寫原因不能解鎖', (m.db().periods as Array<{ st: string }>)[0].st === 'closed')
    ;(m.root.querySelector('#cfReopenWhy') as HTMLInputElement).value = '會計師要求更正類別'
    await m.click(m.button('解鎖', '#inner'))
    const reopened = (m.db().periods as Array<{ st: string; log: Array<{ action: string; reason?: string }> }>)[0]
    check('寫了原因就解鎖，並留在紀錄', reopened.st === 'open' && reopened.log.at(-1)?.reason === '會計師要求更正類別', JSON.stringify(reopened.log))
    m.wb.destroy()
  }

  // ── 成員：落點、補齊、上傳到 R2、帳務邊界 ────────────────────────────
  {
    const m = await mount(MEMBER, {
      txns: [], bank: [], periods: [], reimb: [],
      intake: [{ id: 'I2', who: 'lily', t: '影印費', amt: null, d: d(20), p: '', st: 'draft', file: null, reimb: '', txn: '' }],
    })
    await m.go(0)
    check('成員 · 預設落點是收單 · 收件匣', m.face() === '收單' && m.tab() === '收件匣', `${m.face()} · ${m.tab()}`)
    check('成員預設是逐筆過單，不是清單', Boolean(m.root.querySelector('.cf-stagewrap')) && !m.root.querySelector('table.cf-grid'))
    check('待補的那一筆直接寫出缺什麼', m.text('.cf-shot-meta').includes('缺金額、歸屬'), m.text('.cf-shot-meta'))
    check('系統先問金額，一次只問一題', m.text('.cf-q') === '這張多少錢？', m.text('.cf-q'))
    await m.click(m.button('下一題', '#inner'))
    check('沒填金額不能往下，會說還差什麼', m.text('.cf-err').includes('還差金額'), m.text('.cf-err'))
    ;(m.root.querySelector('#cfAmt-I2') as HTMLInputElement).value = '320'
    await m.click(m.button('下一題', '#inner'))
    check('答完第一題自動問歸屬', m.text('.cf-q') === '這筆算誰的？', m.text('.cf-q'))
    check('往下一題不會殘留上一題的錯誤訊息', !m.root.querySelector('.cf-err'), m.text('.cf-err'))
    check('答過的縮成可以點回去改的麵包屑', m.text('.cf-crumbs').includes('320'), m.text('.cf-crumbs'))
    await m.click(m.button('公司層級', '.cf-opts'))
    check('選完歸屬進確認頁，金額沒有被清掉', m.text('.cf-q') === '送出這一筆？' && m.text('.cf-sum').includes('320'), m.text('.cf-sum'))
    await m.click(m.button('送出', '.cf-act'))
    const item = (m.db().intake as Array<{ id: string; st: string; amt: number; reimb: string }>).find((x) => x.id === 'I2')
    check('送出後進入待歸帳並建立代墊報帳', item?.st === 'unfiled' && item?.amt === 320 && Boolean(item?.reimb), JSON.stringify(item))
    check('最近送出顯示等待核准', m.text().includes('等待核准'))

    check('清空後是成績單，不是一張空卡片', m.text('.cf-cleared').includes('收件匣清空了'), m.text('.cf-cleared').slice(0, 60))

    await m.click(m.button('拍照', '#inner'))
    await m.feedFile('高鐵票.jpg', 'jpeg-bytes', 'image/jpeg')
    const fresh = (m.db().intake as Array<{ t: string; st: string; file: { objectKey?: string } | null }>).find((x) => x.t === '高鐵票')
    check('拍照上傳 · 檔案存成 R2 參照而不是 data URL', fresh?.file?.objectKey === 'operating/2026-09/test.jpg', JSON.stringify(fresh?.file))
    check('上傳後直接進到第一題', m.text('.cf-q') === '這張多少錢？' && Boolean(m.root.querySelector('.cf-bigin')), m.text('.cf-q'))

    await m.click(m.button('清單', '.cf-seg'))
    check('成員也可以切到清單檢視', Boolean(m.root.querySelector('table.cf-grid')))
    check('清單把缺漏畫成可以點的空格，不是說明文字', m.all('.cf-gap').length >= 2, String(m.all('.cf-gap').length))
    await m.click(m.button('逐筆', '.cf-seg'))
    check('可以切回逐筆', Boolean(m.root.querySelector('.cf-stagewrap')))

    await m.click(m.button('帳務', '.cf-faces'))
    check('成員進帳務看到邊界說明', m.text().includes('帳務由負責人處理') && !m.root.querySelector('table.tbl'), m.text().slice(0, 60))
    await m.click(m.button('回到收件匣', '#inner'))
    check('邊界說明可以一步回收件匣', m.tab() === '收件匣', m.tab())
    await m.click(m.button('洞察', '.cf-faces'))
    check('成員看不到公司整體數字', m.text().includes('只有負責人看得到'), m.text().slice(0, 60))
    m.wb.destroy()
  }

  console.log(`\n${checks - failed}/${checks} passed`)
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
