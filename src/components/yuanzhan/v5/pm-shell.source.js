/* ==================================================================
   專案模組外殼（PLN-075 S3 · INTEGRATION-DECISION §5）

   已批准的整合：A 的分頁外殼 ＋ C 的資源樹（檔案／會議分頁內）＋ B 的時間流（總覽下半）。

   分頁：0 總覽 / 1 計劃 / 2 檔案 / 3 會議 / 4 對話 / 5 財務
   原本是：0 總覽 / 1 工作 / 2 對話 / 3 Evidence Repo / 4 財務 / 5 里程碑

   「工作」「Evidence Repo」「里程碑」「議題串」沒有被刪掉，它們降為分頁內的子視圖：
   舊 index 的 nav('project', n) 仍然走得到原本那一面，只是落在新的分頁底下。

   這個檔**最後載入**（generator 的 EXTENSIONS 順序），所以它包住的 VIEWS.project
   是所有既有擴充都疊完之後的那一個。做法與 operating-converge.source.js 的
   「覆寫 VIEWS.project ＋ 改 proj.tabs」相同，不碰 runtime.js、不加 source-patches。

   契約（五個 view 檔照它寫）：
     PMV.<name>(p) 回傳 HTML 字串；name ∈ overview / plan / drive / meeting / chat
     view 不畫分頁列、不畫專案選擇器；導覽一律 pmGo(tab, sub) / pmJump(tab, sub, label)，
     不可用 nav('project', n)（那條路吃的是舊 index）。
   ================================================================== */

var PMV = PMV || {};

const PM_TABS = [
  ['overview', '總覽'], ['plan', '計劃'], ['drive', '檔案'],
  ['meeting', '會議'], ['chat', '對話'], ['finance', '財務']
];
/** 舊 index → 新 index。訊號、指令面板與其他模組的連結都還在用舊的。 */
const PM_LEGACY = { 0: 0, 1: 1, 2: 4, 3: 2, 4: 5, 5: 1 };
/** 舊 index 落到新分頁時要開哪個子視圖。 */
const PM_LEGACY_SUB = { 1: 'work', 2: 'threads', 3: 'evidence', 5: 'milestone' };
const PM_SUBS = {
  plan: [['tree', '期 · 階段 · 里程碑'], ['work', '工作'], ['views', '看板 · 表格 · 日曆'], ['milestone', '里程碑 · 目標']],
  drive: [['tree', '專案硬碟'], ['evidence', 'Evidence Repo']],
  chat: [['room', '聊天室'], ['threads', '議題串']]
};
/** 子視圖 → 既有 VIEWS.project 的舊 index。 */
const PM_SUB_LEGACY = { views: 1, milestone: 5, evidence: 3, threads: 2 };

['folders', 'phaseCycles', 'chatChannels', 'chatMessages', 'assets', 'phases', 'milestones', 'occasions'].forEach(k => {
  if (!Array.isArray(DB[k])) DB[k] = [];
});

S.pmSub = S.pmSub || {};
S.pmBack = S.pmBack || [];
S.pmSel = S.pmSel || {};
S.pmDraft = S.pmDraft || {};
S.pmFold = S.pmFold || {};

const pmWb = WB.find(w => w.id === 'project');
if (pmWb) {
  pmWb.tabs = PM_TABS.map(t => t[1]);
  pmWb.rule = '主操作面：期階梯、資源樹、時間序、對話';
}

/* ---------- 導覽 ---------- */
function pmIdx(key) { return Math.max(0, PM_TABS.findIndex(t => t[0] === key)); }
function pmKey() { return (PM_TABS[S.tab] || PM_TABS[0])[0]; }
function pmSubsOf(key) {
  const list = PM_SUBS[key] || [];
  // 里程碑 · 目標那一面是收斂後才有的分頁；legacy 模式沒有它。
  return opConverged() ? list : list.filter(s => s[0] !== 'milestone');
}
function pmSub(key) {
  const list = pmSubsOf(key);
  const cur = S.pmSub[key];
  return list.some(s => s[0] === cur) ? cur : (list[0] ? list[0][0] : '');
}
/** 每個專案各自記得選到哪個資料夾／會議／頻道。 */
function pmSel(pid) {
  if (!S.pmSel[pid]) S.pmSel[pid] = {};
  return S.pmSel[pid];
}

const pmBaseRedirect = opRedirect;
opRedirect = (wb, tab) => {
  const r = pmBaseRedirect(wb, tab);
  if (r[0] === 'project') {
    const old = r[1] || 0;
    const next = old in PM_LEGACY ? PM_LEGACY[old] : 0;
    if (PM_LEGACY_SUB[old]) S.pmSub[PM_TABS[next][0]] = PM_LEGACY_SUB[old];
    S.pmBack = [];
    r[1] = next;
    // 從側欄點「專案」＝要看全部專案；其他地方跳進來（訊號、營運甘特、指令面板）
    // 是要看某一個專案，直接落在那個專案上。
    S.pmList = PM_FROM_RAIL;
    if (PM_FROM_RAIL) r[1] = 0;
  }
  PM_FROM_RAIL = false;
  return r;
};

/* 側欄的按鈕與深連結呼叫的是同一個 nav('project', 0)，從參數分不出來。
   所以在 rail 上用 capture 階段先記一筆：這一次是使用者自己點了「專案」。 */
var PM_FROM_RAIL = false;
(function () {
  const rail = $('#rail');
  if (!rail) return;
  rail.addEventListener('click', e => {
    const btn = e.target && e.target.closest ? e.target.closest('.rail-i') : null;
    if (!btn) return;
    const w = WB[[...rail.querySelectorAll('.rail-i')].indexOf(btn)];
    PM_FROM_RAIL = Boolean(w && w.id === 'project');
  }, { capture: true, signal: controller.signal });
})();

/** 模組內導覽。不經過 opRedirect：新 index 不能再被當成舊 index 轉一次。 */
function pmGo(tab, sub, patch) {
  const idx = typeof tab === 'number' ? tab : pmIdx(tab);
  if (sub) S.pmSub[PM_TABS[idx][0]] = sub;
  if (patch && P(S.proj)) Object.assign(pmSel(S.proj), patch);
  saveJournalDraft();
  S.wb = 'project';
  S.tab = idx;
  closeDrawer(true);
  pmDrawerClose();
  renderRail();
  render();
  const surface = $('#surface');
  if (surface) surface.scrollTop = 0;
}

/** 跨分頁跳轉並留下回返脈絡；Esc 或回返列可以退回來，可堆疊。 */
function pmJump(tab, sub, label, patch) {
  const key = pmKey();
  S.pmBack.push({ tab: S.tab, sub: S.pmSub[key] || '', label: label || (PM_TABS[S.tab] || PM_TABS[0])[1] });
  if (S.pmBack.length > 8) S.pmBack.shift();
  pmGo(tab, sub, patch);
}

function pmBack() {
  const b = S.pmBack.pop();
  if (!b) return;
  pmGo(b.tab, b.sub || null);
}

/** 分頁列。按分頁＝換了主題，回返脈絡不再成立。 */
function pmTab(i) {
  S.pmBack = [];
  // 從分頁列進來一律落在主視圖；「工作」「Evidence Repo」「議題串」是往下一層才去的地方。
  delete S.pmSub[PM_TABS[i][0]];
  pmGo(i);
}

/* ---------- 共用工具 ---------- */
const pmPad = n => String(n).padStart(2, '0');
function pmDay(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.getFullYear() + '-' + pmPad(d.getMonth() + 1) + '-' + pmPad(d.getDate());
}
function pmClock(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return pmPad(d.getHours()) + ':' + pmPad(d.getMinutes());
}
const pmWho = k => (k && DB.people[k] ? DB.people[k].n : (k || '未指定'));
function pmAv(k) {
  const who = DB.people[k];
  return who ? `<span class="av ${who.cls}" title="${esc(who.n)}">${esc(who.s)}</span>` : '';
}
const pmCut = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; };

/** 走 commit() 但不跳通知：聊天訊息每送一則就跳一次「新增 訊息」是干擾，不是回饋。 */
function pmQuiet(run) {
  const keep = toast;
  toast = () => {};
  try { return run(); } finally { toast = keep; }
}

/**
 * 等寫入佇列送完。上傳與歸檔走 route handler，它們要找的資料夾可能還躺在佇列裡：
 * 不等的話伺服器會回「找不到資料夾」，或者自己再建一組 ROOT／INBOX。
 */
function pmSaved() {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (!OP_LIVE || (!OP_QUEUE.length && !OP_SENDING)) return resolve();
      if (OP_STATUS === 'error' || OP_STATUS === 'conflict') return reject(Error('前一筆變更尚未保存，請稍後再試'));
      if (Date.now() - t0 > 12000) return reject(Error('保存逾時，請稍後再試'));
      setTimeout(tick, 160);
    };
    tick();
  });
}

async function pmApi(url, init) {
  const res = await fetch(url, init && init.body
    ? { ...init, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) }
    : init);
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(payload.error || ('操作失敗（HTTP ' + res.status + '）'));
  return payload;
}

/** 區塊標題：一條底部髮絲線，不是卡片。 */
function pmBlock(title, sub, body, act) {
  return `<section class="pm-block">
    <div class="pm-block-h"><h3>${title}</h3>${sub ? `<span class="pm-block-s">${sub}</span>` : ''}<span class="pm-sp"></span>${act || ''}</div>
    ${body}
  </section>`;
}
function pmEmpty(text, act) {
  return `<div class="pm-empty"><p>${text}</p>${act ? `<div class="pm-empty-a">${act}</div>` : ''}</div>`;
}

/* ---------- 資料存取（五個 view 共用） ---------- */
const PM_VIS = {
  CLIENT_VISIBLE: { label: '客戶可見', rank: 0, tone: 'pri' },
  INTERNAL_ONLY: { label: '僅內部', rank: 1, tone: '' },
  RESTRICTED_NO_INDEX: { label: '最高敏感 · 不建索引', rank: 2, tone: 'crit' }
};
const PM_KIND = {
  ROOT: '專案硬碟', INBOX: '收件匣', GENERIC: '一般', PROPOSAL: '開案前', CONTRACT: '合約',
  MILESTONE: '里程碑交付', MEETING: '會議', SHARED: '對客戶共用', INTERNAL: '僅內部',
  REVISION: '修改需求', MATERIAL: '素材', FINANCE: '專案財務', CHAT_DROP: '聊天室附件', LINE_DROP: 'LINE 媒體'
};
/** 這幾種資料夾永遠不可能對客戶可見；伺服器同樣強制（toFolderVisibility）。 */
const PM_NO_CLIENT = ['CONTRACT', 'INTERNAL'];

const pmFolder = id => DB.folders.find(f => f.id === id) || null;
const pmFolders = pid => DB.folders.filter(f => f.projectId === pid);
const pmRoot = pid => DB.folders.find(f => f.projectId === pid && f.kind === 'ROOT') || null;
const pmInbox = pid => DB.folders.find(f => f.projectId === pid && f.kind === 'INBOX') || null;
function pmChildren(fid) {
  return DB.folders
    .filter(f => f.parentId === fid)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name), 'zh-Hant'));
}
/** 由根到自己的祖先鏈（含自己）。 */
function pmTrail(f) {
  const out = [];
  let cur = f, guard = 0;
  while (cur && guard++ < 20) { out.unshift(cur); cur = cur.parentId ? pmFolder(cur.parentId) : null; }
  return out;
}
function pmDescendants(fid) {
  const out = [];
  const walk = id => pmChildren(id).forEach(c => { out.push(c); walk(c.id); });
  walk(fid);
  return out;
}
const pmAssets = pid => DB.assets.filter(a => a.projectId === pid && a.status !== 'failed');
const pmAssetsIn = fid => DB.assets.filter(a => a.folderId === fid && a.status !== 'failed');
function pmUnfiled(pid) {
  const inbox = pmInbox(pid);
  return pmAssets(pid).filter(a => !a.filedAt || (inbox && a.folderId === inbox.id));
}

const pmCycles = pid => DB.phaseCycles.filter(c => c.projectId === pid).sort((a, b) => a.ordinal - b.ordinal);
const pmCycle = id => DB.phaseCycles.find(c => c.id === id) || null;
const pmPhase = id => DB.phases.find(x => x.id === id) || null;
function pmStages(cycleId) {
  return DB.phases
    .filter(ph => ph.cycleId === cycleId)
    .sort((a, b) => (a.ordinal || 0) - (b.ordinal || 0) || String(a.startOn).localeCompare(String(b.startOn)));
}
const pmMilestones = pid => DB.milestones.filter(m => m.projectId === pid);
const pmMsOf = phaseId => DB.milestones
  .filter(m => m.phaseId === phaseId)
  .sort((a, b) => (a.dueOn || '9999').localeCompare(b.dueOn || '9999'));
const pmTasks = pid => DB.issues.filter(i => i.p === pid);
const pmTasksOf = msId => DB.issues.filter(i => i.msId === msId);
const pmIsReview = t => String(t.kind || '').toUpperCase() === 'REVIEW';
const pmMeetings = pid => DB.occasions
  .filter(o => o.projectId === pid)
  .sort((a, b) => String(b.onDate).localeCompare(String(a.onDate)));
const pmChannels = pid => DB.chatChannels
  .filter(c => c.projectId === pid && !c.archived)
  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
const pmMessages = cid => DB.chatMessages.filter(m => m.channelId === cid).sort((a, b) => (a.at || 0) - (b.at || 0));

const PM_ORD = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const pmCycleName = c => (PM_ORD[c.ordinal] || c.ordinal) + '期';
const PM_CYCLE_ST = { PLANNED: '規劃中', ACTIVE: '進行中', ACCEPTED: '已驗收', CLOSED: '已結案', CANCELLED: '已取消' };
const PM_STAGE = { PROPOSAL: '提案', CONTRACT: '接案', EXECUTION: '執行', ACCEPTANCE: '驗收', CLOSING: '結案', CUSTOM: '自訂' };
/** stageKind → 既有 phases 集合的 phase 詞彙（營運甘特讀它）。 */
const PM_STAGE_PHASE = { PROPOSAL: 'discovery', CONTRACT: 'planning', EXECUTION: 'execution', ACCEPTANCE: 'review', CLOSING: 'maintenance', CUSTOM: 'execution' };

/**
 * 階段的狀態由日期與里程碑推導，不另存。
 * 階段表沒有狀態欄，存一份就會和它的來源（起訖日、里程碑達成）不一致。
 */
function pmStageState(ph) {
  const open = pmMsOf(ph.id).filter(m => m.state !== 'done').length;
  if (ph.endOn && ph.endOn < TODAY) return open ? 'late' : 'done';
  if (ph.startOn && ph.startOn <= TODAY) return 'now';
  return 'todo';
}
function pmStageMeta(ph) {
  const ms = pmMsOf(ph.id);
  const done = ms.filter(m => m.state === 'done').length;
  const span = ph.endOn ? '至 ' + ph.endOn.slice(5) : '';
  return [ms.length ? done + '/' + ms.length + ' 里程碑' : '', span].filter(Boolean).join(' · ');
}
/** 目前走到哪：第一個進行中或逾期的階段；都沒有就是最後一個已完成的。 */
function pmCurrentStage(pid) {
  let last = null;
  for (const c of pmCycles(pid)) {
    for (const ph of pmStages(c.id)) {
      const st = pmStageState(ph);
      if (st === 'now' || st === 'late') return { cycle: c, stage: ph, state: st };
      if (st === 'done') last = { cycle: c, stage: ph, state: st };
    }
  }
  return last;
}

/* ---------- 外殼 ---------- */
let PM_NO_PICKER = false;
const pmBasePicker = projPicker;
/** 專案選擇器由外殼統一畫一次；既有子視圖自己那一份在這裡收掉。 */
projPicker = function () { return PM_NO_PICKER ? '' : pmBasePicker(); };

const pmPrevProject = VIEWS.project;
function pmLegacy(oldTab) {
  PM_NO_PICKER = true;
  try { return pmPrevProject(oldTab); } finally { PM_NO_PICKER = false; }
}

function pmHead(key) {
  const subs = pmSubsOf(key);
  const cur = pmSub(key);
  const last = S.pmBack[S.pmBack.length - 1];
  const back = last
    ? `<button type="button" class="pm-back" onclick="pmBack()">${svg('chevronLeft')}<span>回到 ${esc(last.label)}</span><kbd>Esc</kbd></button>`
    : '';
  const subnav = subs.length > 1
    ? `<div class="pm-subnav" role="tablist" aria-label="子視圖">${subs.map(s =>
      `<button type="button" role="tab" aria-selected="${s[0] === cur}" class="${s[0] === cur ? 'on' : ''}" onclick="pmGo('${key}','${s[0]}')">${s[1]}</button>`
    ).join('')}</div>`
    : '';
  return `<div class="pm-head">${pmProjectHead(P(S.proj))}${back}${subnav}</div>`;
}

VIEWS.project = tab => {
  // 沒有專案時沿用既有的空狀態（它自己帶「建立第一個專案」）。
  if (!DB.projects.length) return pmPrevProject(0);
  if (S.pmList) return PMV.index();
  const p = P(S.proj);
  const key = (PM_TABS[tab] || PM_TABS[0])[0];
  const head = pmHead(key);
  if (key === 'finance') return head + pmLegacy(4);
  const sub = pmSub(key);
  if (sub in PM_SUB_LEGACY) return head + pmLegacy(PM_SUB_LEGACY[sub]);
  // 「工作」是計劃底下自己的一面（RES-035）；原本的看板／表格／日曆留在隔壁的子視圖。
  const view = key === 'plan' && sub === 'work' ? PMV.work : PMV[key];
  return head + `<div class="pm-view pm-view-${key}">${view ? view(p) : ''}</div>`;
};

/** 分頁上的數字：只放「需要處理」的量，不放總數。 */
function pmTabBadge(key, p) {
  if (!p) return 0;
  if (key === 'plan') return pmTasks(p.id).filter(t => pmIsReview(t) && t.reviewResult === 'IN_REVIEW').length;
  if (key === 'drive') return pmUnfiled(p.id).length;
  if (key === 'meeting') return pmMeetings(p.id).filter(o => o.onDate <= TODAY && !o.recap).length;
  return 0;
}

function pmPaintTabs() {
  const tabs = $('#tabs');
  if (!tabs || S.wb !== 'project') return;
  // 總表不屬於任何一個專案，分頁列留白；進了專案才有六個分頁。
  if (S.pmList && DB.projects.length) { tabs.innerHTML = '<span class="tab on pm-tab-all">所有專案</span>'; return; }
  const p = P(S.proj);
  tabs.innerHTML = PM_TABS.map((t, i) => {
    const n = pmTabBadge(t[0], p);
    return `<button type="button" class="tab ${S.tab === i ? 'on' : ''}" onclick="pmTab(${i})">${t[1]}${n ? `<i class="pm-tab-n">${n}</i>` : ''}</button>`;
  }).join('');
}
/**
 * 畫面上現在是既有的哪一面（舊分頁 index）；新的五個版面回 -1。
 * 既有的 enhance 掛勾認的是舊 index（對話＝2 掛議題串的事件、Evidence Repo＝3 掛檔案點擊、
 * 總覽＝0 套財務遮罩），分頁重排之後要翻譯給它們聽，否則掛勾會掛到別的分頁上、
 * 而真正該掛的那一面沒有掛。
 */
function pmLegacyIndex() {
  if (S.pmList) return -1;
  const key = pmKey();
  if (key === 'finance') return 4;
  const sub = pmSub(key);
  return sub in PM_SUB_LEGACY ? PM_SUB_LEGACY[sub] : -1;
}
const pmBaseEnhance = enhanceView;
enhanceView = function () {
  if (S.wb === 'project') {
    const real = S.tab;
    S.tab = pmLegacyIndex();
    try { pmBaseEnhance(); } finally { S.tab = real; }
  } else {
    pmBaseEnhance();
  }
  pmPaintTabs();
};

/* Esc 退回上一個脈絡。任何覆蓋層開著、或正在輸入時不動：那些地方的 Esc 各有主人。 */
doc.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || S.wb !== 'project' || !S.pmBack.length) return;
  if (pmDrawerOpen() || S.stack.length) return;
  if (getById('formModalWrap')?.classList.contains('on')) return;
  if (root.querySelector('#modalWrap.on') || root.querySelector('#cmdkWrap.on') || root.querySelector('#summon.on')) return;
  const at = shadow.activeElement;
  if (at && /^(INPUT|TEXTAREA|SELECT)$/.test(at.tagName)) return;
  e.preventDefault();
  pmBack();
}, { signal: controller.signal });

/* ---------- prototype 模式的示範資料 ----------
   database 模式一列都不產生：那邊只會有使用者自己建立的資料。
   形狀照 Owner 既有的資料夾慣例（[共用]、開案前、YYYYMMDD_Mnn_、YYYYMMDD <事件>、(僅內部)）。 */
function pmSeedDemo() {
  if (OP_LIVE || DB.folders.length || !DB.projects.length) return;
  const stamp = d => new Date(d + 'T09:30:00').getTime();
  const mk = (pid, tag) => {
    const id = n => 'FLD-' + tag + '-' + n;
    const f = (n, parent, kind, name, visibility, sortOrder) => ({
      id: id(n), projectId: pid, parentId: parent ? id(parent) : '', kind, name,
      visibility: visibility || 'INTERNAL_ONLY', sortOrder, isSystem: kind === 'ROOT' || kind === 'INBOX',
      space: 'team', author: 'yz', note: '', createdAt: stamp('2026-08-04')
    });
    return { id, f };
  };

  const a = DB.projects[0];
  const A = mk(a.id, 'A');
  DB.folders.push(
    A.f('root', null, 'ROOT', '專案硬碟', 'INTERNAL_ONLY', 0),
    A.f('inbox', 'root', 'INBOX', '收件匣', 'INTERNAL_ONLY', 0),
    A.f('shared', 'root', 'SHARED', '[共用] 共用資料夾', 'CLIENT_VISIBLE', 10),
    A.f('pre', 'root', 'PROPOSAL', '開案前', 'INTERNAL_ONLY', 20),
    A.f('start', 'root', 'GENERIC', '專案啟動［正式資料］', 'INTERNAL_ONLY', 30),
    A.f('contract', 'start', 'CONTRACT', '合約與報價', 'INTERNAL_ONLY', 10),
    A.f('ms', 'root', 'GENERIC', '里程碑交付', 'INTERNAL_ONLY', 40),
    A.f('m01', 'ms', 'MILESTONE', '20260815_M01_帳號盤點', 'INTERNAL_ONLY', 10),
    A.f('m02', 'ms', 'MILESTONE', '20260905_M02_全員導入', 'INTERNAL_ONLY', 20),
    A.f('meet', 'root', 'GENERIC', '會議', 'INTERNAL_ONLY', 50),
    A.f('mt1', 'meet', 'MEETING', '20260806 啟動會議', 'INTERNAL_ONLY', 10),
    A.f('mt2', 'meet', 'MEETING', '20260908 驗收前確認', 'INTERNAL_ONLY', 20),
    A.f('rev', 'root', 'REVISION', '修改需求', 'INTERNAL_ONLY', 60),
    A.f('internal', 'root', 'INTERNAL', '(僅內部)', 'INTERNAL_ONLY', 70),
    A.f('secret', 'internal', 'INTERNAL', '帳號與金鑰', 'RESTRICTED_NO_INDEX', 10)
  );
  const asset = (n, name, kind, bytes, folder, day, filed) => ({
    id: 'AST-DEMO-' + n, assetId: '', name, kind, objectKey: '', bytes, mime: '', status: 'ready',
    space: 'team', author: 'lily', day, bornAt: stamp(day), text: '', local: true,
    projectId: a.id, folderId: A.id(folder), filedAt: filed ? stamp(day) : 0
  });
  DB.assets.push(
    asset(1, '客戶提供_組織圖.png', 'image', 412000, 'inbox', '2026-09-10', false),
    asset(2, '導入後問卷回收.xlsx', 'sheet', 88000, 'inbox', '2026-09-11', false),
    asset(3, '報價單_回簽.pdf', 'pdf', 640000, 'contract', '2026-08-02', true),
    asset(4, '帳號盤點表_v2.xlsx', 'sheet', 120000, 'm01', '2026-08-15', true),
    asset(5, '20260806_啟動會議_錄音.m4a', 'audio', 18400000, 'mt1', '2026-08-06', true),
    asset(6, '20260806_啟動會議_逐字稿.md', 'doc', 42000, 'mt1', '2026-08-06', true),
    asset(7, '20260806_啟動會議_完整紀錄.md', 'doc', 16000, 'mt1', '2026-08-06', true),
    asset(8, '20260806_啟動會議_摘要.md', 'doc', 3200, 'mt1', '2026-08-06', true),
    asset(9, '20260908_驗收前確認_摘要.md', 'doc', 2800, 'mt2', '2026-09-08', true)
  );

  DB.phaseCycles.push({
    id: 'CYC-A-1', projectId: a.id, ordinal: 1, title: '', contractId: '', startOn: '2026-07-20', endOn: '2026-09-28',
    status: 'ACTIVE', note: ''
  });
  const stage = (n, kind, startOn, endOn) => ({
    id: 'PH-A-' + n, projectId: a.id, phase: PM_STAGE_PHASE[kind], label: PM_STAGE[kind], startOn, endOn,
    cycleId: 'CYC-A-1', ordinal: n, stageKind: kind
  });
  DB.phases.push(
    stage(1, 'PROPOSAL', '2026-07-20', '2026-07-31'),
    stage(2, 'CONTRACT', '2026-08-01', '2026-08-03'),
    stage(3, 'EXECUTION', '2026-08-04', '2026-09-05'),
    stage(4, 'ACCEPTANCE', '2026-09-06', '2026-09-28'),
    stage(5, 'CLOSING', '2026-09-29', '2026-10-05')
  );
  DB.milestones.push(
    { id: 'MS-A-1', projectId: a.id, phaseId: 'PH-A-3', title: 'M01 帳號盤點', dueOn: '2026-08-15', accept: '盤點表客戶簽認', state: 'done', remind: '前 3 日', folderId: A.id('m01'), derivedFrom: '' },
    { id: 'MS-A-2', projectId: a.id, phaseId: 'PH-A-3', title: 'M02 全員導入', dueOn: '2026-09-05', accept: '28 帳號可登入', state: 'done', remind: '前 3 日', folderId: A.id('m02'), derivedFrom: '' },
    { id: 'MS-A-3', projectId: a.id, phaseId: 'PH-A-4', title: 'M03 內部驗收', dueOn: '2026-09-28', accept: '14 日內無重大問題', state: 'open', remind: '前 3 日', folderId: '', derivedFrom: '' }
  );
  const task = (n, t, extra) => ({
    id: 'ISS-PM-' + n, t, p: a.id, owner: 'lily', size: 'S', pri: 3, st: 'Todo', created: '2026-09-08', started: '', done: '',
    blocker: '', exp: '', ev: 0, rel: [], cf: {}, sub: [], author: 'yz', kind: 'TODO', msId: 'MS-A-3', ...extra
  });
  DB.issues.push(
    task(1, '彙整導入後 30 日成效數據', { due: '2026-09-20', st: 'Doing', started: '2026-09-09' }),
    task(2, '驗收報告送審', { kind: 'REVIEW', reviewer: 'yz', reviewResult: 'IN_REVIEW', st: 'Review', due: '2026-09-18', started: '2026-09-10' }),
    task(3, '教育訓練簡報定稿', { kind: 'REVIEW', reviewer: 'yz', reviewResult: 'CHANGES_REQUESTED', reviewNote: '第 3 節的權限示意圖與實際設定不一致，請對齊後重送', reviewedAt: stamp('2026-09-11'), st: 'Doing', due: '2026-09-16', started: '2026-09-07' })
  );

  DB.occasions.push(
    { id: 'OC-PM-1', title: '啟動會議', cat: '客戶會議', onDate: '2026-08-06', endOn: '2026-08-06', at: '14:00–15:30', place: '客戶會議室', actorIds: ['yz', 'lily'], guests: '柏翰 陳經理、資訊窗口', projectId: a.id, star: false, prep: [], media: [], derivedFrom: '', remind: '前 1 日', author: 'yz', folderId: A.id('mt1'), recap: '確認 28 個帳號分三批導入；教育訓練排在第二批之後。', cautions: '客戶週五不開會；資訊窗口只收 email。', createdAt: stamp('2026-08-06') },
    { id: 'OC-PM-2', title: '驗收前確認', cat: '客戶會議', onDate: '2026-09-08', endOn: '2026-09-08', at: '10:00–11:00', place: '線上', actorIds: ['lily'], guests: '柏翰 陳經理', projectId: a.id, star: false, prep: [{ id: 'PT-1', t: '補寄導入後問卷連結', done: false, issueId: '' }], media: [], derivedFrom: '', remind: '前 1 日', author: 'lily', folderId: A.id('mt2'), recap: '', cautions: '', createdAt: stamp('2026-09-08') }
  );

  DB.chatChannels.push(
    { id: 'CH-A-1', projectId: a.id, kind: 'MAIN', name: '專案主頻道', topic: '', readOnly: false, archived: false, sortOrder: 0, dropFolderId: '', author: 'yz' },
    { id: 'CH-A-2', projectId: a.id, kind: 'TOPIC', name: '驗收', topic: '驗收文件與問題追蹤', readOnly: false, archived: false, sortOrder: 10, dropFolderId: '', author: 'yz' }
  );
  const msg = (n, w, day, time, text, meta) => ({
    id: 'MSG-A-' + n, channelId: 'CH-A-1', w, origin: 'APP', text, type: 'text',
    at: new Date(day + 'T' + time + ':00').getTime(), mentions: [], meta: meta || {}
  });
  DB.chatMessages.push(
    msg(1, 'lily', '2026-09-10', '10:12', '客戶傳了新的組織圖，我先丟進收件匣。', { assets: ['AST-DEMO-1'] }),
    msg(2, 'yz', '2026-09-10', '10:20', '好，驗收報告裡的帳號數要跟這一版對齊。'),
    msg(3, 'lily', '2026-09-11', '16:40', '問卷回收 21/28，剩下的我週一再催一次。'),
    msg(4, 'yz', '2026-09-12', '09:05', '驗收報告我今天看，下午回你。')
  );

  // 第二個專案只放「期」：展示一個案子可以有二期，執行→驗收各出現一次。
  const b = DB.projects[1];
  if (!b) return;
  DB.phaseCycles.push(
    { id: 'CYC-B-1', projectId: b.id, ordinal: 1, title: '', contractId: '', startOn: '2026-07-15', endOn: '2026-09-05', status: 'ACCEPTED', note: '' },
    { id: 'CYC-B-2', projectId: b.id, ordinal: 2, title: '第二次修改需求', contractId: '', startOn: '2026-09-06', endOn: '2026-11-30', status: 'ACTIVE', note: '' }
  );
  const bs = (c, n, kind, startOn, endOn) => ({
    id: 'PH-B-' + c + n, projectId: b.id, phase: PM_STAGE_PHASE[kind], label: PM_STAGE[kind], startOn, endOn,
    cycleId: 'CYC-B-' + c, ordinal: n, stageKind: kind
  });
  DB.phases.push(
    bs(1, 1, 'PROPOSAL', '2026-07-15', '2026-07-20'), bs(1, 2, 'CONTRACT', '2026-07-21', '2026-07-24'),
    bs(1, 3, 'EXECUTION', '2026-07-25', '2026-08-25'), bs(1, 4, 'ACCEPTANCE', '2026-08-26', '2026-09-05'),
    bs(2, 1, 'EXECUTION', '2026-09-06', '2026-11-10'), bs(2, 2, 'ACCEPTANCE', '2026-11-11', '2026-11-25'),
    bs(2, 3, 'CLOSING', '2026-11-26', '2026-11-30')
  );
}
pmSeedDemo();
