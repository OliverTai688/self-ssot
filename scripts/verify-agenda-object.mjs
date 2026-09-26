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
const VIEWS = { journal: tab => '<BASEVIEW tab="' + tab + '">' };
const panel = (title, sub, body) => '<div class="panel"><h3>' + title + '</h3><span>' + (sub || '') + '</span>' + body + '</div>';

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
  DB, S, TODAY, TPL, SUMMON, DOC_METAS, DRAWERS, VIEWS, panel,
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
const exported = 'return {agCreate,agPromote,agFind,agAll,agState,agOpenToday,agDueLabel,agSetDue,agCarryTo,agComplete,agReopen,agSay,agAttach,agDrafts,agTodayBody,agCloseRows,agCarryAllOpen,agPills,agThreadHtml,agConclusion,renderDocObjectCard,DRAWERS,buildCmdk,DOC_METAS,TPL,SUMMON,agIsTask,agResponsible,agTaskState,agSetOwner,agParseDue,agParseTask,agTasks,agOverdue,agStatePill,agOwnerPill,agOwned,agReviewGroups,agReviewHtml,agReviewStats,VIEWS};';
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
// 任務化之後，到期日只講日期、不講狀態：「逾期」改由狀態 pill 單一來源負責。
// 原本兩邊都講，同一張卡會出現兩次「逾期」；而且議題沒有逾期概念，講了是錯的。
ok('4c 到期日標籤分得出今天／明天／未排期，且不再自己宣告逾期',
  api.agDueLabel('') === '未排期' && api.agDueLabel(TODAY) === '今天到期' &&
  api.agDueLabel(dadd(TODAY, 1)) === '明天到期' &&
  !api.agDueLabel(dadd(TODAY, -1)).includes('逾期') &&
  api.agDueLabel(dadd(TODAY, -1)).includes('到期'));

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

/* ---- 驗收 T：任務化（owner / 到期 / 狀態推導 / 行內語法）---- */
// 這一組對應 journal-task-and-card-language-decision.md：議題與任務是同一個物件的兩種狀態。

const mkLine = text => { const b = { id: newBid(), t: 'p', ind: 0, text }; DB.journal[S.jday].blocks.push(b); return b; };

ok('T1 agState 為舊資料補上 owner／assigner 預設（payload 無 schema 驗證，預設集中在這裡）',
  (() => { const d = { day: TODAY, agenda: { due: '', bornDay: TODAY, carried: [], doneAt: 0, msgs: [], files: [] } };
    const st = api.agState(d); return st.owner === '' && st.assigner === ''; })());

const tIssue = api.agCreate(mkLine('要不要把核銷改成每週收一次'));
ok('T2 沒有 owner＝議題，不是任務', !!tIssue && !api.agIsTask(tIssue) && api.agTaskState(tIssue) === 'issue');

const tTask = api.agCreate(mkLine('整理獎學金資源'), { owner: 'lily', due: dadd(TODAY, 2) });
ok('T2b 有 owner＝任務，負責人與指派人都記下來',
  !!tTask && api.agIsTask(tTask) && api.agState(tTask).owner === 'lily' && api.agState(tTask).assigner === 'yz');

ok('T3 狀態推導：有 owner 未逾期無討論＝待辦', api.agTaskState(tTask) === 'todo');
api.agState(tTask).due = dadd(TODAY, -1);
ok('T3b 到期日過了＝逾期', api.agTaskState(tTask) === 'over' && api.agOverdue(tTask));
api.agState(tTask).msgs.push({ w: 'yz', x: '在做了' });
api.agState(tTask).due = dadd(TODAY, 3);
ok('T3c 有討論且未逾期＝進行中', api.agTaskState(tTask) === 'doing');
api.agState(tTask).doneAt = Date.now();
ok('T3d 結案優先於一切：doneAt 有值就是已完成，即使到期日還在未來（不存 status 才不會自相矛盾）',
  api.agTaskState(tTask) === 'done');
api.agState(tTask).doneAt = 0;

ok('T4 沒有負責人的議題永遠不會被算成逾期', (() => {
  api.agState(tIssue).due = dadd(TODAY, -5);
  const r = api.agTaskState(tIssue) === 'issue' && !api.agOverdue(tIssue);
  api.agState(tIssue).due = ''; return r; })());

api.agSetOwner(tIssue.id, 'lily');
ok('T5 agSetOwner 指派後議題變任務', api.agIsTask(tIssue) && api.agState(tIssue).owner === 'lily');
api.agSetOwner(tIssue.id, '');
ok('T5b 收回指派後退回議題', !api.agIsTask(tIssue) && api.agTaskState(tIssue) === 'issue');

ok('T6 被指派的人也動得了（deny 文案本來就是「作者或指定負責人」）', (() => {
  const d = api.agCreate(mkLine('回覆宇星的測試請求'), { owner: 'lily' });
  const me = DB.me; DB.me = 'lily';
  const allowed = api.agOwned(d);
  DB.me = me; return allowed; })());

ok('T7 agOpenToday 改看負責人：別人指派給我的會進我的清單', (() => {
  const d = api.agCreate(mkLine('幫忙看一下首頁文案'), { owner: 'lily' });
  return api.agOpenToday('lily').includes(d) && !api.agOpenToday('yz').includes(d); })());

/* ---- 行內語法 ---- */
const WD = new Date(TODAY + 'T00:00:00Z').getUTCDay();
ok('T8 ~今天／~明天／~後天', api.agParseDue('今天') === TODAY && api.agParseDue('明天') === dadd(TODAY, 1) && api.agParseDue('後天') === dadd(TODAY, 2));
ok('T8b ~週X 取最近一個（含今天），~下週X 再加七天', (() => {
  const wd = '日一二三四五六'[WD];
  return api.agParseDue('週' + wd) === TODAY && api.agParseDue('下週' + wd) === dadd(TODAY, 7); })());
ok('T8c ~YYYY-MM-DD 與 ~MMDD', api.agParseDue('2026-10-01') === '2026-10-01' && api.agParseDue('0930') === '2026-09-30');
ok('T8d 只寫月日而且已經過去的視為明年', api.agParseDue('0101') === '2027-01-01');
ok('T8e 認不得的寫法回空字串，不亂猜', api.agParseDue('下下個月某天') === '' && api.agParseDue('') === '');

ok('T9 agParseTask 抽出 @指派 與 ~到期，標題不殘留語法符號', (() => {
  const r = api.agParseTask('跟文齡姐確認首頁語氣 @Lily ~明天');
  return r.owner === 'lily' && r.due === dadd(TODAY, 1) && r.text === '跟文齡姐確認首頁語氣'; })());
ok('T9b 認得簡稱（頭像字）也認得 key', api.agParseTask('x @L').owner === 'lily' && api.agParseTask('x @yz').owner === 'yz');
ok('T9c 認不得的 @ 與 ~ 原樣留在標題裡，不默默吃掉使用者寫的字', (() => {
  const r = api.agParseTask('寄給 @某個不存在的人 ~某天');
  return r.owner === '' && r.due === '' && r.text.includes('@某個不存在的人') && r.text.includes('~某天'); })());
ok('T9d 只取第一個 @ 與第一個 ~', (() => {
  const r = api.agParseTask('x @Lily @宇星 ~明天 ~後天');
  return r.owner === 'lily' && r.due === dadd(TODAY, 1) && r.text.includes('@宇星') && r.text.includes('~後天'); })());

ok('T10 agCreate({parse:true}) 走行內語法建立任務', (() => {
  const b = mkLine('把年度目標書放進營運流程 @Lily ~明天');
  const d = api.agCreate(b, { parse: true });
  if (!d) return false;
  const st = api.agState(d);
  return st.owner === 'lily' && st.due === dadd(TODAY, 1) && api.agIsTask(d)
    && !/[@~]/.test(docObjectName(d)); })());

ok('T10b 行內語法只寫 @ 沒寫 ~ 也成立（到期日選填）', (() => {
  const d = api.agCreate(mkLine('校稿 @Lily'), { parse: true });
  return !!d && api.agState(d).owner === 'lily' && api.agState(d).due === ''; })());

/* ---- 顏色：狀態只由 pill 表達 ---- */
ok('T11 狀態 pill 走 --ag-<state> 三階 class，議題不宣告狀態', (() => {
  const d = api.agCreate(mkLine('待辦一件事'), { owner: 'lily' });
  const pill = api.agStatePill(d);
  return pill.includes('ag-pill todo') && api.agStatePill(tIssue) === ''; })());
ok('T11b 負責人 pill 用既有頭像，沒有自己另開一組色',
  api.agOwnerPill(api.agCreate(mkLine('指派一件事'), { owner: 'lily' })).includes('ag-pill own'));

ok('T12 一張卡上「逾期」只出現一次（狀態 pill），到期 pill 保持中性色', (() => {
  const d = api.agCreate(mkLine('逾期只講一次'), { owner: 'lily', due: dadd(TODAY, -2) });
  const html = api.agPills(d);
  return (html.match(/逾期/g) || []).length === 1 && html.includes('ag-pill soft');
})());

/* ---- 樣式層 ---- */
ok('S6 卡片不再有 3px 飽和色柱，逾期改用淡底',
  !css.includes('ag-card::before') && css.includes('.eb-doc-card.ag-card.ag-over'));
ok('S6b 逾期 pill 不再整塊填滿警示色',
  !/\.ag-pill\.over\{[^}]*background:var\(--rq-alarm/.test(css));

const theme = fs.readFileSync(path.join(ROOT, 'src/lib/theme/company-theme.ts'), 'utf8');
const lumOf = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const l1 = lumOf(a), l2 = lumOf(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const paletteOf = name => {
  const m = theme.match(new RegExp('const ' + name + ': V5Palette = \\{([\\s\\S]*?)\\n\\}'));
  const out = {}; for (const [, k, v] of m[1].matchAll(/"(--[\w-]+)":\s*"([^"]+)"/g)) out[k] = v; return out;
};
const STATES = ['over', 'doing', 'todo', 'done'];
let tokenMiss = [], contrastBad = [];
for (const name of ['WHITE', 'BLACK']) {
  const pal = paletteOf(name);
  for (const st3 of STATES) {
    const bg = pal['--ag-' + st3 + '-bg'], br = pal['--ag-' + st3 + '-br'], ink = pal['--ag-' + st3 + '-ink'];
    if (!bg || !br || !ink) { tokenMiss.push(name + '/' + st3); continue; }
    const r = ratio(ink, bg);
    if (r < 4.5) contrastBad.push(`${name}/${st3} ${r.toFixed(2)}`);
  }
}
ok('S7 四個狀態在 WHITE／BLACK 都有 bg／br／ink 三階（ORANGE／BRAND 以 spread 繼承）',
  tokenMiss.length === 0, tokenMiss.join(' '));
ok('S7b 每組狀態字色對自己的底色都 ≥ 4.5:1', contrastBad.length === 0, contrastBad.join(' '));
ok('S7c ORANGE 繼承 WHITE、BRAND 繼承 BLACK，不必各自重寫',
  /const ORANGE: V5Palette = \{\s*\.\.\.WHITE/.test(theme) && /const BRAND: V5Palette = \{\s*\.\.\.BLACK/.test(theme));

const rep = fs.readFileSync(path.join(V5, 'replies.source.js'), 'utf8');
ok('S8 !任務 進了觸發詞與旗標選單',
  rep.includes("'任務','task'") && rep.includes("flag:'task'") && rep.includes("agCreate(b,{parse:true})"));

/* ---- 驗收 R：回顧分頁的任務區塊 ---- */
ok('R1 回顧分頁在連續敘事之前接上任務區塊（tab 1、圓展空間）', (() => {
  const html = api.VIEWS.journal(1);
  return html.includes('ag-rv-kpi') && html.indexOf('ag-rv-kpi') < html.indexOf('<BASEVIEW');
})());
ok('R1b 今天分頁（tab 0）與個人空間不受影響', (() => {
  const t0 = api.VIEWS.journal(0);
  return !t0.includes('ag-rv-kpi');
})());
ok('R2 分組順序把卡住的排在做完的前面', (() => {
  const ks = api.agReviewGroups().map(g => g.k);
  const iOver = ks.indexOf('over'), iDone = ks.indexOf('done');
  return iOver === -1 || iDone === -1 || iOver < iDone;
})());
ok('R3 指標只算有負責人的，議題不進統計', (() => {
  const before = api.agReviewStats();
  api.agCreate(mkLine('一個沒有負責人的議題'));           // 議題
  return before === api.agReviewStats();
})());
ok('R4 逾期在指標與列上都標出來', (() => {
  const d = api.agCreate(mkLine('逾期的任務'), { owner: 'lily', due: dadd(TODAY, -3) });
  const html = api.agReviewHtml();
  return api.agReviewStats().includes('ag-k-over') && html.includes('ag-rv-row ag-over');
})());
ok('R5 完全沒有任務時給可行動的空狀態，不是空白表格', (() => {
  const keep = DB.docObjects.slice();
  DB.docObjects.length = 0;
  const html = api.agReviewHtml();
  DB.docObjects.push(...keep);
  return html.includes('!任務') && !html.includes('ag-rv-row');
})());

/* ---------------- 報告 ---------------- */
const pad = s => s + ' '.repeat(Math.max(0, 62 - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));
let fail = 0;
for (const [st2, name, extra] of results) { if (st2 === 'FAIL') fail++; console.log(`${st2}  ${pad(name)}${extra ? '  ' + extra : ''}`); }
console.log(`\n${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
