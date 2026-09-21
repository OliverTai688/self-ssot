// One DOM island, one state, deterministic teardown (including React Strict Mode).
const runtime = {};
const doc = root.ownerDocument;
const shadow = root.getRootNode();
const getById = id => root.querySelector('[id="'+CSS.escape(String(id))+'"]');
const selection = () => shadow.getSelection ? shadow.getSelection() : doc.getSelection();
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
