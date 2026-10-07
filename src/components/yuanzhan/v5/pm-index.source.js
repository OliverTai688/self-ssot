/* ==================================================================
   專案總表與專案標題列（RES-034 · PROJUI-001）

   為什麼需要這一層：專案模組原本一進來就是「某一個專案的總覽」，換專案靠一排
   只有名字的按鈕。專案從 4 個變成 15 個之後，那一排按鈕回答不了任何管理問題 ——
   哪幾個在跑、哪幾個只是洽談、哪一個該我處理、下一步是什麼。

   兩層：
     總表（index）  所有專案一張表，依狀態分組。一列＝一個專案，回答「現在該看哪一個」。
     專案（detail） 原本的六個分頁。標題列取代那排按鈕：回總表、專案身分、切換、編輯。

   這個檔只放函式宣告與 PMV.index；接線（rail 進入點、VIEWS.project 分流）在 pm-shell。
   ================================================================== */

var PMV = PMV || {};

/** 狀態的顯示順序就是管理上的優先序：正在交付的在最上面，結案的在最下面。 */
const PM_IX_GROUPS = [
  { st: '進行中', tone: 'pri', hint: '已接案、正在交付' },
  { st: '驗收中', tone: 'warn', hint: '交付完成、等客戶驗收或尾款' },
  { st: '商機', tone: '', hint: '提案與洽談中，還沒接案' },
  { st: '已結案', tone: 'off', hint: '完成、封存或未成案' }
];
const PM_IX_SEGS = [['open', '進行與洽談'], ['closed', '已結案'], ['all', '全部']];

function pmIxState() {
  if (!S.pmIx) S.pmIx = { seg: 'open', q: '' };
  return S.pmIx;
}
const pmIsClosed = p => p.status === '已結案';
function pmGroupOf(p) {
  return PM_IX_GROUPS.find(g => g.st === p.status) || PM_IX_GROUPS[2];
}

/** 重要度：Owner 的主觀分級，5 最重要。畫成五格，不用星號字形。 */
function pmTierMeter(tier) {
  const n = Number(tier) || 0;
  if (!n) return `<span class="pm-tier none" title="未分級">未分級</span>`;
  return `<span class="pm-tier" role="img" aria-label="重要度 ${n} / 5" title="重要度 ${n} / 5">${
    [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')
  }</span>`;
}

function pmStatusChip(p) {
  const g = pmGroupOf(p);
  return `<span class="pm-st ${g.tone}">${esc(p.status || '商機')}</span>`;
}

/** 「二期 · 執行」這種一行字；沒分期就不佔位置。 */
function pmStageLine(p) {
  const cur = pmCurrentStage(p.id);
  return cur ? pmCycleName(cur.cycle) + ' · ' + cur.stage.label : '';
}

function pmIxRows() {
  const st = pmIxState();
  const q = st.q.trim().toLowerCase();
  return DB.projects
    .filter(p => (st.seg === 'all' ? true : st.seg === 'closed' ? pmIsClosed(p) : !pmIsClosed(p)))
    .filter(p => !q || [p.t, p.client, p.no, p.next, p.id].join(' ').toLowerCase().includes(q))
    .map(p => ({ p, todo: pmIsClosed(p) ? 0 : pmAttention(p).length }));
}

/** 組內排序：重要度高的在前（未分級排最後），同級依資料夾序號、再依名稱。 */
function pmIxSort(a, b) {
  return (Number(b.p.tier) || 0) - (Number(a.p.tier) || 0)
    || String(a.p.no || '99').localeCompare(String(b.p.no || '99'))
    || String(a.p.t).localeCompare(String(b.p.t), 'zh-Hant');
}

function pmIxRow(row) {
  const p = row.p;
  const stage = pmStageLine(p);
  const who = DB.people[p.owner];
  return `<button type="button" class="pm-ix-row" onclick="pmOpen('${p.id}')">
    <span class="pm-ix-name">
      <span class="pm-ix-no">${esc(p.no || '')}</span>
      <span class="pm-ix-tt"><b>${esc(p.t)}</b><em>${esc(p.client || '未填客戶')}</em></span>
    </span>
    <span class="pm-ix-stage ${stage ? '' : 'none'}">${esc(stage || '未分期')}</span>
    <span class="pm-ix-tier">${pmTierMeter(p.tier)}</span>
    <span class="pm-ix-next ${p.next ? '' : 'none'}">${esc(p.next || '尚未填寫下一步')}</span>
    <span class="pm-ix-todo">${row.todo ? `<span class="pm-chip warn">${row.todo} 件待處理</span>` : ''}</span>
    <span class="pm-ix-end">${who ? `<span class="av ${who.cls}" title="${esc(who.n)}">${esc(who.s)}</span>` : ''}${svg('chevronRight', 14)}</span>
  </button>`;
}

function pmIxList() {
  const st = pmIxState();
  const rows = pmIxRows();
  if (!rows.length) {
    return `<div class="pm-empty"><p>${st.q.trim()
      ? '沒有符合「' + esc(st.q.trim()) + '」的專案。'
      : st.seg === 'closed' ? '還沒有已結案的專案。' : '目前沒有進行或洽談中的專案。'}</p></div>`;
  }
  const head = `<div class="pm-ix-head" aria-hidden="true">
    <span>專案 · 客戶</span><span>階段</span><span>重要度</span><span>下一步</span><span></span><span></span>
  </div>`;
  const groups = PM_IX_GROUPS.map(g => {
    const list = rows.filter(r => pmGroupOf(r.p) === g).sort(pmIxSort);
    if (!list.length) return '';
    return `<section class="pm-ix-group">
      <h3 class="pm-ix-gh"><span class="pm-st ${g.tone}">${g.st}</span><b>${list.length}</b><em>${g.hint}</em></h3>
      ${list.map(pmIxRow).join('')}
    </section>`;
  }).join('');
  return head + groups;
}

/** 只重畫清單：整頁 render() 會把搜尋框的游標踢掉。 */
function pmIxPaint() {
  const box = getById('pmIxList');
  if (box) box.innerHTML = pmIxList();
  const count = getById('pmIxCount');
  if (count) count.textContent = pmIxRows().length + ' / ' + DB.projects.length;
}
function pmIxSeg(seg) {
  pmIxState().seg = seg;
  render();
}
function pmIxQuery(v) {
  pmIxState().q = v;
  pmIxPaint();
}

PMV.index = function () {
  const st = pmIxState();
  const open = DB.projects.filter(p => !pmIsClosed(p));
  const count = s => DB.projects.filter(p => p.status === s).length;
  const todo = open.reduce((n, p) => n + pmAttention(p).length, 0);
  const noNext = open.filter(p => !p.next).length;

  const rail = pmRail([
    { label: '進行中', value: count('進行中') },
    { label: '驗收中', value: count('驗收中') },
    { label: '商機', value: count('商機') },
    { label: '待處理', value: todo, tone: todo ? 'warn' : '', note: todo ? '跨所有專案' : '' },
    { label: '沒寫下一步', value: noNext, tone: noNext ? 'warn' : '', note: noNext ? '進行與洽談中的專案' : '' },
    { label: '已結案', value: count('已結案') }
  ], { label: '專案總覽數字' });

  const bar = `<div class="pm-ix-bar">
    <div class="pm-tseg" role="tablist" aria-label="專案範圍">${PM_IX_SEGS.map(s =>
      `<button type="button" role="tab" aria-selected="${s[0] === st.seg}" class="${s[0] === st.seg ? 'on' : ''}" onclick="pmIxSeg('${s[0]}')">${s[1]}</button>`
    ).join('')}</div>
    <label class="pm-tsearch">${svg('search')}<input type="search" value="${esc(st.q)}" placeholder="找專案、客戶或下一步" aria-label="篩選專案" oninput="pmIxQuery(this.value)"></label>
    <span class="pm-sp"></span>
    <span class="pm-tcount" id="pmIxCount">${pmIxRows().length} / ${DB.projects.length}</span>
    <button type="button" class="btn pri" onclick="formProject()">${svg('plus')} 新專案</button>
  </div>`;

  return `<div class="pm-view pm-view-index">${rail}${bar}<div class="pm-ix" id="pmIxList">${pmIxList()}</div></div>`;
};

/* ---------- 進出總表 ---------- */
function pmOpen(pid) {
  if (!P(pid)) return;
  S.proj = pid;
  S.pmList = false;
  S.pmBack = [];
  pmGo(0);
}
function pmList() {
  S.pmList = true;
  S.pmBack = [];
  pmGo(0);
}

/* ---------- 專案標題列（取代那排按鈕） ---------- */
function pmSwitcher(p) {
  const groups = PM_IX_GROUPS.map(g => {
    const list = DB.projects.filter(x => pmGroupOf(x) === g).map(x => ({ p: x })).sort(pmIxSort);
    if (!list.length) return '';
    return `<optgroup label="${g.st}">${list.map(r =>
      `<option value="${r.p.id}" ${r.p.id === p.id ? 'selected' : ''}>${esc((r.p.no ? r.p.no + '　' : '') + r.p.t)}</option>`
    ).join('')}</optgroup>`;
  }).join('');
  return `<label class="pm-ph-switch"><span>切換專案</span><select aria-label="切換專案" onchange="pmOpen(this.value)">${groups}</select></label>`;
}

function pmProjectHead(p) {
  if (!p) return '';
  const meta = [
    p.client ? '客戶　' + p.client : '',
    DB.people[p.owner] ? '負責　' + DB.people[p.owner].n : '',
    p.type && p.type !== '未確認' ? p.type : '類型未確認',
    p.start && p.start !== '—' ? '開始　' + p.start : ''
  ].filter(Boolean);
  return `<header class="pm-ph">
    <button type="button" class="pm-ph-back" onclick="pmList()">${svg('chevronLeft', 14)}<span>所有專案</span></button>
    <div class="pm-ph-row">
      <div class="pm-ph-id">
        <div class="pm-ph-title">${p.no ? `<span class="pm-ix-no">${esc(p.no)}</span>` : ''}<h2>${esc(p.t)}</h2>${pmStatusChip(p)}${pmTierMeter(p.tier)}</div>
        <div class="pm-ph-meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>
      </div>
      <div class="pm-ph-act">
        ${pmSwitcher(p)}
        <button type="button" class="btn sm" onclick="formProject(S.proj)">${svg('pen')} 編輯</button>
      </div>
    </div>
  </header>`;
}

/* ---------- 下一步・重要度・說明 ---------- */
function pmBriefForm(pid) {
  const p = P(pid);
  if (!p) return;
  if (!editable(p)) return deny();
  openForm({
    crumb: p.id,
    title: '下一步與重要度',
    sub: p.t,
    fields: [
      { k: 'next', label: '下一步', type: 'textarea', rows: 2, ph: '這個專案接下來要做的一件事，例如：追對方選方案、10/30 前確認報價' },
      { k: 'tier', label: '重要度', type: 'select', opts: [['', '未分級'], ['5', '5　最重要'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1　最低']], half: true },
      { k: 'desc', label: '專案說明', type: 'textarea', rows: 4, ph: '這個案子是什麼、為什麼做、有什麼背景' }
    ],
    values: { next: p.next || '', tier: p.tier ? String(p.tier) : '', desc: p.desc || '' },
    effects: ['專案總表的下一步與排序', '專案總覽的摘要'],
    onSave: v => {
      const before = { next: p.next, tier: p.tier, desc: p.desc };
      commit('update', '專案', p.t, () => {
        p.next = String(v.next || '').trim();
        p.tier = Number(v.tier) || 0;
        p.desc = String(v.desc || '').trim();
        return ['專案總表的下一步與排序'];
      }, () => Object.assign(p, before));
    }
  });
}

/** 總覽最上面那一塊：這個案子接下來要做什麼。 */
function pmBrief(p) {
  const can = editable(p);
  return `<section class="pm-next">
    <div class="pm-next-h"><span class="pm-eyebrow">下一步</span><span class="pm-sp"></span>${can ? `<button type="button" class="btn sm" onclick="pmBriefForm('${p.id}')">${svg('pen')} ${p.next || p.desc ? '修改' : '填寫'}</button>` : ''}</div>
    <p class="pm-next-t ${p.next ? '' : 'none'}">${esc(p.next || '還沒寫下一步。寫一句接下來要做的事，專案總表就看得到每個案子卡在哪。')}</p>
    ${p.desc ? `<p class="pm-next-d">${esc(p.desc)}</p>` : ''}
  </section>`;
}

/**
 * 剛建好的專案：四件事一張清單，取代五個各自說「還沒有」的空白區塊。
 * 交付標準不在清單裡 —— 它目前不會存進資料庫（PROJMOD-005），不該被推薦成第一步。
 */
function pmIsFresh(p) {
  return !pmCycles(p.id).length && !pmRoot(p.id) && !pmMeetings(p.id).length
    && !pmTasks(p.id).length && !(p.delivery || []).length;
}
function pmSetup(p) {
  const items = [
    { key: 'next', done: Boolean(p.next), title: '寫下一步', summary: '一句話：這個案子接下來要做什麼' },
    { key: 'plan', done: pmCycles(p.id).length > 0, title: '分期', summary: '把案子切成 提案 → 接案 → 執行 → 驗收，之後看得到走到哪' },
    { key: 'drive', done: Boolean(pmRoot(p.id)), title: '啟用專案硬碟', summary: '報價單、合約、素材放這裡，不再散在各處' },
    { key: 'meeting', done: pmMeetings(p.id).length > 0, title: '記第一場會議', summary: '參與者、結論與注意事項跟著會議走' }
  ];
  const done = items.filter(i => i.done).length;
  return pmBlock('開始設定這個專案', done + ' / ' + items.length + ' 完成',
    `<div class="pm-setup">${items.map(i =>
      `<button type="button" class="pm-setup-i ${i.done ? 'done' : ''}" onclick="pmSetupPick('${i.key}')">
        <span class="pm-setup-c">${i.done ? svg('check', 12) : ''}</span>
        <span class="pm-setup-t"><b>${i.title}</b><em>${i.summary}</em></span>
        ${svg('chevronRight', 14)}
      </button>`).join('')}</div>`);
}
function pmSetupPick(key) {
  if (key === 'next') return pmBriefForm(S.proj);
  if (key === 'meeting') return pmJump('meeting', null, '總覽');
  return pmJump(key, 'tree', '總覽');
}
