/* 回顧分頁 —— 同步狀態、作者身分、雙軌並列。
 *
 * 原本的回顧只有一段「連續敘事」，而且它讀的是 `DB.journal`：
 *
 *     get: () => journals[space][space === 'personal' ? DB.me : journalAuthor]
 *
 * 那是一個 getter，一次只回傳**一個人**的日誌。所以回顧在結構上不可能同時
 * 顯示兩個人 —— 這就是「不支援多人日誌的回顧」的成因，不是漏做篩選器而已。
 * 這裡改為直接讀 `journals[space]` 這本總帳，兩個席位一起取。
 *
 * 另外三個問題一併處理：
 *   · 沒有同步狀態 —— 使用者無從判斷看到的是不是最新的，只能猜。
 *   · 每一條看不出是誰寫的。
 *   · 面板標「唯讀」，每一塊右邊卻有「開啟編輯」，兩種語意並存。
 *
 * 三種檢視共用同一組資料、同步列與篩選：
 *   敘事流（每天往下讀）／雙軌（兩人對齊）／任務（週期結論，來自 agenda-object）。
 */

let jrView = 'flow';   // flow | dual | task
let jrWho = 'all';     // all | <席位 key>
let jrSpan = 14;       // 天；0 = 全部

const JR_SPANS = [[7, '本週'], [14, '近 14 天'], [0, '全部']];

/* ---------- 資料 ---------- */

/** 這個空間裡有日誌的席位。個人空間只有自己，圓展空間才有兩人。 */
function jrMembers() {
  const book = journals[space] || {};
  return space === 'personal' ? [DB.me] : Object.keys(book);
}
function jrBook(who) { return (journals[space] || {})[who] || {}; }
function jrShown() { return jrWho === 'all' ? jrMembers() : jrMembers().filter(w => w === jrWho); }

/** 一則日誌有沒有實際內容。只有空白段落的那天不該佔一整塊版面。 */
function jrHasBody(d) {
  return !!d && (d.blocks || []).some(b => b.t === 'obj' || b.t === 'divider' || (b.text || '').trim());
}
/** 只有標題符號、沒有內容的那種（截圖裡那個只有 `#` 的 2026-09-25）。 */
function jrIsHollow(d) {
  if (!d) return false;
  const body = (d.blocks || []).filter(b => b.t === 'obj' || b.t === 'divider' || (b.text || '').trim());
  return body.length > 0 && body.every(b => TEXTY(b.t) && /^#+$/.test((b.text || '').trim()));
}

/**
 * 兩個人的日期聯集，新的在前。期間篩選用日期比對，不是取前 N 筆。
 *
 * 只留「至少有一個人真的寫了東西」的日子：兩邊都空的那天在雙軌會變成
 * 左右各一個「未寫日誌」的空列，那是純噪音 —— 空槽要能表達「對方那天停住了」，
 * 前提是另一邊有東西可以對照。
 */
function jrDays() {
  const cut = jrSpan ? dadd(TODAY, -jrSpan) : '';
  const set = new Set();
  jrShown().forEach(w => Object.keys(jrBook(w)).forEach(day => {
    if (cut && day < cut) return;
    if (jrHasBody(jrBook(w)[day])) set.add(day);
  }));
  return [...set].sort().reverse();
}

function jrCount(who) {
  return Object.keys(jrBook(who)).filter(day => jrHasBody(jrBook(who)[day])).length;
}

/* ---------- 同步狀態 ---------- */

/**
 * 只講真的。`OP_LIVE` 為假時（prototype／showcase）根本沒有同步管道，
 * 這時顯示「已同步」是騙人的 —— 跟 opPaintStatus() 在非 database 模式直接
 * 不畫徽章是同一個判斷。
 */
function jrSyncBar() {
  if (!OP_LIVE) {
    return `<div class="jr-sync off">${svg('bolt', 12)}
      <b>原型模式</b><span>沒有連資料庫，這一頁不會同步，也不會保存</span></div>`;
  }
  const label = { idle: '已同步', sending: '同步中…', error: '未保存', conflict: '有衝突', stale: '有新變更' }[OP_STATUS] || OP_STATUS;
  const bad = OP_STATUS === 'error' || OP_STATUS === 'conflict';
  const warn = OP_STATUS === 'stale';
  const pending = OP_QUEUE.length;
  return `<div class="jr-sync ${bad ? 'bad' : warn ? 'warn' : 'ok'}">
    <span class="jr-dot"></span><b>${esc(label)}</b>
    <span>${OP_STATUS_NOTE ? esc(OP_STATUS_NOTE) + ' · ' : ''}版本 ${OP_VERSION}</span>
    ${pending ? `<span class="jr-pend">待送出 ${pending} 筆</span>` : ''}
    <span class="jr-gap"></span>
    <button class="btn sm" onclick="opCheckRemoteVersion()">${svg('refresh', 11)} 檢查更新</button></div>`;
}

/* ---------- 篩選列 ---------- */

function jrFilters() {
  const members = jrMembers();
  const chip = (on, label, click) =>
    `<button class="btn sm ${on ? 'pri' : ''}" onclick="${click}">${label}</button>`;
  const who = members.length > 1 ? `<span class="jr-fg"><span class="jr-k">成員</span>
    ${chip(jrWho === 'all', '兩人', "jrSet('who','all')")}
    ${members.map(w => chip(jrWho === w, rqAv(w) + ' ' + esc(person(w)), `jrSet('who','${w}')`)).join('')}</span>` : '';
  return `<div class="jr-filters">
    <span class="jr-fg"><span class="jr-k">期間</span>
      ${JR_SPANS.map(([n, nm]) => chip(jrSpan === n, nm, `jrSet('span',${n})`)).join('')}</span>
    ${who}
    <span class="jr-gap"></span>
    <span class="jr-fg">${['flow', 'dual', 'task'].filter(v => v !== 'dual' || members.length > 1)
      .map(v => chip(jrView === v, { flow: '敘事流', dual: '雙軌', task: '任務' }[v], `jrSet('view','${v}')`)).join('')}</span>
  </div>`;
}

function jrSet(k, v) {
  if (k === 'who') jrWho = v;
  else if (k === 'span') jrSpan = v;
  else if (k === 'view') jrView = v;
  render();
}

/* ---------- 共用：一天的內容 ---------- */

function jrBlockHtml(b) {
  if (b.t === 'divider') return `<div class="eb ind${b.ind}"><div class="eb-div"></div></div>`;
  if (b.t === 'obj') return `<div class="eb ind${b.ind}">${objHtml(b)}</div>`;
  if (!(b.text || '').trim()) return '';
  const bul = b.t === 'p' && b.ind > 0 ? '<span class="eb-bul">·</span>' : '';
  const ck = b.t === 'todo' ? `<span class="eb-ck ${b.done ? 'on' : ''}">${svg('check')}</span>` : '';
  return `<div class="eb ind${b.ind} ${stkOf(b) ? 'stk-on' : ''} ${lkHas(b) ? 'has-links' : ''}" data-t="${b.t}">${bul}${ck}<div class="eb-tx ${b.done ? 'done' : ''}">${esc(b.text)}</div>${stkHtml(b)}${lkRoChips(b)}</div>`;
}
function jrBody(d) { return `<div class="doc jr-doc">${(d.blocks || []).map(jrBlockHtml).join('')}</div>`; }

/** 回顧唯讀。要改就明確跳到那一天的編輯畫面，不在這裡就地編輯。 */
function jrGoto(day, who) {
  saveJournalDraft();
  S.jday = day;
  if (space === 'team' && who) journalAuthor = who;
  setTab(0);
}

/* ---------- 檢視一：敘事流 ---------- */

function jrFlow() {
  const days = jrDays();
  if (!days.length) return `<div class="rq-empty">這段期間沒有日誌。換個期間，或到「今天」開始寫。</div>`;
  return days.map(day => {
    const cards = jrShown().map(w => {
      const d = jrBook(w)[day];
      if (!jrHasBody(d)) return '';
      const hollow = jrIsHollow(d);
      return `<div class="jr-entry ${hollow ? 'hollow' : ''}">
        <div class="jr-who">${rqAv(w)}<b>${esc(person(w))}</b>
          ${w === DB.me ? '' : '<span class="jr-tag">對方</span>'}
          <span class="jr-gap"></span>
          <button class="btn sm" onclick="jrGoto('${day}','${w}')">${svg('goto', 11)} 到這一天</button></div>
        ${hollow
          ? `<div class="jr-hollow" onclick="this.nextElementSibling.classList.toggle('on')">
               ${svg('chevronRight', 11)} 這天只有標題符號、沒有內容（點開看）</div>
             <div class="jr-fold">${jrBody(d)}</div>`
          : jrBody(d)}
      </div>`;
    }).filter(Boolean).join('');
    if (!cards) return '';
    return `<div class="jr-day"><div class="jr-date">
        <span class="chip ${day === TODAY ? 'c-p' : 'c-n'}">${esc(day)}</span>
        <span class="jr-w">${jcWeek(day)}</span><i class="jr-line"></i></div>${cards}</div>`;
  }).join('') || `<div class="rq-empty">這段期間沒有內容。</div>`;
}

/* ---------- 檢視二：雙軌並列 ---------- */

/**
 * 左右各一條軌道、中央共用日期刻度。同一列一定是同一天，
 * 所以「日期標頭和它底下的內容對不起來」在結構上不可能發生。
 * 對方那天沒寫就畫一個空槽 —— 兩人制最怕的不是寫太少，是不知道對方停在哪裡。
 */
function jrDual() {
  const members = jrMembers();
  const [a, b] = [members[0], members[1]];
  const days = jrDays();
  if (!days.length) return `<div class="rq-empty">這段期間沒有日誌。</div>`;
  const lane = (who, day, side) => {
    const d = jrBook(who)[day];
    if (!jrHasBody(d)) return `<div class="jr-lane ${side}"><div class="jr-gapslot">未寫日誌</div></div>`;
    return `<div class="jr-lane ${side}"><div class="jr-card" onclick="jrGoto('${day}','${who}')">
      ${jrBody(d)}</div></div>`;
  };
  return `<div class="jr-dual">
    <div class="jr-lanehead">
      <div>${rqAv(a)}<b>${esc(person(a))}</b><span class="jr-k">${jrCount(a)} 天有紀錄</span></div>
      <div class="jr-mid"><span class="jr-k">${esc(String(jrSpan || '全部'))}${jrSpan ? ' 天' : ''}</span></div>
      <div class="jr-rgt"><span class="jr-k">${jrCount(b)} 天有紀錄</span><b>${esc(person(b))}</b>${rqAv(b)}</div>
    </div>
    ${days.map(day => `<div class="jr-row ${day === TODAY ? 'today' : ''}">
      ${lane(a, day, 'l')}
      <div class="jr-mid"><span class="jr-dd">${esc(day.slice(5))}</span><span class="jr-ww">${jcWeek(day)}</span></div>
      ${lane(b, day, 'r')}
    </div>`).join('')}
  </div>`;
}

/* ---------- 組合 ---------- */

const jrBaseJournal = VIEWS.journal;
VIEWS.journal = function (tab) {
  if (tab !== 1) return jrBaseJournal(tab);
  const body = jrView === 'task' ? agReviewHtml() : jrView === 'dual' ? jrDual() : jrFlow();
  return guide('<b>回顧是唯讀的。</b>這裡看兩個人這段期間各自寫了什麼；要改請按「到這一天」。', 'i')
    + jrSyncBar() + jrFilters()
    + panel({ flow: '連續敘事', dual: '雙軌並列', task: '任務' }[jrView],
            jrView === 'task' ? '' : '唯讀', body, '', jrView !== 'flow');
};
