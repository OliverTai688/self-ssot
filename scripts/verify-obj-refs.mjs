/* 物件引用與點兩下改名（obj-names.source.js）的驗收測試。
   把原始檔放進最小樁環境實際執行；回覆框的互動與雙擊編輯在真瀏覽器（Chromium）另外跑過。
   用法：node scripts/verify-obj-refs.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const V5 = path.join(ROOT, 'src/components/yuanzhan/v5');
const code = fs.readFileSync(path.join(V5, 'obj-names.source.js'), 'utf8');
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, extra || '']);

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DB = {
  me: 'yz',
  docObjects: [
    { id: 'AGENDA-JRNL-000001-20261015', type: 'agenda', title: '議題', titleAuto: true, author: 'lily', secs: [] },
    { id: 'STANDUP-JRNL-000002-20261015', type: 'standup', title: 'Standup', titleAuto: true, author: 'yz', secs: [] }
  ],
  assets: [
    { id: 'AST-0001', assetId: 'uuid-1', name: '截圖 10-15 12:38:46.png', kind: 'image', author: 'yz' },
    { id: 'AST-0002', assetId: 'uuid-2', name: '會議錄音.m4a', kind: 'audio', author: 'lily' }
  ],
  links: [{ id: 'LNK-1', title: '合作文件', url: 'https://example.com', author: 'lily' }],
  issues: [{ id: 'ISS-1', t: 'develop interface' }], projects: [], txns: [], decisions: [], events: []
};
const log = [], toasts = [], denies = [], fetches = [], listeners = {};
const stubs = {
  DB, S: { stack: [] }, esc,
  docObjectName: d => (d.titleAuto === false ? d.title : (d.type === 'agenda' ? '議題：會計師提案' : 'Standup：今天')),
  docObjectLabel: d => (d.type === 'agenda' ? '議題' : 'Standup'),
  metaOf: d => ({ nm: d.type }),
  AST_LABELS: { image: '圖片', audio: '音訊', video: '影片' },
  astMeta: k => ({ ic: k }),
  svg: n => '<svg data-i="' + n + '"></svg>',
  isOwner: () => DB.me === 'yz',
  toast: m => toasts.push(String(m)), deny: () => denies.push(1),
  render: () => {}, paintDrawer: () => {},
  commit: (op, ent, label, apply) => { const eff = apply(); log.push({ op, ent, label, eff }); },
  openDocPage: id => log.push({ open: id }), objJump: (ty, id) => log.push({ jump: ty + ':' + id }),
  mentionHits: q => [{ ty: 'asset', rid: 'AST-0001', nm: 'x' }, { ty: 'person', rid: 'lily' }, { ty: 'doc_object', rid: 'AGENDA-JRNL-000001-20261015' }].filter(h => !q || h.rid.toLowerCase().includes(q.toLowerCase()) || h.ty === 'asset'),
  OP_LIVE: true, UPLOAD_ENDPOINT: '/api/company/operating/uploads',
  fetch: (url, opt) => { fetches.push({ url, opt }); return Promise.resolve({ ok: true, json: async () => ({}) }); },
  root: { addEventListener: (t, fn) => { listeners[t] = fn; }, querySelector: () => null },
  controller: { signal: {} }, doc: {}, shadow: {}
};
const names = Object.keys(stubs);
const api = new Function(...names, code + '\nreturn {objFind,objRefName,objRefLabel,objRefIcon,objRefOpen,objRefChip,objRefHits,objCanRename,objRenAttr,objRename};')(...names.map(n => stubs[n]));

/* ---- 名稱查表 ---- */
ok('N1 文件物件的名稱走 docObjectName（議題／任務的標籤跟著 meta）', api.objRefName('doc_object', 'AGENDA-JRNL-000001-20261015') === '議題：會計師提案');
ok('N2 檔案、連結、工作項目都查得到名稱與型別',
  api.objRefName('asset', 'AST-0001') === '截圖 10-15 12:38:46.png' && api.objRefLabel('asset', 'AST-0002') === '音訊'
  && api.objRefName('link', 'LNK-1') === '合作文件' && api.objRefName('issue', 'ISS-1') === 'develop interface' && api.objRefLabel('issue', 'ISS-1') === '工作');
ok('N3 物件不見了就明說，不印 undefined', api.objRefName('asset', 'NOPE') === '（物件已刪除）' && api.objRefChip({ ty: 'asset', rid: 'NOPE' }).includes('gone'));
ok('N4 引用候選沿用 @ 清單，但不含人', api.objRefHits('').every(h => h.ty !== 'person') && api.objRefHits('').length === 2);
ok('N5 點引用：文件物件開獨立頁面，其他走 objJump', (() => {
  api.objRefOpen('doc_object', 'AGENDA-JRNL-000001-20261015'); api.objRefOpen('asset', 'AST-0001');
  return log.some(l => l.open === 'AGENDA-JRNL-000001-20261015') && log.some(l => l.jump === 'asset:AST-0001');
})());

/* ---- 權限 ---- */
ok('P1 作者可以改自己的物件名稱', api.objCanRename('asset', 'AST-0001'));
ok('P2 公司負責人可以改別人的物件名稱', api.objCanRename('asset', 'AST-0002') && api.objCanRename('doc_object', 'AGENDA-JRNL-000001-20261015'));
ok('P3 一般成員不能改別人的物件名稱，也不帶雙擊屬性', (() => {
  DB.me = 'lily';
  const r = !api.objCanRename('asset', 'AST-0001') && api.objRenAttr('asset', 'AST-0001') === '' && api.objCanRename('asset', 'AST-0002');
  DB.me = 'yz'; return r;
})());
ok('P4 工作項目等有自己表單的物件不在這裡改', !api.objCanRename('issue', 'ISS-1'));

/* ---- 改名 ---- */
ok('R1 文件物件改名：title 寫入、titleAuto 關掉、走 commit', (() => {
  const n = log.length;
  api.objRename('doc_object', 'AGENDA-JRNL-000001-20261015', '  會計師提案（定案）  ');
  const d = DB.docObjects[0];
  return d.title === '會計師提案（定案）' && d.titleAuto === false && log.length === n + 1
    && api.objRefName('doc_object', d.id) === '會計師提案（定案）';
})());
ok('R2 空白名稱不接受', (() => { const r = api.objRename('link', 'LNK-1', '   '); return r === false && DB.links[0].title === '合作文件' && toasts.some(t => t.includes('不能是空的')); })());
ok('R3 連結改名走 commit', (() => { api.objRename('link', 'LNK-1', '簽署版合作文件'); return DB.links[0].title === '簽署版合作文件'; })());
ok('R4 檔案改名打 uploads PATCH（帶 assetId 與 name），不走命令佇列', (() => {
  const n = log.length;
  api.objRename('asset', 'AST-0001', '會計師提案表格截圖');
  const f = fetches[fetches.length - 1];
  const body = f && JSON.parse(f.opt.body);
  return DB.assets[0].name === '會計師提案表格截圖' && f.opt.method === 'PATCH' && body.assetId === 'uuid-1' && body.name === '會計師提案表格截圖' && log.length === n;
})());
ok('R5 名稱上限 120 字', (() => { api.objRename('asset', 'AST-0001', 'a'.repeat(300)); return DB.assets[0].name.length === 120; })());
ok('R6 沒權限的改名被擋下', (() => {
  DB.me = 'lily'; const d0 = denies.length;
  const r = api.objRename('asset', 'AST-0001', '偷改');
  DB.me = 'yz'; return r === false && denies.length === d0 + 1 && DB.assets[0].name !== '偷改';
})());
ok('R7 引用膠囊顯示的是改名後的名稱（存的是 id，不是名字）', api.objRefChip({ ty: 'doc_object', rid: 'AGENDA-JRNL-000001-20261015' }).includes('會計師提案（定案）'));
ok('R8 單擊延後／雙擊改名的監聽掛在捕獲階段', typeof listeners.click === 'function' && typeof listeners.dblclick === 'function');

/* ---- 接線 ---- */
const rep = fs.readFileSync(path.join(V5, 'replies.source.js'), 'utf8');
ok('W1 回覆送出時帶 refs，訊息畫出引用膠囊', rep.includes('...(refs.length?{refs}:{})') && rep.includes('m.refs.map(objRefChip)'));
ok('W2 回覆框有「引用」按鈕與 @ 觸發', rep.includes("rqRefToggle('${r.id}')") && rep.includes('RQ_REF_AT'));
const files = ['agenda-object.source.js', 'template-objects.source.js', 'asset-object.source.js', 'link-object.source.js', 'object-index.source.js'];
ok('W3 議題卡、文件卡、檔案卡、連結卡、物件索引的名稱都帶雙擊屬性',
  files.every(f => fs.readFileSync(path.join(V5, f), 'utf8').includes('objRenAttr(')), files.filter(f => !fs.readFileSync(path.join(V5, f), 'utf8').includes('objRenAttr(')).join(','));
const route = fs.readFileSync(path.join(ROOT, 'src/app/api/company/operating/uploads/route.ts'), 'utf8');
const svc = fs.readFileSync(path.join(ROOT, 'src/lib/services/operating-assets.service.ts'), 'utf8');
ok('W4 伺服器改名：PATCH 帶 name 走 renameAsset，只有作者或 OWNER 席位', route.includes('renameAsset(') && svc.includes('asset.authorKey !== params.authorKey && !params.isOwnerSeat'));
const gen = fs.readFileSync(path.join(ROOT, 'scripts/generate-yuanzhan-v5.mjs'), 'utf8');
ok('W5 obj-names 進 EXTENSIONS', gen.includes("'obj-names'"));
const jc = fs.readFileSync(path.join(V5, 'journal-cockpit.source.js'), 'utf8');
ok('W6 駕駛艙「今天誕生的物件」認得檔案與連結（不再顯示已刪除）', jc.includes("o.ty==='asset'||o.ty==='link'"));

const pad = s => s + ' '.repeat(Math.max(0, 66 - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));
let fail = 0;
for (const [st, name, extra] of results) { if (st === 'FAIL') fail++; console.log(`${st}  ${pad(name)}${extra ? '  ' + extra : ''}`); }
console.log(`\n${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
