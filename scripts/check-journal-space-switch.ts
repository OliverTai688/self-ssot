/**
 * 日誌的比對對象不跟著畫面走（2026-10-06 正式站事故的回歸檢查）。
 *
 *   npx tsx scripts/check-journal-space-switch.ts
 *
 * 守的是一條使用者講得出來的線：**切到個人空間、或去看對方的那一天，自己的日誌不會不見**。
 *
 * 事故的形狀：`DB.journal` 是 getter，依「目前在哪個空間、正在看誰」回傳不同的本子。
 * 自動保存直接拿它跟基準線比對，於是 Lily 切到個人空間（那一本是空的）的 1.5 秒後，
 * 前端送出一筆「日誌 · 自動保存」，裡面是五筆 delete —— 她在圓展空間寫過的每一天。
 * 伺服器照單全收。型別檢查、lint、契約測試都看不到：每一段各自都是對的。
 *
 * 所以這裡把 database 模式整段掛起來，真的去點那幾顆按鈕，然後看送出去的東西。
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'

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
  if (!css || !css.escape) {
    g.CSS = { escape: (v: string) => String(v).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c) }
  }
  g.getComputedStyle = dom.window.getComputedStyle
  g.requestAnimationFrame = (fn: () => void) => setTimeout(fn, 0)
  g.cancelAnimationFrame = (id: number) => clearTimeout(id)
  g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
}

type Change = { collection: string; id: string; op: string }
type SentCommand = { op: string; ent: string; label: string; changes: Change[] }
const sent: SentCommand[] = []

function installFetch() {
  const g = globalThis as unknown as Record<string, unknown>
  g.fetch = (_url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST' && init.body) {
      const payload = JSON.parse(init.body) as { commands?: SentCommand[] }
      for (const command of payload.commands ?? []) sent.push(command)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ version: sent.length, applied: [], rejected: [] }),
      })
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ version: 0 }) })
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 30))
/** opTouch() 是 1.5 秒的延遲比對；等它跑完才看得到送出去的東西。 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 2200))

/** 事故當時 Lily 的那五天，以及宇星的幾天（其中一天與她重疊）。 */
const OWN_DAYS = ['2026-09-24', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-05']
const PEER_DAYS = ['2026-09-24', '2026-09-25', '2026-10-04']

function book(days: string[], who: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const day of days) {
    out[day] = {
      title: day,
      visibility: 'company',
      blocks: [{ id: `${who}-${day}`, t: 'p', ind: 0, text: `${who} 在 ${day} 寫的字` }],
    }
  }
  return out
}

const journalChanges = () => sent.flatMap((command) => command.changes).filter((c) => c.collection === 'journal')
const describe = (changes: Change[]) => changes.map((c) => `${c.id}:${c.op}`).join(' ') || '（無）'

async function main() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  installGlobals(dom)
  installFetch()

  const { createV5State } = await import('../src/lib/ui-data/yuanzhan/v5-state')
  const mod = await import('../src/components/yuanzhan/v5/runtime.js')
  const mountV5 = mod.mountV5 as (
    root: unknown,
    state: unknown,
  ) => { destroy(): void; navigate(wb: string, tab?: number): void }

  const seat: YuanzhanSeat = { email: 'lily@example.test', actor: 'lily', role: 'member', canSwitchActor: false }
  const state = createV5State('empty', seat, null, 'database', {
    journal: book(OWN_DAYS, 'lily'),
    journalPeer: book(PEER_DAYS, 'yz'),
  })

  const root = dom.window.document.createElement('div')
  root.className = 'v5-root'
  dom.window.document.body.appendChild(root)

  const workbench = mountV5(root, JSON.parse(JSON.stringify(state)))
  await tick()
  workbench.navigate('journal', 0)
  await settle()
  check('掛載後沒有對日誌送出任何變更', journalChanges().length === 0, describe(journalChanges()))

  const button = (label: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === label) as
      | HTMLElement
      | undefined

  // ── 切到個人空間 ────────────────────────────────────────────────────────
  sent.length = 0
  ;(root.querySelector('[title="切換個人／圓展空間"]') as HTMLElement | null)?.click()
  await tick()
  button('個人空間')?.click()
  await settle()
  check('真的切到了個人空間', root.dataset.space === 'personal', String(root.dataset.space))
  check('切到個人空間不會把圓展日誌送成 delete', journalChanges().length === 0, describe(journalChanges()))
  check(
    '個人空間說得出日誌文字還沒有接上保存',
    (root.querySelector('#wbRule')?.textContent || '').includes('不保留'),
    root.querySelector('#wbRule')?.textContent || '',
  )

  // ── 切回圓展空間 ────────────────────────────────────────────────────────
  sent.length = 0
  ;(root.querySelector('[title="切換個人／圓展空間"]') as HTMLElement | null)?.click()
  await tick()
  button('圓展空間')?.click()
  await settle()
  check('真的切回了圓展空間', root.dataset.space === 'team', String(root.dataset.space))
  check('切回來不會把整本重送一次', journalChanges().length === 0, describe(journalChanges()))

  // ── 回顧頁跳到對方的那一天 ──────────────────────────────────────────────
  //
  // jrGoto(day, who) 會把 journalAuthor 指到對方：這時 DB.journal 是對方那一本，
  // 拿它去比對就會把對方的內容抄進自己的列、並刪掉對方沒寫的那幾天。
  // 這條路徑在事故前沒有出事，靠的是日誌駕駛艙重繪時順手把 journalAuthor 拉回自己
  // （journal-cockpit.source.js）—— 是另一段程式的副作用，不是保證。所以也守在這裡。
  sent.length = 0
  workbench.navigate('journal', 1)
  await tick()
  const reviewText = (root.querySelector('#inner') as HTMLElement | null)?.textContent || ''
  check(
    '切回來之後，回顧頁還列得出自己寫過的每一天',
    OWN_DAYS.every((day) => reviewText.includes(`lily 在 ${day}`)),
    OWN_DAYS.filter((day) => !reviewText.includes(`lily 在 ${day}`)).join(' ') || '五天都在',
  )
  const peerJump = Array.from(root.querySelectorAll('.jr-card, .btn.sm')).find((el) => {
    const text = (el.closest('.jr-lane, .jr-day, .jr-row') || el).textContent || ''
    return text.includes('yz 在 ')
  }) as HTMLElement | undefined
  check('回顧頁找得到對方的那一天', Boolean(peerJump))
  peerJump?.click()
  await settle()
  check('去看對方的那一天不會動到自己的日誌', journalChanges().length === 0, describe(journalChanges()))

  workbench.destroy()

  console.log(`\n${checks - failed}/${checks} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
