/* ==================================================================
   日誌 · 問 AI（RES-037 · JAI-S1）

   三欄：左邊對話清單，中間對話，右邊「這個對話看過的資料」。

   - 對話、訊息、答案都在伺服器（/api/company/operating/ai）。這裡只有畫面狀態：
     草稿、正在串流的那一則、清單的篩選。不進 DB 快照，不會被自動保存比對。
   - 答案裡的 ⟦cite⟧ 由伺服器驗證過才出現在最終訊息裡；串流中的標記還沒驗證，先畫成灰色佔位。
   - 物件引用沿用日誌的名稱膠囊（objRefChip → objPeek）；日誌行引用跳回那一天、那一行。
   - 回答在伺服器上跑完並存檔，畫面斷線或切到背景都不影響；回來時最後一則若還在跑就輪詢到結束。
   ================================================================== */

const JA_API = '/api/company/operating/ai/sessions';
const JA_KEY = 'ja';
const JA = {
  sessions: null, loading: false, err: '', active: null, msgs: Object.create(null), loadingMsgs: '',
  draft: '', live: null, q: '', showArchived: false, renaming: '', drawer: false, sheet: false, poll: 0,
  /** 輸入框上的附件：{ k, name, status: uploading|ready|failed, refCode, assetId, err } */
  files: [], saving: '', share: null,
  /** 從日誌選取帶進來、還沒送出的行：{ day, author, bid, text } */
  lines: [],
  /** 剛從日誌「問 AI」進來：開新對話，不要自動打開清單裡第一個 */
  fresh: false,
  usage: null,
  /** 還沒建立的新對話要用哪個模型（RES-039）；null＝伺服器的預設 */
  pickModel: null
};

/* AI 團隊是左側自己的模組（RES-038）：分頁「對話」與「AI 團隊」。放在訊號之後。 */
I.bot ??= '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>';
if (!WB.some(w => w.id === 'ai')) {
  const at = WB.findIndex(w => w.id === 'signal');
  WB.splice(at >= 0 ? at + 1 : WB.length, 0, { id: 'ai', nm: 'AI', ic: 'bot', scn: '問公司的 AI 團隊', rule: '', tabs: ['對話', 'AI 團隊'] });
}
const JA_TAB = 0;

/* ---------- 伺服器 ---------- */

async function jaFetch(url, opts) {
  const res = await fetch(url, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {}));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '處理失敗，請再試一次。');
  return data;
}
async function jaLoadSessions() {
  if (JA.loading || !OP_LIVE) return;
  JA.loading = true; JA.err = '';
  try {
    JA.sessions = (await jaFetch(JA_API)).sessions || [];
    jaLoadUsage();
    if (!JA.active && !JA.fresh) { const first = JA.sessions.find(s => !s.archived); if (first) jaOpen(first.id, true); }
  } catch (e) { JA.err = e.message; JA.sessions = JA.sessions || []; }
  JA.loading = false;
  if (jaOnPage()) render();
}
async function jaLoadMsgs(id) {
  JA.loadingMsgs = id;
  try {
    const data = await jaFetch(JA_API + '/' + encodeURIComponent(id) + '/messages');
    JA.msgs[id] = data.messages || [];
    jaPatchSession(data.session);
    const last = JA.msgs[id][JA.msgs[id].length - 1];
    if (last && (last.status === 'streaming' || last.status === 'stopping') && !(JA.live && JA.live.sessionId === id)) jaPollSoon(id);
  } catch (e) { toast(esc(e.message)); }
  if (JA.loadingMsgs === id) JA.loadingMsgs = '';
  if (jaOnPage()) render();
}
function jaPatchSession(s) {
  if (!s || !JA.sessions) return;
  const i = JA.sessions.findIndex(x => x.id === s.id);
  if (i >= 0) JA.sessions[i] = s; else JA.sessions.unshift(s);
}
/** 回答還在伺服器上跑（例如剛從背景分頁回來）：每 2 秒讀一次，直到它結束。 */
function jaPollSoon(id) {
  clearTimeout(JA.poll);
  JA.poll = setTimeout(() => { if (JA.active === id && jaOnPage()) jaLoadMsgs(id); }, 2000);
}
function jaOnPage() { return S.wb === 'ai' && S.tab === JA_TAB; }

/* ---------- 對話清單 ---------- */

async function jaNew(agent) {
  if (JA.live) return toast('上一則還在回答中');
  try {
    const { session } = await jaFetch(JA_API, { method: 'POST', body: JSON.stringify({ agent: agent || 'journal', model: JA.pickModel || undefined }) });
    jaPatchSession(session);
    JA.active = session.id; JA.msgs[session.id] = []; JA.drawer = false;
    jaFocusSoon(); render();
  } catch (e) { toast(esc(e.message)); }
}
function jaOpen(id, quiet) {
  JA.fresh = false;
  JA.active = id; JA.drawer = false; JA.renaming = '';
  if (!JA.msgs[id]) jaLoadMsgs(id);
  if (!quiet) { jaFocusSoon(); render(); }
}
async function jaPatch(id, patch) {
  try { jaPatchSession((await jaFetch(JA_API + '/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(patch) })).session); }
  catch (e) { toast(esc(e.message)); }
  render();
}
function jaTogglePin(id) { const s = jaSession(id); if (s) jaPatch(id, { pinned: !s.pinned }); }
function jaToggleArchive(id) { const s = jaSession(id); if (s) jaPatch(id, { archived: !s.archived }); }
function jaStartRename(id) { JA.renaming = id; render(); runtime._afterRender = () => { const el = root.querySelector('#jaRename'); if (el) { el.focus(); el.select(); } }; }
function jaRenameKey(e, id) {
  e.stopPropagation();
  if (e.isComposing) return;
  if (e.key === 'Enter') { e.preventDefault(); jaRenameDone(id, e.target.value); }
  if (e.key === 'Escape') { e.preventDefault(); JA.renaming = ''; render(); }
}
function jaRenameDone(id, value) {
  if (JA.renaming !== id) return;
  JA.renaming = '';
  const t = String(value || '').trim();
  if (t && t !== (jaSession(id) || {}).title) jaPatch(id, { title: t }); else render();
}
async function jaDelete(id) {
  if (!confirm('刪除這個對話？刪除後清單裡看不到，30 天後永久刪除。')) return;
  try {
    await jaFetch(JA_API + '/' + encodeURIComponent(id), { method: 'DELETE' });
    JA.sessions = (JA.sessions || []).filter(s => s.id !== id);
    delete JA.msgs[id];
    if (JA.active === id) JA.active = null;
  } catch (e) { toast(esc(e.message)); }
  render();
}
function jaToggleArchived() { JA.showArchived = !JA.showArchived; render(); }
function jaToggleDrawer() { JA.drawer = !JA.drawer; JA.sheet = false; render(); }
function jaToggleSheet(on) { JA.sheet = typeof on === 'boolean' ? on : !JA.sheet; JA.drawer = false; render(); }
function jaSession(id) { return (JA.sessions || []).find(s => s.id === id) || null; }
function jaSetQ(v) { JA.q = v; jaPaintList(); }
function jaPaintList() { const el = root.querySelector('#jaSessions'); if (el) el.innerHTML = jaSessionGroups(); }

/* ---------- 送出與串流 ---------- */

function jaFocusSoon() { runtime._afterRender = () => { const el = root.querySelector('#jaInput'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }; }

async function jaSend(text) {
  let q = String(text == null ? JA.draft : text).trim();
  if (JA.live) return toast('上一則還在回答中');
  if (JA.files.some(f => f.status === 'uploading')) return toast('檔案還在上傳，傳完再送出');
  const files = JA.files.filter(f => f.status === 'ready');
  const lines = JA.lines.slice();
  if (!q && files.length) q = '請看附件。';
  if (!q && lines.length) q = '這幾行在說什麼？有沒有該追的事？';
  if (!q && orRefsOf(JA_KEY).length) q = '這是什麼？重點是什麼？';
  if (!q) return;
  if (!JA.active) {
    try { const { session } = await jaFetch(JA_API, { method: 'POST', body: JSON.stringify({ model: JA.pickModel || undefined }) }); jaPatchSession(session); JA.active = session.id; JA.msgs[session.id] = []; }
    catch (e) { return toast(esc(e.message)); }
  }
  const id = JA.active, refs = orRefsOf(JA_KEY);
  const pins = [...lines.map(l => ({ ty: 'line', rid: l.day + ':' + l.author + ':' + l.bid })),
    ...files.map(f => ({ ty: 'asset', rid: f.refCode })), ...refs.filter(r => !files.some(f => r.ty === 'asset' && r.rid === f.refCode))];
  JA.draft = ''; orClear(JA_KEY); JA.files = []; JA.lines = []; JA.fresh = false;
  JA.live = { sessionId: id, assistantId: '', text: '', steps: [], user: { role: 'user', text: q, pins, citations: [], steps: [], sentRefs: [], status: 'done' } };
  jaFocusSoon(); render(); jaScrollEnd();

  let res;
  try {
    res = await fetch(JA_API + '/' + encodeURIComponent(id) + '/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: q, pins }) });
  } catch {
    JA.live = null; JA.draft = q; JA.files = files; JA.lines = lines; render();
    return toast('連不上伺服器，問題已放回輸入框');
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    JA.live = null; JA.draft = q; JA.files = files; JA.lines = lines; render();
    return toast(esc(data.error || '送不出去，問題已放回輸入框'));
  }
  try { await jaReadStream(res.body, id); }
  catch { /* 串流中斷：伺服器仍在跑，改用輪詢接回來 */ }
  const live = JA.live;
  JA.live = null;
  if (live && !live.done) jaLoadMsgs(id); else render();
  jaScrollEnd();
}

async function jaReadStream(body, id) {
  const reader = body.getReader(), dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let cut;
    while ((cut = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, cut); buf = buf.slice(cut + 2);
      let event = 'message', data = '';
      for (const line of raw.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (data) jaOnEvent(id, event, JSON.parse(data));
    }
  }
}

function jaOnEvent(id, event, data) {
  const live = JA.live;
  if (!live || live.sessionId !== id) return;
  if (event === 'meta') {
    live.assistantId = data.assistantId;
    const list = JA.msgs[id] || (JA.msgs[id] = []);
    list.push(data.user); live.user = null;
    const s = jaSession(id);
    if (s && s.titleAuto && list.length === 1) { s.title = jaAutoTitle(data.user.text); jaPaintList(); }
  } else if (event === 'delta') { live.text += data.text; jaPaintLive(); }
  else if (event === 'reset') { live.text = ''; jaPaintLive(); }
  else if (event === 'step') { live.steps.push(data); jaPaintLive(); }
  else if (event === 'done') {
    (JA.msgs[id] || (JA.msgs[id] = [])).push(data.message);
    live.done = true;
    jaLoadUsage();
    const s = jaSession(id); if (s) s.lastMessageAt = new Date().toISOString();
  }
}
function jaAutoTitle(t) { const f = String(t || '').replace(/\s+/g, ' ').trim(); return f.length > 24 ? f.slice(0, 24) + '…' : f || '新對話'; }

/** 串流中只換掉正在長的那一則，不重畫整頁：重畫會打斷輸入框的焦點與注音組字。 */
function jaPaintLive() {
  const el = root.querySelector('#jaLive');
  if (!el || !JA.live) return;
  const atEnd = jaNearEnd();
  el.innerHTML = jaLiveInner(JA.live);
  if (atEnd) jaScrollEnd();
}
function jaNearEnd() { const t = root.querySelector('#jaThread'); return !t || t.scrollHeight - t.scrollTop - t.clientHeight < 80; }
function jaScrollEnd() { requestAnimationFrame(() => { const t = root.querySelector('#jaThread'); if (t) t.scrollTop = t.scrollHeight; }); }

async function jaStop() {
  if (!JA.active) return;
  try { await jaFetch(JA_API + '/' + encodeURIComponent(JA.active) + '/stop', { method: 'POST' }); toast('已停止'); }
  catch (e) { toast(esc(e.message)); }
}

function jaInputKey(e) {
  if (orKey(e, JA_KEY)) return;
  if (e.key !== 'Enter') return;
  e.stopPropagation();
  // Shift+Enter 換行；注音／拼音選字中的 Enter 不是送出
  if (!e.shiftKey && !e.isComposing) { e.preventDefault(); jaSend(); }
}
function jaInput(el) {
  JA.draft = el.value;
  orInput(JA_KEY, el.value);
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

/* ---------- 跳回來源 ---------- */

function jaJumpLine(day, author, bid) {
  saveJournalDraft();
  S.wb = 'journal'; S.tab = 0; S.jday = day;
  if (author !== DB.me) toast(esc(person(author) || author) + ' 的日誌在右欄');
  runtime._afterRender = () => {
    const el = root.querySelector('.eb[data-id="' + bid + '"]');
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('rq-flash');
    setTimeout(() => el.classList.remove('rq-flash'), 2900);
  };
  render();
}
function jaOpenCite(kind, a, b, c) {
  if (kind === 'line') return jaJumpLine(a, b, c);
  objRefOpen(a, b);
}
function jaCopy(i) {
  const m = (JA.msgs[JA.active] || [])[i];
  if (!m) return;
  const plain = jaPlain(m);
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(plain).then(() => toast('已複製'), () => toast('複製失敗'));
}
/** 複製用的純文字：引用換成名稱。 */
function jaPlain(m) {
  const byCite = jaCiteMap(m);
  return String(m.text || '').replace(/⟦([^⟦⟧\n]{1,200})⟧/g, (_a, c) => byCite[c] ? '［' + byCite[c].label + '］' : '');
}

/* ---------- 渲染：答案 ---------- */

function jaCiteMap(m) { const out = Object.create(null); (m.citations || []).forEach(c => { out[c.cite] = c; }); return out; }

function jaLineLabel(c) {
  const d = String(c.day || '');
  return Number(d.slice(5, 7)) + '/' + d.slice(8, 10) + ' 日誌';
}
function jaCiteChip(c) {
  if (c.kind === 'object' && !objFind(c.ty, c.rid)) return `<span class="ja-noacc" title="${esc(c.label || '')}">${svg('lock', 10)} 無法存取</span>`;
  if (c.kind === 'object') return objRefChip({ ty: c.ty, rid: c.rid }) + (c.page ? `<span class="ja-page" title="模型引用的是第 ${c.page} 頁">p.${c.page}</span>` : '');
  return `<button type="button" class="ja-cite" title="${esc(c.label || '')} · 點一下回到那一行" onclick="jaJumpLine('${esc(c.day)}','${esc(c.author)}','${esc(c.blockId)}')">${svg('journal', 11)}<span>${esc(jaLineLabel(c))}</span><span class="ja-cite-l">${esc(String(c.label || '').replace(/^.*·\s*/, ''))}</span></button>`;
}
/** 輕量格式：段落、清單、粗體。先跳脫再加標記，答案裡的任何字都不會變成 HTML。 */
function jaFormat(text, citeHtml) {
  const lines = String(text || '').split('\n');
  let html = '', inList = false;
  const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/⟦([^⟦⟧\n]{1,200})⟧/g, (_a, c) => citeHtml(c.replace(/&amp;/g, '&')));
  for (const raw of lines) {
    const line = raw.trimEnd();
    const li = line.match(/^\s*(?:[-*•]|\d+[.、])\s+(.*)$/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inline(li[1]) + '</li>'; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    html += h ? '<p class="ja-h">' + inline(h[1]) + '</p>' : '<p>' + inline(line) + '</p>';
  }
  if (inList) html += '</ul>';
  return html;
}
function jaAnswerHtml(m) {
  const byCite = jaCiteMap(m);
  return jaFormat(m.text, c => c === '?' ? '<span class="ja-unv" title="這個引用對不上任何讀過的資料，已移除">?</span>' : byCite[c] ? jaCiteChip(byCite[c]) : '');
}
function jaSteps(steps, open) {
  if (!steps || !steps.length) return '';
  return `<details class="ja-steps" ${open ? 'open' : ''}><summary>${svg('search', 11)} ${steps.map(s => esc(s.label) + (s.hits ? ' · ' + s.hits + ' 筆' : '')).slice(0, 3).join('　')}${steps.length > 3 ? '　…共 ' + steps.length + ' 步' : ''}</summary>
    <ol>${steps.map(s => `<li>${esc(s.label)}<span class="sg-meta">${s.hits ? s.hits + ' 筆' : '沒有結果'}</span></li>`).join('')}</ol></details>`;
}
const JA_STATUS = { stopped: '已停止', error: '沒有完成', refused: '這一題模型沒有回答', streaming: '還在回答中…', stopping: '停止中…' };
function jaMsgHtml(m, i) {
  if (m.role === 'user') {
    const who = m.authorKey && m.authorKey !== DB.me ? `<div class="ja-who">${esc(person(m.authorKey) || m.authorKey)}</div>` : '';
    return `<div class="ja-msg ja-u">${who}<div class="ja-bubble">${esc(m.text).replace(/\n/g, '<br>')}${jaPinChips(m.pins)}${jaSaveRow(m.pins)}</div></div>`;
  }
  const busy = m.status === 'streaming' || m.status === 'stopping';
  const st = m.status !== 'done' ? `<div class="ja-st ${m.status === 'error' || m.status === 'refused' ? 'bad' : ''}">${svg(busy ? 'clock' : 'warn', 12)} ${esc(JA_STATUS[m.status] || m.status)}${m.error ? '：' + esc(m.error) : ''}</div>` : '';
  return `<div class="ja-msg ja-a">${jaSteps(m.steps)}${m.text ? `<div class="ja-ans">${jaAnswerHtml(m)}</div>` : ''}${jaProposals(m, i)}${st}
    ${m.text && !busy ? `<div class="ja-acts">${m.mock ? '<span class="chip c-w">示範模式</span>' : m.modelLabel ? `<span class="ja-by" title="回答這一則的模型">${esc(m.modelLabel)}</span>` : ''}<button class="btn sm" onclick="jaCopy(${i})">${svg('copy', 12)} 複製</button><button class="btn sm" onclick="jaToJournal(${i})">${svg('journal', 12)} 存進今天的日誌</button></div>` : ''}</div>`;
}
function jaLiveInner(live) {
  const pending = live.text ? jaFormat(live.text, () => '<span class="ja-pend">引用</span>') : '';
  return `${jaSteps(live.steps, true)}${pending ? `<div class="ja-ans">${pending}</div>` : `<div class="ja-think"><i></i><i></i><i></i> ${live.steps.length ? '整理答案中' : '查日誌中'}</div>`}`;
}

/* ---------- 渲染：三欄 ---------- */

function jaGroupOf(s) {
  if (s.pinned) return 0;
  const t = Date.parse(s.lastMessageAt || s.createdAt) || 0, now = Date.now();
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  if (t >= startToday.getTime()) return 1;
  if (now - t < 7 * 86400000) return 2;
  return 3;
}
function jaSessionGroups() {
  const q = JA.q.trim().toLowerCase();
  const list = (JA.sessions || []).filter(s => (!s.isOwner ? !JA.showArchived : JA.showArchived ? s.archived : !s.archived) && (!q || s.title.toLowerCase().includes(q)));
  if (!list.length) return `<div class="ja-empty-l">${JA.sessions === null ? '讀取中…' : q ? '沒有符合的對話' : JA.showArchived ? '沒有封存的對話' : '還沒有對話'}</div>`;
  const names = ['釘選', '今天', '這週', '更早', '同事分享的'];
  const groups = [[], [], [], [], []];
  list.forEach(s => groups[!s.isOwner ? 4 : JA.showArchived ? 3 : jaGroupOf(s)].push(s));
  return groups.map((g, gi) => g.length ? `<div class="ja-g">${JA.showArchived && gi < 4 ? '封存' : names[gi]}</div>` + g.map(jaSessionRow).join('') : '').join('');
}
function jaSessionRow(s) {
  const on = s.id === JA.active;
  if (JA.renaming === s.id) {
    return `<div class="ja-s on"><input id="jaRename" class="ja-rn" value="${esc(s.title)}" aria-label="對話名稱" onkeydown="jaRenameKey(event,'${s.id}')" onblur="jaRenameDone('${s.id}',this.value)"></div>`;
  }
  return `<div class="ja-s ${on ? 'on' : ''}">
    <button class="ja-s-t" onclick="jaOpen('${s.id}')" ${s.isOwner ? `ondblclick="jaStartRename('${s.id}')"` : ''} title="${esc(s.title)}">${s.pinned ? svg('star', 11) : ''}${s.shared ? svg('layers', 11) : ''}<span>${esc(s.title)}</span>${s.isOwner ? '' : `<i class="ja-s-by">${esc(person(s.ownerKey) || s.ownerKey)}</i>`}</button>
    ${s.isOwner ? `<span class="ja-s-a">
      <button aria-label="改名" title="改名" onclick="jaStartRename('${s.id}')">${svg('pen', 11)}</button>
      <button aria-label="${s.pinned ? '取消釘選' : '釘選'}" title="${s.pinned ? '取消釘選' : '釘選'}" onclick="jaTogglePin('${s.id}')">${svg('star', 11)}</button>
      <button aria-label="${s.archived ? '取消封存' : '封存'}" title="${s.archived ? '取消封存' : '封存'}" onclick="jaToggleArchive('${s.id}')">${svg(s.archived ? 'undo' : 'inbox', 11)}</button>
      <button aria-label="刪除" title="刪除" onclick="jaDelete('${s.id}')">${svg('trash', 11)}</button>
    </span>` : ''}</div>`;
}

/** 起手問題：從現有的資料挑，不寫死。 */
function jaStarters() {
  const out = [];
  const docs = (DB.docObjects || []).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (docs[0]) out.push('「' + docObjectName(docs[0]) + '」的重點是什麼？');
  out.push('這一週我在日誌裡做了哪些事？');
  if ((DB.docObjects || []).some(d => d.type === 'agenda')) out.push('還沒結案的議題有哪些？');
  const asset = (DB.assets || [])[0];
  if (asset) out.push('「' + (asset.name || asset.id) + '」是在哪一天、為了什麼上傳的？');
  return out.slice(0, 3);
}

function jaSources(msgs) {
  const pins = [], reads = [], seen = new Set();
  let chars = 0;
  msgs.forEach(m => {
    (m.pins || []).forEach(p => { const k = p.ty + ':' + p.rid; if (!seen.has('p' + k)) { seen.add('p' + k); pins.push(p); } });
    (m.sentRefs || []).forEach(r => { chars += r.chars || 0; if (!seen.has(r.cite)) { seen.add(r.cite); reads.push(r); } });
  });
  const lines = reads.filter(r => r.cite.startsWith('line:')), objs = reads.filter(r => !r.cite.startsWith('line:'));
  const row = r => {
    const m = r.cite.match(/^line:(\d{4}-\d{2}-\d{2}):([^:]+):(.+)$/);
    if (m) return `<button class="ja-src-r" onclick="jaJumpLine('${esc(m[1])}','${esc(m[2])}','${esc(m[3])}')">${svg('journal', 11)}<span>${esc(r.label)}</span></button>`;
    const i = r.cite.indexOf(':');
    return `<button class="ja-src-r" onclick="objRefOpen('${esc(r.cite.slice(0, i))}','${esc(r.cite.slice(i + 1))}')">${svg(objRefIcon(r.cite.slice(0, i), r.cite.slice(i + 1)), 11)}<span>${esc(r.label)}</span></button>`;
  };
  const sec = (t, n, body) => `<div class="ja-src-sec"><div class="ja-g">${t}<span>${n}</span></div>${body}</div>`;
  const wan = chars >= 10000 ? (chars / 10000).toFixed(1) + ' 萬字' : chars + ' 字';
  return (pins.length ? sec('釘選的物件與日誌行', pins.length, jaPinChips(pins)) : '')
    + sec('本次讀過的日誌', lines.length, lines.slice(0, 40).map(row).join('') || '<div class="ja-empty-l">還沒有</div>')
    + sec('本次讀過的物件', objs.length, objs.slice(0, 40).map(row).join('') || '<div class="ja-empty-l">還沒有</div>')
    + `<div class="ja-sent">${svg('lock', 11)} 這個對話送出了 ${reads.length} 項資料、約 ${wan}。${jaShared() ? '這是共享對話：公司成員都看得到，新的提問只用公司看得到的資料。' : '只有你看得到這個對話。'}薪資與銀行對帳不會送出。</div>`;
}

/* ---------- 模型（RES-039）：Claude 或 OpenAI，每個對話自己選，隨時可換 ---------- */

/**
 * 選單只列伺服器接上了的模型（usage.models）。新對話：選了就用在建立的那一刻；
 * 既有對話：建立者換了下一則起生效，同事只看得到用的是哪個。一家都沒接上時顯示「示範模式」。
 */
function jaModelPicker() {
  const u = JA.usage;
  if (!u) return '';
  const models = u.models || [];
  const s = jaSession(JA.active);
  if (!models.length) return '<span class="chip c-w ja-model-x" title="伺服器還沒接上 Claude 或 OpenAI 的金鑰">示範模式</span>';
  const cur = s ? s.model : (JA.pickModel || u.defaultModel);
  if (s && !s.isOwner) return `<span class="ja-model-x" title="建立者選的模型">${svg('bot', 11)} ${esc(s.modelLabel || s.model)}</span>`;
  const known = models.some(m => m.id === cur);
  const opts = (known ? '' : `<option value="${esc(cur)}" selected disabled>${esc((s && s.modelLabel) || cur)}（沒有接上）</option>`)
    + ['anthropic', 'openai'].map(p => {
      const list = models.filter(m => m.provider === p);
      if (!list.length) return '';
      return `<optgroup label="${p === 'openai' ? 'OpenAI' : 'Claude'}">${list.map(m => `<option value="${esc(m.id)}" ${m.id === cur ? 'selected' : ''}>${esc(m.label)} · ${esc(m.note)}</option>`).join('')}</optgroup>`;
    }).join('');
  return `<select class="ja-model" aria-label="模型" title="這個對話用的模型，換了從下一則開始" ${JA.live ? 'disabled' : ''} onchange="jaSetModel(this.value)">${opts}</select>`;
}
async function jaSetModel(id) {
  const s = jaSession(JA.active);
  if (!s) { JA.pickModel = id; return; }
  if (s.model === id) return;
  await jaPatch(s.id, { model: id });
  const after = jaSession(s.id);
  if (after && after.model === id) toast('下一則起改用 ' + esc(after.modelLabel || id));
}

function jaComposer() {
  orBind(JA_KEY, { get: () => JA.draft, set: v => { JA.draft = v; }, focus: () => root.querySelector('#jaInput') });
  const busy = !!JA.live;
  return `<div class="ja-comp">
    <textarea id="jaInput" rows="1" aria-label="問日誌裡的任何事" placeholder="問日誌裡的任何事… @ 可以釘選物件" title="Enter 送出 · Shift+Enter 換行 · @ 釘選物件" oninput="jaInput(this)" onkeydown="jaInputKey(event)" onpaste="jaPaste(event)">${esc(JA.draft)}</textarea>
    <div class="ja-files" id="jaFiles">${jaFilesInner()}</div>
    <div class="ja-comp-b">${orButton(JA_KEY)}${jaModelPicker()}<label class="btn sm" title="附上圖片、PDF、Word、Excel、PowerPoint 或文字檔（也可以直接貼上或拖進來）">${svg('paperclip', 12)} 檔案<input type="file" multiple hidden accept="image/*,.pdf,.txt,.md,.csv,.json,.docx,.xlsx,.pptx" onchange="jaPick(this)"></label><span class="sp"></span>
      ${busy ? `<button class="btn sm" onclick="jaStop()">${svg('x', 12)} 停止</button>` : `<button class="btn sm pri" onclick="jaSend()">${svg('send', 12)} 送出</button>`}</div>
    ${orTray(JA_KEY)}</div>`;
}

function jaView() {
  if (!OP_LIVE) {
    return panel('問 AI', '', `<div class="note">${svg('lock', 12)} 這個環境是預覽模式，資料只在這個瀏覽器裡，日誌 AI 查不到。到正式資料的環境才能使用。</div>`);
  }
  if (JA.sessions === null) jaLoadSessions();
  const s = jaSession(JA.active), msgs = (JA.active && JA.msgs[JA.active]) || [];
  const live = JA.live && JA.live.sessionId === JA.active ? JA.live : null;
  const empty = !msgs.length && !live;
  const thread = JA.sessions === null ? '<div class="ja-empty-l">讀取中…</div>' : empty
    ? `<div class="ja-start"><div class="ja-start-h">${svg('message', 18)} 問日誌裡的任何事</div>
        <div class="ja-start-q">${jaStarters().map(q => `<button class="ja-q" data-q="${esc(q)}" onclick="jaSend(this.dataset.q)">${esc(q)}</button>`).join('')}</div></div>`
    : msgs.map(jaMsgHtml).join('') + (live ? `${live.user ? jaMsgHtml(live.user, -1) : ''}<div class="ja-msg ja-a" id="jaLive">${jaLiveInner(live)}</div>` : '');
  return `<div class="ja ${JA.drawer ? 'drawer' : ''} ${JA.sheet ? 'sheet' : ''}">
    <aside class="ja-list" aria-label="對話清單">
      <button class="btn pri ja-new" onclick="jaNew()">${svg('plus', 12)} 新對話</button>
      <input class="ja-find" aria-label="搜尋對話" placeholder="搜尋對話" value="${esc(JA.q)}" oninput="jaSetQ(this.value)">
      <div id="jaSessions" class="ja-sessions">${jaSessionGroups()}</div>
      ${jaUsageHtml()}
      <button class="sg-link ja-arch" onclick="jaToggleArchived()">${JA.showArchived ? '回到對話' : '封存的對話'}</button>
      ${JA.err ? `<div class="sg-warn">${svg('warn', 12)} ${esc(JA.err)}</div>` : ''}
    </aside>
    <section class="ja-main" ondragover="jaDragOver(event)" ondrop="jaDrop(event)">
      <div class="ja-head">
        <button class="btn sm ja-mob" aria-label="對話清單" onclick="jaToggleDrawer()">${svg('list', 12)}</button>
        <span class="ja-agent">${svg('bot', 12)} 日誌助理</span>
        <b title="${esc(s ? s.title : '新對話')}">${esc(s ? s.title : '新對話')}</b>
        ${s && s.shared ? `<span class="chip c-i">共享${s.isOwner ? '' : ' · ' + esc(person(s.ownerKey) || s.ownerKey) + ' 建立'}</span>` : ''}<span class="sp"></span>
        ${s && s.isOwner && (JA.msgs[s.id] || []).length ? `<button class="btn sm" onclick="jaShareOpen()">${svg('layers', 12)} ${s.shared ? '共享中' : '分享'}</button>` : ''}
        <button class="btn sm ja-mob" onclick="jaToggleSheet()">${svg('layers', 12)} 看過的資料</button>
      </div>
      ${jaSharePanel(s)}
      <div class="ja-thread" id="jaThread">${JA.loadingMsgs === JA.active && !msgs.length ? '<div class="ja-empty-l">讀取中…</div>' : thread}</div>
      ${jaComposer()}
    </section>
    <aside class="ja-side" aria-label="這個對話看過的資料">
      <div class="ja-side-h"><b>這個對話看過的資料</b><button class="btn sm ja-mob" aria-label="關閉" onclick="jaToggleSheet(false)">${svg('x', 12)}</button></div>
      ${jaSources(msgs)}
    </aside></div>`;
}

/* ---------- 附件：上傳（RES-037 §14）---------- */

const JA_MAX_FILES = 5;
const JA_IMAGE_EDGE = 2000;
const JA_MODEL_IMAGE = /^image\/(png|jpeg|webp|gif)$/;
const JA_LIMIT = { image: 5 * 1024 * 1024, pdf: 20 * 1024 * 1024 };

/**
 * 圖片先在瀏覽器縮：長邊超過 2000px、超過 3.5MB、或不是模型讀得了的格式（HEIC…）就重畫成 JPEG。
 * 伺服器沒有影像函式庫；而且原圖送出去只是多花 token，模型本來就會把它縮小。
 */
async function jaPrepImage(file) {
  if (!/^image\//.test(file.type) && !/\.heic$/i.test(file.name)) return file;
  if (file.type === 'image/gif') return file;
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return file; }
  const long = Math.max(bmp.width, bmp.height);
  if (JA_MODEL_IMAGE.test(file.type) && long <= JA_IMAGE_EDGE && file.size <= 3.5 * 1024 * 1024) { bmp.close && bmp.close(); return file; }
  const k = Math.min(1, JA_IMAGE_EDGE / long);
  const canvas = doc.createElement('canvas');
  canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close && bmp.close();
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.86));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

function jaPick(input) { const list = [...(input.files || [])]; input.value = ''; jaAddFiles(list); }
function jaPaste(e) {
  const list = [...((e.clipboardData && e.clipboardData.files) || [])];
  if (!list.length) return;
  e.preventDefault();
  jaAddFiles(list.map((f, i) => f.name && f.name !== 'image.png' ? f : new File([f], '截圖 ' + nowts().slice(5, 16).replace(':', '') + (i ? '-' + i : '') + '.png', { type: f.type })));
}
function jaDragOver(e) { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); }
function jaDrop(e) {
  const list = [...((e.dataTransfer && e.dataTransfer.files) || [])];
  if (!list.length) return;
  e.preventDefault(); e.stopPropagation();
  jaAddFiles(list);
}

function jaAddFiles(list) {
  if (!OP_LIVE) return toast('預覽模式不能上傳檔案');
  for (const raw of list) {
    if (JA.files.length >= JA_MAX_FILES) { toast('一則最多附 ' + JA_MAX_FILES + ' 個檔案'); break; }
    jaUpload(raw);
  }
}

async function jaUpload(raw) {
  const item = { k: nid('JF'), name: raw.name, status: 'uploading', refCode: '', assetId: '', err: '' };
  JA.files.push(item); jaPaintFiles();
  try {
    const file = await jaPrepImage(raw);
    item.name = file.name;
    const verdict = astClassify({ name: file.name, bytes: file.size, mimeType: file.type });
    if (!verdict.ok) throw new Error(verdict.error);
    if (verdict.kind === 'audio' || verdict.kind === 'video') throw new Error('影音檔 AI 還讀不了');
    const cap = JA_LIMIT[verdict.kind];
    if (cap && file.size > cap) throw new Error((verdict.kind === 'pdf' ? 'PDF 超過 20MB' : '圖片超過 5MB') + '，請拆小再傳');
    const space = jaShared() ? 'team' : 'personal';
    const signed = await presignUpload(file, { origin: 'ai', space, bornDay: TODAY });
    item.assetId = signed.assetId; item.refCode = signed.refCode;
    try {
      const typed = signed.contentType && signed.contentType !== file.type ? new File([file], file.name, { type: signed.contentType }) : file;
      await putToR2(signed.uploadUrl, typed);
      await finalizeUpload(signed.assetId);
    } catch (e) {
      await finalizeUpload(signed.assetId, 'failed').catch(() => {});
      throw e;
    }
    // 讓膠囊、@ 選單、物件彈窗都認得這個檔案（與日誌上傳同一個形狀）
    DB.assets.push({
      id: signed.refCode, assetId: signed.assetId, name: file.name, kind: signed.kind || verdict.kind, bytes: file.size,
      mime: signed.contentType || file.type || '', objectKey: signed.objectKey, status: 'ready', space, origin: 'ai',
      author: DB.me, day: TODAY, bornAt: Date.now(), text: ''
    });
    item.status = 'ready';
    // 傳到一半被移除：這份檔案不要了，標成失敗讓孤兒清理收走
    if (!JA.files.includes(item)) await finalizeUpload(signed.assetId, 'failed').catch(() => {});
  } catch (e) {
    item.status = 'failed'; item.err = e.message || '上傳失敗';
  }
  jaPaintFiles();
}
function jaDropFile(k) {
  const f = JA.files.find(x => x.k === k);
  if (f && f.status === 'uploading' && f.assetId) finalizeUpload(f.assetId, 'failed').catch(() => {});
  JA.files = JA.files.filter(x => x.k !== k);
  jaPaintFiles();
}
function jaFilesInner() {
  return JA.lines.map((l, i) => `<span class="ja-file ready ja-file-line" title="${esc(l.text)}">${svg('journal', 11)}<span>${esc(jaDayLabel(l.day))}：${esc(l.text)}</span><button type="button" aria-label="移除這一行" onclick="jaDropLine(${i})">${svg('x', 10)}</button></span>`).join('') + JA.files.map(f => `<span class="ja-file ${f.status}" title="${esc(f.err || f.name)}">${svg(f.status === 'failed' ? 'warn' : f.status === 'uploading' ? 'clock' : 'paperclip', 11)}<span>${esc(f.name)}</span>${f.status === 'uploading' ? '<i>上傳中</i>' : f.status === 'failed' ? '<i>' + esc(f.err) + '</i>' : ''}<button type="button" aria-label="移除 ${esc(f.name)}" onclick="jaDropFile('${f.k}')">${svg('x', 10)}</button></span>`).join('');
}
function jaPaintFiles() { const el = root.querySelector('#jaFiles'); if (el) el.innerHTML = jaFilesInner(); }

/* ---------- 存進文件庫 ---------- */

/** 這份檔案是不是已經有一筆文件庫紀錄指著它。 */
function jaInLibrary(rid) { return (DB.files || []).some(f => (f.versions || []).some(v => v.refCode === rid)); }
function jaSavable(rid) {
  const a = (DB.assets || []).find(x => x.id === rid);
  return !!a && a.origin === 'ai' && a.author === DB.me && a.status === 'ready' && !jaInLibrary(rid);
}
function jaSaveRow(pins) {
  const list = (pins || []).filter(p => p.ty === 'asset' && jaSavable(p.rid));
  if (!list.length) return '';
  return `<div class="ja-save">${list.map(p => JA.saving === p.rid
    ? `<span class="ja-save-q">「${esc(objRefName('asset', p.rid))}」存到：<button class="btn sm" onclick="jaSaveLib('${esc(p.rid)}','team')">團隊文件庫</button><button class="btn sm" onclick="jaSaveLib('${esc(p.rid)}','personal')">私人文件</button><button class="sg-link" onclick="jaSaveAsk('')">取消</button></span>`
    : `<button class="sg-link" onclick="jaSaveAsk('${esc(p.rid)}')">${svg('download', 11)} 「${esc(objRefName('asset', p.rid))}」存進文件庫</button>`).join('')}</div>`;
}
function jaSaveAsk(rid) { JA.saving = rid; render(); }
async function jaSaveLib(rid, space) {
  const a = (DB.assets || []).find(x => x.id === rid);
  if (!a) return;
  JA.saving = '';
  try {
    // 團隊：先把檔案本身改成團隊可見，否則同事在文件庫看得到紀錄、卻下載不了
    if (space === 'team') {
      const res = await fetch('/api/company/operating/uploads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: a.assetId, space: 'team' }) });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) || '改成團隊可見失敗');
      a.space = 'team';
    }
    commit('create', '文件', a.name, () => {
      DB.files.push({ id: nid('FILE'), name: a.name, category: 'material', tags: '', space, author: DB.me,
        versions: [{ id: nid('FV'), name: a.name, type: a.mime || '', text: '', data: '', objectKey: a.objectKey, assetId: a.assetId, refCode: a.id, bytes: a.bytes || 0, at: nowts() }] });
      return [space === 'team' ? '已存進團隊文件庫' : '已存成私人文件'];
    });
  } catch (e) { toast(esc(e.message)); render(); }
}

/* ---------- 共享對話（RES-038 §4）---------- */

function jaShared() { const s = jaSession(JA.active); return !!(s && s.shared); }

async function jaShareOpen() {
  const s = jaSession(JA.active);
  if (!s || !s.isOwner) return;
  JA.share = { sid: s.id, loading: true, items: [], err: '' };
  render();
  try {
    const data = await jaFetch(JA_API + '/' + encodeURIComponent(s.id) + '/share');
    JA.share = { sid: s.id, loading: false, items: data.privateItems || [], err: '' };
  } catch (e) { JA.share = { sid: s.id, loading: false, items: [], err: e.message }; }
  render();
}
function jaShareClose() { JA.share = null; render(); }
async function jaShareSet(on) {
  const s = jaSession(JA.active);
  if (!s) return;
  try {
    const { session } = await jaFetch(JA_API + '/' + encodeURIComponent(s.id) + '/share', { method: 'POST', body: JSON.stringify({ shared: on, confirm: true }) });
    jaPatchSession(session);
    JA.share = null;
    toast(on ? '已分享給公司：同事可以讀，也可以接著問' : '已取消分享');
  } catch (e) { toast(esc(e.message)); }
  render();
}
function jaSharePanel(s) {
  const sh = JA.share;
  if (!s || !sh || sh.sid !== s.id) return '';
  if (sh.loading) return '<div class="ja-share"><div class="ja-empty-l">檢查這個對話用過的資料…</div></div>';
  if (s.shared) {
    return `<div class="ja-share"><b>這個對話已分享給公司</b><div class="sg-meta">同事可以讀、可以接著問。取消分享後他們就看不到了。</div>
      <div class="ja-share-a"><button class="btn sm" onclick="jaShareClose()">關閉</button><button class="btn sm" onclick="jaShareSet(false)">取消分享</button></div></div>`;
  }
  const list = sh.items.length
    ? `<div class="sg-meta">這些是同事原本看不到的資料。它們的內容可能已經出現在答案裡，分享後同事會看到：</div><ul class="ja-share-l">${sh.items.slice(0, 30).map(x => `<li>${svg('lock', 10)} ${esc(x.label)}</li>`).join('')}</ul>`
    : '<div class="sg-meta">這個對話沒有用到你的私人資料。</div>';
  return `<div class="ja-share"><b>分享給公司</b>${sh.err ? `<div class="sg-warn">${esc(sh.err)}</div>` : list}
    <div class="sg-meta">分享後同事可以讀、可以接著問；之後的新提問只用公司看得到的資料。</div>
    <div class="ja-share-a"><button class="btn sm" onclick="jaShareClose()">取消</button><button class="btn sm pri" onclick="jaShareSet(true)">${sh.items.length ? '我確認，分享' : '分享'}</button></div></div>`;
}

/* ---------- 提案（RES-038 §5）：AI 草擬，人改完按「建立」---------- */

function jaProposals(m, i) {
  const list = m.proposals || [];
  if (!list.length) return '';
  const seats = Object.keys(DB.people || {});
  return list.map(p => {
    const what = p.kind === 'task' ? '任務' : '議題';
    if (p.status === 'accepted') {
      return `<div class="ja-prop done">${svg('check', 12)} 已建立${what}${p.rid && objFind('doc_object', p.rid) ? objRefChip({ ty: 'doc_object', rid: p.rid }) : '「' + esc(p.title) + '」'}${p.by && p.by !== DB.me ? `<span class="sg-meta">（${esc(person(p.by) || p.by)}）</span>` : ''}</div>`;
    }
    if (p.status === 'dismissed') return `<div class="ja-prop done">${svg('x', 12)} 略過了${what}「${esc(p.title)}」</div>`;
    const k = m.id + '|' + p.id;
    return `<div class="ja-prop" data-prop="${esc(k)}">
      <div class="ja-prop-h"><span class="chip ${p.kind === 'task' ? 'c-o' : 'c-i'}">待確認 · ${what}</span><span class="sg-meta">AI 草擬的，還沒有建立</span></div>
      <input class="ja-prop-t" data-f="title" aria-label="標題" value="${esc(p.title)}">
      <div class="ja-prop-r">
        ${p.kind === 'task' ? `<label>負責<select data-f="owner">${seats.map(x => `<option value="${esc(x)}" ${x === (p.owner || DB.me) ? 'selected' : ''}>${esc(person(x) || x)}</option>`).join('')}</select></label>` : ''}
        <label>到期<input type="date" data-f="due" value="${esc(p.due || '')}"></label>
      </div>
      <textarea data-f="detail" rows="2" aria-label="內容" placeholder="補充內容（選填）">${esc(p.detail || '')}</textarea>
      <div class="ja-prop-a"><button class="btn sm" onclick="jaPropSettle(${i},'${esc(p.id)}',false)">不要</button><button class="btn sm pri" onclick="jaPropSettle(${i},'${esc(p.id)}',true)">${svg('check', 12)} 建立${what}</button></div>
    </div>`;
  }).join('');
}

async function jaPropRecord(sid, mid, pid, status, rid) {
  const data = await jaFetch(JA_API + '/' + encodeURIComponent(sid) + '/proposals', { method: 'POST', body: JSON.stringify({ messageId: mid, proposalId: pid, status, ...(rid ? { rid } : {}) }) });
  const list = JA.msgs[sid] || [], at = list.findIndex(x => x.id === mid);
  if (at >= 0) list[at] = data.message;
}

/**
 * 建立：走既有的議題／任務流程（agCreate），在按的人今天的日誌誕生一張卡 —— 與手動 `!任務` 建出來的一樣。
 * 先記下結果再跳到日誌；記錄失敗不擋建立（物件已經在日誌裡了），只提示。
 */
async function jaPropSettle(i, pid, accept) {
  const sid = JA.active, m = (JA.msgs[sid] || [])[i];
  const p = m && (m.proposals || []).find(x => x.id === pid);
  if (!p || p.status !== 'pending') return;
  if (!accept) {
    try { await jaPropRecord(sid, m.id, pid, 'dismissed'); } catch (e) { toast(esc(e.message)); }
    return render();
  }
  const card = root.querySelector('[data-prop="' + m.id + '|' + pid + '"]');
  const val = f => { const el = card && card.querySelector('[data-f="' + f + '"]'); return el ? String(el.value || '').trim() : ''; };
  const title = val('title') || p.title, detail = val('detail'), due = val('due'), owner = p.kind === 'task' ? (val('owner') || DB.me) : '';
  if (!title) return toast('先寫標題');
  saveJournalDraft();
  S.wb = 'journal'; S.tab = 0; S.jday = TODAY;
  if (!canWriteJournal()) { render(); return toast('現在看的不是你的日誌，切回自己的日誌再建立'); }
  const arr = currentJournal().blocks;
  const last = arr[arr.length - 1];
  if (last && TEXTY(last.t) && !String(last.text || '').trim() && !(last.refs && last.refs.length)) arr.pop();
  const head = { id: newBid(), t: 'p', ind: 0, text: title };
  arr.push(head);
  detail.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 20).forEach(line => arr.push({ id: newBid(), t: 'p', ind: 1, text: line }));
  const d = agCreate(head, p.kind === 'task' ? { owner, ...(due ? { due } : {}) } : (due ? { due } : {}));
  if (!d) return render();
  try { await jaPropRecord(sid, m.id, pid, 'accepted', d.id); }
  catch (e) { toast('已建立，但沒有記回對話：' + esc(e.message)); }
}

/* ---------- AI 團隊分頁 ---------- */

const JA_TEAM = [
  { id: 'journal', nm: '日誌助理', reads: '日誌、日誌誕生的物件（議題、任務、會議紀錄…）、專案、決策、交易、檔案與連結', does: '回答與引用、讀檔案、草擬議題與任務', live: true },
  { id: 'cashflow', nm: '金流助理', reads: '帳本、合約與期款、現金推演', does: '對帳與異常提醒、預算比對', live: false },
  { id: 'project', nm: '專案助理', reads: '專案、階段與里程碑、工作、專案檔案', does: '進度整理、風險與延誤、草擬工作', live: false }
];
function jaTeamView() {
  if (OP_LIVE && !JA.usage) jaLoadUsage();
  const mode = JA.usage && JA.usage.provider && JA.usage.provider !== 'mock' ? '運作中' : '示範模式';
  const via = JA.usage && (JA.usage.providers || []).length ? '（' + JA.usage.providers.map(p => p.label).join('、') + '）' : '';
  const count = (JA.sessions || []).filter(s => s.agent === 'journal' || !s.agent).length;
  const rows = JA_TEAM.map(a => `<tr>
      <td><b>${svg('bot', 12)} ${esc(a.nm)}</b></td>
      <td>${a.live ? `<span class="chip ${mode === '運作中' ? 'c-o' : 'c-w'}">${mode}${esc(via)}</span>` : '<span class="chip c-n">規劃中</span>'}</td>
      <td class="ja-team-t">${esc(a.reads)}</td>
      <td class="ja-team-t">${esc(a.does)}</td>
      <td>${a.live ? `${count} 個對話` : '—'}</td>
      <td>${a.live ? `<button class="btn sm pri" onclick="jaNewWith('${a.id}')">${svg('plus', 12)} 新對話</button>` : ''}</td></tr>`).join('');
  return panel('AI 團隊', '每位助理只讀得到你看得到的資料，只能提案、不能自己寫入', `<div class="sg-scroll"><table class="tbl ja-team"><thead><tr><th>助理</th><th>狀態</th><th>讀得到</th><th>會做的事</th><th>對話</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`, '', true)
    + (JA.usage ? panel('本月用量', JA.usage.month, jaUsageHtml()) : '');
}
function jaNewWith(agent) { nav('ai', JA_TAB); jaNew(agent); }

/* ---------- 從日誌與物件「問 AI」（JAI-S3）---------- */

function jaDayLabel(day) { return Number(String(day).slice(5, 7)) + '/' + String(day).slice(8, 10); }
function jaDropLine(i) { JA.lines.splice(i, 1); jaPaintFiles(); }

/** 釘選的日誌行：rid = <day>:<author>:<blockId>。文字從畫面上的日誌找（自己的日誌才找得到）。 */
function jaLinePin(p) {
  const parts = String(p.rid).split(':');
  return { day: parts[0], author: parts[1], bid: parts.slice(2).join(':') };
}
function jaLineText(l) {
  const book = l.author === DB.me ? DB.journal[l.day] : null;
  const b = book && (book.blocks || []).find(x => x.id === l.bid);
  return b ? String(b.text || '').slice(0, 24) : '';
}
function jaPinChips(pins) {
  const lines = (pins || []).filter(p => p.ty === 'line'), objs = (pins || []).filter(p => p.ty !== 'line');
  const chips = lines.map(p => {
    const l = jaLinePin(p), t = jaLineText(l);
    return `<button type="button" class="ja-cite" title="回到那一行" onclick="jaJumpLine('${esc(l.day)}','${esc(l.author)}','${esc(l.bid)}')">${svg('journal', 11)}<span>${esc(jaDayLabel(l.day))} 日誌</span>${t ? `<span class="ja-cite-l">${esc(t)}</span>` : ''}</button>`;
  }).join('');
  const objChips = objs.map(o => objFind(o.ty, o.rid) ? objRefChip(o) : `<span class="ja-noacc">${svg('lock', 10)} 無法存取</span>`).join('');
  return (chips || objChips ? `<div class="obj-refs">${chips}${objChips}</div>` : '');
}

/** 帶著一些行或物件開一個新對話。 */
function jaAsk(lines, objs) {
  if (!OP_LIVE) return toast('預覽模式不能問 AI');
  saveJournalDraft();
  JA.active = null; JA.fresh = true; JA.draft = ''; JA.files = []; JA.lines = (lines || []).slice(0, 20); JA.drawer = false;
  orClear(JA_KEY);
  if (objs && objs.length) orRefs.set(JA_KEY, objs.slice(0, 10).map(o => ({ ty: o.ty, rid: o.rid })));
  JA_SEL.ids = [];
  jaPaintSelAsk();
  jaFocusSoon();
  nav('ai', JA_TAB);
}
function jaAskObj(ty, rid) { objPeekClose(); jaAsk([], [{ ty, rid }]); }

/* 日誌選取多行時浮出「問 AI」。選取本身由 block-select 管，這裡只在它重畫高亮時跟著畫一顆按鈕。
   按鈕用 pointerdown 觸發：block-select 在 mousedown 就會清掉選取，等到 click 時已經什麼都沒有了。 */
const JA_SEL = { ids: [], lines: [], objs: [] };
function jaSelEl() {
  let el = root.querySelector('#jaSelAsk');
  if (el) return el;
  el = document.createElement('button');
  el.id = 'jaSelAsk'; el.type = 'button'; el.className = 'ja-selask';
  el.innerHTML = svg('message', 12) + ' 問 AI';
  const host = root.querySelector('#summon');
  (host && host.parentNode ? host.parentNode : root).appendChild(el);
  return el;
}
function jaSelCollect() {
  const arr = (typeof msBlocks === 'function' ? msBlocks(MSEL.ref) : null) || [];
  const want = new Set(MSEL.ids), lines = [], objs = [];
  for (const b of arr) {
    if (!want.has(b.id)) continue;
    if (b.t === 'obj' && b.obj && b.obj.rid) objs.push({ ty: b.obj.ty || 'doc_object', rid: b.obj.rid });
    else if (TEXTY(b.t) && String(b.text || '').trim()) lines.push({ day: S.jday, author: DB.me, bid: b.id, text: String(b.text).trim().slice(0, 60) });
    (Array.isArray(b.refs) ? b.refs : []).forEach(r => { if (r && r.ty && r.rid) objs.push({ ty: r.ty, rid: r.rid }); });
  }
  return { lines, objs };
}
function jaPaintSelAsk() {
  const el = root.querySelector('#jaSelAsk');
  const on = OP_LIVE && S.wb === 'journal' && S.tab === 0 && MSEL.ids.length > 1 && MSEL.ref && MSEL.ref.k === 'doc';
  if (!on) { if (el) el.classList.remove('on'); JA_SEL.ids = []; return; }
  const picked = jaSelCollect();
  if (!picked.lines.length && !picked.objs.length) { if (el) el.classList.remove('on'); return; }
  JA_SEL.ids = MSEL.ids.slice(); JA_SEL.lines = picked.lines; JA_SEL.objs = picked.objs;
  const btn = jaSelEl(), last = [...root.querySelectorAll('#doc .eb.msel')].pop();
  if (!last) { btn.classList.remove('on'); return; }
  const r = last.getBoundingClientRect();
  btn.classList.add('on');
  btn.style.top = Math.min(innerHeight - 44, r.bottom + 6) + 'px';
  btn.style.left = Math.max(8, Math.min(innerWidth - btn.offsetWidth - 8, r.left)) + 'px';
}
const jaBaseMsPaint = msPaint;
msPaint = function () { jaBaseMsPaint(); jaPaintSelAsk(); };
root.addEventListener('pointerdown', e => {
  const btn = e.target.closest && e.target.closest('#jaSelAsk');
  if (!btn || !JA_SEL.ids.length) return;
  e.preventDefault(); e.stopPropagation();
  jaAsk(JA_SEL.lines, JA_SEL.objs);
}, { capture: true, signal: controller.signal });
root.addEventListener('scroll', () => { if (JA_SEL.ids.length) jaPaintSelAsk(); }, { capture: true, passive: true, signal: controller.signal });

/* 物件彈窗多一顆「問 AI」 */
const jaBaseObjPeek = objPeek;
objPeek = function (ty, rid, anchor, bid, i) {
  jaBaseObjPeek(ty, rid, anchor, bid, i);
  const f = root.querySelector('#objPeek .obj-peek-f');
  if (f && OP_LIVE && objFind(ty, rid)) f.insertAdjacentHTML('afterbegin', `<button type="button" class="btn sm" onclick="jaAskObj('${esc(ty)}','${esc(rid)}')">${svg('message', 12)} 問 AI</button>`);
};

/* ---------- 存進今天的日誌（人按的寫入）---------- */

/** 答案存成今天日誌的幾行：開頭一行標明是 AI 回答，接著每段一行引言；物件引用掛成那一行的引用膠囊。 */
function jaToJournal(i) {
  const list = JA.msgs[JA.active] || [], m = list[i];
  if (!m || !m.text) return;
  const prev = list.slice(0, i).reverse().find(x => x.role === 'user');
  const byCite = jaCiteMap(m);
  saveJournalDraft();
  S.wb = 'journal'; S.tab = 0; S.jday = TODAY;
  if (!canWriteJournal()) { render(); return toast('現在看的不是你的日誌，切回自己的日誌再存'); }
  const arr = currentJournal().blocks;
  const head = { id: newBid(), t: 'p', ind: 0, text: 'AI 回答' + (prev ? '：「' + String(prev.text).replace(/\s+/g, ' ').slice(0, 40) + '」' : '') };
  const body = String(m.text).split('\n').map(x => x.trim()).filter(Boolean).slice(0, 30).map(line => {
    const refs = [];
    const text = line.replace(/^(?:[-*•]|\d+[.、])\s+/, '').replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '')
      .replace(/⟦([^⟦⟧\n]{1,200})⟧/g, (_a, c) => {
        const ct = byCite[c];
        if (!ct) return '';
        if (ct.kind === 'object') { if (!refs.some(r => r.ty === ct.ty && r.rid === ct.rid)) refs.push({ ty: ct.ty, rid: ct.rid }); return ''; }
        return '（' + jaDayLabel(ct.day) + ' 日誌）';
      }).replace(/\s+/g, ' ').trim();
    return Object.assign({ id: newBid(), t: 'quote', ind: 0, text }, refs.length ? { refs } : {});
  }).filter(b => b.text || b.refs);
  const last = arr[arr.length - 1];
  if (last && TEXTY(last.t) && !String(last.text || '').trim() && !(last.refs && last.refs.length)) arr.pop();
  arr.push(head, ...body, { id: newBid(), t: 'p', ind: 0, text: '' });
  saveJournalDraft();
  runtime._afterRender = () => {
    const el = root.querySelector('.eb[data-id="' + head.id + '"]');
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('rq-flash');
    setTimeout(() => el.classList.remove('rq-flash'), 2900);
  };
  render();
  toast('已存進今天的日誌');
}

/* ---------- 本月用量 ---------- */

async function jaLoadUsage() {
  try { JA.usage = await jaFetch(JA_API.replace(/\/sessions$/, '/usage')); } catch { return; }
  const el = root.querySelector('#jaUsage');
  if (el) el.outerHTML = jaUsageHtml();
}
function jaUsageHtml() {
  const u = JA.usage;
  if (!u) return '<div class="ja-usage" id="jaUsage"></div>';
  const pct = u.capUsd ? Math.min(100, Math.round(u.spentUsd / u.capUsd * 100)) : 0;
  const seats = Array.isArray(u.bySeat) && u.bySeat.length > 1
    ? `<div class="ja-usage-s">${u.bySeat.map(x => `${esc(person(x.seat) || x.seat)} US$${x.usd.toFixed(2)}`).join(' · ')}</div>` : '';
  return `<div class="ja-usage ${pct >= 90 ? 'hot' : ''}" id="jaUsage" title="本月全公司日誌 AI 用量；到上限後要等下個月才能再問">
    <div class="ja-usage-h"><span>本月用量</span><b>US$${u.spentUsd.toFixed(2)} / ${u.capUsd}</b></div>
    <div class="ja-usage-bar"><i style="width:${pct}%"></i></div>
    <div class="ja-usage-s">你用了 US$${u.mineUsd.toFixed(2)}（${u.mineAnswers} 則）</div>${seats}</div>`;
}

VIEWS.ai = tab => (tab === 1 ? jaTeamView() : jaView());

/* 從背景分頁回來：還在跑的那一則改用輪詢接回來。 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !jaOnPage() || !JA.active || JA.live) return;
  const last = (JA.msgs[JA.active] || []).slice(-1)[0];
  if (last && (last.status === 'streaming' || last.status === 'stopping')) jaLoadMsgs(JA.active);
}, { signal: controller.signal });
