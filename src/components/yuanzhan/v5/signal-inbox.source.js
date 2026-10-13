/* ==================================================================
   訊號頁：兩層訊號、對話分析、來源與推播（RES-036 · LINESIG-UI）

   一條規則貫穿這一頁：**確定訊號是要處理的事，潛在訊號是要先判斷的事。**

   - 確定訊號來自日誌與紀錄（buildSignals 的七條規則、回覆追蹤）。它們會擋收工、算徽章。
   - 潛在訊號來自 LINE 對話的判讀。它可能是錯的，所以每一筆附原話，
     而且在人按下採納之前不產生任何義務：不進逾期橫幅、不擋收工、不計徽章。
     這一檔沒有碰 rqLate／rqBlockers／openSignals，就是這條規則的實作。
   - 採納把它變成一件任務（走 commit()，會保存、會進稽核），LINE 原話掛在任務留言上。

   成員的 LINE 連結（LINESIG-S1）接在「來源與推播」：代碼 → 傳給官方帳號 → 回網站按「是我」。
   狀態一律讀伺服器（/api/company/line），這裡不保存也不推導連結狀態。
   群組還沒接上（LINESIG-S2），所以對話來源仍是 LINE App 匯出的 .txt 或直接貼上。貼上的對話、判讀出來的
   潛在訊號、遮蔽決定都只在這個分頁的記憶體裡：不上傳、不保存、重新整理就沒有。
   會留下來的只有採納後的任務與併入後的留言。

   對話分析的四關（選取 → 去識別化 → 確認 → 送出）裡，第四關在這一版是關著的：
   模型供應商還沒指定之前，任何 LINE 內文都不離開這個系統（RES-036 §11 的停止條件）。
   去識別化與規則判讀是 @/lib/ui-data/yuanzhan 裡的純函式，這裡只接畫面。
   ================================================================== */

const SG_KIND = { question: ['對方提問未回', 'message'], commitment: ['承諾與期限', 'flag'], deliverable: ['交付物到了', 'paperclip'] };
const SG_SIDES = [['us', '我方'], ['client', '客戶'], ['vendor', '廠商'], ['other', '其他']];
const SG_IGNORE = ['不是請求', '已處理', '與專案無關', '判讀錯誤'];
const SG_TYPE_NAME = { overdue: '逾期', stale: '停滯 / Blocker', writeback: '未回寫', evidence: '缺 Evidence', commit: '契約與紀錄' };
const SG_SOURCE = [['sig-due-', '任務'], ['sig-age-', '任務'], ['sig-blk-', '任務'], ['sig-dec-', '日誌'], ['sig-thr-', '討論串'], ['sig-ev-', '任務'], ['sig-cmt-', '承諾'], ['sig-vch', '金流'], ['sig-ts-', '出勤']];

WB.find(w => w.id === 'signal').tabs = ['待處理', '對話分析', '已處理', '來源與推播'];

function sgBlankAn() {
  return { raw: '', title: '', msgs: [], speakers: [], sides: {}, from: '', to: '', min: '', max: '', proj: '', terms: [], restored: [], excluded: [], keepAmounts: true, confirmed: null, pick: '', pickKind: 'person', found: null, demo: false, byId: {}, kept: [] };
}
/** 分頁記憶體。刻意不放進 DB：DB 會被整包快照與比對，客戶的對話不該混進去。 */
const SG = { cands: [], open: null, filter: 'all', showLater: false, runs: [], an: sgBlankAn(), line: null, lineAt: 0, lineLoading: false, lineBusy: '', lineAsk: '', lineCode: null, lineTimer: 0, lineQuotaAsked: false };

/* ---------- LINE 連結狀態（伺服器是唯一的來源）---------- */

const SG_LINE_ENDPOINT = '/api/company/line';
const SG_LINE_NONE = { state: 'none', codeExpiresAt: null, pendingExpiresAt: null, displayName: null, pictureUrl: null, pushEnabled: false, linkedAt: null };
/** 畫面上所有「尚未開通／未連結」都從這裡來，不各自判斷。預覽模式沒有伺服器狀態，一律是未開通。 */
function sgLine() {
  const d = SG.line || {}, me = d.me && d.me.state ? d.me : SG_LINE_NONE;
  return { live: OP_LIVE, loaded: !!SG.line, configured: !!d.configured, verified: !!d.lastWebhookAt, lastWebhookAt: d.lastWebhookAt || '', bot: d.bot || null,
    canBind: d.canBind !== false, me, team: Array.isArray(d.team) ? d.team : [], quota: d.quota || null, groups: [] };
}
function sgLineSet(data) {
  if (!data || typeof data !== 'object') return;
  if (!data.quota && SG.line && SG.line.quota) data.quota = SG.line.quota;
  SG.line = data;
  if (!data.me || data.me.state !== 'code') SG.lineCode = null;
}
const sgLineKey = () => JSON.stringify([SG.line && SG.line.me, SG.line && SG.line.configured, SG.line && SG.line.lastWebhookAt, SG.line && SG.line.team]);
function sgLineOnPage() { return S.wb === 'signal' && (S.tab === 0 || S.tab === 3); }
async function sgLineLoad() {
  if (!OP_LIVE || SG.lineLoading) return;
  SG.lineLoading = true;
  const before = sgLineKey();
  try {
    // 用量要多打兩次 LINE API，只在「來源與推播」第一次打開時問。
    const quota = S.wb === 'signal' && S.tab === 3 && !SG.lineQuotaAsked;
    if (quota) SG.lineQuotaAsked = true;
    const res = await fetch(SG_LINE_ENDPOINT + (quota ? '?quota=1' : ''));
    const data = await res.json().catch(() => null);
    if (res.ok) sgLineSet(data);
  } catch (e) { /* 讀不到就維持上一次的狀態；下一次進來會再試 */ }
  SG.lineLoading = false; SG.lineAt = Date.now();
  if (sgLineKey() !== before && sgLineOnPage()) render();
  sgLinePoll();
}
/** 進到訊號頁時，狀態超過一分鐘就重讀。render 之後才發請求，不會擋畫面。 */
function sgLineEnsure() {
  const stale = Date.now() - SG.lineAt > 60000, needQuota = S.tab === 3 && !SG.lineQuotaAsked;
  if (OP_LIVE && !SG.lineLoading && (stale || needQuota)) sgLineLoad(); else sgLinePoll();
}
/* 等代碼被傳出去、等本人按確認的那幾分鐘，每三秒問一次；離開這一頁就停。 */
function sgLinePoll() {
  clearTimeout(SG.lineTimer); SG.lineTimer = 0;
  const st = SG.line && SG.line.me && SG.line.me.state;
  if ((st === 'code' || st === 'pending') && S.wb === 'signal' && S.tab === 3) SG.lineTimer = setTimeout(() => { SG.lineTimer = 0; if (S.wb === 'signal' && S.tab === 3) sgLineLoad(); }, 3000);
}
const SG_LINE_DONE = { code: '代碼已產生，10 分鐘內有效', confirm: 'LINE 帳號已連結', reject: '已放掉那個 LINE 帳號', unlink: '已解除連結', test: '已送出測試推播，看一下手機' };
async function sgLineAct(action) {
  if (SG.lineBusy) return;
  SG.lineBusy = action; SG.lineAsk = ''; render();
  try {
    const res = await fetch(SG_LINE_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) toast(esc((data && data.error) || '這個動作沒有完成'));
    else {
      sgLineSet(data.status);
      if (action === 'code' && data.code) SG.lineCode = { code: String(data.code), expiresAt: String(data.expiresAt || '') };
      toast(action === 'confirm' && data.notified === false ? 'LINE 帳號已連結；但確認訊息沒有送到，可能是封鎖了官方帳號' : SG_LINE_DONE[action]);
    }
  } catch (e) { toast('連不上伺服器，這個動作沒有完成'); }
  SG.lineBusy = ''; SG.lineAt = Date.now(); render(); sgLinePoll();
}
function sgLineAsk(what) { SG.lineAsk = SG.lineAsk === what ? '' : what; render(); }
const sgClock = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${sgPad(d.getHours())}:${sgPad(d.getMinutes())}`; };
const sgDay = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.getMonth() + 1}/${d.getDate()} ${sgClock(iso)}`; };

const sgPad = n => String(n).padStart(2, '0');
function sgNow() { const d = new Date(); return `${d.getFullYear()}-${sgPad(d.getMonth() + 1)}-${sgPad(d.getDate())} ${sgPad(d.getHours())}:${sgPad(d.getMinutes())}`; }
const sgWhen = at => (at ? at.slice(5).replace('-', '/') : '');
const sgText = s => esc(s).replace(/\n/g, '<br>');
const sgCand = id => SG.cands.find(c => c.id === id);
const sgOpenCands = () => SG.cands.filter(c => c.st === 'open');
function sgSourceOf(id) { const hit = SG_SOURCE.find(([p]) => id.startsWith(p)); return hit ? hit[1] : '紀錄'; }
function sgMemberOf(name) { return Object.keys(DB.people).find(k => { const n = person(k); return n === name || (n.length >= 2 && name.includes(n)) || (name.length >= 2 && n.includes(name)); }) || ''; }

/* ---------- 對話：讀入、區間、字典 ---------- */

function sgDemoText() {
  const d = new Date(), y = new Date(d.getTime() - 864e5), ymd = x => `${x.getFullYear()}/${sgPad(x.getMonth() + 1)}/${sgPad(x.getDate())}`;
  return `[LINE] 柏翰客戶群的聊天記錄\n${ymd(y)}\n14:02\t戴宇星\t王會計師您好，明天前把導入後 30 日成效報告給您\n14:05\t王志明會計師\t好的，謝謝\n16:40\tLily\t柏翰科技的統編 12345678 我先填進報價單\n${ymd(d)}\n09:14\t王志明會計師\t報價單可以分兩期付嗎？第一期 9 萬先匯到永豐 012-345-678901\n09:15\t王志明會計師\t陳小姐那邊請直接打 0912-345-678 找她，或寄 chen@bohan.com.tw\n09:16\t王志明會計師\t[檔案] 簽回的需求書.pdf\n09:17\t王志明會計師\t[貼圖]`;
}
function sgParse(raw, demo) {
  const parsed = cvParseExport(raw);
  const spoken = parsed.messages.filter(m => m.type !== 'system');
  if (!spoken.length) return null;
  const an = sgBlankAn();
  an.raw = raw; an.demo = !!demo; an.byId = Object.fromEntries(parsed.messages.map(m => [m.id, m])); an.title = parsed.title || '未命名的對話'; an.msgs = parsed.messages; an.speakers = parsed.speakers;
  // 站內成員的名字出現在發話者裡就是我方；其餘先當客戶，由人改。
  parsed.speakers.forEach(n => { an.sides[n] = sgMemberOf(n) ? 'us' : 'client'; });
  const days = parsed.messages.map(m => m.at.slice(0, 10)).filter(Boolean).sort();
  an.min = days[0] || ''; an.max = days[days.length - 1] || '';
  an.to = an.max;
  // 預設區間不超過單次上限，從最近的那一天往回算。
  an.from = an.min && ddiff(an.min, an.max) >= CV_MAX_DAYS ? sgShift(an.max, -(CV_MAX_DAYS - 1)) : an.min;
  const hit = DB.projects.find(p => [p.t, p.client, String(p.t || '').split(' · ')[0]].some(k => k && k.length >= 2 && an.title.includes(k)));
  an.proj = hit ? hit.id : '';
  return an;
}
function sgShift(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function sgLoad(raw, demo) {
  const an = sgParse(String(raw || ''), demo);
  if (!an) return toast('看不出對話的格式。請貼上 LINE「傳送聊天記錄」匯出的文字，或一行一則的「名字：內容」');
  SG.an = an; render();
  toast(`讀入 <b>${an.msgs.length}</b> 則，${an.speakers.length} 位發話者`);
}
function sgFile(input) {
  const f = input.files && input.files[0]; if (!f) return;
  if (f.size > 2e6) return toast('檔案超過 2MB。請在 LINE 匯出較短的區間');
  const reader = new FileReader();
  reader.onload = () => sgLoad(String(reader.result || ''));
  reader.readAsText(f);
}
function sgReset() { SG.an = sgBlankAn(); render(); }
function sgSlice() { return cvSliceByDate(SG.an.msgs, SG.an.from, SG.an.to); }
/** 字典：專案名、客戶名、專案名開頭那一段（多半是客戶簡稱），加上人在這一次補上的字。 */
function sgTerms() {
  const out = [];
  DB.projects.forEach(p => {
    if (p.t) out.push({ text: p.t, kind: 'project' });
    if (p.client) out.push({ text: p.client, kind: 'company' });
    const head = String(p.t || '').split(' · ')[0];
    if (head && head !== p.t) out.push({ text: head, kind: 'company' });
  });
  return out.concat(SG.an.terms);
}
function sgDeid() {
  const an = SG.an;
  return cvDeidentify(sgSlice(), { speakers: an.speakers.map(n => ({ name: n, side: an.sides[n] || 'client' })), terms: sgTerms(), keepAmounts: an.keepAmounts, restored: an.restored, excluded: an.excluded });
}
function sgOverLimit(slice) {
  if (slice.length > CV_MAX_MSGS) return `這段有 ${slice.length} 則，單次上限 ${CV_MAX_MSGS} 則。請縮短區間`;
  if (SG.an.from && SG.an.to && ddiff(SG.an.from, SG.an.to) >= CV_MAX_DAYS) return `區間超過 ${CV_MAX_DAYS} 天。請縮短區間`;
  return '';
}

/* 任何會改變「將送出的版本」的動作都不必手動清掉確認：
   確認記的是指紋，內容一變指紋就不同，確認自然失效。 */
function sgRange(k, v) { SG.an[k] = v; if (SG.an.from && SG.an.to && SG.an.from > SG.an.to) SG.an[k === 'from' ? 'to' : 'from'] = v; SG.an.found = null; render(); }
function sgSide(i, v) { const n = SG.an.speakers[i]; if (n) { SG.an.sides[n] = v; SG.an.found = null; render(); } }
function sgToggle(list, key) { const a = SG.an[list], i = a.indexOf(key); if (i >= 0) a.splice(i, 1); else a.push(key); render(); }
function sgKeepAmounts(on) { SG.an.keepAmounts = !!on; render(); }
function sgAddTerm(text, kind) {
  const t = String(text || '').trim();
  if (t.length < 2) return toast('至少兩個字，才不會把整段對話遮成一片');
  if (t.length > 40) return toast('太長了。只選要遮的那個名字或號碼');
  if (!SG.an.terms.some(x => x.text === t)) SG.an.terms.push({ text: t, kind: kind || 'term' });
  SG.an.pick = ''; render();
}
function sgDropTerm(i) { SG.an.terms.splice(i, 1); render(); }
/* 疑似人名要嘛遮、要嘛由人說「這不是人名」。兩者都沒做之前不能確認 ——
   規則抓不到字典外的名字，這幾個是它唯一說得出「我不確定」的地方，不能被略過。 */
function sgKeep(text) { if (!SG.an.kept.includes(text)) SG.an.kept.push(text); render(); }
function sgPending(res) { return res.stats.suspects.filter(t => !SG.an.kept.includes(t)); }
function sgConfirm() {
  const res = sgDeid();
  if (cvFindLeaks(res).length) return toast('送出內容裡還有已遮蔽的原字，不能確認');
  if (sgPending(res).length) return toast('還有疑似人名沒決定：遮蔽，或標成不是人名');
  SG.an.confirmed = { fp: res.fingerprint, at: sgNow(), by: DB.me, sent: res.stats.sent, masks: res.stats.maskTotal };
  sgRun('確認送出版本', res.stats.sent, res.stats.maskTotal, null);
  render(); toast(`已確認這一份：<b>${res.stats.sent}</b> 則、遮蔽 <b>${res.stats.maskTotal}</b> 處`);
}
function sgRun(type, sent, masks, found) {
  SG.runs.unshift({ at: sgNow(), type, group: SG.an.title, from: SG.an.from, to: SG.an.to, sent, masks, found, by: DB.me, keys: found == null ? [] : SG.an.found.keys });
  if (SG.runs.length > 30) SG.runs.pop();
}

/* ---------- 規則判讀：在本機執行，不送出任何內容 ---------- */

function sgDetectInto(msgs, sides, group, proj) {
  const drafts = cvDetect(msgs, { sides, now: sgNow(), group });
  const fresh = drafts.filter(d => !SG.cands.some(c => c.id === d.key));
  fresh.forEach(d => SG.cands.push({ ...d, id: d.key, group, proj: proj || '', st: 'open', reason: '', target: '', handledAt: '' }));
  return { total: drafts.length, fresh: fresh.length, keys: drafts.map(d => d.key) };
}
function sgDetect() {
  const an = SG.an, slice = sgSlice(), over = sgOverLimit(slice);
  if (over) return toast(over);
  if (!an.speakers.some(n => an.sides[n] === 'us')) return toast('先標出哪幾位是我方，才分得出「對方問了沒人回」');
  an.found = sgDetectInto(slice, an.sides, an.title, an.proj);
  sgRun('規則判讀', slice.filter(m => m.type !== 'system' && m.type !== 'sticker').length, 0, an.found.total);
  render();
  toast(an.found.total ? `找到 <b>${an.found.total}</b> 則${an.found.fresh < an.found.total ? `，其中 ${an.found.fresh} 則是新的` : ''}，放在待處理` : '這一段沒有找到需要注意的事');
}

/* ---------- 潛在訊號的四個動作 ---------- */

function sgAct(id, mode) {
  if (SG.open && SG.open.id === id && SG.open.mode === mode) { SG.open = null; return render(); }
  const c = sgCand(id);
  if (mode === 'ignore') { SG.open = { id, mode }; return render(); }
  if (!c) return;
  const proj = c.proj || (DB.projects[0] && DB.projects[0].id) || '';
  if (mode === 'adopt') {
    const who = c.speaker.replace(/(會計師|律師|代書|老師|先生|小姐)$/, '');
    const short = c.quote.replace(/\s+/g, ' ').slice(0, 40);
    const title = c.kind === 'question' ? `回覆${who}：${short}` : c.kind === 'deliverable' ? `整理${who}傳來的檔案：${short.replace(/^\[[^\]]*\]\s*/, '')}` : short;
    SG.open = { id, mode, title, proj, owner: (c.kind === 'commitment' && sgMemberOf(c.speaker)) || DB.me, due: c.due || TODAY };
  } else SG.open = { id, mode, proj, target: '' };
  render();
}
function sgCancel() { SG.open = null; render(); }
function sgSet(k, v, rerender) { if (SG.open) { SG.open[k] = v; if (k === 'proj') SG.open.target = ''; if (rerender) render(); } }
/** 掛在任務留言上的那一句。來源要能被人讀懂，不是一串 id。 */
function sgProvenance(c) { return `來自 LINE〈${c.group}〉${c.speaker}${c.at ? ' ' + sgWhen(c.at) : ''}：「${c.quote}」`; }
function sgClose(c, st, extra) { Object.assign(c, { st, handledAt: sgNow() }, extra); SG.open = null; }
function sgAdoptDo() {
  const o = SG.open, c = o && sgCand(o.id); if (!c) return;
  const title = String(o.title || '').trim(), p = P(o.proj);
  if (!title) return toast('先寫下這件事要做什麼');
  if (!p) return toast('選一個專案。這個工作區還沒有專案時，先到專案頁建立');
  const id = nid('ISS');
  commit('create', '任務', title, () => {
    DB.issues.unshift({
      id, t: title, p: p.id, owner: o.owner || DB.me, size: 'M', pri: 3, st: 'Todo', created: TODAY, started: '', done: '',
      blocker: '', exp: '', ev: 0, rel: [], cf: {}, sub: [], due: o.due || '', kind: 'TODO', msId: '', reviewer: '',
      reviewResult: '', reviewNote: '', reviewedAt: 0
    });
    DB.objectComments.push({ parent: id, w: DB.me, x: sgProvenance(c), ts: nowts() });
    sgClose(c, 'adopted', { target: id, proj: p.id });
    return ['採納自 LINE 潛在訊號', `${esc(p.t)} 的工作數 → <b>${DB.issues.filter(i => i.p === p.id).length}</b>`];
  });
}
function sgMergeDo() {
  const o = SG.open, c = o && sgCand(o.id); if (!c) return;
  const it = DB.issues.find(i => i.id === o.target);
  if (!it) return toast('選一件既有的任務');
  commit('create', '留言', it.t, () => {
    DB.objectComments.push({ parent: it.id, w: DB.me, x: sgProvenance(c), ts: nowts() });
    sgClose(c, 'merged', { target: it.id, proj: it.p });
    return ['LINE 原話已掛到這件任務的留言'];
  });
}
function sgIgnore(id, reason) {
  if (!SG_IGNORE.includes(reason)) return;
  const list = id === '*' ? sgOpenCands() : [sgCand(id)].filter(Boolean);
  list.forEach(c => sgClose(c, 'ignored', { reason }));
  SG.open = null; render();
  toast(list.length > 1 ? `已忽略 <b>${list.length}</b> 則：${reason}` : `已忽略：${reason}`);
}
function sgLater(id) { const c = sgCand(id); if (c) { c.st = 'later'; SG.open = null; render(); } }
function sgReopen(id) { const c = sgCand(id); if (c && (c.st === 'ignored' || c.st === 'later')) { Object.assign(c, { st: 'open', reason: '', handledAt: '' }); render(); } }
function sgShowLater() { SG.cands.forEach(c => { if (c.st === 'later') c.st = 'open'; }); render(); }
function sgFilter(k) { SG.filter = k; render(); }

/* ---------- 待處理 ---------- */

function sgSureRow(s) {
  const [cls, ic] = SIGIC[s.ty] || SIGIC.commit;
  runtime._sigJump[s.id] = s.jump;
  return `<div class="sig ${s.done ? 'done' : ''}" onclick="runtime._sigJump['${s.id}']&&runtime._sigJump['${s.id}']()">
    <span class="ic ${cls}">${svg(ic)}</span>
    <div class="bd"><div class="ti">${esc(s.ti)}</div><div class="ds">${esc(s.ds)}</div></div>
    <div class="rt"><span class="sg-src">${sgSourceOf(s.id)}</span>${s.done ? '<span class="chip c-o">已處理</span>' : `<button class="btn sm" onclick="event.stopPropagation();doneSignal('${s.id}')">標記已處理</button>`}</div></div>`;
}
function sgSurePanel(all) {
  const open = all.filter(s => !s.done);
  const types = Object.keys(SG_TYPE_NAME).filter(k => open.some(s => s.ty === k));
  if (SG.filter !== 'all' && !types.includes(SG.filter)) SG.filter = 'all';
  const list = SG.filter === 'all' ? open : open.filter(s => s.ty === SG.filter);
  const chips = types.length > 1 ? `<div class="sg-filter"><button class="sg-fc ${SG.filter === 'all' ? 'on' : ''}" onclick="sgFilter('all')">全部 ${open.length}</button>${types.map(k => `<button class="sg-fc ${SG.filter === k ? 'on' : ''}" onclick="sgFilter('${k}')">${SG_TYPE_NAME[k]} ${open.filter(s => s.ty === k).length}</button>`).join('')}</div>` : '';
  return panel('確定訊號', open.length + ' 則', (chips ? `<div class="sg-filter-bar">${chips}</div>` : '') + (list.length ? list.map(sgSureRow).join('') : '<div class="empty">沒有待處理的訊號</div>'), '', true);
}
function sgProjOptions(sel) { return `<option value="">選擇專案</option>` + DB.projects.map(p => `<option value="${esc(p.id)}" ${p.id === sel ? 'selected' : ''}>${esc(p.t)}</option>`).join(''); }
function sgCandForm(c) {
  const o = SG.open;
  if (!o || o.id !== c.id) return '';
  if (o.mode === 'ignore') return `<div class="sg-form"><div class="sg-row"><span class="sg-meta">為什麼忽略</span>${SG_IGNORE.map(r => `<button class="btn sm" onclick="sgIgnore('${c.id}','${r}')">${r}</button>`).join('')}<span class="sp"></span><button class="btn sm" onclick="sgCancel()">取消</button></div></div>`;
  if (o.mode === 'merge') {
    const tasks = DB.issues.filter(i => i.p === o.proj && i.st !== 'Done');
    return `<div class="sg-form"><div class="sg-fields">
      <label>專案<select onchange="sgSet('proj',this.value,true)">${sgProjOptions(o.proj)}</select></label>
      <label class="wide">併入哪一件任務<select onchange="sgSet('target',this.value)"><option value="">${tasks.length ? '選擇任務' : '這個專案沒有進行中的任務'}</option>${tasks.map(i => `<option value="${esc(i.id)}" ${i.id === o.target ? 'selected' : ''}>${esc(i.t)}</option>`).join('')}</select></label></div>
      <div class="sg-row"><span class="sg-meta">原話會掛在那件任務的留言上，不另外產生一筆</span><span class="sp"></span><button class="btn sm" onclick="sgCancel()">取消</button><button class="btn sm pri" onclick="sgMergeDo()">${svg('check', 12)} 併入</button></div></div>`;
  }
  return `<div class="sg-form"><div class="sg-fields">
    <label class="wide">任務<input type="text" value="${esc(o.title)}" maxlength="120" oninput="sgSet('title',this.value)"></label>
    <label>專案<select onchange="sgSet('proj',this.value)">${sgProjOptions(o.proj)}</select></label>
    <label>負責人<select onchange="sgSet('owner',this.value)">${Object.keys(DB.people).map(k => `<option value="${esc(k)}" ${k === o.owner ? 'selected' : ''}>${esc(person(k))}</option>`).join('')}</select></label>
    <label>期限<input type="date" value="${esc(o.due)}" onchange="sgSet('due',this.value)"></label></div>
    <div class="sg-row"><span class="sg-meta">會建立一件任務，LINE 原話掛在留言上</span><span class="sp"></span><button class="btn sm" onclick="sgCancel()">取消</button><button class="btn sm pri" onclick="sgAdoptDo()">${svg('check', 12)} 確定採納</button></div></div>`;
}
function sgCandCard(c) {
  const [name, ic] = SG_KIND[c.kind], on = SG.open && SG.open.id === c.id, mode = on ? SG.open.mode : '';
  return `<div class="sg-cand ${on ? 'on' : ''}" data-sg-cand="${c.id}">
    <div class="sg-row"><span class="chip c-i">${svg(ic, 11)} ${name}</span><span class="sg-meta">LINE · ${esc(c.group)} · ${esc(c.speaker)}${c.at ? ' · ' + sgWhen(c.at) : ''}</span><span class="sp"></span><span class="sg-meta">規則判讀 · 信心${c.conf === 'high' ? '高' : '中'}</span></div>
    <blockquote class="sg-q">${sgText(c.quote)}</blockquote>
    <div class="sg-row"><span class="sg-meta">${esc(c.hint)}</span><span class="sp"></span>
      <button class="btn sm ${mode === 'adopt' ? 'pri' : ''}" onclick="sgAct('${c.id}','adopt')">${svg('check', 12)} 採納</button>
      <button class="btn sm ${mode === 'merge' ? 'pri' : ''}" onclick="sgAct('${c.id}','merge')">併入既有</button>
      <button class="btn sm ${mode === 'ignore' ? 'pri' : ''}" onclick="sgAct('${c.id}','ignore')">忽略</button>
      <button class="btn sm" onclick="sgLater('${c.id}')">稍後</button></div>
    ${sgCandForm(c)}</div>`;
}
function sgMaybeSection() {
  const open = sgOpenCands(), later = SG.cands.filter(c => c.st === 'later').length;
  if (!open.length && !later) return '';
  const bulk = SG.open && SG.open.id === '*';
  return `<section class="sg-maybe" id="sgMaybe">
    <div class="sg-row"><b>潛在訊號 · 待你確認</b><span class="sg-meta">${open.length} 則 · 不擋收工、不計入徽章 · 只留在這個分頁</span><span class="sp"></span>
      ${later ? `<button class="btn sm" onclick="sgShowLater()">稍後再看的 ${later} 則</button>` : ''}${open.length > 1 ? `<button class="btn sm ${bulk ? 'pri' : ''}" onclick="sgAct('*','ignore')">全部忽略</button>` : ''}</div>
    ${bulk ? `<div class="sg-form"><div class="sg-row"><span class="sg-meta">這 ${open.length} 則為什麼都忽略</span>${SG_IGNORE.map(r => `<button class="btn sm" onclick="sgIgnore('*','${r}')">${r}</button>`).join('')}<span class="sp"></span><button class="btn sm" onclick="sgCancel()">取消</button></div></div>` : ''}
    ${open.map(sgCandCard).join('')}</section>`;
}
function sgSourcePanel() {
  const line = sgLine(), row = (k, v) => `<div class="sg-kv"><span>${k}</span>${v}</div>`;
  const off = '<span class="chip c-w">尚未開通</span>', dash = '<span class="sg-meta">—</span>', on = line.configured && line.verified;
  const mine = line.me.state === 'linked' ? (line.me.pushEnabled ? '<span class="chip c-o">已連結</span>' : '<span class="chip c-d">推播失效</span>') : line.me.state === 'pending' ? '<span class="chip c-w">等你確認</span>' : '<span class="chip c-n">未連結</span>';
  return panel('來源', '', `<div class="sg-kvs">
      ${row('LINE 官方帳號', on ? '<span class="chip c-o">已連線</span>' : off)}
      ${row('我的 LINE', line.configured ? mine : dash)}
      ${row('已綁定群組', '<span class="sg-meta">尚未開放</span>')}
      ${row('個人推播', line.quota ? `<span class="sg-meta">本月 ${line.quota.used}${line.quota.limit == null ? '' : '／' + line.quota.limit} 則</span>` : dash)}
    </div>
    <div class="sg-side-a"><button class="btn sm" onclick="nav('signal',1)">${svg('message', 12)} 分析一段對話</button><button class="btn sm" onclick="nav('signal',3)">來源與推播 ${svg('goto', 11)}</button></div>`);
}
function sgInbox() {
  const all = buildSignals();
  return guide('<b>兩層訊號。</b>確定訊號從日誌與紀錄推導，一定成立；潛在訊號來自 LINE 對話的判讀，可能是錯的，所以在你採納之前不產生任何義務。')
    + (space === 'team' ? rqBoard() + '<div style="height:14px"></div>' : '')
    + `<div class="g g21"><div class="g" style="align-content:start">${sgSurePanel(all)}${sgMaybeSection()}</div><div class="g" style="align-content:start">${sgSourcePanel()}</div></div>`;
}

/* ---------- 已處理 ---------- */

function sgHandled() {
  const done = buildSignals().filter(s => s.done), handled = SG.cands.filter(c => c.st !== 'open' && c.st !== 'later');
  const label = { adopted: ['採納', 'c-o'], merged: ['併入', 'c-p'], ignored: ['忽略', 'c-n'] };
  const rows = handled.map(c => {
    const it = c.target && DB.issues.find(i => i.id === c.target);
    return `<tr><td><span class="chip ${label[c.st][1]}">${label[c.st][0]}</span></td><td>${SG_KIND[c.kind][0]}</td><td class="sg-td-q">${esc(c.quote)}</td><td class="sg-meta">${esc(c.group)} · ${esc(c.speaker)}</td>
      <td>${it ? `<button class="sg-link" onclick="openDrawer('issue','${it.id}')">${esc(it.t)}</button>` : c.st === 'ignored' ? esc(c.reason) : '<span class="sg-meta">任務已刪除</span>'}</td>
      <td class="sg-meta">${esc(c.handledAt.slice(5))}</td><td>${c.st === 'ignored' ? `<button class="btn sm" onclick="sgReopen('${c.id}')">${svg('undo', 11)} 放回待確認</button>` : ''}</td></tr>`;
  }).join('');
  return `<div class="g">${panel('確定訊號', done.length + ' 則已處理', done.length ? done.map(sgSureRow).join('') : '<div class="empty">這一次開啟後還沒有標記已處理的訊號</div>', '', true)}
    ${panel('潛在訊號', handled.length + ' 則已分流', handled.length ? `<div class="sg-scroll"><table class="tbl"><thead><tr><th>結果</th><th>種類</th><th>原話</th><th>來源</th><th>去處／原因</th><th>時間</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<div class="empty">還沒有分流過的潛在訊號</div>', '', true)}</div>`;
}

/* ---------- 對話分析 ---------- */

function sgSteps(n, labels) {
  return `<div class="sg-steps">${labels.map((t, i) => `<span class="${i < n ? 'done' : i === n ? 'on' : ''}">${i < n ? svg('check', 11) : i + 1} ${t}</span>`).join('')}</div>`;
}
function sgAnalysisEmpty() {
  return sgSteps(0, ['選取', '去識別化', '確認', '送出'])
    + panel('選一段對話', '', `<div class="sg-load">
      <textarea id="sgRaw" rows="7" placeholder="貼上 LINE 聊天記錄。&#10;在 LINE 群組的選單 →「其他設定」→「傳送聊天記錄」可以匯出成文字檔。" oninput="SG.an.raw=this.value">${esc(SG.an.raw)}</textarea>
      <div class="sg-row"><button class="btn pri" onclick="sgLoad(SG.an.raw)">讀取這段對話</button>
        <label class="btn">${svg('paperclip', 12)} 選擇 .txt 檔<input type="file" accept=".txt,text/plain" hidden onchange="sgFile(this)"></label>
        ${initialState.mode === 'showcase' ? `<button class="btn" onclick="sgLoad(sgDemoText(),true)">載入示範對話</button>` : ''}
        <span class="sp"></span><span class="sg-meta">${svg('lock', 11)} 只留在這個分頁，不會上傳、不會保存</span></div></div>`)
    + sgRunsPanel();
}
function sgSegs(m) {
  return m.segments.map(s => s.mask
    ? `<button class="sg-mk ${s.mask.restored ? 'off' : ''}" title="${s.mask.restored ? '已還原，點一下重新遮蔽' : esc(cvMaskLabels[s.mask.kind]) + '，點一下還原'}" onclick="sgToggle('restored','${s.mask.key}')">${esc(s.text)}</button>`
    : s.suspect ? (SG.an.kept.includes(s.text) ? esc(s.text) : `<button class="sg-sus" title="疑似人名，點一下遮蔽" data-t="${esc(s.text)}" onclick="sgAddTerm(this.dataset.t,'person')">${esc(s.text)}</button>`) : sgText(s.text)).join('');
}
function sgPairRow(m) {
  const skipped = m.type === 'system' || m.type === 'sticker', raw = SG.an.byId[m.id];
  const left = `<div class="sg-orig ${m.sent ? '' : 'out'}"><div class="sg-who"><span>${esc(m.speaker || '系統')}</span><span class="sg-meta">${esc(sgWhen(m.at))}</span>${skipped ? '' : `<button class="sg-x" onclick="sgToggle('excluded','${m.id}')">${m.excluded ? svg('undo', 11) + ' 放回' : svg('x', 11) + ' 排除'}</button>`}</div><div class="sg-txt">${sgText(raw ? raw.text : '')}</div></div>`;
  const right = m.sent
    ? `<div class="sg-sent"><div class="sg-who"><span class="sg-lbl">${esc(m.speakerLabel)}</span><span class="sg-meta">${m.index}</span></div><div class="sg-txt">${sgSegs(m)}</div></div>`
    : `<div class="sg-sent out"><span class="sg-meta">${m.excluded ? '已排除，不送出' : '貼圖與系統訊息不送出'}</span></div>`;
  return left + right;
}
function sgAnalysisLoaded() {
  const an = SG.an, slice = sgSlice(), over = sgOverLimit(slice), res = over ? null : sgDeid();
  const confirmed = !!(res && an.confirmed && an.confirmed.fp === res.fingerprint);
  const stale = !!(res && an.confirmed && !confirmed);
  const leaks = res ? cvFindLeaks(res) : [];
  const head = panel(esc(an.title), an.demo ? '示範對話' : `${an.msgs.length} 則 · ${an.speakers.length} 位發話者`, `<div class="sg-fields">
      <label>從<input type="date" value="${esc(an.from)}" min="${esc(an.min)}" max="${esc(an.max)}" onchange="sgRange('from',this.value)"></label>
      <label>到<input type="date" value="${esc(an.to)}" min="${esc(an.min)}" max="${esc(an.max)}" onchange="sgRange('to',this.value)"></label>
      <label class="wide">歸到哪個專案<select onchange="SG.an.proj=this.value">${sgProjOptions(an.proj)}</select></label></div>
    <div class="sg-speakers">${an.speakers.map((n, i) => `<span class="sg-sp"><span class="sg-sp-n">${esc(n)}</span><select aria-label="${esc(n)} 屬於哪一邊" onchange="sgSide(${i},this.value)">${SG_SIDES.map(([v, t]) => `<option value="${v}" ${an.sides[n] === v ? 'selected' : ''}>${t}</option>`).join('')}</select></span>`).join('')}</div>
    <div class="sg-row sg-bar"><span class="sg-meta">這段區間 <b>${slice.length}</b> 則${res ? ` · 會送出 <b>${res.stats.sent}</b> 則、約 <b>${res.stats.chars}</b> 字` : ''}</span><span class="sp"></span>
      <button class="btn sm" onclick="sgDetect()" ${over ? 'disabled' : ''}>${svg('search', 12)} 用規則找出潛在訊號</button>
      ${an.found ? `<button class="sg-link" onclick="nav('signal',0)">找到 ${an.found.total} 則，在待處理 ${svg('goto', 11)}</button>` : '<span class="sg-meta">在這台裝置上判讀，不送出</span>'}</div>
    ${over ? `<div class="sg-warn">${svg('warn', 13)} ${over}</div>` : ''}`, `<button class="btn sm" onclick="sgReset()">換一段對話</button>`);
  if (!res) return sgSteps(0, ['選取', '去識別化', '確認', '送出']) + head + sgRunsPanel();

  const kinds = Object.keys(res.stats.masks).map(k => `${cvMaskLabels[k]} ${res.stats.masks[k]}`).join(' · ');
  const sus = sgPending(res);
  const review = `<div class="panel"><div class="panel-h"><h3>去識別化</h3><span class="sub">已遮蔽 ${res.stats.maskTotal} 處，請確認</span><span class="sp"></span>
      <label class="sg-check"><input type="checkbox" ${an.keepAmounts ? 'checked' : ''} onchange="sgKeepAmounts(this.checked)"> 保留金額</label></div>
    <div class="sg-sum">
      <div class="sg-row"><span class="sg-meta">${kinds || '沒有遮蔽任何地方'}${res.stats.restored ? ` · 你還原了 ${res.stats.restored} 處` : ''}${res.stats.excluded ? ` · 排除 ${res.stats.excluded} 則` : ''}${res.stats.placeholders ? ` · ${res.stats.placeholders} 個附件只留佔位` : ''}</span></div>
      ${sus.length ? `<div class="sg-row sg-suspects"><span class="chip c-w">${svg('warn', 11)} 疑似人名 ${sus.length} 個還沒處理</span>${sus.map(t => `<span class="sg-susp"><button class="sg-sus" title="遮蔽" data-t="${esc(t)}" onclick="sgAddTerm(this.dataset.t,'person')">${esc(t)}</button><button class="sg-keep" data-t="${esc(t)}" onclick="sgKeep(this.dataset.t)">不是人名</button></span>`).join('')}<span class="sg-meta">點名字遮蔽，或標成不是人名。都決定了才能確認</span></div>` : ''}
      <div class="sg-row"><input type="text" id="sgPick" class="sg-pick" value="${esc(an.pick)}" placeholder="補遮蔽：輸入，或在左邊的原文選取文字" oninput="SG.an.pick=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault();sgAddTerm(SG.an.pick,SG.an.pickKind)}">
        <select aria-label="這是什麼" onchange="SG.an.pickKind=this.value">${[['person', '人名'], ['company', '公司'], ['term', '其他']].map(([v, t]) => `<option value="${v}" ${an.pickKind === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <button class="btn sm" onclick="sgAddTerm(SG.an.pick,SG.an.pickKind)">${svg('plus', 12)} 遮蔽</button>
        ${an.terms.map((t, i) => `<span class="sg-term">${esc(t.text)}<button aria-label="移除 ${esc(t.text)}" onclick="sgDropTerm(${i})">${svg('x', 10)}</button></span>`).join('')}</div>
    </div>
    <div class="sg-pair"><div class="sg-th">原文</div><div class="sg-th">將送出的版本</div>${res.messages.map(sgPairRow).join('')}</div>
    <div class="sg-confirm">
      ${leaks.length ? `<div class="sg-warn">${svg('warn', 13)} 送出內容裡還有已遮蔽的原字：${leaks.map(esc).join('、')}。不能確認</div>` : ''}
      ${stale ? `<div class="sg-warn">${svg('warn', 13)} 確認之後內容有變動，要重新確認</div>` : ''}
      <div class="sg-row"><span class="sg-meta">${confirmed ? `${svg('check', 12)} ${esc(person(an.confirmed.by))} 於 ${esc(an.confirmed.at.slice(5))} 確認了這一份（指紋 ${esc(res.fingerprint.slice(0, 8))}）` : '右欄就是會送出的全文，沒有另一份看不到的內容。規則抓不到字典裡沒有的名字，請逐則看過。'}</span><span class="sp"></span>
        <button class="btn pri" onclick="sgConfirm()" ${confirmed || leaks.length || sus.length ? 'disabled' : ''}>${svg('check', 12)} ${confirmed ? '已確認' : '已檢查，確認這一份'}</button></div>
      <div class="sg-row sg-locked">${svg('lock', 13)}<span><b>送出 AI 分析尚未開放。</b>還沒指定模型供應商，所以確認過的這一份不會離開這個分頁。</span></div>
    </div></div>`;
  return sgSteps(confirmed ? 3 : 1, ['選取', '去識別化', '確認', '送出']) + head + '<div style="height:12px"></div>' + review + sgRunsPanel();
}
function sgRunsPanel() {
  if (!SG.runs.length) return '';
  const adopted = keys => SG.cands.filter(c => keys.includes(c.id) && c.st === 'adopted').length;
  return '<div style="height:12px"></div>' + panel('這一次的分析紀錄', '只留在這個分頁', `<div class="sg-scroll"><table class="tbl"><thead><tr><th>時間</th><th>動作</th><th>對話</th><th>區間</th><th>則數</th><th>遮蔽</th><th>找到</th><th>已採納</th><th>誰</th></tr></thead><tbody>${SG.runs.map(r => `<tr><td class="sg-meta">${esc(r.at.slice(5))}</td><td>${r.type}</td><td>${esc(r.group)}</td><td class="sg-meta">${esc(sgWhen(r.from) || '—')}${r.to && r.to !== r.from ? ' – ' + esc(sgWhen(r.to)) : ''}</td><td>${r.sent}</td><td>${r.found == null ? r.masks : '—'}</td><td>${r.found == null ? '—' : r.found}</td><td>${r.found == null ? '—' : adopted(r.keys)}</td><td>${esc(person(r.by))}</td></tr>`).join('')}</tbody></table></div>`, '', true);
}
function sgAnalysis() { return SG.an.msgs.length ? sgAnalysisLoaded() : sgAnalysisEmpty(); }

/* 在原文欄選取文字 → 帶進「補遮蔽」那一格。只填值、不重繪，選取才不會被打斷。 */
listen('mouseup', e => {
  if (S.wb !== 'signal' || S.tab !== 1 || !e.target.closest || !e.target.closest('.sg-orig')) return;
  const sel = selection(), t = String(sel ? sel.toString() : '').trim(), inp = root.querySelector('#sgPick');
  if (inp && t.length >= 2 && t.length <= 40 && !t.includes('\n')) { SG.an.pick = t; inp.value = t; }
});

/* ---------- 來源與推播 ---------- */

function sgWho(me) {
  const pic = typeof me.pictureUrl === 'string' && me.pictureUrl.startsWith('https://') ? `<img class="sg-pic" src="${esc(me.pictureUrl)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  return `<span class="sg-who-line">${pic}<b>${esc(me.displayName || '（LINE 沒有提供名稱）')}</b></span>`;
}
/** 「我的 LINE」的四個狀態。每個狀態只放現在能按的東西。 */
function sgMyLine(line) {
  const me = line.me, busy = SG.lineBusy, btn = (action, label, cls) => `<button class="btn sm ${cls || ''}" onclick="sgLineAct('${action}')" ${busy ? 'disabled' : ''}>${busy === action ? '處理中…' : label}</button>`;
  if (!line.live) return [`<div class="note">這個環境是預覽模式，沒有 LINE 連結。</div>`, '<span class="chip c-n">未連結</span>'];
  if (!line.configured) return [`<div class="note">官方帳號開通後，在這裡連結你的 LINE，才會收到個人推播。只推給已連結的成員本人，不會推進任何群組。</div>`, '<span class="chip c-n">未連結</span>'];
  if (!line.canBind) return [`<div class="note">共用帳號不代表任何一個人，不能連結 LINE。請用自己的帳號登入。</div>`, '<span class="chip c-n">不適用</span>'];
  if (me.state === 'linked') {
    return [`<div class="sg-kvs">
        <div class="sg-kv"><span>LINE 帳號</span>${sgWho(me)}</div>
        <div class="sg-kv"><span>推播</span>${me.pushEnabled ? '<span class="chip c-o">正常</span>' : '<span class="chip c-d">失效</span>'}</div>
        ${me.linkedAt ? `<div class="sg-kv"><span>連結於</span><span class="sg-meta">${esc(sgDay(me.linkedAt))}</span></div>` : ''}</div>
      ${me.pushEnabled ? '' : `<div class="sg-warn">${svg('warn', 13)} 你封鎖了官方帳號，推播送不到。在 LINE 解除封鎖就會恢復。</div>`}
      <div class="sg-side-a">${me.pushEnabled ? btn('test', svg('bell', 12) + ' 傳一則測試推播') : ''}
        ${SG.lineAsk === 'unlink' ? `<span class="sg-meta">解除後就收不到推播</span>${btn('unlink', '確定解除', 'dgr')}<button class="btn sm" onclick="sgLineAsk('unlink')">取消</button>` : `<button class="btn sm" onclick="sgLineAsk('unlink')" ${busy ? 'disabled' : ''}>解除連結</button>`}</div>`,
      me.pushEnabled ? '<span class="chip c-o">已連結</span>' : '<span class="chip c-d">推播失效</span>'];
  }
  if (me.state === 'pending') {
    return [`<div class="sg-ask"><div class="sg-meta">有人把你的代碼傳給了官方帳號。這是你的 LINE 帳號嗎？</div>${sgWho(me)}
        ${me.displayName ? '' : `<div class="sg-warn">${svg('warn', 13)} LINE 沒有提供這個帳號的名稱，沒辦法顯示給你核對。確定是你自己剛剛傳的代碼才按「是我」。</div>`}
        <div class="sg-side-a">${btn('confirm', svg('check', 12) + ' 是我，完成連結', 'pri')}${btn('reject', '不是我')}</div>
        <div class="sg-meta">不是你的帳號就按「不是我」—— 那代表代碼被別人拿去用了。${me.pendingExpiresAt ? `${esc(sgClock(me.pendingExpiresAt))} 前要確認。` : ''}</div></div>`,
      '<span class="chip c-w">等你確認</span>'];
  }
  if (me.state === 'code') {
    const code = SG.lineCode, id = line.bot && line.bot.basicId;
    return [`<ol class="sg-bind">
        <li>在手機的 LINE 加官方帳號好友${id ? `：搜尋 ID <b class="sg-code-s">${esc(id)}</b>，或<a class="sg-link" href="https://line.me/R/ti/p/${encodeURIComponent(id)}" target="_blank" rel="noopener noreferrer">開啟加好友連結</a>` : ''}</li>
        <li>在和官方帳號的一對一聊天室，傳這組代碼${code ? `<div class="sg-code">${esc(code.code)}</div>` : '<div class="sg-meta">代碼只顯示一次，重新整理後看不到了。請重新產生。</div>'}</li>
        <li>回到這一頁，確認顯示的是你的 LINE 帳號</li></ol>
      <div class="sg-side-a"><span class="sg-meta">${me.codeExpiresAt ? `${esc(sgClock(me.codeExpiresAt))} 前有效 · ` : ''}不要在群組裡傳，群組裡的代碼無效</span><span class="sp"></span>${btn('code', '重新產生代碼')}</div>`,
      '<span class="chip c-p">等待代碼</span>'];
  }
  return [`<div class="note">連結後才會收到個人推播。只推給你本人，不會推進任何群組。</div><div class="sg-side-a">${btn('code', svg('plus', 12) + ' 連結我的 LINE', 'pri')}</div>`, '<span class="chip c-n">未連結</span>'];
}
function sgSources() {
  const line = sgLine(), late = rqLate().length, mine = rqToMe().filter(r => rqState(r) !== 'late').length, sure = buildSignals().filter(s => !s.done).length, maybe = sgOpenCands().length;
  const step = (ok, t, d) => `<div class="sg-ck ${ok ? 'ok' : ''}"><i>${ok ? svg('check', 10) : ''}</i><div><div>${t}</div>${d ? `<div class="sg-meta">${d}</div>` : ''}</div></div>`;
  const preview = [late ? `逾期 ${late} 件` : '', mine ? `待我回覆 ${mine} 件` : '', sure ? `確定訊號 ${sure} 則` : '', maybe ? `${maybe} 則 LINE 訊號待確認` : ''].filter(Boolean);
  const hook = line.live && typeof location !== 'undefined' ? location.origin + '/api/line/webhook' : '';
  const on = line.configured && line.verified, [myBody, myChip] = sgMyLine(line);
  const team = line.team.length ? panel('成員', '誰已經連結', `<div class="sg-kvs">${line.team.map(t => `<div class="sg-kv"><span>${esc(person(t.actor))}</span>${t.state === 'linked' ? (t.pushEnabled ? '<span class="chip c-o">已連結</span>' : '<span class="chip c-d">推播失效</span>') : '<span class="chip c-n">未連結</span>'}</div>`).join('')}</div>`) : '';
  return `<div class="g g21"><div class="g" style="align-content:start">
      ${panel('LINE 官方帳號', line.bot && line.bot.displayName ? esc(line.bot.displayName) : '', `<div class="sg-cks">
        ${step(true, '方向已定', '只用 LINE；成員用一次性代碼加網站確認連結；群組在網站上綁到專案')}
        ${step(true, '授權邊界、群組揭露文字與保留期限已核准', '2026-10-13')}
        ${step(line.configured, '官方帳號的密鑰已放進這個環境', line.configured ? '' : '等 Owner 本人操作：在 LINE Developers 建立 Messaging API channel，把 channel secret 與 access token 設成環境變數')}
        ${step(line.verified, 'webhook 驗證通過', line.verified ? '最近一次收到 ' + esc(sgDay(line.lastWebhookAt)) : hook ? '在 LINE 後台填入 webhook URL 並按 Verify：<span class="sg-code-s">' + esc(hook) + '</span>' : '密鑰設定後才會開始')}</div>`, `<span class="chip ${on ? 'c-o' : 'c-w'}">${on ? '已連線' : '尚未開通'}</span>`)}
      ${panel('群組', '尚未開放', `<div class="note">之後把官方帳號邀進 LINE 群，新的群組會出現在這裡等你綁到專案。一個專案可以綁多個群，一個群只屬於一個專案。現在官方帳號被拉進群會自動離開，不保存任何群組訊息。</div>
        <div class="sg-side-a"><button class="btn sm" onclick="nav('signal',1)">${svg('message', 12)} 現在先用匯出檔分析一段對話</button></div>`)}
    </div><div class="g" style="align-content:start">
      ${panel('我的 LINE', '', myBody, myChip)}
      ${team}
      ${panel('推播預覽', '每日 09:00 與 18:00', `<div class="tg"><div class="hd">${svg('bell', 12)} 圓展 OS</div><b>${TODAY.slice(5).replace('-', '/')} 待處理</b><br>${preview.map(t => '• ' + t).join('<br>') || '• 沒有需要注意的事'}</div>
        <div class="note" style="margin-top:8px">每日摘要尚未啟用，這是之後會收到的樣子。潛在訊號只推數量，不推內文。${line.quota ? `本月已用 ${line.quota.used}${line.quota.limit == null ? '' : '／' + line.quota.limit} 則。` : ''}</div>`)}
    </div></div>`;
}

VIEWS.signal = tab => {
  if (tab === 0 || tab === 3) sgLineEnsure();
  return tab === 1 ? sgAnalysis() : tab === 2 ? sgHandled() : tab === 3 ? sgSources() : sgInbox();
};

/* 示範模式：讓待處理頁一開始就看得到兩層訊號長什麼樣。真實資料模式下這裡什麼都不做。 */
if (initialState.mode === 'showcase') {
  const demo = sgParse(sgDemoText(), true);
  if (demo) sgDetectInto(demo.msgs, demo.sides, demo.title, demo.proj);
}
