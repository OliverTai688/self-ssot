/**
 * 日誌 AI（RES-037 · JAI-S1）純邏輯的驗收 harness：搜尋、工具、引用驗證。
 *
 *   pnpm exec tsx scripts/check-journal-ai.mts
 *
 * 權限不在這裡驗：語料由 corpus-loader 用 viewer 的權限載入，這裡拿到的已經是「看得到的那一份」。
 * 權限另由拋棄式 DB 的路由實測驗（evidence report）。
 */
import { lineCite, queryTerms, searchJournal, searchObjects, type JournalCorpus } from '../src/lib/ai/journal-ai/corpus'
import { UNVERIFIED_MARK, verifyCitations } from '../src/lib/ai/journal-ai/citations'
import { citeLabels, JOURNAL_AI_TOOLS, resolvePins, runTool, TOOL_NAMES } from '../src/lib/ai/journal-ai/tools'

const results: [string, string, string][] = []
const ok = (name: string, cond: boolean, extra?: string) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : extra ?? ''])

const corpus: JournalCorpus = {
  viewer: 'yz',
  lines: [
    { day: '2026-10-20', author: 'yz', blockId: 'b1', line: 1, text: '跟柏翰開會，報價改成兩期付款', refs: [] },
    { day: '2026-10-20', author: 'yz', blockId: 'b3', line: 3, text: '第二期在驗收後 30 天', refs: [{ ty: 'decision', rid: 'DEC-31' }] },
    { day: '2026-10-21', author: 'lily', blockId: 'c1', line: 1, text: '整理報價單附件', refs: [{ ty: 'asset', rid: 'AST-JRNL-000124-20261021' }] },
    { day: '2026-09-01', author: 'yz', blockId: 'd1', line: 1, text: '九月的報價討論', refs: [] },
  ],
  dayTitles: { '2026-10-20': '柏翰會議' },
  objects: [
    { ty: 'decision', rid: 'DEC-31', label: '決策', name: '分期付款決議', day: '2026-10-20', body: '報價分兩期，第二期驗收後 30 天', comments: [] },
    { ty: 'asset', rid: 'AST-JRNL-000124-20261021', label: '檔案', name: '報價單.pdf', day: '2026-10-21', body: '報價單.pdf', comments: [{ who: 'yz', text: '已確認', day: '2026-10-22' }] },
    { ty: 'issue', rid: 'ISS-12', label: '工作', name: '寄出報價', day: '2026-10-19', body: 't: 寄出報價\nst: Doing', comments: [] },
  ],
  activity: [{ day: '2026-10-20', at: '09:00', who: 'yz', text: '開始一天' }],
}

/* 分詞 */
ok('T1 空白與標點分詞', JSON.stringify(queryTerms('報價, 分期 報價')) === JSON.stringify(['報價', '分期']))

/* 搜尋日誌 */
const j = searchJournal(corpus, { query: '報價 兩期' })
ok('J1 兩個詞都命中的排在前面', j.hits[0]?.cite === 'line:2026-10-20:yz:b1', JSON.stringify(j.hits[0]))
ok('J2 只命中一個詞的也找得到', j.total === 3, String(j.total))
ok('J3 日期區間', searchJournal(corpus, { query: '報價', from: '2026-10-01', to: '2026-10-31' }).total === 2)
ok('J4 作者篩選', searchJournal(corpus, { query: '報價', author: 'lily' }).hits.every((h) => h.author === 'lily'))
ok('J5 帶上當天標題', j.hits[0]?.dayTitle === '柏翰會議')

/* 搜尋物件 */
const o = searchObjects(corpus, { query: '報價', types: ['asset'] })
ok('O1 型別篩選', o.hits.length === 1 && o.hits[0].cite === 'asset:AST-JRNL-000124-20261021')
ok('O2 名稱命中排在內文命中前面', searchObjects(corpus, { query: '分期' }).hits[0]?.cite === 'decision:DEC-31')

/* 工具 */
ok('W1 工具定義與執行清單一致', JOURNAL_AI_TOOLS.map((t) => t.name).join() === TOOL_NAMES.join())
ok('W2 工具全部 strict、additionalProperties:false', JOURNAL_AI_TOOLS.every((t) => t.strict && t.input_schema.additionalProperties === false))
const bad = runTool(corpus, 'search_journal', { query: '報價' })
ok('W3 缺欄位的參數被擋下、不執行', bad.isError && bad.refs.length === 0)
ok('W4 不存在的工具回錯誤', runTool(corpus, 'delete_everything', {}).isError)
const sj = runTool(corpus, 'search_journal', { query: '報價', from: null, to: null, author: null })
ok('W5 搜尋結果帶 cite，並記進 sentRefs', sj.refs.length === 3 && sj.refs.every((r) => r.cite.startsWith('line:')))
ok('W6 步驟列有標籤與筆數', sj.step.label.includes('報價') && sj.step.hits === 3)
const go = runTool(corpus, 'get_object', { cite: 'asset:AST-JRNL-000124-20261021' })
ok('W7 讀物件帶留言與出現的行', go.content.includes('已確認') && go.refs.some((r) => r.cite === 'line:2026-10-21:lily:c1'))
ok('W8 讀不到的物件回錯誤、不洩漏', runTool(corpus, 'get_object', { cite: 'txn:TX-SECRET' }).isError)
const day = runTool(corpus, 'read_journal_day', { day: '2026-10-20', author: null })
ok('W9 讀整天依行序', day.refs.map((r) => r.cite).join() === 'line:2026-10-20:yz:b1,line:2026-10-20:yz:b3')
ok('W10 日期格式不對被擋', runTool(corpus, 'list_activity', { from: '10/20', to: '10/21' }).isError)
const pins = resolvePins(corpus, [{ ty: 'decision', rid: 'DEC-31' }, { ty: 'txn', rid: 'NOPE' }])
ok('W11 釘選只解析得到的物件', pins.refs[0]?.cite === 'decision:DEC-31' && !pins.text.includes('NOPE'))

/* 引用驗證 */
const allowed = citeLabels([...sj.refs, ...pins.refs])
const v = verifyCitations('改兩期 ⟦line:2026-10-20:yz:b1⟧，決議見 ⟦decision:DEC-31⟧，薪資 ⟦txn:PAY-1⟧，再一次 ⟦line:2026-10-20:yz:b1⟧', allowed)
ok('C1 認得的保留', v.text.includes('⟦line:2026-10-20:yz:b1⟧') && v.text.includes('⟦decision:DEC-31⟧'))
ok('C2 沒讀過的換成未驗證記號', v.text.includes(UNVERIFIED_MARK) && !v.text.includes('PAY-1') && v.dropped[0] === 'txn:PAY-1')
ok('C3 引用不重複、依出現順序', v.citations.map((c) => c.cite).join() === 'line:2026-10-20:yz:b1,decision:DEC-31')
ok('C4 行引用拆得出日期、作者、行 id', v.citations[0].kind === 'line' && v.citations[0].kind === 'line' && (v.citations[0] as { blockId: string }).blockId === 'b1')
ok('C5 cite 格式與 lineCite 一致', lineCite(corpus.lines[0]) === 'line:2026-10-20:yz:b1')
ok('C6 自己組的 cite（格式對但沒讀過）不承認', verifyCitations('⟦line:2026-10-21:lily:c9⟧ ⟦issue:ISS-12⟧', allowed).citations.length === 0)

const failed = results.filter((r) => r[0] === 'FAIL')
for (const [s, n, e] of results) console.log(`${s}  ${n}${e ? '  → ' + e : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
