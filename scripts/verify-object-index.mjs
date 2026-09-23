/* 物件索引（日誌第三分頁）資料層的驗收測試。
   verify-yuanzhan-v5.cjs 需要 playwright / 真瀏覽器，開發機與雲端沙箱都跑不起來；
   這支改用最強的安全替代：把 object-index.source.js 的純資料層放進最小樁環境實際執行，
   逐條對應 journal-tagstream-object-index-proposals.html 的驗收清單。
   涵蓋驗收 1、3、4、5、6、7、8；驗收 2、9、10、11 需要真瀏覽器，由 Owner 在本機確認。
   用法：node scripts/verify-object-index.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/components/yuanzhan/v5/object-index.source.js');
let code = fs.readFileSync(SRC, 'utf8');
// 去掉最後兩段需要真實 VIEWS/WB 的接線，其餘原樣執行。
code = code.split('/* 分頁改名')[0];

const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TEXTY = t => t !== 'divider' && t !== 'obj';
const DOC_METAS = {
  standup: { nm: 'Standup', chip: 'c-p', color: 'var(--pri)' },
  meeting: { nm: '會議紀錄', chip: 'c-i', color: 'var(--info)' },
  retro: { nm: '回顧', chip: 'c-w', color: 'var(--warn)' }
};
const metaOf = d => DOC_METAS[d.type] || { nm: d.title || '文件', chip: 'c-p', color: 'var(--pri)' };
const ensureSecBlocks = sec => (sec.blocks = sec.blocks || []);
const docObjectName = d => d.title;

const DB = {
  me: 'yz', seq: {},
  issues: [{ id: 'ISS-001', t: '通路合約條款需法務複核', created: '2026-09-11' },
           { id: 'ISS-777', t: '不是從日誌召喚出來的工作', created: '2026-07-02' }],
  txns: [], projects: [], decisions: [], events: [],
  docObjects: [
    { id: 'MEETING-JRNL-000118-20260912', type: 'meeting', title: '會議紀錄：Q4 通路合約條款與分潤',
      day: '2026-09-12', author: 'yz', createdAt: Date.UTC(2026, 8, 12, 6, 20), updatedAt: Date.UTC(2026, 8, 13, 2, 2),
      secs: [{ title: '決議', blocks: [{ id: 'b1', t: 'p', ind: 0, text: '分潤級距改以季累計計算，法務要求補上終止條款' }] },
             { title: '待辦', blocks: [{ id: 'b2', t: 'obj', ind: 0, obj: { ty: 'issue', rid: 'ISS-001', bornAt: Date.UTC(2026, 8, 12, 6, 44) } }] }] },
    { id: 'RETRO-JRNL-000098-20260829', type: 'retro', title: '回顧：Sprint 22 交付延遲的三個摩擦點',
      day: '2026-08-29', author: 'yz', createdAt: Date.UTC(2026, 7, 29, 9, 30), updatedAt: 0,
      secs: [{ title: '做不好', blocks: [{ id: 'b3', t: 'p', ind: 0, text: '交期估算沒有把供應商的回覆時間算進去' }] }] }
  ]
};
// 日誌：9/12 有標題（時間地標）並召喚了會議紀錄；8/29 的回顧「那一行被刪掉了」。
DB.journal = {
  '2026-09-12': { title: '通路合約週', blocks: [
    { id: 'j1', t: 'p', ind: 0, text: '早上先把合約條款過一遍' },
    { id: 'j2', t: 'obj', ind: 0, obj: { ty: 'doc_object', rid: 'MEETING-JRNL-000118-20260912', bornAt: Date.UTC(2026, 8, 12, 6, 20) } }
  ] },
  '2026-08-29': { title: 'Sprint 22 收尾', blocks: [{ id: 'j3', t: 'p', ind: 0, text: '收尾' }] }
};
DB.journalBooks = { team: { yz: DB.journal, lily: {} } };

const S = { jday: '2026-09-12', wb: 'journal', tab: 2 };
const TODAY = '2026-09-12';
const stubs = {
  DB, S, TODAY, esc, TEXTY, DOC_METAS, metaOf, ensureSecBlocks, docObjectName,
  svg: () => '', panel: (t, s, b) => b, guide: () => '', render: () => {},
  root: { querySelector: () => null }, runtime: {}, toast: () => {},
  openDocPage: () => {}, objJump: () => {}, saveJournalDraft: () => {},
  navigator: { clipboard: null }
};
const names = Object.keys(stubs);
const exported = 'return {oiRows,oiCompute,oiSourceIndex,oiSnippet,oiView,OI,oiTable,oiTimeline,oiFacets};';
const api = new Function(...names, code + '\n' + exported)(...names.map(n => stubs[n]));

/* ---- 驗收 1：doc_object 顯示真名，不是「已刪除」 ---- */
const rows = api.oiRows();
const meet = rows.find(r => r.id === 'MEETING-JRNL-000118-20260912');
ok('驗收1 doc_object 顯示真實名稱與人話型別', !!meet && meet.name.includes('Q4 通路合約') && meet.tyNm === '會議紀錄', meet && meet.tyNm + ' / ' + meet.name);
ok('驗收1 沒有任何列落到「已刪除」', !rows.some(r => r.name === '已刪除'));

/* ---- 驗收3：日誌那一行被刪掉，物件仍列出且 src 為空 ---- */
const retro = rows.find(r => r.id === 'RETRO-JRNL-000098-20260829');
ok('驗收3 孤兒物件仍在索引裡', !!retro, retro && retro.name);
ok('驗收3 孤兒物件的來源為空（畫面顯示「來源日誌那一行已刪除」）', !!retro && retro.src === null);

/* ---- 驗收4：在元件段落裡召喚的物件，來源指到那份文件 ---- */
const iss = rows.find(r => r.id === 'ISS-001');
ok('驗收4 段落內召喚的物件有被索引到', !!iss && !!iss.src, iss && JSON.stringify(iss.src));
ok('驗收4 來源指向那份會議紀錄（docId）', !!iss && iss.src.docId === 'MEETING-JRNL-000118-20260912');

/* ---- 驗收6：時間誠實 ---- */
ok('驗收6 有 bornAt 的物件帶時刻', !!iss && iss.born === Date.UTC(2026, 8, 12, 6, 44));
const orphanIss = rows.find(r => r.id === 'ISS-777');
ok('驗收6 沒有 bornAt 的舊物件 born=0，畫面退回顯示日期', !!orphanIss && orphanIss.born === 0 && orphanIss.day === '2026-07-02');

/* ---- 時間地標 ---- */
ok('地標：來源欄帶當天的日誌標題', !!meet && meet.landmark === '通路合約週', meet && meet.landmark);

/* ---- 驗收5：搜尋打得到「只出現在內文」的詞 ---- */
api.OI.q = '終止條款'; api.OI.types.clear(); api.OI.jrnlOnly = false; api.OI.sort = 'born';
let r = api.oiCompute();
ok('驗收5 內文關鍵字命中', r.rows.length === 1 && r.rows[0].id === 'MEETING-JRNL-000118-20260912', 'hits=' + r.rows.length);
ok('驗收5 命中顯示標亮片段', !!r.rows[0] && /<mark>終止條款<\/mark>/.test(r.rows[0].snip), r.rows[0] && r.rows[0].snip);

api.OI.q = '供應商';
r = api.oiCompute();
ok('驗收5 第二個只在內文出現的詞也命中（回顧）', r.rows.length === 1 && r.rows[0].id === 'RETRO-JRNL-000098-20260829');

/* ---- 驗收7：facet 數字等於按下去會看到的列數 ---- */
api.OI.q = '';
r = api.oiCompute();
const base = r.base;
const meetCount = base.filter(x => x.tyKey === 'meeting').length;
api.OI.types.add('meeting');
const afterTypeFilter = api.oiCompute().rows.length;
ok('驗收7 facet 數字 = 套用後的列數', meetCount === afterTypeFilter, meetCount + ' vs ' + afterTypeFilter);
api.OI.types.clear();

/* ---- 「僅日誌誕生」過濾 ---- */
api.OI.jrnlOnly = true;
const jrnlOnly = api.oiCompute().rows;
ok('僅日誌誕生：濾掉沒有來源的物件', jrnlOnly.every(x => x.src) && jrnlOnly.length < rows.length, jrnlOnly.length + '/' + rows.length);
api.OI.jrnlOnly = false;

/* ---- 排序：依建立時間新到舊 ---- */
r = api.oiCompute();
const keys = r.rows.map(x => x.born || Date.parse(x.day + 'T00:00:00Z') || 0);
ok('排序：建立時間新到舊', keys.every((v, i) => i === 0 || keys[i - 1] >= v), keys.join(','));

/* ---- 渲染不丟例外，且 HTML 沒有未閉合的明顯破口 ---- */
let html = '';
try { html = api.oiView(); } catch (e) { html = 'THREW: ' + e.message; }
ok('表格檢視可渲染', html.includes('<table') && !html.startsWith('THREW'), html.startsWith('THREW') ? html : 'ok');
ok('表格 <tr> 開閉平衡', (html.match(/<tr/g) || []).length === (html.match(/<\/tr>/g) || []).length);
api.OI.view = 'timeline';
let tl = '';
try { tl = api.oiView(); } catch (e) { tl = 'THREW: ' + e.message; }
ok('時間軸檢視可渲染', tl.includes('oi-tl') && !tl.startsWith('THREW'), tl.startsWith('THREW') ? tl : 'ok');
api.OI.view = 'table';

/* ---- 空狀態 ---- */
const savedDocs = DB.docObjects, savedIss = DB.issues, savedJ = DB.journal;
DB.docObjects = []; DB.issues = []; DB.journal = {}; DB.journalBooks = { team: { yz: {} } };
let empty = '';
try { empty = api.oiView(); } catch (e) { empty = 'THREW: ' + e.message; }
ok('驗收8 空狀態可讀（不是空白表格）', empty.includes('還沒有任何物件') && empty.includes('前往今天的日誌'), empty.startsWith('THREW') ? empty : 'ok');
DB.docObjects = savedDocs; DB.issues = savedIss; DB.journal = savedJ; DB.journalBooks = { team: { yz: savedJ } };

const fails = results.filter(x => x[0] === 'FAIL');
for (const [st, name, extra] of results) console.log(st.padEnd(5), name, extra ? '  → ' + extra : '');
console.log('\n' + (results.length - fails.length) + '/' + results.length + ' passed');
process.exit(fails.length ? 1 : 0);
