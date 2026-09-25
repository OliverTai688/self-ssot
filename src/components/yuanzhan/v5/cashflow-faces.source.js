/* ==================================================================
   金流三面：收單 / 帳務 / 洞察（RES-032 · Owner 決策 2026-09-25）

   六個等權分頁 → 三面 × 三分頁，角色決定預設落點：
     負責人 → 帳務 · 帳本；成員 → 收單 · 收件匣。

   一筆錢的生命週期：① 進件 → ② 待歸帳 → ③ 已入帳 → ④ 已勾稽 → ⑤ 已結帳
   ①② 存在 DB.intake；③④⑤ 由既有資料推導（銀行明細 m 指向交易、該月已結帳），
   不另存狀態欄 —— 存了就會和它的來源不一致。

   收單面只能把東西推到 ②，不能直接產生交易：成員不需要懂類別。
   月結後金額、日期、歸屬唯讀；可以加註、補憑證（伺服器同樣擋，見 applyTransaction）。
   ================================================================== */

if (!Array.isArray(DB.intake)) DB.intake = [];
if (!Array.isArray(DB.periods)) DB.periods = [];

const CF_TABS = [
  ['inbox', '收件匣'], ['mine', '我的報帳'], ['vault', '憑證庫'],
  ['ledger', '帳本'], ['recon', '對帳'], ['close', '月結'],
  ['company', '公司'], ['project', '專案'], ['people', '人事']
];
const CF_FACES = [
  { id: 'intake', nm: '收單', sub: '每天 · 全員', from: 0 },
  { id: 'books', nm: '帳務', sub: '每週 · 記帳', from: 3 },
  { id: 'insight', nm: '洞察', sub: '每月 · 決策', from: 6 }
];
/** 舊的六分頁索引 → 新索引。訊號、指令面板、其他模組的連結都還在用舊索引。 */
const CF_LEGACY = { 1: 6, 2: 4, 3: 1, 4: 8, 5: 7 };
const CF_MAX_BYTES = 5 * 1024 * 1024;
const CF_FILE_TYPES = /\.(png|jpe?g|webp|pdf)$/i;

const cfWb = WB.find(w => w.id === 'money');
if (cfWb) {
  cfWb.tabs = CF_TABS.map(t => t[1]);
  cfWb.rule = '主操作面：收單每天、帳務每週、洞察每月';
}
S.cfFaceTab = S.cfFaceTab || {};
S.cfFilter = S.cfFilter || 'all';
S.cfDraft = S.cfDraft || {};

function cfKey() { return (CF_TABS[S.tab] || CF_TABS[0])[0]; }
function cfIdx(k) { return CF_TABS.findIndex(t => t[0] === k); }
function cfFace() { return CF_FACES[Math.floor((S.tab || 0) / 3)] || CF_FACES[0]; }
function cfLanding() { return isOwner() ? cfIdx('ledger') : cfIdx('inbox'); }

const cfBaseRedirect = opRedirect;
opRedirect = (wb, tab) => {
  const r = cfBaseRedirect(wb, tab);
  if (r[0] === 'money') {
    const t = r[1] || 0;
    r[1] = t === 0 ? cfLanding() : (t in CF_LEGACY ? CF_LEGACY[t] : t);
  }
  return r;
};

/** 面內導覽不經過 opRedirect：新索引不需要、也不能被當成舊索引再轉一次。 */
function cfGo(k, extra) {
  if (extra) Object.assign(S, extra);
  saveJournalDraft();
  S.wb = 'money';
  S.tab = cfIdx(k);
  closeDrawer(true);
  renderRail();
  render();
  const surface = $('#surface');
  if (surface) surface.scrollTop = 0;
}
function cfFaceGo(id) {
  const f = CF_FACES.find(x => x.id === id);
  const last = S.cfFaceTab[id];
  cfGo(CF_TABS[last != null ? last : f.from][0]);
}

/* ---------- 期間 ---------- */
function cfMonth() { return S.cfMonth || TODAY.slice(0, 7); }
function cfMonthLabel(m) { return m.slice(0, 4) + ' 年 ' + Number(m.slice(5)) + ' 月'; }
function cfMonths() {
  const set = new Set([TODAY.slice(0, 7)]);
  DB.txns.forEach(t => t.d && set.add(t.d.slice(0, 7)));
  DB.bank.forEach(b => b.d && set.add(b.d.slice(0, 7)));
  DB.periods.forEach(p => set.add(p.id));
  return [...set].filter(m => /^\d{4}-\d{2}$/.test(m)).sort().reverse();
}
function cfPeriod(m) { return DB.periods.find(p => p.id === m); }
function cfLocked(m) { return cfPeriod(m)?.st === 'closed'; }
function cfTxLocked(t) { return !!t && !!t.d && cfLocked(t.d.slice(0, 7)); }
function cfSetMonth(m) { S.cfMonth = m; S.cfLockAsk = false; render(); }
function cfPeriodBar() {
  const m = cfMonth(), locked = cfLocked(m);
  return `<span class="cf-period"><select aria-label="期間" onchange="cfSetMonth(this.value)">${cfMonths().map(x => `<option value="${x}" ${x === m ? 'selected' : ''}>${cfMonthLabel(x)}</option>`).join('')}</select>${locked ? `<span class="chip c-n">${svg('lock', 11)} 已結帳</span>` : '<span class="chip c-o">未結帳</span>'}</span>`;
}

/* ---------- 共用判斷 ---------- */
const cfMatched = t => DB.bank.some(b => b.m === t.id);
function cfStage(t) {
  if (cfTxLocked(t)) return '<span class="chip c-n">⑤ 已結帳</span>';
  if (cfMatched(t)) return '<span class="chip c-t">④ 已勾稽</span>';
  return '<span class="chip c-p">③ 已入帳</span>';
}
const cfReimbOf = x => x.reimb ? DB.reimb.find(r => r.id === x.reimb) : null;
/** 待歸帳：已送出、而且（沒有報帳，或報帳已核准）。等核准的還不能歸帳。 */
function cfUnfiled() {
  return DB.intake.filter(x => x.st === 'unfiled' && (!x.reimb || ['已核', '已付'].includes(cfReimbOf(x)?.st)));
}
const cfApprovals = () => DB.reimb.filter(r => r.st === '已送');
const cfProjLabel = p => !p || p === '公司層級' ? '公司層級' : (P(p) ? P(p).t : p);
const cfProjOptions = () => [...(isOwner() ? DB.projects.map(p => p.id) : myProjects()), '公司層級'];
function cfBadge(face) {
  if (face === 'intake') return isOwner() ? cfApprovals().length : DB.intake.filter(x => x.who === DB.me && x.st === 'draft').length;
  if (face === 'books' && isOwner()) return cfUnfiled().length + DB.bank.filter(b => !b.m && b.d.slice(0, 7) === cfMonth()).length;
  return 0;
}
function cfEmpty(title, body, actions) {
  return `<div class="panel cf-empty"><h3>${title}</h3><p>${body}</p>${actions ? `<div class="cf-empty-act">${actions}</div>` : ''}</div>`;
}
function cfBoundary(title, body) {
  return `<div class="panel cf-empty"><h3>${svg('lock', 14)} ${title}</h3><p>${body}</p><div class="cf-empty-act"><button class="btn pri" onclick="cfGo('inbox')">回到收件匣</button></div></div>`;
}

/* ---------- 面切換器 ---------- */
function cfPaintTabs() {
  const tabs = $('#tabs');
  if (!tabs) return;
  if (S.wb !== 'money') { tabs.classList.remove('cf-tabs'); return; }
  const face = cfFace();
  S.cfFaceTab[face.id] = S.tab;
  tabs.classList.add('cf-tabs');
  tabs.innerHTML = `<div class="cf-faces" role="tablist" aria-label="金流的三個面">${CF_FACES.map(f => {
    const n = cfBadge(f.id);
    return `<button class="cf-face ${f.id === face.id ? 'on' : ''}" role="tab" aria-selected="${f.id === face.id}" onclick="cfFaceGo('${f.id}')"><b>${f.nm}</b><small>${f.sub}</small>${n ? `<i class="cf-bdg">${n}</i>` : ''}</button>`;
  }).join('')}</div><div class="cf-subtabs" role="tablist" aria-label="${face.nm}">${[0, 1, 2].map(i => {
    const idx = face.from + i;
    return `<button class="tab ${S.tab === idx ? 'on' : ''}" role="tab" aria-selected="${S.tab === idx}" onclick="setTab(${idx})">${CF_TABS[idx][1]}</button>`;
  }).join('')}</div>`;
}
const cfBaseEnhance = enhanceView;
enhanceView = function () {
  cfBaseEnhance();
  cfPaintTabs();
};

/* ---------- 檔案：R2（database 模式）或頁面記憶體（prototype 模式） ---------- */
async function cfReadFile(file) {
  if (file.size > CF_MAX_BYTES) throw Error('檔案上限 5 MB');
  if (!CF_FILE_TYPES.test(file.name)) throw Error('請上傳 JPG、PNG、WEBP 或 PDF');
  const meta = { name: file.name, type: file.type, bytes: file.size, at: TODAY + ' ' + nowts(), by: DB.me };
  if (OP_LIVE) {
    const signed = await presignUpload(file);
    await putToR2(signed.uploadUrl, file);
    return { ...meta, objectKey: signed.objectKey };
  }
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return { ...meta, data };
}
function cfPick(camera, onFile) {
  const input = doc.createElement('input');
  input.type = 'file';
  input.accept = camera ? 'image/*' : '.png,.jpg,.jpeg,.webp,.pdf';
  if (camera) input.setAttribute('capture', 'environment');
  input.style.display = 'none';
  root.append(input);
  input.onchange = () => {
    const file = input.files?.[0];
    input.remove();
    if (file) onFile(file);
  };
  input.click();
}
function cfFileTile(f, key) {
  const pid = 'cfImg-' + key;
  const isImage = /^image\//.test(f.type || '') || /\.(png|jpe?g|webp)$/i.test(f.name || '');
  if (isImage && f.objectKey) {
    setTimeout(() => paintFilePreview(pid, f.objectKey), 0);
    return `<img id="${pid}" class="cf-thumb" alt="${esc(f.name)}">`;
  }
  if (isImage && f.data) return `<img class="cf-thumb" src="${f.data}" alt="${esc(f.name)}">`;
  return `<span class="cf-thumb cf-doc">${svg('file', 18)}<em>${esc((f.name || '').split('.').pop() || '檔案')}</em></span>`;
}
async function cfOpenFile(f) {
  try {
    if (f.objectKey) {
      const res = await fetch('/api/company/operating/uploads?key=' + encodeURIComponent(f.objectKey));
      if (!res.ok) throw Error('取得檔案失敗');
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, '_blank', 'noopener');
    } else if (f.data) window.open(f.data, '_blank', 'noopener');
  } catch (e) { toast(esc(e.message)); }
}

/* ==================================================================
   面 A：收單
   ================================================================== */
async function cfIngest(file) {
  try {
    toast(OP_LIVE ? '上傳中…' : '讀取中…');
    const f = await cfReadFile(file);
    if (!active) return;
    const x = { id: nid('INT'), who: DB.me, t: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || '收據', amt: null, d: TODAY, p: '', st: 'draft', file: f, reimb: '', txn: '', at: Date.now() };
    S.cfEditing = x.id;
    S.cfDraft[x.id] = {};
    commit('create', '收件', x.t, () => {
      DB.intake.unshift(x);
      return ['收件匣 +1 · 補上金額與歸屬就能送出'];
    }, () => { DB.intake = DB.intake.filter(y => y.id !== x.id); });
    if (!(S.wb === 'money' && cfKey() === 'inbox')) cfGo('inbox');
    setTimeout(() => getById('cfAmt-' + x.id)?.focus(), 0);
  } catch (e) { toast(esc(e.message)); }
}
function cfDrop(e, el) {
  e.preventDefault();
  el.classList.remove('over');
  const file = e.dataTransfer?.files?.[0];
  if (file) cfIngest(file);
}
function cfMissing(x) {
  const miss = [];
  if (x.amt == null || x.amt === '') miss.push('金額');
  if (!x.p) miss.push('歸屬');
  return miss;
}
function cfReadDraft(id) {
  const d = S.cfDraft[id] || (S.cfDraft[id] = {});
  const amt = getById('cfAmt-' + id), t = getById('cfTitle-' + id);
  if (amt) d.amt = amt.value;
  if (t) d.t = t.value;
  return d;
}
function cfEdit(id) { S.cfEditing = id; S.cfDraft[id] = {}; S.cfErr = ''; render(); setTimeout(() => getById('cfAmt-' + id)?.focus(), 0); }
function cfCancel() { S.cfEditing = null; S.cfErr = ''; render(); }
function cfPickProj(id, p) { cfReadDraft(id).p = p; S.cfErr = ''; render(); }
function cfSubmit(id) {
  const x = DB.intake.find(y => y.id === id);
  if (!x || x.who !== DB.me) return deny();
  const d = cfReadDraft(id);
  const raw = String(d.amt != null ? d.amt : (x.amt ?? '')).replace(/[^\d]/g, '');
  const amt = raw ? Number(raw) : null;
  const p = d.p || x.p;
  const t = (d.t != null ? d.t : x.t).trim() || x.t;
  const miss = [];
  if (!amt) miss.push('金額');
  if (!p) miss.push('歸屬');
  if (miss.length) { S.cfErr = '還差' + miss.join('與') + '。'; render(); return; }
  const before = { ...x };
  const r = isOwner() ? null : { id: nid('RMB'), who: DB.me, t, amt, st: '已送', d: x.d || TODAY };
  S.cfEditing = null;
  S.cfErr = '';
  commit('update', '收件', t + ' 送出', () => {
    Object.assign(x, { amt, p, t, st: 'unfiled' });
    if (r) { DB.reimb.unshift(r); x.reimb = r.id; }
    return r ? ['已送出，等負責人核准代墊', '核准後進入帳本的待歸帳'] : ['已送出 → 帳本的<b>待歸帳</b>'];
  }, () => {
    Object.assign(x, before);
    if (r) DB.reimb = DB.reimb.filter(y => y.id !== r.id);
  });
  toast(r ? '已送出，等負責人核准' : '已送出，出現在帳本的待歸帳');
}
function cfDiscard(id) {
  const x = DB.intake.find(y => y.id === id);
  if (!x || x.st !== 'draft' || (x.who !== DB.me && !isOwner())) return deny();
  const i = DB.intake.indexOf(x);
  S.cfEditing = null;
  commit('delete', '收件', x.t, () => { DB.intake.splice(i, 1); return ['收件匣 −1']; }, () => DB.intake.splice(i, 0, x));
}
function cfAttach(id) {
  const t = TX(id);
  if (!t || !(isOwner() || t.author === DB.me)) return deny();
  cfPick(false, async file => {
    try {
      toast(OP_LIVE ? '上傳中…' : '讀取中…');
      const f = await cfReadFile(file);
      if (!active) return;
      const beforeFiles = t.files, beforeV = t.v.slice();
      commit('update', '憑證', t.t + ' ＋' + f.name, () => {
        t.files = [...(t.files || []), f];
        if (!t.v.length) t.v.push(/pdf$/i.test(f.name) ? '發票' : '收據');
        return [`交易 <b>${esc(t.t)}</b> 附上憑證檔`, '離開「缺憑證」清單'];
      }, () => { t.files = beforeFiles; t.v = beforeV; });
      if (S.stack.length) paintDrawer();
    } catch (e) { toast(esc(e.message)); }
  });
}

function cfDropzone() {
  return `<div class="cf-drop" style="margin-bottom:0" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="cfDrop(event,this)">
    <p>把收據或發票拖到這裡，分類是之後的事</p>
    <div class="cf-drop-act"><button class="btn pri" onclick="cfPick(true,cfIngest)">拍照</button><button class="btn" onclick="cfPick(false,cfIngest)">${svg('paperclip', 13)} 選檔案</button></div>
    <span class="cf-muted">JPG、PNG、WEBP、PDF · 5 MB 以內${OP_LIVE ? '' : ' · 示範模式：檔案只存在本頁記憶體'}</span></div>`;
}
function cfDraftForm(x) {
  const d = S.cfDraft[x.id] || {};
  const amt = d.amt != null ? d.amt : (x.amt ?? '');
  const p = d.p || x.p;
  const title = d.t != null ? d.t : x.t;
  return `<div class="cf-form">
    <label class="cf-field">金額（NT$）<input id="cfAmt-${x.id}" inputmode="numeric" value="${esc(amt)}" placeholder="例如 1490"></label>
    <label class="cf-field">這是什麼<input id="cfTitle-${x.id}" value="${esc(title)}" placeholder="例如 高鐵 台北→台中"></label>
    <div class="cf-field">歸屬<div class="chipset">${cfProjOptions().map(o => `<button type="button" class="${p === o ? 'on' : ''}" onclick="cfPickProj('${x.id}','${o}')">${esc(cfProjLabel(o))}</button>`).join('')}</div></div>
    ${S.cfErr ? `<div class="cf-err" role="alert">${S.cfErr}</div>` : ''}
    <div class="cf-form-act"><button class="btn pri" onclick="cfSubmit('${x.id}')">送出</button><button class="btn" onclick="cfCancel()">取消</button><button class="btn dgr" style="margin-left:auto" onclick="cfDiscard('${x.id}')">${svg('trash', 12)}</button></div></div>`;
}
function cfSentStatus(x) {
  const r = cfReimbOf(x);
  if (x.st === 'posted') return r && r.st === '已付' ? '<span class="chip c-o">已付款</span>' : '<span class="chip c-p">已入帳</span>';
  if (r && r.st === '已送') return '<span class="chip c-i">等待核准</span>';
  return '<span class="chip c-w">已核准 · 待歸帳</span>';
}
function cfInboxView() {
  const own = DB.intake.filter(x => x.who === DB.me);
  const drafts = own.filter(x => x.st === 'draft');
  const sent = own.filter(x => x.st !== 'draft' && x.st !== 'discarded').slice(0, 12);
  const missing = DB.txns.filter(t => !t.v.length && (t.author === DB.me));
  // 沒有東西的區塊不畫：空的「待補」「需要你核准」只是噪音。
  let h = '';
  const ap = isOwner() ? cfApprovals() : [];
  if (ap.length) {
    h += panel('需要你核准', ap.length + ' 筆代墊', `<div class="rows">${ap.map(r => {
      const x = DB.intake.find(y => y.reimb === r.id);
      return `<div class="row cf-li"><span class="m">${(r.d || '').slice(5)}</span><span class="t">${esc(r.t)}<small>${person(r.who)} 代墊${x && x.p ? ' · ' + esc(cfProjLabel(x.p)) : ''}</small></span><span class="n">${nt(r.amt)}</span><button class="btn sm pri" onclick="event.stopPropagation();advReimb('${r.id}')">核准</button></div>`;
    }).join('')}</div>`, '', true);
  }
  if (drafts.length) h += panel('待補', drafts.length + ' 筆', `<div class="rows">${drafts.map(x => {
    const miss = cfMissing(x);
    return `<div class="cf-item">${x.file ? cfFileTile(x.file, x.id) : `<span class="cf-thumb cf-doc">${svg('file', 18)}</span>`}
      <div class="cf-item-b"><div class="cf-item-t"><b>${esc(x.t)}</b>${x.amt != null ? `<span class="n">${nt(x.amt)}</span>` : ''}</div>
      <div class="cf-muted">${miss.length ? `<span class="cf-need">缺${miss.join('、')}</span> · ` : ''}${(x.d || '').slice(5)}</div>
      ${S.cfEditing === x.id ? cfDraftForm(x) : ''}</div>
      ${S.cfEditing === x.id ? '' : `<button class="btn sm pri" onclick="cfEdit('${x.id}')">補齊</button>`}</div>`;
  }).join('')}</div>`, '', true);
  if (missing.length) h += panel('需要你補憑證', missing.length + ' 筆交易', `<div class="rows">${missing.map(t => `<div class="row cf-li"><span class="m">${t.d.slice(5)}</span><span class="t">${esc(t.t)}<small>缺原始憑證，沒有入帳依據</small></span><span class="n">${nt(t.amt)}</span><button class="btn sm" onclick="event.stopPropagation();cfAttach('${t.id}')">上傳</button></div>`).join('')}</div>`, '', true);
  if (sent.length) h += panel('最近送出', '', `<div class="rows">${sent.map(x => `<div class="row cf-li"><span class="m">${(x.d || '').slice(5)}</span><span class="t">${esc(x.t)}<small>${esc(cfProjLabel(x.p))}</small></span><span class="n">${x.amt != null ? nt(x.amt) : '—'}</span>${cfSentStatus(x)}</div>`).join('')}</div>`, '', true);
  if (!h) h = `<div class="cf-muted" style="text-align:center;padding:8px 0">收件匣是空的。有收據就交進來，缺什麼系統會提醒你補。</div>`;
  return `<div class="cf-stack">${cfDropzone()}${h}</div>`;
}

/** 核准代墊不再自動以「公司層級／場地」寫進帳本：它進待歸帳，由記帳者補類別。 */
const cfBaseAdvReimb = advReimb;
advReimb = id => {
  const r = DB.reimb.find(x => x.id === id);
  if (!r) return;
  if (RSTEPS[RSTEPS.indexOf(r.st) + 1] !== '已核') return cfBaseAdvReimb(id);
  if (!isOwner()) return deny();
  const linked = DB.intake.find(x => x.reimb === id);
  const x = linked ? null : { id: nid('INT'), who: r.who, t: r.t, amt: r.amt, d: r.d || TODAY, p: '', st: 'unfiled', file: null, reimb: r.id, txn: '', at: Date.now() };
  commit('update', '報帳狀態', r.t + ' → 已核', () => {
    r.st = '已核';
    if (x) DB.intake.unshift(x);
    return ['核准 → 進入帳本的<b>待歸帳</b>，補上類別後入帳'];
  }, () => {
    r.st = '已送';
    if (x) DB.intake = DB.intake.filter(y => y.id !== x.id);
  });
};

function cfMineView() {
  const list = DB.reimb.filter(r => isOwner() || r.who === DB.me);
  const steps = RSTEPS;
  if (!list.length) return cfEmpty('還沒有報帳', '自己代墊的費用，從收件匣交出來就會出現在這裡，看得到走到哪一步。', `<button class="btn pri" onclick="cfGo('inbox')">前往收件匣</button>`);
  return panel(isOwner() ? '報帳' : '我的報帳', '待送 → 已送 → 已核 → 已付', `<div class="rows">${list.map(r => {
    const i = steps.indexOf(r.st);
    const canAdvance = r.st === '待送' ? r.who === DB.me : (isOwner() && r.st !== '已付');
    return `<div class="row cf-li" onclick="${r.who === DB.me ? `formReimb('${r.id}')` : ''}"><span class="m">${(r.d || '').slice(5)}</span><span class="t">${esc(r.t)}${isOwner() ? `<small>${person(r.who)}</small>` : ''}</span><span class="cf-steps">${steps.map((s, j) => `<i class="${j < i ? 'past' : j === i ? 'on' : ''}">${s}</i>`).join('')}</span><span class="n">${nt(r.amt)}</span>${canAdvance ? `<button class="btn sm" onclick="event.stopPropagation();advReimb('${r.id}')">${r.st === '待送' ? '送出' : r.st === '已核' ? '標記已付' : '推進'}</button>` : '<span></span>'}</div>`;
  }).join('')}</div>`, '', true) + `<div class="note" style="margin-top:10px">給外包、接案者的外部報帳連結尚未開放；目前由成員從收件匣交單。</div>`;
}

function cfVaultView() {
  const m = cfMonth();
  const txns = DB.txns.filter(t => t.d.slice(0, 7) === m);
  const missing = txns.filter(t => !t.v.length);
  const tiles = [];
  txns.forEach(t => (t.files || []).forEach((f, i) => tiles.push({ f, key: t.id + '-' + i, label: t.t, sub: t.d.slice(5) + ' · ' + nt(t.amt), open: `openDrawer('txn','${t.id}')` })));
  DB.intake.filter(x => x.file && x.st !== 'posted' && x.st !== 'discarded' && (isOwner() || x.who === DB.me)).forEach(x => tiles.push({ f: x.file, key: x.id, label: x.t, sub: x.st === 'draft' ? '待補' : '待歸帳', open: `cfGo('inbox')` }));
  const labelOnly = txns.filter(t => t.v.length && !(t.files || []).length).length;
  let h = `<div class="cf-bar">${cfPeriodBar()}</div>`;
  if (missing.length) h += `<div class="hint w" style="margin-bottom:12px">${svg('bolt', 13)}<div><b>${missing.length} 筆交易缺原始憑證</b>：${missing.map(t => `<span class="lnk" onclick="cfAttach('${t.id}')">${esc(t.t)}</span>`).join('、')}。點名稱直接上傳。</div></div>`;
  if (!tiles.length && !labelOnly) return h + cfEmpty('這個月還沒有憑證', '收件匣交出的收據、帳本補上的發票都會收在這裡。', `<button class="btn pri" onclick="cfGo('inbox')">前往收件匣</button>`);
  h += panel('憑證檔案', tiles.length + ' 份', tiles.length ? `<div class="cf-vault">${tiles.map(v => `<button class="cf-vch" onclick="${v.open}">${cfFileTile(v.f, v.key)}<b>${esc(v.label)}</b><span>${esc(v.sub)}</span></button>`).join('')}</div>` : '<div class="empty">這個月還沒有上傳的檔案</div>');
  if (labelOnly) h += `<div class="note" style="margin-top:10px">另有 ${labelOnly} 筆交易只標了憑證種類、沒有檔案 —— 從交易抽屜可以補上檔案。</div>`;
  return h;
}

/* ==================================================================
   面 B：帳務
   ================================================================== */
const CF_FILTERS = {
  all: ['全部', () => true],
  unrec: ['未勾稽', t => !cfMatched(t)],
  novch: ['缺憑證', t => !t.v.length],
  income: ['收入', t => t.amt > 0],
  expense: ['支出', t => t.amt < 0]
};
function cfSetFilter(k) { S.cfFilter = k; render(); }
function cfFileStart(id) { S.cfFiling = id; render(); }
function cfFilePick(id, p) { (S.cfDraft[id] || (S.cfDraft[id] = {})).p = p; render(); }
function cfFile(id, cat) {
  if (!isOwner()) return deny();
  const x = DB.intake.find(y => y.id === id);
  if (!x) return;
  const p = x.p || S.cfDraft[id]?.p;
  if (!p) return toast('先選歸屬');
  const d = x.d || TODAY;
  if (cfLocked(d.slice(0, 7))) return toast(cfMonthLabel(d.slice(0, 7)) + ' 已結帳，請先解鎖或改日期');
  const t = { id: nid('TXN'), d, t: x.t, p, cat, amt: -Math.abs(Number(x.amt) || 0), pass: false, v: x.file ? ['收據'] : [], files: x.file ? [x.file] : [], note: '由收件 ' + x.id + (x.reimb ? ' · 報帳 ' + x.reimb : '') };
  const r = cfReimbOf(x);
  S.cfFiling = null;
  commit('create', '交易（歸帳）', x.t, () => {
    DB.txns.unshift(t);
    Object.assign(x, { st: 'posted', txn: t.id, p });
    if (r) r.txn = t.id;
    return [`${esc(x.t)} → <b>${cat}</b> 入帳 ${nt(t.amt)}`, ...(p.startsWith('PRJ') ? effProject(p) : ['公司層級支出，不進入任何專案毛利'])];
  }, () => {
    DB.txns = DB.txns.filter(y => y.id !== t.id);
    Object.assign(x, { st: 'unfiled', txn: '' });
    if (r) r.txn = null;
  });
}
function cfUnfiledStrip() {
  const list = cfUnfiled();
  if (!list.length) return '';
  const cats = CATS.filter(c => c !== '收入');
  return `<div class="cf-strip"><div class="cf-strip-h"><b>待歸帳 ${list.length}</b><span>補上類別就會進帳本</span></div>${list.map(x => {
    const p = x.p || S.cfDraft[x.id]?.p;
    const filing = S.cfFiling === x.id;
    return `<div class="cf-strip-i"><span class="m">${(x.d || '').slice(5)}</span><span class="t">${esc(x.t)}<small>${person(x.who)} · ${p ? esc(cfProjLabel(p)) : '<span class="cf-need">未選歸屬</span>'}${x.file ? ` · <span class="lnk" onclick="cfOpenIntakeFile('${x.id}')">看憑證</span>` : ''}</small></span><span class="n">${nt(-Math.abs(Number(x.amt) || 0))}</span>
      ${filing ? `<span class="cf-strip-pick">${!x.p ? `<span class="chipset">${cfProjOptions().map(o => `<button type="button" class="${p === o ? 'on' : ''}" onclick="cfFilePick('${x.id}','${o}')">${esc(cfProjLabel(o))}</button>`).join('')}</span>` : ''}<span class="chipset">${cats.map(c => `<button type="button" onclick="cfFile('${x.id}','${c}')">${c}</button>`).join('')}</span><button class="btn sm" onclick="cfFileStart(null)">取消</button></span>` : `<button class="btn sm pri" onclick="cfFileStart('${x.id}')">歸帳</button>`}</div>`;
  }).join('')}</div>`;
}
function cfOpenIntakeFile(id) { const x = DB.intake.find(y => y.id === id); if (x?.file) cfOpenFile(x.file); }

function cfLedgerView() {
  if (!isOwner()) return cfBoundary('帳務由負責人處理', '帳本、對帳與月結是記帳的工作。你交出的單據核准後會出現在這裡等待歸帳，你不需要選類別。');
  const m = cfMonth(), locked = cfLocked(m);
  const rows = DB.txns.filter(t => t.d.slice(0, 7) === m);
  const f = CF_FILTERS[S.cfFilter] ? S.cfFilter : 'all';
  const shown = rows.filter(CF_FILTERS[f][1]).sort((a, b) => a.d < b.d ? 1 : -1);
  const sum = rows.filter(t => !t.pass).reduce((a, b) => a + b.amt, 0);
  const bar = `<div class="cf-bar">${cfPeriodBar()}<div class="seg">${Object.entries(CF_FILTERS).map(([k, [nm]]) => `<button class="${f === k ? 'on' : ''}" onclick="cfSetFilter('${k}')">${nm}</button>`).join('')}</div><span class="sp"></span><button class="btn pri" onclick="formTxn()">${svg('plus')} 新增交易</button></div>`;
  let h = bar + cfUnfiledStrip();
  if (!rows.length) return h + cfEmpty('帳本的每一列就是一張傳票', `${cfMonthLabel(m)} 還沒有交易。從上方待歸帳挑一筆，或直接新增。`, `<button class="btn pri" onclick="formTxn()">${svg('plus')} 新增交易</button>`);
  h += panel('交易內帳', locked ? '已結帳 · 可加註與補憑證，金額、日期、歸屬唯讀' : '點一列開抽屜 · 雙擊摘要、類別或金額可直接改', `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>日期</th><th>摘要</th><th>專案</th><th>類別</th><th class="num">金額</th><th>代收付</th><th>憑證</th><th>狀態</th><th></th></tr></thead>
    <tbody>${shown.map(t => `<tr data-tx="${t.id}" class="${S.selTxn === t.id ? 'sel' : ''}" onclick="selectTxn('${t.id}')">
      <td>${t.d.slice(5)}</td><td class="k">${esc(t.t)}</td>
      <td>${t.p.startsWith('PRJ') ? `<span class="chip c-p">${t.p.slice(-3)}</span>` : '<span class="chip c-n">公司</span>'}</td>
      <td>${esc(t.cat)}</td>
      <td class="num" style="${t.pass ? 'color:var(--text-3)' : t.amt > 0 ? 'color:var(--ok)' : ''}">${nt(t.amt)}</td>
      <td>${t.pass ? '<span class="chip c-w">是</span>' : '—'}</td>
      <td>${(t.files || []).length ? `<span class="chip c-o">${svg('paperclip', 10)} ${(t.files || []).length}</span>` : t.v.length ? `<span class="chip c-n">${t.v.length}</span>` : '<span class="chip c-d">缺</span>'}</td>
      <td>${cfStage(t)}</td>
      <td><span class="rowacts">${mini('paperclip', `cfAttach('${t.id}')`, '', '上傳憑證')}${mini('pen', `formTxn('${t.id}')`)}${locked ? '' : mini('trash', `delTxn('${t.id}')`, 'dgr')}</span></td></tr>`).join('') || `<tr><td colspan="9"><div class="empty">沒有符合「${CF_FILTERS[f][0]}」的交易</div></td></tr>`}</tbody>
    <tfoot><tr><td colspan="4">${cfMonthLabel(m)} 淨額（不含代收代付）</td><td class="num" style="color:${sum < 0 ? 'var(--danger)' : 'var(--ok)'}">${nt(sum)}</td><td colspan="4"></td></tr></tfoot>
  </table></div>`, '', true);
  return h;
}

/* 已結帳月份：編輯改為加註；刪除、改金額由 editable() 擋。 */
const cfBaseEditable = editable;
editable = x => (x && DB.txns.includes(x) && cfTxLocked(x)) ? false : cfBaseEditable(x);
const cfBaseFormTxn = formTxn;
formTxn = id => {
  const t = id ? TX(id) : null;
  if (t && cfTxLocked(t)) return cfNoteForm(id);
  return cfBaseFormTxn(id);
};
function cfNoteForm(id) {
  const t = TX(id);
  if (!(isOwner() || t.author === DB.me)) return deny();
  const before = t.note;
  openForm({
    crumb: '加註', title: '在已結帳的交易上加註',
    sub: `${t.d} · ${esc(t.t)} · ${cfMonthLabel(t.d.slice(0, 7))} 已結帳，金額、日期與歸屬唯讀`,
    fields: [{ k: 'note', label: '備註', type: 'textarea', ph: '例如：會計師詢問後補充的用途說明' }],
    values: { note: t.note || '' },
    effects: ['只更新備註；金額、日期、歸屬維持鎖定'],
    onSave: v => commit('update', '交易加註', t.t, () => { t.note = v.note; return ['備註已更新']; }, () => { t.note = before; })
  });
}
const cfBaseDelVoucher = delVoucher;
delVoucher = (id, idx) => cfTxLocked(TX(id)) ? toast('已結帳的交易不能移除憑證') : cfBaseDelVoucher(id, idx);
const cfBaseAdoptBank = adoptBank;
adoptBank = bid => {
  const b = DB.bank.find(x => x.id === bid);
  if (b && cfLocked(b.d.slice(0, 7))) return toast(cfMonthLabel(b.d.slice(0, 7)) + ' 已結帳');
  return cfBaseAdoptBank(bid);
};

/* 交易抽屜：憑證檔案放在最上面，已結帳時說清楚能做什麼。 */
const cfBaseTxnDrawer = DRAWERS.txn;
DRAWERS.txn = id => {
  const d = cfBaseTxnDrawer(id);
  const t = TX(id);
  if (!t || !canSeeTxn(t)) return d;
  const files = t.files || [];
  const strip = `<div class="cf-files">${files.map((f, i) => `<button class="cf-vch" onclick="cfOpenTxnFile('${t.id}',${i})">${cfFileTile(f, t.id + '-d' + i)}<b>${esc(f.name)}</b><span>${esc(f.at || '')}</span></button>`).join('')}<button class="cf-vch cf-add" onclick="cfAttach('${t.id}')">${svg('paperclip', 16)}<b>上傳憑證檔</b><span>JPG、PNG、PDF</span></button></div>`;
  const lock = cfTxLocked(t) ? `<div class="hint" style="margin-bottom:12px">${svg('lock', 13)}<div><b>${cfMonthLabel(t.d.slice(0, 7))} 已結帳。</b>可以加註與補憑證；金額、日期與歸屬要先由負責人解鎖才能改。</div></div>` : '';
  return { ...d, body: lock + strip + d.body, foot: cfTxLocked(t) ? d.foot.replace('編輯', '加註') : d.foot };
};
function cfOpenTxnFile(id, i) { const f = TX(id)?.files?.[i]; if (f) cfOpenFile(f); }

/* ---------- 對帳 ---------- */
function cfSuggest(m) {
  const used = new Set(DB.bank.filter(b => b.m).map(b => b.m));
  const out = [];
  DB.bank.filter(b => !b.m && b.d.slice(0, 7) === m).forEach(b => {
    const bd = new Date(b.d).getTime();
    const cands = DB.txns.filter(t => !used.has(t.id) && t.amt === b.amt && Math.abs(new Date(t.d).getTime() - bd) <= 3 * 864e5)
      .sort((x, y) => Math.abs(new Date(x.d).getTime() - bd) - Math.abs(new Date(y.d).getTime() - bd));
    if (cands[0]) {
      used.add(cands[0].id);
      const days = Math.round(Math.abs(new Date(cands[0].d).getTime() - bd) / 864e5);
      out.push({ b, t: cands[0], why: '金額相同 · ' + (days ? '差 ' + days + ' 日' : '同日') });
    }
  });
  return out;
}
function cfAccept(bid, tid) {
  const b = DB.bank.find(x => x.id === bid);
  if (!isOwner() || !b || cfLocked(b.d.slice(0, 7))) return deny();
  commit('update', '對帳', b.t + ' ↔ ' + TX(tid).t, () => { b.m = tid; return ['銀行與內帳勾稽', '差異清單 −1']; }, () => { b.m = ''; });
}
function cfAcceptAll() {
  const m = cfMonth(), list = cfSuggest(m);
  if (!isOwner() || !list.length || cfLocked(m)) return;
  commit('update', '對帳', '確認 ' + list.length + ' 筆建議配對', () => { list.forEach(s => { s.b.m = s.t.id; }); return ['銀行與內帳勾稽 ' + list.length + ' 筆']; }, () => list.forEach(s => { s.b.m = ''; }));
}
function cfUnmatch(bid) {
  const b = DB.bank.find(x => x.id === bid);
  if (!isOwner() || !b || cfLocked(b.d.slice(0, 7))) return deny();
  const was = b.m;
  commit('update', '對帳', '解除 ' + b.t, () => { b.m = ''; return ['回到差異清單']; }, () => { b.m = was; });
}
function cfMatchForm(bid) {
  const b = DB.bank.find(x => x.id === bid);
  const used = new Set(DB.bank.filter(x => x.m).map(x => x.m));
  const cands = DB.txns.filter(t => !used.has(t.id) && Math.sign(t.amt) === Math.sign(b.amt)).sort((x, y) => Math.abs(x.amt - b.amt) - Math.abs(y.amt - b.amt)).slice(0, 30);
  if (!cands.length) return toast('帳本裡沒有可配對的交易，可以用「補入帳」');
  openForm({
    crumb: '對帳', title: '找內帳配對', sub: `${b.d} · ${esc(b.t)} · ${nt(b.amt)}`,
    fields: [{ k: 't', label: '內帳交易', type: 'select', opts: cands.map(t => [t.id, `${t.d.slice(5)} ${t.t} ${nt(t.amt)}`]), req: true }],
    values: { t: cands[0].id },
    effects: ['銀行與內帳勾稽', '金額不同時，差額仍會留在調節表'],
    onSave: v => cfAccept(bid, v.t)
  });
}

function cfCsvCells(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === '\t') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}
function cfCsvDate(s) {
  const m = String(s || '').match(/(\d{3,4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]) < 1000 ? Number(m[1]) + 1911 : Number(m[1]); // 民國年
  return `${y}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}
function cfCsvNum(s) {
  const t = String(s || '').replace(/[,\sNT$元]/g, '');
  if (!t) return 0;
  const neg = /^\(.*\)$/.test(t) || t.startsWith('-');
  const n = Number(t.replace(/[()\-+]/g, ''));
  return Number.isFinite(n) ? (neg ? -n : n) : NaN;
}
/** 支援兩種常見匯出：單一「金額」欄（支出為負），或「支出／存入」兩欄。 */
function cfParseBank(text) {
  const rows = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).map(cfCsvCells);
  let header = null;
  if (rows.length && !rows[0].some(cfCsvDate)) header = rows.shift();
  const col = re => header ? header.findIndex(h => re.test(h)) : -1;
  const iOut = col(/支出|提款|支領|debit|withdraw/i), iIn = col(/存入|存款|收入|credit|deposit/i), iAmt = col(/金額|amount/i), iDesc = col(/摘要|說明|備註|附言|description|memo/i);
  if (!header || (iOut < 0 && iIn < 0 && iAmt < 0)) throw Error('找不到金額欄。第一列需要欄名，例如：日期,摘要,金額（或 支出、存入）');
  const out = [];
  for (const r of rows) {
    const d = r.map(cfCsvDate).find(Boolean);
    if (!d) continue;
    const amt = iAmt >= 0 ? cfCsvNum(r[iAmt]) : cfCsvNum(r[iIn]) - cfCsvNum(r[iOut]);
    if (!Number.isFinite(amt) || !amt) continue;
    const t = (iDesc >= 0 ? r[iDesc] : r.find(c => c && !cfCsvDate(c) && !Number.isFinite(cfCsvNum(c)))) || '銀行明細';
    out.push({ d, t: t.slice(0, 60), amt: Math.round(amt) });
  }
  return out;
}
let cfPendingBank = [];
function cfImportBank() {
  if (!isOwner()) return deny();
  const input = doc.createElement('input');
  input.type = 'file';
  input.accept = '.csv,.txt';
  input.style.display = 'none';
  root.append(input);
  input.onchange = async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw Error('檔案上限 2 MB');
      const parsed = cfParseBank(await file.text());
      const seen = new Set(DB.bank.map(b => b.d + '|' + b.amt + '|' + b.t));
      const fresh = parsed.filter(r => !seen.has(r.d + '|' + r.amt + '|' + r.t));
      const locked = fresh.filter(r => cfLocked(r.d.slice(0, 7)));
      cfPendingBank = fresh.filter(r => !cfLocked(r.d.slice(0, 7)));
      if (!parsed.length) throw Error('沒有讀到任何含日期與金額的列');
      openModal('匯入銀行明細', `讀到 ${parsed.length} 列 · 新的 ${cfPendingBank.length} 列${parsed.length - fresh.length ? ` · 已存在 ${parsed.length - fresh.length} 列略過` : ''}${locked.length ? ` · 已結帳月份 ${locked.length} 列略過` : ''}`,
        `<div class="rows">${cfPendingBank.slice(0, 8).map(r => `<div class="row"><span class="m">${r.d}</span><span class="t">${esc(r.t)}</span><span class="n">${nt(r.amt)}</span></div>`).join('')}${cfPendingBank.length > 8 ? `<div class="empty">⋯ 另 ${cfPendingBank.length - 8} 列</div>` : ''}</div>`,
        `<button class="btn" onclick="closeModal()">取消</button>${cfPendingBank.length ? `<button class="btn pri" onclick="cfCommitBank()">匯入 ${cfPendingBank.length} 列</button>` : ''}`);
    } catch (e) { toast(esc(e.message)); }
  };
  input.click();
}
function cfCommitBank() {
  const rows = cfPendingBank.map(r => ({ id: nid('BK'), d: r.d, t: r.t, amt: r.amt, m: '' }));
  cfPendingBank = [];
  closeModal();
  if (!rows.length) return;
  const months = [...new Set(rows.map(r => r.d.slice(0, 7)))].sort();
  if (!months.includes(cfMonth())) S.cfMonth = months[months.length - 1];
  commit('create', '銀行明細', '匯入 ' + rows.length + ' 列', () => {
    DB.bank.push(...rows);
    return ['匯入 ' + rows.length + ' 列', '系統會找金額相同、日期差 3 日內的內帳當作建議配對'];
  }, () => { DB.bank = DB.bank.filter(b => !rows.includes(b)); });
}

function cfReconView() {
  if (!isOwner()) return cfBoundary('對帳由負責人處理', '對帳涉及公司整體現金部位，依契約 §18 僅負責人可檢視。');
  const m = cfMonth(), locked = cfLocked(m);
  const ledger = DB.txns.filter(t => t.d.slice(0, 7) === m);
  const bank = DB.bank.filter(b => b.d.slice(0, 7) === m);
  const tools = locked ? '' : `<button class="btn" onclick="formBank()">${svg('plus')} 手動新增</button><button class="btn pri" onclick="cfImportBank()">匯入銀行明細</button>`;
  const bar = `<div class="cf-bar">${cfPeriodBar()}<span class="sp"></span>${tools}</div>`;
  if (!bank.length) return bar + cfEmpty('三本帳永遠不會自己相等', `先匯入 ${cfMonthLabel(m)} 的銀行明細（CSV），系統會幫你找出對得上的內帳。`, locked ? '' : `<button class="btn pri" onclick="cfImportBank()">匯入銀行明細</button><button class="btn" onclick="formBank()">手動新增一筆</button>`);
  const matchedTx = new Set(bank.filter(b => b.m).map(b => b.m));
  const sug = locked ? [] : cfSuggest(m);
  const sugBank = new Set(sug.map(s => s.b.id));
  const unmatchedL = ledger.filter(t => !matchedTx.has(t.id));
  const unmatchedB = bank.filter(b => !b.m && !sugBank.has(b.id));
  const done = bank.filter(b => b.m).length;
  let h = bar + `<div class="cf-progress"><b>${done} / ${bank.length}</b> 筆銀行明細已勾稽${done === bank.length ? ' · <span class="lnk" onclick="cfGo(\'close\')">可以去月結了</span>' : ''}</div>`;
  if (sug.length) h += panel('建議配對', '金額相同、日期差 3 日內', `<div class="rows">${sug.map(s => `<div class="row cf-li"><span class="m">${s.b.d.slice(5)}</span><span class="t">${esc(s.b.t)}<small class="cf-why">↔ ${esc(s.t.t)}（${s.t.d.slice(5)}） · ${s.why}</small></span><span class="n">${nt(s.b.amt)}</span><button class="btn sm" onclick="event.stopPropagation();cfAccept('${s.b.id}','${s.t.id}')">確認</button></div>`).join('')}</div>`, sug.length > 1 ? `<button class="btn sm pri" onclick="cfAcceptAll()">${svg('check', 12)} 確認全部 ${sug.length} 筆</button>` : '', true) + '<div style="height:12px"></div>';
  h += `<div class="g g2">${panel('差異清單', unmatchedB.length + unmatchedL.length + ' 筆待處理', [
    ...unmatchedB.map(b => `<div class="rel"><span class="ty ty-block">銀行有 · 內帳無</span><span class="tt">${esc(b.t)}　${nt(b.amt)}</span>${locked ? '' : `<span class="cf-rel-act"><button class="btn sm" onclick="cfMatchForm('${b.id}')">找配對</button><button class="btn sm pri" onclick="adoptBank('${b.id}')">補入帳</button></span>`}</div>`),
    ...unmatchedL.map(t => `<div class="rel"><span class="ty ty-wait">內帳有 · 銀行無</span><span class="tt" onclick="selectTxn('${t.id}')">${esc(t.t)}　${nt(t.amt)}</span><span class="m cf-muted">${t.amt > 0 ? '在途存款' : '未兌現'}</span></div>`)
  ].join('') || '<div class="empty">三本帳已對平</div>')}
    ${cfAdjustTable(ledger, bank, unmatchedL)}</div>`;
  h += '<div style="height:12px"></div>' + panel('已勾稽', done + ' 筆', `<div class="rows">${bank.filter(b => b.m).map(b => `<div class="row cf-li"><span class="m">${b.d.slice(5)}</span><span class="t">${esc(b.t)}<small class="cf-why">↔ ${esc(TX(b.m)?.t || b.m)}</small></span><span class="n">${nt(b.amt)}</span>${locked ? '<span></span>' : `<button class="btn sm" onclick="event.stopPropagation();cfUnmatch('${b.id}')">解除</button>`}</div>`).join('') || '<div class="empty">尚無</div>'}</div>`, '', true);
  return h;
}
function cfAdjustTable(ledger, bank, unmatchedL) {
  const bsum = bank.reduce((a, b) => a + b.amt, 0);
  const adj = [
    ['銀行帳面餘額（本月明細合計）', '', bsum, 'base'],
    ['在途存款（公司已記、銀行未入）', unmatchedL.filter(t => t.amt > 0).map(t => t.t).join('、'), unmatchedL.filter(t => t.amt > 0).reduce((a, b) => a + b.amt, 0), 'add'],
    ['未兌現支票（公司已記、銀行未扣）', unmatchedL.filter(t => t.amt < 0).map(t => t.t).join('、'), unmatchedL.filter(t => t.amt < 0).reduce((a, b) => a + b.amt, 0), 'sub'],
    ['銀行代收代付（手續費、利息）', '已含於銀行餘額，僅供辨識', bank.filter(b => !b.m).reduce((a, b) => a + b.amt, 0), 'note']
  ];
  const correct = bsum + unmatchedL.reduce((a, b) => a + b.amt, 0);
  return panel('銀行往來調節表', '調整項以正負號表示', `<div class="adjtbl">${adj.map(([lb, ds, v, k]) => `<div class="r"><span class="lb">${lb}${ds ? `<span class="cf-muted" style="display:block">${esc(ds)}</span>` : ''}</span><span class="vv" style="${k === 'note' ? 'color:var(--text-3)' : ''}">${nt(v)}</span></div>`).join('')}<div class="r tot"><span class="lb">＝ 調節後正確餘額</span><span class="vv" style="color:var(--ok)">${nt(correct)}</span></div></div>`);
}

/* ---------- 月結 ---------- */
function cfChecks(m) {
  const txns = DB.txns.filter(t => t.d.slice(0, 7) === m);
  const bank = DB.bank.filter(b => b.d.slice(0, 7) === m);
  const intake = DB.intake.filter(x => (x.d || '').slice(0, 7) === m && (x.st === 'draft' || x.st === 'unfiled'));
  const pending = DB.reimb.filter(r => (r.d || '').slice(0, 7) === m && r.st === '已送');
  return [
    { l: '所有交易已歸屬（專案或公司層級）', n: txns.filter(t => t.p).length, of: txns.length, go: 'ledger' },
    { l: '所有交易附原始憑證', n: txns.filter(t => t.v.length).length, of: txns.length, go: 'vault' },
    { l: '銀行明細已匯入且全數勾稽', n: bank.filter(b => b.m).length, of: bank.length, go: 'recon', empty: '尚未匯入銀行明細' },
    { l: '收件與代墊都已處理', n: 0, of: intake.length + pending.length, go: 'ledger', inverse: true }
  ].map(c => ({ ...c, ok: c.inverse ? c.of === 0 : (c.of > 0 && c.n >= c.of) }));
}
function cfLockAsk(on) { S.cfLockAsk = on; render(); }
function cfLock() {
  const m = cfMonth();
  if (!isOwner()) return deny();
  const checks = cfChecks(m);
  if (checks.some(c => !c.ok)) return toast('還有未完成的項目');
  const prev = cfPeriod(m);
  const before = prev ? JSON.parse(JSON.stringify(prev)) : null;
  const log = [...(prev?.log || []), { at: Date.now(), by: DB.me, action: 'close' }];
  const rec = { id: m, st: 'closed', by: DB.me, at: Date.now(), checklist: checks.map(c => ({ l: c.l, n: c.n, of: c.of })), log };
  S.cfLockAsk = false;
  commit('update', '月結', cfMonthLabel(m) + ' 結帳', () => {
    if (prev) Object.assign(prev, rec); else DB.periods.push(rec);
    return [cfMonthLabel(m) + ' 交易改為唯讀', '可以加註與補憑證；解鎖會留下紀錄'];
  }, () => { if (before) Object.assign(prev, before); else DB.periods = DB.periods.filter(p => p !== rec); });
}
function cfReopen() {
  const m = cfMonth(), rec = cfPeriod(m);
  if (!isOwner() || !rec) return deny();
  const why = (getById('cfReopenWhy')?.value || '').trim();
  if (!why) return toast('請寫下解鎖原因');
  const before = JSON.parse(JSON.stringify(rec));
  commit('update', '月結', cfMonthLabel(m) + ' 解鎖', () => {
    rec.st = 'open';
    rec.log = [...(rec.log || []), { at: Date.now(), by: DB.me, action: 'reopen', reason: why }];
    return [cfMonthLabel(m) + ' 恢復可編輯', '原因已留在月結紀錄'];
  }, () => Object.assign(rec, before));
}
function cfCloseView() {
  if (!isOwner()) return cfBoundary('月結由負責人處理', '月結會把整個月的帳鎖起來交給會計師。');
  const m = cfMonth(), rec = cfPeriod(m), locked = cfLocked(m);
  const checks = cfChecks(m), left = checks.filter(c => !c.ok).length;
  const hasData = DB.txns.some(t => t.d.slice(0, 7) === m) || DB.bank.some(b => b.d.slice(0, 7) === m);
  const bar = `<div class="cf-bar">${cfPeriodBar()}</div>`;
  if (!hasData && !rec) return bar + cfEmpty(`${cfMonthLabel(m)} 還沒有可結帳的項目`, '帳本有交易之後，這裡會列出鎖帳前要完成的事。', `<button class="btn pri" onclick="cfGo('ledger')">前往帳本</button>`);
  const rows = checks.map(c => `<div class="cf-chk ${c.ok ? 'ok' : ''}"><span class="ic">${c.ok ? svg('check', 12) : ''}</span><span class="lb">${c.l}</span><span class="cnt">${c.inverse ? (c.of ? '還有 ' + c.of + ' 筆' : '—') : c.of ? c.n + '/' + c.of : (c.empty || '—')}</span>${c.ok || locked ? '<span></span>' : `<button class="link" onclick="cfGo('${c.go}')">前往 ${svg('chevronRight', 11)}</button>`}</div>`).join('');
  let foot;
  if (locked) foot = `<div class="cf-close-foot"><div class="cf-reopen"><input id="cfReopenWhy" placeholder="解鎖原因（必填，會留在紀錄）" aria-label="解鎖原因"><button class="btn" onclick="cfReopen()">解鎖 ${Number(m.slice(5))} 月</button></div><p>鎖定期間可以加註與補憑證；金額、日期與歸屬需要解鎖才能改。</p></div>`;
  else if (S.cfLockAsk) foot = `<div class="cf-close-foot"><div class="cf-confirm">${svg('warn', 13)}<span>鎖定後 ${cfMonthLabel(m)} 的交易改為唯讀，解鎖需要填原因並留下紀錄。</span><button class="btn pri" onclick="cfLock()">確認鎖定</button><button class="btn" onclick="cfLockAsk(false)">取消</button></div></div>`;
  else foot = `<div class="cf-close-foot"><button class="btn pri" ${left ? 'disabled' : ''} onclick="cfLockAsk(true)">${svg('lock', 12)} 鎖定 ${Number(m.slice(5))} 月</button><p>${left ? `先完成上面 ${left} 項才能鎖定。` : '鎖定後可以加註與補憑證，金額、日期、歸屬唯讀。'}</p></div>`;
  let h = bar + panel(cfMonthLabel(m) + ' 結帳', locked ? '已鎖定' : (left ? `還有 ${left} 項` : '可以鎖定'), `<div class="cf-checks">${rows}</div>${foot}`, '', true);
  const history = [...DB.periods].sort((a, b) => a.id < b.id ? 1 : -1).flatMap(p => (p.log || []).map(l => ({ ...l, id: p.id }))).sort((a, b) => b.at - a.at).slice(0, 12);
  if (history.length) h += '<div style="height:12px"></div>' + panel('月結紀錄', '', `<div class="rows">${history.map(l => `<div class="row cf-li"><span class="m">${new Date(l.at).toISOString().slice(0, 10)}</span><span class="t">${cfMonthLabel(l.id)} ${l.action === 'close' ? '結帳' : '解鎖'}${l.reason ? `<small>原因：${esc(l.reason)}</small>` : ''}</span><span class="chip ${l.action === 'close' ? 'c-n' : 'c-w'}">${person(l.by)}</span><span></span></div>`).join('')}</div>`, '', true);
  return h;
}

/* ==================================================================
   面 C：洞察（只讀帳本；每個數字都能下鑽）
   ================================================================== */
function cfCompanyView() {
  if (!isOwner()) return cfBoundary('公司整體數字只有負責人看得到', '你可以在「專案」看參與專案的預算與毛利，在「人事」看自己的薪資試算。');
  const m = cfMonth();
  const rows = DB.txns.filter(t => t.d.slice(0, 7) === m && !t.pass);
  const bar = `<div class="cf-bar">${cfPeriodBar()}</div>`;
  if (!rows.length) return bar + cfEmpty('建立交易後計算', `洞察只讀帳本；${cfMonthLabel(m)} 還沒有交易。`, `<button class="btn pri" onclick="cfGo('ledger')">前往帳本</button>`);
  const inc = rows.filter(t => t.amt > 0).reduce((a, b) => a + b.amt, 0);
  const exp = rows.filter(t => t.amt < 0).reduce((a, b) => a + b.amt, 0);
  const unrec = rows.filter(t => !cfMatched(t)).length;
  const kpi = (lb, v, s, f, color) => `<button class="kpi cf-kpi" onclick="cfGo('ledger',{cfFilter:'${f}',cfMonth:'${m}'})"><div class="lb">${lb} ${svg('chevronRight', 11)}</div><div class="v" style="${color || ''}">${nt(v)}</div><div class="s">${s}</div></button>`;
  let h = bar + `<div class="kpis" style="margin-bottom:12px">
    ${kpi(Number(m.slice(5)) + ' 月淨額', inc + exp, unrec ? `含 ${unrec} 筆尚未勾稽` : '全部已勾稽', 'all', `color:${inc + exp < 0 ? 'var(--danger)' : 'var(--ok)'}`)}
    ${kpi('收入', inc, rows.filter(t => t.amt > 0).length + ' 筆', 'income', 'color:var(--ok)')}
    ${kpi('支出', exp, rows.filter(t => t.amt < 0).length + ' 筆', 'expense')}
    <div class="kpi cf-unset"><div class="lb">現金水位 · Runway</div><div class="v">尚未設定現金帳戶</div><div class="s">設定銀行帳戶與期初餘額後計算，不推測</div></div>
    <div class="kpi cf-unset"><div class="lb">應收未收</div><div class="v">交易還沒有到期日</div><div class="s">補上到期與收付日期後計算</div></div></div>`;
  const byCat = {};
  rows.filter(t => t.amt < 0).forEach(t => { byCat[t.cat] = (byCat[t.cat] || 0) - t.amt; });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = cats.length ? cats[0][1] : 1;
  const months = cfMonths().slice(0, 6).reverse();
  const net = months.map(x => [x, DB.txns.filter(t => t.d.slice(0, 7) === x && !t.pass).reduce((a, b) => a + b.amt, 0)]);
  const nmax = Math.max(1, ...net.map(n => Math.abs(n[1])));
  h += `<div class="g g2">${panel(Number(m.slice(5)) + ' 月支出構成', '來源：帳本 ' + rows.length + ' 筆', cats.length ? `<div class="cf-bars">${cats.map(([c, v]) => `<div class="cf-bar-r" onclick="cfGo('ledger',{cfFilter:'expense'})"><span>${esc(c)}</span><span class="tr"><i style="width:${v / max * 100}%"></i></span><span class="num">${nt(v)}</span></div>`).join('')}</div>` : '<div class="empty">本月沒有支出</div>')}
    ${panel('近月淨額', '不含代收代付', `<div class="cf-bars">${net.map(([x, v]) => `<div class="cf-bar-r"><span>${Number(x.slice(5))} 月${cfLocked(x) ? ' ' + svg('lock', 10) : ''}</span><span class="tr"><i class="${v < 0 ? 'neg' : ''}" style="width:${Math.abs(v) / nmax * 100}%"></i></span><span class="num" style="${v < 0 ? 'color:var(--danger)' : ''}">${nt(v)}</span></div>`).join('')}</div>`)}</div>`;
  return h;
}
function cfSetProj(pid) { S.proj = pid; render(); }
function cfProjectView() {
  const ids = (isOwner() ? DB.projects.map(p => p.id) : myProjects()).filter(id => P(id));
  if (!ids.length) return cfEmpty('還沒有專案', isOwner() ? '建立專案後，這裡會顯示每個專案的收入、成本與可分配毛利。' : '你目前沒有參與的專案。', isOwner() ? newProjectAction() : '');
  if (!ids.includes(S.proj)) S.proj = ids[0];
  const bar = `<div class="cf-bar"><div class="seg">${ids.map(id => `<button class="${S.proj === id ? 'on' : ''}" onclick="cfSetProj('${id}')">${esc(P(id).t)}</button>`).join('')}</div>${isOwner() ? '' : '<span class="cf-muted">只顯示你參與的專案</span>'}</div>`;
  return bar + vWaterfall(S.proj) + '<div style="height:12px"></div>' + cfPrev(5);
}

/* ---------- 路由 ---------- */
const cfPrev = VIEWS.money;
VIEWS.money = tab => {
  const k = (CF_TABS[tab] || CF_TABS[0])[0];
  const run = () => {
    switch (k) {
      case 'inbox': return cfInboxView();
      case 'mine': return cfMineView();
      case 'vault': return cfVaultView();
      case 'ledger': return cfLedgerView();
      case 'recon': return cfReconView();
      case 'close': return cfCloseView();
      case 'company': return cfCompanyView();
      case 'project': return cfProjectView();
      default: return cfPrev(4);
    }
  };
  if (isOwner()) return run();
  const all = DB.txns;
  DB.txns = all.filter(canSeeTxn);
  try { return run(); } finally { DB.txns = all; }
};
