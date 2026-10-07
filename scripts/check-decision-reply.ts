/**
 * 決策卡「選了選項」之後的保存與雙邊紀錄回歸檢查。
 *
 *   npx tsx scripts/check-decision-reply.ts
 *
 * 守的是兩條使用者講得出來的線：
 *   1. **選了決策卡的選項，重新整理之後決定還在。**
 *   2. **問的人與答的人各自的日誌上都留著這筆決定 —— 題目、全部選項、選了哪一個、誰在何時決定。**
 *
 * 第一條的 bug 從程式碼上很難看出來，因為畫面當下是對的，而且單獨測也是對的：
 * `rqReply()` 原本先改好請求那一列，才呼叫 `commit()`。`commit()` 的「之前」快照是在
 * apply() 前取的，那時候決定已經在裡面，於是這一筆命令比不出它 —— 平常沒事，1.5 秒後的
 * 自動保存會從基準線把它補上。出事的是 2026-10-07 正式站的這個順序：
 *
 *   對方先寫了東西 → 這一頁回到前景時把伺服器現況併回來（讀回來的交易沒有 author／
 *   ledgerRow）→ 選選項 → commit() 裡的 stampAuthors() 順手把那些欄位補上 → 這一筆
 *   「請求回覆」命令於是有內容（projects、txns），佇列推進、基準線設成現況 ——
 *   決定就這樣落進基準線，之後再也比不出來。
 *
 * 脈絡上那句「回覆請求」是另一列，照常存得進去，所以看起來像「有回覆、但結果沒存」。
 *
 * 所以這裡把 database 模式整段掛起來，照那個順序走一遍，真的去點選項，然後看送出去的東西。
 *
 *   V5_RUNTIME=../src/components/yuanzhan/v5/某一版.js npx tsx scripts/check-decision-reply.ts
 *
 * 可以對著任意一版 runtime 跑（例如 git show 出來的舊版），用來確認這支真的抓得到那個回歸。
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'
import { operatingToday } from '../src/lib/ui-data/yuanzhan/v5-state'

const DAY = operatingToday()

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
  ;(dom.window.Element.prototype as unknown as Record<string, unknown>).scrollIntoView = function () {}
}

type Change = { collection: string; id: string; op: string; after?: Record<string, unknown> }
type SentCommand = { op: string; ent: string; label: string; changes: Change[] }
const sent: SentCommand[] = []

/** 伺服器替身：版本號與「另一個席位寫入之後」讀得回來的那份 store。 */
const remote: { version: number; store: Record<string, unknown> | null } = { version: 0, store: null }

function installFetch() {
  const g = globalThis as unknown as Record<string, unknown>
  g.fetch = (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST' && init.body) {
      const payload = JSON.parse(init.body) as { commands?: SentCommand[] }
      for (const command of payload.commands ?? []) sent.push(command)
      remote.version += 1
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ version: remote.version, applied: [], rejected: [] }),
      })
    }
    const body = String(url).includes('/store')
      ? { version: remote.version, store: remote.store ?? {} }
      : { version: remote.version }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 30))
/** opTouch() 是 1.5 秒的延遲比對；等它跑完才看得到送出去的東西。 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 2200))

const QUESTION = '他想行銷的東西主要是什麼？'
const OPTIONS = ['免費合作', '付費行銷', '兩個都做']
const PICK = 1

function decision(over: Record<string, unknown> = {}) {
  return {
    id: 'REQ-dec', from: 'lily', to: 'yz', day: DAY, blockId: 'b-ask',
    text: QUESTION, kind: 'decision', options: OPTIONS,
    sentAt: Date.now() - 7 * 3600e3, replies: [], nudges: [], pinged: {},
    ...over,
  }
}
const bookOf = (blocks: unknown[]) => ({ [DAY]: { title: DAY, visibility: 'company', blocks } })
const askedLine = { id: 'b-ask', t: 'p', ind: 0, text: QUESTION, req: 'REQ-dec' }
const ownLine = { id: 'b-own', t: 'p', ind: 0, text: '今天自己寫的一行' }

/** 伺服器讀回來的一筆交易：沒有 author、沒有 ledgerRow —— 那兩個欄位是 runtime 自己補的。 */
const remoteTxn = { id: 'TXN-remote', d: DAY, t: '對方剛記的一筆', p: '', cat: '', amt: 1200, pass: false, v: 0, files: [], note: '' }

type Mounted = {
  root: HTMLElement
  /** 另一個席位寫了東西之後，這一頁回到前景：版本落後 → 把伺服器現況併回來。 */
  peerWrote(store: Record<string, unknown>): Promise<void>
  destroy(): void
  find(selector: string): HTMLElement | null
  text(selector: string): string
  click(el: HTMLElement | null | undefined): Promise<void>
}

async function mount(seat: YuanzhanSeat, store: Record<string, unknown>): Promise<Mounted> {
  // pretendToBeVisual：visibilityState 要是 'visible'，回到前景的那次版本檢查才會跑。
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
  installGlobals(dom)
  installFetch()
  const { createV5State } = await import('../src/lib/ui-data/yuanzhan/v5-state')
  const mod = await import(process.env.V5_RUNTIME || '../src/components/yuanzhan/v5/runtime.js')
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
    peerWrote: async (next) => {
      remote.store = next
      remote.version += 1
      dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'))
      await tick()
      await tick()
    },
    destroy: () => workbench.destroy(),
    find: (selector) => root.querySelector(selector) as HTMLElement | null,
    text: (selector) => flat(root.querySelector(selector)),
    click: async (el) => { el?.click(); await tick() },
  }
}

const YZ: YuanzhanSeat = { email: 'yz@example.test', actor: 'yz', role: 'owner', canSwitchActor: false }
const LILY: YuanzhanSeat = { email: 'lily@example.test', actor: 'lily', role: 'member', canSwitchActor: false }

const requestChanges = () =>
  sent.flatMap((command) => command.changes).filter((c) => c.collection === 'requests' && c.id === 'REQ-dec')

/** 一張決策紀錄卡該有的東西：題目、每一個選項、被選的那一個有標記。 */
function assertRecord(m: Mounted, selector: string, where: string) {
  const card = m.find(selector)
  check(`${where}：看得到決策紀錄`, !!card, selector)
  const text = (card?.textContent || '').replace(/\s+/g, ' ')
  check(`${where}：紀錄上有全部選項`, OPTIONS.every((o) => text.includes(o)), text.slice(0, 120))
  const picked = card?.querySelector('.rq-rec-opt.on')
  check(`${where}：被選的那一個有標記`, (picked?.textContent || '').includes(OPTIONS[PICK]), picked?.textContent || '（無）')
  const rest = Array.from(card?.querySelectorAll('.rq-rec-opt:not(.on)') || [])
  check(`${where}：沒被選的選項也留著`, rest.length === OPTIONS.length - 1, String(rest.length))
}

async function main() {
  // ── 答的人（宇星）選選項 ────────────────────────────────────────────────
  const m = await mount(YZ, {
    journal: bookOf([ownLine]),
    journalPeer: bookOf([askedLine]),
    requests: [decision()],
  })
  await settle()
  await m.peerWrote({ requests: [decision()], txns: [remoteTxn] })
  check('併回伺服器現況之後，決策卡還在待我回覆', !!m.find('[data-rq-in="REQ-dec"]'))
  sent.length = 0

  const option = Array.from(m.root.querySelectorAll('[data-rq-in="REQ-dec"] .rq-optbtn'))[PICK] as HTMLElement | undefined
  check('收到的決策卡上有選項可以點', !!option, option?.textContent || '（無）')
  await m.click(option)
  await settle()

  const saved = requestChanges().at(-1)?.after
  check(
    '選了選項之後，請求那一列有被送去保存',
    !!saved,
    sent.map((c) => `${c.ent}〔${[...new Set(c.changes.map((x) => x.collection))].join(',')}〕`).join('、') || '（沒有送出任何命令）',
  )
  check('保存的內容帶著選了哪一個', saved?.choice === OPTIONS[PICK], String(saved?.choice))
  check('保存的內容帶著全部選項', JSON.stringify(saved?.options) === JSON.stringify(OPTIONS), JSON.stringify(saved?.options))
  check('保存的內容帶著回覆時刻', typeof saved?.firstReplyAt === 'number', String(saved?.firstReplyAt))

  assertRecord(m, '#jcMine [data-rq-rec="REQ-dec"]', '答的人自己的日誌')
  assertRecord(m, '#jcPeer [data-rq-rec="REQ-dec"]', '答的人看問的人那一欄')
  m.destroy()

  // ── 重新整理之後（以剛才送出去的那一列當作讀回來的資料）──────────────────
  if (saved) {
    const again = await mount(YZ, { journal: bookOf([ownLine]), journalPeer: bookOf([askedLine]), requests: [saved] })
    check('重新整理後不再列為待我回覆', !again.find('[data-rq-in="REQ-dec"]'))
    assertRecord(again, '#jcMine [data-rq-rec="REQ-dec"]', '重新整理後，答的人自己的日誌')
    again.destroy()

    // ── 問的人（Lily）那一頭 ──────────────────────────────────────────────
    const asker = await mount(LILY, { journal: bookOf([askedLine]), journalPeer: bookOf([ownLine]), requests: [saved] })
    assertRecord(asker, '#jcMine [data-rq-rec="REQ-dec"]', '問的人自己的那一行')
    assertRecord(asker, '#jcPeer [data-rq-rec="REQ-dec"]', '問的人看答的人那一欄')
    asker.destroy()

    // ── 問句寫在問的人的「文件物件」正文裡，不是日誌的行（回報的那一張就是這個形狀）──
    const taskDoc = {
      id: 'DOC-task', kind: 'agenda', day: DAY, author: 'lily', title: '圓頭音樂行銷會前材料', titleAuto: false,
      secs: [{ title: '內文', text: '', blocks: [askedLine] }],
    }
    const cardLine = { id: 'b-card', t: 'obj', ind: 0, text: '', obj: { ty: 'doc_object', rid: 'DOC-task' } }
    const inObject = await mount(YZ, {
      journal: bookOf([ownLine]),
      journalPeer: bookOf([cardLine]),
      docObjects: [taskDoc],
      requests: [saved],
    })
    assertRecord(inObject, '#jcMine [data-rq-rec="REQ-dec"]', '問句在物件正文裡，答的人自己的日誌')
    const source = (inObject.find('#jcMine [data-rq-rec="REQ-dec"] .rq-src')?.textContent || '').trim()
    check('來源標籤認得物件裡的行，不說成原行已刪除', !!source && !source.includes('已刪除'), source)
    assertRecord(inObject, '#jcPeer [data-rq-rec="REQ-dec"]', '問句在物件正文裡，問的人那張卡片上')
    inObject.destroy()
  }

  console.log(`\n${checks - failed}/${checks} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
