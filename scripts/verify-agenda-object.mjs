/* 議題物件（提案 B）資料層的驗收測試。
   verify-yuanzhan-v5.cjs 需要 playwright / 真瀏覽器，開發機與雲端沙箱都跑不起來；
   依 AGENTS.md 的 Manual Blocker Fallback，這支採最強的安全替代：把
   agenda-object.source.js 原樣放進最小樁環境實際執行，逐條對應驗收清單。
   涵蓋驗收 1–12；驗收 13–15（四主題對比、真瀏覽器互動、手機寬度）需要 Owner 在本機確認。
   用法：node scripts/verify-agenda-object.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V5 = path.join(ROOT, 'src/components/yuanzhan/v5');
const code = fs.readFileSync(path.join(V5, 'agenda-object.source.js'), 'utf8');

const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, extra || '']);

/* ---------------- 最小樁環境 ---------------- */

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TEXTY = t => t !== 'divider' && t !== 'obj';
const TODAY = '2026-09-24';
const dadd = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const rqShortDay = d => String(+d.slice(5, 7)) + '/' + String(+d.slice(8, 10));

let bidSeq = 0;
const newBid = () => 'b' + (++bidSeq);

const DOC_METAS = { standup: { k: 'standup', nm: 'Standup', chip: 'c-p', color: 'var(--pri)', secs: ['Today'], placeholders: [''] } };
const TPL = { standup: { h: 'Standup', secs: ['Today'] } };
const SUMMON = [{ g: '物件模板', items: [{ k: 'standup', nm: 'Standup', ds: '', ic: '#' }] }];
const DRAWERS = { doc_object: id => ({ crumb: 'base', title: 'base:' + id, sub: '', body: '', foot: '' }) };

const DB = {
  me: 'yz', seq: {}, files: [],
  people: { yz: { n: '宇星', s: '宇', cls: 'a-yz' }, lily: { n: 'Lily', s: 'L', cls: 'a-lily' } },
  docObjects: [],
  todayIssues: [],
  journal: {},
};
DB.journal[TODAY] = {
  title: '今天', blocks: [
    { id: 'j1', t: 'p', ind: 0, text: '[行動] 繼續開發PersonalOS：這週目標是內部整理包含' },
    { id: 'j2', t: 'p', ind: 1, text: '金流模組：可以上傳發票記錄' },
    { id: 'j3', t: 'p', ind: 1, text: '專案模組：記錄實體專案資料' },
    { id: 'j4', t: 'p', ind: 1, text: '年度營運目標書與團隊節奏' },
    { id: 'j5', t: 'p', ind: 0, text: '[行動] 文齡姐和Evvon的網站設計' },
  ]
};

const S = { jday: TODAY, wb: 'journal' };
const blks = () => DB.journal[S.jday].blocks;
const bIdx = id => blks().findIndex(b => b.id === id);
const bOf = id => blks().find(b => b.id === id) || null;

const log = [];
const toasts = [];
const denies = [];
const opened = [];
const uploadQueue = [];

function blankSecBlocks() { return [{ id: newBid(), t: 'p', ind: 0, text: '' }]; }
function ensureSecBlocks(sec) { if (Array.isArray(sec.blocks) && sec.blocks.length) return sec.blocks; sec.blocks = blankSecBlocks(); return sec.blocks; }
// 與 template-objects.source.js 的 createDocObject 同形：序號走 DB.seq，參考碼 RES-018。
function createDocObject(typeKey, day) {
  const meta = DOC_METAS[typeKey];
  DB.seq.DOCREF = (DB.seq.DOCREF || 0) + 1;
  const id = typeKey.toUpperCase() + '-JRNL-' + String(DB.seq.DOCREF).padStart(6, '0') + '-' + day.replace(/-/g, '');
  const d = {
    id, type: typeKey, subType: typeKey, title: meta.nm, titleAuto: true, day, author: DB.me,
    collapsed: false, createdAt: Date.now(), updatedAt: Date.now(),
    secs: meta.secs.map(s => ({ title: s, blocks: blankSecBlocks() }))
  };
  DB.docObjects.push(d);
  return d;
}
function docObjectName(d) {
  if (d.titleAuto === false) return d.title || '議題';
  const meta = DOC_METAS[d.type];
  for (const sec of d.secs) { const f = ensureSecBlocks(sec).find(b => TEXTY(b.t) && b.text && b.text.trim()); if (f) return meta.nm + '：' + f.text.trim(); }
  return meta.nm + ' · ' + d.day;
}

const stubs = {
  DB, S, TODAY, TPL, SUMMON, DOC_METAS, DRAWERS,
  esc, TEXTY, dadd, rqShortDay, newBid, blks, bIdx, bOf,
  ensureSecBlocks, createDocObject, docObjectName,
  metaOf: d => DOC_METAS[d.type],
  docObjectTimestamp: () => '12:00 更新',
  renderDocSectionBody: (d, sec) => '<div class="eb-doc-inline-sec">' + esc(sec.title) + '</div>',
  renderDocObjectCard: () => '<BASECARD>',
  person: w => DB.people[w].n,
  rqAv: w => '<span class="av">' + DB.people[w].s + '</span>',
  svg: (name) => '<svg data-i="' + name + '"></svg>',
  toast: m => { toasts.push(String(m)); },
  deny: () => { denies.push(1); },
  render: () => {},
  syncAll: () => {},
  focusB: () => {},
  canWriteJournal: () => true,
  nowts: () => '2026-09-24 13:40',
  openDrawer: (ty, id) => opened.push([ty, id]),
  openDocPage: id => opened.push(['doc_object', id]),
  copyDocMarkdown: () => {}, deleteDocObject: () => {},
  uploadFile: (existing, after) => { const f = uploadQueue.shift(); if (f) after(f); },
  rqCompleteToday: () => {},
  rqTodayText: t => t.text,
  rqOpenClose: () => {},
  buildCmdk: () => [{ g: '既有', t: '既有項目' }],
  space: 'team',
  nav: () => {},
  runtime: {},
  root: { querySelector: () => null },
  commit: (op, ent, label, apply) => { const eff = apply() || []; log.push({ op, ent, label, eff }); return eff; },
};

const names = Object.keys(stubs);
const exported = 'return {agCreate,agPromote,agFind,agAll,agState,agOpenToday,agDueLabel,agSetDue,agCarryTo,agComplete,agReopen,agSay,agAttach,agDrafts,agTodayBody,agCloseRows,agCarryAllOpen,agPills,agThreadHtml,agConclusion,renderDocObjectCard,DRAWERS,buildCmdk,DOC_METAS,TPL,SUMMON};';
const api = new Function(...names, code + '\n' + exported)(...names.map(n => stubs[n]));

/* ---- 驗收 1：型別註冊 → 物件索引 facet 與 # 召喚選單都拿得到 ---- */
ok('1 DOC_METAS 多一個 agenda 型別（物件索引的 facet 直接讀這張表）',
  !!api.DOC_METAS.agenda && api.DOC_METAS.agenda.nm === '議題' && api.DOC_METAS.agenda.secs.join() === '內文,結論');
ok('1b TPL.agenda 存在（applySummon 判斷「這是文件模板」的依據）', !!api.TPL.agenda);
ok('1c # 召喚選單多一筆議題，圖示走 lucide 的 flag',
  api.SUMMON[0].items.some(i => i.k === 'agenda' && i.ic === 'flag'));

/* ---- 驗收 2：!議題 吃「節點＋子樹」，日誌那幾行換成一張卡 ---- */
const before = blks().length;
const doc = api.agCreate(bOf('j1'));
ok('2 議題物件建立成功，參考碼走 RES-018 格式', !!doc && /^AGENDA-JRNL-\d{6}-\d{8}$/.test(doc.id), doc && doc.id);
const body = doc.secs[0].blocks;
ok('2b 內文＝母行＋三個子項（不需要多選手勢）',
  body.length === 4 && body[0].text.startsWith('[行動] 繼續開發PersonalOS') && body[3].text === '年度營運目標書與團隊節奏',
  body.map(b => b.text.slice(0, 8)).join(' / '));
ok('2c 子項縮排以母行為基準重算', body.slice(1).every(b => b.ind === 1));
const after = blks();
ok('2d 日誌那四行被一張 obj 卡取代，後面補一個空行',
  after.length === before - 4 + 2 && after[0].t === 'obj' && after[0].obj.rid === doc.id && after[1].t === 'p' && after[1].text === '',
  after.map(b => b.t).join(','));
ok('2e 未被涵蓋的下一行原封不動', after[after.length - 1].text === '[行動] 文齡姐和Evvon的網站設計');
ok('2f 走 commit()，所以進稽核與保存佇列', log.some(l => l.op === 'create' && l.ent === '議題物件'));

/* ---- 驗收 3：空行不能變議題 ---- */
const emptyBlock = { id: 'jx', t: 'p', ind: 0, text: '   ' };
blks().push(emptyBlock);
const none = api.agCreate(emptyBlock);
ok('3 空白行不建立議題，並說明原因', none === null && toasts.some(t => t.includes('先寫下要處理的事')));
blks().pop();

/* ---- 驗收 4：三個日期 —— 提出日、到期日、帶過紀錄 ---- */
const st = api.agState(doc);
ok('4 建立時記下提出日，到期日預設未排期', st.bornDay === TODAY && st.due === '' && st.carried.length === 0);
api.agSetDue(doc.id, dadd(TODAY, 2));
ok('4b 可以設定到期日', api.agState(doc).due === dadd(TODAY, 2));
ok('4c 到期日標籤分得出今天／明天／逾期／未排期',
  api.agDueLabel('') === '未排期' && api.agDueLabel(TODAY) === '今天到期' &&
  api.agDueLabel(dadd(TODAY, 1)) === '明天到期' && api.agDueLabel(dadd(TODAY, -1)).startsWith('逾期'));

/* ---- 驗收 5：延期保留歷史（修正舊 rqDeferToday 直接覆寫 t.day 的缺陷）---- */
api.agCarryTo(doc.id, dadd(TODAY, 1));
const st5 = api.agState(doc);
ok('5 延期把今天記進 carried，並改到期日', st5.carried.length === 1 && st5.carried[0] === TODAY && st5.due === dadd(TODAY, 1));
ok('5b 提出日沒有被覆寫 —— 看得出這件事原本是哪天提出的', st5.bornDay === TODAY);

/* ---- 驗收 6：到期日排到未來就不算今日議題 ---- */
ok('6 到期日在明天 → 不出現在今日議題', api.agOpenToday().length === 0);
api.agSetDue(doc.id, TODAY);
ok('6b 到期日回到今天 → 重新出現', api.agOpenToday().length === 1);

/* ---- 驗收 7：討論與附件 ---- */
api.agDrafts.set(doc.id, '');
api.agSay(doc.id);
ok('7 空白討論不送出', api.agState(doc).msgs.length === 0 && toasts.some(t => t.includes('先寫點什麼')));
api.agDrafts.set(doc.id, '金流模組先做上傳，實體收集這週不做');
api.agSay(doc.id);
const st7 = api.agState(doc);
ok('7b 討論寫得進去，帶作者與時間', st7.msgs.length === 1 && st7.msgs[0].w === 'yz' && !!st7.msgs[0].at);
ok('7c 送出後草稿清掉', !api.agDrafts.get(doc.id));
uploadQueue.push({ id: 'FILE-001', name: '發票命名規則.pdf' });
api.agAttach(doc.id);
ok('7d 附件沿用既有上傳管線，議題只記 id 與檔名',
  st7.files.length === 1 && st7.files[0] === '發票命名規則.pdf' && st7.fileIds[0] === 'FILE-001');
const thread = api.agThreadHtml(doc, 'card');
ok('7e 討論串同時渲染訊息、附件與輸入框', thread.includes('金流模組先做上傳') && thread.includes('發票命名規則.pdf') && thread.includes('data-ag-input'));
ok('7f 圖示全走 svg() 而不是 emoji', thread.includes('data-i="paperclip"') && thread.includes('data-i="send"') && !/[\u{1F300}-\u{1FAFF}]/u.test(thread));

/* ---- 驗收 8：結案要有結論 ---- */
api.agComplete(doc.id);
ok('8 沒寫結論不給結案，並把人帶去議題頁',
  !api.agState(doc).doneAt && toasts.some(t => t.includes('結論')) && opened.some(o => o[1] === doc.id));
doc.secs[1].blocks = [{ id: newBid(), t: 'p', ind: 0, text: '這週只做上傳，實體收集下一輪再說' }];
ok('8b 結論讀得到', api.agConclusion(doc) === '這週只做上傳，實體收集下一輪再說');
api.agComplete(doc.id);
ok('8c 有結論就能結案', !!api.agState(doc).doneAt);
ok('8d 結案後從今日議題移除', api.agOpenToday().length === 0);
api.agReopen(doc.id);
ok('8e 可以重新開啟', !api.agState(doc).doneAt && api.agOpenToday().length === 1);

/* ---- 驗收 9：L1 升格成 L2 ---- */
DB.todayIssues.push({ id: 'TDY-1', author: 'yz', day: TODAY, blockId: 'j5', text: '[行動] 文齡姐和Evvon的網站設計', at: Date.now(), deferred: 2 });
api.agPromote('TDY-1');
const promoted = api.agAll().find(d => api.agState(d).issueId === 'TDY-1');
ok('9 升格建立議題物件並記住來源 L1', !!promoted);
ok('9b L1 的提出日與帶過次數一起帶上來',
  promoted && api.agState(promoted).bornDay === TODAY && api.agState(promoted).carried.length === 2);
ok('9c L1 同時收掉，右欄不會同一件事出現兩筆', !!DB.todayIssues.find(t => t.id === 'TDY-1').doneAt);
DB.todayIssues.push({ id: 'TDY-2', author: 'yz', day: TODAY, blockId: 'GONE', text: '來源行已刪除', at: Date.now() });
const deniedBefore = toasts.length;
api.agPromote('TDY-2');
ok('9d 來源行不在目前日誌時明說，不偷偷造一個空物件',
  toasts.length > deniedBefore && toasts[toasts.length - 1].includes('不在目前開著的日誌'));
ok('9e 別人的議題不能升格', (() => {
  DB.todayIssues.push({ id: 'TDY-3', author: 'lily', day: TODAY, blockId: 'j5', text: 'Lily 的', at: Date.now() });
  const n = denies.length; api.agPromote('TDY-3'); return denies.length === n + 1;
})());

/* ---- 驗收 10：右欄兩層一起列 ---- */
const railL1 = [{ id: 'TDY-9', author: 'yz', day: TODAY, blockId: 'j5', text: '還沒升格的輕量議題', at: Date.now() }];
const rail = api.agTodayBody(railL1, api.agOpenToday());
ok('10 右欄同時列出 L2 物件與 L1 標記', rail.includes('議題：') && rail.includes('還沒升格的輕量議題'));
ok('10b L2 排在 L1 前面', rail.indexOf('議題：') < rail.indexOf('還沒升格的輕量議題'));
ok('10c L1 卡片有升格按鈕', rail.includes('agPromote'));
ok('10d 空狀態同時說明兩種寫法', api.agTodayBody([], []).includes('!今天') && api.agTodayBody([], []).includes('!議題'));

/* ---- 驗收 11：收工檢查 ---- */
const rows = api.agCloseRows();
ok('11 收工清單列出未結案的議題物件', rows.includes('議題') && rows.includes('agComplete'));
const openBefore = api.agOpenToday().length;
const carriedBefore = api.agOpenToday().map(d => api.agState(d).carried.length);
const movedN = api.agCarryAllOpen();
ok('11b 沒動的議題自動延到明天', movedN === openBefore && api.agOpenToday().length === 0);
ok('11c 延的時候一樣記下帶過次數', api.agAll().filter(d => !api.agState(d).doneAt)
  .every((d, i) => api.agState(d).carried.length === (carriedBefore[i] ?? 0) + 1));

/* ---- 驗收 12：卡片渲染分流 ---- */
const cardHtml = api.renderDocObjectCard({ obj: { ty: 'doc_object', rid: doc.id } });
ok('12 議題走自己的卡片分支', cardHtml.includes('ag-card') && cardHtml.includes('data-i="flag"'));
ok('12b 一般文件物件仍然走原本的卡片',
  api.renderDocObjectCard({ obj: { ty: 'doc_object', rid: 'NOT-AGENDA' } }) === '<BASECARD>');
const drawer = api.DRAWERS.doc_object(doc.id);
ok('12c 議題頁有三個日期欄位與參考碼',
  drawer.body.includes('提出') && drawer.body.includes('到期') && drawer.body.includes('帶過') && drawer.sub.includes(doc.id));
ok('12d 非議題的文件物件抽屜不受影響', api.DRAWERS.doc_object('NOT-AGENDA').title === 'base:NOT-AGENDA');
ok('12e 命令面板保留既有項目並多一條議題', (() => { const items = api.buildCmdk(); return items.length === 2 && items[1].ic === 'flag'; })());

/* ---- 靜態檢查：圖示表與生成檔 ---- */
const patches = fs.readFileSync(path.join(V5, 'source-patches.mjs'), 'utf8');
ok('S1 flag／paperclip／send／grip 都補進共用圖示表 I',
  ['flag:', 'paperclip:', 'send:', 'grip:'].every(k => patches.includes(k)));
const runtime = fs.readFileSync(path.join(V5, 'runtime.js'), 'utf8');
ok('S2 生成檔含議題物件（generator 的 EXTENSIONS 已接上）',
  runtime.includes('function agCreate') && runtime.includes('DOC_METAS.agenda'));
const styles = fs.readFileSync(path.join(V5, 'styles.ts'), 'utf8');
ok('S3 生成的樣式含 agenda-object.css', styles.includes('ag-pill') && styles.includes('ag-thread'));
const css = fs.readFileSync(path.join(V5, 'agenda-object.css'), 'utf8');
const strayHex = css.replace(/var\([^)]*\)/g, '').match(/#[0-9a-fA-F]{3,8}/g) || [];
ok('S4 CSS 沒有 var() fallback 以外的硬編碼色', strayHex.length === 0, strayHex.join(' '));
const src = fs.readFileSync(path.join(V5, 'agenda-object.source.js'), 'utf8');
ok('S5 原始碼沒有用 emoji 或手寫 <svg> 當圖示',
  !/<svg/.test(src) && !/[\u{1F300}-\u{1FAFF}]/u.test(src));

/* ---------------- 報告 ---------------- */
const pad = s => s + ' '.repeat(Math.max(0, 62 - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));
let fail = 0;
for (const [st2, name, extra] of results) { if (st2 === 'FAIL') fail++; console.log(`${st2}  ${pad(name)}${extra ? '  ' + extra : ''}`); }
console.log(`\n${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
