/**
 * 議題頁（抽屜）的無瀏覽器回歸檢查。
 *
 *   pnpm ops:agenda-page:check
 *
 * 守的是一條使用者講得出來的線：在議題頁上做的事，要在議題頁上看得到。
 *   1. 討論區按「送出」或 Enter：那一則出現在這一頁、輸入框清空、游標留在輸入框。
 *   2. 改到期日、延期：欄位與狀態跟著換。
 *   3. 指派／收回指派：這一頁的稱呼（任務／議題）跟著換，討論不會不見。
 *
 * commit() 的 render() 只重畫工作台；獨立頁面是另一棵 DOM，不補畫就會停在舊的 ——
 * 資料其實寫進去了，但看起來像沒送出去（2026-10-12 owner 回報）。
 *
 * 可以給另一份 runtime 的路徑當參數（對舊版跑一次，確認這份檢查抓得到問題）。
 *
 * 手機瀏覽器（WebKit）的游標行為 jsdom 模擬不了，那一條由 scripts/verify-journal-engines.mjs
 * 在真的引擎上跑。
 *
 * 副檔名是 .mts：用了 top-level await（理由同 check-link-object.mts）。
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

/** jsdom 缺的幾樣：innerText、Range 的版面量測、捲動。 */
function polyfill() {
  const g = globalThis as unknown as Record<string, unknown>
  const win = g.window as Record<string, unknown>
  for (const key of ['NodeFilter', 'InputEvent', 'Range']) if (win[key] && !g[key]) g[key] = win[key]
  g.innerHeight = 900
  g.innerWidth = 1400
  const range = (win.Range as { prototype: Record<string, unknown> }).prototype
  if (!range.getBoundingClientRect) range.getBoundingClientRect = () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 })
  ;((win.Element as { prototype: Record<string, unknown> }).prototype).scrollIntoView = function () {}
  const proto = (globalThis as unknown as { HTMLElement: { prototype: object } }).HTMLElement.prototype
  if (Object.getOwnPropertyDescriptor(proto, 'innerText')) return
  Object.defineProperty(proto, 'innerText', {
    configurable: true,
    get(this: HTMLElement) { return this.textContent || '' },
    set(this: HTMLElement, value: string) { this.textContent = value },
  })
}

function typeInto(target: HTMLElement, value: string) {
  const doc = target.ownerDocument
  const win = doc.defaultView!
  target.dispatchEvent(new win.Event('focusin', { bubbles: true }))
  target.textContent = value
  const range = doc.createRange()
  range.selectNodeContents(target)
  range.collapse(false)
  const sel = doc.getSelection()!
  sel.removeAllRanges()
  sel.addRange(range)
  target.dispatchEvent(new win.Event('input', { bubbles: true }))
}
function press(target: HTMLElement, key: string) {
  const win = target.ownerDocument.defaultView!
  target.dispatchEvent(new win.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}
/** 在 <input> 裡打字：改值、送 input，等於使用者打完或貼上這串字。 */
function fill(input: HTMLInputElement, value: string) {
  const win = input.ownerDocument.defaultView!
  input.focus()
  input.value = value
  input.dispatchEvent(new win.Event('input', { bubbles: true }))
}

{
  const r = await mountAll('showcase', process.argv[2] || undefined, () => { polyfill() })
  const root = r.root
  const all = (sel: string) => Array.from(root.querySelectorAll(sel)) as HTMLElement[]
  const one = (sel: string) => root.querySelector(sel) as HTMLElement | null
  r.workbench.navigate('journal', 0)
  await tick(10)

  // 建一張任務：空行打「… !」→ 選單第三項「建立任務」
  const line = all('#doc > .eb > .eb-tx[data-id]').find((el) => !(el.textContent || '').trim())!
  typeInto(line, '簽署合作文件 !')
  await tick(10)
  const items = all('#summonList .summon-i')
  const task = items.find((el) => text(el).includes('建立任務'))
  check('「!」選單有「建立任務」', !!task, items.map(text))
  task?.click()
  await tick(20)
  const card = one('#doc .ag-card')
  const id = card?.dataset.docId || ''
  check('日誌裡長出任務卡片', !!id, id)

  // 打開議題頁
  ;(card?.querySelector('.eb-doc-icon-btn') as HTMLElement | null)?.click()
  await tick(20)
  const pageInput = () => one('#drBody [data-ag-input]') as HTMLInputElement | null
  const head = () => text(one('#drBody .ag-thread .ag-sec-t'))
  const msgs = () => all('#drBody .ag-thread .rq-msg-x').map(text)
  const field = (n: number) => text(one(`#drBody .ag-fields .ag-f:nth-child(${n}) .v`))
  check('議題頁打開，討論是空的', one('#drawer')?.classList.contains('on') && head() === '討論 · 0' && !!pageInput(), head())
  check('狀態是待辦', field(5) === '待辦', field(5))

  // 1. 送出鈕
  fill(pageInput()!, '目前已送出，可以看一下信箱')
  ;(one('#drBody .ag-compose .btn.pri') as HTMLElement).click()
  await tick(20)
  check('按送出：這一則出現在議題頁上', head() === '討論 · 1' && msgs()[0] === '目前已送出，可以看一下信箱', [head(), msgs()])
  check('輸入框清空', pageInput()?.value === '', pageInput()?.value)
  check('游標留在議題頁的輸入框（不是背後那張卡片的）', root.ownerDocument.activeElement === pageInput())
  check('狀態跟著變成進行中', field(5) === '進行中', field(5))
  check('背後的日誌卡片是同一份資料', text(one('#inner .ag-thread .ag-sec-t')) === '討論 · 1')

  // 1b. Enter
  fill(pageInput()!, '第二則')
  press(pageInput()!, 'Enter')
  await tick(20)
  check('按 Enter 也送得出去', head() === '討論 · 2' && msgs()[1] === '第二則' && pageInput()?.value === '', [head(), msgs()])

  // 1c. 空的不送
  ;(one('#drBody .ag-compose .btn.pri') as HTMLElement).click()
  await tick(20)
  check('沒寫字按送出：不會多一則', head() === '討論 · 2', head())

  // 2. 到期日與延期
  const dueBtn = (label: string) => all('#drBody .ag-due .btn').find((b) => text(b) === label)
  check('還沒有到期日時沒有「清除」', !dueBtn('清除'))
  dueBtn('明天')?.click()
  await tick(20)
  const due = (one('#drBody .ag-date') as HTMLInputElement | null)?.value || ''
  check('按「明天」：到期日填上，而且多出「清除」', /^\d{4}-\d{2}-\d{2}$/.test(due) && !!dueBtn('清除'), due)
  check('帶過還是 0 次', field(4) === '沒有延期過', field(4))
  all('#drFoot .btn').find((b) => text(b) === '延到明天')?.click()
  await tick(20)
  check('按「延到明天」：帶過變成 1 次', field(4).startsWith('1 次'), field(4))
  check('改到期日與延期都不會把討論洗掉', head() === '討論 · 2' && msgs().length === 2, [head(), msgs()])

  // 3. 指派
  check('有負責人時這一頁叫任務', text(one('#crumb')).includes('任務'), text(one('#crumb')))
  dueBtn('收回指派')?.click()
  await tick(20)
  check('收回指派：這一頁改叫議題', text(one('#crumb')).includes('議題') && field(5).includes('尚未指派'), [text(one('#crumb')), field(5)])
  check('收回指派之後討論還在', head() === '討論 · 2' && msgs().length === 2, [head(), msgs()])

  // 卡片上（沒開議題頁）送出仍然照舊
  ;(one('#drawer button[title^="關閉"]') as HTMLElement | null)?.click()
  await tick(20)
  const cardInput = one('#inner [data-ag-input]') as HTMLInputElement | null
  fill(cardInput!, '卡片上的第三則')
  press(one('#inner [data-ag-input]')!, 'Enter')
  await tick(20)
  check('關掉議題頁，在日誌卡片上送出照常運作', text(one('#inner .ag-thread .ag-sec-t')) === '討論 · 3' && root.ownerDocument.activeElement === one('#inner [data-ag-input]'), text(one('#inner .ag-thread .ag-sec-t')))

  check('沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
