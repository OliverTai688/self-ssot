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

/** 引用膠囊：圖示＋型別＋名稱，點一下開物件、點兩下改名（有權限時）。 */
function objRefChip(ref) {
  const gone = !objFind(ref.ty, ref.rid);
  return `<button type="button" class="obj-ref ${gone ? 'gone' : ''}" title="${gone ? '物件已刪除' : '開啟'}"
    onclick="event.stopPropagation();objRefOpen('${esc(ref.ty)}','${esc(ref.rid)}')">${svg(objRefIcon(ref.ty, ref.rid), 11)}
    <span class="obj-ref-k">${esc(objRefLabel(ref.ty, ref.rid))}</span>
    <span class="obj-ref-n" ${objRenAttr(ref.ty, ref.rid)}>${esc(objRefName(ref.ty, ref.rid))}</span></button>`;
}

/** 引用選單的候選：沿用 @ 引用的同一份清單（mentionHits），只留物件、不留人。 */
function objRefHits(q) {
  return (typeof mentionHits === 'function' ? mentionHits(q || '') : [])
    .filter(h => h && h.ty && h.rid && h.ty !== 'person')
    .slice(0, 8);
}

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
