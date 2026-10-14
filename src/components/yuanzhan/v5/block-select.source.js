/* ==================================================================
   跨行選取（多區塊選取）
   ==================================================================

   每一行是自己的 contenteditable（`.eb-tx`），瀏覽器的原生選取不可能跨過
   兩個 editing host —— 這就是「一次只能選一行」的全部原因，不是 CSS 擋住的。
   additions.css 裡那幾條 `user-select:text!important` 是朝這個方向試過一次的痕跡，
   但 user-select 管的是「能不能選」，管不到「選取可不可以跨越 host」。

   要讓原生選取跨行，只有把整個 `.doc` 變成單一 contenteditable 一條路；
   那會讓 docInput／docKey 失去 `e.target.closest('.eb-tx')` 這個落點，
   而且瀏覽器會開始自己增刪 `.eb` 外層節點，整個區塊模型要重寫。
   所以這裡走大綱編輯器的慣例（Notion／Logseq 都是這樣）：跨行時改成**整行選取**，
   由我們自己畫高亮、自己處理複製、剪下、刪除與取代。行內的部分選取維持原生行為不動。

   選取狀態不進 S：它是畫面上的暫態，重整或切天都不該留下。 */

const MSEL = { ref: null, ids: [], anchorId: null, dragging: false, startRef: null, startId: null };

/* ---- 書寫面 ----
   同一組 blocks 會同時長在日誌的行內卡片與打開的獨立頁面兩處 DOM（見 syncAll 的註解），
   所以選取記的是「哪一個書寫面」而不是某個 DOM 節點 —— 節點每次 render 都會換新。 */
function msRefOf(el) {
  if (!el || !el.closest) return null;
  const sec = el.closest('[data-doc-sec]');
  if (sec) return { k: 'sec', docId: sec.dataset.docId, idx: Number(sec.dataset.secIdx) };
  return el.closest('#doc') ? { k: 'doc' } : null;
}
function msHostEl(ref) {
  if (!ref) return null;
  return ref.k === 'doc' ? root.querySelector('#doc') : docSecSurface(ref.docId, ref.idx);
}
function msSameRef(a, b) {
  return !!a && !!b && a.k === b.k && a.docId === b.docId && a.idx === b.idx;
}
function msBlocks(ref) {
  const host = msHostEl(ref);
  if (!host) return null;
  return ref.k === 'doc' ? jdoc().blocks : docSecBlocksOf(host);
}
/* 書寫面裡「自己的」那幾行：巢狀卡片的區塊也長在同一棵 DOM 底下，不能一起算進來。 */
function msOwns(host, el) {
  const own = host.dataset && host.dataset.docSec ? host : null;
  return el.closest('[data-doc-sec]') === own;
}

function msRange(ref, fromId, toId) {
  const arr = msBlocks(ref);
  if (!arr) return [];
  const i = arr.findIndex(x => x.id === fromId), j = arr.findIndex(x => x.id === toId);
  if (i < 0 || j < 0) return [];
  const lo = Math.min(i, j), hi = Math.max(i, j);
  return arr.slice(lo, hi + 1).map(x => x.id);
}

function msPaint() {
  root.querySelectorAll('.eb.msel').forEach(e => e.classList.remove('msel'));
  root.querySelectorAll('.msel-on').forEach(e => e.classList.remove('msel-on'));
  if (MSEL.ids.length < 2) return;
  const host = msHostEl(MSEL.ref);
  if (!host) return;
  host.classList.add('msel-on');
  const want = new Set(MSEL.ids);
  host.querySelectorAll('.eb[data-id]').forEach(el => {
    if (want.has(el.dataset.id) && msOwns(host, el)) el.classList.add('msel');
  });
}

function msClear() {
  const had = MSEL.ids.length;
  MSEL.ref = null; MSEL.ids = []; MSEL.anchorId = null;
  if (had) msPaint();
}

function msSet(ref, fromId, toId) {
  const next = msRange(ref, fromId, toId);
  // 拖曳時每一次 mousemove 都會進來；範圍沒變就不要重畫，游標也不會閃。
  const same = next.length === MSEL.ids.length && next.every((id, i) => MSEL.ids[i] === id);
  MSEL.ref = ref;
  MSEL.anchorId = fromId;
  MSEL.ids = next;
  const s = selection();
  if (s && next.length > 1) s.removeAllRanges();
  if (!same) msPaint();
}

/* ---- 拖曳選取 ----
   mousedown 不攔（原生的游標定位要照常），等指標真的move到另一行才切換成整行選取。
   切過去的那一刻把原生選取清掉，否則第一行會同時有兩種高亮。 */
root.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const tx = e.target.closest && e.target.closest('.eb-tx');
  const ref = tx && canWriteJournal() ? msRefOf(tx) : null;
  if (!ref) { msClear(); return; }
  if (e.shiftKey && MSEL.anchorId && msSameRef(MSEL.ref, ref)) {
    e.preventDefault();
    msSet(ref, MSEL.anchorId, tx.dataset.id);
    return;
  }
  msClear();
  MSEL.dragging = true;
  MSEL.startRef = ref;
  MSEL.startId = tx.dataset.id;
}, { capture: true, signal: controller.signal });

root.addEventListener('mousemove', e => {
  if (!MSEL.dragging) return;
  const eb = e.target.closest && e.target.closest('.eb[data-id]');
  const host = msHostEl(MSEL.startRef);
  if (!eb || !host || !msOwns(host, eb)) return;
  if (eb.dataset.id === MSEL.startId) { msClear(); return; }
  msSet(MSEL.startRef, MSEL.startId, eb.dataset.id);
}, { capture: true, signal: controller.signal });

root.addEventListener('mouseup', () => {
  MSEL.dragging = false;
  if (MSEL.ids.length > 1) {
    const s = selection();
    if (s) s.removeAllRanges();
  }
}, { capture: true, signal: controller.signal });

/* ---- 複製 ---- */
function msObjLabel(b) {
  const o = b.obj || {};
  const d = (DB.docObjects || []).find(x => x.id === o.rid);
  return d ? `[${metaOf(d).nm}] ${docObjectName(d)}` : `[物件] ${o.rid || ''}`;
}
/* 貼到別的地方要看得出層次與型別，所以帶上 Markdown 記號 —— 與 copyDocMarkdown 同一套慣例。 */
function msLine(b) {
  const pad = '  '.repeat(Math.min(5, b.ind || 0));
  if (b.t === 'divider') return pad + '---';
  if (b.t === 'obj') return pad + msObjLabel(b);
  const mark = { h1: '# ', h2: '## ', h3: '### ', quote: '> ', bullet: '- ', code: '' }[b.t]
    ?? (b.t === 'todo' ? (b.done ? '- [x] ' : '- [ ] ') : null)
    ?? ((b.ind || 0) > 0 ? '- ' : '');
  return pad + mark + (b.text || '');
}
function msText() {
  const arr = msBlocks(MSEL.ref) || [];
  return MSEL.ids.map(id => arr.find(x => x.id === id)).filter(Boolean).map(msLine).join('\n');
}
function msCopy() {
  const text = msText(), n = MSEL.ids.length;
  const done = () => toast(`已複製 <b>${n}</b> 行`);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => msCopyFallback(text, done));
    return;
  }
  msCopyFallback(text, done);
}
/* 沒有 clipboard API（或被權限擋下）時的退路。借用的 textarea 會搶走焦點，
   補回去，否則接下來的鍵盤事件不會再送到工作台裡。 */
function msCopyFallback(text, done) {
  const back = shadow.activeElement;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('style', 'position:fixed;left:-9999px;top:0;opacity:0');
  root.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  if (back && back.focus) back.focus();
  if (ok) done(); else toast('複製失敗，請改用瀏覽器的右鍵選單');
}

/* ---- 刪除 ----
   走 commit()，和單行的 delBlock 一樣：有 changelog、有「復原」、database 模式下有持久化。 */
function msDelete() {
  if (!canWriteJournal()) return;
  const ref = MSEL.ref, ids = MSEL.ids.slice(), arr = msBlocks(ref);
  if (!arr || ids.length < 2) return;
  syncAll();
  const i = arr.findIndex(x => x.id === ids[0]);
  if (i < 0) return;
  const removed = arr.slice(i, i + ids.length);
  if (removed.length !== ids.length || removed.some((b, k) => b.id !== ids[k])) return;
  const hasObj = removed.some(b => b.t === 'obj');
  const first = removed.find(b => TEXTY(b.t) && b.text);
  const prevId = arr[i - 1] && arr[i - 1].id;
  let filler = null;
  msClear();
  commit('delete', '日誌區塊', `${removed.length} 行 · ${first ? first.text : '（空行）'}`, () => {
    arr.splice(i, removed.length);
    // 書寫面不能留空：沒有任何一行就再也點不進去了。
    if (!arr.length) { filler = { id: newBid(), t: 'p', ind: 0, text: '' }; arr.push(filler); }
    focusB(prevId || arr[0].id, null);
    return hasObj
      ? [`日誌 −${removed.length} 區塊`, '<b>被引用的物件不受影響</b> —— 日誌只是它誕生的地方']
      : [`日誌 −${removed.length} 區塊`];
  }, () => {
    if (filler) { const f = arr.indexOf(filler); if (f >= 0) arr.splice(f, 1); filler = null; }
    arr.splice(i, 0, ...removed);
  });
}

/* ---- 直接打字取代 ----
   用 snap() 而不是 commit()：打字不該在變更紀錄裡留下一筆，和 Enter 分行同一個層級。 */
function msReplaceWith(ch) {
  if (!canWriteJournal()) return;
  const ref = MSEL.ref, ids = MSEL.ids.slice(), arr = msBlocks(ref);
  if (!arr || ids.length < 2) return;
  syncAll();
  const i = arr.findIndex(x => x.id === ids[0]);
  if (i < 0) return;
  const removed = arr.slice(i, i + ids.length);
  if (removed.length !== ids.length || removed.some((b, k) => b.id !== ids[k])) return;
  snap();
  const nb = { id: newBid(), t: 'p', ind: removed[0].ind || 0, text: ch, done: false };
  arr.splice(i, removed.length, nb);
  msClear();
  focusB(nb.id, ch.length);
  render();
}

/* ---- 鍵盤 ----
   掛在捕獲階段：停掉傳遞，`.doc` 上的 docKey 就收不到這一次按鍵，
   不必在 docKey 裡到處補「如果正在多選」的判斷。 */
function msWholeLineSelected(tx) {
  const len = String(tx.innerText || '').replace(/\n$/, '').length;
  if (!len) return true; // 空行：第一次按就直接往上升一級
  const s = selection();
  if (!s || !s.rangeCount || s.getRangeAt(0).collapsed) return false;
  return String(s.toString()).length >= len;
}
root.addEventListener('keydown', e => {
  if (e.isComposing || COMPOSING || e.keyCode === 229) return;
  const mod = e.metaKey || e.ctrlKey;
  const act = shadow.activeElement;
  const tx = act && act.closest ? act.closest('.eb-tx') : null;

  // ⌘A：第一次選滿這一行（交給瀏覽器），再按一次選滿整個書寫面。
  if (mod && !e.altKey && e.key.toLowerCase() === 'a' && tx && canWriteJournal()) {
    const ref = msRefOf(tx);
    const arr = ref && msBlocks(ref);
    if (arr && arr.length && (MSEL.ids.length > 1 || msWholeLineSelected(tx))) {
      e.preventDefault(); e.stopPropagation();
      msSet(ref, arr[0].id, arr[arr.length - 1].id);
    }
    return;
  }

  if (MSEL.ids.length < 2) return;

  if (e.key === 'Escape') {
    e.preventDefault(); e.stopPropagation();
    const last = MSEL.ids[MSEL.ids.length - 1];
    msClear();
    focusB(last, null);
    render();
    return;
  }
  if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); e.stopPropagation(); msCopy(); return; }
  if (mod && e.key.toLowerCase() === 'x') { e.preventDefault(); e.stopPropagation(); msCopy(); msDelete(); return; }
  if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); e.stopPropagation(); msDelete(); return; }

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); e.stopPropagation();
    const arr = msBlocks(MSEL.ref) || [];
    if (e.shiftKey && MSEL.anchorId) {
      const edge = MSEL.ids[0] === MSEL.anchorId ? MSEL.ids[MSEL.ids.length - 1] : MSEL.ids[0];
      const at = arr.findIndex(x => x.id === edge);
      const next = arr[at + (e.key === 'ArrowDown' ? 1 : -1)];
      if (next) msSet(MSEL.ref, MSEL.anchorId, next.id);
      return;
    }
    const land = e.key === 'ArrowDown' ? MSEL.ids[MSEL.ids.length - 1] : MSEL.ids[0];
    msClear();
    focusB(land, null);
    render();
    return;
  }

  if (mod || e.altKey) return; // ⌘Z 等照常交給 docKey
  if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); msReplaceWith(''); return; }
  if (e.key.length === 1) { e.preventDefault(); e.stopPropagation(); msReplaceWith(e.key); }
}, { capture: true, signal: controller.signal });

/* render() 會重建 DOM，高亮的 class 跟著不見；狀態本身記的是 block id，補畫回去就好。 */
const msBaseRender = render;
render = function (...args) {
  const out = msBaseRender(...args);
  if (MSEL.ids.length > 1) msPaint();
  return out;
};
