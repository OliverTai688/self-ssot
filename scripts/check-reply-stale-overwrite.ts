/**
 * 「回覆會消失，隔天又跳出還沒回覆」的回歸檢查。
 *
 *   npx tsx scripts/check-reply-stale-overwrite.ts
 *
 * 請求那一列是雙方共用的一列：問的人、答的人（以及同一個人的另一台裝置）都會把整列寫回去，
 * 伺服器原本是整列覆蓋。只要有一個分頁拿著「還沒回」的舊副本寫了一次，回覆就被蓋掉，
 * firstReplyAt 也跟著變回 null —— 過了 24 小時就重新變成逾期。
 *
 * 2026-10-21 回報時找到的觸發點是 rqPing()：它每分鐘把「提醒過了沒」記在 r.pinged 上，
 * 那是每個瀏覽器各自的紀錄，卻寫在共用的那一列。請求滿 24 小時的那一刻（就是「隔天」），
 * 背景分頁的 rqPing 改了 pinged → render() → 1.5 秒後自動保存，把整列舊副本送出去；
 * 版本落後撞 409 時，合併又刻意保留本地這一列再重送。回覆就這樣被蓋掉。
 *
 * 守兩層：
 *   1. 前端：提醒紀錄不寫進請求那一列；分頁拿著舊副本、什麼都沒做時，不會送出請求那一列。
 *   2. 伺服器：就算真的收到舊副本，也不能把別人（或自己另一台裝置）已經存進去的回覆、
 *      已回覆時刻、決定、結案蓋掉；只有明確撤回（withdrawn）才會拿掉一則回覆。
 *
 *   V5_RUNTIME=某一版.js npx tsx scripts/check-reply-stale-overwrite.ts
 * 可以對著舊版 runtime 跑，確認這支抓得到那個回歸。
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'
import { mergeRequestPayload } from '../src/lib/services/operating-request-merge'
import { operatingToday } from '../src/lib/ui-data/yuanzhan/v5-state'

const DAY = operatingToday()
const HOUR = 3600e3

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

function installFetch() {
  let version = 0
  const g = globalThis as unknown as Record<string, unknown>
  g.fetch = (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST' && init.body) {
      const payload = JSON.parse(init.body) as { commands?: SentCommand[] }
      for (const command of payload.commands ?? []) sent.push(command)
      version += 1
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ version, applied: [], rejected: [] }),
      })
    }
    const body = String(url).includes('/store') ? { version, store: {} } : { version }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 30))
const settle = () => new Promise((resolve) => setTimeout(resolve, 2200))

const QUESTION = '週一要不要加一台燈？'
const askedLine = { id: 'b-ask', t: 'p', ind: 0, text: QUESTION, req: 'REQ-stale' }
const ownLine = { id: 'b-own', t: 'p', ind: 0, text: '今天自己寫的一行' }
const bookOf = (blocks: unknown[]) => ({ [DAY]: { title: DAY, visibility: 'company', blocks } })

/** 問的人這一頁手上的那份：25 小時前問的、還沒看到回覆 —— 一個放了一整晚的背景分頁。 */
function staleAsk(over: Record<string, unknown> = {}) {
  return {
    id: 'REQ-stale', from: 'lily', to: 'yz', day: DAY, blockId: 'b-ask',
    text: QUESTION, kind: 'ask', options: [],
    sentAt: Date.now() - 25 * HOUR, replies: [], nudges: [], pinged: {},
    ...over,
  }
}

async function mount(seat: YuanzhanSeat, store: Record<string, unknown>) {
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
  return {
    root: root as unknown as HTMLElement,
    workbench,
    destroy: () => workbench.destroy(),
  }
}

const YZ: YuanzhanSeat = { email: 'yz@example.test', actor: 'yz', role: 'owner', canSwitchActor: false }
const LILY: YuanzhanSeat = { email: 'lily@example.test', actor: 'lily', role: 'member', canSwitchActor: false }

const rowsSent = (id: string) =>
  sent.flatMap((c) => c.changes).filter((c) => c.collection === 'requests' && c.id === id)

async function clientSide() {
  // ── 1. 問的人的背景分頁：手上是舊副本，過了 24 小時，什麼都沒做 ──────────────────
  sent.length = 0
  const asker = await mount(LILY, {
    journal: bookOf([askedLine]),
    journalPeer: bookOf([ownLine]),
    requests: [staleAsk()],
  })
  // rqTick 第一次在 1.5 秒跑：滿 24 小時 → rqPing 記提醒。之後任何一次重畫都會排自動保存。
  await settle()
  asker.workbench.navigate('journal', 0)
  await settle()
  asker.workbench.navigate('signal', 0)
  await settle()
  const leaked = rowsSent('REQ-stale')
  check(
    '舊副本放著不動：逾期提醒不會讓這一頁把請求那一列送出去',
    leaked.length === 0,
    leaked.length ? `送出了 ${leaked.length} 次，replies=${JSON.stringify(leaked.at(-1)?.after?.replies)} firstReplyAt=${leaked.at(-1)?.after?.firstReplyAt}` : '沒有送出',
  )
  asker.destroy()

  // ── 2. 答的人撤回回覆：送出去的那一列要帶著撤回標記，伺服器才分得出「撤回」與「舊副本」 ──
  sent.length = 0
  const at = Date.now() - 60e3
  const replied = staleAsk({
    sentAt: Date.now() - 5 * HOUR,
    replies: [{ w: 'yz', x: '好，加一台', at, ts: '10:00' }],
    firstReplyAt: at, seenAt: at,
  })
  const answerer = await mount(YZ, {
    journal: bookOf([ownLine]),
    journalPeer: bookOf([askedLine]),
    requests: [replied],
  })
  await settle()
  answerer.workbench.navigate('signal', 0)
  await tick()
  const undo = [...answerer.root.querySelectorAll('button')].find((b) => (b.textContent || '').includes('撤回回覆')) as HTMLElement | undefined
  check('答的人看得到「撤回回覆」', !!undo)
  undo?.click()
  await settle()
  const after = rowsSent('REQ-stale').at(-1)?.after as Record<string, unknown> | undefined
  check('撤回後請求那一列有送出', !!after)
  check('送出的那一列已經拿掉那則回覆', Array.isArray(after?.replies) && (after?.replies as unknown[]).length === 0, JSON.stringify(after?.replies))
  check(
    '送出的那一列帶著撤回標記（誰、哪一則）',
    Array.isArray(after?.withdrawn) && (after?.withdrawn as string[]).includes(`yz@${at}`),
    JSON.stringify(after?.withdrawn),
  )
  answerer.destroy()
}

function serverSide() {
  const t0 = Date.now() - 30 * HOUR
  const reply = { w: 'yz', x: '好，加一台', at: t0 + 3 * HOUR, ts: '10:00' }
  const saved = {
    options: [], replies: [reply], nudges: [], pinged: {}, via: 'ask',
    seenAt: t0 + HOUR, firstReplyAt: reply.at, resolvedAt: null, choice: null,
    deferReason: null, deferredAt: null, withdrawn: [],
  }
  const stale = {
    options: [], replies: [], nudges: [], pinged: { 'late:lily': 0 }, via: 'ask',
    seenAt: null, firstReplyAt: null, resolvedAt: null, choice: null,
    deferReason: null, deferredAt: null,
  }

  // 回報的那一個：問的人拿舊副本寫回來
  let m = mergeRequestPayload(saved, stale, { from: 'lily', to: 'yz' })
  check('伺服器：問的人的舊副本不會蓋掉回覆', m.replies.length === 1 && m.replies[0].x === reply.x, JSON.stringify(m.replies))
  check('伺服器：已回覆時刻保留', m.firstReplyAt === reply.at, String(m.firstReplyAt))
  check('伺服器：已讀時刻保留', m.seenAt === saved.seenAt, String(m.seenAt))

  // 同一個人的另一台裝置（例如手機回了、電腦分頁是舊的）
  m = mergeRequestPayload(saved, { ...stale, pinged: { 'late:yz': 0 } }, { from: 'lily', to: 'yz' })
  check('伺服器：自己另一台裝置的舊副本也不會蓋掉回覆', m.replies.length === 1 && m.firstReplyAt === reply.at)

  // 問的人在舊副本上接著追問：兩則都要在，照時間排
  const follow = { w: 'lily', x: '那預算呢？', at: t0 + 5 * HOUR, ts: '12:00' }
  m = mergeRequestPayload(saved, { ...stale, replies: [follow] }, { from: 'lily', to: 'yz' })
  check(
    '伺服器：舊副本上新增的追問與原本的回覆都留著、照時間排',
    m.replies.map((r) => r.x).join('|') === `${reply.x}|${follow.x}`,
    m.replies.map((r) => r.x).join('|'),
  )
  check('伺服器：追問不影響已回覆時刻', m.firstReplyAt === reply.at)

  // 明確撤回：唯一一則被撤回 → 回到待回覆
  m = mergeRequestPayload(saved, { ...saved, replies: [], firstReplyAt: null, withdrawn: [`yz@${reply.at}`] }, { from: 'lily', to: 'yz' })
  check('伺服器：明確撤回會拿掉那一則', m.replies.length === 0, JSON.stringify(m.replies))
  check('伺服器：撤回唯一一則回覆後回到待回覆', m.firstReplyAt === null, String(m.firstReplyAt))

  // 撤回之後，問的人拿著「還有那則回覆」的舊副本寫回來 → 撤回不能被復活
  const afterUndo = { ...m }
  m = mergeRequestPayload(afterUndo, { ...saved, pinged: {} }, { from: 'lily', to: 'yz' })
  check('伺服器：撤回過的回覆不會被舊副本復活', m.replies.length === 0 && m.firstReplyAt === null, JSON.stringify(m.replies))

  // 有兩則、只撤最後一則 → 仍是已回覆
  const second = { w: 'yz', x: '補充：要白光', at: t0 + 4 * HOUR, ts: '11:00' }
  const two = { ...saved, replies: [reply, second] }
  m = mergeRequestPayload(two, { ...two, replies: [reply], withdrawn: [`yz@${second.at}`] }, { from: 'lily', to: 'yz' })
  check('伺服器：撤回最後一則、前一則還在 → 仍是已回覆', m.replies.length === 1 && m.firstReplyAt === reply.at)

  // 決策卡：選過的決定不被舊副本清掉
  const decided = { ...saved, options: ['要', '不要'], choice: '要', replies: [{ ...reply, x: '', choice: '要' }] }
  m = mergeRequestPayload(decided, { ...stale, options: ['要', '不要'] }, { from: 'lily', to: 'yz' })
  check('伺服器：決策卡的決定不被舊副本清掉', m.choice === '要' && m.replies.length === 1)

  // 結案不被舊副本撤銷
  m = mergeRequestPayload({ ...saved, resolvedAt: t0 + 6 * HOUR }, stale, { from: 'lily', to: 'yz' })
  check('伺服器：結案不被舊副本撤銷', m.resolvedAt === t0 + 6 * HOUR)

  // 延後理由與輕推都是累加的
  m = mergeRequestPayload(
    { ...saved, deferReason: '等報價', deferredAt: t0 + 2 * HOUR, nudges: [{ at: t0 + HOUR }] },
    { ...stale, nudges: [{ at: t0 + 7 * HOUR }] },
    { from: 'lily', to: 'yz' },
  )
  check('伺服器：延後理由保留', m.deferReason === '等報價')
  check('伺服器：輕推紀錄累加不互蓋', m.nudges.length === 2, String(m.nudges.length))

  // 第一次寫入（沒有既有列）→ 原樣
  m = mergeRequestPayload(null, { ...saved }, { from: 'lily', to: 'yz' })
  check('伺服器：新請求原樣寫入', m.replies.length === 1 && m.firstReplyAt === reply.at)

  // 「收到，晚點處理」也算回覆：舊副本不能讓它消失
  const ack = { w: 'yz', x: '收到，晚點處理', ack: true, at: t0 + 2 * HOUR, ts: '09:00' }
  m = mergeRequestPayload({ ...saved, replies: [ack], firstReplyAt: ack.at }, stale, { from: 'lily', to: 'yz' })
  check('伺服器：「收到，晚點處理」不被舊副本蓋掉', m.replies.length === 1 && m.firstReplyAt === ack.at)
}

async function main() {
  serverSide()
  await clientSide()
  console.log(`\n${checks - failed}/${checks} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
