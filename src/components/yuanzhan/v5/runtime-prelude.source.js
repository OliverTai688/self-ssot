// One DOM island, one state, deterministic teardown (including React Strict Mode).
const runtime = {};
const doc = root.ownerDocument;
const shadow = root.getRootNode();
const getById = id => root.querySelector('[id="'+CSS.escape(String(id))+'"]');
/* 游標與選取範圍。Shadow DOM 裡的選取，各家瀏覽器給法不同：
 *   · Chromium 有 shadowRoot.getSelection()，直接用。
 *   · WebKit（iPhone／iPad 上所有瀏覽器都是它）沒有。document.getSelection() 回的是一個退到
 *     host 外面的位置，addRange() 對 shadow 內的 range 則完全不作用。於是 caretOff() 永遠是 0、
 *     setCaret() 先 removeAllRanges() 再 addRange() 等於把游標丟掉、貼上因為「游標不在這一行裡」
 *     被整個吃掉 —— 手機上按 Enter 是把整行推到下一行，接著打字沒有反應。
 * WebKit 的正路是 getComposedRanges() 讀、setBaseAndExtent() 寫。這裡包成同一個介面，
 * 引擎那邊用到的五個成員（rangeCount／getRangeAt／removeAllRanges／addRange／toString）不必改。 */
const composedRange = sel => {
  let list = [];
  try { list = sel.getComposedRanges({ shadowRoots: [shadow] }); } catch { list = []; }
  // Safari 17 的第一版簽名是 getComposedRanges(...shadowRoots)，收到物件會丟 TypeError。
  if (!list.length || !shadow.contains(list[0].startContainer)) {
    try { const legacy = sel.getComposedRanges(shadow); if (legacy.length) list = legacy; } catch { /* 新簽名不吃這種寫法 */ }
  }
  const at = list[0];
  if (!at) return null;
  try {
    const range = doc.createRange();
    range.setStart(at.startContainer, at.startOffset);
    range.setEnd(at.endContainer, at.endOffset);
    return range;
  } catch {
    return null;
  }
};
const composedSelection = sel => ({
  get rangeCount() { return composedRange(sel) ? 1 : 0; },
  getRangeAt() {
    const range = composedRange(sel);
    if (!range) throw new DOMException('No selection range', 'IndexSizeError');
    return range;
  },
  removeAllRanges() { sel.removeAllRanges(); },
  addRange(range) { sel.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset); },
  toString() { const range = composedRange(sel); return range ? range.toString() : ''; }
});
const selection = () => {
  if (shadow.getSelection) return shadow.getSelection();
  const sel = doc.getSelection();
  return sel && typeof sel.getComposedRanges === 'function' ? composedSelection(sel) : sel;
};
const controller = new AbortController();
const timers = new Set();
const setTimeout = (fn,ms) => {const id=globalThis.setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id;};
const clearTimeout = id => {globalThis.clearTimeout(id);timers.delete(id)};
const listen = (type,fn) => root.addEventListener(type,fn,{signal:controller.signal});
let bindId=0;
const handlers = new Map();
const bind = (type, fn) => {const id=String(++bindId);handlers.set(id,{type,fn});return 'data-v5-'+type+'="'+id+'"';};
let active = true;
const wire = () => {
 root.querySelectorAll('*').forEach(el=>{
  for(const attr of [...el.attributes]){
   if(!attr.name.startsWith('data-v5-'))continue;
   const h=handlers.get(attr.value);if(!h)continue;
   el.removeAttribute(attr.name);
   el.addEventListener(h.type,e=>{try{h.fn(e,el);wire()}catch(err){if(err instanceof TypeError||err instanceof ReferenceError||err instanceof SyntaxError)console.error('v5 action:',err);const error=root.querySelector('#fErr');if(error){error.textContent=err.message;error.classList.add('on');error.setAttribute('role','alert')}toast('操作未完成：'+esc(err.message||'請檢查輸入'))}});
  }
 });
 // Functions are now owned by their DOM nodes and can be reclaimed with detached nodes.
 handlers.clear();
};
const observer=new MutationObserver(()=>wire());
observer.observe(root,{childList:true,subtree:true});
const destroy=()=>{active=false;observer.disconnect();controller.abort();for(const id of timers)globalThis.clearTimeout(id);timers.clear();handlers.clear();root.replaceChildren()};
