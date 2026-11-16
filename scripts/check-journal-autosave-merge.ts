/**
 * 「日誌打的字有時候存不進去、消失，重新整理才好；回覆也會消失」的回歸檢查。
 *
 *   npx tsx scripts/check-journal-autosave-merge.ts
 *
 * 2026-11-16 回報時找到的三個成因，這支各守一個：
 *
 *   1. 打字只在當天第一個字排自動保存（jcStart() 那一下）。之後打的字只留在記憶體，
 *      要等下一次剛好有東西 render() 才會比對、送出。中文輸入法確定字是在
 *      compositionend，那裡也沒有排保存。
 *   2. 併回伺服器現況（每 15 秒輪詢、回到分頁、撞 409 後的重新對齊）只保留「佇列裡」
 *      的列。還沒排進佇列的打字被伺服器那一份整列換掉，基準線又跟著換掉 —— 那些字
 *      永遠比不出來、永遠不會被保存。而 store 是一次較慢的請求，「哪些列保留本地」
 *      卻是在請求之前算的：路上送出的回覆／日誌被較舊的快照蓋掉，畫面上消失。
 *   3. 版本號是全公司共用一個，對方每次自動保存都會讓它前進。撞 409 只重試一次，
 *      第二次就停在「有衝突，請重新整理」，而且重試次數成功前不歸零 —— 之後每一筆
 *      都直接卡住；重新整理就是把佇列裡的回覆與日誌丟掉。409 帶回來的版本號又被直接
 *      採用，這一頁從此「以為」自己有那一版的資料，輪詢再也不會把對方的變更併進來。
 *
 *   V5_RUNTIME=某一版.js npx tsx scripts/check-journal-autosave-merge.ts
 * 可以對著舊版 runtime 跑，確認這支抓得到那些回歸。
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
    'AbortController', 'AbortSignal', 'DataTransfer', 'CSS', 'DOMParser', 'XMLSerializer', 'NodeFilter',
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
  // jsdom 沒有 innerText；書寫區用它把 DOM 抄回 model。
  if (!('innerText' in dom.window.HTMLElement.prototype)) {
    Object.defineProperty(dom.window.HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement) { return this.textContent ?? '' },
      set(this: HTMLElement, v: string) { this.textContent = v },
    })
  }
}

type Change = { collection: string; id: string; op: string; after?: Record<string, unknown> }
type SentCommand = { op: string; ent: string; label: string; changes: Change[] }

/** 一個可以操控的假伺服器：版本號、409、慢的 store、對方在背景寫入。 */
const server = {
  version: 7,
  accepted: [] as SentCommand[],
  posts: 0,
  conflictsLeft: 0,
  storeDelayMs: 0,
  /** false：不檢查 baseVersion —— 用來模擬「合併的 store 還在路上時，一筆送出剛好落地」。 */
  strict: true,
  /** store 回傳的那一份（日誌是登入者自己那一本）。 */
  store: {} as Record<string, unknown>,
  /** 送出成功時呼叫：模擬伺服器把收到的列寫進 store。 */
  onAccept: null as null | ((commands: SentCommand[]) => void),
}

function installFetch() {
  const g = globalThis as unknown as Record<string, unknown>
  const json = (status: number, body: unknown) =>
    Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) })
  g.fetch = async (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST' && init.body) {
      server.posts += 1
      const payload = JSON.parse(init.body) as { baseVersion: number; commands?: SentCommand[] }
      if (server.conflictsLeft > 0) {
        server.conflictsLeft -= 1
        server.version += 1 // 對方剛好又存了一次
        return json(409, { version: server.version })
      }
      if (server.strict && payload.baseVersion !== server.version) return json(409, { version: server.version })
      const commands = payload.commands ?? []
      server.accepted.push(...commands)
      // 跟真的伺服器一樣：收下的列寫進 store，之後的合併讀得到。
      for (const change of commands.flatMap((c) => c.changes)) {
        if (change.collection !== 'journal' || change.op === 'delete') continue
        const book = (server.store.journal ??= {}) as Record<string, unknown>
        book[change.id] = JSON.parse(JSON.stringify(change.after))
      }
      server.onAccept?.(commands)
      server.version += 1
      return json(200, { version: server.version, applied: commands.map(() => 'ok'), rejected: [] })
    }
    if (String(url).includes('/store')) {
      // 快照在請求「開始」時就定下來，跟真的伺服器一樣：慢的是傳回來。
      const snapshot = { version: server.version, store: JSON.parse(JSON.stringify(server.store)) }
      if (server.storeDelayMs) await new Promise((r) => setTimeout(r, server.storeDelayMs))
      return json(200, snapshot)
    }
    return json(200, { version: server.version })
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const startRow = { id: 'DL-start', day: DAY, w: 'yz', t: '09:00', kind: 'start', text: '開始一天' }
const ownLine = (text: string) => ({ id: 'b-own', t: 'p', ind: 0, text })
const bookOf = (text: string) => ({ [DAY]: { title: DAY, visibility: 'company', blocks: [ownLine(text)] } })

const YZ: YuanzhanSeat = { email: 'yz@example.test', actor: 'yz', role: 'owner', canSwitchActor: false }

async function mount(initialText: string) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true })
  installGlobals(dom)
  installFetch()
  const { createV5State } = await import('../src/lib/ui-data/yuanzhan/v5-state')
  const mod = await import(process.env.V5_RUNTIME || '../src/components/yuanzhan/v5/runtime.js')
  const mountV5 = mod.mountV5 as (root: unknown, state: unknown) => {
    destroy(): void; navigate(wb: string, tab?: number): void
  }
  const base = {
    journal: bookOf(initialText),
    journalPeer: {},
    // 今天已經「開始一天」過了：之後打的字不會再經過 jcStart() 那一下。
    dayLogs: [startRow], todayIssues: [], lineComments: [], journalComments: [], requests: [],
  }
  server.store = JSON.parse(JSON.stringify({ journal: base.journal }))
  const state = createV5State('empty', YZ, null, 'database', base)
  const root = dom.window.document.createElement('div')
  root.className = 'v5-root'
  dom.window.document.body.appendChild(root)
  const workbench = mountV5(root, JSON.parse(JSON.stringify(state)))
  await wait(50)
  workbench.navigate('journal', 0)
  await wait(50)

  const line = () => root.querySelector('#doc .eb-tx[data-id="b-own"]') as HTMLElement | null
  return {
    dom,
    root,
    workbench,
    line,
    text: () => line()?.textContent ?? '',
    badge: () => (root.querySelector('#opSaveState') as HTMLElement | null)?.dataset.state ?? 'none',
    type(text: string) {
      const el = line()
      if (!el) throw new Error('找不到書寫區那一行')
      el.focus()
      el.textContent = text
      el.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    },
    /** 用輸入法打字：組字中的 input 被略過，確定的字在 compositionend 才寫回。 */
    typeWithIme(text: string) {
      const el = line()
      if (!el) throw new Error('找不到書寫區那一行')
      el.focus()
      el.dispatchEvent(new dom.window.Event('compositionstart', { bubbles: true }))
      el.textContent = text
      el.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
      el.dispatchEvent(new dom.window.Event('compositionend', { bubbles: true }))
    },
    returnToTab() {
      dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'))
    },
    destroy: () => workbench.destroy(),
  }
}

/** 最後一次被伺服器接受的、這一天的日誌那一行。 */
function savedText() {
  const rows = server.accepted.flatMap((c) => c.changes).filter((c) => c.collection === 'journal' && c.id === DAY)
  const after = rows.at(-1)?.after as { blocks?: { id: string; text: string }[] } | undefined
  return after?.blocks?.find((b) => b.id === 'b-own')?.text ?? null
}

function reset() {
  server.version = 7
  server.accepted = []
  server.posts = 0
  server.conflictsLeft = 0
  server.storeDelayMs = 0
  server.onAccept = null
  server.strict = true
}

async function main() {
  // ── 1. 當天已經開始過，接著打的字要自己排得到自動保存 ─────────────────────────────
  reset()
  let page = await mount('早上寫的')
  page.type('早上寫的，下午補一句')
  await wait(2000)
  check('開始一天之後打的字，停下來就自動保存', savedText() === '早上寫的，下午補一句', String(savedText()))

  page.typeWithIme('早上寫的，下午補一句，用注音打的')
  await wait(2000)
  check('輸入法確定的字也會排自動保存', savedText() === '早上寫的，下午補一句，用注音打的', String(savedText()))
  page.destroy()

  // ── 2. 打完字 1.5 秒內回到分頁、對方剛好存過：併回伺服器現況不能把字換掉 ──────────
  reset()
  page = await mount('原本的')
  page.type('原本的，剛剛打的')
  server.version += 1 // 對方在背景存了一次；store 裡這一行還是舊的
  page.returnToTab()
  await wait(2200)
  check('合併伺服器現況後，還沒保存的字還在畫面上', page.text() === '原本的，剛剛打的', page.text())
  check('那段字之後有被保存', savedText() === '原本的，剛剛打的', String(savedText()))
  page.destroy()

  // ── 3. 對方一直在寫：連撞兩次 409 也要自己送進去，不能卡在「請重新整理」 ──────────
  reset()
  page = await mount('第一版')
  server.conflictsLeft = 2
  page.type('第一版，撞了兩次版本也要存進去')
  await wait(4500)
  check('連撞兩次 409 後自動重送成功', savedText() === '第一版，撞了兩次版本也要存進去', String(savedText()))
  check('保存狀態不停在「有衝突」', page.badge() !== 'conflict', page.badge())
  // 卡過一次之後，下一筆也要照常送得出去（先前重試次數不歸零，之後每一筆都直接卡住）。
  server.conflictsLeft = 2
  page.type('第一版，撞了兩次版本也要存進去。再寫一句')
  await wait(4500)
  check('之後的編輯也照常存得進去', savedText() === '第一版，撞了兩次版本也要存進去。再寫一句', String(savedText()))
  page.destroy()

  // ── 4. store 很慢，請求還在路上時自動保存已經送出：舊快照不能把那一列蓋回去 ────────
  reset()
  page = await mount('慢網路')
  server.storeDelayMs = 2500
  server.strict = false
  server.version += 1
  page.returnToTab() // 合併開始，store 要 2.5 秒才回來（快照是現在的：還沒有下面那句）
  await wait(50)
  page.type('慢網路，合併途中打的字')
  page.line()?.blur()
  await wait(3500)
  check('合併途中送出的字，合併之後還在畫面上', page.text() === '慢網路，合併途中打的字', page.text())
  check('合併途中送出的字有存到伺服器', savedText() === '慢網路，合併途中打的字', String(savedText()))
  server.storeDelayMs = 0
  page.type('慢網路，合併途中打的字，之後再打')
  await wait(3000)
  check('合併之後繼續打字也照常保存（不用重新整理）', savedText() === '慢網路，合併途中打的字，之後再打', String(savedText()))
  page.destroy()

  console.log(`\n${checks - failed}/${checks} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
