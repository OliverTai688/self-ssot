/* 回顧分頁（同步狀態／作者身分／雙軌並列）的驗收。
   與 verify-agenda-object.mjs 同一套作法：把 journal-review.source.js 原樣放進
   最小樁環境實際執行，逐條對應驗收清單。瀏覽器級互動仍需 Owner 在本機確認。
   用法：node scripts/verify-journal-review.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V5 = path.join(ROOT, 'src/components/yuanzhan/v5');
const code = fs.readFileSync(path.join(V5, 'journal-review.source.js'), 'utf8');

const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, extra || '']);

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TEXTY = t => t !== 'divider' && t !== 'obj';
const TODAY = '2026-09-28';
const dadd = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

const DB = { me: 'yz', people: { yz: { n: '戴宇星', s: '宇', cls: 'a-yz' }, lily: { n: 'Lily', s: 'L', cls: 'a-lily' } } };
const blk = (id, text, t = 'p', ind = 0) => ({ id, t, ind, text });
const journals = {
  team: {
    yz: {
      '2026-09-28': { title: 'yz today', blocks: [blk('a1', '今天開發 PersonalOS')] },
      '2026-09-26': { title: 'yz 26', blocks: [blk('a2', '整理提案')] },
      '2026-09-01': { title: 'yz old', blocks: [blk('a3', '超過期間的舊日誌')] },
      '2026-09-25': { title: 'yz hollow', blocks: [blk('a4', '#')] },
      '2026-09-24': { title: 'yz empty', blocks: [blk('a5', '   ')] }
    },
    lily: {
      '2026-09-27': { title: 'lily 27', blocks: [blk('b1', 'Evvon 文案初稿')] },
      '2026-09-26': { title: 'lily 26', blocks: [blk('b2', '地政士回饋整理')] }
    }
  },
  personal: { yz: { '2026-09-28': { title: 'p', blocks: [blk('p1', '個人空間')] } }, lily: {} }
};

let S = { jday: TODAY }, space = 'team', journalAuthor = 'yz';
let OP_LIVE = true, OP_STATUS = 'idle', OP_STATUS_NOTE = '', OP_VERSION = 7, OP_QUEUE = [];
const rendered = [], navigated = [];

const stubs = {
  DB, esc, TEXTY, TODAY, dadd, journals,
  get S() { return S; }, set S(v) { S = v; },
  person: w => DB.people[w].n,
  rqAv: w => `<span class="av rq-av xs ${DB.people[w].cls}">${DB.people[w].s}</span>`,
  svg: name => `<svg data-i="${name}"></svg>`,
  // 行上的貼紙，住在 journal-stickers.source.js
  stkOf: () => null,
  stkHtml: () => '',
  // 行內網址的連結，住在 link-object.source.js
  lkHas: () => false,
  lkRoChips: () => '',
  objHtml: b => `<obj:${b.obj?.rid || ''}>`,
  jcWeek: d => '週' + '日一二三四五六'[new Date(d + 'T00:00:00Z').getUTCDay()],
  panel: (title, sub, body, act, flush) =>
    `<div class="panel" data-flush="${!!flush}"><h3>${title}</h3><span class="sub">${sub || ''}</span><div class="panel-b">${body}</div></div>`,
  guide: (html, kind) => `<div class="hint ${kind || ''}">${html}</div>`,
  VIEWS: { journal: tab => `<BASEVIEW tab="${tab}">` },
  agReviewHtml: () => '<TASKSECTION>',
  opCheckRemoteVersion: () => {},
  render: () => rendered.push(1),
  saveJournalDraft: () => {},
  setTab: i => navigated.push(i),
  agState: () => ({}),
};
const dyn = {
  get space() { return space; }, set space(v) { space = v; },
  get journalAuthor() { return journalAuthor; }, set journalAuthor(v) { journalAuthor = v; },
  get OP_LIVE() { return OP_LIVE; }, get OP_STATUS() { return OP_STATUS; },
  get OP_STATUS_NOTE() { return OP_STATUS_NOTE; }, get OP_VERSION() { return OP_VERSION; },
  get OP_QUEUE() { return OP_QUEUE; },
};
// 這幾個在真實 runtime 是可變的模組變數；樁環境用參數傳入，所以改用 getter 物件代理。
const prelude = `const space=__dyn.space,journalAuthor0=__dyn.journalAuthor;
let journalAuthor=journalAuthor0;
const OP_LIVE=__dyn.OP_LIVE,OP_STATUS=__dyn.OP_STATUS,OP_STATUS_NOTE=__dyn.OP_STATUS_NOTE,
      OP_VERSION=__dyn.OP_VERSION,OP_QUEUE=__dyn.OP_QUEUE;\n`;

const names = [...Object.keys(stubs), '__dyn'];
const exported = 'return {VIEWS,jrMembers,jrDays,jrFlow,jrDual,jrSyncBar,jrFilters,jrSet,jrHasBody,jrIsHollow,jrGoto,jrCount};';
const build = () => new Function(...names, prelude + code + '\n' + exported)(...names.map(n => n === '__dyn' ? dyn : stubs[n]));
let api = build();

/* ---- 1 多人：回顧同時讀兩個人 ---- */
// 註解裡會引用舊的 getter 當作說明，所以先把註解去掉再掃「有沒有真的去讀它」。
const codeNoComments = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok('1 回顧讀的是 journals[space] 總帳，不是單一作者的 DB.journal',
  !/DB\.journal/.test(codeNoComments) && /journals\[space\]/.test(codeNoComments));
ok('1b jrMembers 在圓展空間回傳兩個席位', api.jrMembers().join() === 'yz,lily');
ok('1c 日期是兩人的聯集，新的在前', (() => {
  const d = api.jrDays();
  return d[0] === '2026-09-28' && d.includes('2026-09-27') && d.includes('2026-09-26');
})());
ok('1d 期間以日期比對，不是取前 N 筆（09-01 落在 14 天外）',
  !api.jrDays().includes('2026-09-01'));
ok('1g 兩邊都沒寫的那天不進清單（否則雙軌會多出一整列空槽）',
  !api.jrDays().includes('2026-09-24') && api.jrDays().length === 4);
ok('1e 敘事流同時出現兩個人的名字與頭像', (() => {
  const h = api.jrFlow();
  return h.includes('戴宇星') && h.includes('Lily') && h.includes('rq-av');
})());
ok('1f 對方的條目標示得出來', api.jrFlow().includes('jr-tag'));

/* ---- 2 空白與空殼 ---- */
ok('2 只有空白段落的那天不渲染（09-24）', !api.jrFlow().includes('yz empty') && !api.jrHasBody(journals.team.yz['2026-09-24']));
ok('2b 只有 # 的那天判定為空殼', api.jrIsHollow(journals.team.yz['2026-09-25']));
ok('2c 空殼折疊成一行，不佔整塊版面', (() => {
  const h = api.jrFlow();
  return h.includes('jr-hollow') && h.includes('jr-fold');
})());
ok('2d 有內容的那天不會被誤判成空殼', !api.jrIsHollow(journals.team.yz['2026-09-28']));

/* ---- 3 同步狀態誠實 ---- */
ok('3 database 模式顯示真實狀態與版本', (() => {
  const h = api.jrSyncBar();
  return h.includes('已同步') && h.includes('版本 7') && !h.includes('原型模式');
})());
ok('3b 有待送出時明講幾筆', (() => {
  OP_QUEUE = [{ changes: [] }, { changes: [] }]; api = build();
  const h = api.jrSyncBar(); OP_QUEUE = []; api = build();
  return h.includes('待送出 2 筆');
})());
ok('3c 衝突／未保存要看得出來不是正常狀態', (() => {
  OP_STATUS = 'conflict'; api = build();
  const h = api.jrSyncBar(); OP_STATUS = 'idle'; api = build();
  return h.includes('有衝突') && h.includes('jr-sync bad');
})());
ok('3d 非 database 模式不假裝已同步（這是最容易騙人的一格）', (() => {
  OP_LIVE = false; api = build();
  const h = api.jrSyncBar(); OP_LIVE = true; api = build();
  return h.includes('原型模式') && h.includes('不會同步') && !h.includes('已同步');
})());

/* ---- 4 唯讀語意 ---- */
ok('4 回顧沒有「開啟編輯」，改為明確跳到那一天', (() => {
  const h = api.jrFlow();
  return !h.includes('開啟編輯') && h.includes('到這一天') && h.includes('jrGoto');
})());
ok('4b jrGoto 切到那天並回到可編輯的分頁', (() => {
  navigated.length = 0;
  api.jrGoto('2026-09-26', 'lily');
  return S.jday === '2026-09-26' && navigated[0] === 0;
})());
ok('4c 面板仍標唯讀（語意不再自相矛盾）', api.VIEWS.journal(1).includes('唯讀'));

/* ---- 5 雙軌 ---- */
ok('5 雙軌左右兩條軌道加中央日期刻度', (() => {
  const h = api.jrDual();
  return h.includes('jr-lanehead') && h.includes('jr-lane l') && h.includes('jr-lane r') && h.includes('jr-mid');
})());
ok('5b 對方那天沒寫就畫空槽（不是留白）', api.jrDual().includes('jr-gapslot') && api.jrDual().includes('未寫日誌'));
ok('5c 同一列一定是同一天 —— 每個 jr-row 只有一個日期刻度', (() => {
  const rows = api.jrDual().split('jr-row ').slice(1);
  return rows.length > 0 && rows.every(r => (r.match(/jr-dd/g) || []).length === 1);
})());
ok('5d 今天那一列標出來', api.jrDual().includes('jr-row today'));

/* ---- 6 檢視切換與組合 ---- */
ok('6 tab 1 由回顧接手，其餘分頁原樣交還', (() => {
  const t1 = api.VIEWS.journal(1), t0 = api.VIEWS.journal(0);
  return t1.includes('jr-sync') && t0 === '<BASEVIEW tab="0">';
})());
ok('6b 三種檢視共用同一條同步列與篩選', (() => {
  const h = api.VIEWS.journal(1);
  return h.includes('jr-sync') && h.includes('jr-filters');
})());
ok('6c 任務檢視接的是 agenda-object 的內容，不自己另寫一份', (() => {
  api.jrSet('view', 'task');
  const h = api.VIEWS.journal(1);
  api.jrSet('view', 'flow');
  return h.includes('<TASKSECTION>');
})());
ok('6d 切成雙軌時內容換成雙軌', (() => {
  api.jrSet('view', 'dual');
  const h = api.VIEWS.journal(1);
  api.jrSet('view', 'flow');
  return h.includes('jr-lanehead');
})());
ok('6e 成員篩選只留那個人', (() => {
  api.jrSet('who', 'lily');
  const h = api.jrFlow();
  api.jrSet('who', 'all');
  return h.includes('Lily') && !h.includes('戴宇星');
})());

/* ---- 7 個人空間 ---- */
ok('7 個人空間只有自己，不顯示雙軌與成員篩選', (() => {
  space = 'personal'; api = build();
  const members = api.jrMembers(), f = api.jrFilters();
  space = 'team'; api = build();
  return members.length === 1 && !f.includes('雙軌') && !f.includes('成員');
})());

/* ---- 8 靜態檢查 ---- */
const rt = fs.readFileSync(path.join(V5, 'runtime.js'), 'utf8');
ok('S1 生成檔含回顧（generator 的 EXTENSIONS 已接上）',
  rt.includes('function jrDual') && rt.includes('function jrSyncBar'));
const styles = fs.readFileSync(path.join(V5, 'styles.ts'), 'utf8');
ok('S2 生成的樣式含 journal-review.css', styles.includes('jr-lanehead') && styles.includes('jr-sync'));
const css = fs.readFileSync(path.join(V5, 'journal-review.css'), 'utf8');
ok('S3 CSS 沒有 var() fallback 以外的硬編碼色',
  (css.replace(/var\([^)]*\)/g, '').match(/#[0-9a-fA-F]{3,8}/g) || []).length === 0);
ok('S4 每個 svg key 都在共用圖示表裡（未知 key 會靜默畫出空 svg）', (() => {
  const keys = [...new Set([...code.matchAll(/svg\('([^']+)'/g)].map(m => m[1]))];
  const missing = keys.filter(k => !new RegExp('\\n\\s{2,4}' + k + ':\\s*[\'"`]').test(rt));
  return missing.length === 0;
})());
ok('S5 agenda-object 不再自己掛 VIEWS.journal（兩邊都包會疊出兩份任務）', (() => {
  const ag = fs.readFileSync(path.join(V5, 'agenda-object.source.js'), 'utf8');
  return !/VIEWS\.journal\s*=/.test(ag);
})());
ok('S6 原始碼沒有用 emoji 或手寫 <svg> 當圖示',
  !/<svg(?!\s*data-i)/.test(code.replace(/svg\(/g, '')) && !/[\u{1F300}-\u{1FAFF}]/u.test(code));

const pad = s => s + ' '.repeat(Math.max(0, 64 - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));
let fail = 0;
for (const [st, name, extra] of results) { if (st === 'FAIL') fail++; console.log(`${st}  ${pad(name)}${extra ? '  ' + extra : ''}`); }
console.log(`\n${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
