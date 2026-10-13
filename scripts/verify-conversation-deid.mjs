/**
 * 對話去識別化（RES-036 §6.4、AUT-010 §7／§11 S3b）的驗收 harness。
 *
 *   node scripts/verify-conversation-deid.mjs
 *
 * 去識別化是整條「人選取 → 遮蔽 → 人確認 → 才送出」裡唯一由程式決定內容的一步，
 * 而且它是純函式，所以用固定語料逐條驗（node 原生 type stripping，直接 import 那支 .ts）。
 * 這裡驗的是「該遮的有遮、不該遮的沒遮、同樣輸入同樣輸出、人的決定有被尊重」；
 * 「字典外的名字抓不到」是已知限制，下面有一條專門把它釘住，免得日後有人誤以為已解決。
 */
import { pathToFileURL } from 'node:url'

const D = await import(pathToFileURL('src/lib/ui-data/yuanzhan/conversation-deid.ts').href)
const results = []
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : extra ?? ''])

const SPEAKERS = [
  { name: '戴宇星', side: 'us', aliases: ['宇星'] },
  { name: 'Lily', side: 'us' },
  { name: '王志明會計師', side: 'client', aliases: ['王志明', '王會計師'] },
  { name: '林代書', side: 'vendor' },
]
const TERMS = [
  { text: '柏翰科技', kind: 'company' },
  { text: '柏翰', kind: 'company' },
  { text: 'Google Workspace 導入', kind: 'project' },
]
const msg = (id, at, speaker, text, type = 'text') => ({ id, at, speaker, type, text })
const CORPUS = [
  msg('a1', '2026-10-12 09:14', '王志明會計師', '報價單可以分兩期付嗎？第一期 9 萬先匯到永豐 012-345-678901'),
  msg('a2', '2026-10-12 09:20', '戴宇星', '可以，我請 Lily 改報價單，週五前給您'),
  msg('a3', '2026-10-12 09:31', '王志明會計師', '好，另外陳小姐那邊請直接打 0912-345-678 找她，或寄 chen@bohan.com.tw'),
  msg('a4', '2026-10-12 09:32', '王志明會計師', '[照片]', 'image'),
  msg('a5', '2026-10-12 09:40', 'Lily', '柏翰科技的統編 12345678，地址台北市大安區忠孝東路四段100號5樓'),
  msg('a6', '2026-10-12 09:41', '林代書', '資料放這 https://drive.example.com/f/abc 賴 ID: lin_daishu88'),
  msg('a7', '2026-10-12 09:42', '', '林代書已收回訊息', 'system'),
  msg('a8', '2026-10-12 09:50', '戴宇星', '王會計師，20261016 前給您 Google Workspace 導入的結案問卷，身分證 A123456789 不用附'),
  msg('a9', '2026-10-12 09:55', 'Lily', '[貼圖]', 'sticker'),
  msg('a10', '2026-10-12 10:02', '王志明會計師', '阿豪說市話 02-2345-6789 分機 12 也可以'),
]
const run = (o = {}) => D.deidentify(CORPUS, { speakers: SPEAKERS, terms: TERMS, ...o })
const R = run()
const by = id => R.messages.find(m => m.id === id)

/* ── 1. 發話者代號 ───────────────────────────────────────── */
ok('我方用數字、外部用字母，依出現順序', R.speakerLabels['王志明會計師'] === '客戶-A' && R.speakerLabels['戴宇星'] === '我方-1' && R.speakerLabels['Lily'] === '我方-2' && R.speakerLabels['林代書'] === '廠商-A', JSON.stringify(R.speakerLabels))
ok('內文提到發話者（含別名）時換成同一個代號', by('a2').outText.includes('我方-2') && by('a8').outText.startsWith('客戶-A，'), by('a8').outText)
ok('送出內容不含任何發話者本名或別名', !/戴宇星|宇星|Lily|王志明|王會計師|林代書/.test(R.payload), R.payload)

/* ── 2. 樣式比對 ─────────────────────────────────────────── */
ok('手機', by('a3').outText.includes('〔電話〕') && !R.payload.includes('0912'))
ok('市話含分機', by('a10').outText.includes('〔電話〕') && !R.payload.includes('2345-6789'), by('a10').outText)
ok('Email', by('a3').outText.includes('〔Email〕') && !R.payload.includes('bohan.com'))
ok('銀行帳號（分段長數字）', by('a1').outText.includes('〔號碼〕') && !R.payload.includes('678901'), by('a1').outText)
ok('統編（有關鍵字）', by('a5').outText.includes('〔統編〕') && !R.payload.includes('12345678'), by('a5').outText)
ok('地址', by('a5').outText.includes('〔地址〕') && !R.payload.includes('忠孝東路'), by('a5').outText)
ok('網址', by('a6').outText.includes('〔網址〕') && !R.payload.includes('drive.example'))
ok('LINE ID', by('a6').outText.includes('〔LINE ID〕') && !R.payload.includes('lin_daishu88'), by('a6').outText)
ok('身分證字號', by('a8').outText.includes('〔證號〕') && !R.payload.includes('A123456789'))
ok('八碼日期不被當成號碼', by('a8').outText.includes('20261016'), by('a8').outText)

/* ── 3. 字典 ─────────────────────────────────────────────── */
ok('公司名與專案名', by('a5').outText.includes('〔公司A〕') && by('a8').outText.includes('〔專案A〕'), by('a5').outText + ' / ' + by('a8').outText)
ok('長的字先比：「柏翰科技」不會被「柏翰」切成半截', !by('a5').outText.includes('科技'), by('a5').outText)
const twice = D.deidentify([msg('t1', '', 'x', '柏翰科技找柏翰科技，另一家是大同')], { terms: [{ text: '柏翰科技', kind: 'company' }, { text: '大同', kind: 'company' }] })
ok('同一個名字同一個代號，不同名字不同代號', twice.messages[0].outText === '〔公司A〕找〔公司A〕，另一家是〔公司B〕', twice.messages[0].outText)

/* ── 4. 金額 ─────────────────────────────────────────────── */
ok('金額預設保留', by('a1').outText.includes('9 萬'))
const noAmt = run({ keepAmounts: false })
ok('切換後遮蔽金額', noAmt.messages.find(m => m.id === 'a1').outText.includes('〔金額〕') && !noAmt.payload.includes('9 萬'), noAmt.messages.find(m => m.id === 'a1').outText)

/* ── 5. 非文字訊息 ───────────────────────────────────────── */
ok('圖片只留佔位', by('a4').outText === '〔圖片〕' && by('a4').sent)
ok('貼圖與系統訊息整則略去', !by('a7').sent && !by('a9').sent && R.stats.skipped === 2)
ok('行號只編給會送出的訊息，且連續', R.messages.filter(m => m.sent).map(m => m.index).join() === '1,2,3,4,5,6,7,8', R.messages.map(m => m.index).join())

/* ── 6. 疑似人名（已知限制） ─────────────────────────────── */
ok('帶稱謂的字串標為疑似、但不遮', R.stats.suspects.includes('陳小姐') && by('a3').outText.includes('陳小姐'), R.stats.suspects.join())
ok('字典外、沒有稱謂的名字抓不到（已知限制，須靠人工確認）', by('a10').outText.includes('阿豪') && !R.stats.suspects.includes('阿豪'))
const fixed = run({ terms: [...TERMS, { text: '陳小姐', kind: 'person' }, { text: '阿豪', kind: 'person' }] })
ok('人補上遮蔽詞後就被遮住，疑似提示消失', !/陳小姐|阿豪/.test(fixed.payload) && !fixed.stats.suspects.includes('陳小姐'), fixed.payload)

/* ── 7. 人的決定 ─────────────────────────────────────────── */
const phoneKey = by('a3').segments.find(s => s.mask?.kind === 'phone').mask.key
const restored = run({ restored: [phoneKey] })
ok('還原一處遮蔽：那一處回到原文，其他不變', restored.payload.includes('0912-345-678') && !restored.payload.includes('bohan.com') && restored.stats.restored === 1)
ok('還原會改變指紋（確認因此失效）', restored.fingerprint !== R.fingerprint)
const excl = run({ excluded: ['a5'] })
ok('排除整則：不在送出內容裡', !excl.payload.includes('〔統編〕') && excl.stats.excluded === 1 && !excl.messages.find(m => m.id === 'a5').sent)
ok('被排除的發話者，名字在別則仍被遮', !D.deidentify(CORPUS, { speakers: SPEAKERS, terms: TERMS, excluded: ['a2', 'a8'] }).payload.includes('戴宇星'))

/* ── 8. 確定性與洩漏檢查 ─────────────────────────────────── */
ok('同樣輸入、同樣輸出與指紋', run().payload === R.payload && run().fingerprint === R.fingerprint)
ok('指紋對內容敏感', D.payloadFingerprint(R.payload) !== D.payloadFingerprint(R.payload + ' '))
ok('findLeaks：正常結果沒有洩漏', D.findLeaks(R).length === 0, D.findLeaks(R).join())
ok('findLeaks：偽造一份漏掉的結果會被抓到', D.findLeaks({ ...R, payload: R.payload + '\n9. 客戶-A：0912-345-678' }).includes('0912-345-678'))
ok('遮蔽統計與實際段落一致', R.stats.maskTotal === R.messages.flatMap(m => m.segments).filter(s => s.mask && !s.mask.restored).length)

/* ── 9. 日期切片與匯出檔解析 ─────────────────────────────── */
const EXPORT = `[LINE] 柏翰客戶群的聊天記錄
儲存日期：2026/10/12 17:00

2026/10/09（五）
下午05:40\t戴宇星\t週五前把結案問卷初稿給您
17:41\t王志明\t[照片]
2026/10/12（一）
09:14\t王志明\t報價單可以分兩期付嗎？
09:15\t王志明\t"第一行
第二行"
09:16\t王志明已退出群組
上午12:05\t戴宇星\t收到`
const P = D.parseLineExport(EXPORT)
ok('匯出檔：標題與發話者', P.title === '柏翰客戶群' && P.speakers.join() === '戴宇星,王志明', P.title + ' | ' + P.speakers.join())
ok('匯出檔：日期標頭與上午／下午換算', P.messages[0].at === '2026-10-09 17:40' && P.messages.at(-1).at === '2026-10-12 00:05', P.messages[0].at + ' ' + P.messages.at(-1).at)
ok('匯出檔：[照片] 是圖片佔位', P.messages[1].type === 'image')
ok('匯出檔：多行訊息接成一則', P.messages[3].text === '第一行\n第二行', JSON.stringify(P.messages[3].text))
ok('匯出檔：沒有發話者的行是系統訊息', P.messages[4].type === 'system')
ok('依日期切片（含頭含尾）', D.sliceByDate(P.messages, '2026-10-12', '2026-10-12').length === 4 && D.sliceByDate(P.messages, '2026-10-09', '2026-10-09').length === 2)
const plain = D.parseLineExport('王志明：可以分兩期嗎\n戴宇星: 可以')
ok('退路：「名字：內容」一行一則', plain.messages.length === 2 && plain.speakers.join() === '王志明,戴宇星' && plain.messages[1].text === '可以')

let fail = 0
for (const [s, n, e] of results) { if (s === 'FAIL') fail++; console.log(`${s}  ${n}${e ? `\n      → ${e}` : ''}`) }
console.log(`\n${results.length - fail}/${results.length} PASS`)
process.exit(fail ? 1 : 0)
