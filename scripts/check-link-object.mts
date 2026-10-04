/**
 * 連結物件的無瀏覽器回歸檢查。
 *
 *   pnpm ops:links:check
 *
 * 驗四件事：網址辨識、空行貼上變卡片、行內網址可點與「存成物件」、
 * database 模式下連結與日誌一起被送出去。
 *
 * 副檔名是 .mts：用了 top-level await（理由同 check-project-module-ui.mts）。
 */
import { mountAll } from './operating-runtime-harness'

let pass = 0
let fail = 0
function check(label: string, ok: unknown, detail?: unknown) {
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : '   → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail))}`)
}
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms))
const text = (el: Element | null | undefined) => (el?.textContent || '').replace(/\s+/g, ' ').trim()

/**
 * jsdom 沒有 innerText（runtime 用它把書寫區同步回資料），夾具也沒有把
 * NodeFilter／InputEvent／Range 掛到 global（游標與貼上會用到）。
 */
function polyfillInnerText() {
  const g = globalThis as unknown as Record<string, unknown>
  const win = g.window as Record<string, unknown>
  for (const key of ['NodeFilter', 'InputEvent', 'Range']) if (win[key] && !g[key]) g[key] = win[key]
  const proto = (globalThis as unknown as { HTMLElement: { prototype: object } }).HTMLElement.prototype
  if (Object.getOwnPropertyDescriptor(proto, 'innerText')) return
  Object.defineProperty(proto, 'innerText', {
    configurable: true,
    get(this: HTMLElement) { return this.textContent || '' },
    set(this: HTMLElement, value: string) { this.textContent = value },
  })
}

function paste(target: HTMLElement, value: string) {
  const win = target.ownerDocument.defaultView!
  const event = new win.Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', { value: { files: [], getData: (type: string) => (type === 'text/plain' ? value : '') } })
  target.dispatchEvent(event)
  return event
}
function typeInto(target: HTMLElement, value: string) {
  const win = target.ownerDocument.defaultView!
  target.textContent = value
  target.dispatchEvent(new win.Event('input', { bubbles: true }))
}

type Snapshot = { links?: Array<Record<string, unknown>>; journal?: Record<string, { blocks: Array<Record<string, unknown>> }> }
const URL_A = 'https://drive.google.com/drive/folders/1o79kFrdUu2UixfpkgKVD21YBAF37-S5g?usp=sharing'

/* ------------------------------------------------------------------ */
/* A. 操作（showcase）                                                 */
/* ------------------------------------------------------------------ */
{
  const r = await mountAll('showcase', undefined, () => { polyfillInnerText() })
  const root = r.root
  const all = (sel: string) => Array.from(root.querySelectorAll(sel)) as HTMLElement[]
  r.workbench.navigate('journal', 0)
  await tick(10)

  const lines = () => all('#doc .eb-tx[data-id]')
  const emptyLine = () => lines().find((el) => !(el.textContent || '').trim())
  check('日誌有可以打字的空行', !!emptyLine())

  // 1. 空行貼上一個網址 → 卡片
  const e1 = paste(emptyLine()!, URL_A)
  await tick(20)
  const snap1 = r.workbench.snapshot() as Snapshot
  const link = (snap1.links || [])[0]
  check('空行貼上網址：預設的貼上被接管', e1.defaultPrevented)
  check('空行貼上網址：多一筆連結物件', (snap1.links || []).length === 1 && link?.url === URL_A, link?.url)
  check('連結物件有參考碼', typeof link?.id === 'string' && String(link.id).startsWith('LNK-'), link?.id)
  check('依網域自動命名', link?.title === 'Google Drive 資料夾' && link?.titleAuto === true, link?.title)
  const card = all('#doc .lk-card')[0]
  check('日誌出現連結卡片', !!card && text(card).includes('Google Drive 資料夾'))
  check('卡片後面留了一行可以繼續打字', !!emptyLine())

  // 2. 不是 http(s) 的東西不轉
  // 沒被接管的貼上交給既有的純文字貼上（它自己也會 preventDefault，所以不能用那個判斷）。
  // 這裡看的是結果：沒有多出連結物件、也沒有多出卡片。
  const before = all('#doc .lk-card').length
  const line = emptyLine()!
  const lineId = line.dataset.id!
  const sameLine = () => root.querySelector(`.eb[data-id="${lineId}"] .eb-tx`) as HTMLElement
  paste(line, 'javascript:alert(1)')
  await tick(10)
  check('javascript: 不會被當成連結', all('#doc .lk-card').length === before && (r.workbench.snapshot() as Snapshot).links!.length === 1)
  typeInto(sameLine(), '')
  paste(sameLine(), '看這個 https://example.com 然後回我')
  await tick(10)
  check('一段話裡夾著網址：照常貼成文字', all('#doc .lk-card').length === before && (r.workbench.snapshot() as Snapshot).links!.length === 1)
  typeInto(sameLine(), '這一行已經有字')
  paste(sameLine(), URL_A)
  await tick(10)
  check('有字的行貼上網址：照常貼成文字，句子不被拆開', all('#doc .lk-card').length === before && (r.workbench.snapshot() as Snapshot).links!.length === 1)

  // 3. 行內網址 → 可點的連結
  typeInto(line, '教學影片放在這裡 https://example.com/a(b)/c?x=1&y=2。')
  await tick(10)
  const chip = root.querySelector(`.eb[data-id="${lineId}"] .eb-links a`) as HTMLAnchorElement | null
  check('行內網址底下出現連結', !!chip)
  check('連結的 href 是完整網址（含 & 與括號，不含句尾標點）', chip?.getAttribute('href') === 'https://example.com/a(b)/c?x=1&y=2', chip?.getAttribute('href'))
  check('連結另開分頁且不帶 opener', chip?.getAttribute('target') === '_blank' && /noopener/.test(chip?.getAttribute('rel') || ''))
  check('書寫區的文字沒有被改動', line.textContent === '教學影片放在這裡 https://example.com/a(b)/c?x=1&y=2。')

  // 4. 存成物件
  const promote = root.querySelector(`.eb[data-id="${lineId}"] .eb-links button`) as HTMLElement | null
  promote?.click()
  await tick(20)
  const snap2 = r.workbench.snapshot() as Snapshot
  const second = (snap2.links || []).find((l) => l.url === 'https://example.com/a(b)/c?x=1&y=2')
  check('存成物件：多一筆連結物件', (snap2.links || []).length === 2 && !!second)
  const left = text(sameLine())
  check('存成物件：那一行留下文字、拿掉網址', /教學影片放在這裡/.test(left) && !/https?:/.test(left), left)
  check('存成物件：日誌多一張卡片', all('#doc .lk-card').length === before + 1)

  // 5. 物件索引
  const tab = all('#tabs .tab').find((el) => text(el).includes('物件索引'))
  tab?.click()
  await tick(20)
  check('物件索引列出連結', /Google Drive 資料夾/.test(text(root.querySelector('#inner'))) && /連結/.test(text(root.querySelector('#inner'))))

  check('全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* B. database 模式：連結與日誌一起送出                                */
/* ------------------------------------------------------------------ */
{
  type Change = { collection: string; id: string; op: string; after?: Record<string, unknown> }
  const sent: Change[] = []
  let version = 3
  const g = globalThis as unknown as Record<string, unknown>
  const realFetch = g.fetch
  g.fetch = async (_url: unknown, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST' && init.body) {
      const body = JSON.parse(init.body) as { commands: Array<{ clientRef: string; changes: Change[] }> }
      body.commands.forEach((c) => sent.push(...c.changes))
      version += 1
      return { ok: true, status: 200, json: async () => ({ version, applied: body.commands.map((c) => c.clientRef), rejected: [] }) }
    }
    return { ok: true, status: 200, json: async () => ({ version }) }
  }

  const r = await mountAll('empty', undefined, (state) => {
    polyfillInnerText()
    state.dataSource = 'database'
  })
  const root = r.root
  r.workbench.navigate('journal', 0)
  await tick(30)
  const line = (Array.from(root.querySelectorAll('#doc .eb-tx[data-id]')) as HTMLElement[]).find((el) => !(el.textContent || '').trim())
  check('database · 空日誌有一行可以貼', !!line)
  paste(line!, URL_A)
  // 日誌是延遲保存（停下來 1.5 秒才送）。
  await tick(1900)
  const links = sent.filter((c) => c.collection === 'links')
  const journal = sent.filter((c) => c.collection === 'journal')
  check('links · 送出一筆 create', links.length === 1 && links[0].op === 'create', links.map((c) => c.op))
  check('links · 帶 url／title／space／author／day', !!links[0] && links[0].after?.url === URL_A && !!links[0].after?.title && !!links[0].after?.space && !!links[0].after?.author && /^\d{4}-\d{2}-\d{2}$/.test(String(links[0].after?.day)))
  const blocks = ((journal[journal.length - 1]?.after as { blocks?: Array<{ t: string; obj?: { ty: string; rid: string } }> })?.blocks) || []
  check('journal · 那一行存成指向連結物件的區塊', blocks.some((b) => b.t === 'obj' && b.obj?.ty === 'link' && b.obj?.rid === links[0]?.id))
  check('database · 沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
  g.fetch = realFetch
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
