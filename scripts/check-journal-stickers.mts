/**
 * 日誌貼紙（/done 完成章）的無瀏覽器回歸檢查。
 *
 *   pnpm ops:stickers:check
 *
 * 守的是使用者講得出來的四條線：
 *   1. 在一行裡打 /done，那幾個字會換成一個完成章蓋在那一行上（選單 ↵，或打完按一下空白）。
 *   2. 網址、日期、路徑裡的斜線不會誤觸。
 *   3. 蓋了章的那一行會被記下來：右側「完成的小事」、物件卡片標題列的計數。
 *   4. 重新整理之後章還在，對方那一頭也看得到（章跟著 blocks 一起保存）。
 *   5. /doing 貼上進行中；它不算完成，做完在同一行打 /done 直接換成完成章。
 *   6. 右側「正在做的事」列出還貼著進行中的行，前幾天留下來的一路帶到今天。
 *
 * 副檔名是 .mts：用了 top-level await（理由同 check-link-object.mts）。
 */
import type { YuanzhanSeat } from '../src/lib/auth/yuanzhan-actor'
import { createV5State, operatingToday } from '../src/lib/ui-data/yuanzhan/v5-state'
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
const SRC = '/stickers/done.svg'
const DOING = '/stickers/doing.svg'

/**
 * jsdom 沒有 innerText（runtime 用它把書寫區同步回資料）、Range 沒有 getBoundingClientRect
 * （選單要定位在游標旁邊），夾具也沒有把 NodeFilter／Range 與視窗尺寸掛到 global。
 */
function polyfill() {
  const g = globalThis as unknown as Record<string, unknown>
  const win = g.window as Record<string, unknown>
  for (const key of ['NodeFilter', 'InputEvent', 'Range']) if (win[key] && !g[key]) g[key] = win[key]
  g.innerHeight = 900
  g.innerWidth = 1400
  const range = (win.Range as { prototype: Record<string, unknown> }).prototype
  if (!range.getBoundingClientRect) range.getBoundingClientRect = () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 })
  // 點右側的一列會把那一行捲進畫面；jsdom 沒有版面，也就沒有這支。
  ;((win.Element as { prototype: Record<string, unknown> }).prototype).scrollIntoView = function () {}
  const proto = (globalThis as unknown as { HTMLElement: { prototype: object } }).HTMLElement.prototype
  if (Object.getOwnPropertyDescriptor(proto, 'innerText')) return
  Object.defineProperty(proto, 'innerText', {
    configurable: true,
    get(this: HTMLElement) { return this.textContent || '' },
    set(this: HTMLElement, value: string) { this.textContent = value },
  })
}

/** 把字放進那一行、游標放到行尾、送出 input —— 等於使用者剛打完這串字。 */
function typeInto(target: HTMLElement, value: string) {
  const doc = target.ownerDocument
  const win = doc.defaultView!
  // 物件段落要先拿到焦點，區塊引擎才會把編輯指到那個段落的 blocks。
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

type Block = { id: string; t: string; text?: string; stk?: { k: string; at: number; by: string }; obj?: { ty: string; rid: string } }

/* ------------------------------------------------------------------ */
/* A. 操作（showcase）                                                 */
/* ------------------------------------------------------------------ */
{
  const r = await mountAll('showcase', undefined, () => { polyfill() })
  const root = r.root
  const all = (sel: string) => Array.from(root.querySelectorAll(sel)) as HTMLElement[]
  r.workbench.navigate('journal', 0)
  await tick(10)

  const emptyLine = () => all('#doc > .eb > .eb-tx[data-id]').find((el) => !(el.textContent || '').trim())
  const lineOf = (id: string) => root.querySelector(`#doc .eb[data-id="${id}"] .eb-tx`) as HTMLElement
  const rowOf = (id: string) => root.querySelector(`#doc .eb[data-id="${id}"]`) as HTMLElement
  const menuOpen = () => !!root.querySelector('#summon.on')
  const doneRows = () => all('#stkDone .stk-row')

  check('日誌有可以打字的空行', !!emptyLine())
  check('還沒蓋章時，右側「完成的小事」是空的', !!root.querySelector('#stkDone') && doneRows().length === 0, text(root.querySelector('#stkDone')))

  // 1. /done → 選單 → ↵
  const first = emptyLine()!
  const id1 = first.dataset.id!
  typeInto(first, '整理專案資料 /done')
  await tick(10)
  const item = root.querySelector('#summonList .summon-i')
  check('打 /done：跳出貼紙選單', menuOpen() && all('#summonList .summon-i').length === 1, text(root.querySelector('#summonList')))
  check('選單那一列是貼紙本人，右邊寫 /done', item?.querySelector('img')?.getAttribute('src') === SRC && text(item?.querySelector('.kb')) === '/done')
  press(lineOf(id1), 'Enter')
  await tick(20)
  const stamp1 = rowOf(id1)?.querySelector('button.stk img')
  check('按 ↵：那一行蓋上完成章', rowOf(id1)?.classList.contains('stk-on') && stamp1?.getAttribute('src') === SRC)
  check('/done 這幾個字從那一行拿掉了', text(lineOf(id1)) === '整理專案資料', text(lineOf(id1)))
  const tip = rowOf(id1)?.querySelector('button.stk')?.getAttribute('title') || ''
  check('滑過去看得到誰在何時蓋的', /^完成 · \S+ \d\d:\d\d/.test(tip), tip)
  check('選單收起來了', !menuOpen())
  check('右側「完成的小事」記下這一行', doneRows().length === 1 && text(doneRows()[0]).includes('整理專案資料'), text(root.querySelector('#stkDone')))

  // 2. 在蓋了章的行尾按 Enter：新的一行不帶章
  typeInto(lineOf(id1), '整理專案資料')
  press(lineOf(id1), 'Enter')
  await tick(20)
  const second = emptyLine()!
  const id2 = second.dataset.id!
  check('換行之後，新的一行沒有章、原本那一行還在', id2 !== id1 && !rowOf(id2).querySelector('.stk') && !!rowOf(id1).querySelector('.stk'))

  // 3. 打完整個名字再按空白：不必等選單
  typeInto(second, '回覆客戶報價 /done ')
  await tick(20)
  check('/done 加一個空白：直接蓋章', !!rowOf(id2).querySelector('button.stk') && text(lineOf(id2)) === '回覆客戶報價', text(lineOf(id2)))
  check('右側累計到 2 件', doneRows().length === 2 && text(root.querySelector('#stkDone .stk-sec-t b')) === '2')

  // 4. 不該誤觸的斜線
  press(lineOf(id2), 'Enter')
  await tick(20)
  const third = emptyLine()!
  const id3 = third.dataset.id!
  for (const [label, value] of [
    ['網址裡的 /done', '文件在 https://example.com/done '],
    ['日期 10/7', '10/7 '],
    ['不是貼紙的 /docs', '看 /docs '],
    ['句子中間的斜線', '好 / 不好 '],
  ]) {
    typeInto(lineOf(id3), value)
    await tick(10)
    check(`${label}：不蓋章、不留選單`, !rowOf(id3).querySelector('.stk') && !menuOpen() && lineOf(id3).textContent === value, lineOf(id3).textContent)
  }
  typeInto(lineOf(id3), '看 /d')
  await tick(10)
  check('打到 /d：選單先出現（done 的開頭）', menuOpen())
  typeInto(lineOf(id3), '看 /dx')
  await tick(10)
  check('接著打成 /dx：沒有這張貼紙，選單收掉', !menuOpen())

  // 5. 同一行再蓋一次：還是一個章
  typeInto(lineOf(id1), '整理專案資料 /done ')
  await tick(20)
  check('已經蓋過的行再打 /done：還是只有一個章，字拿掉', rowOf(id1).querySelectorAll('.stk').length === 1 && text(lineOf(id1)) === '整理專案資料')

  // 6. 空白行可以先蓋章再寫字，但不算一件完成的事
  typeInto(lineOf(id3), '/done ')
  await tick(20)
  check('空白行也蓋得上去', !!rowOf(id3).querySelector('button.stk') && text(lineOf(id3)) === '')
  check('沒寫內容的章不計入完成的小事', doneRows().length === 2, doneRows().length)

  // 7. 點一下撕掉
  ;(rowOf(id2).querySelector('button.stk') as HTMLElement).click()
  await tick(20)
  check('點貼紙：撕掉，那一行的字還在', !rowOf(id2).querySelector('.stk') && text(lineOf(id2)) === '回覆客戶報價')
  check('右側跟著少一件', doneRows().length === 1)

  // 8. 進行中：第二張貼紙。只是標註，不算完成；做完在同一行打 /done 直接換掉
  const stampSrc = (id: string) => Array.from(rowOf(id).querySelectorAll('.stk img')).map((el) => el.getAttribute('src')).join()
  typeInto(lineOf(id2), '回覆客戶報價 /d')
  await tick(10)
  const listed = all('#summonList .summon-i').map((el) => text(el.querySelector('.kb'))).join()
  check('打到 /d：選單列出完成與進行中兩張', listed === '/done,/doing', listed)
  typeInto(lineOf(id2), '回覆客戶報價 /doing ')
  await tick(20)
  check('/doing 加一個空白：那一行貼上進行中', stampSrc(id2) === DOING && text(lineOf(id2)) === '回覆客戶報價', stampSrc(id2))
  check('進行中不計入完成的小事', doneRows().length === 1, doneRows().length)
  const doingRows = () => all('#stkDoing .stk-row')
  check('右側「正在做的事」列出這一行，用的是進行中那張圖', doingRows().length === 1 && text(doingRows()[0]).includes('回覆客戶報價') && doingRows()[0].querySelector('img')?.getAttribute('src') === DOING, text(root.querySelector('#stkDoing')))
  typeInto(lineOf(id2), '回覆客戶報價 /done ')
  await tick(20)
  check('做完在同一行打 /done：進行中換成完成章，還是只有一張', stampSrc(id2) === SRC, stampSrc(id2))
  check('換成完成章之後才計入完成的小事', doneRows().length === 2, doneRows().length)
  check('同時從「正在做的事」離開', doingRows().length === 0, doingRows().length)
  typeInto(lineOf(id3), '寫提案 /進行中')
  await tick(10)
  press(lineOf(id3), 'Enter')
  await tick(20)
  check('/進行中 也認得（選單 ↵）', stampSrc(id3) === DOING && text(lineOf(id3)) === '寫提案', stampSrc(id3))

  check('全程沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
}

/* ------------------------------------------------------------------ */
/* B. database 模式：章跟著 blocks 保存、讀回、給對方看                */
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

  const DAY = operatingToday()
  const PREV = new Date(Date.parse(DAY + 'T00:00:00Z') - 86400e3).toISOString().slice(0, 10)
  const YZ: YuanzhanSeat = { email: 'yz@example.test', actor: 'yz', role: 'owner', canSwitchActor: false }
  const stk = (by: string) => ({ k: 'done', at: Date.now() - 3600e3, by })
  const bookOf = (blocks: unknown[]) => ({ [DAY]: { title: DAY, visibility: 'company', blocks } })
  const standup = {
    id: 'STANDUP-JRNL-000001-' + DAY.replace(/-/g, ''), type: 'standup', subType: 'standup', title: 'Standup', titleAuto: true,
    day: DAY, author: 'yz', collapsed: false, createdAt: Date.now(), updatedAt: Date.now(),
    secs: [
      { title: 'Yesterday', blocks: [{ id: 's-1', t: 'p', ind: 0, text: '文齡二修網站', stk: stk('yz') }] },
      { title: 'Today', blocks: [{ id: 's-2', t: 'p', ind: 0, text: '會計師需求整理' }] },
    ],
  }
  const store = {
    dayLogs: [], todayIssues: [], lineComments: [], journalComments: [],
    journal: {
      ...bookOf([
        { id: 'b-own', t: 'p', ind: 0, text: '今天自己寫的一行' },
        { id: 'b-card', t: 'obj', ind: 0, text: '', obj: { ty: 'doc_object', rid: standup.id } },
      ]),
      // 昨天寫下、到今天還沒做完的事
      [PREV]: { title: PREV, visibility: 'company', blocks: [
        { id: 'b-old', t: 'p', ind: 0, text: '寫合作提案', stk: { k: 'doing', at: Date.now() - 20 * 3600e3, by: 'yz' } },
        { id: 'b-old-done', t: 'p', ind: 0, text: '昨天做完的事', stk: { k: 'done', at: Date.now() - 21 * 3600e3, by: 'yz' } },
      ] },
    },
    journalPeer: bookOf([{ id: 'p-1', t: 'p', ind: 0, text: '會議紀錄整理、上傳', stk: stk('lily') }]),
    docObjects: [standup],
  }

  const r = await mountAll('empty', undefined, () => {
    polyfill()
    return JSON.parse(JSON.stringify(createV5State('empty', YZ, null, 'database', store)))
  })
  const root = r.root
  const all = (sel: string) => Array.from(root.querySelectorAll(sel)) as HTMLElement[]
  r.workbench.navigate('journal', 0)
  await tick(30)

  const peer = root.querySelector('#jcPeer [data-jc-bid="p-1"]')
  check('讀回來的章畫得出來：對方那一欄', peer?.classList.contains('stk-on') && peer?.querySelector('.stk img')?.getAttribute('src') === SRC)
  check('對方的章只是一張圖，不是可以撕的按鈕', !!peer?.querySelector('span.stk') && !peer?.querySelector('button.stk'))
  const card = () => root.querySelector(`#jcMine .eb-doc-card[data-doc-id="${standup.id}"]`)
  check('讀回來的章畫得出來：物件段落裡的行', !!card()?.querySelector('.eb[data-id="s-1"] button.stk'))
  check('物件卡片標題列記下這張物件完成了 1 件', text(card()?.querySelector('.eb-doc-bar .stk-count')) === '1', text(card()?.querySelector('.eb-doc-bar')))
  const rows = () => all('#stkDone .stk-row').map(text)
  const doing = () => all('#stkDoing .stk-row')
  const short = String(+PREV.slice(5, 7)) + '/' + String(+PREV.slice(8, 10))
  check('昨天還貼著進行中的行，今天的「正在做的事」帶過來並標出是哪一天', doing().length === 1 && text(doing()[0]).includes('寫合作提案') && text(doing()[0]).includes(short), doing().map(text))
  check('昨天完成的事不會帶到今天的「完成的小事」', !rows().some((x) => x.includes('昨天做完的事')), rows())
  check('右側列出兩個人今天完成的小事（日誌的行＋物件裡的行）', rows().length === 2 && rows().some((x) => x.includes('文齡二修網站') && x.includes('Standup')) && rows().some((x) => x.includes('會議紀錄整理')), rows())

  // 自己的日誌蓋章 → 跟著日誌一起送出
  const own = () => root.querySelector('#doc .eb[data-id="b-own"] .eb-tx') as HTMLElement
  typeInto(own(), '今天自己寫的一行 /done')
  await tick(10)
  press(own(), 'Enter')
  // 日誌是延遲保存（停下來 1.5 秒才送）。
  await tick(1900)
  const journalBlocks = () => (((sent.filter((c) => c.collection === 'journal').at(-1)?.after as { blocks?: Block[] })?.blocks) || [])
  const savedOwn = journalBlocks().find((b) => b.id === 'b-own')
  check('journal · 那一行帶著章送去保存', savedOwn?.stk?.k === 'done' && savedOwn?.stk?.by === 'yz' && typeof savedOwn?.stk?.at === 'number', savedOwn)
  check('journal · 保存的文字裡沒有 /done', savedOwn?.text === '今天自己寫的一行', savedOwn?.text)

  // 已經蓋過的行再打一次：蓋章時間不重寫（那是「何時完成」，不是「最後一次碰它」）
  typeInto(own(), '今天自己寫的一行 /done ')
  await tick(1900)
  const again = journalBlocks().find((b) => b.id === 'b-own')
  check('journal · 再打一次 /done，蓋章時間不變', again?.stk?.at === savedOwn?.stk?.at && again?.text === '今天自己寫的一行', again)

  // 物件段落裡的行尾按 Enter：只拆一次（事件會冒泡到外層的 #doc，不能被處理兩遍）
  const secLines = () => all('#jcMine [data-doc-sec][data-sec-idx="1"] > .eb > .eb-tx').map((el) => el.textContent)
  typeInto(root.querySelector('#jcMine .eb[data-id="s-2"] .eb-tx') as HTMLElement, '會計師需求整理')
  press(root.querySelector('#jcMine .eb[data-id="s-2"] .eb-tx') as HTMLElement, 'Enter')
  await tick(20)
  check('物件段落行尾按 Enter：下面多一行，上面不會多出空行', JSON.stringify(secLines()) === JSON.stringify(['會計師需求整理', '']), secLines())

  // 物件段落裡蓋章 → 跟著物件一起送出，卡片計數 +1
  sent.length = 0
  const inSec = () => root.querySelector('#jcMine .eb[data-id="s-2"] .eb-tx') as HTMLElement
  typeInto(inSec(), '會計師需求整理 /done ')
  await tick(1900)
  check('物件段落裡打 /done：一樣蓋得上去', !!root.querySelector('#jcMine .eb[data-id="s-2"] button.stk'))
  check('物件卡片計數變成 2', text(card()?.querySelector('.eb-doc-bar .stk-count')) === '2')
  const savedDoc = sent.filter((c) => c.collection === 'docObjects' && c.id === standup.id).at(-1)?.after as { secs?: Array<{ blocks: Block[] }> } | undefined
  const savedSec = savedDoc?.secs?.[1]?.blocks?.find((b) => b.id === 's-2')
  check('docObjects · 段落那一行帶著章送去保存', savedSec?.stk?.k === 'done' && savedSec?.text === '會計師需求整理', savedSec)

  // 撕掉 → 保存的那一列不再有章
  sent.length = 0
  ;(root.querySelector('#doc .eb[data-id="b-own"] button.stk') as HTMLElement).click()
  await tick(1900)
  const peeled = journalBlocks().find((b) => b.id === 'b-own')
  check('journal · 撕掉之後，保存的那一行不再帶章', !!peeled && !peeled.stk, peeled)

  // 點帶過來的那一列 → 翻到昨天的日誌、看得到那一行；在那一頁只列當天的
  doing()[0].click()
  await tick(30)
  check('點帶過來的那一列：翻到那一天，那一行在畫面上', text(root.querySelector('#jcDate b')).includes(PREV) && !!root.querySelector('#doc .eb[data-id="b-old"].rq-flash button.stk'), text(root.querySelector('#jcDate b')))
  check('翻到昨天：兩區各只列那一天頁面上的', doing().length === 1 && rows().length === 1 && rows()[0].includes('昨天做完的事'), [doing().map(text), rows()])

  check('database · 沒有 runtime 錯誤', r.errors.length === 0, r.errors.slice(0, 3))
  r.workbench.destroy()
  g.fetch = realFetch
}

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
