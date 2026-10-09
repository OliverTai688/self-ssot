/* ── 日誌貼紙：行內打 / 召喚，蓋在那一行上 ─────────────────────────────────────
   # 建立物件、@ 引用或通知、?@ 請對方回覆、! 標議題 —— 這些都會產生一個要追蹤的東西。
   / 不會：它只是往這一行貼一張貼紙，裝飾與標註用。

   第一張是 /done 完成章：「這件小事做完了」。它不值得開一張任務，也不是待辦清單
   （待辦是事前寫下、事後打勾；完成章是做完了才回頭蓋）。但蓋了章的那一行會被記下來：
   右側駕駛艙列出這一天完成的小事，物件卡片的標題列顯示這張物件裡蓋了幾個章。

   第二張是 /doing 進行中：「這件事我正在做」。一行一張貼紙，所以做完之後在同一行
   打 /done，進行中會直接換成完成章 —— 不必先撕掉。進行中不進完成的統計，
   但右側駕駛艙另有一區「正在做的事」：還貼著進行中的行，前幾天留下來的也會一路帶到今天。

   資料：貼紙記在那一行自己身上 —— b.stk = { k, at, by }。日誌的行與文件物件段落的行
   都是整包存成 JSON 的 blocks，所以不需要新的集合、欄位或 migration，跟著原本的
   自動保存（render → opTouch）走；對方那一頭讀回來的 blocks 上就帶著章。
   計數不另外存：每次都從 blocks 現算，行被刪掉、章被撕掉，數字自己就對。

   掛在 replies 之前載入：ebHtml 在這裡包的是最裡面那一層，拿到的還是單純的
   `<div class="eb">…<div class="eb-tx">…</div></div>`，貼紙才插得進 .eb 裡、.eb-tx 後面。
   ───────────────────────────────────────────────────────────────────────── */

/* 貼紙表。新增一張：把圖放進 public/stickers/，在這裡加一列。
   圖檔格式：1:1、透明背景、建議 SVG（或 256px 以上的 PNG／WebP），自帶白邊，
   縮到 20px 還認得出來。k 只用小寫英數，它就是使用者打的 /k。 */
const STICKERS = [
  { k: 'done', nm: '完成', ds: '蓋一個完成章 · 小事做完就蓋', src: '/stickers/done.svg', alias: ['完成'] },
  { k: 'doing', nm: '進行中', ds: '正在做的事 · 做完在同一行打 /done 換成完成章', src: '/stickers/doing.svg', alias: ['進行中', 'wip'] },
];
const STK_BY = Object.fromEntries(STICKERS.map(s => [s.k, s]));
/* 只有這一張算「完成」，只有 doing 算「正在做」；之後加的貼紙純粹是裝飾，不進任何統計。 */
const STK_DONE = 'done', STK_DOING = 'doing';

/* 行首或空白之後的 /字。前面要求空白，網址（https://…）、日期（10/7）、路徑都不會誤觸。 */
const STK_TRIGGER = /(?:^|\s)[\/／]([^\s\/／#@]{0,12})$/;
/* 打完整個名字再按一下空白就直接蓋，不必等選單。 */
const STK_INSTANT = /(?:^|\s)[\/／]([^\s\/／#@]{1,12})[ \u3000]$/;

function stkOf(b) { return (b && b.stk && STK_BY[b.stk.k]) || null; }
function stkHits(q) {
  q = (q || '').toLowerCase();
  return STICKERS
    .filter(s => !q || s.k.startsWith(q) || s.nm.includes(q) || s.alias.some(a => a.startsWith(q)))
    .map(s => ({ ...s, g: '貼紙', ic: '/' }));
}
function stkExact(q) {
  q = (q || '').toLowerCase();
  return STICKERS.find(s => s.k === q || s.alias.includes(q)) || null;
}
function stkWhen(ms) {
  if (!ms) return '';
  const d = new Date(ms), hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return new Date().toDateString() === d.toDateString() ? hm : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
}

/* ---- 蓋章、撕掉 ---- */
let stkFreshId = '', stkFreshUntil = 0;
/** start/len 是那個 /字 在 b.text 裡的位置：蓋章的同時把它從文字裡拿掉。 */
function stkStamp(b, k, start, len) {
  const s = STK_BY[k];
  if (!s || !b || !canWriteJournal()) return;
  snap();
  const text = (b.text.slice(0, start) + b.text.slice(start + len)).replace(/\s+$/, '');
  const had = stkOf(b);
  b.text = text;
  if (!had || had.k !== k) {
    b.stk = { k, at: Date.now(), by: DB.me };
    stkFreshId = b.id; stkFreshUntil = Date.now() + 600;
  }
  focusB(b.id, Math.min(start, text.length));
  render();
  if (had && had.k === k) toast(`這一行已經貼過「${esc(s.nm)}」了`);
}
/* 點貼紙的時候焦點不一定在那一行所在的書寫面上，bOf() 會被 BLKS_OVERRIDE 指到別處；
   所以自己找：自己的日誌，再來是自己能寫的物件。別人的行這裡找不到，也就撕不掉。 */
function stkLocate(id) {
  const mine = jdoc().blocks.find(b => b.id === id);
  if (mine) return { b: mine };
  for (const doc of DB.docObjects || []) {
    if (!docWritable(doc)) continue;
    for (const sec of doc.secs || []) {
      const b = (sec.blocks || []).find(x => x.id === id);
      if (b) return { b, doc };
    }
  }
  return null;
}
function stkPeel(id) {
  if (!canWriteJournal()) return;
  syncAll();
  const hit = stkLocate(id);
  if (!hit || !hit.b.stk) return;
  snap();
  delete hit.b.stk;
  if (hit.doc) hit.doc.updatedAt = Date.now();
  render();
  toast('已撕掉貼紙');
}

/* ---- 畫在那一行上 ---- */
/** own：自己的行，貼紙是一顆按鈕，點一下撕掉；別人的行只是一張圖。 */
function stkHtml(b, own) {
  const s = stkOf(b);
  if (!s) return '';
  const tip = `${s.nm} · ${person(b.stk.by)} ${stkWhen(b.stk.at)}`;
  const img = `<img class="stk-img" src="${s.src}" alt="${esc(s.nm)}" draggable="false">`;
  if (!own) return `<span class="stk" title="${esc(tip)}">${img}</span>`;
  const fresh = stkFreshId === b.id && Date.now() < stkFreshUntil ? ' fresh' : '';
  return `<button type="button" class="stk${fresh}" contenteditable="false" title="${esc(tip)} · 點一下撕掉" onclick="stkPeel('${b.id}')">${img}</button>`;
}
const stkBaseEb = ebHtml;
ebHtml = function (b) {
  const html = stkBaseEb(b);
  if (!b || !TEXTY(b.t) || !stkOf(b)) return html;
  const end = html.lastIndexOf('</div>');
  return html.slice(0, end).replace('class="eb ', 'class="eb stk-on ') + stkHtml(b, true) + html.slice(end);
};

/* ---- / 觸發：沿用 # 與 @ 的那一張選單 ---- */
const stkBaseTrigger = checkTrigger;
checkTrigger = function (tx, b) {
  if (b && !COMPOSING && TEXTY(b.t) && b.t !== 'code') {
    const upto = b.text.slice(0, caretOff(tx));
    let m = upto.match(STK_INSTANT);
    const exact = m && stkExact(m[1]);
    if (exact) {
      if (SM.open) closeSummon();
      return stkStamp(b, exact.k, upto.length - m[1].length - 2, m[1].length + 2);
    }
    m = upto.match(STK_TRIGGER);
    const hits = m ? stkHits(m[1]) : [];
    if (hits.length) {
      const start = upto.length - m[1].length - 1;
      if (!SM.open || SM.blockId !== b.id || SM.mode !== 'stk') openSummon(b.id, start, m[1], caretRect(tx), 'stk');
      SM.q = m[1]; SM.start = start; SM.hits = hits; SM.sel = Math.min(SM.sel, hits.length - 1);
      return paintSummon();
    }
  }
  if (SM.open && SM.mode === 'stk') closeSummon();
  return stkBaseTrigger(tx, b);
};
const stkBasePaint = paintSummon;
paintSummon = function () {
  stkBasePaint();
  if (SM.mode !== 'stk') return;
  root.querySelectorAll('#summonList .summon-i').forEach((el, i) => {
    const h = SM.hits[i];
    // openSummon 會先用 # 的清單畫一次，那時 hits 還沒換成貼紙
    if (!h || !h.src) return;
    el.querySelector('.kb').textContent = '/' + h.k;
    el.querySelector('.ic').outerHTML = `<img class="stk-menu-img" src="${h.src}" alt="">`;
  });
};
const stkBaseApply = applySummon;
applySummon = function (n) {
  if (SM.mode !== 'stk') return stkBaseApply(n);
  if (!canWriteJournal()) return;
  const h = SM.hits[n], b = bOf(SM.blockId);
  if (!h || !b) return closeSummon();
  syncAll();
  const start = SM.start, len = 1 + SM.q.length;
  closeSummon();
  stkStamp(b, h.k, start, len);
};

/* ---- 記錄：哪些行蓋了完成章、哪些行還貼著進行中 ---- */
/** 空白行貼了也不算：沒有寫下是什麼事，就沒有東西可以記。 */
function stkCounts(b, k = STK_DONE) { return !!b && TEXTY(b.t) && !!b.stk && b.stk.k === k && !!(b.text || '').trim(); }
/* 物件的段落裡還可以再嵌物件（Standup 的 Today 裡放一張任務），所以一路走到底。
   只讀 sec.blocks，不呼叫 ensureSecBlocks()：那支會替還沒展開過的段落補出 blocks，查詢不該改資料。
   seen 擋住互相引用的物件，同 template-objects 的 DOC_SEC_STACK。 */
function stkWalk(blocks, doc, visit, seen) {
  (blocks || []).forEach((b, i) => {
    if (!b) return;
    if (b.t !== 'obj') return visit(b, i, doc);
    const o = b.obj || {};
    if ((o.ty !== 'doc_object' && o.ty !== 'doc') || seen.has(o.rid)) return;
    seen.add(o.rid);
    const inner = (DB.docObjects || []).find(d => d.id === o.rid);
    for (const sec of (inner && inner.secs) || []) stkWalk(sec.blocks, inner, visit, seen);
  });
}
/** 一張物件裡（連同它裡面嵌的物件）蓋了完成章的行。 */
function stkDocLines(doc) {
  const out = [];
  if (!doc) return out;
  const seen = new Set([doc.id]);
  for (const sec of doc.secs || []) stkWalk(sec.blocks, doc, b => { if (stkCounts(b)) out.push(b); }, seen);
  return out;
}
/** 物件卡片標題列上的那一顆：這張物件裡完成了幾件小事，滑過去看是哪幾行。 */
function stkDocChip(doc) {
  const lines = stkDocLines(doc);
  if (!lines.length) return '';
  const tip = `完成的小事 ${lines.length} 件\n` + lines.slice(0, 12).map(b => '· ' + b.text.trim()).join('\n') + (lines.length > 12 ? '\n…' : '');
  return `<span class="stk-count" title="${esc(tip)}"><img src="${STK_BY[STK_DONE].src}" alt="完成">${lines.length}</span>`;
}
/** 某一天兩個人的日誌上（連同嵌在日誌裡的物件）貼著 k 這張貼紙的行，照貼上的時間排。
    seen 由呼叫端傳入時可以跨日共用：同一張物件被引用到好幾天的日誌上，也只算一次。 */
function stkDayLines(day = S.jday, k = STK_DONE, seen = new Set()) {
  const out = [];
  for (const who of Object.keys(DB.people)) {
    stkWalk(jcDoc(who, day)?.blocks, null, (b, i, doc) => {
      if (stkCounts(b, k)) out.push({ who: doc ? doc.author || who : who, b, day, where: doc ? docObjectLabel(doc) : 'L' + (i + 1) });
    }, seen);
  }
  return out.sort((a, z) => (a.b.stk.at || 0) - (z.b.stk.at || 0));
}
/* 正在做的事不會在午夜自動做完：看「今天」的時候，前幾天還貼著進行中的行一起帶過來，
   直到那一行換成完成章或貼紙被撕掉。回頭翻某一天，就只看那一天頁面上的。 */
const STK_DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
function stkDoingLines() {
  const seen = new Set(), out = stkDayLines(S.jday, STK_DOING, seen);
  if (S.jday !== TODAY) return out;
  const earlier = new Set();
  for (const who of Object.keys(DB.people)) for (const d of Object.keys(journals.team[who] || {})) if (STK_DAY_KEY.test(d) && d < TODAY) earlier.add(d);
  for (const d of [...earlier].sort()) out.push(...stkDayLines(d, STK_DOING, seen));
  return out.sort((a, z) => (a.b.stk.at || 0) - (z.b.stk.at || 0));
}
function stkRowHtml({ who, b, day, where }) {
  const s = STK_BY[b.stk.k], at = day === S.jday ? where : (+day.slice(5, 7)) + '/' + (+day.slice(8, 10));
  return `<button class="jc-obj stk-row" title="${esc(person(b.stk.by))} ${stkWhen(b.stk.at)} 貼上「${esc(s.nm)}」 · 點一下跳到那一行" onclick="stkJump('${b.id}','${day}')"><img class="stk-row-img" src="${s.src}" alt=""><span class="jc-obj-t">${esc(b.text.trim())}</span><span class="jc-obj-s">${esc(jcShort(who))} ${esc(at)}</span></button>`;
}
function stkSecHtml(id, title, rows, empty) {
  return `<div class="jc-sec" id="${id}"><div class="jc-sec-t stk-sec-t"><span>${title}</span>${rows.length ? `<b>${rows.length}</b>` : ''}</div>${rows.map(stkRowHtml).join('') || `<div class="rq-empty">${empty}</div>`}</div>`;
}
function stkCockpitHtml() {
  return stkSecHtml('stkDoing', '正在做的事', stkDoingLines(), '正在做的事，在那一行打 /doing')
    + stkSecHtml('stkDone', '完成的小事', stkDayLines(), '做完一件小事，就在那一行打 /done 蓋個章');
}
/* 那一行可能在別天的日誌上（從前幾天帶過來的進行中），也可能在收合的物件卡裡：
   先翻到那一天，找不到再把包著它的卡片展開找一次。 */
function stkJump(id, day) {
  if (day && day !== S.jday) { saveJournalDraft(); S.jday = day; jcLineOpen = ''; render(); }
  const find = () => root.querySelector(`.jc .eb[data-id="${CSS.escape(id)}"], .jc [data-jc-bid="${CSS.escape(id)}"]`);
  let el = find();
  if (!el) {
    const doc = (DB.docObjects || []).find(d => (d.secs || []).some(sec => (sec.blocks || []).some(b => b.id === id)));
    if (doc && doc.collapsed) { doc.collapsed = false; render(); el = find(); }
  }
  if (!el) return toast('那一行在物件裡面；展開包著它的卡片就看得到');
  el.scrollIntoView({ block: 'center' });
  el.classList.add('rq-flash');
}
