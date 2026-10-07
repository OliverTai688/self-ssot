/**
 * 稽核軌跡的回歸檢查：抽屜讀的是伺服器、命令帶著「改了什麼」、留言不再夾帶帳務。
 *
 *   npx tsx scripts/check-audit-trail.ts
 *
 * 守的是三條使用者講得出來的線：
 *   1. **稽核軌跡重新整理之後還在，而且看得到另一個人做了什麼。**
 *      抽屜原本讀瀏覽器記憶體裡的 DB.audit：重整就清空、只有自己這一頁做的事。
 *      伺服器的命令紀錄（operating_command_logs）每一筆都有留，只是沒有人讀。
 *   2. **稽核上看得到「改了什麼」，留言看得出是留在哪一行。**
 *      那一句只存在前端；命令送上去時沒有帶，行內留言的名稱在物件段落裡還是空的。
 *   3. **留一則言不會被記成「動了帳務」。**
 *      commit() 會順手替列補上衍生欄位（作者、ledgerRow、formulaError）。基準線若在
 *      補齊之前取，那些欄位就被比成變更、跟著留言一起送出去 —— 內容沒變，但命令紀錄
 *      上那筆留言從此是「txns · 高風險」。2026-10-07 之前正式站有 29 筆這樣的紀錄。
 *
 * 與 check-decision-reply 同一套掛法：database 模式整段掛起來，真的去點、去打字，
 * 然後看送出去的東西與畫面。
 *
 *   V5_RUNTIME=../某一版.js npx tsx scripts/check-audit-trail.ts
 *
 * 可以對著任意一版 runtime 跑（例如 git show 出來的舊版），確認這支真的抓得到回歸。
 */
import { JSDOM } from 'jsdom'

import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'
import { cleanAuditText, MAX_COMMAND_DETAIL } from '../src/lib/ui-data/yuanzhan/operating-commands'
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

/** jsdom 沒有的瀏覽器全域，補到剛好夠 runtime 跑起來為止（與 check-decision-reply 同一套）。 */
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
type SentCommand = { op: string; ent: string; label: string; detail?: string; changes: Change[] }
const sent: SentCommand[] = []

type AuditRow = {
  id: string; at: string; actor: string; op: string; entity: string; label: string
  detail: string; collections: string[]; changeCount: number; riskLevel: string
}

/** 伺服器替身：版本號、讀得回來的 store，以及稽核 API 回的東西。 */
const remote: {
  version: number
  store: Record<string, unknown> | null
  audit: (url: URL) => { status: number; body: unknown }
  auditCalls: string[]
} = {
  version: 0,
  store: null,
  audit: () => ({ status: 200, body: { rows: [], total: 0, autosaveTotal: 0, nextBefore: null } }),
  auditCalls: [],
}

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
    if (String(url).includes('/operating/audit')) {
      remote.auditCalls.push(String(url))
      const { status, body } = remote.audit(new URL(String(url), 'http://local.test'))
      return Promise.resolve({ ok: status === 200, status, json: () => Promise.resolve(body) })
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

type Mounted = {
  root: HTMLElement
  /** 另一個席位寫了東西之後，這一頁回到前景：版本落後 → 把伺服器現況併回來。 */
  peerWrote(store: Record<string, unknown>): Promise<void>
  destroy(): void
  find(selector: string): HTMLElement | null
  text(selector: string): string
  click(el: HTMLElement | null | undefined): Promise<void>
  /** 點對方那一行 → 打字 → 送出，與使用者留行內留言的動作相同。 */
  commentOn(blockId: string, text: string): Promise<boolean>
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
  const click = async (el: HTMLElement | null | undefined) => { el?.click(); await tick() }
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
    click,
    commentOn: async (blockId, text) => {
      await click(root.querySelector(`[data-jc-bid="${blockId}"]`) as HTMLElement | null)
      const input = root.querySelector('[data-jc-input]') as HTMLInputElement | null
      if (!input) return false
      input.value = text
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
      await click(input.parentElement?.querySelector('button.pri') as HTMLElement | null)
      return true
    },
  }
}

const YZ: YuanzhanSeat = { email: 'yz@example.test', actor: 'yz', role: 'owner', canSwitchActor: false }
const LILY: YuanzhanSeat = { email: 'lily@example.test', actor: 'lily', role: 'member', canSwitchActor: false }

const bookOf = (blocks: unknown[]) => ({ [DAY]: { title: DAY, visibility: 'company', blocks } })
const ownLine = { id: 'b-own', t: 'p', ind: 0, text: '今天自己寫的一行' }
const peerLine = { id: 'b-peer', t: 'p', ind: 0, text: '區老師 google form 串接' }
/** 嵌在對方日誌裡的文件物件（Standup、任務…）；留言的那一行在它的段落裡，不在日誌的行裡。 */
const docLine = { id: 'b-doc', t: 'p', ind: 0, text: '圓頭音樂行銷會前材料' }
const taskDoc = {
  id: 'DOC-task', kind: 'agenda', day: DAY, author: 'lily', title: '任務', titleAuto: false,
  secs: [{ title: '內文', text: '', blocks: [docLine] }],
}
const cardLine = { id: 'b-card', t: 'obj', ind: 0, text: '', obj: { ty: 'doc_object', rid: 'DOC-task' } }

/**
 * 伺服器讀回來的列：沒有 author、沒有 ledgerRow、沒有 formulaError —— 那些是 runtime 自己補的。
 * 有公式的那一筆是關鍵：recalcLedger() 會替它寫上 formulaError: null。
 */
const serverTxns = () => [
  { id: 'TXN-plain', d: DAY, t: '一般支出', p: '', cat: '', amt: -1200, pass: false, v: [], files: [], note: '' },
  { id: 'TXN-formula', d: DAY, t: '有公式的一筆', p: '', cat: '', amt: 300, formula: '=100*3', pass: false, v: [], files: [], note: '' },
]
const serverProjects = () => [
  { id: 'PRJ-A', t: '專案 A', client: '', goal: '', type: '', owner: 'yz', status: '進行中', rate: 0, cap: 0, budget: 0, repo: '—', start: '—', delivery: [] },
  { id: 'PRJ-B', t: '專案 B', client: '', goal: '', type: '', owner: 'lily', status: '進行中', rate: 0, cap: 0, budget: 0, repo: '—', start: '—', delivery: [] },
]
const fullStore = () => ({
  journal: bookOf([ownLine]),
  journalPeer: bookOf([peerLine, cardLine]),
  docObjects: [JSON.parse(JSON.stringify(taskDoc))],
  txns: serverTxns(),
  projects: serverProjects(),
})

const collectionsOf = (commands: SentCommand[]) => [...new Set(commands.flatMap((c) => c.changes.map((x) => x.collection)))]
const summary = (commands: SentCommand[]) =>
  commands.map((c) => `${c.ent}〔${[...new Set(c.changes.map((x) => x.collection))].join(',')}〕`).join('、') || '（沒有送出任何命令）'

function auditRow(over: Partial<AuditRow>): AuditRow {
  return {
    id: 'A-' + Math.random().toString(36).slice(2), at: '2026-10-07T13:13:24.854Z', actor: 'yz', op: 'update',
    entity: '決策回覆', label: '他想行銷的東西主要是什麼？', detail: '', collections: ['requests'], changeCount: 1, riskLevel: 'low',
    ...over,
  }
}

/** 這台機器的當地時間，與抽屜的格式相同。寫死字串的話換一個時區跑就會紅。 */
function localStamp(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

async function main() {
  // ── 純函式：進資料庫之前的最後一道 ─────────────────────────────────────
  check('稽核文字壓成單行，使用者打的 < > 原樣留著', cleanAuditText('預算 <100 萬\n  且 >50 萬\t核准', 280) === '預算 <100 萬 且 >50 萬 核准')
  check('稽核文字超長會截斷並標示', cleanAuditText('字'.repeat(400), MAX_COMMAND_DETAIL).length === MAX_COMMAND_DETAIL && cleanAuditText('字'.repeat(400), MAX_COMMAND_DETAIL).endsWith('…'))
  check('不是字串就當作沒有', cleanAuditText(undefined, 280) === '' && cleanAuditText({ a: 1 }, 280) === '')

  // ── 留言不夾帶帳務：載入後的第一筆 commit ───────────────────────────────
  const m = await mount(YZ, fullStore())
  await settle()
  check(
    '載入後什麼都沒做，不會送出任何命令',
    sent.length === 0,
    summary(sent),
  )
  sent.length = 0

  const opened = await m.commentOn('b-peer', '感覺很讚！')
  check('點對方那一行可以留言', opened)
  await settle()
  const first = sent.find((c) => c.ent === '行內留言')
  check('行內留言有送去保存', !!first, summary(sent))
  // 同一個動作還會在今日脈絡留一筆（dayLogs），那是另一筆命令，本來就該有。
  check('載入後第一則留言只動留言', JSON.stringify(collectionsOf(first ? [first] : [])) === JSON.stringify(['lineComments']), summary(sent))
  check('載入後第一則留言沒有夾帶交易或專案', !collectionsOf(sent).some((c) => c === 'txns' || c === 'projects'), summary(sent))
  check('留言的命令帶著「改了什麼」', (first?.detail || '').includes('感覺很讚！') && (first?.detail || '').includes('Lily'), first?.detail || '（無）')
  check('留言的名稱是那一行的文字', first?.label === peerLine.text.slice(0, 24), first?.label || '（空）')

  // ── 併回伺服器現況之後的第一筆 commit（專案作者會被重蓋的那個時機）────────
  await m.peerWrote({ ...fullStore(), lineComments: sent.flatMap((c) => c.changes).filter((c) => c.collection === 'lineComments').map((c) => c.after) })
  sent.length = 0
  await m.commentOn('b-doc', '這段 <b>可以</b> & 再補一點')
  await settle()
  const second = sent.find((c) => c.ent === '行內留言')
  check('併回現況後的留言有送去保存', !!second, summary(sent))
  check('併回現況後的留言一樣只動留言', JSON.stringify(collectionsOf(second ? [second] : [])) === JSON.stringify(['lineComments']), summary(sent))
  check('併回現況後的留言沒有夾帶交易或專案', !collectionsOf(sent).some((c) => c === 'txns' || c === 'projects'), summary(sent))
  check('留在物件段落裡的那一行，名稱不再是空的', second?.label === docLine.text.slice(0, 24), second?.label || '（空）')
  check(
    '使用者打的 < > & 原樣進稽核，不是被吃掉也不是變成實體',
    (second?.detail || '').endsWith('這段 <b>可以</b> & 再補一點'),
    second?.detail || '（無）',
  )

  // ── 真的改帳務時，命令裡要有 txns（不能為了不夾帶而把它濾掉）──────────────
  // 這一條由 check-cashflow-faces / check-contract-cashflow 守；這裡只確認基準線
  // 沒有把衍生欄位以外的東西一起吞掉：自動保存不會在事後補送一筆 txns。
  sent.length = 0
  await settle()
  check('之後的自動保存不會補送交易或專案', !collectionsOf(sent).some((c) => c === 'txns' || c === 'projects'), summary(sent))

  // ── 抽屜讀伺服器 ───────────────────────────────────────────────────────
  const older = auditRow({ id: 'A-old', at: '2026-10-07T05:02:32.997Z', actor: 'lily', op: 'create', entity: '行內留言', label: '', detail: '', collections: ['lineComments'] })
  const newer = auditRow({ id: 'A-new', detail: '決定：課程（FB上的資訊）' })
  const autosaveRow = auditRow({ id: 'A-auto', at: '2026-10-07T13:13:26.965Z', entity: '日誌', label: '自動保存', collections: ['dayLogs'] })
  remote.audit = (url) => {
    const withAutosave = url.searchParams.get('autosave') === '1'
    if (url.searchParams.get('before')) {
      return { status: 200, body: { rows: [older], total: 2, autosaveTotal: 1, nextBefore: null } }
    }
    return {
      status: 200,
      body: withAutosave
        ? { rows: [autosaveRow, newer], total: 3, autosaveTotal: 1, nextBefore: newer.at }
        : { rows: [newer], total: 2, autosaveTotal: 1, nextBefore: newer.at },
    }
  }
  remote.auditCalls.length = 0
  await m.click(m.find('#auditBtn'))
  await tick()
  check('開稽核抽屜會去問伺服器', remote.auditCalls.length === 1 && !remote.auditCalls[0].includes('autosave'), remote.auditCalls.join(' | '))
  const drawer = () => m.text('#drBody')
  check('抽屜顯示的是伺服器上的紀錄，不是這一頁剛做的事', drawer().includes('決定：課程（FB上的資訊）') && !drawer().includes('感覺很讚！'), drawer().slice(0, 160))
  check('筆數來自伺服器', drawer().includes('2 筆 · 不可刪除'), drawer().slice(0, 60))
  check('時間顯示成當地時間', drawer().includes(localStamp(newer.at)), `${localStamp(newer.at)} ｜ ${drawer().slice(0, 200)}`)
  check('自動保存預設收起，但說得出有幾筆', drawer().includes('另有 1 筆日誌自動保存') && !drawer().includes('自動保存 更新'), drawer().slice(0, 80))

  const moreBtn = Array.from(m.root.querySelectorAll('#drBody button')).find((b) => (b.textContent || '').includes('載入更早的紀錄')) as HTMLElement | undefined
  check('還有更舊的紀錄時有「載入更早的紀錄」', !!moreBtn)
  await m.click(moreBtn)
  await tick()
  check('往下取時帶著游標', remote.auditCalls.at(-1)?.includes('before=' + encodeURIComponent(newer.at)) === true, remote.auditCalls.at(-1) || '')
  check('看得到另一個席位（Lily）的操作', drawer().includes('Lily') && drawer().includes('行內留言'), drawer().slice(0, 240))
  check('舊紀錄沒有「改了什麼」時顯示動作，不留空也不編內容', drawer().includes('新增'), drawer().slice(-120))
  check('取完之後不再有「載入更早的紀錄」', !drawer().includes('載入更早的紀錄'))

  const toggle = Array.from(m.root.querySelectorAll('#drBody button')).find((b) => (b.textContent || '').includes('顯示自動保存')) as HTMLElement | undefined
  await m.click(toggle)
  await tick()
  check('「顯示自動保存」會重新向伺服器取', remote.auditCalls.at(-1)?.includes('autosave=1') === true, remote.auditCalls.at(-1) || '')
  check('打開後看得到自動保存那一列', drawer().includes('自動保存') && drawer().includes('3 筆 · 不可刪除'), drawer().slice(0, 120))

  // 伺服器回錯誤：說出來並給重試，不要退回去顯示記憶體那一份假裝沒事。
  remote.audit = () => ({ status: 500, body: { error: '稽核紀錄讀取失敗。' } })
  await m.click(m.find('#auditBtn'))
  await tick()
  check('讀取失敗時說得出來並可重試', drawer().includes('稽核紀錄讀取失敗') && drawer().includes('重試'), drawer().slice(0, 120))
  check('讀取失敗時不拿這一頁的記憶體頂替', !drawer().includes('感覺很讚！'))
  check('頁尾不再宣稱一個做不到的事', m.text('#drFoot').includes('存在伺服器上'), m.text('#drFoot').slice(0, 80))
  m.destroy()

  // ── 員工：沒有入口，也不會去打 API ──────────────────────────────────────
  remote.auditCalls.length = 0
  const member = await mount(LILY, { journal: bookOf([peerLine]), journalPeer: bookOf([ownLine]) })
  await member.click(member.find('#auditBtn'))
  await tick()
  check('員工點稽核不會向伺服器取資料', remote.auditCalls.length === 0, remote.auditCalls.join(' | '))
  check('員工看不到稽核抽屜', !member.find('#drawer.on'))
  member.destroy()

  console.log(`\n${checks - failed}/${checks} passed`)
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
