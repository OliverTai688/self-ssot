/**
 * 潛在訊號規則判讀（RES-036 §6、LINESIG-UI）的驗收 harness。
 *
 *   pnpm exec tsx scripts/check-conversation-signals.mts
 *
 * 規則判讀是純函式，所以用固定對話逐條驗。重點不是「抓得到」，而是「不該抓的沒抓」：
 * 潛在訊號太吵，訊號頁就沒人看了。
 */
import { parseLineExport } from '../src/lib/ui-data/yuanzhan/conversation-deid'
import { detectCandidates, resolveDeadline, CANDIDATE_KIND_LABELS } from '../src/lib/ui-data/yuanzhan/conversation-signals'

const results: [string, string, string][] = []
const ok = (name: string, cond: boolean, extra?: string) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : extra ?? ''])

const EXPORT = `[LINE] 柏翰客戶群的聊天記錄
2026/10/09（五）
09:00\t王志明\t請問教育訓練可以改到下週嗎？
09:10\t戴宇星\t可以，週五前把結案問卷初稿給您
09:12\t王志明\t好的謝謝
2026/10/12（一）
09:14\t王志明\t報價單可以分兩期付嗎？
09:15\t王志明\t[檔案] 簽回的需求書.pdf
09:16\t王志明\t[貼圖]
09:20\t林代書\t我這邊再看看
09:30\t王志明\t另外發票抬頭是否要改`
const P = parseLineExport(EXPORT)
const SIDES = { 戴宇星: 'us', 王志明: 'client', 林代書: 'vendor' } as const
const run = (o = {}) => detectCandidates(P.messages, { sides: SIDES, now: '2026-10-12 14:20', group: P.title, ...o })
const R = run()
const of = (kind: string) => R.filter(c => c.kind === kind)

/* ── 1. 對方提問未回 ─────────────────────────────────────── */
ok('最後一次我方發言之後的外部提問被列出', of('question').map(c => c.quote).join('|') === '報價單可以分兩期付嗎？|另外發票抬頭是否要改', of('question').map(c => c.quote).join('|'))
ok('已經被我方回過的提問不列', !of('question').some(c => c.quote.includes('教育訓練')))
ok('不是問句的外部發言不列', !R.some(c => c.quote === '好的謝謝' || c.quote === '我這邊再看看'))
ok('說得出等了多久', of('question')[0].hint === '已 5 小時沒有我方發言', of('question')[0].hint)
ok('有問號是高信心，只有疑問詞是中信心', of('question')[0].conf === 'high' && of('question')[1].conf === 'mid')
ok('不給現在時間就不算時數', run({ now: undefined }).find(c => c.kind === 'question')!.hint === '之後沒有我方發言')
ok('沒有任何人被標成我方時，一則提問都不列（否則全是雜訊）', detectCandidates(P.messages, { sides: { 王志明: 'client' } }).filter(c => c.kind === 'question').length === 0)
ok('沒被標邊的人當外部：寧可多問，不漏客戶', detectCandidates(P.messages, { sides: { 戴宇星: 'us' } }).filter(c => c.kind === 'question').length === 2)

ok('問號在句子中間也算提問（問完接著說別的）', detectCandidates([{ id: 'u', at: '', speaker: '戴宇星', type: 'text', text: '您好' }, { id: 'x', at: '', speaker: '王志明', type: 'text', text: '可以分兩期嗎？第一期先匯 9 萬' }], { sides: SIDES }).filter(c => c.kind === 'question').length === 1)

/* ── 2. 承諾與期限 ───────────────────────────────────────── */
ok('我方說了期限與動作：列出並算出日期', of('commitment').length === 1 && of('commitment')[0].due === '2026-10-09', JSON.stringify(of('commitment')))
ok('期限已過會說出來', of('commitment')[0].hint.includes('已經過了'), of('commitment')[0].hint)
ok('外部的人說的期限不算我方承諾', detectCandidates([{ id: 'x', at: '2026-10-12 09:00', speaker: '王志明', type: 'text', text: '週五前給我報價' }], { sides: SIDES }).filter(c => c.kind === 'commitment').length === 0)
ok('有期限沒有動作不列', detectCandidates([{ id: 'x', at: '2026-10-12 09:00', speaker: '戴宇星', type: 'text', text: '週五天氣不錯' }], { sides: SIDES }).length === 0)
ok('我方的問句不是承諾', detectCandidates([{ id: 'x', at: '2026-10-12 09:00', speaker: '戴宇星', type: 'text', text: '週五前給您可以嗎？' }], { sides: SIDES }).length === 0)

/* ── 3. 交付物 ───────────────────────────────────────────── */
ok('外部傳來的檔案被列出', of('deliverable').length === 1 && of('deliverable')[0].quote.includes('需求書'), JSON.stringify(of('deliverable')))
ok('貼圖與系統訊息不產生任何訊號', !R.some(c => c.quote.includes('貼圖')))
ok('我方自己傳的檔案不列', detectCandidates([{ id: 'x', at: '', speaker: '戴宇星', type: 'file', text: '[檔案] a.pdf' }], { sides: SIDES }).length === 0)

/* ── 4. 鍵與去重 ─────────────────────────────────────────── */
ok('同一段對話判讀兩次得到同一組鍵', run().map(c => c.key).join() === R.map(c => c.key).join())
ok('每一筆的鍵都不同', new Set(R.map(c => c.key)).size === R.length)
ok('換一個群組，鍵就不同', run({ group: '別的群' })[0].key !== R[0].key)
ok('三種都有中文名稱', R.every(c => !!CANDIDATE_KIND_LABELS[c.kind]))

/* ── 5. 期限換算（基準：2026-10-09 是週五，2026-10-12 是週一）── */
const D = (p: string, base = '2026-10-12') => resolveDeadline(p, base)
ok('今天／明天／後天', D('今天') === '2026-10-12' && D('明天') === '2026-10-13' && D('後天') === '2026-10-14')
ok('週五 → 這一週的週五', D('週五') === '2026-10-16', D('週五'))
ok('當天就是那個星期幾 → 今天', D('週一') === '2026-10-12' && D('星期五', '2026-10-09') === '2026-10-09')
ok('下週五 → 下一週的週五', D('下週五') === '2026-10-23' && D('下週一') === '2026-10-19', D('下週五') + ' ' + D('下週一'))
ok('週日算一週的最後一天', D('下週日') === '2026-10-25' && D('禮拜天') === '2026-10-18', D('下週日') + ' ' + D('禮拜天'))
ok('月底', D('月底') === '2026-10-31' && D('月底', '2026-02-10') === '2026-02-28')
ok('10/16 與 10月16日', D('10/16') === '2026-10-16' && D('10月16日') === '2026-10-16')
ok('十二月說 1/5 是明年', D('1/5', '2026-12-20') === '2027-01-05', D('1/5', '2026-12-20'))
ok('不合理的日期不猜', D('13/40') === '' && D('週五', '') === '')

let fail = 0
for (const [s, n, e] of results) { if (s === 'FAIL') fail++; console.log(`${s}  ${n}${e ? `\n      → ${e}` : ''}`) }
console.log(`\n${results.length - fail}/${results.length} PASS`)
process.exit(fail ? 1 : 0)
