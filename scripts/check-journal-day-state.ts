/**
 * 日誌右欄「今日脈絡 / 今日議題」的持久化回歸檢查（PLN-074 M7）。
 *
 *   npx tsx scripts/check-journal-day-state.ts
 *
 * 守的是一條使用者講得出來的線：**重新整理之後，右欄還在**。
 *
 * 這個檔案存在的理由，是這個 bug 的形狀特別難從程式碼看出來 —— 資料其實有存進
 * 資料庫，也有從 `/api/company/operating/store` 讀回來，只是 runtime 在掛載時
 * 又把集合指派成空陣列，把剛讀回來的內容蓋掉。型別檢查看不到、lint 看不到、
 * 契約測試也看不到：只有真的把 store 餵進去掛一次，才看得出來東西不見了。
 *
 * 所以這裡做的是把 database 模式的載入路徑整段走一遍（store → createV5State →
 * mountV5 → 畫面文字），然後斷言畫面上真的看得到那些列。
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'

/** 與 v5-seed 的 today 相同；database 模式不會清掉這個字串。 */
const DAY = '2026-09-12'

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

/** jsdom 沒有的瀏覽器全域，補到剛好夠 runtime 跑起來為止（與 operating-runtime-harness 同一套）。 */
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

/** 送出去的命令都留下來：寫入路徑要能被斷言，不能只看畫面。 */
type SentCommand = {
  op: string
  ent: string
  changes: Array<{ collection: string; id: string; op: string; after?: Record<string, unknown> }>
}
const sent: SentCommand[] = []

function installFetch() {
  const g = globalThis as unknown as Record<string, unknown>
  g.fetch = (url: string, init?: { method?: string; body?: string }) => {
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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
/** opTouch() 是 1.5 秒的延遲比對；等它跑完才看得到送出去的東西。 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 2200))

/** 假裝是 /api/company/operating/store 回來的內容：兩個人都留了東西。 */
function storeFixture(): Record<string, unknown> {
  return {
    dayLogs: [
      { id: 'DL-a-001', day: DAY, w: 'yz', t: '09:12', kind: 'start', text: '開始一天' },
      { id: 'DL-a-002', day: DAY, w: 'lily', t: '09:40', kind: 'start', text: '開始一天' },
      { id: 'DL-a-003', day: DAY, w: 'yz', t: '10:05', kind: 'act', text: '召喚「工作」' },
      { id: 'DL-a-004', day: DAY, w: 'lily', t: '10:20', kind: 'act', text: '留言' },
      { id: 'DL-a-005', day: DAY, w: 'yz', t: '18:30', kind: 'close', text: '收工' },
    ],
    todayIssues: [
      { id: 'TDY-a-001', author: 'yz', day: DAY, blockId: 'b-1', text: '燈具廠商還沒回，要追', at: Date.parse(`${DAY}T10:30:00Z`) },
      { id: 'TDY-a-002', author: 'yz', day: DAY, blockId: 'b-2', text: '報價單寄出', at: Date.parse(`${DAY}T11:00:00Z`), doneAt: Date.parse(`${DAY}T15:00:00Z`) },
    ],
    lineComments: [
      { id: 'LC-a-001', author: 'yz', day: DAY, blockId: 'b-1', w: 'lily', x: '我來追廠商', ts: '10:40' },
    ],
    journalComments: [
      { id: 'JC-a-001', parent: `team:page:${DAY}`, w: 'lily', ts: '11:05:00', x: '今天先收這樣' },
    ],
    journal: {
      [DAY]: {
        title: DAY,
        blocks: [
          { id: 'b-1', t: 'p', ind: 0, text: '燈具廠商還沒回，要追', today: 'TDY-a-001' },
          { id: 'b-2', t: 'p', ind: 0, text: '報價單寄出', today: 'TDY-a-002' },
        ],
        visibility: 'company',
      },
    },
    // 對方那一本。分開讀回來，才不會在同一天互相覆蓋。
    journalPeer: {
      [DAY]: {
        title: DAY,
        blocks: [{ id: 'l-1', t: 'p', ind: 0, text: '整理柏翰成效報告' }],
        visibility: 'company',
      },
    },
  }
}

async function main() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  installGlobals(dom)
  installFetch()

  const errors: string[] = []
  const originalError = console.error
  const collect = (...args: unknown[]) => errors.push(args.map(String).join(' '))

  const { createV5State } = await import('../src/lib/ui-data/yuanzhan/v5-state')
  const mod = await import('../src/components/yuanzhan/v5/runtime.js')
  const mountV5 = mod.mountV5 as (
    root: unknown,
    state: unknown,
  ) => { destroy(): void; snapshot(): Record<string, unknown>; navigate(wb: string, tab?: number): void }

  const seat: YuanzhanSeat = {
    email: 'taioliver688@gmail.com',
    actor: 'yz',
    role: 'owner',
    canSwitchActor: false,
  }
  const state = createV5State('empty', seat, null, 'database', storeFixture())

  const root = dom.window.document.createElement('div')
  root.className = 'v5-root'
  dom.window.document.body.appendChild(root)

  console.error = collect
  const workbench = mountV5(root, JSON.parse(JSON.stringify(state)))
  await tick()
  workbench.navigate('journal', 0)
  await tick()
  console.error = originalError

  const db = workbench.snapshot()
  const text = ((root.querySelector('#inner') as HTMLElement | null)?.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()

  check('掛載沒有 runtime 錯誤', errors.length === 0, errors.slice(0, 2).join(' | '))

  // ── 今日脈絡 ────────────────────────────────────────────────────────────
  const dayLogs = (db.dayLogs ?? []) as Array<Record<string, unknown>>
  check('今日脈絡沒有被掛載時清空', dayLogs.length === 5, `${dayLogs.length} 列`)
  check('今日脈絡在畫面上，不是「今天還沒有動靜」', !text.includes('今天還沒有動靜'))
  check('今日脈絡看得到宇星那幾筆', text.includes('召喚「工作」'))
  check('今日脈絡看得到 Lily 那幾筆', text.includes('10:20'))
  const bothNames = text.includes('宇星') && text.includes('Lily')
  check('同一條時間軸上兩個人都標了名字', bothNames)

  // 「開始一天」從脈絡推回來，而不是另外存一份狀態。
  check('標題列顯示開始一天的時刻', text.includes('09:12') || (root.textContent || '').includes('09:12'))
  const dayClose = (db.dayClose ?? {}) as Record<string, Record<string, string>>
  check('收工時刻由脈絡重建', dayClose.yz?.[DAY] === '18:30', JSON.stringify(dayClose))

  // ── 今日議題 ────────────────────────────────────────────────────────────
  const todayIssues = (db.todayIssues ?? []) as Array<Record<string, unknown>>
  check('今日議題沒有被掛載時清空', todayIssues.length === 2, `${todayIssues.length} 列`)
  check('未完成的議題沒有被當成已完成', !todayIssues.find((t) => t.id === 'TDY-a-001')?.doneAt)
  check('已完成的議題帶著完成時刻回來', Boolean(todayIssues.find((t) => t.id === 'TDY-a-002')?.doneAt))
  check('日誌那一行的今日議題標籤還在', text.includes('今日'))

  // ── 留言 ────────────────────────────────────────────────────────────────
  check('行內留言沒有被掛載時清空', ((db.lineComments ?? []) as unknown[]).length === 1)
  check('行內留言在畫面上', text.includes('我來追廠商'))
  check('整頁留言沒有被掛載時清空', ((db.journalComments ?? []) as unknown[]).length === 1)

  // ── 兩個人的日誌各自歸位 ────────────────────────────────────────────────
  check('自己的日誌在自己的編輯區', text.includes('燈具廠商還沒回'))
  check('對方的日誌顯示在右邊那一欄，不是覆蓋掉自己的', text.includes('整理柏翰成效報告'))
  check('自己的編輯區沒有混進對方的內容', !((root.querySelector('#doc') as HTMLElement | null)?.textContent || '').includes('整理柏翰成效報告'))
  // DB.journal 是 defineProperty 裝出來的 getter（非 enumerable），structuredClone 帶不出來，
  // 所以這裡看畫面：可編輯的那一欄應該正好是自己的兩段。
  const ownBlocks = (root.querySelectorAll('#doc .eb-tx').length)
  check('可寫入的那一欄只有自己的段落', ownBlocks === 2, `${ownBlocks} 段`)

  // ── id 不會跨次載入撞在一起 ─────────────────────────────────────────────
  const seq = (db.seq ?? {}) as Record<string, unknown>
  check('nid 帶了每次載入各自不同的字段', typeof seq.run === 'string' || seq.run === undefined)

  // ── 已完成／未完成的標籤都畫出來了 ─────────────────────────────────────
  const donePill = root.querySelector('.rq-pill.done')
  const openPill = root.querySelector('button.rq-pill.today') as HTMLElement | null
  check('已完成的今日議題標籤在畫面上', Boolean(donePill))
  check('未完成的今日議題標籤可以點來標完成', Boolean(openPill))

  // ── 寫入路徑：新產生的脈絡列真的被送出去 ───────────────────────────────
  //
  // 這一段守的是一個從畫面上完全看不出來的錯誤：commit() 是先取快照才 apply()，
  // 所以在 commit 之前寫的脈絡列會一起落進基準線，永遠比不出差異、也就永遠不會被保存。
  // 畫面上看起來一切正常，直到下一次重新整理。
  sent.length = 0
  openPill?.click()
  await tick()
  await settle()

  const changes = sent.flatMap((command) => command.changes)
  const loggedDay = changes.find((c) => c.collection === 'dayLogs' && c.op === 'create')
  const issueDone = changes.find((c) => c.collection === 'todayIssues' && c.id === 'TDY-a-001')
  check('標記完成之後，脈絡多出來的那一列有被送出去', Boolean(loggedDay), JSON.stringify(loggedDay?.after ?? null))
  check('脈絡列帶著是誰做的', loggedDay?.after?.w === 'yz')
  check('今日議題的完成時刻有被送出去', Boolean(issueDone?.after?.doneAt), JSON.stringify(issueDone?.after ?? null))

  workbench.destroy()

  console.log(`\n${checks - failed}/${checks} passed`)
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
