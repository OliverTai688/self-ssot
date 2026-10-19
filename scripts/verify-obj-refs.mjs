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
const flood = { on: false }, SM = { open: true, mode: 'hash', q: '', start: 0, blockId: 'b1', hits: [] };
const blocks = [{ id: 'b1', t: 'p', text: '看這張 #引用' }];
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
  // flood：模擬帳本很多的公司 —— 原型的工作項目排在最前面，物件排在最後。
  mentionHits: q => [...(flood.on ? Array.from({ length: 60 }, (_, i) => ({ ty: 'issue', rid: 'ISS-' + i, nm: 'i' + i, g: '工作項目' })) : []),
    { ty: 'asset', rid: 'AST-0001', nm: 'x' }, { ty: 'person', rid: 'lily' }, { ty: 'doc_object', rid: 'AGENDA-JRNL-000001-20261015', nm: '議題', ds: '10-15 · Lily' }].filter(h => !q || h.rid.toLowerCase().includes(q.toLowerCase()) || h.ty === 'asset'),
  SUMMON: [{ g: '模板', items: [] }, { g: '物件', items: [{ k: 'issue' }, { k: 'project' }, { k: 'link' }] }],
  SM, canWriteJournal: () => true, syncAll: () => {}, closeSummon: () => { SM.open = false; },
  bOf: id => blocks.find(b => b.id === id), focusB: (id, off) => log.push({ focus: id + '@' + off }),
  checkTrigger: (tx, b) => log.push({ trigger: b.text }),
  applySummon: n => log.push({ baseApply: n }),
  ebHtml: b => `<div class="eb ind0" data-id="${b.id}" data-t="${b.t}"><span class="eb-h"></span>
    <div class="eb-tx " data-id="${b.id}" contenteditable="true">${esc(b.text)}</div></div>`,
  TEXTY: t => ['p', 'h1', 'h2', 'h3', 'bullet', 'todo', 'quote', 'code'].includes(t),
  snap: () => {}, stkLocate: id => { const b = blocks.find(x => x.id === id); return b ? { b } : null; },
  objHtml: b => '<div class="eb-obj">card ' + b.obj.rid + '</div>', person: w => w,
  OP_LIVE: true, UPLOAD_ENDPOINT: '/api/company/operating/uploads',
  fetch: (url, opt) => { fetches.push({ url, opt }); return Promise.resolve({ ok: true, json: async () => ({}) }); },
  root: { addEventListener: (t, fn) => { listeners[t] = fn; }, querySelector: sel => (sel.includes('data-id') ? { tx: 1 } : null), querySelectorAll: () => [] },
  controller: { signal: {} }, doc: {}, shadow: { activeElement: null }, runtime: {}
};
const names = Object.keys(stubs);
const api = new Function(...names, code + '\nreturn {objFind,objRefName,objRefLabel,objRefIcon,objRefOpen,objRefChip,objRefHits,objCanRename,objRenAttr,objRename,orBind,orRefsOf,orClear,orInput,orKey,orAdd,orRemove,orToggle,orTray,orChips,orButton,mentionHits,applySummon,SUMMON,ebHtml,lineRefs,lineRefRemove};')(...names.map(n => stubs[n]));

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

/* ---- 共用引用輸入（回覆／議題討論／行內留言） ---- */
let draft = '';
api.orBind('t:1', { get: () => draft, set: v => { draft = v; }, focus: () => null, repaint: () => {} });
ok('C1 打 @關鍵字 開選單，Enter 選第一筆並把 @關鍵字 從文字拿掉', (() => {
  draft = '參考 @截圖'; api.orInput('t:1', draft);
  const tray = api.orTray('t:1');
  let prevented = false;
  const handled = api.orKey({ key: 'Enter', isComposing: false, preventDefault: () => { prevented = true; }, stopPropagation: () => {} }, 't:1');
  const refs = api.orRefsOf('t:1');
  return tray.includes('data-or-list="t:1"') && handled && prevented && refs.length === 1 && refs[0].ty === 'asset' && draft === '參考 ';
})());
ok('C2 選單沒開時 Enter 不攔（交給書寫面送出）', api.orKey({ key: 'Enter', isComposing: false, preventDefault() {}, stopPropagation() {} }, 't:1') === false);
ok('C3 按鈕開選單、重複的物件不會加兩次、可移除', (() => {
  api.orToggle('t:1'); api.orAdd('t:1', 'asset', 'AST-0001'); api.orAdd('t:1', 'doc_object', 'AGENDA-JRNL-000001-20261015');
  const n = api.orRefsOf('t:1').length;
  api.orRemove('t:1', 0);
  return n === 2 && api.orRefsOf('t:1').length === 1 && api.orRefsOf('t:1')[0].ty === 'doc_object';
})());
ok('C4 膠囊列與送出後清空', (() => {
  const tray = api.orTray('t:1');
  api.orClear('t:1');
  return tray.includes('obj-ref-x') && api.orRefsOf('t:1').length === 0 && api.orChips([]) === '' && api.orChips([{ ty: 'asset', rid: 'AST-0001' }]).includes('obj-ref');
})());
ok('C5 Esc 關選單、不清掉已選的引用', (() => {
  api.orAdd('t:1', 'asset', 'AST-0001'); draft = 'x @會'; api.orInput('t:1', draft);
  const handled = api.orKey({ key: 'Escape', isComposing: false, preventDefault() {}, stopPropagation() {} }, 't:1');
  const closed = !api.orTray('t:1').includes('data-or-list');
  const kept = api.orRefsOf('t:1').length === 1;
  api.orClear('t:1'); return handled && closed && kept;
})());
ok('C6 組字中（注音）不攔按鍵', (() => { draft = '@a'; api.orInput('t:1', draft); const r = api.orKey({ key: 'Enter', isComposing: true }, 't:1') === false; api.orClear('t:1'); return r; })());

/* ---- 接線 ---- */
const rep = fs.readFileSync(path.join(V5, 'replies.source.js'), 'utf8');
ok('W1 回覆送出時帶 refs，訊息畫出引用膠囊', rep.includes('...(refs.length?{refs}:{})') && rep.includes('orChips(m.refs)'));
ok('W2 回覆框走共用引用輸入（按鈕＋@）', rep.includes('orButton(key)') && rep.includes("orInput('${key}'") && rep.includes('orTray(key)'));
const ag = fs.readFileSync(path.join(V5, 'agenda-object.source.js'), 'utf8');
ok('W7 議題討論：送出帶 refs、訊息畫膠囊、輸入框有引用', ag.includes('...(refs.length ? { refs } : {})') && ag.includes('orChips(m.refs)') && ag.includes('orTray(key)'));
const jcs = fs.readFileSync(path.join(V5, 'journal-cockpit.source.js'), 'utf8');
ok('W8 行內留言：送出帶 refs、留言畫膠囊、輸入框有引用', jcs.includes('...(refs.length?{refs}:{})') && jcs.includes('orChips(c.refs)') && jcs.includes('orTray(rk)'));
const cmdSvc = fs.readFileSync(path.join(ROOT, 'src/lib/services/operating-commands.service.ts'), 'utf8');
const storeSvc = fs.readFileSync(path.join(ROOT, 'src/lib/services/operating-store.service.ts'), 'utf8');
ok('W9 留言的 refs 存進 meta（清洗過、最多 20 筆）並讀回', cmdSvc.includes('refs: commentRefs(row.refs)') && cmdSvc.includes('out.length >= 20') && storeSvc.includes('refs: meta.refs'));
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

/* ---- 日誌正文的 @ 選單與 # 引用物件 ---- */
flood.on = true;
const floodHits = api.mentionHits('');
ok('J1 帳本再多，沒打字時物件仍排在最前面（不被工作項目擠掉）',
  floodHits[0].ty === 'doc_object' && floodHits[1].ty === 'asset' && floodHits.filter(h => h.ty === 'issue').length === 5, floodHits.map(h => h.ty).join(','));
ok('J2 文件物件在選單裡用真正的名稱與型別，群組不是 undefined',
  floodHits[0].nm === api.objRefName('doc_object', 'AGENDA-JRNL-000001-20261015') && floodHits[0].g === '日誌物件' && floodHits[0].ds.startsWith('議題 · '), JSON.stringify(floodHits[0]));
ok('J3 打了字每類放寬、總數仍不超過 40', api.mentionHits('iss').filter(h => h.ty === 'issue').length === 12 && api.mentionHits('iss').length <= 40);
flood.on = false;
const objItems = api.SUMMON[1].items.map(it => it.k);
ok('J4 # 選單有「引用物件」，緊接在「引用專案」後面', objItems.indexOf('ref') === objItems.indexOf('project') + 1, objItems.join(','));
SM.hits = [{ k: 'ref', nm: '引用物件' }]; SM.q = '引用'; SM.start = 4; SM.open = true; SM.mode = 'hash';
api.applySummon(0);
ok('J5 選「引用物件」：#token 換成 @、游標在 @ 後面、接著開 @ 選單',
  blocks[0].text === '看這張 @' && log.some(l => l.focus === 'b1@5') && log.some(l => l.trigger === '看這張 @') && !SM.open, blocks[0].text);
SM.hits = [{ k: 'standup' }]; SM.mode = 'hash';
api.applySummon(0);
ok('J6 其他 # 項目照舊交給原本的 applySummon', log.some(l => l.baseApply === 0));

/* ---- 日誌一行的引用膠囊（不是物件卡片） ---- */
blocks.push({ id: 'b2', t: 'p', text: '參考 @組織 這張' });
const baseCalls = () => log.filter(l => 'baseApply' in l).length;
let before = baseCalls();
Object.assign(SM, { open: true, mode: 'at', q: '組織', start: 3, blockId: 'b2', hits: [{ mention: true, ty: 'asset', rid: 'AST-0001', nm: 'x' }] });
api.applySummon(0);
const b2 = blocks[1];
ok('L1 @ 選了物件：拿掉 @token、那一行掛上引用，不變成物件卡片',
  b2.text === '參考  這張' && b2.t === 'p' && !b2.obj && api.lineRefs(b2).length === 1 && b2.refs[0].rid === 'AST-0001' && baseCalls() === before, JSON.stringify(b2));
b2.text = '參考 @組 這張'; Object.assign(SM, { open: true, mode: 'at', q: '組', start: 3, blockId: 'b2' });
api.applySummon(0);
ok('L2 同一個物件在同一行引用兩次只留一個', b2.refs.length === 1 && b2.text === '參考  這張');
SM.hits = [{ mention: true, ty: 'person', rid: 'lily' }]; SM.mode = 'at'; before = baseCalls();
api.applySummon(0);
ok('L3 @ 選的是人：照舊交給原本那一層（通知／請回覆）', baseCalls() === before + 1);
const lineHtml = api.ebHtml(b2);
ok('L4 那一行畫成：文字＋引用膠囊（虛線、帶「引用」、可移除），膠囊緊跟在文字後面',
  lineHtml.includes('class="eb has-refs ') && lineHtml.indexOf('obj-ref-cite') > lineHtml.indexOf('eb-tx') && lineHtml.includes('lineRefRemove(') && lineHtml.includes("objPeek('asset','AST-0001'"));
ok('L5 沒有引用的行原樣不動', api.ebHtml(blocks[0]) === stubs.ebHtml(blocks[0]));
api.lineRefRemove('b2', 0);
ok('L6 移除引用：只拿掉膠囊，物件與文字都還在', !('refs' in b2) && b2.text === '參考  這張' && !!api.objFind('asset', 'AST-0001'));

const pad = s => s + ' '.repeat(Math.max(0, 66 - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));
let fail = 0;
for (const [st, name, extra] of results) { if (st === 'FAIL') fail++; console.log(`${st}  ${pad(name)}${extra ? '  ' + extra : ''}`); }
console.log(`\n${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
