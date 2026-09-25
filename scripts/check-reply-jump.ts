/**
 * 回覆追蹤「跳到那一行」的跨日回歸檢查。
 *
 *   npx tsx scripts/check-reply-jump.ts
 *
 * 守的是一條使用者講得出來的線：**過了當天，還是跳得到那一天的日誌，並且看得到
 * 是哪一行還沒回。**
 *
 * 這個 bug 的形狀從程式碼上很難看出來，因為當天測都是對的：`rqJump()` 原本用
 * 「這是不是我還沒回的請求」一個判斷同時決定兩件事 —— 要跳到哪一天、要對準哪個
 * 元素。當天兩者剛好重合，跨日之後才分岔：來源按鈕上明明寫著「↩ Lily 9/24 · L1」，
 * 按下去卻被拉回今天。加上請求只認 `r.day` 一個日期，那一天的日誌沒載到、那一行被
 * 搬走或 `onDate` 存成 null（讀回來是空字串）時，會靜靜地停在一頁空白的日誌上。
 *
 * 所以這裡把 database 模式的載入路徑走一遍（store → createV5State → mountV5），
 * 真的去點那幾顆按鈕，然後斷言落地的日期、被 flash 的那一行、以及找不到時有沒有
 * 講清楚原因。
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'
import { operatingToday } from '../src/lib/ui-data/yuanzhan/v5-state'

const DAY = operatingToday()
const dayShift = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const YDAY = dayShift(DAY, -1)
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

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

/** jsdom 沒有的瀏覽器全域，補到剛好夠 runtime 跑起來為止（與 check-journal-day-state 同一套）。 */
function installGlobals(dom: JSDOM) {
  const g = globalThis as unknown as Record<string, unknown>
  g.window = dom.window
  g.document = dom.window.document
  try {
    Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true })
  } catch {
    /* 某些 node 版本的 navigator 是唯讀 getter */
  }
  const win = dom.window as unknown as Record<string, unknown>
  for (const key of [
    'Node', 'Element', 'HTMLElement', 'CustomEvent', 'Event', 'MutationObserver',
    'AbortController', 'AbortSignal', 'DataTransfer', 'CSS', 'DOMParser', 'XMLSerializer',
  ]) {
    if (win[key]) g[key] = win[key]
  }
  const css = g.CSS as { escape?: (v: string) => string } | undefined
  if (!css || !css.escape) g.CSS = { escape: (v: string) => String(v).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c) }
  g.getComputedStyle = dom.window.getComputedStyle
  g.requestAnimationFrame = (fn: () => void) => setTimeout(fn, 0)
  g.cancelAnimationFrame = (id: number) => clearTimeout(id)
  g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
  // jsdom 沒有 scrollIntoView；定位本身就是這支檢查要斷言的行為之一。
  ;(dom.window.Element.prototype as unknown as Record<string, unknown>).scrollIntoView = function () {}
  g.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ version: 0 }) })
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

type Mounted = {
  root: HTMLElement
  destroy(): void
  navigate(wb: string, tab?: number): void
  day(): string
  text(selector: string): string
  find(selector: string): HTMLElement | null
  click(el: HTMLElement | null | undefined): Promise<void>
  toasts(): string
}

const seat: YuanzhanSeat = {
  email: 'taioliver688@gmail.com',
  actor: 'yz',
  role: 'owner',
  canSwitchActor: false,
}

/** 逾期 31 小時、昨天發出的請求。所有案例都從這個形狀長出來。 */
function request(over: Record<string, unknown> = {}) {
  return {
    id: 'REQ-jump', from: 'yz', to: 'lily', day: YDAY, blockId: 'b-y2',
    text: '能今天幫我測試新增看看日誌', kind: 'ask',
    sentAt: Date.now() - 31 * 3600e3, options: [], replies: [], nudges: [], pinged: {},
    ...over,
  }
}
const askedLine = { id: 'b-y2', t: 'p', ind: 0, text: '能今天幫我測試新增看看日誌', req: 'REQ-jump' }
const otherLine = { id: 'b-y1', t: 'p', ind: 0, text: '昨天的第一行' }
const bookOf = (blocks: unknown[]) => ({ [YDAY]: { title: YDAY, visibility: 'company', blocks } })

async function mount(store: Record<string, unknown>): Promise<Mounted> {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  installGlobals(dom)
  const { createV5State } = await import('../src/lib/ui-data/yuanzhan/v5-state')
  const mod = await import('../src/components/yuanzhan/v5/runtime.js')
  const mountV5 = mod.mountV5 as (root: unknown, state: unknown) => {
    destroy(): void; navigate(wb: string, tab?: number): void
  }
  const base = { dayLogs: [], todayIssues: [], lineComments: [], journalComments: [], journalPeer: {}, ...store }
  const state = createV5State('empty', seat, null, 'database', base)
  const root = dom.window.document.createElement('div')
  root.className = 'v5-root'
  dom.window.document.body.appendChild(root)
  const workbench = mountV5(root, JSON.parse(JSON.stringify(state)))
  await tick()
  workbench.navigate('journal', 0)
  await tick()
  const flat = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim()
  return {
    root: root as unknown as HTMLElement,
    destroy: () => workbench.destroy(),
    navigate: (wb, tab) => workbench.navigate(wb, tab),
    // 標題列印的就是 S.jday，所以它同時是「跳到哪一天」與「日期合不合法」的證據。
    day: () => (root.querySelector('#jcDate b')?.textContent || '').trim().split(' ')[0],
    text: (selector) => flat(root.querySelector(selector)),
    find: (selector) => root.querySelector(selector) as HTMLElement | null,
    click: async (el) => { el?.click(); await tick() },
    toasts: () => flat(root.querySelector('#toasts')),
  }
}

/** 紅色橫幅上的第一顆按鈕就是「跳到那一行」。 */
const alarmJump = (m: Mounted) => m.find('.rq-alarm .rq-alarm-a button')

async function main() {
  // ── ① 自己問對方，昨天問的：跳到昨天，並且標出是哪一行 ──────────────────
  {
    const m = await mount({
      requests: [request()],
      journal: bookOf([otherLine, askedLine]),
    })
    await m.click(alarmJump(m))
    check('跨日 · 跳到請求發出的那一天', m.day() === YDAY, `${m.day()} vs ${YDAY}`)
    const line = m.find('#doc .eb[data-id="b-y2"]')
    check('跨日 · 原本那一行在畫面上', Boolean(line))
    check('跨日 · 那一行被標記出來', Boolean(line?.className.includes('rq-flash')), line?.className)
    check('跨日 · 那一行看得出還沒回', m.text('#doc').includes('逾期'), m.text('#doc').slice(0, 60))
    m.destroy()
  }

  // ── ② 對方昨天問我：「↩ 作者 9/24 · L1」要真的跳到那一天的右欄那一行 ────
  //
  // 這是原本壞得最徹底的一顆：按鈕上寫著日期與行號，按下去卻永遠停在今天。
  {
    const m = await mount({
      requests: [request({ from: 'lily', to: 'yz', blockId: 'l-y1' })],
      journal: bookOf([otherLine]),
      journalPeer: bookOf([{ id: 'l-y1', t: 'p', ind: 0, text: '週一拍攝要不要加一台燈？', req: 'REQ-jump' }]),
    })
    const src = m.find('#doc .rq-in .rq-src')
    check('收到的請求卡片上有來源連結', Boolean(src), src?.textContent ?? '')
    check('來源連結標的是發問那一天與行號', (src?.textContent || '').includes('9/24') && (src?.textContent || '').includes('L1'), src?.textContent ?? '')
    await m.click(src)
    check('來源連結 · 跳到對方發問的那一天', m.day() === YDAY, `${m.day()} vs ${YDAY}`)
    const peerLine = m.find('#jcPeer [data-jc-bid="l-y1"]')
    check('來源連結 · 對方那一行在右欄', Boolean(peerLine))
    check('來源連結 · 對方那一行被標記出來', Boolean(peerLine?.className.includes('rq-flash')), peerLine?.className)
    check('來源連結 · 那一行看得出在等我回覆', m.text('#jcPeer').includes('逾期'), m.text('#jcPeer').slice(0, 80))

    // 訊號頁上的同一顆按鈕走同一條路。
    m.navigate('signal', 0)
    await tick()
    await m.click(m.find('.rq-card .rq-src'))
    check('訊號頁的來源連結也跳到那一天', m.day() === YDAY, m.day())
    m.destroy()
  }

  // ── ③ 「現在回覆」要落在打得了字的地方，也就是今天 ──────────────────────
  {
    const m = await mount({
      requests: [request({ from: 'lily', to: 'yz', blockId: 'l-y1' })],
      journalPeer: bookOf([{ id: 'l-y1', t: 'p', ind: 0, text: '週一拍攝要不要加一台燈？', req: 'REQ-jump' }]),
    })
    const reply = [...m.root.querySelectorAll('.jc-side .rq-card button')]
      .find((b) => (b.textContent || '').includes('回覆')) as HTMLElement | undefined
    await m.click(reply)
    check('現在回覆 · 停在今天', m.day() === DAY, `${m.day()} vs ${DAY}`)
    check('現在回覆 · 回覆輸入框是開著的', Boolean(m.find('[data-rq-input="REQ-jump"]')))
    check('現在回覆 · 收到的請求卡片在今天的日誌裡', Boolean(m.find('#doc [data-rq-in="REQ-jump"]')))
    m.destroy()
  }

  // ── ④ 請求沒記到日期（onDate 存成 null，讀回來是空字串）───────────────────
  //
  // 日期不能直接拿來用：`S.jday=''` 會讓標題列變成「週undefined」，而且一打字就
  // 開出一本 `DB.journal['']`，那一本存不回資料庫。改成先用 blockId 找回它在哪一天。
  {
    const m = await mount({
      requests: [request({ day: '' })],
      journal: bookOf([otherLine, askedLine]),
    })
    await m.click(alarmJump(m))
    check('日期壞掉 · S.jday 仍是合法日期', ISO_DAY.test(m.day()), m.day())
    check('日期壞掉 · 靠 blockId 找回正確那一天', m.day() === YDAY, `${m.day()} vs ${YDAY}`)
    check('日期壞掉 · 那一行還是找得到', Boolean(m.find('#doc .eb[data-id="b-y2"]')))
    m.destroy()
  }

  // ── ⑤ 那一行真的不見了：仍然落在那一天，而且要講清楚為什麼 ───────────────
  {
    const m = await mount({
      requests: [request()],
      journal: bookOf([otherLine]),
    })
    await m.click(alarmJump(m))
    check('那一行不見了 · 還是跳到那一天', m.day() === YDAY, m.day())
    check('那一行不見了 · 有說明原因，不是靜默失敗', m.toasts().includes('原本那一行已不在'), m.toasts())
    check('那一行不見了 · 訊號頁仍留著這筆請求', m.text('.jc-side').includes('逾期'))
    m.destroy()
  }

  // ── ⑥ 完全沒有日期可跳（連 blockId 都對不上）：停在今天，不要開出壞日誌 ──
  {
    const m = await mount({
      requests: [request({ day: '', blockId: '' })],
      journal: bookOf([otherLine, askedLine]),
    })
    await m.click(alarmJump(m))
    check('無從跳起 · 停在今天而不是空字串日期', m.day() === DAY, m.day())
    check('無從跳起 · 有說明原因', m.toasts().includes('沒有記下是哪一天'), m.toasts())
    m.destroy()
  }

  console.log(`\n${checks - failed}/${checks} passed`)
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
