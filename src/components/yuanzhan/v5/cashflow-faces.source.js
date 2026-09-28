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
  ['company', '公司'], ['project', '專案'], ['people', '人事'], ['contract', '合約金流']
];
/**
 * 每一面用顯式的 { from, len }，不要再用「每面剛好三格」的算術。
 *
 * 原本 cfFace() 是 CF_FACES[Math.floor(S.tab / 3)]，配上寫死的 from 0/3/6。
 * 洞察面加第四個分頁之後 Math.floor(9 / 3) === 3 會落在陣列外，
 * 回傳 undefined 再被 `|| CF_FACES[0]` 接住 —— 畫面會無聲跳回「收單」面，
 * 不會報錯。分頁數一旦不是 3 的倍數，算術就是錯的來源。
 */
const CF_FACES = [
  { id: 'intake', nm: '收單', sub: '每天 · 全員', from: 0, len: 3 },
  { id: 'books', nm: '帳務', sub: '每週 · 記帳', from: 3, len: 3 },
  { id: 'insight', nm: '洞察', sub: '每月 · 決策', from: 6, len: 4 }
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
function cfFace() { const t = S.tab || 0; return CF_FACES.find(f => t >= f.from && t < f.from + f.len) || CF_FACES[0]; }
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
  // 正在歸帳的那一筆可能落在一個還沒有任何交易的月份：把它加進來，
  // 不然切過去看預覽列的時候，期間選單裡根本沒有那個月。
  if (S.cfFiling) {
    const dr = S.cfDraft[S.cfFiling], x = DB.intake.find(y => y.id === S.cfFiling);
    const fd = (dr && dr.d) || (x && x.d) || '';
    if (fd) set.add(fd.slice(0, 7));
  }
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
/** 歸屬在表格裡一律是同一顆 chip —— 預覽列和入帳後那一列要長得一模一樣，
 *  不然「預覽」就沒有在預覽。 */
const cfProjChip = p => !p ? '' : p.startsWith('PRJ') ? `<span class="chip c-p">${esc(p.slice(-3))}</span>` : '<span class="chip c-n">公司</span>';
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
  }).join('')}</div><div class="cf-subtabs" role="tablist" aria-label="${face.nm}">${Array.from({ length: face.len }, (_, i) => {
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
    const signed = await presignUpload(file, { origin: 'cashflow' });
    // finalize 沒跑到的那一列會停在 uploading，24 小時後被孤兒清理刪掉 bytes。
    // 所以失敗也要回報，讓它直接變 failed，而不是留一列狀態不明的紀錄。
    try {
      await putToR2(signed.uploadUrl, file);
      await finalizeUpload(signed.assetId);
    } catch (e) {
      await finalizeUpload(signed.assetId, 'failed').catch(() => {});
      throw e;
    }
    return { ...meta, objectKey: signed.objectKey, assetId: signed.assetId, refCode: signed.refCode };
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
const cfIsImage = f => /^image\//.test(f?.type || '') || /\.(png|jpe?g|webp)$/i.test(f?.name || '');
const cfIsPdf = f => /pdf/i.test(f?.type || '') || /\.pdf$/i.test(f?.name || '');
const cfExt = f => ((f?.name || '').split('.').pop() || '檔案').slice(0, 5);

/**
 * 縮圖與預覽：先畫骨架，圖真的解碼完才淡入。
 *
 * 舊版直接吐 `<img>` 但不給 src，等 paintFilePreview 取到簽名網址才補上 ——
 * 中間那段瀏覽器畫的是破圖圖示，使用者每次都先看到壞掉再看到圖。
 * 這裡把 <img> 包進一個佔位容器：載好才 .ready（淡入），失敗才 .failed（畫一個檔案圖示），
 * 兩種結局都不會讓破圖露出來。
 */
function cfImgReady(el) { el.closest('.cf-hold')?.classList.add('ready'); }
function cfImgFail(el) { const h = el.closest('.cf-hold'); if (h) { h.classList.remove('ready'); h.classList.add('failed'); } }
async function cfPaintImg(pid, objectKey) {
  try {
    const res = await fetch('/api/company/operating/uploads?key=' + encodeURIComponent(objectKey));
    if (!res.ok) throw Error('取得檔案失敗');
    const { downloadUrl } = await res.json();
    const el = root.querySelector('#' + pid);
    if (!el) return;
    if (el.tagName === 'IMG') el.src = downloadUrl; else { el.data = downloadUrl; cfImgReady(el); }
  } catch {
    const h = root.querySelector('#' + pid + '-h');
    if (h) h.classList.add('failed');
  }
}
function cfHoldImg(f, pid, cls) {
  if (f.objectKey) setTimeout(() => cfPaintImg(pid, f.objectKey), 0);
  return `<span class="cf-hold ${cls}" id="${pid}-h"><img id="${pid}" alt="${esc(f.name || '憑證')}"${f.data ? ` src="${esc(f.data)}"` : ''} onload="cfImgReady(this)" onerror="cfImgFail(this)"><i class="cf-hold-fb">${svg('file', 16)}</i></span>`;
}
function cfFileTile(f, key) {
  if (cfIsImage(f) && (f.objectKey || f.data)) return cfHoldImg(f, 'cfImg-' + key, 'cf-thumb');
  return `<span class="cf-thumb cf-doc">${svg('file', 18)}<em>${esc(cfExt(f))}</em></span>`;
}

/**
 * 看憑證用站內燈箱，不另開分頁。
 * 開新視窗等於離開這個模組：回來之後要重找剛才那一列，
 * 而在手機上那一個分頁常常就再也沒被關掉。原檔仍然可以從燈箱下載。
 */
function cfOpenFile(f, src) {
  if (!f) return;
  S.cfViewing = f;
  S.cfViewSrc = src || null;
  const pid = 'cfLb';
  let body;
  if (cfIsImage(f) && (f.objectKey || f.data)) body = cfHoldImg(f, pid, 'cf-lb-img');
  else if (cfIsPdf(f)) {
    if (f.objectKey) setTimeout(() => cfPaintImg(pid, f.objectKey), 0);
    body = `<object id="${pid}" class="cf-lb-pdf" type="application/pdf"${f.data ? ` data="${esc(f.data)}"` : ''}><p class="cf-lb-none">${svg('file', 22)}<span>這個瀏覽器不能內嵌 PDF，請用下方「下載原檔」。</span></p></object>`;
  } else body = `<div class="cf-lb-none">${svg('file', 26)}<span>${esc(f.name || '檔案')} 沒有可以直接看的預覽</span></div>`;
  const meta = [f.bytes ? Math.round(f.bytes / 1024) + ' KB' : '', f.at || '', f.by ? person(f.by) + ' 上傳' : ''].filter(Boolean).join(' · ');
  // 已經站在那一頁就不用再給「回去」——那是一顆什麼都不會發生的按鈕。
  const jump = src && !(S.wb === 'money' && src.kind === cfKey()) ? src : null;
  openModal(esc(f.name || '憑證'), meta, body,
    `${jump ? `<button class="btn" onclick="cfViewGo()">${svg('goto', 12)} ${esc(jump.label)}</button>` : ''}<button class="btn" onclick="cfDownloadViewing()">${svg('download', 12)} 下載原檔</button><button class="btn pri" onclick="closeModal()">關閉</button>`);
  $('#modalWrap')?.classList.add('cf-lb-on');
}
/** 燈箱是借 #modalWrap 畫的，關掉時要把放寬版面的記號拿掉。 */
const cfBaseCloseModal = closeModal;
closeModal = () => { $('#modalWrap')?.classList.remove('cf-lb-on'); S.cfViewing = null; S.cfViewSrc = null; cfBaseCloseModal(); };
function cfViewGo() {
  const src = S.cfViewSrc;
  closeModal();
  if (!src) return;
  if (src.kind === 'txn') openDrawer('txn', src.id);
  else cfGo(src.kind);
}
/** 下載是使用者明確要的動作，這時才開外部連結。 */
async function cfDownloadViewing() {
  const f = S.cfViewing;
  if (!f) return;
  try {
    if (f.data) { window.open(f.data, '_blank', 'noopener'); return; }
    const res = await fetch('/api/company/operating/uploads?key=' + encodeURIComponent(f.objectKey));
    if (!res.ok) throw Error('取得檔案失敗');
    const { downloadUrl } = await res.json();
    window.open(downloadUrl, '_blank', 'noopener');
  } catch (e) { toast(esc(e.message)); }
}

/* ==================================================================
   面 A：收單 —— 一個區域一塊工作面，不是卡片疊卡片

   舊版把「需要你核准 / 待補 / 最近送出」各開一張 panel()，空的狀態還留一個空框；
   四塊加起來不到 600px，下面全是空白。改成一塊 .cf-deck 填滿該區域，
   內部只用 1px 分隔線，狀態降級成分組標題或篩選鍵。

   兩種檢視，角色決定預設（可手動切換，記在 S.cfInboxMode）：
     成員   → focus 逐筆過單：一次一題，系統決定先問什麼，做完就沒了
     負責人 → table 一張清單：缺什麼就地補，可勾選多筆一次處理

   拖放不再常駐佔頂部 180px：整塊 deck 都是 drop 區，拖進來才浮出 overlay。
   圖示一律走 svg()（lucide），不用 emoji。
   ================================================================== */
S.cfInboxMode = S.cfInboxMode || '';
S.cfInFilter = S.cfInFilter || 'todo';
S.cfStep = S.cfStep || '';
S.cfQueueTail = S.cfQueueTail || [];
S.cfChecked = S.cfChecked || [];
S.cfCell = S.cfCell || '';
S.cfPickFor = S.cfPickFor || '';
S.cfVaultMode = S.cfVaultMode || 'grid';
S.cfReimbSel = S.cfReimbSel || '';
S.cfViewing = S.cfViewing || null;
S.cfViewSrc = S.cfViewSrc || null;

const cfInboxMode = () => S.cfInboxMode || (isOwner() ? 'table' : 'focus');
function cfSetInboxMode(m) { S.cfInboxMode = m; S.cfErr = ''; S.cfCell = ''; S.cfPickFor = ''; render(); }

/* ---------- 草稿疊在原值之上：畫面一律看疊完的結果 ---------- */
function cfAmtOf(x) {
  const d = S.cfDraft[x.id] || {};
  if (d.amt != null && d.amt !== '') {
    const n = Number(String(d.amt).replace(/[^\d]/g, ''));
    return Number.isNaN(n) ? null : n;
  }
  return x.amt == null || x.amt === '' ? null : Number(x.amt);
}
const cfProjOf = x => (S.cfDraft[x.id] || {}).p || x.p;
const cfTitleOf = x => { const d = S.cfDraft[x.id] || {}; return d.t != null && d.t !== '' ? d.t : x.t; };

async function cfIngest(file) {
  try {
    toast(OP_LIVE ? '上傳中…' : '讀取中…');
    const f = await cfReadFile(file);
    if (!active) return;
    const x = { id: nid('INT'), who: DB.me, t: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || '收據', amt: null, d: TODAY, p: '', st: 'draft', file: f, reimb: '', txn: '', at: Date.now() };
    S.cfEditing = x.id;
    S.cfDraft[x.id] = {};
    S.cfStep = '';
    S.cfQueueTail = [];
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
/** 缺什麼＝下一題。回傳順序就是提問順序：先金額（要看圖），再歸屬（要想）。 */
function cfMissing(x) {
  const miss = [];
  if (cfAmtOf(x) == null) miss.push('金額');
  if (!cfProjOf(x)) miss.push('歸屬');
  return miss;
}
function cfReadDraft(id) {
  const d = S.cfDraft[id] || (S.cfDraft[id] = {});
  const amt = getById('cfAmt-' + id), t = getById('cfTitle-' + id);
  if (amt) d.amt = amt.value;
  if (t) d.t = t.value;
  return d;
}
function cfEdit(id) { S.cfEditing = id; S.cfStep = 'amt'; S.cfErr = ''; render(); setTimeout(() => getById('cfAmt-' + id)?.focus(), 0); }
function cfCancel() { S.cfEditing = null; S.cfStep = ''; S.cfErr = ''; render(); }
function cfPickProj(id, p) {
  cfReadDraft(id).p = p;
  S.cfErr = '';
  S.cfStep = '';
  S.cfPickFor = '';
  render();
}
function cfSubmit(id) {
  const x = DB.intake.find(y => y.id === id);
  if (!x || x.who !== DB.me) return deny();
  const d = cfReadDraft(id);
  const raw = String(d.amt != null ? d.amt : (x.amt ?? '')).replace(/[^\d]/g, '');
  const amt = raw ? Number(raw) : null;
  const p = d.p || x.p;
  const t = (d.t != null && d.t !== '' ? d.t : x.t).trim() || x.t;
  const miss = [];
  if (!amt) miss.push('金額');
  if (!p) miss.push('歸屬');
  if (miss.length) { S.cfErr = '還差' + miss.join('與') + '。'; render(); return; }
  const before = { ...x };
  // 送出一律留下報帳單，「我的報帳」才看得到自己的錢走到哪。
  // 負責人不需要自我核准：直接落在「已核」，後面只剩付款那一步。
  const selfApproved = isOwner();
  const r = { id: nid('RMB'), who: DB.me, t, amt, st: selfApproved ? '已核' : '已送', d: x.d || TODAY };
  S.cfEditing = null;
  S.cfStep = '';
  S.cfErr = '';
  S.cfChecked = S.cfChecked.filter(i => i !== id);
  S.cfQueueTail = S.cfQueueTail.filter(i => i !== id);
  commit('update', '收件', t + ' 送出', () => {
    Object.assign(x, { amt, p, t, st: 'unfiled' });
    DB.reimb.unshift(r);
    x.reimb = r.id;
    return selfApproved
      ? ['已送出 → 帳本的<b>待歸帳</b>', '同時記進<b>報帳</b>，等付款']
      : ['已送出，等負責人核准代墊', '核准後進入帳本的待歸帳'];
  }, () => {
    Object.assign(x, before);
    DB.reimb = DB.reimb.filter(y => y.id !== r.id);
  });
  toast(selfApproved ? '已送出，出現在帳本的待歸帳' : '已送出，等負責人核准');
}
function cfDiscard(id) {
  const x = DB.intake.find(y => y.id === id);
  if (!x || x.st !== 'draft' || (x.who !== DB.me && !isOwner())) return deny();
  const i = DB.intake.indexOf(x);
  S.cfEditing = null;
  S.cfStep = '';
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
/** 收件本身補一張圖：逐筆模式左側「沒有附檔」時的出口。 */
function cfAttachIntake(id) {
  const x = DB.intake.find(y => y.id === id);
  if (!x || (x.who !== DB.me && !isOwner())) return deny();
  cfPick(false, async file => {
    try {
      toast(OP_LIVE ? '上傳中…' : '讀取中…');
      const f = await cfReadFile(file);
      if (!active) return;
      const before = x.file;
      commit('update', '收件', x.t + ' ＋' + f.name, () => { x.file = f; return ['收據已附上這一筆']; }, () => { x.file = before; });
    } catch (e) { toast(esc(e.message)); }
  });
}

/* ---------- 隊列：待處理＝（負責人的）待核准 ＋ 自己的待補 ---------- */
const cfOwnIntake = () => DB.intake.filter(x => x.who === DB.me && x.st !== 'discarded');
const cfDrafts = () => cfOwnIntake().filter(x => x.st === 'draft');
const cfSentList = () => cfOwnIntake().filter(x => x.st !== 'draft');
const cfQueueKey = it => it.kind === 'appr' ? it.r.id : it.x.id;
function cfQueue() {
  const ap = isOwner() ? cfApprovals().map(r => ({ kind: 'appr', r, x: DB.intake.find(y => y.reimb === r.id) })) : [];
  const dr = cfDrafts().map(x => ({ kind: 'draft', x }));
  const q = [...ap, ...dr];
  const tail = S.cfQueueTail;
  return [...q.filter(i => !tail.includes(cfQueueKey(i))), ...q.filter(i => tail.includes(cfQueueKey(i)))];
}
/** 跳過不是丟掉：排到隊尾，這一輪還是會回來。 */
function cfSkip() {
  const q = cfQueue();
  if (q.length < 2) return;
  const k = cfQueueKey(q[0]);
  S.cfQueueTail = [...S.cfQueueTail.filter(i => i !== k), k];
  S.cfStep = '';
  S.cfErr = '';
  render();
}

/* ---------- 外框：一塊工作面，整塊都是 drop 區 ---------- */
function cfDeck(bar, body) {
  return `<div class="cf-deck" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="cfDrop(event,this)">
    <div class="cf-dropover"><b>${svg('inbox', 15)} 放開就收進收件匣，分類是之後的事</b></div>${bar}${body}</div>`;
}
function cfAddButtons() {
  return `<button class="btn" onclick="cfPick(true,cfIngest)">${svg('camera', 13)} 拍照</button><button class="btn" onclick="cfPick(false,cfIngest)">${svg('paperclip', 13)} 選檔案</button>`;
}
function cfModeSwitch() {
  const m = cfInboxMode();
  return `<span class="cf-seg" role="group" aria-label="收件匣檢視">
    <button class="${m === 'focus' ? 'on' : ''}" aria-pressed="${m === 'focus'}" onclick="cfSetInboxMode('focus')" title="一次只問一件事">${svg('layers', 13)} 逐筆</button>
    <button class="${m === 'table' ? 'on' : ''}" aria-pressed="${m === 'table'}" onclick="cfSetInboxMode('table')" title="一張清單就地補">${svg('table', 13)} 清單</button></span>`;
}
function cfInboxBar() {
  const q = cfQueue().length, sent = cfSentList().length;
  return `<div class="cf-deck-h"><span class="cf-deck-t">${q ? `<b>${q}</b> 筆等你處理` : '都處理完了'}</span>
    <span class="cf-muted">${cfMonthLabel(TODAY.slice(0, 7))} 已交件 ${sent} 筆</span>
    <span class="sp"></span>${cfModeSwitch()}${cfAddButtons()}</div>`;
}
function cfInboxView() {
  return cfDeck(cfInboxBar(), cfInboxMode() === 'table' ? cfTableBody() : cfFocusBody());
}

/* ==================================================================
   檢視一：逐筆過單（成員預設）
   哪一筆先處理、這一筆缺什麼、下一題是什麼，都由系統排好，人只要回答。
   ================================================================== */
function cfFocusBody() {
  const q = cfQueue();
  // 清空之後仍然看得到自己送出去的東西：成績單在上、最近送出在下。
  if (!q.length) return cfCleared() + cfQuiet();
  const it = q[0];
  return cfRail(q) + (it.kind === 'appr' ? cfApproveStage(it) : cfAskStage(it.x)) + cfQuiet();
}
function cfRail(q) {
  const done = Math.min(cfSentList().length, 6);
  const head = q[0];
  return `<div class="cf-rail"><span class="cf-rail-t">還剩 <b>${q.length}</b> 筆</span>
    <span class="cf-pips" aria-hidden="true">${Array.from({ length: done }, () => '<i class="done"></i>').join('')}${q.map((it, i) => `<i class="${i ? '' : 'now'}"></i>`).join('')}</span>
    <span class="cf-rail-a">${q.length > 1 ? `<button class="btn sm" onclick="cfSkip()">${svg('skip', 12)} 晚點再說</button>` : ''}${head.kind === 'draft' ? `<button class="btn sm dgr" onclick="cfDiscard('${head.x.id}')">${svg('trash', 12)} 丟棄</button>` : ''}</span></div>`;
}
function cfShot(x) {
  if (!x || !x.file) return `<div class="cf-shot-none">${svg('file', 26)}<span>這一筆沒有附檔</span>${x && x.st === 'draft' ? `<button class="btn sm" onclick="cfAttachIntake('${x.id}')">${svg('paperclip', 12)} 補上收據</button>` : ''}</div>`;
  const f = x.file;
  if (cfIsImage(f) && (f.objectKey || f.data)) return cfHoldImg(f, 'cfBig-' + x.id, 'cf-shot-img');
  return `<div class="cf-shot-none">${svg('file', 26)}<span>${esc(f.name)}</span><button class="btn sm" onclick="cfOpenIntakeFile('${x.id}')">${svg('maximize', 12)} 開啟</button></div>`;
}
function cfShotPane(x, sub) {
  return `<div class="cf-shotwrap"><div class="cf-shot-meta"><b>${esc(cfTitleOf(x))}</b><span>${sub}</span></div>${cfShot(x)}${x && x.file ? `<span class="cf-shot-tools"><button class="btn sm" onclick="cfOpenIntakeFile('${x.id}')" title="看原圖">${svg('maximize', 12)}</button></span>` : ''}</div>`;
}
/** 下一題＝cfMissing 的第一個缺項；都不缺就是確認頁。 */
function cfAskStep(x) {
  if (S.cfStep) return S.cfStep;
  const miss = cfMissing(x);
  if (miss.includes('金額')) return 'amt';
  if (miss.includes('歸屬')) return 'proj';
  return 'confirm';
}
function cfAskNext(id) {
  const x = DB.intake.find(y => y.id === id);
  if (!x) return;
  // 先判斷現在在哪一題，再把畫面上的值收進草稿：
  // 反過來的話，cfReadDraft 寫進去的金額會讓 cfAskStep 以為這一題已經答完，
  // 同一次點擊就直接掉到下一題並報「還差歸屬」。
  const step = cfAskStep(x);
  const d = cfReadDraft(id);
  if (step === 'amt') {
    const raw = String(d.amt != null ? d.amt : (x.amt ?? '')).replace(/[^\d]/g, '');
    if (!raw) { S.cfErr = '還差金額。'; render(); return; }
    d.amt = raw;
    S.cfErr = '';
    S.cfStep = '';
    render();
    return;
  }
  if (step === 'proj') { S.cfErr = '還差歸屬。'; render(); return; }
  cfSubmit(id);
}
function cfAskBack(id, k) { cfReadDraft(id); S.cfStep = k; S.cfErr = ''; render(); }
function cfAskStage(x) {
  const step = cfAskStep(x);
  const amt = cfAmtOf(x), p = cfProjOf(x), miss = cfMissing(x);
  const total = x.p ? 1 : 2;
  const crumbs = [
    amt != null && step !== 'amt' ? `<button class="cf-crumb" onclick="cfAskBack('${x.id}','amt')">${svg('check', 11)} 金額 <b>${nt(amt)}</b></button>` : '',
    p && step !== 'proj' ? `<button class="cf-crumb" onclick="cfAskBack('${x.id}','proj')">${svg('check', 11)} 歸屬 <b>${esc(cfProjLabel(p))}</b></button>` : ''
  ].filter(Boolean).join('');
  const left = cfQueue().length - 1;
  let qbody = '', act = '';
  if (step === 'amt') {
    qbody = `<div class="cf-qk">第 1 題 · 共 ${total} 題</div><h3 class="cf-q">這張多少錢？</h3>
      <p class="cf-qh">看左邊那張收據的合計欄，含稅金額就好。</p>
      <input id="cfAmt-${x.id}" class="cf-bigin" inputmode="numeric" aria-label="金額（新台幣）" value="${esc(amt == null ? '' : amt)}" placeholder="0" onkeydown="if(event.key==='Enter')cfAskNext('${x.id}')">
      <div class="cf-qhint">發票號碼與日期不必填，系統從檔案帶。</div>`;
    act = `<button class="btn pri cf-go" onclick="cfAskNext('${x.id}')">${total > 1 ? '下一題' : '送出'} ${svg('arrowRight', 14)}</button><span class="sp"></span><span class="cf-muted">${left ? `做完這筆還有 ${left} 筆` : '這是最後一筆'}</span>`;
  } else if (step === 'proj') {
    qbody = `<div class="cf-qk">第 ${amt == null ? 1 : 2} 題 · 最後一題</div><h3 class="cf-q">這筆算誰的？</h3>
      <p class="cf-qh">選錯了記帳的時候還能改，先挑最接近的就好。</p>
      <div class="cf-opts">${cfProjOptions().map(o => `<button class="cf-opt ${p === o ? 'on' : ''}" onclick="cfPickProj('${x.id}','${o}')"><b>${esc(cfProjLabel(o))}</b></button>`).join('')}</div>`;
    act = `<button class="btn cf-go" disabled>選一個就會自動往下</button><span class="sp"></span><button class="btn" onclick="cfAskBack('${x.id}','amt')">${svg('undo', 12)} 回上一題</button>`;
  } else {
    qbody = `<div class="cf-qk">確認</div><h3 class="cf-q">送出這一筆？</h3>
      <p class="cf-qh">${isOwner() ? '送出後進入帳本的待歸帳，補上類別就會入帳。' : '送出後由負責人核准，核准完進入帳本的待歸帳。可以在「我的報帳」看它走到哪。'}</p>
      <div class="cf-sum">
        <label class="cf-sum-r"><span>是什麼</span><input id="cfTitle-${x.id}" value="${esc(cfTitleOf(x))}" aria-label="這是什麼"></label>
        <div class="cf-sum-r"><span>金額</span><b class="n">${nt(amt)}</b><button class="cf-ed" onclick="cfAskBack('${x.id}','amt')">改</button></div>
        <div class="cf-sum-r"><span>歸屬</span><b>${esc(cfProjLabel(p))}</b><button class="cf-ed" onclick="cfAskBack('${x.id}','proj')">改</button></div>
        <div class="cf-sum-r"><span>日期</span><b>${esc(x.d || TODAY)}</b></div>
      </div>`;
    act = `<button class="btn pri cf-go" onclick="cfSubmit('${x.id}')">${svg('send', 14)} 送出</button><span class="sp"></span>${left ? `<button class="btn" onclick="cfSkip()">晚點再說</button>` : ''}`;
  }
  const sub = `${(x.d || '').slice(5)} · ${person(x.who)}${miss.length ? ` · <span class="cf-need">缺${miss.join('、')}</span>` : ''}`;
  return `<div class="cf-stagewrap">${cfShotPane(x, sub)}
    <div class="cf-ask">${crumbs ? `<div class="cf-crumbs">${crumbs}</div>` : ''}
      <div class="cf-qbody">${qbody}${S.cfErr ? `<div class="cf-err" role="alert">${S.cfErr}</div>` : ''}</div>
      <div class="cf-act">${act}</div></div></div>`;
}
function cfApproveStage(it) {
  const r = it.r, x = it.x || { id: r.id, t: r.t, file: null, d: r.d, who: r.who, st: 'unfiled' };
  const sub = `${(r.d || '').slice(5)} · ${person(r.who)} 代墊`;
  return `<div class="cf-stagewrap">${cfShotPane(x, sub)}
    <div class="cf-ask"><div class="cf-qbody">
      <div class="cf-qk">需要你核准 · 還有 ${cfApprovals().length} 筆</div>
      <h3 class="cf-q">要核准這筆代墊嗎？</h3>
      <p class="cf-qh">${person(r.who)} 先墊了這筆錢。核准後進入帳本的<b>待歸帳</b>，由記帳者補上類別才算入帳。</p>
      <div class="cf-sum">
        <div class="cf-sum-r"><span>項目</span><b>${esc(r.t)}</b></div>
        <div class="cf-sum-r"><span>金額</span><b class="n">${nt(r.amt)}</b></div>
        <div class="cf-sum-r"><span>歸屬</span><b>${it.x && it.x.p ? esc(cfProjLabel(it.x.p)) : '記帳時再選'}</b></div>
      </div></div>
      <div class="cf-act"><button class="btn pri cf-go" onclick="advReimb('${r.id}')">${svg('checkCircle', 14)} 核准，進待歸帳</button><span class="sp"></span><button class="btn" onclick="cfSkip()">晚點再說</button></div></div></div>`;
}
function cfQuiet() {
  const sent = cfSentList().slice(0, 6);
  if (!sent.length) return '';
  return `<div class="cf-quiet"><div class="cf-quiet-h"><span>最近送出</span><span class="sp"></span><span>${sent.length} 筆</span></div>
    ${sent.map(x => `<div class="cf-qrow"><span class="m">${(x.d || '').slice(5)}</span><span class="t">${esc(x.t)}</span><span class="n">${x.amt != null ? nt(x.amt) : '—'}</span>${cfSentStatus(x)}</div>`).join('')}</div>`;
}
/** 清空不是空狀態，是成績單：最大的版面給最好的消息。 */
function cfCleared() {
  const sent = cfSentList();
  const sum = sent.reduce((a, b) => a + (Number(b.amt) || 0), 0);
  const waiting = sent.filter(x => cfReimbOf(x)?.st === '已送').length;
  return `<div class="cf-cleared"><span class="ic">${svg('check', 24)}</span>
    <h3>收件匣清空了</h3>
    <p>有收據就拖進來、拍進來，缺什麼我會一張一張問你。</p>
    <div class="cf-stats">
      <div><b>${sent.length}</b><span>本月交件</span></div>
      <div><b>${nt(sum)}</b><span>送出金額</span></div>
      <div><b>${waiting}</b><span>等核准中</span></div>
    </div>
    <div class="cf-cleared-a">${cfAddButtons()}<button class="btn" onclick="cfGo('mine')">${svg('card', 13)} 看我的報帳</button></div></div>`;
}
function cfSentStatus(x) {
  const r = cfReimbOf(x);
  if (x.st === 'posted') return r && r.st === '已付' ? '<span class="chip c-o">已付款</span>' : '<span class="chip c-p">已入帳</span>';
  if (r && r.st === '已送') return '<span class="chip c-i">等待核准</span>';
  return '<span class="chip c-w">已核准 · 待歸帳</span>';
}

/* ==================================================================
   檢視二：一張清單（負責人預設）
   狀態是分組列與篩選鍵，不是卡片；缺漏是可以點的空格，不是說明文字。
   ================================================================== */
const CF_IN_FILTERS = [['todo', '待處理'], ['draft', '待補'], ['appr', '待你核准'], ['sent', '已送出'], ['all', '全部']];
function cfSetInFilter(k) { S.cfInFilter = k; S.cfChecked = []; S.cfCell = ''; S.cfPickFor = ''; S.cfErr = ''; render(); }
function cfCellEdit(id) { S.cfCell = id; S.cfPickFor = ''; render(); setTimeout(() => { const e = getById('cfAmt-' + id); if (e) { e.focus(); e.select(); } }, 0); }
function cfCellSave(id, v) {
  (S.cfDraft[id] || (S.cfDraft[id] = {})).amt = String(v).replace(/[^\d]/g, '');
  S.cfCell = '';
  S.cfErr = '';
  render();
}
function cfPickOpen(id) { S.cfPickFor = S.cfPickFor === id ? '' : id; S.cfCell = ''; render(); }
function cfCheck(id) {
  const i = S.cfChecked.indexOf(id);
  if (i < 0) S.cfChecked.push(id); else S.cfChecked.splice(i, 1);
  S.cfErr = '';
  render();
}
function cfCheckAll(ids) {
  const all = ids.length && ids.every(i => S.cfChecked.includes(i));
  S.cfChecked = all ? S.cfChecked.filter(i => !ids.includes(i)) : [...new Set([...S.cfChecked, ...ids])];
  render();
}
function cfBulkProj(p) {
  S.cfChecked.forEach(id => { const x = DB.intake.find(y => y.id === id); if (x && x.st === 'draft') (S.cfDraft[id] || (S.cfDraft[id] = {})).p = p; });
  S.cfPickFor = '';
  render();
}
function cfBulkSubmit() {
  const ready = S.cfChecked.filter(id => { const x = DB.intake.find(y => y.id === id); return x && x.st === 'draft' && !cfMissing(x).length; });
  if (!ready.length) { S.cfErr = '勾選的單據還有缺項，補齊金額與歸屬才能送出。'; render(); return; }
  ready.forEach(cfSubmit);
}
function cfBulkApprove() {
  const ids = S.cfChecked.filter(id => DB.reimb.some(r => r.id === id && r.st === '已送'));
  if (!ids.length) return;
  S.cfChecked = S.cfChecked.filter(i => !ids.includes(i));
  ids.forEach(id => advReimb(id));
}
function cfSubmitReady() { cfDrafts().filter(x => !cfMissing(x).length).forEach(x => cfSubmit(x.id)); }
function cfInRows() {
  const f = S.cfInFilter;
  const ap = isOwner() ? cfApprovals().map(r => ({ kind: 'appr', id: r.id, r, x: DB.intake.find(y => y.reimb === r.id) })) : [];
  const dr = cfDrafts().map(x => ({ kind: 'draft', id: x.id, x }));
  const st = cfSentList().map(x => ({ kind: 'sent', id: x.id, x }));
  if (f === 'draft') return dr;
  if (f === 'appr') return ap;
  if (f === 'sent') return st;
  if (f === 'all') return [...ap, ...dr, ...st];
  return [...ap, ...dr];
}
function cfThumb(x) {
  if (x && x.file) return `<button class="cf-thb" onclick="cfOpenIntakeFile('${x.id}')" title="看憑證">${cfFileTile(x.file, x.id)}</button>`;
  return `<span class="cf-thumb cf-doc">${svg('file', 15)}</span>`;
}
function cfRow(it) {
  const x = it.x, own = !!x && x.st === 'draft' && x.who === DB.me;
  const amt = x ? cfAmtOf(x) : it.r.amt;
  const p = x ? cfProjOf(x) : '';
  const checked = S.cfChecked.includes(it.id);
  const canCheck = it.kind === 'draft' ? own : it.kind === 'appr';
  const amtCell = S.cfCell === it.id
    ? `<input id="cfAmt-${it.id}" class="cf-cellin" inputmode="numeric" aria-label="金額" value="${esc(amt == null ? '' : amt)}" onblur="cfCellSave('${it.id}',this.value)" onkeydown="if(event.key==='Enter')this.blur()">`
    : amt == null
      ? `<button class="cf-gap" onclick="cfCellEdit('${it.id}')">${svg('plus', 11)} 金額</button>`
      : own
        ? `<button class="cf-amt" onclick="cfCellEdit('${it.id}')" title="點一下改">${nt(amt)}</button>`
        : `<span class="n">${nt(amt)}</span>`;
  const projCell = p
    ? (own ? `<button class="cf-proj" onclick="cfPickOpen('${it.id}')">${esc(cfProjLabel(p))}</button>` : `<span class="cf-proj ro">${esc(cfProjLabel(p))}</span>`)
    : own ? `<button class="cf-gap" onclick="cfPickOpen('${it.id}')">${svg('plus', 11)} 歸屬</button>` : '<span class="cf-muted">記帳時再選</span>';
  const status = it.kind === 'appr' ? '<span class="chip c-i">待你核准</span>' : it.kind === 'draft' ? '<span class="chip c-w">待補</span>' : cfSentStatus(x);
  const acts = it.kind === 'appr'
    ? `<button class="btn sm pri" onclick="advReimb('${it.r.id}')">核准</button>`
    : own
      ? `<button class="btn sm pri" onclick="cfSubmit('${it.id}')">送出</button>${mini('trash', `cfDiscard('${it.id}')`, 'dgr', '丟棄')}`
      : x && x.file ? mini('maximize', `cfOpenIntakeFile('${x.id}')`, '', '看憑證') : '';
  const miss = it.kind === 'draft' ? cfMissing(x) : [];
  const label = it.kind === 'appr' ? it.r.t : cfTitleOf(x);
  const who = it.kind === 'appr' ? it.r.who : x.who;
  const main = `<tr class="${checked ? 'sel' : ''}">
    <td class="ck">${canCheck ? `<button class="cf-ck ${checked ? 'on' : ''}" role="checkbox" aria-checked="${checked}" aria-label="選取 ${esc(label)}" onclick="cfCheck('${it.id}')">${checked ? svg('check', 11) : ''}</button>` : ''}</td>
    <td class="thc">${cfThumb(x)}</td>
    <td class="m">${((x ? x.d : it.r.d) || '').slice(5)}</td>
    <td class="k">${esc(label)}<small>${person(who)} 交件${miss.length ? ` · <span class="cf-need">缺${miss.join('、')}</span>` : ''}</small></td>
    <td>${projCell}</td>
    <td class="num">${amtCell}</td>
    <td>${status}</td>
    <td class="acts"><span class="rowacts">${acts}</span></td></tr>`;
  const picker = S.cfPickFor === it.id ? `<tr class="cf-pickrow"><td colspan="8"><span class="cf-pick-l">歸到哪裡</span><span class="chipset">${cfProjOptions().map(o => `<button type="button" class="${p === o ? 'on' : ''}" onclick="cfPickProj('${it.id}','${o}')">${esc(cfProjLabel(o))}</button>`).join('')}</span><button class="btn sm" onclick="cfPickOpen('')">取消</button></td></tr>` : '';
  return main + picker;
}
function cfTableBody() {
  const rows = cfInRows();
  const drafts = cfDrafts(), ap = isOwner() ? cfApprovals() : [];
  const sent = cfSentList();
  const count = k => k === 'todo' ? drafts.length + ap.length : k === 'draft' ? drafts.length : k === 'appr' ? ap.length : k === 'sent' ? sent.length : 0;
  const tools = `<div class="cf-tools"><span class="cf-seg2" role="group" aria-label="篩選">${CF_IN_FILTERS.filter(([k]) => k !== 'appr' || isOwner()).map(([k, nm]) => `<button class="${S.cfInFilter === k ? 'on' : ''}" aria-pressed="${S.cfInFilter === k}" onclick="cfSetInFilter('${k}')">${nm}${count(k) ? `<i>${count(k)}</i>` : ''}</button>`).join('')}</span></div>`;
  const checkable = rows.filter(r => r.kind === 'appr' || (r.x && r.x.st === 'draft' && r.x.who === DB.me)).map(r => r.id);
  const allOn = checkable.length > 0 && checkable.every(i => S.cfChecked.includes(i));
  const hasIntake = S.cfChecked.some(i => DB.intake.some(x => x.id === i));
  const hasReimb = S.cfChecked.some(i => DB.reimb.some(r => r.id === i));
  const bulk = S.cfChecked.length ? `<div class="cf-bulk">已選 <b>${S.cfChecked.length}</b> 筆<span class="sp"></span>
    ${hasIntake ? `<button class="btn sm" onclick="cfPickOpen('__bulk')">一次指定歸屬</button><button class="btn sm pri" onclick="cfBulkSubmit()">${svg('send', 12)} 全部送出</button>` : ''}
    ${hasReimb ? `<button class="btn sm pri" onclick="cfBulkApprove()">${svg('checkCircle', 12)} 全部核准</button>` : ''}
    <button class="btn sm" onclick="cfCheckAll([])">取消選取</button></div>${S.cfPickFor === '__bulk' ? `<div class="cf-bulkpick"><span class="cf-pick-l">全部歸到</span><span class="chipset">${cfProjOptions().map(o => `<button type="button" onclick="cfBulkProj('${o}')">${esc(cfProjLabel(o))}</button>`).join('')}</span><button class="btn sm" onclick="cfPickOpen('')">取消</button></div>` : ''}` : '';
  let body = '';
  if (!rows.length) {
    body = `<div class="cf-zero"><span class="ic">${svg('check', 20)}</span><h4>${S.cfInFilter === 'todo' ? '沒有等你處理的單據' : '這個篩選底下沒有單據'}</h4>
      <p>有收據就拖進來，或按右上「拍照 / 選檔案」。缺什麼會直接標在那一格。</p></div>`;
  } else {
    const group = (label, hint, list) => list.length ? `<tr class="cf-grp"><td colspan="8"><b>${label}</b><span>${hint}</span></td></tr>` + list.map(cfRow).join('') : '';
    const inner = S.cfInFilter === 'todo'
      ? group('需要你核准', `${rows.filter(r => r.kind === 'appr').length} 筆代墊，核准後進入帳本待歸帳`, rows.filter(r => r.kind === 'appr'))
        + group('你要補齊', `${rows.filter(r => r.kind === 'draft').length} 筆，補上標色的空格就能送出`, rows.filter(r => r.kind === 'draft'))
      : rows.map(cfRow).join('');
    body = `<div class="cf-tw"><table class="cf-grid">
      <thead><tr><th class="ck">${checkable.length ? `<button class="cf-ck ${allOn ? 'on' : ''}" role="checkbox" aria-checked="${allOn}" aria-label="全選" onclick="cfCheckAll(${esc(JSON.stringify(checkable))})">${allOn ? svg('check', 11) : ''}</button>` : ''}</th>
        <th></th><th>日期</th><th>項目</th><th>歸屬</th><th class="num">金額</th><th>狀態</th><th></th></tr></thead>
      <tbody>${inner}</tbody></table>
      <div class="cf-ghost">${svg('inbox', 15)} 把收據或發票拖到這裡 —— 分類是之後的事</div></div>`;
  }
  const readyN = drafts.filter(x => !cfMissing(x).length).length;
  const owe = cfOwnIntake().filter(x => x.st === 'draft' || cfReimbOf(x)?.st === '已送').reduce((a, c) => a + (cfAmtOf(c) || 0), 0);
  const foot = `<div class="cf-foot"><span>待補 <b class="warn">${drafts.length}</b> 筆</span>${isOwner() ? `<span>待核准 <b>${ap.length}</b> 筆</span>` : ''}
    <span>我還沒拿回的代墊 <b class="n">${nt(owe)}</b></span><span class="sp"></span>
    ${readyN ? `<span>有 <b>${readyN}</b> 筆已經補齊</span><button class="btn sm pri" onclick="cfSubmitReady()">${svg('send', 12)} 一次送出</button>` : '<span class="cf-muted">補齊金額與歸屬後，這裡會出現「一次送出」</span>'}</div>`;
  return tools + bulk + (S.cfErr ? `<div class="cf-err cf-err-bar" role="alert">${S.cfErr}</div>` : '') + body + foot;
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
  S.cfQueueTail = S.cfQueueTail.filter(i => i !== id);
  S.cfChecked = S.cfChecked.filter(i => i !== id);
  commit('update', '報帳狀態', r.t + ' → 已核', () => {
    r.st = '已核';
    if (x) DB.intake.unshift(x);
    return ['核准 → 進入帳本的<b>待歸帳</b>，補上類別後入帳'];
  }, () => {
    r.st = '已送';
    if (x) DB.intake = DB.intake.filter(y => y.id !== x.id);
  });
};

/* ==================================================================
   我的報帳：同一套角色分工
     負責人 → 一張表，多一個「進度」欄，一眼看出誰卡在哪
     成員   → 一筆一個狀態軸，看得到自己的錢走到哪裡
   ================================================================== */
function cfReimbPick(id) { S.cfReimbSel = id; render(); }
function cfMineView() {
  const list = DB.reimb.filter(r => isOwner() || r.who === DB.me);
  if (!list.length) {
    return cfDeck(`<div class="cf-deck-h"><span class="cf-deck-t">${isOwner() ? '報帳' : '我的報帳'}</span><span class="sp"></span>${cfAddButtons()}</div>`,
      `<div class="cf-zero"><span class="ic">${svg('card', 20)}</span><h4>還沒有報帳</h4>
        <p>自己代墊的費用，從收件匣交出來就會出現在這裡，看得到走到哪一步。</p>
        <div class="cf-cleared-a"><button class="btn pri" onclick="cfGo('inbox')">${svg('inbox', 13)} 前往收件匣</button></div></div>`);
  }
  const owe = list.filter(r => r.st !== '已付').reduce((a, c) => a + (Number(c.amt) || 0), 0);
  const bar = `<div class="cf-deck-h"><span class="cf-deck-t">${isOwner() ? '報帳' : '我的報帳'}</span>
    <span class="cf-muted">待送 → 已送 → 已核 → 已付</span><span class="sp"></span>
    <span class="cf-muted">未付清 <b class="n">${nt(owe)}</b></span></div>`;
  return cfDeck(bar, isOwner() ? cfMineTable(list) : cfMineTrack(list));
}
function cfMineTable(list) {
  const rows = list.map(r => {
    const i = RSTEPS.indexOf(r.st);
    const can = r.st === '待送' ? r.who === DB.me : (isOwner() && r.st !== '已付');
    return `<tr onclick="${r.who === DB.me ? `formReimb('${r.id}')` : ''}">
      <td class="thc"><span class="cf-thumb cf-doc">${svg('card', 15)}</span></td>
      <td class="m">${(r.d || '').slice(5)}</td>
      <td class="k">${esc(r.t)}<small>${person(r.who)} 代墊</small></td>
      <td class="trk"><span class="cf-track">${RSTEPS.map((s, j) => `<i class="${j < i ? 'done' : j === i ? 'now' : ''}" title="${s}"></i>`).join('')}<em>${r.st}</em></span></td>
      <td class="num"><span class="n">${nt(r.amt)}</span></td>
      <td class="acts"><span class="rowacts">${can ? `<button class="btn sm" onclick="event.stopPropagation();advReimb('${r.id}')">${r.st === '待送' ? '送出' : r.st === '已核' ? '標記已付' : '推進'}</button>` : ''}</span></td></tr>`;
  }).join('');
  return `<div class="cf-tw"><table class="cf-grid"><thead><tr><th></th><th>日期</th><th>項目</th><th>進度</th><th class="num">金額</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <div class="cf-foot"><span class="cf-muted">給外包、接案者的外部報帳連結尚未開放；目前由成員從收件匣交單。</span></div>`;
}
function cfMineTrack(list) {
  const sel = list.find(r => r.id === S.cfReimbSel) || list[0];
  const i = RSTEPS.indexOf(sel.st);
  const hints = ['你在收件匣按下送出', '負責人收到通知，等他核准', '進入帳本的待歸帳，記帳者補上類別', '出納付款，這一筆才真的結束'];
  const rest = list.filter(r => r.id !== sel.id);
  return `<div class="cf-trackwrap">
      <div class="cf-track-h"><h3>${esc(sel.t)}</h3><span class="n">${nt(sel.amt)}</span><span class="cf-muted">${esc(sel.d || '')} 送出 · 自己代墊</span></div>
      <div class="cf-trail">${RSTEPS.map((s, j) => `<div class="cf-tn ${j < i ? 'done' : j === i ? 'now' : 'todo'}"><span class="bul">${j < i ? svg('check', 12) : j + 1}</span><b>${s}</b><small>${hints[j]}</small></div>`).join('')}</div>
    </div>
    <div class="cf-act"><span class="cf-muted">目前卡在 <b>${sel.st}</b>。${i < 2 ? '等負責人核准。' : i === 2 ? '等記帳者補上類別。' : '已經付款，這一筆結束了。'}</span><span class="sp"></span><button class="btn" onclick="cfGo('inbox')">${svg('inbox', 13)} 回收件匣</button></div>
    ${rest.length ? `<div class="cf-quiet"><div class="cf-quiet-h"><span>其他在途</span><span class="sp"></span><span>${rest.length} 筆</span></div>
      ${rest.map(r => `<button class="cf-qrow lnk-row" onclick="cfReimbPick('${r.id}')"><span class="m">${(r.d || '').slice(5)}</span><span class="t">${esc(r.t)}</span><span class="n">${nt(r.amt)}</span><span class="chip c-p">${r.st}</span></button>`).join('')}</div>` : ''}`;
}

/* ==================================================================
   憑證庫：縮圖直接鋪滿整個區域，不再包一層 panel
   ================================================================== */
function cfSetVaultMode(m) { S.cfVaultMode = m; render(); }
function cfVaultView() {
  const m = cfMonth();
  const txns = DB.txns.filter(t => t.d.slice(0, 7) === m);
  const missing = txns.filter(t => !t.v.length);
  const tiles = [];
  // 點縮圖＝看這張憑證（燈箱），不是跳去別的地方；要跳，燈箱裡有「看這筆交易／回收件匣」。
  txns.forEach(t => (t.files || []).forEach((f, i) => tiles.push({ f, key: t.id + '-' + i, label: t.t, sub: t.d.slice(5) + ' · ' + nt(t.amt), open: `cfOpenTxnFile('${t.id}',${i})` })));
  DB.intake.filter(x => x.file && x.st !== 'posted' && x.st !== 'discarded' && (isOwner() || x.who === DB.me)).forEach(x => tiles.push({ f: x.file, key: x.id, label: x.t, sub: (x.d || '').slice(5) + ' · ' + (x.st === 'draft' ? '待補' : '待歸帳'), open: `cfOpenIntakeFile('${x.id}')` }));
  const labelOnly = txns.filter(t => t.v.length && !(t.files || []).length).length;
  const bar = `<div class="cf-deck-h">${cfPeriodBar()}<span class="cf-muted">共 ${tiles.length} 份憑證${labelOnly ? ` · 另有 ${labelOnly} 筆只標了種類、沒有檔案` : ''}</span><span class="sp"></span>
    <span class="cf-seg" role="group" aria-label="憑證檢視">
      <button class="${S.cfVaultMode === 'grid' ? 'on' : ''}" aria-pressed="${S.cfVaultMode === 'grid'}" onclick="cfSetVaultMode('grid')">${svg('grid', 13)} 格狀</button>
      <button class="${S.cfVaultMode === 'list' ? 'on' : ''}" aria-pressed="${S.cfVaultMode === 'list'}" onclick="cfSetVaultMode('list')">${svg('table', 13)} 表格</button></span></div>`;
  const strip = missing.length ? `<div class="cf-miss">${svg('bolt', 13)}<div><b>${missing.length} 筆交易缺原始憑證</b>：${missing.map(t => `<span class="lnk" onclick="cfAttach('${t.id}')">${esc(t.t)}</span>`).join('、')} —— 點名稱直接上傳。</div></div>` : '';
  if (!tiles.length) {
    return cfDeck(bar, strip + `<div class="cf-zero"><span class="ic">${svg('file', 20)}</span><h4>這個月還沒有憑證</h4>
      <p>收件匣交出的收據、帳本補上的發票都會收在這裡。</p>
      <div class="cf-cleared-a"><button class="btn pri" onclick="cfGo('inbox')">${svg('inbox', 13)} 前往收件匣</button></div></div>`);
  }
  const body = S.cfVaultMode === 'list'
    ? `<div class="cf-tw"><table class="cf-grid"><thead><tr><th></th><th>檔名</th><th>來源</th><th></th></tr></thead><tbody>
        ${tiles.map(v => `<tr onclick="${v.open}"><td class="thc">${cfFileTile(v.f, v.key)}</td><td class="k">${esc(v.label)}</td><td class="m">${esc(v.sub)}</td>
          <td class="acts"><span class="rowacts">${mini('maximize', v.open, '', '看憑證')}</span></td></tr>`).join('')}
      </tbody></table></div>`
    : `<div class="cf-vault">${tiles.map(v => `<button class="cf-vch" onclick="${v.open}">${cfFileTile(v.f, v.key)}<b>${esc(v.label)}</b><span>${esc(v.sub)}</span></button>`).join('')}
        <button class="cf-vch cf-add" onclick="cfPick(false,cfIngest)">${svg('plus', 18)}<span>補上憑證</span></button></div>`;
  return cfDeck(bar, strip + body);
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

/* ---------- 歸帳：一列預覽，不是一排按鈕（Owner 決策 2026-09-28）----------
   原本按「歸帳」是在待歸帳條帶裡攤開兩排 chip，選到最後一顆的同時就寫進帳本 ——
   按下去之前，你看不到這一筆進帳本會長成什麼樣子，也沒有反悔的地方。
   改成：按「歸帳」在帳本表格最上面長出一列草稿列，欄位和表頭一一對齊，
   缺的欄位就是那一欄裡的琥珀色空格，補完再按「確認入帳」。
   預覽和結果是同一個形狀 —— 因為它本來就是同一列。 */

/** 草稿 ＝ 收件那一筆的值，疊上你在預覽列上改過的部分。 */
function cfFilingDraft(id) {
  const x = DB.intake.find(y => y.id === id);
  if (!x) return null;
  const dr = S.cfDraft[id] || (S.cfDraft[id] = {});
  return {
    id, x,
    d: dr.d || x.d || TODAY,
    t: dr.t != null ? dr.t : x.t,
    p: dr.p || x.p || '',
    cat: dr.cat || '',
    amt: dr.amt != null ? dr.amt : -Math.abs(Number(x.amt) || 0),
    pass: !!dr.pass
  };
}
function cfDraftSet(id, k, v) {
  const dr = S.cfDraft[id] || (S.cfDraft[id] = {});
  if (k === 'amt') {
    const n = Number(String(v).replace(/[,\s]/g, ''));
    if (!Number.isFinite(n)) return toast('金額請填數字');
    dr.amt = n;
  } else if (k === 'd') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return toast('日期格式錯誤');
    dr.d = v;
    // 預覽列改日期，期間跟著走：不然你會把它填到一個自己看不到的月份去。
    S.cfMonth = v.slice(0, 7);
  } else if (k === 'pass') dr.pass = !!v;
  else dr[k] = v;
}
function cfFileStart(id) {
  if (id && !isOwner()) return deny();
  S.cfFiling = id;
  TC.at = '';
  if (id) {
    const dr = cfFilingDraft(id);
    if (dr) S.cfMonth = dr.d.slice(0, 7);
    closeDrawer(true);
  }
  render();
}
function cfFilePick(id, p) { cfDraftSet(id, 'p', p); render(); }
/** 舊入口：給了類別就直接入帳。指令面板與既有連結還在用。 */
function cfFile(id, cat) { cfDraftSet(id, 'cat', cat); cfFileConfirm(id); }

/** 真正寫進帳本的那一次 —— 也是唯一一次進 changelog 的那一次。 */
function cfFileConfirm(id) {
  if (!isOwner()) return deny();
  const dr = cfFilingDraft(id);
  if (!dr) return;
  if (!dr.p) return toast('先選歸屬');
  if (!dr.cat) return toast('先選類別');
  const m = dr.d.slice(0, 7);
  if (cfLocked(m)) return toast(cfMonthLabel(m) + ' 已結帳，請先解鎖或改日期');
  const x = dr.x, r = cfReimbOf(x), wasP = x.p;
  const amt = dr.cat === '收入' ? Math.abs(dr.amt) : -Math.abs(dr.amt);
  const t = { id: nid('TXN'), d: dr.d, t: dr.t, p: dr.p, cat: dr.cat, amt, pass: !!dr.pass, v: x.file ? ['收據'] : [], files: x.file ? [x.file] : [], note: '由收件 ' + x.id + (x.reimb ? ' · 報帳 ' + x.reimb : '') };
  S.cfFiling = null;
  delete S.cfDraft[id];
  commit('create', '交易（歸帳）', t.t, () => {
    DB.txns.unshift(t);
    Object.assign(x, { st: 'posted', txn: t.id, p: dr.p });
    if (r) r.txn = t.id;
    return [`${esc(t.t)} → <b>${esc(dr.cat)}</b> 入帳 ${nt(amt)}`, ...(dr.p.startsWith('PRJ') ? effProject(dr.p) : ['公司層級支出，不進入任何專案毛利'])];
  }, () => {
    DB.txns = DB.txns.filter(y => y.id !== t.id);
    Object.assign(x, { st: 'unfiled', txn: '', p: wasP });
    if (r) r.txn = null;
  });
}

/** 待歸帳條帶：現在只負責「還有誰在排隊」，填欄位是下面那一列的事。 */
function cfUnfiledStrip() {
  const list = cfUnfiled();
  if (!list.length) return '';
  return `<div class="cf-strip"><div class="cf-strip-h"><b>待歸帳 ${list.length}</b><span>按「歸帳」會在下面的帳本長出一列預覽，補上標色的欄位再確認</span></div>${list.map(x => {
    const p = x.p || S.cfDraft[x.id]?.p;
    const filing = S.cfFiling === x.id;
    return `<div class="cf-strip-i ${filing ? 'on' : ''}"><span class="m">${(x.d || '').slice(5)}</span><span class="t">${esc(x.t)}<small>${person(x.who)} · ${p ? esc(cfProjLabel(p)) : '<span class="cf-need">未選歸屬</span>'}${x.file ? ` · <span class="lnk" onclick="cfOpenIntakeFile('${x.id}')">看憑證</span>` : ''}</small></span><span class="n">${nt(-Math.abs(Number(x.amt) || 0))}</span>
      ${filing ? `<span class="cf-strip-now">${svg('arrowRight', 12)} 正在下面那一列填<button class="btn sm" onclick="cfFileStart(null)">取消</button></span>` : `<button class="btn sm pri" onclick="cfFileStart('${x.id}')">歸帳</button>`}</div>`;
  }).join('')}</div>`;
}
function cfOpenIntakeFile(id) { const x = DB.intake.find(y => y.id === id); if (x?.file) cfOpenFile(x.file, { kind: 'inbox', label: '回收件匣' }); }

/** 預覽列：和帳本的列同一組欄位、同一種格子，只是還沒入帳。 */
function cfFilingRow() {
  if (!S.cfFiling) return '';
  const dr = cfFilingDraft(S.cfFiling);
  if (!dr) return '';
  const x = dr.x;
  const c = (k, o) => tcCell(Object.assign({ kind: 'filing', id: dr.id, k }, o));
  const need = [];
  if (!dr.p) need.push('歸屬');
  if (!dr.cat) need.push('類別');
  const n = x.file ? 1 : 0;
  return `<tr class="cf-fil-h"><td colspan="9"><b>正在歸帳</b><span>來自收件 ${esc(x.id)} · ${person(x.who)} 交件${need.length ? ` · 還缺 <i>${need.join('、')}</i>` : ' · 欄位齊了，確認就入帳'}</span></td></tr>
    <tr class="cf-fil">
      <td>${c('d', { type: 'date', lb: '日期', val: dr.d, text: dr.d.slice(5) })}</td>
      <td class="k">${c('t', { type: 'text', lb: '摘要', val: dr.t })}</td>
      <td>${c('p', { type: 'select', lb: '專案', val: dr.p, text: cfProjChip(dr.p), html: true, gap: '歸屬', opts: cfProjOptions().map(o => [o, cfProjLabel(o)]) })}</td>
      <td>${c('cat', { type: 'select', lb: '類別', val: dr.cat, gap: '類別', opts: CATS.map(k => [k, k]) })}</td>
      <td class="num">${c('amt', { type: 'num', lb: '金額', val: dr.amt, text: nt(dr.amt) })}</td>
      <td>${c('pass', { type: 'toggle', lb: '代收付', val: dr.pass, text: dr.pass ? '<span class="chip c-w">是</span>' : '—', html: true })}</td>
      <td>${n ? `<span class="chip c-o">${svg('paperclip', 10)} ${n}</span>` : '<span class="chip c-d">缺</span>'}</td>
      <td><span class="chip c-w">預覽 · 尚未入帳</span></td>
      <td><span class="rowacts"><button class="btn sm pri" ${need.length ? 'disabled title="還有欄位沒填"' : ''} onclick="cfFileConfirm('${dr.id}')">${svg('checkCircle', 12)} 確認入帳</button><button class="btn sm" onclick="cfFileStart(null)">取消</button></span></td>
    </tr>`;
}

/** 帳本的一列。每一格都是它自己的欄位，不是那個欄位的照片。 */
function cfLedgerRow(t) {
  const c = (k, o) => tcCell(Object.assign({ kind: 'txn', id: t.id, k }, o));
  const locked = cfTxLocked(t);
  const chip = cfProjChip(t.p);
  const files = (t.files || []).length;
  return `<tr data-tx="${t.id}" class="${S.selTxn === t.id ? 'sel' : ''}" onclick="selectTxn('${t.id}')">
    <td>${c('d', { type: 'date', lb: '日期', val: t.d, text: t.d.slice(5) })}</td>
    <td class="k">${c('t', { type: 'text', lb: '摘要', val: t.t })}</td>
    <td>${c('p', { type: 'select', lb: '專案', val: t.p, text: chip, html: true, opts: cfProjOptions().map(o => [o, cfProjLabel(o)]) })}</td>
    <td>${c('cat', { type: 'select', lb: '類別', val: t.cat, opts: CATS.map(k => [k, k]) })}</td>
    <td class="num" style="${t.pass ? 'color:var(--text-3)' : t.amt > 0 ? 'color:var(--ok)' : ''}">${c('amt', { type: 'num', lb: '金額', val: t.formula != null ? t.formula : t.amt, text: nt(t.amt) })}</td>
    <td>${c('pass', { type: 'toggle', lb: '代收付', val: t.pass, text: t.pass ? '<span class="chip c-w">是</span>' : '—', html: true })}</td>
    <td>${files ? `<span class="chip c-o">${svg('paperclip', 10)} ${files}</span>` : t.v.length ? `<span class="chip c-n">${t.v.length}</span>` : '<span class="chip c-d">缺</span>'}</td>
    <td>${cfStage(t)}</td>
    <td><span class="rowacts">${mini('paperclip', `cfAttach('${t.id}')`, '', '上傳憑證')}${mini('pen', `formTxn('${t.id}')`)}${locked ? '' : mini('trash', `delTxn('${t.id}')`, 'dgr')}</span></td></tr>`;
}

function cfLedgerView() {
  if (!isOwner()) return cfBoundary('帳務由負責人處理', '帳本、對帳與月結是記帳的工作。你交出的單據核准後會出現在這裡等待歸帳，你不需要選類別。');
  const m = cfMonth(), locked = cfLocked(m);
  const rows = DB.txns.filter(t => t.d.slice(0, 7) === m);
  const f = CF_FILTERS[S.cfFilter] ? S.cfFilter : 'all';
  const shown = rows.filter(CF_FILTERS[f][1]).sort((a, b) => a.d < b.d ? 1 : -1);
  const sum = rows.filter(t => !t.pass).reduce((a, b) => a + b.amt, 0);
  const bar = `<div class="cf-bar">${cfPeriodBar()}<div class="seg">${Object.entries(CF_FILTERS).map(([k, [nm]]) => `<button class="${f === k ? 'on' : ''}" onclick="cfSetFilter('${k}')">${nm}</button>`).join('')}</div><span class="sp"></span><button class="btn pri" onclick="formTxn()">${svg('plus')} 新增交易</button></div>`;
  const draft = cfFilingRow();
  let h = bar + cfUnfiledStrip();
  // 沒有交易、也沒有在歸帳，才是真的空的。正在歸帳時表格要在，預覽列才有地方站。
  if (!rows.length && !draft) return h + cfEmpty('帳本的每一列就是一張傳票', `${cfMonthLabel(m)} 還沒有交易。從上方待歸帳挑一筆，或直接新增。`, `<button class="btn pri" onclick="formTxn()">${svg('plus')} 新增交易</button>`);
  const body = shown.map(t => cfLedgerRow(t)).join('') || (draft ? '' : `<tr><td colspan="9"><div class="empty">沒有符合「${CF_FILTERS[f][0]}」的交易</div></td></tr>`);
  h += panel('交易內帳', locked ? '已結帳 · 可加註與補憑證，金額、日期、歸屬唯讀' : '點一列開抽屜 · 摘要、專案、類別、金額、代收付點一下就能改', `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>日期</th><th>摘要</th><th>專案</th><th>類別</th><th class="num">金額</th><th>代收付</th><th>憑證</th><th>狀態</th><th></th></tr></thead>
    <tbody>${draft}${body}</tbody>
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
function cfOpenTxnFile(id, i) { const f = TX(id)?.files?.[i]; if (f) cfOpenFile(f, { kind: 'txn', id, label: '看這筆交易' }); }

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
