/* ── 物件名稱：在哪裡都叫得出來、在哪裡都改得了 ─────────────────────────────
 *
 * 兩件事收在同一個檔案，因為它們讀的是同一張「物件 → 名稱」的表：
 *
 *   一、引用。回覆、留言這類「不是日誌正文」的書寫面，也要能指著一個物件說話 ——
 *       「參考 10-15 的截圖」光靠文字對方得自己去找。引用存的是 {ty, rid}，
 *       名稱每次畫的時候才查，所以物件改名之後，所有引用它的地方一起變。
 *
 *   二、改名。物件名稱點兩下直接改。單擊的原本行為（展開卡片、打開抽屜）延後 260ms，
 *       雙擊就取消單擊、進入編輯；不這樣做的話，第一下單擊的 render() 會把正要被雙擊的
 *       那個節點換掉，雙擊永遠接不到。
 *
 * 可以改名的：日誌誕生的物件（文件物件＝議題／任務／Standup…、檔案＝截圖／聲音／影片／附件、連結）。
 * 誰能改：作者，以及公司負責人（isOwner）。工作項目、專案、交易這些有自己的編輯表單，不在這裡改。
 * ───────────────────────────────────────────────────────────────────────── */

/* ---------- 一、物件 → 名稱／標籤／圖示 ---------- */

const OBJ_LEDGER_LABEL = { issue: '工作', project: '專案', txn: '交易', decision: '決策', event: '事件' };
const OBJ_LEDGER_ICON = { issue: 'issue', project: 'project', txn: 'txn', decision: 'commit', event: 'timeline' };
const OBJ_LEDGER_LIST = { issue: () => DB.issues, project: () => DB.projects, txn: () => DB.txns, decision: () => DB.decisions, event: () => DB.events };

function objFind(ty, rid) {
  if (ty === 'doc_object') return (DB.docObjects || []).find(x => x.id === rid) || null;
  if (ty === 'asset') return (DB.assets || []).find(x => x.id === rid) || null;
  if (ty === 'link') return (DB.links || []).find(x => x.id === rid) || null;
  const list = OBJ_LEDGER_LIST[ty];
  return list ? (list() || []).find(x => x.id === rid) || null : null;
}
function objRefName(ty, rid) {
  const o = objFind(ty, rid);
  if (!o) return '（物件已刪除）';
  if (ty === 'doc_object') return docObjectName(o);
  if (ty === 'asset') return o.name || o.id;
  if (ty === 'link') return o.title || o.url || o.id;
  return o.t || o.id;
}
function objRefLabel(ty, rid) {
  const o = objFind(ty, rid);
  if (ty === 'doc_object') return o ? docObjectLabel(o, metaOf(o)) : '物件';
  if (ty === 'asset') return o ? (AST_LABELS[o.kind] || '檔案') : '檔案';
  if (ty === 'link') return '連結';
  return OBJ_LEDGER_LABEL[ty] || '物件';
}
function objRefIcon(ty, rid) {
  const o = objFind(ty, rid);
  if (ty === 'doc_object') return o && o.type === 'agenda' ? 'flag' : 'journal';
  if (ty === 'asset') return o ? astMeta(o.kind).ic : 'paperclip';
  if (ty === 'link') return 'goto';
  return OBJ_LEDGER_ICON[ty] || 'dot';
}
function objRefOpen(ty, rid) {
  if (!objFind(ty, rid)) return toast('這個物件已經不存在');
  if (ty === 'doc_object') return openDocPage(rid);
  objJump(ty, rid);
}

/**
 * 引用膠囊：「引用」標記＋圖示＋型別＋名稱。點一下彈出來看（objPeek），點兩下改名（有權限時）。
 * 虛線框與「引用」兩個字是刻意的：物件的家在別處，這裡只是再提一次 —— 一眼要分得出來。
 * bid 有值表示膠囊掛在日誌的某一行上，彈出來的視窗才有「移除引用」。
 */
function objRefChip(ref, bid, i) {
  const gone = !objFind(ref.ty, ref.rid);
  return `<button type="button" class="obj-ref ${gone ? 'gone' : ''}" title="${gone ? '物件已刪除' : '引用 · 點一下查看'}"
    onclick="event.stopPropagation();objPeek('${esc(ref.ty)}','${esc(ref.rid)}',this,'${esc(bid || '')}',${Number(i) || 0})"><span class="obj-ref-cite">引用</span>${svg(objRefIcon(ref.ty, ref.rid), 11)}
    <span class="obj-ref-k">${esc(objRefLabel(ref.ty, ref.rid))}</span>
    <span class="obj-ref-n" ${objRenAttr(ref.ty, ref.rid)}>${esc(objRefName(ref.ty, ref.rid))}</span></button>`;
}

/** 引用選單的候選：沿用 @ 引用的同一份清單（mentionHits），只留物件、不留人。 */
function objRefHits(q) {
  return (typeof mentionHits === 'function' ? mentionHits(q || '') : [])
    .filter(h => h && h.ty && h.rid && h.ty !== 'person')
    .slice(0, 8);
}

/* ---------- 一之二、日誌正文的 @ 選單：物件不能被帳本擠掉 ----------
 *
 * mentionHits() 是好幾層疊起來的：原型先放工作項目、專案、交易、決策、事件，後面幾層再補
 * 文件物件、檔案、連結。原本每一層都 slice(0, 40)，帳本一多，排在後面的物件在沒打字時
 * 根本進不了選單 —— 看起來就像「只能引用專案，不能引用物件」。
 * 所以裡面幾層不再截斷，改在這裡（最外層）統一收：日誌誕生的物件排前面、新的在上；
 * 沒打字時每類只放幾筆，打了字每類放寬，總數仍是 40。
 */
const OBJ_MENTION_ORDER = ['doc_object', 'asset', 'link', 'project', 'issue', 'decision', 'txn', 'event'];
const OBJ_MENTION_RECENT = { doc_object: 1, asset: 1, link: 1 };
const OBJ_MENTION_MAX = 40;

function objMentionAt(h) {
  const o = objFind(h.ty, h.rid) || {};
  return o.updatedAt || o.createdAt || Date.parse(o.day || '') || 0;
}
const objMentionBase = mentionHits;
mentionHits = function (q) {
  const groups = new Map();
  objMentionBase(q).forEach(h => {
    if (h.ty === 'doc_object') {
      const o = objFind(h.ty, h.rid);
      h.nm = objRefName(h.ty, h.rid);
      h.ds = (o ? docObjectLabel(o, metaOf(o)) + ' · ' : '') + h.ds;
      h.ic = objRefIcon(h.ty, h.rid);
      h.g = '日誌物件';
    }
    if (!groups.has(h.ty)) groups.set(h.ty, []);
    groups.get(h.ty).push(h);
  });
  const keys = [...OBJ_MENTION_ORDER.filter(k => groups.has(k)), ...[...groups.keys()].filter(k => !OBJ_MENTION_ORDER.includes(k))];
  const per = q ? 12 : 5;
  const out = [];
  keys.forEach(k => {
    const list = groups.get(k);
    if (OBJ_MENTION_RECENT[k]) list.sort((a, b) => objMentionAt(b) - objMentionAt(a));
    out.push(...list.slice(0, per));
  });
  return out.slice(0, OBJ_MENTION_MAX);
};

/* # 召喚也要有「引用物件」：「引用專案」一直在 # 選單裡，物件卻只能靠 @，找不到入口。
 * 選了就把 #token 換成 @、接著開 @ 選單 —— 搜尋與引用走的是同一條路，不另做一個表單。 */
(function () {
  const items = SUMMON[1].items, at = items.findIndex(it => it.k === 'project');
  items.splice(at < 0 ? items.length : at + 1, 0, {
    k: 'ref', nm: '引用物件', ds: '議題、任務、檔案、連結、工作項目… 這一行只放名稱，點了彈出來看', ic: 'at'
  });
})();
const objRefBaseApplySummon = applySummon;
applySummon = function (n) {
  const h = SM.hits[n];
  if (SM.mode !== 'hash' || !h || h.mention || h.k !== 'ref') return objRefBaseApplySummon(n);
  if (!canWriteJournal()) return;
  const b = bOf(SM.blockId);
  if (!b) return closeSummon();
  syncAll();
  const start = SM.start;
  b.text = b.text.slice(0, start) + '@' + b.text.slice(start + 1 + SM.q.length);
  closeSummon();
  focusB(b.id, start + 1);
  render();
  const tx = root.querySelector(`.eb[data-id="${b.id}"] .eb-tx`);
  if (tx) checkTrigger(tx, bOf(b.id) || b);
};

/* ---------- 一之三、日誌的一行引用物件：放名稱，不搬卡片 ----------
 *
 * 原本 @ 選了物件，那一行整個變成物件卡片 —— 跟「在這裡建立」的物件長得一模一樣，
 * 分不出哪張是在這裡誕生、哪張只是再提一次；物件索引的「出處」也會被引用搶走。
 * 現在 @ 只在那一行掛一個引用膠囊（b.refs = [{ty, rid}]），文字照留：
 *   「參考 [引用 · 圖片 · 組織圖.png] 這張」
 * 點膠囊彈出一個小視窗看物件本身，要細看再從那裡開抽屜／獨立頁面。
 * 存的是 {ty, rid}，名稱畫的時候才查，所以物件改名之後引用跟著變。
 * 「誕生」仍然是物件卡片（# 召喚、上傳、貼網址），兩者在畫面上與資料上都分開。
 */
const LINE_REFS_MAX = 20;
function lineRefs(b) {
  return b && Array.isArray(b.refs) ? b.refs.filter(r => r && r.ty && r.rid) : [];
}
/** 日誌行與物件段落裡的行都找得到；別人的、不能寫的找不到 —— 同 stkLocate。 */
function lineRefBlock(bid) {
  const hit = typeof stkLocate === 'function' ? stkLocate(bid) : null;
  return hit ? hit.b : null;
}
function lineRefsHtml(b, writable) {
  return `<span class="eb-refs" contenteditable="false">${lineRefs(b).map((r, i) => `<span class="obj-ref-wrap">${objRefChip(r, b.id, i)}${writable
    ? `<button type="button" class="obj-ref-x" aria-label="移除引用" title="移除引用（物件本身不受影響）" onmousedown="event.preventDefault()" onclick="event.stopPropagation();lineRefRemove('${esc(b.id)}',${i})">${svg('x', 10)}</button>` : ''}</span>`).join('')}</span>`;
}
/** 膠囊緊跟在那一行的文字後面（.eb-tx 之後、其他行尾標記之前）。 */
function lineRefsInto(html, b, writable) {
  if (!html || !b || !TEXTY(b.t) || !lineRefs(b).length) return html;
  const at = html.indexOf('class="eb-tx');
  const end = at < 0 ? -1 : html.indexOf('</div>', at);
  if (end < 0) return html;
  return html.slice(0, end + 6).replace('class="eb ', 'class="eb has-refs ') + lineRefsHtml(b, writable) + html.slice(end + 6);
}
/** 唯讀的行（對方欄、回顧）原本遇到空白行直接略過；只掛了引用的行要畫出來。 */
function lineRefsOnly(b) {
  return `<div class="eb ind${Math.min(5, b.ind || 0)} has-refs jc-ro" data-t="${b.t}"><div class="eb-tx"></div>${lineRefsHtml(b, false)}</div>`;
}

const lineRefBaseEb = ebHtml;
ebHtml = function (b) {
  return lineRefsInto(lineRefBaseEb(b), b, canWriteJournal());
};
if (typeof jcPeerBlock === 'function') {
  const lineRefBasePeer = jcPeerBlock;
  jcPeerBlock = function (author, b) {
    const html = lineRefBasePeer(author, b);
    if (!html && b && TEXTY(b.t) && lineRefs(b).length) return lineRefsOnly(b);
    return lineRefsInto(html, b, false);
  };
}
if (typeof jrBlockHtml === 'function') {
  const lineRefBaseJr = jrBlockHtml;
  jrBlockHtml = function (b) {
    const html = lineRefBaseJr(b);
    if (!html && b && TEXTY(b.t) && lineRefs(b).length) return lineRefsOnly(b);
    return lineRefsInto(html, b, false);
  };
}

/* @ 選單選了物件：拿掉 @token、在這一行掛引用。人（通知／請回覆）走 replies 那一層，不經過這裡。 */
const lineRefBaseApply = applySummon;
applySummon = function (n) {
  const h = SM.hits[n];
  if (SM.mode !== 'at' || !h || !h.mention || !h.ty || !h.rid || h.ty === 'person') return lineRefBaseApply(n);
  if (!canWriteJournal()) return;
  const b = bOf(SM.blockId);
  if (!b || !TEXTY(b.t)) return closeSummon();
  syncAll();
  snap();
  const start = SM.start, len = 1 + SM.q.length, ref = { ty: h.ty, rid: h.rid }, name = objRefName(h.ty, h.rid);
  closeSummon();
  commit('update', '引用', name, () => {
    b.text = b.text.slice(0, start) + b.text.slice(start + len);
    b.refs = lineRefs(b).filter(r => !(r.ty === ref.ty && r.rid === ref.rid)).concat(ref).slice(-LINE_REFS_MAX);
    return ['這一行引用了「' + esc(name) + '」（' + esc(objRefLabel(ref.ty, ref.rid)) + '）', '只放名稱，不另建資料；點名稱可以彈出來查看', '該物件的反向連結會出現這一天'];
  });
  // commit() 自己會重畫一次；游標要在最後這一次重畫之後才放回去，否則會落在被換掉的舊節點上。
  focusB(b.id, start);
  render();
};

function lineRefRemove(bid, i) {
  if (!canWriteJournal()) return;
  syncAll();
  const b = lineRefBlock(bid), refs = lineRefs(b), r = refs[i];
  if (!b || !r) return;
  snap();
  objPeekClose();
  commit('update', '引用', objRefName(r.ty, r.rid), () => {
    const rest = refs.filter((_, k) => k !== i);
    if (rest.length) b.refs = rest; else delete b.refs;
    return ['移除這一行對「' + esc(objRefName(r.ty, r.rid)) + '」的引用', '物件本身不受影響'];
  });
  render();
}

/* ---------- 一之四、點引用彈出來看 ----------
 * 小視窗，不是抽屜：看一眼就回去寫。內容沿用物件自己的卡片（objHtml），所以狀態是即時的；
 * 文件物件（議題／任務／Standup…）的卡片可以直接在裡面打字，彈出來的視窗不該能改，
 * 所以改畫唯讀摘要，要寫就按「開啟」到獨立頁面。 */
const OBJ_PEEK_TEXT = 220;
function objPeekEl() {
  let el = root.querySelector('#objPeek');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'objPeek';
  el.className = 'obj-peek';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', '引用的物件');
  const host = root.querySelector('#summon');
  (host && host.parentNode ? host.parentNode : root).appendChild(el);
  return el;
}
function objPeekSource(ty, rid, o) {
  // 出處只認「誕生」的那一行（物件卡片）；引用膠囊不算出處，所以這裡看得到它真正的家。
  const src = typeof oiSourceIndex === 'function' ? oiSourceIndex()[rid] : null;
  if (src && src.day) return `<div class="obj-peek-src">${svg('journal', 11)} 出自 ${esc(src.day)}${src.who ? ' · ' + esc(person(src.who)) : ''} 的日誌</div>`;
  if (o.day && o.author) return `<div class="obj-peek-src">${svg('journal', 11)} 建立於 ${esc(o.day)} · ${esc(person(o.author))}</div>`;
  return '';
}
function objPeekDoc(d) {
  const secs = (d.secs || []).map(sec => {
    const text = (typeof ensureSecBlocks === 'function' ? ensureSecBlocks(sec) : sec.blocks || [])
      .filter(x => TEXTY(x.t) && (x.text || '').trim()).map(x => x.text.trim()).join(' / ');
    return text ? `<div class="obj-peek-sec"><b>${esc(sec.title || '')}</b><span>${esc(text.length > OBJ_PEEK_TEXT ? text.slice(0, OBJ_PEEK_TEXT) + '…' : text)}</span></div>` : '';
  }).join('');
  return secs || '<div class="obj-peek-empty">還沒有內容</div>';
}
function objPeekBody(ty, rid) {
  const o = objFind(ty, rid);
  if (!o) return '<div class="obj-peek-empty">這個物件已經不存在（被刪除了），引用只剩名稱。</div>';
  if (ty === 'doc_object') return objPeekDoc(o);
  return objHtml({ id: 'peek-' + rid, t: 'obj', ind: 0, obj: { ty, rid } });
}
function objPeek(ty, rid, anchor, bid, i) {
  const el = objPeekEl(), o = objFind(ty, rid), line = bid ? lineRefBlock(bid) : null;
  const canUnref = !!line && canWriteJournal() && !!lineRefs(line)[i];
  el.dataset.key = ty + '|' + rid;
  el.innerHTML = `<div class="obj-peek-h"><span class="obj-peek-tag">${svg('at', 11)} 引用</span>${svg(objRefIcon(ty, rid), 12)}
      <span class="obj-ref-k">${esc(objRefLabel(ty, rid))}</span><b class="obj-peek-n" ${objRenAttr(ty, rid)}>${esc(objRefName(ty, rid))}</b>
      <button type="button" class="obj-peek-x" aria-label="關閉" onclick="objPeekClose()">${svg('x', 12)}</button></div>
    ${o ? objPeekSource(ty, rid, o) : ''}
    <div class="obj-peek-b">${objPeekBody(ty, rid)}</div>
    <div class="obj-peek-f">${canUnref ? `<button type="button" class="btn sm" onclick="lineRefRemove('${esc(bid)}',${Number(i) || 0})">移除引用</button>` : ''}<span class="sp"></span>
      ${o ? `<button type="button" class="btn sm pri" onclick="objPeekClose();objRefOpen('${esc(ty)}','${esc(rid)}')">${svg('goto', 12)} 開啟</button>` : ''}</div>`;
  el.classList.add('on');
  const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: 16, bottom: 80, top: 80 };
  const w = el.offsetWidth, h = el.offsetHeight;
  const below = r.bottom + 6 + h <= innerHeight - 8;
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  el.style.top = Math.max(8, below ? r.bottom + 6 : r.top - 6 - h) + 'px';
}
function objPeekClose() {
  const el = root.querySelector('#objPeek');
  if (el) el.classList.remove('on');
}
/* 點到視窗外面、按 Esc、或從視窗裡的卡片跳去別處（開抽屜、換頁）就收起來。 */
root.addEventListener('mousedown', e => {
  const el = root.querySelector('#objPeek.on');
  if (el && !e.composedPath().includes(el)) objPeekClose();
}, { capture: true, signal: controller.signal });
root.addEventListener('keydown', e => {
  if (e.key === 'Escape' && root.querySelector('#objPeek.on')) objPeekClose();
}, { capture: true, signal: controller.signal });
root.addEventListener('click', e => {
  const el = root.querySelector('#objPeek.on');
  if (el && e.composedPath().some(n => n && n.classList && n.classList.contains('eb-obj')) && e.composedPath().includes(el)) setTimeout(objPeekClose, 0);
}, { signal: controller.signal });

/* ---------- 二、改名 ---------- */

const OBJ_RENAMABLE = { doc_object: 1, asset: 1, link: 1 };
const OBJ_NAME_MAX = 120;

function objCanRename(ty, rid) {
  if (!OBJ_RENAMABLE[ty]) return false;
  const o = objFind(ty, rid);
  if (!o) return false;
  return o.author === DB.me || isOwner();
}
/** 名稱元素帶上這兩個屬性，雙擊就能改。沒有權限就什麼都不帶 —— 游標與提示也不出現。 */
function objRenAttr(ty, rid) {
  return objCanRename(ty, rid) ? `data-obj-ren="${esc(ty)}|${esc(rid)}" title="點兩下改名稱"` : '';
}

/** 打開的獨立頁面或抽屜也要跟著換名字；render() 只重畫工作台。 */
function objRenRepaint() {
  const stack = S.stack || [];
  if (stack.length && root.querySelector('#drawer.on')) paintDrawer();
}

function objRename(ty, rid, raw) {
  const o = objFind(ty, rid);
  if (!o) return false;
  if (!objCanRename(ty, rid)) { deny(); return false; }
  const name = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, OBJ_NAME_MAX);
  if (!name) { toast('名稱不能是空的'); return false; }
  if (name === objRefName(ty, rid)) return false;

  if (ty === 'asset') return astRename(o, name);

  commit('update', ty === 'link' ? '連結物件' : '文件物件', name, () => {
    if (ty === 'doc_object') { o.title = name; o.titleAuto = false; o.updatedAt = Date.now(); }
    else { o.title = name; o.updatedAt = Date.now(); }
    return ['改名為「' + esc(name) + '」', '參考碼不變；引用它的回覆、卡片與物件索引一起更新'];
  });
  objRenRepaint();
  return true;
}

/**
 * 檔案不走命令佇列（bytes 在儲存桶、列在 operating_assets），改名要打 uploads API。
 * 先改畫面、再送出；伺服器拒絕就改回來並說明 —— 不讓畫面停在一個沒存進去的名字上。
 */
function astRename(a, name) {
  const before = a.name;
  a.name = name;
  render();
  objRenRepaint();
  if (!OP_LIVE || !a.assetId) {
    toast('已改名為「' + esc(name) + '」' + (OP_LIVE ? '' : '（示例模式，不會保存）'));
    return true;
  }
  fetch(UPLOAD_ENDPOINT, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId: a.assetId, name })
  }).then(async res => {
    if (res.ok) return toast('已改名為「' + esc(name) + '」');
    const body = await res.json().catch(() => ({}));
    a.name = before; render(); objRenRepaint();
    toast('改名沒有保存：' + esc(body.error || ('HTTP ' + res.status)));
  }).catch(() => {
    a.name = before; render(); objRenRepaint();
    toast('改名沒有保存：連不上伺服器');
  });
  return true;
}

/* ---------- 三、點兩下編輯 ---------- */

let objRenTimer = 0;
const OBJ_REPLAYED = new WeakSet();

function objRenTarget(e) {
  const el = e.target && e.target.closest ? e.target.closest('[data-obj-ren]') : null;
  if (!el) return null;
  const [ty, rid] = String(el.dataset.objRen || '').split('|');
  return ty && rid && objCanRename(ty, rid) ? { el, ty, rid } : null;
}

function objStartRename(el, ty, rid) {
  if (el.isContentEditable) return;
  const original = objRefName(ty, rid);
  el.textContent = original;
  el.setAttribute('contenteditable', 'true');
  el.classList.add('obj-ren-on');
  el.focus();
  const range = doc.createRange();
  range.selectNodeContents(el);
  const sel = shadow.getSelection ? shadow.getSelection() : window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(range); }

  let done = false;
  const stop = ev => ev.stopPropagation();
  const finish = save => {
    if (done) return;
    done = true;
    el.removeAttribute('contenteditable');
    el.classList.remove('obj-ren-on');
    ['keydown', 'keyup', 'keypress', 'input', 'beforeinput', 'paste', 'mousedown', 'click'].forEach(t => el.removeEventListener(t, t === 'keydown' ? onKey : t === 'paste' ? onPaste : stop, true));
    el.removeEventListener('blur', onBlur);
    const next = el.textContent;
    if (!save || !objRename(ty, rid, next)) el.textContent = original;
  };
  const onKey = ev => {
    ev.stopPropagation();
    if (ev.isComposing) return;
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true); el.blur(); }
    else if (ev.key === 'Escape') { ev.preventDefault(); finish(false); el.blur(); }
  };
  const onPaste = ev => {
    ev.stopPropagation();
    ev.preventDefault();
    const text = (ev.clipboardData && ev.clipboardData.getData('text/plain')) || '';
    doc.execCommand('insertText', false, text.replace(/\s+/g, ' '));
  };
  const onBlur = () => finish(true);
  // 全部掛在捕獲階段並擋下冒泡：這個名稱可能長在日誌 #doc 裡，
  // 不擋的話 docKey／docInput 會把這裡的 Enter 與輸入當成日誌正文處理。
  el.addEventListener('keydown', onKey, true);
  el.addEventListener('paste', onPaste, true);
  ['keyup', 'keypress', 'input', 'beforeinput', 'mousedown', 'click'].forEach(t => el.addEventListener(t, stop, true));
  el.addEventListener('blur', onBlur);
}

/* 單擊延後、雙擊改名。只攔「有權限改名」的名稱元素，其他地方的點擊完全不經過這裡。 */
root.addEventListener('click', e => {
  if (OBJ_REPLAYED.has(e)) return;
  const hit = objRenTarget(e);
  if (!hit || hit.el.isContentEditable) return;
  e.stopPropagation();
  e.preventDefault();
  clearTimeout(objRenTimer);
  if (e.detail >= 2) return;
  objRenTimer = setTimeout(() => {
    if (!hit.el.isConnected || hit.el.isContentEditable) return;
    const replay = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true });
    OBJ_REPLAYED.add(replay);
    hit.el.dispatchEvent(replay);
  }, 260);
}, { capture: true, signal: controller.signal });

root.addEventListener('dblclick', e => {
  const hit = objRenTarget(e);
  if (!hit) return;
  e.stopPropagation();
  e.preventDefault();
  clearTimeout(objRenTimer);
  objStartRename(hit.el, hit.ty, hit.rid);
}, { capture: true, signal: controller.signal });

/* ---------- 四、共用的引用輸入（回覆、議題討論、行內留言） ----------
 *
 * 三個書寫面長得不一樣（請求回覆框、議題討論列、行內留言列），但「引用」這件事要一模一樣：
 * 一顆「引用」按鈕、或打 @關鍵字 跳出選單，選到的物件以膠囊排在輸入框下方，送出時帶走。
 * 所以狀態以 key 區分（'rq:REQ-1'、'ag:AGENDA-…'、'lc:yz:b12'），書寫面只負責三件事：
 *   1. 畫的時候呼叫 orBind(key, cfg) 登記：怎麼讀寫草稿、輸入框在哪、選完要怎麼重畫；
 *   2. 輸入框掛 orInput／orKey，旁邊放 orButton，底下放 orTray；
 *   3. 送出時用 orRefsOf(key) 取引用，存進那則訊息的 refs，成功後 orClear(key)。
 * 同一個 key 可能同時長在兩處（議題卡片＋議題頁），清單更新一律用 querySelectorAll。
 */

const orRefs = new Map(), orPick = new Map(), orCfg = new Map();
const OR_AT = /(?:^|\s)[@＠]([^\s@＠]{0,20})$/;

/* 選單與膠囊一律「就地換掉托盤那一塊」，從不重畫輸入框：
 * 第一版開選單時整段重畫，打 @截圖 打得快的話，「截圖」兩個字會在輸入框被換掉的那一瞬間掉在地上，
 * 選單就停在沒有關鍵字的清單。輸入框不動，焦點、游標、注音組字就都不會被打斷。 */

/** cfg: { get():string, set(v), focus():Element|null } */
function orBind(key, cfg) { orCfg.set(key, cfg); }
function orRefsOf(key) { return (orRefs.get(key) || []).map(f => ({ ty: f.ty, rid: f.rid })); }
function orClear(key) { orRefs.delete(key); orPick.delete(key); }
function orInputEl(key) { const c = orCfg.get(key); return c && c.focus ? c.focus() : null; }
function orFocus(key) {
  const el = orInputEl(key);
  if (!el) return;
  el.focus();
  if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length);
}
/** 同一個 key 可能有兩個托盤（議題卡＋議題頁），全部換掉。 */
function orPaintTray(key) {
  root.querySelectorAll('[data-or-tray="' + key + '"]').forEach(el => { el.innerHTML = orTrayInner(key); });
}
/** 托盤裡的搜尋框：找跟正在用的那個輸入框同一個書寫面的那一個。 */
function orSearchEl(key) {
  const all = [...root.querySelectorAll('[data-or-q="' + key + '"]')];
  const input = orInputEl(key);
  if (input) for (let n = input.parentElement; n; n = n.parentElement) { const hit = all.find(q => n.contains(q)); if (hit) return hit; }
  return all[0] || null;
}

/** 輸入框的 oninput 呼叫（在書寫面存完草稿之後）。打到 @關鍵字 就開選單、邊打邊篩。 */
function orInput(key, v) {
  const m = String(v || '').match(OR_AT), st = orPick.get(key);
  if (m) { orPick.set(key, { q: m[1], at: true }); orPaintTray(key); }
  else if (st && st.at) { orPick.delete(key); orPaintTray(key); }
}
/** 輸入框的 onkeydown 先問這裡；回 true 表示選單吃掉了這個鍵，書寫面不要再處理（例如不要送出）。 */
function orKey(e, key) {
  if (e.isComposing) return false;
  const st = orPick.get(key);
  if (!st) return false;
  if (e.key === 'Enter') { const h = objRefHits(st.q)[0]; e.preventDefault(); e.stopPropagation(); if (h) orAdd(key, h.ty, h.rid); return true; }
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); orPick.delete(key); orPaintTray(key); return true; }
  return false;
}
function orToggle(key) {
  if (orPick.has(key)) { orPick.delete(key); orPaintTray(key); orFocus(key); return; }
  orPick.set(key, { q: '', at: false });
  orPaintTray(key);
  orSearchEl(key)?.focus();
}
function orSearch(key, v) { orPick.set(key, { q: v, at: false }); orPaintList(key); }
function orSearchKey(e, key) {
  e.stopPropagation();
  if (e.isComposing) return;
  if (e.key === 'Enter') { e.preventDefault(); const h = objRefHits((orPick.get(key) || {}).q)[0]; if (h) orAdd(key, h.ty, h.rid); }
  if (e.key === 'Escape') { e.preventDefault(); orToggle(key); }
}
function orAdd(key, ty, rid) {
  const list = orRefs.get(key) || [];
  if (!list.some(f => f.ty === ty && f.rid === rid)) list.push({ ty, rid });
  orRefs.set(key, list);
  // 從 @ 進來的：打到一半的 @關鍵字 從文字裡拿掉，引用改由膠囊表達。輸入框本身也要跟著改值。
  const st = orPick.get(key), c = orCfg.get(key);
  if (st && st.at && c) {
    const t = String(c.get() || '').replace(OR_AT, '').trimEnd(), next = t ? t + ' ' : '';
    c.set(next);
    const el = orInputEl(key); if (el) el.value = next;
  }
  orPick.delete(key);
  orPaintTray(key);
  orFocus(key);
}
function orRemove(key, i) { const list = orRefs.get(key) || []; list.splice(i, 1); orRefs.set(key, list); orPaintTray(key); orFocus(key); }

function orButton(key) {
  return `<button type="button" class="btn sm" title="引用截圖、聲音、影片、檔案、議題、任務…" onmousedown="event.preventDefault()" onclick="event.stopPropagation();orToggle('${key}')">${svg('at', 12)} 引用</button>`;
}
function orList(key) {
  const hits = objRefHits((orPick.get(key) || {}).q || '');
  if (!hits.length) return '<div class="rq-empty">找不到符合的物件</div>';
  return hits.map(h => `<button type="button" class="rq-refpick-it" onmousedown="event.preventDefault()" onclick="event.stopPropagation();orAdd('${key}','${esc(h.ty)}','${esc(h.rid)}')">${svg(objRefIcon(h.ty, h.rid), 12)}<span class="k">${esc(objRefLabel(h.ty, h.rid))}</span><span class="n">${esc(objRefName(h.ty, h.rid))}</span><span class="d">${esc(h.ds || '')}</span></button>`).join('');
}
function orPaintList(key) {
  const lists = root.querySelectorAll('[data-or-list="' + key + '"]');
  if (!lists.length) return orPaintTray(key);
  lists.forEach(el => { el.innerHTML = orList(key); });
}
function orTrayInner(key) {
  const refs = orRefs.get(key) || [], st = orPick.get(key);
  const chips = refs.length ? `<div class="obj-refs draft">${refs.map((f, i) => `<span class="obj-ref-wrap">${objRefChip(f)}<button type="button" class="obj-ref-x" aria-label="移除引用" onmousedown="event.preventDefault()" onclick="event.stopPropagation();orRemove('${key}',${i})">${svg('x', 10)}</button></span>`).join('')}</div>` : '';
  const panel = st ? `<div class="rq-refpick">
    ${st.at ? '' : `<input data-or-q="${key}" aria-label="搜尋要引用的物件" placeholder="搜尋截圖、檔案、議題、任務…" value="${esc(st.q)}" oninput="event.stopPropagation();orSearch('${key}',this.value)" onkeydown="orSearchKey(event,'${key}')">`}
    <div class="rq-refpick-list" data-or-list="${key}">${orList(key)}</div></div>` : '';
  return chips + panel;
}
/** 輸入框底下那一塊：已選的膠囊＋（開著時）選單。外層容器固定存在，之後只換裡面。 */
function orTray(key) {
  return `<div class="or-tray" data-or-tray="${key}" contenteditable="false">${orTrayInner(key)}</div>`;
}
/** 訊息裡的引用膠囊列。 */
function orChips(refs) {
  return refs && refs.length ? `<div class="obj-refs">${refs.map(objRefChip).join('')}</div>` : '';
}
