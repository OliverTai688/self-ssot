/* 檔案物件 P1（ASSET-005）的驗收 harness。
 *
 *   node scripts/verify-asset-object.mjs
 *
 * 做法與 verify-object-index / verify-agenda-object 一樣：把 asset-object.source.js
 * 原封不動放進最小樁環境實際執行 —— 不抄第二份邏輯，測的就是會被打包進 runtime 的那份。
 * 上傳的網路那一段由樁接住（prototype 模式本來就不打網路）。真的拖放、真的 R2 round trip
 * 在 2026-10-07 以本機 database 模式的瀏覽器走過一次（見該日的證據報告）；
 * 這支守的是那一次看出來的問題不會再回來。
 *
 * 契約層（白名單、上限、參考碼、狀態機、授權）在 verify-asset-pipeline.mjs，不重複。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const V5 = path.join(ROOT, 'src/components/yuanzhan/v5')
const CONTRACT = await import(pathToFileURL(path.join(ROOT, 'src/lib/ui-data/yuanzhan/operating-assets.ts')).href)

const results = []
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, extra || ''])

/* ---------------- 樁環境 ---------------- */

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const TEXTY = t => t !== 'divider' && t !== 'obj'
const TODAY = '2026-09-28'

let bidSeq = 0
const newBid = () => 'b' + (++bidSeq)
let nidSeq = 0
const nid = p => p + '-' + (++nidSeq)

const DB = { me: 'yz', assets: [], docObjects: [], journal: {}, issues: [], projects: [], txns: [], decisions: [], events: [], people: { yz: { n: '宇星' }, lily: { n: 'Lily' } } }
const S = { jday: TODAY }
let blocks = []

const calls = { openModal: 0, openDrawer: [], toast: [], render: 0, baseObjHtml: 0, baseDropBlk: 0, baseDragOver: 0, baseSummon: [] }

const stubs = {
  DB, S, TODAY, esc, TEXTY, newBid, nid,
  I: {},
  space: 'team',
  OP_LIVE: false,
  active: true,
  DRAWERS: {},
  // 兩個群組就夠：擴充只 push 到 SUMMON[1]。
  SUMMON: [{ g: '模板', items: [] }, { g: '物件', items: [] }],
  root: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], append() {} },
  doc: { createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {}, click() {}, remove() {}, append() {} }) },
  // 卸載時要釋放 blob 網址與播放器，所以這裡要掛得上 abort 監聽。
  controller: { signal: { addEventListener() {} } },
  wire: () => {},
  URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
  window: { matchMedia: () => ({ matches: false }) },
  listen: () => {},
  setTimeout: () => 0,
  canWriteJournal: () => true,
  deny: () => { calls.toast.push('deny'); },
  toast: m => calls.toast.push(String(m)),
  render: () => { calls.render += 1 },
  syncAll: () => {},
  snap: () => {},
  blks: () => blocks,
  bOf: id => blocks.find(b => b.id === id) || null,
  bIdx: id => blocks.findIndex(b => b.id === id),
  audit: () => {},
  person: k => (DB.people[k] || {}).n || k,
  svg: k => '<svg data-i="' + k + '"></svg>',
  openModal: (...args) => { calls.openModal += 1; calls.modalArgs = args },
  closeModal: () => {},
  openDrawer: (t, id) => calls.openDrawer.push([t, id]),
  ensureSecBlocks: sec => (sec.blocks = sec.blocks || []),
  objHtml: () => { calls.baseObjHtml += 1; return '<base-obj>' },
  mentionHits: () => [{ mention: true, ty: 'issue', rid: 'ISS-001', nm: '既有工作' }],
  objJump: () => {},
  summonObject: ty => calls.baseSummon.push(ty),
  dragOver: () => { calls.baseDragOver += 1 },
  dropBlk: () => { calls.baseDropBlk += 1 },
  fetch: async () => ({ ok: false, json: async () => ({ error: '樁環境不打網路' }) }),
  XMLHttpRequest: function () { this.upload = {}; this.open = () => {}; this.setRequestHeader = () => {}; this.send = () => {} },
  FileReader: function () { this.readAsDataURL = () => { if (this.onload) this.onload() }; this.result = 'data:image/png;base64,AA' },
  File: function (parts, name, opts) { return { name, type: (opts || {}).type || '', size: 1 } },
  navigator: { clipboard: { writeText: async () => {} } },
  nowts: () => '14:32',
  // 由 generator 的 import 提供的契約
  astClassify: CONTRACT.classifyAsset,
  AST_LABELS: CONTRACT.ASSET_KIND_LABELS,
  astFmtBytes: CONTRACT.formatBytes,
  astReferenceable: CONTRACT.isAssetReferenceable,
}

const code = fs.readFileSync(path.join(V5, 'asset-object.source.js'), 'utf8')
const exported = 'return { assetIntake, astInsert, astCard, astRefCount, astFacts, astOf, objHtml, mentionHits, objJump, summonObject, dragOver, dropBlk, DRAWERS, SUMMON, I };'
const names = Object.keys(stubs)
const api = new Function(...names, code + '\n' + exported)(...names.map(n => stubs[n]))

const mkFile = (name, size, type) => ({ name, size, type: type || '' })
const reset = () => { DB.assets.length = 0; blocks = [{ id: 'b0', t: 'p', ind: 0, text: '' }]; bidSeq = 0; nidSeq = 0; calls.toast.length = 0 }
/* dropBlk 刻意不 await assetIntake（使用者要能繼續打字），所以它的後續會落在
   下一個 tick。測完拖放要先把佇列排乾淨，否則上一節的 toast 與列會污染下一節。 */
const flush = () => new Promise(r => globalThis.setTimeout(r, 0))

/* ---------------- 1. 型別註冊 ---------------- */

ok('icon 表補上 image／audio／video／play（svg() 對未知 key 會靜默畫空 svg）',
  ['image', 'audio', 'video', 'play'].every(k => typeof api.I[k] === 'string' && api.I[k].length > 10))

const summonItem = api.SUMMON[1].items.find(x => x.k === 'asset')
ok('# 召喚選單多一項「附件」', !!summonItem && summonItem.nm === '附件', summonItem && summonItem.ic)

ok('DRAWERS.asset 已註冊', typeof api.DRAWERS.asset === 'function')

/* ---------------- 2. 區塊插入 ---------------- */

reset()
api.astInsert('AST-JRNL-000001-20260928', 'b0')
ok('空行就地換成物件區塊（不留一行空白）',
  blocks[0].t === 'obj' && blocks[0].obj.rid === 'AST-JRNL-000001-20260928' && blocks.length === 2 && blocks[1].t === 'p',
  blocks.map(b => b.t).join(','))

reset()
blocks[0].text = '客戶回的比價表'
api.astInsert('AST-JRNL-000002-20260928', 'b0')
ok('有字的行不被覆蓋，物件接在它下面',
  blocks[0].text === '客戶回的比價表' && blocks[1].t === 'obj' && blocks[2].t === 'p',
  blocks.map(b => b.t).join(','))

reset()
const b1 = api.astInsert('AST-A', 'b0')
api.astInsert('AST-B', b1)
ok('多個檔案各自一張卡片，依序排列（不擠在同一行）',
  blocks.filter(b => b.t === 'obj').map(b => b.obj.rid).join(',') === 'AST-A,AST-B',
  blocks.map(b => b.t).join(','))

reset()
api.astInsert('AST-C', null)
ok('沒有錨點時附加在最後，仍補一行可繼續打字',
  blocks[blocks.length - 2].t === 'obj' && blocks[blocks.length - 1].t === 'p')

reset()
api.astInsert('AST-D', 'b0')
ok('物件區塊帶 bornAt（物件索引的時間欄靠它）',
  typeof blocks[0].obj.bornAt === 'number' && blocks[0].obj.bornAt > 0)

/* ---------------- 3. 卡片三態 ---------------- */

const mkAsset = over => Object.assign({
  id: 'AST-JRNL-000010-20260928', name: '供應商比價_v3.xlsx', kind: 'sheet',
  bytes: 4.2 * 1024 * 1024, status: 'ready', space: 'team', author: 'yz',
  day: TODAY, objectKey: 'operating/ws/asset/2026-09/u.xlsx', bornAt: 1
}, over || {})

reset()
DB.assets.push(mkAsset({ status: 'uploading', pct: 62 }))
let html = api.astCard({ id: 'b0', obj: { ty: 'asset', rid: 'AST-JRNL-000010-20260928' } })
ok('uploading：顯示百分比與進度條，且進度條可被單獨定位更新',
  html.includes('62%') && html.includes('data-ast-prog="AST-JRNL-000010-20260928"'))

reset()
DB.assets.push(mkAsset({ status: 'failed', err: '傳到 41% 時連線中斷' }))
html = api.astCard({ id: 'b0', obj: { ty: 'asset', rid: 'AST-JRNL-000010-20260928' } })
ok('failed：留在原地、講得出原因、給得出下一步',
  html.includes('ast-failed') && html.includes('連線中斷') && html.includes('重新選擇檔案') && html.includes('移除'))

reset()
DB.assets.push(mkAsset())
html = api.astCard({ id: 'b0', obj: { ty: 'asset', rid: 'AST-JRNL-000010-20260928' } })
ok('ready：帶型別 chip、檔名、參考碼與大小',
  html.includes('試算表') && html.includes('供應商比價_v3.xlsx') && html.includes('AST-JRNL-000010-20260928') && html.includes('4.2 MB'),
  html.match(/4\.\d MB/) && html.match(/4\.\d MB/)[0])

reset()
html = api.astCard({ id: 'b0', obj: { ty: 'asset', rid: '不存在' } })
ok('物件不見了：卡片說得出來，不是空白', html.includes('檔案已刪除'))

reset()
DB.assets.push(mkAsset({ name: '<script>x</script>.pdf', kind: 'pdf' }))
html = api.astCard({ id: 'b0', obj: { ty: 'asset', rid: 'AST-JRNL-000010-20260928' } })
ok('檔名有跳脫（檔名是使用者輸入）', !html.includes('<script>') && html.includes('&lt;script&gt;'))

reset()
DB.assets.push(mkAsset({ space: 'personal' }))
ok('私人檔案在卡片上標示出來', api.astFacts(DB.assets[0]).some(f => f.includes('私人')))

/* ---------------- 4. 接進既有物件機制 ---------------- */

reset()
DB.assets.push(mkAsset())
ok('objHtml：asset 走新卡片', api.objHtml({ id: 'b0', obj: { ty: 'asset', rid: mkAsset().id } }).includes('供應商比價'))
const before = calls.baseObjHtml
ok('objHtml：其他型別原樣交還給原本的實作',
  api.objHtml({ id: 'b0', obj: { ty: 'issue', rid: 'ISS-1' } }) === '<base-obj>' && calls.baseObjHtml === before + 1)

reset()
DB.assets.push(mkAsset())
DB.assets.push(mkAsset({ id: 'AST-UP', name: '傳到一半.mp4', kind: 'video', status: 'uploading' }))
DB.assets.push(mkAsset({ id: 'AST-BAD', name: '壞了.pdf', kind: 'pdf', status: 'failed' }))
let hits = api.mentionHits('')
ok('@ 選單保留既有物件（沒有取代掉原本的實作）', hits.some(h => h.rid === 'ISS-001'))
ok('驗收8 · @ 選單只收 ready 的檔案',
  hits.some(h => h.rid === mkAsset().id) && !hits.some(h => h.rid === 'AST-UP') && !hits.some(h => h.rid === 'AST-BAD'))
ok('@ 選單的檔案列帶人話型別與大小',
  (hits.find(h => h.ty === 'asset') || {}).ds.includes('試算表'))
hits = api.mentionHits('比價')
ok('@ 可用檔名搜尋', hits.some(h => h.ty === 'asset'))
hits = api.mentionHits('完全不存在的字')
ok('搜不到就不列（不會把全部檔案倒出來）', !hits.some(h => h.ty === 'asset'))

reset()
DB.me = 'lily'
DB.assets.push(mkAsset({ space: 'personal', author: 'yz' }))
ok('別人的私人檔不出現在我的 @ 選單', !api.mentionHits('').some(h => h.ty === 'asset'))
DB.me = 'yz'
ok('自己的私人檔出現在自己的 @ 選單', api.mentionHits('').some(h => h.ty === 'asset'))

calls.openDrawer.length = 0
api.objJump('asset', 'AST-X')
ok('objJump：asset 開抽屜', calls.openDrawer.length === 1 && calls.openDrawer[0][0] === 'asset')
api.objJump('issue', 'ISS-1')
ok('objJump：其他型別原樣交還', calls.openDrawer.length === 1)

const modalBefore = calls.openModal
api.summonObject('asset', 'b0')
ok('# 附件：開檔案來源選單，不是開表單', calls.openModal === modalBefore + 1)
api.summonObject('issue', 'b0')
ok('# 其他型別：原樣交還給原本的召喚流程', calls.baseSummon.includes('issue'))

/* ---------------- 5. 反向引用 ---------------- */

reset()
DB.journal = {
  '2026-09-28': { blocks: [{ t: 'obj', obj: { ty: 'asset', rid: 'AST-R' } }, { t: 'p', text: '' }] },
  '2026-09-27': { blocks: [{ t: 'obj', obj: { ty: 'asset', rid: 'AST-R' } }] }
}
DB.docObjects = [{ id: 'MEETING-1', secs: [{ blocks: [{ t: 'obj', obj: { ty: 'asset', rid: 'AST-R' } }] }] }]
ok('被引用次數含跨日與文件段落內的引用', api.astRefCount('AST-R') === 3, String(api.astRefCount('AST-R')))
ok('沒被引用的檔案算 0', api.astRefCount('AST-NONE') === 0)
DB.journal = {}
DB.docObjects = []

/* ---------------- 6. 拖放 ---------------- */

reset()
const dtFiles = { dataTransfer: { files: [mkFile('a.png', 1000, 'image/png')], types: ['Files'] }, preventDefault() { this._p = 1 }, stopPropagation() {}, currentTarget: { classList: { add() {} } } }
const dropBefore = calls.baseDropBlk
api.dropBlk(dtFiles, 'b0')
ok('拖檔案進來走上傳，不進區塊排序', calls.baseDropBlk === dropBefore)

const dtBlocks = { dataTransfer: { files: [], types: ['text/plain'] }, preventDefault() {}, stopPropagation() {} }
api.dropBlk(dtBlocks, 'b0')
ok('拖區塊仍然是排序（沒有被檔案上傳搶走）', calls.baseDropBlk === dropBefore + 1)

const overBefore = calls.baseDragOver
api.dragOver(dtFiles, 'b0')
ok('dragover 帶檔案時 preventDefault（不 preventDefault 瀏覽器就不會觸發 drop）', dtFiles._p === 1 && calls.baseDragOver === overBefore)
api.dragOver(dtBlocks, 'b0')
ok('dragover 不帶檔案時交還給排序', calls.baseDragOver === overBefore + 1)

/* ---------------- 7. 白名單與伺服器同一句話 ---------------- */

await flush()
reset()
await api.assetIntake([mkFile('報告.docm', 1000)], 'b0')
const contractMsg = CONTRACT.classifyAsset({ name: '報告.docm', bytes: 1000 }).error
ok('前端擋下來的理由與伺服器一字不差',
  calls.toast.length === 1 && calls.toast[0] === esc(contractMsg), calls.toast[0])
ok('被擋下來的檔案不會留下任何一列', DB.assets.length === 0)

reset()
await api.assetIntake([mkFile('大圖.png', 30 * 1024 * 1024)], 'b0')
ok('超過該 kind 的上限被擋，訊息說得出上限與實際大小',
  calls.toast[0].includes('25 MB') && calls.toast[0].includes('30 MB'), calls.toast[0])

reset()
await api.assetIntake([mkFile('筆記.txt', 2048), mkFile('表.xlsx', 4096)], 'b0')
ok('一次拖多個檔案 → 各自一列物件', DB.assets.length === 2, DB.assets.map(a => a.kind).join(','))
ok('一次拖多個檔案 → 各自一張卡片', blocks.filter(b => b.t === 'obj').length === 2)

reset()
await api.assetIntake([mkFile('好的.txt', 10), mkFile('壞的.exe', 10), mkFile('也好.pdf', 10)], 'b0')
ok('一批裡有壞檔時，好的照上、壞的只跳訊息', DB.assets.length === 2)

/* ---------------- 7b. 選檔視窗、召喚、卡片內播放 ---------------- */
/* 這一節補的是 2026-10-07 在瀏覽器裡才看出來的三件事：選檔視窗整個是壞的
   （openModal 收的是位置參數，原本傳了一個物件，畫面上是 [object Object] 加一顆 undefined）、
   影片與音訊在日誌裡只是一顆膠囊、而重試會把檔案傳到舊 key 再去核對新 key。 */

reset()
calls.modalArgs = null
api.summonObject('asset', 'b0')
ok('# 附件 → 選檔視窗：openModal 收到的是（標題字串、說明、內文、頁尾）四個位置參數',
  Array.isArray(calls.modalArgs) && calls.modalArgs.length === 4 && calls.modalArgs.every(a => typeof a === 'string') &&
  calls.modalArgs[0] === '加入檔案', calls.modalArgs && calls.modalArgs.map(a => typeof a).join(','))
const modalBody = String(calls.modalArgs?.[2] ?? ''), modalFoot = String(calls.modalArgs?.[3] ?? '')
ok('選檔視窗把圖片／影片／音訊／其他檔案四種選法攤開',
  ['圖片', '影片', '音訊', '其他檔案'].every(t => modalBody.includes('>' + t + '<')) &&
  ["astPick('image'", "astPick('video'", "astPick('audio'", "astPick('file'"].every(t => modalBody.includes(t)))
ok('選檔視窗有取消，不是一顆 undefined', modalFoot.includes('取消') && !modalFoot.includes('undefined'))
ok('桌機不給「拍照／錄影」（按了只是再開一次選檔視窗）', !modalBody.includes("astPick('camera'"))

const summonKeys = api.SUMMON[1].items.map(x => x.k)
ok('# 召喚選單有圖片、影片、音訊各一項',
  ['image', 'video', 'audio'].every(k => summonKeys.includes(k)), summonKeys.join(','))
ok('召喚項目的圖示都在 icon 表裡（未知 key 會畫出空 svg）',
  api.SUMMON[1].items.filter(x => ['image', 'video', 'audio', 'asset'].includes(x.k)).every(x => x.ic === 'paperclip' || typeof api.I[x.ic] === 'string'))
const baseSummonBefore = calls.baseSummon.length
api.summonObject('video', 'b0')
ok('# 影片直接開選檔視窗，不落到原本的 summonObject', calls.baseSummon.length === baseSummonBefore)

reset()
DB.assets.push(mkAsset({ id: 'AST-V', name: '現場.mp4', kind: 'video' }))
html = api.astCard({ id: 'bv', obj: { ty: 'asset', rid: 'AST-V' } })
ok('影片卡片：有播放器的位置，而且是整張卡片（不被雙欄日誌收成膠囊）',
  html.includes('data-ast-media="AST-V"') && html.includes('ast-card') && html.includes('data-ast-where="bv"'))
DB.assets.push(mkAsset({ id: 'AST-A', name: '訪談.m4a', kind: 'audio' }))
html = api.astCard({ id: 'ba', obj: { ty: 'asset', rid: 'AST-A' } })
ok('音訊卡片：有播放器的位置', html.includes('data-ast-media="AST-A"') && html.includes('ast-audio'))
DB.assets.push(mkAsset({ id: 'AST-I', name: '白板.png', kind: 'image' }))
html = api.astCard({ id: 'bi', obj: { ty: 'asset', rid: 'AST-I' } })
ok('圖片卡片：有縮圖的位置，且用屬性定位（同一份檔案嵌兩處不會撞 id）',
  html.includes('data-ast-thumb="AST-I"') && !/id="astH-/.test(html))
DB.assets.push(mkAsset())
html = api.astCard({ id: 'b0', obj: { ty: 'asset', rid: 'AST-JRNL-000010-20260928' } })
ok('試算表等其他檔案維持精簡膠囊（沒有主體就不撐成整張卡片）', !html.includes('ast-card') && !html.includes('data-ast-media'))

reset()
DB.assets.push(mkAsset({ id: 'AST-UP2', name: '大影片.mp4', kind: 'video', status: 'uploading', pct: 12 }))
html = api.astCard({ id: 'b0', obj: { ty: 'asset', rid: 'AST-UP2' } })
ok('uploading：可以取消，百分比數字可被單獨更新',
  html.includes("astCancel('AST-UP2')") && html.includes('data-ast-pct="AST-UP2"'))
ok('uploading 與 failed 是整張卡片（膠囊樣式會把進度與「重試／取消」藏掉）', html.includes('ast-card'))

const src = fs.readFileSync(path.join(V5, 'asset-object.source.js'), 'utf8')
ok('上傳只要一次預簽（astUpload 自己不再去要，否則每個檔案多一列孤兒）',
  !/async function astUpload[\s\S]*?astPresign\(/.test(src.split('/** 正在傳的那幾個請求')[0].split('async function astUpload')[1] || 'astPresign('))
ok('重試沿用同一列（retryOf），不另建一列、不換參考碼',
  /astPresign\(file, row\.assetId\)/.test(src) && /retryOf/.test(src))
ok('PUT 用伺服器回的 Content-Type（簽進網址的那一個）', /contentType: signed\.contentType/.test(src))
ok('下載走附件簽名（跨來源的 <a download> 無效，會把人帶離工作台）', src.includes("'?download=1&key='"))
ok('播放器跨 render() 保留同一個節點', /const astBaseRender = render/.test(src) && /AST_PLAYERS/.test(src))

const route = fs.readFileSync(path.join(ROOT, 'src/app/api/company/operating/uploads/route.ts'), 'utf8')
ok('上傳路由認得 retryOf，並把簽進網址的 Content-Type 回給前端',
  route.includes('reopenAssetUpload') && /contentType,\s*\n\s*multipart/.test(route))
ok('下載檔名取資產列上的，不收前端送來的', route.includes('grant.displayName') && !/searchParams\.get\("name"\)/.test(route))

ok('沒給型別時依副檔名補 Content-Type',
  CONTRACT.resolveAssetContentType({ name: '錄音.wav', mimeType: '' }) === 'audio/wav' &&
  CONTRACT.resolveAssetContentType({ name: 'IMG_0001.MOV', mimeType: null }) === 'video/quicktime')
ok('瀏覽器有給型別就用它的（它 PUT 時送的就是那個）',
  CONTRACT.resolveAssetContentType({ name: 'a.m4a', mimeType: 'audio/x-m4a' }) === 'audio/x-m4a')

/* ---------------- 8. 靜態接線檢查 ---------------- */

const oi = fs.readFileSync(path.join(V5, 'object-index.source.js'), 'utf8')
ok('物件索引加了 asset 帳本（型別 facet 自動多一格）', /asset:\s*\{[^}]*nm:\s*'檔案'/s.test(oi))
ok('物件索引只列 ready 的檔案', /status === 'ready'/.test(oi))
ok('物件索引用 nameOf 取檔名（檔案的名字在 .name 不在 .t）', oi.includes('L.nameOf ? L.nameOf(x)'))

const jc = fs.readFileSync(path.join(V5, 'journal-cockpit.source.js'), 'utf8')
ok('日誌欄頭有「附件」按鈕（手機那道門）', jc.includes("astOpenPicker('')") && jc.includes('附件'))

const gen = fs.readFileSync(path.join(ROOT, 'scripts/generate-yuanzhan-v5.mjs'), 'utf8')
ok('generator 併入 asset-object 與它的 CSS',
  // 只看有沒有被列進去；它後面還有別的擴充檔（pm-*、link-object），不能要求它排最後。
  gen.includes("'asset-object'") && gen.includes('asset-object.css'))
ok('generator 匯入共用契約（前端不自己抄一份白名單）',
  gen.includes("from '@/lib/ui-data/yuanzhan/operating-assets'"))

const store = fs.readFileSync(path.join(ROOT, 'src/lib/services/operating-store.service.ts'), 'utf8')
ok('store 讀回 assets，且沿用文件庫的 team／personal 規則',
  /db\.operatingAsset\.findMany/.test(store) && /status: "ready"/.test(store) &&
  /OR: \[\{ space: "team" \}, \{ authorKey: \{ in: viewerSeatKeys \} \}\]/.test(store.split('db.operatingAsset.findMany')[1].slice(0, 400)))
ok('store 用 refCode 當工作台 id（一份檔案一個身分）', /id: row\.refCode/.test(store))

const css = fs.readFileSync(path.join(V5, 'asset-object.css'), 'utf8')
const hardcoded = css.split('\n').filter(l => /#[0-9a-fA-F]{3,8}/.test(l) && !/var\(/.test(l))
ok('CSS 沒有 var() fallback 以外的硬編碼色', hardcoded.length === 0, hardcoded[0] || '')
ok('CSS 有手機斷點', css.includes('@media (max-width: 760px)'))

const runtime = fs.readFileSync(path.join(V5, 'runtime.js'), 'utf8')
ok('生成檔帶進了檔案物件', runtime.includes('assetIntake') && runtime.includes('DRAWERS.asset'))
ok('生成檔沒有 inline handler（擴充寫 onclick 由 generator 轉成 bind）', !runtime.includes('onclick="'))

/* ---------------- 報告 ---------------- */
const pad = s => s + ' '.repeat(Math.max(0, 66 - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)))
let fail = 0
for (const [st, name, extra] of results) { if (st === 'FAIL') fail++; console.log(`${st}  ${pad(name)}${extra ? '  — ' + extra : ''}`) }
console.log(`\n${results.length - fail}/${results.length}` + (fail ? ' — FAILED' : ' PASS'))
process.exit(fail ? 1 : 0)
