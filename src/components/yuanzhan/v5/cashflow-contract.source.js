/* ==================================================================
   洞察 · 合約金流（需求一：專案金流視角）

   金流原本六張帳務表全部只記錄「已發生」的錢。這一面補的是另一半：
   合約承諾了、但還沒發生的錢。

     OperatingContract      合約（總額、月結天數、條文）
     OperatingContractTerm  期款（第幾期、金額、預計收款、實際收款）

   三個刻意的規則，每一個都有它的反面被否決過：

   1. 期款的 amount 是權威，pct 只是建立時的輔助值。
      改合約總額不回算已存在的期款 —— 否則部分收款、折讓、匯差都對不上。

   2. 推演不用原始的預計收款日，用「該客戶的付款落差中位數」平移過的日期。
      到期日是合約寫的，實際到帳是客戶決定的。沒有自己的歷史就退回全公司中位數，
      並在畫面上標明是借來的。

   3. 逾期的期款不平移進未來任何一個月。
      「逾期了就改估這個月會收到」會讓推演永遠樂觀，而且每過一個月自動再樂觀一次。
      逾期只出現在催款清單，以及期款燈的硬門檻。

   燈號是兩顆不是一顆：帳戶燈量現在有多少現金（只認已勾稽），期款燈量收帳線斷沒斷
   （只認合約承諾與客戶行為）。兩顆可以不同色，那個不同就是要看的訊息 ——
   合成成一個健康分數之後，「有錢但收帳斷」與「錢在路上還沒到」會得到同一個數字，
   而它們的動作剛好相反。
   ================================================================== */

if (!Array.isArray(DB.contracts)) DB.contracts = [];
if (!Array.isArray(DB.terms)) DB.terms = [];
if (!Array.isArray(DB.accounts)) DB.accounts = [];
if (!DB.cashConfig || typeof DB.cashConfig !== 'object') DB.cashConfig = {};

/* showcase 的示例資料放這裡，不放 v5-seed.js —— 那個檔案由 generate-yuanzhan-v5.mjs
   從 owner 的參考 HTML 重新產生，寫進去下一次生成就沒了。
   與 extensions.source.js 對 DB.payroll／DB.policy 的作法相同：只在 showcase 掛上，
   database 與 empty 模式一個字都不注入（ARC-042 §8）。 */
if (initialState.mode === 'showcase' && !DB.contracts.length) {
  DB.contracts = [
    { id: 'CT-004', p: 'PRJ-2026-004', total: 300000, termsDays: 30, clause: '§9.1', signedOn: '2026-08-01', st: 'active' },
    { id: 'CT-007', p: 'PRJ-2026-007', total: 480000, termsDays: 60, clause: '§9.1', signedOn: '2026-07-10', st: 'active' }
  ];
  DB.terms = [
    { id: 'TM-004-1', c: 'CT-004', seq: 1, label: '簽約款', amount: 90000, pct: 30, trigger: 'date', ms: '', expectedOn: '2026-08-10', invoicedOn: '2026-08-05', settledOn: '2026-08-14', st: 'settled', txn: '' },
    { id: 'TM-004-2', c: 'CT-004', seq: 2, label: '28 帳號導入完成', amount: 120000, pct: 40, trigger: 'milestone', ms: '導入完成', expectedOn: '2026-09-05', invoicedOn: '2026-09-01', settledOn: '2026-09-08', st: 'settled', txn: 'T3' },
    { id: 'TM-004-3', c: 'CT-004', seq: 3, label: '導入後 30 日成效報告', amount: 90000, pct: 30, trigger: 'milestone', ms: '成效報告', expectedOn: '2026-10-31', invoicedOn: '', settledOn: '', st: 'pending', txn: '' },
    { id: 'TM-007-1', c: 'CT-007', seq: 1, label: '首期款', amount: 180000, pct: 37, trigger: 'date', ms: '', expectedOn: '2026-08-20', invoicedOn: '2026-08-12', settledOn: '2026-08-20', st: 'settled', txn: 'T9' },
    { id: 'TM-007-2', c: 'CT-007', seq: 2, label: '介面 refactor 驗收', amount: 120000, pct: 25, trigger: 'milestone', ms: 'refactor 驗收', expectedOn: '2026-10-05', invoicedOn: '2026-09-08', settledOn: '', st: 'invoiced', txn: '' },
    { id: 'TM-007-3', c: 'CT-007', seq: 3, label: 'tenant test 通過', amount: 100000, pct: 21, trigger: 'milestone', ms: 'tenant test', expectedOn: '2026-11-15', invoicedOn: '', settledOn: '', st: 'pending', txn: '' },
    { id: 'TM-007-4', c: 'CT-007', seq: 4, label: '可發布', amount: 80000, pct: 17, trigger: 'milestone', ms: '可發布', expectedOn: '2026-12-20', invoicedOn: '', settledOn: '', st: 'pending', txn: '' }
  ];
  DB.accounts = [{ id: 'ACC-1', name: '台新 909', kind: 'bank', opening: 468000, asOf: '2026-09-01' }];
  DB.cashConfig = {
    monthlyBurn: 100000, runwayGreen: 6, runwayAmber: 3,
    coverageGreen: 1.2, coverageAmber: 0.8, overdueAmber: 14, overdueRed: 30,
    probCHALLENGEABLE: 0.2, probPROPOSED: 0.5
  };
  // 內部產品沒有對外合約；卡片要說得出「不是忘了建，是本來就沒有」。
  const internal = DB.projects.find(p => p.id === 'PRJ-2026-009');
  if (internal) internal.internal = true;
}

/** 四狀態。對外是這四格；對內 p.status（商機／進行中／驗收中／已結案）維持子階段，
 *  獎金閘門③「內部驗收」仍然讀它，所以收斂不會讓那一項失效。 */
const CC_STAGES = [
  { id: 'CHALLENGEABLE', nm: '可挑戰', chip: 'c-n', sub: ['商機'] },
  { id: 'PROPOSED', nm: '已提案', chip: 'c-i', sub: [] },
  { id: 'WON', nm: '已接案', chip: 'c-p', sub: ['進行中', '驗收中'] },
  { id: 'CLOSED', nm: '已結案', chip: 'c-o', sub: ['已結案'] }
];
/** 確定性四層是序數不是類別：同一色相由深到淺，最淺那層再加斜線紋。 */
const CC_CERT = [
  ['settled', '已收', 'cc-l0'],
  ['invoiced', '已開票未收', 'cc-l1'],
  ['committed', '合約未開票', 'cc-l2'],
  ['weighted', '加權可能案', 'cc-l3']
];
const CC_DEFAULTS = {
  monthlyBurn: 0, runwayGreen: 6, runwayAmber: 3,
  coverageGreen: 1.2, coverageAmber: 0.8,
  overdueAmber: 14, overdueRed: 30,
  probCHALLENGEABLE: 0.2, probPROPOSED: 0.5
};

/* ---------- 日期：一律 UTC 錨定 ----------
   用本地時間解析 'YYYY-MM-DD' 再 toISOString() 會在 UTC+8 整批位移一天，
   連帶把推演的起始月算成當月。原型第一版就是這樣錯的。 */
function ccD(s) { return new Date(s + 'T00:00:00Z'); }
function ccDays(a, b) { return Math.round((ccD(b) - ccD(a)) / 864e5); }
function ccAdd(s, n) { const d = ccD(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function ccMonthsAhead(n) {
  const out = [], d = ccD(TODAY);
  d.setUTCDate(1);
  for (let i = 1; i <= n; i++) { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + i); out.push(x.toISOString().slice(0, 7)); }
  return out;
}
const ccMoLabel = m => Number(m.slice(5)) + ' 月' + (m.slice(0, 4) !== TODAY.slice(0, 4) ? ' ’' + m.slice(2, 4) : '');

/* ---------- 設定 ---------- */
function ccCfg(k) { const v = DB.cashConfig[k]; return v === undefined || v === null || v === '' ? CC_DEFAULTS[k] : Number(v); }
function ccBurn() { return ccCfg('monthlyBurn'); }
function ccHasAccount() { return DB.accounts.length > 0 && ccBurn() > 0; }
function ccProb(stage) {
  if (stage === 'WON' || stage === 'CLOSED') return 1;
  return ccCfg('prob' + stage);
}

/* ---------- 專案 ↔ 合約 ---------- */
function ccStageOf(p) {
  if (p.stage) return p.stage;
  const hit = CC_STAGES.find(s => s.sub.includes(p.status));
  return hit ? hit.id : 'CHALLENGEABLE';
}
const CT = id => DB.contracts.find(c => c.id === id);
const ccContractOf = pid => DB.contracts.find(c => c.p === pid);
const ccTermsOf = cid => DB.terms.filter(t => t.c === cid).sort((a, b) => a.seq - b.seq);
const ccProjectOfTerm = t => { const c = CT(t.c); return c ? P(c.p) : null; };
/** 成員只看得到自己參與的專案（§9.6）；公司整體資金是負責人的（§18）。 */
const ccVisibleProjects = () => DB.projects.filter(p => isOwner() || (typeof myProjects === 'function' && myProjects().includes(p.id)));

/* ---------- 客戶付款落差 ----------
   settledOn − expectedOn 的中位數。研究（AR forecasting）的結論是到期日本身
   不足以預測現金：B2B 平均逾期 6–10 天，而且每個客戶的習慣不同。 */
function ccLagList(client) {
  return DB.terms
    .filter(t => t.settledOn && t.expectedOn && ccProjectOfTerm(t)?.client === client)
    .map(t => ccDays(t.expectedOn, t.settledOn))
    .sort((a, b) => a - b);
}
function ccMedian(list) {
  if (!list.length) return 0;
  const n = list.length;
  return n % 2 ? list[(n - 1) / 2] : Math.round((list[n / 2 - 1] + list[n / 2]) / 2);
}
function ccHouseLag() {
  return ccMedian(DB.terms.filter(t => t.settledOn && t.expectedOn).map(t => ccDays(t.expectedOn, t.settledOn)).sort((a, b) => a - b));
}
/** 少於 3 筆就不宣稱這是「這個客戶的」習慣，退回全公司中位數並標明。 */
function ccLag(pid) {
  const p = P(pid);
  const own = p ? ccLagList(p.client) : [];
  if (own.length >= 3) return { lag: ccMedian(own), n: own.length, house: false };
  return { lag: ccHouseLag(), n: own.length, house: true };
}

/* ---------- 期款狀態 ---------- */
function ccOverdue(t) {
  if (t.settledOn) return 0;
  return t.expectedOn && t.expectedOn < TODAY ? ccDays(t.expectedOn, TODAY) : 0;
}
function ccTermState(t) {
  if (t.settledOn) return 'settled';
  if (ccOverdue(t) > 0) return 'overdue';
  return t.invoicedOn ? 'invoiced' : 'pending';
}
const ccOverdueTerms = () => DB.terms
  .filter(t => ccOverdue(t) > 0 && ccVisibleProjects().some(p => p.id === CT(t.c)?.p))
  .sort((a, b) => ccOverdue(b) - ccOverdue(a));

/** 一筆期款在推演裡的落點與確定性；不進推演就回 null。 */
function ccProjected(t) {
  const c = CT(t.c); if (!c) return null;
  const p = P(c.p); if (!p || p.internal) return null;
  if (t.settledOn) return null;          // 已收的錢在帳戶餘額裡，不在流入
  if (ccOverdue(t) > 0) return null;     // 逾期不平移進未來
  const stage = ccStageOf(p);
  const prob = ccProb(stage);
  if (!prob) return null;
  const lag = ccLag(c.p).lag;
  const land = ccAdd(t.expectedOn, lag);
  return {
    month: land.slice(0, 7), land, term: t, prob, lag,
    raw: t.amount, amount: Math.round(t.amount * prob),
    cert: stage === 'WON' || stage === 'CLOSED' ? (t.invoicedOn ? 'invoiced' : 'committed') : 'weighted'
  };
}
/** 已勾稽交易的累計 —— 帳戶燈只認這個，不認應收。 */
function ccCashNow() {
  const base = DB.accounts.reduce((a, x) => a + (Number(x.opening) || 0), 0);
  const since = DB.accounts.reduce((a, x) => (!a || (x.asOf && x.asOf < a) ? x.asOf : a), '');
  const moved = DB.txns
    .filter(t => cfMatched(t) && (!since || t.d >= since))
    .reduce((a, t) => a + t.amt, 0);
  return base + moved;
}
function ccForecast(n) {
  const rows = ccMonthsAhead(n).map(m => ({ m, layers: {}, in: 0, out: ccBurn(), items: [] }));
  const byM = {}; rows.forEach(r => { byM[r.m] = r; });
  DB.terms.forEach(t => {
    const pr = ccProjected(t); if (!pr) return;
    const r = byM[pr.month]; if (!r) return;
    r.layers[pr.cert] = (r.layers[pr.cert] || 0) + pr.amount;
    r.in += pr.amount; r.items.push(pr);
  });
  let bal = ccCashNow();
  rows.forEach(r => { r.net = r.in - r.out; bal += r.net; r.bal = bal; });
  return rows;
}

/* ---------- 兩顆燈 ---------- */
const ccTone = (v, g, a) => v >= g ? 'g' : v >= a ? 'a' : 'r';
const ccWord = t => t === 'g' ? '綠' : t === 'a' ? '黃' : '紅';
const ccChip = t => t === 'g' ? 'c-o' : t === 'a' ? 'c-w' : 'c-d';
const ccRank = t => t === 'g' ? 2 : t === 'a' ? 1 : 0;

function ccAccountLight() {
  if (!ccHasAccount()) {
    return {
      unset: true, nm: '帳戶 · 可存活月數',
      why: [DB.accounts.length ? '尚未填每月支出估值' : '尚未設定現金帳戶與期初餘額'],
      act: '設定帳戶與支出估值'
    };
  }
  const burn = ccBurn(), cash = ccCashNow();
  const now = cash / burn;
  const f = ccForecast(ccHorizon());
  const low = f.reduce((a, b) => b.bal < a.bal ? b : a, f[0]);
  const lowM = low.bal / burn;
  const tone = ccTone(Math.min(now, lowM), ccCfg('runwayGreen'), ccCfg('runwayAmber'));
  const why = [
    '可動用現金 ' + nt(cash) + ' ÷ 每月支出 ' + nt(burn),
    '推演最低點 ' + ccMoLabel(low.m) + ' ' + nt(low.bal) + '（' + lowM.toFixed(1) + ' 個月）'
  ];
  const tNow = ccTone(now, ccCfg('runwayGreen'), ccCfg('runwayAmber'));
  const tLow = ccTone(lowM, ccCfg('runwayGreen'), ccCfg('runwayAmber'));
  if (tNow !== tLow) why.push('今天 ' + now.toFixed(1) + ' 個月（' + ccWord(tNow) + '）→ ' + ccHorizon() + ' 個月後 ' + lowM.toFixed(1) + ' 個月（' + ccWord(tLow) + '）');
  return { tone, nm: '帳戶 · 可存活月數', v: now.toFixed(1), unit: '個月', why, low };
}
function ccTermLight() {
  if (!DB.terms.length) return { unset: true, nm: '期款 · 未來 3 月覆蓋率', why: ['尚無合約期款'], act: '建立合約' };
  if (!ccBurn()) return { unset: true, nm: '期款 · 未來 3 月覆蓋率', why: ['尚未填每月支出估值，算不出覆蓋率'], act: '設定支出估值' };
  const f = ccForecast(3);
  const inc = f.reduce((a, r) => a + r.in, 0), out = f.reduce((a, r) => a + r.out, 0);
  const cov = out ? inc / out : 0;
  let tone = ccTone(cov, ccCfg('coverageGreen'), ccCfg('coverageAmber'));
  const why = ['未來 3 個月加權預期入帳 ' + nt(inc) + ' ÷ 同期支出 ' + nt(out)];
  const od = ccOverdueTerms();
  const worst = od.reduce((a, t) => Math.max(a, ccOverdue(t)), 0);
  /* 硬門檻覆寫顏色：一筆卡住的尾款就是兩人公司真正的死法，
     不能被一個好看的平均蓋過去。 */
  if (worst >= ccCfg('overdueRed')) { tone = 'r'; why.push('硬門檻：' + od.length + ' 筆逾期，最久 ' + worst + ' 天（≥' + ccCfg('overdueRed') + ' 天直接紅）'); }
  else if (worst >= ccCfg('overdueAmber')) { if (tone === 'g') tone = 'a'; why.push('硬門檻：' + od.length + ' 筆逾期，最久 ' + worst + ' 天（≥' + ccCfg('overdueAmber') + ' 天至少黃）'); }
  else why.push('沒有逾期超過 ' + ccCfg('overdueAmber') + ' 天的期款');
  return { tone, nm: '期款 · 未來 3 月覆蓋率', v: cov.toFixed(2), unit: '×', why, od };
}

/* ---------- 畫面狀態 ---------- */
function ccHorizon() { return S.ccHorizon || 6; }
function ccSetHorizon(n) { S.ccHorizon = n; render(); }
function ccSel(id) { S.ccSel = id || null; S.ccDrill = null; render(); }
function ccDrill(k) { S.ccDrill = k || null; S.ccSel = null; render(); }
function ccSetView(v) { S.ccView = v; render(); }
function ccView() { return S.ccView || 'chart'; }

/* ---------- 燈卡 ---------- */
function ccLightCard(L, which) {
  const icon = svg(which === 'account' ? 'wallet' : 'file', 13);
  if (L.unset) {
    return `<div class="cc-light"><div class="cc-light-h"><span class="cc-light-nm">${icon}${L.nm}</span></div>
      <div class="cc-light-unset">${esc(L.why[0])}</div>
      <div class="cc-why"><i>不推測。沒有來源就不給數字。</i></div>
      <button class="btn sm" onclick="${which === 'account' ? 'ccCashForm()' : 'ccContractForm()'}">${esc(L.act)}</button></div>`;
  }
  const body = `<div class="cc-light-h"><span class="cc-light-nm">${icon}${L.nm}</span><span class="chip ${ccChip(L.tone)}">${svg(L.tone === 'g' ? 'check' : 'warn', 11)} ${ccWord(L.tone)}燈</span></div>
    <div class="cc-light-v">${L.v}<small>${L.unit}</small></div>
    <div class="cc-why">${L.why.map(w => `<i>${esc(w)}</i>`).join('')}</div>`;
  if (which === 'term') return `<button class="cc-light t-${L.tone} cc-clickable" onclick="ccDrill('overdue')">${body}<span class="cc-more">逾期清單 ${svg('chevronRight', 11)}</span></button>`;
  return `<div class="cc-light t-${L.tone}">${body}</div>`;
}
function ccDisagree(a, b) {
  if (a.unset || b.unset) return '';
  const pre = `帳戶${ccWord(a.tone)}、期款${ccWord(b.tone)}：`;
  let msg;
  if (a.tone === b.tone) {
    msg = `<b>${pre}兩顆燈同色。</b>現金與收帳線指向同一件事，這時候可以只看一個數字：`
      + (a.tone === 'g' ? '不必動作。' : a.tone === 'a' ? '看推演的最低點落在哪個月，那個月就是處理的截止日。' : '兩邊同時斷 —— 這是唯一該考慮外部資金或縮編的組合。');
  } else if (ccRank(a.tone) > ccRank(b.tone)) {
    msg = `<b>${pre}現金${a.tone === 'g' ? '還夠' : '還撐得住'}，但收帳線斷了。</b>今天不痛，痛的是下一季 —— 帳戶水位是過去成交的結果，期款才是未來的來源。動作在催款與補案子，不在省錢。`;
  } else {
    msg = `<b>${pre}錢在路上，但還沒到。</b>這是週轉問題不是接案問題。動作在讓期款提前（提早開票、縮短月結天數、談預收），不在多接一個案子 —— 新案子的錢來得更晚。`;
  }
  return `<div class="cc-say">${svg('bolt', 13)}<div>${msg}</div></div>`;
}

/* ---------- 四狀態 Overview ---------- */
function ccPipeline() {
  const ps = ccVisibleProjects();
  const cols = CC_STAGES.map(st => {
    const list = ps.filter(p => ccStageOf(p) === st.id);
    const open = list.flatMap(p => { const c = ccContractOf(p.id); return c ? ccTermsOf(c.id).filter(t => !t.settledOn) : []; });
    const raw = open.reduce((a, t) => a + t.amount, 0);
    const od = open.filter(t => ccOverdue(t) > 0).reduce((a, t) => a + t.amount, 0);
    const prob = ccProb(st.id);
    const meta = od ? `其中 ${nt(od)} 已逾期，不進推演`
      : prob === 1 ? '不打折進推演'
        : `加權 ${Math.round(prob * 100)}% → ${nt(Math.round((raw - od) * prob))}`;
    const body = list.length ? list.map(p => ccCard(p)).join('') : '<div class="cc-none">—</div>';
    return `<div class="cc-col"><div class="cc-col-h"><b>${st.nm}<span class="chip ${st.chip}">${list.length}</span></b>
      <span class="cc-sum">${raw ? '未收 ' + nt(raw) : '已清結'}</span><span class="cc-wt">${esc(meta)}</span></div>${body}</div>`;
  }).join('');
  return panel('專案金流 Overview', '四狀態 · 每案走到第幾期', `<div class="cc-pipe">${cols}</div>`, '', true);
}
function ccCard(p, plain) {
  const c = ccContractOf(p.id);
  if (!c || p.internal) {
    return `<div class="cc-card"><div class="cc-card-t">${esc(p.t)}</div><div class="cc-card-m"><span>${esc(p.client || '')}</span></div>
      <div class="cc-none">${p.internal ? '內部專案，無合約期款' : '尚無合約'}</div>
      ${isOwner() && !p.internal ? `<button class="btn sm" onclick="ccContractForm('${p.id}')">${svg('plus', 11)} 建合約</button>` : ''}</div>`;
  }
  const ts = ccTermsOf(c.id);
  const done = ts.filter(t => t.settledOn).length;
  const next = ts.find(t => !t.settledOn);
  const bars = ts.map(t => `<i class="cc-b ${ccTermState(t)}" title="第 ${t.seq} 期 ${esc(t.label)}"></i>`).join('');
  const od = ts.filter(t => ccOverdue(t) > 0);
  const lag = ccLag(p.id);
  let meta = `<span>${esc(p.client || '')}</span><span>·</span><span>第 ${Math.min(done + 1, ts.length)} / ${ts.length} 期</span>`;
  if (p.status) meta += `<span class="chip c-n">${esc(p.status)}</span>`;
  if (od.length) meta += `<span class="chip c-d">${svg('warn', 10)} 逾期 ${ccOverdue(od[0])} 天</span>`;
  let foot;
  if (!next) foot = '<div class="cc-none">全部期款已清結</div>';
  else if (ccOverdue(next) > 0) foot = `<div class="cc-next"><span>下一期 ${esc(next.label)}</span><b>${nt(next.amount)}</b></div>
      <div class="cc-next"><span class="cc-sub">預計 ${next.expectedOn} · 已逾期 ${ccOverdue(next)} 天</span><b class="cc-sub">不進推演</b></div>`;
  else {
    const prob = ccProb(ccStageOf(p));
    foot = `<div class="cc-next"><span>下一期 ${esc(next.label)}</span><b>${nt(next.amount)}</b></div>`
      + (prob < 1 ? `<div class="cc-next"><span class="cc-sub">加權 ${Math.round(prob * 100)}% 後進推演</span><b class="cc-sub">${nt(Math.round(next.amount * prob))}</b></div>` : '')
      + `<div class="cc-next"><span class="cc-sub">預計 ${next.expectedOn}${lag.lag ? `　落差 +${lag.lag} 天 → 估 ${ccAdd(next.expectedOn, lag.lag)}` : ''}</span></div>`;
  }
  const tag = plain ? 'div' : 'button';
  return `<${tag} class="cc-card${S.ccSel === p.id ? ' on' : ''}"${plain ? '' : ` onclick="ccSel('${p.id}')"`}>
    <div class="cc-card-t">${esc(p.t)}</div><div class="cc-card-m">${meta}</div>
    <div class="cc-bars">${bars}</div>${foot}</${tag}>`;
}

/* ---------- 專案明細：期款表 ---------- */
function ccProjectPane(pid) {
  const p = P(pid); if (!p) return ccSel(''), '';
  const c = ccContractOf(pid), ts = c ? ccTermsOf(c.id) : [];
  const lag = ccLag(pid);
  const st = CC_STAGES.find(s => s.id === ccStageOf(p));
  let h = `<div class="cf-bar"><button class="btn" onclick="ccSel('')">← 回 Overview</button>
    <span class="chip ${st.chip}">${st.nm}</span>${p.status ? `<span class="chip c-n">子階段 ${esc(p.status)}</span>` : ''}
    ${p.stageAt ? `<span class="cc-sub">${esc(p.stageAt)} 進入這一格</span>` : ''}</div>`;
  if (!ts.length) {
    return h + cfEmpty('還沒有期款', '把合約拆成期款之後，每一期的預計收款日就會進入推演。',
      isOwner() ? `<button class="btn pri" onclick="ccTermForm('${c ? c.id : ''}')">${svg('plus', 12)} 新增期款</button>` : '');
  }
  const rows = ts.map(t => {
    const state = ccTermState(t);
    const d = t.settledOn ? ccDays(t.expectedOn, t.settledOn) : null;
    const pill = state === 'overdue' ? `<span class="chip c-d">${svg('warn', 10)} 逾期 ${ccOverdue(t)} 天</span>`
      : state === 'settled' ? `<span class="chip c-o">${svg('check', 10)} 已收</span>`
        : state === 'invoiced' ? '<span class="chip c-w">已開票未收</span>' : '<span class="chip c-n">未開票</span>';
    return `<tr><td class="num">${t.seq}/${ts.length}</td>
      <td class="k">${esc(t.label)}${t.ms ? `<span class="sub">里程碑：${esc(t.ms)}</span>` : ''}</td>
      <td class="num">${nt(t.amount)}</td><td class="num">${t.pct ? t.pct + '%' : '—'}</td>
      <td class="num">${t.expectedOn}</td><td class="num">${t.settledOn || '—'}</td>
      <td class="num">${d == null ? '—' : `<span class="cc-lag ${d > 0 ? 'pos' : 'ok'}">${d > 0 ? '+' : ''}${d} 天</span>`}</td>
      <td>${pill}</td>
      <td class="num">${isOwner() && !t.settledOn ? `<button class="link" onclick="ccSettleForm('${t.id}')">標記收款</button>` : ''}</td></tr>`;
  }).join('');
  h += panel(esc(p.t), c ? `${c.id} · 合約 ${nt(c.total)} · 月結 ${c.termsDays} 天${c.clause ? ' · ' + esc(c.clause) : ''}` : '',
    `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>期</th><th>條件</th><th class="num">金額</th><th class="num">占比</th><th class="num">預計收款</th><th class="num">實際收款</th><th class="num">落差</th><th>狀態</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
     <div class="cc-note">${svg('clock', 12)}<div><b>這個客戶的付款落差：${lag.house ? '尚無足夠自己的歷史，先用全公司中位數 ' : '中位數 '}+${lag.lag} 天</b>${lag.n ? `（${lag.n} 筆已收期款）` : ''}。推演不用原始的預計收款日，而是把它平移 ${lag.lag} 天 —— 到期日是合約寫的，實際到帳是客戶決定的。</div></div>
     <div class="cc-note">${svg('bolt', 12)}<div>占比欄只是建立期款時的輔助值，金額才是權威：改合約總額不會回算已存在的期款金額。</div></div>`,
    isOwner() ? `<button class="btn sm" onclick="ccTermForm('${c.id}')">${svg('plus', 11)} 新增期款</button>` : '', true);
  return h;
}

/* ---------- 逾期清單 ---------- */
function ccOverduePane() {
  const od = ccOverdueTerms();
  let h = `<div class="cf-bar"><button class="btn" onclick="ccDrill('')">← 回 Overview</button>
    <span class="chip ${od.length ? 'c-d' : 'c-o'}">${od.length} 筆逾期</span></div>`;
  if (!od.length) return h + cfEmpty('沒有逾期的期款', '所有未收的期款都還在預計收款日之內。', '');
  const rows = od.map(t => {
    const p = ccProjectOfTerm(t), n = ccOverdue(t);
    return `<tr><td class="k">${esc(p ? p.t : '—')}<span class="sub">${esc(p ? p.client || '' : '')}</span></td>
      <td class="num">${t.seq} ${esc(t.label)}</td><td class="num">${nt(t.amount)}</td>
      <td class="num">${t.expectedOn}</td>
      <td class="num"><span class="chip ${n >= ccCfg('overdueRed') ? 'c-d' : 'c-w'}">${n} 天</span></td>
      <td>期款燈 ${n >= ccCfg('overdueRed') ? '紅' : '至少黃'}<span class="sub">卡住獎金閘門① 客戶款項實際收訖</span></td>
      <td class="num">${isOwner() ? `<button class="link" onclick="ccSettleForm('${t.id}')">標記收款</button>` : ''}</td></tr>`;
  }).join('');
  return h + panel('逾期期款 · 催款清單', '逾期不進推演，只進燈號', `<div class="tbl-wrap"><table class="tbl">
    <thead><tr><th>專案</th><th>期</th><th class="num">金額</th><th class="num">預計收款</th><th class="num">逾期</th><th>影響</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="cc-note">${svg('bolt', 12)}<div><b>逾期的錢刻意不平移進未來某個月。</b>研究過的做法是「把逾期款改估在本月收回」，否決 —— 那會讓推演永遠樂觀，而且每過一個月就自動再樂觀一次。它只出現在這張清單與燈號的硬門檻裡。</div></div>`, '', true);
}

/* ---------- 推演 ---------- */
function ccForecastPanel() {
  const n = ccHorizon(), f = ccForecast(n);
  const low = f.reduce((a, b) => b.bal < a.bal ? b : a, f[0]);
  const head = `<span class="seg">${[3, 6].map(x => `<button class="${n === x ? 'on' : ''}" onclick="ccSetHorizon(${x})">${x} 個月</button>`).join('')}</span>
    <span class="seg">${[['chart', '圖'], ['table', '表格']].map(v => `<button class="${ccView() === v[0] ? 'on' : ''}" onclick="ccSetView('${v[0]}')">${v[1]}</button>`).join('')}</span>`;
  const body = (ccView() === 'table' ? ccTable(f) : ccChart(f, low))
    + `<div class="cc-note">${svg('bolt', 12)}<div>推演窗內最低餘額 <b>${nt(low.bal)}</b>（${ccMoLabel(low.m)}，${(low.bal / ccBurn()).toFixed(1)} 個月）。已收與已開票的錢不重複計算：期款一旦勾稽到帳本就從推演移除，只留在帳戶餘額裡。</div></div>`;
  return panel(`未來 ${n} 個月推演`, `從 ${ccMoLabel(f[0].m)}起 · 支出假設 ${nt(ccBurn())} / 月`, body, head, true);
}
function ccTable(f) {
  const rows = f.map(r => {
    const m = r.bal / ccBurn();
    return `<tr><td class="k">${ccMoLabel(r.m)}</td>${CC_CERT.map(c => `<td class="num">${r.layers[c[0]] ? nt(r.layers[c[0]]) : '—'}</td>`).join('')}
      <td class="num">${nt(r.in)}</td><td class="num">${nt(-r.out)}</td>
      <td class="num" style="color:var(--${r.net < 0 ? 'danger' : 'ok'})">${nt(r.net)}</td>
      <td class="num">${nt(r.bal)}</td><td class="num"><span class="chip ${ccChip(ccTone(m, ccCfg('runwayGreen'), ccCfg('runwayAmber')))}">${m.toFixed(1)} 月</span></td></tr>`;
  }).join('');
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>月</th>${CC_CERT.map(c => `<th class="num">${c[1]}</th>`).join('')}
    <th class="num">流入</th><th class="num">支出</th><th class="num">淨額</th><th class="num">月末餘額</th><th class="num">可存活</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
/** 流量與餘額兩張圖共用 x 軸，不做雙軸 —— 兩個量級不同的 y 軸是最常見的圖表錯誤。 */
function ccChart(f, low) {
  const W = 720, n = f.length, step = (W - 70) / n, x0 = 58, bw = Math.min(54, step - 12);
  const maxIn = Math.max(1, ...f.map(r => r.in)), maxOut = Math.max(1, ccBurn());
  const H1 = 190, mid = H1 * maxIn / (maxIn + maxOut), sIn = (mid - 14) / maxIn, sOut = (H1 - mid - 16) / maxOut;
  const kk = v => (v < 0 ? '−' : '') + Math.round(Math.abs(v) / 1000) + 'K';
  let g = [0.5, 1].map(q => { const y = mid - sIn * maxIn * q; return `<line class="cc-grid" x1="${x0}" y1="${y}" x2="${W}" y2="${y}"/><text class="cc-ax" x="${x0 - 6}" y="${y + 3}" text-anchor="end">${kk(maxIn * q)}</text>`; }).join('');
  g += `<line class="cc-zero" x1="${x0}" y1="${mid}" x2="${W}" y2="${mid}"/><text class="cc-ax" x="${x0 - 6}" y="${mid + 3}" text-anchor="end">0</text>`;
  f.forEach((r, i) => {
    const cx = x0 + step * i + (step - bw) / 2;
    let y = mid;
    CC_CERT.forEach(c => {
      const v = r.layers[c[0]]; if (!v) return;
      const hh = Math.max(3, v * sIn); y -= hh;
      g += `<rect class="${c[2]}" x="${cx}" y="${y}" width="${bw}" height="${hh - 2}" rx="3"><title>${ccMoLabel(r.m)}　${c[1]}　${nt(v)}</title></rect>`;
    });
    const oh = Math.max(3, r.out * sOut);
    g += `<rect class="cc-out" x="${cx}" y="${mid + 2}" width="${bw}" height="${oh}" rx="3"><title>${ccMoLabel(r.m)}　支出假設　${nt(-r.out)}</title></rect>`;
    g += `<text class="cc-ax" x="${cx + bw / 2}" y="${H1 + 13}" text-anchor="middle">${ccMoLabel(r.m)}</text>`;
    if (r.net < 0) g += `<text class="cc-ax neg" x="${cx + bw / 2}" y="${mid + oh + 13}" text-anchor="middle">${kk(r.net)}</text>`;
  });
  const H2 = 150, burn = ccBurn(), gT = ccCfg('runwayGreen') * burn, aT = ccCfg('runwayAmber') * burn;
  const top = Math.max(gT * 1.15, ...f.map(r => r.bal)) * 1.04, sB = (H2 - 24) / top, yB = v => H2 - 12 - v * sB;
  let g2 = `<rect class="cc-band-a" x="${x0}" y="${yB(gT)}" width="${W - x0}" height="${Math.max(0, yB(aT) - yB(gT))}"/>
    <rect class="cc-band-r" x="${x0}" y="${yB(aT)}" width="${W - x0}" height="${Math.max(0, H2 - 12 - yB(aT))}"/>
    <line class="cc-grid dash" x1="${x0}" y1="${yB(gT)}" x2="${W}" y2="${yB(gT)}"/>
    <line class="cc-grid dash" x1="${x0}" y1="${yB(aT)}" x2="${W}" y2="${yB(aT)}"/>
    <text class="cc-ax" x="${x0 + 4}" y="${yB(gT) - 4}">綠 ≥ ${ccCfg('runwayGreen')} 個月（${kk(gT)}）</text>
    <text class="cc-ax" x="${x0 + 4}" y="${yB(aT) - 4}">黃 ≥ ${ccCfg('runwayAmber')} 個月（${kk(aT)}）</text>`;
  const pts = f.map((r, i) => [x0 + step * i + step / 2, yB(r.bal)]);
  g2 += `<polyline class="cc-line" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
  f.forEach((r, i) => {
    const isLow = r === low;
    g2 += `<circle class="cc-dot${isLow ? ' low' : ''}" cx="${pts[i][0]}" cy="${pts[i][1]}" r="${isLow ? 5.5 : 4.5}"><title>${ccMoLabel(r.m)}　月末餘額 ${nt(r.bal)}　可存活 ${(r.bal / burn).toFixed(1)} 個月</title></circle>`;
    if (isLow) g2 += `<text class="cc-ax b" x="${pts[i][0]}" y="${pts[i][1] - 11}" text-anchor="middle">最低 ${kk(r.bal)}</text>`;
  });
  const used = CC_CERT.filter(c => f.some(r => r.layers[c[0]]));
  const legend = `<div class="cc-legend">${used.map(c => `<span><i class="cc-sw ${c[2]}"></i>${c[1]}</span>`).join('')}
    <span><i class="cc-sw cc-out"></i>支出假設</span><span><i class="cc-sw cc-swline"></i>月末餘額</span></div>`;
  return legend
    + `<div class="cc-chart"><svg viewBox="0 0 ${W} ${H1 + 20}" role="img" aria-label="每月流入依確定性堆疊，支出向下"><defs><pattern id="ccHatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect class="cc-hatch-bg" width="5" height="5"/><line class="cc-hatch-l" x1="0" y1="0" x2="0" y2="5"/></pattern></defs>${g}</svg></div>`
    + `<h4 class="cc-h4">月末餘額與燈號區間</h4>`
    + `<div class="cc-chart"><svg viewBox="0 0 ${W} ${H2}" role="img" aria-label="月末餘額折線與綠黃紅區間">${g2}</svg></div>`;
}

/* ---------- 表單 ---------- */
function ccContractForm(pid) {
  if (!isOwner()) return deny();
  const opts = DB.projects.filter(p => !p.internal && !ccContractOf(p.id)).map(p => [p.id, p.t]);
  if (!opts.length && !pid) return toast('每個專案都已經有合約了');
  openForm({
    crumb: '合約', title: '建立合約', sub: '合約是期款的家；期款才是推演的輸入。',
    fields: [
      { k: 'p', label: '專案', type: 'select', opts, req: true },
      { k: 'total', label: '合約總額（未稅）', type: 'number', req: true },
      { k: 'termsDays', label: '月結天數', type: 'number', hint: '交付後幾天付款；用來算每一期的預計收款日' },
      { k: 'clause', label: '條文參照', ph: '例如 §9.1' }
    ],
    values: { p: pid || opts[0][0], total: '', termsDays: 30, clause: '' },
    effects: ['合約出現在四狀態 Overview', '還沒有期款之前不影響推演與兩顆燈'],
    onSave: v => {
      const rec = { id: nid('CT'), p: v.p, total: +v.total, termsDays: +v.termsDays || 30, clause: v.clause || '', signedOn: TODAY };
      commit('create', '合約', P(v.p).t, () => { DB.contracts.push(rec); return ['合約已建立', '下一步：把它拆成期款']; },
        () => { DB.contracts = DB.contracts.filter(x => x !== rec); });
      S.ccSel = v.p;
    }
  });
}
function ccTermForm(cid) {
  if (!isOwner()) return deny();
  const c = CT(cid); if (!c) return toast('先建立合約');
  const ts = ccTermsOf(cid);
  const usedPct = ts.reduce((a, t) => a + (Number(t.pct) || 0), 0);
  openForm({
    crumb: '期款', title: `新增第 ${ts.length + 1} 期`, sub: `${P(c.p).t} · 合約 ${nt(c.total)} · 已配置 ${usedPct}%`,
    fields: [
      { k: 'label', label: '收款條件', ph: '例如：28 帳號導入完成', req: true },
      { k: 'pct', label: '占合約比例 %', type: 'number', hint: '只是輔助：填了會幫你算出金額，之後改合約總額不會回算' },
      { k: 'amount', label: '金額（權威值）', type: 'number', req: true },
      { k: 'expectedOn', label: '預計收款日', type: 'date', req: true, hint: '推演會再用這個客戶的付款落差平移它' },
      { k: 'ms', label: '對應里程碑', ph: '選填，交付事件的名稱' }
    ],
    values: { label: '', pct: '', amount: '', expectedOn: ccAdd(TODAY, c.termsDays), ms: '' },
    effects: ['期款進入該專案的期數進度', '未逾期的期款會依四狀態加權進推演', '兩顆燈重算'],
    onSave: v => {
      const rec = { id: nid('TM'), c: cid, seq: ts.length + 1, label: v.label, amount: +v.amount, pct: v.pct === '' ? null : +v.pct, expectedOn: v.expectedOn, invoicedOn: '', settledOn: '', ms: v.ms || '' };
      commit('create', '期款', `${P(c.p).t} 第 ${rec.seq} 期`, () => { DB.terms.push(rec); return ['期款已建立', '推演與兩顆燈已重算']; },
        () => { DB.terms = DB.terms.filter(x => x !== rec); });
    }
  });
}
/** 標記收款＝把這一期勾稽到帳本的一筆收入。settledOn 由那筆交易的日期決定，
 *  不是今天 —— 落差要算得準，靠的是真正到帳那一天。 */
function ccSettleForm(tid) {
  if (!isOwner()) return deny();
  const t = DB.terms.find(x => x.id === tid); if (!t) return;
  const used = new Set(DB.terms.filter(x => x.txn).map(x => x.txn));
  const cands = DB.txns.filter(x => x.amt > 0 && !used.has(x.id)).sort((a, b) => a.d < b.d ? 1 : -1).slice(0, 30);
  const p = ccProjectOfTerm(t);
  openForm({
    crumb: '期款', title: '標記收款', sub: `${p ? esc(p.t) + ' · ' : ''}第 ${t.seq} 期 ${esc(t.label)} · ${nt(t.amount)}`,
    fields: cands.length
      ? [{ k: 'txn', label: '帳本裡的入帳', type: 'select', opts: cands.map(x => [x.id, `${x.d.slice(5)} ${x.t} ${nt(x.amt)}`]), req: true }]
      : [{ k: 'on', label: '實際收款日', type: 'date', req: true, hint: '帳本裡還沒有對應的入帳；先記日期，之後在對帳補勾稽' }],
    values: cands.length ? { txn: cands[0].id } : { on: TODAY },
    effects: ['期款狀態 → 已收', '這個客戶的付款落差中位數重算', '該筆金額從推演移除，改計入帳戶餘額'],
    onSave: v => {
      const before = { settledOn: t.settledOn, txn: t.txn };
      const on = cands.length ? TX(v.txn).d : v.on;
      commit('update', '期款收款', `第 ${t.seq} 期 ${t.label}`, () => {
        t.settledOn = on; if (cands.length) t.txn = v.txn;
        const d = ccDays(t.expectedOn, on);
        return ['期款已收訖', `落差 ${d > 0 ? '+' : ''}${d} 天已納入這個客戶的中位數`];
      }, () => { t.settledOn = before.settledOn; t.txn = before.txn; });
    }
  });
}
function ccCashForm(id) {
  if (!isOwner()) return deny();
  const a = id === 'new' ? null : id ? DB.accounts.find(x => x.id === id) : DB.accounts[0];
  openForm({
    crumb: '資金', title: '現金帳戶與支出假設', sub: '帳戶燈的分子與分母。兩個都要有，才會出現燈號。',
    fields: [
      { k: 'name', label: '帳戶名稱', ph: '例如：台新 909', req: true },
      { k: 'kind', label: '種類', type: 'select', opts: [['bank', '銀行'], ['cash', '現金']] },
      { k: 'opening', label: '期初餘額', type: 'number', req: true },
      { k: 'asOf', label: '期初基準日', type: 'date', req: true, hint: '這一天之後的已勾稽交易會加進來' },
      { k: 'monthlyBurn', label: '每月支出估值', type: 'number', req: true, hint: '自己填的數字，不從歷史平均推 —— 兩人公司的月份差異比趨勢大' },
      { k: 'runwayGreen', label: '綠燈門檻（月）', type: 'number' },
      { k: 'runwayAmber', label: '黃燈門檻（月）', type: 'number' }
    ],
    values: {
      name: a ? a.name : '', kind: a ? a.kind : 'bank', opening: a ? a.opening : '', asOf: a ? a.asOf : TODAY.slice(0, 8) + '01',
      monthlyBurn: DB.cashConfig.monthlyBurn || '', runwayGreen: ccCfg('runwayGreen'), runwayAmber: ccCfg('runwayAmber')
    },
    effects: ['帳戶燈開始計算', '推演的餘額折線與燈號區間出現'],
    onSave: v => {
      const beforeA = a ? { ...a } : null, beforeC = { ...DB.cashConfig };
      let created = '';
      commit('update', '資金設定', v.name, () => {
        const rec = { id: a ? a.id : nid('ACC'), name: v.name, opening: +v.opening, asOf: v.asOf, kind: v.kind || 'bank' };
        if (a) Object.assign(a, rec); else { created = rec.id; DB.accounts.push(rec); }
        DB.cashConfig = { ...DB.cashConfig, monthlyBurn: +v.monthlyBurn, runwayGreen: +v.runwayGreen || 6, runwayAmber: +v.runwayAmber || 3 };
        return ['帳戶燈已重算', '推演改用這個期初餘額'];
      }, () => {
        if (a && beforeA) Object.assign(a, beforeA);
        else if (created) DB.accounts = DB.accounts.filter(x => x.id !== created);
        DB.cashConfig = beforeC;
      });
    }
  });
}

/* ---------- 合約金流主畫面 ---------- */
function ccBoundary() {
  const mine = ccVisibleProjects().filter(p => ccContractOf(p.id));
  return panel('公司整體資金只有負責人看得到', '契約 §18',
    `<p class="cc-note-p">兩顆燈與推演屬於公司層級。你參與的案子的期款進度看得到：</p>
     <div class="cc-mine">${mine.length ? mine.map(p => ccCard(p, true)).join('') : '<div class="cc-none">你目前沒有帶合約的專案。</div>'}</div>
     <p class="cc-note-p">你的單據與報帳在<b>收單 · 我的報帳</b>；出勤在<b>容量 · 出勤紀錄</b>。</p>`,
    `<button class="btn" onclick="cfGo('mine')">前往我的報帳 ${svg('chevronRight', 11)}</button>`, true);
}
/** 多帳戶：帳戶燈的分子是所有帳戶期初的總和，所以這一條要看得到有幾個帳戶。 */
function ccAccountsStrip() {
  if (!DB.accounts.length) return '';
  const cells = DB.accounts.map(x => `<button class="cc-acct" onclick="ccCashForm('${x.id}')">
    <span>${esc(x.name)}</span><b>${nt(x.opening)}</b><span class="cc-sub">${x.kind === 'cash' ? '現金' : '銀行'} · 期初 ${x.asOf}</span></button>`).join('');
  return `<div class="cc-accts">${cells}<button class="cc-acct add" onclick="ccCashForm('new')">${svg('plus', 12)} 新增帳戶</button></div>`;
}
function ccPane() {
  if (!isOwner()) return ccBoundary();
  if (S.ccDrill === 'overdue') return ccOverduePane();
  if (S.ccSel) return ccProjectPane(S.ccSel);
  const hasTerms = DB.terms.length > 0;
  const a = ccAccountLight(), b = ccTermLight();
  let h = `<div class="cc-lights">${ccLightCard(a, 'account')}${ccLightCard(b, 'term')}</div>` + ccDisagree(a, b) + ccAccountsStrip();
  if (!hasTerms) {
    return h + cfEmpty('還沒有合約期款',
      '合約拆成期款之後，這裡會依可挑戰 / 已提案 / 已接案 / 已結案四欄列出每個案子走到第幾期，並用每一期的預計收款日推未來 6 個月。',
      `<button class="btn pri" onclick="ccContractForm()">${svg('plus', 12)} 建立合約</button><button class="btn" onclick="ccCashForm()">設定帳戶與支出估值</button>`);
  }
  h += ccPipeline();
  h += '<div style="height:12px"></div>';
  h += ccHasAccount() ? ccForecastPanel()
    : cfEmpty('推演還缺一半的輸入', '期款有了，還需要期初餘額與每月支出估值才推得動餘額與燈號區間。', `<button class="btn pri" onclick="ccCashForm()">設定帳戶與支出估值</button>`);
  return h;
}

/* ==================================================================
   洞察 · 人事：把寫死的薪資列與獎金閘門接回資料
   （RES-032 缺口 A-4。原本那一頁的 guide 寫「這頁沒有一個數字是人工填的」，
     但薪資列是 30,000 / 1,846 / 5,000 三個字面值，GATE() 也鎖死一個專案。）
   ================================================================== */
/** runtime 的 GATE 是 const，改不動也不該改（獎金單抽屜還在用它）。
 *  這裡另立一支依專案推導的，人事頁改用它。 */
function ccGate(pid) {
  const id = pid || S.proj || (DB.projects.find(p => ccStageOf(p) === 'WON') || DB.projects[0] || {}).id;
  if (!id || !P(id)) return [];
  const c = ccContractOf(id), ts = c ? ccTermsOf(c.id) : [];
  const settled = ts.filter(t => t.settledOn);
  const open = ts.filter(t => !t.settledOn);
  const od = ts.filter(t => ccOverdue(t) > 0);
  const issues = DB.issues.filter(i => i.p === id);
  const costs = (typeof projTxns === 'function' ? projTxns(id) : DB.txns.filter(t => t.p === id)).filter(t => t.amt < 0);
  const p = P(id);
  return [
    ['① 客戶款項實際收訖', ts.length > 0 && open.length === 0,
      ts.length ? (open.length ? `${settled.length}/${ts.length} 期已收${od.length ? `，${ccOverdue(od[0])} 天逾期` : ''}` : '全數收訖') : '尚無合約期款'],
    ['② 該期交付完成', issues.length > 0 && issues.every(i => i.st === 'Done'),
      issues.length ? `${issues.filter(i => i.st === 'Done').length}/${issues.length} 完成` : '尚無工作項'],
    ['③ 內部驗收（14 日）', p.status === '已結案', p.status === '已結案' ? '已結案' : `目前 ${p.status || '未設定'}`],
    ['④ 無退款 / 折讓 / 爭議', !ts.some(t => t.writtenOff), ts.some(t => t.writtenOff) ? '有沖銷期款' : '—'],
    ['⑤ 成本已可合理確定', costs.length >= 4, costs.length + ' 筆已歸屬']
  ];
}
/* ---------- P3：里程碑獎金 ----------
   在這之前，人事頁「里程碑」那一格是 payroll 草稿裡手打的數字，而同一頁的說明寫著
   「這頁沒有一個數字是人工填的」。現在它掛在里程碑上：達成了才算得出來。 */
function ccMilestones() { return Array.isArray(DB.milestones) ? DB.milestones : []; }
function ccBonusMilestones() { return ccMilestones().filter(m => Number(m.bonus) > 0); }
/** 某個人的里程碑獎金＝他負責的專案上、已達成的里程碑的獎金總和。 */
function ccMilestoneBonus(who) {
  const mine = new Set(DB.projects.filter(p => p.owner === who).map(p => p.id));
  return ccBonusMilestones()
    .filter(m => mine.has(m.projectId) && m.state === 'done')
    .reduce((a, m) => a + Number(m.bonus), 0);
}
function ccMsBonusForm(id) {
  if (!isOwner()) return deny();
  const opts = ccMilestones().map(m => [m.id, (P(m.projectId)?.t || '—') + ' · ' + m.title]);
  if (!opts.length) return toast('還沒有里程碑；先在專案 · 里程碑建立');
  const cur = id ? ccMilestones().find(m => m.id === id) : null;
  openForm({
    crumb: '里程碑獎金', title: cur ? '調整里程碑獎金' : '設定里程碑獎金',
    sub: '掛在里程碑上，不掛在薪資草稿上：達成了才算得出來。',
    fields: [
      { k: 'ms', label: '里程碑', type: 'select', opts, req: true },
      { k: 'bonus', label: '獎金金額', type: 'number', req: true, hint: '0＝這個里程碑不帶獎金' }
    ],
    values: { ms: cur ? cur.id : opts[0][0], bonus: cur ? cur.bonus : '' },
    effects: ['里程碑達成時，這筆金額會進到該專案負責人的薪資試算', '未達成的里程碑不計入'],
    onSave: v => {
      const m = ccMilestones().find(x => x.id === v.ms); if (!m) return;
      const before = m.bonus;
      commit('update', '里程碑獎金', m.title, () => {
        m.bonus = +v.bonus || 0;
        return [m.state === 'done' ? '已達成，立即計入薪資試算' : '達成後才會計入薪資試算'];
      }, () => { m.bonus = before; });
    }
  });
}

function ccPeoplePane() {
  const list = DB.payroll.filter(p => isOwner() || p.who === DB.me);
  const proj = S.proj && P(S.proj) ? S.proj : (DB.projects.find(p => ccStageOf(p) === 'WON') || DB.projects[0] || {}).id;
  const g = ccGate(proj);
  const gatePanel = panel('獎金結算閘門', proj ? `§13.1 五項全數成立 · ${esc(P(proj).t)}` : '§13.1',
    proj ? g.map(r => `<div class="gate"><span class="ix ${r[1] ? 'y' : 'n'}">${r[1] ? svg('check', 12) : '…'}</span><span class="tt">${esc(r[0])}</span><span class="mm">${esc(r[2])}</span></div>`).join('')
      + `<div class="note" style="margin-top:10px">五項全成立才結算。目前 <b>${g.filter(x => x[1]).length}/5</b>。</div>`
      : '<div class="empty">尚無專案結算資料</div>');
  if (!list.length) {
    return cfEmpty('薪資與獎金試算', '固定薪與加班由負責人填；專案獎金由帳本的可分配毛利算出來，不是人工填的。',
      isOwner() ? `<button class="btn pri" onclick="formPayroll()">${svg('plus', 12)} 新增試算</button>` : '') + '<div style="height:12px"></div>' + gatePanel;
  }
  const rows = list.map(p => {
    if (p.separate) return `<tr onclick="toast('負責人報酬另計，不列入 §9 專案成本')"><td class="k">${person(p.who)}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num" style="color:var(--text-3)">另計</td></tr>`;
    const b = DB.projects.filter(x => x.owner === p.who).reduce((a, x) => a + bonus(x.id), 0);
    /* 有任何里程碑帶獎金，就以里程碑為準；一筆都沒有時才回頭用草稿裡手填的值，
       並在表尾標明是哪一種 —— 兩個來源同時存在才是真的會出錯。 */
    const ms = ccBonusMilestones().length ? ccMilestoneBonus(p.who) : p.milestone;
    return `<tr onclick="${isOwner() ? `formPayroll('${p.who}')` : `toast('本人薪資唯讀；由管理者調整試算')`}"><td class="k">${person(p.who)}</td>
      <td class="num">${nt(p.base)}</td><td class="num">${nt(p.overtime)}</td>
      <td class="num" style="color:var(--pri)">${nt(b)}</td><td class="num">${nt(ms)}</td>
      <td class="num" style="color:var(--ok)">${nt(p.base + p.overtime + b + ms)}</td></tr>`;
  }).join('');
  const derived = ccBonusMilestones().length;
  const pay = panel('薪資試算', '固定＋加班＋專案獎金＋里程碑',
    `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>人員</th><th class="num">固定</th><th class="num">加班</th><th class="num">專案獎金</th><th class="num">里程碑</th><th class="num">應付</th></tr></thead><tbody>${rows}</tbody>
     <tfoot><tr><td colspan="6">固定與加班是負責人填的試算值；專案獎金由帳本的可分配毛利算出來。里程碑獎金${derived ? `由里程碑算出來（${derived} 個里程碑帶獎金，只計已達成的）` : '目前仍是薪資草稿裡手填的 —— 還沒有任何里程碑設定獎金金額'}。</td></tr></tfoot></table></div>`,
    isOwner() ? `<button class="btn sm" onclick="formPayroll()">新增／調整</button>` : '', true);
  let msPanel = '';
  if (isOwner()) {
    const bm = ccBonusMilestones();
    msPanel = '<div style="height:12px"></div>' + panel('里程碑獎金', bm.length ? bm.length + ' 個里程碑帶獎金' : '尚未設定',
      bm.length
        ? `<div class="rows">${bm.map(m => `<div class="row" onclick="ccMsBonusForm('${m.id}')">
            <span class="m" style="width:96px">${esc(m.dueOn || '日期待補')}</span>
            <span class="t">${esc(m.title)}<small>${esc(P(m.projectId)?.t || '—')}</small></span>
            <span class="chip ${m.state === 'done' ? 'c-o' : 'c-n'}">${m.state === 'done' ? '已達成 · 計入' : '未達成 · 不計入'}</span>
            <span class="num" style="font-family:var(--mono)">${nt(m.bonus)}</span></div>`).join('')}</div>`
        : '<div class="empty">里程碑獎金掛在里程碑上，不掛在薪資草稿上：達成了才算得出來。</div>',
      `<button class="btn sm" onclick="ccMsBonusForm()">${svg('plus', 11)} 設定</button>`, true);
  }
  return `<div class="g g21">${pay}${gatePanel}</div>${msPanel}`;
}

/* ---------- 路由 ---------- */
const ccPrevMoney = VIEWS.money;
VIEWS.money = tab => {
  const k = (CF_TABS[tab] || CF_TABS[0])[0];
  if (k !== 'contract' && k !== 'people') return ccPrevMoney(tab);
  const run = () => k === 'contract' ? ccPane() : ccPeoplePane();
  /* 沿用三面那一層的可見性收斂：非負責人看到的 DB.txns 只有自己的專案，
     否則 bonus() 會從別人的專案毛利算出數字來。 */
  if (isOwner()) return run();
  const all = DB.txns;
  DB.txns = all.filter(canSeeTxn);
  try { return run(); } finally { DB.txns = all; }
};
