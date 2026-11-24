/**
 * 日誌 AI（RES-037 · JAI-S1）純邏輯的驗收 harness：搜尋、工具、引用驗證。
 *
 *   pnpm exec tsx scripts/check-journal-ai.mts
 *
 * 權限不在這裡驗：語料由 corpus-loader 用 viewer 的權限載入，這裡拿到的已經是「看得到的那一份」。
 * 權限另由拋棄式 DB 的路由實測驗（evidence report）。
 */
import { lineCite, queryTerms, searchJournal, searchObjects, type JournalCorpus } from '../src/lib/ai/journal-ai/corpus'
import { nativeCiteMarkers, UNVERIFIED_MARK, verifyCitations } from '../src/lib/ai/journal-ai/citations'
import { extractOfficeText, MAX_TEXT } from '../src/lib/ai/journal-ai/office-text'
import { deflateRawSync } from 'node:zlib'
import { citeLabels, JOURNAL_AI_TOOLS, resolvePins, runTool, TOOL_NAMES } from '../src/lib/ai/journal-ai/tools'
import { fromOpenAIOutput, hasCompaction, toAnthropicMessages, toOpenAIInput, toOpenAITools, type StoredMessage } from '../src/lib/ai/journal-ai/convert'
import { availableModels, costMicroUsd, defaultModelFor, providerOfModel, resolveRunProvider } from '../src/lib/ai/journal-ai/models'
import { toResponseInputItem } from 'openai/lib/responses/ResponseInputItems'

const results: [string, string, string][] = []
const ok = (name: string, cond: boolean, extra?: string) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : extra ?? ''])

const corpus: JournalCorpus = {
  viewer: 'yz',
  seats: ['yz', 'lily'],
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


/* ---------- JAI-S2：檔案 ---------- */

/** 最小的 zip 寫入器（測試用）：每個 entry 都用 deflate。 */
function zip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [], centrals: Buffer[] = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text, 'utf8'), comp = deflateRawSync(data), n = Buffer.from(name)
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26)
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(offset, 42)
    locals.push(lh, n, comp); centrals.push(ch, n)
    offset += 30 + n.length + comp.length
  }
  const cd = Buffer.concat(centrals), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cd, end])
}

const docx = zip({ 'word/document.xml': '<w:document><w:body><w:p><w:r><w:t>報價分兩期</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">第二期 </w:t></w:r><w:r><w:t>驗收後 30 天 &amp; 開發票</w:t></w:r></w:p></w:body></w:document>' })
const dt = extractOfficeText(docx, 'docx')
ok('F1 docx 依段落換行、合併同段的字', dt === '報價分兩期\n第二期 驗收後 30 天 & 開發票', JSON.stringify(dt))
const xlsx = zip({
  'xl/workbook.xml': '<workbook><sheets><sheet name="報價" sheetId="1"/></sheets></workbook>',
  'xl/sharedStrings.xml': '<sst><si><t>項目</t></si><si><t>金額</t></si><si><r><t>設計</t></r><r><t>費</t></r></si></sst>',
  'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>120000</v></c></row></sheetData></worksheet>',
})
const xt = extractOfficeText(xlsx, 'xlsx')
ok('F2 xlsx 有工作表名稱、共用字串、欄位對齊（空欄留空）', xt === '## 工作表：報價\n項目\t金額\n設計費\t\t120000', JSON.stringify(xt))
const pptx = zip({ 'ppt/slides/slide2.xml': '<p:sld><a:p><a:r><a:t>第二張</a:t></a:r></a:p></p:sld>', 'ppt/slides/slide1.xml': '<p:sld><a:p><a:r><a:t>封面</a:t></a:r></a:p></p:sld>', 'ppt/slides/slide10.xml': '<p:sld><a:p><a:r><a:t>第十張</a:t></a:r></a:p></p:sld>' })
const pt = extractOfficeText(pptx, 'pptx')
ok('F3 pptx 依投影片編號排序（10 在 2 後面）', pt.indexOf('封面') < pt.indexOf('第二張') && pt.indexOf('第二張') < pt.indexOf('第十張'), pt)
let threw = ''
try { extractOfficeText(Buffer.from('not a zip at all'), 'docx') } catch (e) { threw = (e as Error).message }
ok('F4 壞掉的檔案丟出說得出原因的錯', threw.includes('zip'), threw)
const bomb = zip({ 'word/document.xml': '<w:p><w:t>' + 'a'.repeat(9 * 1024 * 1024) + '</w:t></w:p>' })
threw = ''
try { extractOfficeText(bomb, 'docx') } catch (e) { threw = (e as Error).message }
ok('F5 解壓後超過上限的 entry 不讀（zip bomb）', threw.includes('太大'), threw)
const long = zip({ 'word/document.xml': '<w:p><w:t>' + '字'.repeat(MAX_TEXT + 50) + '</w:t></w:p>' })
ok('F6 抽出的文字超過上限就截斷並註明', extractOfficeText(long, 'docx').endsWith('以下省略）'))

/* read_file 與釘選檔案 */
const rf = runTool(corpus, 'read_file', { cite: 'asset:AST-JRNL-000124-20261021' })
ok('R1 read_file 回檔案記號、不帶 bytes', !rf.isError && rf.blocks?.[0]?.type === 'asset_ref' && rf.blocks[0].ref === 'AST-JRNL-000124-20261021' && !rf.content.includes('base64'))
ok('R2 read_file 讀到的檔案進 sentRefs（可被引用）', rf.refs[0]?.cite === 'asset:AST-JRNL-000124-20261021')
ok('R3 read_file 讀不到別人的／不存在的檔案', runTool(corpus, 'read_file', { cite: 'asset:AST-JRNL-999999-20261021' }).isError)
ok('R4 read_file 不接受非檔案的 cite', runTool(corpus, 'read_file', { cite: 'decision:DEC-31' }).isError)
const pinsF = resolvePins(corpus, [{ ty: 'asset', rid: 'AST-JRNL-000124-20261021' }, { ty: 'decision', rid: 'DEC-31' }])
ok('R5 釘選檔案會附上內容記號，釘選決策不會', pinsF.files.length === 1 && pinsF.files[0].ref === 'AST-JRNL-000124-20261021')
ok('R6 工具清單多了 read_file 且一樣是 strict', JOURNAL_AI_TOOLS.some((t) => t.name === 'read_file' && t.strict))

/* 原生 citations → 頁碼引用 */
const marks = nativeCiteMarkers([
  { type: 'page_location', document_title: '報價單.pdf（asset:AST-JRNL-000124-20261021）', start_page_number: 2, end_page_number: 3 },
  { type: 'page_location', document_title: '報價單.pdf（asset:AST-JRNL-000124-20261021）', start_page_number: 2, end_page_number: 2 },
  { type: 'char_location', document_title: '合約.docx（asset:AST-AI-000001-20261118）', start_char_index: 0, end_char_index: 9 },
  { type: 'page_location', document_title: '沒有參考碼的文件', start_page_number: 1 },
])
ok('N1 頁碼引用轉成 ⟦asset:#p⟧、同頁不重複、文字檔沒有頁碼、認不出的略過', marks === '⟦asset:AST-JRNL-000124-20261021#p2⟧⟦asset:AST-AI-000001-20261118⟧', marks)
const vp = verifyCitations('第二期驗收後付款' + marks, citeLabels(rf.refs))
ok('N2 讀過的檔案的頁碼引用被承認並帶頁碼', vp.citations[0]?.kind === 'object' && (vp.citations[0] as { page?: number }).page === 2)
ok('N3 沒讀過的檔案的引用仍被移除', vp.dropped.includes('asset:AST-AI-000001-20261118'))


/* ---------- JAI-S3：日誌行釘選 ---------- */
const lp = resolvePins(corpus, [{ ty: 'line', rid: '2026-10-20:yz:b3' }, { ty: 'line', rid: '2026-10-21:lily:nope' }, { ty: 'decision', rid: 'DEC-31' }])
ok('L1 釘選的日誌行帶 cite 與文字，找不到的行略過', lp.refs[0]?.cite === 'line:2026-10-20:yz:b3' && lp.text.includes('驗收後 30 天') && !lp.text.includes('nope'))
ok('L2 釘選的行進允許引用集合', verifyCitations('⟦line:2026-10-20:yz:b3⟧', citeLabels(lp.refs)).citations.length === 1)
ok('L3 行與物件可以一起釘選', lp.refs.some((r) => r.cite === 'decision:DEC-31'))


/* ---------- JAI-S4：提案 ---------- */
const pr = runTool(corpus, 'propose_item', { kind: 'task', title: '寄出修正後報價', detail: '依 10/20 決議分兩期', owner: 'lily', due: '2026-11-25', sources: ['decision:DEC-31', 'not a cite'] })
ok('P1 提案回傳草稿、不寫任何東西、狀態 pending', !pr.isError && pr.proposal?.status === 'pending' && pr.proposal.owner === 'lily' && pr.proposal.due === '2026-11-25')
ok('P2 提案的依據只留 cite 格式', JSON.stringify(pr.proposal?.sources) === JSON.stringify(['decision:DEC-31']))
const pr2 = runTool(corpus, 'propose_item', { kind: 'task', title: 'x', detail: null, owner: 'stranger', due: null, sources: [] })
ok('P3 不認得的負責人換成提問者自己', pr2.proposal?.owner === 'yz')
const pr3 = runTool(corpus, 'propose_item', { kind: 'agenda', title: '討論', detail: null, owner: null, due: null, sources: [] })
ok('P4 議題沒有負責人', pr3.proposal?.kind === 'agenda' && pr3.proposal.owner === '')
ok('P5 日期格式不對被擋', runTool(corpus, 'propose_item', { kind: 'task', title: 'x', detail: null, owner: null, due: '11/25', sources: [] }).isError)

/* ---------- RES-039：Claude／OpenAI 切換 ---------- */
ok('M1 一家都沒接上 → 示範模式', resolveRunProvider('gpt-6.2-sol', []) === 'mock' && resolveRunProvider('claude-opus-5-5', ['openai'], true) === 'mock')
ok('M2 模型決定供應者；那一家沒接上回 null（不偷偷換家）', resolveRunProvider('gpt-6.2-sol', ['openai']) === 'openai' && resolveRunProvider('claude-opus-5-5', ['anthropic', 'openai']) === 'anthropic' && resolveRunProvider('claude-opus-5-5', ['openai']) === null)
ok('M3 預設模型：只有 OpenAI → gpt-6.2-sol；兩家 → Claude；指定的那家接上才用指定的',
  defaultModelFor(['openai']) === 'gpt-6.2-sol' && defaultModelFor(['anthropic', 'openai']) === 'claude-opus-5-5' && defaultModelFor(['openai'], 'gpt-6.2-astra') === 'gpt-6.2-astra' && defaultModelFor(['openai'], 'claude-sonnet-5-5') === 'gpt-6.2-sol')
ok('M4 選單只列接上的那一家', availableModels(['openai']).every((m) => m.provider === 'openai') && availableModels(['openai']).length === 2 && availableModels([]).length === 0)
ok('M5 名單外的模型依名稱猜供應者、以最貴的估價', providerOfModel('gpt-7-x') === 'openai' && providerOfModel('claude-x') === 'anthropic' && costMicroUsd('gpt-7-x', { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 }) === 8_000_000)
ok('M6 OpenAI 計價：Sol 輸入 $2、輸出 $10、快取讀 $0.10', costMicroUsd('gpt-6.2-sol', { input: 1000, output: 1000, cacheRead: 1000, cacheWrite: 0 }) === 12_100)

const oaTools = toOpenAITools(JOURNAL_AI_TOOLS as never)
ok('M7 工具轉成 strict function tool，schema 原樣', oaTools.length === JOURNAL_AI_TOOLS.length && oaTools.every((t) => t.type === 'function' && t.strict === true && (t.parameters as { additionalProperties?: boolean }).additionalProperties === false))

// 一段 Claude 跑過的歷史：thinking、tool_use、帶圖片與 PDF 的 tool_result、文字文件
const claudeHistory: StoredMessage[] = [
  { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }, { type: 'text', text: '這張圖在說什麼' }] },
  { role: 'assistant', content: [{ type: 'thinking', thinking: '…', signature: 'sig' }, { type: 'text', text: '我查一下' }, { type: 'tool_use', id: 'toolu_01', name: 'read_file', input: { cite: 'asset:AST-1' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: [{ type: 'text', text: '附件 ⟦asset:AST-1⟧' }, { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBE' }, title: '報價單.pdf（asset:AST-1）', citations: { enabled: true } }] }] },
  { role: 'assistant', content: [{ type: 'text', text: '第二期在驗收後', citations: [{ type: 'page_location', document_title: '報價單.pdf（asset:AST-1）', start_page_number: 2 }] }] },
  { role: 'user', content: [{ type: 'document', source: { type: 'text', media_type: 'text/plain', data: '會議紀錄全文' }, title: '紀錄.docx（asset:AST-2）' }, { type: 'text', text: '摘要這份' }] },
]
const oa = toOpenAIInput('SYS', claudeHistory)
const kinds = oa.map((x) => (x.type as string) ?? `msg:${x.role}`)
ok('M8 Claude 歷史 → OpenAI：開發者訊息在最前、thinking 不送、順序保留',
  JSON.stringify(kinds) === JSON.stringify(['msg:developer', 'msg:user', 'msg:assistant', 'function_call', 'function_call_output', 'msg:assistant', 'msg:user']), JSON.stringify(kinds))
const fc = oa.find((x) => x.type === 'function_call')!
const fco = oa.find((x) => x.type === 'function_call_output')!
ok('M9 tool_use → function_call（同一個 id、參數 JSON 字串）；tool_result → function_call_output（PDF 變 input_file）',
  fc.call_id === 'toolu_01' && fc.arguments === '{"cite":"asset:AST-1"}' && fco.call_id === 'toolu_01' && Array.isArray(fco.output)
    && (fco.output as Array<Record<string, unknown>>).some((p) => p.type === 'input_file' && String(p.file_data).startsWith('data:application/pdf;base64,') && p.filename === '報價單.pdf'))
const u0 = oa[1].content as Array<Record<string, unknown>>
ok('M10 圖片 → input_image（data URL）；文字文件 → input_text 帶標題', u0[0].type === 'input_image' && u0[0].image_url === 'data:image/png;base64,AAAA'
  && JSON.stringify(oa[6].content).includes('紀錄.docx（asset:AST-2）') && JSON.stringify(oa[6].content).includes('會議紀錄全文'))
ok('M11 Claude 的檔案頁碼引用轉成記號留在文字裡', oa[5].content === '第二期在驗收後⟦asset:AST-1#p2⟧')

// OpenAI 回一次：推理（加密）＋文字＋工具呼叫
const oaOut = [
  { type: 'reasoning', id: 'rs_1', summary: [], encrypted_content: 'ENC' },
  { type: 'message', id: 'msg_1', role: 'assistant', status: 'completed', phase: 'commentary', content: [{ type: 'output_text', text: '我先找', annotations: [] }] },
  { type: 'function_call', id: 'fc_1', call_id: 'call_abc', name: 'search_journal', arguments: '{"query":"報價","from":null,"to":null,"author":null}', status: 'completed' },
  { type: 'function_call', id: 'fc_2', call_id: 'call_bad', name: 'get_object', arguments: '{"cite":', status: 'completed' },
]
const parsed = fromOpenAIOutput(oaOut)
ok('M12 OpenAI 輸出 → 存法：推理原樣、文字與工具呼叫帶原始項目、壞掉的參數標出來',
  parsed.text === '我先找' && parsed.calls.length === 2 && parsed.calls[1].badJson && !parsed.calls[0].badJson
    && (parsed.message.content as Array<Record<string, unknown>>)[0].type === 'openai_item')
const mixed: StoredMessage[] = [...claudeHistory, parsed.message, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_abc', content: '{"lines":[]}' }, { type: 'tool_result', tool_use_id: 'call_bad', content: '參數不是合法的 JSON', is_error: true }] }]
const back = toOpenAIInput('SYS', mixed, (item) => toResponseInputItem(item as never) as never)
const tail = back.slice(-6).map((x) => (x.type as string) ?? `msg:${x.role}`)
ok('M13 送回 OpenAI：推理、訊息、function_call 原樣重送（經 SDK 正規化），結果緊接在後',
  JSON.stringify(tail) === JSON.stringify(['reasoning', 'message', 'function_call', 'function_call', 'function_call_output', 'function_call_output'])
    && back.some((x) => x.type === 'reasoning' && x.encrypted_content === 'ENC'), JSON.stringify(tail))
ok('M14 錯誤的工具結果標上（錯誤）', back.some((x) => x.type === 'function_call_output' && x.call_id === 'call_bad' && String(x.output).startsWith('（錯誤）')))
const toClaude = toAnthropicMessages(mixed)
const cJson = JSON.stringify(toClaude)
ok('M15 換回 Claude：OpenAI 推理與原始項目拿掉，tool_use 用 OpenAI 的 id 照樣配對', !cJson.includes('openai_item') && !cJson.includes('_oa') && !cJson.includes('ENC')
  && cJson.includes('"id":"call_abc"') && cJson.includes('"tool_use_id":"call_abc"'))
const onlyReasoning = fromOpenAIOutput([{ type: 'reasoning', id: 'rs_2', summary: [], encrypted_content: 'E2' }, { type: 'message', id: 'm2', role: 'assistant', content: [{ type: 'output_text', text: '', annotations: [] }] }]).message
ok('M16 只有推理、文字是空的那一則：Claude 那邊整則略過（不送空 text）', toAnthropicMessages([onlyReasoning]).length === 0)
ok('M17 拒答被認出來', fromOpenAIOutput([{ type: 'message', id: 'm3', role: 'assistant', content: [{ type: 'refusal', refusal: 'no' }] }]).refused)
const compacted: StoredMessage[] = [claudeHistory[0], { role: 'assistant', content: [{ type: 'compaction', content: '先前討論了報價分期', encrypted_content: null }, { type: 'text', text: '好' }] }, { role: 'user', content: '繼續' }]
const oc = toOpenAIInput('SYS', compacted)
ok('M18 Claude 壓縮過的對話 → OpenAI 只送摘要之後的部分＋摘要文字', hasCompaction(compacted) && !JSON.stringify(oc).includes('input_image') && JSON.stringify(oc).includes('先前討論了報價分期') && oc[oc.length - 1].content === '繼續')

const failed = results.filter((r) => r[0] === 'FAIL')
for (const [s, n, e] of results) console.log(`${s}  ${n}${e ? '  → ' + e : ''}`)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length) process.exit(1)
